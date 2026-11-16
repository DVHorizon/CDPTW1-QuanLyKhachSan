// frontend/src/api/invoiceApi.js
import { getAccessToken } from '../utils/tokenStore.js';

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

const getApiBase = () => `${getApiRoot()}/v1/invoices`;
const getPaymentApiBase = () => `${getApiRoot()}/v1/payments`;

function getAuthHeaders() {
  const token = resolveToken();
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

const invoiceApi = {
  // C7: Lập hoá đơn tổng hợp (Master Invoice)
  createMasterInvoice: async (payload) => {
    const res = await fetch(`${getApiBase()}/master`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khi tạo hoá đơn tổng hợp');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // Tra cứu Master Invoice của 1 Booking
  getInvoiceByBookingId: async (bookingId) => {
    try {
      const res = await fetch(`${getApiBase()}/booking/${bookingId}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 404) return null;
      const data = await res.json();
      return data?.data || null;
    } catch (e) {
      console.warn('Lỗi tra cứu master invoice theo booking:', e);
      return null;
    }
  },

  // Chi tiết Invoice theo Id
  getInvoiceById: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Không thể tải chi tiết hoá đơn');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data?.data || null;
  },

  // C8: Lấy URL để xem hoặc tải PDF trực tiếp
  getInvoicePdfUrl: (invoiceId, mode = 'inline', regenerate = false) => {
    const token = resolveToken() || '';
    const base = `${getApiBase()}/${invoiceId}/pdf?mode=${mode}${regenerate ? '&regenerate=true' : ''}`;
    // Kèm token query param nếu mở tab mới không gửi được Authorization header
    return token ? `${base}&token=${token}` : base;
  },

  // C8: Tải Blob file PDF có kèm Authorization Header
  fetchInvoicePdfBlob: async (invoiceId, mode = 'inline', regenerate = false) => {
    const url = `${getApiBase()}/${invoiceId}/pdf?mode=${mode}${regenerate ? '&regenerate=true' : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let msg = 'Không thể xuất file PDF hoá đơn.';
      let code = null;
      try {
        const errJson = await res.json();
        if (errJson?.message) msg = errJson.message;
        if (errJson?.code) code = errJson.code;
      } catch (e) {
        // ignore
      }
      const err = new Error(msg);
      err.status = res.status;
      err.code = code;
      throw err;
    }
    return await res.blob();
  },

  // C8: Kiểm tra trạng thái PDF
  getInvoicePdfInfo: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/pdf-info`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    return data?.data || null;
  },

  // C9: Quyết toán hoá đơn tổng hợp đa phương thức (Multi-Tender Settlement)
  settleInvoice: async (invoiceId, { tenders, note, releaseHoldOnComplete = true }) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tenders, note, releaseHoldOnComplete }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi quyết toán hoá đơn.');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C10: Lấy danh sách hoá đơn (phân trang, lọc, tìm kiếm)
  getInvoices: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);

    const from = params.fromDate || params.dateFrom;
    const to = params.toDate || params.dateTo;
    if (from) {
      query.append('fromDate', from);
      query.append('dateFrom', from);
    }
    if (to) {
      query.append('toDate', to);
      query.append('dateTo', to);
    }
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);

    const res = await fetch(`${getApiBase()}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Không thể tải danh sách hoá đơn');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C10: Lịch sử giao dịch & kiểm toán của 1 hoá đơn
  getInvoiceTransactions: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/transactions`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Không thể tải lịch sử giao dịch');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // Hỗ trợ kích hoạt hoàn tiền giao dịch qua C5
  refundPayment: async (paymentId, { refundReason, refundAmount }) => {
    const paymentApiUrl = getPaymentApiBase();
    const res = await fetch(`${paymentApiUrl}/${paymentId}/refund`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refundReason, refundAmount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khi thực hiện hoàn tiền giao dịch.');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C9: Quyết toán / Thanh toán cho Invoice qua Core Payment C5
  settleInvoicePayment: async ({ invoiceId, amount, paymentMethod, method, returnUrl, transactionCode }) => {
    const paymentApiUrl = getPaymentApiBase();
    const resolvedMethod = method || paymentMethod || 'Cash';
    const res = await fetch(paymentApiUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        invoiceId,
        amount,
        method: resolvedMethod,
        paymentMethod: resolvedMethod,
        returnUrl,
        transactionCode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi quyết toán thanh toán.');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C5: Tạo yêu cầu thanh toán Core Payment (hỗ trợ cả Booking & Invoice)
  createPayment: async ({ bookingId, invoiceId, amount, method, paymentMethod, returnUrl, transactionCode }) => {
    const paymentApiUrl = getPaymentApiBase();
    const resolvedMethod = method || paymentMethod || 'VietQR';
    const res = await fetch(paymentApiUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        bookingId,
        invoiceId,
        amount,
        method: resolvedMethod,
        paymentMethod: resolvedMethod,
        returnUrl,
        transactionCode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khởi tạo giao dịch thanh toán C5.');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C5: Tra cứu trạng thái giao dịch Core Payment
  getPaymentStatus: async (paymentIdOrCode) => {
    const paymentApiUrl = `${getPaymentApiBase()}/${encodeURIComponent(paymentIdOrCode)}`;
    const res = await fetch(paymentApiUrl, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Không tìm thấy giao dịch thanh toán.');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },
};

export default invoiceApi;
