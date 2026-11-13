'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  const qi = sequelize.getQueryInterface();

  const [users] = await sequelize.query('SELECT UserId FROM Users');
  const userIds = users.map(u => u.UserId);

  const [rooms] = await sequelize.query('SELECT RoomId FROM Rooms');
  const roomIds = rooms.map(r => r.RoomId);

  const [stays] = await sequelize.query('SELECT StayId, BookingId FROM Stays');
  const [roomTypes] = await sequelize.query('SELECT RoomTypeId FROM RoomTypes');
  const roomTypeIds = roomTypes.map(rt => rt.RoomTypeId);

  // 1. Vehicles (50 xe cố định)
  console.log('   • Seeding Vehicles (50)...');
  const vTypes = ['Limousine VIP 9 chỗ', 'Mercedes S-Class Sedan', 'Ford Transit 16 chỗ', 'Toyota Alphard 7 chỗ'];
  const vehiclesData = [];
  for (let i = 1; i <= 50; i++) {
    vehiclesData.push({
      BranchName: 'Grand Horizon Phú Quốc Luxury Resort',
      PlateNumber: `51B-${String(i).padStart(3, '0')}.${faker.random.int(10, 99)}`,
      VehicleType: faker.random.arrayElement(vTypes),
      SeatCapacity: 7,
      DriverName: faker.fullName(),
      DriverPhone: faker.phone(),
      Status: 'Available',
      Description: `Xe chuyên trách đưa đón khách VIP #${i}`,
    });
  }
  await qi.bulkInsert('Vehicles', vehiclesData, { ignoreDuplicates: true, logging: false });

  // 2. NightAuditReports (365 ngày báo cáo)
  console.log('   • Seeding NightAuditReports (365)...');
  const auditData = [];
  const now = new Date();
  for (let i = 1; i <= 365; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    auditData.push({
      ReportDate: dateStr,
      GeneratedBy: userIds.length > 0 ? userIds[0] : 1,
      TotalRevenue: faker.vndPrice(80000000, 350000000),
      TotalBookings: faker.random.int(40, 150),
      TotalCheckIns: faker.random.int(30, 100),
      TotalCheckOuts: faker.random.int(25, 90),
      OccupancyRate: faker.random.float(65, 98),
      RevPAR: faker.vndPrice(1500000, 4500000),
      Status: 'Completed',
      Note: `Báo cáo quyết toán doanh thu ngày ${dateStr}`,
    });
  }
  await qi.bulkInsert('NightAuditReports', auditData, { ignoreDuplicates: true, logging: false });

  // 3. LoyaltyPointTransactions (100k)
  console.log(`   • Seeding LoyaltyPointTransactions (${count.toLocaleString()})...`);
  await seedInChunks('LoyaltyPointTransactions', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1 };
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const isEarn = Math.random() < 0.8;
    return {
      UserId: userId,
      TierId: 2,
      StayId: stay.StayId,
      Points: isEarn ? faker.random.int(500, 5000) : -faker.random.int(200, 2000),
      TransactionType: isEarn ? 'Earn' : 'Redeem',
      Description: isEarn ? `Tích điểm nghỉ dưỡng hoàn tất hóa đơn #${i}` : `Đổi voucher ẩm thực #${i}`,
    };
  }, count, 5000);

  // 4. MarketingCampaigns (100k)
  console.log(`   • Seeding MarketingCampaigns (${count.toLocaleString()})...`);
  await seedInChunks('MarketingCampaigns', (i) => ({
    CreatedBy: userIds.length > 0 ? userIds[0] : 1,
    TargetUserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    CampaignName: `Chiến dịch Tri ân Hội viên Mùa Hè #${i}`,
    Channel: 'Email',
    Recipient: faker.email(i, 'vip'),
    Content: `Kính tặng Quý khách ưu đãi độc quyền 25% cho kỳ nghỉ dưỡng biển tại Grand Horizon.`,
    StartDate: faker.dateInPast(30),
    EndDate: faker.dateInFuture(60),
    TargetType: 'Guest',
    DeliveryStatus: 'Sent',
    SentAt: faker.dateInPast(10),
  }), count, 5000);

  // 5. CampaignRecipients (100k)
  console.log(`   • Seeding CampaignRecipients (${count.toLocaleString()})...`);
  await seedInChunks('CampaignRecipients', (i) => ({
    CampaignId: i,
    UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    ContactValue: faker.email(i, 'guest'),
    SendStatus: 'Delivered',
    SentAt: faker.dateInPast(10),
    ErrorMessage: null,
  }), count, 5000);

  // 6. MaintenanceTickets (100k)
  console.log(`   • Seeding MaintenanceTickets (${count.toLocaleString()})...`);
  const ticketTitles = ['Kiểm tra bảo dưỡng điều hòa', 'Thay bóng đèn ban công', 'Kiểm tra bồn sục Jacuzzi', 'Bảo trì hệ thống khóa từ'];
  await seedInChunks('MaintenanceTickets', (i) => {
    const roomId = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const staffId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    return {
      RoomId: roomId,
      AreaName: 'Khu buồng phòng khách',
      ReportedBy: staffId,
      AssignedTo: staffId,
      Title: `${ticketTitles[(i - 1) % ticketTitles.length]} #${i}`,
      Description: `Phiếu yêu cầu kỹ thuật kiểm tra và xử lý định kỳ #${i}`,
      Priority: faker.random.arrayElement(['Low', 'Medium', 'High']),
      Status: faker.random.arrayElement(['Open', 'InProgress', 'Completed']),
      CompletedAt: faker.dateInPast(5),
    };
  }, count, 5000);

  // 7. MaintenanceTicketPhotos (100k)
  console.log(`   • Seeding MaintenanceTicketPhotos (${count.toLocaleString()})...`);
  await seedInChunks('MaintenanceTicketPhotos', (i) => ({
    TicketId: i,
    PhotoUrl: `https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80&lock=${i % 100}`,
    UploadedBy: userIds.length > 0 ? userIds[0] : 1,
  }), count, 5000);

  // 8. LostAndFoundItems (100k)
  console.log(`   • Seeding LostAndFoundItems (${count.toLocaleString()})...`);
  const lostItems = ['Đồng hồ đeo tay Thụy Sĩ', 'Kính râm Rayban', 'Tai nghe AirPods Pro', 'Ví da nam màu đen', 'Bộ sạc điện thoại iPhone'];
  await seedInChunks('LostAndFoundItems', (i) => {
    const roomId = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const isClaimed = Math.random() < 0.7;
    return {
      RoomId: roomId,
      FoundBy: userIds.length > 0 ? userIds[0] : 1,
      ClaimedBy: isClaimed ? (userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1) : null,
      ItemName: `${lostItems[(i - 1) % lostItems.length]} #${i}`,
      Description: `Vật phẩm thất lạc ghi nhận tại phòng kiểm kê #${i}`,
      FoundDate: faker.dateInPast(40),
      Location: `Phòng nghỉ khách số #${roomId}`,
      Status: isClaimed ? 'Returned' : 'Found',
      ClaimedDate: isClaimed ? faker.dateInPast(10) : null,
    };
  }, count, 5000);

  // 9. SmartLockLogs (100k)
  console.log(`   • Seeding SmartLockLogs (${count.toLocaleString()})...`);
  await seedInChunks('SmartLockLogs', (i) => {
    const roomId = roomIds.length > 0 ? roomIds[(i - 1) % roomIds.length] : 1;
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1 };
    return {
      RoomId: roomId,
      StayId: stay.StayId,
      UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
      DigitalKey: `DKEY-${faker.confirmationCode()}`,
      ActionType: faker.random.arrayElement(['UnlockCard', 'UnlockAppBluetooth', 'LockDoor']),
      ActionTime: faker.dateInPast(30),
      Status: 'Success',
      DeviceId: `LOCK-IOT-DEV-${roomId}`,
    };
  }, count, 5000);

  // 10. CashShifts (100k)
  console.log(`   • Seeding CashShifts (${count.toLocaleString()})...`);
  await seedInChunks('CashShifts', (i) => ({
    UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    ShiftDate: faker.dateInPast(60),
    ShiftType: faker.random.arrayElement(['Morning', 'Afternoon', 'Night']),
    OpeningAmount: 5000000,
    ClosingAmount: faker.vndPrice(15000000, 45000000),
    HandoverAmount: 5000000,
    Status: 'Closed',
    Note: `Bàn giao ca thu ngân lễ tân hoàn tất ca #${i}`,
  }), count, 5000);

  // 11. ShuttleSchedules (100k)
  console.log(`   • Seeding ShuttleSchedules (${count.toLocaleString()})...`);
  await seedInChunks('ShuttleSchedules', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { BookingId: 1 };
    const dep = faker.dateInPast(20);
    return {
      VehicleId: ((i - 1) % 50) + 1,
      BookingId: stay.BookingId || 1,
      UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
      Route: 'Sân bay quốc tế <-> Resort Grand Horizon',
      DepartureTime: dep,
      ArrivalTime: new Date(dep.getTime() + 2700000),
      PassengerCount: faker.random.int(1, 4),
      Status: 'Completed',
      Note: null,
    };
  }, count, 5000);

  // 12. PoliceDeclarations (100k)
  console.log(`   • Seeding PoliceDeclarations (${count.toLocaleString()})...`);
  await seedInChunks('PoliceDeclarations', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { StayId: 1 };
    return {
      StayId: stay.StayId,
      GuestName: faker.fullName(),
      IdNumber: faker.idNumber(),
      IdType: 'CCCD',
      Nationality: 'Việt Nam',
      DeclarationDate: faker.dateInPast(30),
      Status: 'Exported',
      ExportedAt: faker.dateInPast(25),
    };
  }, count, 5000);

  // 13. BanquetEvents (100k)
  console.log(`   • Seeding BanquetEvents (${count.toLocaleString()})...`);
  const eventTypes = ['Tiệc Cưới Bãi Biển', 'Hội Nghị Thượng Đỉnh Khách Hàng', 'Gala Dinner Cuối Năm', 'Sinh Nhật Doanh Nhân'];
  await seedInChunks('BanquetEvents', (i) => {
    const stay = stays.length > 0 ? stays[(i - 1) % stays.length] : { BookingId: 1 };
    return {
      BookingId: stay.BookingId || 1,
      CreatedBy: userIds.length > 0 ? userIds[0] : 1,
      EventName: `${eventTypes[(i - 1) % eventTypes.length]} #${i}`,
      EventType: 'Banquet',
      EventDate: faker.dateInFuture(60),
      StartTime: '18:00:00',
      EndTime: '22:00:00',
      Venue: 'Đại Sảnh Ánh Trăng Grand Ballroom',
      GuestCount: faker.random.int(50, 300),
      Revenue: faker.vndPrice(50000000, 250000000),
      Status: 'Confirmed',
      Note: null,
    };
  }, count, 5000);

  // 14. StaffSchedules (100k)
  console.log(`   • Seeding StaffSchedules (${count.toLocaleString()})...`);
  await seedInChunks('StaffSchedules', (i) => ({
    UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    BranchName: 'Grand Horizon Phú Quốc Luxury Resort',
    WorkDate: faker.dateInPast(30),
    Shift: faker.random.arrayElement(['Ca Sáng (06h-14h)', 'Ca Chiều (14h-22h)', 'Ca Đêm (22h-06h)']),
    StartTime: '06:00:00',
    EndTime: '14:00:00',
    Status: 'Completed',
    CheckInTime: faker.dateInPast(30),
    CheckOutTime: faker.dateInPast(30),
    Note: null,
  }), count, 5000);

  // 15. AuditLogs (100k)
  console.log(`   • Seeding AuditLogs (${count.toLocaleString()})...`);
  const actions = ['CHECKIN_GUEST', 'CHECKOUT_GUEST', 'CREATE_BOOKING', 'UPDATE_ROOM_STATUS', 'PROCESS_PAYMENT'];
  await seedInChunks('AuditLogs', (i) => ({
    UserId: userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1,
    ActionType: faker.random.arrayElement(actions),
    TableName: 'Bookings',
    RecordId: i,
    OldValues: JSON.stringify({ status: 'Pending' }),
    NewValues: JSON.stringify({ status: 'Confirmed' }),
    ActionTime: faker.dateInPast(60),
    IpAddress: '192.168.1.105',
  }), count, 5000);

  // 16. Wishlists (100k)
  console.log(`   • Seeding Wishlists (${count.toLocaleString()})...`);
  await seedInChunks('Wishlists', (i) => {
    const userId = userIds.length > 0 ? userIds[(i - 1) % userIds.length] : 1;
    const rtId = roomTypeIds.length > 0 ? roomTypeIds[(i - 1) % roomTypeIds.length] : 1;
    return {
      UserId: userId,
      RoomTypeId: rtId,
    };
  }, count, 5000);

  // 17. NewsletterSubscribers (100k)
  console.log(`   • Seeding NewsletterSubscribers (${count.toLocaleString()})...`);
  await seedInChunks('NewsletterSubscribers', (i) => ({
    Email: `guest_subscriber_${i}@luxurypassion.com`,
    IsActive: true,
  }), count, 5000);

  console.log(`   ✅ Operations Extras completed (All 57 tables covered).`);
}

module.exports = { run };
