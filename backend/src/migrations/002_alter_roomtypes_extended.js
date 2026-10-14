'use strict';

/**
 * Migration 002 – Thêm các cột mở rộng vào bảng RoomTypes
 * Chạy: node src/migrations/002_alter_roomtypes_extended.js
 *
 * Mục đích: Đồng bộ bảng RoomTypes (Sequelize) với dữ liệu
 * mà trang Admin RoomTypeManagement.jsx đang gửi lên.
 * Sau migration này, dữ liệu từ Admin sẽ xuất hiện ngay
 * trên trang Tìm kiếm của Khách hàng (roomSearchController).
 */

const sequelize = require('../config/sequelize');

async function up() {
  const qi = sequelize.getQueryInterface();
  const { DataTypes } = require('sequelize');

  // Lấy danh sách cột hiện có để tránh lỗi "column already exists"
  const tableDesc = await qi.describeTable('RoomTypes');
  const existingCols = Object.keys(tableDesc);

  const colsToAdd = [
    { name: 'TypeCode',          def: { type: DataTypes.STRING(20),      allowNull: true,  after: 'RoomTypeId' } },
    { name: 'AreaSqm',           def: { type: DataTypes.DECIMAL(8,2),    allowNull: true,  after: 'ImageUrl' } },
    { name: 'TotalRooms',        def: { type: DataTypes.INTEGER,          defaultValue: 0,  after: 'AreaSqm' } },
    { name: 'BedType',           def: { type: DataTypes.STRING(100),     allowNull: true,  after: 'TotalRooms' } },
    { name: 'ViewType',          def: { type: DataTypes.STRING(100),     allowNull: true,  after: 'BedType' } },
    { name: 'FloorRange',        def: { type: DataTypes.STRING(50),      allowNull: true,  after: 'ViewType' } },
    { name: 'TurnoverMinutes',   def: { type: DataTypes.INTEGER,          defaultValue: 30, after: 'FloorRange' } },
    { name: 'WeekendMultiplier', def: { type: DataTypes.DECIMAL(4,2),    defaultValue: 1.00, after: 'TurnoverMinutes' } },
    { name: 'Amenities',         def: { type: DataTypes.TEXT,             allowNull: true,  after: 'WeekendMultiplier' } },
  ];

  for (const col of colsToAdd) {
    if (!existingCols.includes(col.name)) {
      await qi.addColumn('RoomTypes', col.name, col.def);
      console.log(`✅ Thêm cột RoomTypes.${col.name}`);
    } else {
      console.log(`⏭️  Cột RoomTypes.${col.name} đã tồn tại – bỏ qua`);
    }
  }

  // Thêm UNIQUE index cho TypeCode (nếu chưa có)
  try {
    await qi.addIndex('RoomTypes', ['TypeCode'], { unique: true, name: 'idx_roomtypes_typecode' });
    console.log('✅ Thêm unique index TypeCode');
  } catch (_) {
    console.log('⏭️  Index TypeCode đã tồn tại – bỏ qua');
  }

  console.log('\n✅ Migration 002 hoàn thành — bảng RoomTypes đã mở rộng.');
}

async function down() {
  const qi = sequelize.getQueryInterface();
  const colsToDrop = ['TypeCode','AreaSqm','TotalRooms','BedType','ViewType','FloorRange','TurnoverMinutes','WeekendMultiplier','Amenities'];
  for (const col of colsToDrop) {
    try { await qi.removeColumn('RoomTypes', col); console.log(`🗑️  Xóa cột RoomTypes.${col}`); }
    catch (_) {}
  }
}

// Chạy trực tiếp
sequelize.authenticate()
  .then(() => up())
  .then(() => process.exit(0))
  .catch(err => { console.error('Migration lỗi:', err); process.exit(1); });
