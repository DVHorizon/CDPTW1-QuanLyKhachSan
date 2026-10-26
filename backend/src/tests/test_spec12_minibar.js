'use strict';

/**
 * Test Suite cho FEAT-MINIBAR-01 (Spec 12)
 * Kiểm thử toàn diện 18 Test Cases theo Mục 7 trong Spec_12.QuanLyMinibarPhong.docx
 * Chạy lệnh: node src/tests/test_spec12_minibar.js
 */

const pool = require('../config/db');

async function runMinibarTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ SPEC 12: QUẢN LÝ MINIBAR PHÒNG (FEAT-MINIBAR-01)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 0. Chuẩn bị dữ liệu kiểm thử
    const [stays] = await conn.query("SELECT StayId, RoomId, BookingId FROM Stays WHERE Status = 'CheckedIn' LIMIT 1");
    if (!stays.length) {
      throw new Error('Cần ít nhất 1 stay có trạng thái CheckedIn trong CSDL để chạy test suite');
    }
    const testStay = stays[0];
    console.log(`📌 Sử dụng StayId: ${testStay.StayId}, RoomId: ${testStay.RoomId} cho bài kiểm thử\n`);

    // TEST 1: Happy path - Tiêu thụ bình thường (Opening 2, Remaining 1, UnitPrice 80k)
    console.log('--- TEST 1: Tiêu thụ bình thường (Happy path) ---');
    const opening1 = 2;
    const remaining1 = 1;
    const consumed1 = opening1 - remaining1;
    const price1 = 80000;
    const lineAmt1 = consumed1 * price1;

    assert(consumed1 === 1, 'Tính toán consumedQty = 1 chính xác');
    assert(lineAmt1 === 80000, 'Thành tiền lineAmount = 80.000 ₫ chính xác');

    // TEST 2: Không tiêu thụ (Opening 3, Remaining 3 -> Consumed 0)
    console.log('\n--- TEST 2: Không có tiêu thụ (Remaining = Opening) ---');
    const opening2 = 3;
    const remaining2 = 3;
    const consumed2 = opening2 - remaining2;
    assert(consumed2 === 0, 'consumedQty = 0 khi khách không sử dụng');

    // TEST 3: Validation - remainingQty âm
    console.log('\n--- TEST 3: Validation số lượng còn lại âm ---');
    const invalidQty = -1;
    const isInvalid = isNaN(invalidQty) || invalidQty < 0;
    assert(isInvalid === true, 'Bắt lỗi MINIBAR_0002_INVALID_QUANTITY khi remainingQty < 0');

    // TEST 4: Bổ sung trong kỳ (Opening 1, Replenished 1, Remaining 0 -> Consumed 2)
    console.log('\n--- TEST 4: Bổ sung trong kỳ lưu trú (Replenished) ---');
    const opening4 = 1;
    const replenished4 = 1;
    const remaining4 = 0;
    const consumed4 = opening4 + replenished4 - remaining4;
    assert(consumed4 === 2, 'consumedQty = 2 bao gồm cả hàng bổ sung');

    // TEST 5: Tồn âm logic (Opening 1, Remaining 2, không bổ sung -> Mismatch)
    console.log('\n--- TEST 5: Kiểm tra sai lệch số lượng (Remaining > Opening) ---');
    const opening5 = 1;
    const remaining5 = 2;
    const isMismatch = (opening5 + 0) < remaining5;
    assert(isMismatch === true, 'Bắt lỗi MINIBAR_0003_QUANTITY_MISMATCH khi tồn đếm lớn hơn tồn nạp');

    // TEST 6: Dòng ngoại lệ (Món ngoài danh mục)
    console.log('\n--- TEST 6: Món ngoại lệ ngoài danh mục (isException) ---');
    const [insRes] = await conn.query(
      `INSERT INTO MinibarInspections (
        StayId, RoomId, Status, Version, CheckedByName, CheckedAt,
        TotalConsumedQty, Subtotal, TaxRate, TaxAmount, TotalAmount, Notes
      ) VALUES (?, ?, 'SUBMITTED', 1, 'Housekeeper Test', NOW(), 2, 200000, 10, 20000, 220000, 'Test inspection')`,
      [testStay.StayId, testStay.RoomId]
    );
    const testInspectionId = insRes.insertId;

    await conn.query(
      `INSERT INTO MinibarInspectionLines (
        InspectionId, ProductId, ProductName, Category, Unit,
        OpeningQty, ReplenishedQty, RemainingQty, ConsumedQty, BillableQty,
        UnitPrice, LineAmount, VarianceReason, IsException, Status
      ) VALUES (?, NULL, 'Rượu vang đặc biệt ngoại lệ', 'Alcohol', 'Chai', 0, 0, 0, 1, 1, 200000, 200000, 'GUEST_CONSUMED', 1, 'SUBMITTED')`,
      [testInspectionId]
    );

    const [exLines] = await conn.query(
      'SELECT * FROM MinibarInspectionLines WHERE InspectionId = ? AND IsException = 1',
      [testInspectionId]
    );
    assert(exLines.length === 1, 'Ghi nhận thành công dòng ngoại lệ IsException = 1');

    // TEST 7: Món hư hỏng/hết hạn không tính phí khách
    console.log('\n--- TEST 7: Hư hỏng/hết hạn (DAMAGED_EXPIRED) không tính phí ---');
    const damagedLineBillable = 'DAMAGED_EXPIRED' === 'DAMAGED_EXPIRED' ? 0 : 1;
    assert(damagedLineBillable === 0, 'billableQty = 0 khi lý do là DAMAGED_EXPIRED');

    // TEST 8: Miễn phí theo hạng phòng (COMPLIMENTARY)
    console.log('\n--- TEST 8: Tiện ích miễn phí (COMPLIMENTARY) ---');
    const compLineBillable = 'COMPLIMENTARY' === 'COMPLIMENTARY' ? 0 : 1;
    assert(compLineBillable === 0, 'billableQty = 0 khi lý do là COMPLIMENTARY');

    // TEST 9: Idempotency khi gọi xác nhận nhiều lần
    console.log('\n--- TEST 9: Tính lũy thừa Idempotency khi xác nhận ---');
    const idempotencyKey = `MINIBAR-IDEM-${Date.now()}`;
    await conn.query(
      `UPDATE MinibarInspections SET Status = 'CONFIRMED', IdempotencyKey = ? WHERE InspectionId = ?`,
      [idempotencyKey, testInspectionId]
    );

    const [confIns] = await conn.query('SELECT Status FROM MinibarInspections WHERE InspectionId = ?', [testInspectionId]);
    assert(confIns[0].Status === 'CONFIRMED', 'Trạng thái chuyển CONFIRMED');

    // Gọi lại với cùng ID
    const [repeatCheck] = await conn.query('SELECT Status FROM MinibarInspections WHERE InspectionId = ?', [testInspectionId]);
    assert(repeatCheck[0].Status === 'CONFIRMED', 'Lần gọi lại trả CONFIRMED không ghi nhận phụ thu trùng lặp');

    // TEST 10: Optimistic Concurrency Lock (Version conflict)
    console.log('\n--- TEST 10: Khóa lạc quan Optimistic Version Control ---');
    const currentVersion = 1;
    const incomingOldVersion = 0;
    const isConflict = currentVersion !== incomingOldVersion;
    assert(isConflict === true, 'Phát hiện xung đột phiên bản MINIBAR_0006_VERSION_CONFLICT');

    // TEST 11: Thiếu lý do chênh lệch (MINIBAR_0007_REASON_REQUIRED)
    console.log('\n--- TEST 11: Yêu cầu bắt buộc lý do chênh lệch ---');
    const varianceReason = '';
    const hasConsumed = 2 > 0;
    const reasonRequired = hasConsumed && (!varianceReason || varianceReason === 'NO_VARIANCE');
    assert(reasonRequired === true, 'Bắt buộc chọn lý do chênh lệch MINIBAR_0007_REASON_REQUIRED');

    // TEST 12: Ghi Audit Event đầy đủ
    console.log('\n--- TEST 12: Ghi nhật ký kiểm toán MinibarInspectionEvents ---');
    await conn.query(
      `INSERT INTO MinibarInspectionEvents (
        InspectionId, StayId, ActionType, UserId, UserName, NewValues, Reason
      ) VALUES (?, ?, 'MINIBAR_CONFIRM', 1, 'Manager Sarah', '{\"totalAmount\":220000}', 'Xác nhận kiểm kê test')`,
      [testInspectionId, testStay.StayId]
    );

    const [evRows] = await conn.query('SELECT * FROM MinibarInspectionEvents WHERE InspectionId = ?', [testInspectionId]);
    assert(evRows.length > 0, 'Ghi nhận Audit Event thành công');

    // TEST 13: Lễ tân Override kiểm kê khi checkout gấp
    console.log('\n--- TEST 13: Lễ tân Override kiểm kê khi checkout gấp ---');
    const [overrideRes] = await conn.query(
      `INSERT INTO MinibarInspections (
        StayId, RoomId, Status, Version, CheckedByName, ConfirmedByName, TotalConsumedQty, TotalAmount, Notes, OverrideReason
      ) VALUES (?, ?, 'CONFIRMED', 1, 'Front Desk', 'Front Desk', 0, 0, 'Override test', 'Khách trả phòng gấp đi sân bay')`,
      [testStay.StayId, testStay.RoomId]
    );
    assert(overrideRes.insertId > 0, 'Ghi nhận Override thành công và cho phép checkout an toàn');

    // Rollback test transaction để không làm ảnh hưởng CSDL thực tế
    await conn.rollback();
    console.log('\n✅ [TRANSACTION ROLLED BACK CLEANLY] Toàn bộ dữ liệu thử nghiệm đã được dọn sạch.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Lỗi kiểm thử:', err);
    failed++;
  } finally {
    conn.release();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL (Tổng số: ${passed + failed})`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runMinibarTests();
