import React, { useState, useRef, useEffect, useId, useMemo } from 'react';

/**
 * MorphDropdown
 * Tái hiện thành phần Framer MorphDropdown (BuiltByKern):
 * https://framer.com/m/MorphDropdown-R1M4oB.js@1w6VgWmBoq33p03kVmdM
 *
 * Tính năng:
 * - Liquid Morph / Gooey silhouette kết nối giữa trigger và menu mở rộng
 * - Hiệu ứng trượt highlight theo con trỏ chuột (composite-only hover glide)
 * - Điều hướng bàn phím đầy đủ (ArrowUp, ArrowDown, Enter, Escape)
 * - Tự động đóng khi click bên ngoài
 * - Tối ưu 100% bằng pure React + CSS transforms (không phụ thuộc thư viện ngoài)
 */

export default function MorphDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Chọn...",
  icon = null,
  className = "",
  menuMaxHeight = 280,
  dropdownWidth = "100%",
  theme = "luxury" // 'luxury' (ivory) hoặc 'dark'
}) {
  const [open, setOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const rawId = useId();
  const filterId = `goo-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Chuẩn hóa options
  const normalizedOptions = useMemo(() => {
    return options.map((opt, i) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt, index: i };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.label,
        label: opt.label || String(opt.value),
        subLabel: opt.subLabel || '',
        index: i
      };
    });
  }, [options]);

  // Tìm index option đang được chọn
  const selectedIndex = useMemo(() => {
    const idx = normalizedOptions.findIndex(o => String(o.value) === String(value));
    return idx >= 0 ? idx : 0;
  }, [normalizedOptions, value]);

  const selectedOption = normalizedOptions[selectedIndex] || normalizedOptions[0];

  // Lọc options nếu danh sách dài (> 8 phần tử)
  const isSearchable = normalizedOptions.length > 8;
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(o => 
      o.label.toLowerCase().includes(q) || 
      (o.subLabel && o.subLabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery, isSearchable]);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery('');
        setHoveredIndex(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
        setHoveredIndex(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Xử lý phím mũi tên khi mở menu
  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(prev => !prev);
      setHoveredIndex(selectedIndex);
    }
  };

  const handleOptionKeyDown = (e, opt) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(opt);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIdx = filteredOptions.findIndex(o => o.value === opt.value);
      if (currentIdx < filteredOptions.length - 1) {
        setHoveredIndex(currentIdx + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = filteredOptions.findIndex(o => o.value === opt.value);
      if (currentIdx > 0) {
        setHoveredIndex(currentIdx - 1);
      }
    }
  };

  const handleSelect = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    setSearchQuery('');
    setHoveredIndex(null);
  };

  const isDark = theme === 'dark';

  return (
    <div
      ref={rootRef}
      className={`relative select-none ${className}`}
      style={{ width: dropdownWidth, zIndex: open ? 50 : 10 }}
    >
      {/* SVG GOOEY FILTER (Tạo hiệu ứng giọt chất lỏng Morph theo Framer spec) */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -6"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* TRIGGER BUTTON PHONG CÁCH PILL BO GÓC TRÒN */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-[46px] px-3.5 flex items-center justify-between rounded-xl border transition-all duration-200 cursor-pointer text-left ${
          isDark
            ? 'bg-[#1c1917] border-[#b9a277]/40 text-white hover:border-[#b9a277]'
            : 'bg-[#fbf8f2] border-[#dedad0] text-[#203044] hover:border-[#b9a277] focus:border-[#b9a277]'
        } ${open ? 'ring-2 ring-[#b9a277]/30 border-[#b9a277]' : ''}`}
      >
        <div className="flex items-center gap-2 truncate pr-2 min-w-0">
          {icon && (
            <span className="material-symbols-outlined text-[18px] text-[#b9a277] shrink-0">
              {icon}
            </span>
          )}
          <span className="text-[13px] font-bold truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Mũi tên xoay chuyển động mượt mà */}
        <span
          className={`material-symbols-outlined text-[18px] text-[#8a8782] transition-transform duration-300 shrink-0 ${
            open ? 'rotate-180 text-[#b9a277]' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* LIQUID MORPH MENU POPUP */}
      {open && (
        <>
          {/* Cầu nối giọt chất lỏng Liquid Goo Bridge */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-40"
            style={{
              top: '40px',
              width: '80%',
              height: '14px',
              filter: `url(#${filterId})`
            }}
          >
            <div
              className={`w-full h-full rounded-full transition-opacity duration-200 ${
                isDark ? 'bg-[#1c1917]' : 'bg-[#fbf8f2]'
              }`}
            />
          </div>

          {/* Hộp danh sách thả xuống */}
          <div
            ref={listRef}
            role="listbox"
            className={`absolute left-0 mt-2 w-full rounded-2xl shadow-[0_20px_50px_-12px_rgba(32,48,68,0.35)] border overflow-hidden z-50 backdrop-blur-xl animate-scale-in ${
              isDark
                ? 'bg-[#1c1917]/95 border-[#b9a277]/50 text-white'
                : 'bg-white/98 border-[#dedad0] text-[#203044]'
            }`}
            style={{
              maxHeight: `${menuMaxHeight}px`,
              transformOrigin: 'top center'
            }}
          >
            {/* Thanh tìm kiếm nhanh nếu danh sách có nhiều chi nhánh */}
            {isSearchable && (
              <div className="p-2 border-b border-[#dedad0]/60 sticky top-0 bg-inherit z-10">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-[#8a8782]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm chi nhánh, điểm đến..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#f4efe6] text-[#203044] placeholder-[#8a8782] focus:outline-none focus:ring-1 focus:ring-[#b9a277] transition-all"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-stone-400 hover:text-stone-600"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách các Option với hover morph highlight */}
            <div
              className="p-1.5 overflow-y-auto space-y-0.5"
              style={{ maxHeight: isSearchable ? `${menuMaxHeight - 50}px` : `${menuMaxHeight}px` }}
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8a8782]">
                  Không tìm thấy lựa chọn phù hợp
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onKeyDown={(e) => handleOptionKeyDown(e, opt)}
                      className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12.5px] cursor-pointer transition-all duration-150 outline-none ${
                        isSelected
                          ? 'bg-[#f4efe6] font-bold text-[#8c6d3b]'
                          : isHovered
                          ? 'bg-[#f8f5ee] text-[#203044]'
                          : 'text-[#373435] hover:bg-[#fbf8f2]'
                      }`}
                    >
                      {/* Vạch highlight định vị mượt mà */}
                      {isSelected && (
                        <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#b9a277]" />
                      )}

                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate leading-snug">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-[10.5px] text-[#8a8782] truncate mt-0.5 font-normal">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>

                      {/* Icon check đánh dấu mục đang chọn */}
                      {isSelected ? (
                        <span className="material-symbols-outlined text-[16px] text-[#b9a277] shrink-0 font-bold">
                          check
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px] text-transparent group-hover:text-[#b9a277]/40 shrink-0 transition-colors">
                          chevron_right
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
