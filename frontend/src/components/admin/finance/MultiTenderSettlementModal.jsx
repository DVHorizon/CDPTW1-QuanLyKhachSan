import React, { useState, useEffect } from 'react';
import invoiceApi from '../../../api/invoiceApi';
import { cleanMessage, logSystemEvent } from '../../../utils/toastSanitizer';

const VALID_METHODS = [
  { id: 'Cash', label: 'Tiền mặt', icon: 'payments', isOnline: false },
  { id: 'Card', label: 'Thẻ POS', icon: 'credit_card', isOnline: false },
  { id: 'BankTransfer', label: 'Chuyển khoản', icon: 'account_balance', isOnline: false },
  { id: 'VietQR', label: 'VietQR', icon: 'qr_code', isOnline: true },
  { id: 'VNPay', label: 'VNPay QR', icon: 'qr_code_2', isOnline: true },
  { id: 'MoMo', label: 'Ví MoMo', icon: 'wallet', isOnline: true },
];

const fmtVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
};

export default function MultiTenderSettlementModal({
  isOpen,
  onClose,
  invoice,
  outstandingBalance,
  customerName,
  onSuccess,
}) {
  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.TotalAmount || 0);
  const existingPayments = invoice.payments || [];
  const alreadyPaid = existingPayments
    .filter((p) => ['Paid', 'Success', 'Completed'].includes(p.Status))
    .reduce((sum, p) => sum + Number(p.Amount || 0), 0);

  const balanceDue = outstandingBalance !== undefined
    ? Number(outstandingBalance)
    : Math.max(0, totalAmount - alreadyPaid);

  const [tenders, setTenders] = useState([
    { method: 'Cash', amount: balanceDue, customerCashGiven: balanceDue, transactionCode: '' },
  ]);
  const [note, setNote] = useState('Quyết toán tại quầy lễ tân');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    setTenders([
      { method: 'Cash', amount: balanceDue, customerCashGiven: balanceDue, transactionCode: '' },
    ]);
    setNote('Quyết toán tại quầy lễ tân');
    setErrorMessage('');
    setSuccessInfo(null);
  }, [isOpen, balanceDue]);

  // Thêm dòng tender mới
  const handleAddTender = () => {
    if (tenders.length >= 3) return;
    const currentSum = tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const remainder = Math.max(0, balanceDue - currentSum);
    setTenders([
      ...tenders,
      { method: 'Card', amount: remainder, customerCashGiven: remainder, transactionCode: '' },
    ]);
  };

  // Xoá 1 dòng tender
  const handleRemoveTender = (idx) => {
    if (tenders.length <= 1) return;
    setTenders(tenders.filter((_, i) => i !== idx));
  };

  // Thay đổi trường của tender
  const handleTenderChange = (idx, field, val) => {
    const updated = [...tenders];
    updated[idx] = { ...updated[idx], [field]: val };

    if (field === 'method' && val === 'Cash') {
      if (updated[idx].customerCashGiven === undefined || updated[idx].customerCashGiven < updated[idx].amount) {
        updated[idx].customerCashGiven = updated[idx].amount;
      }
    }
    if (field === 'method' && ['VietQR', 'VNPay', 'MoMo'].includes(val)) {
      if (!updated[idx].transactionCode) {
        const now = new Date();
        const code = `PMT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        updated[idx].transactionCode = code;
      }
    }
    setTenders(updated);
  };

  // Nút nhanh điền phần còn lại
  const handleFillRemainder = (idx) => {
    const otherSum = tenders.reduce((sum, t, i) => (i === idx ? sum : sum + (Number(t.amount) || 0)), 0);
    const rem = Math.max(0, balanceDue - otherSum);
    const updated = [...tenders];
    updated[idx].amount = rem;
    if (updated[idx].method === 'Cash') {
      updated[idx].customerCashGiven = rem;
    }
    setTenders(updated);
  };

  // Thêm tiền nhanh cho Cash
  const handleAddCashQuick = (idx, addVal) => {
    const updated = [...tenders];
    const current = Number(updated[idx].customerCashGiven) || 0;
    updated[idx].customerCashGiven = current + addVal;
    setTenders(updated);
  };

  // Set đúng tiền cho Cash
  const handleSetExactCash = (idx) => {
    const updated = [...tenders];
    updated[idx].customerCashGiven = Number(updated[idx].amount) || 0;
    setTenders(updated);
  };

  // Mở cổng giả lập C5 Mock Gateway cho tender trực tuyến (VietQR / VNPay / MoMo)
  const handleOpenMockGateway = async (idx, tender) => {
    setErrorMessage('');
    const amt = Number(tender.amount) || 0;
    if (amt <= 0) {
      setErrorMessage(`Vui lòng nhập số tiền hợp lệ cho hình thức #${idx + 1} trước khi mở cổng thanh toán.`);
      return;
    }
    try {
      const c5Res = await invoiceApi.createPayment({
        invoiceId: invoice.InvoiceId,
        amount: amt,
        method: tender.method,
        transactionCode: tender.transactionCode || undefined,
        returnUrl: window.location.href,
      });
      const paymentInfo = c5Res?.data || c5Res;
      const realTxCode = paymentInfo?.TransactionCode || paymentInfo?.transactionCode || tender.transactionCode;
      if (realTxCode) {
        handleTenderChange(idx, 'transactionCode', realTxCode);
      }
      const targetUrl =
        paymentInfo?.paymentUrl ||
        `/mock-payment/${realTxCode || 'PMT-TEST'}?amount=${amt}&method=${tender.method}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setErrorMessage(cleanMessage(err) || 'Không thể khởi tạo giao dịch trực tuyến trên Core Payment C5.');
    }
  };

  // Tính toán tổng phân bổ
  const sumTenders = tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const diffBalance = balanceDue - sumTenders;
  const isMatch = Math.abs(diffBalance) < 1;

  // Kiểm tra số lượng cổng online
  const onlineTendersCount = tenders.filter((t) => {
    const def = VALID_METHODS.find((m) => m.id === t.method);
    return def?.isOnline;
  }).length;

  // Tổng tiền thối cho tất cả tender Cash
  const totalChangeDue = tenders
    .filter((t) => t.method === 'Cash')
    .reduce((sum, t) => {
      const amt = Number(t.amount) || 0;
      const given = Number(t.customerCashGiven) || amt;
      return sum + Math.max(0, given - amt);
    }, 0);

  // Submit quyết toán
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (balanceDue > 0 && !isMatch) {
      setErrorMessage(
        diffBalance > 0
          ? `Tổng tiền các phương thức còn thiếu ${fmtVND(diffBalance)}. Vui lòng phân bổ đủ số dư.`
          : `Tổng tiền các phương thức vượt quá ${fmtVND(Math.abs(diffBalance))}. Vui lòng điều chỉnh lại.`
      );
      return;
    }

    if (onlineTendersCount > 1) {
      setErrorMessage('Chỉ được chọn tối đa 1 hình thức thanh toán trực tuyến trong 1 lần quyết toán.');
      return;
    }

    // Validate cash given
    for (let i = 0; i < tenders.length; i++) {
      const t = tenders[i];
      const amt = Number(t.amount) || 0;
      if (amt <= 0) {
        setErrorMessage(`Dòng thanh toán #${i + 1} có số tiền không hợp lệ.`);
        return;
      }
      if (t.method === 'Cash') {
        const given = Number(t.customerCashGiven) || 0;
        if (given < amt) {
          setErrorMessage(`Dòng tiền mặt #${i + 1}: Tiền khách đưa (${fmtVND(given)}) chưa đủ so với số tiền cần thu (${fmtVND(amt)}).`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payloadTenders = tenders.map((t) => ({
        method: t.method,
        amount: Number(t.amount),
        customerCashGiven: t.method === 'Cash' ? Number(t.customerCashGiven || t.amount) : undefined,
        transactionCode: t.transactionCode?.trim() || undefined,
      }));

      const res = await invoiceApi.settleInvoice(invoice.InvoiceId, {
        tenders: payloadTenders,
        note: note.trim(),
        releaseHoldOnComplete: true,
      });

      logSystemEvent({
        code: 'SUCCESS_INVOICE_SETTLED',
        message: 'Quyết toán hoá đơn thành công',
        type: 'success',
        context: { invoiceId: invoice.InvoiceId, totalPaid: sumTenders, changeAmount: totalChangeDue },
      });

      setSuccessInfo(res.data || res);
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data || res);
        onClose();
      }, 1200);
    } catch (err) {
      const friendlyMsg = cleanMessage(err);
      setErrorMessage(friendlyMsg || 'Lỗi khi thực hiện quyết toán hoá đơn.');
      logSystemEvent({
        code: err.code || 'ERROR_SETTLEMENT_FAILED',
        message: friendlyMsg,
        rawMessage: err.message,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">point_of_sale</span>
            <div>
              <h3 className="text-lg font-bold text-white">Quyết Toán Hoá Đơn Đa Phương Thức</h3>
              <p className="text-xs text-slate-300">
                {invoice.InvoiceNumber} • {customerName || invoice.customerName || 'Khách lẻ'} • Mã phòng #{invoice.BookingId || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            disabled={submitting}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Financial Summary Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Tổng Hoá Đơn</span>
              <span className="text-base font-bold text-white">{fmtVND(totalAmount)}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Đã Thu Trước</span>
              <span className="text-base font-bold text-slate-300">{fmtVND(alreadyPaid)}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40">
              <span className="text-xs text-emerald-300 uppercase tracking-wider font-semibold block mb-1">Cần Thu Còn Lại</span>
              <span className="text-lg font-extrabold text-emerald-400">{fmtVND(balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-shake">
              <span className="material-symbols-outlined text-rose-500 text-xl shrink-0 mt-0.5">error</span>
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successInfo && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">check_circle</span>
              <div>
                <p className="font-bold text-emerald-900">Quyết toán hoá đơn thành công!</p>
                {totalChangeDue > 0 && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Tiền thối lại cho khách: <strong>{fmtVND(totalChangeDue)}</strong>. Hãy mở ngăn kéo thu ngân.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Danh sách hình thức thanh toán */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-lg">call_split</span>
                Phân bổ phương thức thanh toán ({tenders.length}/3)
              </label>
              {tenders.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddTender}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Thêm hình thức
                </button>
              )}
            </div>

            {tenders.map((tender, idx) => {
              const isCash = tender.method === 'Cash';
              const amt = Number(tender.amount) || 0;
              const given = Number(tender.customerCashGiven) || 0;
              const changeDue = Math.max(0, given - amt);
              const isInsufficient = isCash && given < amt;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative transition-all hover:border-slate-300"
                >
                  {/* Top row: Method selector & remove */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase">Hình thức #{idx + 1}</span>
                    {tenders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTender(idx)}
                        className="text-slate-400 hover:text-rose-600 text-xs font-medium flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Xoá dòng
                      </button>
                    )}
                  </div>

                  {/* Method buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {VALID_METHODS.map((m) => {
                      const selected = tender.method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleTenderChange(idx, 'method', m.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg mb-0.5">{m.icon}</span>
                          <span className="truncate w-full text-center">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount input & fill remainder button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">Số tiền thu</label>
                        <button
                          type="button"
                          onClick={() => handleFillRemainder(idx)}
                          className="text-[11px] text-blue-600 hover:underline font-medium"
                        >
                          Số dư còn lại
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="100"
                          max="500000000"
                          step="any"
                          value={tender.amount}
                          onChange={(e) => handleTenderChange(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-900"
                          placeholder="Số tiền (VND)"
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">₫</span>
                      </div>
                    </div>

                    {/* Conditional inputs */}
                    {isCash ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">Tiền khách đưa</label>
                          <button
                            type="button"
                            onClick={() => handleSetExactCash(idx)}
                            className="text-[11px] text-emerald-600 hover:underline font-medium"
                          >
                            Đủ tiền
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={tender.customerCashGiven}
                            onChange={(e) => handleTenderChange(idx, 'customerCashGiven', e.target.value === '' ? '' : Number(e.target.value))}
                            className={`w-full pl-3 pr-10 py-2 rounded-lg border font-bold text-slate-900 ${
                              isInsufficient
                                ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-400'
                                : 'border-slate-300 focus:ring-blue-500'
                            }`}
                            placeholder="Tiền khách đưa"
                            required
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">₫</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Mã chuẩn chi / Giao dịch {['VietQR', 'VNPay', 'MoMo'].includes(tender.method) ? '(PMT)' : ''}
                          </label>
                          {['VietQR', 'VNPay', 'MoMo'].includes(tender.method) && (
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const code = `PMT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
                                handleTenderChange(idx, 'transactionCode', code);
                              }}
                              className="text-[11px] text-blue-600 hover:underline font-semibold"
                            >
                              Tạo mã mới
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={tender.transactionCode || ''}
                          onChange={(e) => handleTenderChange(idx, 'transactionCode', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                          placeholder={['VietQR', 'VNPay', 'MoMo'].includes(tender.method) ? 'PMT-YYYYMMDDHHMMSS-XXXX' : 'TXN-XXXXXX'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Dynamic VietQR code & bank information card */}
                  {['VietQR', 'VNPay', 'MoMo'].includes(tender.method) && (
                    <div className="mt-3 p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-sm flex flex-col items-center flex-shrink-0">
                          <img
                            src={`https://img.vietqr.io/image/VCB-0071000998899-compact2.png?amount=${Math.round(amt)}&addInfo=${encodeURIComponent(tender.transactionCode || invoice.InvoiceNumber || `INV-${invoice.InvoiceId}`)}&accountName=${encodeURIComponent('CONG TY CP RESORT GRAND HORIZON')}`}
                            alt="Mã VietQR Quyết toán"
                            className="w-36 h-36 object-contain"
                          />
                          <span className="text-[10px] font-bold text-emerald-800 mt-1 uppercase tracking-wider">VietQR NAPAS 247</span>
                        </div>
                        <div className="flex-1 text-xs space-y-1.5 w-full">
                          <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                            <span className="text-slate-500 font-medium">Ngân hàng:</span>
                            <span className="font-bold text-slate-800">Vietcombank (VCB)</span>
                          </div>
                          <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                            <span className="text-slate-500 font-medium">Số tài khoản:</span>
                            <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">0071000998899</span>
                          </div>
                          <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                            <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[180px]">CONG TY CP RESORT GRAND HORIZON</span>
                          </div>
                          <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                            <span className="text-slate-500 font-medium">Số tiền thu:</span>
                            <span className="font-bold text-emerald-600 text-sm">{fmtVND(amt)}</span>
                          </div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-slate-500 font-medium">Nội dung CK:</span>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[180px]">
                              {tender.transactionCode || invoice.InvoiceNumber || `INV-${invoice.InvoiceId}`}
                            </span>
                          </div>
                          <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] text-slate-500 italic">Quét mã bằng App ngân hàng bất kỳ</span>
                            <button
                              type="button"
                              onClick={() => handleOpenMockGateway(idx, tender)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-100/60 px-2 py-1 rounded-lg border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                              title="Mở cổng giả lập để test xác nhận webhook thành công"
                            >
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              <span>Mở Mock Gateway</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cash quick presets & change indicator */}
                  {isCash && (
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Cộng nhanh:</span>
                        {[50000, 100000, 200000, 500000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => handleAddCashQuick(idx, quick)}
                            className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium"
                          >
                            +{quick / 1000}k
                          </button>
                        ))}
                      </div>

                      {isInsufficient ? (
                        <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Khách đưa thiếu {fmtVND(amt - given)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          Thối lại: {fmtVND(changeDue)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Balance comparison status indicator */}
          <div className="p-4 rounded-xl border flex items-center justify-between text-sm transition-colors">
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-xl ${
                  isMatch ? 'text-emerald-600' : diffBalance > 0 ? 'text-amber-500' : 'text-rose-500'
                }`}
              >
                {isMatch ? 'check_circle' : diffBalance > 0 ? 'schedule' : 'error'}
              </span>
              <div>
                <span className="font-semibold text-slate-800">
                  {isMatch
                    ? 'Đã phân bổ khớp 100% số dư hoá đơn'
                    : diffBalance > 0
                    ? `Còn thiếu: ${fmtVND(diffBalance)}`
                    : `Vượt quá: ${fmtVND(Math.abs(diffBalance))}`}
                </span>
                <p className="text-xs text-slate-500">
                  Tổng phân bổ: {fmtVND(sumTenders)} / {fmtVND(balanceDue)}
                </p>
              </div>
            </div>

            {totalChangeDue > 0 && (
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Tổng tiền thối:</span>
                <span className="text-sm font-extrabold text-emerald-700">{fmtVND(totalChangeDue)}</span>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Ghi chú quyết toán</label>
            <textarea
              rows="2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nhập ghi chú thu tiền tại quầy..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || (balanceDue > 0 && !isMatch) || onlineTendersCount > 1}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
                submitting || (balanceDue > 0 && !isMatch) || onlineTendersCount > 1
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 active:scale-95'
              }`}
            >
              <span className="material-symbols-outlined text-lg">check</span>
              {submitting ? 'Đang quyết toán...' : 'Xác Nhận Quyết Toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
