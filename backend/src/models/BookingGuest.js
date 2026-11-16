const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingGuest = sequelize.define('BookingGuest', {
    BookingGuestId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    FullName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    Phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    IdNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    IdType: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    DateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    Gender: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    IsPrimaryGuest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'BookingGuests',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });

  return BookingGuest;
};
