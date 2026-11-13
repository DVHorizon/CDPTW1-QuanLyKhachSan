'use strict';

const express = require('express');
const router = express.Router();
const banquetController = require('../controllers/banquetEventController');

// ─── BANQUET & MICE EVENT BOOKING ROUTES (PHÂN HỆ 53) ──────────────────────

// 1. Lấy danh sách sự kiện, thống kê & sảnh tiệc
router.get('/', banquetController.getAllEvents);

// 2. Lấy thống kê KPI
router.get('/stats', banquetController.getAllEvents);

// 3. Danh mục sảnh tiệc & kiểm tra công suất
router.get('/venues', banquetController.getHalls);
router.get('/halls', banquetController.getHalls);

// 4. Lấy chi tiết hồ sơ BEO theo ID / Mã BEO
router.get('/:id', banquetController.getEventById);

// 5. Lập hợp đồng sự kiện & BEO mới (có kiểm tra trùng lịch sảnh)
router.post('/', banquetController.createEventBooking);

// 6. Ghi nhận thanh toán đặt cọc theo từng giai đoạn hợp đồng
router.post('/:id/deposits', banquetController.recordDepositPayment);

// 7. Phát lệnh điều phối khẩn đến các bộ phận (AV, Kỹ thuật, Bếp, Buồng phòng)
router.post('/:id/dispatch', banquetController.sendDispatchNotification);

// 8. Kết xuất hồ sơ Banquet Event Order (BEO) đầy đủ cho 5 khối vận hành
router.get('/:id/beo-export', banquetController.exportBEODocument);

module.exports = router;
