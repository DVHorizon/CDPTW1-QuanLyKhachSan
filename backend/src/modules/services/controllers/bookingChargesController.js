'use strict';

/**
 * modules/services/controllers/bookingChargesController.js
 * 👤 OWNER: Hà — FEAT-INVOICE-01 (C6): Tự động gom chi phí lưu trú (Booking Charges Aggregation)
 * Endpoint: GET /api/v1/bookings/:bookingId/charges (alias: GET /bookings/:bookingId/charges)
 */

const {
  Booking,
  Stay,
  Room,
  RoomType,
  User,
  ServiceOrder,
  FoodOrder,
  FoodOrderDetail,
  MenuItem,
  MinibarUsage,
  Payment,
  sequelize,
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

  return Math.max(1, Number(defaultNights || 1));
}

/**
 * GET /api/v1/bookings/:bookingId/charges
 * Tính và trả về bản tổng hợp toàn bộ chi phí thực tế và tạm tính của 1 booking
 */
exports.getBookingCharges = async (req, res) => {
  try {
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const isStaffOrAdmin = ['Admin', 'Receptionist', 'Staff', 'Manager', 'Accountant'].includes(userRole);

    // 1. Phân quyền: Chỉ nhân viên nội bộ (role !== 'Guest') được gọi
    if (!isStaffOrAdmin || userRole === 'Guest') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { bookingId } = req.params;
    const numBookingId = Number(bookingId);

    // 2. Lấy Booking kèm Khách hàng và Hạng phòng
    const booking = await Booking.findByPk(numBookingId, {
      include: [
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] },
        { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeName', 'BasePrice'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại hoặc đã bị xoá',
      });
    }

    // 3. Tính tổng tiền đã thanh toán (Payment thực tế + Deposit)
    const paidPayments = await Payment.findAll({
      where: {
        BookingId: booking.BookingId,
        Status: { [Op.in]: PAID_STATUSES },
      },
    });
    let totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
    if (totalPaid === 0 && Number(booking.DepositAmount || 0) > 0) {
      totalPaid = Number(booking.DepositAmount);
    }

    const surchargeAmount = Number(booking.SurchargeAmount || 0);
    const discountAmount = Number(booking.DiscountAmount || 0);
    const roomSubtotalBooking = Number(booking.RoomSubtotal || 0);
    const numberOfNights = Math.max(1, Number(booking.NumberOfNights || 1));
    const roomQuantity = Math.max(1, Number(booking.RoomQuantity || 1));
    const unitNight = roomSubtotalBooking > 0
      ? (roomSubtotalBooking / (roomQuantity * numberOfNights))
      : Number(booking.roomType?.BasePrice || 0);

    // 4. Lấy danh sách Stays thuộc booking
    const stays = await Stay.findAll({
      where: { BookingId: booking.BookingId },
      include: [
        {
          model: Room,
          include: [{ model: RoomType, as: 'roomType', attributes: ['TypeName', 'BasePrice'] }],
        },
      ],
      order: [['StayId', 'ASC']],
    });

    const guestName = booking.user?.FullName || 'Khách đặt phòng';
    const checkInDate = booking.CheckInDate;
    const checkOutDate = booking.CheckOutDate;

    const flatMinibar = [];
    const flatServices = [];
    const flatFood = [];
    const staysDetail = [];
    let hasPendingServices = false;
    let totalRoomSubtotal = 0;
    let totalMinibarSubtotal = 0;
    let totalServiceSubtotal = 0;
    let totalFoodSubtotal = 0;

    if (stays && stays.length > 0) {
      const stayIds = stays.map(s => s.StayId);

      // Tra cứu tên món Minibar từ InventoryItems
      const minibarUsages = await MinibarUsage.findAll({
        where: { StayId: { [Op.in]: stayIds } },
        order: [['UsageDate', 'DESC']],
      });

      let minibarItemNameMap = {};
      if (minibarUsages.length > 0) {
        const itemIds = [...new Set(minibarUsages.map(m => m.ItemId))];
        try {
          const [invRows] = await sequelize.query(
            `SELECT ItemId, ItemName FROM InventoryItems WHERE ItemId IN (${itemIds.join(',')})`
          );
          invRows.forEach(r => { minibarItemNameMap[r.ItemId] = r.ItemName; });
        } catch (_) {}
      }

      // Tra cứu tên Dịch vụ từ Services
      const serviceOrders = await ServiceOrder.findAll({
        where: { StayId: { [Op.in]: stayIds } },
        order: [['OrderDate', 'DESC']],
      });

      let serviceNameMap = {};
      if (serviceOrders.length > 0) {
        const sIds = [...new Set(serviceOrders.map(s => s.ServiceId))];
        try {
          const [sRows] = await sequelize.query(
            `SELECT ServiceId, ServiceName, Description FROM Services WHERE ServiceId IN (${sIds.join(',')})`
          );
          sRows.forEach(r => { serviceNameMap[r.ServiceId] = r; });
        } catch (_) {}
      }

      // Tra cứu Ẩm thực FoodOrders
      const foodOrders = await FoodOrder.findAll({
        where: {
          StayId: { [Op.in]: stayIds },
          PaymentMode: 'RoomInvoice',
          Status: { [Op.in]: ['Served', 'Delivered'] },
        },
        include: [
          {
            model: FoodOrderDetail,
            as: 'details',
            include: [{ model: MenuItem, attributes: ['ItemName', 'Price'] }],
          },
        ],
        order: [['OrderTime', 'DESC']],
      });

      for (const stay of stays) {
        const nights = calculateStayNights(stay, numberOfNights);
        const stayPricePerNight = unitNight || Number(stay.Room?.roomType?.BasePrice || 0);
        const stayRoomTotal = stayPricePerNight * nights;
        totalRoomSubtotal += stayRoomTotal;

        // Minibar của stay
        const stayMinibar = minibarUsages.filter(m => m.StayId === stay.StayId);
        const stayMinibarList = [];
        for (const mb of stayMinibar) {
          const itemTotal = Number(mb.TotalAmount || (Number(mb.Quantity || 1) * Number(mb.UnitPrice || 0)));
          totalMinibarSubtotal += itemTotal;
          const itemName = minibarItemNameMap[mb.ItemId] || `Món Minibar #${mb.ItemId}`;
          const mbObj = {
            stayId: stay.StayId,
            roomNumber: stay.Room?.RoomNumber || `P.${stay.RoomId}`,
            item: itemName,
            quantity: Number(mb.Quantity || 1),
            price: Number(mb.UnitPrice || 0),
            total: itemTotal,
            consumedAt: mb.UsageDate,
          };
          stayMinibarList.push(mbObj);
          flatMinibar.push(mbObj);
        }

        // Service của stay
        const stayServices = serviceOrders.filter(s => s.StayId === stay.StayId);
        const stayServiceList = [];
        for (const sv of stayServices) {
          if (sv.Status === 'Completed') {
            const svTotal = Number(sv.TotalPrice || (Number(sv.Quantity || 1) * Number(sv.UnitPrice || 0)));
            totalServiceSubtotal += svTotal;
            const svInfo = serviceNameMap[sv.ServiceId];
            const svName = svInfo?.ServiceName || `Dịch vụ #${sv.ServiceId}`;
            const svObj = {
              stayId: stay.StayId,
              roomNumber: stay.Room?.RoomNumber || `P.${stay.RoomId}`,
              service: svName,
              type: svInfo?.Description || 'Dịch vụ phòng',
              quantity: Number(sv.Quantity || 1),
              price: Number(sv.UnitPrice || 0),
              total: svTotal,
              status: 'Hoàn thành',
              orderedAt: sv.OrderDate,
            };
            stayServiceList.push(svObj);
            flatServices.push(svObj);
          } else if (['Received', 'InProgress', 'Processing'].includes(sv.Status)) {
            hasPendingServices = true;
          }
        }

        // F&B của stay
        const stayFood = foodOrders.filter(f => f.StayId === stay.StayId);
        const stayFoodList = [];
        for (const fo of stayFood) {
          const foTotal = Number(fo.TotalAmount || 0);
          totalFoodSubtotal += foTotal;
          const itemsText = (fo.details && fo.details.length > 0)
            ? fo.details.map(d => `${d.MenuItem?.ItemName || 'Món ăn'} (x${d.Quantity})`).join(', ')
            : `Đơn F&B #${fo.FoodOrderId}`;
          const foObj = {
            stayId: stay.StayId,
            roomNumber: stay.Room?.RoomNumber || `P.${stay.RoomId}`,
            item: itemsText,
            quantity: 1,
            price: foTotal,
            total: foTotal,
            orderCode: `FNB-${fo.FoodOrderId}`,
            orderedAt: fo.OrderTime,
          };
          stayFoodList.push(foObj);
          flatFood.push(foObj);
        }

        const staySubtotal = stayRoomTotal + stayMinibarList.reduce((s, m) => s + m.total, 0)
          + stayServiceList.reduce((s, sv) => s + sv.total, 0)
          + stayFoodList.reduce((s, f) => s + f.total, 0);

        staysDetail.push({
          stayId: stay.StayId,
          roomId: stay.RoomId,
          roomNumber: stay.Room?.RoomNumber || `P.${stay.RoomId}`,
          roomTypeName: stay.Room?.roomType?.TypeName || booking.roomType?.TypeName || 'Tiêu chuẩn',
          checkIn: stay.ActualCheckIn || checkInDate,
          checkOut: stay.ActualCheckOut || stay.ExpectedCheckOut || checkOutDate,
          nights,
          pricePerNight: stayPricePerNight,
          earlyCheckInFee: 0,
          lateCheckOutFee: 0,
          roomTotal: stayRoomTotal,
          services: stayServiceList,
          minibar: stayMinibarList,
          food: stayFoodList,
          staySubtotal,
        });
      }
    } else {
      // Khi booking chưa có stay: tạm tính dựa trên đặt phòng
      totalRoomSubtotal = roomSubtotalBooking;
      staysDetail.push({
        stayId: 0,
        roomId: null,
        roomNumber: 'Chưa gán phòng (Dự tính)',
        roomTypeName: booking.roomType?.TypeName || 'Tiêu chuẩn',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: numberOfNights,
        pricePerNight: unitNight,
        earlyCheckInFee: 0,
        lateCheckOutFee: 0,
        roomTotal: totalRoomSubtotal,
        services: [],
        minibar: [],
        food: [],
        staySubtotal: totalRoomSubtotal,
      });
    }

    const grandTotal = totalRoomSubtotal + totalMinibarSubtotal + totalServiceSubtotal + totalFoodSubtotal + surchargeAmount - discountAmount;
    const remainingBalance = Math.max(0, grandTotal - totalPaid);

    const summary = {
      roomSubtotal: totalRoomSubtotal,
      minibarSubtotal: totalMinibarSubtotal,
      serviceSubtotal: totalServiceSubtotal,
      foodSubtotal: totalFoodSubtotal,
      surcharge: surchargeAmount,
      discount: discountAmount,
      grandTotal,
      totalPaid,
      remainingBalance,
    };

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking.BookingId,
        guestName,
        roomNumber: staysDetail[0]?.roomNumber || '—',
        checkInDate,
        checkOutDate,
        estimated: stays.length === 0,
        hasPendingServices,
        stays: staysDetail,
        minibar: flatMinibar,
        services: flatServices,
        foodAndBeverage: flatFood,
        summary,
        // Backward compatibility
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
