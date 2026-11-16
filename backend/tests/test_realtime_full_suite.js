'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FULL AUTOMATED TEST SUITE: KIỂM TRA PHÒNG TRỐNG REAL-TIME & WEBSOCKET
 * Tính năng: FEAT-GUEST-04 (Mã truy vết: A4)
 * 
 * Kiểm thử toàn diện:
 * 1. Validation ngày nhận/trả phòng & số lượng
 * 2. Loại phòng không tồn tại / ngừng kinh doanh
 * 3. Trừ chính xác phòng bảo trì / hỏng hóc (Maintenance / OutOfOrder)
 * 4. Trùng lịch 1 phần, trùng lịch toàn phần
 * 5. Khóa phòng 15 phút (Anti-Overbooking Lock)
 * 6. Cơ chế excludeSessionId (cho phép khách đang giữ lock được tiếp tục thanh toán)
 * 7. Tranh chấp đồng thời (Simultaneous Concurrency Race Condition)
 * 8. Nhả phòng thủ công & Đồng bộ MySQL DB
 * 9. WebSocket Real-time Hub: kết nối ws, nhận tin CONNECTED và các event broadcast
 * ═══════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const WebSocket = require('ws');
const availabilityService = require('../src/services/availabilityService');
const { initSocket, broadcastRoomEvent } = require('../src/sockets/socketHandler');
const { RoomType, Room, Booking } = require('../src/models');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`   ✅ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`   ❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function runFullTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN: KIỂM TRA PHÒNG REALTIME');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let testServer = null;
  let testRoomTypeId = null;

  try {
    // ─── SETUP SERVER & WEBSOCKET TEST ──────────────────────────────────────
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    initSocket(server);

    await new Promise((resolve) => server.listen(5099, resolve));
    testServer = server;
    console.log('🔌 Test Server & WebSocket Hub khởi chạy tại port 5099.\n');

    // ─── SETUP DỮ LIỆU PHÒNG TEST ───────────────────────────────────────────
    let rt = await RoomType.findOne({ where: { TypeCode: 'TEST-REALTIME-SUITE' } });
    if (!rt) {
      rt = await RoomType.create({
        TypeCode: 'TEST-REALTIME-SUITE',
        TypeName: 'Suite Kiểm Thử Realtime Cao Cấp',
        Description: 'Dành riêng cho test runner tự động',
        BasePrice: 3500000,
        TotalRooms: 4,
        Status: 'Active',
        IsDeleted: false
      });
    }
    testRoomTypeId = rt.RoomTypeId;

    // Tạo đúng 4 phòng vật lý:
    // Phòng 1: CleanAvailable
    // Phòng 2: CleanAvailable
    // Phòng 3: CleanAvailable
    // Phòng 4: Maintenance (Bảo trì)
    await Room.destroy({ where: { RoomTypeId: testRoomTypeId } });
    await Room.bulkCreate([
      { BranchId: 1, RoomTypeId: testRoomTypeId, RoomNumber: 'TEST-RT-01', Floor: 10, Status: 'CleanAvailable', IsDeleted: false },
      { BranchId: 1, RoomTypeId: testRoomTypeId, RoomNumber: 'TEST-RT-02', Floor: 10, Status: 'CleanAvailable', IsDeleted: false },
      { BranchId: 1, RoomTypeId: testRoomTypeId, RoomNumber: 'TEST-RT-03', Floor: 10, Status: 'CleanAvailable', IsDeleted: false },
      { BranchId: 1, RoomTypeId: testRoomTypeId, RoomNumber: 'TEST-RT-04', Floor: 10, Status: 'Maintenance', IsDeleted: false },
    ]);

    // Xóa bookings test cũ
    await Booking.destroy({ where: { RoomTypeId: testRoomTypeId } });
    console.log(`🏨 Đã tạo loại phòng Test ID ${testRoomTypeId}: Tổng 4 phòng (3 khả dụng, 1 đang bảo trì).\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Validation đầu vào
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 1] Kiểm tra Validation dữ liệu đầu vào:');

    // 1.1 Số lượng < 1
    let threwInvalidQuantity = false;
    try {
      await availabilityService.checkAvailability({
        roomTypeId: testRoomTypeId,
        checkInDate: '2027-05-10',
        checkOutDate: '2027-05-12',
        quantity: 0
      });
    } catch (e) {
      threwInvalidQuantity = e.code === 'ERROR_0005_INVALID_VALUE';
    }
    assert(threwInvalidQuantity, 'Chặn số lượng phòng <= 0 (ERROR_0005_INVALID_VALUE)');

    // 1.2 Ngày trả phòng <= Ngày nhận phòng
    let threwInvalidDateRange = false;
    try {
      await availabilityService.checkAvailability({
        roomTypeId: testRoomTypeId,
        checkInDate: '2027-05-15',
        checkOutDate: '2027-05-10',
        quantity: 1
      });
    } catch (e) {
      threwInvalidDateRange = e.code === 'ERROR_0005_INVALID_VALUE';
    }
    assert(threwInvalidDateRange, 'Chặn check-out trước check-in (ERROR_0005_INVALID_VALUE)');

    // 1.3 Ngày nhận phòng trong quá khứ
    let threwPastCheckIn = false;
    try {
      await availabilityService.checkAvailability({
        roomTypeId: testRoomTypeId,
        checkInDate: '2020-01-01',
        checkOutDate: '2020-01-05',
        quantity: 1
      });
    } catch (e) {
      threwPastCheckIn = e.code === 'ERROR_0005_INVALID_VALUE';
    }
    assert(threwPastCheckIn, 'Chặn ngày nhận phòng trong quá khứ (ERROR_0005_INVALID_VALUE)');

    // 1.4 Loại phòng không tồn tại
    let threwNotFound = false;
    try {
      await availabilityService.checkAvailability({
        roomTypeId: 99999999,
        checkInDate: '2027-05-10',
        checkOutDate: '2027-05-12',
        quantity: 1
      });
    } catch (e) {
      threwNotFound = e.code === 'ERROR_0021_ROOM_TYPE_NOT_FOUND';
    }
    assert(threwNotFound, 'Phát hiện loại phòng không tồn tại (ERROR_0021_ROOM_TYPE_NOT_FOUND)\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Kiểm tra trừ phòng bảo trì và tính số phòng trống ban đầu
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 2] Tính khả dụng ban đầu & Trừ phòng bảo trì:');
    const initAvail = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-10',
      checkOutDate: '2027-05-13',
      quantity: 1
    });

    assert(initAvail.isAvailable === true, 'Trạng thái khả dụng isAvailable = true');
    assert(initAvail.availableRoomsCount === 3, 'Khả dụng chính xác là 3 (4 tổng - 1 bảo trì = 3)');
    assert(initAvail.dailyInventory[0].maintenanceRooms === 1, 'Số phòng bảo trì được ghi nhận đúng = 1');
    assert(initAvail.pricingSummary.numberOfNights === 3, 'Số đêm lưu trú tính chính xác = 3 đêm\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Đặt phòng thực tế & Kiểm tra chồng chéo ngày (Overlap Booking)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 3] Đặt phòng và kiểm tra trừ kho chính xác:');
    // Booking 1: 10/05 -> 12/05 (2 phòng)
    await Booking.create({
      UserId: 1,
      RoomTypeId: testRoomTypeId,
      CheckInDate: '2027-05-10',
      CheckOutDate: '2027-05-12',
      RoomQuantity: 2,
      Status: 'Confirmed'
    });

    // Khách hỏi ngày 11/05 -> 13/05 (cấn ngày 11/05 còn: 3 - 2 = 1 phòng)
    const overlapAvail = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 1
    });

    assert(overlapAvail.isAvailable === true, 'Vẫn còn phòng cho 1 phòng yêu cầu');
    assert(overlapAvail.availableRoomsCount === 1, 'Kho phòng trống giảm xuống đúng 1 phòng');

    // Khách đòi đặt 2 phòng -> Phải báo không đủ
    const notEnoughAvail = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 2
    });
    assert(notEnoughAvail.isAvailable === false, 'Yêu cầu 2 phòng trong khi chỉ còn 1 -> isAvailable = false\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Khóa giữ phòng 15 phút & Cơ chế excludeSessionId
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 4] Khóa giữ phòng 15 phút & excludeSessionId:');
    // Còn đúng 1 phòng cho ngày 11-13/05. Khách A khóa phòng này:
    const lockA = await availabilityService.acquireRoomLock({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 1
    });

    assert(Boolean(lockA.lockSessionId), 'Khách A tạo lockSession thành công');
    assert(lockA.timeoutSeconds === 900, 'Thời gian timeout là 900 giây (15 phút)');

    // Người thứ ba check phòng -> Phải thấy hết phòng (0 phòng)
    const thirdPartyCheck = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 1
    });
    assert(thirdPartyCheck.availableRoomsCount === 0, 'Người ngoài kiểm tra thấy availableRoomsCount = 0 (hết phòng)');

    // Người thứ ba cố tình lock -> Phải ném lỗi ERROR_0022_ROOM_SOLD_OUT
    let lockCThrew = false;
    try {
      await availabilityService.acquireRoomLock({
        roomTypeId: testRoomTypeId,
        checkInDate: '2027-05-11',
        checkOutDate: '2027-05-13',
        quantity: 1
      });
    } catch (e) {
      lockCThrew = e.code === 'ERROR_0022_ROOM_SOLD_OUT';
    }
    assert(lockCThrew, 'Từ chối người thứ ba lock khi đã hết phòng (ERROR_0022_ROOM_SOLD_OUT)');

    // Khách A (người đang giữ lock) kiểm tra để tiến hành thanh toán với excludeSessionId:
    const buyerSelfCheck = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 1,
      excludeSessionId: lockA.lockSessionId
    });
    assert(
      buyerSelfCheck.isAvailable === true && buyerSelfCheck.availableRoomsCount === 1,
      'excludeSessionId hoạt động chuẩn: Không trừ lock của chính người mua, cho phép hoàn tất checkout'
    );

    // Nhả lock của khách A:
    const releaseSuccess = await availabilityService.releaseRoomLock(lockA.lockSessionId);
    assert(releaseSuccess === true, 'Nhả khóa phòng thành công');

    // Sau khi nhả, kho phòng phục hồi lại 1 phòng cho mọi người:
    const afterRelease = await availabilityService.checkAvailability({
      roomTypeId: testRoomTypeId,
      checkInDate: '2027-05-11',
      checkOutDate: '2027-05-13',
      quantity: 1
    });
    assert(afterRelease.availableRoomsCount === 1, 'Kho phòng lập tức phục hồi lại 1 phòng sau khi nhả lock\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Tranh chấp đồng thời (Simultaneous Concurrency Race Condition)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 5] Mô phỏng tranh chấp đồng thời (Race Condition):');
    // Còn đúng 1 phòng duy nhất. 5 request đồng thời gửi đến cùng 1 lúc:
    const promises = Array.from({ length: 5 }, (_, i) => {
      return availabilityService.acquireRoomLock({
        roomTypeId: testRoomTypeId,
        checkInDate: '2027-05-11',
        checkOutDate: '2027-05-13',
        quantity: 1
      }).then(res => ({ success: true, id: i, lockSessionId: res.lockSessionId }))
        .catch(err => ({ success: false, id: i, error: err.code }));
    });

    const raceResults = await Promise.all(promises);
    const successLocks = raceResults.filter(r => r.success);
    const rejectedLocks = raceResults.filter(r => !r.success);

    assert(successLocks.length === 1, `Chính xác 1 khách hàng lock thành công (thực tế: ${successLocks.length})`);
    assert(rejectedLocks.length === 4, `4 khách hàng còn lại bị từ chối chống Overbooking (thực tế: ${rejectedLocks.length})`);
    assert(
      rejectedLocks.every(r => r.error === 'ERROR_0022_ROOM_SOLD_OUT' || r.error === 'ERROR_0023_INSUFFICIENT_ROOMS'),
      'Các lỗi trả về đều đúng chuẩn mã ERROR_0022/0023'
    );

    // Dọn dẹp lock thành công
    if (successLocks.length > 0) {
      await availabilityService.releaseRoomLock(successLocks[0].lockSessionId);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: WebSocket Real-time Hub
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [PHẦN 6] Kiểm tra WebSocket Realtime Hub:');
    const wsReceivedEvents = [];

    const wsClient = new WebSocket('ws://localhost:5099/ws/rooms');

    wsClient.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        wsReceivedEvents.push(parsed);
      } catch (_) {}
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connect timeout')), 3000);
      wsClient.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      wsClient.on('error', reject);
    });

    // Chờ nhận tin CONNECTED ban đầu
    await new Promise((r) => setTimeout(r, 200));
    const connectedEvent = wsReceivedEvents.find(e => e.type === 'CONNECTED');
    assert(Boolean(connectedEvent), 'Client nhận được thông điệp CONNECTED khi kết nối tới /ws/rooms');

    // Thử phát broadcast ROOM_STATUS_CHANGED và ROOM_LOCK_ACQUIRED
    broadcastRoomEvent('ROOM_STATUS_CHANGED', { roomId: 101, roomNumber: '101', action: 'clean' });
    broadcastRoomEvent('ROOM_LOCK_ACQUIRED', { roomTypeId: testRoomTypeId, lockSessionId: 'test-ws-session' });

    // Chờ nhận broadcast
    await new Promise((r) => setTimeout(r, 300));

    const statusEvent = wsReceivedEvents.find(e => e.type === 'ROOM_STATUS_CHANGED');
    const lockEvent = wsReceivedEvents.find(e => e.type === 'ROOM_LOCK_ACQUIRED');

    assert(Boolean(statusEvent), 'WebSocket client nhận được sự kiện ROOM_STATUS_CHANGED realtime');
    assert(Boolean(lockEvent), 'WebSocket client nhận được sự kiện ROOM_LOCK_ACQUIRED realtime');

    wsClient.close();
    console.log('');

    // ─── TỔNG KẾT ───────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ:`);
    console.log(`   ✅ Số test case ĐẠT: ${passedCount}`);
    console.log(`   ❌ Số test case LỖI: ${failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failedCount === 0) {
      console.log('🎉 TẤT CẢ TÍNH NĂNG KIỂM TRA PHÒNG REALTIME HOẠT ĐỘNG HOÀN HẢO!');
    } else {
      console.error('⚠️ CÓ TEST CASE BỊ LỖI, VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT Ở TRÊN.');
    }

    if (testServer) {
      testServer.close();
    }

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Lỗi nghiêm trọng trong runner test:', err);
    if (testServer) testServer.close();
    process.exit(1);
  }
}

runFullTestSuite();
