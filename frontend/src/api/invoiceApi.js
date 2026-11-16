// frontend/src/api/invoiceApi.js

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/invoices`;
  }
  return 'http://localhost:5000/api/v1/invoices';
};

function getAuthHeaders() {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('hotel_token') || localStorage.getItem('token') || localStorage.getItem('authToken'))
    : null;
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
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khi tạo hoá đơn tổng hợp');
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
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải chi tiết hoá đơn');
    }
    return data?.data || null;
  },

  // C8: Lấy URL để xem hoặc tải PDF trực tiếp
  getInvoicePdfUrl: (invoiceId, mode = 'inline', regenerate = false) => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('hotel_token') || localStorage.getItem('token') || localStorage.getItem('authToken'))
      : '';
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
      try {
        const errJson = await res.json();
        if (errJson?.message) msg = errJson.message;
      } catch (e) {
        // ignore
      }
      throw new Error(msg);
    }
    return await res.blob();
  },

  // C8: Kiểm tra trạng thái PDF
  getInvoicePdfInfo: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/pdf-info`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data?.data || null;
  },

  // C9: Quyết toán hoá đơn tổng hợp đa phương thức (Multi-Tender Settlement)
  settleInvoice: async (invoiceId, { tenders, note, releaseHoldOnComplete = true }) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tenders, note, releaseHoldOnComplete }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi quyết toán hoá đơn.');
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
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Không thể tải danh sách hoá đơn');
      err.code = data.code;
      throw err;
    }
    return data;
  },

  // C10: Lịch sử giao dịch & kiểm toán của 1 hoá đơn
  getInvoiceTransactions: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/${invoiceId}/transactions`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Không thể tải lịch sử giao dịch');
      err.code = data.code;
      throw err;
    }
    return data;
  },

  // Hỗ trợ kích hoạt hoàn tiền giao dịch qua C5
  refundPayment: async (paymentId, { refundReason, refundAmount }) => {
    let paymentApiUrl = 'http://localhost:5000/api/v1/payments';
    if (import.meta.env.VITE_API_URL) {
      paymentApiUrl = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/payments`;
    }
    const res = await fetch(`${paymentApiUrl}/${paymentId}/refund`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refundReason, refundAmount }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khi thực hiện hoàn tiền giao dịch.');
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C9: Quyết toán / Thanh toán cho Invoice qua Core Payment C5
  settleInvoicePayment: async ({ invoiceId, amount, paymentMethod, method, returnUrl, transactionCode }) => {
    let paymentApiUrl = 'http://localhost:5000/api/v1/payments';
    if (import.meta.env.VITE_API_URL) {
      paymentApiUrl = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/payments`;
    }
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
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi quyết toán thanh toán.');
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C5: Tạo yêu cầu thanh toán Core Payment (hỗ trợ cả Booking & Invoice)
  createPayment: async ({ bookingId, invoiceId, amount, method, paymentMethod, returnUrl, transactionCode }) => {
    let paymentApiUrl = 'http://localhost:5000/api/v1/payments';
    if (import.meta.env.VITE_API_URL) {
      paymentApiUrl = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/payments`;
    }
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
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Lỗi khởi tạo giao dịch thanh toán C5.');
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  // C5: Tra cứu trạng thái giao dịch Core Payment
  getPaymentStatus: async (paymentIdOrCode) => {
    let paymentApiUrl = `http://localhost:5000/api/v1/payments/${encodeURIComponent(paymentIdOrCode)}`;
    if (import.meta.env.VITE_API_URL) {
      paymentApiUrl = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/payments/${encodeURIComponent(paymentIdOrCode)}`;
    }
    const res = await fetch(paymentApiUrl, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Không tìm thấy giao dịch thanh toán.');
      err.code = data.code;
      throw err;
    }
    return data;
  },
};

export default invoiceApi;
