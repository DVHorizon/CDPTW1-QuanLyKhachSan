import React, { useState } from 'react';

/**
 * FloatingAcademicBadge
 * Popup thông báo Đồ án môn học tương tác (nhỏ gọn, thanh lịch)
 * Nằm cố định ở góc dưới bên trái màn hình
 */
export default function FloatingAcademicBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      aria-label="Thông báo đồ án môn học"
      className="fixed bottom-4 left-4 sm:bottom-5 sm:left-6 z-40 flex flex-col items-start select-none pointer-events-auto"
    >
      {/* CỬA SỔ POPUP MỞ RỘNG (GỌN GÀNG, VỪA VẶN) */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="academic-dialog-title"
          className="w-[260px] sm:w-[280px] bg-[#fafaf8] rounded-xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.35)] border border-[#dedad0] flex flex-col overflow-hidden mb-2.5 animate-scale-in"
        >
          {/* Header màu tối thanh lịch */}
          <div className="bg-[#1c1917] text-white px-3 py-2 flex items-center justify-between border-b border-[#b9a277]/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">school</span>
              </span>
              <h3 id="academic-dialog-title" className="text-[12px] font-bold text-[#e5d5b5] leading-tight">
                Đồ Án Môn Học
              </h3>
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-5.5 h-5.5 rounded hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng thông báo"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Nội dung chi tiết ngắn gọn */}
          <div className="p-3 space-y-2 text-[11px] text-[#373435] leading-relaxed">
            <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-950 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#b9a277] shrink-0 mt-0.5">
                verified
              </span>
              <p className="leading-snug">
                Website là <strong>dự án thực hành môn học</strong> (100% Phi thương mại).
              </p>
            </div>

            <p className="text-[10.5px] text-stone-600 px-0.5 leading-snug">
              💡 Mọi thông tin phòng, hình ảnh và thanh toán chỉ mang tính mô phỏng kỹ thuật phục vụ chấm điểm.
            </p>
          </div>
        </div>
      )}

      {/* NÚT BADGE NỔI TRÒN CHỈ CÓ ICON HỌC TẬP */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1c1917] hover:bg-stone-800 text-white shadow-xl border border-[#b9a277]/80 flex items-center justify-center transition-all duration-200 select-none cursor-pointer active:scale-95 hover:shadow-2xl"
        title="Thông tin đồ án môn học (Bấm để xem)"
        aria-label="Thông tin đồ án môn học"
      >
        <span className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-[18px]">school</span>
        </span>

        {/* Chấm xanh nhỏ thông báo trạng thái hoạt động */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#1c1917] animate-pulse" />
      </button>
    </div>
  );
}
