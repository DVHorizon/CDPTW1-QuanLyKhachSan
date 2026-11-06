'use strict';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

// Lưu ảnh Base64 thành file vật lý trong public/uploads
function saveBase64Image(base64Str, subfolder = 'id_cards', prefix = 'SCAN') {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return null;
  }
  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const rawExt = matches[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
    const dataBuffer = Buffer.from(matches[2], 'base64');

    const uploadDir = path.join(__dirname, '../../../public/uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanPrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${cleanPrefix}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, dataBuffer);
    return `/uploads/${subfolder}/${filename}`;
  } catch (err) {
    console.warn('saveBase64Image warning:', err.message);
    return null;
  }
}

// Chuyển đổi ngày sang YYYY-MM-DD
function parseToIsoDate(dStr) {
  if (!dStr) return null;
  const str = String(dStr).trim();
  // dd-MM-yyyy hoặc dd/MM/yyyy
  const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(str);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // yyyy-MM-dd
  const ymdMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(str);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const p = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  }
  return null;
}

// Lấy ngày hôm nay theo múi giờ hệ thống dạng YYYY-MM-DD
function getTodayIso() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * Giải mã payload mã QR booking theo Spec 8
 */
function decodeQrPayload(qrPayload) {
  if (!qrPayload || typeof qrPayload !== 'string') return null;
  const raw = qrPayload.trim();
  if (!raw) return null;

  // 1. Thử parse dạng JSON payload
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      // Nếu payload có token, verify tính hợp lệ & hết hạn
      if (parsed.token) {
        try {
          const decoded = jwt.verify(parsed.token, JWT_SECRET);
          if (decoded && (decoded.bookingCode || decoded.bookingId)) {
            return {
              bookingCode: decoded.bookingCode || decoded.code || String(decoded.bookingId),
              tokenValid: true,
            };
          }
        } catch (jwtErr) {
          // Token không hợp lệ hoặc hết hạn
          return { isExpiredOrInvalidToken: true };
        }
      }
      // Nếu có expiry trong json
      if (parsed.exp || parsed.expiry) {
        const expTime = Number(parsed.exp || parsed.expiry);
        if (expTime && Date.now() > expTime) {
          return { isExpiredOrInvalidToken: true };
        }
      }
      const bCode = parsed.bookingCode || parsed.code || parsed.bookingId || parsed.ConfirmationCode;
      if (bCode) {
        return { bookingCode: String(bCode).trim() };
      }
    } catch (_) {
      // Không phải JSON chuẩn
    }
  }

  // 2. Thử dạng URL (VD: https://grandhorizon.com/check-in?code=GHNDF2TAGMLT)
  const urlMatch = raw.match(/(?:booking|ref|code)=([A-Za-z0-9_-]+)/i);
  if (urlMatch) {
    return { bookingCode: urlMatch[1].trim() };
  }

  // 3. Khớp mã booking định dạng GH... hoặc BK... hoặc chuỗi mã
  const ghMatch = raw.match(/GH[A-Z0-9]{6,16}/i) || raw.match(/BK[A-Z0-9_-]{4,16}/i);
  if (ghMatch) {
    return { bookingCode: ghMatch[0].trim() };
  }

  // 4. Nếu là chuỗi ký tự hợp lệ thông thường (1 - 64 ký tự alnum)
  if (/^[A-Za-z0-9_-]{1,64}$/.test(raw)) {
    return { bookingCode: raw };
  }

  return null;
}

/**
 * Tra cứu thông tin booking đầy đủ từ DB theo mã BookingCode / BookingId
 */
async function findBookingByCodeOrId(codeOrId, connOrPool = pool) {
  const clean = String(codeOrId || '').trim();
  if (!clean) return null;

  const isNum = /^\d+$/.test(clean);
  const sql = `
    SELECT
      b.BookingId,
      b.ConfirmationCode,
      CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
      CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
      b.NumberOfNights,
      b.Adults,
      b.Children,
      b.TotalAmount,
      b.DepositAmount,
      b.Status AS BookingStatus,
      b.BookingSource,
      b.Note,
      CAST(b.CreatedAt AS CHAR)    AS CreatedAt,
      b.CheckedInAt,
      b.CheckedInBy,
      COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
      COALESCE(bg.Phone, u.Phone, '') AS GuestPhone,
      COALESCE(bg.Email, u.Email, '') AS GuestEmail,
      COALESCE(bg.IdNumber, u.IdNumber, '') AS IdNumber,
      COALESCE(bg.IdType, u.IdType, 'CCCD') AS IdType,
      CAST(COALESCE(bg.DateOfBirth, u.DateOfBirth) AS CHAR) AS DateOfBirth,
      rt.RoomTypeId,
      COALESCE(rt.TypeName, 'Phòng Tiêu Chuẩn') AS RoomTypeName,
      rt.BasePrice,
      s.StayId,
      s.Status AS StayStatus,
      r.RoomId,
      r.RoomNumber,
      r.Floor,
      r.Status AS RoomStatus
    FROM Bookings b
    LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
    LEFT JOIN Users u ON b.UserId = u.UserId
    LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
    LEFT JOIN Stays s ON b.BookingId = s.BookingId
    LEFT JOIN Rooms r ON s.RoomId = r.RoomId
    WHERE (b.ConfirmationCode = ? ${isNum ? 'OR b.BookingId = ?' : ''})
      AND b.IsDeleted = 0
    ORDER BY b.BookingId DESC
    LIMIT 1
  `;
  const params = isNum ? [clean, Number(clean)] : [clean];
  const [rows] = await connOrPool.query(sql, params);
  return rows.length ? rows[0] : null;
}

/**
 * ─── POST /api/v1/check-ins/scan-qr (Spec 8 Endpoint 1) ──────────────────────
 * Quét & decode booking QR code payload, kiểm tra trạng thái booking, trả về thông tin xác thực
 */
async function scanQrCode(req, res) {
  try {
    const { qrPayload } = req.body;

    if (!qrPayload || typeof qrPayload !== 'string' || !qrPayload.trim()) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_INVALID_QR',
        errorCode: 'ERROR_0016_INVALID_QR',
        message: 'Mã QR booking không hợp lệ hoặc đã hết hạn',
      });
    }

    const decoded = decodeQrPayload(qrPayload);
    if (!decoded || decoded.isExpiredOrInvalidToken || !decoded.bookingCode) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_INVALID_QR',
        errorCode: 'ERROR_0016_INVALID_QR',
        message: 'Mã QR booking không hợp lệ hoặc đã hết hạn',
      });
    }

    // Tra cứu booking từ DB
    const booking = await findBookingByCodeOrId(decoded.bookingCode);

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0017_BOOKING_NOT_FOUND',
        errorCode: 'ERROR_0017_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking từ mã QR',
      });
    }

    // Quy tắc 3.2 & Test Cases 5, 6:
    // Booking phải ở trạng thái cho phép check-in: Confirmed (hoặc Allocated).
    // Booking Pending/Cancelled/NoShow/CheckedOut/đã CheckedIn không được check-in lần nữa.
    const allowedStatuses = ['Confirmed', 'Allocated'];
    if (!allowedStatuses.includes(booking.BookingStatus)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0018_BOOKING_STATUS',
        errorCode: 'ERROR_0018_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép check-in',
        currentStatus: booking.BookingStatus,
      });
    }

    const totalGuests = (Number(booking.Adults) || 1) + (Number(booking.Children) || 0);

    return res.status(200).json({
      success: true,
      message: 'Xác thực mã QR booking thành công',
      data: {
        bookingId: booking.BookingId,
        bookingCode: booking.ConfirmationCode || `BK-${booking.BookingId}`,
        guestName: booking.GuestName,
        phone: booking.GuestPhone,
        email: booking.GuestEmail,
        idNumber: booking.IdNumber,
        idType: booking.IdType,
        dateOfBirth: booking.DateOfBirth,
        checkInDate: String(booking.CheckInDate).slice(0, 10),
        checkOutDate: String(booking.CheckOutDate).slice(0, 10),
        numberOfNights: booking.NumberOfNights,
        totalGuests,
        adults: booking.Adults,
        children: booking.Children,
        roomTypeId: booking.RoomTypeId,
        roomTypeName: booking.RoomTypeName,
        roomId: booking.RoomId || null,
        roomNumber: booking.RoomNumber || null,
        roomStatus: booking.RoomStatus || null,
        totalAmount: Number(booking.TotalAmount) || 0,
        depositAmount: Number(booking.DepositAmount) || 0,
        status: booking.BookingStatus,
      },
    });
  } catch (err) {
    console.error('scanQrCode error:', err);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0021_CHECKIN_TRANSACTION',
      errorCode: 'ERROR_0021_CHECKIN_TRANSACTION',
      message: 'Không thể hoàn tất check-in, vui lòng thử lại',
      error: err.message,
    });
  }
}

/**
 * ─── GET /api/v1/bookings/{bookingCode} (Spec 8 Endpoint 2) ───────────────────
 * Tra cứu thông tin booking theo mã bookingCode / confirmationCode
 */
async function getBookingByCode(req, res) {
  try {
    const { bookingCode } = req.params;
    const cleanCode = String(bookingCode || '').trim();

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        errorCode: 'ERROR_0001_REQUIRED',
        message: 'Mã booking không được để trống',
      });
    }

    const booking = await findBookingByCodeOrId(cleanCode);

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0017_BOOKING_NOT_FOUND',
        errorCode: 'ERROR_0017_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking từ mã QR',
      });
    }

    const totalGuests = (Number(booking.Adults) || 1) + (Number(booking.Children) || 0);

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking.BookingId,
        bookingCode: booking.ConfirmationCode || `BK-${booking.BookingId}`,
        guestName: booking.GuestName,
        phone: booking.GuestPhone,
        email: booking.GuestEmail,
        idNumber: booking.IdNumber,
        idType: booking.IdType,
        dateOfBirth: booking.DateOfBirth,
        checkInDate: String(booking.CheckInDate).slice(0, 10),
        checkOutDate: String(booking.CheckOutDate).slice(0, 10),
        numberOfNights: booking.NumberOfNights,
        totalGuests,
        adults: booking.Adults,
        children: booking.Children,
        roomTypeId: booking.RoomTypeId,
        roomTypeName: booking.RoomTypeName,
        roomId: booking.RoomId || null,
        roomNumber: booking.RoomNumber || null,
        roomStatus: booking.RoomStatus || null,
        totalAmount: Number(booking.TotalAmount) || 0,
        depositAmount: Number(booking.DepositAmount) || 0,
        status: booking.BookingStatus,
      },
    });
  } catch (err) {
    console.error('getBookingByCode error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tra cứu đặt phòng: ' + err.message,
    });
  }
}

/**
 * ─── POST /api/v1/check-ins (Spec 8 Endpoint 3) ──────────────────────────────
 * Hoàn tất giao dịch Check-in, xác thực CCCD/Passport, cập nhật trạng thái phòng, lưu hồ sơ
 */
async function processCheckIn(req, res) {
  const {
    bookingId,
    bookingCode,
    documentType,
    documentNumber,
    fullName,
    dateOfBirth,
    gender = 'Khác',
    nationality,
    documentExpiryDate,
    roomId,
    signatureData,
    idCardImage,
    keycardCount = 2,
    dispatchNfc = true,
  } = req.body;

  // 1. Kiểm tra mã booking
  const targetBookingId = bookingId || bookingCode;
  if (!targetBookingId) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      errorCode: 'ERROR_0001_REQUIRED',
      field: 'bookingId',
      message: 'Mã booking không được để trống',
    });
  }

  // 2. Validate Loại giấy tờ (Mục 5.1 & Test Case 7)
  if (!documentType || !String(documentType).trim()) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      errorCode: 'ERROR_0001_REQUIRED',
      field: 'documentType',
      message: 'Loại giấy tờ không được để trống',
    });
  }

  const cleanDocType = String(documentType).trim();
  const validDocTypes = ['CCCD', 'Passport'];
  if (!validDocTypes.includes(cleanDocType)) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0019_INVALID_DOCUMENT',
      errorCode: 'ERROR_0019_INVALID_DOCUMENT',
      field: 'documentType',
      message: 'Thông tin CCCD/Passport không hợp lệ',
    });
  }

  // 3. Validate Số CCCD / Passport (Mục 5.1 & Test Cases 8, 9, 10)
  if (!documentNumber || !String(documentNumber).trim()) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      errorCode: 'ERROR_0001_REQUIRED',
      field: 'documentNumber',
      message: 'Số CCCD/Passport không được để trống',
    });
  }

  const cleanDocNum = String(documentNumber).trim();

  if (cleanDocType === 'CCCD') {
    // Đúng 12 chữ số
    if (!/^\d{12}$/.test(cleanDocNum)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0019_INVALID_DOCUMENT',
        errorCode: 'ERROR_0019_INVALID_DOCUMENT',
        field: 'documentNumber',
        message: 'Số CCCD phải gồm đúng 12 chữ số',
      });
    }
  } else if (cleanDocType === 'Passport') {
    // 6 đến 9 ký tự chữ và số, không khoảng trắng
    if (!/^[A-Za-z0-9]{6,9}$/.test(cleanDocNum)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0019_INVALID_DOCUMENT',
        errorCode: 'ERROR_0019_INVALID_DOCUMENT',
        field: 'documentNumber',
        message: 'Số Passport phải gồm 6 đến 9 ký tự chữ và số',
      });
    }
  }

  // 4. Validate Họ và tên (Mục 5.1 & Mục 2: 2-150 ký tự)
  const cleanFullName = String(fullName || '').trim();
  if (!cleanFullName || cleanFullName.length < 2 || cleanFullName.length > 150) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0019_INVALID_DOCUMENT',
      errorCode: 'ERROR_0019_INVALID_DOCUMENT',
      field: 'fullName',
      message: 'Họ và tên trên giấy tờ không hợp lệ',
    });
  }

  // 5. Validate Ngày sinh (Mục 5.1 & Test Case 11: không được lớn hơn ngày hiện tại)
  if (!dateOfBirth) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      errorCode: 'ERROR_0001_REQUIRED',
      field: 'dateOfBirth',
      message: 'Ngày sinh không được để trống',
    });
  }

  const isoDob = parseToIsoDate(dateOfBirth);
  const todayIso = getTodayIso();

  if (!isoDob || isoDob > todayIso) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0019_INVALID_DOCUMENT',
      errorCode: 'ERROR_0019_INVALID_DOCUMENT',
      field: 'dateOfBirth',
      message: 'Ngày sinh không được lớn hơn ngày hiện tại',
    });
  }

  // 6. Validate Quốc tịch (Mục 5.1: Bắt buộc, mặc định Việt Nam nếu CCCD)
  let cleanNationality = String(nationality || '').trim();
  if (!cleanNationality) {
    if (cleanDocType === 'CCCD') {
      cleanNationality = 'Việt Nam';
    } else {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        errorCode: 'ERROR_0001_REQUIRED',
        field: 'nationality',
        message: 'Quốc tịch không được để trống',
      });
    }
  }

  // 7. Validate Ngày hết hạn Passport (Mục 5.1 & Test Case 12: nếu có, không được nhỏ hơn ngày check-in/hôm nay)
  let isoExpiry = null;
  if (documentExpiryDate) {
    isoExpiry = parseToIsoDate(documentExpiryDate);
  }

  if (cleanDocType === 'Passport' && isoExpiry && isoExpiry < todayIso) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0019_INVALID_DOCUMENT',
      errorCode: 'ERROR_0019_INVALID_DOCUMENT',
      field: 'documentExpiryDate',
      message: 'Passport đã hết hạn, không thể hoàn tất check-in',
    });
  }

  // 8. Kiểm tra trùng số giấy tờ với hồ sơ khách khác (Mục 5.1 & Test Case 13: ERROR_0020_DUPLICATE_DOCUMENT)
  try {
    const isNumBooking = /^\d+$/.test(String(targetBookingId));
    let dupDocs = [];
    try {
      const [r] = await pool.query(
        `SELECT bg.BookingGuestId AS DocumentId, bg.BookingId, bg.FullName, b.Status AS BookingStatus
         FROM BookingGuests bg
         JOIN Bookings b ON bg.BookingId = b.BookingId
         WHERE bg.IdNumber = ?
           AND (b.Status IN ('CheckedIn', 'InHouse') OR bg.FullName != ?)
           ${isNumBooking ? 'AND bg.BookingId != ?' : 'AND b.ConfirmationCode != ?'}
         LIMIT 1`,
        [cleanDocNum, cleanFullName, isNumBooking ? Number(targetBookingId) : String(targetBookingId)]
      );
      dupDocs = r;
    } catch (_) {}

    if (dupDocs.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0020_DUPLICATE_DOCUMENT',
        errorCode: 'ERROR_0020_DUPLICATE_DOCUMENT',
        field: 'documentNumber',
        message: 'Số giấy tờ đã được sử dụng cho hồ sơ khác',
      });
    }
  } catch (dupErr) {
    console.warn('Check duplicate document warning:', dupErr.message);
  }

  // ─── THỰC HIỆN DATABASE TRANSACTION ────────────────────────────────────────
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Khóa và kiểm tra booking bằng SELECT ... FOR UPDATE
    const isNum = /^\d+$/.test(String(targetBookingId));
    const [bookingRows] = await conn.query(
      `SELECT BookingId, ConfirmationCode, Status, RoomTypeId, CheckInDate, CheckOutDate
       FROM Bookings
       WHERE (BookingId = ? ${!isNum ? 'OR ConfirmationCode = ?' : ''})
         AND IsDeleted = 0
       FOR UPDATE`,
      isNum ? [Number(targetBookingId)] : [targetBookingId, targetBookingId]
    );

    if (!bookingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0017_BOOKING_NOT_FOUND',
        errorCode: 'ERROR_0017_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking từ mã QR',
      });
    }

    const booking = bookingRows[0];
    const actualBookingId = booking.BookingId;

    // Kiểm tra trạng thái cho phép check-in (Mục 3.2, 5.1 & Test Case 5, 6)
    const allowedStatuses = ['Confirmed', 'Allocated'];
    if (!allowedStatuses.includes(booking.Status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0018_BOOKING_STATUS',
        errorCode: 'ERROR_0018_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép check-in',
        currentStatus: booking.Status,
      });
    }

    // 2. Xác định phòng gán cho booking
    let targetRoomId = roomId;
    if (!targetRoomId) {
      const [stayCheck] = await conn.query(
        'SELECT RoomId FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
        [actualBookingId]
      );
      if (stayCheck.length && stayCheck[0].RoomId) {
        targetRoomId = stayCheck[0].RoomId;
      }
    }

    // Nếu chưa có phòng, tự động gán phòng trống khả dụng theo hạng phòng
    if (!targetRoomId) {
      const [avail] = await conn.query(
        `SELECT RoomId FROM Rooms
         WHERE (RoomTypeId = ? OR ? IS NULL)
           AND Status IN ('CleanAvailable', 'Available', 'Inspected')
           AND IsDeleted = 0
         ORDER BY Status = 'CleanAvailable' DESC, RoomNumber ASC
         LIMIT 1 FOR UPDATE`,
        [booking.RoomTypeId, booking.RoomTypeId]
      );
      if (avail.length) {
        targetRoomId = avail[0].RoomId;
      }
    }

    if (!targetRoomId) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0021_CHECKIN_TRANSACTION',
        errorCode: 'ERROR_0021_CHECKIN_TRANSACTION',
        message: 'Không thể hoàn tất check-in, vui lòng thử lại',
        detail: 'Không tìm thấy phòng trống khả dụng để nhận khách',
      });
    }

    // Khóa và kiểm tra phòng vật lý
    const [roomRows] = await conn.query(
      'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
      [targetRoomId]
    );

    if (!roomRows.length || roomRows[0].IsDeleted) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0021_CHECKIN_TRANSACTION',
        errorCode: 'ERROR_0021_CHECKIN_TRANSACTION',
        message: 'Không thể hoàn tất check-in, vui lòng thử lại',
        detail: 'Phòng không tồn tại hoặc đã bị xóa',
      });
    }

    const room = roomRows[0];

    // 3. Cập nhật lượt lưu trú Stays
    const [stayRows] = await conn.query(
      'SELECT StayId FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
      [actualBookingId]
    );

    let stayId;
    if (stayRows.length) {
      stayId = stayRows[0].StayId;
      await conn.query(
        `UPDATE Stays SET
          RoomId = ?,
          Status = 'CheckedIn',
          ActualCheckIn = NOW(),
          CheckInTime = NOW(),
          UpdatedAt = NOW()
         WHERE StayId = ?`,
        [targetRoomId, stayId]
      );
    } else {
      const [newStay] = await conn.query(
        `INSERT INTO Stays (BookingId, RoomId, Status, ActualCheckIn, CheckInTime, CreatedAt, UpdatedAt)
         VALUES (?, ?, 'CheckedIn', NOW(), NOW(), NOW(), NOW())`,
        [actualBookingId, targetRoomId]
      );
      stayId = newStay.insertId;
    }

    // 4. Cập nhật trạng thái phòng thành Occupied
    await conn.query(
      'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?',
      ['Occupied', targetRoomId]
    );

    // 5. Cập nhật trạng thái Booking sang CheckedIn, tự động ghi checkedInBy & checkedInAt (Mục 2 & 3.5)
    const operatorUserId = req.user?.userId || req.user?.UserId || 1;
    await conn.query(
      `UPDATE Bookings SET
        Status = 'CheckedIn',
        CheckedInBy = ?,
        CheckedInAt = NOW(),
        UpdatedAt = NOW()
       WHERE BookingId = ?`,
      [operatorUserId, actualBookingId]
    );

    // 6. Lưu file hình ảnh CCCD và Chữ ký nếu có
    const savedIdCardUrl = saveBase64Image(idCardImage, 'id_cards', `CCCD_${cleanDocNum}`);
    const savedSignatureUrl = saveBase64Image(signatureData, 'signatures', `SIG_B${actualBookingId}`);

    // 7. Lưu vào bảng GuestIdentityDocuments (nếu có bảng)
    try {
      await conn.query(
        `INSERT INTO GuestIdentityDocuments
          (BookingId, GuestId, DocumentType, DocumentNumber, FullName, DateOfBirth, Gender, Nationality, DocumentExpiryDate, IdCardImageUrl, SignatureImageUrl, ScannedAt, ScannedBy)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          actualBookingId,
          cleanDocType,
          cleanDocNum,
          cleanFullName,
          isoDob,
          gender,
          cleanNationality,
          isoExpiry,
          savedIdCardUrl,
          savedSignatureUrl,
          operatorUserId,
        ]
      );
    } catch (_) {}

    // 8. Cập nhật thông tin khách chính BookingGuests
    const [guestRows] = await conn.query(
      'SELECT BookingGuestId FROM BookingGuests WHERE BookingId = ? AND IsPrimaryGuest = 1 LIMIT 1',
      [actualBookingId]
    );

    if (guestRows.length) {
      await conn.query(
        `UPDATE BookingGuests SET
          FullName = ?,
          IdNumber = ?,
          IdType = ?,
          DateOfBirth = ?,
          Gender = ?
         WHERE BookingGuestId = ?`,
        [cleanFullName, cleanDocNum, cleanDocType, isoDob, gender, guestRows[0].BookingGuestId]
      );
    } else {
      await conn.query(
        `INSERT INTO BookingGuests (BookingId, FullName, IdNumber, IdType, DateOfBirth, Gender, IsPrimaryGuest, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
        [actualBookingId, cleanFullName, cleanDocNum, cleanDocType, isoDob, gender]
      );
    }

    // 9. Khai báo tạm trú PoliceDeclarations
    try {
      await conn.query(
        `INSERT INTO PoliceDeclarations (StayId, GuestName, IdNumber, IdType, Nationality, DeclarationDate, Status)
         VALUES (?, ?, ?, ?, ?, NOW(), 'Pending')`,
        [stayId, cleanFullName, cleanDocNum, cleanDocType, cleanNationality]
      );
    } catch (_) {}

    // 10. Ghi AuditLogs (Mục 3.6 & 8: không log PII nhạy cảm nếu không cần)
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, NewValues, ActionTime, IpAddress)
       VALUES (?, 'CHECKIN_COMPLETED', 'Bookings', ?, ?, NOW(), ?)`,
      [
        operatorUserId,
        actualBookingId,
        JSON.stringify({
          bookingId: actualBookingId,
          bookingCode: booking.ConfirmationCode,
          roomId: targetRoomId,
          roomNumber: room.RoomNumber,
          guestName: cleanFullName,
          documentType: cleanDocType,
          documentNumberMasked: cleanDocNum.slice(0, 3) + '******' + cleanDocNum.slice(-3),
          keycardCount,
          dispatchNfc,
        }),
        String(clientIp).slice(0, 45),
      ]
    );

    // Commit transaction
    await conn.commit();

    const nowIso = new Date().toISOString();

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0004_CHECKED_IN',
      errorCode: 'SUCCESS_0004_CHECKED_IN',
      message: 'Check-in thành công',
      data: {
        bookingId: actualBookingId,
        bookingCode: booking.ConfirmationCode || `BK-${actualBookingId}`,
        guestName: cleanFullName,
        documentType: cleanDocType,
        documentNumber: cleanDocNum,
        roomNumber: room.RoomNumber,
        roomId: targetRoomId,
        status: 'CheckedIn',
        checkInAt: nowIso,
        checkedInBy: operatorUserId,
        savedFiles: {
          idCardUrl: savedIdCardUrl,
          signatureUrl: savedSignatureUrl,
        },
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Check-in transaction error:', err);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0021_CHECKIN_TRANSACTION',
      errorCode: 'ERROR_0021_CHECKIN_TRANSACTION',
      message: 'Không thể hoàn tất check-in, vui lòng thử lại',
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

module.exports = {
  scanQrCode,
  getBookingByCode,
  processCheckIn,
  saveBase64Image,
  decodeQrPayload,
  findBookingByCodeOrId,
};
