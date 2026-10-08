const express = require('express');
const router = express.Router();
const fnbOrderController = require('../../controllers/admin/fnbOrderController');

// Đặt món Room Service online
router.post('/', fnbOrderController.createRoomServiceOrder);

// Lịch sử gọi món
router.get('/', fnbOrderController.getOrderHistory);

// Kitchen Display System
router.get('/kitchen', fnbOrderController.getKitchenOrders);

// Xử lý thanh toán F&B
router.patch('/:orderId/payment', fnbOrderController.processPayment);

module.exports = router;
