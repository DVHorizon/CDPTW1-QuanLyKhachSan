import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import RoomDetailModal from '../components/modals/RoomDetailModal';
import QuickBookingModal from '../components/modals/QuickBookingModal';
import TravelokaHotelCard from '../components/client/TravelokaHotelCard';
import TravelokaHotelDetailView from '../components/client/TravelokaHotelDetailView';
import { useWishlist } from '../context/WishlistContext';
import { searchRoomsApi, getBranchesApi, suggestRoomsApi } from '../api/roomApi';

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
  const initialBranch = searchParams.get('branchId');
  const [branchId, setBranchId] = useState(initialBranch || 'all');
  const [viewMode, setViewMode] = useState(() => (initialBranch && initialBranch !== 'all') ? 'rooms' : 'hotels');
  const [hotelSortBy, setHotelSortBy] = useState('popular');
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
  const [selectedEngine, setSelectedEngine] = useState(searchParams.get('engine') || 'solr');
  const [engineDropdownOpen, setEngineDropdownOpen] = useState(false);
  const engineDropdownRef = useRef(null);

  // Danh mục cấu hình các chế độ tìm kiếm (Search Modes / Engines)
  const SEARCH_MODES = [
    {
      id: 'solr',
      name: 'Apache Solr 10.1',
      shortName: 'Solr',
      tag: 'BM25',
      icon: 'light_mode',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-300',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-500 text-white',
      description: 'Khớp cụm chính xác, phản hồi tức thì.'
    },
    {
      id: 'elasticsearch',
      name: 'Elasticsearch 9.5',
      shortName: 'Elasticsearch',
      tag: 'Fuzzy Match',
      icon: 'bolt',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-300',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      description: 'Tìm kiếm toàn văn, tự sửa lỗi chính tả.'
    },
    {
      id: 'dual',
      name: 'Dual Engine (Tự động)',
      shortName: 'Dual Engine',
      tag: 'Failover',
      icon: 'swap_horiz',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-300',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      description: 'Chế độ kép kết hợp & tự động dự phòng lỗi.'
    },
    {
      id: 'standard',
      name: 'Chế độ thường (SQL)',
      shortName: 'Chế độ thường',
      tag: 'Database',
      icon: 'database',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50/70',
      borderColor: 'border-slate-300',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      iconBg: 'bg-slate-700 text-white',
      description: 'Tìm kiếm cơ sở dữ liệu MySQL tiêu chuẩn.'
    }
  ];

  const currentMode = SEARCH_MODES.find(m => m.id === selectedEngine) || SEARCH_MODES[0];

  const handleSelectEngine = (engineId) => {
    setSelectedEngine(engineId);
    setEngineDropdownOpen(false);
    executeSearch({ engine: engineId });
  };
  const handleSelectBranch = (newBranchId) => {
    const targetId = String(newBranchId);
    setBranchId(targetId);
    executeSearch({ branchId: targetId });
  };
  const { wishlist, wishlistCount, toggleWishlist, isWishlisted } = useWishlist();
  const [compareList, setCompareList] = useState(() => {
    try {
      const saved = localStorage.getItem('compare_room_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [compareCollapsed, setCompareCollapsed] = useState(false);

  // Toggle so sánh phòng (FEAT-GUEST-13B: Giới hạn tối đa 3 phòng)
  const toggleCompare = (roomTypeId) => {
    setCompareList(prev => {
      let updated;
      if (prev.includes(roomTypeId)) {
        updated = prev.filter(id => id !== roomTypeId);
      } else {
        if (prev.length >= 3) {
          alert('Hệ thống hỗ trợ so sánh tối đa 3 loại phòng cùng lúc');
          return prev;
        }
        updated = [...prev, roomTypeId];
      }
      localStorage.setItem('compare_room_ids', JSON.stringify(updated));
      return updated;
    });
  };


  // Suggester Autocomplete state (hỗ trợ hiển thị gợi ý từ 1-2 ký tự)
  const [suggestions, setSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputContainerRef = useRef(null);

  // Lắng nghe thay đổi từ khóa để sinh gợi ý Autocomplete tức thì (từ 1-2 ký tự)
  useEffect(() => {
    if (!keyword || keyword.trim().length === 0) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await suggestRoomsApi(keyword);
        if (data && data.totalCount > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setSuggestions(null);
          setShowSuggestions(false);
        }
      } catch (_) {
        setSuggestions(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(e.target)) {
        setEngineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      sortBy,
      engine: overrideParams.engine || selectedEngine
    };

    // Cập nhật search params trên URL
    const newParams = new URLSearchParams();
    if (queryParams.branchId && queryParams.branchId !== 'all') newParams.set('branchId', queryParams.branchId);
    newParams.set('checkInDate', queryParams.checkInDate);
    newParams.set('checkOutDate', queryParams.checkOutDate);
    newParams.set('totalGuests', queryParams.totalGuests);
    if (queryParams.keyword) newParams.set('keyword', queryParams.keyword);
    if (queryParams.engine) newParams.set('engine', queryParams.engine);
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
    } else if (result.engine) {
      setSearchEngineMeta({ engine: result.engine, executionTimeMs: result.executionTimeMs, query: result.originalKeyword, normalizedQuery: result.normalizedKeyword, isFullWidthInput: result.isFullWidthInput });
    }
  };

  // Tự động tìm kiếm lần đầu khi mount
  useEffect(() => {
    executeSearch();
  }, [selectedRoomTypes, selectedView, selectedAmenities, selectedRating, sortBy, priceMax, selectedEngine]);

  // Reset toàn bộ bộ lọc
  
  // Chuyển sang xem danh sách phòng của khách sạn được chọn (chuẩn Traveloka)
  const handleSelectHotel = (selectedHotelId) => {
    setBranchId(String(selectedHotelId));
    setViewMode('rooms');
    const p = new URLSearchParams(searchParams);
    p.set('branchId', String(selectedHotelId));
    setSearchParams(p, { replace: true });
    executeSearch({ branchId: String(selectedHotelId) });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Quay lại danh sách chọn khách sạn (Toàn hệ thống - chuẩn Traveloka)
  const handleBackToHotels = () => {
    setBranchId('all');
    setViewMode('hotels');
    const p = new URLSearchParams(searchParams);
    p.delete('branchId');
    setSearchParams(p, { replace: true });
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

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

  // Tên chi nhánh / khách sạn hiện tại
  const currentBranchObj = branches.find(b => String(b.BranchId) === String(branchId));
  const currentBranchName = currentBranchObj ? currentBranchObj.BranchName : 'Grand Horizon Phú Quốc';
  const destinationLabel = (branchId !== 'all' && currentBranchObj) ? (currentBranchObj.City || currentBranchObj.BranchName) : 'Việt Nam (Toàn hệ thống)';

  // Danh sách nơi lưu trú / khách sạn (Chế độ Traveloka Hotel Search)
  const filteredHotels = useMemo(() => {
    let list = [...branches];
    if (keyword && keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      list = list.filter(b => 
        (b.BranchName || '').toLowerCase().includes(q) ||
        (b.City || '').toLowerCase().includes(q) ||
        (b.Address || '').toLowerCase().includes(q)
      );
    }
    if (priceMax) {
      list = list.filter(b => (b.MinPrice || 1850000) <= priceMax);
    }
    if (hotelSortBy === 'price_asc') {
      list.sort((a, b) => (a.MinPrice || 0) - (b.MinPrice || 0));
    } else if (hotelSortBy === 'rating_desc') {
      list.sort((a, b) => (b.Rating || 0) - (a.Rating || 0));
    }
    return list;
  }, [branches, keyword, priceMax, hotelSortBy]);

  return (
    <MainLayout
      wishlistCount={wishlistCount}
      onWishlistClick={() => navigate('/wishlist')}
    >
      <div className="flex flex-col w-full">

        {/* ══════════════════════════════════════════════════════════════
            DYNAMIC SEARCH STRIP (STICKY TOP-20)
        ══════════════════════════════════════════════════════════════ */}
        <section className="w-full bg-surface-container-lowest py-space-md px-margin border-b border-[#dedad0]/50 shadow-sm">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-space-sm">
            
            {/* Thanh tìm kiếm chính */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center">
              
              {/* 1. Destination / Khu nghỉ dưỡng */}
              <div className="lg:col-span-4 flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container-low rounded-xl border border-transparent hover:border-secondary/30 transition-colors">
                <span className="material-symbols-outlined text-secondary text-[24px]">location_on</span>
                <div className="flex flex-col min-w-0 w-full">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Khu nghỉ dưỡng</span>
                  <select
                    value={branchId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBranchId(val);
                      if (val === 'all') {
                        setViewMode('hotels');
                        const p = new URLSearchParams(searchParams);
                        p.delete('branchId');
                        setSearchParams(p, { replace: true });
                      } else {
                        setViewMode('rooms');
                        executeSearch({ branchId: val });
                      }
                    }}
                    className="bg-transparent font-title-md text-title-md text-on-surface focus:outline-none cursor-pointer truncate w-full"
                  >
                    <option value="all">Tất Cả Khách Sạn (Toàn hệ thống)</option>
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
              <div className="lg:col-span-5 flex items-center justify-between px-space-md py-space-sm bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors border border-transparent hover:border-secondary/30">
                <div className="flex items-center gap-space-sm flex-1">
                  <span className="material-symbols-outlined text-secondary text-[24px]">calendar_today</span>
                  <div className="flex flex-col flex-1">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Nhận phòng — Trả phòng (dd/mm/yyyy)</span>
                    <div className="flex items-center gap-2">
                      <div className="relative group cursor-pointer inline-flex items-center">
                        <span className="text-[13.5px] font-semibold text-on-surface group-hover:text-secondary transition-colors select-none py-0.5">
                          {formatDisplayDate(checkInDate) || 'dd/mm/yyyy'}
                        </span>
                        <input
                          type="date"
                          min={todayStr}
                          value={checkInDate}
                          onChange={(e) => handleCheckInChange(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker(); } catch (_) {}
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Chọn ngày nhận phòng (dd/mm/yyyy)"
                        />
                      </div>
                      <span className="text-secondary font-bold select-none">—</span>
                      <div className="relative group cursor-pointer inline-flex items-center">
                        <span className="text-[13.5px] font-semibold text-on-surface group-hover:text-secondary transition-colors select-none py-0.5">
                          {formatDisplayDate(checkOutDate) || 'dd/mm/yyyy'}
                        </span>
                        <input
                          type="date"
                          min={addDays(checkInDate, 1)}
                          value={checkOutDate}
                          onChange={(e) => handleCheckOutChange(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker(); } catch (_) {}
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Chọn ngày trả phòng (dd/mm/yyyy)"
                        />
                      </div>
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
            </div>

            {/* Keyword Input & Search Engine indicator strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-1 border-t border-dashed border-[#dedad0]/60">
              <div 
                ref={searchInputContainerRef}
                className="relative w-full sm:w-auto flex-1"
              >
                <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl border border-[#dedad0]/60 focus-within:border-secondary/60 focus-within:bg-white transition-all shadow-sm">
                  <span className="material-symbols-outlined text-[22px] text-secondary">manage_search</span>
                  <input
                    type="text"
                    placeholder="Tìm theo từ khóa (Deluxe, Villa, Hồ bơi, Bãi biển, Jacuzzi, Buffet...)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onFocus={() => {
                      if (suggestions && suggestions.totalCount > 0) setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowSuggestions(false);
                        executeSearch();
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    className="bg-transparent text-sm w-full text-on-surface focus:outline-none placeholder:text-outline font-medium"
                  />
                  {keyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword('');
                        setSuggestions(null);
                        setShowSuggestions(false);
                        executeSearch({ keyword: '' });
                      }}
                      className="text-outline hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions Dropdown (Hiển thị ngay khi gõ từ 1-2 ký tự) */}
                {showSuggestions && suggestions && suggestions.totalCount > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-[#dedad0] overflow-hidden animate-fade-in max-h-[380px] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-[#dedad0]/60 bg-[#fbf8f2] flex items-center justify-between text-[11px] font-semibold text-[#8a8782]">
                      <span className="flex items-center gap-1.5 text-secondary font-bold">
                        <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                        Gợi ý tìm kiếm tức thì ({suggestions.totalCount})
                      </span>
                      {suggestions.isFullWidth && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                          Full-width ➔ Half-width
                        </span>
                      )}
                    </div>

                    {/* Room Suggestions */}
                    {suggestions.roomSuggestions && suggestions.roomSuggestions.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] uppercase font-bold text-outline px-2 py-1 tracking-wider">
                          Hạng Phòng &amp; Biệt Thự Phù Hợp
                        </div>
                        {suggestions.roomSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setKeyword(item.text);
                              setShowSuggestions(false);
                              executeSearch({ keyword: item.text });
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="material-symbols-outlined text-secondary text-[20px] group-hover:scale-110 transition-transform">
                                bedroom_parent
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-on-surface group-hover:text-secondary truncate">
                                  {item.text}
                                </span>
                                <span className="text-[11px] text-on-surface-variant truncate">
                                  {item.subText}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-semibold shrink-0">
                              {item.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Amenity Suggestions */}
                    {suggestions.amenitySuggestions && suggestions.amenitySuggestions.length > 0 && (
                      <div className="p-2 border-t border-[#dedad0]/40">
                        <div className="text-[10px] uppercase font-bold text-outline px-2 py-1 tracking-wider">
                          Tiện Ích &amp; Đặc Quyền Đề Xuất
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-2 py-1">
                          {suggestions.amenitySuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setKeyword(item.text);
                                setShowSuggestions(false);
                                executeSearch({ keyword: item.text });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-low hover:bg-secondary hover:text-white transition-colors text-on-surface border border-[#dedad0]/60 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">{item.icon || 'verified'}</span>
                              <span>{item.text}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Search Terms */}
                    {suggestions.keywordSuggestions && suggestions.keywordSuggestions.length > 0 && (
                      <div className="p-2 border-t border-[#dedad0]/40">
                        <div className="text-[10px] uppercase font-bold text-outline px-2 py-1 tracking-wider">
                          Cụm Từ Tìm Kiếm Phổ Biến
                        </div>
                        {suggestions.keywordSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setKeyword(item.text);
                              setShowSuggestions(false);
                              executeSearch({ keyword: item.text });
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors text-xs text-on-surface group"
                          >
                            <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-secondary">
                              trending_up
                            </span>
                            <span className="group-hover:text-secondary font-medium">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Nút Chọn Chế Độ Search & Nút Tìm kiếm */}
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                {/* NÚT LỰA CHỌN CHẾ ĐỘ SEARCH - HIỂN THỊ TÊN CHẾ ĐỘ VÀ MŨI TÊN NHƯ BẢN VẼ */}
                <div ref={engineDropdownRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setEngineDropdownOpen(prev => !prev)}
                    className="h-11 px-4 min-w-[140px] sm:min-w-[160px] flex items-center justify-between gap-2.5 bg-surface-container-low hover:bg-white rounded-xl border border-[#dedad0] hover:border-secondary/60 text-on-surface font-semibold text-sm transition-all shadow-sm active:scale-98 cursor-pointer select-none"
                    title="Lựa chọn chế độ tìm kiếm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${currentMode.iconBg}`}>
                        <span className="material-symbols-outlined text-[15px]">{currentMode.icon}</span>
                      </div>
                      <span className="font-bold text-sm text-[#0b1c30] truncate">
                        {currentMode.shortName}
                      </span>
                    </div>
                    <span
                      className="material-symbols-outlined text-[20px] text-outline shrink-0 transition-transform duration-200"
                      style={{ transform: engineDropdownOpen ? 'rotate(180deg)' : 'none' }}
                    >
                      expand_more
                    </span>
                  </button>

                  {/* Popover Menu Lựa Chọn Chế Độ Search */}
                  {engineDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#dedad0] z-50 p-2.5 animate-fade-in">
                      <div className="px-2 pb-1.5 mb-1.5 border-b border-[#dedad0]/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-secondary">tune</span>
                          Chế Độ Tìm Kiếm
                        </span>
                        <span className="text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                          Dual Engine
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {SEARCH_MODES.map((mode) => {
                          const isSelected = selectedEngine === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => handleSelectEngine(mode.id)}
                              className={`w-full text-left p-2 rounded-xl transition-all border flex items-center gap-2.5 cursor-pointer ${
                                isSelected
                                  ? `${mode.bgColor} ${mode.borderColor} shadow-xs ring-1 ring-secondary/20`
                                  : 'border-transparent hover:bg-surface-container-low'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? mode.iconBg : 'bg-surface-container text-outline'
                              }`}>
                                <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                    {mode.name}
                                  </span>
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${mode.badgeBg}`}>
                                    {mode.tag}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-outline truncate">
                                  {mode.description}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">
                                  check_circle
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* NÚT TÌM KIẾM */}
                <button
                  type="button"
                  onClick={() => executeSearch()}
                  disabled={loading}
                  className="h-11 px-6 sm:px-7 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-secondary transition-all shadow-md active:scale-98 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {loading ? 'sync' : 'search'}
                  </span>
                  <span>{loading ? 'Đang tìm...' : 'Tìm kiếm'}</span>
                </button>
              </div>
            </div>

            {/* Trạng thái công cụ tìm kiếm đang kích hoạt & chuẩn hóa CJK */}
            {searchEngineMeta && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5 animate-fade-in">
                <div className="flex items-center gap-1.5 text-[11px] text-on-tertiary-container font-semibold bg-[#e8f7f0] px-3 py-1 rounded-full shrink-0 border border-[#b7eb8f]/50">
                  <span className="material-symbols-outlined text-[14px] text-emerald-700">neurology</span>
                  <span>
                    Chế độ: <strong className="text-emerald-900">{searchEngineMeta.engine}</strong>
                    {searchEngineMeta.executionTimeMs !== undefined && (
                      <span className="text-emerald-700 font-normal"> • {searchEngineMeta.executionTimeMs}ms</span>
                    )}
                  </span>
                </div>
                {searchEngineMeta.isFullWidthInput && (
                  <div className="flex items-center gap-1 text-[11px] text-[#d48806] font-semibold bg-[#fffbe6] border border-[#ffe58f] px-2.5 py-1 rounded-full shrink-0 animate-fade-in">
                    <span className="material-symbols-outlined text-[13px]">translate</span>
                    <span>Chuẩn hóa Full-width (全角): "{searchEngineMeta.query}" ➔ "{searchEngineMeta.normalizedQuery}"</span>
                  </div>
                )}
              </div>
            )}

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
          {viewMode === 'rooms' && currentBranchObj ? (
            /* ══════════════════════════════════════════════════════════════
               CHẾ ĐỘ XEM THÔNG TIN CHUNG KHÁCH SẠN & BẢNG CÁC LOẠI PHÒNG (TRAVELOKA)
            ══════════════════════════════════════════════════════════════ */
            <TravelokaHotelDetailView
              branch={currentBranchObj}
              rooms={rooms}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              totalGuests={totalGuests}
              roomsCount={roomsCount}
              numberOfNights={numberOfNights}
              loading={loading}
              onBackToHotels={handleBackToHotels}
              onSelectRoomForDetail={(r) => setSelectedRoomForDetail(r)}
              compareList={compareList}
              onToggleCompare={toggleCompare}
              isWishlisted={isWishlisted}
              onToggleWishlist={toggleWishlist}
              formatVND={formatVND}
              formatDisplayDate={formatDisplayDate}
            />
          ) : (
            /* ══════════════════════════════════════════════════════════════
               CHẾ ĐỘ TÌM KIẾM DANH SÁCH KHÁCH SẠN (2-COLUMN RESPONSIVE)
            ══════════════════════════════════════════════════════════════ */
            <>
              {/* Breadcrumb & Editorial Sub-header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg gap-space-sm">
                <div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline mb-space-xs flex-wrap">
                    <span className="hover:text-secondary cursor-pointer" onClick={() => navigate('/')}>Trang Chủ</span>
                    <span>/</span>
                    <span className="text-secondary font-semibold">Khách Sạn &amp; Nơi Lưu Trú</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface">
                    Nơi Lưu Trú &amp; Khu Nghỉ Dưỡng Thượng Tuyển
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    Khám phá chuỗi khách sạn và khu nghỉ dưỡng 5 sao Grand Horizon trên toàn quốc.
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
                      <span className="text-[#8c6d3b] font-bold">{formatVND(priceMax)}</span>
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
                    <span className="font-title-md text-title-md text-on-surface">Hạng Phòng &amp; Biệt Thự</span>
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
                              ? 'bg-[#8c6d3b] text-white shadow-sm font-bold'
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
                    <span className="font-title-md text-title-md text-on-surface">Đặc Quyền &amp; Tiện Nghi</span>
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
                        <div className="flex items-center gap-space-xs text-[#8c6d3b]">
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
                        <div className="flex items-center gap-space-xs text-[#8c6d3b]">
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
                        <div className="flex items-center gap-space-xs text-[#8c6d3b]">
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

                {/* ─── RIGHT RESULTS CONTENT: HOTEL CARDS (75% -> 9 of 12 cols) ─── */}
                <main className="lg:col-span-9 flex flex-col gap-space-lg">
                  
                  
                  {/* Thanh Tiêu Đề Kết Quả Nơi Lưu Trú Chuẩn Traveloka */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#dedad0]/60 gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">
                        {keyword ? `Kết quả tìm kiếm cho "${keyword}"` : destinationLabel}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        <strong className="text-slate-800 font-semibold">{filteredHotels.length}</strong> nơi lưu trú được tìm thấy
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-[#fbf8f2] border border-[#dedad0] hover:border-[#b9a277] px-3 py-1.5 rounded-full transition-colors">
                        <span className="font-medium text-slate-600">Xếp theo:</span>
                        <select
                          value={hotelSortBy}
                          onChange={(e) => setHotelSortBy(e.target.value)}
                          className="bg-transparent text-[#8c6d3b] font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="popular">Độ phổ biến</option>
                          <option value="price_asc">Giá thấp nhất</option>
                          <option value="rating_desc">Đánh giá cao nhất</option>
                        </select>
                      </div>

                      <div className="text-xs px-3 py-1.5 rounded-full bg-[#fbf8f2] text-slate-700 border border-[#dedad0] font-semibold hidden md:inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-[#8c6d3b]">payments</span>
                        <span>Mỗi phòng mỗi đêm</span>
                      </div>
                    </div>
                  </div>

                  {/* Danh Sách Thẻ Khách Sạn (Traveloka Hotel Cards) */}
                  <div className="flex flex-col gap-space-md mt-1">
                    {filteredHotels.length > 0 ? (
                      filteredHotels.map((h) => (
                        <TravelokaHotelCard
                          key={h.BranchId}
                          hotel={h}
                          onSelectHotel={handleSelectHotel}
                          isSaved={wishlist.includes(h.BranchId)}
                          onToggleSave={toggleWishlist}
                        />
                      ))
                    ) : (
                      <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-400">hotel_class</span>
                        <h3 className="font-bold text-lg text-slate-800">Không có phòng nào phù hợp với bộ lọc đã chọn. Vui lòng thử bỏ bớt tiêu chí lọc.</h3>
                        <p className="text-xs text-slate-500 max-w-md">
                          Hãy thử bỏ bớt tiêu chí lọc, điều chỉnh từ khóa tìm kiếm hoặc mở rộng khoảng giá để khám phá các khu nghỉ dưỡng Grand Horizon.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-secondary transition-colors"
                        >
                          Thiết lập lại bộ lọc
                        </button>
                      </div>
                    )}
                  </div>

                </main>
              </div>
            </>
          )}
        </div>

        {/* Modal Xem chi tiết phòng */}
        {selectedRoomForDetail && (
          <RoomDetailModal
            room={selectedRoomForDetail}
            isOpen={Boolean(selectedRoomForDetail)}
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

        {/* Thanh So Sánh Phòng Nổi (Floating Compare Bar Chuẩn Thế Giới Di Động / Điện Máy Xanh) */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-2 sm:pb-3 px-3">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.18)] border border-slate-200/90 transition-all duration-300 overflow-hidden max-w-full">
              {/* Khi đang thu gọn (Được phóng to & đổi sang tone nâu sang trọng) */}
              {compareCollapsed ? (
                <div className="flex items-center gap-4 px-6 py-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-[#dedad0] shadow-[0_10px_35px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#b9a277] animate-pulse"></span>
                    <span className="text-sm font-bold text-[#203044]">
                      So sánh ({compareList.length}/3 phòng)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompareCollapsed(false)}
                    className="flex items-center gap-1.5 text-sm font-bold text-[#b9a277] hover:text-[#8f7952] px-3 py-1.5 rounded-xl hover:bg-[#faf7f2] transition-all cursor-pointer"
                  >
                    <span>Mở rộng</span>
                    <span className="material-symbols-outlined text-[18px]">expand_less</span>
                  </button>
                </div>
              ) : (
                /* Thanh đầy đủ theo thiết kế mẫu tối giản, sang trọng */
                <div className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 relative">
                  {/* Danh sách các card phòng so sánh (Tối đa 3 ô) */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto max-w-[85vw] sm:max-w-[700px] py-1 px-1">
                    {compareList.map(id => {
                      const r = rooms.find(item => item.RoomTypeId === id);
                      return (
                        <div
                          key={id}
                          className="relative flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all w-[190px] sm:w-[220px] h-[72px] shrink-0"
                        >
                          {/* Nút X tròn góc trên bên phải card */}
                          <button
                            type="button"
                            onClick={() => toggleCompare(id)}
                            title="Xóa phòng này"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-400 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-xs z-20 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                          </button>

                          {/* Ảnh đại diện phòng: kích thước chuẩn cố định */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img
                              src={r?.ImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&q=80'}
                              alt={r?.TypeName || ''}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Tên và giá phòng */}
                          <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden pr-1">
                            <span
                              className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight"
                              title={r?.TypeName || `Phòng #${id}`}
                            >
                              {r?.TypeName || `Phòng #${id}`}
                            </span>
                            {r?.BasePrice && (
                              <span className="text-[11px] font-bold text-[#b9a277] mt-1 truncate">
                                {formatVND(r.BasePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Ô trống gợi ý thêm phòng nếu chưa đủ 3 */}
                    {compareList.length < 3 && (
                      <div className="hidden md:flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl w-[120px] h-[72px] shrink-0 text-slate-400 px-2 text-center select-none">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span className="text-[10px] font-medium leading-tight">Thêm phòng ({compareList.length}/3)</span>
                      </div>
                    )}
                  </div>

                  {/* Nút Xóa tất cả */}
                  <button
                    type="button"
                    onClick={() => {
                      setCompareList([]);
                      localStorage.removeItem('compare_room_ids');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium px-1.5 py-1 whitespace-nowrap cursor-pointer hover:underline"
                  >
                    Xóa tất cả
                  </button>

                  {/* Nút Nâu Sang Trọng "So sánh ngay" theo đúng tone màu thương hiệu */}
                  <button
                    type="button"
                    disabled={compareList.length < 2}
                    onClick={() => {
                      if (compareList.length < 2) {
                        alert('Vui lòng chọn ít nhất 2 loại phòng để tiến hành so sánh');
                        return;
                      }
                      navigate(`/rooms/compare?ids=${compareList.join(',')}`);
                    }}
                    className={`px-5 sm:px-6 h-[50px] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${
                      compareList.length >= 2
                        ? 'bg-[#b9a277] hover:bg-[#a58e65] text-white shadow-[#b9a277]/25 hover:shadow-md active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>So sánh ngay</span>
                  </button>

                  {/* Nút "Thu gọn" có mũi tên v */}
                  <button
                    type="button"
                    onClick={() => setCompareCollapsed(true)}
                    className="h-[50px] px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <span>Thu gọn</span>
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


      </div>
    </MainLayout>
  );
}
