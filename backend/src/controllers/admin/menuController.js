const { MenuItem, MenuCategory } = require('../../models');
const { Op } = require('sequelize');

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

// Get all Menu Items (FEAT-FNB-02)
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, status, isDeleted, page, limit } = req.query;
    
    // Mặc định chỉ lấy các món chưa bị xóa mềm (IsDeleted = false)
    // Nếu truyền isDeleted=true thì lấy danh sách các món trong thùng rác / đã xóa mềm
    const whereClause = { IsDeleted: false };
    
    if (status && status !== '') {
      whereClause.Status = status;
    }
    
    if (category) {
      whereClause.CategoryId = category;
    }

    // Nếu không có keyword, lấy toàn bộ món theo thứ tự ID giảm dần
    if (!keyword || keyword.trim() === '') {
      const queryOptions = {
        where: whereClause,
        include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
        attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt'],
        order: [['MenuItemId', 'DESC']]
      };

      const items = await MenuItem.findAll(queryOptions);

      if (items.length === 0) {
        if (category) {
          return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn trong danh mục đã chọn.' });
        }
        if (status) {
          return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không có món ăn phù hợp với trạng thái đã chọn.' });
        }
      }

      return res.status(200).json({ success: true, data: items });
    }

    // Khi có keyword, áp dụng bộ Smart Fuzzy Search Engine trên toàn bộ món
    const cleanKeyword = keyword.trim();
    const items = await MenuItem.findAll({
      where: whereClause,
      include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
      attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'IsDeleted', 'CreatedAt'],
      order: [['MenuItemId', 'DESC']]
    });

    const filtered = items.filter(item => {
      if (matchesSearchEngine(item.ItemName, cleanKeyword)) return true;
      if (item.Description && matchesSearchEngine(item.Description, cleanKeyword)) return true;
      const idStr = String(item.MenuItemId);
      const cleanNorm = removeVietnameseTones(cleanKeyword).replace(/[^a-z0-9]/g, '');
      if (cleanNorm && (`mn${idStr}`.includes(cleanNorm) || idStr.includes(cleanNorm))) return true;
      return false;
    });

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

    const newItem = await MenuItem.create({
      CategoryId,
      ItemName: ItemName.trim(),
      Price,
      Description: Description || null,
      ImageUrl: ImageUrl || null,
      Status,
      IsDeleted: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    });

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

// Update Item (FEAT-FNB-01)
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status } = req.body;

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    if (ItemName !== undefined) {
      if (!ItemName || ItemName.trim() === '') {
        return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
      }
      if (ItemName.length > 150) {
        return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên món không được vượt quá 150 ký tự' });
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

    await item.update({
      CategoryId: CategoryId || item.CategoryId,
      ItemName: ItemName !== undefined ? ItemName.trim() : item.ItemName,
      Price: Price !== undefined ? Price : item.Price,
      Description: Description !== undefined ? Description : item.Description,
      ImageUrl: ImageUrl !== undefined ? ImageUrl : item.ImageUrl,
      Status: Status || item.Status,
      UpdatedAt: new Date()
    });

    return res.status(200).json({
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật thông tin thành công',
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
    
    await item.update({ Status: status, UpdatedAt: new Date() });
    
    return res.status(200).json({ 
      code: 'SUCCESS_0004_STATUS_UPDATED', 
      message: 'Đã cập nhật trạng thái món ăn' 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể cập nhật trạng thái món.' });
  }
};
