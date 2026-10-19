'use strict';

/**
 * modules/guest/index.js
 * 👤 OWNER: Bảo — Guest Portal
 * Mount tại: /api/v1/guest
 *
 * Bao gồm: Search, Room Availability, Booking, Review, Wishlist, Home, Newsletter, Compare
 */

const express = require('express');
const router = express.Router();

const roomSearchController = require('../../controllers/roomSearchController');
const roomAvailabilityController = require('../../controllers/roomAvailabilityController');

// ─── TÍNH NĂNG 4: REAL-TIME AVAILABILITY & LOCK (FEAT-GUEST-04) ─────────────
router.get('/rooms/availability',    roomAvailabilityController.checkRoomAvailability);
router.post('/rooms/lock',           roomAvailabilityController.lockRoomSession);
router.delete('/rooms/lock/:sessionId', roomAvailabilityController.releaseRoomLock);

// ─── TÌM KIẾM & XEM PHÒNG ──────────────────────────────────────────────────
router.get('/rooms/search',          roomSearchController.searchRooms);
router.get('/rooms/suggest',         roomSearchController.suggestRooms);
router.get('/rooms/:id',             roomSearchController.getRoomDetail);
router.get('/branches',              roomSearchController.getBranches);

module.exports = router;
