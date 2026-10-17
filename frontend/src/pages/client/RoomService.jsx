import React, { useState } from 'react';
import AdminLayout from '../../components/admin/layout/AdminLayout';

const RoomService = () => {
  // FEAT-FNB-04 & FEAT-FNB-07 State
  const [stayId, setStayId] = useState(1);
  const [roomId, setRoomId] = useState(1);
  const [cartItems, setCartItems] = useState([
    { menuItemId: 2, name: 'Tôm Hùm Thượng Hạng', quantity: 1, unitPrice: 2010000, note: 'Không rắc mè' },
    { menuItemId: 6, name: 'Bánh Tiramisu Thượng Hạng', quantity: 1, unitPrice: 1320000, note: 'Ít đường' }
  ]);
  const [paymentMode, setPaymentMode] = useState('RoomInvoice'); // 'RoomInvoice' | 'PayNow'
  const [paymentMethod, setPaymentMethod] = useState(''); // 'Cash' | 'VNPay' | 'MoMo' | 'VietQR'
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);

  // State Modal QR Code thanh toán online
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalData, setQrModalData] = useState(null);

  const finalTotalAmount = Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 1.23);

  const handleOpenPaymentFlow = () => {
    setErrorMessage('');
    setSuccessMessage('');

    // TC01: Kiểm tra phòng
    if (!stayId || !roomId) {
      setErrorMessage('Vui lòng chọn phòng hợp lệ.');
      return;
    }

    // TC02: Kiểm tra món trong giỏ
    if (!cartItems || cartItems.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một món.');
      return;
    }

    // TC03: Kiểm tra số lượng
    for (const item of cartItems) {
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage('Số lượng không hợp lệ.');
        return;
      }
    }

    // TC04: Kiểm tra hình thức thanh toán
    if (!paymentMode) {
      setErrorMessage('Vui lòng chọn hình thức thanh toán.');
      return;
    }

    // PayNow phải chọn phương thức
    if (paymentMode === 'PayNow' && !paymentMethod) {
      setErrorMessage('Vui lòng chọn phương thức thanh toán.');
      return;
    }

    // Nếu chọn PayNow bằng cổng online (VNPay, MoMo, VietQR) -> Mở Modal quét QR trước
    if (paymentMode === 'PayNow' && ['VNPay', 'MoMo', 'VietQR'].includes(paymentMethod)) {
      const txnCode = 'TXN-FNB-' + Date.now().toString().slice(-6);
      setQrModalData({
        method: paymentMethod,
        amount: finalTotalAmount,
        transactionCode: txnCode,
        roomNumber: '804'
      });
      setShowQrModal(true);
      return;
    }

    // Nếu chọn RoomInvoice hoặc Tiền mặt -> Gửi quyết toán ngay
    executePaymentAPI();
  };

  const executePaymentAPI = async (isFailure = false) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      // Mock Token mặc định dành cho phiên test (Khách phòng 804 Arthur Dent) nếu chưa đăng nhập
      const MOCK_TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBnaC5jb20iLCJyb2xlIjoiQWRtaW4iLCJpYXQiOjE3OTE3OTE3MjAsImV4cCI6MTgyMzMyNzcyMH0.B3AGO9GF8MAXMi9Mf3FYcnjl8CWVhHBA_4xGbONiMaI';
      const token = localStorage.getItem('hotel_token') || MOCK_TEST_TOKEN;
      const authHeader = { 'Authorization': `Bearer ${token}` };

      // Bước 1: Tạo đơn Room Service (FEAT-FNB-04)
      const createRes = await fetch('http://localhost:5000/api/v1/fnb-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          stayId,
          roomId,
          items: cartItems.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            note: i.note || ''
          })),
          paymentMode
        })
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setErrorMessage(createData.message || 'Không thể tạo hoặc gửi đơn xuống bếp.');
        setIsSubmitting(false);
        return;
      }

      const orderId = createData.data?.orderId;
      setCreatedOrder(createData.data);

      // Bước 2: Xử lý hình thức thanh toán (FEAT-FNB-07)
      const payRes = await fetch(`http://localhost:5000/api/v1/fnb-orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          paymentMode,
          paymentMethod: paymentMode === 'PayNow' ? paymentMethod : undefined,
          simulateFailure: isFailure
        })
      });

      const payData = await payRes.json();
      if (!payRes.ok) {
        setErrorMessage(payData.message || 'Thanh toán không thành công. Đơn được giữ lại, vui lòng thử lại.');
      } else {
        setSuccessMessage(payData.message || 'Thanh toán thành công. Đơn đã được chuyển xuống bếp!');
      }
      setShowQrModal(false);
    } catch (error) {
      console.error('Room service submit error:', error);
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <AdminLayout>
      <div className="flex flex-col w-full -mx-space-lg -mt-16">
        {/* Top Command & Header Ribbon */}
        <div className="w-full bg-surface-container-lowest px-space-lg py-space-md shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-md px-space-lg">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="w-10 h-10 rounded-lg bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                <span className="material-symbols-outlined text-[24px]">room_service</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm text-admin-primary uppercase tracking-widest">MODULE 31 // KHU ẨM THỰC PHÒNG</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">TỰ ĐỘNG GHI NỢ PHÒNG (IRD)</span>
                </div>
                <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight truncate">
                  Đặt Món Tại Phòng &amp; Ghi Nợ Folio Tức Thời
                </h1>
              </div>
            </div>
            {/* Live Terminal Status Strip */}
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-xl">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-admin-primary-container shadow-sm animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-surface font-bold">KẾT NỐI BẾP TRUNG TÂM</span>
              </div>
              <span className="h-4 w-px bg-outline-variant mx-space-xs"></span>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                Cổng <span className="font-semibold text-on-surface">Micros Simphony v4.2</span>
              </div>
              <span className="h-4 w-px bg-outline-variant mx-space-xs"></span>
              <div className="flex items-center gap-space-xs text-admin-primary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>100ms</span>
              </div>
            </div>
          </div>
        </div>
        {/* Primary 3-Column Console Canvas */}
        <div className="w-full px-space-lg py-space-lg">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start px-space-lg">
            {/* ========================================================================= */}
            {/* CỘT 1: HỒ SƠ KHÁCH IN-HOUSE & THÔNG SỐ GIAO MÓN (28% -> Col span 3 or 4) */}
            {/* ========================================================================= */}
            <div className="xl:col-span-3 space-y-space-md">
              {/* Thẻ Khách Hàng Lưu Trú */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Hồ sơ khách In-House</span>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">Tháp B • Tầng 8</span>
                </div>
                <div className="flex items-start gap-space-md pt-space-xs">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-admin-primary flex-shrink-0 shadow-inner">
                    <span className="font-headline-lg text-headline-sm font-bold">804</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-lg text-headline-sm text-on-surface font-bold truncate">Arthur Dent</span>
                    <div className="flex items-center gap-space-xs mt-0.5">
                      <span className="px-space-xs py-0.2 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm font-semibold">
                        Silver Resident
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">#GH-2025-88219</span>
                    </div>
                  </div>
                </div>
                {/* Thông tin hạn mức & Tài chính */}
                <div className="bg-surface-container-low rounded-lg p-space-md space-y-space-xs">
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">credit_card</span>
                      Visa Ký Quỹ
                    </span>
                    <span className="font-semibold text-on-surface">**** 4092</span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">Hạn mức khả dụng</span>
                    <span className="font-bold text-admin-primary">30.000.000 đ</span>
                  </div>
                  <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-admin-primary h-full rounded-full" style={{ width: '22%' }}></div>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-label-sm text-label-sm text-outline">Đã tiêu: 6.600.000 đ</span>
                    <span className="font-label-sm text-label-sm text-outline">Quyền ghi nợ: Mở</span>
                  </div>
                </div>
                {/* Cảnh báo Y tế & Dị ứng nghiêm ngặt */}
                <div className="bg-error-container/30 rounded-lg p-space-md space-y-space-xs">
                  <div className="flex items-center gap-space-xs text-error font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    CẢNH BÁO DỊ ỨNG THỰC PHẨM
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="px-space-xs py-0.5 rounded bg-error/15 text-error font-label-sm text-label-sm font-semibold">
                      Giáp xác / Tôm cua (Shellfish)
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-error/15 text-error font-label-sm text-label-sm font-semibold">
                      Hạt mè (Sesame seed)
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant pt-1 leading-snug">
                    • Bếp trưởng cần ký xác nhận miễn nhiễm chéo trước khi đóng gói ra xe đẩy.
                  </p>
                </div>
              </div>
              {/* Thông số giao món & Setup bàn */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Thông Số Giao Hàng</span>
                  <span className="material-symbols-outlined text-admin-primary text-[18px]">nest_clock_farsight_analog</span>
                </div>
                {/* Khung giờ giao */}
                <div className="space-y-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Thời gian giao món</label>
                  <div className="grid grid-cols-2 gap-space-xs">
                    <button className="py-space-xs px-space-sm rounded-lg bg-admin-primary-container text-on-admin-primary-container font-label-sm text-label-sm text-center font-bold shadow-sm" type="button">
                      Ngay tức thì (25-35p)
                    </button>
                    <button className="py-space-xs px-space-sm rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm text-center transition-colors" type="button">
                      Hẹn giờ: 19:30
                    </button>
                  </div>
                </div>
                {/* Hình thức dọn bàn */}
                <div className="space-y-space-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Hình thức phục vụ</label>
                  <div className="grid grid-cols-2 gap-space-xs">
                    <div className="p-space-xs bg-admin-primary/10 rounded-lg text-admin-primary flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                      <div className="flex flex-col text-left">
                        <span className="font-label-sm text-label-sm font-bold">Bàn xe đẩy</span>
                        <span className="text-[10px] text-on-surface-variant">Khăn trắng 5 sao</span>
                      </div>
                    </div>
                    <div className="p-space-xs bg-surface-container rounded-lg text-on-surface-variant flex items-center gap-space-xs opacity-75">
                      <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      <div className="flex flex-col text-left">
                        <span className="font-label-sm text-label-sm font-semibold">Khay tại cửa</span>
                        <span className="text-[10px] text-on-surface-variant">Không tiếp xúc</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Số lượng khách & Ghi chú quản gia */}
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Số lượng khách dùng</span>
                    <div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-1 rounded-lg">
                      <button className="text-on-surface-variant hover:text-admin-primary font-bold">-</button>
                      <span className="font-label-md text-label-md text-on-surface font-bold px-1">02</span>
                      <button className="text-on-surface-variant hover:text-admin-primary font-bold">+</button>
                    </div>
                  </div>
                </div>
                <div className="pt-space-xs space-y-1">
                  <span className="font-label-sm text-label-sm text-outline">Ghi chú điều phối tiền sảnh</span>
                  <div className="bg-surface-container-low p-space-sm rounded-lg text-body-sm font-body-sm text-on-surface">
                    • Chuẩn bị 2 ly pha lê Bordeaux cao cấp.<br />
                    • Tuyệt đối không dùng hạt mè rắc bánh mì và salad.
                  </div>
                </div>
              </div>
            </div>
            {/* ========================================================================= */}
            {/* CỘT 2: DANH MỤC THỰC ĐƠN & BẢNG MODIFIERS (44% -> Col span 5 or 6)       */}
            {/* ========================================================================= */}
            <div className="xl:col-span-5 space-y-space-md">
              {/* Thanh Tìm Kiếm Món & Phân Loại Thực Đơn */}
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-md">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">search</span>
                  <input className="w-full bg-surface-container-low rounded-lg pl-10 pr-space-md py-2 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none" placeholder="Tìm kiếm món trong thực đơn Room Service (Ví dụ: Cá tuyết, Bò Wagyu...)" type="text" />
                </div>
                {/* Phân loại Tabs */}
                <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
                  <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
                    Phổ Biến
                  </button>
                  <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
                    Khai Vị
                  </button>
                  <button className="px-space-md py-1.5 rounded-lg bg-admin-primary text-on-admin-primary font-label-sm text-label-sm whitespace-nowrap shadow-sm">
                    Món Chính &amp; Nướng
                  </button>
                  <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
                    Tráng Miệng
                  </button>
                  <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm whitespace-nowrap">
                    Vang &amp; Đồ Uống
                  </button>
                </div>
                {/* Bộ lọc chuyên sâu */}
                <div className="flex items-center justify-between pt-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-xs py-0.5 rounded-full bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">eco</span>
                      Ăn chay (Vegetarian)
                    </span>
                    <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      Không Gluten
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline">Hiển thị 6 / 42 món</span>
                </div>
              </div>
              {/* Lưới Danh Sách Món Ăn (Menu Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* Món 1: Cá Tuyết (Đang chọn kích hoạt) */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Gourmet Chilean sea bass pan-seared to golden perfection with lemon butter sauce and seasonal microgreens on luxury ceramic plate, five-star hotel cuisine style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1j5cHLdLdJb3iNQ8D5ECQu13rOW5IBKfFlx2NoPJEBLV-dKj7r3eVcX5U9Gh0QgqxgbFkJrpXY2ZkpsadODwjbJd1isKG_ksD8DBLOnAT9qgCrOaKLAeEGwatz-OCuyvU66AghTDJc9PKLu8QwVy3PosmLj1BSS6uWrks3Iq7O9FFXbQbCsmpc546CkLaf52W0GAEa6tJj2Fb0Yn2ZaSxDtOjv3CWBlxS92ohhbqpdJdQEARa2n08" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-admin-primary">
                      910.000 đ
                    </div>
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-admin-primary text-on-admin-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">Đang chọn</span>
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Cá Tuyết Áp Chảo Bơ Chanh</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Xốt kem bơ nụ bạch hoa, cà rốt non đút lò mật ong, măng tây giòn.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Cá biển</span>
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bơ sữa</span>
                      </div>
                      <span className="material-symbols-outlined text-admin-primary text-[20px]">check_circle</span>
                    </div>
                  </div>
                </div>
                {/* Món 2: Wagyu Úc */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Australian Wagyu steak medium rare sliced on dark slate board with roasted garlic and fresh rosemary sprig in atmospheric restaurant lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz3iHK7JoUjUw7BnBGW-gM96Xg4xvuKXL0XE3ODqkqv9-v7EnqHvaa4Iy8eRizncLLJQkvdLdTxzYvgsGTasRZUgQMBGuheQ9NI5vjWlKK_Je_Gajnft73wagibZQTCwy7F7ppl8b-Ew7E7AlLkOXsggJrkjo3haxDl_sYCoyEHPyOrG38kZ2TVR0Qk37AEO_V1UHLj_iNnhzUAhfajJqpfvvOaylse1L-__lGxYFJIvs9XrBcQW-_" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                      1.450.000 đ
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Bò Bít Tết Wagyu Úc Nướng Than</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Thăn ngoại MB7+, xốt tiêu đen Phú Quốc &amp; tỏi nướng nguyên tép.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Gluten</span>
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bò cao cấp</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Món 3: Risotto Nấm Truffle */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Creamy wild mushroom risotto with freshly shaved black truffles and grated parmesan in elegant white bowl, luxury gastronomy photography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ff2gYrl1C9dP-8TDycpd7gb_vhXC7PmMhR9CtQR6ni3fY3LTyM10BQmQyVGKOdRf_L8El2VXhFGv9KYV_UhxeIRMhcY_LRIJ01hITL6ii2gFnNBCoVes-fTPSz92BDf_n3GIgyrLPKvTCFdTOzJYt_LDF0Brn-A7y_MQ43q_A8l3pN1-ZEXyiEHH-bEK-muz9f-evZRRhjtzOZLTL6MHgpuHbmRbBncY95lozxLbRnmjhnSOrYlP" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                      520.000 đ
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded bg-admin-primary/20 backdrop-blur-sm text-admin-primary font-label-sm text-label-sm font-bold">Ăn chay</span>
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Cơm Ý Nấm Rừng Truffle Tươi</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Gạo Carnaroli, phô mai Parmigiano Reggiano 24 tháng ủ.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Nấm dại</span>
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bơ sữa</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-admin-primary-container text-on-admin-primary-container flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Món 4: Đĩa Thịt Nguội & Phô Mai */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Artisanal charcuterie board with prosciutto, salami, imported aged cheeses, figs, and grapes on rustic wooden platter" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFCztO64DZeo2faPfIcKzS_xJnLTH0dG5FNi_ZTemplMx9PCKSml_SDo7KSVcGUGFGHvZxYHc-wUgfz1IOFCdZ-nLb1uoqPuZOWmng0naEND9swvOjQkz6_6Lp9MzReMT-pUkdwdsLjfPr39H8Cw7ZiBoaDjoaOUAF94NCez1fh0hgihsryiBkDDw8KOyn62NDQyY5RMg5AVkC8MxDjEblp6J40KfSYhCw4L5ZDH62FqUVbkx54Xgd" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                      690.000 đ
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Tháp Thịt Nguội &amp; Phô Mai</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Đùi heo muối Jamon Iberico, phô mai Brie de Meaux, mật ong rừng.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Thịt nguội</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-admin-primary-container text-on-admin-primary-container flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Món 5: Bánh Socola Valrhona */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Warm chocolate lava cake oozing rich molten dark Valrhona ganache with Madagascar vanilla ice cream and gold leaf dusting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAx-WmPEV4LlnVeAh8_AlEnnn-UtoI8exCwGiWy_5DjTVe5rIxNN_HtvwceriNUdSu8LT9jrSWrHeDaiWID86_eWJ28IoEaY7oDeS7S7J_oEEgLosUcKxXRwZnccYRugD4d5ew66Bg17_-T59vmEuP9tllfneSKQngdUaFgYKwVg2VGz69tVfdBp8eZMJAJDsqiXfLfANUm_WeZPOxanKfWOV7wJSrmsnh9axhPUtmHLCdclh9LV0iI" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                      390.000 đ
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Bánh Socola Valrhona Núi Lửa</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Socola 70% chảy, kem vani hạt Madagascar, vụn bánh quy bơ.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Tráng miệng</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Món 6: Vang Grand Cru */}
                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-all cursor-pointer">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Prestige Grand Cru Chateau red wine bottle next to crystal wine glasses in luxurious cellar background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZJVKTGxJI-oB0VisQV5wVW958FRVqmSU0fNNRGYGQcKbYi8C4QCvVsdD9UIbAvjKotk0ApEFzfyKcxBt4E5jdjySf8wLo0fwNiodfBfyvNwsFn0aZKQKYPdCqyTabDpi9z1MjcX3WGRLiDsXrVM3u-1pLLsxsvfRH10joK5g7BtVTiwGUA4afsaPUTUrz6UONgtRut-aWhkA7VbMex2h9muiv0NcCz2ytm2YfnNApcExQxEnsYrqE" />
                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-on-surface">
                      7.800.000 đ
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Tủ Sommelier
                      </span>
                    </div>
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">Château Margaux Premier Cru</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">Niên vụ 2015, phục vụ tại nhiệt độ chuẩn 16°C với bình decanter pha lê.</p>
                    </div>
                    <div className="flex items-center justify-between pt-space-xs">
                      <div className="flex gap-1">
                        <span className="px-1 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">Bordeaux</span>
                      </div>
                      <button className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-admin-primary hover:text-on-admin-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* BẢNG TÙY CHỈNH MODIFIERS MATRIX CHO MÓN ĐANG CHỌN */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-2 h-5 bg-admin-primary rounded-full"></span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Tùy Chỉnh Món: Cá Tuyết Áp Chảo Bơ Chanh (910.000 đ)
                    </h3>
                  </div>
                  <span className="font-label-sm text-label-sm text-admin-primary font-bold">Bắt buộc chọn 1 ăn kèm</span>
                </div>
                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                  {/* Món Ăn Kèm (Side selection) */}
                  <div className="space-y-space-xs">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Món Ăn Kèm (Chọn 1)</span>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between p-space-xs bg-surface-container-low rounded-lg cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input defaultChecked className="text-admin-primary focus:ring-0" name="side_choice" type="radio" />
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">Khoai tây nghiền Truffle</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
                      </label>
                      <label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input className="text-admin-primary" name="side_choice" type="radio" />
                          <span className="font-body-sm text-body-sm text-on-surface">Măng tây áp chảo tỏi</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
                      </label>
                      <label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input className="text-admin-primary" name="side_choice" type="radio" />
                          <span className="font-body-sm text-body-sm text-on-surface">Bánh mì men chua ủ thủ công</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
                      </label>
                    </div>
                  </div>
                  {/* Thêm Nguyên Liệu Thượng Hạng (Upsell) */}
                  <div className="space-y-space-xs">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Nâng Cấp Cao Cấp (Tùy chọn)</span>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between p-space-xs bg-admin-primary/5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input defaultChecked className="rounded text-admin-primary focus:ring-0" type="checkbox" />
                          <span className="font-body-sm text-body-sm text-on-surface font-medium">Nấm truffle đen cạo tươi (3g)</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-admin-primary font-bold">+250.000 đ</span>
                      </label>
                      <label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input className="rounded text-admin-primary" type="checkbox" />
                          <span className="font-body-sm text-body-sm text-on-surface">Thêm sốt bơ nụ bạch hoa riêng</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">+45.000 đ</span>
                      </label>
                      <label className="flex items-center justify-between p-space-xs bg-surface-container-lowest rounded-lg hover:bg-surface-container-low cursor-pointer">
                        <div className="flex items-center gap-space-xs">
                          <input className="rounded text-admin-primary" type="checkbox" />
                          <span className="font-body-sm text-body-sm text-on-surface">Bọc màng bạc giữ nhiệt cực đại</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">+0 đ</span>
                      </label>
                    </div>
                  </div>
                </div>
                {/* Nút Cập Nhật Món Vào Hóa Đơn */}
                <div className="pt-space-xs flex justify-end gap-space-sm">
                  <button className="px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors">
                    Hủy thay đổi
                  </button>
                  <button className="px-space-lg py-space-xs rounded-lg bg-admin-primary text-on-admin-primary font-label-md text-label-md flex items-center gap-space-xs shadow-sm hover:brightness-105 transition-all">
                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                    Lưu &amp; Cập Nhật Vào Phiếu IRD
                  </button>
                </div>
              </div>
            </div>
            {/* ========================================================================= */}
            {/* CỘT 3: PHIẾU GỌI MÓN (TICKET #IRD-4092) & QUYẾT TOÁN GHI NỢ (28% -> Col 4) */}
            {/* ========================================================================= */}
            <div className="xl:col-span-4 space-y-space-md">
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md space-y-space-md">
                {/* Header Ticket */}
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Phiếu Gọi Món</span>
                      <span className="font-label-sm text-label-sm text-admin-primary font-semibold">#IRD-4092</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Phòng 804 • NV: T. Marco • Lúc: 19:12</span>
                  </div>
                  <span className="px-space-sm py-1 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-bold">
                    Bản Nháp Mở
                  </span>
                </div>
                {/* Danh sách món gọi */}
                <div className="space-y-space-sm pt-space-xs max-h-72 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-space-xs">
                          <span className="font-label-md text-label-md text-admin-primary font-bold">{item.quantity}x</span>
                          <div>
                            <span className="font-label-md text-label-md text-on-surface font-semibold">{item.name}</span>
                            <div className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                              {item.note ? `• ${item.note}` : '• Phục vụ tiêu chuẩn'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-label-md text-label-md font-bold text-on-surface">
                            {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          <button 
                            type="button"
                            onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                            className="text-outline hover:text-error transition-colors mt-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cartItems.length === 0 && (
                    <div className="text-center py-4 text-xs text-outline italic">
                      Chưa có món nào trong phiếu gọi.
                    </div>
                  )}
                </div>

                {/* Chi tiết tài chính & Phụ phí dịch vụ phòng */}
                <div className="bg-surface-container rounded-xl p-space-md space-y-space-xs">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">Tổng tiền thực phẩm &amp; đồ uống:</span>
                    <span className="font-semibold text-on-surface">
                      {cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">Phụ phí phục vụ tại phòng (15% IRD):</span>
                    <span className="font-semibold text-on-surface">
                      {Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 0.15).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="text-on-surface-variant">Thuế VAT (8%):</span>
                    <span className="font-semibold text-on-surface">
                      {Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 0.08).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="w-full h-px bg-outline-variant my-space-xs"></div>
                  <div className="flex justify-between items-baseline pt-1">
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Tổng Thanh Toán Cuối</span>
                    </div>
                    <span className="font-headline-lg text-headline-sm text-admin-primary font-bold tracking-tight">
                      {Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 1.23).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* FEAT-FNB-07 (A4.7): Phương thức quyết toán */}
                <div className="space-y-space-sm pt-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-bold">Hình thức thanh toán (A4.7)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-admin-primary/10 text-admin-primary font-semibold">Bắt buộc</span>
                  </div>

                  {/* Lựa chọn 1: RoomInvoice */}
                  <label 
                    onClick={() => { setPaymentMode('RoomInvoice'); setPaymentMethod(''); }}
                    className={`flex items-start gap-space-sm p-space-sm rounded-xl cursor-pointer transition-all border ${
                      paymentMode === 'RoomInvoice'
                        ? 'bg-admin-primary/10 border-admin-primary shadow-sm'
                        : 'bg-surface-container border-transparent hover:bg-surface-container-high'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="payment_mode" 
                      checked={paymentMode === 'RoomInvoice'} 
                      onChange={() => { setPaymentMode('RoomInvoice'); setPaymentMethod(''); }}
                      className="mt-1 text-admin-primary focus:ring-0" 
                    />
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-admin-primary">domain</span>
                        Gộp vào hóa đơn phòng (RoomInvoice)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                        Tạo folio charge liên kết Booking lưu trú (#FL-88031-C). Đơn giữ Pending gửi Bếp.
                      </span>
                    </div>
                  </label>

                  {/* Lựa chọn 2: PayNow */}
                  <div className={`p-space-sm rounded-xl transition-all border ${
                    paymentMode === 'PayNow'
                      ? 'bg-admin-primary/10 border-admin-primary shadow-sm'
                      : 'bg-surface-container border-transparent'
                  }`}>
                    <label 
                      onClick={() => setPaymentMode('PayNow')}
                      className="flex items-start gap-space-sm cursor-pointer"
                    >
                      <input 
                        type="radio" 
                        name="payment_mode" 
                        checked={paymentMode === 'PayNow'} 
                        onChange={() => setPaymentMode('PayNow')}
                        className="mt-1 text-admin-primary focus:ring-0" 
                      />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-admin-primary">payments</span>
                          Thanh toán ngay (PayNow)
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                          Cổng thanh toán online hoặc thu tiền mặt trực tiếp trước khi chuyển đơn.
                        </span>
                      </div>
                    </label>

                    {/* Danh sách cổng thanh toán PayNow */}
                    {paymentMode === 'PayNow' && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                        <span className="font-label-sm text-[11px] text-outline font-semibold uppercase tracking-wider block">
                          Chọn cổng thanh toán:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'VNPay', label: 'Cổng VNPAY-QR', icon: 'qr_code_scanner', color: 'text-blue-600' },
                            { id: 'MoMo', label: 'Ví MoMo', icon: 'account_balance_wallet', color: 'text-pink-600' },
                            { id: 'VietQR', label: 'VietQR Napas247', icon: 'qr_code_2', color: 'text-emerald-600' },
                            { id: 'Cash', label: 'Tiền mặt tại phòng', icon: 'attach_money', color: 'text-amber-600' }
                          ].map(pm => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setPaymentMethod(pm.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs font-semibold ${
                                paymentMethod === pm.id
                                  ? 'bg-surface-container-lowest text-admin-primary border-2 border-admin-primary shadow-sm'
                                  : 'bg-surface-container-lowest/70 text-on-surface border border-outline-variant hover:border-admin-primary/50'
                              }`}
                            >
                              <span className={`material-symbols-outlined text-[18px] ${pm.color}`}>{pm.icon}</span>
                              <span className="truncate">{pm.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Mô phỏng tình huống cổng thanh toán trả về thất bại (Negative test) */}
                        <label className="flex items-center gap-2 mt-2 pt-2 text-[11px] text-outline cursor-pointer hover:text-on-surface">
                          <input 
                            type="checkbox" 
                            checked={simulateFailure} 
                            onChange={(e) => setSimulateFailure(e.target.checked)}
                            className="rounded text-error focus:ring-0" 
                          />
                          <span>Mô phỏng: Cổng thanh toán báo lỗi (Negative Case TC07)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông báo lỗi / Thành công theo SPEC */}
                {errorMessage && (
                  <div className="p-space-sm bg-error-container/40 border border-error/30 rounded-xl flex items-start gap-2 text-error text-xs animate-shake">
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                    <span className="font-semibold leading-relaxed">{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-space-sm bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-emerald-800 text-xs">
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0">check_circle</span>
                    <span className="font-semibold leading-relaxed">{successMessage}</span>
                  </div>
                )}

                {/* Nút Thực Thi Nghiệp Vụ Chính */}
                <div className="space-y-space-xs pt-space-sm">
                  <button 
                    disabled={isSubmitting}
                    onClick={handleOpenPaymentFlow}
                    className="w-full py-3 px-space-md rounded-xl bg-admin-primary-container text-on-admin-primary-container font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-sm shadow-md hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                    type="button"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        Đang xử lý thanh toán...
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">
                          {paymentMode === 'PayNow' && paymentMethod !== 'Cash' ? 'qr_code_scanner' : 'send_and_archive'}
                        </span>
                        {paymentMode === 'RoomInvoice' 
                          ? 'XÁC NHẬN GỬI BẾP & GHI NỢ PHÒNG' 
                          : paymentMethod === 'Cash' 
                            ? 'XÁC NHẬN TRẢ TIỀN MẶT & GỬI BẾP'
                            : 'MỞ MÃ QR THANH TOÁN & GỬI BẾP'}
                      </>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-space-xs pt-1">
                    <button className="py-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors" type="button">
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      In Phiếu Bếp (KOT)
                    </button>
                    <button className="py-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors" type="button">
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Lưu Nháp Tạm
                    </button>
                  </div>
                </div>

                {/* Bảo mật & Xác thực kiểm toán */}
                <div className="text-center pt-space-xs">
                  <span className="font-body-sm text-[11px] text-outline">
                    Chứng từ ký nợ tuân theo chuẩn kế toán khách sạn USALI 11th Edition.
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QUÉT MÃ QR THANH TOÁN (PAYNOW) */}
      {showQrModal && qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant relative flex flex-col items-center text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Badge cổng thanh toán */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-xs uppercase tracking-wider text-admin-primary">
                CỔNG THANH TOÁN {qrModalData.method.toUpperCase()}
              </span>
            </div>

            <h3 className="font-serif text-xl font-bold text-on-surface mb-1">
              Quét Mã Để Thanh Toán
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Phòng 804 • Mã GD: <span className="font-mono font-semibold">{qrModalData.transactionCode}</span>
            </p>

            {/* Khung chứa mã QR Code chuẩn theo từng cổng thanh toán */}
            <div className="p-4 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-admin-primary/40 shadow-inner flex flex-col items-center mb-4 w-full">
              {(() => {
                const amount = qrModalData.amount;
                const memo = `FNB P804 ${qrModalData.transactionCode.slice(-6)}`;

                // 1. Trường hợp VÍ MOMO: Dùng trực tiếp ảnh QR MoMo thật của bạn
                if (qrModalData.method === 'MoMo') {
                  return (
                    <div className="w-full flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-pink-50 border border-pink-200 rounded-lg text-[#a50064] text-xs font-bold">
                        <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                        CỔNG THANH TOÁN VÍ ĐIỆN TỬ MOMO GATEWAY
                      </div>
                      
                      {/* Khung QR MoMo chính thức */}
                      <div className="p-2.5 bg-gradient-to-b from-[#fce4ec] to-[#f8bbd0] rounded-2xl border-2 border-[#d82d8b] shadow-lg flex flex-col items-center max-w-[280px]">
                        <img 
                          src="/momo-qr.png"
                          alt="MoMo QR Code - NGUYEN XUAN THU TRANG"
                          className="w-full h-auto object-contain rounded-xl shadow-sm"
                        />
                      </div>

                      <div className="mt-3 flex flex-col items-center gap-1 text-center">
                        <div className="flex items-center gap-1.5 font-bold text-[#a50064] text-xs">
                          <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                          Mở ứng dụng MoMo để quét mã QR thanh toán
                        </div>
                        <div className="text-xs text-on-surface">
                          Chủ tài khoản: <strong className="text-on-surface font-bold uppercase">NGUYEN XUAN THU TRANG</strong>
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          Nội dung chuyển: <strong className="text-on-surface font-semibold">{memo}</strong>
                        </span>
                      </div>
                    </div>
                  );
                }

                // 2. Trường hợp VNPAY-QR: Cổng VNPAY liên kết các ngân hàng
                if (qrModalData.method === 'VNPay') {
                  const BANK_ID = 'VCB'; // Vietcombank đối tác cổng VNPAY
                  const ACCOUNT_NO = '999908048888';
                  const ACCOUNT_NAME = 'VNPAY - GRAND HORIZON';
                  const vnpayQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

                  return (
                    <>
                      <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-bold">
                        <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                        CỔNG THANH TOÁN VNPAY-QR (VNPAY GATEWAY)
                      </div>
                      <img 
                        src={vnpayQrUrl}
                        alt="VNPAY QR Gateway"
                        className="w-56 h-auto rounded-xl object-contain shadow-sm border border-blue-200"
                      />
                      <div className="mt-3 flex flex-col items-center gap-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-blue-700">
                          <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                          Quét bằng ứng dụng VNPAY hoặc 30+ Mobile Banking
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          Mã hóa đơn VNPAY: <strong className="text-on-surface">{memo}</strong>
                        </span>
                      </div>
                    </>
                  );
                }

                // 3. Mặc định / VietQR Napas247:
                const BANK_ID = 'MB'; // MBBank
                const ACCOUNT_NO = '090123456789';
                const ACCOUNT_NAME = 'GRAND HORIZON HOTEL';
                const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

                return (
                  <>
                    <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold">
                      <span className="material-symbols-outlined text-[16px]">account_balance</span>
                      VIETQR NAPAS247 (LIÊN NGÂN HÀNG 24/7)
                    </div>
                    <img 
                      src={vietQrUrl}
                      alt="VietQR Napas247"
                      className="w-56 h-auto rounded-xl object-contain shadow-sm border border-emerald-200"
                    />
                    <div className="mt-3 flex flex-col items-center gap-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        Quét bằng App mọi ngân hàng tại Việt Nam
                      </div>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        Nội dung CK: <strong className="text-on-surface">{memo}</strong>
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>


            {/* Số tiền cần thanh toán */}
            <div className="w-full bg-surface-container-low rounded-xl p-3 mb-4 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant font-medium">Tổng tiền thanh toán:</span>
              <span className="font-headline-sm font-bold text-admin-primary text-xl tracking-tight">
                {qrModalData.amount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Chú thích kiểm thử quy trình */}
            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-4 text-[11px] text-amber-800 text-center">
              💡 <strong>Kiểm thử chức năng A4.7:</strong> Bạn có thể dùng App MoMo quét mã thật ở trên, hoặc bấm 1 trong 2 nút bên dưới để mô phỏng phản hồi từ Cổng Thanh Toán.
            </div>

            {/* Các nút hành động mô phỏng Cổng Thanh Toán */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex gap-2.5">
                {/* Nút mô phỏng thất bại TC07 */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executePaymentAPI(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Mô Phỏng Thất Bại (TC07)
                </button>

                {/* Nút xác nhận thành công TC06 */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executePaymentAPI(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-admin-primary-container text-on-admin-primary-container font-bold text-xs shadow hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Thanh Toán Thành Công (TC06)
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 text-xs font-semibold text-outline hover:text-on-surface transition-colors"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoomService;

