'use strict';

/**
 * Migration 005 – Hỗ trợ Đặc tả Chức năng Gia hạn lưu trú (FEAT-STAY-EXTEND-01)
 * Chỉ thêm cột Version vào bảng Stays (không tạo bảng mới)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // Thêm cột Version vào bảng Stays (Optimistic Locking)
    const staysDesc = await qi.describeTable('Stays');
    const stayCols = Object.keys(staysDesc);

    if (!stayCols.includes('Version')) {
      await qi.addColumn('Stays', 'Version', {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 1,
      });
      console.log('✅ Thêm cột Stays.Version (Optimistic Locking)');
    }

    console.log('✅ Migration 005 hoàn tất.');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    try { await qi.removeColumn('Stays', 'Version'); } catch (_) {}
    console.log('🗑️ Migration 005 rollback hoàn tất.');
  },
};
