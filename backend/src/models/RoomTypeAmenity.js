'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomTypeAmenity = sequelize.define('RoomTypeAmenity', {
    RoomTypeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'RoomTypes', key: 'RoomTypeId' },
      onDelete: 'CASCADE',
    },
    AmenityId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'Amenities', key: 'AmenityId' },
      onDelete: 'CASCADE',
    },
  }, {
    tableName: 'RoomTypeAmenities',
    timestamps: false,
  });

  return RoomTypeAmenity;
};
