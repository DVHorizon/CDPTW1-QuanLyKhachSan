'use strict';

const express = require('express');
const router = express.Router();
const roomSearchController = require('../controllers/roomSearchController');
const roomAvailabilityController = require('../controllers/roomAvailabilityController');
const bookingEngineController = require('../controllers/bookingEngineController');

// ─── TÍNH NĂNG 4: KIỂM TRA PHÒNG TRỐNG REAL-TIME (FEAT-GUEST-04) ────────────
// GET /api/v1/rooms/availability?roomTypeId=1&checkInDate=2024-11-15&checkOutDate=2024-11-18&quantity=1
router.get('/availability', roomAvailabilityController.checkRoomAvailability);

// POST /api/v1/rooms/lock
router.post('/lock', roomAvailabilityController.lockRoomSession);

// DELETE /api/v1/rooms/lock/:sessionId
router.delete('/lock/:sessionId', roomAvailabilityController.releaseRoomLock);

// ─── TÌM KIẾM & BROWSE PHÒNG ───────────────────────────────────────────────
// GET /api/v1/rooms/search
router.get('/search', roomSearchController.searchRooms);

// GET /api/v1/rooms/branches
router.get('/branches', roomSearchController.getBranches);

// GET /api/v1/rooms/suggest
router.get('/suggest', roomSearchController.suggestRooms);

// POST /api/v1/rooms/book (FEAT-GUEST-05: Online Booking Engine)
router.post('/book', require('../middlewares/authMiddleware').verifyToken, bookingEngineController.createOnlineBooking);

// GET /api/v1/rooms/:id
router.get('/:id', roomSearchController.getRoomDetail);

module.exports = router;

