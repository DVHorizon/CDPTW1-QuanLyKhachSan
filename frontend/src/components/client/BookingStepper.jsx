import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component hiển thị tiến trình 3 bước chuẩn của quy trình đặt phòng khách sạn:
 * Bước 1: Chọn Khách Sạn (Hotel / Resort)
 * Bước 2: Chọn Loại Phòng (Room Type)
 * Bước 3: Đặt Phòng & Mua (Booking & Checkout)
 */
export default function BookingStepper({
  currentStep = 2,
  selectedHotelName = 'Grand Horizon Phú Quốc Luxury Resort',
  selectedRoomName = null,
  branchId = '1',
  onChangeHotel = null
}) {
  const navigate = useNavigate();

  const handleStep1Click = () => {
    if (onChangeHotel) {
      onChangeHotel();
    } else {
      navigate('/hotels');
    }
  };

  const handleStep2Click = () => {
    if (currentStep === 3) {
      navigate(`/rooms?branchId=${branchId}`);
    }
  };

  return (
    <div className="w-full bg-[#131b2e] border-b border-[#ffd985]/20 py-3.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tiêu đề quy trình */}
        <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm font-medium shrink-0">
          <span className="material-symbols-outlined text-[#ffd985] text-lg">route</span>
          <span className="uppercase tracking-wider font-semibold text-[#ffd985]">Quy trình đặt phòng:</span>
        </div>

        {/* Thanh Stepper 3 Bước */}
        <div className="flex items-center gap-1.5 sm:gap-3 w-full md:w-auto justify-center overflow-x-auto py-1">
          {/* BƯỚC 1: CHỌN KHÁCH SẠN */}
          <div
            onClick={handleStep1Click}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              currentStep === 1
                ? 'bg-[#ffd985] text-[#131b2e] shadow-sm font-bold ring-2 ring-[#ffd985]/50'
                : currentStep > 1
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            title="Bấm để đổi khách sạn khác"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 1 ? 'bg-[#131b2e] text-[#ffd985]' : currentStep > 1 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Bước 1: Chọn Khách Sạn</span>
              {selectedHotelName && (
                <span className="text-[10px] font-normal opacity-90 truncate max-w-[130px] sm:max-w-[180px]">
                  {selectedHotelName.replace('Grand Horizon ', '')}
                </span>
              )}
            </div>
            {currentStep > 1 && (
              <span className="material-symbols-outlined text-xs opacity-75">swap_horiz</span>
            )}
          </div>

          <span className="text-white/30 text-xs">➔</span>

          {/* BƯỚC 2: CHỌN LOẠI PHÒNG */}
          <div
            onClick={handleStep2Click}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 2
                ? 'bg-[#ffd985] text-[#131b2e] shadow-sm font-bold ring-2 ring-[#ffd985]/50'
                : currentStep > 2
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 cursor-pointer hover:bg-emerald-900/50'
                : 'bg-white/5 text-white/50'
            }`}
            title={currentStep === 3 ? 'Bấm để chọn loại phòng khác' : 'Chọn loại phòng nghỉ dưỡng'}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 2 ? 'bg-[#131b2e] text-[#ffd985]' : currentStep > 2 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Bước 2: Chọn Loại Phòng</span>
              {selectedRoomName ? (
                <span className="text-[10px] font-normal opacity-90 truncate max-w-[130px] sm:max-w-[180px]">
                  {selectedRoomName}
                </span>
              ) : (
                <span className="text-[10px] font-normal opacity-75">
                  {currentStep === 2 ? 'Đang chọn phòng' : 'Chưa chọn'}
                </span>
              )}
            </div>
            {currentStep > 2 && (
              <span className="material-symbols-outlined text-xs opacity-75">swap_horiz</span>
            )}
          </div>

          <span className="text-white/30 text-xs">➔</span>

          {/* BƯỚC 3: MUA / ĐẶT PHÒNG */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 3
                ? 'bg-[#ffd985] text-[#131b2e] shadow-sm font-bold ring-2 ring-[#ffd985]/50 animate-pulse'
                : 'bg-white/5 text-white/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
              currentStep === 3 ? 'bg-[#131b2e] text-[#ffd985]' : 'bg-white/20 text-white'
            }`}>
              3
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight">Bước 3: Mua / Đặt Phòng</span>
              <span className="text-[10px] font-normal opacity-75">
                {currentStep === 3 ? 'Nhập thông tin & Mua' : 'Hoàn tất'}
              </span>
            </div>
          </div>
        </div>

        {/* Nút hỗ trợ tư vấn */}
        <div className="hidden lg:flex items-center gap-2 text-white/70 text-xs">
          <span className="material-symbols-outlined text-sm text-[#ffd985]">support_agent</span>
          <span>Hotline hỗ trợ: <strong className="text-white">1900 6868</strong></span>
        </div>
      </div>
    </div>
  );
}
