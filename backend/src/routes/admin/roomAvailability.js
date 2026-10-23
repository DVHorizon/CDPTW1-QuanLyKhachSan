'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FEAT-ROOMMAP-01: SƠ ĐỒ PHÒNG TRỰC QUAN (VISUAL ROOM STATUS BOARD)
// Chuẩn hóa theo đặc tả Spec_4.SoDoPhongTrucQuan.docx
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const { JWT_SECRET } = require('../../middlewares/authMiddleware');
const { broadcastRoomMapUpdate } = require('../../services/websocketService');

// ─── Danh mục 6 trạng thái chuẩn & nhãn tiếng Việt theo mục 3.3 ───────────
const STATUS = {
  VACANT_CLEAN: 'VACANT_CLEAN',
  VACANT_DIRTY: 'VACANT_DIRTY',
  CLEANING: 'CLEANING',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  OUT_OF_ORDER: 'OUT_OF_ORDER'
};

const STATUS_LABELS = {
  VACANT_CLEAN: 'Trống - sạch',
  VACANT_DIRTY: 'Trống - chưa dọn',
  CLEANING: 'Đang dọn',
  RESERVED: 'Đã đặt',
  OCCUPIED: 'Đang ở',
  OUT_OF_ORDER: 'Bảo trì / Khóa phòng'
};

// ─── Ma trận chuyển trạng thái hợp lệ theo mục 3.4 ─────────────────────────
const ALLOWED_TRANSITIONS = {
  VACANT_DIRTY: ['CLEANING', 'OUT_OF_ORDER'],
  CLEANING: ['VACANT_CLEAN'],
  VACANT_CLEAN: ['OUT_OF_ORDER'],
  OUT_OF_ORDER: ['VACANT_DIRTY'],
  RESERVED: [],
  OCCUPIED: []
};

// ─── Quản lý kết nối SSE (Server-Sent Events) cho Real-time ───────────────
const sseClients = new Set();

const broadcastSSE = (eventData) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_) {
      sseClients.delete(client);
    }
  }
};

const notifyRoomUpdate = (req, payload) => {
  // 1. Broadcast SSE
  broadcastSSE({
    type: 'ROOM_STATUS_CHANGED',
    data: payload
  });

  // 2. Broadcast Native WebSocket
  broadcastRoomMapUpdate(payload);

  // 3. Socket.io nếu có
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('availability:changed', payload);
      io.emit('room-map-updates', payload);
    }
  } catch (_) {}
};

// ─── Helper xác thực & phân quyền theo mục 3.1 ────────────────────────────
const authenticateUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { status: 401, code: 'ERROR_0009_UNAUTHENTICATED', message: 'Bạn cần đăng nhập để thực hiện chức năng này' } };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    return { error: { status: 401, code: 'ERROR_0009_UNAUTHENTICATED', message: 'Bạn cần đăng nhập để thực hiện chức năng này' } };
  }
};

const checkRole = (user, allowedRoles) => {
  const roleName = user.roleName || user.role?.RoleName || (user.roleId === 1 ? 'Admin' : '');
  // Nếu là Kitchen hoặc không thuộc nhóm allowedRoles
  if (!allowedRoles.includes(roleName)) {
    return { error: { status: 403, code: 'ERROR_0010_FORBIDDEN', message: 'Bạn không có quyền thực hiện chức năng này' } };
  }
  return { roleName };
};

// Map trạng thái từ Database sang 1 trong 6 mã chuẩn của spec
const deriveSpecStatus = (r) => {
  if (r.RawStatus === 'OutOfOrder' || r.RawStatus === 'OUT_OF_ORDER') {
    return STATUS.OUT_OF_ORDER;
  }
  if (r.StayStatus === 'Active' || r.BookingStatus === 'CheckedIn' || r.RawStatus === 'OCCUPIED') {
    return STATUS.OCCUPIED;
  }
  if (r.BookingStatus === 'Confirmed' || r.RawStatus === 'RESERVED') {
    return STATUS.RESERVED;
  }
  if (r.HkStatus === 'InProgress' || r.RawStatus === 'CLEANING') {
    return STATUS.CLEANING;
  }
  if (r.RawStatus === 'Dirty' || r.RawStatus === 'DirtyVacant' || r.RawStatus === 'DirtyOccupied' || r.RawStatus === 'VACANT_DIRTY') {
    return STATUS.VACANT_DIRTY;
  }
  return STATUS.VACANT_CLEAN;
};

// ─── 1. GET /api/v1/room-map/stream hoặc /stream (SSE Real-time Channel) ───
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Đã kết nối luồng realtime room-map-updates' })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// ─── 2. GET / (Danh sách phòng sơ đồ trực quan) ───────────────────────────
router.get('/', async (req, res) => {
  try {
    // 3.1 Kiểm tra xác thực (Test Case 2)
    const authResult = authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json({
        success: false,
        code: authResult.error.code,
        message: authResult.error.message
      });
    }

    // 3.1 Kiểm tra quyền ROOMMAP_VIEW: Admin, Receptionist, Housekeeping (Test Case 1)
    const roleCheck = checkRole(authResult.user, ['Admin', 'Receptionist', 'Housekeeping']);
    if (roleCheck.error) {
      return res.status(roleCheck.error.status).json({
        success: false,
        code: roleCheck.error.code,
        message: roleCheck.error.message
      });
    }

    let { floor, status, q } = req.query;

    // 3.2 Lấy danh sách toàn bộ các tầng hiện có từ bảng Rooms / Floors
    const [floorRows] = await pool.query(
      'SELECT DISTINCT Floor FROM Rooms WHERE IsDeleted = 0 ORDER BY Floor ASC'
    );
    const floors = floorRows.map((f) => Number(f.Floor)).filter((n) => !isNaN(n));

    // Truy vấn kết hợp dữ liệu phòng, hạng phòng, lưu trú, đặt phòng hôm nay, dọn phòng
    const query = `
      SELECT 
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        r.Status AS RawStatus,
        r.Description,
        r.UpdatedAt,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS TypeName,
        COALESCE(rt.BasePrice, 1200000) AS BasePrice,
        s.StayId,
        s.ActualCheckIn,
        s.ExpectedCheckOut,
        s.Status AS StayStatus,
        b.BookingId,
        b.ConfirmationCode,
        b.CheckInDate,
        b.CheckOutDate,
        b.Status AS BookingStatus,
        u.FullName AS GuestName,
        hk.Status AS HkStatus
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status = 'Active'
      LEFT JOIN Bookings b ON (s.BookingId = b.BookingId OR (b.RoomTypeId = r.RoomTypeId AND b.Status IN ('Confirmed', 'CheckedIn') AND DATE(b.CheckInDate) <= CURDATE() AND DATE(b.CheckOutDate) >= CURDATE()))
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN HousekeepingAssignments hk ON r.RoomId = hk.RoomId AND hk.Status = 'InProgress'
      WHERE r.IsDeleted = 0
      ORDER BY r.Floor ASC, r.RoomNumber ASC
    `;

    const [rows] = await pool.query(query);

    const now = new Date();
    const roomsMap = new Map();

    for (const r of rows) {
      if (roomsMap.has(r.RoomId)) continue; // Ưu tiên bản ghi booking / stay đầu tiên

      const currentStatus = deriveSpecStatus(r);

      // Kiểm tra cảnh báo quá hạn trả phòng (Test Case 8)
      // Phòng OCCUPIED quá 12:00 trưa ngày check-out dự kiến mà chưa check-out
      let isOverdue = false;
      if (currentStatus === STATUS.OCCUPIED) {
        const expOutStr = r.ExpectedCheckOut || r.CheckOutDate;
        if (expOutStr) {
          const expOutDate = new Date(expOutStr);
          const checkoutDeadline = new Date(expOutDate);
          checkoutDeadline.setHours(12, 0, 0, 0);
          if (now > checkoutDeadline) {
            isOverdue = true;
          }
        }
      }

      // Thông tin khách: CHỈ hiển thị khi trạng thái là RESERVED hoặc OCCUPIED (mục 6.2 STT 3)
      let guestInfo = null;
      if (currentStatus === STATUS.RESERVED || currentStatus === STATUS.OCCUPIED) {
        guestInfo = {
          guestName: r.GuestName || 'Khách lưu trú',
          checkIn: r.CheckInDate || r.ActualCheckIn || null,
          checkOut: r.ExpectedCheckOut || r.CheckOutDate || null,
          bookingId: r.BookingId || r.StayId || null,
          confirmationCode: r.ConfirmationCode || `CONF-${r.RoomId}`
        };
      }

      roomsMap.set(r.RoomId, {
        id: r.RoomId,
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor) || 1,
        typeName: r.TypeName,
        basePrice: Number(r.BasePrice) || 0,
        currentStatus,
        isOverdue,
        booking: guestInfo,
        updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : new Date().toISOString()
      });
    }

    let roomList = Array.from(roomsMap.values());

    // Bộ lọc theo tầng (floorFilter)
    if (floor && floor !== 'ALL' && floor !== 'all') {
      const fNum = parseInt(floor, 10);
      if (!isNaN(fNum)) {
        roomList = roomList.filter((rm) => rm.floor === fNum);
      }
    }

    // Bộ lọc theo trạng thái (statusFilter[])
    if (status) {
      const allowed = Array.isArray(status) ? status : String(status).split(',').map((s) => s.trim());
      if (allowed.length > 0 && !allowed.includes('ALL')) {
        roomList = roomList.filter((rm) => allowed.includes(rm.currentStatus));
      }
    }

    // Bộ lọc tìm kiếm từ khóa q
    if (q && String(q).trim()) {
      const kw = String(q).trim().toLowerCase();
      roomList = roomList.filter((rm) =>
        rm.roomNumber.toLowerCase().includes(kw) ||
        (rm.booking?.guestName && rm.booking.guestName.toLowerCase().includes(kw)) ||
        (rm.booking?.confirmationCode && rm.booking.confirmationCode.toLowerCase().includes(kw))
      );
    }

    // Thống kê số lượng phòng theo 6 trạng thái
    const allRooms = Array.from(roomsMap.values());
    const stats = {
      VACANT_CLEAN: allRooms.filter((r) => r.currentStatus === STATUS.VACANT_CLEAN).length,
      VACANT_DIRTY: allRooms.filter((r) => r.currentStatus === STATUS.VACANT_DIRTY).length,
      CLEANING: allRooms.filter((r) => r.currentStatus === STATUS.CLEANING).length,
      RESERVED: allRooms.filter((r) => r.currentStatus === STATUS.RESERVED).length,
      OCCUPIED: allRooms.filter((r) => r.currentStatus === STATUS.OCCUPIED).length,
      OUT_OF_ORDER: allRooms.filter((r) => r.currentStatus === STATUS.OUT_OF_ORDER).length
    };

    return res.json({
      success: true,
      floors: floors.length ? floors : [1, 2, 3],
      totalRooms: allRooms.length,
      filteredRooms: roomList.length,
      stats,
      rooms: roomList
    });
  } catch (err) {
    console.error('Lỗi GET /api/v1/room-map:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu sơ đồ phòng: ' + err.message
    });
  }
});

// ─── 3. GET /rooms/:roomId (Chi tiết 1 phòng) ──────────────────────────────
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const authResult = authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json(authResult.error);
    }

    const roomId = parseInt(req.params.roomId, 10);
    const [rows] = await pool.query(
      `SELECT r.*, rt.TypeName, rt.BasePrice 
       FROM Rooms r 
       LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId 
       WHERE r.RoomId = ? AND r.IsDeleted = 0`,
      [roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
    }

    const r = rows[0];
    const currentStatus = deriveSpecStatus(r);

    return res.json({
      success: true,
      room: {
        id: r.RoomId,
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor),
        typeName: r.TypeName,
        currentStatus,
        updatedAt: r.UpdatedAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 4. ĐỔI TRẠNG THÁI PHÒNG (PATCH /rooms/:roomId/status & POST /:id/action)
const handleStatusChange = async (req, res) => {
  let connection;
  try {
    // 3.1 Xác thực token (Test Case 2)
    const authResult = authenticateUser(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json({
        success: false,
        code: authResult.error.code,
        message: authResult.error.message
      });
    }

    const rawId = parseInt(String(req.params.roomId || req.params.id).replace(/\D/g, ''), 10);
    let { newStatus, currentStatus, note, action } = req.body;

    // Lấy thông tin phòng hiện tại trong database
    const [roomRows] = await pool.query(
      `SELECT r.RoomId, r.RoomNumber, r.Floor, r.Status AS RawStatus, r.UpdatedAt,
              s.StayId, s.Status AS StayStatus, b.BookingId, b.Status AS BookingStatus, hk.Status AS HkStatus
       FROM Rooms r
       LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status = 'Active'
       LEFT JOIN Bookings b ON (s.BookingId = b.BookingId OR (b.RoomTypeId = r.RoomTypeId AND b.Status IN ('Confirmed', 'CheckedIn') AND DATE(b.CheckInDate) <= CURDATE() AND DATE(b.CheckOutDate) >= CURDATE()))
       LEFT JOIN HousekeepingAssignments hk ON r.RoomId = hk.RoomId AND hk.Status = 'InProgress'
       WHERE r.RoomId = ? AND r.IsDeleted = 0
       LIMIT 1`,
      [rawId]
    );

    if (roomRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Phòng #${rawId} không tồn tại trong hệ thống`
      });
    }

    const room = roomRows[0];
    const dbCurrentStatus = deriveSpecStatus(room);

    // ── Xử lý Check-out (Yêu cầu quyền BOOKING_MANAGE: Admin, Receptionist) ──
    if (action === 'checkout') {
      const roleCheckBooking = checkRole(authResult.user, ['Admin', 'Receptionist']);
      if (roleCheckBooking.error) {
        return res.status(roleCheckBooking.error.status).json(roleCheckBooking.error);
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      if (room.StayId) {
        await connection.query('UPDATE Stays SET Status = "Completed", ActualCheckOut = NOW(), UpdatedAt = NOW() WHERE StayId = ?', [room.StayId]);
      }
      if (room.BookingId) {
        await connection.query('UPDATE Bookings SET Status = "CheckedOut", UpdatedAt = NOW() WHERE BookingId = ?', [room.BookingId]);
      }
      await connection.query('UPDATE Rooms SET Status = "DirtyVacant", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);

      await connection.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
        [authResult.user.userId || 1, rawId, JSON.stringify({ status: dbCurrentStatus }), JSON.stringify({ status: STATUS.VACANT_DIRTY, action: 'checkout' }), req.ip || '127.0.0.1']
      );

      await connection.commit();

      const eventPayload = {
        roomId: rawId,
        roomNumber: room.RoomNumber,
        floor: room.Floor,
        oldStatus: dbCurrentStatus,
        newStatus: STATUS.VACANT_DIRTY,
        updatedAt: new Date().toISOString()
      };
      notifyRoomUpdate(req, eventPayload);

      return res.json({
        success: true,
        code: 'SUCCESS_0002_UPDATED',
        message: 'Hoàn tất thủ tục trả phòng thành công. Phòng đã chuyển sang Trống - chưa dọn.',
        data: { roomId: rawId, status: STATUS.VACANT_DIRTY }
      });
    }

    // ── Xử lý Check-in (Yêu cầu quyền BOOKING_MANAGE: Admin, Receptionist) ───
    if (action === 'checkin') {
      const roleCheckBooking = checkRole(authResult.user, ['Admin', 'Receptionist']);
      if (roleCheckBooking.error) {
        return res.status(roleCheckBooking.error.status).json(roleCheckBooking.error);
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      if (room.BookingId) {
        await connection.query('UPDATE Bookings SET Status = "CheckedIn", UpdatedAt = NOW() WHERE BookingId = ?', [room.BookingId]);
      }
      await connection.query(
        `INSERT INTO Stays (RoomId, BookingId, ActualCheckIn, Status, CreatedAt, UpdatedAt)
         VALUES (?, ?, NOW(), 'Active', NOW(), NOW())`,
        [rawId, room.BookingId || null]
      );
      await connection.query('UPDATE Rooms SET Status = "CleanOccupied", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);

      await connection.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
        [authResult.user.userId || 1, rawId, JSON.stringify({ status: dbCurrentStatus }), JSON.stringify({ status: STATUS.OCCUPIED, action: 'checkin' }), req.ip || '127.0.0.1']
      );

      await connection.commit();

      const eventPayload = {
        roomId: rawId,
        roomNumber: room.RoomNumber,
        floor: room.Floor,
        oldStatus: dbCurrentStatus,
        newStatus: STATUS.OCCUPIED,
        updatedAt: new Date().toISOString()
      };
      notifyRoomUpdate(req, eventPayload);

      return res.json({
        success: true,
        code: 'SUCCESS_0002_UPDATED',
        message: 'Làm thủ tục nhận phòng thành công. Phòng đã chuyển sang Đang ở.',
        data: { roomId: rawId, status: STATUS.OCCUPIED }
      });
    }

    // 3.1 Quyền ROOMMAP_UPDATE_STATUS: Admin, Housekeeping (mục 3.1 & Test Case 1)
    const roleCheck = checkRole(authResult.user, ['Admin', 'Housekeeping']);
    if (roleCheck.error) {
      return res.status(roleCheck.error.status).json({
        success: false,
        code: roleCheck.error.code,
        message: roleCheck.error.message
      });
    }

    // Map action cũ sang newStatus nếu có
    if (!newStatus && action) {
      if (action === 'clean' || action === 'clean_complete') newStatus = STATUS.VACANT_CLEAN;
      else if (action === 'start_cleaning' || action === 'clean_start') newStatus = STATUS.CLEANING;
      else if (action === 'ooo' || action === 'mark_ooo') newStatus = STATUS.OUT_OF_ORDER;
      else if (action === 'unmark_ooo' || action === 'restore') newStatus = STATUS.VACANT_DIRTY;
    }

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái mới (newStatus) không được để trống'
      });
    }

    // 3.7 Kiểm tra cập nhật đồng thời (Concurrent Update - Test Case 7)
    // Nếu client gửi currentStatus ban đầu mà khác dbCurrentStatus hiện tại
    if (currentStatus && currentStatus !== dbCurrentStatus) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0020_CONCURRENT_UPDATE',
        message: 'Trạng thái phòng vừa được cập nhật bởi người khác, vui lòng tải lại'
      });
    }

    // 3.4 Kiểm tra ma trận chuyển trạng thái hợp lệ (Test Case 4)
    const allowed = ALLOWED_TRANSITIONS[dbCurrentStatus] || [];
    if (!allowed.includes(newStatus)) {
      const oldLabel = STATUS_LABELS[dbCurrentStatus] || dbCurrentStatus;
      const newLabel = STATUS_LABELS[newStatus] || newStatus;
      return res.status(400).json({
        success: false,
        code: 'ERROR_0019_INVALID_STATUS_TRANSITION',
        message: `Không thể chuyển trạng thái phòng từ ${oldLabel} sang ${newLabel}`
      });
    }

    // 3.4 Bắt buộc nhập note khi chuyển sang OUT_OF_ORDER (Test Case 5)
    if (newStatus === STATUS.OUT_OF_ORDER) {
      if (!note || !String(note).trim()) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Vui lòng nhập lý do bảo trì'
        });
      }
    }

    // 3.8 Bắt đầu Transaction cập nhật phòng + phân công dọn + ghi AuditLogs
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Map newStatus sang mã lưu trong cột Rooms.Status
    let nextDbStatus = 'CleanAvailable';
    if (newStatus === STATUS.OUT_OF_ORDER) nextDbStatus = 'OutOfOrder';
    else if (newStatus === STATUS.VACANT_DIRTY) nextDbStatus = 'DirtyVacant';
    else if (newStatus === STATUS.CLEANING) nextDbStatus = 'DirtyVacant';
    else if (newStatus === STATUS.VACANT_CLEAN) nextDbStatus = 'CleanAvailable';

    await connection.query(
      'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?',
      [nextDbStatus, rawId]
    );

    // Nghiệp vụ dọn phòng theo mục 3.4
    if (newStatus === STATUS.CLEANING) {
      // Khi "Bắt đầu dọn": hệ thống tự tạo 1 HousekeepingTask trạng thái InProgress
      await connection.query(
        `INSERT INTO HousekeepingAssignments (RoomId, UserId, Status, StartedAt, Note, AssignmentDate, Priority)
         VALUES (?, ?, 'InProgress', NOW(), ?, CURDATE(), 2)`,
        [rawId, authResult.user.userId || 1, note || 'Bắt đầu dọn phòng qua Sơ đồ phòng trực quan']
      );
    } else if (newStatus === STATUS.VACANT_CLEAN) {
      // Khi "Hoàn tất dọn": hệ thống đóng HousekeepingTask trạng thái Completed
      await connection.query(
        `UPDATE HousekeepingAssignments 
         SET Status = 'Completed', CompletedAt = NOW() 
         WHERE RoomId = ? AND Status = 'InProgress'`,
        [rawId]
      );
    }

    // 3.8 Ghi vào bảng AuditLogs
    await connection.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
      [
        authResult.user.userId || 1,
        rawId,
        JSON.stringify({ status: dbCurrentStatus, label: STATUS_LABELS[dbCurrentStatus] }),
        JSON.stringify({ status: newStatus, label: STATUS_LABELS[newStatus], note: note || null }),
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();

    // 3.6 Đẩy thông báo thời gian thực (Real-time Broadcast)
    const eventPayload = {
      roomId: rawId,
      roomNumber: room.RoomNumber,
      floor: room.Floor,
      oldStatus: dbCurrentStatus,
      newStatus,
      updatedAt: new Date().toISOString()
    };
    notifyRoomUpdate(req, eventPayload);

    // Trả về thông báo thành công đúng mã và văn bản mục 5.2
    return res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật trạng thái phòng thành công',
      data: {
        roomId: rawId,
        roomNumber: room.RoomNumber,
        status: newStatus
      }
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Lỗi cập nhật trạng thái phòng:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật trạng thái phòng: ' + err.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Đăng ký các endpoints đổi trạng thái tương thích
router.patch('/rooms/:roomId/status', handleStatusChange);
router.post('/rooms/:roomId/status', handleStatusChange);
router.patch('/:id/status', handleStatusChange);
router.post('/:id/status', handleStatusChange);
router.post('/:id/action', handleStatusChange);

module.exports = router;