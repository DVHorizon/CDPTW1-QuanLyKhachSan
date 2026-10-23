const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

/**
 * Middleware xác thực JWT token từ Header Authorization
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này'
      });
    }
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }
};


const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // Token không hợp lệ thì bỏ qua, xem như khách vãng lai
  }
  next();
};

const pool = require('../config/db');

/**
 * Middleware kiểm tra phân quyền tài khoản (RBAC) theo mã quyền
 * Ví dụ: requirePermissions('BOOKING_CONFIRM') hoặc requirePermissions(['BOOKING_CONFIRM', 'ROOM_ALLOCATION'])
 */
const requirePermissions = (requiredPermissions) => {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return async (req, res, next) => {
    // 1. Kiểm tra xác thực token trước
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này'
      });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này'
      });
    }

    const { roleId, roleName } = req.user;

    // Quản trị viên (Admin) luôn có toàn quyền
    if (roleId === 1 || roleName === 'Admin') {
      return next();
    }

    // 2. Kiểm tra quyền cụ thể trong CSDL
    try {
      const [rows] = await pool.query(
        `SELECT p.PermissionName
         FROM RolePermissions rp
         JOIN Permissions p ON rp.PermissionId = p.PermissionId
         WHERE rp.RoleId = ? AND p.PermissionName IN (?)`,
        [roleId, perms]
      );

      const heldNames = rows.map((r) => r.PermissionName);
      const hasAll = perms.every((p) => heldNames.includes(p));

      if (!hasAll) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền thực hiện chức năng này'
        });
      }

      next();
    } catch (err) {
      console.error('Lỗi kiểm tra quyền truy cập:', err);
      return res.status(500).json({
        success: false,
        code: 'ERROR_0030_ALLOCATION_TRANSACTION',
        message: 'Lỗi kiểm tra quyền hạn hệ thống'
      });
    }
  };
};

module.exports = {
  verifyToken,
  optionalVerifyToken,
  requirePermissions,
  JWT_SECRET
};
