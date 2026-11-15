'use strict';

/**
 * challenger_orch3_financial_stress.js
 * EMPIRICAL CHALLENGER ADVERSARIAL STRESS TEST HARNESS — ORCHESTRATOR 3
 * Target Features: C5 (Core Payments/Refund), C6 (Folio Charges), C7 (Master Invoice),
 *                  C8 (PDF Export), C9 (Multi-Tender Settlement), C10 (Ledger & Audit)
 *
 * Suites:
 *   1. Concurrency Stress on Settlement (POST /invoices/:id/pay)
 *   2. Multi-Tender Edge Cases & Financial Arithmetic
 *   3. Refund Integrity & Balance Calculation
 *   4. Master Invoice Generation Idempotency & Concurrency
 *   5. PDF Generation Stream & Cache Invalidation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { request } = require('./e2e_services_c1_c14/helpers/apiClient');
const { getAuthContext } = require('./e2e_services_c1_c14/helpers/authHelper');
const {
  sequelize,
  Booking,
  Stay,
  Room,
  RoomType,
  Invoice,
  InvoiceDetail,
  Payment,
  User,
} = require('../src/models');

const INVOICE_PDF_DIR = path.join(__dirname, '../public/uploads/invoices');
const TEST_INVOICE_ID = 1;

/**
 * Helper to reset test invoice state cleanly in DB
 */
async function resetInvoice(invoiceId, totalAmount, status = 'Unpaid', paymentsToCreate = []) {
  await Payment.destroy({ where: { InvoiceId: invoiceId } });
  await Invoice.update(
    {
      TotalAmount: totalAmount,
      Subtotal: totalAmount,
      VATRate: 0,
      VATAmount: 0,
      Status: status,
      PdfPath: null,
    },
    { where: { InvoiceId: invoiceId } }
  );

  // Clean physical PDF cache if exists
  const invoice = await Invoice.findByPk(invoiceId);
  if (invoice && invoice.InvoiceNumber) {
    const p = path.join(INVOICE_PDF_DIR, `INV-${invoice.InvoiceNumber}.pdf`);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (_) {}
    }
  }

  const createdPayments = [];
  for (const p of paymentsToCreate) {
    const payment = await Payment.create({
      InvoiceId: invoiceId,
      Amount: p.amount,
      PaymentMethod: p.method || 'Cash',
      PaymentDate: new Date(),
      TransactionCode: p.code || `TXN-STRESS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      Status: p.status || 'Paid',
      RefundAmount: p.refundAmount || 0,
      RefundReason: p.refundReason || null,
    });
    createdPayments.push(payment);
  }
  return createdPayments;
}

/**
 * Helper to create a temporary test booking and stay for idempotency/concurrency tests
 */
async function createTemporaryBookingWithStay() {
  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-03',
    NumberOfNights: 2,
    RoomQuantity: 1,
    RoomSubtotal: 1000000,
    TotalAmount: 1000000,
    Status: 'CheckedOut',
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-03',
    ActualCheckIn: '2026-11-01T14:00:00Z',
    ActualCheckOut: '2026-11-03T12:00:00Z',
    Status: 'CheckedOut',
  });

  return { booking, stay };
}

/**
 * Helper to cleanup temporary booking
 */
async function cleanupTemporaryBooking(bookingId) {
  const invoices = await Invoice.findAll({ where: { BookingId: bookingId } });
  const invoiceIds = invoices.map((i) => i.InvoiceId);
  if (invoiceIds.length > 0) {
    await Payment.destroy({ where: { InvoiceId: invoiceIds } });
    await InvoiceDetail.destroy({ where: { InvoiceId: invoiceIds } });
    await Invoice.destroy({ where: { InvoiceId: invoiceIds } });
  }
  await Stay.destroy({ where: { BookingId: bookingId } });
  await Booking.destroy({ where: { BookingId: bookingId } });
}

async function runOrch3FinancialStressHarness() {
  console.log('================================================================================');
  console.log('⚔️  EMPIRICAL CHALLENGER: FINANCIAL, ACCOUNTING & CONCURRENCY HARNESS');
  console.log('================================================================================\n');

  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const vulnerabilities = [];

  function record(id, title, pass, details = {}) {
    totalTests++;
    if (pass) {
      passedTests++;
      console.log(`  ✅ [PASS] ${id}: ${title}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${id}: ${title}`);
      if (details.error) console.error(`     Error: ${details.error}`);
      if (details.actual) console.error(`     Actual:`, details.actual);
      if (details.expected) console.error(`     Expected:`, details.expected);
      vulnerabilities.push({ id, title, details });
    }
  }

  // ============================================================================
  // SUITE 1: CONCURRENCY STRESS ON SETTLEMENT (POST /invoices/:id/pay)
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SUITE 1: CONCURRENCY STRESS ON INVOICE SETTLEMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 1.1: 5 simultaneous full payments on 1,000,000 VND invoice
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const concurrentPayPromises = [1, 2, 3, 4, 5].map((i) =>
    request(`/invoices/${TEST_INVOICE_ID}/pay`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1000000 }],
        note: `Simultaneous full settlement burst ${i}`,
      },
    })
  );
  const concurrentPayResults = await Promise.all(concurrentPayPromises);

  const pay200s = concurrentPayResults.filter((r) => r.status === 200);
  const pay400s = concurrentPayResults.filter(
    (r) => r.status === 400 && r.data?.code === 'ERROR_0022_ALREADY_SETTLED'
  );
  const paymentsInDb = await Payment.findAll({ where: { InvoiceId: TEST_INVOICE_ID } });
  const invoiceAfterPay = await Invoice.findByPk(TEST_INVOICE_ID);

  record(
    'STRESS_1.1A',
    'Simultaneous full payments: Exactly 1 request succeeds (200 OK), 4 rejected with 400 ERROR_0022_ALREADY_SETTLED',
    pay200s.length === 1 && pay400s.length === 4,
    { actual: { successCount: pay200s.length, rejectedCount: pay400s.length, statuses: concurrentPayResults.map((r) => r.status) } }
  );

  record(
    'STRESS_1.1B',
    'Database integrity under concurrent settlement: Exactly 1 payment record created, Status is Paid',
    paymentsInDb.length === 1 &&
      Number(paymentsInDb[0].Amount) === 1000000 &&
      invoiceAfterPay.Status === 'Paid',
    { actual: { paymentCount: paymentsInDb.length, invoiceStatus: invoiceAfterPay?.Status } }
  );

  // Test 1.2: Concurrency on partial payments (4 requests of 300k on 1M invoice -> sum 1.2M > 1M)
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const partialPromises = [1, 2, 3, 4].map((i) =>
    request(`/invoices/${TEST_INVOICE_ID}/pay`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        tenders: [{ method: 'Card', amount: 300000, transactionCode: `BURST_CARD_${i}` }],
        note: `Partial concurrent burst ${i}`,
      },
    })
  );
  const partialResults = await Promise.all(partialPromises);
  const partial200s = partialResults.filter((r) => r.status === 200);
  const partial400s = partialResults.filter(
    (r) => r.status === 400 && r.data?.code === 'ERROR_0012_OUT_OF_RANGE'
  );
  const partialPaymentsInDb = await Payment.findAll({ where: { InvoiceId: TEST_INVOICE_ID } });
  const partialInvoice = await Invoice.findByPk(TEST_INVOICE_ID);

  record(
    'STRESS_1.2',
    'Pessimistic locking prevents partial overpayment: 3 requests of 300k succeed, 4th rejected (sum cannot exceed 1M)',
    partial200s.length === 3 && partial400s.length === 1 && partialPaymentsInDb.length === 3 && partialInvoice.Status === 'PartiallyPaid',
    {
      actual: {
        successCount: partial200s.length,
        rejectedCount: partial400s.length,
        dbPaymentCount: partialPaymentsInDb.length,
        invoiceStatus: partialInvoice?.Status,
      },
    }
  );

  // Test 1.3: Settlement on Cancelled invoice
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Cancelled', []);
  const resCancelled = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1000000 }],
    },
  });
  record(
    'STRESS_1.3',
    'Settlement rejected on Cancelled invoice (400 ERROR_0015_PRECONDITION_FAILED)',
    resCancelled.status === 400 && resCancelled.data?.code === 'ERROR_0015_PRECONDITION_FAILED',
    { actual: resCancelled.data }
  );

  // Test 1.4: Settlement on non-existent invoice
  const resNotFound = await request('/invoices/99999999/pay', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1000000 }],
    },
  });
  record(
    'STRESS_1.4',
    'Settlement rejected on non-existent invoiceId (404 ERROR_0011_NOT_FOUND)',
    resNotFound.status === 404 && resNotFound.data?.code === 'ERROR_0011_NOT_FOUND',
    { actual: resNotFound.data }
  );

  // ============================================================================
  // SUITE 2: MULTI-TENDER EDGE CASES & FINANCIAL ARITHMETIC
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SUITE 2: MULTI-TENDER EDGE CASES & FINANCIAL ARITHMETIC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 2.1: Exact cash settlement vs overpayment with change calculation
  await resetInvoice(TEST_INVOICE_ID, 500000, 'Unpaid', []);
  const resExactCash = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 500000 }],
    },
  });
  record(
    'STRESS_2.1A',
    'Exact cash tender: changeAmount = 0, status = Paid, outstandingBalance = 0',
    resExactCash.status === 200 &&
      resExactCash.data?.data?.changeAmount === 0 &&
      resExactCash.data?.data?.status === 'Paid' &&
      resExactCash.data?.data?.outstandingBalance === 0,
    { actual: resExactCash.data?.data }
  );

  await resetInvoice(TEST_INVOICE_ID, 500000, 'Unpaid', []);
  const resOverCash = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 750000 }],
    },
  });
  record(
    'STRESS_2.1B',
    'Overpayment in cash: changeAmount = 250,000, changeDue = 250,000, status = Paid',
    resOverCash.status === 200 &&
      resOverCash.data?.data?.changeAmount === 250000 &&
      resOverCash.data?.data?.changeDue === 250000 &&
      resOverCash.data?.data?.status === 'Paid',
    { actual: resOverCash.data?.data }
  );

  // Test 2.2: Under-payment rejection (customerCashGiven < amount)
  await resetInvoice(TEST_INVOICE_ID, 500000, 'Unpaid', []);
  const resUnderCash = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 499999 }],
    },
  });
  record(
    'STRESS_2.2',
    'Underpayment in cash (customerCashGiven < amount) rejected with 400 ERROR_0021_INSUFFICIENT_CASH',
    resUnderCash.status === 400 && resUnderCash.data?.code === 'ERROR_0021_INSUFFICIENT_CASH',
    { actual: resUnderCash.data }
  );

  // Test 2.3: Non-cash overpayment rejection
  await resetInvoice(TEST_INVOICE_ID, 400000, 'Unpaid', []);
  const resOverCard = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Card', amount: 400001, transactionCode: 'TXN_OVER_CARD' }],
    },
  });
  record(
    'STRESS_2.3',
    'Non-cash tender exceeding remaining balance rejected with 400 ERROR_0012_OUT_OF_RANGE',
    resOverCard.status === 400 && resOverCard.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: resOverCard.data }
  );

  // Test 2.4: Online tenders limit (>1 online tender)
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const resMultiOnline = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [
        { method: 'VietQR', amount: 500000 },
        { method: 'VNPay', amount: 500000 },
      ],
    },
  });
  record(
    'STRESS_2.4',
    'Multiple online tenders (VietQR + VNPay) rejected with 400 ERROR_0005_INVALID_VALUE',
    resMultiOnline.status === 400 && resMultiOnline.data?.code === 'ERROR_0005_INVALID_VALUE',
    { actual: resMultiOnline.data }
  );

  // Test 2.5: Invalid payment method
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const resInvalidMethod = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'CryptoCurrency', amount: 1000000 }],
    },
  });
  record(
    'STRESS_2.5',
    'Unsupported tender method (CryptoCurrency) rejected with 400 ERROR_0005_INVALID_VALUE',
    resInvalidMethod.status === 400 && resInvalidMethod.data?.code === 'ERROR_0005_INVALID_VALUE',
    { actual: resInvalidMethod.data }
  );

  // Test 2.6: Boundary payment amounts (<10,000 or >500,000,000)
  const resTooSmall = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 9999 }] },
  });
  const resTooLarge = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 500000001 }] },
  });
  record(
    'STRESS_2.6',
    'Amount boundaries (< 10,000 VND and > 500,000,000 VND) strictly guarded with 400 ERROR_0012_OUT_OF_RANGE',
    resTooSmall.status === 400 &&
      resTooSmall.data?.code === 'ERROR_0012_OUT_OF_RANGE' &&
      resTooLarge.status === 400 &&
      resTooLarge.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { small: resTooSmall.data, large: resTooLarge.data }
  );

  // Test 2.7A: Rejection of > 3 tenders (maximum 3 tenders allowed per settlement)
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const res4Tenders = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [
        { method: 'Cash', amount: 250000, customerCashGiven: 250000 },
        { method: 'Card', amount: 250000, transactionCode: 'TXN_4WAY_CARD' },
        { method: 'BankTransfer', amount: 250000, transactionCode: 'TXN_4WAY_XFER' },
        { method: 'VietQR', amount: 250000, transactionCode: 'TXN_4WAY_QR' },
      ],
      note: '4 tenders exceeding limit',
    },
  });
  record(
    'STRESS_2.7A',
    'Tender count limit: Exceeding 3 tenders is rejected with 400 ERROR_0005_INVALID_VALUE',
    res4Tenders.status === 400 && res4Tenders.data?.code === 'ERROR_0005_INVALID_VALUE',
    { actual: res4Tenders.data }
  );

  // Test 2.7B: Valid 3-way Split Tender (Cash + Card + VietQR)
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);
  const res3Way = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [
        { method: 'Cash', amount: 400000, customerCashGiven: 500000 },
        { method: 'Card', amount: 300000, transactionCode: 'TXN_3WAY_CARD' },
        { method: 'VietQR', amount: 300000, transactionCode: 'TXN_3WAY_QR' },
      ],
      note: '3-way split tender check',
    },
  });
  const threeWayPayments = await Payment.findAll({ where: { InvoiceId: TEST_INVOICE_ID } });
  const pendingTenders = threeWayPayments.filter((p) => p.Status === 'Pending');
  const paidTenders = threeWayPayments.filter((p) => p.Status === 'Paid');

  record(
    'STRESS_2.7B',
    'Valid 3-way split tender (Cash + Card + VietQR): 3 payments created, change is 100,000, status PartiallyPaid due to pending VietQR',
    res3Way.status === 200 &&
      res3Way.data?.data?.changeAmount === 100000 &&
      threeWayPayments.length === 3 &&
      pendingTenders.length === 1 &&
      paidTenders.length === 2 &&
      res3Way.data?.data?.status === 'PartiallyPaid' &&
      res3Way.data?.data?.readyToCloseFolio === false,
    { actual: res3Way.data?.data, paymentCount: threeWayPayments.length }
  );

  // ============================================================================
  // SUITE 3: REFUND INTEGRITY & BALANCE CALCULATION (C5 & C10)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SUITE 3: REFUND INTEGRITY & BALANCE CALCULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 3.1: Partial refund calculation & invoice status transition to PartiallyPaid
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Paid', [
    { amount: 1000000, method: 'Cash', status: 'Paid' },
  ]);
  const paymentToRefund = await Payment.findOne({ where: { InvoiceId: TEST_INVOICE_ID } });

  const resPartialRefund = await request(`/payments/${paymentToRefund.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      refundReason: 'Customer checked out early on day 2',
      refundAmount: 300000,
    },
  });

  const paymentAfterPartial = await Payment.findByPk(paymentToRefund.PaymentId);
  const invoiceAfterPartial = await Invoice.findByPk(TEST_INVOICE_ID);

  record(
    'STRESS_3.1',
    'Partial refund (300k of 1M): Payment.RefundAmount = 300k, Invoice transitions to PartiallyPaid (NOT Cancelled)',
    resPartialRefund.status === 200 &&
      Number(paymentAfterPartial.RefundAmount) === 300000 &&
      paymentAfterPartial.Status === 'Refunded' &&
      invoiceAfterPartial.Status === 'PartiallyPaid' &&
      invoiceAfterPartial.PdfPath === null,
    {
      payment: { status: paymentAfterPartial?.Status, refundAmount: paymentAfterPartial?.RefundAmount },
      invoice: { status: invoiceAfterPartial?.Status, pdfPath: invoiceAfterPartial?.PdfPath },
    }
  );

  // Test 3.2: Re-settlement of remaining balance after partial refund
  const resReSettle = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Card', amount: 300000, transactionCode: 'TXN_RE_SETTLE' }],
      note: 'Re-settle remaining 300k',
    },
  });
  const invoiceAfterReSettle = await Invoice.findByPk(TEST_INVOICE_ID);
  record(
    'STRESS_3.2',
    'PartiallyPaid invoice accepts re-settlement of exact refunded deficit (300k) and returns to Paid',
    resReSettle.status === 200 &&
      resReSettle.data?.data?.status === 'Paid' &&
      invoiceAfterReSettle.Status === 'Paid',
    { res: resReSettle.data?.data, invoiceStatus: invoiceAfterReSettle?.Status }
  );

  // Test 3.3: Full refund transitions invoice to Cancelled
  await resetInvoice(TEST_INVOICE_ID, 500000, 'Paid', [
    { amount: 500000, method: 'Cash', status: 'Paid' },
  ]);
  const pFullRefund = await Payment.findOne({ where: { InvoiceId: TEST_INVOICE_ID } });
  const resFullRefund = await request(`/payments/${pFullRefund.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      refundReason: 'Customer cancelled booking completely',
      refundAmount: 500000,
    },
  });
  const invoiceAfterFull = await Invoice.findByPk(TEST_INVOICE_ID);
  record(
    'STRESS_3.3',
    'Full refund (net paid = 0) transitions Invoice.Status to Cancelled',
    resFullRefund.status === 200 && invoiceAfterFull.Status === 'Cancelled',
    { invoiceStatus: invoiceAfterFull?.Status }
  );

  // Test 3.4: Over-refund rejection (refundAmount > payment.Amount)
  await resetInvoice(TEST_INVOICE_ID, 500000, 'Paid', [
    { amount: 500000, method: 'Cash', status: 'Paid' },
  ]);
  const pOver = await Payment.findOne({ where: { InvoiceId: TEST_INVOICE_ID } });
  const resOverRefund = await request(`/payments/${pOver.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      refundReason: 'Attempt over refund',
      refundAmount: 500001,
    },
  });
  record(
    'STRESS_3.4',
    'Over-refund (refundAmount > payment.Amount) rejected with 400 ERROR_0012_OUT_OF_RANGE',
    resOverRefund.status === 400 && resOverRefund.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: resOverRefund.data }
  );

  // Test 3.5A: Negative refund amount rejection
  const resNegRefund = await request(`/payments/${pOver.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: 'Negative refund amount', refundAmount: -50000 },
  });
  record(
    'STRESS_3.5A',
    'Negative refund amount rejected with 400 ERROR_0012_OUT_OF_RANGE',
    resNegRefund.status === 400 && resNegRefund.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: resNegRefund.data }
  );

  // Test 3.5B: Zero refund amount edge case (falsy zero vulnerability)
  // When caller explicitly specifies refundAmount: 0, it must be rejected with 400, NOT silently refund 100%!
  const pFreshZero = await Payment.create({
    InvoiceId: TEST_INVOICE_ID,
    Amount: 500000,
    PaymentMethod: 'Cash',
    PaymentDate: new Date(),
    TransactionCode: `TXN-ZERO-CHECK-${Date.now()}`,
    Status: 'Paid',
  });
  const resZeroRefund = await request(`/payments/${pFreshZero.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: 'Zero amount refund attempt', refundAmount: 0 },
  });
  const pAfterZero = await Payment.findByPk(pFreshZero.PaymentId);
  await Payment.destroy({ where: { PaymentId: pFreshZero.PaymentId } });

  const zeroRefundRejected =
    resZeroRefund.status === 400 && resZeroRefund.data?.code === 'ERROR_0012_OUT_OF_RANGE';
  record(
    'STRESS_3.5B',
    'Explicit zero refundAmount (0 VND) must be rejected with 400 ERROR_0012_OUT_OF_RANGE (not treat 0 as falsy full refund)',
    zeroRefundRejected,
    {
      actual: {
        status: resZeroRefund.status,
        data: resZeroRefund.data,
        paymentStatusInDb: pAfterZero?.Status,
        refundAmountInDb: pAfterZero?.RefundAmount,
      },
      vulnerabilityNote: !zeroRefundRejected
        ? `DEFECT: refundAmount: 0 evaluated as falsy; backend silently refunded full ${pAfterZero?.RefundAmount} VND!`
        : null,
    }
  );

  // Test 3.6: Refund reason length validation (<2 chars or empty) on fresh Paid payment
  const pFreshReason = await Payment.create({
    InvoiceId: TEST_INVOICE_ID,
    Amount: 300000,
    PaymentMethod: 'Cash',
    PaymentDate: new Date(),
    TransactionCode: `TXN-REASON-CHECK-${Date.now()}`,
    Status: 'Paid',
  });
  const resEmptyReason = await request(`/payments/${pFreshReason.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: '', refundAmount: 100000 },
  });
  const resShortReason = await request(`/payments/${pFreshReason.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: 'x', refundAmount: 100000 },
  });
  await Payment.destroy({ where: { PaymentId: pFreshReason.PaymentId } });

  record(
    'STRESS_3.6',
    'Refund reason length validation: empty reason -> ERROR_0001_REQUIRED, length < 2 -> ERROR_0002_MIN_LENGTH',
    resEmptyReason.status === 400 &&
      resEmptyReason.data?.code === 'ERROR_0001_REQUIRED' &&
      resShortReason.status === 400 &&
      resShortReason.data?.code === 'ERROR_0002_MIN_LENGTH',
    { empty: resEmptyReason.data, short: resShortReason.data }
  );

  // Test 3.7: Sequential duplicate refund on already refunded payment
  await resetInvoice(TEST_INVOICE_ID, 500000, 'Paid', [
    { amount: 500000, method: 'Cash', status: 'Paid' },
  ]);
  const pDupCheck = await Payment.findOne({ where: { InvoiceId: TEST_INVOICE_ID } });
  await request(`/payments/${pDupCheck.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: 'Initial refund', refundAmount: 100000 },
  });
  const resDupRefund = await request(`/payments/${pDupCheck.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { refundReason: 'Second refund attempt', refundAmount: 100000 },
  });
  record(
    'STRESS_3.7',
    'Sequential duplicate refund on already refunded payment rejected with 400 ERROR_0013_INVALID_STATE_TRANSITION',
    resDupRefund.status === 400 && resDupRefund.data?.code === 'ERROR_0013_INVALID_STATE_TRANSITION',
    { actual: resDupRefund.data }
  );

  // Test 3.8: CONCURRENT REFUND RACE CONDITION HARNESS
  // Adversarial challenge: 2 simultaneous refund requests on the SAME Paid payment
  const pConcurrent = await Payment.create({
    InvoiceId: TEST_INVOICE_ID,
    Amount: 400000,
    PaymentMethod: 'Cash',
    PaymentDate: new Date(),
    TransactionCode: `TXN-CONC-REFUND-${Date.now()}`,
    Status: 'Paid',
  });

  const concurrentRefundPromises = [1, 2].map((i) =>
    request(`/payments/${pConcurrent.PaymentId}/refund`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: {
        refundReason: `Concurrent refund test worker ${i}`,
        refundAmount: 200000,
      },
    })
  );
  const concurrentRefundResults = await Promise.all(concurrentRefundPromises);
  const refund200Count = concurrentRefundResults.filter((r) => r.status === 200).length;
  await Payment.destroy({ where: { PaymentId: pConcurrent.PaymentId } });

  // A race-free implementation MUST accept only 1 refund and reject the other!
  record(
    'STRESS_3.8',
    'Concurrent Refund Race Condition: Exactly 1 request succeeds (200), 2nd rejected (preventing double-refund)',
    refund200Count === 1,
    {
      actual: {
        successCount: refund200Count,
        statuses: concurrentRefundResults.map((r) => r.status),
        messages: concurrentRefundResults.map((r) => r.data?.message || r.data?.code),
      },
      expected: { successCount: 1, rejectedCount: 1 },
      vulnerabilityNote:
        refund200Count > 1
          ? 'CRITICAL DEFECT: Payment.findByPk lacks pessimistic lock (lock: transaction.LOCK.UPDATE). Both concurrent requests succeeded!'
          : null,
    }
  );

  // ============================================================================
  // SUITE 4: MASTER INVOICE IDEMPOTENCY & CONCURRENCY (C7)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SUITE 4: MASTER INVOICE GENERATION IDEMPOTENCY & CONCURRENCY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test 4.1: Duplicate call on booking with existing invoice
  const resDupMaster = await request('/invoices/master', {
    method: 'POST',
    headers: adminHeaders,
    body: { bookingId: 1, bypassCheckOutRule: true },
  });
  record(
    'STRESS_4.1',
    'Sequential duplicate Master Invoice creation rejected with 409 ERROR_0017_ALREADY_EXISTS',
    resDupMaster.status === 409 &&
      resDupMaster.data?.code === 'ERROR_0017_ALREADY_EXISTS' &&
      resDupMaster.data?.existingInvoiceId !== undefined,
    { actual: resDupMaster.data }
  );

  // Test 4.2: Missing & non-existent bookingId validation
  const resNoBooking = await request('/invoices/master', {
    method: 'POST',
    headers: adminHeaders,
    body: {},
  });
  const resNonExistentBooking = await request('/invoices/master', {
    method: 'POST',
    headers: adminHeaders,
    body: { bookingId: 99999999 },
  });
  record(
    'STRESS_4.2',
    'Booking validation: missing bookingId -> 400 ERROR_0001_REQUIRED, non-existent -> 404 ERROR_0011_NOT_FOUND',
    resNoBooking.status === 400 &&
      resNoBooking.data?.code === 'ERROR_0001_REQUIRED' &&
      resNonExistentBooking.status === 404 &&
      resNonExistentBooking.data?.code === 'ERROR_0011_NOT_FOUND',
    { missing: resNoBooking.data, nonExistent: resNonExistentBooking.data }
  );

  // Test 4.3: Manual adjustments validation (empty desc, invalid type) on fresh booking without invoice
  const { booking: adjBooking } = await createTemporaryBookingWithStay();
  const resEmptyDescAdj = await request('/invoices/master', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      bookingId: adjBooking.BookingId,
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: '', amount: 100000, itemType: 'Surcharge' }],
    },
  });
  const resInvalidTypeAdj = await request('/invoices/master', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      bookingId: adjBooking.BookingId,
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: 'Valid desc', amount: 100000, itemType: 'IllegalType' }],
    },
  });
  await cleanupTemporaryBooking(adjBooking.BookingId);

  record(
    'STRESS_4.3',
    'Manual adjustments validation: empty desc -> 400 ERROR_0001_REQUIRED, invalid type -> 400 ERROR_0005_INVALID_VALUE',
    resEmptyDescAdj.status === 400 &&
      resEmptyDescAdj.data?.code === 'ERROR_0001_REQUIRED' &&
      resInvalidTypeAdj.status === 400 &&
      resInvalidTypeAdj.data?.code === 'ERROR_0005_INVALID_VALUE',
    { emptyDesc: resEmptyDescAdj.data, invalidType: resInvalidTypeAdj.data }
  );

  // Test 4.4: CONCURRENT MASTER INVOICE CREATION RACE CONDITION HARNESS
  // Adversarial challenge: 5 simultaneous requests calling POST /invoices/master on a fresh booking
  const { booking: tempBooking } = await createTemporaryBookingWithStay();
  const concurrentMasterPromises = [1, 2, 3, 4, 5].map(() =>
    request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: tempBooking.BookingId,
        vatRate: 10,
        bypassCheckOutRule: true,
      },
    })
  );
  const concurrentMasterResults = await Promise.all(concurrentMasterPromises);
  const master201s = concurrentMasterResults.filter((r) => r.status === 201);
  const master409s = concurrentMasterResults.filter((r) => r.status === 409);
  const invoicesCreatedInDb = await Invoice.findAll({ where: { BookingId: tempBooking.BookingId } });

  await cleanupTemporaryBooking(tempBooking.BookingId);

  record(
    'STRESS_4.4',
    'Concurrent Master Invoice Creation Race: Exactly 1 invoice created in DB, 4 requests return 409 Conflict',
    invoicesCreatedInDb.length === 1 && master201s.length === 1 && master409s.length === 4,
    {
      actual: {
        dbInvoiceCount: invoicesCreatedInDb.length,
        created201Count: master201s.length,
        conflict409Count: master409s.length,
        statuses: concurrentMasterResults.map((r) => r.status),
      },
      expected: { dbInvoiceCount: 1, created201Count: 1, conflict409Count: 4 },
      vulnerabilityNote:
        invoicesCreatedInDb.length > 1
          ? `CRITICAL DEFECT: ${invoicesCreatedInDb.length} duplicate master invoices created for booking #${tempBooking.BookingId} under concurrent burst!`
          : null,
    }
  );

  // ============================================================================
  // SUITE 5: PDF GENERATION STREAM & CACHE LIFECYCLE (C8)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 SUITE 5: PDF GENERATION STREAM & CACHE LIFECYCLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);

  // Test 5.1: PDF Binary Stream integrity & Magic signature
  const resPdfInline = await request(`/invoices/${TEST_INVOICE_ID}/pdf`, {
    headers: adminHeaders,
  });
  const pdfHeader = resPdfInline.rawBuffer ? resPdfInline.rawBuffer.slice(0, 5).toString('utf-8') : '';
  const isPdfBinary = pdfHeader === '%PDF-';
  const hasContentType = resPdfInline.contentType.includes('application/pdf');
  const hasInlineHeader = (resPdfInline.headers['content-disposition'] || '').includes('inline');

  record(
    'STRESS_5.1',
    'Dynamic PDF binary stream: Content-Type application/pdf, signature %PDF-, Content-Disposition inline',
    resPdfInline.status === 200 && isPdfBinary && hasContentType && hasInlineHeader,
    {
      status: resPdfInline.status,
      contentType: resPdfInline.contentType,
      header: pdfHeader,
      disposition: resPdfInline.headers['content-disposition'],
      size: resPdfInline.rawBuffer?.length,
    }
  );

  // Test 5.2: Download mode Content-Disposition
  const resPdfDownload = await request(`/invoices/${TEST_INVOICE_ID}/pdf?mode=download`, {
    headers: adminHeaders,
  });
  const hasAttachmentHeader = (resPdfDownload.headers['content-disposition'] || '').includes('attachment');
  record(
    'STRESS_5.2',
    'Download mode (mode=download): Content-Disposition contains attachment; filename="INV-..."',
    resPdfDownload.status === 200 && hasAttachmentHeader,
    { disposition: resPdfDownload.headers['content-disposition'] }
  );

  // Test 5.3: Disk caching verification
  const invoiceWithCache = await Invoice.findByPk(TEST_INVOICE_ID);
  const diskCacheExists = invoiceWithCache.PdfPath !== null;
  const resPdfInfo = await request(`/invoices/${TEST_INVOICE_ID}/pdf-info`, {
    headers: adminHeaders,
  });
  const cachedPdfSize = resPdfInline.rawBuffer?.length;

  const resPdfCached = await request(`/invoices/${TEST_INVOICE_ID}/pdf`, {
    headers: adminHeaders,
  });
  const identicalCache = resPdfCached.rawBuffer?.length === cachedPdfSize;

  record(
    'STRESS_5.3',
    'Disk caching lifecycle: Invoice.PdfPath populated, pdf-info returns pdfAvailable: true, repeated fetch returns identical cache',
    diskCacheExists &&
      resPdfInfo.status === 200 &&
      resPdfInfo.data?.data?.pdfAvailable === true &&
      identicalCache,
    {
      pdfPath: invoiceWithCache.PdfPath,
      pdfAvailable: resPdfInfo.data?.data?.pdfAvailable,
      sizeInitial: cachedPdfSize,
      sizeCached: resPdfCached.rawBuffer?.length,
    }
  );

  // Test 5.4: Cache invalidation on Settlement
  // Paying the invoice must invalidate PdfPath and physically remove disk cache so next PDF shows payment
  const resSettleForCache = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1000000 }],
    },
  });
  const invoiceAfterSettleCache = await Invoice.findByPk(TEST_INVOICE_ID);
  const pdfPathCleared = invoiceAfterSettleCache.PdfPath === null;

  record(
    'STRESS_5.4',
    'Cache invalidation on Settlement: POST /invoices/:id/pay clears Invoice.PdfPath to null',
    resSettleForCache.status === 200 && pdfPathCleared,
    { pdfPath: invoiceAfterSettleCache.PdfPath, invoiceStatus: invoiceAfterSettleCache.Status }
  );

  // Test 5.5: Dynamic re-generation with updated payment details
  const resPdfRegenerated = await request(`/invoices/${TEST_INVOICE_ID}/pdf`, {
    headers: adminHeaders,
  });
  const regenHeader = resPdfRegenerated.rawBuffer
    ? resPdfRegenerated.rawBuffer.slice(0, 5).toString('utf-8')
    : '';
  const invoiceAfterRegen = await Invoice.findByPk(TEST_INVOICE_ID);

  record(
    'STRESS_5.5',
    'Subsequent PDF request regenerates fresh binary and repopulates cache with settled status',
    resPdfRegenerated.status === 200 &&
      regenHeader === '%PDF-' &&
      invoiceAfterRegen.PdfPath !== null,
    { newPdfPath: invoiceAfterRegen.PdfPath, newSize: resPdfRegenerated.rawBuffer?.length }
  );

  // Test 5.6: Cache invalidation on Refund
  const payToRefund = await Payment.findOne({ where: { InvoiceId: TEST_INVOICE_ID } });
  const resRefundForCache = await request(`/payments/${payToRefund.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      refundReason: 'Cache invalidation test refund',
      refundAmount: 500000,
    },
  });
  const invoiceAfterRefundCache = await Invoice.findByPk(TEST_INVOICE_ID);

  record(
    'STRESS_5.6',
    'Cache invalidation on Refund: PATCH /payments/:id/refund clears Invoice.PdfPath to null',
    resRefundForCache.status === 200 && invoiceAfterRefundCache.PdfPath === null,
    { pdfPath: invoiceAfterRefundCache.PdfPath, invoiceStatus: invoiceAfterRefundCache.Status }
  );

  // ============================================================================
  // SUMMARY & VERDICT
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 HARNESS EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`  Total Checks:    ${totalTests}`);
  console.log(`  Passed:          ${passedTests}`);
  console.log(`  Failed:          ${failedTests}`);
  console.log(`  Vulnerabilities: ${vulnerabilities.length}`);
  if (vulnerabilities.length > 0) {
    console.log('\n🚨 DETECTED VULNERABILITIES:');
    vulnerabilities.forEach((v, idx) => {
      console.log(`  ${idx + 1}. [${v.id}] ${v.title}`);
      if (v.details.vulnerabilityNote) {
        console.log(`     ⚠️  ${v.details.vulnerabilityNote}`);
      }
    });
  }
  console.log('================================================================================\n');

  return { totalTests, passedTests, failedTests, vulnerabilities };
}

if (require.main === module) {
  runOrch3FinancialStressHarness()
    .then((summary) => {
      process.exit(summary.failedTests > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal harness error:', err);
      process.exit(1);
    });
}

module.exports = { runOrch3FinancialStressHarness };
