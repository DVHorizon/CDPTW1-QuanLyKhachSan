const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Room = sequelize.define('Room', {
    RoomId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    BranchId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomNumber: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    Floor: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    Status: {
      type: DataTypes.STRING(40),
      defaultValue: 'CleanAvailable'
    },
    Description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Rooms',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return Room;
};
