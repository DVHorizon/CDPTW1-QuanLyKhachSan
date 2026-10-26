const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // 1. Kho đồ tiêu hao & Minibar (Consumables & Minibar Items)
  const InventoryItem = sequelize.define('InventoryItem', {
    ItemId: {
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
    Category: {
      type: DataTypes.STRING(100), // Minibar / Bath Amenities / Nespresso/Trà
      allowNull: false
    },
    Supplier: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    Location: {
      type: DataTypes.STRING(100), // Kho A-04, Kệ C-12...
      allowNull: true
    },
    CurrentStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ParStock: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    MinAlertLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    CostPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0
    },
    SellingPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0
    },
    ImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    StorageTemp: {
      type: DataTypes.STRING(50),
      defaultValue: 'Kho lạnh: 3.8°C Chuẩn'
    }
  }, {
    tableName: 'InventoryItems',
    timestamps: true,
    version: true // Sequelize native optimistic locking
  });

  return InventoryItem;
};
