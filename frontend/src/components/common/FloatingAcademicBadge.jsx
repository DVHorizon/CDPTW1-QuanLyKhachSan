import React, { useState } from 'react';

/**
 * FloatingAcademicBadge
 * Popup thông báo Đồ án môn học tương tác (thu nhỏ / mở rộng tương tự Widget AI Concierge)
 * Nằm cố định ở góc dưới bên trái màn hình
 */
export default function FloatingAcademicBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      aria-label="Thông báo đồ án môn học"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex flex-col items-start select-none pointer-events-auto"
    >
      {/* CỬA SỔ POPUP MỞ RỘNG */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="academic-dialog-title"
          className="w-[330px] sm:w-[390px] max-h-[520px] bg-[#fafaf8] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] border border-[#dedad0] flex flex-col overflow-hidden mb-3 animate-scale-in"
        >
          {/* Header màu tối sang trọng đồng bộ với AI Concierge */}
          <div className="bg-[#1c1917] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#b9a277]/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-sm shrink-0">
                <span className="material-symbols-outlined text-[19px]">school</span>
              </span>
              <div className="flex flex-col">
                <h3 id="academic-dialog-title" className="text-[13px] font-bold text-[#e5d5b5] leading-tight">
                  Thông Tin Đồ Án Môn Học
                </h3>
                <span className="text-[10.5px] text-stone-300">
                  Mục đích học thuật &amp; phi thương mại
                </span>
              </div>
            </div>

            {/* Nút thu nhỏ */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Thu nhỏ thông báo"
              aria-label="Thu nhỏ thông báo"
            >
              <span className="material-symbols-outlined text-[20px]">expand_more</span>
            </button>
          </div>

          {/* Nội dung chi tiết */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 text-[13px] text-[#373435] leading-relaxed">
            {/* Banner cảnh báo vàng nhạt */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[19px] text-[#b9a277] shrink-0 mt-0.5">
                verified
              </span>
              <div>
                <strong className="block font-bold mb-0.5">Sản Phẩm Đồ Án Học Thuật:</strong>
                Trang web này là dự án thực hành môn học chuyên ngành Công nghệ Phần mềm. Toàn bộ hình ảnh, phòng nghỉ, thương hiệu và thanh toán đều mang tính chất mô phỏng kỹ thuật.
              </div>
            </div>

            {/* Thông tin đề tài */}
            <div className="bg-white p-3.5 rounded-xl border border-[#dedad0] space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#dedad0]/60">
                <span className="text-[#8a8782] font-medium">Đề tài:</span>
                <span className="font-bold text-[#203044]">Quản Lý Khách Sạn Grand Horizon</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#dedad0]/60">
                <span className="text-[#8a8782] font-medium">Phân hệ:</span>
                <span className="font-bold text-[#b9a277]">Cổng Khách Hàng &amp; Đặt Phòng</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8a8782] font-medium">Bản quyền:</span>
                <span className="font-semibold text-emerald-700">100% Phi Thương Mại</span>
              </div>
            </div>

            <p className="text-[12px] text-[#64748b]">
              💡 <em>Lưu ý: Mọi giao dịch đặt phòng, mã giảm giá và thông tin tài khoản được lưu trữ chỉ để phục vụ kiểm thử và chấm điểm đồ án.</em>
            </p>
          </div>

          {/* Footer nút đóng */}
          <div className="p-3 bg-[#f5f2eb] border-t border-[#dedad0] flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#203044] hover:bg-[#8c6d3b] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Thu nhỏ lại</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>
        </div>
      )}

      {/* NÚT BADGE NỔI THU GỌN (Giống hệt Badge AI Concierge) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 bg-[#1c1917] hover:bg-stone-800 text-white px-5 py-3.5 rounded-full shadow-xl border border-[#b9a277]/60 transition-all duration-200 select-none cursor-pointer active:scale-95"
        title="Bấm để mở thông tin đồ án"
      >
        <span className="w-8 h-8 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-[19px]">school</span>
        </span>
        <div className="text-left">
          <div className="text-xs font-semibold tracking-wide text-[#e5d5b5] flex items-center gap-1.5">
            <span>Đồ Án Môn Học</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-[11px] text-stone-300">
            {isOpen ? 'Đang mở • Bấm để đóng' : 'Phi thương mại • Bấm để xem'}
          </div>
        </div>
      </button>
    </div>
  );
}
