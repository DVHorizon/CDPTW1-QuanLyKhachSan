const {
  sequelize,
  InventoryItem,
  InventoryBatch,
  LinenItem,
  LaundryBatch
} = require('../models');
const { Op } = require('sequelize');

// Khởi tạo bảng và nạp dữ liệu mẫu ban đầu khớp 100% với 2 ảnh
async function initHousekeepingDatabase() {
  try {
    await InventoryItem.sync({ alter: true });
    await InventoryBatch.sync({ alter: true });
    await LinenItem.sync({ alter: true });
    await LaundryBatch.sync({ alter: true });

    // 1. Seed Inventory Items (Kho đồ tiêu hao & Minibar - Ảnh 1)
    const countItems = await InventoryItem.count();
    if (countItems === 0) {
      const items = await InventoryItem.bulkCreate([
        {
          SKU: 'SKU-MB-001',
          ItemName: 'Nước Evian Thủy Tinh 750ml',
          Category: 'Minibar',
          Supplier: 'Danone Waters • Alpine Beverages Group',
          Location: 'Kho A-04',
          CurrentStock: 142,
          ParStock: 300,
          MinAlertLevel: 150,
          CostPrice: 1.20,
          SellingPrice: 6.00,
          ImageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Kho lạnh: 3.8°C Chuẩn'
        },
        {
          SKU: 'SKU-BA-014',
          ItemName: 'Dầu Gội & Sữa Tắm Bergamot 100ml',
          Category: 'Bath Amenities',
          Supplier: 'Botanica Labs',
          Location: 'Kệ C-12',
          CurrentStock: 38,
          ParStock: 100,
          MinAlertLevel: 50,
          CostPrice: 0.85,
          SellingPrice: 0.00, // Miễn phí tiêu hao buồng phòng
          ImageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Nhiệt độ phòng (22-25°C)'
        },
        {
          SKU: 'SKU-MB-008',
          ItemName: 'Hạt Điều Rang Muối Artisan 150g',
          Category: 'Minibar',
          Supplier: 'Valley Specialty',
          Location: 'Kho A-02',
          CurrentStock: 85,
          ParStock: 150,
          MinAlertLevel: 70,
          CostPrice: 2.10,
          SellingPrice: 8.00,
          ImageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Khô ráo, thoáng mát'
        },
        {
          SKU: 'SKU-DG-022',
          ItemName: 'Cà Phê Nespresso Ristretto (Lốc 10)',
          Category: 'Nespresso/Trà',
          Supplier: 'Nestle Pro',
          Location: 'Kệ B-01',
          CurrentStock: 12,
          ParStock: 50,
          MinAlertLevel: 25,
          CostPrice: 0.65,
          SellingPrice: 0.00,
          ImageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Tiêu chuẩn khô'
        },
        {
          SKU: 'SKU-BA-003',
          ItemName: 'Bộ Bàn Chải Tre Sinh Thái & Kem',
          Category: 'Bath Amenities',
          Supplier: 'Eco-Hospitality',
          Location: 'Kho C-08',
          CurrentStock: 320,
          ParStock: 300,
          MinAlertLevel: 100,
          CostPrice: 0.40,
          SellingPrice: 0.00,
          ImageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Kho khô ráo'
        },
        {
          SKU: 'SKU-MB-019',
          ItemName: 'Nước Khoáng Có Ga San Pellegrino 250ml',
          Category: 'Minibar',
          Supplier: 'San Pellegrino S.p.A',
          Location: 'Kho A-05',
          CurrentStock: 18,
          ParStock: 100,
          MinAlertLevel: 40,
          CostPrice: 1.10,
          SellingPrice: 5.00,
          ImageUrl: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&auto=format&fit=crop&q=80',
          StorageTemp: 'Kho lạnh: 3.8°C Chuẩn'
        }
      ]);

      // Seed Batches cho FIFO
      for (const it of items) {
        await InventoryBatch.create({
          BatchCode: `BATCH-${it.SKU}-01`,
          ItemId: it.ItemId,
          InitialQuantity: Math.floor(it.CurrentStock * 0.6),
          RemainingQuantity: Math.floor(it.CurrentStock * 0.6),
          UnitCost: it.CostPrice,
          ReceivedDate: new Date(Date.now() - 15 * 86400000)
        });
        await InventoryBatch.create({
          BatchCode: `BATCH-${it.SKU}-02`,
          ItemId: it.ItemId,
          InitialQuantity: Math.ceil(it.CurrentStock * 0.4),
          RemainingQuantity: Math.ceil(it.CurrentStock * 0.4),
          UnitCost: it.CostPrice,
          ReceivedDate: new Date(Date.now() - 3 * 86400000)
        });
      }
    }

    // 2. Seed Linen Items (Đồ vải cao cấp - Ảnh 2)
    const countLinen = await LinenItem.count();
    if (countLinen === 0) {
      await LinenItem.bulkCreate([
        {
          SKU: 'LIN-KS-400',
          ItemName: 'Ga Giường King Cotton Satin 400TC',
          Specification: 'Mã SKU: LIN-KS-400 • RFID Gen2 UHF',
          TotalStock: 3200,
          CleanStock: 1450,
          InUseStock: 1150,
          LaundryStock: 600,
          LossDamagedStock: 8,
          LossRate: 0.25,
          ParRatio: 3.1,
          ParStatus: '3.1X TỐI ƯU'
        },
        {
          SKU: 'LIN-DC-JCQ',
          ItemName: 'Vỏ Chăn Lông Vũ Cao Cấp Dệt Jacquard',
          Specification: 'Mã SKU: LIN-DC-JCQ • Sợi tơ dệt chìm hoàng gia',
          TotalStock: 1800,
          CleanStock: 780,
          InUseStock: 620,
          LaundryStock: 400,
          LossDamagedStock: 3,
          LossRate: 0.16,
          ParRatio: 2.9,
          ParStatus: '2.9X CẦN BỔ SUNG'
        },
        {
          SKU: 'TOW-BT-700',
          ItemName: 'Khăn Tắm Đại 700GSM Sợi Bông Ai Cập',
          Specification: 'Mã SKU: TOW-BT-700 • Cotton Giza Ai Cập sợi dài',
          TotalStock: 4500,
          CleanStock: 1820,
          InUseStock: 1680,
          LaundryStock: 1000,
          LossDamagedStock: 12,
          LossRate: 0.26,
          ParRatio: 3.3,
          ParStatus: '3.3X TỐI ƯU'
        },
        {
          SKU: 'TOW-HT-600',
          ItemName: 'Khăn Mặt & Khăn Tay 600GSM',
          Specification: 'Mã SKU: TOW-HT-600 • Kháng khuẩn Nano-Silver',
          TotalStock: 3800,
          CleanStock: 1600,
          InUseStock: 1400,
          LaundryStock: 800,
          LossDamagedStock: 7,
          LossRate: 0.18,
          ParRatio: 3.0,
          ParStatus: '3.0X TỐI ƯU'
        },
        {
          SKU: 'ROB-WF-UNI',
          ItemName: 'Áo Choàng Tắm Vải Tổ Ong Waffle Unisex',
          Specification: 'Mã SKU: ROB-WF-UNI • Có đệm Kimono thêu logo vàng',
          TotalStock: 1950,
          CleanStock: 750,
          InUseStock: 780,
          LaundryStock: 420,
          LossDamagedStock: 4,
          LossRate: 0.20,
          ParRatio: 2.7,
          ParStatus: '2.7X NGƯỠNG NGUY'
        }
      ]);
    }

    // 3. Seed Laundry Batches (Tiến trình lô giặt ủi - Ảnh 2)
    const countBatches = await LaundryBatch.count();
    if (countBatches === 0) {
      await LaundryBatch.bulkCreate([
        {
          BatchCode: 'LÔ #LND-9082',
          BatchType: 'LÔ NGOẠI VIỆN',
          PartnerName: 'Đối tác Nhà Máy Eco-Linen',
          DeliveryTime: 'BÀN GIAO: 16:30 HÔM NAY',
          ItemsSummary: '1,200 Khăn Tắm 700GSM • 800 Ga Giường King Satin',
          TotalWeight: '1.48 Tấn',
          CurrentStep: 3,
          StepLabel: 'Sấy khô & Là ủi Đang chạy (85%)',
          Status: 'IN_PROGRESS'
        },
        {
          BatchCode: 'LÔ #LND-9883',
          BatchType: 'TỐC HÀNH NỘI BỘ',
          PartnerName: 'Trạm Giặt Hấp Cao Tốc B2 • ROBOT LÀ ỦI PHẲNG TỰ ĐỘNG',
          DeliveryTime: 'BÀN GIAO: 15:00',
          ItemsSummary: '350 Áo Choàng Tắm Waffle • 400 Khăn Bông Ai Cập',
          TotalWeight: '0.45 Tấn',
          CurrentStep: 4,
          StepLabel: 'Robot ủi xếp ly - Bàn giao 15:00',
          Status: 'IN_PROGRESS'
        }
      ]);
    }

    console.log('[Housekeeping DB] Đã đồng bộ bảng Kho đồ tiêu hao & Luân chuyển đồ vải thành công.');
  } catch (err) {
    console.error('[Housekeeping DB] Lỗi khởi tạo cơ sở dữ liệu:', err.message);
  }
}

initHousekeepingDatabase();

// -------------------------------------------------------------
// CHỨC NĂNG CỐT LÕI 1: FIFO INVENTORY LOGIC (XUẤT KHO THEO LÔ ĐẾN TRƯỚC)
// -------------------------------------------------------------
async function dispatchInventoryFIFO(itemId, quantityToDeduct, reason = 'Phục vụ Minibar buồng phòng') {
  const transaction = await sequelize.transaction();
  try {
    // Optimistic locking: kiểm tra version của mặt hàng
    const item = await InventoryItem.findByPk(itemId, { transaction });
    if (!item) {
      throw new Error(`Không tìm thấy vật phẩm với ID: ${itemId}`);
    }

    if (item.CurrentStock < quantityToDeduct) {
      throw new Error(`Lượng tồn kho hiện tại (${item.CurrentStock}) không đủ để xuất ${quantityToDeduct} đơn vị!`);
    }

    // Lấy danh sách các lô còn hàng xếp theo ReceivedDate ASC (Đến trước xuất trước - FIFO)
    const activeBatches = await InventoryBatch.findAll({
      where: {
        ItemId: itemId,
        RemainingQuantity: { [Op.gt]: 0 },
        Status: 'ACTIVE'
      },
      order: [['ReceivedDate', 'ASC']],
      transaction
    });

    let remainingNeeded = quantityToDeduct;
    const deductedBatchesInfo = [];

    for (const batch of activeBatches) {
      if (remainingNeeded <= 0) break;

      const takeAmount = Math.min(batch.RemainingQuantity, remainingNeeded);
      batch.RemainingQuantity -= takeAmount;
      if (batch.RemainingQuantity === 0) {
        batch.Status = 'DEPLETED';
      }
      await batch.save({ transaction });

      deductedBatchesInfo.push({
        batchCode: batch.BatchCode,
        receivedDate: batch.ReceivedDate,
        amountDeducted: takeAmount
      });

      remainingNeeded -= takeAmount;
    }

    // Cập nhật tồn kho tổng và tự động tăng Version (Optimistic Locking)
    item.CurrentStock -= quantityToDeduct;
    await item.save({ transaction });

    await transaction.commit();

    return {
      success: true,
      message: `Đã xuất kho ${quantityToDeduct} đơn vị [${item.ItemName}] theo chuẩn FIFO và Optimistic Locking thành công!`,
      item,
      deductedBatchesInfo,
      isUnderSafetyStock: item.CurrentStock < item.MinAlertLevel
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// -------------------------------------------------------------
// CHỨC NĂNG CỐT LÕI 2: NHẬP KHO VẬT PHẨM (TẠO LÔ FIFO MỚI)
// -------------------------------------------------------------
async function receiveInventoryBatch(itemId, quantityToAdd, unitCost, supplier) {
  const transaction = await sequelize.transaction();
  try {
    const item = await InventoryItem.findByPk(itemId, { transaction });
    if (!item) throw new Error('Không tìm thấy vật phẩm');

    const batchCode = `BATCH-${item.SKU}-${Date.now().toString().slice(-4)}`;
    const newBatch = await InventoryBatch.create({
      BatchCode: batchCode,
      ItemId: itemId,
      InitialQuantity: quantityToAdd,
      RemainingQuantity: quantityToAdd,
      UnitCost: unitCost || item.CostPrice,
      ReceivedDate: new Date(),
      Status: 'ACTIVE'
    }, { transaction });

    item.CurrentStock += Number(quantityToAdd);
    await item.save({ transaction });

    await transaction.commit();
    return {
      success: true,
      message: `Đã nhập kho thành công ${quantityToAdd} đơn vị vào lô [${batchCode}]`,
      item,
      newBatch
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// -------------------------------------------------------------
// CHỨC NĂNG CỐT LÕI 3: LUÂN CHUYỂN ĐỒ VẢI (LINEN ROTATION CYCLE)
// -------------------------------------------------------------
async function rotateLinen(linenId, fromStage, toStage, quantity) {
  const transaction = await sequelize.transaction();
  try {
    const linen = await LinenItem.findByPk(linenId, { transaction });
    if (!linen) throw new Error('Không tìm thấy loại đồ vải');

    // fromStage: CleanStock / InUseStock / LaundryStock
    // toStage: CleanStock / InUseStock / LaundryStock / LossDamagedStock
    if (linen[fromStage] < quantity) {
      throw new Error(`Số lượng tại công đoạn [${fromStage}] (${linen[fromStage]}) không đủ để luân chuyển ${quantity} món!`);
    }

    linen[fromStage] -= Number(quantity);
    linen[toStage] += Number(quantity);

    // Tính toán lại Par Ratio
    const cleanAndActive = linen.CleanStock + linen.InUseStock;
    const computedPar = (linen.TotalStock / 1000).toFixed(1); // Ước lượng Par
    linen.ParRatio = computedPar;
    if (computedPar < 2.8) {
      linen.ParStatus = `${computedPar}X NGƯỠNG NGUY`;
    } else if (computedPar < 3.0) {
      linen.ParStatus = `${computedPar}X CẦN BỔ SUNG`;
    } else {
      linen.ParStatus = `${computedPar}X TỐI ƯU`;
    }

    await linen.save({ transaction });
    await transaction.commit();

    return {
      success: true,
      message: `Đã luân chuyển ${quantity} món đồ vải [${linen.ItemName}] từ [${fromStage}] sang [${toStage}] thành công!`,
      linen
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  initHousekeepingDatabase,
  dispatchInventoryFIFO,
  receiveInventoryBatch,
  rotateLinen
};
