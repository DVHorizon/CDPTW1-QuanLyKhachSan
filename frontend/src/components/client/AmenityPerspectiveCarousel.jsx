import React, { useState, useEffect, useRef } from 'react';

// Dữ liệu 8 tiện ích 5 sao chuẩn mực theo thiết kế sang trọng Grand Horizon
const LUXURY_AMENITIES = [
  {
    id: 1,
    number: '01',
    title: 'Hồ Bơi Vô Cực Chân Mây',
    subtitle: 'Infinity Horizon Pool & Sunset Bar',
    description: 'Hồ bơi nước mặn tràn bờ nối liền đại dương, quầy pool bar sang trọng phục vụ cocktail nhiệt đới và tiệc trà chiều hoàng hôn.',
    tag: 'ĐẶC QUYỀN NGHỈ DƯỠNG',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 2,
    number: '02',
    title: 'Grand Horizon Spa & Wellness',
    subtitle: 'Organic Herbal & Himalaya Salt',
    description: 'Các liệu trình trị liệu cổ truyền kết hợp tinh dầu thảo dược hữu cơ, xông hơi đá muối Himalaya và bồn ngâm thảo mộc hồi phục năng lượng.',
    tag: 'CHĂM SÓC SỨC KHỎE',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 3,
    number: '03',
    title: 'Bãi Biển Biệt Lập Độc Quyền',
    subtitle: 'Private Beachfront Sanctuary',
    description: 'Hơn 1km dải cát trắng mịn màng độc quyền, ghế cabana nghỉ dưỡng riêng tư và dịch vụ phục vụ đồ uống, ẩm thực tận bờ biển 24/7.',
    tag: 'BÃI BIỂN RIÊNG 5★',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 4,
    number: '04',
    title: 'Ẩm Thực Fine Dining The Azure',
    subtitle: 'Michelin Taste & Wine Cellar',
    description: 'Ẩm thực fusion hải sản cao cấp chế biến bởi đầu bếp 5 sao, hầm rượu vang thượng hạng với hơn 300 niên vụ danh tiếng toàn cầu.',
    tag: 'TINH HOA ẨM THỰC',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 5,
    number: '05',
    title: 'Du Thuyền Hoàng Hôn VIP',
    subtitle: 'Private Sunset Yacht Cruise',
    description: 'Hải trình thưởng ngoạn hoàng hôn vịnh biển trên du thuyền tư nhân, tiệc canapé thượng hạng và Champagne ướp lạnh đẳng cấp.',
    tag: 'TRẢI NGHIỆM ĐỘC BẢN',
    imageUrl: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 6,
    number: '06',
    title: 'Dịch Vụ Quản Gia Riêng 24/7',
    subtitle: 'Elite Personal Butler Care',
    description: 'Chuẩn mực chăm sóc tận tâm đến từng chi tiết cá nhân hóa: chuẩn bị bồn hoa hồng, thu xếp hành lý và thiết kế lịch trình chuyên biệt.',
    tag: 'QUẢN GIA THƯỢNG HẠNG',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 7,
    number: '07',
    title: 'Bồn Tắm Nằm Jacuzzi View Biển',
    subtitle: 'Ocean Panorama Hydrotherapy',
    description: 'Thư giãn trong làn nước ấm thủy lực bên khung cửa sổ kính panorama rộng mở, ngắm trọn khoảnh khắc sóng vỗ về bờ cát êm đềm.',
    tag: 'TIỆN NGHI THƯỢNG HẠNG',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 8,
    number: '08',
    title: 'Đưa Đón Sân Bay Bằng Limousine',
    subtitle: 'Mercedes Maybach Airport Transfer',
    description: 'Đội xe Mercedes & Limousine sang trọng đón rước quý khách ngay từ sân bay về resort với wifi tốc độ cao và tiện nghi VIP.',
    tag: 'DỊCH VỤ ĐƯA ĐÓN VIP',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop'
  }
];

export default function AmenityPerspectiveCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalItems = LUXURY_AMENITIES.length;
  const containerRef = useRef(null);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto py-10 px-4 sm:px-6 select-none overflow-hidden">
      {/* 3D Perspective Coverflow Stage */}
      <div 
        ref={containerRef}
        className="relative h-[530px] sm:h-[560px] md:h-[580px] w-full flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {LUXURY_AMENITIES.map((item, index) => {
          // Tính offset vòng tròn (circular offset)
          let offset = index - currentIndex;
          if (offset > totalItems / 2) offset -= totalItems;
          if (offset < -totalItems / 2) offset += totalItems;

          const isCenter = offset === 0;
          const isImmediate = Math.abs(offset) === 1;
          const isOuter = Math.abs(offset) === 2;
          const isHidden = Math.abs(offset) > 2;

          // Tính toán vị trí 3D
          let translateX = '0%';
          let translateZ = '0px';
          let scale = 1;
          let opacity = 1;
          let zIndex = 30;
          let rotateY = 0;

          if (isCenter) {
            translateX = '0%';
            translateZ = '0px';
            scale = 1;
            opacity = 1;
            zIndex = 30;
            rotateY = 0;
          } else if (offset === 1) {
            // Bên phải kề cận
            translateX = '55%';
            translateZ = '-90px';
            scale = 0.88;
            opacity = 0.65;
            zIndex = 20;
            rotateY = -6;
          } else if (offset === -1) {
            // Bên trái kề cận
            translateX = '-55%';
            translateZ = '-90px';
            scale = 0.88;
            opacity = 0.65;
            zIndex = 20;
            rotateY = 6;
          } else if (offset === 2) {
            // Bên phải ngoài cùng
            translateX = '100%';
            translateZ = '-180px';
            scale = 0.76;
            opacity = 0.35;
            zIndex = 10;
            rotateY = -10;
          } else if (offset === -2) {
            // Bên trái ngoài cùng
            translateX = '-100%';
            translateZ = '-180px';
            scale = 0.76;
            opacity = 0.35;
            zIndex = 10;
            rotateY = 10;
          } else {
            // Ẩn đi
            translateX = offset > 0 ? '140%' : '-140%';
            scale = 0.6;
            opacity = 0;
            zIndex = 1;
          }

          return (
            <div
              key={item.id}
              onClick={() => {
                if (!isCenter) setCurrentIndex(index);
              }}
              style={{
                transform: `translateX(${translateX}) translateZ(${translateZ}) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
                transition: 'all 550ms cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: isHidden ? 'none' : 'auto',
                cursor: isCenter ? 'default' : 'pointer'
              }}
              className="absolute w-[295px] sm:w-[350px] md:w-[385px] h-[490px] sm:h-[515px] md:h-[535px] rounded-[28px] bg-[#f4ede1] border border-[#d8cbb8] shadow-[0_15px_40px_rgba(32,48,68,0.12)] p-4 sm:p-5 flex flex-col justify-between transition-all group overflow-hidden"
            >
              {/* Top Photo */}
              <div className="relative w-full h-[200px] sm:h-[220px] rounded-[20px] overflow-hidden bg-slate-200 shrink-0 shadow-inner">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Badge Tag nhỏ trên ảnh */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#131b2e]/80 backdrop-blur-md border border-[#ffd985]/30 text-[#ffd985] text-[10px] font-bold tracking-wider uppercase">
                  {item.tag}
                </div>
              </div>

              {/* Card Body với số thứ tự lớn chuẩn phong cách Amory Luxury */}
              <div className="flex-1 flex flex-col justify-between pt-4 pb-1">
                <div>
                  {/* Số thứ tự Serif to bản màu vàng kim */}
                  <div className="font-serif italic text-4xl sm:text-[46px] text-[#b9a277] leading-none mb-1 font-normal tracking-tight">
                    {item.number}
                  </div>

                  {/* Tiêu đề tiện nghi */}
                  <h3 className="font-serif text-[20px] sm:text-[22px] text-[#131b2e] font-bold leading-tight mb-1.5 tracking-tight">
                    {item.title}
                  </h3>

                  {/* Phụ đề thanh lịch */}
                  <p className="text-[11.5px] font-semibold text-[#8c6d3b] uppercase tracking-wider mb-2">
                    {item.subtitle}
                  </p>

                  {/* Mô tả trải nghiệm chuẩn khách sạn 5 sao */}
                  <p className="text-[12.5px] sm:text-[13px] text-[#373435]/85 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Tag Pill */}
                <div className="pt-3 border-t border-[#dedad0]/70 flex items-center justify-between">
                  <span className="inline-block px-3 py-0.5 rounded-full border border-[#8c6d3b]/40 text-[#8c6d3b] text-[10px] font-bold uppercase tracking-widest bg-white/50">
                    Grand Horizon Service
                  </span>

                  <span className="text-[11.5px] font-bold text-[#b9a277] flex items-center gap-1">
                    <span>Chuẩn 5★</span>
                    <span className="material-symbols-outlined text-[14px]">stars</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Nút Previous tròn màu nâu/vàng bên trái */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Tiện nghi trước"
          className="absolute left-1 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#8c6d3b] hover:bg-[#70562e] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 z-40 cursor-pointer active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:-translate-x-0.5 transition-transform">
            chevron_left
          </span>
        </button>

        {/* Nút Next tròn màu nâu/vàng bên phải */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Tiện nghi tiếp theo"
          className="absolute right-1 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#8c6d3b] hover:bg-[#70562e] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 z-40 cursor-pointer active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:translate-x-0.5 transition-transform">
            chevron_right
          </span>
        </button>
      </div>

      {/* Dots Indicator & Navigation Counter */}
      <div className="flex flex-col items-center justify-center gap-2 mt-4">
        <div className="flex items-center gap-2">
          {LUXURY_AMENITIES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentIndex
                  ? 'w-7 bg-[#8c6d3b]'
                  : 'w-2 bg-[#dedad0] hover:bg-[#b9a277]'
              }`}
              aria-label={`Chuyển tới tiện nghi ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-xs font-serif italic text-slate-500 tracking-wider">
          {LUXURY_AMENITIES[currentIndex].number} / 0{totalItems} • {LUXURY_AMENITIES[currentIndex].title}
        </span>
      </div>
    </div>
  );
}
