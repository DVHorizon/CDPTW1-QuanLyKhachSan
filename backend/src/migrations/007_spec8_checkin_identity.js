'use strict';

/**
 * Migration 007 Spec 8 – Check-in Identity Documents
 * Thêm các cột CheckedInBy, CheckedInAt vào Bookings
 * Tạo bảng GuestIdentityDocuments và gán permission CHECKIN_CREATE
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // 1. Kiểm tra & thêm cột trong Bookings cho Check-in
    const bookingCols = await qi.describeTable('Bookings');
    const bColNames = Object.keys(bookingCols).map(c => c.toLowerCase());

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

    // 2. Tạo bảng GuestIdentityDocuments (Spec 8) nếu chưa có
    const tables = await qi.showAllTables();
    if (!tables.includes('GuestIdentityDocuments')) {
      await qi.createTable('GuestIdentityDocuments', {
        DocumentId: {
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
        GuestId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        DocumentType: {
          type: DataTypes.ENUM('CCCD', 'Passport'),
          allowNull: false,
        },
        DocumentNumber: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        FullName: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        DateOfBirth: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        Gender: {
          type: DataTypes.STRING(20),
          defaultValue: 'Khác',
        },
        Nationality: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        DocumentExpiryDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        IdCardImageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        SignatureImageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        ScannedAt: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        ScannedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
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
      console.log('✅ Đã kiểm tra/tạo bảng GuestIdentityDocuments');
    }

    // 3. Thêm permission CHECKIN_CREATE theo Spec 8
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
    try {
      await qi.dropTable('GuestIdentityDocuments');
    } catch (_) {}
  }
};
