const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const auditLogInterceptor = require('../middlewares/auditMiddleware');
const { AuditLog, FraudAlert } = require('../models');

// Đảm bảo bảng đã được đồng bộ
let tablesSynced = false;
const ensureAuditTables = async () => {
  try {
    if (!tablesSynced) {
      await Promise.all([AuditLog.sync(), FraudAlert.sync()]);
      tablesSynced = true;
    }
  } catch (err) {
    console.warn('[AuditLog] Lỗi sync bảng audit:', err.message);
  }
};
ensureAuditTables();

router.use(async (req, res, next) => {
  if (!tablesSynced) await ensureAuditTables();
  next();
});

// Root & Overview alias
router.get('/', (req, res, next) => {
  req.url = '/logs';
  router.handle(req, res, next);
});

router.get('/overview', async (req, res) => {
  try {
    const totalLogs = await AuditLog.count();
    const totalAlerts = await FraudAlert.count();
    const unresolvedAlerts = await FraudAlert.count({ where: { is_resolved: false } });
    res.json({
      success: true,
      data: {
        totalLogs,
        totalAlerts,
        unresolvedAlerts,
        wormProtection: 'ACTIVE_ENFORCED'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 1. NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
// ==========================================
router.get('/logs', auditLogController.getLogs);
router.post('/logs', auditLogController.createLog);

// CƠ CHẾ BẢO VỆ WORM: Chặn tuyệt đối mọi hành vi Sửa hoặc Xóa Log
router.put('/logs/:id', auditLogController.rejectLogModification);
router.patch('/logs/:id', auditLogController.rejectLogModification);
router.delete('/logs/:id', auditLogController.rejectLogModification);
router.delete('/logs', auditLogController.rejectLogModification);

// ==========================================
// 2. CẢNH BÁO BẤT THƯỜNG (FRAUD ALERTS)
// ==========================================
router.get('/alerts', auditLogController.getFraudAlerts);
router.post('/alerts', auditLogController.createFraudAlert);
router.put('/alerts/:id', auditLogController.updateFraudAlert);
router.put('/alerts/:id/resolve', auditLogController.resolveFraudAlert);
router.delete('/alerts/:id', auditLogController.deleteFraudAlert);

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
