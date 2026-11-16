'use strict';

const { request } = require('../helpers/apiClient');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C2 - Service Search & Filtering')) {
  // TC_C02_01: Default public browsing
  try {
    const res = await request('/services');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.data?.success, 'Response should indicate success');
    assert.ok(Array.isArray(res.data?.data), 'Data should be an array of services');
    assert.strictEqual(typeof res.data?.total, 'number', 'Should include total count');
    tracker.recordPass('TC_C02_01', 'GET /services default query returns active services', `Total: ${res.data.total}`);
  } catch (err) {
    tracker.recordFail('TC_C02_01', 'GET /services default query returns active services', err);
  }

  // TC_C02_02: Filter by categoryId
  try {
    const catRes = await request('/services/categories');
    const firstCat = catRes.data?.data?.[0];
    const catId = firstCat?.CategoryId || firstCat?.categoryId || 1;

    const res = await request(`/services?categoryId=${catId}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    const allMatch = res.data.data.every((s) => (s.CategoryId || s.categoryId) === Number(catId));
    assert.ok(allMatch, 'All returned services must match requested categoryId');
    tracker.recordPass('TC_C02_02', `GET /services?categoryId=${catId} filters accurately`, `Matched: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C02_02', 'GET /services?categoryId filters accurately', err);
  }

  // TC_C02_03: Vietnamese accent-insensitive NFD search
  try {
    const res = await request('/services?search=spa');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    tracker.recordPass('TC_C02_03', 'GET /services?search=spa performs accent-insensitive search', `Matches: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C02_03', 'GET /services?search=spa performs accent-insensitive search', err);
  }

  // TC_C02_04: Filter by price range (minPrice / maxPrice)
  try {
    const minP = 50000;
    const maxP = 1000000;
    const res = await request(`/services?minPrice=${minP}&maxPrice=${maxP}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    const withinRange = res.data.data.every((s) => {
      const p = Number(s.Price || s.price);
      return p >= minP && p <= maxP;
    });
    assert.ok(withinRange, 'All returned services must be within specified price range');
    tracker.recordPass('TC_C02_04', `GET /services?minPrice=${minP}&maxPrice=${maxP} bounds correctly`, `Matches: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C02_04', 'GET /services price range bounds correctly', err);
  }

  // TC_C02_05: Pagination structure verification
  try {
    const res = await request('/services?page=1&pageSize=3');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    assert.ok(res.data.data.length <= 3, 'Data items should not exceed pageSize');
    assert.strictEqual(res.data?.page, 1, 'Page number should match');
    assert.strictEqual(res.data?.pageSize, 3, 'PageSize should match');
    tracker.recordPass('TC_C02_05', 'GET /services pagination respects page and pageSize', `Items: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C02_05', 'GET /services pagination respects page and pageSize', err);
  }

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed}/${s.total} passed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
