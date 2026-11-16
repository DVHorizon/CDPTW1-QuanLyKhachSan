const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DispatchLog = sequelize.define('DispatchLog', {
    LogId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    LogCode: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    CustomerName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    Phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    MessageType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Channel: {
      type: DataTypes.STRING(50), // Zalo ZNS / SMS Telco / Email AWS SES
      allowNull: false
    },
    RoomInfo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(50), // SUCCESS / FAILED / QUEUED
      defaultValue: 'SUCCESS'
    },
    ResponseCode: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    SentAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'DispatchLogs',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return DispatchLog;
};
