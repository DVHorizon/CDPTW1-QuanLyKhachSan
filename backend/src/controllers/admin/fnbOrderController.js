const { sequelize, FoodOrder, FoodOrderDetail, MenuItem, Stay, Room } = require('../../models');
const { broadcastOrderStatus } = require('../../services/websocketService');

exports.createRoomServiceOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { stayId, roomId, items, paymentMode } = req.body;

    // Validate Payment Mode
    if (!paymentMode || !['RoomInvoice', 'PayNow'].includes(paymentMode)) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn hình thức thanh toán.' });
    }

    // Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn ít nhất một món.' });
    }

    // Validate Room and Stay
    const stay = await Stay.findOne({ where: { StayId: stayId, RoomId: roomId, Status: 'Active' }, transaction });
    if (!stay) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Vui lòng chọn phòng hợp lệ.' });
    }

    let totalAmount = 0;
    const orderDetails = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Số lượng không hợp lệ.' });
      }

      const menuItem = await MenuItem.findByPk(item.menuItemId, { transaction });
      if (!menuItem || menuItem.Status !== 'Available') {
        await transaction.rollback();
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: `Món ăn ${item.menuItemId} không tồn tại hoặc đã hết.` });
      }

      const unitPrice = menuItem.Price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      orderDetails.push({
        MenuItemId: item.menuItemId,
        Quantity: item.quantity,
        UnitPrice: unitPrice,
        TotalPrice: totalPrice,
        Note: item.note || ''
      });
    }

    if (totalAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tính tổng hóa đơn.' });
    }

    // Create Order with Transaction to prevent Deadlock / Race condition
    const order = await FoodOrder.create({
      StayId: stayId,
      RoomId: roomId,
      OrderType: 'RoomService',
      Status: 'Pending',
      TotalAmount: totalAmount,
      PaymentMode: paymentMode
    }, { transaction });

    // Create Details
    for (const detail of orderDetails) {
      detail.FoodOrderId = order.FoodOrderId;
      await FoodOrderDetail.create(detail, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: order,
      message: 'Đặt món thành công.'
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error creating room service order:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tạo hoặc gửi đơn xuống bếp.' });
  }
};

exports.getOrderHistory = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getKitchenOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.findAll({
      where: { Status: ['Pending', 'Preparing'] },
      include: [
        { 
          model: FoodOrderDetail, 
          as: 'details', 
          required: false,
          include: [{ model: MenuItem }]
        },
        { model: Stay, include: [{ model: Room }] }
      ]
    });
    
    // Transform and validate
    const results = [];
    for (const order of orders) {
      
      const priorityVip = false;
      
      // Calculate SLA (e.g., 30 mins)
      const isOverSLA = (new Date() - new Date(order.OrderTime)) > 30 * 60 * 1000;
      
      results.push({
        foodOrderId: order.FoodOrderId,
        kitchenStation: 'Chung',
        priorityVip: priorityVip,
        status: order.Status,
        createdAt: order.OrderTime,
        isOverSLA: isOverSLA,
        roomNumber: order.Stay?.Room?.RoomNumber || 'Khách Vãng Lai',
        items: order.details.map(d => ({
          orderDetailId: d.FoodOrderDetailId,
          menuItemId: d.MenuItemId,
          itemName: d.MenuItem?.ItemName || 'N/A',
          quantity: d.Quantity,
          isCompleted: d.IsCompleted || false,
          note: d.Note
        }))
      });
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tải lịch sử đơn.' });
  }
};

exports.updateItemCompletion = async (req, res) => {
  try {
    const { orderId, detailId } = req.params;
    const { isCompleted } = req.body;
    
    const detail = await FoodOrderDetail.findOne({ where: { FoodOrderId: orderId, FoodOrderDetailId: detailId } });
    if (!detail) {
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy món ăn trong đơn.' });
    }
    
    detail.IsCompleted = isCompleted;
    await detail.save();
    
    // Update order status to Preparing if it was Pending
    const order = await FoodOrder.findByPk(orderId, {
      include: [{ model: Stay, include: [{ model: Room }] }]
    });
    if (order && order.Status === 'Pending') {
      order.Status = 'Preparing';
      await order.save();
      broadcastOrderStatus(order);
    }
    
    res.json({ success: true, message: 'Cập nhật món thành công.' });
  } catch (error) {
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Lỗi cập nhật món.' });
  }
};

exports.markOrderReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await FoodOrder.findByPk(orderId, {
      include: [{ model: FoodOrderDetail, as: 'details' }]
    });
    
    if (!order) {
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy đơn.' });
    }
    
    // Check if all items are completed
    const uncompletedItems = order.details.filter(d => !d.IsCompleted);
    if (uncompletedItems.length > 0) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Còn món chưa hoàn thành.' });
    }
    
    order.Status = 'Ready';
    await order.save();
    broadcastOrderStatus(order);
    
    res.json({ success: true, message: 'Đơn đã sẵn sàng.' });
  } catch (error) {
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể chuyển trạng thái đơn.' });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await FoodOrder.findByPk(orderId, {
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem }]
        },
        { model: Stay, include: [{ model: Room }] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Đơn hàng không tồn tại.'
      });
    }

    res.json({
      success: true,
      data: {
        foodOrderId: order.FoodOrderId,
        status: order.Status,
        orderTime: order.OrderTime,
        totalAmount: order.TotalAmount,
        paymentMode: order.PaymentMode,
        note: order.Note,
        roomNumber: order.Stay?.Room?.RoomNumber || 'N/A',
        roomType: order.Stay?.Room?.RoomType?.Name || 'Deluxe Suite',
        items: (order.details || []).map(d => ({
          orderDetailId: d.FoodOrderDetailId,
          itemName: d.MenuItem?.ItemName || 'Món ăn',
          price: d.UnitPrice,
          quantity: d.Quantity,
          totalPrice: d.TotalPrice,
          isCompleted: d.IsCompleted,
          note: d.Note
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Không thể cập nhật trạng thái đơn.'
    });
  }
};

exports.getAllOrdersForHub = async (req, res) => {
  try {
    const orders = await FoodOrder.findAll({
      order: [['OrderTime', 'DESC']],
      limit: 50,
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem }]
        },
        { model: Stay, include: [{ model: Room }] }
      ]
    });

    const transformed = orders.map(order => ({
      foodOrderId: order.FoodOrderId,
      status: order.Status,
      orderTime: order.OrderTime,
      totalAmount: order.TotalAmount,
      roomNumber: order.Stay?.Room?.RoomNumber || (order.TableId ? `Bàn ${order.TableId}` : 'Khách Vãng Lai'),
      note: order.Note,
      items: (order.details || []).map(d => ({
        orderDetailId: d.FoodOrderDetailId,
        itemName: d.MenuItem?.ItemName || 'Món ăn',
        quantity: d.Quantity,
        isCompleted: d.IsCompleted,
        kitchenStation: d.MenuItem?.KitchenStation || 'Hot'
      }))
    }));

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Không thể cập nhật trạng thái đơn.'
    });
  }
};

exports.getReadyOrders = async (req, res) => {
  try {
    const orders = await FoodOrder.findAll({
      where: { Status: 'Ready' },
      order: [['OrderTime', 'DESC']], // Use OrderTime as proxy for recent
      limit: 10,
      include: [{ model: Stay, include: [{ model: Room }] }]
    });
    const results = orders.map(o => ({
      foodOrderId: o.FoodOrderId,
      roomNumber: o.Stay?.Room?.RoomNumber || 'Khách Vãng Lai',
      status: o.Status
    }));
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử.' });
  }
};

exports.restoreOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await FoodOrder.findByPk(orderId, {
      include: [{ model: Stay, include: [{ model: Room }] }]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy.' });
    order.Status = 'Preparing';
    await order.save();
    broadcastOrderStatus(order);
    res.json({ success: true, message: 'Đã khôi phục thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khôi phục.' });
  }
};

exports.getExpediterAndStationMetrics = async (req, res) => {
  try {
    // 1. Expediter Pass (Đĩa chờ Runner): lấy các đơn đã Ready gần nhất
    const readyOrders = await FoodOrder.findAll({
      where: { Status: 'Ready' },
      order: [['OrderTime', 'DESC']],
      limit: 6,
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem }]
        },
        { model: Stay, include: [{ model: Room }] }
      ]
    });

    const stagedPlates = [];
    readyOrders.forEach(order => {
      const roomName = order.Stay?.Room?.RoomNumber ? `PHÒNG ${order.Stay.Room.RoomNumber}` : (order.TableId ? `BÀN ${order.TableId}` : 'PHÒNG VIP');
      (order.details || []).forEach(d => {
        stagedPlates.push({
          id: d.FoodOrderDetailId,
          orderId: order.FoodOrderId,
          destination: roomName,
          itemName: d.MenuItem?.ItemName || 'Món phục vụ',
          quantity: d.Quantity,
          cloche: d.MenuItem?.KitchenStation === 'Cold' ? 'Khay đá giữ lạnh' : 'Nắp chụp Cloche giữ nhiệt',
          temp: d.MenuItem?.KitchenStation === 'Cold' ? '5°C' : '68°C',
          isCold: d.MenuItem?.KitchenStation === 'Cold',
          readyAt: order.OrderTime
        });
      });
    });

    // 2. Kitchen Station Loads: tính tải dựa trên các món đang Pending/Preparing
    const activeOrders = await FoodOrder.findAll({
      where: { Status: ['Pending', 'Preparing'] },
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem }]
        }
      ]
    });

    let hotCount = 0;
    let coldCount = 0;
    let bakeryCount = 0;
    let totalItems = 0;

    activeOrders.forEach(order => {
      (order.details || []).forEach(d => {
        if (!d.IsCompleted) {
          totalItems += d.Quantity || 1;
          const station = (d.MenuItem?.KitchenStation || '').toLowerCase();
          const catName = (d.MenuItem?.ItemName || '').toLowerCase();
          if (station.includes('cold') || catName.includes('salad') || catName.includes('sashimi') || catName.includes('hải sản')) {
            coldCount += d.Quantity || 1;
          } else if (station.includes('bakery') || station.includes('pastry') || catName.includes('bánh') || catName.includes('kem') || catName.includes('tráng miệng')) {
            bakeryCount += d.Quantity || 1;
          } else {
            hotCount += d.Quantity || 1;
          }
        }
      });
    });

    // Tính % tải (chuẩn hóa trên trần công suất tối đa của mỗi line)
    const hotPercent = Math.min(100, Math.round((hotCount / 15) * 100));
    const coldPercent = Math.min(100, Math.round((coldCount / 10) * 100));
    const bakeryPercent = Math.min(100, Math.round((bakeryCount / 8) * 100));

    res.json({
      success: true,
      data: {
        stagedPlates: stagedPlates.slice(0, 6),
        totalStaged: stagedPlates.length,
        stationMetrics: {
          totalItems,
          stations: [
            {
              id: 'hot',
              name: 'Bếp Nóng Chính (Chảo, Xào & Steak)',
              count: hotCount,
              percent: hotPercent,
              desc: hotPercent > 70 ? 'Tải cao, đang dồn lực ra món chính' : 'Hoạt động nhịp nhàng, ổn định',
              color: 'tertiary'
            },
            {
              id: 'cold',
              name: 'Bếp Lạnh & Khai Vị (Salad, Sashimi & Raw Bar)',
              count: coldCount,
              percent: coldPercent,
              desc: 'Kiểm soát tốt nguồn hải sản & khai vị',
              color: 'admin-primary'
            },
            {
              id: 'bakery',
              name: 'Bếp Bánh & Tráng Miệng (Pastry & Bakery)',
              count: bakeryCount,
              percent: bakeryPercent,
              desc: 'Sẵn sàng đơn tráng miệng phục vụ phòng',
              color: 'secondary'
            }
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error fetching expediter metrics:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu Expediter.' });
  }
};

exports.callRunners = async (req, res) => {
  res.json({
    success: true,
    message: 'Đã phát chuông gọi đội Runner tập trung nhận đĩa tại Bàn Ra Món!'
  });
};

exports.clearExpediterPass = async (req, res) => {
  try {
    // Chuyển các đơn Ready sang Delivered (đã bưng xong)
    await FoodOrder.update(
      { Status: 'Delivered' },
      { where: { Status: 'Ready' } }
    );
    res.json({
      success: true,
      message: 'Đã dọn sạch bàn ra món (Tất cả đĩa đã chuyển giao Runner giao phòng).'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi dọn bàn ra món.' });
  }
};

exports.processPayment = async (req, res) => {
  res.json({ success: true, message: 'Thanh toán thành công' });
};

// UPDATE ORDER (Update with Transaction)
exports.updateOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const { paymentMode, status } = req.body;
    
    const order = await FoodOrder.findOne({ where: { FoodOrderId: orderId, IsDeleted: false }, transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy đơn.' });
    }

    if (paymentMode) order.PaymentMode = paymentMode;
    if (status) order.Status = status;

    await order.save({ transaction });
    await transaction.commit();

    const fullOrder = await FoodOrder.findByPk(orderId, {
      include: [{ model: Stay, include: [{ model: Room }] }]
    });
    if (fullOrder) {
      broadcastOrderStatus(fullOrder);
    }

    res.json({ success: true, message: 'Cập nhật thành công', data: order });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Lỗi khi cập nhật.' });
  }
};

// SOFT DELETE ORDER
exports.deleteOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    
    const order = await FoodOrder.findOne({ where: { FoodOrderId: orderId, IsDeleted: false }, transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không tìm thấy đơn hoặc đã bị xóa.' });
    }

    // Logic Soft Delete -> 0 -> 1
    order.IsDeleted = true;
    await order.save({ transaction });

    // Cập nhật cả chi tiết đơn hàng
    await FoodOrderDetail.update(
      { IsDeleted: true },
      { where: { FoodOrderId: orderId }, transaction }
    );

    await transaction.commit();
    res.json({ success: true, message: 'Xóa đơn (Soft Delete) thành công' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Lỗi khi xóa.' });
  }
};
