'use strict';

/**
 * api/wishlistApi.js
 * 
 * TÍNH NĂNG 13C: DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)  |  Màn hình 59 (WSH-059)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper: Tạo headers kèm Authorization token nếu có
 */
const getAuthHeaders = (token = null) => {
  const authToken = token || localStorage.getItem('hotel_token');
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

/**
 * 1. Lấy danh sách Wishlist
 * GET /api/v1/me/wishlist
 * @param {Object} params { sortOption, roomTypeIds }
 * @param {string} token
 */
export const getWishlistApi = async (params = {}, token = null) => {
  try {
    const query = new URLSearchParams();
    if (params.sortOption) query.append('sortOption', params.sortOption);
    if (params.roomTypeIds) query.append('roomTypeIds', params.roomTypeIds);

    const headers = getAuthHeaders(token);
    let res = await fetch(`${API_BASE_URL}/v1/me/wishlist?${query.toString()}`, { headers });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/wishlist?${query.toString()}`, { headers });
    }
    return await res.json();
  } catch (err) {
    console.error('Lỗi getWishlistApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ danh sách yêu thích.',
      data: { total: 0, items: [], roomTypeIds: [] }
    };
  }
};

/**
 * 2. Thêm phòng vào Wishlist
 * POST /api/v1/me/wishlist/:roomTypeId
 * @param {number|string} roomTypeId
 * @param {string} token
 */
export const addToWishlistApi = async (roomTypeId, token = null) => {
  try {
    const headers = getAuthHeaders(token);
    let res = await fetch(`${API_BASE_URL}/v1/me/wishlist/${roomTypeId}`, {
      method: 'POST',
      headers
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/wishlist/${roomTypeId}`, {
        method: 'POST',
        headers
      });
    }
    return await res.json();
  } catch (err) {
    console.error('Lỗi addToWishlistApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ.'
    };
  }
};

/**
 * 3. Xóa phòng khỏi Wishlist
 * DELETE /api/v1/me/wishlist/:roomTypeId
 * @param {number|string} roomTypeId
 * @param {string} token
 */
export const removeFromWishlistApi = async (roomTypeId, token = null) => {
  try {
    const headers = getAuthHeaders(token);
    let res = await fetch(`${API_BASE_URL}/v1/me/wishlist/${roomTypeId}`, {
      method: 'DELETE',
      headers
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/wishlist/${roomTypeId}`, {
        method: 'DELETE',
        headers
      });
    }
    return await res.json();
  } catch (err) {
    console.error('Lỗi removeFromWishlistApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ.'
    };
  }
};

/**
 * 4. Xóa toàn bộ Wishlist (Empty state)
 * DELETE /api/v1/me/wishlist
 * @param {string} token
 */
export const clearWishlistApi = async (token = null) => {
  try {
    const headers = getAuthHeaders(token);
    let res = await fetch(`${API_BASE_URL}/v1/me/wishlist`, {
      method: 'DELETE',
      headers
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/wishlist`, {
        method: 'DELETE',
        headers
      });
    }
    return await res.json();
  } catch (err) {
    console.error('Lỗi clearWishlistApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ.'
    };
  }
};

/**
 * 5. Đồng bộ Wishlist từ LocalStorage lên Database sau khi đăng nhập
 * POST /api/v1/me/wishlist/sync
 * @param {Array<number>} roomTypeIds
 * @param {string} token
 */
export const syncWishlistApi = async (roomTypeIds = [], token = null) => {
  try {
    const headers = getAuthHeaders(token);
    let res = await fetch(`${API_BASE_URL}/v1/me/wishlist/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ roomTypeIds })
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/me/wishlist/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomTypeIds })
      });
    }
    return await res.json();
  } catch (err) {
    console.error('Lỗi syncWishlistApi:', err);
    return {
      success: false,
      code: 'ERROR_NETWORK',
      message: 'Không thể kết nối đến máy chủ.'
    };
  }
};
