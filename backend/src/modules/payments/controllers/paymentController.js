'use strict';

/**
 * modules/payments/controllers/paymentController.js
 * 👤 OWNER: Hà — Core Payment Module (FEAT-PAYMENT-01 / C5)
 * Cung cấp dịch vụ thanh toán dùng chung: Cash / Card / BankTransfer / VNPay / MoMo / VietQR
 */

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

// Quyết định D6: coi PAID_STATUSES = ['Paid', 'Success', 'Completed'] là đã thu
const PAID_STATUSES = ['Paid', 'Success', 'Completed'];

/**
 * 1. POST /api/v1/payments (alias /payments)
 * Tạo yêu cầu thanh toán mới cho Booking (cọc) hoặc Invoice (hoá đơn)
 */
exports.createPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const userEmail = req.user?.email || req.user?.Email || '';
    const isStaffOrAdmin = ['Admin', 'Receptionist', 'Staff', 'Manager', 'Accountant'].includes(userRole);

    const {
      bookingId,
      invoiceId,
      amount,
      method,
      returnUrl,
      depositOption,
    } = req.body;

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
    const hasBooking = bookingId !== undefined && bookingId !== null && bookingId !== '';
    const hasInvoice = invoiceId !== undefined && invoiceId !== null && invoiceId !== '';

    if ((!hasBooking && !hasInvoice) || (hasBooking && hasInvoice)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_INVALID_COMBINATION',
        message: 'Chỉ được cung cấp đúng 1 trong 2: bookingId hoặc invoiceId',
      });
    }

    // 3. Validate Phương thức thanh toán (Method)
    const VALID_METHODS = ['Cash', 'Card', 'BankTransfer', 'VNPay', 'MoMo', 'VietQR'];
    if (!method || !VALID_METHODS.includes(method)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Phương thức thanh toán không hợp lệ',
      });
    }

    // Yêu cầu returnUrl đối với VNPay / MoMo
    if (['VNPay', 'MoMo'].includes(method)) {
      if (!returnUrl || typeof returnUrl !== 'string' || !returnUrl.trim()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'URL quay lại không hợp lệ',
        });
      }
    }

    // 4. Validate Số tiền (Amount > 0)
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền phải lớn hơn 0',
      });
    }

    // 5. Kiểm tra tính hợp lệ và quyền sở hữu theo Context
    let targetBooking = null;
    let targetInvoice = null;

    if (hasBooking) {
      targetBooking = await Booking.findByPk(Number(bookingId), { transaction });
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
      const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
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
      targetInvoice = await Invoice.findByPk(Number(invoiceId), {
        include: [
          {
            model: Stay,
            include: [{ model: Booking }],
          },
        ],
        transaction,
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
        const stayOwnerId =
          targetInvoice.Stay?.Booking?.UserId ||
          targetInvoice.Stay?.booking?.UserId ||
          targetInvoice.stay?.booking?.UserId ||
          targetInvoice.BookingId;
        const isOwner = stayOwnerId && Number(stayOwnerId) === Number(userId);

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
      const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
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
          await existingPending.save({ transaction });
        } else {
          // Vẫn còn hạn -> Trả về giao dịch Pending cũ, KHÔNG tạo bản ghi mới
          await transaction.commit();
          const gwData = await createGatewayTransaction({
            transactionCode: existingPending.TransactionCode,
            amount: Number(existingPending.Amount),
            method: existingPending.PaymentMethod,
            returnUrl,
          });

          return res.status(200).json({
            success: true,
            code: 'SUCCESS_0001_CREATED',
            message: 'Đã có yêu cầu thanh toán đang chờ xử lý',
            data: {
              ...existingPending.toJSON(),
              ...gwData,
              paymentId: existingPending.PaymentId,
              status: existingPending.Status,
              transactionCode: existingPending.TransactionCode,
            },
          });
        }
      }
    }

    // 7. Tạo giao dịch Payment mới
    const transactionCode = generateTransactionCode();
    const isOnline = ['VNPay', 'MoMo', 'VietQR'].includes(method);
    const initialStatus = isOnline ? 'Pending' : 'Paid';

    const newPayment = await Payment.create(
      {
        InvoiceId: hasInvoice ? targetInvoice.InvoiceId : null,
        BookingId: hasBooking ? targetBooking.BookingId : null,
        UserId: userId || null,
        Amount: numAmount,
        PaymentMethod: method,
        PaymentDate: new Date(),
        TransactionCode: transactionCode,
        Status: initialStatus,
        GatewayResponse: isOnline ? null : 'In-person payment confirmed by staff',
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
        await targetInvoice.save({ transaction });
      }

      // Quyết định C5 (ticket 03): Không tự đổi Booking.Status sang Confirmed trong Core Payment,
      // để module Booking (A8) phụ trách vòng đời booking và broadcast websocket.
    }

    await transaction.commit();

    // 9. Sinh dữ liệu cổng thanh toán (Mock / Real)
    let gatewayResult = {};
    if (isOnline) {
      gatewayResult = await createGatewayTransaction({
        transactionCode,
        amount: numAmount,
        method,
        returnUrl,
        orderInfo: hasBooking
          ? `Đặt cọc phòng Booking #${targetBooking.BookingId}`
          : `Thanh toán hoá đơn #${targetInvoice.InvoiceId}`,
      });
    }

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Tạo yêu cầu thanh toán thành công',
      data: {
        ...newPayment.toJSON(),
        ...gatewayResult,
        paymentId: newPayment.PaymentId,
        status: newPayment.Status,
        transactionCode: newPayment.TransactionCode,
      },
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
    const { paymentId } = req.params;

    let payment = null;
    if (!isNaN(Number(paymentId))) {
      payment = await Payment.findByPk(Number(paymentId));
    }
    if (!payment) {
      payment = await Payment.findOne({ where: { TransactionCode: paymentId } });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Giao dịch thanh toán không tồn tại hoặc đã bị xoá',
      });
    }

    // Lazy timeout check (VietQR > 15m, VNPay/MoMo > 30m)
    if (payment.Status === 'Pending' && isPaymentExpired(payment)) {
      payment.Status = 'Failed';
      payment.GatewayResponse = JSON.stringify({ reason: 'Timeout' });
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        ...payment.toJSON(),
        paymentId: payment.PaymentId,
        status: payment.Status,
        transactionCode: payment.TransactionCode,
      },
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

    if (!transactionCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Mã giao dịch transactionCode là bắt buộc',
      });
    }

    // 1. Tìm bản ghi Payment theo transactionCode
    const payment = await Payment.findOne({
      where: { TransactionCode: transactionCode },
      transaction,
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
        data: payment,
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
    await payment.save({ transaction });

    // 5. Cập nhật trạng thái Invoice / Booking liên quan nếu thanh toán thành công
    if (isSuccess) {
      if (payment.InvoiceId) {
        const invoice = await Invoice.findByPk(payment.InvoiceId, { transaction });
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
          await invoice.save({ transaction });
        }
      }

      // Quyết định C5 (ticket 03): C5 chỉ ghi nhận Payment thành công,
      // không tự động thay đổi Booking.Status để nhường quyền quản lý vòng đời cho module Booking (A8).
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Xử lý webhook thanh toán thành công',
      data: payment,
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
    const isAuthorized = userRole === 'Admin' || req.user?.roleId === 1;

    if (!isAuthorized) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { paymentId } = req.params;
    const { refundReason, refundAmount } = req.body;

    let payment = null;
    if (!isNaN(Number(paymentId))) {
      payment = await Payment.findByPk(Number(paymentId), { transaction });
    }
    if (!payment) {
      payment = await Payment.findOne({
        where: { TransactionCode: paymentId },
        transaction,
      });
    }

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Giao dịch không tồn tại hoặc đã bị xoá',
      });
    }

    // Chỉ hoàn tiền khi trạng thái hiện tại là Paid (Mục 1.9 & 1.8)
    if (payment.Status !== 'Paid') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0013_INVALID_STATE_TRANSITION',
        message: 'Không thể hoàn tiền — giao dịch không ở trạng thái đã thanh toán',
      });
    }

    // Validate refundReason (2-500 ký tự)
    if (!refundReason || typeof refundReason !== 'string' || !refundReason.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Lý do hoàn tiền không được để trống',
      });
    }

    const trimmedReason = refundReason.trim();
    if (trimmedReason.length < 2 || trimmedReason.length > 500) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        message: 'Lý do hoàn tiền phải từ 2 đến 500 ký tự',
      });
    }

    // Validate refundAmount
    const amountVal = refundAmount ? Number(refundAmount) : Number(payment.Amount);
    if (isNaN(amountVal) || amountVal <= 0 || amountVal > Number(payment.Amount)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0012_OUT_OF_RANGE',
        message: 'Số tiền hoàn phải lớn hơn 0 và không vượt quá số tiền giao dịch gốc',
      });
    }

    // Cập nhật trạng thái
    payment.Status = 'Refunded';
    payment.RefundReason = trimmedReason;
    payment.RefundAmount = amountVal;

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
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Hoàn tiền giao dịch thành công',
      data: payment,
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
