import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * MorphDropdown
 * Component dropdown cao cấp chuẩn phong cách Luxury Hospitality:
 * - Nền 100% Opaque Solid (không bị mờ xuyên thấu vào hình nền bên dưới)
 * - Hỗ trợ nhóm danh mục (Categorized Groups: HOTELS, VILLAS, MIỀN BẮC, MIỀN TRUNG, MIỀN NAM...)
 * - Typography sang trọng: Tiêu đề in đậm có gạch chân thanh lịch khi chọn, phụ đề địa danh rõ nét
 * - Thanh tìm kiếm nhanh tích hợp khi có nhiều lựa chọn
 * - Tương tác mượt mà, hỗ trợ bàn phím và click-outside
 */

export default function MorphDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Chọn...",
  icon = null,
  className = "",
  menuMaxHeight = 360,
  dropdownWidth = "100%"
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredValue, setHoveredValue] = useState(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Chuẩn hóa options
  const normalizedOptions = useMemo(() => {
    return options.map((opt, i) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt, subLabel: '', group: '', index: i };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.label,
        label: opt.label || String(opt.value),
        subLabel: opt.subLabel || '',
        group: opt.group || '',
        index: i
      };
    });
  }, [options]);

  // Tìm option đang được chọn
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(o => String(o.value) === String(value)) || normalizedOptions[0];
  }, [normalizedOptions, value]);

  // Lọc theo tìm kiếm
  const isSearchable = normalizedOptions.length > 6;
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(o => 
      o.label.toLowerCase().includes(q) || 
      (o.subLabel && o.subLabel.toLowerCase().includes(q)) ||
      (o.group && o.group.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery, isSearchable]);

  // Nhóm options theo group (nếu có)
  const groupedOptions = useMemo(() => {
    const groups = {};
    const noGroup = [];

    filteredOptions.forEach(opt => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        noGroup.push(opt);
      }
    });

    return { groups, noGroup };
  }, [filteredOptions]);

  const hasGroups = Object.keys(groupedOptions.groups).length > 0;

  // Xử lý Click Outside & phím Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery('');
        setHoveredValue(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
        setHoveredValue(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Chọn option
  const handleSelect = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    setSearchQuery('');
    setHoveredValue(null);
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative select-none ${className}`}
      style={{ width: dropdownWidth, zIndex: open ? 50 : 10 }}
    >
      {/* TRIGGER BUTTON SANG TRỌNG */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-[46px] px-3.5 flex items-center justify-between rounded-xl border transition-all duration-200 cursor-pointer text-left bg-[#fbf8f2] border-[#dedad0] hover:border-[#b9a277] ${
          open ? 'ring-2 ring-[#b9a277]/30 border-[#b9a277] shadow-sm' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2 min-w-0">
          {icon && (
            <span className="material-symbols-outlined text-[17px] text-[#b9a277] shrink-0">
              {icon}
            </span>
          )}
          <span className="font-serif text-[14px] sm:text-[15px] font-bold text-[#203044] truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Mũi tên Chevron xoay mượt mà */}
        <span
          className={`material-symbols-outlined text-[18px] text-[#8a8782] transition-transform duration-300 shrink-0 ${
            open ? 'rotate-180 text-[#b9a277]' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* DROPDOWN MENU 100% OPAQUE - KHÔNG BỊ MỜ HAY XUYÊN THẤU */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 mt-2 w-full min-w-[280px] sm:min-w-[340px] rounded-2xl shadow-[0_25px_60px_-15px_rgba(20,30,45,0.4)] border border-[#dedad0] bg-white text-[#203044] overflow-hidden z-50 animate-scale-in"
          style={{
            maxHeight: `${menuMaxHeight}px`,
            transformOrigin: 'top center'
          }}
        >
          {/* Thanh tìm kiếm nhanh */}
          {isSearchable && (
            <div className="p-2.5 border-b border-[#dedad0] bg-[#fafaf8] sticky top-0 z-10">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[16px] text-[#8a8782]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm khách sạn, điểm đến..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium bg-white text-[#203044] border border-[#dedad0] placeholder-[#8a8782] focus:outline-none focus:border-[#b9a277] transition-all"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 text-stone-400 hover:text-stone-600"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Danh sách các Option phân chia theo nhóm như hình mẫu */}
          <div
            className="overflow-y-auto divide-y divide-[#dedad0]/60"
            style={{ maxHeight: isSearchable ? `${menuMaxHeight - 65}px` : `${menuMaxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8a8782]">
                Không tìm thấy địa điểm phù hợp
              </div>
            ) : hasGroups ? (
              // CÓ NHÓM DANH MỤC (NHƯ MIỀN BẮC, MIỀN TRUNG, MIỀN NAM hoặc HOTELS / VILLAS)
              Object.entries(groupedOptions.groups).map(([groupName, items]) => (
                <div key={groupName} className="py-2.5">
                  <div className="px-4 py-1 text-[10px] font-bold tracking-widest text-[#8a8782] uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b9a277]" />
                    <span>{groupName}</span>
                  </div>

                  <div className="mt-1 space-y-0.5 px-2">
                    {items.map((opt) => {
                      const isSelected = String(opt.value) === String(value);
                      const isHovered = hoveredValue === opt.value;

                      return (
                        <div
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                          onClick={() => handleSelect(opt)}
                          onMouseEnter={() => setHoveredValue(opt.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelect(opt);
                            }
                          }}
                          className={`group flex items-start justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-[#fbf8f2]'
                              : isHovered
                              ? 'bg-[#f7f5ed]'
                              : 'hover:bg-[#fafaf8]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-3">
                            <span
                              className={`text-[13.5px] leading-snug transition-colors ${
                                isSelected
                                  ? 'font-bold text-[#203044] underline decoration-[#b9a277] decoration-2 underline-offset-4'
                                  : 'font-semibold text-[#203044] group-hover:text-[#b9a277]'
                              }`}
                            >
                              {opt.label}
                            </span>
                            {opt.subLabel && (
                              <span className="text-[11.5px] text-[#64748b] leading-tight mt-1 font-normal">
                                {opt.subLabel}
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <span className="material-symbols-outlined text-[17px] text-[#b9a277] shrink-0 font-bold mt-0.5">
                              check
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              // KHÔNG PHÂN NHÓM (HIỂN THỊ DANH SÁCH THẲNG)
              <div className="p-2 space-y-0.5">
                {filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  const isHovered = hoveredValue === opt.value;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHoveredValue(opt.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(opt);
                        }
                      }}
                      className={`group flex items-start justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-[#fbf8f2]'
                          : isHovered
                          ? 'bg-[#f7f5ed]'
                          : 'hover:bg-[#fafaf8]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span
                          className={`text-[13.5px] leading-snug transition-colors ${
                            isSelected
                              ? 'font-bold text-[#203044] underline decoration-[#b9a277] decoration-2 underline-offset-4'
                              : 'font-semibold text-[#203044] group-hover:text-[#b9a277]'
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span className="text-[11.5px] text-[#64748b] leading-tight mt-1 font-normal">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="material-symbols-outlined text-[17px] text-[#b9a277] shrink-0 font-bold mt-0.5">
                          check
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
