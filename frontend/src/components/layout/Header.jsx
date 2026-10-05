import React, { useState, useEffect } from 'react';

/**
 * Component Header / Navbar dùng chung cho toàn bộ dự án Grand Horizon
 * Tích hợp hiệu ứng cuộn trang thông minh (tự ẩn khi cuộn xuống, hiện khi cuộn lên),
 * Wishlist counter, User profile và Mobile Drawer.
 */
const Header = ({ wishlistCount = 0, onWishlistClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTop ? 'bg-[#fafaf8]/95 backdrop-blur-md shadow-none border-b border-[#dedad0]/60' : 'bg-[#fafaf8]/98 backdrop-blur-xl shadow-[0_2px_15px_rgba(32,48,68,0.08)] border-b border-[#dedad0]'}`}>
      <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-7xl mx-auto gap-3 sm:gap-6">

        {/* Brand Logo & Tagline */}
        <a href="#trang-chu" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-[#203044] flex items-center justify-center text-[#b9a277] shadow-[0_4px_12px_rgba(32,48,68,0.25)] group-hover:scale-105 group-hover:bg-[#b9a277] group-hover:text-white transition-all duration-300 shrink-0">
            <span className="material-symbols-outlined text-[24px]">hotel</span>
          </div>
          <div className="flex flex-col shrink-0">
            <span className="font-serif font-bold text-[17px] sm:text-[19px] text-[#203044] tracking-tight leading-tight group-hover:text-[#b9a277] transition-colors whitespace-nowrap">
              Grand Horizon
            </span>
            <span className="text-[10px] sm:text-[10.5px] text-[#b9a277] uppercase tracking-widest font-bold whitespace-nowrap">
              Hotels &amp; Resorts
            </span>
          </div>
        </a>

        {/* Navigation Menu for Desktop */}
        <nav className="hidden xl:flex items-center gap-5 2xl:gap-7 shrink-0 mx-auto">
          <a className="text-[13.5px] font-semibold text-[#203044] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trang-chu">
            Trang Chủ
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#room-collection">
            Bộ Sưu Tập Phòng
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#uu-dai">
            Gói Ưu Đãi
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trai-nghiem">
            Dịch Vụ &amp; Tiện Ích
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#am-thuc">
            Ẩm Thực
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#hoi-vien">
            Hội Viên Elite
          </a>
          <a className="text-[13.5px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#faq">
            FAQ
          </a>
        </nav>

        {/* Right CTA & Account Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
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
            className="relative w-9 h-9 rounded-xl bg-white border border-[#dedad0] hover:border-[#b9a277] text-[#203044] hover:text-rose-500 flex items-center justify-center transition-all shadow-xs"
            title="Danh sách phòng yêu thích"
          >
            <span className={`material-symbols-outlined text-[19px] ${wishlistCount > 0 ? 'text-rose-500 fill-current' : ''}`}>
              favorite
            </span>
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                {wishlistCount}
              </span>
            )}
          </a>

          {/* Đặt Phòng Button */}
          <a
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-[#b9a277] text-white rounded-xl text-[13px] font-bold hover:bg-[#a68e64] transition-all shadow-[0_4px_14px_rgba(185,162,119,0.35)] hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            href="#room-collection"
          >
            Đặt Phòng Ngay
          </a>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#dedad0] shrink-0">
            <div className="hidden lg:flex flex-col text-right shrink-0">
              <span className="text-[12px] text-[#203044] font-bold leading-tight whitespace-nowrap">Nguyễn Văn An</span>
              <span className="text-[10px] text-[#b9a277] font-bold uppercase tracking-wider whitespace-nowrap">Hội viên Elite</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#203044] text-[#b9a277] flex items-center justify-center font-bold text-[12px] shadow-sm shrink-0 border border-[#b9a277]/40">
              VA
            </div>
          </div>

          {/* Hamburger button for Tablet & Mobile (< 1280px) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-9 h-9 rounded-xl bg-white border border-[#dedad0] flex items-center justify-center text-[#203044] hover:text-[#b9a277] transition-colors shrink-0 shadow-xs"
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
              <span>Trang Chủ</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#room-collection">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">meeting_room</span>
              <span>Bộ Sưu Tập Phòng</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#uu-dai">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">loyalty</span>
              <span>Gói Ưu Đãi &amp; Khuyến Mãi</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#trai-nghiem">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">spa</span>
              <span>Dịch Vụ &amp; Tiện Ích</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#am-thuc">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">restaurant</span>
              <span>Ẩm Thực Fine Dining</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#hoi-vien">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">stars</span>
              <span>Ưu Đãi Hội Viên Elite</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#faq">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">help_outline</span>
              <span>Câu Hỏi Thường Gặp (FAQ)</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a className="text-[13px] text-[#203044] font-semibold flex items-center gap-1.5" href="tel:19006868">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px]">support_agent</span>
              <span>Hotline 24/7: 1900 6868</span>
            </a>
            <span className="text-[12px] text-[#8a8782] font-medium">🇻🇳 Tiếng Việt</span>
          </div>

          <div className="pt-2 sm:hidden">
            <a
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full h-11 bg-[#b9a277] hover:bg-[#a68e64] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md transition-all"
              href="#room-collection"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Đặt Phòng Ngay</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
