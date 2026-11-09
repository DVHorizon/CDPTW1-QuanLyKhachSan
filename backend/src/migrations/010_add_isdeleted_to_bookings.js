'use strict';

/**
 * Migration 010 – Thêm cột IsDeleted (Soft Delete / Thùng rác) vào bảng Bookings
 * Chạy: node src/migrations/010_add_isdeleted_to_bookings.js
 */

const sequelize = require('../config/sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    const bookingsDesc = await qi.describeTable('Bookings');
    const bookingCols = Object.keys(bookingsDesc);

    if (!bookingCols.includes('IsDeleted')) {
      await qi.addColumn('Bookings', 'IsDeleted', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('✅ Thêm cột Bookings.IsDeleted (Soft Delete)');
    } else {
      console.log('ℹ️ Cột Bookings.IsDeleted đã tồn tại.');
    }
  },

  async down(queryInterface) {
    const qi = queryInterface;
    try {
      await qi.removeColumn('Bookings', 'IsDeleted');
      console.log('🗑️ Migration 010 rollback hoàn tất.');
    } catch (_) {}
  }
};

if (require.main === module) {
  (async () => {
    try {
      const qi = sequelize.getQueryInterface();
      const Sequelize = require('sequelize');
      await module.exports.up(qi, Sequelize);
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi chạy migration 010:', err);
      process.exit(1);
    }
  })();
}
