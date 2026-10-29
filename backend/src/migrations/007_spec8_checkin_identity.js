'use strict';

const pool = require('../config/db');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('--- 1. Kiểm tra & thêm cột trong Bookings cho Check-in ---');
    const [bookingCols] = await conn.query('DESCRIBE Bookings');
    const bColNames = bookingCols.map(c => c.Field.toLowerCase());

    if (!bColNames.includes('checkedinby')) {
      await conn.query('ALTER TABLE Bookings ADD COLUMN CheckedInBy INT NULL AFTER AllocatedAt');
      console.log('✅ Đã thêm cột CheckedInBy vào Bookings');
    }
    if (!bColNames.includes('checkedinat')) {
      await conn.query('ALTER TABLE Bookings ADD COLUMN CheckedInAt DATETIME NULL AFTER CheckedInBy');
      console.log('✅ Đã thêm cột CheckedInAt vào Bookings');
    }

    console.log('--- 2. Thêm permission CHECKIN_CREATE theo Spec 8 ---');
    const [permCheck] = await conn.query(
      "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName = 'CHECKIN_CREATE'"
    );

    if (permCheck.length === 0) {
      await conn.query(
        "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('CHECKIN_CREATE', 'booking', 'Thực hiện nghiệp vụ Check-in tại quầy', NOW())"
      );
      console.log('✅ Đã thêm quyền CHECKIN_CREATE');
    }

    const [allPerms] = await conn.query(
      "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName = 'CHECKIN_CREATE'"
    );

    // Gán quyền cho Admin (RoleId = 1) và Receptionist (RoleId = 2)
    for (const p of allPerms) {
      for (const roleId of [1, 2]) {
        const [rpExists] = await conn.query(
          'SELECT * FROM RolePermissions WHERE RoleId = ? AND PermissionId = ?',
          [roleId, p.PermissionId]
        );
        if (rpExists.length === 0) {
          await conn.query(
            'INSERT INTO RolePermissions (RoleId, PermissionId, CreatedAt) VALUES (?, ?, NOW())',
            [roleId, p.PermissionId]
          );
          console.log(`✅ Gán quyền ${p.PermissionName} cho RoleId ${roleId}`);
        }
      }
    }

    console.log('🎉 Hoàn tất migration bổ sung CSDL theo Spec 8!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    conn.release();
    pool.end();
  }
}

migrate();
