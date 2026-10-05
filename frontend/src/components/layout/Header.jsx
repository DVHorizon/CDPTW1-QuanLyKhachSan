import React, { useState, useEffect, useRef } from 'react';

/**
 * Từ điển ngôn ngữ cho thanh Header
 */
const I18N = {
  vi: {
    home: 'Trang Chủ',
    rooms: 'Bộ Sưu Tập Phòng',
    offers: 'Gói Ưu Đãi',
    amenities: 'Dịch Vụ & Tiện Ích',
    dining: 'Ẩm Thực',
    elite: 'Hội Viên Elite',
    faq: 'FAQ',
    bookNow: 'Đặt Phòng Ngay',
    memberTitle: 'Hội viên Elite',
    hotline: 'Hotline: 1900 6868',
    wishlistTitle: 'Danh sách phòng yêu thích'
  },
  en: {
    home: 'Home',
    rooms: 'Rooms & Suites',
    offers: 'Special Offers',
    amenities: 'Amenities',
    dining: 'Dining',
    elite: 'Elite Club',
    faq: 'FAQ',
    bookNow: 'Book Now',
    memberTitle: 'Elite Member',
    hotline: 'Hotline: 1900 6868',
    wishlistTitle: 'Saved Rooms'
  }
};

// Biểu tượng cờ Việt Nam (Vector SVG chuẩn, hiển thị sắc nét trên mọi hệ điều hành)
const FlagVN = ({ className = "w-4.5 h-3" }) => (
  <svg className={`${className} rounded-[2px] shadow-xs shrink-0 object-cover`} viewBox="0 0 30 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="30" height="20" fill="#DA251D" rx="2" />
    <polygon points="15,4 17.35,11.24 11.2,6.76 18.8,6.76 12.65,11.24" fill="#FFEB3B" />
  </svg>
);

// Biểu tượng cờ Anh / Vương Quốc Anh (Vector SVG chuẩn)
const FlagEN = ({ className = "w-4.5 h-3" }) => (
  <svg className={`${className} rounded-[2px] shadow-xs shrink-0 object-cover`} viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="uk-flag-clip">
      <rect width="60" height="30" rx="2" />
    </clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0V30M0 15H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

/**
 * Component Header / Navbar dùng chung cho toàn bộ dự án Grand Horizon
 * Tích hợp Language Switcher (VN / ENG), hiệu ứng cuộn trang thông minh,
 * Wishlist counter, User profile và Mobile Drawer.
 */
const Header = ({ wishlistCount = 0, onWishlistClick, lang: propLang, onLanguageChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isTop, setIsTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Ngôn ngữ hiện tại (mặc định 'vi')
  const [currentLang, setCurrentLang] = useState(() => {
    return propLang || localStorage.getItem('app_lang') || 'vi';
  });

  useEffect(() => {
    if (propLang && propLang !== currentLang) {
      setCurrentLang(propLang);
    }
  }, [propLang]);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLang = (lang) => {
    setCurrentLang(lang);
    localStorage.setItem('app_lang', lang);
    setIsLangOpen(false);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
    window.dispatchEvent(new CustomEvent('appLanguageChange', { detail: lang }));
  };

  const t = I18N[currentLang] || I18N.vi;

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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTop ? 'bg-[#fafaf8]/95 backdrop-blur-md shadow-none border-b border-[#dedad0]/60' : 'bg-[#fafaf8]/98 backdrop-blur-xl shadow-[0_2px_15px_rgba(32,48,68,0.08)] border-b border-[#dedad0]'}`}>
      <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-[1440px] mx-auto gap-2 lg:gap-4">

        {/* Brand Logo & Tagline */}
        <a href="#trang-chu" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#203044] flex items-center justify-center text-[#b9a277] shadow-[0_4px_12px_rgba(32,48,68,0.25)] group-hover:scale-105 group-hover:bg-[#b9a277] group-hover:text-white transition-all duration-300 shrink-0">
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">hotel</span>
          </div>
          <div className="flex flex-col shrink-0">
            <span className="font-serif font-bold text-[17px] sm:text-[18px] text-[#203044] tracking-tight leading-tight group-hover:text-[#b9a277] transition-colors whitespace-nowrap">
              Grand Horizon
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-[#b9a277] uppercase tracking-widest font-bold whitespace-nowrap">
              Hotels &amp; Resorts
            </span>
          </div>
        </a>

        {/* Navigation Menu for Desktop */}
        <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 shrink-0">
          <a className="text-[13px] font-semibold text-[#203044] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trang-chu">
            {t.home}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#room-collection">
            {t.rooms}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#uu-dai">
            {t.offers}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trai-nghiem">
            {t.amenities}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#am-thuc">
            {t.dining}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#hoi-vien">
            {t.elite}
          </a>
          <a className="text-[13px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#faq">
            {t.faq}
          </a>
        </nav>

        {/* Right CTA & Account Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Hotline */}
          <a
            className="hidden 2xl:flex items-center gap-1.5 text-[#373435] hover:text-[#b9a277] transition-colors px-2 py-1 text-[13px] font-semibold whitespace-nowrap shrink-0"
            href="tel:19006868"
          >
            <span className="material-symbols-outlined text-[18px] text-[#b9a277]">support_agent</span>
            <span>1900 6868</span>
          </a>

          {/* Wishlist Button with Counter */}
          <a
            href="#room-collection"
            onClick={onWishlistClick}
            className="relative w-9.5 h-9.5 rounded-xl bg-white border border-[#dedad0] hover:border-[#b9a277] text-[#203044] hover:text-rose-500 flex items-center justify-center transition-all shadow-xs shrink-0"
            title={t.wishlistTitle}
          >
            <span className={`material-symbols-outlined text-[20px] ${wishlistCount > 0 ? 'text-rose-500 fill-current' : ''}`}>
              favorite
            </span>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                {wishlistCount}
              </span>
            )}
          </a>

          {/* Language Selector (VN / ENG) */}
          <div className="relative shrink-0" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 h-9.5 px-3 rounded-xl bg-white border border-[#dedad0] hover:border-[#b9a277] text-[#203044] text-[13px] font-bold transition-all shadow-xs cursor-pointer select-none"
              title="Chọn ngôn ngữ / Select Language"
              type="button"
            >
              {currentLang === 'vi' ? <FlagVN /> : <FlagEN />}
              <span className="tracking-wide">{currentLang === 'vi' ? 'VN' : 'ENG'}</span>
              <span className={`material-symbols-outlined text-[17px] text-[#8a8782] transition-transform duration-200 ${isLangOpen ? 'rotate-180 text-[#b9a277]' : ''}`}>
                expand_more
              </span>
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] border border-[#dedad0] py-1.5 z-50 animate-fade-in">
                <button
                  type="button"
                  onClick={() => handleSelectLang('vi')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-left transition-colors cursor-pointer ${
                    currentLang === 'vi' ? 'bg-[#fbf8f2] text-[#b9a277] font-bold' : 'text-[#203044] hover:bg-[#fafaf8]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FlagVN />
                    <span>Tiếng Việt</span>
                  </span>
                  {currentLang === 'vi' && (
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">check</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLang('en')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-left transition-colors cursor-pointer ${
                    currentLang === 'en' ? 'bg-[#fbf8f2] text-[#b9a277] font-bold' : 'text-[#203044] hover:bg-[#fafaf8]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FlagEN />
                    <span>English</span>
                  </span>
                  {currentLang === 'en' && (
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">check</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Đặt Phòng Button */}
          <a
            className="hidden sm:inline-flex items-center justify-center h-9.5 px-4.5 bg-[#b9a277] text-white rounded-xl text-[13px] font-bold hover:bg-[#a68e64] transition-all shadow-[0_4px_14px_rgba(185,162,119,0.35)] hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            href="#room-collection"
          >
            {t.bookNow}
          </a>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-[#dedad0] shrink-0">
            <div className="hidden 2xl:flex flex-col text-right shrink-0">
              <span className="text-[12px] text-[#203044] font-bold leading-tight whitespace-nowrap">Nguyễn Văn An</span>
              <span className="text-[10px] text-[#b9a277] font-bold uppercase tracking-wider whitespace-nowrap">{t.memberTitle}</span>
            </div>
            <div className="w-8.5 h-8.5 rounded-full bg-[#203044] text-[#b9a277] flex items-center justify-center font-bold text-[12px] shadow-sm shrink-0 border border-[#b9a277]/40" title="Nguyễn Văn An - Hội viên Elite">
              VA
            </div>
          </div>

          {/* Hamburger button for Tablet & Mobile (< 1280px) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-9.5 h-9.5 rounded-xl bg-white border border-[#dedad0] flex items-center justify-center text-[#203044] hover:text-[#b9a277] transition-colors shrink-0 shadow-xs"
            type="button"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-[#fafaf8]/98 backdrop-blur-2xl border-b border-[#dedad0] shadow-2xl px-6 py-5 flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-col gap-1 pb-4 border-b border-[#dedad0]">
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#203044] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#trang-chu">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">home</span>
              <span>{t.home}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#room-collection">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">meeting_room</span>
              <span>{t.rooms}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#uu-dai">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">loyalty</span>
              <span>{t.offers}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#trai-nghiem">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">spa</span>
              <span>{t.amenities}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#am-thuc">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">restaurant</span>
              <span>{t.dining}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#hoi-vien">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">stars</span>
              <span>{t.elite}</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#faq">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">help_outline</span>
              <span>{t.faq}</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a className="text-[13px] text-[#203044] font-semibold flex items-center gap-1.5" href="tel:19006868">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px]">support_agent</span>
              <span>1900 6868</span>
            </a>

            {/* Mobile Language Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#f5f4ef] border border-[#dedad0]">
              <button
                type="button"
                onClick={() => handleSelectLang('vi')}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentLang === 'vi' ? 'bg-white text-[#203044] shadow-xs' : 'text-[#8a8782] hover:text-[#203044]'
                }`}
              >
                <FlagVN className="w-3.5 h-2.5" />
                <span>VN</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectLang('en')}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentLang === 'en' ? 'bg-white text-[#203044] shadow-xs' : 'text-[#8a8782] hover:text-[#203044]'
                }`}
              >
                <FlagEN className="w-3.5 h-2.5" />
                <span>ENG</span>
              </button>
            </div>
          </div>

          <div className="pt-2 sm:hidden">
            <a
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full h-11 bg-[#b9a277] hover:bg-[#a68e64] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md transition-all"
              href="#room-collection"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>{t.bookNow}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
