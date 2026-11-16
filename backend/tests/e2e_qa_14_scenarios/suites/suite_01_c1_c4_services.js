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

  const seededCat = await db.seedServiceCategory();
  const seededStay = await db.seedBookingAndStay();

  // =========================================================================
  // FEATURE C1: Quản lý danh mục dịch vụ khách sạn (CRUD)
  // =========================================================================

  // C1 - S1: 2-tab delete/deactivate
  await runCell(results, 'C1', 1, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId, status: 'Active' });
    const res1 = await adminHttp.patch(`/services/${svc.ServiceId}/deactivate`, {});
    assertions.assertStatus(res1, 200, 'C1 S1 Tab 1 deactivate');
    const res2 = await adminHttp.patch(`/services/${svc.ServiceId}/deactivate`, {});
    assertions.assertS1DeleteConflict(res2, 'C1 S1 Tab 2 deactivate already-inactive');
    return `Tab1=HTTP ${res1.status}, Tab2=HTTP ${res2.status} (${res2.data?.code})`;
  });

  // C1 - S2: Concurrent edit optimistic locking
  await runCell(results, 'C1', 2, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const res1 = await adminHttp.put(`/services/${svc.ServiceId}`, {
      categoryId: seededCat.CategoryId,
      serviceName: `${svc.ServiceName}_T1`,
      price: 180000,
      unit: 'Lần',
      description: 'Tab 1 update',
      version: 1,
    });
    assertions.assertStatus(res1, 200, 'C1 S2 Tab 1 update');
    const res2 = await adminHttp.put(`/services/${svc.ServiceId}`, {
      categoryId: seededCat.CategoryId,
      serviceName: `${svc.ServiceName}_T2`,
      price: 200000,
      unit: 'Lần',
      description: 'Tab 2 stale update',
      version: 1,
    });
    assertions.assertS2OptimisticLockConflict(res2, 'C1 S2 Tab 2 stale version=1');
    return `Tab1=200 (v=${res1.data?.data?.version}), Tab2=409 (${res2.data?.code}: ${res2.data?.message})`;
  });

  // C1 - S3: Invalid / non-existent ID ('abc', '1abc', '99999999999')
  await runCell(results, 'C1', 3, 'API-ONLY', 'API', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const getRes = await adminHttp.get(`/services/${badId}`);
      assertions.assertS3InvalidIdRejected(getRes, `C1 S3 GET /services/${badId}`);
      const putRes = await adminHttp.put(`/services/${badId}`, {
        categoryId: seededCat.CategoryId,
        serviceName: 'Valid Name',
        price: 100000,
        unit: 'Lần',
      });
      assertions.assertS3InvalidIdRejected(putRes, `C1 S3 PUT /services/${badId}`);
    }
    return 'GET/PUT /services/{abc,1abc,99999999999} rejected with 400/404';
  });

  // C1 - S4: Form / API validation
  await runCell(results, 'C1', 4, 'APP', 'API+UI', async () => {
    const resEmpty = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: 'A',
      price: -50,
      unit: '',
    });
    assertions.assertS4ValidationError(resEmpty, 'C1 S4 invalid service fields');
    const resNonStr = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: { bad: 1 },
      price: 100000,
      unit: ['bad'],
    });
    assertions.assertS4ValidationError(resNonStr, 'C1 S4 non-string service fields');
    return `Invalid fields=${resEmpty.status} (${resEmpty.data?.code}), non-string=${resNonStr.status}`;
  });

  // C1 - S5: Large HTML paste overflow
  await runCell(results, 'C1', 5, 'APP', 'API+UI', async () => {
    const bigHtml = '<div><p>' + 'X'.repeat(300) + '</p></div>';
    const res = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: bigHtml,
      price: 100000,
      unit: 'Lần',
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C1 S5 serviceName > 150 HTML paste');
    const resCat = await adminHttp.post('/services/categories', {
      categoryName: bigHtml,
      description: 'Valid',
    });
    assertions.assertS5HtmlOverflowRejected(resCat, 'C1 S5 categoryName > 100 HTML paste');
    return `serviceName overflow=${res.status}, categoryName overflow=${resCat.status}`;
  });

  // C1 - S6: Whitespace validation (ASCII + 2-byte \u3000)
  await runCell(results, 'C1', 6, 'APP', 'API+UI', async () => {
    const res = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: '   \u3000\u3000   ',
      price: 100000,
      unit: '\u3000\u3000',
    });
    assertions.assertS6WhitespaceRejected(res, 'C1 S6 full-width whitespace serviceName/unit');
    const svcTag = config.makeTag('SVC_WS');
    const resDesc = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: svcTag,
      price: 100000,
      unit: 'Lần',
      description: '\u3000'.repeat(1005),
    });
    assertions.assertStatus(resDesc, 201, 'C1 S6 blank 1005 full-width spaces in optional description trimmed before length check');
    return `Required whitespace rejected=${res.status}, optional 1005x\\u3000 trimmed=${resDesc.status}`;
  });

  // C1 - S7: Full-width digits ('０１２３４５６７８９')
  await runCell(results, 'C1', 7, 'APP', 'API+UI', async () => {
    const svcTag = config.makeTag('SVC_FW');
    const res = await adminHttp.post('/services', {
      categoryId: seededCat.CategoryId,
      serviceName: svcTag,
      price: '２５００００',
      unit: 'Lần',
    });
    assertions.assertS7FullWidthDigitsHandled(
      res,
      {
        allowNormalizedSuccess: true,
        expectedNumericValue: 250000,
        actualValue: res.data?.data?.Price ?? res.data?.data?.price,
      },
      'C1 S7 full-width price ２５００００'
    );
    return `POST /services with price='２５００００' -> HTTP ${res.status}, Price=${res.data?.data?.Price ?? res.data?.data?.price}`;
  });

  // C1 - S8: Select-option validation (categoryId)
  await runCell(results, 'C1', 8, 'APP', 'API+UI', async () => {
    const inactiveCat = await db.seedServiceCategory({ status: 'Inactive' });
    const resMissing = await adminHttp.post('/services', {
      categoryId: '',
      serviceName: config.makeTag('SVC_OPT'),
      price: 100000,
      unit: 'Lần',
    });
    assertions.assertS8SelectOptionValidated(resMissing, 'C1 S8 empty categoryId');
    const resInactive = await adminHttp.post('/services', {
      categoryId: inactiveCat.CategoryId,
      serviceName: config.makeTag('SVC_OPT2'),
      price: 100000,
      unit: 'Lần',
    });
    assertions.assertS8SelectOptionValidated(resInactive, 'C1 S8 inactive categoryId');
    return `Empty categoryId=${resMissing.status}, Inactive categoryId=${resInactive.status} (${resInactive.data?.code})`;
  });

  // C1 - S9: Duplicate submit on create
  await runCell(results, 'C1', 9, 'APP', 'API+UI', async () => {
    const dupName = config.makeTag('SVC_DUP');
    const [r1, r2] = await Promise.all([
      adminHttp.post('/services', {
        categoryId: seededCat.CategoryId,
        serviceName: dupName,
        price: 120000,
        unit: 'Lần',
      }),
      adminHttp.post('/services', {
        categoryId: seededCat.CategoryId,
        serviceName: dupName,
        price: 120000,
        unit: 'Lần',
      }),
    ]);
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM Services WHERE ServiceName = ?', [dupName]);
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C1 S9 duplicate ServiceName');
    return `Statuses=[${r1.status}, ${r2.status}], DB count=${row.cnt}`;
  });

  // C1 - S10: URL params (?page=abc, ?page=99999 on /admin/services)
  await runCell(results, 'C1', 10, 'APP', 'API+UI', async () => {
    const resAbc = await adminHttp.get('/services', { query: { page: 'abc', pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resAbc, 'C1 S10 page=abc');
    const resHigh = await adminHttp.get('/services', { query: { page: 99999, pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resHigh, 'C1 S10 page=99999');
    return `page=abc -> ${resAbc.status}, page=99999 -> ${resHigh.status}`;
  });

  // C1 - S11, S12, S13: N/A (No image upload or image fields in Services/ServiceCategories)
  await runCell(results, 'C1', 11, 'N/A', 'N/A', async () => 'Model Services & ServiceCategories không có trường upload file ảnh');
  await runCell(results, 'C1', 12, 'N/A', 'N/A', async () => 'Màn hình ServiceManagement không hiển thị thẻ <img> của bản ghi dịch vụ');
  await runCell(results, 'C1', 13, 'N/A', 'N/A', async () => 'Form cập nhật dịch vụ không có phần tử upload ảnh');

  // C1 - S14: Unauthenticated / Guest delete/deactivate & export blocked
  await runCell(results, 'C1', 14, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const resAnon = await anonHttp.patch(`/services/${svc.ServiceId}/deactivate`, {}, { noAuth: true });
    assertions.assertS14UnauthBlocked(resAnon, 'C1 S14 anon deactivate');
    const resGuest = await guestHttp.patch(`/services/${svc.ServiceId}/deactivate`, {});
    assertions.assertS14UnauthBlocked(resGuest, 'C1 S14 guest deactivate');
    const resExportAnon = await anonHttp.get('/services/export', { noAuth: true });
    assertions.assertS14UnauthBlocked(resExportAnon, 'C1 S14 anon export');
    return `Anon deactivate=${resAnon.status}, Guest deactivate=${resGuest.status}, Anon export=${resExportAnon.status}`;
  });

  // =========================================================================
  // FEATURE C2: Xem danh sách, tìm kiếm và phân loại dịch vụ
  // =========================================================================

  await runCell(results, 'C2', 1, 'N/A', 'N/A', async () => 'C2 là luồng tra cứu/tìm kiếm danh sách, không có thao tác xóa');
  await runCell(results, 'C2', 2, 'N/A', 'N/A', async () => 'C2 là luồng tra cứu danh sách chỉ đọc, không có form chỉnh sửa bản ghi');
  await runCell(results, 'C2', 3, 'N/A', 'N/A', async () => 'C2 truy vấn danh sách qua query filter, kiểm thử ID chi tiết thuộc C1 S3');

  // C2 - S4: Filter validation (minPrice > maxPrice)
  await runCell(results, 'C2', 4, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/services', { query: { minPrice: 500000, maxPrice: 100000 } });
    assertions.assertS4ValidationError(res, 'C2 S4 minPrice > maxPrice');
    return `minPrice > maxPrice -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C2 - S5: Search text overflow (> 100 chars)
  await runCell(results, 'C2', 5, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/services', { query: { search: '<b>' + 'S'.repeat(120) + '</b>' } });
    assertions.assertS5HtmlOverflowRejected(res, 'C2 S5 search > 100 chars');
    return `search > 100 chars -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C2 - S6: Whitespace search ('   \u3000   ')
  await runCell(results, 'C2', 6, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/services', { query: { search: '   \u3000\u3000   ' } });
    assertions.assertStatus(res, 200, 'C2 S6 whitespace search trimmed cleanly');
    return `search='\\u3000' -> HTTP ${res.status} (total=${res.data?.total})`;
  });

  // C2 - S7: Full-width digits in minPrice / maxPrice / page
  await runCell(results, 'C2', 7, 'APP', 'API+UI', async () => {
    const res = await adminHttp.get('/services', {
      query: { minPrice: '１００００', maxPrice: '９０００００', page: '１', pageSize: '５' },
    });
    assertions.assertS7FullWidthDigitsHandled(res, { allowNormalizedSuccess: true }, 'C2 S7 full-width filter digits');
    return `Full-width minPrice/maxPrice/page -> HTTP ${res.status} (page=${res.data?.page})`;
  });

  // C2 - S8: Select-option filter validation (invalid status / invalid group)
  await runCell(results, 'C2', 8, 'APP', 'API+UI', async () => {
    const resBadStatus = await adminHttp.get('/services', { query: { status: 'InvalidStatus' } });
    assertions.assertS8SelectOptionValidated(resBadStatus, 'C2 S8 invalid status filter');
    const resBadGroup = await adminHttp.get('/services', { query: { group: 'abc' } });
    assertions.assertS8SelectOptionValidated(resBadGroup, 'C2 S8 non-numeric group=abc');
    return `status=InvalidStatus -> ${resBadStatus.status}, group=abc -> ${resBadGroup.status}`;
  });

  await runCell(results, 'C2', 9, 'N/A', 'N/A', async () => 'C2 chỉ đọc danh sách, không có thao tác tạo mới');

  // C2 - S10: URL query params (?page=abc, ?page=99999)
  await runCell(results, 'C2', 10, 'APP', 'API+UI', async () => {
    const resAbc = await adminHttp.get('/services', { query: { page: 'abc', pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resAbc, 'C2 S10 page=abc');
    const resHigh = await adminHttp.get('/services', { query: { page: 99999, pageSize: 10 } });
    assertions.assertS10InvalidPageParamRejected(resHigh, 'C2 S10 page=99999');
    return `page=abc -> ${resAbc.status}, page=99999 -> ${resHigh.status}`;
  });

  await runCell(results, 'C2', 11, 'N/A', 'N/A', async () => 'C2 không có chức năng upload ảnh');
  await runCell(results, 'C2', 12, 'N/A', 'N/A', async () => 'C2 không hiển thị ảnh dịch vụ');
  await runCell(results, 'C2', 13, 'N/A', 'N/A', async () => 'C2 không có chức năng cập nhật ảnh');
  await runCell(results, 'C2', 14, 'N/A', 'N/A', async () => 'C2 không có thao tác xóa (kiểm thử quyền xóa thuộc C1 S14)');

  // =========================================================================
  // FEATURE C3: Đặt dịch vụ (Service Ordering / Dispatch)
  // =========================================================================

  await runCell(results, 'C3', 1, 'N/A', 'N/A', async () => 'C3 là luồng tạo đơn đặt dịch vụ, thao tác hủy đơn thuộc C4 S1');
  await runCell(results, 'C3', 2, 'N/A', 'N/A', async () => 'C3 là luồng tạo mới đơn dịch vụ, cập nhật trạng thái thuộc C4 S2');

  // C3 - S3: Invalid / non-existent stayId or serviceId
  await runCell(results, 'C3', 3, 'API-ONLY', 'API', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    for (const badId of ['abc', '1abc', '99999999999']) {
      const resStay = await recepHttp.post('/service-orders', {
        stayId: badId,
        serviceId: svc.ServiceId,
        quantity: 1,
      });
      assertions.assertS3InvalidIdRejected(resStay, `C3 S3 stayId=${badId}`);
      const resSvc = await recepHttp.post('/service-orders', {
        stayId: seededStay.StayId,
        serviceId: badId,
        quantity: 1,
      });
      assertions.assertS3InvalidIdRejected(resSvc, `C3 S3 serviceId=${badId}`);
    }
    return 'stayId & serviceId {abc,1abc,99999999999} rejected with 400/404';
  });

  // C3 - S4: Form validation (quantity bounds 1..100 & discrete vs hour unit step)
  await runCell(results, 'C3', 4, 'APP', 'API+UI', async () => {
    const discreteSvc = await db.seedService({ categoryId: seededCat.CategoryId, unit: 'Lần' });
    const hourSvc = await db.seedService({ categoryId: seededCat.CategoryId, unit: 'Giờ' });

    const resOver100 = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: discreteSvc.ServiceId,
      quantity: 101,
    });
    assertions.assertS4ValidationError(resOver100, 'C3 S4 quantity=101 > 100');

    const resFracDiscrete = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: discreteSvc.ServiceId,
      quantity: 1.5,
    });
    assertions.assertS4ValidationError(resFracDiscrete, 'C3 S4 fractional quantity on discrete unit');

    const resHourHalf = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: hourSvc.ServiceId,
      quantity: 1.5,
      note: config.makeTag('ORD_HOUR'),
    });
    assertions.assertStatus(resHourHalf, 201, 'C3 S4 1.5 quantity allowed on Giờ unit');
    return `qty=101 -> ${resOver100.status}, discrete 1.5 -> ${resFracDiscrete.status}, hour 1.5 -> ${resHourHalf.status}`;
  });

  // C3 - S5: Large HTML paste in note (> 500 chars)
  await runCell(results, 'C3', 5, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const res = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: 1,
      note: '<div>' + 'N'.repeat(550) + '</div>',
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C3 S5 note > 500 chars');
    return `note > 500 chars -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C3 - S6: Full-width whitespace in note (> 500 '\u3000' trimmed before max length check)
  await runCell(results, 'C3', 6, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const res = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: 1,
      note: '\u3000'.repeat(600),
    });
    assertions.assertStatus(res, 201, 'C3 S6 optional note with 600x\\u3000 trimmed to empty');
    return `600x\\u3000 in optional note -> HTTP ${res.status}`;
  });

  // C3 - S7: Full-width digits in quantity ('２')
  await runCell(results, 'C3', 7, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId, price: 100000 });
    const res = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: '２',
      note: config.makeTag('ORD_FW'),
    });
    assertions.assertS7FullWidthDigitsHandled(
      res,
      {
        allowNormalizedSuccess: true,
        expectedNumericValue: 200000,
        actualValue: res.data?.data?.TotalPrice ?? res.data?.data?.totalPrice,
      },
      'C3 S7 quantity=２'
    );
    return `quantity='２' -> HTTP ${res.status}, TotalPrice=${res.data?.data?.TotalPrice ?? res.data?.data?.totalPrice}`;
  });

  // C3 - S8: Select-option validation (inactive service / invalid stay status)
  await runCell(results, 'C3', 8, 'APP', 'API+UI', async () => {
    const inactiveSvc = await db.seedService({ categoryId: seededCat.CategoryId, status: 'Inactive' });
    const res = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: inactiveSvc.ServiceId,
      quantity: 1,
    });
    assertions.assertS8SelectOptionValidated(res, 'C3 S8 inactive serviceId');
    return `Inactive serviceId -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C3 - S9: Duplicate submit on create service order
  await runCell(results, 'C3', 9, 'APP', 'API+UI', async () => {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const noteTag = config.makeTag('ORD_DUP');
    const r1 = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: 2,
      note: noteTag,
    });
    const r2 = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: 2,
      note: noteTag,
    });
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM ServiceOrders WHERE Note = ?', [noteTag]);
    assertions.assertS9NoDuplicateCreate(Number(row.cnt), 1, 'C3 S9 duplicate service order within 5s');
    return `r1=${r1.status}, r2=${r2.status} (${r2.data?.code}), DB count=${row.cnt}`;
  });

  // C3 - S10: URL query params on GET /service-orders (?stayId=abc&status=Invalid)
  await runCell(results, 'C3', 10, 'APP', 'API', async () => {
    const resBadStay = await recepHttp.get('/service-orders', { query: { stayId: 'abc' } });
    assertions.assertS10InvalidPageParamRejected(resBadStay, 'C3 S10 stayId=abc');
    const resBadStatus = await recepHttp.get('/service-orders', { query: { status: 'InvalidStatus' } });
    assertions.assertS10InvalidPageParamRejected(resBadStatus, 'C3 S10 status=InvalidStatus');
    return `stayId=abc -> ${resBadStay.status}, status=InvalidStatus -> ${resBadStatus.status}`;
  });

  await runCell(results, 'C3', 11, 'N/A', 'N/A', async () => 'C3 không có phần tử upload ảnh');
  await runCell(results, 'C3', 12, 'N/A', 'N/A', async () => 'C3 không hiển thị ảnh upload');
  await runCell(results, 'C3', 13, 'N/A', 'N/A', async () => 'C3 không có form cập nhật ảnh');

  // C3 - S14: Unauthenticated access to GET /service-orders and /active-stays blocked
  await runCell(results, 'C3', 14, 'APP', 'API+UI', async () => {
    const resOrdersAnon = await anonHttp.get('/service-orders', { noAuth: true });
    assertions.assertS14UnauthBlocked(resOrdersAnon, 'C3 S14 anon GET /service-orders');
    const resStaysAnon = await anonHttp.get('/service-orders/active-stays', { noAuth: true });
    assertions.assertS14UnauthBlocked(resStaysAnon, 'C3 S14 anon GET /service-orders/active-stays');
    const resStaysGuest = await guestHttp.get('/service-orders/active-stays');
    assertions.assertS14UnauthBlocked(resStaysGuest, 'C3 S14 guest GET /service-orders/active-stays');
    return `Anon orders=${resOrdersAnon.status}, Anon stays=${resStaysAnon.status}, Guest stays=${resStaysGuest.status}`;
  });

  // =========================================================================
  // FEATURE C4: Quản lý tiến độ thực hiện dịch vụ (Kanban)
  // =========================================================================

  // Helper to create a fresh ServiceOrder
  async function createFreshOrder() {
    const svc = await db.seedService({ categoryId: seededCat.CategoryId });
    const res = await recepHttp.post('/service-orders', {
      stayId: seededStay.StayId,
      serviceId: svc.ServiceId,
      quantity: 1,
      note: config.makeTag('C4_ORD'),
    });
    assertions.assertStatus(res, 201, 'Seed C4 ServiceOrder');
    return res.data?.data?.OrderId || res.data?.data?.orderId;
  }

  // C4 - S1: 2-tab cancel order
  await runCell(results, 'C4', 1, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const res1 = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: 'Khách báo hủy ở Tab 1',
    });
    assertions.assertStatus(res1, 200, 'C4 S1 Tab 1 cancel');
    const res2 = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: 'Tab 2 hủy lại đơn đã hủy',
    });
    assertions.assertS1DeleteConflict(res2, 'C4 S1 Tab 2 cancel already-cancelled');
    return `Tab1=200, Tab2=${res2.status} (${res2.data?.code})`;
  });

  // C4 - S2: 2-tab concurrent status update with version optimistic locking
  await runCell(results, 'C4', 2, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const res1 = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'InProgress',
      version: 1,
    });
    assertions.assertStatus(res1, 200, 'C4 S2 Tab 1 -> InProgress (v=1)');
    const res2 = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Completed',
      version: 1,
    });
    assertions.assertS2OptimisticLockConflict(res2, 'C4 S2 Tab 2 stale version=1');
    return `Tab1=200 (v=${res1.data?.data?.version}), Tab2=409 (${res2.data?.code})`;
  });

  // C4 - S3: Invalid / non-existent orderId ('abc', '1abc', '99999999999')
  await runCell(results, 'C4', 3, 'API-ONLY', 'API', async () => {
    for (const badId of ['abc', '1abc', '99999999999']) {
      const res = await recepHttp.patch(`/service-orders/${badId}/status`, {
        newStatus: 'InProgress',
      });
      assertions.assertS3InvalidIdRejected(res, `C4 S3 orderId=${badId}`);
    }
    return 'PATCH /service-orders/{abc,1abc,99999999999}/status rejected with 400/404';
  });

  // C4 - S4: Cancel reason validation (< 2 chars)
  await runCell(results, 'C4', 4, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const resShort = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: 'A',
    });
    assertions.assertS4ValidationError(resShort, 'C4 S4 cancelReason < 2 chars');
    return `cancelReason='A' -> HTTP ${resShort.status} (${resShort.data?.code})`;
  });

  // C4 - S5: Large HTML paste in cancelReason (> 500 chars)
  await runCell(results, 'C4', 5, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const res = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: '<p>' + 'C'.repeat(520) + '</p>',
    });
    assertions.assertS5HtmlOverflowRejected(res, 'C4 S5 cancelReason > 500 chars');
    return `cancelReason > 500 chars -> HTTP ${res.status} (${res.data?.code})`;
  });

  // C4 - S6: Full-width whitespace in cancelReason ('\u3000\u3000\u3000')
  await runCell(results, 'C4', 6, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const res = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: '  \u3000\u3000\u3000  ',
    });
    assertions.assertS6WhitespaceRejected(res, 'C4 S6 full-width whitespace cancelReason');
    return `cancelReason='\\u3000' -> HTTP ${res.status} (${res.data?.code})`;
  });

  await runCell(results, 'C4', 7, 'N/A', 'N/A', async () => 'Form cập nhật tiến độ Kanban (C4) không có trường nhập số');

  // C4 - S8: Invalid status option
  await runCell(results, 'C4', 8, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const res = await recepHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'BogusStatus',
    });
    assertions.assertS8SelectOptionValidated(res, 'C4 S8 invalid newStatus');
    return `newStatus='BogusStatus' -> HTTP ${res.status} (${res.data?.code})`;
  });

  await runCell(results, 'C4', 9, 'N/A', 'N/A', async () => 'C4 là bảng Kanban chuyển trạng thái đơn đã có, không có thao tác tạo mới');
  await runCell(results, 'C4', 10, 'N/A', 'N/A', async () => 'Màn hình Kanban (C4) hiển thị theo cột trạng thái, không phân trang qua URL ?page=');
  await runCell(results, 'C4', 11, 'N/A', 'N/A', async () => 'C4 không có phần tử upload ảnh');
  await runCell(results, 'C4', 12, 'N/A', 'N/A', async () => 'C4 không hiển thị ảnh upload');
  await runCell(results, 'C4', 13, 'N/A', 'N/A', async () => 'C4 không có chức năng cập nhật ảnh');

  // C4 - S14: Unauthenticated cancel & Guest cancelling InProgress order blocked
  await runCell(results, 'C4', 14, 'APP', 'API+UI', async () => {
    const orderId = await createFreshOrder();
    const resAnon = await anonHttp.patch(
      `/service-orders/${orderId}/status`,
      { newStatus: 'Cancelled', cancelReason: 'Anon cancel' },
      { noAuth: true }
    );
    assertions.assertS14UnauthBlocked(resAnon, 'C4 S14 anon cancel');

    await recepHttp.patch(`/service-orders/${orderId}/status`, { newStatus: 'InProgress' });
    const resGuestInProg = await guestHttp.patch(`/service-orders/${orderId}/status`, {
      newStatus: 'Cancelled',
      cancelReason: 'Guest cancel InProgress',
    });
    assertions.assertS14UnauthBlocked(resGuestInProg, 'C4 S14 guest cancel InProgress order');
    return `Anon cancel=${resAnon.status}, Guest cancel InProgress=${resGuestInProg.status}`;
  });

  return results;
}

module.exports = {
  name: 'Suite 01: Services Track (C1–C4 × S1–S14)',
  features: ['C1', 'C2', 'C3', 'C4'],
  runSuite,
};
