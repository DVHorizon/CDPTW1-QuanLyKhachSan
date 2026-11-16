const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MembershipTier = sequelize.define('MembershipTier', {
    TierId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    TierName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    TierCode: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    BadgeName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    BadgeColor: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    MinPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    MinNights: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    MinSpendUsd: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    Benefits: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    DiscountRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    PointMultiplier: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 1.00
    },
    Icon: {
      type: DataTypes.STRING(50),
      defaultValue: 'credit_card'
    },
    IconColor: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ColorClass: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    PerksJson: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    RetentionPolicy: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'MembershipTiers',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return MembershipTier;
};
