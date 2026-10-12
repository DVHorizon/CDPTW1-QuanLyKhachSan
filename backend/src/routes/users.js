const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Map role name / department defaults
const ROLE_TO_DEPT = {
  'Admin': 'Quản Trị & Công Nghệ',
  'Receptionist': 'Lễ Tân & Tiền Sảnh',
  'Kitchen': 'Ẩm Thực F&B & Bếp',
  'Housekeeping': 'Buồng Phòng & Kỹ Thuật',
  'Guest': 'Lễ Tân & Tiền Sảnh'
};

const DEFAULT_PERMS = {
  quyen_checkin: false,
  quyen_chuyen_phong: false,
  quyen_the_tu: true,
  quyen_buong_phong: false,
  quyen_night_audit: false,
  quyen_he_thong: false
};

const DEFAULT_POLICY = {
  hanMatKhauNgay: 60,
  thoiGianIdlePhut: 15,
  baoMatMFA: true,
  hanPhienGio: 8
};

// ─── GET danh sách người dùng / nhân viên ─────────────────────────────────────
// GET /api/users?search=&dept=&role=&status=&limit=50&sort=desc
router.get('/', async (req, res) => {
  try {
    const { search, dept, role, status, limit, sort } = req.query;
    
    // Hỗ trợ limit linh hoạt: mặc định 50, hoặc 100, 200, 500, hoặc 'all' (tối đa 2000 để bảo vệ memory)
    let queryLimit = 50;
    if (limit === 'all') {
      queryLimit = 2000;
    } else if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        queryLimit = Math.min(parsed, 2000); // Cho phép lấy lên đến 2000 bản ghi
      }
    }

    // Sắp xếp: Mặc định DESC để người dùng mới thêm hiển thị ngay lập tức
    const sortOrder = (sort && String(sort).toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    let sql = `
      SELECT u.UserId, u.FullName, u.Email, u.Phone, u.Status, u.Department,
             u.Permissions, u.SecurityPolicy, u.CreatedAt, u.UpdatedAt,
             r.RoleId, r.RoleName, r.Description AS RoleDescription
      FROM Users u
      LEFT JOIN Roles r ON u.RoleId = r.RoleId
      WHERE u.IsDeleted = 0
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (u.FullName LIKE ? OR u.Email LIKE ? OR u.Phone LIKE ? OR CAST(u.UserId AS CHAR) LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (dept && dept !== 'TAT_CA') {
      sql += ` AND u.Department = ?`;
      params.push(dept);
    }

    if (role && role !== 'TAT_CA') {
      sql += ` AND (r.RoleName = ? OR r.RoleId = ?)`;
      params.push(role, parseInt(role) || 0);
    }

    if (status && status !== 'TAT_CA') {
      sql += ` AND u.Status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.UserId ${sortOrder} LIMIT ${queryLimit}`;

    const [rows] = await pool.query(sql, params);
    const [[countRow]] = await pool.query('SELECT COUNT(*) as totalInDb FROM Users WHERE IsDeleted = 0');
    const totalInDb = countRow ? countRow.totalInDb : rows.length;

    // Chuẩn hóa dữ liệu trả về cho frontend
    const users = rows.map(u => {
      let perms = u.Permissions;
      if (typeof perms === 'string') {
        try { perms = JSON.parse(perms); } catch (_) { perms = DEFAULT_PERMS; }
      }
      if (!perms) perms = DEFAULT_PERMS;

      let policy = u.SecurityPolicy;
      if (typeof policy === 'string') {
        try { policy = JSON.parse(policy); } catch (_) { policy = DEFAULT_POLICY; }
      }
      if (!policy) policy = DEFAULT_POLICY;

      // Chuyển status sang snake_case nếu cần
      let st = 'hoat_dong';
      if (u.Status === 'Inactive' || u.Status === 'tam_dung') st = 'tam_dung';
      else if (u.Status === 'Revoked' || u.Status === 'da_thu_hoi') st = 'da_thu_hoi';

      // Chữ viết tắt Avatar
      const phanTen = (u.FullName || '').trim().split(' ').filter(Boolean);
      const vienTat = phanTen.length >= 2
        ? (phanTen[0][0] + phanTen[phanTen.length - 1][0]).toUpperCase()
        : (u.FullName || 'NV').substring(0, 2).toUpperCase();

      return {
        id: `NV-${String(u.UserId).padStart(4, '0')}`,
        rawId: u.UserId,
        hoTen: u.FullName,
        email: u.Email,
        phone: u.Phone || '',
        phongBan: u.Department || ROLE_TO_DEPT[u.RoleName] || 'Lễ Tân & Tiền Sảnh',
        vaiTro: u.RoleName || 'Nhân Viên Lễ Tân',
        maVaiTro: `VAI_TRO #${String(u.RoleId || 1).padStart(2, '0')}`,
        trangThai: st,
        rawStatus: u.Status,
        vienTat,
        ngayVaoLam: (u.CreatedAt && !isNaN(new Date(u.CreatedAt).getTime())) ? new Date(u.CreatedAt).toLocaleDateString('vi-VN') : '15/03/2023',
        quyenHan: perms,
        chinhSachBaoMat: policy
      };
    });

    res.json({
      success: true,
      data: users,
      total: users.length,
      totalInDb,
      limit: queryLimit
    });
  } catch (err) {
    console.error('Lỗi GET /api/users:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách người dùng: ' + err.message });
  }
});

// ─── GET chi tiết 1 người dùng ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ' });
    }

    const [rows] = await pool.query(`
      SELECT u.UserId, u.FullName, u.Email, u.Phone, u.Status, u.Department,
             u.Permissions, u.SecurityPolicy, u.CreatedAt, u.UpdatedAt,
             r.RoleId, r.RoleName, r.Description AS RoleDescription
      FROM Users u
      LEFT JOIN Roles r ON u.RoleId = r.RoleId
      WHERE u.UserId = ? AND u.IsDeleted = 0
    `, [rawId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống!'
      });
    }

    const u = rows[0];
    let perms = u.Permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (_) { perms = DEFAULT_PERMS; }
    }
    let policy = u.SecurityPolicy;
    if (typeof policy === 'string') {
      try { policy = JSON.parse(policy); } catch (_) { policy = DEFAULT_POLICY; }
    }

    res.json({
      success: true,
      data: {
        id: `NV-${String(u.UserId).padStart(4, '0')}`,
        rawId: u.UserId,
        hoTen: u.FullName,
        email: u.Email,
        phone: u.Phone,
        phongBan: u.Department,
        vaiTro: u.RoleName,
        trangThai: u.Status,
        quyenHan: perms,
        chinhSachBaoMat: policy
      }
    });
  } catch (err) {
    console.error('Lỗi GET /api/users/:id:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST thêm người dùng mới ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { hoTen, email, phone, phongBan, vaiTro, quyenHan, chinhSachBaoMat } = req.body;

    // Validation
    if (!hoTen || !String(hoTen).trim()) {
      return res.status(400).json({ success: false, message: 'Họ và tên không được để trống' });
    }
    const cleanName = String(hoTen).trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'Họ và tên phải từ 2 đến 100 ký tự' });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không được để trống' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng hợp lệ' });
    }

    if (!vaiTro || !String(vaiTro).trim()) {
      return res.status(400).json({ success: false, message: 'Phải gán ít nhất một vai trò cho nhân viên mới' });
    }

    // Kiểm tra trùng lặp email
    const [existEmail] = await pool.query('SELECT UserId, IsDeleted FROM Users WHERE Email = ?', [cleanEmail]);
    if (existEmail.length > 0) {
      if (existEmail[0].IsDeleted === 0) {
        return res.status(409).json({ success: false, message: `Địa chỉ email "${cleanEmail}" đã được sử dụng bởi người dùng khác!` });
      }
    }

    // Tìm RoleId tương ứng
    let roleId = 2; // Default: Receptionist
    const [roleRows] = await pool.query('SELECT RoleId FROM Roles WHERE RoleName = ? AND IsDeleted = 0 LIMIT 1', [vaiTro]);
    if (roleRows.length > 0) {
      roleId = roleRows[0].RoleId;
    } else {
      // Thử tìm role gần đúng
      if (vaiTro.includes('Admin') || vaiTro.includes('Quản Trị')) roleId = 1;
      else if (vaiTro.includes('Bếp') || vaiTro.includes('Kitchen')) roleId = 3;
      else if (vaiTro.includes('Buồng') || vaiTro.includes('Housekeeping')) roleId = 4;
      else roleId = 2;
    }

    const dept = phongBan || ROLE_TO_DEPT[vaiTro] || 'Lễ Tân & Tiền Sảnh';
    const perms = quyenHan ? JSON.stringify(quyenHan) : JSON.stringify(DEFAULT_PERMS);
    const policy = chinhSachBaoMat ? JSON.stringify(chinhSachBaoMat) : JSON.stringify(DEFAULT_POLICY);
    const now = new Date();

    const [result] = await pool.query(`
      INSERT INTO Users (RoleId, FullName, Email, Phone, PasswordHash, Department, Status, Permissions, SecurityPolicy, IsDeleted, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, 0, ?, ?)
    `, [
      roleId,
      cleanName,
      cleanEmail,
      phone || '0900000000',
      '$2a$10$7vN3X8w3yvQf9Z9B8O6PKeQ2hYqf0j0J9uF2bJ7F.G8b0nC2x9n3K', // default hash
      dept,
      perms,
      policy,
      now,
      now
    ]);

    const newId = result.insertId;

    res.status(201).json({
      success: true,
      message: `Đã cấp phát tài khoản thành công cho ${cleanName}`,
      data: {
        id: `NV-${String(newId).padStart(4, '0')}`,
        rawId: newId,
        hoTen: cleanName,
        email: cleanEmail,
        phongBan: dept,
        vaiTro,
        trangThai: 'hoat_dong'
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Dữ liệu (email hoặc số điện thoại) đã tồn tại trong hệ thống!' });
    }
    console.error('Lỗi POST /api/users:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm người dùng: ' + err.message });
  }
});

// ─── PUT cập nhật người dùng (phân quyền, thông tin, bảo mật) ─────────────────
router.put('/:id', async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ' });
    }

    // 1. Kiểm tra tồn tại trong DB (Concurrency Check)
    const [exist] = await pool.query('SELECT UserId, IsDeleted, FullName FROM Users WHERE UserId = ?', [rawId]);
    if (exist.length === 0 || exist[0].IsDeleted === 1) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: `Người dùng này không còn tồn tại trong hệ thống (có thể đã bị xóa bởi quản trị viên khác)!`
      });
    }

    const { hoTen, email, phone, phongBan, vaiTro, trangThai, quyenHan, chinhSachBaoMat } = req.body;

    // Validate họ tên nếu có gửi lên
    if (hoTen !== undefined) {
      const cleanName = String(hoTen).trim();
      if (cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({ success: false, message: 'Họ và tên phải từ 2 đến 100 ký tự' });
      }
    }

    // Validate email nếu có
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Email không đúng định dạng hợp lệ' });
      }
      // Check trùng email khác
      const [dup] = await pool.query('SELECT UserId FROM Users WHERE Email = ? AND UserId != ? AND IsDeleted = 0', [cleanEmail, rawId]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: `Email "${cleanEmail}" đã được dùng bởi nhân viên khác!` });
      }
    }

    // Chuẩn bị câu lệnh UPDATE
    const updates = [];
    const params = [];

    if (hoTen !== undefined) { updates.push('FullName = ?'); params.push(String(hoTen).trim()); }
    if (email !== undefined) { updates.push('Email = ?'); params.push(String(email).trim().toLowerCase()); }
    if (phone !== undefined) { updates.push('Phone = ?'); params.push(String(phone).trim()); }
    if (phongBan !== undefined) { updates.push('Department = ?'); params.push(phongBan); }

    if (vaiTro !== undefined) {
      let roleId = 2;
      const [roleRows] = await pool.query('SELECT RoleId FROM Roles WHERE RoleName = ? AND IsDeleted = 0 LIMIT 1', [vaiTro]);
      if (roleRows.length > 0) roleId = roleRows[0].RoleId;
      updates.push('RoleId = ?');
      params.push(roleId);
    }

    if (trangThai !== undefined) {
      let dbStatus = 'Active';
      if (trangThai === 'tam_dung' || trangThai === 'Inactive') dbStatus = 'Inactive';
      else if (trangThai === 'da_thu_hoi' || trangThai === 'Revoked') dbStatus = 'Revoked';
      updates.push('Status = ?');
      params.push(dbStatus);
    }

    if (quyenHan !== undefined) {
      updates.push('Permissions = ?');
      params.push(JSON.stringify(quyenHan));
    }

    if (chinhSachBaoMat !== undefined) {
      updates.push('SecurityPolicy = ?');
      params.push(JSON.stringify(chinhSachBaoMat));
    }

    updates.push('UpdatedAt = ?');
    params.push(new Date());

    params.push(rawId);

    await pool.query(`UPDATE Users SET ${updates.join(', ')} WHERE UserId = ?`, params);

    res.json({
      success: true,
      message: `Cập nhật thông tin và phân quyền cho ${exist[0].FullName} thành công!`,
      data: { rawId }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Dữ liệu trùng lặp với người dùng khác trong hệ thống!' });
    }
    console.error('Lỗi PUT /api/users/:id:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật: ' + err.message });
  }
});

// ─── DELETE xóa người dùng (Soft-delete & Concurrency check) ──────────────────
router.delete('/:id', async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ' });
    }

    // 1. Kiểm tra tồn tại trong DB (Concurrency Check)
    const [exist] = await pool.query('SELECT UserId, FullName, IsDeleted FROM Users WHERE UserId = ?', [rawId]);
    if (exist.length === 0 || exist[0].IsDeleted === 1) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa bởi người khác trước đó!'
      });
    }

    // 2. Không cho xóa tài khoản Root Admin (UserId = 1)
    if (rawId === 1) {
      return res.status(403).json({
        success: false,
        message: 'Không thể xóa tài khoản Quản Trị Viên Gốc của hệ thống!'
      });
    }

    // 3. Thực hiện Soft Delete
    await pool.query('UPDATE Users SET IsDeleted = 1, Status = \'Revoked\', UpdatedAt = ? WHERE UserId = ?', [new Date(), rawId]);

    res.json({
      success: true,
      message: `Đã xóa tài khoản nhân viên ${exist[0].FullName} thành công khỏi hệ thống!`,
      data: { rawId }
    });
  } catch (err) {
    console.error('Lỗi DELETE /api/users/:id:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa người dùng: ' + err.message });
  }
});

module.exports = router;
