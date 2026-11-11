'use strict';

const express = require('express');
const router = express.Router();
const roomSearchController = require('../controllers/roomSearchController');
const roomCompareController = require('../controllers/roomCompareController');
const bookingEngineController = require('../controllers/bookingEngineController');
const dynamicPricingController = require('../controllers/dynamicPricingController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { handleSearch } = require('../controllers/esRoomController');
const { unifiedSearchRooms } = require('../controllers/dualSearchController');
const { searchRoomsSolr } = require('../controllers/solrRoomController');

// Đăng ký đường dẫn so sánh phòng trực quan (FEAT-GUEST-13B / A13)
// GET /rooms/compare?ids=101,304,501
router.get('/compare', roomCompareController.compareRooms);

//Đăng ký đường dẫn API
router.get('/search', unifiedSearchRooms); // Dual Engine API (M?c d?nh)
router.get('/search-es', handleSearch);
router.get('/search-solr', searchRoomsSolr);

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

