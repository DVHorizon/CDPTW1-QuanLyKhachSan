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
  getRoomMoveOptionsApi,
  createRoomMoveRequestApi,
  completeRoomMoveApi,
  cancelRoomMoveApi,
  getRoomMovesListApi,
} from '../../api/stayApi';

// Tiện ích format tiền tệ VND
const fmtMoney = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

// Tiện ích format ngày hiển thị (VD: 24/10/2026)
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

  // Chế độ hoạt động:
  // 'EXTEND': Gia hạn lưu trú (Spec 9)
  // 'RELOCATE': Đổi phòng do sự cố (Spec 10)
  // 'MONITOR': Bảng theo dõi Room Move (Spec 10 Section 6.2)
  const [activeMode, setActiveMode] = useState('EXTEND');

  // Trạng thái chung & thời gian thực
  const [systemTime, setSystemTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [inHouseGuests, setInHouseGuests] = useState([]);
  const [selectedStayId, setSelectedStayId] = useState(paramStayId ? Number(paramStayId) : null);
  const [stayDossier, setStayDossier] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // ─── CHẾ ĐỘ 01: Gia hạn lưu trú (Stay Extension - Spec 9) ──────────────────
  const [additionalNights, setAdditionalNights] = useState(1);
  const [customCheckoutDate, setCustomCheckoutDate] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  // ─── CHẾ ĐỘ 02: Đổi phòng do sự cố (Room Move - Spec 10) ───────────────────
  const [incidentType, setIncidentType] = useState('MAINTENANCE');
  const [incidentSeverity, setIncidentSeverity] = useState('LOW');
  const [incidentDescription, setIncidentDescription] = useState(
    'Hệ thống điều hòa phát tiếng ồn lớn ảnh hưởng giấc ngủ của khách'
  );
  const [oldRoomDisposition, setOldRoomDisposition] = useState('OUT_OF_ORDER');
  const [rateAdjustment, setRateAdjustment] = useState('KEEP_ORIGINAL');
  const [guestAcknowledgement, setGuestAcknowledgement] = useState('ACCEPTED');
  const [isEmergency, setIsEmergency] = useState(false);

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

  // ─── CHẾ ĐỘ 03: Bảng theo dõi Room Move (Spec 10 Section 6.2) ──────────────
  const [roomMovesList, setRoomMovesList] = useState([]);
  const [loadingMovesList, setLoadingMovesList] = useState(false);
  const [monitorFilterStatus, setMonitorFilterStatus] = useState('ALL');
  const [monitorFilterSeverity, setMonitorFilterSeverity] = useState('ALL');

  // ─── Thao tác thực thi (Execution & Key Encoder) ──────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyEncodingStep, setKeyEncodingStep] = useState(0);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Tự động tắt thông báo sau 4 giây
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);

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
    const res = await getStayDossierApi(stayId);
    if (res.success && res.data) {
      setStayDossier(res.data);
      if (res.data.currentCheckout || res.data.CheckOutDate) {
        const curCheckout = new Date(res.data.currentCheckout || res.data.CheckOutDate);
        const nextDay = new Date(curCheckout);
        nextDay.setDate(nextDay.getDate() + additionalNights);
        setCustomCheckoutDate(nextDay.toISOString().slice(0, 10));
      }
    } else {
      setActionFeedback({ type: 'error', text: res.message || 'Không thể tải hồ sơ lưu trú' });
    }
    setLoadingDossier(false);
  }, [additionalNights]);

  useEffect(() => {
    if (selectedStayId) {
      loadDossier(selectedStayId);
    }
  }, [selectedStayId, loadDossier]);

  // Tải xem trước báo giá gia hạn (Spec 9)
  const loadExtensionPreview = useCallback(async () => {
    if (!selectedStayId || !stayDossier || !customCheckoutDate) return;
    setPreviewLoading(true);
    setConflictError(null);
    const res = await previewStayExtensionApi(selectedStayId, customCheckoutDate, additionalNights);
    if (res.success && res.data) {
      setPreviewData(res.data);
      if (res.data.availabilityStatus === 'CONFLICT') {
        setConflictError(res.data.conflictReason || 'Phòng đã có khách đặt lịch kế tiếp. Vui lòng chọn ngày khác hoặc chuyển sang Đổi Phòng.');
      }
    } else {
      setConflictError(res.message || 'Lỗi kiểm tra tính khả dụng của phòng.');
      setPreviewData(null);
    }
    setPreviewLoading(false);
  }, [selectedStayId, stayDossier, customCheckoutDate, additionalNights]);

  useEffect(() => {
    if (activeMode === 'EXTEND' && selectedStayId && customCheckoutDate) {
      loadExtensionPreview();
    }
  }, [activeMode, selectedStayId, customCheckoutDate, loadExtensionPreview]);

  // Tải danh sách phòng thay thế (Spec 10)
  const loadReplacementRooms = useCallback(async () => {
    if (!selectedStayId) return;
    setLoadingRooms(true);
    const filters = {};
    if (floorFilter !== 'ALL') filters.floor = floorFilter;
    if (roomClassFilter !== 'ALL') filters.roomClass = roomClassFilter;

    const res = await getRoomMoveOptionsApi(selectedStayId, filters);
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

  // Tải danh sách theo dõi đổi phòng (Spec 10 Section 6.2)
  const fetchMonitoringList = useCallback(async () => {
    setLoadingMovesList(true);
    const params = {};
    if (monitorFilterStatus !== 'ALL') params.status = monitorFilterStatus;
    if (monitorFilterSeverity !== 'ALL') params.severity = monitorFilterSeverity;
    const res = await getRoomMovesListApi(params);
    if (res.success && res.data) {
      setRoomMovesList(res.data);
    }
    setLoadingMovesList(false);
  }, [monitorFilterStatus, monitorFilterSeverity]);

  useEffect(() => {
    if (activeMode === 'MONITOR') {
      fetchMonitoringList();
    }
  }, [activeMode, fetchMonitoringList]);

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

  // Xác nhận gia hạn lưu trú (Spec 9)
  const handleConfirmExtension = async () => {
    if (!selectedStayId || !previewData) return;
    setSubmitting(true);

    const idempotencyKey = `IDEMP-${selectedStayId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      quoteId: previewData.quoteId,
      requestedCheckoutAt: previewData.requestedCheckout,
      additionalNights: previewData.additionalNights,
      totalAmount: previewData.netFolioAdjustment,
      version: previewData.version || stayDossier?.Version || 1,
      idempotencyKey,
      memo: `Gia hạn +${previewData.additionalNights} đêm`,
    };

    const res = await confirmStayExtensionApi(selectedStayId, payload);
    setSubmitting(false);

    if (res.success) {
      const successMsg = res.message || `Đã gia hạn lưu trú đến ${fmtDateDisplay(previewData.requestedCheckout)}. Khoản phí đã được ghi nhận vào hóa đơn folio.`;
      setActionFeedback({
        type: 'success',
        text: successMsg,
      });
      await loadDossier(selectedStayId);
      await fetchInHouseList(searchQuery);
    } else {
      const errorMsg = res.message || 'Lỗi khi xác nhận gia hạn: ' + (res.errorCode || '');
      setActionFeedback({
        type: 'error',
        text: errorMsg,
      });
    }
  };

  // Xác nhận đổi phòng (Spec 10 - Room Move)
  const handleConfirmRelocate = async () => {
    if (!selectedStayId || !selectedTargetRoom) return;

    if (!incidentDescription || incidentDescription.trim().length < 10) {
      setToastMessage({
        type: 'error',
        text: 'Vui lòng nhập mô tả sự cố tối thiểu 10 ký tự theo quy định.',
      });
      return;
    }

    setSubmitting(true);

    const idempotencyKey = `IDEMP-MOVE-${selectedStayId}-${Date.now()}`;
    const payload = {
      targetRoomId: selectedTargetRoom.RoomId || selectedTargetRoom.roomId,
      incidentType,
      incidentSeverity,
      incidentDescription: incidentDescription.trim(),
      moveReason: incidentDescription.trim(),
      oldRoomDisposition,
      rateAdjustment,
      guestAcknowledgement,
      isEmergency,
      bellhopDispatched,
      voidOldKeys: voidCurrentKeys,
      flagOldRoomMaintenance: oldRoomDisposition === 'OUT_OF_ORDER' || oldRoomDisposition === 'MAINTENANCE',
      version: stayDossier?.Version || 1,
      idempotencyKey,
      executeNow: true,
      simulateKeycardTimeout: false,
    };

    const res = await relocateStayRoomApi(selectedStayId, payload);
    setSubmitting(false);

    if (res.success) {
      const successMsg = res.message || `Đã đổi phòng thành công sang Phòng ${selectedTargetRoom.RoomNumber || selectedTargetRoom.roomNumber}!`;
      setActionFeedback({
        type: 'success',
        text: successMsg,
      });
      setShowKeyModal(true);
      setKeyEncodingStep(1);
      setTimeout(() => setKeyEncodingStep(2), 700);
      setTimeout(() => {
        setKeyEncodingStep(3);
      }, 1500);

      await loadDossier(selectedStayId);
      await fetchInHouseList(searchQuery);
      if (activeMode === 'MONITOR') {
        fetchMonitoringList();
      }
    } else {
      const errorMsg = res.message || 'Lỗi khi xử lý đổi phòng: ' + (res.errorCode || '');
      setActionFeedback({
        type: 'error',
        text: errorMsg,
      });
    }
  };

  // Hoàn tất hoặc hủy yêu cầu đổi phòng từ bảng theo dõi
  const handleCompleteMoveFromTable = async (moveId) => {
    setSubmitting(true);
    const res = await completeRoomMoveApi(moveId);
    setSubmitting(false);
    if (res.success) {
      setActionFeedback({ type: 'success', text: 'Đã hoàn tất đổi phòng và bàn giao chìa khóa!' });
      fetchMonitoringList();
      fetchInHouseList(searchQuery);
    } else {
      setActionFeedback({ type: 'error', text: res.message || 'Lỗi hoàn tất đổi phòng' });
    }
  };

  const handleCancelMoveFromTable = async (moveId) => {
    const reason = window.prompt('Nhập lý do hủy yêu cầu đổi phòng:');
    if (!reason) return;
    setSubmitting(true);
    const res = await cancelRoomMoveApi(moveId, { cancelReason: reason });
    setSubmitting(false);
    if (res.success) {
      setActionFeedback({ type: 'success', text: 'Đã hủy yêu cầu đổi phòng thành công' });
      fetchMonitoringList();
    } else {
      setActionFeedback({ type: 'error', text: res.message || 'Lỗi hủy yêu cầu đổi phòng' });
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

        {/* ─── THANH TIÊU ĐỀ & CHUYỂN ĐỔI CHẾ ĐỘ (MODE SWITCHER) ─────────────── */}
        <div className="bg-[#1b2b3d] text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/60">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-admin-primary/20 text-admin-primary border border-admin-primary/40">
                  PMS TERMINAL 4.0
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {systemTimeStr} • Ca Trực Lễ Tân Sáng
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-serif font-black tracking-tight text-white flex items-center gap-2.5">
                Điều Phối Lưu Trú &amp; Chuyển Phòng
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Gia hạn thời gian lưu trú (Spec 9) và Đổi phòng do sự cố (Spec 10: FEAT-ROOM-MOVE-01)
              </p>
            </div>

            {/* Thanh Tab Chuyển Chế Độ */}
            <div className="flex flex-wrap items-center bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveMode('EXTEND')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'EXTEND'
                    ? 'bg-admin-primary text-[#002114] shadow-lg shadow-admin-primary/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-base">more_time</span>
                <span>CHẾ ĐỘ 01: GIA HẠN LƯU TRÚ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('RELOCATE')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'RELOCATE'
                    ? 'bg-admin-primary text-[#002114] shadow-lg shadow-admin-primary/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-base">swap_horiz</span>
                <span>CHẾ ĐỘ 02: ĐỔI PHÒNG SỰ CỐ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('MONITOR')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'MONITOR'
                    ? 'bg-amber-400 text-[#002114] shadow-lg shadow-amber-400/20 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-base">table_view</span>
                <span>CHẾ ĐỘ 03: THEO DÕI ĐỔI PHÒNG</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── BĂNG CHỌN NHANH KHÁCH ĐANG Ở TRONG KHÁCH SẠN ───────────────── */}
        {activeMode !== 'MONITOR' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-admin-primary">
                  <span className="material-symbols-outlined text-xl">luggage</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#203044]">
                    Danh Sách Khách Đang Lưu Trú ({inHouseGuests.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chọn một phòng để thực hiện thao tác gia hạn hoặc đổi phòng trực tiếp
                  </p>
                </div>
              </div>

              {/* Ô tìm kiếm phòng / tên khách */}
              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm số phòng, tên khách, mã đặt..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#203044] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-admin-primary focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Băng cuộn ngang các phòng đang ở */}
            {loadingList ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                Đang nạp danh sách buồng phòng đang có khách...
              </div>
            ) : inHouseGuests.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Không tìm thấy lượt lưu trú nào phù hợp với từ khóa "{searchQuery}".
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {inHouseGuests.map((gst) => {
                  const isSelected = gst.StayId === selectedStayId;
                  return (
                    <div
                      key={gst.StayId}
                      onClick={() => setSelectedStayId(gst.StayId)}
                      className={`shrink-0 w-64 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-admin-primary/10 border-admin-primary shadow-md ring-2 ring-admin-primary/30'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-serif font-black text-[#203044]">
                          Phòng {gst.RoomNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ĐANG Ở
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate mb-1">
                        {gst.GuestName || 'Khách Vãng Lai'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Checkout: {fmtDateDisplay(gst.ExpectedCheckOut)}</span>
                        <span className="font-semibold text-slate-700">Tầng {gst.Floor || 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── NỘI DUNG CHÍNH (THEO CHẾ ĐỘ ĐANG CHỌN) ────────────────────────── */}
        {activeMode === 'MONITOR' ? (
          /* ══════════════════════════════════════════════════════════════════════
              CHẾ ĐỘ 03: BẢNG THEO DÕI ROOM MOVE (Spec 10 Section 6.2)
             ══════════════════════════════════════════════════════════════════════ */
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">table_chart</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#203044]">Bảng Theo Dõi Điều Chuyển Phòng (Room Move Tracker)</h2>
                  <p className="text-xs text-slate-500">Theo dõi toàn diện các sự cố, yêu cầu di dời và trạng thái bàn giao chìa khóa</p>
                </div>
              </div>

              {/* Bộ lọc trạng thái & mức độ sự cố */}
              <div className="flex items-center gap-3">
                <select
                  value={monitorFilterStatus}
                  onChange={(e) => setMonitorFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#203044]"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="REQUESTED">REQUESTED (Mới tạo)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Đang chuyển)</option>
                  <option value="COMPLETED">COMPLETED (Hoàn tất)</option>
                  <option value="CANCELLED">CANCELLED (Đã hủy)</option>
                </select>

                <select
                  value={monitorFilterSeverity}
                  onChange={(e) => setMonitorFilterSeverity(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#203044]"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="EMERGENCY">🔴 EMERGENCY (Khẩn cấp)</option>
                  <option value="HIGH">🟠 HIGH (Nghiêm trọng)</option>
                  <option value="MEDIUM">🟡 MEDIUM (Trung bình)</option>
                  <option value="LOW">🟢 LOW (Thấp)</option>
                </select>

                <button
                  type="button"
                  onClick={fetchMonitoringList}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                </button>
              </div>
            </div>

            {loadingMovesList ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                Đang tải dữ liệu ca trực điều phối...
              </div>
            ) : roomMovesList.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Chưa có yêu cầu đổi phòng nào được ghi nhận với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3">Mã &amp; Thời Gian</th>
                      <th className="p-3">Khách &amp; Phòng Cũ</th>
                      <th className="p-3">Sự Cố &amp; Mức Độ</th>
                      <th className="p-3">Phòng Đích &amp; Biểu Phí</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3">Người Tạo</th>
                      <th className="p-3 text-right">Tác Vụ Tiếp Theo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {roomMovesList.map((mv) => {
                      const isEmg = mv.IncidentSeverity === 'EMERGENCY' || mv.IsEmergency;
                      return (
                        <tr key={mv.MoveId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-[#203044]">#RM-{mv.MoveId}</span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(mv.CreatedAt).toLocaleTimeString('vi-VN')} {fmtDateDisplay(mv.CreatedAt)}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{mv.GuestName || 'Khách Lưu Trú'}</div>
                            <div className="text-[11px] text-slate-500">
                              Phòng nguồn: <strong className="text-slate-700">P.{mv.CurrentRoomNumber}</strong>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  mv.IncidentSeverity === 'EMERGENCY'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                    : mv.IncidentSeverity === 'HIGH'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : mv.IncidentSeverity === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {mv.IncidentSeverity}
                              </span>
                              <span className="font-semibold text-slate-600 text-[11px]">{mv.IncidentType}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 max-w-xs truncate" title={mv.IncidentDescription}>
                              {mv.IncidentDescription}
                            </div>
                          </td>
                          <td className="p-3">
                            <strong className="text-[#203044] font-serif">
                              {mv.TargetRoomNumber ? `P.${mv.TargetRoomNumber}` : '---'}
                            </strong>
                            <div className="text-[10px] text-slate-500">
                              Chính sách: <span className="font-semibold">{mv.RateAdjustment || 'KEEP_ORIGINAL'}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                                mv.MoveStatus === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : mv.MoveStatus === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                                  : mv.MoveStatus === 'CANCELLED'
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {mv.MoveStatus}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {mv.CreatedByName || `User #${mv.CreatedBy || 1}`}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {mv.MoveStatus !== 'COMPLETED' && mv.MoveStatus !== 'CANCELLED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteMoveFromTable(mv.MoveId)}
                                    className="px-2.5 py-1 rounded-lg bg-admin-primary hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    Hoàn Tất
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelMoveFromTable(mv.MoveId)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </>
                              )}
                              {mv.MoveStatus === 'COMPLETED' && (
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                                  <span className="material-symbols-outlined text-sm">done_all</span> Đã Bàn Giao
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
              BỐ CỤC 2 CỘT CHO CHẾ ĐỘ 01 (EXTEND) VÀ CHẾ ĐỘ 02 (RELOCATE)
             ══════════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ══════════════════════════════════════════════════════════════════════
                CỘT TRÁI (5 CỘT): HỒ SƠ LƯU TRÚ & BIÊN BẢN SỰ CỐ
                ══════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 space-y-6">

              {/* Khung 1: Hồ sơ lưu trú của khách đang chọn */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-admin-primary text-xl">contact_page</span>
                    <h3 className="font-bold text-sm text-[#203044]">Hồ Sơ Lưu Trú Đang Chọn</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    STAY #{stayDossier?.StayId || selectedStayId || '---'}
                  </span>
                </div>

                {loadingDossier ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                    Đang nạp chi tiết hồ sơ...
                  </div>
                ) : stayDossier ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Khách Đại Diện:</span>
                      <strong className="text-sm font-bold text-[#203044]">{stayDossier.guestName}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Phòng Hiện Tại:</span>
                      <span className="font-serif font-black text-base text-admin-primary">
                        Phòng {stayDossier.RoomNumber} ({stayDossier.roomType})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Số Khách Trong Phòng:</span>
                      <span className="font-semibold text-slate-700">
                        {stayDossier.adults || 1} Người lớn, {stayDossier.children || 0} Trẻ em
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Thời Gian Lưu Trú:</span>
                      <span className="font-semibold text-slate-700">
                        {fmtDateDisplay(stayDossier.CheckInDate)} ➔ {fmtDateDisplay(stayDossier.currentCheckout || stayDossier.CheckOutDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Đơn Giá Phòng Hiện Tại:</span>
                      <strong className="text-[#203044] font-mono">{fmtMoney(stayDossier.pricePerNight)} / đêm</strong>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Tình Trạng Folio / Hóa Đơn:</span>
                      <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Số dư hiện hành: {fmtMoney(stayDossier.currentFolioBalance || 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Chưa chọn hồ sơ lưu trú.
                  </div>
                )}
              </div>

              {/* Khung 2: Báo cáo sự cố & Biên bản đổi phòng (Chế độ 02 - Spec 10) */}
              {activeMode === 'RELOCATE' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-lg">warning</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#203044]">Báo Cáo Sự Cố &amp; Phiếu Đổi Phòng</h3>
                        <p className="text-[11px] text-slate-500">Mã đặc tả FEAT-ROOM-MOVE-01 (Spec 10)</p>
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEmergency}
                        onChange={(e) => setIsEmergency(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs font-bold text-rose-600 uppercase">Khẩn Cấp</span>
                    </label>
                  </div>

                  {/* Cảnh báo sự cố mức độ cao hoặc Emergency */}
                  {(incidentSeverity === 'HIGH' || incidentSeverity === 'EMERGENCY' || isEmergency) && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                      <span className="material-symbols-outlined text-rose-600 text-lg shrink-0">emergency_home</span>
                      <div>
                        <strong className="block font-bold">CẢNH BÁO SỰ CỐ MỨC ĐỘ CAO / KHẨN CẤP:</strong>
                        <span>Hệ thống tự động ghi nhật ký escalation, mở ticket bảo trì khẩn và gửi cảnh báo tới Giám sát ca trực.</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5 text-xs">
                    {/* Loại sự cố */}
                    <div>
                      <label className="font-bold text-[#203044] block mb-1">Loại Sự Cố (Incident Type):</label>
                      <select
                        value={incidentType}
                        onChange={(e) => setIncidentType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary"
                      >
                        <option value="MAINTENANCE">MAINTENANCE - Hỏng hóc kỹ thuật (điều hòa, nước, điện)</option>
                        <option value="SAFETY">SAFETY - Mối nguy an toàn (cháy nổ, khóa cửa, kính vỡ)</option>
                        <option value="CLEANLINESS">CLEANLINESS - Vệ sinh / Buồng phòng không đạt chuẩn</option>
                        <option value="NOISE">NOISE - Tiếng ồn xung quanh hoặc công trình</option>
                        <option value="ROOM_FEATURE">ROOM_FEATURE - Thiếu tiện nghi / Thiết bị cam kết</option>
                        <option value="GUEST_REQUEST">GUEST_REQUEST - Khách yêu cầu đổi phòng theo nguyện vọng</option>
                        <option value="OTHER">OTHER - Sự cố khác</option>
                      </select>
                    </div>

                    {/* Mức độ sự cố */}
                    <div>
                      <label className="font-bold text-[#203044] block mb-1.5">Mức Độ Nghiêm Trọng (Severity):</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { val: 'LOW', label: 'LOW', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
                          { val: 'MEDIUM', label: 'MEDIUM', color: 'border-yellow-200 text-yellow-800 bg-yellow-50' },
                          { val: 'HIGH', label: 'HIGH', color: 'border-amber-200 text-amber-800 bg-amber-50' },
                          { val: 'EMERGENCY', label: 'EMERGENCY', color: 'border-rose-300 text-rose-800 bg-rose-50' },
                        ].map((sev) => (
                          <button
                            key={sev.val}
                            type="button"
                            onClick={() => {
                              setIncidentSeverity(sev.val);
                              if (sev.val === 'EMERGENCY') setIsEmergency(true);
                            }}
                            className={`py-2 px-1 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                              incidentSeverity === sev.val
                                ? 'ring-2 ring-admin-primary shadow-sm ' + sev.color
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {sev.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mô tả chi tiết sự cố */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-[#203044]">Mô Tả Chi Tiết Sự Cố (10-1000 ký tự):</label>
                        <span className={`text-[10px] font-mono ${incidentDescription.length < 10 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                          {incidentDescription.length}/1000 ký tự
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={incidentDescription}
                        onChange={(e) => setIncidentDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary placeholder:text-slate-400"
                        placeholder="Mô tả chính xác hiện trạng sự cố phát sinh tại phòng..."
                      />
                    </div>

                    {/* Xử lý phòng cũ */}
                    <div>
                      <label className="font-bold text-[#203044] block mb-1">Xử Lý Phòng Cũ (Old Room Disposition):</label>
                      <select
                        value={oldRoomDisposition}
                        onChange={(e) => setOldRoomDisposition(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-[#203044]"
                      >
                        <option value="OUT_OF_ORDER">OUT_OF_ORDER - Khóa phòng hỏng &amp; Tạo Ticket bảo trì</option>
                        <option value="DIRTY">DIRTY - Chuyển Dọn Vệ Sinh (Gán task Housekeeping)</option>
                        <option value="INSPECTION_REQUIRED">INSPECTION_REQUIRED - Cần giám sát buồng phòng kiểm tra</option>
                        <option value="MAINTENANCE">MAINTENANCE - Chờ sửa chữa kỹ thuật chuyên sâu</option>
                      </select>
                    </div>

                    {/* Chính sách điều chỉnh giá */}
                    <div>
                      <label className="font-bold text-[#203044] block mb-1">Chính Sách Biểu Phí (Rate Policy):</label>
                      <select
                        value={rateAdjustment}
                        onChange={(e) => setRateAdjustment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-[#203044]"
                      >
                        <option value="KEEP_ORIGINAL">KEEP_ORIGINAL - Giữ giá gốc (Khách sạn chịu phí do sự cố)</option>
                        <option value="REPRICE_REMAINDER">REPRICE_REMAINDER - Định giá lại cho số đêm còn lại</option>
                        <option value="DISCOUNT">DISCOUNT - Giảm trừ phụ thu bồi thường</option>
                        <option value="NONE">NONE - Không điều chỉnh giá</option>
                      </select>
                    </div>

                    {/* Xác nhận của khách */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="font-bold text-[#203044] block mb-1.5">Xác Nhận Của Khách Hàng:</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="guestAck"
                            checked={guestAcknowledgement === 'ACCEPTED'}
                            onChange={() => setGuestAcknowledgement('ACCEPTED')}
                            className="text-admin-primary focus:ring-admin-primary"
                          />
                          <span className="font-semibold text-emerald-700">Khách Đồng Ý</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="guestAck"
                            checked={guestAcknowledgement === 'DECLINED'}
                            onChange={() => setGuestAcknowledgement('DECLINED')}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span className="font-semibold text-rose-700">Khách Từ Chối</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="guestAck"
                            checked={guestAcknowledgement === 'NOT_REACHED'}
                            onChange={() => setGuestAcknowledgement('NOT_REACHED')}
                            className="text-slate-500 focus:ring-slate-400"
                          />
                          <span className="text-slate-600">Chưa Liên Hệ Được</span>
                        </label>
                      </div>
                    </div>

                    {/* Tùy chọn bàn giao hành lý & khóa thẻ */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="font-bold text-[#203044] text-xs block">Tùy Chọn Bàn Giao:</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bellhopDispatched}
                          onChange={(e) => setBellhopDispatched(e.target.checked)}
                          className="rounded border-slate-300 text-admin-primary"
                        />
                        <span className="font-semibold text-slate-700">Điều động Bellhop hỗ trợ chuyển đồ</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={voidCurrentKeys}
                          onChange={(e) => setVoidCurrentKeys(e.target.checked)}
                          className="rounded border-slate-300 text-admin-primary"
                        />
                        <span className="font-semibold text-slate-700">Thu hồi &amp; Hủy quyền thẻ phòng cũ</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={suppressMinibar}
                          onChange={(e) => setSuppressMinibar(e.target.checked)}
                          className="rounded border-slate-300 text-admin-primary"
                        />
                        <span className="text-slate-600">Tạm hoãn kiểm kê quầy bar mini phòng cũ</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                CỘT PHẢI (7 CỘT): THEO CHẾ ĐỘ ĐANG CHỌN
                ══════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 space-y-6">

              {/* ─────────────────────────────────────────────────────────────────
                  CHẾ ĐỘ 01: GIA HẠN LƯU TRÚ (Spec 9)
                  ───────────────────────────────────────────────────────────────── */}
              {activeMode === 'EXTEND' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-admin-primary/15 text-admin-primary flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-xl">event_upcoming</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#203044]">Thông Số Gia Hạn Lưu Trú</h3>
                        <p className="text-xs text-slate-500">Kiểm tra xung đột phòng và tính biểu phí tự động</p>
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
                          +{additionalNights} Đêm
                        </span>
                      </div>

                      {/* Bộ nút bấm thêm ngày nhanh */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(1)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                        >
                          +1 Đêm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(2)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                        >
                          +2 Đêm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddDays(3)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
                        >
                          +3 Đêm
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Hoặc chọn trực tiếp ngày Checkout mới trên lịch:
                      </label>
                      <input
                        type="date"
                        value={customCheckoutDate}
                        onChange={handleCustomDateChange}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#203044] focus:outline-none focus:ring-2 focus:ring-admin-primary"
                      />
                    </div>
                  </div>

                  {/* Cảnh báo xung đột phòng */}
                  {conflictError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                      <span className="material-symbols-outlined text-rose-600 text-xl shrink-0">block</span>
                      <div className="space-y-1">
                        <strong className="block font-bold">Xung đột lịch đặt phòng:</strong>
                        <span>{conflictError}</span>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveMode('RELOCATE')}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
                          >
                            Chuyển sang Chế độ Đổi Phòng
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bảng tính phụ thu chi tiết */}
                  {previewData && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>Bảng Tính Phụ Thu Lưu Trú (Spec 9)</span>
                        <span className="font-mono text-admin-primary">#{previewData.quoteId}</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Giá phòng cơ sở (+{previewData.additionalNights} đêm):</span>
                          <strong className="text-[#203044] font-mono">{fmtMoney(previewData.baseAmount)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thuế GTGT ({previewData.taxRate || 12}%):</span>
                          <strong className="text-[#203044] font-mono">+{fmtMoney(previewData.taxAmount)}</strong>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                          <span className="font-bold text-[#203044]">Tổng Khoản Phí Ghi Nhận Folio:</span>
                          <span className="font-serif font-black text-emerald-700 text-base">
                            +{fmtMoney(previewData.netFolioAdjustment)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────────
                  CHẾ ĐỘ 02: MA TRẬN PHÒNG THAY THẾ (Spec 10)
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
                        <p className="text-xs text-slate-500">Kho phòng thời gian thực kết nối buồng phòng &amp; lễ tân</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      KHO PHÒNG TRỰC TIẾP
                    </span>
                  </div>

                  {/* Bộ lọc phòng thay thế */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Lọc Hạng Phòng</label>
                      <select
                        value={roomClassFilter}
                        onChange={(e) => setRoomClassFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-[#203044]"
                      >
                        <option value="ALL">Tất Cả Hạng Phòng Khả Dụng</option>
                        <option value="1">Standard (Tiêu chuẩn)</option>
                        <option value="2">Deluxe (Cao cấp)</option>
                        <option value="3">Executive Suite (Thượng hạng)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Lọc Theo Tầng</label>
                      <select
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-[#203044]"
                      >
                        <option value="ALL">Tất Cả Các Tầng</option>
                        <option value="1">Tầng 01</option>
                        <option value="2">Tầng 02</option>
                        <option value="3">Tầng 03</option>
                        <option value="4">Tầng 04</option>
                      </select>
                    </div>
                  </div>

                  {/* Danh sách phòng có thể đổi sang */}
                  {loadingRooms ? (
                    <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                      Đang quét kho phòng trống sạch khả dụng...
                    </div>
                  ) : replacementRooms.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500 font-semibold">
                      Không tìm thấy phòng trống sạch phù hợp với tiêu chí lọc.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {replacementRooms.map((rm) => {
                        const targetId = rm.RoomId || rm.roomId;
                        const targetNum = rm.RoomNumber || rm.roomNumber;
                        const isSelected = (selectedTargetRoom?.RoomId || selectedTargetRoom?.roomId) === targetId;

                        return (
                          <div
                            key={targetId}
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
                                  Phòng {targetNum}
                                </span>
                                <span className="text-xs text-slate-500">
                                  • Tầng {rm.Floor || rm.floor}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#203044] text-white">
                                    ĐÃ CHỌN
                                  </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {rm.readinessStatus === 'READY' ? 'SẴN SÀNG' : 'CẦN VỆ SINH'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 font-medium block text-[11px]">Hạng Phòng</span>
                                <strong className="text-[#203044]">{rm.CategoryType || rm.categoryType}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block text-[11px]">Phân Loại Đổi</span>
                                <strong className="text-admin-primary">{rm.classification}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium block text-[11px]">Chênh Lệch Giá</span>
                                <strong className={(rm.tariffDifferential || rm.tariffDiff) > 0 ? 'text-rose-600' : 'text-[#203044]'}>
                                  {fmtMoney(rm.BasePrice || rm.basePrice)} / Đêm ({(rm.tariffDifferential || rm.tariffDiff) >= 0 ? '+' : ''}{fmtMoney(rm.tariffDifferential || rm.tariffDiff || 0)})
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
        )}

        {/* ─── THANH THỰC THI CHÍNH Ở ĐÁY TRANG ──────────────────────────────── */}
        {activeMode !== 'MONITOR' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xl sticky bottom-4 z-40 space-y-3">

            {/* THÔNG BÁO TRỰC TIẾP NGAY TẠI KHU VỰC NÚT BẤM */}
            {actionFeedback && (
              <div
                className={`p-3.5 rounded-2xl flex items-center justify-between border shadow-sm animate-in fade-in slide-in-from-bottom-2 ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <span className="material-symbols-outlined text-xl shrink-0">
                    {actionFeedback.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{actionFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            )}

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
                      <strong className="text-admin-primary">{selectedTargetRoom?.RoomNumber || selectedTargetRoom?.roomNumber || '---'}</strong> • Chênh lệch đơn giá:{' '}
                      <strong className="text-emerald-700 font-mono">{fmtMoney(selectedTargetRoom?.tariffDifferential || selectedTargetRoom?.tariffDiff || 0)}</strong>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Dữ liệu sẽ được khóa và đồng bộ tự động vào hồ sơ Stays &amp; Bookings ngay sau khi xác nhận.
                </div>
              </div>

              {/* Các nút bấm hành động */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleEncodeKeys}
                  className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">contactless</span>
                  <span>Đầu Ghi Thẻ RFID</span>
                </button>

                {activeMode === 'EXTEND' ? (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      disabled={submitting || !previewData || Boolean(conflictError)}
                      onClick={handleConfirmExtension}
                      className="px-6 py-3 rounded-2xl bg-admin-primary hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs shadow-lg shadow-admin-primary/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>{submitting ? 'Đang Xử Lý...' : 'Xác Nhận Gia Hạn'}</span>
                    </button>
                    {actionFeedback?.type === 'success' && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <span className="material-symbols-outlined text-sm">done_all</span> Đã gia hạn thành công!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      disabled={submitting || !selectedTargetRoom}
                      onClick={handleConfirmRelocate}
                      className="px-6 py-3 rounded-2xl bg-admin-primary hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs shadow-lg shadow-admin-primary/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">swap_horizontal_circle</span>
                      <span>{submitting ? 'Đang Chuyển Phòng...' : 'Xác Nhận Đổi Phòng'}</span>
                    </button>
                    {actionFeedback?.type === 'success' && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <span className="material-symbols-outlined text-sm">done_all</span> Đã đổi phòng thành công!
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ─── MODAL MÃ HÓA THẺ TỪ RFID / NFC ─────────────────────────────────── */}
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
                    Phòng {activeMode === 'RELOCATE' ? selectedTargetRoom?.RoomNumber || selectedTargetRoom?.roomNumber || stayDossier?.RoomNumber : stayDossier?.RoomNumber}
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
                  <strong className="text-slate-700 font-mono">COM-3 (ĐẦU GHI THẺ ASSA ABLOY)</strong>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Số Lượng Thẻ:</span>
                  <strong className="text-[#203044]">2 Thẻ Từ Vật Lý</strong>
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
