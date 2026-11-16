'use strict';

/**
 * backend/src/modules/statistics/routes/statisticsRoutes.js
 * 👤 OWNER: Hà — Milestone 4 (C11 & C12)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../../middlewares/authMiddleware');
const statisticsController = require('../controllers/statisticsController');

// C11: Real-time Revenue Dashboard & WebSocket Info
router.get('/revenue', verifyToken, statisticsController.getRevenueDashboard);
router.get('/dashboard/ws-info', verifyToken, statisticsController.getDashboardWsInfo);

// C12: Occupancy & RevPAR Analytics + Excel/CSV Export
router.get('/occupancy', verifyToken, statisticsController.getOccupancyReport);
router.get('/occupancy/export', verifyToken, statisticsController.exportOccupancyReport);

module.exports = router;
