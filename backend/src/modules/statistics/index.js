'use strict';

/**
 * backend/src/modules/statistics/index.js
 * 👤 OWNER: Hà — Statistics & Analytics Module (C11 & C12)
 * Mount tại: /api/v1/statistics, /api/statistics, /statistics
 */

const express = require('express');
const router = express.Router();

router.use('/', require('./routes/statisticsRoutes'));

router.get('/ping', (req, res) =>
  res.json({ module: 'statistics', owner: 'Hà', status: 'ready' })
);

module.exports = router;
