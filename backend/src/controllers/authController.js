const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Đăng ký tài khoản khách hàng mới
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, enrollClub } = req.body;

    // 1. Kiểm tra đầu vào bắt buộc
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên không được để trống.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email không được để trống.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng email không hợp lệ.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanFullName = fullName.trim();

    // 2. Kiểm tra email đã tồn tại hay chưa
    const [existingUsers] = await pool.query(
      'SELECT UserId FROM Users WHERE Email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Địa chỉ email này đã được đăng ký tài khoản trên hệ thống.'
      });
    }

    // 3. Kiểm tra số điện thoại (nếu có nhập)
    if (cleanPhone) {
      const [existingPhone] = await pool.query(
        'SELECT UserId FROM Users WHERE Phone = ? LIMIT 1',
        [cleanPhone]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được liên kết với một tài khoản khác.'
        });
      }
    }

    // 4. Mã hóa mật khẩu an toàn với bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Xác định RoleId (5 = Guest) và TierId (1 = Standard / 3 = Gold nếu tham gia Club)
    // Lấy RoleId cho 'Guest' từ bảng Roles, dự phòng 5
    let guestRoleId = 5;
    try {
      const [roles] = await pool.query(
        'SELECT RoleId FROM Roles WHERE RoleName = "Guest" LIMIT 1'
      );
      if (roles.length > 0) guestRoleId = roles[0].RoleId;
    } catch (_) {}

    // Lấy TierId từ bảng MembershipTiers (1 = Standard)
    let membershipTierId = enrollClub ? 1 : null;
    try {
      const [tiers] = await pool.query(
        'SELECT TierId FROM MembershipTiers ORDER BY TierId ASC LIMIT 1'
      );
      if (tiers.length > 0 && enrollClub) membershipTierId = tiers[0].TierId;
    } catch (_) {}

    // 6. Thêm người dùng mới vào bảng Users
    const [insertResult] = await pool.query(
      `INSERT INTO Users (RoleId, TierId, FullName, Email, Phone, PasswordHash, Status, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
      [guestRoleId, membershipTierId, cleanFullName, cleanEmail, cleanPhone, passwordHash]
    );

    const newUserId = insertResult.insertId;

    // 7. Tạo JWT Token
    const token = jwt.sign(
      {
        userId: newUserId,
        roleId: guestRoleId,
        roleName: 'Guest',
        email: cleanEmail,
        fullName: cleanFullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 8. Trả về thông tin người dùng và Token
    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng quý khách đến với Grand Horizon.',
      token,
      user: {
        userId: newUserId,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        roleId: guestRoleId,
        roleName: 'Guest',
        tierId: membershipTierId,
        tierName: enrollClub ? 'Standard' : 'Chưa xếp hạng',
        status: 'Active'
      }
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
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    // Chấp nhận identifier hoặc email / phone
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const password = req.body.password;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email hoặc Số điện thoại.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu.'
      });
    }

    const cleanIdentifier = identifier.trim();

    // 1. Tìm tài khoản theo Email hoặc Số điện thoại kèm thông tin Role & MembershipTier
    const [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.FullName, u.Email, u.Phone, 
              u.PasswordHash, u.Status, u.CreatedAt,
              r.RoleName,
              mt.TierName, mt.Benefits, mt.DiscountRate, mt.PointMultiplier
       FROM Users u
       LEFT JOIN Roles r ON u.RoleId = r.RoleId
       LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
       WHERE (u.Email = ? OR u.Phone = ?)
       LIMIT 1`,
      [cleanIdentifier.toLowerCase(), cleanIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
      });
    }

    const user = users[0];

    // 2. Kiểm tra trạng thái tài khoản
    if (user.Status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của quý khách hiện đang bị tạm khóa. Vui lòng liên hệ Hotline (+84 236 888 9999).'
      });
    }

    // 3. Kiểm tra mật khẩu bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
      });
    }

    // 4. Khởi tạo JWT Token
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

    // 5. Phản hồi thành công
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công! Chào mừng quý khách trở lại Grand Horizon.',
      token,
      user: {
        userId: user.UserId,
        fullName: user.FullName,
        email: user.Email,
        phone: user.Phone,
        roleId: user.RoleId,
        roleName: user.RoleName || 'Guest',
        tierId: user.TierId,
        tierName: user.TierName || 'Standard',
        benefits: user.Benefits || '',
        discountRate: user.DiscountRate || 0,
        status: user.Status
      }
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
 * Lấy thông tin người dùng hiện tại đang đăng nhập
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await pool.query(
      `SELECT u.UserId, u.RoleId, u.TierId, u.FullName, u.Email, u.Phone, 
              u.IdNumber, u.IdType, u.DateOfBirth, u.Gender, u.Status, u.CreatedAt,
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
        message: 'Không tìm thấy thông tin tài khoản người dùng.'
      });
    }

    const user = users[0];

    return res.status(200).json({
      success: true,
      user: {
        userId: user.UserId,
        fullName: user.FullName,
        email: user.Email,
        phone: user.Phone,
        idNumber: user.IdNumber,
        dateOfBirth: user.DateOfBirth,
        gender: user.Gender,
        roleId: user.RoleId,
        roleName: user.RoleName,
        tierId: user.TierId,
        tierName: user.TierName || 'Standard',
        benefits: user.Benefits,
        discountRate: user.DiscountRate,
        status: user.Status,
        createdAt: user.CreatedAt
      }
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

/**
 * Cập nhật thông tin người dùng hiện tại đang đăng nhập
 * PUT /api/v1/auth/me
 */
const updateMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, phone, idNumber, idType, dateOfBirth, gender } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên không được để trống.'
      });
    }

    const cleanFullName = fullName.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanIdNumber = idNumber ? idNumber.trim() : null;
    const cleanIdType = idType ? idType.trim() : null;
    const cleanDateOfBirth = dateOfBirth ? dateOfBirth : null;
    const cleanGender = gender ? gender.trim() : null;

    // Check if phone already used by someone else
    if (cleanPhone) {
      const [existingPhone] = await pool.query(
        'SELECT UserId FROM Users WHERE Phone = ? AND UserId != ? LIMIT 1',
        [cleanPhone, userId]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại này đã được liên kết với một tài khoản khác.'
        });
      }
    }

    await pool.query(
      `UPDATE Users 
       SET FullName = ?, Phone = ?, IdNumber = ?, IdType = ?, DateOfBirth = ?, Gender = ?, UpdatedAt = NOW()
       WHERE UserId = ?`,
      [cleanFullName, cleanPhone, cleanIdNumber, cleanIdType, cleanDateOfBirth, cleanGender, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công.'
    });
  } catch (error) {
    console.error('Lỗi API updateMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật hồ sơ: ' + error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  googleLogin,
  facebookLogin
};
