import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { checkRoomAvailabilityApi, lockRoomSessionApi, releaseRoomLockApi, getRoomDetailApi } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';

// Helper format VND
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num || 0)) + '₫';
};

// Helper format date input YYYY-MM-DD
const formatDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Dữ liệu loại phòng
  const [roomType, setRoomType] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Tham số kiểm tra phòng trống real-time (FEAT-GUEST-04)
  const today = useMemo(() => new Date(), []);
  const defaultCheckIn = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDateInput(d);
  }, [today]);

  const defaultCheckOut = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 4);
    return formatDateInput(d);
  }, [today]);

  const [checkInDate, setCheckInDate] = useState(defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut);
  const [quantity, setQuantity] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);

  // Trạng thái kiểm tra phòng trống
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Phiên khóa phòng tạm thời 15 phút (Anti-Overbooking Lock)
  const [lockSession, setLockSession] = useState(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [isLocking, setIsLocking] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // 1. Tải thông tin phòng từ backend hoặc fallback
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      setLoadingRoom(true);
      const roomIdToFetch = id || 1;
      const data = await getRoomDetailApi(roomIdToFetch);
      if (isMounted) {
        if (data) {
          setRoomType(data);
        } else {
          // Mockup mặc định nếu chưa có ID trong DB
          setRoomType({
            RoomTypeId: 1,
            TypeName: 'Oceanfront Sunset Pool Villa',
            Description: 'Biệt Thự Biển Hoàng Hôn • Phân khu The Horizon Sanctuary',
            BasePrice: 8500000,
            AreaSqm: 180,
            BedType: '1 King Siêu Lớn',
            ViewType: 'Trực diện biển Hoàng hôn',
            AdultCapacity: 2,
            ChildCapacity: 2,
            TotalRooms: 5,
            ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
          });
        }
        setLoadingRoom(false);
      }
    }
    fetchDetail();
    return () => { isMounted = false; };
  }, [id]);

  // 2. Tự động kiểm tra phòng trống Real-time khi đổi ngày / số lượng
  useEffect(() => {
    let isMounted = true;
    const activeRoomTypeId = roomType?.RoomTypeId || id || 1;

    async function checkRealtime() {
      if (!activeRoomTypeId || !checkInDate || !checkOutDate) return;
      setIsChecking(true);
      setErrorMessage('');
      setErrorCode('');

      const res = await checkRoomAvailabilityApi({
        roomTypeId: activeRoomTypeId,
        checkInDate,
        checkOutDate,
        quantity,
        lockSessionId: lockSession?.lockSessionId
      });

      if (!isMounted) return;
      setIsChecking(false);

      if (res.success && res.data) {
        setAvailabilityData(res.data);
        if (res.code === 'ERROR_0022_ROOM_SOLD_OUT') {
          setErrorCode('ERROR_0022_ROOM_SOLD_OUT');
          setErrorMessage(res.message);
        } else if (res.code === 'ERROR_0023_INSUFFICIENT_ROOMS') {
          setErrorCode('ERROR_0023_INSUFFICIENT_ROOMS');
          setErrorMessage(res.message);
        }
      } else {
        setErrorCode(res.code || 'ERROR_UNKNOWN');
        setErrorMessage(res.message || 'Không thể kiểm tra tình trạng phòng');
        setAvailabilityData(null);
      }
    }

    const timer = setTimeout(checkRealtime, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [roomType?.RoomTypeId, id, checkInDate, checkOutDate, quantity, lockSession?.lockSessionId]);

  // 3. Đếm ngược 15 phút khi giữ phòng
  useEffect(() => {
    if (!lockSession || lockTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLockSession(null);
          alert('Phiên giữ phòng 15 phút đã hết hạn. Phòng đã tự động nhả về kho trống.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockSession, lockTimeRemaining]);

  // 4. Xử lý giữ phòng tạm thời (Tiến hành đặt phòng - Anti Overbooking Lock)
  const handleProceedBooking = async () => {
    const activeRoomTypeId = roomType?.RoomTypeId || id || 1;
    setIsLocking(true);
    setErrorMessage('');
    setErrorCode('');

    try {
      const res = await lockRoomSessionApi({
        roomTypeId: activeRoomTypeId,
        checkInDate,
        checkOutDate,
        quantity
      });

      setIsLocking(false);

      if (res.success && res.data) {
        setLockSession(res.data);
        setLockTimeRemaining(res.data.timeoutSeconds || 900);
      } else {
        setErrorCode(res.code || 'ERROR_0024_CONCURRENT_LOCK_FAILED');
        setErrorMessage(res.message || 'Rất tiếc, phòng vừa được khách hàng khác giữ chỗ. Vui lòng chọn khoảng ngày hoặc hạng phòng khác');
      }
    } catch (err) {
      setIsLocking(false);
      setErrorCode('ERROR_0024_CONCURRENT_LOCK_FAILED');
      setErrorMessage('Rất tiếc, phòng vừa được khách hàng khác giữ chỗ. Vui lòng chọn khoảng ngày hoặc hạng phòng khác');
    }
  };

  // 5. Hủy giữ phòng
  const handleCancelLock = async () => {
    if (lockSession?.lockSessionId) {
      await releaseRoomLockApi(lockSession.lockSessionId);
    }
    setLockSession(null);
    setLockTimeRemaining(0);
  };

  // Định dạng timer mm:ss
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Tính số đêm
  const numberOfNights = useMemo(() => {
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  const pricing = availabilityData?.pricingSummary || {
    basePricePerNight: roomType?.BasePrice || 8500000,
    numberOfNights,
    roomQuantity: quantity,
    roomSubtotal: (roomType?.BasePrice || 8500000) * numberOfNights * quantity,
    discountAmount: Math.round((roomType?.BasePrice || 8500000) * numberOfNights * quantity * 0.1),
    vatTaxAmount: Math.round(((roomType?.BasePrice || 8500000) * numberOfNights * quantity * 0.9) * 0.08),
    serviceFeeAmount: Math.round(((roomType?.BasePrice || 8500000) * numberOfNights * quantity * 0.9) * 0.05),
    totalAmount: Math.round(((roomType?.BasePrice || 8500000) * numberOfNights * quantity * 0.9) * 1.13),
  };

  const isSoldOut = availabilityData && !availabilityData.isAvailable && availabilityData.availableRoomsCount === 0;
  const isInsufficient = availabilityData && !availabilityData.isAvailable && availabilityData.availableRoomsCount > 0;
  const availableCount = availabilityData ? availabilityData.availableRoomsCount : (roomType?.TotalRooms || 2);

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] min-h-screen flex flex-col font-sans">
      <Header />

      <main className="w-full pt-20 flex-1">
        {/* BREADCRUMB & CONCIERGE BAR */}
        <section className="w-full px-6 lg:px-12 py-3 bg-[#eff4ff]">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
            <nav className="flex items-center gap-1.5 text-gray-600">
              <Link to="/" className="hover:text-[#725b38] transition-colors">Trang Chủ</Link>
              <span>/</span>
              <Link to="/rooms" className="hover:text-[#725b38] transition-colors">Khám Phá Phòng & Biệt Thự</Link>
              <span>/</span>
              <span className="text-[#0b1c30] font-semibold">{roomType?.TypeName || 'Biệt Thự Biển Hoàng Hôn'}</span>
            </nav>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#725b38] bg-[#fedeb2]/40 px-3 py-1 rounded-full font-medium">
                ⭐ Biệt Thự Độc Bản Bờ Biển
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShowShareToast(true);
                  setTimeout(() => setShowShareToast(false), 2500);
                }}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-[#725b38] transition-colors"
              >
                🔗 Chia sẻ
              </button>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`inline-flex items-center gap-1 transition-colors ${isSaved ? 'text-rose-500 font-semibold' : 'text-gray-600 hover:text-[#725b38]'}`}
              >
                {isSaved ? '❤️ Đã lưu' : '🤍 Lưu lại'}
              </button>
            </div>
          </div>
        </section>

        {showShareToast && (
          <div className="fixed top-24 right-8 z-50 bg-[#131b2e] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 animate-bounce">
            ✅ Đã sao chép liên kết vào bộ nhớ tạm!
          </div>
        )}

        {/* TITLE & KEY METRICS HEADER */}
        <section className="w-full px-6 lg:px-12 pt-6 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fedeb2]/40 text-[#725b38] text-xs font-semibold">
                    🏆 Lựa chọn hàng đầu của du khách 2024
                  </span>
                  <span className="text-sm font-semibold text-[#0b1c30]">
                    <span className="text-[#725b38] font-bold">4.96/5</span>{' '}
                    <span className="text-gray-500 font-normal">(184 lượt đánh giá được xác thực)</span>
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-serif font-bold text-[#0b1c30] tracking-tight">
                  {roomType?.TypeName || 'Oceanfront Sunset Pool Villa'}
                </h1>
                <p className="text-base text-[#725b38] italic font-serif">
                  {roomType?.Description || 'Biệt Thự Biển Hoàng Hôn • Phân khu The Horizon Sanctuary'}
                </p>
              </div>

              {/* Key Highlights Metrics */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white/95 backdrop-blur-sm p-3 px-4 sm:px-6 rounded-2xl shadow-sm border border-[#dedad0]/80">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center text-[#725b38] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px] text-[#725b38]">square_foot</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8a8782] font-bold">Diện tích</p>
                    <p className="text-sm font-bold text-[#0b1c30]">{roomType?.AreaSqm || 180} m²</p>
                  </div>
                </div>
                <span className="h-8 w-px bg-[#dedad0]/60 hidden sm:block"></span>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center text-[#725b38] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px] text-[#725b38]">king_bed</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8a8782] font-bold">Giường ngủ</p>
                    <p className="text-sm font-bold text-[#0b1c30]">{roomType?.BedType || '1 King Siêu Lớn'}</p>
                  </div>
                </div>
                <span className="h-8 w-px bg-[#dedad0]/60 hidden sm:block"></span>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center text-[#725b38] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px] text-[#725b38]">group</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8a8782] font-bold">Sức chứa</p>
                    <p className="text-sm font-bold text-[#0b1c30]">
                      {roomType?.AdultCapacity || 2} Lớn + {roomType?.ChildCapacity || 2} Trẻ
                    </p>
                  </div>
                </div>
                <span className="h-8 w-px bg-[#dedad0]/60 hidden sm:block"></span>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center text-[#725b38] shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px] text-[#725b38]">
                      {(roomType?.ViewType || '').toLowerCase().includes('hoàng hôn') || (roomType?.ViewType || '').toLowerCase().includes('sunset')
                        ? 'wb_twilight'
                        : (roomType?.ViewType || '').toLowerCase().includes('biển')
                        ? 'water'
                        : 'panorama'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#8a8782] font-bold">Tầm nhìn</p>
                    <p className="text-sm font-bold text-[#0b1c30]">{roomType?.ViewType || 'Trực diện biển Hoàng hôn'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LUXURY IMAGE GALLERY */}
        <section className="w-full px-6 lg:px-12 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-auto lg:h-[500px] rounded-3xl overflow-hidden relative shadow-md bg-gray-100">
              {/* Main Hero Photo (7 cols) */}
              <div className="lg:col-span-7 relative h-[340px] lg:h-full group overflow-hidden">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  src={roomType?.ImageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'}
                  alt={roomType?.TypeName}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <span className="text-xs uppercase tracking-widest text-[#fedeb2] bg-black/50 backdrop-blur-md px-2.5 py-1 rounded">
                    Không Gian Chính
                  </span>
                  <h3 className="text-xl lg:text-2xl font-serif font-bold mt-1">
                    Phòng Khách Biệt Lập & Hồ Bơi Vô Cực Trực Diện Biển
                  </h3>
                  <p className="text-xs text-gray-200 opacity-90">Bắt trọn khoảnh khắc ráng chiều hoàng hôn Cam Ranh</p>
                </div>
              </div>

              {/* 4 Mosaic Images (5 cols) */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3 h-[300px] lg:h-full">
                <div className="relative group overflow-hidden rounded-xl">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80"
                    alt="Phòng Ngủ Master"
                  />
                  <span className="absolute bottom-2 left-2 text-white text-[11px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                    Phòng Ngủ Master
                  </span>
                </div>
                <div className="relative group overflow-hidden rounded-xl">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
                    alt="Bồn Tắm Hướng Biển"
                  />
                  <span className="absolute bottom-2 left-2 text-white text-[11px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                    Bồn Tắm Hướng Biển
                  </span>
                </div>
                <div className="relative group overflow-hidden rounded-xl">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80"
                    alt="Hiên Tắm Nắng"
                  />
                  <span className="absolute bottom-2 left-2 text-white text-[11px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                    Hiên Tắm Nắng
                  </span>
                </div>
                <div className="relative group overflow-hidden rounded-xl">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
                    alt="Đặc Quyền Chào Đón"
                  />
                  <span className="absolute bottom-2 left-2 text-white text-[11px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                    Đặc Quyền Chào Đón
                  </span>
                </div>
              </div>

              {/* Floating Button */}
              <button className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-gray-900 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all hover:scale-105">
                <span className="material-symbols-outlined text-[18px] text-[#725b38]">photo_library</span>
                Xem tất cả 24 ảnh
              </button>
            </div>
          </div>
        </section>

        {/* ACTIVE LOCK ALERT BANNER (NẾU ĐANG GIỮ PHÒNG 15 PHÚT) */}
        {lockSession && (
          <section className="w-full px-6 lg:px-12 py-2">
            <div className="max-w-7xl mx-auto bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-amber-700 animate-spin">hourglass_top</span>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    ĐANG GIỮ CHỖ TẠM THỜI CHỐNG OVERBOOKING TRONG: <span className="font-mono text-base font-extrabold text-amber-700">{formatTimer(lockTimeRemaining)}</span>
                  </h4>
                  <p className="text-xs text-amber-800">
                    Mã giữ phòng: <span className="font-mono font-semibold">{lockSession.lockSessionId.slice(0, 8)}...</span> • Phòng được bảo toàn 100% cho bạn hoàn tất thanh toán.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelLock}
                  className="px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold border border-gray-200 transition-all"
                >
                  Hủy giữ chỗ
                </button>
                <button
                  onClick={() => alert(`Chuyển sang Cổng thanh toán với mã giữ phòng #${lockSession.lockSessionId}`)}
                  className="px-4 py-1.5 bg-[#725b38] hover:bg-[#584323] text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  Thanh Toán Ngay
                </button>
              </div>
            </div>
          </section>
        )}

        {/* MAIN DUAL-COLUMN CONTENT LAYOUT */}
        <section className="w-full px-6 lg:px-12 py-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (8 cols -> 65%) */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/* 1. Experience & Narrative */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-6 bg-[#725b38] rounded-full"></span>
                  <h2 className="text-xl lg:text-2xl font-serif font-bold text-[#0b1c30]">Không Gian & Cảm Hứng Nghỉ Dưỡng</h2>
                </div>
                <p className="text-gray-600 leading-relaxed text-base">
                  Nằm ẩn mình duyên dáng giữa khu vườn nhiệt đới rì rào và bờ cát trắng mịn màng,{' '}
                  <span className="font-semibold text-[#0b1c30]">{roomType?.TypeName || 'Oceanfront Sunset Pool Villa'}</span> mang đến đặc quyền riêng tư tối thượng cho những tâm hồn kiếm tìm sự bình yên nguyên bản. Biệt thự sở hữu ngôn ngữ thiết kế giao thoa tinh tế giữa phong vị Indochine trầm mặc và nét phóng khoáng của kiến trúc đương đại ven biển.
                </p>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Mỗi buổi hoàng hôn, không gian mở hoàn toàn với hệ thống kính tràn viền đưa toàn cảnh chân trời rực lửa vào phòng khách và hồ bơi tràn vô cực 35m². Lắng nghe tiếng sóng vỗ dịu êm từ hệ thống nệm chăn 800 sợi bông Ai Cập, thưởng thức ly rượu vang thượng hạng và tận hưởng những giây phút lắng đọng tuyệt đối cùng người thương.
                </p>

                {/* 4 Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 bg-[#fbf8f2] border border-[#dedad0]/80 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-[26px] text-[#725b38]">pool</span>
                    <p className="font-bold text-sm text-[#0b1c30] mt-1">Hồ Bơi 35m²</p>
                    <p className="text-xs text-gray-500">Nước ấm vô cực</p>
                  </div>
                  <div className="p-3 bg-[#fbf8f2] border border-[#dedad0]/80 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-[26px] text-[#725b38]">wb_twilight</span>
                    <p className="font-bold text-sm text-[#0b1c30] mt-1">View 100% Biển</p>
                    <p className="text-xs text-gray-500">Ngắm hoàng hôn</p>
                  </div>
                  <div className="p-3 bg-[#fbf8f2] border border-[#dedad0]/80 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-[26px] text-[#725b38]">concierge</span>
                    <p className="font-bold text-sm text-[#0b1c30] mt-1">Butler 24/7</p>
                    <p className="text-xs text-gray-500">Quản gia chuyên biệt</p>
                  </div>
                  <div className="p-3 bg-[#fbf8f2] border border-[#dedad0]/80 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-[26px] text-[#725b38]">speaker</span>
                    <p className="font-bold text-sm text-[#0b1c30] mt-1">Bang & Olufsen</p>
                    <p className="text-xs text-gray-500">Âm thanh chuẩn rạp</p>
                  </div>
                </div>
              </div>

              {/* 2. Detailed Amenities Grid */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-6 bg-[#725b38] rounded-full"></span>
                    <h2 className="text-xl lg:text-2xl font-serif font-bold text-[#0b1c30]">Tiện Nghi Đặc Quyền Đẳng Cấp</h2>
                  </div>
                  <span className="text-xs text-[#725b38] uppercase tracking-wider font-bold">Chuẩn 5 Sao Quốc Tế</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">pool</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Hồ Bơi Riêng Ngoài Trời 35m²</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Sở hữu thác tràn vô cực hướng biển, lọc nước muối khoáng tự nhiên, sàn lát đá ngọc thạch.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">bathtub</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Bồn Tắm Nằm Nguyên Khối Nhìn Ra Biển</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Bồn tắm đá cẩm thạch đặt cạnh vách kính trong suốt cùng bộ sữa tắm hữu cơ Acqua di Parma.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">coffee</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Máy Pha Cà Phê Nespresso Cao Cấp</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Kèm bộ sưu tập 6 viên nén Grands Crus tinh chọn, trà TWG hảo hạng bổ sung mỗi ngày.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">speaker</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Hệ Thống Âm Thanh Bang & Olufsen</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Loa Bluetooth Beosound A1 đa vùng tại phòng ngủ, phòng khách và khu vực hồ bơi ngoài trời.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">wine_bar</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Rượu Vang & Giỏ Hoa Quả Tươi Chào Đón</h4>
                        <p className="text-xs text-gray-500 mt-0.5">1 chai vang đỏ Grand Cru cao cấp tặng kèm khi nhận phòng, giỏ trái cây tươi mỗi sáng.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] border border-[#dedad0] flex items-center justify-center shrink-0 text-[#725b38]">
                        <span className="material-symbols-outlined text-[22px]">concierge</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0b1c30] text-sm">Dịch Vụ Ẩm Thực & Concierge 24/7</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Bữa sáng nổi trên hồ bơi (Floating Breakfast) miễn phí 1 lần và hỗ trợ hành lý riêng.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Architectural Floor Plan Diagram */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-6 bg-[#725b38] rounded-full"></span>
                    <h2 className="text-xl lg:text-2xl font-serif font-bold text-[#0b1c30]">Sơ Đồ Mặt Bằng Biệt Thự (180 m²)</h2>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">Tỉ lệ chuẩn 1:100</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Quy hoạch không gian phân tách tinh tế giữa khu vực sinh hoạt chung hướng biển và không gian nghỉ ngơi yên tĩnh tuyệt đối.
                </p>

                <div className="bg-[#eff4ff] p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                  <svg className="w-full max-w-2xl h-auto" fill="none" viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg">
                    <rect fill="#FFFFFF" height="340" rx="12" stroke="#C5A880" strokeDasharray="4 4" strokeWidth="1.5" width="740" x="10" y="10"></rect>
                    <rect fill="#E5EEFF" height="180" rx="8" width="290" x="440" y="30"></rect>
                    <text fill="#0B1C30" fontFamily="sans-serif" fontSize="13" fontWeight="600" textAnchor="middle" x="585" y="115">HỒ BƠI VÔ CỰC 35M²</text>
                    <text fill="#725B38" fontFamily="sans-serif" fontSize="11" textAnchor="middle" x="585" y="135">(Độ sâu: 1.2m - 1.5m)</text>
                    <rect fill="#FEDEB2" fillOpacity="0.35" height="110" rx="8" width="290" x="440" y="220"></rect>
                    <text fill="#78603E" fontFamily="sans-serif" fontSize="12" fontWeight="600" textAnchor="middle" x="585" y="280">HIÊN TẮM NẮNG & SÀN GỖ TEAK</text>
                    <rect fill="#F8FAFC" height="180" rx="8" stroke="#E2E8F0" strokeWidth="1" width="220" x="30" y="30"></rect>
                    <rect fill="#FEDEB2" fillOpacity="0.5" height="110" rx="6" width="130" x="75" y="65"></rect>
                    <text fill="#0B1C30" fontFamily="sans-serif" fontSize="12" fontWeight="600" textAnchor="middle" x="140" y="125">PHÒNG NGỦ KING</text>
                    <text fill="#725B38" fontFamily="sans-serif" fontSize="11" textAnchor="middle" x="140" y="145">Giường 2.2m x 2.0m</text>
                    <rect fill="#FFFFFF" height="180" rx="8" stroke="#E2E8F0" strokeWidth="1" width="170" x="260" y="30"></rect>
                    <circle cx="345" cy="115" fill="#E5EEFF" fillOpacity="0.5" r="35"></circle>
                    <text fill="#0B1C30" fontFamily="sans-serif" fontSize="12" fontWeight="600" textAnchor="middle" x="345" y="115">PHÒNG KHÁCH</text>
                    <text fill="#725B38" fontFamily="sans-serif" fontSize="11" textAnchor="middle" x="345" y="135">Sofa & Smart TV</text>
                    <rect fill="#F8FAFC" height="110" rx="8" stroke="#E2E8F0" strokeWidth="1" width="400" x="30" y="220"></rect>
                    <rect fill="#FFFFFF" height="70" rx="18" stroke="#725B38" strokeWidth="1.5" width="100" x="50" y="240"></rect>
                    <text fill="#725B38" fontFamily="sans-serif" fontSize="11" fontWeight="600" textAnchor="middle" x="100" y="280">BỒN TẮM ĐÁ</text>
                    <text fill="#0B1C30" fontFamily="sans-serif" fontSize="12" fontWeight="600" textAnchor="middle" x="280" y="275">PHÒNG TẮM KÍNH & THAY ĐỒ</text>
                    <text fill="#76777D" fontFamily="sans-serif" fontSize="11" textAnchor="middle" x="280" y="295">Vòi sen đôi & Tủ âm tường</text>
                  </svg>
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fedeb2] inline-block"></span> Giường ngủ King-size</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#e5eeff] inline-block"></span> Hồ bơi vô cực & Spa</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#e0c298] inline-block"></span> Ban công gỗ tắm nắng</span>
                  </div>
                </div>
              </div>

              {/* 4. Policies */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-6 bg-[#725b38] rounded-full"></span>
                  <h2 className="text-xl lg:text-2xl font-serif font-bold text-[#0b1c30]">Quy Định Lưu Trú & Chính Sách Hủy Phòng</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#eff4ff] p-4 rounded-2xl space-y-2">
                    <h4 className="font-bold text-[#725b38] text-sm flex items-center gap-1.5">
                      ⏰ Thời Gian Nhận / Trả Phòng
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                      <li>• <strong>Nhận phòng:</strong> Từ 14:00 (Hỗ trợ nhận sớm tùy tình trạng phòng).</li>
                      <li>• <strong>Trả phòng:</strong> Đến 12:00 trưa (Check-out muộn tới 14:00 cho hội viên Gold).</li>
                      <li>• Đưa đón sân bay bằng Limousine riêng miễn phí 2 chiều.</li>
                    </ul>
                  </div>
                  <div className="bg-[#eff4ff] p-4 rounded-2xl space-y-2">
                    <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                      🛡️ Hủy Phòng Linh Hoạt (An Tâm Đặt Chỗ)
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                      <li>• <strong className="text-emerald-700">Hủy miễn phí 100%</strong> trước 48 giờ tính từ ngày nhận phòng.</li>
                      <li>• Hủy trong vòng 48 giờ hoặc vắng mặt: Thu phí đêm đầu tiên.</li>
                      <li>• Đổi ngày lưu trú miễn phí 01 lần không giới hạn phụ phí.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 cols -> 35%): STICKY REAL-TIME AVAILABILITY & BOOKING WIDGET */}
            <div className="lg:col-span-4 sticky top-24 space-y-4">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-4 relative overflow-hidden">
                
                {/* Header Tag & Real-time Live Badge */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-[#131b2e] text-[#fedeb2] text-xs font-semibold tracking-wide">
                    ĐẶC QUYỀN HỘI VIÊN GOLD
                  </span>

                  {isChecking ? (
                    <span className="text-xs text-gray-500 animate-pulse flex items-center gap-1">
                      🔄 Đang quét lịch...
                    </span>
                  ) : isSoldOut ? (
                    <span className="text-xs text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full">
                      ⚠️ Hết phòng
                    </span>
                  ) : isInsufficient ? (
                    <span className="text-xs text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      ⚡ Chỉ còn {availableCount} phòng
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      ⚡ Còn lại {availableCount} biệt thự
                    </span>
                  )}
                </div>

                {/* Nightly Rate */}
                <div className="space-y-0.5">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Giá mỗi đêm tiêu chuẩn</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-serif font-bold text-[#0b1c30]">
                      {formatVND(roomType?.BasePrice || 8500000)}
                    </span>
                    <span className="text-xs text-gray-500">/ đêm</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Đã bao gồm 8% thuế VAT & 5% phí phục vụ cao cấp</p>
                </div>

                {/* Date & Quantity Picker Box */}
                <div className="bg-[#eff4ff] p-3 rounded-2xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold uppercase text-gray-400">NHẬN PHÒNG</label>
                      <input
                        type="date"
                        value={checkInDate}
                        min={formatDateInput(new Date())}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full text-xs font-semibold text-[#0b1c30] bg-transparent mt-0.5 focus:outline-none"
                      />
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold uppercase text-gray-400">TRẢ PHÒNG</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        min={checkInDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="w-full text-xs font-semibold text-[#0b1c30] bg-transparent mt-0.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quantity & Guests Picker */}
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400">SỐ LƯỢNG BIỆT THỰ</label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <select
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="text-xs font-bold text-[#0b1c30] bg-transparent focus:outline-none cursor-pointer"
                        >
                          <option value={1}>1 Biệt thự</option>
                          <option value={2}>2 Biệt thự</option>
                          <option value={3}>3 Biệt thự</option>
                          <option value={4}>4 Biệt thự</option>
                          <option value={5}>5 Biệt thự</option>
                        </select>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-600">{adults} Lớn, {children} Trẻ</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDailyModal(true)}
                      className="text-xs text-[#725b38] hover:underline font-semibold"
                      title="Xem tình trạng phòng từng ngày"
                    >
                      Lịch trống 📅
                    </button>
                  </div>
                </div>

                {/* Warning / Error Message Display */}
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>⚠️</span> {errorMessage}
                    </p>
                    {errorCode === 'ERROR_0024_CONCURRENT_LOCK_FAILED' && (
                      <p className="text-[11px] text-rose-600">
                        Vui lòng thử lại sau giây lát hoặc chọn phân khu khác.
                      </p>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{formatVND(pricing.basePricePerNight)} × {pricing.numberOfNights} đêm {quantity > 1 ? `× ${quantity} phòng` : ''}</span>
                    <span className="text-[#0b1c30] font-semibold">{formatVND(pricing.roomSubtotal)}</span>
                  </div>

                  {/* Gold Member Discount */}
                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-medium">
                    <span className="flex items-center gap-1">
                      🏷️ Ưu đãi Hội Viên Vàng (-10%)
                    </span>
                    <span className="font-bold">-{formatVND(pricing.discountAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-600">
                    <span>Bữa sáng buffet thượng hạng ({pricing.numberOfNights} ngày)</span>
                    <span className="text-emerald-700 font-semibold">Miễn Phí</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-600">
                    <span>Đưa đón Limousine sân bay 2 chiều</span>
                    <span className="text-emerald-700 font-semibold">Bao gồm</span>
                  </div>
                </div>

                {/* Total Payment Due */}
                <div className="pt-2 bg-[#dce9ff]/40 p-3.5 rounded-2xl flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-bold text-[#0b1c30]">Tổng Thanh Toán</span>
                    <p className="text-[10px] text-gray-500">Xác nhận ngay lập tức</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold text-[#725b38]">
                      {formatVND(pricing.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Primary Gold CTA Button */}
                <button
                  type="button"
                  disabled={isChecking || isSoldOut || isInsufficient || isLocking}
                  onClick={handleProceedBooking}
                  className={`w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ${
                    isSoldOut || isInsufficient
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#725b38] hover:bg-[#584323] text-white active:scale-98 shadow-[#725b38]/20'
                  }`}
                >
                  {isLocking ? (
                    <span>🔄 Đang khóa giữ phòng...</span>
                  ) : isSoldOut ? (
                    <span>Hết Phòng Trong Khoảng Ngày Này</span>
                  ) : isInsufficient ? (
                    <span>Không Đủ {quantity} Phòng Trống</span>
                  ) : lockSession ? (
                    <span>Đã Giữ Phòng ({formatTimer(lockTimeRemaining)}) - Thanh Toán →</span>
                  ) : (
                    <span>Tiến Hành Đặt Phòng →</span>
                  )}
                </button>

                {/* Reassurance Badges */}
                <div className="space-y-1.5 pt-1 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#725b38]">✓</span>
                    <span>Đảm bảo mức giá tốt nhất trực tiếp từ Resort</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#725b38]">🔒</span>
                    <span>Thanh toán bảo mật mã hóa SSL 256-bit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#725b38]">✕</span>
                    <span>Miễn phí hủy phòng trước 48h nhận phòng</span>
                  </div>
                </div>

                {/* Concierge Hotline */}
                <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                  <span>Cần tư vấn hỗ trợ riêng?</span>
                  <a href="tel:19006868" className="text-[#725b38] hover:underline font-bold flex items-center gap-1">
                    📞 Hotline 1900 6868
                  </a>
                </div>
              </div>

              {/* Club Points Card */}
              <div className="bg-[#fedeb2]/30 p-4 rounded-2xl flex items-center gap-3 text-[#78603e] text-xs">
                <span className="text-2xl">💳</span>
                <p>
                  Tích lũy <strong>2.295 điểm Horizon Club</strong> cho đơn đặt phòng này. Nâng hạng thành viên Platinum sau chuyến đi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* REVIEWS & GUEST IMPRESSION */}
        <section className="w-full px-6 lg:px-12 py-12 bg-[#eff4ff]">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs text-[#725b38] uppercase tracking-widest font-bold">Trải Nghiệm Thực Tế</span>
                <h2 className="text-2xl lg:text-3xl font-serif font-bold text-[#0b1c30]">Đánh Giá Từ Những Vị Khách Quý</h2>
                <p className="text-xs text-gray-500 mt-1">100% đánh giá từ khách hàng đã hoàn thành kỳ nghỉ tại Oceanfront Sunset Pool Villa.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl font-serif text-[#725b38] font-bold leading-none">4.96</p>
                  <p className="text-xs text-gray-400">trên thang điểm 5.0</p>
                </div>
                <div>
                  <div className="text-[#725b38] text-base">★★★★★</div>
                  <p className="text-xs text-[#0b1c30] font-bold">Xuất sắc vượt mong đợi</p>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between border border-gray-100">
                <div className="space-y-2">
                  <div className="text-[#725b38] text-xs">★★★★★</div>
                  <h4 className="font-bold text-[#0b1c30] text-sm">“Khoảnh khắc hoàng hôn đẹp nghẹt thở”</h4>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    Biệt thự đẹp hơn cả trên ảnh. Hồ bơi vô cực nhìn thẳng ra biển lúc 17:30 chiều là trải nghiệm đắt giá nhất. Quản gia chu đáo chuẩn bị floating breakfast rất tinh tế.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <div className="w-7 h-7 rounded-full bg-[#fedeb2]/60 flex items-center justify-center text-xs text-[#725b38] font-bold">TH</div>
                  <div>
                    <p className="text-xs font-bold text-[#0b1c30]">Trần Hoàng Long</p>
                    <p className="text-[10px] text-gray-400">Kỳ nghỉ gia đình • Tháng 10/2024</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between border border-gray-100">
                <div className="space-y-2">
                  <div className="text-[#725b38] text-xs">★★★★★</div>
                  <h4 className="font-bold text-[#0b1c30] text-sm">“Sự riêng tư tuyệt đối cho kỳ trăng mật”</h4>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    Âm thanh B&O êm ái, bồn tắm hướng biển tuyệt đẹp và chai vang chào đón rất ngon. Rất xứng đáng cho những dịp kỷ niệm quan trọng của đời người.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <div className="w-7 h-7 rounded-full bg-[#fedeb2]/60 flex items-center justify-center text-xs text-[#725b38] font-bold">ML</div>
                  <div>
                    <p className="text-xs font-bold text-[#0b1c30]">Mai Lan & Minh Đức</p>
                    <p className="text-[10px] text-gray-400">Kỳ trăng mật • Tháng 09/2024</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between border border-gray-100">
                <div className="space-y-2">
                  <div className="text-[#725b38] text-xs">★★★★★</div>
                  <h4 className="font-bold text-[#0b1c30] text-sm">“Dịch vụ 5 sao chuẩn mực quốc tế”</h4>
                  <p className="text-xs text-gray-600 italic leading-relaxed">
                    Tôi là hội viên Vàng và được ưu tiên check-out trễ đến 14:00 mà không tính thêm phí. Xe Limousine đưa đón sân bay rất êm và đúng giờ.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <div className="w-7 h-7 rounded-full bg-[#fedeb2]/60 flex items-center justify-center text-xs text-[#725b38] font-bold">DQ</div>
                  <div>
                    <p className="text-xs font-bold text-[#0b1c30]">Đỗ Quang Hưng</p>
                    <p className="text-[10px] text-gray-400">Hội viên Gold • Tháng 10/2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DAILY INVENTORY DETAILS MODAL */}
        {showDailyModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-serif font-bold text-lg text-[#0b1c30]">
                  Lịch Phòng Trống Từng Ngày (Daily Inventory)
                </h3>
                <button
                  onClick={() => setShowDailyModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Khoảng ngày lưu trú: <strong>{checkInDate}</strong> đến <strong>{checkOutDate}</strong> ({numberOfNights} đêm)
              </p>

              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {availabilityData?.dailyInventory?.map((day) => (
                  <div key={day.date} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#0b1c30]">{day.date}</p>
                      <p className="text-[11px] text-gray-400">
                        Tổng: {day.totalRooms} | Đã đặt: {day.bookedRooms} | Khóa giữ: {day.lockedRooms}
                      </p>
                    </div>
                    <div>
                      {day.availableRooms > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          Còn {day.availableRooms} phòng
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold">
                          Hết phòng
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowDailyModal(false)}
                  className="px-4 py-2 bg-[#725b38] text-white rounded-xl text-xs font-bold hover:bg-[#584323]"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
