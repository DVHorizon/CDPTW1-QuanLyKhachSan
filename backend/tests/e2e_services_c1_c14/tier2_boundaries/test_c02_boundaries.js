'use strict';

const { request } = require('../helpers/apiClient');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C2 - Boundaries & Search Edge Cases')) {
  // TC_B02_01: Special characters / injection in search param
  try {
    const res = await request('/services?search=' + encodeURIComponent("'; DROP TABLE Services; -- <script>alert(1)</script>"));
    assert.strictEqual(res.status, 200, `Expected 200 OK without crash, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    tracker.recordPass('TC_B02_01', 'Special characters and SQL/XSS tokens in search handled safely');
  } catch (err) {
    tracker.recordFail('TC_B02_01', 'Special characters in search handled safely', err);
  }

  // TC_B02_02: Non-existent categoryId returns 200 OK with empty array & total=0 (Spec 0.2 rule)
  try {
    const res = await request('/services?categoryId=999999');
    assert.strictEqual(res.status, 200, `Expected 200 OK (empty list is not error per 0.2), got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    assert.strictEqual(res.data.data.length, 0, 'Data should be empty');
    assert.strictEqual(res.data.total, 0, 'Total should be 0');
    tracker.recordPass('TC_B02_02', 'Non-existent categoryId returns empty array 200 OK per Spec 0.2 rule');
  } catch (err) {
    tracker.recordFail('TC_B02_02', 'Non-existent categoryId returns empty array', err);
  }

  // TC_B02_03: Inactive services excluded from public browsing by default
  try {
    const res = await request('/services');
    assert.strictEqual(res.status, 200);
    const hasInactive = res.data.data.some((s) => (s.Status || s.status) === 'Inactive');
    assert.strictEqual(hasInactive, false, 'Public service list must not contain Inactive services');
    tracker.recordPass('TC_B02_03', 'Public service lookup excludes Inactive services by default');
  } catch (err) {
    tracker.recordFail('TC_B02_03', 'Public lookup excludes Inactive services', err);
  }

  // TC_B02_04: Out-of-bounds pagination (page=99999)
  try {
    const res = await request('/services?page=99999&pageSize=10');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data?.data));
    assert.strictEqual(res.data.data.length, 0, 'Data should be empty for page out of bounds');
    assert.ok(res.data.total >= 0, 'Total count preserved');
    tracker.recordPass('TC_B02_04', 'Out-of-bounds pagination returns empty array with total count preserved');
  } catch (err) {
    tracker.recordFail('TC_B02_04', 'Out-of-bounds pagination returns empty array', err);
  }

  // TC_B02_05: Inverted price range (minPrice > maxPrice) -> 400 ERROR_0004_INVALID_FORMAT
  try {
    const res = await request('/services?minPrice=500000&maxPrice=100000');
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0004_INVALID_FORMAT');
    tracker.recordPass('TC_B02_05', 'Inverted price bounds (min > max) rejected with 400 ERROR_0004_INVALID_FORMAT');
  } catch (err) {
    tracker.recordFail('TC_B02_05', 'Inverted price bounds rejected with 400', err);
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
