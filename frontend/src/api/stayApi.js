const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Lấy danh sách khách đang lưu trú (CheckedIn)
 */
export const getInHouseStaysApi = async (query = '') => {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(`${API_BASE_URL}/v1/stays/in-house?query=${q}`);
    return await res.json();
  } catch (err) {
    console.error('getInHouseStaysApi error:', err);
    return { success: false, message: err.message, data: [] };
  }
};

/**
 * Lấy hồ sơ chi tiết một lượt lưu trú
 */
export const getStayDossierApi = async (stayId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}`);
    return await res.json();
  } catch (err) {
    console.error('getStayDossierApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Kiểm tra xung đột lịch và tự động tính phụ thu gia hạn
 */
export const previewStayExtensionApi = async (stayId, { requestedCheckoutAt, additionalNights }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/extensions/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedCheckoutAt, additionalNights }),
    });
    return await res.json();
  } catch (err) {
    console.error('previewStayExtensionApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Xác nhận gia hạn lưu trú & cập nhật Folio hóa đơn
 */
export const confirmStayExtensionApi = async (stayId, payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/extensions/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('confirmStayExtensionApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Lấy danh sách phòng khả dụng để đổi phòng (Mode 02)
 */
export const getReplacementRoomsApi = async (stayId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.floor) params.append('floor', filters.floor);
    if (filters.roomClass) params.append('roomClass', filters.roomClass);

    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/replacement-rooms?${params.toString()}`);
    return await res.json();
  } catch (err) {
    console.error('getReplacementRoomsApi error:', err);
    return { success: false, message: err.message, data: [] };
  }
};

/**
 * Thực hiện chuyển phòng (Room Relocation)
 */
export const relocateStayRoomApi = async (stayId, payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/relocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('relocateStayRoomApi error:', err);
    return { success: false, message: err.message };
  }
};
