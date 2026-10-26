'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServiceCategory = sequelize.define('ServiceCategory', {
    CategoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CategoryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
    },
  }, {
    tableName: 'ServiceCategories',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false, // Bảng ServiceCategories trong migration không có cột UpdatedAt
  });

  return ServiceCategory;
};
