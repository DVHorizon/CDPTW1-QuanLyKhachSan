const { MenuItem, MenuCategory } = require('../../models');

// Get all Menu Items
exports.getMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.findAll({ 
      include: MenuCategory,
      limit: 500,
      order: [['MenuItemId', 'DESC']]
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Item
exports.createMenuItem = async (req, res) => {
  try {
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status } = req.body;

    // Validate required fields
    if (!ItemName || ItemName.trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên món không được để trống' });
    }
    if (!CategoryId) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Danh mục không được để trống' });
    }
    if (Price === undefined || Price === null) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Giá bán không được để trống' });
    }
    if (!Status) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Trạng thái không được để trống' });
    }

    const categoryExists = await MenuCategory.findByPk(CategoryId);
    if (!categoryExists) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Danh mục món ăn không hợp lệ' });
    }

    const newItem = await MenuItem.create({
      CategoryId, ItemName, Price, Description, ImageUrl, Status
    });

    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      message: `Thêm mới ${ItemName} thành công`,
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
    const { CategoryId, ItemName, Price, Description, ImageUrl, Status } = req.body;

    const item = await MenuItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy món ăn' });
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
