'use strict';

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const RoomStatusHistory = sequelize.define('RoomStatusHistory', {
    HistoryId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    OldStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    NewStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    // CHECKIN | CHECKOUT | CLEANING_COMPLETED | MAINTENANCE_ON | MAINTENANCE_OFF
    TriggerEvent: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    StatusChangedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // NULL nếu tự động, có giá trị nếu thủ công
    StatusChangedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'RoomStatusHistory',
    timestamps: false,
  });

  return RoomStatusHistory;
};
