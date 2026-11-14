import React from 'react';

/**
 * ScrollIcon (ScrollCue)
 * Tái tạo 100% component Framer: https://framer.com/m/ScrollIcon-kcl63q.js@QbSiYs7OTAywUGMWsnNt
 * Chạy thuần React + CSS Animations (không phụ thuộc thư viện ngoài, tương thích tuyệt đối môi trường Docker)
 */
export default function ScrollIcon({
  iconColor = '#ffd985',
  backgroundColor = 'rgba(255, 255, 255, 0.05)',
  borderColor = 'rgba(255, 255, 255, 0.45)',
  borderWidth = 2,
  borderRadius = 18,
  animationSpeed = 1.6,
  mouseWidth = 26,
  mouseHeight = 44,
  dotSize = 5,
  showLabel = true,
  labelText = 'CUỘN XUỐNG',
  onClick,
  style = {}
}) {
  const size = Math.min(mouseWidth, mouseHeight);
  const animationDistance = Math.round(size * 0.4);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
      style={style}
    >
      {/* Dynamic Keyframes for Framer Bounce Animation */}
      <style>{`
        @keyframes framerScrollDotBounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(${animationDistance}px);
            opacity: 0.35;
          }
        }
        .framer-scroll-dot {
          animation: framerScrollDotBounce ${animationSpeed}s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
      `}</style>

      {/* Framer Animated Mouse Capsule */}
      <div
        className="group-hover:border-[#ffd985] group-hover:scale-105 transition-all duration-300"
        style={{
          width: mouseWidth,
          height: mouseHeight,
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: borderRadius,
          backgroundColor: backgroundColor,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: size * 0.22,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(4px)'
        }}
      >
        {/* Animated Dot inside Capsule */}
        <div
          className="framer-scroll-dot"
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: iconColor,
            boxShadow: `0 0 8px ${iconColor}`
          }}
        />
      </div>

      {showLabel && (
        <span className="font-sans text-[10.5px] sm:text-[11px] font-bold text-white/85 group-hover:text-[#ffd985] tracking-[0.28em] uppercase transition-colors drop-shadow-md mt-2">
          {labelText}
        </span>
      )}
    </div>
  );
}
