'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding Bookings (${count.toLocaleString()})...`);

  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [roomTypes] = await sequelize.query('SELECT RoomTypeId, BasePrice, AdultCapacity FROM RoomTypes');
  const [vouchers] = await sequelize.query('SELECT VoucherId FROM Vouchers');
  const voucherIds = vouchers.map(v => v.VoucherId);

  const [otas] = await sequelize.query('SELECT OTAChannelId FROM OTAChannels');
  const otaIds = otas.map(o => o.OTAChannelId);

  await seedInChunks('Bookings', (i) => {
    const checkIn = faker.dateInPast(365);
    const nights = faker.nights();
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);

    const adults = faker.adults();
    const children = faker.children();
    const roomQuantity = faker.random.weighted({ 1: 85, 2: 12, 3: 3 });

    const rt = (roomTypes.length > 0) 
      ? roomTypes[(i - 1) % roomTypes.length] 
      : { RoomTypeId: 1, BasePrice: 2000000, AdultCapacity: 2 };

    const basePrice = Number(rt.BasePrice) || 2000000;
    const subtotal = basePrice * nights * roomQuantity;
    const surcharge = adults > (rt.AdultCapacity || 2)
      ? (adults - rt.AdultCapacity) * 250000 * nights * roomQuantity
      : 0;

    const hasVoucher = Math.random() < 0.25;
    const voucherId = (hasVoucher && voucherIds.length > 0) ? faker.random.arrayElement(voucherIds) : null;
    const discount = voucherId ? Math.min(500000, Math.floor(subtotal * 0.1)) : 0;
    const totalAmount = Math.max(0, subtotal + surcharge - discount);
    const deposit = Math.round(totalAmount * 0.3); // cọc 30%

    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const isOTA = Math.random() < 0.35;
    const otaId = (isOTA && otaIds.length > 0) ? faker.random.arrayElement(otaIds) : null;
    const confCode = faker.confirmationCode();

    return {
      UserId: userId,
      RoomTypeId: rt.RoomTypeId,
      VoucherId: voucherId,
      OTAChannelId: otaId,
      CheckInDate: checkIn,
      CheckOutDate: checkOut,
      NumberOfNights: nights,
      Adults: adults,
      Children: children,
      RoomQuantity: roomQuantity,
      RoomSubtotal: subtotal,
      SurchargeAmount: surcharge,
      DiscountAmount: discount,
      TotalAmount: totalAmount,
      DepositAmount: deposit,
      Status: faker.bookingStatus(),
      BookingSource: isOTA ? 'OTAChannel' : faker.bookingSource(),
      BookingQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOOKING_${confCode}`,
      ConfirmationCode: confCode,
      ConfirmationSentAt: checkIn,
    };
  }, count, 5000);

  console.log(`   ✅ Bookings completed.`);
}

module.exports = { run };
