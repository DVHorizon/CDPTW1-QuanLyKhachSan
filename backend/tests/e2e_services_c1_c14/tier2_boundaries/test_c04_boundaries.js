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
      note: 'Boundary order test',
    },
  });
  return res.data?.data?.OrderId || res.data?.data?.orderId;
}

async function run(tracker = new TestSuiteTracker('Tier 2: C4 - Boundaries & State Transitions')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  const stayFixture = await getActiveStayFixture();
  const serviceFixture = await getActiveServiceFixture();

  // TC_B04_01: Non-existent orderId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/service-orders/999999/status', {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B04_01', 'Updating non-existent orderId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B04_01', 'Non-existent orderId', err);
  }

  // TC_B04_02: Cancel without cancelReason -> 400 ERROR_0001_REQUIRED
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Cancelled', cancelReason: '' },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0001_REQUIRED');
    tracker.recordPass('TC_B04_02', 'Cancelling without cancelReason returns 400 ERROR_0001_REQUIRED');
  } catch (err) {
    tracker.recordFail('TC_B04_02', 'Missing cancelReason', err);
  }

  // TC_B04_03: Invalid transition Completed -> InProgress -> 400 ERROR_0013_INVALID_STATE_TRANSITION
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    // Move to Completed
    await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    // Attempt illegal reverse transition to InProgress
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0013_INVALID_STATE_TRANSITION');
    tracker.recordPass('TC_B04_03', 'Illegal transition Completed -> InProgress returns 400 ERROR_0013_INVALID_STATE_TRANSITION');
  } catch (err) {
    tracker.recordFail('TC_B04_03', 'Illegal transition Completed -> InProgress', err);
  }

  // TC_B04_04: Invalid transition Cancelled -> Completed -> 400 ERROR_0013_INVALID_STATE_TRANSITION
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    // Cancel
    await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Cancelled', cancelReason: 'Huỷ kiểm thử' },
    });
    // Attempt illegal transition from Cancelled to Completed
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0013_INVALID_STATE_TRANSITION');
    tracker.recordPass('TC_B04_04', 'Illegal transition Cancelled -> Completed returns 400 ERROR_0013_INVALID_STATE_TRANSITION');
  } catch (err) {
    tracker.recordFail('TC_B04_04', 'Illegal transition Cancelled -> Completed', err);
  }

  // TC_B04_05: Guest cancelling InProgress order -> 403 ERROR_0010_FORBIDDEN
  try {
    const orderId = await createTestOrder(adminHeaders, stayFixture.stayId, serviceFixture.serviceId);
    // Staff moves order to InProgress
    await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    // Guest attempts to cancel in-progress order
    const res = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: guestHeaders,
      body: { newStatus: 'Cancelled', cancelReason: 'Khách muốn huỷ giữa chừng' },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B04_05', 'Guest attempting to cancel InProgress order returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B04_05', 'Guest cancelling InProgress order', err);
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
