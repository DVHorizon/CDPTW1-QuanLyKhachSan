import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full bg-surface-container-lowest text-on-surface-variant pt-space-xl pb-space-lg shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
      <div className="w-full px-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter mb-space-xl">
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[22px]">spa</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Grand Horizon</span>
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Resort &amp; Suites</span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Khu nghỉ dưỡng sang trọng bậc nhất bên bờ đại dương nguyên sơ. Trải nghiệm đặc quyền nghỉ dưỡng thanh bình, ẩm thực thượng hạng và phong cách sống thượng lưu đẳng cấp 5 sao quốc tế.
            </p>
            <div className="flex items-center gap-space-md text-secondary">
              <span className="material-symbols-outlined text-[20px]">award_star</span>
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span className="material-symbols-outlined text-[20px]">hotel_class</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Chứng nhận Travelers' Choice 2024</span>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface uppercase tracking-wider mb-space-xs">Khám Phá</h3>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" data-path="ve-chung-toi" href="#">Về chúng tôi</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" data-path="chinh-sach-dat-phong-va-huy-phong" href="#">Chính sách &amp; Hủy phòng</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" data-path="quy-dinh-luu-tru" href="#">Quy định lưu trú</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-secondary transition-colors" data-path="tuyen-dung" href="#">Tuyển dụng</a>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface uppercase tracking-wider mb-space-xs">Liên Hệ</h3>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-start gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">location_on</span>Bãi Dài, Bán Đảo Cam Ranh &amp; Phú Quốc, Việt Nam
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">mail</span>concierge@grandhorizonresort.com
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">call</span>Hotline: 1900 6868 - (0258) 398 8888
            </p>
            <p className="font-label-sm text-label-sm text-outline mt-space-xs">GPKD Lữ Hành Quốc Tế: 79-888/2022/TCDL-GP</p>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-space-md">
            <h3 className="font-title-md text-title-md text-on-surface uppercase tracking-wider">Bảo Mật &amp; Thanh Toán</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Cổng giao dịch mã hóa 256-bit chuẩn PCI-DSS quốc tế.</p>
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="px-space-sm py-space-xs bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface font-semibold">VietQR</span>
              <span className="px-space-sm py-space-xs bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface font-semibold">VISA</span>
              <span className="px-space-sm py-space-xs bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface font-semibold">Mastercard</span>
              <span className="px-space-sm py-space-xs bg-surface-container-low rounded font-label-sm text-label-sm text-on-surface font-semibold">VNPAY</span>
            </div>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <span className="font-body-sm text-body-sm text-outline">© 2024 Grand Horizon Resort &amp; Suites. Bản quyền thuộc về Tập đoàn Khách sạn &amp; Nghỉ dưỡng Grand Horizon.</span>
          <div className="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
            <a className="hover:text-secondary transition-colors" data-path="chinh-sach-bao-mat" href="#">Chính sách bảo mật</a>
            <span className="">•</span>
            <a className="hover:text-secondary transition-colors" data-path="dieu-khoan-su-dung" href="#">Điều khoản sử dụng</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
