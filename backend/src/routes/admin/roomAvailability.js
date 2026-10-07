// GET /api/admin/room-availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Trả về toàn bộ phòng + booking trùng khoảng ngày để frontend tự lọc theo tầng.
const express = require('express');
const { Op } = require('sequelize');
// ĐIỀU CHỈNH theo models của bạn: Room(id, roomNumber, floor, wing, status, view), RoomType(name),
// Booking(roomId, guestName, confirmationNo, checkIn, checkOut, status)
const { Room, RoomType, Booking } = require('../../models');

const router = express.Router();
const ACTIVE = ['pending', 'confirmed', 'checked_in'];

router.get('/', async (req, res) => {
    const { checkIn, checkOut } = req.query;
    const inD = new Date(checkIn);
    const outD = new Date(checkOut);

    if (!checkIn || !checkOut || isNaN(inD) || isNaN(outD)) {
        return res.status(400).json({ message: 'Vui lòng chọn khoảng ngày hợp lệ.' });
    }
    if (outD <= inD) {
        return res.status(400).json({ message: 'Ngày trả phòng phải sau ngày nhận phòng.' });
    }

    try {
        const rooms = await Room.findAll({
            include: [{ model: RoomType }], // thêm "as" nếu association của bạn có alias
            order: [['floor', 'ASC'], ['roomNumber', 'ASC']],
        });

        // Điều kiện trùng lịch: booking.checkIn < checkOut yêu cầu VÀ booking.checkOut > checkIn yêu cầu
        const bookings = await Booking.findAll({
            where: {
                status: { [Op.in]: ACTIVE },
                checkIn: { [Op.lt]: outD },
                checkOut: { [Op.gt]: inD },
            },
        });
        const byRoom = new Map(bookings.map((b) => [b.roomId, b]));

        const data = rooms.map((r) => {
            const b = byRoom.get(r.id);
            return {
                id: r.id,
                roomNumber: r.roomNumber,
                floor: r.floor,
                wing: r.wing || 'A',
                status: r.status, // 'available' | 'dirty' | 'ooo'
                typeName: (r.RoomType || r.roomType || {}).name || '',
                view: r.view || '',
                booking: b
                    ? {
                        id: b.id,
                        guestName: b.guestName,
                        confirmationNo: b.confirmationNo,
                        checkIn: b.checkIn,
                        checkOut: b.checkOut,
                        status: b.status,
                    }
                    : null,
            };
        });

        res.json({ checkIn, checkOut, rooms: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Không thể tải dữ liệu phòng. Vui lòng thử lại.' });
    }
});

// Gọi hàm này sau mỗi lần tạo/sửa/hủy booking, check-in/out, đổi trạng thái phòng
// để mọi client đang mở trang tự cập nhật.
router.notifyChanged = (io, payload = {}) => io.emit('availability:changed', payload);

module.exports = router;

/* ĐĂNG KÝ trong server.js:
   const roomAvailability = require('./routes/admin/roomAvailability');
   app.use('/api/admin/room-availability', authMiddleware, roomAvailability);
   app.set('roomAvailability', roomAvailability);

   Ví dụ dùng trong bookingController sau khi lưu thành công:
   req.app.get('roomAvailability').notifyChanged(req.app.get('io'), { roomId });
*/