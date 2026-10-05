const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomType = sequelize.define('RoomType', {
    RoomTypeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    TypeName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    BasePrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false
    },
    MaxOccupancy: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    AdultCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    ChildCapacity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    ImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active'
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'RoomTypes',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return RoomType;
};
