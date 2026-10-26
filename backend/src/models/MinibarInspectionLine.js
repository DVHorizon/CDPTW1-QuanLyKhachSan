const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MinibarInspectionLine', {
    LineId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    InspectionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ProductId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ProductName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Category: {
      type: DataTypes.STRING(50),
      defaultValue: 'Beverage'
    },
    Unit: {
      type: DataTypes.STRING(30),
      defaultValue: 'Lon'
    },
    OpeningQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    ReplenishedQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    RemainingQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    ComplimentaryQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    ConsumedQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    BillableQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    LineAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    VarianceReason: {
      type: DataTypes.STRING(50),
      defaultValue: 'GUEST_CONSUMED'
    },
    IsException: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'DRAFT'
    },
    Notes: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'MinibarInspectionLines',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
