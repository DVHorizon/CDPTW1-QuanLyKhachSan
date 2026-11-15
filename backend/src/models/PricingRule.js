'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PricingRule = sequelize.define('PricingRule', {
    PricingRuleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    RoomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    RuleName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    StartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    EndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    MinPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    MaxPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    PriceMultiplier: {
      type: DataTypes.DECIMAL(8, 4),
      defaultValue: 1.0000,
    },
    Conditions: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    Priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active',
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'PricingRules',
    timestamps: false,
  });

  return PricingRule;
};
