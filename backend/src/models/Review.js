const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define('Review', {
    ReviewId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    StayId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    FoodOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Rating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 5.0
    },
    OverallRating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 5.0
    },
    CleanlinessScore: {
      type: DataTypes.TINYINT,
      defaultValue: 5
    },
    StaffServiceScore: {
      type: DataTypes.TINYINT,
      defaultValue: 5
    },
    RoomComfortScore: {
      type: DataTypes.TINYINT,
      defaultValue: 5
    },
    DiningScore: {
      type: DataTypes.TINYINT,
      defaultValue: 5
    },
    ValueForMoneyScore: {
      type: DataTypes.TINYINT,
      defaultValue: 5
    },
    WouldRecommend: {
      type: DataTypes.STRING(10),
      defaultValue: 'YES'
    },
    TripClassification: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    ReviewTitle: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    ReviewBody: {
      type: DataTypes.STRING(1000),
      allowNull: false
    },
    IsAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    Comment: {
      type: DataTypes.STRING(2000),
      allowNull: true
    }
  }, {
    tableName: 'Reviews',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false
  });

  return Review;
};
