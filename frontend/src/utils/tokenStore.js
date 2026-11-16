/**
 * In-memory accessToken store (FEAT-GUEST-01 / Group 4)
 * Tránh lưu accessToken vào localStorage để giảm rủi ro XSS;
 * phiên đăng nhập được khôi phục tự động qua HttpOnly refreshToken cookie (/api/v1/auth/refresh).
 */
let memoryAccessToken = null;

export const getAccessToken = () =>
  memoryAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('hotel_token') : null) || null;

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
