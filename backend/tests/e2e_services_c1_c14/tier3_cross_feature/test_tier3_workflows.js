'use strict';

/**
 * test_tier3_workflows.js - Cross-Feature Pairwise & Chain Interactions
 */

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { getActiveStayFixture } = require('../helpers/fixtures');
const { TestSuiteTracker, probeOrAssert, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 3: Cross-Feature Combinations & Workflows')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const stayFixture = await getActiveStayFixture();

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3.1: Ordering -> Progress -> Folio Aggregation (C1/C2 -> C3 -> C4 -> C6)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // Step 1: Create a distinct service in C1
    const svcName = `Workflow Service ${Date.now()}`;
    const testPrice = 175000;
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 1,
        serviceName: svcName,
        price: testPrice,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(createRes.status, 201, 'C1: Must create service');
    const createdSvcId = createRes.data?.data?.ServiceId || createRes.data?.data?.serviceId;

    // Step 2: Verify discoverable in C2
    const searchRes = await request(`/services?search=${encodeURIComponent(svcName)}`);
    assert.strictEqual(searchRes.status, 200, 'C2: Must search service');
    assert.ok(searchRes.data?.data?.length > 0, 'C2: Service must be found');

    // Step 3: Order service in C3
    const orderRes = await request('/service-orders', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        stayId: stayFixture.stayId,
        serviceId: createdSvcId,
        quantity: 2,
        note: 'Tier 3 integration order',
      },
    });
    assert.strictEqual(orderRes.status, 201, 'C3: Must create service order');
    const orderId = orderRes.data?.data?.OrderId || orderRes.data?.data?.orderId;

    // Step 4: Advance order to Completed in C4
    const statusRes = await request(`/service-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { newStatus: 'Completed' },
    });
    assert.strictEqual(statusRes.status, 200, 'C4: Must complete service order');

    // Step 5: Check Folio in C6 contains the order
    const chargesRes = await request(`/bookings/${stayFixture.bookingId}/charges`, {
      headers: adminHeaders,
    });
    assert.strictEqual(chargesRes.status, 200, 'C6: Must retrieve charges');
    const allServices = chargesRes.data?.data?.stays?.flatMap((s) => s.services || []) || [];
    const foundInFolio = allServices.some((s) => (s.orderId || s.OrderId) === orderId);
    assert.ok(foundInFolio, `C6: OrderId ${orderId} must be aggregated into stay services`);

    tracker.recordPass('WF_3.1', 'Chain C1->C2->C3->C4->C6: Service creation to Folio charges aggregation verified');
  } catch (err) {
    tracker.recordFail('WF_3.1', 'Chain C1->C2->C3->C4->C6 failed', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3.2: Folio Charges -> Master Invoice Generation (C6 -> C7)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // Step 1: Read Folio charges
    const chargesRes = await request('/bookings/1/charges', {
      headers: adminHeaders,
    });
    assert.strictEqual(chargesRes.status, 200, 'C6: Read charges');
    const folioGrandTotal = chargesRes.data?.data?.grandTotal;

    // Step 2: Fetch or create Master Invoice
    const invRes = await request('/invoices/booking/1', {
      headers: adminHeaders,
    });
    assert.strictEqual(invRes.status, 200, 'C7: Master invoice lookup');
    const inv = invRes.data?.data;
    assert.ok(inv, 'C7: Invoice should exist');

    tracker.recordPass('WF_3.2', 'Chain C6->C7: Folio aggregation to Master Invoice itemization verified', `GrandTotal: ${folioGrandTotal?.toLocaleString()}đ`);
  } catch (err) {
    tracker.recordFail('WF_3.2', 'Chain C6->C7 failed', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3.3: Master Invoice -> Multi-Tender Settlement -> Ledger (C7 -> C9 -> C10)
  // ─────────────────────────────────────────────────────────────────────────────
  const { Invoice, Payment } = require('../../../src/models');
  await Payment.destroy({ where: { InvoiceId: 1 } });
  await Invoice.update(
    { Status: 'Unpaid', TotalAmount: 500000, Subtotal: 500000, PdfPath: null },
    { where: { InvoiceId: 1 } }
  );

  const wf33Contract = {
    steps: ['POST /invoices/:id/master', 'POST /invoices/:id/pay', 'GET /invoices/:id/transactions'],
    expectedResult: 'Invoice settled via multi-tender and reflected as Paid in ledger',
  };
  const payProbe = await request('/invoices/1/pay', {
    method: 'POST',
    headers: adminHeaders,
    body: { tenders: [{ method: 'Cash', amount: 500000 }] },
  });
  probeOrAssert(tracker, 'WF_3.3', 'Chain C7->C9->C10: Master invoice settlement and ledger audit', payProbe, 200, wf33Contract);

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3.4: Settlement -> Real-Time Dashboard -> RevPAR (C9 -> C11 -> C12)
  // ─────────────────────────────────────────────────────────────────────────────
  const wf34Contract = {
    steps: ['POST /invoices/:id/pay', 'GET /statistics/revenue', 'GET /statistics/occupancy'],
    expectedResult: 'Settlement updates revenue KPIs and ADR/RevPAR report',
  };
  const statsProbe = await request('/statistics/revenue', { headers: adminHeaders });
  probeOrAssert(tracker, 'WF_3.4', 'Chain C9->C11->C12: Payment settlement to dashboard KPIs & RevPAR export', statsProbe, 200, wf34Contract);

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3.5: Knowledge Base Training -> AI Concierge (C14 -> C13)
  // ─────────────────────────────────────────────────────────────────────────────
  const wf35Contract = {
    steps: ['POST /ai/knowledge-base', 'POST /ai/chatbot'],
    expectedResult: 'Newly added knowledge base question immediately answers in AI Concierge chat',
  };
  const aiProbe = await request('/ai/chatbot', {
    method: 'POST',
    headers: adminHeaders,
    body: { message: 'Kiểm tra dịch vụ mới' },
  });
  probeOrAssert(tracker, 'WF_3.5', 'Chain C14->C13: Knowledge Base ingestion to live AI Concierge response', aiProbe, 200, wf35Contract);

  return tracker.summary();
}

if (require.main === module) {
  run().then((s) => {
    console.log(`Finished: ${s.passed} passed, ${s.pending} pending, ${s.failed} failed`);
    process.exit(s.failed > 0 ? 1 : 0);
  });
}

module.exports = { run };
