'use strict';

/**
 * models/Wishlist.js
 * 
 * TÍNH NĂNG 13C: DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)
 * Bảng DB: Wishlists (WishlistId, UserId, RoomTypeId, CreatedAt)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wishlist = sequelize.define('Wishlist', {
    WishlistId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'UserId'
      },
      onDelete: 'CASCADE'
    },
    RoomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'RoomTypes',
        key: 'RoomTypeId'
      },
      onDelete: 'CASCADE'
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'Wishlists',
    timestamps: false
  });

  return Wishlist;
};
