const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Lô giặt ủi đồ vải (Active Laundry Batches)
  const LaundryBatch = sequelize.define('LaundryBatch', {
    BatchId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BatchCode: {
      type: DataTypes.STRING(50), // LÔ #LND-9082, LÔ #LND-9883
      allowNull: false
    },
    BatchType: {
      type: DataTypes.STRING(50), // 'LÔ NGOẠI VIỆN' / 'TỐC HÀNH NỘI BỘ'
      defaultValue: 'LÔ NGOẠI VIỆN'
    },
    PartnerName: {
      type: DataTypes.STRING(150), // 'Đối tác Nhà Máy Eco-Linen' / 'Trạm Giặt Hấp Cao Tốc B2'
      allowNull: true
    },
    DeliveryTime: {
      type: DataTypes.STRING(100), // '16:30 HÔM NAY'
      allowNull: true
    },
    ItemsSummary: {
      type: DataTypes.STRING(255), // '1,200 Khăn Tắm 700GSM • 800 Ga Giường King Satin'
      allowNull: true
    },
    TotalWeight: {
      type: DataTypes.STRING(50), // '1.48 Tấn'
      allowNull: true
    },
    CurrentStep: {
      type: DataTypes.INTEGER, // 1: Xuất xe tải, 2: Giặt hấp tiệt trùng, 3: Sấy khô & Là ủi, 4: Giao kho
      defaultValue: 1
    },
    StepLabel: {
      type: DataTypes.STRING(100),
      defaultValue: 'Đang xử lý'
    },
    Status: {
      type: DataTypes.STRING(50),
      defaultValue: 'IN_PROGRESS'
    }
  }, {
    tableName: 'LaundryBatches',
    timestamps: true
  });

  return LaundryBatch;
};
