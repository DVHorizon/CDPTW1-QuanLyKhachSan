'use strict';

const { sequelize } = require('../src/models');

const kitchenItems = [
  { ItemCode: 'ING-0001', ItemName: 'Thịt Bò Wagyu Nhật Bản A5 (Tươi)', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 45.5, MinQuantity: 15.0, UnitCost: 3500000, Status: 'InStock' },
  { ItemCode: 'ING-0002', ItemName: 'Cá Tuyết Đại Tây Dương (Tươi fillet)', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 8.0, MinQuantity: 12.0, UnitCost: 850000, Status: 'LowStock' },
  { ItemCode: 'ING-0003', ItemName: 'Tôm Sú Biển Tươi Sống Phú Quốc', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 28.0, MinQuantity: 10.0, UnitCost: 420000, Status: 'InStock' },
  { ItemCode: 'ING-0004', ItemName: 'Nấm Cục Truffle Đen Périgord (Hũ)', ItemType: 'Kitchen', Unit: 'Hộp / Hũ', Quantity: 0.0, MinQuantity: 5.0, UnitCost: 1200000, Status: 'OutOfStock' },
  { ItemCode: 'ING-0005', ItemName: 'Bơ Lạt Cao Cấp Anchor New Zealand', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 35.0, MinQuantity: 10.0, UnitCost: 180000, Status: 'InStock' },
  { ItemCode: 'ING-0006', ItemName: 'Rượu Vang Đỏ Bordeaux Nấu Sốt Tiêu', ItemType: 'Kitchen', Unit: 'Chai (750ml)', Quantity: 18.0, MinQuantity: 6.0, UnitCost: 650000, Status: 'InStock' },
  { ItemCode: 'ING-0007', ItemName: 'Sốt Nấm Truffle Kem Tươi Đặc Chế', ItemType: 'Kitchen', Unit: 'Hộp (1L)', Quantity: 4.0, MinQuantity: 8.0, UnitCost: 320000, Status: 'LowStock' },
  { ItemCode: 'ING-0008', ItemName: 'Măng Tây Xanh & Rau Mầm Hữu Cơ Đà Lạt', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 22.0, MinQuantity: 8.0, UnitCost: 85000, Status: 'InStock' },
  { ItemCode: 'ING-0009', ItemName: 'Phô Mai Mascarpone Nhập Khẩu Ý', ItemType: 'Kitchen', Unit: 'Hộp (500g)', Quantity: 15.0, MinQuantity: 5.0, UnitCost: 145000, Status: 'InStock' },
  { ItemCode: 'ING-0010', ItemName: 'Nước Cốt Yuzu Tươi Nguyên Chất', ItemType: 'Kitchen', Unit: 'Chai (500ml)', Quantity: 12.0, MinQuantity: 4.0, UnitCost: 280000, Status: 'InStock' },
  { ItemCode: 'ING-0011', ItemName: 'Hạt Tiêu Chín Đỏ Phú Quốc Loại 1', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 10.0, MinQuantity: 3.0, UnitCost: 290000, Status: 'InStock' },
  { ItemCode: 'ING-0012', ItemName: 'Phô Mai Parmigiano Reggiano 24 Tháng', ItemType: 'Kitchen', Unit: 'Kilogram (KG)', Quantity: 6.5, MinQuantity: 5.0, UnitCost: 750000, Status: 'InStock' }
];

async function seed() {
  console.log('Seeding kitchen inventory...');
  for (const item of kitchenItems) {
    const [exist] = await sequelize.query('SELECT ItemId FROM InventoryItems WHERE ItemCode = ?', { replacements: [item.ItemCode] });
    if (exist.length === 0) {
      const [res] = await sequelize.query(`
        INSERT INTO InventoryItems (ItemCode, ItemName, ItemType, Unit, Quantity, MinQuantity, UnitCost, Status, IsDeleted, CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `, {
        replacements: [item.ItemCode, item.ItemName, item.ItemType, item.Unit, item.Quantity, item.MinQuantity, item.UnitCost, item.Status]
      });
      const insertedId = res;
      // Thêm giao dịch nhập kho ban đầu
      await sequelize.query(`
        INSERT INTO InventoryTransactions (ItemId, RoomId, UserId, TransactionType, Quantity, ReferenceId, TransactionDate, Note)
        VALUES (?, NULL, 1, 'Import', ?, NULL, NOW(), 'Nhập kho nguyên liệu đầu kỳ chuẩn bếp trưởng')
      `, { replacements: [insertedId, item.Quantity] });
    }
  }

  const [count] = await sequelize.query("SELECT COUNT(*) AS total FROM InventoryItems WHERE ItemType = 'Kitchen'");
  console.log('Seed completed! Total Kitchen Inventory Items:', count[0].total);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
