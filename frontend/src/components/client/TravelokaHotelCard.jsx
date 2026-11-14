import React, { useState } from 'react';

// Format tiền tệ VND chuẩn Traveloka
const formatPriceVND = (num) => {
  return Number(num || 0).toLocaleString('vi-VN') + ' VND';
};

/**
 * Component Thẻ Khách Sạn (Nơi Lưu Trú) chuẩn phong cách Traveloka
 * Phục vụ Bước 1: Người dùng tìm và chọn Khách Sạn trước khi chọn loại phòng.
 */
export default function TravelokaHotelCard({
  hotel,
  onSelectHotel,
  isSaved = false,
  onToggleSave
}) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const photos = hotel.Gallery && hotel.Gallery.length > 0
    ? hotel.Gallery
    : [
        hotel.ImageUrl || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'
      ];

  const ratingScore = hotel.Rating ? (hotel.Rating >= 5 ? '9.4' : (hotel.Rating * 1.9).toFixed(1)) : '9.2';
  const ratingText = parseFloat(ratingScore) >= 9.0 ? 'Xuất sắc' : 'Rất tốt';
  const reviewsCount = hotel.TotalReviews || 128;

  const minPrice = hotel.MinPrice || 1850000;
  const originalPrice = Math.round(minPrice * 1.35);
  const totalWithTax = Math.round(minPrice * 1.08);

  return (
    <article className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-[#b9a277] shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col md:flex-row">
      
      {/* ─── CỘT 1: HÌNH ẢNH KHÁCH SẠN (CAROUSEL / SLIDER) ─── */}
      <div className="relative md:w-5/12 lg:w-4/12 h-64 md:h-auto min-h-[220px] bg-slate-100 overflow-hidden shrink-0">
        <img
          src={photos[activePhotoIdx]}
          alt={hotel.BranchName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Nút lưu yêu thích (Bookmark Icon góc phải trên ảnh) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSave) onToggleSave(hotel.BranchId);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          title="Lưu khách sạn vào yêu thích"
        >
          <span className="material-symbols-outlined text-[19px]">
            {isSaved ? 'bookmark_added' : 'bookmark_border'}
          </span>
        </button>

        {/* Photo slider dots ở chân ảnh */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-10">
            {photos.slice(0, 4).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  activePhotoIdx === idx
                    ? 'bg-white w-4'
                    : 'bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── CỘT 2 & 3: THÔNG TIN CHI TIẾT & GIÁ CẢ (CHUẨN TRAVELOKA) ─── */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        
        {/* Phần nội dung giữa (Tên + Vị trí + Tiện ích) */}
        <div>
          {/* Tên khách sạn & Sao xếp hạng */}
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <h3
              onClick={() => onSelectHotel(hotel.BranchId)}
              className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-[#8c6d3b] transition-colors cursor-pointer leading-snug"
            >
              {hotel.BranchName}
            </h3>
            <span className="flex text-amber-400 text-sm tracking-tight shrink-0 select-none">
              ★★★★★
            </span>
          </div>

          {/* Địa chỉ / Vị trí */}
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2.5">
            <span className="material-symbols-outlined text-[#8c6d3b] text-[15px] shrink-0">location_on</span>
            <span className="truncate">{hotel.Address || hotel.City || 'Việt Nam'}</span>
          </div>

          {/* Tiện ích nổi bật (Pills) */}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#8c6d3b]">beach_access</span>
              <span>Bãi biển riêng</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#8c6d3b]">pool</span>
              <span>Hồ bơi vô cực</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#8c6d3b]">restaurant</span>
              <span>Buffet sáng miễn phí</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#8c6d3b]">meeting_room</span>
              <span>{hotel.TotalRooms || 200} phòng nghỉ</span>
            </span>
          </div>
        </div>

        {/* Khối bên phải (Đánh giá + Ưu đãi + Giá tiền + Nút Chọn phòng) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          
          {/* Đánh giá */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {ratingText}
              </span>
              <span className="text-[11px] text-slate-400">
                ({reviewsCount} đánh giá)
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#203044] text-[#ffd985] flex items-center justify-center font-bold text-xs shadow-xs border border-[#b9a277]/40">
              {ratingScore}
            </div>
          </div>

          {/* Khối giá tiền & Nút Chọn phòng */}
          <div className="flex flex-col sm:items-end text-left sm:text-right">
            {/* Tag ưu đãi */}
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8c6d3b] bg-[#fbf8f2] border border-[#d8c49e]/70 px-2.5 py-0.5 rounded-md mb-1 w-fit sm:self-end">
              <span className="material-symbols-outlined text-[13px] text-[#8c6d3b]">local_offer</span>
              <span>{hotel.Tag || 'Special for you!'}</span>
            </div>

            {/* Giá gốc gạch ngang */}
            <span className="text-xs text-slate-400 line-through">
              {formatPriceVND(originalPrice)}
            </span>

            {/* Giá bán nổi bật - Tone Nâu Sang Trọng */}
            <div className="flex items-baseline gap-1 text-left sm:justify-end">
              <span className="text-xl sm:text-2xl font-bold text-[#8c6d3b]">
                {formatPriceVND(minPrice).replace(' VND', '')}
              </span>
              <span className="text-xs font-bold text-[#8c6d3b]">VND</span>
            </div>

            {/* Thuế phí */}
            <span className="text-[10.5px] text-slate-500">
              Tổng {formatPriceVND(totalWithTax)} cho 1 phòng
            </span>
            <span className="text-[10px] text-slate-400 mb-2">
              Bao gồm thuế và phí
            </span>

            {/* Nút Chọn phòng - Tone Nâu Sang Trọng Của Website */}
            <button
              type="button"
              onClick={() => onSelectHotel(hotel.BranchId)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#8c6d3b] hover:bg-[#74572b] active:scale-98 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Chọn phòng</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>
    </article>
  );
}

