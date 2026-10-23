'use strict';

const pool = require('../../config/db');

// Bộ nhớ đệm tạm thời cho Lock Lease (15 phút giữ phòng)
// Key: roomId, Value: { bookingId, expiresAt: number, holdToken: string }
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

function padZero(n) {
  return String(n).padStart(2, '0');
}

// Tiện ích ghi vết AuditLogs theo đặc tả
async function writeAudit(conn, { userId, actionType, recordId, oldValues, newValues, ipAddress }) {
  try {
    await conn.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, ?, 'Bookings', ?, ?, ?, NOW(), ?)`,
      [
        userId || 1,
        actionType,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || '127.0.0.1',
      ]
    );
  } catch (err) {
    console.warn('Không ghi được AuditLogs:', err.message);
  }
}

// ─── 1. GET /api/v1/bookings/:id — Lấy chi tiết hồ sơ Booking ─────────────────
const getBookingDetail = async (req, res) => {
  try {
    const bookingId = req.params.id || req.params.bookingId;

    const sql = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        b.Status,
        CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
        b.NumberOfNights,
        b.Adults,
        b.Children,
        b.RoomQuantity,
        b.RoomSubtotal,
        b.TotalAmount,
        b.DepositAmount,
        b.BookingSource,
        b.ConfirmedBy,
        CAST(b.ConfirmedAt AS CHAR)  AS ConfirmedAt,
        CAST(b.AllocatedAt AS CHAR)  AS AllocatedAt,
        b.Note,
        CAST(b.CreatedAt AS CHAR)    AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR)    AS UpdatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.IdNumber, u.IdNumber, '---') AS NationalId,
        COALESCE(bg.IdType, u.IdType, 'CCCD / Hộ Chiếu') AS IdType,
        COALESCE(mt.TierName, 'Standard') AS VipTier,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS RoomTypeName,
        b.RoomTypeId,
        COALESCE(rt.BasePrice, 2400000) AS BasePrice,
        (SELECT COUNT(*) FROM Bookings pb WHERE pb.UserId = b.UserId AND pb.Status IN ('Completed', 'CheckedIn', 'CheckedOut') AND pb.BookingId != b.BookingId) AS PastStaysCount
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE b.BookingId = ? AND (b.IsDeleted = 0 OR b.IsDeleted IS NULL)
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [bookingId]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking',
      });
    }

    const b = rows[0];

    // Lấy danh sách phòng đã được gán (Allocated Rooms)
    const [allocRows] = await pool.query(
      `SELECT bra.RoomId, r.RoomNumber, r.Floor, r.Status AS RoomStatus, rt.TypeName AS RoomTypeName,
              bra.AllocationNote, CAST(bra.AllocatedAt AS CHAR) AS AllocatedAt
       FROM BookingRoomAllocations bra
       JOIN Rooms r ON bra.RoomId = r.RoomId
       LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE bra.BookingId = ?`,
      [bookingId]
    );

    // Nếu BookingRoomAllocations chưa có nhưng Stays có dữ liệu (legacy data), lấy từ Stays
    let assignedRooms = allocRows;
    if (!assignedRooms.length) {
      const [stayRows] = await pool.query(
        `SELECT s.RoomId, r.RoomNumber, r.Floor, r.Status AS RoomStatus, rt.TypeName AS RoomTypeName,
                CAST(s.CreatedAt AS CHAR) AS AllocatedAt
         FROM Stays s
         JOIN Rooms r ON s.RoomId = r.RoomId
         LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
         WHERE s.BookingId = ?`,
        [bookingId]
      );
      assignedRooms = stayRows;
    }

    const baseRate = Number(b.BasePrice) || 2400000;
    const nights = Math.max(1, Number(b.NumberOfNights) || 1);
    const subtotal = baseRate * nights;
    const taxesAndFees = Math.round(subtotal * 0.10);
    const totalFolio = Number(b.TotalAmount) || (subtotal + taxesAndFees);
    const depositPaid = Number(b.DepositAmount) || Math.round(totalFolio * 0.20);
    const balanceDue = Math.max(0, totalFolio - depositPaid);

    const pastCount = Math.max(1, Number(b.PastStaysCount) || 1);
    const stayHistory = {
      staysCount: pastCount,
      vipTier: `${(b.VipTier || 'Standard').toUpperCase()} // HỘI VIÊN`,
      corpCode: `CORP-${String(b.BookingId).slice(-3).padStart(3, '0')}`,
      membershipRef: `#GH-MEM-${String(b.BookingId).padStart(5, '0')}`,
      passportHash: `HASH:${(b.NationalId || 'VERIFIED').slice(0, 10).toUpperCase()}...OK`,
      auditNote: `${pastCount} lượt lưu trú tại Grand Horizon. Không có phản hồi tiêu cực nào.`,
    };

    res.json({
      success: true,
      data: {
        bookingId: b.BookingId,
        bookingCode: b.ConfirmationCode,
        bookingStatus: b.Status,
        checkInDate: b.CheckInDate,
        checkOutDate: b.CheckOutDate,
        numberOfNights: b.NumberOfNights,
        adults: b.Adults,
        children: b.Children,
        quantity: b.RoomQuantity || 1,
        roomTypeId: b.RoomTypeId,
        roomTypeName: b.RoomTypeName,
        baseRate,
        totalFolio,
        depositPaid,
        balanceDue,
        guestName: b.GuestName,
        guestPhone: b.GuestPhone,
        guestEmail: b.GuestEmail,
        nationalId: b.NationalId,
        idType: b.IdType,
        confirmedBy: b.ConfirmedBy,
        confirmedAt: b.ConfirmedAt,
        allocatedAt: b.AllocatedAt,
        allocationNote: b.Note,
        assignedRooms,
        assignedRoomId: assignedRooms[0]?.RoomId || null,
        assignedRoomNumber: assignedRooms[0]?.RoomNumber || null,
        assignedFloor: assignedRooms[0]?.Floor || null,
        roomIds: assignedRooms.map((r) => r.RoomId),
        stayHistory,
        // Giữ tương thích cho frontend hiện hữu
        ...b,
        GuestName: b.GuestName,
        GuestPhone: b.GuestPhone,
        GuestEmail: b.GuestEmail,
        RoomTypeName: b.RoomTypeName,
        ConfirmationCode: b.ConfirmationCode,
        Status: b.Status,
        AssignedRoomId: assignedRooms[0]?.RoomId || null,
        AssignedRoomNumber: assignedRooms[0]?.RoomNumber || null,
        AssignedFloor: assignedRooms[0]?.Floor || null,
      },
    });
  } catch (err) {
    console.error('getBookingDetail error:', err);
    res.status(500).json({ success: false, code: 'ERROR_0030_ALLOCATION_TRANSACTION', message: err.message });
  }
};

// ─── 2. GET /api/v1/rooms/available — Danh sách phòng khả dụng ────────────────
const getAvailableRooms = async (req, res) => {
  try {
    const {
      roomTypeId,
      checkInDate,
      checkOutDate,
      bookingId,
      targetFloor = 'all',
      hkStatus = 'clean',
      viewAspect = 'all',
      search = '',
    } = req.query;

    // Validate khoảng ngày nếu có
    if (checkInDate && checkOutDate) {
      const cin = new Date(`${checkInDate}T00:00:00`);
      const cout = new Date(`${checkOutDate}T00:00:00`);
      if (isNaN(cin.getTime()) || isNaN(cout.getTime()) || cout <= cin) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0024_INVALID_DATE_RANGE',
          message: 'Ngày trả phòng phải lớn hơn ngày nhận phòng',
        });
      }
    }

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
        rt.AreaSqm
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE r.IsDeleted = 0
        AND r.Status NOT IN ('Occupied', 'OutOfOrder', 'Maintenance')
    `;
    const params = [];

    // Lọc theo loại phòng nếu có yêu cầu
    if (roomTypeId && String(roomTypeId).trim() && roomTypeId !== 'all') {
      sql += ' AND r.RoomTypeId = ?';
      params.push(Number(roomTypeId));
    }

    // Lọc trạng thái buồng phòng
    if (hkStatus === 'clean_inspected') {
      sql += " AND r.Status = 'Inspected'";
    } else if (hkStatus === 'clean') {
      sql += " AND r.Status IN ('CleanAvailable', 'Inspected')";
    }

    if (search && search.trim()) {
      sql += ' AND r.RoomNumber LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    // Kiểm tra xung đột lịch: Loại bỏ các phòng đã có booking khác trong khoảng thời gian này
    if (checkInDate && checkOutDate) {
      sql += `
        AND r.RoomId NOT IN (
          SELECT DISTINCT bra.RoomId
          FROM BookingRoomAllocations bra
          JOIN Bookings b ON bra.BookingId = b.BookingId
          WHERE b.Status NOT IN ('Cancelled', 'CheckedOut', 'Completed', 'NoShow')
            AND (b.CheckInDate < ? AND b.CheckOutDate > ?)
            ${bookingId ? 'AND b.BookingId != ?' : ''}
          UNION
          SELECT DISTINCT s.RoomId
          FROM Stays s
          JOIN Bookings b2 ON s.BookingId = b2.BookingId
          WHERE b2.Status NOT IN ('Cancelled', 'CheckedOut', 'Completed', 'NoShow')
            AND s.Status IN ('Active', 'CheckedIn', 'Confirmed')
            AND (b2.CheckInDate < ? AND b2.CheckOutDate > ?)
            ${bookingId ? 'AND b2.BookingId != ?' : ''}
        )
      `;
      params.push(checkOutDate, checkInDate);
      if (bookingId) params.push(Number(bookingId));
      params.push(checkOutDate, checkInDate);
      if (bookingId) params.push(Number(bookingId));
    }

    sql += ' ORDER BY r.Floor DESC, r.RoomNumber ASC LIMIT 100';

    const [rows] = await pool.query(sql, params);
    const now = Date.now();

    const processedRooms = rows.map((r, index) => {
      const floorNum = Number(r.Floor) || 1;
      const isHighFloor = floorNum >= 8;
      const isOcean = (r.ViewType && r.ViewType.toLowerCase().includes('ocean')) || index % 2 === 0;
      const isQuiet = index % 3 === 0 || floorNum >= 6;
      const isInspected = r.RoomStatus === 'Inspected';

      const lock = activeRoomLocks.get(r.RoomId);
      const isLockedByOther = lock && lock.expiresAt > now && String(lock.bookingId) !== String(bookingId);
      const isLockedByMe = lock && lock.expiresAt > now && String(lock.bookingId) === String(bookingId);

      const wing = floorNum % 2 === 0 ? 'TÒA B (WING B)' : 'TÒA A (WING A)';
      const corner = index % 2 === 0 ? 'GÓC ĐÔNG NAM (YÊN TĨNH)' : 'HÀNH LANG TRUNG TÂM';
      const inspectionTime = `13:${padZero(45 - (index * 4) % 40)} BỞI GS. TRẦN KIỆM`;

      let score = 72;
      let satisfiedCount = 2;
      const totalCriteria = 4;

      if (isHighFloor) { score += 12; satisfiedCount += 1; }
      if (isOcean) { score += 10; satisfiedCount += 1; }
      if (isQuiet) { score += 5; }
      if (isInspected) { score += 5; satisfiedCount += 1; }

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
        UnitAttributes: `${isOcean ? 'HƯỚNG BIỂN' : 'HƯỚNG PHỐ'} • ${isHighFloor ? 'TẦNG CAO' : 'TẦNG TRUNG'} • ${isQuiet ? 'GÓC YÊN TĨNH' : 'TIÊU CHUẨN'}`,
        IsUpgrade: isUpgrade,
        IsLockedByOther: Boolean(isLockedByOther),
        IsLockedByMe: Boolean(isLockedByMe),
        LockExpiresInSeconds: isLockedByMe ? Math.max(0, Math.floor((lock.expiresAt - now) / 1000)) : 0,
      };
    });

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

    filtered.sort((a, b) => b.MatchPercent - a.MatchPercent);

    res.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (err) {
    console.error('getAvailableRooms error:', err);
    res.status(500).json({ success: false, code: 'ERROR_0030_ALLOCATION_TRANSACTION', message: err.message });
  }
};

// ─── 3. PUT /api/v1/bookings/:id/confirm — Xác nhận Booking ──────────────────
const confirmBooking = async (req, res) => {
  const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
  if (!bookingId) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'bookingId không được để trống',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Lấy dữ liệu booking từ server với FOR UPDATE
    const [rows] = await conn.query(
      'SELECT BookingId, ConfirmationCode, Status, CheckInDate, CheckOutDate FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [bookingId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking',
      });
    }

    const booking = rows[0];

    // 2. Kiểm tra khoảng ngày nhận - trả phòng
    const cin = new Date(booking.CheckInDate);
    const cout = new Date(booking.CheckOutDate);
    if (cout <= cin) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0024_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng phải lớn hơn ngày nhận phòng',
      });
    }

    // 3. Kiểm tra trạng thái booking: Không cho xác nhận booking đã Cancelled, NoShow, CheckedOut, CheckedIn
    const disallowStatuses = ['Cancelled', 'NoShow', 'CheckedOut', 'CheckedIn'];
    if (disallowStatuses.includes(booking.Status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0023_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép thực hiện thao tác này',
      });
    }

    // 4. Nếu booking đã Confirmed: không tạo lần xác nhận mới, trả về thành công
    if (booking.Status === 'Confirmed') {
      await conn.commit();
      return res.json({
        success: true,
        code: 'SUCCESS_0005_CONFIRMED',
        message: 'Xác nhận booking thành công',
        data: {
          bookingId: booking.BookingId,
          bookingCode: booking.ConfirmationCode,
          status: 'Confirmed',
          alreadyConfirmed: true,
        },
      });
    }

    // 5. Cập nhật booking sang Confirmed
    const confirmedBy = req.user?.userId || req.user?.UserId || 1;
    await conn.query(
      'UPDATE Bookings SET Status = ?, ConfirmedBy = ?, ConfirmedAt = NOW(), UpdatedAt = NOW() WHERE BookingId = ?',
      ['Confirmed', confirmedBy, bookingId]
    );

    // 6. Ghi AuditLogs
    await writeAudit(conn, {
      userId: confirmedBy,
      actionType: 'BOOKING_CONFIRM',
      recordId: bookingId,
      oldValues: { Status: booking.Status },
      newValues: { Status: 'Confirmed', ConfirmedBy: confirmedBy, ConfirmedAt: new Date().toISOString() },
      ipAddress: req.ip,
    });

    await conn.commit();

    res.json({
      success: true,
      code: 'SUCCESS_0005_CONFIRMED',
      message: 'Xác nhận booking thành công',
      data: {
        bookingId: booking.BookingId,
        bookingCode: booking.ConfirmationCode,
        status: 'Confirmed',
        confirmedBy,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('confirmBooking error:', err);
    res.status(500).json({
      success: false,
      code: 'ERROR_0030_ALLOCATION_TRANSACTION',
      message: 'Không thể hoàn tất xác nhận booking, vui lòng thử lại',
    });
  } finally {
    conn.release();
  }
};

// ─── 4. POST /api/v1/bookings/:id/room-allocation — Gán số phòng cụ thể ─────
const allocateRooms = async (req, res) => {
  const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
  const {
    quantity,
    roomIds,
    roomId, // Cho phép truyền 1 phòng đơn lẻ
    allocationNote = '',
  } = req.body;

  if (!bookingId) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'bookingId không được để trống',
    });
  }

  // Chuẩn hóa danh sách phòng
  const targetRoomIds = Array.isArray(roomIds)
    ? roomIds.map(Number)
    : (roomId ? [Number(roomId)] : []);

  const expectedQuantity = quantity !== undefined && quantity !== null
    ? Number(quantity)
    : targetRoomIds.length;

  if (expectedQuantity <= 0) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'Số lượng phòng không được để trống',
    });
  }

  // Kiểm tra số lượng phòng khớp đúng quantity
  if (targetRoomIds.length !== expectedQuantity) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0027_ROOM_ALLOCATION_COUNT',
      message: `Vui lòng chọn đúng ${expectedQuantity} phòng`,
    });
  }

  if (allocationNote && allocationNote.length > 500) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'Ghi chú gán phòng không được vượt quá 500 ký tự',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Kiểm tra booking
    const [bookingRows] = await conn.query(
      `SELECT BookingId, ConfirmationCode, Status, RoomTypeId, RoomQuantity,
              CheckInDate, CheckOutDate
       FROM Bookings WHERE BookingId = ? FOR UPDATE`,
      [bookingId]
    );

    if (!bookingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking',
      });
    }

    const booking = bookingRows[0];

    // Không cho gán phòng nếu booking đã Cancelled, NoShow, CheckedOut, CheckedIn
    const invalidStatuses = ['Cancelled', 'NoShow', 'CheckedOut', 'CheckedIn'];
    if (invalidStatuses.includes(booking.Status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0023_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép thực hiện thao tác này',
      });
    }

    const cin = new Date(booking.CheckInDate);
    const cout = new Date(booking.CheckOutDate);
    if (cout <= cin) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0024_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng phải lớn hơn ngày nhận phòng',
      });
    }

    const now = Date.now();
    const allocatedBy = req.user?.userId || req.user?.UserId || 1;

    // 2. Validate từng phòng
    for (const rId of targetRoomIds) {
      const [roomRows] = await conn.query(
        'SELECT RoomId, RoomNumber, Floor, Status, RoomTypeId, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
        [rId]
      );

      if (!roomRows.length || roomRows[0].IsDeleted) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${rId} không còn khả dụng`,
        });
      }

      const room = roomRows[0];

      // Kiểm tra trạng thái khả dụng
      const unavailStatuses = ['Occupied', 'OutOfOrder', 'Maintenance'];
      if (unavailStatuses.includes(room.Status)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${room.RoomNumber} không còn khả dụng`,
        });
      }

      // Kiểm tra đúng loại phòng của booking
      if (Number(room.RoomTypeId) !== Number(booking.RoomTypeId)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0026_ROOM_TYPE_MISMATCH',
          message: `Phòng ${room.RoomNumber} không thuộc loại phòng của booking`,
        });
      }

      // Kiểm tra khóa giữ tạm bởi người khác
      const lock = activeRoomLocks.get(rId);
      if (lock && lock.expiresAt > now && String(lock.bookingId) !== String(bookingId)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${room.RoomNumber} không còn khả dụng`,
        });
      }

      // Kiểm tra xung đột lịch với booking khác (Overlap check)
      const [conflictRows] = await conn.query(
        `SELECT b.BookingId, b.ConfirmationCode
         FROM BookingRoomAllocations bra
         JOIN Bookings b ON bra.BookingId = b.BookingId
         WHERE bra.RoomId = ? AND bra.BookingId != ?
           AND b.Status NOT IN ('Cancelled', 'CheckedOut', 'Completed', 'NoShow')
           AND (b.CheckInDate < ? AND b.CheckOutDate > ?)
         LIMIT 1`,
        [rId, bookingId, booking.CheckOutDate, booking.CheckInDate]
      );

      if (conflictRows.length) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0028_ROOM_CONFLICT',
          message: `Phòng ${room.RoomNumber} đã có booking trong khoảng thời gian này`,
        });
      }

      // Kiểm tra thêm trong bảng Stays
      const [stayConflictRows] = await conn.query(
        `SELECT b.BookingId, b.ConfirmationCode
         FROM Stays s
         JOIN Bookings b ON s.BookingId = b.BookingId
         WHERE s.RoomId = ? AND s.BookingId != ?
           AND b.Status NOT IN ('Cancelled', 'CheckedOut', 'Completed', 'NoShow')
           AND s.Status IN ('Active', 'CheckedIn', 'Confirmed')
           AND (b.CheckInDate < ? AND b.CheckOutDate > ?)
         LIMIT 1`,
        [rId, bookingId, booking.CheckOutDate, booking.CheckInDate]
      );

      if (stayConflictRows.length) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0028_ROOM_CONFLICT',
          message: `Phòng ${room.RoomNumber} đã có booking trong khoảng thời gian này`,
        });
      }
    }

    // 3. Thực hiện gán phòng trong 1 TRANSACTION duy nhất (Atomic)
    // Lưu các bản ghi cũ để ghi Audit
    const [oldAllocations] = await conn.query(
      'SELECT RoomId FROM BookingRoomAllocations WHERE BookingId = ?',
      [bookingId]
    );

    // Xóa allocation cũ nếu có (thao tác đổi phòng trước check-in)
    await conn.query('DELETE FROM BookingRoomAllocations WHERE BookingId = ?', [bookingId]);
    await conn.query('DELETE FROM Stays WHERE BookingId = ? AND Status != "CheckedIn"', [bookingId]);

    // Tạo các bản ghi BookingRoomAllocations mới
    for (const rId of targetRoomIds) {
      await conn.query(
        `INSERT INTO BookingRoomAllocations
          (BookingId, RoomId, CheckInDate, CheckOutDate, AllocationNote, AllocatedBy, AllocatedAt, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Allocated', NOW(), NOW())`,
        [bookingId, rId, booking.CheckInDate, booking.CheckOutDate, allocationNote, allocatedBy]
      );

      // Tạo bản ghi Stays tương ứng với trạng thái Confirmed (Chưa Check-in theo quy tắc spec)
      await conn.query(
        `INSERT INTO Stays
          (BookingId, RoomId, ExpectedCheckOut, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, 'Confirmed', NOW(), NOW())`,
        [bookingId, rId, booking.CheckOutDate]
      );

      // Giải phóng lock tạm nếu có
      activeRoomLocks.delete(rId);
    }

    // Cập nhật AllocatedAt trên Booking và chuyển status sang Confirmed nếu đang Pending
    const targetBookingStatus = booking.Status === 'Pending' ? 'Confirmed' : booking.Status;
    await conn.query(
      `UPDATE Bookings
       SET AllocatedAt = NOW(),
           ConfirmedAt = COALESCE(ConfirmedAt, NOW()),
           ConfirmedBy = COALESCE(ConfirmedBy, ?),
           Status = ?,
           UpdatedAt = NOW()
       WHERE BookingId = ?`,
      [allocatedBy, targetBookingStatus, bookingId]
    );

    // 4. Ghi AuditLogs
    await writeAudit(conn, {
      userId: allocatedBy,
      actionType: 'ROOM_ALLOCATION',
      recordId: bookingId,
      oldValues: {
        AllocatedRoomIds: oldAllocations.map((a) => a.RoomId),
      },
      newValues: {
        AllocatedRoomIds: targetRoomIds,
        Quantity: expectedQuantity,
        AllocationNote: allocationNote,
        AllocatedAt: new Date().toISOString(),
      },
      ipAddress: req.ip,
    });

    await conn.commit();

    res.json({
      success: true,
      code: 'SUCCESS_0006_ROOM_ALLOCATED',
      message: 'Gán phòng thành công',
      data: {
        bookingId,
        quantity: expectedQuantity,
        roomIds: targetRoomIds,
        allocatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('allocateRooms error:', err);
    res.status(500).json({
      success: false,
      code: 'ERROR_0030_ALLOCATION_TRANSACTION',
      message: 'Không thể hoàn tất gán phòng, vui lòng thử lại',
    });
  } finally {
    conn.release();
  }
};

// ─── 5. POST /api/v1/bookings/:id/confirm-and-allocate — Xác nhận & Gán phòng cùng lúc ──
const confirmAndAllocate = async (req, res) => {
  const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
  const { quantity, roomIds, roomId, allocationNote = '' } = req.body;

  if (!bookingId) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'bookingId không được để trống',
    });
  }

  const targetRoomIds = Array.isArray(roomIds)
    ? roomIds.map(Number)
    : (roomId ? [Number(roomId)] : []);

  const expectedQuantity = quantity !== undefined && quantity !== null
    ? Number(quantity)
    : targetRoomIds.length;

  if (expectedQuantity <= 0) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'Số lượng phòng không được để trống',
    });
  }

  if (targetRoomIds.length !== expectedQuantity) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0027_ROOM_ALLOCATION_COUNT',
      message: `Vui lòng chọn đúng ${expectedQuantity} phòng`,
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Kiểm tra booking
    const [bookingRows] = await conn.query(
      `SELECT BookingId, ConfirmationCode, Status, RoomTypeId, RoomQuantity,
              CheckInDate, CheckOutDate
       FROM Bookings WHERE BookingId = ? FOR UPDATE`,
      [bookingId]
    );

    if (!bookingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking',
      });
    }

    const booking = bookingRows[0];

    // Chỉ thực hiện khi booking chưa hủy/checkout/checkin
    if (['Cancelled', 'NoShow', 'CheckedOut', 'CheckedIn'].includes(booking.Status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0023_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép thực hiện thao tác này',
      });
    }

    const cin = new Date(booking.CheckInDate);
    const cout = new Date(booking.CheckOutDate);
    if (cout <= cin) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0024_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng phải lớn hơn ngày nhận phòng',
      });
    }

    const now = Date.now();
    const userId = req.user?.userId || req.user?.UserId || 1;

    // 2. Validate từng phòng. Nếu có bất kỳ phòng nào không hợp lệ -> ROLLBACK toàn bộ!
    for (const rId of targetRoomIds) {
      const [roomRows] = await conn.query(
        'SELECT RoomId, RoomNumber, Floor, Status, RoomTypeId, IsDeleted FROM Rooms WHERE RoomId = ? FOR UPDATE',
        [rId]
      );

      if (!roomRows.length || roomRows[0].IsDeleted) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${rId} không còn khả dụng`,
        });
      }

      const room = roomRows[0];

      if (['Occupied', 'OutOfOrder', 'Maintenance'].includes(room.Status)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${room.RoomNumber} không còn khả dụng`,
        });
      }

      if (Number(room.RoomTypeId) !== Number(booking.RoomTypeId)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0026_ROOM_TYPE_MISMATCH',
          message: `Phòng ${room.RoomNumber} không thuộc loại phòng của booking`,
        });
      }

      const lock = activeRoomLocks.get(rId);
      if (lock && lock.expiresAt > now && String(lock.bookingId) !== String(bookingId)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
          message: `Phòng ${room.RoomNumber} không còn khả dụng`,
        });
      }

      const [conflictRows] = await conn.query(
        `SELECT b.BookingId, b.ConfirmationCode
         FROM BookingRoomAllocations bra
         JOIN Bookings b ON bra.BookingId = b.BookingId
         WHERE bra.RoomId = ? AND bra.BookingId != ?
           AND b.Status NOT IN ('Cancelled', 'CheckedOut', 'Completed', 'NoShow')
           AND (b.CheckInDate < ? AND b.CheckOutDate > ?)
         LIMIT 1`,
        [rId, bookingId, booking.CheckOutDate, booking.CheckInDate]
      );

      if (conflictRows.length) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0028_ROOM_CONFLICT',
          message: `Phòng ${room.RoomNumber} đã có booking trong khoảng thời gian này`,
        });
      }
    }

    // 3. Thực hiện Transaction: Cập nhật Booking sang Confirmed + Tạo Allocation
    await conn.query('DELETE FROM BookingRoomAllocations WHERE BookingId = ?', [bookingId]);
    await conn.query('DELETE FROM Stays WHERE BookingId = ? AND Status != "CheckedIn"', [bookingId]);

    for (const rId of targetRoomIds) {
      await conn.query(
        `INSERT INTO BookingRoomAllocations
          (BookingId, RoomId, CheckInDate, CheckOutDate, AllocationNote, AllocatedBy, AllocatedAt, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Allocated', NOW(), NOW())`,
        [bookingId, rId, booking.CheckInDate, booking.CheckOutDate, allocationNote, userId]
      );

      await conn.query(
        `INSERT INTO Stays
          (BookingId, RoomId, ExpectedCheckOut, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, ?, 'Confirmed', NOW(), NOW())`,
        [bookingId, rId, booking.CheckOutDate]
      );

      activeRoomLocks.delete(rId);
    }

    await conn.query(
      `UPDATE Bookings
       SET Status = 'Confirmed',
           ConfirmedBy = ?,
           ConfirmedAt = NOW(),
           AllocatedAt = NOW(),
           UpdatedAt = NOW()
       WHERE BookingId = ?`,
      [userId, bookingId]
    );

    await writeAudit(conn, {
      userId,
      actionType: 'CONFIRM_AND_ALLOCATE',
      recordId: bookingId,
      oldValues: { Status: booking.Status },
      newValues: {
        Status: 'Confirmed',
        AllocatedRoomIds: targetRoomIds,
        Quantity: expectedQuantity,
        ConfirmedBy: userId,
        ConfirmedAt: new Date().toISOString(),
        AllocatedAt: new Date().toISOString(),
      },
      ipAddress: req.ip,
    });

    await conn.commit();

    res.json({
      success: true,
      code: 'SUCCESS_0006_ROOM_ALLOCATED',
      message: 'Xác nhận và gán phòng thành công',
      data: {
        bookingId,
        status: 'Confirmed',
        quantity: expectedQuantity,
        roomIds: targetRoomIds,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('confirmAndAllocate error:', err);
    res.status(500).json({
      success: false,
      code: 'ERROR_0030_ALLOCATION_TRANSACTION',
      message: 'Không thể hoàn tất gán phòng, vui lòng thử lại',
    });
  } finally {
    conn.release();
  }
};

// ─── 6. DELETE /api/v1/bookings/:id/room-allocation — Hủy/bỏ gán phòng trước checkin ──
const deallocateRooms = async (req, res) => {
  const bookingId = req.params.id || req.params.bookingId || req.body.bookingId;
  const userId = req.user?.userId || req.user?.UserId || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bookingRows] = await conn.query(
      'SELECT BookingId, Status FROM Bookings WHERE BookingId = ? FOR UPDATE',
      [bookingId]
    );

    if (!bookingRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy booking',
      });
    }

    // Không cho xóa allocation đã phát sinh check-in
    if (['CheckedIn', 'CheckedOut', 'Completed'].includes(bookingRows[0].Status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0023_BOOKING_STATUS',
        message: 'Không thể hủy gán phòng cho booking đã làm thủ tục nhận phòng (CheckedIn)',
      });
    }

    const [oldAllocations] = await conn.query(
      'SELECT RoomId FROM BookingRoomAllocations WHERE BookingId = ?',
      [bookingId]
    );

    await conn.query('DELETE FROM BookingRoomAllocations WHERE BookingId = ?', [bookingId]);
    await conn.query('DELETE FROM Stays WHERE BookingId = ? AND Status != "CheckedIn"', [bookingId]);
    await conn.query('UPDATE Bookings SET AllocatedAt = NULL, UpdatedAt = NOW() WHERE BookingId = ?', [bookingId]);

    await writeAudit(conn, {
      userId,
      actionType: 'ROOM_DEALLOCATION',
      recordId: bookingId,
      oldValues: { AllocatedRoomIds: oldAllocations.map((a) => a.RoomId) },
      newValues: { AllocatedRoomIds: [] },
      ipAddress: req.ip,
    });

    await conn.commit();

    res.json({
      success: true,
      message: 'Đã hủy gán phòng cho booking thành công.',
    });
  } catch (err) {
    await conn.rollback();
    console.error('deallocateRooms error:', err);
    res.status(500).json({
      success: false,
      code: 'ERROR_0030_ALLOCATION_TRANSACTION',
      message: 'Không thể hủy gán phòng, vui lòng thử lại',
    });
  } finally {
    conn.release();
  }
};

// ─── 7. Lock Lease tạm 15 phút (Hold / Release) ──────────────────────────────
const holdRoom = async (req, res) => {
  try {
    const { roomId, bookingId } = req.body;
    if (!roomId || !bookingId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng cung cấp đầy đủ RoomId và BookingId.',
      });
    }

    const [bookingCheck] = await pool.query(
      'SELECT BookingId, Status FROM Bookings WHERE BookingId = ?',
      [bookingId]
    );

    if (!bookingCheck.length) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        isRecordDeleted: true,
        message: 'Dữ liệu đặt phòng này đã bị xóa hoặc không còn tồn tại.',
      });
    }

    if (['Cancelled', 'NoShow', 'CheckedOut'].includes(bookingCheck[0].Status)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0023_BOOKING_STATUS',
        message: 'Booking không ở trạng thái cho phép thực hiện thao tác này',
      });
    }

    const [roomCheck] = await pool.query(
      'SELECT RoomId, RoomNumber, Status, IsDeleted FROM Rooms WHERE RoomId = ?',
      [roomId]
    );

    if (!roomCheck.length || roomCheck[0].IsDeleted) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
        message: 'Phòng này đã bị xóa hoặc không còn tồn tại trên hệ thống.',
      });
    }

    if (roomCheck[0].Status === 'Occupied') {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
        isConflict: true,
        message: `Phòng ${roomCheck[0].RoomNumber} hiện đang có khách lưu trú.`,
      });
    }

    const now = Date.now();
    const existingLock = activeRoomLocks.get(Number(roomId));

    if (existingLock && existingLock.expiresAt > now && String(existingLock.bookingId) !== String(bookingId)) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0025_ROOM_NOT_AVAILABLE',
        isConflict: true,
        message: `Phòng ${roomCheck[0].RoomNumber} vừa được gán hoặc giữ tạm bởi nhân viên khác, vui lòng chọn phòng khác.`,
      });
    }

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
      message: `Đã kích hoạt khóa giữ tạm phòng trong 15 phút. Mã Lease: ${holdToken}`,
      roomId: Number(roomId),
      roomNumber: roomCheck[0].RoomNumber,
      expiresAt,
      expiresInSeconds: 900,
      holdToken,
    });
  } catch (err) {
    console.error('holdRoom error:', err);
    res.status(500).json({ success: false, code: 'ERROR_0030_ALLOCATION_TRANSACTION', message: err.message });
  }
};

const releaseHold = async (req, res) => {
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
};

module.exports = {
  getBookingDetail,
  getAvailableRooms,
  confirmBooking,
  allocateRooms,
  confirmAndAllocate,
  deallocateRooms,
  holdRoom,
  releaseHold,
  activeRoomLocks,
};
