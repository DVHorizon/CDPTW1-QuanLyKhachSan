'use strict';

/**
 * test_feat_guest_08_deposit_payment.js
 * Test suite for FEAT-GUEST-08: Thanh toán tiền cọc / trả trước qua cổng thanh toán (Online Deposit Payment Integration)
 */

const { sequelize, RoomType, Booking, BookingGuest, Payment } = require('../src/models');
const onlineDepositPaymentController = require('../src/controllers/onlineDepositPaymentController');

// Mock response object
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
  console.log('🧪 BẮT ĐẦU TEST BỘ TÍNH NĂNG 8: ONLINE DEPOSIT PAYMENT (FEAT-GUEST-08)');
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

    // Helper to create a fresh test booking
    async function createTestBooking(customAttrs = {}) {
      const b = await Booking.create({
        UserId: 1,
        RoomTypeId: testRoomTypeId,
        CheckInDate: '2027-08-01',
        CheckOutDate: '2027-08-04',
        NumberOfNights: 3,
        Adults: 2,
        Children: 0,
        RoomQuantity: 1,
        RoomSubtotal: 20000000,
        TotalAmount: 20000000,
        DepositAmount: 0,
        Status: 'Pending',
        BookingSource: 'DirectWeb',
        ConfirmationCode: 'GH-TEST-' + Math.floor(100000 + Math.random() * 900000),
        ...customAttrs
      });
      createdBookingIds.push(b.BookingId);
      return b;
    }

    // ─── TEST CASE 01: Thanh toán thẻ sai số Luhn (TC01) ─────────────
    console.log('--- TC01: Kiểm tra số thẻ không hợp lệ (sai định dạng Luhn) ---');
    {
      const booking = await createTestBooking();
      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_20',
          paymentMethod: 'CREDIT_CARD',
          cardholderName: 'NGUYEN VAN AN',
          cardNumber: '4123456789012344', // Invalid Luhn checksum
          expiryDate: '12/28',
          cvvCode: '123'
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('TC01 Status is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC01 Error code is ERROR_0030_INVALID_CARD_NUMBER', res.body?.code === 'ERROR_0030_INVALID_CARD_NUMBER', `got ${res.body?.code}`);
      assert('TC01 Message matches exact spec', res.body?.message === 'Số thẻ thanh toán không hợp lệ (sai định dạng Luhn)', `got "${res.body?.message}"`);
    }

    // ─── TEST CASE: Thẻ hết hạn (ERROR_0031_CARD_EXPIRED) ─────────────
    console.log('\n--- Kiểm tra thẻ hết hạn sử dụng ---');
    {
      const booking = await createTestBooking();
      // Valid Luhn card: 4111111111111111
      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_20',
          paymentMethod: 'CREDIT_CARD',
          cardholderName: 'NGUYEN VAN AN',
          cardNumber: '4111111111111111',
          expiryDate: '01/20', // Expired year
          cvvCode: '123'
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('Card expired status is 400', res.statusCode === 400);
      assert('Card expired code is ERROR_0031_CARD_EXPIRED', res.body?.code === 'ERROR_0031_CARD_EXPIRED');
      assert('Card expired message matches exact spec', res.body?.message === 'Thẻ thanh toán đã hết hạn sử dụng');
    }

    // ─── TEST CASE: Từ chối thanh toán (ERROR_0032_PAYMENT_DECLINED) ──
    console.log('\n--- Kiểm tra giao dịch bị từ chối bởi ngân hàng phát hành thẻ ---');
    {
      const booking = await createTestBooking();
      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_20',
          paymentMethod: 'CREDIT_CARD',
          cardholderName: 'NGUYEN VAN AN',
          cardNumber: '4111111111111111',
          expiryDate: '12/28',
          cvvCode: '000' // Simulated bank decline
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('Declined status is 400', res.statusCode === 400);
      assert('Declined code is ERROR_0032_PAYMENT_DECLINED', res.body?.code === 'ERROR_0032_PAYMENT_DECLINED');
      assert('Declined message matches exact spec', res.body?.message === 'Giao dịch bị từ chối bởi ngân hàng phát hành thẻ. Vui lòng thử phương thức khác');
    }

    // ─── TEST CASE: Hết phiên giữ phòng 15 phút (ERROR_0033_SESSION_EXPIRED) ─
    console.log('\n--- Kiểm tra phiên giữ phòng hết hạn sau 15 phút ---');
    {
      // Create a booking with CreatedAt 20 minutes ago
      const expiredTime = new Date(Date.now() - 20 * 60 * 1000);
      const booking = await createTestBooking({ CreatedAt: expiredTime });

      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_20',
          paymentMethod: 'CREDIT_CARD',
          cardholderName: 'NGUYEN VAN AN',
          cardNumber: '4111111111111111',
          expiryDate: '12/28',
          cvvCode: '123'
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('Expired session status is 400', res.statusCode === 400);
      assert('Expired session code is ERROR_0033_SESSION_EXPIRED', res.body?.code === 'ERROR_0033_SESSION_EXPIRED');
      assert('Expired session message matches exact spec', res.body?.message === 'Phiên giữ phòng đã hết thời gian 15 phút. Vui lòng thực hiện đặt lại phòng');
    }

    // ─── TEST CASE 02: Thanh toán cọc 20% thành công qua Thẻ (TC02) ──
    console.log('\n--- TC02: Thanh toán cọc 20% thành công qua Thẻ hợp lệ (Happy Case) ---');
    {
      const booking = await createTestBooking({ TotalAmount: 20000000 });
      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_20',
          paymentMethod: 'CREDIT_CARD',
          cardholderName: 'NGUYEN VAN AN',
          cardNumber: '4111111111111111', // Valid Luhn
          expiryDate: '12/28',
          cvvCode: '123'
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('TC02 Status is 200', res.statusCode === 200, `got ${res.statusCode}: ${JSON.stringify(res.body)}`);
      assert('TC02 Success is true', res.body?.success === true);
      assert('TC02 Booking status updated to Confirmed', res.body?.data?.bookingStatus === 'Confirmed');
      assert('TC02 Amount paid is 20% of 20.000.000 (4.000.000đ)', res.body?.data?.amountPaid === 4000000, `got ${res.body?.data?.amountPaid}`);
      assert('TC02 Remaining balance is 16.000.000đ', res.body?.data?.remainingBalance === 16000000, `got ${res.body?.data?.remainingBalance}`);
      assert('TC02 Returns transactionCode', Boolean(res.body?.data?.transactionCode));

      // Check DB
      const updated = await Booking.findByPk(booking.BookingId);
      assert('TC02 Booking DB Status is Confirmed', updated.Status === 'Confirmed');
      assert('TC02 Booking DB DepositAmount is 4.000.000', parseFloat(updated.DepositAmount) === 4000000);

      const payment = await Payment.findOne({ where: { BookingId: booking.BookingId } });
      assert('TC02 Payment record created in DB', Boolean(payment));
      assert('TC02 Payment record status is Completed', payment?.Status === 'Completed');
    }

    // ─── TEST CASE: Thanh toán cọc 50% qua VietQR (BANK_TRANSFER) ────
    console.log('\n--- Thanh toán cọc 50% qua VietQR (Chuyển khoản) ---');
    {
      const booking = await createTestBooking({ TotalAmount: 20000000 });
      const req = {
        params: { bookingId: booking.BookingId },
        body: {
          depositOption: 'DEPOSIT_50',
          paymentMethod: 'BANK_TRANSFER'
        }
      };
      const res = createMockRes();
      await onlineDepositPaymentController.processDepositPayment(req, res);

      assert('VietQR Status is 200', res.statusCode === 200);
      assert('VietQR Amount paid is 50% (10.000.000đ)', res.body?.data?.amountPaid === 10000000);
      assert('VietQR Booking status is Confirmed', res.body?.data?.bookingStatus === 'Confirmed');
    }

    // ─── TEST CASE: Lấy thông tin Booking cho Màn hình 7 ─────────────
    console.log('\n--- GET /bookings/:id Lấy thông tin booking render Màn hình 7 ---');
    {
      const booking = await createTestBooking();
      const req = { params: { id: booking.BookingId } };
      const res = createMockRes();
      await onlineDepositPaymentController.getBookingDetails(req, res);

      assert('Get details status is 200', res.statusCode === 200);
      assert('Returns correct bookingId', res.body?.data?.bookingId === booking.BookingId);
      assert('Returns timeoutSeconds <= 900', res.body?.data?.timeoutSeconds <= 900 && res.body?.data?.timeoutSeconds > 0);
      assert('isExpired is false', res.body?.data?.isExpired === false);
    }

    // Cleanup
    for (const bId of createdBookingIds) {
      await Payment.destroy({ where: { BookingId: bId } });
      await Booking.destroy({ where: { BookingId: bId } });
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
    console.log('================================================================\n');
    await sequelize.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
