'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C1 - Service Management CRUD')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let createdCategoryId = null;
  let createdServiceId = null;

  // TC_C01_01: GET /services/categories
  try {
    const res = await request('/services/categories');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data), 'data should be an array');
    tracker.recordPass('TC_C01_01', 'GET /services/categories returns category list', `Count: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C01_01', 'GET /services/categories returns category list', err);
  }

  // TC_C01_02: POST /services/categories
  try {
    const uniqueName = `Category E2E ${Date.now()}`;
    const res = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: uniqueName, description: 'Created by E2E test track' },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'SUCCESS_0001_CREATED');
    createdCategoryId = res.data?.data?.categoryId || res.data?.data?.CategoryId;
    assert.ok(createdCategoryId, 'Should return created categoryId');
    tracker.recordPass('TC_C01_02', 'POST /services/categories creates category', `CategoryId: ${createdCategoryId}`);
  } catch (err) {
    tracker.recordFail('TC_C01_02', 'POST /services/categories creates category', err);
  }

  // TC_C01_03: POST /services
  try {
    const catId = createdCategoryId || 1;
    const svcName = `Dịch Vụ E2E ${Date.now()}`;
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: catId,
        serviceName: svcName,
        price: 250000,
        unit: 'Lượt',
        description: 'E2E CRUD test service',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'SUCCESS_0001_CREATED');
    createdServiceId = res.data?.data?.serviceId || res.data?.data?.ServiceId;
    assert.ok(createdServiceId, 'Should return created serviceId');
    tracker.recordPass('TC_C01_03', 'POST /services creates new active service', `ServiceId: ${createdServiceId}`);
  } catch (err) {
    tracker.recordFail('TC_C01_03', 'POST /services creates new active service', err);
  }

  // TC_C01_04: PUT /services/:id
  try {
    const sId = createdServiceId || 1;
    const res = await request(`/services/${sId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        serviceName: `Dịch Vụ E2E Updated ${Date.now()}`,
        price: 320000,
        unit: 'Giờ',
        description: 'Updated via E2E test',
      },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    tracker.recordPass('TC_C01_04', 'PUT /services/:id updates service details', `Status: 200`);
  } catch (err) {
    tracker.recordFail('TC_C01_04', 'PUT /services/:id updates service details', err);
  }

  // TC_C01_05: PATCH /services/:id/deactivate
  try {
    const sId = createdServiceId || 1;
    const res = await request(`/services/${sId}/deactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Inactive', 'Service status should be Inactive');
    tracker.recordPass('TC_C01_05', 'PATCH /services/:id/deactivate soft-deletes service', 'Status: Inactive');
  } catch (err) {
    tracker.recordFail('TC_C01_05', 'PATCH /services/:id/deactivate soft-deletes service', err);
  }

  // TC_C01_06: PATCH /services/:id/reactivate
  try {
    const sId = createdServiceId || 1;
    const res = await request(`/services/${sId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Active', 'Service status should be Active');
    tracker.recordPass('TC_C01_06', 'PATCH /services/:id/reactivate reactivates service', 'Status: Active');
  } catch (err) {
    tracker.recordFail('TC_C01_06', 'PATCH /services/:id/reactivate reactivates service', err);
  }

  // TC_C01_07: POST /services/sync-pos is removed per R2 spec adjustment
  try {
    const res = await request('/services/sync-pos', {
      method: 'POST',
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found for removed endpoint, got ${res.status}`);
    tracker.recordPass('TC_C01_07', 'POST /services/sync-pos returns 404 (Out-of-Scope removed per R2)');
  } catch (err) {
    tracker.recordFail('TC_C01_07', 'POST /services/sync-pos returns 404 (Out-of-Scope removed per R2)', err);
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
