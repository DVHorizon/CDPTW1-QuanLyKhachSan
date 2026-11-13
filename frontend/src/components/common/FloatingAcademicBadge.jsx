import React, { useState } from 'react';

/**
 * FloatingAcademicBadge
 * Huy hiệu nổi góc trái thông báo đồ án môn học phi thương mại
 * Thiết kế chuẩn phong cách đối xứng với nút Trợ lý AI Concierge bên phải
 */
export default function FloatingAcademicBadge() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDismissed) return null;

  return (
    <aside
      aria-label="Thông báo đồ án môn học"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-2 select-none animate-fade-in pointer-events-auto"
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-3 bg-[#1c1917]/95 hover:bg-stone-800 backdrop-blur-md text-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-full shadow-xl border border-[#b9a277]/60 transition-all duration-300 hover:shadow-2xl cursor-pointer"
        title="Nhấn để xem chi tiết thông tin đồ án"
      >
        {/* Academic Gold Icon */}
        <div className="w-8 h-8 rounded-full bg-[#b9a277] text-[#1c1917] flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-[19px]">school</span>
        </div>

        {/* Text Content */}
        <div className="text-left flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#e5d5b5]">
            <span>Đồ Án Môn Học</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-[11px] text-stone-300">
            Phi thương mại • Phục vụ học tập
          </div>
        </div>
      </div>

      {/* Nút đóng thu gọn */}
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        title="Ẩn thông báo"
        className="w-6 h-6 rounded-full bg-[#1c1917]/80 hover:bg-stone-800 text-stone-400 hover:text-white border border-[#b9a277]/40 flex items-center justify-center transition-all cursor-pointer shadow-sm text-xs"
        aria-label="Đóng thông báo"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>

      {/* Modal giải thích chi tiết khi click */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-[#fafaf8] border border-[#dedad0] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#203044]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#dedad0] mb-4">
              <div className="flex items-center gap-2 text-[#8c6d3b] font-bold text-base">
                <span className="material-symbols-outlined text-[22px]">verified</span>
                <span>Thông Báo Bản Quyền &amp; Học Thuật</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#dedad0]/50 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
              <p>
                <strong>Hệ thống quản lý khách sạn &amp; khu nghỉ dưỡng Grand Horizon</strong> là sản phẩm đồ án môn học thực hành chuyên ngành công nghệ phần mềm.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                ⚠️ <strong>Lưu ý:</strong> Trang web và toàn bộ dữ liệu (hình ảnh, giá phòng, thông tin liên hệ, thanh toán mô phỏng) được sử dụng thuần túy phục vụ cho mục đích nghiên cứu, học tập và kiểm thử kỹ thuật. <strong>Hoàn toàn không có giá trị thương mại hay giao dịch thực tế.</strong>
              </div>
              <p className="text-xs text-slate-400 pt-1">
                © 2026 Nhóm tác giả sinh viên. All educational rights reserved.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#dedad0] flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-2 rounded-xl bg-[#203044] hover:bg-[#8c6d3b] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
