import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { submitRoomReviewApi, getMyBookingsApi } from '../../api/roomApi';

// Danh mục mô tả điểm số sao tổng thể
const RATING_DESCRIPTIONS = {
  1: '1.0 / 5.0 • Cần cải thiện rất nhiều',
  1.5: '1.5 / 5.0 • Cần cải thiện nhiều khía cạnh',
  2: '2.0 / 5.0 • Tạm chấp nhận được',
  2.5: '2.5 / 5.0 • Trung bình khá',
  3: '3.0 / 5.0 • Hài lòng cơ bản',
  3.5: '3.5 / 5.0 • Khá tốt',
  4: '4.0 / 5.0 • Rất tốt & Đạt chuẩn 5 sao',
  4.5: '4.5 / 5.0 • Rất xuất sắc',
  5: '5.0 / 5.0 • Xuất sắc vượt kỳ vọng'
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ERROR_CODES = {
  REVIEW_TOO_SHORT: 'ERROR_0040_REVIEW_TOO_SHORT',
  ALREADY_REVIEWED: 'ERROR_0041_ALREADY_REVIEWED',
  FILE_TOO_LARGE: 'ERROR_0042_FILE_TOO_LARGE'
};
const ERROR_MESSAGES = {
  REVIEW_TOO_SHORT: 'Nội dung đánh giá phải có độ dài tối thiểu từ 50 ký tự trở lên',
  ALREADY_REVIEWED: 'Quý khách đã gửi đánh giá cho kỳ nghỉ này rồi',
  FILE_TOO_LARGE: 'Mỗi ảnh tải lên không được vượt quá dung lượng 15MB'
};

export default function RoomReview() {
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();

  const queryBookingId = searchParams.get('bookingId');
  const queryStayId = searchParams.get('stayId');

  // Thông tin đặt phòng thực tế
  const [bookingInfo, setBookingInfo] = useState(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  // Form states theo đặc tả FEAT-GUEST-11 (A11)
  const [overallRating, setOverallRating] = useState(5.0);
  const [hoverRating, setHoverRating] = useState(0);

  // 5 Tiêu chuẩn đánh giá (Thang 1-10)
  const [cleanlinessScore, setCleanlinessScore] = useState(10);
  const [staffServiceScore, setStaffServiceScore] = useState(10);
  const [roomComfortScore, setRoomComfortScore] = useState(10);
  const [diningScore, setDiningScore] = useState(10);
  const [valueForMoneyScore, setValueForMoneyScore] = useState(10);

  // Tiêu đề & Nội dung nhận xét
  const [reviewTitle, setReviewTitle] = useState('Kỳ nghỉ trăng mật trên cả tuyệt vời tại bờ biển Phú Quốc!');
  const [reviewBody, setReviewBody] = useState(
    'Vợ chồng tôi vừa có chuyến nghỉ dưỡng kỷ niệm ngày cưới 3 đêm tại Sunset Pool Villa. Cảnh hoàng hôn nhìn từ hồ bơi vô cực riêng thực sự tráng lệ không lời nào tả hết. Quản gia Minh Tuấn cực kỳ chu đáo, đã chuẩn bị sẵn hoa tươi và rượu vang khi chúng tôi bước vào villa. Bữa sáng nổi (Floating Breakfast) ngon và phục vụ rất đúng giờ. Chắc chắn chúng tôi sẽ quay lại cùng đại gia đình vào mùa hè năm sau!'
  );

  // Phân loại chuyến đi & Khuyến nghị
  const [wouldRecommend, setWouldRecommend] = useState('YES'); // YES, MAYBE, NO
  const [tripClassification, setTripClassification] = useState('COUPLE'); // BUSINESS, LEISURE, COUPLE, FAMILY, SOLO

  // Danh sách hình ảnh đính kèm (Tối đa 5 ảnh, mỗi ảnh <= 15MB)
  const [photos, setPhotos] = useState([
    {
      id: 'default-1',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-O1aPKk89x4btkm7N0qOtVkhJp9T7QodqXIGx8vtYeI0cn71wZAn_NLnC-0QCagjXpXCcaLn-Yd-IRVRkSDRV-eReWk8XDG3iJZdcc8hi5Z-lAPQWZKMEE5zq87jIHrmvbap_CjCFQQvaQrLVR51F29v0JA6hyVQ2Ixr5aZi-O2cSXVnjHCnGcYV7GJUA5GgvQz8V-ipKe-PbSKgjFkHolW25kSrmRFFXbmiTXVKN_8aanFPZsQml',
      name: 'Hồ bơi hoàng hôn',
      size: 1024 * 1024
    },
    {
      id: 'default-2',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9BdKE_k3HR9MkZht20xdoaQo2n5omgLFDgtH-_oBRTBH-SpzVuil_zoMXIKb4BFWwbaBRVThUsBc94byS6_r3Ezy2ZXgTAeO2zkQmiKaLg_3Pl1-_R3RQJmNRX9SzQ3J-RvdRNA9M2athXOc0KSGsgHpK5lKMeANLJiYDacsCudZU_A-5Y-7H6nXUOy4DCc7cGvF-B8G2cch5CqZ68i6OLFDldkexy6ALkinJkPFbsnv2_gT0t6o',
      name: 'Bữa sáng nổi',
      size: 1024 * 1024
    },
    {
      id: 'default-3',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBz9nqq5b7MJnAgH2rMTAOg8mnIfQDzM3ulKMtO9B8zlqiCOKgiHWmyxQzq0B96rVGW467CzRJJpbMUfD2yUdLCd8nKSRdRmW9RyzqlySuPmPTBg2b-yzwm_zfFtV5f61iEiFEtv9FCo_-7BQ8QOqxQNU0TB39EupCY7RGLg_t54JgtXIv6QehONzCA9zsTee4oA553l-tIyUm0ZPHeff0ZAAPGdH-hIPjNL51lRjMjvQXEoYEJhGV',
      name: 'Bồn tắm hướng biển',
      size: 1024 * 1024
    }
  ]);

  // Tùy chọn bảo mật & bổ sung
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublicPartner, setIsPublicPartner] = useState(true);
  const [sendEmailCopy, setSendEmailCopy] = useState(true);

  // Trạng thái xử lý gửi & thông báo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [toastMessage, setToastMessage] = useState(null); // { title: '', message: '', type: 'success' | 'info' | 'error' }

  // Tải thông tin booking nếu có bookingId
  useEffect(() => {
    async function fetchBookingDetails() {
      if (!queryBookingId) return;
      setIsLoadingBooking(true);
      try {
        const res = await getMyBookingsApi({ searchKeyword: queryBookingId, page: 1, limit: 1 });
        if (res.success && res.data && res.data.length > 0) {
          const matched = res.data.find(b => String(b.bookingId) === String(queryBookingId)) || res.data[0];
          setBookingInfo(matched);
        }
      } catch (err) {
        console.warn('Không thể tải chi tiết booking:', err);
      } finally {
        setIsLoadingBooking(false);
      }
    }
    fetchBookingDetails();
  }, [queryBookingId]);

  // Xử lý thêm tag gợi ý vào nội dung nhận xét
  const handleAddTag = (tag) => {
    if (!reviewBody.includes(tag)) {
      setReviewBody(prev => (prev ? `${prev} ${tag}` : tag));
    }
  };

  // Xử lý upload ảnh
  const handlePhotoUpload = (e) => {
    setErrorMessage('');
    setErrorCode('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      setErrorMessage('Quý khách chỉ có thể tải lên tối đa 5 hình ảnh.');
      return;
    }

    // Kiểm tra dung lượng từng ảnh <= 15MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorCode(ERROR_CODES.FILE_TOO_LARGE);
        setErrorMessage(ERROR_MESSAGES.FILE_TOO_LARGE);
        return;
      }
    }

    // Đọc ảnh dạng Base64 Data URL để preview và gửi
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              url: reader.result,
              name: file.name,
              size: file.size
            }
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Xóa ảnh đã chọn
  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Lưu bản nháp vào LocalStorage
  const handleSaveDraft = () => {
    try {
      const draftData = {
        overallRating,
        cleanlinessScore,
        staffServiceScore,
        roomComfortScore,
        diningScore,
        valueForMoneyScore,
        reviewTitle,
        reviewBody,
        wouldRecommend,
        tripClassification,
        isAnonymous,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`hotel_review_draft_${paramRoomId || 'default'}`, JSON.stringify(draftData));
      setToastMessage({
        title: 'Đã Lưu Bản Nháp',
        message: 'Nội dung phản hồi và các điểm số đã được lưu an toàn trên trình duyệt của quý khách.',
        type: 'info'
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (_) {
      setToastMessage({
        title: 'Thông Báo',
        message: 'Không thể lưu bản nháp.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Gửi đánh giá phòng
  const handleSubmitReview = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setErrorCode('');

    // Ràng buộc TC01: reviewBody >= 50 ký tự
    const trimmedBody = reviewBody ? reviewBody.trim() : '';
    if (trimmedBody.length < 50) {
      setErrorCode(ERROR_CODES.REVIEW_TOO_SHORT);
      setErrorMessage(ERROR_MESSAGES.REVIEW_TOO_SHORT);
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    // Ràng buộc ảnh: mỗi ảnh <= 15MB
    for (const p of photos) {
      if (p.size && p.size > MAX_FILE_SIZE) {
        setErrorCode(ERROR_CODES.FILE_TOO_LARGE);
        setErrorMessage(ERROR_MESSAGES.FILE_TOO_LARGE);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bookingId: queryBookingId ? parseInt(queryBookingId, 10) : bookingInfo?.bookingId || undefined,
        stayId: queryStayId ? parseInt(queryStayId, 10) : undefined,
        overallRating: Number(overallRating),
        wouldRecommend,
        cleanlinessScore: Number(cleanlinessScore),
        staffServiceScore: Number(staffServiceScore),
        roomComfortScore: Number(roomComfortScore),
        diningScore: Number(diningScore),
        valueForMoneyScore: Number(valueForMoneyScore),
        tripClassification,
        reviewTitle: reviewTitle ? reviewTitle.trim() : 'Kỳ nghỉ tuyệt vời',
        reviewBody: trimmedBody,
        photos: photos.map(p => ({
          url: p.url,
          name: p.name,
          size: p.size
        })),
        isAnonymous: Boolean(isAnonymous)
      };

      const targetRoomId = paramRoomId || bookingInfo?.roomType?.RoomTypeId || bookingInfo?.assignedRoom?.roomId || 1;
      const res = await submitRoomReviewApi(targetRoomId, payload, token);

      if (res.success) {
        setToastMessage({
          title: 'Cảm Ơn Quý Khách!',
          message: 'Đánh giá đã được ghi nhận. 500 Điểm Elite và voucher Spa đã gửi tới hộp thư của quý khách.',
          type: 'success'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          navigate('/my-bookings');
        }, 3500);
      } else {
        // Xử lý các mã lỗi đặc tả
        const errCode = res.code || res.errorCode;
        if (errCode === ERROR_CODES.REVIEW_TOO_SHORT) {
          setErrorCode(ERROR_CODES.REVIEW_TOO_SHORT);
          setErrorMessage(ERROR_MESSAGES.REVIEW_TOO_SHORT);
        } else if (errCode === ERROR_CODES.ALREADY_REVIEWED) {
          setErrorCode(ERROR_CODES.ALREADY_REVIEWED);
          setErrorMessage(ERROR_MESSAGES.ALREADY_REVIEWED);
        } else if (errCode === ERROR_CODES.FILE_TOO_LARGE) {
          setErrorCode(ERROR_CODES.FILE_TOO_LARGE);
          setErrorMessage(ERROR_MESSAGES.FILE_TOO_LARGE);
        } else {
          setErrorMessage(res.message || 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
        }
      }
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err);
      setErrorMessage('Lỗi hệ thống hoặc mất kết nối mạng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col font-sans text-[#0b1c30] antialiased">
      {/* Global Header */}
      <Header />

      <main className="w-full pt-24 md:pt-28 pb-20 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col w-full relative">
          {/* Decorative Ambient Blur Highlights */}
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#fedeb2]/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-96 -left-20 w-80 h-80 bg-[#d3e4fe]/40 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Navigation Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="pt-2 pb-4">
            <ol className="flex items-center gap-1.5 text-xs font-semibold text-[#45464d]">
              <li>
                <Link to="/" className="hover:text-[#725b38] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  <span>Trang Chủ</span>
                </Link>
              </li>
              <li><span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span></li>
              <li>
                <Link to="/my-bookings" className="hover:text-[#725b38] transition-colors">
                  Lịch Sử Đặt Phòng
                </Link>
              </li>
              <li><span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span></li>
              <li aria-current="page" className="font-bold text-[#725b38]">Đánh Giá Kỳ Nghỉ</li>
            </ol>
          </nav>

          {/* Header Title Section */}
          <section className="py-2 max-w-4xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fedeb2]/60 text-[#584323] mb-3 shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-[#725b38]" style={{ fontVariationSettings: "'FILL' 1" }}>
                workspace_premium
              </span>
              <span className="text-[11px] tracking-widest uppercase font-bold">Horizon Guest Voice Experience</span>
            </div>
            <h1 className="font-serif text-2xl md:text-4xl text-[#0b1c30] tracking-tight font-bold">
              Đánh Giá Trải Nghiệm Kỳ Nghỉ Của Quý Khách
            </h1>
            <p className="text-sm md:text-base text-[#45464d] mt-2 leading-relaxed">
              Ý kiến đóng góp quý báu của quý khách giúp Grand Horizon không ngừng hoàn thiện phong vị nghỉ dưỡng và gìn giữ chuẩn mực xa hoa 5 sao quốc tế.
            </p>
          </section>

          {/* Alert Message nếu có lỗi */}
          {errorMessage && (
            <div className="my-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-sm animate-fade-in">
              <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0 mt-0.5">error</span>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {errorCode ? `Lỗi (${errorCode})` : 'Thông báo phản hồi'}
                </div>
                <div className="text-xs md:text-sm mt-0.5 font-medium">{errorMessage}</div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          )}

          {/* Main Content Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
            {/* LEFT COLUMN: Reservation Summary & Elite Privileges (4 cols) */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              {/* Booking Card Snapshot */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
                <div className="relative overflow-hidden rounded-xl aspect-[16/10] mb-4">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    alt="Luxury oceanfront villa at sunset"
                    src={bookingInfo?.roomType?.ImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBobzzIA7s0RR0fWhv0fHO-30SG_vjIJDmpSe5_Hb4pKbt0-c_KofEVOpH0E7APHBj4X50UvKq0KOZXWHXC0GEGBoRmr4Nds_57wWlsGc50JcxWRbnJhbMKDttioj9gw_0xrcpezIKpgdHT4kW4FvDJS84ZjEWwqXc4-wZVQvhezd84mUnEEK91FxF2NbLskOTNNm1ggg4KCtAByjY55DqzlaisXHEbqnX3sUpMoyud-MhakvOklExw'}
                  />
                  <div className="absolute top-3 left-3 bg-[#131b2e]/85 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#85f8c4]" />
                    <span className="text-[11px] text-white tracking-wider uppercase font-bold">Đã Hoàn Tất Lưu Trú</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#725b38] uppercase tracking-widest font-bold">
                      {bookingInfo?.confirmationCode ? `Mã Đặt Chỗ: #${bookingInfo.confirmationCode}` : `Mã Đặt Chỗ: #GH-88924`}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#dce9ff] text-[#0b1c30] font-semibold">
                      Hạng Biệt Thự
                    </span>
                  </div>
                  <h2 className="font-serif text-lg md:text-xl text-[#0b1c30] font-bold mt-1">
                    {bookingInfo?.roomType?.TypeName || 'Oceanfront Sunset Pool Villa'}
                  </h2>
                  <p className="text-xs text-[#45464d] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#725b38]">location_on</span>
                    <span>Khu Biệt Thự Bán Đảo Tây Nam • Hướng Hoàng Hôn Biển</span>
                  </p>
                </div>

                <div className="bg-[#eff4ff] rounded-xl p-3.5 mt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#45464d] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#78603e]">calendar_today</span>
                      <span>Thời gian lưu trú</span>
                    </span>
                    <span className="text-xs font-bold text-[#0b1c30]">
                      {bookingInfo?.checkInDate && bookingInfo?.checkOutDate
                        ? `${bookingInfo.checkInDate} – ${bookingInfo.checkOutDate}`
                        : '15/11 – 18/11/2024'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#45464d] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#78603e]">bed</span>
                      <span>Thời lượng</span>
                    </span>
                    <span className="text-xs font-bold text-[#0b1c30]">
                      {bookingInfo?.numberOfNights ? `${bookingInfo.numberOfNights} Đêm` : '3 Đêm'} • {bookingInfo?.adults || 2} Khách lớn
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#45464d] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#78603e]">room_service</span>
                      <span>Quản gia phục vụ</span>
                    </span>
                    <span className="text-xs font-bold text-[#0b1c30]">Quản gia Minh Tuấn (Butler #4)</span>
                  </div>
                </div>
              </div>

              {/* Reward Banner Card */}
              <div className="bg-[#131b2e] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#725b38]/30 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#fedeb2] flex items-center justify-center text-[#281800] shrink-0">
                    <span className="material-symbols-outlined text-[24px]">stars</span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#fedeb2] block font-bold">
                      Đặc Quyền Thành Viên
                    </span>
                    <h3 className="font-serif text-lg text-white font-bold">Quà Tặng Tri Ân Đánh Giá</h3>
                  </div>
                </div>
                <p className="text-xs text-[#bec6e0] mb-4 leading-relaxed">
                  Sau khi hoàn tất gửi phiếu đánh giá chi tiết, tài khoản hội viên của quý khách sẽ nhận được:
                </p>
                <div className="space-y-3 text-xs md:text-sm">
                  <div className="flex items-start gap-2.5 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[#ffd985] text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      add_circle
                    </span>
                    <div>
                      <span className="font-bold text-[#ffd985]">+500 Điểm Thưởng Horizon Elite</span>
                      <p className="text-[11px] text-[#bec6e0] mt-0.5">Tích lũy nâng hạng thẻ Platinum &amp; nâng tầm trải nghiệm phòng.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[#ffd985] text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      spa
                    </span>
                    <div>
                      <span className="font-bold text-[#ffd985]">Voucher Spa Trị Liệu Trị Giá 200.000₫</span>
                      <p className="text-[11px] text-[#bec6e0] mt-0.5">Áp dụng tại Serenity Wellness Spa cho kỳ nghỉ kế tiếp.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#bec6e0]">
                  <span>Thời hạn gửi phiếu: Còn 11 ngày</span>
                  <span className="text-[#85f8c4] flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">verified</span> Hợp lệ
                  </span>
                </div>
              </div>

              {/* Privacy & Quality Commitment */}
              <div className="bg-[#eff4ff] rounded-2xl p-5 border border-blue-50">
                <div className="flex items-center gap-2 mb-2 text-[#0b1c30]">
                  <span className="material-symbols-outlined text-[#725b38] text-[20px]">shield_person</span>
                  <h4 className="text-sm font-bold">Cam Kết Bảo Mật Ý Kiến</h4>
                </div>
                <p className="text-xs text-[#45464d] leading-relaxed">
                  Ý kiến của quý khách được bảo mật tuyệt đối hoặc công bố công khai dưới định danh viết tắt tùy thuộc vào tùy chọn bảo mật cá nhân của quý khách.
                </p>
              </div>
            </aside>

            {/* RIGHT COLUMN: Detailed Interactive Review Form (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <form className="flex flex-col gap-6" id="review-form" onSubmit={handleSubmitReview}>
                {/* Section 1: Overall Impression Hero Card */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                  <div className="text-center max-w-xl mx-auto flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-[#725b38] font-bold mb-1.5">
                      Mức Độ Hài Lòng Chung
                    </span>
                    <h3 className="font-serif text-xl md:text-2xl text-[#0b1c30] font-bold text-center mb-2">
                      Kỳ nghỉ của quý khách tại Grand Horizon như thế nào?
                    </h3>
                    <p className="text-xs md:text-sm text-[#45464d] mb-4">
                      Hãy chấm điểm trải nghiệm tổng thể từ không gian, phong cảnh đến dịch vụ cá nhân hóa.
                    </p>

                    {/* Interactive 5-Star Component */}
                    <div className="flex items-center justify-center gap-2 md:gap-3 my-2">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isActive = (hoverRating || overallRating) >= starVal;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            aria-label={`${starVal} sao`}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setOverallRating(starVal)}
                            className="star-btn p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <span
                              className={`material-symbols-outlined text-[44px] md:text-[52px] transition-colors ${
                                isActive ? 'text-[#725b38]' : 'text-gray-300'
                              }`}
                              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              star
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Rating Label Pill */}
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fedeb2]/70 text-[#281800] text-sm md:text-base font-bold shadow-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#725b38]" />
                      <span id="rating-text">
                        {RATING_DESCRIPTIONS[overallRating] || `${overallRating.toFixed(1)} / 5.0 • Xuất sắc vượt kỳ vọng`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Detailed Criteria Ratings */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-gray-100">
                    <div>
                      <h3 className="font-serif text-lg md:text-xl text-[#0b1c30] font-bold">Đánh Giá Từng Khía Cạnh Dịch Vụ</h3>
                      <p className="text-xs text-[#45464d]">Phản hồi chi tiết giúp ban quản lý hoàn thiện từng trải nghiệm nhỏ nhất.</p>
                    </div>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-[#e5eeff] text-[#0b1c30] uppercase tracking-wider font-bold self-start sm:self-auto">
                      5 Tiêu Chuẩn 5 Sao
                    </span>
                  </div>

                  {/* Criteria Rows List */}
                  <div className="space-y-3 pt-2">
                    {/* Item 1: Cleanliness */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors gap-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#725b38] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0b1c30]">1. Sự sạch sẽ &amp; Tiện nghi buồng phòng</h4>
                          <p className="text-xs text-[#45464d]">Vệ sinh villa, nệm giường King, bồn tắm &amp; thiết bị điện tử</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={cleanlinessScore}
                          onChange={(e) => setCleanlinessScore(Number(e.target.value))}
                          className="w-24 accent-[#725b38] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#725b38] min-w-[42px] text-right">
                          {cleanlinessScore}/10
                        </span>
                      </div>
                    </div>

                    {/* Item 2: Dining */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors gap-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#725b38] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">restaurant</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0b1c30]">2. Chất lượng ẩm thực &amp; Bữa sáng 24h</h4>
                          <p className="text-xs text-[#45464d]">Bữa sáng buffet Horizon, floating breakfast và ẩm thực fine dining</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={diningScore}
                          onChange={(e) => setDiningScore(Number(e.target.value))}
                          className="w-24 accent-[#725b38] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#725b38] min-w-[42px] text-right">
                          {diningScore}/10
                        </span>
                      </div>
                    </div>

                    {/* Item 3: Staff & Hospitality */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors gap-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#725b38] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">concierge</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0b1c30]">3. Thái độ phục vụ của nhân viên &amp; Quản gia</h4>
                          <p className="text-xs text-[#45464d]">Độ chu đáo, tác phong ân cần, giải quyết yêu cầu riêng biệt</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={staffServiceScore}
                          onChange={(e) => setStaffServiceScore(Number(e.target.value))}
                          className="w-24 accent-[#725b38] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#725b38] min-w-[42px] text-right">
                          {staffServiceScore}/10
                        </span>
                      </div>
                    </div>

                    {/* Item 4: Room Comfort */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors gap-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#725b38] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">pool</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0b1c30]">4. Cảnh quan, Bãi biển &amp; Tiện nghi phòng</h4>
                          <p className="text-xs text-[#45464d]">Độ trong của nước hồ bơi, sự riêng tư và cách âm phòng ngủ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={roomComfortScore}
                          onChange={(e) => setRoomComfortScore(Number(e.target.value))}
                          className="w-24 accent-[#725b38] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#725b38] min-w-[42px] text-right">
                          {roomComfortScore}/10
                        </span>
                      </div>
                    </div>

                    {/* Item 5: Value for money */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors gap-3 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#725b38] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">payments</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0b1c30]">5. Sự tương xứng giữa giá trị nhận được &amp; chi phí</h4>
                          <p className="text-xs text-[#45464d]">Độ xứng đáng của kỳ nghỉ so với chi phí bỏ ra (Value for Money)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={valueForMoneyScore}
                          onChange={(e) => setValueForMoneyScore(Number(e.target.value))}
                          className="w-24 accent-[#725b38] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#725b38] min-w-[42px] text-right">
                          {valueForMoneyScore}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Written Review */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <h3 className="font-serif text-lg md:text-xl text-[#0b1c30] font-bold">Nhận Xét Chi Tiết Của Quý Khách</h3>
                    <p className="text-xs text-[#45464d]">Chia sẻ khoảnh khắc kỷ niệm, điểm ấn tượng hoặc điều cần cải thiện.</p>
                  </div>

                  {/* Review Title Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs md:text-sm font-bold text-[#0b1c30] flex items-center justify-between" htmlFor="review-title">
                      <span>Tiêu Đề Nhận Xét <span className="text-red-500">*</span></span>
                      <span className="text-xs text-[#725b38] font-normal">Tối đa 80 ký tự</span>
                    </label>
                    <input
                      id="review-title"
                      name="reviewTitle"
                      type="text"
                      maxLength={80}
                      required
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Tóm tắt cảm nhận về kỳ nghỉ..."
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#725b38] shadow-xs transition-all"
                    />
                  </div>

                  {/* Review Body Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs md:text-sm font-bold text-[#0b1c30]" htmlFor="review-content">
                        Nội Dung Nhận Xét Chi Tiết <span className="text-red-500">* (Tối thiểu 50 ký tự)</span>
                      </label>
                      <span
                        className={`text-xs font-semibold ${
                          reviewBody.trim().length < 50 ? 'text-red-500' : 'text-[#45464d]'
                        }`}
                        id="char-count"
                      >
                        {reviewBody.length} / 1.000 ký tự
                      </span>
                    </div>
                    <textarea
                      id="review-content"
                      name="reviewContent"
                      rows={5}
                      required
                      maxLength={1000}
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      placeholder="Hãy chia sẻ trải nghiệm về căn phòng, bữa ăn, sự phục vụ của quản gia, cảnh quan..."
                      className={`w-full p-4 rounded-xl border ${
                        reviewBody.trim().length > 0 && reviewBody.trim().length < 50
                          ? 'border-red-300 ring-1 ring-red-300'
                          : 'border-gray-200'
                      } bg-white text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#725b38] shadow-xs transition-all leading-relaxed`}
                    />
                  </div>

                  {/* Pre-filled Tag suggestions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-[#45464d] mr-1">Gợi ý trải nghiệm nổi bật:</span>
                    {['#HoàngHônTuyệtĐẹp', '#QuảnGiaTậnTâm', '#BữaSángFloating', '#HồBơiVôCựcRiêng', '#YênTĩnhThưThái'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="px-3 py-1 rounded-full bg-[#f8f9ff] hover:bg-[#fedeb2] text-[#0b1c30] hover:text-[#584323] text-xs font-semibold border border-gray-200 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 4: Photo & Video Upload Gallery */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg md:text-xl text-[#0b1c30] font-bold">Hình Ảnh Khoảnh Khắc Thực Tế</h3>
                      <p className="text-xs text-[#45464d]">Đính kèm ảnh chụp tại khu nghỉ dưỡng (Tối đa 5 ảnh JPG/PNG/WEBP, mỗi ảnh &lt;= 15MB).</p>
                    </div>
                    <span className="text-xs font-bold text-[#725b38] px-3 py-1 bg-[#fedeb2]/40 rounded-full">
                      {photos.length} / 5 Đã Tải Lên
                    </span>
                  </div>

                  {/* Upload Thumbnails Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    {photos.map((item) => (
                      <div key={item.id} className="relative group rounded-xl overflow-hidden aspect-square shadow-xs border border-gray-200">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Xóa ảnh"
                            onClick={() => handleRemovePhoto(item.id)}
                            className="w-8 h-8 rounded-full bg-white text-red-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-white font-semibold truncate max-w-[85%]">
                          {item.name}
                        </div>
                      </div>
                    ))}

                    {/* Upload Button */}
                    {photos.length < 5 && (
                      <label
                        htmlFor="photo-file"
                        className="cursor-pointer border-2 border-dashed border-[#725b38]/40 hover:border-[#725b38] rounded-xl aspect-square flex flex-col items-center justify-center p-3 text-center bg-[#f8f9ff] hover:bg-[#eff4ff] transition-all group"
                      >
                        <input
                          id="photo-file"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-[#fedeb2]/50 group-hover:bg-[#fedeb2] flex items-center justify-center text-[#725b38] transition-colors mb-1.5">
                          <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                        </div>
                        <span className="text-xs font-bold text-[#0b1c30] group-hover:text-[#725b38] transition-colors">
                          Thêm Ảnh
                        </span>
                        <span className="text-[10px] text-[#45464d] mt-0.5">Tối đa 15MB/ảnh</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Section 5: Recommendation & Privacy Preferences */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <h3 className="font-serif text-lg md:text-xl text-[#0b1c30] font-bold">Khuyến Nghị &amp; Phân Loại Chuyến Đi</h3>
                    <p className="text-xs text-[#45464d]">Một số câu hỏi bổ sung nhằm cá nhân hóa và quản lý hồ sơ trải nghiệm.</p>
                  </div>

                  {/* Recommendation Question */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-50">
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-[#0b1c30]">
                        Quý khách có muốn giới thiệu Grand Horizon đến bạn bè &amp; người thân?
                      </h4>
                      <p className="text-xs text-[#45464d]">Chỉ số đo lường mức độ hài lòng khách hàng (NPS)</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {[
                        { val: 'YES', label: 'Chắc chắn có (10/10)' },
                        { val: 'MAYBE', label: 'Có thể' },
                        { val: 'NO', label: 'Không' }
                      ].map(rec => (
                        <label
                          key={rec.val}
                          className={`inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            wouldRecommend === rec.val
                              ? 'bg-[#725b38] text-white shadow-xs'
                              : 'bg-white text-[#0b1c30] border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="recommendation"
                            value={rec.val}
                            checked={wouldRecommend === rec.val}
                            onChange={() => setWouldRecommend(rec.val)}
                            className="hidden"
                          />
                          <span>{rec.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trip Classification */}
                  <div className="p-4 rounded-xl bg-[#f8f9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100">
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-[#0b1c30]">Mục đích kỳ nghỉ của quý khách</h4>
                      <p className="text-xs text-[#45464d]">Giúp gợi ý phòng phù hợp cho khách hàng có cùng nhu cầu</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: 'COUPLE', label: 'Cặp đôi (Couple)' },
                        { id: 'FAMILY', label: 'Gia đình (Family)' },
                        { id: 'LEISURE', label: 'Nghỉ dưỡng (Leisure)' },
                        { id: 'BUSINESS', label: 'Công tác (Business)' },
                        { id: 'SOLO', label: 'Một mình (Solo)' }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTripClassification(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            tripClassification === item.id
                              ? 'bg-[#131b2e] text-white shadow-xs'
                              : 'bg-white text-[#0b1c30] border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checkbox Options */}
                  <div className="space-y-2.5 pt-2 text-xs md:text-sm text-[#45464d]">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublicPartner}
                        onChange={(e) => setIsPublicPartner(e.target.checked)}
                        className="rounded text-[#725b38] focus:ring-[#725b38] mt-1"
                      />
                      <span>Cho phép hiển thị đánh giá công khai trên trang Đặt phòng &amp; TripAdvisor Partner của Grand Horizon.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded text-[#725b38] focus:ring-[#725b38] mt-1"
                      />
                      <span>Đăng ẩn danh (Chỉ hiển thị: <em>"Hội viên {user?.membershipTier || 'Gold'} - Kỳ nghỉ tháng 11/2024"</em>).</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEmailCopy}
                        onChange={(e) => setSendEmailCopy(e.target.checked)}
                        className="rounded text-[#725b38] focus:ring-[#725b38] mt-1"
                      />
                      <span>
                        Gửi bản sao lưu nhận xét và mã voucher Spa 200.000₫ về email: <strong>{user?.email || 'an.nguyen***@horizon.vn'}</strong>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Section 6: Action Submit Toolbar */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20 backdrop-blur-lg bg-white/95">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#fedeb2]/40 flex items-center justify-center text-[#725b38] shrink-0">
                      <span className="material-symbols-outlined text-[24px]">redeem</span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs md:text-sm font-bold text-[#0b1c30] block">+500 Điểm • Voucher 200k</span>
                      <span className="text-[11px] text-[#45464d]">Sẵn sàng kích hoạt sau khi gửi thành công</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#45464d] hover:text-[#0b1c30] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Lưu Bản Nháp</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#725b38] text-white hover:bg-[#584323] transition-all shadow-[0_4px_16px_rgba(114,91,56,0.25)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          <span>Đang Gửi...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">send</span>
                          <span>Gửi Đánh Giá &amp; Nhận Thưởng</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed bottom-8 right-8 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md transition-all animate-bounce-in ${
                toastMessage.type === 'error'
                  ? 'bg-red-800 text-white'
                  : 'bg-[#131b2e] text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#fedeb2] text-[#281800] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
              </div>
              <div>
                <h5 className="text-sm font-bold">{toastMessage.title}</h5>
                <p className="text-xs text-gray-200 mt-0.5">{toastMessage.message}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
