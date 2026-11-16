'use strict';

/**
 * Migration 011 – Đồng bộ toàn bộ bảng & cột còn thiếu giữa Sequelize Models và MySQL DB
 * Giúp tất cả các phân hệ (F&B, Booking, Voucher, Review, Checkout/Damage, Inventory, Audit, Lost&Found, Wishlist...)
 * truy vấn DB không bị lỗi thiếu bảng hoặc thiếu cột (ER_BAD_FIELD_ERROR / ER_NO_SUCH_TABLE).
 */

const sequelize = require('../config/sequelize');

async function addColIfMissing(qi, tableName, colName, definition) {
  const desc = await qi.describeTable(tableName);
  const existing = Object.keys(desc).map((k) => k.toLowerCase());
  if (!existing.includes(colName.toLowerCase())) {
    await qi.addColumn(tableName, colName, definition);
    console.log(`✅ Thêm cột ${tableName}.${colName}`);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const DataTypes = Sequelize;

    const models = require('../models');
    const {
      AuditLog,
      FraudAlert,
      InventoryBatch,
      LinenItem,
      LaundryBatch,
      LostAndFoundItem,
    } = models;

    // 1. Tạo các bảng chuyên biệt nếu chưa tồn tại
    for (const model of [AuditLog, FraudAlert, InventoryBatch, LinenItem, LaundryBatch]) {
      if (model) {
        await model.sync();
      }
    }

    // 2. Đồng bộ bảng LostAndFoundItems nếu đang dùng schema cũ và chưa có dữ liệu
    if (LostAndFoundItem) {
      try {
        const lfDesc = await qi.describeTable('LostAndFoundItems');
        const lfCols = Object.keys(lfDesc).map((k) => k.toLowerCase());
        if (!lfCols.includes('id')) {
          const [[cntRow]] = await qi.sequelize.query('SELECT COUNT(*) AS cnt FROM `LostAndFoundItems`');
          if (Number(cntRow.cnt) === 0) {
            await LostAndFoundItem.sync({ force: true });
            console.log('✅ Đã đồng bộ lại schema bảng LostAndFoundItems');
          }
        }
      } catch (_) {
        await LostAndFoundItem.sync();
      }
    }

    // 3. Bổ sung tường minh các cột thường thiếu trên các bảng cốt lõi
    await addColIfMissing(qi, 'Bookings', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'Vouchers', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'MenuItems', 'Version', {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'Services', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'ServiceCategories', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'ServiceOrders', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'ChatbotConversations', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'ChatbotKnowledgeBase', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'Invoices', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'Payments', 'Version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await addColIfMissing(qi, 'Reviews', 'IsDeleted', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await addColIfMissing(qi, 'Reviews', 'DeletedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await addColIfMissing(qi, 'DamageItems', 'SupervisorId', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await addColIfMissing(qi, 'DamageItems', 'SupervisorName', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });

    await addColIfMissing(qi, 'DamageItems', 'ReviewedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    // 4. Bổ sung các cột mới của InventoryItems
    await addColIfMissing(qi, 'InventoryItems', 'SKU', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    await addColIfMissing(qi, 'InventoryItems', 'Category', {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Minibar',
    });
    await addColIfMissing(qi, 'InventoryItems', 'Supplier', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await addColIfMissing(qi, 'InventoryItems', 'Location', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await addColIfMissing(qi, 'InventoryItems', 'CurrentStock', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await addColIfMissing(qi, 'InventoryItems', 'ParStock', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    });
    await addColIfMissing(qi, 'InventoryItems', 'MinAlertLevel', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
    });
    await addColIfMissing(qi, 'InventoryItems', 'CostPrice', {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColIfMissing(qi, 'InventoryItems', 'SellingPrice', {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColIfMissing(qi, 'InventoryItems', 'ImageUrl', {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
    await addColIfMissing(qi, 'InventoryItems', 'StorageTemp', {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'Kho lạnh: 3.8°C Chuẩn',
    });
    await addColIfMissing(qi, 'InventoryItems', 'version', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Đồng bộ dữ liệu cũ của InventoryItems sang các cột mới nếu đang trống
    try {
      await qi.sequelize.query(`
        UPDATE InventoryItems
        SET SKU = COALESCE(NULLIF(SKU, ''), NULLIF(ItemCode, ''), CONCAT('SKU-', ItemId)),
            Category = COALESCE(NULLIF(Category, ''), NULLIF(ItemType, ''), 'Minibar'),
            CurrentStock = CASE WHEN CurrentStock = 0 AND Quantity > 0 THEN Quantity ELSE CurrentStock END,
            MinAlertLevel = CASE WHEN MinAlertLevel = 50 AND MinQuantity > 0 THEN MinQuantity ELSE MinAlertLevel END,
            CostPrice = CASE WHEN CostPrice = 0 AND UnitCost > 0 THEN UnitCost ELSE CostPrice END
      `);
    } catch (_) {}

    // 5. Quét tự động toàn bộ Sequelize Models để đảm bảo không sót bất kỳ bảng/cột mới nào
    const [tablesRows] = await qi.sequelize.query('SHOW TABLES');
    const existingTables = new Set(tablesRows.map((r) => Object.values(r)[0].toLowerCase()));

    for (const [, model] of Object.entries(qi.sequelize.models)) {
      const rawTable = model.getTableName();
      const tbl = typeof rawTable === 'object' ? rawTable.tableName : rawTable;
      if (!existingTables.has(tbl.toLowerCase())) {
        await model.sync();
        existingTables.add(tbl.toLowerCase());
        console.log(`✅ Tự động tạo bảng mới: ${tbl}`);
        continue;
      }

      const desc = await qi.describeTable(tbl);
      const existingCols = new Set(Object.keys(desc).map((c) => c.toLowerCase()));

      for (const [attrName, attr] of Object.entries(model.rawAttributes)) {
        if (attr.type && attr.type.key === 'VIRTUAL') continue;
        const colName = attr.field || attrName;
        if (!existingCols.has(colName.toLowerCase())) {
          await qi.addColumn(tbl, colName, {
            type: attr.type,
            allowNull: attr.allowNull !== undefined ? attr.allowNull : true,
            defaultValue: attr.defaultValue,
          });
          existingCols.add(colName.toLowerCase());
          console.log(`✅ Tự động bổ sung cột: ${tbl}.${colName}`);
        }
      }
    }
  },

  async down() {
    // Không tự động xóa bảng/cột để tránh mất dữ liệu
  },
};

if (require.main === module) {
  (async () => {
    try {
      const qi = sequelize.getQueryInterface();
      const Sequelize = require('sequelize');
      await module.exports.up(qi, Sequelize);
      console.log('🎉 Migration 011 hoàn tất!');
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi chạy migration 011:', err);
      process.exit(1);
    }
  })();
}
