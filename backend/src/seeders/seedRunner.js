#!/usr/bin/env node
'use strict';

/**
 * Hotel Management System Seeder Orchestrator
 * Chạy 15 steps (Step 00 đến Step 14) theo thứ tự phụ thuộc khóa ngoại (FK Hierarchy)
 * Hỗ trợ chế độ test nhanh (--count=1000) và chế độ chuẩn 100k (--count=100000)
 */

const { sequelize } = require('../models');
const IdPool = require('./lib/idPool');

// Import các kịch bản seed theo thứ tự FK
const step00 = require('./tables/00_static_reference');
const step01 = require('./tables/01_users');
const step02 = require('./tables/02_roomtypes_amenities');
const step03 = require('./tables/03_rooms');
const step04 = require('./tables/04_vouchers_ota');
const step05 = require('./tables/05_bookings');
const step06 = require('./tables/06_booking_guests');
const step07 = require('./tables/07_stays_room_moves');
const step08 = require('./tables/08_housekeeping');
const step09 = require('./tables/09_menu_restaurant');
const step10 = require('./tables/10_food_orders');
const step11 = require('./tables/11_inventory');
const step12 = require('./tables/12_services_invoices');
const step13 = require('./tables/13_reviews_chatbot');
const step14 = require('./tables/14_operations_extras');

const steps = [
  { id: 0, name: 'Static Reference Data', module: step00, refreshPoolAfter: true },
  { id: 1, name: 'Users & Auth Tokens', module: step01, refreshPoolAfter: true },
  { id: 2, name: 'Room Types & Amenities & Pricing', module: step02, refreshPoolAfter: true },
  { id: 3, name: 'Physical Rooms', module: step03, refreshPoolAfter: true },
  { id: 4, name: 'Vouchers & OTA Channels', module: step04, refreshPoolAfter: true },
  { id: 5, name: 'Bookings', module: step05, refreshPoolAfter: true },
  { id: 6, name: 'Booking Guests', module: step06, refreshPoolAfter: false },
  { id: 7, name: 'Stays & Room Moves', module: step07, refreshPoolAfter: true },
  { id: 8, name: 'Housekeeping & Minibar Usages', module: step08, refreshPoolAfter: false },
  { id: 9, name: 'Restaurant Tables & Menu Items', module: step09, refreshPoolAfter: true },
  { id: 10, name: 'Food Orders & Details', module: step10, refreshPoolAfter: true },
  { id: 11, name: 'Inventory & Stock Transactions', module: step11, refreshPoolAfter: false },
  { id: 12, name: 'Services, Orders, Invoices & Payments', module: step12, refreshPoolAfter: true },
  { id: 13, name: 'Reviews, Photos & Chatbot KB', module: step13, refreshPoolAfter: false },
  { id: 14, name: 'Operations, Vehicles, Maintenance & Extras', module: step14, refreshPoolAfter: false },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    count: 100000,
    tables: null,
    step: null,
    skipMaster: false,
    resumeFrom: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--count=')) opts.count = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--tables=')) opts.tables = arg.split('=')[1].split(',').map(s => s.trim());
    if (arg.startsWith('--step=')) opts.step = parseInt(arg.split('=')[1], 10);
    if (arg === '--skip-master') opts.skipMaster = true;
    if (arg.startsWith('--resume-from=')) opts.resumeFrom = arg.split('=')[1].trim();
    if (arg === '--help' || arg === '-h') {
      console.log(`
🏨 GRAND HORIZON HOTEL - SEEDER CLI RUNNER

Cách sử dụng: node src/seeders/seedRunner.js [tùy chọn]

Các tùy chọn khả dụng:
  --count=N          Số records mỗi bảng chính (Mặc định: 100,000)
  --tables=A,B,C     Chỉ seed danh sách bảng chỉ định (ví dụ: Users,Bookings)
  --step=N           Chỉ chạy duy nhất Step N (0 đến 14)
  --skip-master      Bỏ qua Step 0 (Master data & danh mục hệ thống)
  --resume-from=NAME Tiếp tục chạy từ Step có tên chỉ định
  --help, -h         Hiển thị tài liệu trợ giúp này
`);
      process.exit(0);
    }
  }

  return opts;
}

async function run() {
  const opts = parseArgs();
  const startTimeTotal = Date.now();

  console.log('\n================================================================================');
  console.log('🏨  GRAND HORIZON HOTEL - HỆ THỐNG SEEDER DỮ LIỆU ĐA TẦNG (57 BẢNG)');
  console.log('================================================================================');
  console.log(`🎯 Số lượng mục tiêu / bảng: ${opts.count.toLocaleString()} records`);
  console.log(`⚡ Phương thức:              BULK INSERT theo từng Chunk 5,000 records`);
  console.log(`🔒 Kiểm soát khóa ngoại:    Tạm tắt FOREIGN_KEY_CHECKS để tối ưu tốc độ ghi`);
  console.log(`⏰ Bắt đầu lúc:              ${new Date().toLocaleString('vi-VN')}`);
  console.log('================================================================================\n');

  try {
    // 1. Tối ưu môi trường MySQL
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
    await sequelize.query('SET UNIQUE_CHECKS = 0;').catch(() => {});
    await sequelize.query('SET SESSION bulk_insert_buffer_size = 1024 * 1024;').catch(() => {});

    // 2. Nạp ID Pool ban đầu
    console.log('🔄 Đang đồng bộ bộ nhớ đệm khóa ngoại (ID Pool)...');
    await IdPool.preload();

    let isResuming = !opts.resumeFrom;

    // 3. Thực thi tuần tự các steps
    for (const step of steps) {
      if (opts.step !== null && opts.step !== step.id) {
        continue;
      }

      if (opts.skipMaster && step.id === 0) {
        console.log(`⏭️  Bỏ qua Step 0 (Static Reference Data) do tham số --skip-master`);
        continue;
      }

      if (!isResuming) {
        if (step.name.toLowerCase().includes(opts.resumeFrom.toLowerCase())) {
          isResuming = true;
          console.log(`📍 Tìm thấy vị trí nối tiếp: Step ${step.id} - ${step.name}`);
        } else {
          console.log(`⏭️  Bỏ qua Step ${step.id} - ${step.name} (đang tìm resume point)`);
          continue;
        }
      }

      const stepStart = Date.now();
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`[BƯỚC ${step.id}/14] ▶️  Đang thực hiện: ${step.name}...`);
      console.log(`--------------------------------------------------------------------------------`);

      await step.module.run(sequelize, IdPool, {
        count: opts.count,
        tables: opts.tables,
      });

      const elapsedSec = ((Date.now() - stepStart) / 1000).toFixed(1);
      console.log(`✅ [BƯỚC ${step.id}/14] Hoàn tất sau ${elapsedSec}s`);

      // Refresh ID pool nếu step vừa thêm dữ liệu cha
      if (step.refreshPoolAfter) {
        await IdPool.preload();
      }
    }

    // 4. Bật lại ràng buộc toàn vẹn MySQL
    console.log('\n🔒 Đang kích hoạt lại kiểm tra ràng buộc toàn vẹn khóa ngoại (FOREIGN_KEY_CHECKS)...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
    await sequelize.query('SET UNIQUE_CHECKS = 1;').catch(() => {});

    // 5. Cập nhật thống kê query optimizer
    console.log('📈 Đang cập nhật bảng chỉ mục cho MySQL Optimizer (ANALYZE TABLE)...');
    await sequelize.query('ANALYZE TABLE Users, Rooms, Bookings, Stays, Invoices, MenuItems;').catch(() => {});

    // 5.1. Đồng bộ dữ liệu Cây Nhị Phân (B-Tree) cho bảng RoomSearchIndex
    try {
      const { syncSearchIndex } = require('../services/searchIndexService');
      await syncSearchIndex();
    } catch (e) {
      console.log('   (Bỏ qua đồng bộ RoomSearchIndex: ' + e.message + ')');
    }

    const totalMinutes = ((Date.now() - startTimeTotal) / 60000).toFixed(2);
    console.log('\n================================================================================');
    console.log(`🎉 TẤT CẢ CÁC BẢNG ĐÃ ĐƯỢC SEED THÀNH CÔNG! (Tổng thời gian: ${totalMinutes} phút)`);
    console.log('================================================================================\n');

    // 6. Kiểm tra & in số liệu xác thực nhanh
    // 6. Kiểm tra & in số liệu xác thực toàn bộ 57 bảng
    console.log('📊 THỐNG KÊ CHI TIẾT SỐ LƯỢNG RECORDS TRONG TOÀN BỘ 57 BẢNG HỆ THỐNG:');
    const allTables = [
      // 1. Phân quyền, Người dùng, Chi nhánh & Cấu hình cốt lõi (7 bảng)
      'Roles', 'Permissions', 'RolePermissions', 'MembershipTiers', 'Branches', 'Users', 'PasswordResetTokens',
      // 2. Phòng, Loại phòng & Giá (5 bảng)
      'RoomTypes', 'Amenities', 'RoomTypeAmenities', 'PricingRules', 'Rooms',
      // 3. Kênh OTA & Voucher (3 bảng)
      'OTAChannels', 'Vouchers', 'OTARoomMappings',
      // 4. Đặt phòng, Khách & Lưu trú (4 bảng)
      'Bookings', 'BookingGuests', 'Stays', 'RoomMoveHistory',
      // 5. Buồng phòng & Minibar (2 bảng)
      'HousekeepingAssignments', 'MinibarUsages',
      // 6. Nhà hàng & F&B (6 bảng)
      'RestaurantTables', 'MenuCategories', 'MenuItems', 'TableReservations', 'FoodOrders', 'FoodOrderDetails',
      // 7. Kho & Vật tư (2 bảng)
      'InventoryItems', 'InventoryTransactions',
      // 8. Dịch vụ, Hóa đơn & Thanh toán (5 bảng)
      'ServiceCategories', 'Services', 'ServiceOrders', 'Invoices', 'InvoiceDetails', 'Payments',
      // 9. Đánh giá & AI Chatbot (5 bảng)
      'Reviews', 'ReviewPhotos', 'ChatbotKnowledgeBase', 'ChatbotConversations', 'ChatbotMessages',
      // 10. Vận hành, Bảo trì & Tiện ích khác (17 bảng)
      'Vehicles', 'NightAuditReports', 'LoyaltyPointTransactions', 'MarketingCampaigns', 'CampaignRecipients',
      'MaintenanceTickets', 'MaintenanceTicketPhotos', 'LostAndFoundItems', 'SmartLockLogs', 'CashShifts',
      'ShuttleSchedules', 'PoliceDeclarations', 'BanquetEvents', 'StaffSchedules', 'AuditLogs', 'Wishlists', 'NewsletterSubscribers'
    ];

    let totalAllRecords = 0;
    for (let idx = 0; idx < allTables.length; idx++) {
      const t = allTables[idx];
      try {
        const [res] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
        const count = res[0] ? Number(res[0].cnt) : 0;
        totalAllRecords += count;
        const numStr = `[${String(idx + 1).padStart(2, '0')}/57]`;
        console.log(`   ${numStr} ${t.padEnd(28)}: ${count.toLocaleString().padStart(12)} records`);
      } catch (err) {
        console.log(`   [--/57] ${t.padEnd(28)}: (Chưa khởi tạo)`);
      }
    }
    console.log('--------------------------------------------------------------------------------');
    console.log(`   👉 TỔNG CỘNG RECORDS TRÊN 57 BẢNG: ${totalAllRecords.toLocaleString()} records`);
    console.log('================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ XẢY RA LỖI TRONG QUÁ TRÌNH SEED:', error);

    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      await sequelize.query('SET UNIQUE_CHECKS = 1;').catch(() => {});
    } catch (_) {}

    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
