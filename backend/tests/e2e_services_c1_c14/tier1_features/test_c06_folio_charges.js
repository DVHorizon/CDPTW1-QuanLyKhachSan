'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C6 - Folio Charges Aggregation')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let chargesData = null;

  // TC_C06_01: GET /bookings/:bookingId/charges
  try {
    const res = await request('/bookings/1/charges', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.success, 'Should indicate success');
    chargesData = res.data?.data;
    assert.ok(chargesData, 'Should return charges data');
    assert.strictEqual(typeof chargesData.grandTotal, 'number');
    tracker.recordPass('TC_C06_01', 'GET /bookings/:id/charges retrieves folio charges', `GrandTotal: ${chargesData.grandTotal.toLocaleString()}đ`);
  } catch (err) {
    tracker.recordFail('TC_C06_01', 'GET /bookings/:id/charges retrieves folio charges', err);
  }

  // TC_C06_02: Detailed breakdown structure
  try {
    assert.ok(chargesData, 'Requires chargesData from TC_C06_01');
    assert.ok(Array.isArray(chargesData.stays), 'Should contain stays breakdown array');
    assert.ok(chargesData.stays.length > 0, 'Should have at least 1 stay');
    const firstStay = chargesData.stays[0];
    assert.ok(firstStay.room, 'Stay should contain room details');
    assert.ok(Array.isArray(firstStay.services), 'Stay should contain services list');
    assert.ok(Array.isArray(firstStay.minibar), 'Stay should contain minibar list');
    assert.ok(Array.isArray(firstStay.food), 'Stay should contain food list');
    assert.strictEqual(typeof firstStay.staySubtotal, 'number', 'Stay should have staySubtotal');
    tracker.recordPass('TC_C06_02', 'Folio response includes full structural breakdown across stays & services');
  } catch (err) {
    tracker.recordFail('TC_C06_02', 'Folio response includes full structural breakdown', err);
  }

  // TC_C06_03: hasPendingServices flag
  try {
    assert.ok(chargesData, 'Requires chargesData from TC_C06_01');
    assert.strictEqual(typeof chargesData.hasPendingServices, 'boolean', 'hasPendingServices must be boolean');
    tracker.recordPass('TC_C06_03', 'Folio charges hasPendingServices indicates in-progress service resolution', `hasPendingServices: ${chargesData.hasPendingServices}`);
  } catch (err) {
    tracker.recordFail('TC_C06_03', 'Folio charges hasPendingServices flag', err);
  }

  // TC_C06_04: Mathematical consistency check
  try {
    assert.ok(chargesData, 'Requires chargesData from TC_C06_01');
    const computedSum = chargesData.stays.reduce((sum, s) => sum + Number(s.staySubtotal || 0), 0)
      + Number(chargesData.surchargeAmount || 0)
      - Number(chargesData.discountAmount || 0);
    assert.strictEqual(chargesData.grandTotal, computedSum, `grandTotal (${chargesData.grandTotal}) must match sum of staySubtotals (${computedSum})`);
    tracker.recordPass('TC_C06_04', 'Folio arithmetic formula grandTotal = sum(staySubtotal) + surcharge - discount verified');
  } catch (err) {
    tracker.recordFail('TC_C06_04', 'Folio arithmetic formula verified', err);
  }

  // TC_C06_05: Idempotency across repeated invocations
  try {
    const res2 = await request('/bookings/1/charges', {
      headers: adminHeaders,
    });
    assert.strictEqual(res2.status, 200, `Expected 200 OK, got ${res2.status}`);
    assert.strictEqual(res2.data?.data?.grandTotal, chargesData?.grandTotal, 'GrandTotal must be identical on second call');
    assert.strictEqual(res2.data?.data?.remainingBalance, chargesData?.remainingBalance, 'RemainingBalance must be identical');
    tracker.recordPass('TC_C06_05', 'Folio charges aggregation is pure idempotent read operation');
  } catch (err) {
    tracker.recordFail('TC_C06_05', 'Folio charges aggregation is pure idempotent read operation', err);
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
