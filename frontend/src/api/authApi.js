const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Hàm gọi API an toàn, tự động thử primary URL và fallback giữa relative proxy (/api) và http://localhost:5000/api
 */
const safeFetch = async (endpoint, options = {}) => {
  const primaryUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(primaryUrl, options);
    return res;
  } catch (primaryErr) {
    console.warn(`Primary fetch tới ${primaryUrl} gặp lỗi mạng, đang thử fallback:`, primaryErr);
    if (API_BASE_URL.startsWith('/')) {
      return await fetch(`http://localhost:5000${API_BASE_URL}${endpoint}`, options);
    }
    return await fetch(`/api${endpoint}`, options);
  }
};

/**
 * Đăng nhập hệ thống
 * POST /api/v1/auth/login
 */
export const loginUser = async ({ identifier, password }) => {
  try {
    const res = await safeFetch('/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Lỗi API login:', error);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    };
  }
};

/**
 * Đăng ký tài khoản khách hàng mới
 * POST /api/v1/auth/register
 */
export const registerUser = async ({ fullName, email, phone, password, enrollClub = true }) => {
  try {
    const res = await safeFetch('/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        password,
        enrollClub
      })
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Lỗi API register:', error);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    };
  }
};

/**
 * Lấy thông tin tài khoản hiện tại từ JWT token
 * GET /api/v1/auth/me
 */
export const fetchCurrentUser = async (token) => {
  try {
    if (!token) return null;
    const res = await safeFetch('/v1/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (error) {
    console.error('Lỗi API fetchCurrentUser:', error);
    return null;
  }
};

/**
 * Đăng nhập qua Google OAuth
 * POST /api/v1/auth/google
 */
export const loginWithGoogle = async (payload) => {
  try {
    const body = typeof payload === 'string' ? { credential: payload } : payload;
    const res = await safeFetch('/v1/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Lỗi API loginWithGoogle:', error);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    };
  }
};

/**
 * Đăng nhập qua Facebook OAuth
 * POST /api/v1/auth/facebook
 */
export const loginWithFacebook = async (payload) => {
  try {
    const body = typeof payload === 'string' ? { accessToken: payload } : payload;
    const res = await safeFetch('/v1/auth/facebook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Lỗi API loginWithFacebook:', error);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    };
  }
};
