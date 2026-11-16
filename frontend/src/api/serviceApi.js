/**
 * frontend/src/api/serviceApi.js
 * API client giao tiếp với module Dịch vụ & Biểu phí (/api/v1/services)
 * Chuẩn hóa theo đặc tả FEAT-SERVICE-01..04 & 14 QA Scenarios
 */

import { getAccessToken } from '../utils/tokenStore.js';
import { trimUnicode, normalizeFullWidthDigits } from '../utils/qaInputUtils.js';

const resolveToken = () =>
  getAccessToken() ||
  (typeof localStorage !== 'undefined'
    ? localStorage.getItem('hotel_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    : null);

const getApiRoot = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    (typeof window === 'undefined' ? 'http://localhost:5000/api' : '/api');
  const cleaned = String(envUrl).replace(/\/+$/, '');
  return cleaned.endsWith('/v1') ? cleaned.slice(0, -3) : cleaned;
};

const BASE_URL = `${getApiRoot()}/v1/services`;

const getAuthHeaders = () => {
  const token = resolveToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * 1. Lấy danh sách dịch vụ từ API
 */
export const fetchServicesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page !== undefined && params.page !== null && params.page !== '') {
    query.append('page', params.page);
  }
  if (params.pageSize !== undefined && params.pageSize !== null && params.pageSize !== '') {
    query.append('pageSize', params.pageSize);
  }
  if (params.all) query.append('all', params.all);
  if (params.search) query.append('search', params.search);
  const targetGroup = params.group !== undefined ? params.group : params.categoryId;
  if (targetGroup && targetGroup !== 'All') query.append('group', targetGroup);
  if (params.status) query.append('status', params.status);
  if (params.minPrice !== undefined && params.minPrice !== '') {
    query.append('minPrice', normalizeFullWidthDigits(params.minPrice));
  }
  if (params.maxPrice !== undefined && params.maxPrice !== '') {
    query.append('maxPrice', normalizeFullWidthDigits(params.maxPrice));
  }
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const url = `${BASE_URL}${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  return await res.json();
};

/**
 * 1b. Lấy chi tiết dịch vụ theo ID hoặc mã dịch vụ (QA Scenario #3)
 */
export const fetchServiceByIdApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 2. Lấy danh sách nhóm dịch vụ (ServiceCategories)
 */
export const fetchCategoriesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  const url = `${BASE_URL}/categories${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  return await res.json();
};

/**
 * 3. Thêm mới dịch vụ (hỗ trợ cả CategoryId lẫn categoryId)
 */
export const createServiceApi = async (serviceData) => {
  const catId = serviceData.CategoryId !== undefined ? serviceData.CategoryId : serviceData.categoryId;
  const name =
    serviceData.ServiceName !== undefined
      ? serviceData.ServiceName
      : serviceData.serviceName || serviceData.name || '';
  const price = serviceData.Price !== undefined ? serviceData.Price : serviceData.price;
  const unit =
    serviceData.Unit !== undefined ? serviceData.Unit : serviceData.unit || '';
  const desc =
    serviceData.Description !== undefined
      ? serviceData.Description
      : serviceData.description || serviceData.sop || '';

  const normPrice = price !== undefined && price !== null && price !== ''
    ? Number(normalizeFullWidthDigits(trimUnicode(price)))
    : null;

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      categoryId: catId ? Number(normalizeFullWidthDigits(catId)) : null,
      serviceName: trimUnicode(name),
      price: normPrice,
      unit: trimUnicode(unit),
      description: trimUnicode(desc),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 4. Cập nhật dịch vụ (kèm version cho Optimistic Locking - QA Scenario #2)
 */
export const updateServiceApi = async (id, serviceData) => {
  const catId = serviceData.CategoryId !== undefined ? serviceData.CategoryId : serviceData.categoryId;
  const name =
    serviceData.ServiceName !== undefined
      ? serviceData.ServiceName
      : serviceData.serviceName || serviceData.name || '';
  const price = serviceData.Price !== undefined ? serviceData.Price : serviceData.price;
  const unit =
    serviceData.Unit !== undefined ? serviceData.Unit : serviceData.unit || '';
  const desc =
    serviceData.Description !== undefined
      ? serviceData.Description
      : serviceData.description || serviceData.sop || '';
  const version =
    serviceData.version !== undefined ? serviceData.version : serviceData.Version;

  const normPrice = price !== undefined && price !== null && price !== ''
    ? Number(normalizeFullWidthDigits(trimUnicode(price)))
    : null;

  const payload = {
    categoryId: catId ? Number(normalizeFullWidthDigits(catId)) : null,
    serviceName: trimUnicode(name),
    price: normPrice,
    unit: trimUnicode(unit),
    description: trimUnicode(desc),
  };
  if (version !== undefined && version !== null && version !== '') {
    payload.version = Number(normalizeFullWidthDigits(version));
  }

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 5. Ngừng cung cấp dịch vụ (Soft-delete: Status = 'Inactive')
 */
export const deactivateServiceApi = async (id, payload = {}) => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}/deactivate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 6. Kích hoạt lại dịch vụ (Status = 'Active')
 */
export const reactivateServiceApi = async (id, payload = {}) => {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}/reactivate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 2b. Thêm mới nhóm dịch vụ (POST /api/v1/services/categories)
 */
export const createCategoryApi = async (categoryData) => {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(categoryData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

// ─── FEAT-SERVICE-03: ĐẶT DỊCH VỤ & SERVICE ORDERS ───────────────────────────
const ORDERS_BASE_URL = `${getApiRoot()}/v1/service-orders`;

/**
 * 8. Lấy danh sách các phòng đang lưu trú (CheckedIn hoặc Extended) cho Lễ tân
 */
export const fetchActiveStaysApi = async () => {
  const res = await fetch(`${ORDERS_BASE_URL}/active-stays`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 9. Lấy thông tin lượt lưu trú của khách hàng đang đăng nhập
 */
export const fetchMyActiveStayApi = async () => {
  const res = await fetch(`${ORDERS_BASE_URL}/my-stay`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 10. Tạo đơn đặt dịch vụ (Service Order)
 */
export const createServiceOrderApi = async (orderPayload) => {
  const res = await fetch(ORDERS_BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderPayload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 11. Lấy danh sách đơn đặt dịch vụ
 */
export const fetchServiceOrdersApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.stayId) query.append('stayId', params.stayId);
  if (params.status) query.append('status', params.status);

  const url = `${ORDERS_BASE_URL}${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 12. Cập nhật tiến độ đơn dịch vụ (FEAT-SERVICE-04 / C4)
 * PATCH /api/v1/service-orders/:orderId/status
 */
export const updateServiceOrderStatusApi = async (orderId, payload) => {
  const res = await fetch(`${ORDERS_BASE_URL}/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

/**
 * 13. Xuất danh mục dịch vụ Excel (.xlsx) chuẩn chỉnh
 * GET /api/v1/services/export
 */
export const exportServicesExcelApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  const targetGroup = params.group !== undefined ? params.group : params.categoryId;
  if (targetGroup && targetGroup !== 'All') query.append('group', targetGroup);
  if (params.status) query.append('status', params.status);
  if (params.minPrice !== undefined && params.minPrice !== '') {
    query.append('minPrice', normalizeFullWidthDigits(params.minPrice));
  }
  if (params.maxPrice !== undefined && params.maxPrice !== '') {
    query.append('maxPrice', normalizeFullWidthDigits(params.maxPrice));
  }
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const url = `${BASE_URL}/export${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }
  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  let filename = `Bang_Gia_Dich_Vu_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
  const fnMatch = /filename="?([^"]+)"?/.exec(contentDisposition);
  if (fnMatch && fnMatch[1]) {
    filename = fnMatch[1];
  }
  return { blob, filename };
};
