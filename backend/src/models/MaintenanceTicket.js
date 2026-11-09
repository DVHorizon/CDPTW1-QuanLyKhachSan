const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Ticket báo hỏng và bảo trì kỹ thuật buồng phòng
  const MaintenanceTicket = sequelize.define('MaintenanceTicket', {
    TicketId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    TicketCode: {
      type: DataTypes.STRING(50), // WO-2025-0891, WO-2025-0890...
      allowNull: false,
      unique: true
    },
    // Vị trí & Phòng
    LocationType: {
      type: DataTypes.STRING(50), // Phòng Đang Ở / Khu Công Cộng / Bếp & BOH / Thang Máy
      defaultValue: 'Phòng Đang Ở'
    },
    RoomNumber: {
      type: DataTypes.STRING(50), // Suite 1401 Penthouse, Phòng 804...
      allowNull: false
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    RoomOccupancyStatus: {
      type: DataTypes.STRING(50), // OCCUPIED (In-House) / VACANT (Trống Sạch)
      defaultValue: 'OCCUPIED (In-House)'
    },
    GuestName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    GuestTier: {
      type: DataTypes.STRING(50), // SILVER RESIDENT, VIP BLACK LOTUS...
      allowNull: true
    },

    // Tài sản & Thiết bị gặp sự cố
    AssetId: {
      type: DataTypes.STRING(50), // #BATH-804-01
      allowNull: true
    },
    AssetName: {
      type: DataTypes.STRING(255), // Bồn Tắm Ngâm Liền Khối Monolith Freestanding, Điều hòa VRF...
      allowNull: false
    },
    Category: {
      type: DataTypes.STRING(100), // Cấp Thoát Nước & Thiết Bị Vệ Sinh / Điện Lạnh HVAC / Điện Module...
      allowNull: false
    },
    Symptom: {
      type: DataTypes.STRING(255), // Kẹt nút xả đáy bồn tắm / Lỗi điều hòa E-41 nhiệt độ tăng...
      allowNull: false
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Source: {
      type: DataTypes.STRING(100), // AI Concierge / Lễ Tân gọi / Buồng Phòng báo / Cảm biến IoT
      defaultValue: 'Lễ Tân gọi'
    },

    // Phân cấp mức độ ưu tiên & SLA
    Priority: {
      type: DataTypes.STRING(30), // P1 Khẩn Cấp / P2 Ưu Tiên / P3 Tiêu Chuẩn
      defaultValue: 'P2 Ưu Tiên'
    },
    SlaMinutes: {
      type: DataTypes.INTEGER, // 15, 45, 60
      defaultValue: 45
    },
    SlaDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Kỹ thuật viên & Đơn vị phụ trách
    TechnicianName: {
      type: DataTypes.STRING(100), // Daniel Miller, R. Nguyễn, K. Sarkis...
      allowNull: true
    },
    TechnicianSpecialty: {
      type: DataTypes.STRING(100), // Chuyên gia Cấp thoát nước, Kỹ sư Điện Lạnh HVAC...
      allowNull: true
    },
    TechnicianAvatar: {
      type: DataTypes.STRING(500),
      allowNull: true
    },

    // Quy trình Workflow
    Status: {
      type: DataTypes.ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'PAUSED'),
      defaultValue: 'NEW' // Mới tạo (NEW) -> Đang sửa (IN_PROGRESS) -> Đã nghiệm thu (CLOSED)
    },
    StatusLabel: {
      type: DataTypes.STRING(100), // Đang di chuyển đến tầng 8 / Đang xử lý tại phòng / Tạm dừng chờ vật tư / Hoàn tất
      defaultValue: 'Mới tạo'
    },

    // Quy trình an toàn khách đang ở
    GuestInRoom: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    AgreedImmediateFix: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    TempRoomChange: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Vật tư xuất kho kèm theo
    BmsPartsIssued: {
      type: DataTypes.TEXT, // Lưu JSON danh sách phụ tùng: Lõi xả đáy, ron gioăng, v.v.
      allowNull: true
    },
    PhotoEvidenceUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },

    ResolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    CompletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'MaintenanceTickets',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return MaintenanceTicket;
};
