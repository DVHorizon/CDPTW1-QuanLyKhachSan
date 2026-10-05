import React from 'react';

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
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 mb-12">
          
          {/* Brand Info & Vision (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#203044] flex items-center justify-center text-[#b9a277] shadow-sm">
                <span className="material-symbols-outlined text-[22px]">hotel</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-[19px] text-[#203044] leading-tight">
                  Grand Horizon
                </span>
                <span className="text-[10.5px] text-[#b9a277] uppercase tracking-widest font-bold">
                  Hotels &amp; Resorts
                </span>
              </div>
            </div>
            
            <p className="text-[13.5px] text-[#373435]/80 leading-relaxed max-w-sm">
              Chuỗi khách sạn và biệt thự nghỉ dưỡng ven biển cao cấp chuẩn 5 sao quốc tế. Kiến tạo không gian tĩnh tại thuần khiết, ẩm thực tinh hoa và dịch vụ tận tâm cho mỗi hành trình thăng hoa.
            </p>
            
            <div className="flex items-center gap-3 text-[#b9a277] pt-1">
              <span className="material-symbols-outlined text-[20px]">award_star</span>
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span className="material-symbols-outlined text-[20px]">hotel_class</span>
              <span className="text-[12px] text-[#203044] font-semibold">Top Luxury Resorts Vietnam 2026</span>
            </div>
          </div>

          {/* Quick Links (col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-2.5">
            <h3 className="text-[13px] font-bold text-[#203044] uppercase tracking-wider mb-1">
              Khám Phá
            </h3>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#trang-chu">Trang chủ</a>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#room-collection">Bộ sưu tập phòng</a>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#uu-dai">Gói khuyến mãi</a>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#trai-nghiem">Dịch vụ Spa &amp; Yoga</a>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#am-thuc">Ẩm thực The Azure</a>
            <a className="text-[13.5px] text-[#373435]/80 hover:text-[#b9a277] transition-colors" href="#faq">Câu hỏi thường gặp</a>
          </div>

          {/* Contact Details (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-2.5">
            <h3 className="text-[13px] font-bold text-[#203044] uppercase tracking-wider mb-1">
              Điểm Đến &amp; Liên Hệ
            </h3>
            <p className="text-[13.5px] text-[#373435]/85 flex items-start gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0 mt-0.5">location_on</span>
              <span>Hệ thống tại Phú Quốc, Cam Ranh, Đà Nẵng &amp; Hạ Long</span>
            </p>
            <p className="text-[13.5px] text-[#373435]/85 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0">mail</span>
              <span>concierge@grandhorizon.vn</span>
            </p>
            <p className="text-[13.5px] text-[#373435]/85 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0">call</span>
              <span>Tổng đài: 1900 6868 - (028) 7300 8888</span>
            </p>
            <div className="pt-2">
              <span className="text-[12px] text-[#8a8782] block mb-1">Giờ tiếp nhận hỗ trợ:</span>
              <span className="text-[12.5px] font-semibold text-[#203044]">Phục vụ 24/7 không ngày nghỉ</span>
            </div>
          </div>

          {/* Security & Payment (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h3 className="text-[13px] font-bold text-[#203044] uppercase tracking-wider">
              Bảo Mật &amp; Thanh Toán
            </h3>
            <p className="text-[13px] text-[#373435]/80">
              Giao dịch trực tuyến được mã hóa bảo mật chuẩn SSL 256-bit và PCI-DSS quốc tế.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 bg-white border border-[#dedad0] rounded-lg text-[11px] font-bold text-[#203044] shadow-xs">
                VietQR
              </span>
              <span className="px-3 py-1 bg-white border border-[#dedad0] rounded-lg text-[11px] font-bold text-[#203044] shadow-xs">
                VNPAY
              </span>
              <span className="px-3 py-1 bg-white border border-[#dedad0] rounded-lg text-[11px] font-bold text-[#203044] shadow-xs">
                MoMo
              </span>
              <span className="px-3 py-1 bg-white border border-[#dedad0] rounded-lg text-[11px] font-bold text-[#203044] shadow-xs">
                VISA / Master
              </span>
            </div>

            <div className="pt-3">
              <button 
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#b9a277] hover:text-[#203044] transition-colors"
                type="button"
              >
                <span>Về đầu trang</span>
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Terms */}
        <div className="pt-6 border-t border-[#dedad0] flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[#8a8782]">
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
