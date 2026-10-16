const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const auditLogInterceptor = require('../middlewares/auditMiddleware');

// API để Admin xem Logs & Cảnh báo (Cần thêm middleware verifyToken & isAdmin vào đây)
router.get('/logs', auditLogController.getLogs);
router.get('/alerts', auditLogController.getFraudAlerts);
router.put('/alerts/:id/resolve', auditLogController.resolveFraudAlert);

// Route Test Middleware ghi nhận hành động nhạy cảm
router.put(
  '/test-sensitive-action/:id', 
  auditLogInterceptor('UPDATE_ROOM_PRICE', 'Room'), 
  auditLogController.testSensitiveAction
);

module.exports = router;
