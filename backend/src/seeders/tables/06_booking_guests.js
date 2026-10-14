'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  // Mỗi booking trung bình 2 khách
  const totalGuests = count * 2;
  console.log(`   • Seeding BookingGuests (${totalGuests.toLocaleString()})...`);

  const [bookings] = await sequelize.query('SELECT BookingId FROM Bookings');
  const bookingIds = bookings.map(b => b.BookingId);

  await seedInChunks('BookingGuests', (i) => {
    const bookingIdx = Math.floor((i - 1) / 2);
    const bookingId = bookingIds.length > 0 ? bookingIds[bookingIdx % bookingIds.length] : 1;
    const isPrimary = (i % 2 === 1);
    const gender = Math.random() < 0.5 ? 'Nam' : 'Nữ';

    return {
      BookingId: bookingId,
      FullName: faker.fullName(),
      Email: isPrimary ? faker.email(i, 'guest') : null,
      Phone: faker.phone(),
      IdNumber: faker.idNumber(),
      IdType: 'CCCD',
      DateOfBirth: faker.dateInPast(18000),
      Gender: gender,
      IsPrimaryGuest: isPrimary,
    };
  }, totalGuests, 5000);

  console.log(`   ✅ BookingGuests completed.`);
}

module.exports = { run };
