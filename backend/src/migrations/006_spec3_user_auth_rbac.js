'use strict';

/**
 * Migration 006 – Spec 3 User RBAC & Auth Schema Enhancement
 * Thêm các cột: Username, EmployeeCode, AvatarUrl, MustChangePassword vào Users
 * Cập nhật ma trận Permissions & RolePermissions chuẩn Spec 3
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    const tableDesc = await qi.describeTable('Users');
    const existingCols = Object.keys(tableDesc);

    const colsToAdd = [
      { name: 'Username',           def: { type: DataTypes.STRING(50), allowNull: true, unique: true, after: 'RoleId' } },
      { name: 'EmployeeCode',       def: { type: DataTypes.STRING(20), allowNull: true, unique: true, after: 'Phone' } },
      { name: 'AvatarUrl',          def: { type: DataTypes.STRING(500), allowNull: true, after: 'EmployeeCode' } },
      { name: 'MustChangePassword', def: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false, after: 'Status' } },
    ];

    for (const col of colsToAdd) {
      if (!existingCols.includes(col.name)) {
        await qi.addColumn('Users', col.name, col.def);
        console.log(`✅ Thêm cột Users.${col.name}`);
      } else {
        console.log(`⏭️  Cột Users.${col.name} đã tồn tại – bỏ qua`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    const colsToDrop = ['Username', 'EmployeeCode', 'AvatarUrl', 'MustChangePassword'];
    for (const col of colsToDrop) {
      try {
        await qi.removeColumn('Users', col);
        console.log(`🗑️  Xóa cột Users.${col}`);
      } catch (_) {}
    }
  }
};
