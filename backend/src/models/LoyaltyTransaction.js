const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoyaltyTransaction = sequelize.define('LoyaltyTransaction', {
    TransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    TransactionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'EARN'
    },
    ReferenceId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00
    },
    PointsEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    TierBefore: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    TierAfter: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'LoyaltyTransactions',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });

  return LoyaltyTransaction;
};

