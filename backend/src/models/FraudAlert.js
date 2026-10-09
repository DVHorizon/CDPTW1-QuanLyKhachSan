const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

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
    // e.g., EXCESSIVE_DELETIONS, SUSPICIOUS_DISCOUNT
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
  }
}, {
  tableName: 'fraud_alerts',
  timestamps: true,
});

module.exports = FraudAlert;
