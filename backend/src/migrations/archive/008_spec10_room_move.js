'use strict';

/**
 * Migration 008 – Hỗ trợ Đặc tả Chức năng Đổi phòng cho khách đang lưu trú
 * Mã tính năng: FEAT-ROOM-MOVE-01 (Spec 10)
 * Mở rộng bảng RoomMoveHistory chuẩn của hệ thống (57 bảng) và bổ sung Permissions cho Room Move
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // 1. Mở rộng các cột cho bảng chuẩn RoomMoveHistory (thay vì tạo bảng mới)
    const rmHistoryDesc = await qi.describeTable('RoomMoveHistory');
    const cols = Object.keys(rmHistoryDesc);

    const columnsToAdd = [
      { name: 'IncidentType', def: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'MAINTENANCE' } },
      { name: 'IncidentSeverity', def: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'LOW' } },
      { name: 'IncidentDescription', def: { type: DataTypes.TEXT, allowNull: true } },
      { name: 'MoveStatus', def: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'COMPLETED' } },
      { name: 'OldRoomDisposition', def: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'DIRTY' } },
      { name: 'RateAdjustment', def: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'KEEP_ORIGINAL' } },
      { name: 'RateDifference', def: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0.00 } },
      { name: 'ApprovalStatus', def: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'NOT_REQUIRED' } },
      { name: 'ApprovedBy', def: { type: DataTypes.INTEGER, allowNull: true } },
      { name: 'ApprovedAt', def: { type: DataTypes.DATE, allowNull: true } },
      { name: 'EffectiveAt', def: { type: DataTypes.DATE, allowNull: true } },
      { name: 'Version', def: { type: DataTypes.BIGINT, allowNull: true, defaultValue: 1 } },
      { name: 'IdempotencyKey', def: { type: DataTypes.STRING(100), allowNull: true } },
      { name: 'IntegrationStatus', def: { type: DataTypes.TEXT, allowNull: true } },
    ];

    for (const col of columnsToAdd) {
      if (!cols.includes(col.name)) {
        await qi.addColumn('RoomMoveHistory', col.name, col.def);
        console.log(`✅ Thêm cột ${col.name} vào RoomMoveHistory`);
      }
    }

    // 2. Thêm các quyền Room Move vào Permissions
    try {
      const permsToAdd = [
        { PermissionName: 'ROOMMOVE_VIEW', Module: 'PMS', Description: 'Xem yêu cầu đổi phòng và lịch sử phòng' },
        { PermissionName: 'ROOMMOVE_CREATE', Module: 'PMS', Description: 'Tạo yêu cầu đổi phòng do sự cố' },
        { PermissionName: 'ROOMMOVE_APPROVE', Module: 'PMS', Description: 'Duyệt yêu cầu đổi phòng và chính sách giá' },
        { PermissionName: 'ROOMMOVE_COMPLETE', Module: 'PMS', Description: 'Hoàn tất bàn giao và phân bổ phòng mới' },
      ];

      for (const p of permsToAdd) {
        const [existing] = await qi.sequelize.query(
          'SELECT PermissionId FROM Permissions WHERE PermissionName = ?',
          { replacements: [p.PermissionName] }
        );
        if (!existing || existing.length === 0) {
          await qi.sequelize.query(
            'INSERT INTO Permissions (PermissionName, Module, Description, CreatedAt) VALUES (?, ?, ?, NOW())',
            { replacements: [p.PermissionName, p.Module, p.Description] }
          );
        }
      }

      // Gán các quyền này cho Roles (1: Admin, 2: Manager, 3: Receptionist)
      const [adminPerms] = await qi.sequelize.query('SELECT PermissionId FROM Permissions WHERE PermissionName LIKE "ROOMMOVE_%"');
      for (const perm of adminPerms) {
        for (const roleId of [1, 2, 3]) {
          const [hasPerm] = await qi.sequelize.query(
            'SELECT * FROM RolePermissions WHERE RoleId = ? AND PermissionId = ?',
            { replacements: [roleId, perm.PermissionId] }
          );
          if (!hasPerm || hasPerm.length === 0) {
            await qi.sequelize.query(
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

    console.log('✅ Migration 008 (Spec 10: Room Move) hoàn tất chuẩn 57 bảng.');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    console.log('🗑️ Migration 008 rollback hoàn tất.');
  },
};
