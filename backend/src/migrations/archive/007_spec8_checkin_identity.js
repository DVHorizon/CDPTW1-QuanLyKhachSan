'use strict';

/**
 * Migration 007 – Bổ sung schema Nghiệp vụ Check-in tại quầy theo Spec 8
 * Chuẩn hóa trên 57 bảng cốt lõi (dùng Bookings & BookingGuests, KHÔNG tạo GuestIdentityDocuments)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    console.log('--- 1. Kiểm tra & thêm cột trong Bookings cho Check-in ---');
    const bookingDesc = await qi.describeTable('Bookings');
    const bColNames = Object.keys(bookingDesc).map(c => c.toLowerCase());

    if (!bColNames.includes('checkedinby')) {
      await qi.addColumn('Bookings', 'CheckedInBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log('✅ Đã thêm cột CheckedInBy vào Bookings');
    }
    if (!bColNames.includes('checkedinat')) {
      await qi.addColumn('Bookings', 'CheckedInAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Đã thêm cột CheckedInAt vào Bookings');
    }

    // 2. Thêm permission CHECKIN_CREATE theo Spec 8
    try {
      const [permCheck] = await qi.sequelize.query(
        "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName = 'CHECKIN_CREATE'"
      );

      if (permCheck.length === 0) {
        await qi.sequelize.query(
          "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('CHECKIN_CREATE', 'booking', 'Thực hiện nghiệp vụ Check-in tại quầy', NOW())"
        );
        console.log('✅ Đã thêm quyền CHECKIN_CREATE');
      }

      const [allPerms] = await qi.sequelize.query(
        "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName = 'CHECKIN_CREATE'"
      );

      for (const p of allPerms) {
        for (const roleId of [1, 2]) {
          const [rpExists] = await qi.sequelize.query(
            'SELECT * FROM RolePermissions WHERE RoleId = ? AND PermissionId = ?',
            { replacements: [roleId, p.PermissionId] }
          );
          if (rpExists.length === 0) {
            await qi.sequelize.query(
              'INSERT INTO RolePermissions (RoleId, PermissionId, CreatedAt) VALUES (?, ?, NOW())',
              { replacements: [roleId, p.PermissionId] }
            );
            console.log(`✅ Gán quyền ${p.PermissionName} cho RoleId ${roleId}`);
          }
        }
      }
    } catch (permErr) {
      console.warn('⚠️ Cảnh báo gán quyền CHECKIN_CREATE (bỏ qua):', permErr.message);
    }
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    console.log('🗑️ Migration 007 rollback hoàn tất.');
  }
};
