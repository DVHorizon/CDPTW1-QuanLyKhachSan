import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import DepositInvoiceModal from '../../components/modals/DepositInvoiceModal';
import { getRoomDetailApi, createBookingApi, releaseRoomLockApi, calculatePricingApi, validateVoucherApi } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';

// Helper format VND currency
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num || 0)) + 'đ';
};

// Helper format generic currency (supports VND and USD)
const formatMoney = (num, currency = 'VND') => {
  if (currency === 'USD' || currency === '$') {
    return `$${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatVND(num);
};

// Helper format date YYYY-MM-DD
const formatDateStr = (d) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper format date DD/MM/YYYY cho người dùng Việt Nam
const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  const parts = String(dStr).split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
};

export default function BookingEngine() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // URL parameters or sensible defaults
  const paramRoomTypeId = searchParams.get('roomTypeId') || '1';
  const paramLockSessionId = searchParams.get('lockSessionId') || '';

  // Dates default to tomorrow + 3 nights
  const defaultCheckIn = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return searchParams.get('checkInDate') || formatDateStr(d);
  }, [searchParams]);

  const defaultCheckOut = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return searchParams.get('checkOutDate') || formatDateStr(d);
  }, [searchParams]);

  // Stay configuration state
  const [roomTypeId, setRoomTypeId] = useState(paramRoomTypeId);
  const [checkInDate, setCheckInDate] = useState(defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut);
  const [adultsCount, setAdultsCount] = useState(parseInt(searchParams.get('adults') || '2', 10));
  const [childrenCount, setChildrenCount] = useState(parseInt(searchParams.get('children') || '0', 10));
  const [unitsAllocated, setUnitsAllocated] = useState(parseInt(searchParams.get('units') || searchParams.get('quantity') || '1', 10));
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('18:00 - Early Evening Reception');
  const [bedPreference, setBedPreference] = useState('king');
  const [noSmoking, setNoSmoking] = useState(true);
  const [highFloorPanorama, setHighFloorPanorama] = useState(true);

  // Guest details form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);

  // Sync user details when authenticated user changes
  useEffect(() => {
    if (user) {
      if (user.FullName) {
        const parts = user.FullName.trim().split(' ');
        setFirstName(parts.length > 1 ? parts[parts.length - 1] : parts[0]);
        setLastName(parts.length > 1 ? parts.slice(0, -1).join(' ') : '');
      }
      if (user.Email) setEmail(user.Email);
      if (user.Phone) setPhoneNumber(user.Phone);
    }
  }, [user]);

  // Auth requirement modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Add-on experiences (FEAT-GUEST-06: 4 gói tiện ích cốt lõi khách sạn)
  const [addonBuffet, setAddonBuffet] = useState(false);
  const [addonLimo, setAddonLimo] = useState(false);
  const [addonEarlyCI, setAddonEarlyCI] = useState(false);
  const [addonLateCO, setAddonLateCO] = useState(false);

  // Mốc trả phòng trễ từng nấc 30 phút theo yêu cầu
  const LATE_CHECKOUT_OPTIONS = [
    { minutes: 30, time: '12:30', label: '+30p (12:30)', rate: 0.10, desc: '+10% giá đêm' },
    { minutes: 60, time: '13:00', label: '+1h (13:00)', rate: 0.20, desc: '+20% giá đêm' },
    { minutes: 90, time: '13:30', label: '+1.5h (13:30)', rate: 0.30, desc: '+30% giá đêm' },
    { minutes: 120, time: '14:00', label: '+2h (14:00)', rate: 0.40, desc: '+40% giá đêm' },
    { minutes: 360, time: '18:00', label: 'Chiều muộn (18:00)', rate: 0.50, desc: '+50% giá đêm' }
  ];
  const [lateCheckOutMinutes, setLateCheckOutMinutes] = useState(30);

  const selectedLateOption = useMemo(() => {
    return LATE_CHECKOUT_OPTIONS.find(opt => opt.minutes === lateCheckOutMinutes) || LATE_CHECKOUT_OPTIONS[0];
  }, [lateCheckOutMinutes]);

  // Room Type data from API
  const [roomType, setRoomType] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Submission & Validation feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Automated Real-Time Pricing Engine State (FEAT-GUEST-06)
  const [pricingData, setPricingData] = useState(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [pricingError, setPricingError] = useState('');

  // Voucher / Promotion State (FEAT-GUEST-07 / A7)
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherErrorCode, setVoucherErrorCode] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Handle Apply Voucher (FEAT-GUEST-07)
  const handleApplyVoucher = async (codeToApply) => {
    const targetCode = String(codeToApply || voucherInput || '').trim().toUpperCase();
    if (!targetCode) return;
    setIsApplyingVoucher(true);
    setVoucherError('');
    setVoucherErrorCode('');

    try {
      const currentSubtotal = pricingData?.roomSubtotal || roomSubtotal;
      const res = await validateVoucherApi({
        voucherCode: targetCode,
        bookingTotal: currentSubtotal,
        currency: pricingData?.currency || 'VND'
      });

      if (res && res.success && res.data) {
        setAppliedVoucher(res.data);
        setVoucherInput(res.data.voucherCode);
        setVoucherError('');
        setVoucherErrorCode('');
      } else {
        setAppliedVoucher(null);
        setVoucherErrorCode(res?.code || 'ERROR_FAILED');
        setVoucherError(res?.message || 'Mã giảm giá không tồn tại hoặc đã nhập sai');
      }
    } catch (err) {
      console.error('Lỗi khi áp dụng voucher:', err);
      setVoucherErrorCode('ERROR_NETWORK');
      setVoucherError('Không thể kết nối đến máy chủ kiểm tra mã giảm giá.');
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
    setVoucherErrorCode('');
  };

  // Fetch room type details
  useEffect(() => {
    let isMounted = true;
    async function loadRoom() {
      setLoadingRoom(true);
      try {
        const data = await getRoomDetailApi(roomTypeId);
        if (isMounted && data) {
          setRoomType(data);
        }
      } catch (err) {
        console.error('Error fetching room detail:', err);
      } finally {
        if (isMounted) setLoadingRoom(false);
      }
    }
    loadRoom();
    return () => { isMounted = false; };
  }, [roomTypeId]);

  // Calculate nights fallback
  const numberOfNights = useMemo(() => {
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  // Pricing calculations fallback
  const basePricePerNight = useMemo(() => {
    if (roomType?.BasePrice) return parseFloat(roomType.BasePrice);
    return 8500000; // fallback standard villa
  }, [roomType]);

  // Automated Realtime Pricing Engine API Call (FEAT-GUEST-06 / POST /bookings/calculate-pricing)
  useEffect(() => {
    let isMounted = true;
    async function calculateStayPrice() {
      if (!checkInDate || !checkOutDate) return;

      setIsCalculatingPricing(true);
      setPricingError('');

      const selectedAddonsList = [];
      if (addonBuffet) selectedAddonsList.push('ADDON_BUFFET');
      if (addonLimo) selectedAddonsList.push('ADDON_SHUTTLE');
      if (addonEarlyCI) selectedAddonsList.push('ADDON_EARLY_CI');
      if (addonLateCO) selectedAddonsList.push(`ADDON_LATE_CO_${lateCheckOutMinutes}`);

      const currentBaseRate = roomType?.BasePrice ? parseFloat(roomType.BasePrice) : 8500000;

      try {
        const res = await calculatePricingApi({
          checkInDate,
          checkOutDate,
          baseRate: currentBaseRate,
          roomTypeId: parseInt(roomTypeId, 10),
          adults: adultsCount,
          children: childrenCount,
          roomQuantity: unitsAllocated,
          selectedAddOns: selectedAddonsList,
          lateCheckOutMinutes: addonLateCO ? lateCheckOutMinutes : undefined,
          voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined,
          taxesAndFeesRate: 0.12,
          depositRate: 0.20,
          isGoldMember: user?.MembershipTier?.TierName === 'Gold' || user?.TierId === 3
        });

        if (isMounted) {
          if (res?.success && res?.data) {
            setPricingData(res.data);
            setPricingError('');
          } else {
            setPricingError(res?.message || 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Pricing calculation error:', err);
          setPricingError('Lỗi tính giá phòng');
        }
      } finally {
        if (isMounted) setIsCalculatingPricing(false);
      }
    }

    calculateStayPrice();
    return () => { isMounted = false; };
  }, [checkInDate, checkOutDate, roomType, roomTypeId, adultsCount, childrenCount, unitsAllocated, addonBuffet, addonLimo, addonEarlyCI, addonLateCO, lateCheckOutMinutes, appliedVoucher, user]);

  const roomSubtotal = useMemo(() => {
    if (pricingData?.roomSubtotal) return pricingData.roomSubtotal;
    return basePricePerNight * numberOfNights * unitsAllocated;
  }, [pricingData, basePricePerNight, numberOfNights, unitsAllocated]);

  const goldDiscount = useMemo(() => {
    if (pricingData?.discountAmount !== undefined) return pricingData.discountAmount;
    return Math.round(roomSubtotal * 0.1);
  }, [pricingData, roomSubtotal]);

  const addonsTotal = useMemo(() => {
    if (pricingData?.addOnsTotal !== undefined) return pricingData.addOnsTotal;
    let total = 0;
    if (addonBuffet) total += (basePricePerNight < 100000 ? 25 : 250000) * numberOfNights;
    if (addonLimo) total += (basePricePerNight < 100000 ? 35 : 800000);
    if (addonEarlyCI) total += Math.round(basePricePerNight * 0.30);
    if (addonLateCO) total += Math.round(basePricePerNight * (selectedLateOption?.rate || 0.10));
    return total;
  }, [pricingData, addonBuffet, addonLimo, addonEarlyCI, addonLateCO, selectedLateOption, basePricePerNight, numberOfNights]);

  const finalTotalAmount = useMemo(() => {
    if (pricingData?.totalAmount !== undefined) return pricingData.totalAmount;
    const preTax = Math.max(0, roomSubtotal - goldDiscount + addonsTotal);
    return Math.round(preTax * 1.12);
  }, [pricingData, roomSubtotal, goldDiscount, addonsTotal]);

  const depositRequired = useMemo(() => {
    if (pricingData?.depositAmount !== undefined) return pricingData.depositAmount;
    return Math.round(finalTotalAmount * 0.20); // 20% minimum deposit per specification
  }, [pricingData, finalTotalAmount]);

  // Handle Form Submission (Checkout Step 1 -> Booking Creation)
  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setErrorCode('');

    // Check Authentication: Yêu cầu đăng nhập trước khi tạo booking
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Client-side validations per specifications
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorCode('ERROR_0001_REQUIRED');
      setErrorMessage('Vui lòng nhập đầy đủ Họ và Tên khách lưu trú');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorCode('ERROR_0001_REQUIRED');
      setErrorMessage('Vui lòng nhập địa chỉ email nhận thư xác nhận');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorCode('ERROR_0004_INVALID_FORMAT');
      setErrorMessage('Email nhận xác nhận đặt phòng không đúng định dạng');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[\s.\-()]/g, '');
    if (!cleanPhone) {
      setErrorCode('ERROR_0001_REQUIRED');
      setErrorMessage('Vui lòng nhập số điện thoại liên lạc');
      return;
    }

    const phoneRegex = /^(\+?[1-9]\d{7,14}|0[1-9]\d{8})$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorCode('ERROR_0004_INVALID_FORMAT');
      setErrorMessage('Số điện thoại liên lạc không đúng định dạng chuẩn (VD: +84912345678 hoặc 0912345678)');
      return;
    }

    if (!isPolicyAccepted) {
      setErrorCode('ERROR_0025_POLICY_NOT_ACCEPTED');
      setErrorMessage('Quý khách vui lòng xác nhận đồng ý với Điều khoản và Quy định lưu trú');
      return;
    }

    const selectedAddonsList = [];
    if (addonBuffet) selectedAddonsList.push('ADDON_BUFFET');
    if (addonLimo) selectedAddonsList.push('ADDON_SHUTTLE');
    if (addonEarlyCI) selectedAddonsList.push('ADDON_EARLY_CI');
    if (addonLateCO) selectedAddonsList.push(`ADDON_LATE_CO_${lateCheckOutMinutes}`);

    setIsSubmitting(true);

    try {
      const payload = {
        roomTypeId: parseInt(roomTypeId, 10),
        checkInDate,
        checkOutDate,
        adultsCount,
        childrenCount,
        unitsAllocated,
        estimatedArrivalTime,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail,
        phoneNumber: cleanPhone,
        specialRequests,
        isPolicyAccepted: true,
        bedPreference,
        selectedAddons: selectedAddonsList,
        lateCheckOutMinutes: addonLateCO ? lateCheckOutMinutes : undefined,
        voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined,
        isGoldMember: user?.MembershipTier?.TierName === 'Gold' || user?.TierId === 3,
        totalAmount: pricingData?.totalAmount || finalTotalAmount,
        depositAmount: pricingData?.depositAmount || depositRequired,
        lockSessionId: paramLockSessionId || undefined
      };

      const res = await createBookingApi(payload);

      if (res && res.success) {
        setSuccessBooking(res.data);
      } else {
        setErrorCode(res?.code || 'ERROR_FAILED');
        setErrorMessage(res?.message || 'Không thể khởi tạo đặt phòng. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
      setErrorCode('ERROR_NETWORK');
      setErrorMessage('Đã xảy ra sự cố kết nối tới máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roomDisplayName = roomType?.TypeName || 'Biệt Thự Hồ Bơi Vách Biển (Oceanfront Sunset Villa)';
  const roomHeroImage = roomType?.ThumbnailImage || roomType?.Images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDof46r7r45tAx2kg1VzRPgRAL7aQ0h5p8P-DOJKB1zr0g07NoOsu35PP5YEWRjW-KLo_PqHa1_03WO1F7LxlnBNM9uPBDm0WI_2CmLTHigDNwUOdpTWpT4n4hEDlbPLHkkkIA6yewJdHHeFwKwmZ89X_iwABvja4y0T9wXl41qOhq4W3Ff2bpbeUzhoVsRrw2Uz-VloKrsN42sFa6iOWdC72nIZLnwyZVJp2WbEFpcTdaKzLxzfxDA';

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col font-sans text-[#0b1c30]">
      {/* Thanh Header chính */}
      <Header />

      <main className="w-full pt-24 bg-[#f8f9ff] flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Thanh tiêu đề phòng & Quy trình đặt phòng thu nhỏ ở góc phải (Style Traveloka) */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 mb-6 bg-white px-5 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Thông tin phòng đặt */}
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {roomDisplayName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="flex text-amber-500 text-[13px]">⭐⭐⭐⭐⭐</span>
              <span className="font-bold text-[#0064d2] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">9.4/10</span>
              <span className="text-slate-400 text-[11px]">(355 đánh giá thực tế)</span>
            </div>
          </div>

          {/* Quy trình đặt phòng thu nhỏ ở góc phải chuẩn hình Traveloka: 1 Xem lại ── 2 Thanh toán */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-1.5 text-[#0064d2] font-bold">
              <span className="w-6 h-6 rounded-full bg-[#0064d2] text-white flex items-center justify-center text-xs font-bold shadow-xs">1</span>
              <span>Xem lại</span>
            </div>
            <span className="text-slate-400 w-4 border-t border-slate-400"></span>
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <span className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Thanh toán</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 animate-shake">
            <span className="material-symbols-outlined text-red-600 shrink-0 mt-0.5">error</span>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {errorCode ? `Mã lỗi: ${errorCode}` : 'Thông báo lỗi'}
              </div>
              <p className="text-sm mt-0.5">{errorMessage}</p>
            </div>
            <button 
              onClick={() => { setErrorMessage(''); setErrorCode(''); }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Booking Form & Customization (7-8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            
            {/* Section 0: Stay Schedule (Check-in/Out & Guests) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                <span className="w-2 h-6 bg-[#725b38] rounded-full inline-block"></span>
                <h2 className="font-serif text-xl font-bold text-slate-900">Lịch Trình Lưu Trú &amp; Quy Mô</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày nhận phòng *</label>
                  <div className="relative group cursor-pointer">
                    <div className="w-full px-3 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm flex items-center justify-between border border-blue-100 group-hover:border-[#725b38] transition-all">
                      <span className="font-medium font-mono text-[14px]">
                        {formatDisplayDate(checkInDate) || 'dd/mm/yyyy'}
                      </span>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-[#725b38] text-[20px]">
                        calendar_today
                      </span>
                    </div>
                    <input 
                      type="date" 
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      min={formatDateStr(new Date())}
                      onClick={(e) => {
                        try { e.target.showPicker(); } catch (_) {}
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Nhận phòng từ 14:00</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày trả phòng *</label>
                  <div className="relative group cursor-pointer">
                    <div className="w-full px-3 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm flex items-center justify-between border border-blue-100 group-hover:border-[#725b38] transition-all">
                      <span className="font-medium font-mono text-[14px]">
                        {formatDisplayDate(checkOutDate) || 'dd/mm/yyyy'}
                      </span>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-[#725b38] text-[20px]">
                        calendar_today
                      </span>
                    </div>
                    <input 
                      type="date" 
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      min={checkInDate}
                      onClick={(e) => {
                        try { e.target.showPicker(); } catch (_) {}
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Trả phòng trước 12:00</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Người lớn (&gt;= 1) *</label>
                  <div className="flex items-center rounded-lg bg-[#eff4ff] overflow-hidden border border-blue-100">
                    <button 
                      type="button"
                      onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >-</button>
                    <span className="flex-1 text-center font-bold text-sm">{adultsCount}</span>
                    <button 
                      type="button"
                      onClick={() => setAdultsCount(adultsCount + 1)}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >+</button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Tiêu chuẩn: {roomType?.AdultCapacity || 2} khách</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trẻ em (0 - 11t)</label>
                  <div className="flex items-center rounded-lg bg-[#eff4ff] overflow-hidden border border-blue-100">
                    <button 
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >-</button>
                    <span className="flex-1 text-center font-bold text-sm">{childrenCount}</span>
                    <button 
                      type="button"
                      onClick={() => setChildrenCount(childrenCount + 1)}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >+</button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Tiêu chuẩn: {roomType?.ChildCapacity || 1} trẻ</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Số phòng đặt (1 - 5) *</label>
                  <div className="flex items-center rounded-lg bg-[#eff4ff] overflow-hidden border border-blue-100">
                    <button 
                      type="button"
                      onClick={() => setUnitsAllocated(Math.max(1, unitsAllocated - 1))}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >-</button>
                    <span className="flex-1 text-center font-bold text-sm">{unitsAllocated} phòng</span>
                    <button 
                      type="button"
                      onClick={() => setUnitsAllocated(Math.min(5, unitsAllocated + 1))}
                      className="px-3 py-2 text-slate-700 hover:bg-slate-200"
                    >+</button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Tối đa 5 phòng</span>
                </div>
              </div>
              {pricingData && (pricingData.extraAdults > 0 || pricingData.extraChildren > 0) && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800 text-xs">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">info</span>
                  <span>
                    Số lượng khách vượt tiêu chuẩn phòng ({pricingData.extraAdults > 0 ? `+${pricingData.extraAdults} người lớn` : ''}{pricingData.extraAdults > 0 && pricingData.extraChildren > 0 ? ', ' : ''}{pricingData.extraChildren > 0 ? `+${pricingData.extraChildren} trẻ em` : ''}). Phụ thu sẽ được tính tự động vào bảng chi phí bên phải.
                  </span>
                </div>
              )}
            </section>

            {/* Section 1: Thông tin Khách hàng & Liên hệ đặt chỗ (Chuẩn tối giản theo yêu cầu) */}
            <div className="space-y-5">
              {/* Khối 1: Thông tin Khách hàng */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-slate-800 text-[22px]">person</span>
                  <h2 className="text-lg font-bold text-slate-900">Thông tin Khách hàng</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">Vui lòng điền đầy đủ các thông tin để nhận xác nhận đơn hàng</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="last-name">
                      Họ (vd: NGUYEN)<span className="text-rose-500">*</span>
                    </label>
                    <input 
                      id="last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">như trên CMND (không dấu)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="first-name">
                      Chữ đệm và tên (vd: VAN ANH)<span className="text-rose-500">*</span>
                    </label>
                    <input 
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">như trên CMND (không dấu)</p>
                  </div>
                </div>
              </section>

              {/* Khối 2: Liên hệ đặt chỗ */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-slate-800 text-[20px]">mail</span>
                  <h2 className="text-lg font-bold text-slate-900">Liên hệ đặt chỗ</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">Thêm liên hệ để nhận xác nhận đặt chỗ.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="email">
                      Email<span className="text-rose-500">*</span>
                    </label>
                    <input 
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email_cua_ban@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">VD: email@example.com</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="phone">
                      Điện thoại di động<span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-between px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-sm shrink-0 min-w-[76px]">
                        <span>+84</span>
                        <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                      </div>
                      <input 
                        id="phone"
                        type="tel"
                        value={phoneNumber.replace(/^\+84\s?/, '')}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Nhập số điện thoại không bao gồm mã điện thoại quốc gia/khu vực đã chọn</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Section 3: Add-on Experiences (Enhance Your Stay) */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#725b38] rounded-full inline-block"></span>
                  <h2 className="font-serif text-xl font-bold text-slate-900">Gói Trải Nghiệm Thượng Lưu Bổ Sung</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Chọn thêm dịch vụ cao cấp để quản gia chuẩn bị sẵn sàng ngay khi quý khách đặt chân đến
                </p>
              </div>

              <div className="space-y-3">
                {/* Addon 0: Daily Buffet Breakfast (FEAT-GUEST-06 / TC02) */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonBuffet ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonBuffet}
                      onChange={(e) => setAddonBuffet(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=200&auto=format&fit=crop&q=80" 
                      alt="Buffet Sáng Hàng Ngày"
                      className="w-16 h-14 rounded-lg object-cover shadow-xs shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>Bữa Sáng Buffet Hàng Ngày (Daily Buffet)</span>
                        <span className="text-[11px] font-semibold text-[#725b38] bg-[#fedeb2] px-2 py-0.5 rounded-full">Phổ biến</span>
                      </div>
                      <div className="text-xs text-slate-500">Buffet ẩm thực Á-Âu thượng hạng không giới hạn tại nhà hàng Horizon Seafood</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? '$25.00' : '250.000đ'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      / đêm ({numberOfNights} đêm: {pricingData?.currency === 'USD' ? `$${(25 * numberOfNights).toFixed(2)}` : formatVND(250000 * numberOfNights)})
                    </div>
                  </div>
                </label>

                {/* Addon 1: Limousine Transfer */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonLimo ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonLimo}
                      onChange={(e) => setAddonLimo(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHPue0SBdG-v28y3nap8tQTNb3hlKF3SfAJMgwhJnoLKjmypI1K7eaqZ16aZuMDh07zP8CukMyz6tVoqNC2ihiyOG42R2jKy9DGan3yHAkyu4MldAX-o04yQWdwOt9MNRwjui7EEQL7IKNcCxCtx39ZK_qWreycbavltXHJE5Ft1R6QR6WyeRDGnVHXuLiTf8EWYVAIAeJ9fKZCOCHr7r6ceNXDsnuwB4hpgBWTxoviAOQwCCX63ai" 
                      alt="Limousine"
                      className="w-16 h-14 rounded-lg object-cover shadow-xs shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Đưa Đón Sân Bay Bằng Limousine</div>
                      <div className="text-xs text-slate-500">Xe riêng khứ hồi hạng thương gia Đà Nẵng, nước suối Evian &amp; khăn lạnh</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? '$35.00' : '800.000đ'}
                    </div>
                    <div className="text-[11px] text-slate-400">/ chuyến khứ hồi</div>
                  </div>
                </label>

                {/* Addon: Early Check-in (12:00 - 14:00) */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonEarlyCI ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonEarlyCI}
                      onChange={(e) => setAddonEarlyCI(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <div className="w-16 h-14 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs shrink-0">
                      <span className="material-symbols-outlined text-[28px]">login</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>Nhận Phòng Sớm (Early Check-In từ 12:00 - 14:00)</span>
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Tiết kiệm 40%</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Ưu tiên nhận phòng sớm từ 12:00 (chuẩn 14:00), đảm bảo phòng sạch sẽ và sẵn sàng đón tiếp
                      </div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? `$${((pricingData?.baseRate || basePricePerNight) * 0.30).toFixed(2)}` : formatVND(basePricePerNight * 0.30)}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 30% giá đêm</div>
                  </div>
                </label>

                {/* Addon: Late Check-out (từng nấc 30 phút) */}
                <div className={`p-4 rounded-xl border transition-all ${
                  addonLateCO ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setAddonLateCO(!addonLateCO)}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={addonLateCO}
                        onChange={(e) => setAddonLateCO(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                      />
                      <div className="w-16 h-14 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-[28px]">logout</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>Trả Phòng Trễ (Late Check-Out sau 12:00)</span>
                          {addonLateCO && (
                            <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                              Đến {selectedLateOption.time}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Thư thả nghỉ ngơi, sử dụng tiện ích resort linh hoạt từng nấc 30 phút theo lịch trình chuyến bay
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                      <div className="font-bold text-sm text-slate-900">
                        +{pricingData?.currency === 'USD' 
                          ? `$${((pricingData?.baseRate || basePricePerNight) * (selectedLateOption?.rate || 0.10)).toFixed(2)}` 
                          : formatVND(basePricePerNight * (selectedLateOption?.rate || 0.10))}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        / {selectedLateOption?.desc || '+10% giá đêm'}
                      </div>
                    </div>
                  </div>

                  {/* Thanh chọn mốc thời gian tăng dần 30 phút khi bật Late Check-Out */}
                  {addonLateCO && (
                    <div className="mt-3 pt-3 border-t border-blue-200/60 pl-8 sm:pl-9">
                      <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#725b38]">schedule</span>
                          <span>Chọn giờ trả phòng trễ mong muốn:</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Chuẩn trả phòng: 12:00 trưa
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {LATE_CHECKOUT_OPTIONS.map((opt) => {
                          const isSelected = lateCheckOutMinutes === opt.minutes;
                          const optCost = pricingData?.currency === 'USD'
                            ? `$${((pricingData?.baseRate || basePricePerNight) * opt.rate).toFixed(2)}`
                            : formatVND(basePricePerNight * opt.rate);
                          return (
                            <button
                              key={opt.minutes}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLateCheckOutMinutes(opt.minutes);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-[#725b38] text-white border-[#725b38] shadow-sm ring-2 ring-[#725b38]/20'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="font-bold text-xs flex items-center justify-between">
                                <span>{opt.time}</span>
                                <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  +{Math.round(opt.rate * 100)}%
                                </span>
                              </div>
                              <div className={`text-[11px] mt-1 font-semibold truncate ${isSelected ? 'text-amber-200' : 'text-[#725b38]'}`}>
                                +{optCost}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 4: Policies & Confirmation Checkbox */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                <span className="w-2 h-6 bg-[#725b38] rounded-full inline-block"></span>
                <h2 className="font-serif text-xl font-bold text-slate-900">Quy Định Nhận Phòng &amp; Chính Sách Hủy</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#eff4ff] border border-blue-100/60">
                  <span className="material-symbols-outlined text-[#725b38] text-[24px] shrink-0 mt-0.5">schedule</span>
                  <div>
                    <div className="font-bold text-sm text-slate-900">Thời Gian Nhận / Trả Phòng</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Nhận phòng từ <strong className="text-slate-900">14:00</strong> • Trả phòng trước <strong className="text-slate-900">12:00</strong>.
                      Hội viên Gold được ưu tiên nhận phòng sớm từ 12:00 (tùy tình trạng phòng sẵn có).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#eff4ff] border border-blue-100/60">
                  <span className="material-symbols-outlined text-[#725b38] text-[24px] shrink-0 mt-0.5">event_available</span>
                  <div>
                    <div className="font-bold text-sm text-slate-900">Hủy Phòng Linh Hoạt</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <span className="text-emerald-700 font-bold">Miễn phí 100% chi phí</span> khi hủy phòng trước 48 giờ. Hoàn trả tiền cọc tức thì trong 24 giờ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy Acceptance Checkbox (TC02) */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    id="policy-checkbox"
                    checked={isPolicyAccepted}
                    onChange={(e) => {
                      setIsPolicyAccepted(e.target.checked);
                      if (e.target.checked && errorCode === 'ERROR_0025_POLICY_NOT_ACCEPTED') {
                        setErrorMessage('');
                        setErrorCode('');
                      }
                    }}
                    className="w-5 h-5 accent-[#725b38] rounded mt-0.5 cursor-pointer shrink-0"
                  />
                  <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <span className="font-bold text-slate-900">Xác nhận điều khoản lưu trú *: </span>
                    Tôi xác nhận đã đọc, hiểu rõ và hoàn toàn đồng ý với 
                    <strong className="text-[#725b38] hover:underline cursor-pointer"> Điều khoản &amp; Quy định lưu trú </strong> 
                    cùng chính sách bảo mật thông tin của Grand Horizon Resort &amp; Suites.
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Summary & Breakdown Card (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              
              {/* Room Card Image */}
              <div className="relative h-48 sm:h-52 w-full bg-slate-900">
                <img 
                  src={roomHeroImage}
                  alt={roomDisplayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                <span className="absolute top-3 left-3 bg-[#131b2e]/90 backdrop-blur-md text-[#fedeb2] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                  {roomType?.Category || 'Villa Riêng Tư'}
                </span>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="font-serif text-lg sm:text-xl font-bold leading-snug">
                    {roomDisplayName}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Diện tích: {roomType?.Area || '185 m²'} • Hồ bơi vô cực riêng
                  </div>
                </div>
              </div>

              {/* Details & Pricing Breakdown */}
              <div className="p-5 sm:p-6 space-y-4">
                
                {/* Reservation Schedule Tag */}
                <div className="p-3 bg-[#eff4ff] rounded-xl flex items-center justify-between text-slate-900 border border-blue-100/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#725b38] text-[20px]">calendar_month</span>
                    <div className="text-left">
                      <div className="text-[11px] text-slate-500 font-medium">Lưu trú ({pricingData?.numberOfNights || numberOfNights} đêm)</div>
                      <div className="text-xs font-bold text-slate-900">
                        {formatDisplayDate(checkInDate)} - {formatDisplayDate(checkOutDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#725b38] text-[20px]">group</span>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 font-medium">Khách &amp; Phòng</div>
                      <div className="text-xs font-bold text-slate-900">
                        {adultsCount} lớn{childrenCount > 0 ? ` • ${childrenCount} trẻ` : ''} • {unitsAllocated} phòng
                      </div>
                    </div>
                  </div>
                </div>

                {isCalculatingPricing && (
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-[#725b38] bg-[#fedeb2]/40 rounded-lg animate-pulse">
                    <span className="w-3.5 h-3.5 border-2 border-[#725b38] border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang cập nhật tính toán chi phí...</span>
                  </div>
                )}

                {/* Calculation List */}
                <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 border-b border-slate-100 pb-4">
                  {/* FEAT-GUEST-12 (A12) / Hình 12: Tiền phòng linh hoạt theo thời điểm */}
                  <div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-800">
                          <div className="leading-snug">{pricingData?.appliedRule ? "Tiền phòng theo thời điểm" : "Tiền phòng gốc"}</div>
                          {pricingData?.appliedRule && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                ⚡ {pricingData.appliedRule.RuleName || "Giá linh hoạt"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>
                            {pricingData?.numberOfNights || numberOfNights} đêm × {formatMoney(pricingData?.baseRate || basePricePerNight, pricingData?.currency)} {unitsAllocated > 1 ? `× ${unitsAllocated} phòng` : ""}
                          </span>
                          {pricingData?.originalBaseRate && Math.round(pricingData.baseRate) !== Math.round(pricingData.originalBaseRate) && (
                            <span className="line-through text-slate-400 text-[10px]">
                              {formatMoney(pricingData.originalBaseRate, pricingData?.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(pricingData?.roomSubtotal || roomSubtotal, pricingData?.currency)}
                      </span>
                    </div>

                    {/* Breakdown từng đêm theo ngày thường, cuối tuần (+15%), ngày lễ */}
                    {pricingData?.dailyBreakdown && pricingData.dailyBreakdown.length > 0 && (
                      <div className="mt-2 bg-slate-50/90 rounded-lg p-2 border border-slate-200/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Lịch giá từng đêm</span>
                          <span>Đơn giá/đêm</span>
                        </div>
                        {pricingData.dailyBreakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600">
                            <span className="flex items-center gap-1">
                              <span className="font-mono text-slate-500">{item.date}</span>
                              {item.isHoliday ? (
                                <span className="px-1 py-0.2 bg-rose-100 text-rose-700 text-[9px] rounded font-bold">Lễ/Tết</span>
                              ) : item.isWeekend ? (
                                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] rounded font-bold">Cuối tuần +15%</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">(Thường)</span>
                              )}
                            </span>
                            <span className="font-medium text-slate-800">
                              {formatMoney(item.rate, pricingData?.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phụ thu khách phát sinh vượt chuẩn */}
                  {pricingData && pricingData.extraGuestSurcharge > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/60">
                      <div className="flex justify-between items-center text-amber-900">
                        <span className="flex items-center gap-1 font-semibold text-xs">
                          <span className="material-symbols-outlined text-[16px] text-amber-600">person_add</span>
                          Phụ thu khách vượt chuẩn:
                        </span>
                        <span className="font-bold text-amber-800">
                          +{formatMoney(pricingData.extraGuestSurcharge, pricingData.currency)}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        {pricingData.extraAdults > 0 && `+${pricingData.extraAdults} người lớn vượt chuẩn (${formatMoney(pricingData.currency === 'USD' ? 30 : 500000, pricingData.currency)}/đêm)`}
                        {pricingData.extraAdults > 0 && pricingData.extraChildren > 0 && ' • '}
                        {pricingData.extraChildren > 0 && `+${pricingData.extraChildren} trẻ em vượt chuẩn (${formatMoney(pricingData.currency === 'USD' ? 15 : 250000, pricingData.currency)}/đêm)`}
                      </div>
                    </div>
                  )}

                  {/* Phụ thu tiện ích Add-on */}
                  {pricingData?.addOnsBreakdown && pricingData.addOnsBreakdown.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex justify-between items-center font-medium text-slate-800">
                        <span>Tiện ích chọn thêm ({pricingData.addOnsBreakdown.length} món):</span>
                        <span className="font-semibold text-slate-900">
                          +{formatMoney(pricingData.addOnsTotal, pricingData.currency)}
                        </span>
                      </div>
                      {pricingData.addOnsBreakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-slate-500 pl-2">
                          <span className="truncate pr-2">• {item.name} {item.quantity > 1 ? `(${item.quantity} đêm)` : ''}:</span>
                          <span className="shrink-0 font-medium text-slate-700">+{formatMoney(item.total, pricingData.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ưu đãi hội viên Gold */}
                  {pricingData && pricingData.discountAmount > 0 && !appliedVoucher && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[16px]">stars</span>
                        Ưu đãi Hội viên Gold (-10%)
                      </span>
                      <span className="font-bold">-{formatMoney(pricingData.discountAmount, pricingData.currency)}</span>
                    </div>
                  )}

                  {/* Chiết khấu Voucher Khuyến Mãi (FEAT-GUEST-07) */}
                  {appliedVoucher && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200">
                      <div className="flex justify-between items-center text-emerald-900 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">local_activity</span>
                          <span>Voucher [{appliedVoucher.voucherCode}]:</span>
                        </span>
                        <span className="font-bold text-emerald-800 text-[13px]">
                          -{formatMoney(appliedVoucher.discountAmount, pricingData?.currency)}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5 flex justify-between items-center">
                        <span>Giảm {appliedVoucher.discountDisplay} tiền phòng</span>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                        >
                          Gỡ mã
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chi phí trước thuế */}
                  <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-dashed border-slate-200">
                    <span>Tổng chi phí trước thuế</span>
                    <span className="font-medium text-slate-700">
                      {formatMoney(pricingData?.subtotalBeforeTax || (roomSubtotal - goldDiscount + addonsTotal - (appliedVoucher?.discountAmount || 0)), pricingData?.currency)}
                    </span>
                  </div>

                  {/* Thuế GTGT & Phí dịch vụ 12% */}
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>Thuế VAT &amp; Phí địa phương ({pricingData?.taxesAndFeesRate ? `${pricingData.taxesAndFeesRate * 100}%` : '12%'})</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      +{formatMoney(pricingData?.taxesAndFees || Math.round((roomSubtotal - goldDiscount + addonsTotal) * 0.12), pricingData?.currency)}
                    </span>
                  </div>
                </div>

                {/* FEAT-GUEST-07: Khối Nhập Mã Voucher / Promo Code (Wireframe Hình 7) */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#725b38]">confirmation_number</span>
                      <span>Mã Khuyến Mãi / Voucher</span>
                    </label>
                    {appliedVoucher && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Đã áp dụng
                      </span>
                    )}
                  </div>

                  {!appliedVoucher ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={voucherInput}
                            onChange={(e) => {
                              setVoucherInput(e.target.value.toUpperCase());
                              if (voucherError) setVoucherError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyVoucher();
                              }
                            }}
                            placeholder="Nhập mã (VD: SUMMER20)"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                          />
                          {voucherInput && (
                            <button
                              type="button"
                              onClick={() => setVoucherInput('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyVoucher()}
                          disabled={isApplyingVoucher || !voucherInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                        >
                          {isApplyingVoucher ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <span>Áp Dụng</span>
                          )}
                        </button>
                      </div>

                      {/* Gợi ý mã khuyến mãi sẵn có */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-400">Gợi ý:</span>
                        <button
                          type="button"
                          onClick={() => { setVoucherInput('SUMMER20'); handleApplyVoucher('SUMMER20'); }}
                          className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          SUMMER20 (-20%)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVoucherInput('HORIZON500'); handleApplyVoucher('HORIZON500'); }}
                          className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          HORIZON500 (-500k)
                        </button>
                      </div>

                      {/* Thông báo lỗi Voucher chuẩn nguyên văn đặc tả */}
                      {voucherError && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-1.5 animate-shake">
                          <span className="material-symbols-outlined text-red-600 text-[16px] shrink-0 mt-0.5">error</span>
                          <div className="flex-1">
                            <span className="font-semibold">{voucherErrorCode ? `[${voucherErrorCode}] ` : ''}</span>
                            <span>{voucherError}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Thẻ thành công khi đã áp dụng mã */
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified</span>
                        <div>
                          <div className="font-bold text-emerald-900 font-mono tracking-wide">
                            {appliedVoucher.voucherCode}
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Tiết kiệm {appliedVoucher.discountDisplay} (-{formatMoney(appliedVoucher.discountAmount, pricingData?.currency)})
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        <span>Gỡ mã</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Total & Deposit Display */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Tổng thanh toán dự tính</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Bao gồm trọn gói thuế &amp; phí dịch vụ</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-serif font-bold text-[#725b38]">
                        {formatMoney(pricingData?.totalAmount || finalTotalAmount, pricingData?.currency)}
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-1">
                        Cọc tối thiểu (20%): <strong className="text-slate-900 font-bold text-[13px]">{formatMoney(pricingData?.depositAmount || depositRequired, pricingData?.currency)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={handleSubmitBooking}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white font-bold text-sm tracking-wide uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang Khởi Tạo Đơn...</span>
                    </>
                  ) : (
                    <>
                      <span>Tiếp Tục Đến Thanh Toán Cọc</span>
                      <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="pt-1 space-y-2 text-center">
                  <div className="flex items-center justify-center gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#725b38] text-[15px]">lock</span>
                      Bảo mật SSL 256-bit
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#725b38] text-[15px]">check_circle</span>
                      Xác nhận tức thì
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#eff4ff] flex items-center justify-center gap-2 text-xs border border-blue-100/50">
                    <span className="material-symbols-outlined text-[#725b38] text-[20px]">ring_volume</span>
                    <span className="text-slate-600">Hỗ trợ Concierge 24/7: </span>
                    <a href="tel:19006868" className="font-bold text-[#725b38] hover:underline">1900 6868</a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Modal Xác Nhận Đặt Phòng Thành Công (Happy Case - TC03) */}
        {successBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
              
              {/* Nút Đóng X Close Modal */}
              <button
                type="button"
                onClick={() => setSuccessBooking(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
                title="Đóng modal"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>
                
                <h3 className="font-serif text-2xl font-bold text-slate-900">
                  Khởi Tạo Đặt Phòng Thành Công!
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-600">
                  Mã xác nhận giữ chỗ: <span className="font-mono font-bold text-[#725b38] text-base">{successBooking.confirmationCode}</span>
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  Trạng thái: PENDING (Chờ thanh toán cọc)
                </div>
              </div>

              {/* Order Recap */}
              <div className="mt-6 p-4 rounded-xl bg-[#eff4ff] space-y-2 text-xs sm:text-sm border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách lưu trú chính:</span>
                  <span className="font-bold text-slate-900">{successBooking.primaryGuest?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-800">{successBooking.primaryGuest?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số đêm:</span>
                  <span className="text-slate-800">
                    {successBooking.numberOfNights} đêm ({formatDisplayDate(successBooking.checkInDate)} đến {formatDisplayDate(successBooking.checkOutDate)})
                  </span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">local_activity</span>
                      Mã giảm giá [{appliedVoucher.voucherCode}]:
                    </span>
                    <span className="font-bold">-{formatMoney(appliedVoucher.discountAmount, pricingData?.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng thanh toán:</span>
                  <span className="font-bold text-slate-900">{formatVND(successBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200/60 pt-2 text-[#725b38]">
                  <span className="font-bold">Số tiền cọc cần thanh toán (20%):</span>
                  <span className="font-bold text-base">{formatVND(successBooking.depositAmount)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/payment?bookingId=${successBooking.bookingId}&code=${successBooking.confirmationCode}`);
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white font-bold text-sm uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Thanh Toán Cọc Ngay (Bước 2)</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-blue-100 text-[#725b38] hover:text-[#584323] text-xs font-bold transition-all border border-blue-200 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    <span>In Phiếu Đặt Phòng / Hóa Đơn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccessBooking(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors"
                  >
                    Xem lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem & In Hóa Đơn / Phiếu Đặt Phòng Chuẩn A4 */}
        <DepositInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          booking={{
            ...successBooking,
            roomType,
            adults: adultsCount,
            children: childrenCount,
            roomQuantity: unitsAllocated
          }}
          paymentSuccess={successBooking ? {
            transactionCode: 'TXN-' + (successBooking.bookingId || Date.now().toString().slice(-6)),
            confirmationCode: successBooking.confirmationCode,
            amountPaid: successBooking.depositAmount || Math.round((successBooking.totalAmount || 0) * 0.2),
            remainingBalance: Math.max(0, (successBooking.totalAmount || 0) - (successBooking.depositAmount || Math.round((successBooking.totalAmount || 0) * 0.2))),
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${successBooking.confirmationCode}`,
            paymentDate: new Date()
          } : null}
          paymentMethod="BANK_TRANSFER"
          user={user}
        />

        {/* Modal Yêu cầu đăng nhập trước khi hoàn tất đặt phòng */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-100 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#725b38] mx-auto flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[36px]">lock</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                  Yêu Cầu Đăng Nhập
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Để bảo mật đơn đặt phòng và liên kết quyền lợi hội viên cũng như theo dõi trong mục <strong className="text-slate-800">Lịch sử đặt phòng</strong>, quý khách vui lòng đăng nhập trước khi tiếp tục.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 flex items-center gap-3 text-left">
                <span className="material-symbols-outlined text-[#725b38] text-[24px] shrink-0">verified</span>
                <span>Thông tin phòng, ngày lưu trú và các tiện ích đã chọn sẽ được giữ nguyên sau khi đăng nhập.</span>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const currentUrl = window.location.pathname + window.location.search;
                    navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
                  }}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Đăng Nhập Tài Khoản Ngay</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>

                <div className="flex items-center justify-between gap-3 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const currentUrl = window.location.pathname + window.location.search;
                      navigate(`/login?mode=register&redirect=${encodeURIComponent(currentUrl)}`);
                    }}
                    className="text-[#725b38] hover:underline font-semibold"
                  >
                    Chưa có tài khoản? Đăng ký
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="text-slate-500 hover:text-slate-800 font-medium px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full bg-[#f0f4fc] mt-16 pt-12 pb-8 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
            <div className="space-y-3">
              <div className="font-serif text-xl font-bold tracking-tight text-slate-900">GRAND HORIZON</div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[#725b38] font-semibold">Resort &amp; Suites</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tận hưởng không gian nghỉ dưỡng tĩnh tại, chuẩn mực xa hoa 5 sao bên bờ vịnh nguyên sơ, kiến tạo phong vị thượng lưu đích thực.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-sm text-slate-900 mb-2">Liên Hệ Trực Tiếp</h4>
              <div>Bán đảo Horizon, Đường Duyên Hải, Thành phố Đà Nẵng</div>
              <div className="font-bold text-[#725b38]">Hotline Concierge: 1900 6868</div>
              <div>Email: concierge@grandhorizonresort.com</div>
              <div>Dịch Vụ Quản Gia Riêng: 24/7</div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-sm text-slate-900 mb-2">Đặc Quyền &amp; Hỗ Trợ</h4>
              <div><Link to="/rooms" className="hover:text-[#725b38]">Danh Mục Phòng &amp; Biệt Thự Suite</Link></div>
              <div><Link to="/room-service" className="hover:text-[#725b38]">Nhà Hàng Ẩm Thực Michelin Selected</Link></div>
              <div><Link to="/profile" className="hover:text-[#725b38]">Chính Sách Khách Hàng Elite Club</Link></div>
              <div><Link to="/" className="hover:text-[#725b38]">Chính Sách Hủy Đặt Phòng &amp; Bảo Mật</Link></div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-sm text-slate-900 mb-2">Giao Dịch An Toàn</h4>
              <p className="text-[11px] text-slate-500">Hệ thống mã hóa bảo mật cấp ngân hàng chuẩn quốc tế SSL 256-bit.</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['VietQR', 'VISA', 'Mastercard', 'VNPAY'].map(method => (
                  <span key={method} className="px-2 py-1 rounded bg-white text-[11px] font-bold text-slate-800 shadow-xs border border-slate-200">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© 2025 Grand Horizon Resort &amp; Suites. Bảo lưu mọi quyền.</p>
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:text-[#725b38]">Điều Khoản Sử Dụng</Link>
              <span>•</span>
              <Link to="/" className="hover:text-[#725b38]">Chính Sách Riêng Tư</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
