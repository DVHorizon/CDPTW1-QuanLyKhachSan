const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReviewPhoto = sequelize.define('ReviewPhoto', {
    PhotoId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ReviewId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    PhotoUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false
    },
    UploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'ReviewPhotos',
    timestamps: false
  });

  return ReviewPhoto;
};
