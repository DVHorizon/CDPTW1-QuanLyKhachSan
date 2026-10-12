const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    UserId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    RoleId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    TierId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    FullName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    Phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    PasswordHash: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    IdNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    IdType: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    DateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    Gender: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Active'
    }
  }, {
    tableName: 'Users',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return User;
};
