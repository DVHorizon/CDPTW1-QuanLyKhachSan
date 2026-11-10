const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Lô nhập hàng kho đồ tiêu hao theo nguyên tắc FIFO
  const InventoryBatch = sequelize.define('InventoryBatch', {
    BatchId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BatchCode: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    ItemId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    InitialQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RemainingQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    UnitCost: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0
    },
    ReceivedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    ExpiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(30), // ACTIVE, DEPLETED
      defaultValue: 'ACTIVE'
    }
  }, {
    tableName: 'InventoryBatches',
    timestamps: true
  });

  return InventoryBatch;
};
