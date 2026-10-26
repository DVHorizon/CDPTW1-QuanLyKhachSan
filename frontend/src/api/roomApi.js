const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Gọi API Tìm kiếm phòng (FEAT-GUEST-02 / A2)
 * GET /api/v1/rooms/search
 * @param {Object} params { branchId, checkInDate, checkOutDate, totalGuests, keyword, priceMin, priceMax, roomTypes, view, amenities, rating, sortBy }
 */
export const searchRoomsApi = async (params = {}) => {
  try {
    const query = new URLSearchParams();

    if (params.branchId && params.branchId !== 'all') {
      query.append('branchId', params.branchId);
    }
    if (params.checkInDate) query.append('checkInDate', params.checkInDate);
    if (params.checkOutDate) query.append('checkOutDate', params.checkOutDate);
    if (params.totalGuests) query.append('totalGuests', params.totalGuests);
    if (params.keyword && params.keyword.trim()) {
      query.append('keyword', params.keyword.trim());
    }
    if (params.priceMin) query.append('priceMin', params.priceMin);
    if (params.priceMax) query.append('priceMax', params.priceMax);
    if (params.roomTypes && params.roomTypes.length > 0) {
      query.append('roomTypes', Array.isArray(params.roomTypes) ? params.roomTypes.join(',') : params.roomTypes);
    }
    if (params.view && params.view !== 'all' && params.view !== 'Tất cả') {
      query.append('view', params.view);
    }
    if (params.amenities && params.amenities.length > 0) {
      query.append('amenities', Array.isArray(params.amenities) ? params.amenities.join(',') : params.amenities);
    }
    if (params.rating) query.append('rating', params.rating);
    if (params.sortBy) query.append('sortBy', params.sortBy);

    // Thử gọi /api/v1/rooms/search trước, fallback về /api/rooms/search
    let endpoint = `${API_BASE_URL}/v1/rooms/search?${query.toString()}`;
    let res = await fetch(endpoint);

    if (res.status === 404) {
      endpoint = `${API_BASE_URL}/rooms/search?${query.toString()}`;
      res = await fetch(endpoint);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi khi gọi API tìm kiếm phòng:', err);
    return {
      success: false,
      errorCode: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
    };
  }
};

/**
 * Lấy danh sách chi nhánh phục vụ dropdown selector
 * GET /api/v1/rooms/branches
 */
export const getBranchesApi = async () => {
  try {
    let res = await fetch(`${API_BASE_URL}/v1/rooms/branches`);
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/rooms/branches`);
    }
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Lỗi khi fetch chi nhánh:', err);
    // Fallback chi nhánh chuẩn của Grand Horizon
    return [
      { BranchId: 1, BranchName: 'Grand Horizon Phú Quốc', Address: 'Bãi Khem, Phú Quốc' },
      { BranchId: 2, BranchName: 'Grand Horizon Cam Ranh', Address: 'Bãi Dài, Cam Ranh' },
      { BranchId: 3, BranchName: 'Grand Horizon Côn Đảo', Address: 'Bãi Nhát, Côn Đảo' }
    ];
  }
};

/**
 * Lấy chi tiết loại phòng theo ID
 * GET /api/v1/rooms/:id
 */
export const getRoomDetailApi = async (id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/${id}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Lỗi khi fetch chi tiết phòng:', err);
    return null;
  }
};

/**
 * Gọi API Gợi ý Autocomplete thông minh (Elasticsearch & Solr Suggester)
 * GET /api/v1/rooms/suggest?q=...
 */
export const suggestRoomsApi = async (q) => {
  if (!q || !q.trim()) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/suggest?q=${encodeURIComponent(q.trim())}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Lỗi khi fetch gợi ý:', err);
    return null;
  }
};

/**
 * Kiểm tra tình trạng phòng trống
 * POST /api/v1/rooms/check-availability
 */
export const checkRoomAvailabilityApi = async (payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi check availability:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Khóa phòng tạm thời (Room lock session)
 * POST /api/v1/rooms/lock
 */
export const lockRoomSessionApi = async (payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi lock room session:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Nhả khóa phòng
 * POST /api/v1/rooms/release-lock
 */
export const releaseRoomLockApi = async (payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/release-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi release room lock:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Tạo booking mới
 * POST /api/v1/bookings
 */
export const createBookingApi = async (payload) => {
  try {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('hotel_token') || localStorage.getItem('token')) : null;
    const res = await fetch(`${API_BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi create booking:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Tính toán giá phòng & phụ thu
 * POST /api/v1/bookings/calculate-pricing
 */
export const calculatePricingApi = async (payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/bookings/calculate-pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi tính giá:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Kiểm tra mã giảm giá (voucher)
 * POST /api/v1/promotions/validate
 */
export const validateVoucherApi = async (code, totalAmount) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/promotions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, totalAmount }),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi validate voucher:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Lấy chi tiết đặt phòng thanh toán cọc
 * GET /api/v1/bookings/:id
 */
export const getBookingDetailsApi = async (bookingId) => {
  try {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('hotel_token') || localStorage.getItem('token')) : null;
    const res = await fetch(`${API_BASE_URL}/v1/bookings/${bookingId}`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi fetch booking detail:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Xử lý thanh toán cọc booking (FEAT-PAYMENT-01)
 * POST /api/v1/payments
 */
export const processDepositPaymentApi = async (payload) => {
  try {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('hotel_token') || localStorage.getItem('token')) : null;
    const res = await fetch(`${API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi process payment:', err);
    return { success: false, message: err.message };
  }
};
