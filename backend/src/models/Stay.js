const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Stay', {
    StayId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    CheckInTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    CheckOutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    Status: {
      type: DataTypes.ENUM('Active', 'Completed'),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'Stays',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
