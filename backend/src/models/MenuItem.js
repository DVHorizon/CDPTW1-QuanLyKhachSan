const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MenuItem = sequelize.define('MenuItem', {
    MenuItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MenuCategories',
        key: 'CategoryId',
      }
    },
    ItemName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    Price: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    Description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    ImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    SKU: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Ingredients: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    Allergens: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ServingTime: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    KitchenStation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: 'Available'
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    }
  }, {
    tableName: 'MenuItems',
    timestamps: false,
  });

  return MenuItem;
};
