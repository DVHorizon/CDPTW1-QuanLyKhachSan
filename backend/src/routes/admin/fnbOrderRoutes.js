const express = require('express');
const router = express.Router();
const fnbOrderController = require('../../controllers/admin/fnbOrderController');

// Đặt món Room Service online
router.post('/', fnbOrderController.createRoomServiceOrder);

// Lịch sử gọi món
router.get('/', fnbOrderController.getOrderHistory);

// FEAT-FNB-06 (A4.6): Theo dõi trạng thái đơn món real-time bằng WebSocket
router.get('/track/hub', fnbOrderController.getAllOrdersForHub);
router.get('/track/:orderId', fnbOrderController.getOrderStatus);

// Kitchen Display System
router.get('/kitchen', fnbOrderController.getKitchenOrders);
router.get('/kitchen/ready', fnbOrderController.getReadyOrders);
router.get('/kitchen/expediter-metrics', fnbOrderController.getExpediterAndStationMetrics);
router.post('/kitchen/call-runners', fnbOrderController.callRunners);
router.post('/kitchen/clear-pass', fnbOrderController.clearExpediterPass);
router.patch('/kitchen/:orderId/items/:detailId', fnbOrderController.updateItemCompletion);
router.patch('/kitchen/:orderId/ready', fnbOrderController.markOrderReady);
router.patch('/kitchen/:orderId/restore', fnbOrderController.restoreOrder);

// Xử lý thanh toán F&B
router.patch('/:orderId/payment', fnbOrderController.processPayment);

// Cập nhật đơn hàng (Update)
router.put('/:orderId', fnbOrderController.updateOrder);

// Xóa đơn hàng (Soft Delete)
router.delete('/:orderId', fnbOrderController.deleteOrder);

module.exports = router;
