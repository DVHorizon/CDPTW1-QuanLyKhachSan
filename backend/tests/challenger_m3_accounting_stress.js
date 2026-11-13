'use strict';

/**
 * challenger_m3_accounting_stress.js
 * EMPIRICAL CHALLENGER ADVERSARIAL STRESS TEST HARNESS FOR MILESTONE 3 (M3)
 * Target Features: C9 (Multi-Tender Settlement), C10 (Ledger & Audit), C5 (Refund & Reversal)
 *
 * Test Scenarios:
 * 1. Stress Test 1: Bẫy thanh toán trên hóa đơn đã Paid (Settlement Trap on Paid Invoice)
 * 2. Stress Test 2: Thanh toán một phần (Partial Payment State & readyToCloseFolio)
 * 3. Stress Test 3: Hoàn tiền một phần (C5 Partial Refund -> PartiallyPaid, NOT Cancelled)
 * 4. Stress Test 4: Phương thức phi tiền mặt vượt quá số dư (Non-Cash Overpayment Rejection)
 * 5. Stress Test 5: Số tiền bất hợp lệ (<10k, >500M, âm, NaN)
 */

const assert = require('assert');
const { request } = require('./e2e_services_c1_c14/helpers/apiClient');
const { getAuthContext } = require('./e2e_services_c1_c14/helpers/authHelper');
const { sequelize, Invoice, Payment } = require('../src/models');

const TEST_INVOICE_ID = 1;

/**
 * Reset test invoice state directly in database
 */
async function resetInvoice(invoiceId, totalAmount, status = 'Unpaid', paymentsToCreate = []) {
  await Payment.destroy({ where: { InvoiceId: invoiceId } });
  await Invoice.update(
    {
      TotalAmount: totalAmount,
      Subtotal: totalAmount,
      Status: status,
      PdfPath: null,
    },
    { where: { InvoiceId: invoiceId } }
  );

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

async function runAdversarialHarness() {
  console.log('================================================================================');
  console.log('⚔️  EMPIRICAL CHALLENGER: M3 ACCOUNTING ADVERSARIAL STRESS TEST HARNESS');
  console.log('================================================================================\n');

  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const results = [];

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
    }
    results.push({ id, title, pass, details });
  }

  // ============================================================================
  // STRESS TEST 1: BẪY THANH TOÁN TRÊN HÓA ĐƠN ĐÃ PAID
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 STRESS TEST 1: BẪY THANH TOÁN TRÊN HÓA ĐƠN ĐÃ PAID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup: Invoice 1 is Paid, TotalAmount: 1.000.000, 1 existing payment of 1.000.000
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Paid', [
    { amount: 1000000, method: 'Cash', status: 'Paid' },
  ]);

  const initialPaymentCount = await Payment.count({ where: { InvoiceId: TEST_INVOICE_ID } });

  // 1A: Request có note: "Khách tip thêm"
  const res1A = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 500000 }],
      note: 'Khách tip thêm',
    },
  });
  record(
    'STRESS_1A',
    'Chặn thanh toán trên hóa đơn Paid khi có note tip thêm -> 400 ERROR_0022_ALREADY_SETTLED',
    res1A.status === 400 && res1A.data?.code === 'ERROR_0022_ALREADY_SETTLED',
    { actual: { status: res1A.status, code: res1A.data?.code }, expected: { status: 400, code: 'ERROR_0022_ALREADY_SETTLED' } }
  );

  // 1B: Request có customerCashGiven lớn hơn amount kèm note
  const res1B = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 1000000 }],
      note: 'Khách gửi thêm tiền tip qua tiền mặt thừa',
    },
  });
  record(
    'STRESS_1B',
    'Chặn thanh toán trên hóa đơn Paid khi có customerCashGiven dư thừa -> 400 ERROR_0022_ALREADY_SETTLED',
    res1B.status === 400 && res1B.data?.code === 'ERROR_0022_ALREADY_SETTLED',
    { actual: { status: res1B.status, code: res1B.data?.code }, expected: { status: 400, code: 'ERROR_0022_ALREADY_SETTLED' } }
  );

  // 1C: Request có nhiều tenders (Cash + Card) kèm note
  const res1C = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [
        { method: 'Cash', amount: 200000, customerCashGiven: 200000 },
        { method: 'Card', amount: 300000, transactionCode: 'TXN_STRESS_TIP_CARD' },
      ],
      note: 'Tip thêm bằng 2 phương thức',
    },
  });
  record(
    'STRESS_1C',
    'Chặn thanh toán trên hóa đơn Paid khi có nhiều tenders (split) -> 400 ERROR_0022_ALREADY_SETTLED',
    res1C.status === 400 && res1C.data?.code === 'ERROR_0022_ALREADY_SETTLED',
    { actual: { status: res1C.status, code: res1C.data?.code }, expected: { status: 400, code: 'ERROR_0022_ALREADY_SETTLED' } }
  );

  // 1D: Kiểm tra toàn vẹn CSDL: Không có giao dịch mồ côi nào được tạo
  const postPaymentCount = await Payment.count({ where: { InvoiceId: TEST_INVOICE_ID } });
  const invoiceDb1 = await Invoice.findByPk(TEST_INVOICE_ID);
  record(
    'STRESS_1D',
    'Cơ sở dữ liệu không bị ghi nhận thêm Payment mồ côi và Invoice vẫn giữ Paid',
    postPaymentCount === initialPaymentCount && invoiceDb1.Status === 'Paid',
    { actual: { count: postPaymentCount, status: invoiceDb1.Status }, expected: { count: initialPaymentCount, status: 'Paid' } }
  );

  // ============================================================================
  // STRESS TEST 2: THANH TOÁN MỘT PHẦN (PARTIAL PAYMENT)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 STRESS TEST 2: THANH TOÁN MỘT PHẦN (PARTIALLY PAID & READY TO CLOSE FOLIO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup: Hóa đơn 1.000.000 VND, trạng thái Unpaid
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);

  // Gửi thanh toán 200.000 VND
  const res2A = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 200000, customerCashGiven: 200000 }],
      note: 'Thanh toán đợt 1 200.000 VND',
    },
  });

  const is2APartial =
    res2A.status === 200 &&
    res2A.data?.data?.status === 'PartiallyPaid' &&
    res2A.data?.data?.readyToCloseFolio === false &&
    (res2A.data?.data?.paidAmount === 200000 || res2A.data?.data?.alreadyPaid === 200000) &&
    (res2A.data?.data?.outstandingBalance === 800000 || res2A.data?.data?.outstandingAmount === 800000);

  record(
    'STRESS_2A',
    'Thanh toán 200.000 VND trên hóa đơn 1.000.000 VND -> PartiallyPaid & readyToCloseFolio: false',
    is2APartial,
    { actual: res2A.data?.data, expected: { status: 'PartiallyPaid', readyToCloseFolio: false, paidAmount: 200000, outstandingBalance: 800000 } }
  );

  // Kiểm tra CSDL sau đợt 1
  const invoiceDb2A = await Invoice.findByPk(TEST_INVOICE_ID);
  record(
    'STRESS_2B',
    'Cơ sở dữ liệu cập nhật chính xác Invoice.Status = PartiallyPaid',
    invoiceDb2A.Status === 'PartiallyPaid',
    { actual: invoiceDb2A.Status, expected: 'PartiallyPaid' }
  );

  // Thanh toán tiếp đợt 2: 300.000 VND qua Card
  const res2C = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Card', amount: 300000, transactionCode: 'TXN_STRESS_CARD_2' }],
      note: 'Thanh toán đợt 2 300.000 VND qua thẻ',
    },
  });

  const is2CPartial =
    res2C.status === 200 &&
    res2C.data?.data?.status === 'PartiallyPaid' &&
    res2C.data?.data?.readyToCloseFolio === false &&
    (res2C.data?.data?.paidAmount === 500000 || res2C.data?.data?.alreadyPaid === 500000) &&
    (res2C.data?.data?.outstandingBalance === 500000 || res2C.data?.data?.outstandingAmount === 500000);

  record(
    'STRESS_2C',
    'Thanh toán đợt 2 300.000 VND (tổng 500k/1M) -> Vẫn PartiallyPaid & readyToCloseFolio: false',
    is2CPartial,
    { actual: res2C.data?.data, expected: { status: 'PartiallyPaid', readyToCloseFolio: false, paidAmount: 500000, outstandingBalance: 500000 } }
  );

  // Thanh toán nốt đợt 3: 500.000 VND
  const res2D = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 500000 }],
      note: 'Thanh toán đợt cuối chốt hóa đơn',
    },
  });

  const is2DFinal =
    res2D.status === 200 &&
    res2D.data?.data?.status === 'Paid' &&
    res2D.data?.data?.readyToCloseFolio === true &&
    (res2D.data?.data?.paidAmount === 1000000 || res2D.data?.data?.alreadyPaid === 1000000) &&
    (res2D.data?.data?.outstandingBalance === 0 || res2D.data?.data?.outstandingAmount === 0);

  record(
    'STRESS_2D',
    'Thanh toán đợt 3 đủ 500.000 VND -> Chuyển sang Paid & readyToCloseFolio: true',
    is2DFinal,
    { actual: res2D.data?.data, expected: { status: 'Paid', readyToCloseFolio: true, alreadyPaid: 1000000, outstanding: 0 } }
  );

  // ============================================================================
  // STRESS TEST 3: HOÀN TIỀN MỘT PHẦN (C5 REFUND)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 STRESS TEST 3: HOÀN TIỀN MỘT PHẦN (C5 REFUND -> PARTIALLY PAID, NOT CANCELLED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup: Hóa đơn 1.000.000 VND đã Paid với 1 payment 1.000.000 VND
  const payments3 = await resetInvoice(TEST_INVOICE_ID, 1000000, 'Paid', [
    { amount: 1000000, method: 'Cash', status: 'Paid' },
  ]);
  const paymentToRefund = payments3[0];

  // Hoàn tiền 200.000 VND trên payment 1.000.000 VND
  const res3A = await request(`/payments/${paymentToRefund.PaymentId}/refund`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      refundAmount: 200000,
      refundReason: 'Dịch vụ giặt ủi bị lỗi nên hoàn một phần tiền',
    },
  });

  record(
    'STRESS_3A',
    'API hoàn tiền C5 trả về HTTP 200 thành công',
    res3A.status === 200 && res3A.data?.success === true,
    { actual: { status: res3A.status, data: res3A.data }, expected: { status: 200, success: true } }
  );

  // Kiểm tra CSDL: Payment trạng thái Refunded, RefundAmount 200.000
  const paymentDb3 = await Payment.findByPk(paymentToRefund.PaymentId);
  record(
    'STRESS_3B',
    'Payment record được cập nhật Status = Refunded và RefundAmount = 200.000',
    paymentDb3.Status === 'Refunded' && Number(paymentDb3.RefundAmount) === 200000,
    { actual: { status: paymentDb3.Status, refundAmount: paymentDb3.RefundAmount }, expected: { status: 'Refunded', refundAmount: 200000 } }
  );

  // Kiểm tra CSDL: Invoice.Status BẮT BUỘC phải là 'PartiallyPaid', TUYỆT ĐỐI không phải 'Cancelled'
  const invoiceDb3 = await Invoice.findByPk(TEST_INVOICE_ID);
  const isInvoicePartiallyPaid = invoiceDb3.Status === 'PartiallyPaid';
  const isNotCancelled = invoiceDb3.Status !== 'Cancelled';

  record(
    'STRESS_3C',
    'Hóa đơn chuyển về PartiallyPaid sau khi hoàn 200k/1M (TUYỆT ĐỐI KHÔNG BỊ CANCELLED)',
    isInvoicePartiallyPaid && isNotCancelled,
    { actual: invoiceDb3.Status, expected: 'PartiallyPaid (NOT Cancelled)' }
  );

  // Thử thanh toán bổ sung khoản hoàn 200.000 VND để kiểm chứng tính toàn vẹn vòng đời
  const res3D = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 200000, customerCashGiven: 200000 }],
      note: 'Thanh toán bù 200.000 VND sau hoàn tiền',
    },
  });
  record(
    'STRESS_3D',
    'Hóa đơn PartiallyPaid sau hoàn tiền chấp nhận thanh toán tiếp 200k và trở về Paid',
    res3D.status === 200 && res3D.data?.data?.status === 'Paid',
    { actual: { status: res3D.status, invoiceStatus: res3D.data?.data?.status }, expected: { status: 200, invoiceStatus: 'Paid' } }
  );

  // ============================================================================
  // STRESS TEST 4: PHƯƠNG THỨC PHI TIỀN MẶT VƯỢT QUÁ SỐ DƯ
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 STRESS TEST 4: PHƯƠNG THỨC PHI TIỀN MẶT VƯỢT QUÁ SỐ DƯ CÒN LẠI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup: Hóa đơn 1.000.000 VND, đã thanh toán 600.000 VND (Số dư còn lại = 400.000 VND)
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'PartiallyPaid', [
    { amount: 600000, method: 'Cash', status: 'Paid' },
  ]);

  // 4A: Thẻ Card vượt quá số dư 400.000 (gửi 400.001 VND)
  const res4A = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Card', amount: 400001, transactionCode: 'TXN_OVER_CARD_1' }],
    },
  });
  record(
    'STRESS_4A',
    'Card vượt quá số dư (400.001 > 400.000) -> 400 ERROR_0012_OUT_OF_RANGE',
    res4A.status === 400 && res4A.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: { status: res4A.status, code: res4A.data?.code, msg: res4A.data?.message }, expected: { status: 400, code: 'ERROR_0012_OUT_OF_RANGE' } }
  );

  // 4B: VietQR vượt quá số dư (gửi 500.000 VND)
  const res4B = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'VietQR', amount: 500000, transactionCode: 'TXN_OVER_QR_1' }],
    },
  });
  record(
    'STRESS_4B',
    'VietQR vượt quá số dư (500.000 > 400.000) -> 400 ERROR_0012_OUT_OF_RANGE',
    res4B.status === 400 && res4B.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: { status: res4B.status, code: res4B.data?.code, msg: res4B.data?.message }, expected: { status: 400, code: 'ERROR_0012_OUT_OF_RANGE' } }
  );

  // 4C: Chuyển khoản (Transfer) vượt quá số dư (gửi 800.000 VND)
  const res4C = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Transfer', amount: 800000, transactionCode: 'TXN_OVER_TF_1' }],
    },
  });
  record(
    'STRESS_4C',
    'Transfer vượt quá số dư (800.000 > 400.000) -> 400 ERROR_0012_OUT_OF_RANGE',
    res4C.status === 400 && res4C.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: { status: res4C.status, code: res4C.data?.code, msg: res4C.data?.message }, expected: { status: 400, code: 'ERROR_0012_OUT_OF_RANGE' } }
  );

  // 4D: Split tender: Cash 100.000 + Card 450.000 (Card 450k > remaining 400k)
  const res4D = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [
        { method: 'Cash', amount: 100000, customerCashGiven: 100000 },
        { method: 'Card', amount: 450000, transactionCode: 'TXN_OVER_SPLIT_1' },
      ],
    },
  });
  record(
    'STRESS_4D',
    'Split tender có phương thức phi tiền mặt vượt số dư (Card 450k > 400k) -> 400 ERROR_0012_OUT_OF_RANGE',
    res4D.status === 400 && res4D.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: { status: res4D.status, code: res4D.data?.code, msg: res4D.data?.message }, expected: { status: 400, code: 'ERROR_0012_OUT_OF_RANGE' } }
  );

  // 4E: Kiểm tra tender phi tiền mặt đúng bằng số dư 400.000 VND -> Phải được chấp nhận!
  const res4E = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Card', amount: 400000, transactionCode: 'TXN_EXACT_CARD_1' }],
    },
  });
  record(
    'STRESS_4E',
    'Card bằng đúng số dư còn thiếu (400.000 VND) -> Thành công 200 OK & chuyển sang Paid',
    res4E.status === 200 && res4E.data?.data?.status === 'Paid',
    { actual: { status: res4E.status, invoiceStatus: res4E.data?.data?.status }, expected: { status: 200, invoiceStatus: 'Paid' } }
  );

  // ============================================================================
  // STRESS TEST 5: SỐ TIỀN BẤT HỢP LỆ (<10K, >500M, ÂM, NAN)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 STRESS TEST 5: SỐ TIỀN BẤT HỢP LỆ (<10.000 VND HOẶC >500.000.000 VND)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup: Hóa đơn 10.000.000 VND, Unpaid
  await resetInvoice(TEST_INVOICE_ID, 10000000, 'Unpaid', []);

  // 5A: Amount < 10.000 VND (test nhiều giá trị: 9999, 5000, 1000, 0, -50000)
  const invalidLowAmounts = [9999, 5000, 1000, 1, 0, -50000];
  let allLowPassed = true;
  for (const amt of invalidLowAmounts) {
    const res = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
      method: 'POST',
      headers: adminHeaders,
      body: { tenders: [{ method: 'Cash', amount: amt, customerCashGiven: amt > 0 ? amt : 100000 }] },
    });
    if (res.status !== 400 || res.data?.code !== 'ERROR_0012_OUT_OF_RANGE') {
      allLowPassed = false;
      console.error(`     Amount ${amt} failed expectation: status=${res.status}, code=${res.data?.code}`);
    }
  }
  record(
    'STRESS_5A',
    'Chặn tất cả các giá trị amount < 10.000 VND (9999, 5000, 1000, 1, 0, -50000) -> 400 ERROR_0012_OUT_OF_RANGE',
    allLowPassed,
    { testedValues: invalidLowAmounts }
  );

  // 5B: Amount > 500.000.000 VND (500.000.001, 999.999.999, 1.000.000.000)
  const invalidHighAmounts = [500000001, 999999999, 1000000000];
  let allHighPassed = true;
  for (const amt of invalidHighAmounts) {
    const res = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
      method: 'POST',
      headers: adminHeaders,
      body: { tenders: [{ method: 'Cash', amount: amt, customerCashGiven: amt }] },
    });
    if (res.status !== 400 || res.data?.code !== 'ERROR_0012_OUT_OF_RANGE') {
      allHighPassed = false;
      console.error(`     Amount ${amt} failed expectation: status=${res.status}, code=${res.data?.code}`);
    }
  }
  record(
    'STRESS_5B',
    'Chặn tất cả các giá trị amount > 500.000.000 VND (500M+1, 999M, 1 tỷ) -> 400 ERROR_0012_OUT_OF_RANGE',
    allHighPassed,
    { testedValues: invalidHighAmounts }
  );

  // 5C: Non-numeric amount ("abc", null, NaN)
  const res5C = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 'abc' }] },
  });
  record(
    'STRESS_5C',
    'Amount là chuỗi ký tự phi số ("abc") -> 400 ERROR_0012_OUT_OF_RANGE',
    res5C.status === 400 && res5C.data?.code === 'ERROR_0012_OUT_OF_RANGE',
    { actual: { status: res5C.status, code: res5C.data?.code }, expected: { status: 400, code: 'ERROR_0012_OUT_OF_RANGE' } }
  );

  // 5D: Ngưỡng hợp lệ chính xác 10.000 VND (Biên tối thiểu hợp lệ)
  await resetInvoice(TEST_INVOICE_ID, 10000, 'Unpaid', []);
  const res5D = await request(`/invoices/${TEST_INVOICE_ID}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 10000, customerCashGiven: 10000 }] },
  });
  record(
    'STRESS_5D',
    'Ngưỡng biên tối thiểu 10.000 VND hợp lệ -> Chấp nhận 200 OK & chuyển sang Paid',
    res5D.status === 200 && res5D.data?.data?.status === 'Paid',
    { actual: { status: res5D.status, invoiceStatus: res5D.data?.data?.status }, expected: { status: 200, invoiceStatus: 'Paid' } }
  );

  // ============================================================================
  // CLEANUP & SUMMARY
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 HARNESS EXECUTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total Adversarial Checks: ${totalTests}`);
  console.log(`  Passed:                   ${passedTests}`);
  console.log(`  Failed:                   ${failedTests}`);

  // Dọn dẹp hoá đơn test về trạng thái Unpaid chuẩn bị cho runner
  await resetInvoice(TEST_INVOICE_ID, 1000000, 'Unpaid', []);

  console.log('================================================================================\n');

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    results,
  };
}

if (require.main === module) {
  runAdversarialHarness()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal harness crash:', err);
      process.exit(1);
    });
}

module.exports = { runAdversarialHarness };
