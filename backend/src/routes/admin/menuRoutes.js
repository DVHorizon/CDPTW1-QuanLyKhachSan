const express = require('express');
const router = express.Router();
const menuController = require('../../controllers/admin/menuController');

// Define API routes for Admin Menu Management
router.get('/menu-items', menuController.getMenuItems);
router.post('/menu-items', menuController.createMenuItem);
router.put('/menu-items/:id', menuController.updateMenuItem);
router.delete('/menu-items/:id', menuController.deleteMenuItem);
router.patch('/menu-items/:id/status', menuController.updateMenuItemStatus);

module.exports = router;
