'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding RoomTypes (${count.toLocaleString()})...`);

  const [amenityRows] = await sequelize.query('SELECT AmenityId FROM Amenities');
  const amenityIds = amenityRows.map(r => r.AmenityId);

  // 1. Seed RoomTypes
  await seedInChunks('RoomTypes', (i) => {
    const adultCap = faker.random.weighted({ 2: 70, 3: 15, 4: 10, 6: 5 });
    const childCap = faker.random.weighted({ 1: 60, 2: 30, 0: 10 });
    const basePrice = faker.roomTypeBasePrice(i);

    return {
      TypeName: faker.roomTypeName(i),
      Description: `Hạng phòng nghỉ dưỡng cao cấp đạt chuẩn 5 sao với thiết kế sang trọng, ban công riêng biệt hướng biển hoặc sân vườn nhiệt đới (Mã loại: ${i}).`,
      BasePrice: basePrice,
      MaxOccupancy: Number(adultCap) + Number(childCap),
      AdultCapacity: adultCap,
      ChildCapacity: childCap,
      ImageUrl: `https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&lock=${i % 100}`,
      Status: 'Active',
      IsDeleted: false,
    };
  }, count, 5000);

  // 2. Seed RoomTypeAmenities (Mối quan hệ N-N, trung bình 3 tiện nghi / loại phòng)
  console.log(`   • Seeding RoomTypeAmenities (${(count * 3).toLocaleString()})...`);
  const rtaTotal = count * 3;
  await seedInChunks('RoomTypeAmenities', (i) => {
    const roomTypeId = Math.floor((i - 1) / 3) + 1;
    const offset = (i - 1) % 3;
    const amenityId = amenityIds.length > 0 
      ? amenityIds[(roomTypeId * 3 + offset) % amenityIds.length] 
      : 1;

    return {
      RoomTypeId: roomTypeId,
      AmenityId: amenityId,
    };
  }, rtaTotal, 5000);

  // 3. Seed PricingRules (1 rule / loại phòng)
  console.log(`   • Seeding PricingRules (${count.toLocaleString()})...`);
  await seedInChunks('PricingRules', (i) => {
    const startDate = faker.dateInPast(60);
    const endDate = faker.dateInFuture(180);
    const multiplier = faker.random.arrayElement([1.0, 1.15, 1.25, 1.5, 0.9]);

    return {
      RoomTypeId: i,
      RuleName: `Quy tắc giá theo mùa #${i}`,
      StartDate: startDate,
      EndDate: endDate,
      MinPrice: 1000000,
      MaxPrice: 30000000,
      PriceMultiplier: multiplier,
      Conditions: multiplier > 1.0 ? 'Cuối tuần & Mùa cao điểm du lịch' : 'Khuyến mãi mùa thấp điểm',
      Priority: faker.random.int(1, 10),
      Status: 'Active',
    };
  }, count, 5000);

  console.log(`   ✅ RoomTypes, Amenities mapping & PricingRules completed.`);
}

module.exports = { run };
