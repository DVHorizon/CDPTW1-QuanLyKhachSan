'use strict';

/**
 * modules/services/controllers/masterInvoiceController.js
 * 👤 OWNER: Hà — FEAT-INVOICE-02 (C7): Tạo hoá đơn tổng hợp (Master Invoice) tại quầy Check-out
 * Endpoints:
 *   POST /api/v1/invoices/master (alias: POST /invoices/master)
 *   GET /api/v1/invoices/booking/:bookingId
 *   GET /api/v1/invoices/:invoiceId
 */

const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Booking,
  Stay,
  Invoice,
  InvoiceDetail,
  Payment,
  Room,
  User,
  Branch,
} = require('../../../models');
const { Op } = require('sequelize');
const {
  calculateBookingChargesData,
  PAID_STATUSES,
} = require('./bookingChargesController');
const {
  generateTransactionCode,
} = require('../../payments/services/paymentGatewayService');

const INVOICE_PDF_DIR = path.join(__dirname, '../../../../public/uploads/invoices');

/**
 * Invalidate PDF cache for an invoice on disk and in database (R2-ISSUE-09)
 */
function invalidateInvoicePdfCache(invoice) {
  try {
    if (invoice && invoice.InvoiceNumber) {
      const fileName = `INV-${invoice.InvoiceNumber}.pdf`;
      const filePath = path.join(INVOICE_PDF_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    if (invoice && invoice.PdfPath) {
      const p = path.join(__dirname, '../../../../public', invoice.PdfPath);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  } catch (err) {
    console.warn('PDF cache file deletion skipped:', err.message);
  }
}


/**
 * Sinh InvoiceNumber tự động theo định dạng: INV-YYYYMMDD-XXXXXX
 */
function generateInvoiceNumber() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `INV-${dateStr}-${randomSuffix}`;
}

/**
 * POST /api/v1/invoices/master
 * Chốt số liệu tạm tính thành hoá đơn chính thức duy nhất cho Booking
 */
async function createMasterInvoice(req, res) {
  const t = await sequelize.transaction();

  try {
    const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
    const roleId = Number(req.user?.roleId || 0);
    const isStaffOrAdmin = [1, 2, 3, 4].includes(roleId) ||
      ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

    // 1. Phân quyền (Mục 1.4.a)
    if (!isStaffOrAdmin || userRole === 'guest') {
      await t.rollback();
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { bookingId, vatRate = 10, manualAdjustments = [] } = req.body;
    if (!bookingId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Mã đặt phòng (bookingId) là bắt buộc',
      });
    }

    // 2. Khóa dòng Booking NGAY ĐẦU TRANSACTION để tuần tự hóa mọi yêu cầu tạo hóa đơn đồng thời
    const numBookingId = Number(bookingId);
    const lockedBooking = !Number.isNaN(numBookingId)
      ? await Booking.findByPk(numBookingId, { transaction: t, lock: t.LOCK.UPDATE })
      : await Booking.findOne({ where: { ConfirmationCode: String(bookingId).trim() }, transaction: t, lock: t.LOCK.UPDATE });

    if (!lockedBooking) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra xem Booking đã có hoá đơn còn hiệu lực chưa (Status !== 'Cancelled')
    const existingInvoice = await Invoice.findOne({
      where: {
        BookingId: lockedBooking.BookingId,
        Status: { [Op.ne]: 'Cancelled' },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingInvoice) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        code: 'ERROR_0017_ALREADY_EXISTS',
        message: 'Booking này đã có hoá đơn, vui lòng dùng hoá đơn hiện có',
        existingInvoiceId: existingInvoice.InvoiceId,
        invoiceNumber: existingInvoice.InvoiceNumber,
      });
    }

    // 3. Tải và tổng hợp chi phí qua C6 an toàn bên trong transaction
    const calc = await calculateBookingChargesData(lockedBooking.BookingId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!calc) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại hoặc đã bị xoá',
      });
    }

    // 4. Kiểm tra điều kiện tiên quyết (Mục 1.4.b)
    if (calc.estimated || !calc.rawStays || calc.rawStays.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_PRECONDITION_FAILED',
        message: 'Booking chưa có lượt lưu trú nào để lập hoá đơn',
      });
    }

    // Kiểm tra toàn bộ Stay đã CheckedOut chưa
    const hasUncheckedOutStay = calc.rawStays.some((s) => s.Status !== 'CheckedOut');
    if (hasUncheckedOutStay && !req.body.bypassCheckOutRule) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_PRECONDITION_FAILED',
        message: 'Còn phòng chưa check-out, không thể lập hoá đơn tổng hợp',
      });
    }

    // 4. Validate manualAdjustments (Mục 1.2)
    let manualAdjustmentTotal = 0;
    const cleanAdjustments = [];

    if (Array.isArray(manualAdjustments)) {
      for (const adj of manualAdjustments) {
        const desc = String(adj.description || '').trim();
        const amt = Number(adj.amount || 0);
        const type = String(adj.itemType || '').trim();

        if (!desc) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0001_REQUIRED',
            message: 'Mô tả khoản điều chỉnh không được để trống',
          });
        }
        if (desc.length > 200) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0003_MAX_LENGTH',
            message: 'Mô tả khoản điều chỉnh không được vượt quá 200 ký tự',
          });
        }
        if (amt === 0 || isNaN(amt) || Math.abs(amt) > calc.grandTotal * 2) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0012_OUT_OF_RANGE',
            message: 'Số tiền điều chỉnh không hợp lệ',
          });
        }
        if (!['Surcharge', 'Other'].includes(type)) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Loại khoản điều chỉnh không hợp lệ (chỉ nhận Surcharge hoặc Other)',
          });
        }

        cleanAdjustments.push({ description: desc, amount: amt, itemType: type });
        manualAdjustmentTotal += amt;
      }
    }

    // 5. Tính Subtotal, VAT, TotalAmount (Mục 1.4.c)
    const numVatRate = Math.max(0, Math.min(100, Number(vatRate) || 0));
    const subtotal = Math.round((calc.grandTotal + manualAdjustmentTotal) * 100) / 100;
    const vatAmount = Math.round(subtotal * (numVatRate / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

    if (totalAmount < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Tổng hoá đơn không được âm — kiểm tra lại khoản giảm giá thủ công',
      });
    }

    // 6. Xác định StayId: 1 Stay -> giữ StayId; Nhiều Stay -> NULL (Master Invoice đa phòng - Mục 1.4.d)
    const invoiceStayId = calc.rawStays.length === 1 ? calc.rawStays[0].StayId : null;
    const invoiceNumber = generateInvoiceNumber();

    // 7. Tạo bản ghi Invoices
    const newInvoice = await Invoice.create(
      {
        BookingId: calc.booking.BookingId,
        StayId: invoiceStayId,
        InvoiceNumber: invoiceNumber,
        InvoiceDate: new Date(),
        Subtotal: subtotal,
        VATRate: numVatRate,
        VATAmount: vatAmount,
        TotalAmount: totalAmount,
        Status: 'Unpaid', // Tạm set, sẽ cập nhật lại sau khi link payments
        AssignedTo: req.user?.userId || null,
      },
      { transaction: t }
    );

    // 8. Tạo toàn bộ InvoiceDetails (Mục 1.4.d)
    const detailsToCreate = [];

    for (const st of calc.stays) {
      // 8.1. Dòng Tiền phòng
      detailsToCreate.push({
        InvoiceId: newInvoice.InvoiceId,
        ItemType: 'Room',
        ItemId: st.stayId,
        Description: `Tiền phòng — ${st.room.nights} đêm — phòng ${st.roomNumber}`,
        Quantity: st.room.nights,
        UnitPrice: st.room.unitPrice,
        TotalPrice: st.room.subtotal,
      });

      // 8.2. Dòng Dịch vụ đã hoàn thành
      for (const svc of st.services) {
        detailsToCreate.push({
          InvoiceId: newInvoice.InvoiceId,
          ItemType: 'Service',
          ItemId: svc.orderId,
          Description: `Dịch vụ #${svc.orderId} (Số lượng: ${svc.quantity})`,
          Quantity: svc.quantity,
          UnitPrice: svc.unitPrice,
          TotalPrice: svc.subtotal,
        });
      }

      // 8.3. Dòng Minibar
      if (st.minibar && st.minibar.length > 0) {
        const stayMinibarTotal = st.minibar.reduce((sum, m) => sum + Number(m.subtotal || 0), 0);
        detailsToCreate.push({
          InvoiceId: newInvoice.InvoiceId,
          ItemType: 'Minibar',
          ItemId: st.stayId,
          Description: `Tiêu thụ Minibar phòng ${st.roomNumber} (${st.minibar.length} món)`,
          Quantity: 1,
          UnitPrice: stayMinibarTotal,
          TotalPrice: stayMinibarTotal,
        });
      }

      // 8.4. Dòng Food & Beverage
      for (const fd of st.food) {
        detailsToCreate.push({
          InvoiceId: newInvoice.InvoiceId,
          ItemType: 'Food',
          ItemId: fd.foodOrderId,
          Description: `F&B Ghi nợ phòng — Đơn #${fd.foodOrderId} (${fd.orderType || 'RoomService'})`,
          Quantity: 1,
          UnitPrice: fd.subtotal,
          TotalPrice: fd.subtotal,
        });
      }
      // 8.5. Dòng Phí gia hạn lưu trú (Extensions)
      for (const ext of (st.extensions || [])) {
        detailsToCreate.push({
          InvoiceId: newInvoice.InvoiceId,
          ItemType: 'Extension',
          ItemId: ext.extensionId || null,
          Description: `Gia hạn lưu trú phòng ${st.roomNumber} (${ext.nights} đêm)`,
          Quantity: ext.nights || 1,
          UnitPrice: ext.total / (ext.nights || 1),
          TotalPrice: ext.total,
        });
      }

      // 8.6. Dòng Bồi thường thiệt hại buồng phòng & phạt (Damages)
      for (const dam of (st.damages || [])) {
        detailsToCreate.push({
          InvoiceId: newInvoice.InvoiceId,
          ItemType: 'Damage',
          ItemId: typeof dam.damageId === 'number' ? dam.damageId : null,
          Description: `${dam.item}${dam.reason ? ` (${dam.reason})` : ''}`,
          Quantity: 1,
          UnitPrice: dam.total,
          TotalPrice: dam.total,
        });
      }
    }

    // 8.7. Dòng Phụ thu cấp Booking (nếu có)
    if (calc.surchargeAmount > 0) {
      detailsToCreate.push({
        InvoiceId: newInvoice.InvoiceId,
        ItemType: 'Surcharge',
        ItemId: null,
        Description: 'Phụ thu phát sinh khác',
        Quantity: 1,
        UnitPrice: calc.surchargeAmount,
        TotalPrice: calc.surchargeAmount,
      });
    }

    // 8.8. Dòng Giảm giá cấp Booking (nếu có)
    if (calc.discountAmount > 0) {
      detailsToCreate.push({
        InvoiceId: newInvoice.InvoiceId,
        ItemType: 'Other',
        ItemId: null,
        Description: 'Giảm giá / Voucher áp dụng',
        Quantity: 1,
        UnitPrice: -calc.discountAmount,
        TotalPrice: -calc.discountAmount,
      });
    }

    // 8.9. Dòng Manual Adjustments tại quầy
    for (const adj of cleanAdjustments) {
      detailsToCreate.push({
        InvoiceId: newInvoice.InvoiceId,
        ItemType: adj.itemType,
        ItemId: null,
        Description: adj.description,
        Quantity: 1,
        UnitPrice: adj.amount,
        TotalPrice: adj.amount,
      });
    }

    if (detailsToCreate.length > 0) {
      await InvoiceDetail.bulkCreate(detailsToCreate, { transaction: t });
    }

    // 9. Liên kết ngược Payments đã thu trước đó (tiền cọc / ứng trước - Mục 1.4.e)
    const unlinkedPayments = await Payment.findAll({
      where: {
        BookingId: calc.booking.BookingId,
        InvoiceId: null,
        Status: { [Op.in]: PAID_STATUSES },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const linkedPaymentIds = [];
    let linkedPaidTotal = 0;

    for (const pay of unlinkedPayments) {
      linkedPaymentIds.push(pay.PaymentId);
      linkedPaidTotal += Number(pay.Amount || 0);
      await pay.update({ InvoiceId: newInvoice.InvoiceId }, { transaction: t });
    }

    // 10. Xác định Status chính thức của Invoice
    let finalStatus = 'Unpaid';
    if (linkedPaidTotal >= totalAmount && totalAmount > 0) {
      finalStatus = 'Paid';
    } else if (linkedPaidTotal > 0) {
      finalStatus = 'PartiallyPaid';
    }

    await newInvoice.update({ Status: finalStatus }, { transaction: t });

    await t.commit();

    // 11. Trả về kết quả hoàn tất (Mục 1.3 - HTTP 201)
    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Tạo hoá đơn tổng hợp thành công',
      data: {
        invoiceId: newInvoice.InvoiceId,
        invoiceNumber: newInvoice.InvoiceNumber,
        invoiceDate: newInvoice.InvoiceDate,
        stayId: newInvoice.StayId,
        bookingId: newInvoice.BookingId,
        subtotal: newInvoice.Subtotal,
        vatRate: newInvoice.VATRate,
        vatAmount: newInvoice.VATAmount,
        totalAmount: newInvoice.TotalAmount,
        status: newInvoice.Status,
        details: detailsToCreate,
        linkedPaymentIds,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error('Error in createMasterInvoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo hoá đơn tổng hợp.',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/invoices/booking/:bookingId
 * Tra cứu Master Invoice của 1 Booking (dùng cho Màn 25 / Folio Screen)
 */
async function getInvoiceByBookingId(req, res) {
  try {
    const { bookingId } = req.params;
    const numBookingId = Number(bookingId);

    const booking = !Number.isNaN(numBookingId)
      ? await Booking.findByPk(numBookingId)
      : await Booking.findOne({ where: { ConfirmationCode: String(bookingId).trim() } });

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Booking không tồn tại',
      });
    }

    const invoice = await Invoice.findOne({
      where: {
        BookingId: booking.BookingId,
        Status: { [Op.ne]: 'Cancelled' },
      },
      include: [
        { model: InvoiceDetail, as: 'details' },
        { model: Payment, as: 'payments' },
      ],
      order: [['InvoiceId', 'DESC']],
    });

    if (!invoice) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error in getInvoiceByBookingId:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tra cứu hoá đơn booking.',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/invoices/:invoiceId
 * Lấy chi tiết 1 Invoice theo Id
 */
async function getInvoiceById(req, res) {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        { model: InvoiceDetail, as: 'details' },
        { model: Payment, as: 'payments' },
        {
          model: Booking,
          include: [{ model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] }],
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

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải chi tiết hoá đơn.',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/invoices/:invoiceId/pay
 * Quyết toán hoá đơn tổng hợp tại quầy (Multi-Tender Settlement - C9)
 */
async function payInvoice(req, res) {
  const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
  const roleId = Number(req.user?.roleId || 0);
  const isStaffOrAdmin = [1, 2, 3, 4].includes(roleId) ||
    ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

  // 1. Phân quyền
  if (!isStaffOrAdmin || userRole === 'guest') {
    return res.status(403).json({
      success: false,
      code: 'ERROR_0010_FORBIDDEN',
      message: 'Bạn không có quyền thực hiện chức năng này',
    });
  }

  const { invoiceId } = req.params;
  const numInvoiceId = Number(invoiceId);
  if (isNaN(numInvoiceId)) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0004_INVALID_FORMAT',
      message: 'Mã hoá đơn không hợp lệ',
    });
  }

  const { tenders, note, releaseHoldOnComplete = true } = req.body || {};

  // 2. Validate tenders đầu vào
  if (!Array.isArray(tenders) || tenders.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0001_REQUIRED',
      message: 'Danh sách phương thức thanh toán không được để trống',
    });
  }

  if (tenders.length > 3) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Chỉ được chọn tối đa 3 phương thức thanh toán trong 1 lần quyết toán',
    });
  }

  const VALID_METHODS = ['Cash', 'Card', 'BankTransfer', 'Transfer', 'VNPay', 'MoMo', 'VietQR'];
  const ONLINE_METHODS = ['VNPay', 'MoMo', 'VietQR'];
  let onlineCount = 0;
  let totalTenderAmount = 0;
  let totalCashGiven = 0;
  let totalCashAmount = 0;

  for (const t of tenders) {
    if (!t.method || !VALID_METHODS.includes(t.method)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Phương thức thanh toán không hợp lệ',
      });
    }

    const amt = Number(t.amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền phải lớn hơn 0',
      });
    }

    if (amt < 10000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền thanh toán tối thiểu là 10.000 VND',
      });
    }

    if (amt > 500000000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền thanh toán vượt quá giới hạn tối đa cho phép',
      });
    }

    if (ONLINE_METHODS.includes(t.method)) {
      onlineCount++;
    }

    if (t.method === 'Cash') {
      const given = t.customerCashGiven !== undefined && t.customerCashGiven !== null
        ? Number(t.customerCashGiven)
        : amt;
      if (isNaN(given) || given < amt) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0021_INSUFFICIENT_CASH',
          message: 'Số tiền mặt khách đưa không đủ để thanh toán khoản chỉ định',
        });
      }
      totalCashGiven += given;
      totalCashAmount += amt;
    }

    totalTenderAmount += amt;
  }

  // Tối đa 1 tender online
  if (onlineCount > 1) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Chỉ được chọn tối đa 1 hình thức thanh toán trực tuyến trong 1 lần quyết toán',
    });
  }

  // 3. Mở transaction và khoá dòng để kiểm tra an toàn đồng thời (Row Lock)
  const transaction = await sequelize.transaction();

  try {
    const invoice = await Invoice.findByPk(numInvoiceId, {
      include: [{ model: Payment, as: 'payments' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Hoá đơn không tồn tại hoặc đã bị xoá',
      });
    }

    if (invoice.Status === 'Cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_PRECONDITION_FAILED',
        message: 'Hoá đơn không ở trạng thái chờ thanh toán',
      });
    }

    // 4. Tính toán số dư còn lại (Net Outstanding Balance) có tính đến các khoản hoàn tiền
    // Nếu trong tenders có giao dịch online đã được tạo/xác nhận trước qua C5 Core Payment (cùng TransactionCode),
    // liên kết lại bản ghi C5 đó thay vì tính trùng vào alreadyPaid hoặc tạo bản ghi trùng lặp.
    const existingPayments = invoice.payments || [];
    const tenderTxCodes = new Set(
      tenders
        .map((t) => (t.transactionCode ? String(t.transactionCode).trim() : ''))
        .filter(Boolean)
    );
    const reusableC5PaymentIds = new Set(
      existingPayments
        .filter(
          (p) =>
            p.TransactionCode &&
            tenderTxCodes.has(String(p.TransactionCode).trim()) &&
            ['Pending', 'Paid'].includes(p.Status)
        )
        .map((p) => p.PaymentId)
    );

    const alreadyPaid = existingPayments.reduce((sum, p) => {
      if (reusableC5PaymentIds.has(p.PaymentId)) return sum;
      const pAmt = Number(p.Amount || 0);
      const ref = Number(p.RefundAmount || 0);
      if (PAID_STATUSES.includes(p.Status)) {
        return sum + Math.max(0, pAmt - ref);
      } else if (p.Status === 'Refunded') {
        const actualRef = ref > 0 ? ref : pAmt;
        return sum + Math.max(0, pAmt - actualRef);
      }
      return sum;
    }, 0);

    const invoiceTotal = Number(invoice.TotalAmount || 0);
    const remainingBalance = Math.max(0, invoiceTotal - alreadyPaid);

    // Chặn thanh toán nếu hoá đơn đã thanh toán đầy đủ (trừ trường hợp đang chốt lại giao dịch C5 vừa Paid qua webhook)
    if ((invoice.Status === 'Paid' && reusableC5PaymentIds.size === 0) || remainingBalance <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0022_ALREADY_SETTLED',
        message: 'Hoá đơn đã được thanh toán đầy đủ, không thể thực hiện lại',
      });
    }

    // Kiểm tra tender phi tiền mặt không được vượt quá số dư cần thanh toán
    const nonCashTendersTotal = tenders
      .filter((t) => t.method !== 'Cash')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (nonCashTendersTotal > remainingBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền thanh toán phi tiền mặt không được vượt quá số dư cần thanh toán',
      });
    }

    // 5. Tạo hoặc tái sử dụng các Payment records từ C5 Core Payment
    const createdPayments = [];
    const now = new Date();

    for (const tender of tenders) {
      const normalizedMethod = tender.method === 'Transfer' ? 'BankTransfer' : tender.method;
      const isOnline = ONLINE_METHODS.includes(tender.method);
      const cleanTxCode = tender.transactionCode ? String(tender.transactionCode).trim() : '';

      const existingC5Payment = cleanTxCode
        ? existingPayments.find(
            (p) =>
              String(p.TransactionCode).trim() === cleanTxCode &&
              reusableC5PaymentIds.has(p.PaymentId)
          )
        : null;

      if (existingC5Payment) {
        existingC5Payment.Amount = Number(tender.amount);
        existingC5Payment.PaymentMethod = normalizedMethod;
        if (!existingC5Payment.BookingId && invoice.BookingId) {
          existingC5Payment.BookingId = invoice.BookingId;
        }
        await existingC5Payment.save({ transaction });
        createdPayments.push(existingC5Payment);
      } else {
        const initialStatus = isOnline ? 'Pending' : 'Paid';
        const txnCode = cleanTxCode || generateTransactionCode();

        const payment = await Payment.create(
          {
            InvoiceId: invoice.InvoiceId,
            BookingId: invoice.BookingId || null,
            UserId: req.user?.userId || null,
            Amount: Number(tender.amount),
            PaymentMethod: normalizedMethod,
            PaymentDate: now,
            TransactionCode: txnCode,
            Status: initialStatus,
            GatewayResponse: isOnline ? null : 'In-person payment confirmed by staff',
          },
          { transaction }
        );

        createdPayments.push(payment);
      }
    }

    // 6. Cập nhật Invoices.Status chân thực theo số tiền thực thu (R2-ISSUE-09)
    const newTotalPaid = alreadyPaid + totalTenderAmount;
    const hasPendingTender = createdPayments.some((p) => p.Status === 'Pending');
    let finalInvoiceStatus = invoice.Status;

    if (hasPendingTender) {
      finalInvoiceStatus = newTotalPaid > 0 ? 'PartiallyPaid' : 'Unpaid';
    } else if (newTotalPaid >= invoiceTotal) {
      finalInvoiceStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      finalInvoiceStatus = 'PartiallyPaid';
    } else {
      finalInvoiceStatus = 'Unpaid';
    }

    await invoice.update(
      {
        Status: finalInvoiceStatus,
        PdfPath: null,
      },
      { transaction }
    );

    invalidateInvoicePdfCache(invoice);

    await transaction.commit();

    // 7. Tính tiền thối và cờ hoàn tất
    const changeAmount = Math.max(0, totalCashGiven - totalCashAmount);
    const outstanding = Math.max(0, invoiceTotal - newTotalPaid);
    const readyToCloseFolio = finalInvoiceStatus === 'Paid' && !hasPendingTender;

    // Phát sự kiện cập nhật dashboard real-time (C11)
    try {
      const { notifyDashboardEvent } = require('../../../sockets/socketHandler');
      if (typeof notifyDashboardEvent === 'function') {
        notifyDashboardEvent('PAYMENT_SUCCESS', {
          invoiceId: invoice.InvoiceId,
          paidAmount: newTotalPaid,
          changeAmount,
        });
      }
    } catch (_) {}

    // 8. Phản hồi thành công
    return res.status(200).json({
      success: true,
      code: 'SUCCESS_INVOICE_SETTLED',
      message: 'Quyết toán hoá đơn thành công',
      data: {
        invoiceId: invoice.InvoiceId,
        invoiceNumber: invoice.InvoiceNumber,
        totalAmount: invoiceTotal,
        paidAmount: newTotalPaid,
        outstandingBalance: outstanding,
        changeAmount,
        changeDue: changeAmount,
        status: finalInvoiceStatus,
        readyToCloseFolio,
        holdReleased: false,
        payments: createdPayments.map((p) => ({
          paymentId: p.PaymentId,
          method: p.PaymentMethod,
          paymentMethod: p.PaymentMethod,
          amount: Number(p.Amount),
          status: p.Status,
          transactionCode: p.TransactionCode,
          paymentDate: p.PaymentDate,
        })),
      },
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error in payInvoice:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0019_STORAGE_FAILED',
      message: 'Lỗi hệ thống khi quyết toán hoá đơn.',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/invoices
 * Sổ cái hoá đơn & Lọc danh sách hoá đơn hệ thống (C10)
 */
async function getInvoices(req, res) {
  try {
    const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
    const roleId = Number(req.user?.roleId || 0);
    const isStaffOrAdmin = [1, 2, 3, 4].includes(roleId) ||
      ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

    if (!isStaffOrAdmin || userRole === 'guest') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const {
      page = 1,
      pageSize = 20,
      limit,
      status,
      fromDate,
      toDate,
      dateFrom,
      dateTo,
      branchId,
      branchName,
      search,
      sortBy = 'date_desc',
    } = req.query;

    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const numPageSize = Math.min(100, Math.max(1, parseInt(pageSize || limit, 10) || 20));
    const offset = (numPage - 1) * numPageSize;

    // Validate Status
    const VALID_STATUSES = ['Unpaid', 'PartiallyPaid', 'Paid', 'Cancelled'];
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Trạng thái lọc không hợp lệ',
      });
    }

    // Validate Date range
    const startDateStr = fromDate || dateFrom;
    const endDateStr = toDate || dateTo;

    if (startDateStr && endDateStr) {
      const dStart = new Date(startDateStr);
      const dEnd = new Date(endDateStr);
      if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dStart > dEnd) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          message: 'Khoảng ngày không hợp lệ',
        });
      }
    }

    // Build Where Clause
    const whereClause = {};
    if (status) {
      whereClause.Status = status;
    }

    if (startDateStr && endDateStr) {
      whereClause.InvoiceDate = {
        [Op.between]: [
          new Date(`${startDateStr}T00:00:00.000Z`),
          new Date(`${endDateStr}T23:59:59.999Z`),
        ],
      };
    } else if (startDateStr) {
      whereClause.InvoiceDate = { [Op.gte]: new Date(`${startDateStr}T00:00:00.000Z`) };
    } else if (endDateStr) {
      whereClause.InvoiceDate = { [Op.lte]: new Date(`${endDateStr}T23:59:59.999Z`) };
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const matchingUsers = await User.findAll({
        where: {
          [Op.or]: [
            { FullName: { [Op.like]: term } },
            { Email: { [Op.like]: term } },
            { Phone: { [Op.like]: term } },
          ],
        },
        attributes: ['UserId'],
      });
      const userIds = matchingUsers.map((u) => u.UserId);
      const matchingBookings = await Booking.findAll({
        where: {
          [Op.or]: [
            ...(userIds.length > 0 ? [{ UserId: { [Op.in]: userIds } }] : []),
            { ConfirmationCode: { [Op.like]: term } },
          ],
        },
        attributes: ['BookingId'],
      });
      const bIds = matchingBookings.map((b) => b.BookingId);

      whereClause[Op.or] = [
        { InvoiceNumber: { [Op.like]: term } },
        ...(bIds.length > 0 ? [{ BookingId: { [Op.in]: bIds } }] : []),
      ];
    }

    // Sort order
    let orderClause = [['InvoiceDate', 'DESC'], ['InvoiceId', 'DESC']];
    if (sortBy === 'date_asc') orderClause = [['InvoiceDate', 'ASC'], ['InvoiceId', 'ASC']];
    else if (sortBy === 'amount_desc') orderClause = [['TotalAmount', 'DESC']];
    else if (sortBy === 'amount_asc') orderClause = [['TotalAmount', 'ASC']];

    const bookingInclude = {
      model: Booking,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['UserId', 'FullName', 'Email', 'Phone'],
        },
        {
          model: Stay,
          include: [
            {
              model: Room,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  attributes: ['BranchId', 'BranchName'],
                },
              ],
            },
          ],
        },
      ],
    };

    const { count, rows } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [bookingInclude],
      order: orderClause,
      limit: numPageSize,
      offset,
      distinct: true,
    });

    const items = rows.map((inv) => {
      const b = inv.Booking;
      const u = b?.user;
      let bName = 'Chi nhánh chính';
      if (b?.Stays && b.Stays.length > 0) {
        const foundBranch = b.Stays[0]?.Room?.branch?.BranchName;
        if (foundBranch) bName = foundBranch;
      }

      return {
        invoiceId: inv.InvoiceId,
        invoiceNumber: inv.InvoiceNumber,
        bookingId: inv.BookingId,
        stayId: inv.StayId,
        customerName: u?.FullName || 'Khách vãng lai',
        guestName: u?.FullName || 'Khách vãng lai',
        branchName: bName,
        totalAmount: Number(inv.TotalAmount || 0),
        subtotal: Number(inv.Subtotal || 0),
        vatAmount: Number(inv.VATAmount || 0),
        status: inv.Status,
        invoiceDate: inv.InvoiceDate,
        createdAt: inv.CreatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      page: numPage,
      pageSize: numPageSize,
      total: count,
      data: items,
      items,
    });
  } catch (error) {
    console.error('Error in getInvoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tải danh sách hoá đơn.',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/invoices/:invoiceId/transactions
 * Xem lịch sử giao dịch (Payments & Refunds) của 1 hoá đơn (C10)
 */
async function getInvoiceTransactions(req, res) {
  try {
    const userRole = String(req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '').toLowerCase();
    const roleId = Number(req.user?.roleId || 0);
    const isStaffOrAdmin = [1, 2, 3, 4].includes(roleId) ||
      ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole);

    if (!isStaffOrAdmin || userRole === 'guest') {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { invoiceId } = req.params;
    const numInvoiceId = Number(invoiceId);
    if (isNaN(numInvoiceId)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Mã hoá đơn không hợp lệ',
      });
    }

    const invoice = await Invoice.findByPk(numInvoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Hoá đơn không tồn tại hoặc đã bị xoá',
      });
    }

    const payments = await Payment.findAll({
      where: { InvoiceId: numInvoiceId },
      order: [
        ['PaymentDate', 'DESC'],
        ['PaymentId', 'DESC'],
      ],
    });

    const paymentList = payments.map((p) => ({
      paymentId: p.PaymentId,
      transactionCode: p.TransactionCode,
      amount: Number(p.Amount),
      paymentMethod: p.PaymentMethod,
      method: p.PaymentMethod,
      status: p.Status,
      paymentDate: p.PaymentDate,
      refundReason: p.RefundReason,
      refundAmount: Number(p.RefundAmount || 0),
      gatewayResponse: p.GatewayResponse,
    }));

    const refundList = payments
      .filter((p) => p.Status === 'Refunded' || Number(p.RefundAmount) > 0)
      .map((p) => ({
        paymentId: p.PaymentId,
        transactionCode: p.TransactionCode,
        amount: Number(p.Amount),
        refundAmount: Number(p.RefundAmount || p.Amount),
        refundReason: p.RefundReason,
        refundedAt: p.PaymentDate,
        status: 'Refunded',
      }));

    return res.status(200).json({
      success: true,
      data: {
        invoiceId: invoice.InvoiceId,
        invoiceNumber: invoice.InvoiceNumber,
        totalAmount: Number(invoice.TotalAmount),
        status: invoice.Status,
        payments: paymentList,
        refunds: refundList,
        items: paymentList,
      },
    });
  } catch (error) {
    console.error('Error in getInvoiceTransactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải lịch sử giao dịch hoá đơn.',
      error: error.message,
    });
  }
}

module.exports = {
  createMasterInvoice,
  getInvoiceByBookingId,
  getInvoiceById,
  generateInvoiceNumber,
  payInvoice,
  getInvoices,
  getInvoiceTransactions,
  invalidateInvoicePdfCache,
};

