'use strict';

/**
 * shared/middlewares/rbacMiddleware.js
 * RBAC (Role-Based Access Control) middleware.
 *
 * Dùng trong route:
 *   const { requireRole } = require('../../shared/middlewares/rbacMiddleware');
 *   router.post('/', verifyToken, requireRole('Admin', 'Receptionist'), controller.create);
 *
 * Roles hệ thống: Admin | Receptionist | Kitchen | Housekeeping | Guest
 */

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code:    'UNAUTHORIZED',
      message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
      timestamp: new Date().toISOString(),
    });
  }

  const userRole = req.user.roleName || req.user.role?.RoleName || '';
  if (!roles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      code:    'FORBIDDEN',
      message: `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(' hoặc ')}.`,
      timestamp: new Date().toISOString(),
    });
  }

  return next();
};

/**
 * Middleware kiểm tra Admin hoặc chính chủ (own resource)
 * Dùng cho các API như "chỉ sửa booking của mình"
 */
const requireOwnerOrRole = (getResourceUserId, ...adminRoles) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false, code: 'UNAUTHORIZED',
      message: 'Bạn chưa đăng nhập.',
      timestamp: new Date().toISOString(),
    });
  }

  const userRole = req.user.roleName || req.user.role?.RoleName || '';
  if (adminRoles.includes(userRole)) return next();

  try {
    const resourceUserId = await getResourceUserId(req);
    if (resourceUserId && resourceUserId === req.user.UserId) return next();
  } catch (_) {}

  return res.status(403).json({
    success: false, code: 'FORBIDDEN',
    message: 'Bạn không có quyền thao tác với tài nguyên này.',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { requireRole, requireOwnerOrRole };
