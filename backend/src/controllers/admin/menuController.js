const { MenuItem, MenuCategory } = require('../../models');
const { Op } = require('sequelize');

// Hàm loại bỏ dấu tiếng Việt để tìm kiếm không dấu
const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Hàm lấy chữ cái đầu của từng từ (Acronym / Viết tắt)
// Ví dụ: "Bò Wagyu Thượng Hạng" -> "bwth"
const getAcronym = (str) => {
  if (!str) return '';
  const cleanStr = removeVietnameseTones(str);
  return cleanStr
    .split(/\s+/)
    .map(word => word[0])
    .filter(Boolean)
    .join('');
};

// Get all Menu Items với Smart Search Engine
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, stockStatus, servingTime, kitchenStation } = req.query;
    const whereClause = { IsDeleted: false };
    
    if (category) {
      if (isNaN(category)) {
        // Nếu truyền tên danh mục (VD: Khai vị, Món chính, Đồ uống)
        const cat = await MenuCategory.findOne({
          where: {
            CategoryName: { [Op.like]: `%${category}%` }
          }
        });
        if (cat) {
          whereClause.CategoryId = cat.CategoryId;
        } else {
          whereClause.CategoryId = -1; // Không tìm thấy danh mục
        }
      } else {
        whereClause.CategoryId = category;
      }
    }

    if (stockStatus) {
      whereClause.Status = stockStatus;
    }

    if (servingTime) {
      whereClause.ServingTime = servingTime;
    }

    if (kitchenStation) {
      whereClause.KitchenStation = kitchenStation;
    }

    // Lấy dữ liệu theo các filter cứng (Category, Status, Time, Station)
    const items = await MenuItem.findAll({
      where: whereClause,
      include: MenuCategory,
      order: [['MenuItemId', 'ASC']]
    });

    // Nếu không có keyword, trả về danh sách đầy đủ (giới hạn theo limit)
    if (!keyword || !keyword.trim()) {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      return res.status(200).json({
        success: true,
        total: items.length,
        data: items.slice(0, limit)
      });
    }

    // XỬ LÝ SMART SEARCH:
    // 1. Tìm chính xác từ khóa
    // 2. Tìm Tiếng Việt không dấu
    // 3. Tìm viết tắt chữ cái đầu (Acronym, ví dụ 'bwth' -> 'Bò Wagyu Thượng Hạng')
    const rawKw = keyword.trim().toLowerCase();
    const cleanKw = removeVietnameseTones(keyword);
    const isShortAcronym = /^[a-z0-9]{2,8}$/i.test(cleanKw); // Nếu người dùng gõ chuỗi ngắn không dấu cách

    const Fuse = require('fuse.js');

    // 1. Kiểm tra so khớp chính xác / không dấu / viết tắt
    let matchedList = items.filter(item => {
      const itemName = item.ItemName || '';
      const sku = item.SKU || '';
      const desc = item.Description || '';
      const ingredients = item.Ingredients || '';
      const allergens = item.Allergens || '';

      const cleanItemName = removeVietnameseTones(itemName);
      const cleanSku = removeVietnameseTones(sku);
      const cleanDesc = removeVietnameseTones(desc);
      const cleanIngredients = removeVietnameseTones(ingredients);
      const cleanAllergens = removeVietnameseTones(allergens);

      // (A) So khớp chuỗi con không dấu liên tục:
      // - Luôn so khớp trên Tên món (ItemName) và Mã (SKU)
      // - Với Mô tả (Description) & Nguyên liệu: chỉ so khớp khi từ khóa >= 3 ký tự HOẶC chứa ranh giới từ
      const matchNameOrSku = cleanItemName.includes(cleanKw) || cleanSku.includes(cleanKw);
      if (matchNameOrSku) return true;

      // (B) So khớp viết tắt chữ cái đầu (Acronym: 'sc' -> 'Salad Cá', 'bwth' -> 'Bò Wagyu Thượng Hạng')
      // Bắt đầu bằng chữ cái đầu của các từ
      if (isShortAcronym) {
        const itemAcronym = getAcronym(itemName);
        if (itemAcronym.startsWith(cleanKw) || itemAcronym.includes(cleanKw)) {
          return true;
        }

        const skuCompact = cleanSku.replace(/[^a-z0-9]/g, '');
        if (skuCompact.includes(cleanKw)) {
          return true;
        }
      }

      // (C) So khớp từ khóa rời rạc (Ví dụ: 'tôm nướng' -> 'Tôm Hùm Nướng Bơ Tỏi')
      const kwWords = cleanKw.split(/\s+/).filter(w => w.length > 0);
      if (kwWords.length > 1) {
        const fullItemText = `${cleanItemName} ${cleanIngredients} ${cleanDesc} ${cleanSku}`;
        const allWordsPresent = kwWords.every(word => fullItemText.includes(word));
        if (allWordsPresent) return true;
      }

      // (D) So khớp trên Mô tả & Nguyên liệu: CHỈ KHI từ khóa dài >= 3 ký tự để tránh dính chữ ngẫu nhiên (như 'sc' trong mascarpone)
      if (cleanKw.length >= 3) {
        const matchDetails = cleanIngredients.includes(cleanKw) || cleanDesc.includes(cleanKw) || cleanAllergens.includes(cleanKw);
        if (matchDetails) return true;
      }

      return false;
    });

    // 2. NẾU VẪN CHƯA TÌM THẤY (Do gõ sai chính tả: ví dụ 'wagiu', 'vagyu', 'tom humm', 'sup bao ngu')
    // -> Kích hoạt Fuzzy Search với Fuse.js (Ngưỡng sai số threshold = 0.4)
    if (matchedList.length === 0 && cleanKw.length >= 3) {
      const fuseData = items.map(item => ({
        original: item,
        cleanName: removeVietnameseTones(item.ItemName || ''),
        cleanIngredients: removeVietnameseTones(item.Ingredients || ''),
        cleanDesc: removeVietnameseTones(item.Description || ''),
        cleanSku: removeVietnameseTones(item.SKU || '')
      }));

      const fuse = new Fuse(fuseData, {
        keys: [
          { name: 'cleanName', weight: 0.6 },
          { name: 'cleanIngredients', weight: 0.2 },
          { name: 'cleanDesc', weight: 0.1 },
          { name: 'cleanSku', weight: 0.1 }
        ],
        threshold: 0.4, // Cho phép sai khác khoảng 40% ký tự do gõ nhầm/thiếu
        distance: 100,
        minMatchCharLength: 3
      });

      const fuzzyResults = fuse.search(cleanKw);
      matchedList = fuzzyResults.map(r => r.item.original);
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    // Luôn trả về 200 kể cả khi không tìm thấy món nào
    return res.status(200).json({
      success: true,
      total: matchedList.length,
      data: matchedList.slice(0, limit)
    });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách món ăn.' });
  }
};

// Create Item
exports.createMenuItem = async (req, res) => {
  try {
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status, SKU, Ingredients, Allergens, ServingTime, KitchenStation } = req.body;

    // Validate required fields & constraints
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
    if (Price === undefined || Price === null || isNaN(Price) || Price < 0) {
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
      CategoryId, ItemName, Price, Description, ImageUrl, Status, SKU, Ingredients, Allergens, ServingTime, KitchenStation
    });

    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      message: `Thêm mới món ăn thành công`,
      data: newItem
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};

// Update Item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status, SKU, Ingredients, Allergens, ServingTime, KitchenStation } = req.body;

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
    if (Price !== undefined && (Price === null || isNaN(Price) || Price < 0)) {
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
      ItemName: ItemName || item.ItemName,
      Price: Price !== undefined ? Price : item.Price,
      Description: Description !== undefined ? Description : item.Description,
      ImageUrl: ImageUrl !== undefined ? ImageUrl : item.ImageUrl,
      Status: Status || item.Status,
      SKU: SKU !== undefined ? SKU : item.SKU,
      Ingredients: Ingredients !== undefined ? Ingredients : item.Ingredients,
      Allergens: Allergens !== undefined ? Allergens : item.Allergens,
      ServingTime: ServingTime !== undefined ? ServingTime : item.ServingTime,
      KitchenStation: KitchenStation !== undefined ? KitchenStation : item.KitchenStation,
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

// Soft Delete Item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }

    // TODO: Món đang có đơn hàng chưa hoàn tất không được lưu trữ
    // const hasPendingOrders = await checkPendingOrders(id);
    // if (hasPendingOrders) {
    //   return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể lưu trữ. Món đang có đơn hàng chưa hoàn tất.' });
    // }

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

exports.updateMenuItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Authorization mock logic could go here
    // if (!req.headers.authorization) return res.status(401).json({ code: 'ERROR_0009_UNAUTHENTICATED', message: 'Bạn cần đăng nhập để thực hiện chức năng này' });
    
    const validStatuses = ['Available', 'OutOfStock', 'Inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Trạng thái không hợp lệ' });
    }
    
    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
    }
    
    // Simulate POS sync
    const posSyncSuccess = true; // In real life, call POS API here
    if (!posSyncSuccess) {
      return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể đồng bộ với hệ thống POS.' });
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

exports.getMenuCategories = async (req, res) => {
  try {
    const categories = await MenuCategory.findAll({
      where: { IsDeleted: false },
      order: [['CategoryId', 'ASC']]
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Không thể tải danh mục thực đơn.' });
  }
};

