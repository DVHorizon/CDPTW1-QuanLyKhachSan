'use strict';

const assert = require('assert');

const API_BASE = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
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
  console.log('🧪 BẮT ĐẦU TEST FEAT-SERVICE-04 (C4): TIẾN ĐỘ ĐƠN DỊCH VỤ');
  console.log('====================================================\n');

  // 1. Đăng nhập Admin, Lễ tân và Khách hàng
  console.log('👉 [1] Đăng nhập Admin & Guest để lấy token kiểm thử...');
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

  // 2. Chuẩn bị đơn dịch vụ kiểm thử
  // Lấy 1 stay đang active
  const staysRes = await request('/service-orders/active-stays');
  assert.strictEqual(staysRes.status, 200);
  assert.ok(staysRes.data.data.length > 0, 'Cần ít nhất 1 Stay CheckedIn để test');
  const testStay = staysRes.data.data[0];

  // Lấy 1 dịch vụ active
  const servicesRes = await request('/services?status=Active');
  assert.strictEqual(servicesRes.status, 200);
  const testService = servicesRes.data.data[0];

  console.log(`👉 [2] Tạo đơn dịch vụ mẫu cho StayId=${testStay.StayId}, ServiceId=${testService.ServiceId}...`);
  const createOrderRes = await request('/service-orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      stayId: testStay.StayId,
      serviceId: testService.ServiceId,
      quantity: 1,
      note: 'Đơn test C4 tự động',
    }),
  });
  assert.strictEqual(createOrderRes.status, 201);
  const createdOrder = Array.isArray(createOrderRes.data.data)
    ? createOrderRes.data.data[0]
    : createOrderRes.data.data;
  const orderId = createdOrder.OrderId;
  console.log(`   ✅ Đã tạo đơn dịch vụ Test OrderId=${orderId}, Status=${createdOrder.Status}.\n`);

  // --- TC06: orderId không tồn tại (999999) ---
  console.log('👉 [3] TC06: Gọi PATCH với orderId không tồn tại (999999)...');
  const notFoundRes = await request('/service-orders/999999/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'InProgress' }),
  });
  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundRes.data.code, 'ERROR_0011_NOT_FOUND');
  console.log('   ✅ [PASS] TC06: Trả về 404 ERROR_0011_NOT_FOUND chuẩn xác.\n');

  // --- TC04: newStatus = Cancelled, cancelReason = "" ---
  console.log('👉 [4] TC04: newStatus = Cancelled nhưng cancelReason để trống...');
  const emptyCancelReasonRes = await request(`/service-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'Cancelled', cancelReason: '   ' }),
  });
  assert.strictEqual(emptyCancelReasonRes.status, 400);
  assert.strictEqual(emptyCancelReasonRes.data.code, 'ERROR_0001_REQUIRED');
  console.log('   ✅ [PASS] TC04: Trả về 400 ERROR_0001_REQUIRED khi thiếu cancelReason.\n');

  // --- TC05: orderId đang Received, nhân viên chuyển thẳng sang Completed ---
  console.log('👉 [5] TC05: orderId đang Received, nhân viên chuyển thẳng sang Completed...');
  const completeFastRes = await request(`/service-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'Completed' }),
  });
  assert.strictEqual(completeFastRes.status, 200);
  assert.strictEqual(completeFastRes.data.code, 'SUCCESS_0001_CREATED');
  assert.strictEqual(completeFastRes.data.data.Status, 'Completed');
  console.log('   ✅ [PASS] TC05: Chuyển thẳng Received -> Completed thành công (200 OK).\n');

  // --- TC01: orderId đang Completed, gọi PATCH → InProgress ---
  console.log('👉 [6] TC01: orderId đang Completed, gọi PATCH → InProgress (Chuyển trạng thái bất hợp lệ)...');
  const invalidTransitionRes = await request(`/service-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'InProgress' }),
  });
  assert.strictEqual(invalidTransitionRes.status, 400);
  assert.strictEqual(invalidTransitionRes.data.code, 'ERROR_0013_INVALID_STATE_TRANSITION');
  assert.strictEqual(
    invalidTransitionRes.data.message,
    'Không thể chuyển trạng thái từ Completed sang InProgress'
  );
  console.log('   ✅ [PASS] TC01: Trả về ERROR_0013_INVALID_STATE_TRANSITION đúng nguyên văn spec.\n');

  // --- Tạo đơn mới cho TC02 và TC03 ---
  console.log('👉 [7] Tạo đơn dịch vụ mới để kiểm thử quyền huỷ của Guest (TC02 & TC03)...');
  const order2Res = await request('/service-orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      stayId: testStay.StayId,
      serviceId: testService.ServiceId,
      quantity: 2,
      note: 'Đơn test quyền Guest',
    }),
  });
  assert.strictEqual(order2Res.status, 201);
  const order2 = Array.isArray(order2Res.data.data) ? order2Res.data.data[0] : order2Res.data.data;
  const order2Id = order2.OrderId;
  const initialTotalPrice = order2.TotalPrice;

  // Giả định gán quyền cho Guest sở hữu đơn này qua Booking/Stay
  // Nhân viên chuyển đơn 2 sang InProgress
  const toInProgressRes = await request(`/service-orders/${order2Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'InProgress' }),
  });
  assert.strictEqual(toInProgressRes.status, 200);

  // --- TC03: orderId đang InProgress, Guest chủ đơn cố tự huỷ ---
  console.log('👉 [8] TC03: orderId đang InProgress, Guest cố tình tự huỷ...');
  const guestCancelInProgressRes = await request(`/service-orders/${order2Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${guestToken}` },
    body: JSON.stringify({ newStatus: 'Cancelled', cancelReason: 'Muốn huỷ khi đang làm' }),
  });
  assert.strictEqual(guestCancelInProgressRes.status, 403);
  assert.strictEqual(guestCancelInProgressRes.data.code, 'ERROR_0010_FORBIDDEN');
  console.log('   ✅ [PASS] TC03: Trả về 403 ERROR_0010_FORBIDDEN ("Đơn đang được xử lý, vui lòng liên hệ lễ tân để huỷ").\n');

  // --- Tạo đơn thứ 3 ở trạng thái Received để test TC02 ---
  console.log('👉 [9] Tạo đơn dịch vụ thứ 3 ở trạng thái Received để test TC02 (Nhân viên hoặc Guest huỷ hợp lệ)...');
  const order3Res = await request('/service-orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      stayId: testStay.StayId,
      serviceId: testService.ServiceId,
      quantity: 1,
      note: 'Đơn test huỷ khi Received',
    }),
  });
  assert.strictEqual(order3Res.status, 201);
  const order3 = Array.isArray(order3Res.data.data) ? order3Res.data.data[0] : order3Res.data.data;
  const order3Id = order3.OrderId;

  // --- TC02: orderId đang Received, huỷ với cancelReason = "Đổi ý" ---
  console.log('👉 [10] TC02: orderId đang Received, huỷ với cancelReason = "Đổi ý"...');
  const cancelSuccessRes = await request(`/service-orders/${order3Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newStatus: 'Cancelled', cancelReason: 'Đổi ý' }),
  });
  assert.strictEqual(cancelSuccessRes.status, 200);
  assert.strictEqual(cancelSuccessRes.data.code, 'SUCCESS_0001_CREATED');
  assert.strictEqual(cancelSuccessRes.data.data.Status, 'Cancelled');
  assert.strictEqual(cancelSuccessRes.data.data.Note, 'Đổi ý');
  assert.strictEqual(Number(cancelSuccessRes.data.data.TotalPrice), Number(order3.TotalPrice));
  console.log('   ✅ [PASS] TC02: Huỷ thành công, Status=Cancelled, Note="Đổi ý", TotalPrice không đổi.\n');

  console.log('====================================================');
  console.log('🎉 TẤT CẢ 6/6 TEST CASES C4 (FEAT-SERVICE-04) ĐÃ PASS 100%!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử C4 thất bại:', err);
  process.exit(1);
});
