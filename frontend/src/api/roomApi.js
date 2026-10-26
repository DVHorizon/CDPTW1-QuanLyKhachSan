const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOM AVAILABILITY & BOOKING LOCK API (FEAT-GUEST-04 / A4)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Kiểm tra phòng trống real-time theo khoảng ngày
 * GET /api/v1/rooms/availability
 * @param {Object} params { roomTypeId, checkInDate, checkOutDate, quantity, lockSessionId }
 */
export const checkRoomAvailabilityApi = async ({ roomTypeId, checkInDate, checkOutDate, quantity = 1, lockSessionId = null }) => {
  try {
    const query = new URLSearchParams({
      roomTypeId,
      checkInDate,
      checkOutDate,
      quantity
    });
    if (lockSessionId) query.append('lockSessionId', lockSessionId);

    let res = await fetch(`${API_BASE_URL}/v1/rooms/availability?${query.toString()}`);
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/rooms/availability?${query.toString()}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi checkRoomAvailabilityApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ kiểm tra phòng trống.'
    };
  }
};

/**
 * Giữ phòng tạm thời 15 phút chống Overbooking
 * POST /api/v1/rooms/lock
 * @param {Object} payload { roomTypeId, checkInDate, checkOutDate, quantity }
 */
export const lockRoomSessionApi = async ({ roomTypeId, checkInDate, checkOutDate, quantity = 1 }) => {
  try {
    let res = await fetch(`${API_BASE_URL}/v1/rooms/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomTypeId, checkInDate, checkOutDate, quantity })
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/rooms/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomTypeId, checkInDate, checkOutDate, quantity })
      });
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi lockRoomSessionApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ giữ phòng.'
    };
  }
};

/**
 * Nhả phiên giữ phòng
 * DELETE /api/v1/rooms/lock/:sessionId
 */
export const releaseRoomLockApi = async (sessionId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/rooms/lock/${sessionId}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi releaseRoomLockApi:', err);
    return { success: false };
  }
};

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
  try {
    if (!q || !q.trim()) return { data: null };
    const res = await fetch(`${API_BASE_URL}/v1/rooms/suggest?q=${encodeURIComponent(q.trim())}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error('Lỗi khi fetch suggester:', err);
    return { data: null };
  }
};

/**
 * Tạo đơn đặt phòng chính thức (Thanh toán)
 * POST /api/v1/guest/bookings or POST /api/v1/rooms/book
 */
export const createBookingApi = async (payload) => {
  try {
    let res = await fetch(`${API_BASE_URL}/v1/guest/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/v1/rooms/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
        },
        body: JSON.stringify(payload)
      });
    }
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
        },
        body: JSON.stringify(payload)
      });
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi createBookingApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ thanh toán đặt phòng.'
    };
  }
};

export const createOnlineBookingEngineApi = createBookingApi;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ONLINE DEPOSIT PAYMENT INTEGRATION (FEAT-GUEST-08 / A8)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Lấy chi tiết đơn đặt phòng phục vụ Màn hình 7
 * GET /api/v1/guest/bookings/:id
 */
export const getBookingDetailsApi = async (id) => {
  try {
    let res = await fetch(`${API_BASE_URL}/v1/guest/bookings/${id}`);
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/bookings/${id}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi getBookingDetailsApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ lấy thông tin đơn đặt phòng.'
    };
  }
};

/**
 * Xử lý thanh toán tiền cọc trực tuyến
 * POST /api/v1/guest/bookings/:bookingId/deposit
 */
export const processDepositPaymentApi = async (bookingId, payload) => {
  try {
    let res = await fetch(`${API_BASE_URL}/v1/guest/bookings/${bookingId}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('hotel_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hotel_token')}` } : {})
        },
        body: JSON.stringify({ ...payload, bookingId })
      });
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi processDepositPaymentApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến cổng thanh toán trực tuyến.'
    };
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRICE & SURCHARGE CALCULATION API (FEAT-GUEST-06 / A6)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Tự động tính số đêm, phụ thu thêm người lớn/trẻ em và tổng tiền phòng
 * POST /api/bookings/calculate-pricing
 * @param {Object} payload { checkInDate, checkOutDate, baseRate, roomTypeId, adults, children, roomQuantity, selectedAddOns, taxesAndFeesRate, depositRate, isGoldMember }
 */
export const calculatePricingApi = async (payload) => {
  try {
    let res = await fetch(`${API_BASE_URL}/bookings/calculate-pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/v1/guest/bookings/calculate-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi calculatePricingApi:', err);
    return {
      success: false,
      errorCode: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ tính toán giá phòng.'
    };
  }
};

/**
 * FEAT-GUEST-07: Áp dụng mã giảm giá và voucher khuyến mãi (Mã truy vết: A7)
 * POST /bookings/apply-voucher hoặc POST /api/v1/vouchers/validate
 * @param {Object} payload { voucherCode, bookingTotal, currency }
 */
export const validateVoucherApi = async (payload) => {
  try {
    let res = await fetch(`${API_BASE_URL}/bookings/apply-voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) {
      res = await fetch(`${API_BASE_URL}/v1/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Lỗi validateVoucherApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ kiểm tra mã giảm giá.'
    };
  }
};

/**
 * FEAT-GUEST-07: Áp dụng voucher vào đơn đặt phòng đã tạo
 * POST /bookings/:bookingId/apply-voucher
 */
export const applyVoucherToBookingApi = async (bookingId, voucherCode) => {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/apply-voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucherCode })
    });
    return await res.json();
  } catch (err) {
    console.error('Lỗi applyVoucherToBookingApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ áp dụng voucher.'
    };
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKING HISTORY & CANCELLATION API (FEAT-GUEST-09 / A9)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Lấy lịch sử đặt phòng cá nhân
 * GET /api/v1/me/bookings
 * @param {Object} params { statusFilter, dateWindow, searchKeyword, page, limit }
 * @param {string} token JWT token của người dùng
 */
export const getMyBookingsApi = async (params = {}, token = null) => {
  try {
    const authToken = token || localStorage.getItem('hotel_token');
    const query = new URLSearchParams();
    if (params.statusFilter) query.append('statusFilter', params.statusFilter);
    if (params.dateWindow) query.append('dateWindow', params.dateWindow);
    if (params.searchKeyword) query.append('searchKeyword', params.searchKeyword);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    let res = await fetch(`${API_BASE_URL}/v1/me/bookings?${query.toString()}`, { headers });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/bookings?${query.toString()}`, { headers });
    }

    return await res.json();
  } catch (err) {
    console.error('Lỗi getMyBookingsApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ lịch sử đặt phòng.'
    };
  }
};

/**
 * Hủy đặt phòng cá nhân theo quy định
 * PATCH /api/v1/me/bookings/:bookingId/cancel
 * @param {number|string} bookingId
 * @param {Object} body { cancellationReason, mockServerTime }
 * @param {string} token
 */
export const cancelMyBookingApi = async (bookingId, body = {}, token = null) => {
  try {
    const authToken = token || localStorage.getItem('hotel_token');
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    let res = await fetch(`${API_BASE_URL}/v1/me/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });
    }

    return await res.json();
  } catch (err) {
    console.error('Lỗi cancelMyBookingApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ thực hiện hủy đặt phòng.'
    };
  }
};



