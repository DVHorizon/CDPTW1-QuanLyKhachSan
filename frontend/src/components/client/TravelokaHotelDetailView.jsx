import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiRoomAdvisorWidget from './AiRoomAdvisorWidget';

/**
 * Component Hiển thị Thông tin chung của Khách sạn & Bảng các loại phòng còn trống
 * Chuẩn phong cách Traveloka Hotel Detail theo đúng hình ảnh người dùng cung cấp.
 */
export default function TravelokaHotelDetailView({
  branch,
  rooms = [],
  checkInDate,
  checkOutDate,
  totalGuests = 2,
  roomsCount = 1,
  numberOfNights = 1,
  loading = false,
  onBackToHotels,
  onSelectRoomForDetail,
  formatVND,
  formatDisplayDate
}) {
  const navigate = useNavigate();
  const [activeGalleryTab, setActiveGalleryTab] = useState('all');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  if (!branch) return null;

  // Danh sách hình ảnh của khách sạn
  const gallery = branch.Gallery && branch.Gallery.length > 0
    ? branch.Gallery
    : [
        branch.ImageUrl || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop'
      ];

  const ratingScore = branch.Rating ? (branch.Rating >= 5 ? '9.4' : (branch.Rating * 1.9).toFixed(1)) : '9.4';
  const ratingText = parseFloat(ratingScore) >= 9.0 ? 'Xuất sắc' : 'Rất tốt';
  const totalReviews = branch.TotalReviews || 248;

  const handleBookRoom = (room, ratePlan = 'standard') => {
    const p = new URLSearchParams();
    p.set('branchId', room.BranchId || branch.BranchId);
    p.set('roomTypeId', room.RoomTypeId);
    p.set('checkInDate', checkInDate);
    p.set('checkOutDate', checkOutDate);
    p.set('units', roomsCount);
    p.set('adults', totalGuests);
    if (ratePlan === 'non_refundable') {
      p.set('plan', 'promo');
    }
    navigate(`/dat-phong?${p.toString()}`);
  };

  return (
    <div className="w-full flex flex-col gap-space-lg animate-fade-in">

      {/* ══════════════════════════════════════════════════════════════
          1. TOP NAVIGATION & BREADCRUMB STRIP
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dedad0]">
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span className="hover:text-[#8c6d3b] cursor-pointer" onClick={() => navigate('/')}>Trang chủ</span>
          <span>&gt;</span>
          <span className="hover:text-[#8c6d3b] cursor-pointer" onClick={onBackToHotels}>Khách sạn</span>
          <span>&gt;</span>
          <span>Việt Nam</span>
          <span>&gt;</span>
          <span className="text-slate-700 font-semibold">{branch.City || 'Điểm đến'}</span>
          <span>&gt;</span>
          <span className="text-[#8c6d3b] font-bold">{branch.BranchName}</span>
        </div>

        <button
          type="button"
          onClick={onBackToHotels}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fbf8f2] hover:bg-[#8c6d3b] text-[#8c6d3b] hover:text-white border border-[#d8c49e] font-bold text-xs shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Chọn khách sạn khác</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. HOTEL PHOTO GALLERY GRID (CHUẨN TRAVELOKA)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-auto sm:h-[420px] rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white p-2">
        {/* Ảnh chính lớn bên trái (7 cột) */}
        <div 
          onClick={() => setSelectedPhotoModal(gallery[0])}
          className="lg:col-span-7 h-64 sm:h-full relative overflow-hidden rounded-xl cursor-pointer group"
        >
          <img
            src={gallery[0]}
            alt={branch.BranchName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 text-white">
            <span className="px-2.5 py-1 rounded-md bg-[#8c6d3b] text-white text-[11px] font-bold uppercase tracking-wider">
              Khu nghỉ dưỡng 5 sao
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold mt-1.5 drop-shadow-md">
              {branch.BranchName}
            </h2>
          </div>
        </div>

        {/* Lưới ảnh nhỏ bên phải (5 cột, chia 4 ô) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2 h-64 sm:h-full">
          {gallery.slice(1, 5).map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPhotoModal(img)}
              className="relative overflow-hidden rounded-xl cursor-pointer group h-full"
            >
              <img
                src={img}
                alt={`${branch.BranchName} - ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              {idx === 3 && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-2 text-center group-hover:bg-black/65 transition-colors">
                  <span className="material-symbols-outlined text-2xl mb-1">photo_library</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Xem tất cả ảnh</span>
                  <span className="text-[11px] text-white/80">({gallery.length}+ bức ảnh)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. THÔNG TIN CHUNG CỦA KHÁCH SẠN (GENERAL OVERVIEW BOX)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
        
        {/* Hàng Tiêu Đề, Sao, và Địa chỉ */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                {branch.BranchName}
              </h1>
              <span className="flex text-amber-400 text-lg tracking-tight select-none">
                ★★★★★
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                Đang mở đón khách
              </span>
            </div>
            
            <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-2">
              <span className="material-symbols-outlined text-[#8c6d3b] text-[18px]">location_on</span>
              <span className="font-medium">{branch.Address || 'Bờ biển nguyên sơ, Việt Nam'}</span>
              <span className="text-slate-400 mx-1">•</span>
              <span className="text-slate-500">{branch.City || 'Việt Nam'}</span>
            </p>
          </div>

          {/* Hotline & Cam kết giá */}
          <div className="flex items-center gap-3 bg-[#fbf8f2] border border-[#d8c49e]/60 rounded-xl px-4 py-2.5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#8c6d3b] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hotline Quản Gia</span>
              <a href="tel:19006868" className="text-sm font-bold text-[#8c6d3b] hover:underline">
                1900 6868 (24/7)
              </a>
            </div>
          </div>
        </div>

        {/* Lưới 3 Cột: Điểm Đánh Giá / Tiện Ích Chính / Quy Định Lưu Trú */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* CỘT 1: ĐIỂM ĐÁNH GIÁ & REVIEW */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đánh giá từ khách hàng</span>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-12 h-12 rounded-xl bg-[#203044] text-[#ffd985] flex items-center justify-center font-bold text-xl shadow-xs border border-[#b9a277]/40 shrink-0">
                  {ratingScore}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">{ratingText}</h4>
                  <p className="text-xs text-slate-500">{totalReviews} lượt đánh giá thực tế</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic mt-3 line-clamp-3 bg-white p-2.5 rounded-lg border border-slate-200/50">
                "{branch.Highlight || 'Khu nghỉ dưỡng 5 sao sang trọng bậc nhất với bãi biển riêng tư tuyệt đẹp, dịch vụ quản gia chu đáo và không gian ẩm thực tinh hoa.'}"
              </p>
            </div>
          </div>

          {/* CỘT 2: CÁC TIỆN ÍCH CHÍNH CỦA KHÁCH SẠN */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tiện ích chính tại khách sạn</span>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">beach_access</span>
                <span>Bãi biển riêng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">pool</span>
                <span>Hồ bơi vô cực</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">restaurant</span>
                <span>Buffet sáng 5 sao</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">spa</span>
                <span>Spa &amp; Trị liệu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">airport_shuttle</span>
                <span>Xe đưa đón VIP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">wifi</span>
                <span>Wi-Fi 500Mbps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">room_service</span>
                <span>Lễ tân 24/7</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">local_parking</span>
                <span>Chỗ đậu xe VIP</span>
              </div>
            </div>
          </div>

          {/* CỘT 3: THỜI GIAN NHẬN / TRẢ PHÒNG & CHÍNH SÁCH */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chính sách nhận / trả phòng</span>
              <div className="flex flex-col gap-2 mt-2 text-xs text-slate-700">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200/50">
                  <span className="font-medium text-slate-500">Giờ nhận phòng:</span>
                  <span className="font-bold text-slate-800">Từ 14:00</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200/50">
                  <span className="font-medium text-slate-500">Giờ trả phòng:</span>
                  <span className="font-bold text-slate-800">Trước 12:00</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Hỗ trợ nhận phòng sớm / trả phòng trễ tùy thuộc vào tình trạng phòng thực tế.
            </p>
          </div>

        </div>

      </div>

      {/* WIDGET CỐ VẤN AI GỢI Ý PHÒNG THÔNG MINH (RAG + GEMINI) */}
      <AiRoomAdvisorWidget
        variant="search"
        onSelectRoom={(r) => onSelectRoomForDetail(r)}
      />

      {/* ══════════════════════════════════════════════════════════════
          4. BẢNG CÁC LOẠI PHÒNG CÒN TRỐNG (ROOM TYPES INVENTORY)
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-space-md">
        
        {/* Tiêu đề Bảng Phòng Chuẩn Traveloka */}
        <div className="bg-[#203044] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffd985]">meeting_room</span>
              <span>Những phòng còn trống tại {branch.BranchName}</span>
            </h3>
            <p className="text-xs text-white/80 mt-1">
              Thời gian lưu trú: <strong>{formatDisplayDate(checkInDate)} — {formatDisplayDate(checkOutDate)}</strong> ({numberOfNights} đêm) • {totalGuests} Khách • {roomsCount} Phòng
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#ffd985] bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 self-start sm:self-auto">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>{rooms.length} hạng phòng &amp; biệt thự khả dụng</span>
          </div>
        </div>

        {/* Danh sách bảng chi tiết từng loại phòng */}
        {rooms.length > 0 ? (
          rooms.map((room) => {
            const minPrice = room.BasePrice || 2500000;
            const originalPrice = room.OriginalPrice || Math.round(minPrice * 1.35);
            const totalWithTax = room.TotalPrice || Math.round(minPrice * numberOfNights * 1.08);

            // Gói 2 ưu đãi (Non-refundable giảm thêm 8%)
            const promoPrice = Math.round(minPrice * 0.92);
            const promoTotal = Math.round(promoPrice * numberOfNights * 1.08);

            return (
              <div
                key={room.RoomTypeId}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Header thanh tên hạng phòng */}
                <div className="bg-[#fbf8f2] px-5 py-3 border-b border-[#dedad0] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#8c6d3b] text-xl">bed</span>
                    <h4 
                      onClick={() => onSelectRoomForDetail(room)}
                      className="font-bold text-base sm:text-lg text-slate-900 hover:text-[#8c6d3b] cursor-pointer transition-colors"
                    >
                      {room.TypeName}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8c6d3b]/10 text-[#8c6d3b] text-xs font-semibold">
                      {room.Badge || 'Hạng Thượng Tuyển'}
                    </span>
                  </div>

                  {room.IsLimited ? (
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                      Chỉ còn {room.AvailableRooms} phòng trống!
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Còn {room.AvailableRooms} phòng trống
                    </span>
                  )}
                </div>

                {/* Nội dung bảng phòng: Cột Trái (Ảnh & Specs) + Cột Phải (Bảng Gói & Giá) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                  
                  {/* CỘT TRÁI (35% -> 4 of 12 cols): ẢNH & THÔNG SỐ PHÒNG */}
                  <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-slate-50/40">
                    <div>
                      {/* Ảnh phòng */}
                      <div className="relative h-48 rounded-xl overflow-hidden group cursor-pointer" onClick={() => onSelectRoomForDetail(room)}>
                        <img
                          src={room.ImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop'}
                          alt={room.TypeName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>Xem ảnh</span>
                        </div>
                      </div>

                      {/* Thông số phòng */}
                      <div className="mt-3.5 flex flex-col gap-2 text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">square_foot</span>
                          <span>Diện tích: <strong>{room.Area || '65 m²'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">king_bed</span>
                          <span>Loại giường: <strong>{room.BedType || '1 King Siêu Lớn'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">balcony</span>
                          <span>Tầm nhìn: <strong>{room.View || 'Biển Trực Diện'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#8c6d3b]">smoke_free</span>
                          <span>Không hút thuốc trong phòng</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRoomForDetail(room)}
                      className="text-xs font-bold text-[#8c6d3b] hover:text-[#74572b] flex items-center gap-1 hover:underline self-start pt-2 cursor-pointer"
                    >
                      <span>Xem đầy đủ chi tiết &amp; tiện nghi</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>

                  {/* CỘT PHẢI (65% -> 8 of 12 cols): BẢNG CÁC GÓI ĐẶT PHÒNG */}
                  <div className="lg:col-span-8 flex flex-col divide-y divide-slate-100">
                    
                    {/* Header cột của bảng */}
                    <div className="hidden sm:grid grid-cols-12 bg-slate-100/80 px-4 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <div className="col-span-5">Lựa chọn phòng &amp; Quyền lợi</div>
                      <div className="col-span-2 text-center">Khách</div>
                      <div className="col-span-3 text-right">Giá / phòng / đêm</div>
                      <div className="col-span-2 text-center">Thao tác</div>
                    </div>

                    {/* GÓI 1: GÓI TIÊU CHUẨN 5 SAO (KÈM BUFFET SÁNG & HỦY MIỄN PHÍ) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center p-4 gap-3 hover:bg-[#fcfbf9] transition-colors">
                      {/* Quyền lợi */}
                      <div className="sm:col-span-5 flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Gói Nghỉ Dưỡng Thượng Hạng (Khuyên dùng)
                        </span>
                        <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <span className="material-symbols-outlined text-[14px]">restaurant</span>
                            <span>Bao gồm Buffet Sáng 5 sao miễn phí</span>
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                            <span>Miễn phí hủy phòng trước 48h</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <span className="material-symbols-outlined text-[14px]">bolt</span>
                            <span>Xác nhận tức thì không chờ đợi</span>
                          </span>
                        </div>
                      </div>

                      {/* Khách */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center gap-1 text-xs text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">group</span>
                        <span>{room.MaxOccupancy || totalGuests} khách</span>
                      </div>

                      {/* Giá */}
                      <div className="sm:col-span-3 flex flex-col sm:items-end text-left sm:text-right">
                        <span className="text-xs text-slate-400 line-through">
                          {formatVND(originalPrice)}
                        </span>
                        <div className="flex items-baseline gap-1 text-left sm:justify-end">
                          <span className="text-lg sm:text-xl font-bold text-[#8c6d3b]">
                            {formatVND(minPrice)}
                          </span>
                          <span className="text-[11px] text-slate-500">/đêm</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Tổng {numberOfNights} đêm: {formatVND(totalWithTax)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Đã gồm thuế &amp; phí
                        </span>
                      </div>

                      {/* Nút đặt phòng */}
                      <div className="sm:col-span-2 flex sm:justify-center">
                        <button
                          type="button"
                          onClick={() => handleBookRoom(room, 'standard')}
                          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#8c6d3b] hover:bg-[#74572b] active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Đặt ngay</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* GÓI 2: GÓI TIẾT KIỆM KHÔNG HOÀN HỦY (NON-REFUNDABLE - TIẾT KIỆM THÊM 8%) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center p-4 gap-3 bg-slate-50/50 hover:bg-[#fcfbf9] transition-colors">
                      {/* Quyền lợi */}
                      <div className="sm:col-span-5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            Gói Ưu Đãi Tiết Kiệm (Early Bird)
                          </span>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Tiết kiệm 8%
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1 text-slate-700">
                            <span className="material-symbols-outlined text-[14px]">restaurant</span>
                            <span>Không bao gồm bữa sáng</span>
                          </span>
                          <span className="flex items-center gap-1 text-amber-700">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span>Không hoàn hủy / đổi ngày</span>
                          </span>
                        </div>
                      </div>

                      {/* Khách */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center gap-1 text-xs text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">group</span>
                        <span>{room.MaxOccupancy || totalGuests} khách</span>
                      </div>

                      {/* Giá */}
                      <div className="sm:col-span-3 flex flex-col sm:items-end text-left sm:text-right">
                        <span className="text-xs text-slate-400 line-through">
                          {formatVND(minPrice)}
                        </span>
                        <div className="flex items-baseline gap-1 text-left sm:justify-end">
                          <span className="text-lg sm:text-xl font-bold text-[#8c6d3b]">
                            {formatVND(promoPrice)}
                          </span>
                          <span className="text-[11px] text-slate-500">/đêm</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Tổng {numberOfNights} đêm: {formatVND(promoTotal)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Đã gồm thuế &amp; phí
                        </span>
                      </div>

                      {/* Nút đặt phòng */}
                      <div className="sm:col-span-2 flex sm:justify-center">
                        <button
                          type="button"
                          onClick={() => handleBookRoom(room, 'non_refundable')}
                          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#203044] hover:bg-[#131b2e] active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Đặt ngay</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-slate-400">hotel_class</span>
            <h4 className="font-bold text-lg text-slate-800">Không có phòng trống trong khoảng thời gian này</h4>
            <p className="text-xs text-slate-500 max-w-md">
              Hiện tại các hạng phòng tại {branch.BranchName} đã kín chỗ cho ngày bạn chọn. Vui lòng chọn khoảng ngày khác hoặc khám phá các chi nhánh khác.
            </p>
            <button
              type="button"
              onClick={onBackToHotels}
              className="mt-2 px-5 py-2 bg-[#8c6d3b] text-white text-xs font-bold rounded-xl hover:bg-[#74572b] transition-colors"
            >
              Xem khách sạn khác
            </button>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. VỊ TRÍ & TIỆN ÍCH XUNG QUANH (SURROUNDING ATTRACTIONS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8c6d3b] text-xl">explore</span>
          <h4 className="font-bold text-base sm:text-lg text-slate-900">
            Vị trí &amp; Điểm đến lân cận {branch.BranchName}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#8c6d3b] text-lg shrink-0">flight</span>
            <div>
              <span className="font-bold text-slate-900 block">Sân bay Quốc tế</span>
              <span className="text-slate-500">Cách khu nghỉ dưỡng 20-30 phút (Có xe đưa đón riêng)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#8c6d3b] text-lg shrink-0">waves</span>
            <div>
              <span className="font-bold text-slate-900 block">Bãi tắm độc quyền</span>
              <span className="text-slate-500">Bãi biển riêng tư ngay trước mặt phòng nghỉ</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#8c6d3b] text-lg shrink-0">storefront</span>
            <div>
              <span className="font-bold text-slate-900 block">Trung tâm &amp; Chợ đêm</span>
              <span className="text-slate-500">Cách 10-15 phút di chuyển bằng xe điện / taxi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh */}
      {selectedPhotoModal && (
        <div 
          onClick={() => setSelectedPhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <img
              src={selectedPhotoModal}
              alt="Chi tiết ảnh"
              className="w-full h-full object-contain max-h-[85vh]"
            />
            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
