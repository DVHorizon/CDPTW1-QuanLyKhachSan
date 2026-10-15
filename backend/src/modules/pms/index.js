'use strict';

/**
 * modules/pms/index.js
 * 👤 OWNER: Thực — PMS (Property Management System)
 * Mount tại: /api/v1/pms
 *
 * Bao gồm: Rooms, RoomTypes, Users, CheckIn/CheckOut, Housekeeping,
 *           CashShift, SmartLocks, RoomMap
 */

const express = require('express');
const router = express.Router();

router.use('/room-types',    require('./routes/roomTypeRoutes'));
router.use('/rooms',         require('./routes/roomRoutes'));
// router.use('/users',      require('./routes/userRoutes'));       // TODO: Thực
// router.use('/checkin',    require('./routes/checkinRoutes'));     // TODO: Thực
// router.use('/checkout',   require('./routes/checkoutRoutes'));    // TODO: Thực
// router.use('/housekeeping', require('./routes/housekeepingRoutes')); // TODO: Thực
// router.use('/cash-shift', require('./routes/cashShiftRoutes'));   // TODO: Thực

module.exports = router;
