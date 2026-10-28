'use strict';

/**
 * Migration 008 – Hỗ trợ Đặc tả Chức năng Đổi phòng cho khách đang lưu trú
 * Mã tính năng: FEAT-ROOM-MOVE-01 (Spec 10)
 * Tạo bảng StayRoomSegments, RoomMoveRequests và bổ sung Permissions cho Room Move
 */

const sequelize = require('../config/sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;
    const tables = await qi.showAllTables();

    // 1. Tạo bảng StayRoomSegments (Lưu lịch sử các đoạn phòng liên tục không chồng lấn)
    if (!tables.includes('StayRoomSegments')) {
      await qi.createTable('StayRoomSegments', {
        SegmentId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        StayId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        RoomId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        ValidFrom: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        ValidTo: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        Reason: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        IncidentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        MovedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        CreatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      console.log('✅ Tạo bảng StayRoomSegments');
    }

    // 2. Tạo bảng RoomMoveRequests (Ghi nhận chi tiết yêu cầu, sự cố và trạng thái xử lý)
    if (!tables.includes('RoomMoveRequests')) {
      await qi.createTable('RoomMoveRequests', {
        MoveId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        StayId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        CurrentRoomId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        TargetRoomId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        IncidentType: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'MAINTENANCE',
        },
        IncidentSeverity: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'LOW',
        },
        IncidentDescription: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        MoveReason: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        EffectiveAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        OldRoomDisposition: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'DIRTY',
        },
        RateAdjustment: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'KEEP_ORIGINAL',
        },
        OriginalRate: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        NewRate: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        RateDifference: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        GuestAcknowledgement: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'ACCEPTED',
        },
        MoveStatus: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'REQUESTED',
        },
        IsEmergency: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ApprovalStatus: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'NOT_REQUIRED',
        },
        ApprovedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        ApprovedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        Version: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 1,
        },
        IdempotencyKey: {
          type: DataTypes.STRING(100),
          allowNull: true,
          unique: true,
        },
        IntegrationStatus: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        Note: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        CreatedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        CreatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        UpdatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });
      console.log('✅ Tạo bảng RoomMoveRequests');
    }

    // 3. Thêm các quyền Room Move vào Permissions
    try {
      const permsToAdd = [
        { PermissionName: 'ROOMMOVE_VIEW', Module: 'PMS', Description: 'Xem yêu cầu đổi phòng và lịch sử phòng' },
        { PermissionName: 'ROOMMOVE_CREATE', Module: 'PMS', Description: 'Tạo yêu cầu đổi phòng do sự cố' },
        { PermissionName: 'ROOMMOVE_APPROVE', Module: 'PMS', Description: 'Duyệt yêu cầu đổi phòng và chính sách giá' },
        { PermissionName: 'ROOMMOVE_COMPLETE', Module: 'PMS', Description: 'Hoàn tất bàn giao và phân bổ phòng mới' },
      ];

      for (const p of permsToAdd) {
        const [existing] = await sequelize.query(
          'SELECT PermissionId FROM Permissions WHERE PermissionName = ?',
          { replacements: [p.PermissionName] }
        );
        if (!existing || existing.length === 0) {
          await sequelize.query(
            'INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES (?, ?, ?, NOW())',
            { replacements: [p.PermissionName, p.Module, p.Description] }
          );
        }
      }

      // Gán các quyền này cho Roles (1: Admin, 2: Manager, 3: Receptionist)
      const [adminPerms] = await sequelize.query('SELECT PermissionId FROM Permissions WHERE PermissionName LIKE "ROOMMOVE_%"');
      for (const perm of adminPerms) {
        for (const roleId of [1, 2, 3]) {
          const [hasPerm] = await sequelize.query(
            'SELECT * FROM RolePermissions WHERE RoleId = ? AND PermissionId = ?',
            { replacements: [roleId, perm.PermissionId] }
          );
          if (!hasPerm || hasPerm.length === 0) {
            await sequelize.query(
              'INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (?, ?)',
              { replacements: [roleId, perm.PermissionId] }
            );
          }
        }
      }
      console.log('✅ Cập nhật quyền RoomMove trong Permissions & RolePermissions');
    } catch (permErr) {
      console.warn('⚠️ Ghi chú Permissions:', permErr.message);
    }

    console.log('✅ Migration 008 (Spec 10: Room Move) hoàn tất.');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    try { await qi.dropTable('RoomMoveRequests'); } catch (_) {}
    try { await qi.dropTable('StayRoomSegments'); } catch (_) {}
    console.log('🗑️ Migration 008 rollback hoàn tất.');
  },
};

if (require.main === module) {
  (async () => {
    try {
      const qi = sequelize.getQueryInterface();
      const Sequelize = require('sequelize');
      await module.exports.up(qi, Sequelize);
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi chạy migration 008:', err);
      process.exit(1);
    }
  })();
}
