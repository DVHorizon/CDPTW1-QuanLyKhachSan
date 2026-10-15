'use strict';
/**
 * modules/operations/index.js
 * 👤 OWNER: Tuyền — Back-office Operations
 * Mount tại: /api/v1/operations
 */
const express = require('express');
const router = express.Router();
// router.use('/loyalty',       require('./routes/loyaltyRoutes'));
// router.use('/inventory',     require('./routes/inventoryRoutes'));
// router.use('/maintenance',   require('./routes/maintenanceRoutes'));
// router.use('/night-audit',   require('./routes/nightAuditRoutes'));
// router.use('/audit-logs',    require('./routes/auditRoutes'));
// router.use('/ota-channels',  require('./routes/otaRoutes'));
// router.use('/roster',        require('./routes/rosterRoutes'));
// Dùng lại auditLog route hiện có
router.use('/audit-logs', require('../../routes/auditLogRoutes'));
router.get('/ping', (req, res) => res.json({ module: 'operations', owner: 'Tuyền', status: 'ready' }));
module.exports = router;
