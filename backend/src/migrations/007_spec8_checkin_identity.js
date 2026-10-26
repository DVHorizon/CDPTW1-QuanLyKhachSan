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

    console.log('--- 2. Tạo bảng GuestIdentityDocuments (Spec 8) nếu chưa có ---');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS GuestIdentityDocuments (
        DocumentId INT AUTO_INCREMENT PRIMARY KEY,
        BookingId INT NOT NULL,
        GuestId INT NULL,
        DocumentType ENUM('CCCD', 'Passport') NOT NULL,
        DocumentNumber VARCHAR(50) NOT NULL,
        FullName VARCHAR(150) NOT NULL,
        DateOfBirth DATE NOT NULL,
        Gender VARCHAR(20) DEFAULT 'Khác',
        Nationality VARCHAR(100) NOT NULL,
        DocumentExpiryDate DATE NULL,
        IdCardImageUrl VARCHAR(500) NULL,
        SignatureImageUrl VARCHAR(500) NULL,
        ScannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        ScannedBy INT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_doc (BookingId),
        INDEX idx_doc_number (DocumentNumber),
        INDEX idx_doc_type_number (DocumentType, DocumentNumber),
        FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Đã kiểm tra/tạo bảng GuestIdentityDocuments');

    console.log('--- 3. Thêm permission CHECKIN_CREATE theo Spec 8 ---');
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
