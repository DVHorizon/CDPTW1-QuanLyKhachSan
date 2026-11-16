const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('InvoiceDetail', {
    DetailId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    InvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ItemType: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    ItemId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    Quantity: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 1.00
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    TotalPrice: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    }
  }, {
    tableName: 'InvoiceDetails',
    timestamps: false
  });
};
