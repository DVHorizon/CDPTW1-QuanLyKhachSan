const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('LateFeePolicy', {
    PolicyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BranchId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PolicyName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    GracePeriodMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    HourlyFee: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 200000.00
    },
    HalfDayThresholdHours: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    HalfDayFeePercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50.00
    },
    FullDayThresholdHours: {
      type: DataTypes.INTEGER,
      defaultValue: 6
    },
    FullDayFeePercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00
    },
    MaxFee: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 3000000.00
    },
    TaxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'LateFeePolicies',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
