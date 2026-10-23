import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { useAuth } from '../../../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   FEAT-ROOMMAP-01: SƠ ĐỒ PHÒNG TRỰC QUAN (VISUAL ROOM STATUS BOARD)
   Theo đúng tài liệu đặc tả Spec_4.SoDoPhongTrucQuan.docx
   100% Giao diện & Thông báo Tiếng Việt
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── 3.3 Bảng mã màu 6 trạng thái chuẩn (BẮT BUỘC ĐÚNG TUYỆT ĐỐI) ───────────
const STATUS_META = {
  VACANT_CLEAN: {
    code: 'VACANT_CLEAN',
    label: 'Trống - sạch',
    color: '#34A853',
    textColor: '#FFFFFF',
    desc: 'Phòng trống, đã vệ sinh sạch sẽ, sẵn sàng đón khách nhận phòng ngay'
  },
  VACANT_DIRTY: {
    code: 'VACANT_DIRTY',
    label: 'Trống - chưa dọn',
    color: '#FBBC04',
    textColor: '#1E293B',
    desc: 'Khách vừa trả phòng, phòng trống nhưng chưa được dọn dẹp'
  },
  CLEANING: {
    code: 'CLEANING',
    label: 'Đang dọn',
    color: '#F59E0B',
    textColor: '#FFFFFF',
    desc: 'Nhân viên Buồng phòng đang xử lý dọn dẹp vệ sinh'
  },
  RESERVED: {
    code: 'RESERVED',
    label: 'Đã đặt',
    color: '#8B5CF6',
    textColor: '#FFFFFF',
    desc: 'Đã có khách đặt phòng hôm nay, đang chờ làm thủ tục nhận phòng'
  },
  OCCUPIED: {
    code: 'OCCUPIED',
    label: 'Đang ở',
    color: '#1A73E8',
    textColor: '#FFFFFF',
    desc: 'Khách đang lưu trú trong phòng'
  },
  OUT_OF_ORDER: {
    code: 'OUT_OF_ORDER',
    label: 'Bảo trì / Khóa phòng',
    color: '#EA4335',
    textColor: '#FFFFFF',
    desc: 'Phòng đang tạm khóa để bảo trì, sửa chữa kỹ thuật'
  }
};

const ALL_STATUS_KEYS = [
  'VACANT_CLEAN',
  'VACANT_DIRTY',
  'CLEANING',
  'RESERVED',
  'OCCUPIED',
  'OUT_OF_ORDER'
];

// Dữ liệu mẫu tiếng Việt ban đầu
const INITIAL_MOCK_ROOMS = [
  { id: 101, roomNumber: '101', floor: 1, typeName: 'Phòng Deluxe King Hướng Biển', currentStatus: 'VACANT_CLEAN', isOverdue: false },
  { id: 102, roomNumber: '102', floor: 1, typeName: 'Phòng Deluxe Twin Ban Công', currentStatus: 'VACANT_DIRTY', isOverdue: false },
  { id: 103, roomNumber: '103', floor: 1, typeName: 'Phòng Suite Cao Cấp', currentStatus: 'CLEANING', isOverdue: false },
  { id: 104, roomNumber: '104', floor: 1, typeName: 'Phòng Suite Cao Cấp', currentStatus: 'RESERVED', isOverdue: false, booking: { guestName: 'Nguyễn Văn An', checkIn: '2026-10-23', checkOut: '2026-10-25', confirmationCode: 'DP-1040' } },
  { id: 105, roomNumber: '105', floor: 1, typeName: 'Phòng Suite Thương Gia', currentStatus: 'OCCUPIED', isOverdue: true, booking: { guestName: 'Trần Hoàng Nam', checkIn: '2026-10-20', checkOut: '2026-10-23', confirmationCode: 'DP-1051' } },
  { id: 106, roomNumber: '106', floor: 1, typeName: 'Phòng Deluxe King Hướng Biển', currentStatus: 'OUT_OF_ORDER', isOverdue: false },
  { id: 107, roomNumber: '107', floor: 1, typeName: 'Phòng Deluxe King Hướng Biển', currentStatus: 'VACANT_CLEAN', isOverdue: false },
  { id: 108, roomNumber: '108', floor: 1, typeName: 'Phòng Gia Đình Tiêu Chuẩn', currentStatus: 'OCCUPIED', isOverdue: false, booking: { guestName: 'Trịnh Bảo Long', checkIn: '2026-10-22', checkOut: '2026-10-26', confirmationCode: 'DP-1082' } },
  { id: 201, roomNumber: '201', floor: 2, typeName: 'Phòng Deluxe King Hướng Biển', currentStatus: 'VACANT_CLEAN', isOverdue: false },
  { id: 202, roomNumber: '202', floor: 2, typeName: 'Phòng Deluxe Twin Ban Công', currentStatus: 'VACANT_DIRTY', isOverdue: false },
  { id: 203, roomNumber: '203', floor: 2, typeName: 'Phòng Suite Cao Cấp', currentStatus: 'CLEANING', isOverdue: false },
  { id: 204, roomNumber: '204', floor: 2, typeName: 'Phòng Suite Thương Gia', currentStatus: 'OCCUPIED', isOverdue: false, booking: { guestName: 'Lê Quốc Huy', checkIn: '2026-10-21', checkOut: '2026-10-24', confirmationCode: 'DP-2041' } },
  { id: 205, roomNumber: '205', floor: 2, typeName: 'Phòng Suite Thương Gia', currentStatus: 'RESERVED', isOverdue: false, booking: { guestName: 'Đặng Thùy Dung', checkIn: '2026-10-23', checkOut: '2026-10-26', confirmationCode: 'DP-2055' } },
  { id: 206, roomNumber: '206', floor: 2, typeName: 'Phòng Gia Đình Tiêu Chuẩn', currentStatus: 'VACANT_CLEAN', isOverdue: false },
  { id: 301, roomNumber: '301', floor: 3, typeName: 'Biệt Thự Sky Villa Nghỉ Dưỡng', currentStatus: 'OCCUPIED', isOverdue: false, booking: { guestName: 'Võ Minh Tuấn', checkIn: '2026-10-22', checkOut: '2026-10-25', confirmationCode: 'DP-3010' } },
  { id: 302, roomNumber: '302', floor: 3, typeName: 'Biệt Thự Sky Villa Nghỉ Dưỡng', currentStatus: 'VACANT_CLEAN', isOverdue: false },
];

// Helper gọi API an toàn, chống triệt để lỗi Unexpected token '<' do HTML response
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

      // Kiểm tra có phải JSON hợp lệ không
      try {
        const json = JSON.parse(text);
        return { ok: res.ok, status: res.status, data: json };
      } catch (parseErr) {
        // Phản hồi HTML (404/500 proxy), tiếp tục thử endpoint kế tiếp
        lastError = 'Máy chủ trả về phản hồi không hợp lệ';
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

  // Xác định vai trò & quyền hạn theo Mục 3.1
  const roleName = user?.roleName || user?.role?.RoleName || (user?.roleId === 1 ? 'Admin' : 'Admin');
  const token = localStorage.getItem('token') || localStorage.getItem('hotel_token') || '';

  // Quyền:
  // ROOMMAP_VIEW: Admin, Receptionist, Housekeeping. Bếp (Kitchen) bị cấm (Mục 3.1 & Test Case 1)
  const canView = roleName !== 'Kitchen' && ['Admin', 'Receptionist', 'Housekeeping'].includes(roleName);
  // ROOMMAP_UPDATE_STATUS: Admin và Dọn phòng (Mục 3.1)
  const canUpdateStatus = ['Admin', 'Housekeeping'].includes(roleName);
  // BOOKING_MANAGE: Admin và Lễ tân (Mục 3.1)
  const canManageBooking = ['Admin', 'Receptionist'].includes(roleName);

  // States
  const [rooms, setRooms] = useState(INITIAL_MOCK_ROOMS);
  const [floors, setFloors] = useState([1, 2, 3]);
  const [selectedFloor, setSelectedFloor] = useState('ALL'); // 'ALL' hoặc số tầng
  const [statusFilters, setStatusFilters] = useState(ALL_STATUS_KEYS); // Mặc định chọn tất cả 6 trạng thái
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [toast, setToast] = useState(null);

  // Popup Modal states (Mục 6.2)
  const [activeModalRoom, setActiveModalRoom] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper hiển thị thông báo Toast
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Tải dữ liệu từ Backend API ───────────────────────────────────────────
  const fetchRoomMap = useCallback(async () => {
    if (!token) return;

    const result = await callApiSafe('/api/v1/room-map', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!result.ok) {
      if (result.status === 401) {
        showToast(result.data.message || 'Bạn cần đăng nhập để thực hiện chức năng này', 'error');
      } else if (result.status === 403) {
        showToast(result.data.message || 'Bạn không có quyền thực hiện chức năng này', 'error');
      }
      return;
    }

    if (result.data.rooms && Array.isArray(result.data.rooms)) {
      setRooms(result.data.rooms);
    }
    if (result.data.floors && Array.isArray(result.data.floors) && result.data.floors.length > 0) {
      setFloors(result.data.floors);
    }
  }, [token, showToast]);

  const fetchRef = useRef(fetchRoomMap);
  useEffect(() => {
    fetchRef.current = fetchRoomMap;
  }, [fetchRoomMap]);

  // Khởi động load ban đầu
  useEffect(() => {
    if (canView) {
      fetchRoomMap();
    }
  }, [canView, fetchRoomMap]);

  // ─── Đồng bộ thời gian thực Real-time (SSE & Polling Fallback 30s) ────────
  useEffect(() => {
    if (!canView) return;

    let eventSource = null;
    let fallbackTimer = null;

    try {
      const sseUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/v1/room-map/stream`
        : '/api/v1/room-map/stream';

      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsLive(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ROOM_STATUS_CHANGED' && payload.data) {
            const { roomId, newStatus } = payload.data;
            setRooms((prev) =>
              prev.map((r) =>
                r.id === roomId
                  ? { ...r, currentStatus: newStatus, updatedAt: payload.data.updatedAt || new Date().toISOString() }
                  : r
              )
            );
          }
        } catch (_) {}
      };

      eventSource.onerror = () => {
        setIsLive(false);
      };
    } catch (_) {
      setIsLive(false);
    }

    // Polling fallback đếm ngược 30s (Mục 3.6 & Test Case 9)
    fallbackTimer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchRef.current();
          return 30;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [canView]);

  // ─── Bộ lọc theo tầng và trạng thái ──────────────────────────────────────
  const toggleStatusFilter = (statusCode) => {
    setStatusFilters((prev) =>
      prev.includes(statusCode)
        ? prev.filter((s) => s !== statusCode)
        : [...prev, statusCode]
    );
  };

  const selectAllFilters = () => setStatusFilters(ALL_STATUS_KEYS);
  const clearAllFilters = () => setStatusFilters([]);

  // Lọc danh sách phòng theo tầng, bộ lọc trạng thái và ô tìm kiếm
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedFloor !== 'ALL' && r.floor !== Number(selectedFloor)) {
        return false;
      }
      if (!statusFilters.includes(r.currentStatus)) {
        return false;
      }
      if (searchQuery.trim()) {
        const kw = searchQuery.trim().toLowerCase();
        const numMatch = r.roomNumber.toLowerCase().includes(kw);
        const guestMatch = r.booking?.guestName?.toLowerCase().includes(kw);
        const confMatch = r.booking?.confirmationCode?.toLowerCase().includes(kw);
        if (!numMatch && !guestMatch && !confMatch) return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, statusFilters, searchQuery]);

  // Nhóm phòng theo từng tầng cho chế độ xem "Tất cả" (Mục 3.2 & 6.1 STT 1)
  const groupedByFloor = useMemo(() => {
    if (selectedFloor !== 'ALL') {
      const fNum = Number(selectedFloor);
      return [{ floor: fNum, rooms: filteredRooms.filter((r) => r.floor === fNum) }];
    }
    return floors.map((f) => ({
      floor: f,
      rooms: filteredRooms.filter((r) => r.floor === f)
    }));
  }, [floors, filteredRooms, selectedFloor]);

  // Thống kê số lượng phòng theo từng trạng thái
  const statusCounts = useMemo(() => {
    const counts = {};
    ALL_STATUS_KEYS.forEach((k) => {
      counts[k] = rooms.filter((r) => r.currentStatus === k).length;
    });
    return counts;
  }, [rooms]);

  // Mở popup chi tiết phòng
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

  // ─── Thao tác đổi trạng thái phòng (Mục 3.4 & 4.2 & 4.3 & 5.2) ───────────
  const executeStatusChange = async (targetStatus, noteValue = '') => {
    if (!activeModalRoom) return;

    // Kiểm tra quyền (Mục 3.1)
    if (!canUpdateStatus) {
      showToast('Bạn không có quyền thực hiện chức năng này', 'error');
      return;
    }

    // Nếu chuyển sang OUT_OF_ORDER: bắt buộc nhập note (Mục 3.4 & 5.2 Test Case 5)
    if (targetStatus === 'OUT_OF_ORDER' && (!noteValue || !noteValue.trim())) {
      setNoteError('Vui lòng nhập lý do bảo trì');
      return;
    }

    setIsSubmitting(true);
    setNoteError('');

    const result = await callApiSafe(`/api/v1/room-map/rooms/${activeModalRoom.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        newStatus: targetStatus,
        currentStatus: activeModalRoom.currentStatus, // Phục vụ optimistic locking (Mục 3.7)
        note: noteValue.trim()
      })
    });

    setIsSubmitting(false);

    if (!result.ok) {
      const data = result.data;

      // Lỗi 409 Concurrent Update (Test Case 7)
      if (result.status === 409 || data.code === 'ERROR_0020_CONCURRENT_UPDATE') {
        showToast(data.message || 'Trạng thái phòng vừa được cập nhật bởi người khác, vui lòng tải lại', 'error');
        handleCloseModal();
        fetchRoomMap();
        return;
      }

      // Lỗi 400 Invalid Status Transition (Test Case 4)
      if (data.code === 'ERROR_0019_INVALID_STATUS_TRANSITION') {
        showToast(data.message || 'Bước chuyển trạng thái không hợp lệ', 'error');
        return;
      }

      // Lỗi 400 Required Note (Test Case 5)
      if (data.code === 'ERROR_0001_REQUIRED') {
        setNoteError('Vui lòng nhập lý do bảo trì');
        return;
      }

      // Lỗi phân quyền 403
      if (result.status === 403 || data.code === 'ERROR_0010_FORBIDDEN') {
        showToast(data.message || 'Bạn không có quyền thực hiện chức năng này', 'error');
        return;
      }

      showToast(data.message || 'Thao tác không thành công', 'error');
      return;
    }

    // Thành công (Mục 5.2: SUCCESS_0002_UPDATED)
    showToast(result.data.message || 'Cập nhật trạng thái phòng thành công', 'success');

    // Cập nhật state cục bộ
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeModalRoom.id ? { ...r, currentStatus: targetStatus } : r
      )
    );

    handleCloseModal();
    fetchRoomMap();
  };

  // ─── Kiểm tra phân quyền truy cập URL màn hình (Test Case 1 & 2) ───────────
  if (!token) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa xác thực danh tính</h2>
          <p className="text-slate-600 mb-6 max-w-md">
            Bạn cần đăng nhập để thực hiện chức năng này (ERROR_0009_UNAUTHENTICATED)
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg bg-[#1F4E78] text-white font-semibold hover:brightness-110 transition-all cursor-pointer"
          >
            Đến trang Đăng Nhập
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!canView) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">block</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Truy Cập Bị Từ Chối (403)</h2>
          <p className="text-slate-600 mb-6 max-w-md">
            Bạn không có quyền thực hiện chức năng này (ERROR_0010_FORBIDDEN)
          </p>
          <button
            onClick={() => navigate('/admin/ban-lam-viec')}
            className="px-6 py-2.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-all cursor-pointer"
          >
            Quay lại Bàn Làm Việc
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 bg-[#F8FAFC] min-h-screen text-slate-800 font-sans">
        {/* ── 1. HEADER & CHỈ BÁO THỜI GIAN THỰC (Mục 6.1 STT 5) ──────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1F4E78] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                MÃ TÍNH NĂNG: FEAT-ROOMMAP-01
              </span>
              {/* Chỉ báo Realtime (Mục 6.1 STT 5 & Test Case 9) */}
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang cập nhật trực tiếp
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <span className="material-symbols-outlined text-sm text-amber-600">warning</span>
                  Mất kết nối thời gian thực (Tự làm mới sau {countdown}s)
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sơ Đồ Phòng Trực Quan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sơ đồ trạng thái phòng trực quan • Đồng bộ thời gian thực theo từng tầng
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRoomMap()}
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

        {/* ── 2. CHÚ THÍCH TRẠNG THÁI (BẢNG MÀU - Mục 6.1 STT 4) ─────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            CHÚ THÍCH TRẠNG THÁI (BẢNG MÀU CHUẨN)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {ALL_STATUS_KEYS.map((key) => {
              const meta = STATUS_META[key];
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

        {/* ── 3. BỘ LỌC TRẠNG THÁI & TÌM KIẾM (Mục 6.1 STT 2) ────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Nhóm Checkbox 6 trạng thái kèm chấm màu */}
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
                {ALL_STATUS_KEYS.map((key) => {
                  const meta = STATUS_META[key];
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

            {/* Ô tìm kiếm số phòng, tên khách */}
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

        {/* ── 4. THANH TAB TẦNG (Mục 6.1 STT 1: Gạch chân màu #1F4E78) ──────── */}
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
            const countOnFloor = rooms.filter((r) => r.floor === fl).length;
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

        {/* ── 5. LƯỚI Ô PHÒNG (Mục 6.1 STT 3 & 6.3: Responsive Grid) ─────────── */}
        <div className="space-y-8">
          {groupedByFloor.map(({ floor: flNumber, rooms: flRooms }) => (
            <section key={flNumber} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              {/* Nhãn tên tầng & đường phân cách giữa các nhóm phòng (Mục 3.2 & 6.1 STT 1) */}
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

              {/* Tầng không có phòng nào: hiển thị thông báo theo Mục 3.2 */}
              {flRooms.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm font-medium">
                  Chưa có phòng nào ở tầng này phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
                  {flRooms.map((r) => {
                    const meta = STATUS_META[r.currentStatus] || STATUS_META.VACANT_CLEAN;
                    const isOOO = r.currentStatus === 'OUT_OF_ORDER';
                    const isOverdue = r.isOverdue && r.currentStatus === 'OCCUPIED';

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleOpenRoomModal(r)}
                        style={{
                          backgroundColor: meta.color,
                          color: meta.textColor
                        }}
                        className={`relative rounded-xl p-3 flex flex-col justify-between items-center text-center aspect-square shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer overflow-hidden ${
                          isOverdue
                            ? 'ring-4 ring-rose-500 ring-offset-2 animate-pulse'
                            : ''
                        }`}
                      >
                        {/* Biểu tượng góc trên: Cờ lê (OUT_OF_ORDER) hoặc Cảnh báo Quá hạn (Mục 6.3 & 3.3) */}
                        <div className="w-full flex justify-between items-start text-xs">
                          {isOOO ? (
                            <span
                              className="material-symbols-outlined text-[17px] opacity-95 bg-black/20 p-1 rounded-full"
                              title="Khóa bảo trì kỹ thuật (OOO)"
                            >
                              build
                            </span>
                          ) : <span />}

                          {isOverdue && (
                            <span
                              className="material-symbols-outlined text-[17px] text-rose-100 bg-rose-900/60 p-1 rounded-full animate-bounce"
                              title="Quá hạn trả phòng (Overdue checkout)"
                            >
                              timer_off
                            </span>
                          )}
                        </div>

                        {/* Số phòng lớn ở giữa (Mục 6.1 STT 3) */}
                        <div className="my-auto">
                          <span className="block font-mono font-extrabold text-2xl tracking-tight leading-none drop-shadow-xs">
                            {r.roomNumber}
                          </span>
                          <span className="block text-[11px] font-semibold mt-1 opacity-90 truncate max-w-[120px]">
                            {meta.label}
                          </span>
                        </div>

                        {/* Tên khách hoặc hạng phòng ở chân ô */}
                        <div className="w-full text-[10.5px] font-medium opacity-85 truncate">
                          {r.booking?.guestName ? (
                            <span className="truncate block font-semibold">
                              👤 {r.booking.guestName}
                            </span>
                          ) : (
                            <span className="truncate block">{r.typeName}</span>
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

        {/* ── 6. POPUP CHI TIẾT & THAO TÁC NHANH (Mục 6.2) ─────────────────── */}
        {activeModalRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              {/* Header (Mục 6.2 STT 1: Nền màu theo trạng thái hiện tại) */}
              <div
                style={{
                  backgroundColor: STATUS_META[activeModalRoom.currentStatus]?.color || '#1F4E78',
                  color: STATUS_META[activeModalRoom.currentStatus]?.textColor || '#FFFFFF'
                }}
                className="p-5 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-bold">
                    Phòng {activeModalRoom.roomNumber} — {activeModalRoom.typeName}
                  </h3>
                  <div className="text-xs opacity-90">
                    Tầng {activeModalRoom.floor} • Mã số #{activeModalRoom.id}
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

              {/* Nội dung Popup */}
              <div className="p-5 space-y-4 text-sm text-slate-700">
                {/* 2. Badge trạng thái (Mục 6.2 STT 2) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Trạng thái hiện tại:</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_META[activeModalRoom.currentStatus]?.color }}
                    />
                    {STATUS_META[activeModalRoom.currentStatus]?.label}
                  </span>
                </div>

                {/* 3. Thông tin khách: CHỈ hiển thị khi RESERVED hoặc OCCUPIED (Mục 6.2 STT 3) */}
                {(activeModalRoom.currentStatus === 'RESERVED' || activeModalRoom.currentStatus === 'OCCUPIED') && (
                  <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-1.5">
                    <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                      THÔNG TIN KHÁCH LƯU TRÚ
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      Khách lưu trú: {activeModalRoom.booking?.guestName || 'Khách Vãng Lai'}
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between">
                      <span>Ngày nhận: {activeModalRoom.booking?.checkIn || 'Hôm nay'}</span>
                      <span>Ngày trả: {activeModalRoom.booking?.checkOut || 'Ngày mai'}</span>
                    </div>
                    {activeModalRoom.booking?.confirmationCode && (
                      <div className="text-xs font-mono text-blue-800">
                        Mã xác nhận: #{activeModalRoom.booking.confirmationCode}
                      </div>
                    )}
                    {activeModalRoom.isOverdue && activeModalRoom.currentStatus === 'OCCUPIED' && (
                      <div className="text-xs font-bold text-rose-600 flex items-center gap-1 pt-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Cảnh báo: Đã quá giờ trả phòng tiêu chuẩn (12:00)
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Ô nhập lý do (note) — CHỈ hiển thị khi thao tác "Đánh dấu bảo trì" (Mục 6.2 STT 4 & 5.2) */}
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
                      placeholder="Nhập chi tiết sự cố kỹ thuật hoặc lý do cần bảo trì phòng..."
                      className="w-full p-2.5 text-xs rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                    {/* Bắt buộc: Lỗi ERROR_0001_REQUIRED hiển thị chữ đỏ 13px ngay dưới ô nhập (Mục 5.2) */}
                    {noteError && (
                      <div className="text-[13px] text-rose-600 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {noteError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Nhóm nút thao tác nhanh (Mục 6.2 STT 5 & 3.4 Ma trận chuyển trạng thái) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Đóng
                </button>

                {/* Nếu đang ở chế độ nhập bảo trì: Xác nhận bảo trì */}
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
                    {/* MA TRẬN 3.4: Từ VACANT_DIRTY -> CLEANING ("Bắt đầu dọn") & OUT_OF_ORDER */}
                    {activeModalRoom.currentStatus === 'VACANT_DIRTY' && (
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

                    {/* MA TRẬN 3.4: Từ CLEANING -> VACANT_CLEAN ("Hoàn tất dọn") */}
                    {activeModalRoom.currentStatus === 'CLEANING' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => executeStatusChange('VACANT_CLEAN')}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Hoàn tất dọn'}
                      </button>
                    )}

                    {/* MA TRẬN 3.4: Từ VACANT_CLEAN -> OUT_OF_ORDER ("Đánh dấu bảo trì") */}
                    {activeModalRoom.currentStatus === 'VACANT_CLEAN' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => setMaintenanceMode(true)}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        Đánh dấu bảo trì
                      </button>
                    )}

                    {/* MA TRẬN 3.4: Từ OUT_OF_ORDER -> VACANT_DIRTY ("Gỡ bảo trì") */}
                    {activeModalRoom.currentStatus === 'OUT_OF_ORDER' && canUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => executeStatusChange('VACANT_DIRTY')}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-xs font-bold text-white bg-[#1F4E78] rounded-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Gỡ bảo trì'}
                      </button>
                    )}

                    {/* MA TRẬN 3.4 & Mục 3.1 & 3.5: Phòng RESERVED -> nút "Nhận Phòng (Check-in)" */}
                    {activeModalRoom.currentStatus === 'RESERVED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseModal();
                          navigate(`/admin/le-tan?roomId=${activeModalRoom.id}`);
                        }}
                        disabled={!canManageBooking}
                        title={!canManageBooking ? 'Bạn không có quyền thực hiện' : ''}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                          canManageBooking
                            ? 'bg-[#1F4E78] text-white hover:brightness-110 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Nhận Phòng (Check-in)
                      </button>
                    )}

                    {/* MA TRẬN 3.4 & Mục 3.1 & 3.5: Phòng OCCUPIED -> nút "Trả Phòng (Check-out)" */}
                    {activeModalRoom.currentStatus === 'OCCUPIED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseModal();
                          navigate(`/admin/le-tan?roomId=${activeModalRoom.id}`);
                        }}
                        disabled={!canManageBooking}
                        title={!canManageBooking ? 'Bạn không có quyền thực hiện' : ''}
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

        {/* ── 7. TOAST THÔNG BÁO CHUẨN (Mục 5.2) ────────────────────────────── */}
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
