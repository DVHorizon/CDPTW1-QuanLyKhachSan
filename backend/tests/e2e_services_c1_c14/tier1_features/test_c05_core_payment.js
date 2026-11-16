'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getPayableBookingFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C5 - Core Payment Module')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const payableFixture = await getPayableBookingFixture();

  let testPaymentId = null;

  // TC_C05_01: Health check ping
  try {
    const res = await request('/payments/ping');
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.data?.module, 'payments');
    tracker.recordPass('TC_C05_01', 'GET /payments/ping verifies payment module readiness', res.data?.status);
  } catch (err) {
    tracker.recordFail('TC_C05_01', 'GET /payments/ping verifies payment module readiness', err);
  }

  // TC_C05_02: Create Cash payment for Booking
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'Cash',
        amount: 250000,
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'SUCCESS_0001_CREATED');
    testPaymentId = res.data?.data?.PaymentId || res.data?.data?.paymentId;
    assert.ok(testPaymentId, 'PaymentId must be returned');
    assert.strictEqual(res.data?.data?.Status || res.data?.data?.status, 'Paid');
    tracker.recordPass('TC_C05_02', 'Staff creates Cash payment for booking (Paid immediately)', `PaymentId: ${testPaymentId}`);
  } catch (err) {
    tracker.recordFail('TC_C05_02', 'Staff creates Cash payment for booking', err);
  }

  // TC_C05_03: GET /payments/:paymentId
  try {
    const pId = testPaymentId || 1;
    const res = await request(`/payments/${pId}`, {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.data, 'Should return payment record');
    tracker.recordPass('TC_C05_03', 'GET /payments/:paymentId retrieves transaction details', `Amount: ${res.data.data.Amount}`);
  } catch (err) {
    tracker.recordFail('TC_C05_03', 'GET /payments/:paymentId retrieves transaction details', err);
  }

  // TC_C05_04: Create VietQR payment request
  try {
    const res = await request('/payments', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: payableFixture.bookingId,
        method: 'VietQR',
        amount: 300000,
      },
    });
    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected 200 or 201 for VietQR payment, got ${res.status}`
    );
    const txnCode = res.data?.data?.TransactionCode || res.data?.data?.transactionCode;
    assert.ok(txnCode, 'TransactionCode must be generated for VietQR');
    tracker.recordPass('TC_C05_04', 'Create VietQR payment request generates transaction code', `Code: ${txnCode}`);
  } catch (err) {
    tracker.recordFail('TC_C05_04', 'Create VietQR payment request generates transaction code', err);
  }

  // TC_C05_05: Process refund on Paid payment
  try {
    const pId = testPaymentId;
    assert.ok(pId, 'Requires test payment from TC_C05_02');
    const res = await request(`/payments/${pId}/refund`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: {
        refundAmount: 250000,
        refundReason: 'Khách đổi kế hoạch lịch trình E2E test',
      },
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const actualStatus = res.data?.data?.Status || res.data?.data?.status;
    assert.strictEqual(actualStatus, 'Refunded', 'Status should be Refunded');
    tracker.recordPass('TC_C05_05', 'Admin processes refund on Paid payment', `PaymentId: ${pId}, Status: Refunded`);
  } catch (err) {
    tracker.recordFail('TC_C05_05', 'Admin processes refund on Paid payment', err);
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
