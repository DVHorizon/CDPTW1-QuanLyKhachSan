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

// Thuật toán tính khoảng cách chỉnh sửa Levenshtein Distance (để bắt lỗi chính tả, gõ nhầm phím)
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
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // Xóa
          dp[i][j - 1],     // Thêm
          dp[i - 1][j - 1]  // Thay thế
        );
      }
    }
  }
  return dp[m][n];
}

// Kiểm tra khớp từ mờ (Fuzzy / Sai chính tả / Gõ nhầm ký tự)
function isFuzzyWordMatch(wordA, wordB) {
  if (wordA === wordB) return true;
  if (wordA.includes(wordB) || wordB.includes(wordA)) return true;

  const len = Math.max(wordA.length, wordB.length);
  // Từ ngắn (dưới 4 chữ cái) chỉ cho phép sai lệch tối đa 1 ký tự
  // Từ dài cho phép sai lệch 2 ký tự (ví dụ "wagyu" vs "waygu", "salad" vs "salat")
  const maxAllowedDistance = len <= 4 ? 1 : 2;
  const dist = levenshteinDistance(wordA, wordB);

  return dist <= maxAllowedDistance;
}

// Search Engine tổng hợp: Khớp chính xác + Không dấu + Viết tắt + Sai chính tả (Fuzzy Search)
function matchesSearchEngine(text, keyword) {
  if (!text || !keyword) return false;

  const normText = removeVietnameseTones(text);
  const normKeyword = removeVietnameseTones(keyword);

  // 1. Khớp chuỗi trực tiếp (kể cả không dấu)
  if (normText.includes(normKeyword)) return true;

  // 2. Khớp từ viết tắt (Acronym)
  const acronym = getAcronym(text);
  const cleanKey = normKeyword.replace(/\s+/g, '');
  if (acronym.includes(cleanKey)) return true;

  // 3. Khớp mờ / Sai chính tả từng từ (Fuzzy Matching)
  const textWords = normText.split(/\s+/).filter(Boolean);
  const keyWords = normKeyword.split(/\s+/).filter(Boolean);

  // Nếu tất cả các từ trong keyword đều có từ tương đồng gần đúng trong tên món ăn
  const allKeyWordsMatch = keyWords.every(kw => 
    textWords.some(tw => isFuzzyWordMatch(tw, kw))
  );

  if (allKeyWordsMatch) return true;

  // 4. Nếu keyword gõ dính liền nhưng sai chính tả gần giống toàn bộ tên món (ví dụ: "bowagyu" vs "bo wagyu")
  const textNoSpace = normText.replace(/\s+/g, '');
  if (isFuzzyWordMatch(textNoSpace, cleanKey)) return true;

  return false;
}

// Get all Menu Items (FEAT-FNB-02)
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, status, page, limit } = req.query;
    const whereClause = { IsDeleted: false };
    
    if (category) {
      whereClause.CategoryId = category;
    }

    if (status) {
      whereClause.Status = status;
    }

    // Nếu không có keyword, lấy nhanh 100 món đầu tiên
    if (!keyword || keyword.trim() === '') {
      const queryOptions = {
        where: whereClause,
        include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
        attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'CreatedAt'],
        order: [['MenuItemId', 'DESC']],
        limit: 100
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

    // Khi có keyword, áp dụng bộ Smart Fuzzy Search Engine
    const cleanKeyword = keyword.trim();
    const items = await MenuItem.findAll({
      where: whereClause,
      include: [{ model: MenuCategory, attributes: ['CategoryId', 'CategoryName'] }],
      attributes: ['MenuItemId', 'CategoryId', 'ItemName', 'Price', 'Description', 'ImageUrl', 'Status', 'CreatedAt'],
      order: [['MenuItemId', 'DESC']],
      limit: 300
    });

    const filtered = items.filter(item => {
      // Tìm trong Tên món ăn
      if (matchesSearchEngine(item.ItemName, cleanKeyword)) return true;
      // Tìm trong Mô tả món ăn
      if (item.Description && matchesSearchEngine(item.Description, cleanKeyword)) return true;
      // Tìm theo mã định danh #MN-101 hoặc 101
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

    await item.update({ Status: 'Inactive', IsDeleted: true, UpdatedAt: new Date() });

    return res.status(200).json({
      code: 'SUCCESS_0003_DELETED',
      message: 'Đã xóa món ăn thành công'
    });

  } catch (error) {
    console.error('Error deleting menu item:', error);
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
