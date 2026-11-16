const fs = require('fs');
const path = require('path');
const { MenuItem, MenuCategory, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { getOutOfStockDishIds } = require('../../utils/recipeInventoryHelper');
const searchSyncService = require('../../services/searchSyncService');
const searchEngine = require('../../services/searchEngine');

// Helper xử lý lưu ảnh upload từ thiết bị và kiểm tra định dạng, dung lượng
function validateAndSaveImage(imageUrl, isRequired = true) {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    if (isRequired) {
      return {
        ok: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn ảnh món ăn từ máy tính (ảnh là bắt buộc).'
      };
    }
    return { ok: true, url: null };
  }

  const cleanUrl = imageUrl.trim();

  // Nếu là ảnh Data URL dạng Base64 từ máy tải lên
  if (cleanUrl.startsWith('data:')) {
    // 1. Kiểm tra MIME type: Chỉ cho phép PNG và JPG/JPEG (chặn pdf, word, text, etc.)
    const match = cleanUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (!match) {
      return {
        ok: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Định dạng file không hợp lệ! Hệ thống chỉ chấp nhận ảnh định dạng PNG hoặc JPG (không hỗ trợ PDF, Word, v.v.).'
      };
    }

    const mimeType = match[1].toLowerCase();
    const ext = mimeType === 'png' ? 'png' : 'jpg';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Kiểm tra dung lượng tối thiểu: >= 1KB (1024 bytes)
    if (buffer.length < 1024) {
      return {
        ok: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: `Dung lượng ảnh quá nhỏ (${(buffer.length / 1024).toFixed(2)} KB)! Ảnh món ăn phải có dung lượng từ 1KB trở lên.`
      };
    }

    // 3. Kiểm tra dung lượng tối đa: <= 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return {
        ok: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: `Dung lượng ảnh quá lớn (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)! Dung lượng tối đa cho phép là 5MB.`
      };
    }

    // 3.5. Kiểm tra Magic Bytes nhị phân (Chặn triệt để file PDF, Word, v.v. bị đổi đuôi sang .jpg hoặc .png)
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    if (!isJpeg && !isPng) {
      return {
        ok: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Nội dung file không phải là ảnh hợp lệ! Hệ thống phát hiện file tài liệu (PDF, Word, Excel...) bị đổi đuôi sang PNG/JPG.'
      };
    }

    // 4. Lưu ra file vật lý trong public/uploads/menu
    const fileName = `dish_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const uploadDir = path.join(__dirname, '../../../public/uploads/menu');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    return {
      ok: true,
      url: `/uploads/menu/${fileName}`
    };
  }

  // Nếu là đường dẫn ảnh nội bộ đã lưu trước đó (/uploads/...) hoặc ảnh demo ban đầu
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('http')) {
    return {
      ok: true,
      url: cleanUrl
    };
  }

  return {
    ok: false,
    code: 'ERROR_0005_INVALID_VALUE',
    message: 'Vui lòng tải ảnh trực tiếp từ máy tính lên (chỉ chấp nhận file PNG hoặc JPG).'
  };
}

// Helper bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

// Lấy chữ cái đầu (acronym), ví dụ "Bò Wagyu" -> "bw"
function getAcronym(str) {
  return removeVietnameseTones(str)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join('');
}

// Thuật toán khoảng cách chỉnh sửa Levenshtein Distance
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Khớp từ mờ chính xác theo ngữ nghĩa tiếng Việt:
// - Chữ cái đầu phải giống nhau (tránh "com" khớp "tom")
// - Độ dài chênh lệch không quá 1 ký tự
function isFuzzyWordMatch(tw, kw) {
  if (tw === kw) return true;
  if (tw.startsWith(kw) || kw.startsWith(tw)) return true;

  if (tw[0] !== kw[0]) return false;
  if (Math.abs(tw.length - kw.length) > 1) return false;

  const len = Math.max(tw.length, kw.length);
  const maxDist = len <= 5 ? 1 : 2;
  const dist = levenshteinDistance(tw, kw);
  return dist <= maxDist;
}

// Search Engine tổng hợp: Khớp chính xác + Không dấu + Viết tắt + Sai chính tả
function matchesSearchEngine(text, keyword) {
  if (!text || !keyword) return false;

  const normText = removeVietnameseTones(text);
  const normKeyword = removeVietnameseTones(keyword);

  // 1. Khớp trực tiếp
  if (normText.includes(normKeyword)) return true;

  // 2. Khớp từ viết tắt (Acronym)
  const acronym = getAcronym(text);
  const cleanKey = normKeyword.replace(/\s+/g, '');
  if (acronym.includes(cleanKey)) return true;

  // 3. Khớp từng từ không trùng lặp (Fuzzy matching)
  const textWords = normText.split(/\s+/).filter(Boolean);
  const keyWords = normKeyword.split(/\s+/).filter(Boolean);

  const usedIdx = new Set();
  const allMatch = keyWords.every(kw => {
    for (let i = 0; i < textWords.length; i++) {
      if (!usedIdx.has(i) && isFuzzyWordMatch(textWords[i], kw)) {
        usedIdx.add(i);
        return true;
      }
    }
    return false;
  });

  return allMatch;
}

// Get Menu Categories (FEAT-FNB-03)
exports.getMenuCategories = async (req, res) => {
  try {
    // Lấy các danh mục chính đang có món ăn trong thực đơn để hiển thị trên thanh tab
    const categories = await MenuCategory.findAll({
      where: { 
        IsDeleted: false,
        CategoryId: { [Op.in]: [5, 6, 7, 8] }
      },
      order: [['CategoryId', 'ASC']]
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh mục món.' });
  }
};

// Get all Menu Items (FEAT-FNB-02)
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, status, isDeleted, availableOnly, page, limit } = req.query;
    
    // Mặc định chỉ lấy các món chưa bị xóa mềm (IsDeleted = false)
    // Nếu truyền isDeleted=true thì lấy danh sách các món trong thùng rác / đã xóa mềm
    const whereClause = { IsDeleted: false };
    
    // Nếu chỉ hiển thị món còn phục vụ (còn tồn kho, không bị khóa Inactive hay OutOfStock)
    const filterAvailableOnly = availableOnly === 'true' || status === 'Available';

    if (filterAvailableOnly) {
      whereClause.Status = 'Available';
    } else if (status && status !== '') {
      whereClause.Status = status;
    }
    
    if (category) {
      if (isNaN(category)) {
        // Tìm kiếm danh mục theo tên, ưu tiên khớp chính xác hoặc danh mục có món ăn
        const matchedCats = await MenuCategory.findAll({
          where: {
            CategoryName: { [Op.like]: `%${category}%` }
          },
          attributes: ['CategoryId']
        });
        if (matchedCats.length > 0) {
          whereClause.CategoryId = { [Op.in]: matchedCats.map(c => c.CategoryId) };
        } else {
          whereClause.CategoryId = -1; // Không tìm thấy danh mục
        }
      } else {
        whereClause.CategoryId = category;
      }
    }

    // Tra cứu danh sách món hết nguyên liệu tồn kho trong bếp
    const outOfStockDishIds = await getOutOfStockDishIds();

    // Nếu người dùng lọc trạng thái "Available" (hoặc cờ availableOnly), tự động loại trừ các món cạn nguyên liệu
    if (filterAvailableOnly && outOfStockDishIds.size > 0) {
      whereClause.MenuItemId = { [Op.notIn]: Array.from(outOfStockDishIds) };
    } else if (status === 'OutOfStock' && outOfStockDishIds.size > 0) {
      // Khi chọn xem "Tạm Hết", bao gồm cả món OutOfStock trong DB lẫn món thiếu nguyên liệu
      delete whereClause.Status;
      whereClause[Op.or] = [
        { Status: 'OutOfStock' },
        { MenuItemId: { [Op.in]: Array.from(outOfStockDishIds) } }
      ];
    }

    // Helper gán trạng thái thực tế dựa theo tồn kho nguyên liệu
    const attachStockStatus = (item) => {
      const raw = typeof item.toJSON === 'function' ? item.toJSON() : { ...item };
      const isMissingIngredient = outOfStockDishIds.has(Number(raw.MenuItemId));
      if (isMissingIngredient && raw.Status === 'Available') {
        raw.Status = 'OutOfStock';
        raw.StockAlert = 'Hết nguyên liệu trong kho bếp';
      }
      return raw;
    };

    // Nếu không có keyword, lấy toàn bộ món theo thứ tự ID giảm dần
    if (!keyword || keyword.trim() === '') {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 100; // Mặc định trả về 100 món thay vì 10.000 món để giao diện mượt mà
      const offset = (pageNum - 1) * limitNum;

      const queryOptions = {
        where: whereClause,
        include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
        attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt', 'Version'],
        order: [['MenuItemId', 'DESC']],
        limit: limitNum,
        offset: offset
      };

      const items = await MenuItem.findAll(queryOptions);
      const mapped = items.map(attachStockStatus);

      return res.status(200).json({ success: true, data: mapped });
    }

    // Khi có keyword, áp dụng bộ Smart Fuzzy Search Engine trên toàn bộ món
    const cleanKeyword = keyword.trim();
    const items = await MenuItem.findAll({
      where: whereClause,
      include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
      attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt', 'Version'],
      order: [['MenuItemId', 'DESC']]
    });

    const filtered = items
      .filter(item => {
        if (matchesSearchEngine(item.ItemName, cleanKeyword)) return true;
        if (item.Description && matchesSearchEngine(item.Description, cleanKeyword)) return true;
        const idStr = String(item.MenuItemId);
        const cleanNorm = removeVietnameseTones(cleanKeyword).replace(/[^a-z0-9]/g, '');
        if (cleanNorm && (`mn${idStr}`.includes(cleanNorm) || idStr.includes(cleanNorm))) return true;
        return false;
      })
      .map(attachStockStatus);

    if (filtered.length === 0) {
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn phù hợp với từ khóa.' });
    }

    return res.status(200).json({ success: true, data: filtered });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải danh sách món ăn.' });
  }
};

// Create Item (FEAT-FNB-01)
exports.createMenuItem = async (req, res) => {
  try {
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status } = req.body;

    if (!ItemName || ItemName.trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
    }
    if (ItemName.length > 150) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên món không được vượt quá 150 ký tự' });
    }
    if (Description && Description.length > 1000) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Mô tả không được vượt quá 1000 ký tự' });
    }
    if (!CategoryId) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Danh mục không được để trống' });
    }
    if (Price === undefined || Price === null || isNaN(Price) || Number(Price) <= 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Giá bán không hợp lệ' });
    }
    if (!Status) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Trạng thái không được để trống' });
    }

    const categoryExists = await MenuCategory.findByPk(CategoryId);
    if (!categoryExists) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Danh mục món ăn không hợp lệ' });
    }

    // 🔒 CONCURRENCY & DUPLICATE CHECK: Kiểm tra trùng tên món ăn (không phân biệt hoa/thường)
    const existingDish = await MenuItem.findOne({
      where: {
        ItemName: sequelize.where(
          sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('ItemName'))),
          ItemName.trim().toLowerCase()
        ),
        IsDeleted: false
      }
    });

    if (existingDish) {
      return res.status(409).json({
        code: 'ERROR_0007_DUPLICATE',
        message: `Tên món ăn "${ItemName.trim()}" đã tồn tại trong thực đơn! Vui lòng chọn tên khác hoặc chỉnh sửa món ăn đã có.`
      });
    }

    // Kiểm tra và xử lý file ảnh tải lên từ thiết bị (bắt buộc, chỉ PNG/JPG, >= 1KB)
    const imgResult = validateAndSaveImage(ImageUrl, true);
    if (!imgResult.ok) {
      return res.status(400).json({ code: imgResult.code, message: imgResult.message });
    }

    const newItem = await MenuItem.create({
      CategoryId,
      ItemName: ItemName.trim(),
      Price,
      Description: Description || null,
      ImageUrl: imgResult.url,
      Status,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });

    // 🔄 Tự động đồng bộ sang Elasticsearch & Apache Solr ngay khi database tạo món mới
    searchSyncService.syncMenuItem(newItem.MenuItemId, 'upsert');

    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới món ăn thành công',
      data: newItem
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Update Item (FEAT-FNB-01) with Optimistic Locking
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status, Version } = req.body;

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    // 🔒 OPTIMISTIC LOCKING CHECK:
    // Nếu client truyền Version lên, kiểm tra xem Version có khớp với DB hay không
    if (Version !== undefined && Version !== null && String(Version) !== String(item.Version)) {
      return res.status(409).json({
        code: 'ERROR_0409_VERSION_CONFLICT',
        message: `Xung đột dữ liệu! Món ăn đã được cập nhật bởi một người dùng khác (Phiên bản hiện tại: v${item.Version}, phiên bản bạn đang sửa: v${Version}). Vui lòng tải lại trang để nhận dữ liệu mới nhất.`,
        currentVersion: item.Version,
        expectedVersion: Version
      });
    }

    if (ItemName !== undefined) {
      if (!ItemName || ItemName.trim() === '') {
        return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
      }
      if (ItemName.length > 150) {
        return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên món không được vượt quá 150 ký tự' });
      }

      // Kiểm tra xem tên mới có bị trùng với món ăn khác đang có không
      if (ItemName.trim().toLowerCase() !== item.ItemName.toLowerCase()) {
        const duplicateDish = await MenuItem.findOne({
          where: {
            ItemName: sequelize.where(
              sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('ItemName'))),
              ItemName.trim().toLowerCase()
            ),
            MenuItemId: { [Op.ne]: id },
            IsDeleted: false
          }
        });
        if (duplicateDish) {
          return res.status(409).json({
            code: 'ERROR_0007_DUPLICATE',
            message: `Tên món ăn "${ItemName.trim()}" đã được sử dụng bởi một món khác trong thực đơn! Vui lòng chọn tên khác.`
          });
        }
      }
    }
    if (Description && Description.length > 1000) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Mô tả không được vượt quá 1000 ký tự' });
    }
    if (Price !== undefined && (Price === null || isNaN(Price) || Number(Price) <= 0)) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Giá bán không hợp lệ' });
    }

    if (CategoryId) {
      const categoryExists = await MenuCategory.findByPk(CategoryId);
      if (!categoryExists) {
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Danh mục món ăn không hợp lệ' });
      }
    }

    let finalImageUrl = item.ImageUrl;
    if (ImageUrl !== undefined) {
      const imgResult = validateAndSaveImage(ImageUrl, true);
      if (!imgResult.ok) {
        return res.status(400).json({ code: imgResult.code, message: imgResult.message });
      }
      finalImageUrl = imgResult.url;
    }

    // Tăng Version lên 1 khi update thành công (Khóa lạc quan)
    const nextVersion = Number(item.Version || 1) + 1;

    await item.update({
      CategoryId: CategoryId || item.CategoryId,
      ItemName: ItemName !== undefined ? ItemName.trim() : item.ItemName,
      Price: Price !== undefined ? Price : item.Price,
      Description: Description !== undefined ? Description : item.Description,
      ImageUrl: finalImageUrl,
      Status: Status || item.Status,
      Version: nextVersion,
      UpdatedAt: new Date()
    });

    // 🔄 Tự động đồng bộ món này vào cả 2 công cụ tìm kiếm (Elasticsearch & Apache Solr)
    searchSyncService.syncMenuItem(item.MenuItemId, 'upsert');

    return res.status(200).json({
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật thông tin thành công (Version: v' + nextVersion + ')',
      data: item
    });

  } catch (error) {
    console.error('Error updating menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Soft Delete Item (FEAT-FNB-01)
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    await item.update({ Status: 'Inactive', UpdatedAt: new Date() });

    // 🔄 Tự động xóa khỏi Elasticsearch & Solr
    searchSyncService.syncMenuItem(id, 'delete');

    return res.status(200).json({
      code: 'SUCCESS_0003_DELETED',
      message: 'Đã chuyển trạng thái món sang Ngừng Bán'
    });

  } catch (error) {
    console.error('Error deleting menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Khôi phục món đã xóa mềm (Restore Item)
exports.restoreMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    await item.update({ Status: 'Available', IsDeleted: false, UpdatedAt: new Date() });

    // 🔄 Tự động đồng bộ lại vào Elasticsearch & Solr
    searchSyncService.syncMenuItem(id, 'upsert');

    return res.status(200).json({
      code: 'SUCCESS_0005_RESTORED',
      message: 'Đã khôi phục món ăn trở lại thực đơn'
    });
  } catch (error) {
    console.error('Error restoring menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Update status
exports.updateMenuItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Available', 'OutOfStock', 'Inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Trạng thái không hợp lệ' });
    }
    
    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    const statusLabel = status === 'Available' ? 'Đang mở bán' : status === 'OutOfStock' ? 'Tạm hết hàng' : 'Ngừng bán';

    // 🔒 CONCURRENCY CHECK: Nếu món ăn đã ở trạng thái này rồi (người khác đã bấm trước)
    if (item.Status === status) {
      return res.status(200).json({ 
        code: 'NOTICE_ALREADY_UPDATED',
        alreadyUpdated: true,
        currentStatus: item.Status,
        message: `Món "${item.ItemName}" đã được nhân viên khác chuyển sang trạng thái "${statusLabel}" trước đó. Hệ thống đã tự động đồng bộ lại.` 
      });
    }
    
    await item.update({ Status: status, UpdatedAt: new Date() });

    // 🔄 Tự động đồng bộ trạng thái mới sang Elasticsearch & Solr
    searchSyncService.syncMenuItem(item.MenuItemId, 'upsert');
    
    return res.status(200).json({ 
      code: 'SUCCESS_0004_STATUS_UPDATED', 
      alreadyUpdated: false,
      message: `Đã chuyển món "${item.ItemName}" sang trạng thái "${statusLabel}" thành công.` 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể cập nhật trạng thái món.' });
  }
};

// ============================================================================
// FEAT-SEARCH-01: TÌM KIẾM THỰC ĐƠN ĐA NỀN TẢNG (ELASTICSEARCH & APACHE SOLR)
// ============================================================================

const { expandQuerySemantics } = require('../../utils/searchSemanticHelper');

// 1. Tìm kiếm bằng Elasticsearch (Full-text + Semantic Expansion + Typo Fuzzy)
exports.searchMenuWithElastic = async (req, res) => {
  const startTime = Date.now();
  try {
    const { keyword, category, status } = req.query;
    const esClient = require('../../config/elasticsearch');

    let esQuery;
    let expandedTerms = [];

    // Nếu không nhập từ khóa nhưng có lọc danh mục hoặc trạng thái:
    if (!keyword || keyword.trim() === '') {
      esQuery = {
        bool: {
          must: [{ match_all: {} }],
          filter: []
        }
      };
    } else {
      const cleanKw = keyword.trim();
      // Phân tích ngữ nghĩa theo phong cách Google (bỏ stop words, tìm từ đồng nghĩa)
      const expansion = expandQuerySemantics(cleanKw);
      const filteredText = expansion.filteredText;
      expandedTerms = expansion.expandedTerms || [];

      const shouldClauses = [
        // 1. Khớp cụm nguyên bản hoặc cụm đã lọc stop words (ưu tiên điểm cao nhất)
        {
          multi_match: {
            query: cleanKw,
            fields: ['ItemName^8.0', 'Description^4.0', 'CategoryName^2.5'],
            fuzziness: 'AUTO',
            boost: 4.0
          }
        }
      ];

      if (filteredText && filteredText !== cleanKw.toLowerCase()) {
        shouldClauses.push({
          multi_match: {
            query: filteredText,
            fields: ['ItemName^6.0', 'Description^3.0', 'CategoryName^2.0'],
            fuzziness: 'AUTO',
            boost: 3.0
          }
        });
      }

      // 2. Thêm các từ cốt lõi (Core Terms) và từ đồng nghĩa ngữ nghĩa (VD: 'thích' <-> 'yêu', 'bò' <-> 'wagyu/beef')
      expandedTerms.forEach(term => {
        if (term !== cleanKw.toLowerCase() && term !== filteredText) {
          shouldClauses.push({
            multi_match: {
              query: term,
              fields: ['ItemName^3.0', 'Description^1.5', 'CategoryName^1.0'],
              fuzziness: 'AUTO',
              boost: 1.2
            }
          });
        }
      });

      esQuery = {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
          filter: []
        }
      };
    }

    if (category) {
      esQuery.bool.filter.push({ match_phrase: { CategoryName: category } });
    }
    if (status) {
      esQuery.bool.filter.push({ term: { Status: status } });
    }

    const esResponse = await esClient.search({
      index: 'menu_items',
      body: {
        query: esQuery,
        size: 50
      }
    });

    const outOfStockDishIds = await getOutOfStockDishIds();
    const hits = (esResponse.hits && esResponse.hits.hits) || [];
    const maxScore = esResponse.hits && esResponse.hits.max_score ? esResponse.hits.max_score : 1;
    const scoreThreshold = maxScore * 0.2; // Ngưỡng tương quan 20%

    let filteredHits = hits.filter(h => (h._score || 0) >= scoreThreshold);
    let data = filteredHits.map(hit => {
      const src = { ...hit._source };
      const isMissing = outOfStockDishIds.has(Number(src.MenuItemId));
      if (isMissing && src.Status === 'Available') {
        src.Status = 'OutOfStock';
        src.StockAlert = 'Hết nguyên liệu trong kho bếp';
      }
      return {
        ...src,
        _score: hit._score,
        _engine: 'Elasticsearch'
      };
    });

    if (status === 'Available') {
      data = data.filter(d => d.Status === 'Available' && !outOfStockDishIds.has(Number(d.MenuItemId)));
    } else if (status === 'OutOfStock') {
      data = data.filter(d => d.Status === 'OutOfStock' || outOfStockDishIds.has(Number(d.MenuItemId)));
    }

    return res.status(200).json({
      success: true,
      engine: 'Elasticsearch 9.5.6',
      total: data.length,
      qTimeMs: Date.now() - startTime,
      semanticExpansions: expandedTerms,
      data
    });
  } catch (error) {
    console.warn(`[Elasticsearch Auto-Engine] Cụm ngoại vi chưa bật (${error.message}). Tự động kích hoạt Embedded Lucene BM25 Engine...`);
    try {
      const allItems = await searchSyncService.getAllMenuCache();
      const outOfStockDishIds = await getOutOfStockDishIds();
      const itemsWithStock = allItems.map(it => {
        let st = it.Status;
        let alert = null;
        if (outOfStockDishIds.has(Number(it.MenuItemId)) && st === 'Available') {
          st = 'OutOfStock';
          alert = 'Hết nguyên liệu trong kho bếp';
        }
        return { ...it, Status: st, StockAlert: alert };
      });

      const result = searchEngine.searchMenuItems(itemsWithStock, req.query.keyword, {
        category: req.query.category,
        status: req.query.status,
        engine: 'elasticsearch'
      });

      return res.status(200).json({
        ...result,
        engine: 'Elasticsearch 9.5.6 (Autonomous Engine)',
        autoEngineActive: true
      });
    } catch (fallbackErr) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi tìm kiếm: ' + fallbackErr.message
      });
    }
  }
};

// 2. Tìm kiếm bằng Apache Solr (Hỗ trợ Semantic Expansion + Tiếng Việt không dấu + Typo Fuzzy & Đa từ)
exports.searchMenuWithSolr = async (req, res) => {
  const startTime = Date.now();
  try {
    const { keyword, category, status } = req.query;
    const solrHost = (process.env.SOLR_HOST) || (process.env.DB_HOST === 'mysql' ? 'host.docker.internal' : '127.0.0.1');
    const solrPort = process.env.SOLR_PORT || 8983;

    // Xử lý truy vấn Solr: Nếu không có keyword thì lấy tất cả theo bộ lọc (*:*)
    let finalQuery = '*:*';
    let expandedTerms = [];

    if (keyword && keyword.trim() !== '') {
      const cleanKw = keyword.trim();
      const noToneKw = removeVietnameseTones(cleanKw);
      // 2. Phân tích ngữ nghĩa theo phong cách Google
      const expansion = expandQuerySemantics(cleanKw);
      const filteredText = expansion.filteredText;
      expandedTerms = expansion.expandedTerms || [];
      const coreTerms = expansion.coreTerms || [];

      // Tách các từ riêng lẻ
      const rawTokens = cleanKw.toLowerCase().split(/\s+/).filter(Boolean);
      const tokens = Array.from(new Set([...rawTokens, ...coreTerms]));

      // Xây dựng danh sách mệnh đề truy vấn chuẩn Solr
      const queryParts = [
        // A. Khớp chính xác cụm nguyên bản (điểm cao nhất)
        `"${cleanKw}"^15.0`
      ];

      if (filteredText && filteredText !== cleanKw.toLowerCase()) {
        queryParts.push(`"${filteredText}"^12.0`);
      }

      // B. Khớp tất cả các từ cùng xuất hiện
      if (tokens.length > 1) {
        queryParts.push(`(${tokens.join(' AND ')})^8.0`);
      }

      // C. Khớp tiền tố (Prefix / Gõ dở dang: vd me -> me*)
      const prefixWords = tokens.map(w => (w.includes('*') || w.includes('~')) ? w : `${w}*`);
      queryParts.push(`(${prefixWords.join(' OR ')})^5.0`);

      // D. Khớp mờ chịu sai/thiếu/dư ký tự (Fuzzy ~1, ~2)
      // Tự động nhận diện lỗi typo như 'mesi' -> 'messi', 'tuyéet' -> 'tuyết', 'ronaldoo' -> 'ronaldo'
      tokens.forEach(w => {
        // Đẩy trực tiếp vào queryParts với edismax
        queryParts.push(`${w}~1^6.0`);
        queryParts.push(`${w}~2^4.0`);
        queryParts.push(`*${w}*^5.0`);

        const noTone = removeVietnameseTones(w);
        if (noTone !== w) {
          queryParts.push(`${noTone}~1^5.0`);
          queryParts.push(`${noTone}~2^3.5`);
          queryParts.push(`*${noTone}*^4.0`);
        }
      });

      // E. Bổ sung các từ khóa ngữ nghĩa / đồng nghĩa (Semantic Expansions)
      expandedTerms.forEach(term => {
        if (term !== cleanKw.toLowerCase() && term !== filteredText) {
          queryParts.push(`"${term}"^3.0`);
          const noToneSyn = removeVietnameseTones(term);
          queryParts.push(`*${noToneSyn}*^2.0`);
        }
      });

      finalQuery = queryParts.join(' OR ');
    }

    // Sử dụng edismax parser của Solr với qf đa trường
    const url = new URL(`http://${solrHost}:${solrPort}/solr/menu_items/select`);
    url.searchParams.append('defType', 'edismax');
    url.searchParams.append('q', finalQuery);
    url.searchParams.append('qf', 'item_name^5.0 description^2.5 category^1.5');
    url.searchParams.append('wt', 'json');
    url.searchParams.append('rows', '50');
    url.searchParams.append('fl', '*,score');

    if (category) {
      // Đối với Solr: Bọc ngoặc kép để hỗ trợ các danh mục có dấu cách và gạch chéo như "Đồ Uống / Bar"
      url.searchParams.append('fq', `category:"${category}"`);
    }
    if (status) {
      url.searchParams.append('fq', `status:${status}`);
    }

    const cleanKw = keyword ? keyword.trim() : '';
    console.log(`[SOLR SEARCH] Kw: "${cleanKw}" | URL: ${url.toString()}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Solr HTTP ${response.status}: ${errText}`);
    }

    const solrJson = await response.json();
    const docs = (solrJson.response && solrJson.response.docs) || [];
    console.log(`[SOLR FOUND] Docs count: ${docs.length}`);

    const outOfStockDishIds = await getOutOfStockDishIds();
    let data = docs.map(doc => {
      const mId = Number(doc.id);
      let dishStatus = Array.isArray(doc.status) ? doc.status[0] : (doc.status || 'Available');
      let stockAlert = null;

      if (outOfStockDishIds.has(mId) && dishStatus === 'Available') {
        dishStatus = 'OutOfStock';
        stockAlert = 'Hết nguyên liệu trong kho bếp';
      }

      return {
        MenuItemId: mId,
        ItemName: Array.isArray(doc.item_name) ? doc.item_name[0] : doc.item_name,
        Description: Array.isArray(doc.description) ? doc.description[0] : (doc.description || ''),
        CategoryName: Array.isArray(doc.category) ? doc.category[0] : (doc.category || 'Khác'),
        Price: Array.isArray(doc.price) ? Number(doc.price[0]) : Number(doc.price || 0),
        Status: dishStatus,
        StockAlert: stockAlert,
        _score: doc.score || null,
        _engine: 'Apache Solr'
      };
    });

    if (status === 'Available') {
      data = data.filter(d => d.Status === 'Available' && !outOfStockDishIds.has(Number(d.MenuItemId)));
    } else if (status === 'OutOfStock') {
      data = data.filter(d => d.Status === 'OutOfStock' || outOfStockDishIds.has(Number(d.MenuItemId)));
    }

    return res.status(200).json({
      success: true,
      engine: 'Apache Solr 9.11.0',
      total: data.length,
      qTimeMs: Date.now() - startTime,
      semanticExpansions: expandedTerms,
      data
    });
  } catch (error) {
    console.warn(`[Apache Solr Auto-Engine] Cụm ngoại vi chưa bật (${error.message}). Tự động kích hoạt Embedded Lucene BM25 Engine...`);
    try {
      const allItems = await searchSyncService.getAllMenuCache();
      const outOfStockDishIds = await getOutOfStockDishIds();
      const itemsWithStock = allItems.map(it => {
        let st = it.Status;
        let alert = null;
        if (outOfStockDishIds.has(Number(it.MenuItemId)) && st === 'Available') {
          st = 'OutOfStock';
          alert = 'Hết nguyên liệu trong kho bếp';
        }
        return { ...it, Status: st, StockAlert: alert };
      });

      const result = searchEngine.searchMenuItems(itemsWithStock, req.query.keyword, {
        category: req.query.category,
        status: req.query.status,
        engine: 'solr'
      });

      return res.status(200).json({
        ...result,
        engine: 'Apache Solr 9.11.0 (Autonomous Engine)',
        autoEngineActive: true
      });
    } catch (fallbackErr) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi tìm kiếm: ' + fallbackErr.message
      });
    }
  }
};
