'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C1 - Boundaries & Edge Cases')) {
  const { adminToken, recToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  // TC_B01_01: Duplicate category name (case/accent insensitive) -> 409 ERROR_0007_DUPLICATE
  try {
    const res = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: 'Spa & Chăm Sóc Sức Khỏe' },
    });
    assert.strictEqual(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0007_DUPLICATE');
    tracker.recordPass('TC_B01_01', 'Duplicate category name returns 409 ERROR_0007_DUPLICATE');
  } catch (err) {
    tracker.recordFail('TC_B01_01', 'Duplicate category name returns 409', err);
  }

  // TC_B01_02: Create service with negative price -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 1,
        serviceName: `Dịch Vụ Giá Âm ${Date.now()}`,
        price: -50000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B01_02', 'Negative service price returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B01_02', 'Negative service price boundary', err);
  }

  // TC_B01_03: Create service with price = 0 -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 1,
        serviceName: `Dịch Vụ Giá 0 ${Date.now()}`,
        price: 0,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B01_03', 'Zero service price returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B01_03', 'Zero service price boundary', err);
  }

  // TC_B01_04: Create service with non-existent categoryId -> 404/400 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 999999,
        serviceName: `Dịch Vụ Không Category ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.ok(res.status === 400 || res.status === 404, `Expected 400 or 404, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B01_04', 'Non-existent categoryId returns ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B01_04', 'Non-existent categoryId returns ERROR_0011_NOT_FOUND', err);
  }

  // TC_B01_05: Create service without token -> 401 ERROR_0009_UNAUTHENTICATED
  try {
    const res = await request('/services', {
      method: 'POST',
      body: {
        categoryId: 1,
        serviceName: 'No Auth Service',
        price: 100000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 401, `Expected 401 Unauthenticated, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0009_UNAUTHENTICATED');
    tracker.recordPass('TC_B01_05', 'Unauthenticated service creation returns 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('TC_B01_05', 'Unauthenticated service creation boundary', err);
  }

  // TC_B01_06: Create service with Receptionist token (Forbidden) -> 403 ERROR_0010_FORBIDDEN
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: recHeaders,
      body: {
        categoryId: 1,
        serviceName: 'Receptionist Service Attempt',
        price: 100000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B01_06', 'Unauthorized role returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B01_06', 'Unauthorized role returns 403', err);
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
