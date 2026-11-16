const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Quản lý chủng loại đồ vải cao cấp (Linen Master)
  const LinenItem = sequelize.define('LinenItem', {
    LinenId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    SKU: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    ItemName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    Specification: {
      type: DataTypes.STRING(255), // "Mã SKU: LIN-KS-400 • RFID Gen2 UHF", v.v.
      allowNull: true
    },
    TotalStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    CleanStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    InUseStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    LaundryStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    LossDamagedStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    LossRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.20
    },
    ParRatio: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 3.0
    },
    ParStatus: {
      type: DataTypes.STRING(50), // '3.1X TỐI ƯU', '2.9X CẦN BỔ SUNG', '2.7X NGƯỠNG NGUY'
      defaultValue: 'TỐI ƯU'
    }
  }, {
    tableName: 'LinenItems',
    timestamps: true,
    version: true
  });

  return LinenItem;
};
