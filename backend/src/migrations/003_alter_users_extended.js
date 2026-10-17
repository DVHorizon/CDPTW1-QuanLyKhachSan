'use strict';

/**
 * Migration 003 – Thêm các cột mở rộng vào bảng Users
 * Department, Permissions, SecurityPolicy, IsDeleted
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    const tableDesc = await qi.describeTable('Users');
    const existingCols = Object.keys(tableDesc);

    const colsToAdd = [
      { name: 'Department',     def: { type: DataTypes.STRING(100), allowNull: true, after: 'Status' } },
      { name: 'Permissions',    def: { type: DataTypes.TEXT,        allowNull: true, after: 'Department' } },
      { name: 'SecurityPolicy', def: { type: DataTypes.TEXT,        allowNull: true, after: 'Permissions' } },
      { name: 'IsDeleted',      def: { type: DataTypes.BOOLEAN,     defaultValue: false, allowNull: false, after: 'SecurityPolicy' } },
    ];

    for (const col of colsToAdd) {
      if (!existingCols.includes(col.name)) {
        await qi.addColumn('Users', col.name, col.def);
        console.log(`✅ Thêm cột Users.${col.name}`);
      } else {
        console.log(`⏭️  Cột Users.${col.name} đã tồn tại – bỏ qua`);
      }
    }

    // Cập nhật giá trị Department mặc định cho người dùng hiện tại dựa trên Role
    try {
      await qi.sequelize.query(`
        UPDATE Users u
        LEFT JOIN Roles r ON u.RoleId = r.RoleId
        SET u.Department = CASE 
          WHEN r.RoleName = 'Admin' THEN 'Quản Trị & Công Nghệ'
          WHEN r.RoleName = 'Receptionist' THEN 'Lễ Tân & Tiền Sảnh'
          WHEN r.RoleName = 'Kitchen' THEN 'Ẩm Thực F&B & Bếp'
          WHEN r.RoleName = 'Housekeeping' THEN 'Buồng Phòng & Kỹ Thuật'
          ELSE 'Lễ Tân & Tiền Sảnh'
        END
        WHERE u.Department IS NULL
      `);
      console.log('✅ Cập nhật phòng ban mặc định theo vai trò cho các tài khoản hiện có.');
    } catch (_) {}

    console.log('\n✅ Migration 003 hoàn thành — bảng Users đã mở rộng đầy đủ các trường.');
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    const colsToDrop = ['Department', 'Permissions', 'SecurityPolicy', 'IsDeleted'];
    for (const col of colsToDrop) {
      try {
        await qi.removeColumn('Users', col);
        console.log(`🗑️  Xóa cột Users.${col}`);
      } catch (_) {}
    }
  }
};
