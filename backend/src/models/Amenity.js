const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Amenity = sequelize.define('Amenity', {
    AmenityId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    AmenityName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    IconUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    }
  }, {
    tableName: 'Amenities',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return Amenity;
};
