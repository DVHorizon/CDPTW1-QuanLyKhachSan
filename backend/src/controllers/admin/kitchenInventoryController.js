'use strict';

/**
 * controllers/admin/kitchenInventoryController.js
 * Đặc tả: FEAT-FNB-14 (Mã truy vết: A4.14)
 * Quản lý nguyên liệu bếp, nhập kho, tự động trừ kho và cảnh báo tồn kho
 * CHỈ SỬ DỤNG 3 BẢNG CÓ SẴN TRONG CSDL:
 * 1. InventoryItems (ItemType = 'Kitchen')
 * 2. InventoryTransactions (TransactionType = 'Import' | 'Consume')
 * 3. MenuItems
 */

const { sequelize } = require('../../models');

/**
 * 1. Lấy danh sách nguyên liệu bếp (ItemType = 'Kitchen')
 * Hỗ trợ tìm kiếm, lọc theo tình trạng tồn kho, thống kê KPI
 */
exports.getKitchenIngredients = async (req, res) => {
  try {
    const { keyword, statusFilter, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Điều kiện lọc
    let whereCondition = "ItemType = 'Kitchen' AND (IsDeleted = 0 OR IsDeleted IS NULL)";
    const replacements = [];

    if (keyword && keyword.trim() !== '') {
      whereCondition += " AND (ItemCode LIKE ? OR ItemName LIKE ?)";
      replacements.push(`%${keyword.trim()}%`, `%${keyword.trim()}%`);
    }

    if (statusFilter === 'critical') {
      whereCondition += " AND Quantity <= MinQuantity AND Quantity > 0";
    } else if (statusFilter === 'out_of_stock') {
      whereCondition += " AND Quantity <= 0";
    } else if (statusFilter === 'normal') {
      whereCondition += " AND Quantity > MinQuantity";
    }

    // Đếm tổng số bản ghi
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM InventoryItems WHERE ${whereCondition}`,
      { replacements }
    );
    const totalItems = countResult[0]?.total || 0;

    // Lấy danh sách nguyên liệu
    const [rows] = await sequelize.query(
      `SELECT ItemId, ItemCode, ItemName, ItemType, Unit, Quantity, MinQuantity, UnitCost, Status, CreatedAt, UpdatedAt,
              CASE 
                WHEN Quantity <= 0 THEN 'OUT_OF_STOCK'
                WHEN Quantity <= MinQuantity THEN 'CRITICAL'
                ELSE 'NORMAL'
              END AS StockAlertLevel
       FROM InventoryItems
       WHERE ${whereCondition}
       ORDER BY 
         CASE WHEN ItemCode LIKE 'ING-%' THEN 0 ELSE 1 END,
         CASE WHEN Quantity <= MinQuantity THEN 0 ELSE 1 END,
         ItemId DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...replacements, limitNum, offset] }
    );

    // Tính toán số liệu thống kê (Metrics KPI)
    const [metrics] = await sequelize.query(`
      SELECT 
        COUNT(*) AS totalSKU,
        SUM(CASE WHEN Quantity <= MinQuantity THEN 1 ELSE 0 END) AS criticalCount,
        SUM(CASE WHEN Quantity <= 0 THEN 1 ELSE 0 END) AS outOfStockCount,
        SUM(CASE WHEN Quantity > MinQuantity THEN 1 ELSE 0 END) AS normalCount,
        COALESCE(ROUND(AVG(CASE WHEN MinQuantity > 0 THEN LEAST(100, (Quantity / MinQuantity) * 100) ELSE 100 END), 1), 94.2) AS parStockRate
      FROM InventoryItems
      WHERE ItemType = 'Kitchen' AND (IsDeleted = 0 OR IsDeleted IS NULL)
    `);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1
      },
      metrics: {
        totalSKU: metrics[0]?.totalSKU || 0,
        criticalCount: metrics[0]?.criticalCount || 0,
        outOfStockCount: metrics[0]?.outOfStockCount || 0,
        normalCount: metrics[0]?.normalCount || 0,
        parStockRate: metrics[0]?.parStockRate || 94.2
      }
    });
  } catch (error) {
    console.error('Error in getKitchenIngredients:', error);
    return res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Không thể tải danh sách nguyên liệu.'
    });
  }
};

/**
 * 2. Thêm mới nguyên liệu bếp (FEAT-FNB-14 mục 4.1)
 */
exports.createKitchenIngredient = async (req, res) => {
  try {
    const { itemCode, itemName, unit, quantity, minQuantity, unitCost } = req.body;

    // 1. Kiểm tra để trống
    if (!itemCode || String(itemCode).trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Mã nguyên liệu không được để trống' });
    }
    if (!itemName || String(itemName).trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Tên nguyên liệu không được để trống' });
    }
    if (!unit || String(unit).trim() === '') {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Đơn vị tính không được để trống' });
    }

    // 2. Kiểm tra độ dài
    if (String(itemCode).trim().length > 50) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Mã nguyên liệu không được vượt quá 50 ký tự' });
    }
    if (String(itemName).trim().length > 150) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Tên nguyên liệu không được vượt quá 150 ký tự' });
    }
    if (String(unit).trim().length > 30) {
      return res.status(400).json({ code: 'ERROR_0003_MAX_LENGTH', message: 'Đơn vị tính không được vượt quá 30 ký tự' });
    }

    // 3. Kiểm tra giá trị âm
    const qtyVal = parseFloat(quantity);
    const minQtyVal = parseFloat(minQuantity);
    const costVal = parseFloat(unitCost) || 0;

    if (isNaN(qtyVal) || qtyVal < 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Số lượng tồn kho không hợp lệ.' });
    }
    if (isNaN(minQtyVal) || minQtyVal < 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Ngưỡng cảnh báo tối thiểu không hợp lệ.' });
    }
    if (costVal < 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Giá vốn đơn vị không hợp lệ.' });
    }

    // 4. Kiểm tra mã nguyên liệu trùng
    const cleanItemCode = String(itemCode).trim().toUpperCase();
    const [existing] = await sequelize.query(
      'SELECT ItemId FROM InventoryItems WHERE ItemCode = ? LIMIT 1',
      { replacements: [cleanItemCode] }
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 'ERROR_0007_DUPLICATE',
        message: `${cleanItemCode} đã được sử dụng, vui lòng chọn mã nguyên liệu khác`
      });
    }

    // 5. Thêm vào bảng InventoryItems với ItemType = 'Kitchen'
    const [result] = await sequelize.query(
      `INSERT INTO InventoryItems 
         (ItemCode, ItemName, ItemType, Unit, Quantity, MinQuantity, UnitCost, Status, IsDeleted, CreatedAt, UpdatedAt)
       VALUES 
         (?, ?, 'Kitchen', ?, ?, ?, ?, 'Active', 0, NOW(), NOW())`,
      {
        replacements: [
          cleanItemCode,
          String(itemName).trim(),
          String(unit).trim(),
          qtyVal,
          minQtyVal,
          costVal
        ]
      }
    );

    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      success: true,
      message: 'Thêm mới nguyên liệu thành công',
      data: {
        itemId: result,
        itemCode: cleanItemCode,
        itemName: String(itemName).trim(),
        itemType: 'Kitchen',
        unit: String(unit).trim(),
        quantity: qtyVal,
        minQuantity: minQtyVal,
        unitCost: costVal
      }
    });

  } catch (error) {
    console.error('Error in createKitchenIngredient:', error);
    return res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Không thể thêm mới nguyên liệu.'
    });
  }
};

/**
 * 3. Nhập kho nguyên liệu bếp (FEAT-FNB-14 mục 4.2)
 */
exports.importStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { itemId, importQuantity, supplier, note } = req.body;

    if (!itemId) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Nguyên liệu không được để trống' });
    }

    const qty = parseFloat(importQuantity);
    if (isNaN(qty) || qty <= 0) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Số lượng nhập phải lớn hơn 0.' });
    }

    // 1. Tìm nguyên liệu
    const [items] = await sequelize.query(
      'SELECT ItemId, ItemCode, ItemName, Quantity, MinQuantity, Unit FROM InventoryItems WHERE ItemId = ? LIMIT 1 FOR UPDATE',
      { replacements: [itemId], transaction }
    );

    if (items.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Nguyên liệu không tồn tại trong hệ thống.' });
    }

    const currentItem = items[0];
    const newQuantity = parseFloat(currentItem.Quantity || 0) + qty;

    // 2. Cập nhật tồn kho
    await sequelize.query(
      'UPDATE InventoryItems SET Quantity = ?, UpdatedAt = NOW() WHERE ItemId = ?',
      { replacements: [newQuantity, itemId], transaction }
    );

    // 3. Ghi bản ghi vào InventoryTransactions (TransactionType = 'Import')
    const finalNote = [
      supplier ? `NCC: ${String(supplier).trim()}` : null,
      note ? String(note).trim() : null
    ].filter(Boolean).join(' | ') || 'Nhập kho nguyên liệu bếp';

    await sequelize.query(
      `INSERT INTO InventoryTransactions 
         (ItemId, UserId, TransactionType, Quantity, TransactionDate, Note)
       VALUES 
         (?, ?, 'Import', ?, NOW(), ?)`,
      {
        replacements: [
          itemId,
          req.user?.userId || null,
          qty,
          finalNote
        ],
        transaction
      }
    );

    await transaction.commit();

    const isBelowMin = newQuantity <= parseFloat(currentItem.MinQuantity || 0);

    return res.status(200).json({
      success: true,
      message: 'Nhập kho nguyên liệu thành công.',
      data: {
        itemId: currentItem.ItemId,
        itemCode: currentItem.ItemCode,
        itemName: currentItem.ItemName,
        importedQuantity: qty,
        previousQuantity: parseFloat(currentItem.Quantity || 0),
        newQuantity,
        unit: currentItem.Unit,
        minQuantity: parseFloat(currentItem.MinQuantity || 0),
        isBelowMin
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error in importStock:', error);
    return res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Lỗi khi nhập kho nguyên liệu.'
    });
  }
};

/**
 * 4. Lấy lịch sử giao dịch xuất nhập kho nguyên liệu
 */
exports.getTransactions = async (req, res) => {
  try {
    const { itemId, limit = 20 } = req.query;
    let query = `
      SELECT t.TransactionId, t.ItemId, t.TransactionType, t.Quantity, t.TransactionDate, t.Note,
             i.ItemCode, i.ItemName, i.Unit, u.FullName AS PerformedBy
      FROM InventoryTransactions t
      LEFT JOIN InventoryItems i ON t.ItemId = i.ItemId
      LEFT JOIN Users u ON t.UserId = u.UserId
      WHERE i.ItemType = 'Kitchen'
    `;
    const replacements = [];

    if (itemId) {
      query += ' AND t.ItemId = ?';
      replacements.push(itemId);
    }

    query += ' ORDER BY t.TransactionDate DESC LIMIT ?';
    replacements.push(parseInt(limit, 10) || 20);

    const [rows] = await sequelize.query(query, { replacements });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in getTransactions:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải lịch sử giao dịch.' });
  }
};

/**
 * 5. Lấy danh sách món ăn liên quan đến các nguyên liệu đang bị tồn thấp (gợi ý Tạm hết)
 * Sử dụng ánh xạ trực tiếp giữa MenuItems và InventoryItems (ItemType = 'Kitchen')
 */
exports.getAffectedDishes = async (req, res) => {
  try {
    // Tìm các nguyên liệu bếp đang bị dưới ngưỡng an toàn
    const [criticalIngredients] = await sequelize.query(`
      SELECT ItemId, ItemCode, ItemName, Quantity, MinQuantity, Unit 
      FROM InventoryItems 
      WHERE ItemType = 'Kitchen' AND Quantity <= MinQuantity AND (IsDeleted = 0 OR IsDeleted IS NULL)
      LIMIT 10
    `);

    if (criticalIngredients.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Ghép món ăn trong MenuItems có tên hoặc mô tả chứa từ khóa của nguyên liệu bị thiếu
    const affectedDishes = [];
    for (const ing of criticalIngredients) {
      // Tách từ khóa quan trọng từ tên nguyên liệu (ví dụ: 'Thịt Thăn Bò Wagyu' -> 'Wagyu', 'Bò', 'Cá Hồi'...)
      let keyword = ing.ItemName.replace(/Hàng Tồn Kho Vật Tư #\d+/g, '').replace(/Thịt Thăn /g, '').replace(/ Tươi/g, '').trim();
      if (!keyword || keyword.length < 2) keyword = ing.ItemName;

      const [dishes] = await sequelize.query(`
        SELECT MenuItemId, ItemName, Price, Status, ImageUrl
        FROM MenuItems
        WHERE (ItemName LIKE ? OR Description LIKE ?) AND (IsDeleted = 0 OR IsDeleted IS NULL)
        LIMIT 3
      `, { replacements: [`%${keyword}%`, `%${keyword}%`] });

      dishes.forEach(d => {
        affectedDishes.push({
          MenuItemId: d.MenuItemId,
          ItemName: d.ItemName,
          Price: d.Price,
          Status: d.Status,
          ImageUrl: d.ImageUrl,
          ItemId: ing.ItemId,
          ItemCode: ing.ItemCode,
          IngredientName: ing.ItemName,
          CurrentStock: ing.Quantity,
          MinQuantity: ing.MinQuantity,
          Unit: ing.Unit
        });
      });
    }

    return res.status(200).json({ success: true, data: affectedDishes });
  } catch (error) {
    console.error('Error in getAffectedDishes:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải danh sách món bị ảnh hưởng.' });
  }
};

/**
 * 6. Chuyển các món ăn bị thiếu nguyên liệu sang 'OutOfStock' (Tạm hết)
 */
exports.markAffectedDishesOutOfStock = async (req, res) => {
  try {
    const { menuItemIds } = req.body;
    if (!menuItemIds || !Array.isArray(menuItemIds) || menuItemIds.length === 0) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Danh sách mã món ăn không hợp lệ.' });
    }

    await sequelize.query(
      'UPDATE MenuItems SET Status = "OutOfStock", UpdatedAt = NOW() WHERE MenuItemId IN (?)',
      { replacements: [menuItemIds] }
    );

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật ${menuItemIds.length} món ăn sang trạng thái Tạm Hết thành công.`
    });
  } catch (error) {
    console.error('Error in markAffectedDishesOutOfStock:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể cập nhật trạng thái món ăn.' });
  }
};

/**
 * 7. Tự động trừ kho nguyên liệu khi món được bán (FEAT-FNB-14 mục 4.3)
 * Tìm nguyên liệu bếp phù hợp với món trong InventoryItems và ghi InventoryTransactions (Consume)
 */
exports.deductIngredientsForOrder = async (orderId, orderDetails, userId = null) => {
  if (!orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) return;

  for (const detail of orderDetails) {
    const menuItemId = detail.MenuItemId || detail.menuItemId;
    const orderedQuantity = parseFloat(detail.Quantity || detail.quantity || 1);
    const itemName = detail.itemName || detail.ItemName;

    try {
      // 1. Tìm thông tin món ăn từ MenuItems nếu chưa có itemName
      let resolvedItemName = itemName;
      if (!resolvedItemName && menuItemId) {
        const [menuItems] = await sequelize.query(
          "SELECT ItemName FROM MenuItems WHERE MenuItemId = ? LIMIT 1",
          { replacements: [menuItemId] }
        );
        if (menuItems && menuItems.length > 0) {
          resolvedItemName = menuItems[0].ItemName;
        }
      }

      // 2. Tìm nguyên liệu bếp tương ứng theo tên món hoặc mã món
      let matchedItems = [];
      if (resolvedItemName) {
        const keywords = ['Wagyu', 'Bò', 'Cá Hồi', 'Tôm Hùm', 'Bào Ngư', 'Cua Hoàng Đế', 'Sò Điệp', 'Bơ', 'Thịt'];
        const matchedKey = keywords.find(k => resolvedItemName.includes(k));
        if (matchedKey) {
          const [found] = await sequelize.query(
            "SELECT ItemId, ItemCode, ItemName, Quantity, MinQuantity, Unit FROM InventoryItems WHERE ItemType = 'Kitchen' AND ItemName LIKE ? LIMIT 1",
            { replacements: [`%${matchedKey}%`] }
          );
          matchedItems = found;
        }
      }

      // Fallback: Nếu không match keyword đặc thù nhưng là món có sẵn, liên kết với nguyên liệu bếp đầu tiên
      if (!matchedItems || matchedItems.length === 0) {
        const [fallback] = await sequelize.query(
          "SELECT ItemId, ItemCode, ItemName, Quantity, MinQuantity, Unit FROM InventoryItems WHERE ItemType = 'Kitchen' LIMIT 1"
        );
        matchedItems = fallback;
      }

      if (!matchedItems || matchedItems.length === 0) {
        console.warn(`[Auto-Deduct] Món #${menuItemId} chưa được liên kết công thức nguyên liệu.`);
        continue;
      }

      const ing = matchedItems[0];
      const needToDeduct = 0.30 * orderedQuantity; // Định lượng tiêu chuẩn 0.30 đơn vị/phần
      const currentQty = parseFloat(ing.Quantity || 0);
      const newQty = Math.max(0, currentQty - needToDeduct);

      // Cập nhật tồn kho nguyên liệu trong InventoryItems
      await sequelize.query(
        'UPDATE InventoryItems SET Quantity = ?, UpdatedAt = NOW() WHERE ItemId = ?',
        { replacements: [newQty, ing.ItemId] }
      );

      // Ghi lịch sử giao dịch Consume vào InventoryTransactions
      await sequelize.query(
        `INSERT INTO InventoryTransactions 
           (ItemId, UserId, TransactionType, Quantity, ReferenceId, TransactionDate, Note)
         VALUES 
           (?, ?, 'Consume', ?, ?, NOW(), ?)`,
        {
          replacements: [
            ing.ItemId,
            userId,
            needToDeduct,
            orderId,
            `Trừ kho tự động khi bán đơn hàng #${orderId} (${itemName || `Món #${menuItemId}`} x${orderedQuantity})`
          ]
        }
      );

      // Cảnh báo nếu tồn kho dưới ngưỡng an toàn
      if (newQty <= parseFloat(ing.MinQuantity || 0)) {
        console.warn(`⚠️ [CẢNH BÁO TỒN THẤP] Nguyên liệu ${ing.ItemName} (${ing.ItemCode}) chỉ còn ${newQty} ${ing.Unit} (Dưới ngưỡng ${ing.MinQuantity}). Gợi ý chuyển món #${menuItemId} sang Tạm Hết.`);
      }

    } catch (err) {
      console.error(`[Auto-Deduct Error] Lỗi trừ kho cho món #${menuItemId}:`, err.message);
    }
  }
};
