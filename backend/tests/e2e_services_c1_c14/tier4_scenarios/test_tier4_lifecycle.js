'use strict';

/**
 * test_tier4_lifecycle.js - Real-World End-to-End Guest Lifecycle Scenarios
 */

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getActiveStayFixture, getActiveServiceFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 4: Real-World End-to-End Scenarios')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const stayFixture = await getActiveStayFixture();
  const serviceFixture = await getActiveServiceFixture();

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 4.1: The Complete Leisure Guest Journey
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    console.log('\n   🏖️ Executing Scenario 4.1: The Complete Leisure Guest Journey...');

    // Step 1: Guest views hotel service catalogue
    const catRes = await request('/services?status=Active');
    assert.strictEqual(catRes.status, 200, 'Catalog browsing');
    assert.ok(catRes.data?.data?.length > 0, 'Catalog has services');

    // Step 2: Guest orders Room Service / Spa
    const orderRes = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 1,
        note: 'Leisure stay order',
      },
    });
    assert.strictEqual(orderRes.status, 201, 'Order created');
    const orderId = orderRes.data?.data?.OrderId || orderRes.data?.data?.orderId;

    // Step 3: Staff moves order to InProgress then Completed
    await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'InProgress' },
    });
    const completeRes = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    assert.strictEqual(completeRes.status, 200, 'Order completed');

    // Step 4: Checkout preparation: Folio aggregation
    const folioRes = await request(`/bookings/${stayFixture.bookingId}/charges`, {
      headers: adminHeaders,
    });
    assert.strictEqual(folioRes.status, 200, 'Folio review');
    assert.strictEqual(typeof folioRes.data?.data?.grandTotal, 'number');

    // Step 5: Master Invoice verification
    const invRes = await request('/invoices/booking/1', {
      headers: adminHeaders,
    });
    assert.strictEqual(invRes.status, 200, 'Master invoice verified');

    // Step 6: PDF invoice downloaded
    const pdfRes = await request('/invoices/1/pdf', {
      headers: adminHeaders,
    });
    assert.strictEqual(pdfRes.status, 200, 'PDF downloaded');
    assert.ok(pdfRes.contentType.includes('application/pdf'));

    tracker.recordPass('SCENARIO_4.1', 'Full Leisure Guest Lifecycle: Catalog -> Order -> Complete -> Folio -> Invoice -> PDF');
  } catch (err) {
    tracker.recordFail('SCENARIO_4.1', 'Leisure Guest Lifecycle failed', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scenario 4.2: Corporate Guest Journey with Order Cancellation & Replacement
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    console.log('\n   💼 Executing Scenario 4.2: Corporate Guest Order Adjustment & Settlement...');

    // Step 1: Order initial service
    const order1Res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 1,
        note: 'Initial meeting setup',
      },
    });
    assert.strictEqual(order1Res.status, 201);
    const order1Id = order1Res.data?.data?.OrderId || order1Res.data?.data?.orderId;

    // Step 2: Cancel initial service with valid business reason
    const cancelRes = await request(`/service-orders/${order1Id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Cancelled', cancelReason: 'Khách dời cuộc họp sang ngày mai' },
    });
    assert.strictEqual(cancelRes.status, 200);

    // Step 3: Place replacement service order
    const order2Res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 1,
        note: 'Replacement express laundry',
      },
    });
    assert.strictEqual(order2Res.status, 201);
    const order2Id = order2Res.data?.data?.OrderId || order2Res.data?.data?.orderId;

    // Step 4: Complete replacement order
    await request(`/service-orders/${order2Id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });

    // Step 5: Verify Folio charges only contains Completed order, not Cancelled
    const chargesRes = await request(`/bookings/${stayFixture.bookingId}/charges`, {
      headers: adminHeaders,
    });
    assert.strictEqual(chargesRes.status, 200);
    const services = chargesRes.data?.data?.stays?.flatMap((s) => s.services || []) || [];
    const hasOrder1 = services.some((s) => (s.orderId || s.OrderId) === order1Id);
    const hasOrder2 = services.some((s) => (s.orderId || s.OrderId) === order2Id);
    assert.strictEqual(hasOrder1, false, 'Cancelled order must not be charged');
    assert.strictEqual(hasOrder2, true, 'Completed replacement order must be charged');

    tracker.recordPass('SCENARIO_4.2', 'Corporate Guest Journey: Order -> Cancellation with reason -> Replacement -> Folio Integrity');
  } catch (err) {
    tracker.recordFail('SCENARIO_4.2', 'Corporate Guest Journey failed', err);
  }

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exitCode = s.failed > 0 ? 1 : 0;
  });
}

module.exports = { run };
