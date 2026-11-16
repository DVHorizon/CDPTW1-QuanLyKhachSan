import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * PillBranchDropdown
 * Tái hiện thành phần Framer Pill-Dropdown-Nav (https://framer.com/m/Pill-Dropdown-Nav-s5GzCY.js@ukelgcNTM08KYOfoZWUD)
 * - Nút dạng Pill sang trọng phong cách 5 sao
 * - Bộ lọc Tab dạng Pill: Tất Cả (16), Miền Bắc, Miền Trung, Miền Nam
 * - Tìm kiếm chi nhánh thông minh
 * - Tự động phát hiện vị trí để mở lên hoặc xuống tránh tràn màn hình
 */

export default function PillBranchDropdown({
  branches = [],
  selectedBranchId,
  onSelectBranch,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState('all'); // 'all' | 'north' | 'central' | 'south'
  const [searchTerm, setSearchTerm] = useState('');
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Phân loại vùng miền
  const getBranchRegion = (b) => {
    const id = Number(b.BranchId);
    if ([8, 10, 13, 15].includes(id)) return 'north';
    if ([2, 4, 5, 7, 9, 11, 16].includes(id)) return 'central';
    return 'south';
  };

  // Chi nhánh đang chọn
  const selectedBranch = useMemo(() => {
    return branches.find(b => String(b.BranchId) === String(selectedBranchId)) || branches[0] || null;
  }, [branches, selectedBranchId]);

  // Đếm số lượng theo vùng miền
  const regionCounts = useMemo(() => {
    const counts = { all: branches.length, north: 0, central: 0, south: 0 };
    branches.forEach(b => {
      const r = getBranchRegion(b);
      if (counts[r] !== undefined) counts[r]++;
    });
    return counts;
  }, [branches]);

  // Danh sách chi nhánh sau khi lọc và tìm kiếm
  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      const matchRegion = activeRegion === 'all' || getBranchRegion(b) === activeRegion;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        (b.BranchName && b.BranchName.toLowerCase().includes(term)) ||
        (b.City && b.City.toLowerCase().includes(term)) ||
        (b.Address && b.Address.toLowerCase().includes(term));
      return matchRegion && matchSearch;
    });
  }, [branches, activeRegion, searchTerm]);

  // Kiểm tra va chạm mép dưới màn hình để quyết định mở lên hay xuống
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const neededSpace = 390; // Chiều cao ước lượng của dropdown panel

    // Nếu không đủ chỗ bên dưới và chỗ bên trên nhiều hơn -> mở lên
    if (spaceBelow < neededSpace && rect.top > spaceBelow) {
      setDropUp(true);
    } else {
      setDropUp(false);
    }
  };

  // Bật/tắt dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    } else {
      setIsOpen(false);
    }
  };

  // Đóng khi click ngoài hoặc ấn ESC
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const selectedCity = selectedBranch?.City ? selectedBranch.City.split(',')[0].trim() : 'Việt Nam';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* NÚT KÍCH HOẠT DẠNG PILL THANH LỊCH (MATCH SEARCH BAR DESIGN) */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`w-full bg-[#fbf8f2] hover:bg-[#f6f2e9] text-left rounded-xl border transition-all duration-200 px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none group ${
          isOpen
            ? 'border-[#b9a277] ring-2 ring-[#b9a277]/20 shadow-md'
            : 'border-[#dedad0] hover:border-[#b9a277]/70'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-[#b9a277]/15 text-[#b9a277] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[17px]">domain</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-bold text-[#203044] truncate group-hover:text-[#b9a277] transition-colors">
              {selectedBranch ? selectedBranch.BranchName : 'Chọn khu nghỉ dưỡng'}
            </span>
            <span className="text-[11px] text-[#8a8782] truncate flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[12px] text-[#b9a277]">location_on</span>
              {selectedCity} • 5★ Chuẩn Quốc Tế
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <span className="text-[10.5px] font-bold text-[#b9a277] bg-[#b9a277]/15 px-2 py-0.5 rounded-full hidden sm:inline-block">
            {branches.length} Resort
          </span>
          <span
            className={`material-symbols-outlined text-[#8a8782] text-[20px] transition-transform duration-300 ${
              isOpen ? 'rotate-180 text-[#b9a277]' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* DROPDOWN MENU PANEL (PHONG CÁCH FRAMER PILL NAV) */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className={`absolute left-0 w-full sm:w-[480px] md:w-[540px] lg:w-[580px] max-w-[95vw] bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_24px_60px_-15px_rgba(32,48,68,0.35)] border border-[#dedad0] z-50 overflow-hidden flex flex-col transition-all duration-200 animate-scale-in ${
            dropUp ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
          }`}
        >
          {/* HEADER VỚI TABS DẠNG PILL (ĐẶC TRƯNG CỦA PILL-DROPDOWN-NAV) */}
          <div className="p-3 sm:p-3.5 bg-[#fbf8f2]/90 border-b border-[#dedad0] space-y-2.5">
            {/* Thanh Tabs Pill */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'all', label: 'Tất Cả', count: regionCounts.all },
                { id: 'north', label: 'Miền Bắc', count: regionCounts.north },
                { id: 'central', label: 'Miền Trung', count: regionCounts.central },
                { id: 'south', label: 'Miền Nam', count: regionCounts.south }
              ].map(tab => {
                const isActive = activeRegion === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveRegion(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#203044] text-[#ffd985] shadow-xs scale-102'
                        : 'bg-white text-[#203044] hover:bg-[#eae6dc] border border-[#dedad0]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-[#ffd985]'
                          : 'bg-stone-100 text-[#8a8782]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8782] text-[18px]">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên khách sạn, resort hoặc thành phố..."
                className="w-full h-9 pl-9 pr-8 bg-white rounded-xl border border-[#dedad0] text-[12px] text-[#203044] placeholder-[#8a8782] focus:outline-none focus:border-[#b9a277] focus:ring-1 focus:ring-[#b9a277] transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8782] hover:text-[#203044] text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* DANH SÁCH RESORT / KHÁCH SẠN */}
          <div className="max-h-[290px] sm:max-h-[330px] overflow-y-auto p-2 space-y-1.5 divide-y divide-[#dedad0]/40">
            {filteredBranches.length === 0 ? (
              <div className="py-8 text-center text-[#8a8782] text-xs">
                <span className="material-symbols-outlined text-[28px] text-[#b9a277] mb-1">
                  search_off
                </span>
                <p>Không tìm thấy khu nghỉ dưỡng phù hợp với từ khóa.</p>
              </div>
            ) : (
              filteredBranches.map(branch => {
                const isSelected = String(branch.BranchId) === String(selectedBranchId);
                const cityOnly = branch.City ? branch.City.split(',')[0].trim() : 'Việt Nam';

                return (
                  <div
                    key={branch.BranchId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectBranch(branch.BranchId);
                      setIsOpen(false);
                    }}
                    className={`pt-1.5 first:pt-0 group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#203044] text-white shadow-xs'
                        : 'hover:bg-[#fbf8f2] text-[#203044]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Ảnh thu nhỏ thumbnail của khu nghỉ dưỡng */}
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-black/10 bg-[#203044]">
                        <img
                          src={branch.ImageUrl}
                          alt={branch.BranchName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      </div>

                      {/* Chi tiết tên & địa điểm */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-[12.5px] font-bold leading-tight truncate ${
                              isSelected ? 'text-[#ffd985]' : 'group-hover:text-[#b9a277]'
                            }`}
                          >
                            {branch.BranchName}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span
                            className={`flex items-center gap-0.5 truncate ${
                              isSelected ? 'text-white/80' : 'text-[#8a8782]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px] text-[#b9a277]">
                              location_on
                            </span>
                            {cityOnly}
                          </span>
                          <span className={isSelected ? 'text-white/40' : 'text-stone-300'}>•</span>
                          <span
                            className={`flex items-center gap-0.5 font-bold ${
                              isSelected ? 'text-[#ffd985]' : 'text-[#b9a277]'
                            }`}
                          >
                            ★ {branch.Rating || 5.0}
                          </span>
                          {branch.TotalRooms && (
                            <>
                              <span className={isSelected ? 'text-white/40' : 'text-stone-300'}>•</span>
                              <span className={isSelected ? 'text-white/70' : 'text-[#8a8782]'}>
                                {branch.TotalRooms} phòng
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkmark hoặc Arrow */}
                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#ffd985] text-[#203044] flex items-center justify-center font-bold shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </div>
                      ) : (
                        <span className="material-symbols-outlined text-[#8a8782]/50 text-[18px] opacity-0 group-hover:opacity-100 group-hover:text-[#b9a277] group-hover:translate-x-0.5 transition-all">
                          arrow_forward
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER TINH TẾ */}
          <div className="px-3.5 py-2 bg-[#fbf8f2] border-t border-[#dedad0] flex items-center justify-between text-[11px] text-[#8a8782]">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px] text-[#b9a277]">verified</span>
              16 Thiên đường nghỉ dưỡng 5 sao
            </span>
            <span className="text-[#b9a277] font-semibold">Grand Horizon Hotels &amp; Resorts</span>
          </div>
        </div>
      )}
    </div>
  );
}

