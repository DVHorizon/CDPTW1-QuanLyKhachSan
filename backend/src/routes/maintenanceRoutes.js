const express = require('express');
const router = express.Router();
const {
  createMaintenanceTicket,
  updateTicketWorkflow,
  getTickets
} = require('../services/maintenanceTicketingService');

// 1. Lấy danh sách phiếu & KPI tổng quan (Ảnh 1)
router.get('/tickets', async (req, res) => {
  try {
    const list = await getTickets(req.query);

    const stats = {
      activeTickets: 12,
      p1Count: 3,
      p2Count: 5,
      p3Count: 4,
      avgResolutionMinutes: 42.5,
      resolutionTrend: '-4.2 phút so với ca trước',
      slaComplianceRate: '79.8%',
      techniciansOnDuty: '06/06 Sẵn Sàng',
      techniciansDutyDetail: '4 Điện Lạnh HVAC • 2 Cấp Thoát Nước',
      preventiveMaintenanceCompliance: '96.4%',
      ppmTasksCompleted: 'Hoàn thành 48/50 hạng mục tuần',
      ppmRemaining: '2 hạng mục còn lại (Chu kỳ W-42)',
      chillerCapacity: '1,820 kW',
      copEfficiency: '5.42 Hi-Eff',
      activeSensors: '214 cảm biến áp suất & nhiệt độ',
      hotlineTicketsCount: 4,
      iotAlertsCount: 2
    };

    res.json({ success: true, stats, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Tạo phiếu yêu cầu bảo trì mới (Ảnh 2)
router.post('/tickets', async (req, res) => {
  try {
    const result = await createMaintenanceTicket(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 3. Cập nhật workflow (Đang sửa -> Đã nghiệm thu)
router.patch('/tickets/:id/workflow', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const result = await updateTicketWorkflow(id, status, notes);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 4. Phân công kỹ thuật viên phụ trách
router.patch('/tickets/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianName, specialty } = req.body;
    const { MaintenanceTicket } = require('../models');
    const { Op } = require('sequelize');
    const where = isNaN(id) ? { TicketCode: id } : { [Op.or]: [{ TicketId: id }, { TicketCode: id }] };
    const ticket = await MaintenanceTicket.findOne({ where });
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu' });

    ticket.TechnicianName = technicianName;
    ticket.TechnicianSpecialty = specialty;
    ticket.Status = 'IN_PROGRESS';
    ticket.StatusLabel = `Đã giao Kỹ sư: ${technicianName}`;
    await ticket.save();

    res.json({ success: true, message: `Đã phân công ${technicianName} xử lý phiếu #${ticket.TicketCode}`, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Cập nhật / Sửa thông tin phiếu bảo trì toàn diện
router.put('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { MaintenanceTicket } = require('../models');
    const { Op } = require('sequelize');
    const where = isNaN(id) ? { TicketCode: id } : { [Op.or]: [{ TicketId: id }, { TicketCode: id }] };
    const ticket = await MaintenanceTicket.findOne({ where });
    if (!ticket) return res.status(404).json({ success: false, message: `Không tìm thấy phiếu #${id}` });

    const {
      roomNumber,
      assetName,
      category,
      priority,
      symptom,
      description,
      technicianName,
      technicianSpecialty,
      status,
      statusLabel,
      notes
    } = req.body;

    if (roomNumber !== undefined) ticket.RoomNumber = roomNumber;
    if (assetName !== undefined) ticket.AssetName = assetName;
    if (category !== undefined) ticket.Category = category;
    if (priority !== undefined) ticket.Priority = priority;
    if (symptom !== undefined) ticket.Symptom = symptom;
    if (description !== undefined) ticket.Description = description;
    if (technicianName !== undefined) ticket.TechnicianName = technicianName;
    if (technicianSpecialty !== undefined) ticket.TechnicianSpecialty = technicianSpecialty;
    if (status !== undefined) ticket.Status = status;
    if (statusLabel !== undefined) ticket.StatusLabel = statusLabel;
    if (notes !== undefined) ticket.ResolutionNotes = notes;

    await ticket.save();
    res.json({
      success: true,
      message: `Đã cập nhật thông tin phiếu bảo trì #${ticket.TicketCode || id} thành công!`,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Xóa / Hủy phiếu bảo trì
router.delete('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { MaintenanceTicket } = require('../models');
    const { Op } = require('sequelize');
    const where = isNaN(id) ? { TicketCode: id } : { [Op.or]: [{ TicketId: id }, { TicketCode: id }] };
    const ticket = await MaintenanceTicket.findOne({ where });
    if (!ticket) return res.status(404).json({ success: false, message: `Không tìm thấy phiếu #${id}` });

    await ticket.destroy();
    res.json({
      success: true,
      message: `Đã xóa phiếu bảo trì #${id} thành công!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
