'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C6 - Boundaries & Folio Edge Cases')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B06_01: Without token -> 401 ERROR_0009_UNAUTHENTICATED
  try {
    const res = await request('/bookings/1/charges');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0009_UNAUTHENTICATED');
    tracker.recordPass('TC_B06_01', 'Charges request without token returns 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('TC_B06_01', 'Charges request without token', err);
  }

  // TC_B06_02: Guest requesting charges of another guest -> 403 ERROR_0010_FORBIDDEN
  try {
    const res = await request('/bookings/1/charges', {
      headers: guestHeaders,
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B06_02', 'Guest requesting charges for unauthorized booking returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B06_02', 'Guest requesting unauthorized charges', err);
  }

  // TC_B06_03: Non-existent bookingId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/bookings/999999/charges', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B06_03', 'Charges for non-existent bookingId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B06_03', 'Charges for non-existent bookingId', err);
  }

  // TC_B06_04: Malformed bookingId returns 400 or 404
  try {
    const res = await request('/bookings/abc/charges', {
      headers: adminHeaders,
    });
    assert.ok(res.status === 400 || res.status === 404, `Expected 400 or 404, got ${res.status}`);
    tracker.recordPass('TC_B06_04', 'Malformed bookingId returns 400 or 404 error cleanly');
  } catch (err) {
    tracker.recordFail('TC_B06_04', 'Malformed bookingId', err);
  }

  // TC_B06_05: Negative bookingId
  try {
    const res = await request('/bookings/-5/charges', {
      headers: adminHeaders,
    });
    assert.ok(res.status === 400 || res.status === 404, `Expected 400 or 404, got ${res.status}`);
    tracker.recordPass('TC_B06_05', 'Negative bookingId returns 400 or 404 error cleanly');
  } catch (err) {
    tracker.recordFail('TC_B06_05', 'Negative bookingId', err);
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
