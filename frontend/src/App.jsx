import React, { useState, useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import RoomDetailModal from './components/modals/RoomDetailModal';
import QuickBookingModal from './components/modals/QuickBookingModal';
import { fetchHomeData } from './api/hotelApi';
import {
  mockBranches,
  mockRoomTypes,
  mockAmenities,
  mockSpecialOffers,
  mockReviews,
  mockFaqs,
  mockStats
} from './data/mockHomeData';

function App() {
  const [homeData, setHomeData] = useState({
    branches: mockBranches,
    featuredRoomTypes: mockRoomTypes,
    amenities: mockAmenities,
    offers: mockSpecialOffers,
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
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadData = async () => {
      try {
        const liveData = await fetchHomeData();
        if (liveData && liveData.featuredRoomTypes && liveData.featuredRoomTypes.length > 0) {
          setHomeData(prev => ({
            ...prev,
            branches: liveData.branches?.length ? liveData.branches : mockBranches,
            featuredRoomTypes: liveData.featuredRoomTypes?.length ? liveData.featuredRoomTypes : mockRoomTypes,
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

  // Xử lý Tìm Phòng
  const handleSearch = (e) => {
    e.preventDefault();
    const branchObj = homeData.branches.find(b => String(b.BranchId) === String(selectedBranch));
    const branchName = branchObj ? branchObj.BranchName : 'Chi nhánh đã chọn';

    let nights = 0;
    if (checkInDate && checkOutDate) {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
    }

    const datesText = (checkInDate && checkOutDate)
      ? `${nights} đêm (${checkInDate.split('-').reverse().join('/')} đến ${checkOutDate.split('-').reverse().join('/')})`
      : 'thời gian linh hoạt';

    setSearchNotification(`Đã tìm thấy phòng trống sẵn sàng tại "${branchName}" cho ${datesText}. Vui lòng chọn hạng phòng bên dưới!`);

    const roomSection = document.getElementById('room-collection');
    if (roomSection) {
      roomSection.scrollIntoView({ behavior: 'smooth' });
    }

    setTimeout(() => {
      setSearchNotification('');
    }, 8000);
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
    <MainLayout wishlistCount={wishlist.length}>
      <div className="flex flex-col w-full">

        {/* ================= HERO BANNER SECTION ================= */}
        <section id="trang-chu" className="relative w-full -mt-20 pt-28 sm:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-hidden flex flex-col justify-between min-h-[780px] sm:min-h-[820px] lg:min-h-[880px] isolate">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center -z-10 scale-100 transition-transform duration-1000"
            style={{ backgroundImage: 'url("/images/hero-banner.jpg")' }}
          >
          </div>
          {/* Gradient Overlay for optimal contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#14212b]/85 via-[#203044]/55 to-[#14212b]/90 -z-10"></div>
          <div className="absolute top-1/4 right-10 w-96 h-96 rounded-full bg-[#b9a277]/25 blur-3xl pointer-events-none -z-10"></div>

          {/* Hero Heading & Subtitle */}
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center pt-4 sm:pt-8 pb-6 sm:pb-8 z-10">
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#14212b]/70 backdrop-blur-md border border-white/20 shadow-md mb-4 sm:mb-6 animate-fade-in max-w-full">
              <span className="material-symbols-outlined text-[#b9a277] text-[16px] sm:text-[18px] shrink-0">verified</span>
              <span className="text-[10px] sm:text-[12px] uppercase tracking-widest text-[#fbf8f2] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                Grand Horizon Hotels &amp; Resorts — Refined for every journey
              </span>
            </div>

            <h1 className="font-serif font-extrabold text-[32px] sm:text-[46px] lg:text-[56px] text-white tracking-tight max-w-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] leading-[1.2] mb-4 sm:mb-5 px-2">
              Kỳ Nghỉ Thượng Lưu <br className="hidden sm:inline" />
              <span className="italic font-normal text-[#ffd985]">Bên Bờ Biển</span>&nbsp;Thiên&nbsp;Đường
            </h1>

            <p className="text-[14px] sm:text-[16px] text-white/95 max-w-2xl text-center leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] font-normal px-2">
              Khám phá chuẩn mực nghỉ dưỡng cao cấp với dịch vụ cá nhân hóa chuẩn 5 sao, nghệ thuật ẩm thực tinh hoa và không gian tĩnh tại thuần khiết bên đại dương.
            </p>

            {/* Quick Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-white/90 text-[12px] sm:text-[13px] font-medium">
              <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="material-symbols-outlined text-[#b9a277] text-[16px]">pool</span> Hồ bơi vô cực riêng
              </span>
              <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="material-symbols-outlined text-[#b9a277] text-[16px]">concierge</span> Quản gia cá nhân 24/7
              </span>
              <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="material-symbols-outlined text-[#b9a277] text-[16px]">restaurant</span> Bữa sáng buffet 5 sao
              </span>
            </div>
          </div>

          {/* SEARCH BOX ENGINE */}
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-2 z-10">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-20px_rgba(20,33,43,0.35)] p-4 sm:p-6 lg:p-7 border border-[#dedad0]">
              <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 lg:gap-4 items-end" onSubmit={handleSearch}>
                {/* Chi Nhánh (col-span-4) */}
                <div className="md:col-span-1 lg:col-span-4 flex flex-col gap-1.5 min-w-0">
                  <label className="text-[11px] text-[#203044] uppercase tracking-wider font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">location_on</span>
                    Điểm Đến &amp; Chi Nhánh
                  </label>
                  <div className="relative bg-[#fbf8f2] border border-[#dedad0] rounded-xl px-3.5 h-[50px] flex items-center justify-between hover:border-[#b9a277] focus-within:border-[#b9a277] focus-within:ring-2 focus-within:ring-[#b9a277]/25 shadow-sm transition-all">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full bg-transparent text-[13px] sm:text-[14px] text-[#203044] font-semibold focus:outline-none cursor-pointer appearance-none pr-6"
                    >
                      {homeData.branches.map((b) => (
                        <option key={b.BranchId} value={b.BranchId}>
                          {b.BranchName}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3.5 pointer-events-none text-[#8a8782] text-[18px]">expand_more</span>
                  </div>
                </div>

                {/* Thời Gian Lưu Trú (col-span-4) */}
                <div className="md:col-span-1 lg:col-span-4 flex flex-col gap-1.5 min-w-0">
                  <label className="text-[11px] text-[#203044] uppercase tracking-wider font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">calendar_today</span>
                    Thời Gian Lưu Trú
                  </label>
                  <div className="grid grid-cols-2 bg-[#fbf8f2] border border-[#dedad0] rounded-xl h-[50px] relative divide-x divide-[#dedad0] hover:border-[#b9a277] focus-within:border-[#b9a277] focus-within:ring-2 focus-within:ring-[#b9a277]/25 shadow-sm transition-all">
                    {/* NHẬN PHÒNG */}
                    <div
                      onClick={(e) => {
                        try { e.currentTarget.querySelector('input')?.showPicker(); } catch (err) { }
                      }}
                      className="relative flex flex-col justify-center px-3.5 sm:px-4 h-full cursor-pointer hover:bg-black/[0.03] transition-colors rounded-l-xl group overflow-hidden select-none"
                    >
                      <span className="text-[9px] sm:text-[10px] text-[#8a8782] font-bold uppercase tracking-wider leading-none mb-1">
                        NHẬN PHÒNG
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-[#b9a277] shrink-0 group-hover:scale-105 transition-transform">calendar_today</span>
                        <span className={`text-[12px] sm:text-[13px] truncate ${checkInDate ? 'font-semibold text-[#203044]' : 'text-[#8a8782] font-normal'}`}>
                          {checkInDate ? checkInDate.split('-').reverse().join('/') : 'Ngày đến'}
                        </span>
                      </div>
                      <input
                        type="date"
                        min={todayStr}
                        value={checkInDate}
                        onChange={(e) => {
                          setCheckInDate(e.target.value);
                          if (!checkOutDate || e.target.value >= checkOutDate) {
                            const next = new Date(e.target.value);
                            next.setDate(next.getDate() + 1);
                            setCheckOutDate(next.toISOString().split('T')[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                    </div>

                    {/* TRẢ PHÒNG */}
                    <div
                      onClick={(e) => {
                        try { e.currentTarget.querySelector('input')?.showPicker(); } catch (err) { }
                      }}
                      className="relative flex flex-col justify-center px-3.5 sm:px-4 h-full cursor-pointer hover:bg-black/[0.03] transition-colors rounded-r-xl group overflow-hidden select-none"
                    >
                      <span className="text-[9px] sm:text-[10px] text-[#8a8782] font-bold uppercase tracking-wider leading-none mb-1">
                        TRẢ PHÒNG
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-[#b9a277] shrink-0 group-hover:scale-105 transition-transform">calendar_today</span>
                        <span className={`text-[12px] sm:text-[13px] truncate ${checkOutDate ? 'font-semibold text-[#203044]' : 'text-[#8a8782] font-normal'}`}>
                          {checkOutDate ? checkOutDate.split('-').reverse().join('/') : 'Ngày đi'}
                        </span>
                      </div>
                      <input
                        type="date"
                        min={checkInDate || todayStr}
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Số Khách & Phòng (col-span-2) */}
                <div className="md:col-span-1 lg:col-span-2 flex flex-col gap-1.5 min-w-0">
                  <label className="text-[11px] text-[#203044] uppercase tracking-wider font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[16px] text-[#b9a277]">group</span>
                    Số Khách &amp; Phòng
                  </label>
                  <div className="relative bg-[#fbf8f2] border border-[#dedad0] rounded-xl px-3.5 h-[50px] flex items-center justify-between hover:border-[#b9a277] focus-within:border-[#b9a277] focus-within:ring-2 focus-within:ring-[#b9a277]/25 shadow-sm transition-all">
                    <select
                      value={guestOption}
                      onChange={(e) => setGuestOption(e.target.value)}
                      className="w-full bg-transparent text-[13px] text-[#203044] font-semibold focus:outline-none cursor-pointer appearance-none pr-5 truncate"
                    >
                      <option value="2-0-1">2 Người lớn • 1 Phòng</option>
                      <option value="2-1-1">2 Người lớn, 1 Trẻ em</option>
                      <option value="4-2-2">4 Người lớn • Villa 2P</option>
                      <option value="6-3-3">Villa Presidential (6 khách)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[#8a8782] text-[18px]">expand_more</span>
                  </div>
                </div>

                {/* Nút Tìm Phòng (col-span-2) */}
                <div className="md:col-span-1 lg:col-span-2">
                  <button
                    className="w-full h-[50px] rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white flex items-center justify-center gap-2 text-[14px] font-bold transition-all shadow-[0_12px_32px_-8px_rgba(185,162,119,0.7)] hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    <span className="whitespace-nowrap">Tìm Phòng</span>
                  </button>
                </div>
              </form>

              {searchNotification && (
                <div className="mt-4 p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-[13px] font-medium flex items-center gap-2.5 border border-emerald-200 animate-fade-in shadow-sm">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                  <span className="flex-1">{searchNotification}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= DYNAMIC SYSTEM STATS SECTION ================= */}
        <section className="w-full py-10 sm:py-12 bg-white border-y border-[#dedad0]/80">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-[#dedad0]">
              <div className="flex flex-col items-center justify-center p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[32px] sm:text-[36px] text-[#203044] font-extrabold tracking-tight">
                    {homeData.stats?.avgRating || '4.95'}
                  </span>
                  <span className="text-[#b9a277] text-[24px]">★</span>
                </div>
                <span className="text-[14px] text-[#203044] font-bold">Hài Lòng Xuất Sắc</span>
                <span className="text-[12px] text-[#8a8782] mt-0.5">
                  Hơn {homeData.stats?.totalBookings ? homeData.stats.totalBookings.toLocaleString('vi-VN') : '125.000'} lượt khách tin chọn
                </span>
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

        {/* ================= ROOM COLLECTION SECTION ================= */}
        <section id="room-collection" className="w-full py-16 lg:py-24 bg-[#fafaf8] scroll-mt-24">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                  Không Gian Nghỉ Dưỡng Tinh Hoa
                </span>
                <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight">
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

            {/* Room Cards Grid */}
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
                        {/* Specs Overview */}
                        <div className="flex items-center gap-2 text-[#8a8782] text-[12px] font-semibold mb-2">
                          <span className="flex items-center gap-1 text-[#203044]">
                            <span className="material-symbols-outlined text-[15px] text-[#b9a277]">group</span>
                            Tối đa {rt.MaxOccupancy || 3} khách
                          </span>
                          <span>•</span>
                          <span>{rt.SizeM2 || 60}m²</span>
                          <span>•</span>
                          <span className="truncate">{rt.BedType || '1 Giường King'}</span>
                        </div>

                        <h3 className="text-[19px] text-[#203044] font-bold group-hover:text-[#b9a277] transition-colors mb-2 leading-snug">
                          {rt.TypeName}
                        </h3>
                        <p className="text-[13px] text-[#373435]/80 mb-4 line-clamp-2 leading-relaxed">
                          {rt.Description}
                        </p>

                        {/* Amenity tags */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">restaurant</span> Bữa sáng 5★
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">wifi</span> Wifi tốc độ cao
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

        {/* ================= SPECIAL OFFERS & PROMOTIONS SECTION ================= */}
        <section id="uu-dai" className="w-full py-16 bg-[#203044] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#b9a277]/10 blur-3xl pointer-events-none"></div>
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] uppercase tracking-widest text-[#ffd985] font-bold">
                Đặc Quyền Mùa Nghỉ Dưỡng 2026
              </span>
              <h2 className="font-serif text-[28px] lg:text-[36px] text-white mt-1 font-bold tracking-tight">
                Gói Ưu Đãi &amp; Khuyến Mãi Độc Bản
              </h2>
              <p className="text-[14px] text-white/80 mt-2 leading-relaxed">
                Trải nghiệm kỳ nghỉ xa hoa với chi phí ưu đãi nhất khi đặt trực tiếp tại Grand Horizon.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {homeData.offers.map((offer) => (
                <div
                  key={offer.OfferId}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-white/15 hover:border-[#b9a277] transition-all flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full bg-[#b9a277] text-white text-[11px] font-bold uppercase tracking-wider">
                        {offer.Badge}
                      </span>
                      <span className="text-[15px] font-extrabold text-[#ffd985]">
                        {offer.DiscountText}
                      </span>
                    </div>

                    <h3 className="text-[19px] font-bold text-white mb-2 leading-snug group-hover:text-[#ffd985] transition-colors">
                      {offer.Title}
                    </h3>
                    <span className="text-[12px] text-[#ffd985] font-medium block mb-3">
                      {offer.Subtitle}
                    </span>
                    <p className="text-[13px] text-white/80 leading-relaxed mb-6">
                      {offer.Description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-white/60">
                      {offer.ExpiryDate}
                    </span>
                    <a
                      href="#room-collection"
                      className="inline-flex items-center gap-1 text-[13px] font-bold text-[#ffd985] hover:text-white transition-colors"
                    >
                      <span>Nhận Ưu Đãi</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 5-STAR AMENITIES SHOWCASE ================= */}
        <section className="w-full py-16 lg:py-24 bg-white border-b border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Tiện Nghi Hoàng Gia
              </span>
              <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight">
                Chuẩn Mực Nghỉ Dưỡng 5 Sao Quốc Tế
              </h2>
              <p className="text-[14px] text-[#373435]/80 mt-2 leading-relaxed">
                Mọi tiện ích tại Grand Horizon được kiến tạo để tôn vinh sự riêng tư và tái tạo năng lượng sống thuần khiết.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {homeData.amenities.map((am) => (
                <div
                  key={am.AmenityId}
                  className="p-5 sm:p-6 rounded-2xl bg-[#fafaf8] border border-[#dedad0] hover:border-[#b9a277] hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#203044] text-[#b9a277] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#b9a277] group-hover:text-white transition-all shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">{am.IconName || 'star'}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#203044] mb-2 leading-snug">
                    {am.AmenityName}
                  </h3>
                  <p className="text-[12.5px] text-[#373435]/80 leading-relaxed">
                    {am.Description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= EXPERIENCES & DINING SECTION ================= */}
        <section id="trai-nghiem" className="w-full py-16 lg:py-24 bg-[#fbf8f2] border-t border-[#dedad0]/80">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">Đặc Quyền Thượng Lưu</span>
              <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight">Trải Nghiệm Độc Bản Tại Grand Horizon</h2>
              <p className="text-[14px] text-[#373435]/80 mt-2 leading-relaxed">
                Mỗi khoảnh khắc tại Grand Horizon Hotels &amp; Resorts được chăm chút chu đáo, mang đến sự tĩnh tại và thăng hoa tinh thần.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
                <div className="h-48 w-full overflow-hidden relative">
                  <img className="w-full h-full object-cover" alt="Spa" src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-white text-[12px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#b9a277] text-[18px]">spa</span> Trị Liệu Trẻ Hóa
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[16px] text-[#203044] font-bold mb-1">Grand Horizon Wellness &amp; Spa</h3>
                    <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                      Liệu pháp bấm huyệt cổ truyền kết hợp tinh dầu thảo mộc bản địa, tái tạo nguồn năng lượng sống.
                    </p>
                  </div>
                  <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#hoi-vien">
                    Đặt Lịch Trị Liệu <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>

              <div id="am-thuc" className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
                <div className="h-48 w-full overflow-hidden relative">
                  <img className="w-full h-full object-cover" alt="Dining" src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-white text-[12px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#b9a277] text-[18px]">restaurant</span> Hải Sản Fine Dining
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[16px] text-[#203044] font-bold mb-1">Nhà Hàng Biển 'The Azure'</h3>
                    <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                      Hải sản tươi sống đánh bắt trong ngày chế biến theo phong cách fusion chuẩn Michelin danh tiếng.
                    </p>
                  </div>
                  <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#hoi-vien">
                    Khám Phá Thực Đơn <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
                <div className="h-48 w-full overflow-hidden relative">
                  <img className="w-full h-full object-cover" alt="Pool" src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2070&auto=format&fit=crop" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-white text-[12px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#b9a277] text-[18px]">waves</span> Thư Giãn Đỉnh Cao
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[16px] text-[#203044] font-bold mb-1">Hồ Bơi Vô Cực Chân Mây</h3>
                    <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                      Hồ bơi nước mặn hướng thẳng đường chân trời, thưởng thức cocktail mát lạnh bên quầy bar nổi.
                    </p>
                  </div>
                  <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#hoi-vien">
                    Xem Tiện Ích <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
                <div className="h-48 w-full overflow-hidden relative">
                  <img className="w-full h-full object-cover" alt="Yacht" src="https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=2070&auto=format&fit=crop" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 text-white text-[12px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#b9a277] text-[18px]">sailing</span> Du Thuyền Riêng Biệt
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[16px] text-[#203044] font-bold mb-1">Du Thuyền Hoàng Hôn VIP</h3>
                    <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                      Hành trình thưởng lãm hoàng hôn vịnh biển kèm rượu vang thượng hạng và tiệc canapé riêng tư.
                    </p>
                  </div>
                  <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#hoi-vien">
                    Đặt Hải Trình <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= GUEST REVIEWS & MEMBERSHIP SECTION ================= */}
        <section className="w-full py-16 lg:py-24 bg-white">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                    Chia Sẻ Từ Thượng Khách
                  </span>
                  <h2 className="font-serif text-[28px] lg:text-[36px] text-[#203044] mt-1 font-bold tracking-tight">
                    Dấu Ấn Kỷ Niệm Khó Phai
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {homeData.reviews.map((rev) => (
                    <div key={rev.ReviewId} className="bg-[#fafaf8] p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-[#dedad0]">
                      <div>
                        <div className="flex text-[#b9a277] mb-2 text-[15px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                        <h4 className="text-[15px] font-bold text-[#203044] mb-2">{rev.ReviewTitle}</h4>
                        <p className="text-[13px] text-[#373435]/80 italic mb-4 line-clamp-3 leading-relaxed">
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

                <div className="flex flex-wrap items-center gap-6 pt-2 text-[#373435]/80">
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
              <div id="hoi-vien" className="lg:col-span-5">
                <div className="relative bg-[#203044] text-white p-7 sm:p-9 rounded-2xl overflow-hidden shadow-[0_18px_50px_-28px_rgba(32,48,68,0.7)] border border-[#203044]">
                  <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[#b9a277]/20 blur-2xl pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col">
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
                          className="w-full h-11 mt-1 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                          type="submit"
                        >
                          <span>Trở Thành Hội Viên Grand Horizon Elite</span>
                          <span className="material-symbols-outlined text-[16px]">card_membership</span>
                        </button>
                      </form>
                    )}

                    <p className="text-[11px] text-white/60 text-center mt-3">
                      Không thu phí thường niên • Bảo mật dữ liệu cá nhân theo chuẩn quốc tế
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FREQUENTLY ASKED QUESTIONS (FAQ) ================= */}
        <section id="faq" className="w-full py-16 lg:py-20 bg-[#fbf8f2] border-t border-[#dedad0]">
          <div className="w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                Giải Đáp Thắc Mắc
              </span>
              <h2 className="font-serif text-[26px] lg:text-[34px] text-[#203044] mt-1 font-bold tracking-tight">
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

export default App;
