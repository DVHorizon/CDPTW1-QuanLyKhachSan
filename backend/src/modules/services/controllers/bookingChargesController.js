'use strict';

/**
 * modules/services/controllers/bookingChargesController.js
 * 👤 OWNER: Hà — FEAT-INVOICE-01 (C6): Tự động gom chi phí lưu trú (Booking Charges Aggregation)
 * Endpoint: GET /api/v1/bookings/:bookingId/charges (alias: GET /bookings/:bookingId/charges)
 * Quyết định liên quan: D6, D12, D13, D14, D15, D16
 */

const {
  Booking,
  Stay,
  Room,
  ServiceOrder,
  FoodOrder,
  MinibarUsage,
  Payment,
} = require('../../../models');
const { Op } = require('sequelize');

// Quyết định D6: coi PAID_STATUSES = ['Paid', 'Success', 'Completed'] là đã thu
const PAID_STATUSES = ['Paid', 'Success', 'Completed'];

/**
 * Tính số đêm thực tế hoặc tạm tính cho 1 Stay (Mục 1.4.b & Quyết định D15)
 */
function calculateStayNights(stay, defaultNights) {
  if (stay.Status === 'CheckedOut' && stay.ActualCheckIn && stay.ActualCheckOut) {
    const diffMs = new Date(stay.ActualCheckOut).getTime() - new Date(stay.ActualCheckIn).getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (stay.ActualCheckIn) {
    const diffMs = Date.now() - new Date(stay.ActualCheckIn).getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Fallback nếu thiếu ActualCheckIn hoặc chưa tới giờ nhận phòng thực tế
  return Math.max(1, Number(defaultNights || 1));
}

/**
 * GET /api/v1/bookings/:bookingId/charges
 * Tính và trả về bản tổng hợp TẠM TÍNH toàn bộ chi phí phát sinh của 1 booking
 */
exports.getBookingCharges = async (req, res) => {
  try {
    const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
    const roleId = Number(req.user?.roleId || 0);
    const isStaffOrAdmin = [1, 2, 3, 4].includes(roleId) ||
      ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

    // 1. Phân quyền: Chỉ nhân viên nội bộ (role !== 'Guest') được gọi (Mục 1.4.a)
    if (!isStaffOrAdmin || userRole === 'guest') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { bookingId } = req.params;
    const numBookingId = Number(bookingId);

    // 2. Kiểm tra tồn tại Booking (Mục 1.2)
    const booking = await Booking.findByPk(numBookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại hoặc đã bị xoá',
      });
    }

    // 3. Tính tổng tiền đã thu (cọc / trả trước) cho Booking (Quyết định D6 & D12)
    const paidPayments = await Payment.findAll({
      where: {
        BookingId: booking.BookingId,
        Status: { [Op.in]: PAID_STATUSES },
      },
    });
    const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);

    const surchargeAmount = Number(booking.SurchargeAmount || 0);
    const discountAmount = Number(booking.DiscountAmount || 0);

    // 4. Lấy danh sách Stays thuộc booking
    const stays = await Stay.findAll({
      where: { BookingId: booking.BookingId },
      include: [{ model: Room }],
      order: [['StayId', 'ASC']],
    });

    // 5. Trường hợp booking chưa check-in (chưa có Stay nào) (Mục 1.4.d)
    if (!stays || stays.length === 0) {
      const grandTotal = Number(booking.RoomSubtotal || 0) + surchargeAmount - discountAmount;
      const remainingBalance = Math.max(0, grandTotal - totalPaid);

      return res.status(200).json({
        success: true,
        data: {
          bookingId: booking.BookingId,
          estimated: true,
          hasPendingServices: false,
          stays: [],
          surchargeAmount,
          discountAmount,
          grandTotal,
          totalPaid,
          remainingBalance,
        },
      });
    }

    // 6. Trường hợp booking đã có Stays: Tính chi tiết từng Stay (Mục 1.4.b, c, e)
    const roomQuantity = Math.max(1, Number(booking.RoomQuantity || 1));
    const numberOfNights = Math.max(1, Number(booking.NumberOfNights || 1));
    const unitNight = Number(booking.RoomSubtotal || 0) / (roomQuantity * numberOfNights);

    let hasPendingServices = false;
    let totalStaysSubtotal = 0;
    const staysDetail = [];

    for (const stay of stays) {
      // 6.1. Tiền phòng của Stay
      const nights = calculateStayNights(stay, numberOfNights);
      const roomSubtotal = unitNight * nights;

      // 6.2. Dịch vụ ServiceOrders của Stay (Mục 1.4.c & Quyết định D16)
      const serviceOrders = await ServiceOrder.findAll({
        where: { StayId: stay.StayId },
      });

      const completedServices = [];
      let servicesSubtotal = 0;

      for (const order of serviceOrders) {
        if (order.Status === 'Completed') {
          const itemTotal = Number(order.TotalPrice || 0);
          servicesSubtotal += itemTotal;
          completedServices.push({
            orderId: order.OrderId,
            serviceId: order.ServiceId,
            quantity: Number(order.Quantity),
            unitPrice: Number(order.UnitPrice),
            subtotal: itemTotal,
            orderDate: order.OrderDate,
          });
        } else if (['Received', 'InProgress', 'Processing'].includes(order.Status)) {
          // Còn dịch vụ chưa xong -> cảnh báo nhân viên trước khi Check-out
          hasPendingServices = true;
        }
      }

      // 6.3. Tiêu thụ Minibar của Stay (Mục 1.3)
      const minibarUsages = await MinibarUsage.findAll({
        where: { StayId: stay.StayId },
      });

      let minibarSubtotal = 0;
      const minibarList = minibarUsages.map((m) => {
        const itemTotal = Number(m.TotalAmount || 0);
        minibarSubtotal += itemTotal;
        return {
          usageId: m.UsageId,
          itemId: m.ItemId,
          quantity: Number(m.Quantity),
          unitPrice: Number(m.UnitPrice),
          subtotal: itemTotal,
          usageDate: m.UsageDate,
        };
      });

      // 6.4. Ẩm thực FoodOrders của Stay (Mục 1.4 & Quyết định D16: RoomInvoice & Served/Delivered)
      const foodOrders = await FoodOrder.findAll({
        where: {
          StayId: stay.StayId,
          PaymentMode: 'RoomInvoice',
          Status: { [Op.in]: ['Served', 'Delivered'] },
        },
      });

      let foodSubtotal = 0;
      const foodList = foodOrders.map((f) => {
        const itemTotal = Number(f.TotalAmount || 0);
        foodSubtotal += itemTotal;
        return {
          foodOrderId: f.FoodOrderId,
          orderType: f.OrderType,
          status: f.Status,
          subtotal: itemTotal,
          orderTime: f.OrderTime,
        };
      });

      // 6.5. Tổng tiền riêng của Stay này
      const staySubtotal = roomSubtotal + servicesSubtotal + minibarSubtotal + foodSubtotal;
      totalStaysSubtotal += staySubtotal;

      staysDetail.push({
        stayId: stay.StayId,
        roomId: stay.RoomId,
        roomNumber: stay.Room?.RoomNumber || `P.${stay.RoomId}`,
        room: {
          nights,
          unitPrice: unitNight,
          subtotal: roomSubtotal,
        },
        services: completedServices,
        minibar: minibarList,
        food: foodList,
        staySubtotal,
      });
    }

    // 7. Tổng cộng toàn Booking
    const grandTotal = totalStaysSubtotal + surchargeAmount - discountAmount;
    const remainingBalance = Math.max(0, grandTotal - totalPaid);

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking.BookingId,
        estimated: false,
        hasPendingServices,
        stays: staysDetail,
        surchargeAmount,
        discountAmount,
        grandTotal,
        totalPaid,
        remainingBalance,
      },
    });
  } catch (error) {
    console.error('Error in getBookingCharges:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tổng hợp chi phí booking.',
      error: error.message,
    });
  }
};
