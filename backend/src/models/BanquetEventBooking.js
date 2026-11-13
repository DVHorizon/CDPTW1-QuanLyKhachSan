'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BanquetEventBooking = sequelize.define('BanquetEventBooking', {
    BookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    EventCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    BeoNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    MasterFolio: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    EventTitle: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    EventType: {
      type: DataTypes.STRING(100),
      defaultValue: 'Gala Dinner Doanh Nghiệp',
    },
    CompanyName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    HostName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ContactName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    ContactTitle: {
      type: DataTypes.STRING(100),
      defaultValue: 'Đại diện hợp đồng',
    },
    ContactPhone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    ContactEmail: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ContactInitials: {
      type: DataTypes.STRING(10),
      defaultValue: 'KH',
    },
    HallId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    HallName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    EventDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    TimeRange: {
      type: DataTypes.STRING(50),
      defaultValue: '18:00 - 22:00',
    },
    CurrentSession: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    PaxCount: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
    SeatingStyle: {
      type: DataTypes.STRING(100),
      defaultValue: 'Bàn tròn 10 người/bàn',
    },
    TablesChairsSetup: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    StageLedConfig: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SoundLightConfig: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    DiagramCode: {
      type: DataTypes.STRING(100),
      defaultValue: 'SƠ ĐỒ: GALA-STANDARD-A1',
    },
    MenuType: {
      type: DataTypes.STRING(150),
      defaultValue: 'Set Menu Gala 6 Món Cao Cấp',
    },
    MenuCode: {
      type: DataTypes.STRING(100),
      defaultValue: 'MENU SIGNATURE #04',
    },
    GalaDinnerMenu: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    WelcomeWineDrinks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    LunchBuffetMenu: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    TotalContractAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
    },
    DepositPaid: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
    },
    RemainingDue: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
    },
    DueDate: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    GuaranteeType: {
      type: DataTypes.STRING(100),
      defaultValue: 'BẢO LÃNH DOANH NGHIỆP',
    },
    Status: {
      type: DataTypes.STRING(50), // 'CONFIRMED', 'SETUP_IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
      defaultValue: 'CONFIRMED',
    },
    StatusBadge: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    StatusBadgeColor: {
      type: DataTypes.STRING(100),
      defaultValue: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  }, {
    tableName: 'BanquetEventBookings',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
  });

  return BanquetEventBooking;
};
