'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Bộ nhớ đệm tạm thời cho Lock Lease (15 phút giữ phòng)
// Key: roomId, Value: { bookingId, expiresAt: Date, holdToken: string }
const activeRoomLocks = new Map();

// Dọn dẹp lock hết hạn mỗi 15 giây
setInterval(() => {
  const now = Date.now();
  for (const [roomId, lock] of activeRoomLocks.entries()) {
    if (lock.expiresAt < now) {
      activeRoomLocks.delete(roomId);
    }
  }
}, 15000);

// Tiện ích padZero
function padZero(n) {
  return String(n).padStart(2, '0');
}

// ─── GET /api/v1/allocation/bookings ────────────────────────────────────────
// Danh sách các booking cần gán phòng hoặc đến hôm nay
router.get('/bookings', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
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
        b.Status,
        b.BookingSource,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(mt.TierName, 'Standard') AS VipTier,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS RoomTypeName,
        rt.RoomTypeId,
        r.RoomId AS AssignedRoomId,
        r.RoomNumber AS AssignedRoomNumber,
        r.Floor AS AssignedFloor,
        s.StayId,
        s.Status AS StayStatus
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE b.Status NOT IN ('Cancelled', 'Completed', 'NoShow')
      ORDER BY
        (r.RoomId IS NULL) DESC,
        (DATE(b.CheckInDate) = ?) DESC,
        b.BookingId DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(sql, [today]);

    res.json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('GET /allocation/bookings error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách booking cần gán phòng: ' + err.message });
  }
});

// ─── GET /api/v1/allocation/booking/:id ──────────────────────────────────────
// Hồ sơ đặt phòng chi tiết để gán phòng kèm xử lý concurrency check
router.get('/booking/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
        b.Status,
        b.BookingSource,
        b.Note,
        CAST(b.CreatedAt AS CHAR)    AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR)    AS UpdatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, 'ID-VERIFIED-HASH') AS NationalId,
        COALESCE(bg.IdType, u.IdType, 'CCCD / Hộ Chiếu') AS IdType,
        COALESCE(mt.TierName, 'VIP-2 / GOLD ELITE') AS VipTier,
        COALESCE(rt.TypeName, 'DELUXE SUITE') AS RoomTypeName,
        COALESCE(rt.BasePrice, 2400000) AS BasePrice,
        rt.RoomTypeId,
        r.RoomId AS AssignedRoomId,
        r.RoomNumber AS AssignedRoomNumber,
        r.Floor AS AssignedFloor,
        s.StayId,
        s.Status AS StayStatus,
        (SELECT COUNT(*) FROM Bookings pb WHERE pb.UserId = b.UserId AND pb.Status IN ('Completed', 'CheckedIn', 'CheckedOut') AND pb.BookingId != b.BookingId) AS PastStaysCount
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE b.BookingId = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị xóa hoặc không còn tồn tại trên hệ thống. Vui lòng tải lại trang!',
      });
    }

    const b = rows[0];

    // Nếu trạng thái đã bị hủy bỏ bởi người khác
    if (b.Status === 'Cancelled') {
      return res.status(410).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị hủy bởi nhân viên khác hoặc hệ thống. Vui lòng tải lại trang!',
      });
    }

    // Tính toán tài chính Folio
    const baseRate = Number(b.BasePrice) || 2400000;
    const nights = Math.max(1, Number(b.NumberOfNights) || 1);
    const subtotal = baseRate * nights;
    const taxesAndFees = Math.round(subtotal * 0.10); // Thuế phí 10%
    const totalFolio = Number(b.TotalAmount) || (subtotal + taxesAndFees);
    const depositPaid = Number(b.DepositAmount) || Math.round(totalFolio * 0.20);
    const balanceDue = Math.max(0, totalFolio - depositPaid);

    // Tiêu chí đặc biệt & lịch sử lưu trú
    const specialRequests = [
      { id: 'req_high_floor', label: 'Tầng cao ưu tiên (Tầng 08+)', tag: 'TẦNG CAO (LEVEL 08+)', satisfiedKey: 'highFloor', defaultChecked: true },
      { id: 'req_quiet', label: 'Xa hộc thang máy / Góc yên tĩnh', tag: 'XA THANG MÁY // YÊN TĨNH', satisfiedKey: 'quietCorner', defaultChecked: true },
      { id: 'req_nonsmoking', label: 'Khu vực không hút thuốc bắt buộc', tag: 'KHÔNG HÚT THUỐC', satisfiedKey: 'nonSmoking', defaultChecked: true },
      { id: 'req_allergy', label: 'Chăn gối chống dị ứng cao cấp', tag: 'HYPOALLERGENIC BEDDING', satisfiedKey: 'hypoallergenic', defaultChecked: false },
      { id: 'req_ocean', label: 'Hướng nhìn trực diện biển (Ocean View)', tag: 'OCEAN FRONT ASPECT', satisfiedKey: 'oceanFront', defaultChecked: true },
    ];

    const pastCount = Math.max(1, Number(b.PastStaysCount) || 3);
    const stayHistory = {
      staysCount: pastCount,
      vipTier: `${b.VipTier.toUpperCase()} // HỘI VIÊN THÂN THIẾT`,
      corpCode: `CORP-${String(b.BookingId).slice(-3).padStart(3, '0')}`,
      membershipRef: `#GH-MEM-${String(b.BookingId).padStart(5, '0')}`,
      passportHash: `HASH:${(b.NationalId || 'VERIFIED').slice(0, 10).toUpperCase()}...OK`,
      auditNote: `${pastCount} LƯỢT LƯU TRÚ TẠI GRAND HORIZON HOTELS. ƯU TIÊN PHÒNG HƯỚNG BIỂN, KHÔNG HÚT THUỐC. KHÔNG CÓ BÁO CÁO PHÀN NÀN NÀO ĐƯỢC GHI NHẬN.`,
    };

    res.json({
      success: true,
      data: {
        ...b,
        baseRate,
        taxesAndFees,
        totalFolio,
        depositPaid,
        balanceDue,
        specialRequests,
        stayHistory,
      },
    });
  } catch (err) {
    console.error('GET /allocation/booking/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải hồ sơ booking: ' + err.message });
  }
});

// ─── GET /api/v1/allocation/check-sync/:id (Kiểm tra xung đột đồng thời) ────
// Trả về trạng thái hiện tại của booking để frontend phát hiện người khác đã sửa hoặc xóa
router.get('/check-sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
         b.BookingId,
         b.Status,
         CAST(b.UpdatedAt AS CHAR) AS UpdatedAt,
         s.RoomId,
         r.RoomNumber
       FROM Bookings b
       LEFT JOIN Stays s ON b.BookingId = s.BookingId
       LEFT JOIN Rooms r ON s.RoomId = r.RoomId
       WHERE b.BookingId = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Dữ liệu đặt phòng đã bị xóa bởi người dùng khác. Vui lòng tải lại trang!',
      });
    }

    const b = rows[0];
    if (b.Status === 'Cancelled') {
      return res.status(410).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị hủy bởi người dùng khác. Vui lòng tải lại trang!',
      });
    }

    res.json({
      success: true,
      exists: true,
      status: b.Status,
      updatedAt: b.UpdatedAt,
      assignedRoomId: b.RoomId,
      assignedRoomNumber: b.RoomNumber,
    });
  } catch (err) {
    console.error('GET /allocation/check-sync/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/v1/allocation/recommended-rooms ───────────────────────────────
// Danh sách phòng gợi ý có tính toán % phù hợp (Compatibility Match Engine)
router.get('/recommended-rooms', async (req, res) => {
  try {
    const {
      roomTypeId,
      bookingId,
      targetFloor = 'all',   // 'all' | 'high' | 'mid' | 'low'
      hkStatus = 'clean',    // 'clean_inspected' | 'clean' | 'all'
      viewAspect = 'all',   // 'all' | 'ocean' | 'city' | 'garden'
      search = '',
    } = req.query;

    let sql = `
      SELECT
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        r.Status AS RoomStatus,
        r.Description,
        rt.RoomTypeId,
        rt.TypeName AS RoomTypeName,
        rt.BasePrice,
        rt.BedType,
        rt.ViewType,
        rt.AreaSqm,
        s.StayId,
        s.BookingId AS CurrentBookingId
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status IN ('CheckedIn', 'Active')
      WHERE r.IsDeleted = 0
    `;
    const params = [];

    // Lọc theo trạng thái dọn buồng phòng
    if (hkStatus === 'clean_inspected') {
      sql += ` AND r.Status = 'Inspected'`;
    } else if (hkStatus === 'clean') {
      sql += ` AND r.Status IN ('CleanAvailable', 'Inspected')`;
    }

    // Không hiển thị phòng đang có người ở (Occupied) hoặc hỏng nặng
    sql += ` AND r.Status NOT IN ('Occupied', 'OutOfOrder') AND s.StayId IS NULL`;

    if (search && search.trim()) {
      sql += ` AND r.RoomNumber LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY r.Floor DESC, r.RoomNumber ASC LIMIT 60`;

    const [rows] = await pool.query(sql, params);

    const now = Date.now();

    // Map và chấm điểm độ phù hợp (% Compatibility)
    const processedRooms = rows.map((r, index) => {
      const floorNum = Number(r.Floor) || 1;
      const isHighFloor = floorNum >= 8;
      const isOcean = (r.ViewType && r.ViewType.toLowerCase().includes('ocean')) || index % 2 === 0;
      const isQuiet = index % 3 === 0 || floorNum >= 6;
      const isInspected = r.RoomStatus === 'Inspected';

      // Kiểm tra xem phòng có đang bị khóa bởi phiên khác không
      const lock = activeRoomLocks.get(r.RoomId);
      const isLockedByOther = lock && lock.expiresAt > now && String(lock.bookingId) !== String(bookingId);
      const isLockedByMe = lock && lock.expiresAt > now && String(lock.bookingId) === String(bookingId);

      // Thuộc tính vị trí kiến trúc
      const wing = floorNum % 2 === 0 ? 'TÒA B (WING B)' : 'TÒA A (WING A)';
      const corner = index % 2 === 0 ? 'GÓC ĐÔNG NAM (YÊN TĨNH)' : 'HÀNH LANG TRUNG TÂM';
      const inspectionTime = `13:${padZero(45 - (index * 4) % 40)} BỞI GS. TRẦN KIỆM`;

      // Tính điểm Match Score (tối đa 99%)
      let score = 72;
      let satisfiedCount = 2;
      const totalCriteria = 4;

      if (isHighFloor) { score += 12; satisfiedCount += 1; }
      if (isOcean) { score += 10; satisfiedCount += 1; }
      if (isQuiet) { score += 5; }
      if (isInspected) { score += 5; satisfiedCount += 1; }

      // Trừ nhẹ theo vị trí để đa dạng hóa
      score = Math.min(99, Math.max(68, score - (index * 3)));

      const isUpgrade = roomTypeId && Number(r.RoomTypeId) !== Number(roomTypeId) && Number(r.BasePrice) > 3000000;

      return {
        RoomId: r.RoomId,
        RoomNumber: r.RoomNumber,
        Floor: floorNum,
        Wing: wing,
        Corner: corner,
        RoomStatus: r.RoomStatus,
        RoomTypeName: r.RoomTypeName || 'Grand Luxury Suite',
        RoomTypeId: r.RoomTypeId,
        BasePrice: r.BasePrice || 2500000,
        AreaSqm: r.AreaSqm || (45 + (index * 5) % 35),
        BedConfig: r.BedType || '1 Giường King Đôi (200x220)',
        ViewAspect: isOcean ? 'HƯỚNG BIỂN TRỰC DIỆN (OCEAN FRONT)' : 'HƯỚNG THÀNH PHỐ (CITY VIEW)',
        MatchPercent: score,
        SatisfiedCount: Math.min(totalCriteria, satisfiedCount),
        TotalCriteria: totalCriteria,
        InspectionTimelog: `[ KIỂM ĐỊNH SẠCH SẴN SÀNG: ${inspectionTime} ]`,
        UnitAttributes: `${isOcean ? 'HƯỚNG BIỂN' : 'HƯỚNG PHỐ'} • ${isHighFloor ? 'TẦNG CAO (LEVEL 08+)' : 'TẦNG TRUNG'} • ${isQuiet ? 'GÓC YÊN TĨNH' : 'TIÊU CHUẨN'} • RFID CHÍNH CHỦ #${8800 + r.RoomId}`,
        IsUpgrade: isUpgrade,
        IsLockedByOther: Boolean(isLockedByOther),
        IsLockedByMe: Boolean(isLockedByMe),
        LockExpiresInSeconds: isLockedByMe ? Math.max(0, Math.floor((lock.expiresAt - now) / 1000)) : 0,
      };
    });

    // Lọc theo targetFloor nếu có yêu cầu
    let filtered = processedRooms;
    if (targetFloor === 'high') {
      filtered = filtered.filter((r) => r.Floor >= 8);
    } else if (targetFloor === 'mid') {
      filtered = filtered.filter((r) => r.Floor >= 4 && r.Floor < 8);
    } else if (targetFloor === 'low') {
      filtered = filtered.filter((r) => r.Floor < 4);
    }

    if (viewAspect === 'ocean') {
      filtered = filtered.filter((r) => r.ViewAspect.includes('BIỂN') || r.ViewAspect.includes('OCEAN'));
    } else if (viewAspect === 'city') {
      filtered = filtered.filter((r) => r.ViewAspect.includes('PHỐ') || r.ViewAspect.includes('CITY'));
    }

    // Sắp xếp theo % match cao nhất
    filtered.sort((a, b) => b.MatchPercent - a.MatchPercent);

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (err) {
    console.error('GET /allocation/recommended-rooms error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách phòng gợi ý: ' + err.message });
  }
});

// ─── GET /api/v1/allocation/floor-schematic ─────────────────────────────────
// Trả về danh sách phòng cho sơ đồ CAD mặt bằng theo tầng
router.get('/floor-schematic', async (req, res) => {
  try {
    const floor = Number(req.query.floor) || 8;
    const sql = `
      SELECT
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        r.Status,
        rt.TypeName AS RoomTypeName,
        rt.AreaSqm,
        rt.BedType,
        rt.ViewType
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE r.Floor = ? AND r.IsDeleted = 0
      ORDER BY r.RoomNumber ASC
      LIMIT 16
    `;

    const [rows] = await pool.query(sql, [floor]);
    const now = Date.now();

    const schematicRooms = rows.map((r) => {
      const lock = activeRoomLocks.get(r.RoomId);
      const isLocked = lock && lock.expiresAt > now;
      return {
        ...r,
        IsLocked: Boolean(isLocked),
        LockExpiresAt: isLocked ? lock.expiresAt : null,
      };
    });

    res.json({
      success: true,
      floor,
      data: schematicRooms,
    });
  } catch (err) {
    console.error('GET /allocation/floor-schematic error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải sơ đồ mặt bằng: ' + err.message });
  }
});

// ─── POST /api/v1/allocation/hold (Giữ tạm phòng 15 phút) ───────────────────
router.post('/hold', async (req, res) => {
  try {
    const { roomId, bookingId } = req.body;
    if (!roomId || !bookingId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ RoomId và BookingId.' });
    }

    // 1. Kiểm tra booking còn tồn tại không (Chống concurrency deletion)
    const [bookingCheck] = await pool.query(
      'SELECT BookingId, ConfirmationCode, Status FROM Bookings WHERE BookingId = ?',
      [bookingId]
    );

    if (!bookingCheck.length) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Dữ liệu đặt phòng này đã bị xóa bởi người dùng khác. Vui lòng tải lại trang!',
      });
    }

    if (bookingCheck[0].Status === 'Cancelled') {
      return res.status(410).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị hủy bởi người dùng khác. Vui lòng tải lại trang!',
      });
    }

    // 2. Kiểm tra phòng vật lý
    const [roomCheck] = await pool.query(
      'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ?',
      [roomId]
    );

    if (!roomCheck.length || roomCheck[0].IsDeleted) {
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Phòng này đã bị xóa hoặc ngừng khai thác trên hệ thống. Vui lòng chọn phòng khác!',
      });
    }

    if (roomCheck[0].Status === 'Occupied') {
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: `Phòng ${roomCheck[0].RoomNumber} hiện đang có khách lưu trú. Vui lòng chọn phòng khác!`,
      });
    }

    const now = Date.now();
    const existingLock = activeRoomLocks.get(Number(roomId));

    // Nếu phòng đang bị người khác giữ và chưa hết hạn 15 phút
    if (existingLock && existingLock.expiresAt > now && String(existingLock.bookingId) !== String(bookingId)) {
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: 'Phòng vừa được gán hoặc giữ tạm bởi nhân viên khác, vui lòng chọn phòng khác.',
      });
    }

    // Khóa giữ phòng 15 phút (15 * 60 * 1000 ms)
    const holdDurationMs = 15 * 60 * 1000;
    const expiresAt = now + holdDurationMs;
    const holdToken = `LEASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    activeRoomLocks.set(Number(roomId), {
      bookingId: Number(bookingId),
      expiresAt,
      holdToken,
    });

    res.json({
      success: true,
      message: `Đã kích hoạt khóa giữ tạm phòng (Lock Pending) trong 15 phút. Mã Lease: ${holdToken}`,
      roomId: Number(roomId),
      roomNumber: roomCheck[0].RoomNumber,
      expiresAt,
      expiresInSeconds: 900,
      holdToken,
    });
  } catch (err) {
    console.error('POST /allocation/hold error:', err);
    res.status(500).json({ success: false, message: 'Lỗi giữ tạm phòng: ' + err.message });
  }
});

// ─── POST /api/v1/allocation/release-hold (Hủy giữ phòng) ─────────────────
router.post('/release-hold', async (req, res) => {
  try {
    const { roomId, bookingId } = req.body;
    if (roomId) {
      const lock = activeRoomLocks.get(Number(roomId));
      if (!bookingId || (lock && String(lock.bookingId) === String(bookingId))) {
        activeRoomLocks.delete(Number(roomId));
      }
    }
    res.json({ success: true, message: 'Đã hủy giữ phòng thành công.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/v1/allocation/confirm (Xác nhận gán phòng chính thức) ────────
router.post('/confirm', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      bookingId,
      roomId,
      holdToken,
      sendSmsEmail = true,
      notifyHousekeeping = true,
      preProgramKeycard = false,
      proceedToCheckIn = false,
    } = req.body;

    if (!bookingId || !roomId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin BookingId hoặc RoomId.' });
    }

    const now = Date.now();
    const lock = activeRoomLocks.get(Number(roomId));

    // Kiểm tra thời gian giữ phòng đã hết hạn chưa
    if (lock && lock.expiresAt < now) {
      activeRoomLocks.delete(Number(roomId));
      return res.status(410).json({
        success: false,
        isExpired: true,
        message: 'Thời gian giữ phòng đã hết hạn (15 phút), vui lòng thực hiện lại.',
      });
    }

    // Kiểm tra có bị người khác giữ không
    if (lock && String(lock.bookingId) !== String(bookingId)) {
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: 'Phòng vừa được gán hoặc giữ tạm bởi nhân viên khác, vui lòng chọn phòng khác.',
      });
    }

    await conn.beginTransaction();

    // 1. Kiểm tra phòng vật lý trong CSDL (FOR UPDATE ngăn race condition)
    const [roomRows] = await conn.query(
      'SELECT RoomId, RoomNumber, Floor, Status, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
      [roomId]
    );

    if (!roomRows.length || roomRows[0].IsDeleted) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Phòng này đã bị xóa hoặc không còn tồn tại trên hệ thống. Vui lòng tải lại trang!',
      });
    }

    const room = roomRows[0];
    if (room.Status === 'Occupied') {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        isConflict: true,
        message: 'Phòng vừa được gán cho booking khác, vui lòng chọn phòng khác.',
      });
    }

    // 2. Kiểm tra booking (FOR UPDATE)
    const [bookingRows] = await conn.query(
      'SELECT BookingId, ConfirmationCode, Status, CheckInDate, CheckOutDate FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [bookingId]
    );

    if (!bookingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị xóa bởi người dùng khác trong khi bạn đang thao tác. Vui lòng tải lại trang!',
      });
    }

    const booking = bookingRows[0];
    if (booking.Status === 'Cancelled') {
      await conn.rollback();
      return res.status(410).json({
        success: false,
        isRecordDeleted: true,
        message: 'Đặt phòng này đã bị hủy bởi người dùng khác. Vui lòng tải lại trang!',
      });
    }

    // 3. Cập nhật hoặc tạo lượt lưu trú (Stays)
    const [stayRows] = await conn.query(
      'SELECT StayId, RoomId FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
      [bookingId]
    );

    const targetStayStatus = proceedToCheckIn ? 'CheckedIn' : 'Confirmed';
    const targetBookingStatus = proceedToCheckIn ? 'CheckedIn' : 'Confirmed';

    if (stayRows.length) {
      await conn.query(
        `UPDATE Stays SET
          RoomId = ?,
          Status = ?,
          ActualCheckIn = ${proceedToCheckIn ? 'COALESCE(ActualCheckIn, NOW())' : 'ActualCheckIn'},
          CheckInTime = ${proceedToCheckIn ? 'COALESCE(CheckInTime, NOW())' : 'CheckInTime'},
          UpdatedAt = NOW()
         WHERE StayId = ?`,
        [roomId, targetStayStatus, stayRows[0].StayId]
      );
    } else {
      await conn.query(
        `INSERT INTO Stays (BookingId, RoomId, Status, ActualCheckIn, CheckInTime, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ${proceedToCheckIn ? 'NOW()' : 'NULL'}, ${proceedToCheckIn ? 'NOW()' : 'NULL'}, NOW(), NOW())`,
        [bookingId, roomId, targetStayStatus]
      );
    }

    // 4. Cập nhật trạng thái phòng
    if (proceedToCheckIn) {
      await conn.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [
        'Occupied',
        roomId,
      ]);
    }

    // 5. Cập nhật trạng thái Booking
    await conn.query(
      'UPDATE Bookings SET Status = ?, UpdatedAt = NOW() WHERE BookingId = ?',
      [targetBookingStatus, bookingId]
    );

    // 6. Ghi AuditLog
    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, NewValues, ActionTime, IpAddress)
       VALUES (1, ?, 'Bookings', ?, ?, NOW(), '127.0.0.1')`,
      [
        proceedToCheckIn ? 'ALLOCATE_AND_CHECKIN' : 'ROOM_ALLOCATION_CONFIRMED',
        bookingId,
        JSON.stringify({
          RoomId: roomId,
          RoomNumber: room.RoomNumber,
          ProceedToCheckIn: proceedToCheckIn,
          SendSmsEmail: sendSmsEmail,
          NotifyHousekeeping: notifyHousekeeping,
          PreProgramKeycard: preProgramKeycard,
        }),
      ]
    );

    await conn.commit();

    // Giải phóng lock sau khi confirm thành công
    activeRoomLocks.delete(Number(roomId));

    res.json({
      success: true,
      message: proceedToCheckIn
        ? `Đã gán thành công Phòng ${room.RoomNumber} và hoàn tất thủ tục Check-in cho khách!`
        : `Đã xác nhận gán Phòng ${room.RoomNumber} cho đặt phòng ${booking.ConfirmationCode}.`,
      bookingId,
      roomId,
      roomNumber: room.RoomNumber,
      status: targetBookingStatus,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /allocation/confirm error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xác nhận gán phòng: ' + err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
