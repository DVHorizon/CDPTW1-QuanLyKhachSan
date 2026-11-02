const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { verifyToken, requirePermission } = require('../middlewares/authMiddleware');

/**
 * Helper: Ghi log kiểm toán nghiệp vụ vào bảng AuditLogs
 */
async function writeAuditLog({ userId, actionType, recordId, oldValues = null, newValues = null, req = null }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    await pool.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, ?, 'Users', ?, ?, ?, NOW(), ?)`,
      [
        userId || 1,
        actionType,
        recordId ? String(recordId) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ip
      ]
    );
  } catch (err) {
    console.warn('Lỗi ghi AuditLog (tiếp tục xử lý):', err.message);
  }
}

/**
 * Helper: Tạo mật khẩu tạm ngẫu nhiên 10 ký tự gồm chữ hoa, chữ thường và số
 */
function generateTemporaryPassword() {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = uppers + lowers + digits;

  // Đảm bảo có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số
  let pwd = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    digits[Math.floor(Math.random() * digits.length)]
  ];

  for (let i = 3; i < 10; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle
  return pwd.sort(() => 0.5 - Math.random()).join('');
}

// ─── GET danh mục các vai trò nội bộ cố định (Spec 3 - Mục 3.6 & Bảng 5) ────────
// GET /api/v1/roles hoặc /api/v1/users/roles
router.get('/roles', verifyToken, async (req, res) => {
  try {
    const [roles] = await pool.query(
      `SELECT RoleId as roleId, RoleName as roleName, Description as description
       FROM Roles
       WHERE IsDeleted = 0 AND RoleId IN (1, 2, 3, 4)
       ORDER BY RoleId ASC`
    );
    return res.json({ success: true, data: roles });
  } catch (err) {
    console.error('Lỗi GET /api/v1/roles:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách vai trò' });
  }
});

// ─── GET danh sách người dùng nội bộ (Spec 3 - Mục 4.1 & Wireframe 6.1) ──────────
// GET /api/v1/users?search=&role=&status=&page=1&limit=10&sort=asc
router.get('/', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10, sort = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;
    const sortDir = String(sort).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let whereClause = 'WHERE u.IsDeleted = 0';
    const params = [];

    // Tìm kiếm theo tên / username / email / sđt / mã nhân viên
    if (search && search.trim()) {
      whereClause += ` AND (u.FullName LIKE ? OR u.Username LIKE ? OR u.Email LIKE ? OR u.Phone LIKE ? OR u.EmployeeCode LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    // Lọc theo vai trò (chỉ trong 4 vai trò nội bộ hoặc chỉ định)
    if (role && role !== 'TAT_CA' && role !== 'all') {
      whereClause += ` AND (r.RoleName = ? OR u.RoleId = ?)`;
      params.push(role, parseInt(role, 10) || 0);
    }

    // Lọc theo trạng thái (Active | Locked)
    if (status && status !== 'TAT_CA' && status !== 'all') {
      if (status === 'Active') {
        whereClause += ` AND u.Status = 'Active'`;
      } else if (status === 'Locked') {
        whereClause += ` AND (u.Status = 'Locked' OR u.Status = 'Inactive' OR u.Status = 'Revoked')`;
      }
    }

    // Đếm tổng số bản ghi thỏa mãn điều kiện lọc
    const countSql = `
      SELECT COUNT(*) as total 
      FROM Users u
      LEFT JOIN Roles r ON u.RoleId = r.RoleId
      ${whereClause}
    `;
    const [[{ total }]] = await pool.query(countSql, params);

    // Lấy dữ liệu phân trang theo thứ tự Họ tên A-Z (Spec 6.1)
    const dataSql = `
      SELECT u.UserId, u.Username, u.FullName, u.Email, u.Phone, u.EmployeeCode,
             u.AvatarUrl, u.Status, u.MustChangePassword, u.CreatedAt, u.UpdatedAt,
             r.RoleId, r.RoleName, r.Description as RoleDescription
      FROM Users u
      LEFT JOIN Roles r ON u.RoleId = r.RoleId
      ${whereClause}
      ORDER BY u.FullName ${sortDir}
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, pageSize, offset];
    const [rows] = await pool.query(dataSql, queryParams);

    const formattedUsers = rows.map(u => ({
      userId: u.UserId,
      id: u.EmployeeCode || `NV-${String(u.UserId).padStart(4, '0')}`,
      username: u.Username || `user_${u.UserId}`,
      fullName: u.FullName,
      email: u.Email,
      phone: u.Phone || '',
      employeeCode: u.EmployeeCode || `NV-${String(u.UserId).padStart(4, '0')}`,
      avatarUrl: u.AvatarUrl || null,
      roleId: u.RoleId,
      roleName: u.RoleName || 'Staff',
      roleDescription: u.RoleDescription,
      status: (u.Status === 'Active') ? 'Active' : 'Locked',
      mustChangePassword: Boolean(u.MustChangePassword),
      createdAt: u.CreatedAt,
      updatedAt: u.UpdatedAt
    }));

    return res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/v1/users:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách tài khoản: ' + err.message });
  }
});

// ─── GET chi tiết 1 người dùng ──────────────────────────────────────────────────
router.get('/:id', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }

    const [rows] = await pool.query(
      `SELECT u.UserId, u.Username, u.FullName, u.Email, u.Phone, u.EmployeeCode,
              u.AvatarUrl, u.Status, u.MustChangePassword, u.CreatedAt, u.UpdatedAt,
              r.RoleId, r.RoleName, r.Description as RoleDescription
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       WHERE u.UserId = ? AND u.IsDeleted = 0
       LIMIT 1`,
      [rawId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống!'
      });
    }

    const u = rows[0];
    return res.json({
      success: true,
      data: {
        userId: u.UserId,
        id: u.EmployeeCode || `NV-${String(u.UserId).padStart(4, '0')}`,
        username: u.Username,
        fullName: u.FullName,
        email: u.Email,
        phone: u.Phone,
        employeeCode: u.EmployeeCode,
        avatarUrl: u.AvatarUrl,
        roleId: u.RoleId,
        roleName: u.RoleName,
        status: (u.Status === 'Active') ? 'Active' : 'Locked',
        mustChangePassword: Boolean(u.MustChangePassword),
        createdAt: u.CreatedAt,
        updatedAt: u.UpdatedAt
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/v1/users/:id:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST thêm tài khoản mới (Spec 3 - Mục 3.2–3.6 & Luồng 4.1) ─────────────────
router.post('/', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { username, fullName, email, phone, password, employeeCode, avatarUrl, roleId } = req.body;

    // 1. Validate username (Spec 3.2 & 5.2)
    if (!username || !String(username).trim()) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'username',
        message: 'Tên đăng nhập không được để trống'
      });
    }
    const cleanUsername = String(username).trim();
    if (cleanUsername.length < 4 || cleanUsername.length > 50) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'username',
        message: 'Tên đăng nhập phải có từ 4 đến 50 ký tự'
      });
    }
    // Chỉ gồm chữ cái không dấu, số và gạch dưới, bắt đầu bằng chữ hoặc gạch dưới
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanUsername)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'username',
        message: 'Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới'
      });
    }
    // Trùng lặp username (case-insensitive)
    const [dupUser] = await conn.query('SELECT UserId FROM Users WHERE LOWER(Username) = ?', [cleanUsername.toLowerCase()]);
    if (dupUser.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'username',
        message: 'Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác'
      });
    }

    // 2. Validate fullName (Spec 3.2 & 5.2)
    if (!fullName || !String(fullName).trim()) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'fullName',
        message: 'Họ và tên không được để trống'
      });
    }
    const cleanFullName = String(fullName).trim();
    if (cleanFullName.length < 2 || cleanFullName.length > 100) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'fullName',
        message: 'Họ và tên phải có từ 2 đến 100 ký tự'
      });
    }

    // 3. Validate email (Spec 3.4 & 5.2)
    if (!email || !String(email).trim()) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'email',
        message: 'Email không được để trống'
      });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'email',
        message: 'Email không đúng định dạng'
      });
    }
    const [dupEmail] = await conn.query('SELECT UserId FROM Users WHERE LOWER(Email) = ?', [cleanEmail]);
    if (dupEmail.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'email',
        message: 'Email đã được sử dụng, vui lòng chọn email khác'
      });
    }

    // 4. Validate phone (Spec 3.5 & 5.2 - không bắt buộc)
    let cleanPhone = null;
    if (phone && String(phone).trim()) {
      cleanPhone = String(phone).trim();
      // Đúng định dạng số điện thoại Việt Nam (10 chữ số bắt đầu bằng 0)
      if (!/^0[0-9]{9}$/.test(cleanPhone)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'phone',
          message: 'Số điện thoại không đúng định dạng'
        });
      }
      const [dupPhone] = await conn.query('SELECT UserId FROM Users WHERE Phone = ?', [cleanPhone]);
      if (dupPhone.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'phone',
          message: 'Số điện thoại đã được sử dụng, vui lòng chọn số khác'
        });
      }
    }

    // 5. Validate password (Spec 3.3 & 5.2 - bắt buộc khi tạo mới)
    if (!password) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'password',
        message: 'Mật khẩu không được để trống'
      });
    }
    // Độ dài 8-32, có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (password.length < 8 || password.length > 32 || !hasUpper || !hasLower || !hasDigit) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_PASSWORD_WEAK',
        field: 'password',
        message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số'
      });
    }

    // 6. Validate roleId (Spec 3.6 & 5.2 - 1 trong 4 vai trò cố định: 1 Admin, 2 Lễ tân, 3 Bếp, 4 Dọn phòng)
    const validRoleId = parseInt(roleId, 10);
    if (!validRoleId || ![1, 2, 3, 4].includes(validRoleId)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'roleId',
        message: 'Vui lòng chọn vai trò cho tài khoản'
      });
    }

    // 7. Validate employeeCode (nếu có nhập)
    let cleanEmpCode = null;
    if (employeeCode && String(employeeCode).trim()) {
      cleanEmpCode = String(employeeCode).trim();
      const [dupCode] = await conn.query('SELECT UserId FROM Users WHERE EmployeeCode = ?', [cleanEmpCode]);
      if (dupCode.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'employeeCode',
          message: 'Mã nhân viên đã được sử dụng, vui lòng chọn mã khác'
        });
      }
    }

    // Hash password bcrypt cost 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Map department mặc định theo vai trò
    const DEPT_MAP = {
      1: 'Quản Trị & Công Nghệ',
      2: 'Lễ Tân & Tiền Sảnh',
      3: 'Ẩm Thực F&B & Bếp',
      4: 'Buồng Phòng & Kỹ Thuật'
    };
    const dept = DEPT_MAP[validRoleId] || 'Lễ Tân & Tiền Sảnh';

    // Tạo bản ghi
    const [result] = await conn.query(
      `INSERT INTO Users (RoleId, Username, FullName, Email, Phone, EmployeeCode, AvatarUrl, PasswordHash, Department, Status, MustChangePassword, IsDeleted, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 0, 0, NOW(), NOW())`,
      [
        validRoleId,
        cleanUsername,
        cleanFullName,
        cleanEmail,
        cleanPhone,
        cleanEmpCode || null,
        avatarUrl || null,
        passwordHash,
        dept
      ]
    );

    const newId = result.insertId;
    if (!cleanEmpCode) {
      const autoCode = `NV-${String(newId).padStart(4, '0')}`;
      await conn.query('UPDATE Users SET EmployeeCode = ? WHERE UserId = ?', [autoCode, newId]);
      cleanEmpCode = autoCode;
    }

    await conn.commit();

    // Ghi AuditLog
    await writeAuditLog({
      userId: req.user.userId,
      actionType: 'CREATE',
      recordId: newId,
      newValues: {
        userId: newId,
        username: cleanUsername,
        fullName: cleanFullName,
        email: cleanEmail,
        roleId: validRoleId,
        status: 'Active'
      },
      req
    });

    const [roleInfo] = await pool.query('SELECT RoleName FROM Roles WHERE RoleId = ?', [validRoleId]);

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới tài khoản thành công',
      data: {
        userId: newId,
        id: cleanEmpCode,
        username: cleanUsername,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        employeeCode: cleanEmpCode,
        avatarUrl: avatarUrl || null,
        roleId: validRoleId,
        roleName: roleInfo[0]?.RoleName || 'Staff',
        status: 'Active'
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi POST /api/v1/users:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm tài khoản: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── PUT cập nhật tài khoản (Spec 3 - Luồng 4.2) ────────────────────────────────
router.put('/:id', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }

    // 1. Kiểm tra tồn tại và concurrency check
    const [exists] = await conn.query('SELECT * FROM Users WHERE UserId = ? AND IsDeleted = 0', [rawId]);
    if (exists.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa bởi người khác trước đó'
      });
    }
    const currentRecord = exists[0];

    const { fullName, email, phone, password, employeeCode, avatarUrl, roleId, status } = req.body;

    const updates = [];
    const params = [];

    // Validate fullName nếu có cập nhật
    if (fullName !== undefined) {
      const cleanFullName = String(fullName).trim();
      if (!cleanFullName) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'fullName',
          message: 'Họ và tên không được để trống'
        });
      }
      updates.push('FullName = ?');
      params.push(cleanFullName);
    }

    // Validate email nếu có cập nhật
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'email',
          message: 'Email không đúng định dạng'
        });
      }
      // Check trùng loại trừ chính mình
      const [dup] = await conn.query('SELECT UserId FROM Users WHERE LOWER(Email) = ? AND UserId != ?', [cleanEmail, rawId]);
      if (dup.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'email',
          message: 'Email đã được sử dụng, vui lòng chọn email khác'
        });
      }
      updates.push('Email = ?');
      params.push(cleanEmail);
    }

    // Validate phone nếu có cập nhật
    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (cleanPhone) {
        if (!/^0[0-9]{9}$/.test(cleanPhone)) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0004_INVALID_FORMAT',
            field: 'phone',
            message: 'Số điện thoại không đúng định dạng'
          });
        }
        const [dupPhone] = await conn.query('SELECT UserId FROM Users WHERE Phone = ? AND UserId != ?', [cleanPhone, rawId]);
        if (dupPhone.length > 0) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0007_DUPLICATE',
            field: 'phone',
            message: 'Số điện thoại đã được sử dụng, vui lòng chọn số khác'
          });
        }
        updates.push('Phone = ?');
        params.push(cleanPhone);
      } else {
        updates.push('Phone = NULL');
      }
    }

    // Validate password nếu có cập nhật (để trống là giữ nguyên mật khẩu cũ)
    if (password && String(password).trim()) {
      const p = String(password).trim();
      const hasUpper = /[A-Z]/.test(p);
      const hasLower = /[a-z]/.test(p);
      const hasDigit = /[0-9]/.test(p);
      if (p.length < 8 || p.length > 32 || !hasUpper || !hasLower || !hasDigit) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_PASSWORD_WEAK',
          field: 'password',
          message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số'
        });
      }
      const newHash = await bcrypt.hash(p, 10);
      updates.push('PasswordHash = ?');
      params.push(newHash);
    }

    // Validate employeeCode nếu có cập nhật
    if (employeeCode !== undefined && String(employeeCode).trim()) {
      const cleanCode = String(employeeCode).trim();
      const [dupCode] = await conn.query('SELECT UserId FROM Users WHERE EmployeeCode = ? AND UserId != ?', [cleanCode, rawId]);
      if (dupCode.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'employeeCode',
          message: 'Mã nhân viên đã được sử dụng, vui lòng chọn mã khác'
        });
      }
      updates.push('EmployeeCode = ?');
      params.push(cleanCode);
    }

    // Validate avatarUrl
    if (avatarUrl !== undefined) {
      updates.push('AvatarUrl = ?');
      params.push(avatarUrl);
    }

    // Validate roleId
    if (roleId !== undefined) {
      const rId = parseInt(roleId, 10);
      if (![1, 2, 3, 4].includes(rId)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'roleId',
          message: 'Vui lòng chọn vai trò cho tài khoản'
        });
      }
      updates.push('RoleId = ?');
      params.push(rId);
    }

    // Validate status
    if (status !== undefined) {
      const st = (status === 'Active' || status === 'hoat_dong') ? 'Active' : 'Locked';
      if (st === 'Locked') {
        // Quy tắc 3.7: Không tự khóa chính mình
        if (req.user.userId === rawId) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0016_CANNOT_SELF_LOCK',
            message: 'Bạn không thể khóa chính tài khoản đang đăng nhập'
          });
        }
        // Quy tắc 3.7: Không khóa Admin cuối cùng
        if (currentRecord.RoleId === 1) {
          const [[{ activeAdmins }]] = await conn.query(
            "SELECT COUNT(*) as activeAdmins FROM Users WHERE RoleId = 1 AND Status = 'Active' AND IsDeleted = 0"
          );
          if (activeAdmins <= 1) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              code: 'ERROR_0017_LAST_ADMIN_REQUIRED',
              message: 'Không thể thực hiện vì hệ thống phải còn ít nhất 1 quản trị viên đang hoạt động'
            });
          }
        }
      }
      updates.push('Status = ?');
      params.push(st);
    }

    updates.push('UpdatedAt = NOW()');
    params.push(rawId);

    await conn.query(`UPDATE Users SET ${updates.join(', ')} WHERE UserId = ?`, params);
    await conn.commit();

    // Ghi AuditLog
    await writeAuditLog({
      userId: req.user.userId,
      actionType: 'UPDATE',
      recordId: rawId,
      oldValues: {
        fullName: currentRecord.FullName,
        email: currentRecord.Email,
        roleId: currentRecord.RoleId,
        status: currentRecord.Status
      },
      newValues: { fullName, email, roleId, status },
      req
    });

    return res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật tài khoản thành công',
      data: { userId: rawId }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi PUT /api/v1/users/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật tài khoản: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── PATCH khóa / mở khóa tài khoản (Spec 3 - Luồng 4.3) ────────────────────────
// PATCH /api/v1/users/:id/status
router.patch('/:id/status', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    const { status } = req.body;

    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }

    const [exists] = await pool.query('SELECT * FROM Users WHERE UserId = ? AND IsDeleted = 0', [rawId]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa' });
    }
    const targetUser = exists[0];

    const nextStatus = (status === 'Active' || status === 'hoat_dong') ? 'Active' : 'Locked';

    // Khi thao tác Khóa (Active -> Locked)
    if (nextStatus === 'Locked') {
      // 1. Tự khóa chính mình (Spec 3.7 & 5.2)
      if (req.user.userId === rawId) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0016_CANNOT_SELF_LOCK',
          message: 'Bạn không thể khóa chính tài khoản đang đăng nhập'
        });
      }

      // 2. Khóa Admin Active cuối cùng (Spec 3.7 & 5.2)
      if (targetUser.RoleId === 1) {
        const [[{ activeAdmins }]] = await pool.query(
          "SELECT COUNT(*) as activeAdmins FROM Users WHERE RoleId = 1 AND Status = 'Active' AND IsDeleted = 0"
        );
        if (activeAdmins <= 1) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0017_LAST_ADMIN_REQUIRED',
            message: 'Không thể thực hiện vì hệ thống phải còn ít nhất 1 quản trị viên đang hoạt động'
          });
        }
      }
    }

    await pool.query('UPDATE Users SET Status = ?, UpdatedAt = NOW() WHERE UserId = ?', [nextStatus, rawId]);

    // Ghi AuditLog
    await writeAuditLog({
      userId: req.user.userId,
      actionType: nextStatus === 'Locked' ? 'LOCK' : 'UNLOCK',
      recordId: rawId,
      oldValues: { status: targetUser.Status },
      newValues: { status: nextStatus },
      req
    });

    const msg = nextStatus === 'Active' ? 'Cập nhật tài khoản thành công' : 'Đã khóa tài khoản thành công';
    return res.json({
      success: true,
      message: msg,
      data: { userId: rawId, status: nextStatus }
    });
  } catch (err) {
    console.error('Lỗi PATCH /api/v1/users/:id/status:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── POST đặt lại mật khẩu ngẫu nhiên (Spec 3 - Luồng 4.4) ──────────────────────
// POST /api/v1/users/:id/reset-password
router.post('/:id/reset-password', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }

    const [exists] = await pool.query('SELECT UserId, FullName, Email, Username FROM Users WHERE UserId = ? AND IsDeleted = 0', [rawId]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa' });
    }

    // Sinh mật khẩu tạm ngẫu nhiên 10 ký tự
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Cập nhật vào DB và đánh dấu mustChangePassword = 1 (Spec 3.3)
    await pool.query(
      'UPDATE Users SET PasswordHash = ?, MustChangePassword = 1, UpdatedAt = NOW() WHERE UserId = ?',
      [passwordHash, rawId]
    );

    // Ghi AuditLog (tuyệt đối không log mật khẩu plaintext dù là tạm)
    await writeAuditLog({
      userId: req.user.userId,
      actionType: 'RESET_PASSWORD',
      recordId: rawId,
      newValues: { mustChangePassword: true },
      req
    });

    return res.json({
      success: true,
      temporaryPassword: tempPassword,
      message: 'Đặt lại mật khẩu thành công. Mật khẩu tạm thời chỉ hiển thị 1 lần duy nhất cho quản trị viên sao chép.'
    });
  } catch (err) {
    console.error('Lỗi POST /api/v1/users/:id/reset-password:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── DELETE xóa mềm tài khoản (Spec 3 - Luồng 4.5 & Quy tắc 3.9) ────────────────
// DELETE /api/v1/users/:id
router.delete('/:id', verifyToken, requirePermission('USER_MANAGE'), async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }

    const [exists] = await pool.query('SELECT * FROM Users WHERE UserId = ? AND IsDeleted = 0', [rawId]);
    if (exists.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa' });
    }
    const targetUser = exists[0];

    // 1. Tự xóa chính mình (Spec 3.9 & 5.2 - ERROR_0018_CANNOT_SELF_DELETE)
    if (req.user.userId === rawId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0018_CANNOT_SELF_DELETE',
        message: 'Bạn không thể xóa chính tài khoản đang đăng nhập'
      });
    }

    // 2. Xóa Admin Active cuối cùng (Spec 3.9 & 5.2 - ERROR_0017_LAST_ADMIN_REQUIRED)
    if (targetUser.RoleId === 1) {
      const [[{ activeAdmins }]] = await pool.query(
        "SELECT COUNT(*) as activeAdmins FROM Users WHERE RoleId = 1 AND Status = 'Active' AND IsDeleted = 0"
      );
      if (activeAdmins <= 1) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0017_LAST_ADMIN_REQUIRED',
          message: 'Không thể thực hiện vì hệ thống phải còn ít nhất 1 quản trị viên đang hoạt động'
        });
      }
    }

    // 3. Kiểm tra dữ liệu nghiệp vụ liên quan còn hiệu lực (Spec 3.9 & 5.2 - ERROR_0015_HAS_RELATED_DATA)
    let relatedCount = 0;

    // Kiểm tra Bookings đang hoạt động do nhân viên này phụ trách/xử lý
    try {
      const [[{ bookingCount }]] = await pool.query(
        `SELECT COUNT(*) as bookingCount FROM Bookings 
         WHERE (StaffId = ? OR CreatedBy = ? OR AssignedStaffId = ?) 
         AND BookingStatus IN ('Pending', 'Confirmed', 'CheckedIn')`,
        [rawId, rawId, rawId]
      );
      relatedCount += (bookingCount || 0);
    } catch (_) {}

    // Kiểm tra Stays đang hoạt động
    try {
      const [[{ stayCount }]] = await pool.query(
        `SELECT COUNT(*) as stayCount FROM Stays 
         WHERE StaffId = ? AND Status = 'CheckedIn'`,
        [rawId]
      );
      relatedCount += (stayCount || 0);
    } catch (_) {}

    // Kiểm tra Housekeeping Assignments chưa hoàn tất
    try {
      const [[{ hkCount }]] = await pool.query(
        `SELECT COUNT(*) as hkCount FROM HousekeepingAssignments 
         WHERE StaffId = ? AND Status IN ('Assigned', 'InProgress')`,
        [rawId]
      );
      relatedCount += (hkCount || 0);
    } catch (_) {}

    if (relatedCount > 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_HAS_RELATED_DATA',
        relatedCount,
        message: 'Không thể xóa tài khoản vì vẫn còn dữ liệu nghiệp vụ liên quan'
      });
    }

    // 4. Thực hiện xóa mềm (Soft delete)
    await pool.query(
      "UPDATE Users SET IsDeleted = 1, Status = 'Locked', UpdatedAt = NOW() WHERE UserId = ?",
      [rawId]
    );

    // Ghi AuditLog
    await writeAuditLog({
      userId: req.user.userId,
      actionType: 'DELETE',
      recordId: rawId,
      oldValues: { isDeleted: 0, status: targetUser.Status },
      newValues: { isDeleted: 1, status: 'Locked' },
      req
    });

    return res.json({
      success: true,
      code: 'SUCCESS_0003_DELETED',
      message: 'Xóa tài khoản thành công',
      data: { userId: rawId }
    });
  } catch (err) {
    console.error('Lỗi DELETE /api/v1/users/:id:', err.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa tài khoản: ' + err.message });
  }
});

module.exports = router;
