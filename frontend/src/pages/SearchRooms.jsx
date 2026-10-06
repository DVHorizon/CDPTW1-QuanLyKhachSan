import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import RoomDetailModal from '../components/modals/RoomDetailModal';
import QuickBookingModal from '../components/modals/QuickBookingModal';
import { searchRoomsApi, getBranchesApi } from '../api/roomApi';

// Helper format VND
const formatVND = (num) => {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
};

// Helper tính số ngày hôm nay
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper cộng thêm N ngày
const addDays = (dateStr, days = 1) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format ngày hiển thị DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
};

export default function SearchRooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const todayStr = getTodayString();
  const defaultCheckIn = addDays(todayStr, 7);
  const defaultCheckOut = addDays(defaultCheckIn, 3);

  // Search parameters state
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '1');
  const [checkInDate, setCheckInDate] = useState(searchParams.get('checkInDate') || defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(searchParams.get('checkOutDate') || defaultCheckOut);
  const [totalGuests, setTotalGuests] = useState(parseInt(searchParams.get('totalGuests'), 10) || 2);
  const [roomsCount, setRoomsCount] = useState(parseInt(searchParams.get('roomsCount'), 10) || 1);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');

  // Filter states
  const [priceMax, setPriceMax] = useState(25000000);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([
    'Villa Riêng Tư',
    'Suite Cao Cấp',
    'Deluxe Hướng Biển'
  ]);
  const [selectedView, setSelectedView] = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState([
    'Hồ bơi riêng (Private Pool)',
    'Ban công ngắm hoàng hôn',
    'Bữa sáng Buffet kèm theo'
  ]);
  const [selectedRating, setSelectedRating] = useState('all');
  const [sortBy, setSortBy] = useState('price_asc');

  // UI state
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [searchEngineMeta, setSearchEngineMeta] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);

  // Tính số đêm lưu trú
  const numberOfNights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 1;
    const d1 = new Date(checkInDate + 'T00:00:00');
    const d2 = new Date(checkOutDate + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  // Lấy danh sách chi nhánh
  useEffect(() => {
    const loadBranches = async () => {
      const data = await getBranchesApi();
      setBranches(data);
    };
    loadBranches();
  }, []);

  // Xử lý auto-jump ngày trả phòng khi đổi ngày nhận phòng (Business Rule 3.1)
  const handleCheckInChange = (newCheckIn) => {
    setCheckInDate(newCheckIn);
    setValidationError('');
    // Rule: Khi người dùng chọn lại checkInDate >= checkOutDate, tự động nhảy checkOutDate = checkInDate + 1
    if (newCheckIn >= checkOutDate) {
      setCheckOutDate(addDays(newCheckIn, 1));
    }
  };

  const handleCheckOutChange = (newCheckOut) => {
    setCheckOutDate(newCheckOut);
    setValidationError('');
  };

  // Hàm thực hiện tìm kiếm phòng
  const executeSearch = async (overrideParams = {}) => {
    setValidationError('');
    setErrorMessage('');

    const targetCheckIn = overrideParams.checkInDate || checkInDate;
    const targetCheckOut = overrideParams.checkOutDate || checkOutDate;
    const targetKeyword = overrideParams.keyword !== undefined ? overrideParams.keyword : keyword;

    // Bước 3 trong luồng: Client Validation
    // Validate TC01: checkInDate < Today -> ERROR_0012_DATE_PAST
    if (targetCheckIn < todayStr) {
      const msg = 'Ngày nhận phòng không được ở trong quá khứ';
      setValidationError(msg);
      return;
    }

    // Validate TC02: checkOutDate <= checkInDate -> ERROR_0013_INVALID_DATE_RANGE
    if (targetCheckOut <= targetCheckIn) {
      const msg = 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm';
      setValidationError(msg);
      return;
    }

    // Validate TC03: Lưu trú vượt quá 30 đêm -> ERROR_0018_MAX_STAY_EXCEEDED
    const d1 = new Date(targetCheckIn + 'T00:00:00');
    const d2 = new Date(targetCheckOut + 'T00:00:00');
    const nights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (nights > 30) {
      const msg = 'Hệ thống chỉ hỗ trợ đặt phòng tối đa 30 đêm trực tuyến';
      setValidationError(msg);
      return;
    }

    // Validate Keyword length: > 100 ký tự -> ERROR_0003_MAX_LENGTH
    if (targetKeyword && targetKeyword.trim().length > 100) {
      const msg = 'Từ khóa tìm kiếm không được vượt quá 100 ký tự';
      setValidationError(msg);
      return;
    }

    setLoading(true);

    const queryParams = {
      branchId: overrideParams.branchId || branchId,
      checkInDate: targetCheckIn,
      checkOutDate: targetCheckOut,
      totalGuests: overrideParams.totalGuests || totalGuests,
      keyword: targetKeyword,
      priceMax,
      roomTypes: selectedRoomTypes,
      view: selectedView,
      amenities: selectedAmenities,
      rating: selectedRating === '4.5' ? '4.5' : selectedRating === '4.0' ? '4.0' : undefined,
      sortBy
    };

    // Cập nhật search params trên URL
    const newParams = new URLSearchParams();
    if (queryParams.branchId && queryParams.branchId !== 'all') newParams.set('branchId', queryParams.branchId);
    newParams.set('checkInDate', queryParams.checkInDate);
    newParams.set('checkOutDate', queryParams.checkOutDate);
    newParams.set('totalGuests', queryParams.totalGuests);
    if (queryParams.keyword) newParams.set('keyword', queryParams.keyword);
    setSearchParams(newParams, { replace: true });

    const result = await searchRoomsApi(queryParams);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Đã xảy ra lỗi khi tìm kiếm');
      setRooms([]);
      return;
    }

    if (result.errorCode === 'ERROR_0014_NO_RESULT' || !result.data || result.data.length === 0) {
      setErrorMessage(result.message || 'Không tìm thấy phòng trống phù hợp với khoảng thời gian đã chọn');
      setRooms([]);
    } else {
      setRooms(result.data);
      setErrorMessage('');
    }

    if (result.searchEngine) {
      setSearchEngineMeta(result.searchEngine);
    }
  };

  // Tự động tìm kiếm lần đầu khi mount
  useEffect(() => {
    executeSearch();
  }, [selectedRoomTypes, selectedView, selectedAmenities, selectedRating, sortBy, priceMax]);

  // Xử lý Wishlist
  const toggleWishlist = (roomId) => {
    setWishlist(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  // Reset toàn bộ bộ lọc
  const handleResetFilters = () => {
    setPriceMax(25000000);
    setSelectedRoomTypes([
      'Villa Riêng Tư',
      'Suite Cao Cấp',
      'Deluxe Hướng Biển',
      'Standard Garden'
    ]);
    setSelectedView('all');
    setSelectedAmenities([
      'Hồ bơi riêng (Private Pool)',
      'Bồn tắm nằm Jacuzzi',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'Dịch vụ quản gia 24/7'
    ]);
    setSelectedRating('all');
    setKeyword('');
    setSortBy('price_asc');
  };

  // Tên chi nhánh hiện tại
  const currentBranchObj = branches.find(b => String(b.BranchId) === String(branchId));
  const currentBranchName = currentBranchObj ? currentBranchObj.BranchName : 'Grand Horizon Phú Quốc';

  return (
    <MainLayout
      wishlistCount={wishlist.length}
      onWishlistClick={() => {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }}
    >
      <div className="flex flex-col w-full">

        {/* ══════════════════════════════════════════════════════════════
            DYNAMIC SEARCH STRIP (STICKY TOP-20)
        ══════════════════════════════════════════════════════════════ */}
        <section className="sticky top-20 z-40 w-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md py-space-md px-margin border-b border-[#dedad0]/50">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-space-sm">
            
            {/* Thanh tìm kiếm chính */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
              
              {/* 1. Destination / Khu nghỉ dưỡng */}
              <div className="lg:col-span-3 flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container-low rounded-xl border border-transparent hover:border-secondary/30 transition-colors">
                <span className="material-symbols-outlined text-secondary text-[24px]">location_on</span>
                <div className="flex flex-col min-w-0 w-full">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Khu nghỉ dưỡng</span>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer truncate w-full"
                  >
                    <option value="all">Tất Cả Chi Nhánh</option>
                    {branches.length > 0 ? (
                      branches.map(b => (
                        <option key={b.BranchId} value={b.BranchId}>
                          {b.BranchName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1">Grand Horizon Phú Quốc</option>
                        <option value="2">Grand Horizon Cam Ranh</option>
                        <option value="3">Grand Horizon Côn Đảo</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 2. Date Interval Selector */}
              <div className="lg:col-span-4 flex items-center justify-between px-space-md py-space-sm bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors border border-transparent hover:border-secondary/30">
                <div className="flex items-center gap-space-sm flex-1">
                  <span className="material-symbols-outlined text-secondary text-[24px]">calendar_today</span>
                  <div className="flex flex-col flex-1">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Nhận phòng — Trả phòng</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        min={todayStr}
                        value={checkInDate}
                        onChange={(e) => handleCheckInChange(e.target.value)}
                        className="bg-transparent text-[13.5px] font-semibold text-on-surface focus:outline-none cursor-pointer w-[122px]"
                      />
                      <span className="text-secondary font-bold">—</span>
                      <input
                        type="date"
                        min={addDays(checkInDate, 1)}
                        value={checkOutDate}
                        onChange={(e) => handleCheckOutChange(e.target.value)}
                        className="bg-transparent text-[13.5px] font-semibold text-on-surface focus:outline-none cursor-pointer w-[122px]"
                      />
                    </div>
                  </div>
                </div>
                <span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shrink-0 font-bold">
                  {numberOfNights} đêm
                </span>
              </div>

              {/* 3. Guest & Room Selector */}
              <div 
                onClick={() => setGuestPickerOpen(!guestPickerOpen)}
                className="lg:col-span-3 relative flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container transition-colors border border-transparent hover:border-secondary/30"
              >
                <span className="material-symbols-outlined text-secondary text-[24px]">group</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Số lượng khách & Phòng</span>
                  <span className="font-title-md text-title-md text-on-surface truncate">
                    {totalGuests} Khách • {roomsCount} Phòng
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>

                {/* Popover chọn số khách */}
                {guestPickerOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-[#dedad0] z-50 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#0b1c30]">Người lớn & Trẻ em</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTotalGuests(Math.max(1, totalGuests - 1))}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="font-bold text-sm w-6 text-center">{totalGuests}</span>
                        <button
                          type="button"
                          onClick={() => setTotalGuests(Math.min(20, totalGuests + 1))}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#0b1c30]">Số phòng đặt</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="font-bold text-sm w-6 text-center">{roomsCount}</span>
                        <button
                          type="button"
                          onClick={() => setRoomsCount(Math.min(10, roomsCount + 1))}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuestPickerOpen(false)}
                      className="w-full py-1.5 mt-1 bg-secondary text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Xác Nhận
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Action Button */}
              <div className="lg:col-span-2">
                <button
                  type="button"
                  onClick={() => executeSearch()}
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-space-xs bg-primary text-on-primary rounded-xl font-label-lg text-label-lg hover:bg-secondary transition-all shadow-sm active:scale-98 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {loading ? 'sync' : 'search'}
                  </span>
                  <span>{loading ? 'Đang quét...' : 'Cập Nhật'}</span>
                </button>
              </div>
            </div>

            {/* Keyword Input & Search Engine indicator strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-1 border-t border-dashed border-[#dedad0]/60">
              <div className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-transparent focus-within:border-secondary/40">
                <span className="material-symbols-outlined text-[18px] text-secondary">manage_search</span>
                <input
                  type="text"
                  placeholder="Tìm theo từ khóa (Deluxe, Villa, Hồ bơi, Bãi biển, Jacuzzi, Buffet...)"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeSearch();
                  }}
                  className="bg-transparent text-xs w-full text-on-surface focus:outline-none placeholder:text-outline"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      executeSearch({ keyword: '' });
                    }}
                    className="text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Search Engine Badge */}
              {searchEngineMeta && (
                <div className="flex items-center gap-1.5 text-[11px] text-on-tertiary-container font-semibold bg-[#e8f7f0] px-3 py-1 rounded-full shrink-0">
                  <span className="material-symbols-outlined text-[15px]">neurology</span>
                  <span>Search Engine: {searchEngineMeta.engine} ({searchEngineMeta.executionTimeMs}ms)</span>
                </div>
              )}
            </div>

            {/* Thông báo lỗi validation nguyên văn */}
            {validationError && (
              <div className="p-space-sm bg-error-container text-on-error-container rounded-lg text-xs font-semibold flex items-center gap-2 animate-shake">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            MAIN CONTENT LAYOUT (2-COLUMN RESPONSIVE)
        ══════════════════════════════════════════════════════════════ */}
        <div className="w-full px-margin py-space-xl max-w-[1440px] mx-auto">
          
          {/* Breadcrumb & Editorial Sub-header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg gap-space-sm">
            <div>
              <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline mb-space-xs">
                <span className="hover:text-secondary cursor-pointer" onClick={() => navigate('/')}>Trang Chủ</span>
                <span>/</span>
                <span>Đặt Phòng</span>
                <span>/</span>
                <span className="text-secondary font-semibold">{currentBranchName}</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Không Gian Lưu Trú Thượng Tuyển</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Khám phá các gian phòng suite và villa ngập tràn thanh âm sóng biển bồng bềnh tại {currentBranchName}.
              </p>
            </div>
            <div className="flex items-center gap-space-sm text-on-surface-variant font-label-md text-label-md bg-surface-container-lowest px-space-md py-space-sm rounded-lg shadow-sm border border-[#dedad0]/40">
              <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">verified_user</span>
              <span>Cam kết giá tốt nhất cho hội viên trực tiếp</span>
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            
            {/* ─── LEFT SIDEBAR FILTERS (25% -> 3 of 12 cols) ─── */}
            <aside className="lg:col-span-3 flex flex-col gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-[#dedad0]/40">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
                  <h2 className="font-title-md text-title-md text-on-surface">Bộ Lọc Tùy Chọn</h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="font-label-sm text-label-sm text-secondary hover:underline cursor-pointer"
                >
                  Thiết lập lại
                </button>
              </div>

              {/* Price Range Slider */}
              <div className="flex flex-col gap-space-sm">
                <span className="font-title-md text-title-md text-on-surface">Khoảng Giá / Đêm</span>
                <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                  <span>1.500.000đ</span>
                  <span className="text-secondary font-bold">{formatVND(priceMax)}</span>
                </div>
                <div className="relative w-full flex items-center py-space-xs">
                  <input
                    type="range"
                    min="1500000"
                    max="25000000"
                    step="500000"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                </div>
                <p className="font-body-sm text-body-sm text-outline">Mức giá trung bình: 5.800.000đ/đêm</p>
              </div>

              {/* Room Types (Hạng Phòng & Biệt Thự) */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Hạng Phòng & Biệt Thự</span>
                <div className="flex flex-col gap-space-xs">
                  {[
                    { label: 'Villa Riêng Tư', count: '04' },
                    { label: 'Suite Cao Cấp', count: '06' },
                    { label: 'Deluxe Hướng Biển', count: '08' },
                    { label: 'Standard Garden', count: '03' }
                  ].map((item) => (
                    <label key={item.label} className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors">
                      <div className="flex items-center gap-space-sm">
                        <input
                          type="checkbox"
                          checked={selectedRoomTypes.includes(item.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoomTypes(prev => [...prev, item.label]);
                            } else {
                              setSelectedRoomTypes(prev => prev.filter(t => t !== item.label));
                            }
                          }}
                          className="w-4 h-4 rounded text-secondary focus:ring-0 accent-secondary"
                        />
                        <span className="font-body-md text-body-md text-on-surface">{item.label}</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline">{item.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Room Views (Tầm Nhìn) */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Tầm Nhìn (View)</span>
                <div className="flex flex-wrap gap-space-xs">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'Trực diện biển', label: 'Trực diện biển' },
                    { id: 'Hướng vườn', label: 'Hướng vườn' },
                    { id: 'Hướng hồ bơi', label: 'Hướng hồ bơi' }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedView(v.id)}
                      className={`px-space-md py-space-xs rounded-full font-label-md text-label-md transition-colors ${
                        selectedView === v.id
                          ? 'bg-secondary text-on-secondary shadow-sm font-bold'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Amenities (Đặc Quyền & Tiện Nghi) */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Đặc Quyền & Tiện Nghi</span>
                <div className="flex flex-col gap-space-xs">
                  {[
                    'Hồ bơi riêng (Private Pool)',
                    'Bồn tắm nằm Jacuzzi',
                    'Ban công ngắm hoàng hôn',
                    'Bữa sáng Buffet kèm theo',
                    'Dịch vụ quản gia 24/7'
                  ].map((amenity) => (
                    <label key={amenity} className="flex items-center gap-space-sm p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAmenities(prev => [...prev, amenity]);
                          } else {
                            setSelectedAmenities(prev => prev.filter(a => a !== amenity));
                          }
                        }}
                        className="w-4 h-4 rounded text-secondary accent-secondary"
                      />
                      <span className="font-body-md text-body-md text-on-surface">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Guest Ratings (Đánh Giá Từ Khách) */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                <span className="font-title-md text-title-md text-on-surface">Đánh Giá Từ Khách</span>
                <div className="flex flex-col gap-space-xs">
                  <label className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer">
                    <div className="flex items-center gap-space-xs text-secondary">
                      <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === '4.5'}
                        onChange={() => setSelectedRating('4.5')}
                        className="accent-secondary"
                      />
                      <span className="material-symbols-outlined text-[16px]">star</span>
                      <span className="font-label-md text-label-md text-on-surface">4.5+ Xuất sắc</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">12 phòng</span>
                  </label>
                  <label className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer">
                    <div className="flex items-center gap-space-xs text-secondary">
                      <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === '4.0'}
                        onChange={() => setSelectedRating('4.0')}
                        className="accent-secondary"
                      />
                      <span className="material-symbols-outlined text-[16px]">star</span>
                      <span className="font-label-md text-label-md text-on-surface">Từ 4 sao trở lên</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">18 phòng</span>
                  </label>
                  <label className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer">
                    <div className="flex items-center gap-space-xs text-secondary">
                      <input
                        type="radio"
                        name="rating"
                        checked={selectedRating === 'all'}
                        onChange={() => setSelectedRating('all')}
                        className="accent-secondary"
                      />
                      <span className="font-label-md text-label-md text-on-surface">Tất cả đánh giá</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quick Assist Banner */}
              <div className="mt-space-sm p-space-md bg-secondary-container/40 rounded-xl flex items-center gap-space-md border border-[#fedeb2]">
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">concierge</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Tư vấn chọn phòng?</span>
                  <a href="tel:19006868" className="font-body-sm text-body-sm text-secondary font-bold hover:underline">
                    Hotline 1900 6868 (24/7)
                  </a>
                </div>
              </div>
            </aside>

            {/* ─── RIGHT RESULTS CONTENT (75% -> 9 of 12 cols) ─── */}
            <main className="lg:col-span-9 flex flex-col gap-space-lg">
              
              {/* Results Header & Sort Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-md bg-surface-container-lowest rounded-xl shadow-sm gap-space-sm border border-[#dedad0]/40">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {loading ? '...' : rooms.length}
                  </span>
                  <span className="font-title-md text-title-md text-on-surface-variant">phòng & biệt thự còn trống</span>
                  <span className="mx-space-xs w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span className="font-label-sm text-label-sm text-on-tertiary-container font-semibold">
                    {currentBranchName}
                  </span>
                  {keyword && (
                    <span className="ml-2 px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full font-semibold">
                      "{keyword}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-space-sm">
                  <span className="font-label-md text-label-md text-outline">Sắp xếp:</span>
                  <div className="inline-flex rounded-lg bg-surface-container-low p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setSortBy('price_asc')}
                      className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                        sortBy === 'price_asc'
                          ? 'bg-surface-container-lowest text-secondary shadow-sm font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Giá tốt nhất
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('rating_desc')}
                      className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                        sortBy === 'rating_desc'
                          ? 'bg-surface-container-lowest text-secondary shadow-sm font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Đánh giá cao
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('popular')}
                      className={`px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${
                        sortBy === 'popular'
                          ? 'bg-surface-container-lowest text-secondary shadow-sm font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Phổ biến nhất
                    </button>
                  </div>
                </div>
              </div>

              {/* Thông báo lỗi khi không tìm thấy phòng (ERROR_0014_NO_RESULT) */}
              {errorMessage && (
                <div className="p-8 bg-surface-container-lowest rounded-2xl border border-[#dedad0] shadow-sm text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#fedeb2]/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[36px]">hotel_class</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Không Tìm Thấy Phòng Trống Phù Hợp</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">
                    {errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 px-6 py-2.5 bg-primary text-white rounded-xl font-label-md text-label-md hover:bg-secondary transition-all"
                  >
                    Xem tất cả phòng có sẵn
                  </button>
                </div>
              )}

              {/* Danh sách phòng dạng thẻ ngang (Horizontal Cards) */}
              <div className="flex flex-col gap-space-lg">
                {rooms.map((room) => {
                  const isSaved = wishlist.includes(room.RoomTypeId);
                  return (
                    <article
                      key={room.RoomTypeId}
                      className="group flex flex-col xl:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#dedad0]/40"
                    >
                      {/* Image Frame */}
                      <div className="relative xl:w-5/12 h-72 xl:h-auto overflow-hidden shrink-0">
                        <img
                          src={room.ImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'}
                          alt={room.TypeName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Ribbon Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-1 items-start">
                          <span className="px-space-sm py-1 rounded-full bg-primary/85 backdrop-blur-md text-[#ffd985] font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                            {room.Badge || 'Hạng Thượng Tuyển'}
                          </span>
                          {room.IsLimited ? (
                            <span className="px-space-sm py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-tertiary-container font-label-sm text-label-sm font-bold">
                              Chỉ còn {room.AvailableRooms} phòng
                            </span>
                          ) : (
                            <span className="px-space-sm py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-secondary font-label-sm text-label-sm font-semibold">
                              Còn {room.AvailableRooms} phòng trống
                            </span>
                          )}
                        </div>

                        {/* Favorite Button */}
                        <button
                          type="button"
                          onClick={() => toggleWishlist(room.RoomTypeId)}
                          className={`absolute bottom-4 right-4 w-9 h-9 rounded-full bg-surface-container-lowest/90 flex items-center justify-center transition-colors shadow-sm ${
                            isSaved ? 'text-red-500' : 'text-on-surface hover:text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isSaved ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>

                      {/* Content Area */}
                      <div className="xl:w-7/12 p-space-lg flex flex-col justify-between flex-1">
                        <div>
                          {/* Rating & Floor tag */}
                          <div className="flex items-center justify-between mb-space-xs">
                            <div className="flex items-center gap-1 text-secondary">
                              <span className="material-symbols-outlined text-[18px]">star</span>
                              <span className="material-symbols-outlined text-[18px]">star</span>
                              <span className="material-symbols-outlined text-[18px]">star</span>
                              <span className="material-symbols-outlined text-[18px]">star</span>
                              <span className="material-symbols-outlined text-[18px]">star</span>
                              <span className="font-label-md text-label-md text-on-surface ml-1 font-bold">
                                {room.Rating || 4.9}
                              </span>
                              <span className="font-body-sm text-body-sm text-outline">
                                ({room.ReviewCount || 128} đánh giá)
                              </span>
                            </div>
                            <span className="px-space-sm py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface">
                              {room.FloorRange || 'Tầng 12 - 18'}
                            </span>
                          </div>

                          {/* Room Name & Description */}
                          <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">
                            {room.TypeName}
                          </h3>
                          <p className="font-body-md text-body-md text-on-surface-variant mt-1 line-clamp-2">
                            {room.Description}
                          </p>

                          {/* Amenity Specs Grid */}
                          <div className="grid grid-cols-3 gap-space-sm my-space-md py-space-sm bg-surface-container-low rounded-xl px-space-md border border-[#dedad0]/30">
                            <div className="flex items-center gap-space-xs">
                              <span className="material-symbols-outlined text-secondary text-[20px]">square_foot</span>
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-outline">Diện tích</span>
                                <span className="font-label-md text-label-md text-on-surface font-semibold">
                                  {room.Area || '65 m²'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-space-xs">
                              <span className="material-symbols-outlined text-secondary text-[20px]">king_bed</span>
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-outline">Loại giường</span>
                                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                                  {room.BedType || '1 King Siêu Lớn'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-space-xs">
                              <span className="material-symbols-outlined text-secondary text-[20px]">balcony</span>
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-outline">Tầm nhìn</span>
                                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                                  {room.View || 'Biển Trực Diện'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Included Services Pills */}
                          <div className="flex flex-wrap gap-space-xs mb-space-md">
                            {(room.IncludedServices || [
                              'Bao gồm Buffet Sáng 5*',
                              'Đón tiễn sân bay VIP',
                              'Hủy miễn phí trước 48h'
                            ]).map((srv, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-tertiary-container bg-surface-container px-space-sm py-1 rounded-md"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {idx === 0 ? 'restaurant' : idx === 1 ? 'airport_shuttle' : 'check'}
                                </span>
                                {srv}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Price & CTA Action */}
                        <div className="flex items-end justify-between pt-space-md mt-space-xs border-t border-[#dedad0]/40">
                          <div className="flex flex-col">
                            {room.OriginalPrice && (
                              <span className="font-body-sm text-body-sm text-outline line-through">
                                {formatVND(room.OriginalPrice)}
                              </span>
                            )}
                            <div className="flex items-baseline gap-1">
                              <span className="font-headline-md text-headline-md text-secondary font-bold">
                                {formatVND(room.BasePrice)}
                              </span>
                              <span className="font-body-sm text-body-sm text-outline">/ đêm</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-outline">
                              Tổng {numberOfNights} đêm: <strong className="text-on-surface">{formatVND(room.TotalPrice)}</strong> (Đã gồm thuế & phí)
                            </span>
                          </div>

                          <div className="flex items-center gap-space-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedRoomForDetail(room)}
                              className="hidden sm:inline-flex items-center justify-center px-space-md py-3 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors border border-[#dedad0]/40"
                            >
                              Chi Tiết Phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedRoomForBooking(room)}
                              className="px-space-xl py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg hover:bg-secondary transition-all shadow-sm flex items-center gap-space-xs"
                            >
                              <span>Chọn Phòng</span>
                              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination & Direct Assistance Strip */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-space-md pt-space-md border-t border-[#dedad0]/40">
                {/* Page Selectors */}
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    disabled
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shadow-sm disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-sm font-bold"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-lg text-label-lg transition-colors shadow-sm"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-lg text-label-lg transition-colors shadow-sm"
                  >
                    3
                  </button>
                  <span className="px-space-xs text-outline">...</span>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-lg text-label-lg transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

                {/* Direct Concierge Help Desk Callout */}
                <div className="flex items-center gap-space-md bg-surface-container-lowest px-space-lg py-space-sm rounded-xl shadow-sm border border-[#dedad0]/40">
                  <div className="w-10 h-10 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[22px]">phone_in_talk</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline">Cần hỗ trợ tùy chỉnh lịch trình?</span>
                    <a className="font-title-md text-title-md text-secondary hover:underline font-bold" href="tel:19006868">
                      1900 6868 • Đội ngũ Quản gia
                    </a>
                  </div>
                </div>
              </div>

              {/* Location Context Card / Map Preview */}
              <div className="mt-space-md p-space-lg bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-lg border border-[#dedad0]/40">
                <div className="flex flex-col gap-space-xs">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                    Vị Trí Độc Tôn
                  </span>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    {currentBranchName} Resort & Suites
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                    Tọa lạc tại vị trí riêng tư trên Bãi Khem, chỉ cách Sân bay Quốc tế 20 phút di chuyển bằng xe đưa đón riêng của khu nghỉ dưỡng.
                  </p>
                </div>
                <div
                  className="w-full md:w-64 h-32 bg-cover bg-center rounded-xl overflow-hidden relative shadow-sm shrink-0 flex items-end p-space-sm"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop')"
                  }}
                >
                  <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded flex items-center justify-between text-on-surface">
                    <span className="font-label-sm text-label-sm font-semibold">Xem Bản Đồ Resort</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">open_in_new</span>
                  </div>
                </div>
              </div>

            </main>
          </div>
        </div>

        {/* Modal Xem chi tiết phòng */}
        {selectedRoomForDetail && (
          <RoomDetailModal
            room={selectedRoomForDetail}
            onClose={() => setSelectedRoomForDetail(null)}
            onBookNow={(room) => {
              setSelectedRoomForDetail(null);
              setSelectedRoomForBooking(room);
            }}
          />
        )}

        {/* Modal Đặt phòng nhanh */}
        {selectedRoomForBooking && (
          <QuickBookingModal
            room={selectedRoomForBooking}
            branchName={currentBranchName}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guestOption={`${totalGuests}-0-${roomsCount}`}
            onClose={() => setSelectedRoomForBooking(null)}
            onSuccess={() => {
              setSelectedRoomForBooking(null);
            }}
          />
        )}

      </div>
    </MainLayout>
  );
}
