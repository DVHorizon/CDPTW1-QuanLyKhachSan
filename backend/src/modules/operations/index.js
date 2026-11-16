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
router.use('/night-audit',   require('../../routes/nightAuditRoutes'));
router.use('/transportation', require('../../routes/transportationRoutes'));
router.use('/police-declaration', require('../../routes/policeDeclarationRoutes'));
router.use('/channel-manager', require('../../routes/channelManagerRoutes'));
router.use('/audit-logs', require('../../routes/auditLogRoutes'));
router.use('/roster', require('../../routes/rosterRoutes'));
router.use('/loyalty', require('../../routes/loyaltyRoutes'));
router.use('/marketing', require('../../routes/marketingAutomationRoutes'));
router.use('/inventory', require('../../routes/housekeepingInventoryRoutes'));
router.use('/maintenance', require('../../routes/maintenanceRoutes'));
router.use('/smart-lock', require('../../routes/smartLockRoutes'));
router.use('/banquet-events', require('../../routes/banquetRoutes'));
router.get('/ping', (req, res) => res.json({ module: 'operations', owner: 'Tuyền', status: 'ready' }));
module.exports = router;
