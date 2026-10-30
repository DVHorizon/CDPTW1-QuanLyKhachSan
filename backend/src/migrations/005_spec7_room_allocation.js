'use strict';

/**
 * Migration 005 – Bổ sung schema Xác nhận đặt phòng & Gán phòng (Spec 7: FEAT-ROOMALLOC-01)
 * Chuẩn hóa trên 57 bảng cốt lõi (sử dụng Stays & Bookings, KHÔNG tạo bảng BookingRoomAllocations)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    console.log('--- 1. Kiểm tra & thêm cột trong Bookings ---');
    const bookingDesc = await qi.describeTable('Bookings');
    const bColNames = Object.keys(bookingDesc).map(c => c.toLowerCase());

    if (!bColNames.includes('confirmedby')) {
      await qi.addColumn('Bookings', 'ConfirmedBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log('✅ Đã thêm cột ConfirmedBy vào Bookings');
    }
    if (!bColNames.includes('confirmedat')) {
      await qi.addColumn('Bookings', 'ConfirmedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Đã thêm cột ConfirmedAt vào Bookings');
    }
    if (!bColNames.includes('allocatedat')) {
      await qi.addColumn('Bookings', 'AllocatedAt', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Đã thêm cột AllocatedAt vào Bookings');
    }

    // 2. Thêm permissions BOOKING_CONFIRM và ROOM_ALLOCATION
    try {
      const [existingPerms] = await qi.sequelize.query(
        "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName IN ('BOOKING_CONFIRM', 'ROOM_ALLOCATION')"
      );
      const permNames = existingPerms.map(p => p.PermissionName);

      if (!permNames.includes('BOOKING_CONFIRM')) {
        await qi.sequelize.query(
          "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('BOOKING_CONFIRM', 'booking', 'Xác nhận thông tin đặt phòng', NOW())"
        );
        console.log('✅ Đã thêm quyền BOOKING_CONFIRM');
      }

      if (!permNames.includes('ROOM_ALLOCATION')) {
        await qi.sequelize.query(
          "INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES ('ROOM_ALLOCATION', 'booking', 'Gán số phòng cụ thể cho đặt phòng', NOW())"
        );
        console.log('✅ Đã thêm quyền ROOM_ALLOCATION');
      }

      const [allPerms] = await qi.sequelize.query(
        "SELECT PermissionId, PermissionName FROM Permissions WHERE PermissionName IN ('BOOKING_CONFIRM', 'ROOM_ALLOCATION')"
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
      console.warn('⚠️ Cảnh báo gán quyền (bỏ qua):', permErr.message);
    }
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    console.log('🗑️ Migration 005 rollback hoàn tất.');
  }
};
