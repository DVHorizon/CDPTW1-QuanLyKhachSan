'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// API REAL-TIME ROOM AVAILABILITY & FRONT DESK OPERATIONS
// Endpoint: /api/admin/room-availability
// Đồng bộ trực tiếp CSDL MySQL (Rooms, RoomTypes, Stays, Bookings, Users)
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Helper chuẩn hoá đối tượng ngày sang chuỗi YYYY-MM-DD
const toDateStr = (val, fallback = null) => {
  if (!val) return fallback;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  const dt = new Date(val);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return fallback;
};

// Helper broadcast WebSocket
const emitAvailabilityChange = (req, payload = {}) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('availability:changed', payload);
    }
  } catch (err) {
    console.warn('Lỗi emit WebSocket availability:changed:', err.message);
  }
};

// ─── 1. GET /api/admin/room-availability ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let { checkIn, checkOut } = req.query;

    // Tự động gán ngày hôm nay và ngày mai nếu để trống
    const now = new Date();
    const todayStr = toDateStr(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);

    if (!checkIn || !String(checkIn).trim()) checkIn = todayStr;
    if (!checkOut || !String(checkOut).trim()) checkOut = tomorrowStr;

    const inD = new Date(checkIn);
    const outD = new Date(checkOut);

    // Bắt lỗi định dạng ngày
    if (isNaN(inD.getTime()) || isNaN(outD.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Khoảng thời gian không hợp lệ. Định dạng yêu cầu: YYYY-MM-DD'
      });
    }

    if (outD <= inD) {
      return res.status(400).json({
        success: false,
        message: 'Ngày trả phòng (checkOut) phải sau ngày nhận phòng (checkIn)'
      });
    }

    // Truy vấn dữ liệu thực tế từ MySQL: Kết hợp Rooms, RoomTypes, Stays, Bookings, Users
    const query = `
      SELECT 
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        r.Status AS RawStatus,
        r.Description,
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
        b.TotalAmount,
        b.DepositAmount,
        u.FullName AS GuestName
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON r.RoomId = s.RoomId AND s.Status IN ('CheckedIn', 'Active')
      LEFT JOIN Bookings b ON s.BookingId = b.BookingId
      LEFT JOIN Users u ON b.UserId = u.UserId
      WHERE r.IsDeleted = 0
      ORDER BY r.Floor ASC, r.RoomNumber ASC
    `;

    const [rows] = await pool.query(query);

    // Chuẩn hoá dữ liệu trả về cho frontend RoomAvailability.jsx
    const roomsMap = new Map();

    for (const r of rows) {
      if (roomsMap.has(r.RoomId)) continue; // tránh lặp nếu có nhiều dòng join

      // Xác định Wing: từ Description "KHU-A", hoặc chữ cái trong số phòng, hoặc chẵn/lẻ
      let wingVal = 'A';
      if (r.Description && r.Description.startsWith('KHU-')) {
        wingVal = r.Description.replace('KHU-', '').trim()[0] || 'A';
      } else if (String(r.RoomNumber).includes('A')) {
        wingVal = 'A';
      } else if (String(r.RoomNumber).includes('B')) {
        wingVal = 'B';
      } else {
        const num = parseInt(String(r.RoomNumber).replace(/\D/g, ''), 10);
        wingVal = (num % 2 === 0) ? 'B' : 'A';
      }

      // Map RawStatus từ database sang trạng thái chuẩn của frontend
      // 'available' | 'dirty' | 'ooo'
      let statusVal = 'available';
      if (r.RawStatus === 'OutOfOrder') {
        statusVal = 'ooo';
      } else if (r.RawStatus === 'DirtyVacant' || r.RawStatus === 'DirtyOccupied' || r.RawStatus === 'Dirty') {
        statusVal = 'dirty';
      } else {
        statusVal = 'available';
      }

      // Xác định booking nếu có
      let bookingObj = null;
      if (r.StayId || r.BookingId) {
        const inDate = toDateStr(r.CheckInDate) || toDateStr(r.ActualCheckIn) || checkIn;
        const outDate = toDateStr(r.CheckOutDate) || toDateStr(r.ExpectedCheckOut) || checkOut;
        const isCheckedIn = (r.StayStatus === 'CheckedIn' || r.StayStatus === 'Active' || r.BookingStatus === 'CheckedIn');

        bookingObj = {
          id: r.BookingId ? `BK-${r.BookingId}` : `ST-${r.StayId}`,
          guestName: r.GuestName || 'Khách Lưu Trú',
          confirmationNo: r.ConfirmationCode || `CONF-${r.BookingId || r.StayId}`,
          checkIn: inDate,
          checkOut: outDate,
          status: isCheckedIn ? 'checked_in' : 'confirmed',
          balance: Math.max(0, Number(r.TotalAmount || 0) - Number(r.DepositAmount || 0)),
          keys: isCheckedIn ? 2 : 0
        };
      }

      roomsMap.set(r.RoomId, {
        id: r.RoomId,
        roomNumber: String(r.RoomNumber),
        floor: Number(r.Floor) || 1,
        wing: wingVal,
        status: statusVal,
        typeName: r.TypeName,
        view: r.Description || 'Hướng Vườn & Biển',
        booking: bookingObj
      });
    }

    const rooms = Array.from(roomsMap.values());

    res.json({
      success: true,
      checkIn,
      checkOut,
      totalRooms: rooms.length,
      rooms
    });
  } catch (err) {
    console.error('Lỗi GET /api/admin/room-availability:', err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy sơ đồ phòng: ' + err.message
    });
  }
});

// ─── 2. POST /api/admin/room-availability/:id/action (Thao tác phòng) ────────
router.post('/:id/action', async (req, res) => {
  try {
    const rawId = parseInt(String(req.params.id).replace(/\D/g, ''), 10);
    const { action } = req.body;

    // Bắt lỗi để trống
    if (!action || !String(action).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Hành động không được để trống (action: clean | key | checkout | ooo | available)'
      });
    }

    if (!rawId) {
      return res.status(400).json({
        success: false,
        message: 'Mã phòng không hợp lệ'
      });
    }

    // Kiểm tra phòng có tồn tại không
    const [roomRows] = await pool.query('SELECT RoomId, RoomNumber, Status FROM Rooms WHERE RoomId = ? AND IsDeleted = 0', [rawId]);
    if (roomRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Phòng mã #${rawId} không tồn tại trong hệ thống!`
      });
    }

    const room = roomRows[0];

    // Xử lý từng hành động
    if (action === 'clean') {
      // Dọn phòng: từ Dirty -> Clean
      if (room.Status !== 'DirtyVacant' && room.Status !== 'DirtyOccupied' && room.Status !== 'Dirty') {
        return res.status(400).json({
          success: false,
          message: `Phòng ${room.RoomNumber} hiện không ở trạng thái bẩn chờ dọn (Trạng thái hiện tại: ${room.Status})`
        });
      }

      const [stayCheck] = await pool.query('SELECT StayId FROM Stays WHERE RoomId = ? AND Status IN ("Active", "CheckedIn") LIMIT 1', [rawId]);
      const nextStatus = stayCheck.length > 0 ? 'Occupied' : 'CleanAvailable';
      await pool.query('UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?', [nextStatus, rawId]);

      emitAvailabilityChange(req, { roomId: rawId, action: 'clean', status: nextStatus });
      return res.json({
        success: true,
        message: `Đã hoàn tất dọn phòng ${room.RoomNumber} và cập nhật sang trạng thái sạch sẽ!`,
        data: { roomId: rawId, status: nextStatus }
      });
    }

    if (action === 'checkout') {
      // Trả phòng: kiểm tra có Stay CheckedIn không
      const [stayRows] = await pool.query('SELECT StayId, BookingId FROM Stays WHERE RoomId = ? AND Status IN ("Active", "CheckedIn") LIMIT 1', [rawId]);
      if (stayRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Phòng ${room.RoomNumber} hiện không có khách đang lưu trú để làm thủ tục trả phòng.`
        });
      }

      const stay = stayRows[0];
      // Hoàn tất Stay
      await pool.query('UPDATE Stays SET Status = "CheckedOut", ActualCheckOut = NOW(), UpdatedAt = NOW() WHERE StayId = ?', [stay.StayId]);
      // Cập nhật Booking
      if (stay.BookingId) {
        await pool.query('UPDATE Bookings SET Status = "CheckedOut", UpdatedAt = NOW() WHERE BookingId = ?', [stay.BookingId]);
      }
      // Chuyển phòng thành Bẩn chờ dọn (Dirty)
      await pool.query('UPDATE Rooms SET Status = "Dirty", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);

      emitAvailabilityChange(req, { roomId: rawId, action: 'checkout', status: 'Dirty' });
      return res.json({
        success: true,
        message: `Đã hoàn tất thanh toán & trả phòng cho phòng ${room.RoomNumber}. Phòng đã chuyển sang trạng thái bẩn chờ dọn!`,
        data: { roomId: rawId, status: 'Dirty' }
      });
    }

    if (action === 'key') {
      // Cấp thêm thẻ từ: kiểm tra có khách không
      const [stayRows] = await pool.query('SELECT StayId FROM Stays WHERE RoomId = ? AND Status IN ("Active", "CheckedIn") LIMIT 1', [rawId]);
      if (stayRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Phòng ${room.RoomNumber} chưa có khách lưu trú để tạo thẻ khóa RFID E-Key.`
        });
      }

      emitAvailabilityChange(req, { roomId: rawId, action: 'key' });
      return res.json({
        success: true,
        message: `Đã kích hoạt cấp thêm thẻ từ điện tử (RFID E-Key) cho phòng ${room.RoomNumber} thành công!`,
        data: { roomId: rawId }
      });
    }

    if (action === 'ooo') {
      // Khóa kỹ thuật bảo trì OOO
      const [stayRows] = await pool.query('SELECT StayId FROM Stays WHERE RoomId = ? AND Status IN ("Active", "CheckedIn") LIMIT 1', [rawId]);
      if (stayRows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể khóa phòng ${room.RoomNumber} vì hiện đang có khách lưu trú!`
        });
      }

      await pool.query('UPDATE Rooms SET Status = "OutOfOrder", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);
      emitAvailabilityChange(req, { roomId: rawId, action: 'ooo', status: 'OutOfOrder' });
      return res.json({
        success: true,
        message: `Đã khóa phòng ${room.RoomNumber} vào diện kỹ thuật bảo trì (Out Of Order)!`,
        data: { roomId: rawId, status: 'OutOfOrder' }
      });
    }

    if (action === 'available') {
      // Mở khóa OOO -> CleanAvailable
      await pool.query('UPDATE Rooms SET Status = "CleanAvailable", UpdatedAt = NOW() WHERE RoomId = ?', [rawId]);
      emitAvailabilityChange(req, { roomId: rawId, action: 'available', status: 'CleanAvailable' });
      return res.json({
        success: true,
        message: `Đã mở khóa phòng ${room.RoomNumber} và chuyển sang trạng thái sẵn sàng đón khách!`,
        data: { roomId: rawId, status: 'CleanAvailable' }
      });
    }

    return res.status(400).json({
      success: false,
      message: `Hành động "${action}" không được hỗ trợ.`
    });
  } catch (err) {
    console.error('Lỗi POST /api/admin/room-availability/:id/action:', err.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý tác vụ phòng: ' + err.message
    });
  }
});

module.exports = router;