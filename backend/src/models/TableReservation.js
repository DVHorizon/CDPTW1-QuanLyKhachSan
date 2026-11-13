const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('TableReservation', {
    TableReservationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    TableId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ReservationTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    GuestCount: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Confirmed'
    },
    Note: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'TableReservations',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });
};
