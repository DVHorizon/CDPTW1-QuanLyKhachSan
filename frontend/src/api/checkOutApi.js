// frontend/src/api/checkOutApi.js

const API_ENDPOINTS = [
  '/api/v1/check-out',
  'http://localhost:5000/api/v1/check-out',
];

async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
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
      // If it was an intentional HTTP error response from backend with message, throw it immediately
      if (err.status && err.message) {
        throw err;
      }
    }
  }
  throw lastErr || new Error('Không thể kết nối đến máy chủ cơ sở dữ liệu backend.');
}

export const checkOutApi = {
  // Lấy danh sách stay đang CheckedIn / Due out
  getStays: async (query = '', limit = 30) => {
    const q = new URLSearchParams({ query, limit }).toString();
    return await safeFetchJson(`/stays?${q}`);
  },

  // Lấy chi tiết stay & dự toán late fee, minibar, inspection, folio
  getStayPreview: async (stayId) => {
    return await safeFetchJson(`/stay/${stayId}`);
  },

  // Ghi nhận biên bản kiểm phòng và danh sách hư hỏng
  submitInspection: async (stayId, inspectionData) => {
    return await safeFetchJson(`/room-inspections`, {
      method: 'POST',
      body: JSON.stringify({ stayId, ...inspectionData }),
    });
  },

  // Giám sát duyệt / từ chối / tranh chấp / miễn phí khoản bồi thường hư hỏng
  updateDamageItem: async (damageItemId, actionData) => {
    return await safeFetchJson(`/damage/${damageItemId}`, {
      method: 'PUT',
      body: JSON.stringify(actionData),
    });
  },

  // Hoàn tất trả phòng (Atomic Transaction)
  completeCheckout: async (stayId, checkoutData) => {
    return await safeFetchJson(`/complete`, {
      method: 'POST',
      body: JSON.stringify({ stayId, ...checkoutData }),
    });
  },

  // Miễn / điều chỉnh phí (Fee Override)
  adjustFolio: async (stayId, adjustmentData) => {
    return await safeFetchJson(`/adjustments`, {
      method: 'POST',
      body: JSON.stringify({ stayId, ...adjustmentData }),
    });
  },
};

export default checkOutApi;
