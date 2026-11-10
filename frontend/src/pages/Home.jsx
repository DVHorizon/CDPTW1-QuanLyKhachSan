import React, { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

// Ảnh fallback theo index nếu loại phòng không có hình
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1582719478250-c89404bb2a15?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop',
];

function formatPrice(price) {
  if (!price && price !== 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
}

const ROOM_API_URL = typeof window !== 'undefined' && window.location.port === '3000'
  ? '/api/loai-phong'
  : 'http://localhost:5000/api/loai-phong';

function Home() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState(null);

  // State tìm kiếm trực tiếp trong Bộ Sưu Tập Phòng trên Home
  const [homeSearchKeyword, setHomeSearchKeyword] = useState('');

  // State cho Modal Khách Xem Chi Tiết Phòng
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);

  // State cho Modal Khách Xem Toàn Bộ Danh Sách Phòng (Read-Only)
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [loadingAllRooms, setLoadingAllRooms] = useState(false);
  const [searchModalKeyword, setSearchModalKeyword] = useState('');

  // Fetch danh sách loại phòng từ backend (Hỗ trợ tìm kiếm theo từ khóa)
  useEffect(() => {
    const controller = new AbortController();
    setLoadingRooms(true);

    const timer = setTimeout(() => {
      const q = homeSearchKeyword.trim();
      const endpoint = q
        ? `${ROOM_API_URL}?trang_thai=active&q=${encodeURIComponent(q)}`
        : `${ROOM_API_URL}?trang_thai=active&limit=12`;

      fetch(endpoint, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error('Không thể tải dữ liệu loại phòng.');
          return res.json();
        })
        .then((json) => {
          if (json.success) {
            setRoomTypes(json.data || []);
            if (!q) {
              setTotalCount(json.stats?.active || json.total || (json.data ? json.data.length : 0));
            }
          } else {
            setRoomError(json.message || 'Lỗi tải dữ liệu.');
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setRoomError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
          }
        })
        .finally(() => setLoadingRooms(false));
    }, homeSearchKeyword ? 250 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [homeSearchKeyword]);

  // Mở modal toàn bộ phòng dành cho khách (luôn tải mới nhất để cập nhật phòng mới thêm từ Admin)
  const handleOpenAllRooms = () => {
    setShowAllRoomsModal(true);
    setLoadingAllRooms(true);
    fetch(`${ROOM_API_URL}?trang_thai=active`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setAllRooms(json.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAllRooms(false));
  };

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
              style={{ backgroundImage: 'url("/images/hero-banner.jpg")' }}
            >
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-primary-container/80 via-primary-container/20 to-background -z-10"></div>
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
                Trải nghiệm dịch vụ cá nhân hóa chuẩn 5 sao quốc tế, nghệ thuật ẩm thực tinh tế và không gian tĩnh tại tuyệt đối giữa thiên nhiên nguyên sơ Cam Ranh, Phú Quốc & Đà Nẵng.
              </p>
            </div>
            <div className="w-full px-margin max-w-6xl mx-auto mt-4">
              <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-xl p-space-md lg:p-space-lg">
                <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-md items-end" onSubmit={(e) => e.preventDefault()}>
                  <div className="lg:col-span-3 flex flex-col gap-space-xs">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                      Điểm Đến & Chi Nhánh
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
                      Số Khách & Buồng Phòng
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
                    <button
                      onClick={() => {
                        const el = document.getElementById('bo-suu-tap-phong');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full h-14 rounded-lg bg-secondary hover:bg-on-secondary-container text-on-secondary flex items-center justify-center gap-space-xs font-label-lg text-label-lg transition-all shadow-md hover:shadow-lg cursor-pointer"
                      type="button"
                    >
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
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Bờ cát mịn tự nhiên & biển ngọc lam</span>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full py-space-xl bg-background" id="bo-suu-tap-phong">
            <div className="w-full px-margin max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-md gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Không Gian Nghỉ Dưỡng Thượng Đỉnh</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mt-space-xs">Bộ Sưu Tập Biệt Thự &amp; Phòng Suite</h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Mỗi không gian là một tác phẩm kiến trúc hòa quyện cùng thiên nhiên nhiệt đới, kiến tạo sự riêng tư vô hạn và thư thái an nhiên.
                </p>
              </div>

              {/* Thanh Tìm Kiếm Trực Tiếp trong Bộ Sưu Tập */}
              <div className="mb-space-xl bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-center gap-space-md">
                <div className="relative flex-1 w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-secondary text-[22px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={homeSearchKeyword}
                    onChange={(e) => setHomeSearchKeyword(e.target.value)}
                    placeholder="Tìm nhanh hạng phòng theo tên hoặc từ khóa (VD: 09876, Suite, Villa, Deluxe...)"
                    className="w-full bg-surface-container-lowest pl-11 pr-10 py-2.5 rounded-xl text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary border border-outline-variant/40 shadow-xs transition"
                  />
                  {homeSearchKeyword && (
                    <button
                      type="button"
                      onClick={() => setHomeSearchKeyword('')}
                      className="absolute right-3.5 top-3 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                </div>
                {homeSearchKeyword.trim() && (
                  <div className="flex items-center gap-2 text-body-sm font-semibold text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    <span>Tìm thấy {roomTypes.length} loại phòng</span>
                  </div>
                )}
              </div>

              {/* === LOADING STATE === */}
              {loadingRooms && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm animate-pulse">
                      <div className="w-full aspect-[16/10] bg-surface-container-high" />
                      <div className="p-space-lg flex flex-col gap-space-sm">
                        <div className="h-4 bg-surface-container-high rounded w-3/4" />
                        <div className="h-3 bg-surface-container-high rounded w-full" />
                        <div className="h-3 bg-surface-container-high rounded w-2/3" />
                        <div className="h-10 bg-surface-container-high rounded w-full mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* === ERROR STATE === */}
              {!loadingRooms && roomError && (
                <div className="flex flex-col items-center justify-center py-16 gap-space-md text-center">
                  <span className="material-symbols-outlined text-error text-[48px]">wifi_off</span>
                  <p className="font-title-md text-title-md text-on-surface-variant">{roomError}</p>
                  <button
                    onClick={() => { setRoomError(null); setLoadingRooms(true); fetch(`${ROOM_API_URL}?trang_thai=active`).then(r=>r.json()).then(j=>{ if(j.success) setRoomTypes(j.data||[]); }).catch(()=>setRoomError('Không thể kết nối.')).finally(()=>setLoadingRooms(false)); }}
                    className="px-space-lg py-space-sm rounded-lg bg-secondary text-on-secondary font-label-md text-label-md"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* === EMPTY STATE === */}
              {!loadingRooms && !roomError && roomTypes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-space-md text-center">
                  <span className="material-symbols-outlined text-outline text-[48px]">hotel</span>
                  <p className="font-title-md text-title-md text-on-surface-variant">
                    {homeSearchKeyword.trim()
                      ? `Không tìm thấy loại phòng nào phù hợp với từ khóa "${homeSearchKeyword}" trong bộ sưu tập.`
                      : 'Chưa có loại phòng nào được thêm vào hệ thống.'}
                  </p>
                  {homeSearchKeyword.trim() && (
                    <button
                      type="button"
                      onClick={() => setHomeSearchKeyword('')}
                      className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md cursor-pointer transition"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  )}
                </div>
              )}

              {/* === ROOM CARDS TỪ DATABASE === */}
              {!loadingRooms && !roomError && roomTypes.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                  {(homeSearchKeyword.trim() ? roomTypes : roomTypes.slice(0, 6)).map((room, index) => {
                    const rawImg = room.hinh_anh || room.image || (room.images && room.images[0]);
                    const imgSrc = rawImg || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
                    const isFirst = index === 0;
                    return (
                      <div key={room.id} className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                        <div className="relative w-full aspect-[16/10] overflow-hidden">
                          <img
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            alt={room.ten_loai}
                            src={imgSrc}
                            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]; }}
                          />
                          {/* Badge loại phòng */}
                          <div className={`absolute top-space-sm left-space-sm px-space-sm py-space-xs backdrop-blur-md rounded font-label-sm text-label-sm font-semibold uppercase tracking-wider ${
                            isFirst
                              ? 'bg-primary-container/90 text-secondary-fixed'
                              : 'bg-surface-container-lowest/90 text-secondary'
                          }`}>
                            {room.ma_loai}
                          </div>
                          {/* Badge sức chứa */}
                          <div className="absolute bottom-space-sm right-space-sm px-space-sm py-space-xs bg-surface-container-lowest/90 backdrop-blur-md rounded-lg font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                            <span className="material-symbols-outlined text-secondary text-[16px]">group</span>
                            Tối đa {room.toi_da_tong || ((room.toi_da_nguoi_lon || 2) + (room.toi_da_tre_em || 1))} khách
                          </div>
                        </div>
                        <div className="p-space-lg flex-1 flex flex-col justify-between">
                          <div>
                            {/* Thông tin sức chứa */}
                            <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm mb-space-xs flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-secondary">king_bed</span>
                                {room.toi_da_nguoi_lon} người lớn
                              </span>
                              {room.toi_da_tre_em > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] text-secondary">child_care</span>
                                    {room.toi_da_tre_em} trẻ em
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Tên loại phòng */}
                            <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors mb-space-xs">
                              {room.ten_loai}
                            </h3>
                            {/* Mô tả */}
                            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md line-clamp-2">
                              {room.mo_ta || 'Không gian nghỉ dưỡng tiện nghi và thoải mái, mang đến trải nghiệm lưu trú đẳng cấp.'}
                            </p>
                          </div>
                          {/* Giá và nút */}
                          <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                            <div>
                              <span className="font-label-sm text-label-sm text-outline block">Giá chỉ từ</span>
                              <div className="flex items-baseline gap-1">
                                <span className="font-title-lg text-title-lg text-on-surface font-bold">
                                  {formatPrice(room.gia_co_ban)}
                                </span>
                                <span className="font-body-sm text-body-sm text-outline">/đêm</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-space-xs">
                              <button
                                onClick={() => setSelectedRoomDetail(room)}
                                className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-secondary-container text-on-surface font-label-md text-label-md transition-colors"
                                type="button"
                              >
                                Chi Tiết
                              </button>
                              <button
                                className="px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-md text-label-md transition-colors shadow-sm"
                                type="button"
                              >
                                Đặt Ngay
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nút xem tất cả dành cho khách (Chỉ xem - Modal) */}
              {!loadingRooms && !roomError && (
                <div className="mt-space-xl text-center">
                  <button
                    type="button"
                    onClick={handleOpenAllRooms}
                    className="inline-flex items-center gap-space-sm px-space-xl py-space-md rounded-lg bg-surface-container-lowest text-secondary font-label-lg text-label-lg shadow-sm hover:shadow-md hover:bg-secondary hover:text-on-secondary transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">explore</span>
                    <span>Xem Toàn Bộ {totalCount || roomTypes.length} Hạng Phòng & Biệt Thự</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              )}
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
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">Lotus Lotus Spa & Wellness</h3>
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
                          <span className="font-title-md text-title-md text-on-surface font-semibold leading-tight">TS. Trần Hoàng & Phu Nhân</span>
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
                        Đăng Ký Hội Viên & Nhận Ngay Ưu Đãi 10%
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

      {/* ============================================================== */}
      {/* 🌟 MODAL 1: KHÁCH XEM TOÀN BỘ PHÒNG (READ-ONLY - KHÔNG VÀO ADMIN) */}
      {/* ============================================================== */}
      {showAllRoomsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30">
            {/* Header Modal */}
            <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[24px]">hotel</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Danh Sách Toàn Bộ Hạng Phòng &amp; Biệt Thự
                  </h3>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Hiển thị {allRooms.length > 0 ? allRooms.length : totalCount} hạng phòng sẵn sàng đón tiếp quý khách
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAllRoomsModal(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Thanh Tìm Kiếm Nhanh trong Modal */}
            <div className="px-space-lg py-space-sm bg-surface-container-lowest border-b border-surface-container-high/60 flex items-center gap-space-sm">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchModalKeyword}
                  onChange={(e) => setSearchModalKeyword(e.target.value)}
                  placeholder="Tìm theo tên hạng phòng hoặc mô tả..."
                  className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-xl text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary border border-transparent"
                />
              </div>
            </div>

            {/* Nội dung danh sách phòng */}
            <div className="p-space-lg overflow-y-auto flex-1">
              {loadingAllRooms && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary">
                  <span className="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
                  <span className="font-label-md text-label-md">Đang tải toàn bộ dữ liệu phòng nghỉ...</span>
                </div>
              )}

              {!loadingAllRooms && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
                  {(allRooms.length > 0 ? allRooms : roomTypes)
                    .filter((r) => {
                      if (!searchModalKeyword.trim()) return true;
                      const kw = searchModalKeyword.trim().toLowerCase();
                      const name = String(r.ten_loai || r.typeName || r.name || '').toLowerCase();
                      const desc = String(r.mo_ta || r.description || '').toLowerCase();
                      const code = String(r.ma_loai || r.TypeCode || r.code || '').toLowerCase();
                      return name.includes(kw) || desc.includes(kw) || code.includes(kw);
                    })
                    .map((room, idx) => {
                      const rawImg = room.hinh_anh || room.image || (room.images && room.images[0]);
                      const imgSrc = rawImg || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                      return (
                        <div
                          key={room.id}
                          className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col justify-between hover:shadow-lg transition-all"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden">
                            <img
                              src={imgSrc}
                              alt={room.ten_loai}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]; }}
                            />
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white font-mono text-[11px] font-bold">
                              {room.ma_loai}
                            </span>
                          </div>
                          <div className="p-space-md flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-title-md text-title-md text-on-surface font-semibold mb-1 line-clamp-1">
                                {room.ten_loai}
                              </h4>
                              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">
                                {room.mo_ta || 'Không gian nghỉ dưỡng sang trọng, tiện nghi cao cấp tiêu chuẩn 5 sao.'}
                              </p>
                              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant font-medium mb-space-sm">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px] text-secondary">group</span>
                                  {room.toi_da_nguoi_lon} người lớn
                                </span>
                                <span>•</span>
                                <span>{room.dien_tich ? `${room.dien_tich} m²` : 'Tiêu chuẩn'}</span>
                              </div>
                            </div>
                            <div className="pt-space-sm border-t border-surface-container-high flex items-center justify-between">
                              <span className="font-title-md text-title-md text-secondary font-bold">
                                {formatPrice(room.gia_co_ban)}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedRoomDetail(room);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm hover:opacity-95 transition-opacity"
                                type="button"
                              >
                                Xem Chi Tiết
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-space-md bg-surface-container-low border-t border-surface-container-high flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAllRoomsModal(false)}
                className="px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🌟 MODAL 2: KHÁCH XEM CHI TIẾT MỘT PHÒNG (READ-ONLY)            */}
      {/* ============================================================== */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant/30">
            {/* Ảnh phòng */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container-high">
              <img
                src={selectedRoomDetail.hinh_anh || FALLBACK_IMAGES[0]}
                alt={selectedRoomDetail.ten_loai}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGES[0]; }}
              />
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded bg-black/70 backdrop-blur-sm text-white font-mono text-label-sm font-bold">
                {selectedRoomDetail.ma_loai}
              </span>
            </div>

            {/* Thông tin chi tiết */}
            <div className="p-space-lg overflow-y-auto flex-1 flex flex-col gap-space-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                  {selectedRoomDetail.ten_loai}
                </h3>
                <div className="flex items-center gap-3 text-on-surface-variant font-body-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">king_bed</span>
                    {selectedRoomDetail.loai_giuong || '1 Giường King'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                    Tối đa {selectedRoomDetail.toi_da_tong || ((selectedRoomDetail.toi_da_nguoi_lon || 2) + (selectedRoomDetail.toi_da_tre_em || 1))} khách
                  </span>
                  {selectedRoomDetail.dien_tich && (
                    <>
                      <span>•</span>
                      <span>{selectedRoomDetail.dien_tich} m²</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-title-sm text-title-sm font-semibold text-on-surface mb-1">Mô Tả Không Gian</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {selectedRoomDetail.mo_ta || 'Phòng nghỉ thượng đỉnh kết hợp phong cách hiện đại và sự riêng tư tuyệt đối, mang lại trải nghiệm nghỉ dưỡng hoàn mỹ.'}
                </p>
              </div>

              {/* Tiện nghi phòng */}
              <div>
                <h4 className="font-title-sm text-title-sm font-semibold text-on-surface mb-2">Đặc Quyền &amp; Tiện Nghi</h4>
                <div className="grid grid-cols-2 gap-2 text-body-sm text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">wifi</span>
                    Wi-Fi Tốc Độ Cao
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">ac_unit</span>
                    Điều Hòa Trung Tâm
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">deck</span>
                    Ban Công Hướng Biển
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">room_service</span>
                    Phục Vụ Phòng 24/7
                  </div>
                </div>
              </div>

              {/* Giá và nút đặt */}
              <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                <div>
                  <span className="font-label-sm text-label-sm text-outline block">Giá tiêu chuẩn</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                      {formatPrice(selectedRoomDetail.gia_co_ban)}
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">/đêm</span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomDetail(null)}
                    className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="px-space-lg py-space-sm rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:bg-on-secondary-container transition-all shadow-sm"
                  >
                    Đặt Phòng Ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Home;
