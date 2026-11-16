#!/usr/bin/env node
'use strict';

/**
 * Script kiểm tra và thống kê số lượng record của toàn bộ 57 bảng trong MySQL
 */
const { sequelize } = require('../models');

const TABLE_GROUPS = [
  {
    group: '1. Phân quyền, Người dùng, Chi nhánh & Cấu hình (7 bảng)',
    tables: ['Roles', 'Permissions', 'RolePermissions', 'MembershipTiers', 'Branches', 'Users', 'PasswordResetTokens']
  },
  {
    group: '2. Phòng nghỉ, Tiện nghi & Định giá (5 bảng)',
    tables: ['RoomTypes', 'Amenities', 'RoomTypeAmenities', 'PricingRules', 'Rooms']
  },
  {
    group: '3. Kênh OTA & Voucher khuyến mãi (3 bảng)',
    tables: ['OTAChannels', 'Vouchers', 'OTARoomMappings']
  },
  {
    group: '4. Đặt phòng, Khách đi cùng & Lưu trú (4 bảng)',
    tables: ['Bookings', 'BookingGuests', 'Stays', 'RoomMoveHistory']
  },
  {
    group: '5. Buồng phòng & Tiêu thụ Minibar (2 bảng)',
    tables: ['HousekeepingAssignments', 'MinibarUsages']
  },
  {
    group: '6. Nhà hàng & Ẩm thực F&B (6 bảng)',
    tables: ['RestaurantTables', 'MenuCategories', 'MenuItems', 'TableReservations', 'FoodOrders', 'FoodOrderDetails']
  },
  {
    group: '7. Kho hàng & Xuất nhập tồn (2 bảng)',
    tables: ['InventoryItems', 'InventoryTransactions']
  },
  {
    group: '8. Dịch vụ, Hóa đơn & Giao dịch thanh toán (6 bảng)',
    tables: ['ServiceCategories', 'Services', 'ServiceOrders', 'Invoices', 'InvoiceDetails', 'Payments']
  },
  {
    group: '9. Đánh giá khách hàng & AI Chatbot (5 bảng)',
    tables: ['Reviews', 'ReviewPhotos', 'ChatbotKnowledgeBase', 'ChatbotConversations', 'ChatbotMessages']
  },
  {
    group: '10. Vận hành, Kỹ thuật, Lễ tân & Khác (17 bảng)',
    tables: [
      'Vehicles', 'NightAuditReports', 'LoyaltyPointTransactions', 'MarketingCampaigns', 'CampaignRecipients',
      'MaintenanceTickets', 'MaintenanceTicketPhotos', 'LostAndFoundItems', 'SmartLockLogs', 'CashShifts',
      'ShuttleSchedules', 'PoliceDeclarations', 'BanquetEvents', 'StaffSchedules', 'AuditLogs', 'Wishlists', 'NewsletterSubscribers'
    ]
  }
];

async function verifyAll() {
  console.log('\n========================================================================================');
  console.log('📊 BÁO CÁO KIỂM TRA SỐ LƯỢNG RECORD TOÀN BỘ 57 BẢNG TRONG CƠ SỞ DỮ LIỆU MYSQL');
  console.log('========================================================================================\n');

  let totalRecords = 0;
  let tableIndex = 1;

  for (const g of TABLE_GROUPS) {
    console.log(`📂 ${g.group.toUpperCase()}`);
    console.log('----------------------------------------------------------------------------------------');

    for (const t of g.tables) {
      try {
        const [res] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
        const count = res[0] ? Number(res[0].cnt) : 0;
        totalRecords += count;

        const idxStr = `[${String(tableIndex++).padStart(2, '0')}/57]`;
        const countStr = count.toLocaleString().padStart(12);
        const statusStr = count >= 100000 ? '✅ ĐẠT CHUẨN 100K+' : (count > 0 ? '⚠️  CÓ DỮ LIỆU' : '❌ CHƯA CÓ');

        console.log(`   ${idxStr} ${t.padEnd(28)} : ${countStr} records   ${statusStr}`);
      } catch (err) {
        const idxStr = `[${String(tableIndex++).padStart(2, '0')}/57]`;
        console.log(`   ${idxStr} ${t.padEnd(28)} :          LỖI (Bảng chưa tạo)`);
      }
    }
    console.log('');
  }

  console.log('========================================================================================');
  console.log(`🎉 TỔNG SỐ LƯỢNG RECORDS TRÊN TOÀN BỘ 57 BẢNG: ${totalRecords.toLocaleString()} RECORDS`);
  console.log('========================================================================================\n');

  // Kiểm tra bảng physical_rooms (bảng cũ)
  try {
    const [resPR] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM physical_rooms`);
    const countPR = resPR[0] ? Number(resPR[0].cnt) : 0;
    console.log(`📌 Ghi chú thêm về bảng legacy [physical_rooms]: ${countPR.toLocaleString()} records`);
    if (countPR === 0) {
      console.log(`   (Cần đồng bộ dữ liệu từ Rooms sang physical_rooms cho Admin UI ở Ưu tiên 2)\n`);
    }
  } catch (_) {}

  process.exit(0);
}

verifyAll();
