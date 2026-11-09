import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { useAuth } from '../../../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   FEAT-ROOMMAP-01: SƠ ĐỒ PHÒNG LỄ TÂN TRỰC QUAN
   - Tải dữ liệu thực tế từ MySQL Database 1 lần khi vào màn hình.
   - Nếu thành công -> Dừng cập nhật (màn hình đứng yên hoàn toàn, không giật, không rung).
   - Nếu không thành công (mất mạng / lỗi kết nối MySQL) -> Tự động thử lại mỗi 10 giây cho đến khi thành công thì dừng.
   - Nút "Làm Mới" thủ công cho phép lễ tân chủ động tải lại bất cứ lúc nào.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── 8 trạng thái chuẩn theo Spec 13 kèm màu sắc & nhãn Tiếng Việt ─────────
const STATUS_META = {
  AVAILABLE: {
    code: 'AVAILABLE',
    label: 'Trống - sạch',
    color: '#10B981', // emerald-500
    textColor: '#FFFFFF',
    desc: 'Phòng trống, đã vệ sinh sạch sẽ, sẵn sàng đón khách'
  },
  VACANT_CLEAN: {
    code: 'AVAILABLE',
    label: 'Trống - sạch',
    color: '#10B981',
    textColor: '#FFFFFF',
    desc: 'Phòng trống, đã vệ sinh sạch sẽ'
  },
  RESERVED: {
    code: 'RESERVED',
    label: 'Đã đặt',
    color: '#3B82F6', // blue-500
    textColor: '#FFFFFF',
    desc: 'Đã có khách đặt phòng, chờ làm thủ tục nhận phòng'
  },
  OCCUPIED: {
    code: 'OCCUPIED',
    label: 'Đang ở',
    color: '#6366F1', // indigo-500
    textColor: '#FFFFFF',
    desc: 'Khách đang lưu trú trong phòng'
  },
  DIRTY: {
    code: 'DIRTY',
    label: 'Trống - chưa dọn',
    color: '#EF4444', // red-500
    textColor: '#FFFFFF',
    desc: 'Khách vừa trả phòng, phòng trống nhưng chưa được dọn dẹp'
  },
  VACANT_DIRTY: {
    code: 'DIRTY',
    label: 'Trống - chưa dọn',
    color: '#EF4444',
    textColor: '#FFFFFF',
    desc: 'Phòng trống cần dọn dẹp'
  },
  CLEANING: {
    code: 'CLEANING',
    label: 'Đang dọn',
    color: '#F59E0B', // amber-500
    textColor: '#FFFFFF',
    desc: 'Nhân viên Buồng phòng đang xử lý dọn dẹp'
  },
  INSPECTION: {
    code: 'INSPECTION',
    label: 'Chờ kiểm tra',
    color: '#8B5CF6', // purple-500
    textColor: '#FFFFFF',
    desc: 'Đã dọn xong, đang chờ giám sát phòng kiểm tra nghiệm thu'
  },
  OUT_OF_ORDER: {
    code: 'OUT_OF_ORDER',
    label: 'Bảo trì / Khóa phòng',
    color: '#EA4335', // red-600
    textColor: '#FFFFFF',
    desc: 'Phòng đang tạm khóa để bảo trì, sửa chữa kỹ thuật'
  },
  OUT_OF_SERVICE: {
    code: 'OUT_OF_SERVICE',
    label: 'Ngừng sử dụng',
    color: '#9CA3AF', // gray-400
    textColor: '#FFFFFF',
    desc: 'Phòng tạm dừng kinh doanh dài hạn'
  }
};

const ALL_FILTER_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'DIRTY',
  'CLEANING',
  'INSPECTION',
  'OUT_OF_ORDER',
  'OUT_OF_SERVICE'
];

function normalizeStatusKey(st) {
  if (!st) return 'AVAILABLE';
  const u = String(st).toUpperCase();
  if (u === 'VACANT_CLEAN' || u === 'CLEANAVAILABLE') return 'AVAILABLE';
  if (u === 'VACANT_DIRTY' || u === 'DIRTYVACANT') return 'DIRTY';
  if (u === 'DIRTYCLEANING') return 'CLEANING';
  if (u === 'INSPECTED') return 'INSPECTION';
  if (u === 'CLEANOCCUPIED' || u === 'DIRTYOCCUPIED') return 'OCCUPIED';
  return u;
}

// Helper gọi API an toàn
const callApiSafe = async (endpoint, options = {}) => {
  const envUrl = import.meta.env.VITE_API_URL || '';
  const candidates = [
    `${envUrl}${endpoint}`,
    endpoint,
    `http://localhost:5000${endpoint}`
  ];

  let lastError = null;

  for (const url of candidates) {
    if (!url) continue;
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return { ok: res.ok, status: res.status, data: json };
      } catch (_) {
        lastError = 'Máy chủ trả về dữ liệu không hợp lệ';
      }
    } catch (networkErr) {
      lastError = networkErr.message;
    }
  }

  return {
    ok: false,
    status: 0,
    data: { success: false, message: 'Lỗi kết nối máy chủ: ' + (lastError || 'Không thể liên lạc') }
  };
};

export default function RoomAvailability() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleName = user?.roleName || user?.role?.RoleName || (user?.roleId === 1 ? 'Admin' : 'Admin');
  const token = localStorage.getItem('token') || localStorage.getItem('hotel_token') || '';

  const canView = roleName !== 'Kitchen' && ['Admin', 'Receptionist', 'Housekeeping'].includes(roleName);
  const canUpdateStatus = ['Admin', 'Housekeeping'].includes(roleName);
  const canManageBooking = ['Admin', 'Receptionist'].includes(roleName);

  // States
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [floors, setFloors] = useState([1, 2, 3]);
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [statusFilters, setStatusFilters] = useState(ALL_FILTER_STATUSES);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Trạng thái cập nhật: 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  const [syncStatus, setSyncStatus] = useState('LOADING');
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal states
  const [activeModalRoom, setActiveModalRoom] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const retryIntervalRef = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── TẢI DỮ LIỆU SƠ ĐỒ PHÒNG TỪ BACKEND MYSQL ─────────────────────────────
  // Quy tắc: Cập nhật 1 lần. Nếu thành công -> DỪNG. Nếu không thành công -> Thử lại mỗi 10s cho đến khi thành công.
  const loadRoomMap = useCallback(async (branchOverride) => {
    if (!token) return;
    const targetBranch = branchOverride !== undefined ? branchOverride : selectedBranch;
    setSyncStatus((prev) => (prev === 'SUCCESS' ? 'LOADING' : prev));

    try {
      const res = await callApiSafe(`/api/v1/room-map/snapshot?propertyId=${targetBranch}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMessage('Bạn cần đăng nhập để xem sơ đồ phòng.');
        } else if (res.status === 403) {
          setErrorMessage('Bạn không có quyền xem sơ đồ phòng.');
        } else {
          setErrorMessage(res.data?.message || 'Không thể tải dữ liệu sơ đồ phòng từ MySQL. Hệ thống sẽ thử lại sau 10s...');
        }
        setSyncStatus('ERROR');
        setRetryCountdown(10);
        return;
      }

      const payload = res.data;
      const roomData = payload.data || payload.rooms || [];

      if (payload.branches && Array.isArray(payload.branches)) {
        setBranches(payload.branches);
      }

      // Dữ liệu thành công -> Lưu vào state và DỪNG cập nhật
      setRooms(roomData.map((r) => ({
        ...r,
        currentStatus: normalizeStatusKey(r.status || r.currentStatus),
        status: normalizeStatusKey(r.status || r.currentStatus),
        version: r.version || 1
      })));

      const fls = Array.from(new Set(roomData.map((r) => Number(r.floor)).filter((n) => !isNaN(n)))).sort((a, b) => a - b);
      if (fls.length > 0) {
        setFloors(fls);
      }

      setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      setErrorMessage(null);
      setSyncStatus('SUCCESS'); // ĐÃ THÀNH CÔNG -> DỪNG
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Lỗi tải dữ liệu phòng:', err);
      setErrorMessage('Lỗi kết nối cơ sở dữ liệu: ' + err.message);
      setSyncStatus('ERROR');
      setRetryCountdown(10);
    }
  }, [token, selectedBranch]);

  // Khởi chạy nạp dữ liệu lần đầu
  useEffect(() => {
    isMountedRef.current = true;
    loadRoomMap();

    return () => {
      isMountedRef.current = false;
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [loadRoomMap]);

  // Cơ chế đếm ngược 10 giây khi bị lỗi: Nếu không thành công thì 10s tự động thử lại đến khi thành công
  useEffect(() => {
    if (syncStatus !== 'ERROR') {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      return;
    }

    // Đang ở trạng thái ERROR -> Đếm ngược 10s rồi gọi lại
    retryIntervalRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          loadRoomMap();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [syncStatus, loadRoomMap]);

  // ─── BỘ LỌC VÀ TÌM KIẾM ──────────────────────────────────────────────────
  const toggleStatusFilter = (statusCode) => {
    setStatusFilters((prev) =>
      prev.includes(statusCode)
        ? prev.filter((s) => s !== statusCode)
        : [...prev, statusCode]
    );
  };

  const selectAllFilters = () => setStatusFilters(ALL_FILTER_STATUSES);
  const clearAllFilters = () => setStatusFilters([]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedFloor !== 'ALL' && Number(r.floor) !== Number(selectedFloor)) {
        return false;
      }
      const st = normalizeStatusKey(r.currentStatus || r.status);
      if (!statusFilters.includes(st)) {
        return false;
      }
      if (searchQuery.trim()) {
        const kw = searchQuery.trim().toLowerCase();
        const numMatch = String(r.roomNumber || '').toLowerCase().includes(kw);
        const guestMatch = r.booking?.guestName?.toLowerCase().includes(kw) || r.guest?.guestName?.toLowerCase().includes(kw);
        const confMatch = r.booking?.confirmationCode?.toLowerCase().includes(kw) || r.guest?.confirmationCode?.toLowerCase().includes(kw);
        if (!numMatch && !guestMatch && !confMatch) return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, statusFilters, searchQuery]);

  const groupedByFloor = useMemo(() => {
    if (selectedFloor !== 'ALL') {
      const fNum = Number(selectedFloor);
      return [{ floor: fNum, rooms: filteredRooms.filter((r) => Number(r.floor) === fNum) }];
    }
    return floors.map((f) => ({
      floor: f,
      rooms: filteredRooms.filter((r) => Number(r.floor) === f)
    }));
  }, [floors, filteredRooms, selectedFloor]);

  const statusCounts = useMemo(() => {
    const counts = {};
    ALL_FILTER_STATUSES.forEach((k) => {
      counts[k] = rooms.filter((r) => normalizeStatusKey(r.currentStatus || r.status) === k).length;
    });
    return counts;
  }, [rooms]);

  // ─── THAO TÁC ĐỔI TRẠNG THÁI PHÒNG ───────────────────────────────────────
  const executeStatusChange = async (targetStatus, noteValue = '') => {
    if (!activeModalRoom) return;

    if (!canUpdateStatus) {
      showToast('Bạn không có quyền thực hiện chức năng này', 'error');
      return;
    }

    if (targetStatus === 'OUT_OF_ORDER' && (!noteValue || !noteValue.trim())) {
      setNoteError('Vui lòng nhập lý do bảo trì');
      return;
    }

    setIsSubmitting(true);
    setNoteError('');

    const targetRoomId = activeModalRoom.id || activeModalRoom.roomId;
    const currentVer = activeModalRoom.version || 1;

    const result = await callApiSafe(`/api/v1/room-map/rooms/${targetRoomId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        newStatus: targetStatus,
        status: targetStatus,
        currentStatus: activeModalRoom.currentStatus,
        expectedVersion: currentVer,
        note: noteValue.trim(),
        correlationId: `cor_client_${targetRoomId}_${Date.now()}`
      })
    });

    setIsSubmitting(false);

    if (!result.ok) {
      const data = result.data || {};

      if (result.status === 409 || data.code === 'ROOMMAP_0006_VERSION_CONFLICT' || data.code === 'ERROR_0020_CONCURRENT_UPDATE') {
        showToast('Trạng thái phòng đã thay đổi trên máy chủ bởi nhân viên khác. Hệ thống đã làm mới thông tin.', 'error');
        handleCloseModal();
        loadRoomMap();
        return;
      }

      if (data.code === 'ERROR_0019_INVALID_STATUS_TRANSITION') {
        showToast(data.message || 'Bước chuyển trạng thái không hợp lệ theo quy trình', 'error');
        return;
      }

      if (data.code === 'ERROR_0001_REQUIRED') {
        setNoteError('Vui lòng nhập lý do bảo trì');
        return;
      }

      if (result.status === 403 || data.code === 'ERROR_0010_FORBIDDEN') {
        showToast(data.message || 'Bạn không có quyền thực hiện chức năng này', 'error');
        return;
      }

      showToast(data.message || 'Thao tác không thành công', 'error');
      return;
    }

    showToast(result.data.message || 'Cập nhật trạng thái phòng thành công', 'success');

    // Cập nhật trạng thái phòng nhẹ nhàng, tĩnh hoàn toàn
    setRooms((prev) =>
      prev.map((r) =>
        (r.id === targetRoomId || r.roomId === targetRoomId)
          ? { ...r, currentStatus: targetStatus, status: targetStatus, version: currentVer + 1 }
          : r
      )
    );

    handleCloseModal();
  };

  const handleOpenRoomModal = (room) => {
    setActiveModalRoom(room);
    setMaintenanceMode(false);
    setMaintenanceNote('');
    setNoteError('');
  };

  const handleCloseModal = () => {
    setActiveModalRoom(null);
    setMaintenanceMode(false);
    setMaintenanceNote('');
    setNoteError('');
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen text-slate-800 font-sans">
        {/* ── BANNER KHI CÓ LỖI (TỰ ĐỘNG THỬ LẠI MỖI 10S) ────────────────────── */}
        {syncStatus === 'ERROR' && (
          <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-rose-600 text-2xl">
                cloud_off
              </span>
              <div>
                <h4 className="text-sm font-bold text-rose-800">
                  {errorMessage || 'Không thể kết nối tới cơ sở dữ liệu MySQL'}
                </h4>
                <p className="text-xs text-rose-600">
                  Hệ thống đang tự động thử lại sau <span className="font-bold">{retryCountdown}s</span> cho đến khi thành công...
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadRoomMap()}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại ngay
            </button>
          </div>
        )}

        {/* ── 1. HEADER & CHỈ BÁO TRẠNG THÁI ──────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1F4E78] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                SƠ ĐỒ PHÒNG LỄ TÂN
              </span>

              {syncStatus === 'SUCCESS' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Đã tải dữ liệu thành công
                </span>
              )}
              {syncStatus === 'LOADING' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Đang tải dữ liệu...
                </span>
              )}
              {syncStatus === 'ERROR' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Lỗi kết nối (Thử lại sau {retryCountdown}s)
                </span>
              )}

              {lastSyncTime && (
                <span className="text-[11px] text-slate-400 font-mono">
                  • Lần đồng bộ: {lastSyncTime}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sơ Đồ Phòng Trực Quan Lễ Tân
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật 1 lần thành công • Màn hình ổn định, không giật rung • Dữ liệu thực tế MySQL
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bộ chọn Chi nhánh (Khách sạn) thực tế từ MySQL */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="material-symbols-outlined text-slate-500 text-sm pl-1">domain</span>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBranch(val);
                  loadRoomMap(val);
                }}
                className="bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#1F4E78] cursor-pointer"
              >
                <option value="ALL">🏢 Tất cả chi nhánh ({branches.reduce((acc, b) => acc + (Number(b.RoomCount) || 0), 0) || 1022} phòng)</option>
                {branches.map((b) => (
                  <option key={b.BranchId} value={b.BranchId}>
                    📍 #{b.BranchId} - {b.BranchName} ({b.RoomCount} phòng)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => loadRoomMap()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Làm Mới
            </button>
            <div className="hidden sm:flex flex-col text-right text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Tổng số: {rooms.length} phòng</span>
              <span>Đang hiển thị: {filteredRooms.length} phòng</span>
            </div>
          </div>
        </div>

        {/* ── 2. BẢNG MÃ MÀU TRẠNG THÁI CHUẨN ─────────────────────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            CHÚ THÍCH TRẠNG THÁI PHÒNG
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {ALL_FILTER_STATUSES.map((key) => {
              const meta = STATUS_META[key] || STATUS_META.AVAILABLE;
              const count = statusCounts[key] || 0;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/80 border border-slate-200/50"
                  title={meta.desc}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {meta.label}
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-slate-500">
                      {count} phòng
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3. BỘ LỌC TRẠNG THÁI & TÌM KIẾM ────────────────────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  LỌC THEO TRẠNG THÁI:
                </span>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFilters}
                    className="text-[#1F4E78] hover:underline font-semibold cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-slate-500 hover:underline font-semibold cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {ALL_FILTER_STATUSES.map((key) => {
                  const meta = STATUS_META[key] || STATUS_META.AVAILABLE;
                  const isChecked = statusFilters.includes(key);
                  return (
                    <label
                      key={key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
                          : 'bg-white border-dashed border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatusFilter(key)}
                        className="rounded text-[#1F4E78] focus:ring-[#1F4E78] cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="font-semibold">{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="w-full lg:w-72">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                TÌM KIẾM NHANH:
              </span>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Số phòng, tên khách, mã đặt phòng..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F4E78] focus:ring-1 focus:ring-[#1F4E78] transition-all bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. THANH TAB TẦNG ──────────────────────────────────────────────── */}
        <div className="border-b border-slate-200 mb-6 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedFloor('ALL')}
            className={`pb-3 px-4 text-sm font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              selectedFloor === 'ALL'
                ? 'text-[#1F4E78] font-bold border-b-[3px] border-[#1F4E78]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Tất cả các tầng</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                selectedFloor === 'ALL'
                  ? 'bg-blue-100 text-[#1F4E78]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {rooms.length}
            </span>
          </button>

          {floors.map((fl) => {
            const countOnFloor = rooms.filter((r) => Number(r.floor) === fl).length;
            const isSelected = selectedFloor === String(fl) || selectedFloor === fl;
            return (
              <button
                key={fl}
                type="button"
                onClick={() => setSelectedFloor(String(fl))}
                className={`pb-3 px-4 text-sm font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'text-[#1F4E78] font-bold border-b-[3px] border-[#1F4E78]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Tầng {fl}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-blue-100 text-[#1F4E78]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {countOnFloor}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 5. LƯỚI Ô PHÒNG THEO TẦNG ───────────────────────────────────────── */}
        {syncStatus === 'LOADING' && rooms.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#1F4E78] animate-spin mb-3">
              progress_activity
            </span>
            <p className="text-sm font-semibold text-slate-600">
              Đang tải sơ đồ phòng thực tế từ cơ sở dữ liệu MySQL...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByFloor.map(({ floor: flNumber, rooms: flRooms }) => (
              <section key={flNumber} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1F4E78] font-black text-sm flex items-center justify-center">
                    T{flNumber}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                      TẦNG {flNumber}
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">
                      {flRooms.length} phòng đang hiển thị
                    </span>
                  </div>
                </div>

                {flRooms.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm font-medium">
                    Chưa có phòng nào ở tầng này phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
                    {flRooms.map((r) => {
                      const roomId = r.id || r.roomId;
                      const st = normalizeStatusKey(r.currentStatus || r.status);
                      const meta = STATUS_META[st] || STATUS_META.AVAILABLE;
                      const isOOO = st === 'OUT_OF_ORDER';
                      const isOverdue = r.isOverdue && st === 'OCCUPIED';

                      return (
                        <button
                          key={roomId}
                          type="button"
                          onClick={() => handleOpenRoomModal(r)}
                          style={{
                            backgroundColor: meta.color,
                            color: meta.textColor
                          }}
                          className="relative rounded-xl p-3 flex flex-col justify-between items-center text-center aspect-square shadow-xs cursor-pointer overflow-hidden border border-black/5 hover:shadow-md transition-shadow duration-150"
                        >
                          {/* Biểu tượng trạng thái đặc biệt */}
                          <div className="w-full flex justify-between items-start text-xs">
                            {isOOO ? (
                              <span
                                className="material-symbols-outlined text-[17px] opacity-95 bg-black/20 p-1 rounded-full"
                                title="Khóa bảo trì kỹ thuật"
                              >
                                build
                              </span>
                            ) : <span />}

                            {isOverdue && (
                              <span
                                className="material-symbols-outlined text-[17px] text-rose-100 bg-rose-900/60 p-1 rounded-full"
                                title="Quá hạn trả phòng"
                              >
                                timer_off
                              </span>
                            )}
                          </div>

                          {/* Số phòng lớn ở giữa */}
                          <div className="my-auto">
                            <span className="block font-mono font-extrabold text-2xl tracking-tight leading-none drop-shadow-xs">
                              {r.roomNumber}
                            </span>
                            <span className="block text-[11px] font-semibold mt-1 opacity-90 truncate max-w-[120px]">
                              {meta.label}
                            </span>
                          </div>

                          {/* Tên khách hoặc loại phòng */}
                          <div className="w-full text-[10.5px] font-medium opacity-85 truncate">
                            {(r.booking?.guestName || r.guest?.guestName) ? (
                              <span className="truncate block font-semibold">
                                👤 {r.booking?.guestName || r.guest?.guestName}
                              </span>
                            ) : (
                              <span className="truncate block">{r.typeName || r.roomTypeName || 'Tiêu chuẩn'}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* ── 6. POPUP CHI TIẾT & THAO TÁC NHANH ──────────────────────────────── */}
        {activeModalRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              <div
                style={{
                  backgroundColor: STATUS_META[normalizeStatusKey(activeModalRoom.currentStatus || activeModalRoom.status)]?.color || '#1F4E78',
                  color: STATUS_META[normalizeStatusKey(activeModalRoom.currentStatus || activeModalRoom.status)]?.textColor || '#FFFFFF'
                }}
                className="p-5 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-bold">
                    Phòng {activeModalRoom.roomNumber} — {activeModalRoom.typeName || activeModalRoom.roomTypeName || 'Tiêu Chuẩn'}
                  </h3>
                  <div className="text-xs opacity-90">
                    Tầng {activeModalRoom.floor} • Phiên bản #{activeModalRoom.version || 1}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-5 space-y-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Trạng thái hiện tại:</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_META[normalizeStatusKey(activeModalRoom.currentStatus || activeModalRoom.status)]?.color }}
                    />
                    {STATUS_META[normalizeStatusKey(activeModalRoom.currentStatus || activeModalRoom.status)]?.label}
                  </span>
                </div>

                {(normalizeStatusKey(activeModalRoom.currentStatus) === 'RESERVED' || normalizeStatusKey(activeModalRoom.currentStatus) === 'OCCUPIED') && (
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-1.5">
                    <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      THÔNG TIN KHÁCH LƯU TRÚ
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      Khách lưu trú: {activeModalRoom.booking?.guestName || activeModalRoom.guest?.guestName || 'Khách Vãng Lai'}
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between">
                      <span>Ngày nhận: {activeModalRoom.booking?.checkIn || activeModalRoom.guest?.checkIn || 'Hôm nay'}</span>
                      <span>Ngày trả: {activeModalRoom.booking?.checkOut || activeModalRoom.guest?.checkOut || 'Ngày mai'}</span>
                    </div>
                    {(activeModalRoom.booking?.confirmationCode || activeModalRoom.guest?.confirmationCode) && (
                      <div className="text-xs font-mono text-blue-800">
                        Mã xác nhận: #{activeModalRoom.booking?.confirmationCode || activeModalRoom.guest?.confirmationCode}
                      </div>
                    )}
                  </div>
                )}

                {maintenanceMode && (
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-2">
                    <label className="block text-xs font-bold text-amber-900 uppercase">
                      Lý do bảo trì <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={maintenanceNote}
                      onChange={(e) => {
                        setMaintenanceNote(e.target.value);
                        if (e.target.value.trim()) setNoteError('');
                      }}
                      placeholder="Nhập chi tiết sự cố kỹ thuật hoặc lý do bảo trì..."
                      className="w-full p-2.5 text-xs rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                    {noteError && (
                      <div className="text-[13px] text-rose-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {noteError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Đóng
                </button>

                {maintenanceMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMaintenanceMode(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => executeStatusChange('OUT_OF_ORDER', maintenanceNote)}
                      disabled={isSubmitting}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Xác nhận Khóa Bảo Trì'}
                    </button>
                  </>
                ) : (
                  <>
                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'DIRTY' && (
                      <>
                        {canUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => setMaintenanceMode(true)}
                            disabled={isSubmitting}
                            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            Đánh dấu bảo trì
                          </button>
                        )}
                        {canUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => executeStatusChange('CLEANING')}
                            disabled={isSubmitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {isSubmitting ? 'Đang lưu...' : 'Bắt đầu dọn'}
                          </button>
                        )}
                      </>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'CLEANING' && canUpdateStatus && (
                      <>
                        <button
                          type="button"
                          onClick={() => executeStatusChange('INSPECTION')}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all cursor-pointer"
                        >
                          Chờ kiểm tra
                        </button>
                        <button
                          type="button"
                          onClick={() => executeStatusChange('AVAILABLE')}
                          disabled={isSubmitting}
                          className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isSubmitting ? 'Đang lưu...' : 'Hoàn tất dọn'}
                        </button>
                      </>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'INSPECTION' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => executeStatusChange('AVAILABLE')}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Nghiệm thu Đạt'}
                      </button>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'AVAILABLE' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => setMaintenanceMode(true)}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        Đánh dấu bảo trì
                      </button>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'OUT_OF_ORDER' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => executeStatusChange('DIRTY')}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Gỡ bảo trì'}
                      </button>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'RESERVED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseModal();
                          navigate(`/admin/le-tan?roomId=${activeModalRoom.id || activeModalRoom.roomId}`);
                        }}
                        disabled={!canManageBooking}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                          canManageBooking
                            ? 'bg-[#1F4E78] text-white hover:brightness-110 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Nhận Phòng (Check-in)
                      </button>
                    )}

                    {normalizeStatusKey(activeModalRoom.currentStatus) === 'OCCUPIED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseModal();
                          navigate(`/admin/check-out/${activeModalRoom.id || activeModalRoom.roomId}`);
                        }}
                        disabled={!canManageBooking}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                          canManageBooking
                            ? 'bg-[#1F4E78] text-white hover:brightness-110 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Trả Phòng (Check-out)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 7. TOAST THÔNG BÁO ──────────────────────────────────────────────── */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-4 duration-200 max-w-sm ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
