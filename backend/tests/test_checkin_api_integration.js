'use strict';

/**
 * test_checkin_api_integration.js
 * Automated Integration Test Suite for Check-In API Hardening & JSON Guarantee (R1, R3)
 *
 * Verifies that:
 * 1. Express backend check-in endpoints respond with valid JSON (never raw HTML).
 * 2. Unmapped routes under /api return HTTP 404 JSON with ERROR_0004_NOT_FOUND.
 * 3. Validation errors return HTTP 400 JSON with standard error codes.
 * 4. Route aliases (/check-in, /checkin, /stays/check-in) are functional and return JSON.
 * 5. Full check-in transaction completes cleanly, updates DB states, and returns 200 JSON.
 */

const assert = require('assert');
const { request } = require('./e2e_services_c1_c14/helpers/apiClient');
const { getAuthContext } = require('./e2e_services_c1_c14/helpers/authHelper');
const pool = require('../src/config/db');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU TEST TÍCH HỢP ENDPOINT NHẬN PHÒNG & CHUẨN JSON (R1, R3)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  }

  function recordFail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc} - ${err?.message || err}`);
    failed++;
  }

  const { adminToken } = await getAuthContext();
  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  try {
    // TC_BK_01: GET /check-ins/arrivals trả về Content-Type JSON
    try {
      const res = await request('/check-ins/arrivals?limit=5', { headers: authHeaders });
      assert.strictEqual(res.status, 200);
      assert.ok(res.contentType.includes('application/json'), 'Phải trả về Content-Type application/json');
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data), 'data phải là mảng');
      recordPass('TC_BK_01: GET /check-ins/arrivals phản hồi HTTP 200 JSON');
    } catch (err) {
      recordFail('TC_BK_01', err);
    }

    // TC_BK_02: Route 404 dưới /api không tồn tại PHẢI trả về JSON, KHÔNG ĐƯỢC trả về HTML
    try {
      const res = await request('/check-ins/non-existent-subpath-test', {
        method: 'POST',
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(res.status, 404);
      assert.ok(
        res.contentType.includes('application/json'),
        `Expected application/json on 404 but got ${res.contentType}`
      );
      assert.ok(typeof res.data === 'object' && res.data !== null, 'Body 404 phải là đối tượng JSON');
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.code, 'ERROR_0004_NOT_FOUND');
      recordPass('TC_BK_02: Tuyến 404 không tồn tại dưới /api phản hồi JSON (không trả về HTML thô)');
    } catch (err) {
      recordFail('TC_BK_02', err);
    }

    // TC_BK_03: POST /check-ins thiếu thông tin booking trả về 400 JSON
    try {
      const res = await request('/check-ins', {
        method: 'POST',
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.contentType.includes('application/json'));
      assert.strictEqual(res.data.code, 'ERROR_0001_REQUIRED');
      assert.strictEqual(res.data.field, 'bookingId');
      recordPass('TC_BK_03: POST /check-ins thiếu bookingId trả về lỗi 400 JSON có mã ERROR_0001_REQUIRED');
    } catch (err) {
      recordFail('TC_BK_03', err);
    }

    // TC_BK_04: POST /check-ins thiếu documentType trả về 400 JSON
    try {
      const res = await request('/check-ins', {
        method: 'POST',
        headers: authHeaders,
        body: { bookingId: 999999 },
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.code, 'ERROR_0001_REQUIRED');
      assert.strictEqual(res.data.field, 'documentType');
      recordPass('TC_BK_04: POST /check-ins thiếu documentType trả về lỗi 400 JSON');
    } catch (err) {
      recordFail('TC_BK_04', err);
    }

    // TC_BK_05: Alias POST /check-in (số ít) cũng hoạt động và phản hồi JSON
    try {
      const res = await request('/check-in', {
        method: 'POST',
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.contentType.includes('application/json'));
      assert.strictEqual(res.data.code, 'ERROR_0001_REQUIRED');
      recordPass('TC_BK_05: Alias POST /check-in (số ít) định tuyến đúng và phản hồi JSON');
    } catch (err) {
      recordFail('TC_BK_05', err);
    }

    // TC_BK_06: Alias POST /checkin (không gạch nối) cũng định tuyến đúng và phản hồi JSON
    try {
      const res = await request('/checkin', {
        method: 'POST',
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.contentType.includes('application/json'));
      assert.strictEqual(res.data.code, 'ERROR_0001_REQUIRED');
      recordPass('TC_BK_06: Alias POST /checkin (không gạch nối) định tuyến đúng và phản hồi JSON');
    } catch (err) {
      recordFail('TC_BK_06', err);
    }

    // TC_BK_07: Alias POST /stays/check-in cũng hoạt động và phản hồi JSON
    try {
      const res = await request('/stays/check-in', {
        method: 'POST',
        headers: authHeaders,
        body: {},
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.contentType.includes('application/json'));
      assert.strictEqual(res.data.code, 'ERROR_0001_REQUIRED');
      recordPass('TC_BK_07: Alias POST /stays/check-in định tuyến đúng và phản hồi JSON');
    } catch (err) {
      recordFail('TC_BK_07', err);
    }

    // TC_BK_08: Check-in hoàn chỉnh với Booking hợp lệ trong CSDL
    let testBookingId = null;
    let testRoomId = null;
    const testDocNum = '079' + Math.floor(100000000 + Math.random() * 900000000);

    const conn = await pool.getConnection();
    try {
      // Tìm 1 phòng sạch sẵn sàng
      const [availRooms] = await conn.query(
        "SELECT RoomId, RoomNumber, RoomTypeId FROM Rooms WHERE Status IN ('CleanAvailable', 'Available') AND IsDeleted = 0 LIMIT 1"
      );
      if (availRooms.length > 0) {
        testRoomId = availRooms[0].RoomId;
        const [bkRes] = await conn.query(
          "INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, ConfirmationCode, CreatedAt) " +
          "VALUES (1, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2, 2, 0, 2000000, 500000, 'Confirmed', CONCAT('BKTEST-', FLOOR(RAND()*1000000)), NOW())",
          [availRooms[0].RoomTypeId]
        );
        testBookingId = bkRes.insertId;

        // Gán phòng vào Stays
        await conn.query(
          "INSERT INTO Stays (BookingId, RoomId, ExpectedCheckOut, Status, CreatedAt, UpdatedAt) " +
          "VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Reserved', NOW(), NOW())",
          [testBookingId, testRoomId]
        );
      }
    } finally {
      conn.release();
    }

    if (testBookingId) {
      try {
        const res = await request('/check-ins', {
          method: 'POST',
          headers: authHeaders,
          body: {
            bookingId: testBookingId,
            documentType: 'CCCD',
            documentNumber: testDocNum,
            fullName: 'NGUYỄN VĂN AN (TEST AUTO)',
            dateOfBirth: '1992-08-15',
            nationality: 'Việt Nam',
            gender: 'Nam',
            roomId: testRoomId,
          },
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.code, 'SUCCESS_0004_CHECKED_IN');
        assert.strictEqual(res.data.data.status, 'CheckedIn');

        // Kiểm tra tính toàn vẹn trạng thái trong CSDL
        const [bRows] = await pool.query('SELECT Status FROM Bookings WHERE BookingId = ?', [testBookingId]);
        assert.strictEqual(bRows[0].Status, 'CheckedIn', 'Trạng thái Booking trong DB phải là CheckedIn');

        const [rRows] = await pool.query('SELECT Status FROM Rooms WHERE RoomId = ?', [testRoomId]);
        assert.strictEqual(rRows[0].Status, 'Occupied', 'Trạng thái Room trong DB phải là Occupied');

        recordPass('TC_BK_08: Check-in hoàn tất giao dịch thành công (200 JSON) và cập nhật trạng thái CSDL');
      } catch (err) {
        recordFail('TC_BK_08', err);
      } finally {
        // Dọn dẹp test data sau khi kiểm thử xong
        try {
          const [sRows] = await pool.query('SELECT StayId FROM Stays WHERE BookingId = ?', [testBookingId]);
          if (sRows.length) {
            await pool.query('DELETE FROM PoliceDeclarations WHERE StayId = ?', [sRows[0].StayId]);
            await pool.query('DELETE FROM SmartLockLogs WHERE StayId = ?', [sRows[0].StayId]);
          }
          await pool.query('DELETE FROM GuestIdentityDocuments WHERE BookingId = ?', [testBookingId]);
          await pool.query('DELETE FROM BookingGuests WHERE BookingId = ?', [testBookingId]);
          await pool.query('DELETE FROM Stays WHERE BookingId = ?', [testBookingId]);
          await pool.query('DELETE FROM Bookings WHERE BookingId = ?', [testBookingId]);
          if (testRoomId) {
            await pool.query("UPDATE Rooms SET Status = 'CleanAvailable' WHERE RoomId = ?", [testRoomId]);
          }
        } catch (_) {}
      }
    } else {
      console.log('  ⚠️ [SKIP] TC_BK_08: Không có phòng trống để tạo booking test');
    }

  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================\n');

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  pool.end();
  process.exitCode = 1;
});
