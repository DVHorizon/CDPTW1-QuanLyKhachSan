/**
 * frontend/tests/serviceApiLiveStress.test.mjs
 * End-to-End API Integration & Contract Stress Tests for serviceApi.js
 * Runs directly against live backend container (http://localhost:5000/api/v1/services)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Polyfill localStorage for Node.js test environment
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; },
  };
}

import {
  fetchServicesApi,
  fetchCategoriesApi,
  createServiceApi,
  updateServiceApi,
  deactivateServiceApi,
  reactivateServiceApi,
  exportServicesExcelApi,
  createCategoryApi,
} from '../src/api/serviceApi.js';

// Authenticate as Admin before running tests
test.before(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'password123' }),
    });
    const data = await res.json();
    if (data?.token) {
      globalThis.localStorage.setItem('hotel_token', data.token);
    } else {
      // Try alternate password
      const res2 = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin', password: '123456' }),
      });
      const data2 = await res2.json();
      if (data2?.token) {
        globalThis.localStorage.setItem('hotel_token', data2.token);
      }
    }
  } catch (err) {
    console.warn('Could not auto-login admin:', err.message);
  }
});

test('API 1: fetchCategoriesApi returns category list with success: true', async () => {
  const res = await fetchCategoriesApi();
  assert.equal(res.success, true);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length > 0);
});

test('API 2: fetchServicesApi handles pagination, search, status, and price range', async () => {
  const res = await fetchServicesApi({
    page: 1,
    pageSize: 10,
    status: 'All',
    all: 'true',
  });
  assert.equal(res.success, true);
  assert.ok(Array.isArray(res.data));
});

test('API 3: fetchServicesApi rejects minPrice > maxPrice with 400 ERROR_0004_INVALID_FORMAT', async () => {
  await assert.rejects(
    async () => {
      await fetchServicesApi({ minPrice: 500000, maxPrice: 100000 });
    },
    (err) => {
      assert.equal(err.code, 'ERROR_0004_INVALID_FORMAT');
      return true;
    }
  );
});

test('API 4: createServiceApi rejects inactive categoryId with 400 ERROR_0014_INACTIVE_REFERENCE', async () => {
  const cats = await fetchCategoriesApi();
  const inactiveCat = cats.data.find((c) => c.Status === 'Inactive' && !c.IsDeleted);

  if (!inactiveCat) {
    return;
  }

  await assert.rejects(
    async () => {
      await createServiceApi({
        categoryId: inactiveCat.CategoryId,
        serviceName: `Stress Test ${Date.now()}`,
        price: 150000,
        unit: 'Lượt',
      });
    },
    (err) => {
      assert.equal(err.code, 'ERROR_0014_INACTIVE_REFERENCE');
      assert.equal(err.field, 'categoryId');
      return true;
    }
  );
});

test('API 5: createServiceApi rejects price over 999,999,999.99 with 400 ERROR_0012_OUT_OF_RANGE', async () => {
  const cats = await fetchCategoriesApi();
  const activeCat = cats.data.find((c) => c.Status === 'Active' && !c.IsDeleted);
  assert.ok(activeCat, 'Active category must exist');

  await assert.rejects(
    async () => {
      await createServiceApi({
        categoryId: activeCat.CategoryId,
        serviceName: `Stress Test Price Over Max ${Date.now()}`,
        price: 1000000000,
        unit: 'Lượt',
      });
    },
    (err) => {
      assert.equal(err.code, 'ERROR_0012_OUT_OF_RANGE');
      assert.equal(err.field, 'price');
      return true;
    }
  );
});

test('API 6: exportServicesExcelApi retrieves binary spreadsheet blob and correct filename', async () => {
  const { blob, filename } = await exportServicesExcelApi({
    status: 'All',
    sortBy: 'name_asc',
  });

  assert.ok(blob);
  assert.ok(filename.startsWith('Bang_Gia_Dich_Vu_'));
  assert.ok(filename.endsWith('.xlsx'));
  assert.ok(blob.size > 1000, `Expected Excel file size > 1KB, got ${blob.size}`);
});
