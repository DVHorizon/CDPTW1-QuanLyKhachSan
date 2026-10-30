'use strict';

/**
 * controllers/onlineDepositPaymentController.js
 * 
 * TÍNH NĂNG 8: THANH TOÁN TIỀN CỌC / TRẢ TRƯỚC QUA CỔNG THANH TOÁN (ONLINE DEPOSIT PAYMENT INTEGRATION)
 * Mã tính năng: FEAT-GUEST-08 (Mã truy vết: A8)
 * Màn hình liên quan: Màn hình 7 (Payment & Guarantee - Checkout Step 2)
 */

const { sequelize, Booking, BookingGuest, RoomType, Payment, User } = require('../models');
const { broadcastRoomEvent } = require('../sockets/socketHandler');

// 15 phút thời hạn phiên giữ phòng
const SESSION_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Thuật toán kiểm tra số thẻ theo Luhn Checksum (Mod 10)
 */
function isValidLuhn(cardNumber) {
  if (!cardNumber) return false;
  const digits = String(cardNumber).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/**
 * Kiểm tra hạn sử dụng thẻ (MM/YY)
 */
function isCardExpired(expiryDate) {
  if (!expiryDate || typeof expiryDate !== 'string') return true;
  const cleanExp = expiryDate.trim();
  if (!/^\d{2}\/\d{2}$/.test(cleanExp)) return true;

  const [mmStr, yyStr] = cleanExp.split('/');
  const mm = parseInt(mmStr, 10);
  const yy = parseInt('20' + yyStr, 10);

  if (mm < 1 || mm > 12) return true;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (yy < currentYear) return true;
  if (yy === currentYear && mm < currentMonth) return true;

  return false;
}

/**
 * Lấy thông tin booking phục vụ Màn hình 7 (Checkout Step 2)
 * GET /api/v1/guest/bookings/:id
 */
exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let booking = null;

    if (!isNaN(Number(id))) {
      booking = await Booking.findByPk(Number(id), {
        include: [
          { model: RoomType, as: 'roomType' },
          { model: BookingGuest, as: 'guests' },
          { model: Payment, as: 'payments' }
        ]
      });
    }

    if (!booking) {
      booking = await Booking.findOne({
        where: { ConfirmationCode: id },
        include: [
          { model: RoomType, as: 'roomType' },
          { model: BookingGuest, as: 'guests' },
          { model: Payment, as: 'payments' }
        ]
      });
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Không tìm thấy thông tin đơn đặt phòng.'
      });
    }

    // Tính thời gian còn lại của phiên giữ phòng 15 phút
    const createdAtMs = new Date(booking.CreatedAt).getTime();
    const elapsedMs = Date.now() - createdAtMs;
    const remainingMs = Math.max(0, SESSION_EXPIRY_MS - elapsedMs);
    const timeoutSeconds = Math.floor(remainingMs / 1000);
    const isExpired = timeoutSeconds <= 0 && booking.Status === 'Pending';

    let parsedNote = {};
    try {
      if (booking.Note) parsedNote = JSON.parse(booking.Note);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        status: booking.Status,
        checkInDate: booking.CheckInDate,
        checkOutDate: booking.CheckOutDate,
        numberOfNights: booking.NumberOfNights,
        adults: booking.Adults,
        children: booking.Children,
        roomQuantity: booking.RoomQuantity,
        roomSubtotal: booking.RoomSubtotal,
        discountAmount: booking.DiscountAmount,
        surchargeAmount: booking.SurchargeAmount,
        totalAmount: parseFloat(booking.TotalAmount),
        depositAmount: parseFloat(booking.DepositAmount),
        roomType: booking.roomType,
        primaryGuest: booking.guests?.[0] || null,
        note: parsedNote,
        timeoutSeconds,
        isExpired,
        payments: booking.payments || []
      }
    });
  } catch (error) {
    console.error('Error in getBookingDetails:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_INTERNAL',
      message: 'Lỗi khi tải thông tin đơn đặt phòng.'
    });
  }
};

/**
 * Xử lý thanh toán cọc / trả trước trực tuyến (FEAT-GUEST-08)
 * POST /api/v1/guest/bookings/:bookingId/deposit or POST /bookings/:bookingId/deposit
 */
exports.processDepositPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { bookingId } = req.params;
    const {
      depositOption = 'DEPOSIT_50', // 'DEPOSIT_20' | 'DEPOSIT_50' | 'FULL_PAYMENT'
      paymentMethod = 'BANK_TRANSFER', // 'CREDIT_CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET' | 'POINTS' | 'VOUCHER'
      cardholderName = '',
      cardNumber = '',
      expiryDate = '',
      cvvCode = '',
      usedPoints = 0,
      walletProvider = 'VNPAY',
      forceTimeoutCheck = true
    } = req.body;

    // 1. Kiểm tra đơn đặt phòng
    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Đơn đặt phòng không tồn tại.'
      });
    }

    if (booking.Status === 'Confirmed') {
      await transaction.rollback();
      return res.status(200).json({
        success: true,
        message: 'Đơn đặt phòng này đã được thanh toán cọc thành công trước đó.',
        data: {
          bookingId: booking.BookingId,
          confirmationCode: booking.ConfirmationCode,
          status: booking.Status
        }
      });
    }

    // 2. Kiểm tra phiên giữ phòng 15 phút (TC hết phiên: ERROR_0033_SESSION_EXPIRED)
    const createdAtMs = new Date(booking.CreatedAt).getTime();
    const elapsedMs = Date.now() - createdAtMs;
    // Thêm 30s buffer tránh network latency
    if (forceTimeoutCheck && elapsedMs > SESSION_EXPIRY_MS + 30000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0033_SESSION_EXPIRED',
        message: 'Phiên giữ phòng đã hết thời gian 15 phút. Vui lòng thực hiện đặt lại phòng'
      });
    }

    const totalAmount = parseFloat(booking.TotalAmount || 0);

    // 3. Tính toán số tiền thanh toán theo tùy chọn đặt cọc
    let payableAmount = 0;
    if (depositOption === 'DEPOSIT_20') {
      payableAmount = Math.round(totalAmount * 0.2); // 20%
    } else if (depositOption === 'DEPOSIT_50') {
      payableAmount = Math.round(totalAmount * 0.5); // 50%
    } else {
      payableAmount = totalAmount; // FULL_PAYMENT 100%
    }

    // Giảm trừ điểm thưởng nếu có
    if (usedPoints && Number(usedPoints) > 0) {
      const pointDiscount = Math.min(payableAmount * 0.5, Number(usedPoints) * 100); // 1 điểm = 100đ
      payableAmount = Math.max(0, payableAmount - pointDiscount);
    }

    // 4. Kiểm tra hợp lệ nếu thanh toán bằng thẻ (Credit / Debit Card)
    let cleanCardNumber = '';
    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'Thẻ Quốc Tế') {
      cleanCardNumber = String(cardNumber || '').replace(/[\s-]/g, '');

      // TC01: Kiểm tra thuật toán Luhn
      if (!isValidLuhn(cleanCardNumber)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0030_INVALID_CARD_NUMBER',
          message: 'Số thẻ thanh toán không hợp lệ (sai định dạng Luhn)'
        });
      }

      // Kiểm tra ngày hết hạn
      if (isCardExpired(expiryDate)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0031_CARD_EXPIRED',
          message: 'Thẻ thanh toán đã hết hạn sử dụng'
        });
      }

      // Kiểm tra CVV
      const cleanCvv = String(cvvCode || '').trim();
      if (!/^\d{3,4}$/.test(cleanCvv)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0032_PAYMENT_DECLINED',
          message: 'Giao dịch bị từ chối bởi ngân hàng phát hành thẻ. Vui lòng thử phương thức khác'
        });
      }

      // Giả lập từ chối thẻ từ ngân hàng nếu thẻ test cố tình (CVV '000', thẻ kết thúc '9999', tên 'DECLINE')
      if (cleanCvv === '000' || cleanCardNumber.endsWith('9999') || cardholderName?.toUpperCase() === 'DECLINE') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0032_PAYMENT_DECLINED',
          message: 'Giao dịch bị từ chối bởi ngân hàng phát hành thẻ. Vui lòng thử phương thức khác'
        });
      }
    }

    // 5. DB Transaction: Tạo bản ghi Payments và cập nhật trạng thái Booking
    const transactionCode = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    const paymentRecord = await Payment.create({
      BookingId: booking.BookingId,
      UserId: booking.UserId || req.user?.id || 1,
      Amount: payableAmount,
      PaymentMethod: paymentMethod,
      PaymentDate: new Date(),
      TransactionCode: transactionCode,
      Status: 'Completed',
      GatewayResponse: JSON.stringify({
        depositOption,
        paymentMethod,
        walletProvider,
        last4Digits: cleanCardNumber ? cleanCardNumber.slice(-4) : null,
        paidAt: new Date().toISOString()
      })
    }, { transaction });

    // Cập nhật booking sang trạng thái Confirmed và cập nhật số tiền cọc đã trả
    const updatedDeposit = parseFloat(booking.DepositAmount || 0) + payableAmount;
    await booking.update({
      Status: 'Confirmed',
      DepositAmount: updatedDeposit,
      BookingQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${booking.ConfirmationCode}`,
      ConfirmationSentAt: new Date()
    }, { transaction });

    await transaction.commit();

    // 6. Phát sóng sự kiện Realtime WebSocket
    try {
      broadcastRoomEvent('PAYMENT_COMPLETED', {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        transactionCode,
        amountPaid: payableAmount,
        depositOption,
        paymentMethod,
        status: 'Confirmed'
      });
      broadcastRoomEvent('BOOKING_CONFIRMED', {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        status: 'Confirmed'
      });

      // FEAT-GUEST-10: Tự động kích hoạt gửi Email xác nhận đặt phòng kèm mã QR
      try {
        const { sendBookingConfirmationEmail } = require('../services/qrEmailService');
        sendBookingConfirmationEmail(booking.BookingId).catch(mailErr => console.warn('[Email] Async mail warn:', mailErr.message));
      } catch (err) {}
    } catch (wsErr) {
      console.warn('Warning: Socket broadcast failed:', wsErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Thanh toán tiền cọc thành công. Đơn đặt phòng đã được xác nhận.',
      data: {
        paymentId: paymentRecord.PaymentId,
        transactionCode: paymentRecord.TransactionCode,
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        bookingStatus: 'Confirmed',
        amountPaid: payableAmount,
        depositOption,
        remainingBalance: Math.max(0, totalAmount - updatedDeposit),
        qrCodeUrl: booking.BookingQrCode,
        paymentDate: paymentRecord.PaymentDate
      }
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr.message);
      }
    }
    console.error('Error in processDepositPayment:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_INTERNAL',
      message: 'Không thể xử lý giao dịch thanh toán do lỗi hệ thống.'
    });
  }
};
