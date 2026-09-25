import React, { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

function App() {
  useEffect(() => {
    // Set min date to today for check-in
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length >= 2) {
      dateInputs[0].setAttribute('min', today);
      dateInputs[0].addEventListener('change', function() {
        dateInputs[1].setAttribute('min', this.value);
      });
    }
  }, []);

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      <Navbar />

      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          <section className="relative w-full -mt-20 pt-32 pb-24 lg:pb-32 overflow-hidden flex flex-col justify-between min-h-[942px]">
            <div 
              className="absolute inset-0 bg-cover bg-center -z-20" 
              data-alt="Ultra luxury beachfront tropical resort at twilight sunset" 
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop")' }}
            >
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-primary-container/90 via-primary-container/40 to-background -z-10"></div>
            <div className="absolute top-1/4 right-10 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
            <div className="w-full px-margin max-w-7xl mx-auto text-center flex flex-col items-center pt-8 pb-12">
              <div className="inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-lowest/85 backdrop-blur-md shadow-sm mb-space-lg animate-fade-in">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Thương Hiệu Nghỉ Dưỡng Thượng Lưu Hàng Đầu Châu Á 2024</span>
              </div>
              <h1 className="font-display-lg text-display-lg-mobile lg:text-display-lg text-surface-container-lowest tracking-tight max-w-5xl drop-shadow-md mb-space-md">
                Kỳ Nghỉ Thượng Lưu <br className="hidden sm:inline" /><span className="italic font-normal text-secondary-fixed-dim">Bên Bờ Biển</span> Thiên Đường
              </h1>
              <p className="font-body-lg text-body-lg text-surface-container-lowest max-w-2xl text-center leading-relaxed drop-shadow-md">
                Trải nghiệm dịch vụ cá nhân hóa chuẩn 5 sao quốc tế, nghệ thuật ẩm thực tinh tế và không gian tĩnh tại tuyệt đối giữa thiên nhiên nguyên sơ Cam Ranh, Phú Quốc &amp; Đà Nẵng.
              </p>
            </div>
            <div className="w-full px-margin max-w-6xl mx-auto mt-4">
              <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-xl p-space-md lg:p-space-lg">
                <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-md items-end" onSubmit={(e) => e.preventDefault()}>
                  <div className="lg:col-span-3 flex flex-col gap-space-xs">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                      Điểm Đến &amp; Chi Nhánh
                    </label>
                    <div className="relative bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
                      <select className="w-full bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer appearance-none pr-6">
                        <option value="cam-ranh">Grand Horizon Phú Quốc Oasis</option>
                        <option value="nha-trang">Grand Horizon Cam Ranh Sanctuary</option>
                        <option value="da-nang">Grand Horizon Đà Nẵng Heritage</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div className="lg:col-span-4 flex flex-col gap-space-xs">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
                      Thời Gian Lưu Trú
                    </label>
                    <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low rounded-lg p-space-sm">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-outline">Nhận phòng</span>
                        <input className="bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer text-[14px]" type="date" defaultValue="2025-04-12" min="2026-09-16" />
                      </div>
                      <div className="flex flex-col pl-2 border-l border-surface-container-high">
                        <span className="font-label-sm text-label-sm text-outline">Trả phòng</span>
                        <input className="bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer text-[14px]" type="date" defaultValue="2025-04-16" />
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex flex-col gap-space-xs">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                      Số Khách &amp; Buồng Phòng
                    </label>
                    <div className="relative bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
                      <select className="w-full bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer appearance-none pr-6">
                        <option value="2-0-1">2 Người lớn • 1 Phòng</option>
                        <option value="2-1-1">2 Người lớn, 1 Bé • 1 Phòng</option>
                        <option value="4-2-2">4 Người lớn • Villa 2 Phòng</option>
                        <option value="6-3-3">Biệt thự Tổng Thống (VIP)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <button className="w-full h-14 rounded-lg bg-secondary hover:bg-on-secondary-container text-on-secondary flex items-center justify-center gap-space-xs font-label-lg text-label-lg transition-all shadow-md hover:shadow-lg" type="button">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                      <span className="">Tìm Phòng Trống</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="w-full py-space-xl bg-surface-container-lowest shadow-sm">
            <div className="w-full px-margin max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter text-center divide-x-0 md:divide-x divide-surface-container">
                <div className="flex flex-col items-center justify-center p-space-md">
                  <div className="flex items-center gap-space-xs mb-space-xs">
                    <span className="font-display-sm text-display-sm text-on-surface">4.9</span>
                    <span className="text-secondary text-headline-sm font-headline-sm">★</span>
                  </div>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">Đánh Giá TripAdvisor</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Dựa trên 2.450+ đánh giá xác thực</span>
                </div>
                <div className="flex flex-col items-center justify-center p-space-md">
                  <div className="flex items-center gap-space-xs mb-space-xs">
                    <span className="font-display-sm text-display-sm text-on-surface">98.4</span>
                    <span className="text-secondary text-headline-sm font-headline-sm">%</span>
                  </div>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">Hài Lòng Tuyệt Đối</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Khách quay lại nghỉ dưỡng hàng năm</span>
                </div>
                <div className="flex flex-col items-center justify-center p-space-md">
                  <div className="flex items-center gap-space-xs mb-space-xs text-secondary">
                    <span className="material-symbols-outlined text-[36px]">concierge</span>
                  </div>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">Quản Gia 24/7 Riêng</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Chuẩn mực dịch vụ Hoàng gia riêng biệt</span>
                </div>
                <div className="flex flex-col items-center justify-center p-space-md">
                  <div className="flex items-center gap-space-xs mb-space-xs">
                    <span className="font-display-sm text-display-sm text-on-surface">1.2</span>
                    <span className="text-secondary font-title-lg text-title-lg font-bold self-end mb-1">KM</span>
                  </div>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">Bãi Biển Độc Quyền</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Bờ cát mịn tự nhiên &amp; biển ngọc lam</span>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full py-space-xl bg-background">
            <div className="w-full px-margin max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Không Gian Nghỉ Dưỡng Thượng Đỉnh</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mt-space-xs">Bộ Sưu Tập Biệt Thự &amp; Phòng Suite</h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Mỗi không gian là một tác phẩm kiến trúc hòa quyện cùng thiên nhiên nhiệt đới, kiến tạo sự riêng tư vô hạn và thư thái an nhiên.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div className="relative w-full aspect-[16/10] overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Villa 1" src="https://images.unsplash.com/photo-1582719478250-c89404bb2a15?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute top-space-sm left-space-sm px-space-sm py-space-xs bg-primary-container/90 backdrop-blur-md rounded text-secondary-fixed font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                      Signature Villa
                    </div>
                    <div className="absolute bottom-space-sm right-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded-lg font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[16px]">pool</span> Hồ bơi vô cực riêng
                    </div>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm mb-space-xs">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">straighten</span> 180 m²</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">king_bed</span> 1 King Bed</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">visibility</span> Trực diện biển</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors mb-space-xs">
                        Oceanfront Pool Villa
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md line-clamp-2">
                        Biệt thự trực diện biển với hồ bơi tràn bờ riêng tư, sân tắm nắng bằng gỗ teak và lối đi thẳng ra bờ cát trắng mịn.
                      </p>
                      <div className="flex flex-wrap gap-space-xs mb-space-lg">
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Bữa sáng thượng hạng</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Đưa đón sân bay VIP</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Trà chiều bãi biển</span>
                      </div>
                    </div>
                    <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                      <div>
                        <span className="font-label-sm text-label-sm text-outline block">Giá chỉ từ</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-title-lg text-title-lg text-on-surface font-bold">8.500.000₫</span>
                          <span className="font-body-sm text-body-sm text-outline">/đêm</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs">
                        <button className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-secondary-container text-on-surface font-label-md text-label-md transition-colors" type="button">
                          Chi Tiết
                        </button>
                        <button className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md transition-colors shadow-sm" type="button">
                          Đặt Ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div className="relative w-full aspect-[16/10] overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Suite 2" src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute top-space-sm left-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded text-secondary font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                      Khuyên Chọn
                    </div>
                    <div className="absolute bottom-space-sm right-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded-lg font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[16px]">hot_tub</span> Bồn tắm Jacuzzi
                    </div>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm mb-space-xs">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">straighten</span> 95 m²</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">king_bed</span> 1 King Bed</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">wb_twilight</span> Hướng Hoàng Hôn</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors mb-space-xs">
                        Horizon Grand Suite
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md line-clamp-2">
                        Tầm nhìn 180 độ ôm trọn khoảnh khắc hoàng hôn rực rỡ, trang bị bồn tắm sục đôi ngắm vịnh biển thơ mộng.
                      </p>
                      <div className="flex flex-wrap gap-space-xs mb-space-lg">
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Bữa sáng Buffet</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Cocktail Sunset Bar</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Dịch vụ giặt là nhẹ</span>
                      </div>
                    </div>
                    <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                      <div>
                        <span className="font-label-sm text-label-sm text-outline block">Giá chỉ từ</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-title-lg text-title-lg text-on-surface font-bold">4.200.000₫</span>
                          <span className="font-body-sm text-body-sm text-outline">/đêm</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs">
                        <button className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-secondary-container text-on-surface font-label-md text-label-md transition-colors" type="button">
                          Chi Tiết
                        </button>
                        <button className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md transition-colors shadow-sm" type="button">
                          Đặt Ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div className="relative w-full aspect-[16/10] overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Bungalow" src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute top-space-sm left-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded text-secondary font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                      An Nhiên &amp; Tĩnh Tại
                    </div>
                    <div className="absolute bottom-space-sm right-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded-lg font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[16px]">nature_people</span> Vườn Nhiệt Đới
                    </div>
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm mb-space-xs">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">straighten</span> 75 m²</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">king_bed</span> 1 King / 2 Twin</span>
                        <span className="">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-secondary">yard</span> Hoa cỏ nội khu</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors mb-space-xs">
                        Garden Sanctuary Bungalow
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md line-clamp-2">
                        Ẩn mình giữa rừng dương và rặng hoa sứ ngát hương, mang lại không gian thiền định, tách biệt hoàn toàn ồn ào đô thị.
                      </p>
                      <div className="flex flex-wrap gap-space-xs mb-space-lg">
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Bữa sáng lành mạnh</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Lớp Yoga sáng sớm</span>
                        <span className="px-space-xs py-0.5 rounded bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">Xe đạp dạo khu nghỉ</span>
                      </div>
                    </div>
                    <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                      <div>
                        <span className="font-label-sm text-label-sm text-outline block">Giá chỉ từ</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-title-lg text-title-lg text-on-surface font-bold">2.900.000₫</span>
                          <span className="font-body-sm text-body-sm text-outline">/đêm</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs">
                        <button className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-secondary-container text-on-surface font-label-md text-label-md transition-colors" type="button">
                          Chi Tiết
                        </button>
                        <button className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md transition-colors shadow-sm" type="button">
                          Đặt Ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-space-xl text-center">
                <a className="inline-flex items-center gap-space-sm px-space-xl py-space-md rounded-lg bg-surface-container-lowest text-secondary font-label-lg text-label-lg shadow-sm hover:shadow-md transition-all" href="#">
                  <span className="">Xem Toàn Bộ 12 Hạng Phòng &amp; Biệt Thự</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </section>

          <section className="w-full py-space-xl bg-surface-container-low">
            <div className="w-full px-margin max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-space-xl">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Đặc Quyền Nghỉ Dưỡng</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mt-space-xs">Trải Nghiệm Thượng Lưu Độc Bản</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                  Mỗi khoảnh khắc tại Grand Horizon được thêu dệt tỉ mỉ, đánh thức trọn vẹn năm giác quan bằng sự thăng hoa văn hóa và tiện nghi vượt bậc.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col">
                  <div className="h-52 w-full overflow-hidden relative">
                    <img className="w-full h-full object-cover" alt="Spa" src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-surface-container-lowest font-label-md text-label-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[18px]">spa</span> Trị Liệu Trẻ Hóa
                    </span>
                  </div>
                  <div className="p-space-md flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">Lotus Lotus Spa &amp; Wellness</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Liệu pháp bấm huyệt cổ truyền Việt Nam kết hợp tinh dầu thảo mộc bản địa, giải tỏa mọi căng thẳng.
                      </p>
                    </div>
                    <a className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:text-on-secondary-container mt-space-md pt-space-xs" href="#">
                      Đặt Lịch Trị Liệu <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col">
                  <div className="h-52 w-full overflow-hidden relative">
                    <img className="w-full h-full object-cover" alt="Dining" src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-surface-container-lowest font-label-md text-label-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[18px]">restaurant</span> Hải Sản Fine Dining
                    </span>
                  </div>
                  <div className="p-space-md flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">Nhà Hàng Biển 'The Azure'</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Bữa tiệc vị giác với hải sản tươi đánh bắt trong ngày, chuẩn bị bởi các bếp trưởng đạt sao Michelin danh tiếng.
                      </p>
                    </div>
                    <a className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:text-on-secondary-container mt-space-md pt-space-xs" href="#">
                      Khám Phá Thực Đơn <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col">
                  <div className="h-52 w-full overflow-hidden relative">
                    <img className="w-full h-full object-cover" alt="Pool" src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-surface-container-lowest font-label-md text-label-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[18px]">waves</span> Thư Giãn Đỉnh Cao
                    </span>
                  </div>
                  <div className="p-space-md flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">Hồ Bơi Vô Cực Đa Tầng</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Cụm 3 hồ bơi nước mặn và nước ngọt nhìn thẳng ra đường chân trời biển rộng, thưởng thức cocktail sảng khoái.
                      </p>
                    </div>
                    <a className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:text-on-secondary-container mt-space-md pt-space-xs" href="#">
                      Xem Tiện Ích Hồ Bơi <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col">
                  <div className="h-52 w-full overflow-hidden relative">
                    <img className="w-full h-full object-cover" alt="Yacht" src="https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-surface-container-lowest font-label-md text-label-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-secondary text-[18px]">sailing</span> Du Thuyền Riêng Biệt
                    </span>
                  </div>
                  <div className="p-space-md flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">Du Thuyền Hoàng Hôn VIP</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Hành trình lướt sóng ngắm ráng chiều tuyệt mỹ trên vịnh biển, kèm rượu vang Champagne và đồ ăn canapé cao cấp.
                      </p>
                    </div>
                    <a className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:text-on-secondary-container mt-space-md pt-space-xs" href="#">
                      Đặt Chuyến Hải Trình <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full py-space-xl bg-background">
            <div className="w-full px-margin max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                <div className="lg:col-span-7 flex flex-col gap-space-lg">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Chia Sẻ Từ Thượng Khách</span>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface mt-space-xs">Dấu Ấn Kỷ Niệm Khó Phai</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex text-secondary mb-space-sm text-[16px]">
                          <span className="">★</span><span className="">★</span><span className="">★</span><span className="">★</span><span className="">★</span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant italic mb-space-md">
                          "Kỳ nghỉ tuần trăng mật vượt ngoài mong đợi. Đội ngũ quản gia thấu hiểu từng thói quen nhỏ nhất, từ loại gối lông vũ đến sở thích thưởng thức bữa sáng bên bờ sóng vỗ."
                        </p>
                      </div>
                      <div className="flex items-center gap-space-sm pt-space-sm border-t border-surface-container">
                        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container font-label-md text-label-md">
                          TH
                        </div>
                        <div className="flex flex-col">
                          <span className="font-title-md text-title-md text-on-surface font-semibold leading-tight">TS. Trần Hoàng &amp; Phu Nhân</span>
                          <span className="font-label-sm text-label-sm text-outline">Oceanfront Villa • Tháng 01/2025</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex text-secondary mb-space-sm text-[16px]">
                          <span className="">★</span><span className="">★</span><span className="">★</span><span className="">★</span><span className="">★</span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant italic mb-space-md">
                          "Không gian tĩnh mịch và dịch vụ chuẩn mực 5 sao đích thực. Nhà hàng The Azure phục vụ món tôm hùm sốt bơ nướng ngon nhất tôi từng thưởng thức tại châu Á."
                        </p>
                      </div>
                      <div className="flex items-center gap-space-sm pt-space-sm border-t border-surface-container">
                        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container font-label-md text-label-md">
                          ML
                        </div>
                        <div className="flex flex-col">
                          <span className="font-title-md text-title-md text-on-surface font-semibold leading-tight">Madame Mai Lan</span>
                          <span className="font-label-sm text-label-sm text-outline">Grand Suite • Hội Viên Elite Black</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-lg pt-space-xs text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[24px]">verified_user</span>
                      <span className="font-label-sm text-label-sm">Bảo lưu và hoàn cọc linh hoạt 48h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[24px]">lock</span>
                      <span className="font-label-sm text-label-sm">Thanh toán bảo mật chuẩn SSL 256-bit</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="relative bg-primary-container text-surface-container-lowest p-space-xl rounded-xl overflow-hidden shadow-xl">
                    <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-secondary/30 blur-2xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col">
                      <div className="w-12 h-12 rounded-lg bg-secondary-container/20 flex items-center justify-center mb-space-md">
                        <span className="material-symbols-outlined text-secondary-fixed text-[28px]">stars</span>
                      </div>
                      <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed font-bold">Grand Horizon Elite Club</span>
                      <h3 className="font-headline-md text-headline-md text-surface-container-lowest mt-1 mb-space-xs">
                        Đăng Ký Hội Viên &amp; Nhận Ngay Ưu Đãi 10%
                      </h3>
                      <p className="font-body-sm text-body-sm text-primary-fixed-dim mb-space-lg">
                        Đặc quyền nhận chiết khấu trực tiếp trên giá phòng, nâng cấp hạng phòng miễn phí tùy tình trạng và thưởng thức dịch vụ đưa đón bằng xe riêng Limousine.
                      </p>
                      <form className="flex flex-col gap-space-sm" onSubmit={(e) => e.preventDefault()}>
                        <div className="flex flex-col gap-1">
                          <input className="w-full h-12 px-space-md rounded-lg bg-surface-container-lowest/10 text-surface-container-lowest placeholder-primary-fixed-dim text-body-md focus:outline-none focus:bg-surface-container-lowest/20 transition-all" placeholder="Họ và tên của Quý khách" type="text" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <input className="w-full h-12 px-space-md rounded-lg bg-surface-container-lowest/10 text-surface-container-lowest placeholder-primary-fixed-dim text-body-md focus:outline-none focus:bg-surface-container-lowest/20 transition-all" placeholder="Địa chỉ email cá nhân" type="email" />
                        </div>
                        <button className="w-full h-12 mt-space-xs rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all flex items-center justify-center gap-space-xs shadow-md" type="submit">
                          <span className="">Trở Thành Hội Viên Thượng Lưu</span>
                          <span className="material-symbols-outlined text-[18px]">card_membership</span>
                        </button>
                      </form>
                      <p className="font-label-sm text-label-sm text-on-primary-container text-center mt-space-md">
                        Không thu phí thường niên • Hủy đăng ký nhận thư bất kỳ lúc nào
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
