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
    MinPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
