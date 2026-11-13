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
          className="w-[280px] sm:w-[320px] max-h-[460px] bg-[#fafaf8] rounded-xl shadow-[0_15px_45px_-12px_rgba(0,0,0,0.4)] border border-[#dedad0] flex flex-col overflow-hidden mb-2.5 animate-scale-in"
        >
          {/* Header màu tối thanh lịch */}
          <div className="bg-[#1c1917] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-[#b9a277]/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6.5 h-6.5 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">school</span>
              </span>
              <div className="flex flex-col">
                <h3 id="academic-dialog-title" className="text-[12px] font-bold text-[#e5d5b5] leading-tight">
                  Thông Tin Đồ Án Môn Học
                </h3>
                <span className="text-[9.5px] text-stone-300">
                  Học thuật &amp; phi thương mại
                </span>
              </div>
            </div>

            {/* Nút thu nhỏ */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-md hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Thu nhỏ thông báo"
              aria-label="Thu nhỏ thông báo"
            >
              <span className="material-symbols-outlined text-[17px]">expand_more</span>
            </button>
          </div>

          {/* Nội dung chi tiết gọn gàng */}
          <div className="p-3 sm:p-3.5 flex-1 overflow-y-auto space-y-2.5 text-[11.5px] text-[#373435] leading-relaxed">
            {/* Banner cảnh báo vàng nhạt */}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#b9a277] shrink-0 mt-0.5">
                verified
              </span>
              <div>
                <strong className="block font-bold mb-0.5">Đồ Án Thực Hành:</strong>
                Dự án môn học chuyên ngành Công nghệ Phần mềm. Dữ liệu phòng, hình ảnh và thanh toán là mô phỏng kỹ thuật.
              </div>
            </div>

            {/* Thông tin đề tài */}
            <div className="bg-white p-2.5 rounded-lg border border-[#dedad0] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-[#dedad0]/60">
                <span className="text-[#8a8782]">Đề tài:</span>
                <span className="font-bold text-[#203044]">Quản Lý Grand Horizon</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-[#dedad0]/60">
                <span className="text-[#8a8782]">Phân hệ:</span>
                <span className="font-bold text-[#b9a277]">Khách Hàng &amp; Đặt Phòng</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8a8782]">Bản quyền:</span>
                <span className="font-semibold text-emerald-700">100% Phi Thương Mại</span>
              </div>
            </div>

            <p className="text-[10.5px] text-[#64748b]">
              💡 <em>Lưu ý: Mọi giao dịch chỉ phục vụ chấm điểm đồ án.</em>
            </p>
          </div>

          {/* Footer nút đóng */}
          <div className="px-3 py-2 bg-[#f5f2eb] border-t border-[#dedad0] flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-[#203044] hover:bg-[#8c6d3b] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>Thu nhỏ lại</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
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
