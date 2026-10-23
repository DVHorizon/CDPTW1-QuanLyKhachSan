const assert = require('assert');

const API_BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU TEST TOÀN DIỆN FEAT-USER-01 (SPEC 3)');
  console.log('====================================================\n');

  // 1. Đăng nhập với tài khoản Admin
  console.log('👉 [1] Đăng nhập Admin (admin / 123456)...');
  const adminLogin = await request('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin', password: '123456' })
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  assert.ok(adminLogin.data.token, 'Token not received for admin');
  assert.strictEqual(adminLogin.data.user.roleId, 1, 'Admin roleId must be 1');
  const adminToken = adminLogin.data.token;
  const adminId = adminLogin.data.user.userId;
  console.log('   ✅ Đăng nhập Admin thành công. UserId:', adminId);

  // 2. Đăng nhập Lễ tân
  console.log('👉 [2] Đăng nhập Lễ tân (receptionist / 123456)...');
  const recLogin = await request('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'receptionist', password: '123456' })
  });
  assert.strictEqual(recLogin.status, 200, 'Receptionist login failed');
  const recToken = recLogin.data.token;
  console.log('   ✅ Đăng nhập Lễ tân thành công. RoleId:', recLogin.data.user.roleId);

  // 3. Test Case 1: Lễ tân gọi API thêm tài khoản -> Phải nhận 403 ERROR_0010_FORBIDDEN
  console.log('👉 [3] Test Case 1: Lễ tân gọi POST /v1/users...');
  const recCreate = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
    body: JSON.stringify({ username: 'testuser' })
  });
  assert.strictEqual(recCreate.status, 403, 'Must return 403 Forbidden');
  assert.strictEqual(recCreate.data.code, 'ERROR_0010_FORBIDDEN');
  console.log('   ✅ Nhận 403 ERROR_0010_FORBIDDEN:', recCreate.data.message);

  // 4. Test Case 2: Request không có token -> Phải nhận 401 ERROR_0009_UNAUTHENTICATED
  console.log('👉 [4] Test Case 2: Gọi API không token...');
  const noTokenRes = await request('/v1/users');
  assert.strictEqual(noTokenRes.status, 401, 'Must return 401');
  assert.strictEqual(noTokenRes.data.code, 'ERROR_0009_UNAUTHENTICATED');
  console.log('   ✅ Nhận 401 ERROR_0009_UNAUTHENTICATED:', noTokenRes.data.message);

  // 5. Test Case 3: username < 4 ký tự ("ab") -> ERROR_0002_MIN_LENGTH
  console.log('👉 [5] Test Case 3: username="ab"...');
  const shortUserRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'ab', fullName: 'Nguyễn Văn A' })
  });
  assert.strictEqual(shortUserRes.status, 400);
  assert.strictEqual(shortUserRes.data.code, 'ERROR_0002_MIN_LENGTH');
  console.log('   ✅ Bắt lỗi username ngắn:', shortUserRes.data.message);

  // 6. Test Case 4: username có khoảng trắng -> ERROR_0004_INVALID_FORMAT
  console.log('👉 [6] Test Case 4: username="nguyen van a"...');
  const spaceUserRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'nguyen van a', fullName: 'Nguyễn Văn A' })
  });
  assert.strictEqual(spaceUserRes.status, 400);
  assert.strictEqual(spaceUserRes.data.code, 'ERROR_0004_INVALID_FORMAT');
  console.log('   ✅ Bắt lỗi ký tự không hợp lệ:', spaceUserRes.data.message);

  // 7. Test Case 5: username đã tồn tại ("Admin") -> ERROR_0007_DUPLICATE
  console.log('👉 [7] Test Case 5: username="Admin" (case-insensitive duplicate)...');
  const dupUserRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'Admin', fullName: 'Trùng Lặp' })
  });
  assert.strictEqual(dupUserRes.status, 400);
  assert.strictEqual(dupUserRes.data.code, 'ERROR_0007_DUPLICATE');
  console.log('   ✅ Bắt lỗi trùng lặp username:', dupUserRes.data.message);

  // 8. Test Case 6: email sai format -> ERROR_0004_INVALID_FORMAT
  console.log('👉 [8] Test Case 6: email="abc@"...');
  const badEmailRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      username: 'valid_user_test',
      fullName: 'Valid Name',
      email: 'abc@'
    })
  });
  assert.strictEqual(badEmailRes.status, 400);
  assert.strictEqual(badEmailRes.data.code, 'ERROR_0004_INVALID_FORMAT');
  console.log('   ✅ Bắt lỗi email sai định dạng:', badEmailRes.data.message);

  // 9. Test Case 7: password yếu ("12345678" - không có chữ hoa/thường) -> ERROR_0005_PASSWORD_WEAK
  console.log('👉 [9] Test Case 7: password="12345678"...');
  const weakPassRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      username: 'valid_user_test',
      fullName: 'Valid Name',
      email: 'valid_test@hoteldomain.vn',
      password: '12345678'
    })
  });
  assert.strictEqual(weakPassRes.status, 400);
  assert.strictEqual(weakPassRes.data.code, 'ERROR_0005_PASSWORD_WEAK');
  console.log('   ✅ Bắt lỗi mật khẩu yếu:', weakPassRes.data.message);

  // 10. Test Case 8: Không chọn vai trò -> ERROR_0001_REQUIRED
  console.log('👉 [10] Test Case 8: Chưa chọn vai trò...');
  const noRoleRes = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      username: 'valid_user_test',
      fullName: 'Valid Name',
      email: 'valid_test@hoteldomain.vn',
      password: 'Password123'
    })
  });
  assert.strictEqual(noRoleRes.status, 400);
  assert.strictEqual(noRoleRes.data.code, 'ERROR_0001_REQUIRED');
  console.log('   ✅ Bắt lỗi thiếu vai trò:', noRoleRes.data.message);

  // 11. Test Case 9: Admin tự khóa chính mình -> ERROR_0016_CANNOT_SELF_LOCK
  console.log('👉 [11] Test Case 9: Tự khóa chính mình...');
  const selfLockRes = await request(`/v1/users/${adminId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Locked' })
  });
  assert.strictEqual(selfLockRes.status, 400);
  assert.strictEqual(selfLockRes.data.code, 'ERROR_0016_CANNOT_SELF_LOCK');
  console.log('   ✅ Bắt lỗi tự khóa chính mình:', selfLockRes.data.message);

  // 12. Test Case 10: Admin tự xóa chính mình -> ERROR_0018_CANNOT_SELF_DELETE
  console.log('👉 [12] Test Case 10: Tự xóa chính mình...');
  const selfDelRes = await request(`/v1/users/${adminId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(selfDelRes.status, 400);
  assert.strictEqual(selfDelRes.data.code, 'ERROR_0018_CANNOT_SELF_DELETE');
  console.log('   ✅ Bắt lỗi tự xóa chính mình:', selfDelRes.data.message);

  // 13. Test Case 15: Happy Path - Thêm mới tài khoản hợp lệ
  console.log('👉 [13] Test Case 15: Thêm mới tài khoản hợp lệ...');
  const testUsername = `teststaff_${Date.now()}`;
  const testEmail = `${testUsername}@hoteldomain.vn`;
  const testPhone = `09${String(Date.now()).slice(-8)}`;
  const createSuccess = await request('/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      username: testUsername,
      fullName: 'Nhân Viên Kiểm Thử Spec 3',
      email: testEmail,
      phone: testPhone,
      password: 'Password123',
      roleId: 2 // Lễ tân
    })
  });
  assert.strictEqual(createSuccess.status, 201, 'Create staff failed: ' + JSON.stringify(createSuccess.data));
  assert.strictEqual(createSuccess.data.code, 'SUCCESS_0001_CREATED');
  const createdUserId = createSuccess.data.data.userId;
  console.log('   ✅ Tạo tài khoản thành công:', createSuccess.data.message, 'ID:', createdUserId);

  // 14. Test Case 14: Đặt lại mật khẩu ngẫu nhiên
  console.log('👉 [14] Test Case 14: Đặt lại mật khẩu (Reset password)...');
  const resetRes = await request(`/v1/users/${createdUserId}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(resetRes.status, 200);
  assert.ok(resetRes.data.temporaryPassword, 'Must return temporary password');
  console.log('   ✅ Mật khẩu tạm thời sinh ra:', resetRes.data.temporaryPassword);

  // 15. Khóa tài khoản nhân viên mới tạo
  console.log('👉 [15] Khóa tài khoản nhân viên mới tạo...');
  const lockRes = await request(`/v1/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Locked' })
  });
  assert.strictEqual(lockRes.status, 200);
  console.log('   ✅ Đã khóa tài khoản thành công');

  // 16. Test đăng nhập tài khoản bị khóa -> Phải nhận thông báo bị khóa
  console.log('👉 [16] Đăng nhập bằng tài khoản vừa bị khóa...');
  const lockedLogin = await request('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUsername, password: resetRes.data.temporaryPassword })
  });
  assert.strictEqual(lockedLogin.status, 403);
  assert.strictEqual(lockedLogin.data.code, 'ERROR_0010_FORBIDDEN');
  console.log('   ✅ Đăng nhập bị chặn vì tài khoản bị khóa:', lockedLogin.data.message);

  // 17. Xóa mềm tài khoản
  console.log('👉 [17] Xóa mềm tài khoản nhân viên kiểm thử...');
  const delRes = await request(`/v1/users/${createdUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(delRes.status, 200);
  assert.strictEqual(delRes.data.code, 'SUCCESS_0003_DELETED');
  console.log('   ✅ Xóa mềm thành công:', delRes.data.message);

  // 18. Kiểm tra danh mục vai trò
  console.log('👉 [18] Lấy danh mục 4 vai trò cố định (/v1/roles)...');
  const rolesRes = await request('/v1/roles', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(rolesRes.status, 200);
  assert.strictEqual(rolesRes.data.data.length, 4);
  console.log('   ✅ 4 vai trò nội bộ:', rolesRes.data.data.map(r => r.roleName).join(', '));

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ 18/18 TEST CASE FEAT-USER-01 (SPEC 3) ĐÃ VƯỢT QUA!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
