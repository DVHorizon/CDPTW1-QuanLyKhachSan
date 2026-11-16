'use strict';

/**
 * modules/payments/index.js
 * 👤 OWNER: Hà — Core Payment Module (FEAT-PAYMENT-01 / C5)
 * Mount tại: /api/v1/payments và alias /payments
 */

const express = require('express');
const router = express.Router();

router.use('/', require('./routes/paymentRoutes'));

router.get('/ping', (req, res) =>
  res.json({ module: 'payments', owner: 'Hà', status: 'ready', mode: process.env.PAYMENT_GATEWAY_MODE || 'mock' })
);

module.exports = router;
