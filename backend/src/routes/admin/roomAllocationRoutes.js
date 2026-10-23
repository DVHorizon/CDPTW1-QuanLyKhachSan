'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { requirePermissions, optionalVerifyToken } = require('../../middlewares/authMiddleware');
const ctrl = require('../../controllers/admin/roomAllocationController');

// ─── GET /api/v1/allocation/bookings ────────────────────────────────────────
// Danh sách các booking cần gán phòng
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
        b.RoomQuantity,
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
        alloc.RoomId AS AssignedRoomId,
        alloc.AssignedRoomNumber,
        alloc.Floor AS AssignedFloor,
        alloc.StayId,
        alloc.StayStatus
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN MembershipTiers mt ON u.TierId = mt.TierId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN (
        SELECT
          bk.BookingId,
          MIN(COALESCE(bra.RoomId, s.RoomId)) AS RoomId,
          GROUP_CONCAT(DISTINCT r.RoomNumber ORDER BY r.RoomNumber SEPARATOR ', ') AS AssignedRoomNumber,
          MIN(r.Floor) AS Floor,
          MIN(s.StayId) AS StayId,
          MIN(s.Status) AS StayStatus
        FROM Bookings bk
        LEFT JOIN BookingRoomAllocations bra ON bk.BookingId = bra.BookingId
        LEFT JOIN Stays s ON bk.BookingId = s.BookingId
        LEFT JOIN Rooms r ON COALESCE(bra.RoomId, s.RoomId) = r.RoomId
        GROUP BY bk.BookingId
      ) alloc ON b.BookingId = alloc.BookingId
      WHERE b.Status NOT IN ('Cancelled', 'Completed', 'NoShow')
      ORDER BY
        (alloc.RoomId IS NULL) DESC,
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

// ─── GET /api/v1/allocation/booking/:id — Chi tiết hồ sơ Booking ─────────────
router.get('/booking/:id', ctrl.getBookingDetail);
router.get('/bookings/:id', ctrl.getBookingDetail);

// ─── GET /api/v1/allocation/rooms/available & recommended-rooms ─────────────
router.get('/rooms/available', ctrl.getAvailableRooms);
router.get('/recommended-rooms', ctrl.getAvailableRooms);

// ─── PUT & POST /api/v1/allocation/booking/:id/confirm — Xác nhận Booking ───
router.put('/booking/:id/confirm', requirePermissions('BOOKING_CONFIRM'), ctrl.confirmBooking);
router.post('/booking/:id/confirm', requirePermissions('BOOKING_CONFIRM'), ctrl.confirmBooking);

// ─── POST /api/v1/allocation/booking/:id/room-allocation — Gán phòng ────────
router.post('/booking/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), ctrl.allocateRooms);
router.post('/bookings/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), ctrl.allocateRooms);

// ─── POST /api/v1/allocation/booking/:id/confirm-and-allocate ───────────────
router.post(
  '/booking/:id/confirm-and-allocate',
  requirePermissions(['BOOKING_CONFIRM', 'ROOM_ALLOCATION']),
  ctrl.confirmAndAllocate
);
router.post(
  '/bookings/:id/confirm-and-allocate',
  requirePermissions(['BOOKING_CONFIRM', 'ROOM_ALLOCATION']),
  ctrl.confirmAndAllocate
);

// ─── DELETE /api/v1/allocation/booking/:id/room-allocation — Hủy gán phòng ──
router.delete('/booking/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), ctrl.deallocateRooms);
router.delete('/bookings/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), ctrl.deallocateRooms);

// ─── POST /api/v1/allocation/hold & release-hold ────────────────────────────
router.post('/hold', ctrl.holdRoom);
router.post('/release-hold', ctrl.releaseHold);

// ─── POST /api/v1/allocation/confirm — Tương thích giao diện cũ ─────────────
router.post('/confirm', requirePermissions('ROOM_ALLOCATION'), async (req, res) => {
  const { bookingId, roomId, roomIds, quantity, allocationNote } = req.body;
  req.params.id = bookingId;
  req.body.quantity = quantity || (roomIds ? roomIds.length : (roomId ? 1 : 1));
  req.body.roomIds = roomIds || (roomId ? [roomId] : []);
  req.body.allocationNote = allocationNote || '';
  return ctrl.allocateRooms(req, res);
});

// ─── GET /api/v1/allocation/floor-schematic ─────────────────────────────────
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
      const lock = ctrl.activeRoomLocks.get(r.RoomId);
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

// ─── GET /api/v1/allocation/check-sync/:id ──────────────────────────────────
router.get('/check-sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
         b.BookingId,
         b.Status,
         CAST(b.UpdatedAt AS CHAR) AS UpdatedAt,
         bra.RoomId,
         r.RoomNumber
       FROM Bookings b
       LEFT JOIN BookingRoomAllocations bra ON b.BookingId = bra.BookingId
       LEFT JOIN Rooms r ON bra.RoomId = r.RoomId
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

module.exports = router;
