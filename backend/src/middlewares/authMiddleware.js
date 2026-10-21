const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

/**
 * Middleware xác thực JWT token từ Header Authorization
 * Đồng thời kiểm tra trạng thái thực tế trong Database (Status !== 'Locked', IsDeleted === 0)
 * Giúp thu hồi quyền / khóa tài khoản tức thì mà không cần chờ JWT hết hạn.
 */
const verifyToken = async (req, res, next) => {
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

    // Kiểm tra trực tiếp trạng thái tài khoản trong Database
    const [rows] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.Username, u.FullName, u.Email, u.Phone, 
              u.Status, u.IsDeleted, u.MustChangePassword,
              r.RoleName
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       WHERE u.UserId = ?
       LIMIT 1`,
      [decoded.userId]
    );

    if (rows.length === 0 || rows[0].IsDeleted === 1) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này'
      });
    }

    const dbUser = rows[0];

    // Quy tắc 3.7: Kiểm tra tài khoản bị khóa
    if (dbUser.Status === 'Locked' || dbUser.Status === 'Revoked' || dbUser.Status === 'Inactive') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên'
      });
    }

    req.user = {
      ...decoded,
      userId: dbUser.UserId,
      roleId: dbUser.RoleId,
      roleName: dbUser.RoleName || decoded.roleName || 'Guest',
      username: dbUser.Username,
      fullName: dbUser.FullName,
      email: dbUser.Email,
      phone: dbUser.Phone,
      status: dbUser.Status,
      mustChangePassword: Boolean(dbUser.MustChangePassword)
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }
};

/**
 * Middleware tùy chọn xác thực (nếu có token thì nạp thông tin, không có thì bỏ qua)
 */
const optionalVerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.Username, u.FullName, u.Email, u.Status, u.IsDeleted, r.RoleName
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       WHERE u.UserId = ? AND u.IsDeleted = 0
       LIMIT 1`,
      [decoded.userId]
    );
    if (rows.length > 0 && rows[0].Status === 'Active') {
      req.user = {
        ...decoded,
        userId: rows[0].UserId,
        roleId: rows[0].RoleId,
        roleName: rows[0].RoleName,
        username: rows[0].Username,
        fullName: rows[0].FullName,
        email: rows[0].Email
      };
    }
  } catch (_) {
    // Bỏ qua lỗi token với optional
  }
  next();
};

/**
 * Middleware kiểm tra quyền cụ thể theo ma trận Permission trong Database
 * Admin (RoleId 1 hoặc RoleName 'Admin') mặc định có toàn quyền.
 */
const requirePermission = (permissionName) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }

  // Quản trị viên hệ thống (Admin) có toàn quyền
  if (req.user.roleId === 1 || req.user.roleName === 'Admin') {
    return next();
  }

  try {
    // Kiểm tra trong bảng RolePermissions liên kết với Permissions
    const [perms] = await pool.query(
      `SELECT p.PermissionName
       FROM RolePermissions rp
       JOIN Permissions p ON rp.PermissionId = p.PermissionId
       WHERE rp.RoleId = ? AND p.PermissionName = ?
       LIMIT 1`,
      [req.user.roleId, permissionName]
    );

    if (perms.length === 0) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền truy cập: ' + err.message
    });
  }
};

/**
 * Middleware chỉ cho phép các vai trò nhân viên nội bộ (Admin, Lễ tân, Bếp, Dọn phòng)
 * Chặn khách hàng thông thường (Guest / RoleId 5) truy cập API quản trị
 */
const requireInternalStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }

  const internalRoleIds = [1, 2, 3, 4];
  const internalRoleNames = ['Admin', 'Receptionist', 'Kitchen', 'Housekeeping'];

  if (!internalRoleIds.includes(req.user.roleId) && !internalRoleNames.includes(req.user.roleName)) {
    return res.status(403).json({
      success: false,
      code: 'ERROR_0010_FORBIDDEN',
      message: 'Bạn không có quyền thực hiện chức năng này'
    });
  }

  next();
};

/**
 * Middleware chỉ cho phép Quản trị viên (Admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này'
    });
  }

  if (req.user.roleId !== 1 && req.user.roleName !== 'Admin') {
    return res.status(403).json({
      success: false,
      code: 'ERROR_0010_FORBIDDEN',
      message: 'Bạn không có quyền thực hiện chức năng này'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  optionalVerifyToken,
  requirePermission,
  requireInternalStaff,
  requireAdmin,
  JWT_SECRET
};
