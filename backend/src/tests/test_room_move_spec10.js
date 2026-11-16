'use strict';

/**
 * Bộ Test Tự Động Nghiệm Thu Spec 10: Đổi phòng do sự cố (FEAT-ROOM-MOVE-01)
 * Kiểm thử 20 Test Cases quy định tại Mục 7 tài liệu Spec_10.RoomMove.docx
 */

const assert = require('assert');
const pool = require('../config/db');
const {
  getRoomMoveOptionsCore,
  createOrExecuteRoomMoveCore,
  completeRoomMoveCore,
} = require('../routes/admin/roomMoveRoutes');

let testStayId = null;
let testBookingId = null;
let currentRoomId = null;
let targetRoomCleanId = null;
let targetRoomOooId = null;
let targetRoomSmallId = null;
let targetRoomSuiteId = null;
let outStayId = null;

const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

async function setupTestData() {
  console.log(colors.cyan('--- [SETUP] Khởi tạo dữ liệu kiểm thử Spec 10 ---'));
  const conn = await pool.getConnection();
  try {
    // 1. Lấy hoặc tạo RoomTypes
    const [rtRows] = await conn.query('SELECT RoomTypeId, BasePrice FROM RoomTypes LIMIT 2');
    const standardTypeId = rtRows[0]?.RoomTypeId || 1;
    const suiteTypeId = rtRows[1]?.RoomTypeId || 2;

    // 2. Tạo các phòng thử nghiệm
    // Phòng hiện tại của khách
    const [rCur] = await conn.query(
      `INSERT INTO Rooms (RoomNumber, RoomTypeId, Floor, Status, BranchId, CreatedAt)
       VALUES ('TEST-RM-101', ?, 1, 'Occupied', 1, NOW())`,
      [standardTypeId]
    );
    currentRoomId = rCur.insertId;

    // Phòng sạch khả dụng đạt chuẩn
    const [rClean] = await conn.query(
      `INSERT INTO Rooms (RoomNumber, RoomTypeId, Floor, Status, BranchId, CreatedAt)
       VALUES ('TEST-RM-102', ?, 1, 'CleanAvailable', 1, NOW())`,
      [standardTypeId]
    );
    targetRoomCleanId = rClean.insertId;

    // Phòng hỏng / bảo trì (OutOfOrder)
    const [rOoo] = await conn.query(
      `INSERT INTO Rooms (RoomNumber, RoomTypeId, Floor, Status, BranchId, CreatedAt)
       VALUES ('TEST-RM-103', ?, 1, 'OutOfOrder', 1, NOW())`,
      [standardTypeId]
    );
    targetRoomOooId = rOoo.insertId;

    // Phòng Suite hạng cao
    const [rSuite] = await conn.query(
      `INSERT INTO Rooms (RoomNumber, RoomTypeId, Floor, Status, BranchId, CreatedAt)
       VALUES ('TEST-RM-104', ?, 2, 'Available', 1, NOW())`,
      [suiteTypeId]
    );
    targetRoomSuiteId = rSuite.insertId;

    // 3. Tạo Booking đang lưu trú
    const [bRes] = await conn.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, Status, CreatedAt)
       VALUES (1, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 3, 2, 0, 4500000, 'CheckedIn', NOW())`,
      [standardTypeId]
    );
    testBookingId = bRes.insertId;

    // 4. Tạo Stay CheckedIn
    const [sRes] = await conn.query(
      `INSERT INTO Stays (BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, Status, Version, CreatedAt)
       VALUES (?, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'CheckedIn', 1, NOW())`,
      [testBookingId, currentRoomId]
    );
    testStayId = sRes.insertId;

    // 5. Tạo Stay đã CheckedOut để kiểm tra TC2
    const [sOutRes] = await conn.query(
      `INSERT INTO Stays (BookingId, RoomId, ActualCheckIn, ExpectedCheckOut, ActualCheckOut, Status, Version, CreatedAt)
       VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW(), 'CheckedOut', 1, NOW())`,
      [testBookingId, currentRoomId]
    );
    outStayId = sOutRes.insertId;

    console.log(`✅ Khởi tạo thành công: StayId=${testStayId}, CurrentRoom=${currentRoomId}, CleanRoom=${targetRoomCleanId}, SuiteRoom=${targetRoomSuiteId}`);
  } finally {
    conn.release();
  }
}

async function cleanupTestData() {
  console.log(colors.cyan('--- [CLEANUP] Thu dọn dữ liệu kiểm thử ---'));
  const conn = await pool.getConnection();
  try {
    const testRooms = [currentRoomId, targetRoomCleanId, targetRoomOooId, targetRoomSuiteId].filter(Boolean);
    if (testRooms.length) {
      await conn.query('DELETE FROM MaintenanceTickets WHERE RoomId IN (?)', [testRooms]);
      await conn.query('DELETE FROM HousekeepingAssignments WHERE RoomId IN (?)', [testRooms]);
      await conn.query('DELETE FROM RoomStatusHistory WHERE RoomId IN (?)', [testRooms]);
    }
    if (testStayId) {
      await conn.query('DELETE FROM HousekeepingAssignments WHERE StayId IN (?, ?)', [testStayId, outStayId]);
      await conn.query('DELETE FROM StayRoomSegments WHERE StayId IN (?, ?)', [testStayId, outStayId]);
      await conn.query('DELETE FROM RoomMoveRequests WHERE StayId IN (?, ?)', [testStayId, outStayId]);
      await conn.query('DELETE FROM RoomMoveHistory WHERE StayId IN (?, ?)', [testStayId, outStayId]);
      await conn.query('DELETE FROM Stays WHERE StayId IN (?, ?)', [testStayId, outStayId]);
    }
    if (testBookingId) {
      await conn.query('DELETE FROM Bookings WHERE BookingId = ?', [testBookingId]);
    }
    if (testRooms.length) {
      await conn.query('DELETE FROM Rooms WHERE RoomId IN (?)', [testRooms]);
    }
    console.log('✅ Đã dọn dẹp xong dữ liệu test.');
  } finally {
    conn.release();
  }
}

async function resetRoomStates() {
  await pool.query('UPDATE Rooms SET Status = "CleanAvailable" WHERE RoomId = ?', [targetRoomCleanId]);
  await pool.query('UPDATE Rooms SET Status = "Available" WHERE RoomId = ?', [targetRoomSuiteId]);
  await pool.query('UPDATE Rooms SET Status = "OutOfOrder" WHERE RoomId = ?', [targetRoomOooId]);
  await pool.query('UPDATE Rooms SET Status = "Occupied" WHERE RoomId = ?', [currentRoomId]);
  await pool.query('UPDATE Stays SET RoomId = ? WHERE StayId = ?', [currentRoomId, testStayId]);
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await resetRoomStates();
      await fn();
      console.log(colors.green(`  ✔ [PASS] ${name}`));
      passed++;
    } catch (err) {
      console.error(colors.red(`  ✘ [FAIL] ${name}`));
      console.error(colors.red(`     Lỗi: ${err.message}`));
      failed++;
    }
  };

  console.log(colors.bold('\n═══════════════════════════════════════════════════════════════════════'));
  console.log(colors.bold('   BẮT ĐẦU KIỂM THỬ 20 TEST CASES THEO ĐẶC TẢ SPEC 10 (ROOM MOVE)       '));
  console.log(colors.bold('═══════════════════════════════════════════════════════════════════════\n'));

  // -------------------------------------------------------------------------
  // TC 1: Happy path - Stay CheckedIn, sự cố thiết bị, target sạch & phù hợp
  // -------------------------------------------------------------------------
  await test('TC01: Stay CheckedIn, sự cố thiết bị, target sạch -> Tạo room move, mở segment mới, stay vẫn CheckedIn', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Máy lạnh phát tiếng ồn rung lắc cần đổi phòng',
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.errorCode, 'SUCCESS_ROOMMOVE_0001_COMPLETED');

    // Kiểm tra Stay vẫn CheckedIn và trỏ tới targetRoomCleanId
    const [sRows] = await pool.query('SELECT RoomId, Status FROM Stays WHERE StayId = ?', [testStayId]);
    assert.strictEqual(sRows[0].Status, 'CheckedIn');
    assert.strictEqual(sRows[0].RoomId, targetRoomCleanId);

    // Kiểm tra segment mới đã mở
    const [segRows] = await pool.query('SELECT * FROM StayRoomSegments WHERE StayId = ? AND ValidTo IS NULL', [testStayId]);
    assert.strictEqual(segRows.length, 1);
    assert.strictEqual(segRows[0].RoomId, targetRoomCleanId);
  });

  // -------------------------------------------------------------------------
  // TC 2: Stay đã CheckedOut -> Không cho tạo move, báo ROOMMOVE_0001
  // -------------------------------------------------------------------------
  await test('TC02: Stay đã CheckedOut -> Báo lỗi ROOMMOVE_0001_STAY_NOT_ACTIVE', async () => {
    const res = await createOrExecuteRoomMoveCore(
      outStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Yêu cầu đổi phòng sau checkout',
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0001_STAY_NOT_ACTIVE');
    assert.strictEqual(res.body.message, 'Không thể đổi phòng vì lượt lưu trú không còn hiệu lực');
  });

  // -------------------------------------------------------------------------
  // TC 3 & 4: Target room OUT_OF_ORDER hoặc OCCUPIED -> Báo ROOMMOVE_0003
  // -------------------------------------------------------------------------
  await test('TC03 & TC04: Target room OUT_OF_ORDER -> Báo lỗi ROOMMOVE_0003_TARGET_UNAVAILABLE', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomOooId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Chọn phòng đang bị hỏng',
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0003_TARGET_UNAVAILABLE');
    assert.strictEqual(res.body.message, 'Phòng vừa được giữ hoặc không còn khả dụng. Vui lòng chọn phòng khác.');
  });

  // -------------------------------------------------------------------------
  // TC 5: Target room không đủ sức chứa -> Báo ROOMMOVE_0004
  // -------------------------------------------------------------------------
  await test('TC05: Target room không đủ sức chứa -> Báo lỗi ROOMMOVE_0004_ROOM_CONSTRAINT', async () => {
    // Tạm thời tăng số khách trong Booking lên 10 người
    await pool.query('UPDATE Bookings SET Adults = 8, Children = 2 WHERE BookingId = ?', [testBookingId]);

    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'ROOM_FEATURE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Đổi sang phòng nhỏ hơn số lượng khách',
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    // Phục hồi lại số khách ban đầu
    await pool.query('UPDATE Bookings SET Adults = 2, Children = 0 WHERE BookingId = ?', [testBookingId]);

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0004_ROOM_CONSTRAINT');
    assert.strictEqual(res.body.message, 'Phòng thay thế không đáp ứng sức chứa hoặc yêu cầu bắt buộc của khách');
  });

  // -------------------------------------------------------------------------
  // TC 6 & 12: Đổi sang phòng khác giá nhưng chưa có policy -> Báo ROOMMOVE_0011
  // -------------------------------------------------------------------------
  await test('TC12: Chưa cấu hình chính sách giá khi phòng khác hạng -> Báo lỗi ROOMMOVE_0011_RATE_POLICY_REQUIRED', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomSuiteId,
        incidentType: 'GUEST_REQUEST',
        incidentSeverity: 'LOW',
        incidentDescription: 'Khách muốn đổi lên phòng Suite',
        rateAdjustment: '', // Rỗng
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0011_RATE_POLICY_REQUIRED');
    assert.strictEqual(res.body.message, 'Chưa cấu hình chính sách giá cho việc đổi phòng');
  });

  // -------------------------------------------------------------------------
  // TC 7: Target room bị người khác chiếm trước khi commit -> Báo ROOMMOVE_0003
  // -------------------------------------------------------------------------
  await test('TC07: Race condition: Target room bị chuyển sang Occupied -> Commit bị từ chối ROOMMOVE_0003', async () => {
    await pool.query('UPDATE Rooms SET Status = "Occupied" WHERE RoomId = ?', [targetRoomCleanId]);

    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Đổi sang phòng vừa bị chiếm',
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    await pool.query('UPDATE Rooms SET Status = "CleanAvailable" WHERE RoomId = ?', [targetRoomCleanId]);

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0003_TARGET_UNAVAILABLE');
  });

  // -------------------------------------------------------------------------
  // TC 8: Hai yêu cầu đổi phòng đồng thời cho cùng stay -> Báo ROOMMOVE_0009
  // -------------------------------------------------------------------------
  await test('TC08: Hai yêu cầu đổi phòng đồng thời cho cùng stay -> Báo ROOMMOVE_0009_MOVE_IN_PROGRESS', async () => {
    // Tạo 1 request đang ở trạng thái REQUESTED
    const [reqIns] = await pool.query(
      `INSERT INTO RoomMoveRequests (StayId, CurrentRoomId, TargetRoomId, IncidentType, IncidentSeverity, IncidentDescription, MoveStatus, CreatedAt, Version)
       VALUES (?, ?, ?, 'MAINTENANCE', 'LOW', 'Yêu cầu đổi phòng 1 đang chờ xử lý', 'REQUESTED', NOW(), 1)`,
      [testStayId, currentRoomId, targetRoomCleanId]
    );
    const existingReqId = reqIns.insertId;

    // Gửi yêu cầu thứ hai
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Yêu cầu đổi phòng 2 gửi đồng thời',
        executeNow: false,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    // Dọn dẹp request test
    await pool.query('DELETE FROM RoomMoveRequests WHERE MoveId = ?', [existingReqId]);

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0009_MOVE_IN_PROGRESS');
    assert.strictEqual(res.body.message, 'Đang có một yêu cầu đổi phòng khác cho lượt lưu trú này');
  });

  // -------------------------------------------------------------------------
  // TC 9: Lịch sử phòng không chồng thời gian, current room là target
  // -------------------------------------------------------------------------
  await test('TC09: Lịch sử phòng trong StayRoomSegments không chồng thời gian', async () => {
    const [segments] = await pool.query(
      'SELECT SegmentId, RoomId, ValidFrom, ValidTo FROM StayRoomSegments WHERE StayId = ? ORDER BY ValidFrom ASC',
      [testStayId]
    );

    assert.ok(segments.length >= 1, 'Cần có ít nhất 1 segment');
    for (let i = 0; i < segments.length - 1; i++) {
      assert.ok(segments[i].ValidTo !== null, `Segment ${segments[i].SegmentId} phải có ValidTo xác định`);
    }
    assert.strictEqual(segments[segments.length - 1].ValidTo, null, 'Segment hiện hành phải có ValidTo là NULL');
  });

  // -------------------------------------------------------------------------
  // TC 10: Phòng cũ có sự cố nghiêm trọng -> OUT_OF_ORDER và mở MaintenanceTicket
  // -------------------------------------------------------------------------
  await test('TC10: Sự cố nghiêm trọng -> Phòng cũ thành OutOfOrder và tạo MaintenanceTickets', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'SAFETY',
        incidentSeverity: 'HIGH',
        incidentDescription: 'Rò rỉ chập điện ổ cắm nguy hiểm',
        oldRoomDisposition: 'OUT_OF_ORDER',
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);

    // Kiểm tra ticket bảo trì được tạo cho phòng cũ (currentRoomId)
    const [tickets] = await pool.query(
      'SELECT * FROM MaintenanceTickets WHERE RoomId = ? ORDER BY CreatedAt DESC LIMIT 1',
      [currentRoomId]
    );
    assert.ok(tickets.length >= 1, 'Phải tạo phiếu bảo trì cho phòng cũ');
  });

  // -------------------------------------------------------------------------
  // TC 11: Sự cố do khách sạn, chính sách KEEP_ORIGINAL
  // -------------------------------------------------------------------------
  await test('TC11: Sự cố do khách sạn -> Giữ giá gốc KEEP_ORIGINAL, không phát sinh phí', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomSuiteId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'MEDIUM',
        incidentDescription: 'Điều hòa hỏng do khách sạn, nâng cấp giữ giá',
        rateAdjustment: 'KEEP_ORIGINAL',
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.rateAdjustment, 'KEEP_ORIGINAL');
  });

  // -------------------------------------------------------------------------
  // TC 13: Khách từ chối phòng mới -> Lưu DECLINED, không đổi phòng/folio
  // -------------------------------------------------------------------------
  await test('TC13: Khách từ chối đổi phòng -> Lưu DECLINED, giữ nguyên phòng hiện tại', async () => {
    const [sBefore] = await pool.query('SELECT RoomId FROM Stays WHERE StayId = ?', [testStayId]);
    const originalRoom = sBefore[0].RoomId;

    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'NOISE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Khách không thích tiếng ồn nhưng từ chối phòng tầng 2',
        guestAcknowledgement: 'DECLINED',
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.guestAcknowledgement, 'DECLINED');

    // Phòng của stay không bị đổi
    const [sAfter] = await pool.query('SELECT RoomId FROM Stays WHERE StayId = ?', [testStayId]);
    assert.strictEqual(sAfter[0].RoomId, originalRoom);
  });

  // -------------------------------------------------------------------------
  // TC 14: Emergency move được xác nhận khẩn cấp
  // -------------------------------------------------------------------------
  await test('TC14: Emergency Move được kích hoạt với cờ isEmergency: true', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'SAFETY',
        incidentSeverity: 'EMERGENCY',
        incidentDescription: 'Báo động cháy tầng 1, chuyển khẩn cấp',
        isEmergency: true,
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isEmergency, true);
  });

  // -------------------------------------------------------------------------
  // TC 15: Retry API với cùng idempotency key -> Trả kết quả cũ, không tạo trùng
  // -------------------------------------------------------------------------
  await test('TC15: Idempotency: Gửi lại cùng idempotencyKey trả cùng kết quả', async () => {
    const testIdemKey = `IDEMP-TEST-${Date.now()}`;

    const res1 = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Thử nghiệm tính Idempotency lần 1',
        idempotencyKey: testIdemKey,
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'idempotency-key': testIdemKey }
    );

    const res2 = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Thử nghiệm tính Idempotency lần 2',
        idempotencyKey: testIdemKey,
        executeNow: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'idempotency-key': testIdemKey }
    );

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);
    assert.deepStrictEqual(res1.body, res2.body);
  });

  // -------------------------------------------------------------------------
  // TC 16: Version stay thay đổi trước commit -> Báo ROOMMOVE_0005
  // -------------------------------------------------------------------------
  await test('TC16: Optimistic lock: Sai lệch version stay -> Báo lỗi ROOMMOVE_0005_VERSION_CONFLICT', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Thử nghiệm xung đột phiên bản',
        version: 999999, // Version cũ/sai
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0005_VERSION_CONFLICT');
    assert.strictEqual(res.body.message, 'Thông tin lưu trú vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.');
  });

  // -------------------------------------------------------------------------
  // TC 17: Tích hợp khóa điện tử timeout -> Báo ROOMMOVE_0010_INTEGRATION_PENDING, không rollback DB
  // -------------------------------------------------------------------------
  await test('TC17: Thẻ khóa ngoài timeout -> Báo ROOMMOVE_0010_INTEGRATION_PENDING, assignment vẫn thành công', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Thử nghiệm giả lập timeout khóa từ',
        executeNow: true,
        simulateKeycardTimeout: true,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0010_INTEGRATION_PENDING');
    assert.strictEqual(res.body.data.integrationStatus.keycard, 'PENDING_RETRY');
  });

  // -------------------------------------------------------------------------
  // TC 18: Housekeeping cho phòng cũ -> Cập nhật DirtyCleaning và tạo task
  // -------------------------------------------------------------------------
  await test('TC18: Phòng cũ sau khi đổi giữ trạng thái DirtyCleaning và tạo HousekeepingAssignments', async () => {
    const [tasks] = await pool.query(
      'SELECT * FROM HousekeepingAssignments WHERE StayId = ? ORDER BY AssignmentDate DESC LIMIT 1',
      [testStayId]
    );
    assert.ok(tasks.length >= 1, 'Phải tạo nhiệm vụ dọn phòng');
    assert.strictEqual(tasks[0].Status, 'Assigned');
  });

  // -------------------------------------------------------------------------
  // TC 19: Nhân viên không có ROOMMOVE_APPROVE duyệt chênh giá -> 403 FORBIDDEN
  // -------------------------------------------------------------------------
  await test('TC19: Nhân viên không có quyền ROOMMOVE_APPROVE -> Báo 403 ERROR_0010_FORBIDDEN', async () => {
    const res = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomSuiteId,
        incidentType: 'GUEST_REQUEST',
        incidentSeverity: 'LOW',
        incidentDescription: 'Khách muốn nâng hạng phòng có phụ thu',
        rateAdjustment: 'REPRICE_REMAINDER',
      },
      { userId: 2, roleName: 'receptionist', permissions: ['ROOMMOVE_VIEW', 'ROOMMOVE_CREATE'] }, // Không có ROOMMOVE_APPROVE
      { 'x-bypass-auth': 'false' }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.errorCode, 'ROOMMOVE_0006_APPROVAL_REQUIRED');
  });

  // -------------------------------------------------------------------------
  // TC 20: Options matrix tìm phòng khả dụng đúng theo tiêu chí
  // -------------------------------------------------------------------------
  await test('TC20: GET /room-move/options trả danh sách phòng khả dụng cùng cơ sở', async () => {
    const res = await getRoomMoveOptionsCore(
      testStayId,
      { floor: 'ALL' },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  // -------------------------------------------------------------------------
  // TC 21: Quy trình 2 bước: Tạo yêu cầu REQUESTED rồi hoàn tất qua completeRoomMoveCore
  // -------------------------------------------------------------------------
  await test('TC21: POST /room-moves/:id/complete hoàn tất yêu cầu đổi phòng đã REQUESTED', async () => {
    const initRes = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'MAINTENANCE',
        incidentSeverity: 'MEDIUM',
        incidentDescription: 'Tạo phiếu đổi phòng chờ hoàn tất bàn giao',
        executeNow: false,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(initRes.status, 200);
    const moveId = initRes.body.data.moveId;

    const compRes = await completeRoomMoveCore(
      moveId,
      {},
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.body.errorCode, 'SUCCESS_ROOMMOVE_0001_COMPLETED');
    assert.strictEqual(compRes.body.data.toRoomNumber, 'TEST-RM-102');
  });

  // -------------------------------------------------------------------------
  // TC 22: Hủy yêu cầu đổi phòng trước khi hoàn tất -> Status chuyển CANCELLED
  // -------------------------------------------------------------------------
  await test('TC22: Hủy yêu cầu đổi phòng trước khi hoàn tất -> Chuyển sang CANCELLED', async () => {
    const initRes = await createOrExecuteRoomMoveCore(
      testStayId,
      {
        targetRoomId: targetRoomCleanId,
        incidentType: 'NOISE',
        incidentSeverity: 'LOW',
        incidentDescription: 'Khách yêu cầu đổi phòng nhưng sau đó đổi ý không muốn chuyển nữa',
        executeNow: false,
      },
      { userId: 1, roleName: 'admin' },
      { 'x-bypass-auth': 'true' }
    );

    const moveId = initRes.body.data.moveId;
    await pool.query('UPDATE RoomMoveRequests SET MoveStatus = "CANCELLED" WHERE MoveId = ?', [moveId]);

    const [rows] = await pool.query('SELECT MoveStatus FROM RoomMoveRequests WHERE MoveId = ?', [moveId]);
    assert.strictEqual(rows[0].MoveStatus, 'CANCELLED');
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`   KẾT QUẢ KIỂM THỬ: ${colors.green(passed + ' PASSED')}, ${failed > 0 ? colors.red(failed + ' FAILED') : colors.green('0 FAILED')}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  return failed === 0;
}

(async () => {
  try {
    await setupTestData();
    const success = await runTests();
    await cleanupTestData();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
    try { await cleanupTestData(); } catch (_) {}
    process.exit(1);
  }
})();
