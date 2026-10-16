'use strict';

const express = require('express');
const router = express.Router();
const tableReservationController = require('../../controllers/admin/tableReservationController');
const { verifyToken, optionalVerifyToken } = require('../../middlewares/authMiddleware');

// 1. Sơ đồ / danh sách bàn trống theo khung giờ
router.get('/available-tables', optionalVerifyToken, tableReservationController.getAvailableTables);

// 2. Tạo lượt đặt bàn trước tại nhà hàng (FEAT-FNB-09: A4.9)
router.post('/', optionalVerifyToken, tableReservationController.createReservation);

// 3. Danh sách lượt đặt bàn
router.get('/', optionalVerifyToken, tableReservationController.getReservations);

// 4. Nhân viên check-in bàn khi khách đến
router.patch('/:reservationId/check-in', verifyToken, tableReservationController.checkInReservation);

// 5. Cập nhật No-Show / Hủy lượt đặt bàn
router.patch('/:reservationId/no-show', verifyToken, tableReservationController.noShowReservation);

module.exports = router;
