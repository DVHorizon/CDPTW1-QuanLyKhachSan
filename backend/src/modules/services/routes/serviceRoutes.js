'use strict';

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken } = require('../../../middlewares/authMiddleware');

/**
 * Middleware phân quyền cho Module Dịch vụ (FEAT-SERVICE-01 Mục 1.3.a)
 * Chỉ tài khoản role = Admin hoặc có quyền "Quản lý dịch vụ" mới được tạo/sửa/ngừng cung cấp.
 */
const checkServicePermission = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này',
    });
  }

  return verifyToken(req, res, () => {
    const role = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const permissions = req.user?.permissions || [];
    const hasServiceManage = permissions.includes('manage_services') || permissions.includes('SERVICE_MANAGE');
    if (role !== 'Admin' && !hasServiceManage) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }
    return next();
  });
};

// ─── ENDPOINTS QUẢN LÝ DỊCH VỤ ───────────────────────────────────────────────
router.get('/', serviceController.getAllServices);
router.get('/categories', serviceController.getCategories);
router.post('/categories', checkServicePermission, serviceController.createCategory);

router.post('/', checkServicePermission, serviceController.createService);
router.put('/:id', checkServicePermission, serviceController.updateService);
router.patch('/:id/deactivate', checkServicePermission, serviceController.deactivateService);
router.patch('/:id/reactivate', checkServicePermission, serviceController.reactivateService);

module.exports = router;
