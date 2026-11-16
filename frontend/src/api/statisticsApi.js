// frontend/src/api/statisticsApi.js
import { getAccessToken } from '../utils/tokenStore.js';

const resolveToken = () =>
  getAccessToken() ||
  (typeof localStorage !== 'undefined'
    ? localStorage.getItem('hotel_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    : null);

const getApiRoot = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    (typeof window === 'undefined' ? 'http://localhost:5000/api' : '/api');
  const cleaned = String(envUrl).replace(/\/+$/, '');
  return cleaned.endsWith('/v1') ? cleaned.slice(0, -3) : cleaned;
};

const getApiBase = () => `${getApiRoot()}/v1/statistics`;

export const getWsDashboardUrl = () => {
  const envWs =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_WS_URL);
  if (envWs) {
    return `${String(envWs).replace(/\/+$/, '')}/ws/v1/dashboard`;
  }
  const envApi =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL);
  if (envApi && /^https?:\/\//i.test(envApi)) {
    return `${String(envApi).replace(/^http/i, 'ws').replace(/\/api(\/v1)?\/?$/i, '').replace(/\/+$/, '')}/ws/v1/dashboard`;
  }
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/v1/dashboard`;
  }
  return 'ws://localhost:5000/ws/v1/dashboard';
};

function getAuthHeaders() {
  const token = resolveToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * C11: Lấy dữ liệu Dashboard Doanh thu Real-time theo ngày
 * @param {string} [date] Định dạng YYYY-MM-DD
 */
export async function getRevenueDashboard(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`${getApiBase()}/revenue${query}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Không thể tải dữ liệu thống kê doanh thu.');
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * C11: Lấy thông tin kết nối WebSocket Dashboard
 */
export async function getDashboardWsInfo() {
  const res = await fetch(`${getApiBase()}/dashboard/ws-info`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Không thể lấy thông tin kết nối thời gian thực.');
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * C12: Lấy báo cáo Công suất phòng (Occupancy Rate), ADR và RevPAR
 * @param {{ fromDate?: string, toDate?: string }} params
 */
export async function getOccupancyReport({ fromDate, toDate } = {}) {
  const query = new URLSearchParams();
  if (fromDate) query.append('fromDate', fromDate);
  if (toDate) query.append('toDate', toDate);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${getApiBase()}/occupancy${qs}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Không thể tải báo cáo công suất phòng & RevPAR.');
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * C12: Xuất báo cáo Occupancy & RevPAR ra file Excel (.xlsx) hoặc CSV (.csv)
 * @param {{ fromDate?: string, toDate?: string, format?: 'xlsx' | 'csv' }} params
 */
export async function exportOccupancyExcel({ fromDate, toDate, format = 'xlsx' } = {}) {
  const query = new URLSearchParams();
  query.append('format', format);
  if (fromDate) query.append('fromDate', fromDate);
  if (toDate) query.append('toDate', toDate);

  const res = await fetch(`${getApiBase()}/occupancy/export?${query.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    let errMsg = 'Không thể xuất file báo cáo công suất phòng.';
    let errCode = null;
    try {
      const errJson = await res.json();
      if (errJson?.message) errMsg = errJson.message;
      if (errJson?.code) errCode = errJson.code;
    } catch (_) {
      // ignore parse error
    }
    const err = new Error(errMsg);
    err.status = res.status;
    err.code = errCode;
    throw err;
  }

  const blob = await res.blob();
  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const fileName = `Occupancy_RevPAR_${fromDate || 'Report'}_${toDate || ' Export'}.${ext}`;

  if (typeof window !== 'undefined') {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  return blob;
}

const statisticsApi = {
  getRevenueDashboard,
  getDashboardWsInfo,
  getOccupancyReport,
  exportOccupancyExcel,
  getWsDashboardUrl,
};

export default statisticsApi;
