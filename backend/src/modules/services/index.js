'use strict';
/**
 * modules/services/index.js
 * 👤 OWNER: Hà — Dịch vụ / Payment / AI Chatbot
 * Mount tại: /api/v1/services
 */
const express = require('express');
const router = express.Router();
// router.use('/categories',   require('./routes/spaRoutes'));
// router.use('/payment',      require('./routes/paymentRoutes'));
// router.use('/invoices',     require('./routes/invoiceRoutes'));
// router.use('/vouchers',     require('./routes/voucherRoutes'));
// router.use('/chatbot',      require('./routes/chatbotRoutes'));
// router.use('/dashboard',    require('./routes/dashboardRoutes'));
router.get('/ping', (req, res) => res.json({ module: 'services', owner: 'Hà', status: 'ready' }));
module.exports = router;
