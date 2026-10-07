const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Could be null if user is not authenticated for some reason, though normally required
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    // e.g., UPDATE_PRICE, DELETE_BILL, CANCEL_ORDER, REDUCE_MONEY
  },
  entity_name: {
    type: DataTypes.STRING,
    allowNull: false,
    // e.g., Room, Bill, Order
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true, // Reason for the sensitive action
  },
}, {
  tableName: 'audit_logs',
  timestamps: true, // adds createdAt and updatedAt, but we will block updates
  updatedAt: false, // only need createdAt for audit logs
  hooks: {
    beforeUpdate: (log, options) => {
      throw new Error('Audit logs cannot be updated!');
    },
    beforeDestroy: (log, options) => {
      throw new Error('Audit logs cannot be deleted!');
    }
  }
});

module.exports = AuditLog;
