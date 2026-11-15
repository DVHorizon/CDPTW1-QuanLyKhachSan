const { sequelize } = require('../models');

/**
 * Tra cứu danh sách các mã MenuItemId không đủ nguyên liệu chế biến
 * dựa trên bảng nguyên liệu bếp InventoryItems (ItemType = 'Kitchen').
 * Nếu nguyên liệu bị hết hàng (Quantity <= 0) hoặc bị khóa/xóa, các món dùng nguyên liệu đó
 * sẽ được xác định là OutOfStock / Tạm hết nguyên liệu.
 */
const KEYWORD_MAP = {
  'Wagyu': ['Wagyu', 'Bò'],
  'Cá Hồi': ['Cá Hồi', 'Salad'],
  'Tôm Hùm': ['Tôm Hùm', 'Tôm'],
  'Bào Ngư': ['Bào Ngư', 'Súp'],
  'Cua Hoàng Đế': ['Cua Hoàng Đế', 'Cua'],
  'Nấm Truffle': ['Truffle', 'Nấm', 'Bò', 'Salad'],
  'Sò Điệp': ['Sò Điệp', 'Hải Sản'],
  'Bơ': ['Bánh', 'Tiramisu']
};

async function getOutOfStockDishIds() {
  try {
    const [criticalIngredients] = await sequelize.query(`
      SELECT ItemId, ItemCode, ItemName, Quantity, MinQuantity, Unit 
      FROM InventoryItems 
      WHERE ItemType = 'Kitchen' 
        AND (Quantity <= 0 OR Status NOT IN ('Available', 'Active') OR IsDeleted = 1)
    `);

    if (!criticalIngredients || criticalIngredients.length === 0) {
      return new Set();
    }

    const outDishIds = new Set();

    for (const ing of criticalIngredients) {
      let matchedSearchKeys = [];
      for (const [key, searchKeys] of Object.entries(KEYWORD_MAP)) {
        if (ing.ItemName && ing.ItemName.includes(key)) {
          matchedSearchKeys = searchKeys;
          break;
        }
      }

      if (matchedSearchKeys.length === 0 && ing.ItemName) {
        matchedSearchKeys = [ing.ItemName.split(' ')[0]];
      }

      if (matchedSearchKeys.length > 0) {
        const orClauses = matchedSearchKeys.map(() => 'ItemName LIKE ?').join(' OR ');
        const replacements = matchedSearchKeys.map(k => `%${k}%`);
        const [dishes] = await sequelize.query(`
          SELECT MenuItemId FROM MenuItems WHERE (${orClauses}) AND (IsDeleted = 0 OR IsDeleted IS NULL)
        `, { replacements });

        dishes.forEach(d => outDishIds.add(Number(d.MenuItemId)));
      }
    }

    return outDishIds;
  } catch (error) {
    console.error('Error in getOutOfStockDishIds:', error.message);
    return new Set();
  }
}

module.exports = {
  getOutOfStockDishIds,
  KEYWORD_MAP
};

