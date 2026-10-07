const { MenuItem, MenuCategory } = require('../../models');

const { Op } = require('sequelize');

// Get all Menu Items
exports.getMenuItems = async (req, res) => {
  try {
    const { category, keyword, stockStatus, servingTime, kitchenStation } = req.query;
    const whereClause = { IsDeleted: false };
    
    if (category) {
      whereClause.CategoryId = category;
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

    if (keyword) {
      whereClause[Op.or] = [
        { ItemName: { [Op.like]: `%${keyword}%` } },
        { Description: { [Op.like]: `%${keyword}%` } },
        { SKU: { [Op.like]: `%${keyword}%` } },
        { Ingredients: { [Op.like]: `%${keyword}%` } },
        { Allergens: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const items = await MenuItem.findAll({
      where: whereClause,
      include: MenuCategory,
      order: [['MenuItemId', 'DESC']]
    });

    if (items.length === 0) {
      if (keyword) {
        return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn phù hợp với từ khóa.' });
      }
      if (category) {
        return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn trong danh mục đã chọn.' });
      }
      if (stockStatus) {
        return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không có món ăn phù hợp với tình trạng đã chọn.' });
      }
    }

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải danh sách món ăn.' });
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
    
    if (!status) {
      return res.status(400).json({ code: 'ERROR_0005_VALIDATION', message: 'Trạng thái không được để trống' });
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
    return res.status(500).json({ code: 'ERROR_0500_INTERNAL', message: 'Lỗi hệ thống' });
  }
};
