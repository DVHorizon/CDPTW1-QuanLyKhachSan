const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('FoodOrder', {
    FoodOrderId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    OrderType: {
      type: DataTypes.ENUM('RoomService', 'Restaurant'),
      defaultValue: 'RoomService'
    },
    Status: {
      type: DataTypes.ENUM('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'),
      defaultValue: 'Pending'
    },
    TotalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    PaymentMode: {
      type: DataTypes.ENUM('RoomInvoice', 'PayNow'),
      allowNull: false
    }
  }, {
    tableName: 'FoodOrders',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
