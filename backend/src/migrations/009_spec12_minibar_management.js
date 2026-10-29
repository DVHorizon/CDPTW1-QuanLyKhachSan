'use strict';

/**
 * Migration 009 – Bổ sung schema Quản lý Minibar phòng (FEAT-MINIBAR-01) theo Spec 12
 * Chuẩn hóa trên các bảng có sẵn trong hệ thống (57 bảng):
 * - MinibarUsages (Bảng số 35)
 * - InventoryItems (Bảng số 33)
 * Tuyệt đối không tạo bảng mới ngoài danh mục 57 bảng chuẩn của dự án.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    console.log('--- 1. Kiểm tra & mở rộng cột cho InventoryItems (nếu cần) ---');
    const [invCols] = await sequelize.query('DESCRIBE InventoryItems');
    const invColNames = invCols.map(c => c.Field.toLowerCase());

    if (!invColNames.includes('unitprice')) {
      await sequelize.query('ALTER TABLE InventoryItems ADD COLUMN UnitPrice DECIMAL(18, 2) DEFAULT 0.00 AFTER UnitCost');
      console.log('✅ Đã thêm cột UnitPrice vào InventoryItems');
    }
    if (!invColNames.includes('category')) {
      await sequelize.query("ALTER TABLE InventoryItems ADD COLUMN Category VARCHAR(50) DEFAULT 'Beverage' AFTER ItemType");
      console.log('✅ Đã thêm cột Category vào InventoryItems');
    }
    if (!invColNames.includes('defaultopeningqty')) {
      await sequelize.query('ALTER TABLE InventoryItems ADD COLUMN DefaultOpeningQty DECIMAL(10, 2) DEFAULT 2.00 AFTER MinQuantity');
      console.log('✅ Đã thêm cột DefaultOpeningQty vào InventoryItems');
    }
    if (!invColNames.includes('iscomplimentary')) {
      await sequelize.query('ALTER TABLE InventoryItems ADD COLUMN IsComplimentary TINYINT(1) DEFAULT 0 AFTER DefaultOpeningQty');
      console.log('✅ Đã thêm cột IsComplimentary vào InventoryItems');
    }

    console.log('--- 2. Kiểm tra & mở rộng cột cho MinibarUsages (nếu cần) ---');
    const [usageCols] = await sequelize.query('DESCRIBE MinibarUsages');
    const usageColNames = usageCols.map(c => c.Field.toLowerCase());

    if (!usageColNames.includes('roomid')) {
      await sequelize.query('ALTER TABLE MinibarUsages ADD COLUMN RoomId INT NULL AFTER StayId');
      console.log('✅ Đã thêm cột RoomId vào MinibarUsages');
    }
    if (!usageColNames.includes('status')) {
      await sequelize.query("ALTER TABLE MinibarUsages ADD COLUMN Status VARCHAR(30) DEFAULT 'CONFIRMED' AFTER TotalAmount");
      console.log('✅ Đã thêm cột Status vào MinibarUsages');
    }
    if (!usageColNames.includes('version')) {
      await sequelize.query('ALTER TABLE MinibarUsages ADD COLUMN Version INT DEFAULT 1 AFTER Status');
      console.log('✅ Đã thêm cột Version vào MinibarUsages');
    }
    if (!usageColNames.includes('notes')) {
      await sequelize.query('ALTER TABLE MinibarUsages ADD COLUMN Notes VARCHAR(500) NULL AFTER Version');
      console.log('✅ Đã thêm cột Notes vào MinibarUsages');
    }
    if (!usageColNames.includes('idempotencykey')) {
      await sequelize.query('ALTER TABLE MinibarUsages ADD COLUMN IdempotencyKey VARCHAR(100) NULL AFTER Notes');
      console.log('✅ Đã thêm cột IdempotencyKey vào MinibarUsages');
    }

    console.log('--- 3. Seed danh mục đồ Minibar tiêu chuẩn vào InventoryItems ---');
    const [countRows] = await sequelize.query("SELECT COUNT(*) as cnt FROM InventoryItems WHERE ItemType = 'Minibar'");
    if (countRows[0].cnt === 0) {
      const defaultProducts = [
        ['MB-EVIAN', 'Nước khoáng thiên nhiên Evian 750ml', 'Minibar', 'Beverage', 'Chai', 50, 10, 50000, 80000, 2, 0],
        ['MB-COKE', 'Nước ngọt Coca-Cola lon 330ml', 'Minibar', 'Beverage', 'Lon', 100, 20, 25000, 45000, 2, 0],
        ['MB-BEER', 'Bia thủ công IPA Heart of Darkness 330ml', 'Minibar', 'Alcohol', 'Lon', 60, 15, 60000, 95000, 2, 0],
        ['MB-WINE', 'Rượu vang đỏ Chile Reserva Mini 187ml', 'Minibar', 'Alcohol', 'Chai', 30, 5, 140000, 220000, 1, 0],
        ['MB-CHAMP', 'Rượu sâm banh Moët & Chandon Brut Imperial 375ml', 'Minibar', 'Alcohol', 'Chai', 20, 5, 550000, 850000, 1, 0],
        ['MB-ALMOND', 'Hạnh nhân rang muối thượng hạng Blue Diamond 150g', 'Minibar', 'Snack', 'Hộp', 40, 10, 75000, 120000, 1, 0],
        ['MB-CASHEW', 'Hạt điều rang củi Bình Phước hộp thiếc 150g', 'Minibar', 'Snack', 'Hộp', 40, 10, 70000, 110000, 1, 0],
        ['MB-CHIPS', 'Snack khoai tây lon Pringles Original 107g', 'Minibar', 'Snack', 'Ống', 50, 15, 40000, 65000, 1, 0],
        ['MB-CHOC', 'Sô-cô-la Ferrero Rocher hộp 8 viên', 'Minibar', 'Snack', 'Hộp', 35, 10, 85000, 135000, 1, 0],
        ['MB-NESP', 'Viên nén cà phê Nespresso Master Origin', 'Minibar', 'CoffeeTea', 'Viên', 100, 20, 0, 0, 4, 1]
      ];

      for (const p of defaultProducts) {
        await sequelize.query(`
          INSERT INTO InventoryItems 
            (ItemCode, ItemName, ItemType, Category, Unit, Quantity, MinQuantity, UnitCost, UnitPrice, DefaultOpeningQty, IsComplimentary, Status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
          ON DUPLICATE KEY UPDATE ItemName = VALUES(ItemName), UnitPrice = VALUES(UnitPrice)
        `, { replacements: p });
      }
      console.log('✅ Đã nạp 10 sản phẩm Minibar tiêu chuẩn vào InventoryItems');
    }

    console.log('✅ Migration 009 hoàn tất: Đã tích hợp Quản lý Minibar vào chuẩn 57 bảng.');
  },

  async down(queryInterface, Sequelize) {
    console.log('🗑️ Migration 009 rollback hoàn tất.');
  }
};
