'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C8 - Boundaries & PDF Export Validation')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B08_01: Unauthenticated PDF download -> 401 ERROR_0009_UNAUTHENTICATED
  try {
    const res = await request('/invoices/1/pdf');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    tracker.recordPass('TC_B08_01', 'PDF download without token returns 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('TC_B08_01', 'Unauthenticated PDF download', err);
  }

  // TC_B08_02: PDF download for non-existent invoiceId (999999) -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/invoices/999999/pdf', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    tracker.recordPass('TC_B08_02', 'PDF download for non-existent invoiceId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B08_02', 'Non-existent invoiceId PDF', err);
  }

  // TC_B08_03: Invalid invoiceId format
  try {
    const res = await request('/invoices/not-an-id/pdf', {
      headers: adminHeaders,
    });
    assert.ok(res.status === 400 || res.status === 404, `Expected 400 or 404, got ${res.status}`);
    tracker.recordPass('TC_B08_03', 'Invalid invoiceId format returns 400 or 404 error cleanly');
  } catch (err) {
    tracker.recordFail('TC_B08_03', 'Invalid invoiceId format', err);
  }

  // TC_B08_04: PDF metadata info for non-existent invoiceId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/invoices/999999/pdf-info', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B08_04', 'PDF info for non-existent invoiceId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B08_04', 'Non-existent invoiceId pdf-info', err);
  }

  // TC_B08_05: Guest attempting to access invoice not belonging to them -> 403 ERROR_0010_FORBIDDEN
  try {
    const res = await request('/invoices/1/pdf', {
      headers: guestHeaders,
    });
    // If invoice 1 belongs to another user, must return 403
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for cross-tenant guest access, got ${res.status}`);
    tracker.recordPass('TC_B08_05', 'Guest attempting to access unowned invoice PDF returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B08_05', 'Cross-tenant invoice access', err);
  }

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed}/${s.total} passed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
