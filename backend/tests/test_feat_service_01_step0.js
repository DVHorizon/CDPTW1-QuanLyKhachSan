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
  console.log('🧪 BẮT ĐẦU TEST BƯỚC 0: DỌN NỀN & PHÂN QUYỀN DỊCH VỤ');
  console.log('====================================================\n');

  // 1. Đăng nhập Admin và Lễ tân
  console.log('👉 [1] Đăng nhập Admin & Lễ tân để lấy JWT Token...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: '123456' }),
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.token;
  console.log('   ✅ Đăng nhập Admin thành công.');

  const recLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'receptionist', password: '123456' }),
  });
  assert.strictEqual(recLogin.status, 200, 'Receptionist login failed');
  const recToken = recLogin.data.token;
  console.log('   ✅ Đăng nhập Lễ tân thành công.\n');

  // 2. TC01: Không có token
  console.log('👉 [2] TC01: POST /services/categories không có token...');
  const noTokenRes = await request('/services/categories', {
    method: 'POST',
    body: JSON.stringify({ categoryName: 'Test Nhóm Mới' }),
  });
  assert.strictEqual(noTokenRes.status, 401, 'Must return 401 Unauthenticated');
  assert.strictEqual(noTokenRes.data.code, 'ERROR_0009_UNAUTHENTICATED');
  console.log('   ✅ Nhận đúng 401 ERROR_0009_UNAUTHENTICATED.\n');

  // 3. TC02: Token Lễ tân (không có quyền manage_services)
  console.log('👉 [3] TC02: POST /services/categories với token Lễ tân...');
  const recPermRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: JSON.stringify({ categoryName: 'Test Nhóm Mới' }),
  });
  assert.strictEqual(recPermRes.status, 403, 'Must return 403 Forbidden for non-admin');
  assert.strictEqual(recPermRes.data.code, 'ERROR_0010_FORBIDDEN');
  console.log('   ✅ Nhận đúng 403 ERROR_0010_FORBIDDEN.\n');

  // 4. TC03: Admin gọi validation lỗi
  console.log('👉 [4] TC03: Kiểm tra các validation của POST /services/categories...');

  // 4.1 Thiếu categoryName
  const missingNameRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ categoryName: '   ' }),
  });
  assert.strictEqual(missingNameRes.status, 400);
  assert.strictEqual(missingNameRes.data.code, 'ERROR_0001_REQUIRED');
  console.log('   ✅ Bắt lỗi rỗng: ERROR_0001_REQUIRED.');

  // 4.2 Tên quá ngắn (< 2 ký tự)
  const shortNameRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ categoryName: 'A' }),
  });
  assert.strictEqual(shortNameRes.status, 400);
  assert.strictEqual(shortNameRes.data.code, 'ERROR_0002_MIN_LENGTH');
  console.log('   ✅ Bắt lỗi ngắn: ERROR_0002_MIN_LENGTH.');

  // 4.3 Tên quá dài (> 100 ký tự)
  const longNameRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ categoryName: 'X'.repeat(101) }),
  });
  assert.strictEqual(longNameRes.status, 400);
  assert.strictEqual(longNameRes.data.code, 'ERROR_0003_MAX_LENGTH');
  console.log('   ✅ Bắt lỗi dài: ERROR_0003_MAX_LENGTH.');

  // 4.4 Trùng lặp tên nhóm (case-insensitive & accent-insensitive)
  // Lấy 1 category sẵn có
  const listCatRes = await request('/services/categories');
  assert.strictEqual(listCatRes.status, 200);
  assert.ok(listCatRes.data.data.length > 0);
  const sampleCat = listCatRes.data.data[0];

  const duplicateRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ categoryName: sampleCat.CategoryName.toLowerCase() }),
  });
  assert.strictEqual(duplicateRes.status, 409);
  assert.strictEqual(duplicateRes.data.code, 'ERROR_0007_DUPLICATE');
  console.log(`   ✅ Bắt lỗi trùng lặp nhóm "${sampleCat.CategoryName}": ERROR_0007_DUPLICATE.`);

  // 4.5 Thêm mới thành công
  const uniqueName = `Nhóm Test ${Date.now()}`;
  const createSuccessRes = await request('/services/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      categoryName: uniqueName,
      description: 'Mô tả nhóm dịch vụ kiểm thử tự động',
    }),
  });
  assert.strictEqual(createSuccessRes.status, 201);
  assert.strictEqual(createSuccessRes.data.code, 'SUCCESS_0001_CREATED');
  assert.strictEqual(createSuccessRes.data.data.CategoryName, uniqueName);
  console.log(`   ✅ Tạo mới thành công nhóm: ${uniqueName} (201 SUCCESS_0001_CREATED).\n`);

  // 5. TC04: Kiểm tra POST /services/sync-pos đã được gỡ bỏ
  console.log('👉 [5] TC04: Kiểm tra POST /services/sync-pos đã bị gỡ bỏ...');
  const syncPosRes = await request('/services/sync-pos', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(syncPosRes.status, 404, 'Endpoint sync-pos must be removed (404)');
  console.log('   ✅ POST /services/sync-pos đã bị xóa hoàn toàn (trả 404 Not Found).\n');

  console.log('====================================================');
  console.log('🎉 TẤT CẢ TEST CASES BƯỚC 0 ĐÃ VƯỢT QUA 100%!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử Bước 0 thất bại:', err);
  process.exit(1);
});
