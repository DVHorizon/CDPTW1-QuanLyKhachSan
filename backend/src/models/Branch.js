const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Branch = sequelize.define('Branch', {
    BranchId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BranchName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    Address: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    Phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'Branches',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return Branch;
};
