'use strict';

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');

async function run(tracker = new TestSuiteTracker('Tier 1: C8 - Invoice PDF Export')) {
  const { adminToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const testInvoiceId = 1;
  let firstPdfSize = 0;

  // TC_C08_01: GET /invoices/:id/pdf-info
  try {
    const res = await request(`/invoices/${testInvoiceId}/pdf-info`, {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(res.data?.success, 'Should indicate success');
    assert.strictEqual(typeof res.data?.data?.pdfAvailable, 'boolean');
    tracker.recordPass('TC_C08_01', 'GET /invoices/:id/pdf-info returns PDF metadata', `Available: ${res.data.data.pdfAvailable}`);
  } catch (err) {
    tracker.recordFail('TC_C08_01', 'GET /invoices/:id/pdf-info returns PDF metadata', err);
  }

  // TC_C08_02: GET /invoices/:id/pdf Content-Type
  try {
    const res = await request(`/invoices/${testInvoiceId}/pdf`, {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.ok(
      res.contentType.includes('application/pdf'),
      `Content-Type should be application/pdf, got ${res.contentType}`
    );
    firstPdfSize = res.rawBuffer?.length || 0;
    assert.ok(firstPdfSize > 500, `PDF size should be substantial (>500 bytes), got ${firstPdfSize}`);
    tracker.recordPass('TC_C08_02', 'GET /invoices/:id/pdf exports binary stream with application/pdf', `Size: ${firstPdfSize} bytes`);
  } catch (err) {
    tracker.recordFail('TC_C08_02', 'GET /invoices/:id/pdf exports binary stream', err);
  }

  // TC_C08_03: Magic number header %PDF-
  try {
    const res = await request(`/invoices/${testInvoiceId}/pdf`, {
      headers: adminHeaders,
    });
    const headerStr = res.rawBuffer ? res.rawBuffer.slice(0, 5).toString('utf-8') : '';
    assert.strictEqual(headerStr, '%PDF-', `PDF header should start with %PDF-, got ${headerStr}`);
    tracker.recordPass('TC_C08_03', 'PDF binary matches Adobe %PDF- magic signature');
  } catch (err) {
    tracker.recordFail('TC_C08_03', 'PDF binary matches Adobe %PDF- magic signature', err);
  }

  // TC_C08_04: Disk caching validation
  try {
    const res = await request(`/invoices/${testInvoiceId}/pdf`, {
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const cachedSize = res.rawBuffer?.length || 0;
    assert.strictEqual(cachedSize, firstPdfSize, `Cached PDF size (${cachedSize}) should exactly match first generate (${firstPdfSize})`);
    tracker.recordPass('TC_C08_04', 'Disk caching returns identical cached binary on repeated request');
  } catch (err) {
    tracker.recordFail('TC_C08_04', 'Disk caching returns identical cached binary', err);
  }

  // TC_C08_05: Content-Disposition filename
  try {
    const res = await request(`/invoices/${testInvoiceId}/pdf`, {
      headers: adminHeaders,
    });
    const disposition = res.headers['content-disposition'] || '';
    assert.ok(
      disposition.includes('.pdf'),
      `Content-Disposition header should include filename with .pdf, got ${disposition}`
    );
    tracker.recordPass('TC_C08_05', 'Content-Disposition header contains download filename', disposition);
  } catch (err) {
    tracker.recordFail('TC_C08_05', 'Content-Disposition header contains download filename', err);
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
