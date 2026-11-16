import React, { useEffect } from 'react';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);

export default function CancelBookingSuccessModal({ isOpen, cancelResult, guestEmail, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cancelResult) return null;

  const refundAmount = Number(cancelResult.refundAmount || 0);
  const confirmationCode = cancelResult.confirmationCode || `#BK-${cancelResult.bookingId}`;

  return (
    <div
      className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-success-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] bg-white rounded-3xl p-6 sm:p-8 pt-14 border border-emerald-100 shadow-2xl mt-8"
      >
        {/* Center Top Emerald Rosette Badge */}
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="relative w-22 h-22 rounded-full bg-gradient-to-tr from-emerald-700 via-emerald-500 to-teal-400 p-1 shadow-xl flex items-center justify-center border-2 border-[#f4dc9e]">
            <div className="w-full h-full rounded-full border-2 border-dashed border-emerald-100/60 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[40px] font-bold">check</span>
            </div>
          </div>
        </div>

        <header className="text-center mt-2 space-y-2.5">
          <h2 id="cancel-success-title" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1b382b] uppercase">
            Đã Hủy Đặt Phòng Thành Công
          </h2>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-slate-700">
            <span>
              Mã đặt chỗ: <strong className="text-slate-900 font-bold font-mono">#{confirmationCode}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600 text-white uppercase">
              {refundAmount > 0 ? 'Đã hủy & Đang hoàn tiền' : 'Đã hủy theo chính sách'}
            </span>
          </div>

          {guestEmail && (
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              Biên nhận hủy đặt phòng đã được ghi nhận cho tài khoản:{' '}
              <span className="font-semibold text-emerald-800 underline decoration-emerald-300">{guestEmail}</span>
            </p>
          )}
        </header>

        {/* Refund Tracking Stepper */}
        <section className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-emerald-900">
                Tiến Trình Xử Lý Hoàn Tiền
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">REFUND: {cancelResult.bookingId}</span>
          </div>

          <div className="relative px-2 sm:px-6 my-4">
            <div className="absolute top-4 left-10 right-10 h-1 bg-slate-200">
              <div className={`h-full bg-emerald-500 rounded-full ${refundAmount > 0 ? 'w-1/2' : 'w-full'}`} />
            </div>
            <div className="flex justify-between items-start relative z-10 text-center">
              <div className="flex flex-col items-center w-1/3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-emerald-100">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-emerald-900">1. Tiếp nhận yêu cầu</span>
                <span className="text-[10px] text-emerald-600">Hoàn tất</span>
              </div>
              <div className="flex flex-col items-center w-1/3">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-600 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-100/70">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-slate-800">2. Đối soát ngân hàng</span>
                <span className="text-[10px] text-emerald-700 font-mono">1–3 ngày làm việc</span>
              </div>
              <div className="flex flex-col items-center w-1/3">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                </div>
                <span className="mt-1.5 text-[11px] font-medium text-slate-400">3. Hoàn tất tài khoản</span>
                <span className="text-[10px] text-slate-400">3–5 ngày</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 bg-emerald-50/60 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-medium">Số tiền hoàn trả:</span>
              <span className="font-bold text-sm text-emerald-800">{formatVND(refundAmount)}</span>
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">{cancelResult.refundPolicyNote}</span>
          </div>
        </section>

        {/* Retention Voucher Card */}
        <section className="mt-4 rounded-2xl bg-gradient-to-r from-[#fcfbf7] via-[#fffdf9] to-[#f8f6f0] border border-[#f4dc9e] p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 max-w-sm">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#faedd0] text-[#7e5e1e] text-[10px] font-bold uppercase tracking-wider">
                Đặc quyền tri ân
              </span>
              <span className="text-xs font-serif font-bold text-slate-800">Ưu Đãi Cho Kỳ Nghỉ Kế Tiếp</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Quỹ phòng đã được mở lại trên hệ thống. Tặng quý khách mã ưu đãi <span className="font-bold text-emerald-800">giảm 15%</span> cho kỳ nghỉ sắp tới.
            </p>
          </div>
          <div className="flex-shrink-0 self-stretch sm:self-auto flex sm:flex-col items-center justify-center bg-white px-4 py-2 rounded-xl border border-dashed border-[#e5c46d] text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Mã giảm giá</span>
            <span className="text-sm font-mono font-extrabold text-emerald-700 tracking-wider my-0.5 select-all">SUMMER20</span>
            <span className="text-[9px] text-[#7e5e1e] font-medium">Áp dụng trực tuyến</span>
          </div>
        </section>

        <footer className="mt-6 flex flex-col items-center space-y-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center px-8 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition shadow-lg"
          >
            <span>Đóng &amp; Quay Về Danh Sách Đặt Phòng</span>
            <span className="material-symbols-outlined text-[18px] ml-2">arrow_forward</span>
          </button>
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
            <span>ACK: CONFIRMED_200</span>
            <span>•</span>
            <span>CỔNG KHÁCH HÀNG GRAND HORIZON</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
