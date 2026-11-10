'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Voucher', {
    VoucherId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    Code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    DiscountType: {
      type: DataTypes.STRING(20),
      defaultValue: 'Percent' // 'Percent' / 'Percentage' hoặc 'FixedAmount'
    },
    DiscountValue: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    MinOrderAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    MaxDiscountAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true
    },
    StartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    EndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    UsageLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    UsedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'Vouchers',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });
};
