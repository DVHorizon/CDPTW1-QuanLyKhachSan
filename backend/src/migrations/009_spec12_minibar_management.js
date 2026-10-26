'use strict';

/**
 * Migration 009 – Bổ sung schema Quản lý Minibar phòng (FEAT-MINIBAR-01) theo Spec 12
 * Tạo các bảng:
 * - MinibarProducts: Danh mục sản phẩm minibar tiêu chuẩn, đơn giá, số lượng nạp mặc định
 * - MinibarInspections: Phiên kiểm kê minibar gắn với lượt lưu trú Stay
 * - MinibarInspectionLines: Chi tiết từng dòng sản phẩm được kiểm đếm
 * - MinibarInspectionEvents: Nhật ký sự kiện kiểm kê (Audit Log)
 */

const pool = require('../config/db');

async function up() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. MinibarProducts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS MinibarProducts (
        ProductId INT AUTO_INCREMENT PRIMARY KEY,
        ProductCode VARCHAR(50) NOT NULL UNIQUE,
        ProductName VARCHAR(150) NOT NULL,
        Category VARCHAR(50) DEFAULT 'Beverage',
        Unit VARCHAR(30) DEFAULT 'Lon',
        UnitPrice DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
        DefaultOpeningQty DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
        IsComplimentary TINYINT(1) DEFAULT 0,
        ImageUrl VARCHAR(500) NULL,
        IsActive TINYINT(1) DEFAULT 1,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. MinibarInspections
    await conn.query(`
      CREATE TABLE IF NOT EXISTS MinibarInspections (
        InspectionId INT AUTO_INCREMENT PRIMARY KEY,
        StayId INT NOT NULL,
        RoomId INT NOT NULL,
        Status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        Version INT NOT NULL DEFAULT 1,
        CheckedBy INT NULL,
        CheckedByName VARCHAR(100) NULL,
        CheckedAt DATETIME NULL,
        ConfirmedBy INT NULL,
        ConfirmedByName VARCHAR(100) NULL,
        ConfirmedAt DATETIME NULL,
        TotalConsumedQty DECIMAL(10, 2) DEFAULT 0.00,
        Subtotal DECIMAL(18, 2) DEFAULT 0.00,
        TaxRate DECIMAL(5, 2) DEFAULT 10.00,
        TaxAmount DECIMAL(18, 2) DEFAULT 0.00,
        TotalAmount DECIMAL(18, 2) DEFAULT 0.00,
        Notes VARCHAR(500) NULL,
        OverrideReason VARCHAR(255) NULL,
        OverrideBy INT NULL,
        IdempotencyKey VARCHAR(100) NULL UNIQUE,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_minibar_stay (StayId),
        INDEX idx_minibar_room (RoomId),
        INDEX idx_minibar_status (Status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. MinibarInspectionLines
    await conn.query(`
      CREATE TABLE IF NOT EXISTS MinibarInspectionLines (
        LineId INT AUTO_INCREMENT PRIMARY KEY,
        InspectionId INT NOT NULL,
        ProductId INT NULL,
        ProductName VARCHAR(150) NOT NULL,
        Category VARCHAR(50) DEFAULT 'Beverage',
        Unit VARCHAR(30) DEFAULT 'Lon',
        OpeningQty DECIMAL(10, 2) DEFAULT 0.00,
        ReplenishedQty DECIMAL(10, 2) DEFAULT 0.00,
        RemainingQty DECIMAL(10, 2) DEFAULT 0.00,
        ComplimentaryQty DECIMAL(10, 2) DEFAULT 0.00,
        ConsumedQty DECIMAL(10, 2) DEFAULT 0.00,
        BillableQty DECIMAL(10, 2) DEFAULT 0.00,
        UnitPrice DECIMAL(18, 2) DEFAULT 0.00,
        LineAmount DECIMAL(18, 2) DEFAULT 0.00,
        VarianceReason VARCHAR(50) DEFAULT 'GUEST_CONSUMED',
        IsException TINYINT(1) DEFAULT 0,
        Status VARCHAR(30) DEFAULT 'DRAFT',
        Notes VARCHAR(255) NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_line_inspection (InspectionId),
        INDEX idx_line_product (ProductId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. MinibarInspectionEvents
    await conn.query(`
      CREATE TABLE IF NOT EXISTS MinibarInspectionEvents (
        EventId INT AUTO_INCREMENT PRIMARY KEY,
        InspectionId INT NOT NULL,
        StayId INT NOT NULL,
        ActionType VARCHAR(50) NOT NULL,
        UserId INT NULL,
        UserName VARCHAR(100) NULL,
        OldValues TEXT NULL,
        NewValues TEXT NULL,
        Reason VARCHAR(255) NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_inspection (InspectionId),
        INDEX idx_event_stay (StayId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default standard luxury minibar products if table empty
    const [countRows] = await conn.query('SELECT COUNT(*) as cnt FROM MinibarProducts');
    if (countRows[0].cnt === 0) {
      const defaultProducts = [
        ['MB-EVIAN', 'Nước khoáng thiên nhiên Evian 750ml', 'Beverage', 'Chai', 80000, 2, 0],
        ['MB-COKE', 'Nước ngọt Coca-Cola lon 330ml', 'Beverage', 'Lon', 45000, 2, 0],
        ['MB-BEER', 'Bia thủ công IPA Heart of Darkness 330ml', 'Alcohol', 'Lon', 95000, 2, 0],
        ['MB-WINE', 'Rượu vang đỏ Chile Reserva Mini 187ml', 'Alcohol', 'Chai', 220000, 1, 0],
        ['MB-CHAMP', 'Rượu sâm banh Moët & Chandon Brut Imperial 375ml', 'Alcohol', 'Chai', 850000, 1, 0],
        ['MB-ALMOND', 'Hạnh nhân rang muối thượng hạng Blue Diamond 150g', 'Snack', 'Hộp', 120000, 1, 0],
        ['MB-CASHEW', 'Hạt điều rang củi Bình Phước hộp thiếc 150g', 'Snack', 'Hộp', 110000, 1, 0],
        ['MB-CHIPS', 'Snack khoai tây lon Pringles Original 107g', 'Snack', 'Ống', 65000, 1, 0],
        ['MB-CHOC', 'Sô-cô-la Ferrero Rocher hộp 8 viên', 'Snack', 'Hộp', 135000, 1, 0],
        ['MB-NESP', 'Viên nén cà phê Nespresso Master Origin', 'CoffeeTea', 'Viên', 0, 4, 1]
      ];

      for (const p of defaultProducts) {
        await conn.query(`
          INSERT INTO MinibarProducts (ProductCode, ProductName, Category, Unit, UnitPrice, DefaultOpeningQty, IsComplimentary)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, p);
      }
      console.log('✅ Đã nạp 10 sản phẩm Minibar tiêu chuẩn');
    }

    await conn.commit();
    console.log('✅ Migration 009 hoàn tất: Đã tạo các bảng Minibar theo Spec 12');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Migration 009 lỗi:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up };
