import React, { useState } from 'react';

/**
 * AcademicDisclaimerWatermark
 * Hiển thị thông báo lơ lửng góc dưới màn hình dạng Watermark Desktop Windows
 * Thông báo: "Đây là đồ án môn học - Không dùng để thương mại"
 */
export default function AcademicDisclaimerWatermark() {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <aside
      aria-label="Thông báo đồ án môn học phi thương mại"
      className="fixed bottom-4 right-5 z-[9999] select-none transition-all duration-300 pointer-events-auto"
    >
      {isMinimized ? (
        // Nút thu nhỏ gọn gàng
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#203044]/90 hover:bg-[#203044] text-[#ffd985] text-xs font-medium shadow-lg backdrop-blur-md border border-[#b9a277]/40 cursor-pointer transition-transform hover:scale-105"
          title="Mở rộng thông báo đồ án"
        >
          <span className="material-symbols-outlined text-[15px]">school</span>
          <span>Đồ án môn học</span>
        </button>
      ) : (
        // Khung watermark lơ lửng phong cách Windows Desktop tinh tế
        <div className="relative group bg-[#161d19]/80 hover:bg-[#161d19]/95 text-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.36)] transition-all max-w-[320px]">
          {/* Nút thu nhỏ / ẩn nhanh */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/70 hover:bg-black text-gray-300 hover:text-white flex items-center justify-center text-[10px] border border-white/20 cursor-pointer shadow-xs transition-colors"
            title="Thu nhỏ thông báo"
            aria-label="Thu nhỏ"
          >
            ✕
          </button>

          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#ffd985] text-[20px] shrink-0 mt-0.5">
              school
            </span>
            <div className="flex flex-col">
              <div className="text-[12px] font-bold tracking-wide text-[#ffd985] flex items-center gap-1.5 uppercase font-sans">
                Đồ Án Môn Học
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-white/85 leading-snug mt-0.5 font-normal">
                Website phục vụ mục đích học tập &amp; nghiên cứu kỹ thuật. <strong className="text-white font-semibold">Không dùng để thương mại</strong>.
              </p>
              <div className="text-[9.5px] text-white/50 tracking-wider mt-1 uppercase font-mono">
                Grand Horizon • Academic Project
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
