const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const auditLogInterceptor = require('../middlewares/auditMiddleware');

// ==========================================
// 1. NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
// ==========================================
router.get('/logs', auditLogController.getLogs);

// CƠ CHẾ BẢO VỆ WORM: Chặn tuyệt đối mọi hành vi Sửa hoặc Xóa Log
router.put('/logs/:id', auditLogController.rejectLogModification);
router.patch('/logs/:id', auditLogController.rejectLogModification);
router.delete('/logs/:id', auditLogController.rejectLogModification);
router.delete('/logs', auditLogController.rejectLogModification);

// ==========================================
// 2. CẢNH BÁO BẤT THƯỜNG (FRAUD ALERTS)
// ==========================================
router.get('/alerts', auditLogController.getFraudAlerts);
router.put('/alerts/:id/resolve', auditLogController.resolveFraudAlert);

// ==========================================
// 3. CÁC ROUTE KIỂM THỬ & MÔ PHỎNG AN NINH
// ==========================================
// Mô phỏng hành động nhạy cảm thông qua Interceptor
router.put(
  '/test-sensitive-action/:id',
  (req, res, next) => {
    // Dynamic action từ request body nếu có
    const action = req.body?.action || 'UPDATE_ROOM_PRICE';
    const entity = req.body?.entity || 'Room';
    return auditLogInterceptor(action, entity)(req, res, next);
  },
  auditLogController.testSensitiveAction
);

// Thử can thiệp trực tiếp vào ORM/Database để kiểm tra Hook chặn
router.post('/test-direct-tamper/:id', auditLogController.testDirectTamper);

module.exports = router;
