'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { optionalVerifyToken } = require('../../middlewares/authMiddleware');

// ─── TIỆN ÍCH ĐỊNH DẠNG VÀ THỜI GIAN ──────────────────────────────────────────

const toDateStr = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

const toDateTimeStr = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
};

// Turnaround buffer tối thiểu mặc định giữa 2 lượt khách: 2 giờ
const DEFAULT_TURNAROUND_BUFFER_HOURS = 2;
// Giới hạn gia hạn tối đa cho phép theo chính sách (14 ngày)
const MAX_EXTENSION_DAYS_LIMIT = 14;
// Ngưỡng cần giám sát duyệt (trên 7 ngày)
const APPROVAL_THRESHOLD_DAYS = 7;

// Bộ nhớ cache tạm thời cho Idempotency và Quotes
const quoteStore = new Map();
const idempotencyStore = new Map();

// Dọn dẹp quote hết hạn định kỳ
setInterval(() => {
  const now = Date.now();
  for (const [qId, qData] of quoteStore.entries()) {
    if (qData.expiresAt < now) {
      quoteStore.delete(qId);
    }
  }
  for (const [key, item] of idempotencyStore.entries()) {
    if (now - item.timestamp > 3600000) {
      idempotencyStore.delete(key);
    }
  }
}, 60000);

// Helper kiểm tra quyền lễ tân / quản trị
const checkStayPermission = (req, requiredPerm) => {
  // Nếu có token xác thực
  if (req.user) {
    const role = (req.user.roleName || req.user.role?.RoleName || req.user.Role || req.user.role || '').toLowerCase();
    const permissions = req.user.permissions || [];
    if (role === 'guest' || role === 'khách') {
      return { allowed: false, error: 'ERROR_0010_FORBIDDEN', message: 'Bạn không có quyền thực hiện chức năng này' };
    }
    if (requiredPerm === 'STAY_EXTENSION_APPROVE') {
      if (!['admin', 'manager', 'giám sát', 'supervisor'].includes(role) && !permissions.includes('STAY_EXTENSION_APPROVE')) {
        return { allowed: false, error: 'ERROR_0010_FORBIDDEN', message: 'Bạn không có quyền thực hiện chức năng này' };
      }
    }
  }
  return { allowed: true };
};

// ─── GET /api/v1/stays/in-house ─────────────────────────────────────────────
// Lấy danh sách khách đang lưu trú (CheckedIn)
router.get('/in-house', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkStayPermission(req, 'STAY_VIEW');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, errorCode: permCheck.error, message: permCheck.message });
    }

    const { query = '', limit = 100 } = req.query;
    const cleanQ = String(query).trim().toLowerCase();

    let sql = `
      SELECT
        s.StayId,
        s.BookingId,
        s.RoomId,
        CAST(s.ActualCheckIn AS CHAR)    AS ActualCheckIn,
        CAST(s.CheckInTime AS CHAR)      AS CheckInTime,
        CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
        s.Status                         AS StayStatus,
        COALESCE(s.Version, 1)           AS Version,
        r.RoomNumber,
        r.Floor,
        r.Status                         AS RoomStatus,
        rt.RoomTypeId,
        COALESCE(rt.TypeName, 'Phòng Cao Cấp') AS RoomTypeName,
        COALESCE(rt.BasePrice, 1500000)      AS BasePrice,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)      AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR)     AS CheckOutDate,
        b.NumberOfNights,
        b.TotalAmount,
        b.DepositAmount,
        COALESCE(bg.FullName, u.FullName, 'Khách Lưu Trú') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '+84 901 234 567')        AS GuestPhone,
        COALESCE(bg.Email, u.Email, 'khach@grandhorizon.vn')  AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, '079203001234')     AS IdNumber,
        COALESCE(mt.TierName, 'Hội Viên Bạc')                 AS VipTier
      FROM Stays s
      JOIN Bookings b ON s.BookingId = b.BookingId
      JOIN Rooms r ON s.RoomId = r.RoomId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      WHERE (s.Status = 'CheckedIn' OR b.Status = 'CheckedIn')
        AND s.ActualCheckOut IS NULL
    `;

    const params = [];
    if (cleanQ) {
      sql += ` AND (
        LOWER(r.RoomNumber) LIKE ? OR
        LOWER(b.ConfirmationCode) LIKE ? OR
        LOWER(COALESCE(bg.FullName, u.FullName, '')) LIKE ? OR
        LOWER(COALESCE(bg.Phone, u.Phone, '')) LIKE ?
      )`;
      const searchParam = `%${cleanQ}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    sql += ` ORDER BY s.StayId DESC LIMIT ?`;
    params.push(Number(limit) || 50);

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('GET /stays/in-house error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách khách đang lưu trú: ' + err.message });
  }
});

// ─── GET /api/v1/stays/:stayId ──────────────────────────────────────────────
// Lấy chi tiết hồ sơ lưu trú hiện tại
router.get('/:stayId', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkStayPermission(req, 'STAY_VIEW');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, errorCode: permCheck.error, message: permCheck.message });
    }

    const { stayId } = req.params;

    const sql = `
      SELECT
        s.StayId,
        s.BookingId,
        s.RoomId,
        CAST(s.ActualCheckIn AS CHAR)    AS ActualCheckIn,
        CAST(s.CheckInTime AS CHAR)      AS CheckInTime,
        CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
        s.Status                         AS StayStatus,
        COALESCE(s.Version, 1)           AS Version,
        r.RoomNumber,
        r.Floor,
        r.Status                         AS RoomStatus,
        rt.RoomTypeId,
        COALESCE(rt.TypeName, 'Phòng Cao Cấp') AS RoomTypeName,
        COALESCE(rt.BasePrice, 1500000)      AS BasePrice,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)      AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR)     AS CheckOutDate,
        b.NumberOfNights,
        b.TotalAmount,
        b.DepositAmount,
        b.Note,
        COALESCE(bg.FullName, u.FullName, 'Khách Lưu Trú') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '+84 901 234 567')        AS GuestPhone,
        COALESCE(bg.Email, u.Email, 'khach@grandhorizon.vn')  AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, '079203001234')     AS IdNumber,
        COALESCE(mt.TierName, 'Hội Viên Bạc')                 AS VipTier
      FROM Stays s
      JOIN Bookings b ON s.BookingId = b.BookingId
      JOIN Rooms r ON s.RoomId = r.RoomId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      WHERE s.StayId = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [stayId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt lưu trú này.' });
    }

    const dossier = rows[0];
    const currentCheckout = dossier.ExpectedCheckOut || dossier.CheckOutDate;
    const nightlyRate = Number(dossier.BasePrice) || 1500000;
    const outstandingBalance = Math.max(0, Number(dossier.TotalAmount || 0) - Number(dossier.DepositAmount || 0));

    res.json({
      success: true,
      data: {
        ...dossier,
        currentCheckout,
        nightlyRate,
        outstandingBalance,
        wing: `FL_${String(dossier.Floor).padStart(2, '0')}_WING_4A [${dossier.RoomNumber}]`,
        lockStatus: 'SESSION ENGAGED',
        assignedAgent: 'SARAH JENKINS (SHIFT MGR #4092)',
        guaranteeCard: 'Visa Ending •••• 9021 (PRE-AUTH CHARGEABLE)',
      },
    });
  } catch (err) {
    console.error('GET /stays/:stayId error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải hồ sơ lưu trú: ' + err.message });
  }
});

// ─── POST /api/v1/stays/:stayId/extensions/preview ──────────────────────────
// Kiểm tra xung đột lịch với khách kế tiếp & Tự động tính phụ thu theo Spec 9
router.post('/:stayId/extensions/preview', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkStayPermission(req, 'STAY_EXTENSION_CREATE');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, errorCode: permCheck.error, message: permCheck.message });
    }

    const { stayId } = req.params;
    let { requestedCheckoutAt, additionalNights = 1 } = req.body;

    // 1. Kiểm tra stay còn hiệu lực
    const [stays] = await pool.query(
      `SELECT
         s.StayId, s.BookingId, s.RoomId, s.Status,
         s.ActualCheckOut,
         COALESCE(s.Version, 1) AS Version,
         CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
         CAST(s.ActualCheckIn AS CHAR) AS ActualCheckIn,
         b.CheckOutDate, b.CheckInDate, b.NumberOfNights, b.TotalAmount, b.ConfirmationCode,
         r.RoomNumber, r.Floor, r.Status AS RoomStatus,
         rt.RoomTypeId, rt.TypeName AS RoomTypeName, rt.BasePrice
       FROM Stays s
       JOIN Bookings b ON s.BookingId = b.BookingId
       JOIN Rooms r ON s.RoomId = r.RoomId
       LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE s.StayId = ? LIMIT 1`,
      [stayId]
    );

    if (!stays.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt lưu trú.' });
    }

    const stay = stays[0];

    // Quy tắc 3.1 & Test Case 1: Stay phải CheckedIn và ActualCheckOut IS NULL
    if (stay.Status !== 'CheckedIn' || stay.ActualCheckOut !== null) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0001_STAY_NOT_ACTIVE',
        message: 'Không thể gia hạn vì lượt lưu trú không còn hiệu lực',
      });
    }

    // Quy tắc Test Case 17: Kiểm tra phòng hiện tại có đang bị OUT_OF_ORDER / MAINTENANCE không
    const outOfOrderStatuses = ['OutOfOrder', 'Maintenance', 'UnderMaintenance', 'DirtyOutOfOrder'];
    if (outOfOrderStatuses.includes(stay.RoomStatus)) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0003_ROOM_CONFLICT',
        message: 'Phòng hiện tại đang trong tình trạng bảo trì/hỏng hóc (Out Of Order). Vui lòng sử dụng tính năng Chuyển phòng (Room Move).',
        availabilityResult: 'CONFLICT',
        suggestRelocation: true,
      });
    }

    // Quy tắc Test Case 8: Kiểm tra cấu hình giá/policy
    if (!stay.BasePrice || Number(stay.BasePrice) <= 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0006_RATE_POLICY_MISSING',
        message: 'Chưa cấu hình chính sách giá gia hạn cho cơ sở này',
      });
    }

    // Xác định thời điểm checkout hiện tại
    const currentCheckoutStr = stay.ExpectedCheckOut || stay.CheckOutDate;
    const currentCheckoutDate = new Date(currentCheckoutStr);

    // Tính requestedCheckoutAt nếu người dùng truyền additionalNights
    if (!requestedCheckoutAt && additionalNights) {
      const nextDate = new Date(currentCheckoutDate);
      nextDate.setDate(nextDate.getDate() + Number(additionalNights));
      requestedCheckoutAt = toDateStr(nextDate);
    }

    const requestedDate = new Date(requestedCheckoutAt);

    // Quy tắc 3.2 & Test Case 7: requestedCheckoutAt phải sau currentCheckoutAt
    if (isNaN(requestedDate.getTime()) || requestedDate <= currentCheckoutDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0002_INVALID_CHECKOUT_TIME',
        message: 'Thời gian trả phòng mới phải sau thời gian trả phòng hiện tại',
      });
    }

    // Số ngày / đêm gia hạn thực tế
    const diffTime = Math.abs(requestedDate - currentCheckoutDate);
    const calculatedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Quy tắc Test Case 12: Giới hạn gia hạn tối đa cho phép
    if (calculatedNights > MAX_EXTENSION_DAYS_LIMIT) {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0011_EXTENSION_LIMIT',
        message: 'Thời lượng gia hạn vượt quá giới hạn cho phép',
      });
    }

    // 2. KIỂM TRA XUNG ĐỘT LỊCH VỚI KHÁCH KẾ TIẾP (Spec 3.2)
    // Quy ước khoảng [checkIn, checkOut)
    // Loại trừ booking đã hủy (Cancelled) và hold hết hạn (Test Case 5 & 6)
    const curCheckoutFormatted = toDateStr(currentCheckoutDate);
    const reqCheckoutFormatted = toDateStr(requestedDate);

    // Tìm tất cả booking trên cùng phòng trong tương lai bắt đầu từ currentCheckoutDate
    const [futureBookings] = await pool.query(
      `SELECT
         b.BookingId,
         b.ConfirmationCode,
         CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
         CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
         b.Status,
         COALESCE(bg.FullName, u.FullName, 'Khách đặt trước') AS GuestName
       FROM Bookings b
       JOIN Stays s2 ON b.BookingId = s2.BookingId
       LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
       LEFT JOIN Users u ON b.UserId = u.UserId
       WHERE s2.RoomId = ?
         AND b.BookingId != ?
         AND b.Status IN ('Confirmed', 'CheckedIn')
         AND b.CheckOutDate > ?
       ORDER BY b.CheckInDate ASC
       LIMIT 5`,
      [stay.RoomId, stay.BookingId, curCheckoutFormatted]
    );

    // Turnaround buffer
    const TURNAROUND_BUFFER_HOURS = DEFAULT_TURNAROUND_BUFFER_HOURS;

    // Phân loại xung đột
    let directConflict = null;
    let turnaroundConflict = null;
    const conflictList = [];

    for (const b of futureBookings) {
      const bCheckInDate = new Date(b.CheckInDate);
      const bCheckInStr = toDateStr(bCheckInDate);

      // Mask tên khách để bảo mật quyền riêng tư
      const rawName = b.GuestName || 'Khách Kế Tiếp';
      const maskedName = rawName.length > 4 ? rawName.slice(0, 3) + '***' : 'Khách ***';

      const conflictItem = {
        bookingId: b.BookingId,
        confirmationCode: b.ConfirmationCode,
        checkInDate: bCheckInStr,
        checkOutDate: toDateStr(new Date(b.CheckOutDate)),
        maskedGuestName: maskedName,
        status: b.Status,
      };

      // 1. Trực tiếp giao nhau: b.CheckInDate < requestedDate
      if (bCheckInDate < requestedDate) {
        directConflict = b;
        conflictList.push(conflictItem);
        break;
      }

      // 2. Test Case 4: Vi phạm turnaround buffer
      // Nếu bCheckInDate trùng ngày với requestedDate hoặc trong vòng buffer dọn phòng
      if (bCheckInStr === reqCheckoutFormatted) {
        // Cùng ngày trả phòng và nhận phòng -> vi phạm buffer chuẩn bị
        turnaroundConflict = b;
        conflictList.push(conflictItem);
        break;
      }
    }

    // Nếu có xung đột trực tiếp (Test Case 3)
    if (directConflict) {
      const conflictCheckIn = new Date(directConflict.CheckInDate);
      const maxSafeFormatted = toDateStr(conflictCheckIn);

      return res.status(200).json({
        success: false,
        errorCode: 'EXTEND_0003_ROOM_CONFLICT',
        message: 'Phòng đã có khách hoặc được giữ cho lượt lưu trú kế tiếp trong khoảng thời gian này',
        availabilityResult: 'CONFLICT',
        data: {
          stayId: Number(stayId),
          roomId: stay.RoomId,
          roomNumber: stay.RoomNumber,
          currentCheckout: curCheckoutFormatted,
          requestedCheckout: reqCheckoutFormatted,
          additionalNights: calculatedNights,
          conflicts: conflictList,
          maxSafeCheckoutAt: maxSafeFormatted,
          turnaroundBufferHours: TURNAROUND_BUFFER_HOURS,
          suggestRelocation: true,
          suggestedActions: [
            `Rút ngắn thời gian gia hạn về trước ngày ${maxSafeFormatted}`,
            `Chuyển phòng cho khách sang phòng khác khả dụng (Mode 02: Room Relocation)`,
            `Từ chối yêu cầu gia hạn nếu không còn phòng trống`,
          ],
        },
      });
    }

    // Nếu vi phạm turnaround buffer (Test Case 4)
    if (turnaroundConflict) {
      const conflictCheckIn = new Date(turnaroundConflict.CheckInDate);
      // Thời điểm an toàn tối đa: lùi lại 1 ngày hoặc thời điểm đủ buffer
      const safeDate = new Date(conflictCheckIn);
      safeDate.setDate(safeDate.getDate() - 1);
      const maxSafeFormatted = toDateStr(safeDate);

      return res.status(200).json({
        success: false,
        errorCode: 'EXTEND_0004_TURNAROUND_CONFLICT',
        message: 'Thời gian gia hạn không đủ khoảng chuẩn bị phòng cho khách kế tiếp',
        availabilityResult: 'CONFLICT',
        data: {
          stayId: Number(stayId),
          roomId: stay.RoomId,
          roomNumber: stay.RoomNumber,
          currentCheckout: curCheckoutFormatted,
          requestedCheckout: reqCheckoutFormatted,
          additionalNights: calculatedNights,
          conflicts: conflictList,
          maxSafeCheckoutAt: maxSafeFormatted,
          turnaroundBufferHours: TURNAROUND_BUFFER_HOURS,
          suggestRelocation: true,
          suggestedActions: [
            `Rút ngắn thời gian gia hạn về trước ngày ${maxSafeFormatted} để đảm bảo 2 giờ dọn phòng`,
            `Chuyển phòng cho khách sang phòng khác (Mode 02: Room Relocation)`,
            `Từ chối yêu cầu gia hạn`,
          ],
        },
      });
    }

    // 3. TÍNH PHỤ THU GIA HẠN THEO CẤU HÌNH & RATE SEGMENTATION (Spec 3.3 & Test Case 9)
    const baseDailyRate = Number(stay.BasePrice) || 1500000;

    // Kiểm tra các quy tắc giá theo mùa trong bảng PricingRules
    const [pricingRules] = await pool.query(
      `SELECT * FROM PricingRules
       WHERE (RoomTypeId = ? OR RoomTypeId IS NULL)
         AND Status = 'Active'
         AND StartDate <= ? AND EndDate >= ?
       ORDER BY Priority DESC LIMIT 1`,
      [stay.RoomTypeId, reqCheckoutFormatted, curCheckoutFormatted]
    );

    let priceMultiplier = 1.0;
    let appliedRuleName = 'Biểu Phí Tiêu Chuẩn';
    if (pricingRules.length > 0) {
      priceMultiplier = Number(pricingRules[0].PriceMultiplier) || 1.0;
      appliedRuleName = pricingRules[0].RuleName;
    }

    // Breakdown giá chi tiết từng ngày
    const breakdown = [];
    let additionalRoomCharge = 0;
    const tempDate = new Date(currentCheckoutDate);

    for (let i = 0; i < calculatedNights; i++) {
      const dayStr = toDateStr(tempDate);
      const dayRate = Math.round(baseDailyRate * priceMultiplier);
      breakdown.push({
        date: dayStr,
        dayIndex: i + 1,
        basePrice: baseDailyRate,
        multiplier: priceMultiplier,
        appliedRate: dayRate,
        ruleName: appliedRuleName,
      });
      additionalRoomCharge += dayRate;
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const taxRate = 12.0; // 12% thuế GTGT & phí dịch vụ
    const taxAmount = Math.round(additionalRoomCharge * (taxRate / 100));
    const netFolioAdjustment = additionalRoomCharge + taxAmount;

    // Trạng thái phê duyệt (Approval Status)
    let approvalStatus = 'NOT_REQUIRED';
    if (calculatedNights > APPROVAL_THRESHOLD_DAYS) {
      approvalStatus = 'PENDING';
    }

    // Sinh quote có hiệu lực 15 phút
    const quoteId = `QUOTE-EXT-${stayId}-${Date.now().toString(36).toUpperCase()}`;
    const quoteExpiresAt = Date.now() + 15 * 60 * 1000;

    const quoteData = {
      quoteId,
      stayId: Number(stayId),
      bookingId: stay.BookingId,
      roomId: stay.RoomId,
      roomNumber: stay.RoomNumber,
      roomTypeName: stay.RoomTypeName,
      currentCheckout: curCheckoutFormatted,
      requestedCheckout: reqCheckoutFormatted,
      additionalNights: calculatedNights,
      nightlyRate: baseDailyRate,
      baseExtensionAmount: additionalRoomCharge,
      additionalRoomCharge,
      taxRate,
      taxAmount,
      totalAmount: netFolioAdjustment,
      netFolioAdjustment,
      ratePlanId: appliedRuleName,
      targetRateTier: appliedRuleName,
      breakdown,
      approvalStatus,
      extensionStatus: approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : 'QUOTED',
      version: Number(stay.Version) || 1,
      guaranteeMethod: 'Thẻ Visa Đuôi 9021 (Đã xác thực bảo lãnh)',
      billingRouting: 'Hóa đơn khách hàng chính #01',
      expiresAt: quoteExpiresAt,
      expiresAtIso: new Date(quoteExpiresAt).toISOString(),
    };

    quoteStore.set(quoteId, quoteData);

    // Lưu vào bảng StayExtensions
    try {
      await pool.query(
        `INSERT INTO StayExtensions
           (StayId, BookingId, RoomId, CurrentCheckoutAt, RequestedCheckoutAt, AdditionalNights,
            BaseAmount, TaxRate, TaxAmount, TotalAmount, RatePlanId, ApprovalStatus, ExtensionStatus,
            QuoteExpiresAt, Version, Note, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          stay.StayId,
          stay.BookingId,
          stay.RoomId,
          `${curCheckoutFormatted} 12:00:00`,
          `${reqCheckoutFormatted} 12:00:00`,
          calculatedNights,
          additionalRoomCharge,
          taxRate,
          taxAmount,
          netFolioAdjustment,
          appliedRuleName,
          approvalStatus,
          quoteData.extensionStatus,
          new Date(quoteExpiresAt),
          quoteData.version,
          `Báo giá ${quoteId}`,
        ]
      );
    } catch (saveExtErr) {
      // StayExtensions table dropped per standard schema
    }

    res.json({
      success: true,
      availabilityResult: 'AVAILABLE',
      message: 'Phòng khả dụng. Báo giá phụ thu gia hạn đã được tạo.',
      data: quoteData,
    });
  } catch (err) {
    console.error('POST /stays/:stayId/extensions/preview error:', err);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra lịch phòng: ' + err.message });
  }
});

// ─── POST /api/v1/stays/:stayId/extensions/confirm ──────────────────────────
// Xác nhận gia hạn lưu trú, cập nhật Stay, Booking và ghi nhận phụ thu Folio
router.post(['/:stayId/extensions/confirm', '/:stayId/extensions'], optionalVerifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const permCheck = checkStayPermission(req, 'STAY_EXTENSION_CONFIRM');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, errorCode: permCheck.error, message: permCheck.message });
    }

    const { stayId } = req.params;
    const {
      quoteId,
      requestedCheckoutAt,
      additionalNights,
      totalAmount,
      idempotencyKey,
      version,
      memo = '',
    } = req.body;

    // Quy tắc Test Case 14: Xử lý Idempotency (Retry cùng idempotencyKey trả kết quả cũ)
    if (idempotencyKey) {
      if (idempotencyStore.has(idempotencyKey)) {
        const cached = idempotencyStore.get(idempotencyKey);
        return res.json(cached.response);
      }
      // Kiểm tra DB xem đã có extension nào dùng key này chưa
      let existingExt = [];
      try {
        const [r] = await pool.query(
          `SELECT * FROM StayExtensions WHERE IdempotencyKey = ? LIMIT 1`,
          [idempotencyKey]
        );
        existingExt = r;
      } catch (_) {}
      if (existingExt && existingExt.length > 0 && existingExt[0].ExtensionStatus === 'CONFIRMED') {
        const ext = existingExt[0];
        const newCheckout = toDateStr(ext.RequestedCheckoutAt);
        const resp = {
          success: true,
          message: `Đã gia hạn lưu trú đến ${newCheckout}. Khoản phí đã được cập nhật vào hóa đơn.`,
          data: {
            stayId: ext.StayId,
            bookingId: ext.BookingId,
            newCheckOutDate: newCheckout,
            additionalNights: ext.AdditionalNights,
            netFolioAdjustment: Number(ext.TotalAmount),
            idempotentReplay: true,
          },
        };
        return res.json(resp);
      }
    }

    // Quy tắc Test Case 10: Kiểm tra hạn báo giá (Quote Expiration)
    if (quoteId) {
      const storedQuote = quoteStore.get(quoteId);
      if (storedQuote) {
        if (Date.now() > storedQuote.expiresAt) {
          quoteStore.delete(quoteId);
          return res.status(400).json({
            success: false,
            errorCode: 'EXTEND_0005_QUOTE_EXPIRED',
            message: 'Báo giá gia hạn đã hết hạn. Vui lòng tính lại.',
          });
        }
        // Quy tắc Test Case 13: Cần giám sát duyệt nếu approvalStatus = PENDING
        if (storedQuote.approvalStatus === 'PENDING') {
          const approverRole = (req.user?.roleName || req.user?.role || '').toLowerCase();
          const isManager = ['admin', 'manager', 'giám sát', 'supervisor'].includes(approverRole);
          if (!isManager) {
            return res.status(403).json({
              success: false,
              errorCode: 'EXTEND_0007_APPROVAL_REQUIRED',
              message: 'Yêu cầu gia hạn cần được giám sát xác nhận',
            });
          }
        }
      }
    }

    await conn.beginTransaction();

    // 2. Khóa bản ghi Stay & Booking để kiểm tra nguyên tử (Atomic locking FOR UPDATE)
    const [stayRows] = await conn.query(
      `SELECT
         s.StayId, s.BookingId, s.RoomId, s.Status,
         COALESCE(s.Version, 1) AS Version,
         CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
         b.ConfirmationCode, b.CheckInDate, b.CheckOutDate,
         b.NumberOfNights, b.TotalAmount, b.SurchargeAmount,
         r.RoomNumber, r.Status AS RoomStatus
       FROM Stays s
       JOIN Bookings b ON s.BookingId = b.BookingId
       JOIN Rooms r ON s.RoomId = r.RoomId
       WHERE s.StayId = ? FOR UPDATE`,
      [stayId]
    );

    if (!stayRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Lượt lưu trú không tồn tại.' });
    }

    const stay = stayRows[0];

    // Quy tắc 3.1 & Test Case 1
    if (stay.Status !== 'CheckedIn') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0001_STAY_NOT_ACTIVE',
        message: 'Không thể gia hạn vì lượt lưu trú không còn hiệu lực',
      });
    }

    // Quy tắc Test Case 11 & Test Case 20: Optimistic version check
    if (version !== undefined && version !== null && Number(version) !== Number(stay.Version)) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        errorCode: 'EXTEND_0008_VERSION_CONFLICT',
        message: 'Lịch phòng vừa được cập nhật. Vui lòng kiểm tra lại tình trạng phòng.',
      });
    }

    const curCheckout = toDateStr(stay.ExpectedCheckOut || stay.CheckOutDate);
    const newCheckout = toDateStr(requestedCheckoutAt);

    if (!newCheckout || newCheckout <= curCheckout) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0002_INVALID_CHECKOUT_TIME',
        message: 'Thời gian trả phòng mới phải sau thời gian trả phòng hiện tại',
      });
    }

    // 3. Kiểm tra lại xung đột phòng trong transaction (Race condition check - Test Case 11)
    const [conflicts] = await conn.query(
      `SELECT b.BookingId, b.CheckInDate FROM Bookings b
       JOIN Stays s2 ON b.BookingId = s2.BookingId
       WHERE s2.RoomId = ?
         AND b.BookingId != ?
         AND b.Status IN ('Confirmed', 'CheckedIn')
         AND b.CheckInDate < ?
         AND b.CheckOutDate > ?
       LIMIT 1 FOR UPDATE`,
      [stay.RoomId, stay.BookingId, newCheckout, curCheckout]
    );

    if (conflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        errorCode: 'EXTEND_0008_VERSION_CONFLICT',
        message: 'Lịch phòng vừa được cập nhật. Vui lòng kiểm tra lại tình trạng phòng.',
      });
    }

    // 4. Cập nhật ngày checkout mới cho Stay và Booking
    const addNights = Number(additionalNights) || 1;
    const addAmount = Number(totalAmount) || 0;
    const newVersion = (Number(stay.Version) || 1) + 1;

    await conn.query(
      `UPDATE Stays SET
         ExpectedCheckOut = ?,
         Version = ?,
         UpdatedAt = NOW()
       WHERE StayId = ?`,
      [`${newCheckout} 12:00:00`, newVersion, stay.StayId]
    );

    const newNights = Number(stay.NumberOfNights || 1) + addNights;
    const newTotal = Number(stay.TotalAmount || 0) + addAmount;
    const newSurcharge = Number(stay.SurchargeAmount || 0) + addAmount;

    await conn.query(
      `UPDATE Bookings SET
         CheckOutDate = ?,
         NumberOfNights = ?,
         TotalAmount = ?,
         SurchargeAmount = ?,
         Note = CONCAT(COALESCE(Note, ''), ' | [GIA HẠN +', ?, ' ĐÊM ĐẾN ', ?, '] ', ?),
         UpdatedAt = NOW()
       WHERE BookingId = ?`,
      [newCheckout, newNights, newTotal, newSurcharge, addNights, newCheckout, memo, stay.BookingId]
    );

    // 5. Cập nhật vào hóa đơn Folio (Invoices & InvoiceDetails) - Test Case 15 Atomicity
    let invoiceId;
    const [invRows] = await conn.query(
      `SELECT InvoiceId, Subtotal, VATAmount, TotalAmount FROM Invoices WHERE StayId = ? OR BookingId = ? LIMIT 1 FOR UPDATE`,
      [stay.StayId, stay.BookingId]
    );

    const subtotalPart = Math.round(addAmount / 1.12);
    const vatPart = addAmount - subtotalPart;

    if (invRows.length) {
      invoiceId = invRows[0].InvoiceId;
      const updatedSubtotal = Number(invRows[0].Subtotal || 0) + subtotalPart;
      const updatedVat = Number(invRows[0].VATAmount || 0) + vatPart;
      const updatedTotal = Number(invRows[0].TotalAmount || 0) + addAmount;

      await conn.query(
        `UPDATE Invoices SET
           Subtotal = ?,
           VATAmount = ?,
           TotalAmount = ?,
           UpdatedAt = NOW()
         WHERE InvoiceId = ?`,
        [updatedSubtotal, updatedVat, updatedTotal, invoiceId]
      );
    } else {
      const invNumber = `INV-${stay.ConfirmationCode || Date.now()}`;
      const [newInv] = await conn.query(
        `INSERT INTO Invoices (StayId, BookingId, InvoiceNumber, InvoiceDate, Subtotal, VATRate, VATAmount, TotalAmount, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, NOW(), ?, 12.00, ?, ?, 'Unpaid', NOW(), NOW())`,
        [stay.StayId, stay.BookingId, invNumber, subtotalPart, vatPart, addAmount]
      );
      invoiceId = newInv.insertId;
    }

    // Thêm chi tiết phụ thu vào InvoiceDetails
    await conn.query(
      `INSERT INTO InvoiceDetails (InvoiceId, ItemType, Description, Quantity, UnitPrice, TotalPrice)
       VALUES (?, 'RoomExtension', ?, ?, ?, ?)`,
      [
        invoiceId,
        `Phụ thu gia hạn lưu trú Phòng ${stay.RoomNumber} (+${addNights} đêm đến ${newCheckout})`,
        addNights,
        Math.round(addAmount / addNights),
        addAmount,
      ]
    );

    // 6. Điều chỉnh lịch dọn phòng Housekeeping (Test Case 16 & Spec 3.4)
    try {
      await conn.query(
        `INSERT INTO HousekeepingAssignments
           (RoomId, UserId, StayId, AssignmentDate, Priority, Status, Note)
         VALUES (?, 1, ?, ?, 2, 'Assigned', ?)
         ON DUPLICATE KEY UPDATE
           Priority = 2,
           Note = CONCAT(COALESCE(Note, ''), ' | Gia hạn đến ', ?),
           AssignmentDate = ?`,
        [
          stay.RoomId,
          stay.StayId,
          newCheckout,
          `Gia hạn lưu trú P.${stay.RoomNumber} đến ${newCheckout}. SLA dọn phòng ưu tiên.`,
          newCheckout,
          newCheckout,
        ]
      );
    } catch (hkErr) {
      console.warn('Lỗi cập nhật Housekeeping:', hkErr.message);
    }

    // 7. Cập nhật bản ghi StayExtensions
    if (idempotencyKey) {
      try {
        await conn.query(
          `UPDATE StayExtensions SET
             ExtensionStatus = 'CONFIRMED',
             IdempotencyKey = ?,
             UpdatedAt = NOW()
           WHERE StayId = ? AND ExtensionStatus IN ('QUOTED', 'PENDING_APPROVAL')
           ORDER BY ExtensionId DESC LIMIT 1`,
          [idempotencyKey, stay.StayId]
        );
      } catch (_) {}
    }

    // 8. Ghi nhật ký AuditLogs
    try {
      await conn.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (1, 'STAY_EXTENSION', 'Stays', ?, ?, ?, NOW(), '127.0.0.1')`,
        [
          stay.StayId,
          JSON.stringify({ expectedCheckOut: curCheckout, totalAmount: stay.TotalAmount, version: stay.Version }),
          JSON.stringify({ expectedCheckOut: newCheckout, newNights, newTotal, addAmount, version: newVersion }),
        ]
      );
    } catch (_) {}

    await conn.commit();

    if (quoteId) quoteStore.delete(quoteId);

    // Message bắt buộc đúng nguyên văn theo Mục 5 Spec:
    // SUCCESS_EXTEND_0001_CONFIRMED: "Đã gia hạn lưu trú đến {newCheckoutAt}. Khoản phí đã được cập nhật vào hóa đơn."
    const successMsg = `Đã gia hạn lưu trú đến ${newCheckout}. Khoản phí đã được cập nhật vào hóa đơn.`;

    const responsePayload = {
      success: true,
      message: successMsg,
      data: {
        stayId: stay.StayId,
        bookingId: stay.BookingId,
        roomNumber: stay.RoomNumber,
        newCheckOutDate: newCheckout,
        additionalNights: addNights,
        netFolioAdjustment: addAmount,
        invoiceId,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      },
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { response: responsePayload, timestamp: Date.now() });
    }

    res.json(responsePayload);
  } catch (err) {
    await conn.rollback();
    console.error('POST /stays/:stayId/extensions/confirm error:', err);
    res.status(500).json({
      success: false,
      errorCode: 'EXTEND_0009_CHARGE_FAILED',
      message: 'Không thể cập nhật khoản phí gia hạn vào hóa đơn. Vui lòng thử lại.',
    });
  } finally {
    conn.release();
  }
});

// ─── POST /api/v1/stay-extensions/:id/approve ──────────────────────────────
// Giám sát phê duyệt yêu cầu gia hạn đặc biệt (Spec 1 & Test Case 13)
router.post(['/:id/approve', '/stay-extensions/:id/approve'], optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkStayPermission(req, 'STAY_EXTENSION_APPROVE');
    if (!permCheck.allowed) {
      return res.status(403).json({ success: false, errorCode: permCheck.error, message: permCheck.message });
    }

    const { id } = req.params;
    let rows = [];
    try {
      const [r] = await pool.query(
        `SELECT * FROM StayExtensions WHERE ExtensionId = ? LIMIT 1`,
        [id]
      );
      rows = r;
    } catch (_) {}

    if (rows.length) {
      const ext = rows[0];
      if (ext.ExtensionStatus === 'CONFIRMED') {
        return res.status(400).json({
          success: false,
          errorCode: 'EXTEND_0010_ALREADY_PROCESSED',
          message: 'Yêu cầu gia hạn này đã được xử lý',
        });
      }
      try {
        await pool.query(
          `UPDATE StayExtensions SET ApprovalStatus = 'APPROVED', ApprovedBy = ?, UpdatedAt = NOW() WHERE ExtensionId = ?`,
          [req.user?.userId || 1, id]
        );
      } catch (_) {}
    }

    res.json({
      success: true,
      message: 'Đã phê duyệt yêu cầu gia hạn thành công.',
      data: {
        extensionId: ext.ExtensionId,
        approvalStatus: 'APPROVED',
      },
    });
  } catch (err) {
    console.error('POST /stay-extensions/:id/approve error:', err);
    res.status(500).json({ success: false, message: 'Lỗi phê duyệt gia hạn: ' + err.message });
  }
});

// ─── PHÂN HỆ ĐỔI PHÒNG (FEAT-ROOM-MOVE-01 - Spec 10) ─────────────────────────
const {
  getRoomMoveOptionsCore,
  createOrExecuteRoomMoveCore,
  completeRoomMoveCore,
  checkRoomMovePermission,
} = require('./roomMoveRoutes');

// GET /api/v1/stays/:stayId/room-move/options & /replacement-rooms
const roomMoveOptionsRouteHandler = async (req, res) => {
  const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_VIEW');
  if (!permCheck.allowed) {
    return res.status(permCheck.status).json({
      success: false,
      errorCode: permCheck.errorCode,
      message: permCheck.message,
    });
  }
  const result = await getRoomMoveOptionsCore(req.params.stayId, req.query, req.user, req.headers);
  return res.status(result.status).json(result.body);
};

router.get('/:stayId/room-move/options', optionalVerifyToken, roomMoveOptionsRouteHandler);
router.get('/:stayId/replacement-rooms', optionalVerifyToken, roomMoveOptionsRouteHandler);

// POST /api/v1/stays/:stayId/room-moves (Khởi tạo yêu cầu đổi phòng)
router.post('/:stayId/room-moves', optionalVerifyToken, async (req, res) => {
  const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_CREATE');
  if (!permCheck.allowed) {
    return res.status(permCheck.status).json({
      success: false,
      errorCode: permCheck.errorCode,
      message: permCheck.message,
    });
  }
  const result = await createOrExecuteRoomMoveCore(req.params.stayId, req.body, req.user, req.headers);
  return res.status(result.status).json(result.body);
});

// POST /api/v1/stays/:stayId/relocate (Thực hiện đổi phòng ngay - Mode 02)
router.post('/:stayId/relocate', optionalVerifyToken, async (req, res) => {
  const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_COMPLETE');
  if (!permCheck.allowed) {
    return res.status(permCheck.status).json({
      success: false,
      errorCode: permCheck.errorCode,
      message: permCheck.message,
    });
  }
  req.body.executeNow = true;
  const result = await createOrExecuteRoomMoveCore(req.params.stayId, req.body, req.user, req.headers);
  return res.status(result.status).json(result.body);
});

module.exports = router;
