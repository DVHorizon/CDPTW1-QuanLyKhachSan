'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const BASE_URL = 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

function createToken(userId, roleId, roleName) {
  return jwt.sign(
    { userId, roleId, roleName, username: `test_${roleName.toLowerCase()}` },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const { headers, ...restOptions } = options;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    ...restOptions,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG SPEC 8 (16 TEST CASES)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${extraInfo}`);
      failed++;
    }
  }

  const conn = await pool.getConnection();
  let confirmedBookingId = null;
  let cancelledBookingId = null;
  let checkedInBookingId = null;
  let validBookingCode = null;

  try {
    const [b1] = await conn.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, ConfirmationCode, CreatedAt)
       VALUES (1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2, 2, 0, 2400000, 500000, 'Confirmed', CONCAT('BKTEST-', FLOOR(RAND()*100000)), NOW())`
    );
    confirmedBookingId = b1.insertId;
    const [[b1Row]] = await conn.query('SELECT ConfirmationCode FROM Bookings WHERE BookingId = ?', [confirmedBookingId]);
    validBookingCode = b1Row.ConfirmationCode;

    const [b2] = await conn.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, ConfirmationCode, CreatedAt)
       VALUES (1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2, 2, 0, 2400000, 500000, 'Cancelled', CONCAT('BKCANC-', FLOOR(RAND()*100000)), NOW())`
    );
    cancelledBookingId = b2.insertId;

    const [b3] = await conn.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, ConfirmationCode, CreatedAt)
       VALUES (1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2, 2, 0, 2400000, 500000, 'CheckedIn', CONCAT('BKCHIN-', FLOOR(RAND()*100000)), NOW())`
    );
    checkedInBookingId = b3.insertId;

  } finally {
    conn.release();
  }

  const receptionistToken = createToken(2, 2, 'Receptionist');
  const guestToken = createToken(999, 5, 'Guest');

  // --- TEST CASE 1: Tài khoản không có CHECKIN_CREATE thực hiện check-in ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: validBookingCode }),
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(
      res.status === 403 && res.data.code === 'ERROR_0010_FORBIDDEN',
      'Test Case 1: Chặn tài khoản không có quyền CHECKIN_CREATE (403 ERROR_0010_FORBIDDEN)',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 1: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 2: Request không có token hoặc token hết hạn ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: validBookingCode }),
    });
    assert(
      res.status === 401 && res.data.code === 'ERROR_0009_UNAUTHENTICATED',
      'Test Case 2: Chặn request không có token (401 ERROR_0009_UNAUTHENTICATED)',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 2: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 3: Quét QR không hợp lệ ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: '   ' }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0016_INVALID_QR',
      'Test Case 3: Quét QR rỗng / không hợp lệ (400 ERROR_0016_INVALID_QR)',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 3: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 4: QR hợp lệ, booking tồn tại và Confirmed ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: validBookingCode }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 200 && res.data.success === true && res.data.data.bookingId === confirmedBookingId,
      'Test Case 4: QR hợp lệ, booking Confirmed trả về thông tin booking (200 OK)',
      `Status: ${res.status}, Data: ${JSON.stringify(res.data.data)}`
    );
  } catch (err) {
    assert(false, 'Test Case 4: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 5: Booking đã Cancelled ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: String(cancelledBookingId) }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0018_BOOKING_STATUS',
      'Test Case 5: Booking đã Cancelled trả về ERROR_0018_BOOKING_STATUS',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 5: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 6: Booking đã CheckedIn (Chống check-in trùng) ---
  try {
    const res = await apiRequest('/check-ins/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: String(checkedInBookingId) }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0018_BOOKING_STATUS',
      'Test Case 6: Booking đã CheckedIn báo lỗi trạng thái, không cho check-in lần 2',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 6: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 7: documentType bỏ trống ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentNumber: '079123456789',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1990-05-15',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0001_REQUIRED' && res.data.field === 'documentType',
      'Test Case 7: documentType bỏ trống báo lỗi ERROR_0001_REQUIRED',
      `Status: ${res.status}, Field: ${res.data.field}`
    );
  } catch (err) {
    assert(false, 'Test Case 7: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 8: CCCD = 12345678901 (11 số, sai độ dài) ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'CCCD',
        documentNumber: '12345678901',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1990-05-15',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0019_INVALID_DOCUMENT' && res.data.message.includes('12 chữ số'),
      'Test Case 8: Số CCCD không đúng 12 chữ số báo lỗi ERROR_0019_INVALID_DOCUMENT',
      `Status: ${res.status}, Message: ${res.data.message}`
    );
  } catch (err) {
    assert(false, 'Test Case 8: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 10: Passport = "AB 123456" (có khoảng trắng) ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'Passport',
        documentNumber: 'AB 123456',
        fullName: 'ALEXANDER MORGAN',
        dateOfBirth: '1988-04-15',
        nationality: 'Mỹ',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0019_INVALID_DOCUMENT' && res.data.message.includes('Passport'),
      'Test Case 10: Passport chứa khoảng trắng báo lỗi ERROR_0019_INVALID_DOCUMENT',
      `Status: ${res.status}, Message: ${res.data.message}`
    );
  } catch (err) {
    assert(false, 'Test Case 10: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 11: Ngày sinh lớn hơn ngày hiện tại ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'CCCD',
        documentNumber: '079123456789',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '2099-01-01',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0019_INVALID_DOCUMENT' && res.data.message.includes('lớn hơn ngày hiện tại'),
      'Test Case 11: Ngày sinh tương lai báo lỗi ERROR_0019_INVALID_DOCUMENT',
      `Status: ${res.status}, Message: ${res.data.message}`
    );
  } catch (err) {
    assert(false, 'Test Case 11: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 12: Passport có ngày hết hạn nhỏ hơn ngày check-in ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'Passport',
        documentNumber: 'B1234567',
        fullName: 'ALEXANDER MORGAN',
        dateOfBirth: '1988-04-15',
        nationality: 'Mỹ',
        documentExpiryDate: '2020-01-01',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0019_INVALID_DOCUMENT' && res.data.message.includes('hết hạn'),
      'Test Case 12: Passport đã hết hạn báo lỗi ERROR_0019_INVALID_DOCUMENT',
      `Status: ${res.status}, Message: ${res.data.message}`
    );
  } catch (err) {
    assert(false, 'Test Case 12: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 14: Happy case - Booking + CCCD hợp lệ check-in thành công ---
  const validDocNumber = '079' + Math.floor(100000000 + Math.random() * 900000000);
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'CCCD',
        documentNumber: validDocNumber,
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '15-05-1990',
        nationality: 'Việt Nam',
        gender: 'Nam',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 200 && res.data.code === 'SUCCESS_0004_CHECKED_IN' && res.data.data.status === 'CheckedIn',
      'Test Case 14: Check-in thành công với CCCD hợp lệ (200 SUCCESS_0004_CHECKED_IN)',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 14: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 13: Số giấy tờ đã thuộc hồ sơ khách khác đang lưu trú ---
  let anotherBookingId = null;
  const conn2 = await pool.getConnection();
  try {
    const [bNew] = await conn2.query(
      `INSERT INTO Bookings (UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children, TotalAmount, DepositAmount, Status, ConfirmationCode, CreatedAt)
       VALUES (1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2, 2, 0, 2400000, 500000, 'Confirmed', CONCAT('BKNEW-', FLOOR(RAND()*100000)), NOW())`
    );
    anotherBookingId = bNew.insertId;
  } finally {
    conn2.release();
  }

  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: anotherBookingId,
        documentType: 'CCCD',
        documentNumber: validDocNumber,
        fullName: 'TRẦN THỊ KHÁC',
        dateOfBirth: '1995-10-10',
        nationality: 'Việt Nam',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0020_DUPLICATE_DOCUMENT',
      'Test Case 13: Số giấy tờ trùng với hồ sơ khách khác báo ERROR_0020_DUPLICATE_DOCUMENT',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 13: Lỗi kết nối', err.message);
  }

  // --- TEST CASE 16: Check-in trùng liên tục trên booking đã CheckedIn ---
  try {
    const res = await apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        documentType: 'CCCD',
        documentNumber: validDocNumber,
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1990-05-15',
      }),
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    assert(
      res.status === 400 && res.data.code === 'ERROR_0018_BOOKING_STATUS',
      'Test Case 16: Bấm xác nhận lại trên booking đã CheckedIn bị từ chối chống submit trùng',
      `Status: ${res.status}, Code: ${res.data.code}`
    );
  } catch (err) {
    assert(false, 'Test Case 16: Lỗi kết nối', err.message);
  }

  console.log('================================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ SPEC 8: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  pool.end();
  process.exit(1);
});
