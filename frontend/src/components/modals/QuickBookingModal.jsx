import React, { useState } from 'react';

const QuickBookingModal = ({ room, branch, branchName, checkIn, checkInDate, checkOut, checkOutDate, isOpen = true, onClose, onSuccess }) => {
  if (!isOpen || !room) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const initialCheckIn = checkIn || checkInDate || todayStr;
  
  // Tính ngày check-out mặc định nếu chưa có
  const calcDefaultCheckOut = (cin) => {
    const d = new Date(cin + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [bookingIn, setBookingIn] = useState(initialCheckIn);
  const [bookingOut, setBookingOut] = useState(checkOut || checkOutDate || calcDefaultCheckOut(initialCheckIn));
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Tính số đêm
  const d1 = new Date(bookingIn);
  const d2 = new Date(bookingOut);
  const diffTime = Math.max(d2 - d1, 86400000);
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const totalAmount = nights * (room.BasePrice || 1850000);

  const handleSubmit = (e) => {
    e.preventDefault();
    const refCode = 'GH-' + Math.floor(100000 + Math.random() * 900000);
    setBookingRef(refCode);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dedad0] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#203044] text-white flex items-center justify-between rounded-t-2xl relative">
          <div>
            <span className="text-[11px] text-[#b9a277] uppercase font-bold tracking-widest block">
              Grand Horizon Booking Engine
            </span>
            <h2 className="font-serif text-[20px] sm:text-[24px] font-bold mt-0.5">
              {isSuccess ? 'Đặt Phòng Thành Công!' : 'Xác Nhận Đặt Phòng Nhanh'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm animate-bounce">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[12px] border border-emerald-200 mb-2">
              MÃ ĐẶT PHÒNG: {bookingRef}
            </span>

            <h3 className="font-serif text-[22px] font-bold text-[#203044] mb-2">
              Cảm Ơn Quý Khách, {guestName}!
            </h3>

            <p className="text-[14px] text-[#373435]/80 max-w-md mb-6 leading-relaxed">
              Thông tin xác nhận đặt phòng và mã QR Check-in đã được hệ thống gửi tự động đến email <span className="font-semibold text-[#203044]">{guestEmail || 'của quý khách'}</span>.
            </p>

            {/* Booking Summary Card */}
            <div className="w-full bg-[#fbf8f2] rounded-xl p-5 border border-[#dedad0] text-left mb-6 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-3 border-b border-[#dedad0]">
                <div>
                  <span className="text-[11px] text-[#8a8782] uppercase font-semibold">Hạng phòng</span>
                  <div className="text-[15px] font-bold text-[#203044]">{room.TypeName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#8a8782] uppercase font-semibold">Chi nhánh</span>
                  <div className="text-[14px] font-bold text-[#203044]">{branch || 'Phú Quốc Oasis'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#dedad0]">
                <div>
                  <span className="text-[11px] text-[#8a8782] uppercase font-semibold">Thời gian</span>
                  <div className="text-[13px] font-semibold text-[#203044]">
                    {bookingIn.split('-').reverse().join('/')} → {bookingOut.split('-').reverse().join('/')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#8a8782] uppercase font-semibold">Số đêm</span>
                  <div className="text-[14px] font-bold text-[#b9a277]">{nights} đêm</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[13px] font-semibold text-[#203044]">Tổng tiền phòng dự kiến:</span>
                <span className="text-[18px] font-extrabold text-[#203044]">
                  {Number(totalAmount).toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="px-8 py-3 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white font-bold text-[14px] transition-all shadow-md"
              type="button"
            >
              Hoàn Tất &amp; Quay Lại Trang Chủ
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 flex flex-col gap-5">
            {/* Room Brief Card */}
            <div className="flex items-center gap-4 p-3.5 bg-[#fbf8f2] rounded-xl border border-[#dedad0]">
              <img 
                src={room.ImageUrl} 
                alt={room.TypeName} 
                className="w-20 h-16 rounded-lg object-cover shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-bold text-[#203044] truncate">{room.TypeName}</h4>
                <p className="text-[12px] text-[#8a8782] truncate">{room.BedType} • Tối đa {room.MaxOccupancy} khách</p>
                <div className="text-[14px] font-extrabold text-[#b9a277] mt-0.5">
                  {Number(room.BasePrice).toLocaleString('vi-VN')}₫ <span className="text-[11px] font-normal text-[#8a8782]">/đêm</span>
                </div>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                  Ngày nhận phòng (Check-in: dd/mm/yyyy)
                </label>
                <div className="relative group cursor-pointer">
                  <div className="w-full h-11 px-3.5 bg-[#fbf8f2] border border-[#dedad0] rounded-xl flex items-center justify-between text-[13px] font-semibold text-[#203044] group-hover:border-[#b9a277] transition-colors">
                    <span>{bookingIn ? bookingIn.split('-').reverse().join('/') : 'dd/mm/yyyy'}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#b9a277]">calendar_today</span>
                  </div>
                  <input
                    type="date"
                    min={todayStr}
                    value={bookingIn}
                    onChange={(e) => {
                      setBookingIn(e.target.value);
                      if (e.target.value >= bookingOut) {
                        setBookingOut(calcDefaultCheckOut(e.target.value));
                      }
                    }}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Chọn ngày nhận phòng (dd/mm/yyyy)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                  Ngày trả phòng (Check-out: dd/mm/yyyy)
                </label>
                <div className="relative group cursor-pointer">
                  <div className="w-full h-11 px-3.5 bg-[#fbf8f2] border border-[#dedad0] rounded-xl flex items-center justify-between text-[13px] font-semibold text-[#203044] group-hover:border-[#b9a277] transition-colors">
                    <span>{bookingOut ? bookingOut.split('-').reverse().join('/') : 'dd/mm/yyyy'}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#b9a277]">calendar_today</span>
                  </div>
                  <input
                    type="date"
                    min={bookingIn}
                    value={bookingOut}
                    onChange={(e) => setBookingOut(e.target.value)}
                    onClick={(e) => {
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Chọn ngày trả phòng (dd/mm/yyyy)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                  Họ và tên quý khách *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full h-11 px-3 bg-[#fbf8f2] border border-[#dedad0] rounded-xl text-[13px] text-[#203044] focus:outline-none focus:border-[#b9a277]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912 345 678"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full h-11 px-3 bg-[#fbf8f2] border border-[#dedad0] rounded-xl text-[13px] text-[#203044] focus:outline-none focus:border-[#b9a277]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                Địa chỉ email nhận mã booking *
              </label>
              <input
                type="email"
                placeholder="nguyenvanan@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full h-11 px-3 bg-[#fbf8f2] border border-[#dedad0] rounded-xl text-[13px] text-[#203044] focus:outline-none focus:border-[#b9a277]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-[#203044] block mb-1">
                Yêu cầu đặc biệt (tùy chọn)
              </label>
              <textarea
                rows="2"
                placeholder="Ví dụ: Phòng tầng cao, 1 giường đôi lớn, chuẩn bị hoa sinh nhật..."
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                className="w-full p-3 bg-[#fbf8f2] border border-[#dedad0] rounded-xl text-[13px] text-[#203044] focus:outline-none focus:border-[#b9a277]"
              ></textarea>
            </div>

            {/* Total calculation */}
            <div className="p-4 bg-[#fbf8f2] rounded-xl border border-[#dedad0] flex items-center justify-between">
              <div>
                <span className="text-[12px] text-[#8a8782] block">Tạm tính ({nights} đêm):</span>
                <span className="text-[20px] font-extrabold text-[#203044]">
                  {Number(totalAmount).toLocaleString('vi-VN')}₫
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Đã gồm bữa sáng &amp; VAT
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#dedad0] text-[#203044] text-[13px] font-bold hover:bg-[#eae8df] transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#b9a277] hover:bg-[#a68e64] text-white text-[13px] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <span>Xác Nhận Đặt Phòng</span>
                <span className="material-symbols-outlined text-[18px]">done</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default QuickBookingModal;
