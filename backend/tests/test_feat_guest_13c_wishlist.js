'use strict';

/**
 * tests/test_feat_guest_13c_wishlist.js
 * 
 * Bộ kiểm thử tự động cho:
 * TÍNH NĂNG 13C: DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)
 * Màn hình liên quan: Màn hình 59 (MODULE: WSH-059 / SAVED_WISHLIST_SPEC_059)
 * 
 * Test Specs:
 * - TC01: Thêm phòng vào Wishlist (POST /me/wishlist/:roomTypeId) -> SAVED, counter tăng 1
 * - TC02: Xóa hết phòng (Empty state) (DELETE /me/wishlist) -> Fallback State rỗng, counter = 0
 * - TC03: Xóa một phòng cụ thể (DELETE /me/wishlist/:roomTypeId) -> UNSAVED
 * - TC04: Sắp xếp theo sortOption (DATE_ADDED_NEWEST, PRICE_LOW_TO_HIGH, PRICE_HIGH_TO_LOW)
 * - TC05: Khách vãng lai hỗ trợ query roomTypeIds từ LocalStorage
 * - TC06: Đồng bộ Wishlist sau khi đăng nhập (POST /me/wishlist/sync)
 * - TC07: Kiểm tra tính chuẩn xác của Message nguyên văn: "Đã cập nhật danh sách phòng yêu thích"
 */

const { sequelize, Wishlist, RoomType, User } = require('../src/models');
const wishlistController = require('../src/controllers/wishlistController');

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
  console.log('🧪 BẮT ĐẦU TEST TÍNH NĂNG 13C: GUEST ROOM WISHLIST (FEAT-GUEST-13C / A13 / WSH-059)');
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

    // Tìm hoặc tạo user test
    let testUser = await User.findOne({ where: { Email: 'guest@hoteldomain.vn' } });
    if (!testUser) {
      testUser = await User.findOne();
    }
    const testUserId = testUser ? testUser.UserId : 9999;
    console.log(`Sử dụng Test UserId: ${testUserId} (${testUser ? testUser.Email : 'Mock'})`);

    // Lấy 2 loại phòng để test
    const roomTypes = await RoomType.findAll({ where: { IsDeleted: false }, limit: 3 });
    if (roomTypes.length < 2) {
      throw new Error('Cần ít nhất 2 RoomType trong database để chạy test suite');
    }
    const room1 = roomTypes[0];
    const room2 = roomTypes[1];
    console.log(`Phòng test 1: [ID ${room1.RoomTypeId}] ${room1.TypeName} - Giá: ${room1.BasePrice}`);
    console.log(`Phòng test 2: [ID ${room2.RoomTypeId}] ${room2.TypeName} - Giá: ${room2.BasePrice}\n`);

    // Dọn dẹp dữ liệu cũ của testUser
    await Wishlist.destroy({ where: { UserId: testUserId } });

    // ─── TEST CASE 01: Thêm phòng vào Wishlist (TC01 Spec) ───────────────────
    console.log('--- TEST 1: TC01 - Thêm phòng vào Wishlist (Icon chuyển SAVED, tăng bộ đếm) ---');
    {
      const req = {
        params: { roomTypeId: room1.RoomTypeId },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.addToWishlist(req, res);

      assert('Status code trả về 201 hoặc 200', res.statusCode === 201 || res.statusCode === 200, `code=${res.statusCode}`);
      assert('Success là true', res.body && res.body.success === true);
      assert('Mã lỗi/phản hồi chuẩn: SUCCESS_0010_WISHLIST_UPDATED', res.body && res.body.code === 'SUCCESS_0010_WISHLIST_UPDATED');
      assert('Message chuẩn nguyên văn: "Đã cập nhật danh sách phòng yêu thích"', res.body && res.body.message === 'Đã cập nhật danh sách phòng yêu thích');
      assert('Data trả về action = SAVED và isSaved = true', res.body && res.body.data && res.body.data.action === 'SAVED' && res.body.data.isSaved === true);

      // Thêm tiếp phòng thứ 2
      const req2 = {
        params: { roomTypeId: room2.RoomTypeId },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res2 = createMockRes();
      await wishlistController.addToWishlist(req2, res2);
      assert('Thêm phòng 2 thành công', res2.body && res2.body.success === true);
    }

    // ─── TEST CASE 04: Lấy danh sách Wishlist & Sắp xếp ───────────────────────
    console.log('\n--- TEST 2: TC04 - Lấy danh sách Wishlist & Sắp xếp (sortOption) ---');
    {
      const req = {
        query: { sortOption: 'DATE_ADDED_NEWEST' },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.getWishlist(req, res);

      assert('Lấy danh sách thành công', res.statusCode === 200 && res.body.success === true);
      assert('Bộ đếm total = 2', res.body.data && res.body.data.total === 2, `total=${res.body?.data?.total}`);
      assert('Danh sách trả về mảng 3-cột items có độ dài 2', res.body.data && Array.isArray(res.body.data.items) && res.body.data.items.length === 2);
      assert('Phòng mới thêm (room2) đứng đầu tiên khi sort DATE_ADDED_NEWEST', res.body.data.items[0].roomTypeId === room2.RoomTypeId);

      // Thử sort theo giá
      const reqPrice = {
        query: { sortOption: 'PRICE_LOW_TO_HIGH' },
        headers: { 'x-user-id': String(testUserId) }
      };
      const resPrice = createMockRes();
      await wishlistController.getWishlist(reqPrice, resPrice);
      const sortedByPrice = resPrice.body.data.items;
      assert('Sắp xếp theo giá tăng dần hợp lệ', sortedByPrice[0].basePrice <= sortedByPrice[1].basePrice);
    }

    // ─── TEST CASE 03: Xóa một phòng cụ thể (DELETE /me/wishlist/:id) ─────────
    console.log('\n--- TEST 3: TC03 - Xóa một phòng cụ thể khỏi Wishlist (SAVED -> UNSAVED) ---');
    {
      const req = {
        params: { roomTypeId: room1.RoomTypeId },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.removeFromWishlist(req, res);

      assert('Status code 200', res.statusCode === 200);
      assert('Message chuẩn: "Đã cập nhật danh sách phòng yêu thích"', res.body.message === 'Đã cập nhật danh sách phòng yêu thích');
      assert('Action trả về UNSAVED', res.body.data && res.body.data.action === 'UNSAVED');

      // Kiểm tra lại danh sách chỉ còn 1 phòng
      const reqCheck = {
        query: {},
        headers: { 'x-user-id': String(testUserId) }
      };
      const resCheck = createMockRes();
      await wishlistController.getWishlist(reqCheck, resCheck);
      assert('Bộ đếm giảm còn 1 phòng', resCheck.body.data.total === 1);
    }

    // ─── TEST CASE 02: Xóa hết phòng (Empty state / CLEAR WISHLIST) ───────────
    console.log('\n--- TEST 4: TC02 - Xóa hết phòng (CLEAR WISHLIST -> Fallback State) ---');
    {
      const req = {
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.clearWishlist(req, res);

      assert('Status code 200', res.statusCode === 200);
      assert('Data cleared = true', res.body.data && res.body.data.cleared === true);
      assert('Message chuẩn: "Đã cập nhật danh sách phòng yêu thích"', res.body.message === 'Đã cập nhật danh sách phòng yêu thích');

      // Kiểm tra Wishlist rỗng hoàn toàn
      const reqCheck = {
        query: {},
        headers: { 'x-user-id': String(testUserId) }
      };
      const resCheck = createMockRes();
      await wishlistController.getWishlist(reqCheck, resCheck);
      assert('Bộ đếm wishlist = 0 (Empty State)', resCheck.body.data.total === 0);
      assert('Mảng items rỗng', Array.isArray(resCheck.body.data.items) && resCheck.body.data.items.length === 0);
    }

    // ─── TEST CASE 05: Khách vãng lai (LocalStorage Fallback) ────────────────
    console.log('\n--- TEST 5: TC05 - Khách vãng lai chưa đăng nhập query bằng roomTypeIds ---');
    {
      const req = {
        query: { roomTypeIds: `${room1.RoomTypeId},${room2.RoomTypeId}` },
        headers: {} // Không có user
      };
      const res = createMockRes();
      await wishlistController.getWishlist(req, res);

      assert('Khách vãng lai lấy được thông tin 2 phòng', res.body.data && res.body.data.total === 2);
      assert('RoomType chứa đầy đủ thông tin hiển thị card', res.body.data.items[0].typeName && res.body.data.items[0].basePrice > 0);
    }

    // ─── TEST CASE 06: Đồng bộ Wishlist sau khi đăng nhập ─────────────────────
    console.log('\n--- TEST 6: TC06 - Đồng bộ Wishlist từ LocalStorage sau khi Login (POST /me/wishlist/sync) ---');
    {
      const req = {
        body: { roomTypeIds: [room1.RoomTypeId, room2.RoomTypeId] },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.syncWishlist(req, res);

      assert('Đồng bộ thành công', res.statusCode === 200 && res.body.success === true);
      assert('Sau đồng bộ có 2 phòng trong DB', res.body.data && res.body.data.total === 2);

      // Dọn dẹp
      await Wishlist.destroy({ where: { UserId: testUserId } });
    }

    // ─── TEST CASE 07: Bắt lỗi phòng không tồn tại ────────────────────────────
    console.log('\n--- TEST 7: TC07 - Bắt lỗi khi thêm phòng không tồn tại ---');
    {
      const req = {
        params: { roomTypeId: 99999999 },
        headers: { 'x-user-id': String(testUserId) }
      };
      const res = createMockRes();
      await wishlistController.addToWishlist(req, res);

      assert('Trả về lỗi 404', res.statusCode === 404);
      assert('Mã lỗi ERROR_0004_NOT_FOUND', res.body.code === 'ERROR_0004_NOT_FOUND');
    }

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình test:', err);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

