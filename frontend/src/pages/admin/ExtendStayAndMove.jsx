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

// Tiện ích format ngày hiển thị (VD: 24/10/2026 hoặc OCT 24, 2026)
const fmtDateDisplay = (d) => {
  if (!d) return '---';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[dt.getMonth()];
  const day = String(dt.getDate()).padStart(2, '0');
  const year = dt.getFullYear();
  return `${month} ${day}, ${year}`;
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
    'Guest reported persistent mechanical humming from AC unit during morning hours. Engineering confirmed motor replacement required.'
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

  // Format giờ hệ thống LST (Local Standard Time)
  const systemTimeStr = useMemo(() => {
    const p = (n) => String(n).padStart(2, '0');
    return `${p(systemTime.getHours())}:${p(systemTime.getMinutes())}:${p(systemTime.getSeconds())} LST`;
  }, [systemTime]);

  // Tải danh sách khách đang lưu trú
  const fetchInHouseList = useCallback(async (query = '') => {
    setLoadingList(true);
    const res = await getInHouseStaysApi(query);
    if (res.success && res.data) {
      setInHouseGuests(res.data);
      // Nếu chưa chọn stayId nào, tự động chọn khách đầu tiên
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
      // Khởi tạo ngày gia hạn mặc định: ngày checkout hiện tại + 1 ngày
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

  // Tự động tính toán khi thay đổi số đêm gia hạn
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
      // Tự động chọn phòng đầu tiên nếu chưa chọn
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
      // Tải lại hồ sơ và danh sách
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
      // Tải lại hồ sơ
      await loadDossier(selectedStayId);
      await fetchInHouseList(searchQuery);
    } else {
      setToastMessage({
        type: 'error',
        text: res.message || 'Lỗi khi xử lý đổi phòng.',
      });
    }
  };

  // Giả lập mã hóa thẻ RFID cho phòng
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
      breadcrumb={[{ label: "Lễ Tân & Tiền Sảnh", to: "/admin/le-tan" }, { label: "Terminal Gia Hạn & Di Chuyển" }]}
    >
      <div className="font-mono text-slate-800 bg-slate-100 min-h-screen p-3 md:p-6 space-y-4">

        {/* ─── TOAST NOTIFICATION ────────────────────────────────────────────── */}
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl border text-sm transition-all duration-300 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                : 'bg-rose-950 text-rose-200 border-rose-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-3 text-xs opacity-70 hover:opacity-100 text-white underline cursor-pointer"
            >
              ĐÓNG
            </button>
          </div>
        )}

        {/* ─── TERMINAL HEADER (Theo đúng phác thảo Wireframe V4.2) ─────────── */}
        <header className="bg-white border-2 border-slate-900 shadow-md">
          <div className="flex flex-wrap items-center justify-between border-b-2 border-slate-900 px-4 py-2 text-xs md:text-sm">
            <div className="flex items-center gap-3">
              <span className="bg-slate-900 text-white font-black px-2 py-0.5 tracking-wider">HP</span>
              <span className="font-black tracking-widest text-slate-900 uppercase">
                HOTEL PMS // TERMINAL V4.2
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="border border-slate-900 px-2 py-0.5 text-xs font-bold bg-slate-50">
                GRAND HORIZON RESORT &amp; SUITES ▾
              </div>
              <div className="border border-slate-900 px-2 py-0.5 text-xs bg-slate-50 font-bold">
                LIVE SYSTEM TIME: <span className="text-emerald-700 font-mono font-black">{systemTimeStr}</span>
              </div>
              <div className="border border-slate-900 px-2 py-0.5 text-xs bg-slate-50 font-bold">
                OCCUPANCY: <span className="text-blue-700 font-black">86.4% (124/144 ROOMS)</span>
              </div>
              <div className="border border-slate-900 px-2 py-0.5 text-xs bg-slate-50 font-bold">
                AGENT: <span className="text-slate-900 uppercase">{user?.fullName || 'SARAH JENKINS (SHIFT MGR #4092)'}</span>
              </div>
              <div className="border border-amber-600 bg-amber-50 text-amber-900 px-2 py-0.5 text-xs font-black">
                3 ALERTS
              </div>
            </div>
          </div>

          {/* Dòng tác nghiệp & chuyển đổi Mode */}
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
            <div>
              <div className="text-[11px] text-slate-500 font-bold tracking-wider">
                FRONT DESK OPERATIONS // IN-HOUSE GUEST MODIFICATION // TERMINAL DISPATCH: RM {stayDossier?.RoomNumber || '---'}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {stayDossier?.GuestName || 'ĐANG TẢI HỒ SƠ KHÁCH...'}
                </h1>
                <span className="border border-slate-900 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                  CONF: #{stayDossier?.ConfirmationCode || 'GH-2025-88219'}
                </span>
              </div>
            </div>

            {/* Hai Tab Mode lựa chọn theo Wireframe */}
            <div className="flex border-2 border-slate-900 bg-white">
              <button
                type="button"
                onClick={() => setActiveMode('EXTEND')}
                className={`px-4 py-2 text-xs md:text-sm font-black transition-all cursor-pointer ${
                  activeMode === 'EXTEND'
                    ? 'bg-slate-900 text-white shadow-inner'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                [ MODE 01: EXTEND STAY DURATION ]
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('RELOCATE')}
                className={`px-4 py-2 text-xs md:text-sm font-black transition-all cursor-pointer border-l-2 border-slate-900 ${
                  activeMode === 'RELOCATE'
                    ? 'bg-slate-900 text-white shadow-inner'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                [ MODE 02: ROOM RELOCATION / MOVE {activeMode === 'RELOCATE' ? '(ACTIVE)' : ''} ]
              </button>
            </div>
          </div>

          {/* Dải thông tin tác vụ phụ trợ */}
          <div className="px-4 py-1.5 border-t border-slate-300 bg-white flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span>ASSIGNED AGENT: S. JENKINS (#4092)</span>
            <span>FOLIO PROFILE: INDIVIDUAL / DIRECT WEB</span>
            <span>VIP TIER: <strong className="text-amber-700">{stayDossier?.VipTier || 'SILVER RESIDENT'}</strong></span>
            <span>LOCK STATUS: <strong className="text-emerald-700">SESSION ENGAGED</strong></span>
          </div>
        </header>

        {/* ─── QUICK SWITCHER: CHỌN NHANH KHÁCH ĐANG Ở TRONG KHÁCH SẠN ──────── */}
        <div className="bg-white border-2 border-slate-900 p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="material-symbols-outlined text-slate-600 text-lg">search</span>
            <input
              type="text"
              placeholder="Tìm nhanh khách lưu trú theo Số phòng, Tên khách hoặc Mã đặt phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-mono font-bold border border-slate-400 px-3 py-1.5 focus:outline-none focus:border-slate-900 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Chọn phòng đang ở:</span>
            <select
              value={selectedStayId || ''}
              onChange={(e) => setSelectedStayId(Number(e.target.value))}
              className="text-xs font-mono font-bold border-2 border-slate-900 px-2 py-1 bg-white focus:outline-none cursor-pointer"
            >
              {inHouseGuests.map((g) => (
                <option key={g.StayId} value={g.StayId}>
                  P.{g.RoomNumber} - {g.GuestName} (Out: {fmtDateDisplay(g.ExpectedCheckOut || g.CheckOutDate)})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchInHouseList(searchQuery)}
              className="border border-slate-900 px-2 py-1 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              title="Làm mới danh sách"
            >
              ↻ REFRESH
            </button>
          </div>
        </div>

        {/* ─── GRID NỘI DUNG CHÍNH (HAI CỘT CHUẨN WIREFRAME) ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ══════════════════════════════════════════════════════════════════════
              CỘT TRÁI (40% - 5 COLS): CURRENT OCCUPANCY DOSSIER
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4">

            {/* Box 1: CURRENT OCCUPANCY DOSSIER */}
            <div className="bg-white border-2 border-slate-900 shadow-md">
              <div className="flex items-center justify-between border-b-2 border-slate-900 px-3 py-2 bg-slate-100">
                <span className="font-black text-xs tracking-wider uppercase text-slate-900">
                  ■ CURRENT OCCUPANCY DOSSIER
                </span>
                <span className="border border-slate-900 bg-emerald-100 text-emerald-900 text-[10px] font-black px-1.5 py-0.5">
                  [ OCCUPIED // IN-HOUSE ]
                </span>
              </div>

              {loadingDossier ? (
                <div className="p-8 text-center text-xs font-bold text-slate-500 animate-pulse">
                  ĐANG ĐỒNG BỘ DỮ LIỆU PHÒNG TỪ HỆ THỐNG PMS...
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Schematic box */}
                  <div className="border border-dashed border-slate-500 p-3 bg-slate-50 text-center relative overflow-hidden">
                    <div className="h-16 flex items-center justify-center border border-slate-300 bg-white">
                      <span className="font-mono text-xs font-bold tracking-widest text-slate-700">
                        UNIT_SCHEMATIC: FL_{String(stayDossier?.Floor || '04').padStart(2, '0')}_WING_4A [{stayDossier?.RoomNumber || '401'}-DLX]
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết phòng */}
                  <div className="space-y-2 text-xs divide-y divide-slate-200">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-bold uppercase">PHYSICAL UNIT:</span>
                      <strong className="text-slate-900 font-black">
                        ROOM {stayDossier?.RoomNumber || '401'} // WING {stayDossier?.Floor || '04'}A
                      </strong>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-bold uppercase">ROOM CATEGORY:</span>
                      <strong className="text-slate-900 uppercase">
                        {stayDossier?.RoomTypeName || 'DLX KING WITH BALCONY'}
                      </strong>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-bold uppercase">STAY WINDOW:</span>
                      <strong className="text-slate-900">
                        {fmtDateDisplay(stayDossier?.ActualCheckIn || stayDossier?.CheckInDate)} →{' '}
                        <span className="text-blue-700">{fmtDateDisplay(stayDossier?.currentCheckout || stayDossier?.CheckOutDate)}</span>{' '}
                        (TODAY)
                      </strong>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-bold uppercase">BASE RATE APPLIED:</span>
                      <strong className="text-slate-900">
                        {fmtMoney(stayDossier?.BasePrice || 1500000)} / ĐÊM
                      </strong>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-bold uppercase">CURRENT FOLIO BALANCE:</span>
                      <strong className="text-rose-700 font-black text-sm">
                        {fmtMoney(stayDossier?.outstandingBalance || 0)} OUTSTANDING
                      </strong>
                    </div>
                  </div>

                  {/* Active charge stream thanh trạng thái */}
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">
                      ACTIVE CHARGE STREAM (AUTO-SKELETON)
                    </div>
                    <div className="h-2 w-full bg-slate-200 overflow-hidden relative border border-slate-300">
                      <div className="h-full bg-emerald-600 w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2 (Khi ở MODE 02): RELOCATION / MOVE DISPATCH FORM (SECTION 02-B) */}
            {activeMode === 'RELOCATE' && (
              <div className="bg-white border-2 border-slate-900 shadow-md">
                <div className="border-b-2 border-slate-900 px-3 py-2 bg-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs tracking-wider uppercase text-slate-900">
                    RELOCATION / MOVE DISPATCH FORM
                  </span>
                  <span className="text-[10px] font-bold text-slate-600">SECTION 02-B</span>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 uppercase block mb-1">
                      PRIMARY INCIDENT / MOVE REASON:
                    </label>
                    <select
                      value={relocateReason}
                      onChange={(e) => setRelocateReason(e.target.value)}
                      className="w-full border-2 border-slate-900 p-1.5 font-mono font-bold bg-white text-xs focus:outline-none"
                    >
                      <option value="HVAC / Climate Control Noise Complaint">HVAC / CLIMATE CONTROL NOISE COMPLAINT</option>
                      <option value="Plumbing / Water Pressure Defect">PLUMBING / WATER TEMPERATURE DEFECT</option>
                      <option value="Stay Extension Schedule Conflict">STAY EXTENSION SCHEDULE CONFLICT (MOVE REQUIRED)</option>
                      <option value="VIP Guest Upgrade Courtesy">VIP GUEST UPGRADE COURTESY</option>
                      <option value="Housekeeping Deep Clean Required">HOUSEKEEPING DEEP CLEAN REQUIRED</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase block mb-1">
                      STAFF SHIFT LOG &amp; WORK ORDER MEMO:
                    </label>
                    <textarea
                      rows={3}
                      value={workOrderMemo}
                      onChange={(e) => setWorkOrderMemo(e.target.value)}
                      className="w-full border border-slate-900 p-2 text-xs font-mono bg-slate-50 focus:outline-none"
                      placeholder="Ghi chú tác vụ điều chuyển phòng..."
                    />
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                      LOG SAVED AUTOMATICALLY TO TICKET #TCK-88102
                    </div>
                  </div>

                  {/* BAGGAGE DIRECTIVE */}
                  <div className="border-t border-slate-300 pt-2 space-y-1">
                    <span className="font-bold text-slate-700 uppercase text-[11px] block">
                      BAGGAGE / PORTER DIRECTIVE:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={bellhopDispatched}
                        onChange={(e) => {
                          setBellhopDispatched(e.target.checked);
                          if (e.target.checked) setGuestSelfTransfer(false);
                        }}
                      />
                      <span>[X] BELLHOP DISPATCHED (LUGGAGE TRANSFER &amp; ESCORT)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={guestSelfTransfer}
                        onChange={(e) => {
                          setGuestSelfTransfer(e.target.checked);
                          if (e.target.checked) setBellhopDispatched(false);
                        }}
                      />
                      <span>[ ] GUEST SELF-TRANSFER (DIRECT KEY HANDOFF ONLY)</span>
                    </label>
                  </div>

                  {/* KEY & INVENTORY INTERLOCKS */}
                  <div className="border-t border-slate-300 pt-2 space-y-1">
                    <span className="font-bold text-slate-700 uppercase text-[11px] block">
                      KEY &amp; INVENTORY INTERLOCKS:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={voidCurrentKeys}
                        onChange={(e) => setVoidCurrentKeys(e.target.checked)}
                      />
                      <span>VOID CURRENT KEYCARDS IMMEDIATELY UPON NEW CHECK-IN</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={flagRoomDirtyMaintenance}
                        onChange={(e) => setFlagRoomDirtyMaintenance(e.target.checked)}
                      />
                      <span>FLAG CURRENT ROOM AS [DIRTY / MAINTENANCE OOO]</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={suppressMinibar}
                        onChange={(e) => setSuppressMinibar(e.target.checked)}
                      />
                      <span>SUPPRESS MINIBAR AUDIT TRIGGER UNTIL ROOM RELEASE</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              CỘT PHẢI (60% - 7 COLS): TÙY THEO MODE ĐANG CHỌN
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-4">

            {/* ─────────────────────────────────────────────────────────────────
                MODE 01: STAY DURATION EXTENSION PARAMETERS
                ───────────────────────────────────────────────────────────────── */}
            {activeMode === 'EXTEND' && (
              <div className="bg-white border-2 border-slate-900 shadow-md">
                <div className="border-b-2 border-slate-900 px-4 py-2 bg-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs tracking-wider uppercase text-slate-900">
                    STAY DURATION EXTENSION PARAMETERS
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="border border-slate-900 bg-white text-[10px] font-bold px-1.5 py-0.5">
                      [ OPTIONAL ADD-ON ]
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">CALCULATED TARIFF MODEL</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">

                  {/* Scheduled Check-out Timeline */}
                  <div className="border-2 border-slate-900 p-3 bg-slate-50">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                      SCHEDULED CHECK-OUT TIMELINE:
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="line-through text-slate-500 font-bold text-sm">
                          {fmtDateDisplay(stayDossier?.currentCheckout || stayDossier?.CheckOutDate)}
                        </span>
                        <span className="font-black text-slate-900">→</span>
                        <span className="text-base font-black text-blue-900 bg-blue-100 px-2 py-0.5 border border-blue-400">
                          {fmtDateDisplay(customCheckoutDate)}
                        </span>
                        <span className="font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-400">
                          (+{additionalNights} {additionalNights > 1 ? 'NIGHTS' : 'NIGHT'})
                        </span>
                      </div>

                      {/* Nút chỉnh ngày nhanh */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(-1)}
                          disabled={additionalNights <= 1}
                          className="border border-slate-900 px-2 py-1 text-xs font-black bg-white hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          -1 DAY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(1)}
                          className={`border border-slate-900 px-2 py-1 text-xs font-black cursor-pointer ${
                            additionalNights === 1 ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-200'
                          }`}
                        >
                          +1 DAY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(2)}
                          className={`border border-slate-900 px-2 py-1 text-xs font-black cursor-pointer ${
                            additionalNights === 2 ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-200'
                          }`}
                        >
                          +2 DAYS {additionalNights === 2 ? '{APPLIED}' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(3)}
                          className={`border border-slate-900 px-2 py-1 text-xs font-black cursor-pointer ${
                            additionalNights === 3 ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-200'
                          }`}
                        >
                          +3 DAYS
                        </button>
                      </div>
                    </div>

                    {/* Bộ chọn ngày tùy chỉnh */}
                    <div className="mt-3 pt-2 border-t border-slate-300 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        CHỌN NGÀY TRẢ PHÒNG MỚI (CUSTOM):
                      </span>
                      <input
                        type="date"
                        value={customCheckoutDate}
                        onChange={handleCustomDateChange}
                        min={stayDossier?.currentCheckout || stayDossier?.CheckOutDate || ''}
                        className="border border-slate-900 px-2 py-1 text-xs font-bold font-mono bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ─── REAL-TIME CONFLICT & AVAILABILITY ENGINE ──────────────── */}
                  <div>
                    {previewLoading ? (
                      <div className="p-4 border-2 border-slate-400 bg-slate-50 text-center text-xs font-bold text-slate-600 animate-pulse">
                        ĐANG KIỂM TRA TÌNH TRẠNG LỊCH PHÒNG VÀ BUFFER DỌN PHÒNG VỚI KHÁCH KẾ TIẾP...
                      </div>
                    ) : conflictError ? (
                      <div className="border-2 border-rose-800 bg-rose-50 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                          <span className="material-symbols-outlined text-rose-700 text-base">warning</span>
                          <span>CONFLICT DETECTED // PHÁT HIỆN XUNG ĐỘT LỊCH PHÒNG</span>
                        </div>
                        <p className="text-xs font-bold text-rose-800">
                          {conflictError.message}
                        </p>

                        {/* Danh sách các booking xung đột */}
                        {conflictError.data?.conflicts?.length > 0 && (
                          <div className="bg-white border border-rose-300 p-2 space-y-1 text-xs text-rose-950 font-mono">
                            <span className="font-bold block">Khách kế tiếp đã giữ phòng này:</span>
                            {conflictError.data.conflicts.map((c, idx) => (
                              <div key={idx} className="flex justify-between border-b border-rose-100 pb-1">
                                <span>Ref: <strong>#{c.confirmationCode}</strong> ({c.maskedGuestName})</span>
                                <span>Nhận phòng: <strong>{c.checkInDate}</strong></span>
                              </div>
                            ))}
                          </div>
                        )}

                        {conflictError.data?.maxSafeCheckoutAt && (
                          <div className="text-xs font-bold text-slate-800">
                            Thời điểm gia hạn an toàn tối đa trên phòng hiện tại: <span className="text-rose-700">{conflictError.data.maxSafeCheckoutAt}</span>
                          </div>
                        )}

                        {/* CTA chuyển sang đổi phòng */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveMode('RELOCATE')}
                            className="w-full bg-rose-900 text-white font-black py-2 px-3 text-xs tracking-wider uppercase hover:bg-rose-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                          >
                            <span>👉 CHUYỂN SANG MODE 02: ĐỔI PHÒNG (ROOM RELOCATION)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-emerald-700 bg-emerald-50 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-700 text-xl">verified</span>
                          <div>
                            <div className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                              AVAILABILITY CONFIRMED: NO CONFLICTS
                            </div>
                            <div className="text-[11px] text-emerald-800 font-semibold">
                              Phòng trống và đảm bảo đủ thời gian dọn phòng cho khách kế tiếp.
                            </div>
                          </div>
                        </div>
                        <span className="border border-emerald-700 bg-white text-emerald-900 font-black text-xs px-2 py-1">
                          KHẢ DỤNG
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ─── CALCULATED TARIFF MODEL (TỰ ĐỘNG TÍNH PHỤ THU) ─────────── */}
                  <div className="border border-slate-900 p-4 bg-slate-50 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-600 uppercase">ADDITIONAL ROOM CHARGE:</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {additionalNights} NIGHTS × {fmtMoney(previewData?.nightlyRate || stayDossier?.BasePrice || 1500000)} = {fmtMoney(previewData?.additionalRoomCharge || 0)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-600 uppercase">CITY TAX &amp; RESORT ASSESSMENT (12%):</span>
                      <strong className="text-slate-900 font-mono">
                        {fmtMoney(previewData?.taxAmount || 0)}
                      </strong>
                    </div>

                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-600 uppercase">TARGET RATE TIER CODE:</span>
                      <strong className="text-slate-700 font-mono">
                        {previewData?.targetRateTier || 'RACK-STANDARD-FLR08'}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 bg-slate-200 px-3 py-2 border border-slate-400">
                      <span className="font-black text-slate-900 uppercase text-sm">
                        NET FOLIO ADJUSTMENT:
                      </span>
                      <strong className="text-emerald-800 font-mono font-black text-lg">
                        +{fmtMoney(previewData?.netFolioAdjustment || 0)}
                      </strong>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 font-semibold flex justify-between">
                      <span>* GUARANTEE METHOD ON FILE: VISA ENDING 9021 (PRE-AUTH CHARGEABLE)</span>
                      <span>BILLING ROUTING: PRIMARY GUEST FOLIO #01</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                MODE 02: REPLACEMENT DESTINATION MATRIX (REAL-TIME INVENTORY)
                ───────────────────────────────────────────────────────────────── */}
            {activeMode === 'RELOCATE' && (
              <div className="bg-white border-2 border-slate-900 shadow-md">
                <div className="border-b-2 border-slate-900 px-4 py-2 bg-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs tracking-wider uppercase text-slate-900">
                    REPLACEMENT DESTINATION MATRIX
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-ping"></span>
                    REAL-TIME INVENTORY
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Thanh bộ lọc */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">ROOM CLASS FILTER</label>
                      <select
                        value={roomClassFilter}
                        onChange={(e) => setRoomClassFilter(e.target.value)}
                        className="w-full border-2 border-slate-900 p-1 font-bold text-xs bg-white"
                      >
                        <option value="ALL">ANY AVAILABLE (ALL)</option>
                        <option value="1">STANDARD KING</option>
                        <option value="2">DELUXE OCEAN VIEW</option>
                        <option value="3">EXECUTIVE SUITE</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">FLOOR FILTER</label>
                      <select
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                        className="w-full border-2 border-slate-900 p-1 font-bold text-xs bg-white"
                      >
                        <option value="ALL">ANY AVAILABLE (ALL)</option>
                        <option value="4">FLOOR 04</option>
                        <option value="8">FLOOR 08</option>
                        <option value="15">FLOOR 15</option>
                        <option value="18">FLOOR 18</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">HOUSEKEEPING STATE</label>
                      <div className="border-2 border-slate-900 p-1 font-bold text-xs bg-slate-100 text-slate-700">
                        VACANT CLEAN ONLY
                      </div>
                    </div>
                  </div>

                  {/* Danh sách phòng trống */}
                  {loadingRooms ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-500 animate-pulse">
                      ĐANG TẢI MA TRẬN PHÒNG KHẢ DỤNG...
                    </div>
                  ) : replacementRooms.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-400 text-center text-xs text-slate-600 font-bold">
                      Không tìm thấy phòng trống phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {replacementRooms.map((rm) => {
                        const isSelected = selectedTargetRoom?.RoomId === rm.RoomId;
                        return (
                          <div
                            key={rm.RoomId}
                            onClick={() => setSelectedTargetRoom(rm)}
                            className={`border-2 p-3 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-slate-900 bg-slate-100 shadow-md ring-2 ring-slate-900'
                                : 'border-slate-300 hover:border-slate-500 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-black ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {isSelected ? '■' : '□'} ROOM {rm.RoomNumber}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  // WING {rm.Floor > 10 ? 'C' : 'B'} // FLOOR {String(rm.Floor).padStart(2, '0')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className="bg-slate-900 text-white font-black text-[10px] px-2 py-0.5">
                                    SELECTED TARGET
                                  </span>
                                )}
                                <span className="border border-emerald-600 bg-emerald-100 text-emerald-900 font-bold text-[10px] px-1.5 py-0.5">
                                  [ {rm.HousekeepingState.toUpperCase()} // INSPECTED ]
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500 font-bold block text-[10px] uppercase">CATEGORY TYPE</span>
                                <strong className="text-slate-900">{rm.CategoryType}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold block text-[10px] uppercase">CLASSIFICATION</span>
                                <strong className="text-blue-900">{rm.classification}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold block text-[10px] uppercase">TARIFF DIFFERENTIAL</span>
                                <strong className={rm.tariffDifferential > 0 ? 'text-rose-700' : 'text-slate-900'}>
                                  {fmtMoney(rm.BasePrice)} / ĐÊM ({rm.tariffDifferential >= 0 ? '+' : ''}{fmtMoney(rm.tariffDifferential)} DIFF)
                                </strong>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[10px] text-slate-500 font-semibold">
                              <span>KEY ENCODER CHANNEL: {rm.keyEncoderChannel}</span>
                              <span>CLEARED BY: {rm.clearedBy}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ─── TRANSFER EXECUTION SUMMARY FOOTER (THEO WIREFRAME) ─────────────── */}
        <footer className="bg-white border-2 border-slate-900 p-4 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Dòng tóm tắt hành động */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-900 inline-block"></span>
                <span>TRANSFER EXECUTION SUMMARY</span>
              </div>
              <div className="font-mono text-sm md:text-base font-black text-slate-900 mt-0.5">
                {activeMode === 'EXTEND' ? (
                  <>
                    GIA HẠN LƯU TRÚ CHO PHÒNG {stayDossier?.RoomNumber || '---'} // +{additionalNights} ĐÊM ĐẾN{' '}
                    <span className="text-blue-900">{fmtDateDisplay(customCheckoutDate)}</span> // NET FOLIO ADJUSTMENT:{' '}
                    <span className="text-emerald-800 font-bold">+{fmtMoney(previewData?.netFolioAdjustment || 0)}</span>
                  </>
                ) : (
                  <>
                    RELOCATING GUEST FROM RM {stayDossier?.RoomNumber || '401'} → RM{' '}
                    <span className="text-blue-900">{selectedTargetRoom?.RoomNumber || '---'}</span> // EXTENDING STAY: 0 DAYS // TOTAL FARE DELTA:{' '}
                    <span className="text-emerald-800 font-bold">
                      {fmtMoney(selectedTargetRoom?.tariffDifferential || 0)}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {activeMode === 'EXTEND'
                  ? 'Khoản phụ thu sẽ được hạch toán trực tiếp vào Folio #01 và hóa đơn khi lễ tân xác nhận.'
                  : 'Cảnh báo: Thẻ khóa vật lý của phòng cũ sẽ bị vô hiệu hóa khi thẻ phòng mới được mã hóa thành công.'}
              </div>
            </div>

            {/* Các nút bấm hành động */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/le-tan')}
                className="border-2 border-slate-900 px-4 py-2 text-xs font-black bg-white hover:bg-slate-200 uppercase transition-all cursor-pointer"
              >
                [ ABORT / KEEP CURRENT ROOM ]
              </button>

              <button
                type="button"
                onClick={handleEncodeKeys}
                className="border-2 border-slate-900 px-4 py-2 text-xs font-black bg-slate-100 hover:bg-slate-200 uppercase transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">key</span>
                <span>[ ENCODE KEYS FOR RM {activeMode === 'RELOCATE' ? selectedTargetRoom?.RoomNumber || '---' : stayDossier?.RoomNumber || '---'} ]</span>
              </button>

              {activeMode === 'EXTEND' ? (
                <button
                  type="button"
                  disabled={submitting || !previewData || Boolean(conflictError)}
                  onClick={handleConfirmExtension}
                  className="border-2 border-slate-900 px-6 py-2.5 text-xs md:text-sm font-black bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed uppercase transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{submitting ? 'ĐANG XỬ LÝ...' : '[ CONFIRM EXTENSION & UPDATE FOLIO ]'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !selectedTargetRoom}
                  onClick={handleConfirmRelocate}
                  className="border-2 border-slate-900 px-6 py-2.5 text-xs md:text-sm font-black bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed uppercase transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">sync_alt</span>
                  <span>{submitting ? 'ĐANG XỬ LÝ...' : '[ CONFIRM ROOM MOVE & UPDATE FOLIO ]'}</span>
                </button>
              )}
            </div>

          </div>

          {/* Dòng trạng thái hệ thống góc dưới */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>SYS_ACTION: ROOM_TRANSFER_MUTATION // DISPATCH_TICKET: #TCK-88102 // LOCK_AUTH: ID_4092_SJ</span>
            <span>LATENCY: 12MS &nbsp;|&nbsp; PMS GATEWAY: V4.2-ACTIVE &nbsp;|&nbsp; <strong className="text-emerald-700">TERMINAL: OK</strong></span>
          </div>
        </footer>

        {/* ─── MODAL MÃ HÓA THẺ TỪ RFID / KEY ENCODER ────────────────────────── */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border-4 border-slate-900 w-full max-w-md p-6 shadow-2xl space-y-4 font-mono">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <span className="font-black text-sm uppercase text-slate-900">
                  RFID KEYCARD ENCODER // PORT: COM-3
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="font-black text-sm text-slate-700 hover:text-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">MÃ PHÒNG:</span>
                  <strong className="text-slate-900">
                    ROOM {activeMode === 'RELOCATE' ? selectedTargetRoom?.RoomNumber || stayDossier?.RoomNumber : stayDossier?.RoomNumber}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">THỜI HẠN THẺ:</span>
                  <strong className="text-blue-900">
                    {fmtDateDisplay(customCheckoutDate)} @ 12:00 PM
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SỐ LƯỢNG THẺ:</span>
                  <strong className="text-slate-900">2 THẺ VẬT LÝ</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-300 text-center space-y-2">
                {keyEncodingStep === 1 && (
                  <div className="text-amber-800 font-bold text-xs animate-pulse">
                    Đang kết nối đầu đọc thẻ RFID Assa Abloy COM-3...
                  </div>
                )}
                {keyEncodingStep === 2 && (
                  <div className="text-blue-800 font-bold text-xs animate-pulse">
                    Đang nạp mã phòng &amp; thời hạn lưu trú vào chip NFC...
                  </div>
                )}
                {keyEncodingStep === 3 && (
                  <div className="text-emerald-800 font-black text-xs">
                    ✓ ĐÃ MÃ HÓA THÀNH CÔNG 2 THẺ TỪ RFID!
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="bg-slate-900 text-white font-black px-4 py-2 text-xs uppercase cursor-pointer"
                >
                  XÁC NHẬN &amp; ĐÓNG
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
