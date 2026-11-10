const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MarketingCampaign = sequelize.define('MarketingCampaign', {
    CampaignId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    CampaignCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    CampaignName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    Goal: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    Subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    TargetAudience: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    TargetCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    Channels: {
      type: DataTypes.STRING(255), // Lưu chuỗi dạng "Zalo OA, SMS, Email"
      allowNull: false
    },
    ScheduleDate: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    BannerUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ThrottlingSpeed: {
      type: DataTypes.INTEGER,
      defaultValue: 200
    },
    AntiSpamDnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    OpenRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    ConvertedRooms: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    RevenueVnd: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0
    },
    Status: {
      type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'DRAFT'
    },
    StatusLabel: {
      type: DataTypes.STRING(50),
      defaultValue: 'Bản Nháp'
    }
  }, {
    tableName: 'MarketingCampaigns',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return MarketingCampaign;
};
