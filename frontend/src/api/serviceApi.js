/**
 * frontend/src/api/serviceApi.js
 * API client giao tiếp với module Dịch vụ & Biểu phí (/api/v1/services)
 * Chuẩn hóa theo đặc tả FEAT-SERVICE-01
 */

const BASE_URL = 'http://localhost:5000/api/v1/services';

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('hotel_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken');
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
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);
  if (params.search) query.append('search', params.search);
  const targetGroup = params.group !== undefined ? params.group : params.categoryId;
  if (targetGroup && targetGroup !== 'All') query.append('group', targetGroup);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.minPrice !== undefined && params.minPrice !== '') query.append('minPrice', params.minPrice);
  if (params.maxPrice !== undefined && params.maxPrice !== '') query.append('maxPrice', params.maxPrice);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const url = `${BASE_URL}${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return await res.json();
};

/**
 * 2. Lấy danh sách nhóm dịch vụ (ServiceCategories)
 */
export const fetchCategoriesApi = async () => {
  const res = await fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return await res.json();
};

/**
 * 3. Thêm mới dịch vụ (hỗ trợ cả CategoryId lẫn categoryId)
 */
export const createServiceApi = async (serviceData) => {
  const catId = serviceData.CategoryId !== undefined ? serviceData.CategoryId : serviceData.categoryId;
  const name = serviceData.ServiceName !== undefined ? serviceData.ServiceName : (serviceData.serviceName || serviceData.name || '');
  const price = serviceData.Price !== undefined ? serviceData.Price : serviceData.price;
  const unit = serviceData.Unit !== undefined ? serviceData.Unit : (serviceData.unit || '');
  const desc = serviceData.Description !== undefined ? serviceData.Description : (serviceData.description || serviceData.sop || '');

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      categoryId: catId ? Number(catId) : null,
      serviceName: String(name).trim(),
      price: price !== '' ? Number(price) : null,
      unit: String(unit).trim(),
      description: String(desc || ''),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * 4. Cập nhật dịch vụ
 */
export const updateServiceApi = async (id, serviceData) => {
  const catId = serviceData.CategoryId !== undefined ? serviceData.CategoryId : serviceData.categoryId;
  const name = serviceData.ServiceName !== undefined ? serviceData.ServiceName : (serviceData.serviceName || serviceData.name || '');
  const price = serviceData.Price !== undefined ? serviceData.Price : serviceData.price;
  const unit = serviceData.Unit !== undefined ? serviceData.Unit : (serviceData.unit || '');
  const desc = serviceData.Description !== undefined ? serviceData.Description : (serviceData.description || serviceData.sop || '');

  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      categoryId: catId ? Number(catId) : null,
      serviceName: String(name).trim(),
      price: price !== '' ? Number(price) : null,
      unit: String(unit).trim(),
      description: String(desc || ''),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * 5. Ngừng cung cấp dịch vụ (Soft-delete: Status = 'Inactive')
 */
export const deactivateServiceApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}/deactivate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * 6. Kích hoạt lại dịch vụ (Status = 'Active')
 */
export const reactivateServiceApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}/reactivate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
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
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ─── FEAT-SERVICE-03: ĐẶT DỊCH VỤ & SERVICE ORDERS ───────────────────────────
const ORDERS_BASE_URL = 'http://localhost:5000/api/v1/service-orders';

/**
 * 8. Lấy danh sách các phòng đang lưu trú (CheckedIn hoặc Extended) cho Lễ tân
 */
export const fetchActiveStaysApi = async () => {
  const res = await fetch(`${ORDERS_BASE_URL}/active-stays`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * 9. Lấy thông tin lượt lưu trú của khách hàng đang đăng nhập
 */
export const fetchMyActiveStayApi = async () => {
  const res = await fetch(`${ORDERS_BASE_URL}/my-stay`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
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
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

/**
 * 11. Lấy danh sách đơn đặt dịch vụ
 */
export const fetchServiceOrdersApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.stayId) query.append('stayId', params.stayId);
  if (params.status && params.status !== 'All') query.append('status', params.status);

  const url = `${ORDERS_BASE_URL}${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

