import React from 'react';

// Format tiền tệ VND
const formatVND = (num) => {
  return Number(num || 0).toLocaleString('vi-VN') + 'đ';
};

/**
 * Component lựa chọn Khách Sạn / Chi Nhánh trực quan (Bước 1 của quy trình)
 * Cho phép khách hàng xem ảnh, địa chỉ, giá khởi điểm và chọn 1 khách sạn cụ thể.
 */
export default function HotelSelectorBar({
  branches = [],
  selectedBranchId = '1',
  onSelectBranch,
  isExpanded = true,
  onToggleExpand
}) {
  if (!branches || branches.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-[#dedad0] overflow-hidden mb-6 transition-all">
      {/* Header bar của bộ chọn khách sạn */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#131b2e] to-[#203044] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#ffd985]/20 flex items-center justify-center text-[#ffd985]">
            <span className="material-symbols-outlined text-lg">domain</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>Bước 1: Chọn Khách Sạn & Khu Nghỉ Dưỡng</span>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-[#ffd985] text-[#131b2e] font-bold uppercase tracking-wider">
                5 Điểm Đến 5★
              </span>
            </h3>
            <p className="text-[11px] text-white/70 hidden sm:block">
              Chọn một khách sạn trong hệ thống Grand Horizon để xem danh sách phòng nghỉ và biệt thự thuộc khách sạn đó.
            </p>
          </div>
        </div>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="text-xs text-[#ffd985] hover:text-white flex items-center gap-1 font-semibold px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Xem toàn bộ 5 khách sạn'}</span>
            <span className="material-symbols-outlined text-sm">
              {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>
        )}
      </div>

      {/* Grid danh sách 5 khách sạn */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-[#fafaf8]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {branches.map((branch) => {
              const isSelected = String(branch.BranchId) === String(selectedBranchId);
              return (
                <div
                  key={branch.BranchId}
                  onClick={() => onSelectBranch(branch.BranchId)}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col ${
                    isSelected
                      ? 'ring-2 ring-[#ffd985] bg-white shadow-lg border-2 border-[#ffd985] scale-[1.02]'
                      : 'bg-white border border-[#dedad0] hover:border-[#b9a277] hover:shadow-md'
                  }`}
                >
                  {/* Ảnh khách sạn */}
                  <div className="relative h-28 w-full overflow-hidden bg-slate-200">
                    <img
                      src={branch.ImageUrl || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=600&auto=format&fit=crop'}
                      alt={branch.BranchName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                    {/* Badge Trạng thái đang chọn */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#ffd985] text-[#131b2e] text-[10.5px] font-bold shadow-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>Đang chọn</span>
                      </div>
                    )}

                    {/* Vị trí / Tỉnh thành */}
                    <div className="absolute bottom-2 left-2 text-white flex items-center gap-1 text-[11px] font-medium drop-shadow-sm">
                      <span className="material-symbols-outlined text-[13px] text-[#ffd985]">location_on</span>
                      <span className="truncate max-w-[150px]">{branch.City || 'Việt Nam'}</span>
                    </div>
                  </div>

                  {/* Nội dung thông tin khách sạn */}
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className={`font-serif text-[13px] font-bold line-clamp-1 leading-snug mb-1 ${
                        isSelected ? 'text-[#131b2e]' : 'text-slate-800 group-hover:text-[#b9a277]'
                      }`}>
                        {branch.BranchName.replace('Grand Horizon ', '')}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                        {branch.Address}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11.5px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block leading-tight">Giá chỉ từ</span>
                        <span className="font-bold text-[#b9a277]">
                          {formatVND(branch.MinPrice || 1850000)}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10.5px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#131b2e] text-[#ffd985]'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-[#ffd985] group-hover:text-[#131b2e]'
                      }`}>
                        {isSelected ? 'Đang xem' : 'Chọn ➔'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
