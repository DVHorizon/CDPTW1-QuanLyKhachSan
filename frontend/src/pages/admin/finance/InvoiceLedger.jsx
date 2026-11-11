import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import invoiceApi from '../../../api/invoiceApi';
import MultiTenderSettlementModal from '../../../components/admin/finance/MultiTenderSettlementModal';
import { cleanMessage, logSystemEvent } from '../../../utils/toastSanitizer';

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

export default function InvoiceLedger() {
  const location = useLocation();
  const params = useParams();
  const isSettlementRoute = location.pathname.includes('settlement');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(isSettlementRoute ? 'Unpaid' : 'ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchInput, setSearchInput] = useState(params.invoiceId ? String(params.invoiceId) : '');
  const [searchTerm, setSearchTerm] = useState(params.invoiceId ? String(params.invoiceId) : '');
  const [sortBy, setSortBy] = useState('date_desc');
  const [dateError, setDateError] = useState('');

  // Modals
  const [settleInvoice, setSettleInvoice] = useState(null);
  const [auditInvoice, setAuditInvoice] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Refund Modal
  const [refundModalInvoice, setRefundModalInvoice] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');

  // PDF Download loading per invoice
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (rawMsg, type = 'success') => {
    const msg = cleanMessage(rawMsg);
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Tự động mở modal quyết toán nếu có param invoiceId
  useEffect(() => {
    if (params.invoiceId && invoices.length > 0) {
      const target = invoices.find((inv) => String(inv.InvoiceId) === String(params.invoiceId));
      if (target && target.Status !== 'Paid') {
        setSettleInvoice(target);
      }
    }
  }, [params.invoiceId, invoices]);

  // Tải danh sách sổ cái hoá đơn
  const fetchInvoices = useCallback(async () => {
    setDateError('');
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      setDateError('Khoảng thời gian không hợp lệ. Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await invoiceApi.getInvoices({
        page,
        pageSize,
        status: statusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchTerm.trim() || undefined,
        sortBy,
      });

      const list = res.data || res.items || [];
      setInvoices(list);
      setTotal(res.total || 0);

      logSystemEvent({
        code: 'SUCCESS_LOAD_INVOICES',
        message: 'Tải danh sách sổ cái hoá đơn thành công',
        type: 'info',
        context: { page, total: res.total, count: list.length },
      });
    } catch (err) {
      const friendlyMsg = cleanMessage(err);
      setError(friendlyMsg || 'Không thể tải danh sách hoá đơn.');
      logSystemEvent({
        code: err.code || 'ERROR_LOAD_INVOICES',
        message: friendlyMsg,
        rawMessage: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, fromDate, toDate, searchTerm, sortBy]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Tìm kiếm (Debounce / submit)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setSearchInput('');
    setSearchTerm('');
    setSortBy('date_desc');
    setDateError('');
    setPage(1);
  };

  // Quick date presets
  const handleSetDatePreset = (preset) => {
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const pastStr = `${past.getFullYear()}-${p(past.getMonth() + 1)}-${p(past.getDate())}`;
      setFromDate(pastStr);
      setToDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = `${now.getFullYear()}-${p(now.getMonth() + 1)}-01`;
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
    setPage(1);
  };

  // KPI Calculations
  const totalCount = total;
  const paidCount = invoices.filter((i) => i.status === 'Paid').length;
  const pendingCount = invoices.filter((i) => i.status === 'Unpaid' || i.status === 'PartiallyPaid').length;
  const totalRevenueSum = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  // Xem Lịch sử giao dịch & Kiểm toán (Audit Trail)
  const handleOpenAuditModal = async (inv) => {
    setAuditInvoice(inv);
    setAuditData(null);
    setAuditLoading(true);

    try {
      const res = await invoiceApi.getInvoiceTransactions(inv.invoiceId);
      setAuditData(res.data || res);
    } catch (err) {
      showToast(cleanMessage(err) || 'Không thể tải lịch sử giao dịch', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // Tải file PDF an toàn bằng Blob
  const handleDownloadPdf = async (inv) => {
    setDownloadingPdfId(inv.invoiceId);
    try {
      const blob = await invoiceApi.fetchInvoicePdfBlob(inv.invoiceId, 'download');
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${inv.invoiceNumber || `INV-${inv.invoiceId}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      showToast('Đã tải hoá đơn PDF thành công!', 'success');
    } catch (err) {
      showToast(cleanMessage(err) || 'Không thể tải file PDF', 'error');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Mở modal hoàn tiền (Refund)
  const handleOpenRefundModal = async (inv) => {
    setRefundModalInvoice(inv);
    setRefundReason('');
    setRefundAmount('');
    setRefundError('');
    setSelectedPaymentId('');

    // Tải các payments con của invoice để chọn
    try {
      const res = await invoiceApi.getInvoiceTransactions(inv.invoiceId);
      const txns = res.data?.payments || [];
      const eligible = txns.filter((p) => p.status === 'Paid' || p.status === 'Success');
      if (eligible.length > 0) {
        setSelectedPaymentId(String(eligible[0].paymentId));
        setRefundAmount(String(eligible[0].amount));
      }
      setAuditData(res.data || res);
    } catch (e) {
      console.warn('Lỗi tải giao dịch phục vụ hoàn tiền:', e);
    }
  };

  // Xác nhận hoàn tiền
  const handleConfirmRefund = async (e) => {
    e.preventDefault();
    if (!selectedPaymentId) {
      setRefundError('Vui lòng chọn giao dịch cần hoàn tiền.');
      return;
    }
    if (!refundReason.trim() || refundReason.trim().length < 2) {
      setRefundError('Lý do hoàn tiền phải từ 2 ký tự trở lên.');
      return;
    }
    const amt = Number(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError('Số tiền hoàn phải lớn hơn 0.');
      return;
    }

    setRefundLoading(true);
    setRefundError('');

    try {
      await invoiceApi.refundPayment(selectedPaymentId, {
        refundReason: refundReason.trim(),
        refundAmount: amt,
      });

      showToast('Hoàn tiền giao dịch thành công!', 'success');
      logSystemEvent({
        code: 'SUCCESS_0001_REFUNDED',
        message: 'Hoàn tiền giao dịch thành công',
        type: 'success',
        context: { paymentId: selectedPaymentId, refundAmount: amt },
      });
      setRefundModalInvoice(null);
      fetchInvoices();
    } catch (err) {
      setRefundError(cleanMessage(err) || 'Lỗi khi thực hiện hoàn tiền giao dịch.');
    } finally {
      setRefundLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold border animate-slide-in ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-3xl">account_balance</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Sổ Cái Hoá Đơn & Quản Trị Tài Chính
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm toán luồng tiền, đối soát thanh toán đa phương thức và tra cứu lịch sử hoá đơn hệ thống (Màn 27 - C10)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInvoices}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-sm"
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Làm mới
            </button>
            <Link
              to="/admin/charges"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-200"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Bảng Kê Chi Phí Folio
            </Link>
          </div>
        </div>

        {/* 4 Thẻ KPI Thống Kê */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tổng Hoá Đơn</span>
              <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Đã Quyết Toán</span>
              <span className="text-2xl font-black text-emerald-600">{paidCount}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <span className="material-symbols-outlined text-2xl">pending_actions</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chưa Quyết Toán</span>
              <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Doanh Thu Gom (Trang)</span>
              <span className="text-xl font-black font-mono text-indigo-700">{fmtMoney(totalRevenueSum)}</span>
            </div>
          </div>
        </div>

        {/* Thanh Bộ Lọc & Tìm Kiếm */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm mã hoá đơn (INV-...), khách hàng..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tìm
              </button>
            </form>

            {/* Trạng thái Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'Paid', label: 'Đã thanh toán' },
                { id: 'Unpaid', label: 'Chờ thanh toán' },
                { id: 'PartiallyPaid', label: 'Thanh toán 1 phần' },
                { id: 'Cancelled', label: 'Đã huỷ' },
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range & sort row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold">Từ:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold">Đến:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800"
                />
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('today')}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('7days')}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('thisMonth')}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('all')}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Toàn bộ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
              >
                <option value="date_desc">Mới nhất trước</option>
                <option value="date_asc">Cũ nhất trước</option>
                <option value="amount_desc">Số tiền cao nhất</option>
                <option value="amount_asc">Số tiền thấp nhất</option>
              </select>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
              >
                Đặt lại
              </button>
            </div>
          </div>

          {dateError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{dateError}</span>
            </div>
          )}
        </div>

        {/* Bảng Dữ Liệu Hoá Đơn */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Mã Hóa Đơn</th>
                  <th className="py-3 px-4">Mã Đặt Phòng</th>
                  <th className="py-3 px-4">Khách Hàng</th>
                  <th className="py-3 px-4 text-right">Tổng Tiền</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4">Ngày Tạo</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span>Đang tải danh sách sổ cái hoá đơn...</span>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">receipt</span>
                      <p className="font-semibold text-sm">Không tìm thấy hoá đơn nào</p>
                      <p className="text-xs text-slate-400 mt-0.5">Thử nới lỏng bộ lọc tìm kiếm hoặc chọn khoảng ngày khác</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const isPaid = inv.status === 'Paid';
                    const isUnpaid = inv.status === 'Unpaid';
                    const isPartially = inv.status === 'PartiallyPaid';
                    const isCancelled = inv.status === 'Cancelled';

                    return (
                      <tr key={inv.invoiceId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          {inv.bookingId ? (
                            <Link
                              to={`/admin/charges?bookingId=${inv.bookingId}`}
                              className="text-blue-600 hover:text-blue-800 font-mono font-bold hover:underline flex items-center gap-1"
                              title="Xem Bảng Kê Folio"
                            >
                              <span>#BK-{inv.bookingId}</span>
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {inv.customerName || inv.guestName || 'Khách vãng lai'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {fmtMoney(inv.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : isPartially
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : isUnpaid
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {isPaid
                              ? 'Đã thanh toán'
                              : isPartially
                              ? 'Thanh toán 1 phần'
                              : isUnpaid
                              ? 'Chờ thanh toán'
                              : 'Đã huỷ'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {fmtDateTime(inv.invoiceDate || inv.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Xem Audit Trail */}
                            <button
                              type="button"
                              onClick={() => handleOpenAuditModal(inv)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Xem lịch sử giao dịch & Kiểm toán"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>

                            {/* Xuất / Tải PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(inv)}
                              disabled={downloadingPdfId === inv.invoiceId}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Tải hoá đơn PDF"
                            >
                              {downloadingPdfId === inv.invoiceId ? (
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                              )}
                            </button>

                            {/* Nút Quyết toán (Nếu chưa Paid) */}
                            {!isPaid && !isCancelled && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSettleInvoice({
                                    InvoiceId: inv.invoiceId,
                                    InvoiceNumber: inv.invoiceNumber,
                                    TotalAmount: inv.totalAmount,
                                    BookingId: inv.bookingId,
                                    customerName: inv.customerName,
                                  })
                                }
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Quyết toán đa phương thức tại quầy"
                              >
                                <span className="material-symbols-outlined text-base">payments</span>
                              </button>
                            )}

                            {/* Nút Hoàn tiền (Nếu đã Paid) */}
                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => handleOpenRefundModal(inv)}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Hoàn tiền giao dịch"
                              >
                                <span className="material-symbols-outlined text-base">currency_exchange</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Hiển thị <strong className="text-slate-800">{invoices.length}</strong> / <strong>{total}</strong> hoá đơn (Trang {page}/{totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                Trước
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = page - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                const active = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                Tiếp
              </button>
            </div>
          </div>
        </div>

        {/* MODAL 1: QUYẾT TOÁN ĐA PHƯƠNG THỨC */}
        {settleInvoice && (
          <MultiTenderSettlementModal
            isOpen={Boolean(settleInvoice)}
            onClose={() => setSettleInvoice(null)}
            invoice={settleInvoice}
            customerName={settleInvoice.customerName}
            onSuccess={() => {
              showToast('Quyết toán hoá đơn thành công!', 'success');
              setSettleInvoice(null);
              fetchInvoices();
            }}
          />
        )}

        {/* MODAL 2: LỊCH SỬ GIAO DỊCH & KIỂM TOÁN (AUDIT TRAIL) */}
        {auditInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-2xl">history</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Kiểm Toán Lịch Sử Giao Dịch</h3>
                    <p className="text-xs text-slate-300">
                      Hoá đơn {auditInvoice.invoiceNumber} • Tổng tiền: {fmtMoney(auditInvoice.totalAmount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAuditInvoice(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {auditLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Đang tải lịch sử giao dịch...</span>
                  </div>
                ) : (
                  <>
                    {/* Danh sách Payments */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-base">payments</span>
                        Các Khoản Thanh Toán Đã Ghi Nhận ({auditData?.payments?.length || 0})
                      </h4>
                      {auditData?.payments?.length === 0 ? (
                        <p className="text-slate-400 italic">Chưa có giao dịch thanh toán nào.</p>
                      ) : (
                        <div className="space-y-2">
                          {auditData?.payments?.map((p) => (
                            <div
                              key={p.paymentId}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">{p.transactionCode}</span>
                                <span className="text-[11px] text-slate-500">
                                  {p.method || p.paymentMethod} • {fmtDateTime(p.paymentDate)}
                                </span>
                                {p.gatewayResponse && (
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.gatewayResponse}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-sm text-emerald-700 block">
                                  {fmtMoney(p.amount)}
                                </span>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === 'Paid' || p.status === 'Success'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.status === 'Refunded'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Danh sách Refunds */}
                    {auditData?.refunds && auditData.refunds.length > 0 && (
                      <div className="pt-3 border-t border-slate-200">
                        <h4 className="font-bold text-rose-800 text-sm mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-rose-600 text-base">currency_exchange</span>
                          Lịch Sử Hoàn Tiền ({auditData.refunds.length})
                        </h4>
                        <div className="space-y-2">
                          {auditData.refunds.map((rf, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-rose-900 block">Hoàn giao dịch #{rf.transactionCode}</span>
                                <span className="text-[11px] text-rose-700">Lý do: {rf.refundReason || 'Khách đổi kế hoạch'}</span>
                              </div>
                              <span className="font-mono font-extrabold text-sm text-rose-700">
                                -{fmtMoney(rf.refundAmount || rf.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
                <button
                  type="button"
                  onClick={() => setAuditInvoice(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: HOÀN TIỀN GIAO DỊCH (REFUND MODAL) */}
        {refundModalInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-2xl">currency_exchange</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Xác Nhận Hoàn Tiền Giao Dịch</h3>
                    <p className="text-xs text-slate-300">Hoá đơn {refundModalInvoice.invoiceNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRefundModalInvoice(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleConfirmRefund} className="p-6 space-y-4 text-xs">
                {refundError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{refundError}</span>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                  <span className="font-bold block mb-0.5">Lưu ý quản trị tài chính:</span>
                  Hành động hoàn tiền sẽ chuyển giao dịch sang trạng thái <strong>Đã hoàn tiền (Refunded)</strong> và tự động điều chỉnh số dư trạng thái của hoá đơn tương ứng.
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Khoản thanh toán cần hoàn</label>
                  <select
                    value={selectedPaymentId}
                    onChange={(e) => {
                      setSelectedPaymentId(e.target.value);
                      const found = auditData?.payments?.find((p) => String(p.paymentId) === e.target.value);
                      if (found) setRefundAmount(String(found.amount));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    required
                  >
                    {auditData?.payments
                      ?.filter((p) => p.status === 'Paid' || p.status === 'Success')
                      .map((p) => (
                        <option key={p.paymentId} value={p.paymentId}>
                          {p.transactionCode} — {p.method} ({fmtMoney(p.amount)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số tiền hoàn (VND)</label>
                  <input
                    type="number"
                    min="100"
                    step="any"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lý do hoàn tiền (Bắt buộc)</label>
                  <textarea
                    rows="3"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết hoàn tiền (VD: Khách đổi lịch trình, huỷ dịch vụ spa...)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRefundModalInvoice(null)}
                    disabled={refundLoading}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={refundLoading}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {refundLoading ? 'Đang hoàn tiền...' : 'Xác Nhận Hoàn Tiền'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
