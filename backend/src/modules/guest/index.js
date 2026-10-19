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
const bookingEngineController = require('../../controllers/bookingEngineController');
const onlineDepositPaymentController = require('../../controllers/onlineDepositPaymentController');

// ─── TÍNH NĂNG 4: REAL-TIME AVAILABILITY & LOCK (FEAT-GUEST-04) ─────────────
router.get('/rooms/availability',    roomAvailabilityController.checkRoomAvailability);
router.post('/rooms/lock',           roomAvailabilityController.lockRoomSession);
router.delete('/rooms/lock/:sessionId', roomAvailabilityController.releaseRoomLock);

// ─── TÍNH NĂNG 5: ĐẶT PHÒNG TRỰC TUYẾN (FEAT-GUEST-05) ──────────────────────
router.post('/bookings',             bookingEngineController.createOnlineBooking);

// ─── TÍNH NĂNG 8: THANH TOÁN TIỀN CỌC TRỰC TUYẾN (FEAT-GUEST-08) ────────────
router.get('/bookings/:id',          onlineDepositPaymentController.getBookingDetails);
router.post('/bookings/:bookingId/deposit', onlineDepositPaymentController.processDepositPayment);
router.post('/payments',             onlineDepositPaymentController.processDepositPayment);

// ─── TÌM KIẾM & XEM PHÒNG ──────────────────────────────────────────────────
router.get('/rooms/search',          roomSearchController.searchRooms);
router.get('/rooms/suggest',         roomSearchController.suggestRooms);
router.get('/rooms/:id',             roomSearchController.getRoomDetail);
router.get('/branches',              roomSearchController.getBranches);

module.exports = router;
