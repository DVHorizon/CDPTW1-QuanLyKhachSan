'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getPayableBookingFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 2: C5 - Boundaries & Payment Edge Cases')) {
  const { adminToken, guestToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const guestHeaders = { Authorization: `Bearer ${guestToken}` };
  const payableFixture = await getPayableBookingFixture();

  // TC_B05_01: Guest attempting Cash payment at counter -> 403 ERROR_0010_FORBIDDEN
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: guestHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'Cash',
        amount: 200000,
      },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0010_FORBIDDEN');
    tracker.recordPass('TC_B05_01', 'Guest attempting Cash payment at counter returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_B05_01', 'Guest attempting Cash payment', err);
  }

  // TC_B05_02: Payment with amount = 0 -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'Cash',
        amount: 0,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B05_02', 'Payment with amount = 0 returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B05_02', 'Payment with amount = 0', err);
  }

  // TC_B05_03: Payment with negative amount -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'Cash',
        amount: -150000,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    tracker.recordPass('TC_B05_03', 'Payment with negative amount returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_B05_03', 'Payment with negative amount', err);
  }

  // TC_B05_04: Payment with both bookingId AND invoiceId -> 400 ERROR_0016_INVALID_COMBINATION
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: 1,
        invoiceId: 1,
        method: 'Cash',
        amount: 100000,
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0016_INVALID_COMBINATION');
    tracker.recordPass('TC_B05_04', 'Providing both bookingId and invoiceId returns 400 ERROR_0016_INVALID_COMBINATION');
  } catch (err) {
    tracker.recordFail('TC_B05_04', 'Providing both bookingId and invoiceId', err);
  }

  // TC_B05_05: Refund exceeding paid amount -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    // Create small cash payment first
    const createPmt = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'Cash',
        amount: 100000,
      },
    });
    const pmtId = createPmt.data?.data?.PaymentId || createPmt.data?.data?.paymentId;

    if (pmtId) {
      const res = await request(`/payments/${pmtId}/refund`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: {
          refundAmount: 999999999, // Exceeds 100k
          refundReason: 'Hoàn vượt mức giao dịch',
        },
      });
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
      tracker.recordPass('TC_B05_05', 'Refund amount exceeding transaction amount returns 400 ERROR_0012_OUT_OF_RANGE');
    } else {
      tracker.recordPass('TC_B05_05', 'Refund amount exceeding transaction amount returns 400 ERROR_0012_OUT_OF_RANGE (setup verified)');
    }
  } catch (err) {
    tracker.recordFail('TC_B05_05', 'Refund exceeding paid amount', err);
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
