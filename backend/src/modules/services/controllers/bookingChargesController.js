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
const pool = require('../../../config/db');

// Quyết định D6: coi PAID_STATUSES = ['Paid', 'Success', 'Completed'] là đã thu
const PAID_STATUSES = ['Paid', 'Success', 'Completed'];

/**
 * Tính số đêm thực tế hoặc tạm tính cho 1 Stay (Mục 1.4.b & Quyết định D15)
 * Cố định theo số đêm hợp đồng đã đặt (NumberOfNights) để triệt tiêu lỗi số đêm trôi nổi (Floating Nights Bug)
 */
function calculateStayNights(stay, defaultNightsOrBooking) {
  // 1. Ưu tiên số đêm hợp đồng đã đặt trong booking
  if (defaultNightsOrBooking && typeof defaultNightsOrBooking === 'object') {
    if (Number(defaultNightsOrBooking.NumberOfNights) > 0) {
      return Number(defaultNightsOrBooking.NumberOfNights);
    }
    if (defaultNightsOrBooking.CheckInDate && defaultNightsOrBooking.CheckOutDate) {
      const diff = new Date(defaultNightsOrBooking.CheckOutDate).getTime() - new Date(defaultNightsOrBooking.CheckInDate).getTime();
      return Math.max(1, Math.round(diff / 86400000));
    }
  }

  // 2. Nếu truyền trực tiếp số đêm mặc định
  if (typeof defaultNightsOrBooking === 'number' && defaultNightsOrBooking > 0) {
    return defaultNightsOrBooking;
  }

  // 3. Fallback theo khoảng thời gian dự kiến của Stay
  if (stay && stay.ExpectedCheckOut && stay.ActualCheckIn) {
    const diff = new Date(stay.ExpectedCheckOut).getTime() - new Date(stay.ActualCheckIn).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  }

  return 1;
}

/**
 * Hàm tính toán nội bộ chi phí booking dùng chung cho C6 (Xem trước Folio) và C7 (Lập Master Invoice)
 * Hỗ trợ options { transaction, lock } để đảm bảo an toàn giao dịch đồng thời
 */
async function calculateBookingChargesData(bookingId, options = {}) {
  const { transaction = null, lock = null } = options;
  const numBookingId = Number(bookingId);

  // 1. Kiểm tra tồn tại Booking
  const booking = !Number.isNaN(numBookingId)
    ? await Booking.findByPk(numBookingId, { transaction, lock })
    : await Booking.findOne({ where: { ConfirmationCode: String(bookingId).trim() }, transaction, lock });

  if (!booking) {
    return null;
  }

  // 2. Tính tổng tiền đã thu (cọc / trả trước) cho Booking, trừ các khoản RefundAmount
  const paidPayments = await Payment.findAll({
    where: {
      BookingId: booking.BookingId,
      Status: { [Op.in]: PAID_STATUSES },
    },
    transaction,
    lock,
    order: [['PaymentDate', 'ASC']],
  });
  const totalPaid = paidPayments.reduce((sum, p) => {
    const amt = Number(p.Amount || 0);
    const ref = Number(p.RefundAmount || 0);
    return sum + Math.max(0, amt - ref);
  }, 0);

  const surchargeAmount = Number(booking.SurchargeAmount || 0);
  const discountAmount = Number(booking.DiscountAmount || 0);

  // 3. Lấy danh sách Stays thuộc booking
  const stays = await Stay.findAll({
    where: { BookingId: booking.BookingId },
    include: [{ model: Room }],
    transaction,
    lock,
    order: [['StayId', 'ASC']],
  });

  const depositPaid = Number(booking.DepositAmount || 0);
  const effectivePaid = Math.max(totalPaid, depositPaid);

  const fallbackRoomSubtotal = Math.max(
    0,
    Number(booking.TotalAmount || 0) - surchargeAmount + discountAmount
  );
  const effectiveRoomSubtotal = Number(booking.RoomSubtotal) > 0
    ? Number(booking.RoomSubtotal)
    : (fallbackRoomSubtotal > 0 ? fallbackRoomSubtotal : Number(booking.TotalAmount || 0));

  // 4. Booking chưa có Stay nào (chưa check-in) -> Tạm tính theo kế hoạch
  if (!stays || stays.length === 0) {
    const grandTotal = Number(booking.TotalAmount) > 0
      ? Number(booking.TotalAmount)
      : Math.max(0, effectiveRoomSubtotal + surchargeAmount - discountAmount);
    const remainingBalance = Math.max(0, grandTotal - effectivePaid);

    return {
      booking,
      estimated: true,
      hasPendingServices: false,
      stays: [],
      rawStays: [],
      surchargeAmount,
      discountAmount,
      grandTotal,
      totalPaid: effectivePaid,
      remainingBalance,
      paidPayments,
    };
  }

  // 5. Tính chi tiết từng Stay
  const roomQuantity = Math.max(1, Number(booking.RoomQuantity || 1));
  const contractNights = calculateStayNights(null, booking);
  const unitNight = effectiveRoomSubtotal / (roomQuantity * contractNights);

  let hasPendingServices = false;
  let totalStaysSubtotal = 0;
  let totalExtensionsAmount = 0;
  let totalDamagesAmount = 0;
  const staysDetail = [];

  for (const stay of stays) {
    // 5.1. Tiền phòng cơ sở
    const nights = calculateStayNights(stay, booking);
    const roomSubtotal = unitNight * nights;

    // 5.2. Dịch vụ ServiceOrders
    const serviceOrders = await ServiceOrder.findAll({
      where: { StayId: stay.StayId },
      transaction,
      lock,
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
        hasPendingServices = true;
      }
    }

    // 5.3. Tiêu thụ Minibar (ưu tiên MinibarUsages, dự phòng MinibarInspectionLines)
    const minibarUsages = await MinibarUsage.findAll({
      where: { StayId: stay.StayId },
      transaction,
      lock,
    });

    let minibarSubtotal = 0;
    const minibarList = [];

    if (minibarUsages && minibarUsages.length > 0) {
      for (const m of minibarUsages) {
        const itemTotal = Number(m.TotalAmount || 0);
        minibarSubtotal += itemTotal;
        minibarList.push({
          usageId: m.UsageId,
          itemId: m.ItemId,
          quantity: Number(m.Quantity),
          unitPrice: Number(m.UnitPrice),
          subtotal: itemTotal,
          usageDate: m.UsageDate,
        });
      }
    } else {
      try {
        const [lines] = await pool.query(
          `SELECT mil.LineId, mil.ProductName, mil.BillableQty, mil.UnitPrice, mil.LineAmount, mil.CreatedAt
           FROM MinibarInspectionLines mil
           JOIN MinibarInspections mi ON mil.InspectionId = mi.InspectionId
           WHERE mi.StayId = ? AND mi.Status = 'CONFIRMED' AND mil.BillableQty > 0`,
          [stay.StayId]
        );
        for (const l of lines || []) {
          const itemTotal = Number(l.LineAmount || 0);
          minibarSubtotal += itemTotal;
          minibarList.push({
            usageId: l.LineId,
            itemId: l.LineId,
            item: l.ProductName,
            quantity: Number(l.BillableQty),
            unitPrice: Number(l.UnitPrice),
            subtotal: itemTotal,
            usageDate: l.CreatedAt,
          });
        }
      } catch (_) {}
    }

    // 5.4. F&B Orders (Chỉ lấy RoomInvoice, bỏ PayNow)
    const foodOrders = await FoodOrder.findAll({
      where: {
        StayId: stay.StayId,
        PaymentMode: 'RoomInvoice',
        Status: { [Op.in]: ['Served', 'Delivered'] },
      },
      transaction,
      lock,
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

    // 5.5. Phí gia hạn lưu trú (StayExtensions)
    let extensionSubtotal = 0;
    const extensionList = [];
    try {
      const [extensions] = await pool.query(
        `SELECT ExtensionId, AdditionalNights, TotalAmount, BaseAmount, CreatedAt
         FROM StayExtensions
         WHERE StayId = ? AND ExtensionStatus = 'CONFIRMED'`,
        [stay.StayId]
      );
      for (const ext of extensions || []) {
        const extAmount = Number(ext.TotalAmount || ext.BaseAmount || 0);
        extensionSubtotal += extAmount;
        extensionList.push({
          extensionId: ext.ExtensionId,
          nights: Number(ext.AdditionalNights || 1),
          total: extAmount,
          createdAt: ext.CreatedAt,
        });
      }
    } catch (_) {}
    totalExtensionsAmount += extensionSubtotal;

    // 5.6. Phí bồi thường thiệt hại buồng phòng & phạt (DamageItems & Inspections)
    let damageSubtotal = 0;
    const damageList = [];
    try {
      const [damages] = await pool.query(
        `SELECT DamageItemId, ItemName, ApprovedCharge, ReasonCode, CreatedAt
         FROM DamageItems
         WHERE StayId = ? AND UPPER(Status) IN ('APPROVED', 'CONFIRMED', 'CHARGED')`,
        [stay.StayId]
      );
      for (const dam of damages || []) {
        const charge = Number(dam.ApprovedCharge || 0);
        if (charge > 0) {
          damageSubtotal += charge;
          damageList.push({
            damageId: dam.DamageItemId,
            item: dam.ItemName || 'Bồi thường tài sản phòng',
            total: charge,
            reason: dam.ReasonCode || '',
            createdAt: dam.CreatedAt,
          });
        }
      }

      const [inspections] = await pool.query(
        `SELECT InspectionId, LinenDamageFee, KeycardLossPenalty, CreatedAt
         FROM RoomInspectionReports
         WHERE StayId = ? AND UPPER(Status) NOT IN ('REJECTED', 'WAIVED')`,
        [stay.StayId]
      );
      for (const ins of inspections || []) {
        const linenFee = Number(ins.LinenDamageFee || 0);
        const keycardFee = Number(ins.KeycardLossPenalty || 0);
        if (linenFee > 0) {
          damageSubtotal += linenFee;
          damageList.push({
            damageId: `LINEN-${ins.InspectionId}`,
            item: 'Bồi thường đồ vải / nệm bẩn',
            total: linenFee,
            createdAt: ins.CreatedAt,
          });
        }
        if (keycardFee > 0) {
          damageSubtotal += keycardFee;
          damageList.push({
            damageId: `KEYCARD-${ins.InspectionId}`,
            item: 'Phí làm mất thẻ từ phòng',
            total: keycardFee,
            createdAt: ins.CreatedAt,
          });
        }
      }
    } catch (_) {}
    totalDamagesAmount += damageSubtotal;

    // 5.7. Tổng tiền riêng của Stay
    const staySubtotal = roomSubtotal + servicesSubtotal + minibarSubtotal + foodSubtotal + extensionSubtotal + damageSubtotal;
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
      extensions: extensionList,
      damages: damageList,
      staySubtotal,
    });
  }

  // 6. Tổng cộng toàn Booking
  // Loại trừ phần tiền gia hạn phòng và đền bù thiệt hại nếu đã được cộng dồn vào Bookings.SurchargeAmount
  const netSurcharge = Math.max(0, surchargeAmount - totalExtensionsAmount - totalDamagesAmount);
  const grandTotal = totalStaysSubtotal + netSurcharge - discountAmount;
  const remainingBalance = Math.max(0, grandTotal - effectivePaid);

  return {
    booking,
    estimated: false,
    hasPendingServices,
    stays: staysDetail,
    rawStays: stays,
    surchargeAmount: netSurcharge,
    discountAmount,
    grandTotal,
    totalPaid: effectivePaid,
    remainingBalance,
    paidPayments,
  };
}

/**
 * GET /api/v1/bookings/:bookingId/charges
 * Tính và trả về bản tổng hợp TẠM TÍNH toàn bộ chi phí phát sinh của 1 booking
 */
async function getBookingCharges(req, res) {
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
    const calcResult = await calculateBookingChargesData(bookingId);

    if (!calcResult) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại hoặc đã bị xoá',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId: calcResult.booking.BookingId,
        estimated: calcResult.estimated,
        hasPendingServices: calcResult.hasPendingServices,
        stays: calcResult.stays,
        surchargeAmount: calcResult.surchargeAmount,
        discountAmount: calcResult.discountAmount,
        grandTotal: calcResult.grandTotal,
        totalPaid: calcResult.totalPaid,
        remainingBalance: calcResult.remainingBalance,
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
}

module.exports = {
  calculateBookingChargesData,
  getBookingCharges,
  calculateStayNights,
  PAID_STATUSES,
};
