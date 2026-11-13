const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('RestaurantTable', {
    TableId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BranchName: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    TableNumber: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    Location: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    Capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 4
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Available'
    }
  }, {
    tableName: 'RestaurantTables',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });
};
