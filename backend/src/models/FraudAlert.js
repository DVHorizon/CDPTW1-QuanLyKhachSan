const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const FraudAlert = sequelize.define('FraudAlert', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    alert_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resolution_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    }
  }, {
    tableName: 'fraud_alerts',
    timestamps: true,
  });

  return FraudAlert;
};
