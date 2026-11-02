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
    const { resolved_by = 'Quản Lý An Ninh PMS', resolution_note } = req.body;

    const alert = await FraudAlert.findByPk(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cảnh báo này' });
    }

    alert.is_resolved = true;
    alert.resolved_by = resolved_by;
    alert.resolution_note = resolution_note || 'Đã kiểm tra nghiệp vụ và xác nhận bình thường.';
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
