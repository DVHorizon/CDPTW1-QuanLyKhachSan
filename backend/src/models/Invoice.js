const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Invoice', {
    InvoiceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    InvoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    InvoiceDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    Subtotal: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    VATRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    VATAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    TotalAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Unpaid'
    },
    PdfPath: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    AssignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    tableName: 'Invoices',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
