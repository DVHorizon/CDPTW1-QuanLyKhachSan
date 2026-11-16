const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GuestNotificationTemplate = sequelize.define('GuestNotificationTemplate', {
    TemplateId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    TemplateCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    Name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    EventTrigger: {
      type: DataTypes.STRING(100),
      allowNull: false // e.g. PRE_CHECKIN_24H, ON_CHECKIN, POST_CHECKOUT_2H, VIP_BIRTHDAY_3D
    },
    EventName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    Channels: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    BannerUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    Title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    Content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    Tokens: {
      type: DataTypes.STRING(500), // e.g. "{{TEN_KHACH}},{{MA_DAT_PHONG}},..."
      allowNull: true
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'GuestNotificationTemplates',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return GuestNotificationTemplate;
};
