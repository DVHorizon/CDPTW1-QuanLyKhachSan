const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoyaltyPointTransaction = sequelize.define('LoyaltyPointTransaction', {
    TransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    TierId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Points: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    TransactionType: {
      type: DataTypes.STRING(30),
      defaultValue: 'Earn'
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'LoyaltyPointTransactions',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });

  return LoyaltyPointTransaction;
};

