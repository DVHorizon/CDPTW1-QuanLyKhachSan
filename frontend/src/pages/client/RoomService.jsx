import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import GuestSidebar from '../../components/layout/GuestSidebar';
import GuestHeader from '../../components/layout/GuestHeader';
import { useAuth } from '../../context/AuthContext';

const RoomService = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Tự động nhận diện nếu điều hướng từ Đặt Bàn sang (?target=Table hoặc state.target === 'Table')
  const initialTarget = (searchParams.get('target') === 'Table' || location.state?.target === 'Table') ? 'Table' : 'Room';
  const [orderTarget, setOrderTarget] = useState(initialTarget);
  const [tableReservation, setTableReservation] = useState(null);
  const [tableReservations, setTableReservations] = useState([]);
  const [checkingTableRes, setCheckingTableRes] = useState(false);
  const [tableResChecked, setTableResChecked] = useState(false);

  // Hàm kiểm tra lượt đặt bàn của khách hàng
  const checkCustomerTableReservation = async () => {
    setCheckingTableRes(true);
    try {
      let savedUser = null;
      try {
        savedUser = JSON.parse(localStorage.getItem('hotel_user') || '{}');
      } catch {}

      const uid = user?.id || user?.UserId || user?.userId || savedUser?.id || savedUser?.UserId || savedUser?.userId;
      const phone = user?.phone || user?.Phone || savedUser?.phone || savedUser?.Phone;
      
      const params = new URLSearchParams();
      if (uid) params.append('userId', uid);
      if (phone) params.append('phone', phone);

      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/my-table-reservation?${params.toString()}`);
      const json = await res.json();
      if (json && json.success && json.hasReservation) {
        const list = json.reservations && json.reservations.length > 0 ? json.reservations : [json.data];
        setTableReservations(list);
        setTableReservation((prev) => {
          if (prev && list.some(r => r.tableId === prev.tableId)) {
            return list.find(r => r.tableId === prev.tableId);
          }
          return list[0];
        });
      } else {
        setTableReservations([]);
        setTableReservation(null);
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra lượt đặt bàn:', err);
      setTableReservations([]);
      setTableReservation(null);
    } finally {
      setCheckingTableRes(false);
      setTableResChecked(true);
    }
  };

  // Tự động chạy kiểm tra đặt bàn khi component mount hoặc user thay đổi
  useEffect(() => {
    checkCustomerTableReservation();
  }, [user]);

  // Nếu URL hoặc state có target=Table thì tự động chuyển sang tab 'Table'
  useEffect(() => {
    if (searchParams.get('target') === 'Table' || location.state?.target === 'Table') {
      setOrderTarget('Table');
      checkCustomerTableReservation();
    }
  }, [searchParams, location.state]);


  // FEAT-FNB-04 & FEAT-FNB-07 State
  const [activeStays, setActiveStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [stayId, setStayId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [paymentMode, setPaymentMode] = useState('RoomInvoice'); // 'RoomInvoice' | 'PayNow'
  const [paymentMethod, setPaymentMethod] = useState(''); // 'Cash' | 'VNPay' | 'MoMo' | 'VietQR'
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);

  // Ghi chú đơn hàng (FoodOrder.Note)
  const [orderNote, setOrderNote] = useState('');

  // Dynamic Database Menu State
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedSide, setSelectedSide] = useState('Mặc định');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customItemNote, setCustomItemNote] = useState('');


  // State Modal QR Code thanh toán online
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalData, setQrModalData] = useState(null);

  // Mobile Sidebar & Cart Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Fetch Active Stays / Rooms from Database
  useEffect(() => {
    const fetchActiveStays = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const uid = user?.id || user?.UserId || user?.userId;
        const queryParam = uid ? `?userId=${uid}&userOnly=true` : '';
        const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/active-stays${queryParam}`, { headers });
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          // Lọc danh sách phòng nếu là khách hàng cá nhân
          let staysList = json.data;
          if (uid) {
            const userStays = json.data.filter(s => String(s.userId) === String(uid));
            if (userStays.length > 0) {
              staysList = userStays;
            }
          }
          setActiveStays(staysList);
          
          if (staysList.length > 0) {
            const matched = uid ? staysList.find(s => String(s.userId) === String(uid)) : null;
            const defaultStay = matched || staysList[0];
            setSelectedStay(defaultStay);
            setStayId(defaultStay.stayId);
            setRoomId(defaultStay.roomId);
          } else {
            setSelectedStay(null);
            setStayId(null);
            setRoomId(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch active stays:', err);
      }
    };
    fetchActiveStays();
  }, [user]);

  // Fetch Categories from Database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/v1/menu-categories');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Menu Items from Database (Lấy toàn bộ thực đơn khả dụng để hiển thị trải dài theo danh mục)
  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoadingMenu(true);
      try {
        const url = 'http://localhost:5000/api/v1/menu-items?limit=200&availableOnly=true';
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          // Lọc chắc chắn chỉ hiển thị món Available, không bị xóa và còn đủ nguyên liệu
          const activeOnly = data.data.filter(item => item.Status === 'Available' && !item.IsDeleted);
          setMenuItems(activeOnly);
          if (!selectedMenuItem && activeOnly.length > 0) {
            setSelectedMenuItem(activeOnly[0]);
          }
        } else if (res.status === 404) {
          setMenuItems([]);
        }
      } catch (err) {
        console.error('Failed to fetch menu items:', err);
      } finally {
        setIsLoadingMenu(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Cart operations
  const handleQuickAddToCart = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedMenuItem(item);
    const existingIndex = cartItems.findIndex(ci => ci.menuItemId === item.MenuItemId);
    const priceNum = parseFloat(item.Price) || 0;

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          menuItemId: item.MenuItemId,
          name: item.ItemName,
          quantity: 1,
          unitPrice: priceNum,
          note: ''
        }
      ]);
    }
  };

  const handleUpdateItemQuantity = (idx, delta) => {
    const updated = [...cartItems];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      setCartItems(cartItems.filter((_, i) => i !== idx));
    } else {
      updated[idx].quantity = newQty;
      setCartItems(updated);
    }
  };

  const handleAddCustomizedItem = () => {
    if (!selectedMenuItem) return;
    const basePrice = parseFloat(selectedMenuItem.Price) || 0;
    
    // Calculate addon extra fees
    let addonFee = 0;
    if (selectedAddons.includes('truffle')) addonFee += 250000;
    if (selectedAddons.includes('extra_sauce')) addonFee += 45000;

    const unitPrice = basePrice + addonFee;

    const notesList = [];
    if (selectedSide && selectedSide !== 'Mặc định') {
      notesList.push(`Kèm: ${selectedSide}`);
    }
    if (selectedAddons.length > 0) {
      const addonLabels = [];
      if (selectedAddons.includes('truffle')) addonLabels.push('+Nấm Truffle đen');
      if (selectedAddons.includes('extra_sauce')) addonLabels.push('+Xốt riêng');
      if (selectedAddons.includes('foil_wrap')) addonLabels.push('+Bọc màng bạc');
      notesList.push(addonLabels.join(', '));
    }
    if (customItemNote.trim()) {
      notesList.push(customItemNote.trim());
    }

    const finalNote = notesList.join(' • ');

    setCartItems([
      ...cartItems,
      {
        menuItemId: selectedMenuItem.MenuItemId,
        name: selectedMenuItem.ItemName,
        quantity: 1,
        unitPrice,
        note: finalNote
      }
    ]);

    setSuccessMessage(`Đã thêm món "${selectedMenuItem.ItemName}" vào phiếu gọi món!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const finalTotalAmount = Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 1.23);


  const handleOpenPaymentFlow = () => {
    setErrorMessage('');
    setSuccessMessage('');

    // TC01: Kiểm tra mục tiêu đặt món (Bàn ăn hoặc Phòng lưu trú)
    if (orderTarget === 'Table') {
      if (!tableReservation) {
        setErrorMessage('Quý khách chưa có lượt đặt bàn nào trong ngày hôm nay. Vui lòng đặt bàn trước khi gọi món.');
        return;
      }
    } else {
      if (!stayId || !roomId) {
        setErrorMessage('Vui lòng chọn phòng lưu trú để phục vụ.');
        return;
      }
    }

    // TC02: Kiểm tra món trong giỏ
    if (!cartItems || cartItems.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một món ăn.');
      return;
    }

    // TC03: Kiểm tra số lượng
    for (const item of cartItems) {
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage('Số lượng món không hợp lệ.');
        return;
      }
    }

    // TC04: Kiểm tra hình thức thanh toán
    if (!paymentMode) {
      setErrorMessage('Vui lòng chọn hình thức thanh toán.');
      return;
    }

    // Nếu gọi tại Bàn và chọn RoomInvoice nhưng không có phòng lưu trú
    if (orderTarget === 'Table' && paymentMode === 'RoomInvoice' && !stayId) {
      setErrorMessage('Quý khách không có phòng lưu trú để ghi nợ phòng. Vui lòng chọn Thanh toán ngay (PayNow).');
      return;
    }

    // PayNow phải chọn phương thức
    if (paymentMode === 'PayNow' && !paymentMethod) {
      setErrorMessage('Vui lòng chọn phương thức thanh toán (Tiền mặt, VNPay, MoMo, VietQR).');
      return;
    }

    // Nếu chọn PayNow bằng cổng online (VNPay, MoMo, VietQR) -> Mở Modal quét QR trước
    if (paymentMode === 'PayNow' && ['VNPay', 'MoMo', 'VietQR'].includes(paymentMethod)) {
      const txnCode = 'TXN-FNB-' + Date.now().toString().slice(-6);
      setQrModalData({
        method: paymentMethod,
        amount: finalTotalAmount,
        transactionCode: txnCode,
        roomNumber: orderTarget === 'Table' ? (tableReservation?.tableNumber || 'Bàn ăn') : (selectedStay?.roomNumber || '804')
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
      const MOCK_VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBob3RlbGRvbWFpbi52biIsInJvbGUiOiJBZG1pbiIsInJvbGVJZCI6MSwiaWF0IjoxNzkyMzkxMjk4LCJleHAiOjE4MjM5MjcyOTh9.Ya1QBevHhciQaMKVZ2Nhbv39Vla5AcdxIfI5Dy4vXck';
      const token = localStorage.getItem('hotel_token') || MOCK_VALID_TOKEN;
      const authHeader = { 'Authorization': `Bearer ${token}` };

      // Bước 1: Tạo đơn F&B (hỗ trợ cả Room Service và Bàn Nhà Hàng)
      const createRes = await fetch('http://localhost:5000/api/v1/fnb-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          orderTarget,
          stayId: orderTarget === 'Room' ? stayId : (stayId || undefined),
          roomId: orderTarget === 'Room' ? roomId : (roomId || undefined),
          tableId: orderTarget === 'Table' ? tableReservation?.tableId : undefined,
          items: cartItems.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            note: i.note || ''
          })),
          userId: user?.id || user?.UserId || user?.userId || undefined,
          paymentMode,
          note: orderNote.trim() || undefined
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
        const destLabel = orderTarget === 'Table' ? (tableReservation?.tableNumber || 'Bàn ăn') : (`Phòng ${selectedStay?.roomNumber || '804'}`);
        setSuccessMessage(`Đặt món thành công! Đơn cho ${destLabel} đã được chuyển xuống bếp.`);
        setCartItems([]);
        setShowQrModal(false);
      }
    } catch (error) {
      console.error('Submit order error:', error);
      setErrorMessage('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f4fbf4] min-h-screen text-slate-800 font-sans antialiased">
      <GuestSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-72 transition-all">
        <GuestHeader onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
        <main className="relative pt-20 sm:pt-24 px-3 sm:px-8 pb-24 lg:pb-12 w-full max-w-[1600px] mx-auto">
          {/* Header Ribbon & Hồ Sơ Khách Hàng / Bàn Ăn ở phía trên */}
          <div className="w-full bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 mb-4 sm:mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">room_service</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block">
                    Dịch Vụ Phục Vụ Ẩm Thực
                  </span>
                  <h1 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">
                    Đặt Món Tận Phòng &amp; Bàn Ăn
                  </h1>
                </div>
              </div>

              {/* Bộ Chọn Hình Thức: Giao Phòng vs Bàn Ăn */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setOrderTarget('Room'); setErrorMessage(''); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${orderTarget === 'Room' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">room_service</span>
                    <span>Giao Tận Phòng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrderTarget('Table'); setErrorMessage(''); checkCustomerTableReservation(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${orderTarget === 'Table' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">restaurant</span>
                    <span>Gọi Món Tại Bàn</span>
                    {tableReservation && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Dải thông tin Khách hàng / Bàn ăn + Ghi chú cho Bếp */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-100 items-center">
              {/* Bên trái: Thông tin vị trí & Đối tượng nhận món */}
              <div className="md:col-span-5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 flex items-center gap-3.5">
                {orderTarget === "Table" ? (
                  tableReservation ? (
                    <>
                      <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-[24px]">table_restaurant</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{tableReservation.tableNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đã Đặt Bàn
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{tableReservation.location}</span>
                          <span>•</span>
                          <span>{tableReservation.guestCount} Khách</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">#{tableReservation.reservationId}</span>
                        </div>
                      </div>
                      {tableReservations.length > 1 && (
                        <select
                          value={tableReservation.tableId}
                          onChange={(e) => {
                            const found = tableReservations.find(r => String(r.tableId) === String(e.target.value));
                            if (found) setTableReservation(found);
                          }}
                          className="text-xs font-bold text-emerald-900 bg-white border border-emerald-300 rounded-lg px-2 py-1 shadow-sm focus:outline-none cursor-pointer"
                        >
                          {tableReservations.map((r) => (
                            <option key={r.reservationId} value={r.tableId}>
                              {r.tableNumber} - {r.location}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        <span>Quý khách chưa có lượt đặt bàn nào trong ngày hôm nay.</span>
                      </div>
                      <Link to="/dat-ban" className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                        <span>Đặt Bàn</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  )
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 shadow-inner font-bold text-sm">
                      #{selectedStay?.roomNumber || activeStays[0]?.roomNumber || "501"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 truncate">
                          {selectedStay?.guestName || activeStays[0]?.guestName || user?.fullName || "Khách Hàng"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {user?.tierName ? `Hạng ${user.tierName}` : "Hạng Standard"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Tầng {selectedStay?.floor || 5} • Tháp B • Stay #{selectedStay?.stayId || 100}
                      </div>
                    </div>
                    {activeStays.length > 1 && (
                      <select
                        value={stayId || ''}
                        onChange={(e) => {
                          const sId = Number(e.target.value);
                          const found = activeStays.find(s => s.stayId === sId);
                          if (found) {
                            setSelectedStay(found);
                            setStayId(found.stayId);
                            setRoomId(found.roomId);
                            setErrorMessage('');
                          }
                        }}
                        className="bg-white border border-emerald-300 rounded-lg px-2 py-1 font-bold text-emerald-800 text-xs shadow-sm focus:outline-none cursor-pointer"
                      >
                        {activeStays.map(s => (
                          <option key={s.stayId} value={s.stayId}>
                            Phòng #{s.roomNumber}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>

              {/* Bên phải: Ghi chú cho bếp 1 hàng ngang */}
              <div className="md:col-span-7 bg-slate-50/80 p-2.5 px-3 rounded-xl border border-slate-200/60 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-700 text-[20px] flex-shrink-0">edit_note</span>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ghi chú đơn hàng cho Bếp (VD: Không cay, mang sốt riêng, thêm dao nĩa...)"
                  className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline flex-shrink-0">
                  Chuyển trực tiếp sang màn hình Bếp (KDS)
                </span>
              </div>
            </div>
          </div>

          {/* Primary 2-Column Console Canvas: Cột Trái = Món Ăn (8 cols) | Cột Phải = Phiếu Gọi Món & Thanh Toán (4 cols) */}
          <div className="w-full">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* ========================================================================= */}
            {/* CỘT 1: DANH MỤC & MÓN ĂN (8 Cols) - CÓ THANH DANH MỤC TRẢI DÀI 1 HÀNG NGANG */}
            {/* ========================================================================= */}
            <div className="xl:col-span-8 space-y-4">
              {/* Tiêu đề & Thanh Danh Mục 1 Hàng Dài (Bấm để nhảy / lọc danh mục như Sơ đồ bàn ăn) */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-5 bg-emerald-600 rounded-full"></span>
                    <h3 className="font-bold text-base text-slate-800">
                      Thực Đơn Ẩm Thực 5 Sao
                    </h3>
                    <span className="text-xs text-slate-400 font-normal">
                      ({isLoadingMenu ? '...' : `${menuItems.length} món sẵn sàng`})
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                    <span className="material-symbols-outlined text-[14px]">restaurant_menu</span>
                    Menu Phục Vụ Trực Tiếp
                  </span>
                </div>

                {/* Thanh Danh Mục Phân Chia Trải Dài 1 Hàng Ngang (Tương tự sơ đồ bàn ăn) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId('ALL');
                      const el = document.getElementById('menu-scroll-container');
                      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      selectedCategoryId === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <span>Tất Cả Danh Mục</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategoryId === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {menuItems.length}
                    </span>
                  </button>

                  {/* Lấy danh sách tên danh mục thực tế từ menuItems */}
                  {(() => {
                    const catMap = {};
                    menuItems.forEach(item => {
                      const cName = item.MenuCategory?.CategoryName || 'Khác';
                      catMap[cName] = (catMap[cName] || 0) + 1;
                    });
                    return Object.entries(catMap).map(([cName, count]) => {
                      const isActive = selectedCategoryId === cName;
                      return (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cName);
                            const targetSection = document.getElementById(`cat-section-${cName}`);
                            if (targetSection) {
                              targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`}></span>
                          <span>{cName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Danh sách món ăn hiển thị trải dài gom theo từng danh mục */}
              {isLoadingMenu ? (
                <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col items-center justify-center text-outline gap-2 shadow-sm">
                  <span className="w-6 h-6 border-2 border-admin-primary border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs">Đang tải món ăn từ cơ sở dữ liệu...</span>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-outline shadow-sm space-y-2">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">restaurant</span>
                  <p className="text-sm font-semibold">Chưa có món ăn khả dụng</p>
                  <p className="text-xs text-on-surface-variant">Vui lòng quay lại sau hoặc liên hệ nhân viên phục vụ.</p>
                </div>
              ) : (
                <div id="menu-scroll-container" className="space-y-space-lg max-h-[720px] overflow-y-auto pr-1">
                  {(() => {
                    // Gom nhóm toàn bộ món ăn theo danh mục
                    const categoryGroups = {};
                    menuItems.forEach((item) => {
                      const catName = item.MenuCategory?.CategoryName || 'Món Đặc Sắc Khác';
                      if (!categoryGroups[catName]) {
                        categoryGroups[catName] = [];
                      }
                      categoryGroups[catName].push(item);
                    });

                    return Object.entries(categoryGroups).map(([catTitle, items]) => (
                      <div key={catTitle} id={`cat-section-${catTitle}`} className="space-y-space-xs scroll-mt-2">
                        {/* Tiêu đề phân khu danh mục */}
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md py-2 px-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                          <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            {catTitle}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 rounded-full bg-slate-100">
                            {items.length} món
                          </span>
                        </div>

                        {/* Lưới món của danh mục này (3 cột rộng rãi trên màn hình lớn vì giờ đã là 8-col) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                          {items.map((item) => {
                            const isSelected = selectedMenuItem?.MenuItemId === item.MenuItemId;
                            const inCartItem = cartItems.find(ci => ci.menuItemId === item.MenuItemId);
                            const formattedPrice = (parseFloat(item.Price) || 0).toLocaleString('vi-VN');
                            const imgUrl = item.ImageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400';

                            return (
                              <div 
                                key={item.MenuItemId}
                                onClick={() => setSelectedMenuItem(item)}
                                className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative group cursor-pointer transition-all border ${
                                  isSelected 
                                    ? 'ring-2 ring-admin-primary border-admin-primary shadow-md' 
                                    : 'border-transparent hover:border-admin-primary/40 hover:shadow-md'
                                }`}
                              >
                                <div className="relative h-32 w-full overflow-hidden bg-surface-container">
                                  <img 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    src={imgUrl} 
                                    alt={item.ItemName}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400';
                                    }}
                                  />
                                  <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold text-admin-primary shadow-sm">
                                    {formattedPrice} đ
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-2 left-2 flex gap-1">
                                      <span className="bg-admin-primary text-on-admin-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow">
                                        Đang chọn
                                      </span>
                                    </div>
                                  )}
                                  {item.ServingTime && (
                                    <div className="absolute bottom-2 left-2">
                                      <span className="bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        {item.ServingTime}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                                  <div>
                                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1">
                                      {item.ItemName}
                                    </h4>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                                      {item.Description || 'Món ăn cao cấp chuẩn bị bởi bếp trưởng Grand Horizon.'}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between pt-space-xs mt-2 border-t border-outline-variant/30">
                                    <div className="flex gap-1 flex-wrap">
                                      {item.KitchenStation && (
                                        <span className="px-1.5 py-0.5 rounded bg-admin-primary/10 text-[10px] text-admin-primary font-medium">
                                          {item.KitchenStation}
                                        </span>
                                      )}
                                      {item.Allergens && (
                                        <span className="px-1.5 py-0.5 rounded bg-error/10 text-[10px] text-error font-medium flex items-center gap-0.5" title={`Dị ứng: ${item.Allergens}`}>
                                          <span className="material-symbols-outlined text-[12px]">warning</span>
                                          {item.Allergens}
                                        </span>
                                      )}
                                    </div>

                                    {/* Nút Thêm Món / Hiển thị số lượng đã chọn */}
                                    <div className="flex items-center gap-1.5">
                                      {inCartItem && (
                                        <span className="text-xs font-bold text-admin-primary bg-admin-primary/10 px-1.5 py-0.5 rounded-full">
                                          {inCartItem.quantity}x
                                        </span>
                                      )}
                                      <button 
                                        type="button"
                                        onClick={(e) => handleQuickAddToCart(item, e)}
                                        title="Thêm vào giỏ hàng"
                                        className="w-8 h-8 rounded-full bg-admin-primary text-on-admin-primary flex items-center justify-center hover:brightness-110 active:scale-95 shadow-sm transition-all"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* BẢNG TÙY CHỈNH MODIFIERS MATRIX CHO MÓN ĐANG CHỌN */}
              {selectedMenuItem && (
                <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm space-y-space-md border border-outline-variant/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <span className="w-2 h-5 bg-admin-primary rounded-full"></span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Tùy Chỉnh Món: {selectedMenuItem.ItemName} ({(parseFloat(selectedMenuItem.Price) || 0).toLocaleString('vi-VN')} đ)
                      </h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-admin-primary font-bold">Tùy biến phục vụ</span>
                  </div>

                  {/* Cảnh báo dị ứng thực tế từ DB nếu món có khai báo Allergens */}
                  {selectedMenuItem.Allergens && (
                    <div className="bg-error/10 border border-error/20 rounded-lg p-space-xs flex items-center gap-space-xs text-error font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[18px]">warning</span>
                      <span><strong>Cảnh báo dị ứng từ bếp:</strong> Món này chứa thành phần {selectedMenuItem.Allergens}</span>
                    </div>
                  )}

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                    {/* Món Ăn Kèm (Side selection) */}
                    <div className="space-y-space-xs">
                      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Món Ăn Kèm (Chọn 1)</span>
                      <div className="space-y-1.5">
                        {[
                          { id: 'Khoai tây nghiền Truffle', label: 'Khoai tây nghiền Truffle', fee: '+0 đ' },
                          { id: 'Măng tây áp chảo tỏi', label: 'Măng tây áp chảo tỏi', fee: '+0 đ' },
                          { id: 'Bánh mì men chua ủ thủ công', label: 'Bánh mì men chua ủ thủ công', fee: '+0 đ' },
                          { id: 'Mặc định', label: 'Phục vụ theo set chuẩn của Bếp', fee: '+0 đ' }
                        ].map((side) => (
                          <label 
                            key={side.id} 
                            onClick={() => setSelectedSide(side.id)}
                            className={`flex items-center justify-between p-space-xs rounded-lg cursor-pointer transition-colors ${
                              selectedSide === side.id ? 'bg-admin-primary/10 border border-admin-primary/30' : 'bg-surface-container-low hover:bg-surface-container'
                            }`}
                          >
                            <div className="flex items-center gap-space-xs">
                              <input 
                                checked={selectedSide === side.id}
                                onChange={() => setSelectedSide(side.id)}
                                className="text-admin-primary focus:ring-0" 
                                name="side_choice" 
                                type="radio" 
                              />
                              <span className="font-body-sm text-body-sm text-on-surface font-medium">{side.label}</span>
                            </div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{side.fee}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Thêm Nguyên Liệu Thượng Hạng (Upsell) */}
                    <div className="space-y-space-xs">
                      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Nâng Cấp Cao Cấp (Tùy chọn)</span>
                      <div className="space-y-1.5">
                        {[
                          { id: 'truffle', label: 'Nấm truffle đen cạo tươi (3g)', fee: '+250.000 đ' },
                          { id: 'extra_sauce', label: 'Thêm sốt bơ nụ bạch hoa riêng', fee: '+45.000 đ' },
                          { id: 'foil_wrap', label: 'Bọc màng bạc giữ nhiệt cực đại', fee: '+0 đ' }
                        ].map((addon) => {
                          const isChecked = selectedAddons.includes(addon.id);
                          return (
                            <label 
                              key={addon.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                } else {
                                  setSelectedAddons([...selectedAddons, addon.id]);
                                }
                              }}
                              className={`flex items-center justify-between p-space-xs rounded-lg cursor-pointer transition-colors ${
                                isChecked ? 'bg-admin-primary/10 border border-admin-primary/30' : 'bg-surface-container-low hover:bg-surface-container'
                              }`}
                            >
                              <div className="flex items-center gap-space-xs">
                                <input 
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded text-admin-primary focus:ring-0" 
                                  type="checkbox" 
                                />
                                <span className="font-body-sm text-body-sm text-on-surface font-medium">{addon.label}</span>
                              </div>
                              <span className="font-label-sm text-label-sm text-admin-primary font-bold">{addon.fee}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Ghi chú thêm cho món */}
                      <div className="pt-2">
                        <input
                          type="text"
                          placeholder="Ghi chú thêm cho đầu bếp (ví dụ: ít muối, sốt riêng)..."
                          value={customItemNote}
                          onChange={(e) => setCustomItemNote(e.target.value)}
                          className="w-full text-xs p-2 bg-surface-container-low rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-admin-primary text-on-surface"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nút Cập Nhật Món Vào Hóa Đơn */}
                  <div className="pt-space-xs flex justify-end gap-space-sm">
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedSide('Mặc định');
                        setSelectedAddons([]);
                        setCustomItemNote('');
                      }}
                      className="px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                    >
                      Đặt lại tùy chọn
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddCustomizedItem}
                      className="px-space-lg py-space-xs rounded-lg bg-admin-primary text-on-admin-primary font-label-md text-label-md flex items-center gap-space-xs shadow-sm hover:brightness-105 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      Thêm Món Này Vào Phiếu Gọi
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* CỘT 3: PHIẾU GỌI MÓN (TICKET #IRD-4092) & QUYẾT TOÁN GHI NỢ (Col 4 Desktop) */}
            {/* ========================================================================= */}
            {/* Backdrop cho Mobile Cart Drawer */}
            {isMobileCartOpen && (
              <div
                onClick={() => setIsMobileCartOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 xl:hidden transition-opacity"
              />
            )}

            <div className={`xl:col-span-4 space-y-space-md transition-all duration-300 ${
              isMobileCartOpen 
                ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl p-4 sm:p-6 block border-t border-slate-200" 
                : "hidden xl:block"
            }`}>
              {/* Thanh kéo / đóng trên mobile */}
              <div className="xl:hidden flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-5 bg-emerald-600 rounded-full"></span>
                  <span className="font-bold text-base text-slate-800">Phiếu Gọi Món &amp; Thanh Toán</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md space-y-space-md border border-slate-100">
                {/* Header Ticket */}
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Phiếu Gọi Món</span>
                    <span className="font-label-sm text-label-sm text-admin-primary font-semibold">#IRD-4092</span>
                  </div>
                  <span className="px-space-sm py-1 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-bold">
                    Bản Nháp Mở
                  </span>
                </div>
                {/* Danh sách món gọi */}
                <div className="space-y-space-sm pt-space-xs max-h-72 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="bg-surface-container-low rounded-lg p-space-sm space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-space-xs min-w-0">
                          {/* Quantity control */}
                          <div className="flex items-center bg-surface-container rounded-md px-1 py-0.5 mr-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, -1)}
                              className="text-on-surface-variant hover:text-admin-primary font-bold text-xs px-1"
                              title="Giảm 1"
                            >
                              -
                            </button>
                            <span className="font-label-md text-label-md text-admin-primary font-bold px-1 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, 1)}
                              className="text-on-surface-variant hover:text-admin-primary font-bold text-xs px-1"
                              title="Tăng 1"
                            >
                              +
                            </button>
                          </div>
                          <div className="min-w-0">
                            <span className="font-label-md text-label-md text-on-surface font-semibold block truncate">
                              {item.name}
                            </span>
                            <div className="font-body-sm text-body-sm text-on-surface-variant text-[12px] truncate">
                              {item.note ? `• ${item.note}` : '• Phục vụ tiêu chuẩn'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="font-label-md text-label-md font-bold text-on-surface whitespace-nowrap">
                            {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          <button 
                            type="button"
                            onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                            className="text-outline hover:text-error transition-colors mt-1"
                            title="Xóa món"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cartItems.length === 0 && (
                    <div className="text-center py-6 text-xs text-outline italic bg-surface-container-low/50 rounded-lg border border-dashed border-outline-variant/40">
                      Chưa có món nào được chọn. Nhấn dấu "+" trên món ăn để thêm vào phiếu gọi.
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
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Hình Thức Thanh Toán (A4.7)</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Bắt buộc</span>
                  </div>

                  {/* Lựa chọn 1: RoomInvoice */}
                  <div
                    onClick={() => { setPaymentMode('RoomInvoice'); setPaymentMethod(''); }}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${paymentMode === 'RoomInvoice'
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_mode"
                        checked={paymentMode === 'RoomInvoice'}
                        onChange={() => { setPaymentMode('RoomInvoice'); setPaymentMethod(''); }}
                        className="mt-1 text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-emerald-700">domain</span>
                          Gộp vào hóa đơn phòng (RoomInvoice)
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Tạo folio charge liên kết Booking lưu trú. Chi phí được tính gộp khi trả phòng (Check-out).
                        </span>
                      </div>
                    </label>

                    {/* Cách A: Dạng Thẻ Chip / Pill bấm 1 chạm chọn phòng ghi nợ khi khách có nhiều phòng */}
                    {paymentMode === 'RoomInvoice' && activeStays && activeStays.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-emerald-700">hotel</span>
                          Ghi nợ vào phòng ({activeStays.length} phòng):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeStays.map((s) => {
                            const isChosen = (stayId === s.stayId);
                            return (
                              <button
                                key={s.stayId}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedStay(s);
                                  setStayId(s.stayId);
                                  setRoomId(s.roomId);
                                  setErrorMessage('');
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                  isChosen
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102'
                                    : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                                }`}
                              >
                                {isChosen && <span className="material-symbols-outlined text-[13px]">check</span>}
                                <span>Phòng #{s.roomNumber}</span>
                                {s.guestName && (
                                  <span className={`text-[10px] font-normal ${isChosen ? 'text-emerald-100' : 'text-slate-400'}`}>
                                    ({s.guestName.split(' ').slice(-1)[0]})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lựa chọn 2: PayNow */}
                  <div className={`p-3.5 rounded-xl transition-all border ${paymentMode === 'PayNow'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    <label
                      onClick={() => setPaymentMode('PayNow')}
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="payment_mode"
                        checked={paymentMode === 'PayNow'}
                        onChange={() => setPaymentMode('PayNow')}
                        className="mt-1 text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-emerald-700">payments</span>
                          Thanh toán ngay (PayNow)
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Cổng thanh toán online (MoMo, VNPAY, VietQR) hoặc trả tiền mặt trực tiếp.
                        </span>
                      </div>
                    </label>

                    {/* Danh sách cổng thanh toán PayNow */}
                    {paymentMode === 'PayNow' && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                        <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">
                          Chọn Cổng Thanh Toán:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'MoMo', label: 'Ví MoMo', icon: 'account_balance_wallet', color: 'text-pink-600' },
                            { id: 'VNPay', label: 'Cổng VNPAY', icon: 'qr_code_scanner', color: 'text-blue-600' },
                            { id: 'VietQR', label: 'VietQR 24/7', icon: 'qr_code_2', color: 'text-emerald-600' },
                            { id: 'Cash', label: 'Tiền mặt', icon: 'attach_money', color: 'text-amber-600' }
                          ].map(pm => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setPaymentMethod(pm.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs font-semibold cursor-pointer ${paymentMethod === pm.id
                                ? 'bg-white text-emerald-800 border-2 border-emerald-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-emerald-500/60'
                                }`}
                            >
                              <span className={`material-symbols-outlined text-[18px] ${pm.color}`}>{pm.icon}</span>
                              <span className="truncate">{pm.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Mô phỏng tình huống cổng thanh toán trả về thất bại (Negative test) */}
                        <label className="flex items-center gap-2 mt-2 pt-2 text-[11px] text-slate-400 cursor-pointer hover:text-slate-700">
                          <input
                            type="checkbox"
                            checked={simulateFailure}
                            onChange={(e) => setSimulateFailure(e.target.checked)}
                            className="rounded text-rose-600 focus:ring-0 accent-rose-600 cursor-pointer"
                          />
                          <span>Mô phỏng: Cổng thanh toán báo lỗi (Negative TC07)</span>
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

          {/* THANH NỔI (BOTTOM FLOATING BAR) TRÊN MOBILE ĐỂ XEM GIỎ HÀNG & THANH TOÁN */}
          <div className="xl:hidden fixed bottom-4 inset-x-3 z-40">
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                      {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-300">
                    {cartItems.length === 0 ? "Chưa có món nào" : `${cartItems.length} loại món`}
                  </span>
                  <span className="text-sm font-bold text-white tracking-tight">
                    {Math.round(cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) * 1.23).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <span>Xem Phiếu Gọi</span>
                <span className="material-symbols-outlined text-[16px]">expand_less</span>
              </button>
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

                <h3 className="font-sans text-xl font-bold text-on-surface mb-1">
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

                {/* Thông báo lỗi ngay trong Modal nếu có */}
                {errorMessage && (
                  <div className="w-full p-2.5 mb-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-shake">
                    <span className="material-symbols-outlined text-[18px] shrink-0 text-rose-600">error</span>
                    <span className="font-semibold leading-relaxed">{errorMessage}</span>
                  </div>
                )}

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
        </main>
      </div>
    </div>
  );
};

export default RoomService;

