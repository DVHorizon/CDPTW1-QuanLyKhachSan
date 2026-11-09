'use strict';

/**
 * test_feat_guest_07_voucher_redemption.js
 * Test suite for FEAT-GUEST-07: Áp dụng mã giảm giá và voucher khuyến mãi (Promotion & Voucher Redemption)
 * Mã tính năng: FEAT-GUEST-07 | Mã truy vết Bảng 3: A7
 * Màn hình liên quan: Màn hình 6 (Booking Summary) & Màn hình 7 (Payment)
 */

const { sequelize, Voucher, Booking, RoomType, User } = require('../src/models');
const voucherController = require('../src/controllers/voucherController');
const bookingEngineController = require('../src/controllers/bookingEngineController');

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
  console.log('🧪 BẮT ĐẦU TEST BỘ TÍNH NĂNG 7: ÁP DỤNG MÃ GIẢM GIÁ & VOUCHER');
  console.log('   (FEAT-GUEST-07 / A7 / POST /bookings/apply-voucher & :bookingId/apply-voucher)');
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

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.\n');

    // Chuẩn bị dữ liệu mẫu chuẩn cho các test case
    await Voucher.upsert({
      Code: 'SUMMER20',
      DiscountType: 'Percent',
      DiscountValue: 20.00,
      MinOrderAmount: 0.00,
      MaxDiscountAmount: 2000000.00,
      StartDate: new Date('2026-01-01'),
      EndDate: new Date('2027-12-31'),
      UsageLimit: 1000,
      UsedCount: 0,
      Status: 'Active',
      IsDeleted: 0
    });

    await Voucher.upsert({
      Code: 'HORIZON500',
      DiscountType: 'FixedAmount',
      DiscountValue: 500000.00,
      MinOrderAmount: 2000000.00,
      MaxDiscountAmount: null,
      StartDate: new Date('2026-01-01'),
      EndDate: new Date('2027-12-31'),
      UsageLimit: 500,
      UsedCount: 0,
      Status: 'Active',
      IsDeleted: 0
    });

    await Voucher.upsert({
      Code: 'EXPIRED2025',
      DiscountType: 'Percent',
      DiscountValue: 15.00,
      MinOrderAmount: 0.00,
      StartDate: new Date('2025-01-01'),
      EndDate: new Date('2025-12-31'),
      UsageLimit: 100,
      UsedCount: 0,
      Status: 'Active',
      IsDeleted: 0
    });

    await Voucher.upsert({
      Code: 'SOLDOUT100',
      DiscountType: 'Percent',
      DiscountValue: 10.00,
      MinOrderAmount: 0.00,
      StartDate: new Date('2026-01-01'),
      EndDate: new Date('2027-12-31'),
      UsageLimit: 10,
      UsedCount: 10,
      Status: 'Active',
      IsDeleted: 0
    });

    await Voucher.upsert({
      Code: 'MIN5TRIEU',
      DiscountType: 'Percent',
      DiscountValue: 25.00,
      MinOrderAmount: 5000000.00,
      StartDate: new Date('2026-01-01'),
      EndDate: new Date('2027-12-31'),
      UsageLimit: 100,
      UsedCount: 0,
      Status: 'Active',
      IsDeleted: 0
    });

    // ─── TEST CASE 01: Mã không tồn tại / nhập sai (TC01) ────────────
    console.log('--- TC01: Mã sai hoặc không tồn tại (code="SAI123") ---');
    {
      const req = {
        body: {
          voucherCode: 'SAI123',
          bookingTotal: 2500000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC01 Status code is 404', res.statusCode === 404, `got ${res.statusCode}`);
      assert('TC01 Code là ERROR_0026_VOUCHER_NOT_FOUND', res.body?.code === 'ERROR_0026_VOUCHER_NOT_FOUND', `got ${res.body?.code}`);
      assert('TC01 Message nguyên văn chuẩn đặc tả', res.body?.message === 'Mã giảm giá không tồn tại hoặc đã nhập sai', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 02: Áp dụng voucher hợp lệ SUMMER20 (TC02 - Happy Case) ───
    console.log('\n--- TC02: Áp dụng voucher hợp lệ SUMMER20 (Giảm 20%) ---');
    {
      const req = {
        body: {
          voucherCode: 'summer20', // Test tự động chuyển UPPERCASE
          bookingTotal: 2000000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC02 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC02 Code là SUCCESS_0002_VOUCHER_APPLIED', res.body?.code === 'SUCCESS_0002_VOUCHER_APPLIED', `got ${res.body?.code}`);
      assert('TC02 Message thành công chứa mức giảm 20%', res.body?.message === 'Áp dụng mã giảm giá thành công! Quý khách được giảm 20%', `got ${res.body?.message}`);
      assert('TC02 Số tiền giảm 20% của 2,000,000 là 400,000', res.body?.data?.discountAmount === 400000, `got ${res.body?.data?.discountAmount}`);
      assert('TC02 Tổng tiền mới là 1,600,000', res.body?.data?.newBookingTotal === 1600000, `got ${res.body?.data?.newBookingTotal}`);
    }

    // ─── TEST CASE 03: Mã giảm giá đã hết hạn sử dụng ─────────────────
    console.log('\n--- TC03: Mã hết hạn sử dụng (code="EXPIRED2025") ---');
    {
      const req = {
        body: {
          voucherCode: 'EXPIRED2025',
          bookingTotal: 3000000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC03 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC03 Code là ERROR_0027_VOUCHER_EXPIRED', res.body?.code === 'ERROR_0027_VOUCHER_EXPIRED', `got ${res.body?.code}`);
      assert('TC03 Message nguyên văn chuẩn đặc tả', res.body?.message === 'Mã giảm giá đã hết hạn sử dụng', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 04: Mã khuyến mãi đã hết lượt sử dụng ─────────────
    console.log('\n--- TC04: Mã hết lượt sử dụng (code="SOLDOUT100") ---');
    {
      const req = {
        body: {
          voucherCode: 'SOLDOUT100',
          bookingTotal: 3000000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC04 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC04 Code là ERROR_0028_VOUCHER_LIMIT_REACHED', res.body?.code === 'ERROR_0028_VOUCHER_LIMIT_REACHED', `got ${res.body?.code}`);
      assert('TC04 Message nguyên văn chuẩn đặc tả', res.body?.message === 'Mã khuyến mãi đã hết lượt sử dụng', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 05: Đơn đặt phòng chưa đạt giá trị tối thiểu ───────
    console.log('\n--- TC05: Chưa đạt giá trị tối thiểu (code="MIN5TRIEU", tổng đơn 3 triệu < 5 triệu) ---');
    {
      const req = {
        body: {
          voucherCode: 'MIN5TRIEU',
          bookingTotal: 3000000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC05 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC05 Code là ERROR_0029_VOUCHER_MIN_NOT_MET', res.body?.code === 'ERROR_0029_VOUCHER_MIN_NOT_MET', `got ${res.body?.code}`);
      assert('TC05 Message nguyên văn chuẩn đặc tả', res.body?.message === 'Đơn đặt phòng chưa đạt giá trị tối thiểu để áp dụng mã này', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 06: Voucher tiền cố định HORIZON500 ────────────────
    console.log('\n--- TC06: Voucher tiền cố định HORIZON500 (Giảm 500,000đ khi đơn >= 2 triệu) ---');
    {
      const req = {
        body: {
          voucherCode: 'HORIZON500',
          bookingTotal: 2500000
        }
      };
      const res = createMockRes();
      await voucherController.validateVoucher(req, res);

      assert('TC06 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC06 Giảm 500,000đ', res.body?.data?.discountAmount === 500000, `got ${res.body?.data?.discountAmount}`);
      assert('TC06 Tổng mới là 2,000,000đ', res.body?.data?.newBookingTotal === 2000000, `got ${res.body?.data?.newBookingTotal}`);
    }

    // ─── TEST CASE 07: Áp dụng vào Booking thật qua POST /bookings/:id/apply-voucher ───
    console.log('\n--- TC07: Áp dụng Voucher vào Booking thật qua POST /bookings/:id/apply-voucher ---');
    {
      // Tạo booking tạm ở trạng thái Pending
      const testBooking = await Booking.create({
        UserId: 1,
        RoomTypeId: 1,
        CheckInDate: '2027-07-01',
        CheckOutDate: '2027-07-03',
        NumberOfNights: 2,
        Adults: 2,
        Children: 0,
        RoomQuantity: 1,
        RoomSubtotal: 4000000.00,
        TotalAmount: 4480000.00,
        DepositAmount: 896000.00,
        Status: 'Pending',
        BookingSource: 'DirectWeb',
        ConfirmationCode: 'GH-TEST07'
      });

      const initialVoucher = await Voucher.findOne({ where: { Code: 'SUMMER20' } });
      const beforeUsedCount = initialVoucher.UsedCount;

      const req = {
        params: { bookingId: testBooking.BookingId },
        body: { voucherCode: 'SUMMER20' }
      };
      const res = createMockRes();
      await voucherController.applyVoucherToBooking(req, res);

      assert('TC07 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC07 Code SUCCESS_0002_VOUCHER_APPLIED', res.body?.code === 'SUCCESS_0002_VOUCHER_APPLIED', `got ${res.body?.code}`);

      // Kiểm tra Booking đã được cập nhật VoucherId và DiscountAmount
      await testBooking.reload();
      assert('TC07 Booking lưu VoucherId', testBooking.VoucherId === initialVoucher.VoucherId, `got ${testBooking.VoucherId}`);
      assert('TC07 Booking lưu DiscountAmount 800,000 (20% của 4tr)', parseFloat(testBooking.DiscountAmount) === 800000, `got ${testBooking.DiscountAmount}`);

      // Kiểm tra Concurrency: UsedCount đã tăng lên 1
      await initialVoucher.reload();
      assert('TC07 Atomic UsedCount tăng 1', initialVoucher.UsedCount === beforeUsedCount + 1, `before ${beforeUsedCount}, after ${initialVoucher.UsedCount}`);

      // Dọn dẹp test booking
      await testBooking.destroy();
    }

    // ─── TEST CASE 08: calculatePricing tích hợp voucherCode thời gian thực ───
    console.log('\n--- TC08: Tích hợp voucherCode trong calculatePricing ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          voucherCode: 'SUMMER20' // Giảm 20% tiền phòng gốc ($960 x 0.20 = $192)
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC08 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC08 Voucher được áp dụng trong data', res.body?.data?.voucher?.code === 'SUMMER20', `got ${res.body?.data?.voucher?.code}`);
      assert('TC08 Giảm giá 20% là 192.00', res.body?.data?.discountAmount === 192.00, `got ${res.body?.data?.discountAmount}`);
      assert('TC08 Chi phí trước thuế là 768.00 ($960 - $192)', res.body?.data?.subtotalBeforeTax === 768.00, `got ${res.body?.data?.subtotalBeforeTax}`);
    }

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');
    await sequelize.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
