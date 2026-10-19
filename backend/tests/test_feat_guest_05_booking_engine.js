'use strict';

/**
 * test_feat_guest_05_booking_engine.js
 * Test suite for FEAT-GUEST-05: Đặt phòng trực tuyến (Online Booking Engine)
 */

const { sequelize, RoomType, Booking, BookingGuest } = require('../src/models');
const availabilityService = require('../src/services/availabilityService');
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
  console.log('🧪 BẮT ĐẦU TEST BỘ TÍNH NĂNG 5: ONLINE BOOKING ENGINE (FEAT-GUEST-05)');
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

    // Pick an existing RoomType
    const roomType = await RoomType.findOne();
    if (!roomType) {
      throw new Error('No RoomType found in database for testing.');
    }
    const testRoomTypeId = roomType.RoomTypeId;
    const basePrice = parseFloat(roomType.BasePrice || 1000000);

    const checkInDate = '2027-06-10';
    const checkOutDate = '2027-06-13'; // 3 nights

    // ─── TEST CASE 01: Để trống email nhận booking (TC01) ─────────────
    console.log('--- TC01: Kiểm tra rỗng Email nhận booking ---');
    {
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate,
          checkOutDate,
          firstName: 'An',
          lastName: 'Nguyễn Văn',
          email: '',
          phoneNumber: '+84908123456',
          isPolicyAccepted: true
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('TC01 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC01 Error code is ERROR_0001_REQUIRED', res.body?.code === 'ERROR_0001_REQUIRED', `got ${res.body?.code}`);
    }

    // ─── TEST CASE 02: Chưa tick đồng ý điều khoản (TC02) ─────────────
    console.log('\n--- TC02: Kiểm tra chưa xác nhận điều khoản ---');
    {
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate,
          checkOutDate,
          firstName: 'An',
          lastName: 'Nguyễn Văn',
          email: 'an.nguyen@grandhorizon.vn',
          phoneNumber: '+84908123456',
          isPolicyAccepted: false
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('TC02 Status code is 400', res.statusCode === 400, `got ${res.statusCode}`);
      assert('TC02 Error code is ERROR_0025_POLICY_NOT_ACCEPTED', res.body?.code === 'ERROR_0025_POLICY_NOT_ACCEPTED', `got ${res.body?.code}`);
      assert('TC02 Message matches exact spec', res.body?.message === 'Quý khách vui lòng xác nhận đồng ý với Điều khoản và Quy định lưu trú', `got "${res.body?.message}"`);
    }

    // ─── TEST CASE: Email sai định dạng (ERROR_0004_INVALID_FORMAT) ───
    console.log('\n--- Email sai định dạng ---');
    {
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate,
          checkOutDate,
          firstName: 'An',
          lastName: 'Nguyễn',
          email: 'not-an-email',
          phoneNumber: '+84908123456',
          isPolicyAccepted: true
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('Invalid email status is 400', res.statusCode === 400);
      assert('Invalid email code is ERROR_0004_INVALID_FORMAT', res.body?.code === 'ERROR_0004_INVALID_FORMAT');
      assert('Invalid email message matches spec', res.body?.message === 'Email nhận xác nhận đặt phòng không đúng định dạng');
    }

    // ─── TEST CASE: Thiếu Họ Tên (ERROR_0001_REQUIRED) ───────────────
    console.log('\n--- Họ và Tên để trống ---');
    {
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate,
          checkOutDate,
          firstName: '',
          lastName: '',
          email: 'an.nguyen@grandhorizon.vn',
          phoneNumber: '+84908123456',
          isPolicyAccepted: true
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('Missing name status is 400', res.statusCode === 400);
      assert('Missing name code is ERROR_0001_REQUIRED', res.body?.code === 'ERROR_0001_REQUIRED');
      assert('Missing name message matches spec', res.body?.message === 'Vui lòng nhập đầy đủ Họ và Tên khách lưu trú');
    }

    // ─── TEST CASE 03: Happy Case (TC03) ──────────────────────────────
    console.log('\n--- TC03: Chuyển bước thanh toán thành công (Happy Case) ---');
    let createdBookingId = null;
    {
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate,
          checkOutDate,
          adultsCount: 2,
          childrenCount: 1,
          unitsAllocated: 1,
          firstName: 'An',
          lastName: 'Nguyễn Văn',
          email: 'an.nguyen@grandhorizon.vn',
          phoneNumber: '+84908123456',
          specialRequests: 'Tầng cao, yên tĩnh',
          isPolicyAccepted: true,
          selectedAddons: ['limousine', 'couple_spa'], // 800k + 1800k = 2600k
          isGoldMember: true
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('TC03 Status code is 201', res.statusCode === 201, `got ${res.statusCode}: ${JSON.stringify(res.body)}`);
      assert('TC03 Success is true', res.body?.success === true);
      assert('TC03 Status is Pending', res.body?.data?.status === 'Pending', `got ${res.body?.data?.status}`);
      assert('TC03 Deposit is 50% of Total', Math.round(res.body?.data?.totalAmount / 2) === res.body?.data?.depositAmount, `total=${res.body?.data?.totalAmount}, deposit=${res.body?.data?.depositAmount}`);
      assert('TC03 Has Confirmation Code', Boolean(res.body?.data?.confirmationCode));
      assert('TC03 Returns primaryGuest', res.body?.data?.primaryGuest?.fullName === 'Nguyễn Văn An');

      createdBookingId = res.body?.data?.bookingId;

      // Verify in DB
      if (createdBookingId) {
        const dbBooking = await Booking.findByPk(createdBookingId, {
          include: [{ model: BookingGuest, as: 'guests' }]
        });
        assert('TC03 Booking saved in DB with correct status', dbBooking && dbBooking.Status === 'Pending');
        assert('TC03 BookingGuest saved in DB linked to Booking', dbBooking?.guests?.length > 0 && dbBooking.guests[0].FullName === 'Nguyễn Văn An');
        assert('TC03 Primary guest flag is true', dbBooking?.guests?.[0]?.IsPrimaryGuest === true);
      }
    }

    // ─── TEST CASE: Concurrency Conflict (ERROR_0024_CONCURRENT_LOCK_FAILED) ───
    console.log('\n--- Tranh chấp phòng khi phòng bị chiếm / hết phòng trống ---');
    {
      // Check total available rooms for this roomType
      const avail = await availabilityService.checkAvailability({
        roomTypeId: testRoomTypeId,
        checkInDate: '2027-07-01',
        checkOutDate: '2027-07-03',
        quantity: 1
      });

      // Temporarily lock ALL available rooms with another session if any available
      let tempLock = null;
      if (avail.availableRoomsCount > 0) {
        tempLock = await availabilityService.acquireRoomLock({
          roomTypeId: testRoomTypeId,
          checkInDate: '2027-07-01',
          checkOutDate: '2027-07-03',
          quantity: avail.availableRoomsCount
        });
      }

      // Now attempt to book without the lock
      const req = {
        body: {
          roomTypeId: testRoomTypeId,
          checkInDate: '2027-07-01',
          checkOutDate: '2027-07-03',
          unitsAllocated: 1,
          firstName: 'Bình',
          lastName: 'Trần',
          email: 'binh.tran@example.com',
          phoneNumber: '+84912345678',
          isPolicyAccepted: true
        }
      };
      const res = createMockRes();
      await bookingEngineController.createOnlineBooking(req, res);

      assert('Lock conflict returns 409', res.statusCode === 409, `got ${res.statusCode}`);
      assert('Lock conflict code is ERROR_0024_CONCURRENT_LOCK_FAILED', res.body?.code === 'ERROR_0024_CONCURRENT_LOCK_FAILED', `got ${res.body?.code}`);
      assert('Lock conflict message matches exact spec', res.body?.message === 'Rất tiếc, phòng vừa được giữ chỗ bởi khách hàng khác. Vui lòng chọn loại phòng khác');

      // Release temp lock
      if (tempLock?.sessionId) {
        await availabilityService.releaseRoomLock(tempLock.sessionId);
      }
    }

    // Clean up created test booking
    if (createdBookingId) {
      await BookingGuest.destroy({ where: { BookingId: createdBookingId } });
      await Booking.destroy({ where: { BookingId: createdBookingId } });
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
