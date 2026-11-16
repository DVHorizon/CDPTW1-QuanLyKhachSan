'use strict';

/**
 * controllers/bookingQrNotificationController.js
 * TÍNH NĂNG 10: TẠO MÃ QR BOOKING & GỬI EMAIL XÁC NHẬN (FEAT-GUEST-10 / A10)
 * 
 * Endpoints:
 * - GET  /api/v1/bookings/:bookingId/qr-code
 * - POST /api/v1/notifications/email-confirmation
 */

const { Booking, BookingGuest, RoomType, User } = require('../models');
const { generateBookingQRCode, sendBookingConfirmationEmail } = require('../services/qrEmailService');

/**
 * GET /api/v1/bookings/:bookingId/qr-code
 * Sinh hoặc lấy mã QR Check-in điện tử của Booking
 */
exports.getBookingQRCode = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0038_QR_GENERATION_FAILED',
        message: 'Mã đơn đặt phòng không hợp lệ'
      });
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: BookingGuest, as: 'guests' },
        { model: RoomType, as: 'roomType' },
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0038_QR_GENERATION_FAILED',
        message: `Không tìm thấy đơn đặt phòng #${bookingId}`
      });
    }

    const primaryGuest = (booking.guests && booking.guests.length > 0)
      ? (booking.guests.find(g => g.IsPrimaryGuest) || booking.guests[0])
      : null;

    let qrCodeUrl = booking.BookingQrCode;
    const confirmationCode = booking.ConfirmationCode || `GH-${Date.now().toString().slice(-6)}`;

    // Nếu chưa có QR dạng base64, sinh mới
    if (!qrCodeUrl || !qrCodeUrl.startsWith('data:image')) {
      try {
        qrCodeUrl = await generateBookingQRCode({
          bookingId: booking.BookingId,
          confirmationCode: confirmationCode,
          guestName: primaryGuest?.FullName || booking.user?.FullName || 'Grand Horizon Guest',
          checkInDate: booking.CheckInDate,
          checkOutDate: booking.CheckOutDate,
          roomType: booking.roomType?.TypeName || 'Luxury Room'
        });

        await booking.update({
          BookingQrCode: qrCodeUrl,
          ConfirmationCode: confirmationCode
        });
      } catch (genErr) {
        return res.status(500).json({
          success: false,
          code: 'ERROR_0038_QR_GENERATION_FAILED',
          message: 'Không thể khởi tạo mã QR check-in',
          error: genErr.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0006_QR_READY',
      message: 'Mã QR Check-in điện tử đã sẵn sàng',
      data: {
        bookingId: booking.BookingId,
        confirmationCode: confirmationCode,
        bookingStatus: booking.Status,
        qrCodeUrl: qrCodeUrl,
        guestName: primaryGuest?.FullName || booking.user?.FullName,
        checkInDate: booking.CheckInDate,
        checkOutDate: booking.CheckOutDate,
        roomTypeName: booking.roomType?.TypeName
      }
    });
  } catch (error) {
    console.error('Error in getBookingQRCode:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0038_QR_GENERATION_FAILED',
      message: 'Không thể khởi tạo mã QR check-in',
      error: error.message
    });
  }
};

/**
 * POST /api/v1/notifications/email-confirmation
 * Gửi email HTML xác nhận kèm mã QR và chi tiết đặt phòng
 */
exports.sendEmailConfirmation = async (req, res) => {
  try {
    const { bookingId, recipientEmail } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã đơn đặt phòng (bookingId)'
      });
    }

    const result = await sendBookingConfirmationEmail(bookingId, recipientEmail);

    return res.status(200).json({
      success: true,
      message: 'Đã gửi email xác nhận đặt phòng thành công kèm mã QR Check-in',
      data: result
    });
  } catch (error) {
    console.error('Error in sendEmailConfirmation:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể gửi email xác nhận đặt phòng'
    });
  }
};
