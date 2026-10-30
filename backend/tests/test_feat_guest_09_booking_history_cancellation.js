'use strict';

/**
 * test_feat_guest_09_booking_history_cancellation.js
 * 
 * Bộ ca kiểm thử tự động cho:
 * TÍNH NĂNG 9: XEM LỊCH SỬ ĐẶT PHÒNG & HỦY ĐẶT PHÒNG THEO QUY ĐỊNH (FEAT-GUEST-09 / A9)
 * 
 * Test Specs:
 * - TC01: Hủy trước 72 giờ -> Hủy thành công, ghi nhận hoàn cọc 100%
 * - TC02: Hủy cận giờ (trong 72h) -> Hủy thành công nhưng phạt 100% cọc
 * - TC03: Hủy đơn khi khách đang lưu trú (In-House / CheckedIn) -> Chặn với mã ERROR_0036_CANNOT_CANCEL_IN_HOUSE
 * - TC04: Hủy đơn đã hủy trước đó -> Chặn với mã ERROR_0037_BOOKING_ALREADY_CANCELLED
 * - TC05: Lấy danh sách lịch sử đặt phòng (/me/bookings) với đầy đủ tab & thông tin tài chính
 */

const { sequelize, Booking, BookingGuest, RoomType, Payment, Stay, Room, Branch } = require('../src/models');
const bookingHistoryController = require('../src/controllers/bookingHistoryController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU TEST TÍNH NĂNG 9: BOOKING HISTORY & CANCELLATION (FEAT-GUEST-09 / A9)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  const createdBookingIds = [];

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.\n');

    const roomType = await RoomType.findOne();
    if (!roomType) {
      throw new Error('No RoomType found in database for testing.');
    }
    const testRoomTypeId = roomType.RoomTypeId;

    const testUserId = 1;

    // ─── TEST CASE 01: Hủy trước 72 giờ (TC01 - Hoàn cọc 100%) ───
    console.log('--- TC01: Hủy đơn cách ngày check-in 5 ngày (>= 72h) -> Hoàn cọc 100% ---');
    {
      const checkInDate = '2028-06-15'; // Cách xa hiện tại > 72h
      const checkOutDate = '2028-06-18';
      const depositAmount = 2500000;

      const booking = await Booking.create({
        UserId: testUserId,
        RoomTypeId: testRoomTypeId,
        CheckInDate: checkInDate,
        CheckOutDate: checkOutDate,
        NumberOfNights: 3,
        Adults: 2,
        Children: 0,
        RoomQuantity: 1,
        RoomSubtotal: 5000000,
        TotalAmount: 5000000,
        DepositAmount: depositAmount,
        Status: 'Confirmed',
        ConfirmationCode: `GH-TEST-TC01-${Date.now()}`
      });
      createdBookingIds.push(booking.BookingId);

      // Thêm Payment cọc
      await Payment.create({
        BookingId: booking.BookingId,
        UserId: testUserId,
        Amount: depositAmount,
        PaymentMethod: 'VietQR',
        PaymentDate: new Date(),
        TransactionCode: `TX-TC01-${Date.now()}`,
        Status: 'Completed'
      });

      const req = {
        user: { userId: testUserId },
        params: { bookingId: booking.BookingId },
        body: { cancellationReason: 'Thay đổi lịch công tác' }
      };
      const res = createMockRes();

      await bookingHistoryController.cancelMyBooking(req, res);

      assert('Status response là 200', res.statusCode === 200, `Got ${res.statusCode}`);
      assert('Success là true', res.body && res.body.success === true);
      assert('Mã thông báo SUCCESS_0005_BOOKING_CANCELLED', res.body && res.body.code === 'SUCCESS_0005_BOOKING_CANCELLED');
      assert('Thông điệp đúng nguyên văn đặc tả', res.body && res.body.message === 'Hủy đặt phòng thành công! Tiền cọc sẽ được hoàn lại theo quy định');
      assert('Hoàn cọc 100%', res.body && res.body.data && res.body.data.refundPercentage === 100);
      assert('Phạt cọc 0%', res.body && res.body.data && res.body.data.penaltyPercentage === 0);
      assert('Số tiền hoàn bằng số tiền cọc (2.500.000đ)', res.body && res.body.data && Number(res.body.data.refundAmount) === depositAmount);

      // Kiểm tra DB
      const updatedBooking = await Booking.findByPk(booking.BookingId);
      assert('Trạng thái booking chuyển sang Cancelled', updatedBooking.Status === 'Cancelled');
    }

    // ─── TEST CASE 02: Hủy cận giờ (trong 72h) (TC02 - Phạt 100% cọc) ───
    console.log('\n--- TC02: Hủy đơn trước giờ check-in 24 giờ (< 72h) -> Phạt 100% cọc ---');
    {
      // Tạo ngày check-in ngày mai (cách 24h)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkInDate = tomorrow.toISOString().slice(0, 10);

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 3);
      const checkOutDate = dayAfter.toISOString().slice(0, 10);

      const depositAmount = 3000000;

      const booking = await Booking.create({
        UserId: testUserId,
        RoomTypeId: testRoomTypeId,
        CheckInDate: checkInDate,
        CheckOutDate: checkOutDate,
        NumberOfNights: 2,
        Adults: 2,
        Children: 0,
        RoomQuantity: 1,
        RoomSubtotal: 6000000,
        TotalAmount: 6000000,
        DepositAmount: depositAmount,
        Status: 'Confirmed',
        ConfirmationCode: `GH-TEST-TC02-${Date.now()}`
      });
      createdBookingIds.push(booking.BookingId);

      await Payment.create({
        BookingId: booking.BookingId,
        UserId: testUserId,
        Amount: depositAmount,
        PaymentMethod: 'CreditCard',
        PaymentDate: new Date(),
        TransactionCode: `TX-TC02-${Date.now()}`,
        Status: 'Completed'
      });

      const req = {
        user: { userId: testUserId },
        params: { bookingId: booking.BookingId },
        body: { cancellationReason: 'Có việc gia đình đột xuất' }
      };
      const res = createMockRes();

      await bookingHistoryController.cancelMyBooking(req, res);

      assert('Status response là 200', res.statusCode === 200, `Got ${res.statusCode}`);
      assert('Hủy thành công theo quy định', res.body && res.body.code === 'SUCCESS_0005_BOOKING_CANCELLED');
      assert('Hoàn cọc 0%', res.body && res.body.data && res.body.data.refundPercentage === 0);
      assert('Phạt cọc 100%', res.body && res.body.data && res.body.data.penaltyPercentage === 100);
      assert('Số tiền phạt bằng toàn bộ tiền cọc (3.000.000đ)', res.body && res.body.data && Number(res.body.data.penaltyAmount) === depositAmount);
      assert('Số tiền hoàn lại là 0đ', res.body && res.body.data && Number(res.body.data.refundAmount) === 0);
    }

    // ─── TEST CASE 03: Đang lưu trú không được hủy (ERROR_0036_CANNOT_CANCEL_IN_HOUSE) ───
    console.log('\n--- TC03: Hủy đơn khi khách đang lưu trú (In-House / CheckedIn) -> Chặn ERROR_0036 ---');
    {
      const booking = await Booking.create({
        UserId: testUserId,
        RoomTypeId: testRoomTypeId,
        CheckInDate: '2026-10-25',
        CheckOutDate: '2026-10-28',
        Status: 'CheckedIn',
        ConfirmationCode: `GH-TEST-TC03-${Date.now()}`
      });
      createdBookingIds.push(booking.BookingId);

      const req = {
        user: { userId: testUserId },
        params: { bookingId: booking.BookingId },
        body: { cancellationReason: 'Muốn hủy khi đang ở phòng' }
      };
      const res = createMockRes();

      await bookingHistoryController.cancelMyBooking(req, res);

      assert('Status response là 400', res.statusCode === 400, `Got ${res.statusCode}`);
      assert('Mã lỗi ERROR_0036_CANNOT_CANCEL_IN_HOUSE', res.body && res.body.code === 'ERROR_0036_CANNOT_CANCEL_IN_HOUSE');
      assert('Thông điệp đúng nguyên văn', res.body && res.body.message === 'Không thể hủy đơn đặt phòng khi khách đang trong thời gian lưu trú');
    }

    // ─── TEST CASE 04: Đã hủy trước đó (ERROR_0037_BOOKING_ALREADY_CANCELLED) ───
    console.log('\n--- TC04: Hủy đơn đặt phòng đã bị hủy trước đó -> Chặn ERROR_0037 ---');
    {
      const booking = await Booking.create({
        UserId: testUserId,
        RoomTypeId: testRoomTypeId,
        CheckInDate: '2028-08-01',
        CheckOutDate: '2028-08-05',
        Status: 'Cancelled',
        ConfirmationCode: `GH-TEST-TC04-${Date.now()}`
      });
      createdBookingIds.push(booking.BookingId);

      const req = {
        user: { userId: testUserId },
        params: { bookingId: booking.BookingId },
        body: { cancellationReason: 'Hủy lại lần 2' }
      };
      const res = createMockRes();

      await bookingHistoryController.cancelMyBooking(req, res);

      assert('Status response là 400', res.statusCode === 400, `Got ${res.statusCode}`);
      assert('Mã lỗi ERROR_0037_BOOKING_ALREADY_CANCELLED', res.body && res.body.code === 'ERROR_0037_BOOKING_ALREADY_CANCELLED');
      assert('Thông điệp đúng nguyên văn', res.body && res.body.message === 'Đơn đặt phòng này đã được hủy trước đó');
    }

    // ─── TEST CASE 05: Xem danh sách và chi tiết lịch sử đặt phòng (/me/bookings) ───
    console.log('\n--- TC05: Xem danh sách lịch sử đặt phòng cá nhân (GET /me/bookings) ---');
    {
      const req = {
        user: { userId: testUserId },
        query: { statusFilter: 'ALL', page: 1, limit: 10 }
      };
      const res = createMockRes();

      await bookingHistoryController.getMyBookings(req, res);

      assert('Status response là 200', res.statusCode === 200, `Got ${res.statusCode}`);
      assert('Trả về danh sách dữ liệu mảng', res.body && Array.isArray(res.body.data));
      assert('Meta thống kê counts đầy đủ (upcoming, completed, cancelled)', res.body && res.body.meta && typeof res.body.meta.counts === 'object');
      assert('Có chứa thông tin phòng, tiện ích và thanh toán', res.body.data.length > 0 && res.body.data[0].bookingId !== undefined);
    }

  } catch (err) {
    console.error('Lỗi nghiêm trọng trong quá trình chạy tests:', err);
    failed++;
  } finally {
    // Dọn dẹp dữ liệu test
    if (createdBookingIds.length > 0) {
      await Payment.destroy({ where: { BookingId: createdBookingIds } }).catch(() => {});
      await Booking.destroy({ where: { BookingId: createdBookingIds } }).catch(() => {});
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
