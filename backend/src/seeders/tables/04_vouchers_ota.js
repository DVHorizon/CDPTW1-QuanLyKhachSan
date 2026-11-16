'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  const qi = sequelize.getQueryInterface();

  // 1. Seed OTAChannels (50 channels cố định & mở rộng)
  console.log('   • Seeding OTAChannels (50)...');
  const otaNames = ['Agoda', 'Booking.com', 'Traveloka', 'Expedia', 'Trip.com', 'Klook', 'Airbnb', 'Hotels.com'];
  const otaData = [];
  for (let i = 1; i <= 50; i++) {
    const baseName = otaNames[(i - 1) % otaNames.length];
    otaData.push({
      ChannelName: `${baseName} Gateway Channel #${i}`,
      ApiType: 'REST_XML_V2',
      ApiKey: `api_live_ota_secret_key_${i}_${faker.confirmationCode()}`,
      Status: 'Active',
    });
  }
  await qi.bulkInsert('OTAChannels', otaData, { ignoreDuplicates: true, logging: false });

  // 2. Seed Vouchers
  console.log(`   • Seeding Vouchers (${count.toLocaleString()})...`);
  await seedInChunks('Vouchers', (i) => {
    const isPercent = Math.random() < 0.6;
    const discountVal = isPercent ? faker.random.int(5, 30) : faker.vndPrice(100000, 1000000);
    const startDate = faker.dateInPast(90);
    const endDate = faker.dateInFuture(180);

    return {
      Code: `VOUCHER${i}${faker.confirmationCode().slice(0, 4)}`,
      DiscountType: isPercent ? 'Percent' : 'FixedAmount',
      DiscountValue: discountVal,
      MinOrderAmount: faker.vndPrice(500000, 2000000),
      MaxDiscountAmount: isPercent ? 1000000 : null,
      StartDate: startDate,
      EndDate: endDate,
      UsageLimit: faker.random.int(50, 500),
      UsedCount: faker.random.int(0, 40),
      IsDeleted: false,
      Status: 'Active',
    };
  }, count, 5000);

  // 3. Seed OTARoomMappings
  console.log(`   • Seeding OTARoomMappings (${count.toLocaleString()})...`);
  const [otaRows] = await sequelize.query('SELECT OTAChannelId FROM OTAChannels');
  const otaIds = otaRows.map(r => r.OTAChannelId);
  const [rtRows] = await sequelize.query('SELECT RoomTypeId FROM RoomTypes');
  const rtIds = rtRows.map(r => r.RoomTypeId);

  await seedInChunks('OTARoomMappings', (i) => {
    const channelId = otaIds.length > 0 ? otaIds[(i - 1) % otaIds.length] : 1;
    const roomTypeId = rtIds.length > 0 ? rtIds[(i - 1) % rtIds.length] : 1;

    return {
      OTAChannelId: channelId,
      RoomTypeId: roomTypeId,
      OTARoomTypeCode: `OTA-MAP-RT-${roomTypeId}-CH-${channelId}-${i}`,
      Status: 'Active',
      LastSyncedAt: faker.dateInPast(5),
    };
  }, count, 5000);

  console.log(`   ✅ Vouchers, OTAChannels & OTARoomMappings completed.`);
}

module.exports = { run };
