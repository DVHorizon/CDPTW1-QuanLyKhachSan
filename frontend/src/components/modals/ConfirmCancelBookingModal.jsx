import React, { useState, useEffect } from 'react';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);

const formatDateShort = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
};

export default function ConfirmCancelBookingModal({
  isOpen,
  booking,
  cancellationReason,
  onChangeReason,
  isSubmitting,
  cancelFeedback,
  onClose,
  onConfirm,
}) {
  const [extraFeedback, setExtraFeedback] = useState('');
  const [isConfirmedIrrevocable, setIsConfirmedIrrevocable] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setExtraFeedback('');
    setIsConfirmedIrrevocable(true);
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !booking) return null;

  const deposit = Number(booking.depositAmount || 0);
  const total = Number(booking.totalAmount || 0);
  const fullRefund = Boolean(booking.isEligibleForFullRefund);
  const refundAmount = fullRefund ? deposit : 0;
  const penaltyAmount = fullRefund ? 0 : deposit;

  const handleSubmit = () => {
    const combinedReason = extraFeedback.trim()
      ? `${cancellationReason} (${extraFeedback.trim()})`
      : cancellationReason;
    onConfirm?.(combinedReason);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={() => !isSubmitting && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#fcfbf9] text-slate-800 w-full max-w-[660px] rounded-2xl shadow-2xl overflow-hidden relative border border-[#e8dfcf] flex flex-col max-h-[92vh]"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-200 via-[#c5a059] to-amber-200" />

        <button
          type="button"
          aria-label="Đóng hộp thoại"
          disabled={isSubmitting}
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 p-2 rounded-full transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="px-6 sm:px-8 pt-7 pb-6 overflow-y-auto space-y-5">
          <div className="text-center space-y-2.5">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 border border-amber-300/80 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[#b4832c] text-[28px]">warning</span>
            </div>
            <h3 id="cancel-modal-title" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              BẠN CÓ CHẮC MUỐN HỦY ĐẶT PHÒNG?
            </h3>
            <p className="text-xs sm:text-[13px] text-stone-500 max-w-md mx-auto leading-relaxed">
              Thao tác này sẽ hủy việc giữ chỗ của quý khách tại Grand Horizon và kích hoạt quy trình hoàn tiền theo chính sách quy định.
            </p>
          </div>

          <div className="bg-[#f5f1e8]/75 border border-[#e3d7bf] rounded-xl p-4 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-900">
              <span className="text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded text-xs tracking-wider font-mono">
                MÃ #{booking.confirmationCode}
              </span>
              <span>Hạng phòng: {booking.roomType?.TypeName || booking.roomType?.Name || 'Luxury Suite'}</span>
            </div>
            <div className="text-xs sm:text-[13px] text-stone-600 mt-1.5 font-medium flex items-center justify-center flex-wrap gap-2">
              <span>
                Thời gian:{' '}
                <strong className="text-slate-800">
                  {formatDateShort(booking.checkInDate)} – {formatDateShort(booking.checkOutDate)} ({booking.numberOfNights || 1} đêm)
                </strong>
              </span>
              {booking.assignedRoom?.roomNumber && (
                <>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-800 font-semibold">Phòng {booking.assignedRoom.roomNumber}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider font-bold text-stone-500 flex items-center justify-between border-b border-stone-100 pb-2">
              <span>Chi tiết chính sách hoàn tiền (Mốc 72h)</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  fullRefund
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {fullRefund ? 'Hủy tiêu chuẩn (>= 72h)' : 'Hủy cận giờ (< 72h)'}
              </span>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-stone-600">
                <span>Tổng giá trị đặt phòng:</span>
                <span className="font-medium text-slate-800">{formatVND(total)}</span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Tiền cọc đã thanh toán:</span>
                <span className="font-semibold text-slate-800">{formatVND(deposit)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-900/90 font-medium">
                <span>Phí hủy theo quy định ({fullRefund ? '0%' : '100% cọc'}):</span>
                <span className="text-red-700 font-semibold">- {formatVND(penaltyAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-200 text-slate-900 font-bold">
                <span className="text-emerald-800">Số tiền hoàn lại dự kiến ({fullRefund ? '100%' : '0%'} cọc):</span>
                <span className="text-emerald-700 text-base font-serif">{formatVND(refundAmount)}</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3 text-xs text-stone-600 flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[17px] mt-0.5">verified</span>
              <p className="leading-relaxed">
                {fullRefund
                  ? 'Tiền cọc sẽ được hoàn trả tự động về phương thức thanh toán ban đầu trong vòng 3 – 5 ngày làm việc.'
                  : 'Do hủy trong vòng 72 giờ trước giờ nhận phòng (15:00), hệ thống áp dụng giữ 100% tiền cọc theo chính sách lưu trú.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="cancel-reason-select">
                Lý do hủy đặt phòng <span className="text-red-600 font-bold">*</span>
              </label>
              <select
                id="cancel-reason-select"
                value={cancellationReason}
                onChange={(e) => onChangeReason?.(e.target.value)}
                className="w-full text-sm bg-white border border-stone-300 rounded-lg py-2.5 px-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
              >
                <option value="Thay đổi kế hoạch nghỉ dưỡng cá nhân">Thay đổi kế hoạch công tác / gia đình</option>
                <option value="Đặt nhầm ngày lưu trú hoặc loại phòng">Đặt nhầm ngày lưu trú hoặc loại phòng</option>
                <option value="Lý do sức khỏe hoặc sự cố cá nhân đột xuất">Lý do sức khỏe hoặc sự cố cá nhân đột xuất</option>
                <option value="Lý do chuyến bay / phương tiện di chuyển">Lý do chuyến bay / phương tiện di chuyển</option>
                <option value="Khác">Lý do khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="cancel-extra-feedback">
                Ý kiến đóng góp thêm <span className="text-stone-400 font-normal lowercase">(không bắt buộc)</span>
              </label>
              <textarea
                id="cancel-extra-feedback"
                rows={2}
                value={extraFeedback}
                onChange={(e) => setExtraFeedback(e.target.value)}
                placeholder="Góp ý để Grand Horizon không ngừng cải thiện chất lượng dịch vụ..."
                className="w-full text-sm bg-white border border-stone-300 rounded-lg p-3 text-slate-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c5a059] resize-none"
              />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={isConfirmedIrrevocable}
                onChange={(e) => setIsConfirmedIrrevocable(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#991b1b] focus:ring-[#c5a059]"
              />
              <span className="text-xs text-stone-700 leading-snug">
                Tôi hiểu rằng yêu cầu hủy đặt phòng này là <strong>vĩnh viễn</strong> và không thể khôi phục trạng thái giữ chỗ sau khi hoàn tất.
              </span>
            </label>

            {cancelFeedback && cancelFeedback.type === 'error' && (
              <div className="p-3 rounded-xl border bg-red-50 border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{cancelFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 sm:px-8 py-4 bg-stone-50/90 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1 px-6 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-slate-700 font-semibold text-xs tracking-wider uppercase transition"
          >
            Giữ Lại Đặt Phòng
          </button>
          <button
            type="button"
            disabled={isSubmitting || !isConfirmedIrrevocable}
            onClick={handleSubmit}
            className="w-full sm:w-auto order-1 sm:order-2 px-7 py-2.5 rounded-lg bg-[#b91c1c] hover:bg-[#991b1b] text-white font-semibold text-xs tracking-wider uppercase transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">delete_forever</span>
            <span>{isSubmitting ? 'Đang Xử Lý Hủy...' : 'Xác Nhận Hủy Đặt Phòng'}</span>
          </button>
        </div>

        <div className="py-1.5 bg-stone-100 text-center text-[10px] text-stone-400 tracking-wide uppercase border-t border-stone-200/50">
          Nhấn phím [Esc] hoặc bấm vùng bên ngoài để quay lại
        </div>
      </div>
    </div>
  );
}
