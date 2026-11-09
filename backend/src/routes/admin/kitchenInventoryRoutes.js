'use strict';

const express = require('express');
const router = express.Router();
const kitchenInventoryController = require('../../controllers/admin/kitchenInventoryController');
const { verifyToken } = require('../../middlewares/authMiddleware');

// 1. Lấy danh sách nguyên liệu bếp kèm bộ lọc, thống kê và cảnh báo tồn kho
router.get('/ingredients', verifyToken, kitchenInventoryController.getKitchenIngredients);

// 1.1 Lấy mã nguyên liệu tiếp theo được tự động gợi ý tăng dần (ING-xxxx)
router.get('/ingredients/next-code', verifyToken, kitchenInventoryController.getNextIngredientCode);

// 2. Thêm mới nguyên liệu bếp (ItemType = 'Kitchen')
router.post('/ingredients', verifyToken, kitchenInventoryController.createKitchenIngredient);

// 3. Nhập kho nguyên liệu bếp (TransactionType = 'Import')
router.post('/ingredients/import', verifyToken, kitchenInventoryController.importStock);

// 4. Lấy lịch sử giao dịch kho nguyên liệu bếp
router.get('/ingredients/transactions', verifyToken, kitchenInventoryController.getTransactions);

// 5. Lấy danh sách món ăn bị ảnh hưởng khi nguyên liệu dưới ngưỡng an toàn (gợi ý Tạm hết)
router.get('/ingredients/affected-dishes', verifyToken, kitchenInventoryController.getAffectedDishes);

// 6. Gợi ý chuyển món ăn liên quan sang trạng thái 'OutOfStock' (Tạm hết)
router.post('/ingredients/mark-dishes-out-of-stock', verifyToken, kitchenInventoryController.markAffectedDishesOutOfStock);

module.exports = router;

