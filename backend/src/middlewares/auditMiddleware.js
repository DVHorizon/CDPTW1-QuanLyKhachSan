const { AuditLog } = require('../models');
const FraudDetectionService = require('../services/fraudDetectionService');

/**
 * Middleware Interceptor tự động ghi vết hành vi (System Audit Log)
 * @param {string} action - Mã hành động nghiệp vụ (vd: UPDATE_ROOM_PRICE, DELETE_BILL, MANUAL_OVERRIDE)
 * @param {string} entityName - Tên đối tượng tác động (vd: Room, Booking, Invoice, StaffAccount)
 */
const auditLogInterceptor = (action, entityName) => {
  return async (req, res, next) => {
    // Lưu lại hàm res.send và res.json nguyên bản
    const originalSend = res.send;
    const originalJson = res.json;

    let hasLogged = false;

    // Helper tạo Audit Log sau khi xử lý nghiệp vụ thành công
    const recordAuditLog = async () => {
      if (hasLogged) return;
      hasLogged = true;

      // Chỉ ghi nhận log khi request trả về mã thành công HTTP 2xx
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const oldValues = req.auditOldValues || null;
          const newValues = req.body || null;
          const entityId = req.params.id || req.body?.id || null;
          const userId = req.user?.id || req.body?.user_id || (req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null);
          const reason = req.body?.reason || req.query?.reason || null;
          const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
          const userAgent = req.headers['user-agent'] || 'Unknown';

          const auditData = {
            user_id: userId,
            action: action,
            entity_name: entityName,
            entity_id: entityId ? Number(entityId) : null,
            old_values: oldValues,
            new_values: newValues,
            ip_address: typeof ipAddress === 'string' ? ipAddress.replace(/^.*:/, '') : '127.0.0.1',
            user_agent: userAgent,
            reason: reason,
          };

          // 1. Ghi nhận nhật ký kiểm toán (Append-only)
          const createdLog = await AuditLog.create(auditData);

          // 2. Kích hoạt engine quét cảnh báo gian lận bất thường
          FraudDetectionService.analyzeAction(auditData).catch(err => {
            console.error('Lỗi phân tích gian lận ngầm:', err.message);
          });

        } catch (error) {
          console.error('Audit Log Interceptor Error:', error.message);
        }
      }
    };

    res.send = function (body) {
      recordAuditLog().finally(() => {
        originalSend.call(this, body);
      });
    };

    res.json = function (jsonBody) {
      recordAuditLog().finally(() => {
        originalJson.call(this, jsonBody);
      });
    };

    next();
  };
};

module.exports = auditLogInterceptor;
