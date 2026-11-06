const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MinibarProduct', {
    ProductId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ProductCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    ProductName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Category: {
      type: DataTypes.STRING(50),
      defaultValue: 'Beverage' // Beverage, Snack, Alcohol, CoffeeTea
    },
    Unit: {
      type: DataTypes.STRING(30),
      defaultValue: 'Lon'
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    DefaultOpeningQty: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 2.00
    },
    IsComplimentary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'MinibarProducts',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
