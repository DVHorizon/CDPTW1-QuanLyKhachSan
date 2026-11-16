'use strict';

const assert = require('assert');

async function runCell(results, feature, scenario, applicability, layer, fn) {
  if (applicability === 'N/A') {
    results.push({
      feature,
      scenario,
      applicability: 'N/A',
      layer: 'N/A',
      status: 'N/A',
      summary: 'Không áp dụng theo thiết kế chức năng',
      details: fn ? await fn() : 'Không có thành phần giao diện/API tương ứng cho tình huống này',
    });
    return;
  }
  try {
    const details = await fn();
    results.push({
      feature,
      scenario,
      applicability,
      layer,
      status: 'PASS',
      summary: `Đạt kịch bản S${scenario} trên ${feature}`,
      details: typeof details === 'string' ? details : JSON.stringify(details),
    });
  } catch (err) {
    results.push({
      feature,
      scenario,
      applicability,
      layer,
      status: 'FAIL',
      summary: err.message || 'Thất bại kiểm thử',
      details: err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err),
    });
  }
}

async function runSuite(ctx) {
  const { config, http, db, assertions, tokens } = ctx;
  const results = [];

  const adminHttp = http.createSession();
  adminHttp.setToken(tokens.admin);

  const recepHttp = http.createSession();
  recepHttp.setToken(tokens.receptionist);

  const guestHttp = http.createSession();
  guestHttp.setToken(tokens.guest);

  const anonHttp = http.createSession();

  // =========================================================================
  // FEATURE C5: Core Payment Module & Refund (FEAT-PAYMENT-01)
  // =========================================================================

  // C5 - S1: 2-tab refund on same payment (Tab 1 refunds, Tab 2 refunds again -> error)
  await runCell(results, 'C5', 1, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const pmtRes = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 300000,
      method: 'Cash',
    });
    assertions.assertStatus(pmtRes, [200, 201], 'C5 S1 create payment');
    const paymentId = pmtRes.data?.data?.paymentId || pmtRes.data?.data?.PaymentId;

    const ref1 = await adminHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: 'Hoàn tiền ở Tab 1',
    });
    assertions.assertStatus(ref1, 200, 'C5 S1 Tab 1 refund');

    const ref2 = await adminHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: 'Hoàn tiền lại ở Tab 2',
    });
    assertions.assertS1DeleteConflict(ref2, 'C5 S1 Tab 2 refund already-refunded');
    return `Tab1=200, Tab2=${ref2.status} (${ref2.data?.code})`;
  });

  // C5 - S2: Optimistic locking on refund (version conflict -> 409)
  await runCell(results, 'C5', 2, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const pmtRes = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 250000,
      method: 'Card',
    });
    assertions.assertStatus(pmtRes, [200, 201], 'C5 S2 create payment');
    const paymentId = pmtRes.data?.data?.paymentId || pmtRes.data?.data?.PaymentId;

    const refStale = await adminHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: 'Thử hoàn tiền với version cũ',
      version: 99,
    });
    assertions.assertS2OptimisticLockConflict(refStale, 'C5 S2 stale version on refund');
    return `Stale version=99 -> HTTP ${refStale.status} (${refStale.data?.code})`;
  });

  // C5 - S3: Invalid / non-existent paymentId ('abc', '1abc', '99999999999')
  await runCell(results, 'C5', 3, 'APP', 'API+UI', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const getRes = await adminHttp.get(`/payments/${badId}`);
      assertions.assertS3InvalidIdRejected(getRes, `C5 S3 GET /payments/${badId}`);
      const refRes = await adminHttp.patch(`/payments/${badId}/refund`, {
        refundReason: 'Lý do hợp lệ',
      });
      assertions.assertS3InvalidIdRejected(refRes, `C5 S3 PATCH /payments/${badId}/refund`);
    }
    return 'GET/PATCH /payments/{abc,1abc,99999999999} rejected with 400/404';
  });

  // C5 - S4: Form / API validation (XOR bookingId/invoiceId, amount <= 0, refundReason < 2 chars)
  await runCell(results, 'C5', 4, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const inv = await db.seedInvoice({ bookingId: bs.BookingId, stayId: bs.StayId });

    const resXor = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      invoiceId: inv.InvoiceId,
      amount: 100000,
      method: 'Cash',
    });
    assertions.assertS4ValidationError(resXor, 'C5 S4 XOR bookingId+invoiceId');

    const resZero = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 0,
      method: 'Cash',
    });
    assertions.assertS4ValidationError(resZero, 'C5 S4 amount=0');
    return `XOR=${resXor.status} (${resXor.data?.code}), amount=0 -> ${resZero.status} (${resZero.data?.code})`;
  });

  // C5 - S5: Large HTML paste in refundReason (> 500 chars) & returnUrl (> 500 chars)
  await runCell(results, 'C5', 5, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const pmtRes = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 200000,
      method: 'Cash',
    });
    const paymentId = pmtRes.data?.data?.paymentId || pmtRes.data?.data?.PaymentId;

    const resRefOverflow = await adminHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: '<div>' + 'R'.repeat(550) + '</div>',
    });
    assertions.assertS5HtmlOverflowRejected(resRefOverflow, 'C5 S5 refundReason > 500 chars');

    const resUrlOverflow = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 100000,
      method: 'VNPay',
      returnUrl: 'https://example.com/' + 'a'.repeat(520),
    });
    assertions.assertS5HtmlOverflowRejected(resUrlOverflow, 'C5 S5 returnUrl > 500 chars');
    return `refundReason > 500 -> ${resRefOverflow.status} (${resRefOverflow.data?.code}), returnUrl > 500 -> ${resUrlOverflow.status}`;
  });

  // C5 - S6: Full-width whitespace in refundReason & returnUrl
  await runCell(results, 'C5', 6, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const pmtRes = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 150000,
      method: 'Cash',
    });
    const paymentId = pmtRes.data?.data?.paymentId || pmtRes.data?.data?.PaymentId;

    const resRefWs = await adminHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: '   \u3000\u3000\u3000   ',
    });
    assertions.assertS6WhitespaceRejected(resRefWs, 'C5 S6 full-width whitespace refundReason');
    return `refundReason='\\u3000' -> HTTP ${resRefWs.status} (${resRefWs.data?.code})`;
  });

  // C5 - S7: Full-width digits in amount ('２０００００')
  await runCell(results, 'C5', 7, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const res = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: '２０００００',
      method: 'Cash',
    });
    assertions.assertS7FullWidthDigitsHandled(
      res,
      {
        allowNormalizedSuccess: true,
        expectedNumericValue: 200000,
        actualValue: res.data?.data?.amount ?? res.data?.data?.Amount,
      },
      'C5 S7 full-width amount=２０００００'
    );
    return `amount='２０００００' -> HTTP ${res.status}, amount=${res.data?.data?.amount ?? res.data?.data?.Amount}`;
  });

  // C5 - S8: Invalid payment method select-option
  await runCell(results, 'C5', 8, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const res = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 100000,
      method: 'CryptoBitcoin',
    });
    assertions.assertS8SelectOptionValidated(res, 'C5 S8 invalid payment method');
    return `method='CryptoBitcoin' -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C5 - S9: Rapid double-click duplicate payment creation guard
  await runCell(results, 'C5', 9, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const r1 = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 333000,
      method: 'Cash',
    });
    const r2 = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 333000,
      method: 'Cash',
    });
    const row = await db.queryOne(
      'SELECT COUNT(*) AS cnt FROM Payments WHERE BookingId = ? AND Amount = 333000',
      [bs.BookingId]
    );
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C5 S9 duplicate offline payment within 5s');
    return `r1=${r1.status}, r2=${r2.status} (${r2.data?.code}), DB count=${row.cnt}`;
  });

  // C5 - S10: Invalid URL param (?bookingId=abc on /payment & /mock-payment/abc)
  await runCell(results, 'C5', 10, 'APP', 'API+UI', async () => {
    const resAbc = await adminHttp.post('/payments', {
      bookingId: 'abc',
      amount: 100000,
      method: 'Cash',
    });
    assertions.assertS3InvalidIdRejected(resAbc, 'C5 S10 bookingId=abc');
    return `bookingId='abc' -> HTTP ${resAbc.status} (${resAbc.data?.code})`;
  });

  await runCell(results, 'C5', 11, 'N/A', 'N/A', async () => 'C5 không có phần tử upload file hình ảnh');

  // C5 - S12: Broken image fallback on DepositPayment.jsx & DepositInvoiceModal.jsx
  await runCell(results, 'C5', 12, 'APP', 'UI', async () => {
    const fs = require('fs');
    const path = require('path');
    const dpSrc = fs.readFileSync(
      path.join(config.repoRoot, 'frontend/src/pages/client/DepositPayment.jsx'),
      'utf8'
    );
    const dimSrc = fs.readFileSync(
      path.join(config.repoRoot, 'frontend/src/components/modals/DepositInvoiceModal.jsx'),
      'utf8'
    );
    assert(dpSrc.includes('handleImageError') || dpSrc.includes('onError'), 'DepositPayment.jsx missing onError fallback');
    assert(dimSrc.includes('handleImageError') || dimSrc.includes('onError'), 'DepositInvoiceModal.jsx missing onError fallback');
    return 'DepositPayment.jsx & DepositInvoiceModal.jsx verified with onError={handleImageError} fallback';
  });

  await runCell(results, 'C5', 13, 'N/A', 'N/A', async () => 'C5 không có form cập nhật bản ghi kèm upload ảnh');

  // C5 - S14: Unauthenticated POST /payments, GET /payments/:id, PATCH /payments/:id/refund blocked
  await runCell(results, 'C5', 14, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ totalAmount: 1000000 });
    const pmtRes = await adminHttp.post('/payments', {
      bookingId: bs.BookingId,
      amount: 100000,
      method: 'Cash',
    });
    const paymentId = pmtRes.data?.data?.paymentId || pmtRes.data?.data?.PaymentId;

    const resPostAnon = await anonHttp.post(
      '/payments',
      { bookingId: bs.BookingId, amount: 100000, method: 'VNPay', returnUrl: 'http://localhost:3000' },
      { noAuth: true }
    );
    assertions.assertS14UnauthBlocked(resPostAnon, 'C5 S14 anon POST /payments');

    const resGetAnon = await anonHttp.get(`/payments/${paymentId}`, { noAuth: true });
    assertions.assertS14UnauthBlocked(resGetAnon, 'C5 S14 anon GET /payments/:id');

    const resRefAnon = await anonHttp.patch(
      `/payments/${paymentId}/refund`,
      { refundReason: 'Anon refund' },
      { noAuth: true }
    );
    assertions.assertS14UnauthBlocked(resRefAnon, 'C5 S14 anon PATCH /refund');

    const resRefGuest = await guestHttp.patch(`/payments/${paymentId}/refund`, {
      refundReason: 'Guest refund',
    });
    assertions.assertS14UnauthBlocked(resRefGuest, 'C5 S14 guest PATCH /refund');
    return `Anon POST=${resPostAnon.status}, Anon GET=${resGetAnon.status}, Anon Refund=${resRefAnon.status}, Guest Refund=${resRefGuest.status}`;
  });

  // =========================================================================
  // FEATURE C6: Tự động gom chi phí lưu trú (Charges Aggregation Folio)
  // =========================================================================

  await runCell(results, 'C6', 1, 'N/A', 'N/A', async () => 'C6 là màn hình tổng hợp chi phí chỉ đọc (read-only Folio), không có thao tác xóa');
  await runCell(results, 'C6', 2, 'N/A', 'N/A', async () => 'C6 là API/UI tổng hợp chi phí chỉ đọc, không ghi dữ liệu');

  // C6 - S3: Invalid / non-existent bookingId ('abc', '1abc', '99999999999')
  await runCell(results, 'C6', 3, 'APP', 'API+UI', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const res = await recepHttp.get(`/bookings/${badId}/charges`);
      assertions.assertS3InvalidIdRejected(res, `C6 S3 GET /bookings/${badId}/charges`);
    }
    return 'GET /bookings/{abc,1abc,99999999999}/charges rejected with 400/404';
  });

  // C6 - S4, S5, S6: Lookup validation on bookingId
  await runCell(results, 'C6', 4, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/bookings/-5/charges');
    assertions.assertS3InvalidIdRejected(res, 'C6 S4 negative bookingId');
    return `GET /bookings/-5/charges -> HTTP ${res.status}`;
  });

  await runCell(results, 'C6', 5, 'APP', 'API+UI', async () => {
    const longId = 'A'.repeat(250);
    const res = await recepHttp.get(`/bookings/${longId}/charges`);
    assertions.assertS3InvalidIdRejected(res, 'C6 S5 oversized bookingId');
    return `Oversized bookingId -> HTTP ${res.status}`;
  });

  await runCell(results, 'C6', 6, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get(`/bookings/${encodeURIComponent('\u3000\u3000')}/charges`);
    assertions.assertS3InvalidIdRejected(res, 'C6 S6 full-width space bookingId');
    return `Full-width space bookingId -> HTTP ${res.status}`;
  });

  // C6 - S7: Full-width digits in bookingId
  await runCell(results, 'C6', 7, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay();
    const fwId = String(bs.BookingId).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
    const res = await recepHttp.get(`/bookings/${encodeURIComponent(fwId)}/charges`);
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C6 S7 full-width bookingId');
    return `Full-width bookingId=${fwId} -> HTTP ${res.status}`;
  });

  await runCell(results, 'C6', 8, 'N/A', 'N/A', async () => 'C6 không có phần tử select-option');
  await runCell(results, 'C6', 9, 'N/A', 'N/A', async () => 'C6 là màn hình chỉ đọc, không tạo bản ghi mới');

  // C6 - S10: URL param (/admin/charges/abc or ?bookingId=99999999999)
  await runCell(results, 'C6', 10, 'APP', 'API+UI', async () => {
    const resAbc = await recepHttp.get('/bookings/abc/charges');
    assertions.assertS3InvalidIdRejected(resAbc, 'C6 S10 /bookings/abc/charges');
    return `/bookings/abc/charges -> HTTP ${resAbc.status}`;
  });

  await runCell(results, 'C6', 11, 'N/A', 'N/A', async () => 'C6 không có phần tử upload ảnh');
  await runCell(results, 'C6', 12, 'N/A', 'N/A', async () => 'C6 không hiển thị ảnh upload');
  await runCell(results, 'C6', 13, 'N/A', 'N/A', async () => 'C6 không có chức năng cập nhật ảnh');

  // C6 - S14: Unauthenticated & Guest access to /bookings/:id/charges blocked
  await runCell(results, 'C6', 14, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay();
    const resAnon = await anonHttp.get(`/bookings/${bs.BookingId}/charges`, { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnon, 'C6 S14 anon GET charges');
    const resGuest = await guestHttp.get(`/bookings/${bs.BookingId}/charges`);
    assertions.assertS14UnauthBlocked(resGuest, 'C6 S14 guest GET charges');
    return `Anon=${resAnon.status}, Guest=${resGuest.status}`;
  });

  // =========================================================================
  // FEATURE C7: Tạo hoá đơn tổng hợp (Master Invoice) tại quầy
  // =========================================================================

  await runCell(results, 'C7', 1, 'N/A', 'N/A', async () => 'C7 là chức năng phát hành hóa đơn tổng hợp, không có thao tác xóa hóa đơn');

  // C7 - S2: 2-tab concurrent create Master Invoice on same booking -> 409
  await runCell(results, 'C7', 2, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const r1 = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
    });
    assertions.assertStatus(r1, [200, 201], 'C7 S2 Tab 1 create master invoice');
    const r2 = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
    });
    assertions.assertStatus(r2, 409, 'C7 S2 Tab 2 concurrent create master invoice -> 409');
    return `Tab1=${r1.status}, Tab2=${r2.status} (${r2.data?.code})`;
  });

  // C7 - S3: Invalid / non-existent bookingId or invoiceId ('abc', '1abc', '99999999999')
  await runCell(results, 'C7', 3, 'APP', 'API+UI', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const resPost = await recepHttp.post('/invoices/master', {
        bookingId: badId,
        vatRate: 10,
        bypassCheckOutRule: true,
      });
      assertions.assertS3InvalidIdRejected(resPost, `C7 S3 POST /invoices/master bookingId=${badId}`);
      const resGet = await recepHttp.get(`/invoices/booking/${badId}`);
      assertions.assertS3InvalidIdRejected(resGet, `C7 S3 GET /invoices/booking/${badId}`);
    }
    return 'POST /invoices/master & GET /invoices/booking/{abc,1abc,99999999999} rejected with 400/404';
  });

  // C7 - S4: Form validation (invalid vatRate='abc', vatRate=150, adjustment description < 2 chars)
  await runCell(results, 'C7', 4, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const resVatAbc = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 'abc',
      bypassCheckOutRule: true,
    });
    assertions.assertS4ValidationError(resVatAbc, 'C7 S4 vatRate=abc');

    const resAdjShort = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: 'A', amount: 50000, itemType: 'Surcharge' }],
    });
    assertions.assertS4ValidationError(resAdjShort, 'C7 S4 adjustment description < 2 chars');
    return `vatRate='abc' -> ${resVatAbc.status}, adj desc='A' -> ${resAdjShort.status}`;
  });

  // C7 - S5: Large HTML paste in manualAdjustments[].description (> 200 chars)
  await runCell(results, 'C7', 5, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const res = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
      manualAdjustments: [
        { description: '<span>' + 'D'.repeat(230) + '</span>', amount: 50000, itemType: 'Surcharge' },
      ],
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C7 S5 adjustment description > 200 chars');
    return `adj description > 200 chars -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C7 - S6: Full-width whitespace in manualAdjustments[].description
  await runCell(results, 'C7', 6, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const res = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: '  \u3000\u3000\u3000  ', amount: 50000, itemType: 'Surcharge' }],
    });
    assertions.assertS6WhitespaceRejected(res, 'C7 S6 full-width whitespace adj description');
    return `adj description='\\u3000' -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C7 - S7: Full-width digits in vatRate ('１０') and adjustment amount ('５００００')
  await runCell(results, 'C7', 7, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const res = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: '１０',
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: `${config.prefix}Phụ thu`, amount: '５００００', itemType: 'Surcharge' }],
    });
    const actualVatRate = res.data?.data?.vatRate ?? res.data?.data?.VATRate;
    assertions.assertS7FullWidthDigitsHandled(
      res,
      { allowNormalizedSuccess: true, expectedNumericValue: 10, actualValue: actualVatRate },
      'C7 S7 vatRate=１０ must normalize to 10 (not 0)'
    );
    return `vatRate='１０' -> HTTP ${res.status}, vatRate=${actualVatRate}`;
  });

  // C7 - S8: Invalid adjustment itemType select-option
  await runCell(results, 'C7', 8, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const res = await recepHttp.post('/invoices/master', {
      bookingId: bs.BookingId,
      vatRate: 10,
      bypassCheckOutRule: true,
      manualAdjustments: [{ description: 'Phụ thu hợp lệ', amount: 50000, itemType: 'InvalidType' }],
    });
    assertions.assertS8SelectOptionValidated(res, 'C7 S8 invalid adjustment itemType');
    return `itemType='InvalidType' -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C7 - S9: Rapid double-click duplicate Master Invoice creation
  await runCell(results, 'C7', 9, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const [r1, r2] = await Promise.all([
      recepHttp.post('/invoices/master', { bookingId: bs.BookingId, vatRate: 10, bypassCheckOutRule: true }),
      recepHttp.post('/invoices/master', { bookingId: bs.BookingId, vatRate: 10, bypassCheckOutRule: true }),
    ]);
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM Invoices WHERE BookingId = ?', [bs.BookingId]);
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C7 S9 duplicate master invoice');
    return `Statuses=[${r1.status}, ${r2.status}], DB count=${row.cnt}`;
  });

  // C7 - S10: Invalid URL param (/invoices/booking/abc)
  await runCell(results, 'C7', 10, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices/booking/abc');
    assertions.assertS3InvalidIdRejected(res, 'C7 S10 /invoices/booking/abc');
    return `/invoices/booking/abc -> HTTP ${res.status}`;
  });

  await runCell(results, 'C7', 11, 'N/A', 'N/A', async () => 'C7 không có phần tử upload ảnh');
  await runCell(results, 'C7', 12, 'N/A', 'N/A', async () => 'C7 không hiển thị ảnh upload');
  await runCell(results, 'C7', 13, 'N/A', 'N/A', async () => 'C7 không có chức năng cập nhật ảnh');

  // C7 - S14: Unauthenticated & Guest blocked from creating Master Invoice or reading other guest's invoice
  await runCell(results, 'C7', 14, 'APP', 'API+UI', async () => {
    const bs = await db.seedBookingAndStay({ userId: 1, stayStatus: 'CheckedOut', status: 'CheckedOut' });
    const inv = await db.seedInvoice({ bookingId: bs.BookingId, stayId: bs.StayId });

    const resAnon = await anonHttp.post('/invoices/master', { bookingId: bs.BookingId }, { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnon, 'C7 S14 anon POST /invoices/master');

    const resGuestCreate = await guestHttp.post('/invoices/master', { bookingId: bs.BookingId });
    assertions.assertS14UnauthBlocked(resGuestCreate, 'C7 S14 guest POST /invoices/master');

    const resGuestOther = await guestHttp.get(`/invoices/${inv.InvoiceId}`);
    assertions.assertS14UnauthBlocked(resGuestOther, 'C7 S14 guest reading non-owned invoice');
    return `Anon POST=${resAnon.status}, Guest POST=${resGuestCreate.status}, Guest other invoice=${resGuestOther.status}`;
  });

  // =========================================================================
  // FEATURE C8: Xuất hoá đơn PDF (Invoice PDF Export)
  // =========================================================================

  await runCell(results, 'C8', 1, 'N/A', 'N/A', async () => 'C8 là chức năng kết xuất file PDF từ hóa đơn, không có thao tác xóa');
  await runCell(results, 'C8', 2, 'N/A', 'N/A', async () => 'C8 không có form chỉnh sửa dữ liệu bản ghi');

  // C8 - S3: Invalid / non-existent invoiceId ('abc', '1abc', '99999999999')
  await runCell(results, 'C8', 3, 'API-ONLY', 'API', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const resPdf = await recepHttp.get(`/invoices/${badId}/pdf`);
      assertions.assertS3InvalidIdRejected(resPdf, `C8 S3 GET /invoices/${badId}/pdf`);
      const resInfo = await recepHttp.get(`/invoices/${badId}/pdf-info`);
      assertions.assertS3InvalidIdRejected(resInfo, `C8 S3 GET /invoices/${badId}/pdf-info`);
    }
    return 'GET /invoices/{abc,1abc,99999999999}/pdf & /pdf-info rejected with 400/404';
  });

  await runCell(results, 'C8', 4, 'N/A', 'N/A', async () => 'C8 không có form nhập liệu thêm mới/cập nhật');
  await runCell(results, 'C8', 5, 'N/A', 'N/A', async () => 'C8 không có phần tử nhập text');
  await runCell(results, 'C8', 6, 'N/A', 'N/A', async () => 'C8 không có phần tử nhập text');

  // C8 - S7: Full-width digits in invoiceId
  await runCell(results, 'C8', 7, 'API-ONLY', 'API', async () => {
    const inv = await db.seedInvoice();
    const fwId = String(inv.InvoiceId).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
    const res = await recepHttp.get(`/invoices/${encodeURIComponent(fwId)}/pdf-info`);
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C8 S7 full-width invoiceId');
    return `Full-width invoiceId=${fwId} -> HTTP ${res.status}`;
  });

  // C8 - S8 & S10: Query params mode & regenerate on /invoices/:id/pdf
  await runCell(results, 'C8', 8, 'API-ONLY', 'API', async () => {
    const inv = await db.seedInvoice();
    const res = await recepHttp.get(`/invoices/${inv.InvoiceId}/pdf`, {
      query: { mode: 'download', regenerate: 'true' },
      isBinary: true,
    });
    assertions.assertStatus(res, 200, 'C8 S8 valid PDF stream');
    assert(res.buffer && res.buffer.slice(0, 4).toString() === '%PDF', 'Expected %PDF header');
    return `PDF stream HTTP ${res.status}, bytes=${res.buffer.length}`;
  });

  await runCell(results, 'C8', 9, 'N/A', 'N/A', async () => 'C8 là thao tác xuất PDF idempotent, không tạo bản ghi trùng lặp');

  await runCell(results, 'C8', 10, 'API-ONLY', 'API', async () => {
    const res = await recepHttp.get('/invoices/1abc/pdf');
    assertions.assertS3InvalidIdRejected(res, 'C8 S10 /invoices/1abc/pdf');
    return `/invoices/1abc/pdf -> HTTP ${res.status}`;
  });

  await runCell(results, 'C8', 11, 'N/A', 'N/A', async () => 'C8 không có upload ảnh');
  await runCell(results, 'C8', 12, 'N/A', 'N/A', async () => 'C8 tạo PDF văn bản chuẩn qua PDFKit');
  await runCell(results, 'C8', 13, 'N/A', 'N/A', async () => 'C8 không có chức năng cập nhật ảnh');

  // C8 - S14: Unauthenticated access to /invoices/:id/pdf & static /uploads/invoices/ blocked
  await runCell(results, 'C8', 14, 'APP', 'API', async () => {
    const bs = await db.seedBookingAndStay({ userId: 1 });
    const inv = await db.seedInvoice({ bookingId: bs.BookingId, stayId: bs.StayId });
    await recepHttp.get(`/invoices/${inv.InvoiceId}/pdf`, { isBinary: true });

    const resAnonApi = await anonHttp.get(`/invoices/${inv.InvoiceId}/pdf`, { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnonApi, 'C8 S14 anon GET /invoices/:id/pdf');

    const resGuestOther = await guestHttp.get(`/invoices/${inv.InvoiceId}/pdf`);
    assertions.assertS14UnauthBlocked(resGuestOther, 'C8 S14 guest GET non-owned invoice PDF');

    const resStaticAnon = await anonHttp.get(`/uploads/invoices/INV-${inv.InvoiceNumber}.pdf`, {
      noAuth: true,
      useBackendRoot: true,
    });
    assertions.assertS14UnauthBlocked(resStaticAnon, 'C8 S14 static /uploads/invoices/ blocked without auth');
    return `Anon API=${resAnonApi.status}, Guest other=${resGuestOther.status}, Static /uploads/invoices=${resStaticAnon.status}`;
  });

  // =========================================================================
  // FEATURE C9: Quyết toán hoá đơn (Multi-Tender Settlement)
  // =========================================================================

  await runCell(results, 'C9', 1, 'N/A', 'N/A', async () => 'C9 là luồng quyết toán thanh toán hóa đơn, không có thao tác xóa');

  // C9 - S2: 2-tab concurrent settle on same invoice (optimistic lock / already settled)
  await runCell(results, 'C9', 2, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 400000, vatRate: 10, vatAmount: 40000, totalAmount: 440000 });
    const res1 = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: 440000, customerCashGiven: 500000 }],
      version: 1,
    });
    assertions.assertStatus(res1, 200, 'C9 S2 Tab 1 settle invoice');

    const res2 = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Card', amount: 440000 }],
      version: 1,
    });
    assertions.assertNo500(res2, 'C9 S2 Tab 2 stale settle');
    assert([400, 409].includes(res2.status), `Expected 400/409 on Tab 2 settle, got ${res2.status}`);
    return `Tab1=200, Tab2=${res2.status} (${res2.data?.code})`;
  });

  // C9 - S3: Invalid / non-existent invoiceId ('abc', '1abc', '99999999999')
  await runCell(results, 'C9', 3, 'APP', 'API+UI', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const res = await recepHttp.post(`/invoices/${badId}/pay`, {
        tenders: [{ method: 'Cash', amount: 100000, customerCashGiven: 100000 }],
      });
      assertions.assertS3InvalidIdRejected(res, `C9 S3 POST /invoices/${badId}/pay`);
    }
    return 'POST /invoices/{abc,1abc,99999999999}/pay rejected with 400/404';
  });

  // C9 - S4: Validation (split sum mismatch, insufficient cash, >1 online tender)
  await runCell(results, 'C9', 4, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 500000, vatRate: 10, vatAmount: 50000, totalAmount: 550000 });
    const resMismatch = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: 100000, customerCashGiven: 100000 }],
    });
    assertions.assertS4ValidationError(resMismatch, 'C9 S4 split sum mismatch');

    const resLowCash = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: 550000, customerCashGiven: 500000 }],
    });
    assertions.assertS4ValidationError(resLowCash, 'C9 S4 insufficient customerCashGiven');
    return `Mismatch=${resMismatch.status} (${resMismatch.data?.code}), LowCash=${resLowCash.status} (${resLowCash.data?.code})`;
  });

  // C9 - S5: Large HTML paste in note (> 500 chars) or transactionCode (> 200 chars)
  await runCell(results, 'C9', 5, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 500000, vatRate: 10, vatAmount: 50000, totalAmount: 550000 });
    const res = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Card', amount: 550000, transactionCode: '<b>' + 'T'.repeat(250) + '</b>' }],
      note: '<div>' + 'N'.repeat(550) + '</div>',
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C9 S5 transactionCode/note overflow');
    return `Overflow note/transactionCode -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C9 - S6: Full-width whitespace in optional note
  await runCell(results, 'C9', 6, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 300000, vatRate: 10, vatAmount: 30000, totalAmount: 330000 });
    const res = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: 330000, customerCashGiven: 350000 }],
      note: '\u3000'.repeat(600),
    });
    assertions.assertStatus(res, 200, 'C9 S6 600x\\u3000 in optional note trimmed cleanly');
    return `600x\\u3000 note trimmed -> HTTP ${res.status}`;
  });

  // C9 - S7: Full-width digits in tenders[].amount and customerCashGiven
  await runCell(results, 'C9', 7, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 200000, vatRate: 10, vatAmount: 20000, totalAmount: 220000 });
    const res = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: '２２００００', customerCashGiven: '２５００００' }],
    });
    assertions.assertS7FullWidthDigitsHandled(
      res,
      {
        allowNormalizedSuccess: true,
        expectedNumericValue: 30000,
        actualValue: res.data?.data?.changeDue,
      },
      'C9 S7 full-width tender amount & cashGiven'
    );
    return `Full-width tender amount -> HTTP ${res.status}, changeDue=${res.data?.data?.changeDue}`;
  });

  // C9 - S8: Invalid tender method select-option
  await runCell(results, 'C9', 8, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 200000, vatRate: 10, vatAmount: 20000, totalAmount: 220000 });
    const res = await recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'InvalidMethod', amount: 220000 }],
    });
    assertions.assertS8SelectOptionValidated(res, 'C9 S8 invalid tender method');
    return `method='InvalidMethod' -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C9 - S9: Rapid double-click duplicate settlement prevention
  await runCell(results, 'C9', 9, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice({ subtotal: 200000, vatRate: 10, vatAmount: 20000, totalAmount: 220000 });
    const [r1, r2] = await Promise.all([
      recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
        tenders: [{ method: 'Cash', amount: 220000, customerCashGiven: 220000 }],
      }),
      recepHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
        tenders: [{ method: 'Cash', amount: 220000, customerCashGiven: 220000 }],
      }),
    ]);
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM Payments WHERE InvoiceId = ?', [inv.InvoiceId]);
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C9 S9 double settle creates only 1 payment');
    return `Statuses=[${r1.status}, ${r2.status}], DB payments=${row.cnt}`;
  });

  // C9 - S10: Invalid URL param (/admin/finance/settlement/abc)
  await runCell(results, 'C9', 10, 'APP', 'API+UI', async () => {
    const res = await recepHttp.post('/invoices/abc/pay', {
      tenders: [{ method: 'Cash', amount: 100000, customerCashGiven: 100000 }],
    });
    assertions.assertS3InvalidIdRejected(res, 'C9 S10 /invoices/abc/pay');
    return `/invoices/abc/pay -> HTTP ${res.status}`;
  });

  await runCell(results, 'C9', 11, 'N/A', 'N/A', async () => 'C9 không có phần tử upload ảnh');

  // C9 - S12: Broken image fallback on VietQR <img> in MultiTenderSettlementModal.jsx
  await runCell(results, 'C9', 12, 'APP', 'UI', async () => {
    const fs = require('fs');
    const path = require('path');
    const modalSrc = fs.readFileSync(
      path.join(config.repoRoot, 'frontend/src/components/admin/finance/MultiTenderSettlementModal.jsx'),
      'utf8'
    );
    assert(
      modalSrc.includes('handleImageError') || modalSrc.includes('onError'),
      'MultiTenderSettlementModal.jsx VietQR <img> missing onError fallback'
    );
    return 'MultiTenderSettlementModal.jsx VietQR <img> verified with onError={handleImageError} fallback';
  });

  await runCell(results, 'C9', 13, 'N/A', 'N/A', async () => 'C9 không có chức năng cập nhật ảnh');

  // C9 - S14: Unauthenticated & Guest blocked from settling invoice
  await runCell(results, 'C9', 14, 'APP', 'API+UI', async () => {
    const inv = await db.seedInvoice();
    const resAnon = await anonHttp.post(
      `/invoices/${inv.InvoiceId}/pay`,
      { tenders: [{ method: 'Cash', amount: inv.TotalAmount, customerCashGiven: inv.TotalAmount }] },
      { noAuth: true }
    );
    assertions.assertS14UnauthBlocked(resAnon, 'C9 S14 anon POST /pay');

    const resGuest = await guestHttp.post(`/invoices/${inv.InvoiceId}/pay`, {
      tenders: [{ method: 'Cash', amount: inv.TotalAmount, customerCashGiven: inv.TotalAmount }],
    });
    assertions.assertS14UnauthBlocked(resGuest, 'C9 S14 guest POST /pay');
    return `Anon=${resAnon.status}, Guest=${resGuest.status}`;
  });

  // =========================================================================
  // FEATURE C10: Quản lý danh sách hoá đơn & lịch sử giao dịch (Invoice Ledger)
  // =========================================================================

  await runCell(results, 'C10', 1, 'N/A', 'N/A', async () => 'C10 là sổ cái tra cứu hóa đơn & lịch sử giao dịch, không có thao tác xóa hóa đơn');
  await runCell(results, 'C10', 2, 'N/A', 'N/A', async () => 'C10 là sổ cái tra cứu (cập nhật hoàn tiền/quyết toán thuộc C5 S2 & C9 S2)');

  // C10 - S3: Invalid / non-existent invoiceId on GET /invoices/:id and /transactions
  await runCell(results, 'C10', 3, 'APP', 'API+UI', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const resInv = await recepHttp.get(`/invoices/${badId}`);
      assertions.assertS3InvalidIdRejected(resInv, `C10 S3 GET /invoices/${badId}`);
      const resTx = await recepHttp.get(`/invoices/${badId}/transactions`);
      assertions.assertS3InvalidIdRejected(resTx, `C10 S3 GET /invoices/${badId}/transactions`);
    }
    return 'GET /invoices/{abc,1abc,99999999999} & /transactions rejected with 400/404';
  });

  // C10 - S4: Filter validation (fromDate > toDate)
  await runCell(results, 'C10', 4, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices', {
      query: { fromDate: '2026-12-31', toDate: '2026-01-01' },
    });
    assertions.assertS4ValidationError(res, 'C10 S4 fromDate > toDate');
    return `fromDate > toDate -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C10 - S5: Search text overflow (> 100 chars)
  await runCell(results, 'C10', 5, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices', {
      query: { search: '<b>' + 'I'.repeat(120) + '</b>' },
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C10 S5 search > 100 chars');
    return `search > 100 chars -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C10 - S6: Full-width whitespace search
  await runCell(results, 'C10', 6, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices', {
      query: { search: '   \u3000\u3000   ' },
    });
    assertions.assertStatus(res, 200, 'C10 S6 whitespace search trimmed');
    return `search='\\u3000' -> HTTP ${res.status}`;
  });

  // C10 - S7: Full-width digits in page / pageSize
  await runCell(results, 'C10', 7, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices', {
      query: { page: '１', pageSize: '１０' },
    });
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C10 S7 full-width page=１');
    return `page='１' -> HTTP ${res.status} (page=${res.data?.page})`;
  });

  // C10 - S8: Invalid status select-option filter
  await runCell(results, 'C10', 8, 'APP', 'API+UI', async () => {
    const res = await recepHttp.get('/invoices', {
      query: { status: 'InvalidInvoiceStatus' },
    });
    assertions.assertS8SelectOptionValidated(res, 'C10 S8 invalid status filter');
    return `status='InvalidInvoiceStatus' -> HTTP ${res.status} (${res.data?.code})`;
  });

  await runCell(results, 'C10', 9, 'N/A', 'N/A', async () => 'C10 chỉ tra cứu danh sách & lịch sử giao dịch, không tạo mới bản ghi');

  // C10 - S10: URL query params (?page=abc, ?page=99999)
  await runCell(results, 'C10', 10, 'APP', 'API+UI', async () => {
    const resAbc = await recepHttp.get('/invoices', { query: { page: 'abc', pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resAbc, 'C10 S10 page=abc');
    const resHigh = await recepHttp.get('/invoices', { query: { page: 99999, pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resHigh, 'C10 S10 page=99999');
    return `page=abc -> ${resAbc.status}, page=99999 -> ${resHigh.status}`;
  });

  await runCell(results, 'C10', 11, 'N/A', 'N/A', async () => 'C10 không có phần tử upload ảnh');
  await runCell(results, 'C10', 12, 'N/A', 'N/A', async () => 'C10 không hiển thị ảnh upload');
  await runCell(results, 'C10', 13, 'N/A', 'N/A', async () => 'C10 không có chức năng cập nhật ảnh');

  // C10 - S14: Unauthenticated & Guest access to /invoices ledger blocked
  await runCell(results, 'C10', 14, 'APP', 'API+UI', async () => {
    const resAnon = await anonHttp.get('/invoices', { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnon, 'C10 S14 anon GET /invoices');
    const resGuest = await guestHttp.get('/invoices');
    assertions.assertS14UnauthBlocked(resGuest, 'C10 S14 guest GET /invoices');
    return `Anon=${resAnon.status}, Guest=${resGuest.status}`;
  });

  return results;
}

module.exports = {
  name: 'Suite 02: Payments & Invoices Track (C5–C10 × S1–S14)',
  features: ['C5', 'C6', 'C7', 'C8', 'C9', 'C10'],
  runSuite,
};
