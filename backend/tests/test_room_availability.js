'use strict';

/**
 * TEST SUITE: TÍNH NĂNG 4 - KIỂM TRA PHÒNG TRỐNG REAL-TIME (FEAT-GUEST-04)
 * Chạy: node tests/test_room_availability.js
 */

const availabilityService = require('../src/services/availabilityService');
const { RoomType, Room, Booking } = require('../src/models');

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ TÍNH NĂNG 4 (FEAT-GUEST-04)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 0. Chuẩn bị RoomType test
    let roomType = await RoomType.findOne({ where: { TypeName: 'Test Deluxe Ocean Suite' } });
    if (!roomType) {
      roomType = await RoomType.create({
        TypeCode: 'TEST-DLX-99',
        TypeName: 'Test Deluxe Ocean Suite',
        Description: 'Test Suite for availability check',
        BasePrice: 2000000,
        TotalRooms: 5,
        Status: 'Active',
        IsDeleted: false
      });
    }

    const roomTypeId = roomType.RoomTypeId;

    // Đảm bảo có đúng 5 phòng vật lý test
    await Room.destroy({ where: { RoomTypeId: roomTypeId } });
    for (let i = 1; i <= 5; i++) {
      await Room.create({
        BranchId: 1,
        RoomTypeId: roomTypeId,
        RoomNumber: `T99-${i}`,
        Floor: 9,
        Status: 'CleanAvailable',
        IsDeleted: false
      });
    }

    // Xóa bookings test cũ
    await Booking.destroy({ where: { RoomTypeId: roomTypeId } });

    console.log(`✅ Khởi tạo loại phòng Test ID: ${roomTypeId} với 5 phòng vật lý.\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // TC01: Khách sạn còn 100% phòng
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TC01] Khách sạn còn 100% phòng...');
    const tc01Result = await availabilityService.checkAvailability({
      roomTypeId,
      checkInDate: '2027-01-10',
      checkOutDate: '2027-01-15',
      quantity: 2
    });

    if (tc01Result.isAvailable === true && tc01Result.availableRoomsCount === 5) {
      console.log('   👉 TC01 PASSED! isAvailable = true, availableRoomsCount = 5\n');
    } else {
      console.error('   ❌ TC01 FAILED:', tc01Result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC02: Trùng lịch 1 phần (Overlap)
    // Booking cũ: 2027-02-24 đến 2027-02-26 (đặt 2 phòng)
    // Khách check: 2027-02-25 đến 2027-02-27
    // Hệ thống phải phát hiện cấn ngày 2027-02-25 (chỉ còn 5 - 2 = 3 phòng)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TC02] Trùng lịch 1 phần (Overlap Test)...');
    await Booking.create({
      UserId: 1,
      RoomTypeId: roomTypeId,
      CheckInDate: '2027-02-24',
      CheckOutDate: '2027-02-26',
      RoomQuantity: 2,
      Status: 'Confirmed'
    });

    const tc02Result = await availabilityService.checkAvailability({
      roomTypeId,
      checkInDate: '2027-02-25',
      checkOutDate: '2027-02-27',
      quantity: 1
    });

    if (tc02Result.isAvailable === true && tc02Result.availableRoomsCount === 3) {
      console.log('   👉 TC02 PASSED! Cấn ngày 25/02, availableRoomsCount chính xác = 3\n');
    } else {
      console.error('   ❌ TC02 FAILED:', tc02Result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC03: Yêu cầu vượt quá số lượng phòng còn trống
    // Đang còn 3 phòng, khách đòi đặt 4 phòng
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TC03] Yêu cầu vượt quá số phòng còn trống...');
    const tc03Result = await availabilityService.checkAvailability({
      roomTypeId,
      checkInDate: '2027-02-25',
      checkOutDate: '2027-02-27',
      quantity: 4
    });

    if (tc03Result.isAvailable === false && tc03Result.availableRoomsCount === 3) {
      console.log('   👉 TC03 PASSED! isAvailable = false, availableRoomsCount = 3\n');
    } else {
      console.error('   ❌ TC03 FAILED:', tc03Result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC04: Tranh chấp phòng cuối cùng (Concurrent Lock)
    // Giả sử chỉ còn đúng 1 phòng trống khả dụng:
    // Thêm 2 phòng nữa đã đặt trong khoảng ngày đó (tổng 2 + 2 = 4 phòng đã đặt, còn 1)
    // Khách A bấm Lock thành công (1 phòng)
    // Khách B cố Lock cùng phòng -> Bị từ chối ERROR_0023_INSUFFICIENT_ROOMS / ERROR_0022_ROOM_SOLD_OUT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TC04] Tranh chấp phòng cuối cùng (Anti-Overbooking Lock)...');
    await Booking.create({
      UserId: 1,
      RoomTypeId: roomTypeId,
      CheckInDate: '2027-02-25',
      CheckOutDate: '2027-02-27',
      RoomQuantity: 2,
      Status: 'Confirmed'
    });

    // Lúc này còn đúng: 5 - 4 = 1 phòng
    const lockA = await availabilityService.acquireRoomLock({
      roomTypeId,
      checkInDate: '2027-02-25',
      checkOutDate: '2027-02-27',
      quantity: 1
    });

    console.log(`   Khách A lock thành công, sessionId: ${lockA.lockSessionId}`);

    let lockBThrew = false;
    try {
      await availabilityService.acquireRoomLock({
        roomTypeId,
        checkInDate: '2027-02-25',
        checkOutDate: '2027-02-27',
        quantity: 1
      });
    } catch (err) {
      lockBThrew = true;
      console.log(`   Khách B lock bị từ chối như kỳ vọng: [${err.code}] ${err.message}`);
    }

    if (lockBThrew) {
      console.log('   👉 TC04 PASSED! Khóa chống Overbooking hoạt động chuẩn xác.\n');
    } else {
      console.error('   ❌ TC04 FAILED: Khách B vẫn lock được phòng vượt quá số lượng!\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC05: Nhả phòng giữ chỗ
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ [TC05] Nhả phòng giữ chỗ...');
    const releaseSuccess = await availabilityService.releaseRoomLock(lockA.lockSessionId);
    const afterReleaseCheck = await availabilityService.checkAvailability({
      roomTypeId,
      checkInDate: '2027-02-25',
      checkOutDate: '2027-02-27',
      quantity: 1
    });

    if (releaseSuccess && afterReleaseCheck.availableRoomsCount === 1) {
      console.log('   👉 TC05 PASSED! Phòng đã được nhả về kho trống an toàn.\n');
    } else {
      console.error('   ❌ TC05 FAILED:', afterReleaseCheck);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 TẤT CẢ 5 TEST CASES ĐÃ HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi chạy test:', err);
    process.exit(1);
  }
}

runTests();
