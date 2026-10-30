import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { getMyBookingsApi, cancelMyBookingApi } from '../../api/roomApi';

// Format tiền tệ Việt Nam
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

// Format ngày tháng DD/MM/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function MyBookings() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // State bộ lọc và tìm kiếm (theo Đặc tả A9)
  const [activeTab, setActiveTab] = useState('UPCOMING'); // UPCOMING, COMPLETED, CANCELLED, VAT_FOLIO
  const [dateWindow, setDateWindow] = useState('ALL'); // ALL, ALL UPCOMING, PAST 6 MONTHS, PAST YEAR
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // State dữ liệu danh sách bookings
  const [bookings, setBookings] = useState([]);
  const [metaCounts, setMetaCounts] = useState({ upcoming: 0, completed: 0, cancelled: 0, all: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // State modal chi tiết và hủy phòng
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Thay đổi kế hoạch nghỉ dưỡng');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // State hóa đơn VAT Folio
  const [isVatModalOpen, setIsVatModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // State Modal mã QR Check-in điện tử
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalBooking, setQrModalBooking] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/my-bookings');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Tải danh sách bookings
  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const statusFilterParam = activeTab === 'VAT_FOLIO' ? 'ALL' : activeTab;
      const res = await getMyBookingsApi({
        statusFilter: statusFilterParam,
        dateWindow: dateWindow,
        searchKeyword: debouncedKeyword,
        page: 1,
        limit: 50
      });

      if (res.success) {
        setBookings(res.data || []);
        if (res.meta && res.meta.counts) {
          setMetaCounts(res.meta.counts);
        }
      } else {
        setErrorMsg(res.message || 'Không thể tải lịch sử đặt phòng');
      }
    } catch (err) {
      console.error('Error loadBookings:', err);
      setErrorMsg('Lỗi kết nối máy chủ khi lấy dữ liệu đặt phòng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
    }
  }, [isAuthenticated, activeTab, dateWindow, debouncedKeyword]);

  // Xử lý mở Modal Mã QR Check-in
  const handleOpenQrModal = async (booking, e) => {
    if (e) e.stopPropagation();
    setQrModalBooking(booking);
    setIsQrModalOpen(true);
    setLoadingQr(true);
    setQrCodeData(null);
    if (booking.bookingQrCode && booking.bookingQrCode.startsWith("data:image")) {
      setQrCodeData(booking.bookingQrCode);
      setLoadingQr(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/bookings/" + booking.bookingId + "/qr-code");
      const json = await res.json();
      if (json.success && json.data && json.data.qrCodeUrl) {
        setQrCodeData(json.data.qrCodeUrl);
        booking.bookingQrCode = json.data.qrCodeUrl;
      }
    } catch (err) {
      console.error("Lỗi tải mã QR:", err);
    } finally {
      setLoadingQr(false);
    }
  };

  // Xử lý Hủy đặt phòng
  const handleOpenCancelModal = (booking, e) => {
    if (e) e.stopPropagation();
    setCancellingBooking(booking);
    setCancelFeedback(null);
    setCancellationReason('Thay đổi kế hoạch nghỉ dưỡng cá nhân');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsSubmittingCancel(true);
    setCancelFeedback(null);

    try {
      const res = await cancelMyBookingApi(cancellingBooking.bookingId, {
        cancellationReason
      });

      if (res.success) {
        setCancelFeedback({
          type: 'success',
          code: res.code,
          message: res.message || 'Hủy đặt phòng thành công! Tiền cọc sẽ được hoàn lại theo quy định'
        });
        // Tải lại danh sách sau 1.5s
        setTimeout(() => {
          setIsCancelModalOpen(false);
          setCancellingBooking(null);
          loadBookings();
        }, 1800);
      } else {
        setCancelFeedback({
          type: 'error',
          code: res.code || res.errorCode,
          message: res.message || 'Có lỗi xảy ra khi hủy đặt phòng'
        });
      }
    } catch (err) {
      console.error('Lỗi khi hủy:', err);
      setCancelFeedback({
        type: 'error',
        message: 'Lỗi mạng khi kết nối máy chủ hủy đặt phòng'
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Kỳ nghỉ sắp tới gần nhất (Upcoming Feature Card)
  const upcomingFeaturedBooking = useMemo(() => {
    return bookings.find(
      (b) => ['Pending', 'Confirmed'].includes(b.status) && new Date(b.checkInDate) >= new Date()
    ) || bookings[0] || null;
  }, [bookings]);

  return (
    <div className="bg-[#f8f9ff] font-sans text-[#0b1c30] antialiased min-h-screen flex flex-col">
      <Header />

      <main className="w-full pt-28 pb-16 bg-[#f8f9ff] flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col w-full">
          {/* Top Banner / User Quick Glance */}
          <div className="relative overflow-hidden rounded-2xl bg-[#eff4ff] p-6 md:p-8 mb-8 shadow-xs border border-[#d3e4fe]/60">
            <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#fedeb2]/30 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-1.5 text-[#725b38] text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Cổng Trải Nghiệm Hội Viên Elite</span>
                </div>
                <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-[#0b1c30] font-bold tracking-tight">
                  Lịch Sử Đặt Phòng &amp; Hóa Đơn Kỳ Nghỉ
                </h1>
                <p className="text-sm md:text-base text-[#45464d]">
                  Quản lý các chuyến nghỉ dưỡng sắp tới, kỳ nghỉ đã qua và hóa đơn điện tử tại toàn bộ chuỗi hệ thống Grand Horizon.
                </p>
              </div>

              {/* Quick Stats Card */}
              <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md px-5 py-3 rounded-xl shadow-xs border border-white self-start md:self-auto">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase text-[#76777d]">Điểm Thưởng Tích Lũy</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl md:text-2xl text-[#0b1c30] font-bold font-serif">18.250</span>
                    <span className="text-xs text-[#725b38] font-bold">GH Points</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#fedeb2] flex items-center justify-center text-[#78603e] shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">stars</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="relative z-10 mt-6 flex flex-wrap items-center gap-1 border-b border-[#c6c6cd]/40">
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-lg transition-all ${
                  activeTab === 'UPCOMING'
                    ? 'text-[#725b38] border-b-2 border-[#725b38] bg-white/70 shadow-xs'
                    : 'text-[#45464d] hover:text-[#0b1c30] hover:bg-white/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeTab === 'UPCOMING' ? 'bg-[#725b38]' : 'bg-[#76777d]'}`}></span>
                <span>Sắp diễn ra ({metaCounts.upcoming})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-lg transition-all ${
                  activeTab === 'COMPLETED'
                    ? 'text-[#725b38] border-b-2 border-[#725b38] bg-white/70 shadow-xs'
                    : 'text-[#45464d] hover:text-[#0b1c30] hover:bg-white/40'
                }`}
              >
                <span>Đã hoàn thành ({metaCounts.completed})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CANCELLED')}
                className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-lg transition-all ${
                  activeTab === 'CANCELLED'
                    ? 'text-[#725b38] border-b-2 border-[#725b38] bg-white/70 shadow-xs'
                    : 'text-[#45464d] hover:text-[#0b1c30] hover:bg-white/40'
                }`}
              >
                <span>Đã hủy ({metaCounts.cancelled})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('VAT_FOLIO')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs md:text-sm font-semibold rounded-t-lg transition-all ml-auto ${
                  activeTab === 'VAT_FOLIO'
                    ? 'text-[#725b38] border-b-2 border-[#725b38] bg-white/70 shadow-xs'
                    : 'text-[#45464d] hover:text-[#0b1c30] hover:bg-white/40'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Hóa đơn VAT &amp; Folio điện tử</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Search Keyword */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[20px]">search</span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tra cứu mã đơn (#GH...), tên phòng..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#c6c6cd]/50 text-xs text-[#0b1c30] placeholder-[#76777d] focus:outline-none focus:ring-2 focus:ring-[#725b38]/30 shadow-xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-2.5 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#76777d] font-semibold whitespace-nowrap">Khoảng thời gian:</span>
              <select
                value={dateWindow}
                onChange={(e) => setDateWindow(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-[#c6c6cd]/50 text-xs font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#725b38]/30 shadow-xs"
              >
                <option value="ALL">Toàn bộ thời gian</option>
                <option value="ALL UPCOMING">Kỳ nghỉ sắp tới</option>
                <option value="PAST 6 MONTHS">6 tháng gần nhất</option>
                <option value="PAST YEAR">Trong năm nay</option>
              </select>
            </div>
          </div>

          {/* Loading & Error States */}
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#725b38]/20 border-t-[#725b38] rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-[#76777d]">Đang tải dữ liệu kỳ nghỉ của bạn...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 mb-6 rounded-xl bg-[#ffdad6]/60 border border-[#ffdad6] text-[#ba1a1a] text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && bookings.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#d3e4fe]/50 shadow-xs max-w-lg mx-auto my-8">
              <div className="w-16 h-16 rounded-full bg-[#fedeb2]/40 text-[#725b38] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">hotel</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-[#0b1c30] mb-2">Chưa có kỳ nghỉ nào trong danh mục này</h3>
              <p className="text-xs text-[#45464d] mb-6">
                Hãy lên kế hoạch cho kỳ nghỉ dưỡng biển thiên đường tiếp theo tại Grand Horizon Resort &amp; Suites.
              </p>
              <Link
                to="/rooms"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#725b38] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#584323] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                <span>Khám Phá Phòng &amp; Biệt Thự</span>
              </Link>
            </div>
          )}

          {/* Main Bookings Display */}
          {!isLoading && bookings.length > 0 && (
            <div className="space-y-8">
              {/* Feature High-Fidelity Card for Upcoming Booking */}
              {activeTab === 'UPCOMING' && upcomingFeaturedBooking && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#069669] animate-pulse"></span>
                      <h2 className="font-serif text-lg md:text-xl font-bold text-[#0b1c30]">Kỳ Nghỉ Sắp Tới Gần Nhất</h2>
                    </div>
                    {upcomingFeaturedBooking.hoursUntilCheckIn > 0 && (
                      <span className="text-xs text-[#76777d]">
                        Còn {Math.ceil(upcomingFeaturedBooking.hoursUntilCheckIn / 24)} ngày nữa tới giờ nhận phòng
                      </span>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 border border-[#d3e4fe]/60">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                      {/* Image Section */}
                      <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-full">
                        <img
                          src={
                            upcomingFeaturedBooking.roomType?.ImageUrl ||
                            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
                          }
                          alt={upcomingFeaturedBooking.roomType?.TypeName || 'Phòng nghỉ'}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
                        <div className="absolute top-4 left-4 flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#069669] text-[11px] font-bold uppercase tracking-wide shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-[#069669]"></span>
                            ĐÃ XÁC NHẬN • CHỜ NHẬN PHÒNG
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <div className="text-[11px] font-bold uppercase tracking-widest text-[#fedeb2]">
                            Mã Đặt Chỗ: {upcomingFeaturedBooking.confirmationCode}
                          </div>
                          <h3 className="font-serif text-xl md:text-2xl text-white font-bold drop-shadow-sm mt-0.5">
                            {upcomingFeaturedBooking.roomType?.TypeName || 'Oceanfront Luxury Villa'}
                          </h3>
                          <p className="text-xs text-[#cbdbf5] flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            <span>{upcomingFeaturedBooking.branch?.branchName || 'Grand Horizon Phú Quốc Sanctuary'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Content & Details Section */}
                      <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6">
                        {/* Key Stay Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#eff4ff]/60 p-4 rounded-xl border border-[#d3e4fe]/50">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#76777d] block mb-1">Thời Gian Nghỉ</span>
                            <span className="text-sm font-bold text-[#0b1c30] block">
                              {formatDate(upcomingFeaturedBooking.checkInDate)} — {formatDate(upcomingFeaturedBooking.checkOutDate)}
                            </span>
                            <span className="text-xs text-[#76777d]">{upcomingFeaturedBooking.numberOfNights} đêm nghỉ dưỡng</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#76777d] block mb-1">Quy Mô Khách</span>
                            <span className="text-sm font-bold text-[#0b1c30] block">
                              {upcomingFeaturedBooking.adults} Người Lớn
                            </span>
                            <span className="text-xs text-[#76777d]">
                              {upcomingFeaturedBooking.children > 0 ? `Kèm ${upcomingFeaturedBooking.children} Trẻ em` : 'Tiêu chuẩn'}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[11px] font-bold uppercase text-[#76777d] block mb-1">Dịch Vụ Bao Gồm</span>
                            <span className="text-sm font-bold text-[#725b38] block">Bao Trọn Gói</span>
                            <span className="text-xs text-[#76777d]">Buffet sáng &amp; Đưa đón sân bay</span>
                          </div>
                        </div>

                        {/* Payment Status Highlight */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#e5eeff] border border-[#d3e4fe]">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold uppercase text-[#76777d]">Tình trạng thanh toán</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-[#0b1c30]">
                                {formatVND(upcomingFeaturedBooking.totalAmount)}
                              </span>
                              <span className="text-xs text-[#76777d]">
                                (Đã cọc trước: {formatVND(upcomingFeaturedBooking.depositAmount)})
                              </span>
                            </div>
                            <div className="text-xs text-[#725b38] font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">info</span>
                              <span>
                                {upcomingFeaturedBooking.totalAmount > upcomingFeaturedBooking.depositAmount
                                  ? `Còn lại ${formatVND(
                                      upcomingFeaturedBooking.totalAmount - upcomingFeaturedBooking.depositAmount
                                    )} thanh toán khi nhận phòng`
                                  : 'Đã hoàn tất thanh toán'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg bg-white text-[#0b1c30] text-xs font-bold shadow-xs">
                              VietQR / Ký Quỹ Đảm Bảo
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons Grid */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-[#d3e4fe]/40 mt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(upcomingFeaturedBooking);
                                setIsDetailModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b1c30] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#213145] transition-all shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                              <span>Chi Tiết</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenQrModal(upcomingFeaturedBooking, e)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#725b38] to-[#91754a] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                              <span>Mã QR Check-in</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenCancelModal(upcomingFeaturedBooking, e)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#eff4ff] text-[#ba1a1a] text-xs font-bold hover:bg-[#ffdad6]/60 transition-colors border border-[#ffdad6]"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                              <span>Hủy Phòng</span>
                            </button>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                if (upcomingFeaturedBooking.invoices && upcomingFeaturedBooking.invoices.length > 0) {
                                  setSelectedInvoice(upcomingFeaturedBooking.invoices[0]);
                                  setIsVatModalOpen(true);
                                } else {
                                  setSelectedBooking(upcomingFeaturedBooking);
                                  setIsDetailModalOpen(true);
                                }
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#45464d] text-xs font-bold hover:bg-white hover:text-[#0b1c30] transition-colors border border-[#d3e4fe]/50 w-full sm:w-auto"
                            >
                              <span className="material-symbols-outlined text-[18px]">receipt</span>
                              <span>Hóa Đơn Tạm Tính</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* List of Other Bookings / Cards */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-[#0b1c30]">
                    {activeTab === 'UPCOMING'
                      ? 'Danh Sách Kỳ Nghỉ Đã Đặt'
                      : activeTab === 'COMPLETED'
                      ? 'Kỳ Nghỉ Đã Hoàn Thành Gần Đây'
                      : activeTab === 'CANCELLED'
                      ? 'Kỳ Nghỉ Đã Hủy'
                      : 'Hóa Đơn & Sổ Cái Tài Chính (Folio)'}
                  </h2>
                  <span className="text-xs text-[#76777d]">Tìm thấy {bookings.length} kết quả</span>
                </div>

                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const isUpcoming = ['Pending', 'Confirmed'].includes(booking.status);
                    const isCompleted = booking.status === 'Completed';
                    const isCancelled = booking.status === 'Cancelled';

                    return (
                      <div
                        key={booking.bookingId}
                        className="relative overflow-hidden rounded-2xl bg-white shadow-xs hover:shadow-md transition-all p-5 md:p-6 border border-[#d3e4fe]/60"
                      >
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden relative shrink-0 bg-[#eff4ff]">
                              <img
                                src={
                                  booking.roomType?.ImageUrl ||
                                  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
                                }
                                alt={booking.roomType?.TypeName || 'Phòng'}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 font-bold text-[10px] text-[#0b1c30] uppercase shadow-xs">
                                {booking.branch?.branchName ? booking.branch.branchName.split(' ')[2] || 'Resort' : 'Biển'}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase">
                                  {booking.confirmationCode}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    isUpcoming
                                      ? 'bg-[#fedeb2] text-[#78603e]'
                                      : isCompleted
                                      ? 'bg-[#dce9ff] text-[#0b1c30]'
                                      : 'bg-[#ffdad6] text-[#ba1a1a]'
                                  }`}
                                >
                                  {isUpcoming ? 'SẮP DIỄN RA' : isCompleted ? 'HOÀN THÀNH' : 'ĐÃ HỦY'}
                                </span>
                                {booking.assignedRoom && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#0b1c30] text-[10px] font-bold">
                                    Phòng {booking.assignedRoom.roomNumber} (Tầng {booking.assignedRoom.floor})
                                  </span>
                                )}
                              </div>

                              <h3 className="font-serif text-lg font-bold text-[#0b1c30]">
                                {booking.roomType?.TypeName || 'Phòng Nghỉ Cao Cấp'}
                              </h3>

                              <p className="text-xs text-[#45464d]">
                                {formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)} ({booking.numberOfNights} đêm) •{' '}
                                {booking.adults} Khách • Tổng tiền: {formatVND(booking.totalAmount)}
                              </p>

                              {isCancelled && (
                                <p className="text-xs text-[#ba1a1a] font-medium flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px]">info</span>
                                  <span>{booking.note || 'Đã hủy theo chính sách hủy phòng của khách sạn'}</span>
                                </p>
                              )}

                              {isCompleted && (
                                <div className="flex items-center gap-3 pt-1 text-xs">
                                  <span className="inline-flex items-center gap-1 text-[#069669] font-bold">
                                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                                    <span>Đã cộng +3.500 điểm thưởng</span>
                                  </span>
                                  <span className="text-[#c6c6cd]">•</span>
                                  <span className="inline-flex items-center gap-1 text-[#725b38] font-bold">
                                    <span className="material-symbols-outlined text-[16px]">star</span>
                                    <span>Hài lòng 5.0★</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-bold hover:bg-[#dce9ff] transition-colors border border-[#d3e4fe]/50"
                            >
                              Chi Tiết &amp; Sổ Cái
                            </button>

                            {isUpcoming && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenCancelModal(booking, e)}
                                className="px-4 py-2 rounded-xl bg-white text-[#ba1a1a] text-xs font-bold hover:bg-[#ffdad6]/40 transition-colors border border-[#ffdad6]"
                              >
                                Hủy Phòng
                              </button>
                            )}

                            {booking.invoices && booking.invoices.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoice(booking.invoices[0]);
                                  setIsVatModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-bold hover:bg-[#dce9ff] transition-colors border border-[#d3e4fe]/50"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span>Hóa Đơn VAT</span>
                              </button>
                            )}

                            {isCompleted && (
                              <Link
                                to={`/rooms/${booking.roomType?.RoomTypeId || ''}`}
                                className="px-4 py-2 rounded-xl bg-[#725b38] text-white text-xs font-bold hover:bg-[#584323] transition-colors shadow-xs"
                              >
                                Đặt Lại Phòng Này
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Concierge Support & Corporate VAT Folio Request (Bento Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Card 1: Hỗ trợ Xuất Hóa Đơn Đỏ Công Ty */}
                <div className="md:col-span-2 p-6 md:p-8 rounded-2xl bg-[#eff4ff] border border-[#d3e4fe]/60 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#725b38] text-xs font-bold uppercase">
                      <span className="material-symbols-outlined text-[20px]">domain_verification</span>
                      <span>Hóa Đơn Giá Trị Gia Tăng Doanh Nghiệp (VAT)</span>
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl text-[#0b1c30] font-bold">
                      Cần xuất hóa đơn tài chính cho chuyến công tác?
                    </h3>
                    <p className="text-xs md:text-sm text-[#45464d] max-w-xl">
                      Grand Horizon hỗ trợ xuất hóa đơn điện tử hợp lệ theo quy chuẩn Tổng Cục Thuế trong vòng 24 giờ sau khi
                      hoàn tất thanh toán. Quý khách có thể tự cập nhật mã số thuế và thông tin pháp nhân trực tiếp tại đây.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Chức năng cập nhật mã số thuế doanh nghiệp đang liên kết với hệ thống Tax e-Invoice.')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0b1c30] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#213145] transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_document</span>
                      <span>Kê Khai Thông Tin Thuế</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Chính sách VAT: Hóa đơn điện tử được gửi vào email sau khi hoàn tất Check-out trong vòng 24h.')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#0b1c30] text-xs font-bold hover:bg-[#dce9ff] transition-colors border border-[#d3e4fe]/50"
                    >
                      <span className="material-symbols-outlined text-[18px]">help_outline</span>
                      <span>Chính Sách Xuất Hóa Đơn</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: Trực Tuyến Concierge VIP */}
                <div className="p-6 md:p-8 rounded-2xl bg-white shadow-xs border border-[#d3e4fe]/60 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#fedeb2] flex items-center justify-center text-[#78603e] mb-2 shadow-xs">
                      <span className="material-symbols-outlined text-[28px]">support_agent</span>
                    </div>
                    <h4 className="font-serif text-lg font-bold text-[#0b1c30]">Đặc Quyền Concierge 24/7</h4>
                    <p className="text-xs text-[#45464d]">
                      Mọi yêu cầu điều chỉnh thời gian lưu trú, đặt trước bàn tối Michelin hoặc chuẩn bị hoa tươi sinh nhật đều
                      được quản gia tiếp nhận trực tiếp.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <a
                      href="tel:19006868"
                      className="flex items-center justify-between p-3 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] transition-colors text-[#0b1c30] text-xs font-bold border border-[#d3e4fe]/50"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#725b38] text-[18px]">call</span>
                        <span>Hotline Quản Gia VIP</span>
                      </span>
                      <span className="font-bold text-[#725b38]">1900 6868</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => alert('Đang kết nối Quản gia riêng qua Zalo VIP Concierge.')}
                      className="w-full text-center py-2 text-[#45464d] hover:text-[#725b38] text-[11px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Nhắn tin trực tiếp qua Zalo VIP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* ─── MODAL 1: CHI TIẾT ĐẶT PHÒNG & SỔ CÁI TÀI CHÍNH (FINANCIAL LOG) ─── */}
      {isDetailModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d3e4fe]">
            <div className="sticky top-0 bg-white border-b border-[#c6c6cd]/30 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#fedeb2] text-[#78603e] flex items-center justify-center font-bold text-xs">
                  GH
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0b1c30]">
                    Chi Tiết Kỳ Nghỉ: {selectedBooking.confirmationCode}
                  </h3>
                  <p className="text-[11px] text-[#76777d]">Khởi tạo lúc: {formatDate(selectedBooking.createdAt)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#45464d] hover:text-[#0b1c30] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Thẻ QR Check-in VIP */}
              {['Pending', 'Confirmed'].includes(selectedBooking.status) && (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-[#131b2e] to-[#1e2a47] text-white shadow-md border border-[#725b38]/50">
                  <div className="bg-white p-2 rounded-xl shadow-inner flex items-center justify-center shrink-0">
                    {selectedBooking.bookingQrCode ? (
                      <img src={selectedBooking.bookingQrCode} alt="QR Check-in" className="w-24 h-24 object-contain rounded-md" />
                    ) : (
                      <div className="w-24 h-24 flex flex-col items-center justify-center text-[10px] text-gray-500 text-center p-1">
                        <span className="material-symbols-outlined text-2xl text-[#725b38]">qr_code_2</span>
                        <span>Quét tại quầy lễ tân</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fedeb2]/20 text-[#fedeb2] text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fedeb2] animate-pulse"></span>
                      <span>Mã QR Check-in Không Chạm</span>
                    </div>
                    <h4 className="font-serif text-base font-bold text-white">Mã xác nhận: {selectedBooking.confirmationCode}</h4>
                    <p className="text-xs text-slate-300">Xuất trình mã này tại quầy Lễ Tân để nhận phòng ngay không cần thủ tục giấy tờ.</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleOpenQrModal(selectedBooking, e)}
                    className="px-3.5 py-2 rounded-xl bg-[#fedeb2] text-[#78603e] text-xs font-bold hover:brightness-105 transition-all shadow-xs shrink-0"
                  >
                    Phóng to QR
                  </button>
                </div>
              )}

              {/* Thông tin phòng & lưu trú */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#eff4ff]/60 border border-[#d3e4fe]/50">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#76777d]">Loại phòng &amp; Số lượng</span>
                  <p className="text-sm font-bold text-[#0b1c30] mt-0.5">
                    {selectedBooking.roomType?.TypeName} ({selectedBooking.roomQuantity} phòng)
                  </p>
                  <p className="text-xs text-[#45464d]">
                    Giường: {selectedBooking.roomType?.BedType || '1 King Bed'} • View: {selectedBooking.roomType?.ViewType || 'Ocean View'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#76777d]">Thời gian lưu trú</span>
                  <p className="text-sm font-bold text-[#0b1c30] mt-0.5">
                    {formatDate(selectedBooking.checkInDate)} (14:00) — {formatDate(selectedBooking.checkOutDate)} (12:00)
                  </p>
                  <p className="text-xs text-[#45464d]">{selectedBooking.numberOfNights} đêm nghỉ dưỡng</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#76777d]">Khách đại diện</span>
                  <p className="text-sm font-bold text-[#0b1c30] mt-0.5">
                    {selectedBooking.primaryGuest?.FullName || user?.fullName || 'Khách nghỉ dưỡng'}
                  </p>
                  <p className="text-xs text-[#45464d]">
                    {selectedBooking.primaryGuest?.Email || user?.email} • {selectedBooking.primaryGuest?.Phone || user?.phone}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#76777d]">Trạng thái &amp; Vị trí phòng</span>
                  <p className="text-sm font-bold text-[#725b38] mt-0.5">
                    Trạng thái: {selectedBooking.status}
                  </p>
                  <p className="text-xs text-[#45464d]">
                    {selectedBooking.assignedRoom
                      ? `Phòng số ${selectedBooking.assignedRoom.roomNumber} (Tầng ${selectedBooking.assignedRoom.floor})`
                      : 'Lễ tân sẽ xếp phòng cụ thể khi nhận phòng'}
                  </p>
                </div>
              </div>

              {/* Sổ cái tài chính (Financial Log Breakdown) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-[#725b38] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  <span>Sổ Cái Tài Chính (Financial Log)</span>
                </h4>

                <div className="border border-[#c6c6cd]/40 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#eff4ff] text-[#45464d] font-bold border-b border-[#c6c6cd]/40">
                      <tr>
                        <th className="p-3">Hạng mục chi phí</th>
                        <th className="p-3 text-right">Số lượng</th>
                        <th className="p-3 text-right">Đơn giá / Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c6c6cd]/20">
                      <tr>
                        <td className="p-3">
                          <span className="font-bold text-[#0b1c30]">Tiền phòng ({selectedBooking.numberOfNights} đêm)</span>
                          <p className="text-[10px] text-[#76777d]">Giá cơ bản áp dụng ngày thường &amp; cuối tuần</p>
                        </td>
                        <td className="p-3 text-right">{selectedBooking.numberOfNights}</td>
                        <td className="p-3 text-right font-semibold">{formatVND(selectedBooking.roomSubtotal)}</td>
                      </tr>
                      {selectedBooking.surchargeAmount > 0 && (
                        <tr>
                          <td className="p-3">Phụ thu người thêm / Tiện ích cao cấp</td>
                          <td className="p-3 text-right">1</td>
                          <td className="p-3 text-right font-semibold">+{formatVND(selectedBooking.surchargeAmount)}</td>
                        </tr>
                      )}
                      {selectedBooking.discountAmount > 0 && (
                        <tr>
                          <td className="p-3 text-[#069669]">Mã giảm giá Voucher ưu đãi</td>
                          <td className="p-3 text-right">1</td>
                          <td className="p-3 text-right font-semibold text-[#069669]">-{formatVND(selectedBooking.discountAmount)}</td>
                        </tr>
                      )}
                      <tr className="bg-[#eff4ff]/40 font-bold">
                        <td className="p-3 text-[#0b1c30]">TỔNG GIÁ TRỊ ĐƠN (TOTAL)</td>
                        <td className="p-3 text-right"></td>
                        <td className="p-3 text-right text-sm text-[#0b1c30]">{formatVND(selectedBooking.totalAmount)}</td>
                      </tr>
                      <tr className="bg-[#fedeb2]/20 font-bold text-[#78603e]">
                        <td className="p-3">Đã đặt cọc đảm bảo giữ phòng (Deposit)</td>
                        <td className="p-3 text-right"></td>
                        <td className="p-3 text-right">{formatVND(selectedBooking.depositAmount)}</td>
                      </tr>
                      {selectedBooking.totalPaid > 0 && (
                        <tr>
                          <td className="p-3 text-[#069669]">Tổng tiền đã ghi nhận thanh toán thành công</td>
                          <td className="p-3 text-right"></td>
                          <td className="p-3 text-right font-bold text-[#069669]">{formatVND(selectedBooking.totalPaid)}</td>
                        </tr>
                      )}
                      {selectedBooking.totalRefunded > 0 && (
                        <tr>
                          <td className="p-3 text-[#ba1a1a]">Tiền cọc đã hoàn lại theo quy định</td>
                          <td className="p-3 text-right"></td>
                          <td className="p-3 text-right font-bold text-[#ba1a1a]">-{formatVND(selectedBooking.totalRefunded)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lịch sử giao dịch thanh toán (Payments) */}
              {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-[#76777d]">Nhật ký giao dịch cổng thanh toán</h4>
                  <div className="space-y-1.5">
                    {selectedBooking.payments.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#eff4ff] text-xs">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#725b38]">payments</span>
                          <span className="font-semibold">{p.PaymentMethod} • Mã GD: {p.TransactionCode}</span>
                          <span className="text-[10px] text-[#76777d]">({formatDate(p.PaymentDate)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatVND(p.Amount)}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.Status === 'Completed' || p.Status === 'Success'
                                ? 'bg-green-100 text-green-700'
                                : p.Status === 'Refunded'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {p.Status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#c6c6cd]/30 flex justify-end gap-3 bg-white">
              {['Pending', 'Confirmed'].includes(selectedBooking.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenCancelModal(selectedBooking);
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-[#ba1a1a] text-xs font-bold hover:bg-[#ffdad6]/40 transition-colors border border-[#ffdad6]"
                >
                  Hủy Đặt Phòng
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#0b1c30] text-white text-xs font-bold hover:bg-[#213145] transition-colors shadow-xs"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: HỦY ĐẶT PHÒNG THEO QUY ĐỊNH (CANCELLATION POLICY) ─── */}
      {isCancelModalOpen && cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#ffdad6] overflow-hidden">
            <div className="p-5 bg-[#ffdad6]/30 border-b border-[#ffdad6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[24px]">warning</span>
                <h3 className="font-serif text-lg font-bold text-[#ba1a1a]">Xác Nhận Hủy Đặt Phòng</h3>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingCancel && setIsCancelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-[#45464d] hover:text-[#0b1c30] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <p className="font-bold text-sm text-[#0b1c30]">
                  Mã đơn: {cancellingBooking.confirmationCode} ({cancellingBooking.roomType?.TypeName})
                </p>
                <p className="text-[#45464d] mt-0.5">
                  Ngày nhận phòng: {formatDate(cancellingBooking.checkInDate)} (14:00)
                </p>
              </div>

              {/* Chính sách hoàn tiền theo mốc 72h */}
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#d3e4fe] space-y-2">
                <span className="font-bold text-[#725b38] block uppercase text-[11px]">
                  Chính sách hủy &amp; hoàn tiền cọc
                </span>
                <ul className="space-y-1 text-[#45464d] list-disc list-inside">
                  <li>
                    <strong>Trước 72 giờ:</strong> Hoàn lại <strong>100%</strong> tiền cọc đã thanh toán.
                  </li>
                  <li>
                    <strong>Trong vòng 72 giờ (cận giờ):</strong> Phạt <strong>100%</strong> tiền cọc theo quy định hủy cận giờ.
                  </li>
                </ul>

                <div className="mt-3 pt-2 border-t border-[#d3e4fe] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0b1c30]">Tiền cọc đã đóng:</span>
                  <span className="font-bold text-[#0b1c30]">{formatVND(cancellingBooking.depositAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0b1c30]">Dự kiến hoàn trả:</span>
                  <span className="font-bold text-[#069669]">
                    {cancellingBooking.isEligibleForFullRefund
                      ? `${formatVND(cancellingBooking.depositAmount)} (100% hoàn cọc)`
                      : '0 ₫ (Phạt 100% tiền cọc)'}
                  </span>
                </div>
              </div>

              {/* Lý do hủy */}
              <div className="space-y-1">
                <label className="font-bold text-[#0b1c30] block">Lý do hủy phòng:</label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#c6c6cd] bg-white text-xs focus:ring-2 focus:ring-[#ba1a1a]/20 focus:outline-none"
                >
                  <option value="Thay đổi kế hoạch nghỉ dưỡng cá nhân">Thay đổi kế hoạch nghỉ dưỡng cá nhân</option>
                  <option value="Đặt nhầm ngày lưu trú hoặc loại phòng">Đặt nhầm ngày lưu trú hoặc loại phòng</option>
                  <option value="Có việc gia đình đột xuất">Có việc gia đình đột xuất</option>
                  <option value="Lý do chuyến bay / phương tiện di chuyển">Lý do chuyến bay / phương tiện di chuyển</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>

              {/* Thông báo kết quả sau khi bấm */}
              {cancelFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    cancelFeedback.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {cancelFeedback.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <div>
                    <p>{cancelFeedback.message}</p>
                    {cancelFeedback.code && <p className="text-[10px] opacity-75">Mã phản hồi: {cancelFeedback.code}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-[#c6c6cd]/30 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-[#c6c6cd] text-[#45464d] text-xs font-bold hover:bg-gray-100 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#93000a] transition-all shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingCancel ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang Xử Lý...</span>
                  </>
                ) : (
                  <span>Xác Nhận Hủy Phòng</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: XEM HÓA ĐƠN VAT & FOLIO ĐIỆN TỬ ─── */}
      {isVatModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d3e4fe]">
            <div className="p-5 border-b border-[#c6c6cd]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#725b38] text-[24px]">receipt_long</span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0b1c30]">Hóa Đơn Giá Trị Gia Tăng Điện Tử</h3>
                  <p className="text-[11px] text-[#76777d]">Số hóa đơn: {selectedInvoice.InvoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVatModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#45464d] hover:text-[#0b1c30] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#d3e4fe] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Đơn vị phát hành:</span>
                  <span className="font-bold text-[#0b1c30]">CÔNG TY CỔ PHẦN NGHỈ DƯỠNG GRAND HORIZON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Mã số thuế:</span>
                  <span className="font-bold text-[#0b1c30]">0402188299</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Ngày lập hóa đơn:</span>
                  <span className="font-semibold text-[#0b1c30]">{formatDate(selectedInvoice.InvoiceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Trạng thái:</span>
                  <span className="font-bold text-[#069669] uppercase">{selectedInvoice.Status}</span>
                </div>
              </div>

              {/* Bảng chi tiết */}
              <div className="border border-[#c6c6cd]/40 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#eff4ff] text-[#45464d] font-bold">
                    <tr>
                      <th className="p-2.5">Nội dung</th>
                      <th className="p-2.5 text-right">SL</th>
                      <th className="p-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c6c6cd]/20">
                    {selectedInvoice.details && selectedInvoice.details.length > 0 ? (
                      selectedInvoice.details.map((d, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5">{d.Description || d.ItemType}</td>
                          <td className="p-2.5 text-right">{d.Quantity}</td>
                          <td className="p-2.5 text-right font-semibold">{formatVND(d.TotalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5">Tiền dịch vụ lưu trú và phòng nghỉ</td>
                        <td className="p-2.5 text-right">1</td>
                        <td className="p-2.5 text-right font-semibold">{formatVND(selectedInvoice.Subtotal)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50">
                      <td className="p-2.5 font-bold" colSpan={2}>Tiền trước thuế (Subtotal)</td>
                      <td className="p-2.5 text-right font-bold">{formatVND(selectedInvoice.Subtotal)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-2.5" colSpan={2}>Thuế suất GTGT (VAT {selectedInvoice.VATRate || 10}%)</td>
                      <td className="p-2.5 text-right">+{formatVND(selectedInvoice.VATAmount)}</td>
                    </tr>
                    <tr className="bg-[#fedeb2]/30 font-bold text-sm text-[#78603e]">
                      <td className="p-2.5" colSpan={2}>TỔNG CỘNG THANH TOÁN</td>
                      <td className="p-2.5 text-right">{formatVND(selectedInvoice.TotalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-[#c6c6cd]/30 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => alert('Đang tạo và tải bản in hóa đơn PDF...')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b1c30] text-white text-xs font-bold hover:bg-[#213145] transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Tải Bản In PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── MODAL 4: VÉ ĐIỆN TỬ & MÃ QR CHECK-IN (FEAT-GUEST-10) ─── */}
      {isQrModalOpen && qrModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#d3e4fe] animate-scale-up">
            {/* Header Thẻ VIP */}
            <div className="bg-[#131b2e] text-white p-6 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#725b38]/30 blur-2xl"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#fedeb2] text-[#78603e] flex items-center justify-center font-bold text-xs">
                    GH
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#fedeb2]">Grand Horizon Pass</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="mt-4 relative z-10">
                <h3 className="text-xl font-serif font-bold text-white">Mã Check-in Không Chạm</h3>
                <p className="text-xs text-slate-300 mt-0.5">Mã xác nhận: <strong className="text-[#fedeb2] font-mono tracking-wider">{qrModalBooking.confirmationCode}</strong></p>
              </div>
            </div>

            {/* Thân QR */}
            <div className="p-6 flex flex-col items-center text-center bg-white space-y-4">
              <div className="p-4 rounded-2xl bg-[#eff4ff] border-2 border-dashed border-[#725b38]/40 shadow-inner flex items-center justify-center min-h-[220px] min-w-[220px]">
                {loadingQr ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-[#76777d]">
                    <span className="material-symbols-outlined animate-spin text-3xl text-[#725b38]">progress_activity</span>
                    <span>Đang khởi tạo mã QR bảo mật...</span>
                  </div>
                ) : qrCodeData ? (
                  <img src={qrCodeData} alt="Mã QR Check-in" className="w-48 h-48 object-contain rounded-lg shadow-xs" />
                ) : (
                  <div className="text-xs text-red-500">Không thể tải mã QR</div>
                )}
              </div>

              <div className="w-full text-left space-y-2 text-xs p-3.5 rounded-xl bg-[#f8f9ff] border border-[#d3e4fe]/60">
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Hạng phòng:</span>
                  <span className="font-bold text-[#0b1c30]">{qrModalBooking.roomType?.TypeName || 'Biệt Thự Cao Cấp'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Nhận phòng:</span>
                  <span className="font-bold text-[#0b1c30]">{formatDate(qrModalBooking.checkInDate)} (14:00)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Trả phòng:</span>
                  <span className="font-bold text-[#0b1c30]">{formatDate(qrModalBooking.checkOutDate)} (12:00)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Trạng thái:</span>
                  <span className="font-bold text-[#069669]">{qrModalBooking.status}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#76777d] leading-relaxed">
                Quý khách vui lòng xuất trình mã QR này tại Quầy Lễ Tân hoặc Máy Check-in tự động (Kiosk) để nhận chìa khóa phòng nhanh trong vòng 30 giây.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-[#c6c6cd]/30 flex justify-end gap-2">
              <Link
                to={'/booking-confirmation?bookingId=' + qrModalBooking.bookingId}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#0b1c30] text-white text-xs font-bold hover:bg-[#213145] transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Xem Trang Xác Nhận Đầy Đủ</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
