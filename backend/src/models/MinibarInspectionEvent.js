const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MinibarInspectionEvent', {
    EventId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    InspectionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ActionType: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    UserName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    OldValues: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    NewValues: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'MinibarInspectionEvents',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });
};
