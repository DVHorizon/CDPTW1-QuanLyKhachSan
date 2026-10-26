'use strict';

/**
 * tests/test_feat_invoice_01_c6.js
 * Test suite cho FEAT-INVOICE-01 (C6): Tự động gom chi phí lưu trú (Booking Charges Aggregation)
 * Bám sát đầy đủ 8 Test Cases trong Mục 1.7 của Spec
 */

const assert = require('assert');
const {
  Booking,
  Stay,
  Room,
  ServiceOrder,
  FoodOrder,
  MinibarUsage,
  Payment,
} = require('../src/models');

const API_BASE = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU TEST FEAT-INVOICE-01 (C6): GOM CHI PHÍ LƯU TRÚ');
  console.log('====================================================\n');

  // 1. Đăng nhập Admin và Guest
  console.log('👉 [1] Đăng nhập Admin & Guest để lấy JWT token kiểm thử...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: '123456' }),
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.token;

  const guestLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'guest', password: '123456' }),
  });
  assert.strictEqual(guestLogin.status, 200, 'Guest login failed');
  const guestToken = guestLogin.data.token;
  console.log('   ✅ Đăng nhập Admin và Guest thành công.\n');

  // TC01: Gọi không có token -> 401 ERROR_0009_UNAUTHENTICATED
  console.log('👉 [2] TC01: Gọi GET /bookings/1/charges không có token...');
  const noTokenRes = await request('/bookings/1/charges');
  assert.strictEqual(noTokenRes.status, 401, 'Phải trả về 401 Unauthenticated');
  assert.strictEqual(noTokenRes.data.code, 'ERROR_0009_UNAUTHENTICATED');
  console.log('   ✅ [PASS] TC01: Trả về 401 ERROR_0009_UNAUTHENTICATED chuẩn xác.\n');

  // TC02: Guest tự gọi API cho booking -> 403 ERROR_0010_FORBIDDEN (Spec TC7)
  console.log('👉 [3] TC02: Guest tự gọi GET /bookings/1/charges...');
  const guestRes = await request('/bookings/1/charges', {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert.strictEqual(guestRes.status, 403, 'Guest phải bị chặn 403 Forbidden');
  assert.strictEqual(guestRes.data.code, 'ERROR_0010_FORBIDDEN');
  console.log('   ✅ [PASS] TC02: Trả về 403 ERROR_0010_FORBIDDEN cho Guest (chỉ nhân viên được gọi).\n');

  // TC03: Booking không tồn tại -> 404 ERROR_0011_NOT_FOUND (Spec TC6)
  console.log('👉 [4] TC03: Admin gọi GET /bookings/999999/charges (không tồn tại)...');
  const notFoundRes = await request('/bookings/999999/charges', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(notFoundRes.status, 404, 'Booking không tồn tại phải trả về 404');
  assert.strictEqual(notFoundRes.data.code, 'ERROR_0011_NOT_FOUND');
  console.log('   ✅ [PASS] TC03: Trả về 404 ERROR_0011_NOT_FOUND chuẩn xác.\n');

  // TC04: Booking chưa check-in (chưa có Stay nào) -> estimated=true, stays=[], grandTotal = Bookings.TotalAmount (Spec TC3)
  console.log('👉 [5] TC04: Booking chưa check-in (chưa có Stay nào)...');
  const createBookingRes = await request('http://localhost:5000/bookings', {
    method: 'POST',
    body: JSON.stringify({
      roomTypeId: 1,
      checkInDate: '2026-11-20',
      checkOutDate: '2026-11-22',
      firstName: 'Dang',
      lastName: 'Ha Estimated Test',
      email: 'guest@hoteldomain.vn',
      phoneNumber: '0987654321',
      isPolicyAccepted: true,
    }),
  });
  assert.strictEqual(createBookingRes.status, 201, 'Tạo booking mới thất bại');
  const estimatedBookingId = createBookingRes.data.data.bookingId;
  const expectedTotal = Number(createBookingRes.data.data.totalAmount);

  const tc04Res = await request(`/bookings/${estimatedBookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(tc04Res.status, 200);
  assert.strictEqual(tc04Res.data.data.estimated, true, 'estimated phải là true');
  assert.strictEqual(tc04Res.data.data.hasPendingServices, false);
  assert.deepStrictEqual(tc04Res.data.data.stays, [], 'stays phải là mảng rỗng');
  assert.strictEqual(tc04Res.data.data.grandTotal, expectedTotal, 'grandTotal phải bằng Bookings.TotalAmount');
  console.log(`   ✅ [PASS] TC04: Trả về estimated=true, stays=[], grandTotal=${expectedTotal.toLocaleString()}đ.\n`);

  // Chuẩn bị dữ liệu kiểm thử có Stay thực tế
  console.log('👉 [6] Tạo Booking có 1 Stay thực tế để kiểm thử tính chi tiết phát sinh...');
  const testBooking = await Booking.create({
    RoomTypeId: 1,
    ConfirmationCode: 'CONF-TEST-C6-' + Date.now(),
    CheckInDate: '2026-10-20',
    CheckOutDate: '2026-10-23',
    NumberOfNights: 3,
    RoomQuantity: 1,
    RoomSubtotal: 3000000,
    TotalAmount: 3000000,
    DepositAmount: 600000,
    SurchargeAmount: 100000, // Phụ thu cấp booking
    DiscountAmount: 50000,   // Giảm giá cấp booking
    Status: 'CheckedIn',
    CreatedAt: new Date(),
  });

  const testStay = await Stay.create({
    BookingId: testBooking.BookingId,
    RoomId: 101,
    ActualCheckIn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Check-in 3 ngày trước
    ActualCheckOut: null, // Chưa check-out
    Status: 'CheckedIn',
  });

  // TC05: Stay có 1 ServiceOrders InProgress và 1 cái Completed (Spec TC4)
  console.log('👉 [7] TC05: Stay có 1 ServiceOrders InProgress và 1 Completed...');
  const orderCompleted = await ServiceOrder.create({
    StayId: testStay.StayId,
    ServiceId: 1,
    Quantity: 2,
    UnitPrice: 200000,
    TotalPrice: 400000,
    Status: 'Completed',
    OrderDate: new Date(),
  });

  const orderInProgress = await ServiceOrder.create({
    StayId: testStay.StayId,
    ServiceId: 2,
    Quantity: 1,
    UnitPrice: 150000,
    TotalPrice: 150000,
    Status: 'InProgress', // Đang làm dở
    OrderDate: new Date(),
  });

  const tc05Res = await request(`/bookings/${testBooking.BookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(tc05Res.status, 200);
  assert.strictEqual(tc05Res.data.data.hasPendingServices, true, 'hasPendingServices phải là true do có đơn InProgress');
  assert.strictEqual(tc05Res.data.data.stays[0].services.length, 1, 'Chỉ gom đúng 1 đơn Completed');
  assert.strictEqual(tc05Res.data.data.stays[0].services[0].subtotal, 400000);
  console.log('   ✅ [PASS] TC05: Chỉ gom đơn Completed (400k) và gắn cờ hasPendingServices=true chuẩn xác.\n');

  // TC06: FoodOrders của Stay có PaymentMode=PayNow và RoomInvoice (Spec TC5)
  console.log('👉 [8] TC06: FoodOrders PayNow vs RoomInvoice (chỉ gom RoomInvoice & Served)...');
  // Đơn PayNow -> KHÔNG được tính vào charges
  await FoodOrder.create({
    StayId: testStay.StayId,
    UserId: 1,
    OrderType: 'RoomService',
    Status: 'Served',
    TotalAmount: 250000,
    PaymentMode: 'PayNow',
  });

  // Đơn RoomInvoice & Served -> ĐƯỢC tính
  await FoodOrder.create({
    StayId: testStay.StayId,
    UserId: 1,
    OrderType: 'RoomService',
    Status: 'Served',
    TotalAmount: 350000,
    PaymentMode: 'RoomInvoice',
  });

  const tc06Res = await request(`/bookings/${testBooking.BookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(tc06Res.status, 200);
  const stayFoods = tc06Res.data.data.stays[0].food;
  assert.strictEqual(stayFoods.length, 1, 'Chỉ có 1 đơn RoomInvoice được tính');
  assert.strictEqual(stayFoods[0].subtotal, 350000, 'Đơn RoomInvoice đúng 350k');
  console.log('   ✅ [PASS] TC06: Bỏ qua đơn PayNow, chỉ tính đơn RoomInvoice (350k).\n');

  // TC07: Thêm tiêu dùng Minibar và kiểm tra tính toán tổng tiền Stay + Booking (Spec TC1 & TC2 & Quyết định D12)
  console.log('👉 [9] TC07: Thêm tiêu dùng Minibar và kiểm tra grandTotal, totalPaid, remainingBalance...');
  await MinibarUsage.create({
    StayId: testStay.StayId,
    ItemId: 1,
    Quantity: 2,
    UnitPrice: 50000,
    TotalAmount: 100000,
    UsageDate: new Date(),
  });

  // Thêm 1 khoản cọc đã thanh toán 600k
  await Payment.create({
    BookingId: testBooking.BookingId,
    Amount: 600000,
    PaymentMethod: 'VNPay',
    PaymentDate: new Date(),
    TransactionCode: 'PMT-TEST-C6-' + Date.now(),
    Status: 'Paid',
  });

  const tc07Res = await request(`/bookings/${testBooking.BookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(tc07Res.status, 200);
  const stayData = tc07Res.data.data.stays[0];

  // Chi tiết Stay:
  // Tiền phòng: unitNight = 3.000.000 / (1 * 3) = 1.000.000đ/đêm * 3 đêm = 3.000.000đ
  // Dịch vụ: 400.000đ
  // Minibar: 100.000đ
  // F&B: 350.000đ
  // staySubtotal = 3.000.000 + 400.000 + 100.000 + 350.000 = 3.850.000đ
  assert.strictEqual(stayData.room.subtotal, 3000000);
  assert.strictEqual(stayData.minibar[0].subtotal, 100000);
  assert.strictEqual(stayData.staySubtotal, 3850000);

  // Cấp booking:
  // grandTotal = 3.850.000 + 100.000 (surcharge) - 50.000 (discount) = 3.900.000đ
  // totalPaid = 600.000đ
  // remainingBalance = 3.900.000 - 600.000 = 3.300.000đ
  assert.strictEqual(tc07Res.data.data.surchargeAmount, 100000);
  assert.strictEqual(tc07Res.data.data.discountAmount, 50000);
  assert.strictEqual(tc07Res.data.data.grandTotal, 3900000);
  assert.strictEqual(tc07Res.data.data.totalPaid, 600000);
  assert.strictEqual(tc07Res.data.data.remainingBalance, 3300000);
  console.log('   ✅ [PASS] TC07: Tính toán chi tiết từng Stay và grandTotal=3.900.000đ, remaining=3.300.000đ chuẩn xác.\n');

  // TC08: Thao tác thuần đọc (Read-only / Idempotent) (Spec TC8)
  console.log('👉 [10] TC08: Gọi lại GET liên tiếp để đảm bảo tính Idempotent và không tác dụng phụ...');
  const tc08Res1 = await request(`/bookings/${testBooking.BookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const tc08Res2 = await request(`/bookings/${testBooking.BookingId}/charges`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(tc08Res1.status, 200);
  assert.strictEqual(tc08Res2.status, 200);
  assert.deepStrictEqual(tc08Res1.data, tc08Res2.data, 'Dữ liệu 2 lần gọi phải giống hệt nhau');
  console.log('   ✅ [PASS] TC08: API hoàn toàn là thao tác thuần đọc (Idempotent), kết quả nhất quán 100%.\n');

  console.log('====================================================');
  console.log('🎉 TẤT CẢ 8/8 TEST CASES C6 (FEAT-INVOICE-01) ĐÃ PASS!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
