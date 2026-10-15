const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    BookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    RoomTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    VoucherId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    OTAChannelId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CheckInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    CheckOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    NumberOfNights: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    Adults: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    Children: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    RoomQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    RoomSubtotal: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    SurchargeAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    DiscountAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    TotalAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    DepositAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.00
    },
    Status: {
      type: DataTypes.STRING(30),
      defaultValue: 'Pending'
    },
    BookingSource: {
      type: DataTypes.STRING(50),
      defaultValue: 'DirectWeb'
    },
    BookingQrCode: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ConfirmationCode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ConfirmationSentAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Bookings',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt'
  });

  return Booking;
};
