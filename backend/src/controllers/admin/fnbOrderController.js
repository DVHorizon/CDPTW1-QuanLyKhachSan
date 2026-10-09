const { FoodOrder, FoodOrderDetail, MenuItem, Stay, Room } = require('../../models');

exports.createRoomServiceOrder = async (req, res) => {
  try {
    const { stayId, roomId, items, paymentMode } = req.body;

    // Validate Payment Mode
    if (!paymentMode || !['RoomInvoice', 'PayNow'].includes(paymentMode)) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn hình thức thanh toán.' });
    }

    // Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 'ERROR_0001_REQUIRED', message: 'Vui lòng chọn ít nhất một món.' });
    }

    // Validate Room and Stay
    const stay = await Stay.findOne({ where: { StayId: stayId, RoomId: roomId, Status: 'Active' } });
    if (!stay) {
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Vui lòng chọn phòng hợp lệ.' });
    }

    let totalAmount = 0;
    const orderDetails = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Số lượng không hợp lệ.' });
      }

      const menuItem = await MenuItem.findByPk(item.menuItemId);
      if (!menuItem || menuItem.Status !== 'Available') {
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
      return res.status(400).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tính tổng hóa đơn.' });
    }

    // Create Order
    const order = await FoodOrder.create({
      StayId: stayId,
      RoomId: roomId,
      OrderType: 'RoomService',
      Status: 'Pending',
      TotalAmount: totalAmount,
      PaymentMode: paymentMode
    });

    // Create Details
    for (const detail of orderDetails) {
      detail.FoodOrderId = order.FoodOrderId;
      await FoodOrderDetail.create(detail);
    }

    return res.status(201).json({
      success: true,
      data: order,
      message: 'Đặt món thành công.'
    });

  } catch (error) {
    console.error('Error creating room service order:', error);
    return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể tạo hoặc gửi đơn xuống bếp.' });
  }
};

exports.getOrderHistory = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.getKitchenOrders = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.processPayment = async (req, res) => {
  res.json({ success: true, message: 'Thanh toán thành công' });
};
