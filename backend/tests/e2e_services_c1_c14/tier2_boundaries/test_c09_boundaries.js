'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C9 - Multi-Tender Boundaries')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const testInvoiceId = 1;

  // TC_B09_01: Underpayment error contract
  const underpaymentContract = {
    endpoint: 'POST /invoices/:id/pay',
    body: { tenders: [{ method: 'Cash', amount: 1000 }] },
    expectedStatus: 400,
    expectedCode: 'ERROR_0012_OUT_OF_RANGE',
  };
  const res1 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: underpaymentContract.body,
  });
  probeOrAssert(tracker, 'TC_B09_01', 'Underpayment (tenders < remaining balance) rejected with 400', res1, 400, underpaymentContract);

  // TC_B09_02: Non-cash tender exceeding remaining balance
  const overpaymentContract = {
    endpoint: 'POST /invoices/:id/pay',
    body: { tenders: [{ method: 'Card', amount: 999999999 }] },
    expectedStatus: 400,
  };
  const res2 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: overpaymentContract.body,
  });
  probeOrAssert(tracker, 'TC_B09_02', 'Non-cash tender exceeding remaining balance rejected with 400', res2, 400, overpaymentContract);

  // TC_B09_03: Settle already Paid invoice
  const { Invoice } = require('../../../src/models');
  await Invoice.update({ Status: 'Paid' }, { where: { InvoiceId: testInvoiceId } });

  const alreadyPaidContract = {
    endpoint: 'POST /invoices/:id/pay',
    expectedStatus: 400,
  };
  const res3 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 500000 }] },
  });
  probeOrAssert(tracker, 'TC_B09_03', 'Settlement on already Paid invoice rejected with 400/409', res3, 400, alreadyPaidContract);

  // TC_B09_04: Cash tender where customerCashGiven < amount
  const insufficientCashContract = {
    endpoint: 'POST /invoices/:id/pay',
    body: { tenders: [{ method: 'Cash', amount: 500000, customerCashGiven: 400000 }] },
    expectedStatus: 400,
  };
  const res4 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    headers: adminHeaders,
    body: insufficientCashContract.body,
  });
  probeOrAssert(tracker, 'TC_B09_04', 'Cash tender with customerCashGiven < amount rejected with 400', res4, 400, insufficientCashContract);

  // TC_B09_05: Without token -> 401
  const unauthContract = {
    endpoint: 'POST /invoices/:id/pay',
    expectedStatus: 401,
  };
  const res5 = await request(`/invoices/${testInvoiceId}/pay`, {
    method: 'POST',
    body: { tenders: [{ method: 'Cash', amount: 500000 }] },
  });
  probeOrAssert(tracker, 'TC_B09_05', 'Settlement without token returns 401 ERROR_0009_UNAUTHENTICATED', res5, 401, unauthContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
