'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getActiveStayFixture, getActiveServiceFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C3 - Boundaries & Ordering Edge Cases')) {
  const { adminToken, guestToken, guestUser } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };

  const stayFixture = await getActiveStayFixture();
  const serviceFixture = await getActiveServiceFixture();

  // TC_B03_01: Order for non-existent stayId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: 999999,
        serviceId: serviceFixture.serviceId,
        quantity: 1,
      },
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_B03_01', 'Order with non-existent stayId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_B03_01', 'Order with non-existent stayId', err);
  }

  // TC_B03_02: Order with quantity = 0 -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: 0,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B03_02', 'Order with quantity = 0 returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B03_02', 'Order with quantity = 0', err);
  }

  // TC_B03_03: Order with negative quantity -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: serviceFixture.serviceId,
        quantity: -3,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B03_03', 'Order with negative quantity returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B03_03', 'Order with negative quantity', err);
  }

  // TC_B03_04: Order for Inactive service -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    // First, find or create an Inactive service
    const inactRes = await request('/services?status=Inactive');
    let inactiveServiceId = inactRes.data?.data?.[0]?.ServiceId || inactRes.data?.data?.[0]?.serviceId;

    if (!inactiveServiceId) {
      // create and deactivate
      const createRes = await request('/services', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          categoryId: 1,
          serviceName: `Dịch vụ Inactive Test ${Date.now()}`,
          price: 100000,
          unit: 'Lượt',
        },
      });
      inactiveServiceId = createRes.data?.data?.ServiceId || createRes.data?.data?.serviceId;
      await request(`/services/${inactiveServiceId}/deactivate`, {
        method: 'PATCH',
        headers: adminHeaders,
      });
    }

    const res = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: inactiveServiceId,
        quantity: 1,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    tracker.recordPass('TC_B03_04', 'Order for Inactive service returns 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_B03_04', 'Order for Inactive service', err);
  }

  // TC_B03_05: Guest ordering for unauthorized stay -> 403 ERROR_0010_FORBIDDEN
  try {
    // Find a stay owned by a different user (e.g. userId 1 or not current guest)
    const currentGuestId = guestUser?.userId || guestUser?.UserId || 5;
    const staysRes = await request('/service-orders/active-stays');
    const unownedStay = (staysRes.data?.data || []).find((s) => {
      const ownerId = s.Booking?.user?.UserId ?? s.Booking?.UserId;
      return ownerId !== undefined && Number(ownerId) !== Number(currentGuestId);
    });
    const unownedStayId = unownedStay?.StayId || unownedStay?.stayId || 16;

    const res = await request('/service-orders', {
      method: 'POST',
      headers: guestHeaders,
      body: {
        stayId: unownedStayId,
        serviceId: serviceFixture.serviceId,
        quantity: 1,
      },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for cross-tenant guest order, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B03_05', `Guest ordering for unowned stay (StayId: ${unownedStayId}) returns 403 ERROR_0010_FORBIDDEN`);
  } catch (err) {
    tracker.recordFail('TC_B03_05', 'Guest ordering for unowned stay', err);
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
