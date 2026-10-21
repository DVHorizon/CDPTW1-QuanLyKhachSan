'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;

  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [stays] = await sequelize.query('SELECT StayId FROM Stays');
  const stayIds = stays.map(s => s.StayId);

  // 1. Seed Reviews
  console.log(`   • Seeding Reviews (${count.toLocaleString()})...`);
  await seedInChunks('Reviews', (i) => {
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const stayId = stayIds.length > 0 ? stayIds[(i - 1) % stayIds.length] : 1;
    const rating = faker.random.arrayElement([4.5, 5.0, 4.0, 4.8, 5.0, 3.5]);

    return {
      UserId: userId,
      StayId: stayId,
      FoodOrderId: null,
      Rating: rating,
      OverallRating: rating,
      CleanlinessScore: 5,
      StaffServiceScore: 5,
      RoomComfortScore: 5,
      DiningScore: 5,
      ValueForMoneyScore: 4,
      WouldRecommend: 'YES',
      TripClassification: faker.random.arrayElement(['LEISURE', 'FAMILY', 'BUSINESS', 'COUPLE']),
      ReviewTitle: faker.reviewTitle(),
      ReviewBody: faker.reviewBody(),
      IsAnonymous: false,
      Comment: null,
    };
  }, count, 5000);

  // 2. Seed ReviewPhotos (2 ảnh / review)
  const photoTotal = count * 2;
  console.log(`   • Seeding ReviewPhotos (${photoTotal.toLocaleString()})...`);
  await seedInChunks('ReviewPhotos', (i) => {
    const revId = Math.floor((i - 1) / 2) + 1;
    return {
      ReviewId: revId,
      PhotoUrl: `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&lock=${i % 150}`,
      UploadedAt: faker.dateInPast(60),
    };
  }, photoTotal, 5000);

  // 3. Seed ChatbotKnowledgeBase
  console.log(`   • Seeding ChatbotKnowledgeBase (${count.toLocaleString()})...`);
  const sampleQAs = [
    { q: 'Khách sạn có cho phép nhận phòng sớm không?', a: 'Dạ có, quý khách có thể nhận phòng sớm tùy thuộc vào tình trạng phòng trống tại thời điểm đến.', cat: 'Checkin' },
    { q: 'Bể bơi vô cực mở cửa vào khung giờ nào?', a: 'Dạ bể bơi mở cửa từ 06:00 sáng đến 21:00 tối hàng ngày.', cat: 'Facilities' },
    { q: 'Bữa sáng buffet phục vụ tại nhà hàng nào?', a: 'Dạ tiệc buffet sáng được phục vụ tại Nhà Hàng Sen từ 06:30 đến 10:00.', cat: 'Dining' },
    { q: 'Khách sạn có dịch vụ đón tiễn sân bay không?', a: 'Dạ có xe Limousine đưa đón sân bay VIP 24/7 theo yêu cầu đặt trước của quý khách.', cat: 'Transport' }
  ];

  await seedInChunks('ChatbotKnowledgeBase', (i) => {
    const qa = sampleQAs[(i - 1) % sampleQAs.length];
    return {
      Question: `${qa.q} (Mã câu hỏi: #${i})`,
      Answer: qa.a,
      Category: qa.cat,
      Keywords: 'checkin, checkout, hồ bơi, buffet, đưa đón sân bay',
      Status: 'Active',
    };
  }, count, 5000);

  // 4. Seed ChatbotConversations
  console.log(`   • Seeding ChatbotConversations (${count.toLocaleString()})...`);
  await seedInChunks('ChatbotConversations', (i) => {
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const start = faker.dateInPast(30);
    return {
      UserId: userId,
      StartTime: start,
      EndTime: new Date(start.getTime() + 600000),
      Status: 'Closed',
    };
  }, count, 5000);

  // 5. Seed ChatbotMessages (3 tin nhắn / cuộc hội thoại)
  const msgTotal = count * 3;
  console.log(`   • Seeding ChatbotMessages (${msgTotal.toLocaleString()})...`);
  await seedInChunks('ChatbotMessages', (i) => {
    const convId = Math.floor((i - 1) / 3) + 1;
    const isBot = (i % 2 === 0);
    return {
      ConversationId: convId,
      KnowledgeId: isBot ? (((i - 1) % 100) + 1) : null,
      SenderType: isBot ? 'Bot' : 'Guest',
      MessageText: isBot ? 'Dạ Grand Horizon xin chào quý khách! Em có thể hỗ trợ gì cho kỳ nghỉ của mình ạ?' : 'Cho tôi hỏi giờ mở cửa của hồ bơi và buffet sáng nhé.',
      MessageTime: faker.dateInPast(30),
    };
  }, msgTotal, 5000);

  console.log(`   ✅ Reviews & Chatbot completed.`);
}

module.exports = { run };
