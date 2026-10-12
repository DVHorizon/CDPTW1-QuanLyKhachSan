'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding FoodOrders (${count.toLocaleString()})...`);

  const [stays] = await sequelize.query('SELECT StayId FROM Stays');
  const stayIds = stays.map(s => s.StayId);

  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [menuItems] = await sequelize.query('SELECT MenuItemId, Price FROM MenuItems LIMIT 1000');
  const sampleItems = menuItems.length > 0 ? menuItems : [{ MenuItemId: 1, Price: 250000 }];

  const statuses = ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
  const orderTypes = ['RoomService', 'DineIn', 'TakeAway'];

  // 1. Seed FoodOrders
  await seedInChunks('FoodOrders', (i) => {
    const isRoomService = Math.random() < 0.6;
    const stayId = (isRoomService && stayIds.length > 0) ? stayIds[(i - 1) % stayIds.length] : null;
    const tableId = (!isRoomService) ? (((i - 1) % 500) + 1) : null;
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;

    return {
      StayId: stayId,
      TableId: tableId,
      UserId: userId,
      OrderTime: faker.dateInPast(90),
      OrderType: isRoomService ? 'RoomService' : faker.random.arrayElement(orderTypes),
      Status: faker.random.arrayElement(statuses),
      TotalAmount: faker.vndPrice(250000, 2500000),
      PaymentMode: isRoomService ? 'RoomInvoice' : 'Cash',
      Note: Math.random() < 0.25 ? 'Ít cay, không hành lá, giao kèm đá lạnh' : null,
    };
  }, count, 5000);

  // 2. Seed FoodOrderDetails (Trung bình 4 món / order)
  const detailTotal = count * 4;
  console.log(`   • Seeding FoodOrderDetails (${detailTotal.toLocaleString()})...`);

  await seedInChunks('FoodOrderDetails', (i) => {
    const orderId = Math.floor((i - 1) / 4) + 1;
    const item = sampleItems[(i - 1) % sampleItems.length];
    const qty = faker.random.int(1, 3);
    const price = Number(item.Price) || 200000;

    return {
      FoodOrderId: orderId,
      MenuItemId: item.MenuItemId,
      Quantity: qty,
      UnitPrice: price,
      TotalPrice: qty * price,
      Note: null,
    };
  }, detailTotal, 5000);

  console.log(`   ✅ FoodOrders & FoodOrderDetails completed.`);
}

module.exports = { run };
