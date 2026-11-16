/**
 * AccessToken store đồng bộ giữa In-memory và localStorage ('hotel_token')
 * Đảm bảo tương thích đồng thời cho cả Guest Portal (getAccessToken) và toàn bộ phân hệ Admin PMS / C1-C14.
 */
let memoryAccessToken =
  typeof window !== 'undefined' ? localStorage.getItem('hotel_token') || null : null;

export const getAccessToken = () => {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('hotel_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      null
    );
  }
  return null;
};

export const setAccessToken = (token) => {
  memoryAccessToken = token || null;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('hotel_token', token);
    } else {
      localStorage.removeItem('hotel_token');
    }
  }
};

export const clearAccessToken = () => {
  memoryAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hotel_token');
  }
};
