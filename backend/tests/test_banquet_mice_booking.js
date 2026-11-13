'use strict';

/**
 * TEST SUITE: Phân hệ 53 - Quản lý Đặt sảnh tiệc, Hội nghị & Sự kiện đoàn (Banquet & MICE Event Booking)
 * Module: Hậu cần & Vận hành
 * Scope:
 *  1. Truy xuất danh sách sự kiện MICE, thống kê KPI tuần/tháng & danh mục sảnh tiệc
 *  2. Lấy hồ sơ BEO chi tiết của sự kiện Vinapharm #MICE-2025-089
 *  3. Lập hợp đồng sự kiện MICE mới với cấu hình Setup bàn ghế, AV, Menu F&B Catering
 *  4. Kiểm tra phát hiện xung đột lịch sảnh (Conflict Detection - 409 Conflict)
 *  5. Kê khai và đặt cọc theo từng giai đoạn hợp đồng (Đợt 1, Đợt 2, Quyết toán Master Folio)
 *  6. Phát lệnh điều phối khẩn đến Đội Âm Thanh Ánh Sáng & Kỹ Thuật AV
 *  7. Xuất lệnh điều hành Banquet Event Order (BEO) đầy đủ 5 bộ phận vận hành
 *  8. Lấy danh sách sảnh tiệc (Banquet Halls & Availability)
 */

const assert = require('assert');
const express = require('express');
const banquetRoutes = require('../src/routes/banquetRoutes');

async function runBanquetTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ: PHÂN HỆ 53 - BANQUET & MICE EVENT BOOKING');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/banquet-events', banquetRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/banquet-events`;

  let passed = 0;
  let total = 0;

  async function testStep(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  try {
    // TEST 1: GET /api/banquet-events
    await testStep('1. Lấy danh sách sự kiện MICE, thống kê KPI & danh mục sảnh tiệc', async () => {
      const res = await fetch(baseUrl);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.events));
      assert.ok(data.events.length >= 3);
      assert.ok(data.stats);
      assert.strictEqual(typeof data.stats.totalPax, 'number');
      assert.ok(Array.isArray(data.venues));
    });

    // TEST 2: GET /api/banquet-events/:id
    await testStep('2. Lấy hồ sơ BEO chi tiết của sự kiện Vinapharm #MICE-2025-089', async () => {
      const res = await fetch(`${baseUrl}/MICE-2025-089`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.event.id || data.event.EventCode, 'MICE-2025-089');
      assert.strictEqual(data.event.company || data.event.CompanyName, 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm');
      assert.strictEqual(data.event.financial?.totalAmount || data.event.TotalContractAmount, 680000000);
      assert.strictEqual(data.event.financial?.depositPaid || data.event.DepositPaid, 340000000);
      assert.strictEqual(data.event.financial?.remainingDue || data.event.RemainingDue, 340000000);
    });

    // TEST 3: POST /api/banquet-events (Lập hợp đồng sự kiện & BEO mới)
    let createdEventId = null;
    await testStep('3. Lập hợp đồng MICE mới: Chọn sảnh, setup bàn ghế, âm thanh ánh sáng & menu', async () => {
      const payload = {
        title: 'Gala Kỷ Niệm 20 Năm Thành Lập Tập Đoàn Hòa Phát',
        eventType: 'Gala Dinner Doanh Nghiệp',
        company: 'Tập đoàn Hòa Phát',
        contactName: 'Trần Đình Long',
        contactTitle: 'Chủ tịch HĐQT',
        contactPhone: '+84 918 888 999',
        contactEmail: 'contact@hoaphat.com.vn',
        date: '2025-11-20',
        timeRange: '18:00 - 22:30',
        venueName: 'Grand Horizon Ballroom Khu A',
        pax: 450,
        seatingStyle: 'Bàn tròn 10 người/bàn (45 bàn)',
        tablesChairs: '45 bàn tròn bọc nỉ đỏ nhung hoàng gia + Ghế banquet đính nơ vàng',
        stageLed: 'P3 Indoor LED 16m x 5m + Màn hình phụ 2 bên cánh gà',
        soundLight: 'Dàn Line Array công suất lớn + 10 mic không dây + Đèn hiệu ứng sân khấu',
        menuType: 'Set Menu 8 Món Hoàng Gia',
        galaDinner: 'Set 8 món: Súp vi cá, Bào ngư sốt dầu hào, Bò Kobe nướng sốt tiêu đen, Tôm hùm bỏ lò',
        totalAmount: 950000000,
        depositPercent: 50,
        depositPaid: 475000000, // Cọc 50%
        paymentMethod: 'Chuyển khoản VCB Doanh Nghiệp',
      };

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.event);
      assert.strictEqual(data.event.title, payload.title);
      assert.strictEqual(data.event.financial.totalAmount, 950000000);
      assert.strictEqual(data.event.financial.depositPaid, 475000000);
      assert.strictEqual(data.event.financial.remainingDue, 475000000);
      assert.ok(data.event.beoNumber.startsWith('BEO #'));
      assert.ok(data.event.masterFolio.startsWith('MASTER FOLIO #'));
      createdEventId = data.event.id;
    });

    // TEST 4: POST /api/banquet-events (Kiểm tra xung đột lịch đặt sảnh - 409 Conflict)
    await testStep('4. Kiểm tra phát hiện xung đột sảnh tiệc trùng ngày giờ (409 Conflict)', async () => {
      const conflictPayload = {
        title: 'Hội thảo trùng lịch',
        company: 'Công ty Đối thủ',
        date: '2025-11-20',
        venueName: 'Grand Horizon Ballroom Khu A',
        pax: 200,
      };

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictPayload),
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.conflict, true);
      assert.ok(data.message.includes('đã có lịch'));
    });

    // TEST 5: POST /api/banquet-events/:id/deposits (Đặt cọc theo giai đoạn hợp đồng)
    await testStep('5. Thu đặt cọc giai đoạn 2: Tạm ứng chuẩn bị thực đơn & setup AV', async () => {
      assert.ok(createdEventId, 'Phải có createdEventId từ bước trước');
      const depositPayload = {
        amount: 285000000, // 30%
        stage: 'Đợt 2 - Tạm ứng nguyên liệu F&B & Giàn đèn AV',
        method: 'Ủy nhiệm chi Vietcombank',
        note: 'Đã nhận chuyển khoản đợt 2 theo UNC số VCB-99482',
      };

      const res = await fetch(`${baseUrl}/${createdEventId}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositPayload),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.financial.depositPaid, 475000000 + 285000000); // 760.000.000 (80%)
      assert.strictEqual(data.financial.remainingDue, 190000000); // 190.000.000 (20%)
      assert.strictEqual(data.financial.paymentHistory.length, 4);
    });

    // TEST 6: POST /api/banquet-events/:id/dispatch (Điều phối thông báo kỹ thuật)
    await testStep('6. Gửi lệnh điều phối khẩn đến Đội Âm Thanh Ánh Sáng & Kỹ Thuật AV', async () => {
      const dispatchPayload = {
        department: 'Đội AV & Kỹ Thuật',
        urgentLevel: 'KHẨN CẤP',
        message: 'Hoàn tất cân chỉnh Line Array và test màn LED P3 trước 15:00',
      };

      const res = await fetch(`${baseUrl}/${createdEventId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchPayload),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.dispatch.department, 'Đội AV & Kỹ Thuật');
    });

    // TEST 7: GET /api/banquet-events/:id/beo-export (Xuất lệnh BEO)
    await testStep('7. Xuất lệnh điều hành Banquet Event Order (BEO) đầy đủ 5 bộ phận', async () => {
      const res = await fetch(`${baseUrl}/${createdEventId}/beo-export`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.dossier);
      assert.ok(Array.isArray(data.dossier.departmentalOrders));
      assert.strictEqual(data.dossier.departmentalOrders.length, 5);
    });

    // TEST 8: GET /api/banquet-events/venues
    await testStep('8. Lấy danh mục sảnh tiệc & kiểm tra công suất', async () => {
      const res = await fetch(`${baseUrl}/venues`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.halls));
      assert.ok(data.halls.length >= 4);
    });

    console.log(`\n🎉 KẾT QUẢ: ${passed}/${total} BƯỚC KIỂM THỬ BACKEND THÀNH CÔNG 100%!`);
    process.exit(0);
  } finally {
    server.close();
  }
}

runBanquetTests().catch((err) => {
  console.error('Lỗi kiểm thử Banquet & MICE Backend:', err);
  process.exit(1);
});
