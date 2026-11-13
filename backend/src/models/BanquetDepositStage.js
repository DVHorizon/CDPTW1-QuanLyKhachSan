'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BanquetDepositStage = sequelize.define('BanquetDepositStage', {
    StageId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    StageName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    Percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50.00,
    },
    Amount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
    },
    PaymentMethod: {
      type: DataTypes.STRING(100),
      defaultValue: 'Chuyển khoản VCB',
    },
    ReceiptNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    PaidDate: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(50), // 'PAID', 'PENDING', 'OVERDUE'
      defaultValue: 'PENDING',
    },
    Notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'BanquetDepositStages',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return BanquetDepositStage;
};
