'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getActiveStayFixture, getActiveServiceFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C3 - Service Ordering')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const stayFixture = await getActiveStayFixture();
  const serviceFixture = await getActiveServiceFixture();

  let createdOrderId = null;

  // TC_C03_01: GET /service-orders/active-stays
  try {
    const res = await request('/service-orders/active-stays');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data), 'Active stays should be an array');
    assert.ok(res.data.data.length > 0, 'Should have at least 1 active stay');
    tracker.recordPass('TC_C03_01', 'GET /service-orders/active-stays returns list of checked-in stays', `Count: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C03_01', 'GET /service-orders/active-stays returns list of checked-in stays', err);
  }

  // TC_C03_02: POST /service-orders single item
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 2,
        note: 'E2E Single service order test',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const order = res.data?.data;
    assert.ok(order, 'Response should contain order data');
    createdOrderId = order.OrderId || order.orderId;
    assert.ok(createdOrderId, 'Should have OrderId');
    assert.strictEqual(order.Status || order.status, 'Received', 'Initial status must be Received');
    tracker.recordPass('TC_C03_02', 'POST /service-orders creates single order in Received state', `OrderId: ${createdOrderId}`);
  } catch (err) {
    tracker.recordFail('TC_C03_02', 'POST /service-orders creates single order in Received state', err);
  }

  // TC_C03_03: POST /service-orders batch items
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        items: [
          { serviceId: serviceFixture.serviceId, quantity: 1, note: 'Batch item 1' },
          { serviceId: serviceFixture.serviceId, quantity: 2, note: 'Batch item 2' },
        ],
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const orders = res.data?.data;
    assert.ok(Array.isArray(orders) || orders?.OrderId, 'Should return created order(s)');
    tracker.recordPass('TC_C03_03', 'POST /service-orders batch items created successfully', `Status: 201`);
  } catch (err) {
    tracker.recordFail('TC_C03_03', 'POST /service-orders batch items created successfully', err);
  }

  // TC_C03_04: Snapshot pricing verification
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 3,
        note: 'Snapshot price test',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const order = res.data?.data;
    const unitPrice = Number(order.UnitPrice || order.unitPrice);
    const totalPrice = Number(order.TotalPrice || order.totalPrice);
    assert.strictEqual(unitPrice, serviceFixture.price, 'UnitPrice must match service price snapshot');
    assert.strictEqual(totalPrice, unitPrice * 3, 'TotalPrice must equal unitPrice * quantity');
    tracker.recordPass('TC_C03_04', 'Snapshot pricing matches catalog price & calculates total', `Unit: ${unitPrice}, Total: ${totalPrice}`);
  } catch (err) {
    tracker.recordFail('TC_C03_04', 'Snapshot pricing matches catalog price & calculates total', err);
  }

  // TC_C03_05: GET /service-orders includes created order
  try {
    const res = await request('/service-orders', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(Array.isArray(res.data?.data), 'Service orders should be an array');
    if (createdOrderId) {
      const found = res.data.data.some((o) => (o.OrderId || o.orderId) === createdOrderId);
      assert.ok(found, `Newly created OrderId ${createdOrderId} should appear in orders list`);
    }
    tracker.recordPass('TC_C03_05', 'GET /service-orders lists service orders', `Count: ${res.data.data.length}`);
  } catch (err) {
    tracker.recordFail('TC_C03_05', 'GET /service-orders lists service orders', err);
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
