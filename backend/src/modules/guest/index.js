'use strict';

/**
 * modules/guest/index.js
 * 👤 OWNER: Bảo — Guest Portal
 * Mount tại: /api/v1/guest
 *
 * Bao gồm: Search, Booking, Review, Wishlist, Home, Newsletter, Compare
 */

const express = require('express');
const router = express.Router();

// Search & Room browsing — dùng lại roomSearchController hiện có
const roomSearchController = require('../../controllers/roomSearchController');
router.get('/rooms/search',  roomSearchController.searchRooms);
router.get('/rooms/suggest', roomSearchController.suggestRooms);
router.get('/rooms/:id',     roomSearchController.getRoomDetail);
router.get('/branches',      roomSearchController.getBranches);

// router.use('/bookings',   require('./routes/bookingRoutes'));   // TODO: Bảo
// router.use('/reviews',    require('./routes/reviewRoutes'));    // TODO: Bảo
// router.use('/wishlist',   require('./routes/wishlistRoutes')); // TODO: Bảo
// router.use('/newsletter', require('./routes/homeRoutes'));      // TODO: Bảo

module.exports = router;
