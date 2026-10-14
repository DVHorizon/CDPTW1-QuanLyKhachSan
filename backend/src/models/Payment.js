const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Payment', {
    PaymentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    InvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    FoodOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    PaymentMethod: {
      type: DataTypes.STRING(30),
      defaultValue: 'Cash'
    },
    PaymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    TransactionCode: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Pending'
    },
    RefundReason: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    RefundAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    GatewayResponse: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: 'Payments',
    timestamps: false
  });
};
