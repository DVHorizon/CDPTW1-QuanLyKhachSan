const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Lấy danh sách khách đang lưu trú (CheckedIn)
 */
export const getInHouseStaysApi = async (query = '') => {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(`${API_BASE_URL}/v1/stays/in-house?query=${q}`, {
      headers: getAuthHeaders(),
    });
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
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error('getStayDossierApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Kiểm tra xung đột lịch và tự động tính phụ thu gia hạn (Preview)
 */
export const previewStayExtensionApi = async (stayId, { requestedCheckoutAt, additionalNights }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/extensions/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ requestedCheckoutAt, additionalNights }),
    });
    return await res.json();
  } catch (err) {
    console.error('previewStayExtensionApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Xác nhận gia hạn lưu trú & cập nhật Folio hóa đơn (Confirm)
 */
export const confirmStayExtensionApi = async (stayId, payload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/extensions/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('confirmStayExtensionApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Giám sát phê duyệt yêu cầu gia hạn đặc biệt
 */
export const approveStayExtensionApi = async (extensionId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/stay-extensions/${extensionId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error('approveStayExtensionApi error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Lấy danh sách phòng khả dụng để đổi phòng (Mode 02: Room Relocation)
 */
export const getReplacementRoomsApi = async (stayId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.floor) params.append('floor', filters.floor);
    if (filters.roomClass) params.append('roomClass', filters.roomClass);

    const res = await fetch(`${API_BASE_URL}/v1/stays/${stayId}/replacement-rooms?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
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
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('relocateStayRoomApi error:', err);
    return { success: false, message: err.message };
  }
};
