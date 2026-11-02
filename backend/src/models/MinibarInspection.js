const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MinibarInspection', {
    InspectionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'DRAFT' // DRAFT, SUBMITTED, CONFIRMED, REJECTED, VOIDED
    },
    Version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    CheckedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CheckedByName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    CheckedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ConfirmedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ConfirmedByName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    TotalConsumedQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    Subtotal: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    TaxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    TaxAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    TotalAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    Notes: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    OverrideReason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    OverrideBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    IdempotencyKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'MinibarInspections',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
