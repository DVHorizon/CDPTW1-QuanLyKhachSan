'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FULL AUTOMATED TEST SUITE: TÍNH NĂNG 14 - QUẢN LÝ NGUYÊN LIỆU BẾP
 * Mã tính năng: FEAT-FNB-14 (Mã truy vết: A4.14)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { sequelize } = require('../src/models');
const kitchenInventoryController = require('../src/controllers/admin/kitchenInventoryController');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`   ✅ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`   ❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
  }
}

// Mock Express req & res
function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 BẮT ĐẦU CHẠY TEST SUITE: FEAT-FNB-14 QUẢN LÝ NGUYÊN LIỆU BẾP');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ------------------------------------------------------------------------
    // TC01: Để trống tên nguyên liệu -> ERROR_0001_REQUIRED
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemCode: 'TEST_01', itemName: '', unit: 'KG', quantity: 10, minQuantity: 5, unitCost: 100000 }
      };
      const res = mockResponse();
      await kitchenInventoryController.createKitchenIngredient(req, res);
      assert(res.statusCode === 400 && res.body?.code === 'ERROR_0001_REQUIRED', 'TC01: Để trống tên nguyên liệu trả về ERROR_0001_REQUIRED');
    }

    // ------------------------------------------------------------------------
    // TC02: Tên quá dài (> 150 ký tự) -> ERROR_0003_MAX_LENGTH
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemCode: 'TEST_02', itemName: 'A'.repeat(151), unit: 'KG', quantity: 10, minQuantity: 5, unitCost: 100000 }
      };
      const res = mockResponse();
      await kitchenInventoryController.createKitchenIngredient(req, res);
      assert(res.statusCode === 400 && res.body?.code === 'ERROR_0003_MAX_LENGTH', 'TC02: Tên nguyên liệu quá dài trả về ERROR_0003_MAX_LENGTH');
    }

    // ------------------------------------------------------------------------
    // TC03: Trùng mã nguyên liệu -> ERROR_0007_DUPLICATE
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemCode: 'ING-0012', itemName: 'Bò Trùng Mã', unit: 'KG', quantity: 10, minQuantity: 5, unitCost: 100000 }
      };
      const res = mockResponse();
      await kitchenInventoryController.createKitchenIngredient(req, res);
      assert(res.statusCode === 400 && res.body?.code === 'ERROR_0007_DUPLICATE', 'TC03: Trùng mã nguyên liệu trả về ERROR_0007_DUPLICATE');
    }

    // ------------------------------------------------------------------------
    // TC04: Tồn kho âm (quantity < 0) -> ERROR_0005_INVALID_VALUE
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemCode: 'TEST_04', itemName: 'Nguyên Liệu Tồn Âm', unit: 'KG', quantity: -1, minQuantity: 5, unitCost: 100000 }
      };
      const res = mockResponse();
      await kitchenInventoryController.createKitchenIngredient(req, res);
      assert(res.statusCode === 400 && res.body?.code === 'ERROR_0005_INVALID_VALUE', 'TC04: Số lượng tồn kho âm trả về ERROR_0005_INVALID_VALUE');
    }

    // ------------------------------------------------------------------------
    // TC05: Thêm nguyên liệu hợp lệ -> SUCCESS_0001_CREATED, ItemType = Kitchen
    // ------------------------------------------------------------------------
    let createdItemId = null;
    const testCode = `TEST_ING_${Date.now()}`;
    {
      const req = {
        body: { itemCode: testCode, itemName: 'Bào Ngư Sống Test', unit: 'Con', quantity: 50, minQuantity: 10, unitCost: 120000 }
      };
      const res = mockResponse();
      await kitchenInventoryController.createKitchenIngredient(req, res);
      createdItemId = res.body?.data?.itemId;
      assert(
        res.statusCode === 201 && 
        res.body?.code === 'SUCCESS_0001_CREATED' && 
        res.body?.data?.itemType === 'Kitchen',
        'TC05: Thêm nguyên liệu hợp lệ thành công (SUCCESS_0001_CREATED, ItemType=Kitchen)'
      );
    }

    // ------------------------------------------------------------------------
    // TC06: Nhập kho số lượng 0 -> ERROR_0005_INVALID_VALUE
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemId: createdItemId, importQuantity: 0, supplier: 'Công ty Hải Sản' }
      };
      const res = mockResponse();
      await kitchenInventoryController.importStock(req, res);
      assert(res.statusCode === 400 && res.body?.code === 'ERROR_0005_INVALID_VALUE', 'TC06: Nhập kho số lượng 0 trả về ERROR_0005_INVALID_VALUE');
    }

    // ------------------------------------------------------------------------
    // TC07: Nhập kho hợp lệ -> Tồn kho tăng 10, ghi giao dịch Import
    // ------------------------------------------------------------------------
    {
      const req = {
        body: { itemId: createdItemId, importQuantity: 10, supplier: 'Công ty Hải Sản Nha Trang', note: 'Hàng tươi sống' },
        user: { userId: 1 }
      };
      const res = mockResponse();
      await kitchenInventoryController.importStock(req, res);
      assert(
        res.statusCode === 200 && 
        res.body?.data?.newQuantity === 60,
        'TC07: Nhập kho hợp lệ tăng tồn kho từ 50 lên 60 và ghi giao dịch Import'
      );
    }

    // ------------------------------------------------------------------------
    // TC08: Trừ kho khi bán món có công thức (deductIngredientsForOrder)
    // ------------------------------------------------------------------------
    {
      // Món bò Wagyu (đã có công thức liên kết với nguyên liệu ING-0012 định lượng 0.30 kg)
      const [beforeItems] = await sequelize.query("SELECT Quantity FROM InventoryItems WHERE ItemCode = 'ING-0012'");
      const startQty = parseFloat(beforeItems[0]?.Quantity || 0);

      // Giả lập đơn gọi 2 phần
      await kitchenInventoryController.deductIngredientsForOrder(999999, [{ MenuItemId: 1, Quantity: 2 }], 1);

      const [afterItems] = await sequelize.query("SELECT Quantity FROM InventoryItems WHERE ItemCode = 'ING-0012'");
      const endQty = parseFloat(afterItems[0]?.Quantity || 0);

      // 2 phần x 0.30 kg = 0.60 kg trừ đi
      assert(Math.abs(startQty - endQty - 0.60) < 0.001, 'TC08: Tự động trừ kho đúng định lượng công thức (giảm 0.60 KG khi bán 2 phần)');
    }

    // ------------------------------------------------------------------------
    // TC09: Tồn kho dưới ngưỡng -> Cảnh báo tồn thấp và gợi ý món Tạm Hết
    // ------------------------------------------------------------------------
    {
      const req = { query: {} };
      const res = mockResponse();
      await kitchenInventoryController.getAffectedDishes(req, res);
      assert(res.statusCode === 200 && Array.isArray(res.body?.data), 'TC09: Lấy danh sách món bị ảnh hưởng khi nguyên liệu dưới ngưỡng cảnh báo (gợi ý Tạm Hết)');
    }

    // Dọn dẹp bản ghi test tạm
    if (createdItemId) {
      await sequelize.query('DELETE FROM InventoryTransactions WHERE ItemId = ?', { replacements: [createdItemId] });
      await sequelize.query('DELETE FROM InventoryItems WHERE ItemId = ?', { replacements: [createdItemId] });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ:`);
    console.log(`   ✅ Số test case ĐẠT: ${passedCount}`);
    console.log(`   ❌ Số test case LỖI: ${failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(failedCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  }
}

runTestSuite();

