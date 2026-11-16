'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C7 - Master Folio Invoice')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  let activeInvoiceId = 1;
  let activeInvoiceNumber = '';

  // TC_C07_01: POST /invoices/master
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: 1,
        vatRate: 10,
        bypassCheckOutRule: true,
      },
    });

    if (res.status === 201) {
      activeInvoiceId = res.data?.data?.invoiceId || res.data?.data?.InvoiceId;
      activeInvoiceNumber = res.data?.data?.invoiceNumber || res.data?.data?.InvoiceNumber;
      tracker.recordPass('TC_C07_01', 'POST /invoices/master creates master invoice (201 Created)', `Invoice: ${activeInvoiceNumber}`);
    } else if (res.status === 409 && res.data?.code === 'ERROR_0017_ALREADY_EXISTS') {
      activeInvoiceId = res.data.existingInvoiceId;
      activeInvoiceNumber = res.data.invoiceNumber;
      tracker.recordPass('TC_C07_01', 'POST /invoices/master recognizes existing master invoice', `Invoice: ${activeInvoiceNumber}`);
    } else {
      assert.fail(`Unexpected response: ${res.status} ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    tracker.recordFail('TC_C07_01', 'POST /invoices/master creates master invoice', err);
  }

  // TC_C07_02: Idempotency duplicate check -> 409 ERROR_0017_ALREADY_EXISTS
  try {
    const res = await request('/invoices/master', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        bookingId: 1,
        bypassCheckOutRule: true,
      },
    });
    assert.strictEqual(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0017_ALREADY_EXISTS');
    tracker.recordPass('TC_C07_02', 'Duplicate master invoice creation prevented (409 ERROR_0017_ALREADY_EXISTS)');
  } catch (err) {
    tracker.recordFail('TC_C07_02', 'Duplicate master invoice creation prevented', err);
  }

  // TC_C07_03: GET /invoices/:invoiceId
  try {
    const res = await request(`/invoices/${activeInvoiceId}`, {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.data, 'Should return invoice payload');
    const inv = res.data.data;
    assert.ok(inv.InvoiceId || inv.invoiceId, 'Should have InvoiceId');
    assert.ok(Array.isArray(inv.InvoiceDetails || inv.details), 'Should include details array');
    tracker.recordPass('TC_C07_03', 'GET /invoices/:invoiceId returns full master invoice details', `InvoiceId: ${activeInvoiceId}`);
  } catch (err) {
    tracker.recordFail('TC_C07_03', 'GET /invoices/:invoiceId returns full master invoice details', err);
  }

  // TC_C07_04: GET /invoices/booking/:bookingId
  try {
    const res = await request('/invoices/booking/1', {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.data, 'Should return master invoice for booking');
    tracker.recordPass('TC_C07_04', 'GET /invoices/booking/:bookingId locates master invoice by booking ID');
  } catch (err) {
    tracker.recordFail('TC_C07_04', 'GET /invoices/booking/:bookingId locates master invoice', err);
  }

  // TC_C07_05: Invoice Number format validation
  try {
    assert.ok(activeInvoiceNumber, 'Should have activeInvoiceNumber');
    assert.ok(
      activeInvoiceNumber.startsWith('INV-'),
      `InvoiceNumber must start with INV-, got ${activeInvoiceNumber}`
    );
    tracker.recordPass('TC_C07_05', 'Invoice number adheres to standardized prefix INV- format', activeInvoiceNumber);
  } catch (err) {
    tracker.recordFail('TC_C07_05', 'Invoice number adheres to standardized prefix format', err);
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
