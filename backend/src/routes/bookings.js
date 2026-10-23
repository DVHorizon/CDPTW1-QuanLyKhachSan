'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requirePermissions } = require('../middlewares/authMiddleware');
const roomAllocCtrl = require('../controllers/admin/roomAllocationController');

// ─── Hằng số trạng thái nghiệp vụ đặt phòng ─────────────────────────────────
// Khớp đúng dữ liệu đang lưu trong bảng Bookings (Pending/Confirmed/CheckedIn/Completed/Cancelled/NoShow)
const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'CheckedIn',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'NoShow',
};

// Cột Stays.Status trong CSDL dùng 'CheckedIn' (khi nhận phòng) và 'CheckedOut' (khi trả phòng)
const STAY_STATUS = {
  ACTIVE: 'CheckedIn',
  COMPLETED: 'CheckedOut',
};
const STAY_ACTIVE_STATUSES = ['Active', 'InHouse', 'CheckedIn'];
const STAY_COMPLETED_STATUSES = ['Completed', 'CheckedOut'];

// Ma trận chuyển trạng thái hợp lệ của một đặt phòng
const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'CheckedIn', 'Cancelled', 'NoShow'],
  Confirmed: ['CheckedIn', 'Cancelled', 'NoShow', 'Pending'],
  CheckedIn: ['Completed', 'Cancelled'],
  Completed: ['Confirmed', 'Pending'],
  Cancelled: ['Confirmed', 'Pending'],
  NoShow: ['Confirmed', 'CheckedIn', 'Cancelled'],
};

// Trạng thái phòng vật lý trong bảng Rooms
const ROOM_STATUS = {
  AVAILABLE: 'CleanAvailable',
  OCCUPIED: 'Occupied',
  DIRTY: 'Dirty',
};

// ─── Tiện ích dùng chung ────────────────────────────────────────────────────

// Ngày hôm nay theo giờ hệ thống (YYYY-MM-DD)
const getTodayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Kiểm tra chuỗi ngày hợp lệ theo định dạng YYYY-MM-DD
const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').trim());

// Tính số đêm giữa hai mốc ngày (YYYY-MM-DD)
const calcNights = (checkIn, checkOut) => {
  const a = new Date(`${String(checkIn).slice(0, 10)}T00:00:00`);
  const b = new Date(`${String(checkOut).slice(0, 10)}T00:00:00`);
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 0;
};

// Sinh mã xác nhận đặt phòng duy nhất (GH-<năm>-<5 số>)
const generateConfirmationCode = () =>
  `GH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

// Người dùng đại diện cho khách vãng lai (Walk-in)
const WALKIN_EMAIL = 'walkin@grandhorizon.local';
let cachedWalkInUserId = null;

const getWalkInUserId = async (conn = pool) => {
  if (cachedWalkInUserId) return cachedWalkInUserId;

  const [existing] = await conn.query(
    'SELECT UserId FROM Users WHERE Email = ? LIMIT 1',
    [WALKIN_EMAIL]
  );
  if (existing.length) {
    cachedWalkInUserId = existing[0].UserId;
    return cachedWalkInUserId;
  }

  const [[guestRole]] = await conn.query(
    "SELECT RoleId FROM Roles WHERE RoleName = 'Guest' ORDER BY RoleId LIMIT 1"
  );
  const roleId = guestRole ? guestRole.RoleId : 5;

  const [created] = await conn.query(
    `INSERT INTO Users (RoleId, FullName, Email, PasswordHash, Status, IsDeleted, CreatedAt, UpdatedAt)
     VALUES (?, 'Khách Vãng Lai (Quầy Lễ Tân)', ?, 'x', 'Active', 0, NOW(), NOW())`,
    [roleId, WALKIN_EMAIL]
  );
  cachedWalkInUserId = created.insertId;
  return cachedWalkInUserId;
};

// Ghi vết thao tác nhạy cảm lên đặt phòng (bảng AuditLogs)
const writeAuditLog = async (conn, { userId, action, bookingId, oldValues, newValues, reason, ip }) => {
  try {
    const merged = reason
      ? { ...(newValues || {}), note: reason }
      : newValues || null;

    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, ?, 'Bookings', ?, ?, ?, NOW(), ?)`,
      [
        userId || null,
        action,
        bookingId,
        oldValues ? JSON.stringify(oldValues) : null,
        merged ? JSON.stringify(merged) : null,
        ip || null,
      ]
    );
  } catch (err) {
    console.warn('Không ghi được AuditLogs:', err.message);
  }
};

// ─── GET /api/bookings/phong-trong — Danh sách phòng có thể gán cho khách ───
router.get('/phong-trong', async (req, res) => {
  try {
    const { roomTypeId, bookingId } = req.query;

    let sql = `
      SELECT r.RoomId, r.RoomNumber, r.Floor, r.RoomTypeId, r.Status,
             rt.TypeName AS RoomTypeName, rt.BasePrice
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE r.IsDeleted = 0
    `;
    const params = [];

    if (roomTypeId && String(roomTypeId).trim() && roomTypeId !== 'all') {
      sql += ' AND r.RoomTypeId = ?';
      params.push(Number(roomTypeId));
    }

    // Lấy phòng sạch còn trống, hoặc phòng đang gán cho chính đặt phòng này
    let stayRoomId = null;
    if (bookingId) {
      const [stays] = await pool.query(
        'SELECT RoomId FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
        [bookingId]
      );
      if (stays.length) stayRoomId = stays[0].RoomId;
    }

    if (stayRoomId) {
      sql += ` AND (r.Status = ? OR r.RoomId = ?)`;
      params.push(ROOM_STATUS.AVAILABLE, stayRoomId);
    } else {
      sql += ' AND r.Status = ?';
      params.push(ROOM_STATUS.AVAILABLE);
    }

    sql += ' ORDER BY r.Floor ASC, r.RoomNumber ASC LIMIT 200';

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('GET /api/bookings/phong-trong error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải danh sách phòng trống: ' + err.message });
  }
});

// ─── GET /api/bookings (Tìm kiếm, xem chi tiết, lọc theo ngày & trạng thái) ──
router.get('/', async (req, res) => {
  try {
    const {
      query,          // Tìm theo mã booking, tên, CCCD/hộ chiếu, SĐT, email, số phòng
      date,           // Lọc theo ngày đến (YYYY-MM-DD)
      roomType,       // Lọc theo RoomTypeId hoặc tên hạng phòng
      source,         // Lọc theo BookingSource (DirectWeb, OTA, Corp, WalkIn, Phone)
      status,         // Tab trạng thái: all | Pending | Confirmed | CheckedIn | DueIn | DueOut | Completed | Cancelled
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    const todayStr = getTodayStr();

    // ── Bộ lọc nền ──
    const baseClauses = ['1=1'];
    const baseParams = [];

    if (query && String(query).trim()) {
      const q = `%${String(query).trim()}%`;
      baseClauses.push(`(
        b.ConfirmationCode LIKE ? OR
        COALESCE(bg.FullName, u.FullName) LIKE ? OR
        COALESCE(bg.Phone, u.Phone) LIKE ? OR
        COALESCE(bg.IdNumber, u.IdNumber) LIKE ? OR
        COALESCE(bg.Email, u.Email) LIKE ? OR
        r.RoomNumber LIKE ?
      )`);
      baseParams.push(q, q, q, q, q, q);
    }

    if (date && String(date).trim() && date !== 'all') {
      const trimmedDate = String(date).trim();
      if (!isValidDateStr(trimmedDate)) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ngày hợp lệ (định dạng YYYY-MM-DD).',
        });
      }
      baseClauses.push('DATE(b.CheckInDate) = ?');
      baseParams.push(trimmedDate);
    }

    if (roomType && roomType !== 'all') {
      baseClauses.push('(b.RoomTypeId = ? OR rt.TypeName = ?)');
      baseParams.push(roomType, roomType);
    }

    if (source && source !== 'all') {
      baseClauses.push('b.BookingSource = ?');
      baseParams.push(source);
    }

    const baseWhereSql = baseClauses.join(' AND ');

    // ── Điều kiện riêng của tab trạng thái đang chọn ──
    const statusClauses = [];
    const statusParams = [];

    if (status && status !== 'all') {
      if (status === 'DueIn') {
        statusClauses.push("DATE(b.CheckInDate) = ? AND b.Status NOT IN ('Cancelled', 'NoShow', 'Completed')");
        statusParams.push(todayStr);
      } else if (status === 'DueOut') {
        statusClauses.push("DATE(b.CheckOutDate) = ? AND b.Status IN ('CheckedIn', 'InHouse')");
        statusParams.push(todayStr);
      } else if (status === 'CheckedIn') {
        statusClauses.push("(b.Status = 'CheckedIn' OR b.Status = 'InHouse')");
      } else if (status === 'Cancelled') {
        statusClauses.push("(b.Status = 'Cancelled' OR b.Status = 'NoShow')");
      } else if (status === 'Completed') {
        statusClauses.push("(b.Status = 'Completed' OR b.Status = 'CheckedOut')");
      } else {
        statusClauses.push('b.Status = ?');
        statusParams.push(status);
      }
    }

    const whereSql = [baseWhereSql, ...statusClauses].join(' AND ');
    const params = [...baseParams, ...statusParams];

    // ── Query đếm tổng số bản ghi ──
    const countQuery = `
      SELECT COUNT(DISTINCT b.BookingId) AS total
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countQuery, params);

    // ── Query lấy danh sách đặt phòng ──
    const dataQuery = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
        b.NumberOfNights,
        b.Adults,
        b.Children,
        b.RoomQuantity,
        b.TotalAmount,
        b.DepositAmount,
        b.Status,
        b.BookingSource,
        b.ConfirmationSentAt,
        b.Note,
        CAST(b.CreatedAt AS CHAR) AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR) AS UpdatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.IdNumber, u.IdNumber, '---') AS NationalId,
        COALESCE(rt.TypeName, 'Hạng Phòng Tiêu Chuẩn') AS RoomTypeName,
        rt.RoomTypeId,
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        s.StayId,
        s.Status AS StayStatus
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${whereSql}
      ORDER BY b.CheckInDate ASC, b.BookingId DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...params, limitNum, offset]);

    // ── Số đếm cho từng tab ──
    const [tabCountsRows] = await pool.query(
      `
      SELECT
        COUNT(DISTINCT b.BookingId) AS totalAll,
        COUNT(DISTINCT CASE WHEN b.Status = 'Pending'  THEN b.BookingId END) AS totalPending,
        COUNT(DISTINCT CASE WHEN b.Status = 'Confirmed' THEN b.BookingId END) AS totalConfirmed,
        COUNT(DISTINCT CASE WHEN b.Status IN ('CheckedIn', 'InHouse') THEN b.BookingId END) AS totalCheckedIn,
        COUNT(DISTINCT CASE WHEN DATE(b.CheckInDate) = ? AND b.Status NOT IN ('Cancelled','NoShow','Completed') THEN b.BookingId END) AS totalDueIn,
        COUNT(DISTINCT CASE WHEN DATE(b.CheckOutDate) = ? AND b.Status IN ('CheckedIn','InHouse') THEN b.BookingId END) AS totalDueOut,
        COUNT(DISTINCT CASE WHEN b.Status IN ('Completed','CheckedOut') THEN b.BookingId END) AS totalCompleted,
        COUNT(DISTINCT CASE WHEN b.Status IN ('Cancelled','NoShow') THEN b.BookingId END) AS totalCancelled
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${baseWhereSql}
      `,
      [todayStr, todayStr, ...baseParams]
    );

    const tc = tabCountsRows[0] || {};
    const tabCounts = {
      all: Number(tc.totalAll) || 0,
      pending: Number(tc.totalPending) || 0,
      confirmed: Number(tc.totalConfirmed) || 0,
      checkedIn: Number(tc.totalCheckedIn) || 0,
      dueIn: Number(tc.totalDueIn) || 0,
      dueOut: Number(tc.totalDueOut) || 0,
      completed: Number(tc.totalCompleted) || 0,
      cancelled: Number(tc.totalCancelled) || 0,
    };

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total) || 0,
        totalPages: Math.ceil((Number(total) || 0) / limitNum) || 1,
      },
      tabCounts,
      today: todayStr,
    });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi truy vấn danh sách đặt phòng: ' + err.message,
    });
  }
});

// ─── FEAT-ROOMALLOC-01: Booking Confirmation & Room Allocation Endpoints ────
router.put('/:id/confirm', requirePermissions('BOOKING_CONFIRM'), roomAllocCtrl.confirmBooking);
router.post('/:id/confirm', requirePermissions('BOOKING_CONFIRM'), roomAllocCtrl.confirmBooking);
router.post('/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), roomAllocCtrl.allocateRooms);
router.post(
  '/:id/confirm-and-allocate',
  requirePermissions(['BOOKING_CONFIRM', 'ROOM_ALLOCATION']),
  roomAllocCtrl.confirmAndAllocate
);
router.delete('/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), roomAllocCtrl.deallocateRooms);

// ─── GET /api/bookings/:id (Xem chi tiết một đặt phòng) ──────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, code: 'ERROR_0001_REQUIRED', message: 'Mã đặt phòng không hợp lệ.' });
    }

    const query = `
      SELECT
        b.*,
        CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
        CAST(b.CreatedAt AS CHAR)    AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR)    AS UpdatedAt,
        CAST(b.ConfirmedAt AS CHAR)  AS ConfirmedAt,
        CAST(b.AllocatedAt AS CHAR)  AS AllocatedAt,
        CAST(b.ConfirmationSentAt AS CHAR) AS ConfirmationSentAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.IdNumber, u.IdNumber, '---') AS NationalId,
        COALESCE(bg.IdType, u.IdType, 'CCCD') AS IdType,
        COALESCE(rt.TypeName, 'Hạng Phòng Tiêu Chuẩn') AS RoomTypeName,
        rt.BasePrice,
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        s.StayId,
        s.Status AS StayStatus,
        CAST(COALESCE(s.ActualCheckIn, s.CheckInTime) AS CHAR)   AS CheckInTime,
        CAST(COALESCE(s.ActualCheckOut, s.CheckOutTime) AS CHAR) AS CheckOutTime
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN BookingRoomAllocations bra ON b.BookingId = bra.BookingId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON COALESCE(bra.RoomId, s.RoomId) = r.RoomId
      WHERE b.BookingId = ?
      ORDER BY s.StayId DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        isRecordDeleted: true,
        message: 'Không tìm thấy booking',
      });
    }

    // Lấy danh sách các phòng được gán
    const [allocRows] = await pool.query(
      `SELECT bra.RoomId, r.RoomNumber, r.Floor, r.Status AS RoomStatus, rt.TypeName AS RoomTypeName,
              bra.AllocationNote, CAST(bra.AllocatedAt AS CHAR) AS AllocatedAt
       FROM BookingRoomAllocations bra
       JOIN Rooms r ON bra.RoomId = r.RoomId
       LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE bra.BookingId = ?`,
      [id]
    );

    const bookingData = {
      ...rows[0],
      quantity: rows[0].RoomQuantity || 1,
      bookingCode: rows[0].ConfirmationCode,
      bookingStatus: rows[0].Status,
      checkInDate: rows[0].CheckInDate,
      checkOutDate: rows[0].CheckOutDate,
      roomTypeId: rows[0].RoomTypeId,
      roomTypeName: rows[0].RoomTypeName,
      allocatedRooms: allocRows,
      roomIds: allocRows.map((a) => a.RoomId),
      confirmedBy: rows[0].ConfirmedBy,
      confirmedAt: rows[0].ConfirmedAt,
      allocatedAt: rows[0].AllocatedAt,
    };

    res.json({ success: true, data: bookingData });
  } catch (err) {
    console.error('GET /api/bookings/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── POST /api/bookings (Tạo đặt phòng mới / Walk-in) ───────────────────────
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      guestName,
      guestPhone,
      guestEmail,
      nationalId,
      idType = 'CCCD',
      roomTypeId,
      roomId,
      checkInDate,
      checkOutDate,
      adults = 2,
      children = 0,
      totalAmount,
      depositAmount = 0,
      bookingSource = 'WalkIn',
      status = BOOKING_STATUS.CONFIRMED,
      note,
    } = req.body;

    // ── Kiểm tra dữ liệu bắt buộc (Không được để trống) ──
    const trimmedName = String(guestName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ tên khách hàng không được để trống (tối thiểu 2 ký tự).' });
    }
    if (!isValidDateStr(checkInDate) || !isValidDateStr(checkOutDate)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày đến và ngày đi hợp lệ (YYYY-MM-DD).' });
    }
    const nights = calcNights(checkInDate, checkOutDate);
    if (nights < 1) {
      return res.status(400).json({ success: false, message: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.' });
    }
    if (!roomTypeId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hạng phòng.' });
    }

    // Kiểm tra định dạng số điện thoại nếu có
    const trimmedPhone = guestPhone ? String(guestPhone).trim() : null;
    if (trimmedPhone && !/^[0-9+.\s()-]{8,20}$/.test(trimmedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không đúng định dạng.' });
    }

    // Kiểm tra định dạng email nếu có
    const trimmedEmail = guestEmail ? String(guestEmail).trim() : null;
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng.' });
    }

    const [rtRows] = await conn.query(
      'SELECT RoomTypeId, TypeName, BasePrice FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0',
      [roomTypeId]
    );
    if (!rtRows.length) {
      return res.status(400).json({ success: false, message: 'Hạng phòng không tồn tại hoặc đã ngừng kinh doanh.' });
    }

    const roomType = rtRows[0];
    const basePrice = Number(roomType.BasePrice) || 0;
    const computedTotal = nights * basePrice;
    const finalTotal =
      totalAmount !== undefined && totalAmount !== null && Number(totalAmount) > 0
        ? Number(totalAmount)
        : computedTotal;
    const finalDeposit = Math.max(0, Number(depositAmount) || 0);

    if (finalDeposit < 0) {
      return res.status(400).json({ success: false, message: 'Tiền đặt cọc không được là số âm.' });
    }
    if (finalDeposit > finalTotal) {
      return res.status(400).json({ success: false, message: 'Tiền đặt cọc không được lớn hơn tổng tiền đặt phòng.' });
    }

    await conn.beginTransaction();

    // Kiểm tra phòng gán sẵn (nếu có)
    let assignedRoomId = null;
    if (roomId) {
      const [rCheck] = await conn.query(
        'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
        [roomId]
      );
      if (!rCheck.length || rCheck[0].IsDeleted) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Phòng được chọn không tồn tại trong hệ thống.' });
      }
      if (rCheck[0].Status !== ROOM_STATUS.AVAILABLE) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Phòng ${rCheck[0].RoomNumber} hiện không ở trạng thái sẵn sàng (${rCheck[0].Status}). Vui lòng chọn phòng khác.`,
        });
      }
      assignedRoomId = rCheck[0].RoomId;
    }

    const userId = await getWalkInUserId(conn);

    // Sinh mã xác nhận duy nhất
    let confCode;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateConfirmationCode();
      const [dup] = await conn.query('SELECT BookingId FROM Bookings WHERE ConfirmationCode = ? LIMIT 1', [candidate]);
      if (!dup.length) {
        confCode = candidate;
        break;
      }
    }
    if (!confCode) confCode = `GH-${Date.now()}`;

    const [result] = await conn.query(
      `INSERT INTO Bookings (
        UserId, RoomTypeId, CheckInDate, CheckOutDate, NumberOfNights, Adults, Children,
        RoomQuantity, RoomSubtotal, SurchargeAmount, DiscountAmount, TotalAmount, DepositAmount,
        Status, BookingSource, ConfirmationCode, Note, CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        roomType.RoomTypeId,
        String(checkInDate).slice(0, 10),
        String(checkOutDate).slice(0, 10),
        nights,
        Math.max(1, Number(adults) || 1),
        Math.max(0, Number(children) || 0),
        computedTotal,
        finalTotal,
        finalDeposit,
        status,
        bookingSource,
        confCode,
        note ? String(note).trim() : null,
      ]
    );

    const newBookingId = result.insertId;

    // Lưu thông tin khách chính
    const cleanId = nationalId && String(nationalId).trim() ? String(nationalId).trim() : null;

    await conn.query(
      `INSERT INTO BookingGuests (BookingId, FullName, Email, Phone, IdNumber, IdType, IsPrimaryGuest, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [newBookingId, trimmedName, trimmedEmail, trimmedPhone, cleanId, idType]
    );

    // Gán phòng và tạo Stays nếu có chọn phòng hoặc check-in ngay
    if (assignedRoomId) {
      const isCheckInNow = status === BOOKING_STATUS.CHECKED_IN;
      await conn.query(
        `INSERT INTO Stays (BookingId, RoomId, Status, ActualCheckIn, CheckInTime, ExpectedCheckOut, DepositAmount, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ${isCheckInNow ? 'NOW()' : 'NULL'}, ${isCheckInNow ? 'NOW()' : 'NULL'}, DATE_ADD(NOW(), INTERVAL ? DAY), ?, NOW(), NOW())`,
        [newBookingId, assignedRoomId, isCheckInNow ? STAY_STATUS.ACTIVE : 'Confirmed', nights, finalDeposit]
      );

      if (isCheckInNow) {
        await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
          ROOM_STATUS.OCCUPIED,
          assignedRoomId,
        ]);
      }
    }

    await writeAuditLog(conn, {
      userId,
      action: 'CREATE_BOOKING',
      bookingId: newBookingId,
      newValues: {
        ConfirmationCode: confCode,
        RoomTypeId: roomType.RoomTypeId,
        RoomId: assignedRoomId,
        CheckInDate: checkInDate,
        CheckOutDate: checkOutDate,
        TotalAmount: finalTotal,
        Status: status,
      },
      reason: note || null,
    });

    await conn.commit();

    res.json({
      success: true,
      message: `Đã tạo đặt phòng ${confCode} thành công (${nights} đêm • ${roomType.TypeName}).`,
      bookingId: newBookingId,
      confirmationCode: confCode,
      numberOfNights: nights,
      totalAmount: finalTotal,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/bookings error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo đặt phòng: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── PUT /api/bookings/:id (Chỉnh sửa đặt phòng & Concurrency check) ─────────
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, message: 'Mã đặt phòng không hợp lệ.' });
    }

    const {
      guestName,
      guestPhone,
      guestEmail,
      nationalId,
      idType = 'CCCD',
      roomTypeId,
      roomId,
      checkInDate,
      checkOutDate,
      adults = 2,
      children = 0,
      totalAmount,
      depositAmount = 0,
      bookingSource = 'WalkIn',
      status,
      note,
      lastUpdatedAt, // Kiểm tra xung đột sửa/xóa đồng thời
    } = req.body;

    // ── Kiểm tra dữ liệu bắt buộc (Không được để trống) ──
    const trimmedName = String(guestName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ tên khách hàng không được để trống (tối thiểu 2 ký tự).' });
    }
    if (!isValidDateStr(checkInDate) || !isValidDateStr(checkOutDate)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày đến và ngày đi hợp lệ (YYYY-MM-DD).' });
    }
    const nights = calcNights(checkInDate, checkOutDate);
    if (nights < 1) {
      return res.status(400).json({ success: false, message: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.' });
    }
    if (!roomTypeId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hạng phòng.' });
    }

    const trimmedPhone = guestPhone ? String(guestPhone).trim() : null;
    if (trimmedPhone && !/^[0-9+.\s()-]{8,20}$/.test(trimmedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không đúng định dạng.' });
    }

    const trimmedEmail = guestEmail ? String(guestEmail).trim() : null;
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng.' });
    }

    const numTotal = Number(totalAmount) || 0;
    const numDeposit = Number(depositAmount) || 0;
    if (numDeposit < 0) {
      return res.status(400).json({ success: false, message: 'Tiền đặt cọc không được là số âm.' });
    }
    if (numTotal < 0) {
      return res.status(400).json({ success: false, message: 'Tổng tiền đặt phòng không được là số âm.' });
    }
    if (numDeposit > numTotal) {
      return res.status(400).json({ success: false, message: 'Tiền cọc không được lớn hơn tổng số tiền của đặt phòng.' });
    }

    await conn.beginTransaction();

    // ── 1. Khóa và kiểm tra tồn tại ("người này sửa người kia xóa database") ──
    const [existingRows] = await conn.query(
      'SELECT * FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [id]
    );

    if (!existingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Lỗi đồng bộ: Đặt phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác)!',
      });
    }

    const currentBooking = existingRows[0];

    // ── 2. Concurrency check (Optimistic Locking) ──
    if (lastUpdatedAt) {
      const dbTimestamp = new Date(currentBooking.UpdatedAt).getTime();
      const clientTimestamp = new Date(lastUpdatedAt).getTime();
      if (dbTimestamp > clientTimestamp + 1500) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          isConflict: true,
          message: 'Dữ liệu đặt phòng đã bị người dùng khác sửa đổi trong lúc bạn thao tác. Hệ thống sẽ tải lại dữ liệu mới nhất!',
        });
      }
    }

    // ── 3. Kiểm tra hạng phòng ──
    const [rtRows] = await conn.query(
      'SELECT RoomTypeId, TypeName, BasePrice FROM RoomTypes WHERE RoomTypeId = ? AND IsDeleted = 0',
      [roomTypeId]
    );
    if (!rtRows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Hạng phòng đã chọn không tồn tại hoặc đã bị vô hiệu hóa.' });
    }

    const targetStatus = status || currentBooking.Status;

    // ── 4. Xử lý gán/đổi phòng vật lý (Stays) ──
    const [currentStays] = await conn.query(
      'SELECT StayId, RoomId, Status FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
      [id]
    );
    const curStay = currentStays[0] || null;
    const oldRoomId = curStay ? curStay.RoomId : null;
    const newRoomId = roomId ? Number(roomId) : null;

    if (newRoomId && newRoomId !== oldRoomId) {
      const [newRoomRows] = await conn.query(
        'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
        [newRoomId]
      );
      if (!newRoomRows.length || newRoomRows[0].IsDeleted) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Phòng mới được chọn không tồn tại trong hệ thống.' });
      }

      if (newRoomRows[0].Status !== ROOM_STATUS.AVAILABLE) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Phòng ${newRoomRows[0].RoomNumber} hiện không ở trạng thái sẵn sàng (${newRoomRows[0].Status}).`,
        });
      }

      // Nhả phòng cũ nếu đang Occupied
      if (oldRoomId && oldRoomId !== newRoomId) {
        await conn.query(
          'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ? AND Status = ?',
          [ROOM_STATUS.AVAILABLE, oldRoomId, ROOM_STATUS.OCCUPIED]
        );
      }

      // Nếu đang CheckedIn, đổi phòng mới sang Occupied
      if (targetStatus === BOOKING_STATUS.CHECKED_IN) {
        await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
          ROOM_STATUS.OCCUPIED,
          newRoomId,
        ]);
      }

      if (curStay) {
        await conn.query(
          `UPDATE Stays SET RoomId = ?, ExpectedCheckOut = DATE_ADD(NOW(), INTERVAL ? DAY), UpdatedAt = NOW() WHERE StayId = ?`,
          [newRoomId, nights, curStay.StayId]
        );
      } else {
        await conn.query(
          `INSERT INTO Stays (BookingId, RoomId, Status, ActualCheckIn, CheckInTime, ExpectedCheckOut, DepositAmount, CreatedAt, UpdatedAt)
           VALUES (?, ?, ?, ${targetStatus === BOOKING_STATUS.CHECKED_IN ? 'NOW()' : 'NULL'}, ${targetStatus === BOOKING_STATUS.CHECKED_IN ? 'NOW()' : 'NULL'}, DATE_ADD(NOW(), INTERVAL ? DAY), ?, NOW(), NOW())`,
          [id, newRoomId, targetStatus === BOOKING_STATUS.CHECKED_IN ? STAY_STATUS.ACTIVE : 'Confirmed', nights, numDeposit]
        );
      }
    }

    // ── 5. Cập nhật bảng Bookings ──
    await conn.query(
      `UPDATE Bookings SET
        RoomTypeId = ?,
        CheckInDate = ?,
        CheckOutDate = ?,
        NumberOfNights = ?,
        Adults = ?,
        Children = ?,
        TotalAmount = ?,
        DepositAmount = ?,
        BookingSource = ?,
        Status = ?,
        Note = ?,
        UpdatedAt = NOW()
       WHERE BookingId = ?`,
      [
        roomTypeId,
        String(checkInDate).slice(0, 10),
        String(checkOutDate).slice(0, 10),
        nights,
        Math.max(1, Number(adults) || 1),
        Math.max(0, Number(children) || 0),
        numTotal,
        numDeposit,
        bookingSource,
        targetStatus,
        note ? String(note).trim() : null,
        id,
      ]
    );

    // ── 6. Cập nhật hoặc thêm khách chính vào BookingGuests ──
    const [existingGuest] = await conn.query(
      'SELECT BookingGuestId FROM BookingGuests WHERE BookingId = ? AND IsPrimaryGuest = 1 LIMIT 1',
      [id]
    );

    if (existingGuest.length) {
      await conn.query(
        `UPDATE BookingGuests SET
          FullName = ?,
          Email = ?,
          Phone = ?,
          IdNumber = ?,
          IdType = ?
         WHERE BookingGuestId = ?`,
        [trimmedName, trimmedEmail, trimmedPhone, nationalId ? String(nationalId).trim() : null, idType, existingGuest[0].BookingGuestId]
      );
    } else {
      await conn.query(
        `INSERT INTO BookingGuests (BookingId, FullName, Email, Phone, IdNumber, IdType, IsPrimaryGuest, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
        [id, trimmedName, trimmedEmail, trimmedPhone, nationalId ? String(nationalId).trim() : null, idType]
      );
    }

    await writeAuditLog(conn, {
      userId: null,
      action: 'UPDATE_BOOKING',
      bookingId: Number(id),
      oldValues: {
        Status: currentBooking.Status,
        RoomTypeId: currentBooking.RoomTypeId,
        TotalAmount: currentBooking.TotalAmount,
        CheckInDate: currentBooking.CheckInDate,
        CheckOutDate: currentBooking.CheckOutDate,
      },
      newValues: {
        GuestName: trimmedName,
        Status: targetStatus,
        RoomTypeId: Number(roomTypeId),
        TotalAmount: numTotal,
        CheckInDate,
        CheckOutDate,
      },
      reason: note || 'Cập nhật thông tin đặt phòng',
    });

    await conn.commit();

    res.json({
      success: true,
      message: `Đã cập nhật thành công đặt phòng ${currentBooking.ConfirmationCode || `#${id}`}.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/bookings/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật đặt phòng: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── PATCH /api/bookings/:id/status (Chuyển trạng thái đặt phòng) ────────────
router.patch('/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, roomId, note, lastUpdatedAt } = req.body;

    const allowed = [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.CHECKED_IN,
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.NO_SHOW,
    ];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${allowed.join(', ')}.`,
      });
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT BookingId, Status, ConfirmationCode, UpdatedAt FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Lỗi đồng bộ: Đặt phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị hủy hoặc xóa bởi người khác)!',
      });
    }

    const prevStatus = existing[0].Status;
    const confCode = existing[0].ConfirmationCode;

    // Concurrency check
    if (lastUpdatedAt) {
      const dbTimestamp = new Date(existing[0].UpdatedAt).getTime();
      const clientTimestamp = new Date(lastUpdatedAt).getTime();
      if (dbTimestamp > clientTimestamp + 1500) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          isConflict: true,
          message: 'Dữ liệu đặt phòng đã bị người dùng khác cập nhật trước đó. Vui lòng làm mới để xem trạng thái mới nhất!',
        });
      }
    }

    // Chặn các bước nhảy trạng thái không hợp lệ
    const allowedNext = ALLOWED_TRANSITIONS[prevStatus] || [];
    if (prevStatus !== status && !allowedNext.includes(status)) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Không thể chuyển từ "${prevStatus}" sang "${status}". Vui lòng thực hiện đúng quy trình nghiệp vụ.`,
      });
    }

    // Lấy lượt lưu trú hiện tại
    const [stays] = await conn.query(
      'SELECT StayId, RoomId, Status FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
      [id]
    );
    const currentStay = stays[0] || null;

    // ── Phân luồng nghiệp vụ theo trạng thái đích ──
    if (status === BOOKING_STATUS.CHECKED_IN) {
      let targetRoomId = roomId || (currentStay ? currentStay.RoomId : null);
      if (!targetRoomId) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn phòng vật lý để làm thủ tục check-in cho khách.',
        });
      }

      const [rooms] = await conn.query(
        'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
        [targetRoomId]
      );
      if (!rooms.length || rooms[0].IsDeleted) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Phòng được chọn không tồn tại trong hệ thống.' });
      }

      const isSameRoom = currentStay && Number(currentStay.RoomId) === Number(targetRoomId);
      if (!isSameRoom && rooms[0].Status !== ROOM_STATUS.AVAILABLE) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Phòng ${rooms[0].RoomNumber} hiện không ở trạng thái sẵn sàng (${rooms[0].Status}). Vui lòng chọn phòng khác.`,
        });
      }

      if (currentStay) {
        await conn.query(
          `UPDATE Stays SET
            RoomId = ?,
            Status = ?,
            ActualCheckIn = COALESCE(ActualCheckIn, NOW()),
            CheckInTime = COALESCE(CheckInTime, NOW()),
            UpdatedAt = NOW()
           WHERE StayId = ?`,
          [targetRoomId, STAY_STATUS.ACTIVE, currentStay.StayId]
        );
      } else {
        await conn.query(
          `INSERT INTO Stays (BookingId, RoomId, Status, ActualCheckIn, CheckInTime, CreatedAt, UpdatedAt)
           VALUES (?, ?, ?, NOW(), NOW(), NOW(), NOW())`,
          [id, targetRoomId, STAY_STATUS.ACTIVE]
        );
      }

      await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
        ROOM_STATUS.OCCUPIED,
        targetRoomId,
      ]);
    }

    if (status === BOOKING_STATUS.COMPLETED) {
      if (currentStay) {
        await conn.query(
          `UPDATE Stays SET
            Status = ?,
            ActualCheckOut = NOW(),
            CheckOutTime = NOW(),
            UpdatedAt = NOW()
           WHERE StayId = ?`,
          [STAY_STATUS.COMPLETED, currentStay.StayId]
        );
        if (currentStay.RoomId) {
          await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
            ROOM_STATUS.DIRTY,
            currentStay.RoomId,
          ]);
        }
      }
    }

    if (status === BOOKING_STATUS.CANCELLED || status === BOOKING_STATUS.NO_SHOW) {
      if (currentStay && STAY_ACTIVE_STATUSES.includes(currentStay.Status)) {
        await conn.query(
          `UPDATE Stays SET
            Status = ?,
            ActualCheckOut = NOW(),
            CheckOutTime = NOW(),
            UpdatedAt = NOW()
           WHERE StayId = ?`,
          [STAY_STATUS.COMPLETED, currentStay.StayId]
        );
        if (currentStay.RoomId) {
          await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
            ROOM_STATUS.AVAILABLE,
            currentStay.RoomId,
          ]);
        }
      }
    }

    await conn.query('UPDATE Bookings SET Status = ?, UpdatedAt = NOW() WHERE BookingId = ?', [status, id]);

    await writeAuditLog(conn, {
      userId: null,
      action: `BOOKING_STATUS_${String(status).toUpperCase()}`,
      bookingId: Number(id),
      oldValues: { Status: prevStatus },
      newValues: { Status: status, RoomId: roomId || null },
      reason: note || null,
    });

    await conn.commit();

    const statusLabel = {
      Pending: 'Chờ xác nhận',
      Confirmed: 'Đã xác nhận',
      CheckedIn: 'Đang lưu trú',
      Completed: 'Đã trả phòng',
      Cancelled: 'Đã hủy',
      NoShow: 'Khách không đến (No-Show)',
    }[status] || status;

    res.json({
      success: true,
      message: `Đã cập nhật đặt phòng ${confCode} sang trạng thái: ${statusLabel}.`,
      status,
    });
  } catch (err) {
    await conn.rollback();
    console.error('PATCH /api/bookings/:id/status error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── DELETE /api/bookings/:id (Xóa đặt phòng an toàn) ───────────────────────
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, message: 'Mã đặt phòng không hợp lệ.' });
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT BookingId, Status, ConfirmationCode FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [id]
    );

    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Lỗi đồng bộ: Đặt phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa trước đó)!',
      });
    }

    const { Status: curStatus, ConfirmationCode: confCode } = existing[0];

    // Chặn xóa nếu khách đang lưu trú
    if (curStatus === 'CheckedIn' || curStatus === 'InHouse') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể xóa đặt phòng "${confCode}" vì khách đang lưu trú tại khách sạn. Vui lòng thực hiện Check-out hoặc Hủy phòng trước khi xóa!`,
      });
    }

    // Thu hồi phòng nếu đang chiếm giữ phòng
    const [stays] = await conn.query('SELECT StayId, RoomId FROM Stays WHERE BookingId = ?', [id]);
    for (const st of stays) {
      if (st.RoomId) {
        await conn.query(
          'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ? AND Status = ?',
          [ROOM_STATUS.AVAILABLE, st.RoomId, ROOM_STATUS.OCCUPIED]
        );
      }
    }

    // Xóa cascade an toàn các dữ liệu ràng buộc
    const stayIds = stays.map((s) => s.StayId);
    if (stayIds.length) {
      await conn.query('DELETE FROM RoomMoveHistory WHERE StayId IN (?)', [stayIds]);
      await conn.query('DELETE FROM Stays WHERE BookingId = ?', [id]);
    }
    await conn.query('DELETE FROM BookingGuests WHERE BookingId = ?', [id]);
    await conn.query('DELETE FROM Payments WHERE BookingId = ?', [id]);
    await conn.query('DELETE FROM Invoices WHERE BookingId = ?', [id]);
    await conn.query('DELETE FROM Bookings WHERE BookingId = ?', [id]);

    await writeAuditLog(conn, {
      userId: null,
      action: 'DELETE_BOOKING',
      bookingId: Number(id),
      oldValues: { ConfirmationCode: confCode, Status: curStatus },
      reason: req.body?.reason || 'Xóa đặt phòng bởi nhân viên quản trị',
    });

    await conn.commit();

    res.json({
      success: true,
      message: `Đã xóa vĩnh viễn đặt phòng ${confCode} khỏi cơ sở dữ liệu và giải phóng phòng thành công.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/bookings/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa đặt phòng: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── POST /api/bookings/batch-delete (Xóa hàng loạt) ────────────────────────
router.post('/batch-delete', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một đặt phòng cần xóa.' });
    }

    const numericIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (!numericIds.length) {
      return res.status(400).json({ success: false, message: 'Danh sách đặt phòng không hợp lệ.' });
    }

    await conn.beginTransaction();

    const [bookings] = await conn.query(
      'SELECT BookingId, Status, ConfirmationCode FROM Bookings WHERE BookingId IN (?) FOR UPDATE',
      [numericIds]
    );

    const deletable = bookings.filter((b) => b.Status !== 'CheckedIn' && b.Status !== 'InHouse');
    const skippedCount = bookings.length - deletable.length;

    if (!deletable.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tất cả các đặt phòng được chọn đều đang trong trạng thái lưu trú (CheckedIn). Không thể xóa!',
      });
    }

    const deletableIds = deletable.map((b) => b.BookingId);

    // Thu hồi phòng
    const [stays] = await conn.query('SELECT StayId, RoomId FROM Stays WHERE BookingId IN (?)', [deletableIds]);
    const stayIds = stays.map((s) => s.StayId);
    for (const st of stays) {
      if (st.RoomId) {
        await conn.query(
          'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ? AND Status = ?',
          [ROOM_STATUS.AVAILABLE, st.RoomId, ROOM_STATUS.OCCUPIED]
        );
      }
    }

    if (stayIds.length) {
      await conn.query('DELETE FROM RoomMoveHistory WHERE StayId IN (?)', [stayIds]);
      await conn.query('DELETE FROM Stays WHERE BookingId IN (?)', [deletableIds]);
    }
    await conn.query('DELETE FROM BookingGuests WHERE BookingId IN (?)', [deletableIds]);
    await conn.query('DELETE FROM Payments WHERE BookingId IN (?)', [deletableIds]);
    await conn.query('DELETE FROM Invoices WHERE BookingId IN (?)', [deletableIds]);
    const [result] = await conn.query('DELETE FROM Bookings WHERE BookingId IN (?)', [deletableIds]);

    await conn.commit();

    res.json({
      success: true,
      deletedCount: result.affectedRows,
      skippedCount,
      message: `Đã xóa thành công ${result.affectedRows} đặt phòng${skippedCount > 0 ? ` (bỏ qua ${skippedCount} đặt phòng đang lưu trú)` : ''}.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/bookings/batch-delete error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa hàng loạt: ' + err.message });
  } finally {
    conn.release();
  }
});

// ─── POST /api/bookings/batch-confirm (Duyệt xác nhận hàng loạt) ────────────
router.post('/batch-confirm', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một đặt phòng.' });
    }

    const numericIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (!numericIds.length) {
      return res.status(400).json({ success: false, message: 'Danh sách đặt phòng không hợp lệ.' });
    }

    const [result] = await pool.query(
      `UPDATE Bookings SET Status = 'Confirmed', UpdatedAt = NOW()
       WHERE BookingId IN (?) AND Status IN ('Pending', 'NoShow')`,
      [numericIds]
    );

    res.json({
      success: true,
      message: `Đã xác nhận ${result.affectedRows} đặt phòng (bỏ qua ${numericIds.length - result.affectedRows} bản ghi không ở trạng thái chờ xác nhận).`,
      confirmedCount: result.affectedRows,
    });
  } catch (err) {
    console.error('POST /api/bookings/batch-confirm error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi duyệt hàng loạt: ' + err.message });
  }
});

// ─── POST /api/bookings/batch-email (Gửi Pre-Arrival Email hàng loạt) ───────
router.post('/batch-email', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa chọn đặt phòng nào.' });
    }

    const numericIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (!numericIds.length) {
      return res.status(400).json({ success: false, message: 'Danh sách đặt phòng không hợp lệ.' });
    }

    const [result] = await pool.query(
      `UPDATE Bookings SET ConfirmationSentAt = NOW(), UpdatedAt = NOW()
       WHERE BookingId IN (?) AND Status NOT IN ('Cancelled')`,
      [numericIds]
    );

    res.json({
      success: true,
      message: `Đã gửi thư xác nhận & hướng dẫn trước chuyến đi (Pre-Arrival Email) cho ${result.affectedRows} đặt phòng!`,
      sentCount: result.affectedRows,
    });
  } catch (err) {
    console.error('POST /api/bookings/batch-email error:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email hàng loạt: ' + err.message });
  }
});

module.exports = router;
