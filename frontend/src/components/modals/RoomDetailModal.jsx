import React, { useState } from 'react';

const RoomDetailModal = ({ room, isOpen, onClose, onBookNow }) => {
  if (!isOpen || !room) return null;

  const [selectedImage, setSelectedImage] = useState(room.ImageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dedad0] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all shadow-md"
          type="button"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        {/* Gallery / Main Image */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-[#203044] overflow-hidden rounded-t-2xl">
          <img 
            src={selectedImage || room.ImageUrl} 
            alt={room.TypeName}
            className="w-full h-full object-cover transition-all duration-500" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-[#203044]/90 backdrop-blur-md text-[#b9a277] text-[12px] font-bold uppercase tracking-wider border border-[#b9a277]/40 shadow-sm">
              {room.Badge || 'Grand Horizon 5 Sao'}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#203044] text-[12px] font-bold flex items-center gap-1 shadow-sm">
              <span className="text-[#b9a277]">★</span> {room.Rating || '5.0'} ({room.TotalReviews || 99}+ đánh giá)
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="font-serif text-[22px] sm:text-[30px] font-bold tracking-tight drop-shadow-md leading-tight">
              {room.TypeName}
            </h2>
            <p className="text-[13px] sm:text-[14px] text-white/90 drop-shadow line-clamp-1 mt-0.5">
              {room.ViewType}
            </p>
          </div>
        </div>

        {/* Thumbnail Selector */}
        {room.Gallery && room.Gallery.length > 1 && (
          <div className="flex gap-2.5 px-6 py-3 bg-[#fbf8f2] border-b border-[#dedad0] overflow-x-auto">
            {room.Gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(img)}
                className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  selectedImage === img ? 'border-[#b9a277] scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                type="button"
              >
                <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-7 flex-1 flex flex-col gap-6">
          {/* Quick Specs Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fbf8f2] border border-[#dedad0]/80">
              <span className="material-symbols-outlined text-[#b9a277] text-[22px]">square_foot</span>
              <div>
                <span className="text-[10px] text-[#8a8782] uppercase font-bold block">Diện tích</span>
                <span className="text-[13px] font-bold text-[#203044]">{room.SizeM2 || 60} m²</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fbf8f2] border border-[#dedad0]/80">
              <span className="material-symbols-outlined text-[#b9a277] text-[22px]">bed</span>
              <div>
                <span className="text-[10px] text-[#8a8782] uppercase font-bold block">Giường ngủ</span>
                <span className="text-[13px] font-bold text-[#203044] line-clamp-1">{room.BedType || '1 Giường King'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fbf8f2] border border-[#dedad0]/80">
              <span className="material-symbols-outlined text-[#b9a277] text-[22px]">group</span>
              <div>
                <span className="text-[10px] text-[#8a8782] uppercase font-bold block">Sức chứa</span>
                <span className="text-[13px] font-bold text-[#203044]">
                  {room.AdultCapacity || 2} Lớn • {room.ChildCapacity || 1} Trẻ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fbf8f2] border border-[#dedad0]/80">
              <span className="material-symbols-outlined text-[#b9a277] text-[22px]">visibility</span>
              <div>
                <span className="text-[10px] text-[#8a8782] uppercase font-bold block">Tầm nhìn</span>
                <span className="text-[13px] font-bold text-[#203044] line-clamp-1">{room.ViewType || 'View Biển'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[14px] uppercase font-bold text-[#203044] tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px]">info</span>
              Mô Tả Hạng Phòng
            </h3>
            <p className="text-[14px] text-[#373435]/90 leading-relaxed bg-[#fbf8f2]/60 p-4 rounded-xl border border-[#dedad0]/60">
              {room.Description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-[14px] uppercase font-bold text-[#203044] tracking-wider mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[18px]">verified</span>
              Tiện Nghi &amp; Dịch Vụ Đi Kèm
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(room.Amenities || [
                { name: 'Bữa sáng buffet 5 sao', icon: 'restaurant' },
                { name: 'Wifi tốc độ cao', icon: 'wifi' },
                { name: 'Ban công view biển', icon: 'deck' },
                { name: 'Bồn tắm thư giãn', icon: 'bathtub' }
              ]).map((am, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-[#dedad0] hover:border-[#b9a277] transition-colors">
                  <span className="material-symbols-outlined text-[#b9a277] text-[18px]">{am.icon || 'check_circle'}</span>
                  <span className="text-[12.5px] font-medium text-[#203044]">{am.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Policies & Benefits */}
          <div className="p-4 rounded-xl bg-[#b9a277]/10 border border-[#b9a277]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#b9a277] text-[24px]">verified_user</span>
              <div>
                <span className="text-[13px] font-bold text-[#203044] block">Cam Kết Giá Đặt Phòng Trực Tiếp Tốt Nhất</span>
                <span className="text-[12px] text-[#373435]/80">Miễn phí hủy phòng trước 48h • Tích điểm hội viên Elite 10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#fbf8f2] border-t border-[#dedad0] flex items-center justify-between gap-4 rounded-b-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8a8782] font-semibold uppercase">Giá ưu đãi</span>
              {room.OriginalPrice && (
                <span className="text-[12px] text-[#8a8782] line-through">
                  {Number(room.OriginalPrice).toLocaleString('vi-VN')}₫
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] sm:text-[26px] font-extrabold text-[#203044]">
                {Number(room.BasePrice).toLocaleString('vi-VN')}₫
              </span>
              <span className="text-[12px] text-[#8a8782]">/đêm</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#dedad0] text-[#203044] text-[13px] font-bold hover:bg-[#eae8df] transition-colors"
              type="button"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onClose();
                if (onBookNow) onBookNow(room);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              type="button"
            >
              <span>Đặt Phòng Ngay</span>
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
