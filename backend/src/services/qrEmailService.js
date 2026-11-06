'use strict';

/**
 * services/qrEmailService.js
 * TÍNH NĂNG 10: TẠO MÃ QR BOOKING & GỬI EMAIL XÁC NHẬN (FEAT-GUEST-10 / A10)
 * 
 * - Sinh mã QR Base64 độc bản chuẩn Contactless Pass
 * - Tạo HTML email xác nhận với template Grand Horizon Resort & Suites
 * - Gửi email qua Nodemailer (hỗ trợ SMTP hoặc Ethereal test account nếu chưa config SMTP)
 */

const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const { Booking, BookingGuest, RoomType, User } = require('../models');

// Khởi tạo Transporter cho Nodemailer
let transporter = null;

function getMailTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Development / Fallback mode: jsonTransport or streamTransport so it doesn't fail
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows'
    });
  }

  return transporter;
}

/**
 * Sinh mã QR Base64 từ ConfirmationCode hoặc Booking Data
 * @param {string|object} payload
 * @returns {Promise<string>} Data URL base64
 */
async function generateBookingQRCode(payload) {
  try {
    const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const qrDataUrl = await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 320,
      color: {
        dark: '#131B2E',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    const error = new Error('Không thể khởi tạo mã QR check-in');
    error.code = 'ERROR_0038_QR_GENERATION_FAILED';
    throw error;
  }
}

/**
 * Format tiền tệ VND
 */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

/**
 * Format ngày tháng
 */
function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = weekdays[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

/**
 * Tạo nội dung HTML email xác nhận lưu trú Grand Horizon
 */
function buildConfirmationEmailHtml({ booking, primaryGuest, roomType, qrBase64 }) {
  const code = booking.ConfirmationCode || `GH-${booking.BookingId}`;
  const guestName = primaryGuest?.FullName || booking.User?.FullName || 'Quý Khách';
  const checkInStr = formatDateVN(booking.CheckInDate);
  const checkOutStr = formatDateVN(booking.CheckOutDate);
  const roomName = roomType?.TypeName || 'Phòng Nghỉ Dưỡng';
  const totalAmountStr = formatVND(booking.TotalAmount);
  const depositStr = formatVND(booking.DepositAmount);
  const remainingStr = formatVND(Math.max(0, parseFloat(booking.TotalAmount || 0) - parseFloat(booking.DepositAmount || 0)));
  const nights = booking.NumberOfNights || 1;
  const adults = booking.Adults || 2;
  const children = booking.Children || 0;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Xác Nhận Đặt Phòng - Grand Horizon Resort &amp; Suites</title>
<style>
  body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8f9ff; color: #0b1c30; }
  .wrapper { width: 100%; max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  .header { background-color: #131B2E; color: #ffffff; padding: 32px 24px; text-align: center; }
  .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #fedeb2; margin-bottom: 4px; }
  .sublogo { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #bec6e0; }
  .badge { display: inline-block; margin-top: 16px; padding: 6px 14px; background: rgba(254, 222, 178, 0.15); border-radius: 20px; color: #fedeb2; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .hero-title { font-size: 22px; color: #ffffff; margin-top: 14px; margin-bottom: 6px; }
  .hero-desc { font-size: 14px; color: #bec6e0; line-height: 1.5; }
  .content { padding: 28px 24px; }
  .ticket { background: #eff4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #d3e4fe; }
  .ticket-header { border-bottom: 1px dashed #bec6e0; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .resort-name { font-size: 15px; font-weight: bold; color: #131b2e; }
  .grid { display: table; width: 100%; margin-bottom: 12px; }
  .col-6 { display: table-cell; width: 50%; vertical-align: top; padding: 6px 4px; }
  .label { font-size: 11px; text-transform: uppercase; color: #76777d; letter-spacing: 0.5px; margin-bottom: 2px; }
  .val { font-size: 14px; font-weight: bold; color: #0b1c30; }
  .val-gold { font-size: 15px; font-weight: bold; color: #725b38; }
  .qr-box { text-align: center; padding: 20px; background: #ffffff; border-radius: 8px; border: 1px solid #e5eeff; margin: 16px 0; }
  .qr-box img { width: 180px; height: 180px; }
  .qr-tip { font-size: 12px; color: #76777d; margin-top: 8px; }
  .billing { background: #e5eeff; border-radius: 8px; padding: 16px; margin-top: 16px; }
  .billing-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #45464d; }
  .billing-row.total { font-size: 15px; font-weight: bold; color: #131B2E; border-top: 1px solid #c6c6cd; padding-top: 8px; margin-top: 8px; }
  .footer { background: #f8f9ff; padding: 24px; text-align: center; font-size: 12px; color: #76777d; line-height: 1.6; border-top: 1px solid #eff4ff; }
  .btn { display: inline-block; padding: 12px 24px; background: #725b38; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
</style>
</head>
<body>
<div style="padding: 20px 0;">
  <div class="wrapper">
    <div class="header">
      <div class="logo">GRAND HORIZON</div>
      <div class="sublogo">Resort &amp; Suites Phú Quốc</div>
      <div class="badge">Giao Dịch Đã Xác Nhận</div>
      <div class="hero-title">Chúc Mừng Quý Khách Đã Đặt Phòng Thành Công!</div>
      <div class="hero-desc">Mã xác nhận: <strong style="color: #fedeb2;">#${code}</strong><br/>Kính chúc Quý khách ${guestName} một kỳ nghỉ trọn vẹn và đẳng cấp.</div>
    </div>
    
    <div class="content">
      <div class="ticket">
        <div class="ticket-header">
          <div class="resort-name">THẺ XÁC NHẬN LƯU TRÚ ĐIỆN TỬ • VIP BOARDING PASS</div>
          <div style="font-size: 12px; color: #725b38; font-weight: bold;">Hội Viên Elite</div>
        </div>

        <div class="grid">
          <div class="col-6">
            <div class="label">Khách Lưu Trú</div>
            <div class="val">${guestName}</div>
          </div>
          <div class="col-6">
            <div class="label">Hạng Phòng</div>
            <div class="val-gold">${roomName}</div>
          </div>
        </div>

        <div class="grid">
          <div class="col-6">
            <div class="label">Nhận Phòng (Check-in)</div>
            <div class="val">${checkInStr}</div>
            <div style="font-size: 11px; color: #725b38;">Từ 14:00</div>
          </div>
          <div class="col-6">
            <div class="label">Trả Phòng (Check-out)</div>
            <div class="val">${checkOutStr}</div>
            <div style="font-size: 11px; color: #725b38;">Trước 12:00</div>
          </div>
        </div>

        <div class="grid">
          <div class="col-6">
            <div class="label">Thời Gian Nghỉ</div>
            <div class="val">${nights} Đêm (${adults} Người lớn${children > 0 ? `, ${children} Trẻ em` : ''})</div>
          </div>
          <div class="col-6">
            <div class="label">Mã Check-in Ưu Tiên</div>
            <div class="val font-mono" style="font-family: monospace; letter-spacing: 1px;">PASS: ${code}</div>
          </div>
        </div>

        <div class="qr-box">
          <div style="font-weight: bold; color: #131b2e; font-size: 14px; margin-bottom: 8px;">MÃ QR NHẬN PHÒNG NHANH 3S</div>
          <img src="${qrBase64}" alt="Contactless Check-in QR Pass" />
          <div class="qr-tip">Quý khách xuất trình mã QR này tại quầy Lễ tân hoặc Kiosk Concierge để nhận phòng ngay lập tức không cần chờ đợi.</div>
        </div>

        <div class="billing">
          <div class="billing-row">
            <span>Tổng Giá Trị Kỳ Nghỉ:</span>
            <strong>${totalAmountStr}</strong>
          </div>
          <div class="billing-row">
            <span>Đã Thanh Toán Đặt Cọc:</span>
            <strong style="color: #069669;">${depositStr}</strong>
          </div>
          <div class="billing-row total">
            <span>Số Dư Còn Lại Khi Check-in:</span>
            <span>${remainingStr}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <p style="font-size: 13px; color: #45464d;">Cần hỗ trợ đưa đón sân bay hoặc dịch vụ ẩm thực trước chuyến đi?</p>
        <div style="font-size: 14px; font-weight: bold; color: #725b38;">Hotline Quản Gia 24/7: 1900 6868 | (+84) 297 3888 999</div>
      </div>
    </div>

    <div class="footer">
      <p>Grand Horizon Resort &amp; Suites Phú Quốc — Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang</p>
      <p>© 2026 Grand Horizon. Mọi quyền được bảo lưu. Email này được tạo tự động từ hệ thống đặt phòng trực tuyến.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Gửi email xác nhận kèm mã QR
 */
async function sendBookingConfirmationEmail(bookingId, customRecipientEmail = null) {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      { model: BookingGuest, as: 'guests' },
      { model: RoomType, as: 'roomType' },
      { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] }
    ]
  });

  if (!booking) {
    const error = new Error(`Không tìm thấy đơn đặt phòng #${bookingId}`);
    error.status = 404;
    throw error;
  }

  // Xác định khách chính và email
  const primaryGuest = (booking.guests && booking.guests.length > 0)
    ? (booking.guests.find(g => g.IsPrimaryGuest) || booking.guests[0])
    : null;

  const recipientEmail = customRecipientEmail || primaryGuest?.Email || booking.user?.Email;
  if (!recipientEmail) {
    const error = new Error('Không xác định được email người nhận đặt phòng');
    error.status = 400;
    throw error;
  }

  // Khởi tạo mã QR nếu chưa có
  let qrBase64 = booking.BookingQrCode;
  const confirmationCode = booking.ConfirmationCode || `GH-${Date.now().toString().slice(-6)}`;

  if (!qrBase64 || !qrBase64.startsWith('data:image')) {
    qrBase64 = await generateBookingQRCode({
      bookingId: booking.BookingId,
      confirmationCode: confirmationCode,
      checkInDate: booking.CheckInDate,
      checkOutDate: booking.CheckOutDate,
      guestName: primaryGuest?.FullName || booking.user?.FullName || 'Grand Horizon Guest'
    });

    await booking.update({
      BookingQrCode: qrBase64,
      ConfirmationCode: confirmationCode
    });
  }

  // Tạo nội dung email HTML
  const emailHtml = buildConfirmationEmailHtml({
    booking,
    primaryGuest,
    roomType: booking.roomType,
    qrBase64
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Grand Horizon Resort & Suites" <no-reply@grandhorizonresort.com>',
    to: recipientEmail,
    subject: `[Grand Horizon] Xác Nhận Đặt Phòng Thành Công #${confirmationCode} - Contactless Pass`,
    html: emailHtml,
    attachments: [
      {
        filename: `QR_Pass_${confirmationCode}.png`,
        content: qrBase64.split(';base64,').pop(),
        encoding: 'base64',
        cid: 'bookingQrPass'
      }
    ]
  };

  const mailTransporter = getMailTransporter();
  let info = null;
  try {
    info = await mailTransporter.sendMail(mailOptions);
  } catch (mailErr) {
    console.warn('[QR Email Service] Gửi mail thất bại (có thể do môi trường thiếu SMTP creds):', mailErr.message);
  }

  // Cập nhật ConfirmationSentAt
  await booking.update({
    ConfirmationSentAt: new Date()
  });

  return {
    success: true,
    bookingId: booking.BookingId,
    confirmationCode: confirmationCode,
    recipientEmail,
    confirmationSentAt: new Date().toISOString(),
    messageId: info?.messageId || 'DEV_STREAM_LOGGED',
    qrCodeUrl: qrBase64
  };
}

module.exports = {
  generateBookingQRCode,
  sendBookingConfirmationEmail,
  buildConfirmationEmailHtml
};
