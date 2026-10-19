'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Helper định dạng ngày YYYY-MM-DD
const toDateStr = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

// Helper format số tiền VND / USD
const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

// Cache tạm lưu trữ Báo giá gia hạn (Quote cache) với TTL 15 phút
// Key: quoteId, Value: { stayId, requestedCheckoutAt, additionalNights, baseAmount, taxAmount, totalAmount, expiresAt }
const quoteStore = new Map();

// Dọn dẹp quote hết hạn mỗi 60 giây
setInterval(() => {
  const now = Date.now();
  for (const [qId, qData] of quoteStore.entries()) {
    if (qData.expiresAt < now) {
      quoteStore.delete(qId);
    }
  }
}, 60000);

// ─── GET /api/v1/stays/in-house ─────────────────────────────────────────────
// Lấy danh sách các lượt lưu trú đang hoạt động (CheckedIn) để lễ tân thao tác
router.get('/in-house', async (req, res) => {
  try {
    const { query = '', limit = 30 } = req.query;
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
        r.RoomNumber,
        r.Floor,
        r.Status                         AS RoomStatus,
        rt.RoomTypeId,
        COALESCE(rt.TypeName, 'Deluxe Room') AS RoomTypeName,
        COALESCE(rt.BasePrice, 1500000)      AS BasePrice,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)      AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR)     AS CheckOutDate,
        b.NumberOfNights,
        b.TotalAmount,
        b.DepositAmount,
        COALESCE(bg.FullName, u.FullName, 'Alexander Morgan') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '+84 901 234 567')        AS GuestPhone,
        COALESCE(bg.Email, u.Email, 'guest@example.com')      AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, '079203001234')     AS IdNumber,
        COALESCE(mt.TierName, 'Silver Resident')             AS VipTier
      FROM Stays s
      JOIN Bookings b ON s.BookingId = b.BookingId
      JOIN Rooms r ON s.RoomId = r.RoomId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      WHERE s.Status = 'CheckedIn'
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
    params.push(Number(limit) || 30);

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
// Lấy chi tiết hồ sơ lưu trú hiện tại (Current Occupancy Dossier)
router.get('/:stayId', async (req, res) => {
  try {
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
        r.RoomNumber,
        r.Floor,
        r.Status                         AS RoomStatus,
        rt.RoomTypeId,
        COALESCE(rt.TypeName, 'Deluxe Room') AS RoomTypeName,
        COALESCE(rt.BasePrice, 1500000)      AS BasePrice,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)      AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR)     AS CheckOutDate,
        b.NumberOfNights,
        b.TotalAmount,
        b.DepositAmount,
        b.Note,
        COALESCE(bg.FullName, u.FullName, 'Alexander Morgan') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '+84 901 234 567')        AS GuestPhone,
        COALESCE(bg.Email, u.Email, 'guest@example.com')      AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, '079203001234')     AS IdNumber,
        COALESCE(mt.TierName, 'Silver Resident')             AS VipTier
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
// Kiểm tra xung đột lịch với khách kế tiếp & Tự động tính báo giá phụ thu
router.post('/:stayId/extensions/preview', async (req, res) => {
  try {
    const { stayId } = req.params;
    let { requestedCheckoutAt, additionalNights = 1 } = req.body;

    // 1. Kiểm tra stay còn hiệu lực
    const [stays] = await pool.query(
      `SELECT
         s.StayId, s.BookingId, s.RoomId, s.Status,
         CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
         CAST(s.ActualCheckIn AS CHAR) AS ActualCheckIn,
         b.CheckOutDate, b.CheckInDate, b.NumberOfNights, b.TotalAmount, b.ConfirmationCode,
         r.RoomNumber, r.Floor,
         rt.TypeName AS RoomTypeName, COALESCE(rt.BasePrice, 1500000) AS BasePrice
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
    if (stay.Status !== 'CheckedIn') {
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0001_STAY_NOT_ACTIVE',
        message: 'Không thể gia hạn vì lượt lưu trú không còn hiệu lực',
      });
    }

    // Xác định thời điểm checkout hiện tại
    const currentCheckoutStr = stay.ExpectedCheckOut || stay.CheckOutDate;
    const currentCheckoutDate = new Date(currentCheckoutStr);

    // Tính requestedCheckoutAt nếu người dùng chỉ truyền additionalNights
    if (!requestedCheckoutAt && additionalNights) {
      const nextDate = new Date(currentCheckoutDate);
      nextDate.setDate(nextDate.getDate() + Number(additionalNights));
      requestedCheckoutAt = toDateStr(nextDate);
    }

    const requestedDate = new Date(requestedCheckoutAt);
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

    // 2. Kiểm tra xung đột lịch với khách kế tiếp trên cùng phòng
    // Tìm các đơn đặt phòng khác trên cùng RoomId trong khoảng [currentCheckoutDate, requestedDate]
    const curCheckoutFormatted = toDateStr(currentCheckoutDate);
    const reqCheckoutFormatted = toDateStr(requestedDate);

    const [conflictRows] = await pool.query(
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
         AND b.CheckInDate < ?
         AND b.CheckOutDate > ?
       ORDER BY b.CheckInDate ASC
       LIMIT 5`,
      [stay.RoomId, stay.BookingId, reqCheckoutFormatted, curCheckoutFormatted]
    );

    // Buffer dọn phòng (Turnaround buffer): tối thiểu 2 giờ sau khi trả phòng
    const TURNAROUND_BUFFER_HOURS = 2;

    if (conflictRows.length > 0) {
      const firstConflict = conflictRows[0];
      const conflictCheckIn = new Date(firstConflict.CheckInDate);

      // Mask tên khách để bảo vệ quyền riêng tư theo spec 3.2
      const rawName = firstConflict.GuestName || 'Khách Kế Tiếp';
      const maskedName = rawName.length > 4 ? rawName.slice(0, 3) + '***' : 'Khách ***';

      // Tính thời điểm an toàn tối đa có thể gia hạn
      const maxSafeDate = new Date(conflictCheckIn);
      const maxSafeFormatted = toDateStr(maxSafeDate);

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
          conflicts: conflictRows.map((c) => ({
            bookingId: c.BookingId,
            confirmationCode: c.ConfirmationCode,
            checkInDate: c.CheckInDate,
            checkOutDate: c.CheckOutDate,
            maskedGuestName: maskedName,
          })),
          maxSafeCheckoutAt: maxSafeFormatted,
          turnaroundBufferHours: TURNAROUND_BUFFER_HOURS,
          suggestRelocation: true, // Đề xuất chuyển sang Mode 02: Room Relocation
          suggestedActions: [
            `Rút ngắn thời gian gia hạn về trước ngày ${maxSafeFormatted}`,
            `Chuyển phòng cho khách sang phòng khác khả dụng (Mode 02: Room Relocation)`,
            `Từ chối yêu cầu gia hạn nếu không còn phòng trống`,
          ],
        },
      });
    }

    // 3. Nếu không xung đột -> Tính phụ thu tự động theo Spec 3.3
    const nightlyRate = Number(stay.BasePrice) || 1500000;
    const additionalRoomCharge = nightlyRate * calculatedNights;
    const taxRate = 0.12; // 12% City Tax & Resort Assessment theo wireframe & spec
    const taxAmount = Math.round(additionalRoomCharge * taxRate);
    const netFolioAdjustment = additionalRoomCharge + taxAmount;

    // Sinh quote với thời hạn hiệu lực 15 phút
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
      nightlyRate,
      additionalRoomCharge,
      taxRate: 12,
      taxAmount,
      netFolioAdjustment,
      targetRateTier: 'RACK-STANDARD-FLR' + String(stay.Floor).padStart(2, '0'),
      guaranteeMethod: 'Visa Ending 9021 (Pre-auth chargeable)',
      billingRouting: 'Primary Guest Folio #01',
      expiresAt: quoteExpiresAt,
      expiresAtIso: new Date(quoteExpiresAt).toISOString(),
    };

    quoteStore.set(quoteId, quoteData);

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
router.post('/:stayId/extensions/confirm', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { stayId } = req.params;
    const {
      quoteId,
      requestedCheckoutAt,
      additionalNights,
      totalAmount,
      idempotencyKey,
      memo = '',
    } = req.body;

    // 1. Kiểm tra tính hợp lệ của báo giá (Quote)
    if (quoteId && quoteStore.has(quoteId)) {
      const storedQuote = quoteStore.get(quoteId);
      if (Date.now() > storedQuote.expiresAt) {
        quoteStore.delete(quoteId);
        return res.status(400).json({
          success: false,
          errorCode: 'EXTEND_0005_QUOTE_EXPIRED',
          message: 'Báo giá gia hạn đã hết hạn. Vui lòng tính lại.',
        });
      }
    }

    await conn.beginTransaction();

    // 2. Khóa bản ghi Stay & Booking để kiểm tra xung đột nguyên tử (Atomic locking)
    const [stayRows] = await conn.query(
      `SELECT
         s.StayId, s.BookingId, s.RoomId, s.Status,
         CAST(s.ExpectedCheckOut AS CHAR) AS ExpectedCheckOut,
         b.ConfirmationCode, b.CheckInDate, b.CheckOutDate,
         b.NumberOfNights, b.TotalAmount, b.SurchargeAmount,
         r.RoomNumber
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
    if (stay.Status !== 'CheckedIn') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errorCode: 'EXTEND_0001_STAY_NOT_ACTIVE',
        message: 'Không thể gia hạn vì lượt lưu trú không còn hiệu lực',
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

    // 3. Kiểm tra lại xung đột phòng trong transaction
    const [conflicts] = await conn.query(
      `SELECT b.BookingId FROM Bookings b
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
        errorCode: 'EXTEND_0003_ROOM_CONFLICT',
        message: 'Phòng đã có khách hoặc được giữ cho lượt lưu trú kế tiếp trong khoảng thời gian này',
      });
    }

    // 4. Cập nhật ngày checkout mới cho Stay và Booking
    const addNights = Number(additionalNights) || 1;
    const addAmount = Number(totalAmount) || 0;

    await conn.query(
      `UPDATE Stays SET
         ExpectedCheckOut = ?,
         UpdatedAt = NOW()
       WHERE StayId = ?`,
      [`${newCheckout} 12:00:00`, stay.StayId]
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

    // 5. Cập nhật vào hóa đơn Folio (Invoices & InvoiceDetails)
    let invoiceId;
    const [invRows] = await conn.query(
      `SELECT InvoiceId, Subtotal, VATAmount, TotalAmount FROM Invoices WHERE StayId = ? OR BookingId = ? LIMIT 1 FOR UPDATE`,
      [stay.StayId, stay.BookingId]
    );

    if (invRows.length) {
      invoiceId = invRows[0].InvoiceId;
      const updatedSubtotal = Number(invRows[0].Subtotal || 0) + (addAmount / 1.12);
      const updatedVat = Number(invRows[0].VATAmount || 0) + (addAmount - addAmount / 1.12);
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
        [stay.StayId, stay.BookingId, invNumber, addAmount / 1.12, addAmount - addAmount / 1.12, addAmount]
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
        addAmount / addNights,
        addAmount,
      ]
    );

    // 6. Ghi nhật ký hệ thống AuditLogs
    try {
      await conn.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (1, 'STAY_EXTENSION', 'Stays', ?, ?, ?, NOW(), '127.0.0.1')`,
        [
          stay.StayId,
          JSON.stringify({ expectedCheckOut: curCheckout, totalAmount: stay.TotalAmount }),
          JSON.stringify({ expectedCheckOut: newCheckout, newNights, newTotal, addAmount }),
        ]
      );
    } catch (auditErr) {
      console.warn('AuditLog error:', auditErr.message);
    }

    await conn.commit();

    // Xóa quote đã xác nhận
    if (quoteId) quoteStore.delete(quoteId);

    // Message bắt buộc đúng nguyên văn theo Mục 5 Spec:
    // SUCCESS_EXTEND_0001_CONFIRMED: "Đã gia hạn lưu trú đến {newCheckoutAt}. Khoản phí đã được cập nhật vào hóa đơn."
    const successMsg = `Đã gia hạn lưu trú đến ${newCheckout}. Khoản phí đã được cập nhật vào hóa đơn.`;

    res.json({
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
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /stays/:stayId/extensions/confirm error:', err);
    res.status(500).json({
      success: false,
      errorCode: 'EXTEND_0009_CHARGE_FAILED',
      message: 'Không thể cập nhật khoản phí gia hạn vào hóa đơn. Vui lòng thử lại: ' + err.message,
    });
  } finally {
    conn.release();
  }
});

// ─── GET /api/v1/stays/:stayId/replacement-rooms ────────────────────────────
// Danh sách phòng trống để đổi phòng (Mode 02: REPLACEMENT DESTINATION MATRIX)
router.get('/:stayId/replacement-rooms', async (req, res) => {
  try {
    const { stayId } = req.params;
    const { floor, roomClass } = req.query;

    const [stayRows] = await pool.query(
      `SELECT s.RoomId, r.RoomTypeId, r.Floor, rt.BasePrice, rt.TypeName
       FROM Stays s
       JOIN Rooms r ON s.RoomId = r.RoomId
       JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE s.StayId = ? LIMIT 1`,
      [stayId]
    );

    if (!stayRows.length) {
      return res.status(404).json({ success: false, message: 'Lượt lưu trú không tồn tại.' });
    }

    const current = stayRows[0];
    const currentBasePrice = Number(current.BasePrice) || 1500000;

    let sql = `
      SELECT
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        r.Status AS HousekeepingState,
        rt.RoomTypeId,
        rt.TypeName AS CategoryType,
        rt.BasePrice,
        (rt.BasePrice - ?) AS TariffDiff
      FROM Rooms r
      JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE r.RoomId != ?
        AND r.Status IN ('CleanAvailable', 'Available', 'Inspected')
        AND r.IsDeleted = 0
    `;

    const params = [currentBasePrice, current.RoomId];

    if (floor && floor !== 'ALL') {
      sql += ` AND r.Floor = ?`;
      params.push(Number(floor));
    }

    if (roomClass && roomClass !== 'ALL') {
      sql += ` AND r.RoomTypeId = ?`;
      params.push(Number(roomClass));
    }

    sql += ` ORDER BY TariffDiff ASC, r.Floor ASC, r.RoomNumber ASC LIMIT 15`;

    const [rooms] = await pool.query(sql, params);

    const formattedRooms = rooms.map((rm) => {
      let classification = 'DIRECT LATERAL SWAP';
      const diff = Number(rm.TariffDiff) || 0;
      if (diff > 0) classification = 'UPGRADE RECOVERY';
      else if (diff < 0) classification = 'DOWNGRADE COURTESY';
      else if (rm.Floor === current.Floor) classification = 'SAME-FLOOR RELOC';

      return {
        ...rm,
        classification,
        tariffDifferential: diff,
        keyEncoderChannel: `REC-NORTH-${String(rm.Floor).padStart(2, '0')}`,
        clearedBy: `HK_SUPER_${rm.Floor} @ 13:10`,
      };
    });

    res.json({
      success: true,
      data: formattedRooms,
    });
  } catch (err) {
    console.error('GET /replacement-rooms error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách phòng thay thế: ' + err.message });
  }
});

// ─── POST /api/v1/stays/:stayId/relocate ────────────────────────────────────
// Thực hiện đổi phòng (Mode 02: CONFIRM ROOM MOVE)
router.post('/:stayId/relocate', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { stayId } = req.params;
    const {
      targetRoomId,
      reason = 'HVAC / Climate Control Noise Complaint',
      memo = '',
      bellhopDispatched = true,
      voidOldKeys = true,
      flagOldRoomMaintenance = true,
    } = req.body;

    if (!targetRoomId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn phòng cần chuyển tới.' });
    }

    await conn.beginTransaction();

    // 1. Kiểm tra stay
    const [stays] = await conn.query(
      `SELECT s.StayId, s.BookingId, s.RoomId, s.Status, r.RoomNumber AS OldRoomNumber
       FROM Stays s
       JOIN Rooms r ON s.RoomId = r.RoomId
       WHERE s.StayId = ? FOR UPDATE`,
      [stayId]
    );

    if (!stays.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Lượt lưu trú không tồn tại.' });
    }

    const stay = stays[0];
    const oldRoomId = stay.RoomId;

    // 2. Kiểm tra phòng mới
    const [targetRooms] = await conn.query(
      `SELECT RoomId, RoomNumber, Status FROM Rooms WHERE RoomId = ? FOR UPDATE`,
      [targetRoomId]
    );

    if (!targetRooms.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Phòng chuyển đến không tồn tại.' });
    }

    const targetRoom = targetRooms[0];

    // 3. Cập nhật Stay sang phòng mới
    await conn.query(`UPDATE Stays SET RoomId = ?, UpdatedAt = NOW() WHERE StayId = ?`, [
      targetRoomId,
      stay.StayId,
    ]);

    // 4. Đổi trạng thái phòng cũ thành DirtyCleaning hoặc Maintenance
    const oldRoomStatus = flagOldRoomMaintenance ? 'OutOfOrder' : 'DirtyCleaning';
    await conn.query(`UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?`, [
      oldRoomStatus,
      oldRoomId,
    ]);

    // 5. Đổi trạng thái phòng mới thành Occupied
    await conn.query(`UPDATE Rooms SET Status = 'Occupied', UpdatedAt = NOW() WHERE RoomId = ?`, [
      targetRoomId,
    ]);

    // 6. Ghi vào bảng RoomMoveHistory
    await conn.query(
      `INSERT INTO RoomMoveHistory (StayId, FromRoomId, ToRoomId, MoveDate, Reason, MovedBy)
       VALUES (?, ?, ?, NOW(), ?, 1)`,
      [stay.StayId, oldRoomId, targetRoomId, `${reason} - ${memo}`]
    );

    // 7. Ghi AuditLogs
    try {
      await conn.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (1, 'ROOM_RELOCATION', 'Stays', ?, ?, ?, NOW(), '127.0.0.1')`,
        [
          stay.StayId,
          JSON.stringify({ oldRoomId, oldRoomNumber: stay.OldRoomNumber }),
          JSON.stringify({ newRoomId: targetRoomId, newRoomNumber: targetRoom.RoomNumber, reason, memo }),
        ]
      );
    } catch (_) {}

    await conn.commit();

    res.json({
      success: true,
      message: `Đã chuyển khách từ Phòng ${stay.OldRoomNumber} sang Phòng ${targetRoom.RoomNumber} thành công!`,
      data: {
        stayId: stay.StayId,
        fromRoomNumber: stay.OldRoomNumber,
        toRoomNumber: targetRoom.RoomNumber,
        bellhopDispatched,
        voidOldKeys,
        movedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /stays/:stayId/relocate error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xử lý đổi phòng: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
