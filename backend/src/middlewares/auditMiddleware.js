const AuditLog = require('../models/AuditLog');
const FraudAlert = require('../models/FraudAlert');
const { Op } = require('sequelize');

/**
 * Middleware để ghi nhận vết hành vi (Audit Log) cho các hành động nhạy cảm
 * @param {string} action - Tên hành động (vd: UPDATE_ROOM_PRICE, DELETE_BILL)
 * @param {string} entityName - Tên đối tượng bị tác động (vd: Room, Bill)
 */
const auditLogInterceptor = (action, entityName) => {
  return async (req, res, next) => {
    // Lưu lại hàm res.send/res.json để can thiệp sau khi xử lý xong
    const originalSend = res.send;

    res.send = async function (body) {
      // Chỉ log nếu request thành công
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          let oldValues = req.auditOldValues || null;
          let newValues = req.body || null;
          let entityId = req.params.id || req.body.id || null;
          let userId = req.user?.id || null;
          let reason = req.body.reason || null;

          // Tạo log
          await AuditLog.create({
            user_id: userId,
            action: action,
            entity_name: entityName,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            reason: reason,
          });

          // Kiểm tra và cảnh báo gian lận (Fraud Detection)
          // Vd: Nếu 1 user thực hiện quá 5 hành động nhạy cảm trong vòng 10 phút
          if (userId) {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const suspiciousCount = await AuditLog.count({
              where: {
                user_id: userId,
                createdAt: {
                  [Op.gte]: tenMinutesAgo,
                },
              },
            });

            if (suspiciousCount >= 5) {
              await FraudAlert.create({
                user_id: userId,
                alert_type: 'EXCESSIVE_SENSITIVE_ACTIONS',
                severity: 'HIGH',
                description: `Người dùng (ID: ${userId}) đã thực hiện ${suspiciousCount} hành động nhạy cảm trong 10 phút qua. Cần kiểm tra ngay.`,
              });
            }
          }

        } catch (error) {
          console.error('Audit Log Error:', error);
        }
      }
      
      return originalSend.call(this, body);
    };

    next();
  };
};

module.exports = auditLogInterceptor;
