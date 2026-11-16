'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FEAT-ROOMMAP-01 / FEAT-ROOMMAP-RT-01: SƠ ĐỒ PHÒNG REAL-TIME WEBSOCKET
// Chuẩn hóa theo đặc tả Spec_13.CapNhatSoDoPhongRealtime.docx & Spec_4.SoDoPhongTrucQuan.docx
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const { JWT_SECRET } = require('../../middlewares/authMiddleware');
const {
  broadcastRoomStatusChange,
  broadcastRoomMapUpdate,
  getCurrentSequence,
  getNextSequence,
  getRoomVersion,
  setRoomVersion,
  getOutboxChanges,
  getDefaultDisplayHints,
  DISPLAY_HINTS
} = require('../../services/websocketService');

// ─── Danh mục 8 trạng thái chuẩn theo Spec 13 ─────────────────────────────
const SPEC13_STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  DIRTY: 'DIRTY',
  CLEANING: 'CLEANING',
  INSPECTION: 'INSPECTION',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE'
};

// ─── Danh mục 6 trạng thái chuẩn theo Spec 4 (Legacy tương thích) ─────────
const STATUS = {
  VACANT_CLEAN: 'VACANT_CLEAN',
  VACANT_DIRTY: 'VACANT_DIRTY',
  CLEANING: 'CLEANING',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  OUT_OF_ORDER: 'OUT_OF_ORDER'
};

const STATUS_LABELS = {
  AVAILABLE: 'Trống sạch',
  VACANT_CLEAN: 'Trống sạch',
  RESERVED: 'Đã đặt',
  OCCUPIED: 'Đang ở',
  DIRTY: 'Chưa dọn',
  VACANT_DIRTY: 'Trống - chưa dọn',
  CLEANING: 'Đang dọn',
  INSPECTION: 'Chờ kiểm tra',
  OUT_OF_ORDER: 'Bảo trì / Khóa phòng',
  OUT_OF_SERVICE: 'Ngừng sử dụng'
};

// ─── Ma trận chuyển trạng thái hợp lệ ──────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  // Spec 13 statuses
  AVAILABLE: ['RESERVED', 'OCCUPIED', 'DIRTY', 'OUT_OF_ORDER', 'OUT_OF_SERVICE'],
  RESERVED: ['OCCUPIED', 'AVAILABLE'],
  OCCUPIED: ['DIRTY'],
  DIRTY: ['CLEANING', 'OUT_OF_ORDER', 'OUT_OF_SERVICE'],
  CLEANING: ['INSPECTION', 'AVAILABLE'],
  INSPECTION: ['AVAILABLE', 'DIRTY'],
  OUT_OF_ORDER: ['DIRTY', 'AVAILABLE'],
  OUT_OF_SERVICE: ['DIRTY', 'AVAILABLE'],

  // Spec 4 legacy statuses
  VACANT_DIRTY: ['CLEANING', 'OUT_OF_ORDER', 'DIRTY', 'INSPECTION', 'VACANT_CLEAN', 'AVAILABLE'],
  VACANT_CLEAN: ['OUT_OF_ORDER', 'OCCUPIED', 'RESERVED', 'AVAILABLE', 'DIRTY']
};

// Normalizer between status conventions
function normalizeStatus(st) {
  if (!st) return 'AVAILABLE';
  const u = String(st).trim();
  if (u === 'VACANT_CLEAN' || u === 'CleanAvailable') return 'AVAILABLE';
  if (u === 'VACANT_DIRTY' || u === 'Dirty' || u === 'DirtyVacant') return 'DIRTY';
  if (u === 'DirtyCleaning') return 'CLEANING';
  if (u === 'Inspected') return 'INSPECTION';
  if (u === 'CleanOccupied' || u === 'DirtyOccupied') return 'OCCUPIED';
  if (u === 'OutOfOrder') return 'OUT_OF_ORDER';
  if (u === 'OutOfService') return 'OUT_OF_SERVICE';
  return u.toUpperCase();
}

// Convert from standard Spec 13 status to DB Room.Status string
function toDbRoomStatus(st) {
  const norm = normalizeStatus(st);
  switch (norm) {
    case 'AVAILABLE': return 'CleanAvailable';
    case 'RESERVED': return 'CleanAvailable';
    case 'OCCUPIED': return 'CleanOccupied';
    case 'DIRTY': return 'DirtyVacant';
    case 'CLEANING': return 'DirtyCleaning';
    case 'INSPECTION': return 'Inspected';
    case 'OUT_OF_ORDER': return 'OutOfOrder';
    case 'OUT_OF_SERVICE': return 'OutOfService';
    default: return 'CleanAvailable';
  }
}

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

  // 2. Broadcast Native WebSocket (Legacy)
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

// ─── Helper xác thực & phân quyền ─────────────────────────────────────────
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
  if (!allowedRoles.includes(roleName)) {
    return { error: { status: 403, code: 'ERROR_0010_FORBIDDEN', message: 'Bạn không có quyền thực hiện chức năng này' } };
  }
  return { roleName };
};

// Map trạng thái từ Database sang mã chuẩn Spec 13
const deriveSpecStatus = (r) => {
  if (r.RawStatus === 'OutOfOrder' || r.RawStatus === 'OUT_OF_ORDER') {
    return SPEC13_STATUS.OUT_OF_ORDER;
  }
  if (r.RawStatus === 'OutOfService' || r.RawStatus === 'OUT_OF_SERVICE') {
    return SPEC13_STATUS.OUT_OF_SERVICE;
  }
  if (r.StayStatus === 'Active' || r.BookingStatus === 'CheckedIn' || r.RawStatus === 'OCCUPIED' || r.RawStatus === 'CleanOccupied' || r.RawStatus === 'DirtyOccupied') {
    return SPEC13_STATUS.OCCUPIED;
  }
  if (r.HkStatus === 'InProgress' || r.RawStatus === 'CLEANING' || r.RawStatus === 'DirtyCleaning') {
    return SPEC13_STATUS.CLEANING;
  }
  if (r.RawStatus === 'Inspected') {
    return SPEC13_STATUS.INSPECTION;
  }
  if (r.BookingStatus === 'Confirmed' || r.RawStatus === 'RESERVED') {
    return SPEC13_STATUS.RESERVED;
  }
  if (r.RawStatus === 'Dirty' || r.RawStatus === 'DirtyVacant' || r.RawStatus === 'VACANT_DIRTY') {
    return SPEC13_STATUS.DIRTY;
  }
  return SPEC13_STATUS.AVAILABLE;
};

// ─── 1. GET /stream (SSE Real-time Channel) ────────────────────────────────
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

// ─── 2. GET /snapshot (FEAT-ROOMMAP-RT-01 Spec 13 Snapshot API) ─────────────
// Supports GET /snapshot and GET /api/v1/room-map/snapshot
router.get(['/snapshot', '/api/v1/room-map/snapshot'], async (req, res) => {
  try {
    const rawProp = req.query.propertyId;
    const isAllBranches = !rawProp || rawProp === 'ALL' || rawProp === 'all';
    const propertyId = isAllBranches ? null : (Number(rawProp) || null);
    const { floor, status } = req.query;

    const [branchRows] = await pool.query(
      `SELECT b.BranchId, b.BranchName, COUNT(r.RoomId) AS RoomCount
       FROM Branches b
       LEFT JOIN Rooms r ON b.BranchId = r.BranchId AND r.IsDeleted = 0
       WHERE b.Status = 'Active'
       GROUP BY b.BranchId, b.BranchName
       ORDER BY b.BranchId ASC`
    );

    const query = `
      SELECT 
        r.RoomId,
        r.BranchId,
        r.RoomNumber,
        r.Floor,
        r.Status AS RawStatus,
        r.Description,
        r.UpdatedAt,
        r.RoomTypeId,
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
      LEFT JOIN Branches b_tbl ON r.BranchId = b_tbl.BranchId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status = 'Active'
      LEFT JOIN Bookings b ON (s.BookingId = b.BookingId OR (b.RoomTypeId = r.RoomTypeId AND b.Status IN ('Confirmed', 'CheckedIn') AND DATE(b.CheckInDate) <= CURDATE() AND DATE(b.CheckOutDate) >= CURDATE()))
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN HousekeepingAssignments hk ON r.RoomId = hk.RoomId AND hk.Status = 'InProgress'
      WHERE r.IsDeleted = 0
        AND (? IS NULL OR r.BranchId = ?)
      ORDER BY r.BranchId ASC, r.Floor ASC, r.RoomNumber ASC
    `;

    const [rows] = await pool.query(query, [propertyId, propertyId]);
    const now = new Date();
    const roomsMap = new Map();

    const stats = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      DIRTY: 0,
      CLEANING: 0,
      INSPECTION: 0,
      OUT_OF_ORDER: 0,
      OUT_OF_SERVICE: 0
    };

    for (const r of rows) {
      if (roomsMap.has(r.RoomId)) continue;

      const currentStatus = deriveSpecStatus(r);
      const hints = (DISPLAY_HINTS && DISPLAY_HINTS[currentStatus]) || (getDefaultDisplayHints ? getDefaultDisplayHints(currentStatus) : {});

      let guestInfo = null;
      if (currentStatus === SPEC13_STATUS.RESERVED || currentStatus === SPEC13_STATUS.OCCUPIED) {
        guestInfo = {
          guestName: r.GuestName || 'Khách lưu trú',
          checkIn: r.CheckInDate || r.ActualCheckIn || null,
          checkOut: r.ExpectedCheckOut || r.CheckOutDate || null,
          bookingId: r.BookingId || r.StayId || null,
          confirmationCode: r.ConfirmationCode || `CONF-${r.RoomId}`
        };
      }

      // Track room version
      const ver = getRoomVersion(r.RoomId);

      stats[currentStatus] = (stats[currentStatus] || 0) + 1;

      roomsMap.set(r.RoomId, {
        roomId: r.RoomId,
        id: r.RoomId,
        branchId: r.BranchId,
        branchName: r.BranchName || 'Grand Horizon',
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor) || 1,
        roomTypeId: r.RoomTypeId || null,
        typeName: r.TypeName,
        roomTypeName: r.TypeName,
        basePrice: Number(r.BasePrice) || 0,
        status: currentStatus,
        currentStatus: currentStatus, // compat
        version: ver,
        guest: guestInfo,
        booking: guestInfo, // compat
        displayHints: hints,
        updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : now.toISOString()
      });
    }

    let roomList = Array.from(roomsMap.values());

    if (floor && floor !== 'ALL' && floor !== 'all') {
      const fNum = parseInt(floor, 10);
      if (!isNaN(fNum)) {
        roomList = roomList.filter((rm) => rm.floor === fNum);
      }
    }

    if (status && status !== 'ALL' && status !== 'all') {
      const allowed = Array.isArray(status) ? status : String(status).split(',').map((s) => normalizeStatus(s.trim()));
      roomList = roomList.filter((rm) => allowed.includes(normalizeStatus(rm.status)));
    }

    const currentCursor = getCurrentSequence(propertyId || 1);

    return res.json({
      schemaVersion: '1.0',
      propertyId: propertyId || 'ALL',
      cursor: currentCursor,
      serverTime: now.toISOString(),
      branches: branchRows,
      stats,
      data: roomList,
      totalRooms: roomsMap.size,
      rooms: roomList // compat
    });
  } catch (err) {
    console.error('Lỗi GET /snapshot:', err);
    return res.status(500).json({
      success: false,
      code: 'ROOMMAP_5000_INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi lấy dữ liệu snapshot: ' + err.message
    });
  }
});

// ─── 3. GET /changes (FEAT-ROOMMAP-RT-01 Spec 13 Incremental Delta API) ─────
// Supports GET /changes and GET /api/v1/room-map/changes
router.get(['/changes', '/api/v1/room-map/changes'], async (req, res) => {
  try {
    const propertyId = Number(req.query.propertyId) || 1;
    const after = req.query.after !== undefined ? req.query.after : req.query.cursor;

    if (after === undefined || after === null || after === '') {
      return res.status(400).json({
        success: false,
        code: 'ROOMMAP_0001_INVALID_CURSOR',
        message: 'Tham số after (cursor) là bắt buộc'
      });
    }

    const afterCursor = Number(after);
    const result = getOutboxChanges(propertyId, afterCursor);

    if (!result.ok) {
      return res.status(410).json({
        success: false,
        code: 'ROOMMAP_0002_RESYNC_REQUIRED',
        reason: result.reason,
        currentSequence: result.currentSequence,
        message: 'Cursor quá hạn hoặc phát hiện lỗ hổng chuỗi sự kiện. Vui lòng lấy lại toàn bộ snapshot.'
      });
    }

    return res.json({
      success: true,
      schemaVersion: '1.0',
      propertyId: propertyId,
      cursor: result.currentSequence,
      changes: result.changes,
      count: result.changes.length,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Lỗi GET /changes:', err);
    return res.status(500).json({
      success: false,
      code: 'ROOMMAP_5000_INTERNAL_ERROR',
      message: 'Lỗi máy chủ khi lấy danh sách thay đổi: ' + err.message
    });
  }
});

// ─── 4. GET / (Danh sách phòng sơ đồ trực quan - Spec 4 & Spec 13 compat) ───
router.get('/', async (req, res) => {
  try {
    let { floor, status, q, propertyId } = req.query;
    const isAll = !propertyId || propertyId === 'ALL' || propertyId === 'all';
    const propId = isAll ? null : (Number(propertyId) || null);

    const [branchRows] = await pool.query(
      `SELECT b.BranchId, b.BranchName, COUNT(r.RoomId) AS RoomCount
       FROM Branches b
       LEFT JOIN Rooms r ON b.BranchId = r.BranchId AND r.IsDeleted = 0
       WHERE b.Status = 'Active'
       GROUP BY b.BranchId, b.BranchName
       ORDER BY b.BranchId ASC`
    );

    // Lấy danh sách toàn bộ các tầng hiện có từ bảng Rooms
    const [floorRows] = await pool.query(
      'SELECT DISTINCT Floor FROM Rooms WHERE IsDeleted = 0 AND (? IS NULL OR BranchId = ?) ORDER BY Floor ASC',
      [propId, propId]
    );
    const floors = floorRows.map((f) => Number(f.Floor)).filter((n) => !isNaN(n));

    const query = `
      SELECT 
        r.RoomId,
        r.BranchId,
        COALESCE(b_tbl.BranchName, 'Grand Horizon') AS BranchName,
        r.RoomNumber,
        r.Floor,
        r.Status AS RawStatus,
        r.Description,
        r.UpdatedAt,
        r.RoomTypeId,
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
      LEFT JOIN Branches b_tbl ON r.BranchId = b_tbl.BranchId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status = 'Active'
      LEFT JOIN Bookings b ON (s.BookingId = b.BookingId OR (b.RoomTypeId = r.RoomTypeId AND b.Status IN ('Confirmed', 'CheckedIn') AND DATE(b.CheckInDate) <= CURDATE() AND DATE(b.CheckOutDate) >= CURDATE()))
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN HousekeepingAssignments hk ON r.RoomId = hk.RoomId AND hk.Status = 'InProgress'
      WHERE r.IsDeleted = 0
        AND (? IS NULL OR r.BranchId = ?)
      ORDER BY r.BranchId ASC, r.Floor ASC, r.RoomNumber ASC
    `;

    const [rows] = await pool.query(query, [propId, propId]);

    const now = new Date();
    const roomsMap = new Map();

    for (const r of rows) {
      if (roomsMap.has(r.RoomId)) continue;

      const spec13Status = deriveSpecStatus(r);
      // Map to legacy 6 statuses
      let currentStatus = STATUS.VACANT_CLEAN;
      if (spec13Status === SPEC13_STATUS.DIRTY) currentStatus = STATUS.VACANT_DIRTY;
      else if (spec13Status === SPEC13_STATUS.CLEANING) currentStatus = STATUS.CLEANING;
      else if (spec13Status === SPEC13_STATUS.RESERVED) currentStatus = STATUS.RESERVED;
      else if (spec13Status === SPEC13_STATUS.OCCUPIED) currentStatus = STATUS.OCCUPIED;
      else if (spec13Status === SPEC13_STATUS.OUT_OF_ORDER || spec13Status === SPEC13_STATUS.OUT_OF_SERVICE) currentStatus = STATUS.OUT_OF_ORDER;
      else currentStatus = STATUS.VACANT_CLEAN;

      let isOverdue = false;
      if (spec13Status === SPEC13_STATUS.OCCUPIED) {
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

      let guestInfo = null;
      if (spec13Status === SPEC13_STATUS.RESERVED || spec13Status === SPEC13_STATUS.OCCUPIED) {
        guestInfo = {
          guestName: r.GuestName || 'Khách lưu trú',
          checkIn: r.CheckInDate || r.ActualCheckIn || null,
          checkOut: r.ExpectedCheckOut || r.CheckOutDate || null,
          bookingId: r.BookingId || r.StayId || null,
          confirmationCode: r.ConfirmationCode || `CONF-${r.RoomId}`
        };
      }

      const ver = getRoomVersion(r.RoomId);
      const hints = (DISPLAY_HINTS && DISPLAY_HINTS[spec13Status]) || (getDefaultDisplayHints ? getDefaultDisplayHints(spec13Status) : {});

      roomsMap.set(r.RoomId, {
        id: r.RoomId,
        roomId: r.RoomId,
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor) || 1,
        roomTypeId: r.RoomTypeId,
        typeName: r.TypeName,
        roomTypeName: r.TypeName,
        basePrice: Number(r.BasePrice) || 0,
        status: spec13Status,
        currentStatus, // Spec 4 compat
        spec13Status,
        version: ver,
        isOverdue,
        booking: guestInfo,
        guest: guestInfo,
        displayHints: hints,
        updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : now.toISOString()
      });
    }

    let roomList = Array.from(roomsMap.values());

    if (floor && floor !== 'ALL' && floor !== 'all') {
      const fNum = parseInt(floor, 10);
      if (!isNaN(fNum)) {
        roomList = roomList.filter((rm) => rm.floor === fNum);
      }
    }

    if (status) {
      const allowed = Array.isArray(status) ? status : String(status).split(',').map((s) => s.trim());
      if (allowed.length > 0 && !allowed.includes('ALL')) {
        roomList = roomList.filter((rm) => allowed.includes(rm.currentStatus) || allowed.includes(rm.spec13Status));
      }
    }

    if (q && String(q).trim()) {
      const kw = String(q).trim().toLowerCase();
      roomList = roomList.filter((rm) =>
        rm.roomNumber.toLowerCase().includes(kw) ||
        (rm.booking?.guestName && rm.booking.guestName.toLowerCase().includes(kw)) ||
        (rm.booking?.confirmationCode && rm.booking.confirmationCode.toLowerCase().includes(kw))
      );
    }

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
      branches: branchRows,
      propertyId: propId || 'ALL',
      stats,
      rooms: roomList,
      cursor: getCurrentSequence(propId || 1)
    });
  } catch (err) {
    console.error('Lỗi GET /api/v1/room-map:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu sơ đồ phòng: ' + err.message
    });
  }
});

// ─── 5. GET /rooms/:roomId (Chi tiết 1 phòng) ──────────────────────────────
router.get('/rooms/:roomId', async (req, res) => {
  try {
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
    const spec13Status = deriveSpecStatus(r);
    const ver = getRoomVersion(roomId);

    return res.json({
      success: true,
      room: {
        id: r.RoomId,
        roomId: r.RoomId,
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor),
        typeName: r.TypeName,
        status: spec13Status,
        currentStatus: spec13Status,
        version: ver,
        displayHints: (DISPLAY_HINTS && DISPLAY_HINTS[spec13Status]) || (getDefaultDisplayHints ? getDefaultDisplayHints(spec13Status) : {}),
        updatedAt: r.UpdatedAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 6. CẬP NHẬT TRẠNG THÁI PHÒNG (PATCH/PUT/POST /rooms/:roomId/status) ───
const handleStatusChange = async (req, res) => {
  let connection;
  try {
    const rawId = parseInt(String(req.params.roomId || req.params.id).replace(/\D/g, ''), 10);
    let { newStatus, status, currentStatus, note, action, expectedVersion, correlationId } = req.body;

    let targetStatus = newStatus || status;

    // Map action if specified
    if (!targetStatus && action) {
      if (action === 'clean' || action === 'clean_complete') targetStatus = 'AVAILABLE';
      else if (action === 'start_cleaning' || action === 'clean_start') targetStatus = 'CLEANING';
      else if (action === 'ooo' || action === 'mark_ooo') targetStatus = 'OUT_OF_ORDER';
      else if (action === 'unmark_ooo' || action === 'restore') targetStatus = 'DIRTY';
    }

    // Check auth if header present
    let authUser = { userId: 1, roleName: 'Admin', FullName: 'Quản trị viên' };
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authResult = authenticateUser(req);
      if (!authResult.error) {
        authUser = authResult.user;
      }
    }

    // Lấy thông tin phòng hiện tại trong database
    const [roomRows] = await pool.query(
      `SELECT r.RoomId, r.BranchId, r.RoomNumber, r.Floor, r.Status AS RawStatus, r.UpdatedAt,
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
        code: 'ROOMMAP_0004_NOT_FOUND',
        message: `Phòng #${rawId} không tồn tại trong hệ thống`
      });
    }

    const room = roomRows[0];
    const dbCurrentStatus = deriveSpecStatus(room);
    const currentVer = getRoomVersion(rawId);

    // Concurrency check: Optimistic Locking via expectedVersion (Spec 13 Section 3.4 & 4.3)
    if (expectedVersion !== undefined && expectedVersion !== null) {
      const expVerNum = Number(expectedVersion);
      if (!isNaN(expVerNum) && expVerNum !== currentVer) {
        return res.status(409).json({
          success: false,
          code: 'ROOMMAP_0006_VERSION_CONFLICT',
          message: 'Trạng thái phòng đã thay đổi trên máy chủ (Xung đột phiên bản). Vui lòng đồng bộ lại.',
          currentVersion: currentVer,
          currentStatus: dbCurrentStatus
        });
      }
    }

    // Legacy concurrency check with currentStatus
    if (currentStatus) {
      const normInputCurrent = normalizeStatus(currentStatus);
      const normDbCurrent = normalizeStatus(dbCurrentStatus);
      if (normInputCurrent !== normDbCurrent) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0020_CONCURRENT_UPDATE',
          message: 'Trạng thái phòng vừa được cập nhật bởi người khác, vui lòng tải lại',
          currentStatus: dbCurrentStatus
        });
      }
    }

    // ── Xử lý Check-out ──
    if (action === 'checkout') {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      if (room.StayId) {
        await connection.query('UPDATE Stays SET Status = "Completed", ActualCheckOut = NOW(), UpdatedAt = NOW() WHERE StayId = ?', [room.StayId]);
      }
      if (room.BookingId) {
        await connection.query('UPDATE Bookings SET Status = "CheckedOut", UpdatedAt = NOW() WHERE BookingId = ?', [room.BookingId]);
      }
      await connection.query('UPDATE Rooms SET Status = "DirtyVacant", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);

      // Insert RoomStatusHistory
      await connection.query(
        `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
         VALUES (?, ?, ?, 'CHECKOUT', NOW(), ?, ?)`,
        [rawId, dbCurrentStatus, 'DIRTY', authUser.userId || 1, note || 'Lễ tân trả phòng']
      );

      // Insert AuditLogs
      await connection.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
        [authUser.userId || 1, rawId, JSON.stringify({ status: dbCurrentStatus }), JSON.stringify({ status: 'DIRTY', action: 'checkout' }), req.ip || '127.0.0.1']
      );

      await connection.commit();

      // Realtime WebSocket broadcast
      const broadcastRes = broadcastRoomStatusChange({
        roomId: rawId,
        roomNumber: room.RoomNumber,
        floor: room.Floor,
        propertyId: room.BranchId || 1,
        previousStatus: dbCurrentStatus,
        currentStatus: 'DIRTY',
        changedBy: {
          userId: authUser.userId || 1,
          displayName: authUser.FullName || authUser.username || 'Lễ tân',
          role: authUser.roleName || 'Receptionist'
        },
        correlationId: correlationId || `cor_checkout_${rawId}_${Date.now()}`,
        note: note || 'Trả phòng'
      });

      notifyRoomUpdate(req, broadcastRes.payload);

      return res.json({
        success: true,
        code: 'SUCCESS_0002_UPDATED',
        message: 'Hoàn tất thủ tục trả phòng thành công. Phòng đã chuyển sang Chưa dọn.',
        data: { roomId: rawId, status: 'DIRTY', version: broadcastRes.payload.version }
      });
    }

    // ── Xử lý Check-in ──
    if (action === 'checkin') {
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

      // Insert RoomStatusHistory
      await connection.query(
        `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
         VALUES (?, ?, ?, 'CHECKIN', NOW(), ?, ?)`,
        [rawId, dbCurrentStatus, 'OCCUPIED', authUser.userId || 1, note || 'Lễ tân nhận phòng']
      );

      // Insert AuditLogs
      await connection.query(
        `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
         VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
        [authUser.userId || 1, rawId, JSON.stringify({ status: dbCurrentStatus }), JSON.stringify({ status: 'OCCUPIED', action: 'checkin' }), req.ip || '127.0.0.1']
      );

      await connection.commit();

      const broadcastRes = broadcastRoomStatusChange({
        roomId: rawId,
        roomNumber: room.RoomNumber,
        floor: room.Floor,
        propertyId: room.BranchId || 1,
        previousStatus: dbCurrentStatus,
        currentStatus: 'OCCUPIED',
        changedBy: {
          userId: authUser.userId || 1,
          displayName: authUser.FullName || authUser.username || 'Lễ tân',
          role: authUser.roleName || 'Receptionist'
        },
        correlationId: correlationId || `cor_checkin_${rawId}_${Date.now()}`,
        note: note || 'Nhận phòng'
      });

      notifyRoomUpdate(req, broadcastRes.payload);

      return res.json({
        success: true,
        code: 'SUCCESS_0002_UPDATED',
        message: 'Làm thủ tục nhận phòng thành công. Phòng đã chuyển sang Đang ở.',
        data: { roomId: rawId, status: 'OCCUPIED', version: broadcastRes.payload.version }
      });
    }

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        code: 'ROOMMAP_0003_INVALID_STATUS',
        message: 'Trạng thái mới (status / newStatus) không được để trống'
      });
    }

    const normNewStatus = normalizeStatus(targetStatus);
    const normDbCurrentStatus = normalizeStatus(dbCurrentStatus);

    // Validate status transition
    const allowed = ALLOWED_TRANSITIONS[normDbCurrentStatus] || ALLOWED_TRANSITIONS[dbCurrentStatus] || [];
    if (!allowed.includes(normNewStatus) && !allowed.includes(targetStatus)) {
      const oldLabel = STATUS_LABELS[normDbCurrentStatus] || normDbCurrentStatus;
      const newLabel = STATUS_LABELS[normNewStatus] || normNewStatus;
      return res.status(400).json({
        success: false,
        code: 'ERROR_0019_INVALID_STATUS_TRANSITION',
        message: `Không thể chuyển trạng thái phòng từ ${oldLabel} sang ${newLabel}`
      });
    }

    // Note requirement for OUT_OF_ORDER
    if (normNewStatus === 'OUT_OF_ORDER' && (!note || !String(note).trim())) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng nhập lý do bảo trì'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const nextDbStatus = toDbRoomStatus(normNewStatus);

    await connection.query(
      'UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?',
      [nextDbStatus, rawId]
    );

    // Housekeeping tasks
    if (normNewStatus === 'CLEANING') {
      await connection.query(
        `INSERT INTO HousekeepingAssignments (RoomId, UserId, Status, StartedAt, Note, AssignmentDate, Priority)
         VALUES (?, ?, 'InProgress', NOW(), ?, CURDATE(), 2)`,
        [rawId, authUser.userId || 1, note || 'Bắt đầu dọn phòng qua Sơ đồ phòng']
      );
    } else if (normNewStatus === 'AVAILABLE' || normNewStatus === 'INSPECTION') {
      await connection.query(
        `UPDATE HousekeepingAssignments 
         SET Status = 'Completed', CompletedAt = NOW() 
         WHERE RoomId = ? AND Status = 'InProgress'`,
        [rawId]
      );
    }

    // Insert into RoomStatusHistory (Spec 13 section 3.8)
    await connection.query(
      `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
       VALUES (?, ?, ?, 'STATUS_UPDATE', NOW(), ?, ?)`,
      [rawId, normDbCurrentStatus, normNewStatus, authUser.userId || 1, note || null]
    );

    // Insert into AuditLogs
    await connection.query(
      `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
       VALUES (?, 'ROOM_STATUS_CHANGE', 'Rooms', ?, ?, ?, NOW(), ?)`,
      [
        authUser.userId || 1,
        rawId,
        JSON.stringify({ status: normDbCurrentStatus, label: STATUS_LABELS[normDbCurrentStatus] }),
        JSON.stringify({ status: normNewStatus, label: STATUS_LABELS[normNewStatus], note: note || null }),
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();

    // Broadcast Spec 13 Realtime WebSocket frame
    const broadcastRes = broadcastRoomStatusChange({
      roomId: rawId,
      roomNumber: room.RoomNumber,
      floor: room.Floor,
      propertyId: room.BranchId || 1,
      previousStatus: normDbCurrentStatus,
      currentStatus: normNewStatus,
      changedBy: {
        userId: authUser.userId || 1,
        displayName: authUser.FullName || authUser.username || 'Nhân viên',
        role: authUser.roleName || 'Staff'
      },
      correlationId: correlationId || `cor_status_${rawId}_${Date.now()}`,
      note: note || null
    });

    notifyRoomUpdate(req, broadcastRes.payload);

    return res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật trạng thái phòng thành công',
      data: {
        roomId: rawId,
        roomNumber: room.RoomNumber,
        status: normNewStatus,
        version: broadcastRes.payload.version,
        sequence: broadcastRes.sequence
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
router.put('/rooms/:roomId/status', handleStatusChange);
router.post('/rooms/:roomId/status', handleStatusChange);
router.patch('/:id/status', handleStatusChange);
router.put('/:id/status', handleStatusChange);
router.post('/:id/status', handleStatusChange);
router.post('/:id/action', handleStatusChange);

module.exports = router;
