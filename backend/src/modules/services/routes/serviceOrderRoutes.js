'use strict';

const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const { verifyToken } = require('../../../middlewares/authMiddleware');

// ─── ENDPOINTS ĐẶT DỊCH VỤ (FEAT-SERVICE-03) ──────────────────────────────────
// Tất cả đều yêu cầu đăng nhập (401 ERROR_0009_UNAUTHENTICATED nếu thiếu token)
router.post('/', verifyToken, serviceOrderController.createServiceOrder);
router.get('/', verifyToken, serviceOrderController.getServiceOrders);
router.get('/active-stays', verifyToken, serviceOrderController.getActiveStays);
router.get('/my-stay', verifyToken, serviceOrderController.getMyActiveStay);

module.exports = router;
