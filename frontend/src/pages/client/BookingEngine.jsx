import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import DepositInvoiceModal from '../../components/modals/DepositInvoiceModal';
import { getRoomDetailApi, createBookingApi, releaseRoomLockApi, calculatePricingApi } from '../../api/roomApi';
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
  const [firstName, setFirstName] = useState(user?.FullName ? user.FullName.split(' ').pop() : 'An');
  const [lastName, setLastName] = useState(user?.FullName ? user.FullName.split(' ').slice(0, -1).join(' ') || 'Nguyễn' : 'Nguyễn Văn');
  const [email, setEmail] = useState(user?.Email || 'an.nguyen@grandhorizon.vn');
  const [phoneNumber, setPhoneNumber] = useState(user?.Phone || '+84908123456');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);

  // Add-on experiences (FEAT-GUEST-06)
  const [addonBuffet, setAddonBuffet] = useState(false);
  const [addonLimo, setAddonLimo] = useState(false);
  const [addonFloating, setAddonFloating] = useState(false);
  const [addonSpa, setAddonSpa] = useState(false);
  const [addonBbq, setAddonBbq] = useState(false);
  const [addonEarlyCI, setAddonEarlyCI] = useState(false);
  const [addonLateCO, setAddonLateCO] = useState(false);

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
      if (addonFloating) selectedAddonsList.push('ADDON_FLOATING');
      if (addonSpa) selectedAddonsList.push('ADDON_SPA');
      if (addonBbq) selectedAddonsList.push('ADDON_BBQ');
      if (addonEarlyCI) selectedAddonsList.push('ADDON_EARLY_CI');
      if (addonLateCO) selectedAddonsList.push('ADDON_LATE_CO');

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
  }, [checkInDate, checkOutDate, roomType, roomTypeId, adultsCount, childrenCount, unitsAllocated, addonBuffet, addonLimo, addonFloating, addonSpa, addonBbq, addonEarlyCI, addonLateCO, user]);

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
    if (addonLimo) total += 800000;
    if (addonFloating) total += 900000;
    if (addonSpa) total += 1800000;
    if (addonBbq) total += 2200000;
    return total;
  }, [pricingData, addonBuffet, addonLimo, addonFloating, addonSpa, addonBbq, basePricePerNight, numberOfNights]);

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
    if (addonFloating) selectedAddonsList.push('ADDON_FLOATING');
    if (addonSpa) selectedAddonsList.push('ADDON_SPA');
    if (addonBbq) selectedAddonsList.push('ADDON_BBQ');
    if (addonEarlyCI) selectedAddonsList.push('ADDON_EARLY_CI');
    if (addonLateCO) selectedAddonsList.push('ADDON_LATE_CO');

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
      {/* Universal Luxury Navigation */}
      <Header />

      <main className="w-full pt-24 bg-[#f8f9ff] flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Banner editorial context */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-8 bg-[#131b2e] text-white">
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center mix-blend-luminosity" 
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBpNvT_tiMvztgtaSSXZSbJZeHcO4CmTIga0KvWFTw2qD-CStV5suuUS4Z2BWH-3jkJTnxwXJWeg2Rl-Nfq9_tTtZTp3Qy0ydhGI93HgyaNXRsIhp07rRsE9NeNUx9pj-cOPVbD-f5JqzJt8dnrur5ybGlqT3uJJHlj4yPwLqOHcouLTBMDTG6-Iff-r8JvaXCDjhtgFS3t3v_6ze3zdog3V1Qcw5WFHdUb80txiDk7BOINf_NvKDBq')` }}
          />
          <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fedeb2] text-[#78603e] text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">stars</span>
                <span>ĐẶC QUYỀN HỘI VIÊN GOLD</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
                Hoàn Tất Yêu Cầu Đặt Phòng
              </h1>
              <p className="text-sm sm:text-base text-[#bec6e0] max-w-xl">
                Trải nghiệm kỳ nghỉ dưỡng an nhiên tại bán đảo riêng tư với những dịch vụ cá nhân hóa chuẩn mực 5 sao quốc tế.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-xl text-white shrink-0 border border-white/15">
              <span className="material-symbols-outlined text-[#fedeb2] text-[32px]">verified_user</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#fedeb2]">Giá Đảm Bảo Tốt Nhất</div>
                <div className="text-xs text-[#cbdbf5]">Xác nhận trực tiếp từ khu nghỉ dưỡng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar (Chuẩn 3 Bước: 1. Chọn ngày & phòng -> 2. Thanh toán cọc -> 3. Hoàn tất) */}
        <div className="mb-8 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
            {/* Step 1 - Active */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] border border-blue-100">
              <div className="w-8 h-8 rounded-full bg-[#725b38] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                1
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-[#725b38]">Bước 1</div>
                <div className="text-sm truncate font-bold text-[#0b1c30]">Chọn ngày &amp; phòng</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-500 opacity-80 border border-transparent">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-slate-400">Bước 2</div>
                <div className="text-sm truncate font-medium text-slate-600">Thanh toán cọc</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-400 opacity-60 border border-transparent">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-slate-400">Bước 3</div>
                <div className="text-sm truncate font-medium">Hoàn tất kỳ nghỉ</div>
              </div>
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

            {/* Section 1: Guest Information */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#725b38] rounded-full inline-block"></span>
                  <h2 className="font-serif text-xl font-bold text-slate-900">Thông Tin Khách Lưu Trú Chính</h2>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-[#725b38] bg-[#eff4ff] px-3 py-1 rounded-full font-medium">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Bảo mật SSL 256-bit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="last-name">
                    Họ đệm *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                    <input 
                      id="last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nguyễn Văn"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="first-name">
                    Tên chính *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                    <input 
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="An"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="email">
                    Địa chỉ Email nhận thư xác nhận *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                    <input 
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="an.nguyen@grandhorizon.vn"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="phone">
                    Số điện thoại liên lạc *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">call</span>
                    <input 
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+84 908 123 456"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="arrival-time">
                    Khung giờ dự kiến đến khách sạn
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">schedule</span>
                    <select
                      id="arrival-time"
                      value={estimatedArrivalTime}
                      onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all"
                    >
                      <option value="14:00 - Tiêu chuẩn nhận phòng">14:00 - Tiêu chuẩn nhận phòng</option>
                      <option value="15:00 - 17:00 - Khung giờ chiều">15:00 - 17:00 - Khung giờ chiều</option>
                      <option value="18:00 - Early Evening Reception">18:00 - Early Evening Reception (Khuyên dùng)</option>
                      <option value="Sau 20:00 - Nhận phòng muộn">Sau 20:00 - Nhận phòng đêm / Đón muộn</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="special-requests">
                    Ghi chú đặc biệt cho Quản Gia &amp; Lễ Tân
                  </label>
                  <textarea 
                    id="special-requests"
                    rows="3"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Ví dụ: Giờ bay dự kiến, yêu cầu nôi em bé, chế độ ăn kiêng hoặc trang trí phòng kỷ niệm ngày cưới..."
                    className="w-full p-3 rounded-lg bg-[#eff4ff] text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all resize-none"
                    maxLength={500}
                  />
                  <div className="text-right text-[11px] text-slate-400 mt-1">
                    {specialRequests.length}/500 ký tự
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Room Preferences Configuration */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                <span className="w-2 h-6 bg-[#725b38] rounded-full inline-block"></span>
                <h2 className="font-serif text-xl font-bold text-slate-900">Tùy Chọn Cấu Hình Phòng Biệt Thự</h2>
              </div>

              <div className="space-y-4">
                {/* Bed Type Selection */}
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-2">Quy cách giường nghỉ yêu thích</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      bedPreference === 'king' ? 'bg-[#eff4ff] border-[#725b38]' : 'bg-[#f8f9ff] border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="bed_type"
                        value="king"
                        checked={bedPreference === 'king'}
                        onChange={() => setBedPreference('king')}
                        className="w-4 h-4 accent-[#725b38] cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[#725b38] text-[24px]">king_bed</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">1 Giường King Lớn</span>
                        <span className="text-xs text-slate-500">Đệm lông vũ cao cấp 2m0 x 2m2</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      bedPreference === 'twin' ? 'bg-[#eff4ff] border-[#725b38]' : 'bg-[#f8f9ff] border-slate-200 hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio" 
                        name="bed_type"
                        value="twin"
                        checked={bedPreference === 'twin'}
                        onChange={() => setBedPreference('twin')}
                        className="w-4 h-4 accent-[#725b38] cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[#725b38] text-[24px]">bed</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">2 Giường Đơn Twin</span>
                        <span className="text-xs text-slate-500">Hai giường đơn tách biệt 1m2 x 2m0</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Room Wishes */}
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-2">Mong muốn lưu trú bổ sung</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#eff4ff] border border-blue-100/50 cursor-pointer hover:bg-blue-50 transition-colors">
                      <span className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <span className="material-symbols-outlined text-[#725b38] text-[20px]">smoke_free</span>
                        Khu vực Không hút thuốc
                      </span>
                      <input 
                        type="checkbox" 
                        checked={noSmoking}
                        onChange={(e) => setNoSmoking(e.target.checked)}
                        className="w-4 h-4 accent-[#725b38] rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#eff4ff] border border-blue-100/50 cursor-pointer hover:bg-blue-50 transition-colors">
                      <span className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <span className="material-symbols-outlined text-[#725b38] text-[20px]">terrain</span>
                        Vị trí vách đá góc nhìn panorama
                      </span>
                      <input 
                        type="checkbox" 
                        checked={highFloorPanorama}
                        onChange={(e) => setHighFloorPanorama(e.target.checked)}
                        className="w-4 h-4 accent-[#725b38] rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

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

                {/* Addon: Early Check-in */}
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
                      <div className="font-bold text-sm text-slate-900">Nhận Phòng Sớm (Early Check-In từ 09:00)</div>
                      <div className="text-xs text-slate-500">Ưu tiên nhận phòng sớm khi đến resort, đảm bảo phòng sạch sẽ sẵn sàng</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? `$${(pricingData.baseRate * 0.5).toFixed(2)}` : formatVND(basePricePerNight * 0.5)}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 50% giá đêm</div>
                  </div>
                </label>

                {/* Addon: Late Check-out */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonLateCO ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonLateCO}
                      onChange={(e) => setAddonLateCO(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <div className="w-16 h-14 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs shrink-0">
                      <span className="material-symbols-outlined text-[28px]">logout</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Trả Phòng Trễ (Late Check-Out đến 18:00)</div>
                      <div className="text-xs text-slate-500">Thư thả nghỉ ngơi, sử dụng hồ bơi và tiện ích resort trọn vẹn đến chiều tối</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? `$${(pricingData.baseRate * 0.5).toFixed(2)}` : formatVND(basePricePerNight * 0.5)}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 50% giá đêm</div>
                  </div>
                </label>

                {/* Addon 2: Floating Breakfast */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonFloating ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonFloating}
                      onChange={(e) => setAddonFloating(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz0qv8ig2oxlN2RwvK6i1c9mJ--5phiBWF-QQN4-nTlpz0WDROV7mz_4JE0Qm-sb8w4S_kEYdhXYqfqHsE4tEr_P4XkSjrrMIfg1kiV3UyAwaujNWDjVnH5h7krtoGM813CddU9VY8Vo4xIgXGiY7E8KugGOBGIp8GcFsaYndfXPdhuHuxOn0aBJ5v08OG4cC7lU13SXz2vbsOknkVMaQd8UCMm6HzsVM_cC6p8rnh-Al2BUmejMx9" 
                      alt="Floating Breakfast"
                      className="w-16 h-14 rounded-lg object-cover shadow-xs shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Bữa Sáng Bồng Bềnh Floating Breakfast</div>
                      <div className="text-xs text-slate-500">Phục vụ trên khay mây trôi tại hồ bơi riêng kèm bánh tươi &amp; nước ép</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? '$40.00' : '900.000đ'}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 2 người / sáng</div>
                  </div>
                </label>

                {/* Addon 3: Couple Spa */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonSpa ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonSpa}
                      onChange={(e) => setAddonSpa(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoKB51-9l3TyoSaYnWJOrVgdkPzheCerhf2BvZLeFPHbLyIxBBOWsiUILoO0whOE-nuO_b2zCF5vsJsb3k71CwBHsLicpLKwkv6QfQxh6mjw0BdKnE53pku6mAeb27h1PtW1wwa6e0JqJQPIuPEoPquInBlrQfPaoU520etnRVE5yCgZLgmhqKIV3QS6nmWxx_jPEOhhvQZ9QNd01qc0QqxB4V7DE8eOzufB1awUWaG0SBJr0gzGfU" 
                      alt="Couple Spa"
                      className="w-16 h-14 rounded-lg object-cover shadow-xs shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Trị Liệu Spa Toàn Thân Cặp Đôi 90 Phút</div>
                      <div className="text-xs text-slate-500">Liệu pháp đá nóng núi lửa &amp; tinh dầu hoa sen độc quyền Serenity Spa</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? '$80.00' : '1.800.000đ'}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 2 khách</div>
                  </div>
                </label>

                {/* Addon 4: Seafood BBQ */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  addonBbq ? 'bg-[#eff4ff] border-[#725b38]/40 shadow-sm' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={addonBbq}
                      onChange={(e) => setAddonBbq(e.target.checked)}
                      className="w-5 h-5 accent-[#725b38] rounded shrink-0 cursor-pointer"
                    />
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCZGQeOWqlgS7l1N-g76SPU0GXGc6l2Va2A0dvTFv4Ud3UaSMSbGRS44e28vlqaraU0n76F_jlSSIeaI--Nyrhw0xPVH3dQdTul2rFQqXfaB3xbDOEfO6g3L4P84exX4sRiuo4VeP4slRy8Bl1f2m7Bwdx8OmvKYevD4FgqKA6zVs5YkfqwQod4JfMQug3pfMEtATyap4y7AHpXodAG7tufSMx0J3JfA90UMCvye3hhNQUhDUKt-P7" 
                      alt="BBQ"
                      className="w-16 h-14 rounded-lg object-cover shadow-xs shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">Tiệc BBQ Hải Sản Tối Lãng Mạn Bờ Cát</div>
                      <div className="text-xs text-slate-500">Đầu bếp riêng phục vụ tôm hùm Nha Trang, rượu vang &amp; ánh nến hoàng hôn</div>
                    </div>
                  </div>
                  <div className="text-right sm:shrink-0 pl-8 sm:pl-0">
                    <div className="font-bold text-sm text-slate-900">
                      +{pricingData?.currency === 'USD' ? '$100.00' : '2.200.000đ'}
                    </div>
                    <div className="text-[11px] text-slate-400">/ 2 người</div>
                  </div>
                </label>
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

          {/* RIGHT COLUMN: Sticky Summary & Breakdown Card (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-28">
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
                  {/* Tiền phòng gốc */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-slate-800">Tiền phòng gốc</div>
                      <div className="text-[11px] text-slate-400">
                        {pricingData?.numberOfNights || numberOfNights} đêm × {formatMoney(pricingData?.baseRate || basePricePerNight, pricingData?.currency)} × {unitsAllocated} phòng
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(pricingData?.roomSubtotal || roomSubtotal, pricingData?.currency)}
                    </span>
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
                  {pricingData && pricingData.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[16px]">stars</span>
                        Ưu đãi Hội viên Gold (-10%)
                      </span>
                      <span className="font-bold">-{formatMoney(pricingData.discountAmount, pricingData.currency)}</span>
                    </div>
                  )}

                  {/* Chi phí trước thuế */}
                  <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-dashed border-slate-200">
                    <span>Tổng chi phí trước thuế</span>
                    <span className="font-medium text-slate-700">
                      {formatMoney(pricingData?.subtotalBeforeTax || (roomSubtotal - goldDiscount + addonsTotal), pricingData?.currency)}
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
            transactionCode: 'TXN-' + successBooking.bookingId + '-' + Date.now().toString().slice(-4),
            confirmationCode: successBooking.confirmationCode,
            amountPaid: successBooking.depositAmount,
            remainingBalance: Math.max(0, (successBooking.totalAmount || 0) - (successBooking.depositAmount || 0)),
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${successBooking.confirmationCode}`,
            paymentDate: new Date()
          } : null}
          paymentMethod="BANK_TRANSFER"
          user={user}
        />

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
