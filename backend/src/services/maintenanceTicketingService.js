const {
  sequelize,
  MaintenanceTicket,
  Room
} = require('../models');
const { Op } = require('sequelize');

// Khởi tạo bảng và nạp dữ liệu mẫu ban đầu khớp 100% với 2 ảnh
async function initEngineeringDatabase() {
  try {
    await MaintenanceTicket.sync({ alter: true });

    const count = await MaintenanceTicket.count();
    if (count === 0) {
      await MaintenanceTicket.bulkCreate([
        {
          TicketCode: 'WO-2025-0891',
          LocationType: 'Phòng Đang Ở',
          RoomNumber: 'Suite 1401 Penthouse',
          RoomOccupancyStatus: 'OCCUPIED (In-House)',
          GuestName: 'Arthur Dent',
          GuestTier: 'VIP BLACK LOTUS',
          AssetId: '#HVAC-1401-01',
          AssetName: 'Hệ Thống Điều Hòa VRF Multi-V',
          Category: 'Điện Lạnh HVAC',
          Symptom: 'Lỗi điều hòa VRF E-41 nhiệt độ phòng tăng 26.5°C',
          Description: 'Cảm biến nhiệt độ báo quá nhiệt +5.2°C so với mức cài đặt 21°C. Khách VIP đang có mặt tại phòng.',
          Source: 'AI Concierge',
          Priority: 'P1 KHẨN CẤP',
          SlaMinutes: 30,
          TechnicianName: 'R. Nguyễn (HVAC Lead)',
          TechnicianSpecialty: 'Kỹ sư trưởng Điện Lạnh HVAC',
          TechnicianAvatar: 'RN',
          Status: 'IN_PROGRESS',
          StatusLabel: 'Đang xử lý tại phòng',
          GuestInRoom: true,
          AgreedImmediateFix: true,
          TempRoomChange: false,
          BmsPartsIssued: JSON.stringify(['Bo mạch cảm biến nhiệt VRF-401', 'Gas R410A']),
          PhotoEvidenceUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
        },
        {
          TicketCode: 'WO-2025-0890',
          LocationType: 'Phòng Đang Ở',
          RoomNumber: 'Phòng 804 (Tháp B)',
          RoomOccupancyStatus: 'OCCUPIED (In-House)',
          GuestName: 'Arthur Dent',
          GuestTier: 'SILVER RESIDENT',
          AssetId: '#BATH-804-01',
          AssetName: 'Bồn Tắm Ngâm Liền Khối Monolith Freestanding',
          Category: 'Cấp Thoát Nước & Thiết Bị Vệ Sinh',
          Symptom: 'Kẹt nút xả đáy bồn tắm / Thoát nước chậm',
          Description: 'Khách Arthur Dent báo nút xả đáy bồn tắm bị kẹt cứng ở vị trí đóng kín. Nước sau khi ngâm thoát cực kỳ chậm (>10 phút chỉ rút 1/4 bồn). Khách chuẩn bị ăn tối tại The Horizon Room lúc 19:30, cần kỹ sư xử lý ngay trước 18:30.',
          Source: 'Lễ Tân gọi',
          Priority: 'P2 ƯU TIÊN',
          SlaMinutes: 45,
          TechnicianName: 'D. Miller (Ống Nước)',
          TechnicianSpecialty: 'Chuyên gia Cấp thoát nước • Ca Trực B',
          TechnicianAvatar: 'DM',
          Status: 'IN_PROGRESS',
          StatusLabel: 'Đang di chuyển đến tầng 8',
          GuestInRoom: true,
          AgreedImmediateFix: true,
          TempRoomChange: false,
          BmsPartsIssued: JSON.stringify(['Lõi xả đáy bồn tắm Pop-up Brass Chrome 40mm (#ST-40B)', 'Dụng cụ giác hút chân không tháo nắp bồn', 'Bộ hóa chất làm sạch sinh học & khăn vi sợi']),
          PhotoEvidenceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80'
        },
        {
          TicketCode: 'WO-2025-0889',
          LocationType: 'Phòng Đang Ở',
          RoomNumber: 'Phòng 407 (Trống Sạch)',
          RoomOccupancyStatus: 'VACANT (Trống Sạch)',
          GuestName: 'Khách sắp nhận phòng',
          GuestTier: 'STANDARD',
          AssetId: '#ELEC-407-02',
          AssetName: 'Đèn Đọc Sách Đầu Giường & Công Tắc Cảm Ứng',
          Category: 'Điện & Chiếu Sáng',
          Symptom: 'Đèn đọc sách đầu giường chập chờn, rò điện cảm ứng',
          Description: 'Buồng phòng kiểm tra trước giờ đón khách phát hiện đèn nhấp nháy liên tục khi chạm vào nút cảm ứng.',
          Source: 'Buồng Phòng báo',
          Priority: 'P2 ƯU TIÊN',
          SlaMinutes: 60,
          TechnicianName: 'K. Sarkis (Điện)',
          TechnicianSpecialty: 'Kỹ sư Điện & Chiếu Sáng',
          TechnicianAvatar: 'KS',
          Status: 'IN_PROGRESS',
          StatusLabel: 'Đang thay module cảm ứng',
          GuestInRoom: false,
          AgreedImmediateFix: true,
          TempRoomChange: false,
          BmsPartsIssued: JSON.stringify(['Module dimmer cảm ứng 12V', 'Bóng LED COB 5W'])
        },
        {
          TicketCode: 'WO-2025-0888',
          LocationType: 'Bếp & BOH',
          RoomNumber: 'Bếp Tổng (Main Kitchen F&B B1)',
          RoomOccupancyStatus: 'BOH',
          GuestName: 'N/A',
          AssetId: '#COLD-B1-04',
          AssetName: 'Kho Đông Lạnh Cấp Đông Thực Phẩm',
          Category: 'Điện Lạnh Công Nghiệp',
          Symptom: 'Nhiệt độ kho đông lạnh tăng lên -12°C (Chuẩn: -18°C)',
          Description: 'Cảm biến nhiệt độ báo nhiệt độ đang tăng dần do hở gioăng cao su cửa kho.',
          Source: 'Cảm biến IoT nhiệt',
          Priority: 'P3 TIÊU CHUẨN',
          SlaMinutes: 120,
          TechnicianName: 'Kho Vật Tư Kỹ Thuật',
          TechnicianSpecialty: 'Bộ phận quản lý vật tư',
          TechnicianAvatar: 'VT',
          Status: 'PAUSED',
          StatusLabel: 'Tạm dừng: Đang xuất gioăng EPDM #44',
          BmsPartsIssued: JSON.stringify(['Gioăng cao su EPDM #44'])
        },
        {
          TicketCode: 'WO-2025-0887',
          LocationType: 'Khu Công Cộng',
          RoomNumber: 'Khu Lotus Spa & Wellness',
          RoomOccupancyStatus: 'PUBLIC',
          GuestName: 'N/A',
          AssetId: '#SPA-STEAM-01',
          AssetName: 'Máy Xông Hơi Ướt Steam Room #2',
          Category: 'Cơ Điện & Nồi Hơi',
          Symptom: 'Nghẹt vòi xông hơi tinh dầu tràm trà',
          Description: 'Đã súc rửa vòi phun và kiểm định áp suất an toàn thành công.',
          Source: 'Kỹ Thuật Ca Trực',
          Priority: 'P3 TIÊU CHUẨN',
          SlaMinutes: 60,
          TechnicianName: 'T. Hoàng (Ống Nước)',
          TechnicianSpecialty: 'Kỹ sư cơ điện',
          TechnicianAvatar: 'TH',
          Status: 'CLOSED',
          StatusLabel: 'Đã hoàn tất đóng phiếu (Tiết kiệm 20 phút)',
          ResolutionNotes: 'Đã thông nòng ống dẫn hơi và thay lưới lọc tinh dầu.',
          CompletedAt: new Date(Date.now() - 3600000)
        }
      ]);
    }

    console.log('[Engineering DB] Đã đồng bộ bảng MaintenanceTickets thành công.');
  } catch (error) {
    console.error('[Engineering DB] Lỗi khởi tạo bảng:', error.message);
  }
}

initEngineeringDatabase();

// ----------------------------------------------------------------------
// CHỨC NĂNG CỐT LÕI 1: TẠO TICKET BÁO HỎNG & TỰ ĐỘNG ĐỔI TRẠNG THÁI PHÒNG
// ----------------------------------------------------------------------
async function createMaintenanceTicket(data) {
  const transaction = await sequelize.transaction();
  try {
    const totalCount = await MaintenanceTicket.count();
    const ticketCode = `WO-2025-${String(892 + totalCount).padStart(4, '0')}`;

    // Tạo Ticket mới
    const ticket = await MaintenanceTicket.create({
      TicketCode: ticketCode,
      LocationType: data.locationType || 'Phòng Đang Ở',
      RoomNumber: data.roomNumber,
      RoomId: data.roomId || null,
      RoomOccupancyStatus: data.roomOccupancyStatus || 'OCCUPIED (In-House)',
      GuestName: data.guestName || 'Arthur Dent',
      GuestTier: data.guestTier || 'SILVER RESIDENT',
      AssetId: data.assetId || '#ASSET-GEN-01',
      AssetName: data.assetName,
      Category: data.category || 'Cấp Thoát Nước & Thiết Bị Vệ Sinh',
      Symptom: data.symptom,
      Description: data.description,
      Source: data.source || 'Lễ Tân gọi',
      Priority: data.priority || 'P2 ƯU TIÊN',
      SlaMinutes: Number(data.slaMinutes) || 45,
      TechnicianName: data.technicianName || 'Daniel Miller',
      TechnicianSpecialty: data.technicianSpecialty || 'Chuyên gia Cấp thoát nước',
      TechnicianAvatar: 'DM',
      Status: 'NEW', // Workflow: Mới tạo
      StatusLabel: 'Chờ kỹ thuật viên tiếp nhận',
      GuestInRoom: data.guestInRoom !== false,
      AgreedImmediateFix: data.agreedImmediateFix !== false,
      TempRoomChange: data.tempRoomChange === true,
      BmsPartsIssued: typeof data.bmsParts === 'string' ? data.bmsParts : JSON.stringify(data.bmsParts || []),
      PhotoEvidenceUrl: data.photoEvidenceUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80'
    }, { transaction });

    // TỰ ĐỘNG ĐỔI TRẠNG THÁI PHÒNG SANG "UnderMaintenance" (Đang bảo trì)
    // Tìm phòng vật lý tương ứng nếu có số phòng
    if (data.roomNumber) {
      const pureRoomNum = data.roomNumber.replace(/[^0-9]/g, ''); // Ví dụ: "Phòng 804" -> "804"
      if (pureRoomNum) {
        const room = await Room.findOne({
          where: {
            RoomNumber: { [Op.like]: `%${pureRoomNum}%` }
          },
          transaction
        });

        if (room) {
          room.Status = 'UnderMaintenance'; // Tự động đổi trạng thái phòng sang Đang bảo trì
          await room.save({ transaction });
          console.log(`[Auto Room Status] Đã tự động cập nhật phòng ${room.RoomNumber} sang trạng thái [UnderMaintenance].`);
        }
      }
    }

    await transaction.commit();
    return {
      success: true,
      message: `Đã phát hành lệnh công tác kỹ thuật #${ticketCode} thành công! Phòng đã tự động chuyển sang trạng thái [Đang bảo trì - UnderMaintenance].`,
      ticket
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ----------------------------------------------------------------------
// CHỨC NĂNG CỐT LÕI 2: CẬP NHẬT WORKFLOW (MỚI TẠO -> ĐANG SỬA -> ĐÃ NGHIỆM THU)
// ----------------------------------------------------------------------
async function updateTicketWorkflow(ticketId, newStatus, technicianNotes) {
  const transaction = await sequelize.transaction();
  try {
    const ticket = await MaintenanceTicket.findByPk(ticketId, { transaction });
    if (!ticket) throw new Error('Không tìm thấy phiếu yêu cầu bảo trì');

    ticket.Status = newStatus;
    if (newStatus === 'IN_PROGRESS') {
      ticket.StatusLabel = 'Đang xử lý tại phòng';
    } else if (newStatus === 'CLOSED' || newStatus === 'RESOLVED') {
      ticket.StatusLabel = 'Đã nghiệm thu đóng phiếu thành công';
      ticket.CompletedAt = new Date();
      ticket.ResolutionNotes = technicianNotes || 'Đã kiểm tra vận hành hoàn hảo 100%.';

      // KHI NGHIỆM THU ĐÓNG PHIẾU: Tự động đổi trạng thái phòng về "CleanAvailable" hoặc "OccupiedClean"
      if (ticket.RoomNumber) {
        const pureRoomNum = ticket.RoomNumber.replace(/[^0-9]/g, '');
        if (pureRoomNum) {
          const room = await Room.findOne({
            where: { RoomNumber: { [Op.like]: `%${pureRoomNum}%` } },
            transaction
          });
          if (room && room.Status === 'UnderMaintenance') {
            room.Status = ticket.RoomOccupancyStatus.includes('OCCUPIED') ? 'OccupiedClean' : 'CleanAvailable';
            await room.save({ transaction });
            console.log(`[Auto Room Status] Nghiệm thu hoàn tất: Đã trả phòng ${room.RoomNumber} về trạng thái [${room.Status}].`);
          }
        }
      }
    }

    await ticket.save({ transaction });
    await transaction.commit();

    return {
      success: true,
      message: `Đã cập nhật trạng thái phiếu ${ticket.TicketCode} sang [${newStatus}] thành công!`,
      ticket
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Lấy danh sách phiếu
async function getTickets(query = {}) {
  const where = {};
  if (query.priority && query.priority !== 'ALL') {
    where.Priority = query.priority;
  }
  if (query.status && query.status !== 'ALL') {
    where.Status = query.status;
  }
  if (query.search) {
    where[Op.or] = [
      { TicketCode: { [Op.like]: `%${query.search}%` } },
      { RoomNumber: { [Op.like]: `%${query.search}%` } },
      { AssetName: { [Op.like]: `%${query.search}%` } },
      { TechnicianName: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const list = await MaintenanceTicket.findAll({
    where,
    order: [['TicketId', 'DESC']]
  });

  return list;
}

module.exports = {
  initEngineeringDatabase,
  createMaintenanceTicket,
  updateTicketWorkflow,
  getTickets
};
