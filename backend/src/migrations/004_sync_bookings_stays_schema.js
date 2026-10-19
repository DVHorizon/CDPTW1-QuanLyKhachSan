'use strict';

/**
 * Migration 004 – Đồng bộ schema bảng Stays và Bookings
 * Chạy: node src/migrations/004_sync_bookings_stays_schema.js
 *
 * Đồng bộ các cột:
 * - Stays.CheckInTime & Stays.CheckOutTime: Tương thích hoàn toàn giữa ActualCheckIn/ActualCheckOut và CheckInTime/CheckOutTime
 * - Bookings.Note: Ghi chú đặt phòng của lễ tân và khách hàng
 */

const sequelize = require('../config/sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // 1. Kiểm tra bảng Stays
    const staysDesc = await qi.describeTable('Stays');
    const stayCols = Object.keys(staysDesc);

    if (!stayCols.includes('CheckInTime')) {
      await qi.addColumn('Stays', 'CheckInTime', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Thêm cột Stays.CheckInTime');
      await qi.sequelize.query('UPDATE Stays SET CheckInTime = ActualCheckIn WHERE ActualCheckIn IS NOT NULL');
    }

    if (!stayCols.includes('CheckOutTime')) {
      await qi.addColumn('Stays', 'CheckOutTime', {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log('✅ Thêm cột Stays.CheckOutTime');
      await qi.sequelize.query('UPDATE Stays SET CheckOutTime = ActualCheckOut WHERE ActualCheckOut IS NOT NULL');
    }

    // 2. Kiểm tra bảng Bookings
    const bookingsDesc = await qi.describeTable('Bookings');
    const bookingCols = Object.keys(bookingsDesc);

    if (!bookingCols.includes('Note')) {
      await qi.addColumn('Bookings', 'Note', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
      console.log('✅ Thêm cột Bookings.Note');
    }

    console.log('✅ Migration 004 hoàn tất: Stays và Bookings đã đồng bộ hoàn chỉnh.');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    try { await qi.removeColumn('Stays', 'CheckInTime'); } catch (_) {}
    try { await qi.removeColumn('Stays', 'CheckOutTime'); } catch (_) {}
    try { await qi.removeColumn('Bookings', 'Note'); } catch (_) {}
    console.log('🗑️ Migration 004 rollback hoàn tất.');
  }
};

// Cho phép chạy trực tiếp bằng lệnh node
if (require.main === module) {
  (async () => {
    try {
      const qi = sequelize.getQueryInterface();
      const Sequelize = require('sequelize');
      await module.exports.up(qi, Sequelize);
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi chạy migration 004:', err);
      process.exit(1);
    }
  })();
}
