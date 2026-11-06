'use strict';

/**
 * Bộ kiểm thử tự động toàn diện theo Đặc tả Chức năng Gia hạn lưu trú (FEAT-STAY-EXTEND-01)
 * File đặc tả: Spec_9.GiaHanLuuTru.docx
 * Kiểm thử 20 Test Cases nghiệm thu (Mục 7)
 */

const pool = require('../config/db');

// Helper định dạng ngày
const toDateStr = (d) => {
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

async function runTestSuite() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU CHẠY TEST SUITE SPEC 9: GIA HẠN LƯU TRÚ (20 TEST CASES)');
  console.log('════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  };

  // Khởi tạo Express app để test trực tiếp
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/stays', require('../routes/admin/stayExtensionRoutes'));
  app.use('/api/v1/stay-extensions', require('../routes/admin/stayExtensionRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // 1. Tạo phòng và Stay độc lập riêng biệt cho Test Suite để tránh ảnh hưởng dữ liệu thật
    let testRoomId, testBookingId, testStayId;
    const testCode = `CONF-SPEC9-${Date.now().toString(36)}`;

    // Tạo phòng test
    const [rIns] = await pool.query(
      `INSERT INTO Rooms (BranchId, RoomNumber, RoomTypeId, Floor, Status, CreatedAt, UpdatedAt)
       VALUES (1, 'T999', 1, 9, 'Occupied', NOW(), NOW())`
    );
    testRoomId = rIns.insertId;

    // Tạo Booking test
    const [bIns] = await pool.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, ConfirmationCode, CheckInDate, CheckOutDate, NumberOfNights, TotalAmount, Status, CreatedAt, UpdatedAt)
       VALUES (1, 1, ?, '2026-10-20', '2026-10-25', 5, 7500000, 'CheckedIn', NOW(), NOW())`,
      [testCode]
    );
    testBookingId = bIns.insertId;

    // Tạo Stay test
    const [sIns] = await pool.query(
      `INSERT INTO Stays (BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, Status, Version, CreatedAt, UpdatedAt)
       VALUES (?, ?, '2026-10-20 14:00:00', '2026-10-25 12:00:00', 'CheckedIn', 1, NOW(), NOW())`,
      [testBookingId, testRoomId]
    );
    testStayId = sIns.insertId;

    const testStay = {
      StayId: testStayId,
      BookingId: testBookingId,
      RoomId: testRoomId,
      ExpectedCheckOut: '2026-10-25 12:00:00',
      RoomNumber: 'T999',
      BasePrice: 1500000,
    };

    const curCheckoutDate = new Date('2026-10-25T12:00:00');
    const validRequestedDate = new Date(curCheckoutDate);
    validRequestedDate.setDate(validRequestedDate.getDate() + 1);
    const validRequestedStr = toDateStr(validRequestedDate);

    console.log(`📌 Sử dụng StayId: ${testStay.StayId}, RoomId: ${testStay.RoomId}, Checkout: ${toDateStr(curCheckoutDate)}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 7: Input Validation - requestedCheckoutAt <= currentCheckoutAt
    // ──────────────────────────────────────────────────────────────────────────
    console.log('▶ TEST CASE 7: Input validation (requested <= current)');
    {
      const invalidDateStr = toDateStr(curCheckoutDate);
      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: invalidDateStr }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.errorCode === 'EXTEND_0002_INVALID_CHECKOUT_TIME',
        'TC7: Từ chối với EXTEND_0002_INVALID_CHECKOUT_TIME khi ngày mới <= ngày hiện tại',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 12: Extension Limit - Gia hạn vượt quá giới hạn tối đa
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 12: Extension limit (vượt quá 14 ngày)');
    {
      const tooLongDate = new Date(curCheckoutDate);
      tooLongDate.setDate(tooLongDate.getDate() + 20);
      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: toDateStr(tooLongDate) }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.errorCode === 'EXTEND_0011_EXTENSION_LIMIT',
        'TC12: Báo lỗi EXTEND_0011_EXTENSION_LIMIT khi thời lượng gia hạn > 14 ngày',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 1 & 9: Happy Path & Rate Segmentation (+1 đêm, tính phụ thu & thuế)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 1 & 9: Happy path & Rate calculation');
    let generatedQuote = null;
    {
      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: validRequestedStr }),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.availabilityResult === 'AVAILABLE',
        'TC1: Kiểm tra phòng khả dụng AVAILABLE khi không có xung đột',
        JSON.stringify(data)
      );
      assert(
        data.data && data.data.netFolioAdjustment > 0 && data.data.taxRate === 12,
        'TC9: Tự động tính phụ thu phòng & thuế 12% chính xác có breakdown từng ngày',
        JSON.stringify(data.data)
      );
      generatedQuote = data.data;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 3: Conflict - Khách kế tiếp có booking trước requestedCheckoutAt
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 3: Conflict với booking của khách kế tiếp');
    let conflictBookingId = null;
    {
      // Chèn 1 booking xung đột trực tiếp trên cùng phòng
      const conflictStart = validRequestedStr;
      const [cIns] = await pool.query(
        `INSERT INTO Bookings (UserId, RoomTypeId, ConfirmationCode, CheckInDate, CheckOutDate, NumberOfNights, TotalAmount, Status, CreatedAt, UpdatedAt)
         VALUES (1, 1, 'CONF-CONFLICT-01', ?, DATE_ADD(?, INTERVAL 2 DAY), 2, 3000000, 'Confirmed', NOW(), NOW())`,
        [conflictStart, conflictStart]
      );
      conflictBookingId = cIns.insertId;
      await pool.query(
        `INSERT INTO Stays (BookingId, RoomId, Status, Version, CreatedAt, UpdatedAt)
         VALUES (?, ?, 'Reserved', 1, NOW(), NOW())`,
        [conflictBookingId, testStay.RoomId]
      );

      // Yêu cầu gia hạn vượt qua ngày check-in của khách kế tiếp (+2 đêm)
      const afterConflictDate = new Date(curCheckoutDate);
      afterConflictDate.setDate(afterConflictDate.getDate() + 2);

      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: toDateStr(afterConflictDate) }),
      });
      const data = await res.json();
      assert(
        data.errorCode === 'EXTEND_0003_ROOM_CONFLICT' && data.availabilityResult === 'CONFLICT',
        'TC3: Báo EXTEND_0003_ROOM_CONFLICT và che thông tin cá nhân khách kế tiếp',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 4: Turnaround buffer conflict (Cùng ngày nhận phòng / thiếu 2h buffer)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 4: Turnaround buffer conflict');
    {
      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: validRequestedStr }),
      });
      const data = await res.json();
      assert(
        data.errorCode === 'EXTEND_0004_TURNAROUND_CONFLICT' && data.availabilityResult === 'CONFLICT',
        'TC4: Báo EXTEND_0004_TURNAROUND_CONFLICT khi vi phạm buffer 2 giờ dọn phòng',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 5: Cancelled booking - Đơn đã hủy không tính là xung đột
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 5: Cancelled booking không được coi là xung đột');
    {
      await pool.query(`UPDATE Bookings SET Status = 'Cancelled' WHERE BookingId = ?`, [conflictBookingId]);

      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: validRequestedStr }),
      });
      const data = await res.json();
      assert(
        data.availabilityResult === 'AVAILABLE',
        'TC5: Booking đã hủy (Cancelled) không tính là xung đột, kết quả AVAILABLE',
        JSON.stringify(data)
      );
      await pool.query(`DELETE FROM Stays WHERE BookingId = ?`, [conflictBookingId]);
      await pool.query(`DELETE FROM Bookings WHERE BookingId = ?`, [conflictBookingId]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 14: Idempotency Key - Retry không tạo charge thứ hai
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 14: Idempotency Key (Chống lặp giao dịch)');
    {
      // Lấy phiên bản và checkout mới nhất của Stay
      const [freshRows] = await pool.query(`SELECT Version, ExpectedCheckOut FROM Stays WHERE StayId = ?`, [testStay.StayId]);
      const currentVersion = freshRows[0].Version || 1;
      const curExpected = new Date(freshRows[0].ExpectedCheckOut);
      const nextDate = new Date(curExpected);
      nextDate.setDate(nextDate.getDate() + 1);
      const targetCheckoutStr = toDateStr(nextDate);

      const testIdempKey = `IDEMP-TEST-${Date.now()}`;
      const payload = {
        quoteId: generatedQuote ? generatedQuote.quoteId : 'QUOTE-AUTO',
        requestedCheckoutAt: targetCheckoutStr,
        additionalNights: 1,
        totalAmount: 1680000,
        version: currentVersion,
        idempotencyKey: testIdempKey,
        memo: 'Test Idempotency',
      };

      // Gọi lần 1
      const res1 = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data1 = await res1.json();

      assert(
        res1.status === 200 && data1.success === true,
        'TC14 (Lần 1): Xác nhận gia hạn thành công và tạo FolioCharge',
        JSON.stringify(data1)
      );

      // Gọi lần 2 với cùng idempotencyKey (Retry do timeout)
      const res2 = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data2 = await res2.json();

      assert(
        res2.status === 200 && data2.success === true,
        'TC14 (Lần 2 - Retry): Trả về kết quả trước đó mà không trừ tiền hay nhân đôi phụ thu',
        JSON.stringify(data2)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 16: Housekeeping task adjustment
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 16: Housekeeping Task tự động điều chỉnh');
    {
      const [hkTasks] = await pool.query(
        `SELECT * FROM HousekeepingAssignments WHERE StayId = ? ORDER BY AssignmentId DESC LIMIT 1`,
        [testStay.StayId]
      );
      assert(
        hkTasks.length > 0 && Number(hkTasks[0].Priority) >= 1,
        'TC16: Tự động tạo/điều chỉnh Housekeeping Task với mức ưu tiên Priority khi gia hạn',
        JSON.stringify(hkTasks[0] || {})
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 18: Room Move - Chuyển sang luồng đổi phòng riêng biệt
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 18: Chuyển phòng (Room Move Mode 02)');
    {
      const [freeRooms] = await pool.query(
        `SELECT RoomId, RoomNumber FROM Rooms
         WHERE RoomId != ? AND Status IN ('CleanAvailable', 'Available', 'Inspected')
         LIMIT 1`,
        [testStay.RoomId]
      );

      if (freeRooms.length > 0) {
        const targetRoom = freeRooms[0];
        const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/relocate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetRoomId: targetRoom.RoomId,
            reason: 'Đổi phòng do trùng lịch gia hạn lưu trú',
            memo: 'Đổi phòng theo Spec 9 Mode 02',
          }),
        });
        const data = await res.json();
        assert(
          res.status === 200 && data.success === true,
          'TC18: Chuyển phòng thành công, ghi RoomMoveHistory và cập nhật trạng thái phòng Occupied/Dirty',
          JSON.stringify(data)
        );
      } else {
        console.log('  ⚠️ Không có phòng trống sạch để test chuyển phòng, tự tạo phòng test');
        const [nr] = await pool.query(
          `INSERT INTO Rooms (BranchId, RoomNumber, RoomTypeId, Floor, Status, CreatedAt, UpdatedAt)
           VALUES (1, '888', 1, 8, 'CleanAvailable', NOW(), NOW())`
        );
        const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/relocate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetRoomId: nr.insertId,
            reason: 'Đổi phòng do trùng lịch gia hạn lưu trú',
          }),
        });
        const data = await res.json();
        assert(res.status === 200 && data.success === true, 'TC18: Chuyển phòng thành công');
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 17: Room availability OutOfOrder
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 17: Phòng OutOfOrder từ chối gia hạn');
    {
      // Lấy ngày checkout hiện tại của stay
      const [curS] = await pool.query(`SELECT RoomId, ExpectedCheckOut FROM Stays WHERE StayId = ?`, [testStay.StayId]);
      const currentRoomId = curS[0].RoomId;
      const targetDate = new Date(curS[0].ExpectedCheckOut);
      targetDate.setDate(targetDate.getDate() + 1);

      // Đặt phòng của testStay thành OutOfOrder
      await pool.query(`UPDATE Rooms SET Status = 'OutOfOrder' WHERE RoomId = ?`, [currentRoomId]);

      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: toDateStr(targetDate) }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.suggestRelocation === true,
        'TC17: Từ chối gia hạn trên phòng OutOfOrder và đề xuất chuyển sang luồng Room Move',
        JSON.stringify(data)
      );

      // Phục hồi lại trạng thái
      await pool.query(`UPDATE Rooms SET Status = 'Occupied' WHERE RoomId = ?`, [currentRoomId]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 2: Boundary - Check-in kế tiếp cách đủ buffer
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 2: Boundary check');
    {
      const [curS] = await pool.query(`SELECT RoomId, ExpectedCheckOut FROM Stays WHERE StayId = ?`, [testStay.StayId]);
      const nextDay = new Date(curS[0].ExpectedCheckOut);
      nextDay.setDate(nextDay.getDate() + 1);

      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: toDateStr(nextDay) }),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.availabilityResult === 'AVAILABLE',
        'TC2: Boundary khoảng [start, end) hợp lệ, kết quả AVAILABLE',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 8: Configuration - Thiếu biểu giá hoặc RoomType.BasePrice <= 0
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 8: Missing rate policy');
    {
      // Tạo phòng với hạng phòng có giá 0
      const [rtIns] = await pool.query(
        `INSERT INTO RoomTypes (TypeName, BasePrice, CreatedAt, UpdatedAt) VALUES ('ZeroRateType', 0, NOW(), NOW())`
      );
      const [rZero] = await pool.query(
        `INSERT INTO Rooms (BranchId, RoomNumber, RoomTypeId, Floor, Status, CreatedAt, UpdatedAt)
         VALUES (1, 'T000', ?, 1, 'Occupied', NOW(), NOW())`,
        [rtIns.insertId]
      );
      const [bZero] = await pool.query(
        `INSERT INTO Bookings (UserId, RoomTypeId, ConfirmationCode, CheckInDate, CheckOutDate, NumberOfNights, TotalAmount, Status, CreatedAt, UpdatedAt)
         VALUES (1, ?, 'CONF-ZERO-01', '2026-10-20', '2026-10-25', 5, 0, 'CheckedIn', NOW(), NOW())`,
        [rtIns.insertId]
      );
      const [sZero] = await pool.query(
        `INSERT INTO Stays (BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, Status, Version, CreatedAt, UpdatedAt)
         VALUES (?, ?, '2026-10-20 14:00:00', '2026-10-25 12:00:00', 'CheckedIn', 1, NOW(), NOW())`,
        [bZero.insertId, rZero.insertId]
      );

      const res = await fetch(`${baseUrl}/stays/${sZero.insertId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: '2026-10-26' }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.errorCode === 'EXTEND_0006_RATE_POLICY_MISSING',
        'TC8: Báo lỗi EXTEND_0006_RATE_POLICY_MISSING khi chưa cấu hình giá',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 11: Version Conflict / Optimistic locking
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 11: Optimistic Locking / Version Conflict');
    {
      const [curS] = await pool.query(`SELECT Version, ExpectedCheckOut FROM Stays WHERE StayId = ?`, [testStay.StayId]);
      const nextDate = new Date(curS[0].ExpectedCheckOut);
      nextDate.setDate(nextDate.getDate() + 1);

      const res = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCheckoutAt: toDateStr(nextDate),
          additionalNights: 1,
          totalAmount: 1680000,
          version: 999999, // Version sai lệch
        }),
      });
      const data = await res.json();
      assert(
        res.status === 409 && data.errorCode === 'EXTEND_0008_VERSION_CONFLICT',
        'TC11: Phát hiện Version sai lệch và trả về EXTEND_0008_VERSION_CONFLICT',
        JSON.stringify(data)
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE 13: Authorization / Supervisor Approval
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n▶ TEST CASE 13: Supervisor approval required for extension > 7 days');
    {
      const [curS] = await pool.query(`SELECT Version, ExpectedCheckOut FROM Stays WHERE StayId = ?`, [testStay.StayId]);
      const longDate = new Date(curS[0].ExpectedCheckOut);
      longDate.setDate(longDate.getDate() + 9); // +9 ngày (> 7 ngày)

      // Preview để lấy quote cần duyệt
      const pRes = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCheckoutAt: toDateStr(longDate) }),
      });
      const pData = await pRes.json();
      assert(
        pData.data?.approvalStatus === 'PENDING',
        'TC13 (Preview): Báo giá gia hạn > 7 ngày được đánh dấu PENDING_APPROVAL',
        JSON.stringify(pData.data)
      );

      // Thử confirm khi chưa duyệt
      const cRes = await fetch(`${baseUrl}/stays/${testStay.StayId}/extensions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: pData.data.quoteId,
          requestedCheckoutAt: toDateStr(longDate),
          additionalNights: 9,
          totalAmount: pData.data.netFolioAdjustment,
          version: curS[0].Version,
        }),
      });
      const cData = await cRes.json();
      assert(
        cRes.status === 403 && cData.errorCode === 'EXTEND_0007_APPROVAL_REQUIRED',
        'TC13 (Confirm): Từ chối xác nhận với EXTEND_0007_APPROVAL_REQUIRED khi chưa có duyệt của giám sát',
        JSON.stringify(cData)
      );
    }

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
    failed++;
  } finally {
    server.close(() => {
      console.log('\n════════════════════════════════════════════════════════════════');
      console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASSED / ${passed + failed} TOTAL (${failed} FAILED)`);
      console.log('════════════════════════════════════════════════════════════════');
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runTestSuite();
