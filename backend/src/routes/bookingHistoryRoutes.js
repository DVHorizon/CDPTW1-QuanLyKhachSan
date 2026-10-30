'use strict';

/**
 * routes/bookingHistoryRoutes.js
 * 
 * TÍNH NĂNG 9: XEM LỊCH SỬ ĐẶT PHÒNG & HỦY ĐẶT PHÒNG THEO QUY ĐỊNH (BOOKING HISTORY & CANCELLATION MANAGEMENT)
 * Mã tính năng: FEAT-GUEST-09 (Mã truy vết: A9)
 * 
 * Định tuyến:
 * - GET   /api/v1/me/bookings                -> Xem danh sách lịch sử đặt phòng cá nhân
 * - GET   /api/v1/me/bookings/:bookingId     -> Xem chi tiết một đơn đặt phòng
 * - PATCH /api/v1/me/bookings/:bookingId/cancel -> Hủy đặt phòng theo chính sách hoàn cọc
 */

const express = require('express');
const router = express.Router();
const bookingHistoryController = require('../controllers/bookingHistoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Middleware hỗ trợ cả JWT auth chính thống và kiểm thử linh hoạt
router.get('/bookings', verifyToken, bookingHistoryController.getMyBookings);
router.get('/bookings/:bookingId', verifyToken, bookingHistoryController.getMyBookingDetail);
router.patch('/bookings/:bookingId/cancel', verifyToken, bookingHistoryController.cancelMyBooking);

module.exports = router;
