'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GuestIdentityDocument = sequelize.define('GuestIdentityDocument', {
    DocumentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    GuestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DocumentType: {
      type: DataTypes.ENUM('CCCD', 'Passport'),
      allowNull: false,
    },
    DocumentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    FullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    DateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    Gender: {
      type: DataTypes.STRING(20),
      defaultValue: 'Khác',
    },
    Nationality: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    DocumentExpiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    IdCardImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    SignatureImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ScannedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    ScannedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'GuestIdentityDocuments',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return GuestIdentityDocument;
};
