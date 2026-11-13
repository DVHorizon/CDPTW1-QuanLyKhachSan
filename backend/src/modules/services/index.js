'use strict';
/**
 * modules/services/index.js
 * 👤 OWNER: Hà — Dịch vụ / Payment / AI Chatbot
 * Mount tại: /api/v1/services
 */
const express = require('express');
const router = express.Router();

// Routes quản lý đơn đặt dịch vụ (FEAT-SERVICE-03)
router.use('/orders',         require('./routes/serviceOrderRoutes'));
router.use('/service-orders', require('./routes/serviceOrderRoutes'));

// Routes quản lý danh mục dịch vụ & bảng giá
router.use('/items', require('./routes/serviceRoutes'));
router.use('/',      require('./routes/serviceRoutes'));

router.get('/ping', (req, res) => res.json({ module: 'services', owner: 'Hà', status: 'ready' }));

module.exports = router;
