'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding HousekeepingAssignments (${count.toLocaleString()})...`);

  const [rooms] = await sequelize.query('SELECT RoomId FROM Rooms');
  const roomIds = rooms.map(r => r.RoomId);

  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [stays] = await sequelize.query('SELECT StayId FROM Stays');
  const stayIds = stays.map(s => s.StayId);

  const hkStatuses = ['Assigned', 'InProgress', 'Completed', 'Inspected'];

  // 1. HousekeepingAssignments
  await seedInChunks('HousekeepingAssignments', (i) => {
    const roomId = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const staffId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const stayId = (stayIds.length > 0 && Math.random() < 0.7) ? stayIds[(i - 1) % stayIds.length] : null;
    const status = faker.random.arrayElement(hkStatuses);
    const assignDate = faker.dateInPast(30);

    return {
      RoomId: roomId,
      UserId: staffId,
      StayId: stayId,
      AssignmentDate: assignDate,
      Priority: faker.random.int(1, 3),
      Status: status,
      StartedAt: status !== 'Assigned' ? assignDate : null,
      CompletedAt: (status === 'Completed' || status === 'Inspected') ? new Date(assignDate.getTime() + 1800000) : null,
      Note: `Nhiệm vụ dọn phòng định kỳ ca làm việc #${i}`,
    };
  }, count, 5000);

  // 2. MinibarUsages
  console.log(`   • Seeding MinibarUsages (${count.toLocaleString()})...`);
  await seedInChunks('MinibarUsages', (i) => {
    const stayId = stayIds.length > 0 ? stayIds[(i - 1) % stayIds.length] : 1;
    const staffId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const qty = faker.random.int(1, 4);
    const unitPrice = faker.random.arrayElement([45000, 65000, 95000, 150000, 250000]);

    return {
      StayId: stayId,
      ItemId: ((i - 1) % 100) + 1, // ánh xạ 100 mặt hàng minibar trong kho
      RecordedBy: staffId,
      Quantity: qty,
      UsageDate: faker.dateInPast(20),
      UnitPrice: unitPrice,
      TotalAmount: qty * unitPrice,
    };
  }, count, 5000);

  console.log(`   ✅ Housekeeping & MinibarUsages completed.`);
}

module.exports = { run };
