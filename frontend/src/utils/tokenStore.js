/**
 * In-memory accessToken store (FEAT-GUEST-01 / Group 4)
 * Tránh lưu accessToken vào localStorage để giảm rủi ro XSS;
 * phiên đăng nhập được khôi phục tự động qua HttpOnly refreshToken cookie (/api/v1/auth/refresh).
 */
let memoryAccessToken = null;

export const getAccessToken = () => memoryAccessToken;

export const setAccessToken = (token) => {
  memoryAccessToken = token || null;
};

export const clearAccessToken = () => {
  memoryAccessToken = null;
};
