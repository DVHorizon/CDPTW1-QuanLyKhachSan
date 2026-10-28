'use strict';

/**
 * modules/payments/routes/paymentRoutes.js
 * Routing cho Core Payment Module (FEAT-PAYMENT-01 / C5)
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, optionalVerifyToken } = require('../../../middlewares/authMiddleware');

// 1. Tạo yêu cầu thanh toán (POST /api/v1/payments)
router.post('/', verifyToken, paymentController.createPayment);

// Health check ping
router.get('/ping', (req, res) =>
  res.json({ success: true, module: 'payments', owner: 'Hà', status: 'ready' })
);

// 2. Tra cứu trạng thái giao dịch (GET /api/v1/payments/:paymentId)
router.get('/:paymentId', optionalVerifyToken, paymentController.getPaymentStatus);

// 3. Webhook nhận callback từ Gateway (POST /api/v1/payments/webhook/:method)
router.post('/webhook/:method', paymentController.handleWebhook);

// 4. Hoàn tiền giao dịch (PATCH /api/v1/payments/:paymentId/refund)
router.patch('/:paymentId/refund', verifyToken, paymentController.refundPayment);

module.exports = router;
