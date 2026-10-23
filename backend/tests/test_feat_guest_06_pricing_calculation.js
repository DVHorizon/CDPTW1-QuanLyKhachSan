'use strict';

/**
 * test_feat_guest_06_pricing_calculation.js
 * Test suite for FEAT-GUEST-06: Tự động tính số đêm, phụ thu & tổng tiền phòng (Automated Price & Surcharge Calculation)
 * Mã truy vết Bảng 3: A6 | Màn hình liên quan: Màn hình 6 (Booking Summary & Chi tiết giá)
 */

const { sequelize, RoomType } = require('../src/models');
const bookingEngineController = require('../src/controllers/bookingEngineController');

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
  console.log('🧪 BẮT ĐẦU TEST BỘ TÍNH NĂNG 6: TỰ ĐỘNG TÍNH SỐ ĐÊM, PHỤ THU & TỔNG TIỀN PHÒNG');
  console.log('   (FEAT-GUEST-06 / A6 / POST /bookings/calculate-pricing)');
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

    // ─── TEST CASE 01: Tính tiền cơ bản 4 đêm (TC01) ─────────────────
    console.log('--- TC01: Tính tiền cơ bản 4 đêm x $240 (Không add-on) ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          children: 0,
          roomQuantity: 1,
          selectedAddOns: [],
          taxesAndFeesRate: 0.12,
          depositRate: 0.20
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC01 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC01 Code is SUCCESS_0003_PRICE_CALCULATED', res.body?.code === 'SUCCESS_0003_PRICE_CALCULATED', `got ${res.body?.code}`);
      assert('TC01 Message is Tính toán chi phí thành công', res.body?.message === 'Tính toán chi phí thành công', `got ${res.body?.message}`);
      
      const data = res.body?.data;
      assert('TC01 Số đêm lưu trú là 4', data?.numberOfNights === 4, `got ${data?.numberOfNights}`);
      assert('TC01 Tiền phòng gốc là 960.00 ($240 x 4)', data?.roomSubtotal === 960.00, `got ${data?.roomSubtotal}`);
      assert('TC01 Phụ thu add-on là 0', data?.addOnsTotal === 0, `got ${data?.addOnsTotal}`);
      assert('TC01 Thuế & phí 12% là 115.20', data?.taxesAndFees === 115.20, `got ${data?.taxesAndFees}`);
      assert('TC01 Tổng tiền phòng là 1,075.20 ($960 + $115.20)', data?.totalAmount === 1075.20, `got ${data?.totalAmount}`);
      assert('TC01 Cọc tối thiểu 20% là 215.04', data?.depositAmount === 215.04, `got ${data?.depositAmount}`);
    }

    // ─── TEST CASE 02: Chọn Buffet sáng 4 đêm (TC02) ─────────────────
    console.log('\n--- TC02: Thêm Daily Buffet sáng 4 đêm ($25 x 4 = $100) ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          children: 0,
          roomQuantity: 1,
          selectedAddOns: ['ADDON_BUFFET'],
          taxesAndFeesRate: 0.12,
          depositRate: 0.20
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC02 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      assert('TC02 Code is SUCCESS_0003_PRICE_CALCULATED', res.body?.code === 'SUCCESS_0003_PRICE_CALCULATED', `got ${res.body?.code}`);
      
      const data = res.body?.data;
      assert('TC02 Số đêm lưu trú là 4', data?.numberOfNights === 4, `got ${data?.numberOfNights}`);
      assert('TC02 Tiền phòng gốc là 960.00', data?.roomSubtotal === 960.00, `got ${data?.roomSubtotal}`);
      assert('TC02 Phụ thu Daily Buffet là 100.00 ($25 x 4 đêm)', data?.addOnsTotal === 100.00, `got ${data?.addOnsTotal}`);
      assert('TC02 Chi phí trước thuế là 1,060.00 ($960 + $100)', data?.subtotalBeforeTax === 1060.00, `got ${data?.subtotalBeforeTax}`);
      assert('TC02 Thuế & phí 12% là 127.20 ($1060 x 0.12)', data?.taxesAndFees === 127.20, `got ${data?.taxesAndFees}`);
      assert('TC02 Tổng tiền phòng là 1,187.20 ($1060 + $127.20)', data?.totalAmount === 1187.20, `got ${data?.totalAmount}`);
      assert('TC02 Cọc tối thiểu 20% là 237.44 ($1187.20 x 0.20)', data?.depositAmount === 237.44, `got ${data?.depositAmount}`);
    }

    // ─── TEST CASE 03: Đầy đủ các Add-on (Buffet, Shuttle, Early CI, Late CO) ───
    console.log('\n--- TC03: Chọn đầy đủ các Add-on trong đặc tả (Buffet, Shuttle, Early CI, Late CO) ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          children: 0,
          roomQuantity: 1,
          selectedAddOns: ['ADDON_BUFFET', 'ADDON_SHUTTLE', 'ADDON_EARLY_CI', 'ADDON_LATE_CO'],
          taxesAndFeesRate: 0.12,
          depositRate: 0.20
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC03 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      const data = res.body?.data;
      // Buffet: 25*4 = 100
      // Shuttle: 35
      // Early CI (12:00-14:00): 240 * 0.30 = 72
      // Late CO (+30m): 240 * 0.10 = 24
      // Addons total: 100 + 35 + 72 + 24 = 231
      assert('TC03 Tổng phụ thu Add-on là 231.00 (Early CI 30%, Late CO +30m 10%)', data?.addOnsTotal === 231.00, `got ${data?.addOnsTotal}`);
      assert('TC03 Chi phí trước thuế là 1,191.00 ($960 + $231)', data?.subtotalBeforeTax === 1191.00, `got ${data?.subtotalBeforeTax}`);
      assert('TC03 Thuế 12% là 142.92 ($1191 x 0.12)', data?.taxesAndFees === 142.92, `got ${data?.taxesAndFees}`);
      assert('TC03 Tổng chi phí là 1,333.92', data?.totalAmount === 1333.92, `got ${data?.totalAmount}`);
      assert('TC03 Cọc 20% là 266.78 ($1333.92 x 0.20)', data?.depositAmount === 266.78, `got ${data?.depositAmount}`);
    }

    // ─── TEST CASE 03B: Trả phòng trễ tăng theo từng 30 phút (+60m, +90m, +120m, 18:00) ───
    console.log('\n--- TC03B: Trả phòng trễ tăng nấc từng 30 phút (+60m -> 20%, +120m -> 40%, 18:00 -> 50%) ---');
    {
      const req60 = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          selectedAddOns: ['ADDON_LATE_CO'],
          lateCheckOutMinutes: 60
        }
      };
      const res60 = createMockRes();
      await bookingEngineController.calculatePricing(req60, res60);
      assert('TC03B Late CO +60m là 48.00 (20% của $240)', res60.body?.data?.addOnsTotal === 48.00, `got ${res60.body?.data?.addOnsTotal}`);

      const req120 = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 2,
          selectedAddOns: ['ADDON_LATE_CO'],
          lateCheckOutMinutes: 120
        }
      };
      const res120 = createMockRes();
      await bookingEngineController.calculatePricing(req120, res120);
      assert('TC03B Late CO +120m là 96.00 (40% của $240)', res120.body?.data?.addOnsTotal === 96.00, `got ${res120.body?.data?.addOnsTotal}`);
    }

    // ─── TEST CASE 04: Validate thiếu tham số ngày ───────────────────
    console.log('\n--- TC04: Thiếu tham số ngày checkInDate / checkOutDate ---');
    {
      const req = {
        body: {
          checkInDate: '',
          checkOutDate: '',
          baseRate: 240.00
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC04 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC04 Mã lỗi ERROR_0034_INVALID_CALCULATION_PARAMS', res.body?.code === 'ERROR_0034_INVALID_CALCULATION_PARAMS' || res.body?.errorCode === 'ERROR_0034_INVALID_CALCULATION_PARAMS', `got ${res.body?.code || res.body?.errorCode}`);
      assert('TC04 Message lỗi nguyên văn', res.body?.message === 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 05: Validate ngày trả phòng trước ngày nhận phòng ──
    console.log('\n--- TC05: Ngày trả phòng nhỏ hơn hoặc bằng ngày nhận phòng ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-15',
          checkOutDate: '2027-06-10',
          baseRate: 240.00
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC05 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC05 Mã lỗi ERROR_0034_INVALID_CALCULATION_PARAMS', res.body?.code === 'ERROR_0034_INVALID_CALCULATION_PARAMS' || res.body?.errorCode === 'ERROR_0034_INVALID_CALCULATION_PARAMS', `got ${res.body?.code || res.body?.errorCode}`);
      assert('TC05 Message lỗi nguyên văn', res.body?.message === 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 06: Validate số lượng khách không hợp lệ (< 1) ────
    console.log('\n--- TC06: Số lượng người lớn không hợp lệ (adults = 0) ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-14',
          baseRate: 240.00,
          adults: 0
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC06 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC06 Mã lỗi ERROR_0034_INVALID_CALCULATION_PARAMS', res.body?.code === 'ERROR_0034_INVALID_CALCULATION_PARAMS' || res.body?.errorCode === 'ERROR_0034_INVALID_CALCULATION_PARAMS', `got ${res.body?.code || res.body?.errorCode}`);
      assert('TC06 Message lỗi nguyên văn', res.body?.message === 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá', `got ${res.body?.message}`);
    }

    // ─── TEST CASE 07: Kiểm tra tính toán tiền tệ VND ─────────────────
    console.log('\n--- TC07: Tính toán với tiền Việt Nam Đồng (VND) ---');
    {
      const req = {
        body: {
          checkInDate: '2027-06-10',
          checkOutDate: '2027-06-13', // 3 nights
          baseRate: 8500000,
          adults: 2,
          children: 0,
          roomQuantity: 1,
          selectedAddOns: ['ADDON_BUFFET', 'ADDON_SHUTTLE'],
          taxesAndFeesRate: 0.12,
          depositRate: 0.20
        }
      };
      const res = createMockRes();
      await bookingEngineController.calculatePricing(req, res);

      assert('TC07 Status code is 200', res.statusCode === 200, `got ${res.statusCode}`);
      const data = res.body?.data;
      assert('TC07 Số đêm lưu trú là 3', data?.numberOfNights === 3, `got ${data?.numberOfNights}`);
      assert('TC07 Tiền phòng gốc là 25,500,000 VND', data?.roomSubtotal === 25500000, `got ${data?.roomSubtotal}`);
      // Buffet: 250,000 * 3 = 750,000
      // Shuttle: 800,000
      assert('TC07 Tổng phụ thu là 1,550,000 VND', data?.addOnsTotal === 1550000, `got ${data?.addOnsTotal}`);
      // Subtotal: 25,500,000 + 1,550,000 = 27,050,000
      assert('TC07 Trước thuế là 27,050,000 VND', data?.subtotalBeforeTax === 27050000, `got ${data?.subtotalBeforeTax}`);
      // Tax: 27,050,000 * 0.12 = 3,246,000
      assert('TC07 Thuế 12% là 3,246,000 VND', data?.taxesAndFees === 3246000, `got ${data?.taxesAndFees}`);
      // Total: 27,050,000 + 3,246,000 = 30,296,000
      assert('TC07 Tổng thanh toán là 30,296,000 VND', data?.totalAmount === 30296000, `got ${data?.totalAmount}`);
      // Deposit 20%: 30,296,000 * 0.20 = 6,059,200
      assert('TC07 Tiền cọc 20% là 6,059,200 VND', data?.depositAmount === 6059200, `got ${data?.depositAmount}`);
      assert('TC07 Currency là VND', data?.currency === 'VND', `got ${data?.currency}`);
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
