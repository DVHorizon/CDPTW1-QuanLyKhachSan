const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MenuCategory = sequelize.define('MenuCategory', {
    CategoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CategoryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    }
  }, {
    tableName: 'MenuCategories',
    timestamps: false,
  });

  return MenuCategory;
};
