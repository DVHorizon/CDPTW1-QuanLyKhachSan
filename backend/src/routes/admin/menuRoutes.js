const express = require('express');
const router = express.Router();
const menuController = require('../../controllers/admin/menuController');

// Đúng chuẩn API tài liệu:
// GET    /api/v1/menu-items (CRUD, danh sách, tìm kiếm, lọc)
// POST   /api/v1/menu-items (Thêm món mới)
// PUT    /api/v1/menu-items/:id (Cập nhật món)
// DELETE /api/v1/menu-items/:id (Xóa/lưu trữ món)
// PATCH  /api/v1/menu-items/:id/status (Cập nhật trạng thái Còn phục vụ / Tạm hết món)
router.get('/menu-items', menuController.getMenuItems);
router.post('/menu-items', menuController.createMenuItem);
router.put('/menu-items/:id', menuController.updateMenuItem);
router.delete('/menu-items/:id', menuController.deleteMenuItem);
router.patch('/menu-items/:id/status', menuController.updateMenuItemStatus);

module.exports = router;
