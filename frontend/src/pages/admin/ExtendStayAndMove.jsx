import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import {
  getInHouseStaysApi,
  getStayDossierApi,
  previewStayExtensionApi,
  confirmStayExtensionApi,
  getReplacementRoomsApi,
  relocateStayRoomApi,
} from '../../api/stayApi';

// Tiện ích format tiền tệ VND
const fmtMoney = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

// Tiện ích format ngày hiển thị (VD: 24/10/2026 hoặc 24 Thg 10, 2026)
const fmtDateDisplay = (d) => {
  if (!d) return '---';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function ExtendStayAndMove() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stayId: paramStayId } = useParams();

  // ─── Trạng thái hệ thống ──────────────────────────────────────────────────
  const [systemTime, setSystemTime] = useState(new Date());
  const [activeMode, setActiveMode] = useState('EXTEND'); // 'EXTEND' (Mode 01) | 'RELOCATE' (Mode 02)

  // ─── Danh sách khách đang lưu trú (In-house) ───────────────────────────────
  const [inHouseGuests, setInHouseGuests] = useState([]);
  const [selectedStayId, setSelectedStayId] = useState(paramStayId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // ─── Hồ sơ lưu trú đang chọn (Dossier) ────────────────────────────────────
  const [stayDossier, setStayDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // ─── MODE 01: Gia hạn lưu trú (Stay Extension) ───────────────────────────
  const [additionalNights, setAdditionalNights] = useState(1);
  const [customCheckoutDate, setCustomCheckoutDate] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  // ─── MODE 02: Đổi phòng (Room Relocation) ─────────────────────────────────
  const [relocateReason, setRelocateReason] = useState('HVAC / Climate Control Noise Complaint');
  const [workOrderMemo, setWorkOrderMemo] = useState(
    'Khách phản ánh máy lạnh kêu ồn vào buổi sáng. Kỹ thuật đã kiểm tra và yêu cầu đổi phòng để bảo trì motor.'
  );
  const [bellhopDispatched, setBellhopDispatched] = useState(true);
  const [guestSelfTransfer, setGuestSelfTransfer] = useState(false);
  const [voidCurrentKeys, setVoidCurrentKeys] = useState(true);
  const [flagRoomDirtyMaintenance, setFlagRoomDirtyMaintenance] = useState(true);
  const [suppressMinibar, setSuppressMinibar] = useState(false);

  const [floorFilter, setFloorFilter] = useState('ALL');
  const [roomClassFilter, setRoomClassFilter] = useState('ALL');
  const [replacementRooms, setReplacementRooms] = useState([]);
  const [selectedTargetRoom, setSelectedTargetRoom] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // ─── Thao tác thực thi (Execution & Key Encoder) ──────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyEncodingStep, setKeyEncodingStep] = useState(0); // 0: Idle, 1: Connecting, 2: Writing, 3: Done
  const [toastMessage, setToastMessage] = useState(null);

  // Cập nhật đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const systemTimeStr = useMemo(() => {
    const p = (n) => String(n).padStart(2, '0');
    return `${p(systemTime.getHours())}:${p(systemTime.getMinutes())}:${p(systemTime.getSeconds())}`;
  }, [systemTime]);

  // Tải danh sách khách đang lưu trú
  const fetchInHouseList = useCallback(async (query = '') => {
    setLoadingList(true);
    const res = await getInHouseStaysApi(query);
    if (res.success && res.data) {
      setInHouseGuests(res.data);
      if (!selectedStayId && res.data.length > 0) {
        setSelectedStayId(res.data[0].StayId);
      }
    }
    setLoadingList(false);
  }, [selectedStayId]);

  useEffect(() => {
    fetchInHouseList(searchQuery);
  }, [fetchInHouseList, searchQuery]);

  // Tải chi tiết hồ sơ Stay đang chọn
  const loadDossier = useCallback(async (stayId) => {
    if (!stayId) return;
    setLoadingDossier(true);
    setConflictError(null);
    setPreviewData(null);
    setSelectedTargetRoom(null);

    const res = await getStayDossierApi(stayId);
    if (res.success && res.data) {
      setStayDossier(res.data);
      const curCheck = new Date(res.data.currentCheckout || res.data.ExpectedCheckOut || res.data.CheckOutDate);
      curCheck.setDate(curCheck.getDate() + 1);
      const nextDateStr = curCheck.toISOString().slice(0, 10);
      setCustomCheckoutDate(nextDateStr);
      setAdditionalNights(1);
    }
    setLoadingDossier(false);
  }, []);

  useEffect(() => {
    if (selectedStayId) {
      loadDossier(selectedStayId);
    }
  }, [selectedStayId, loadDossier]);

  // Chạy kiểm tra xung đột lịch & tính phụ thu (Mode 01)
  const runExtensionPreview = useCallback(async (nights, targetDate) => {
    if (!selectedStayId || !stayDossier) return;
    setPreviewLoading(true);
    setConflictError(null);

    const payload = {
      additionalNights: nights,
      requestedCheckoutAt: targetDate || undefined,
    };

    const res = await previewStayExtensionApi(selectedStayId, payload);
    setPreviewLoading(false);

    if (res.success && res.data) {
      setPreviewData(res.data);
      setConflictError(null);
    } else {
      setPreviewData(null);
      setConflictError({
        errorCode: res.errorCode || 'EXTEND_0003_ROOM_CONFLICT',
        message: res.message || 'Phòng đã có khách hoặc được giữ cho lượt lưu trú kế tiếp trong khoảng thời gian này',
        data: res.data || {},
      });
    }
  }, [selectedStayId, stayDossier]);

  useEffect(() => {
    if (activeMode === 'EXTEND' && stayDossier) {
      runExtensionPreview(additionalNights, customCheckoutDate);
    }
  }, [activeMode, additionalNights, customCheckoutDate, stayDossier, runExtensionPreview]);

  // Tải danh sách phòng thay thế khi ở Mode 02
  const loadReplacementRooms = useCallback(async () => {
    if (!selectedStayId) return;
    setLoadingRooms(true);
    const res = await getReplacementRoomsApi(selectedStayId, {
      floor: floorFilter,
      roomClass: roomClassFilter,
    });
    if (res.success && res.data) {
      setReplacementRooms(res.data);
      if (res.data.length > 0 && !selectedTargetRoom) {
        setSelectedTargetRoom(res.data[0]);
      }
    }
    setLoadingRooms(false);
  }, [selectedStayId, floorFilter, roomClassFilter, selectedTargetRoom]);

  useEffect(() => {
    if (activeMode === 'RELOCATE') {
      loadReplacementRooms();
    }
  }, [activeMode, loadReplacementRooms]);

  // Xử lý nút thay đổi số ngày nhanh (+1, +2, +3, -1)
  const handleQuickAddDays = (delta) => {
    if (!stayDossier) return;
    const curCheckout = new Date(stayDossier.currentCheckout || stayDossier.CheckOutDate);
    const newNights = Math.max(1, additionalNights + delta);
    setAdditionalNights(newNights);

    const newTargetDate = new Date(curCheckout);
    newTargetDate.setDate(newTargetDate.getDate() + newNights);
    setCustomCheckoutDate(newTargetDate.toISOString().slice(0, 10));
  };

  const handleCustomDateChange = (e) => {
    const val = e.target.value;
    setCustomCheckoutDate(val);
    if (stayDossier && val) {
      const curCheckout = new Date(stayDossier.currentCheckout || stayDossier.CheckOutDate);
      const chosen = new Date(val);
      const diffDays = Math.ceil((chosen - curCheckout) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setAdditionalNights(diffDays);
      }
    }
  };

  // Xác nhận gia hạn lưu trú (Confirm Extension)
  const handleConfirmExtension = async () => {
    if (!selectedStayId || !previewData) return;
    setSubmitting(true);

    const payload = {
      quoteId: previewData.quoteId,
      requestedCheckoutAt: previewData.requestedCheckout,
      additionalNights: previewData.additionalNights,
      totalAmount: previewData.netFolioAdjustment,
      memo: `Gia hạn +${previewData.additionalNights} đêm`,
    };

    const res = await confirmStayExtensionApi(selectedStayId, payload);
    setSubmitting(false);

    if (res.success) {
      setToastMessage({
        type: 'success',
        text: res.message || `Đã gia hạn lưu trú đến ${previewData.requestedCheckout}. Khoản phí đã được cập nhật vào hóa đơn.`,
      });
      await loadDossier(selectedStayId);
      await fetchInHouseList(searchQuery);
    } else {
      setToastMessage({
        type: 'error',
        text: res.message || 'Lỗi khi xác nhận gia hạn.',
      });
    }
  };

  // Xác nhận đổi phòng (Confirm Room Move)
  const handleConfirmRelocate = async () => {
    if (!selectedStayId || !selectedTargetRoom) return;
    setSubmitting(true);

    const payload = {
      targetRoomId: selectedTargetRoom.RoomId,
      reason: relocateReason,
      memo: workOrderMemo,
      bellhopDispatched,
      voidOldKeys: voidCurrentKeys,
      flagOldRoomMaintenance: flagRoomDirtyMaintenance,
    };

    const res = await relocateStayRoomApi(selectedStayId, payload);
    setSubmitting(false);

    if (res.success) {
      setToastMessage({
        type: 'success',
        text: res.message || `Đã chuyển khách sang Phòng ${selectedTargetRoom.RoomNumber} thành công!`,
      });
      await loadDossier(selectedStayId);
      await fetchInHouseList(searchQuery);
    } else {
      setToastMessage({
        type: 'error',
        text: res.message || 'Lỗi khi xử lý đổi phòng.',
      });
    }
  };

  // Giả lập mã hóa thẻ RFID
  const handleEncodeKeys = () => {
    setShowKeyModal(true);
    setKeyEncodingStep(1);
    setTimeout(() => {
      setKeyEncodingStep(2);
      setTimeout(() => {
        setKeyEncodingStep(3);
      }, 900);
    }, 800);
  };

  return (
    <AdminLayout
      title="Gia Hạn Lưu Trú & Đổi Phòng"
      breadcrumb={[{ label: "Lễ Tân & Tiền Sảnh", to: "/admin/le-tan" }, { label: "Gia Hạn & Đổi Phòng" }]}
    >
      <div className="space-y-6 pb-12 text-[#203044]">

        {/* ─── TOAST NOTIFICATION ────────────────────────────────────────────── */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-600 shadow-emerald-900/20'
                : 'bg-rose-900 text-rose-100 border-rose-600 shadow-rose-900/20'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-3 p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* ─── GRAND HORIZON HERO HEADER ───────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#131b2e] via-[#203044] to-[#131b2e] rounded-3xl p-6 text-white shadow-xl border border-white/10 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-admin-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-32 -bottom-20 w-80 h-80 bg-[#b9a277]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-admin-primary/20 text-emerald-300 border border-admin-primary/40">
                  GRAND HORIZON PMS • FRONT DESK TERMINAL
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#b9a277]/20 text-[#ffd985] border border-[#b9a277]/30">
                  REF #GH-2026
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
                Gia Hạn Lưu Trú &amp; Điều Chuyển Phòng
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl font-sans">
                Kiểm tra xung đột lịch với khách kế tiếp, tự động tính phụ thu phòng theo biểu giá hiện hành và đồng bộ hóa đơn khách hàng tức thời.
              </p>
            </div>

            {/* Badges thông tin hệ thống */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-300">HỆ THỐNG:</span>
                <strong className="font-mono text-emerald-300 font-bold">{systemTimeStr}</strong>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#ffd985]">hotel</span>
                <span className="text-slate-300">CÔNG SUẤT:</span>
                <strong className="text-white font-bold">86.4% (124/144)</strong>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-admin-primary">badge</span>
                <span className="text-slate-300">LỄ TÂN:</span>
                <strong className="text-white font-bold">{user?.fullName || 'Sarah Jenkins (#4092)'}</strong>
              </div>
            </div>
          </div>

          {/* Dải điều hướng chế độ Mode Tabs */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-black/30 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActiveMode('EXTEND')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'EXTEND'
                    ? 'bg-admin-primary text-[#002114] shadow-lg shadow-admin-primary/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-base">more_time</span>
                <span>MODE 01: GIA HẠN LƯU TRÚ (EXTEND STAY)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('RELOCATE')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'RELOCATE'
                    ? 'bg-admin-primary text-[#002114] shadow-lg shadow-admin-primary/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                <span>MODE 02: ĐIỀU CHUYỂN PHÒNG (ROOM RELOCATION)</span>
              </button>
            </div>

            <div className="text-xs text-slate-300 font-sans flex items-center gap-2">
              <span className="text-emerald-400 font-bold">● PMS Real-Time Sync</span>
              <span>• Khóa giao dịch nguyên tử chống trùng lịch</span>
            </div>
          </div>
        </div>

        {/* ─── THANH CHỌN NHANH KHÁCH ĐANG Ở (IN-HOUSE GUEST CAROUSEL) ─────── */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-admin-primary">
                <span className="material-symbols-outlined text-xl">luggage</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#203044]">
                  Danh Sách Khách Đang Lưu Trú Tại Khách Sạn ({inHouseGuests.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Chọn một phòng để thực hiện thao tác gia hạn hoặc đổi phòng trực tiếp
                </p>
              </div>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined text-slate-400 absolute left-3.5 top-2.5 text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm số phòng, tên khách, mã REF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[#203044] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-admin-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Băng danh sách khách thẻ chip */}
          {loadingList ? (
            <div className="flex items-center justify-center p-8 text-xs text-slate-500 gap-2">
              <span className="material-symbols-outlined animate-spin text-admin-primary text-xl">progress_activity</span>
              Đang đồng bộ danh sách lưu trú từ cơ sở dữ liệu Grand Horizon...
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {inHouseGuests.map((g) => {
                const isSelected = g.StayId === selectedStayId;
                return (
                  <button
                    key={g.StayId}
                    onClick={() => setSelectedStayId(g.StayId)}
                    className={`flex-shrink-0 text-left w-72 p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-admin-primary/10 border-admin-primary shadow-md shadow-admin-primary/10 ring-2 ring-admin-primary'
                        : 'bg-slate-50 border-slate-200/80 hover:border-slate-400 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#203044] text-white">
                        Phòng {g.RoomNumber}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        #{g.ConfirmationCode}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-[#203044] truncate">{g.GuestName}</div>
                    <div className="text-xs text-slate-500 truncate mb-2">{g.RoomTypeName}</div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/70">
                      <span className="text-slate-600 font-medium">
                        Trả: <strong className="text-[#203044]">{fmtDateDisplay(g.ExpectedCheckOut || g.CheckOutDate)}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#b9a277]/20 text-[#a68e64]">
                        {g.VipTier}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── GRID NỘI DUNG CHÍNH (HAI CỘT CHUẨN THIẾT KẾ GRAND HORIZON) ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ══════════════════════════════════════════════════════════════════════
              CỘT TRÁI (5 COLS): HỒ SƠ LƯU TRÚ HIỆN TẠI (CURRENT OCCUPANCY DOSSIER)
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6">

            {/* Box 1: Current Occupancy Dossier */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#203044]/10 text-[#203044] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">bedroom_parent</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#203044]">Hồ Sơ Lưu Trú Hiện Tại</h3>
                    <p className="text-xs text-slate-500">Current Occupancy Dossier</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ĐANG LƯU TRÚ
                </span>
              </div>

              {loadingDossier ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                  Đang đồng bộ hồ sơ phòng từ PMS...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Schematic / Room Visual Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Sơ Đồ Phòng Vật Lý</span>
                      <span className="font-mono text-xs font-extrabold text-admin-primary">
                        FL_{String(stayDossier?.Floor || '04').padStart(2, '0')}_WING [P.{stayDossier?.RoomNumber || '---'}]
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-serif font-black text-[#203044]">
                        Phòng {stayDossier?.RoomNumber || '---'}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        (Tầng {stayDossier?.Floor || '---'} • Tòa Biển)
                      </span>
                    </div>
                    <p className="text-xs text-[#b9a277] font-bold">
                      {stayDossier?.RoomTypeName || 'Deluxe Room'}
                    </p>
                  </div>

                  {/* Bảng chi tiết phòng */}
                  <div className="space-y-3 text-xs divide-y divide-slate-100">
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Họ &amp; Tên Khách Hàng:</span>
                      <strong className="text-sm font-bold text-[#203044]">{stayDossier?.GuestName || '---'}</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Thời Gian Lưu Trú:</span>
                      <strong className="text-[#203044] font-semibold">
                        {fmtDateDisplay(stayDossier?.ActualCheckIn || stayDossier?.CheckInDate)} ➔{' '}
                        <span className="text-admin-primary font-bold">{fmtDateDisplay(stayDossier?.currentCheckout || stayDossier?.CheckOutDate)}</span>
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Đơn Giá Phòng Áp Dụng:</span>
                      <strong className="text-[#203044] font-semibold">
                        {fmtMoney(stayDossier?.BasePrice || 1500000)} / Đêm
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Số Dư Hóa Đơn (Folio Balance):</span>
                      <strong className="text-rose-600 font-bold text-sm">
                        {fmtMoney(stayDossier?.outstandingBalance || 0)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Hạng Hội Viên (Loyalty Tier):</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#b9a277]/20 text-[#a68e64]">
                        {stayDossier?.VipTier || 'Silver Resident'}
                      </span>
                    </div>
                  </div>

                  {/* Active Charge Stream Indicator */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                      <span>Dòng hạch toán tài khoản Folio</span>
                      <span className="text-emerald-600 font-bold">100% Hoạt động</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div className="h-full bg-admin-primary w-4/5 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Dispatch Form (Hiện khi ở Mode 02) */}
            {activeMode === 'RELOCATE' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">sync_problem</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#203044]">Lý Do &amp; Biên Bản Điều Chuyển Phòng</h3>
                    <p className="text-[11px] text-slate-500">Relocation Dispatch Form (Section 02-B)</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-[#203044] block mb-1.5">Nguyên Nhân Đổi Phòng:</label>
                    <select
                      value={relocateReason}
                      onChange={(e) => setRelocateReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary"
                    >
                      <option value="HVAC / Climate Control Noise Complaint">Sự cố máy lạnh / Tiếng ồn điều hòa (HVAC Defect)</option>
                      <option value="Plumbing / Water Pressure Defect">Sự cố áp lực nước / Ống nước (Plumbing Issue)</option>
                      <option value="Stay Extension Schedule Conflict">Trùng lịch đặt phòng kế tiếp (Extension Conflict Swap)</option>
                      <option value="VIP Guest Upgrade Courtesy">Nâng cấp phòng thiện chí cho khách VIP (Upgrade Courtesy)</option>
                      <option value="Housekeeping Deep Clean Required">Yêu cầu dọn sâu buồng phòng (Deep Clean Required)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#203044] block mb-1.5">Biên Bản Ca Trực &amp; Ghi Chú Kỹ Thuật:</label>
                    <textarea
                      rows={3}
                      value={workOrderMemo}
                      onChange={(e) => setWorkOrderMemo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary placeholder:text-slate-400"
                      placeholder="Ghi rõ tình trạng phòng và xác nhận từ đội kỹ thuật..."
                    />
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      * Tự động lưu vào Ticket Sự cố #TCK-88102
                    </div>
                  </div>

                  {/* Hành lý & Vận chuyển */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="font-bold text-[#203044] text-xs block">Chỉ thị Vận chuyển Hành lý (Porter/Bellhop):</span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bellhopDispatched}
                        onChange={(e) => {
                          setBellhopDispatched(e.target.checked);
                          if (e.target.checked) setGuestSelfTransfer(false);
                        }}
                        className="rounded border-slate-300 text-admin-primary focus:ring-admin-primary"
                      />
                      <span className="font-semibold text-slate-700">Điều động nhân viên Bellhop hỗ trợ chuyển hành lý</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guestSelfTransfer}
                        onChange={(e) => {
                          setGuestSelfTransfer(e.target.checked);
                          if (e.target.checked) setBellhopDispatched(false);
                        }}
                        className="rounded border-slate-300 text-admin-primary focus:ring-admin-primary"
                      />
                      <span className="text-slate-600">Khách tự chuyển phòng (chỉ bàn giao thẻ khóa mới)</span>
                    </label>
                  </div>

                  {/* Ràng buộc thẻ & Kho phòng */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="font-bold text-[#203044] text-xs block">Ràng buộc Thẻ Khóa &amp; Kho Phòng:</span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={voidCurrentKeys}
                        onChange={(e) => setVoidCurrentKeys(e.target.checked)}
                        className="rounded border-slate-300 text-admin-primary focus:ring-admin-primary"
                      />
                      <span className="font-semibold text-slate-700">Vô hiệu hóa thẻ phòng cũ ngay sau khi phát thẻ mới</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flagRoomDirtyMaintenance}
                        onChange={(e) => setFlagRoomDirtyMaintenance(e.target.checked)}
                        className="rounded border-slate-300 text-admin-primary focus:ring-admin-primary"
                      />
                      <span className="font-semibold text-slate-700">Đánh dấu phòng cũ là Cần Dọn Dẹp / Bảo Trì (Dirty/OOO)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              CỘT PHẢI (7 COLS): TÙY THEO CHẾ ĐỘ MODE ĐANG CHỌN
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* ─────────────────────────────────────────────────────────────────
                MODE 01: GIA HẠN LƯU TRÚ & KIỂM TRA XUNG ĐỘT
                ───────────────────────────────────────────────────────────────── */}
            {activeMode === 'EXTEND' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-admin-primary/15 text-admin-primary flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">event_upcoming</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#203044]">Tham Số Gia Hạn Lưu Trú</h3>
                      <p className="text-xs text-slate-500">Stay Duration Extension &amp; Tariff Engine</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ffd985]/30 text-[#855f13] border border-[#ffd985]">
                    TÍNH PHỤ THU TỰ ĐỘNG
                  </span>
                </div>

                {/* Timeline chọn ngày gia hạn */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Lịch Trình Trả Phòng Mới
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="line-through text-slate-400 font-semibold">
                        {fmtDateDisplay(stayDossier?.currentCheckout || stayDossier?.CheckOutDate)}
                      </span>
                      <span className="material-symbols-outlined text-slate-400 text-base">arrow_forward</span>
                      <span className="px-3 py-1.5 rounded-xl font-bold text-base bg-admin-primary/15 text-emerald-800 border border-admin-primary/30">
                        {fmtDateDisplay(customCheckoutDate)}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#203044] text-white">
                        +{additionalNights} {additionalNights > 1 ? 'Đêm' : 'Đêm'}
                      </span>
                    </div>

                    {/* Nút bấm nhanh */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickAddDays(-1)}
                        disabled={additionalNights <= 1}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                      >
                        -1 Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddDays(1)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          additionalNights === 1
                            ? 'bg-admin-primary text-[#002114] shadow-sm font-extrabold'
                            : 'border border-slate-200 bg-white hover:bg-slate-100'
                        }`}
                      >
                        +1 Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddDays(2)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          additionalNights === 2
                            ? 'bg-admin-primary text-[#002114] shadow-sm font-extrabold'
                            : 'border border-slate-200 bg-white hover:bg-slate-100'
                        }`}
                      >
                        +2 Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddDays(3)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          additionalNights === 3
                            ? 'bg-admin-primary text-[#002114] shadow-sm font-extrabold'
                            : 'border border-slate-200 bg-white hover:bg-slate-100'
                        }`}
                      >
                        +3 Ngày
                      </button>
                    </div>
                  </div>

                  {/* Date picker tùy chỉnh */}
                  <div className="pt-3 border-t border-slate-200/70 flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                      Hoặc chọn ngày cụ thể:
                    </span>
                    <input
                      type="date"
                      value={customCheckoutDate}
                      onChange={handleCustomDateChange}
                      min={stayDossier?.currentCheckout || stayDossier?.CheckOutDate || ''}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary shadow-inner"
                    />
                  </div>
                </div>

                {/* ─── REAL-TIME AVAILABILITY / CONFLICT CHECK CARD ─────────── */}
                <div>
                  {previewLoading ? (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                      Đang kiểm tra lịch trống và thời gian dọn phòng (Turnaround buffer) với khách kế tiếp...
                    </div>
                  ) : conflictError ? (
                    <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                      <div className="flex items-center gap-2.5 text-rose-800 font-bold text-sm">
                        <span className="material-symbols-outlined text-rose-600 text-xl">warning</span>
                        <span>PHÁT HIỆN XUNG ĐỘT LỊCH PHÒNG // KHÔNG THỂ GIA HẠN PHÒNG HIỆN TẠI</span>
                      </div>

                      <p className="text-xs text-rose-700 leading-relaxed font-medium">
                        {conflictError.message}
                      </p>

                      {/* Thông tin booking xung đột */}
                      {conflictError.data?.conflicts?.length > 0 && (
                        <div className="bg-white/80 rounded-xl p-3 border border-rose-200 space-y-1.5 text-xs text-rose-950 font-sans">
                          <span className="font-bold text-rose-900 block">Lượt khách kế tiếp đã đặt trước:</span>
                          {conflictError.data.conflicts.map((c, idx) => (
                            <div key={idx} className="flex justify-between border-b border-rose-100 last:border-none pb-1">
                              <span>Mã đơn: <strong className="font-mono">#{c.confirmationCode}</strong> ({c.maskedGuestName})</span>
                              <span>Ngày nhận phòng: <strong className="text-rose-700">{fmtDateDisplay(c.checkInDate)}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}

                      {conflictError.data?.maxSafeCheckoutAt && (
                        <div className="text-xs text-slate-700 font-medium">
                          Thời điểm gia hạn an toàn tối đa trên phòng này: <strong className="text-rose-700">{fmtDateDisplay(conflictError.data.maxSafeCheckoutAt)}</strong>
                        </div>
                      )}

                      {/* Nút hành động giải quyết xung đột */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveMode('RELOCATE')}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">swap_horiz</span>
                          <span>CHUYỂN SANG MODE 02: ĐỔI SANG PHÒNG KHÁC CHO KHÁCH</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl">verified</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                            AVAILABILITY CONFIRMED: PHÒNG KHẢ DỤNG
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Phòng trống và đảm bảo đủ thời gian dọn phòng cho lượt khách tiếp theo.
                          </div>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
                        ĐỦ ĐIỀU KIỆN
                      </span>
                    </div>
                  )}
                </div>

                {/* ─── TỰ ĐỘNG TÍNH PHỤ THU (CALCULATED TARIFF MODEL) ─────────── */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-[#fafaf8] border border-slate-200 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200/70">
                    <span className="font-medium">Tiền phòng gia hạn:</span>
                    <strong className="text-[#203044] font-mono text-sm">
                      {additionalNights} Đêm × {fmtMoney(previewData?.nightlyRate || stayDossier?.BasePrice || 1500000)} = {fmtMoney(previewData?.additionalRoomCharge || 0)}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200/70">
                    <span className="font-medium">Thuế &amp; Phí quản lý khu nghỉ dưỡng (12%):</span>
                    <strong className="text-[#203044] font-mono">
                      {fmtMoney(previewData?.taxAmount || 0)}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 pb-2 border-b border-slate-200/70">
                    <span className="font-medium">Mã bảng giá áp dụng (Rate Plan):</span>
                    <strong className="text-slate-700 font-mono">
                      {previewData?.targetRateTier || 'RACK-STANDARD-FLR08'}
                    </strong>
                  </div>

                  {/* Net Folio Adjustment */}
                  <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#203044]">
                    <div>
                      <span className="font-black text-sm block">TỔNG PHỤ THU GIA HẠN (NET FOLIO ADJUSTMENT):</span>
                      <span className="text-[11px] text-slate-500">Tự động hạch toán vào hóa đơn chính Folio #01</span>
                    </div>
                    <strong className="text-xl font-serif font-black text-emerald-700 font-mono">
                      +{fmtMoney(previewData?.netFolioAdjustment || 0)}
                    </strong>
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium flex justify-between pt-1">
                    <span>* Thẻ đảm bảo lưu hồ sơ: Visa Ending •••• 9021</span>
                    <span>Hóa đơn tự động đồng bộ theo chuẩn thuế GTGT</span>
                  </div>
                </div>

              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                MODE 02: MA TRẬN PHÒNG THAY THẾ (REPLACEMENT MATRIX)
                ───────────────────────────────────────────────────────────────── */}
            {activeMode === 'RELOCATE' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#b9a277]/20 text-[#a68e64] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">grid_view</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#203044]">Ma Trận Phòng Khả Dụng Để Đổi</h3>
                      <p className="text-xs text-slate-500">Replacement Destination Matrix (Real-time Inventory)</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    KHO PHÒNG TRỰC TIẾP
                  </span>
                </div>

                {/* Bộ lọc phòng thay thế */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Hạng Phòng</label>
                    <select
                      value={roomClassFilter}
                      onChange={(e) => setRoomClassFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-[#203044]"
                    >
                      <option value="ALL">Tất Cả Hạng Phòng Khả Dụng</option>
                      <option value="1">Standard King</option>
                      <option value="2">Deluxe Ocean View</option>
                      <option value="3">Executive Suite</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tầng Khách Sạn</label>
                    <select
                      value={floorFilter}
                      onChange={(e) => setFloorFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-[#203044]"
                    >
                      <option value="ALL">Tất Cả Các Tầng</option>
                      <option value="4">Tầng 04</option>
                      <option value="8">Tầng 08</option>
                      <option value="15">Tầng 15</option>
                      <option value="18">Tầng 18</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Trạng Thái Buồng Phòng</label>
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs text-center">
                      Đã Dọn &amp; Đã Kiểm Tra (Inspected)
                    </div>
                  </div>
                </div>

                {/* Danh sách phòng có thể đổi sang */}
                {loadingRooms ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                    Đang quét kho phòng khả dụng...
                  </div>
                ) : replacementRooms.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500 font-semibold">
                    Không tìm thấy phòng trống sạch phù hợp với tiêu chí lọc.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {replacementRooms.map((rm) => {
                      const isSelected = selectedTargetRoom?.RoomId === rm.RoomId;
                      return (
                        <div
                          key={rm.RoomId}
                          onClick={() => setSelectedTargetRoom(rm)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-admin-primary/10 border-admin-primary shadow-md ring-2 ring-admin-primary'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base font-serif font-black text-[#203044]">
                                Phòng {rm.RoomNumber}
                              </span>
                              <span className="text-xs text-slate-500">
                                • Tầng {rm.Floor}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#203044] text-white">
                                  ĐÃ CHỌN
                                </span>
                              )}
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                SẠCH // SẴN SÀNG
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium block text-[11px]">Hạng Phòng</span>
                              <strong className="text-[#203044]">{rm.CategoryType}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium block text-[11px]">Phân Loại Đổi</span>
                              <strong className="text-admin-primary">{rm.classification}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium block text-[11px]">Chênh Lệch Giá</span>
                              <strong className={rm.tariffDifferential > 0 ? 'text-rose-600' : 'text-[#203044]'}>
                                {fmtMoney(rm.BasePrice)} / Đêm ({rm.tariffDifferential >= 0 ? '+' : ''}{fmtMoney(rm.tariffDifferential)})
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ─── THANH THỰC THI CHÍNH (EXECUTION ACTION FOOTER) ────────────────── */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-lg sticky bottom-4 z-40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Tóm tắt hành động */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm text-admin-primary">receipt_long</span>
                <span>Tóm Tắt Thực Thi Nghiệp Vụ</span>
              </div>
              <div className="text-sm md:text-base font-bold text-[#203044]">
                {activeMode === 'EXTEND' ? (
                  <>
                    Gia hạn phòng <strong className="text-admin-primary">{stayDossier?.RoomNumber || '---'}</strong> thêm{' '}
                    <strong>+{additionalNights} đêm</strong> (đến {fmtDateDisplay(customCheckoutDate)}) • Phụ thu:{' '}
                    <strong className="text-emerald-700 font-mono">+{fmtMoney(previewData?.netFolioAdjustment || 0)}</strong>
                  </>
                ) : (
                  <>
                    Chuyển khách từ Phòng <strong>{stayDossier?.RoomNumber || '---'}</strong> sang Phòng{' '}
                    <strong className="text-admin-primary">{selectedTargetRoom?.RoomNumber || '---'}</strong> • Chênh lệch giá:{' '}
                    <strong className="text-emerald-700 font-mono">{fmtMoney(selectedTargetRoom?.tariffDifferential || 0)}</strong>
                  </>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Dữ liệu sẽ được khóa và đồng bộ tự động vào hồ sơ Stays &amp; Bookings ngay sau khi xác nhận.
              </div>
            </div>

            {/* Nút bấm hành động */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/le-tan')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-[#203044] text-xs font-bold transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleEncodeKeys}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[#203044] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-admin-primary">key</span>
                <span>Mã Hóa Thẻ RFID</span>
              </button>

              {activeMode === 'EXTEND' ? (
                <button
                  type="button"
                  disabled={submitting || !previewData || Boolean(conflictError)}
                  onClick={handleConfirmExtension}
                  className="px-6 py-2.5 rounded-xl bg-admin-primary hover:bg-emerald-600 text-white font-bold text-xs md:text-sm tracking-wide shadow-md shadow-admin-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>{submitting ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN GIA HẠN & CẬP NHẬT HÓA ĐƠN'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !selectedTargetRoom}
                  onClick={handleConfirmRelocate}
                  className="px-6 py-2.5 rounded-xl bg-admin-primary hover:bg-emerald-600 text-white font-bold text-xs md:text-sm tracking-wide shadow-md shadow-admin-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">swap_horiz</span>
                  <span>{submitting ? 'ĐANG CHUYỂN PHÒNG...' : 'XÁC NHẬN ĐỔI PHÒNG & CẬP NHẬT HÓA ĐƠN'}</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ─── MODAL MÃ HÓA THẺ TỪ RFID / KEY ENCODER ────────────────────────── */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-admin-primary/15 text-admin-primary flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">contactless</span>
                  </div>
                  <h3 className="font-bold text-base text-[#203044]">Mã Hóa Thẻ Từ RFID / NFC</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Phòng Được Ghi Thẻ:</span>
                  <strong className="text-[#203044] font-bold">
                    Phòng {activeMode === 'RELOCATE' ? selectedTargetRoom?.RoomNumber || stayDossier?.RoomNumber : stayDossier?.RoomNumber}
                  </strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Thời Hạn Hiệu Lực Thẻ:</span>
                  <strong className="text-admin-primary font-bold">
                    Đến 12:00 ngày {fmtDateDisplay(customCheckoutDate)}
                  </strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Cổng Kết Nối Đầu Ghi:</span>
                  <strong className="text-slate-700 font-mono">COM-3 (ASSA ABLOY ENCODER)</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                {keyEncodingStep === 1 && (
                  <div className="text-amber-700 font-bold text-xs animate-pulse flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">sensors</span>
                    Đang kết nối đầu đọc thẻ RFID Assa Abloy COM-3...
                  </div>
                )}
                {keyEncodingStep === 2 && (
                  <div className="text-blue-700 font-bold text-xs animate-pulse flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">sync</span>
                    Đang nạp mã phòng &amp; thời hạn lưu trú vào chip thẻ...
                  </div>
                )}
                {keyEncodingStep === 3 && (
                  <div className="text-emerald-700 font-bold text-xs flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    ĐÃ MÃ HÓA THÀNH CÔNG 2 THẺ TỪ RFID!
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-full bg-admin-primary hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Xác Nhận &amp; Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
