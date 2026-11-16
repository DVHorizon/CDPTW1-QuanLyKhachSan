'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding Rooms (${count.toLocaleString()})...`);

  const [branches] = await sequelize.query('SELECT BranchId FROM Branches');
  const branchIds = branches.map(b => b.BranchId);

  const [roomTypes] = await sequelize.query('SELECT RoomTypeId FROM RoomTypes');
  const roomTypeIds = roomTypes.map(rt => rt.RoomTypeId);

  const statuses = ['CleanAvailable', 'Occupied', 'Dirty', 'OutOfOrder', 'Inspected'];

  await seedInChunks('Rooms', (i) => {
    const branchId = branchIds.length > 0 ? branchIds[(i - 1) % branchIds.length] : 1;
    const roomTypeId = roomTypeIds.length > 0 ? roomTypeIds[(i - 1) % roomTypeIds.length] : 1;
    const floor = ((i - 1) % 20) + 1; // Tầng 1 đến 20
    const roomIndexOnFloor = Math.floor((i - 1) / 20) % 50 + 1; // 1 đến 50
    const roomNumber = `${branchId}${String(floor).padStart(2, '0')}${String(roomIndexOnFloor).padStart(2, '0')}-${i}`;

    return {
      BranchId: branchId,
      RoomTypeId: roomTypeId,
      RoomNumber: roomNumber,
      Floor: floor,
      Status: faker.random.arrayElement(statuses),
      Description: `Phòng nghỉ thực tế tầng ${floor}, view hướng tự nhiên, mã định danh #${i}`,
      IsDeleted: false,
    };
  }, count, 5000);

  console.log(`   ✅ Rooms completed.`);
}

module.exports = { run };
