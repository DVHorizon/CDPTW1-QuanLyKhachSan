'use strict';

/**
 * test_challenger_deep_probes.js
 * Empirical Challenger deep adversarial probes for FEAT-SERVICE-01:
 * - Category status rejection (inactive, soft-deleted, non-existent, invalid types)
 * - Price boundaries & type coercion attacks (boolean, array, object, Infinity, NaN, boundary precision)
 * - SQL Injection across query params, route params, and body fields
 * - RBAC & Authentication fuzzing
 * - ServiceCode generation resilience under weird category names
 */

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');
const { ServiceCategory, Service } = require('../../../src/models');

async function run() {
  const tracker = new TestSuiteTracker('Challenger Deep Adversarial Probes');
  const { adminToken, recToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  // Setup fixtures
  let activeCat = await ServiceCategory.findOne({ where: { Status: 'Active', IsDeleted: false } });
  if (!activeCat) {
    activeCat = await ServiceCategory.create({
      CategoryName: `Active Cat Probe ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });
  }

  let [inactiveCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Inactive Deep Probe' },
    defaults: { Status: 'Inactive', IsDeleted: false, Description: 'Inactive deep probe fixture' },
  });
  if (inactiveCat.Status !== 'Inactive' || inactiveCat.IsDeleted) {
    inactiveCat.Status = 'Inactive';
    inactiveCat.IsDeleted = false;
    await inactiveCat.save();
  }

  let [softDeletedCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Deleted Deep Probe' },
    defaults: { Status: 'Inactive', IsDeleted: true, Description: 'Soft deleted deep probe fixture' },
  });
  if (!softDeletedCat.IsDeleted) {
    softDeletedCat.IsDeleted = true;
    await softDeletedCat.save();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: CATEGORY STATUS & REFERENCE REJECTION
  // ─────────────────────────────────────────────────────────────────────────────

  // Probe 1.1: POST /services with inactive category ID as numeric string "123"
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: String(inactiveCat.CategoryId),
        serviceName: `Dịch vụ Inactive String ID ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('PROBE_CAT_01', 'Inactive category reference rejected when categoryId is numeric string');
  } catch (err) {
    tracker.recordFail('PROBE_CAT_01', 'Inactive category string ID', err);
  }

  // Probe 1.2: POST /services with negative category ID
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: -1,
        serviceName: `Dịch vụ Negative Cat ID ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('PROBE_CAT_02', 'Negative category ID returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('PROBE_CAT_02', 'Negative category ID', err);
  }

  // Probe 1.3: POST /services with non-numeric category ID string "invalid-cat"
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 'invalid-cat',
        serviceName: `Dịch vụ Invalid Cat String ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    // Should return 404 or 400 (not 500)
    assert.ok(res.status === 404 || res.status === 400, `Expected 400 or 404, got ${res.status}`);
    tracker.recordPass('PROBE_CAT_03', 'Non-numeric string categoryId safely rejected without crash');
  } catch (err) {
    tracker.recordFail('PROBE_CAT_03', 'Non-numeric string categoryId', err);
  }

  // Probe 1.4: PUT /services/:id with soft-deleted category
  try {
    const s = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Before Soft Deleted ${Date.now()}`,
        price: 100000,
        unit: 'Lượt',
      },
    });
    const sId = s.data?.data?.ServiceId;
    const putRes = await request(`/services/${sId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { categoryId: softDeletedCat.CategoryId },
    });
    assert.strictEqual(putRes.status, 400);
    assert.strictEqual(putRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    tracker.recordPass('PROBE_CAT_04', 'PUT service with soft-deleted category rejected with 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('PROBE_CAT_04', 'PUT service with soft-deleted category', err);
  }

  // Probe 1.5: PATCH /services/:id/reactivate when category is soft-deleted
  try {
    const tempCat = await ServiceCategory.create({
      CategoryName: `Nhóm Xóa Mềm Phục Hồi ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });
    const s = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: tempCat.CategoryId,
        serviceName: `Dịch vụ Chờ Xóa Nhóm ${Date.now()}`,
        price: 100000,
        unit: 'Lượt',
      },
    });
    const sId = s.data?.data?.ServiceId;
    // Deactivate service
    await request(`/services/${sId}/deactivate`, { method: 'PATCH', headers: adminHeaders });
    // Soft delete category
    tempCat.IsDeleted = true;
    await tempCat.save();
    // Try reactivating service
    const reactRes = await request(`/services/${sId}/reactivate`, { method: 'PATCH', headers: adminHeaders });
    assert.strictEqual(reactRes.status, 400);
    assert.strictEqual(reactRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    tracker.recordPass('PROBE_CAT_05', 'Reactivate rejected when parent category is soft-deleted');
  } catch (err) {
    tracker.recordFail('PROBE_CAT_05', 'Reactivate with soft-deleted parent category', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: PRICE BOUNDARY & MALICIOUS TYPE COERCION ATTACKS
  // ─────────────────────────────────────────────────────────────────────────────

  // Probe 2.1: Price = 0.01 (Minimum positive boundary) -> 201 Created
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Tối Thiểu 0.01 ${Date.now()}`,
        price: 0.01,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(Number(res.data?.data?.Price), 0.01);
    tracker.recordPass('PROBE_PRICE_01', 'Price = 0.01 (min boundary) accepted with 201');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_01', 'Price = 0.01 min boundary', err);
  }

  // Probe 2.2: Price = 0.00 -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá 0.00 ${Date.now()}`,
        price: 0.0,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('PROBE_PRICE_02', 'Price = 0.00 rejected with 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_02', 'Price = 0.00', err);
  }

  // Probe 2.3: Price = boolean true / false -> 400 ERROR_0004_INVALID_FORMAT or OUT_OF_RANGE
  try {
    const resTrue = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Boolean ${Date.now()}`,
        price: true,
        unit: 'Lượt',
      },
    });
    // In JS: isNaN(true) is false! Number(true) is 1. If system allows 1, let's verify what happens.
    // If it's accepted or rejected, server MUST NOT crash (not 500).
    assert.ok(resTrue.status === 201 || resTrue.status === 400, `Expected 201 or 400, got ${resTrue.status}`);
    tracker.recordPass('PROBE_PRICE_03', 'Price boolean handled without crash');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_03', 'Price boolean', err);
  }

  // Probe 2.4: Price = Array [100000] -> rejected or safely handled
  try {
    const resArr = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Array ${Date.now()}`,
        price: [100000],
        unit: 'Lượt',
      },
    });
    assert.ok(resArr.status === 400 || resArr.status === 201, `Expected 400 or 201, got ${resArr.status}`);
    tracker.recordPass('PROBE_PRICE_04', 'Price array handled without crash');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_04', 'Price array', err);
  }

  // Probe 2.5: Price = Object { val: 100 } -> 400 ERROR_0004_INVALID_FORMAT
  try {
    const resObj = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Object ${Date.now()}`,
        price: { val: 100 },
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resObj.status, 400);
    assert.strictEqual(resObj.data?.code, 'ERROR_0004_INVALID_FORMAT');
    tracker.recordPass('PROBE_PRICE_05', 'Price object rejected with 400 ERROR_0004_INVALID_FORMAT');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_05', 'Price object', err);
  }

  // Probe 2.6: Price = Infinity and -Infinity -> 400
  try {
    const resInf = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Infinity ${Date.now()}`,
        price: 'Infinity',
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resInf.status, 400);
    tracker.recordPass('PROBE_PRICE_06', 'Price "Infinity" rejected with 400');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_06', 'Price Infinity', err);
  }

  // Probe 2.7: Price = Number.MAX_SAFE_INTEGER -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const resMaxSafe = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Max Safe ${Date.now()}`,
        price: Number.MAX_SAFE_INTEGER,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resMaxSafe.status, 400);
    assert.strictEqual(resMaxSafe.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('PROBE_PRICE_07', 'Price MAX_SAFE_INTEGER rejected with 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('PROBE_PRICE_07', 'Price MAX_SAFE_INTEGER', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: SQL INJECTION PROBES ACROSS ENDPOINTS & PARAMETERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Probe 3.1: SQLi in GET /services query parameters (group, minPrice, maxPrice, sortBy)
  try {
    const sqliGroup = await request(`/services?group=${encodeURIComponent("1' OR '1'='1")}`);
    assert.strictEqual(sqliGroup.status, 200, `group sqli expected 200, got ${sqliGroup.status}`);

    const sqliSort = await request(`/services?sortBy=${encodeURIComponent("price_asc; DROP TABLE Services;--")}`);
    assert.strictEqual(sqliSort.status, 200, `sortBy sqli expected 200, got ${sqliSort.status}`);

    const sqliMinPrice = await request(`/services?minPrice=${encodeURIComponent("0; DROP TABLE Services;--")}`);
    assert.strictEqual(sqliMinPrice.status, 400, `minPrice sqli expected 400, got ${sqliMinPrice.status}`);
    assert.strictEqual(sqliMinPrice.data?.code, 'ERROR_0004_INVALID_FORMAT');

    tracker.recordPass('PROBE_SQLI_01', 'SQLi payloads in GET /services query params safely handled');
  } catch (err) {
    tracker.recordFail('PROBE_SQLI_01', 'SQLi in GET query params', err);
  }

  // Probe 3.2: SQLi in route parameter GET /services/:id or PUT /services/:id
  try {
    const sqliId = "' OR '1'='1' --";
    const resPut = await request(`/services/${encodeURIComponent(sqliId)}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { serviceName: 'Attempted SQLi Route Param' },
    });
    // Should be 404 because no service has ServiceCode == "' OR '1'='1' --"
    assert.strictEqual(resPut.status, 404, `Route param sqli expected 404, got ${resPut.status}`);
    assert.strictEqual(resPut.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('PROBE_SQLI_02', 'SQLi payload in service route parameter safely returns 404');
  } catch (err) {
    tracker.recordFail('PROBE_SQLI_02', 'SQLi route parameter', err);
  }

  // Probe 3.3: SQLi in POST /services/categories categoryName
  try {
    const sqliCatName = `Cat'; DROP TABLE ServiceCategories;-- ${Date.now()}`;
    const resCat = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: sqliCatName },
    });
    assert.strictEqual(resCat.status, 201, `POST categories sqli expected 201, got ${resCat.status}`);
    assert.strictEqual(resCat.data?.data?.CategoryName, sqliCatName);

    // Verify database table ServiceCategories is intact and not dropped!
    const verifyCat = await ServiceCategory.count();
    assert.ok(verifyCat > 0, 'ServiceCategories table must remain intact');
    tracker.recordPass('PROBE_SQLI_03', 'SQLi payload in categoryName safely stored as parameterized literal');
  } catch (err) {
    tracker.recordFail('PROBE_SQLI_03', 'SQLi categoryName', err);
  }

  // Probe 3.4: SQLi in GET /services/export query parameters
  try {
    const exportRes = await request(`/services/export?search=${encodeURIComponent("'; EXEC xp_cmdshell('dir');--")}`);
    assert.strictEqual(exportRes.status, 200, `Export sqli expected 200, got ${exportRes.status}`);
    tracker.recordPass('PROBE_SQLI_04', 'SQLi in export query params safely handled');
  } catch (err) {
    tracker.recordFail('PROBE_SQLI_04', 'Export query SQLi', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: RBAC & AUTHENTICATION FUZZING
  // ─────────────────────────────────────────────────────────────────────────────

  // Probe 4.1: Malformed token header formats
  try {
    const badHeadersList = [
      {}, // missing
      { Authorization: 'Token abc123xyz' }, // wrong scheme
      { Authorization: 'Bearer' }, // missing token
      { Authorization: 'Bearer ' }, // empty token
      { Authorization: 'Bearer invalid.jwt.string' }, // invalid JWT
    ];

    for (const h of badHeadersList) {
      const res = await request('/services', {
        method: 'POST',
        headers: h,
        body: {
          categoryId: activeCat.CategoryId,
          serviceName: 'Unauthorized Test',
          price: 100000,
          unit: 'Lượt',
        },
      });
      assert.strictEqual(res.status, 401, `Header ${JSON.stringify(h)} expected 401, got ${res.status}`);
      assert.strictEqual(res.data?.code, 'ERROR_0009_UNAUTHENTICATED');
    }
    tracker.recordPass('PROBE_RBAC_01', 'Malformed authorization headers strictly rejected with 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('PROBE_RBAC_01', 'Malformed auth headers', err);
  }

  // Probe 4.2: Role without manage_services (Receptionist) attempting category creation
  try {
    const res = await request('/services/categories', {
      method: 'POST',
      headers: recHeaders,
      body: { categoryName: `Unauthorized Cat ${Date.now()}` },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('PROBE_RBAC_02', 'Receptionist role strictly denied category creation with 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('PROBE_RBAC_02', 'Receptionist category creation', err);
  }

  // Probe 4.3: Role without manage_services (Receptionist) attempting deactivate / reactivate
  try {
    const resDeact = await request('/services/1/deactivate', {
      method: 'PATCH',
      headers: recHeaders,
    });
    assert.strictEqual(resDeact.status, 403);
    assert.strictEqual(resDeact.data?.code, 'ERROR_0010_FORBIDDEN');

    const resReact = await request('/services/1/reactivate', {
      method: 'PATCH',
      headers: recHeaders,
    });
    assert.strictEqual(resReact.status, 403);
    assert.strictEqual(resReact.data?.code, 'ERROR_0010_FORBIDDEN');

    tracker.recordPass('PROBE_RBAC_03', 'Receptionist role strictly denied deactivate/reactivate with 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('PROBE_RBAC_03', 'Receptionist deactivate/reactivate', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5: SERVICE CODE GENERATION & SPECIAL CATEGORY CHARACTERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Probe 5.1: Create service under category with symbols & numbers
  try {
    const specialCat = await ServiceCategory.create({
      CategoryName: `123 $$ &% ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });

    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: specialCat.CategoryId,
        serviceName: `Dịch vụ Ký Tự Đặc Biệt ${Date.now()}`,
        price: 200000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data?.data?.ServiceCode?.startsWith('SVC-'), 'ServiceCode should start with SVC-');
    tracker.recordPass('PROBE_CODE_01', 'ServiceCode generated successfully even for symbolic category names');
  } catch (err) {
    tracker.recordFail('PROBE_CODE_01', 'Symbolic category service code generation', err);
  }

  return tracker.summary();
}

if (require.main === module) {
  run()
    .then((s) => {
      console.log(`Deep Probes Finished: ${s.passed}/${s.total} passed (${s.failed} failed)`);
      process.exit(s.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal probe error:', err);
      process.exit(1);
    });
}

module.exports = { run };
