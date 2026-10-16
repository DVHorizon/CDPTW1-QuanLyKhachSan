import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import RoomDetailModal from '../../components/modals/RoomDetailModal';
import QuickBookingModal from '../../components/modals/QuickBookingModal';
import { fetchHomeData } from '../../api/hotelApi';
import {
  mockBranches,
  mockRoomTypes,
  mockAmenities,
  mockSpecialOffers,
  mockReviews,
  mockFaqs,
  mockStats,
  mockExperiences
} from '../../data/mockHomeData';

// Helper làm sạch tên tiện ích và gán Material Symbol chuẩn (tránh URL dài làm tràn vỡ layout)
const mapAmenityIcon = (name, rawIcon) => {
  if (rawIcon && !rawIcon.startsWith('http') && !rawIcon.includes('/') && !rawIcon.includes('.')) {
    return rawIcon;
  }
  const n = (name || '').toLowerCase();
  if (n.includes('hồ bơi') || n.includes('bể bơi')) return 'pool';
  if (n.includes('spa') || n.includes('xông hơi') || n.includes('trị liệu')) return 'spa';
  if (n.includes('biển') || n.includes('bãi biển')) return 'beach_access';
  if (n.includes('nhà hàng') || n.includes('ẩm thực') || n.includes('buffet') || n.includes('ăn')) return 'restaurant';
  if (n.includes('thể hình') || n.includes('gym') || n.includes('fitness') || n.includes('yoga')) return 'fitness_center';
  if (n.includes('du thuyền') || n.includes('thuyền') || n.includes('yacht')) return 'sailing';
  if (n.includes('xe') || n.includes('sân bay') || n.includes('limousine') || n.includes('đưa đón')) return 'airport_shuttle';
  if (n.includes('quản gia') || n.includes('concierge') || n.includes('phục vụ')) return 'concierge';
  if (n.includes('wifi') || n.includes('mạng')) return 'wifi';
  if (n.includes('bồn tắm') || n.includes('tắm') || n.includes('jacuzzi')) return 'bathtub';
  if (n.includes('minibar') || n.includes('rượu') || n.includes('bar')) return 'local_bar';
  if (n.includes('cà phê') || n.includes('coffee') || n.includes('nespresso')) return 'coffee';
  if (n.includes('ban công') || n.includes('sân')) return 'deck';
  if (n.includes('tv') || n.includes('truyền hình')) return 'tv';
  return 'hotel';
};

const cleanAmenityTitle = (name, fallbackName) => {
  if (!name) return fallbackName || 'Tiện Nghi Nghỉ Dưỡng';
  return name.replace(/\s*#\d+$/i, '').trim();
};

const cleanAmenityDesc = (desc, fallbackDesc) => {
  if (!desc || desc.includes('số hiệu')) {
    return fallbackDesc || 'Chuẩn mực tiện nghi sang trọng và đẳng cấp quốc tế phục vụ riêng cho thượng khách.';
  }
  return desc;
};

function Home() {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState({
    branches: mockBranches,
    featuredRoomTypes: mockRoomTypes,
    amenities: mockAmenities,
    offers: mockSpecialOffers,
    experiences: mockExperiences,
    reviews: mockReviews,
    faqs: mockFaqs,
    stats: mockStats
  });

  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(mockBranches[0].BranchId);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestOption, setGuestOption] = useState('2-0-1');
  const [searchNotification, setSearchNotification] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [wishlist, setWishlist] = useState([]);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(1);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Tải dữ liệu từ Backend API (nếu có), fallback về Mock data
  useEffect(() => {
    const loadData = async () => {
      try {
        const liveData = await fetchHomeData();
        if (liveData) {
          setHomeData(prev => ({
            ...prev,
            branches: liveData.branches?.length
              ? liveData.branches.map((b, idx) => {
                  const fallback = mockBranches[idx % mockBranches.length] || {};
                  return {
                    ...fallback,
                    ...b,
                    City: b.City || (b.Address ? b.Address.split(',').pop()?.trim() : '') || fallback.City || 'Việt Nam'
                  };
                })
              : mockBranches,
            featuredRoomTypes: liveData.featuredRoomTypes?.length
              ? liveData.featuredRoomTypes.map((rt, idx) => {
                  const fallback = mockRoomTypes[idx % mockRoomTypes.length] || {};
                  return {
                    ...fallback,
                    ...rt,
                    BasePrice: Number(rt.BasePrice || fallback.BasePrice || 1850000),
                    Category: rt.Category || fallback.Category || 'deluxe',
                    Gallery: rt.Gallery?.length ? rt.Gallery : [rt.ImageUrl || fallback.ImageUrl].filter(Boolean),
                    Rating: rt.Rating || fallback.Rating || 5.0,
                    TotalReviews: rt.TotalReviews || fallback.TotalReviews || 99
                  };
                })
              : mockRoomTypes,
            amenities: liveData.amenities?.length
              ? liveData.amenities.map((a, idx) => {
                  const fallback = mockAmenities[idx % mockAmenities.length] || {};
                  const cleanName = cleanAmenityTitle(a.AmenityName, fallback.AmenityName);
                  return {
                    ...fallback,
                    AmenityId: a.AmenityId || idx + 1,
                    AmenityName: cleanName,
                    Description: cleanAmenityDesc(a.Description, fallback.Description),
                    IconName: mapAmenityIcon(cleanName, a.IconName || fallback.IconName)
                  };
                })
              : mockAmenities,
            offers: liveData.offers?.length ? liveData.offers : mockSpecialOffers,
            experiences: mockExperiences,
            reviews: liveData.reviews?.length ? liveData.reviews : mockReviews,
            stats: liveData.stats || mockStats
          }));
        }
      } catch (err) {
        console.info('Sử dụng dữ liệu Mock hoàn chỉnh cho Trang Chủ.');
      }
    };

    loadData();
  }, []);

  // Xử lý Tìm Phòng (FEAT-GUEST-02)
  const handleSearch = (e) => {
    e.preventDefault();

    if (!checkInDate) {
      setSearchNotification('Vui lòng chọn ngày nhận phòng.');
      return;
    }

    // TC01: Ngày quá khứ
    if (checkInDate < todayStr) {
      setSearchNotification('Ngày nhận phòng không được ở trong quá khứ');
      return;
    }

    // TC02: Ngày trả cùng ngày nhận hoặc quá khứ
    if (!checkOutDate || checkOutDate <= checkInDate) {
      setSearchNotification('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm');
      return;
    }

    // TC03: Lưu trú quá 30 đêm
    const d1 = new Date(checkInDate + 'T00:00:00');
    const d2 = new Date(checkOutDate + 'T00:00:00');
    const nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (nights > 30) {
      setSearchNotification('Hệ thống chỉ hỗ trợ đặt phòng tối đa 30 đêm trực tuyến');
      return;
    }

    const guests = parseInt(guestOption.split('-')[0], 10) || 2;
    navigate(`/rooms?branchId=${selectedBranch}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&totalGuests=${guests}`);
  };

  // Toggle Wishlist
  const toggleWishlist = (roomId) => {
    setWishlist(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  // Lọc phòng theo danh mục
  const filteredRooms = homeData.featuredRoomTypes.filter(room => {
    if (activeCategory === 'all') return true;
    return room.Category === activeCategory;
  });

  const currentBranchName = homeData.branches.find(b => String(b.BranchId) === String(selectedBranch))?.BranchName || 'Phú Quốc Oasis';

  return (
    <MainLayout
      wishlistCount={wishlist.length}
      onWishlistClick={() => {
        const el = document.getElementById('room-collection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      <div className="flex flex-col w-full">

        {/* ================= 1. HERO BANNER SECTION ================= */}
        <section id="trang-chu" className="relative isolate w-full pt-32 pb-24 lg:pb-32 overflow-hidden min-h-[720px] lg:min-h-[820px] flex items-center justify-center">
          {/* Background image & gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center -z-20"
            data-alt="Ultra luxury beachfront tropical resort at twilight sunset"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop")'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#131b2e]/85 via-[#203044]/60 to-[#131b2e]/85 -z-10" />

          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
            {/* Prestige Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[#ffd985] text-[11.5px] font-semibold tracking-wider uppercase mb-6 animate-fade-in shadow-sm">
              <span className="material-symbols-outlined text-[17px]">verified</span>
              <span>Thương Hiệu Nghỉ Dưỡng Thượng Lưu Hàng Đầu Châu Á 2026</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-[40px] sm:text-[56px] lg:text-[70px] text-white font-bold leading-[1.12] tracking-tight max-w-4xl text-shadow-md">
              Kỳ Nghỉ Thượng Lưu <br />
              <span className="italic font-normal text-[#ffd985]">Bên Bờ Biển Thiên Đường</span>
            </h1>

            <p className="mt-5 text-[15px] sm:text-[17px] text-white/90 max-w-2xl font-light leading-relaxed">
              Trải nghiệm thiên đường riêng tư tại các ốc đảo nhiệt đới danh tiếng.
              Hòa mình giữa đại dương ngọc bích, dịch vụ ẩm thực Fine Dining đỉnh cao và quản gia 24/7.
            </p>

            {/* 3 Brand Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 mt-5 text-white/95 text-[13px] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">verified</span>
                Chuẩn mực 5 sao quốc tế
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">payments</span>
                Đảm bảo giá tốt nhất
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffd985] text-[18px]">support_agent</span>
                Đặc quyền phục vụ 24/7
              </span>
            </div>

            {/* FLOATING BOOKING SEARCH BAR */}
            <div className="w-full max-w-5xl mt-10">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-4 sm:p-6 border border-[#dedad0]">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end text-left">
                  
                  {/* Điểm đến / Chi nhánh */}
                  <div className="lg:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#b9a277]">location_on</span>
                      Điểm Đến / Chi Nhánh
                    </label>
                    <div className="relative bg-[#fbf8f2] rounded-xl border border-[#dedad0] px-3.5 py-2.5 focus-within:border-[#b9a277] transition-all">
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full bg-transparent text-[13px] font-bold text-[#203044] focus:outline-none cursor-pointer pr-6 truncate"
                      >
                        {homeData.branches.map(branch => {
                          const rawCity = branch.City
                            ? branch.City.split(',')[0].trim()
                            : (branch.Address ? branch.Address.split(',').pop()?.trim() : '');
                          const cityClean = rawCity ? rawCity.replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '') : '';
                          return (
                            <option key={branch.BranchId} value={branch.BranchId} className="text-[#203044]">
                              {branch.BranchName} {cityClean ? `(${cityClean})` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8a8782] text-[18px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Ngày nhận - Ngày trả */}
                  <div className="lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#b9a277]">calendar_today</span>
                      Thời Gian Lưu Trú (dd/mm/yyyy)
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-[#fbf8f2] rounded-xl border border-[#dedad0] px-3 py-1.5">
                      <div className="relative flex flex-col cursor-pointer group">
                        <span className="text-[10px] text-[#8a8782] font-semibold">Nhận phòng</span>
                        <span className="text-[12px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors select-none py-0.5">
                          {checkInDate ? checkInDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                        </span>
                        <input
                          type="date"
                          value={checkInDate}
                          min={todayStr}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker(); } catch (_) {}
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Chọn ngày nhận phòng (dd/mm/yyyy)"
                        />
                      </div>
                      <div className="relative flex flex-col pl-2 border-l border-[#dedad0] cursor-pointer group">
                        <span className="text-[10px] text-[#8a8782] font-semibold">Trả phòng</span>
                        <span className="text-[12px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors select-none py-0.5">
                          {checkOutDate ? checkOutDate.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                        </span>
                        <input
                          type="date"
                          value={checkOutDate}
                          min={checkInDate || todayStr}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker(); } catch (_) {}
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Chọn ngày trả phòng (dd/mm/yyyy)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Số Khách & Phòng */}
                  <div className="lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[#8a8782] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#b9a277]">group</span>
                      Số Khách
                    </label>
                    <div className="relative bg-[#fbf8f2] rounded-xl border border-[#dedad0] px-3.5 py-2.5 focus-within:border-[#b9a277] transition-all">
                      <select
                        value={guestOption}
                        onChange={(e) => setGuestOption(e.target.value)}
                        className="w-full bg-transparent text-[13px] font-bold text-[#203044] focus:outline-none cursor-pointer pr-6 truncate"
                      >
                        <option value="2-0-1">2 Người lớn, 1 Phòng</option>
                        <option value="1-0-1">1 Người lớn, 1 Phòng</option>
                        <option value="2-1-1">2 Lớn, 1 Trẻ em</option>
                        <option value="4-2-2">4 Lớn, 2 Trẻ em (Villa)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8a8782] text-[18px]">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Nút Tìm Kiếm */}
                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-[46px] rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white font-bold text-[13.5px] shadow-[0_6px_20px_rgba(185,162,119,0.4)] hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">search</span>
                      <span>Tìm Phòng</span>
                    </button>
                  </div>
                </form>

                {/* Search Notification Banner */}
                {searchNotification && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-medium flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined text-[18px] text-[#b9a277]">info</span>
                    <span>{searchNotification}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 2. FEATURE HIGHLIGHTS & STATS ================= */}
        <section className="w-full py-12 bg-white border-b border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y lg:divide-y-0 lg:divide-x divide-[#dedad0]">
              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">4.98</span>
                  <span className="text-[#b9a277] text-[20px]">★</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">Đánh Giá Thượng Hạng</span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">Từ hơn 25,000+ lượt trải nghiệm</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">
                    {homeData.stats?.totalRooms || '550'}
                  </span>
                  <span className="text-[#b9a277] text-[20px] font-bold self-end mb-1">+</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">Phòng &amp; Biệt Thự Biển</span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Tại {homeData.branches.length} khu nghỉ dưỡng danh tiếng
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1 text-[#b9a277]">
                  <span className="material-symbols-outlined text-[36px]">concierge</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">Quản Gia Riêng 24/7</span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Chuẩn mực phục vụ tận tâm, tinh tế
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">100%</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">Bãi Biển Độc Quyền</span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Cát trắng mịn màng &amp; biển ngọc lam
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. ROOM COLLECTION SECTION ================= */}
        <section id="room-collection" className="w-full py-16 lg:py-24 bg-[#fafaf8] scroll-mt-24">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                  Không Gian Nghỉ Dưỡng Tinh Hoa
                </span>
                <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight leading-[1.25]">
                  Bộ Sưu Tập Biệt Thự &amp; Phòng Suite
                </h2>
              </div>
              <p className="text-[14px] text-[#373435]/80 max-w-md leading-relaxed">
                Thiết kế tinh tế với vật liệu gỗ và đá tự nhiên, hồ bơi tràn bờ riêng tư và không gian mở đón trọn hơi thở đại dương.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
              {[
                { id: 'all', label: 'Tất Cả Hạng Phòng' },
                { id: 'villa', label: 'Biệt Thự Biển (Villa)' },
                { id: 'suite', label: 'Suite Thượng Hạng' },
                { id: 'family', label: 'Dành Cho Gia Đình' },
                { id: 'deluxe', label: 'Phòng Deluxe Cao Cấp' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shrink-0 border ${activeCategory === tab.id
                    ? 'bg-[#203044] text-white border-[#203044] shadow-md'
                    : 'bg-white text-[#203044] border-[#dedad0] hover:border-[#b9a277]'
                    }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Room Cards Grid (6 items) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredRooms.map((rt) => {
                const isWishlisted = wishlist.includes(rt.RoomTypeId);
                return (
                  <div
                    key={rt.RoomTypeId}
                    className="group bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_-15px_rgba(32,48,68,0.25)] hover:shadow-[0_20px_45px_-20px_rgba(32,48,68,0.45)] transition-all duration-300 flex flex-col justify-between border border-[#dedad0] hover:-translate-y-1 relative"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#203044]">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
                        alt={rt.TypeName}
                        src={rt.ImageUrl}
                      />
                      {/* Badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 bg-[#203044]/90 backdrop-blur-md rounded-full text-[#b9a277] text-[11px] font-bold uppercase tracking-wider border border-[#b9a277]/40 shadow-sm">
                        {rt.Badge || 'Grand Horizon 5 Sao'}
                      </div>

                      {/* Wishlist Heart Button */}
                      <button
                        onClick={() => toggleWishlist(rt.RoomTypeId)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#203044] flex items-center justify-center transition-all shadow-md active:scale-90"
                        type="button"
                        aria-label="Yêu thích phòng"
                      >
                        <span className={`material-symbols-outlined text-[20px] transition-colors ${isWishlisted ? 'text-rose-500 font-bold fill-current' : 'text-[#8a8782]'}`}>
                          favorite
                        </span>
                      </button>

                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg text-[11px] font-semibold text-[#203044] flex items-center gap-1 shadow-sm">
                        <span className="text-[#b9a277]">★</span> {rt.Rating || 5.0} ({rt.TotalReviews || 99})
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Room Meta Specs */}
                        <div className="flex items-center gap-3 text-[12px] text-[#8a8782] mb-2 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">straighten</span>
                            {rt.SizeM2} m²
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">bed</span>
                            {rt.AdultCapacity} người lớn
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate max-w-[130px]" title={rt.ViewType}>
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">visibility</span>
                            {rt.ViewType}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-serif text-[18px] text-[#203044] font-bold group-hover:text-[#b9a277] transition-colors leading-snug mb-2">
                          {rt.TypeName}
                        </h3>

                        {/* Short Description */}
                        <p className="text-[13px] text-[#373435]/80 line-clamp-2 leading-relaxed mb-4">
                          {rt.Description}
                        </p>

                        {/* Amenity Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">restaurant</span> Bữa sáng 5 sao
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">pool</span> Hồ bơi
                          </span>
                        </div>
                      </div>

                      {/* Price & Actions */}
                      <div className="pt-4 border-t border-[#dedad0] flex items-center justify-between mt-auto">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#8a8782] font-semibold uppercase">Giá từ</span>
                            {rt.OriginalPrice && (
                              <span className="text-[11px] text-[#8a8782] line-through">
                                {Number(rt.OriginalPrice).toLocaleString('vi-VN')}₫
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-extrabold text-[#203044]">
                              {Number(rt.BasePrice).toLocaleString('vi-VN')}₫
                            </span>
                            <span className="text-[11px] text-[#8a8782]">/đêm</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedRoomForDetail(rt)}
                            className="px-3 py-2 rounded-xl bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] text-[12.5px] font-bold border border-[#dedad0] transition-colors"
                            type="button"
                          >
                            Chi Tiết
                          </button>
                          <button
                            onClick={() => setSelectedRoomForBooking(rt)}
                            className="px-4 py-2 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[12.5px] font-bold shadow-sm transition-all"
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
          </div>
        </section>

        {/* ================= 4. SPECIAL OFFERS SECTION (DARK NAVY LUXURY) ================= */}
        <section id="uu-dai" className="w-full py-20 lg:py-24 bg-[#131b2e] text-white border-t border-slate-800 relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#b9a277]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#203044]/60 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] uppercase tracking-widest text-[#ffd985] font-bold">
                Đặc Quyền Nghỉ Dưỡng
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-white mt-1.5 font-bold tracking-tight leading-[1.25]">
                Gói Ưu Đãi &amp; Khuyến Mãi Đặc Biệt
              </h2>
              <p className="text-[14px] text-white/80 mt-2 font-light leading-relaxed max-w-2xl mx-auto">
                Trọn vẹn từng khoảnh khắc sum vầy với những ưu đãi nghỉ dưỡng, ẩm thực và chăm sóc sức khỏe độc quyền.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {homeData.offers.map((offer) => (
                <div
                  key={offer.OfferId}
                  className="bg-[#203044]/80 backdrop-blur-md rounded-2xl p-7 border border-white/10 hover:border-[#b9a277] transition-all hover:shadow-[0_12px_32px_-8px_rgba(185,162,119,0.3)] flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#b9a277]/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#ffd985] text-[11px] font-bold uppercase mb-4 border border-white/10 shadow-xs">
                      {offer.Badge || 'Đặc Biệt'}
                    </div>
                    <span className="text-[26px] font-extrabold text-[#ffd985] block mb-1">
                      {offer.DiscountText}
                    </span>
                    <h3 className="font-serif text-[19px] text-white font-bold mb-1 leading-snug group-hover:text-[#ffd985] transition-colors">
                      {offer.Title}
                    </h3>
                    <p className="text-[12.5px] text-[#ffd985]/80 font-semibold mb-3">
                      {offer.Subtitle}
                    </p>
                    <p className="text-[13px] text-white/75 leading-relaxed mb-6">
                      {offer.Description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[11.5px] text-white/60 font-medium">
                      {offer.ExpiryDate}
                    </span>
                    <a
                      href="#room-collection"
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ffd985] hover:text-white transition-colors"
                    >
                      <span>Áp Dụng</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 5. RESORT AMENITIES SECTION ================= */}
        <section id="trai-nghiem" className="w-full py-20 lg:py-24 bg-[#fafaf8] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Tiện Nghi Đẳng Cấp 5 Sao
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-[#203044] mt-1.5 font-bold tracking-tight leading-[1.25]">
                Chuẩn Mực Nghỉ Dưỡng 5 Sao Quốc Tế
              </h2>
              <p className="text-[14px] text-[#373435]/80 mt-2 leading-relaxed max-w-2xl mx-auto">
                Tận hưởng phong cách sống thượng lưu với chuỗi tiện ích chăm sóc sức khỏe, giải trí và ẩm thực chuẩn quốc tế.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.amenities.map((amenity) => (
                <div
                  key={amenity.AmenityId}
                  className="bg-white rounded-2xl p-6 border border-[#dedad0] hover:border-[#b9a277] hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#203044] text-[#b9a277] flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-[#b9a277] group-hover:text-white transition-all shadow-xs overflow-hidden shrink-0">
                      <span className="material-symbols-outlined text-[26px]">
                        {amenity.IconName || 'hotel'}
                      </span>
                    </div>
                    <h3 className="font-serif text-[17px] text-[#203044] font-bold mb-2 leading-snug group-hover:text-[#b9a277] transition-colors">
                      {amenity.AmenityName}
                    </h3>
                    <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                      {amenity.Description}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#dedad0]/60 flex items-center text-[12px] font-bold text-[#b9a277] gap-1">
                    <span>Đặc quyền phục vụ 24/7</span>
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 6. FEATURED EXPERIENCES SECTION (4 PHOTO CARDS) ================= */}
        <section id="am-thuc" className="w-full py-20 lg:py-24 bg-[#fbf8f2] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Trải Nghiệm Độc Bản
              </span>
              <h2 className="font-serif text-[28px] sm:text-[34px] lg:text-[40px] text-[#203044] mt-1.5 font-bold tracking-tight leading-[1.25]">
                Trải Nghiệm Đặc Sắc Tại Grand Horizon
              </h2>
              <p className="text-[14px] text-[#373435]/80 mt-2 leading-relaxed max-w-2xl mx-auto">
                Khám phá các hành trình ẩm thực, chăm sóc sức khỏe và du ngoạn biển được thiết kế riêng biệt cho từng thượng khách.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#dedad0] hover:border-[#b9a277] hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#203044]">
                    <img
                      src={exp.imageUrl}
                      alt={exp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#203044]/90 backdrop-blur-md rounded-md text-[#ffd985] text-[10px] font-bold uppercase tracking-wider">
                      {exp.tag}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-[17px] font-bold text-[#203044] group-hover:text-[#b9a277] transition-colors mb-2 leading-snug">
                        {exp.title}
                      </h3>
                      <p className="text-[13px] text-[#373435]/80 leading-relaxed line-clamp-3 mb-4">
                        {exp.description}
                      </p>
                    </div>

                    <a
                      href="#room-collection"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#b9a277] hover:text-[#203044] transition-colors pt-2 border-t border-[#dedad0]/60"
                    >
                      <span>Khám Phá Chi Tiết</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 7. GUEST REVIEWS & ELITE MEMBERSHIP ================= */}
        <section className="w-full py-20 lg:py-24 bg-[#fafaf8] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Section Heading placed above grid so both columns align at the top */}
            <div className="mb-8">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Lưu Giữ Khoảnh Khắc
              </span>
              <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight leading-[1.25]">
                Dấu Ấn Kỷ Niệm Khó Phai
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* REVIEWS COLUMN */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {homeData.reviews.slice(0, 4).map((rev) => (
                    <div
                      key={rev.ReviewId}
                      className="bg-white p-6 rounded-2xl border border-[#dedad0] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-1 text-[#b9a277] mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-[15px]">★</span>
                          ))}
                        </div>
                        <h4 className="font-bold text-[14px] text-[#203044] mb-1 leading-snug">
                          {rev.ReviewTitle ? rev.ReviewTitle.replace(/\s*#\d+$/, '').trim() : 'Kỳ nghỉ tuyệt vời'}
                        </h4>
                        <p className="text-[12.5px] text-[#373435]/85 leading-relaxed line-clamp-4 mb-4">
                          "{rev.ReviewBody}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-3 border-t border-[#dedad0]">
                        <div className="w-9 h-9 rounded-full bg-[#203044] text-[#b9a277] flex items-center justify-center font-bold text-[12px]">
                          {(rev.ReviewerName || 'KH').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-[#203044] font-bold leading-tight">
                            {rev.ReviewerName || 'Thượng Khách VIP'}
                          </span>
                          <span className="text-[11px] text-[#8a8782]">
                            {rev.TripClassification || 'Khách Nghỉ Dưỡng'} • {rev.ReviewDate || 'Gần đây'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-1 text-[#373435]/80">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#b9a277] text-[20px]">verified_user</span>
                    <span className="text-[12px] font-medium">Bảo lưu và hoàn cọc linh hoạt 48h</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#b9a277] text-[20px]">lock</span>
                    <span className="text-[12px] font-medium">Thanh toán bảo mật chuẩn SSL 256-bit</span>
                  </div>
                </div>
              </div>

              {/* MEMBERSHIP SIGNUP CARD */}
              <div id="hoi-vien" className="lg:col-span-5 flex flex-col">
                <div className="relative bg-[#203044] text-white p-7 sm:p-9 rounded-2xl overflow-hidden shadow-[0_18px_50px_-28px_rgba(32,48,68,0.7)] border border-[#203044] h-full flex flex-col justify-between">
                  <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[#b9a277]/20 blur-2xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <div className="w-11 h-11 rounded-xl bg-[#b9a277]/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[#b9a277] text-[26px]">stars</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-[#ffd985] font-bold">
                        Grand Horizon Elite Club
                      </span>
                      <h3 className="text-[22px] text-white mt-1 mb-2 font-bold leading-snug">
                        Đăng Ký Hội Viên &amp; Nhận Ngay Ưu Đãi 10%
                      </h3>
                      <p className="text-[13px] text-white/80 mb-6 leading-relaxed">
                        Đặc quyền chiết khấu trực tiếp trên giá phòng, nâng cấp hạng phòng miễn phí tùy tình trạng và dịch vụ xe đưa đón Limousine.
                      </p>
                    </div>

                    <div>
                      {newsletterSuccess ? (
                        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-[13px] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          <span>Đăng ký thành công! Mã ưu đãi ELITE10 đã được gửi đến email của bạn.</span>
                        </div>
                      ) : (
                        <form className="flex flex-col gap-3" onSubmit={(e) => {
                          e.preventDefault();
                          if (newsletterEmail) {
                            setNewsletterSuccess(true);
                          }
                        }}>
                          <div>
                            <input
                              className="w-full h-11 px-3.5 rounded-xl bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15"
                              placeholder="Họ và tên của Quý khách"
                              type="text"
                              value={newsletterName}
                              onChange={(e) => setNewsletterName(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <input
                              className="w-full h-11 px-3.5 rounded-xl bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15"
                              placeholder="Địa chỉ email cá nhân"
                              type="email"
                              value={newsletterEmail}
                              onChange={(e) => setNewsletterEmail(e.target.value)}
                              required
                            />
                          </div>
                          <button
                            className="w-full h-11 mt-1 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                            type="submit"
                          >
                            <span>Trở Thành Hội Viên Grand Horizon Elite</span>
                            <span className="material-symbols-outlined text-[16px]">card_membership</span>
                          </button>
                        </form>
                      )}

                      <p className="text-[11px] text-white/60 text-center mt-4">
                        Không thu phí thường niên • Bảo mật dữ liệu cá nhân theo chuẩn quốc tế
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 8. FREQUENTLY ASKED QUESTIONS (FAQ) ================= */}
        <section id="faq" className="w-full py-16 lg:py-20 bg-[#fbf8f2] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Giải Đáp Thắc Mắc
              </span>
              <h2 className="font-serif text-[26px] lg:text-[34px] text-[#203044] mt-1 font-bold tracking-tight leading-[1.25]">
                Câu Hỏi Thường Gặp
              </h2>
              <p className="text-[13.5px] text-[#373435]/80 mt-1">
                Mọi thông tin chi tiết về nhận phòng, dịch vụ đưa đón và chính sách lưu trú.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {homeData.faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-xl border border-[#dedad0] overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-[14.5px] text-[#203044] hover:text-[#b9a277] transition-colors"
                      type="button"
                    >
                      <span>{faq.question}</span>
                      <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 text-[#b9a277] shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-[13.5px] text-[#373435]/85 leading-relaxed border-t border-[#dedad0]/50 bg-[#fafaf8]/50 animate-fade-in">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <p className="text-[13px] text-[#8a8782]">
                Cần thêm thông tin hỗ trợ? Gọi ngay tổng đài 24/7:{' '}
                <a href="tel:19006868" className="text-[#b9a277] font-bold hover:underline">
                  1900 6868
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* MODALS */}
      <RoomDetailModal
        room={selectedRoomForDetail}
        isOpen={Boolean(selectedRoomForDetail)}
        onClose={() => setSelectedRoomForDetail(null)}
        onBookNow={(room) => {
          setSelectedRoomForDetail(null);
          setSelectedRoomForBooking(room);
        }}
      />

      <QuickBookingModal
        room={selectedRoomForBooking}
        branch={currentBranchName}
        checkIn={checkInDate}
        checkOut={checkOutDate}
        isOpen={Boolean(selectedRoomForBooking)}
        onClose={() => setSelectedRoomForBooking(null)}
      />
    </MainLayout>
  );
}

export default Home;
