'use strict';

/**
 * tests/test_feat_guest_10_qr_email_confirmation.js
 * Test suite for FEAT-GUEST-10 (A10):
 * Tạo và gửi mã QR Booking / Xác nhận đặt phòng qua Email
 */

const assert = require('assert');
const { Booking, BookingGuest, RoomType, User } = require('../src/models');
const { generateBookingQRCode, sendBookingConfirmationEmail } = require('../src/services/qrEmailService');
const bookingQrNotificationController = require('../src/controllers/bookingQrNotificationController');

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
  console.log('🚀 BẮT ĐẦU TEST TÍNH NĂNG 10: TẠO QR & GỬI EMAIL XÁC NHẬN (FEAT-GUEST-10)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${desc}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ [FAIL] ${desc}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Kiểm tra khởi tạo mã QR Base64
  await test('TC01: Sinh mã QR Base64 độc bản chuẩn Contactless Pass', async () => {
    const testPayload = {
      bookingId: 999,
      confirmationCode: 'GH-TEST-999',
      checkInDate: '2026-11-15',
      checkOutDate: '2026-11-18'
    };

    const qrBase64 = await generateBookingQRCode(testPayload);
    assert.ok(qrBase64, 'QR Base64 không được rỗng');
    assert.ok(qrBase64.startsWith('data:image/png;base64,'), 'QR phải có format Data URL PNG Base64');
  });

  // 2. Kiểm tra Controller GET /bookings/:bookingId/qr-code
  await test('TC02: API GET /api/v1/bookings/:bookingId/qr-code trả về SUCCESS_0006_QR_READY', async () => {
    // Tìm 1 booking có sẵn trong DB
    let booking = await Booking.findOne();
    if (!booking) {
      console.log('     (Tạo booking giả lập để test)');
      booking = await Booking.create({
        UserId: 1,
        RoomTypeId: 1,
        CheckInDate: '2026-12-01',
        CheckOutDate: '2026-12-03',
        Status: 'Confirmed',
        ConfirmationCode: 'GH-TEST-001',
        TotalAmount: 5000000,
        DepositAmount: 2500000
      });
    }

    const req = { params: { bookingId: booking.BookingId } };
    const res = createMockRes();

    await bookingQrNotificationController.getBookingQRCode(req, res);

    assert.strictEqual(res.statusCode, 200, 'Status code phải là 200');
    assert.strictEqual(res.body.success, true, 'Phản hồi phải thành công');
    assert.strictEqual(res.body.code, 'SUCCESS_0006_QR_READY', 'Mã code phản hồi phải là SUCCESS_0006_QR_READY');
    assert.strictEqual(res.body.message, 'Mã QR Check-in điện tử đã sẵn sàng', 'Message chuẩn nguyên văn');
    assert.ok(res.body.data.qrCodeUrl, 'qrCodeUrl phải tồn tại');
  });

  // 3. Kiểm tra Controller xử lý mã booking không tồn tại -> lỗi ERROR_0038_QR_GENERATION_FAILED
  await test('TC03: API GET /bookings/:bookingId/qr-code với bookingId không tồn tại trả về lỗi chuẩn', async () => {
    const req = { params: { bookingId: 999999999 } };
    const res = createMockRes();

    await bookingQrNotificationController.getBookingQRCode(req, res);

    assert.strictEqual(res.statusCode, 404, 'Status code phải là 404');
    assert.strictEqual(res.body.code, 'ERROR_0038_QR_GENERATION_FAILED', 'Mã code phải là ERROR_0038_QR_GENERATION_FAILED');
  });

  // 4. Kiểm tra Service gửi email xác nhận đặt phòng
  await test('TC04: Gửi email xác nhận đặt phòng HTML với Nodemailer', async () => {
    const booking = await Booking.findOne();
    assert.ok(booking, 'Phải có booking để test gửi email');

    const result = await sendBookingConfirmationEmail(booking.BookingId, 'test.guest@horizon.vn');
    assert.strictEqual(result.success, true, 'Gửi mail phải trả về success: true');
    assert.strictEqual(result.recipientEmail, 'test.guest@horizon.vn', 'Đúng email người nhận');
    assert.ok(result.qrCodeUrl, 'Kết quả gửi mail phải bao gồm mã QR đính kèm');

    // Kiểm tra DB đã cập nhật ConfirmationSentAt
    const updated = await Booking.findByPk(booking.BookingId);
    assert.ok(updated.ConfirmationSentAt, 'ConfirmationSentAt phải được lưu thời gian gửi');
  });

  // 5. Kiểm tra API POST /api/v1/notifications/email-confirmation
  await test('TC05: Endpoint POST /api/v1/notifications/email-confirmation', async () => {
    const booking = await Booking.findOne();
    const req = {
      body: {
        bookingId: booking.BookingId,
        recipientEmail: 'custom.recipient@example.com'
      }
    };
    const res = createMockRes();

    await bookingQrNotificationController.sendEmailConfirmation(req, res);

    assert.strictEqual(res.statusCode, 200, 'Status code phải là 200');
    assert.strictEqual(res.body.success, true, 'Phản hồi gửi mail thành công');
    assert.strictEqual(res.body.data.recipientEmail, 'custom.recipient@example.com');
  });

  console.log('\n================================================================');
  console.log(`🎉 HOÀN THÀNH TEST FEAT-GUEST-10: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

