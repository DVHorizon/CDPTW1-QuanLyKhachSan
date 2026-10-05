import React, { useState, useEffect } from 'react';

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isTop, setIsTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsTop(currentScrollY < 20);
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTop ? 'bg-black/20 backdrop-blur-md shadow-none' : 'bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]'}`}>
      <div className="h-20 w-full px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-md">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${isTop ? 'bg-white/20' : 'bg-secondary-container/40'}`}>
            <span className={`material-symbols-outlined text-[26px] transition-colors ${isTop ? 'text-white' : 'text-secondary'}`}>spa</span>
          </div>
          <div className="flex flex-col">
            <span className={`font-headline-sm text-headline-sm tracking-tight leading-tight transition-colors ${isTop ? 'text-white' : 'text-on-surface'}`}>Grand Horizon</span>
            <span className={`font-label-sm text-label-sm uppercase tracking-widest transition-colors ${isTop ? 'text-white/90' : 'text-secondary'}`}>Resort &amp; Suites</span>
          </div>
        </div>
        <nav className="hidden xl:flex items-center gap-space-lg">
          <a className={`font-title-md text-title-md transition-colors ${isTop ? 'text-white/90 hover:text-white' : 'text-on-surface-variant hover:text-secondary'}`} data-path="trang-chu" href="#">Trang Chủ</a>
          <a className={`font-title-md text-title-md transition-colors ${isTop ? 'text-white/90 hover:text-white' : 'text-on-surface-variant hover:text-secondary'}`} data-path="kham-pha-phong" href="#">Khám Phá Phòng</a>
          <a className={`font-title-md text-title-md transition-colors ${isTop ? 'text-white/90 hover:text-white' : 'text-on-surface-variant hover:text-secondary'}`} data-path="dich-vu-tien-ich" href="#">Dịch Vụ &amp; Tiện Ích</a>
          <a className={`font-title-md text-title-md transition-colors ${isTop ? 'text-white/90 hover:text-white' : 'text-on-surface-variant hover:text-secondary'}`} data-path="am-thuc-fb" href="#">Ẩm Thực F&amp;B</a>
          <a className={`font-title-md text-title-md transition-colors ${isTop ? 'text-white/90 hover:text-white' : 'text-on-surface-variant hover:text-secondary'}`} data-path="uu-dai-hoi-vien" href="#">Ưu Đãi &amp; Hội Viên</a>
        </nav>
        <div className="flex items-center gap-space-md">
          <a className={`hidden 2xl:flex items-center gap-space-xs transition-colors px-space-sm ${isTop ? 'text-white hover:text-white/80' : 'text-on-surface-variant hover:text-secondary'}`} href="tel:19006868">
            <span className={`material-symbols-outlined text-[18px] transition-colors ${isTop ? 'text-white' : 'text-secondary'}`}>support_agent</span>
            <span className="font-label-md text-label-md">1900 6868</span>
          </a>
          <a className={`hidden sm:inline-flex items-center justify-center px-space-lg py-space-sm rounded-lg font-label-lg text-label-lg transition-all ${isTop ? 'bg-white text-secondary hover:bg-white/90 shadow-lg' : 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container shadow-[0_2px_8px_rgba(114,91,56,0.18)]'}`} data-path="dat-phong-ngay" href="#">Đặt Phòng Ngay</a>
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="hidden md:flex flex-col text-right">
              <span className={`font-label-md text-label-md font-semibold transition-colors ${isTop ? 'text-white' : 'text-on-surface'}`}>Nguyễn Văn An</span>
              <span className={`font-label-sm text-label-sm transition-colors ${isTop ? 'text-white/90' : 'text-secondary'}`}>Hội viên Gold</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isTop ? 'bg-white/20' : 'bg-primary'}`}>
              <span className={`material-symbols-outlined text-[18px] transition-colors ${isTop ? 'text-white' : 'text-on-primary'}`}>person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
