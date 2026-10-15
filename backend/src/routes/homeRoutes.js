const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/home', homeController.getHomeData);
router.get('/branches', homeController.getBranches);
router.get('/room-types', homeController.getRoomTypes);

module.exports = router;
