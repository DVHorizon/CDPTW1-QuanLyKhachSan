import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import bookingApi from '../../api/bookingApi';
import invoiceApi from '../../api/invoiceApi';
import MultiTenderSettlementModal from '../../components/admin/finance/MultiTenderSettlementModal';
import { cleanMessage, extractErrorCode, logSystemEvent } from '../../utils/toastSanitizer';

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

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

export default function BookingChargesFolio() {
  const { bookingId: paramBookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeBookingId = paramBookingId || searchParams.get('bookingId') || '';

  const [inputBookingId, setInputBookingId] = useState(activeBookingId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loadingBookingsList, setLoadingBookingsList] = useState(false);

  // State Hóa đơn Master & Xuất PDF
  const [invoice, setInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vatRate, setVatRate] = useState(10);
  const [manualAdjustments, setManualAdjustments] = useState([]);
  const [newAdjDesc, setNewAdjDesc] = useState('');
  const [newAdjAmount, setNewAdjAmount] = useState('');
  const [newAdjType, setNewAdjType] = useState('Surcharge');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createInvoiceError, setCreateInvoiceError] = useState(null);

  // Trạng thái tải file PDF
  const [pdfLoading, setPdfLoading] = useState(false);

  // State Quyết toán tại quầy
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleMethod, setSettleMethod] = useState('Cash');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState(null);

  // Thông báo người dùng (Chỉ hiển thị nội dung, mã lưu/ghi log ra console)
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showToast = (rawMsg, codeOrType = null, typeOrCode = 'success') => {
    let code = null;
    let type = 'success';
    if (['success', 'error', 'info', 'warn', 'warning'].includes(codeOrType)) {
      type = codeOrType;
      code = typeOrCode !== 'success' ? typeOrCode : null;
    } else {
      code = codeOrType;
      type = typeOrCode || 'success';
    }
    const message = cleanMessage(rawMsg);
    const extractedCode = extractErrorCode(rawMsg, code);

    setToast({ message, type });

    logSystemEvent({
      code: extractedCode,
      message,
      rawMessage: rawMsg,
      type,
      context: { page: 'BookingChargesFolio', bookingId: activeBookingId, invoiceId: invoice?.InvoiceId }
    });

    setTimeout(() => setToast(null), 4000);
  };

  const fetchInvoice = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setInvoice(null);
      return;
    }
    setLoadingInvoice(true);
    try {
      const inv = await invoiceApi.getInvoiceByBookingId(idToFetch);
      setInvoice(inv);
      if (inv) {
        console.log('[Hóa Đơn] Đã tải thông tin hóa đơn:', {
          invoiceId: inv.InvoiceId,
          invoiceNumber: inv.InvoiceNumber,
          status: inv.Status,
        });
      }
    } catch (err) {
      console.warn('[Hóa Đơn] Lỗi khi tra cứu hóa đơn:', err);
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  const fetchCharges = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getBookingCharges(idToFetch);
      setData(res);
      console.log('[Bảng Kê Chi Phí] Tổng hợp chi phí thành công cho Booking:', idToFetch, {
        grandTotal: res.summary?.grandTotal,
        totalPaid: res.summary?.totalPaid,
        remainingBalance: res.summary?.remainingBalance,
      });
      fetchInvoice(idToFetch);
    } catch (err) {
      const code = err?.errorCode || err?.code || err?.status || 'ERROR_CHARGES_FAILED';
      console.error(`[Mã lỗi tổng hợp chi phí]: ${code}`, err);
      setError(cleanMessage(err?.message) || 'Không thể tổng hợp chi phí cho mã đặt phòng này.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchInvoice]);

  useEffect(() => {
    if (activeBookingId) {
      setInputBookingId(activeBookingId);
      fetchCharges(activeBookingId);
    } else {
      setData(null);
      setInvoice(null);
      setLoadingBookingsList(true);
      bookingApi
        .getRecentBookings(25)
        .then((list) => setRecentBookings(Array.isArray(list) ? list : []))
        .catch(() => setRecentBookings([]))
        .finally(() => setLoadingBookingsList(false));
    }
  }, [activeBookingId, fetchCharges]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanId = String(inputBookingId).trim().replace(/^GH-|^#BK-|^BK-|^#/i, '');
    if (!cleanId) return;
    navigate(`/admin/charges/${cleanId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Mở xem trực tiếp PDF trên tab mới với Bearer Token an toàn qua Blob
  const handleViewPdf = async () => {
    if (!invoice?.InvoiceId) return;
    setPdfLoading(true);
    try {
      const blob = await invoiceApi.fetchInvoicePdfBlob(invoice.InvoiceId, 'inline');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      console.log('[Mã phản hồi xuất PDF]: SUCCESS_0001_VIEW_PDF', { invoiceId: invoice.InvoiceId });
      showToast('Đã mở hóa đơn PDF trong tab mới.', 'SUCCESS_0001_VIEW_PDF', 'success');
    } catch (err) {
      const code = err?.code || 'ERROR_0018_GENERATION_FAILED';
      console.error(`[Mã lỗi mở PDF]: ${code}`, err);
      showToast(cleanMessage(err?.message) || 'Không thể mở hóa đơn PDF.', code, 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  // Tải file PDF về máy với Bearer Token an toàn qua Blob
  const handleDownloadPdf = async () => {
    if (!invoice?.InvoiceId) return;
    setPdfLoading(true);
    try {
      const blob = await invoiceApi.fetchInvoicePdfBlob(invoice.InvoiceId, 'download');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `INV-${invoice.InvoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      console.log('[Mã phản hồi tải PDF]: SUCCESS_0001_DOWNLOAD_PDF', { invoiceId: invoice.InvoiceId });
      showToast('Đã tải thành công file hóa đơn PDF.', 'SUCCESS_0001_DOWNLOAD_PDF', 'success');
    } catch (err) {
      const code = err?.code || 'ERROR_0019_STORAGE_FAILED';
      console.error(`[Mã lỗi tải PDF]: ${code}`, err);
      showToast(cleanMessage(err?.message) || 'Không thể tải file hóa đơn PDF.', code, 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  // Thêm khoản phụ thu / giảm giá thủ công vào danh sách trước khi chốt hoá đơn
  const handleAddAdjustment = () => {
    if (!newAdjDesc.trim()) return;
    const amt = Number(newAdjAmount);
    if (isNaN(amt) || amt === 0) return;

    setManualAdjustments((prev) => [
      ...prev,
      {
        description: newAdjDesc.trim(),
        amount: newAdjType === 'Other' && amt > 0 ? -amt : amt,
        itemType: newAdjType,
      },
    ]);
    setNewAdjDesc('');
    setNewAdjAmount('');
  };

  const handleRemoveAdjustment = (idx) => {
    setManualAdjustments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Gửi yêu cầu lập Master Invoice
  const handleConfirmCreateInvoice = async () => {
    setCreatingInvoice(true);
    setCreateInvoiceError(null);
    try {
      const res = await invoiceApi.createMasterInvoice({
        bookingId: activeBookingId,
        vatRate: Number(vatRate) || 10,
        bypassCheckOutRule: true,
        manualAdjustments,
      });

      const successCode = res?.code || 'SUCCESS_0001_CREATED';
      console.log(`[Mã phản hồi tạo hóa đơn]: ${successCode}`, {
        invoiceId: res?.data?.invoiceId,
        invoiceNumber: res?.data?.invoiceNumber,
        totalAmount: res?.data?.totalAmount,
      });

      showToast('Tạo hóa đơn tổng hợp thành công!', successCode, 'success');
      setShowCreateModal(false);
      setManualAdjustments([]);
      fetchCharges(activeBookingId);
    } catch (err) {
      const errCode = err?.code || 'ERROR_CREATE_INVOICE_FAILED';
      console.error(`[Mã lỗi tạo hóa đơn]: ${errCode}`, err);

      if (err?.code === 'ERROR_0017_ALREADY_EXISTS') {
        showToast('Booking này đã có hóa đơn trên hệ thống.', errCode, 'info');
        setShowCreateModal(false);
        fetchCharges(activeBookingId);
      } else {
        setCreateInvoiceError(cleanMessage(err?.message) || 'Không thể tạo hóa đơn tổng hợp.');
      }
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Xử lý quyết toán thành công từ MultiTenderSettlementModal
  const handleSettlementSuccess = (settleResult) => {
    showToast('Quyết toán hoá đơn thành công!', 'SUCCESS_INVOICE_SETTLED', 'success');
    setShowSettleModal(false);
    fetchCharges(activeBookingId);
    fetchInvoice(activeBookingId);
  };

  const stays = data?.stays || [];
  const minibar = data?.minibar || [];
  const services = data?.services || [];
  const fnb = data?.foodAndBeverage || [];
  const damages = data?.damages || [];
  const extensions = data?.extensions || [];
  const summary = data?.summary || {
    roomSubtotal: 0,
    extensionSubtotal: 0,
    minibarSubtotal: 0,
    serviceSubtotal: 0,
    foodSubtotal: 0,
    damageSubtotal: 0,
    surcharge: 0,
    discount: 0,
    grandTotal: 0,
    totalPaid: 0,
    remainingBalance: 0,
  };

  // Tính nháp Subtotal & Total cho Modal
  const modalAdjSum = manualAdjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const modalSubtotal = Math.max(0, (Number(summary.grandTotal) || 0) + modalAdjSum);
  const modalVatAmount = Math.round(modalSubtotal * (Number(vatRate) / 100));
  const modalGrandTotal = modalSubtotal + modalVatAmount;

  const firstStayId = stays[0]?.stayId;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Toast thông báo người dùng (Chỉ nội dung thông báo, mã xem trong Console) */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-4 ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header Trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-2xl">receipt_long</span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Bảng Kê Chi Phí & Hóa Đơn Tổng Hợp
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Master Folio
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tổng hợp toàn bộ chi phí lưu trú (phòng, minibar, dịch vụ, ẩm thực F&B), lập hóa đơn tổng hợp và xuất hóa đơn VAT
            </p>
          </div>

          {/* Ô Tra cứu Booking ID nhanh */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Nhập mã đặt phòng (VD: 1, 102)..."
                value={inputBookingId}
                onChange={(e) => setInputBookingId(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 font-mono transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">manage_search</span>
              <span>Xem Bảng Kê</span>
            </button>
          </form>
        </div>

        {/* Chưa chọn Booking -> Hiển thị danh sách đặt phòng để chọn nhanh */}
        {!activeBookingId ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">list_alt</span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Danh Sách Đặt Phòng Gần Đây — Chọn Để Xem Bảng Kê Chi Phí (Master Folio)
                  </h2>
                </div>
                <Link
                  to="/admin/dat-phong"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Quản Lý Đặt Phòng</span>
                </Link>
              </div>

              {loadingBookingsList ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500">Đang tải danh sách đặt phòng...</p>
                </div>
              ) : recentBookings.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    Vui lòng nhập mã đặt phòng (Booking ID hoặc Mã xác nhận) vào ô tìm kiếm phía trên để xem bảng kê chi phí tổng hợp.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">Booking ID</th>
                        <th className="px-4 py-3">Mã Xác Nhận</th>
                        <th className="px-4 py-3">Khách Hàng</th>
                        <th className="px-4 py-3">Hạng Phòng</th>
                        <th className="px-4 py-3">Lưu Trú</th>
                        <th className="px-4 py-3 text-center">Trạng Thái</th>
                        <th className="px-4 py-3 text-right">Tổng Tạm Tính</th>
                        <th className="px-5 py-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentBookings.map((b) => {
                        const bId = b.bookingId || b.BookingId;
                        const code = b.confirmationCode || b.ConfirmationCode || `#${bId}`;
                        const guest = b.guestName || b.primaryGuest?.FullName || b.user?.FullName || b.User?.FullName || `Khách #${bId}`;
                        const rType = b.roomTypeName || b.roomType?.TypeName || b.RoomType?.TypeName || 'Tiêu chuẩn';
                        const status = b.status || b.Status || 'Pending';
                        const totalAmt = b.totalAmount ?? b.TotalAmount ?? b.payment?.totalAmount ?? 0;
                        return (
                          <tr key={bId} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-slate-800">#{bId}</td>
                            <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{code}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{guest}</td>
                            <td className="px-4 py-3 text-slate-600">{rType}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {fmtDate(b.checkInDate || b.CheckInDate)} → {fmtDate(b.checkOutDate || b.CheckOutDate)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {fmtMoney(totalAmt)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/charges/${bId}`)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">receipt_long</span>
                                <span>Xem Bảng Kê</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-medium text-slate-600">Đang tự động gom chi phí từ các phân hệ lưu trú...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-800">Không thể tải dữ liệu chi phí</h3>
              <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => fetchCharges(activeBookingId)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* Thanh công cụ thao tác */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-lg print:hidden">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 font-mono text-xs font-bold">
                  ĐẶT PHÒNG #{data.bookingId}
                </span>
                <span className="text-xs text-slate-300">
                  Khách đại diện: <strong className="text-white">{data.guestName || '—'}</strong> • Phòng: <strong className="text-blue-300">{data.roomNumber || 'Chưa gán'}</strong>
                </span>
                {data.estimated && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                    Tạm tính (Chưa Check-in)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchCharges(activeBookingId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Làm mới</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>In Bảng Kê</span>
                </button>
                <Link
                  to="/admin/charges"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700 ml-1"
                >
                  Danh sách Folio
                </Link>
                <Link
                  to="/admin/dat-phong"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                >
                  Quản lý Đặt phòng
                </Link>
              </div>
            </div>

            {/* Banner Cảnh báo Dịch vụ còn dở dang */}
            {data.hasPendingServices && (
              <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900 shadow-sm animate-in fade-in">
                <span className="material-symbols-outlined text-amber-600 text-2xl flex-shrink-0">
                  warning
                </span>
                <div>
                  <p className="font-bold">Cảnh báo dịch vụ lưu trú chưa hoàn tất!</p>
                  <p className="text-amber-800">
                    Booking này còn ít nhất một dịch vụ phòng (giặt ủi, spa hoặc ẩm thực) đang ở trạng thái tiếp nhận hoặc đang xử lý.
                    Vui lòng xác nhận hoàn tất trước khi chốt hóa đơn.
                  </p>
                </div>
              </div>
            )}

            {/* KHỐI MASTER INVOICE & XUẤT HOÁ ĐƠN PDF */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              {invoice ? (
                /* Trường hợp 1: Đã có Master Invoice */
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
                        <h2 className="text-base font-bold text-slate-900">
                          Hóa Đơn Tổng Hợp Chính Thức
                        </h2>
                        <span
                          className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                            invoice.Status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : invoice.Status === 'PartiallyPaid'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {invoice.Status === 'Paid'
                            ? 'Đã Thanh Toán Đủ'
                            : invoice.Status === 'PartiallyPaid'
                            ? 'Thanh Toán Một Phần'
                            : 'Chờ Thanh Toán'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Số Hóa Đơn: <strong className="font-mono text-slate-800">{invoice.InvoiceNumber}</strong> • Ngày lập:{' '}
                        {fmtDateTime(invoice.InvoiceDate || invoice.CreatedAt)}
                      </p>
                    </div>

                    {/* NÚT THAO TÁC XUẤT PDF & QUYẾT TOÁN */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleViewPdf}
                        disabled={pdfLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        {pdfLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        )}
                        <span>In / Xem Hóa Đơn VAT</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Tải File PDF</span>
                      </button>

                      {invoice.Status !== 'Paid' ? (
                        <button
                          type="button"
                          onClick={() => setShowSettleModal(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">payments</span>
                          <span>Quyết Toán Tại Quầy</span>
                        </button>
                      ) : (
                        <span className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
                          <span className="material-symbols-outlined text-base">verified</span>
                          <span>Đã Quyết Toán Đủ</span>
                        </span>
                      )}

                      <Link
                        to="/admin/tai-chinh"
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
                        title="Mở Sổ Cái Hoá Đơn"
                      >
                        <span className="material-symbols-outlined text-base">account_balance</span>
                        <span>Sổ Cái Hoá Đơn</span>
                      </Link>
                    </div>
                  </div>

                  {/* Chi tiết tài chính Hóa Đơn */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Tạm tính (Subtotal)</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{fmtMoney(invoice.Subtotal)}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Thuế VAT ({invoice.VATRate || 10}%)</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{fmtMoney(invoice.VATAmount)}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Tổng Hóa Đơn (Total)</span>
                      <span className="text-base font-extrabold font-mono text-blue-700">{fmtMoney(invoice.TotalAmount)}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Đã Thu / Đặt Cọc</span>
                      <span className="text-sm font-bold font-mono text-emerald-600">{fmtMoney(summary.totalPaid)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Trường hợp 2: Chưa lập Master Invoice */
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                      <span className="material-symbols-outlined text-2xl">receipt</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Booking này chưa lập hóa đơn tổng hợp chính thức</h3>
                      <p className="text-xs text-slate-500">
                        Bảng kê dưới đây đang là số liệu tạm tính. Bấm nút bên phải để chốt hóa đơn điện tử VAT và xuất PDF.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">post_add</span>
                    <span>Lập Hóa Đơn Tổng Hợp</span>
                  </button>
                </div>
              )}
            </div>

            {/* BẢNG 1: TIỀN PHÒNG & THỜI GIAN LƯU TRÚ THEO TỪNG STAY */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">hotel</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Chi Phí Tiền Phòng Lưu Trú ({stays.length} lượt lưu trú / phòng)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-slate-900">
                  {fmtMoney(summary.roomSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Phòng</th>
                      <th className="py-3 px-4">Hạng phòng</th>
                      <th className="py-3 px-4">Thời gian nhận phòng</th>
                      <th className="py-3 px-4">Thời gian trả phòng</th>
                      <th className="py-3 px-4 text-center">Số đêm</th>
                      <th className="py-3 px-4 text-right">Đơn giá / đêm</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stays.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 px-4 text-center text-slate-400 italic">
                          Chưa có lượt lưu trú vật lý nào (Booking đang ở trạng thái chuẩn bị)
                        </td>
                      </tr>
                    ) : (
                      stays.map((st, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-blue-600">{st.roomNumber}</td>
                          <td className="py-3 px-4 text-slate-700 font-medium">{st.roomTypeName || st.roomType}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{fmtDateTime(st.checkIn)}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{fmtDateTime(st.checkOut)}</td>
                          <td className="py-3 px-4 font-mono text-center font-bold">{st.nights} đêm</td>
                          <td className="py-3 px-4 font-mono text-right text-slate-700">{fmtMoney(st.pricePerNight ?? st.ratePerNight)}</td>
                          <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(st.roomTotal ?? st.totalRoomCost)}</td>
                        </tr>
                      ))
                    )}
                    {extensions.length > 0 &&
                      extensions.map((ext, i) => (
                        <tr key={`ext-${ext.extensionId || i}`} className="bg-blue-50/40 hover:bg-blue-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-blue-700">{ext.roomNumber}</td>
                          <td className="py-3 px-4 text-blue-900 font-medium">Gia hạn lưu trú</td>
                          <td className="py-3 px-4 font-mono text-xs text-blue-700" colSpan={2}>
                            Ghi nhận: {fmtDateTime(ext.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-mono text-center font-bold text-blue-800">+{ext.nights} đêm</td>
                          <td className="py-3 px-4 font-mono text-right text-slate-600">{fmtMoney(ext.total / (ext.nights || 1))}</td>
                          <td className="py-3 px-4 font-mono text-right font-bold text-blue-800">+{fmtMoney(ext.total)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 2: TIÊU DÙNG MINIBAR PHÒNG */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">local_bar</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Tiêu Dùng Minibar Trong Phòng ({minibar.length} món)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-amber-900">
                  {fmtMoney(summary.minibarSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Tên đồ dùng / Thức uống</th>
                      <th className="py-3 px-4 text-center">Số lượng</th>
                      <th className="py-3 px-4 text-right">Đơn giá</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 font-mono text-center">Phòng sử dụng</th>
                      <th className="py-3 px-4 text-right">Thời điểm ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {minibar.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 px-4 text-center text-slate-400 italic">
                          Không phát sinh tiêu dùng minibar
                        </td>
                      </tr>
                    ) : (
                      minibar.map((mb, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{mb.item}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{mb.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(mb.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(mb.total)}</td>
                          <td className="py-2.5 px-4 font-mono text-center text-blue-600 font-semibold">{mb.roomNumber || '—'}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(mb.consumedAt || mb.usedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 3: DỊCH VỤ KHÁCH SẠN */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-lg">dry_cleaning</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Dịch Vụ Khách Sạn & Spa ({services.length} lượt sử dụng)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-purple-900">
                  {fmtMoney(summary.serviceSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Tên dịch vụ</th>
                      <th className="py-3 px-4">Phân loại</th>
                      <th className="py-3 px-4 text-center">Số lượng</th>
                      <th className="py-3 px-4 text-right">Đơn giá</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thời gian đặt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 px-4 text-center text-slate-400 italic">
                          Không phát sinh dịch vụ bổ sung
                        </td>
                      </tr>
                    ) : (
                      services.map((sv, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{sv.service}</td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border text-[11px] font-semibold">
                              {sv.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{sv.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(sv.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(sv.total)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(sv.orderedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 4: NHÀ HÀNG & QUẦY BAR (F&B) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">restaurant</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    4. Nhà Hàng / Quầy Bar Ghi Nợ Về Phòng ({fnb.length} món)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-amber-900">
                  {fmtMoney(summary.foodSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Món ăn / Đồ uống</th>
                      <th className="py-3 px-4 text-center">Số lượng</th>
                      <th className="py-3 px-4 text-right">Đơn giá</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 font-mono text-center">Mã đơn F&B</th>
                      <th className="py-3 px-4 text-right">Thời gian đặt món</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fnb.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 px-4 text-center text-slate-400 italic">
                          Không có hóa đơn ẩm thực nhà hàng/bar ghi nợ phòng
                        </td>
                      </tr>
                    ) : (
                      fnb.map((fb, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{fb.item}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{fb.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(fb.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(fb.total)}</td>
                          <td className="py-2.5 px-4 font-mono text-center text-slate-600 text-[11px]">{fb.orderCode || '—'}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(fb.orderedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 5: BỒI THƯỜNG THIỆT HẠI BUỒNG PHÒNG & PHẠT */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-lg">handyman</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    5. Bồi Thường Thiệt Hại Buồng Phòng & Phạt ({damages.length} khoản)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-rose-800">
                  {fmtMoney(summary.damageSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Tài sản / Khoản phạt</th>
                      <th className="py-3 px-4">Lý do ghi nhận</th>
                      <th className="py-3 px-4 font-mono text-center">Phòng</th>
                      <th className="py-3 px-4 text-right">Chi phí bồi thường</th>
                      <th className="py-3 px-4 text-right">Thời điểm lập biên bản</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {damages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 px-4 text-center text-slate-400 italic">
                          Không phát sinh bồi thường thiệt hại buồng phòng
                        </td>
                      </tr>
                    ) : (
                      damages.map((dam, i) => (
                        <tr key={dam.damageId || i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{dam.item}</td>
                          <td className="py-2.5 px-4 text-slate-600">{dam.reason || 'Kiểm phòng phát hiện'}</td>
                          <td className="py-2.5 px-4 font-mono text-center text-blue-600 font-semibold">{dam.roomNumber || '—'}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-rose-700">{fmtMoney(dam.total)}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(dam.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD QUYẾT TOÁN TÀI CHÍNH TỔNG THỂ */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-2xl border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cột trái: Tóm tắt từng khoản */}
                <div className="space-y-3 text-xs border-b md:border-b-0 md:border-r border-slate-700/80 pb-6 md:pb-0 md:pr-8">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-blue-400">calculate</span>
                    <span>Chi tiết cộng dồn các khoản chi phí</span>
                  </h4>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>1. Tiền phòng & phụ thu lưu trú:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.roomSubtotal)}</span>
                  </div>
                  {summary.extensionSubtotal > 0 && (
                    <div className="flex justify-between items-center text-blue-300 py-1 border-b border-slate-800">
                      <span>1b. Phí gia hạn lưu trú:</span>
                      <span className="font-mono text-sm">+{fmtMoney(summary.extensionSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>2. Tiêu dùng Minibar trong phòng:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.minibarSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>3. Dịch vụ khách sạn (giặt ủi, spa...):</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.serviceSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>4. Ẩm thực F&B ghi nợ phòng:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.foodSubtotal)}</span>
                  </div>
                  {summary.damageSubtotal > 0 && (
                    <div className="flex justify-between items-center text-rose-300 py-1 border-b border-slate-800">
                      <span>5. Bồi thường thiệt hại buồng phòng & phạt:</span>
                      <span className="font-mono text-sm">+{fmtMoney(summary.damageSubtotal)}</span>
                    </div>
                  )}
                  {summary.surcharge > 0 && (
                    <div className="flex justify-between items-center text-amber-300 py-1 border-b border-slate-800">
                      <span>Phụ phí phát sinh khác:</span>
                      <span className="font-mono text-sm">+{fmtMoney(summary.surcharge)}</span>
                    </div>
                  )}
                  {summary.discount > 0 && (
                    <div className="flex justify-between items-center text-rose-300 py-1 border-b border-slate-800">
                      <span>Giảm giá / Chiết khấu voucher:</span>
                      <span className="font-mono text-sm">-{fmtMoney(summary.discount)}</span>
                    </div>
                  )}
                </div>

                {/* Cột phải: 3 Chỉ Số Quyết Toán Cốt Lõi */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                    <span className="text-xs text-slate-300 font-semibold">TỔNG PHÁT SINH (Grand Total):</span>
                    <span className="text-lg font-bold font-mono text-cyan-300">
                      {fmtMoney(summary.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                    <span className="text-xs text-slate-300 font-semibold">ĐÃ THANH TOÁN / ĐẶT CỌC:</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {fmtMoney(summary.totalPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider block text-slate-100">
                        SỐ TIỀN CÒN PHẢI THU:
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {summary.remainingBalance > 0 ? 'Thu ngân cần thu thêm từ khách' : 'Đã thanh toán đủ toàn bộ'}
                      </span>
                    </div>
                    <span
                      className={`text-2xl font-black font-mono ${
                        summary.remainingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {fmtMoney(summary.remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL LẬP HÓA ĐƠN TỔNG HỢP */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
              {/* Header Modal */}
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-2xl">post_add</span>
                  <div>
                    <h3 className="text-base font-bold">Lập Hóa Đơn Tổng Hợp</h3>
                    <p className="text-xs text-slate-400">Đơn đặt phòng #{activeBookingId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {createInvoiceError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{createInvoiceError}</span>
                  </div>
                )}

                {data?.hasPendingServices && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-base text-amber-600 flex-shrink-0 mt-0.5">warning</span>
                    <div>
                      <strong className="block font-bold">Lưu ý dịch vụ chưa hoàn tất:</strong>
                      <span>Booking này vẫn còn dịch vụ đang tiếp nhận hoặc đang xử lý. Các đơn chưa hoàn thành sẽ KHÔNG được đưa vào hóa đơn này.</span>
                    </div>
                  </div>
                )}

                {/* Chọn Thuế suất VAT */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block uppercase">Thuế Suất GTGT (VAT %)</label>
                  <div className="flex gap-2">
                    {[0, 5, 8, 10].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setVatRate(rate)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          vatRate === rate
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thêm phụ thu / giảm giá thủ công */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Điều chỉnh tại quầy (Phụ thu / Giảm giá thủ công)
                    </label>
                    <span className="text-[11px] text-slate-400">{manualAdjustments.length} khoản</span>
                  </div>

                  {manualAdjustments.length > 0 && (
                    <div className="space-y-1.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50">
                      {manualAdjustments.map((adj, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-150">
                          <span className="text-slate-800">{adj.description}</span>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold ${adj.amount >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {adj.amount >= 0 ? `+${fmtMoney(adj.amount)}` : fmtMoney(adj.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdjustment(i)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Mô tả (VD: Trả phòng muộn, Khách VIP...)"
                      value={newAdjDesc}
                      onChange={(e) => setNewAdjDesc(e.target.value)}
                      className="col-span-6 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Số tiền..."
                      value={newAdjAmount}
                      onChange={(e) => setNewAdjAmount(e.target.value)}
                      className="col-span-3 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={newAdjType}
                      onChange={(e) => setNewAdjType(e.target.value)}
                      className="col-span-2 px-2 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="Surcharge">Phụ thu (+)</option>
                      <option value="Other">Giảm giá (-)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddAdjustment}
                      className="col-span-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                      title="Thêm khoản điều chỉnh"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>
                </div>

                {/* Khối xem trước số liệu hoá đơn */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng chi phí gom từ lưu trú:</span>
                    <span className="font-mono">{fmtMoney(summary.grandTotal)}</span>
                  </div>
                  {modalAdjSum !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Điều chỉnh thủ công tại quầy:</span>
                      <span className="font-mono">{modalAdjSum >= 0 ? `+${fmtMoney(modalAdjSum)}` : fmtMoney(modalAdjSum)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1.5">
                    <span>Tạm tính (Subtotal):</span>
                    <span className="font-mono">{fmtMoney(modalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Thuế GTGT ({vatRate}%):</span>
                    <span className="font-mono">+{fmtMoney(modalVatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-extrabold text-sm border-t border-slate-200 pt-1.5">
                    <span>TỔNG HÓA ĐƠN CHÍNH THỨC:</span>
                    <span className="font-mono">{fmtMoney(modalGrandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingInvoice}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreateInvoice}
                  disabled={creatingInvoice}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {creatingInvoice ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Xác Nhận Lập Hóa Đơn</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL QUYẾT TOÁN ĐA PHƯƠNG THỨC TẠI QUẦY (C9) */}
        <MultiTenderSettlementModal
          isOpen={showSettleModal}
          onClose={() => setShowSettleModal(false)}
          invoice={invoice}
          outstandingBalance={summary.remainingBalance}
          customerName={data?.guestName || data?.customerName || data?.customer?.fullName || data?.customer?.name}
          onSuccess={handleSettlementSuccess}
        />
      </div>
    </AdminLayout>
  );
}
