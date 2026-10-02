import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { fetchHomeData } from './api/hotelApi';

function App() {
  const [homeData, setHomeData] = useState({
    branches: [],
    featuredRoomTypes: [],
    amenities: [],
    reviews: [],
    stats: null
  });
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestOption, setGuestOption] = useState('2-0-1');
  const [searchNotification, setSearchNotification] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Tải dữ liệu thực tế từ Database thông qua Backend MVC API
    const loadData = async () => {
      setLoading(true);
      const data = await fetchHomeData();
      if (data) {
        setHomeData(data);
        if (data.branches && data.branches.length > 0) {
          setSelectedBranch(data.branches[0].BranchId);
        }
      }
      setLoading(false);
    };

    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const branchObj = homeData.branches.find(b => String(b.BranchId) === String(selectedBranch));
    const branchName = branchObj ? branchObj.BranchName : 'Chi nhánh đã chọn';
    const datesText = (checkInDate && checkOutDate) 
      ? `từ ${checkInDate.split('-').reverse().join('/')} đến ${checkOutDate.split('-').reverse().join('/')}` 
      : 'thời gian linh hoạt';
    setSearchNotification(`Đang kiểm tra phòng trống tại "${branchName}" (${datesText})...`);
    
    const roomSection = document.getElementById('room-collection');
    if (roomSection) {
      roomSection.scrollIntoView({ behavior: 'smooth' });
    }

    setTimeout(() => {
      setSearchNotification('');
    }, 5000);
  };

  const displayBranches = homeData.branches.length > 0 ? homeData.branches : [
    { BranchId: 1, BranchName: 'Grand Horizon Resort Phú Quốc Oasis' },
    { BranchId: 2, BranchName: 'Grand Horizon Cam Ranh Sanctuary' },
    { BranchId: 3, BranchName: 'Grand Horizon Đà Nẵng Heritage' }
  ];

  const displayRoomTypes = homeData.featuredRoomTypes.length > 0 ? homeData.featuredRoomTypes : [
    {
      RoomTypeId: 1,
      TypeName: 'Deluxe Ocean View Suite',
      Description: 'Không gian tĩnh tại với tầm nhìn panorama biển xanh, ban công tắm nắng riêng biệt và nội thất tinh tế.',
      BasePrice: '1700000.00',
      MaxOccupancy: 3,
      AdultCapacity: 2,
      ChildCapacity: 1,
      ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'
    },
    {
      RoomTypeId: 2,
      TypeName: 'Executive Beachfront Villa',
      Description: 'Tầm nhìn 180 độ ôm trọn khoảnh khắc hoàng hôn rực rỡ, hồ bơi riêng tràn bờ và lối dạo biển biệt lập.',
      BasePrice: '2400000.00',
      MaxOccupancy: 4,
      AdultCapacity: 3,
      ChildCapacity: 1,
      ImageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop'
    },
    {
      RoomTypeId: 3,
      TypeName: 'Presidential Penthouse Residence',
      Description: 'Đỉnh cao phong cách sống thượng lưu với dịch vụ quản gia cá nhân hóa 24/7 và tiện nghi hoàng gia.',
      BasePrice: '4500000.00',
      MaxOccupancy: 6,
      AdultCapacity: 4,
      ChildCapacity: 2,
      ImageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'
    }
  ];

  const displayReviews = homeData.reviews.length > 0 ? homeData.reviews : [
    {
      ReviewId: 1,
      ReviewTitle: 'Kỳ nghỉ hoàn hảo đến từng chi tiết',
      ReviewBody: 'Đội ngũ concierge của Grand Horizon thấu hiểu từng mong muốn nhỏ nhất. Không gian tĩnh lặng và ẩm thực tinh hoa khó quên.',
      ReviewerName: 'TS. Trần Hoàng & Phu Nhân',
      TripClassification: 'Kỳ Nghỉ Thượng Lưu',
      OverallRating: '5.0'
    },
    {
      ReviewId: 2,
      ReviewTitle: 'Đẳng cấp dịch vụ vượt ngoài mong đợi',
      ReviewBody: 'Kiến trúc sang trọng hòa quyện cùng bờ biển ngọc lam nguyên sơ. Chắc chắn tôi sẽ quay lại Grand Horizon trong mọi chuyến công tác và nghỉ dưỡng.',
      ReviewerName: 'Madame Mai Lan',
      TripClassification: 'Hội Viên Grand Horizon Elite',
      OverallRating: '5.0'
    }
  ];

  return (
    <div className="font-sans antialiased text-[#373435] bg-[#fafaf8] min-h-screen flex flex-col selection:bg-[#b9a277] selection:text-white">
      <Navbar />

      <main className="w-full pt-20 bg-[#fafaf8] flex-1">
        <div className="flex flex-col w-full">
          {/* HERO BANNER SECTION */}
          <section id="trang-chu" className="relative w-full -mt-20 pt-28 sm:pt-32 pb-12 sm:pb-16 lg:pb-20 overflow-hidden flex flex-col justify-between min-h-[780px] sm:min-h-[820px] lg:min-h-[880px] isolate">
            {/* Background Image - Hoàng hôn resort Grand Horizon */}
            <div 
              className="absolute inset-0 bg-cover bg-center -z-10 scale-100 transition-transform duration-1000" 
              style={{ backgroundImage: 'url("/images/hero-banner.jpg")' }}
            >
            </div>
            {/* Dark & Warm Sunset Gradient Overlay for optimal contrast & readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#14212b]/85 via-[#203044]/45 to-[#14212b]/85 -z-10"></div>
            <div className="absolute top-1/4 right-10 w-96 h-96 rounded-full bg-[#b9a277]/25 blur-3xl pointer-events-none -z-10"></div>
            
            {/* Hero Heading & Subtitle */}
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center pt-4 sm:pt-8 pb-6 sm:pb-8 z-10">
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#14212b]/70 backdrop-blur-md border border-white/20 shadow-md mb-4 sm:mb-6 animate-fade-in max-w-full">
                <span className="material-symbols-outlined text-[#b9a277] text-[16px] sm:text-[18px] shrink-0">verified</span>
                <span className="text-[10px] sm:text-[12px] uppercase tracking-widest text-[#fbf8f2] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                  Grand Horizon Hotels &amp; Resorts — Refined for every journey
                </span>
              </div>

              <h1 className="font-serif font-extrabold text-[30px] sm:text-[44px] lg:text-[54px] text-white tracking-tight max-w-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] leading-[1.2] mb-4 sm:mb-5 px-2">
                Kỳ Nghỉ Thượng Lưu <br className="hidden sm:inline" />
                <span className="italic font-normal text-[#ffd985]">Bên Bờ Biển</span>&nbsp;Thiên&nbsp;Đường
              </h1>

              <p className="text-[14px] sm:text-[15px] lg:text-[16px] text-white/95 max-w-2xl text-center leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] font-normal px-2">
                Khám phá chuẩn mực nghỉ dưỡng cao cấp với dịch vụ cá nhân hóa chuẩn 5 sao, nghệ thuật ẩm thực tinh hoa và không gian tĩnh tại thuần khiết.
              </p>
            </div>

            {/* TOKEN-DRIVEN SEARCH BOX */}
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
                        {displayBranches.map((b) => (
                          <option key={b.BranchId} value={b.BranchId}>
                            {b.BranchName}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3.5 pointer-events-none text-[#8a8782] text-[18px]">expand_more</span>
                    </div>
                  </div>

                  {/* Thời Gian Lưu Trú (col-span-4) - Bo góc xịn sò, NHẬN PHÒNG & TRẢ PHÒNG */}
                  <div className="md:col-span-1 lg:col-span-4 flex flex-col gap-1.5 min-w-0">
                    <label className="text-[11px] text-[#203044] uppercase tracking-wider font-bold flex items-center gap-1.5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px] text-[#b9a277]">calendar_today</span>
                      Thời Gian Lưu Trú
                    </label>
                    <div className="grid grid-cols-2 bg-[#fbf8f2] border border-[#dedad0] rounded-xl h-[50px] relative divide-x divide-[#dedad0] hover:border-[#b9a277] focus-within:border-[#b9a277] focus-within:ring-2 focus-within:ring-[#b9a277]/25 shadow-sm transition-all">
                      {/* NHẬN PHÒNG */}
                      <div 
                        onClick={(e) => {
                          try { e.currentTarget.querySelector('input')?.showPicker(); } catch (err) {}
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

                      {/* PHÒNG ĐI */}
                      <div 
                        onClick={(e) => {
                          try { e.currentTarget.querySelector('input')?.showPicker(); } catch (err) {}
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
                        <option value="6-3-3">Villa Presidential</option>
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
                  <div className="mt-4 p-3 bg-[#fbf8f2] text-[#203044] rounded-xl text-[13px] font-medium flex items-center gap-2 border border-[#b9a277]/40 animate-fade-in shadow-sm">
                    <span className="material-symbols-outlined text-[#b9a277] text-[18px]">info</span>
                    <span>{searchNotification}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* DYNAMIC SYSTEM STATS SECTION (100k records live stats) */}
          <section className="w-full py-12 bg-white border-y border-[#dedad0]/80">
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-[#dedad0]">
                <div className="flex flex-col items-center justify-center p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[32px] text-[#203044] font-extrabold tracking-tight">
                      {homeData.stats?.avgRating ? homeData.stats.avgRating.toFixed(1) : '5.0'}
                    </span>
                    <span className="text-[#b9a277] text-[24px]">★</span>
                  </div>
                  <span className="text-[14px] text-[#203044] font-bold">Hài Lòng Xuất Sắc</span>
                  <span className="text-[12px] text-[#8a8782] mt-0.5">
                    Hơn {homeData.stats?.totalBookings ? homeData.stats.totalBookings.toLocaleString('vi-VN') : '100.000'} lượt khách tin chọn
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[32px] text-[#203044] font-extrabold tracking-tight">
                      {homeData.stats?.totalRooms ? homeData.stats.totalRooms.toLocaleString('vi-VN') : '100.000'}
                    </span>
                    <span className="text-[#b9a277] text-[20px] font-bold self-end mb-1">+</span>
                  </div>
                  <span className="text-[14px] text-[#203044] font-bold">Phòng &amp; Biệt Thự Biển</span>
                  <span className="text-[12px] text-[#8a8782] mt-0.5">
                    Tại {homeData.stats?.totalBranches ? homeData.stats.totalBranches.toLocaleString('vi-VN') : '3'} chi nhánh nghỉ dưỡng
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3">
                  <div className="flex items-center gap-1 mb-1 text-[#b9a277]">
                    <span className="material-symbols-outlined text-[32px]">concierge</span>
                  </div>
                  <span className="text-[14px] text-[#203044] font-bold">Quản Gia Riêng 24/7</span>
                  <span className="text-[12px] text-[#8a8782] mt-0.5">
                    Chuẩn mực phục vụ tận tâm, tinh tế
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[32px] text-[#203044] font-extrabold tracking-tight">100%</span>
                  </div>
                  <span className="text-[14px] text-[#203044] font-bold">Bãi Biển Độc Quyền</span>
                  <span className="text-[12px] text-[#8a8782] mt-0.5">
                    Cát trắng mịn màng &amp; biển ngọc lam
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* DYNAMIC ROOM TYPES COLLECTION (Từ Database bảng RoomTypes) */}
          <section id="room-collection" className="w-full py-16 lg:py-20 bg-[#fafaf8] scroll-mt-24">
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                    Không Gian Nghỉ Dưỡng Tinh Hoa
                  </span>
                  <h2 className="font-serif text-[28px] lg:text-[34px] text-[#203044] mt-1 font-bold tracking-tight">
                    Bộ Sưu Tập Biệt Thự &amp; Phòng Suite
                  </h2>
                </div>
                <p className="text-[14px] text-[#373435]/80 max-w-md leading-relaxed">
                  Được thiết kế tinh tế với vật liệu tự nhiên, hồ bơi riêng tư và không gian mở đón trọn hơi thở đại dương.
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-md overflow-hidden shadow-sm p-4 border border-[#dedad0] animate-pulse">
                      <div className="w-full aspect-[16/10] bg-[#eae8df] rounded-sm mb-4"></div>
                      <div className="h-5 bg-[#eae8df] rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-[#eae8df] rounded w-1/2 mb-4"></div>
                      <div className="h-10 bg-[#eae8df] rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {displayRoomTypes.map((rt, idx) => (
                    <div 
                      key={rt.RoomTypeId || idx} 
                      className="group bg-white rounded-md overflow-hidden shadow-[0_10px_30px_-22px_rgba(32,48,68,0.5)] hover:shadow-[0_18px_50px_-28px_rgba(32,48,68,0.7)] transition-all duration-300 flex flex-col justify-between border border-[#dedad0] hover:-translate-y-1"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#203044]">
                        <img 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100" 
                          alt={rt.TypeName} 
                          src={rt.ImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'} 
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-[#203044]/90 backdrop-blur-md rounded-xs text-[#b9a277] text-[11px] font-bold uppercase tracking-wider">
                          {idx === 0 ? 'Signature Suite' : idx === 1 ? 'Khuyên Chọn' : 'Đẳng Cấp 5 Sao'}
                        </div>
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-xs text-[11px] font-semibold text-[#203044] flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-[#b9a277] text-[15px]">pool</span> Hồ bơi riêng &amp; View biển
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[#8a8782] text-[12px] font-semibold mb-2">
                            <span className="flex items-center gap-1 text-[#203044]">
                              <span className="material-symbols-outlined text-[15px] text-[#b9a277]">group</span> 
                              Tối đa {rt.MaxOccupancy || 2} khách
                            </span>
                            <span>•</span>
                            <span>{rt.AdultCapacity || 2} Người lớn</span>
                            <span>•</span>
                            <span>{rt.ChildCapacity || 1} Trẻ em</span>
                          </div>

                          <h3 className="text-[18px] text-[#203044] font-bold group-hover:text-[#b9a277] transition-colors mb-2">
                            {rt.TypeName}
                          </h3>
                          <p className="text-[13px] text-[#373435]/80 mb-4 line-clamp-2 leading-relaxed">
                            {rt.Description || 'Không gian nghỉ dưỡng tuyệt mỹ giữa biển xanh cát trắng, phong cách sống đẳng cấp tại Grand Horizon.'}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-6">
                            <span className="px-2.5 py-0.5 rounded-xs bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044]">Bữa sáng buffet</span>
                            <span className="px-2.5 py-0.5 rounded-xs bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044]">Đưa đón Limousine</span>
                            <span className="px-2.5 py-0.5 rounded-xs bg-[#fbf8f2] border border-[#dedad0] text-[11px] font-medium text-[#203044]">Trà chiều bãi biển</span>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="pt-4 border-t border-[#dedad0] flex items-center justify-between mt-auto">
                          <div>
                            <span className="text-[10px] text-[#8a8782] font-semibold uppercase block">Giá từ</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[18px] font-extrabold text-[#203044]">
                                {Number(rt.BasePrice || 1700000).toLocaleString('vi-VN')}₫
                              </span>
                              <span className="text-[11px] text-[#8a8782]">/đêm</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="px-3.5 py-2 rounded-xs bg-[#fbf8f2] hover:bg-[#eae8df] text-[#203044] text-[13px] font-semibold border border-[#dedad0] transition-colors" type="button">
                              Chi Tiết
                            </button>
                            <button className="px-4 py-2 rounded-xs bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold shadow-sm transition-all" type="button">
                              Đặt Ngay
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-12 text-center">
                <a className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-white text-[#203044] hover:text-[#b9a277] text-[14px] font-bold shadow-sm hover:shadow-md transition-all border border-[#dedad0]" href="#room-collection">
                  <span>Xem Toàn Bộ Hạng Phòng &amp; Biệt Thự Grand Horizon</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </section>

          {/* TRẢI NGHIỆM ĐẶC QUYỀN GRAND HORIZON */}
          <section id="trai-nghiem" className="w-full py-16 bg-[#fbf8f2] border-t border-[#dedad0]/80">
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">Đặc Quyền Nghỉ Dưỡng</span>
                <h2 className="font-serif text-[28px] lg:text-[34px] text-[#203044] mt-1 font-bold tracking-tight">Trải Nghiệm Độc Bản Tại Grand Horizon</h2>
                <p className="text-[14px] text-[#373435]/80 mt-2 leading-relaxed">
                  Mỗi khoảnh khắc tại Grand Horizon Hotels &amp; Resorts được chăm chút chu đáo, mang đến sự tĩnh tại và thăng hoa tinh thần.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-md overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
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
                    <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#">
                      Đặt Lịch Trị Liệu <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-md overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
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
                    <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#">
                      Khám Phá Thực Đơn <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-md overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
                  <div className="h-48 w-full overflow-hidden relative">
                    <img className="w-full h-full object-cover" alt="Pool" src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2070&auto=format&fit=crop" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-white text-[12px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#b9a277] text-[18px]">waves</span> Thư Giãn Đỉnh Cao
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[16px] text-[#203044] font-bold mb-1">Hồ Bơi Vô Cực Biển</h3>
                      <p className="text-[13px] text-[#373435]/80 leading-relaxed">
                        Hồ bơi nước mặn hướng thẳng đường chân trời, thưởng thức cocktail mát lạnh bên quầy bar nổi.
                      </p>
                    </div>
                    <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#">
                      Xem Tiện Ích <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-md overflow-hidden shadow-sm hover:-translate-y-1.5 transition-transform duration-300 flex flex-col border border-[#dedad0]">
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
                    <a className="inline-flex items-center gap-1 text-[13px] font-bold text-[#b9a277] hover:text-[#203044] mt-4" href="#">
                      Đặt Hải Trình <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DYNAMIC CUSTOMER REVIEWS (Từ Database bảng Reviews) */}
          <section className="w-full py-16 lg:py-20 bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                      Chia Sẻ Từ Thượng Khách
                    </span>
                    <h2 className="font-serif text-[28px] lg:text-[34px] text-[#203044] mt-1 font-bold tracking-tight">
                      Dấu Ấn Kỷ Niệm Khó Phai
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayReviews.map((rev, idx) => (
                      <div key={rev.ReviewId || idx} className="bg-[#fafaf8] p-6 rounded-md shadow-sm flex flex-col justify-between border border-[#dedad0]">
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
                              {rev.TripClassification || 'Khách Nghỉ Dưỡng'} • Đánh giá 5 sao
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 pt-2 text-[#373435]/80">
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
                  <div className="relative bg-[#203044] text-white p-8 rounded-md overflow-hidden shadow-[0_18px_50px_-28px_rgba(32,48,68,0.7)] border border-[#203044]">
                    <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-[#b9a277]/20 blur-2xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col">
                      <div className="w-10 h-10 rounded-sm bg-[#b9a277]/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[#b9a277] text-[24px]">stars</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-[#b9a277] font-bold">
                        Grand Horizon Elite Club
                      </span>
                      <h3 className="text-[22px] text-white mt-1 mb-2 font-bold leading-snug">
                        Đăng Ký Hội Viên &amp; Nhận Ngay Ưu Đãi 10%
                      </h3>
                      <p className="text-[13px] text-white/80 mb-6 leading-relaxed">
                        Đặc quyền chiết khấu trực tiếp trên giá phòng, nâng cấp hạng phòng miễn phí tùy tình trạng và dịch vụ xe đưa đón Limousine.
                      </p>
                      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); alert('Chúc mừng Quý khách đã đăng ký Hội viên Grand Horizon Elite thành công!'); }}>
                        <div>
                          <input className="w-full h-11 px-3.5 rounded-sm bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15" placeholder="Họ và tên của Quý khách" type="text" required />
                        </div>
                        <div>
                          <input className="w-full h-11 px-3.5 rounded-sm bg-white/10 text-white placeholder-white/50 text-[13px] focus:outline-none focus:bg-white/20 transition-all border border-white/15" placeholder="Địa chỉ email cá nhân" type="email" required />
                        </div>
                        <button className="w-full h-11 mt-1 rounded-sm bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-md" type="submit">
                          <span>Trở Thành Hội Viên Grand Horizon Elite</span>
                          <span className="material-symbols-outlined text-[16px]">card_membership</span>
                        </button>
                      </form>
                      <p className="text-[11px] text-white/60 text-center mt-3">
                        Không thu phí thường niên • Bảo mật dữ liệu cá nhân theo chuẩn quốc tế
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
