'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C12 - Occupancy & RevPAR Boundaries')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  // TC_B12_01: Without token -> 401
  const unauthContract = { endpoint: 'GET /statistics/occupancy', expectedStatus: 401 };
  const res1 = await request('/statistics/occupancy');
  probeOrAssert(tracker, 'TC_B12_01', 'Occupancy stats without token returns 401 ERROR_0009_UNAUTHENTICATED', res1, 401, unauthContract);

  // TC_B12_02: Guest role -> 403
  const forbiddenContract = { endpoint: 'GET /statistics/occupancy', expectedStatus: 403 };
  const res2 = await request('/statistics/occupancy', { headers: guestHeaders });
  probeOrAssert(tracker, 'TC_B12_02', 'Guest accessing occupancy statistics returns 403 ERROR_0010_FORBIDDEN', res2, 403, forbiddenContract);

  // TC_B12_03: Inverted date range (fromDate > toDate) -> 400
  const invertedDateContract = { endpoint: 'GET /statistics/occupancy?fromDate=2026-11-30&toDate=2026-11-01', expectedStatus: 400 };
  const res3 = await request('/statistics/occupancy?fromDate=2026-11-30&toDate=2026-11-01', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B12_03', 'Inverted date range (fromDate > toDate) rejected with 400 validation error', res3, 400, invertedDateContract);

  // TC_B12_04: Unsupported export format -> 400
  const badFormatContract = { endpoint: 'GET /statistics/occupancy/export?format=xml', expectedStatus: 400 };
  const res4 = await request('/statistics/occupancy/export?format=xml', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B12_04', 'Unsupported export format (xml/doc) rejected with 400 error', res4, 400, badFormatContract);

  // TC_B12_05: Single day range boundary
  const singleDayContract = { endpoint: 'GET /statistics/occupancy?fromDate=2026-10-15&toDate=2026-10-15', expectedStatus: 200 };
  const res5 = await request('/statistics/occupancy?fromDate=2026-10-15&toDate=2026-10-15', { headers: adminHeaders });
  probeOrAssert(tracker, 'TC_B12_05', 'Single-day date boundary evaluates cleanly without division by zero', res5, 200, singleDayContract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
