const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Lấy dữ liệu tổng hợp cho trang chủ
 */
export const fetchHomeData = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/home`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Lỗi khi fetch dữ liệu trang chủ:', err);
    return null;
  }
};

/**
 * Lấy danh sách chi nhánh
 */
export const fetchBranches = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/branches`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Lỗi khi fetch chi nhánh:', err);
    return [];
  }
};

/**
 * Lấy danh sách hạng phòng
 */
export const fetchRoomTypes = async (limit = 12) => {
  try {
    const res = await fetch(`${API_BASE_URL}/room-types?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Lỗi khi fetch hạng phòng:', err);
    return [];
  }
};
