const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SmartLockKey = sequelize.define('SmartLockKey', {
    KeyId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false // e.g. EK-8891-804
    },
    BookingId: {
      type: DataTypes.STRING(50),
      allowNull: true // RES-8891, #BK-99214
    },
    RoomNumber: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    RoomWing: {
      type: DataTypes.STRING(100),
      defaultValue: 'Ocean Wing'
    },
    RoomType: {
      type: DataTypes.STRING(100),
      defaultValue: 'Deluxe Seaview'
    },
    GuestName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    GuestPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    GuestEmail: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    GuestTier: {
      type: DataTypes.STRING(50),
      defaultValue: 'SILVER RESIDENT' // SILVER RESIDENT | VIP BLACK | NHÂN VIÊN | STANDARD
    },
    LockType: {
      type: DataTypes.STRING(100),
      defaultValue: 'App BLE Mobile Key' // App BLE Mobile Key | BLE + 2 NFC Master VIP | Android Passkey BLE | Thẻ Master HK
    },
    PhysicalCardsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    PasscodePin: {
      type: DataTypes.STRING(20),
      allowNull: true // 894102
    },
    DigitalKeyUrl: {
      type: DataTypes.TEXT,
      allowNull: true // Apple Wallet pass url
    },
    RfidCardUid: {
      type: DataTypes.STRING(100),
      allowNull: true // Mifare Ultralight UID e.g. 04:E2:89:1A:BC
    },
    Provider: {
      type: DataTypes.STRING(50),
      defaultValue: 'VISIONLINE' // VISIONLINE | SALTO | TTLOCK | TUYA
    },
    ValidFrom: {
      type: DataTypes.STRING(50),
      allowNull: false // 2024-10-24 14:00
    },
    ValidTo: {
      type: DataTypes.STRING(50),
      allowNull: false // 2024-10-28 12:00
    },
    BatteryLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 92
    },
    BatteryStatus: {
      type: DataTypes.STRING(50),
      defaultValue: 'Tối ưu' // Tối ưu | Chuẩn | Báo Kỹ Thuật
    },
    SignalDbm: {
      type: DataTypes.INTEGER,
      defaultValue: -58
    },
    AccessAreas: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('AccessAreas');
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [raw];
        }
      },
      set(val) {
        this.setDataValue('AccessAreas', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    Status: {
      type: DataTypes.STRING(50),
      defaultValue: 'ACTIVE' // ACTIVE | REVOKED | EXPIRED | EMERGENCY_LOCKED
    },
    DoorSensorStatus: {
      type: DataTypes.STRING(50),
      defaultValue: 'AN TOÀN (LATCHED)' // AN TOÀN (LATCHED) | UNLATCHED | AJAR
    },
    HardwareSerial: {
      type: DataTypes.STRING(100),
      defaultValue: 'AC-8829-2024'
    },
    HardwareFirmware: {
      type: DataTypes.STRING(50),
      defaultValue: 'v4.18.2'
    },
    LastTapTime: {
      type: DataTypes.STRING(50),
      defaultValue: '12:14:02'
    }
  }, {
    tableName: 'SmartLockKeys',
    timestamps: true
  });

  return SmartLockKey;
};
