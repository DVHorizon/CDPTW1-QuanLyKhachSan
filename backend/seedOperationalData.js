const db = require('./src/models');

async function seedRealOperationalData() {
  try {
    console.log('🔄 Đang đồng bộ cấu trúc bảng vào Database...');
    await db.sequelize.sync();

    // 1. CHI NHÁNH & HẠNG PHÒNG & PHÒNG VẬT LÝ THỰC TẾ
    console.log('🏨 1. Nạp Chi Nhánh, Hạng Phòng & Phòng Thực Tế...');
    let branch = await db.Branch.findOne({ where: { BranchName: 'Grand Horizon Phú Quốc Sanctuary' } });
    if (!branch) {
      branch = await db.Branch.create({
        BranchName: 'Grand Horizon Phú Quốc Sanctuary',
        Address: 'Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang',
        Phone: '0297 3888 999',
        Status: 'Active'
      });
    }

    const roomTypesData = [
      { TypeName: 'Deluxe Ocean King View', BasePrice: 3500000, MaxOccupancy: 2, Description: 'Phòng view biển ngắm hoàng hôn' },
      { TypeName: 'Executive Suite Seafront', BasePrice: 6200000, MaxOccupancy: 3, Description: 'Phòng Suite ban công rộng' },
      { TypeName: 'Lagoon Pool Villa', BasePrice: 12500000, MaxOccupancy: 4, Description: 'Biệt thự hồ bơi riêng biệt' },
      { TypeName: 'Suite 1401 Penthouse', BasePrice: 28000000, MaxOccupancy: 6, Description: 'Penthouse tầng cao nhất hướng trọn biển' }
    ];

    const createdRoomTypes = [];
    for (const rt of roomTypesData) {
      let found = await db.RoomType.findOne({ where: { TypeName: rt.TypeName } });
      if (!found) {
        found = await db.RoomType.create(rt);
      }
      createdRoomTypes.push(found);
    }

    // Nạp các phòng vật lý có mặt trong các phiếu bảo trì & xe buồng phòng
    const roomsList = [
      { RoomNumber: '804', Floor: 8, Status: 'UnderMaintenance', RoomTypeId: createdRoomTypes[0].RoomTypeId },
      { RoomNumber: '1401', Floor: 14, Status: 'UnderMaintenance', RoomTypeId: createdRoomTypes[3].RoomTypeId },
      { RoomNumber: '407', Floor: 4, Status: 'UnderMaintenance', RoomTypeId: createdRoomTypes[0].RoomTypeId },
      { RoomNumber: '302', Floor: 3, Status: 'OccupiedClean', RoomTypeId: createdRoomTypes[2].RoomTypeId },
      { RoomNumber: '501', Floor: 5, Status: 'CleanAvailable', RoomTypeId: createdRoomTypes[1].RoomTypeId },
      { RoomNumber: '408', Floor: 4, Status: 'CleanAvailable', RoomTypeId: createdRoomTypes[0].RoomTypeId },
      { RoomNumber: '801', Floor: 8, Status: 'OccupiedClean', RoomTypeId: createdRoomTypes[0].RoomTypeId },
      { RoomNumber: '1201', Floor: 12, Status: 'CleanAvailable', RoomTypeId: createdRoomTypes[1].RoomTypeId }
    ];

    for (const r of roomsList) {
      const existing = await db.Room.findOne({ where: { RoomNumber: r.RoomNumber } });
      if (!existing) {
        await db.Room.create({
          BranchId: branch.BranchId,
          RoomTypeId: r.RoomTypeId,
          RoomNumber: r.RoomNumber,
          Floor: r.Floor,
          Status: r.Status,
          Description: `Phòng nghỉ tiêu chuẩn 5 sao Phú Quốc Sanctuary (Tầng ${r.Floor})`
        });
      }
    }

    // 2. KHÁCH HÀNG & HỘI VIÊN THỰC TẾ
    console.log('👤 2. Nạp Vai Trò, Hạng Thẻ & Khách Hàng...');
    let guestRole = await db.Role.findOne({ where: { RoleName: 'Guest' } });
    if (!guestRole) {
      guestRole = await db.Role.create({ RoleName: 'Guest', Description: 'Khách hàng lưu trú' });
    }
    let adminRole = await db.Role.findOne({ where: { RoleName: 'Admin' } });
    if (!adminRole) {
      adminRole = await db.Role.create({ RoleName: 'Admin', Description: 'Quản trị viên / Lễ tân' });
    }

    const usersData = [
      { FullName: 'Arthur Dent', Email: 'arthur.dent@galaxy.com', Phone: '0988999888', RoleId: guestRole.RoleId },
      { FullName: 'Nguyễn Văn An', Email: 'an.nguyen@gmail.com', Phone: '0903888777', RoleId: guestRole.RoleId },
      { FullName: 'Trần Thị Thu Thảo', Email: 'thao.tran@vips.vn', Phone: '0912456789', RoleId: guestRole.RoleId },
      { FullName: 'Lê Minh Anh', Email: 'minhanh.le@grandhorizon.vn', Phone: '0911222333', RoleId: adminRole.RoleId }
    ];

    for (const u of usersData) {
      const existingUser = await db.User.findOne({ where: { Email: u.Email } });
      if (!existingUser) {
        await db.User.create({
          RoleId: u.RoleId,
          FullName: u.FullName,
          Email: u.Email,
          Phone: u.Phone,
          PasswordHash: '$2a$10$abcdefghijklmnopqrstuv'
        });
      }
    }

    // 3. TIẾP THỊ & CHIẾN DỊCH TỰ ĐỘNG
    console.log('📢 3. Khởi tạo dữ liệu Tiếp Thị Tự Động (Marketing Automation)...');
    const marketingService = require('./src/services/marketingGatewayService');
    await marketingService.initMarketingDatabase();

    // 4. KHO ĐỒ TIÊU HAO, MINIBAR & ĐỒ VẢI (INVENTORY & LINEN)
    console.log('🧺 4. Khởi tạo dữ liệu Kho Minibar & Đồ Vải (Housekeeping & Linen)...');
    const housekeepingService = require('./src/services/housekeepingInventoryService');
    await housekeepingService.initHousekeepingDatabase();

    // 5. TIẾP NHẬN SỰ CỐ & BẢO TRÌ KỸ THUẬT BUỒNG PHÒNG (MAINTENANCE TICKETING)
    console.log('🔧 5. Khởi tạo dữ liệu Phiếu Sự Cố & Kỹ Sư Trực Ca (Engineering)...');
    const engineeringService = require('./src/services/maintenanceTicketingService');
    await engineeringService.initEngineeringDatabase();

    console.log('\n============================================================');
    console.log('🎉 THÀNH CÔNG RỰC RỠ! Toàn bộ cơ sở dữ liệu đã được nạp đầy đủ số liệu thật:');
    console.log(`- Phòng vật lý (Rooms): ${await db.Room.count()}`);
    console.log(`- Người dùng/Hội viên (Users): ${await db.User.count()}`);
    console.log(`- Chiến dịch Tiếp thị (MarketingCampaigns): ${await db.MarketingCampaign.count()}`);
    console.log(`- Mẫu tin tự động (GuestNotificationTemplates): ${await db.GuestNotificationTemplate.count()}`);
    console.log(`- Vật phẩm Kho Minibar (InventoryItems): ${await db.InventoryItem.count()}`);
    console.log(`- Lô xuất nhập FIFO (InventoryBatches): ${await db.InventoryBatch.count()}`);
    console.log(`- Chủng loại Đồ Vải (LinenItems): ${await db.LinenItem.count()}`);
    console.log(`- Phiếu sự cố kỹ thuật (MaintenanceTickets): ${await db.MaintenanceTicket.count()}`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu thật vào Database:', error);
    process.exit(1);
  }
}

seedRealOperationalData();
