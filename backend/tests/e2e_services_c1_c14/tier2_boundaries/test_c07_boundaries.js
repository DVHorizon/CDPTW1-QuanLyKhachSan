'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C7 - Boundaries & Master Invoice Validation')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B07_01: Unauthenticated request -> 401 ERROR_0009_UNAUTHENTICATED
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      body: { bookingId: 1 },
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0009_UNAUTHENTICATED');
    tracker.recordPass('TC_B07_01', 'Invoice generation without token returns 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('TC_B07_01', 'Unauthenticated invoice creation', err);
  }

  // TC_B07_02: Guest role attempting to create master invoice -> 403 ERROR_0010_FORBIDDEN
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: guestHeaders,
      body: { bookingId: 1 },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B07_02', 'Guest role attempting master invoice returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B07_02', 'Guest role attempting master invoice', err);
  }

  // TC_B07_03: Non-existent bookingId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: { bookingId: 999999 },
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B07_03', 'Non-existent bookingId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B07_03', 'Non-existent bookingId', err);
  }

  // TC_B07_04: Missing bookingId in body -> 400 ERROR_0001_REQUIRED
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: {},
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0001_REQUIRED');
    tracker.recordPass('TC_B07_04', 'Missing bookingId in request body returns 400 ERROR_0001_REQUIRED');
  } catch (err) {
    tracker.recordFail('TC_B07_04', 'Missing bookingId', err);
  }

  // TC_B07_05: Duplicate invoice generation -> 409 ERROR_0017_ALREADY_EXISTS
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: { bookingId: 1, bypassCheckOutRule: true },
    });
    assert.strictEqual(res.status, 409, `Expected 409 Conflict for duplicate invoice, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0017_ALREADY_EXISTS');
    tracker.recordPass('TC_B07_05', 'Duplicate master invoice generation returns 409 ERROR_0017_ALREADY_EXISTS');
  } catch (err) {
    tracker.recordFail('TC_B07_05', 'Duplicate master invoice generation', err);
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
