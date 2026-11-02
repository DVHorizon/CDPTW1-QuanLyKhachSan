'use strict';

/**
 * tests/test_feat_payment_01_c5.js
 * Test suite cho FEAT-PAYMENT-01 (C5): Core Payment Module
 * Bám sát 10 test cases trong Mục 1.11 của Spec
 */

const assert = require('assert');

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
  console.log('🧪 BẮT ĐẦU TEST FEAT-PAYMENT-01 (C5): CORE PAYMENT MODULE');
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

  // 2. Tạo một đơn Booking mới ở trạng thái Pending để dùng cho kiểm thử
  console.log('👉 [2] Tạo đơn đặt phòng mới (Pending) để kiểm thử thanh toán cọc...');
  const createBookingRes = await request('http://localhost:5000/bookings', {
    method: 'POST',
    body: JSON.stringify({
      roomTypeId: 1,
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-12',
      firstName: 'Dang',
      lastName: 'Ha Test',
      email: 'guest@hoteldomain.vn',
      phoneNumber: '0987654321',
      isPolicyAccepted: true,
    }),
  });
  assert.strictEqual(createBookingRes.status, 201, 'Tạo booking mới thất bại');
  const testBookingId = createBookingRes.data.data.bookingId;
  const depositAmount = Number(createBookingRes.data.data.depositAmount || 1000000);
  const totalAmount = Number(createBookingRes.data.data.totalAmount || 5000000);
  console.log(`   ✅ Đã tạo BookingId=${testBookingId}, Tổng tiền=${totalAmount.toLocaleString()}đ, Cọc tối thiểu=${depositAmount.toLocaleString()}đ.\n`);

  // TC01: Guest gửi method = "Cash" -> 403 ERROR_0010_FORBIDDEN
  console.log('👉 [3] TC01: Khách hàng (Guest) cố tình chọn method = "Cash"...');
  const tc01Res = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guestToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: 500000,
      method: 'Cash',
    }),
  });
  assert.strictEqual(tc01Res.status, 403, 'TC01 phải trả về 403 Forbidden');
  assert.strictEqual(tc01Res.data.code, 'ERROR_0010_FORBIDDEN');
  assert.strictEqual(tc01Res.data.message, 'Hình thức thanh toán này chỉ áp dụng tại quầy');
  console.log('   ✅ [PASS] TC01: Trả về 403 ERROR_0010_FORBIDDEN chuẩn xác.\n');

  // TC02: Gửi cả bookingId và invoiceId cùng lúc -> ERROR_0016_INVALID_COMBINATION
  console.log('👉 [4] TC02: Gửi cả bookingId và invoiceId cùng lúc...');
  const tc02Res = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      invoiceId: 999,
      amount: 500000,
      method: 'Cash',
    }),
  });
  assert.strictEqual(tc02Res.status, 400, 'TC02 phải trả về 400');
  assert.strictEqual(tc02Res.data.code, 'ERROR_0016_INVALID_COMBINATION');
  console.log('   ✅ [PASS] TC02: Trả về ERROR_0016_INVALID_COMBINATION chuẩn xác.\n');

  // TC03: Booking/Invoice không ở trạng thái chờ thanh toán -> ERROR_0015_PRECONDITION_FAILED
  console.log('👉 [5] TC03: Thanh toán cho booking đã CheckedIn (không ở trạng thái chờ cọc)...');
  const tc03Res = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: 998, // Booking đã checked in từ trước
      amount: 100000,
      method: 'Cash',
    }),
  });
  assert.strictEqual(tc03Res.status, 400, 'TC03 phải trả về 400');
  assert.strictEqual(tc03Res.data.code, 'ERROR_0015_PRECONDITION_FAILED');
  console.log('   ✅ [PASS] TC03: Trả về ERROR_0015_PRECONDITION_FAILED chuẩn xác.\n');

  // TC04: Số tiền amount vượt quá số dư còn phải thanh toán (D7) -> ERROR_0012_OUT_OF_RANGE
  console.log(`👉 [6] TC04: Số tiền thanh toán vượt quá số dư booking còn lại (nhập ${totalAmount + 1000000}đ)...`);
  const tc04Res = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: totalAmount + 1000000,
      method: 'Cash',
    }),
  });
  assert.strictEqual(tc04Res.status, 400, 'TC04 phải trả về 400');
  assert.strictEqual(tc04Res.data.code, 'ERROR_0012_OUT_OF_RANGE');
  console.log('   ✅ [PASS] TC04: Trả về ERROR_0012_OUT_OF_RANGE chuẩn xác.\n');

  // TC05: Idempotency cho hình thức trực tuyến (VNPay / MoMo)
  console.log('👉 [7] TC05: Idempotency: Tạo yêu cầu VNPay lần 1, sau đó gọi lại lần 2 cho cùng context...');
  const tc05Res1 = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: 500000,
      method: 'VNPay',
      returnUrl: 'http://localhost:3000/checkout/payment',
    }),
  });
  assert.strictEqual(tc05Res1.status, 201);
  assert.strictEqual(tc05Res1.data.data.Status, 'Pending');
  const originalTxCode = tc05Res1.data.data.TransactionCode;
  const originalPaymentId = tc05Res1.data.data.PaymentId;

  // Gọi lần 2 ngay sau đó
  const tc05Res2 = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: 500000,
      method: 'VNPay',
      returnUrl: 'http://localhost:3000/checkout/payment',
    }),
  });
  assert.strictEqual(tc05Res2.status, 200, 'Lần 2 phải trả 200 với bản ghi cũ');
  assert.strictEqual(tc05Res2.data.data.PaymentId, originalPaymentId);
  assert.strictEqual(tc05Res2.data.data.TransactionCode, originalTxCode);
  console.log(`   ✅ [PASS] TC05: Idempotency thành công, trả về đúng bản ghi cũ #${originalPaymentId}.\n`);

  // TC06: Webhook xử lý thành công và Webhook idempotent khi gọi lại
  console.log(`👉 [8] TC06: Gọi Webhook xác nhận thành công cho transactionCode=${originalTxCode}...`);
  const webhookRes1 = await request('/payments/webhook/vnpay', {
    method: 'POST',
    body: JSON.stringify({
      transactionCode: originalTxCode,
      gatewayStatus: 'success',
      gatewayTransactionId: 'VNP-12345678',
      rawPayload: { simulated: true },
    }),
  });
  assert.strictEqual(webhookRes1.status, 200);
  assert.strictEqual(webhookRes1.data.data.Status, 'Paid');

  // Gọi lại Webhook lần 2 với cùng transactionCode đã Paid
  const webhookRes2 = await request('/payments/webhook/vnpay', {
    method: 'POST',
    body: JSON.stringify({
      transactionCode: originalTxCode,
      gatewayStatus: 'success',
      gatewayTransactionId: 'VNP-12345678',
    }),
  });
  assert.strictEqual(webhookRes2.status, 200, 'Webhook gọi lại phải trả 200 OK ngay');
  assert.strictEqual(webhookRes2.data.data.Status, 'Paid');
  console.log('   ✅ [PASS] TC06: Webhook xử lý chuyển Paid và đảm bảo tính Idempotent thành công.\n');

  // TC07: Tra cứu trạng thái giao dịch (GET /payments/:paymentId)
  console.log(`👉 [9] TC07: Tra cứu trạng thái qua GET /payments/${originalPaymentId}...`);
  const getStatusRes = await request(`/payments/${originalPaymentId}`);
  assert.strictEqual(getStatusRes.status, 200);
  assert.strictEqual(getStatusRes.data.data.Status, 'Paid');
  console.log('   ✅ [PASS] TC07: Tra cứu trạng thái thành công.\n');

  // TC08: Webhook gọi với transactionCode không tồn tại
  console.log('👉 [10] TC08: Webhook gọi với mã giao dịch không tồn tại...');
  const tc08Res = await request('/payments/webhook/vnpay', {
    method: 'POST',
    body: JSON.stringify({
      transactionCode: 'PMT-NON-EXISTENT-9999',
      gatewayStatus: 'success',
    }),
  });
  assert.strictEqual(tc08Res.status, 404, 'Mã không tồn tại phải trả về 404');
  console.log('   ✅ [PASS] TC08: Trả về 404 chuẩn xác cho gateway.\n');

  // TC09: Admin cố tình refund giao dịch đang ở Status = Pending -> ERROR_0013_INVALID_STATE_TRANSITION
  console.log('👉 [11] TC09: Tạo giao dịch VietQR mới (Pending) và cố tình gọi refund...');
  const vietQrRes = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: 200000,
      method: 'VietQR',
    }),
  });
  assert.strictEqual(vietQrRes.status, 201);
  const pendingTxCode = vietQrRes.data.data.TransactionCode;

  const refundPendingRes = await request(`/payments/${pendingTxCode}/refund`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      refundReason: 'Khách muốn hoàn cọc',
    }),
  });
  assert.strictEqual(refundPendingRes.status, 400);
  assert.strictEqual(refundPendingRes.data.code, 'ERROR_0013_INVALID_STATE_TRANSITION');
  console.log('   ✅ [PASS] TC09: Bắt lỗi ERROR_0013_INVALID_STATE_TRANSITION khi refund đơn Pending.\n');

  // TC10: Thu ngân tạo Payment method = Cash -> Paid ngay lập tức
  console.log('👉 [12] TC10: Thu ngân tạo Payment bằng Cash tại quầy...');
  const cashRes = await request('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingId: testBookingId,
      amount: 100000,
      method: 'Cash',
    }),
  });
  assert.strictEqual(cashRes.status, 201);
  assert.strictEqual(cashRes.data.data.Status, 'Paid', 'Cash phải có Status = Paid ngay');
  assert.strictEqual(cashRes.data.data.paymentUrl, undefined, 'Cash không có paymentUrl');
  const paidPaymentId = cashRes.data.data.PaymentId;
  console.log('   ✅ [PASS] TC10: Tạo thanh toán Cash thành công, Status = Paid ngay lập tức.\n');

  // TC11 (Bonus): Hoàn tiền hợp lệ cho giao dịch đã Paid
  console.log(`👉 [13] TC11: Hoàn tiền hợp lệ cho Payment #${paidPaymentId} (Status=Paid)...`);
  const refundSuccessRes = await request(`/payments/${paidPaymentId}/refund`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      refundReason: 'Khách huỷ đặt cọc phòng có báo trước theo quy định',
      refundAmount: 100000,
    }),
  });
  assert.strictEqual(refundSuccessRes.status, 200);
  assert.strictEqual(refundSuccessRes.data.data.Status, 'Refunded');
  assert.strictEqual(refundSuccessRes.data.data.RefundReason, 'Khách huỷ đặt cọc phòng có báo trước theo quy định');
  console.log('   ✅ [PASS] TC11: Hoàn tiền thành công, Status = Refunded.\n');

  console.log('====================================================');
  console.log('🎉 TẤT CẢ 11/11 TEST CASES C5 (FEAT-PAYMENT-01) ĐÃ PASS 100%!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
