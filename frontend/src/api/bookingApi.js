// frontend/src/api/bookingApi.js

const API_ENDPOINTS = [
  '/api/v1/bookings',
  'http://localhost:5000/api/v1/bookings',
];

async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('hotel_token') || localStorage.getItem('token'))
        : null;

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
        const errorMsg = data?.message || data?.error || `Lỗi máy chủ HTTP ${res.status}`;
        const errObj = new Error(errorMsg);
        errObj.status = res.status;
        errObj.errorCode = data?.errorCode || data?.code;
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
  throw lastErr || new Error('Không thể kết nối đến máy chủ backend.');
}

export const bookingApi = {
  // Lấy chi tiết bảng gom chi phí lưu trú (FEAT-INVOICE-01 / C6)
  getBookingCharges: async (bookingId) => {
    return await safeFetchJson(`/${bookingId}/charges`);
  },

  // Lấy chi tiết booking
  getBookingDetail: async (bookingId) => {
    return await safeFetchJson(`/${bookingId}`);
  },
};

export default bookingApi;
