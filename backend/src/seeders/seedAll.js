'use strict';

/**
 * High-Performance Seeder Script
 * Tự động nạp dữ liệu số lượng lớn (>= 100.000 records / bảng)
 * ĐÁP ỨNG BẮT BUỘC: Mỗi table trên 100.000 records
 *
 * Kỹ thuật tối ưu hóa:
 *  - Bulk Insert Chunks (Tính toán động tránh giới hạn 65.535 prepared statement placeholders của MySQL)
 *  - Tắt FOREIGN_KEY_CHECKS và UNIQUE_CHECKS trong suốt quá trình nạp
 *  - Tự động TRUNCATE bảng trước khi nạp để tránh trùng lặp
 *  - Hỗ trợ tham số dòng lệnh:
 *      node src/seeders/seedAll.js --count=100000
 *      node src/seeders/seedAll.js --count=10 (để test nhanh)
 *      node src/seeders/seedAll.js --tables=Users,Rooms
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('../config/config.js').development;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'mysql',
  logging: false,
  pool: { max: 20, min: 0, acquire: 60000, idle: 10000 }
});

// Phân tích tham số dòng lệnh CLI
const args = process.argv.slice(2);
let targetCount = 100000; // Mặc định 100.000 records/bảng theo yêu cầu đề bài
let filterTables = null;

args.forEach(arg => {
  if (arg.startsWith('--count=')) {
    targetCount = parseInt(arg.split('=')[1], 10) || 100000;
  }
  if (arg.startsWith('--tables=')) {
    filterTables = arg.split('=')[1].split(',').map(t => t.trim().toLowerCase());
  }
});

// Helper: Bulk Insert mảng dữ liệu vào bảng
async function bulkInsertChunk(tableName, rows) {
  if (!rows || rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const escapedColumns = columns.map(col => `\`${col}\``).join(', ');

  const valuesClauses = [];
  const replacements = [];

  for (const row of rows) {
    const placeholders = [];
    for (const col of columns) {
      placeholders.push('?');
      replacements.push(row[col]);
    }
    valuesClauses.push(`(${placeholders.join(', ')})`);
  }

  const query = `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES ${valuesClauses.join(', ')};`;
  await sequelize.query(query, { replacements });
}

// Helper: Sinh và chèn dữ liệu theo Chunk
async function seedTable(tableName, count, rowGenerator) {
  if (filterTables && !filterTables.includes(tableName.toLowerCase())) {
    return;
  }

  // Dọn dẹp dữ liệu cũ để không bị duplicate key khi chạy lại
  await sequelize.query(`TRUNCATE TABLE \`${tableName}\`;`);

  console.log(`⏳ Đang nạp bảng [${tableName}] (${count.toLocaleString()} records)...`);
  const startTime = Date.now();

  const sampleRow = rowGenerator(1);
  const colCount = Object.keys(sampleRow).length;
  // Tránh vượt quá 65.535 bind placeholders của giao thức MySQL
  const safeChunkSize = Math.min(5000, Math.floor(60000 / colCount));

  let inserted = 0;
  while (inserted < count) {
    const currentChunkSize = Math.min(safeChunkSize, count - inserted);
    const chunk = [];
    for (let i = 0; i < currentChunkSize; i++) {
      chunk.push(rowGenerator(inserted + i + 1));
    }
    await bulkInsertChunk(tableName, chunk);
    inserted += currentChunkSize;

    if (count >= 20000 && inserted % 25000 === 0) {
      console.log(`   ➔ Đã nạp: ${inserted.toLocaleString()} / ${count.toLocaleString()} (${Math.round((inserted / count) * 100)}%)`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Hoàn thành [${tableName}]: ${count.toLocaleString()} records trong ${duration}s.`);
}

async function run() {
  console.log(`=======================================================`);
  console.log(`🚀 BẮT ĐẦU CHẠY SEEDER HỆ THỐNG QUẢN LÝ KHÁCH SẠN`);
  console.log(`🎯 Chỉ tiêu nạp: >= ${targetCount.toLocaleString()} records / BẢNG (57 bảng)`);
  console.log(`=======================================================\n`);

  const globalStartTime = Date.now();

  try {
    await sequelize.authenticate();
    console.log(`🔗 Đã kết nối MySQL cơ sở dữ liệu: ${config.database}`);

    // Tắt kiểm tra toàn vẹn để tối ưu tốc độ ghi
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.query('SET UNIQUE_CHECKS = 0;');
    await sequelize.query('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');

    // 1. Roles (Bảng 7)
    await seedTable('Roles', targetCount, (id) => ({
      RoleId: id,
      RoleName: id === 1 ? 'Admin' : id === 2 ? 'Receptionist' : id === 3 ? 'Kitchen' : id === 4 ? 'Housekeeping' : id === 5 ? 'Guest' : `Role_${id}`,
      Description: `Quyền vai trò cho nhóm chức năng ${id}`,
      IsDeleted: 0
    }));

    // 2. Permissions (Bảng 8)
    await seedTable('Permissions', targetCount, (id) => ({
      PermissionId: id,
      PermissionName: `PERM_${id}_ACTION`,
      Module: id % 5 === 0 ? 'Admin' : id % 5 === 1 ? 'FrontDesk' : id % 5 === 2 ? 'Kitchen' : id % 5 === 3 ? 'Housekeeping' : 'Guest',
      Description: `Mô tả quyền hạn chi tiết mã số ${id}`
    }));

    // 3. RolePermissions (Bảng 10 - Composite PK: RoleId, PermissionId)
    await seedTable('RolePermissions', targetCount, (id) => ({
      RoleId: id,
      PermissionId: id
    }));

    // 4. MembershipTiers (Bảng 11)
    await seedTable('MembershipTiers', targetCount, (id) => ({
      TierId: id,
      TierName: id === 1 ? 'Standard' : id === 2 ? 'Silver' : id === 3 ? 'Gold' : id === 4 ? 'Platinum' : id === 5 ? 'Diamond' : `VIP_Tier_${id}`,
      MinPoints: (id - 1) * 100,
      Benefits: `Ưu đãi chiết khấu ${((id % 30) + 1)}% giá phòng và miễn phí bữa sáng`,
      DiscountRate: ((id % 30) + 1).toFixed(2),
      PointMultiplier: (1 + (id % 10) * 0.1).toFixed(2),
      IsDeleted: 0
    }));

    // 5. Branches (Bảng 57)
    await seedTable('Branches', targetCount, (id) => ({
      BranchId: id,
      BranchName: id === 1 ? 'Grand Horizon Phú Quốc Oasis' : id === 2 ? 'Grand Horizon Cam Ranh Sanctuary' : id === 3 ? 'Grand Horizon Đà Nẵng Heritage' : `Grand Horizon Resort Chi Nhánh ${id}`,
      Address: `Số ${id * 12} Đường Ven Biển Thượng Lưu, Tỉnh/TP ${id}`,
      Phone: `0901${String(id % 1000000).padStart(6, '0')}`,
      Status: 'Active'
    }));

    // 6. Users (Bảng 6)
    const defaultPasswordHash = '$2a$10$7vN3X8w3yvQf9Z9B8O6PKeQ2hYqf0j0J9uF2bJ7F.G8b0nC2x9n3K'; // bcrypt hash cho '123456'
    await seedTable('Users', targetCount, (id) => ({
      UserId: id,
      RoleId: ((id - 1) % 5) + 1,
      TierId: ((id - 1) % 5) + 1,
      FullName: id <= 5 ? ['Admin Quản Trị', 'Lễ Tân Tiền Sảnh', 'Đầu Bếp Trưởng', 'Nhân Viên Buồng Phòng', 'Khách Thượng Lưu'][id - 1] : `Khách Hàng Số ${id}`,
      Email: id <= 5 ? `user_${id}@hoteldomain.vn` : `guest_${id}@customer.hotel.vn`,
      Phone: `09${String(10000000 + (id % 90000000))}`,
      PasswordHash: defaultPasswordHash,
      IdNumber: `079${String(100000000 + (id % 900000000))}`,
      IdType: 'CCCD',
      DateOfBirth: '1995-05-15',
      Gender: id % 2 === 0 ? 'Male' : 'Female',
      Status: 'Active'
    }));

    // 7. PasswordResetTokens (Bảng 56)
    await seedTable('PasswordResetTokens', targetCount, (id) => ({
      PasswordResetTokenId: id,
      UserId: ((id - 1) % targetCount) + 1,
      OtpCode: String(100000 + (id % 900000)),
      ExpiresAt: new Date(Date.now() + 3600000),
      AttemptCount: 0,
      UsedAt: null
    }));

    // 8. RoomTypes (Bảng 9)
    await seedTable('RoomTypes', targetCount, (id) => ({
      RoomTypeId: id,
      TypeName: id === 1 ? 'Deluxe Ocean View' : id === 2 ? 'Executive Beachfront Suite' : id === 3 ? 'Presidential Penthouse Villa' : id === 4 ? 'Royal Pool Sanctuary' : `Hạng Phòng Tiêu Chuẩn ${id}`,
      Description: `Hạng phòng sang trọng đẳng cấp 5 sao với view trực diện biển ngọc bích, ban công tắm nắng riêng biệt.`,
      BasePrice: (1500000 + (id % 50) * 200000).toFixed(2),
      MaxOccupancy: 2 + (id % 4),
      AdultCapacity: 2 + (id % 3),
      ChildCapacity: 1 + (id % 2),
      ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
      Status: 'Active',
      IsDeleted: 0
    }));

    // 9. Amenities (Bảng 12)
    await seedTable('Amenities', targetCount, (id) => ({
      AmenityId: id,
      AmenityName: ['WiFi Tốc Độ Cao', 'Bồn Tắm Hướng Biển', 'Bể Bơi Vô Cực', 'Minibar Thượng Hạng', 'Máy Pha Cà Phê Nespresso', 'Ban Công Riêng', 'TV Thông Minh 65 Inch', 'Dịch Vụ Quản Gia 24/7'][id % 8] + ` #${id}`,
      Description: `Tiện ích cao cấp trang bị sẵn tại phòng số hiệu ${id}`,
      IconUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933796.png'
    }));

    // 10. RoomTypeAmenities (Bảng 13 - Composite PK: RoomTypeId, AmenityId)
    await seedTable('RoomTypeAmenities', targetCount, (id) => ({
      RoomTypeId: id,
      AmenityId: id
    }));

    // 11. Rooms (Bảng 14)
    await seedTable('Rooms', targetCount, (id) => ({
      RoomId: id,
      BranchId: ((id - 1) % targetCount) + 1,
      RoomTypeId: ((id - 1) % targetCount) + 1,
      RoomNumber: `P-${id}`,
      Floor: Math.floor(id / 100) + 1,
      Status: ['CleanAvailable', 'Occupied', 'Dirty', 'Cleaning', 'Maintenance'][id % 5],
      Description: `Phòng nghỉ tiện nghi số hiệu ${id}`,
      IsDeleted: 0
    }));

    // 12. PricingRules (Bảng 15)
    await seedTable('PricingRules', targetCount, (id) => ({
      PricingRuleId: id,
      RoomTypeId: ((id - 1) % targetCount) + 1,
      RuleName: `Chính Sách Giá Mùa Cao Điểm & Cuối Tuần #${id}`,
      StartDate: '2026-06-01',
      EndDate: '2026-08-31',
      MinPrice: '1200000.00',
      MaxPrice: '15000000.00',
      PriceMultiplier: (1.15 + (id % 5) * 0.05).toFixed(4),
      Conditions: 'Áp dụng cho ngày Thứ 7, Chủ Nhật và ngày Lễ Quốc Gia',
      Priority: id % 10,
      Status: 'Active'
    }));

    // 13. Vouchers (Bảng 16)
    await seedTable('Vouchers', targetCount, (id) => ({
      VoucherId: id,
      Code: `VOUCHER_${String(id).padStart(8, '0')}`,
      DiscountType: id % 2 === 0 ? 'Percent' : 'Fixed',
      DiscountValue: id % 2 === 0 ? '15.00' : '200000.00',
      MinOrderAmount: '1000000.00',
      MaxDiscountAmount: '1000000.00',
      StartDate: '2026-01-01',
      EndDate: '2026-12-31',
      UsageLimit: 500,
      UsedCount: id % 50,
      IsDeleted: 0,
      Status: 'Active'
    }));

    // 14. OTAChannels (Bảng 51)
    await seedTable('OTAChannels', targetCount, (id) => ({
      OTAChannelId: id,
      ChannelName: id === 1 ? 'Agoda' : id === 2 ? 'Booking.com' : id === 3 ? 'Traveloka' : id === 4 ? 'Expedia' : `Kênh OTA Quốc Tế #${id}`,
      ApiType: 'REST_V2',
      ApiKey: `api_key_secret_ota_${id}_token_auth_999`,
      Status: 'Active'
    }));

    // 15. OTARoomMappings (Bảng 52)
    await seedTable('OTARoomMappings', targetCount, (id) => ({
      MappingId: id,
      OTAChannelId: ((id - 1) % targetCount) + 1,
      RoomTypeId: ((id - 1) % targetCount) + 1,
      OTARoomTypeCode: `OTA_ROOM_MAP_${id}`,
      Status: 'Active',
      LastSyncedAt: new Date()
    }));

    // 16. Bookings (Bảng 17)
    await seedTable('Bookings', targetCount, (id) => ({
      BookingId: id,
      UserId: ((id - 1) % targetCount) + 1,
      RoomTypeId: ((id - 1) % targetCount) + 1,
      VoucherId: id % 3 === 0 ? ((id - 1) % targetCount) + 1 : null,
      OTAChannelId: id % 4 === 0 ? ((id - 1) % targetCount) + 1 : null,
      CheckInDate: '2026-10-15',
      CheckOutDate: '2026-10-18',
      NumberOfNights: 3,
      Adults: 2,
      Children: 1,
      RoomQuantity: 1,
      RoomSubtotal: '6000000.00',
      SurchargeAmount: '300000.00',
      DiscountAmount: '500000.00',
      TotalAmount: '5800000.00',
      DepositAmount: '2000000.00',
      Status: ['Pending', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled'][id % 5],
      BookingSource: id % 4 === 0 ? 'OTA' : 'DirectWeb',
      BookingQrCode: `QR_BOOKING_${String(id).padStart(8, '0')}`,
      ConfirmationCode: `CONF_${String(id).padStart(8, '0')}`,
      ConfirmationSentAt: new Date()
    }));

    // 17. BookingGuests (Bảng 18)
    await seedTable('BookingGuests', targetCount, (id) => ({
      BookingGuestId: id,
      BookingId: ((id - 1) % targetCount) + 1,
      FullName: `Khách Đi Cùng Số ${id}`,
      Email: `guest_companion_${id}@mail.vn`,
      Phone: `098${String(1000000 + (id % 9000000))}`,
      IdNumber: `079${String(100000000 + (id % 900000000))}`,
      IdType: 'CCCD',
      DateOfBirth: '1998-08-20',
      Gender: id % 2 === 0 ? 'Male' : 'Female',
      IsPrimaryGuest: id % 2 === 0 ? 1 : 0
    }));

    // 18. Stays (Bảng 19)
    await seedTable('Stays', targetCount, (id) => ({
      StayId: id,
      BookingId: ((id - 1) % targetCount) + 1,
      RoomId: ((id - 1) % targetCount) + 1,
      ActualCheckIn: new Date(),
      ExpectedCheckOut: new Date(Date.now() + 86400000 * 3),
      ActualCheckOut: null,
      Status: ['CheckedIn', 'Extended', 'CheckedOut'][id % 3],
      DepositAmount: '2000000.00'
    }));

    // 19. RoomMoveHistory (Bảng 20)
    await seedTable('RoomMoveHistory', targetCount, (id) => ({
      MoveId: id,
      StayId: ((id - 1) % targetCount) + 1,
      FromRoomId: ((id - 1) % targetCount) + 1,
      ToRoomId: (id % targetCount) + 1,
      MoveDate: new Date(),
      Reason: `Khách muốn nâng cấp view biển theo yêu cầu #${id}`,
      MovedBy: 2
    }));

    // 20. HousekeepingAssignments (Bảng 21)
    await seedTable('HousekeepingAssignments', targetCount, (id) => ({
      AssignmentId: id,
      RoomId: ((id - 1) % targetCount) + 1,
      UserId: 4,
      StayId: ((id - 1) % targetCount) + 1,
      AssignmentDate: new Date(),
      Priority: (id % 3) + 1,
      Status: ['Assigned', 'InProgress', 'Completed'][id % 3],
      StartedAt: new Date(),
      CompletedAt: null,
      Note: `Dọn dẹp tiêu chuẩn 5 sao và bổ sung trà thảo mộc phòng ${id}`
    }));

    // 21. ServiceCategories (Bảng 22)
    await seedTable('ServiceCategories', targetCount, (id) => ({
      CategoryId: id,
      CategoryName: ['Thư Giãn & Spa', 'Giặt Ủi Hấp Cao Cấp', 'Thuê Xe Tự Lái & Đưa Đón', 'Tour Du Thuyền Hoàng Hôn', 'Tổ Chức Tiệc Nướng BBQ Bãi Biển'][id % 5] + ` #${id}`,
      Description: `Nhóm dịch vụ tiện ích nghỉ dưỡng thượng lưu số ${id}`,
      IsDeleted: 0
    }));

    // 22. Services (Bảng 23)
    await seedTable('Services', targetCount, (id) => ({
      ServiceId: id,
      CategoryId: ((id - 1) % targetCount) + 1,
      ServiceName: `Dịch Vụ Khách Sạn Cao Cấp #${id}`,
      Price: (200000 + (id % 20) * 50000).toFixed(2),
      Unit: id % 2 === 0 ? 'Lượt' : 'Gói',
      Description: `Trải nghiệm dịch vụ cá nhân hóa chuẩn quốc tế mã ${id}`,
      Status: 'Active',
      ServiceCode: `SRV_${String(id).padStart(8, '0')}`,
      IsDeleted: 0
    }));

    // 23. ServiceOrders (Bảng 24)
    await seedTable('ServiceOrders', targetCount, (id) => ({
      OrderId: id,
      StayId: ((id - 1) % targetCount) + 1,
      ServiceId: ((id - 1) % targetCount) + 1,
      CreatedBy: 2,
      Quantity: (1 + (id % 3)).toFixed(2),
      UnitPrice: '350000.00',
      TotalPrice: ((1 + (id % 3)) * 350000).toFixed(2),
      OrderDate: new Date(),
      Status: ['Received', 'InProgress', 'Completed'][id % 3],
      Note: `Yêu cầu phục vụ đúng giờ cho thượng khách #${id}`
    }));

    // 24. Invoices (Bảng 25)
    await seedTable('Invoices', targetCount, (id) => ({
      InvoiceId: id,
      StayId: ((id - 1) % targetCount) + 1,
      BookingId: ((id - 1) % targetCount) + 1,
      InvoiceNumber: `INV_2026_${String(id).padStart(8, '0')}`,
      InvoiceDate: new Date(),
      Subtotal: '8500000.00',
      VATRate: '10.00',
      VATAmount: '850000.00',
      TotalAmount: '9350000.00',
      Status: ['Paid', 'Unpaid', 'PartiallyPaid'][id % 3],
      PdfPath: `/invoices/2026/invoice_${id}.pdf`,
      AssignedTo: 2
    }));

    // 25. InvoiceDetails (Bảng 26)
    await seedTable('InvoiceDetails', targetCount, (id) => ({
      DetailId: id,
      InvoiceId: ((id - 1) % targetCount) + 1,
      ItemType: ['Room', 'Service', 'Food', 'Minibar', 'Surcharge'][id % 5],
      ItemId: id,
      Description: `Khoản thu chi tiết cho dịch vụ #${id}`,
      Quantity: '1.00',
      UnitPrice: '1500000.00',
      TotalPrice: '1500000.00'
    }));

    // 26. Payments (Bảng 27)
    await seedTable('Payments', targetCount, (id) => ({
      PaymentId: id,
      InvoiceId: ((id - 1) % targetCount) + 1,
      BookingId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      Amount: '9350000.00',
      PaymentMethod: ['VNPay', 'VietQR', 'MoMo', 'Cash', 'Card'][id % 5],
      PaymentDate: new Date(),
      TransactionCode: `TRANS_VNPAY_${String(id).padStart(10, '0')}`,
      Status: 'Paid',
      RefundReason: null,
      RefundAmount: '0.00',
      GatewayResponse: JSON.stringify({ code: '00', message: 'Success', orderId: id })
    }));

    // 27. MenuCategories (Bảng 28)
    await seedTable('MenuCategories', targetCount, (id) => ({
      CategoryId: id,
      CategoryName: ['Khai Vị Hải Sản', 'Món Chính Thượng Hạng', 'Tráng Miệng Pháp', 'Đồ Uống & Cocktail', 'Rượu Vang Hảo Hạng'][id % 5] + ` #${id}`,
      IsDeleted: 0,
      Description: `Nhóm ẩm thực ẩm thực tinh hoa số ${id}`
    }));

    // 28. MenuItems (Bảng 29)
    await seedTable('MenuItems', targetCount, (id) => ({
      MenuItemId: id,
      CategoryId: ((id - 1) % targetCount) + 1,
      ItemName: `Món Ẩm Thực Nhà Hàng #${id}`,
      Price: (120000 + (id % 30) * 30000).toFixed(2),
      Description: `Chế biến từ nguồn nguyên liệu nhập khẩu tươi sống hảo hạng trong ngày.`,
      ImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop',
      Status: 'Available',
      IsDeleted: 0
    }));

    // 29. RestaurantTables (Bảng 30)
    await seedTable('RestaurantTables', targetCount, (id) => ({
      TableId: id,
      BranchName: 'Grand Horizon Phú Quốc Oasis',
      TableNumber: `TB-${id}`,
      Location: id % 2 === 0 ? 'Sân Thượng Hướng Biển' : 'Sảnh VIP Hoàng Gia',
      Capacity: 4 + (id % 6),
      IsDeleted: 0,
      Status: 'Available'
    }));

    // 30. FoodOrders (Bảng 31)
    await seedTable('FoodOrders', targetCount, (id) => ({
      FoodOrderId: id,
      StayId: ((id - 1) % targetCount) + 1,
      TableId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      OrderTime: new Date(),
      OrderType: id % 2 === 0 ? 'RoomService' : 'DineIn',
      Status: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivering', 'Served'][id % 6],
      TotalAmount: '1250000.00',
      PaymentMode: id % 2 === 0 ? 'RoomInvoice' : 'PayNow',
      Note: `Giao nhanh không hành, phục vụ kèm sốt vang đỏ #${id}`
    }));

    // 31. FoodOrderDetails (Bảng 32)
    await seedTable('FoodOrderDetails', targetCount, (id) => ({
      FoodOrderDetailId: id,
      FoodOrderId: ((id - 1) % targetCount) + 1,
      MenuItemId: ((id - 1) % targetCount) + 1,
      Quantity: (id % 4) + 1,
      UnitPrice: '250000.00',
      TotalPrice: (((id % 4) + 1) * 250000).toFixed(2),
      Note: `Yêu cầu làm chín vừa (Medium rare)`
    }));

    // 32. TableReservations (Bảng 33)
    await seedTable('TableReservations', targetCount, (id) => ({
      TableReservationId: id,
      TableId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      ReservationTime: new Date(Date.now() + 7200000),
      GuestCount: (id % 6) + 2,
      Status: 'Confirmed',
      Note: `Đặt bàn kỷ niệm ngày cưới kèm nến và hoa tươi #${id}`
    }));

    // 33. InventoryItems (Bảng 34)
    await seedTable('InventoryItems', targetCount, (id) => ({
      ItemId: id,
      ItemCode: `ITEM_${String(id).padStart(8, '0')}`,
      ItemName: `Hàng Tồn Kho Vật Tư #${id}`,
      ItemType: ['Consumable', 'Minibar', 'Linen', 'Housekeeping', 'Kitchen'][id % 5],
      Unit: id % 2 === 0 ? 'Lon' : 'Chiếc',
      Quantity: '500.00',
      MinQuantity: '50.00',
      UnitCost: '25000.00',
      Status: 'Active',
      IsDeleted: 0
    }));

    // 34. InventoryTransactions (Bảng 35)
    await seedTable('InventoryTransactions', targetCount, (id) => ({
      TransactionId: id,
      ItemId: ((id - 1) % targetCount) + 1,
      RoomId: ((id - 1) % targetCount) + 1,
      UserId: 4,
      TransactionType: ['Import', 'Export', 'Consume', 'Adjust'][id % 4],
      Quantity: '10.00',
      ReferenceId: id,
      TransactionDate: new Date(),
      Note: `Xuất kho vật tư buồng phòng ca sáng #${id}`
    }));

    // 35. MinibarUsages (Bảng 36)
    await seedTable('MinibarUsages', targetCount, (id) => ({
      UsageId: id,
      StayId: ((id - 1) % targetCount) + 1,
      ItemId: ((id - 1) % targetCount) + 1,
      RecordedBy: 4,
      Quantity: '2.00',
      UsageDate: new Date(),
      UnitPrice: '45000.00',
      TotalAmount: '90000.00'
    }));

    // 36. Reviews (Bảng 37)
    await seedTable('Reviews', targetCount, (id) => ({
      ReviewId: id,
      UserId: ((id - 1) % targetCount) + 1,
      StayId: ((id - 1) % targetCount) + 1,
      FoodOrderId: ((id - 1) % targetCount) + 1,
      Rating: '5.0',
      OverallRating: '5.0',
      CleanlinessScore: 5,
      StaffServiceScore: 5,
      RoomComfortScore: 5,
      DiningScore: 5,
      ValueForMoneyScore: 5,
      WouldRecommend: 'YES',
      TripClassification: ['LEISURE', 'BUSINESS', 'COUPLE', 'FAMILY'][id % 4],
      ReviewTitle: `Kỳ nghỉ đẳng cấp hoàng gia đáng nhớ #${id}`,
      ReviewBody: `Dịch vụ tuyệt hảo, bãi biển riêng trong vắt và đồ ăn tươi ngon. Chắc chắn sẽ quay lại cùng gia đình!`,
      IsAnonymous: 0,
      Comment: `Nhân viên cực kỳ chu đáo và chuyên nghiệp.`
    }));

    // 37. ReviewPhotos (Bảng 58)
    await seedTable('ReviewPhotos', targetCount, (id) => ({
      PhotoId: id,
      ReviewId: ((id - 1) % targetCount) + 1,
      PhotoUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'
    }));

    // 38. ChatbotKnowledgeBase (Bảng 38)
    await seedTable('ChatbotKnowledgeBase', targetCount, (id) => ({
      KnowledgeId: id,
      Question: `Khách sạn có dịch vụ đưa đón sân bay miễn phí không? #${id}`,
      Answer: `Dạ có, Grand Horizon Resort cung cấp xe Limousine đưa đón sân bay miễn phí 24/7 cho toàn bộ khách đặt phòng qua website.`,
      Category: 'Chính Sách & Tiện Ích',
      Keywords: 'sân bay, đưa đón, xe, limousine, miễn phí',
      Status: 'Active'
    }));

    // 39. ChatbotConversations (Bảng 39)
    await seedTable('ChatbotConversations', targetCount, (id) => ({
      ConversationId: id,
      UserId: ((id - 1) % targetCount) + 1,
      StartTime: new Date(),
      EndTime: null,
      Status: 'Open'
    }));

    // 40. ChatbotMessages (Bảng 40)
    await seedTable('ChatbotMessages', targetCount, (id) => ({
      MessageId: id,
      ConversationId: ((id - 1) % targetCount) + 1,
      KnowledgeId: ((id - 1) % targetCount) + 1,
      SenderType: id % 2 === 0 ? 'Guest' : 'AI',
      MessageText: id % 2 === 0 ? 'Xin chào, giờ nhận phòng là mấy giờ?' : 'Dạ giờ nhận phòng tiêu chuẩn là 14:00 và trả phòng là 12:00 trưa ạ.',
      MessageTime: new Date()
    }));

    // 41. LoyaltyPointTransactions (Bảng 41)
    await seedTable('LoyaltyPointTransactions', targetCount, (id) => ({
      TransactionId: id,
      UserId: ((id - 1) % targetCount) + 1,
      TierId: ((id - 1) % targetCount) + 1,
      StayId: ((id - 1) % targetCount) + 1,
      Points: 500,
      TransactionType: 'Earn',
      Description: `Tích lũy điểm thưởng khi hoàn tất kỳ nghỉ lưu trú #${id}`
    }));

    // 42. MarketingCampaigns (Bảng 42)
    await seedTable('MarketingCampaigns', targetCount, (id) => ({
      CampaignId: id,
      CreatedBy: 1,
      TargetUserId: null,
      CampaignName: `Tri Ân Khách Hàng Hội Viên Mùa Hè 2026 #${id}`,
      Channel: 'Email',
      Recipient: 'all_members@hotel.vn',
      Content: 'Tặng ngay Voucher 30% khi đặt phòng trước 30 ngày.',
      StartDate: new Date(),
      EndDate: new Date(Date.now() + 86400000 * 30),
      TargetType: 'Member',
      DeliveryStatus: 'Sent',
      SentAt: new Date()
    }));

    // 43. CampaignRecipients (Bảng 61)
    await seedTable('CampaignRecipients', targetCount, (id) => ({
      RecipientId: id,
      CampaignId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      ContactValue: `guest_${id}@customer.hotel.vn`,
      SendStatus: 'Sent',
      SentAt: new Date(),
      ErrorMessage: null
    }));

    // 44. MaintenanceTickets (Bảng 43)
    await seedTable('MaintenanceTickets', targetCount, (id) => ({
      TicketId: id,
      RoomId: ((id - 1) % targetCount) + 1,
      AreaName: 'Khu vực phòng nghỉ',
      ReportedBy: 4,
      AssignedTo: 1,
      Title: `Bảo dưỡng hệ thống điều hòa thông minh phòng #${id}`,
      Description: `Kiểm tra áp suất gas và vệ sinh lưới lọc máy lạnh định kỳ.`,
      Priority: 'Medium',
      Status: 'Resolved',
      CompletedAt: new Date()
    }));

    // 45. MaintenanceTicketPhotos (Bảng 62)
    await seedTable('MaintenanceTicketPhotos', targetCount, (id) => ({
      PhotoId: id,
      TicketId: ((id - 1) % targetCount) + 1,
      PhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop',
      UploadedBy: 4
    }));

    // 46. LostAndFoundItems (Bảng 44)
    await seedTable('LostAndFoundItems', targetCount, (id) => ({
      LostFoundId: id,
      RoomId: ((id - 1) % targetCount) + 1,
      FoundBy: 4,
      ClaimedBy: ((id - 1) % targetCount) + 1,
      ItemName: `Đồng hồ đeo tay / Kính mát để quên #${id}`,
      Description: `Phát hiện tại ngăn kéo bàn trang điểm sau khi khách check-out.`,
      FoundDate: new Date(),
      Location: 'Bàn trang điểm phòng ngủ',
      Status: 'Claimed',
      ClaimedDate: new Date()
    }));

    // 47. SmartLockLogs (Bảng 45)
    await seedTable('SmartLockLogs', targetCount, (id) => ({
      LogId: id,
      RoomId: ((id - 1) % targetCount) + 1,
      StayId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      DigitalKey: `EKEY_${String(id).padStart(12, '0')}`,
      ActionType: 'Unlock',
      ActionTime: new Date(),
      Status: 'Success',
      DeviceId: `DOOR_LOCK_${((id - 1) % targetCount) + 1}`
    }));

    // 48. CashShifts (Bảng 46)
    await seedTable('CashShifts', targetCount, (id) => ({
      ShiftId: id,
      UserId: 2,
      ShiftDate: '2026-10-02',
      ShiftType: ['Morning', 'Afternoon', 'Night'][id % 3],
      OpeningAmount: '5000000.00',
      ClosingAmount: '18500000.00',
      HandoverAmount: '18500000.00',
      Status: 'Closed',
      Note: `Bàn giao đầy đủ quỹ tiền mặt ca làm việc #${id}`
    }));

    // 49. NightAuditReports (Bảng 47 - ReportDate UNIQUE)
    await seedTable('NightAuditReports', targetCount, (id) => {
      const baseDate = new Date(Date.UTC(2000, 0, 1));
      baseDate.setUTCDate(baseDate.getUTCDate() + (id - 1));
      return {
        ReportId: id,
        ReportDate: baseDate.toISOString().slice(0, 10),
        GeneratedBy: 1,
        TotalRevenue: (85000000 + (id % 20) * 5000000).toFixed(2),
        TotalBookings: 45 + (id % 15),
        TotalCheckIns: 20 + (id % 10),
        TotalCheckOuts: 18 + (id % 10),
        OccupancyRate: (85.5 + (id % 10)).toFixed(2),
        RevPAR: (3200000 + (id % 5) * 100000).toFixed(2),
        Status: 'Completed',
        Note: `Kiểm toán tự động ngày đóng sổ thành công #${id}`
      };
    });

    // 50. Vehicles (Bảng 48 - PlateNumber UNIQUE)
    await seedTable('Vehicles', targetCount, (id) => ({
      VehicleId: id,
      BranchName: 'Grand Horizon Phú Quốc Oasis',
      PlateNumber: `68A-${id}`,
      VehicleType: id % 2 === 0 ? 'Limousine VIP 9 Chỗ' : 'Mercedes E-Class Sedan',
      SeatCapacity: id % 2 === 0 ? 9 : 4,
      DriverName: `Tài Xế Nguyễn Văn ${String.fromCharCode(65 + (id % 26))}`,
      DriverPhone: `097${String(1000000 + (id % 9000000))}`,
      Status: 'Available',
      Description: `Xe chuyên trách đón tiễn VIP sân bay số hiệu ${id}`
    }));

    // 51. ShuttleSchedules (Bảng 49)
    await seedTable('ShuttleSchedules', targetCount, (id) => ({
      ShuttleScheduleId: id,
      VehicleId: ((id - 1) % targetCount) + 1,
      BookingId: ((id - 1) % targetCount) + 1,
      UserId: ((id - 1) % targetCount) + 1,
      Route: 'Sân Bay Quốc Tế Phú Quốc ➔ Grand Horizon Resort',
      DepartureTime: new Date(),
      ArrivalTime: new Date(Date.now() + 2400000),
      PassengerCount: 2,
      Status: 'Completed',
      Note: `Đón khách tại Cột số 05 sảnh Đến A #${id}`
    }));

    // 52. PoliceDeclarations (Bảng 50)
    await seedTable('PoliceDeclarations', targetCount, (id) => ({
      DeclarationId: id,
      StayId: ((id - 1) % targetCount) + 1,
      GuestName: `Thượng Khách Lưu Trú #${id}`,
      IdNumber: `079${String(100000000 + (id % 900000000))}`,
      IdType: 'CCCD',
      Nationality: 'Vietnam',
      DeclarationDate: new Date(),
      Status: 'Exported',
      ExportedAt: new Date()
    }));

    // 53. BanquetEvents (Bảng 53)
    await seedTable('BanquetEvents', targetCount, (id) => ({
      EventId: id,
      BookingId: ((id - 1) % targetCount) + 1,
      CreatedBy: 1,
      EventName: `Hội Nghị Thượng Đỉnh Doanh Nhân Quốc Tế #${id}`,
      EventType: ['Conference', 'Wedding', 'GalaDinner'][id % 3],
      EventDate: '2026-11-20',
      StartTime: '08:30:00',
      EndTime: '17:00:00',
      Venue: 'Grand Crystal Ballroom',
      GuestCount: 150,
      Revenue: '85000000.00',
      Status: 'Confirmed',
      Note: `Bố trí bàn tiệc tròn phong cách hoàng gia kèm âm thanh ánh sáng cao cấp.`
    }));

    // 54. StaffSchedules (Bảng 54)
    await seedTable('StaffSchedules', targetCount, (id) => ({
      ScheduleId: id,
      UserId: ((id - 1) % 4) + 1,
      BranchName: 'Grand Horizon Phú Quốc Oasis',
      WorkDate: '2026-10-02',
      Shift: ['Ca Sáng (06:00 - 14:00)', 'Ca Chiều (14:00 - 22:00)', 'Ca Đêm (22:00 - 06:00)'][id % 3],
      StartTime: '06:00:00',
      EndTime: '14:00:00',
      Status: 'Present',
      CheckInTime: new Date(),
      CheckOutTime: null,
      Note: `Phân công nhiệm vụ vận hành chuẩn giờ.`
    }));

    // 55. AuditLogs (Bảng 55)
    await seedTable('AuditLogs', targetCount, (id) => ({
      LogId: id,
      UserId: 1,
      ActionType: ['INSERT', 'UPDATE', 'DELETE', 'LOGIN'][id % 4],
      TableName: ['Bookings', 'Rooms', 'Invoices', 'Users'][id % 4],
      RecordId: id,
      OldValues: JSON.stringify({ status: 'Old' }),
      NewValues: JSON.stringify({ status: 'New' }),
      ActionTime: new Date(),
      IpAddress: '192.168.1.100'
    }));

    // 56. Wishlists (Bảng 59)
    await seedTable('Wishlists', targetCount, (id) => ({
      WishlistId: id,
      UserId: ((id - 1) % targetCount) + 1,
      RoomTypeId: ((id - 1) % targetCount) + 1
    }));

    // 57. NewsletterSubscribers (Bảng 60 - Email UNIQUE)
    await seedTable('NewsletterSubscribers', targetCount, (id) => ({
      SubscriberId: id,
      Email: `subscriber_${id}@newsletter.hoteldomain.vn`,
      IsActive: 1,
      SubscribedAt: new Date()
    }));

    // Bật lại các kiểm tra an toàn sau khi hoàn tất nạp
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    await sequelize.query('SET UNIQUE_CHECKS = 1;');

    const totalSeconds = ((Date.now() - globalStartTime) / 1000).toFixed(2);
    console.log(`\n=======================================================`);
    console.log(`🎉 HOÀN TẤT TOÀN BỘ SEEDER CHO TOÀN BỘ 57 BẢNG!`);
    console.log(`📊 Tổng thời gian thực hiện: ${totalSeconds} giây`);
    console.log(`=======================================================`);
  } catch (error) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU:', error);
  } finally {
    await sequelize.close();
  }
}

run();
