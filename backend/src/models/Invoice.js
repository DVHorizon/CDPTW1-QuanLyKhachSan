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
      allowNull: false
    },
    BookingId: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    }
  }, {
    tableName: 'Invoices',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
