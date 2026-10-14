'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  const qi = sequelize.getQueryInterface();

  // 1. Seed RestaurantTables (500 bàn)
  console.log('   • Seeding RestaurantTables (500)...');
  const branches = ['Grand Horizon Phú Quốc', 'Grand Horizon Cam Ranh', 'Grand Horizon Côn Đảo', 'Grand Horizon Đà Nẵng', 'Grand Horizon Nha Trang'];
  const locations = ['Sảnh Trong Nhà VIP', 'Sân Vườn Nhiệt Đới', 'Ban Công Hướng Biển', 'Khu Bể Bơi Rooftop'];
  const tablesData = [];
  for (let i = 1; i <= 500; i++) {
    const branch = branches[(i - 1) % branches.length];
    const loc = locations[(i - 1) % locations.length];
    tablesData.push({
      BranchName: branch,
      TableNumber: `TB-${String(i).padStart(3, '0')}`,
      Location: loc,
      Capacity: faker.random.arrayElement([2, 4, 6, 8, 12]),
      IsDeleted: false,
      Status: 'Available',
    });
  }
  await qi.bulkInsert('RestaurantTables', tablesData, { ignoreDuplicates: true, logging: false });

  // 2. Seed MenuItems (100k items)
  console.log(`   • Seeding MenuItems (${count.toLocaleString()})...`);
  const [categories] = await sequelize.query('SELECT CategoryId FROM MenuCategories');
  const catIds = categories.map(c => c.CategoryId);

  await seedInChunks('MenuItems', (i) => {
    const catId = catIds.length > 0 ? catIds[(i - 1) % catIds.length] : 1;
    return {
      CategoryId: catId,
      ItemName: faker.dishName(i),
      Price: faker.dishPrice(95000, 3500000),
      Description: `Món ăn ẩm thực thượng hạng chế biến từ nguyên liệu tươi ngon hữu cơ bởi bếp trưởng 5 sao Grand Horizon (Mã món: #${i}).`,
      ImageUrl: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&lock=${i % 100}`,
      Status: 'Available',
      IsDeleted: false,
    };
  }, count, 5000);

  // 3. Seed TableReservations (100k)
  console.log(`   • Seeding TableReservations (${count.toLocaleString()})...`);
  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  await seedInChunks('TableReservations', (i) => {
    const tableId = ((i - 1) % 500) + 1;
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const resTime = faker.dateInFuture(30);

    return {
      TableId: tableId,
      UserId: userId,
      ReservationTime: resTime,
      GuestCount: faker.random.int(2, 6),
      Status: faker.random.weighted({ Confirmed: 60, Pending: 20, Completed: 15, Cancelled: 5 }),
      Note: Math.random() < 0.3 ? 'Yêu cầu chuẩn bị nến thơm và hoa bàn tiệc sinh nhật' : null,
    };
  }, count, 5000);

  console.log(`   ✅ MenuItems, Tables & TableReservations completed.`);
}

module.exports = { run };
