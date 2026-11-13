import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * StickyScrollStory
 * Hiệu ứng Sticky Scroll Story mô phỏng chính xác thành phần:
 * https://framer.com/m/StickyScrollStory-2-x6oztN.js@3u60lLOoADWXFvcvY5Ek
 * 
 * Sử dụng pure React + requestAnimationFrame để đảm bảo mượt mà 60fps,
 * tương thích 100% với môi trường Docker/Vite mà không cần thêm thư viện ngoài.
 */

const DEFAULT_STORY_TEXTS = [
  "Khởi nguồn từ khát vọng kiến tạo những tuyệt tác nghỉ dưỡng ven biển đẳng cấp quốc tế ngay trên dải đất hình chữ S.",
  "Mỗi khu nghỉ dưỡng là một bản giao hưởng độc bản giữa thiên nhiên kỳ vĩ và kiến trúc duy mỹ đương đại.",
  "Nơi từng khoảnh khắc được nâng niu bởi dịch vụ quản gia 24/7 tận tâm, ẩm thực thượng hạng và sự riêng tư tuyệt đối.",
  "16 thiên đường biển đảo danh tiếng — từ vịnh ngọc Hạ Long, bán đảo Sơn Trà đến làn nước ngọc lam Phú Quốc.",
  "Grand Horizon không chỉ là điểm dừng chân, mà là hành trình chạm đến đỉnh cao của nghệ thuật sống thượng lưu."
];

export default function StickyScrollStory({
  texts = DEFAULT_STORY_TEXTS,
  badge = "HÀNH TRÌNH TINH HOA",
  tagline = "CÂU CHUYỆN THƯƠNG HIỆU",
  backgroundColor = "#111827", // Tone tối sang trọng chuẩn 5 sao
  textColor = "#ffffff",
  accentColor = "#ffd985",
  activeDotColor = "#b9a277",
  inactiveDotColor = "rgba(255, 255, 255, 0.2)",
  vhPerItem = 90
}) {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const safeTexts = Array.isArray(texts) && texts.length > 0 ? texts : DEFAULT_STORY_TEXTS;
  const total = safeTexts.length;

  // Đo kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tính toán tiến trình cuộn (0 -> 1)
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalScrollable = rect.height - windowHeight;

    if (totalScrollable <= 0) return;

    // Khoảng cách từ đỉnh container đến đỉnh viewport
    const currentScrolled = -rect.top;
    const progress = Math.min(Math.max(currentScrolled / totalScrollable, 0), 1);

    setScrollProgress(progress);

    // Tính index hiện tại
    const newIdx = Math.min(Math.floor(progress * total), total - 1);
    setActiveIndex(Math.max(newIdx, 0));
  }, [total]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll(); // Chạy lần đầu

    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  // Cuộn mượt đến slide tương ứng khi bấm vào chấm tròn
  const scrollToSlide = (idx) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
    const segment = 1 / total;
    const targetProgress = idx * segment + segment * 0.45;
    const targetScrollY = containerTop + targetProgress * totalScrollable;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: `${total * vhPerItem}vh`,
        backgroundColor
      }}
      className="relative w-full overflow-clip select-none"
    >
      {/* KHUNG STICKY DÍNH Ở TOÀN BỘ MÀN HÌNH VIEWPORT */}
      <div className="sticky top-0 w-full h-screen min-h-[500px] flex flex-col items-center justify-center overflow-hidden z-10 px-4 sm:px-8 lg:px-16">
        
        {/* Ánh sáng vàng mờ nền tạo chiều sâu nghệ thuật */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />

        {/* CỘT CHẤM TIẾN TRÌNH TRÁI (DESKTOP) */}
        {!isMobile && (
          <div className="absolute left-8 sm:left-12 lg:left-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3.5 z-20">
            <span className="text-[10px] font-mono tracking-widest text-[#ffd985]/70 uppercase rotate-180 [writing-mode:vertical-rl] mb-1">
              {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>

            {safeTexts.map((_, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className="group relative flex items-center justify-center p-1 cursor-pointer transition-all focus:outline-none"
                  aria-label={`Chuyển đến câu chuyện ${idx + 1}`}
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-3 h-3 scale-110 shadow-[0_0_12px_rgba(255,217,133,0.8)]'
                        : 'w-2 h-2 opacity-50 group-hover:opacity-100 group-hover:scale-125'
                    }`}
                    style={{
                      backgroundColor: isActive ? accentColor : inactiveDotColor
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* NỘI DUNG CHÍNH (TIÊU ĐỀ + TEXT HIỆU ỨNG CUỘN) */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Badge nhận diện */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#ffd985] text-[11px] sm:text-[12px] font-semibold tracking-widest uppercase mb-6 sm:mb-8 shadow-xs">
            <span className="material-symbols-outlined text-[15px] sm:text-[17px] text-[#ffd985]">
              auto_awesome
            </span>
            <span>{badge}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/80 font-normal">{tagline}</span>
          </div>

          {/* Icon mở đầu phong cách tạp chí thượng lưu */}
          <div className="text-[#ffd985]/40 mb-3 sm:mb-4">
            <span className="font-serif text-[42px] sm:text-[54px] leading-none select-none">“</span>
          </div>

          {/* VÙNG CHỨA CÁC ĐOẠN TEXT CUỘN CHUYỂN ĐỘNG */}
          <div className="relative w-full min-h-[180px] sm:min-h-[220px] lg:min-h-[260px] flex items-center justify-center">
            {safeTexts.map((text, idx) => {
              const segment = 1 / total;
              const start = idx * segment;
              const fadeInEnd = start + segment * 0.25;
              const fadeOutStart = start + segment * 0.75;
              const end = (idx + 1) * segment;

              let opacity = 0;
              let translateY = 35;

              if (scrollProgress >= start && scrollProgress < fadeInEnd) {
                const p = (scrollProgress - start) / (fadeInEnd - start);
                opacity = p;
                translateY = 35 * (1 - p);
              } else if (scrollProgress >= fadeInEnd && scrollProgress <= fadeOutStart) {
                opacity = 1;
                translateY = 0;
              } else if (scrollProgress > fadeOutStart && scrollProgress <= end) {
                const p = (scrollProgress - fadeOutStart) / (end - fadeOutStart);
                opacity = 1 - p;
                translateY = -35 * p;
              } else if (scrollProgress < start) {
                opacity = 0;
                translateY = 35;
              } else {
                opacity = 0;
                translateY = -35;
              }

              // Chỉ render active và lân cận để tối ưu DOM
              const isRelevant = Math.abs(idx - activeIndex) <= 1;
              if (!isRelevant && opacity === 0) return null;

              return (
                <div
                  key={idx}
                  style={{
                    opacity,
                    transform: `translate3d(0, ${translateY}px, 0)`,
                    transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                    color: textColor
                  }}
                  className="absolute inset-0 flex items-center justify-center px-4 sm:px-10 pointer-events-none"
                >
                  <p className="font-serif text-[22px] sm:text-[32px] lg:text-[40px] leading-[1.38] sm:leading-[1.4] tracking-tight font-medium max-w-3xl drop-shadow-sm text-balance">
                    {text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Gợi ý cuộn nhẹ ở dưới */}
          <div className="mt-8 sm:mt-12 flex items-center gap-2 text-white/50 text-[11px] sm:text-[12px] font-medium tracking-wider uppercase">
            <span className="material-symbols-outlined text-[16px] animate-bounce text-[#ffd985]">
              expand_more
            </span>
            <span>Cuộn tiếp để khám phá các khu nghỉ dưỡng</span>
          </div>
        </div>

        {/* THANH TIẾN TRÌNH DƯỚI ĐÁY (MOBILE) */}
        {isMobile && (
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 z-20 px-4">
            {safeTexts.map((_, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  className="h-6 flex items-center px-0.5 focus:outline-none"
                  aria-label={`Đoạn ${idx + 1}`}
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      isActive ? 'w-6 h-1.5' : 'w-2 h-1'
                    }`}
                    style={{
                      backgroundColor: isActive ? accentColor : inactiveDotColor
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

