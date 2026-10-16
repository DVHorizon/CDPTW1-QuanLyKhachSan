import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/layout/AdminLayout';

const API_BASE = 'http://localhost:5000/api/v1/allocation';

// ─── Tiện ích định dạng ─────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtDateMonth = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

// ─── Toast Thông Báo ────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-md text-sm pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2 ${
          t.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/50'
            : t.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
            : t.type === 'warn'
            ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/50'
            : 'bg-sky-950/95 border-sky-500/50 text-sky-100 shadow-sky-950/50'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
          {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : t.type === 'warn' ? 'warning' : 'info'}
        </span>
        <div className="flex-1">
          {t.title && <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">{t.title}</p>}
          <p className="font-normal text-xs leading-relaxed">{t.message}</p>
        </div>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-white/60 hover:text-white transition-colors cursor-pointer ml-2"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    ))}
  </div>
);

// ─── Modal Cảnh Báo Xung Đột Concurrency (Người này sửa người kia xóa) ───────
const ConcurrencyConflictModal = ({ conflictData, onReload }) => {
  if (!conflictData || !conflictData.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-high border-2 border-rose-500/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-on-surface relative space-y-5 animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-2xl animate-pulse">sync_problem</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-300">Phát Hiện Xung Đột Dữ Liệu Đồng Thời</h3>
            <p className="text-xs text-on-surface-variant">Hệ thống đồng bộ hóa Grand Horizon PMS</p>
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-100 space-y-2">
          <p className="font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-rose-400">warning</span>
            {conflictData.message || 'Dữ liệu đặt phòng đã bị xóa hoặc thay đổi bởi người dùng khác trong cơ sở dữ liệu.'}
          </p>
          <p className="text-xs text-rose-200/80">
            Để đảm bảo tính toàn vẹn và tránh ghi đè dữ liệu sai lệch, thao tác hiện tại đã tạm dừng. Vui lòng tải lại trang để nạp thông tin mới nhất từ máy chủ.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onReload}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/50 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Tải Lại Trang Ngay (Reload Data)
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal In Phiếu Gán Phòng (Print Allocation Voucher) ─────────────────────
const PrintVoucherModal = ({ booking, room, onClose }) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/40 max-w-xl w-full p-6 text-on-surface space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-admin-primary">print</span>
            <h3 className="font-bold text-base">Phiếu Điều Phối & Gán Phòng Khách Sạn</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="border border-dashed border-outline-variant/40 rounded-xl p-5 bg-surface-container-lowest space-y-4 font-mono text-xs">
          <div className="text-center space-y-1">
            <h4 className="font-bold text-sm tracking-widest text-admin-primary">GRAND HORIZON RESORT & HOTELS</h4>
            <p className="text-[10px] text-on-surface-variant">ROOM ALLOCATION & CHECK-IN VOUCHER</p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-b border-outline-variant/20 py-3">
            <div>
              <span className="text-on-surface-variant block">MÃ ĐẶT PHÒNG:</span>
              <strong className="text-sm text-admin-primary font-mono">{booking.ConfirmationCode}</strong>
            </div>
            <div>
              <span className="text-on-surface-variant block">PHÒNG ĐƯỢC GÁN:</span>
              <strong className="text-sm text-emerald-400 font-bold">{room ? room.RoomNumber : 'CHƯA GÁN'}</strong>
            </div>
            <div>
              <span className="text-on-surface-variant block">KHÁCH HÀNG:</span>
              <span className="font-medium text-on-surface">{booking.GuestName}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">HẠNG HỘI VIÊN:</span>
              <span className="text-amber-400 font-semibold">{booking.VipTier || 'STANDARD'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">NGÀY NHẬN:</span>
              <span>{fmtDateMonth(booking.CheckInDate)}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">NGÀY TRẢ:</span>
              <span>{fmtDateMonth(booking.CheckOutDate)} ({booking.NumberOfNights} đêm)</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span>TỔNG THANH TOÁN (FOLIO):</span>
            <span className="font-bold text-on-surface">{fmtMoney(booking.totalFolio)}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span>ĐÃ ĐẶT CỌC:</span>
            <span className="text-emerald-400 font-medium">{fmtMoney(booking.depositPaid)}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold text-rose-400">
            <span>CÒN LẠI CẦN THU (BALANCE DUE):</span>
            <span>{fmtMoney(booking.balanceDue)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-medium hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-admin-primary hover:bg-admin-primary/90 text-on-primary text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            In Phiếu
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Trang Chính: RoomAssignment ────────────────────────────────────────────
export default function RoomAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Kiểm tra quyền hạn vai trò (RBAC)
  const isUnauthorized = user && user.role && !['Admin', 'Manager', 'Staff', 'Receptionist'].includes(user.role);

  // Lấy bookingId đang active
  const activeBookingId = params.bookingId || searchParams.get('bookingId') || '';

  // Danh sách các booking cần gán phòng
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(activeBookingId);
  const [searchBookingQuery, setSearchBookingQuery] = useState('');

  // Chi tiết booking đang xử lý
  const [bookingDossier, setBookingDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Bộ lọc phòng gợi ý
  const [filterFloor, setFilterFloor] = useState('all'); // 'all' | 'high' | 'mid' | 'low'
  const [filterHK, setFilterHK] = useState('clean'); // 'clean_inspected' | 'clean' | 'all'
  const [filterView, setFilterView] = useState('all'); // 'all' | 'ocean' | 'city'
  const [searchRoomQuery, setSearchRoomQuery] = useState('');

  // Yêu cầu đặc biệt checklist
  const [activeRequests, setActiveRequests] = useState({
    req_high_floor: true,
    req_quiet: true,
    req_nonsmoking: true,
    req_allergy: false,
    req_ocean: true,
  });

  // Danh sách phòng gợi ý
  const [recommendedRooms, setRecommendedRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Sơ đồ mặt bằng CAD theo tầng
  const [cadRooms, setCadRooms] = useState([]);
  const [cadFloor, setCadFloor] = useState(8);
  const [loadingCad, setLoadingCad] = useState(false);

  // Lock Lease & Giữ tạm 15 phút
  const [heldRoom, setHeldRoom] = useState(null);
  const [holdToken, setHoldToken] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const [isHoldExpired, setIsHoldExpired] = useState(false);

  // Switches điều phối
  const [sendSmsEmail, setSendSmsEmail] = useState(true);
  const [notifyHousekeeping, setNotifyHousekeeping] = useState(true);
  const [preProgramKeycard, setPreProgramKeycard] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Hệ thống Toast
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, message, title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Xung đột Concurrency (Người này sửa người kia xóa)
  const [concurrencyConflict, setConcurrencyConflict] = useState({
    isOpen: false,
    message: '',
  });

  // Đồng hồ thời gian thực PMS
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const p = (n) => String(n).padStart(2, '0');
      setCurrentTimeStr(`${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Đếm ngược 15 phút Lease
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsHoldExpired(true);
        setHeldRoom(null);
        addToast('warn', 'Thời gian giữ phòng (15 phút) đã hết hạn. Vui lòng chọn lại!', 'HẾT HẠN GIỮ PHÒNG');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, addToast]);

  // ─── 1. Tải danh sách bookings cần gán phòng ──────────────────────────────
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      const res = await fetch(`${API_BASE}/bookings`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBookingsList(data.data);
        // Nếu chưa chọn booking nào hoặc booking hiện tại không hợp lệ, chọn booking đầu tiên
        if (!selectedBookingId && data.data.length > 0) {
          setSelectedBookingId(String(data.data[0].BookingId));
        }
      } else {
        addToast('error', data.message || 'Không thể tải danh sách booking', 'LỖI HỆ THỐNG');
      }
    } catch (err) {
      console.error('Fetch bookings error:', err);
      addToast('error', 'Lỗi kết nối cơ sở dữ liệu: ' + err.message, 'LỖI KẾT NỐI');
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedBookingId, addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ─── 2. Tải chi tiết booking đang chọn ─────────────────────────────────────
  const fetchBookingDossier = useCallback(async (bId) => {
    if (!bId) {
      setBookingDossier(null);
      return;
    }
    try {
      setLoadingDossier(true);
      const res = await fetch(`${API_BASE}/booking/${bId}`);
      const data = await res.json();

      // Kiểm tra nếu dữ liệu đã bị xóa (Concurrency Check)
      if (res.status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Đặt phòng này đã bị xóa hoặc không còn tồn tại trong cơ sở dữ liệu.',
        });
        return;
      }

      if (data.success && data.data) {
        setBookingDossier(data.data);
        if (data.data.AssignedFloor) {
          setCadFloor(Number(data.data.AssignedFloor) || 8);
        }
        if (data.data.AssignedRoomId) {
          setSelectedRoomId(data.data.AssignedRoomId);
        }
      } else {
        addToast('error', data.message || 'Không tìm thấy hồ sơ đặt phòng', 'LỖI DỮ LIỆU');
      }
    } catch (err) {
      console.error('Fetch booking dossier error:', err);
      addToast('error', 'Không thể kết nối máy chủ để tải hồ sơ booking: ' + err.message, 'LỖI MẠNG');
    } finally {
      setLoadingDossier(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedBookingId) {
      fetchBookingDossier(selectedBookingId);
      // Reset hold lease khi đổi booking
      setHeldRoom(null);
      setHoldExpiresAt(null);
      setIsHoldExpired(false);
    }
  }, [selectedBookingId, fetchBookingDossier]);

  // ─── 3. Tải danh sách phòng gợi ý ──────────────────────────────────────────
  const fetchRecommendedRooms = useCallback(async () => {
    if (!selectedBookingId) return;
    try {
      setLoadingRooms(true);
      const q = new URLSearchParams({
        bookingId: selectedBookingId,
        roomTypeId: bookingDossier?.RoomTypeId || '',
        targetFloor: filterFloor,
        hkStatus: filterHK,
        viewAspect: filterView,
        search: searchRoomQuery,
      });

      const res = await fetch(`${API_BASE}/recommended-rooms?${q.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setRecommendedRooms(data.data);
        // Tự động chọn phòng gợi ý tốt nhất nếu chưa có phòng được chọn
        if (!selectedRoomId && data.data.length > 0) {
          setSelectedRoomId(data.data[0].RoomId);
        }
      } else {
        addToast('error', data.message || 'Không có phòng phù hợp', 'THÔNG BÁO');
      }
    } catch (err) {
      console.error('Fetch recommended rooms error:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedBookingId, bookingDossier, filterFloor, filterHK, filterView, searchRoomQuery, selectedRoomId, addToast]);

  useEffect(() => {
    fetchRecommendedRooms();
  }, [fetchRecommendedRooms]);

  // ─── 4. Tải sơ đồ CAD mặt bằng theo tầng ──────────────────────────────────
  const fetchCadFloorSchematic = useCallback(async (floorNum) => {
    try {
      setLoadingCad(true);
      const res = await fetch(`${API_BASE}/floor-schematic?floor=${floorNum}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCadRooms(data.data);
      }
    } catch (err) {
      console.error('Fetch CAD schematic error:', err);
    } finally {
      setLoadingCad(false);
    }
  }, []);

  useEffect(() => {
    fetchCadFloorSchematic(cadFloor);
  }, [cadFloor, fetchCadFloorSchematic]);

  // ─── 5. Heartbeat đồng bộ Concurrency định kỳ ─────────────────────────────
  // Kiểm tra xem booking có bị người khác sửa hoặc xóa trong DB không
  useEffect(() => {
    if (!selectedBookingId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/check-sync/${selectedBookingId}`);
        const data = await res.json();

        if (res.status === 404 || data.isRecordDeleted) {
          setConcurrencyConflict({
            isOpen: true,
            message: data.message || 'Đặt phòng này vừa bị xóa hoặc hủy bỏ bởi người dùng khác trong cơ sở dữ liệu!',
          });
        }
      } catch (e) {
        // bỏ qua lỗi gián đoạn mạng tạm thời
      }
    }, 15000); // 15 giây poll một lần

    return () => clearInterval(interval);
  }, [selectedBookingId]);

  // ─── Phòng đang được chọn ─────────────────────────────────────────────────
  const currentSelectedRoom = useMemo(() => {
    return (
      recommendedRooms.find((r) => r.RoomId === selectedRoomId) ||
      cadRooms.find((r) => r.RoomId === selectedRoomId) ||
      (bookingDossier?.AssignedRoomId ? {
        RoomId: bookingDossier.AssignedRoomId,
        RoomNumber: bookingDossier.AssignedRoomNumber,
        Floor: bookingDossier.AssignedFloor || 8,
        RoomTypeName: bookingDossier.RoomTypeName,
        RoomStatus: 'CleanAvailable',
        ViewAspect: 'HƯỚNG BIỂN TRỰC DIỆN (OCEAN FRONT)',
        AreaSqm: 55,
        BedConfig: '1 King Bed (200x220)',
        Corner: 'GÓC ĐÔNG NAM (YÊN TĨNH)',
        Wing: 'TÒA B (WING B)',
        MatchPercent: 96,
      } : null)
    );
  }, [recommendedRooms, cadRooms, selectedRoomId, bookingDossier]);

  // Cập nhật tầng CAD khi chọn phòng
  useEffect(() => {
    if (currentSelectedRoom && currentSelectedRoom.Floor) {
      setCadFloor(Number(currentSelectedRoom.Floor));
    }
  }, [currentSelectedRoom]);

  // ─── HÀNH ĐỘNG 1: Tự Động Phân Bổ (Auto-Allocate Best Match) ───────────────
  const handleAutoAllocate = () => {
    if (!recommendedRooms.length) {
      addToast('error', 'Không có phòng phù hợp để gán tự động.', 'ALLOCATION ENGINE');
      return;
    }
    const bestRoom = recommendedRooms[0];
    setSelectedRoomId(bestRoom.RoomId);
    setCadFloor(Number(bestRoom.Floor) || 8);
    addToast(
      'success',
      `Auto-Allocate đã chọn Phòng ${bestRoom.RoomNumber} với độ phù hợp cao nhất (${bestRoom.MatchPercent}%).`,
      'TỰ ĐỘNG ĐIỀU PHỐI'
    );
  };

  // ─── HÀNH ĐỘNG 2: Giữ Phòng Tạm Thời (Hold Reservation 15 Phút) ───────────
  const handleHoldRoom = async () => {
    if (!selectedRoomId) {
      addToast('warn', 'Vui lòng chọn một phòng trong danh sách trước khi kích hoạt giữ phòng.', 'CẢNH BÁO');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoomId, bookingId: selectedBookingId }),
      });
      const data = await res.json();

      if (res.status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Đặt phòng hoặc phòng đã bị xóa bởi người dùng khác.',
        });
        return;
      }

      if (res.status === 409 || data.isConflict) {
        addToast('error', data.message || 'Phòng vừa được gán hoặc giữ bởi người khác.', 'XUNG ĐỘT PHÒNG');
        fetchRecommendedRooms();
        return;
      }

      if (data.success) {
        setHeldRoom(currentSelectedRoom);
        setHoldToken(data.holdToken);
        setHoldExpiresAt(data.expiresAt);
        setSecondsRemaining(data.expiresInSeconds || 900);
        setIsHoldExpired(false);
        addToast('success', data.message, 'ĐÃ KHÓA GIỮ PHÒNG 15 PHÚT');
      } else {
        addToast('error', data.message, 'LỖI GIỮ PHÒNG');
      }
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI');
    }
  };

  // ─── HÀNH ĐỘNG 3: Hủy Giữ Phòng (Release Hold) ─────────────────────────────
  const handleReleaseHold = async () => {
    if (selectedRoomId) {
      await fetch(`${API_BASE}/release-hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoomId, bookingId: selectedBookingId }),
      });
    }
    setHeldRoom(null);
    setHoldExpiresAt(null);
    setHoldToken('');
    addToast('info', 'Đã hủy giữ phòng tạm thời.', 'GIẢI PHÓNG PHÒNG');
  };

  // ─── HÀNH ĐỘNG 4: Xác Nhận Gán Phòng Chính Thức ────────────────────────────
  const handleConfirmAllocation = async (proceedToCheckIn = false) => {
    if (!selectedRoomId) {
      addToast('warn', 'Vui lòng chọn một số phòng cụ thể để gán cho khách.', 'THIẾU THÔNG TIN');
      return;
    }

    try {
      setConfirming(true);
      const res = await fetch(`${API_BASE}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          roomId: selectedRoomId,
          holdToken,
          sendSmsEmail,
          notifyHousekeeping,
          preProgramKeycard,
          proceedToCheckIn,
        }),
      });

      const data = await res.json();

      // Kiểm tra xóa đồng thời
      if (res.status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Dữ liệu đặt phòng đã bị xóa bởi người dùng khác trong cơ sở dữ liệu.',
        });
        return;
      }

      // Kiểm tra hết hạn giữ phòng
      if (res.status === 410 || data.isExpired) {
        setIsHoldExpired(true);
        addToast('warn', data.message || 'Thời gian giữ phòng đã hết, vui lòng gán lại.', 'HẾT HẠN GIỮ PHÒNG');
        fetchRecommendedRooms();
        return;
      }

      // Kiểm tra xung đột phòng đã bị người khác gán
      if (res.status === 409 || data.isConflict) {
        addToast('error', data.message || 'Phòng vừa được gán cho booking khác, vui lòng chọn phòng khác.', 'XUNG ĐỘT GÁN PHÒNG');
        fetchRecommendedRooms();
        return;
      }

      if (data.success) {
        addToast('success', data.message, 'XÁC NHẬN THÀNH CÔNG');
        setHeldRoom(null);
        setHoldExpiresAt(null);
        // Tải lại dữ liệu
        await fetchBookingDossier(selectedBookingId);
        await fetchBookings();
        await fetchRecommendedRooms();
        await fetchCadFloorSchematic(cadFloor);
      } else {
        addToast('error', data.message || 'Không thể xác nhận gán phòng', 'LỖI XÁC NHẬN');
      }
    } catch (err) {
      console.error('Confirm allocation error:', err);
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setConfirming(false);
    }
  };

  // ─── Bộ lọc danh sách booking nhanh ───────────────────────────────────────
  const filteredBookingsList = useMemo(() => {
    if (!searchBookingQuery.trim()) return bookingsList;
    const q = searchBookingQuery.toLowerCase().trim();
    return bookingsList.filter(
      (b) =>
        (b.ConfirmationCode && b.ConfirmationCode.toLowerCase().includes(q)) ||
        (b.GuestName && b.GuestName.toLowerCase().includes(q)) ||
        (b.AssignedRoomNumber && b.AssignedRoomNumber.toLowerCase().includes(q))
    );
  }, [bookingsList, searchBookingQuery]);

  // ─── Format thời gian đếm ngược Lease ─────────────────────────────────────
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Kiểm tra quyền truy cập RBAC
  if (isUnauthorized) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-rose-400">Bạn không có quyền truy cập chức năng này</h2>
          <p className="text-sm text-on-surface-variant max-w-md">
            Chức năng Điều phối & Gán Phòng (Room Allocation) chỉ dành cho Quản Trị Viên, Lễ Tân và Bộ phận Quản Lý buồng phòng.
          </p>
          <Link
            to="/admin/bookings"
            className="px-5 py-2.5 rounded-xl bg-admin-primary text-on-primary font-medium text-xs hover:bg-admin-primary/90 transition-all"
          >
            Quay lại Danh Sách Đặt Phòng
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Breadcrumbs & Main Title ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Link to="/admin/bookings" className="hover:text-admin-primary transition-colors">
                Quản Lý Đặt Phòng
              </Link>
              <span>/</span>
              <span className="text-admin-primary font-medium">Điều Phối & Gán Số Phòng (Room Allocation)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-2xl">meeting_room</span>
                Xác Nhận & Gán Số Phòng Cụ Thể
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-admin-primary/15 text-admin-primary border border-admin-primary/30">
                GRAND HORIZON PMS
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Khớp phòng tự động theo sở thích hội viên VIP, sơ đồ mặt bằng CAD tương tác và khóa bảo vệ giữ phòng 15 phút.
            </p>
          </div>

          {/* Quick Metrics & System Clock */}
          <div className="flex items-center gap-3">
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 flex items-center gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">{currentTimeStr}</span>
              </div>
              <div className="h-4 w-[1px] bg-outline-variant/30"></div>
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant block uppercase leading-none">Công Suất Phòng</span>
                <span className="text-xs font-bold text-on-surface">84.5%</span>
              </div>
            </div>

            <button
              onClick={() => {
                fetchBookings();
                if (selectedBookingId) fetchBookingDossier(selectedBookingId);
                fetchRecommendedRooms();
                addToast('info', 'Đã làm mới dữ liệu từ cơ sở dữ liệu.', 'LÀM MỚI');
              }}
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer shadow-sm"
              title="Tải lại dữ liệu từ máy chủ"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </div>

        {/* ─── 1. BỘ CHỌN ĐẶT PHÒNG CẦN GÁN (QUICK BOOKING PICKER) ─────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">assignment_ind</span>
              <h2 className="text-sm font-bold text-on-surface">
                Danh Sách Đặt Phòng Cần Gán Phòng ({bookingsList.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-2.5 text-base pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm mã booking, tên khách..."
                  value={searchBookingQuery}
                  onChange={(e) => setSearchBookingQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>
            </div>
          </div>

          {/* Booking Cards Horizontal Carousel / Scroller */}
          {loadingBookings ? (
            <div className="flex items-center justify-center p-6 text-xs text-on-surface-variant gap-2">
              <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
              Đang tải danh sách đặt phòng từ cơ sở dữ liệu...
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {filteredBookingsList.slice(0, 15).map((b) => {
                const isSelected = String(b.BookingId) === String(selectedBookingId);
                const hasAssigned = Boolean(b.AssignedRoomNumber);
                return (
                  <button
                    key={b.BookingId}
                    onClick={() => {
                      setSelectedBookingId(String(b.BookingId));
                      setSearchParams({ bookingId: b.BookingId });
                    }}
                    className={`flex-shrink-0 text-left w-64 p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-admin-primary/10 border-admin-primary shadow-md shadow-admin-primary/10 ring-1 ring-admin-primary'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-on-surface">{b.ConfirmationCode}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          hasAssigned
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {hasAssigned ? `Phòng ${b.AssignedRoomNumber}` : 'Chưa gán'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface truncate mb-0.5">{b.GuestName}</div>
                    <div className="text-[11px] text-on-surface-variant flex items-center justify-between">
                      <span>{b.RoomTypeName}</span>
                      <span className="text-amber-300 font-medium">{b.VipTier}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 2. ALLOCATION ENGINE TOOLBAR ─────────────────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary">
              <span className="material-symbols-outlined text-xl">tune</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-on-surface">Allocation Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">
                Booking Ref: <span className="text-admin-primary font-bold">{bookingDossier?.ConfirmationCode || '---'}</span> • ID #{selectedBookingId || '---'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoAllocate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-semibold text-xs transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              Auto-Allocate Best Match
            </button>

            <button
              onClick={heldRoom ? handleReleaseHold : handleHoldRoom}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                heldRoom
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-surface-container-high border-outline-variant/40 text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {heldRoom ? 'lock_open' : 'lock_clock'}
              </span>
              {heldRoom ? 'Hủy Khóa Giữ Phòng' : 'Hold Reservation (15m)'}
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="p-2 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all cursor-pointer"
              title="In phiếu điều phối"
            >
              <span className="material-symbols-outlined text-base">print</span>
            </button>
          </div>
        </div>

        {/* ─── 3. DOSSIER & FINANCIAL FOLIO (2-COLUMN GRID) ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CỘT TRÁI: HỒ SƠ KHÁCH LƯU TRÚ (GUEST DOSSIER) */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-xl">badge</span>
                <h3 className="font-bold text-sm text-on-surface">Hồ Sơ Khách Lưu Trú (Guest Dossier)</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {bookingDossier?.stayHistory?.vipTier || 'VIP TIER: STANDARD'}
              </span>
            </div>

            {loadingDossier ? (
              <div className="p-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                Đang nạp hồ sơ khách...
              </div>
            ) : bookingDossier ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary font-bold text-lg flex-shrink-0">
                    {bookingDossier.GuestName ? bookingDossier.GuestName.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-base text-on-surface">{bookingDossier.GuestName}</h4>
                    <p className="text-xs text-on-surface-variant flex items-center gap-3">
                      <span>📞 {bookingDossier.GuestPhone}</span>
                      <span>✉️ {bookingDossier.GuestEmail}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-on-surface-variant">
                        Mã Hội Viên: <strong className="text-admin-primary">{bookingDossier.stayHistory?.membershipRef}</strong>
                      </span>
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-on-surface-variant">
                        Doanh Nghiệp: <strong className="text-on-surface">{bookingDossier.stayHistory?.corpCode}</strong>
                      </span>
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-emerald-400">
                        {bookingDossier.stayHistory?.passportHash}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ghi chú lịch sử lưu trú */}
                <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 space-y-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Lịch Sử Lưu Trú & Ghi Chú Giám Sát (Audit History)
                  </span>
                  <p className="text-xs text-on-surface leading-relaxed font-mono">
                    {bookingDossier.stayHistory?.auditNote}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Vui lòng chọn một đặt phòng từ danh sách phía trên.</p>
            )}
          </div>

          {/* CỘT PHẢI: THÔNG SỐ LƯU TRÚ & TÀI CHÍNH FOLIO */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-xl">payments</span>
                <h3 className="font-bold text-sm text-on-surface">Thông Số Lưu Trú & Tài Chính Folio</h3>
              </div>
              <span className="text-xs font-mono text-on-surface-variant">
                {bookingDossier?.NumberOfNights || 1} ĐÊM • {bookingDossier?.Adults || 1} NGƯỜI LỚN
              </span>
            </div>

            {bookingDossier ? (
              <div className="space-y-4">
                {/* Stay Dates */}
                <div className="grid grid-cols-2 gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">Ngày Nhận Phòng</span>
                    <span className="text-xs font-bold text-on-surface">
                      {fmtDateMonth(bookingDossier.CheckInDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">Ngày Trả Phòng</span>
                    <span className="text-xs font-bold text-on-surface">
                      {fmtDateMonth(bookingDossier.CheckOutDate)}
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant block uppercase">Giá Gốc / Đêm</span>
                    <span className="text-xs font-bold text-on-surface">{fmtMoney(bookingDossier.baseRate)}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                    <span className="text-[10px] text-emerald-400 block uppercase">Đã Đặt Cọc</span>
                    <span className="text-xs font-bold text-emerald-400">{fmtMoney(bookingDossier.depositPaid)}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-rose-500/30 bg-rose-500/5">
                    <span className="text-[10px] text-rose-400 block uppercase">Công Nợ Còn Lại</span>
                    <span className="text-xs font-bold text-rose-400">{fmtMoney(bookingDossier.balanceDue)}</span>
                  </div>
                </div>

                {/* Total Folio */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-admin-primary/10 border border-admin-primary/30">
                  <span className="text-xs font-semibold text-on-surface">Tổng Dự Toán Hóa Đơn (Total Folio):</span>
                  <span className="text-base font-bold text-admin-primary">{fmtMoney(bookingDossier.totalFolio)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Đang tải thông số tài chính...</p>
            )}
          </div>
        </div>

        {/* ─── 4. YÊU CẦU ĐẶC BIỆT & SỞ THÍCH LƯU TRÚ ──────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">fact_check</span>
              <h3 className="font-bold text-sm text-on-surface">Yêu Cầu Đặc Biệt & Tiêu Chí Gán Phòng (Guest Preferences)</h3>
            </div>
            <span className="text-xs text-on-surface-variant font-mono">
              TRỌNG SỐ THUẬT TOÁN: <strong className="text-admin-primary">100% WEIGHT</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: 'req_high_floor', label: 'Tầng cao ưu tiên (08+)', icon: 'apartment', satisfied: true },
              { id: 'req_quiet', label: 'Xa thang máy / Yên tĩnh', icon: 'volume_off', satisfied: true },
              { id: 'req_nonsmoking', label: 'Khu vực không hút thuốc', icon: 'smoke_free', satisfied: true },
              { id: 'req_allergy', label: 'Chăn gối chống dị ứng', icon: 'bed', satisfied: false },
              { id: 'req_ocean', label: 'Hướng biển trực diện (Ocean)', icon: 'waves', satisfied: true },
            ].map((req) => (
              <label
                key={req.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  activeRequests[req.id]
                    ? 'bg-admin-primary/10 border-admin-primary/50 text-on-surface'
                    : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(activeRequests[req.id])}
                  onChange={(e) => setActiveRequests({ ...activeRequests, [req.id]: e.target.checked })}
                  className="mt-0.5 rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm text-admin-primary">{req.icon}</span>
                    <span>{req.label}</span>
                  </div>
                  <span className={`text-[10px] block ${req.satisfied ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {req.satisfied ? '✓ Đã khớp tiêu chí' : '— Tùy chọn bổ sung'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ─── 5. BỘ LỌC PHÒNG & DANH SÁCH GỢI Ý (RECOMMENDED UNITS) ────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-admin-primary text-xl">recommend</span>
              <h3 className="font-bold text-sm text-on-surface">
                Danh Sách Phòng Phù Hợp Được Chấm Điểm (Compatibility Ranking)
              </h3>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Tầng */}
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="all">Tất Cả Tầng</option>
                <option value="high">Tầng Cao (Tầng 8+)</option>
                <option value="mid">Tầng Trung (Tầng 4 - 7)</option>
                <option value="low">Tầng Thấp (Tầng 1 - 3)</option>
              </select>

              {/* Buồng phòng */}
              <select
                value={filterHK}
                onChange={(e) => setFilterHK(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="clean">Đã Dọn Sạch (Clean / Inspected)</option>
                <option value="clean_inspected">Chỉ Phòng Đã Kiểm Tra (Inspected)</option>
                <option value="all">Tất Cả Trạng Thái</option>
              </select>

              {/* Hướng nhìn */}
              <select
                value={filterView}
                onChange={(e) => setFilterView(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="all">Tất Cả Hướng Nhìn</option>
                <option value="ocean">Hướng Biển (Ocean View)</option>
                <option value="city">Hướng Phố (City View)</option>
              </select>

              {/* Search room */}
              <input
                type="text"
                placeholder="Tìm số phòng..."
                value={searchRoomQuery}
                onChange={(e) => setSearchRoomQuery(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface w-28 focus:outline-none focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>

          {/* Room Cards Grid */}
          {loadingRooms ? (
            <div className="p-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
              Đang chấm điểm và xếp hạng phòng tương thích...
            </div>
          ) : recommendedRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-3xl text-amber-400 block">search_off</span>
              <p>Không có phòng nào thỏa mãn tiêu chí lọc hiện tại.</p>
              <button
                onClick={() => {
                  setFilterFloor('all');
                  setFilterHK('clean');
                  setFilterView('all');
                  setSearchRoomQuery('');
                }}
                className="text-admin-primary underline text-xs cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedRooms.slice(0, 9).map((room) => {
                const isSelected = selectedRoomId === room.RoomId;
                const isHeld = heldRoom && heldRoom.RoomId === room.RoomId;

                return (
                  <div
                    key={room.RoomId}
                    onClick={() => {
                      setSelectedRoomId(room.RoomId);
                      setCadFloor(Number(room.Floor) || 8);
                    }}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer relative space-y-3 ${
                      isSelected
                        ? 'bg-admin-primary/10 border-admin-primary shadow-lg shadow-admin-primary/10 ring-2 ring-admin-primary'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50'
                    }`}
                  >
                    {/* Header: Room Number & Match % */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center font-bold text-sm text-on-surface">
                          {room.RoomNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{room.RoomTypeName}</h4>
                          <span className="text-[10px] text-on-surface-variant">
                            Tầng {room.Floor} • {room.Wing}
                          </span>
                        </div>
                      </div>

                      {/* Match Badge */}
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                            room.MatchPercent >= 90
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : room.MatchPercent >= 80
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                          }`}
                        >
                          {room.MatchPercent}% Match
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Compatibility */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-on-surface-variant">
                        <span>Độ phù hợp tiêu chí ({room.SatisfiedCount}/{room.TotalCriteria})</span>
                        <span className="font-mono text-emerald-400">{room.MatchPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            room.MatchPercent >= 90 ? 'bg-emerald-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${room.MatchPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Attributes Pill Line */}
                    <div className="text-[10px] text-on-surface-variant line-clamp-1 border-t border-outline-variant/10 pt-2 font-mono">
                      {room.UnitAttributes}
                    </div>

                    {/* Inspection Timelog */}
                    <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 rounded-lg px-2.5 py-1 border border-emerald-500/20 flex items-center justify-between">
                      <span>{room.InspectionTimelog}</span>
                      {room.RoomStatus === 'Inspected' && (
                        <span className="material-symbols-outlined text-xs">verified</span>
                      )}
                    </div>

                    {/* Action Select Radio */}
                    <div className="flex items-center justify-between pt-1">
                      {isHeld && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">lock</span>
                          Đang giữ tạm
                        </span>
                      )}
                      {room.IsUpgrade && (
                        <span className="text-[10px] text-violet-400 font-bold bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/30">
                          Upgrade Candidate
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-admin-primary">
                        <span>{isSelected ? 'Đã Chọn' : 'Chọn Phòng Này'}</span>
                        <span className="material-symbols-outlined text-sm">
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 6. SƠ ĐỒ MẶT BẰNG CAD TƯƠNG TÁC (ARCHITECTURAL SCHEMATIC) ─────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-xl">map</span>
              <div>
                <h3 className="font-bold text-sm text-on-surface">
                  Sơ Đồ Mặt Bằng Tầng CAD Tương Tác (Architectural Floor Blueprint)
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  TẦNG {cadFloor} • GRAND TOWER • BẤM PHÒNG ĐỂ GÁN NGAY
                </p>
              </div>
            </div>

            {/* Chuyển tầng nhanh */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Chọn Tầng:</span>
              <div className="flex gap-1">
                {[1, 4, 6, 8, 10, 11].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setCadFloor(fl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      cadFloor === fl
                        ? 'bg-admin-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    T.{fl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive SVG / Blueprint Viewport */}
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-2xl p-5 relative overflow-hidden shadow-inner">
            {/* Blueprint Grid Lines Background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #38bdf8 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Compass / Orientation & Legend */}
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/80 mb-4 border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-4">
                <span>[ WING A // NORTH ]</span>
                <span>--- CENTRAL CORRIDOR ---</span>
                <span>[ WING B // OCEAN SOUTH ]</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span> Trống / Sẵn Sàng
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 ring-2 ring-cyan-400 animate-pulse"></span> Đang Chọn
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-600"></span> Đang Có Khách
                </span>
              </div>
            </div>

            {/* Room Blocks Matrix */}
            {loadingCad ? (
              <div className="py-12 text-center text-xs text-cyan-300 font-mono flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Rendering CAD Schematic Vectors...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 relative z-10">
                {cadRooms.map((rm) => {
                  const isSelected = selectedRoomId === rm.RoomId;
                  const isOccupied = rm.Status === 'Occupied';
                  const isClean = rm.Status === 'CleanAvailable' || rm.Status === 'Inspected';

                  return (
                    <button
                      key={rm.RoomId}
                      disabled={isOccupied}
                      onClick={() => setSelectedRoomId(rm.RoomId)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative font-mono ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20'
                          : isOccupied
                          ? 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'
                          : isClean
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{rm.RoomNumber}</div>
                      <div className="text-[10px] uppercase truncate opacity-80 mt-0.5">
                        {isOccupied ? 'OCCUPIED' : rm.Status === 'Inspected' ? 'INSPECTED' : 'CLEAN'}
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-2 ring-white animate-ping"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Infrastructure Row: Elevator, Stairs, RFID Key Station */}
            <div className="mt-5 pt-3 border-t border-cyan-500/20 flex flex-wrap items-center justify-between text-[11px] font-mono text-cyan-300/80 gap-2">
              <div className="flex items-center gap-3">
                <span className="bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  🛗 HỘC THANG MÁY TRUNG TÂM
                </span>
                <span className="bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  🚪 THANG THOÁT HIỂM ĐÔNG
                </span>
              </div>
              <div className="bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/30 text-emerald-400">
                📶 TRẠM LẬP THẺ TỪ RFID: ONLINE (DESK #2)
              </div>
            </div>
          </div>

          {/* Chi tiết thông số phòng được chọn */}
          {currentSelectedRoom && (
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Diện Tích Phòng</span>
                <strong className="text-on-surface">{currentSelectedRoom.AreaSqm || 55} m² (King Suite)</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Cấu Hình Giường</span>
                <strong className="text-on-surface">{currentSelectedRoom.BedConfig || '1 King Bed (200x220)'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Hướng Nhìn (Aspect)</span>
                <strong className="text-emerald-400">{currentSelectedRoom.ViewAspect}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Vị Trí Hành Lang</span>
                <strong className="text-on-surface">{currentSelectedRoom.Corner || 'Góc Yên Tĩnh'}</strong>
              </div>
            </div>
          )}
        </div>

        {/* ─── 7. THANH XÁC NHẬN & GIỮ CHỖ (ACTION BAR & DISPATCH CONTROLS) ─── */}
        <div className="sticky bottom-4 z-40 bg-surface-container-high/95 backdrop-blur-md border border-admin-primary/40 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Status & 15-Minute Lease Timer */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  {heldRoom ? 'lock_clock' : 'room_preferences'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-on-surface">
                    {heldRoom
                      ? `Phòng ${heldRoom.RoomNumber} Đang Được Khóa Giữ (Lock Pending)`
                      : currentSelectedRoom
                      ? `Đã chọn Phòng ${currentSelectedRoom.RoomNumber} để gán`
                      : 'Chưa chọn phòng cụ thể'}
                  </span>
                  {heldRoom && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      LEASE: {timeFormatted}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {bookingDossier
                    ? `Khách: ${bookingDossier.GuestName} • Hạng phòng: ${bookingDossier.RoomTypeName}`
                    : 'Vui lòng chọn đặt phòng'}
                </p>
              </div>
            </div>

            {/* Automation Options Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={sendSmsEmail}
                  onChange={(e) => setSendSmsEmail(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>SMS & Email thông báo khách</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={notifyHousekeeping}
                  onChange={(e) => setNotifyHousekeeping(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Báo Buồng phòng</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={preProgramKeycard}
                  onChange={(e) => setPreProgramKeycard(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Mã hóa thẻ từ RFID</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {heldRoom && (
                <button
                  onClick={handleReleaseHold}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Hủy Giữ Chỗ
                </button>
              )}

              <button
                disabled={confirming || !selectedRoomId}
                onClick={() => handleConfirmAllocation(false)}
                className="px-5 py-2.5 rounded-xl border border-admin-primary/60 bg-admin-primary/10 hover:bg-admin-primary/20 text-admin-primary font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {confirming ? 'Đang Xử Lý...' : 'Xác Nhận Gán Phòng'}
              </button>

              <button
                disabled={confirming || !selectedRoomId}
                onClick={() => handleConfirmAllocation(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs transition-all cursor-pointer shadow-lg shadow-admin-primary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">login</span>
                Gán & Check-In Ngay
              </button>
            </div>
          </div>
        </div>

        {/* ─── TOAST NOTIFICATIONS ────────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* ─── MODAL CẢNH BÁO XUNG ĐỘT CONCURRENCY ─────────────────────────── */}
        <ConcurrencyConflictModal
          conflictData={concurrencyConflict}
          onReload={() => {
            window.location.reload();
          }}
        />

        {/* ─── MODAL IN PHIẾU GÁN PHÒNG ───────────────────────────────────── */}
        {showPrintModal && (
          <PrintVoucherModal
            booking={bookingDossier}
            room={currentSelectedRoom}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
