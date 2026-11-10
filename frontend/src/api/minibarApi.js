// frontend/src/api/minibarApi.js
// Client API cho Chức năng Quản lý Minibar phòng (FEAT-MINIBAR-01 - Spec 12)

const API_ENDPOINTS = [
  '/api/v1/minibar',
  'http://localhost:5000/api/v1/minibar',
];

async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  const token = typeof window !== 'undefined' ? (localStorage.getItem('hotel_token') || localStorage.getItem('token')) : null;

  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
      });

      const text = await res.text();
      if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
        lastErr = new Error('Máy chủ phản hồi HTML thay vì JSON.');
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        lastErr = new Error('Phản hồi từ máy chủ không phải định dạng JSON hợp lệ.');
        continue;
      }

      if (!res.ok) {
        const errorMsg = data?.message || `Lỗi máy chủ HTTP ${res.status}`;
        const errObj = new Error(errorMsg);
        errObj.status = res.status;
        errObj.errorCode = data?.errorCode;
        errObj.data = data;
        throw errObj;
      }

      return data;
    } catch (err) {
      lastErr = err;
      if (err.status && err.message) {
        throw err;
      }
    }
  }
  throw lastErr || new Error('Không thể kết nối đến máy chủ quản lý Minibar.');
}

export const minibarApi = {
  // Lấy danh mục sản phẩm minibar tiêu chuẩn
  getProducts: async () => {
    return await safeFetchJson('/products');
  },

  // Lấy danh sách các phòng đang CheckedIn kèm trạng thái minibar
  getStays: async (query = '', limit = 50) => {
    const q = new URLSearchParams({ query, limit }).toString();
    return await safeFetchJson(`/stays?${q}`);
  },

  // Lấy chi tiết phiên kiểm kê minibar của một lượt lưu trú
  getStayMinibar: async (stayId) => {
    return await safeFetchJson(`/stays/${stayId}`);
  },

  // Lưu DRAFT hoặc gửi SUBMITTED phiên kiểm kê minibar
  saveInspection: async (stayId, data) => {
    return await safeFetchJson(`/stays/${stayId}/inspections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Xác nhận kiểm kê (CONFIRMED) và tạo khoản phí trên hóa đơn lưu trú
  confirmInspection: async (stayId, inspectionId, data = {}) => {
    return await safeFetchJson(`/stays/${stayId}/inspections/${inspectionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Giám sát điều chỉnh hoặc đảo phí sau khi đã xác nhận (MINIBAR_ADJUST)
  adjustLine: async (stayId, inspectionId, data) => {
    return await safeFetchJson(`/stays/${stayId}/inspections/${inspectionId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Lễ tân ghi nhận phương án bỏ qua / miễn kiểm kê khi cần checkout gấp
  overrideInspection: async (stayId, data) => {
    return await safeFetchJson(`/stays/${stayId}/override`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default minibarApi;
