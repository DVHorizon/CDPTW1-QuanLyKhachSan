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

// GET /api/v1/rooms/:id
router.get('/:id', roomSearchController.getRoomDetail);

module.exports = router;
