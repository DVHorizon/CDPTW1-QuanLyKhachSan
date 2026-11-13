'use strict';

const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

const BRANCH_NAMES = [
  { name: 'Grand Horizon Phú Quốc Luxury Resort', address: 'Bãi Khem, An Thới, Phú Quốc, Kiên Giang', phone: '0297 888 9999' },
  { name: 'Grand Horizon Cam Ranh Bay Oasis', address: 'Bãi Dài, Cam Ranh, Khánh Hoà', phone: '0258 888 9999' },
  { name: 'Grand Horizon Côn Đảo Sanctuary', address: 'Bãi Nhát, Côn Đảo, Bà Rịa - Vũng Tàu', phone: '0254 888 9999' },
  { name: 'Grand Horizon Đà Nẵng Oceanfront', address: 'Đường Võ Nguyên Giáp, Mỹ Khê, Đà Nẵng', phone: '0236 888 9999' },
  { name: 'Grand Horizon Nha Trang Premier', address: 'Đường Trần Phú, Nha Trang, Khánh Hoà', phone: '0258 222 3333' },
];

const PERMISSION_NAMES = [
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

const ROLE_PERMISSIONS_MAP = {
  Admin: '*',
  Receptionist: ['view_users', 'view_bookings', 'create_booking', 'cancel_booking', 'view_rooms', 'edit_rooms', 'view_invoices', 'process_payment', 'housekeeping_assign'],
  Kitchen: ['manage_menu', 'kitchen_kds'],
  Housekeeping: ['view_rooms', 'housekeeping_clean', 'minibar_charge'],
  Guest: ['view_rooms', 'create_booking', 'cancel_booking', 'view_invoices'],
};

async function run(sequelize, IdPool, options = {}) {
  if (IdPool && !options && !IdPool.preload) {
    options = IdPool;
    IdPool = null;
  }
  const count = (options && options.count) || 1000;
  const qi = sequelize.getQueryInterface();

  // ============= 1. Roles =============
  console.log('   • Seeding Roles (5)...');
  const rolesData = [
    { RoleName: 'Admin', Description: 'Quản trị viên toàn quyền hệ thống' },
    { RoleName: 'Receptionist', Description: 'Lễ tân / Tiếp đón khách / Checkin-Checkout' },
    { RoleName: 'Kitchen', Description: 'Đầu bếp / Nhân viên bếp chế biến' },
    { RoleName: 'Housekeeping', Description: 'Nhân viên buồng phòng dọn dẹp' },
    { RoleName: 'Guest', Description: 'Khách hàng thành viên nghỉ dưỡng' },
  ];
  await qi.bulkInsert('Roles', rolesData, { ignoreDuplicates: true, logging: false });

  // ============= 2. Permissions =============
  console.log(`   • Seeding Permissions (${PERMISSION_NAMES.length})...`);
  const permissionsData = PERMISSION_NAMES.map(p => ({
    PermissionName: p,
    Module: p.split('_')[0],
    Description: `Quyền thực thi ${p.replace(/_/g, ' ')}`,
  }));
  await qi.bulkInsert('Permissions', permissionsData, { ignoreDuplicates: true, logging: false });

  // ============= 3. RolePermissions =============
  console.log('   • Seeding RolePermissions...');
  const [allRoles] = await sequelize.query('SELECT RoleId, RoleName FROM Roles');
  const [allPerms] = await sequelize.query('SELECT PermissionId, PermissionName FROM Permissions');
  const rpData = [];
  for (const role of allRoles) {
    const allowed = ROLE_PERMISSIONS_MAP[role.RoleName];
    if (allowed === '*') {
      allPerms.forEach(p => rpData.push({ RoleId: role.RoleId, PermissionId: p.PermissionId }));
    } else if (Array.isArray(allowed)) {
      allowed.forEach(permName => {
        const p = allPerms.find(ap => ap.PermissionName === permName);
        if (p) rpData.push({ RoleId: role.RoleId, PermissionId: p.PermissionId });
      });
    }
  }
  if (rpData.length > 0) {
    await qi.bulkInsert('RolePermissions', rpData, { ignoreDuplicates: true, logging: false });
  }

  // ============= 4. MembershipTiers =============
  console.log('   • Seeding MembershipTiers (5)...');
  const tiersData = [
    { TierName: 'Standard', MinPoints: 0, DiscountRate: 0.00, PointMultiplier: 1.00, Benefits: 'Tích điểm cơ bản 1x' },
    { TierName: 'Silver', MinPoints: 10000, DiscountRate: 0.05, PointMultiplier: 1.25, Benefits: 'Giảm 5% giá phòng, tích điểm 1.25x' },
    { TierName: 'Gold', MinPoints: 30000, DiscountRate: 0.10, PointMultiplier: 1.50, Benefits: 'Giảm 10% phòng + F&B, tích điểm 1.5x' },
    { TierName: 'Platinum', MinPoints: 80000, DiscountRate: 0.15, PointMultiplier: 2.00, Benefits: 'Giảm 15%, tích điểm 2x, miễn phí trà chiều' },
    { TierName: 'Diamond', MinPoints: 200000, DiscountRate: 0.20, PointMultiplier: 3.00, Benefits: 'Giảm 20%, tích điểm 3x, quản gia riêng, đón sân bay VIP' },
  ];
  await qi.bulkInsert('MembershipTiers', tiersData, { ignoreDuplicates: true, logging: false });

  // ============= 5. Branches =============
  console.log(`   • Seeding Branches (${BRANCH_NAMES.length})...`);
  await qi.bulkInsert('Branches', BRANCH_NAMES.map(b => ({
    BranchName: b.name,
    Address: b.address,
    Phone: b.phone,
    Status: 'Active',
  })), { ignoreDuplicates: true, logging: false });

  // ============= 6. Amenities =============
  console.log(`   • Seeding Amenities (${count})...`);
  const sampleAmenities = [
    'Wi-Fi Tốc Độ Cao 500Mbps', 'Ban Công Hướng Biển Trực Diện', 'Bồn Tắm Nằm Jacuzzi View Biển',
    'Quầy Bar Mini Rượu Vang', 'Máy Pha Cà Phê Nespresso', 'Phòng Tắm Hỗ Trợ ADA Xe Lăn',
    'Hồ Bơi Vô Cực Riêng Biệt', 'Dịch Vụ Quản Gia Riêng 24/7', 'Khu Vực Bếp Nấu Hiện Đại',
    'Két Sắt Điện Tử Thông Minh', 'Smart TV 4K 75 Inch', 'Hệ Thống Điều Hòa Lọc Khí Trung Tâm'
  ];
  await seedInChunks('Amenities', (i) => ({
    AmenityName: `${sampleAmenities[(i - 1) % sampleAmenities.length]} #${i}`,
    Description: `Trang thiết bị tiện nghi 5 sao cao cấp tiêu chuẩn quốc tế mã #${i}`,
    IconUrl: `https://icons.hoteldomain.vn/amenity/${(i % 30) + 1}.svg`,
  }), count, 5000, { silent: false });

  // ============= 7. ServiceCategories =============
  console.log('   • Seeding ServiceCategories (10)...');
  await qi.bulkInsert('ServiceCategories', [
    { CategoryName: 'Spa & Chăm Sóc Sức Khỏe', Description: 'Trị liệu thảo dược, sauna, massage toàn thân' },
    { CategoryName: 'Ẩm Thực Phục Vụ Tại Phòng', Description: 'Room service ăn sáng, tiệc trà, rượu vang' },
    { CategoryName: 'Giặt Ủi & Hấp Cao Cấp', Description: 'Giặt hấp trang phục, ủi vest cấp tốc' },
    { CategoryName: 'Vận Chuyển & Xe Sang', Description: 'Đưa đón limousine sân bay, thuê siêu xe' },
    { CategoryName: 'Tour Khám Phá & Du Thuyền', Description: 'Ngắm hoàng hôn trên biển, lặn ngắm san hô' },
    { CategoryName: 'Hội Thảo & Business Center', Description: 'Phòng họp VIP, in ấn bảo mật, dịch vụ thư ký' },
    { CategoryName: 'Tiệc Cưới & Sự Kiện Bãi Biển', Description: 'Tổ chức gala dinner, tiệc cưới hoàng hôn' },
    { CategoryName: 'Dịch Vụ Trẻ Em & Kids Club', Description: 'Trông giữ trẻ, lớp học làm bánh, khu vui chơi' },
    { CategoryName: 'Chăm Sóc Thú Cưng Hoàng Gia', Description: 'Khách sạn thú cưng, spa thú cưng' },
    { CategoryName: 'Dịch Vụ Đặc Biệt Khác', Description: 'Đặt hoa tươi, chuẩn bị cầu hôn, quà lưu niệm' },
  ], { ignoreDuplicates: true, logging: false });

  // ============= 8. MenuCategories =============
  console.log('   • Seeding MenuCategories (20)...');
  const menuCategories = [
    'Khai vị nóng', 'Khai vị lạnh', 'Salad thượng hạng', 'Soup tổ yến & bào ngư',
    'Món chính - Bò Wagyu A5', 'Món chính - Heo Iberico', 'Món chính - Hải sản tươi sống',
    'Món chính - Tôm hùm Alaska', 'Món Á truyền thống', 'Món Âu cổ điển',
    'Lẩu hải sản cung đình', 'Sushi & Sashimi', 'Mì Ý & Cơm Ý Risotto', 'Bánh mì Artisan',
    'Tráng miệng kiểu Pháp', 'Kem & Gelato thủ công', 'Trái cây nhiệt đới cao cấp', 'Bánh ngọt Afternoon Tea',
    'Trà thượng hạng & Cà phê Specialty', 'Bộ sưu tập Rượu vang & Cocktail signature'
  ];
  await qi.bulkInsert('MenuCategories', menuCategories.map((name, idx) => ({
    CategoryId: idx + 1,
    CategoryName: name,
    Description: `Các món ${name.toLowerCase()} đặc sắc tại nhà hàng Grand Horizon`,
  })), { ignoreDuplicates: true, logging: false });

  console.log('   ✅ Static reference data completed');
}

module.exports = { run };
