'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    ServiceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ServiceName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    Price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    Unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '/lượt',
    },
    Description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active',
    },
    ServiceCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'Services',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return Service;
};
