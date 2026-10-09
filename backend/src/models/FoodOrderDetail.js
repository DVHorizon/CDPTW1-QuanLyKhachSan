const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('FoodOrderDetail', {
    OrderDetailId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    FoodOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    MenuItemId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    TotalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    Note: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'FoodOrderDetails',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
