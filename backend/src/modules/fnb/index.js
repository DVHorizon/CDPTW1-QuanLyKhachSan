'use strict';
/**
 * modules/fnb/index.js
 * 👤 OWNER: Trang — F&B (Food & Beverage)
 * Mount tại: /api/v1/fnb
 */
const express = require('express');
const router = express.Router();
// Dùng lại routes F&B hiện có
const menuRoutes     = require('../../routes/admin/menuRoutes');
const fnbOrderRoutes = require('../../routes/admin/fnbOrderRoutes');
const tableReservationRoutes = require('../../routes/admin/tableReservationRoutes');
router.use('/',             menuRoutes);          // /api/v1/fnb/menu, /api/v1/fnb/categories
router.use('/orders',       fnbOrderRoutes);      // /api/v1/fnb/orders
router.use('/reservations', tableReservationRoutes); // /api/v1/fnb/reservations
// router.use('/tables',       require('./routes/tableRoutes'));
// router.use('/reservations', require('./routes/reservationRoutes'));
// router.use('/kitchen',      require('./routes/kitchenRoutes'));
router.get('/ping', (req, res) => res.json({ module: 'fnb', owner: 'Trang', status: 'ready' }));
module.exports = router;
