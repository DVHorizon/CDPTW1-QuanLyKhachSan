'use strict';

/**
 * seedPristineClean.js
 * 🏨 GRAND HORIZON HOTEL & RESORTS — HỆ THỐNG SEEDER DỮ LIỆU CHUẨN 5 SAO TINH GỌN, SẠCH SẼ & KHÔNG TRÙNG LẶP
 * 
 * - Xóa sạch toàn bộ rác test (Category E2E, Dịch Vụ E2E, TEST-RT-01, RoomTypes duplicate...)
 * - Tạo dữ liệu chuẩn hóa khách sạn 5 sao: Chi nhánh, Phân quyền, Hạng phòng, Phòng vật lý, 
 *   Khách hàng, Dịch vụ cao cấp, Thực đơn, Đơn dịch vụ In-House, Hóa đơn & Giao dịch thanh toán.
 */

const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

async function seedPristineClean() {
  console.log('\n================================================================================');
  console.log('🏛️  GRAND HORIZON HOTEL — KHỞI CHẠY SEEDER DỮ LIỆU CHUẨN 5 SAO (PRISTINE CLEAN)');
  console.log('================================================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu MySQL thành công.');

    // 1. Tắt ràng buộc khóa ngoại
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Danh sách các bảng cần dọn sạch (KHÔNG xóa SequelizeMeta)
    const tablesToTruncate = [
      'DamageItems', 'RoomInspectionReports', 'LateFeePolicies', 'RoomSearchIndex',
      'MinibarInspectionLines', 'MinibarInspectionEvents', 'MinibarInspections',
      'MinibarUsages', 'MinibarProducts', 'StayRoomSegments', 'StayExtensions',
      'RoomMoveHistory', 'RoomMoveRequests', 'BookingRoomAllocations',
      'GuestIdentityDocuments', 'BookingStatusHistory', 'BookingGuests',
      'InvoiceDetails', 'Invoices', 'Payments', 'ServiceOrders', 'Services',
      'ServiceCategories', 'FoodOrderDetails', 'FoodOrders', 'TableReservations',
      'RestaurantTables', 'MenuItems', 'MenuCategories', 'InventoryTransactions',
      'InventoryItems', 'HousekeepingAssignments', 'Stays', 'Bookings',
      'OTARoomMappings', 'OTAChannels', 'Vouchers', 'PricingRules',
      'RoomTypeAmenities', 'Amenities', 'Rooms', 'physical_rooms', 'RoomTypes',
      'ChatbotMessages', 'ChatbotConversations', 'ChatbotKnowledgeBase',
      'ReviewPhotos', 'Reviews', 'MaintenanceTicketPhotos', 'MaintenanceTickets',
      'LostAndFoundItems', 'SmartLockLogs', 'SmartLockKeys', 'CashShifts',
      'ShuttleSchedules', 'PoliceDeclarations', 'BanquetEvents', 'StaffSchedules',
      'AuditLogs', 'Wishlists', 'NewsletterSubscribers', 'CampaignRecipients',
      'MarketingCampaigns', 'LoyaltyPointTransactions', 'NightAuditReports',
      'PasswordResetTokens', 'RolePermissions', 'Users', 'Roles', 'Permissions',
      'MembershipTiers', 'Branches'
    ];

    console.log(`🧹 Đang làm sạch toàn bộ dữ liệu trùng lặp trong ${tablesToTruncate.length} bảng...`);
    for (const table of tablesToTruncate) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${table}\``);
      } catch (err) {
        // Một số bảng có thể chưa tạo hoặc tên khác, bỏ qua
      }
    }
    console.log('✅ Đã làm sạch toàn bộ dữ liệu rác thành công!\n');

    // Mật khẩu băm dùng chung cho kiểm thử: "123456"
    const hash123456 = await bcrypt.hash('123456', 10);

    // =========================================================================
    // 1. BRANCHES (5 Chi nhánh nghỉ dưỡng cao cấp)
    // =========================================================================
    console.log('🏨 1. Seeding Chi nhánh (Branches)...');
    await sequelize.query(`
      INSERT INTO Branches (BranchId, BranchName, Address, Phone, Status) VALUES
      (1, 'Grand Horizon Phú Quốc Sanctuary Resort', 'Bãi Khem, An Thới, TP. Phú Quốc, Kiên Giang', '0297 888 9999', 'Active'),
      (2, 'Grand Horizon Cam Ranh Bay Oasis', 'Bãi Dài, Cam Ranh, Khánh Hòa', '0258 888 9999', 'Active'),
      (3, 'Grand Horizon Côn Đảo Oceanfront', 'Bãi Nhát, Côn Đảo, Bà Rịa - Vũng Tàu', '0254 888 9999', 'Active'),
      (4, 'Grand Horizon Đà Nẵng Premier', 'Đường Võ Nguyên Giáp, Mỹ Khê, Đà Nẵng', '0236 888 9999', 'Active'),
      (5, 'Grand Horizon Nha Trang Heritage', 'Đường Trần Phú, TP. Nha Trang, Khánh Hòa', '0258 222 3333', 'Active');
    `);

    // =========================================================================
    // 2. ROLES & PERMISSIONS
    // =========================================================================
    console.log('🔑 2. Seeding Phân quyền (Roles & Permissions)...');
    await sequelize.query(`
      INSERT INTO Roles (RoleId, RoleName, Description) VALUES
      (1, 'Admin', 'Quản trị viên toàn quyền hệ thống'),
      (2, 'Receptionist', 'Lễ tân / Tiếp đón khách / Check-in Check-out'),
      (3, 'Kitchen', 'Đầu bếp / Nhân viên bếp chế biến'),
      (4, 'Housekeeping', 'Nhân viên buồng phòng dọn dẹp'),
      (5, 'Guest', 'Khách hàng thành viên nghỉ dưỡng');
    `);

    const permissionList = [
      'view_users', 'edit_users', 'delete_users',
      'view_bookings', 'create_booking', 'cancel_booking',
      'view_rooms', 'edit_rooms', 'lock_rooms',
      'view_invoices', 'create_invoice', 'process_payment',
      'manage_menu', 'manage_services', 'kitchen_kds',
      'view_dashboard', 'export_reports', 'manage_inventory',
      'manage_maintenance', 'audit_logs', 'night_audit',
      'ota_sync', 'manage_vouchers', 'manage_loyalty',
      'housekeeping_assign', 'housekeeping_clean', 'minibar_charge',
      'shuttle_manage', 'police_declaration', 'banquet_manage'
    ];
    for (const p of permissionList) {
      await sequelize.query(`
        INSERT INTO Permissions (PermissionName, Module, Description)
        VALUES ('${p}', '${p.split('_')[0]}', 'Quyền thực thi ${p}');
      `);
    }

    // RolePermissions mapping
    await sequelize.query(`
      INSERT INTO RolePermissions (RoleId, PermissionId)
      SELECT 1, PermissionId FROM Permissions;
    `);
    await sequelize.query(`
      INSERT INTO RolePermissions (RoleId, PermissionId)
      SELECT 2, PermissionId FROM Permissions WHERE PermissionName IN (
        'view_users', 'view_bookings', 'create_booking', 'cancel_booking',
        'view_rooms', 'edit_rooms', 'view_invoices', 'process_payment', 'housekeeping_assign'
      );
    `);

    // =========================================================================
    // 3. MEMBERSHIP TIERS
    // =========================================================================
    console.log('💎 3. Seeding Hạng hội viên VIP (Membership Tiers)...');
    await sequelize.query(`
      INSERT INTO MembershipTiers (TierId, TierName, MinPoints, Benefits, DiscountRate) VALUES
      (1, 'Standard', 0, 'Ưu đãi đặt phòng trực tuyến cơ bản', 0.00),
      (2, 'VIP Silver', 1000, 'Nước trái cây chào mừng, giảm 5% dịch vụ Spa & F&B', 5.00),
      (3, 'VIP Gold', 5000, 'Late check-out 14:00 miễn phí, giảm 10% dịch vụ', 10.00),
      (4, 'VIP Platinum', 15000, 'Đưa đón xe Limousine sân bay, giảm 15% dịch vụ', 15.00),
      (5, 'VIP Diamond', 30000, 'Quản gia riêng 24/7, giảm 20% dịch vụ, ưu tiên phòng VIP', 20.00);
    `);

    // =========================================================================
    // 4. USERS (Tài khoản mẫu chuẩn & Nhóm Admin sinh viên)
    // =========================================================================
    console.log('👤 4. Seeding Người dùng (Users)...');
    // Tài khoản chuẩn hệ thống
    await sequelize.query(`
      INSERT INTO Users (UserId, RoleId, TierId, Username, FullName, Email, Phone, EmployeeCode, PasswordHash, IdNumber, IdType, DateOfBirth, Gender, Status) VALUES
      (1, 1, 5, 'admin', 'Quản Trị Viên Hệ Thống', 'admin@hoteldomain.vn', '0901234567', 'EMP-ADM-001', '${hash123456}', '079090123456', 'CCCD', '1990-01-01', 'Nam', 'Active'),
      (2, 2, 1, 'receptionist', 'Lê Tân Trực Ban', 'receptionist@hoteldomain.vn', '0902345678', 'EMP-REC-001', '${hash123456}', '079090234567', 'CCCD', '1995-05-15', 'Nữ', 'Active'),
      (3, 3, 1, 'kitchen', 'Bếp Trưởng Điều Hành', 'kitchen@hoteldomain.vn', '0903456789', 'EMP-KIT-001', '${hash123456}', '079090345678', 'CCCD', '1988-08-20', 'Nam', 'Active'),
      (4, 4, 1, 'housekeeping', 'Tổ Trưởng Buồng Phòng', 'housekeeping@hoteldomain.vn', '0904567890', 'EMP-HSK-001', '${hash123456}', '079090456789', 'CCCD', '1992-11-10', 'Nữ', 'Active'),
      (5, 5, 4, 'guest', 'Nguyễn Hoàng Nam (VIP)', 'guest@hoteldomain.vn', '0909999888', NULL, '${hash123456}', '079090999888', 'CCCD', '1994-03-22', 'Nam', 'Active');
    `);

    // 5 Tài khoản thành viên nhóm đồ án (mật khẩu 123456 để test dễ dàng)
    await sequelize.query(`
      INSERT INTO Users (UserId, RoleId, TierId, Username, FullName, Email, Phone, EmployeeCode, PasswordHash, IdNumber, IdType, DateOfBirth, Gender, Status) VALUES
      (6, 1, 5, 'admin_vanthuc', 'Nguyễn Văn Thực', 'vanthuc.22211tt2302@hoteldomain.vn', '0922112302', 'NV-22211TT2302', '${hash123456}', '079204001111', 'CCCD', '2004-03-15', 'Nam', 'Active'),
      (7, 1, 5, 'admin_nhanbao', 'Nguyễn Nhân Bảo', 'nhanbao.24211tt3501@hoteldomain.vn', '0924113501', 'NV-24211TT3501', '${hash123456}', '079204002222', 'CCCD', '2004-05-20', 'Nam', 'Active'),
      (8, 1, 5, 'admin_vanha', 'Đặng Văn Hà', 'vanha.23211tt4241@hoteldomain.vn', '0923114241', 'NV-23211TT4241', '${hash123456}', '079204003333', 'CCCD', '2004-08-10', 'Nam', 'Active'),
      (9, 1, 5, 'admin_thutrang', 'Nguyễn Xuân Thu Trang', 'thutrang.24211tt1788@hoteldomain.vn', '0924111788', 'NV-24211TT1788', '${hash123456}', '079204004444', 'CCCD', '2004-11-25', 'Nữ', 'Active'),
      (10, 1, 5, 'admin_thanhtuyen', 'Hồ Thanh Tuyền', 'thanhtuyen.23211tt3988@hoteldomain.vn', '0923113988', 'NV-23211TT3988', '${hash123456}', '079204005555', 'CCCD', '2004-02-18', 'Nữ', 'Active');
    `);

    // Thêm các khách hàng thực tế (Guests)
    await sequelize.query(`
      INSERT INTO Users (UserId, RoleId, TierId, Username, FullName, Email, Phone, PasswordHash, IdNumber, IdType, DateOfBirth, Gender, Status) VALUES
      (11, 5, 3, 'guest_thuha', 'Trần Thu Hà', 'thu.ha@gmail.com', '0912345601', '${hash123456}', '079195000101', 'CCCD', '1995-04-12', 'Nữ', 'Active'),
      (12, 5, 4, 'guest_quangminh', 'Lê Quang Minh', 'quang.minh@gmail.com', '0912345602', '${hash123456}', '079192000102', 'CCCD', '1992-09-18', 'Nam', 'Active'),
      (13, 5, 2, 'guest_kimanh', 'Phạm Kim Anh', 'kim.anh@gmail.com', '0912345603', '${hash123456}', '079198000103', 'CCCD', '1998-12-05', 'Nữ', 'Active'),
      (14, 5, 5, 'guest_ducthang', 'Vũ Đức Thắng', 'duc.thang@gmail.com', '0912345604', '${hash123456}', '079189000104', 'CCCD', '1989-07-25', 'Nam', 'Active'),
      (15, 5, 2, 'guest_phuonglinh', 'Đỗ Phương Linh', 'phuong.linh@gmail.com', '0912345605', '${hash123456}', '079197000105', 'CCCD', '1997-01-30', 'Nữ', 'Active');
    `);

    // =========================================================================
    // 5. AMENITIES (Tiện nghi chuẩn 5 sao)
    // =========================================================================
    console.log('🛁 5. Seeding Tiện nghi (Amenities)...');
    await sequelize.query(`
      INSERT INTO Amenities (AmenityId, AmenityName, Description, IconUrl) VALUES
      (1, 'Wi-Fi Tốc Độ Cao 500Mbps', 'Kết nối Internet cáp quang băng thông cao phủ sóng toàn resort', 'https://icons.hoteldomain.vn/wifi.svg'),
      (2, 'Ban Công Hướng Biển Trực Diện', 'Không gian ngắm bình minh và hoàng hôn biển riêng biệt', 'https://icons.hoteldomain.vn/balcony.svg'),
      (3, 'Bồn Tắm Jacuzzi Thủy Lực', 'Bồn tắm massage Jacuzzi nước ấm view toàn cảnh đại dương', 'https://icons.hoteldomain.vn/jacuzzi.svg'),
      (4, 'Quầy Bar Mini Rượu Vang', 'Trang bị vang hảo hạng nhập khẩu, bia thủ công và hạt dinh dưỡng', 'https://icons.hoteldomain.vn/minibar.svg'),
      (5, 'Máy Pha Cà Phê Nespresso', 'Máy pha cà phê viên nén Ý kèm 6 viên nén hương vị cao cấp mỗi ngày', 'https://icons.hoteldomain.vn/coffee.svg'),
      (6, 'Hồ Bơi Vô Cực Riêng Biệt', 'Hồ bơi tràn bờ nước mặn công nghệ điện phân muối sinh thái', 'https://icons.hoteldomain.vn/pool.svg'),
      (7, 'Quản Gia Riêng 24/7', 'Phục vụ tư nhân chu đáo mọi yêu cầu cá nhân hóa suốt kỳ nghỉ', 'https://icons.hoteldomain.vn/butler.svg'),
      (8, 'Smart TV 65-inch 4K', 'Tích hợp Netflix, Youtube Premium và hệ thống âm thanh vòm Bose', 'https://icons.hoteldomain.vn/tv.svg');
    `);

    // =========================================================================
    // 6. ROOM TYPES (8 Hạng phòng sang trọng, TÊN CHUẨN KHÔNG CÓ #1, #2...)
    // =========================================================================
    console.log('🛏️ 6. Seeding Hạng phòng (RoomTypes)...');
    await sequelize.query(`
      INSERT INTO RoomTypes (RoomTypeId, TypeCode, TypeName, Description, BasePrice, MaxOccupancy, AdultCapacity, ChildCapacity, TurnoverMinutes, ImageUrl, Status, IsDeleted) VALUES
      (1, 'RT-DLX-01', 'Deluxe Ocean View', 'Phòng Deluxe sang trọng với ban công riêng hướng biển Bãi Khem, nội thất gỗ óc chó ấm cúng.', 2500000.00, 3, 2, 1, 30, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', 'Active', 0),
      (2, 'RT-SUI-02', 'Premier Seafront Suite', 'Căn hộ Suite thượng hạng phòng khách riêng biệt và ban công ngắm biển 180 độ tuyệt mỹ.', 4500000.00, 4, 3, 1, 45, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80', 'Active', 0),
      (3, 'RT-VIL-03', 'Royal Beachfront Villa', 'Biệt thự sát biển có hồ bơi riêng biệt lập, lối đi thẳng ra bờ cát trắng mịn màng.', 12000000.00, 6, 4, 2, 90, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80', 'Active', 0),
      (4, 'RT-BUN-04', 'Garden Tropical Bungalow', 'Bungalow nép mình giữa khu vườn nhiệt đới thanh bình, không gian hòa quyện thiên nhiên.', 3200000.00, 3, 2, 1, 35, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80', 'Active', 0),
      (5, 'RT-FAM-05', 'Grand Family Ocean Suite', 'Không gian lý tưởng cho đại gia đình với 2 phòng ngủ lớn và khu vui chơi an toàn cho trẻ.', 5500000.00, 6, 4, 2, 60, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', 'Active', 0),
      (6, 'RT-PNT-06', 'Presidential Horizon Penthouse', 'Dinh thự áp mái siêu sang với quản gia riêng, rạp chiếu phim mini và hồ bơi vô cực trên cao.', 25000000.00, 8, 6, 2, 120, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 'Active', 0),
      (7, 'RT-SPA-07', 'Lotus Spa Suite', 'Hạng phòng nghỉ dưỡng kết hợp không gian trị liệu xông hơi thảo dược đá muối riêng tư.', 3800000.00, 3, 2, 1, 40, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80', 'Active', 0),
      (8, 'RT-HON-08', 'Honeymoon Ocean Retreat', 'Thiết kế lãng mạn cho kỳ trăng mật với bồn tắm Jacuzzi cánh hoa hồng sát biển thơ mộng.', 4800000.00, 2, 2, 0, 45, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', 'Active', 0);
    `);

    // Gán tiện nghi cho loại phòng
    await sequelize.query(`
      INSERT INTO RoomTypeAmenities (RoomTypeId, AmenityId) VALUES
      (1, 1), (1, 2), (1, 4), (1, 8),
      (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 8),
      (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8),
      (4, 1), (4, 4), (4, 5), (4, 8),
      (5, 1), (5, 2), (5, 4), (5, 5), (5, 8),
      (6, 1), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (6, 7), (6, 8),
      (7, 1), (7, 3), (7, 4), (7, 5), (7, 8),
      (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 8);
    `);

    // Quy tắc giá mùa hè & cuối tuần
    await sequelize.query(`
      INSERT INTO PricingRules (PricingRuleId, RoomTypeId, RuleName, StartDate, EndDate, MinPrice, MaxPrice, PriceMultiplier, Conditions, Priority, Status) VALUES
      (1, 1, 'Mùa cao điểm hè Phú Quốc', '2026-05-01', '2026-08-31', 2000000.00, 4000000.00, 1.20, 'Mùa du lịch biển', 1, 'Active'),
      (2, 2, 'Cuối tuần Thứ 6 & Thứ 7', '2026-01-01', '2026-12-31', 4000000.00, 6000000.00, 1.15, 'Phụ thu cuối tuần', 1, 'Active'),
      (3, 3, 'Gói Villa Nghỉ Dưỡng Trọn Gói', '2026-01-01', '2026-12-31', 10000000.00, 16000000.00, 1.00, 'Giá tiêu chuẩn', 1, 'Active');
    `);

    // =========================================================================
    // 7. PHYSICAL ROOMS (25 Phòng vật lý số đẹp: 101-105, 201-205... tại Phú Quốc)
    // =========================================================================
    console.log('🚪 7. Seeding Phòng vật lý (Rooms & physical_rooms)...');
    const roomsList = [
      // Tầng 1: Deluxe Ocean View & Garden Bungalow
      { id: 1, typeId: 1, num: '101', floor: 1, status: 'Occupied', desc: 'Phòng 101 Tầng 1 view vườn & hồ bơi' },
      { id: 2, typeId: 1, num: '102', floor: 1, status: 'Occupied', desc: 'Phòng 102 Tầng 1 view hướng biển' },
      { id: 3, typeId: 4, num: '103', floor: 1, status: 'CleanAvailable', desc: 'Bungalow 103 khuôn viên nhiệt đới' },
      { id: 4, typeId: 4, num: '104', floor: 1, status: 'CleanAvailable', desc: 'Bungalow 104 khuôn viên nhiệt đới' },
      { id: 5, typeId: 1, num: '105', floor: 1, status: 'Dirty', desc: 'Phòng 105 Tầng 1 chờ dọn phòng' },

      // Tầng 2: Deluxe Ocean View & Premier Suite
      { id: 6, typeId: 1, num: '201', floor: 2, status: 'Occupied', desc: 'Phòng 201 Tầng 2 ban công ngắm biển' },
      { id: 7, typeId: 2, num: '202', floor: 2, status: 'Occupied', desc: 'Premier Suite 202 view trực diện biển' },
      { id: 8, typeId: 2, num: '203', floor: 2, status: 'CleanAvailable', desc: 'Premier Suite 203 cao cấp' },
      { id: 9, typeId: 1, num: '204', floor: 2, status: 'CleanAvailable', desc: 'Phòng 204 Tầng 2 view biển êm đềm' },
      { id: 10, typeId: 1, num: '205', floor: 2, status: 'Cleaning', desc: 'Phòng 205 đang được nhân viên làm sạch' },

      // Tầng 3: Premier Suite & Lotus Spa Suite & Family Suite
      { id: 11, typeId: 2, num: '301', floor: 3, status: 'Occupied', desc: 'Premier Suite 301 ban công hoàng hôn' },
      { id: 12, typeId: 7, num: '302', floor: 3, status: 'Occupied', desc: 'Lotus Spa Suite 302 không gian thư giãn' },
      { id: 13, typeId: 5, num: '303', floor: 3, status: 'CleanAvailable', desc: 'Grand Family Suite 303 tiện nghi' },
      { id: 14, typeId: 5, num: '304', floor: 3, status: 'CleanAvailable', desc: 'Grand Family Suite 304 tiện nghi' },
      { id: 15, typeId: 2, num: '305', floor: 3, status: 'Maintenance', desc: 'Phòng 305 bảo trì hệ thống điều hòa' },

      // Tầng 4: Honeymoon Retreat & Premier Suite
      { id: 16, typeId: 8, num: '401', floor: 4, status: 'CleanAvailable', desc: 'Honeymoon Retreat 401 lãng mạn' },
      { id: 17, typeId: 8, num: '402', floor: 4, status: 'CleanAvailable', desc: 'Honeymoon Retreat 402 lãng mạn' },
      { id: 18, typeId: 2, num: '403', floor: 4, status: 'CleanAvailable', desc: 'Premier Suite 403 tầng cao thoáng mát' },
      { id: 19, typeId: 2, num: '404', floor: 4, status: 'CleanAvailable', desc: 'Premier Suite 404 tầng cao view biển' },
      { id: 20, typeId: 1, num: '405', floor: 4, status: 'CleanAvailable', desc: 'Phòng Deluxe 405 view bao quát biển' },

      // Tầng 5: Royal Villa & Penthouse
      { id: 21, typeId: 3, num: '501', floor: 5, status: 'Occupied', desc: 'Royal Beachfront Villa 501 hồ bơi riêng' },
      { id: 22, typeId: 3, num: '502', floor: 5, status: 'CleanAvailable', desc: 'Royal Beachfront Villa 502 hồ bơi riêng' },
      { id: 23, typeId: 6, num: '503', floor: 5, status: 'CleanAvailable', desc: 'Presidential Penthouse 503 đẳng cấp đỉnh cao' },
      { id: 24, typeId: 6, num: '504', floor: 5, status: 'CleanAvailable', desc: 'Presidential Penthouse 504 đẳng cấp đỉnh cao' },
      { id: 25, typeId: 3, num: '505', floor: 5, status: 'CleanAvailable', desc: 'Royal Beachfront Villa 505 góc biển' },

      // Bổ sung các phòng CleanAvailable sẵn sàng gán phòng cho mọi hạng phòng
      { id: 26, typeId: 7, num: '306', floor: 3, status: 'CleanAvailable', desc: 'Lotus Spa Suite 306 ban công thư giãn' },
      { id: 27, typeId: 7, num: '307', floor: 3, status: 'CleanAvailable', desc: 'Lotus Spa Suite 307 không gian tĩnh lặng' },
      { id: 28, typeId: 7, num: '308', floor: 3, status: 'CleanAvailable', desc: 'Lotus Spa Suite 308 ngắm hoàng hôn' },
      { id: 29, typeId: 4, num: '106', floor: 1, status: 'CleanAvailable', desc: 'Bungalow 106 khuôn viên nhiệt đới' },
      { id: 30, typeId: 5, num: '309', floor: 3, status: 'CleanAvailable', desc: 'Grand Family Suite 309 tiện nghi' },
      { id: 31, typeId: 8, num: '406', floor: 4, status: 'CleanAvailable', desc: 'Honeymoon Retreat 406 lãng mạn' }
    ];

    for (const r of roomsList) {
      await sequelize.query(`
        INSERT INTO Rooms (RoomId, BranchId, RoomTypeId, RoomNumber, Floor, Status, Description, IsDeleted)
        VALUES (${r.id}, 1, ${r.typeId}, '${r.num}', ${r.floor}, '${r.status}', '${r.desc}', 0);
      `);

      const bpStatus = r.status === 'Dirty' || r.status === 'Cleaning' ? 'dirty' : (r.status === 'Maintenance' ? 'ooo' : 'clean');
      const ltStatus = r.status === 'Occupied' ? 'inhouse' : 'vacant';
      await sequelize.query(`
        INSERT INTO physical_rooms (id, so_phong, tang, khu, ma_loai, ma_khoa, buong_phong, luu_tru, ghi_chu)
        VALUES (${r.id}, '${r.num}', ${r.floor}, 'A', 'RT-${r.typeId}', 'LOCK-${r.num}', '${bpStatus}', '${ltStatus}', '${r.desc}');
      `);
    }

    // =========================================================================
    // 8. OTA CHANNELS & VOUCHERS
    // =========================================================================
    console.log('🎟️ 8. Seeding Kênh OTA & Vouchers...');
    await sequelize.query(`
      INSERT INTO OTAChannels (OTAChannelId, ChannelName, ApiType, ApiKey, Status) VALUES
      (1, 'Agoda Global', 'REST_XML_V2', 'agoda_live_api_key_phuquoc_9988', 'Active'),
      (2, 'Booking.com Direct', 'REST_JSON_V1', 'bookingcom_live_sec_key_7766', 'Active'),
      (3, 'Traveloka SEA', 'REST_JSON_V2', 'traveloka_live_auth_key_5544', 'Active'),
      (4, 'Expedia Partner', 'REST_XML_V1', 'expedia_live_partner_key_3322', 'Active'),
      (5, 'Trip.com Gateway', 'REST_JSON_V2', 'tripcom_live_api_key_1100', 'Active');
    `);

    for (let rtId = 1; rtId <= 8; rtId++) {
      await sequelize.query(`
        INSERT INTO OTARoomMappings (OTAChannelId, RoomTypeId, OTARoomTypeCode, Status, LastSyncedAt)
        VALUES (1, ${rtId}, 'AGODA-RT-00${rtId}', 'Active', NOW()),
               (2, ${rtId}, 'BOOKING-RT-00${rtId}', 'Active', NOW());
      `);
    }

    await sequelize.query(`
      INSERT INTO Vouchers (VoucherId, Code, DiscountType, DiscountValue, MinOrderAmount, MaxDiscountAmount, StartDate, EndDate, UsageLimit, UsedCount, Status, IsDeleted) VALUES
      (1, 'SUMMER2026', 'Percent', 15.00, 2000000.00, 1000000.00, '2026-05-01', '2026-08-31', 500, 42, 'Active', 0),
      (2, 'WELCOMEVIP', 'FixedAmount', 500000.00, 3000000.00, 500000.00, '2026-01-01', '2026-12-31', 200, 68, 'Active', 0),
      (3, 'GRAND50', 'Percent', 20.00, 5000000.00, 1500000.00, '2026-01-01', '2026-12-31', 100, 15, 'Active', 0),
      (4, 'HONEYMOON', 'FixedAmount', 1000000.00, 8000000.00, 1000000.00, '2026-01-01', '2026-12-31', 50, 12, 'Active', 0),
      (5, 'EARLYBIRD', 'Percent', 10.00, 1500000.00, 800000.00, '2026-01-01', '2026-12-31', 300, 89, 'Active', 0);
    `);

    // =========================================================================
    // 9. SERVICE CATEGORIES & SERVICES (SẠCH SẼ, CHUẨN 5 SAO, KHÔNG TRÙNG LẶP)
    // =========================================================================
    console.log('💆 9. Seeding Danh mục & Dịch vụ khách sạn (Services)...');
    await sequelize.query(`
      INSERT INTO ServiceCategories (CategoryId, CategoryName, Description, Status, IsDeleted) VALUES
      (1, 'Spa & Chăm Sóc Sức Khỏe', 'Trị liệu thảo mộc thiên nhiên, xông hơi sauna và massage thư giãn', 'Active', 0),
      (2, 'Ẩm Thực Phục Vụ Tại Phòng', 'Dịch vụ In-room dining ẩm thực thượng hạng phục vụ 24/7', 'Active', 0),
      (3, 'Giặt Ủi & Hấp Cao Cấp', 'Dịch vụ giặt sấy lấy nhanh, hấp tiệt trùng và bảo quản lụa tơ tằm', 'Active', 0),
      (4, 'Vận Chuyển Concierge', 'Đưa đón sân bay xe Maybach, thuê xe riêng và dịch vụ lái xe VIP', 'Active', 0),
      (5, 'Tour & Trải Nghiệm Biển', 'Du thuyền ngắm hoàng hôn vịnh An Thới, lặn ngắm san hô cao cấp', 'Active', 0),
      (6, 'Tiện Ích & Dịch Vụ Khác', 'Gói setup tiệc kỷ niệm, chăm sóc thú cưng và các dịch vụ cá nhân', 'Active', 0);
    `);

    const cleanServices = [
      // Nhóm 1: Spa
      { id: 1, catId: 1, code: 'SVC-SPA-001', name: 'Trị liệu thảo mộc toàn thân Aroma 60m', price: 1650000.00, unit: 'Liệu trình', desc: 'Tiếp đón tại sảnh Lotus Spa với trà hoa cúc mật ong, massage tinh dầu thảo dược thiên nhiên.', status: 'Active' },
      { id: 2, catId: 1, code: 'SVC-SPA-002', name: 'Massage đá nóng núi lửa Himalaya 90m', price: 2100000.00, unit: 'Liệu trình', desc: 'Trị liệu chuyên sâu với đá bazan nóng lưu thông khí huyết và thư giãn cơ bắp.', status: 'Active' },
      { id: 3, catId: 1, code: 'SVC-SPA-003', name: 'Xông hơi thảo dược & Tẩy tế bào chết ngọc trai', price: 850000.00, unit: 'Lượt', desc: 'Thanh lọc làn da với bột ngọc trai Phú Quốc và xông hơi tinh dầu tràm gió.', status: 'Active' },

      // Nhóm 2: Ẩm thực In-room
      { id: 4, catId: 2, code: 'SVC-DNG-001', name: 'Suất ăn sáng In-room Dining chuẩn American', price: 450000.00, unit: 'Khách', desc: 'Bánh sừng bò Pháp, trứng chảo ốp la, xúc xích nướng, hoa quả tươi và nước cam ép.', status: 'Active' },
      { id: 5, catId: 2, code: 'SVC-DNG-002', name: 'Bữa tối lãng mạn ánh nến bên bờ biển', price: 4800000.00, unit: 'Cặp đôi', desc: 'Bàn tiệc riêng sát biển Sunset Cove với 100 ngọn nến, thực đơn 5 món Bếp trưởng phục vụ riêng.', status: 'Active' },
      { id: 6, catId: 2, code: 'SVC-DNG-003', name: 'Trà chiều Hoàng gia Anh phong cách High Tea', price: 750000.00, unit: 'Set 2 khách', desc: 'Khay bánh 3 tầng trứ danh gồm bánh tart, scone kem bơ dâu và trà Twinings thượng hạng.', status: 'Active' },

      // Nhóm 3: Giặt ủi
      { id: 7, catId: 3, code: 'SVC-LND-001', name: 'Giặt ủi hấp ép lấy nhanh trong 4 giờ', price: 250000.00, unit: 'Lượt', desc: 'Công nghệ giặt hơi nước khử khuẩn, bảo quản form áo và giao tận phòng trong 4h.', status: 'Active' },
      { id: 8, catId: 3, code: 'SVC-LND-002', name: 'Giặt khô bảo quản áo vest & đầm dạ hội', price: 350000.00, unit: 'Bộ', desc: 'Dung môi giặt khô sinh học an toàn cho sợi len cashmere và tơ lụa tự nhiên.', status: 'Active' },
      { id: 9, catId: 3, code: 'SVC-LND-003', name: 'Ủi gấp trang phục cao cấp tại phòng', price: 120000.00, unit: 'Bộ', desc: 'Nhân viên phục vụ ủi phẳng trang phục chỉnh tề trước thềm sự kiện.', status: 'Active' },

      // Nhóm 4: Vận chuyển
      { id: 10, catId: 4, code: 'SVC-TRN-001', name: 'Đưa đón sân bay Limousine Mercedes Maybach', price: 2200000.00, unit: 'Chuyến', desc: 'Xe sang Maybach đời mới, tài xế riêng chuẩn VIP đón tận cửa ga đến sân bay Phú Quốc.', status: 'Active' },
      { id: 11, catId: 4, code: 'SVC-TRN-002', name: 'Đưa đón sân bay xe Van hạng sang Ford Tourneo', price: 1200000.00, unit: 'Chuyến', desc: 'Xe 7 chỗ rộng rãi, phù hợp gia đình kèm hành lý cồng kềnh.', status: 'Active' },
      { id: 12, catId: 4, code: 'SVC-TRN-003', name: 'Thuê xe tự lái SUV sang trọng 1 ngày', price: 1800000.00, unit: 'Ngày', desc: 'Xe 7 chỗ đời mới bảo hiểm toàn diện, tự do khám phá đảo ngọc Phú Quốc.', status: 'Active' },

      // Nhóm 5: Tour biển
      { id: 13, catId: 5, code: 'SVC-EXP-001', name: 'Tour du thuyền ngắm hoàng hôn vịnh An Thới', price: 8500000.00, unit: 'Chuyến riêng', desc: 'Hải trình khám phá vịnh 3 tiếng ngắm hoàng hôn kèm tiệc rượu vang và canapé phục vụ riêng.', status: 'Active' },
      { id: 14, catId: 5, code: 'SVC-EXP-002', name: 'Lặn biển ngắm san hô bằng bình khí Scuba', price: 1500000.00, unit: 'Khách', desc: 'Huấn luyện viên PADI kèm 1-1, trang bị bình dưỡng khí hiện đại khám phá rạn san hô.', status: 'Active' },
      { id: 15, catId: 5, code: 'SVC-EXP-003', name: 'Thuê cano cao tốc tham quan hòn Mây Rút', price: 3500000.00, unit: 'Giờ', desc: 'Cano cao tốc riêng khám phá 4 hòn đảo đẹp nhất phía Nam Phú Quốc.', status: 'Active' },

      // Nhóm 6: Dịch vụ khác
      { id: 16, catId: 6, code: 'SVC-EXT-001', name: 'Gói setup hoa tươi & nến kỷ niệm ngày cưới', price: 1200000.00, unit: 'Gói', desc: 'Trang trí phòng hoa hồng Ecuador, rượu vang sủi Prosecco và thiệp chúc mừng viết tay.', status: 'Inactive' }
    ];

    for (const s of cleanServices) {
      await sequelize.query(`
        INSERT INTO Services (ServiceId, CategoryId, ServiceCode, ServiceName, Price, Unit, Description, Status, IsDeleted)
        VALUES (${s.id}, ${s.catId}, '${s.code}', '${s.name}', ${s.price}, '${s.unit}', '${s.desc}', '${s.status}', 0);
      `);
    }

    // =========================================================================
    // 10. MENU F&B (Nhà hàng Sen & Bar Horizon)
    // =========================================================================
    console.log('🍽️ 10. Seeding Thực đơn ẩm thực (Menu F&B)...');
    await sequelize.query(`
      INSERT INTO MenuCategories (CategoryId, CategoryName, Description, IsDeleted) VALUES
      (1, 'Khai Vị & Salad Thượng Hạng', 'Các món khai vị thanh mát đánh thức vị giác', 0),
      (2, 'Món Chính - Bò Wagyu & Bò Mỹ', 'Thịt bò nhập khẩu áp chảo kèm sốt nấm Truffle', 0),
      (3, 'Món Chính - Hải Sản Phú Quốc', 'Tôm hùm, cua hoàng đế, cá tuyết tươi sống', 0),
      (4, 'Tráng Miệng & Bánh Ngọt Ý', 'Bánh Tiramisu, kem Gelato và chè hạt sen yến sào', 0),
      (5, 'Thức Uống & Rượu Vang', 'Vang Pháp, Chile và nước ép trái cây nhiệt đới', 0);
    `);

    const menuItems = [
      { id: 1, catId: 1, name: 'Salad cá hồi Na Uy xông khói', price: 280000.00, sku: 'FNB-APP-01' },
      { id: 2, catId: 1, name: 'Súp bào ngư vi cá tổ yến', price: 650000.00, sku: 'FNB-APP-02' },
      { id: 3, catId: 2, name: 'Bò Wagyu A5 nướng than hoa sốt tiêu đen', price: 1850000.00, sku: 'FNB-MC-01' },
      { id: 4, catId: 2, name: 'Bò bít tết Thăn nội Tenderloin Angus', price: 890000.00, sku: 'FNB-MC-02' },
      { id: 5, catId: 3, name: 'Tôm hùm Alaska nướng bơ tỏi thảo mộc', price: 1450000.00, sku: 'FNB-MC-03' },
      { id: 6, catId: 3, name: 'Cá tuyết áp chảo sốt bơ chanh vang trắng', price: 780000.00, sku: 'FNB-MC-04' },
      { id: 7, catId: 4, name: 'Bánh Tiramisu truyền thống Ý', price: 160000.00, sku: 'FNB-DES-01' },
      { id: 8, catId: 4, name: 'Bánh sô cô la Lava tan chảy kem vani Bourbon', price: 190000.00, sku: 'FNB-DES-02' },
      { id: 9, catId: 5, name: 'Rượu vang đỏ Montes Alpha Cabernet Sauvignon', price: 1650000.00, sku: 'FNB-BEV-01' },
      { id: 10, catId: 5, name: 'Nước dừa tươi xiêm Bến Tre ướp lạnh', price: 95000.00, sku: 'FNB-BEV-02' }
    ];

    for (const m of menuItems) {
      await sequelize.query(`
        INSERT INTO MenuItems (MenuItemId, CategoryId, ItemName, Price, SKU, Status, IsDeleted)
        VALUES (${m.id}, ${m.catId}, '${m.name}', ${m.price}, '${m.sku}', 'Available', 0);
      `);
    }

    // Restaurant tables
    for (let t = 1; t <= 12; t++) {
      const cap = t % 3 === 0 ? 8 : (t % 2 === 0 ? 4 : 2);
      await sequelize.query(`
        INSERT INTO RestaurantTables (TableId, BranchName, TableNumber, Location, Capacity, Status, IsDeleted)
        VALUES (${t}, 'Grand Horizon Phú Quốc Sanctuary Resort', 'TB-${String(t).padStart(2, '0')}', 'Tầng 1 - Sân biển', ${cap}, 'Available', 0);
      `);
    }

    // =========================================================================
    // 11. INVENTORY & MINIBAR PRODUCTS
    // =========================================================================
    console.log('📦 11. Seeding Kho & Vật tư Minibar...');
    const invItems = [
      { id: 1, code: 'MINI-BEER-01', name: 'Bia Corona Extra chai 355ml', type: 'Minibar', unit: 'Chai', qty: 200, cost: 35000 },
      { id: 2, code: 'MINI-WINE-01', name: 'Rượu vang đỏ Chile mini 187ml', type: 'Minibar', unit: 'Chai', qty: 100, cost: 95000 },
      { id: 3, code: 'MINI-WATER-01', name: 'Nước khoáng San Pellegrino 500ml', type: 'Minibar', unit: 'Chai', qty: 300, cost: 30000 },
      { id: 4, code: 'MINI-NUT-01', name: 'Hạt điều rang muối hộp thiếc 150g', type: 'Minibar', unit: 'Hộp', qty: 150, cost: 45000 },
      { id: 5, code: 'MINI-CHIP-01', name: 'Snack khoai tây Pringles vị tự nhiên', type: 'Minibar', unit: 'Hộp', qty: 180, cost: 32000 },
      { id: 6, code: 'AMEN-LOTION-01', name: 'Bộ dầu gội sữa tắm Lotus Organic 100ml', type: 'Amenity', unit: 'Bộ', qty: 500, cost: 55000 },
      { id: 7, code: 'LINEN-TOWEL-01', name: 'Khăn tắm cotton Ai Cập 5 sao cao cấp', type: 'Linen', unit: 'Cái', qty: 400, cost: 120000 }
    ];

    for (const inv of invItems) {
      await sequelize.query(`
        INSERT INTO InventoryItems (ItemId, ItemCode, ItemName, ItemType, Unit, Quantity, MinQuantity, UnitCost, Status, IsDeleted)
        VALUES (${inv.id}, '${inv.code}', '${inv.name}', '${inv.type}', '${inv.unit}', ${inv.qty}, 20, ${inv.cost}, 'Active', 0);
      `);
    }

    // =========================================================================
    // 12. BOOKINGS & IN-HOUSE STAYS (Khách đang lưu trú & đơn đặt phòng)
    // =========================================================================
    console.log('🏨 12. Seeding Đặt phòng (Bookings) & Lưu trú thực tế (Stays)...');
    
    // 6 Đặt phòng & Stay ĐANG Ở (CheckedIn) - Gắn các phòng 101, 102, 201, 202, 301, 501
    const activeStaysData = [
      { bookingId: 1, stayId: 1, userId: 5,  roomId: 1,  rtId: 1, guest: 'Nguyễn Hoàng Nam', cccd: '079090999888', phone: '0909999888', nights: 3, roomRate: 2500000 },
      { bookingId: 2, stayId: 2, userId: 11, roomId: 2,  rtId: 1, guest: 'Trần Thu Hà',      cccd: '079195000101', phone: '0912345601', nights: 2, roomRate: 2500000 },
      { bookingId: 3, stayId: 3, userId: 12, roomId: 6,  rtId: 1, guest: 'Lê Quang Minh',    cccd: '079192000102', phone: '0912345602', nights: 4, roomRate: 2500000 },
      { bookingId: 4, stayId: 4, userId: 13, roomId: 7,  rtId: 2, guest: 'Phạm Kim Anh',     cccd: '079198000103', phone: '0912345603', nights: 3, roomRate: 4500000 },
      { bookingId: 5, stayId: 5, userId: 14, roomId: 11, rtId: 2, guest: 'Vũ Đức Thắng',     cccd: '079189000104', phone: '0912345604', nights: 5, roomRate: 4500000 },
      { bookingId: 6, stayId: 6, userId: 15, roomId: 21, rtId: 3, guest: 'Đỗ Phương Linh',   cccd: '079197000105', phone: '0912345605', nights: 2, roomRate: 12000000 }
    ];

    for (const item of activeStaysData) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() - 1); // Đã nhận phòng từ hôm qua
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + item.nights);

      const subtotal = item.roomRate * item.nights;
      const deposit = Math.round(subtotal * 0.3); // Cọc 30%
      const confCode = `GH${100000 + item.bookingId}`;

      // Insert Booking
      await sequelize.query(`
        INSERT INTO Bookings (
          BookingId, UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights,
          Adults, Children, RoomQuantity, RoomSubtotal, SurchargeAmount, DiscountAmount,
          TotalAmount, DepositAmount, Status, BookingSource, ConfirmationCode, CreatedAt
        ) VALUES (
          ${item.bookingId}, ${item.userId}, ${item.rtId}, '${checkIn.toISOString().slice(0, 10)}',
          '${checkOut.toISOString().slice(0, 10)}', ${item.nights}, 2, 0, 1, ${subtotal},
          0.00, 0.00, ${subtotal}, ${deposit}, 'CheckedIn', 'DirectWeb', '${confCode}', NOW()
        );
      `);

      // Insert Primary Guest
      await sequelize.query(`
        INSERT INTO BookingGuests (BookingGuestId, BookingId, FullName, Email, Phone, IdNumber, IdType, IsPrimaryGuest)
        VALUES (${item.bookingId}, ${item.bookingId}, '${item.guest}', 'guest_${item.bookingId}@hoteldomain.vn', '${item.phone}', '${item.cccd}', 'CCCD', 1);
      `);

      // Insert Stay
      await sequelize.query(`
        INSERT INTO Stays (StayId, BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, ActualCheckOut, Status, DepositAmount, CheckInTime)
        VALUES (${item.stayId}, ${item.bookingId}, ${item.roomId}, '${checkIn.toISOString().slice(0, 19).replace('T', ' ')}', '${checkOut.toISOString().slice(0, 19).replace('T', ' ')}', NULL, 'CheckedIn', ${deposit}, '${checkIn.toISOString().slice(0, 19).replace('T', ' ')}');
      `);

      // Deposit payment record
      await sequelize.query(`
        INSERT INTO Payments (InvoiceId, BookingId, UserId, Amount, PaymentMethod, PaymentDate, TransactionCode, Status)
        VALUES (NULL, ${item.bookingId}, ${item.userId}, ${deposit}, 'VietQR', NOW(), 'PMT-DEP-${confCode}', 'Paid');
      `);
    }

    // 4 Đặt phòng sắp tới (Confirmed)
    for (let b = 7; b <= 10; b++) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + (b - 6) * 2);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 2);
      const confCode = `GH${100000 + b}`;

      await sequelize.query(`
        INSERT INTO Bookings (
          BookingId, UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights,
          Adults, Children, RoomQuantity, RoomSubtotal, TotalAmount, DepositAmount,
          Status, BookingSource, ConfirmationCode, CreatedAt
        ) VALUES (
          ${b}, 5, 1, '${checkIn.toISOString().slice(0, 10)}', '${checkOut.toISOString().slice(0, 10)}',
          2, 2, 0, 1, 5000000.00, 5000000.00, 1500000.00, 'Confirmed', 'OTA.Agoda', '${confCode}', NOW()
        );
      `);
    }

    // 2 Đặt phòng quá khứ đã Checkout hoàn tất (Completed)
    for (let b = 11; b <= 12; b++) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() - 10);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() - 7);
      const confCode = `GH${100000 + b}`;

      await sequelize.query(`
        INSERT INTO Bookings (
          BookingId, UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights,
          Adults, Children, RoomQuantity, RoomSubtotal, TotalAmount, DepositAmount,
          Status, BookingSource, ConfirmationCode, CreatedAt
        ) VALUES (
          ${b}, 11, 2, '${checkIn.toISOString().slice(0, 10)}', '${checkOut.toISOString().slice(0, 10)}',
          3, 2, 0, 1, 13500000.00, 13500000.00, 4000000.00, 'Completed', 'DirectWeb', '${confCode}', NOW()
        );
      `);

      const stayId = b - 4; // Stay 7, 8
      await sequelize.query(`
        INSERT INTO Stays (StayId, BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, ActualCheckOut, Status, DepositAmount)
        VALUES (${stayId}, ${b}, ${b - 3}, '${checkIn.toISOString().slice(0, 10)} 14:00:00', '${checkOut.toISOString().slice(0, 10)} 12:00:00', '${checkOut.toISOString().slice(0, 10)} 11:30:00', 'CheckedOut', 4000000.00);
      `);

      // Hóa đơn đã quyết toán cho các stay hoàn tất
      const invId = b - 10;
      await sequelize.query(`
        INSERT INTO Invoices (InvoiceId, StayId, BookingId, InvoiceNumber, InvoiceDate, Subtotal, VATRate, VATAmount, TotalAmount, Status)
        VALUES (${invId}, ${stayId}, ${b}, 'INV-2026-00000${invId}', NOW(), 13500000.00, 10.0, 1350000.00, 14850000.00, 'Paid');
      `);

      await sequelize.query(`
        INSERT INTO Payments (InvoiceId, BookingId, UserId, Amount, PaymentMethod, PaymentDate, TransactionCode, Status)
        VALUES (${invId}, ${b}, 11, 14850000.00, 'Cash', NOW(), 'PMT-INV-${invId}-PAID', 'Paid');
      `);
    }

    // =========================================================================
    // 13. SERVICE ORDERS (Đơn dịch vụ phòng In-House thực tế)
    // =========================================================================
    console.log('🛎️ 13. Seeding Đơn đặt dịch vụ (Service Orders)...');
    const serviceOrdersSeed = [
      // Stay 1 (Phòng 101 - Anh Nam VIP)
      { id: 1, stayId: 1, svcId: 1, qty: 2, price: 1650000, status: 'Completed', note: 'Massage toàn thân cho 2 khách lúc 16h' },
      { id: 2, stayId: 1, svcId: 7, qty: 1, price: 250000,  status: 'Received',  note: 'Giặt ủi áo sơ mi lấy trong 4h' },
      { id: 3, stayId: 1, svcId: 4, qty: 2, price: 450000,  status: 'Completed', note: 'Suất ăn sáng tại phòng 07h30 sáng nay' },

      // Stay 2 (Phòng 102 - Chị Hà)
      { id: 4, stayId: 2, svcId: 10, qty: 1, price: 2200000, status: 'Completed', note: 'Đưa đón Maybach sân bay khi tới' },
      { id: 5, stayId: 2, svcId: 6,  qty: 1, price: 750000,  status: 'InProgress', note: 'Trà chiều High Tea lúc 15h30' },

      // Stay 3 (Phòng 201 - Anh Minh)
      { id: 6, stayId: 3, svcId: 13, qty: 1, price: 8500000, status: 'Received', note: 'Tour du thuyền hoàng hôn chiều mai' },
      { id: 7, stayId: 3, svcId: 8,  qty: 2, price: 350000,  status: 'InProgress', note: 'Giặt khô 2 bộ vest dạ tiệc' },

      // Stay 4 (Phòng 202 - Chị Kim Anh)
      { id: 8, stayId: 4, svcId: 5,  qty: 1, price: 4800000, status: 'InProgress', note: 'Bàn tiệc lãng mạn ánh nến tối nay lúc 19h00' },
      { id: 9, stayId: 4, svcId: 2,  qty: 2, price: 2100000, status: 'Completed', note: 'Spa đá nóng Himalaya lúc 10h sáng' },

      // Stay 5 (Phòng 301 - Anh Thắng)
      { id: 10, stayId: 5, svcId: 14, qty: 2, price: 1500000, status: 'Received', note: 'Lặn ngắm san hô Scuba sáng mai' },
      { id: 11, stayId: 5, svcId: 12, qty: 1, price: 1800000, status: 'Completed', note: 'Thuê xe SUV tự lái 1 ngày' }
    ];

    for (const so of serviceOrdersSeed) {
      const total = so.qty * so.price;
      await sequelize.query(`
        INSERT INTO ServiceOrders (OrderId, StayId, ServiceId, CreatedBy, Quantity, UnitPrice, TotalPrice, OrderDate, Status, Note)
        VALUES (${so.id}, ${so.stayId}, ${so.svcId}, 1, ${so.qty}, ${so.price}, ${total}, NOW(), '${so.status}', '${so.note}');
      `);
    }

    // =========================================================================
    // 14. MINIBAR USAGES
    // =========================================================================
    console.log('🍾 14. Seeding Tiêu dùng Minibar...');
    await sequelize.query(`
      INSERT INTO MinibarUsages (UsageId, StayId, ItemId, RecordedBy, Quantity, UsageDate, UnitPrice, TotalAmount) VALUES
      (1, 1, 1, 4, 2, NOW(), 50000.00, 100000.00),
      (2, 1, 4, 4, 1, NOW(), 75000.00, 75000.00),
      (3, 2, 2, 4, 1, NOW(), 150000.00, 150000.00),
      (4, 3, 1, 4, 4, NOW(), 50000.00, 200000.00),
      (5, 4, 3, 4, 2, NOW(), 45000.00, 90000.00);
    `);

    // =========================================================================
    // 15. CHATBOT KNOWLEDGE BASE (10 Câu hỏi đáp thông minh)
    // =========================================================================
    console.log('🤖 15. Seeding Tri thức AI Chatbot (Knowledge Base)...');
    const chatbotQAs = [
      { q: 'Khách sạn có quy định giờ nhận và trả phòng như thế nào?', a: 'Dạ, giờ nhận phòng (Check-in) tiêu chuẩn là từ 14:00 và giờ trả phòng (Check-out) là trước 12:00 trưa hàng ngày. Hội viên VIP Gold trở lên được hưởng ưu đãi trả phòng muộn đến 14:00 miễn phí tùy tình trạng phòng.', cat: 'Checkin' },
      { q: 'Bữa sáng buffet được phục vụ ở đâu và vào khung giờ nào?', a: 'Dạ, tiệc buffet sáng quốc tế được phục vụ tại Nhà hàng Sen (Tầng 1 nhìn ra biển) từ 06:30 đến 10:00 sáng mỗi ngày ạ.', cat: 'Dining' },
      { q: 'Hồ bơi vô cực và bãi biển mở cửa lúc mấy giờ?', a: 'Dạ, hồ bơi vô cực mở cửa từ 06:00 sáng đến 21:00 tối. Bãi biển riêng Bãi Khem có nhân viên cứu hộ túc trực từ 06:00 đến 18:00 hàng ngày.', cat: 'Facilities' },
      { q: 'Khách sạn có dịch vụ đưa đón sân bay không?', a: 'Dạ có ạ, resort cung cấp dịch vụ đưa đón sân bay bằng xe Limousine Mercedes Maybach hoặc xe Van cao cấp 24/7. Quý khách vui lòng thông báo số hiệu chuyến bay trước 4 tiếng để lễ tân chuẩn bị đón chu đáo nhất.', cat: 'Transport' },
      { q: 'Mật khẩu Wi-Fi của resort là gì?', a: 'Dạ, mạng Wi-Fi tại resort là "GrandHorizon_Resort", không yêu cầu mật khẩu. Quý khách chỉ cần mở trình duyệt và nhập số phòng cùng họ tên để đăng nhập tốc độ cao 500Mbps.', cat: 'Wifi' },
      { q: 'Resort có những dịch vụ Spa nào nổi bật?', a: 'Dạ, Lotus Spa cung cấp các liệu trình massage thảo mộc toàn thân Aroma 60m, massage đá nóng Himalaya 90m và xông hơi muối hồng. Quý khách có thể đặt trực tiếp tại quầy hoặc qua menu dịch vụ trên trang cá nhân.', cat: 'Spa' },
      { q: 'Tôi có thể yêu cầu đặt tour tham quan đảo và lặn san hô không?', a: 'Dạ hoàn toàn được ạ. Concierge của chúng tôi tổ chức tour du thuyền riêng ngắm hoàng hôn vịnh An Thới, lặn bình khí Scuba và cano tốc hành đi 4 đảo Nam Phú Quốc.', cat: 'Tours' },
      { q: 'Chính sách hủy phòng và hoàn tiền của khách sạn như thế nào?', a: 'Dạ, quý khách được miễn phí hủy phòng trước 7 ngày so với ngày nhận phòng. Nếu hủy trong vòng 7 ngày, phí hủy là 100% tiền đặt cọc theo quy định của resort.', cat: 'Policy' }
    ];

    for (let k = 0; k < chatbotQAs.length; k++) {
      const item = chatbotQAs[k];
      await sequelize.query(`
        INSERT INTO ChatbotKnowledgeBase (KnowledgeId, Question, Answer, Category, Status)
        VALUES (${k + 1}, '${item.q}', '${item.a}', '${item.cat}', 'Active');
      `);
    }

    // =========================================================================
    // 16. LATE FEE POLICY & POLICIES
    // =========================================================================
    console.log('📋 16. Seeding Chính sách trả phòng trễ (Late Fee Policies)...');
    await sequelize.query(`
      INSERT INTO LateFeePolicies (
        PolicyId, BranchId, PolicyName, GracePeriodMinutes, HourlyFee,
        HalfDayThresholdHours, HalfDayFeePercent, FullDayThresholdHours,
        FullDayFeePercent, MaxFee, TaxRate, IsActive
      ) VALUES (
        1, 1, 'Chính sách trả phòng trễ tiêu chuẩn Phú Quốc', 30, 150000.00,
        3, 50.00, 6, 100.00, 2000000.00, 10.00, 1
      );
    `);

    // =========================================================================
    // 17. BẬT LẠI RÀNG BUỘC KHÓA NGOẠI & ĐỒNG BỘ INDEX TÌM KIẾM
    // =========================================================================
    console.log('\n🔒 Đang kích hoạt lại kiểm tra ràng buộc toàn vẹn khóa ngoại (FOREIGN_KEY_CHECKS)...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('🔍 Đang đồng bộ hóa cây chỉ mục phòng (RoomSearchIndex)...');
    try {
      const { syncSearchIndex } = require('../services/searchIndexService');
      await syncSearchIndex();
      console.log('✅ Đã đồng bộ RoomSearchIndex thành công.');
    } catch (e) {
      console.log('   (Bỏ qua RoomSearchIndex: ' + e.message + ')');
    }

    console.log('\n================================================================================');
    console.log('🎉 TOÀN BỘ CƠ SỞ DỮ LIỆU ĐÃ ĐƯỢC SEED SẠCH SẼ, ĐẸP MẮT & KHÔNG CÒN TRÙNG LẶP!');
    console.log('================================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi thực hiện seed dữ liệu sạch:', err);
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
    process.exit(1);
  }
}

seedPristineClean();
