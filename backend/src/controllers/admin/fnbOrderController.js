const { sequelize, FoodOrder, FoodOrderDetail, MenuItem, Stay, Room, Booking, Invoice, InvoiceDetail, Payment } = require('../../models');
const { broadcastOrderStatus } = require('../../services/websocketService');


// Lấy danh sách lượt lưu trú đang Active để chọn phòng đặt món
exports.getActiveStays = async (req, res) => {
  try {
    const stays = await Stay.findAll({
      where: { Status: 'Active' },
      include: [{ model: Room }],
      order: [['StayId', 'ASC']]
    });
    return res.status(200).json({
      success: true,
      data: stays.map(s => ({
        stayId: s.StayId,
        roomId: s.RoomId,
        roomNumber: s.Room?.RoomNumber || `Phòng ${s.RoomId}`,
        floor: s.Room?.Floor || 1,
        guestName: 'Khách lưu trú P.' + (s.Room?.RoomNumber || s.RoomId)
      }))
    });
  } catch (error) {
    console.error('Error fetching active stays:', error);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách phòng.' });
  }
};

// FEAT-FNB-04 (A4.4): ĐẶT MÓN ROOM SERVICE ONLINE
exports.createRoomServiceOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { stayId, roomId, items, paymentMode } = req.body;
    const currentUserId = req.user?.id || req.user?.UserId;

    // 1. Kiểm tra phòng và lượt lưu trú
    if (!stayId || !roomId) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Vui lòng chọn phòng hợp lệ.' });
    }

    const stay = await Stay.findOne({
      where: { StayId: stayId, RoomId: roomId, Status: 'Active' },
      include: [{ model: Room }],
      transaction
    });

    if (!stay) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Vui lòng chọn phòng hợp lệ.' });
    }

    // 2. Kiểm tra chọn món
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn ít nhất một món.' });
    }

    // 3. Kiểm tra số lượng món và món đang phục vụ
    let totalAmount = 0;
    const orderDetails = [];

    for (const item of items) {
      if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Số lượng không hợp lệ.' });
      }

      const menuItem = await MenuItem.findByPk(item.menuItemId, { transaction });
      if (!menuItem || menuItem.Status !== 'Available') {
        await transaction.rollback();
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Món ăn không tồn tại hoặc đã hết phục vụ.' });
      }

      const unitPrice = parseFloat(menuItem.Price);
      if (isNaN(unitPrice)) {
        await transaction.rollback();
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tính tổng hóa đơn.' });
      }

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

    // 4. Tính toán tổng hóa đơn
    if (isNaN(totalAmount) || totalAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tính tổng hóa đơn.' });
    }

    // 5. Kiểm tra hình thức thanh toán
    if (!paymentMode) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn hình thức thanh toán.' });
    }

    if (!['RoomInvoice', 'PayNow'].includes(paymentMode)) {
      await transaction.rollback();
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Hình thức thanh toán không hợp lệ' });
    }

    // 6. Tạo FoodOrders và FoodOrderDetails
    const order = await FoodOrder.create({
      StayId: stayId,
      RoomId: roomId,
      UserId: currentUserId || 1,
      OrderType: 'RoomService',
      Status: 'Pending',
      TotalAmount: totalAmount,
      PaymentMode: paymentMode
    }, { transaction });

    for (const detail of orderDetails) {
      detail.FoodOrderId = order.FoodOrderId;
      await FoodOrderDetail.create(detail, { transaction });
    }

    await transaction.commit();

    // 7. Gửi đơn xuống quy trình KDS / Bếp qua WebSocket
    try {
      broadcastOrderStatus({
        orderId: order.FoodOrderId,
        status: 'Pending',
        orderType: 'RoomService',
        paymentMode: order.PaymentMode,
        totalAmount: order.TotalAmount,
        roomNumber: stay.Room?.RoomNumber || 'N/A',
        updatedAt: new Date().toISOString()
      });
    } catch (wsErr) {
      console.warn('WebSocket broadcast error:', wsErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Đặt món thành công. Đơn đã được chuyển xuống bếp.',
      data: {
        orderId: order.FoodOrderId,
        stayId: order.StayId,
        orderType: order.OrderType,
        status: order.Status,
        totalAmount: order.TotalAmount,
        paymentMode: order.PaymentMode
      }
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error creating room service order:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tạo hoặc gửi đơn xuống bếp.' });
  }
};


// FEAT-FNB-08 (A4.8): LỊCH SỬ GỌI MÓN & DANH SÁCH TỔNG HỢP ĐƠN F&B TRONG NGÀY
exports.getOrderHistory = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const currentUser = req.user;
    const roleId   = currentUser?.roleId   || currentUser?.RoleId;
    const roleName = (currentUser?.roleName || currentUser?.role || '').toLowerCase();
    let userId     = currentUser?.id || currentUser?.UserId;

    // ── Phân loại actor ────────────────────────────────────────────────────────
    let isStaff = false;
    if (currentUser) {
      isStaff = roleId === 1 || roleId === 2 || roleId === 3 ||
        ['admin', 'manager', 'staff', 'reception', 'fnb'].some(r => roleName.includes(r));
    } else {
      // Khi không có token: nếu không chỉ định view=guest và không có userId thì mặc định là staff (dành cho PMS test)
      if (req.query.view !== 'guest' && !req.query.userId) {
        isStaff = true;
      }
    }

    // Role override theo query khi dev/test
    if (req.query.view === 'guest' || req.query.role === 'guest') {
      isStaff = false;
      if (!userId && req.query.userId) {
        userId = parseInt(req.query.userId, 10);
      }
    } else if (req.query.view === 'staff' || req.query.role === 'staff') {
      isStaff = true;
    }

    // ── Bộ lọc ngày (nhân viên) ──────────────────────────────────────────────
    let { fromDate, toDate, status, paymentMode, roomId, tableId } = req.query;

    // Validate ngày
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (fromDate && !dateRegex.test(fromDate)) {
      return res.status(400).json({ code: 'ERROR_0004_INVALID_FORMAT', message: 'fromDate không đúng định dạng' });
    }
    if (toDate && !dateRegex.test(toDate)) {
      return res.status(400).json({ code: 'ERROR_0004_INVALID_FORMAT', message: 'toDate không đúng định dạng' });
    }

    // Mặc định khoảng ngày: 7 ngày trước -> hôm nay
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    if (isStaff) {
      if (!fromDate) fromDate = sevenDaysAgo;
      if (!toDate)   toDate   = today;
      if (new Date(toDate) < new Date(fromDate)) {
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Khoảng ngày không hợp lệ.' });
      }
    }

    // ── Xây where clause ────────────────────────────────────────────────────
    const where = {};

    if (isStaff) {
      // Khoảng thời gian
      const start = new Date(fromDate + 'T00:00:00.000Z');
      const end   = new Date(toDate   + 'T23:59:59.999Z');
      where.OrderTime = { [Op.between]: [start, end] };
      if (status)      where.Status      = status;
      if (paymentMode) where.PaymentMode = paymentMode;
      if (roomId)      where.StayId      = { [Op.ne]: null }; // join filter below
      if (tableId)     where.TableId     = tableId;
    } else {
      // Khách: chỉ xem đơn của mình
      if (!userId) {
        return res.status(401).json({ code: 'ERROR_0009_UNAUTHENTICATED', message: 'Bạn cần đăng nhập để thực hiện chức năng này' });
      }
      where.UserId = userId;
    }

    // ── Truy vấn ────────────────────────────────────────────────────────────
    const orders = await FoodOrder.findAll({
      where,
      order: [['OrderTime', 'DESC']],
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          required: false,
          include: [{ model: MenuItem, attributes: ['MenuItemId', 'ItemName', 'Price', 'ImageUrl'] }]
        },
        {
          model: Stay,
          required: roomId ? true : false,
          include: [{ model: Room, attributes: ['RoomId', 'RoomNumber', 'Floor'] }],
          ...(roomId ? { where: { RoomId: roomId } } : {})
        }
      ]
    });

    // ── Không có dữ liệu ────────────────────────────────────────────────────
    if (orders.length === 0) {
      const emptyMsg = isStaff
        ? 'Không có đơn món ăn nào trong khoảng thời gian đã chọn.'
        : 'Bạn chưa có đơn món ăn nào.';
      return res.status(200).json({ success: true, data: [], summary: null, message: emptyMsg });
    }

    // ── Tổng hợp doanh thu (loại trừ Cancelled) ─────────────────────────────
    let totalRevenue = 0;
    let totalOrders  = 0;
    const transformed = orders.map(order => {
      const amount = parseFloat(order.TotalAmount || 0);
      if (order.Status !== 'Cancelled') {
        totalRevenue += amount;
        totalOrders++;
      }
      return {
        foodOrderId : order.FoodOrderId,
        status      : order.Status,
        orderTime   : order.OrderTime,
        orderType   : order.OrderType,
        totalAmount : amount,
        paymentMode : order.PaymentMode,
        note        : order.Note,
        roomNumber  : order.Stay?.Room?.RoomNumber || (order.TableId ? `Bàn ${order.TableId}` : null),
        items       : (order.details || []).map(d => ({
          orderDetailId : d.FoodOrderDetailId,
          menuItemId    : d.MenuItemId,
          itemName      : d.MenuItem?.ItemName || 'Món ăn',
          quantity      : d.Quantity,
          unitPrice     : parseFloat(d.UnitPrice || 0),
          totalPrice    : parseFloat(d.TotalPrice || 0),
          isCompleted   : d.IsCompleted,
          note          : d.Note,
          imageUrl      : d.MenuItem?.ImageUrl || null
        }))
      };
    });

    const summary = isStaff ? {
      totalOrders,
      totalRevenue,
      fromDate,
      toDate,
      cancelledCount: orders.length - totalOrders
    } : null;

    return res.status(200).json({ success: true, data: transformed, summary });
  } catch (error) {
    console.error('Error fetching order history (FEAT-FNB-08):', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: error.message || 'Không thể tải lịch sử gọi món.', stack: error.stack });
  }
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

// FEAT-FNB-07 (A4.7): XỬ LÝ HÌNH THỨC THANH TOÁN ĐƠN F&B
exports.processPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const { paymentMode, paymentMethod, simulateFailure } = req.body;
    const currentUserId = req.user?.id || req.user?.UserId;

    // 1. Kiểm tra mã đơn
    if (!orderId) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0001_REQUIRED',
        message: 'Mã đơn không được để trống.'
      });
    }

    // 2. Kiểm tra tồn tại đơn F&B
    const order = await FoodOrder.findOne({
      where: { FoodOrderId: orderId },
      include: [
        { model: FoodOrderDetail, as: 'details' },
        { model: Stay, include: [{ model: Room }] }
      ],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Đơn món ăn không tồn tại.'
      });
    }

    // Kiểm tra quyền sở hữu đơn (nếu có currentUserId và đơn có UserId)
    if (currentUserId && order.UserId && String(order.UserId) !== String(currentUserId)) {
      await transaction.rollback();
      return res.status(403).json({
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này'
      });
    }

    // Điều kiện tiên quyết: đơn F&B đã có ít nhất một món hợp lệ
    if (!order.details || order.details.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Đơn F&B phải có ít nhất một món hợp lệ.'
      });
    }

    // 3. Kiểm tra Hình thức thanh toán (paymentMode)
    if (!paymentMode) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn hình thức thanh toán.'
      });
    }

    if (!['RoomInvoice', 'PayNow'].includes(paymentMode)) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Hình thức thanh toán không hợp lệ'
      });
    }

    // 4. Xử lý Gộp vào hóa đơn phòng (RoomInvoice)
    if (paymentMode === 'RoomInvoice') {
      // Chỉ hợp lệ khi khách đang lưu trú (đã check-in) và đơn gắn với lượt lưu trú hợp lệ
      if (!order.StayId) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Không thể gộp vào hóa đơn phòng. Vui lòng chọn hình thức thanh toán khác.'
        });
      }

      const activeStay = await Stay.findOne({
        where: {
          StayId: order.StayId,
          Status: 'Active'
        },
        transaction
      });

      if (!activeStay) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Không thể gộp vào hóa đơn phòng. Vui lòng chọn hình thức thanh toán khác.'
        });
      }

      try {
        // Tìm hoặc tạo Hóa đơn (Invoice) cho lượt lưu trú này
        let invoice = await Invoice.findOne({
          where: { StayId: activeStay.StayId },
          transaction
        });

        if (!invoice) {
          const timestamp = Date.now();
          const invoiceNumber = `INV-${activeStay.StayId}-${timestamp.toString().slice(-6)}`;
          invoice = await Invoice.create({
            StayId: activeStay.StayId,
            BookingId: activeStay.BookingId,
            InvoiceNumber: invoiceNumber,
            Subtotal: 0.00,
            VATRate: 10.00,
            VATAmount: 0.00,
            TotalAmount: 0.00,
            Status: 'Unpaid'
          }, { transaction });
        }

        // Tạo chi tiết khoản phí (folio charge) vào InvoiceDetails
        const orderAmount = parseFloat(order.TotalAmount || 0);
        await InvoiceDetail.create({
          InvoiceId: invoice.InvoiceId,
          ItemType: 'FoodOrder',
          ItemId: order.FoodOrderId,
          Description: `Khoản phí dịch vụ ăn uống F&B Đơn #${order.FoodOrderId}`,
          Quantity: 1.00,
          UnitPrice: orderAmount,
          TotalPrice: orderAmount
        }, { transaction });

        // Cập nhật tổng tiền Invoice
        const currentSubtotal = parseFloat(invoice.Subtotal || 0) + orderAmount;
        const vatRate = parseFloat(invoice.VATRate || 10.00);
        const vatAmount = (currentSubtotal * vatRate) / 100;
        const totalAmount = currentSubtotal + vatAmount;

        invoice.Subtotal = currentSubtotal;
        invoice.VATAmount = vatAmount;
        invoice.TotalAmount = totalAmount;
        await invoice.save({ transaction });

        // Đặt PaymentMode = RoomInvoice, đơn giữ Status = Pending để gửi Bếp/KDS
        order.PaymentMode = 'RoomInvoice';
        order.Status = 'Pending';
        await order.save({ transaction });

        await transaction.commit();

        // Gửi thông báo WebSocket xuống Bếp/KDS và Hub
        broadcastOrderStatus({
          orderId: order.FoodOrderId,
          status: 'Pending',
          paymentMode: 'RoomInvoice',
          paymentStatus: 'ChargedToRoom',
          totalAmount: order.TotalAmount,
          stayId: order.StayId,
          roomNumber: order.Stay?.Room?.RoomNumber || 'N/A',
          updatedAt: new Date().toISOString()
        });

        return res.status(200).json({
          success: true,
          message: 'Gộp vào hóa đơn phòng thành công. Đơn đã được chuyển xuống bếp.',
          data: {
            orderId: order.FoodOrderId,
            paymentMode: 'RoomInvoice',
            invoiceNumber: invoice.InvoiceNumber,
            status: order.Status
          }
        });
      } catch (folioError) {
        await transaction.rollback();
        console.error('Error creating folio charge:', folioError);
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Không thể ghi nhận khoản phí vào hóa đơn phòng.'
        });
      }
    }

    // 5. Xử lý Thanh toán ngay (PayNow)
    if (paymentMode === 'PayNow') {
      const allowedMethods = ['Cash', 'VNPay', 'MoMo', 'VietQR'];
      if (!paymentMethod) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0001_REQUIRED',
          message: 'Vui lòng chọn phương thức thanh toán.'
        });
      }

      if (!allowedMethods.includes(paymentMethod)) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Phương thức thanh toán không hợp lệ'
        });
      }

      // Tạo mã giao dịch TransactionCode duy nhất
      const transactionCode = `TXN-FNB-${order.FoodOrderId}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Kiểm tra mô phỏng thất bại từ cổng thanh toán (dành cho Unit/API test và xử lý tình huống)
      if (simulateFailure === true) {
        // Ghi nhận bản ghi Payment Status = Failed
        await Payment.create({
          FoodOrderId: order.FoodOrderId,
          UserId: currentUserId || order.UserId || null,
          Amount: order.TotalAmount,
          PaymentMethod: paymentMethod,
          TransactionCode: transactionCode,
          Status: 'Failed',
          GatewayResponse: JSON.stringify({ error: 'Gateway timeout or card declined' })
        }, { transaction });

        // Giữ đơn ở trạng thái chờ và cho phép khách thử lại
        order.PaymentMode = 'PayNow';
        order.Status = 'Pending';
        await order.save({ transaction });

        await transaction.commit();

        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Thanh toán không thành công. Đơn được giữ lại, vui lòng thử lại.'
        });
      }

      // Thanh toán thành công (Happy case)
      const paymentRecord = await Payment.create({
        FoodOrderId: order.FoodOrderId,
        UserId: currentUserId || order.UserId || null,
        Amount: order.TotalAmount,
        PaymentMethod: paymentMethod,
        TransactionCode: transactionCode,
        Status: 'Paid',
        GatewayResponse: JSON.stringify({ success: true, method: paymentMethod })
      }, { transaction });

      // Đặt PaymentMode = PayNow, Status = Pending (gửi Bếp/KDS)
      order.PaymentMode = 'PayNow';
      order.Status = 'Pending';
      await order.save({ transaction });

      await transaction.commit();

      // Gửi WebSocket thông báo xuống Bếp/KDS
      broadcastOrderStatus({
        orderId: order.FoodOrderId,
        status: 'Pending',
        paymentMode: 'PayNow',
        paymentMethod: paymentMethod,
        paymentStatus: 'Paid',
        totalAmount: order.TotalAmount,
        transactionCode: transactionCode,
        roomNumber: order.Stay?.Room?.RoomNumber || 'N/A',
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Thanh toán thành công. Đơn đã được chuyển xuống bếp.',
        data: {
          orderId: order.FoodOrderId,
          paymentId: paymentRecord.PaymentId,
          transactionCode: transactionCode,
          paymentMode: 'PayNow',
          paymentMethod: paymentMethod,
          status: order.Status
        }
      });
    }

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error processing F&B payment:', error);
    return res.status(500).json({
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Lỗi hệ thống khi xử lý thanh toán.'
    });
  }
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
