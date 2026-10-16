'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding Stays (${count.toLocaleString()})...`);

  const [bookings] = await sequelize.query('SELECT BookingId, CheckInDate, CheckOutDate, DepositAmount FROM Bookings');
  const [rooms] = await sequelize.query('SELECT RoomId FROM Rooms');
  const roomIds = rooms.map(r => r.RoomId);
  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  await seedInChunks('Stays', (i) => {
    const b = (bookings.length > 0) ? bookings[(i - 1) % bookings.length] : { BookingId: 1, CheckInDate: new Date(), CheckOutDate: new Date() };
    const roomId = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const actualCheckIn = new Date(b.CheckInDate);
    const expCheckOut = new Date(b.CheckOutDate);
    const actualCheckOut = Math.random() < 0.6 ? expCheckOut : null;

    return {
      BookingId: b.BookingId,
      RoomId: roomId,
      ActualCheckIn: actualCheckIn,
      ExpectedCheckOut: expCheckOut,
      ActualCheckOut: actualCheckOut,
      Status: actualCheckOut ? 'CheckedOut' : 'CheckedIn',
      DepositAmount: b.DepositAmount || 500000,
    };
  }, count, 5000);

  // Seed RoomMoveHistory
  console.log(`   • Seeding RoomMoveHistory (${count.toLocaleString()})...`);
  const reasons = ['Khách yêu cầu tầng cao hơn', 'Nâng cấp phòng Suite VIP', 'Bảo trì điều hòa khẩn cấp', 'Đổi view hướng biển hoàng hôn'];

  await seedInChunks('RoomMoveHistory', (i) => {
    const fromRoom = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const toRoom = roomIds.length > 0 ? roomIds[i % roomIds.length] : 1;
    const movedBy = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;

    return {
      StayId: i,
      FromRoomId: fromRoom,
      ToRoomId: toRoom,
      MoveDate: faker.dateInPast(30),
      Reason: faker.random.arrayElement(reasons),
      MovedBy: movedBy,
    };
  }, count, 5000);

  console.log(`   ✅ Stays & RoomMoveHistory completed.`);
}

module.exports = { run };
