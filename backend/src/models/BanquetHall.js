'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BanquetHall = sequelize.define('BanquetHall', {
    HallId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    HallCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    HallName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    HallType: {
      type: DataTypes.STRING(50), // 'BALLROOM', 'BEACH_OUTDOOR', 'TERRACE', 'BOARDROOM'
      defaultValue: 'BALLROOM',
    },
    MaxCapacityBanquet: {
      type: DataTypes.INTEGER, // Số chỗ ngồi bàn tròn tiệc (Banquet)
      defaultValue: 300,
    },
    MaxCapacityTheater: {
      type: DataTypes.INTEGER, // Số chỗ rạp hát (Theater)
      defaultValue: 450,
    },
    MaxCapacityClassroom: {
      type: DataTypes.INTEGER, // Số chỗ lớp học (Classroom)
      defaultValue: 250,
    },
    AreaM2: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 500,
    },
    CeilingHeight: {
      type: DataTypes.STRING(50),
      defaultValue: '7.5m',
    },
    BaseRentalPricePerSession: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 50000000,
    },
    FeaturesJson: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(50), // 'AVAILABLE', 'OCCUPIED', 'SETUP_IN_PROGRESS', 'MAINTENANCE'
      defaultValue: 'AVAILABLE',
    },
    ImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'BanquetHalls',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return BanquetHall;
};

