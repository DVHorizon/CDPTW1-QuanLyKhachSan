'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C10 - Invoice Ledger Boundaries')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B10_01: Without token -> 401
  const unauthContract = { endpoint: 'GET /invoices', expectedStatus: 401 };
  const res1 = await request('/invoices');
  probeOrAssert(tracker, 'TC_B10_01', 'Ledger lookup without token returns 401 ERROR_0009_UNAUTHENTICATED', res1, 401, unauthContract);

  // TC_B10_02: Guest role access -> 403
  const forbiddenContract = { endpoint: 'GET /invoices', expectedStatus: 403 };
  const res2 = await request('/invoices', { headers: guestHeaders });
  probeOrAssert(tracker, 'TC_B10_02', 'Guest accessing invoice ledger returns 403 ERROR_0010_FORBIDDEN', res2, 403, forbiddenContract);

  // TC_B10_03: Inverted date range (fromDate > toDate)
  const invertedDateContract = { endpoint: 'GET /invoices?fromDate=2026-12-01&toDate=2026-01-01', expectedStatus: 400 };
  const res3 = await request('/invoices?fromDate=2026-12-01&toDate=2026-01-01', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B10_03', 'Inverted date range in ledger query rejected with 400 or empty array', res3, 400, invertedDateContract);

  // TC_B10_04: Transactions for non-existent invoiceId -> 404
  const notFoundTxnContract = { endpoint: 'GET /invoices/999999/transactions', expectedStatus: 404 };
  const res4 = await request('/invoices/999999/transactions', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B10_04', 'Transactions lookup for non-existent invoiceId returns 404 ERROR_0011_NOT_FOUND', res4, 404, notFoundTxnContract);

  // TC_B10_05: Out-of-bounds pagination
  const outOfBoundsContract = { endpoint: 'GET /invoices?page=9999', expectedStatus: 200, expectedData: { data: [] } };
  const res5 = await request('/invoices?page=9999', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B10_05', 'Out-of-bounds page returns empty array with total preserved', res5, 200, outOfBoundsContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
