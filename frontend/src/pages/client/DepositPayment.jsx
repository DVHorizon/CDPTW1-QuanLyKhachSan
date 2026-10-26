import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import DepositInvoiceModal from '../../components/modals/DepositInvoiceModal';
import { getBookingDetailsApi, processDepositPaymentApi } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';

// Helper format VND currency
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num || 0)) + ' ₫';
};

// Helper format date DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  const parts = String(dStr).split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
};

// Luhn validation check on frontend
function isValidLuhnFrontend(cardNumber) {
  const digits = String(cardNumber).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

export default function DepositPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookingIdParam = searchParams.get('bookingId') || searchParams.get('id') || '';
  const confirmationCodeParam = searchParams.get('code') || '';

  // Booking detail state
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);

  // Payment configuration
  const [depositOption, setDepositOption] = useState('DEPOSIT_20'); // 'DEPOSIT_20' (20% minimum) | 'DEPOSIT_50' | 'FULL_PAYMENT'
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER'); // 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'POINTS'
  const [walletProvider, setWalletProvider] = useState('VNPAY');
  
  // Card form inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState(user?.FullName ? user.FullName.toUpperCase() : 'NGUYEN VAN AN');
  const [expiryDate, setExpiryDate] = useState('12/28');
  const [cvvCode, setCvvCode] = useState('');

  // Points & Policies
  const [usePoints, setUsePoints] = useState(false);
  const [isPolicyAgreed, setIsPolicyAgreed] = useState(true);

  // UI state
  const [copyFeedback, setCopyFeedback] = useState({ acc: false, code: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Fetch Booking Details
  useEffect(() => {
    let isMounted = true;
    async function fetchBooking() {
      setLoading(true);
      const queryId = bookingIdParam || confirmationCodeParam || '1';
      try {
        const res = await getBookingDetailsApi(queryId);
        if (isMounted && res && res.success && res.data) {
          setBooking(res.data);
          if (res.data.timeoutSeconds !== undefined) {
            setTimerSeconds(Math.max(0, res.data.timeoutSeconds));
          }
        } else if (isMounted) {
          // Mock data fallback for demonstration if no booking ID passed
          setBooking({
            bookingId: 99281,
            confirmationCode: 'GH-99281',
            status: 'Pending',
            checkInDate: '2024-11-15',
            checkOutDate: '2024-11-18',
            numberOfNights: 3,
            adults: 2,
            children: 0,
            roomQuantity: 1,
            totalAmount: 22950000,
            depositAmount: 11475000,
            roomType: {
              TypeName: 'Oceanfront Sunset Pool Villa',
              Category: 'Biệt Thự Hướng Biển Sang Trọng',
              BasePrice: 6500000,
              ThumbnailImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrER2uzVgC6FgGR7FHtJo44JVbpyq-6oFCdZPItYCDdTra_Ke-arCfaOsYdg2xjeaOXSEC7IL1RTh3HYzYrvqXJ6pW8SsSq-dzMeYxhVcn2r-04u9W3qpRvpo9xpJKwr7f08-OtCXjz2bzDdK6MiyAcWZFNPxsTv9huuRIo-2cRBs_wBm7Jr0QXQbxigetnPsTj3T5M3k_AO0pOugCeuACEDi9zQ3QATImt0or46BXu01R7F8Nuhx7'
            }
          });
        }
      } catch (err) {
        console.error('Lỗi tải booking:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchBooking();
    return () => { isMounted = false; };
  }, [bookingIdParam, confirmationCodeParam]);

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorCode('ERROR_0033_SESSION_EXPIRED');
          setErrorMessage('Phiên giữ phòng đã hết thời gian 15 phút. Vui lòng thực hiện đặt lại phòng');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Format countdown string MM:SS
  const timerDisplay = useMemo(() => {
    if (timerSeconds <= 0) return '00:00 (Hết hạn)';
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timerSeconds]);

  // Calculation of payable deposit amount
  const totalAmount = useMemo(() => {
    return parseFloat(booking?.totalAmount || 22950000);
  }, [booking]);

  const rawPayableAmount = useMemo(() => {
    if (depositOption === 'DEPOSIT_20') return Math.round(totalAmount * 0.2);
    if (depositOption === 'DEPOSIT_50') return Math.round(totalAmount * 0.5);
    return totalAmount; // FULL_PAYMENT
  }, [totalAmount, depositOption]);

  const pointsDiscount = useMemo(() => {
    if (!usePoints) return 0;
    return 1245000; // 12.450 điểm
  }, [usePoints]);

  const finalPayable = useMemo(() => {
    return Math.max(0, rawPayableAmount - pointsDiscount);
  }, [rawPayableAmount, pointsDiscount]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, totalAmount - finalPayable);
  }, [totalAmount, finalPayable]);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Card Number Formatter
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Expiry Date Formatter MM/YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiryDate(raw);
  };

  // Process Payment Submission
  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setErrorCode('');

    if (timerSeconds <= 0) {
      setErrorCode('ERROR_0033_SESSION_EXPIRED');
      setErrorMessage('Phiên giữ phòng đã hết thời gian 15 phút. Vui lòng thực hiện đặt lại phòng');
      return;
    }

    if (!isPolicyAgreed) {
      setErrorMessage('Quý khách vui lòng đồng ý với các Quy định hủy phòng và thanh toán.');
      return;
    }

    // Validate Card if Credit Card method
    if (paymentMethod === 'CREDIT_CARD') {
      const cleanPan = cardNumber.replace(/\D/g, '');
      if (!isValidLuhnFrontend(cleanPan)) {
        setErrorCode('ERROR_0030_INVALID_CARD_NUMBER');
        setErrorMessage('Số thẻ thanh toán không hợp lệ (sai định dạng Luhn)');
        return;
      }

      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        setErrorCode('ERROR_0031_CARD_EXPIRED');
        setErrorMessage('Thẻ thanh toán đã hết hạn sử dụng');
        return;
      }

      const [mm, yy] = expiryDate.split('/').map(Number);
      const now = new Date();
      const curY = Number(String(now.getFullYear()).slice(-2));
      const curM = now.getMonth() + 1;
      if (yy < curY || (yy === curY && mm < curM)) {
        setErrorCode('ERROR_0031_CARD_EXPIRED');
        setErrorMessage('Thẻ thanh toán đã hết hạn sử dụng');
        return;
      }

      if (!/^\d{3,4}$/.test(cvvCode.trim())) {
        setErrorCode('ERROR_0032_PAYMENT_DECLINED');
        setErrorMessage('Giao dịch bị từ chối bởi ngân hàng phát hành thẻ. Vui lòng thử phương thức khác');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const activeBookingId = booking?.bookingId || bookingIdParam || 1;
      const payload = {
        depositOption,
        paymentMethod,
        cardholderName: cardholderName.trim(),
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryDate: expiryDate.trim(),
        cvvCode: cvvCode.trim(),
        usedPoints: usePoints ? 12450 : 0,
        walletProvider
      };

      const res = await processDepositPaymentApi(activeBookingId, payload);

      if (res && res.success) {
        setPaymentSuccess(res.data);
      } else {
        setErrorCode(res?.code || 'ERROR_PAYMENT_FAILED');
        setErrorMessage(res?.message || 'Giao dịch không thành công. Vui lòng kiểm tra lại phương thức thanh toán.');
      }
    } catch (err) {
      console.error('Lỗi khi gửi thanh toán cọc:', err);
      setErrorCode('ERROR_NETWORK');
      setErrorMessage('Đã xảy ra lỗi kết nối với cổng thanh toán. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookingCodeStr = booking?.confirmationCode || 'GH15112024';
  const villaName = booking?.roomType?.TypeName || 'Oceanfront Sunset Pool Villa';
  const villaImg = booking?.roomType?.ThumbnailImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrER2uzVgC6FgGR7FHtJo44JVbpyq-6oFCdZPItYCDdTra_Ke-arCfaOsYdg2xjeaOXSEC7IL1RTh3HYzYrvqXJ6pW8SsSq-dzMeYxhVcn2r-04u9W3qpRvpo9xpJKwr7f08-OtCXjz2bzDdK6MiyAcWZFNPxsTv9huuRIo-2cRBs_wBm7Jr0QXQbxigetnPsTj3T5M3k_AO0pOugCeuACEDi9zQ3QATImt0or46BXu01R7F8Nuhx7';

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col font-sans text-[#0b1c30]">
      {/* Universal Luxury Navigation */}
      <Header />

      <main className="w-full pt-24 bg-[#f8f9ff] flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        
        {/* Header Bar & 15-Minute Countdown */}
        <div className="py-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#725b38] text-xs font-bold tracking-wider uppercase">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Cổng Thanh Toán Mã Hóa Bảo Mật 256-Bit</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0b1c30] tracking-tight">
              Thanh Toán Tiền Cọc Đặt Phòng
            </h1>
          </div>

          <div className={`flex items-center gap-3 self-start md:self-auto px-4 py-2.5 rounded-xl shadow-xs border transition-all ${
            timerSeconds < 180 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#eff4ff] border-blue-100 text-[#725b38]'
          }`}>
            <span className="material-symbols-outlined text-[24px] animate-pulse">timer</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Thời gian giữ phòng</span>
              <span className="font-mono text-xl font-bold tracking-tight">
                {timerDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar (Chuẩn 3 Bước: 1. Chọn ngày & phòng -> 2. Thanh toán cọc (Active) -> 3. Hoàn tất) */}
        <div className="mb-8 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
            {/* Step 1 - Completed */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#725b38] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                ✓
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-[#725b38]">Bước 1</div>
                <div className="text-sm truncate font-semibold text-slate-800">Chọn ngày &amp; phòng</div>
              </div>
            </div>

            {/* Step 2 - Active */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] border border-blue-200 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#131b2e] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                2
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-[#725b38]">Bước 2</div>
                <div className="text-sm truncate font-bold text-[#0b1c30]">Thanh toán cọc</div>
              </div>
            </div>

            {/* Step 3 - Pending */}
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

        <div className="mt-4 p-3 bg-[#fedeb2]/40 rounded-xl flex items-center gap-2.5 text-[#78603e] border border-[#fedeb2]">
            <span className="material-symbols-outlined text-[#725b38] text-[20px] shrink-0">info</span>
            <p className="text-xs leading-relaxed">
              Phòng nghỉ của Quý khách đang được tạm giữ an toàn trong hệ thống. Vui lòng hoàn tất thanh toán khoản tiền cọc để nhận ngay mã xác thực QR và dịch vụ quản gia đưa đón.
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 animate-shake">
            <span className="material-symbols-outlined text-red-600 shrink-0 mt-0.5">error</span>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {errorCode ? `Mã lỗi: ${errorCode}` : 'Thông báo lỗi thanh toán'}
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
          
          {/* LEFT COLUMN: Payment Methods & Details (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Payment Container Box */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-5">
              
              {/* Option Selector: Cọc 20%, Cọc 50%, hoặc Trả 100% */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Lựa Chọn Mức Thanh Toán Đặt Cọc
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    depositOption === 'DEPOSIT_20' ? 'bg-[#eff4ff] border-[#725b38] shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cọc 20% Giữ Chỗ</span>
                      <input 
                        type="radio" 
                        name="dep_opt"
                        checked={depositOption === 'DEPOSIT_20'}
                        onChange={() => setDepositOption('DEPOSIT_20')}
                        className="w-4 h-4 accent-[#725b38]"
                      />
                    </div>
                    <div className="font-mono text-base font-bold text-[#725b38] mt-2">
                      {formatVND(totalAmount * 0.2)}
                    </div>
                    <span className="text-[10px] text-slate-400">Thanh toán còn lại khi check-in</span>
                  </label>

                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    depositOption === 'DEPOSIT_50' ? 'bg-[#eff4ff] border-[#725b38] shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cọc 50% Tiêu Chuẩn</span>
                      <input 
                        type="radio" 
                        name="dep_opt"
                        checked={depositOption === 'DEPOSIT_50'}
                        onChange={() => setDepositOption('DEPOSIT_50')}
                        className="w-4 h-4 accent-[#725b38]"
                      />
                    </div>
                    <div className="font-mono text-base font-bold text-[#725b38] mt-2">
                      {formatVND(totalAmount * 0.5)}
                    </div>
                    <span className="text-[10px] text-slate-400">Khuyên dùng cho Villa</span>
                  </label>

                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    depositOption === 'FULL_PAYMENT' ? 'bg-[#eff4ff] border-[#725b38] shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Trả 100% Toàn Bộ</span>
                      <input 
                        type="radio" 
                        name="dep_opt"
                        checked={depositOption === 'FULL_PAYMENT'}
                        onChange={() => setDepositOption('FULL_PAYMENT')}
                        className="w-4 h-4 accent-[#725b38]"
                      />
                    </div>
                    <div className="font-mono text-base font-bold text-[#725b38] mt-2">
                      {formatVND(totalAmount)}
                    </div>
                    <span className="text-[10px] text-slate-400">Nhận phòng nhanh Express</span>
                  </label>
                </div>
              </div>

              {/* Methods Header */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <h2 className="font-serif text-lg font-bold text-slate-900">Phương Thức Thanh Toán</h2>
                <span className="text-[11px] font-bold text-[#725b38] uppercase tracking-wider bg-[#eff4ff] px-2.5 py-1 rounded">
                  Được Khuyên Dùng
                </span>
              </div>

              {/* Method Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center border ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
                  <span className="text-xs font-bold">VietQR Tức Thì</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center border ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">credit_card</span>
                  <span className="text-xs font-bold">Thẻ Quốc Tế</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('DIGITAL_WALLET')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center border ${
                    paymentMethod === 'DIGITAL_WALLET'
                      ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                  <span className="text-xs font-bold">Ví Điện Tử</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('POINTS')}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center border ${
                    paymentMethod === 'POINTS'
                      ? 'bg-[#131b2e] text-white border-[#131b2e] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">loyalty</span>
                  <span className="text-xs font-bold">Horizon Club</span>
                </button>
              </div>

              {/* METHOD TAB 1: VIETQR (BANK TRANSFER) */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="flex flex-col gap-4 pt-1 animate-fade-in">
                  <div className="bg-[#eff4ff] p-5 rounded-2xl flex flex-col sm:flex-row gap-6 items-center border border-blue-100">
                    <div className="bg-white p-3 rounded-xl shadow-xs flex flex-col items-center shrink-0 border border-slate-200">
                      <div className="w-44 h-44 bg-white flex flex-col items-center justify-center relative p-1 rounded-lg">
                        <img 
                          src={`https://img.vietqr.io/image/VCB-0071000998899-compact2.png?amount=${finalPayable}&addInfo=${encodeURIComponent(bookingCodeStr)}&accountName=${encodeURIComponent('CONG TY CP RESORT GRAND HORIZON')}`}
                          alt="VietQR code"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0071000998899|CONG%20TY%20CP%20RESORT%20GRAND%20HORIZON|${finalPayable}|${bookingCodeStr}`;
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 font-semibold">
                        Quét bằng app ngân hàng 24/7
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 w-full text-xs">
                      <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/50">
                        <span className="text-slate-500 font-medium">Ngân hàng thụ hưởng:</span>
                        <span className="font-bold text-slate-900">Vietcombank (Hội sở chính)</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/50">
                        <span className="text-slate-500 font-medium">Tên thụ hưởng:</span>
                        <span className="font-bold text-slate-900 text-right">CONG TY CP RESORT GRAND HORIZON</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/50">
                        <span className="text-slate-500 font-medium">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">0071000998899</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('0071000998899', 'acc')}
                            className="text-[#725b38] hover:text-[#584323] p-1 rounded transition-colors"
                            title="Sao chép số tài khoản"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
                          {copyFeedback.acc && <span className="text-[10px] text-emerald-600 font-bold">Đã chép!</span>}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/50">
                        <span className="text-slate-500 font-medium">Số tiền cọc thanh toán:</span>
                        <span className="font-bold text-sm text-[#725b38]">{formatVND(finalPayable)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-0.5">
                        <span className="text-slate-500 font-medium">Cú pháp chuyển khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-900">
                            {bookingCodeStr}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bookingCodeStr, 'code')}
                            className="text-[#725b38] hover:text-[#584323] p-1 rounded transition-colors"
                            title="Sao chép cú pháp"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
                          {copyFeedback.code && <span className="text-[10px] text-emerald-600 font-bold">Đã chép!</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-[#725b38] text-[18px]">bolt</span>
                    <span>Giao dịch VietQR được hệ thống AI khớp lệnh tự động trong 3 - 5 giây.</span>
                  </div>
                </div>
              )}

              {/* METHOD TAB 2: CREDIT CARD (THẺ QUỐC TẾ) */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="flex flex-col gap-4 pt-1 animate-fade-in">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-500">Chấp nhận thẻ quốc tế phát hành toàn cầu:</span>
                    <div className="flex items-center gap-1.5">
                      {['VISA', 'Mastercard', 'JCB', 'AMEX'].map(c => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-800 border border-slate-200">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Số thẻ tín dụng / ghi nợ *
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4111 1111 1111 1111"
                          maxLength={19}
                          className="w-full h-11 px-3 pl-10 rounded-lg bg-[#eff4ff] text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all border border-blue-100"
                        />
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[20px]">credit_card</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Hệ thống tự động kiểm tra Luhn checksum bảo mật</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hạn sử dụng (MM/YY) *
                        </label>
                        <input 
                          type="text"
                          value={expiryDate}
                          onChange={handleExpiryChange}
                          placeholder="12/28"
                          maxLength={5}
                          className="w-full h-11 px-3 rounded-lg bg-[#eff4ff] text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all border border-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mã bảo mật CVV/CVC *
                        </label>
                        <div className="relative">
                          <input 
                            type="password"
                            value={cvvCode}
                            onChange={(e) => setCvvCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full h-11 px-3 rounded-lg bg-[#eff4ff] text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all border border-blue-100"
                          />
                          <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-[18px]">help</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tên in trên mặt thẻ *
                      </label>
                      <input 
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN AN"
                        className="w-full h-11 px-3 rounded-lg bg-[#eff4ff] text-slate-900 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#725b38] focus:bg-white transition-all border border-blue-100"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#eff4ff] rounded-xl flex items-center gap-2.5 text-xs text-slate-600 border border-blue-100">
                    <span className="material-symbols-outlined text-[#725b38] text-[20px] shrink-0">security</span>
                    <span>Bảo vệ qua chuẩn PCI-DSS Level 1 &amp; 3D-Secure 2.0 kèm xác thực OTP từ ngân hàng.</span>
                  </div>
                </div>
              )}

              {/* METHOD TAB 3: DIGITAL WALLET */}
              {paymentMethod === 'DIGITAL_WALLET' && (
                <div className="flex flex-col gap-4 pt-1 animate-fade-in">
                  <p className="text-xs text-slate-600">Lựa chọn cổng thanh toán hoặc ví điện tử bạn muốn sử dụng:</p>
                  
                  {/* Selector Radio buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'MOMO', name: 'Ví MoMo', desc: 'Ứng dụng MoMo E-Wallet' },
                      { id: 'VNPAY', name: 'VNPAY-QR', desc: 'Cổng thanh toán quốc gia' },
                      { id: 'ZALOPAY', name: 'ZaloPay', desc: 'Ví ZaloPay hoặc Zalo App' }
                    ].map(w => (
                      <label 
                        key={w.id} 
                        className={`p-3.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-1.5 transition-all border ${
                          walletProvider === w.id 
                            ? 'bg-[#eff4ff] border-[#725b38] shadow-sm ring-1 ring-[#725b38]' 
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="wallet" 
                          checked={walletProvider === w.id}
                          onChange={() => setWalletProvider(w.id)}
                          className="accent-[#725b38] w-4 h-4" 
                        />
                        <span className="font-bold text-sm text-slate-900">{w.name}</span>
                        <span className="text-[11px] text-slate-500">{w.desc}</span>
                      </label>
                    ))}
                  </div>

                  {/* Chi Tiết Cổng & Mã QR Quét Tức Thì Cho Từng Ví */}
                  {walletProvider === 'MOMO' && (
                    <div className="bg-pink-50/50 p-5 rounded-2xl flex flex-col sm:flex-row gap-6 items-center border border-pink-200">
                      <div className="p-2.5 bg-gradient-to-b from-[#fce4ec] to-[#f8bbd0] rounded-2xl border-2 border-[#d82d8b] shadow-md flex flex-col items-center shrink-0 max-w-[200px]">
                        <img 
                          src="/momo-qr.png" 
                          alt="MoMo QR Code" 
                          className="w-44 h-auto rounded-xl object-contain shadow-xs"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901234567|MoMo%20Gateway|${finalPayable}|${bookingCodeStr}`;
                          }}
                        />
                        <span className="mt-1.5 text-[10px] font-bold text-[#a50064] uppercase tracking-wide">
                          Quét Bằng Ví MoMo
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 w-full text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-pink-100 text-[#a50064] font-bold text-xs self-start">
                          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                          CỔNG THANH TOÁN VÍ ĐIỆN TỬ MOMO GATEWAY
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-pink-200/60">
                          <span className="text-slate-500 font-medium">Chủ tài khoản thụ hưởng:</span>
                          <span className="font-bold text-slate-900 uppercase">NGUYEN XUAN THU TRANG</span>
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-pink-200/60">
                          <span className="text-slate-500 font-medium">Số tiền cọc MoMo:</span>
                          <span className="font-bold text-sm text-[#a50064]">{formatVND(finalPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-slate-500 font-medium">Lời nhắn / Mã đơn:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-pink-100 px-2.5 py-1 rounded text-[#a50064] tracking-wider">
                              {bookingCodeStr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bookingCodeStr, 'code')}
                              className="text-[#a50064] hover:text-pink-900 p-1 rounded transition-colors"
                              title="Sao chép mã đơn"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            {copyFeedback.code && <span className="text-[10px] text-pink-700 font-bold">Đã chép!</span>}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Mở App MoMo quét mã QR trên để chuyển cọc trực tiếp, sau đó bấm <strong>"XÁC NHẬN &amp; ĐÃ THANH TOÁN TIỀN CỌC"</strong> bên dưới.
                        </p>
                      </div>
                    </div>
                  )}

                  {walletProvider === 'VNPAY' && (
                    <div className="bg-blue-50/50 p-5 rounded-2xl flex flex-col sm:flex-row gap-6 items-center border border-blue-200">
                      <div className="bg-white p-2.5 rounded-2xl border-2 border-blue-600 shadow-md flex flex-col items-center shrink-0">
                        <img 
                          src={`https://img.vietqr.io/image/VCB-999908048888-compact2.png?amount=${finalPayable}&addInfo=${encodeURIComponent(bookingCodeStr)}&accountName=${encodeURIComponent('VNPAY - GRAND HORIZON')}`}
                          alt="VNPAY QR Gateway" 
                          className="w-40 h-40 rounded-xl object-contain shadow-xs"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=VNPAY|${finalPayable}|${bookingCodeStr}`;
                          }}
                        />
                        <span className="mt-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                          VNPAY-QR 30+ Ứng Dụng
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 w-full text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 font-bold text-xs self-start">
                          <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                          CỔNG THANH TOÁN QUỐC GIA VNPAY-QR
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/60">
                          <span className="text-slate-500 font-medium">Đơn vị chấp nhận VNPAY:</span>
                          <span className="font-bold text-slate-900">GRAND HORIZON RESORT &amp; SUITES</span>
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-blue-200/60">
                          <span className="text-slate-500 font-medium">Số tiền cọc thanh toán:</span>
                          <span className="font-bold text-sm text-blue-700">{formatVND(finalPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-slate-500 font-medium">Mã giao dịch / Cú pháp:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-blue-100 px-2.5 py-1 rounded text-blue-700 tracking-wider">
                              {bookingCodeStr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bookingCodeStr, 'code')}
                              className="text-blue-700 hover:text-blue-900 p-1 rounded transition-colors"
                              title="Sao chép mã"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            {copyFeedback.code && <span className="text-[10px] text-blue-700 font-bold">Đã chép!</span>}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Hỗ trợ quét qua ứng dụng VNPAY, Viettel Money hoặc hơn 30 ứng dụng Mobile Banking trên toàn quốc.
                        </p>
                      </div>
                    </div>
                  )}

                  {walletProvider === 'ZALOPAY' && (
                    <div className="bg-cyan-50/50 p-5 rounded-2xl flex flex-col sm:flex-row gap-6 items-center border border-cyan-200">
                      <div className="bg-white p-2.5 rounded-2xl border-2 border-cyan-600 shadow-md flex flex-col items-center shrink-0">
                        <img 
                          src={`https://img.vietqr.io/image/MB-090123456789-compact2.png?amount=${finalPayable}&addInfo=${encodeURIComponent(bookingCodeStr)}&accountName=${encodeURIComponent('ZALOPAY GRAND HORIZON')}`}
                          alt="ZaloPay QR" 
                          className="w-40 h-40 rounded-xl object-contain shadow-xs"
                        />
                        <span className="mt-1.5 text-[10px] font-bold text-cyan-800 uppercase tracking-wide">
                          Quét Bằng Ví ZaloPay
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 w-full text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-800 font-bold text-xs self-start">
                          <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                          CỔNG THANH TOÁN TRỰC TUYẾN ZALOPAY
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-cyan-200/60">
                          <span className="text-slate-500 font-medium">Đối tác tiếp nhận:</span>
                          <span className="font-bold text-slate-900">ZALOPAY - GRAND HORIZON</span>
                        </div>
                        <div className="flex justify-between items-center pb-1.5 border-b border-cyan-200/60">
                          <span className="text-slate-500 font-medium">Số tiền cọc:</span>
                          <span className="font-bold text-sm text-cyan-800">{formatVND(finalPayable)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-slate-500 font-medium">Cú pháp thanh toán:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-cyan-100 px-2.5 py-1 rounded text-cyan-800 tracking-wider">
                              {bookingCodeStr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(bookingCodeStr, 'code')}
                              className="text-cyan-800 hover:text-cyan-900 p-1 rounded transition-colors"
                              title="Sao chép cú pháp"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            {copyFeedback.code && <span className="text-[10px] text-cyan-800 font-bold">Đã chép!</span>}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Mở Zalo hoặc ứng dụng ZaloPay để thực hiện giao dịch trong vòng 15 phút giữ phòng.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD TAB 4: HORIZON CLUB POINTS */}
              {paymentMethod === 'POINTS' && (
                <div className="flex flex-col gap-3 pt-1 animate-fade-in">
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-2 border border-blue-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Số dư điểm Horizon Club của bạn:</span>
                      <span className="font-bold text-[#725b38] text-sm">12.450 Điểm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Giá trị quy đổi tối đa:</span>
                      <span className="font-bold text-slate-900 text-sm">1.245.000 ₫</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200/50">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="w-4 h-4 accent-[#725b38] rounded cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800">
                          Sử dụng toàn bộ 12.450 điểm để giảm trừ tiền cọc ngay (-1.245.000 ₫)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Policy agreement checkbox & Action CTA */}
              <div className="pt-3 flex flex-col gap-3 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={isPolicyAgreed}
                    onChange={(e) => setIsPolicyAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#725b38] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Tôi đồng ý với các <strong className="text-[#725b38] hover:underline">Quy định hủy phòng nghỉ dưỡng</strong>, 
                    cam kết chính sách bảo mật thông tin cá nhân và ủy quyền xử lý giao dịch tiền cọc theo tiêu chuẩn khu nghỉ dưỡng Grand Horizon.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting || timerSeconds <= 0}
                  className="w-full py-4 px-4 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Hệ thống đang đối soát dữ liệu ngân hàng...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[22px]">verified</span>
                      <span>Xác Nhận &amp; Đã Thanh Toán Tiền Cọc ({formatVND(finalPayable)})</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-3 border border-blue-100/60">
                <span className="material-symbols-outlined text-[#725b38] text-[26px]">assignment_turned_in</span>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-900">Hủy Miễn Phí</span>
                  <span className="text-[11px] text-slate-500">Trước 48h nhận phòng</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-3 border border-blue-100/60">
                <span className="material-symbols-outlined text-[#725b38] text-[26px]">encrypted</span>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-900">Bảo Mật Tuyệt Đối</span>
                  <span className="text-[11px] text-slate-500">Mã hóa chuẩn PCI-DSS</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-3 border border-blue-100/60">
                <span className="material-symbols-outlined text-[#725b38] text-[26px]">room_service</span>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-900">Quản Gia 24/7</span>
                  <span className="text-[11px] text-slate-500">Hỗ trợ đưa đón sân bay</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Summary Card (5 cols) */}
          <div className="lg:col-span-5 sticky top-28">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              
              {/* Villa Hero Preview */}
              <div className="relative h-52 w-full bg-slate-900">
                <img 
                  src={villaImg} 
                  alt={villaName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                  <div className="flex flex-col text-white">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#fedeb2]">
                      Biệt Thự Hướng Biển Sang Trọng
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white">
                      {villaName}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Booking Specs */}
              <div className="p-6 flex flex-col gap-4">
                
                {/* Code & Status */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mã Đặt Chỗ</span>
                    <span className="font-mono text-lg font-bold text-[#725b38]">{bookingCodeStr}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Đang chờ đặt cọc
                  </span>
                </div>

                {/* Stay Info */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#eff4ff] rounded-xl text-xs border border-blue-100/60">
                  <div className="flex flex-col">
                    <span className="text-slate-500">Nhận phòng</span>
                    <span className="font-bold text-slate-900">14:00 • {formatDisplayDate(booking?.checkInDate) || '15/11/2024'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500">Trả phòng</span>
                    <span className="font-bold text-slate-900">12:00 • {formatDisplayDate(booking?.checkOutDate) || '18/11/2024'}</span>
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-slate-500">Thời gian lưu trú</span>
                    <span className="font-bold text-slate-900">{booking?.numberOfNights || 3} Đêm</span>
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-slate-500">Số lượng khách</span>
                    <span className="font-bold text-slate-900">{booking?.adults || 2} Người lớn</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex flex-col gap-2 pt-1 text-xs text-slate-600 border-b border-slate-100 pb-3">
                  <div className="flex justify-between">
                    <span>Giá biệt thự ({booking?.numberOfNights || 3} đêm)</span>
                    <span className="font-semibold text-slate-900">{formatVND(booking?.roomSubtotal || 19500000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dịch vụ quản gia &amp; Ăn sáng buffet cao cấp</span>
                    <span className="font-semibold text-[#725b38]">Bao gồm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế GTGT (8%) &amp; Phí dịch vụ (5%)</span>
                    <span className="font-semibold text-slate-900">Đã tính đủ</span>
                  </div>
                  {usePoints && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Giảm trừ điểm Horizon Club</span>
                      <span>-{formatVND(pointsDiscount)}</span>
                    </div>
                  )}
                  <div className="pt-2 flex justify-between items-center text-sm border-t border-slate-100">
                    <span className="font-bold text-slate-900">Tổng Giá Trị Kỳ Nghỉ</span>
                    <span className="font-bold text-slate-900 text-base">{formatVND(totalAmount)}</span>
                  </div>
                </div>

                {/* Deposit Due Card */}
                <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-1 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-[#725b38]">
                      Tiền Đặt Cọc Cần Trả Ngay ({depositOption === 'DEPOSIT_20' ? '20%' : depositOption === 'DEPOSIT_50' ? '50%' : '100%'})
                    </span>
                    <span className="font-serif font-bold text-xl text-[#725b38]">
                      {formatVND(finalPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-blue-200/50">
                    <span>Thanh toán còn lại khi nhận phòng</span>
                    <span className="font-bold text-slate-900">{formatVND(remainingBalance)}</span>
                  </div>
                </div>

                {/* Concierge Hotline */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                  <span className="material-symbols-outlined text-[#725b38] text-[22px] shrink-0">headset_mic</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">Cần trợ giúp riêng cho việc đặt cọc?</span>
                    <span>Hotline Concierge 24/7: <a href="tel:19006868" className="font-bold text-[#725b38] hover:underline">1900 6868</a></span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Modal Thanh Toán Thành Công (Happy Case - TC02) */}
        {paymentSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative text-center space-y-4">
              
              {/* Nút Đóng X Close Modal */}
              <button
                type="button"
                onClick={() => setPaymentSuccess(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-xs"
                title="Đóng modal"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-slate-900">
                Thanh Toán Tiền Cọc Thành Công!
              </h3>

              <p className="text-xs sm:text-sm text-slate-600">
                Khoản thanh toán của quý khách đã được ghi nhận vào hệ thống. Đơn đặt phòng hiện đã chuyển sang trạng thái 
                <strong className="text-emerald-700 font-bold"> ĐÃ XÁC NHẬN (CONFIRMED)</strong>.
              </p>

              {/* Receipt Box */}
              <div className="p-4 rounded-xl bg-[#eff4ff] space-y-2 text-xs sm:text-sm text-left border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao dịch (Txn Code):</span>
                  <span className="font-mono font-bold text-slate-900">{paymentSuccess.transactionCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đặt chỗ:</span>
                  <span className="font-mono font-bold text-[#725b38]">{paymentSuccess.confirmationCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền đã cọc:</span>
                  <span className="font-bold text-emerald-700">{formatVND(paymentSuccess.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền còn lại:</span>
                  <span className="font-bold text-slate-900">{formatVND(paymentSuccess.remainingBalance)}</span>
                </div>
              </div>

              {/* QR Code Ticket */}
              {paymentSuccess.qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl max-w-[200px] mx-auto">
                  <img src={paymentSuccess.qrCodeUrl} alt="Booking QR Code" className="w-36 h-36 object-contain" />
                  <span className="text-[10px] text-slate-500 mt-1 font-semibold">QR Check-in tại quầy</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 bg-[#725b38] hover:bg-[#584323] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  Về Trang Chủ
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-5 py-3 bg-[#eff4ff] hover:bg-blue-100 text-[#725b38] hover:text-[#584323] font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-blue-200 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  <span>In Hóa Đơn Cọc</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem & In Hóa Đơn Tiền Cọc A4 / PDF Chuẩn 5 Sao */}
        <DepositInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          booking={booking}
          paymentSuccess={paymentSuccess || (booking ? {
            transactionCode: 'TXN-' + (booking.bookingId || Date.now().toString().slice(-6)),
            confirmationCode: booking.confirmationCode,
            amountPaid: booking.depositAmount || Math.round((booking.totalAmount || 0) * 0.2),
            remainingBalance: Math.max(0, (booking.totalAmount || 0) - (booking.depositAmount || Math.round((booking.totalAmount || 0) * 0.2))),
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${booking.confirmationCode}`,
            paymentDate: new Date()
          } : null)}
          paymentMethod={paymentMethod}
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
