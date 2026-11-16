'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/admin/roomAllocationController');

function createMockReqRes({ method = 'GET', params = {}, body = {}, query = {}, user = null, ip = '127.0.0.1' }) {
  const req = {
    method,
    params,
    body,
    query,
    user,
    ip,
    headers: user ? { authorization: `Bearer mock` } : {},
  };

  let statusCode = 200;
  let jsonResult = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      jsonResult = data;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get result() {
      return jsonResult;
    },
  };

  return { req, res };
}

async function runTests() {
  console.log('🚀 Bắt đầu kiểm thử tự động 15 Test Case theo Spec 7...\n');
  let passCount = 0;
  let failCount = 0;

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${detail}`);
      failCount++;
    }
  }

  const adminUser = { userId: 1, roleId: 1, roleName: 'Admin', fullName: 'Quản Trị' };
  const guestUser = { userId: 5, roleId: 5, roleName: 'Guest', fullName: 'Khách Hàng' };
  const receptionistUser = { userId: 2, roleId: 2, roleName: 'Receptionist', fullName: 'Lễ Tân' };

  // Setup test booking in DB
  const [insertBooking] = await pool.query(`
    INSERT INTO Bookings
      (UserId, RoomTypeId, CheckInDate, CheckOutDate, RoomQuantity, Status, ConfirmationCode, TotalAmount, CreatedAt, UpdatedAt)
    VALUES
      (5, 1, '2026-11-01', '2026-11-05', 2, 'Pending', 'TEST-SPEC7-01', 5000000, NOW(), NOW())
  `);
  const testBookingId = insertBooking.insertId;

  const [rooms] = await pool.query('SELECT RoomId, RoomNumber, RoomTypeId FROM Rooms WHERE RoomTypeId = 1 AND IsDeleted = 0 LIMIT 2');
  const [otherTypeRooms] = await pool.query('SELECT RoomId, RoomNumber, RoomTypeId FROM Rooms WHERE RoomTypeId != 1 AND IsDeleted = 0 LIMIT 1');

  try {
    // TEST 1: User không có BOOKING_CONFIRM xác nhận booking -> 403
    const { requirePermissions } = require('../middlewares/authMiddleware');
    const guestToken = jwt.sign(guestUser, JWT_SECRET);
    const mockReq1 = {
      headers: { authorization: `Bearer ${guestToken}` },
      ip: '127.0.0.1',
    };
    let test1Status = null;
    let test1Data = null;
    const mockRes1 = {
      status(c) { test1Status = c; return this; },
      json(d) { test1Data = d; },
    };
    await requirePermissions('BOOKING_CONFIRM')(mockReq1, mockRes1, () => { test1Status = 200; });
    assert('Test 1: User không có BOOKING_CONFIRM nhận lỗi 403', test1Status === 403 && test1Data?.code === 'ERROR_0010_FORBIDDEN');

    // TEST 2: Booking Pending, dữ liệu hợp lệ -> Chuyển Confirmed, ghi confirmedBy/confirmedAt
    const { req: req2, res: res2 } = createMockReqRes({
      params: { id: testBookingId },
      user: adminUser,
    });
    await ctrl.confirmBooking(req2, res2);
    assert('Test 2: Xác nhận booking thành công (200, SUCCESS_0005_CONFIRMED)',
      res2.statusCode === 200 && res2.result?.code === 'SUCCESS_0005_CONFIRMED');

    const [[checkB2]] = await pool.query('SELECT Status, ConfirmedBy, ConfirmedAt FROM Bookings WHERE BookingId = ?', [testBookingId]);
    assert('Test 2: CSDL đã cập nhật status=Confirmed và có ConfirmedBy/ConfirmedAt',
      checkB2.Status === 'Confirmed' && checkB2.ConfirmedBy === 1 && checkB2.ConfirmedAt !== null);

    // TEST 3: Booking Cancelled bấm xác nhận -> Lỗi trạng thái 400
    await pool.query('UPDATE Bookings SET Status = "Cancelled" WHERE BookingId = ?', [testBookingId]);
    const { req: req3, res: res3 } = createMockReqRes({
      params: { id: testBookingId },
      user: adminUser,
    });
    await ctrl.confirmBooking(req3, res3);
    assert('Test 3: Booking Cancelled bấm xác nhận nhận lỗi 400 ERROR_0023_BOOKING_STATUS',
      res3.statusCode === 400 && res3.result?.code === 'ERROR_0023_BOOKING_STATUS');

    // TEST 4: Booking đã CheckedIn bấm xác nhận -> Lỗi trạng thái 400
    await pool.query('UPDATE Bookings SET Status = "CheckedIn" WHERE BookingId = ?', [testBookingId]);
    const { req: req4, res: res4 } = createMockReqRes({
      params: { id: testBookingId },
      user: adminUser,
    });
    await ctrl.confirmBooking(req4, res4);
    assert('Test 4: Booking CheckedIn bấm xác nhận nhận lỗi 400 ERROR_0023_BOOKING_STATUS',
      res4.statusCode === 400 && res4.result?.code === 'ERROR_0023_BOOKING_STATUS');

    await pool.query('UPDATE Bookings SET Status = "Confirmed" WHERE BookingId = ?', [testBookingId]);

    // TEST 5: Booking yêu cầu 1 phòng, chọn 0 phòng -> Lỗi Vui lòng chọn đúng 1 phòng
    const { req: req5, res: res5 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 1, roomIds: [] },
      user: adminUser,
    });
    await ctrl.allocateRooms(req5, res5);
    assert('Test 5: Chọn 0 phòng khi cần 1 nhận lỗi 400 ERROR_0027_ROOM_ALLOCATION_COUNT',
      res5.statusCode === 400 && res5.result?.code === 'ERROR_0027_ROOM_ALLOCATION_COUNT' && res5.result?.message === 'Vui lòng chọn đúng 1 phòng');

    // TEST 6: Booking yêu cầu 2 phòng, chọn 1 phòng -> Lỗi Vui lòng chọn đúng 2 phòng
    const { req: req6, res: res6 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 2, roomIds: [rooms[0].RoomId] },
      user: adminUser,
    });
    await ctrl.allocateRooms(req6, res6);
    assert('Test 6: Chọn 1 phòng khi cần 2 nhận lỗi 400 ERROR_0027_ROOM_ALLOCATION_COUNT',
      res6.statusCode === 400 && res6.result?.code === 'ERROR_0027_ROOM_ALLOCATION_COUNT' && res6.result?.message === 'Vui lòng chọn đúng 2 phòng');

    // TEST 7: Chọn phòng sai room type -> Lỗi: Phòng {roomNumber} không thuộc loại phòng của booking
    if (otherTypeRooms.length) {
      const { req: req7, res: res7 } = createMockReqRes({
        params: { id: testBookingId },
        body: { quantity: 1, roomIds: [otherTypeRooms[0].RoomId] },
        user: adminUser,
      });
      await ctrl.allocateRooms(req7, res7);
      assert('Test 7: Chọn sai room type nhận lỗi 400 ERROR_0026_ROOM_TYPE_MISMATCH',
        res7.statusCode === 400 && res7.result?.code === 'ERROR_0026_ROOM_TYPE_MISMATCH' && res7.result?.message.includes('không thuộc loại phòng'));
    }

    // TEST 8: Chọn phòng đang Maintenance -> Lỗi ERROR_0025_ROOM_NOT_AVAILABLE
    const testRoomId = rooms[0].RoomId;
    await pool.query('UPDATE Rooms SET Status = "Maintenance" WHERE RoomId = ?', [testRoomId]);
    const { req: req8, res: res8 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 1, roomIds: [testRoomId] },
      user: adminUser,
    });
    await ctrl.allocateRooms(req8, res8);
    assert('Test 8: Phòng Maintenance nhận lỗi 409 ERROR_0025_ROOM_NOT_AVAILABLE',
      res8.statusCode === 409 && res8.result?.code === 'ERROR_0025_ROOM_NOT_AVAILABLE');
    await pool.query('UPDATE Rooms SET Status = "CleanAvailable" WHERE RoomId = ?', [testRoomId]);

    // TEST 9: Chọn phòng đã bị booking khác chiếm cùng khoảng ngày -> Lỗi xung đột ERROR_0028_ROOM_CONFLICT
    const [conflictB] = await pool.query(`
      INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, RoomQuantity, Status, ConfirmationCode, TotalAmount)
      VALUES (5, 1, '2026-11-02', '2026-11-04', 1, 'Confirmed', 'TEST-CONFLICT-01', 2000000)
    `);
    const conflictBookingId = conflictB.insertId;
    await pool.query(`
      INSERT INTO BookingRoomAllocations (BookingId, RoomId, CheckInDate, CheckOutDate, AllocatedAt)
      VALUES (?, ?, '2026-11-02', '2026-11-04', NOW())
    `, [conflictBookingId, testRoomId]);

    const { req: req9, res: res9 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 1, roomIds: [testRoomId] },
      user: adminUser,
    });
    await ctrl.allocateRooms(req9, res9);
    assert('Test 9: Trùng lịch nhận lỗi 409 ERROR_0028_ROOM_CONFLICT',
      res9.statusCode === 409 && res9.result?.code === 'ERROR_0028_ROOM_CONFLICT');

    await pool.query('DELETE FROM BookingRoomAllocations WHERE BookingId = ?', [conflictBookingId]);
    await pool.query('DELETE FROM Bookings WHERE BookingId = ?', [conflictBookingId]);

    // TEST 10: Chọn đủ số phòng khả dụng -> Gán phòng thành công
    const { req: req10, res: res10 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 2, roomIds: [rooms[0].RoomId, rooms[1].RoomId], allocationNote: 'Ghi chú test spec 7' },
      user: adminUser,
    });
    await ctrl.allocateRooms(req10, res10);
    assert('Test 10: Gán đủ phòng khả dụng thành công 200 SUCCESS_0006_ROOM_ALLOCATED',
      res10.statusCode === 200 && res10.result?.code === 'SUCCESS_0006_ROOM_ALLOCATED');

    const [allocCheck] = await pool.query('SELECT RoomId FROM BookingRoomAllocations WHERE BookingId = ?', [testBookingId]);
    assert('Test 10: DB đã tạo đủ 2 bản ghi BookingRoomAllocations', allocCheck.length === 2);

    // TEST 11: Race condition - Phòng bị lock bởi người khác
    ctrl.activeRoomLocks.set(rooms[0].RoomId, {
      bookingId: 9999,
      expiresAt: Date.now() + 600000,
      holdToken: 'TEST-HOLD',
    });
    const { req: req11, res: res11 } = createMockReqRes({
      params: { id: testBookingId },
      body: { quantity: 1, roomIds: [rooms[0].RoomId] },
      user: adminUser,
    });
    await ctrl.allocateRooms(req11, res11);
    assert('Test 11: Phòng đang bị lock bởi người khác bị từ chối 409',
      res11.statusCode === 409 && res11.result?.code === 'ERROR_0025_ROOM_NOT_AVAILABLE');
    ctrl.activeRoomLocks.delete(rooms[0].RoomId);

    // TEST 14: Xác nhận & Gán phòng cùng lúc (Luồng 4.3), tất cả hợp lệ -> Booking=Confirmed & Allocations tạo đủ
    const [b14] = await pool.query(`
      INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, RoomQuantity, Status, ConfirmationCode, TotalAmount)
      VALUES (5, 1, '2026-12-01', '2026-12-03', 2, 'Pending', 'TEST-COMBO-01', 3000000)
    `);
    const b14Id = b14.insertId;

    const { req: req14, res: res14 } = createMockReqRes({
      params: { id: b14Id },
      body: { quantity: 2, roomIds: [rooms[0].RoomId, rooms[1].RoomId] },
      user: adminUser,
    });
    await ctrl.confirmAndAllocate(req14, res14);
    assert('Test 14: Xác nhận & Gán phòng cùng lúc thành công 200',
      res14.statusCode === 200 && res14.result?.code === 'SUCCESS_0006_ROOM_ALLOCATED');

    const [[checkB14]] = await pool.query('SELECT Status, AllocatedAt, ConfirmedAt FROM Bookings WHERE BookingId = ?', [b14Id]);
    assert('Test 14: Booking chuyển Confirmed và có AllocatedAt/ConfirmedAt',
      checkB14.Status === 'Confirmed' && checkB14.AllocatedAt !== null && checkB14.ConfirmedAt !== null);

    // TEST 15: Xác nhận & Gán phòng nhưng một phòng không khả dụng -> Rollback; booking không chuyển Confirmed
    const [b15] = await pool.query(`
      INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, RoomQuantity, Status, ConfirmationCode, TotalAmount)
      VALUES (5, 1, '2026-12-05', '2026-12-08', 2, 'Pending', 'TEST-ROLLBACK-01', 3000000)
    `);
    const b15Id = b15.insertId;

    const { req: req15, res: res15 } = createMockReqRes({
      params: { id: b15Id },
      body: { quantity: 2, roomIds: [rooms[0].RoomId, 9999999] },
      user: adminUser,
    });
    await ctrl.confirmAndAllocate(req15, res15);
    assert('Test 15: Một phòng không hợp lệ báo lỗi 409', res15.statusCode === 409);

    const [[checkB15]] = await pool.query('SELECT Status FROM Bookings WHERE BookingId = ?', [b15Id]);
    assert('Test 15: Booking vẫn giữ trạng thái Pending, không bị đổi sang Confirmed', checkB15.Status === 'Pending');

    // Dọn dẹp test data
    await pool.query('DELETE FROM BookingRoomAllocations WHERE BookingId IN (?, ?, ?)', [testBookingId, b14Id, b15Id]);
    await pool.query('DELETE FROM Stays WHERE BookingId IN (?, ?, ?)', [testBookingId, b14Id, b15Id]);
    await pool.query('DELETE FROM Bookings WHERE BookingId IN (?, ?, ?)', [testBookingId, b14Id, b15Id]);

    console.log(`\n========================================`);
    console.log(`KẾT QUẢ KIỂM THỬ: ${passCount} PASSED, ${failCount} FAILED.`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Lỗi khi chạy test suite:', err);
  } finally {
    pool.end();
  }
}

runTests();
