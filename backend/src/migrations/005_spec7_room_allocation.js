'use strict';

const pool = require('../config/db');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('--- 1. Kiểm tra & thêm cột trong Bookings ---');
    const [bookingCols] = await conn.query('DESCRIBE Bookings');
    const bColNames = bookingCols.map(c => c.Field.toLowerCase());

    if (!bColNames.includes('confirmedby')) {
      await conn.query('ALTER TABLE Bookings ADD COLUMN ConfirmedBy INT NULL AFTER Note');
      console.log('✅ Đã thêm cột ConfirmedBy vào Bookings');
    }
    if (!bColNames.includes('confirmedat')) {
      await conn.query('ALTER TABLE Bookings ADD COLUMN ConfirmedAt DATETIME NULL AFTER ConfirmedBy');
      console.log('✅ Đã thêm cột ConfirmedAt vào Bookings');
    }
    if (!bColNames.includes('allocatedat')) {
      await conn.query('ALTER TABLE Bookings ADD COLUMN AllocatedAt DATETIME NULL AFTER ConfirmedAt');
      console.log('✅ Đã thêm cột AllocatedAt vào Bookings');
    }

    console.log('--- 2. Thêm permissions BOOKING_CONFIRM và ROOM_ALLOCATION ---');
    const [permCheck] = await conn.query(
      "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName IN ('BOOKING_CONFIRM', 'ROOM_ALLOCATION')"
    );
    const existingPerms = permCheck.map(p => p.PermissionName);

    if (!existingPerms.includes('BOOKING_CONFIRM')) {
      await conn.query(
        "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('BOOKING_CONFIRM', 'booking', 'Xác nhận thông tin đặt phòng', NOW())"
      );
      console.log('✅ Đã thêm quyền BOOKING_CONFIRM');
    }
    if (!existingPerms.includes('ROOM_ALLOCATION')) {
      await conn.query(
        "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('ROOM_ALLOCATION', 'booking', 'Gán số phòng cụ thể cho đặt phòng', NOW())"
      );
      console.log('✅ Đã thêm quyền ROOM_ALLOCATION');
    }

    const [allPerms] = await conn.query(
      "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName IN ('BOOKING_CONFIRM', 'ROOM_ALLOCATION')"
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

    console.log('🎉 Hoàn tất migration bổ sung CSDL theo Spec 7!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    conn.release();
    pool.end();
  }
}

migrate();
