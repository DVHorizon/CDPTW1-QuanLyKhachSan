'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingRoomAllocation = sequelize.define('BookingRoomAllocation', {
    AllocationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    CheckInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    CheckOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    AllocationNote: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    AllocatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    AllocatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Allocated',
    },
  }, {
    tableName: 'BookingRoomAllocations',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return BookingRoomAllocation;
};
