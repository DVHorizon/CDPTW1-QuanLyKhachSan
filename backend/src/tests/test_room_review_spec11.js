'use strict';

/**
 * test_room_review_spec11.js
 * 
 * Kiểm thử TÍNH NĂNG 11: ĐÁNH GIÁ VÀ CHẤM ĐIỂM SAO PHÒNG LƯU TRÚ (ROOM REVIEW & RATING)
 * Mã tính năng: FEAT-GUEST-11 | Mã truy vết Bảng 3: A11
 * 
 * Test cases:
 * - TC01: Nội dung nhận xét < 50 ký tự -> Báo lỗi ERROR_0040_REVIEW_TOO_SHORT
 * - TC02: Đăng đánh giá thành công -> Lưu review, gắn nhãn Verified Guest (Happy case)
 * - TC03: Đã đánh giá trước đó cho cùng lượt lưu trú -> Báo lỗi ERROR_0041_ALREADY_REVIEWED
 * - TC04: Ảnh tải lên vượt quá 15MB -> Báo lỗi ERROR_0042_FILE_TOO_LARGE
 * - TC05: GET /api/v1/rooms/:roomId/reviews -> Lấy danh sách review đã lưu thành công kèm thống kê điểm số
 */

const assert = require('assert');
const { sequelize, User, Booking, Stay, Room, RoomType, Review, ReviewPhoto } = require('../models');
const roomReviewController = require('../controllers/roomReviewController');

// Mock req and res helper
function mockReqRes(options = {}) {
  const req = {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    user: options.user || null
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

async function runTests() {
  console.log('--- STARTING SPEC 11 (FEAT-GUEST-11) ROOM REVIEW & RATING TEST SUITE ---');

  try {
    // Chuẩn bị dữ liệu kiểm thử
    // 1. Tạo hoặc lấy User test
    let testUser = await User.findOne({ where: { Email: 'review_test_user@hoteldomain.vn' } });
    if (!testUser) {
      testUser = await User.create({
        FullName: 'Nguyễn Văn An (Tester)',
        Email: 'review_test_user@hoteldomain.vn',
        PasswordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        RoleId: 5
      });
    }

    // 2. Tạo Booking hoàn tất
    let testBooking = await Booking.create({
      UserId: testUser.UserId,
      RoomTypeId: 1,
      CheckInDate: '2024-11-15',
      CheckOutDate: '2024-11-18',
      NumberOfNights: 3,
      Adults: 2,
      Children: 0,
      RoomQuantity: 1,
      TotalAmount: 25500000.00,
      Status: 'Completed',
      ConfirmationCode: 'GH-TEST-11'
    });

    // 3. Tạo Stay hoàn tất (CheckedOut)
    let testStay = await Stay.create({
      BookingId: testBooking.BookingId,
      RoomId: 1,
      ActualCheckIn: '2024-11-15 14:00:00',
      ActualCheckOut: '2024-11-18 12:00:00',
      Status: 'CheckedOut'
    });

    // Clean up bất kỳ review nào trước đó cho stay này
    await Review.destroy({ where: { StayId: testStay.StayId } });

    console.log(`[SETUP] Sẵn sàng dữ liệu kiểm thử: UserId=${testUser.UserId}, BookingId=${testBooking.BookingId}, StayId=${testStay.StayId}`);

    // ==========================================
    // TC01: Nội dung nhận xét < 50 ký tự -> Báo lỗi ERROR_0040_REVIEW_TOO_SHORT
    // ==========================================
    console.log('\n[TEST TC01] Kiểm tra validation nhận xét < 50 ký tự...');
    {
      const { req, res } = mockReqRes({
        params: { roomId: 1 },
        user: { userId: testUser.UserId, roleId: 5 },
        body: {
          stayId: testStay.StayId,
          bookingId: testBooking.BookingId,
          overallRating: 5.0,
          reviewTitle: 'Phòng đẹp',
          reviewBody: 'Phòng đẹp', // < 50 chars
          cleanlinessScore: 10,
          staffServiceScore: 10,
          roomComfortScore: 10,
          diningScore: 10,
          valueForMoneyScore: 10
        }
      });

      await roomReviewController.createRoomReview(req, res);
      const data = res.getData();
      const status = res.getStatusCode();

      assert.strictEqual(status, 400, 'TC01 status must be 400');
      assert.strictEqual(data.code, 'ERROR_0040_REVIEW_TOO_SHORT', 'TC01 code must be ERROR_0040_REVIEW_TOO_SHORT');
      assert.strictEqual(data.message, 'Nội dung đánh giá phải có độ dài tối thiểu từ 50 ký tự trở lên', 'TC01 message must match exact spec');
      console.log('✅ TC01 PASSED: Trả đúng ERROR_0040_REVIEW_TOO_SHORT với message chuẩn.');
    }

    // ==========================================
    // TC04: File ảnh quá lớn (> 15MB) -> Báo lỗi ERROR_0042_FILE_TOO_LARGE
    // ==========================================
    console.log('\n[TEST TC04] Kiểm tra validation ảnh vượt quá 15MB...');
    {
      const { req, res } = mockReqRes({
        params: { roomId: 1 },
        user: { userId: testUser.UserId, roleId: 5 },
        body: {
          stayId: testStay.StayId,
          bookingId: testBooking.BookingId,
          overallRating: 5.0,
          reviewTitle: 'Kỳ nghỉ tuyệt vời',
          reviewBody: 'Kỳ nghỉ trăng mật trên cả tuyệt vời tại bờ biển Phú Quốc! Phòng ốc sạch sẽ, nhân viên chu đáo tận tâm.',
          photos: [
            {
              name: 'huge_photo.jpg',
              size: 16 * 1024 * 1024, // 16MB > 15MB
              url: 'data:image/jpeg;base64,sample'
            }
          ]
        }
      });

      await roomReviewController.createRoomReview(req, res);
      const data = res.getData();
      const status = res.getStatusCode();

      assert.strictEqual(status, 400, 'TC04 status must be 400');
      assert.strictEqual(data.code, 'ERROR_0042_FILE_TOO_LARGE', 'TC04 code must be ERROR_0042_FILE_TOO_LARGE');
      assert.strictEqual(data.message, 'Mỗi ảnh tải lên không được vượt quá dung lượng 15MB', 'TC04 message must match exact spec');
      console.log('✅ TC04 PASSED: Trả đúng ERROR_0042_FILE_TOO_LARGE với message chuẩn.');
    }

    // ==========================================
    // TC02: Đăng đánh giá thành công (Happy Case)
    // ==========================================
    console.log('\n[TEST TC02] Kiểm tra đăng đánh giá hợp lệ thành công...');
    let createdReviewId = null;
    {
      const { req, res } = mockReqRes({
        params: { roomId: 1 },
        user: { userId: testUser.UserId, roleId: 5 },
        body: {
          stayId: testStay.StayId,
          bookingId: testBooking.BookingId,
          overallRating: 5.0,
          wouldRecommend: 'YES',
          cleanlinessScore: 10,
          staffServiceScore: 10,
          roomComfortScore: 10,
          diningScore: 9,
          valueForMoneyScore: 10,
          tripClassification: 'COUPLE',
          reviewTitle: 'Kỳ nghỉ trăng mật trên cả tuyệt vời tại bờ biển Phú Quốc!',
          reviewBody: 'Vợ chồng tôi vừa có chuyến nghỉ dưỡng kỷ niệm ngày cưới 3 đêm tại Sunset Pool Villa. Cảnh hoàng hôn nhìn từ hồ bơi vô cực riêng thực sự tráng lệ không lời nào tả hết.',
          photos: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB-O1aPKk89x4btkm7N0qOtVkhJp9T7QodqXIGx8vtYeI0cn71wZAn_NLnC-0QCagjXpXCcaLn-Yd-IRVRkSDRV-eReWk8XDG3iJZdcc8hi5Z-lAPQWZKMEE5zq87jIHrmvbap_CjCFQQvaQrLVR51F29v0JA6hyVQ2Ixr5aZi-O2cSXVnjHCnGcYV7GJUA5GgvQz8V-ipKe-PbSKgjFkHolW25kSrmRFFXbmiTXVKN_8aanFPZsQml',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9BdKE_k3HR9MkZht20xdoaQo2n5omgLFDgtH-_oBRTBH-SpzVuil_zoMXIKb4BFWwbaBRVThUsBc94byS6_r3Ezy2ZXgTAeO2zkQmiKaLg_3Pl1-_R3RQJmNRX9SzQ3J-RvdRNA9M2athXOc0KSGsgHpK5lKMeANLJiYDacsCudZU_A-5Y-7H6nXUOy4DCc7cGvF-B8G2cch5CqZ68i6OLFDldkexy6ALkinJkPFbsnv2_gT0t6o'
          ],
          isAnonymous: false
        }
      });

      await roomReviewController.createRoomReview(req, res);
      const data = res.getData();
      const status = res.getStatusCode();

      assert.strictEqual(status, 201, 'TC02 status must be 201 Created');
      assert.strictEqual(data.success, true, 'TC02 success must be true');
      assert.strictEqual(data.data.verifiedGuest, true, 'TC02 must have verifiedGuest: true');
      assert.strictEqual(data.data.cleanlinessScore, 10, 'Cleanliness score must be 10');
      assert.strictEqual(data.data.photos.length, 2, 'Must have saved 2 photos');
      createdReviewId = data.data.reviewId;
      console.log('✅ TC02 PASSED: Đăng đánh giá thành công, gắn nhãn Verified Guest, ReviewId=' + createdReviewId);
    }

    // ==========================================
    // TC03: Đã đánh giá trước đó -> Báo lỗi ERROR_0041_ALREADY_REVIEWED
    // ==========================================
    console.log('\n[TEST TC03] Kiểm tra khi gửi đánh giá lần 2 cho cùng lượt lưu trú...');
    {
      const { req, res } = mockReqRes({
        params: { roomId: 1 },
        user: { userId: testUser.UserId, roleId: 5 },
        body: {
          stayId: testStay.StayId,
          bookingId: testBooking.BookingId,
          overallRating: 4.5,
          reviewTitle: 'Gửi lại lần nữa',
          reviewBody: 'Vợ chồng tôi vừa có chuyến nghỉ dưỡng kỷ niệm ngày cưới 3 đêm tại Sunset Pool Villa. Cảnh hoàng hôn nhìn từ hồ bơi vô cực riêng thực sự tráng lệ không lời nào tả hết.'
        }
      });

      await roomReviewController.createRoomReview(req, res);
      const data = res.getData();
      const status = res.getStatusCode();

      assert.strictEqual(status, 409, 'TC03 status must be 409 Conflict');
      assert.strictEqual(data.code, 'ERROR_0041_ALREADY_REVIEWED', 'TC03 code must be ERROR_0041_ALREADY_REVIEWED');
      assert.strictEqual(data.message, 'Quý khách đã gửi đánh giá cho kỳ nghỉ này rồi', 'TC03 message must match exact spec');
      console.log('✅ TC03 PASSED: Trả đúng ERROR_0041_ALREADY_REVIEWED với message chuẩn.');
    }

    // ==========================================
    // TC05: Lấy danh sách đánh giá của phòng (GET /api/v1/rooms/:roomId/reviews)
    // ==========================================
    console.log('\n[TEST TC05] Kiểm tra lấy danh sách review của phòng...');
    {
      const { req, res } = mockReqRes({
        params: { roomId: 1 },
        query: { page: 1, limit: 10 }
      });

      await roomReviewController.getRoomReviews(req, res);
      const data = res.getData();
      const status = res.getStatusCode();

      assert.strictEqual(status, 200, 'TC05 status must be 200 OK');
      assert.strictEqual(data.success, true, 'TC05 success must be true');
      assert.ok(data.data.length > 0, 'TC05 must return reviews');
      assert.ok(data.summary.totalReviews > 0, 'TC05 summary must have totalReviews');
      console.log(`✅ TC05 PASSED: Lấy được ${data.data.length} reviews, tổng đánh giá: ${data.summary.totalReviews}, điểm TB: ${data.summary.avgOverall}/5.0`);
    }

    // Dọn dẹp dữ liệu test
    if (createdReviewId) {
      await ReviewPhoto.destroy({ where: { ReviewId: createdReviewId } });
      await Review.destroy({ where: { ReviewId: createdReviewId } });
    }
    await Stay.destroy({ where: { StayId: testStay.StayId } });
    await Booking.destroy({ where: { BookingId: testBooking.BookingId } });
    await User.destroy({ where: { UserId: testUser.UserId } });

    console.log('\n✨ ALL TEST CASES PASSED SUCCESSFULLY (TC01, TC02, TC03, TC04, TC05) ✨\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runTests();

