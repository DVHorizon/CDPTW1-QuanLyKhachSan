'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');
const { ServiceCategory, Service } = require('../../../src/models');

async function run(tracker = new TestSuiteTracker('Tier 2: C1 - Regression Fixes (FEAT-SERVICE-01)')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Setup: Ensure we have an active category, an inactive category, and a soft-deleted category
  let activeCat = await ServiceCategory.findOne({ where: { Status: 'Active', IsDeleted: false } });
  if (!activeCat) {
    activeCat = await ServiceCategory.create({
      CategoryName: `Active Cat ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });
  }

  let [inactiveCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Dịch Vụ Đã Ngừng Test' },
    defaults: { Status: 'Inactive', IsDeleted: false, Description: 'Nhóm Inactive test hồi quy' },
  });
  if (inactiveCat.Status !== 'Inactive' || inactiveCat.IsDeleted) {
    inactiveCat.Status = 'Inactive';
    inactiveCat.IsDeleted = false;
    await inactiveCat.save();
  }

  let [deletedCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Dịch Vụ Đã Xóa Test' },
    defaults: { Status: 'Inactive', IsDeleted: true, Description: 'Nhóm IsDeleted test hồi quy' },
  });
  if (!deletedCat.IsDeleted) {
    deletedCat.IsDeleted = true;
    await deletedCat.save();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_01: Create service with inactive category -> 400 ERROR_0014_INACTIVE_REFERENCE
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: inactiveCat.CategoryId,
        serviceName: `Dịch Vụ Nhóm Inactive ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('TC_REG_01', 'Create service with inactive category returns 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_REG_01', 'Create service with inactive category', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_02: Update service with inactive category -> 400 ERROR_0014_INACTIVE_REFERENCE
  // ─────────────────────────────────────────────────────────────────────────────
  let validServiceId = null;
  try {
    // First create a valid service in an active category
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch Vụ Hợp Lệ Cho Update ${Date.now()}`,
        price: 200000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(createRes.status, 201, `Failed to setup service for TC_REG_02: ${createRes.status}`);
    validServiceId = createRes.data?.data?.ServiceId;

    // Now try to update its categoryId to the inactive category
    const updateRes = await request(`/services/${validServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        categoryId: inactiveCat.CategoryId,
      },
    });
    assert.strictEqual(updateRes.status, 400, `Expected 400 Bad Request, got ${updateRes.status}`);
    assert.strictEqual(updateRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(updateRes.data?.field, 'categoryId');
    tracker.recordPass('TC_REG_02', 'Update service with inactive category returns 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_REG_02', 'Update service with inactive category', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_03: Reactivate service with inactive category -> 400 ERROR_0014_INACTIVE_REFERENCE
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // Create a new category and service, deactivate service, then deactivate category, then attempt reactivate
    const dedicatedCat = await ServiceCategory.create({
      CategoryName: `Dedicated Inactive Reactivate Cat ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });
    const sRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: dedicatedCat.CategoryId,
        serviceName: `Service For Reactivate Test ${Date.now()}`,
        price: 300000,
        unit: 'Giờ',
      },
    });
    assert.strictEqual(sRes.status, 201);
    const reactivateSvcId = sRes.data?.data?.ServiceId;

    // Deactivate service
    const deactRes = await request(`/services/${reactivateSvcId}/deactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(deactRes.status, 200);

    // Set dedicated category to Inactive
    dedicatedCat.Status = 'Inactive';
    await dedicatedCat.save();

    // Now attempt to reactivate the service
    const reactRes = await request(`/services/${reactivateSvcId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(reactRes.status, 400, `Expected 400 Bad Request, got ${reactRes.status}`);
    assert.strictEqual(reactRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    tracker.recordPass('TC_REG_03', 'Reactivate service with inactive category returns 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_REG_03', 'Reactivate service with inactive category', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_04: GET categories filters out IsDeleted: true and supports status query
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const resAll = await request('/services/categories', {
      method: 'GET',
      headers: adminHeaders,
    });
    assert.strictEqual(resAll.status, 200);
    const hasDeleted = (resAll.data?.data || []).some((c) => c.IsDeleted === true);
    assert.strictEqual(hasDeleted, false, 'GET /services/categories must NOT return soft-deleted categories');

    const resActive = await request('/services/categories?status=Active', {
      method: 'GET',
      headers: adminHeaders,
    });
    assert.strictEqual(resActive.status, 200);
    const allActive = (resActive.data?.data || []).every((c) => c.Status === 'Active' && !c.IsDeleted);
    assert.strictEqual(allActive, true, 'GET /services/categories?status=Active must return only active categories');

    tracker.recordPass('TC_REG_04', 'GET categories filters out IsDeleted: true and supports status query');
  } catch (err) {
    tracker.recordFail('TC_REG_04', 'GET categories filtering', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_05: Service name boundary validations (empty, <2 chars, >150 chars)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // 5a: empty / spaces
    const rEmpty = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: '   ', price: 100000, unit: 'Lượt' },
    });
    assert.strictEqual(rEmpty.status, 400);
    assert.strictEqual(rEmpty.data?.code, 'ERROR_0001_REQUIRED');
    assert.strictEqual(rEmpty.data?.field, 'serviceName');

    // 5b: min length (< 2 chars)
    const rMin = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: 'A', price: 100000, unit: 'Lượt' },
    });
    assert.strictEqual(rMin.status, 400);
    assert.strictEqual(rMin.data?.code, 'ERROR_0002_MIN_LENGTH');
    assert.strictEqual(rMin.data?.field, 'serviceName');

    // 5c: max length (> 150 chars)
    const rMax = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: 'A'.repeat(151), price: 100000, unit: 'Lượt' },
    });
    assert.strictEqual(rMax.status, 400);
    assert.strictEqual(rMax.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(rMax.data?.field, 'serviceName');

    // 5d: PUT serviceName empty returns field: 'serviceName'
    if (validServiceId) {
      const rPutEmpty = await request(`/services/${validServiceId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { serviceName: '   ' },
      });
      assert.strictEqual(rPutEmpty.status, 400);
      assert.strictEqual(rPutEmpty.data?.code, 'ERROR_0001_REQUIRED');
      assert.strictEqual(rPutEmpty.data?.field, 'serviceName');
    }

    tracker.recordPass('TC_REG_05', 'Service name boundary validations (empty, <2 chars, >150 chars, with field)');
  } catch (err) {
    tracker.recordFail('TC_REG_05', 'Service name boundary validations', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_06: Price boundary validations (invalid string, >999,999,999.99)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // 6a: invalid string
    const rStr = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: `Valid Svc ${Date.now()}`, price: 'chữ số abc', unit: 'Lượt' },
    });
    assert.strictEqual(rStr.status, 400);
    assert.strictEqual(rStr.data?.code, 'ERROR_0004_INVALID_FORMAT');
    assert.strictEqual(rStr.data?.field, 'price');

    // 6b: > 999,999,999.99
    const rOver = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: `Valid Svc Over ${Date.now()}`, price: 1000000000, unit: 'Lượt' },
    });
    assert.strictEqual(rOver.status, 400);
    assert.strictEqual(rOver.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(rOver.data?.field, 'price');

    // 6c: PUT price > 999,999,999.99 returns field: 'price'
    if (validServiceId) {
      const rPutOver = await request(`/services/${validServiceId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { price: 1000000000 },
      });
      assert.strictEqual(rPutOver.status, 400);
      assert.strictEqual(rPutOver.data?.code, 'ERROR_0012_OUT_OF_RANGE');
      assert.strictEqual(rPutOver.data?.field, 'price');
    }

    tracker.recordPass('TC_REG_06', 'Price boundary validations (non-numeric, >999,999,999.99, with field)');
  } catch (err) {
    tracker.recordFail('TC_REG_06', 'Price boundary validations', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_07: Unit and description boundary validations
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // 7a: unit empty
    const rUnitEmpty = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: `Svc Unit Empty ${Date.now()}`, price: 100000, unit: '   ' },
    });
    assert.strictEqual(rUnitEmpty.status, 400);
    assert.strictEqual(rUnitEmpty.data?.code, 'ERROR_0001_REQUIRED');
    assert.strictEqual(rUnitEmpty.data?.field, 'unit');

    // 7b: unit > 50 chars
    const rUnitMax = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryId: activeCat.CategoryId, serviceName: `Svc Unit Max ${Date.now()}`, price: 100000, unit: 'U'.repeat(51) },
    });
    assert.strictEqual(rUnitMax.status, 400);
    assert.strictEqual(rUnitMax.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(rUnitMax.data?.field, 'unit');

    // 7c: description > 1000 chars
    const rDescMax = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Svc Desc Max ${Date.now()}`,
        price: 100000,
        unit: 'Lượt',
        description: 'D'.repeat(1001),
      },
    });
    assert.strictEqual(rDescMax.status, 400);
    assert.strictEqual(rDescMax.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(rDescMax.data?.field, 'description');

    // 7d: PUT unit empty returns field: 'unit'
    if (validServiceId) {
      const rPutUnit = await request(`/services/${validServiceId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { unit: '   ' },
      });
      assert.strictEqual(rPutUnit.status, 400);
      assert.strictEqual(rPutUnit.data?.code, 'ERROR_0001_REQUIRED');
      assert.strictEqual(rPutUnit.data?.field, 'unit');
    }

    tracker.recordPass('TC_REG_07', 'Unit and description boundary validations (with field)');
  } catch (err) {
    tracker.recordFail('TC_REG_07', 'Unit and description boundary validations', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_REG_08: Update non-existent service -> 404 ERROR_0011_NOT_FOUND
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const res = await request('/services/999999', {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        serviceName: 'Non Existent Service Update',
        price: 100000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_REG_08', 'Update non-existent service returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_REG_08', 'Update non-existent service', err);
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
