'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');
const { Invoice, Payment } = require('../../../src/models');

/**
 * Reset hoặc chuẩn bị trạng thái hoá đơn test với số dư chỉ định
 */
async function prepareTestInvoice(invoiceId, targetTotalAmount, initialStatus = 'Unpaid') {
  await Payment.destroy({ where: { InvoiceId: invoiceId } });
  await Invoice.update(
    {
      TotalAmount: targetTotalAmount,
      Subtotal: targetTotalAmount,
      Status: initialStatus,
      PdfPath: null,
    },
    { where: { InvoiceId: invoiceId } }
  );
}

async function run(tracker = new TestSuiteTracker('Tier 1: C9 - Multi-Tender Invoice Settlement')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const testInvoiceId = 1;

  // Expected contracts per PROJECT.md § Master Invoice Settlement Contract (C9)
  const singleCashContract = {
    method: 'POST /invoices/:invoiceId/pay',
    requestBody: {
      tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1200000 }],
      note: 'Quyết toán tiền mặt tại quầy',
    },
    expectedResponse: {
      success: true,
      code: 'SUCCESS_INVOICE_SETTLED',
      data: { changeAmount: 200000, status: 'Paid' },
    },
  };

  // TC_C09_01: Single Cash tender with change
  await prepareTestInvoice(testInvoiceId, 1000000);
  const res1 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: singleCashContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C09_01', 'Cashier settles invoice with single Cash tender and change calculation', res1, 200, singleCashContract, (data) => {
    assert.strictEqual(data?.success, true);
    assert.strictEqual(data?.data?.changeAmount, 200000);
    assert.strictEqual(data?.data?.status, 'Paid');
  });

  // TC_C09_02: Split Tender (Cash + Card)
  await prepareTestInvoice(testInvoiceId, 2500000);
  const splitTenderContract = {
    method: 'POST /invoices/:invoiceId/pay',
    requestBody: {
      tenders: [
        { method: 'Cash', amount: 1000000, customerCashGiven: 1000000 },
        { method: 'Card', amount: 1500000, transactionCode: 'TXN_CARD_123' },
      ],
      note: 'Quyết toán đa phương thức Tiền mặt + Thẻ',
    },
    expectedResponse: { success: true, code: 'SUCCESS_INVOICE_SETTLED' },
  };
  const res2 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: splitTenderContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C09_02', 'Cashier settles invoice using split tender (Cash + Card)', res2, 200, splitTenderContract, (data) => {
    assert.strictEqual(data?.success, true);
  });

  // TC_C09_03: Multi-tender digital (Card + VietQR)
  await prepareTestInvoice(testInvoiceId, 2500000);
  const digitalTenderContract = {
    method: 'POST /invoices/:invoiceId/pay',
    requestBody: {
      tenders: [
        { method: 'Card', amount: 1000000, transactionCode: 'TXN_CARD_456' },
        { method: 'VietQR', amount: 1500000, transactionCode: 'TXN_QR_789' },
      ],
    },
    expectedResponse: { success: true },
  };
  const res3 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: digitalTenderContract.requestBody,
  });
  probeOrAssert(tracker, 'TC_C09_03', 'Multi-tender digital settlement (Card + VietQR)', res3, 200, digitalTenderContract);

  // TC_C09_04: Invoice status changes to Paid
  await prepareTestInvoice(testInvoiceId, 500000);
  const statusUpdateContract = {
    method: 'POST /invoices/:invoiceId/pay',
    expectedData: { status: 'Paid', invoiceId: testInvoiceId },
  };
  const res4 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 500000 }],
    },
  });
  probeOrAssert(tracker, 'TC_C09_04', 'Invoice status transitions to Paid upon settlement', res4, 200, statusUpdateContract, (data) => {
    assert.strictEqual(data?.data?.status, 'Paid');
  });

  // TC_C09_05: Linked payment records creation
  await prepareTestInvoice(testInvoiceId, 100000);
  const paymentsGenContract = {
    method: 'POST /invoices/:invoiceId/pay',
    expectedData: { payments: 'array of generated Payment records matching tenders' },
  };
  const res5 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      tenders: [{ method: 'Cash', amount: 100000, customerCashGiven: 100000 }],
    },
  });
  probeOrAssert(tracker, 'TC_C09_05', 'Payment ledger records created for each settled tender', res5, 200, paymentsGenContract, (data) => {
    assert.ok(Array.isArray(data?.data?.payments));
  });

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
