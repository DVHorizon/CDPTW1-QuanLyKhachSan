import React, { useEffect } from 'react';

export default function ConfirmSoftDeleteModal({
  isOpen,
  title = 'XÁC NHẬN XÓA DỮ LIỆU NÀY?',
  subtitle = 'Bạn sắp xóa đối tượng khỏi danh mục hiện hành. Dữ liệu sẽ được ẩn và chuyển vào kho lưu trữ (Cơ chế Soft Delete — IsDeleted: 0 → 1).',
  entityCode = '',
  entityName = '',
  entityMeta = '',
  confirmLabel = 'XÓA MỀM DỮ LIỆU',
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 animate-fade-in"
      onClick={() => !isSubmitting && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[600px] rounded-xl border border-red-500/40 bg-[#12161a]/95 text-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0d1013]/90 text-[11px] font-mono tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-slate-300 font-semibold uppercase">MODAL M3 — SOFT DELETE CONFIRMATION</span>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-sm font-mono"
            title="Đóng modal (ESC)"
          >
            ✕
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="w-13 h-13 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-100 tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-[13px] leading-relaxed text-slate-300 max-w-lg">
              {subtitle}
            </p>
          </div>

          <div className="rounded-lg border border-slate-700/80 bg-[#161c21]/90 p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 to-amber-500" />
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 pl-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Đối tượng được chọn</span>
              {entityCode && (
                <span className="text-[11px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-semibold">
                  {entityCode}
                </span>
              )}
            </div>
            <div className="pl-2 text-xs space-y-1">
              <p className="text-slate-100 font-semibold text-sm">{entityName}</p>
              {entityMeta && <p className="text-slate-400">{entityMeta}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-3.5 flex items-start gap-3 text-xs leading-relaxed">
            <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5">shield</span>
            <div className="space-y-1 text-slate-300">
              <p className="font-semibold text-red-300 uppercase tracking-wide text-[11px]">Lưu ý kiểm toán &amp; khôi phục:</p>
              <p className="text-slate-300/90">
                Dữ liệu lịch sử và khóa ngoại liên kết vẫn được bảo toàn nguyên vẹn (`IsDeleted = 1`) và có thể khôi phục từ thùng rác.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex flex-col items-center justify-center px-4 py-2.5 rounded-lg border border-slate-400/40 bg-slate-100 hover:bg-white text-slate-900 transition shadow-xs"
            >
              <span className="text-xs font-bold tracking-wider uppercase font-mono">Hủy Bỏ // Giữ Nguyên</span>
              <span className="text-[10px] text-slate-600 font-mono">Phím tắt ESC</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider uppercase font-mono transition shadow-lg disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">delete</span>
              <span>{isSubmitting ? 'Đang xử lý...' : confirmLabel}</span>
            </button>
          </div>
        </div>

        <div className="px-5 py-2 bg-[#090c0e] border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>AUDIT_DISPATCH: LOG_WARN_SOFT_DELETE</span>
          <span className="text-emerald-400">ENCRYPTED</span>
        </div>
      </div>
    </div>
  );
}
