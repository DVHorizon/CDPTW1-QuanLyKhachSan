'use strict';

/**
 * Migration 005 Spec 7 – Room Allocation (FEAT-ROOM-ALLOCATION)
 * Thêm các cột ConfirmedBy, ConfirmedAt, AllocatedAt vào Bookings
 * Tạo bảng BookingRoomAllocations và gán permissions
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // 1. Kiểm tra & thêm cột trong Bookings
    const bookingCols = await qi.describeTable('Bookings');
    const bColNames = Object.keys(bookingCols).map(c => c.toLowerCase());

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

    // 2. Tạo bảng BookingRoomAllocations nếu chưa có
    const tables = await qi.showAllTables();
    if (!tables.includes('BookingRoomAllocations')) {
      await qi.createTable('BookingRoomAllocations', {
        AllocationId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        BookingId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'Bookings', key: 'BookingId' },
          onDelete: 'CASCADE',
        },
        RoomId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'Rooms', key: 'RoomId' },
          onDelete: 'CASCADE',
        },
        CheckInDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        CheckOutDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        AllocationNote: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        AllocatedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        AllocatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        Status: {
          type: DataTypes.STRING(30),
          defaultValue: 'Allocated',
        },
        CreatedAt: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        UpdatedAt: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      console.log('✅ Đã kiểm tra/tạo bảng BookingRoomAllocations');
    }

    // 3. Thêm permissions BOOKING_CONFIRM và ROOM_ALLOCATION
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
    try {
      await qi.dropTable('BookingRoomAllocations');
    } catch (_) {}
  }
};
