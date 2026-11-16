const { AuditLog, FraudAlert, User } = require('../models');
const { Op } = require('sequelize');
const FraudDetectionService = require('../services/fraudDetectionService');

/**
 * Lấy danh sách Audit Logs (Hỗ trợ phân trang, lọc theo action, entity, user)
 */
exports.getLogs = async (req, res) => {
  try {
    const { action, entity, userId, limit = 50, page = 1 } = req.query;
    const where = {};

    if (action) where.action = { [Op.like]: `%${action}%` };
    if (entity) where.entity_name = entity;
    if (userId) where.user_id = userId;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({
      success: true,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy danh sách Cảnh báo gian lận / Bất thường (Fraud Alerts)
 */
exports.getFraudAlerts = async (req, res) => {
  try {
    const { severity, is_resolved } = req.query;
    const where = {};

    if (severity) where.severity = severity;
    if (is_resolved !== undefined) {
      where.is_resolved = is_resolved === 'true' || is_resolved === true;
    }

    const alerts = await FraudAlert.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: alerts,
      unresolvedCount: alerts.filter(a => !a.is_resolved).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Đánh dấu cảnh báo đã xử lý (Resolve Fraud Alert)
 */
exports.resolveFraudAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by = 'Quản Lý An Ninh PMS' } = req.body;
    const resolution_note = req.body.resolution_note || req.body.resolutionNote || 'Đã kiểm tra nghiệp vụ và xác nhận bình thường.';

    const alert = await FraudAlert.findByPk(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo này' });
    }

    alert.is_resolved = true;
    alert.resolved_by = resolved_by;
    alert.resolution_note = resolution_note;
    await alert.save();

    res.json({
      success: true,
      message: 'Cảnh báo đã được giải quyết thành công',
      data: alert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * THÊM LOG KIỂM TOÁN THỦ CÔNG
 */
exports.createLog = async (req, res) => {
  try {
    const action = req.body.action || 'GENERAL_ACTION';
    const entity_name = req.body.entity_name || req.body.entity || req.body.target || 'General';
    const entity_id = req.body.entity_id || req.body.entityId || 0;
    const user_id = req.body.user_id || req.body.userId || 1;
    const user_name = req.body.user_name || req.body.userName || 'Admin';
    const { old_values, new_values, reason, details } = req.body;

    const log = await AuditLog.create({
      action,
      entity_name,
      entity_id,
      user_id,
      user_name,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: new_values ? JSON.stringify(new_values) : (details ? JSON.stringify(details) : null),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'System API'
    });
    return res.status(201).json({ success: true, message: 'Đã tạo nhật ký kiểm toán thành công!', data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * THÊM CẢNH BÁO GIAN LẬN THỦ CÔNG
 */
exports.createFraudAlert = async (req, res) => {
  try {
    const rule_name = req.body.rule_name || req.body.type || req.body.rule || 'FRAUD_ALERT';
    const description = req.body.description || req.body.details || 'Cảnh báo hệ thống phát hiện hành vi bất thường';
    const severity = req.body.severity || 'MEDIUM';
    const alert_type = req.body.alert_type || req.body.alertType || req.body.type || 'MANUAL';
    const user_id = req.body.user_id || req.body.userId || null;
    const details = req.body.details;

    const alert = await FraudAlert.create({
      rule_name,
      description,
      severity,
      alert_type,
      user_id,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      is_resolved: false
    });
    return res.status(201).json({ success: true, message: 'Đã tạo cảnh báo gian lận thành công!', data: alert });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * SỬA CẢNH BÁO GIAN LẬN
 */
exports.updateFraudAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await FraudAlert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo!' });

    const { severity, description, resolution_note, is_resolved, resolved_by } = req.body;
    if (severity) alert.severity = severity;
    if (description) alert.description = description;
    if (resolution_note !== undefined) alert.resolution_note = resolution_note;
    if (is_resolved !== undefined) alert.is_resolved = is_resolved;
    if (resolved_by) alert.resolved_by = resolved_by;

    await alert.save();
    return res.json({ success: true, message: 'Đã cập nhật cảnh báo thành công!', data: alert });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * XÓA CẢNH BÁO GIAN LẬN (FALSE POSITIVE)
 */
exports.deleteFraudAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await FraudAlert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo!' });
    await alert.destroy();
    return res.json({ success: true, message: `Đã hủy cảnh báo gian lận #${id} thành công!` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * CHẶN ĐỨNG THAO TÁC SỬA/XÓA BẢNG LOG (WORM Enforcement)
 * Bất kỳ yêu cầu PUT/DELETE nào tới logs đều bị chặn tại đây và sinh Fraud Alert
 */
exports.rejectLogModification = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
  const actionType = req.method === 'DELETE' ? 'XÓA' : 'SỬA ĐỔI';

  // Kích hoạt cảnh báo bảo mật tức thì
  await FraudDetectionService.reportTamperAttempt({
    user_id: req.user?.id || req.body?.user_id || null,
    ip_address: ip,
    target_id: req.params.id,
    action_type: actionType,
  });

  return res.status(403).json({
    success: false,
    code: 'AUDIT_LOG_IMMUTABLE_VIOLATION',
    message: `CHÍNH SÁCH BẢO MẬT (WORM): Bảng Audit Log là bất biến. Nghiêm cấm mọi hành vi ${actionType} nhật ký kiểm toán! Sự việc đã được báo cáo tới đội an ninh.`,
  });
};

/**
 * Thử nghiệm can thiệp trực tiếp bằng ORM/Database để kiểm chứng cơ chế chặn
 */
exports.testDirectTamper = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await AuditLog.findByPk(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Bản ghi log không tồn tại' });
    }

    if (req.method === 'DELETE' || req.query.action === 'delete') {
      // Cố tình gọi destroy() để kích hoạt hook chặn
      await target.destroy();
      return res.json({ success: true, message: 'Đã xóa (Lẽ ra không được phép!)' });
    } else {
      // Cố tình update()
      target.action = 'HACKED_ACTION';
      await target.save();
      return res.json({ success: true, message: 'Đã sửa (Lẽ ra không được phép!)' });
    }
  } catch (err) {
    // Bắt được exception từ Sequelize hook / SQLite trigger
    return res.status(400).json({
      success: false,
      blockedBySecurityHook: true,
      message: err.message,
    });
  }
};

/**
 * API mô phỏng các hành động nhạy cảm để kiểm thử và demo
 */
exports.testSensitiveAction = async (req, res) => {
  const { action = 'UPDATE_ROOM_PRICE', oldPrice = 2000000, newPrice = 1800000, reason = 'Cập nhật giá theo mùa' } = req.body;

  // Giả lập gán giá trị cũ vào request
  req.auditOldValues = { price: oldPrice, status: 'AVAILABLE' };

  res.json({
    success: true,
    message: `Đã thực hiện thao tác [${action}] thành công`,
    data: {
      action,
      entityId: req.params.id,
      oldPrice,
      newPrice,
      reason,
    },
  });
};
