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

  // 1. Kiểm tra tồn tại Booking kèm Khách hàng và Hạng phòng
  const includeModels = [
    { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] },
    { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeName', 'BasePrice'] },
  ];

  const booking = !Number.isNaN(numBookingId)
    ? await Booking.findByPk(numBookingId, { include: includeModels, transaction, lock })
    : await Booking.findOne({ where: { ConfirmationCode: String(bookingId).trim() }, include: includeModels, transaction, lock });

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

  // 3. Lấy danh sách Stays thuộc booking kèm Room và RoomType
  const stays = await Stay.findAll({
    where: { BookingId: booking.BookingId },
    include: [
      {
        model: Room,
        include: [{ model: RoomType, as: 'roomType', attributes: ['TypeName', 'BasePrice'] }],
      },
    ],
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

  const guestName = booking.user?.FullName || 'Khách đặt phòng';
  const checkInDate = booking.CheckInDate;
  const checkOutDate = booking.CheckOutDate;

  // 4. Booking chưa có Stay nào (chưa check-in) -> Tạm tính theo kế hoạch
  if (!stays || stays.length === 0) {
    const grandTotal = Number(booking.TotalAmount) > 0
      ? Number(booking.TotalAmount)
      : Math.max(0, effectiveRoomSubtotal + surchargeAmount - discountAmount);
    const remainingBalance = Math.max(0, grandTotal - effectivePaid);

    const summary = {
      roomSubtotal: effectiveRoomSubtotal,
      extensionSubtotal: 0,
      minibarSubtotal: 0,
      serviceSubtotal: 0,
      foodSubtotal: 0,
      damageSubtotal: 0,
      surcharge: surchargeAmount,
      discount: discountAmount,
      grandTotal,
      totalPaid: effectivePaid,
      remainingBalance,
    };

    return {
      booking,
      guestName,
      roomNumber: 'Chưa gán phòng (Dự tính)',
      checkInDate,
      checkOutDate,
      estimated: true,
      hasPendingServices: false,
      stays: [],
      rawStays: [],
      extensions: [],
      minibar: [],
      services: [],
      foodAndBeverage: [],
      damages: [],
      summary,
      surchargeAmount,
      discountAmount,
      grandTotal,
      totalPaid: effectivePaid,
      remainingBalance,
      paidPayments,
    };
  }

  // 5. Tiền xử lý Gia hạn lưu trú (StayExtensions) để tách bạch đêm hợp đồng gốc và đêm gia hạn
  const stayIds = stays.map(s => s.StayId);
  const extensionsByStay = {};
  const extendedNightsByStay = {};
  let totalExtendedNights = 0;

  if (stayIds.length > 0) {
    try {
      const [allExtRows] = await pool.query(
        `SELECT ExtensionId, StayId, AdditionalNights, TotalAmount, BaseAmount, CreatedAt
         FROM StayExtensions
         WHERE StayId IN (?) AND UPPER(ExtensionStatus) = 'CONFIRMED'
         ORDER BY ExtensionId ASC`,
        [stayIds]
      );
      for (const ext of allExtRows || []) {
        const sid = ext.StayId;
        if (!extensionsByStay[sid]) extensionsByStay[sid] = [];
        extensionsByStay[sid].push(ext);
        const addN = Math.max(0, Number(ext.AdditionalNights || 0));
        extendedNightsByStay[sid] = (extendedNightsByStay[sid] || 0) + addN;
        totalExtendedNights += addN;
      }
    } catch (_) {}
  }

  // Tính chi tiết từng Stay
  const roomQuantity = Math.max(1, Number(booking.RoomQuantity || 1));
  const rawContractNights = calculateStayNights(null, booking);
  // Khi gia hạn phòng, stayExtensionRoutes cộng thêm AdditionalNights vào Bookings.NumberOfNights
  // nhưng giữ nguyên Bookings.RoomSubtotal (phần tiền gia hạn đẩy vào SurchargeAmount/StayExtensions).
  // Do đó số đêm hợp đồng gốc = rawContractNights - totalExtendedNights.
  const baseContractNights = Math.max(1, rawContractNights - totalExtendedNights);
  const unitNight = effectiveRoomSubtotal > 0
    ? effectiveRoomSubtotal / (roomQuantity * baseContractNights)
    : Number(booking.roomType?.BasePrice || 0);

  let hasPendingServices = false;
  let totalStaysSubtotal = 0;
  let totalRoomSubtotal = 0;
  let totalMinibarSubtotal = 0;
  let totalServiceSubtotal = 0;
  let totalFoodSubtotal = 0;
  let totalExtensionsAmount = 0;
  let totalDamagesAmount = 0;
  const staysDetail = [];
  const flatExtensions = [];
  const flatMinibar = [];
  const flatServices = [];
  const flatFood = [];
  const flatDamages = [];

  for (const stay of stays) {
    const roomNum = stay.Room?.RoomNumber || `P.${stay.RoomId}`;
    const roomTypeName = stay.Room?.roomType?.TypeName || booking.roomType?.TypeName || 'Tiêu chuẩn';

    // 5.1. Tiền phòng cơ sở (trừ số đêm đã tách riêng ở bảng Gia hạn lưu trú để không nhân đôi)
    const rawStayNights = calculateStayNights(stay, booking);
    const stayExtNights = extendedNightsByStay[stay.StayId] || 0;
    const nights = Math.max(1, rawStayNights - stayExtNights);
    const stayPricePerNight = unitNight || Number(stay.Room?.roomType?.BasePrice || 0);
    const roomSubtotal = stayPricePerNight * nights;
    totalRoomSubtotal += roomSubtotal;

    // 5.2. Dịch vụ ServiceOrders (kèm tên danh mục từ ServiceCategories)
    const serviceOrders = await ServiceOrder.findAll({
      where: { StayId: stay.StayId },
      transaction,
      lock,
    });

    let serviceNameMap = {};
    if (serviceOrders.length > 0) {
      const sIds = [...new Set(serviceOrders.map(s => s.ServiceId).filter(Boolean))];
      if (sIds.length > 0) {
        try {
          const [sRows] = await pool.query(
            `SELECT s.ServiceId, s.ServiceName, s.Description, sc.CategoryName
             FROM Services s
             LEFT JOIN ServiceCategories sc ON s.CategoryId = sc.CategoryId
             WHERE s.ServiceId IN (?)`,
            [sIds]
          );
          (sRows || []).forEach(r => { serviceNameMap[r.ServiceId] = r; });
        } catch (_) {
          try {
            const [sRowsFallback] = await pool.query(
              `SELECT ServiceId, ServiceName, Description FROM Services WHERE ServiceId IN (?)`,
              [sIds]
            );
            (sRowsFallback || []).forEach(r => { serviceNameMap[r.ServiceId] = r; });
          } catch (__) {}
        }
      }
    }

    const completedServices = [];
    let servicesSubtotal = 0;

    for (const order of serviceOrders) {
      if (order.Status === 'Completed') {
        const itemTotal = Number(order.TotalPrice || (Number(order.Quantity || 1) * Number(order.UnitPrice || 0)));
        servicesSubtotal += itemTotal;
        totalServiceSubtotal += itemTotal;
        const svInfo = serviceNameMap[order.ServiceId];
        const svName = svInfo?.ServiceName || `Dịch vụ #${order.ServiceId}`;
        const svObj = {
          orderId: order.OrderId,
          serviceId: order.ServiceId,
          stayId: stay.StayId,
          roomNumber: roomNum,
          service: svName,
          type: svInfo?.CategoryName || svInfo?.Description || 'Dịch vụ phòng',
          quantity: Number(order.Quantity || 1),
          unitPrice: Number(order.UnitPrice || 0),
          price: Number(order.UnitPrice || 0),
          subtotal: itemTotal,
          total: itemTotal,
          status: 'Hoàn thành',
          orderDate: order.OrderDate,
          orderedAt: order.OrderDate,
        };
        completedServices.push(svObj);
        flatServices.push(svObj);
      } else if (['Received', 'InProgress', 'Processing', 'Pending', 'Confirmed'].includes(order.Status)) {
        hasPendingServices = true;
      }
    }

    // 5.3. Tiêu thụ Minibar (ưu tiên MinibarUsages, tra tên từ cả InventoryItems và MinibarProducts; dự phòng MinibarInspectionLines)
    const minibarUsages = await MinibarUsage.findAll({
      where: { StayId: stay.StayId },
      transaction,
      lock,
    });

    let minibarItemNameMap = {};
    if (minibarUsages && minibarUsages.length > 0) {
      const itemIds = [...new Set(minibarUsages.map(m => m.ItemId).filter(Boolean))];
      if (itemIds.length > 0) {
        try {
          const [invRows] = await pool.query(
            `SELECT ItemId, ItemName FROM InventoryItems WHERE ItemId IN (?)`,
            [itemIds]
          );
          (invRows || []).forEach(r => { minibarItemNameMap[r.ItemId] = r.ItemName; });
        } catch (_) {}
        try {
          const [prodRows] = await pool.query(
            `SELECT ProductId, ProductName FROM MinibarProducts WHERE ProductId IN (?)`,
            [itemIds]
          );
          (prodRows || []).forEach(r => {
            if (!minibarItemNameMap[r.ProductId]) {
              minibarItemNameMap[r.ProductId] = r.ProductName;
            }
          });
        } catch (_) {}
      }
    }

    let minibarSubtotal = 0;
    const minibarList = [];

    if (minibarUsages && minibarUsages.length > 0) {
      for (const m of minibarUsages) {
        const itemTotal = Number(m.TotalAmount || (Number(m.Quantity || 1) * Number(m.UnitPrice || 0)));
        minibarSubtotal += itemTotal;
        totalMinibarSubtotal += itemTotal;
        const itemName = minibarItemNameMap[m.ItemId] || `Món Minibar #${m.ItemId}`;
        const mbObj = {
          usageId: m.UsageId,
          itemId: m.ItemId,
          stayId: stay.StayId,
          roomNumber: roomNum,
          item: itemName,
          quantity: Number(m.Quantity || 1),
          unitPrice: Number(m.UnitPrice || 0),
          price: Number(m.UnitPrice || 0),
          subtotal: itemTotal,
          total: itemTotal,
          usageDate: m.UsageDate,
          consumedAt: m.UsageDate,
        };
        minibarList.push(mbObj);
        flatMinibar.push(mbObj);
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
          totalMinibarSubtotal += itemTotal;
          const mbObj = {
            usageId: l.LineId,
            itemId: l.LineId,
            stayId: stay.StayId,
            roomNumber: roomNum,
            item: l.ProductName,
            quantity: Number(l.BillableQty || 1),
            unitPrice: Number(l.UnitPrice || 0),
            price: Number(l.UnitPrice || 0),
            subtotal: itemTotal,
            total: itemTotal,
            usageDate: l.CreatedAt,
            consumedAt: l.CreatedAt,
          };
          minibarList.push(mbObj);
          flatMinibar.push(mbObj);
        }
      } catch (_) {}
    }

    // 5.4. F&B Orders (Chỉ lấy RoomInvoice, bỏ PayNow; cảnh báo nếu còn đơn RoomInvoice đang chế biến)
    const allRoomInvoiceFoodOrders = await FoodOrder.findAll({
      where: {
        StayId: stay.StayId,
        PaymentMode: 'RoomInvoice',
      },
      include: [
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem, attributes: ['ItemName', 'Price'] }],
        },
      ],
      transaction,
      lock,
    });

    let foodSubtotal = 0;
    const foodList = [];
    for (const f of allRoomInvoiceFoodOrders) {
      if (['Served', 'Delivered', 'Completed'].includes(f.Status)) {
        const itemTotal = Number(f.TotalAmount || 0);
        foodSubtotal += itemTotal;
        totalFoodSubtotal += itemTotal;
        const itemsText = (f.details && f.details.length > 0)
          ? f.details.map(d => `${d.MenuItem?.ItemName || 'Món ăn'} (x${d.Quantity})`).join(', ')
          : `Đơn F&B #${f.FoodOrderId}`;
        const foObj = {
          foodOrderId: f.FoodOrderId,
          stayId: stay.StayId,
          roomNumber: roomNum,
          orderType: f.OrderType,
          status: f.Status,
          item: itemsText,
          quantity: 1,
          price: itemTotal,
          subtotal: itemTotal,
          total: itemTotal,
          orderCode: `FNB-${f.FoodOrderId}`,
          orderTime: f.OrderTime,
          orderedAt: f.OrderTime,
        };
        foodList.push(foObj);
        flatFood.push(foObj);
      } else if (['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready'].includes(f.Status)) {
        hasPendingServices = true;
      }
    }

    // 5.5. Phí gia hạn lưu trú (StayExtensions) & phụ thu nâng hạng đổi phòng (RoomMoveRequests)
    let extensionSubtotal = 0;
    const extensionList = [];
    const stayExts = extensionsByStay[stay.StayId] || [];
    for (const ext of stayExts) {
      const extAmount = Number(ext.TotalAmount || ext.BaseAmount || 0);
      extensionSubtotal += extAmount;
      const extObj = {
        extensionId: ext.ExtensionId,
        stayId: stay.StayId,
        roomNumber: roomNum,
        nights: Number(ext.AdditionalNights || 1),
        total: extAmount,
        createdAt: ext.CreatedAt,
      };
      extensionList.push(extObj);
      flatExtensions.push(extObj);
    }

    try {
      const [roomMoves] = await pool.query(
        `SELECT MoveRequestId, RateDifference, RateAdjustment, CompletedAt, CreatedAt
         FROM RoomMoveRequests
         WHERE StayId = ? AND UPPER(MoveStatus) = 'COMPLETED'
           AND UPPER(RateAdjustment) IN ('REPRICE_REMAINDER', 'APPLY_NEW_RATE', 'UPGRADE_SURCHARGE')
           AND RateDifference > 0`,
        [stay.StayId]
      );
      for (const mv of roomMoves || []) {
        const moveFee = Number(mv.RateDifference || 0);
        if (moveFee > 0) {
          extensionSubtotal += moveFee;
          const mvObj = {
            extensionId: `MOVE-${mv.MoveRequestId}`,
            stayId: stay.StayId,
            roomNumber: roomNum,
            nights: 1,
            total: moveFee,
            createdAt: mv.CompletedAt || mv.CreatedAt,
          };
          extensionList.push(mvObj);
          flatExtensions.push(mvObj);
        }
      }
    } catch (_) {}

    totalExtensionsAmount += extensionSubtotal;

    // 5.6. Phí bồi thường thiệt hại buồng phòng & phạt (DamageItems & RoomInspectionReports)
    let damageSubtotal = 0;
    const damageList = [];
    try {
      const [damages] = await pool.query(
        `SELECT DamageItemId, ItemName, ApprovedCharge, ProposedCharge, ReasonCode, DamageDescription, Status, CreatedAt
         FROM DamageItems
         WHERE StayId = ?`,
        [stay.StayId]
      );
      for (const dam of damages || []) {
        const upStatus = String(dam.Status || '').toUpperCase();
        if (['APPROVED', 'CONFIRMED', 'CHARGED'].includes(upStatus)) {
          const charge = Number(dam.ApprovedCharge || dam.ProposedCharge || 0);
          if (charge > 0) {
            damageSubtotal += charge;
            const damObj = {
              damageId: dam.DamageItemId,
              stayId: stay.StayId,
              roomNumber: roomNum,
              item: dam.ItemName || 'Bồi thường tài sản phòng',
              total: charge,
              reason: dam.ReasonCode || dam.DamageDescription || 'Biên bản kiểm phòng',
              createdAt: dam.CreatedAt,
            };
            damageList.push(damObj);
            flatDamages.push(damObj);
          }
        } else if (['SUBMITTED', 'DISPUTED', 'PENDING'].includes(upStatus)) {
          hasPendingServices = true;
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
          const linenObj = {
            damageId: `LINEN-${ins.InspectionId}`,
            stayId: stay.StayId,
            roomNumber: roomNum,
            item: 'Bồi thường đồ vải / nệm bẩn',
            reason: 'Biên bản kiểm phòng trả phòng',
            total: linenFee,
            createdAt: ins.CreatedAt,
          };
          damageList.push(linenObj);
          flatDamages.push(linenObj);
        }
        if (keycardFee > 0) {
          damageSubtotal += keycardFee;
          const keycardObj = {
            damageId: `KEYCARD-${ins.InspectionId}`,
            stayId: stay.StayId,
            roomNumber: roomNum,
            item: 'Phí làm mất thẻ từ phòng',
            reason: 'Biên bản kiểm phòng trả phòng',
            total: keycardFee,
            createdAt: ins.CreatedAt,
          };
          damageList.push(keycardObj);
          flatDamages.push(keycardObj);
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
      roomNumber: roomNum,
      roomTypeName,
      checkIn: stay.ActualCheckIn || checkInDate,
      checkOut: stay.ActualCheckOut || stay.ExpectedCheckOut || checkOutDate,
      nights,
      pricePerNight: stayPricePerNight,
      earlyCheckInFee: 0,
      lateCheckOutFee: 0,
      roomTotal: roomSubtotal,
      room: {
        nights,
        unitPrice: stayPricePerNight,
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

  const summary = {
    roomSubtotal: totalRoomSubtotal,
    extensionSubtotal: totalExtensionsAmount,
    minibarSubtotal: totalMinibarSubtotal,
    serviceSubtotal: totalServiceSubtotal,
    foodSubtotal: totalFoodSubtotal,
    damageSubtotal: totalDamagesAmount,
    surcharge: netSurcharge,
    discount: discountAmount,
    grandTotal,
    totalPaid: effectivePaid,
    remainingBalance,
  };

  return {
    booking,
    guestName,
    roomNumber: staysDetail[0]?.roomNumber || '—',
    checkInDate,
    checkOutDate,
    estimated: false,
    hasPendingServices,
    stays: staysDetail,
    rawStays: stays,
    extensions: flatExtensions,
    minibar: flatMinibar,
    services: flatServices,
    foodAndBeverage: flatFood,
    damages: flatDamages,
    summary,
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
 * Tính và trả về bản tổng hợp toàn bộ chi phí thực tế và tạm tính của 1 booking
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
        confirmationCode: calcResult.booking.ConfirmationCode,
        guestName: calcResult.guestName,
        roomNumber: calcResult.roomNumber,
        checkInDate: calcResult.checkInDate,
        checkOutDate: calcResult.checkOutDate,
        estimated: calcResult.estimated,
        hasPendingServices: calcResult.hasPendingServices,
        stays: calcResult.stays,
        extensions: calcResult.extensions,
        minibar: calcResult.minibar,
        services: calcResult.services,
        foodAndBeverage: calcResult.foodAndBeverage,
        damages: calcResult.damages,
        summary: calcResult.summary,
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
