import React from 'react';

const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 w-full px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-md">
          <div className="w-11 h-11 rounded-lg bg-secondary-container/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[26px]">spa</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-tight">Grand Horizon</span>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Resort &amp; Suites</span>
          </div>
        </div>
        <nav className="hidden xl:flex items-center gap-space-lg" data-active-classes="text-secondary font-title-md">
          <a className="font-title-md text-title-md text-on-surface-variant hover:text-secondary transition-colors" data-path="trang-chu" href="#">Trang Chủ</a>
          <a className="font-title-md text-title-md text-on-surface-variant hover:text-secondary transition-colors" data-path="kham-pha-phong" href="#">Khám Phá Phòng</a>
          <a className="font-title-md text-title-md text-on-surface-variant hover:text-secondary transition-colors" data-path="dich-vu-tien-ich" href="#">Dịch Vụ &amp; Tiện Ích</a>
          <a className="font-title-md text-title-md text-on-surface-variant hover:text-secondary transition-colors" data-path="am-thuc-fb" href="#">Ẩm Thực F&amp;B</a>
          <a className="font-title-md text-title-md text-on-surface-variant hover:text-secondary transition-colors" data-path="uu-dai-hoi-vien" href="#">Ưu Đãi &amp; Hội Viên</a>
        </nav>
        <div className="flex items-center gap-space-md">
          <button className="hidden lg:flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface transition-colors py-space-xs px-space-sm rounded" type="button">
            <span className="font-label-md text-label-md">🇻🇳 VN</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
          <a className="hidden 2xl:flex items-center gap-space-xs text-on-surface-variant hover:text-secondary transition-colors px-space-sm" href="tel:19006868">
            <span className="material-symbols-outlined text-[18px] text-secondary">support_agent</span>
            <span className="font-label-md text-label-md">1900 6868</span>
          </a>
          <a className="hidden sm:inline-flex items-center justify-center px-space-lg py-space-sm bg-secondary text-on-secondary rounded-lg font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-[0_2px_8px_rgba(114,91,56,0.18)]" data-path="dat-phong-ngay" href="#">Đặt Phòng Ngay</a>
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Nguyễn Văn An</span>
              <span className="font-label-sm text-label-sm text-secondary">Hội viên Gold</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
