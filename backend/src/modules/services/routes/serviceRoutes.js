'use strict';

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, optionalVerifyToken } = require('../../../middlewares/authMiddleware');

/**
 * Middleware phân quyền cho Module Dịch vụ (FEAT-SERVICE-01 Mục 1.3.a & QA Scenario #14)
 * Chỉ tài khoản Admin, Manager, Staff hoặc có quyền "manage_services" / "SERVICE_MANAGE"
 * mới được tạo/sửa/ngừng cung cấp dịch vụ.
 */
const checkServicePermission = (req, res, next) => {
  return verifyToken(req, res, () => {
    const role = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const hasServiceManage =
      permissions.includes('manage_services') || permissions.includes('SERVICE_MANAGE');
    const isAllowedRole = ['Admin', 'Manager', 'Staff'].includes(role);

    if (!isAllowedRole && !hasServiceManage) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }
    return next();
  });
};

/**
 * Middleware phân quyền cho xuất báo cáo bảng giá Excel (GET /export)
 * Cho phép nhân sự nội bộ (Admin, Manager, Staff, Receptionist) hoặc có quyền manage_services.
 */
const checkServiceExportPermission = (req, res, next) => {
  return verifyToken(req, res, () => {
    const role = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const hasServiceManage =
      permissions.includes('manage_services') || permissions.includes('SERVICE_MANAGE');
    const isAllowedStaff = ['Admin', 'Manager', 'Staff', 'Receptionist'].includes(role);

    if (!isAllowedStaff && !hasServiceManage) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền xuất dữ liệu bảng giá dịch vụ',
      });
    }
    return next();
  });
};

// ─── ENDPOINTS QUẢN LÝ DỊCH VỤ ───────────────────────────────────────────────
router.get('/', optionalVerifyToken, serviceController.getAllServices);
router.get('/export', checkServiceExportPermission, serviceController.exportServicesExcel);
router.get('/categories', optionalVerifyToken, serviceController.getCategories);
router.post('/categories', checkServicePermission, serviceController.createCategory);
router.get('/:id', optionalVerifyToken, serviceController.getServiceById);

router.post('/', checkServicePermission, serviceController.createService);
router.put('/:id', checkServicePermission, serviceController.updateService);
router.patch('/:id/deactivate', checkServicePermission, serviceController.deactivateService);
router.patch('/:id/reactivate', checkServicePermission, serviceController.reactivateService);

module.exports = router;
