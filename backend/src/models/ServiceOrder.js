'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServiceOrder = sequelize.define('ServiceOrder', {
    OrderId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ServiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Quantity: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 1.00,
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    TotalPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    OrderDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Received',
    },
    Note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'ServiceOrders',
    timestamps: false,
  });

  return ServiceOrder;
};
