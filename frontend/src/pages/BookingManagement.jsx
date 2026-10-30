import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import BookingChargesModal from '../components/admin/BookingChargesModal';

const API_BASE = typeof window !== 'undefined' && window.location.port === '3000'
  ? '/api/v1/bookings'
  : 'http://localhost:5000/api/v1/bookings';
const API_ROOM_TYPES = typeof window !== 'undefined' && window.location.port === '3000'
  ? '/api/v1/room-types'
  : 'http://localhost:5000/api/v1/room-types';

// ─── 6 Trạng thái cố định và màu sắc chuẩn Spec 3.4 & 6.3 ──────────────────
const STATUS_CONFIG = {
  Pending: {
    key: 'Pending',
    label: 'Chờ xác nhận',
    color: '#6B7280', // Xám
    bg: '#F3F4F6',
    border: '#D1D5DB',
  },
  Confirmed: {
    key: 'Confirmed',
    label: 'Đã xác nhận',
    color: '#7B3FE4', // Tím
    bg: '#F5EEFD',
    border: '#D8B4FE',
  },
  CheckedIn: {
    key: 'CheckedIn',
    label: 'Đang ở',
    color: '#1F6FEB', // Xanh dương
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  CheckedOut: {
    key: 'CheckedOut',
    label: 'Đã trả phòng',
    color: '#1E8E3E', // Xanh lá
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  Cancelled: {
    key: 'Cancelled',
    label: 'Đã hủy',
    color: '#D93025', // Đỏ
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  NoShow: {
    key: 'NoShow',
    label: 'Không đến',
    color: '#F29900', // Cam
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
};

const ALL_STATUS_KEYS = ['Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'];

// ─── Tiện ích ngày theo múi giờ UTC+7 ───────────────────────────────────────
const getTodayUtc7 = () => {
  const now = new Date();
  const utc7 = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${utc7.getFullYear()}-${p(utc7.getMonth() + 1)}-${p(utc7.getDate())}`;
};

const addDaysUtc7 = (dateStr, days) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
};

const getDaysDiff = (d1Str, d2Str) => {
  if (!d1Str || !d2Str) return 0;
  const [y1, m1, day1] = d1Str.split('-').map(Number);
  const [y2, m2, day2] = d2Str.split('-').map(Number);
  const dt1 = Date.UTC(y1, m1 - 1, day1);
  const dt2 = Date.UTC(y2, m2 - 1, day2);
  return Math.round((dt2 - dt1) / 86400000);
};

const fmtDisplayDate = (dStr) => {
  if (!dStr) return '—';
  const clean = String(dStr).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return clean;
};

const fmtCurrency = (val) => {
  const n = Number(val) || 0;
  return n.toLocaleString('vi-VN') + ' ₫';
};

const fmtNumberOnly = (val) => {
  const n = Number(val) || 0;
  return n.toLocaleString('vi-VN');
};

export default function BookingManagement() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Xác định vai trò (Admin vs Lễ tân) để phục vụ Data Masking & Quyền hạn
  const userRole = (user?.roleName || '').toLowerCase();
  const isAdmin = user?.roleId === 1 || userRole === 'admin';

  // ─── Giá trị mặc định theo Spec 6 ──────────────────────────────────────────
  const today = getTodayUtc7();
  const defaultDateFrom = addDaysUtc7(today, -29);
  const defaultDateTo = today;

  // ─── Khởi tạo state từ URL Query String ─────────────────────────────────────
  const initialKeyword = searchParams.get('keyword') || '';
  const initialDateFilterType = searchParams.get('dateFilterType') || 'CHECKIN_DATE';
  const initialDateFrom = searchParams.get('dateFrom') || defaultDateFrom;
  const initialDateTo = searchParams.get('dateTo') || defaultDateTo;
  const initialStatusParam = searchParams.get('status');
  const initialStatuses = initialStatusParam
    ? initialStatusParam.split(',').filter((s) => ALL_STATUS_KEYS.includes(s))
    : ALL_STATUS_KEYS;
  const initialRoomTypeId = searchParams.get('roomTypeId') || '';
  const initialSortBy = searchParams.get('sortBy') || 'CheckInDate';
  const initialSortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase();
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialPageSize = Number(searchParams.get('pageSize')) || 20;

  // ─── State bộ lọc ──────────────────────────────────────────────────────────
  const [keywordInput, setKeywordInput] = useState(initialKeyword);
  const [debouncedKeyword, setDebouncedKeyword] = useState(initialKeyword);
  const [dateFilterType, setDateFilterType] = useState(initialDateFilterType);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedStatuses, setSelectedStatuses] = useState(
    initialStatuses.length > 0 ? initialStatuses : ALL_STATUS_KEYS
  );
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // ─── State thông báo lỗi inline (Mục 5.2 & 6.3) ────────────────────────────
  const [keywordError, setKeywordError] = useState('');
  const [dateError, setDateError] = useState('');

  // ─── State dữ liệu & API ───────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);

  // Toast thông báo toàn màn hình (cho lỗi 401/403, export, not found)
  const [toast, setToast] = useState(null);

  // ─── State Popup Chi tiết (Mục 6.2) ────────────────────────────────────────
  const [selectedBookingId, setSelectedBookingId] = useState(
    searchParams.get('bookingId') ? Number(searchParams.get('bookingId')) : null
  );
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [chargesModalBookingId, setChargesModalBookingId] = useState(null);

  // ─── State Modal Xem Trước Xuất Excel (Excel Preview Modal) ────────────────
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState(null);
  const [isExportPreviewLoading, setIsExportPreviewLoading] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Toast helper
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── 1. Debounce Keyword 400ms (Mục 3.2 & Wireframe 6.1) ───────────────────
  useEffect(() => {
    if (keywordInput.length > 100) {
      setKeywordError('Từ khóa tìm kiếm không được vượt quá 100 ký tự');
      return;
    }
    setKeywordError('');

    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [keywordInput]);

  // ─── 2. Validate Khoảng ngày (Mục 3.3 & Wireframe 6.1, Test Cases 10-18) ───
  const validateDateRange = useCallback((from, to) => {
    const hasFrom = !!(from && String(from).trim());
    const hasTo = !!(to && String(to).trim());

    if (!hasFrom && !hasTo) {
      setDateError('');
      return true;
    }
    if (!hasFrom || !hasTo) {
      setDateError('Vui lòng nhập đầy đủ Từ ngày và Đến ngày');
      return false;
    }
    if (from > to) {
      setDateError('Từ ngày phải nhỏ hơn hoặc bằng Đến ngày');
      return false;
    }
    const diff = getDaysDiff(from, to);
    if (diff > 366) {
      setDateError('Khoảng thời gian lọc không được vượt quá 366 ngày, vui lòng thu hẹp lại');
      return false;
    }
    setDateError('');
    return true;
  }, []);

  useEffect(() => {
    validateDateRange(dateFrom, dateTo);
  }, [dateFrom, dateTo, validateDateRange]);

  // ─── 3. Tải danh mục loại phòng (A-Z) (Mục 3.5) ───────────────────────────
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const res = await fetch(API_ROOM_TYPES);
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json) ? json : json.data || [];
          const normalized = items
            .map((item) => ({
              id: item.RoomTypeId || item.roomTypeId || item.id,
              name: item.TypeName || item.typeName || item.name || '',
            }))
            .filter((item) => item.id && item.name);
          normalized.sort((a, b) => a.name.localeCompare(b.name));
          setRoomTypes(normalized);
        }
      } catch (_) {}
    };
    fetchRoomTypes();
  }, []);

  // ─── 4. Đồng bộ State với URL Query String (Mục 6.3) ───────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedKeyword) params.set('keyword', debouncedKeyword);
    if (dateFilterType !== 'CHECKIN_DATE') params.set('dateFilterType', dateFilterType);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUS_KEYS.length) {
      params.set('status', selectedStatuses.join(','));
    }
    if (roomTypeId) params.set('roomTypeId', roomTypeId);
    if (sortBy !== 'CheckInDate') params.set('sortBy', sortBy);
    if (sortOrder !== 'DESC') params.set('sortOrder', sortOrder);
    if (page > 1) params.set('page', String(page));
    if (pageSize !== 20) params.set('pageSize', String(pageSize));
    if (selectedBookingId) params.set('bookingId', String(selectedBookingId));

    setSearchParams(params, { replace: true });
  }, [
    debouncedKeyword,
    dateFilterType,
    dateFrom,
    dateTo,
    selectedStatuses,
    roomTypeId,
    sortBy,
    sortOrder,
    page,
    pageSize,
    selectedBookingId,
    setSearchParams,
  ]);

  // ─── 5. Fetch Danh Sách Booking từ Backend (Mục 4.1) ───────────────────────
  const fetchBookings = useCallback(async () => {
    if (!validateDateRange(dateFrom, dateTo) || keywordError) {
      return;
    }

    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (debouncedKeyword) q.set('keyword', debouncedKeyword);
      q.set('dateFilterType', dateFilterType);
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUS_KEYS.length) {
        selectedStatuses.forEach((st) => q.append('status', st));
      }
      if (roomTypeId) q.set('roomTypeId', roomTypeId);
      q.set('sortBy', sortBy);
      q.set('sortOrder', sortOrder);
      q.set('page', String(page));
      q.set('pageSize', String(pageSize));

      const authToken = token || localStorage.getItem('hotel_token');
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}?${q.toString()}`, { headers });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.message || 'Lỗi khi tải danh sách booking');
        return;
      }

      setBookings(json.items || []);
      setTotalCount(json.totalCount || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedKeyword,
    dateFilterType,
    dateFrom,
    dateTo,
    selectedStatuses,
    roomTypeId,
    sortBy,
    sortOrder,
    page,
    pageSize,
    keywordError,
    validateDateRange,
    token,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ─── 6. Fetch Chi Tiết 1 Booking (Mục 3.10 & 6.2) ───────────────────────────
  const fetchBookingDetail = useCallback(
    async (bId) => {
      if (!bId) {
        setDetailData(null);
        return;
      }
      setIsDetailLoading(true);
      try {
        const authToken = token || localStorage.getItem('hotel_token');
        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch(`${API_BASE}/${bId}`, { headers });
        const json = await res.json();

        if (!res.ok) {
          showToast(json.message || 'Không tìm thấy booking hoặc booking đã bị xóa', 'error');
          setSelectedBookingId(null);
          return;
        }

        setDetailData(json.data);
      } catch (err) {
        showToast('Lỗi khi tải chi tiết booking: ' + err.message, 'error');
        setSelectedBookingId(null);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedBookingId) {
      fetchBookingDetail(selectedBookingId);
    } else {
      setDetailData(null);
    }
  }, [selectedBookingId, fetchBookingDetail]);

  // ─── 7. Mở Modal Xem Trước Dữ Liệu Xuất Excel (Mục 3.12 & Test Cases 33-36) ─
  const handleOpenExportPreview = async () => {
    if (!validateDateRange(dateFrom, dateTo) || keywordError) {
      showToast('Vui lòng kiểm tra lại bộ lọc trước khi xem trước xuất Excel', 'warning');
      return;
    }

    setIsExportPreviewLoading(true);
    try {
      const q = new URLSearchParams();
      if (debouncedKeyword) q.set('keyword', debouncedKeyword);
      q.set('dateFilterType', dateFilterType);
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUS_KEYS.length) {
        selectedStatuses.forEach((st) => q.append('status', st));
      }
      if (roomTypeId) q.set('roomTypeId', roomTypeId);
      q.set('sortBy', sortBy);
      q.set('sortOrder', sortOrder);
      q.set('preview', 'true'); // Yêu cầu trả về dữ liệu xem trước

      const authToken = token || localStorage.getItem('hotel_token');
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/export?${q.toString()}`, { headers });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.message || 'Lỗi khi chuẩn bị dữ liệu xuất Excel', 'error');
        return;
      }

      setExportPreviewData(json);
      setShowExportPreview(true);
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ: ' + err.message, 'error');
    } finally {
      setIsExportPreviewLoading(false);
    }
  };

  // ─── 8. Thực hiện Tải Xuống File Excel Thực Tế ──────────────────────────────
  const handleConfirmDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const q = new URLSearchParams();
      if (debouncedKeyword) q.set('keyword', debouncedKeyword);
      q.set('dateFilterType', dateFilterType);
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      if (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUS_KEYS.length) {
        selectedStatuses.forEach((st) => q.append('status', st));
      }
      if (roomTypeId) q.set('roomTypeId', roomTypeId);
      q.set('sortBy', sortBy);
      q.set('sortOrder', sortOrder);

      const authToken = token || localStorage.getItem('hotel_token');
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/export?${q.toString()}`, { headers });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.message || 'Lỗi khi xuất file Excel', 'error');
        return;
      }

      // Đọc blob và kích hoạt download
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = exportPreviewData?.filename || 'Booking_Export.xlsx';
      const fnMatch = /filename="?([^"]+)"?/.exec(contentDisposition);
      if (fnMatch && fnMatch[1]) {
        filename = fnMatch[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast('Tải xuống file Excel thành công!', 'success');
      setShowExportPreview(false);
    } catch (err) {
      showToast('Không thể xuất file: ' + err.message, 'error');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // ─── 9. Xử lý Xóa Bộ Lọc (Mục 3.6 & 6.1) ──────────────────────────────────
  const handleResetFilters = () => {
    setKeywordInput('');
    setDebouncedKeyword('');
    setDateFilterType('CHECKIN_DATE');
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setSelectedStatuses(ALL_STATUS_KEYS);
    setRoomTypeId('');
    setSortBy('CheckInDate');
    setSortOrder('DESC');
    setPage(1);
    setKeywordError('');
    setDateError('');
  };

  // ─── 10. Xử lý Click Tiêu Đề Cột để Sắp Xếp (Mục 3.7 & 6.1) ────────────────
  const handleColumnHeaderSort = (colKey) => {
    if (sortBy === colKey) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        setSortBy('CheckInDate');
        setSortOrder('DESC');
      }
    } else {
      setSortBy(colKey);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  // ─── 11. Xử lý Trạng Thái Multi-select Chip (Mục 3.4 & 6.1) ────────────────
  const toggleStatusChip = (stKey) => {
    if (selectedStatuses.includes(stKey)) {
      if (selectedStatuses.length === 1) {
        showToast('Phải giữ lại tối thiểu 1 trạng thái để lọc', 'warning');
        return;
      }
      setSelectedStatuses(selectedStatuses.filter((s) => s !== stKey));
    } else {
      setSelectedStatuses([...selectedStatuses, stKey]);
    }
    setPage(1);
  };

  // Tên hiển thị loại ngày
  const dateTypeLabel = useMemo(() => {
    if (dateFilterType === 'BOOKING_DATE') return 'Ngày đặt';
    if (dateFilterType === 'CHECKOUT_DATE') return 'Ngày trả phòng';
    return 'Ngày nhận phòng';
  }, [dateFilterType]);

  return (
    <AdminLayout>
      {/* Toast Notification Container */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
              : toast.type === 'warning'
              ? 'bg-amber-900 border-amber-500 text-amber-100'
              : 'bg-red-950 border-red-500 text-red-100'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'error'}
          </span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-slate-800">
        {/* ─── Header Tiêu Đề Phân Hệ ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <span>Hệ Thống Quản Lý Khách Sạn</span>
              <span>•</span>
              <span className="text-blue-600 font-bold">FEAT-BOOKINGLIST-01</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-700 text-3xl">receipt_long</span>
              Quản Lý Danh Sách Booking Toàn Hệ Thống
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tra cứu và xem toàn bộ booking, lọc theo ngày, trạng thái, hạng phòng và xuất báo cáo Excel (Read-Only).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút Xóa Bộ Lọc (Mục 6.1 #7) */}
            <button
              onClick={handleResetFilters}
              type="button"
              className="px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              title="Đặt lại toàn bộ về mặc định"
            >
              <span className="material-symbols-outlined text-base">filter_alt_off</span>
              Xóa bộ lọc
            </button>

            {/* Nút Xuất Excel (Mở Xem Trước) (Mục 6.1 #8) */}
            <button
              onClick={handleOpenExportPreview}
              disabled={isExportPreviewLoading || totalCount === 0}
              type="button"
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2 ${
                isExportPreviewLoading || totalCount === 0
                  ? 'bg-emerald-300 text-white cursor-not-allowed opacity-70'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer'
              }`}
              title="Xem trước dữ liệu và xuất danh sách ra file Excel"
            >
              {isExportPreviewLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Đang tải xem trước...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">table_view</span>
                  <span>Xuất Excel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── Thanh Công Cụ & Bộ Lọc (Toolbar) ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* 1. Ô tìm kiếm (Mục 6.1 #1) - Rộng ~30% (4/12 cols) */}
            <div className="lg:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <span>Từ khóa tìm kiếm</span>
                <span className="text-slate-400 font-normal">(Mã booking, Tên khách, SĐT)</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  maxLength={100}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Tìm theo mã booking, tên khách, SĐT"
                  className={`w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border ${
                    keywordError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 focus:border-blue-500'
                  } rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all`}
                />
                {keywordInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeywordInput('');
                      setDebouncedKeyword('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Xóa nhanh từ khóa"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
              {keywordError && (
                <p className="text-[13px] text-[#D93025] font-medium mt-1">{keywordError}</p>
              )}
            </div>

            {/* 2. Loại ngày lọc (Mục 6.1 #2) - 2/12 cols */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Loại ngày lọc</label>
              <select
                value={dateFilterType}
                onChange={(e) => {
                  setDateFilterType(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="CHECKIN_DATE">Ngày nhận phòng (Mặc định)</option>
                <option value="BOOKING_DATE">Ngày đặt</option>
                <option value="CHECKOUT_DATE">Ngày trả phòng</option>
              </select>
            </div>

            {/* 3. Khoảng ngày Từ ngày - Đến ngày (Mục 6.1 #3) - 4/12 cols */}
            <div className="lg:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>Khoảng thời gian (dd/mm/yyyy)</span>
                <span className="text-[11px] text-slate-400">Tối đa 366 ngày</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className={`w-full py-2 px-2.5 bg-slate-50 border ${
                    dateError ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                  } rounded-lg text-xs md:text-sm text-slate-900 focus:outline-none`}
                  title="Từ ngày"
                />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className={`w-full py-2 px-2.5 bg-slate-50 border ${
                    dateError ? 'border-red-500' : 'border-slate-300 focus:border-blue-500'
                  } rounded-lg text-xs md:text-sm text-slate-900 focus:outline-none`}
                  title="Đến ngày"
                />
              </div>
              {dateError && (
                <p className="text-[13px] text-[#D93025] font-medium mt-1 leading-snug">{dateError}</p>
              )}
            </div>

            {/* 5. Bộ lọc loại phòng (Mục 6.1 #5) - 2/12 cols */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Loại phòng</label>
              <select
                value={roomTypeId}
                onChange={(e) => {
                  setRoomTypeId(e.target.value);
                  setPage(1);
                }}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:outline-none truncate cursor-pointer"
              >
                <option value="">Tất cả loại phòng</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Bộ lọc trạng thái (Chips đa chọn) (Mục 6.1 #4) & Sắp xếp (Mục 6.1 #6) */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">tune</span>
                Trạng thái:
              </span>
              {ALL_STATUS_KEYS.map((key) => {
                const conf = STATUS_CONFIG[key];
                const isSelected = selectedStatuses.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleStatusChip(key)}
                    style={{
                      borderColor: isSelected ? conf.color : '#E2E8F0',
                      backgroundColor: isSelected ? conf.bg : '#F8FAFC',
                      color: isSelected ? conf.color : '#64748B',
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                      isSelected ? 'shadow-sm ring-1 ring-offset-1' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: conf.color }}
                    ></span>
                    <span>{conf.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[13px] leading-none">check</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 6. Dropdown Sắp xếp theo + Toggle Chiều ▲/▼ (Mục 6.1 #6) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-500">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="CheckInDate">Ngày nhận</option>
                <option value="BookingDate">Ngày đặt</option>
                <option value="CheckOutDate">Ngày trả</option>
                <option value="CustomerName">Tên khách</option>
                <option value="Status">Trạng thái</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                  setPage(1);
                }}
                className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                title={sortOrder === 'ASC' ? 'Đang tăng dần (A→Z). Bấm để giảm dần.' : 'Đang giảm dần (Z→A). Bấm để tăng dần.'}
              >
                <span className="material-symbols-outlined text-base">
                  {sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Bảng Danh Sách Booking (Mục 6.1 #9) ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Bảng: Thông tin số lượng kết quả */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">view_list</span>
              <span>Tìm thấy <strong className="text-blue-700 font-bold">{fmtNumberOnly(totalCount)}</strong> booking</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Trang {page} / {totalPages}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-100/80 text-[13px] font-bold text-slate-700 border-b border-slate-200 select-none">
                  <th className="py-3.5 px-4">Mã booking</th>
                  
                  {/* Cột Tên khách có thể sắp xếp */}
                  <th
                    onClick={() => handleColumnHeaderSort('CustomerName')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                    title="Bấm để sắp xếp theo Tên khách"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tên khách</span>
                      {sortBy === 'CustomerName' && (
                        <span className="material-symbols-outlined text-sm text-blue-600">
                          {sortOrder === 'ASC' ? 'arrow_drop_up' : 'arrow_drop_down'}
                        </span>
                      )}
                    </div>
                  </th>

                  <th className="py-3.5 px-4">SĐT</th>
                  <th className="py-3.5 px-4">Phòng</th>
                  <th className="py-3.5 px-4">Loại phòng</th>

                  {/* Cột Ngày nhận có thể sắp xếp (Mặc định) */}
                  <th
                    onClick={() => handleColumnHeaderSort('CheckInDate')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                    title="Bấm để sắp xếp theo Ngày nhận"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ngày nhận</span>
                      {sortBy === 'CheckInDate' && (
                        <span className="material-symbols-outlined text-sm text-blue-600">
                          {sortOrder === 'ASC' ? 'arrow_drop_up' : 'arrow_drop_down'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Cột Ngày trả có thể sắp xếp */}
                  <th
                    onClick={() => handleColumnHeaderSort('CheckOutDate')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                    title="Bấm để sắp xếp theo Ngày trả"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ngày trả</span>
                      {sortBy === 'CheckOutDate' && (
                        <span className="material-symbols-outlined text-sm text-blue-600">
                          {sortOrder === 'ASC' ? 'arrow_drop_up' : 'arrow_drop_down'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Cột Trạng thái có thể sắp xếp */}
                  <th
                    onClick={() => handleColumnHeaderSort('Status')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors text-center"
                    title="Bấm để sắp xếp theo Trạng thái"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Trạng thái</span>
                      {sortBy === 'Status' && (
                        <span className="material-symbols-outlined text-sm text-blue-600">
                          {sortOrder === 'ASC' ? 'arrow_drop_up' : 'arrow_drop_down'}
                        </span>
                      )}
                    </div>
                  </th>

                  <th className="py-3.5 px-4 text-right">Tổng tiền</th>
                  <th className="py-3.5 px-3 text-center">Bảng kê</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  // Skeleton Loading Rows (Mục 6.3)
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-6 bg-slate-200 rounded-full w-24 mx-auto"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto"></div></td>
                      <td className="py-4 px-3 text-center"><div className="h-7 w-7 bg-slate-200 rounded-lg mx-auto"></div></td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  // Empty State với hình minh họa (Mục 6.3)
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
                          <span className="material-symbols-outlined text-3xl">search_off</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                          Không tìm thấy booking nào phù hợp
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Không có dữ liệu thỏa mãn bộ lọc hiện tại. Vui lòng mở rộng khoảng ngày, chọn thêm trạng thái hoặc bấm "Xóa bộ lọc".
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Đặt lại bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Data Rows (Click vào dòng mở chi tiết booking)
                  bookings.map((b) => {
                    const stConf = STATUS_CONFIG[b.status] || {
                      label: b.statusLabel || b.status,
                      color: '#64748B',
                      bg: '#F1F5F9',
                      border: '#CBD5E1',
                    };

                    return (
                      <tr
                        key={b.bookingId}
                        onClick={() => setSelectedBookingId(b.bookingId)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        {/* Mã booking */}
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 group-hover:underline">
                          {b.bookingCode}
                        </td>

                        {/* Tên khách */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {b.customerName}
                        </td>

                        {/* SĐT */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                          {b.customerPhone || '—'}
                        </td>

                        {/* Phòng (Rút gọn +n nếu > 3 phòng kèm tooltip) (Mục 3.9) */}
                        <td className="py-3.5 px-4 text-slate-700" title={b.roomsTooltip || undefined}>
                          <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-xs font-mono font-semibold">
                            {b.roomsDisplay}
                          </span>
                        </td>

                        {/* Loại phòng */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {b.roomTypes}
                        </td>

                        {/* Ngày nhận */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          {b.checkInDate}
                        </td>

                        {/* Ngày trả */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          {b.checkOutDate}
                        </td>

                        {/* Trạng thái (Badge chuẩn Spec 3.4) */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            style={{
                              color: stConf.color,
                              backgroundColor: stConf.bg,
                              borderColor: stConf.border,
                            }}
                            className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border"
                          >
                            {stConf.label}
                          </span>
                        </td>

                        {/* Tổng tiền (Căn phải, phân cách hàng nghìn) (Mục 3.9) */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {fmtCurrency(b.totalAmount)}
                        </td>

                        {/* Cột Thao tác: Xem Bảng Kê Chi Phí C6 */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChargesModalBookingId(b.bookingId);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-100/60 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            title="Xem bảng kê chi phí lưu trú (Folio)"
                          >
                            <span className="material-symbols-outlined text-lg block">receipt_long</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Phân Trang (Mục 6.1 #10 & Test Cases 25-27) ───────────────────── */}
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">Số dòng mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-center">
              {/* Nút Prev */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Trước
              </button>

              {/* Các nút số trang */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pNum = idx + 1;
                if (totalPages > 5 && page > 3) {
                  pNum = page - 2 + idx;
                  if (pNum > totalPages) pNum = totalPages - 4 + idx;
                }
                if (pNum < 1 || pNum > totalPages) return null;

                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      page === pNum
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              {/* Nút Next */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL XEM TRƯỚC XUẤT EXCEL (Excel Preview Modal) ────────────────── */}
      {showExportPreview && exportPreviewData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowExportPreview(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header Preview Modal: Màu xanh thương hiệu Excel / PMS */}
            <div
              style={{ backgroundColor: '#1E7145' }}
              className="px-6 py-4 flex items-center justify-between text-white flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl">table_view</span>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>Xem Trước Dữ Liệu Xuất Excel (.xlsx)</span>
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Kiểm tra và xác nhận danh sách dữ liệu trước khi tải về máy tính
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExportPreview(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Đóng xem trước"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* 2. Thanh tóm tắt thông tin file & bộ lọc áp dụng */}
            <div className="px-6 py-3.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-sm">description</span>
                  <span>Tên file dự kiến:</span>
                  <strong className="font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {exportPreviewData.filename}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-sm">format_list_numbered</span>
                  <span>Tổng số dòng:</span>
                  <strong className="text-emerald-900 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {fmtNumberOnly(exportPreviewData.total)} / 5.000 dòng
                  </strong>
                </div>
              </div>

              <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 bg-white rounded border border-emerald-200">
                  Lọc theo: <strong>{dateTypeLabel}</strong> ({fmtDisplayDate(dateFrom)} → {fmtDisplayDate(dateTo)})
                </span>
                <span className="px-2 py-0.5 bg-white rounded border border-emerald-200">
                  {exportPreviewData.columns?.length || 9} cột chuẩn Spec 3.12
                </span>
              </div>
            </div>

            {/* 3. Bảng xem trước dữ liệu với đầy đủ 9 cột */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-800 text-sm">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#1F4E78] text-white font-bold select-none shadow-sm z-10">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center border-r border-blue-900">STT</th>
                        <th className="py-3 px-3.5 border-r border-blue-900">Mã booking</th>
                        <th className="py-3 px-3.5 border-r border-blue-900">Tên khách</th>
                        <th className="py-3 px-3 border-r border-blue-900">SĐT</th>
                        <th className="py-3 px-3.5 border-r border-blue-900">Phòng (Đầy đủ)</th>
                        <th className="py-3 px-3.5 border-r border-blue-900">Loại phòng</th>
                        <th className="py-3 px-3 text-center border-r border-blue-900">Ngày nhận</th>
                        <th className="py-3 px-3 text-center border-r border-blue-900">Ngày trả</th>
                        <th className="py-3 px-3.5 text-center border-r border-blue-900">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {exportPreviewData.rows?.map((row, idx) => {
                        const stConf = STATUS_CONFIG[row.statusKey] || {
                          color: '#475569',
                          bg: '#F1F5F9',
                          border: '#CBD5E1',
                        };

                        return (
                          <tr key={idx} className="hover:bg-emerald-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 bg-slate-50/50">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700">
                              {row.bookingCode}
                            </td>
                            <td className="py-2.5 px-3.5 font-medium text-slate-900">
                              {row.customerName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {row.customerPhone}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-800">
                              {row.rooms}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-600">
                              {row.roomType}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                              {row.checkInDate}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                              {row.checkOutDate}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span
                                style={{
                                  color: stConf.color,
                                  backgroundColor: stConf.bg,
                                  borderColor: stConf.border,
                                }}
                                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border"
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              {fmtCurrency(row.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Đang hiển thị toàn bộ <strong>{exportPreviewData.rows?.length || 0}</strong> dòng sẽ được kết xuất vào file.
                </span>
                <span className="italic">
                  * Dữ liệu các phòng được liệt kê đầy đủ, tổng tiền đã định dạng #,##0 theo chuẩn Spec 3.12
                </span>
              </div>
            </div>

            {/* 4. Footer Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-500">
                Bấm "Tải xuống file Excel" để lưu file .xlsx về thiết bị của bạn.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowExportPreview(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold border border-slate-300 transition-all cursor-pointer shadow-sm"
                >
                  Hủy / Đóng
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDownloadExcel}
                  disabled={isDownloadingExcel}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isDownloadingExcel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>Đang xuất file...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">download</span>
                      <span>Tải Xuống File Excel (.xlsx)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Popup Chi Tiết Booking (Mục 6.2) — READ ONLY ────────────────────── */}
      {selectedBookingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedBookingId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header Popup (Nền xanh đậm #1F4E78, Chữ trắng, Mã + Badge) */}
            <div
              style={{ backgroundColor: '#1F4E78' }}
              className="px-6 py-4 flex items-center justify-between text-white flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl">book_online</span>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>Chi tiết booking – {detailData?.bookingCode || `GH-${selectedBookingId}`}</span>
                  </h3>
                  <p className="text-xs text-blue-200">
                    Nguồn đặt: {detailData?.bookingSource || 'DirectWeb'} • Ngày tạo: {fmtDisplayDate(detailData?.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {detailData && (
                  <span
                    style={{
                      color: STATUS_CONFIG[detailData.status]?.color || '#FFFFFF',
                      backgroundColor: STATUS_CONFIG[detailData.status]?.bg || '#FFFFFF20',
                      borderColor: STATUS_CONFIG[detailData.status]?.border || '#FFFFFF40',
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold border"
                  >
                    {STATUS_CONFIG[detailData.status]?.label || detailData.statusLabel || detailData.status}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBookingId(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Đóng popup"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Nội dung 5 Khối theo Mục 6.2 */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
              {isDetailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Đang tải thông tin chi tiết booking...</p>
                </div>
              ) : !detailData ? (
                <div className="py-10 text-center text-slate-500">
                  Không tìm thấy thông tin booking.
                </div>
              ) : (
                <>
                  {/* Khối 1: Thông tin khách hàng (Mục 6.2 #2) */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-600">person</span>
                      Khối 1: Thông Tin Khách Hàng
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <span className="text-xs text-slate-500 block">Họ và tên:</span>
                        <strong className="text-sm font-semibold text-slate-900">
                          {detailData.customer?.fullName || 'Khách Vãng Lai'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Số điện thoại:</span>
                        <strong className="text-sm font-mono text-slate-900">
                          {detailData.customer?.phone || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Email:</span>
                        <span className="text-xs font-mono text-slate-700 truncate block">
                          {detailData.customer?.email || '—'}
                        </span>
                      </div>
                      {detailData.customer?.nationalId && (
                        <div>
                          <span className="text-xs text-slate-500 block">
                            {detailData.customer?.idType || 'CMND/CCCD'}:
                          </span>
                          <strong className="text-sm font-mono text-slate-900">
                            {detailData.customer?.nationalId}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Khối 2: Danh sách phòng đã đặt (Mục 6.2 #3) */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-600">hotel</span>
                      Khối 2: Danh Sách Phòng Đã Đặt
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                            <th className="py-2 px-3">Số phòng</th>
                            <th className="py-2 px-3">Loại phòng</th>
                            <th className="py-2 px-3">Ngày nhận</th>
                            <th className="py-2 px-3">Ngày trả</th>
                            <th className="py-2 px-3 text-right">Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.bookingRooms?.map((rm, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {rm.roomNumber || 'Chưa gán'}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {rm.roomTypeName}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {rm.checkInDate}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {rm.checkOutDate}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right font-semibold text-slate-900">
                                {fmtCurrency(rm.unitPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Khối 3: Thông tin thanh toán (Mục 6.2 #4 & 3.11 Data Masking) */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-600">payments</span>
                      Khối 3: Thông Tin Thanh Toán
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block">Tổng tiền booking:</span>
                        <strong className="text-base font-mono font-bold text-blue-800">
                          {fmtCurrency(detailData.payment?.totalAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Đã cọc / Đã thanh toán:</span>
                        <strong className="text-base font-mono font-bold text-emerald-700">
                          {fmtCurrency(detailData.payment?.depositAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Còn lại phải thu:</span>
                        <strong className="text-base font-mono font-bold text-rose-700">
                          {fmtCurrency(detailData.payment?.remainingAmount)}
                        </strong>
                      </div>
                    </div>

                    {/* Nút Xem Bảng Kê Chi Phí Lưu Trú C6 */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Xem chi tiết các khoản phát sinh:</span>
                      <button
                        type="button"
                        onClick={() => setChargesModalBookingId(selectedBookingId)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                        <span>Xem Bảng Kê Chi Phí Lưu Trú (Folio)</span>
                      </button>
                    </div>

                    {/* Các trường tài chính chi tiết (Giá gốc, Giảm giá, và Phê duyệt chỉ cho Admin) */}
                    {(detailData.payment?.originalPrice > 0 || detailData.payment?.discountApprovedBy) && (
                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {detailData.payment?.originalPrice > 0 && (
                          <div>
                            <span className="text-slate-500 block">Giá gốc:</span>
                            <span className="font-mono line-through text-slate-500">
                              {fmtCurrency(detailData.payment.originalPrice)}
                            </span>
                          </div>
                        )}
                        {detailData.payment?.discountAmount > 0 && (
                          <div>
                            <span className="text-slate-500 block">Giảm giá:</span>
                            <span className="font-mono font-semibold text-rose-600">
                              -{fmtCurrency(detailData.payment.discountAmount)} ({detailData.payment.discountPercent}%)
                            </span>
                          </div>
                        )}

                        {/* DATA MASKING: Chỉ Admin mới thấy Người phê duyệt giảm giá (Mục 3.11) */}
                        {detailData.payment?.discountApprovedBy && (
                          <div>
                            <span className="text-slate-500 block">Người duyệt giảm giá (Admin):</span>
                            <strong className="font-semibold text-slate-800">
                              {detailData.payment.discountApprovedBy}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Khối 4: Ghi chú (Mục 6.2 #5 & 3.11 Data Masking) */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-600">notes</span>
                      Khối 4: Ghi Chú Booking
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      {detailData.notes?.note || 'Không có ghi chú từ khách hàng.'}
                    </p>

                    {/* DATA MASKING: Chỉ Admin mới thấy Ghi chú nội bộ (Mục 3.11) */}
                    {detailData.notes?.internalNotes && (
                      <div className="mt-2 pt-2 border-t border-amber-200 bg-amber-50 p-2.5 rounded-lg border">
                        <span className="text-xs font-bold text-amber-800 block mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">lock</span>
                          Ghi chú nội bộ (Chỉ Quản Trị Viên):
                        </span>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          {detailData.notes.internalNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Khối 5: Lịch sử thay đổi trạng thái (Mục 6.2 #6) */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-blue-600">history</span>
                      Khối 5: Lịch Sử Thay Đổi Trạng Thái
                    </h4>
                    {detailData.statusHistory && detailData.statusHistory.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.statusHistory.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-50 rounded border border-slate-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">{h.oldStatus}</span>
                              <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                              <span className="font-bold text-blue-700">{h.newStatus}</span>
                            </div>
                            <div className="text-slate-500 text-[11px] font-mono">
                              <span>{h.changedAt}</span>
                              <span className="mx-1">•</span>
                              <span className="font-semibold text-slate-700">{h.changedBy}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        Chưa có thay đổi trạng thái
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 7. Footer Button "Đóng" (Nền trắng, viền xám #999999) (Mục 6.2 #7) */}
            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBookingId(null)}
                style={{ borderColor: '#999999' }}
                className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-sm font-semibold border transition-all shadow-sm cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL BẢNG KÊ CHI PHÍ LƯU TRÚ (FEAT-INVOICE-01 / C6) ───────────── */}
      <BookingChargesModal
        bookingId={chargesModalBookingId}
        isOpen={!!chargesModalBookingId}
        onClose={() => setChargesModalBookingId(null)}
      />
    </AdminLayout>
  );
}
