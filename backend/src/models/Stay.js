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
    ActualCheckIn: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ExpectedCheckOut: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ActualCheckOut: {
      type: DataTypes.DATE,
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'CheckedIn'
    },
    DepositAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'Stays',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
