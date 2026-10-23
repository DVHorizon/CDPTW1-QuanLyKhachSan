'use strict';

const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const { verifyToken, optionalVerifyToken } = require('../../../middlewares/authMiddleware');

// ─── ENDPOINTS ĐẶT DỊCH VỤ (FEAT-SERVICE-03) ──────────────────────────────────
router.post('/', verifyToken, serviceOrderController.createServiceOrder);
router.get('/', optionalVerifyToken, serviceOrderController.getServiceOrders);
router.get('/active-stays', optionalVerifyToken, serviceOrderController.getActiveStays);
router.get('/my-stay', verifyToken, serviceOrderController.getMyActiveStay);

// ─── ENDPOINTS QUẢN LÝ TIẾN ĐỘ ĐƠN DỊCH VỤ (FEAT-SERVICE-04) ──────────────────
router.patch('/:orderId/status', verifyToken, serviceOrderController.updateServiceOrderStatus);

module.exports = router;
