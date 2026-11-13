import React from 'react';

/**
 * Watermark thông báo Đồ án môn học chuẩn phong cách watermark "Activate Windows"
 * Hiển thị cố định góc dưới bên trái, chữ mờ ảo, không che chắn hay cản trở thao tác
 */
export default function FloatingAcademicBadge() {
  return (
    <div
      aria-hidden="true"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-8 z-40 pointer-events-none select-none text-left"
      style={{
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif"
      }}
    >
      <p
        className="text-[18px] sm:text-[21px] font-semibold tracking-wide leading-tight"
        style={{
          color: 'rgba(255, 255, 255, 0.95)',
          textShadow: '0 1px 2px #000, 0 0 4px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.85)'
        }}
      >
        Đồ án môn học
      </p>
      <p
        className="text-[13px] sm:text-[14px] font-medium leading-tight mt-1"
        style={{
          color: 'rgba(255, 255, 255, 0.90)',
          textShadow: '0 1px 2px #000, 0 0 4px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.85)'
        }}
      >
        Không dùng cho mục đích thương mại.
      </p>
    </div>
  );
}
