'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding InventoryItems (${count.toLocaleString()})...`);

  const itemNames = [
    'Khăn tắm cotton cao cấp 5 sao', 'Áo choàng tắm sợi tre', 'Dép đi trong phòng thêu logo',
    'Bộ dầu gội sữa tắm hữu cơ 100ml', 'Bàn chải & kem đánh răng sinh học', 'Lược gỗ tự nhiên',
    'Dao cạo râu inox cao cấp', 'Trà đen Bá Tước hộp 50 gói', 'Cà phê viên nén Nespresso',
    'Nước khoáng thiên nhiên chai thủy tinh 500ml', 'Bia thủ công IPA lon', 'Rượu vang đỏ mini 187ml',
    'Snack khoai tây sấy giòn', 'Hạt điều rang muối hộp thiếc', 'Nước ngọt Coca-Cola lon'
  ];

  const units = ['Cái', 'Chai', 'Lon', 'Gói', 'Hộp', 'Bộ', 'Chiếc'];
  const types = ['Minibar', 'Linen', 'Amenity', 'CleaningChemical', 'Uniform'];

  // 1. Seed InventoryItems
  await seedInChunks('InventoryItems', (i) => {
    const name = itemNames[(i - 1) % itemNames.length];
    return {
      ItemCode: `INV-${String(i).padStart(6, '0')}`,
      ItemName: `${name} #${i}`,
      ItemType: faker.random.arrayElement(types),
      Unit: faker.random.arrayElement(units),
      Quantity: faker.random.int(50, 1000),
      MinQuantity: 20,
      UnitCost: faker.vndPrice(15000, 250000),
      Status: 'Active',
      IsDeleted: false,
    };
  }, count, 5000);

  // 2. Seed InventoryTransactions
  console.log(`   • Seeding InventoryTransactions (${count.toLocaleString()})...`);
  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [rooms] = await sequelize.query('SELECT RoomId FROM Rooms');
  const roomIds = rooms.map(r => r.RoomId);

  const transTypes = ['Import', 'ExportToRoom', 'Disposal', 'StockAudit'];

  await seedInChunks('InventoryTransactions', (i) => {
    const type = faker.random.arrayElement(transTypes);
    const roomId = (type === 'ExportToRoom' && roomIds.length > 0) ? roomIds[(i - 1) % roomIds.length] : null;
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;

    return {
      ItemId: i,
      RoomId: roomId,
      UserId: userId,
      TransactionType: type,
      Quantity: faker.random.int(5, 50),
      ReferenceId: i,
      TransactionDate: faker.dateInPast(60),
      Note: `Giao dịch kho tự động hóa phiếu #${i}`,
    };
  }, count, 5000);

  console.log(`   ✅ Inventory completed.`);
}

module.exports = { run };
