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
