'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C11 - Revenue Dashboard Boundaries')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B11_01: Without token -> 401
  const unauthContract = { endpoint: 'GET /statistics/revenue', expectedStatus: 401 };
  const res1 = await request('/statistics/revenue');
  probeOrAssert(tracker, 'TC_B11_01', 'Dashboard stats without token returns 401 ERROR_0009_UNAUTHENTICATED', res1, 401, unauthContract);

  // TC_B11_02: Guest role -> 403
  const forbiddenContract = { endpoint: 'GET /statistics/revenue', expectedStatus: 403 };
  const res2 = await request('/statistics/revenue', { headers: guestHeaders });
  probeOrAssert(tracker, 'TC_B11_02', 'Guest accessing revenue dashboard returns 403 ERROR_0010_FORBIDDEN', res2, 403, forbiddenContract);

  // TC_B11_03: Malformed date
  const malformedContract = { endpoint: 'GET /statistics/revenue?date=bad-date', expectedStatus: 400 };
  const res3 = await request('/statistics/revenue?date=bad-date', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B11_03', 'Malformed date parameter returns 400 validation error', res3, 400, malformedContract);

  // TC_B11_04: Missing date parameter fallback
  const defaultDateContract = { endpoint: 'GET /statistics/revenue', expectedStatus: 200 };
  const res4 = await request('/statistics/revenue', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B11_04', 'Missing date parameter defaults to current date (200 OK)', res4, 200, defaultDateContract);

  // TC_B11_05: Far future date (zeroed KPIs)
  const farFutureContract = { endpoint: 'GET /statistics/revenue?date=2099-01-01', expectedStatus: 200 };
  const res5 = await request('/statistics/revenue?date=2099-01-01', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B11_05', 'Far future date query gracefully returns zero metrics without crash', res5, 200, farFutureContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
