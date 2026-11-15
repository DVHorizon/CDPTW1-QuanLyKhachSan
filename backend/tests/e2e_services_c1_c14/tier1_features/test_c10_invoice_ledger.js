'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C10 - Invoice Ledger & Transaction Audit')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const testInvoiceId = 1;

  // Expected contracts per PROJECT.md § Invoice Ledger Contract (C10)
  const ledgerContract = {
    endpoint: 'GET /invoices?page=1&pageSize=20',
    expectedResponse: {
      success: true,
      page: 1,
      pageSize: 20,
      total: 'number',
      data: 'array of invoice records',
    },
  };

  // TC_C10_01: GET /invoices pagination
  const res1 = await request('/invoices?page=1&pageSize=20', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C10_01', 'GET /invoices lists invoices with pagination metadata', res1, 200, ledgerContract, (data) => {
    assert.ok(data?.success);
    assert.strictEqual(typeof data?.total, 'number');
    assert.ok(Array.isArray(data?.data));
  });

  // TC_C10_02: Filter by status
  const statusFilterContract = {
    endpoint: 'GET /invoices?status=Paid',
    expectedData: 'filtered by status',
  };
  const res2 = await request('/invoices?status=Paid', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C10_02', 'GET /invoices?status=Paid filters invoices by Paid status', res2, 200, statusFilterContract);

  // TC_C10_03: Filter by date range
  const dateFilterContract = {
    endpoint: 'GET /invoices?fromDate=2026-11-01&toDate=2026-11-02',
    expectedData: 'invoices created within range',
  };
  const res3 = await request('/invoices?fromDate=2026-11-01&toDate=2026-11-02', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C10_03', 'GET /invoices with date range filters ledger period', res3, 200, dateFilterContract);

  // TC_C10_04: Search by invoiceNumber or customer
  const searchContract = {
    endpoint: 'GET /invoices?search=INV-',
    expectedData: 'matching invoices by invoice number or customer',
  };
  const res4 = await request('/invoices?search=INV-', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C10_04', 'GET /invoices?search=INV- searches invoices by code or customer', res4, 200, searchContract);

  // TC_C10_05: GET /invoices/:invoiceId/transactions
  const txnContract = {
    endpoint: 'GET /invoices/:invoiceId/transactions',
    expectedResponse: {
      success: true,
      data: { invoiceId: testInvoiceId, payments: 'array', refunds: 'array' },
    },
  };
  const res5 = await request(`/invoices/${testInvoiceId}/transactions`, { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_C10_05', 'GET /invoices/:invoiceId/transactions returns payments & refunds ledger', res5, 200, txnContract, (data) => {
    assert.ok(data?.success);
    assert.ok(data?.data?.payments);
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
