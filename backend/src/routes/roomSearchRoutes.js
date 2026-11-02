'use strict';

const express = require('express');
const router = express.Router();
const roomSearchController = require('../controllers/roomSearchController');
const bookingEngineController = require('../controllers/bookingEngineController');
const dynamicPricingController = require('../controllers/dynamicPricingController');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/v1/rooms/search
router.get('/search', roomSearchController.searchRooms);

// GET /api/v1/rooms/branches
router.get('/branches', roomSearchController.getBranches);

// GET /api/v1/rooms/suggest
router.get('/suggest', roomSearchController.suggestRooms);

// POST /api/v1/rooms/book (FEAT-GUEST-05: Online Booking Engine)
router.post('/book', verifyToken, bookingEngineController.createOnlineBooking);


// GET /api/v1/rooms/:roomId/pricing (FEAT-GUEST-12 / A12: Dynamic Pricing Engine)
router.get('/:roomId/pricing', dynamicPricingController.getRoomDynamicPricing);

// GET /api/v1/rooms/:id
router.get('/:id', roomSearchController.getRoomDetail);

module.exports = router;
