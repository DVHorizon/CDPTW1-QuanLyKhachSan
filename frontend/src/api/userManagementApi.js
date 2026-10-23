const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  const token = localStorage.getItem('hotel_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const safeFetch = async (endpoint, options = {}) => {
  const primaryUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(primaryUrl, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) }
    });
    return res;
  } catch (primaryErr) {
    console.warn(`Primary fetch tới ${primaryUrl} lỗi, đang thử fallback port 5000:`, primaryErr);
    const fallbackUrl = API_BASE_URL.startsWith('/')
      ? `http://localhost:5000${API_BASE_URL}${endpoint}`
      : `http://localhost:5000/api${endpoint}`;
    return await fetch(fallbackUrl, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) }
    });
  }
};

/**
 * Lấy danh sách tài khoản phân trang (Spec 3 - Wireframe 6.1)
 */
export const fetchUsers = async ({ search = '', role = 'TAT_CA', status = 'TAT_CA', page = 1, limit = 10, sort = 'asc' } = {}) => {
  try {
    const params = new URLSearchParams();
    if (search && search.trim()) params.append('search', search.trim());
    if (role && role !== 'TAT_CA') params.append('role', role);
    if (status && status !== 'TAT_CA') params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    params.append('sort', sort);

    const res = await safeFetch(`/v1/users?${params.toString()}`);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API fetchUsers:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi tải danh sách tài khoản' } };
  }
};

/**
 * Lấy danh mục 4 vai trò cố định (Spec 3 - Bảng 5)
 */
export const fetchRoles = async () => {
  try {
    const res = await safeFetch('/v1/roles');
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API fetchRoles:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi tải danh mục vai trò' } };
  }
};

/**
 * Thêm mới tài khoản (Spec 3 - Luồng 4.1)
 */
export const createUser = async (userData) => {
  try {
    const res = await safeFetch('/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API createUser:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi thêm mới tài khoản' } };
  }
};

/**
 * Cập nhật thông tin tài khoản (Spec 3 - Luồng 4.2)
 */
export const updateUser = async (userId, userData) => {
  try {
    const res = await safeFetch(`/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API updateUser:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi cập nhật tài khoản' } };
  }
};

/**
 * Khóa / Mở khóa tài khoản (Spec 3 - Luồng 4.3)
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const res = await safeFetch(`/v1/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API updateUserStatus:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi cập nhật trạng thái' } };
  }
};

/**
 * Đặt lại mật khẩu ngẫu nhiên (Spec 3 - Luồng 4.4)
 */
export const resetUserPassword = async (userId) => {
  try {
    const res = await safeFetch(`/v1/users/${userId}/reset-password`, {
      method: 'POST'
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API resetUserPassword:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi đặt lại mật khẩu' } };
  }
};

/**
 * Xóa mềm tài khoản (Spec 3 - Luồng 4.5 & Quy tắc 3.9)
 */
export const deleteUser = async (userId) => {
  try {
    const res = await safeFetch(`/v1/users/${userId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error('Lỗi API deleteUser:', error);
    return { ok: false, status: 500, data: { success: false, message: 'Lỗi mạng khi xóa tài khoản' } };
  }
};
