'use strict';

const express = require('express');
const router = express.Router();
const roomSearchController = require('../controllers/roomSearchController');

// GET /api/v1/rooms/search
router.get('/search', roomSearchController.searchRooms);

// GET /api/v1/rooms/branches
router.get('/branches', roomSearchController.getBranches);

// GET /api/v1/rooms/suggest
router.get('/suggest', roomSearchController.suggestRooms);

// POST /api/v1/rooms/book
router.post('/book', roomSearchController.createBooking);

// GET /api/v1/rooms/available - Spec FEAT-ROOMALLOC-01: Lấy danh sách phòng khả dụng
const roomAllocCtrl = require('../controllers/admin/roomAllocationController');
router.get('/available', roomAllocCtrl.getAvailableRooms);

// GET /api/v1/rooms/:id
router.get('/:id', roomSearchController.getRoomDetail);

module.exports = router;

