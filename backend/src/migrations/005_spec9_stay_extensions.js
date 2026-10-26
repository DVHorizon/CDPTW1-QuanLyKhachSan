'use strict';

/**
 * Migration 005 – Hỗ trợ Đặc tả Chức năng Gia hạn lưu trú (FEAT-STAY-EXTEND-01)
 * Tạo bảng StayExtensions và thêm cột Version vào bảng Stays
 */

const sequelize = require('../config/sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    // 1. Thêm cột Version vào bảng Stays (Optimistic Locking)
    const staysDesc = await qi.describeTable('Stays');
    const stayCols = Object.keys(staysDesc);

    if (!stayCols.includes('Version')) {
      await qi.addColumn('Stays', 'Version', {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 1,
      });
      console.log('✅ Thêm cột Stays.Version (Optimistic Locking)');
    }

    // 2. Tạo bảng StayExtensions nếu chưa tồn tại
    const tables = await qi.showAllTables();
    if (!tables.includes('StayExtensions')) {
      await qi.createTable('StayExtensions', {
        ExtensionId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        StayId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        BookingId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        RoomId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        CurrentCheckoutAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        RequestedCheckoutAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        AdditionalNights: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        BaseAmount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        TaxRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 12.0,
        },
        TaxAmount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        TotalAmount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        RatePlanId: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: 'RATE-STANDARD',
        },
        ApprovalStatus: {
          type: DataTypes.ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'),
          allowNull: false,
          defaultValue: 'NOT_REQUIRED',
        },
        ExtensionStatus: {
          type: DataTypes.ENUM('DRAFT', 'QUOTED', 'PENDING_APPROVAL', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED'),
          allowNull: false,
          defaultValue: 'QUOTED',
        },
        QuoteExpiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        IdempotencyKey: {
          type: DataTypes.STRING(100),
          allowNull: true,
          unique: true,
        },
        Version: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 1,
        },
        Note: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        CreatedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        ApprovedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        CreatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        UpdatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });
      console.log('✅ Tạo bảng StayExtensions');
    }

    console.log('✅ Migration 005 hoàn tất.');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    try { await qi.dropTable('StayExtensions'); } catch (_) {}
    try { await qi.removeColumn('Stays', 'Version'); } catch (_) {}
    console.log('🗑️ Migration 005 rollback hoàn tất.');
  },
};

if (require.main === module) {
  (async () => {
    try {
      const qi = sequelize.getQueryInterface();
      const Sequelize = require('sequelize');
      await module.exports.up(qi, Sequelize);
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi chạy migration 005:', err);
      process.exit(1);
    }
  })();
}
