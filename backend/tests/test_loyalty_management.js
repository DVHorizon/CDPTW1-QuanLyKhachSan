'use strict';

/**
 * TEST SUITE: Phân hệ Quản Lý Hội Viên & Thẻ Điểm Tích Lũy (Loyalty & Membership Program - Module 1)
 * Scope:
 *  1. Truy xuất thống kê hội viên, ARPU và quỹ điểm dự phòng trách nhiệm
 *  2. Lấy ma trận 4 phân cấp hạng thẻ PMS (Classic, Silver, Gold, Lotus)
 *  3. THÊM hạng thẻ mới (POST /api/loyalty/tiers)
 *  4. SỬA hiệu chỉnh cấu hình định mức & đặc quyền hạng thẻ (PUT /api/loyalty/tiers/:id)
 *  5. XÓA hạng thẻ vừa tạo (DELETE /api/loyalty/tiers/:id)
 *  6. THÊM hội viên mới vào hệ thống (POST /api/loyalty/members)
 *  7. SỬA thông tin & điểm hội viên (PUT /api/loyalty/members/:id)
 *  8. XÓA / hủy tư cách hội viên (DELETE /api/loyalty/members/:id)
 *  9. Truy xuất danh sách hội viên đăng ký và phân hạng (GET /api/loyalty/members)
 * 10. Truy xuất danh sách khách hàng chờ duyệt thăng hạng hôm nay
 * 11. Duyệt nâng hạng thẻ đặc cách cho khách hàng
 * 12. Mô phỏng thuật toán tích điểm & thăng hạng tự động theo hệ số nhân
 * 13. Chạy lại thuật toán phân hạng thẻ toàn hệ thống
 * 14. Xuất file quy tắc ma trận hạng thẻ PMS (CSV)
 * 15. Truy xuất lịch sử giao dịch tích điểm / nâng hạng
 */

const assert = require('assert');
const express = require('express');
const loyaltyRoutes = require('../src/routes/loyaltyRoutes');

async function runLoyaltyTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ: PHÂN HỆ QUẢN LÝ HỘI VIÊN & TÍCH ĐIỂM (CRUD LOYALTY)');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/loyalty', loyaltyRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/loyalty`;

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
      server.close();
      throw err;
    }
  }

  try {
    // TEST 1: GET /api/loyalty/stats & /overview
    await testStep('1. Lấy thống kê tổng quan hội viên, ARPU và quỹ điểm', async () => {
      const res = await fetch(`${baseUrl}/overview`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.stats));
      assert.strictEqual(data.stats.length, 4);
      assert.ok(data.raw);
      assert.ok(data.raw.totalMembers > 0);
      assert.ok(data.raw.totalPoints > 0);
    });

    // TEST 2: GET /api/loyalty/tiers
    await testStep('2. Lấy danh sách các hạng thẻ và thông số phân cấp', async () => {
      const res = await fetch(`${baseUrl}/tiers`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.tiers));
      assert.ok(data.tiers.length >= 4);

      const classic = data.tiers[0];
      assert.strictEqual(classic.code, 'Classic Blue');
      assert.strictEqual(classic.pointMultiplier, 1.0);
    });

    // TEST 3: [THÊM HẠNG THẺ] POST /api/loyalty/tiers
    let createdTierCode = `TIER-TEST-${Date.now().toString().slice(-4)}`;
    await testStep('3. [THÊM HẠNG THẺ] Tạo hạng thẻ mới Titanium Elite', async () => {
      const res = await fetch(`${baseUrl}/tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierName: 'Titanium Elite',
          tierCode: createdTierCode,
          badgeName: 'Hội Viên Cao Cấp Đặc Biệt',
          minPoints: 60000,
          minNights: 35,
          minSpendUsd: 6000,
          pointMultiplier: 1.75,
          discountRate: 0.12,
          perks: [
            { icon: 'flight', text: 'Đón sân bay miễn phí' },
            { icon: 'spa', text: 'Giảm 25% spa' }
          ]
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.tier);
      assert.strictEqual(data.tier.code, 'Titanium Elite');
    });

    // TEST 4: [SỬA HẠNG THẺ] PUT /api/loyalty/tiers/:id
    await testStep('4. [SỬA HẠNG THẺ] Cập nhật định mức & đặc quyền hạng thẻ vừa tạo', async () => {
      const res = await fetch(`${baseUrl}/tiers/${createdTierCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierName: 'Titanium Elite VIP',
          minPoints: 65000,
          minNights: 40,
          pointMultiplier: 1.80
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.message.includes('thành công'));
    });

    // TEST 5: [XÓA HẠNG THẺ] DELETE /api/loyalty/tiers/:id
    await testStep('5. [XÓA HẠNG THẺ] Xóa mềm hạng thẻ Titanium Elite', async () => {
      const res = await fetch(`${baseUrl}/tiers/${createdTierCode}`, {
        method: 'DELETE'
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.message.includes('thành công'));
    });

    // TEST 6: [THÊM HỘI VIÊN] POST /api/loyalty/members
    let testMemberUserId = null;
    const testMemberEmail = `member_test_${Date.now()}@example.com`;
    await testStep('6. [THÊM HỘI VIÊN] Đăng ký hội viên mới vào CSDL', async () => {
      const res = await fetch(`${baseUrl}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Trần Văn Kiểm Thử',
          email: testMemberEmail,
          phone: '0988776655',
          tierId: 2,
          loyaltyPoints: 15500,
          totalSpend: 25000000,
          totalNights: 10
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.userId);
      testMemberUserId = data.userId;
    });

    // TEST 7: [SỬA HỘI VIÊN] PUT /api/loyalty/members/:id
    await testStep('7. [SỬA HỘI VIÊN] Cập nhật thông tin & điểm số hội viên', async () => {
      const res = await fetch(`${baseUrl}/members/${testMemberUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Trần Văn Kiểm Thử (VIP)',
          loyaltyPoints: 18000,
          tierId: 2
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.message.includes('thành công'));
    });

    // TEST 8: [XÓA HỘI VIÊN] DELETE /api/loyalty/members/:id
    await testStep('8. [XÓA HỘI VIÊN] Hủy tư cách hội viên của tài khoản', async () => {
      const res = await fetch(`${baseUrl}/members/${testMemberUserId}`, {
        method: 'DELETE'
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.message.includes('thành công'));
    });

    // TEST 9: GET /api/loyalty/members
    await testStep('9. Lấy danh sách hội viên đăng ký và phân hạng', async () => {
      const res = await fetch(`${baseUrl}/members`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.members));
      assert.ok(data.members.length > 0);
    });

    // TEST 10: GET /api/loyalty/pending-approvals
    await testStep('10. Lấy danh sách hàng đợi chờ duyệt thăng hạng hôm nay', async () => {
      const res = await fetch(`${baseUrl}/pending-approvals`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.pendingApprovals));
      assert.ok(data.pendingApprovals.length > 0);
    });

    // TEST 11: POST /api/loyalty/approve-upgrade
    await testStep('11. Duyệt nâng hạng thẻ đặc cách cho khách hàng', async () => {
      const res = await fetch(`${baseUrl}/approve-upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 6,
          targetTierId: 3,
          targetTier: 'Gold Elite'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.targetTierId, 3);
      assert.ok(data.message.includes('thành công'));
    });

    // TEST 12: POST /api/loyalty/simulate
    await testStep('12. Mô phỏng thuật toán tích điểm giao dịch phòng & thăng hạng', async () => {
      const res = await fetch(`${baseUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: 'MB-002',
          amount: 10000000,
          type: 'STAY'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.updatedMember);
      assert.ok(data.transactionLog);
    });

    // TEST 13: POST /api/loyalty/recalculate
    await testStep('13. Chạy lại thuật toán quét và phân hạng thẻ tự động', async () => {
      const res = await fetch(`${baseUrl}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.summary);
    });

    // TEST 14: GET /api/loyalty/export-rules
    await testStep('14. Xuất file quy tắc ma trận phân cấp hạng thẻ (CSV)', async () => {
      const res = await fetch(`${baseUrl}/export-rules`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/csv'));
      const text = await res.text();
      assert.ok(text.includes('Mã Hạng,Tên Hạng Thẻ,Điểm Yêu Cầu'));
    });

    // TEST 15: GET /api/loyalty/transactions
    await testStep('15. Lấy lịch sử nhật ký giao dịch điểm và thăng hạng', async () => {
      const res = await fetch(`${baseUrl}/transactions`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.transactions));
      assert.ok(data.transactions.length > 0);
    });

    console.log('\n================================================================');
    console.log(`🎉 TẤT CẢ ${passed}/${total} BƯỚC KIỂM THỬ CRUD PHÂN HỆ LOYALTY THÀNH CÔNG!`);
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runLoyaltyTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('LỖI TEST LOYALTY:', err);
      process.exit(1);
    });
}

module.exports = { runLoyaltyTests };
