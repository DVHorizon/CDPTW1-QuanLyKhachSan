'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ADMIN_MEMBERS = [
  {
    mssv: '22211TT2302',
    fullName: 'Nguyễn Văn Thực',
    username: 'admin_vanthuc',
    email: 'vanthuc.22211tt2302@hoteldomain.vn',
    phone: '0922112302',
    employeeCode: 'NV-22211TT2302',
    password: 'Admin@22211TT2302',
    gender: 'Nam',
    dateOfBirth: '2004-03-15'
  },
  {
    mssv: '24211TT3501',
    fullName: 'Nguyễn Nhân Bảo',
    username: 'admin_nhanbao',
    email: 'nhanbao.24211tt3501@hoteldomain.vn',
    phone: '0924113501',
    employeeCode: 'NV-24211TT3501',
    password: 'Admin@24211TT3501',
    gender: 'Nam',
    dateOfBirth: '2004-05-20'
  },
  {
    mssv: '23211TT4241',
    fullName: 'Đặng Văn Hà',
    username: 'admin_vanha',
    email: 'vanha.23211tt4241@hoteldomain.vn',
    phone: '0923114241',
    employeeCode: 'NV-23211TT4241',
    password: 'Admin@23211TT4241',
    gender: 'Nam',
    dateOfBirth: '2004-08-10'
  },
  {
    mssv: '24211TT1788',
    fullName: 'Nguyễn Xuân Thu Trang',
    username: 'admin_thutrang',
    email: 'thutrang.24211tt1788@hoteldomain.vn',
    phone: '0924111788',
    employeeCode: 'NV-24211TT1788',
    password: 'Admin@24211TT1788',
    gender: 'Nữ',
    dateOfBirth: '2004-11-25'
  },
  {
    mssv: '23211TT3988',
    fullName: 'Hồ Thanh Tuyền',
    username: 'admin_thanhtuyen',
    email: 'thanhtuyen.23211tt3988@hoteldomain.vn',
    phone: '0923113988',
    employeeCode: 'NV-23211TT3988',
    password: 'Admin@23211TT3988',
    gender: 'Nữ',
    dateOfBirth: '2004-09-18'
  }
];

async function seedAdminTeam() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 KHỞI TẠO 5 TÀI KHOẢN ADMIN CHO CÁC THÀNH VIÊN NHÓM DỰ ÁN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const connection = await pool.getConnection();

  try {
    for (const member of ADMIN_MEMBERS) {
      const passwordHash = await bcrypt.hash(member.password, 10);

      // Kiểm tra nếu đã tồn tại theo Email hoặc Username
      const [existing] = await connection.query(
        'SELECT UserId, Username, Email FROM Users WHERE Email = ? OR Username = ?',
        [member.email, member.username]
      );

      if (existing.length > 0) {
        const userId = existing[0].UserId;
        await connection.query(
          `UPDATE Users SET 
            RoleId = 1,
            Username = ?,
            FullName = ?,
            Email = ?,
            Phone = ?,
            EmployeeCode = ?,
            PasswordHash = ?,
            Gender = ?,
            DateOfBirth = ?,
            Department = 'Quản Trị & Công Nghệ',
            Status = 'Active',
            MustChangePassword = 0,
            IsDeleted = 0,
            UpdatedAt = NOW()
          WHERE UserId = ?`,
          [
            member.username,
            member.fullName,
            member.email,
            member.phone,
            member.employeeCode,
            passwordHash,
            member.gender,
            member.dateOfBirth,
            userId
          ]
        );
        console.log(`🔄 Cập nhật Admin: [${member.mssv}] ${member.fullName} (UserId: ${userId})`);
      } else {
        const [result] = await connection.query(
          `INSERT INTO Users 
            (RoleId, Username, FullName, Email, Phone, EmployeeCode, PasswordHash, Gender, DateOfBirth, Department, Status, MustChangePassword, IsDeleted, CreatedAt, UpdatedAt)
          VALUES 
            (1, ?, ?, ?, ?, ?, ?, ?, ?, 'Quản Trị & Công Nghệ', 'Active', 0, 0, NOW(), NOW())`,
          [
            member.username,
            member.fullName,
            member.email,
            member.phone,
            member.employeeCode,
            passwordHash,
            member.gender,
            member.dateOfBirth
          ]
        );
        console.log(`✅ Tạo mới Admin: [${member.mssv}] ${member.fullName} (UserId: ${result.insertId})`);
      }
    }

    console.log('\n🔍 KIỂM THỬ XÁC THỰC MẬT KHẨU TỪNG TÀI KHOẢN:');
    for (const member of ADMIN_MEMBERS) {
      const [rows] = await connection.query(
        'SELECT UserId, RoleId, Username, Email, Phone, FullName, PasswordHash, Status FROM Users WHERE Username = ?',
        [member.username]
      );
      if (rows.length > 0) {
        const user = rows[0];
        const isValid = await bcrypt.compare(member.password, user.PasswordHash);
        console.log(`  ✓ ${user.FullName} (${user.Username}): Password Match = ${isValid ? 'OK (HỢP LỆ)' : 'FAIL'}`);
      }
    }

    console.log('\n🎉 ĐÃ TẠO VÀ XÁC THỰC THÀNH CÔNG TOÀN BỘ 5 TÀI KHOẢN ADMIN!\n');
  } catch (err) {
    console.error('❌ Lỗi khi tạo tài khoản Admin:', err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedAdminTeam();
