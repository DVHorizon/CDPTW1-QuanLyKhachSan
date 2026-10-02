import React, { useState } from 'react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#fafaf8]/95 backdrop-blur-xl border-b border-[#dedad0]/60 shadow-[0_1px_10px_rgba(32,48,68,0.05)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-7xl mx-auto gap-3 sm:gap-6">
        {/* Brand Logo & Tagline */}
        <a href="#" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-sm bg-[#203044] flex items-center justify-center text-[#b9a277] shadow-[0_2px_8px_rgba(32,48,68,0.2)] group-hover:scale-105 transition-transform shrink-0">
            <span className="material-symbols-outlined text-[24px]">hotel</span>
          </div>
          <div className="flex flex-col shrink-0">
            <span className="font-bold text-[16px] sm:text-[18px] text-[#203044] tracking-tight leading-tight group-hover:text-[#b9a277] transition-colors whitespace-nowrap">
              Grand Horizon
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#b9a277] uppercase tracking-wider font-semibold whitespace-nowrap">
              Hotels &amp; Resorts
            </span>
          </div>
        </a>

        {/* Navigation Menu for Desktop (≥ 1200px) */}
        <nav className="hidden xl:flex items-center gap-5 2xl:gap-7 shrink-0 mx-auto">
          <a className="text-[13px] 2xl:text-[14px] font-semibold text-[#203044] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trang-chu">Trang Chủ</a>
          <a className="text-[13px] 2xl:text-[14px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#room-collection">Bộ Sưu Tập Phòng</a>
          <a className="text-[13px] 2xl:text-[14px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#trai-nghiem">Dịch Vụ &amp; Tiện Ích</a>
          <a className="text-[13px] 2xl:text-[14px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#am-thuc">Ẩm Thực Fine Dining</a>
          <a className="text-[13px] 2xl:text-[14px] font-medium text-[#373435] hover:text-[#b9a277] transition-colors whitespace-nowrap" href="#hoi-vien">Ưu Đãi Hội Viên</a>
        </nav>

        {/* Right CTA & Account Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button className="hidden 2xl:flex items-center gap-1 text-[#373435] hover:text-[#203044] transition-colors py-1 px-2 rounded-xs text-[12px] font-medium whitespace-nowrap shrink-0" type="button">
            <span className="whitespace-nowrap">🇻🇳 VN</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
          
          <a className="hidden 2xl:flex items-center gap-1.5 text-[#373435] hover:text-[#b9a277] transition-colors px-1 text-[13px] font-semibold whitespace-nowrap shrink-0" href="tel:19006868">
            <span className="material-symbols-outlined text-[18px] text-[#b9a277]">support_agent</span>
            <span>1900 6868</span>
          </a>

          <a 
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-[#b9a277] text-white rounded-sm text-[13px] font-semibold hover:bg-[#a68e64] transition-all shadow-[0_4px_14px_rgba(185,162,119,0.35)] hover:-translate-y-0.5 whitespace-nowrap shrink-0" 
            href="#room-collection"
          >
            Đặt Phòng Ngay
          </a>

          <div className="flex items-center gap-2 pl-2 border-l border-[#dedad0] shrink-0">
            <div className="hidden lg:flex flex-col text-right shrink-0">
              <span className="text-[12px] text-[#203044] font-semibold leading-tight whitespace-nowrap">Nguyễn Văn An</span>
              <span className="text-[10px] text-[#b9a277] font-bold uppercase tracking-wider whitespace-nowrap">Hội viên Elite</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#203044] text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>

          {/* Hamburger button for Tablet & Mobile (< 1280px) */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-9 h-9 rounded-sm bg-white border border-[#dedad0] flex items-center justify-center text-[#203044] hover:text-[#b9a277] transition-colors shrink-0"
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
          <div className="flex flex-col gap-2 pb-4 border-b border-[#dedad0]">
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-semibold text-[#203044] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#trang-chu">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">home</span>
              <span>Trang Chủ</span>
            </a>
            <a onClick={() => setIsMobileMenuOpen(false)} className="text-[14px] font-medium text-[#373435] hover:text-[#b9a277] py-2 flex items-center gap-2.5 transition-colors" href="#room-collection">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px]">meeting_room</span>
              <span>Bộ Sưu Tập Phòng</span>
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
              <span>Ưu Đãi Hội Viên</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a className="text-[13px] text-[#203044] font-semibold flex items-center gap-1.5" href="tel:19006868">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px]">support_agent</span>
              <span>Hotline: 1900 6868</span>
            </a>
            <span className="text-[12px] text-[#8a8782] font-medium">🇻🇳 Tiếng Việt</span>
          </div>

          <div className="pt-2 sm:hidden">
            <a 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full h-11 bg-[#b9a277] hover:bg-[#a68e64] text-white rounded-sm text-[14px] font-semibold flex items-center justify-center gap-2 shadow-md transition-all" 
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

export default Navbar;
