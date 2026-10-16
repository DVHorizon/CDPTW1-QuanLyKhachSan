const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomType = sequelize.define('RoomType', {
    RoomTypeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Mã ngắn gọn (STD-DBL, DLX-OCN, ...) — optional, unique khi có
    TypeCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    TypeName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    BasePrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0
    },
    MaxOccupancy: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    AdultCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    ChildCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    ImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    // Diện tích (m²)
    AreaSqm: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    // Tổng số phòng tồn kho của loại này
    TotalRooms: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Loại giường (bản địa: "1 Giường King (2m x 2m)", ...)
    BedType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Hướng view (bản địa: "Hướng Biển (Ocean View)", ...)
    ViewType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Tầng vị trí (vd: "Tầng 2-5")
    FloorRange: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // Thời gian dọn phòng (phút)
    TurnoverMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    // Hệ số giá cuối tuần
    WeekendMultiplier: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 1.00
    },
    // Tiện ích (JSON array): ["wifi","ac","tv",...]
    Amenities: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]'
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active'
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'RoomTypes',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return RoomType;
};
