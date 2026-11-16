const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('RoomInspectionReport', {
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
    InspectorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    InspectorName: {
      type: DataTypes.STRING(100),
      defaultValue: 'R. Gomez (Housekeeping Staff #409)'
    },
    InspectionTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'COMPLETED' // NOT_STARTED, IN_PROGRESS, SUBMITTED, APPROVED, DISPUTED, REJECTED, WAIVED
    },
    KeycardsIssued: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    KeycardsReturned: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    KeycardLossPenalty: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    RoomCondition: {
      type: DataTypes.STRING(30),
      defaultValue: 'NOMINAL' // NOMINAL, LINEN_DAMAGE, DAMAGE_REPORTED
    },
    LinenDamageFee: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    GuestAcknowledgement: {
      type: DataTypes.STRING(30),
      defaultValue: 'ACKNOWLEDGED' // ACKNOWLEDGED, DISPUTED, NOT_PRESENT
    },
    GuestNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    SupervisorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SupervisorNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    SignOffProofUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'RoomInspectionReports',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
