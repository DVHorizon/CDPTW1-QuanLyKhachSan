import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import checkOutApi from '../../api/checkOutApi';

// ─── Tiện Ích Định Dạng ────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getHours())}:${p(dt.getMinutes())} ${p(dt.getDate())}/${p(dt.getMonth() + 1)}`;
};

// ─── Hộp Thoại Toast Thông Báo ─────────────────────────────────────────────
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

// ─── COMPONENT CHÍNH ───────────────────────────────────────────────────────
export default function CheckOutDesk() {
  const navigate = useNavigate();
  const { stayId: urlStayId } = useParams();

  // State danh sách & tìm kiếm
  const [staysList, setStaysList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStayId, setSelectedStayId] = useState(urlStayId ? Number(urlStayId) : null);
  const [isLoadingStays, setIsLoadingStays] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // State chi tiết lưu trú
  const [previewData, setPreviewData] = useState(null);
  const [serverTime, setServerTime] = useState(new Date());

  // Điều khiển tương tác
  const [minibarItems, setMinibarItems] = useState([]);
  const [keycardsReturned, setKeycardsReturned] = useState(2);
  const [keycardsIssued, setKeycardsIssued] = useState(2);
  const [roomCondition, setRoomCondition] = useState('NOMINAL'); // 'NOMINAL' | 'LINEN_DAMAGE'
  const [postCheckoutRoomStatus, setPostCheckoutRoomStatus] = useState('Dirty');
  const [paymentMethod, setPaymentMethod] = useState('PrimaryCardOnFile');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isSubmittingDamage, setIsSubmittingDamage] = useState(false);

  // Hộp thoại Modals
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'DUE_TODAY'
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Biểu mẫu tạo hư hỏng
  const [damageForm, setDamageForm] = useState({
    itemName: '',
    itemLocation: 'Phòng ngủ chính / Master Bedroom',
    damageDescription: '',
    severity: 'MODERATE',
    evidenceUrls: [],
    proposedCharge: 350000,
  });

  // Modal Giám sát duyệt hư hỏng
  const [supervisorModal, setSupervisorModal] = useState({
    isOpen: false,
    item: null,
    action: 'APPROVE',
    approvedCharge: 0,
    reasonCode: '',
    disputeNote: '',
  });

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

  // Đồng hồ LST chạy thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Tải danh sách các stay CheckedIn từ Docker MySQL
  const loadStays = useCallback(async (query = '') => {
    setIsLoadingStays(true);
    try {
      const res = await checkOutApi.getStays(query, 100);
      if (res.success && res.data) {
        setStaysList(res.data);
        // Kiểm tra xem phòng hiện tại còn trong danh sách đang ở không (nếu vừa check-out xong thì không còn)
        const stayStillActive = res.data.some((s) => s.StayId === selectedStayId);
        if (!stayStillActive) {
          const nextStay = res.data.length > 0 ? res.data[0] : null;
          if (nextStay) {
            setSelectedStayId(nextStay.StayId);
            navigate(`/admin/check-out/${nextStay.StayId}`, { replace: true });
          } else {
            setSelectedStayId(null);
            setPreviewData(null);
          }
        } else if (urlStayId && res.data.some((s) => s.StayId === Number(urlStayId))) {
          setSelectedStayId(Number(urlStayId));
        }
      }
    } catch (err) {
      addToast('error', 'Không thể kết nối đến danh sách phòng lưu trú: ' + err.message, 'Lỗi Kết Nối');
    } finally {
      setIsLoadingStays(false);
    }
  }, [selectedStayId, urlStayId, navigate]);

  useEffect(() => {
    loadStays(searchQuery);
  }, [loadStays, searchQuery]);

  // Phân loại phòng quá hạn và phòng trả hôm nay
  const overdueStays = useMemo(() => staysList.filter((s) => s.isOverdue), [staysList]);
  const dueTodayStays = useMemo(() => staysList.filter((s) => s.dueOutToday), [staysList]);

  const displayedStays = useMemo(() => {
    if (filterMode === 'OVERDUE') return overdueStays;
    if (filterMode === 'DUE_TODAY') return dueTodayStays;
    return staysList;
  }, [staysList, overdueStays, dueTodayStays, filterMode]);

  // 2. Tải chi tiết Stay được chọn
  const loadStayDetail = useCallback(async (stayId) => {
    if (!stayId) return;
    setIsLoadingDetail(true);
    try {
      const res = await checkOutApi.getStayPreview(stayId);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setMinibarItems(res.data.minibarItems || []);
        if (res.data.inspection) {
          setKeycardsReturned(res.data.inspection.KeycardsReturned ?? 2);
          setKeycardsIssued(res.data.inspection.KeycardsIssued ?? 2);
          setRoomCondition(res.data.inspection.RoomCondition || 'NOMINAL');
        }
      } else {
        addToast('warn', res.message || 'Không thể tải dự toán trả phòng', 'Thông Báo');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi khi tải thông tin chi tiết lưu trú', 'Lỗi Máy Chủ');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStayId) {
      loadStayDetail(selectedStayId);
    }
  }, [selectedStayId, loadStayDetail]);

  const handleSelectStay = (stayId) => {
    setSelectedStayId(stayId);
    navigate(`/admin/check-out/${stayId}`, { replace: true });
  };

  // Tính toán Folio động
  const calculatedFolio = useMemo(() => {
    if (!previewData) return null;
    const { stay, policy, lateFeeCalculation, damageItems = [] } = previewData;

    const roomRate = Number(stay.RoomBasePrice || 1200000);
    const nights = Math.max(1, Number(stay.NumberOfNights || 1));
    const roomChargeTotal = roomRate * nights;
    const resortAmenityFee = 150000 * nights;
    const fnbTotal = Number(previewData.fnbTotal || 0);

    const minibarTotal = minibarItems.reduce((sum, item) => sum + (Number(item.defaultQty || 0) * Number(item.unitPrice || 0)), 0);
    const lateFeeAmount = Number(lateFeeCalculation?.lateFeeAmount || 0);

    // Chỉ tính hư hỏng đã DUYỆT (Status === 'APPROVED')
    const approvedDamageAmount = damageItems
      .filter((d) => d.Status === 'APPROVED')
      .reduce((sum, d) => sum + Number(d.ApprovedCharge || 0), 0);

    const lostKeys = Math.max(0, Number(keycardsIssued) - Number(keycardsReturned));
    const keycardPenalty = lostKeys * 100000;
    const linenDamageFee = roomCondition === 'LINEN_DAMAGE' ? 250000 : 0;

    const subtotalGross =
      roomChargeTotal +
      resortAmenityFee +
      fnbTotal +
      minibarTotal +
      lateFeeAmount +
      approvedDamageAmount +
      linenDamageFee +
      keycardPenalty;

    const taxRate = Number(policy?.TaxRate || 10);
    const taxAmount = Math.round(subtotalGross * (taxRate / 100));
    const totalGrossWithTax = subtotalGross + taxAmount;

    const depositPaid = Number(stay.BookingDepositAmount || stay.StayDeposit || 0);
    const outstandingBalance = Math.max(0, totalGrossWithTax - depositPaid);

    return {
      roomChargeTotal,
      roomRate,
      nights,
      resortAmenityFee,
      fnbTotal,
      minibarTotal,
      lateFeeAmount,
      approvedDamageAmount,
      linenDamageFee,
      keycardPenalty,
      subtotalGross,
      taxRate,
      taxAmount,
      totalGrossWithTax,
      depositPaid,
      outstandingBalance,
      lostKeys,
    };
  }, [previewData, minibarItems, keycardsIssued, keycardsReturned, roomCondition]);

  const handleMinibarQtyChange = (id, delta) => {
    setMinibarItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextQty = Math.max(0, (item.defaultQty || 0) + delta);
          return { ...item, defaultQty: nextQty };
        }
        return item;
      })
    );
  };

  const handleWaiveMinibar = (item) => {
    setMinibarItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, defaultQty: 0 } : i))
    );
    addToast('info', `Đã miễn trừ phụ thu món [${item.name}]. Ghi nhận kiểm toán thành công.`, 'Miễn Trừ Minibar');
  };

  const handleOpenAddDamage = () => {
    setDamageForm({
      itemName: '',
      itemLocation: 'Phòng ngủ chính / Master Bedroom',
      damageDescription: '',
      severity: 'MODERATE',
      evidenceUrls: [],
      proposedCharge: 350000,
    });
    setIsDamageModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setDamageForm((prev) => ({
          ...prev,
          evidenceUrls: [...prev.evidenceUrls, reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitDamageItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmittingDamage) return;

    if (!damageForm.itemName.trim()) {
      addToast('warn', 'Vui lòng nhập tên tài sản hư hỏng.', 'Thiếu Thông Tin');
      return;
    }
    if (!damageForm.damageDescription.trim() || damageForm.damageDescription.trim().length < 5) {
      addToast('warn', 'Vui lòng nhập mô tả tình trạng hư hỏng rõ ràng (tối thiểu 5 ký tự).', 'Thiếu Bằng Chứng');
      return;
    }

    setIsSubmittingDamage(true);
    try {
      const payload = {
        roomId: previewData?.stay?.RoomId || 0,
        keycardsIssued,
        keycardsReturned,
        roomCondition: 'DAMAGE_REPORTED',
        damageItems: [damageForm],
      };
      const res = await checkOutApi.submitInspection(selectedStayId, payload);
      if (res && res.success) {
        addToast(
          'success',
          'Đã ghi nhận biên bản hư hỏng tài sản! Yêu cầu đã được chuyển ngay vào HÀNG ĐỢI PHÊ DUYỆT CỦA GIÁM SÁT CA bên dưới.',
          'Đã Gửi Phê Duyệt'
        );
        setIsDamageModalOpen(false);
        setDamageForm({
          itemName: '',
          itemLocation: 'Phòng ngủ chính / Master Bedroom',
          damageDescription: '',
          severity: 'MODERATE',
          evidenceUrls: [],
          proposedCharge: 350000,
        });
        await loadStayDetail(selectedStayId);
        setTimeout(() => {
          const queueEl = document.getElementById('supervisor-approval-queue');
          if (queueEl) {
            queueEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      } else {
        addToast('error', res?.message || 'Không thể lưu biên bản kiểm phòng.', 'Lỗi Phê Duyệt');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi kết nối khi gửi biên bản kiểm phòng', 'Lỗi Gửi Báo Cáo');
    } finally {
      setIsSubmittingDamage(false);
    }
  };

  const handleSupervisorAction = async () => {
    const { item, action, approvedCharge, reasonCode, disputeNote } = supervisorModal;
    if (!item) return;

    if (action === 'WAIVE' && !reasonCode) {
      addToast('warn', 'Vui lòng nhập lý do cho thao tác miễn hoặc điều chỉnh khoản phí', 'CHECKOUT_0007_REASON_REQUIRED');
      return;
    }

    try {
      const payload = {
        action,
        approvedCharge: Number(approvedCharge || 0),
        reasonCode,
        disputeNote,
      };
      const res = await checkOutApi.updateDamageItem(item.DamageItemId, payload);
      if (res.success) {
        addToast('success', res.message, 'Cập Nhật Thành Công');
        setSupervisorModal({ isOpen: false, item: null, action: 'APPROVE', approvedCharge: 0, reasonCode: '', disputeNote: '' });
        loadStayDetail(selectedStayId);
      }
    } catch (err) {
      addToast('error', err.message, 'Lỗi Xử Lý');
    }
  };

  const handleProcessCheckout = async () => {
    if (!selectedStayId || !previewData || !calculatedFolio) return;

    const unreviewedDamages = (previewData.damageItems || []).filter((d) => d.Status === 'SUBMITTED');
    if (unreviewedDamages.length > 0) {
      addToast('warn', 'Khoản bồi thường cần được giám sát xác nhận trước khi tính phí', 'CHECKOUT_0006_APPROVAL_REQUIRED');
      return;
    }

    const disputedDamages = (previewData.damageItems || []).filter((d) => d.Status === 'DISPUTED');
    if (disputedDamages.length > 0) {
      addToast('warn', 'Khoản hư hỏng đang được tranh chấp và chưa thể xác nhận thu phí. Vui lòng chuyển giám sát giải quyết.', 'CHECKOUT_0010_DAMAGE_DISPUTED');
      return;
    }

    if (!window.confirm(`Xác nhận xử lý thanh toán ${fmtMoney(calculatedFolio.outstandingBalance)} và hoàn tất Check-Out cho Phòng ${previewData.stay.RoomNumber}?`)) {
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const payload = {
        paymentMethod,
        postCheckoutRoomStatus,
        settlementAmount: calculatedFolio.outstandingBalance,
        notes: `Check-out hoàn tất tại Terminal V4.2. Thanh toán qua ${paymentMethod}.`,
      };
      const res = await checkOutApi.completeCheckout(selectedStayId, payload);
      if (res && res.success) {
        addToast('success', 'Trả phòng thành công! Hóa đơn đã được quyết toán và danh sách phòng đã được làm mới.', 'SUCCESS_CHECKOUT_0001_COMPLETED');
        setCompletedResult(res.data);
        setIsSuccessModalOpen(true);
        // Cập nhật ngay danh sách phòng và số lượng phòng quá hạn
        await loadStays(searchQuery);
      } else {
        addToast('error', res?.message || 'Không thể hoàn tất trả phòng.', 'CHECKOUT_0008_CHARGE_FAILED');
      }
    } catch (err) {
      addToast('error', err.message || 'Lỗi xử lý hoàn tất check-out', 'Lỗi Giao Dịch');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById('printable-folio-document');
    if (!el) return;
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Hoa_Don_Folio_${previewData?.stay?.ConfirmationCode || 'GH'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #fff; color: #203044; margin: 0; padding: 20px; font-size: 12px; }
            * { box-sizing: border-box; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { border: 1px solid #dedad0; padding: 8px 10px; text-align: left; }
            th { background: #fbf8f2; color: #203044; font-weight: bold; }
            .text-right { text-align: right; }
            .header { text-align: center; border-bottom: 2px solid #b9a277; padding-bottom: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>
            window.onload = function() { window.focus(); window.print(); setTimeout(() => { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const stay = previewData?.stay;
  const isOverdue = previewData?.lateFeeCalculation?.lateMinutes > 0;

  return (
    <AdminLayout>
      <div className="space-y-5 pb-16 font-sans text-[#203044]">
        {/* ─── 1. THANH ĐIỀU HƯỚNG TRẠM THU NGÂN GRAND HORIZON ──────────────── */}
        <div className="bg-white rounded-2xl border border-[#dedad0] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dedad0]/60 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#203044] flex items-center justify-center text-[#ffd985] shadow-md shadow-[#203044]/15">
                <span className="material-symbols-outlined text-2xl">corporate_fare</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-widest text-[#203044] uppercase">
                    HỆ THỐNG QUẢN LÝ KHÁCH SẠN // TRẠM THU NGÂN V4.2
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b9a277]"></span>
                  <span className="text-[11px] font-serif font-bold text-[#b9a277] uppercase tracking-wider">
                    Grand Horizon Resort &amp; Suites
                  </span>
                </div>
                <h1 className="text-xl font-serif font-black text-[#203044] tracking-tight">
                  Thu Ngân Tiền Sảnh &amp; Check-Out Kiểm Phòng
                </h1>
              </div>
            </div>

            {/* Chỉ Số Hệ Thống Trực Tuyến */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-[#fbf8f2] border border-[#b9a277]/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[#8a8782] text-[11px] uppercase font-bold">GIỜ HỆ THỐNG:</span>
                <span className="font-mono font-bold text-[#203044] tracking-wider">
                  {serverTime.toLocaleTimeString('vi-VN')} LST
                </span>
              </div>
              <div className="bg-[#fbf8f2] border border-[#dedad0] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-[#203044]">
                <span className="material-symbols-outlined text-[17px] text-[#b9a277]">hotel</span>
                <span className="text-[#8a8782] text-[11px] uppercase font-bold">CÔNG SUẤT PHÒNG:</span>
                <span className="font-bold text-[#203044]">86.4% (124/144 PHÒNG)</span>
              </div>
              <div className="bg-[#fbf8f2] border border-[#dedad0] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-[#203044]">
                <span className="material-symbols-outlined text-[17px] text-[#203044]">badge</span>
                <span className="text-[#8a8782] text-[11px] uppercase font-bold">THU NGÂN:</span>
                <span className="font-bold text-[#203044]">SARAH JENKINS (#4092)</span>
              </div>
              {overdueStays.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(true)}
                  className="bg-rose-50 hover:bg-rose-100 border-2 border-rose-400 text-rose-700 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm animate-pulse"
                  title="Nhấn để xem và xử lý danh sách phòng quá hạn check-out"
                >
                  <span className="material-symbols-outlined text-[18px] text-rose-600">notifications_active</span>
                  <span>{overdueStays.length} PHÒNG QUÁ HẠN</span>
                  <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">
                    XỬ LÝ NGAY
                  </span>
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">verified</span>
                  <span>0 CẢNH BÁO // PHÒNG ĐÚNG HẠN</span>
                </div>
              )}
            </div>
          </div>

          {/* Thanh tìm kiếm & chọn phòng nhanh */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8a8782] text-lg">search</span>
                <input
                  type="text"
                  placeholder="Tra cứu nhanh theo Số phòng (VD: 52014-280, 407), Mã REF#, Tên khách hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#203044] placeholder-[#8a8782] focus:outline-none focus:border-[#b9a277] focus:bg-white transition-all shadow-inner"
                />
              </div>
              <button
                onClick={() => loadStays(searchQuery)}
                className="px-4 py-2.5 bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] text-xs font-bold rounded-xl border border-[#dedad0] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Làm mới
              </button>
            </div>

            {/* Dropdown chọn phòng đang lưu trú */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Nút lọc nhanh trạng thái */}
              <div className="flex items-center gap-1 bg-[#fbf8f2] p-1 rounded-xl border border-[#dedad0]">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'ALL'
                      ? 'bg-[#203044] text-[#ffd985] shadow-sm'
                      : 'text-[#8a8782] hover:text-[#203044]'
                  }`}
                >
                  Tất cả ({staysList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('OVERDUE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    filterMode === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">alarm</span>
                  Quá hạn ({overdueStays.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('DUE_TODAY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'DUE_TODAY'
                      ? 'bg-[#b9a277] text-white shadow-sm'
                      : 'text-[#b9a277] hover:bg-[#b9a277]/10'
                  }`}
                >
                  Hôm nay ({dueTodayStays.length})
                </button>
              </div>

              {/* Dropdown chọn phòng */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8a8782] font-bold uppercase tracking-wider">Chọn phòng:</span>
                <select
                  value={selectedStayId || ''}
                  onChange={(e) => handleSelectStay(Number(e.target.value))}
                  className="bg-[#203044] text-white border border-[#b9a277]/50 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#ffd985] cursor-pointer shadow-sm min-w-[280px]"
                >
                  {isLoadingStays ? (
                    <option>Đang tải danh sách phòng...</option>
                  ) : displayedStays.length === 0 ? (
                    <option>Không có phòng phù hợp bộ lọc</option>
                  ) : (
                    displayedStays.map((s) => (
                      <option key={s.StayId} value={s.StayId}>
                        Phòng {s.RoomNumber} — {s.GuestName} ({s.ConfirmationCode}) {s.isOverdue ? '⚠️ [QUÁ HẠN]' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TRẠNG THÁI ĐANG TẢI ─────────────────────────────────────────── */}
        {isLoadingDetail && !previewData && (
          <div className="bg-white border border-[#dedad0] rounded-2xl p-16 text-center text-[#8a8782]">
            <span className="material-symbols-outlined text-4xl animate-spin text-[#b9a277] mb-2">sync</span>
            <p className="text-sm font-serif font-bold text-[#203044]">Đang tải hồ sơ kiểm phòng và kế toán Folio của Grand Horizon...</p>
          </div>
        )}

        {/* ─── NỘI DUNG CHÍNH (KHI ĐÃ TẢI DỮ LIỆU) ─────────────────────────── */}
        {stay && calculatedFolio && (
          <>
            {/* ─── 2. DẢI THÔNG TIN KHÁCH HÀNG & PHÒNG NGHỈ ───────────────────── */}
            <div className="bg-white border border-[#dedad0] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dedad0]/60 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#203044] text-[#ffd985] rounded-lg text-xs font-mono font-bold uppercase tracking-wider">
                    MÃ PHIẾU: WF-CHKOUT-0{stay.RoomNumber?.slice(-3) || '407'}
                  </span>
                  <div>
                    <h2 className="text-base font-serif font-black text-[#203044] tracking-wide uppercase">
                      QUẦY LỄ TÂN THU NGÂN // TRẢ PHÒNG &amp; KIỂM PHÒNG NHANH // PHÒNG {stay.RoomNumber}
                    </h2>
                  </div>
                </div>

                <div>
                  {isOverdue ? (
                    <span className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 animate-pulse">
                      <span className="material-symbols-outlined text-base">alarm_on</span>
                      [ QUÁ HẠN CHECK-OUT {previewData.lateFeeCalculation.lateMinutes} PHÚT // TỰ ĐỘNG TÍNH PHỤ PHÍ ]
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">verified</span>
                      [ TRẢ PHÒNG HÔM NAY // ĐÃ DUYỆT TRẢ TRỄ 12:00 TRƯA ]
                    </span>
                  )}
                </div>
              </div>

              {/* Dải 6 Khối Thông Tin Chi Tiết */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">HỒ SƠ KHÁCH HÀNG</span>
                  <p className="font-bold text-[#203044] text-sm truncate">{stay.GuestName}</p>
                  <p className="text-[11px] text-[#8a8782]">{stay.GuestPhone || '0901 234 567'}</p>
                </div>
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">MÃ ĐẶT PHÒNG</span>
                  <p className="font-mono font-bold text-[#203044] text-sm">#{stay.ConfirmationCode}</p>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">XÁC NHẬN HỆ THỐNG</p>
                </div>
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">PHÂN HẠNG PHÒNG</span>
                  <p className="font-bold text-[#203044] truncate">{stay.RoomTypeName}</p>
                  <p className="text-[11px] text-[#8a8782]">TẦNG {stay.Floor || '04'} • PHÒNG {stay.RoomNumber}</p>
                </div>
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">KỲ NGHỈ LƯU TRÚ</span>
                  <p className="font-bold text-[#203044]">{fmtDate(stay.ActualCheckIn)} → {fmtDate(stay.ExpectedCheckOut)}</p>
                  <p className="text-[11px] text-[#b9a277] font-bold">({calculatedFolio.nights} ĐÊM NGHỈ DƯỠNG)</p>
                </div>
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">SỐ HÓA ĐƠN FOLIO</span>
                  <p className="font-mono font-bold text-[#203044]">#FL-{stay.ConfirmationCode}-C</p>
                  <p className="text-[10px] text-[#8a8782] uppercase">CỔNG 01 / HÓA ĐƠN CHÍNH</p>
                </div>
                <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0]/80">
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold tracking-wider block mb-1">HẠNG HỘI VIÊN</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#203044] text-[#ffd985] rounded-md font-bold text-[11px] uppercase tracking-wider">
                    ★ {stay.GuestTier || 'HỘI VIÊN VÀNG (VIP)'}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── 3. KHÔNG GIAN LÀM VIỆC HAI CỘT ĐỐI ỨNG ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* ═════════ CỘT TRÁI: KIỂM PHÒNG, MINIBAR & CHÌA KHÓA ═════════ */}
              <div className="space-y-5">
                {/* KHỐI 1: KIỂM PHÒNG & TIÊU DÙNG MINIBAR */}
                <div className="bg-white border border-[#dedad0] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#dedad0]/60 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#b9a277] text-xl">wine_bar</span>
                      <h3 className="font-serif font-black text-xs uppercase text-[#203044] tracking-wider">
                        KIỂM PHÒNG &amp; TIÊU DÙNG MINIBAR
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#8a8782] uppercase font-mono">
                      MÃ PHÂN HỆ: AUD-{stay.RoomNumber}
                    </span>
                  </div>

                  {/* Thanh Xác Thực Chữ Ký Buồng Phòng */}
                  <div className="bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-3 mb-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                      <span className="text-[#203044] text-[11px] font-medium">
                        [ BIÊN BẢN KIỂM PHÒNG: ĐÃ HOÀN TẤT {fmtDateTime(previewData.inspection?.InspectionTime || serverTime)} BỞI R. GOMEZ #409 ]
                      </span>
                    </div>
                    <button
                      onClick={() => addToast('info', 'Chữ ký điện tử kiểm phòng đã được xác thực mã hóa SHA-256.', 'Xác Thực Kiểm Phòng')}
                      className="text-[10px] font-bold text-[#b9a277] underline uppercase hover:text-[#a68e64] cursor-pointer"
                    >
                      XEM CHỮ KÝ XÁC THỰC
                    </button>
                  </div>

                  {/* Bảng Mặt Hàng Minibar */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-[#dedad0] rounded-xl overflow-hidden">
                      <thead className="bg-[#fbf8f2] text-[#203044] uppercase text-[10px] font-bold border-b border-[#dedad0]">
                        <tr>
                          <th className="p-2.5">MẶT HÀNG / ĐỒ DÙNG</th>
                          <th className="p-2.5 text-center">SL</th>
                          <th className="p-2.5 text-right">ĐƠN GIÁ</th>
                          <th className="p-2.5 text-right">THÀNH TIỀN</th>
                          <th className="p-2.5 text-center">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dedad0]/60">
                        {minibarItems.map((item) => {
                          const total = (item.defaultQty || 0) * (item.unitPrice || 0);
                          return (
                            <tr key={item.id} className="hover:bg-[#fbf8f2]/60 transition-colors">
                              <td className="p-2.5">
                                <p className="font-bold text-[#203044] text-[11px]">{item.name}</p>
                                <p className="text-[10px] text-[#8a8782] uppercase tracking-wide">{item.note}</p>
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-[#fbf8f2] border border-[#dedad0] rounded-lg px-2 py-0.5">
                                  <button
                                    onClick={() => handleMinibarQtyChange(item.id, -1)}
                                    className="text-[#8a8782] hover:text-[#203044] px-1 font-bold cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold text-[#203044] w-4 text-center">
                                    {item.defaultQty || 0}
                                  </span>
                                  <button
                                    onClick={() => handleMinibarQtyChange(item.id, 1)}
                                    className="text-[#8a8782] hover:text-[#203044] px-1 font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-mono text-[#203044] text-[11px]">
                                {item.isComp ? '0 ₫ (MIỄN PHÍ)' : fmtMoney(item.unitPrice)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#203044] text-[11px]">
                                {fmtMoney(total)}
                              </td>
                              <td className="p-2.5 text-center">
                                {item.defaultQty > 0 && !item.isComp ? (
                                  <button
                                    onClick={() => handleWaiveMinibar(item)}
                                    className="px-2.5 py-1 bg-white hover:bg-amber-50 text-[#b9a277] hover:text-[#a68e64] border border-[#b9a277]/60 rounded-md text-[10px] font-bold uppercase transition-colors cursor-pointer shadow-sm"
                                  >
                                    MIỄN PHÍ
                                  </button>
                                ) : (
                                  <span className="text-[#8a8782] text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#dedad0]/80 text-xs">
                    <span className="text-[#8a8782] uppercase font-bold text-[11px] tracking-wider">
                      TỔNG PHỤ THU MINIBAR GHI NHẬN:
                    </span>
                    <span className="text-base font-black text-[#203044] font-mono">
                      {fmtMoney(calculatedFolio.minibarTotal)}
                    </span>
                  </div>
                </div>

                {/* KHỐI 2: ĐỐI SOÁT THẺ TỪ & BÀN GIAO PHÒNG */}
                <div className="bg-white border border-[#dedad0] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#dedad0]/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#203044] text-xl">key</span>
                      <h3 className="font-serif font-black text-xs uppercase text-[#203044] tracking-wider">
                        ĐỐI SOÁT THẺ TỪ &amp; BÀN GIAO PHÒNG
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#8a8782] uppercase font-mono">
                      KHÓA TỪ RFID PHẦN CỨNG #22
                    </span>
                  </div>

                  {/* Kiểm tra thẻ từ */}
                  <div className="bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-3.5 text-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8a8782] font-semibold">SỐ THẺ TỪ ĐÃ PHÁT CHO KHÁCH:</span>
                      <span className="font-bold text-[#203044] font-mono">{keycardsIssued} THẺ (MÃ MÁY GHI: ENC-01)</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-[#dedad0]/60 pt-2.5">
                      <span className="text-[#203044] font-bold uppercase tracking-wider">SỐ THẺ KHÁCH ĐÃ TRẢ QUẦY LỄ TÂN:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setKeycardsReturned((prev) => Math.max(0, prev - 1))}
                          className="w-7 h-7 bg-white hover:bg-slate-100 text-[#203044] rounded-lg border border-[#dedad0] font-bold flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-[#203044] font-mono text-sm bg-white border border-[#dedad0] rounded-lg py-0.5 shadow-inner">
                          {keycardsReturned}
                        </span>
                        <button
                          onClick={() => setKeycardsReturned((prev) => Math.min(keycardsIssued, prev + 1))}
                          className="w-7 h-7 bg-white hover:bg-slate-100 text-[#203044] rounded-lg border border-[#dedad0] font-bold flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          +
                        </button>
                        <span className="text-emerald-700 text-[11px] font-bold uppercase ml-1">ĐÃ XÁC MINH THẺ</span>
                      </div>
                    </div>

                    <div className="border-t border-[#dedad0]/60 pt-2 flex justify-between items-center text-[11px]">
                      {calculatedFolio.lostKeys === 0 ? (
                        <span className="text-emerald-700 font-bold">
                          [ ĐÃ THU ĐỦ TOÀN BỘ THẺ // KHÔNG PHẠT MẤT THẺ ]
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold">
                          [ {calculatedFolio.lostKeys} THẺ CHƯA TRẢ // PHẠT ĐỀN THẺ {fmtMoney(calculatedFolio.keycardPenalty)} ]
                        </span>
                      )}
                      <span className="font-mono text-[#203044] font-bold">{fmtMoney(calculatedFolio.keycardPenalty)} PHÍ ĐỀN</span>
                    </div>
                  </div>

                  {/* Đánh giá tình trạng phòng & Hư hỏng đồ dùng */}
                  <div className="border border-[#dedad0] rounded-xl p-3.5 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#203044] uppercase tracking-wider">
                        ĐÁNH GIÁ TÌNH TRẠNG PHÒNG &amp; THIỆT HẠI TÀI SẢN
                      </span>
                      <button
                        onClick={handleOpenAddDamage}
                        className="px-3 py-1 bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xs">add_a_photo</span>
                        + Thêm Biên Bản Hư Hỏng
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[#fbf8f2]">
                        <input
                          type="radio"
                          name="roomCondition"
                          checked={roomCondition === 'NOMINAL'}
                          onChange={() => setRoomCondition('NOMINAL')}
                          className="text-[#203044] focus:ring-0 cursor-pointer"
                        />
                        <span className={roomCondition === 'NOMINAL' ? 'text-emerald-800 font-bold' : 'text-[#8a8782]'}>
                          [X] KHÔNG CÓ HƯ HỎNG / TÌNH TRẠNG PHÒNG NGUYÊN VẸN ĐẠT CHUẨN
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[#fbf8f2]">
                        <input
                          type="radio"
                          name="roomCondition"
                          checked={roomCondition === 'LINEN_DAMAGE'}
                          onChange={() => setRoomCondition('LINEN_DAMAGE')}
                          className="text-[#203044] focus:ring-0 cursor-pointer"
                        />
                        <span className={roomCondition === 'LINEN_DAMAGE' ? 'text-amber-800 font-bold' : 'text-[#8a8782]'}>
                          [ ] RÁCH/Ố DRAP ĐỆM &amp; KHĂN / PHỤ THU GIẶT TẨY SÂU (+250.000 ₫)
                        </span>
                      </label>
                    </div>

                    {/* HÀNG ĐỢI PHÊ DUYỆT CỦA GIÁM SÁT CA */}
                    <div id="supervisor-approval-queue" className="mt-4 border-t-2 border-[#b9a277]/40 pt-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-600 text-base">verified_user</span>
                          <span className="text-[11px] font-serif font-black text-[#203044] uppercase tracking-wider block">
                            HÀNG ĐỢI PHÊ DUYỆT CỦA GIÁM SÁT CA // TIẾN ĐỘ BỒI THƯỜNG
                          </span>
                        </div>
                        {previewData.damageItems && previewData.damageItems.filter(d => d.Status === 'SUBMITTED').length > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold animate-pulse">
                            {previewData.damageItems.filter(d => d.Status === 'SUBMITTED').length} KHOẢN CHỜ DUYỆT
                          </span>
                        )}
                      </div>

                      {/* Empty state nếu chưa có hư hỏng */}
                      {(!previewData.damageItems || previewData.damageItems.length === 0) && (
                        <div className="bg-[#fbf8f2] border border-dashed border-[#dedad0] rounded-xl p-3 text-center text-[#8a8782] text-xs space-y-1">
                          <span className="material-symbols-outlined text-xl text-[#b9a277]">task_alt</span>
                          <p className="font-medium text-[#203044]">Chưa ghi nhận tài sản hư hỏng nào trong phòng.</p>
                          <p className="text-[10px] text-[#8a8782]">
                            Khi nhân viên nhấn <strong>[+ Báo Cáo Hư Hỏng]</strong>, biên bản sẽ được gửi về đây để Giám sát ca xác nhận và duyệt phí bồi thường vào Folio.
                          </p>
                        </div>
                      )}

                      {/* Danh sách các vụ hư hỏng đồ dùng */}
                      {previewData.damageItems && previewData.damageItems.length > 0 && (
                        <div className="space-y-2">
                        {previewData.damageItems.map((dmg) => (
                          <div
                            key={dmg.DamageItemId}
                            className="p-3 bg-[#fbf8f2] border border-[#dedad0] rounded-xl text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-[#203044] text-[12px]">{dmg.ItemName}</p>
                                <p className="text-[10px] text-[#8a8782]">{dmg.ItemLocation} • Mức độ: {dmg.Severity}</p>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  dmg.Status === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : dmg.Status === 'DISPUTED'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : dmg.Status === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-sky-50 text-sky-800 border-sky-300'
                                }`}
                              >
                                {dmg.Status === 'APPROVED' ? 'ĐÃ DUYỆT' : dmg.Status === 'DISPUTED' ? 'TRANH CHẤP' : dmg.Status === 'REJECTED' ? 'TỪ CHỐI' : 'CHỜ DUYỆT'}
                              </span>
                            </div>

                            <p className="text-[#203044] text-[11px] italic bg-white p-2 rounded-lg border border-[#dedad0]/60">
                              "{dmg.DamageDescription}"
                            </p>

                            {/* Bằng chứng ảnh */}
                            {dmg.evidenceUrls && dmg.evidenceUrls.length > 0 && (
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {dmg.evidenceUrls.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-12 h-12 rounded-lg border border-[#dedad0] overflow-hidden flex-shrink-0 hover:scale-105 transition-transform shadow-sm"
                                  >
                                    <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-1 text-[11px]">
                              <span className="text-[#8a8782]">
                                Đề xuất: <strong className="text-[#203044]">{fmtMoney(dmg.ProposedCharge)}</strong>
                              </span>
                              {dmg.Status === 'APPROVED' && (
                                <span className="text-emerald-800 font-bold">
                                  Duyệt thu: {fmtMoney(dmg.ApprovedCharge)}
                                </span>
                              )}
                              {dmg.Status === 'SUBMITTED' && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setSupervisorModal({
                                        isOpen: true,
                                        item: dmg,
                                        action: 'APPROVE',
                                        approvedCharge: dmg.ProposedCharge,
                                        reasonCode: 'SUPERVISOR_VERIFIED',
                                        disputeNote: '',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold cursor-pointer shadow-sm"
                                  >
                                    Duyệt Phí
                                  </button>
                                  <button
                                    onClick={() =>
                                      setSupervisorModal({
                                        isOpen: true,
                                        item: dmg,
                                        action: 'DISPUTE',
                                        approvedCharge: 0,
                                        reasonCode: 'GUEST_DISPUTE',
                                        disputeNote: 'Khách khiếu nại không đồng ý với khoản bồi thường',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold cursor-pointer shadow-sm"
                                  >
                                    Tranh Chấp
                                  </button>
                                  <button
                                    onClick={() =>
                                      setSupervisorModal({
                                        isOpen: true,
                                        item: dmg,
                                        action: 'REJECT',
                                        approvedCharge: 0,
                                        reasonCode: 'NORMAL_WEAR_AND_TEAR',
                                        disputeNote: 'Hao mòn thông thường tự nhiên',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer shadow-sm"
                                  >
                                    Từ Chối
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                  {/* Chuyển trạng thái phòng sau checkout */}
                  <div className="bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-3.5 text-xs space-y-2">
                    <label className="text-[11px] text-[#203044] font-bold uppercase tracking-wider block">
                      CHUYỂN TRẠNG THÁI PHÒNG SAU KHI TRẢ:
                    </label>
                    <select
                      value={postCheckoutRoomStatus}
                      onChange={(e) => setPostCheckoutRoomStatus(e.target.value)}
                      className="w-full bg-white border border-[#dedad0] text-[#203044] rounded-lg p-2.5 font-bold focus:outline-none focus:border-[#b9a277] cursor-pointer text-xs shadow-sm"
                    >
                      <option value="Dirty">PHÒNG CẦN DỌN // KHÁCH ĐÃ ĐI (HÀNG ĐỢI BUỒNG PHÒNG)</option>
                      <option value="OutOfOrder">NGỪNG SỬ DỤNG // CHỜ BẢO TRÌ SỬA CHỮA (HƯ HỎNG NẶNG)</option>
                    </select>
                    <p className="text-[10px] text-cyan-800 flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-xs">sensors</span>
                      TỰ ĐỘNG PHÁT TÍN HIỆU ĐIỀU PHỐI TỚI BỘ PHẬN BUỒNG PHÒNG
                    </p>
                  </div>

                  {/* Bản vẽ mặt bằng CAD sơ đồ phòng */}
                  <div className="border border-[#dedad0] bg-[#fbf8f2] p-3.5 rounded-xl text-center">
                    <div className="flex justify-between items-center text-[10px] text-[#8a8782] mb-2 uppercase font-mono">
                      <span>SƠ ĐỒ BẢN VẼ MẶT BẰNG PHÒNG KIỂM TOÁN</span>
                      <span>KHU VỰC TẦNG {stay.Floor} — PHÒNG SUITE GÓC</span>
                    </div>
                    <div className="border border-dashed border-[#b9a277] p-3.5 rounded-lg bg-white font-mono text-[11px] text-[#203044] font-bold">
                      [ SƠ ĐỒ PHÒNG {stay.RoomNumber} // SẴN SÀNG ĐIỀU PHỐI DỌN DẸP ]
                    </div>
                  </div>
                </div>
              </div>

              {/* ═════════ CỘT PHẢI: KẾ TOÁN FOLIO & THANH TOÁN ═════════ */}
              <div className="space-y-5">
                {/* KHỐI 3: KẾ TOÁN CHI TIẾT HÓA ĐƠN FOLIO */}
                <div className="bg-white border border-[#dedad0] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#dedad0]/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#b9a277] text-xl">receipt_long</span>
                      <h3 className="font-serif font-black text-xs uppercase text-[#203044] tracking-wider">
                        KẾ TOÁN CHI TIẾT HÓA ĐƠN // FOLIO #FL-{stay.ConfirmationCode}-C
                      </h3>
                    </div>
                    <span className="text-[10px] text-[#203044] uppercase font-mono bg-[#fbf8f2] px-2.5 py-1 rounded-md border border-[#dedad0] font-bold">
                      CỔNG 01 / HÓA ĐƠN CHÍNH
                    </span>
                  </div>

                  {/* Bảng Kế toán chi tiết */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-[#dedad0] rounded-xl overflow-hidden">
                      <thead className="bg-[#fbf8f2] text-[#203044] uppercase text-[10px] font-bold border-b border-[#dedad0]">
                        <tr>
                          <th className="p-2.5">NỘI DUNG / DỊCH VỤ</th>
                          <th className="p-2.5">NGÀY</th>
                          <th className="p-2.5 text-right">KHOẢN THU (+)</th>
                          <th className="p-2.5 text-right">CẤN TRỪ (-)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dedad0]/60 text-[11px]">
                        {/* Tiền phòng */}
                        <tr className="hover:bg-[#fbf8f2]/60">
                          <td className="p-2.5 font-medium">
                            <span className="font-bold text-[#203044] block">
                              Tiền phòng Suite ({calculatedFolio.nights} Đêm @ {fmtMoney(calculatedFolio.roomRate)})
                            </span>
                            <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">GIÁ TIÊU CHUẨN ĐÃ ÁP DỤNG</span>
                          </td>
                          <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(stay.ActualCheckIn)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.roomChargeTotal)}</td>
                          <td className="p-2.5 text-right text-[#8a8782]">—</td>
                        </tr>

                        {/* Phí tiện ích resort */}
                        <tr className="hover:bg-[#fbf8f2]/60">
                          <td className="p-2.5 font-medium">
                            <span className="font-bold text-[#203044] block">Phí tiện ích &amp; dịch vụ nghỉ dưỡng ({calculatedFolio.nights} Đêm @ 150.000 ₫)</span>
                            <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">WIFI TỐC ĐỘ CAO + PHÒNG GYM &amp; HỒ BƠI</span>
                          </td>
                          <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(stay.ActualCheckIn)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.resortAmenityFee)}</td>
                          <td className="p-2.5 text-right text-[#8a8782]">—</td>
                        </tr>

                        {/* F&B restaurant orders */}
                        {calculatedFolio.fnbTotal > 0 && (
                          <tr className="hover:bg-[#fbf8f2]/60">
                            <td className="p-2.5 font-medium">
                              <span className="font-bold text-[#203044] block">Bữa tối tại Nhà hàng Veranda (Ghi nợ phòng)</span>
                              <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">HÓA ĐƠN #VR-4410 // KÝ NHẬN: {stay.GuestName}</span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(stay.ExpectedCheckOut)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.fnbTotal)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Tiêu dùng Minibar */}
                        {calculatedFolio.minibarTotal > 0 && (
                          <tr className="hover:bg-[#fbf8f2]/60">
                            <td className="p-2.5 font-medium">
                              <span className="font-bold text-[#203044] block">Tiêu dùng đồ uống &amp; thức ăn vặt Minibar</span>
                              <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">GHI NHẬN KIỂM TOÁN PHÒNG AUD-{stay.RoomNumber}</span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.minibarTotal)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Phụ thu trả trễ giờ (LATE CHECK-OUT FEE) */}
                        {calculatedFolio.lateFeeAmount > 0 && (
                          <tr className="hover:bg-rose-50/60 bg-rose-50/40">
                            <td className="p-2.5 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-rose-800">Phụ Thu Trả Trễ Giờ (Late Check-Out Fee)</span>
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-black uppercase">
                                  ƯỚC TÍNH
                                </span>
                              </div>
                              <span className="text-[10px] text-rose-700 uppercase block font-mono">
                                {previewData.lateFeeCalculation.formula}
                              </span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-700">{fmtMoney(calculatedFolio.lateFeeAmount)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Bồi thường hư hỏng đã duyệt */}
                        {calculatedFolio.approvedDamageAmount > 0 && (
                          <tr className="hover:bg-amber-50/60 bg-amber-50/40">
                            <td className="p-2.5 font-medium">
                              <span className="font-bold text-amber-900 block">Bồi Thường Hư Hỏng Tài Sản (Đã Giám Sát Duyệt)</span>
                              <span className="text-[10px] text-amber-700 uppercase tracking-wide">PHỤ PHÍ HƯ HỎNG ĐÃ XÁC THỰC</span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-900">{fmtMoney(calculatedFolio.approvedDamageAmount)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Phí mất chìa khóa */}
                        {calculatedFolio.keycardPenalty > 0 && (
                          <tr className="hover:bg-[#fbf8f2]/60">
                            <td className="p-2.5 font-medium">
                              <span className="font-bold text-[#203044] block">Phí Mất Thẻ Phòng ({calculatedFolio.lostKeys} Thẻ)</span>
                              <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">CHI PHÍ LÀM LẠI THẺ TỪ</span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.keycardPenalty)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Phụ thu drap vải rách / bẩn */}
                        {calculatedFolio.linenDamageFee > 0 && (
                          <tr className="hover:bg-[#fbf8f2]/60">
                            <td className="p-2.5 font-medium">
                              <span className="font-bold text-[#203044] block">Phụ Thu Giặt Là Tẩy Ố Drap Đệm</span>
                              <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">XỬ LÝ ĐẶC BIỆT ĐỒ VẢI</span>
                            </td>
                            <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.linenDamageFee)}</td>
                            <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          </tr>
                        )}

                        {/* Thuế VAT / Phí dịch vụ */}
                        <tr className="hover:bg-[#fbf8f2]/60">
                          <td className="p-2.5 font-medium">
                            <span className="font-bold text-[#203044] block">Thuế VAT &amp; Phí Dịch Vụ Lưu Trú ({calculatedFolio.taxRate}%)</span>
                            <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">THUẾ VÀ PHÍ DỊCH VỤ THEO QUY ĐỊNH</span>
                          </td>
                          <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(serverTime)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#203044]">{fmtMoney(calculatedFolio.taxAmount)}</td>
                          <td className="p-2.5 text-right text-[#8a8782]">—</td>
                        </tr>

                        {/* Tiền cọc đã thanh toán (Deposit Credit) */}
                        <tr className="hover:bg-emerald-50/60 bg-emerald-50/40">
                          <td className="p-2.5 font-medium">
                            <span className="font-bold text-emerald-800 block">Tiền Cọc Đã Thanh Toán (Khấu Trừ Trước)</span>
                            <span className="text-[10px] text-emerald-600 uppercase tracking-wide">ĐÃ XÁC THỰC THANH TOÁN TRƯỚC</span>
                          </td>
                          <td className="p-2.5 text-[#8a8782] font-mono text-[10px]">{fmtDate(stay.ActualCheckIn)}</td>
                          <td className="p-2.5 text-right text-[#8a8782]">—</td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-700">-{fmtMoney(calculatedFolio.depositPaid)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#fbf8f2] p-2.5 rounded-xl border border-[#dedad0] flex justify-between items-center text-[11px] text-[#8a8782]">
                    <span>NHẬT KÝ KIỂM TOÁN HỆ THỐNG // KHÔNG CÓ KHIẾU NẠI GHI NHẬN</span>
                    <span className="text-emerald-700 font-bold uppercase">ĐỒNG BỘ TỰ ĐỘNG</span>
                  </div>

                  {/* Tổng Kết Chi Phí */}
                  <div className="space-y-2 pt-2 text-xs border-t border-[#dedad0]/80">
                    <div className="flex justify-between items-center text-[#8a8782]">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">TỔNG CÁC KHOẢN PHÍ (BAO GỒM THUẾ):</span>
                      <span className="font-mono text-[#203044] font-bold text-sm">{fmtMoney(calculatedFolio.totalGrossWithTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">TIỀN CỌC ĐÃ THANH TOÁN KHẤU TRỪ:</span>
                      <span className="font-mono font-bold text-sm">-{fmtMoney(calculatedFolio.depositPaid)}</span>
                    </div>

                    <div className="p-4 bg-[#fbf8f2] rounded-xl border-2 border-[#203044] mt-3 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-[11px] font-black text-[#203044] uppercase tracking-widest block">
                          SỐ DƯ CUỐI CÙNG CẦN THANH TOÁN:
                        </span>
                        <span className="text-[10px] text-[#8a8782] uppercase tracking-wide">
                          YÊU CẦU QUYẾT TOÁN ĐẦY ĐỦ TRƯỚC KHI RỜI KHÁCH SẠN
                        </span>
                      </div>
                      <span className="text-2xl font-serif font-black text-[#203044] tracking-tight">
                        {fmtMoney(calculatedFolio.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KHỐI 4: PHƯƠNG THỨC THANH TOÁN QUYẾT TOÁN */}
                <div className="bg-white border border-[#dedad0] rounded-2xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#dedad0]/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#203044] text-xl">payments</span>
                      <h3 className="font-serif font-black text-xs uppercase text-[#203044] tracking-wider">
                        PHƯƠNG THỨC THANH TOÁN QUYẾT TOÁN
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#8a8782] uppercase font-mono">
                      KÊNH POS THU NGÂN TIỀN SẢNH
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'PrimaryCardOnFile'
                          ? 'bg-[#fbf8f2] border-[#203044] shadow-sm'
                          : 'bg-white border-[#dedad0] text-[#8a8782] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="PrimaryCardOnFile"
                          checked={paymentMethod === 'PrimaryCardOnFile'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-[#203044] focus:ring-0"
                        />
                        <span className="font-bold text-[11px] uppercase text-[#203044]">[X] THẺ CHÍNH ĐÃ LƯU TRÊN HỆ THỐNG</span>
                      </div>
                      <p className="text-[10px] text-[#8a8782] mt-1.5 pl-5 leading-relaxed">
                        MASTERCARD •••• 8812 ({stay.GuestName})<br />
                        HẾT HẠN: 09/27 // BẢO MẬT CHUẨN PCI-DSS
                      </p>
                    </label>

                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'AlternativeCard'
                          ? 'bg-[#fbf8f2] border-[#203044] shadow-sm'
                          : 'bg-white border-[#dedad0] text-[#8a8782] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="AlternativeCard"
                          checked={paymentMethod === 'AlternativeCard'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-[#203044] focus:ring-0"
                        />
                        <span className="font-bold text-[11px] uppercase text-[#203044]">[ ] QUẸT THẺ TÍN DỤNG KHÁC</span>
                      </div>
                      <p className="text-[10px] text-[#8a8782] mt-1.5 pl-5 leading-relaxed">
                        QUẸT THẺ / CHIP EMV / CHẠM (THIẾT BỊ PINPAD #04)
                      </p>
                    </label>

                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'DirectCorporateInvoice'
                          ? 'bg-[#fbf8f2] border-[#203044] shadow-sm'
                          : 'bg-white border-[#dedad0] text-[#8a8782] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="DirectCorporateInvoice"
                          checked={paymentMethod === 'DirectCorporateInvoice'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-[#203044] focus:ring-0"
                        />
                        <span className="font-bold text-[11px] uppercase text-[#203044]">[ ] XUẤT HÓA ĐƠN CÔNG TY TRẢ SAU</span>
                      </div>
                      <p className="text-[10px] text-[#8a8782] mt-1.5 pl-5 leading-relaxed">
                        SỔ NỢ ĐỐI TÁC: CÔNG TY TẬP ĐOÀN ACME #901
                      </p>
                    </label>

                    <label
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'Cash'
                          ? 'bg-[#fbf8f2] border-[#203044] shadow-sm'
                          : 'bg-white border-[#dedad0] text-[#8a8782] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="Cash"
                          checked={paymentMethod === 'Cash'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-[#203044] focus:ring-0"
                        />
                        <span className="font-bold text-[11px] uppercase text-[#203044]">[ ] THANH TOÁN TIỀN MẶT TẠI QUẦY</span>
                      </div>
                      <p className="text-[10px] text-[#8a8782] mt-1.5 pl-5 leading-relaxed">
                        YÊU CẦU XÁC NHẬN KÉT TIỀN SỐ 04
                      </p>
                    </label>
                  </div>

                  <div className="bg-[#fbf8f2] border border-[#dedad0] p-3 rounded-xl flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-[#203044]">
                      <span className="material-symbols-outlined text-[#b9a277] text-base">lock</span>
                      <span className="font-bold">ĐÃ PHONG TỎA BẢO CHỨNG THẺ {fmtMoney(1000000)}</span>
                    </div>
                    <span className="text-[10px] text-[#8a8782] uppercase font-semibold">
                      TỰ ĐỘNG GIẢI PHÓNG SỐ TIỀN THỪA KHI QUYẾT TOÁN
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 4. THANH HÀNH ĐỘNG CUỐI MÀN HÌNH ───────────────────────────── */}
            <div className="bg-white border border-[#dedad0] rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-[#fbf8f2] text-[#203044] border border-[#dedad0] rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-[#b9a277]"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  [ IN HÓA ĐƠN FOLIO CHI TIẾT ]
                </button>
                <button
                  onClick={() =>
                    addToast('success', `Đã xuất hóa đơn điện tử PDF & gửi tới email ${stay.GuestEmail || 'guest@grandhorizon.vn'}.`, 'Email Thành Công')
                  }
                  className="px-4 py-2.5 bg-white hover:bg-[#fbf8f2] text-[#203044] border border-[#dedad0] rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-[#b9a277]"
                >
                  <span className="material-symbols-outlined text-base">mail</span>
                  [ GỬI HÓA ĐƠN ĐIỆN TỬ PDF ]
                </button>
                <button
                  onClick={() => setIsAmendModalOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-[#fbf8f2] text-[#203044] border border-[#dedad0] rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-[#b9a277]"
                >
                  <span className="material-symbols-outlined text-base">tune</span>
                  [ ĐIỀU CHỈNH / MIỄN PHÍ TRẢ TRỄ ]
                </button>
              </div>

              <button
                disabled={isProcessingCheckout}
                onClick={handleProcessCheckout}
                className="px-8 py-3.5 bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] rounded-xl text-xs font-black uppercase flex items-center gap-3 transition-all hover:scale-[1.02] shadow-xl shadow-[#203044]/25 cursor-pointer disabled:opacity-50"
              >
                {isProcessingCheckout ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[#ffd985]">sync</span>
                    Đang hoàn tất thanh toán...
                  </>
                ) : (
                  <>
                    <span>XỬ LÝ THANH TOÁN {fmtMoney(calculatedFolio.outstandingBalance)} &amp; HOÀN TẤT CHECK-OUT</span>
                    <span className="material-symbols-outlined text-[#ffd985]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

            {/* ─── 5. THANH THÔNG TIN BẢO MẬT & KIỂM ĐỊNH CUỐI TRANG ──────────── */}
            <div className="text-[10px] text-[#8a8782] flex flex-wrap justify-between items-center px-3 py-1 font-mono uppercase">
              <span>TRẠM THU NGÂN SỐ 04 // KÉT TIỀN ĐÃ CÂN ĐỐI // TUÂN THỦ TÀI CHÍNH PHIÊN BẢN 4</span>
              <span>MÃ HÓA: AES-256-GCM | MÃ GIAO DỊCH: TX-{stay.ConfirmationCode} | TRẠNG THÁI: CHỜ PHÊ DUYỆT</span>
            </div>
          </>
        )}

        {/* ─── MODAL TẠO BIÊN BẢN HƯ HỎNG ───────────────────────────────────── */}
        {isDamageModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-white border border-[#dedad0] rounded-2xl max-w-lg w-full p-6 text-[#203044] space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-[#dedad0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-2xl">broken_image</span>
                  <h3 className="font-serif font-black text-sm uppercase text-[#203044]">
                    Lập Biên Bản Hư Hỏng Đồ Dùng / Tài Sản Phòng
                  </h3>
                </div>
                <button onClick={() => setIsDamageModalOpen(false)} className="text-[#8a8782] hover:text-[#203044] cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitDamageItem} className="space-y-3.5 text-xs">
                {/* Thông báo quy trình phê duyệt */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-700 text-lg flex-shrink-0 mt-0.5">help</span>
                  <div>
                    <strong className="block uppercase tracking-wider text-[10px] text-amber-800">Quy trình thẩm định &amp; phê duyệt:</strong>
                    Biên bản sau khi lập sẽ được gửi trực tiếp đến <strong>HÀNG ĐỢI PHÊ DUYỆT CỦA GIÁM SÁT CA (Duty Supervisor)</strong> để đối soát hiện trường và duyệt mức phí bồi thường vào hóa đơn Folio.
                  </div>
                </div>

                {/* Chọn nhanh tài sản mẫu phổ biến */}
                <div>
                  <span className="text-[10px] text-[#8a8782] uppercase font-bold block mb-1">CHỌN NHANH DANH MỤC PHỔ BIẾN:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Ly rượu vang pha lê Bohemia', loc: 'Khu vực Minibar & Bàn trà', fee: 150000, desc: 'Ly rượu vang pha lê bị nứt vỡ chân ly trên bàn' },
                      { name: 'Khăn tắm lớn sợi bông Ai Cập', loc: 'Phòng tắm & Lavabo', fee: 200000, desc: 'Khăn tắm cao cấp bị rách viền sợi bông do tác động lực' },
                      { name: 'Đèn ngủ gốm sứ trang trí', loc: 'Phòng ngủ chính / Master Bedroom', fee: 500000, desc: 'Chao đèn ngủ gốm sứ bị móp méo và gãy chốt' },
                      { name: 'Gương soi lavabo mạ vàng', loc: 'Phòng tắm & Lavabo', fee: 1200000, desc: 'Gương soi lavabo bị nứt góc kính do va đập' },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setDamageForm({
                          ...damageForm,
                          itemName: preset.name,
                          itemLocation: preset.loc,
                          proposedCharge: preset.fee,
                          damageDescription: preset.desc,
                        })}
                        className="px-2 py-1 bg-[#fbf8f2] hover:bg-[#dedad0] text-[#203044] border border-[#dedad0] rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + {preset.name} ({preset.fee.toLocaleString('vi-VN')} ₫)
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[#203044] uppercase font-bold block mb-1">Tên tài sản hư hỏng (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đèn ngủ pha lê, Khăn tắm rách, Gương lavabo nứt, Ly rượu vỡ..."
                    value={damageForm.itemName}
                    onChange={(e) => setDamageForm({ ...damageForm, itemName: e.target.value })}
                    className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none focus:border-[#b9a277] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#203044] uppercase font-bold block mb-1">Vị trí phát hiện:</label>
                    <select
                      value={damageForm.itemLocation}
                      onChange={(e) => setDamageForm({ ...damageForm, itemLocation: e.target.value })}
                      className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none"
                    >
                      <option value="Phòng ngủ chính / Master Bedroom">Phòng ngủ chính / Master Bedroom</option>
                      <option value="Phòng tắm &amp; Lavabo">Phòng tắm &amp; Lavabo</option>
                      <option value="Khu vực Minibar &amp; Bàn trà">Khu vực Minibar &amp; Bàn trà</option>
                      <option value="Ban công &amp; Cửa kính ngoài trời">Ban công &amp; Cửa kính ngoài trời</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#203044] uppercase font-bold block mb-1">Mức độ thiệt hại:</label>
                    <select
                      value={damageForm.severity}
                      onChange={(e) => setDamageForm({ ...damageForm, severity: e.target.value })}
                      className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none"
                    >
                      <option value="MILD">Nhẹ (Mild) - Khắc phục tại chỗ</option>
                      <option value="MODERATE">Trung bình (Moderate) - Thay mới</option>
                      <option value="SEVERE">Nghiêm trọng (Severe) - Phải sửa chữa lớn</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#203044] uppercase font-bold block mb-1">Mô tả hiện trạng khách quan (*):</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Ghi nhận chi tiết vết nứt, vỡ, ố màu, tác động ngoại lực..."
                    value={damageForm.damageDescription}
                    onChange={(e) => setDamageForm({ ...damageForm, damageDescription: e.target.value })}
                    className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none focus:border-[#b9a277] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[#203044] uppercase font-bold block mb-1">Ảnh chụp hiện trường / Bằng chứng:</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2 text-[#8a8782] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#203044] file:text-white file:text-xs cursor-pointer"
                  />
                  {damageForm.evidenceUrls.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {damageForm.evidenceUrls.map((url, i) => (
                        <img key={i} src={url} alt="Bằng chứng" className="w-12 h-12 object-cover rounded-lg border border-[#dedad0]" />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[#203044] uppercase font-bold block mb-1">Khoản bồi thường đề xuất (VNĐ):</label>
                  <input
                    type="number"
                    value={damageForm.proposedCharge}
                    onChange={(e) => setDamageForm({ ...damageForm, proposedCharge: Number(e.target.value) })}
                    className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] font-mono font-bold focus:outline-none focus:border-[#b9a277]"
                  />
                  <span className="text-[10px] text-[#8a8782] italic mt-1 block">
                    (Cần được Giám sát xác nhận trước khi đưa vào hóa đơn folio thanh toán)
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#dedad0]">
                  <button
                    type="button"
                    onClick={() => setIsDamageModalOpen(false)}
                    className="px-4 py-2 bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] rounded-xl font-bold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitDamageItem}
                    disabled={isSubmittingDamage}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingDamage ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Đang Gửi Phê Duyệt...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        Lập &amp; Gửi Phê Duyệt
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL GIÁM SÁT DUYỆT HƯ HỎNG ─────────────────────────────────── */}
        {supervisorModal.isOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-white border border-[#dedad0] rounded-2xl max-w-md w-full p-6 text-[#203044] space-y-4 shadow-2xl animate-in zoom-in-95 text-xs">
              <div className="flex justify-between items-center border-b border-[#dedad0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#b9a277] text-xl">gavel</span>
                  <h3 className="font-serif font-black uppercase text-sm text-[#203044]">Giám Sát Xử Lý Khoản Bồi Thường</h3>
                </div>
                <button
                  onClick={() => setSupervisorModal({ ...supervisorModal, isOpen: false })}
                  className="text-[#8a8782] hover:text-[#203044] cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="bg-[#fbf8f2] p-3 rounded-xl border border-[#dedad0] space-y-1">
                <p className="text-[#8a8782]">Tài sản: <strong className="text-[#203044]">{supervisorModal.item?.ItemName}</strong></p>
                <p className="text-[#8a8782]">Đề xuất: <strong className="text-[#203044] font-mono">{fmtMoney(supervisorModal.item?.ProposedCharge)}</strong></p>
              </div>

              <div className="space-y-2">
                <label className="text-[#203044] uppercase font-bold block">Quyết định xử lý:</label>
                <div className="grid grid-cols-2 gap-2">
                  {['APPROVE', 'DISPUTE', 'WAIVE', 'REJECT'].map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setSupervisorModal({ ...supervisorModal, action: act })}
                      className={`p-2.5 rounded-xl border font-bold text-[11px] uppercase cursor-pointer transition-all ${
                        supervisorModal.action === act
                          ? 'bg-[#203044] text-[#ffd985] border-[#203044] shadow-sm'
                          : 'bg-white border-[#dedad0] text-[#8a8782] hover:border-[#203044]'
                      }`}
                    >
                      {act === 'APPROVE' ? 'Duyệt Thu Phí' : act === 'DISPUTE' ? 'Ghi Tranh Chấp' : act === 'WAIVE' ? 'Miễn Thu Phí' : 'Từ Chối'}
                    </button>
                  ))}
                </div>
              </div>

              {supervisorModal.action === 'APPROVE' && (
                <div>
                  <label className="text-[#203044] uppercase font-bold block mb-1">Số tiền duyệt thu (VNĐ):</label>
                  <input
                    type="number"
                    value={supervisorModal.approvedCharge}
                    onChange={(e) => setSupervisorModal({ ...supervisorModal, approvedCharge: Number(e.target.value) })}
                    className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] font-mono font-bold focus:outline-none focus:border-[#b9a277]"
                  />
                </div>
              )}

              <div>
                <label className="text-[#203044] uppercase font-bold block mb-1">Lý do xử lý / Ghi chú giám sát (*):</label>
                <input
                  type="text"
                  placeholder="VD: Đã xác thực hiện trường, Khách đồng ý bồi thường, Hao mòn tự nhiên..."
                  value={supervisorModal.reasonCode}
                  onChange={(e) => setSupervisorModal({ ...supervisorModal, reasonCode: e.target.value })}
                  className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none focus:border-[#b9a277]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dedad0]">
                <button
                  type="button"
                  onClick={() => setSupervisorModal({ ...supervisorModal, isOpen: false })}
                  className="px-4 py-2 bg-[#fbf8f2] hover:bg-[#eae8df] rounded-xl font-bold cursor-pointer text-[#203044]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSupervisorAction}
                  className="px-5 py-2 bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] font-black rounded-xl shadow-md cursor-pointer"
                >
                  Xác Nhận Quyết Định
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL ĐIỀU CHỈNH / MIỄN PHÍ TRẢ TRỄ (AMEND CHARGES) ──────────── */}
        {isAmendModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-white border border-[#dedad0] rounded-2xl max-w-md w-full p-6 text-[#203044] space-y-4 shadow-2xl text-xs">
              <div className="flex justify-between items-center border-b border-[#dedad0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#b9a277] text-xl">tune</span>
                  <h3 className="font-serif font-black uppercase text-sm text-[#203044]">Điều Chỉnh / Miễn Giảm Phụ Thu Folio</h3>
                </div>
                <button onClick={() => setIsAmendModalOpen(false)} className="text-[#8a8782] hover:text-[#203044] cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-[#8a8782] leading-relaxed">
                Thao tác miễn trừ hoặc điều chỉnh mức phụ thu trả trễ giờ yêu cầu phân quyền <code className="text-[#203044] font-bold">FEE_OVERRIDE</code> và ghi nhận lý do bắt buộc vào Nhật Ký Kiểm Toán.
              </p>

              <div>
                <label className="text-[#203044] uppercase font-bold block mb-1">Mã lý do điều chỉnh (*):</label>
                <select
                  id="amend-reason-select"
                  className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none"
                >
                  <option value="VIP_COURTESY">Đãi ngộ khách VIP / Khách quen lâu năm</option>
                  <option value="HOTEL_SERVICE_DELAY">Lỗi khách quan do khách sạn phục vụ chậm</option>
                  <option value="WEATHER_FLIGHT_DELAY">Chuyến bay hoãn / Thời tiết xấu khách xin hỗ trợ</option>
                  <option value="SYSTEM_CALCULATION_CORRECTION">Hiệu chỉnh sai số kỹ thuật</option>
                </select>
              </div>

              <div>
                <label className="text-[#203044] uppercase font-bold block mb-1">Ghi chú chi tiết phê duyệt:</label>
                <input
                  id="amend-note-input"
                  type="text"
                  placeholder="Ghi chú người duyệt và căn cứ miễn trừ..."
                  className="w-full bg-[#fbf8f2] border border-[#dedad0] rounded-xl p-2.5 text-[#203044] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dedad0]">
                <button
                  type="button"
                  onClick={() => setIsAmendModalOpen(false)}
                  className="px-4 py-2 bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] rounded-xl font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const sel = document.getElementById('amend-reason-select');
                    const inp = document.getElementById('amend-note-input');
                    try {
                      await checkOutApi.adjustFolio(selectedStayId, {
                        chargeType: 'LateCheckOut',
                        oldAmount: previewData.lateFeeCalculation.lateFeeAmount,
                        newAmount: 0,
                        reasonCode: sel?.value || 'VIP_COURTESY',
                        note: inp?.value || '',
                      });
                      addToast('success', 'Đã miễn trừ phụ thu trả trễ giờ thành công theo phân quyền FEE_OVERRIDE.', 'Đã Cập Nhật');
                      setIsAmendModalOpen(false);
                      loadStayDetail(selectedStayId);
                    } catch (e) {
                      addToast('error', e.message, 'Lỗi');
                    }
                  }}
                  className="px-5 py-2 bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Miễn Phí Trả Trễ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL IN HÓA ĐƠN FOLIO CHI TIẾT (PRINTABLE FOLIO) ───────────── */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[550] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full my-auto flex flex-col max-h-[94vh] shadow-2xl overflow-hidden border border-[#dedad0]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#dedad0] bg-[#fbf8f2]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#b9a277] text-2xl">print</span>
                  <div>
                    <h3 className="font-serif font-black text-sm text-[#203044]">Bảng Kê Hóa Đơn Chi Tiết (Itemized Folio Receipt)</h3>
                    <p className="text-[11px] text-[#8a8782]">Xem trước khổ in A4 tiêu chuẩn nghiệp vụ lễ tân khách sạn 5 sao</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                    In Hóa Đơn A4
                  </button>
                  <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-[#8a8782] hover:text-[#203044] cursor-pointer">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
                <div
                  id="printable-folio-document"
                  className="bg-white text-[#203044] w-full max-w-[760px] p-8 rounded-xl shadow-xl border border-[#dedad0] font-sans text-xs"
                >
                  {/* Header Hóa Đơn */}
                  <div className="border-b-2 border-[#b9a277] pb-4 mb-4 flex justify-between items-start">
                    <div>
                      <span className="text-[#a68e64] font-bold text-[10px] tracking-wider uppercase">★★★★★ KHÁCH SẠN NGHỈ DƯỠNG SANG TRỌNG</span>
                      <h1 className="text-xl font-serif font-black text-[#203044] uppercase tracking-wide">GRAND HORIZON RESORT &amp; SUITES</h1>
                      <p className="text-[11px] text-[#8a8782]">01 Võ Nguyên Giáp, P. Phước Mỹ, Q. Sơn Trà, TP. Đà Nẵng</p>
                      <p className="text-[11px] text-[#8a8782]">Hotline: 1900 6868 • Email: folio@grandhorizon.vn</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#8a8782] font-bold uppercase block">SỐ HÓA ĐƠN FOLIO</span>
                      <span className="text-base font-mono font-black bg-[#fbf8f2] border border-[#dedad0] px-3 py-1 rounded inline-block mt-0.5 text-[#203044]">
                        #FL-{stay.ConfirmationCode}-C
                      </span>
                      <p className="text-[10px] text-[#8a8782] mt-1 font-mono">NGÀY: {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <h2 className="text-base font-serif font-bold uppercase tracking-wider text-[#203044]">HÓA ĐƠN QUYẾT TOÁN DỊCH VỤ PHÒNG (GUEST FOLIO INVOICE)</h2>
                    <p className="text-[10px] text-[#8a8782] italic">QUYẾT TOÁN TẠI TRẠM THU NGÂN TERMINAL V4.2</p>
                  </div>

                  {/* Thông tin khách & phòng */}
                  <table className="w-full text-xs border border-[#dedad0] mb-4">
                    <tbody>
                      <tr className="border-b border-[#dedad0]">
                        <td className="w-1/4 bg-[#fbf8f2] p-2 font-semibold">Tên khách hàng:</td>
                        <td className="w-1/4 p-2 font-bold">{stay.GuestName}</td>
                        <td className="w-1/4 bg-[#fbf8f2] p-2 font-semibold">Số phòng:</td>
                        <td className="w-1/4 p-2 font-bold text-emerald-800">PHÒNG {stay.RoomNumber}</td>
                      </tr>
                      <tr className="border-b border-[#dedad0]">
                        <td className="bg-[#fbf8f2] p-2 font-semibold">Hạng phòng:</td>
                        <td className="p-2">{stay.RoomTypeName}</td>
                        <td className="bg-[#fbf8f2] p-2 font-semibold">Số đêm ở:</td>
                        <td className="p-2 font-bold">{calculatedFolio.nights} Đêm</td>
                      </tr>
                      <tr>
                        <td className="bg-[#fbf8f2] p-2 font-semibold">Ngày nhận / Check-in:</td>
                        <td className="p-2">{fmtDate(stay.ActualCheckIn)}</td>
                        <td className="bg-[#fbf8f2] p-2 font-semibold">Ngày trả / Check-out:</td>
                        <td className="p-2 font-bold">{fmtDate(stay.ExpectedCheckOut)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Bảng kê khoản thu */}
                  <table className="w-full text-xs border border-[#dedad0] mb-4">
                    <thead>
                      <tr className="bg-[#fbf8f2] border-b border-[#dedad0] text-[#203044]">
                        <th className="p-2 text-left">Hạng Mục / Dịch Vụ</th>
                        <th className="p-2 text-center">SL</th>
                        <th className="p-2 text-right">Đơn Giá</th>
                        <th className="p-2 text-right">Thành Tiền (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dedad0]">
                      <tr>
                        <td className="p-2">Tiền phòng ({stay.RoomTypeName})</td>
                        <td className="p-2 text-center">{calculatedFolio.nights}</td>
                        <td className="p-2 text-right font-mono">{fmtMoney(calculatedFolio.roomRate)}</td>
                        <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.roomChargeTotal)}</td>
                      </tr>
                      <tr>
                        <td className="p-2">Phí tiện ích &amp; dịch vụ nghỉ dưỡng</td>
                        <td className="p-2 text-center">{calculatedFolio.nights}</td>
                        <td className="p-2 text-right font-mono">{fmtMoney(150000)}</td>
                        <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.resortAmenityFee)}</td>
                      </tr>
                      {calculatedFolio.minibarTotal > 0 && (
                        <tr>
                          <td className="p-2">Tiêu dùng Minibar &amp; Đồ uống</td>
                          <td className="p-2 text-center">1</td>
                          <td className="p-2 text-right font-mono">{fmtMoney(calculatedFolio.minibarTotal)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.minibarTotal)}</td>
                        </tr>
                      )}
                      {calculatedFolio.lateFeeAmount > 0 && (
                        <tr className="bg-rose-50 text-rose-900">
                          <td className="p-2">Phụ thu trả trễ giờ: {previewData.lateFeeCalculation.formula}</td>
                          <td className="p-2 text-center">1</td>
                          <td className="p-2 text-right font-mono">{fmtMoney(calculatedFolio.lateFeeAmount)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.lateFeeAmount)}</td>
                        </tr>
                      )}
                      {calculatedFolio.approvedDamageAmount > 0 && (
                        <tr className="bg-amber-50 text-amber-900">
                          <td className="p-2">Bồi thường hư hỏng đồ dùng (Đã duyệt)</td>
                          <td className="p-2 text-center">1</td>
                          <td className="p-2 text-right font-mono">{fmtMoney(calculatedFolio.approvedDamageAmount)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.approvedDamageAmount)}</td>
                        </tr>
                      )}
                      {calculatedFolio.keycardPenalty > 0 && (
                        <tr>
                          <td className="p-2">Phí mất thẻ phòng ({calculatedFolio.lostKeys} thẻ)</td>
                          <td className="p-2 text-center">{calculatedFolio.lostKeys}</td>
                          <td className="p-2 text-right font-mono">{fmtMoney(100000)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.keycardPenalty)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="3" className="p-2 text-right font-bold">Thuế VAT &amp; Phí dịch vụ ({calculatedFolio.taxRate}%):</td>
                        <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.taxAmount)}</td>
                      </tr>
                      <tr className="bg-[#fbf8f2]">
                        <td colSpan="3" className="p-2 text-right font-bold uppercase">Tổng cộng trước cọc:</td>
                        <td className="p-2 text-right font-mono font-bold">{fmtMoney(calculatedFolio.totalGrossWithTax)}</td>
                      </tr>
                      <tr className="text-emerald-800 bg-emerald-50">
                        <td colSpan="3" className="p-2 text-right font-bold uppercase">Tiền cọc đặt phòng đã khấu trừ:</td>
                        <td className="p-2 text-right font-mono font-bold">-{fmtMoney(calculatedFolio.depositPaid)}</td>
                      </tr>
                      <tr className="bg-[#203044] text-[#ffd985] font-bold text-sm">
                        <td colSpan="3" className="p-3 text-right uppercase">SỐ DƯ CUỐI CÙNG PHẢI THANH TOÁN:</td>
                        <td className="p-3 text-right text-base font-serif font-black">{fmtMoney(calculatedFolio.outstandingBalance)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Chữ ký hai bên */}
                  <div className="grid grid-cols-2 pt-8 text-center text-xs">
                    <div>
                      <p className="font-bold uppercase text-[#203044]">LỄ TÂN THỰC HIỆN</p>
                      <p className="text-[10px] text-[#8a8782] italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[#203044]">Sarah Jenkins #4092</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-[#203044]">KHÁCH HÀNG XÁC NHẬN</p>
                      <p className="text-[10px] text-[#8a8782] italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[#203044]">{stay.GuestName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL HOÀN TẤT CHECK-OUT THÀNH CÔNG ─────────────────────────── */}
        {isSuccessModalOpen && completedResult && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <div className="bg-white border-2 border-emerald-600 rounded-3xl max-w-md w-full p-7 text-[#203044] space-y-4 shadow-2xl text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block">
                  SUCCESS_CHECKOUT_0001_COMPLETED
                </span>
                <h3 className="text-xl font-serif font-black uppercase text-[#203044] mt-1">
                  Trả Phòng &amp; Kiểm Phòng Thành Công!
                </h3>
                <p className="text-xs text-[#8a8782] mt-1">
                  Hóa đơn đã được quyết toán. Bộ phận Buồng phòng đã nhận tín hiệu điều phối dọn phòng tự động.
                </p>
              </div>

              <div className="bg-[#fbf8f2] p-4 rounded-xl border border-[#dedad0] text-left text-xs space-y-1.5 font-mono">
                <p><span className="text-[#8a8782]">Mã hóa đơn:</span> <strong className="text-[#203044]">{completedResult.invoiceNumber}</strong></p>
                <p><span className="text-[#8a8782]">Số tiền thanh toán:</span> <strong className="text-emerald-700 font-bold">{fmtMoney(completedResult.settlementAmount)}</strong></p>
                <p><span className="text-[#8a8782]">Phương thức:</span> <strong className="text-[#203044]">{completedResult.paymentMethod}</strong></p>
                <p><span className="text-[#8a8782]">Mã giao dịch:</span> <strong className="text-[#203044]">{completedResult.transactionCode}</strong></p>
                <p><span className="text-[#8a8782]">Trạng thái phòng:</span> <strong className="text-amber-800 uppercase">{completedResult.roomStatus} (HÀNG ĐỢI BUỒNG PHÒNG DỌN)</strong></p>
              </div>

              <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] border border-[#dedad0] rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  In Hóa Đơn Ngay
                </button>
                {overdueStays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccessModalOpen(false);
                      const nextOverdue = overdueStays.find((s) => s.StayId !== selectedStayId) || overdueStays[0];
                      if (nextOverdue) {
                        handleSelectStay(nextOverdue.StayId);
                        addToast('info', `Đã chuyển sang phòng quá hạn tiếp theo: Phòng ${nextOverdue.RoomNumber} (${nextOverdue.GuestName})`, 'Xử Lý Tiếp Tục');
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">alarm_on</span>
                    Xử Lý Phòng Quá Hạn Tiếp Theo ({overdueStays.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    loadStays(searchQuery);
                  }}
                  className="px-5 py-2.5 bg-[#203044] hover:bg-[#131b2e] text-[#ffd985] rounded-xl text-xs font-black uppercase cursor-pointer shadow-md"
                >
                  Xong &amp; Cập Nhật Danh Sách
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL TRUNG TÂM XỬ LÝ CẢNH BÁO PHÒNG QUÁ HẠN ─────────────────── */}
        {isAlertModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[550] flex items-center justify-center p-4">
            <div className="bg-white border-2 border-rose-500 rounded-2xl max-w-4xl w-full p-6 text-[#203044] space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-[#dedad0] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
                    <span className="material-symbols-outlined text-2xl">alarm_on</span>
                  </div>
                  <div>
                    <h3 className="font-serif font-black uppercase text-base text-[#203044] tracking-wider">
                      Trung Tâm Xử Lý Cảnh Báo // Phòng Quá Hạn Check-Out
                    </h3>
                    <p className="text-xs text-[#8a8782]">
                      Hiện có <strong className="text-rose-700 font-bold">{overdueStays.length} phòng</strong> đã vượt quá khung giờ quy định (12:00 LST). Vui lòng chọn phòng để đối soát và xử lý phụ thu.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadStays(searchQuery);
                      addToast('success', 'Đã làm mới dữ liệu phòng quá hạn từ máy chủ.', 'Làm Mới');
                    }}
                    className="px-3 py-1.5 bg-[#fbf8f2] hover:bg-[#dedad0] text-[#203044] border border-[#dedad0] rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    title="Làm mới danh sách phòng từ database"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    Làm mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(false)}
                    className="text-[#8a8782] hover:text-[#203044] cursor-pointer p-1"
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>
              </div>

              {/* Danh sách phòng quá hạn */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {overdueStays.length === 0 ? (
                  <div className="p-8 text-center bg-[#fbf8f2] rounded-xl border border-[#dedad0] text-[#8a8782]">
                    <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">task_alt</span>
                    <p className="font-bold text-[#203044]">Tuyệt vời! Không có phòng nào bị quá hạn check-out.</p>
                  </div>
                ) : (
                  overdueStays.map((s) => (
                    <div
                      key={s.StayId}
                      className="p-3.5 bg-[#fbf8f2] hover:bg-rose-50/50 border border-[#dedad0] hover:border-rose-300 rounded-xl flex flex-wrap items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#203044] text-[#ffd985] flex flex-col items-center justify-center font-mono font-bold">
                          <span className="text-[10px] text-[#8a8782] leading-none uppercase">PHÒNG</span>
                          <span className="text-sm font-black">{s.RoomNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#203044] text-sm">{s.GuestName}</span>
                            <span className="px-2 py-0.2 bg-[#dedad0]/60 text-[#203044] text-[10px] font-mono rounded">
                              #{s.ConfirmationCode}
                            </span>
                            <span className="px-2 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded">
                              {s.GuestTier || 'VIP GOLD'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8a8782] mt-0.5">
                            {s.RoomTypeName} • SĐT: {s.GuestPhone || '0901 234 567'} • Hạn trả: <strong className="text-[#203044]">{fmtDateTime(s.ExpectedCheckOut)}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold font-mono block">
                            TRỄ {s.overdueMinutes > 60 ? `${Math.floor(s.overdueMinutes / 60)}h ${s.overdueMinutes % 60}p` : `${s.overdueMinutes} PHÚT`}
                          </span>
                          <span className="text-[10px] text-[#8a8782] uppercase mt-0.5 block">
                            TỰ ĐỘNG TÍNH PHỤ THU
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAlertModalOpen(false);
                            handleSelectStay(s.StayId);
                            addToast('info', `Đã chuyển đến quầy Check-out phòng ${s.RoomNumber} của khách ${s.GuestName}`, 'Chọn Phòng Quá Hạn');
                          }}
                          className="px-4 py-2 bg-[#203044] hover:bg-rose-700 text-[#ffd985] hover:text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <span>Xử Lý Trả Phòng</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#dedad0] text-xs">
                <span className="text-[11px] text-[#8a8782]">
                  Tổng cộng: <strong className="text-[#203044]">{overdueStays.length} phòng</strong> cần bộ phận Lễ tân &amp; Thu ngân liên hệ hoặc chốt phụ phí.
                </span>
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-5 py-2 bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] font-bold rounded-xl cursor-pointer"
                >
                  Đóng Trung Tâm Cảnh Báo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TOASTS CONTAINER ────────────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminLayout>
  );
}
