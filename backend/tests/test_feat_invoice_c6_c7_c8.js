/**
 * backend/tests/test_feat_invoice_c6_c7_c8.js
 * Comprehensive Integration Test for:
 *   - FEAT-INVOICE-01 (C6): GET /api/v1/bookings/:bookingId/charges
 *   - FEAT-INVOICE-02 (C7): POST /api/v1/invoices/master
 *   - FEAT-INVOICE-03 (C8): GET /api/v1/invoices/:invoiceId/pdf & pdf-info
 */

const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(raw.toString('utf8'));
        } catch (e) {
          // Binary or non-JSON
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          raw,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TEST SUITE: C6 -> C7 -> C8 INTEGRATION ===\n');

  // Step 1: Login as Admin
  console.log('1. Đăng nhập Admin để lấy Bearer Token...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: 'admin@hoteldomain.vn', password: '123456' }
  );

  let token = loginRes.data?.data?.accessToken || loginRes.data?.token || loginRes.data?.accessToken;
  if (!token) {
    const loginRes2 = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin', password: '123456' }
    );
    token = loginRes2.data?.data?.accessToken || loginRes2.data?.token || loginRes2.data?.accessToken;
  }

  if (!token) {
    throw new Error('Failed to login as admin: ' + JSON.stringify(loginRes.data));
  }
  console.log('   -> Đăng nhập thành công! Token:', token.slice(0, 20) + '...\n');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Step 2: Test C6 on Booking 1
  console.log('2. [C6] Gọi GET /api/v1/bookings/1/charges...');
  const c6Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/bookings/1/charges',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('   Status Code:', c6Res.statusCode);
  if (c6Res.statusCode !== 200 || !c6Res.data?.success) {
    throw new Error('C6 failed: ' + JSON.stringify(c6Res.data));
  }
  const c6Data = c6Res.data.data;
  console.log('   Grand Total:', c6Data.grandTotal);
  console.log('   Total Paid:', c6Data.totalPaid);
  console.log('   Remaining Balance:', c6Data.remainingBalance);
  console.log('   Stays count:', c6Data.stays.length);
  console.log('   -> C6 PASSED!\n');

  // Step 3: Test C7 on Booking 1
  console.log('3. [C7] Gọi POST /api/v1/invoices/master cho Booking 1...');
  const c7Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/invoices/master',
      method: 'POST',
      headers: authHeaders,
    },
    {
      bookingId: 1,
      vatRate: 10,
      bypassCheckOutRule: true, // Cho phép lập hoá đơn test
      manualAdjustments: [
        {
          description: 'Phụ thu check-out trễ 1 giờ',
          amount: 150000,
          itemType: 'Surcharge',
        },
      ],
    }
  );

  console.log('   Status Code:', c7Res.statusCode);
  let invoiceId = null;

  if (c7Res.statusCode === 201) {
    console.log('   Created Invoice:', c7Res.data.data.invoiceNumber);
    console.log('   Subtotal:', c7Res.data.data.subtotal);
    console.log('   VAT Amount:', c7Res.data.data.vatAmount);
    console.log('   Total Amount:', c7Res.data.data.totalAmount);
    console.log('   Status:', c7Res.data.data.status);
    console.log('   Details count:', c7Res.data.data.details.length);
    console.log('   Linked Payment IDs:', c7Res.data.data.linkedPaymentIds);
    invoiceId = c7Res.data.data.invoiceId;
    console.log('   -> C7 CREATION PASSED!\n');
  } else if (c7Res.statusCode === 409 && c7Res.data?.code === 'ERROR_0017_ALREADY_EXISTS') {
    console.log('   Invoice already exists:', c7Res.data.existingInvoiceId, c7Res.data.invoiceNumber);
    invoiceId = c7Res.data.existingInvoiceId;
    console.log('   -> C7 IDEMPOTENCY / ALREADY_EXISTS CHECK PASSED!\n');
  } else {
    throw new Error('C7 failed: ' + JSON.stringify(c7Res.data));
  }

  // Step 4: Verify C7 duplicate check (ERROR_0017)
  console.log('4. [C7] Thử gọi lại POST /api/v1/invoices/master lần 2 (Kiểm tra chống trùng lặp)...');
  const c7DupRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/invoices/master',
      method: 'POST',
      headers: authHeaders,
    },
    {
      bookingId: 1,
      vatRate: 10,
      bypassCheckOutRule: true,
    }
  );

  console.log('   Status Code:', c7DupRes.statusCode);
  console.log('   Error Code:', c7DupRes.data?.code);
  if (c7DupRes.statusCode !== 409 || c7DupRes.data?.code !== 'ERROR_0017_ALREADY_EXISTS') {
    throw new Error('C7 duplicate check failed: ' + JSON.stringify(c7DupRes.data));
  }
  console.log('   -> C7 ERROR_0017_ALREADY_EXISTS PASSED!\n');

  // Step 5: Test C8 PDF Info
  console.log(`5. [C8] Gọi GET /api/v1/invoices/${invoiceId}/pdf-info...`);
  const c8InfoRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/invoices/${invoiceId}/pdf-info`,
    method: 'GET',
    headers: authHeaders,
  });

  console.log('   Status Code:', c8InfoRes.statusCode);
  console.log('   PDF Info:', c8InfoRes.data);
  if (c8InfoRes.statusCode !== 200 || !c8InfoRes.data?.success) {
    throw new Error('C8 pdf-info failed: ' + JSON.stringify(c8InfoRes.data));
  }
  console.log('   -> C8 pdf-info PASSED!\n');

  // Step 6: Test C8 PDF Binary Download
  console.log(`6. [C8] Gọi GET /api/v1/invoices/${invoiceId}/pdf (Xuất file PDF hoá đơn)...`);
  const c8PdfRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/invoices/${invoiceId}/pdf`,
    method: 'GET',
    headers: authHeaders,
  });

  console.log('   Status Code:', c8PdfRes.statusCode);
  console.log('   Content-Type:', c8PdfRes.headers['content-type']);
  console.log('   Content-Disposition:', c8PdfRes.headers['content-disposition']);
  console.log('   PDF File size:', c8PdfRes.raw.length, 'bytes');

  // Check PDF signature '%PDF-'
  const isPdfHeader = c8PdfRes.raw.slice(0, 5).toString('utf8') === '%PDF-';
  console.log('   Valid PDF Header (%PDF-):', isPdfHeader);

  if (c8PdfRes.statusCode !== 200 || !isPdfHeader) {
    throw new Error('C8 PDF generation failed!');
  }
  console.log('   -> C8 PDF BINARY EXPORT PASSED!\n');

  // Step 7: Test C8 PDF Cache (Gọi lại lần 2)
  console.log(`7. [C8] Gọi lại GET /api/v1/invoices/${invoiceId}/pdf lần 2 (Kiểm tra đọc cache từ đĩa)...`);
  const c8CacheRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/invoices/${invoiceId}/pdf`,
    method: 'GET',
    headers: authHeaders,
  });

  console.log('   Status Code:', c8CacheRes.statusCode);
  console.log('   Cached PDF File size:', c8CacheRes.raw.length, 'bytes');
  if (c8CacheRes.statusCode !== 200 || c8CacheRes.raw.length !== c8PdfRes.raw.length) {
    throw new Error('C8 PDF Cache failed!');
  }
  console.log('   -> C8 PDF CACHE PASSED!\n');

  console.log('========================================================');
  console.log('🎉 TOÀN BỘ CHUỖI C6 -> C7 -> C8 ĐÃ ĐẠT CHUẨN 100%! 🎉');
  console.log('========================================================');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
