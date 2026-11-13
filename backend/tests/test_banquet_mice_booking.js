'use strict';

/**
 * TEST SUITE: Phân hệ 53 - Quản lý Đặt sảnh tiệc, Hội nghị & Sự kiện đoàn (Banquet & MICE Event Booking)
 * Module: Hậu cần & Vận hành
 * Scope:
 *  1. Truy xuất danh sách sự kiện MICE & Thống kê tuần / tháng
 *  2. Lập hợp đồng sự kiện MICE mới với cấu hình Setup bàn ghế, AV, Menu F&B Catering
 *  3. Kê khai và đặt cọc theo từng giai đoạn hợp đồng (Đợt 1, Đợt 2, Quyết toán Master Folio)
 *  4. Xuất lệnh điều hành BEO (Banquet Event Order)
 *  5. Gửi thông báo khẩn AV & Kỹ thuật
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
    await testStep('1. Lấy danh sách sự kiện MICE, thống kê & danh mục sảnh tiệc', async () => {
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
      assert.strictEqual(data.event.id, 'MICE-2025-089');
      assert.strictEqual(data.event.company, 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm & Đối tác Mercedes-Benz');
      assert.strictEqual(data.event.financial.totalAmount, 680000000);
      assert.strictEqual(data.event.financial.depositPaid, 340000000);
      assert.strictEqual(data.event.financial.remainingDue, 340000000);
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
        venueId: 'HALL-BALLROOM-A',
        venueName: 'Grand Horizon Ballroom Khu A',
        pax: 450,
        seatingStyle: 'Bàn tròn 10 người/bàn (45 bàn)',
        tablesChairs: '45 bàn tròn bọc nỉ đỏ nhung hoàng gia + Ghế banquet đính nơ vàng',
        stageLed: 'P3 Indoor LED 16m x 5m + Màn hình phụ 2 bên cánh gà',
        soundLight: 'Dàn Line Array công suất lớn + 10 mic không dây + Đèn hiệu ứng sân khấu',
        menuType: 'Set Menu 8 Món Hoàng Gia',
        dinnerGala: 'Set 8 món: Súp vi cá, Bào ngư sốt dầu hào, Bò Kobe nướng sốt tiêu đen, Tôm hùm bỏ lò',
        totalAmount: 950000000,
        depositPaid: 475000000, // Cọc 50%
        paymentMethod: 'Chuyển khoản VCB Doanh Nghiệp'
      };

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

    // TEST 4: POST /api/banquet-events/:id/deposits (Đặt cọc theo giai đoạn hợp đồng)
    await testStep('4. Thu đặt cọc giai đoạn 2: Tạm ứng chuẩn bị thực đơn & setup AV', async () => {
      assert.ok(createdEventId, 'Phải có createdEventId từ bước trước');
      const depositPayload = {
        amount: 285000000, // 30%
        stage: 'Đợt 2 - Tạm ứng nguyên liệu F&B & Giàn đèn AV',
        method: 'Ủy nhiệm chi Vietcombank',
        note: 'Đã nhận chuyển khoản đợt 2 theo UNC số VCB-99482'
      };

      const res = await fetch(`${baseUrl}/${createdEventId}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositPayload)
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.financial.depositPaid, 475000000 + 285000000); // 760.000.000 (80%)
      assert.strictEqual(data.financial.remainingDue, 190000000); // 190.000.000 (20%)
      assert.strictEqual(data.financial.paymentHistory.length, 4);
    });

    // TEST 5: POST /api/banquet-events/:id/dispatch (Điều phối thông báo kỹ thuật)
    await testStep('5. Gửi lệnh điều phối khẩn đến Đội Âm Thanh Ánh Sáng & Kỹ Thuật AV', async () => {
      const dispatchPayload = {
        department: 'Đội AV & Kỹ Thuật',
        urgentLevel: 'KHẨN CẤP',
        message: 'Hoàn tất cân chỉnh Line Array và test màn LED P3 trước 15:00'
      };

      const res = await fetch(`${baseUrl}/${createdEventId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchPayload)
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.dispatch.department, 'Đội AV & Kỹ Thuật');
    });

    // TEST 6: GET /api/banquet-events/:id/beo-export (Xuất lệnh BEO)
    await testStep('6. Xuất lệnh điều hành Banquet Event Order (BEO) đầy đủ các bộ phận', async () => {
      const res = await fetch(`${baseUrl}/${createdEventId}/beo-export`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.event);
      assert.ok(Array.isArray(data.departments));
      assert.ok(data.departments.includes('F&B Kitchen'));
      assert.ok(data.departments.includes('AV Sound & Light'));
    });

    console.log(`\n🎉 KẾT QUẢ: ${passed}/${total} BƯỚC KIỂM THỬ THÀNH CÔNG 100%!`);
  } finally {
    server.close();
  }
}

runBanquetTests().catch(err => {
  console.error('Lỗi kiểm thử Banquet & MICE:', err);
  process.exit(1);
});
