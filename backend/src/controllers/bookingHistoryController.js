'use strict';

/**
 * controllers/bookingHistoryController.js
 * 
 * TÍNH NĂNG 9: XEM LỊCH SỬ ĐẶT PHÒNG & HỦY ĐẶT PHÒNG THEO QUY ĐỊNH (BOOKING HISTORY & CANCELLATION MANAGEMENT)
 * Mã tính năng: FEAT-GUEST-09 (Mã truy vết: A9)
 * Màn hình liên quan: Màn hình 9 (My Bookings & Reservation Archive)
 * 
 * Endpoints:
 * - GET /api/v1/me/bookings (hoặc /me/bookings)
 * - GET /api/v1/me/bookings/:bookingId
 * - PATCH /api/v1/me/bookings/:bookingId/cancel (hoặc /me/bookings/:bookingId/cancel)
 * 
 * Mã thông báo & lỗi chuẩn:
 * - ERROR_0036_CANNOT_CANCEL_IN_HOUSE: "Không thể hủy đơn đặt phòng khi khách đang trong thời gian lưu trú"
 * - ERROR_0037_BOOKING_ALREADY_CANCELLED: "Đơn đặt phòng này đã được hủy trước đó"
 * - SUCCESS_0005_BOOKING_CANCELLED: "Hủy đặt phòng thành công! Tiền cọc sẽ được hoàn lại theo quy định"
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Booking,
  BookingGuest,
  RoomType,
  Room,
  Branch,
  Voucher,
  Stay,
  Payment,
  Invoice,
  InvoiceDetail,
  User
} = require('../models');
const { broadcastRoomEvent } = require('../sockets/socketHandler');

const SPEC_CODES = {
  CANNOT_CANCEL_IN_HOUSE: 'ERROR_0036_CANNOT_CANCEL_IN_HOUSE',
  ALREADY_CANCELLED: 'ERROR_0037_BOOKING_ALREADY_CANCELLED',
  SUCCESS_CANCELLED: 'SUCCESS_0005_BOOKING_CANCELLED',
  UNAUTHENTICATED: 'ERROR_0009_UNAUTHENTICATED',
  FORBIDDEN: 'ERROR_0010_FORBIDDEN',
  NOT_FOUND: 'ERROR_0004_NOT_FOUND',
  INVALID_INPUT: 'ERROR_0001_INVALID_INPUT'
};

const SPEC_MESSAGES = {
  CANNOT_CANCEL_IN_HOUSE: 'Không thể hủy đơn đặt phòng khi khách đang trong thời gian lưu trú',
  ALREADY_CANCELLED: 'Đơn đặt phòng này đã được hủy trước đó',
  SUCCESS_CANCELLED: 'Hủy đặt phòng thành công! Tiền cọc sẽ được hoàn lại theo quy định',
  UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện chức năng này',
  FORBIDDEN: 'Bạn không có quyền truy cập thông tin đặt phòng này',
  NOT_FOUND: 'Không tìm thấy thông tin đơn đặt phòng',
  INVALID_INPUT: 'Dữ liệu đầu vào không hợp lệ'
};

/**
 * Helper: Lấy userId từ JWT req.user hoặc fallback query/header (cho testing linh hoạt)
 */
function resolveUserId(req) {
  if (req.user && (req.user.userId || req.user.id || req.user.UserId)) {
    return Number(req.user.userId || req.user.id || req.user.UserId);
  }
  if (req.query && req.query.userId) {
    return Number(req.query.userId);
  }
  if (req.headers && req.headers['x-user-id']) {
    return Number(req.headers['x-user-id']);
  }
  return null;
}

/**
 * 1. GET /api/v1/me/bookings (hoặc /me/bookings)
 * Tra cứu danh sách lịch sử đặt phòng cá nhân
 * Query params:
 * - statusFilter: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE_ONLY' | 'ALL'
 * - dateWindow: 'ALL UPCOMING' | 'PAST 6 MONTHS' | 'PAST YEAR' | 'ALL'
 * - searchKeyword: từ khóa mã đơn, tên phòng, ngày lưu trú
 * - page, limit
 */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        errorCode: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const {
      statusFilter = 'ALL',
      dateWindow = 'ALL',
      searchKeyword = '',
      page = 1,
      limit = 20
    } = req.query;

    const whereConditions = {
      UserId: userId
    };

    // Filter theo statusFilter
    const normStatus = String(statusFilter).trim().toUpperCase();
    if (normStatus === 'UPCOMING') {
      whereConditions.Status = { [Op.in]: ['Pending', 'Confirmed'] };
    } else if (normStatus === 'COMPLETED') {
      whereConditions.Status = 'Completed';
    } else if (normStatus === 'CANCELLED') {
      whereConditions.Status = 'Cancelled';
    } else if (normStatus === 'ACTIVE_ONLY') {
      whereConditions.Status = { [Op.in]: ['Pending', 'Confirmed', 'CheckedIn'] };
    }

    // Filter theo dateWindow
    const now = new Date();
    const normDateWindow = String(dateWindow).trim().toUpperCase();
    if (normDateWindow === 'ALL UPCOMING') {
      whereConditions.CheckInDate = { [Op.gte]: now.toISOString().slice(0, 10) };
    } else if (normDateWindow === 'PAST 6 MONTHS') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      whereConditions.CheckInDate = { [Op.gte]: sixMonthsAgo.toISOString().slice(0, 10) };
    } else if (normDateWindow === 'PAST YEAR') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      whereConditions.CheckInDate = { [Op.gte]: oneYearAgo.toISOString().slice(0, 10) };
    }

    // Filter theo searchKeyword
    const keyword = String(searchKeyword).trim();
    if (keyword) {
      whereConditions[Op.or] = [
        { ConfirmationCode: { [Op.like]: `%${keyword}%` } },
        { Note: { [Op.like]: `%${keyword}%` } },
        { CheckInDate: { [Op.like]: `%${keyword}%` } },
        { CheckOutDate: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: RoomType,
          as: 'roomType',
          attributes: ['RoomTypeId', 'TypeName', 'TypeCode', 'BasePrice', 'ImageUrl', 'BedType', 'ViewType', 'AreaSqm', 'Amenities']
        },
        {
          model: BookingGuest,
          as: 'guests',
          attributes: ['BookingGuestId', 'FullName', 'Email', 'Phone', 'IsPrimaryGuest']
        },
        {
          model: Voucher,
          as: 'voucher',
          attributes: ['VoucherId', 'Code', 'DiscountType', 'DiscountValue']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['PaymentId', 'Amount', 'PaymentMethod', 'PaymentDate', 'TransactionCode', 'Status', 'RefundAmount', 'RefundReason']
        },
        {
          model: Stay,
          attributes: ['StayId', 'RoomId', 'ActualCheckIn', 'ExpectedCheckOut', 'ActualCheckOut', 'Status', 'DepositAmount'],
          include: [
            {
              model: Room,
              attributes: ['RoomId', 'RoomNumber', 'Floor', 'BranchId'],
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  attributes: ['BranchId', 'BranchName', 'Address']
                }
              ]
            }
          ]
        },
        {
          model: Invoice,
          attributes: ['InvoiceId', 'InvoiceNumber', 'InvoiceDate', 'Subtotal', 'VATRate', 'VATAmount', 'TotalAmount', 'Status', 'PdfPath'],
          include: [
            {
              model: InvoiceDetail,
              as: 'details',
              attributes: ['DetailId', 'ItemType', 'Description', 'Quantity', 'UnitPrice', 'TotalPrice']
            }
          ]
        }
      ],
      order: [['CreatedAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    // Thống kê nhanh theo tab (Upcoming, Completed, Cancelled)
    const upcomingCount = await Booking.count({
      where: { UserId: userId, Status: { [Op.in]: ['Pending', 'Confirmed'] } }
    });
    const completedCount = await Booking.count({
      where: { UserId: userId, Status: 'Completed' }
    });
    const cancelledCount = await Booking.count({
      where: { UserId: userId, Status: 'Cancelled' }
    });

    // Format dữ liệu trả về cho frontend
    const formattedData = bookings.map((b) => {
      const bJson = b.toJSON();
      const primaryGuest = (bJson.guests && bJson.guests.find((g) => g.IsPrimaryGuest)) || (bJson.guests && bJson.guests[0]) || null;
      const stay = (bJson.Stays && bJson.Stays[0]) || null;
      const assignedRoom = stay && stay.Room ? stay.Room : null;
      const branch = assignedRoom && assignedRoom.branch ? assignedRoom.branch : null;

      // Tính tổng số tiền đã thanh toán (qua Payments)
      const paidPayments = (bJson.payments || []).filter((p) => p.Status === 'Completed' || p.Status === 'Success');
      const totalPaid = paidPayments.reduce((acc, cur) => acc + Number(cur.Amount || 0), 0);
      const totalRefunded = (bJson.payments || []).reduce((acc, cur) => acc + Number(cur.RefundAmount || 0), 0);

      // Tính số giờ còn lại đến giờ check-in (mặc định 14:00 giờ check-in)
      const checkInDateTime = new Date(`${bJson.CheckInDate}T14:00:00+07:00`);
      const hoursUntilCheckIn = (checkInDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      return {
        bookingId: bJson.BookingId,
        confirmationCode: bJson.ConfirmationCode || `#GH-${bJson.BookingId}`,
        status: bJson.Status,
        checkInDate: bJson.CheckInDate,
        checkOutDate: bJson.CheckOutDate,
        numberOfNights: bJson.NumberOfNights,
        adults: bJson.Adults,
        children: bJson.Children,
        roomQuantity: bJson.RoomQuantity,
        roomSubtotal: Number(bJson.RoomSubtotal || 0),
        surchargeAmount: Number(bJson.SurchargeAmount || 0),
        discountAmount: Number(bJson.DiscountAmount || 0),
        totalAmount: Number(bJson.TotalAmount || 0),
        depositAmount: Number(bJson.DepositAmount || 0),
        totalPaid,
        totalRefunded,
        hoursUntilCheckIn: Math.round(hoursUntilCheckIn * 10) / 10,
        isEligibleForFullRefund: hoursUntilCheckIn >= 72,
        note: bJson.Note,
        bookingQrCode: bJson.BookingQrCode || null,
        createdAt: bJson.CreatedAt,
        roomType: bJson.roomType,
        primaryGuest,
        assignedRoom: assignedRoom
          ? {
              roomId: assignedRoom.RoomId,
              roomNumber: assignedRoom.RoomNumber,
              floor: assignedRoom.Floor
            }
          : null,
        branch: branch
          ? {
              branchId: branch.BranchId,
              branchName: branch.BranchName,
              address: branch.Address
            }
          : null,
        payments: bJson.payments || [],
        invoices: bJson.Invoices || [],
        stays: bJson.Stays || []
      };
    });

    return res.json({
      success: true,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        counts: {
          upcoming: upcomingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          all: count
        }
      },
      data: formattedData
    });
  } catch (error) {
    console.error('Error in getMyBookings:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Lỗi máy chủ khi lấy danh sách lịch sử đặt phòng',
      error: error.message
    });
  }
};

/**
 * 2. GET /api/v1/me/bookings/:bookingId
 * Xem chi tiết một đơn đặt phòng của khách
 */
exports.getMyBookingDetail = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        errorCode: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const { bookingId } = req.params;
    const booking = await Booking.findOne({
      where: {
        BookingId: bookingId,
        UserId: userId
      },
      include: [
        {
          model: RoomType,
          as: 'roomType'
        },
        {
          model: BookingGuest,
          as: 'guests'
        },
        {
          model: Voucher,
          as: 'voucher'
        },
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: Stay,
          include: [
            {
              model: Room,
              include: [{ model: Branch, as: 'branch' }]
            }
          ]
        },
        {
          model: Invoice,
          include: [{ model: InvoiceDetail, as: 'details' }]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: SPEC_CODES.NOT_FOUND,
        message: SPEC_MESSAGES.NOT_FOUND
      });
    }

    const bJson = booking.toJSON();
    const primaryGuest = (bJson.guests && bJson.guests.find((g) => g.IsPrimary)) || (bJson.guests && bJson.guests[0]) || null;
    const stay = (bJson.Stays && bJson.Stays[0]) || null;
    const assignedRoom = stay && stay.Room ? stay.Room : null;
    const branch = assignedRoom && assignedRoom.branch ? assignedRoom.branch : null;

    const paidPayments = (bJson.payments || []).filter((p) => p.Status === 'Completed' || p.Status === 'Success');
    const totalPaid = paidPayments.reduce((acc, cur) => acc + Number(cur.Amount || 0), 0);
    const totalRefunded = (bJson.payments || []).reduce((acc, cur) => acc + Number(cur.RefundAmount || 0), 0);

    const checkInDateTime = new Date(`${bJson.CheckInDate}T14:00:00+07:00`);
    const hoursUntilCheckIn = (checkInDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    return res.json({
      success: true,
      data: {
        bookingId: bJson.BookingId,
        confirmationCode: bJson.ConfirmationCode || `#GH-${bJson.BookingId}`,
        status: bJson.Status,
        checkInDate: bJson.CheckInDate,
        checkOutDate: bJson.CheckOutDate,
        numberOfNights: bJson.NumberOfNights,
        adults: bJson.Adults,
        children: bJson.Children,
        roomQuantity: bJson.RoomQuantity,
        roomSubtotal: Number(bJson.RoomSubtotal || 0),
        surchargeAmount: Number(bJson.SurchargeAmount || 0),
        discountAmount: Number(bJson.DiscountAmount || 0),
        totalAmount: Number(bJson.TotalAmount || 0),
        depositAmount: Number(bJson.DepositAmount || 0),
        totalPaid,
        totalRefunded,
        hoursUntilCheckIn: Math.round(hoursUntilCheckIn * 10) / 10,
        isEligibleForFullRefund: hoursUntilCheckIn >= 72,
        note: bJson.Note,
        bookingQrCode: bJson.BookingQrCode || null,
        createdAt: bJson.CreatedAt,
        roomType: bJson.roomType,
        guests: bJson.guests || [],
        primaryGuest,
        assignedRoom,
        branch,
        payments: bJson.payments || [],
        invoices: bJson.Invoices || [],
        stays: bJson.Stays || []
      }
    });
  } catch (error) {
    console.error('Error in getMyBookingDetail:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: error.message
    });
  }
};

/**
 * 3. PATCH /api/v1/me/bookings/:bookingId/cancel (hoặc /me/bookings/:bookingId/cancel)
 * Hủy đặt phòng theo chính sách hoàn cọc (FEAT-GUEST-09 / A9)
 * 
 * QUY TẮC NGHIỆP VỤ:
 * - Nếu trạng thái Booking là 'CheckedIn' hoặc có Stay active/in-house:
 *   -> Chặn ngay, trả về ERROR_0036_CANNOT_CANCEL_IN_HOUSE: "Không thể hủy đơn đặt phòng khi khách đang trong thời gian lưu trú"
 * - Nếu trạng thái Booking đã là 'Cancelled':
 *   -> Chặn ngay, trả về ERROR_0037_BOOKING_ALREADY_CANCELLED: "Đơn đặt phòng này đã được hủy trước đó"
 * - Kiểm tra thời gian check-in:
 *   + Hủy trước 72 giờ (>= 72h): Hoàn cọc 100% (TC01)
 *   + Hủy cận giờ (< 72h): Phạt 100% cọc, hoàn 0% (TC02)
 * - Cập nhật trạng thái Booking sang 'Cancelled'
 * - Tạo/Cập nhật bản ghi Payment hoàn tiền (nếu có hoàn tiền)
 * - Trả về thông báo thành công: SUCCESS_0005_BOOKING_CANCELLED: "Hủy đặt phòng thành công! Tiền cọc sẽ được hoàn lại theo quy định"
 */
exports.cancelMyBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        errorCode: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const { bookingId } = req.params;
    const { cancellationReason = 'Khách yêu cầu hủy qua ứng dụng' } = req.body || {};

    // 1. Tìm đơn đặt phòng với khóa bi-quan FOR UPDATE
    const booking = await Booking.findOne({
      where: {
        BookingId: bookingId,
        UserId: userId
      },
      include: [
        {
          model: Stay
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: SPEC_CODES.NOT_FOUND,
        errorCode: SPEC_CODES.NOT_FOUND,
        message: SPEC_MESSAGES.NOT_FOUND
      });
    }

    // 2. Kiểm tra nếu đơn đã hủy trước đó
    if (booking.Status === 'Cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: SPEC_CODES.ALREADY_CANCELLED,
        errorCode: SPEC_CODES.ALREADY_CANCELLED,
        message: SPEC_MESSAGES.ALREADY_CANCELLED
      });
    }

    // 3. Kiểm tra nếu khách đang lưu trú (In-House / CheckedIn)
    const activeStay = (booking.Stays || []).find((s) =>
      ['CheckedIn', 'Active', 'InHouse'].includes(s.Status)
    );
    if (booking.Status === 'CheckedIn' || activeStay) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: SPEC_CODES.CANNOT_CANCEL_IN_HOUSE,
        errorCode: SPEC_CODES.CANNOT_CANCEL_IN_HOUSE,
        message: SPEC_MESSAGES.CANNOT_CANCEL_IN_HOUSE
      });
    }

    // Nếu đơn đã hoàn thành kỳ nghỉ (Completed)
    if (booking.Status === 'Completed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0038_BOOKING_ALREADY_COMPLETED',
        message: 'Kỳ nghỉ này đã kết thúc, không thể thực hiện hủy phòng'
      });
    }

    // 4. Tính toán thời gian từ hiện tại tới giờ Check-in (Mặc định 14:00 giờ Check-in)
    // Hỗ trợ truyền mockServerTime hoặc req.body.cancellationTime cho unit testing nếu có
    const nowTime = req.body.mockServerTime ? new Date(req.body.mockServerTime) : new Date();
    const checkInDateTime = new Date(`${booking.CheckInDate}T14:00:00+07:00`);
    const diffMs = checkInDateTime.getTime() - nowTime.getTime();
    const hoursRemaining = diffMs / (1000 * 60 * 60);

    // Tính toán số tiền cọc đã ghi nhận
    const depositAmount = Number(booking.DepositAmount || 0);

    let refundPercentage = 0;
    let penaltyPercentage = 100;
    let refundAmount = 0;
    let penaltyAmount = depositAmount;
    let refundPolicyNote = '';

    // Quy định hủy:
    // Hủy trước 72 giờ: Hoàn 100% cọc, phạt 0%
    // Hủy cận giờ (< 72 giờ): Phạt 100% cọc, hoàn 0%
    if (hoursRemaining >= 72) {
      refundPercentage = 100;
      penaltyPercentage = 0;
      refundAmount = depositAmount;
      penaltyAmount = 0;
      refundPolicyNote = `Hủy trước giờ nhận phòng ${Math.round(hoursRemaining)} giờ (>= 72h). Đủ điều kiện hoàn cọc 100%.`;
    } else {
      refundPercentage = 0;
      penaltyPercentage = 100;
      refundAmount = 0;
      penaltyAmount = depositAmount;
      refundPolicyNote = `Hủy cận giờ (${Math.round(hoursRemaining)} giờ < 72h). Áp dụng phạt 100% tiền đặt cọc theo chính sách hủy phòng.`;
    }

    // 5. Cập nhật trạng thái Booking
    booking.Status = 'Cancelled';
    booking.Note = [
      booking.Note || '',
      `[HỦY PHÒNG]: ${cancellationReason}. ${refundPolicyNote}`
    ]
      .filter(Boolean)
      .join(' | ');
    await booking.save({ transaction });

    // 6. Xử lý bản ghi thanh toán hoàn cọc nếu có
    if (depositAmount > 0) {
      if (refundAmount > 0) {
        // Cập nhật các bản ghi Payment trước đó hoặc tạo Payment refund
        const existingDepositPayment = (booking.payments || []).find(
          (p) => (p.Status === 'Completed' || p.Status === 'Success') && Number(p.Amount) > 0
        );

        if (existingDepositPayment) {
          existingDepositPayment.RefundAmount = refundAmount;
          existingDepositPayment.RefundReason = refundPolicyNote;
          await existingDepositPayment.save({ transaction });
        }

        // Tạo bản ghi Payment ghi nhận giao dịch hoàn tiền (Refund transaction)
        await Payment.create(
          {
            BookingId: booking.BookingId,
            UserId: userId,
            Amount: refundAmount,
            PaymentMethod: existingDepositPayment ? existingDepositPayment.PaymentMethod : 'BankTransfer',
            PaymentDate: nowTime,
            TransactionCode: `REFUND-${booking.BookingId}-${Date.now().toString().slice(-6)}`,
            Status: 'Refunded',
            RefundAmount: refundAmount,
            RefundReason: refundPolicyNote
          },
          { transaction }
        );
      } else {
        // Phạt 100% cọc: cập nhật lý do không hoàn cọc vào Payment
        const existingDepositPayment = (booking.payments || []).find(
          (p) => (p.Status === 'Completed' || p.Status === 'Success') && Number(p.Amount) > 0
        );
        if (existingDepositPayment) {
          existingDepositPayment.RefundAmount = 0;
          existingDepositPayment.RefundReason = refundPolicyNote;
          await existingDepositPayment.save({ transaction });
        }
      }
    }

    // 7. Giải phóng phòng vật lý nếu đã gán (trong Stays)
    if (booking.Stays && booking.Stays.length > 0) {
      for (const st of booking.Stays) {
        if (st.Status === 'Assigned' || st.Status === 'Pending') {
          st.Status = 'Cancelled';
          await st.save({ transaction });

          if (st.RoomId) {
            await Room.update(
              { Status: 'CleanAvailable' },
              { where: { RoomId: st.RoomId }, transaction }
            );
          }
        }
      }
    }

    await transaction.commit();

    // 8. Phát sự kiện WebSocket thông báo phòng đã được giải phóng
    try {
      broadcastRoomEvent('BOOKING_CANCELLED', {
        bookingId: booking.BookingId,
        roomTypeId: booking.RoomTypeId,
        checkInDate: booking.CheckInDate,
        checkOutDate: booking.CheckOutDate
      });
    } catch (wsErr) {
      console.warn('WebSocket broadcast warning:', wsErr.message);
    }

    return res.json({
      success: true,
      code: SPEC_CODES.SUCCESS_CANCELLED,
      errorCode: SPEC_CODES.SUCCESS_CANCELLED,
      message: SPEC_MESSAGES.SUCCESS_CANCELLED,
      data: {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode || `#GH-${booking.BookingId}`,
        status: 'Cancelled',
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        refundPercentage,
        penaltyPercentage,
        depositAmount,
        refundAmount,
        penaltyAmount,
        refundPolicyNote,
        cancelledAt: nowTime
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in cancelMyBooking:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Lỗi hệ thống khi thực hiện hủy đặt phòng',
      error: error.message
    });
  }
};
