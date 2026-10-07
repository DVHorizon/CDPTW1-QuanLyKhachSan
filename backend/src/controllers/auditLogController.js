const { AuditLog, FraudAlert } = require('../models');

// Xem danh sách log (chỉ dành cho Admin/Kiểm toán)
exports.getLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xem danh sách cảnh báo gian lận
exports.getFraudAlerts = async (req, res) => {
  try {
    const alerts = await FraudAlert.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Đánh dấu cảnh báo đã xử lý
exports.resolveFraudAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await FraudAlert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    
    alert.is_resolved = true;
    await alert.save();
    
    res.json({ success: true, message: 'Alert marked as resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API mô phỏng hành động nhạy cảm để test (sẽ xóa trên production)
exports.testSensitiveAction = async (req, res) => {
  // logic xử lý (vd: update db) ...
  // Giả sử lấy giá trị cũ từ DB gán vào req.auditOldValues trong 1 middleware hoặc ở đây
  req.auditOldValues = { price: 1000 };
  
  res.json({ success: true, message: 'Action performed successfully', newPrice: req.body.price });
};
