'use strict';

/**
 * backend/tests/load_test_folio_settlement.js
 *
 * HIGH-CONCURRENCY LOAD & STRESS TEST HARNESS — REQUIREMENT R3
 * Focus:
 *   Scenario A: Concurrent Folio Aggregation (50 simultaneous read requests)
 *   Scenario B: Concurrent Invoice Settlement Race Condition (20 simultaneous write requests)
 *   Scenario C: Concurrent Partial Settlement Over-Allocation Guard (10 simultaneous split requests)
 *   Scenario D: Concurrent Master Invoice Generation Race Condition (5 simultaneous create requests)
 *
 * Verifies:
 *   - Database pessimistic locking (transaction.LOCK.UPDATE)
 *   - Zero double deductions / zero double payments
 *   - Zero negative balance anomalies
 *   - Throughput (RPS) and latency percentiles (p50, p90, p95, p99)
 *   - Data consistency across repeated concurrent reads
 */

const assert = require('assert');
const path = require('path');
const { performance } = require('perf_hooks');

const rootDir = path.resolve(__dirname, '../..');
const { request } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/apiClient'));
const { getAuthContext } = require(path.join(rootDir, 'backend/tests/e2e_services_c1_c14/helpers/authHelper'));
const {
  sequelize,
  Booking,
  Stay,
  Room,
  RoomType,
  Invoice,
  InvoiceDetail,
  Payment,
  User,
} = require(path.join(rootDir, 'backend/src/models'));

// ─── UTILITY HELPERS FOR STATISTICAL ANALYSIS ────────────────────────────────
function computeStats(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;
  const p = (pct) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];

  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    p50: Math.round(p(50) * 100) / 100,
    p90: Math.round(p(90) * 100) / 100,
    p95: Math.round(p(95) * 100) / 100,
    p99: Math.round(p(99) * 100) / 100,
  };
}

// ─── FIXTURE SETUP & CLEANUP ────────────────────────────────────────────────
async function setupTestBookingWithStay(status = 'CheckedIn') {
  const room = await Room.findOne();
  const roomType = await RoomType.findOne();
  const user = await User.findOne();

  const booking = await Booking.create({
    UserId: user ? user.UserId : 1,
    RoomTypeId: roomType ? roomType.RoomTypeId : 1,
    ConfirmationCode: `LOAD-TEST-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
    NumberOfNights: 3,
    RoomQuantity: 1,
    RoomSubtotal: 3000000,
    TotalAmount: 3000000,
    DepositAmount: 500000,
    SurchargeAmount: 100000,
    DiscountAmount: 50000,
    Status: status,
    CreatedAt: new Date(),
  });

  const stay = await Stay.create({
    BookingId: booking.BookingId,
    RoomId: room ? room.RoomId : 1,
    CheckInDate: '2026-11-01',
    CheckOutDate: '2026-11-04',
    ActualCheckIn: '2026-11-01T14:00:00Z',
    ActualCheckOut: status === 'CheckedOut' ? '2026-11-04T12:00:00Z' : null,
    Status: status,
    CreatedAt: new Date(),
  });

  return { booking, stay };
}

async function cleanupTestBooking(bookingId) {
  if (!bookingId) return;
  const invoices = await Invoice.findAll({ where: { BookingId: bookingId } });
  const invoiceIds = invoices.map((i) => i.InvoiceId);
  if (invoiceIds.length > 0) {
    await Payment.destroy({ where: { InvoiceId: invoiceIds } });
    await InvoiceDetail.destroy({ where: { InvoiceId: invoiceIds } });
    await Invoice.destroy({ where: { InvoiceId: invoiceIds } });
  }
  await Payment.destroy({ where: { BookingId: bookingId } });
  await Stay.destroy({ where: { BookingId: bookingId } });
  await Booking.destroy({ where: { BookingId: bookingId } });
}

// ─── MAIN LOAD TEST SUITE ────────────────────────────────────────────────────
async function runLoadTestSuite() {
  console.log('================================================================================');
  console.log('⚡ GRAND HORIZON PMS — HIGH-CONCURRENCY LOAD & STRESS TEST HARNESS (R3)');
  console.log('================================================================================\n');

  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const summaryReport = {
    totalScenarios: 4,
    passedScenarios: 0,
    failedScenarios: 0,
    metrics: {},
  };

  // ============================================================================
  // SCENARIO A: CONCURRENT FOLIO AGGREGATION BURST (READ STRESS)
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SCENARIO A: CONCURRENT FOLIO AGGREGATION (50 SIMULTANEOUS READ REQUESTS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { booking: readBooking } = await setupTestBookingWithStay('CheckedIn');
  const CONCURRENT_READS = 50;

  try {
    const latencies = [];
    const startTime = performance.now();

    const readPromises = Array.from({ length: CONCURRENT_READS }, async (_, idx) => {
      const t0 = performance.now();
      const res = await request(`/bookings/${readBooking.BookingId}/charges`, {
        method: 'GET',
        headers: adminHeaders,
      });
      const t1 = performance.now();
      latencies.push(t1 - t0);
      return { idx, status: res.status, data: res.data };
    });

    const results = await Promise.all(readPromises);
    const totalDuration = performance.now() - startTime;
    const stats = computeStats(latencies);
    const rps = Math.round((CONCURRENT_READS / (totalDuration / 1000)) * 100) / 100;

    const status200Count = results.filter((r) => r.status === 200).length;
    const allGrandTotals = results.map((r) => r.data?.data?.grandTotal);
    const firstGrandTotal = allGrandTotals[0];
    const isConsistent = allGrandTotals.every((gt) => gt === firstGrandTotal);

    console.log(`  ⏱️  Total Duration:     ${Math.round(totalDuration)} ms`);
    console.log(`  🚀 Throughput:         ${rps} req/sec`);
    console.log(`  📈 Latency (min/avg/max): ${stats.min} / ${stats.avg} / ${stats.max} ms`);
    console.log(`  📊 Latency Percentiles:  p50=${stats.p50}ms, p90=${stats.p90}ms, p95=${stats.p95}ms, p99=${stats.p99}ms`);
    console.log(`  ✅ HTTP 200 Success:   ${status200Count} / ${CONCURRENT_READS} (${(status200Count / CONCURRENT_READS) * 100}%)`);
    console.log(`  🔒 Data Consistency:   ${isConsistent ? 'PERFECT (100% Identical GrandTotals)' : 'MISMATCH DETECTED'}`);

    assert.strictEqual(status200Count, CONCURRENT_READS, 'All 50 read requests must return HTTP 200');
    assert.strictEqual(isConsistent, true, 'All 50 responses must return identical financial figures');

    summaryReport.passedScenarios++;
    summaryReport.metrics.scenarioA = { throughputRps: rps, latencyP95: stats.p95, successRate: 100, latencies: stats };
    console.log('  👉 SCENARIO A VERDICT: [PASS]\n');
  } catch (err) {
    summaryReport.failedScenarios++;
    console.error('  ❌ SCENARIO A FAILED:', err.message);
  } finally {
    await cleanupTestBooking(readBooking.BookingId);
  }

  // ============================================================================
  // SCENARIO B: CONCURRENT SETTLEMENT RACE CONDITION (WRITE-LOCK STRESS)
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💳 SCENARIO B: CONCURRENT SETTLEMENT RACE CONDITION (20 SIMULTANEOUS WRITES)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { booking: payBooking } = await setupTestBookingWithStay('CheckedOut');
  let testInvoice = null;

  try {
    // Tạo Master Invoice trị giá 1,000,000 VND
    testInvoice = await Invoice.create({
      BookingId: payBooking.BookingId,
      InvoiceNumber: `INV-LOAD-${Date.now()}`,
      InvoiceDate: new Date(),
      Subtotal: 1000000,
      VATRate: 0,
      VATAmount: 0,
      TotalAmount: 1000000,
      Status: 'Unpaid',
    });

    const CONCURRENT_SETTLEMENTS = 20;
    const latencies = [];
    const tStart = performance.now();

    // Bắn đồng thời 20 yêu cầu quyết toán toàn bộ số tiền 1.000.000đ
    const settlePromises = Array.from({ length: CONCURRENT_SETTLEMENTS }, async (_, idx) => {
      const t0 = performance.now();
      const res = await request(`/invoices/${testInvoice.InvoiceId}/pay`, {
        method: 'POST',
        headers: adminHeaders,
        body: {
          tenders: [{ method: 'Cash', amount: 1000000, customerCashGiven: 1000000 }],
          note: `Concurrent settlement burst worker #${idx + 1}`,
        },
      });
      const t1 = performance.now();
      latencies.push(t1 - t0);
      return { idx, status: res.status, data: res.data };
    });

    const results = await Promise.all(settlePromises);
    const duration = performance.now() - tStart;
    const stats = computeStats(latencies);

    const success200s = results.filter((r) => r.status === 200);
    const rejected400s = results.filter(
      (r) => r.status === 400 && r.data?.code === 'ERROR_0022_ALREADY_SETTLED'
    );

    // Kiểm tra trực tiếp Cơ sở dữ liệu
    const dbPayments = await Payment.findAll({ where: { InvoiceId: testInvoice.InvoiceId } });
    const freshInvoice = await Invoice.findByPk(testInvoice.InvoiceId);

    console.log(`  ⏱️  Total Duration:     ${Math.round(duration)} ms`);
    console.log(`  📈 Latency (min/avg/max): ${stats.min} / ${stats.avg} / ${stats.max} ms`);
    console.log(`  📊 Latency Percentiles:  p50=${stats.p50}ms, p95=${stats.p95}ms, p99=${stats.p99}ms`);
    console.log(`  🎯 Success (200 OK):   ${success200s.length} request (Expected: exactly 1)`);
    console.log(`  🛡️  Rejected (400):     ${rejected400s.length} requests (Expected: exactly 19)`);
    console.log(`  💾 DB Payments Count:  ${dbPayments.length} (Zero double payments)`);
    console.log(`  🏷️  Invoice Final Status: ${freshInvoice.Status} (Expected: Paid)`);

    assert.strictEqual(success200s.length, 1, 'Exactly 1 concurrent payment request must succeed');
    assert.strictEqual(rejected400s.length, CONCURRENT_SETTLEMENTS - 1, 'All other 19 requests must be rejected with 400 ERROR_0022_ALREADY_SETTLED');
    assert.strictEqual(dbPayments.length, 1, 'Database must contain exactly 1 Payment record');
    assert.strictEqual(freshInvoice.Status, 'Paid', 'Invoice status must be Paid');
    assert.strictEqual(Number(dbPayments[0].Amount), 1000000, 'Payment amount must equal 1,000,000 VND');

    summaryReport.passedScenarios++;
    summaryReport.metrics.scenarioB = { zeroDoublePayment: true, dbIntegrity: true, rejectedCount: 19, latencies: stats };
    console.log('  👉 SCENARIO B VERDICT: [PASS]\n');
  } catch (err) {
    summaryReport.failedScenarios++;
    console.error('  ❌ SCENARIO B FAILED:', err.message);
  } finally {
    await cleanupTestBooking(payBooking.BookingId);
  }

  // ============================================================================
  // SCENARIO C: CONCURRENT PARTIAL PAYMENTS (OVERPAYMENT PREVENTION)
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 SCENARIO C: CONCURRENT PARTIAL SETTLEMENT (10 BURST REQUESTS OF 350K ON 1M)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { booking: partialBooking } = await setupTestBookingWithStay('CheckedOut');
  let partialInvoice = null;

  try {
    partialInvoice = await Invoice.create({
      BookingId: partialBooking.BookingId,
      InvoiceNumber: `INV-PARTIAL-${Date.now()}`,
      InvoiceDate: new Date(),
      Subtotal: 1000000,
      VATRate: 0,
      VATAmount: 0,
      TotalAmount: 1000000,
      Status: 'Unpaid',
    });

    // 10 worker cùng cố trả 350,000đ qua Thẻ (Card). 2 lần = 700k. Lần 3 = 1050k > 1M -> Phải chặn!
    const PARTIAL_WORKERS = 10;
    const partialPromises = Array.from({ length: PARTIAL_WORKERS }, async (_, idx) => {
      const res = await request(`/invoices/${partialInvoice.InvoiceId}/pay`, {
        method: 'POST',
        headers: adminHeaders,
        body: {
          tenders: [{ method: 'Card', amount: 350000, transactionCode: `CRD-BURST-${idx + 1}` }],
          note: `Partial payment burst worker #${idx + 1}`,
        },
      });
      return { idx, status: res.status, data: res.data };
    });

    const pResults = await Promise.all(partialPromises);
    const p200s = pResults.filter((r) => r.status === 200);
    const p400s = pResults.filter((r) => r.status === 400);

    const dbPartialPayments = await Payment.findAll({ where: { InvoiceId: partialInvoice.InvoiceId } });
    const totalPaidSum = dbPartialPayments.reduce((s, p) => s + Number(p.Amount || 0), 0);
    const freshPartialInvoice = await Invoice.findByPk(partialInvoice.InvoiceId);

    console.log(`  🎯 Partial Success (200 OK): ${p200s.length} (Expected: exactly 2)`);
    console.log(`  🛡️  Overpayment Blocked (400): ${p400s.length} (Expected: exactly 8)`);
    console.log(`  💵 Total Amount Paid in DB:    ${totalPaidSum.toLocaleString()} VND (Expected: 700,000 VND)`);
    console.log(`  🏷️  Invoice Final Status:       ${freshPartialInvoice.Status} (Expected: PartiallyPaid)`);

    assert.strictEqual(p200s.length, 2, 'Exactly 2 partial payments of 350k must succeed (sum = 700k <= 1M)');
    assert.strictEqual(p400s.length, 8, 'Remaining 8 requests must be rejected to prevent negative balance');
    assert.strictEqual(totalPaidSum, 700000, 'Total paid in DB must not exceed 700,000 VND');
    assert.strictEqual(freshPartialInvoice.Status, 'PartiallyPaid');

    summaryReport.passedScenarios++;
    summaryReport.metrics.scenarioC = { noOverpayment: true, finalPaid: 700000 };
    console.log('  👉 SCENARIO C VERDICT: [PASS]\n');
  } catch (err) {
    summaryReport.failedScenarios++;
    console.error('  ❌ SCENARIO C FAILED:', err.message);
  } finally {
    await cleanupTestBooking(partialBooking.BookingId);
  }

  // ============================================================================
  // SCENARIO D: CONCURRENT MASTER INVOICE CREATION RACE
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📑 SCENARIO D: CONCURRENT MASTER INVOICE CREATION (5 SIMULTANEOUS REQUESTS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { booking: invoiceBooking } = await setupTestBookingWithStay('CheckedOut');

  try {
    const INVOICE_WORKERS = 5;
    const invPromises = Array.from({ length: INVOICE_WORKERS }, async (_, idx) => {
      const res = await request('/invoices/master', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          bookingId: invoiceBooking.BookingId,
          vatRate: 10,
          bypassCheckOutRule: true,
        },
      });
      return { idx, status: res.status, data: res.data };
    });

    const invResults = await Promise.all(invPromises);
    const inv201s = invResults.filter((r) => r.status === 201);
    const inv409s = invResults.filter((r) => r.status === 409 && r.data?.code === 'ERROR_0017_ALREADY_EXISTS');

    const createdInvoices = await Invoice.findAll({ where: { BookingId: invoiceBooking.BookingId } });

    console.log(`  🎯 Created Invoices (201):    ${inv201s.length} (Expected: exactly 1)`);
    console.log(`  🛡️  Conflict Rejections (409): ${inv409s.length} (Expected: exactly ${INVOICE_WORKERS - 1})`);
    console.log(`  💾 Invoices in Database:       ${createdInvoices.length} (Zero duplicate invoices)`);

    assert.strictEqual(inv201s.length, 1, 'Exactly 1 master invoice must be created');
    assert.strictEqual(inv409s.length, INVOICE_WORKERS - 1, 'All other requests must return 409 Conflict');
    assert.strictEqual(createdInvoices.length, 1, 'Database must contain exactly 1 invoice for this booking');

    summaryReport.passedScenarios++;
    summaryReport.metrics.scenarioD = { zeroDuplicateInvoices: true };
    console.log('  👉 SCENARIO D VERDICT: [PASS]\n');
  } catch (err) {
    summaryReport.failedScenarios++;
    console.error('  ❌ SCENARIO D FAILED:', err.message);
  } finally {
    await cleanupTestBooking(invoiceBooking.BookingId);
  }

  // ============================================================================
  // FINAL LOAD TEST SUMMARY
  // ============================================================================
  console.log('================================================================================');
  console.log('🏁 FINAL LOAD TEST EXECUTION SUMMARY (R3)');
  console.log('================================================================================');
  console.log(`  Total Scenarios Executed: ${summaryReport.totalScenarios}`);
  console.log(`  Passed Scenarios:         ${summaryReport.passedScenarios}`);
  console.log(`  Failed Scenarios:         ${summaryReport.failedScenarios}`);
  console.log('--------------------------------------------------------------------------------');
  if (summaryReport.failedScenarios === 0) {
    console.log('  🎉 ALL CONCURRENCY & LOAD TEST SCENARIOS PASSED WITH ZERO ANOMALIES! (100%)');
  } else {
    console.log('  ⚠️ SOME CONCURRENCY SCENARIOS FAILED!');
  }
  console.log('================================================================================\n');

  return summaryReport;
}

if (require.main === module) {
  runLoadTestSuite()
    .then((rep) => {
      process.exit(rep.failedScenarios > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal load test runner error:', err);
      process.exit(1);
    });
}

module.exports = { runLoadTestSuite };
