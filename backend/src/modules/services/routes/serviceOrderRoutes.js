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

module.exports = router;
