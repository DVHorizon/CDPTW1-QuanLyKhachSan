'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MinibarUsage = sequelize.define(
    'MinibarUsage',
    {
      UsageId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      StayId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      RecordedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Quantity: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 1.0,
      },
      UsageDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      UnitPrice: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0.0,
      },
      TotalAmount: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0.0,
      },
    },
    {
      tableName: 'MinibarUsages',
      timestamps: false,
    }
  );

  return MinibarUsage;
};
