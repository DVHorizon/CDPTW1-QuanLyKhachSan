import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-[#fbf8f2] text-[#373435] pt-12 pb-8 border-t border-[#dedad0]/80">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#203044] flex items-center justify-center text-[#b9a277]">
                <span className="material-symbols-outlined text-[20px]">hotel</span>
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-bold text-[18px] text-[#203044] leading-tight">Grand Horizon Hotels &amp; Resorts</span>
                <span className="font-sans text-[11px] text-[#b9a277] uppercase tracking-wider font-semibold">Refined for every journey</span>
              </div>
            </div>
            <p className="text-[14px] text-[#373435]/80 leading-relaxed max-w-sm">
              Chuỗi khách sạn và biệt thự nghỉ dưỡng cao cấp chuẩn mực quốc tế. Trải nghiệm lưu trú tĩnh tại, ẩm thực tinh hoa và dịch vụ chu đáo tinh tế cho mỗi hành trình.
            </p>
            <div className="flex items-center gap-3 text-[#b9a277]">
              <span className="material-symbols-outlined text-[20px]">award_star</span>
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span className="material-symbols-outlined text-[20px]">hotel_class</span>
              <span className="text-[12px] text-[#203044] font-medium">Chứng nhận Dịch Vụ Xuất Sắc 2024</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 flex flex-col gap-2.5">
            <h3 className="text-[14px] font-bold text-[#203044] uppercase tracking-wider mb-1">Khám Phá</h3>
            <a className="text-[14px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="https://grandhorizon.vn" target="_blank" rel="noopener noreferrer">Về chúng tôi</a>
            <a className="text-[14px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#">Chính sách &amp; Hủy phòng</a>
            <a className="text-[14px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#">Quy định lưu trú</a>
            <a className="text-[14px] text-[#373435]/85 hover:text-[#b9a277] transition-colors" href="#">Tuyển dụng tài năng</a>
          </div>

          {/* Contact Details */}
          <div className="lg:col-span-3 flex flex-col gap-2.5">
            <h3 className="text-[14px] font-bold text-[#203044] uppercase tracking-wider mb-1">Liên Hệ</h3>
            <p className="text-[14px] text-[#373435]/85 flex items-start gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0 mt-0.5">location_on</span>
              Hệ thống Grand Horizon tại Phú Quốc, Cam Ranh, Đà Nẵng
            </p>
            <p className="text-[14px] text-[#373435]/85 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0">mail</span>
              concierge@grandhorizon.vn
            </p>
            <p className="text-[14px] text-[#373435]/85 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px] shrink-0">call</span>
              Hotline: 1900 6868 - (028) 7300 8888
            </p>
            <p className="text-[12px] text-[#8a8782] mt-1">Website chính thức: https://grandhorizon.vn</p>
          </div>

          {/* Security & Payment */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h3 className="text-[14px] font-bold text-[#203044] uppercase tracking-wider">Bảo Mật &amp; Thanh Toán</h3>
            <p className="text-[13px] text-[#373435]/80">Cổng giao dịch mã hóa chuẩn SSL 256-bit và PCI-DSS quốc tế.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-white border border-[#dedad0] rounded-xs text-[11px] font-semibold text-[#203044]">VietQR</span>
              <span className="px-2.5 py-1 bg-white border border-[#dedad0] rounded-xs text-[11px] font-semibold text-[#203044]">VISA</span>
              <span className="px-2.5 py-1 bg-white border border-[#dedad0] rounded-xs text-[11px] font-semibold text-[#203044]">Mastercard</span>
              <span className="px-2.5 py-1 bg-white border border-[#dedad0] rounded-xs text-[11px] font-semibold text-[#203044]">VNPAY</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#dedad0]/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-[#8a8782]">
          <span>© 2026 Grand Horizon Hotels &amp; Resorts. Refined for every journey. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#203044] transition-colors">Điều khoản dịch vụ</a>
            <span>•</span>
            <a href="#" className="hover:text-[#203044] transition-colors">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
