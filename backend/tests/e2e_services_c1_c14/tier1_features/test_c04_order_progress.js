'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getActiveStayFixture, getActiveServiceFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function createTestOrder(headers, stayId, serviceId) {
  const res = await request('/service-orders', {
    method: 'POST',
    headers,
    body: {
      stayId,
      serviceId,
      quantity: 1,
      note: 'State machine progress test',
    },
  });
  return res.data?.data?.OrderId || res.data?.data?.orderId;
}

async function run(tracker = new TestSuiteTracker('Tier 1: C4 - Service Order Progress & Kanban')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const stayFixture = await getActiveStayFixture();
  const serviceFixture = await getActiveServiceFixture();

  // TC_C04_01: Transition Received -> InProgress
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    assert.ok(orderId, 'Should create order');
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'InProgress', 'Status should be InProgress');
    tracker.recordPass('TC_C04_01', 'Staff transitions order Received -> InProgress', `OrderId: ${orderId}`);
  } catch (err) {
    tracker.recordFail('TC_C04_01', 'Staff transitions order Received -> InProgress', err);
  }

  // TC_C04_02: Transition InProgress -> Completed
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    // Move to InProgress
    await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    // Move to Completed
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Completed', 'Status should be Completed');
    tracker.recordPass('TC_C04_02', 'Staff transitions order InProgress -> Completed', `OrderId: ${orderId}`);
  } catch (err) {
    tracker.recordFail('TC_C04_02', 'Staff transitions order InProgress -> Completed', err);
  }

  // TC_C04_03: Fast-track Received -> Completed
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Completed', 'Status should be Completed');
    tracker.recordPass('TC_C04_03', 'Staff fast-tracks Received -> Completed directly', `OrderId: ${orderId}`);
  } catch (err) {
    tracker.recordFail('TC_C04_03', 'Staff fast-tracks Received -> Completed directly', err);
  }

  // TC_C04_04: Cancel order with cancelReason
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Cancelled', cancelReason: 'Khách đổi kế hoạch lịch trình' },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Cancelled', 'Status should be Cancelled');
    tracker.recordPass('TC_C04_04', 'Cancel order in Received state with mandatory reason', `OrderId: ${orderId}`);
  } catch (err) {
    tracker.recordFail('TC_C04_04', 'Cancel order in Received state with mandatory reason', err);
  }

  // TC_C04_05: Filter orders by status on Kanban board
  try {
    const res = await request('/service-orders?status=Completed', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data));
    const allCompleted = res.data.data.every((o) => (o.Status || o.status) === 'Completed');
    assert.ok(allCompleted, 'All returned orders must have Status = Completed');
    tracker.recordPass('TC_C04_05', 'GET /service-orders?status=Completed filters Kanban column', `Count: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C04_05', 'GET /service-orders?status=Completed filters Kanban column', err);
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
