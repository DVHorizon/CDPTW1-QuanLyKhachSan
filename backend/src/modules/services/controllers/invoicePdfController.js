'use strict';

/**
 * modules/services/controllers/invoicePdfController.js
 * 👤 OWNER: Hà — FEAT-INVOICE-03 (C8): Xuất hoá đơn PDF (Invoice PDF Export)
 * Endpoints:
 *   GET /api/v1/invoices/:invoiceId/pdf
 *   GET /api/v1/invoices/:invoiceId/pdf-info
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const {
  Invoice,
  InvoiceDetail,
  Payment,
  Booking,
  User,
  Stay,
  Room,
} = require('../../../models');
const { Op } = require('sequelize');

const INVOICE_DIR = path.join(__dirname, '../../../../public/uploads/invoices');
if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

const fmtVND = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
};

/**
 * Hàm vẽ nội dung hoá đơn PDF chuẩn bằng PDFKit
 */
function generateInvoicePDFStream(invoice, booking, user, details, payments) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // 1. Watermark nếu Invoice bị Cancelled
      if (invoice.Status === 'Cancelled') {
        doc.save();
        doc.rotate(-35, { origin: [300, 400] });
        doc.fontSize(60).fillColor('red', 0.15).text('DA HUY / CANCELLED', 100, 380, { align: 'center' });
        doc.restore();
      }

      // 2. Header Khách sạn
      doc.fillColor('#0F172A').fontSize(18).text('GRAND HORIZON LUXURY HOTEL & RESORT', 40, 40, { bold: true });
      doc.fontSize(9).fillColor('#64748B').text('123 Ocean Boulevard, Son Tra Peninsula, Da Nang City, Vietnam');
      doc.text('Hotline: (+84) 236 3888 999 | Email: contact@grandhorizon.vn | MST: 0401889922');
      doc.moveDown(0.8);

      // Đường kẻ phân cách
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // 3. Tiêu đề Hóa Đơn & Thông tin cơ bản
      const startY = doc.y;
      doc.fillColor('#1E293B').fontSize(14).text('HOA DON THANH TOAN (MASTER FOLIO INVOICE)', 40, startY, { bold: true });
      doc.fontSize(9).fillColor('#475569');
      doc.text(`So hoa don: ${invoice.InvoiceNumber}`, 40, startY + 20);
      doc.text(`Ngay phat hanh: ${new Date(invoice.InvoiceDate || invoice.CreatedAt).toLocaleString('vi-VN')}`, 40, startY + 34);
      doc.text(`Trang thai: ${invoice.Status}`, 40, startY + 48);

      // Khối Khách hàng bên phải
      const guestName = user?.FullName || 'Khach Hang / Guest';
      const guestPhone = user?.Phone || '—';
      const bookingCode = booking?.ConfirmationCode || `#BK-${booking?.BookingId || ''}`;

      doc.text(`Khach hang: ${guestName}`, 320, startY + 20);
      doc.text(`So dien thoai: ${guestPhone}`, 320, startY + 34);
      doc.text(`Ma dat phong: ${bookingCode}`, 320, startY + 48);

      doc.y = startY + 70;
      doc.moveDown(0.5);

      // 4. Bảng chi tiết các khoản mục (InvoiceDetails)
      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 22).fill('#F1F5F9');
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold');
      doc.text('STT', 45, tableTop + 6);
      doc.text('Noi dung / Khoan muc', 75, tableTop + 6);
      doc.text('Loai', 270, tableTop + 6);
      doc.text('SL', 345, tableTop + 6);
      doc.text('Don gia', 380, tableTop + 6, { width: 75, align: 'right' });
      doc.text('Thanh tien', 465, tableTop + 6, { width: 80, align: 'right' });

      doc.font('Helvetica');
      let currentY = tableTop + 24;

      details.forEach((item, index) => {
        // Kiểm tra ngắt trang nếu quá dài
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        doc.fillColor('#334155').fontSize(8);
        doc.text(String(index + 1), 45, currentY + 4);
        doc.text(item.Description || 'Chi phí', 75, currentY + 4, { width: 190 });
        doc.text(item.ItemType || 'Other', 270, currentY + 4);
        doc.text(String(Number(item.Quantity || 1)), 345, currentY + 4);
        doc.text(fmtVND(item.UnitPrice), 380, currentY + 4, { width: 75, align: 'right' });
        doc.text(fmtVND(item.TotalPrice), 465, currentY + 4, { width: 80, align: 'right' });

        currentY += 18;
        doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, currentY).lineTo(555, currentY).stroke();
      });

      // 5. Khối Tổng kết Tài chính
      currentY += 12;
      if (currentY > 660) {
        doc.addPage();
        currentY = 40;
      }

      const summaryX = 330;
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(summaryX, currentY).lineTo(555, currentY).stroke();
      currentY += 8;

      doc.fontSize(9).fillColor('#334155');
      doc.text('Tong tam tinh (Subtotal):', summaryX, currentY);
      doc.text(fmtVND(invoice.Subtotal), 440, currentY, { width: 105, align: 'right' });
      currentY += 16;

      doc.text(`Thue GTGT (VAT ${invoice.VATRate || 10}%):`, summaryX, currentY);
      doc.text(fmtVND(invoice.VATAmount), 440, currentY, { width: 105, align: 'right' });
      currentY += 16;

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A');
      doc.text('TONG CONG THANH TOAN:', summaryX, currentY);
      doc.text(fmtVND(invoice.TotalAmount), 440, currentY, { width: 105, align: 'right' });
      currentY += 22;

      // 6. Lịch sử thanh toán đã ghi nhận
      let totalPaidAmount = 0;
      if (payments && payments.length > 0) {
        doc.font('Helvetica').fontSize(8).fillColor('#475569');
        doc.text('Lich su thanh toan / Dat coc da nhan:', 40, currentY);
        currentY += 12;

        payments.forEach((p) => {
          if (['Paid', 'Success', 'Completed'].includes(p.Status)) {
            totalPaidAmount += Number(p.Amount || 0);
          }
          const pDate = new Date(p.PaymentDate || p.CreatedAt).toLocaleDateString('vi-VN');
          doc.text(`• [${pDate}] Hinh thuc: ${p.PaymentMethod} | Ma GD: ${p.TransactionCode || '—'} | So tien: ${fmtVND(p.Amount)} (${p.Status})`, 45, currentY);
          currentY += 12;
        });
      }

      currentY += 6;
      const remainingBalance = Math.max(0, Number(invoice.TotalAmount || 0) - totalPaidAmount);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(remainingBalance > 0 ? '#B91C1C' : '#15803D');
      doc.text(`SO TIEN CON PHAI THU: ${fmtVND(remainingBalance)}`, 40, currentY);

      // 7. Footer
      doc.fontSize(8).fillColor('#94A3B8').font('Helvetica');
      doc.text('Day la hoa don dien tu duoc tao tu dong tu he thong Quan Ly Khach San Grand Horizon PMS.', 40, 780, { align: 'center', width: 515 });
      doc.text('Cam on quy khach da tin tuong va lua chon nghi duong tai Grand Horizon!', 40, 792, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * GET /api/v1/invoices/:invoiceId/pdf
 * Xuất file PDF hoá đơn (có cache theo Invoices.PdfPath)
 */
async function getInvoicePdf(req, res) {
  try {
    const { invoiceId } = req.params;
    const { regenerate = false, mode = 'inline' } = req.query;

    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        { model: InvoiceDetail, as: 'details' },
        { model: Payment, as: 'payments' },
        {
          model: Booking,
          include: [{ model: User, as: 'user' }],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Hoá đơn không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra quyền (Mục 1.4.a)
    const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
    const isStaffOrAdmin = [1, 2, 3, 4].includes(Number(req.user?.roleId || 0)) ||
      ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

    if (userRole === 'guest') {
      const bookingUserId = invoice.Booking?.UserId;
      if (bookingUserId && req.user?.userId && bookingUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền xem hoá đơn này',
        });
      }
    }

    const fileName = `INV-${invoice.InvoiceNumber}.pdf`;
    const targetFilePath = path.join(INVOICE_DIR, fileName);

    const isRegen = String(regenerate) === 'true' && isStaffOrAdmin;

    // Kiểm tra cache PDF
    if (!isRegen && invoice.PdfPath && fs.existsSync(targetFilePath)) {
      const fileBuffer = fs.readFileSync(targetFilePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        mode === 'download' ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`
      );
      return res.send(fileBuffer);
    }

    // Sinh PDF mới
    const booking = invoice.Booking;
    const user = invoice.Booking?.user;
    const details = invoice.details || [];
    const payments = invoice.payments || [];

    const pdfBuffer = await generateInvoicePDFStream(invoice, booking, user, details, payments);

    // Ghi file lưu vào disk
    try {
      fs.writeFileSync(targetFilePath, pdfBuffer);
      await invoice.update({ PdfPath: `/uploads/invoices/${fileName}` });
    } catch (saveErr) {
      console.warn('Lỗi ghi file cache PDF, vẫn tiếp tục stream:', saveErr.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      mode === 'download' ? `attachment; filename="${fileName}"` : `inline; filename="${fileName}"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getInvoicePdf:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0018_GENERATION_FAILED',
      message: 'Không thể tạo file hoá đơn PDF, vui lòng thử lại',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/invoices/:invoiceId/pdf-info
 * Lấy metadata trạng thái file PDF của Invoice
 */
async function getInvoicePdfInfo(req, res) {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findByPk(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Hoá đơn không tồn tại',
      });
    }

    const fileName = `INV-${invoice.InvoiceNumber}.pdf`;
    const targetFilePath = path.join(INVOICE_DIR, fileName);
    const exists = fs.existsSync(targetFilePath);

    return res.status(200).json({
      success: true,
      data: {
        invoiceId: invoice.InvoiceId,
        invoiceNumber: invoice.InvoiceNumber,
        pdfAvailable: exists,
        pdfUrl: `/api/v1/invoices/${invoice.InvoiceId}/pdf`,
        status: invoice.Status,
      },
    });
  } catch (error) {
    console.error('Error in getInvoicePdfInfo:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tra cứu thông tin PDF.',
      error: error.message,
    });
  }
}

module.exports = {
  getInvoicePdf,
  getInvoicePdfInfo,
  generateInvoicePDFStream,
};
