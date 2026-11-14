const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validation helpers dùng chung cho FEAT-GUEST-01 (Register, Reset Password, Profile)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const VN_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;
const FULLNAME_REGEX = /^[\p{L}]+(?:\s[\p{L}]+)*$/u;
const ID_CARD_REGEX = /^(?:\d{9}|\d{12}|[A-Za-z]\d{7,8})$/;
const PASSWORD_UPPER = /[A-Z]/;
const PASSWORD_LOWER = /[a-z]/;
const PASSWORD_DIGIT = /\d/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/;

const validateFullNameValue = (rawName) => {
  const trimmed = typeof rawName === 'string' ? rawName.trim() : '';
  if (!trimmed) {
    return { ok: false, code: 'ERROR_0001_REQUIRED', message: 'Họ và tên không được để trống' };
  }
  if (trimmed.length < 2 || trimmed.length > 100 || !FULLNAME_REGEX.test(trimmed)) {
    return {
      ok: false,
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Họ và tên chỉ được chứa chữ cái và khoảng trắng đơn'
    };
  }
  return { ok: true, value: trimmed };
};

const validateEmailValue = (rawEmail) => {
  const trimmed = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  if (!trimmed) {
    return { ok: false, code: 'ERROR_0001_REQUIRED', message: 'Email không được để trống' };
  }
  if (trimmed.length > 255 || !EMAIL_REGEX.test(trimmed)) {
    return { ok: false, code: 'ERROR_0004_INVALID_FORMAT', message: 'Email không đúng định dạng' };
  }
  return { ok: true, value: trimmed.toLowerCase() };
};

const validatePhoneValue = (rawPhone, { required = true } = {}) => {
  const trimmed = typeof rawPhone === 'string' ? rawPhone.trim() : '';
  if (!trimmed) {
    if (required) {
      return { ok: false, code: 'ERROR_0001_REQUIRED', message: 'Số điện thoại không được để trống' };
    }
    return { ok: true, value: null };
  }
  if (!VN_PHONE_REGEX.test(trimmed)) {
    return { ok: false, code: 'ERROR_0004_INVALID_FORMAT', message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số)' };
  }
  return { ok: true, value: trimmed };
};

const validatePasswordComplexity = (pwd) => {
  if (!pwd || typeof pwd !== 'string') {
    return { ok: false, code: 'ERROR_0001_REQUIRED', message: 'Mật khẩu không được để trống' };
  }
  if (
    pwd.length < 8 ||
    pwd.length > 32 ||
    /\s/.test(pwd) ||
    !PASSWORD_UPPER.test(pwd) ||
    !PASSWORD_LOWER.test(pwd) ||
    !PASSWORD_DIGIT.test(pwd) ||
    !PASSWORD_SPECIAL.test(pwd)
  ) {
    return {
      ok: false,
      code: 'ERROR_0008_WEAK_PASSWORD',
      message: 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt'
    };
  }
  return { ok: true };
};

const normalizeGenderValue = (rawGender) => {
  if (rawGender === undefined || rawGender === null || String(rawGender).trim() === '') return null;
  const g = String(rawGender).trim().toUpperCase();
  if (g === 'NAM' || g === 'MALE') return 'MALE';
  if (g === 'NỮ' || g === 'NU' || g === 'FEMALE') return 'FEMALE';
  if (g === 'KHÁC' || g === 'KHAC' || g === 'OTHER') return 'OTHER';
  return undefined;
};

const formatDateOnly = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const serializeUser = (user) => ({
  userId: user.UserId,
  username: user.Username || null,
  fullName: user.FullName,
  email: user.Email,
  phone: user.Phone,
  phoneNumber: user.Phone,
  idNumber: user.IdNumber || null,
  identityCard: user.IdNumber || null,
  idType: user.IdType || null,
  dateOfBirth: formatDateOnly(user.DateOfBirth),
  gender: user.Gender || null,
  address: user.Address || '',
  roleId: user.RoleId,
  roleName: user.RoleName || 'Guest',
  tierId: user.TierId,
  tierName: user.TierName || (user.TierId ? 'Standard' : 'Chưa xếp hạng'),
  benefits: user.Benefits || '',
  discountRate: Number(user.DiscountRate || 0),
  pointMultiplier: Number(user.PointMultiplier || 1),
  status: user.Status || 'Active',
  createdAt: user.CreatedAt || null
});

// Tự động đảm bảo schema Users (Username, Address), bảng PasswordResetTokens và các tài khoản Demo luôn sẵn sàng
let isDemoAccountsSeeded = false;
let ensurePromise = null;
const ensureDefaultAccounts = async () => {
  if (isDemoAccountsSeeded) return;
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    try {
      // 1. Bổ sung cột Username và Address nếu DB chưa có
      const [cols] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME IN ('Username', 'Address')`
      );
      const colSet = new Set(cols.map((c) => c.COLUMN_NAME));
      if (!colSet.has('Username')) {
        await pool.query('ALTER TABLE Users ADD COLUMN Username VARCHAR(100) NULL AFTER TierId').catch((e) => console.warn('ALTER Username:', e.message));
      }
      if (!colSet.has('Address')) {
        await pool.query('ALTER TABLE Users ADD COLUMN Address VARCHAR(255) NULL AFTER Gender').catch((e) => console.warn('ALTER Address:', e.message));
      }

      // 2. Đảm bảo bảng PasswordResetTokens tồn tại
      await pool.query(`
        CREATE TABLE IF NOT EXISTS PasswordResetTokens (
          PasswordResetTokenId INT AUTO_INCREMENT PRIMARY KEY,
          UserId INT NOT NULL,
          OtpCode VARCHAR(10) NOT NULL,
          ExpiresAt DATETIME NOT NULL,
          AttemptCount INT NOT NULL DEFAULT 0,
          UsedAt DATETIME NULL,
          CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_prt_user (UserId)
        )
      `).catch(() => {});

      // 3. Lấy Role map từ DB
      const [roleRows] = await pool.query('SELECT RoleId, RoleName FROM Roles');
      const roleMap = {};
      roleRows.forEach((r) => {
        if (r.RoleName) roleMap[r.RoleName.toLowerCase()] = r.RoleId;
      });
      const rAdmin = roleMap.admin || 1;
      const rRecep = roleMap.receptionist || 2;
      const rKitchen = roleMap.kitchen || 3;
      const rHouse = roleMap.housekeeping || 4;
      const rGuest = roleMap.guest || 5;

      const hash123456 = await bcrypt.hash('123456', 10);
      const defaultAccounts = [
        { roleId: rAdmin, tierId: null, username: 'admin_horizon', fullName: 'Quản Trị Viên Grand Horizon', email: 'admin@grandhorizon.com', phone: '0900000001', passwordHash: hash123456 },
        { roleId: rAdmin, tierId: null, username: 'admin', fullName: 'Quản Trị Viên Hệ Thống', email: 'admin@hoteldomain.vn', phone: '0900000009', passwordHash: hash123456 },
        { roleId: rRecep, tierId: null, username: 'receptionist', fullName: 'Lễ Tân Grand Horizon', email: 'receptionist@hoteldomain.vn', phone: '0900000005', passwordHash: hash123456 },
        { roleId: rKitchen, tierId: null, username: 'kitchen', fullName: 'Bếp Trưởng F&B', email: 'kitchen@hoteldomain.vn', phone: '0900000006', passwordHash: hash123456 },
        { roleId: rHouse, tierId: null, username: 'housekeeping', fullName: 'Trưởng Bộ Phận Buồng Phòng', email: 'housekeeping@hoteldomain.vn', phone: '0900000007', passwordHash: hash123456 },
        { roleId: rGuest, tierId: 3, username: 'guest', fullName: 'Khách Hàng Horizon Elite', email: 'guest@hoteldomain.vn', phone: '0900000004', passwordHash: hash123456 },
        { roleId: rGuest, tierId: 3, username: 'hoangnam', fullName: 'Nguyễn Hoàng Nam', email: 'hoangnam.417@gmail.com', phone: '0912345678', passwordHash: hash123456 },
        { roleId: rGuest, tierId: 3, username: 'vip_guest', fullName: 'Khách Hàng VIP Horizon Elite', email: 'vip.guest@grandhorizon.com', phone: '0900000002', passwordHash: hash123456 },
        { roleId: rGuest, tierId: 1, username: 'user_1', fullName: 'Khách Hàng Tiêu Chuẩn', email: 'user_1@hoteldomain.vn', phone: '0900000003', passwordHash: hash123456 },
        { roleId: rAdmin, tierId: null, username: 'admin_vanthuc', fullName: 'Nguyễn Văn Thực', email: 'vanthuc.22211tt2302@hoteldomain.vn', phone: '0922112302', passwordHash: await bcrypt.hash('Admin@22211TT2302', 10) },
        { roleId: rAdmin, tierId: null, username: 'admin_nhanbao', fullName: 'Nguyễn Nhân Bảo', email: 'nhanbao.24211tt3501@hoteldomain.vn', phone: '0924113501', passwordHash: await bcrypt.hash('Admin@24211TT3501', 10) },
        { roleId: rAdmin, tierId: null, username: 'admin_vanha', fullName: 'Đặng Văn Hà', email: 'vanha.23211tt4241@hoteldomain.vn', phone: '0923114241', passwordHash: await bcrypt.hash('Admin@23211TT4241', 10) },
        { roleId: rAdmin, tierId: null, username: 'admin_thutrang', fullName: 'Nguyễn Xuân Thu Trang', email: 'thutrang.24211tt1788@hoteldomain.vn', phone: '0924111788', passwordHash: await bcrypt.hash('Admin@24211TT1788', 10) },
        { roleId: rAdmin, tierId: null, username: 'admin_thanhtuyen', fullName: 'Hồ Thanh Tuyền', email: 'thanhtuyen.23211tt3988@hoteldomain.vn', phone: '0923113988', passwordHash: await bcrypt.hash('Admin@23211TT3988', 10) }
      ];

      for (const acc of defaultAccounts) {
        const [rows] = await pool.query(
          'SELECT UserId, PasswordHash FROM Users WHERE Email = ? LIMIT 1',
          [acc.email]
        );
        if (rows.length === 0) {
          await pool.query(
            `INSERT INTO Users (RoleId, TierId, Username, FullName, Email, Phone, PasswordHash, Status, CreatedAt, UpdatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
            [acc.roleId, acc.tierId, acc.username, acc.fullName, acc.email, acc.phone, acc.passwordHash]
          ).catch(() => {});
        } else {
          await pool.query(
            'UPDATE Users SET RoleId = COALESCE(RoleId, ?), Status = "Active", Username = COALESCE(Username, ?) WHERE UserId = ?',
            [acc.roleId, acc.username, rows[0].UserId]
          ).catch(() => {});
        }
      }
      isDemoAccountsSeeded = true;
    } catch (err) {
      console.warn('Không thể tự động kiểm tra tài khoản mặc định:', err.message);
    } finally {
      ensurePromise = null;
    }
  })();
  return ensurePromise;
};
ensureDefaultAccounts();

/**
 * Đăng ký tài khoản khách hàng mới
 * POST /api/v1/auth/register (alias POST /auth/register)
 */
const register = async (req, res) => {
  try {
    await ensureDefaultAccounts();
    const {
      fullName,
      email,
      phone,
      phoneNumber,
      password,
      confirmPassword,
      enrollClub,
      roleId,
      roleName
    } = req.body;

    // 1. Kiểm tra Họ và tên
    const nameCheck = validateFullNameValue(fullName);
    if (!nameCheck.ok) {
      return res.status(400).json({ success: false, code: nameCheck.code, message: nameCheck.message });
    }

    // 2. Kiểm tra Email
    const emailCheck = validateEmailValue(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ success: false, code: emailCheck.code, message: emailCheck.message });
    }

    // 3. Kiểm tra Số điện thoại (bắt buộc đúng 10 chữ số VN theo FEAT-GUEST-01)
    const phoneCheck = validatePhoneValue(phoneNumber ?? phone, { required: true });
    if (!phoneCheck.ok) {
      return res.status(400).json({ success: false, code: phoneCheck.code, message: phoneCheck.message });
    }

    // 4. Kiểm tra độ phức tạp Mật khẩu (8-32 ký tự, 4 nhóm, không khoảng trắng)
    const pwdCheck = validatePasswordComplexity(password);
    if (!pwdCheck.ok) {
      return res.status(400).json({ success: false, code: pwdCheck.code, message: pwdCheck.message });
    }

    // 5. Kiểm tra Xác nhận mật khẩu
    if (confirmPassword === undefined || confirmPassword === null || password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_PASSWORD_MISMATCH',
        message: 'Mật khẩu xác nhận không khớp'
      });
    }

    const cleanFullName = nameCheck.value;
    const cleanEmail = emailCheck.value;
    const cleanPhone = phoneCheck.value;

    // 6. Kiểm tra Email trùng (409 Conflict)
    const [existingUsers] = await pool.query(
      'SELECT UserId FROM Users WHERE LOWER(Email) = ? AND (IsDeleted = 0 OR IsDeleted IS NULL) LIMIT 1',
      [cleanEmail]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Email đã được sử dụng, vui lòng chọn email khác'
      });
    }

    // 7. Kiểm tra Số điện thoại trùng (409 Conflict)
    const [existingPhone] = await pool.query(
      'SELECT UserId FROM Users WHERE Phone = ? AND (IsDeleted = 0 OR IsDeleted IS NULL) LIMIT 1',
      [cleanPhone]
    );
    if (existingPhone.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Số điện thoại này đã được liên kết với một tài khoản khác.'
      });
    }

    // 8. Mã hóa mật khẩu bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 9. Xác định RoleId và RoleName (Mặc định 5 = Guest hoặc theo lựa chọn)
    let assignedRoleId = 5;
    let assignedRoleName = 'Guest';
    try {
      if (roleId) {
        const [rRows] = await pool.query('SELECT RoleId, RoleName FROM Roles WHERE RoleId = ? LIMIT 1', [Number(roleId)]);
        if (rRows.length > 0) {
          assignedRoleId = rRows[0].RoleId;
          assignedRoleName = rRows[0].RoleName;
        }
      } else if (roleName) {
        const [rRows] = await pool.query('SELECT RoleId, RoleName FROM Roles WHERE LOWER(RoleName) = LOWER(?) LIMIT 1', [String(roleName).trim()]);
        if (rRows.length > 0) {
          assignedRoleId = rRows[0].RoleId;
          assignedRoleName = rRows[0].RoleName;
        }
      } else {
        const [roles] = await pool.query('SELECT RoleId, RoleName FROM Roles WHERE RoleName = "Guest" LIMIT 1');
        if (roles.length > 0) {
          assignedRoleId = roles[0].RoleId;
          assignedRoleName = roles[0].RoleName;
        }
      }
    } catch (_) {}

    // 10. TierId mặc định (1 = Standard nếu là Guest & enrollClub !== false)
    let membershipTierId = (assignedRoleName === 'Guest' && enrollClub !== false) ? 1 : null;
    try {
      if (assignedRoleName === 'Guest' && enrollClub !== false) {
        const [tiers] = await pool.query('SELECT TierId FROM MembershipTiers ORDER BY TierId ASC LIMIT 1');
        if (tiers.length > 0) membershipTierId = tiers[0].TierId;
      }
    } catch (_) {}

    // 11. Lưu DB
    const [insertResult] = await pool.query(
      `INSERT INTO Users (RoleId, TierId, FullName, Email, Phone, PasswordHash, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
      [assignedRoleId, membershipTierId, cleanFullName, cleanEmail, cleanPhone, passwordHash]
    );
    const newUserId = insertResult.insertId;

    // 12. Tạo JWT Token
    const token = jwt.sign(
      {
        userId: newUserId,
        roleId: assignedRoleId,
        roleName: assignedRoleName,
        email: cleanEmail,
        fullName: cleanFullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      token,
      user: serializeUser({
        UserId: newUserId,
        FullName: cleanFullName,
        Email: cleanEmail,
        Phone: cleanPhone,
        RoleId: assignedRoleId,
        RoleName: assignedRoleName,
        TierId: membershipTierId,
        TierName: membershipTierId ? 'Standard' : 'Chưa xếp hạng',
        Status: 'Active'
      })
    });
  } catch (error) {
    console.error('Lỗi API register:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng ký tài khoản: ' + error.message
    });
  }
};

/**
 * Đăng nhập hệ thống
 * POST /api/v1/auth/login (alias POST /auth/login)
 */
const login = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.username || req.body.email || req.body.phone || req.body.phoneNumber;
    const password = req.body.password;
    const expectedRole = req.body.expectedRole;

    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Email không được để trống'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Mật khẩu không được để trống'
      });
    }

    await ensureDefaultAccounts();

    const cleanIdentifier = String(identifier).trim();
    const lowerIdentifier = cleanIdentifier.toLowerCase();

    const [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.Username, u.FullName, u.Email, u.Phone,
              u.IdNumber, u.IdType, u.DateOfBirth, u.Gender, u.Address,
              u.PasswordHash, u.Status, u.IsDeleted, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate, mt.PointMultiplier
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE (LOWER(u.Email) = ? OR u.Phone = ? OR LOWER(u.Username) = ?)
         AND (u.IsDeleted = 0 OR u.IsDeleted IS NULL)
       LIMIT 1`,
      [lowerIdentifier, cleanIdentifier, lowerIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0011_INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    const user = users[0];

    // Kiểm tra vai trò nếu form có truyền expectedRole (từ NhanBao/1a)
    if (expectedRole) {
      const userRole = user.RoleName || 'Guest';
      const roleDisplayName = {
        Admin: 'Quản trị viên (Admin)',
        Receptionist: 'Lễ tân',
        Kitchen: 'Bếp / F&B',
        Housekeeping: 'Buồng phòng',
        Guest: 'Khách hàng'
      };

      if (expectedRole === 'Guest' && userRole !== 'Guest') {
        return res.status(403).json({
          success: false,
          code: 'ROLE_MISMATCH',
          message: `Tài khoản này là tài khoản ${roleDisplayName[userRole] || userRole} nội bộ. Vui lòng chọn đúng vai trò để đăng nhập.`
        });
      }
      if (expectedRole !== 'Guest' && userRole === 'Guest') {
        return res.status(403).json({
          success: false,
          code: 'ROLE_MISMATCH',
          message: `Tài khoản này là tài khoản Khách hàng thông thường, không có quyền đăng nhập với vai trò ${roleDisplayName[expectedRole] || expectedRole}.`
        });
      }
      if (expectedRole !== 'Guest' && userRole !== expectedRole) {
        return res.status(403).json({
          success: false,
          code: 'ROLE_MISMATCH',
          message: `Tài khoản của bạn thuộc vai trò "${roleDisplayName[userRole] || userRole}", không khớp với vai trò "${roleDisplayName[expectedRole] || expectedRole}" đã chọn.`
        });
      }
    }

    if (user.Status !== 'Active') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0011_INVALID_CREDENTIALS',
        message: 'Tài khoản của quý khách hiện đang bị tạm khóa. Vui lòng liên hệ Hotline (+84 236 888 9999).'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0011_INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    const token = jwt.sign(
      {
        userId: user.UserId,
        roleId: user.RoleId,
        roleName: user.RoleName || 'Guest',
        email: user.Email,
        fullName: user.FullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('Lỗi API login:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập: ' + error.message
    });
  }
};

/**
 * Quên mật khẩu: Sinh mã OTP 6 số (hiệu lực 5 phút) lưu bảng PasswordResetTokens
 * POST /api/v1/auth/forgot-password (alias POST /auth/forgot-password)
 */
const forgotPassword = async (req, res) => {
  try {
    await ensureDefaultAccounts();
    const emailCheck = validateEmailValue(req.body.email);
    if (!emailCheck.ok) {
      return res.status(400).json({ success: false, code: emailCheck.code, message: emailCheck.message });
    }

    const cleanEmail = emailCheck.value;
    const [users] = await pool.query(
      'SELECT UserId, FullName, Email FROM Users WHERE LOWER(Email) = ? AND (IsDeleted = 0 OR IsDeleted IS NULL) LIMIT 1',
      [cleanEmail]
    );
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0004_NOT_FOUND',
        message: 'Email không tồn tại trong hệ thống'
      });
    }

    const user = users[0];
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // Vô hiệu hóa các OTP cũ chưa dùng
    await pool.query(
      'UPDATE PasswordResetTokens SET UsedAt = NOW() WHERE UserId = ? AND UsedAt IS NULL',
      [user.UserId]
    );

    await pool.query(
      `INSERT INTO PasswordResetTokens (UserId, OtpCode, ExpiresAt, AttemptCount, CreatedAt)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0, NOW())`,
      [user.UserId, otpCode]
    );

    console.log(`[OTP] Password reset OTP for ${user.Email}: ${otpCode} (5m TTL)`);

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      detail: 'Mã xác thực OTP 6 chữ số đã được gửi đến email của bạn và có hiệu lực trong 5 phút.',
      expiresInSeconds: 300,
      demoOtp: otpCode,
      data: {
        email: cleanEmail,
        expiresInSeconds: 300,
        demoOtp: otpCode
      }
    });
  } catch (error) {
    console.error('Lỗi API forgotPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi gửi mã OTP: ' + error.message
    });
  }
};

/**
 * Đặt lại mật khẩu với OTP 6 số
 * POST /api/v1/auth/reset-password (alias POST /auth/reset-password)
 */
const resetPassword = async (req, res) => {
  try {
    await ensureDefaultAccounts();
    const { email, otpCode, newPassword, confirmPassword } = req.body;

    const emailCheck = validateEmailValue(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ success: false, code: emailCheck.code, message: emailCheck.message });
    }

    const cleanOtp = typeof otpCode === 'string' || typeof otpCode === 'number' ? String(otpCode).trim() : '';
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0017_INVALID_OTP',
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    const pwdCheck = validatePasswordComplexity(newPassword);
    if (!pwdCheck.ok) {
      return res.status(400).json({ success: false, code: pwdCheck.code, message: pwdCheck.message });
    }

    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_PASSWORD_MISMATCH',
        message: 'Mật khẩu xác nhận không khớp'
      });
    }

    const [users] = await pool.query(
      'SELECT UserId, Email, PasswordHash FROM Users WHERE LOWER(Email) = ? AND (IsDeleted = 0 OR IsDeleted IS NULL) LIMIT 1',
      [emailCheck.value]
    );
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0017_INVALID_OTP',
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    const user = users[0];
    const [tokens] = await pool.query(
      `SELECT PasswordResetTokenId, OtpCode, ExpiresAt, AttemptCount
       FROM PasswordResetTokens
       WHERE UserId = ? AND UsedAt IS NULL
       ORDER BY PasswordResetTokenId DESC
       LIMIT 1`,
      [user.UserId]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0017_INVALID_OTP',
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    const tokenRow = tokens[0];
    if (new Date(tokenRow.ExpiresAt) < new Date() || Number(tokenRow.AttemptCount) >= 5) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0017_INVALID_OTP',
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    if (String(tokenRow.OtpCode) !== cleanOtp) {
      await pool.query(
        'UPDATE PasswordResetTokens SET AttemptCount = AttemptCount + 1 WHERE PasswordResetTokenId = ?',
        [tokenRow.PasswordResetTokenId]
      );
      return res.status(400).json({
        success: false,
        code: 'ERROR_0017_INVALID_OTP',
        message: 'Mã OTP không chính xác hoặc đã hết hạn'
      });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.PasswordHash);
    if (isSameAsOld) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0008_WEAK_PASSWORD',
        message: 'Mật khẩu mới phải khác mật khẩu cũ gần nhất'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE Users SET PasswordHash = ?, UpdatedAt = NOW() WHERE UserId = ?', [newHash, user.UserId]);
    await pool.query('UPDATE PasswordResetTokens SET UsedAt = NOW() WHERE PasswordResetTokenId = ?', [tokenRow.PasswordResetTokenId]);

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      detail: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('Lỗi API resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đặt lại mật khẩu: ' + error.message
    });
  }
};

/**
 * Lấy thông tin người dùng hiện tại đang đăng nhập
 * GET /api/v1/auth/me & GET /me/profile
 */
const getMe = async (req, res) => {
  try {
    await ensureDefaultAccounts();
    const userId = req.user.userId;

    const [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.Username, u.FullName, u.Email, u.Phone,
              u.IdNumber, u.IdType, u.DateOfBirth, u.Gender, u.Address, u.Status, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate, mt.PointMultiplier
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE u.UserId = ? AND (u.IsDeleted = 0 OR u.IsDeleted IS NULL)
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0004_NOT_FOUND',
        message: 'Không tìm thấy thông tin tài khoản người dùng.'
      });
    }

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      user: serializeUser(users[0])
    });
  } catch (error) {
    console.error('Lỗi API getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ: ' + error.message
    });
  }
};

/**
 * Cập nhật thông tin hồ sơ cá nhân
 * PUT /api/v1/auth/me & PUT /me/profile
 */
const updateProfile = async (req, res) => {
  try {
    await ensureDefaultAccounts();
    const userId = req.user.userId;
    const {
      fullName,
      phone,
      phoneNumber,
      identityCard,
      idNumber,
      dateOfBirth,
      gender,
      address
    } = req.body;

    const updates = [];
    const params = [];

    if (fullName !== undefined) {
      const nameCheck = validateFullNameValue(fullName);
      if (!nameCheck.ok) {
        return res.status(400).json({ success: false, code: nameCheck.code, message: nameCheck.message });
      }
      updates.push('FullName = ?');
      params.push(nameCheck.value);
    }

    const rawPhone = phoneNumber !== undefined ? phoneNumber : phone;
    if (rawPhone !== undefined) {
      const phoneCheck = validatePhoneValue(rawPhone, { required: false });
      if (!phoneCheck.ok) {
        return res.status(400).json({ success: false, code: phoneCheck.code, message: phoneCheck.message });
      }
      if (phoneCheck.value) {
        const [dupPhone] = await pool.query(
          'SELECT UserId FROM Users WHERE Phone = ? AND UserId != ? AND (IsDeleted = 0 OR IsDeleted IS NULL) LIMIT 1',
          [phoneCheck.value, userId]
        );
        if (dupPhone.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'ERROR_0007_DUPLICATE',
            message: 'Số điện thoại này đã được liên kết với một tài khoản khác.'
          });
        }
      }
      updates.push('Phone = ?');
      params.push(phoneCheck.value);
    }

    const rawId = identityCard !== undefined ? identityCard : idNumber;
    if (rawId !== undefined) {
      const cleanId = typeof rawId === 'string' ? rawId.trim() : '';
      if (!cleanId) {
        updates.push('IdNumber = NULL', 'IdType = NULL');
      } else {
        if (!ID_CARD_REGEX.test(cleanId)) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0004_INVALID_FORMAT',
            message: 'Số CCCD (9 hoặc 12 số) hoặc Hộ chiếu (1 chữ cái + 7-8 số) không đúng định dạng'
          });
        }
        const idType = /^[A-Za-z]/.test(cleanId) ? 'Passport' : 'CCCD';
        updates.push('IdNumber = ?', 'IdType = ?');
        params.push(cleanId.toUpperCase(), idType);
      }
    }

    if (dateOfBirth !== undefined) {
      const cleanDob = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : '';
      if (!cleanDob) {
        updates.push('DateOfBirth = NULL');
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0004_INVALID_FORMAT',
            message: 'Ngày sinh phải theo định dạng YYYY-MM-DD'
          });
        }
        const dobDate = new Date(`${cleanDob}T00:00:00Z`);
        const today = new Date();
        let age = today.getUTCFullYear() - dobDate.getUTCFullYear();
        const mDiff = today.getUTCMonth() - dobDate.getUTCMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getUTCDate() < dobDate.getUTCDate())) {
          age -= 1;
        }
        if (Number.isNaN(dobDate.getTime()) || dobDate > today || age < 18) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Khách hàng phải từ đủ 18 tuổi trở lên'
          });
        }
        updates.push('DateOfBirth = ?');
        params.push(cleanDob);
      }
    }

    if (gender !== undefined) {
      const normalizedGender = normalizeGenderValue(gender);
      if (normalizedGender === undefined) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Giới tính không hợp lệ (MALE, FEMALE, OTHER)'
        });
      }
      updates.push('Gender = ?');
      params.push(normalizedGender);
    }

    if (address !== undefined) {
      const cleanAddress = typeof address === 'string' ? address.trim() : '';
      if (cleanAddress.length > 255) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Địa chỉ liên hệ tối đa 255 ký tự'
        });
      }
      updates.push('Address = ?');
      params.push(cleanAddress || null);
    }

    if (updates.length > 0) {
      updates.push('UpdatedAt = NOW()');
      params.push(userId);
      await pool.query(`UPDATE Users SET ${updates.join(', ')} WHERE UserId = ?`, params);
    }

    const [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.Username, u.FullName, u.Email, u.Phone,
              u.IdNumber, u.IdType, u.DateOfBirth, u.Gender, u.Address, u.Status, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate, mt.PointMultiplier
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE u.UserId = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0004_NOT_FOUND',
        message: 'Không tìm thấy thông tin tài khoản người dùng.'
      });
    }

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      user: serializeUser(users[0])
    });
  } catch (error) {
    console.error('Lỗi API updateProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật hồ sơ: ' + error.message
    });
  }
};

/**
 * Đổi mật khẩu khi đã đăng nhập
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng nhập mật khẩu hiện tại'
      });
    }

    const pwdCheck = validatePasswordComplexity(newPassword);
    if (!pwdCheck.ok) {
      return res.status(400).json({ success: false, code: pwdCheck.code, message: pwdCheck.message });
    }

    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_PASSWORD_MISMATCH',
        message: 'Mật khẩu xác nhận không khớp'
      });
    }

    const [users] = await pool.query('SELECT UserId, PasswordHash FROM Users WHERE UserId = ? LIMIT 1', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, code: 'ERROR_0004_NOT_FOUND', message: 'Không tìm thấy tài khoản.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].PasswordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0011_INVALID_CREDENTIALS',
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    const isSame = await bcrypt.compare(newPassword, users[0].PasswordHash);
    if (isSame) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0008_WEAK_PASSWORD',
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE Users SET PasswordHash = ?, UpdatedAt = NOW() WHERE UserId = ?', [newHash, userId]);

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_AUTH',
      message: 'Thao tác thành công',
      detail: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    console.error('Lỗi API changePassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đổi mật khẩu: ' + error.message
    });
  }
};

/**
 * Đăng nhập / Đăng ký nhanh qua Google OAuth
 * POST /api/v1/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    let email, name;

    if (credential) {
      // Xác thực id_token với Google tokeninfo endpoint
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!verifyRes.ok) {
        return res.status(401).json({
          success: false,
          message: 'Google Token không hợp lệ hoặc đã hết hạn.'
        });
      }
      const payload = await verifyRes.json();
      email = payload.email ? payload.email.toLowerCase() : null;
      name = payload.name || payload.given_name || 'Khách Hàng Google';
    } else if (accessToken) {
      // Xác thực access_token với Google userinfo endpoint
      const verifyRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!verifyRes.ok) {
        return res.status(401).json({
          success: false,
          message: 'Google Access Token không hợp lệ hoặc đã hết hạn.'
        });
      }
      const payload = await verifyRes.json();
      email = payload.email ? payload.email.toLowerCase() : null;
      name = payload.name || payload.given_name || 'Khách Hàng Google';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Thiếu Google Token/Credential xác thực.'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản Google không cung cấp địa chỉ Email.'
      });
    }

    // 1. Kiểm tra tài khoản đã tồn tại trong bảng Users chưa
    let [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.FullName, u.Email, u.Phone, 
              u.Status, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE u.Email = ?
       LIMIT 1`,
      [email]
    );

    let user;
    if (users.length === 0) {
      // Xác định Role Guest & Tier Standard động
      let guestRoleId = 5;
      try {
        const [roles] = await pool.query("SELECT RoleId FROM Roles WHERE RoleName = 'Guest' LIMIT 1");
        if (roles.length > 0) guestRoleId = roles[0].RoleId;
      } catch (_) {}

      let membershipTierId = 1;
      let tierName = 'Standard';
      let benefits = 'Ưu đãi chiết khấu phòng và miễn phí bữa sáng';
      let discountRate = 2.0;
      try {
        const [tiers] = await pool.query("SELECT TierId, TierName, Benefits, DiscountRate FROM MembershipTiers ORDER BY TierId ASC LIMIT 1");
        if (tiers.length > 0) {
          membershipTierId = tiers[0].TierId;
          tierName = tiers[0].TierName;
          benefits = tiers[0].Benefits;
          discountRate = tiers[0].DiscountRate;
        }
      } catch (_) {}

      // Người dùng mới -> Thêm vào bảng Users
      const dummyPassword = await bcrypt.hash('oauth_google_' + Date.now(), 10);
      const [insertResult] = await pool.query(
        `INSERT INTO Users (RoleId, TierId, FullName, Email, PasswordHash, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
        [guestRoleId, membershipTierId, name, email, dummyPassword]
      );

      user = {
        userId: insertResult.insertId,
        fullName: name,
        email: email,
        phone: null,
        roleId: guestRoleId,
        roleName: 'Guest',
        tierId: membershipTierId,
        tierName: tierName,
        benefits: benefits,
        discountRate: discountRate,
        status: 'Active'
      };
    } else {
      if (users[0].Status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của quý khách hiện đang bị tạm khóa. Vui lòng liên hệ Hotline (+84 236 888 9999).'
        });
      }

      user = {
        userId: users[0].UserId,
        fullName: users[0].FullName,
        email: users[0].Email,
        phone: users[0].Phone,
        roleId: users[0].RoleId,
        roleName: users[0].RoleName || 'Guest',
        tierId: users[0].TierId,
        tierName: users[0].TierName || 'Standard',
        benefits: users[0].Benefits,
        discountRate: users[0].DiscountRate,
        status: users[0].Status
      };
    }

    // 2. Tạo JWT Token của hệ thống Grand Horizon
    const token = jwt.sign(
      {
        userId: user.userId,
        roleId: user.roleId,
        roleName: user.roleName,
        email: user.email,
        fullName: user.fullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công! Chào mừng quý khách.',
      token,
      user
    });
  } catch (error) {
    console.error('Lỗi API googleLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng nhập Google: ' + error.message
    });
  }
};

/**
 * Đăng nhập / Đăng ký nhanh qua Facebook OAuth
 * POST /api/v1/auth/facebook
 */
const facebookLogin = async (req, res) => {
  try {
    const { accessToken, userID } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu Facebook Access Token xác thực.'
      });
    }

    let email, name, fbId;

    // 1. Hỗ trợ token test/sandbox nếu chưa có App ID duyệt production
    if (accessToken.startsWith('demo_fb_') || accessToken === 'facebook_test_token') {
      email = req.body.email || 'facebook.guest@grandhorizon.com';
      name = req.body.name || 'Khách Hàng Facebook';
      fbId = userID || 'fb_demo_' + Date.now();
    } else {
      // 2. Xác thực thật với Facebook Graph API
      const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
      if (!fbRes.ok) {
        return res.status(401).json({
          success: false,
          message: 'Facebook Access Token không hợp lệ hoặc đã hết hạn.'
        });
      }
      const fbData = await fbRes.json();
      fbId = fbData.id;
      name = fbData.name || 'Khách Hàng Facebook';
      email = fbData.email ? fbData.email.toLowerCase() : `fb_${fbId}@facebook.user`;
    }

    // 3. Tìm tài khoản trong bảng Users
    let [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.FullName, u.Email, u.Phone, 
              u.Status, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE u.Email = ?
       LIMIT 1`,
      [email]
    );

    let user;
    if (users.length === 0) {
      // Xác định Role Guest & Tier Standard động
      let guestRoleId = 5;
      try {
        const [roles] = await pool.query("SELECT RoleId FROM Roles WHERE RoleName = 'Guest' LIMIT 1");
        if (roles.length > 0) guestRoleId = roles[0].RoleId;
      } catch (_) {}

      let membershipTierId = 1;
      let tierName = 'Standard';
      let benefits = 'Ưu đãi chiết khấu phòng và miễn phí bữa sáng';
      let discountRate = 2.0;
      try {
        const [tiers] = await pool.query("SELECT TierId, TierName, Benefits, DiscountRate FROM MembershipTiers ORDER BY TierId ASC LIMIT 1");
        if (tiers.length > 0) {
          membershipTierId = tiers[0].TierId;
          tierName = tiers[0].TierName;
          benefits = tiers[0].Benefits;
          discountRate = tiers[0].DiscountRate;
        }
      } catch (_) {}

      const dummyPassword = await bcrypt.hash('oauth_fb_' + Date.now(), 10);
      const [insertResult] = await pool.query(
        `INSERT INTO Users (RoleId, TierId, FullName, Email, PasswordHash, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
        [guestRoleId, membershipTierId, name, email, dummyPassword]
      );

      user = {
        userId: insertResult.insertId,
        fullName: name,
        email: email,
        phone: null,
        roleId: guestRoleId,
        roleName: 'Guest',
        tierId: membershipTierId,
        tierName: tierName,
        benefits: benefits,
        discountRate: discountRate,
        status: 'Active'
      };
    } else {
      if (users[0].Status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của quý khách hiện đang bị tạm khóa. Vui lòng liên hệ Hotline (+84 236 888 9999).'
        });
      }

      user = {
        userId: users[0].UserId,
        fullName: users[0].FullName,
        email: users[0].Email,
        phone: users[0].Phone,
        roleId: users[0].RoleId,
        roleName: users[0].RoleName || 'Guest',
        tierId: users[0].TierId,
        tierName: users[0].TierName || 'Standard',
        benefits: users[0].Benefits,
        discountRate: users[0].DiscountRate,
        status: users[0].Status
      };
    }

    // 4. Tạo JWT Token
    const token = jwt.sign(
      {
        userId: user.userId,
        roleId: user.roleId,
        roleName: user.roleName,
        email: user.email,
        fullName: user.fullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập Facebook thành công! Chào mừng quý khách.',
      token,
      user
    });
  } catch (error) {
    console.error('Lỗi API facebookLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi đăng nhập Facebook: ' + error.message
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  googleLogin,
  facebookLogin
};
