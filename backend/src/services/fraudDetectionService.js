const { AuditLog, FraudAlert } = require('../models');
const { Op } = require('sequelize');

/**
 * Service kiểm tra và phát hiện các hành vi bất thường / gian lận (Fraud Detection Engine)
 */
class FraudDetectionService {
  /**
   * Phân tích hành vi ngay sau khi AuditLog được tạo
   * @param {Object} auditData - Thông tin vừa ghi vào AuditLog
   */
  static async analyzeAction(auditData) {
    try {
      const { user_id, action, entity_name, entity_id, old_values, new_values, reason, ip_address } = auditData;

      // --- QUY TẮC 1: Thao tác dồn dập (Burst / Velocity) ---
      // Nếu 1 user thực hiện >= 5 hành động nhạy cảm trong vòng 10 phút
      if (user_id) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const actionCount = await AuditLog.count({
          where: {
            user_id: user_id,
            createdAt: { [Op.gte]: tenMinutesAgo },
          },
        });

        if (actionCount >= 5) {
          // Kiểm tra xem đã có alert tương tự chưa giải quyết trong 10 phút qua chưa
          const existingAlert = await FraudAlert.findOne({
            where: {
              user_id: user_id,
              alert_type: 'EXCESSIVE_SENSITIVE_ACTIONS',
              is_resolved: false,
              createdAt: { [Op.gte]: tenMinutesAgo },
            },
          });

          if (!existingAlert) {
            await FraudAlert.create({
              user_id: user_id,
              alert_type: 'EXCESSIVE_SENSITIVE_ACTIONS',
              severity: 'HIGH',
              description: `Phát hiện tần suất thao tác bất thường: Người dùng ID #${user_id} đã thực hiện ${actionCount} thao tác nhạy cảm liên tiếp trong vòng 10 phút qua (IP: ${ip_address || 'N/A'}).`,
              metadata: { actionCount, lastAction: action, ip_address },
            });
          }
        }
      }

      // --- QUY TẮC 2: Điều chỉnh giá bất thường (Abnormal Price Dump / Discount) ---
      if (
        (action.includes('PRICE') || action.includes('DISCOUNT') || action.includes('OVERRIDE')) &&
        old_values && new_values
      ) {
        const oldPrice = Number(old_values.price || old_values.amount || 0);
        const newPrice = Number(new_values.price || new_values.amount || 0);

        if (oldPrice > 0 && newPrice > 0) {
          const discountPercent = ((oldPrice - newPrice) / oldPrice) * 100;
          
          // Giảm giá > 50% hoặc giá dưới 100,000 VND
          if (discountPercent >= 50 || newPrice < 100000) {
            await FraudAlert.create({
              user_id: user_id,
              alert_type: 'ABNORMAL_PRICE_OVERRIDE',
              severity: 'CRITICAL',
              description: `Cảnh báo giá bất thường: Thao tác [${action}] trên ${entity_name} #${entity_id} giảm ${discountPercent.toFixed(1)}% (từ ${oldPrice.toLocaleString()}đ xuống ${newPrice.toLocaleString()}đ). Vượt ngưỡng an toàn 50%!`,
              metadata: { oldPrice, newPrice, discountPercent, reason },
            });
          }
        }
      }

      // --- QUY TẮC 3: Hủy/Xóa giao dịch tài chính không rõ lý do ---
      if (
        (action.includes('DELETE') || action.includes('VOID') || action.includes('CANCEL')) &&
        (!reason || reason.trim().length < 5)
      ) {
        await FraudAlert.create({
          user_id: user_id,
          alert_type: 'HIGH_RISK_DELETION_WITHOUT_REASON',
          severity: 'HIGH',
          description: `Thao tác rủi ro cao: Hành động [${action}] trên thực thể ${entity_name} #${entity_id || 'N/A'} được thực hiện mà KHÔNG có lý do nghiệp vụ hợp lệ.`,
          metadata: { action, entity_name, entity_id, reason },
        });
      }

      // --- QUY TẮC 4: Thao tác nhạy cảm ngoài giờ làm việc (00:00 - 05:00 sáng) ---
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 5) {
        const isFinancialOrAuth = 
          action.includes('PRICE') || 
          action.includes('BILL') || 
          action.includes('PERMISSION') || 
          action.includes('ROLE');

        if (isFinancialOrAuth) {
          await FraudAlert.create({
            user_id: user_id,
            alert_type: 'AFTER_HOURS_SENSITIVE_ACCESS',
            severity: 'MEDIUM',
            description: `Cảnh báo truy cập ca đêm: Hành động [${action}] được thực hiện ngoài khung giờ hành chính (${currentHour}h sáng) bởi User #${user_id || 'Ẩn danh'}.`,
            metadata: { currentHour, action, entity_name },
          });
        }
      }

    } catch (err) {
      console.error('Lỗi khi phân tích Fraud Detection:', err);
    }
  }

  /**
   * Tạo cảnh báo tức thì khi phát hiện hành vi cố tình xâm phạm bất biến của Audit Log
   */
  static async reportTamperAttempt({ user_id, ip_address, target_id, action_type }) {
    try {
      await FraudAlert.create({
        user_id: user_id || null,
        alert_type: 'SECURITY_AUDIT_TAMPER_ATTEMPT',
        severity: 'CRITICAL',
        description: `BÁO ĐỘNG AN NINH: Phát hiện hành vi cố tình ${action_type} bản ghi Audit Log #${target_id || 'ALL'} từ IP ${ip_address || 'N/A'}. Hệ thống WORM đã kích hoạt chặn đứng thành công!`,
        metadata: { target_id, ip_address, action_type, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      console.error('Lỗi khi ghi nhận Tamper Alert:', err);
    }
  }
}

module.exports = FraudDetectionService;
