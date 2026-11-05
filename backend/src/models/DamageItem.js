const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DamageItem', {
    DamageItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    InspectionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ItemName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    ItemLocation: {
      type: DataTypes.STRING(100),
      defaultValue: 'Phòng ngủ chính / Master Bedroom'
    },
    DamageDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    Severity: {
      type: DataTypes.STRING(30),
      defaultValue: 'MODERATE' // MILD, MODERATE, SEVERE
    },
    EvidenceUrls: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    ProposedCharge: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    ApprovedCharge: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'SUBMITTED' // SUBMITTED, APPROVED, REJECTED, DISPUTED, WAIVED
    },
    ReasonCode: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    DisputeNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    SupervisorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SupervisorName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'DamageItems',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
