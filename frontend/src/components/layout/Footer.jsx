import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Component Footer dùng chung cho toàn bộ dự án Grand Horizon
 * Cung cấp thông tin thương hiệu, danh mục liên kết, chi nhánh liên hệ và phương thức thanh toán
 */
const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#fbf8f2] text-[#373435] pt-14 pb-8 border-t border-[#dedad0]">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          
          {/* Brand Info & Vision (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#203044] flex items-center justify-center text-[#b9a277] shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[24px]">hotel</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-[21px] sm:text-[22px] text-[#203044] leading-tight">
                  Grand Horizon
                </span>
                <span className="text-[11.5px] text-[#b9a277] uppercase tracking-widest font-bold">
                  Hotels &amp; Resorts
                </span>
              </div>
            </div>
            
            <p className="text-[15px] sm:text-[15.5px] text-[#373435]/85 leading-relaxed max-w-sm">
              Chuỗi khách sạn và biệt thự nghỉ dưỡng ven biển cao cấp chuẩn 5 sao quốc tế. Kiến tạo không gian tĩnh tại thuần khiết, ẩm thực tinh hoa và dịch vụ tận tâm cho mỗi hành trình thăng hoa.
            </p>
            
            <div className="flex items-center gap-3 text-[#b9a277] pt-1">
              <span className="material-symbols-outlined text-[22px]">award_star</span>
              <span className="material-symbols-outlined text-[22px]">verified</span>
              <span className="material-symbols-outlined text-[22px]">hotel_class</span>
              <span className="text-[13.5px] text-[#203044] font-semibold">Top Luxury Resorts Vietnam 2026</span>
            </div>
          </div>

          {/* Quick Links (col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h3 className="text-[14.5px] sm:text-[15px] font-bold text-[#203044] uppercase tracking-wider mb-1">
              Khám Phá
            </h3>
            <Link className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" to="/">Trang Chủ</Link>
            <Link className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" to="/hotels">Khách Sạn &amp; Resort</Link>
            <a className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#uu-dai">Gói Ưu Đãi</a>
            <a className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#trai-nghiem">Dịch Vụ &amp; Tiện Ích</a>
            <a className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#am-thuc">Ẩm Thực</a>
            <a className="text-[14.5px] sm:text-[15px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#hoi-vien">Hội Viên Elite</a>
          </div>

          {/* Contact Details (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h3 className="text-[14.5px] sm:text-[15px] font-bold text-[#203044] uppercase tracking-wider mb-1">
              Điểm Đến &amp; Liên Hệ
            </h3>
            <p className="text-[14.5px] sm:text-[15px] text-[#373435]/90 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px] shrink-0 mt-0.5">location_on</span>
              <span>Hệ thống tại Phú Quốc, Cam Ranh, Đà Nẵng, Hạ Long &amp; toàn quốc</span>
            </p>
            <p className="text-[14.5px] sm:text-[15px] text-[#373435]/90 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px] shrink-0">mail</span>
              <span>concierge@grandhorizon.vn</span>
            </p>
            <p className="text-[14.5px] sm:text-[15px] text-[#373435]/90 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[20px] shrink-0">call</span>
              <span>Tổng đài: 1900 6868 - (028) 7300 8888</span>
            </p>
            <div className="pt-2">
              <span className="text-[13px] text-[#8a8782] block mb-1">Giờ tiếp nhận hỗ trợ:</span>
              <span className="text-[14px] font-bold text-[#203044]">Phục vụ 24/7 không ngày nghỉ</span>
            </div>
          </div>

          {/* Security & Payment (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-3.5">
            <h3 className="text-[14.5px] sm:text-[15px] font-bold text-[#203044] uppercase tracking-wider">
              Bảo Mật &amp; Thanh Toán
            </h3>
            <p className="text-[14.5px] text-[#373435]/85 leading-relaxed">
              Giao dịch trực tuyến được mã hóa bảo mật chuẩn SSL 256-bit và PCI-DSS quốc tế.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* VietQR */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dedad0] rounded-lg shadow-xs hover:border-[#b9a277] transition-all">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="8" height="8" rx="2" stroke="#005BAA" strokeWidth="2" />
                  <rect x="5" y="5" width="2" height="2" fill="#005BAA" />
                  <rect x="14" y="2" width="8" height="8" rx="2" stroke="#ED1C24" strokeWidth="2" />
                  <rect x="17" y="5" width="2" height="2" fill="#ED1C24" />
                  <rect x="2" y="14" width="8" height="8" rx="2" stroke="#ED1C24" strokeWidth="2" />
                  <rect x="5" y="17" width="2" height="2" fill="#ED1C24" />
                  <rect x="14" y="14" width="3" height="3" fill="#005BAA" />
                  <rect x="19" y="14" width="3" height="3" fill="#ED1C24" />
                  <rect x="14" y="19" width="3" height="3" fill="#ED1C24" />
                  <rect x="19" y="19" width="3" height="3" fill="#005BAA" />
                </svg>
                <span className="text-[12px] font-bold text-[#005BAA]">
                  Viet<span className="text-[#ED1C24]">QR</span>
                </span>
              </span>

              {/* VNPAY */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dedad0] rounded-lg shadow-xs hover:border-[#b9a277] transition-all">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h7l4 10-3 3-8-13z" fill="#ED1C24" />
                  <path d="M12 4h6l4 14h-5l-5-14z" fill="#005BAA" />
                </svg>
                <span className="text-[12px] font-bold text-[#005BAA]">
                  VN<span className="text-[#ED1C24]">PAY</span>
                </span>
              </span>

              {/* MoMo */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dedad0] rounded-lg shadow-xs hover:border-[#b9a277] transition-all">
                <svg className="w-4 h-4 shrink-0 rounded-[4px]" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="5" fill="#A50064" />
                  <circle cx="8" cy="12" r="3.2" stroke="#FFFFFF" strokeWidth="1.6" />
                  <circle cx="16" cy="12" r="3.2" stroke="#FFFFFF" strokeWidth="1.6" />
                  <circle cx="8" cy="12" r="1.1" fill="#FFFFFF" />
                  <circle cx="16" cy="12" r="1.1" fill="#FFFFFF" />
                </svg>
                <span className="text-[12px] font-bold text-[#A50064]">
                  MoMo
                </span>
              </span>

              {/* VISA / Master */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#dedad0] rounded-lg shadow-xs hover:border-[#b9a277] transition-all">
                <span className="font-serif italic font-extrabold text-[12.5px] text-[#1434CB] tracking-tight leading-none">
                  VISA
                </span>
                <span className="text-slate-300 text-xs">/</span>
                <svg className="w-5 h-3.5 shrink-0" viewBox="0 0 32 20" fill="none">
                  <circle cx="10" cy="10" r="9" fill="#EB001B" />
                  <circle cx="22" cy="10" r="9" fill="#F79E1B" />
                  <path d="M16 4.3a9 9 0 000 11.4 9 9 0 000-11.4z" fill="#FF5F00" />
                </svg>
                <span className="text-[12px] font-bold text-[#203044]">
                  Master
                </span>
              </span>
            </div>

            <div className="pt-3">
              <button 
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 text-[14px] font-bold text-[#b9a277] hover:text-[#203044] transition-colors cursor-pointer group"
                type="button"
              >
                <span>Về đầu trang</span>
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-y-1 transition-transform">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Terms */}
        <div className="pt-6 border-t border-[#dedad0] flex flex-col md:flex-row items-center justify-between gap-4 text-[13.5px] text-[#8a8782]">
          <span>© 2026 Grand Horizon Hotels &amp; Resorts. Refined for every journey. Bảo lưu mọi quyền.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#203044] transition-colors">Điều khoản dịch vụ</a>
            <span>•</span>
            <a href="#" className="hover:text-[#203044] transition-colors">Chính sách bảo mật</a>
            <span>•</span>
            <a href="#" className="hover:text-[#203044] transition-colors">Chính sách hoàn hủy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
