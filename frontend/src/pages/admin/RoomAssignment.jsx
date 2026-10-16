import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/v1/allocation';

// Tiện ích định dạng
const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) > 50000 ? Number(n) / 25000 : Number(n));
};

const fmtDateMonth = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getMonth()];
  return `${m} ${String(dt.getDate()).padStart(2, '0')}, ${dt.getFullYear()}`;
};

export default function RoomAssignment() {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Kiểm tra quyền hạn vai trò (Role Check: RBAC)
  const isUnauthorized = user && user.role && !['Admin', 'Manager', 'Staff', 'Receptionist'].includes(user.role);

  // Lấy bookingId từ URL params hoặc query params
  const activeBookingId = params.bookingId || searchParams.get('bookingId') || '';

  // Danh sách các booking cần gán phòng
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(activeBookingId);

  // Chi tiết booking đang xử lý
  const [bookingDossier, setBookingDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Bộ lọc phòng gợi ý
  const [filterFloor, setFilterFloor] = useState('high'); // 'all' | 'high' | 'mid' | 'low'
  const [filterHK, setFilterHK] = useState('clean_inspected'); // 'clean_inspected' | 'clean' | 'all'
  const [filterView, setFilterView] = useState('ocean'); // 'all' | 'ocean' | 'city'
  const [criteriaWeight, setCriteriaWeight] = useState(100);

  // Checkbox yêu cầu đặc biệt
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

  // Lock Lease & Giữ tạm 15 phút
  const [heldRoom, setHeldRoom] = useState(null);
  const [holdToken, setHoldToken] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(900); // 15 phút = 900 giây
  const [isHoldExpired, setIsHoldExpired] = useState(false);

  // Dispatch switches
  const [sendSmsEmail, setSendSmsEmail] = useState(true);
  const [notifyHousekeeping, setNotifyHousekeeping] = useState(true);
  const [preProgramKeycard, setPreProgramKeycard] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Thông báo lỗi và alerts
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Đồng hồ hệ thống thời gian thực (Live System Time)
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const p = (n) => String(n).padStart(2, '0');
      setCurrentTimeStr(`${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())} LST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Đếm ngược giữ phòng 15 phút (Lock Lease Countdown)
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsHoldExpired(true);
        setHeldRoom(null);
        setHoldExpiresAt(null);
        setErrorMessage('Thời gian giữ phòng đã hết, vui lòng gán lại.');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // Nạp danh sách các booking cần gán phòng
  useEffect(() => {
    let alive = true;
    setLoadingBookings(true);
    fetch(`${API_BASE}/bookings`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.success) {
          setBookingsList(d.data || []);
          if (!selectedBookingId && d.data?.length) {
            setSelectedBookingId(String(d.data[0].BookingId));
          }
        }
      })
      .catch((err) => console.error('Fetch bookings error:', err))
      .finally(() => { if (alive) setLoadingBookings(false); });
    return () => { alive = false; };
  }, []);

  // Nạp chi tiết dossier khi selectedBookingId thay đổi
  useEffect(() => {
    if (!selectedBookingId) return;
    let alive = true;
    setLoadingDossier(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    fetch(`${API_BASE}/booking/${selectedBookingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.success && d.data) {
          setBookingDossier(d.data);
          // Nếu booking đã có phòng được gán sẵn
          if (d.data.AssignedRoomId) {
            setSelectedRoomId(d.data.AssignedRoomId);
          }
        } else {
          setErrorMessage(d.message || 'Không thể tải chi tiết đặt phòng.');
        }
      })
      .catch(() => {
        if (alive) setErrorMessage('Lỗi kết nối máy chủ khi nạp hồ sơ đặt phòng.');
      })
      .finally(() => { if (alive) setLoadingDossier(false); });

    return () => { alive = false; };
  }, [selectedBookingId]);

  // Nạp danh sách phòng gợi ý
  const fetchRecommendedRooms = useCallback(async () => {
    if (!selectedBookingId) return;
    setLoadingRooms(true);
    try {
      const q = new URLSearchParams({
        bookingId: selectedBookingId,
        targetFloor: filterFloor,
        hkStatus: filterHK,
        viewAspect: filterView,
      });
      if (bookingDossier?.RoomTypeId) {
        q.set('roomTypeId', bookingDossier.RoomTypeId);
      }

      const res = await fetch(`${API_BASE}/recommended-rooms?${q}`);
      const json = await res.json();
      if (json.success) {
        setRecommendedRooms(json.data || []);
        // Nếu chưa chọn phòng nào hoặc phòng chọn không còn trong list, chọn phòng tốt nhất
        if (json.data?.length && !selectedRoomId) {
          setSelectedRoomId(json.data[0].RoomId);
          handleSelectRoom(json.data[0], false);
        }
      }
    } catch (err) {
      console.error('Fetch recommended rooms error:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedBookingId, filterFloor, filterHK, filterView, bookingDossier?.RoomTypeId, selectedRoomId]);

  useEffect(() => {
    fetchRecommendedRooms();
  }, [fetchRecommendedRooms]);

  // Chọn phòng và kích hoạt giữ phòng 15 phút
  const handleSelectRoom = async (room, triggerHold = true) => {
    setSelectedRoomId(room.RoomId);
    setErrorMessage(null);

    if (triggerHold) {
      try {
        const res = await fetch(`${API_BASE}/hold`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.RoomId,
            bookingId: selectedBookingId,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setHeldRoom(room);
          setHoldToken(json.holdToken);
          setHoldExpiresAt(json.expiresAt);
          setSecondsRemaining(900);
          setIsHoldExpired(false);
        } else {
          setErrorMessage(json.message || 'Phòng vừa được gán cho booking khác, vui lòng chọn phòng khác.');
        }
      } catch {
        setErrorMessage('Lỗi kết nối máy chủ khi khóa giữ phòng.');
      }
    } else {
      setHeldRoom(room);
    }
  };

  // Nút [ AUTO-ALLOCATE BEST MATCH ]
  const handleAutoAllocate = () => {
    setErrorMessage(null);
    if (!recommendedRooms.length) {
      setErrorMessage('Không có phòng phù hợp để gán tự động.');
      return;
    }
    // Chọn phòng có MatchPercent cao nhất và không bị lock bởi người khác
    const bestMatch = recommendedRooms.find((r) => !r.IsLockedByOther);
    if (!bestMatch) {
      setErrorMessage('Không có phòng phù hợp để gán tự động.');
      return;
    }
    handleSelectRoom(bestMatch, true);
    setSuccessMessage(`Đã tự động chọn và giữ tạm phòng tối ưu: PHÒNG ${bestMatch.RoomNumber} (${bestMatch.MatchPercent}% Phù Hợp).`);
  };

  // Nút [ HOLD RESERVATION ]
  const handleManualHold = () => {
    if (!selectedRoomId) {
      setErrorMessage('Vui lòng chọn một phòng trước khi bấm giữ phòng.');
      return;
    }
    const targetRoom = recommendedRooms.find((r) => r.RoomId === selectedRoomId);
    if (targetRoom) {
      handleSelectRoom(targetRoom, true);
    }
  };

  // Nút [ CONFIRM ALLOCATION & PROCEED TO CHECK-IN ]
  const handleConfirmAllocation = async (proceedToCheckIn = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedRoomId) {
      setErrorMessage('Vui lòng chọn một phòng để gán cho khách.');
      return;
    }

    if (isHoldExpired) {
      setErrorMessage('Thời gian giữ phòng đã hết, vui lòng gán lại.');
      return;
    }

    setConfirming(true);
    try {
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

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.message);
        // Refresh lại dữ liệu
        setHeldRoom(null);
        setHoldExpiresAt(null);
        fetchRecommendedRooms();
      } else if (json.isExpired) {
        setErrorMessage('Thời gian giữ phòng đã hết, vui lòng gán lại.');
      } else {
        setErrorMessage(json.message || 'Phòng vừa được gán cho booking khác, vui lòng chọn phòng khác.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối khi xác nhận gán phòng.');
    } finally {
      setConfirming(false);
    }
  };

  // Đổi trạng thái checkbox yêu cầu đặc biệt
  const toggleRequest = (key) => {
    setActiveRequests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Phòng hiện đang chọn
  const activeUnit = useMemo(() => {
    return recommendedRooms.find((r) => r.RoomId === selectedRoomId) || recommendedRooms[0] || null;
  }, [recommendedRooms, selectedRoomId]);

  // Định dạng thời gian đếm ngược MM:SS
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Nếu người dùng không có quyền (RBAC check)
  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-red-400 font-mono flex items-center justify-center p-6">
        <div className="border border-red-500/40 bg-red-950/20 p-8 rounded-xl max-w-md text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-red-500">lock_person</span>
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">Lỗi Quyền Truy Cập (403)</h2>
          <p className="text-sm">“Bạn không có quyền truy cập chức năng này.”</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-red-500/60 rounded text-xs uppercase tracking-wider text-red-200 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            Quay Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#111827] font-sans flex flex-col antialiased select-none">
      {/* ─── 1. THANH TRẠNG THÁI & MENU ĐIỀU HƯỚNG (PMS TERMINAL V4.2) ─────────── */}
      <header className="bg-white border-b border-[#000000] px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="border border-[#000000] px-2 py-1 font-mono font-black text-xs tracking-tighter bg-black text-white">
            HP
          </div>
          <div className="font-mono font-bold tracking-wider text-xs">
            HOTEL PMS // TERMINAL V4.2
          </div>
          <div className="h-4 w-px bg-black/20 mx-1" />
          <div className="border border-black px-2 py-1 font-mono text-[11px] font-semibold flex items-center gap-1.5 bg-neutral-50">
            <span>GRAND HORIZON // RESORT &amp; SUITES</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="border border-black px-2.5 py-1 text-center bg-neutral-50">
            <span className="text-neutral-500 text-[10px] block font-sans uppercase">Live System Time</span>
            <span className="font-bold">{currentTimeStr || '14:32:01 LST'}</span>
          </div>

          <div className="border border-black px-2.5 py-1 text-center bg-neutral-50">
            <span className="text-neutral-500 text-[10px] block font-sans uppercase">Occupancy: 86.4%</span>
            <span className="font-bold">(124/144 ROOMS)</span>
          </div>

          <div className="border border-black px-2.5 py-1 text-center bg-neutral-50">
            <span className="text-neutral-500 text-[10px] block font-sans uppercase">Agent: {user?.fullName || 'SARAH JENKINS'}</span>
            <span className="font-bold font-mono">[SHIFT MGR #4092]</span>
          </div>

          <button
            onClick={() => setShowAlertsModal(true)}
            className="border border-black px-2.5 py-1 text-center bg-neutral-50 hover:bg-neutral-200 transition-colors cursor-pointer flex flex-col items-center"
          >
            <span className="font-bold text-red-600">3</span>
            <span className="text-[10px] font-semibold">ALERTS</span>
          </button>

          <button
            onClick={() => { handleLogout ? handleLogout() : navigate('/auth'); }}
            className="border border-black px-3 py-2 font-bold bg-neutral-100 hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            LOG OUT
          </button>
        </div>
      </header>

      {/* ─── MODAL ALERTS ────────────────────────────────────────────────────── */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => setShowAlertsModal(false)}>
          <div className="bg-white border-2 border-black p-5 max-w-sm w-full font-mono text-xs space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-black pb-2">
              <span className="font-bold text-sm">SYSTEM ALERTS (3)</span>
              <button onClick={() => setShowAlertsModal(false)} className="cursor-pointer font-bold">[X]</button>
            </div>
            <div className="space-y-2">
              <div className="p-2 border border-red-500/40 bg-red-50 text-red-800">
                <strong>[HIGH]</strong> Unit 804 inspected and certified VIP-ready.
              </div>
              <div className="p-2 border border-amber-500/40 bg-amber-50 text-amber-800">
                <strong>[INFO]</strong> 18 unassigned arrivals due in current shift.
              </div>
              <div className="p-2 border border-blue-500/40 bg-blue-50 text-blue-800">
                <strong>[SYNC]</strong> Key encoder #02 online and calibrated.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KHUNG NỘI DUNG CHÍNH (SIDEBAR + TERMINAL BODY) ─────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* MENU DỌC (SIDEBAR 4 NHÓM CHỨC NĂNG) */}
        <aside className="w-56 border-r border-black bg-white flex flex-col justify-between p-3 font-mono text-[11px] select-none flex-shrink-0">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5 font-sans">
                FRONT DESK &amp; ROOMS
              </p>
              <ul className="space-y-1">
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">11. Staff Auth / Lock</li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/room-types" className="text-inherit no-underline">12. Room Types</Link>
                </li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/rooms" className="text-inherit no-underline">13. Room Inventory</Link>
                </li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/staff" className="text-inherit no-underline">14. Staff Accounts</Link>
                </li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/so-do-phong" className="text-inherit no-underline">15. Room Map &amp; Grid</Link>
                </li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/bookings" className="text-inherit no-underline">16. Master Bookings</Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5 font-sans">
                OPERATIONS &amp; HOUSEKEEPING
              </p>
              <ul className="space-y-1">
                <li className="bg-neutral-200 border-l-2 border-black pl-1.5 font-bold text-black py-0.5">
                  17. Room Assignment &amp; Confirm
                </li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">18. Guest Check-In &amp; ID</li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">19. Extend Stay &amp; Room Move</li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">20. Guest Check-Out &amp; Minibar</li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/buong-phong" className="text-inherit no-underline">21. Housekeeping Kanban</Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5 font-sans">
                BILLING &amp; SERVICES
              </p>
              <ul className="space-y-1">
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">Folio &amp; Invoices</li>
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">
                  <Link to="/admin/services" className="text-inherit no-underline">Service Requests</Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5 font-sans">
                SETTINGS &amp; LOGS
              </p>
              <ul className="space-y-1">
                <li className="text-neutral-500 hover:text-black cursor-pointer py-0.5">Audit Logs &amp; Security</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-dashed border-black/40 pt-2 text-[10px] text-neutral-500">
            TERMINAL STATION #04 // SECURE
          </div>
        </aside>

        {/* NỘI DUNG TERMINAL WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ffffff]">
          {/* BANNER THÔNG BÁO LỖI NẾU CÓ */}
          {errorMessage && (
            <div className="border-2 border-black bg-red-100 p-2.5 font-mono text-xs text-red-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                <span className="font-bold">{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="cursor-pointer font-bold">[ĐÓNG]</button>
            </div>
          )}

          {successMessage && (
            <div className="border-2 border-black bg-emerald-100 p-2.5 font-mono text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                <span className="font-bold">{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="cursor-pointer font-bold">[ĐÓNG]</button>
            </div>
          )}

          {/* ─── 2. TIÊU ĐỀ & NÚT ĐIỀU PHỐI (ALLOCATION ENGINE) ────────────────── */}
          <div className="border border-black p-2.5 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span className="font-bold text-xs uppercase tracking-wide">
                OPERATIONS // ALLOCATION ENGINE // REF: #{bookingDossier?.ConfirmationCode || '#GH-2025-55198'}
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 ml-1">
                [ {bookingDossier?.AssignedRoomNumber ? `ASSIGNED ROOM: ${bookingDossier.AssignedRoomNumber}` : 'UNASSIGNED // DUE TODAY'} ]
              </span>

              {/* Selector chuyển nhanh booking khác */}
              {bookingsList.length > 1 && (
                <select
                  value={selectedBookingId}
                  onChange={(e) => {
                    setSelectedBookingId(e.target.value);
                    setSearchParams({ bookingId: e.target.value });
                  }}
                  className="border border-black text-[11px] px-2 py-0.5 ml-2 bg-neutral-50 font-mono cursor-pointer"
                >
                  {bookingsList.map((bk) => (
                    <option key={bk.BookingId} value={bk.BookingId}>
                      {bk.ConfirmationCode} - {bk.GuestName} ({bk.RoomTypeName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={handleAutoAllocate}
                className="border border-black px-3 py-1 font-bold flex items-center gap-1.5 bg-neutral-50 hover:bg-black hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                AUTO-ALLOCATE BEST MATCH
              </button>

              <button
                onClick={handleManualHold}
                className="border border-black px-3 py-1 font-bold bg-neutral-50 hover:bg-black hover:text-white transition-all cursor-pointer active:scale-95"
              >
                [ HOLD RESERVATION ]
              </button>

              <button
                onClick={() => window.print()}
                title="In hồ sơ điều phối"
                className="border border-black px-2 py-1 bg-neutral-50 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] align-middle">print</span>
              </button>
            </div>
          </div>

          {/* ─── GRID CHÍNH 2 CỘT (DOSSIER TRÁI vs ENGINE PHÒNG PHẢI) ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* CỘT TRÁI (5 CỘT): HỒ SƠ KHÁCH + TÀI CHÍNH + SPECIAL REQUESTS */}
            <div className="lg:col-span-5 space-y-3">
              {/* 3. HỒ SƠ KHÁCH (RESERVATION DOSSIER // GUEST PROFILE) */}
              <div className="border border-black p-3 bg-white space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    RESERVATION DOSSIER // GUEST PROFILE
                  </span>
                  <span className="border border-black px-1.5 py-0.5 text-[10px] font-bold">
                    TIER 2
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black tracking-tight uppercase">
                      {bookingDossier?.GuestName || 'SARAH CONNOR'}
                    </h2>
                    <p className="text-[10px] text-neutral-600 font-semibold">
                      VIP TIER: VIP-2 / BUSINESS CORPORATE
                    </p>
                  </div>
                  <div className="border border-black p-1 text-center bg-neutral-50 text-[10px]">
                    <span className="text-[9px] block text-neutral-500">CORP CODE</span>
                    <span className="font-bold">CYBR-984</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Contact Tel</span>
                    <span className="font-semibold">{bookingDossier?.GuestPhone || '+1 (555) 000-1984'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Email Addr</span>
                    <span className="font-semibold truncate block">{bookingDossier?.GuestEmail || 's.connor@sky.net'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Guest Count</span>
                    <span className="font-semibold">{bookingDossier?.Adults || 2} ADULTS // {bookingDossier?.Children || 0} CHILDREN</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Membership Ref</span>
                    <span className="font-semibold">#GH-MEM-77401</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-dashed border-neutral-300">
                  <div className="flex justify-between text-[10px] text-neutral-500 mb-0.5">
                    <span>PASSPORT VERIFICATION HASH</span>
                    <span className="font-bold text-neutral-800">AUTO-FETCHED</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200">
                    <div className="h-full bg-neutral-900 w-3/4" />
                  </div>
                </div>
              </div>

              {/* 4. THÔNG SỐ LƯU TRÚ & TÀI CHÍNH (STAY PARAMETERS & FINANCIALS) */}
              <div className="border border-black p-3 bg-white space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    STAY PARAMETERS &amp; FINANCIALS
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    CONF #{bookingDossier?.BookingId || '55198'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border border-black p-2 bg-neutral-50 text-[11px]">
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Check-In</span>
                    <span className="font-bold block">{fmtDateMonth(bookingDossier?.CheckInDate)}</span>
                    <span className="text-[10px] text-neutral-600">15:00 LST (EARLY REQ)</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Check-Out</span>
                    <span className="font-bold block">{fmtDateMonth(bookingDossier?.CheckOutDate)}</span>
                    <span className="text-[10px] text-neutral-600">11:00 LST (STANDARD)</span>
                  </div>
                </div>

                <div className="border border-black p-2 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Booked Category</span>
                    <span className="font-bold">{bookingDossier?.RoomTypeName || 'DELUXE KING SUITE (DLX-KNG)'}</span>
                  </div>
                  <div className="border border-black px-2 py-0.5 text-[10px] font-bold">
                    {bookingDossier?.NumberOfNights || 2} NIGHTS
                  </div>
                </div>

                {/* Bảng chi tiết Folio */}
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">BASE RATE</span>
                    <span>{fmtMoney(bookingDossier?.baseRate || 240)} / NT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">TAXES &amp; RESORT FEES</span>
                    <span>{fmtMoney(bookingDossier?.taxesAndFees || 62.4)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-black pt-1">
                    <span>TOTAL ESTIMATED FOLIO</span>
                    <span>{fmtMoney(bookingDossier?.totalFolio || 542.4)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>DEPOSIT PAID (CARD ON FILE)</span>
                    <span className="text-emerald-700">-{fmtMoney(bookingDossier?.depositPaid || 108.48)} (20%)</span>
                  </div>
                  <div className="flex justify-between font-black text-sm bg-neutral-100 p-1.5 border border-black mt-1">
                    <span>BALANCE DUE UPON ARRIVAL</span>
                    <span className="text-black">{fmtMoney(bookingDossier?.balanceDue || 433.92)}</span>
                  </div>
                </div>
              </div>

              {/* 5. YÊU CẦU ĐẶC BIỆT & LỊCH SỬ LƯU TRÚ (SPECIAL REQUESTS & STAY HISTORY) */}
              <div className="border border-black p-3 bg-white space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    SPECIAL REQUESTS &amp; STAY HISTORY
                  </span>
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                </div>

                {/* Danh sách tiêu chí đặc biệt */}
                <div className="space-y-1.5 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeRequests.req_high_floor}
                      onChange={() => toggleRequest('req_high_floor')}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="font-bold">HIGH FLOOR PREFERENCE (LEVEL 08+)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeRequests.req_quiet}
                      onChange={() => toggleRequest('req_quiet')}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="font-bold">AWAY FROM ELEVATOR BANK // QUIET CORNER</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeRequests.req_nonsmoking}
                      onChange={() => toggleRequest('req_nonsmoking')}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="font-bold">NON-SMOKING WING MANDATORY</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeRequests.req_allergy}
                      onChange={() => toggleRequest('req_allergy')}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="font-bold">FEATHER-FREE / HYPOALLERGENIC BEDDING</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeRequests.req_ocean}
                      onChange={() => toggleRequest('req_ocean')}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="font-bold">DIRECT OCEAN FRONT ASPECT</span>
                  </label>
                </div>

                {/* Lịch sử lưu trú */}
                <div className="border border-black p-2 bg-neutral-50 text-[10px] space-y-1 mt-2">
                  <span className="font-bold block text-neutral-600 uppercase">PREVIOUS STAY AUDIT:</span>
                  <p className="text-neutral-800 leading-relaxed">
                    3 STAYS RECORDED AT GRAND HORIZON. PREFERS WING B, HIGH OCEAN ASPECT. ZERO INCIDENT LOGS. LAST STAY OCT 2024 (UNIT 804 ASSIGNED).
                  </p>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (7 CỘT): BỘ LỌC + DANH SÁCH GỢI Ý + SƠ ĐỒ TẦNG CAD */}
            <div className="lg:col-span-7 space-y-3">
              {/* 6. BỘ LỌC PHÒNG GỢI Ý (FILTER & COMPATIBILITY ENGINE) */}
              <div className="border border-black p-3 bg-white space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    FILTER &amp; COMPATIBILITY ENGINE
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    CRITERIA WEIGHT: {criteriaWeight}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">TARGET FLOOR</label>
                    <select
                      value={filterFloor}
                      onChange={(e) => setFilterFloor(e.target.value)}
                      className="w-full border border-black px-2 py-1 bg-white font-mono text-xs cursor-pointer"
                    >
                      <option value="high">ANY HIGH FLOOR (08-14)</option>
                      <option value="mid">MID FLOOR (04-07)</option>
                      <option value="low">LOW FLOOR (01-03)</option>
                      <option value="all">ALL FLOORS (01-14)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">HK STATUS</label>
                    <select
                      value={filterHK}
                      onChange={(e) => setFilterHK(e.target.value)}
                      className="w-full border border-black px-2 py-1 bg-white font-mono text-xs cursor-pointer"
                    >
                      <option value="clean_inspected">CLEAN &amp; INSPECTED ONLY</option>
                      <option value="clean">ALL CLEAN VACANT</option>
                      <option value="all">ALL STATUSES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase mb-1">VIEW ASPECT</label>
                    <select
                      value={filterView}
                      onChange={(e) => setFilterView(e.target.value)}
                      className="w-full border border-black px-2 py-1 bg-white font-mono text-xs cursor-pointer"
                    >
                      <option value="ocean">OCEAN FRONT (WING B)</option>
                      <option value="city">CITY SKYLINE</option>
                      <option value="all">ANY VIEW</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 7. DANH SÁCH PHÒNG GỢI Ý (RECOMMENDED AVAILABLE UNITS) */}
              <div className="border border-black p-3 bg-white space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    RECOMMENDED AVAILABLE UNITS ({recommendedRooms.length} MATCHES FOUND)
                  </span>
                  <div className="border border-black px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 bg-neutral-50">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    REALTIME INVENTORY
                  </div>
                </div>

                {loadingRooms ? (
                  <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                    <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                    <p className="mt-1">SCANNING COMPATIBILITY MATRIX...</p>
                  </div>
                ) : recommendedRooms.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-black/40 text-neutral-500 text-xs">
                    Không có phòng trống nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {recommendedRooms.map((room) => {
                      const isSelected = selectedRoomId === room.RoomId;
                      const isUpgrade = room.IsUpgrade;

                      return (
                        <div
                          key={room.RoomId}
                          onClick={() => handleSelectRoom(room, true)}
                          className={`border p-2.5 transition-all cursor-pointer space-y-1.5
                            ${isSelected
                              ? 'border-2 border-black bg-neutral-50 shadow-sm'
                              : 'border-black/60 bg-white hover:border-black'}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="border border-black bg-black text-white px-2 py-0.5 font-black text-sm">
                                ROOM {room.RoomNumber}
                              </div>
                              <div>
                                <span className="font-bold text-xs block">{room.RoomTypeName}</span>
                                <span className="text-[10px] text-neutral-500">
                                  {room.Wing} // FLOOR {String(room.Floor).padStart(2, '0')} // {room.Corner}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-0.5 text-[11px] font-bold border border-black
                                ${room.MatchPercent >= 90 ? 'bg-black text-white' : 'bg-neutral-200 text-black'}`}>
                                MATCH: {room.MatchPercent}% COMPATIBLE
                              </div>
                            </div>
                          </div>

                          {isUpgrade && (
                            <div className="border border-dashed border-black px-2 py-0.5 text-[10px] font-bold bg-neutral-100 flex justify-between">
                              <span>[ UPGRADE CANDIDATE // COMPLIMENTARY ELIGIBLE ]</span>
                              <span>$0.00 DIFFERENTIAL (VIP-2 BENEFIT)</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 text-[10px] text-neutral-600 gap-1 pt-0.5">
                            <div>
                              <span className="text-neutral-400 block text-[9px]">INSPECTION TIMELOG</span>
                              <span>{room.InspectionTimelog}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-[9px]">UNIT ATTRIBUTES</span>
                              <span className="truncate block">{room.UnitAttributes}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-dashed border-neutral-300">
                            <label className="flex items-center gap-1.5 text-[10px] text-neutral-700">
                              <input type="checkbox" checked={room.SatisfiedCount >= 3} readOnly className="w-3 h-3 accent-black" />
                              <span>ALL GUEST PREFERENCES SATISFIED ({room.SatisfiedCount}/{room.TotalCriteria})</span>
                            </label>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRoom(room, true);
                              }}
                              className={`px-3 py-1 font-bold text-xs border border-black transition-all cursor-pointer
                                ${isSelected
                                  ? 'bg-black text-white'
                                  : 'bg-white hover:bg-neutral-200 text-black'}`}
                            >
                              {isSelected ? `[ ACTIVE SELECTION // ${room.RoomNumber} ]` : isUpgrade ? '[ OFFER UPGRADE + ASSIGN ]' : '[ SELECT UNIT ]'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 8. SƠ ĐỒ TẦNG CAD (FLOOR ARCHITECTURAL CAD SCHEMATIC) */}
              <div className="border border-black p-3 bg-white space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <span className="font-bold text-[11px] tracking-wider uppercase">
                    FLOOR ARCHITECTURAL CAD SCHEMATIC
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    FL-{String(activeUnit?.Floor || 8).padStart(2, '0')} // SCALE 1:200
                  </span>
                </div>

                {/* Bản vẽ kiến trúc CAD SVG tương tác */}
                <div className="border border-black bg-neutral-50 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                  <svg className="w-full max-w-lg h-28" viewBox="0 0 500 120">
                    {/* Đường viền tầng tổng thể */}
                    <rect x="10" y="10" width="480" height="100" fill="none" stroke="#000000" strokeWidth="1" />
                    <rect x="25" y="25" width="450" height="70" fill="none" stroke="#000000" strokeWidth="0.8" strokeDasharray="4 2" />

                    {/* Hộp hành lang trung tâm */}
                    <line x1="25" y1="60" x2="475" y2="60" stroke="#000000" strokeWidth="0.8" />

                    {/* Các phòng ở cánh Wing B */}
                    <rect x="30" y="28" width="60" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="60" y="47" textAnchor="middle" fontSize="9" fontFamily="monospace">802</text>

                    {/* Phòng đang chọn (ACTIVE UNIT 804) */}
                    <rect x="95" y="28" width="80" height="30" fill="#000000" stroke="#000000" strokeWidth="1.5" />
                    <text x="135" y="47" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff" fontFamily="monospace">
                      {activeUnit?.RoomNumber || '804'} ★
                    </text>

                    <rect x="180" y="28" width="60" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="210" y="47" textAnchor="middle" fontSize="9" fontFamily="monospace">806</text>

                    {/* Thang máy & Cầu thang */}
                    <rect x="245" y="28" width="50" height="30" fill="#e5e5e5" stroke="#000000" strokeWidth="0.8" />
                    <text x="270" y="47" textAnchor="middle" fontSize="8" fontFamily="monospace">ELEV</text>

                    <rect x="300" y="28" width="70" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="335" y="47" textAnchor="middle" fontSize="9" fontFamily="monospace">808</text>

                    <rect x="375" y="28" width="90" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="420" y="47" textAnchor="middle" fontSize="9" fontFamily="monospace">810</text>

                    {/* Dãy phòng đối diện */}
                    <rect x="30" y="63" width="75" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="67" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace">801</text>

                    <rect x="110" y="63" width="75" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="147" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace">803</text>

                    <rect x="190" y="63" width="75" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="227" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace">805</text>

                    <rect x="270" y="63" width="75" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="307" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace">807</text>

                    <rect x="350" y="63" width="115" height="30" fill="none" stroke="#000000" strokeWidth="0.6" />
                    <text x="407" y="82" textAnchor="middle" fontSize="9" fontFamily="monospace">809 (SUITE)</text>
                  </svg>

                  <div className="text-[10px] font-bold text-center mt-1 border border-black px-2 py-0.5 bg-white">
                    [ ARCHITECTURAL WING B - LEVEL {String(activeUnit?.Floor || 8).padStart(2, '0')} SCHEMATIC // HIGHLIGHTING UNIT {activeUnit?.RoomNumber || '804'} ]
                  </div>
                </div>

                {/* Thông số kỹ thuật phòng */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="border border-black p-1.5 bg-neutral-50">
                    <span className="text-neutral-500 block text-[9px] uppercase">TOTAL AREA</span>
                    <span className="font-bold text-xs">{activeUnit?.AreaSqm || 54} M²</span>
                  </div>

                  <div className="border border-black p-1.5 bg-neutral-50">
                    <span className="text-neutral-500 block text-[9px] uppercase">BED CONFIG</span>
                    <span className="font-bold text-xs">{activeUnit?.BedConfig || '1 KING (200x200)'}</span>
                  </div>

                  <div className="border border-black p-1.5 bg-neutral-50">
                    <span className="text-neutral-500 block text-[9px] uppercase">ADJOINING</span>
                    <span className="font-bold text-xs">NONE (ISOLATED)</span>
                  </div>

                  <div className="border border-black p-1.5 bg-neutral-50">
                    <span className="text-neutral-500 block text-[9px] uppercase">KEY STATION</span>
                    <span className="font-bold text-xs">ENCODER READY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 9. THANH XÁC NHẬN GÁN PHÒNG (CONFIRMATION & LOCK PENDING ACTION BAR) ── */}
          <div className="border-2 border-black p-3.5 bg-white font-mono text-xs space-y-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white font-black text-xs px-2 py-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  LOCK PENDING
                </span>
                <span className="font-bold text-sm">
                  ASSIGNED TO: ROOM {activeUnit?.RoomNumber || '804'} ({activeUnit?.Wing || 'WING B'}, FL {String(activeUnit?.Floor || 8).padStart(2, '0')}) // {activeUnit?.RoomTypeName || 'DELUXE KING SUITE'}
                </span>
              </div>

              <div className="border border-black px-3 py-1 font-bold text-xs bg-neutral-50">
                {isHoldExpired ? (
                  <span className="text-red-600">ALLOCATION EXPIRED!</span>
                ) : (
                  <span>ALLOCATION EXPIRES IN {formatTimer(secondsRemaining)} UNLESS COMMITTED</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Checkboxes gửi thông báo */}
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendSmsEmail}
                    onChange={(e) => setSendSmsEmail(e.target.checked)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  <span>SEND ALLOCATION SMS &amp; EMAIL TO GUEST</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyHousekeeping}
                    onChange={(e) => setNotifyHousekeeping(e.target.checked)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  <span>NOTIFY HOUSEKEEPING VIP ARRIVAL</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preProgramKeycard}
                    onChange={(e) => setPreProgramKeycard(e.target.checked)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  <span>PRE-PROGRAM MOBILE KEYCARD PASS</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHeldRoom(null);
                    setHoldExpiresAt(null);
                    setSelectedRoomId(null);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className="border border-black px-4 py-2 font-bold bg-neutral-100 hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  [ CANCEL / REVERT ]
                </button>

                <button
                  type="button"
                  disabled={confirming || isHoldExpired || !selectedRoomId}
                  onClick={() => handleConfirmAllocation(true)}
                  className="border-2 border-black px-5 py-2 font-bold bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {confirming ? 'COMMITTING TO PMS...' : 'CONFIRM ALLOCATION & PROCEED TO CHECK-IN'}
                </button>
              </div>
            </div>

            {/* Dòng metadata trạng thái terminal dưới đáy */}
            <div className="pt-2 border-t border-neutral-300 text-[10px] text-neutral-500 flex flex-wrap justify-between">
              <span>ALLOC_NODE: #US-EAST-09 // LATENCY: 18MS // PMS-CORE COMPLIANT // LOCK-LEASE: #{holdToken || 'LL-44821'}</span>
              <span>TERMINAL: STA-04 // OPERATOR: {user?.fullName?.toUpperCase() || 'SARAH JENKINS'} (ID: 4092) // ENCRYPTION: SHA-256 WIRE-ONLY</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
