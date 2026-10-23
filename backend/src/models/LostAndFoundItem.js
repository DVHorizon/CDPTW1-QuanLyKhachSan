const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LostAndFoundItem = sequelize.define('LostAndFoundItem', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false // e.g. LF-2025-0841
    },
    hash: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '8F7C-99B4-LF25'
    },
    itemName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    itemType: {
      type: DataTypes.STRING(100),
      defaultValue: 'Thiết bị số & Điện tử cao cấp'
    },
    itemSpec: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    serialImei: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    serialNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    securityLevel: {
      type: DataTypes.STRING(100),
      defaultValue: 'BẢO VẬT CẤP ĐỘ II'
    },
    roomNumber: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    roomWing: {
      type: DataTypes.STRING(100),
      defaultValue: 'Ocean Wing'
    },
    foundLocation: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    foundDate: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    foundTime: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    finderName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    finderRole: {
      type: DataTypes.STRING(100),
      defaultValue: 'Nhân viên buồng phòng'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'IN_STORAGE' // IN_STORAGE | READY_TO_RETURN | RETURNED | DISPOSED
    },
    statusLabel: {
      type: DataTypes.STRING(255),
      defaultValue: 'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN'
    },
    storageLocation: {
      type: DataTypes.STRING(100),
      defaultValue: 'Két an toàn B-04'
    },
    sealNumber: {
      type: DataTypes.STRING(50),
      defaultValue: '#ST-99124'
    },
    verifiedDate: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // Lưu thông tin giám định dạng JSON hoặc TEXT
    inspectionReport: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('inspectionReport');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('inspectionReport', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    // Lưu hình ảnh (hỗ trợ cả Data URI base64 và URL vào thẳng Database)
    images: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('images');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('images', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    // Thông tin khách hàng liên kết
    guest: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('guest');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('guest', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    // Chuỗi bảo quản niêm phong (Chain of Custody)
    custodyChain: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('custodyChain');
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      },
      set(val) {
        this.setDataValue('custodyChain', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    deliveryMethod: {
      type: DataTypes.STRING(50),
      defaultValue: 'FRONT_DESK'
    },
    deliveryNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trackingCode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sha256: {
      type: DataTypes.STRING(255),
      defaultValue: 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a'
    },
    supervisor: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('supervisor');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return raw;
        }
      },
      set(val) {
        this.setDataValue('supervisor', typeof val === 'object' ? JSON.stringify(val) : val);
      }
    },
    digitalSignature: {
      type: DataTypes.TEXT, // Lưu trực tiếp nét ký chữ ký điện tử Base64 vào Database
      allowNull: true
    }
  }, {
    tableName: 'LostAndFoundItems',
    timestamps: true
  });

  return LostAndFoundItem;
};
