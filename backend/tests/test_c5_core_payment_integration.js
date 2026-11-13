'use strict';

/**
 * backend/tests/test_c5_core_payment_integration.js
 * Kiểm thử tích hợp C5 Core Payment (FEAT-PAYMENT-01) với các phân hệ khác:
 *  - A8 Online Deposit Payment (DepositPayment.jsx / MockPaymentGateway.jsx / Guest Bookings)
 *  - C9 Multi-Tender Invoice Settlement (MultiTenderSettlementModal.jsx / invoiceApi.js / masterInvoiceController.js)
 *  - Spec 8 Check-In POS Payment (checkInRoutes.js)
 */

const assert = require('assert');
const { sequelize, Booking, BookingGuest, Invoice, Payment, RoomType } = require('../src/models');
const { getAuthContext } = require('./e2e_services_c1_c14/helpers/authHelper');

const API_BASE = 'http://localhost:5000/api/v1';

async function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('==================================================================');
  console.log('🧪 TEST TÍCH HỢP C5 CORE PAYMENT VỚI CÁC PHÂN HỆ KHÁC');
  console.log('==================================================================\n');

  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let passed = 0;
  let failed = 0;
  const createdBookingIds = [];
  const createdInvoiceIds = [];

  function check(name, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  try {
    const roomType = await RoomType.findOne();
    const roomTypeId = roomType ? roomType.RoomTypeId : 1;

    // -------------------------------------------------------------------------
    // CASE 1: invoiceApi.settleInvoicePayment gửi `paymentMethod` thay vì `method`
    // -------------------------------------------------------------------------
    console.log('--- [Case 1] POST /api/v1/payments hỗ trợ cả `method` và `paymentMethod` (invoiceApi compatibility) ---');
    const testInv1 = await Invoice.create({
      BookingId: 1,
      InvoiceNumber: `INV-C5-TEST1-${Date.now()}`,
      Subtotal: 500000,
      TotalAmount: 500000,
      Status: 'Unpaid',
      CreatedAt: new Date(),
    });
    createdInvoiceIds.push(testInv1.InvoiceId);

    const resCase1 = await apiRequest('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        invoiceId: testInv1.InvoiceId,
        amount: 500000,
        paymentMethod: 'Cash', // invoiceApi.settleInvoicePayment gửi field `paymentMethod`
      },
    });
    check(
      'TC1.1: POST /payments chấp nhận `paymentMethod` từ invoiceApi.js (HTTP 201)',
      resCase1.status === 201 && resCase1.data?.success === true,
      `status=${resCase1.status}, code=${resCase1.data?.code}, msg=${resCase1.data?.message}`
    );
    check(
      'TC1.2: Giao dịch tạo mã chuẩn PMT-... và cập nhật Invoice sang Paid',
      /^PMT-\d{14}-\d{4}$/.test(resCase1.data?.data?.TransactionCode || '') &&
        (await Invoice.findByPk(testInv1.InvoiceId)).Status === 'Paid',
      `txCode=${resCase1.data?.data?.TransactionCode}`
    );

    // -------------------------------------------------------------------------
    // CASE 2: Khách đặt phòng trên Web (không cần token hoặc có token) thanh toán cọc qua C5
    //         (VietQR / VNPay / MoMo) + Webhook C5 -> tự động xác nhận Booking (Confirmed + DepositAmount + QR)
    // -------------------------------------------------------------------------
    console.log('\n--- [Case 2] Luồng đặt cọc A8 (DepositPayment.jsx) qua C5 Core Payment + Mock Webhook ---');
    const testBooking2 = await Booking.create({
      UserId: 1, // Khách vãng lai đặt trực tuyến trên BookingEngine chưa đăng nhập (không có JWT token)
      RoomTypeId: roomTypeId,
      CheckInDate: '2027-09-10',
      CheckOutDate: '2027-09-12',
      NumberOfNights: 2,
      Adults: 2,
      Children: 0,
      RoomQuantity: 1,
      RoomSubtotal: 4000000,
      TotalAmount: 4000000,
      DepositAmount: 0,
      Status: 'Pending',
      BookingSource: 'DirectWeb',
      ConfirmationCode: `GH-C5-${Date.now().toString().slice(-6)}`,
    });
    createdBookingIds.push(testBooking2.BookingId);

    // 2.1: Guest gọi POST /api/v1/payments cho đơn đặt phòng Pending (online method VietQR)
    const resCreateDepositC5 = await apiRequest('/payments', {
      method: 'POST',
      body: {
        bookingId: testBooking2.BookingId,
        amount: 800000, // Cọc 20%
        method: 'VietQR',
        returnUrl: `http://localhost:3000/deposit-payment?bookingId=${testBooking2.BookingId}`,
      },
    });
    check(
      'TC2.1: Khách đặt phòng trực tuyến tạo lệnh thanh toán VietQR qua C5 POST /payments thành công',
      resCreateDepositC5.status === 201 && resCreateDepositC5.data?.data?.Status === 'Pending',
      `status=${resCreateDepositC5.status}, msg=${resCreateDepositC5.data?.message}`
    );

    const depositTxCode = resCreateDepositC5.data?.data?.TransactionCode;

    // 2.2: MockPaymentGateway gọi POST /api/v1/payments/webhook/mock xác nhận thành công
    const resWebhookDeposit = await apiRequest('/payments/webhook/mock', {
      method: 'POST',
      body: {
        transactionCode: depositTxCode || 'PMT-MISSING',
        gatewayStatus: 'success',
        gatewayTransactionId: `MOCK-GW-${Date.now()}`,
      },
    });
    check(
      'TC2.2: Webhook C5 xử lý giao dịch đặt cọc thành công (HTTP 200, Payment.Status = Paid)',
      resWebhookDeposit.status === 200 && resWebhookDeposit.data?.data?.Status === 'Paid',
      `status=${resWebhookDeposit.status}, paymentStatus=${resWebhookDeposit.data?.data?.Status}`
    );

    // 2.3: Kiểm tra Booking đã được đồng bộ sang Confirmed, DepositAmount = 800000, có BookingQrCode
    const updatedBooking2 = await Booking.findByPk(testBooking2.BookingId);
    check(
      'TC2.3: Sau khi Webhook C5 Paid, Booking.Status tự động chuyển sang Confirmed & cập nhật DepositAmount',
      updatedBooking2.Status === 'Confirmed' &&
        Number(updatedBooking2.DepositAmount) === 800000 &&
        Boolean(updatedBooking2.BookingQrCode),
      `Status=${updatedBooking2.Status}, DepositAmount=${updatedBooking2.DepositAmount}, QR=${updatedBooking2.BookingQrCode}`
    );

    // -------------------------------------------------------------------------
    // CASE 3: Multi-Tender Settlement (C9) kết hợp C5 Online Payment + Mock Gateway
    // -------------------------------------------------------------------------
    console.log('\n--- [Case 3] Quyết toán đa phương thức C9 kết hợp C5 Online Payment (VietQR/VNPay/MoMo) ---');
    const testInv3 = await Invoice.create({
      BookingId: 1,
      InvoiceNumber: `INV-C5-TEST3-${Date.now()}`,
      Subtotal: 1000000,
      TotalAmount: 1000000,
      Status: 'Unpaid',
      CreatedAt: new Date(),
    });
    createdInvoiceIds.push(testInv3.InvoiceId);

    // Bước 1: Thu ngân chọn Cash (400k) + VietQR (600k) và bấm "Mở Mock Gateway"
    // -> tạo giao dịch Pending trên C5 với mã PMT-...
    const resC5OnlineTender = await apiRequest('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        invoiceId: testInv3.InvoiceId,
        amount: 600000,
        method: 'VietQR',
      },
    });
    const onlineTenderTxCode = resC5OnlineTender.data?.data?.TransactionCode;
    check(
      'TC3.1: Khởi tạo khoản thu online 600k trên C5 trước khi mở Mock Gateway',
      resC5OnlineTender.status === 201 && /^PMT-\d{14}-\d{4}$/.test(onlineTenderTxCode || ''),
      `status=${resC5OnlineTender.status}, txCode=${onlineTenderTxCode}`
    );

    // Bước 2: Khách thanh toán trên Mock Gateway -> Webhook C5 cập nhật khoản 600k thành Paid
    const resWebhookInv3 = await apiRequest('/payments/webhook/mock', {
      method: 'POST',
      body: {
        transactionCode: onlineTenderTxCode,
        gatewayStatus: 'success',
      },
    });
    check(
      'TC3.2: Webhook C5 xác nhận khoản 600k thành Paid',
      resWebhookInv3.status === 200 && resWebhookInv3.data?.data?.Status === 'Paid',
      `status=${resWebhookInv3.status}`
    );

    // Bước 3: Thu ngân bấm "Xác Nhận Quyết Toán" trên MultiTenderSettlementModal với Cash 400k + VietQR 600k (kèm mã onlineTenderTxCode)
    const resSettle3 = await apiRequest(`/invoices/${testInv3.InvoiceId}/pay`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        tenders: [
          { method: 'Cash', amount: 400000, customerCashGiven: 400000 },
          { method: 'VietQR', amount: 600000, transactionCode: onlineTenderTxCode },
        ],
        note: 'Quyết toán kết hợp Cash + C5 VietQR đã xác thực qua Mock Gateway',
      },
    });
    const inv3Payments = await Payment.findAll({ where: { InvoiceId: testInv3.InvoiceId } });
    check(
      'TC3.3: POST /invoices/:id/pay tái sử dụng giao dịch C5 đã Paid (không báo lỗi vượt số dư, không tạo bản ghi trùng)',
      resSettle3.status === 200 &&
        resSettle3.data?.data?.status === 'Paid' &&
        inv3Payments.length === 2,
      `status=${resSettle3.status}, code=${resSettle3.data?.code}, msg=${resSettle3.data?.message}, paymentCount=${inv3Payments.length}`
    );

    // -------------------------------------------------------------------------
    // CASE 4: Check-In POS Payment (Spec 8) đồng bộ chuẩn C5 Core Payment
    // -------------------------------------------------------------------------
    console.log('\n--- [Case 4] Check-In POS Payment dùng chuẩn C5 Core Payment ---');
    const testBooking4 = await Booking.create({
      UserId: 1,
      RoomTypeId: roomTypeId,
      CheckInDate: '2027-10-01',
      CheckOutDate: '2027-10-03',
      NumberOfNights: 2,
      Adults: 2,
      Children: 0,
      RoomQuantity: 1,
      RoomSubtotal: 3000000,
      TotalAmount: 3000000,
      DepositAmount: 600000,
      Status: 'Confirmed',
      BookingSource: 'DirectWeb',
      ConfirmationCode: `GH-POS-${Date.now().toString().slice(-6)}`,
    });
    createdBookingIds.push(testBooking4.BookingId);

    const resPos = await apiRequest('/check-ins/process-payment', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: testBooking4.BookingId,
        amount: 2400000,
        preAuthAmount: 1000000,
        cardLast4: '4092',
      },
    });
    const posPayment = await Payment.findOne({
      where: { BookingId: testBooking4.BookingId },
      order: [['PaymentId', 'DESC']],
    });
    check(
      'TC4.1: Check-In POS Payment tạo bản ghi Payment theo chuẩn C5 (PaymentMethod=Card, Status=Paid, mã PMT-...)',
      resPos.status === 200 &&
        posPayment &&
        posPayment.PaymentMethod === 'Card' &&
        posPayment.Status === 'Paid' &&
        /^PMT-\d{14}-\d{4}$/.test(posPayment.TransactionCode),
      `posPayment=${JSON.stringify(posPayment ? { method: posPayment.PaymentMethod, status: posPayment.Status, code: posPayment.TransactionCode } : null)}`
    );
  } finally {
    // Cleanup
    for (const invId of createdInvoiceIds) {
      await Payment.destroy({ where: { InvoiceId: invId } });
      await Invoice.destroy({ where: { InvoiceId: invId } });
    }
    for (const bId of createdBookingIds) {
      await Payment.destroy({ where: { BookingId: bId } });
      await BookingGuest.destroy({ where: { BookingId: bId } });
      await Booking.destroy({ where: { BookingId: bId } });
    }
    await sequelize.close();
  }

  console.log('\n==================================================================');
  console.log(`📊 KẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
  console.log('==================================================================');
  process.exitCode = failed > 0 ? 1 : 0;
}

run();
