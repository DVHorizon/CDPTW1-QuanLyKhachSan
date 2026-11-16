'use strict';

/**
 * modules/payments/controllers/paymentController.js
 * 👤 OWNER: Hà — Core Payment Module (FEAT-PAYMENT-01 / C5)
 * Cung cấp dịch vụ thanh toán dùng chung: Cash / Card / BankTransfer / VNPay / MoMo / VietQR
 */

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Payment,
  Booking,
  BookingGuest,
  Invoice,
  Stay,
  User,
  sequelize,
} = require('../../../models');
const {
  generateTransactionCode,
  isPaymentExpired,
  createGatewayTransaction,
  verifyWebhookSignature,
} = require('../services/paymentGatewayService');
const {
  CONFLICT_MESSAGE,
  normalizeFullWidthDigits,
  trimUnicode,
  isBlankUnicode,
  parseStrictPositiveInt,
  parseStrictNumber,
  extractExpectedVersion,
  assertVersionMatch,
  sendValidationError,
} = require('../../../shared/utils/qaValidators');

// Quyết định D6: coi PAID_STATUSES = ['Paid', 'Success', 'Completed'] là đã thu
const PAID_STATUSES = ['Paid', 'Success', 'Completed'];

function isStaffOrAdminUser(user) {
  if (!user) return false;
  const roleId = Number(user.roleId || user.RoleId || 0);
  const userRole = String(user.roleName || user.role?.RoleName || user.Role || '').toLowerCase();
  if (roleId === 5 || userRole === 'guest') return false;
  return (
    [1, 2, 3, 4, 6, 7].includes(roleId) ||
    ['admin', 'receptionist', 'staff', 'manager', 'accountant'].includes(userRole)
  );
}

function resolvePaymentIdentifier(rawId) {
  if (rawId === undefined || rawId === null || isBlankUnicode(String(rawId))) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field: 'paymentId',
      message: 'Mã giao dịch thanh toán không hợp lệ',
    };
  }
  const str = trimUnicode(String(rawId));
  if (/^PMT-[A-Za-z0-9-]+$/i.test(str)) {
    return { ok: true, byCode: true, transactionCode: str };
  }
  const parsed = parseStrictPositiveInt(rawId, {
    field: 'paymentId',
    message: 'Mã giao dịch thanh toán không hợp lệ',
  });
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, byCode: false, paymentId: parsed.value };
}

function serializePayment(payment, extra = {}) {
  const json = typeof payment?.toJSON === 'function' ? payment.toJSON() : { ...(payment || {}) };
  const ver = Number(payment?.Version ?? json?.Version ?? 1);
  return {
    ...json,
    ...extra,
    paymentId: payment.PaymentId ?? json.PaymentId,
    status: payment.Status ?? json.Status,
    transactionCode: payment.TransactionCode ?? json.TransactionCode,
    version: ver,
    Version: ver,
  };
}

/**
 * 1. POST /api/v1/payments (alias /payments)
 * Tạo yêu cầu thanh toán mới cho Booking (cọc) hoặc Invoice (hoá đơn)
 */
exports.createPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userEmail = trimUnicode(req.user?.email || req.user?.Email || '');
    const isStaffOrAdmin = isStaffOrAdminUser(req.user);

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này',
      });
    }

    const {
      bookingId,
      invoiceId,
      amount,
      method: rawMethod,
      paymentMethod: aliasMethod,
      returnUrl,
      depositOption,
      transactionCode: requestedTxCode,
    } = req.body || {};

    const rawMethodVal = rawMethod !== undefined ? rawMethod : aliasMethod;
    if (rawMethodVal !== undefined && rawMethodVal !== null && typeof rawMethodVal !== 'string') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        field: 'method',
        message: 'Phương thức thanh toán không hợp lệ',
      });
    }
    const method = trimUnicode(rawMethodVal || '');

    // 1. Phân quyền phương thức thanh toán theo Actor (Mục 1.4.a)
    if (!isStaffOrAdmin) {
      // Guest KHÔNG được chọn thanh toán tại quầy
      if (['Cash', 'Card', 'BankTransfer'].includes(method)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Hình thức thanh toán này chỉ áp dụng tại quầy',
        });
      }
    }

    // 2. Validate Context (bookingId XOR invoiceId) (Mục 1.4.b)
    const hasBooking =
      bookingId !== undefined && bookingId !== null && !isBlankUnicode(String(bookingId));
    const hasInvoice =
      invoiceId !== undefined && invoiceId !== null && !isBlankUnicode(String(invoiceId));

    if ((!hasBooking && !hasInvoice) || (hasBooking && hasInvoice)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_INVALID_COMBINATION',
        message: 'Chỉ được cung cấp đúng 1 trong 2: bookingId hoặc invoiceId',
      });
    }

    let parsedBookingIdVal = null;
    let parsedInvoiceIdVal = null;
    if (hasBooking) {
      const parsedBId = parseStrictPositiveInt(bookingId, {
        field: 'bookingId',
        message: 'Mã đặt phòng (bookingId) không hợp lệ',
      });
      if (!parsedBId.ok) {
        await transaction.rollback();
        return sendValidationError(res, parsedBId);
      }
      parsedBookingIdVal = parsedBId.value;
    } else {
      const parsedIId = parseStrictPositiveInt(invoiceId, {
        field: 'invoiceId',
        message: 'Mã hoá đơn (invoiceId) không hợp lệ',
      });
      if (!parsedIId.ok) {
        await transaction.rollback();
        return sendValidationError(res, parsedIId);
      }
      parsedInvoiceIdVal = parsedIId.value;
    }

    // 3. Validate Phương thức thanh toán (Method)
    const VALID_METHODS = ['Cash', 'Card', 'BankTransfer', 'VNPay', 'MoMo', 'VietQR'];
    if (!method || !VALID_METHODS.includes(method)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        field: 'method',
        message: 'Phương thức thanh toán không hợp lệ',
      });
    }

    // Validate returnUrl (QA Scenarios #4, #5, #6)
    let cleanReturnUrl = '';
    if (returnUrl !== undefined && returnUrl !== null) {
      if (typeof returnUrl !== 'string') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'returnUrl',
          message: 'URL quay lại không hợp lệ',
        });
      }
      cleanReturnUrl = trimUnicode(returnUrl);
      if (cleanReturnUrl.length > 500) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'returnUrl',
          message: 'URL quay lại không được vượt quá 500 ký tự',
        });
      }
    }

    // Yêu cầu returnUrl đối với VNPay / MoMo
    if (['VNPay', 'MoMo'].includes(method)) {
      if (!cleanReturnUrl) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'returnUrl',
          message: 'URL quay lại không hợp lệ',
        });
      }
    }

    if (requestedTxCode !== undefined && requestedTxCode !== null) {
      if (typeof requestedTxCode !== 'string') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'transactionCode',
          message: 'Mã giao dịch không hợp lệ',
        });
      }
      if (trimUnicode(requestedTxCode).length > 150) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'transactionCode',
          message: 'Mã giao dịch không được vượt quá 150 ký tự',
        });
      }
    }

    // 4. Validate Số tiền (Amount > 0, hỗ trợ chữ số full-width ０-９)
    const parsedAmount = parseStrictNumber(amount, {
      normalizeFullWidth: true,
      allowDecimal: true,
      min: 0.01,
      field: 'amount',
      message: 'Số tiền phải lớn hơn 0',
    });
    if (!parsedAmount.ok) {
      await transaction.rollback();
      return sendValidationError(res, parsedAmount);
    }
    const numAmount = parsedAmount.value;

    // 5. Kiểm tra tính hợp lệ và quyền sở hữu theo Context (khoá dòng chống race condition)
    let targetBooking = null;
    let targetInvoice = null;

    if (hasBooking) {
      targetBooking = await Booking.findByPk(parsedBookingIdVal, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!targetBooking) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          message: 'Booking không tồn tại hoặc đã bị xoá',
        });
      }

      // Guest chỉ được thanh toán cho booking của chính mình
      if (!isStaffOrAdmin) {
        let isOwner = targetBooking.UserId && Number(targetBooking.UserId) === Number(userId);
        if (!isOwner && userEmail && BookingGuest) {
          const guest = await BookingGuest.findOne({
            where: { BookingId: targetBooking.BookingId, Email: userEmail },
            transaction,
          });
          if (guest) isOwner = true;
        }

        if (!isOwner) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            code: 'ERROR_0010_FORBIDDEN',
            message: 'Bạn không có quyền thực hiện chức năng này',
          });
        }
      }

      // Booking Status phải là Pending hoặc Confirmed
      if (!['Pending', 'Confirmed'].includes(targetBooking.Status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0015_PRECONDITION_FAILED',
          message: 'Booking không ở trạng thái chờ thanh toán',
        });
      }

      // Kiểm tra số dư booking còn lại (Quyết định D6 & D7)
      const paidPayments = await Payment.findAll({
        where: {
          BookingId: targetBooking.BookingId,
          Status: { [Op.in]: PAID_STATUSES },
        },
        transaction,
      });
      const totalPaid = paidPayments.reduce((sum, p) => {
        const amt = Number(p.Amount || 0);
        const ref = Number(p.RefundAmount || 0);
        return sum + Math.max(0, amt - ref);
      }, 0);
      const bookingTotal = Number(targetBooking.TotalAmount || 0);
      const remainingBalance = Math.max(0, bookingTotal - totalPaid);

      if (numAmount > remainingBalance) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          message: 'Số tiền vượt quá số dư còn phải thanh toán',
        });
      }
    } else {
      // hasInvoice
      targetInvoice = await Invoice.findByPk(parsedInvoiceIdVal, {
        include: [
          {
            model: Booking,
          },
          {
            model: Stay,
            include: [{ model: Booking }],
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!targetInvoice) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          message: 'Hoá đơn không tồn tại hoặc đã bị xoá',
        });
      }

      // Guest chỉ được thanh toán cho hoá đơn của mình
      if (!isStaffOrAdmin) {
        const ownerUserId =
          targetInvoice.Booking?.UserId ||
          targetInvoice.Stay?.Booking?.UserId ||
          targetInvoice.Stay?.booking?.UserId ||
          targetInvoice.stay?.booking?.UserId ||
          null;
        let isOwner = ownerUserId && Number(ownerUserId) === Number(userId);
        if (!isOwner && userEmail && BookingGuest && targetInvoice.BookingId) {
          const guest = await BookingGuest.findOne({
            where: { BookingId: targetInvoice.BookingId, Email: userEmail },
            transaction,
          });
          if (guest) isOwner = true;
        }

        if (!isOwner) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            code: 'ERROR_0010_FORBIDDEN',
            message: 'Bạn không có quyền thực hiện chức năng này',
          });
        }
      }

      // Invoice Status phải là Unpaid hoặc PartiallyPaid
      if (!['Unpaid', 'PartiallyPaid'].includes(targetInvoice.Status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0015_PRECONDITION_FAILED',
          message: 'Hoá đơn không ở trạng thái chờ thanh toán',
        });
      }

      // Kiểm tra số dư hoá đơn còn lại (Quyết định D6)
      const paidPayments = await Payment.findAll({
        where: {
          InvoiceId: targetInvoice.InvoiceId,
          Status: { [Op.in]: PAID_STATUSES },
        },
        transaction,
      });
      const totalPaid = paidPayments.reduce((sum, p) => {
        const amt = Number(p.Amount || 0);
        const ref = Number(p.RefundAmount || 0);
        return sum + Math.max(0, amt - ref);
      }, 0);
      const remainingInvoice = Math.max(0, Number(targetInvoice.TotalAmount) - totalPaid);

      if (numAmount > remainingInvoice) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          message: 'Số tiền vượt quá số dư hoá đơn còn lại',
        });
      }
    }

    // 6. Idempotency cho hình thức trực tuyến (VNPay / MoMo / VietQR) (Mục 1.4.d)
    if (['VNPay', 'MoMo', 'VietQR'].includes(method)) {
      const pendingWhere = { Status: 'Pending' };
      if (hasBooking) pendingWhere.BookingId = targetBooking.BookingId;
      if (hasInvoice) pendingWhere.InvoiceId = targetInvoice.InvoiceId;

      const existingPending = await Payment.findOne({
        where: pendingWhere,
        order: [['PaymentId', 'DESC']],
        transaction,
      });

      if (existingPending) {
        // Kiểm tra xem giao dịch Pending cũ có bị hết hạn không
        if (isPaymentExpired(existingPending)) {
          // Lazy timeout: đánh dấu Failed
          existingPending.Status = 'Failed';
          existingPending.GatewayResponse = JSON.stringify({ reason: 'Timeout' });
          existingPending.Version = Number(existingPending.Version || 1) + 1;
          await existingPending.save({ transaction });
        } else {
          // Nếu client truyền mã PMT hợp lệ hoặc đổi số tiền/phương thức, đồng bộ lại bản ghi Pending
          const cleanReqCode =
            requestedTxCode && /^PMT-\d{14}-\d{4}$/.test(trimUnicode(String(requestedTxCode)))
              ? trimUnicode(String(requestedTxCode))
              : null;
          if (cleanReqCode && existingPending.TransactionCode !== cleanReqCode) {
            existingPending.TransactionCode = cleanReqCode;
            existingPending.Amount = numAmount;
            existingPending.PaymentMethod = method;
            await existingPending.save({ transaction });
          }
          // Vẫn còn hạn -> Trả về giao dịch Pending cũ, KHÔNG tạo bản ghi mới
          await transaction.commit();
          const gwData = await createGatewayTransaction({
            transactionCode: existingPending.TransactionCode,
            amount: Number(existingPending.Amount),
            method: existingPending.PaymentMethod,
            returnUrl: cleanReturnUrl,
          });

          return res.status(200).json({
            success: true,
            code: 'SUCCESS_0001_CREATED',
            message: 'Đã có yêu cầu thanh toán đang chờ xử lý',
            data: serializePayment(existingPending, gwData),
          });
        }
      }
    } else {
      // 6b. Chống bấm đúp (Duplicate submit guard trong cửa sổ 5 giây cho giao dịch tại quầy - QA Scenario #9)
      const recentCutoff = new Date(Date.now() - 5000);
      const dupWhere = {
        PaymentMethod: method,
        Amount: numAmount,
        Status: 'Paid',
        PaymentDate: { [Op.gte]: recentCutoff },
        ...(hasBooking
          ? { BookingId: targetBooking.BookingId }
          : { InvoiceId: targetInvoice.InvoiceId }),
      };

      const recentDuplicate = await Payment.findOne({
        where: dupWhere,
        order: [['PaymentId', 'DESC']],
        transaction,
      });

      if (recentDuplicate) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          message: 'Giao dịch thanh toán trùng lặp vừa được ghi nhận, vui lòng không gửi liên tiếp',
          existingPaymentId: recentDuplicate.PaymentId,
        });
      }
    }

    // 7. Tạo giao dịch Payment mới
    const transactionCode =
      requestedTxCode && /^PMT-\d{14}-\d{4}$/.test(trimUnicode(String(requestedTxCode)))
        ? trimUnicode(String(requestedTxCode))
        : generateTransactionCode();
    const isOnline = ['VNPay', 'MoMo', 'VietQR'].includes(method);
    const initialStatus = isOnline ? 'Pending' : 'Paid';

    const newPayment = await Payment.create(
      {
        InvoiceId: hasInvoice ? targetInvoice.InvoiceId : null,
        BookingId: hasBooking ? targetBooking.BookingId : null,
        UserId: userId || (hasBooking ? targetBooking.UserId : null) || null,
        Amount: numAmount,
        PaymentMethod: method,
        PaymentDate: new Date(),
        TransactionCode: transactionCode,
        Status: initialStatus,
        GatewayResponse: isOnline ? null : 'In-person payment confirmed by staff',
        Version: 1,
      },
      { transaction }
    );

    // 8. Nếu thanh toán tại quầy (Paid ngay lập tức), cập nhật Invoice / Booking
    if (!isOnline) {
      if (hasInvoice) {
        const allPaid = await Payment.findAll({
          where: {
            InvoiceId: targetInvoice.InvoiceId,
            Status: { [Op.in]: PAID_STATUSES },
          },
          transaction,
        });
        const totalPaid = allPaid.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
        if (totalPaid >= Number(targetInvoice.TotalAmount)) {
          targetInvoice.Status = 'Paid';
        } else if (totalPaid > 0) {
          targetInvoice.Status = 'PartiallyPaid';
        }
        targetInvoice.Version = Number(targetInvoice.Version || 1) + 1;
        await targetInvoice.save({ transaction });
      }
    }

    await transaction.commit();

    try {
      const { notifyDashboardEvent } = require('../../../sockets/socketHandler');
      if (typeof notifyDashboardEvent === 'function' && !isOnline) {
        notifyDashboardEvent('PAYMENT_SUCCESS', {
          paymentId: newPayment.PaymentId,
          amount: newPayment.Amount,
        });
      }
    } catch (_) {}

    // 9. Sinh dữ liệu cổng thanh toán (Mock / Real)
    let gatewayResult = {};
    if (isOnline) {
      gatewayResult = await createGatewayTransaction({
        transactionCode,
        amount: numAmount,
        method,
        returnUrl: cleanReturnUrl,
        orderInfo: hasBooking
          ? `Đặt cọc phòng Booking #${targetBooking.BookingId}`
          : `Thanh toán hoá đơn #${targetInvoice.InvoiceId}`,
      });
    }

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Tạo yêu cầu thanh toán thành công',
      data: serializePayment(newPayment, gatewayResult),
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error in createPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo yêu cầu thanh toán.',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/v1/payments/:paymentId (alias /payments/:paymentId)
 * Tra cứu trạng thái giao dịch thanh toán (hỗ trợ lazy timeout check theo mục 1.4.d & TC07)
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userEmail = trimUnicode(req.user?.email || req.user?.Email || '');
    const isStaffOrAdmin = isStaffOrAdminUser(req.user);

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để tra cứu giao dịch thanh toán',
      });
    }

    const idCheck = resolvePaymentIdentifier(req.params.paymentId);
    if (!idCheck.ok) {
      return sendValidationError(res, idCheck);
    }

    const payment = idCheck.byCode
      ? await Payment.findOne({ where: { TransactionCode: idCheck.transactionCode } })
      : await Payment.findByPk(idCheck.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Giao dịch thanh toán không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra quyền sở hữu đối với Guest (QA Scenario #14)
    if (!isStaffOrAdmin) {
      let isOwner = payment.UserId && Number(payment.UserId) === Number(userId);
      if (!isOwner && payment.BookingId) {
        const b = await Booking.findByPk(payment.BookingId);
        if (b && b.UserId && Number(b.UserId) === Number(userId)) {
          isOwner = true;
        }
        if (!isOwner && userEmail && BookingGuest) {
          const guest = await BookingGuest.findOne({
            where: { BookingId: payment.BookingId, Email: userEmail },
          });
          if (guest) isOwner = true;
        }
      }
      if (!isOwner && payment.InvoiceId) {
        const inv = await Invoice.findByPk(payment.InvoiceId, {
          include: [{ model: Booking }],
        });
        if (inv?.Booking?.UserId && Number(inv.Booking.UserId) === Number(userId)) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền xem giao dịch thanh toán này',
        });
      }
    }

    // Lazy timeout check (VietQR > 15m, VNPay/MoMo > 30m)
    if (payment.Status === 'Pending' && isPaymentExpired(payment)) {
      payment.Status = 'Failed';
      payment.GatewayResponse = JSON.stringify({ reason: 'Timeout' });
      payment.Version = Number(payment.Version || 1) + 1;
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      data: serializePayment(payment),
    });
  } catch (error) {
    console.error('Error in getPaymentStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tra cứu giao dịch thanh toán.',
      error: error.message,
    });
  }
};

/**
 * 3. POST /api/v1/payments/webhook/:method (alias /payments/webhook/:method)
 * Nhận callback kết quả từ Gateway (hoặc trang Mock) (Mục 1.7)
 */
exports.handleWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { method } = req.params;
    const {
      transactionCode,
      gatewayStatus,
      gatewayTransactionId,
      rawPayload,
      signature,
    } = req.body;

    if (!transactionCode || typeof transactionCode !== 'string' || isBlankUnicode(transactionCode)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Mã giao dịch transactionCode là bắt buộc',
      });
    }

    const cleanTxCode = trimUnicode(transactionCode);

    // 1. Tìm bản ghi Payment theo transactionCode
    const payment = await Payment.findOne({
      where: { TransactionCode: cleanTxCode },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Giao dịch không tồn tại',
      });
    }

    // 2. Xác thực chữ ký nếu ở chế độ real (Mục 1.7.c & TC08)
    const isSigValid = verifyWebhookSignature({
      method,
      payload: req.body,
      signature,
    });

    if (!isSigValid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Chữ ký số webhook không hợp lệ',
      });
    }

    // 3. Idempotency: Nếu đã ở trạng thái Paid hoặc Failed thì không xử lý lại (Mục 1.7.a & TC06)
    if (['Paid', 'Failed'].includes(payment.Status)) {
      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: 'Giao dịch đã được cập nhật trước đó',
        data: serializePayment(payment),
      });
    }

    // 4. Cập nhật trạng thái Payment
    const isSuccess =
      gatewayStatus === 'success' ||
      gatewayStatus === '00' ||
      gatewayStatus === 'PAID';

    payment.Status = isSuccess ? 'Paid' : 'Failed';
    payment.GatewayResponse = JSON.stringify(
      rawPayload || {
        gatewayStatus,
        gatewayTransactionId: gatewayTransactionId || `GW-${Date.now()}`,
        processedAt: new Date().toISOString(),
      }
    );
    payment.Version = Number(payment.Version || 1) + 1;
    await payment.save({ transaction });

    // 5. Cập nhật trạng thái Invoice / Booking liên quan nếu thanh toán thành công
    if (isSuccess) {
      if (payment.InvoiceId) {
        const invoice = await Invoice.findByPk(payment.InvoiceId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (invoice) {
          const allPaid = await Payment.findAll({
            where: {
              InvoiceId: invoice.InvoiceId,
              Status: { [Op.in]: PAID_STATUSES },
            },
            transaction,
          });
          const totalPaid = allPaid.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
          if (totalPaid >= Number(invoice.TotalAmount)) {
            invoice.Status = 'Paid';
          } else if (totalPaid > 0) {
            invoice.Status = 'PartiallyPaid';
          }
          invoice.Version = Number(invoice.Version || 1) + 1;
          await invoice.save({ transaction });
        }
      }

      if (payment.BookingId && !payment.InvoiceId) {
        const booking = await Booking.findByPk(payment.BookingId, { transaction });
        if (booking) {
          const allBookingPaid = await Payment.findAll({
            where: {
              BookingId: booking.BookingId,
              Status: { [Op.in]: PAID_STATUSES },
            },
            transaction,
          });
          const totalBookingPaid = allBookingPaid.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
          booking.DepositAmount = totalBookingPaid;
          if (booking.Status === 'Pending') {
            booking.Status = 'Confirmed';
          }
          if (!booking.BookingQrCode && booking.ConfirmationCode) {
            booking.BookingQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${booking.ConfirmationCode}`;
          }
          await booking.save({ transaction });
        }
      }
    }

    await transaction.commit();

    if (isSuccess) {
      try {
        const { broadcastRoomEvent, notifyDashboardEvent } = require('../../../sockets/socketHandler');
        if (typeof notifyDashboardEvent === 'function') {
          notifyDashboardEvent('PAYMENT_SUCCESS', {
            paymentId: payment.PaymentId,
            bookingId: payment.BookingId,
            invoiceId: payment.InvoiceId,
            amount: Number(payment.Amount),
          });
        }
        if (payment.BookingId && typeof broadcastRoomEvent === 'function') {
          broadcastRoomEvent('PAYMENT_COMPLETED', {
            bookingId: payment.BookingId,
            transactionCode: payment.TransactionCode,
            amountPaid: Number(payment.Amount),
            paymentMethod: payment.PaymentMethod,
            status: 'Confirmed',
          });
          broadcastRoomEvent('BOOKING_CONFIRMED', {
            bookingId: payment.BookingId,
            status: 'Confirmed',
          });
        }
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Xử lý webhook thanh toán thành công',
      data: serializePayment(payment),
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error in handleWebhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xử lý webhook thanh toán.',
      error: error.message,
    });
  }
};

/**
 * 4. PATCH /api/v1/payments/:paymentId/refund (alias /payments/:paymentId/refund)
 * Hoàn tiền giao dịch đã thanh toán (Mục 1.9 & TC09)
 */
exports.refundPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    // Quyết định D5: Refund chỉ Admin. Hệ thống không có vai trò Kế toán.
    const isAuthorized = userRole === 'Admin' || Number(req.user?.roleId) === 1;

    if (!isAuthorized) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const idCheck = resolvePaymentIdentifier(req.params.paymentId);
    if (!idCheck.ok) {
      await transaction.rollback();
      return sendValidationError(res, idCheck);
    }

    const verExtract = extractExpectedVersion(req);
    if (!verExtract.ok) {
      await transaction.rollback();
      return sendValidationError(res, verExtract);
    }

    const { refundReason, refundAmount } = req.body || {};

    const payment = idCheck.byCode
      ? await Payment.findOne({
          where: { TransactionCode: idCheck.transactionCode },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : await Payment.findByPk(idCheck.paymentId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Giao dịch không tồn tại hoặc đã bị xoá',
      });
    }

    // Kiểm tra Optimistic Locking (QA Scenario #2)
    if (verExtract.provided) {
      const verCheck = assertVersionMatch(payment, verExtract.version, 'Version');
      if (!verCheck.ok) {
        await transaction.rollback();
        return sendValidationError(res, verCheck);
      }
    }

    // Chỉ hoàn tiền khi trạng thái hiện tại là Paid (Mục 1.9 & 1.8 & QA Scenario #1)
    if (payment.Status !== 'Paid') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0013_INVALID_STATE_TRANSITION',
        message: 'Không thể hoàn tiền — giao dịch không ở trạng thái đã thanh toán',
      });
    }

    // Validate refundReason (2-500 ký tự, hỗ trợ trimUnicode \u3000 - QA Scenarios #4, #5, #6)
    if (refundReason === undefined || refundReason === null || typeof refundReason !== 'string' || isBlankUnicode(refundReason)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'refundReason',
        message: 'Lý do hoàn tiền không được để trống',
      });
    }

    const trimmedReason = trimUnicode(refundReason);
    if (trimmedReason.length < 2) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'refundReason',
        message: 'Lý do hoàn tiền phải từ 2 đến 500 ký tự',
      });
    }
    if (trimmedReason.length > 500) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'refundReason',
        message: 'Lý do hoàn tiền không được vượt quá 500 ký tự',
      });
    }

    // Validate refundAmount (hỗ trợ chữ số full-width ０-９ - QA Scenario #7)
    let amountVal = Number(payment.Amount);
    if (refundAmount !== undefined && refundAmount !== null && !isBlankUnicode(String(refundAmount))) {
      const parsedRefundAmt = parseStrictNumber(refundAmount, {
        normalizeFullWidth: true,
        allowDecimal: true,
        field: 'refundAmount',
        message: 'Số tiền hoàn phải lớn hơn 0 và không vượt quá số tiền giao dịch gốc',
      });
      if (!parsedRefundAmt.ok) {
        await transaction.rollback();
        return sendValidationError(res, parsedRefundAmt);
      }
      amountVal = parsedRefundAmt.value;
    }

    if (isNaN(amountVal) || amountVal <= 0 || amountVal > Number(payment.Amount)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        field: 'refundAmount',
        message: 'Số tiền hoàn phải lớn hơn 0 và không vượt quá số tiền giao dịch gốc',
      });
    }

    // Cập nhật trạng thái và tăng Version
    payment.Status = 'Refunded';
    payment.RefundReason = trimmedReason;
    payment.RefundAmount = amountVal;
    payment.Version = Number(payment.Version || 1) + 1;

    // Ghi bổ sung vào GatewayResponse
    let currentGw = {};
    try {
      currentGw = payment.GatewayResponse ? JSON.parse(payment.GatewayResponse) : {};
    } catch (e) {
      currentGw = { raw: payment.GatewayResponse };
    }
    currentGw.refund = {
      refundReason: trimmedReason,
      refundAmount: amountVal,
      refundedAt: new Date().toISOString(),
      refundedBy: req.user?.userId || null,
    };
    payment.GatewayResponse = JSON.stringify(currentGw);

    await payment.save({ transaction });

    // R2-ISSUE-06 & C10: Cập nhật lại trạng thái Invoice tương ứng khi có hoàn tiền
    if (payment.InvoiceId) {
      const invoice = await Invoice.findByPk(payment.InvoiceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (invoice) {
        const allPayments = await Payment.findAll({
          where: { InvoiceId: invoice.InvoiceId },
          transaction,
        });

        // Tính trực tiếp Net Paid: tổng (Amount - RefundAmount) của các giao dịch hợp lệ
        let netPaid = 0;
        for (const p of allPayments) {
          const origAmt = Number(p.Amount || 0);
          const refAmt = Number(p.RefundAmount || 0);

          if (PAID_STATUSES.includes(p.Status)) {
            netPaid += Math.max(0, origAmt - refAmt);
          } else if (p.Status === 'Refunded') {
            const actualRef = refAmt > 0 ? refAmt : origAmt;
            netPaid += Math.max(0, origAmt - actualRef);
          }
        }

        const totalAmount = Number(invoice.TotalAmount || 0);

        if (netPaid <= 0) {
          invoice.Status = 'Cancelled';
        } else if (netPaid < totalAmount) {
          invoice.Status = 'PartiallyPaid';
        } else {
          invoice.Status = 'Paid';
        }

        invoice.PdfPath = null;
        invoice.Version = Number(invoice.Version || 1) + 1;
        await invoice.save({ transaction });

        // Xoá file vật lý PDF đã cache
        if (invoice.InvoiceNumber) {
          const fileName = `INV-${invoice.InvoiceNumber}.pdf`;
          const filePath = path.join(__dirname, '../../../../public/uploads/invoices', fileName);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
          }
        }
      }
    }

    await transaction.commit();

    try {
      const { notifyDashboardEvent } = require('../../../sockets/socketHandler');
      if (typeof notifyDashboardEvent === 'function') {
        notifyDashboardEvent('PAYMENT_REFUNDED', {
          paymentId: payment.PaymentId,
          refundAmount: amountVal,
        });
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Hoàn tiền giao dịch thành công',
      data: serializePayment(payment),
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error in refundPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi hoàn tiền giao dịch.',
      error: error.message,
    });
  }
};
