import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import minibarApi from '../../api/minibarApi';

// ─── Tiện ích Định dạng ────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getHours())}:${p(dt.getMinutes())} ${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

// ─── Toast Container ────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-md text-xs pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2 ${
          t.type === 'error'
            ? 'bg-rose-900 border-rose-600 text-rose-50 shadow-rose-950/40'
            : t.type === 'success'
            ? 'bg-[#132d25] border-emerald-500 text-emerald-100 shadow-emerald-950/40'
            : t.type === 'warn'
            ? 'bg-[#2d2212] border-amber-500 text-amber-100 shadow-amber-950/40'
            : 'bg-[#1b2533] border-cyan-500 text-cyan-100 shadow-slate-950/40'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
          {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : t.type === 'warn' ? 'warning' : 'info'}
        </span>
        <div className="flex-1">
          {t.title && <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">{t.title}</p>}
          <p className="font-normal leading-relaxed">{t.message}</p>
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

// Danh sách lý do chênh lệch chuẩn Spec 12
const VARIANCE_REASONS = [
  { code: 'GUEST_CONSUMED', label: 'Khách đã sử dụng (Tính phí)' },
  { code: 'DAMAGED_EXPIRED', label: 'Hư hỏng / Hết hạn (Không tính khách)' },
  { code: 'AUDIT_DISCREPANCY', label: 'Thiếu do kiểm soát / Nhầm lẫn tồn' },
  { code: 'UNRECORDED_REPLENISH', label: 'Bổ sung chưa ghi nhận sổ sách' },
  { code: 'COMPLIMENTARY', label: 'Tiện ích miễn phí theo hạng phòng' },
  { code: 'OTHER', label: 'Lý do khác' },
];

export default function MinibarManagement() {
  const navigate = useNavigate();
  const { stayId: urlStayId } = useParams();

  // State danh sách & tìm kiếm
  const [staysList, setStaysList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL | PENDING | SUBMITTED | CONFIRMED
  const [selectedStayId, setSelectedStayId] = useState(urlStayId ? Number(urlStayId) : null);
  const [isLoadingStays, setIsLoadingStays] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // State chi tiết Minibar Inspection
  const [stayData, setStayData] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [lines, setLines] = useState([]);
  const [events, setEvents] = useState([]);
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetLine, setAdjustTargetLine] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ newQty: 0, reasonCode: 'GUEST_CONSUMED', note: '' });
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ reason: '', option: 'WAIVE_INSPECTION' });
  const [isAddExceptionOpen, setIsAddExceptionOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    productName: '',
    category: 'Snack',
    unit: 'Hộp',
    unitPrice: 50000,
    consumedQty: 1,
    notes: 'Món khách báo dùng ngoài danh mục tiêu chuẩn'
  });

  // Trạng thái xử lý
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = (type, message, title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // 1. Tải danh sách phòng CheckedIn
  const loadStays = useCallback(async (query = '') => {
    setIsLoadingStays(true);
    try {
      const res = await minibarApi.getStays(query, 100);
      if (res.success && res.data) {
        setStaysList(res.data);
        if (!selectedStayId && res.data.length > 0) {
          const firstStay = urlStayId ? res.data.find((s) => s.StayId === Number(urlStayId)) || res.data[0] : res.data[0];
          setSelectedStayId(firstStay.StayId);
        }
      }
    } catch (err) {
      addToast('error', 'Không thể kết nối đến danh sách phòng minibar: ' + err.message, 'Lỗi Kết Nối');
    } finally {
      setIsLoadingStays(false);
    }
  }, [selectedStayId, urlStayId]);

  useEffect(() => {
    loadStays(searchQuery);
  }, [loadStays, searchQuery]);

  // 2. Tải chi tiết phiên kiểm kê của stay được chọn
  const loadStayMinibar = useCallback(async (stayId) => {
    if (!stayId) return;
    setIsLoadingDetail(true);
    try {
      const res = await minibarApi.getStayMinibar(stayId);
      if (res.success && res.data) {
        setStayData(res.data.stay);
        setInspectionData(res.data.inspection);
        setLines(res.data.lines || []);
        setEvents(res.data.events || []);
        setInspectionNotes(res.data.inspection?.Notes || '');
      } else {
        addToast('warn', res.message || 'Không thể tải dữ liệu minibar', 'Thông Báo');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi khi tải chi tiết kiểm kê minibar', 'Lỗi Máy Chủ');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStayId) {
      loadStayMinibar(selectedStayId);
    }
  }, [selectedStayId, loadStayMinibar]);

  const handleSelectStay = (stayId) => {
    setSelectedStayId(stayId);
    navigate(`/admin/minibar/${stayId}`, { replace: true });
  };

  // 3. Xử lý thay đổi số lượng còn lại (remainingQty)
  const handleRemainingQtyChange = (index, value) => {
    if (inspectionData?.Status === 'CONFIRMED') {
      addToast('warn', 'Kiểm kê minibar đã được xác nhận và không thể sửa trực tiếp', 'MINIBAR_0005_ALREADY_CONFIRMED');
      return;
    }
    const val = Number(value);
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const remaining = isNaN(val) ? 0 : Math.max(0, val);
        const opening = Number(l.OpeningQty ?? l.openingQty ?? 0);
        const replenished = Number(l.ReplenishedQty ?? l.replenishedQty ?? 0);
        const comp = Number(l.ComplimentaryQty ?? l.complimentaryQty ?? 0);
        const available = opening + replenished;
        const consumed = Math.max(0, available - remaining - comp);
        const isWaived = l.Status === 'WAIVED' || l.VarianceReason === 'DAMAGED_EXPIRED' || l.VarianceReason === 'COMPLIMENTARY';
        const billable = isWaived ? 0 : consumed;
        const price = Number(l.UnitPrice ?? l.unitPrice ?? 0);
        const lineAmt = billable * price;

        return {
          ...l,
          RemainingQty: remaining,
          remainingQty: remaining,
          ConsumedQty: consumed,
          consumedQty: consumed,
          BillableQty: billable,
          billableQty: billable,
          LineAmount: lineAmt,
          lineAmount: lineAmt,
          VarianceReason: consumed > 0 ? (l.VarianceReason || 'GUEST_CONSUMED') : (l.VarianceReason || 'NO_VARIANCE')
        };
      })
    );
  };

  const handleQuickQtyDelta = (index, delta) => {
    const current = Number(lines[index]?.RemainingQty ?? lines[index]?.remainingQty ?? 0);
    handleRemainingQtyChange(index, current + delta);
  };

  const handleVarianceReasonChange = (index, reason) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const isWaived = reason === 'DAMAGED_EXPIRED' || reason === 'COMPLIMENTARY';
        const consumed = Number(l.ConsumedQty ?? l.consumedQty ?? 0);
        const billable = isWaived ? 0 : consumed;
        const price = Number(l.UnitPrice ?? l.unitPrice ?? 0);
        return {
          ...l,
          VarianceReason: reason,
          varianceReason: reason,
          BillableQty: billable,
          billableQty: billable,
          LineAmount: billable * price,
          lineAmount: billable * price
        };
      })
    );
  };

  // Tính toán tổng số lượng tiêu thụ và tổng tiền
  const calculatedTotals = useMemo(() => {
    let totalQty = 0;
    let subtotal = 0;
    let hasVarianceWithoutReason = false;
    let hasQuantityMismatch = false;

    lines.forEach((l) => {
      const remaining = Number(l.RemainingQty ?? l.remainingQty ?? 0);
      const opening = Number(l.OpeningQty ?? l.openingQty ?? 0);
      const replenished = Number(l.ReplenishedQty ?? l.replenishedQty ?? 0);
      const comp = Number(l.ComplimentaryQty ?? l.complimentaryQty ?? 0);
      const available = opening + replenished;
      const consumed = Math.max(0, available - remaining - comp);
      const lineAmt = Number(l.LineAmount ?? l.lineAmount ?? 0);
      const reason = l.VarianceReason ?? l.varianceReason;

      totalQty += consumed;
      subtotal += lineAmt;

      if (remaining > available) {
        hasQuantityMismatch = true;
      }
      if ((consumed > 0 || remaining !== available) && (!reason || reason === 'NO_VARIANCE')) {
        hasVarianceWithoutReason = true;
      }
    });

    const taxAmount = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + taxAmount;

    return { totalQty, subtotal, taxAmount, totalAmount, hasVarianceWithoutReason, hasQuantityMismatch };
  }, [lines]);

  // 4. Lưu Bản Nháp (DRAFT) hoặc Gửi Kiểm Kê (SUBMITTED)
  const handleSaveInspection = async (targetStatus = 'DRAFT') => {
    if (!selectedStayId) return;

    if (calculatedTotals.hasQuantityMismatch) {
      addToast('warn', 'Số lượng kiểm kê không khớp. Vui lòng kiểm tra lại số lượng nạp và số lượng còn lại.', 'MINIBAR_0003_QUANTITY_MISMATCH');
      return;
    }

    if (targetStatus === 'SUBMITTED' && calculatedTotals.hasVarianceWithoutReason) {
      addToast('warn', 'Vui lòng chọn lý do cho số lượng chênh lệch', 'MINIBAR_0007_REASON_REQUIRED');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        inspectionId: inspectionData?.InspectionId,
        status: targetStatus,
        version: inspectionData?.Version || 1,
        notes: inspectionNotes,
        lines: lines.map((l) => ({
          productId: l.ProductId ?? l.productId,
          productName: l.ProductName ?? l.productName,
          category: l.Category ?? l.category,
          unit: l.Unit ?? l.unit,
          openingQty: Number(l.OpeningQty ?? l.openingQty ?? 0),
          replenishedQty: Number(l.ReplenishedQty ?? l.replenishedQty ?? 0),
          remainingQty: Number(l.RemainingQty ?? l.remainingQty ?? 0),
          complimentaryQty: Number(l.ComplimentaryQty ?? l.complimentaryQty ?? 0),
          unitPrice: Number(l.UnitPrice ?? l.unitPrice ?? 0),
          varianceReason: l.VarianceReason ?? l.varianceReason ?? 'GUEST_CONSUMED',
          isException: Boolean(l.IsException ?? l.isException),
          notes: l.Notes ?? l.notes ?? ''
        }))
      };

      const res = await minibarApi.saveInspection(selectedStayId, payload);
      if (res.success) {
        addToast('success', res.message, targetStatus === 'SUBMITTED' ? 'Đã Gửi Kiểm Kê' : 'Đã Lưu Bản Nháp');
        await loadStayMinibar(selectedStayId);
        await loadStays(searchQuery);
      } else {
        addToast('error', res.message || 'Lỗi lưu kiểm kê minibar', res.errorCode || 'Lỗi');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi kết nối khi lưu kiểm kê minibar', err.errorCode || 'Lỗi Máy Chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Xác nhận kiểm kê (CONFIRMED) và ghi phí vào Folio/Hóa đơn
  const handleConfirmInspection = async () => {
    if (!inspectionData?.InspectionId) {
      addToast('warn', 'Vui lòng bấm Gửi Kiểm Kê (SUBMIT) trước khi xác nhận tính phí.', 'Chưa Có Phiên');
      return;
    }

    setIsConfirming(true);
    try {
      const res = await minibarApi.confirmInspection(selectedStayId, inspectionData.InspectionId, {
        confirmedBy: 1,
        confirmedByName: 'Sarah Jenkins (Shift Mgr #4092)'
      });

      if (res.success) {
        addToast('success', 'Đã xác nhận kiểm kê minibar và cập nhật khoản phí vào hóa đơn', 'SUCCESS_MINIBAR_0001_CONFIRMED');
        setIsConfirmModalOpen(false);
        await loadStayMinibar(selectedStayId);
        await loadStays(searchQuery);
      } else {
        addToast('error', res.message || 'Không thể xác nhận kiểm kê minibar', res.errorCode || 'MINIBAR_0010_CHARGE_FAILED');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi khi xác nhận kiểm kê minibar', err.errorCode || 'MINIBAR_0010_CHARGE_FAILED');
    } finally {
      setIsConfirming(false);
    }
  };

  // 6. Điều chỉnh dòng sau xác nhận (MINIBAR_ADJUST)
  const handleOpenAdjust = (line) => {
    setAdjustTargetLine(line);
    setAdjustForm({
      newQty: Number(line.ConsumedQty ?? line.consumedQty ?? 0),
      reasonCode: line.VarianceReason ?? line.varianceReason ?? 'GUEST_CONSUMED',
      note: ''
    });
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async () => {
    if (!adjustTargetLine || !inspectionData?.InspectionId) return;

    if (!adjustForm.reasonCode) {
      addToast('warn', 'Vui lòng chọn lý do cho thao tác điều chỉnh', 'MINIBAR_0007_REASON_REQUIRED');
      return;
    }

    try {
      const price = Number(adjustTargetLine.UnitPrice ?? adjustTargetLine.unitPrice ?? 0);
      const newAmt = Number(adjustForm.newQty) * price;
      const res = await minibarApi.adjustLine(selectedStayId, inspectionData.InspectionId, {
        lineId: adjustTargetLine.LineId ?? adjustTargetLine.lineId,
        adjustedQty: Number(adjustForm.newQty),
        adjustedAmount: newAmt,
        reasonCode: adjustForm.reasonCode,
        note: adjustForm.note,
        adjustedBy: 1,
        adjustedByName: 'Giám Sát Ca Trực'
      });

      if (res.success) {
        addToast('success', res.message, 'Đã Điều Chỉnh Phí');
        setIsAdjustModalOpen(false);
        await loadStayMinibar(selectedStayId);
      } else {
        addToast('error', res.message, 'Lỗi Điều Chỉnh');
      }
    } catch (err) {
      addToast('error', err.message, 'Lỗi');
    }
  };

  // 7. Lễ tân Override kiểm kê
  const handleExecuteOverride = async () => {
    if (!selectedStayId) return;
    if (!overrideForm.reason.trim()) {
      addToast('warn', 'Vui lòng nhập lý do miễn hoặc bỏ qua kiểm kê minibar', 'MINIBAR_0007_REASON_REQUIRED');
      return;
    }

    try {
      const res = await minibarApi.overrideInspection(selectedStayId, {
        overrideReason: overrideForm.reason,
        overrideOption: overrideForm.option,
        userId: 1,
        userName: 'Lễ Tân Trực Tiếp'
      });

      if (res.success) {
        addToast('success', res.message, 'Đã Ghi Nhận Override');
        setIsOverrideModalOpen(false);
        await loadStayMinibar(selectedStayId);
        await loadStays(searchQuery);
      } else {
        addToast('error', res.message, 'Lỗi Override');
      }
    } catch (err) {
      addToast('error', err.message, 'Lỗi');
    }
  };

  // 8. Thêm dòng ngoại lệ (Món khách dùng ngoài danh mục tiêu chuẩn)
  const handleAddException = () => {
    if (!exceptionForm.productName.trim()) {
      addToast('warn', 'Vui lòng nhập tên sản phẩm ngoại lệ', 'Thiếu Dữ Liệu');
      return;
    }

    const price = Number(exceptionForm.unitPrice || 0);
    const qty = Number(exceptionForm.consumedQty || 1);

    const newLine = {
      ProductId: null,
      ProductName: exceptionForm.productName.trim(),
      Category: exceptionForm.category,
      Unit: exceptionForm.unit,
      OpeningQty: 0,
      ReplenishedQty: 0,
      RemainingQty: 0,
      ComplimentaryQty: 0,
      ConsumedQty: qty,
      BillableQty: qty,
      UnitPrice: price,
      LineAmount: qty * price,
      VarianceReason: 'GUEST_CONSUMED',
      IsException: true,
      Status: 'DRAFT',
      Notes: exceptionForm.notes
    };

    setLines((prev) => [...prev, newLine]);
    setIsAddExceptionOpen(false);
    setExceptionForm({
      productName: '',
      category: 'Snack',
      unit: 'Hộp',
      unitPrice: 50000,
      consumedQty: 1,
      notes: 'Món khách báo dùng ngoài danh mục tiêu chuẩn'
    });
    addToast('info', `Đã thêm món ngoại lệ: ${newLine.ProductName}. Cần Giám sát xác nhận trước khi tính phí.`, 'Dòng Ngoại Lệ');
  };

  // Lọc danh sách phòng theo tab
  const filteredStays = useMemo(() => {
    if (filterMode === 'PENDING') return staysList.filter((s) => s.MinibarInspectionStatus === 'NOT_INSPECTED' || s.MinibarInspectionStatus === 'DRAFT');
    if (filterMode === 'SUBMITTED') return staysList.filter((s) => s.MinibarInspectionStatus === 'SUBMITTED');
    if (filterMode === 'CONFIRMED') return staysList.filter((s) => s.MinibarInspectionStatus === 'CONFIRMED');
    return staysList;
  }, [staysList, filterMode]);

  return (
    <AdminLayout>
      <div className="space-y-5 pb-16 font-sans text-[#203044]">
        {/* ─── THANH TIÊU ĐỀ GRAND HORIZON HOSPITALITY ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dedad0]/60 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#203044] flex items-center justify-center text-[#ffd985] shadow-md shadow-[#203044]/15">
                <span className="material-symbols-outlined text-2xl">kitchen</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-widest text-[#203044] uppercase">
                    QUẢN LÝ TIỆN ÍCH PHÒNG // SPEC 12
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b9a277]"></span>
                  <span className="text-[11px] font-serif font-bold text-[#b9a277] uppercase tracking-wider">
                    FEAT-MINIBAR-01
                  </span>
                </div>
                <h1 className="text-xl font-serif font-black text-[#203044] tracking-tight">
                  Quản Lý Minibar Phòng &amp; Kiểm Kê Tiêu Thụ Trả Phòng
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Link
                to={`/admin/check-out/${selectedStayId || ''}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] text-[#203044] font-bold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#b9a277]">logout</span>
                Đến Trạm Check-Out Desk
              </Link>
            </div>
          </div>

          <p className="text-xs text-[#8a8782] leading-relaxed">
            Hệ thống đối chiếu tồn kho minibar in-room tại thời điểm checkout, nhập số lượng khách đã sử dụng theo từng sản phẩm, tự động tính phí theo đơn giá snapshot và ghi nhận chính xác vào hóa đơn lưu trú.
          </p>
        </div>

        {/* ─── KHÔNG GIAN LÀM VIỆC 2 CỘT ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CỘT TRÁI: DANH SÁCH PHÒNG LƯU TRÚ (4 CỘT) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-serif font-bold text-sm text-[#203044] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#b9a277]">hotel</span>
                  Danh Sách Phòng Lưu Trú ({filteredStays.length})
                </h3>
                <button
                  onClick={() => loadStays(searchQuery)}
                  className="text-xs text-[#b9a277] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  Làm mới
                </button>
              </div>

              {/* Ô Tìm Kiếm Nhanh */}
              <div className="relative mb-3">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8a8782] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm số phòng, mã đặt, tên khách..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none transition-colors"
                />
              </div>

              {/* Bộ lọc trạng thái kiểm kê */}
              <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-[11px] font-bold">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'PENDING', label: 'Chờ kiểm' },
                  { key: 'SUBMITTED', label: 'Chờ duyệt' },
                  { key: 'CONFIRMED', label: 'Đã chốt' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterMode(tab.key)}
                    className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      filterMode === tab.key
                        ? 'bg-[#203044] text-[#ffd985]'
                        : 'bg-[#fbf8f2] text-[#8a8782] hover:text-[#203044]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Danh sách phòng */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {isLoadingStays ? (
                  <div className="py-8 text-center text-xs text-[#8a8782]">Đang tải danh sách phòng...</div>
                ) : filteredStays.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8a8782]">Không tìm thấy phòng phù hợp</div>
                ) : (
                  filteredStays.map((s) => {
                    const isSelected = s.StayId === selectedStayId;
                    const status = s.MinibarInspectionStatus;
                    const statusBadge =
                      status === 'CONFIRMED'
                        ? { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Đã xác nhận' }
                        : status === 'SUBMITTED'
                        ? { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: 'Chờ duyệt' }
                        : status === 'DRAFT'
                        ? { bg: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Bản nháp' }
                        : { bg: 'bg-stone-100 text-stone-700 border-stone-300', text: 'Chưa kiểm' };

                    return (
                      <div
                        key={s.StayId}
                        onClick={() => handleSelectStay(s.StayId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#fbf8f2] border-[#203044] shadow-sm ring-1 ring-[#203044]'
                            : 'bg-white border-[#dedad0] hover:border-[#b9a277]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-sm text-[#203044] tracking-tight">
                            Phòng {s.RoomNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        <div className="text-xs text-[#8a8782] flex items-center justify-between">
                          <span>{s.GuestName}</span>
                          <span className="font-mono font-bold text-[#203044]">
                            {fmtMoney(s.MinibarTotalAmount || 0)}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8a8782] mt-1 flex items-center justify-between">
                          <span>Hạng: {s.RoomTypeName}</span>
                          <span>Đã dùng: {s.TotalConsumedQty ? `${s.TotalConsumedQty} món` : '—'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: KHÔNG GIAN KIỂM ĐẾM MINIBAR CHI TIẾT (8 CỘT) */}
          <div className="lg:col-span-8 space-y-4">
            {isLoadingDetail ? (
              <div className="bg-white rounded-2xl border border-[#dedad0] p-12 text-center text-xs text-[#8a8782]">
                Đang tải dữ liệu kiểm kê minibar...
              </div>
            ) : !stayData ? (
              <div className="bg-white rounded-2xl border border-[#dedad0] p-12 text-center text-xs text-[#8a8782]">
                Vui lòng chọn một phòng lưu trú từ cột bên trái để bắt đầu kiểm kê.
              </div>
            ) : (
              <>
                {/* 1. Header chi tiết phòng đang kiểm kê */}
                <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif font-black text-lg text-[#203044]">
                        Phòng {stayData.RoomNumber} — {stayData.RoomTypeName}
                      </h2>
                      <span className="text-xs text-[#8a8782]">| Tầng {stayData.Floor}</span>
                    </div>
                    <div className="text-xs text-[#8a8782] flex items-center gap-3 mt-1">
                      <span>Khách: <strong className="text-[#203044]">{stayData.GuestName}</strong></span>
                      <span>Mã đặt: <strong className="font-mono text-[#203044]">{stayData.ConfirmationCode}</strong></span>
                    </div>
                  </div>

                  {/* Trạng thái phiên kiểm kê */}
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs">
                      <div className="text-[10px] uppercase font-bold text-[#8a8782]">Trạng Thái Minibar:</div>
                      <div className="font-black text-xs text-[#203044]">
                        {inspectionData?.Status === 'CONFIRMED'
                          ? 'ĐÃ XÁC NHẬN (CONFIRMED)'
                          : inspectionData?.Status === 'SUBMITTED'
                          ? 'CHỜ DUYỆT (SUBMITTED)'
                          : inspectionData?.Status === 'DRAFT'
                          ? 'BẢN NHÁP (DRAFT)'
                          : 'CHƯA KIỂM KÊ (NEW)'}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-[#fbf8f2] border border-[#dedad0] text-[#8a8782]">
                      v{inspectionData?.Version || 1}
                    </span>
                  </div>
                </div>

                {/* 2. Cảnh Báo Nếu Có Chênh Lệch Thiếu Lý Do */}
                {calculatedTotals.hasVarianceWithoutReason && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
                    <span>
                      <strong>Chú ý:</strong> Phát hiện món có chênh lệch tiêu thụ hoặc thay đổi tồn kho nhưng chưa chọn lý do ngoại lệ. Vui lòng chọn lý do ở từng dòng để có thể gửi xác nhận.
                    </span>
                  </div>
                )}

                {/* 3. Bảng Sản Phẩm Minibar Chuẩn Spec 12 */}
                <div className="bg-white rounded-2xl border border-[#dedad0] shadow-sm overflow-hidden">
                  <div className="p-3 bg-[#fbf8f2] border-b border-[#dedad0] flex items-center justify-between">
                    <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#203044] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#b9a277]">local_bar</span>
                      Danh Mục Đồ Uống &amp; Snack In-Room (FEAT-MINIBAR-01)
                    </h3>
                    {inspectionData?.Status !== 'CONFIRMED' && (
                      <button
                        onClick={() => setIsAddExceptionOpen(true)}
                        className="text-[11px] font-bold text-[#b9a277] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add_circle</span>
                        Thêm món ngoại lệ
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#fbf8f2]/60 text-[#8a8782] text-[11px] uppercase border-b border-[#dedad0]">
                          <th className="py-2.5 px-3 font-bold">Sản phẩm</th>
                          <th className="py-2.5 px-2 font-bold text-center">Nạp đầu</th>
                          <th className="py-2.5 px-2 font-bold text-center">Thêm</th>
                          <th className="py-2.5 px-3 font-bold text-center w-32">Còn lại (Đếm)</th>
                          <th className="py-2.5 px-2 font-bold text-center">Đã dùng</th>
                          <th className="py-2.5 px-3 font-bold text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 font-bold text-right">Thành tiền</th>
                          <th className="py-2.5 px-3 font-bold">Lý do chênh lệch</th>
                          <th className="py-2.5 px-2 font-bold text-center">Tác vụ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dedad0]/60">
                        {lines.map((l, idx) => {
                          const consumed = Number(l.ConsumedQty ?? l.consumedQty ?? 0);
                          const remaining = Number(l.RemainingQty ?? l.remainingQty ?? 0);
                          const opening = Number(l.OpeningQty ?? l.openingQty ?? 0);
                          const replenished = Number(l.ReplenishedQty ?? l.replenishedQty ?? 0);
                          const available = opening + replenished;
                          const hasVariance = consumed > 0 || remaining !== available;
                          const isConfirmed = inspectionData?.Status === 'CONFIRMED';

                          return (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                consumed > 0
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                  : 'hover:bg-[#fbf8f2]/40'
                              }`}
                            >
                              {/* Tên món */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-[#203044] flex items-center gap-1.5">
                                  {l.ProductName ?? l.productName}
                                  {l.IsException && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 border border-rose-300 rounded">
                                      Ngoại lệ
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#8a8782]">
                                  {l.Category ?? l.category} • ĐVT: {l.Unit ?? l.unit}
                                </div>
                              </td>

                              {/* Nạp đầu */}
                              <td className="py-2.5 px-2 text-center font-mono text-[#8a8782]">
                                {opening}
                              </td>

                              {/* Bổ sung */}
                              <td className="py-2.5 px-2 text-center font-mono text-[#8a8782]">
                                {replenished}
                              </td>

                              {/* Còn lại (Input + nút đếm nhanh) */}
                              <td className="py-2.5 px-3">
                                {isConfirmed ? (
                                  <div className="text-center font-mono font-bold text-[#203044]">
                                    {remaining}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickQtyDelta(idx, -1)}
                                      disabled={remaining <= 0}
                                      className="w-6 h-6 rounded bg-[#fbf8f2] border border-[#dedad0] hover:bg-[#dedad0]/40 flex items-center justify-center font-bold text-[#203044] disabled:opacity-30 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max="99"
                                      value={remaining}
                                      onChange={(e) => handleRemainingQtyChange(idx, e.target.value)}
                                      className="w-12 py-1 text-center font-mono font-bold text-xs rounded bg-white border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQuickQtyDelta(idx, 1)}
                                      className="w-6 h-6 rounded bg-[#fbf8f2] border border-[#dedad0] hover:bg-[#dedad0]/40 flex items-center justify-center font-bold text-[#203044] cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Đã dùng (Read-only) */}
                              <td className="py-2.5 px-2 text-center font-mono font-black text-sm text-[#203044]">
                                {consumed > 0 ? (
                                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                                    {consumed}
                                  </span>
                                ) : (
                                  <span className="text-[#8a8782]">0</span>
                                )}
                              </td>

                              {/* Đơn giá snapshot */}
                              <td className="py-2.5 px-3 text-right font-mono text-[#8a8782]">
                                {fmtMoney(l.UnitPrice ?? l.unitPrice)}
                              </td>

                              {/* Thành tiền */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#203044]">
                                {fmtMoney(l.LineAmount ?? l.lineAmount)}
                              </td>

                              {/* Lý do chênh lệch */}
                              <td className="py-2.5 px-3">
                                {isConfirmed ? (
                                  <span className="text-[11px] text-[#8a8782]">
                                    {VARIANCE_REASONS.find((r) => r.code === (l.VarianceReason || l.varianceReason))?.label || l.VarianceReason || '—'}
                                  </span>
                                ) : (
                                  <select
                                    value={l.VarianceReason || l.varianceReason || 'GUEST_CONSUMED'}
                                    onChange={(e) => handleVarianceReasonChange(idx, e.target.value)}
                                    className={`w-full py-1 px-1.5 text-[11px] rounded bg-white border focus:outline-none ${
                                      hasVariance && (!l.VarianceReason || l.VarianceReason === 'NO_VARIANCE')
                                        ? 'border-amber-500 bg-amber-50/50'
                                        : 'border-[#dedad0]'
                                    }`}
                                  >
                                    {VARIANCE_REASONS.map((vr) => (
                                      <option key={vr.code} value={vr.code}>
                                        {vr.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              {/* Tác vụ điều chỉnh sau xác nhận */}
                              <td className="py-2.5 px-2 text-center">
                                {isConfirmed && (
                                  <button
                                    onClick={() => handleOpenAdjust(l)}
                                    className="p-1 rounded hover:bg-[#dedad0]/40 text-[#b9a277] cursor-pointer"
                                    title="Giám sát điều chỉnh/đảo phí"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Bảng tổng kết tiền */}
                  <div className="p-4 bg-[#fbf8f2] border-t border-[#dedad0] flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-[#8a8782]">
                      Tổng số lượng khách đã dùng:{' '}
                      <strong className="text-[#203044] text-sm">{calculatedTotals.totalQty} món</strong>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-[#8a8782]">Tiền hàng:</span>{' '}
                        <strong className="font-mono text-[#203044]">{fmtMoney(calculatedTotals.subtotal)}</strong>
                      </div>
                      <div>
                        <span className="text-[#8a8782]">Thuế GTGT (10%):</span>{' '}
                        <strong className="font-mono text-[#203044]">{fmtMoney(calculatedTotals.taxAmount)}</strong>
                      </div>
                      <div className="text-sm font-serif">
                        <span className="text-[#8a8782] font-sans text-xs">Tổng phí Minibar:</span>{' '}
                        <strong className="font-mono text-base font-black text-[#203044]">
                          {fmtMoney(calculatedTotals.totalAmount)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Ghi Chú Kiểm Kê Của Nhân Viên */}
                <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm">
                  <label className="block text-xs font-bold text-[#203044] mb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#b9a277]">notes</span>
                    Ghi Chú Kiểm Kê / Biên Bản Bàn Giao (Tối đa 500 ký tự)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Nhập ghi chú tình trạng tủ minibar, niêm phong hoặc lý do đặc biệt..."
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    disabled={inspectionData?.Status === 'CONFIRMED'}
                    className="w-full p-2.5 text-xs rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none transition-colors"
                  />
                </div>

                {/* 5. Khối Nút Hành Động Nghiệp Vụ */}
                <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOverrideModalOpen(true)}
                      className="px-3 py-2 rounded-xl border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">no_meeting_room</span>
                      Miễn / Bỏ Qua Kiểm Kê (Override)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {inspectionData?.Status !== 'CONFIRMED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveInspection('DRAFT')}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] text-[#203044] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          Lưu Bản Nháp (DRAFT)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveInspection('SUBMITTED')}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl bg-[#b9a277] hover:bg-[#a68f66] text-[#203044] text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Gửi Kiểm Kê (SUBMIT)
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsConfirmModalOpen(true)}
                      disabled={isConfirming || inspectionData?.Status === 'CONFIRMED'}
                      className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                        inspectionData?.Status === 'CONFIRMED'
                          ? 'bg-emerald-600 text-white opacity-80 cursor-default'
                          : 'bg-[#203044] hover:bg-[#152230] text-[#ffd985]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      {inspectionData?.Status === 'CONFIRMED' ? 'Đã Chốt Phí Vào Hóa Đơn' : 'Xác Nhận & Ghi Phí (CONFIRM)'}
                    </button>
                  </div>
                </div>

                {/* 6. Nhật Ký Sự Kiện Kiểm Kê (Audit Trail) */}
                {events.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm">
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#203044] mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#b9a277]">history</span>
                      Nhật Ký Kiểm Toán (Audit Trail)
                    </h4>
                    <div className="space-y-2 text-xs">
                      {events.map((ev) => (
                        <div key={ev.EventId} className="p-2.5 rounded-xl bg-[#fbf8f2] border border-[#dedad0]/60 flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-[#203044] text-[11px] uppercase font-mono">{ev.ActionType}</strong>
                              <span className="text-[10px] text-[#8a8782]">• Thực hiện bởi: {ev.UserName || 'Hệ thống'}</span>
                            </div>
                            <p className="text-[11px] text-[#8a8782] mt-0.5">{ev.Reason}</p>
                          </div>
                          <span className="text-[10px] text-[#8a8782] font-mono whitespace-nowrap">
                            {fmtDateTime(ev.CreatedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── MODAL 1: XÁC NHẬN & GHI PHÍ (CONFIRM) ───────────────────────── */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-[#dedad0] shadow-2xl max-w-md w-full p-6 text-xs text-[#203044] animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 border-b border-[#dedad0] pb-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#203044] text-[#ffd985] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-[#203044]">
                    Xác Nhận Biên Bản Minibar &amp; Ghi Phí
                  </h3>
                  <p className="text-[11px] text-[#8a8782]">Phòng {stayData?.RoomNumber} — Lượt {stayData?.StayId}</p>
                </div>
              </div>

              <div className="space-y-3 bg-[#fbf8f2] p-3.5 rounded-xl border border-[#dedad0] mb-4">
                <div className="flex justify-between">
                  <span className="text-[#8a8782]">Tổng số lượng đã dùng:</span>
                  <strong className="font-mono text-[#203044]">{calculatedTotals.totalQty} món</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a8782]">Tiền hàng:</span>
                  <strong className="font-mono text-[#203044]">{fmtMoney(calculatedTotals.subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a8782]">Thuế GTGT (10%):</span>
                  <strong className="font-mono text-[#203044]">{fmtMoney(calculatedTotals.taxAmount)}</strong>
                </div>
                <div className="border-t border-[#dedad0] pt-2 flex justify-between text-sm">
                  <span className="font-serif font-bold text-[#203044]">Tổng phí Minibar:</span>
                  <strong className="font-mono font-black text-base text-[#203044]">
                    {fmtMoney(calculatedTotals.totalAmount)}
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-[#8a8782] mb-5 leading-relaxed">
                Sau khi xác nhận, khoản phí trên sẽ được khóa và tự động cập nhật vào <strong>Hóa Đơn / Folio</strong> của lượt lưu trú. Thao tác có tính chất kế toán không thể đảo ngược tùy tiện.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] font-bold text-[#203044] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInspection}
                  disabled={isConfirming}
                  className="px-5 py-2 rounded-xl bg-[#203044] hover:bg-[#152230] text-[#ffd985] font-black cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isConfirming ? 'Đang ghi nhận...' : 'Đồng Ý Xác Nhận'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: THÊM MÓN NGOẠI LỆ ───────────────────────────────────── */}
        {isAddExceptionOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-[#dedad0] shadow-2xl max-w-md w-full p-6 text-xs text-[#203044] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#dedad0] pb-3 mb-4">
                <h3 className="font-serif font-black text-sm text-[#203044] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#b9a277]">add_shopping_cart</span>
                  Thêm Món Minibar Ngoại Lệ
                </h3>
                <button
                  onClick={() => setIsAddExceptionOpen(false)}
                  className="text-[#8a8782] hover:text-[#203044] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block font-bold text-[11px] mb-1">Tên sản phẩm ngoại lệ *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Rượu vang đặc biệt khách mang vào / Snack yêu cầu thêm"
                    value={exceptionForm.productName}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, productName: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[11px] mb-1">Phân loại</label>
                    <select
                      value={exceptionForm.category}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, category: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                    >
                      <option value="Beverage">Nước giải khát</option>
                      <option value="Snack">Đồ ăn vặt / Snack</option>
                      <option value="Alcohol">Rượu / Bia</option>
                      <option value="CoffeeTea">Cà phê / Trà</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[11px] mb-1">Đơn vị tính</label>
                    <input
                      type="text"
                      placeholder="Lon / Chai / Hộp"
                      value={exceptionForm.unit}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, unit: e.target.value })}
                      className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[11px] mb-1">Đơn giá (VNĐ) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={exceptionForm.unitPrice}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, unitPrice: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[11px] mb-1">Số lượng khách dùng</label>
                    <input
                      type="number"
                      min="1"
                      value={exceptionForm.consumedQty}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, consumedQty: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[11px] mb-1">Ghi chú ngoại lệ</label>
                  <textarea
                    rows={2}
                    value={exceptionForm.notes}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, notes: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExceptionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] font-bold text-[#203044] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddException}
                  className="px-5 py-2 rounded-xl bg-[#203044] hover:bg-[#152230] text-[#ffd985] font-black cursor-pointer shadow-sm"
                >
                  Thêm Vào Bảng Kiểm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: GIÁM SÁT ĐIỀU CHỈNH PHÍ (MINIBAR_ADJUST) ─────────────── */}
        {isAdjustModalOpen && adjustTargetLine && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-[#dedad0] shadow-2xl max-w-md w-full p-6 text-xs text-[#203044] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#dedad0] pb-3 mb-4">
                <h3 className="font-serif font-black text-sm text-[#203044] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#b9a277]">edit_note</span>
                  Giám Sát Điều Chỉnh Khoản Phí Minibar
                </h3>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="text-[#8a8782] hover:text-[#203044] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <p className="text-[#8a8782] mb-3">
                Sản phẩm:{' '}
                <strong className="text-[#203044]">
                  {adjustTargetLine.ProductName ?? adjustTargetLine.productName}
                </strong>{' '}
                — Đơn giá: {fmtMoney(adjustTargetLine.UnitPrice ?? adjustTargetLine.unitPrice)}
              </p>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block font-bold text-[11px] mb-1">Số lượng khách dùng mới *</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustForm.newQty}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newQty: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[11px] mb-1">Lý do điều chỉnh (Bắt buộc) *</label>
                  <select
                    value={adjustForm.reasonCode}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reasonCode: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  >
                    {VARIANCE_REASONS.map((vr) => (
                      <option key={vr.code} value={vr.code}>
                        {vr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[11px] mb-1">Ghi chú kiểm toán chi tiết</label>
                  <textarea
                    rows={2}
                    placeholder="Ghi rõ lý do điều chỉnh hoặc người yêu cầu..."
                    value={adjustForm.note}
                    onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] font-bold text-[#203044] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAdjust}
                  className="px-5 py-2 rounded-xl bg-[#203044] hover:bg-[#152230] text-[#ffd985] font-black cursor-pointer shadow-sm"
                >
                  Cập Nhật Phí
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 4: LỄ TÂN OVERRIDE / MIỄN KIỂM KÊ KHI CHECKOUT GẤP ─────── */}
        {isOverrideModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-[#dedad0] shadow-2xl max-w-md w-full p-6 text-xs text-[#203044] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#dedad0] pb-3 mb-4">
                <h3 className="font-serif font-black text-sm text-rose-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600">no_meeting_room</span>
                  Lễ Tân Miễn / Bỏ Qua Kiểm Kê Minibar
                </h3>
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="text-[#8a8782] hover:text-[#203044] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <p className="text-[11px] text-[#8a8782] mb-3 leading-relaxed">
                Áp dụng khi khách cần trả phòng gấp mà nhân viên buồng phòng chưa thể tới kiểm tra phòng, hoặc ban giám đốc phê duyệt miễn kiểm kê cho khách VIP.
              </p>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block font-bold text-[11px] mb-1">Phương án xử lý</label>
                  <select
                    value={overrideForm.option}
                    onChange={(e) => setOverrideForm({ ...overrideForm, option: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  >
                    <option value="WAIVE_INSPECTION">Miễn kiểm kê minibar (Tính phí 0đ)</option>
                    <option value="POST_CHECKOUT_AUDIT">Kiểm kê sau &amp; Bổ sung hóa đơn sau nếu có phát sinh</option>
                    <option value="VIP_COURTESY">Khách VIP / Miễn trừ theo chính sách ban điều hành</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[11px] mb-1">Lý do Override (Bắt buộc) *</label>
                  <textarea
                    rows={2}
                    placeholder="Nhập lý do khách checkout gấp hoặc người có thẩm quyền phê duyệt..."
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                    className="w-full p-2 rounded-xl bg-[#fbf8f2] border border-[#dedad0] focus:border-[#203044] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#dedad0]/40 border border-[#dedad0] font-bold text-[#203044] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOverride}
                  className="px-5 py-2 rounded-xl bg-rose-800 hover:bg-rose-900 text-white font-black cursor-pointer shadow-sm"
                >
                  Xác Nhận Override
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminLayout>
  );
}
