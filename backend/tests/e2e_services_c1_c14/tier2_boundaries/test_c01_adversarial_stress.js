'use strict';

/**
 * test_c01_adversarial_stress.js
 * Adversarial stress testing harness for FEAT-SERVICE-01:
 *  1. Category status stress (soft-deleted, inactive, casing variations, non-existent, null/empty IDs)
 *  2. Input boundaries & malicious inputs (price limits, extreme floats, numeric strings, non-numeric,
 *     unicode boundaries for name/unit/desc, XSS payloads, SQL injection payloads)
 *  3. Reactivate lifecycle edge cases (inactive in inactive cat, reactivate after category reactivated,
 *     soft-deleted cat, non-existent, idempotency on deactivate/reactivate)
 *  4. Security & permissions (401/403 across all write endpoints, public access verification)
 */

const { request } = require('../helpers/apiClient');
const { getAuthContext } = require('../helpers/authHelper');
const { TestSuiteTracker, assert } = require('../helpers/assertionHelper');
const { ServiceCategory, Service } = require('../../../src/models');

async function run(tracker = new TestSuiteTracker('Adversarial Stress & Attack Scenarios (FEAT-SERVICE-01)')) {
  const { adminToken, recToken } = await getAuthContext();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  // ─── SETUP: Test Categories & Fixtures ──────────────────────────────────────
  let activeCat = await ServiceCategory.findOne({ where: { Status: 'Active', IsDeleted: false } });
  if (!activeCat) {
    activeCat = await ServiceCategory.create({
      CategoryName: `Active Cat Stress ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });
  }

  let [inactiveCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Inactive Stress Test' },
    defaults: { Status: 'Inactive', IsDeleted: false, Description: 'Stress test category inactive' },
  });
  if (inactiveCat.Status !== 'Inactive' || inactiveCat.IsDeleted) {
    inactiveCat.Status = 'Inactive';
    inactiveCat.IsDeleted = false;
    await inactiveCat.save();
  }

  let [deletedCat] = await ServiceCategory.findOrCreate({
    where: { CategoryName: 'Nhóm Soft Deleted Stress Test' },
    defaults: { Status: 'Inactive', IsDeleted: true, Description: 'Stress test category soft-deleted' },
  });
  if (!deletedCat.IsDeleted) {
    deletedCat.IsDeleted = true;
    await deletedCat.save();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CATEGORY STATUS STRESS
  // ─────────────────────────────────────────────────────────────────────────────

  // TC_ADV_01: Create service referencing soft-deleted category -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: deletedCat.CategoryId,
        serviceName: `Dịch vụ Soft Deleted Cat ${Date.now()}`,
        price: 100000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_01', 'Create service with soft-deleted category rejected with 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_ADV_01', 'Create service with soft-deleted category', err);
  }

  // TC_ADV_02: Update service referencing soft-deleted category -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Cho Update Soft Deleted ${Date.now()}`,
        price: 120000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(createRes.status, 201, `Setup failed: ${createRes.status}`);
    const serviceId = createRes.data?.data?.ServiceId;

    const updateRes = await request(`/services/${serviceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { categoryId: deletedCat.CategoryId },
    });
    assert.strictEqual(updateRes.status, 400, `Expected 400 Bad Request, got ${updateRes.status}`);
    assert.strictEqual(updateRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(updateRes.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_02', 'Update service with soft-deleted category rejected with 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_ADV_02', 'Update service with soft-deleted category', err);
  }

  // TC_ADV_03: Create service referencing inactive category -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: inactiveCat.CategoryId,
        serviceName: `Dịch vụ Inactive Cat ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_03', 'Create service with inactive category rejected with 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_ADV_03', 'Create service with inactive category', err);
  }

  // TC_ADV_04: Update service referencing inactive category -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Cho Update Inactive ${Date.now()}`,
        price: 130000,
        unit: 'Lượt',
      },
    });
    const serviceId = createRes.data?.data?.ServiceId;

    const updateRes = await request(`/services/${serviceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { categoryId: inactiveCat.CategoryId },
    });
    assert.strictEqual(updateRes.status, 400, `Expected 400 Bad Request, got ${updateRes.status}`);
    assert.strictEqual(updateRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');
    assert.strictEqual(updateRes.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_04', 'Update service with inactive category rejected with 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_ADV_04', 'Update service with inactive category', err);
  }

  // TC_ADV_05: Create service referencing non-existent category (e.g. 999999999) -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: 999999999,
        serviceName: `Dịch vụ Cat Không Tồn Tại ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_05', 'Create service referencing non-existent category returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_ADV_05', 'Create service referencing non-existent category', err);
  }

  // TC_ADV_06: Create service with null / empty categoryId -> 400 ERROR_0001_REQUIRED
  try {
    const resNull = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: null,
        serviceName: `Dịch vụ CategoryId Null ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resNull.status, 400, `Expected 400 for null categoryId, got ${resNull.status}`);
    assert.strictEqual(resNull.data?.code, 'ERROR_0001_REQUIRED');
    assert.strictEqual(resNull.data?.field, 'categoryId');

    const resEmpty = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: '',
        serviceName: `Dịch vụ CategoryId Empty ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resEmpty.status, 400, `Expected 400 for empty categoryId, got ${resEmpty.status}`);
    assert.strictEqual(resEmpty.data?.code, 'ERROR_0001_REQUIRED');
    assert.strictEqual(resEmpty.data?.field, 'categoryId');

    tracker.recordPass('TC_ADV_06', 'Create service with null/empty categoryId returns 400 ERROR_0001_REQUIRED');
  } catch (err) {
    tracker.recordFail('TC_ADV_06', 'Create service with null/empty categoryId', err);
  }

  // TC_ADV_07: Create category with mixed casing duplicate -> 409 ERROR_0007_DUPLICATE
  try {
    const baseName = `Mixed Casing Cat ${Date.now()}`;
    const createFirst = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: baseName },
    });
    assert.strictEqual(createFirst.status, 201, `Failed to create initial category: ${createFirst.status}`);

    // Try uppercase
    const createUpper = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: baseName.toUpperCase() },
    });
    assert.strictEqual(createUpper.status, 409, `Expected 409 for uppercase duplicate, got ${createUpper.status}`);
    assert.strictEqual(createUpper.data?.code, 'ERROR_0007_DUPLICATE');

    // Try lowercase
    const createLower = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: baseName.toLowerCase() },
    });
    assert.strictEqual(createLower.status, 409, `Expected 409 for lowercase duplicate, got ${createLower.status}`);
    assert.strictEqual(createLower.data?.code, 'ERROR_0007_DUPLICATE');

    tracker.recordPass('TC_ADV_07', 'Category duplicate check correctly detects mixed casing variations (409)');
  } catch (err) {
    tracker.recordFail('TC_ADV_07', 'Category mixed casing duplicate check', err);
  }

  // TC_ADV_08: Create category with Vietnamese diacritics variation -> 409 ERROR_0007_DUPLICATE
  try {
    const baseDiacritic = `Ẩm Thực Quê Nhà ${Date.now()}`;
    const createFirst = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: baseDiacritic },
    });
    assert.strictEqual(createFirst.status, 201, `Failed to create initial diacritic category: ${createFirst.status}`);

    // Non-diacritic equivalent
    const nonDiacritic = baseDiacritic
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd');

    const createDup = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: nonDiacritic },
    });
    assert.strictEqual(createDup.status, 409, `Expected 409 for diacritic variation, got ${createDup.status}`);
    assert.strictEqual(createDup.data?.code, 'ERROR_0007_DUPLICATE');

    tracker.recordPass('TC_ADV_08', 'Category duplicate check correctly detects Vietnamese diacritic variations (409)');
  } catch (err) {
    tracker.recordFail('TC_ADV_08', 'Category Vietnamese diacritic duplicate check', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. INPUT BOUNDARIES & MALICIOUS INPUTS
  // ─────────────────────────────────────────────────────────────────────────────

  // TC_ADV_09: Price formatted at exact maximum boundary (999,999,999.99) -> 201 Created
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Max Price ${Date.now()}`,
        price: 999999999.99,
        unit: 'Gói VIP',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 for max price 999,999,999.99, got ${res.status}`);
    assert.strictEqual(Number(res.data?.data?.Price), 999999999.99);
    tracker.recordPass('TC_ADV_09', 'Price at exact max boundary 999,999,999.99 succeeds (201)');
  } catch (err) {
    tracker.recordFail('TC_ADV_09', 'Price at exact max boundary 999,999,999.99', err);
  }

  // TC_ADV_10: Price exceeding maximum boundary (1,000,000,000) -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Over Max Price ${Date.now()}`,
        price: 1000000000,
        unit: 'Gói VIP',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 for price 1,000,000,000, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(res.data?.field, 'price');
    tracker.recordPass('TC_ADV_10', 'Price exceeding max boundary (1,000,000,000) returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_ADV_10', 'Price exceeding max boundary (1,000,000,000)', err);
  }

  // TC_ADV_11: Price negative & zero -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const resNeg = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá Âm ${Date.now()}`,
        price: -50000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resNeg.status, 400, `Expected 400 for negative price, got ${resNeg.status}`);
    assert.strictEqual(resNeg.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(resNeg.data?.field, 'price');

    const resZero = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Giá 0 ${Date.now()}`,
        price: 0,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resZero.status, 400, `Expected 400 for zero price, got ${resZero.status}`);
    assert.strictEqual(resZero.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(resZero.data?.field, 'price');

    tracker.recordPass('TC_ADV_11', 'Price negative and zero reject with 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_ADV_11', 'Price negative and zero rejection', err);
  }

  // TC_ADV_12: Price as non-numeric string or malformed formatting -> 400 ERROR_0004_INVALID_FORMAT
  try {
    const malformedPrices = ['not-a-number', '$500', '150,000', 'NaN', 'undefined'];
    for (const badPrice of malformedPrices) {
      const res = await request('/services', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          categoryId: activeCat.CategoryId,
          serviceName: `Dịch vụ Malformed Price ${Date.now()}`,
          price: badPrice,
          unit: 'Lượt',
        },
      });
      assert.strictEqual(res.status, 400, `Expected 400 for price "${badPrice}", got ${res.status}`);
      assert.strictEqual(res.data?.code, 'ERROR_0004_INVALID_FORMAT', `Expected ERROR_0004_INVALID_FORMAT for "${badPrice}"`);
      assert.strictEqual(res.data?.field, 'price');
    }
    tracker.recordPass('TC_ADV_12', 'Non-numeric & malformed price strings return 400 ERROR_0004_INVALID_FORMAT');
  } catch (err) {
    tracker.recordFail('TC_ADV_12', 'Non-numeric price strings', err);
  }

  // TC_ADV_13: Price as valid numeric string -> 201 Created and properly parsed
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Numeric String Price ${Date.now()}`,
        price: '350000',
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 for numeric string "350000", got ${res.status}`);
    assert.strictEqual(Number(res.data?.data?.Price), 350000);
    tracker.recordPass('TC_ADV_13', 'Valid numeric string price "350000" accepted and correctly parsed');
  } catch (err) {
    tracker.recordFail('TC_ADV_13', 'Valid numeric string price', err);
  }

  // TC_ADV_14: Price extreme float (1e15) -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Extreme Float ${Date.now()}`,
        price: 1e15,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400 for 1e15 price, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(res.data?.field, 'price');
    tracker.recordPass('TC_ADV_14', 'Extreme float price (1e15) rejected with 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_ADV_14', 'Extreme float price', err);
  }

  // TC_ADV_15: ServiceName boundary: 150 unicode characters (pass) vs 151 (reject 400)
  try {
    // 150 chars: 'Dịch vụ VIP cao cấp đặc biệt cho khách hàng... [padded]'
    const baseStr = 'Dịch vụ khách sạn 5 sao chuẩn quốc tế ';
    const valid150 = baseStr + 'A'.repeat(150 - baseStr.length);
    assert.strictEqual(valid150.length, 150);

    const resValid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: valid150,
        price: 500000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resValid.status, 201, `Expected 201 for 150 chars name, got ${resValid.status}`);

    const invalid151 = valid150 + 'X';
    assert.strictEqual(invalid151.length, 151);

    const resInvalid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: invalid151,
        price: 500000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(resInvalid.status, 400, `Expected 400 for 151 chars name, got ${resInvalid.status}`);
    assert.strictEqual(resInvalid.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(resInvalid.data?.field, 'serviceName');

    tracker.recordPass('TC_ADV_15', 'ServiceName boundary enforced at exactly 150 chars (150 pass, 151 reject)');
  } catch (err) {
    tracker.recordFail('TC_ADV_15', 'ServiceName boundary test', err);
  }

  // TC_ADV_16: Unit boundary: 50 chars (pass) vs 51 chars (reject 400)
  try {
    const valid50 = 'Đơn vị tính '.padEnd(50, 'U');
    assert.strictEqual(valid50.length, 50);

    const resValid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Unit 50 ${Date.now()}`,
        price: 500000,
        unit: valid50,
      },
    });
    assert.strictEqual(resValid.status, 201, `Expected 201 for 50 chars unit, got ${resValid.status}`);

    const invalid51 = valid50 + 'X';
    assert.strictEqual(invalid51.length, 51);

    const resInvalid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Unit 51 ${Date.now()}`,
        price: 500000,
        unit: invalid51,
      },
    });
    assert.strictEqual(resInvalid.status, 400, `Expected 400 for 51 chars unit, got ${resInvalid.status}`);
    assert.strictEqual(resInvalid.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(resInvalid.data?.field, 'unit');

    tracker.recordPass('TC_ADV_16', 'Unit boundary enforced at exactly 50 chars (50 pass, 51 reject)');
  } catch (err) {
    tracker.recordFail('TC_ADV_16', 'Unit boundary test', err);
  }

  // TC_ADV_17: Description boundary: 1000 chars (pass) vs 1001 chars (reject 400)
  try {
    const valid1000 = 'Mô tả dịch vụ chi tiết '.padEnd(1000, 'D');
    assert.strictEqual(valid1000.length, 1000);

    const resValid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Desc 1000 ${Date.now()}`,
        price: 500000,
        unit: 'Lượt',
        description: valid1000,
      },
    });
    assert.strictEqual(resValid.status, 201, `Expected 201 for 1000 chars description, got ${resValid.status}`);

    const invalid1001 = valid1000 + 'X';
    assert.strictEqual(invalid1001.length, 1001);

    const resInvalid = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Desc 1001 ${Date.now()}`,
        price: 500000,
        unit: 'Lượt',
        description: invalid1001,
      },
    });
    assert.strictEqual(resInvalid.status, 400, `Expected 400 for 1001 chars description, got ${resInvalid.status}`);
    assert.strictEqual(resInvalid.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(resInvalid.data?.field, 'description');

    tracker.recordPass('TC_ADV_17', 'Description boundary enforced at exactly 1000 chars (1000 pass, 1001 reject)');
  } catch (err) {
    tracker.recordFail('TC_ADV_17', 'Description boundary test', err);
  }

  // TC_ADV_18: Script injection (XSS) in serviceName & description -> handled safely without server crash
  try {
    const xssPayloadName = `<script>alert("xss")</script> ${Date.now()}`;
    const xssPayloadDesc = `<img src=x onerror=alert(document.cookie)><iframe src="evil.com"></iframe>`;

    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: xssPayloadName,
        price: 250000,
        unit: 'Lượt',
        description: xssPayloadDesc,
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 for script payload, got ${res.status}`);
    const createdId = res.data?.data?.ServiceId;

    // Verify retrieval works cleanly without JSON parsing break
    const listRes = await request(`/services?search=${encodeURIComponent('xss')}`);
    assert.strictEqual(listRes.status, 200, `Failed to retrieve services: ${listRes.status}`);
    const found = listRes.data?.data?.find((s) => s.ServiceId === createdId);
    assert.ok(found, 'Created service with XSS string should be stored and retrievable as pure text');
    assert.strictEqual(found.ServiceName, xssPayloadName);

    tracker.recordPass('TC_ADV_18', 'XSS/HTML payloads stored safely as literal strings without crashing API');
  } catch (err) {
    tracker.recordFail('TC_ADV_18', 'XSS payload test', err);
  }

  // TC_ADV_19: SQL Injection payloads in serviceName & search query -> handled safely without SQL error
  try {
    const sqliPayload = `Safe'; DROP TABLE Services; -- ${Date.now()}`;
    const res = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: sqliPayload,
        price: 300000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(res.status, 201, `Expected 201 for SQLi payload, got ${res.status}`);

    // Verify search with SQLi syntax
    const searchRes = await request(`/services?search=${encodeURIComponent("' OR '1'='1")}`);
    assert.strictEqual(searchRes.status, 200, `Expected 200 OK for SQLi search query, got ${searchRes.status}`);

    tracker.recordPass('TC_ADV_19', 'SQL Injection payloads handled safely via parameterized queries without corruption');
  } catch (err) {
    tracker.recordFail('TC_ADV_19', 'SQL Injection payload test', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REACTIVATE LIFECYCLE & STATE TRANSITIONS
  // ─────────────────────────────────────────────────────────────────────────────

  // TC_ADV_20: Inactive service in inactive category -> try reactivating (fails 400),
  // then activate category -> reactivate service -> verify service becomes Active (200)
  try {
    // 1. Create a dedicated category that we will toggle
    const toggleCat = await ServiceCategory.create({
      CategoryName: `Nhóm Chu Kỳ Test ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
      Description: 'Category for reactivation lifecycle stress test',
    });

    // 2. Create service in this category
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: toggleCat.CategoryId,
        serviceName: `Dịch vụ Chu Kỳ ${Date.now()}`,
        price: 180000,
        unit: 'Lượt',
      },
    });
    assert.strictEqual(createRes.status, 201, 'Service creation failed');
    const serviceId = createRes.data?.data?.ServiceId;

    // 3. Deactivate the service
    const deactRes = await request(`/services/${serviceId}/deactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(deactRes.status, 200, 'Deactivate service failed');
    assert.strictEqual(deactRes.data?.data?.Status, 'Inactive');

    // 4. Inactivate the parent category
    toggleCat.Status = 'Inactive';
    await toggleCat.save();

    // 5. Try reactivating service while category is Inactive -> Must fail with 400 ERROR_0014_INACTIVE_REFERENCE
    const reactivateBlockedRes = await request(`/services/${serviceId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(reactivateBlockedRes.status, 400, `Expected 400, got ${reactivateBlockedRes.status}`);
    assert.strictEqual(reactivateBlockedRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');

    // Verify service is still Inactive
    const svcCheckBlocked = await Service.findByPk(serviceId);
    assert.strictEqual(svcCheckBlocked.Status, 'Inactive', 'Service should remain Inactive');

    // 6. Now reactivate the parent category
    toggleCat.Status = 'Active';
    await toggleCat.save();

    // 7. Try reactivating service again -> Must succeed with 200 OK
    const reactivateSuccessRes = await request(`/services/${serviceId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(reactivateSuccessRes.status, 200, `Expected 200, got ${reactivateSuccessRes.status}`);
    assert.strictEqual(reactivateSuccessRes.data?.data?.Status, 'Active');

    // Verify in DB that status is now Active
    const svcCheckActive = await Service.findByPk(serviceId);
    assert.strictEqual(svcCheckActive.Status, 'Active', 'Service status must be Active after category reactivation');

    tracker.recordPass('TC_ADV_20', 'Lifecycle: Reactivate rejected while category inactive -> permitted once category active');
  } catch (err) {
    tracker.recordFail('TC_ADV_20', 'Reactivate lifecycle edge case', err);
  }

  // TC_ADV_21: Reactivate non-existent service ID -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request('/services/999999999/reactivate', {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    tracker.recordPass('TC_ADV_21', 'Reactivate non-existent service ID returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_ADV_21', 'Reactivate non-existent service', err);
  }

  // TC_ADV_22: Idempotency of deactivate and reactivate operations
  try {
    const createRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Idempotency ${Date.now()}`,
        price: 220000,
        unit: 'Lượt',
      },
    });
    const serviceId = createRes.data?.data?.ServiceId;

    // Reactivate already active service -> Should succeed 200
    const reactivateActive = await request(`/services/${serviceId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(reactivateActive.status, 200, 'Reactivate already active should be 200');
    assert.strictEqual(reactivateActive.data?.data?.Status, 'Active');

    // Deactivate once
    const deact1 = await request(`/services/${serviceId}/deactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(deact1.status, 200, 'First deactivate should be 200');

    // Deactivate second time -> Idempotent 200
    const deact2 = await request(`/services/${serviceId}/deactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(deact2.status, 200, 'Second deactivate should be 200 idempotent');
    assert.strictEqual(deact2.data?.data?.Status, 'Inactive');

    tracker.recordPass('TC_ADV_22', 'Deactivate and reactivate are idempotent without state corruption');
  } catch (err) {
    tracker.recordFail('TC_ADV_22', 'Idempotency test', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SECURITY & PERMISSIONS MIDDLEWARE (401 / 403)
  // ─────────────────────────────────────────────────────────────────────────────

  // TC_ADV_23: Security 401 Unauthenticated checks across all write endpoints
  try {
    // 1. POST /services
    const p1 = await request('/services', { method: 'POST', body: { serviceName: 'NoAuth' } });
    assert.strictEqual(p1.status, 401, `POST /services expected 401, got ${p1.status}`);
    assert.strictEqual(p1.data?.code, 'ERROR_0009_UNAUTHENTICATED');

    // 2. PUT /services/:id
    const p2 = await request('/services/1', { method: 'PUT', body: { serviceName: 'NoAuth' } });
    assert.strictEqual(p2.status, 401, `PUT /services/1 expected 401, got ${p2.status}`);
    assert.strictEqual(p2.data?.code, 'ERROR_0009_UNAUTHENTICATED');

    // 3. PATCH /services/:id/deactivate
    const p3 = await request('/services/1/deactivate', { method: 'PATCH' });
    assert.strictEqual(p3.status, 401, `PATCH /deactivate expected 401, got ${p3.status}`);
    assert.strictEqual(p3.data?.code, 'ERROR_0009_UNAUTHENTICATED');

    // 4. PATCH /services/:id/reactivate
    const p4 = await request('/services/1/reactivate', { method: 'PATCH' });
    assert.strictEqual(p4.status, 401, `PATCH /reactivate expected 401, got ${p4.status}`);
    assert.strictEqual(p4.data?.code, 'ERROR_0009_UNAUTHENTICATED');

    // 5. POST /services/categories
    const p5 = await request('/services/categories', { method: 'POST', body: { categoryName: 'NoAuth' } });
    assert.strictEqual(p5.status, 401, `POST /categories expected 401, got ${p5.status}`);
    assert.strictEqual(p5.data?.code, 'ERROR_0009_UNAUTHENTICATED');

    tracker.recordPass('TC_ADV_23', 'Unauthenticated calls to write endpoints strictly return 401 ERROR_0009_UNAUTHENTICATED');
  } catch (err) {
    tracker.recordFail('TC_ADV_23', '401 unauthenticated security check', err);
  }

  // TC_ADV_24: Security 403 Forbidden checks for unauthorized role (Receptionist)
  try {
    // 1. POST /services
    const p1 = await request('/services', { method: 'POST', headers: recHeaders, body: { serviceName: 'NoPerm' } });
    assert.strictEqual(p1.status, 403, `POST /services expected 403, got ${p1.status}`);
    assert.strictEqual(p1.data?.code, 'ERROR_0010_FORBIDDEN');

    // 2. PUT /services/:id
    const p2 = await request('/services/1', { method: 'PUT', headers: recHeaders, body: { serviceName: 'NoPerm' } });
    assert.strictEqual(p2.status, 403, `PUT /services/1 expected 403, got ${p2.status}`);
    assert.strictEqual(p2.data?.code, 'ERROR_0010_FORBIDDEN');

    // 3. PATCH /services/:id/deactivate
    const p3 = await request('/services/1/deactivate', { method: 'PATCH', headers: recHeaders });
    assert.strictEqual(p3.status, 403, `PATCH /deactivate expected 403, got ${p3.status}`);
    assert.strictEqual(p3.data?.code, 'ERROR_0010_FORBIDDEN');

    // 4. PATCH /services/:id/reactivate
    const p4 = await request('/services/1/reactivate', { method: 'PATCH', headers: recHeaders });
    assert.strictEqual(p4.status, 403, `PATCH /reactivate expected 403, got ${p4.status}`);
    assert.strictEqual(p4.data?.code, 'ERROR_0010_FORBIDDEN');

    // 5. POST /services/categories
    const p5 = await request('/services/categories', { method: 'POST', headers: recHeaders, body: { categoryName: 'NoPerm' } });
    assert.strictEqual(p5.status, 403, `POST /categories expected 403, got ${p5.status}`);
    assert.strictEqual(p5.data?.code, 'ERROR_0010_FORBIDDEN');

    tracker.recordPass('TC_ADV_24', 'Receptionist role without manage_services strictly returns 403 ERROR_0010_FORBIDDEN');
  } catch (err) {
    tracker.recordFail('TC_ADV_24', '403 forbidden security check', err);
  }

  // TC_ADV_25: Public read endpoints are accessible without authentication
  try {
    const r1 = await request('/services');
    assert.strictEqual(r1.status, 200, `GET /services expected 200, got ${r1.status}`);

    const r2 = await request('/services/categories');
    assert.strictEqual(r2.status, 200, `GET /services/categories expected 200, got ${r2.status}`);

    const r3 = await request('/services/export');
    assert.strictEqual(r3.status, 200, `GET /services/export expected 200, got ${r3.status}`);

    tracker.recordPass('TC_ADV_25', 'Public read endpoints (/services, /categories, /export) accessible without auth');
  } catch (err) {
    tracker.recordFail('TC_ADV_25', 'Public endpoints accessibility check', err);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DEEP ADVERSARIAL STRESS: UPDATE BOUNDARIES, CATEGORY BOUNDARIES & FILTER INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────────

  let sampleServiceId = null;
  try {
    const sRes = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: activeCat.CategoryId,
        serviceName: `Dịch vụ Cho Boundary Tests ${Date.now()}`,
        price: 200000,
        unit: 'Lượt',
      },
    });
    sampleServiceId = sRes.data?.data?.ServiceId;
  } catch (e) {
    console.error('Failed to setup sample service:', e);
  }

  // TC_ADV_26: PUT /services/:id with non-existent categoryId -> 404 ERROR_0011_NOT_FOUND
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { categoryId: 999999999 },
    });
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0011_NOT_FOUND');
    assert.strictEqual(res.data?.field, 'categoryId');
    tracker.recordPass('TC_ADV_26', 'PUT with non-existent categoryId returns 404 ERROR_0011_NOT_FOUND');
  } catch (err) {
    tracker.recordFail('TC_ADV_26', 'PUT non-existent categoryId', err);
  }

  // TC_ADV_27: PUT /services/:id with serviceName < 2 chars -> 400 ERROR_0002_MIN_LENGTH
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { serviceName: 'A' },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0002_MIN_LENGTH');
    assert.strictEqual(res.data?.field, 'serviceName');
    tracker.recordPass('TC_ADV_27', 'PUT with serviceName < 2 chars returns 400 ERROR_0002_MIN_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_27', 'PUT serviceName < 2 chars', err);
  }

  // TC_ADV_28: PUT /services/:id with serviceName > 150 chars -> 400 ERROR_0003_MAX_LENGTH
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { serviceName: 'B'.repeat(151) },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(res.data?.field, 'serviceName');
    tracker.recordPass('TC_ADV_28', 'PUT with serviceName > 150 chars returns 400 ERROR_0003_MAX_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_28', 'PUT serviceName > 150 chars', err);
  }

  // TC_ADV_29: PUT /services/:id with empty unit -> 400 ERROR_0001_REQUIRED
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { unit: '   ' },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0001_REQUIRED');
    assert.strictEqual(res.data?.field, 'unit');
    tracker.recordPass('TC_ADV_29', 'PUT with empty unit returns 400 ERROR_0001_REQUIRED');
  } catch (err) {
    tracker.recordFail('TC_ADV_29', 'PUT empty unit', err);
  }

  // TC_ADV_30: PUT /services/:id with unit > 50 chars -> 400 ERROR_0003_MAX_LENGTH
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { unit: 'U'.repeat(51) },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(res.data?.field, 'unit');
    tracker.recordPass('TC_ADV_30', 'PUT with unit > 50 chars returns 400 ERROR_0003_MAX_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_30', 'PUT unit > 50 chars', err);
  }

  // TC_ADV_31: PUT /services/:id with description > 1000 chars -> 400 ERROR_0003_MAX_LENGTH
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { description: 'D'.repeat(1001) },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(res.data?.field, 'description');
    tracker.recordPass('TC_ADV_31', 'PUT with description > 1000 chars returns 400 ERROR_0003_MAX_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_31', 'PUT description > 1000 chars', err);
  }

  // TC_ADV_32: PUT /services/:id with price zero or negative -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const resZero = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { price: 0 },
    });
    assert.strictEqual(resZero.status, 400, `Expected 400 for price 0, got ${resZero.status}`);
    assert.strictEqual(resZero.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(resZero.data?.field, 'price');

    const resNeg = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { price: -50000 },
    });
    assert.strictEqual(resNeg.status, 400, `Expected 400 for price -50000, got ${resNeg.status}`);
    assert.strictEqual(resNeg.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(resNeg.data?.field, 'price');

    tracker.recordPass('TC_ADV_32', 'PUT with zero or negative price returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_ADV_32', 'PUT price <= 0', err);
  }

  // TC_ADV_33: PUT /services/:id with price > 999,999,999.99 -> 400 ERROR_0012_OUT_OF_RANGE
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { price: 1000000000 },
    });
    assert.strictEqual(res.status, 400, `Expected 400 for price 1,000,000,000, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0012_OUT_OF_RANGE');
    assert.strictEqual(res.data?.field, 'price');
    tracker.recordPass('TC_ADV_33', 'PUT with price > 999,999,999.99 returns 400 ERROR_0012_OUT_OF_RANGE');
  } catch (err) {
    tracker.recordFail('TC_ADV_33', 'PUT price > 999,999,999.99', err);
  }

  // TC_ADV_34: PUT /services/:id with non-numeric price -> 400 ERROR_0004_INVALID_FORMAT
  try {
    const res = await request(`/services/${sampleServiceId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { price: 'not-a-number' },
    });
    assert.strictEqual(res.status, 400, `Expected 400 for non-numeric price, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0004_INVALID_FORMAT');
    assert.strictEqual(res.data?.field, 'price');
    tracker.recordPass('TC_ADV_34', 'PUT with non-numeric price returns 400 ERROR_0004_INVALID_FORMAT');
  } catch (err) {
    tracker.recordFail('TC_ADV_34', 'PUT non-numeric price', err);
  }

  // TC_ADV_35: POST /services/categories with name < 2 chars -> 400 ERROR_0002_MIN_LENGTH
  try {
    const res = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: 'C' },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0002_MIN_LENGTH');
    assert.strictEqual(res.data?.field, 'categoryName');
    tracker.recordPass('TC_ADV_35', 'Category name < 2 chars returns 400 ERROR_0002_MIN_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_35', 'Category name < 2 chars', err);
  }

  // TC_ADV_36: POST /services/categories with name > 100 chars -> 400 ERROR_0003_MAX_LENGTH
  try {
    const res = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { categoryName: 'K'.repeat(101) },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(res.data?.field, 'categoryName');
    tracker.recordPass('TC_ADV_36', 'Category name > 100 chars returns 400 ERROR_0003_MAX_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_36', 'Category name > 100 chars', err);
  }

  // TC_ADV_37: POST /services/categories with description > 500 chars -> 400 ERROR_0003_MAX_LENGTH
  try {
    const res = await request('/services/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryName: `Hợp lệ ${Date.now()}`,
        description: 'D'.repeat(501),
      },
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.data?.code, 'ERROR_0003_MAX_LENGTH');
    assert.strictEqual(res.data?.field, 'description');
    tracker.recordPass('TC_ADV_37', 'Category description > 500 chars returns 400 ERROR_0003_MAX_LENGTH');
  } catch (err) {
    tracker.recordFail('TC_ADV_37', 'Category description > 500 chars', err);
  }

  // TC_ADV_38: Reactivate service whose parent category was soft-deleted -> 400 ERROR_0014_INACTIVE_REFERENCE
  try {
    const deadCat = await ServiceCategory.create({
      CategoryName: `Nhóm Xóa Mềm Phản Ứng ${Date.now()}`,
      Status: 'Active',
      IsDeleted: false,
    });

    const sCreate = await request('/services', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        categoryId: deadCat.CategoryId,
        serviceName: `Dịch vụ Trong Nhóm Bị Xóa Mềm ${Date.now()}`,
        price: 100000,
        unit: 'Lượt',
      },
    });
    const deadSvcId = sCreate.data?.data?.ServiceId;

    // Soft-delete the category
    deadCat.IsDeleted = true;
    await deadCat.save();

    // Try reactivating service -> Must be blocked with 400 ERROR_0014_INACTIVE_REFERENCE
    const reactRes = await request(`/services/${deadSvcId}/reactivate`, {
      method: 'PATCH',
      headers: adminHeaders,
    });
    assert.strictEqual(reactRes.status, 400, `Expected 400, got ${reactRes.status}`);
    assert.strictEqual(reactRes.data?.code, 'ERROR_0014_INACTIVE_REFERENCE');

    tracker.recordPass('TC_ADV_38', 'Reactivate service with soft-deleted parent category returns 400 ERROR_0014_INACTIVE_REFERENCE');
  } catch (err) {
    tracker.recordFail('TC_ADV_38', 'Reactivate service with soft-deleted parent category', err);
  }

  // TC_ADV_39: GET /services/categories status filter integrity (Active, Inactive, All, never IsDeleted: true)
  try {
    const resActive = await request('/services/categories?status=Active');
    assert.strictEqual(resActive.status, 200);
    const activeList = resActive.data?.data || [];
    assert.ok(activeList.length > 0, 'Active categories should not be empty');
    assert.ok(activeList.every((c) => c.Status === 'Active' && !c.IsDeleted), 'Active filter must strictly return Status=Active and IsDeleted=false');

    const resInactive = await request('/services/categories?status=Inactive');
    assert.strictEqual(resInactive.status, 200);
    const inactList = resInactive.data?.data || [];
    assert.ok(inactList.every((c) => c.Status === 'Inactive' && !c.IsDeleted), 'Inactive filter must strictly return Status=Inactive and IsDeleted=false');

    const resAll = await request('/services/categories?status=All');
    assert.strictEqual(resAll.status, 200);
    const allList = resAll.data?.data || [];
    assert.ok(allList.every((c) => !c.IsDeleted), 'All filter must exclude IsDeleted=true');

    tracker.recordPass('TC_ADV_39', 'GET /categories?status accurately partitions statuses and purges IsDeleted');
  } catch (err) {
    tracker.recordFail('TC_ADV_39', 'GET /categories status filter integrity', err);
  }

  // TC_ADV_40: Public GET /services strictly hides services in Inactive categories; admin GET /services?status=All includes them
  try {
    const targetName = `Dịch vụ Thuộc Nhóm Inactive Cho Lọc ${Date.now()}`;
    const serviceInInactiveCat = await Service.create({
      CategoryId: inactiveCat.CategoryId,
      ServiceName: targetName,
      ServiceCode: `SVC-INA-${Date.now().toString().slice(-3)}`,
      Price: 50000,
      Unit: 'Lượt',
      Status: 'Active', // Active service inside Inactive category
      IsDeleted: false,
    });

    // Public lookup: without status query parameter, targeting this specific service
    const pubRes = await request(`/services?search=${encodeURIComponent(targetName)}`);
    assert.strictEqual(pubRes.status, 200);
    const pubServices = pubRes.data?.data || [];
    const foundInPublic = pubServices.some((s) => s.ServiceId === serviceInInactiveCat.ServiceId);
    assert.strictEqual(foundInPublic, false, 'Public GET /services MUST hide services whose parent category is Inactive');

    // Admin lookup: status=All, targeting this specific service
    const adminRes = await request(`/services?status=All&search=${encodeURIComponent(targetName)}`);
    assert.strictEqual(adminRes.status, 200);
    const adminServices = adminRes.data?.data || [];
    const foundInAdmin = adminServices.some((s) => s.ServiceId === serviceInInactiveCat.ServiceId);
    assert.strictEqual(foundInAdmin, true, 'Admin GET /services?status=All MUST include services even if category is Inactive');

    tracker.recordPass('TC_ADV_40', 'Public service lookup strictly hides services in Inactive categories; admin view reveals them');
  } catch (err) {
    tracker.recordFail('TC_ADV_40', 'Public vs Admin service category filtering rule 2.3', err);
  }

  return tracker.summary();
}

if (require.main === module) {
  run()
    .then((s) => {
      console.log(`Finished: ${s.passed}/${s.total} passed`);
      process.exit(s.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal error running adversarial tests:', err);
      process.exit(1);
    });
}

module.exports = { run };
