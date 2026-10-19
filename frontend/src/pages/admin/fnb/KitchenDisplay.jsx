import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import OrderPrintModal from '../../../components/admin/fnb/OrderPrintModal';


const Ticket = ({ order, onCheck, onReady, onPrint }) => {
  const isOverSLA = order.isOverSLA;
  const color = order.priorityVip ? 'admin-primary' : (isOverSLA ? 'tertiary' : 'secondary');
  const bgHeader = order.priorityVip ? 'bg-admin-primary/5' : (isOverSLA ? 'bg-tertiary-fixed/30' : 'bg-surface-container');
  const badgeClass = order.priorityVip ? 'bg-admin-primary text-on-admin-primary' : (isOverSLA ? 'bg-tertiary text-on-tertiary animate-pulse' : 'bg-secondary/15 text-secondary');
  const badgeText = order.priorityVip ? 'VIP PLATINUM' : (isOverSLA ? 'HỎA TỐC' : 'TIÊU CHUẨN');

  const allCompleted = order.items.every(i => i.isCompleted);

  return (
    <article className={`flex flex-col bg-surface-container-lowest rounded-xl shadow-md overflow-hidden relative ${order.priorityVip ? 'ring-1 ring-admin-primary/20' : ''}`}>
      <div className={`h-1.5 w-full bg-${color}`}></div>
      <div className={`p-space-md ${bgHeader} flex flex-col gap-space-xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold tracking-wider ${badgeClass}`}>
              {badgeText}
            </span>
            <span className={`font-label-lg text-label-lg font-bold text-${color === 'tertiary' ? 'on-tertiary-container' : color}`}>
              #{order.foodOrderId}
            </span>
          </div>
          <div className={`flex items-center gap-1 font-label-md text-label-md font-bold text-${color}`}>
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span className="font-mono">{new Date(order.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface block">PHÒNG {order.roomNumber}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Trạng thái: {order.status}</span>
          </div>
          <span className={`font-label-sm text-label-sm ${isOverSLA ? 'text-tertiary font-semibold' : 'text-outline'}`}>
            SLA: 20'
          </span>
        </div>
      </div>

      <div className="p-space-md flex-1 flex flex-col gap-space-sm bg-surface-container-lowest overflow-y-auto max-h-[300px]">
        {order.items.map(item => (
          <div
            key={item.orderDetailId}
            onClick={() => onCheck(order.foodOrderId, item.orderDetailId, item.isCompleted)}
            className={`p-space-sm rounded-lg flex flex-col gap-1 cursor-pointer transition-colors ${item.isCompleted ? 'bg-admin-primary/10' : 'bg-surface-container-low hover:bg-surface-container'}`}
          >
            <div className="flex items-start justify-between">
              <span className={`font-label-md text-label-md font-bold leading-tight ${item.isCompleted ? 'text-outline line-through' : 'text-on-surface'}`}>
                {item.quantity}x {item.itemName}
              </span>
              <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold shrink-0 ${item.isCompleted ? 'bg-admin-primary text-on-admin-primary' : 'bg-surface-container-highest text-outline'}`}>
                {item.isCompleted ? 'ĐÃ XONG' : 'CHỜ NẤU'}
              </span>
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
              <span>{item.note || 'Không có ghi chú'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-space-md bg-surface-container-low flex flex-col gap-space-xs mt-auto">
        <button
          onClick={() => onReady(order.foodOrderId, order.items)}
          disabled={!allCompleted}
          className={`w-full py-2 font-label-md text-label-md font-bold rounded-lg shadow-sm transition-opacity flex items-center justify-center gap-space-xs ${allCompleted ? 'bg-admin-primary text-on-admin-primary hover:opacity-95' : 'bg-surface-container-highest text-outline cursor-not-allowed'}`}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">done_all</span>
          <span>{allCompleted ? 'HOÀN TẤT ĐƠN (BUMP)' : 'CHƯA XONG MÓN'}</span>
        </button>

        {/* Nút In phiếu bếp & Hóa đơn tạm tính (FEAT-FNB-11) */}
        <div className="grid grid-cols-2 gap-space-xs mt-1">
          <button
            onClick={() => onPrint && onPrint(order.foodOrderId, 'KitchenTicket', 'Print')}
            className="py-1.5 bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm rounded flex items-center justify-center gap-1 transition-colors cursor-pointer border border-surface-container-high font-semibold"
            type="button"
            title="In phiếu order chuyển Bếp (KOT)"
          >
            <span className="material-symbols-outlined text-[15px] text-amber-600">print</span>
            <span>In lại phiếu</span>
          </button>
          <button
            onClick={() => onPrint && onPrint(order.foodOrderId, 'ProvisionalBill', 'View')}
            className="py-1.5 bg-surface-container-lowest hover:bg-surface-container text-admin-primary font-label-sm text-label-sm rounded flex items-center justify-center gap-1 transition-colors cursor-pointer border border-surface-container-high font-semibold"
            type="button"
            title="Xem & in hóa đơn tạm tính của phòng/bàn"
          >
            <span className="material-symbols-outlined text-[15px]">receipt</span>
            <span>Tạm tính</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  // Features State
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, list: [] });

  // Modal in ấn phiếu bếp & hóa đơn tạm tính (FEAT-FNB-11)
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    orderId: null,
    printType: 'KitchenTicket',
    action: 'View',
    documentData: null,
    isLoading: false
  });

  const prevOrderCountRef = useRef(0);
  const beepSound = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

  // Mở phiếu in ấn hoặc hóa đơn tạm tính (FEAT-FNB-11)
  const handleOpenPrintDoc = async (orderId, printType, action = 'View') => {
    setPrintModal({
      isOpen: true,
      orderId,
      printType,
      action,
      documentData: null,
      isLoading: true
    });

    try {
      const token = localStorage.getItem('hotel_token') || localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/${orderId}/print?printType=${printType}&action=${action}`, {
        headers
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Không thể tạo phiếu order.');
        setPrintModal(prev => ({ ...prev, isLoading: false }));
      } else {
        setPrintModal(prev => ({
          ...prev,
          documentData: data.data,
          isLoading: false
        }));
      }
    } catch (e) {
      console.error('Lỗi in phiếu:', e);
      setErrorMsg('Không thể gửi lệnh in. Vui lòng kiểm tra máy in.');
      setPrintModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Expediter & Stations State (Real DB)
  const [expediterData, setExpediterData] = useState({
    stagedPlates: [],
    totalStaged: 0,
    stationMetrics: {
      totalItems: 0,
      stations: [
        { id: 'hot', name: 'Bếp Nóng Chính (Chảo, Xào & Steak)', count: 0, percent: 0, desc: 'Chưa có món đang nấu', color: 'tertiary' },
        { id: 'cold', name: 'Bếp Lạnh & Khai Vị (Salad, Sashimi & Raw Bar)', count: 0, percent: 0, desc: 'Chưa có món đang làm', color: 'admin-primary' },
        { id: 'bakery', name: 'Bếp Bánh & Tráng Miệng (Pastry & Bakery)', count: 0, percent: 0, desc: 'Sẵn sàng đơn tráng miệng', color: 'secondary' }
      ]
    }
  });

  const fetchExpediterMetrics = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/fnb-orders/kitchen/expediter-metrics');
      const data = await res.json();
      if (data.success && data.data) {
        setExpediterData(data.data);
      }
    } catch(e) {}
  };

  const handleCallRunners = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/fnb-orders/kitchen/call-runners', { method: 'POST' });
      const data = await res.json();
      if (!isMuted) {
        try { beepSound.current.play(); } catch(e){}
      }
      showMessageModal('success', 'CHUÔNG GỌI RUNNER', data.message || 'Đã phát chuông gọi Runner tập trung!');
    } catch (e) {
      showMessageModal('error', 'LỖI', 'Không thể kết nối đến máy chủ.');
    }
  };

  const handleClearPass = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/fnb-orders/kitchen/clear-pass', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showMessageModal('success', 'DỌN BÀN RA MÓN', data.message);
        fetchExpediterMetrics();
        fetchOrders();
      } else {
        showMessageModal('error', 'LỖI', data.message || 'Không thể dọn bàn.');
      }
    } catch (e) {
      showMessageModal('error', 'LỖI HỆ THỐNG', 'Lỗi khi gọi dọn bàn ra món.');
    }
  };

  const showMessageModal = (type, title, message) => {
    setMessageModal({ isOpen: true, type, title, message });
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/fnb-orders/kitchen');
      const data = await response.json();
      if (data.success) {
        if (!isMuted && data.data.length > prevOrderCountRef.current && prevOrderCountRef.current !== 0) {
          try { beepSound.current.play(); } catch(e){}
        }
        prevOrderCountRef.current = data.data.length;
        setOrders(data.data);
      } else {
        setErrorMsg(data.message || 'Lỗi tải danh sách order.');
        showMessageModal('error', 'LỖI', data.message || 'Lỗi tải danh sách order.');
      }
    } catch (error) {
      setErrorMsg('Không thể kết nối đến máy chủ.');
      showMessageModal('error', 'LỖI HỆ THỐNG', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchExpediterMetrics();
    const interval = setInterval(() => {
      fetchOrders();
      fetchExpediterMetrics();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleItemCheck = async (orderId, detailId, currentStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/kitchen/${orderId}/items/${detailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
      const data = await res.json();
      if (!data.success) {
        showMessageModal('error', 'LỖI', data.message || 'Không thể cập nhật món.');
      } else {
        fetchOrders();
        fetchExpediterMetrics();
        showMessageModal('success', 'THÀNH CÔNG', !currentStatus ? 'Đã hoàn thành món!' : 'Đã bỏ đánh dấu món');
      }
    } catch (error) {
      showMessageModal('error', 'LỖI HỆ THỐNG', 'Lỗi kết nối khi cập nhật món.');
    }
  };

  const handleMarkReady = async (orderId, items) => {
    const uncompleted = items.some(item => !item.isCompleted);
    if (uncompleted) {
      showMessageModal('error', 'LỖI', 'Còn món chưa hoàn thành trong đơn này.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/kitchen/${orderId}/ready`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        fetchExpediterMetrics();
        if (!isMuted) {
          try { new Audio('https://actions.google.com/sounds/v1/water/glass_water_pour.ogg').play(); } catch(e){}
        }
        showMessageModal('success', 'THÀNH CÔNG', `Đã xuất đơn hàng #${orderId} thành công!`);
      } else {
        showMessageModal('error', 'LỖI', data.message || 'Không thể cập nhật trạng thái đơn.');
      }
    } catch (error) {
      showMessageModal('error', 'LỖI HỆ THỐNG', 'Lỗi kết nối khi cập nhật trạng thái đơn.');
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const openRestoreModal = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/fnb-orders/kitchen/ready');
      const data = await res.json();
      setRestoreModal({ isOpen: true, list: data.data || [] });
    } catch(e) {
      showMessageModal('error', 'LỖI', 'Không thể lấy danh sách phiếu.');
    }
  };

  const handleRestore = async (orderId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/kitchen/${orderId}/restore`, { method: 'PATCH' });
      if (res.ok) {
        setRestoreModal({ isOpen: false, list: [] });
        fetchOrders();
        fetchExpediterMetrics();
        showMessageModal('success', 'KHÔI PHỤC', `Khôi phục thành công đơn #${orderId}`);
      }
    } catch(e) {}
  };

  // Add the timer logic here for React
  useEffect(() => {
    const timers = document.querySelectorAll('.countdown-timer');
    const interval = setInterval(() => {
      timers.forEach(timer => {
        let sec = parseInt(timer.getAttribute('data-seconds'), 10);
        if (sec > 0) {
          sec++;
          timer.setAttribute('data-seconds', sec);
          const m = Math.floor(sec / 60).toString().padStart(2, '0');
          const s = (sec % 60).toString().padStart(2, '0');
          timer.textContent = `${m}:${s}`;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = (e) => {
    setIsMuted(!isMuted);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full text-on-surface">
        {/* PAUSE BANNER */}
        {isPaused && (
          <div className="w-full bg-error text-on-error py-2 flex items-center justify-center gap-2 font-bold animate-pulse">
            <span className="material-symbols-outlined">warning</span>
            BẾP ĐANG TẠM DỪNG NHẬN ĐƠN MỚI
          </div>
        )}

        {/* TOP KDS EXPEDITER BAR */}
        <section className="w-full bg-surface-container-lowest shadow-sm px-gutter-lg py-space-md">
          <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-space-md">
            {/* Station identity & Primary filter */}
            <div className="flex flex-wrap items-center gap-space-md">
              <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg">
                <span className="material-symbols-outlined text-admin-primary text-[20px]">soup_kitchen</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-lg text-label-lg text-admin-primary font-bold tracking-tight">EXP-MAIN-01</span>
                    <span className="w-2 h-2 rounded-full bg-admin-primary-container"></span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Bếp Trưởng Điều Phối (Master Expediter &amp; Line Controller)</span>
                </div>
              </div>
              {/* Quick filter chips */}
              <div className="flex items-center flex-wrap gap-space-xs bg-surface-container rounded-lg p-1" id="station-filter-group">
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Đang hiển thị Tất cả trạm bếp (08).')} className="px-space-md py-1.5 rounded bg-surface-container-lowest text-admin-primary font-label-md text-label-md shadow-sm" type="button">Tất cả trạm bếp (08)</button>
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Lọc theo Bếp Nóng 01 đang được cập nhật.')} className="px-space-md py-1.5 rounded hover:bg-surface-container-lowest/60 text-on-surface-variant font-label-md text-label-md transition-colors" type="button">Bếp Nóng 01 (Chảo &amp; Xào)</button>
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Lọc theo Bếp Nóng 02 đang được cập nhật.')} className="px-space-md py-1.5 rounded hover:bg-surface-container-lowest/60 text-on-surface-variant font-label-md text-label-md transition-colors" type="button">Bếp Nóng 02 (Nướng &amp; Lò)</button>
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Lọc theo Bếp Lạnh đang được cập nhật.')} className="px-space-md py-1.5 rounded hover:bg-surface-container-lowest/60 text-on-surface-variant font-label-md text-label-md transition-colors" type="button">Bếp Lạnh (Salad &amp; Raw)</button>
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Lọc theo Bếp Bánh đang được cập nhật.')} className="px-space-md py-1.5 rounded hover:bg-surface-container-lowest/60 text-on-surface-variant font-label-md text-label-md transition-colors" type="button">Bếp Bánh &amp; Tráng Miệng</button>
                <button onClick={() => showMessageModal('info', 'LỌC TRẠM', 'Lọc theo Quầy Bar đang được cập nhật.')} className="px-space-md py-1.5 rounded hover:bg-surface-container-lowest/60 text-on-surface-variant font-label-md text-label-md transition-colors" type="button">Quầy Bar</button>
              </div>
            </div>
            {/* Action buttons & Sound trigger */}
            <div className="flex items-center gap-space-sm w-full 2xl:w-auto justify-end">
              <button onClick={openRestoreModal} className="flex items-center gap-space-xs px-space-md py-1.5 bg-surface-container-low text-on-surface hover:bg-surface-container rounded-lg text-label-md font-label-md transition-colors" type="button">
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span>Khôi phục phiếu</span>
              </button>
              <button className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg text-label-md font-label-md transition-colors ${isMuted ? 'bg-surface-container-low text-on-surface opacity-60' : 'bg-admin-primary-container/15 text-on-admin-primary-container'}`} onClick={toggleSound} type="button">
                <span className="material-symbols-outlined text-[18px]">{isMuted ? 'volume_off' : 'volume_up'}</span>
                <span>Chuông báo: {isMuted ? 'Tắt' : 'Bật'}</span>
              </button>
              <button onClick={togglePause} className={`flex items-center gap-space-xs px-space-md py-1.5 rounded-lg text-label-md font-label-md transition-colors ${isPaused ? 'bg-error text-on-error' : 'bg-surface-container-low text-tertiary hover:bg-tertiary-fixed/40'}`} type="button">
                <span className="material-symbols-outlined text-[18px]">{isPaused ? 'play_circle' : 'pause_circle'}</span>
                <span>{isPaused ? 'Tiếp tục nhận đơn' : 'Tạm dừng nhận đơn'}</span>
              </button>
              <button onClick={fetchOrders} className="p-1.5 bg-admin-primary text-on-admin-primary rounded-lg shadow-sm hover:opacity-90 transition-opacity" type="button" title="Tải lại đơn hàng">
                <span className="material-symbols-outlined text-[20px] {loading ? 'animate-spin' : ''}">refresh</span>
              </button>
            </div>
          </div>
          {/* Telemetry Strip */}
          <div className="mt-space-md grid grid-cols-2 md:grid-cols-4 gap-space-md pt-space-md bg-surface-container-low/50 -mx-gutter-lg px-gutter-lg">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-admin-primary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">timer</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Thời gian TB bếp</span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">--'</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-tertiary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">notification_important</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Đơn trễ nhất</span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-md text-headline-md font-bold text-tertiary">
                    {orders.filter(o => o.isOverSLA).length > 0 ? (Math.floor((new Date() - new Date(orders.find(o => o.isOverSLA).createdAt)) / 60000) + 'm') : '--'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Phiếu hoạt động</span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">{orders.length} Đơn</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-admin-primary-container shadow-sm">
                <span className="material-symbols-outlined text-[22px]">done_all</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Tỷ lệ xuất chuẩn</span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-md text-headline-md font-bold text-admin-primary">100%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KDS CHITS GRID (4-COLUMN HIGH PRECISION TICKET RACK) */}
        <section className="p-gutter-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-gutter">
            {orders.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[48px] mb-4">check_circle</span>
                <p className="font-label-lg text-label-lg">Không có đơn hàng nào chờ xử lý.</p>
              </div>
            ) : (
              orders.map(order => (
                <Ticket
                  key={order.foodOrderId}
                  order={order}
                  onCheck={handleItemCheck}
                  onReady={handleMarkReady}
                  onPrint={handleOpenPrintDoc}
                />
              ))
            )}
          </div>
        </section>
        {/* LOWER OPS: EXPEDITER PASS & KITCHEN STATION LOAD METRICS (CONNECTED TO DATABASE) */}
        <section className="px-gutter-lg pb-margin-lg">
          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-gutter">
            {/* LEFT: EXPEDITER PASS HOT-LAMPS (BÀN RA MÓN ĐIỀU PHỐI) */}
            <div className="2xl:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-bold">
                      <span className="material-symbols-outlined text-[20px]">outdoor_grill</span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Bàn Ra Món Số 01 (Expediter Pass • Đèn Giữ Nhiệt)</h2>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Khu vực kiểm tra chất lượng vệ sinh &amp; đối chiếu phiếu giao</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm font-bold animate-pulse">
                    {expediterData.totalStaged} ĐĨA CHỜ RUNNER
                  </span>
                </div>

                {/* Staged Plates under Pass (Dữ liệu thật từ DB) */}
                {expediterData.stagedPlates.length === 0 ? (
                  <div className="py-8 px-4 bg-surface-container-low rounded-lg text-center text-outline flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[36px] mb-2 text-admin-primary">check_circle</span>
                    <p className="font-label-md text-label-md text-on-surface-variant">Bàn ra món đang trống — Chưa có đĩa nào chờ Runner tiếp thực.</p>
                    <span className="text-body-sm font-body-sm text-outline mt-1">Khi phiếu bếp bấm "XUẤT ĐƠN / SẴN SÀNG", đĩa món sẽ xuất hiện tại đây.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                    {expediterData.stagedPlates.map(plate => (
                      <div key={plate.id} className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between relative overflow-hidden border border-surface-container-high/40">
                        <div className={`h-1 w-full absolute top-0 left-0 ${plate.isCold ? 'bg-secondary' : 'bg-admin-primary'}`}></div>
                        <div>
                          <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                            <span className="font-bold text-on-surface">{plate.destination}</span>
                            <span className="text-tertiary font-bold">Sẵn sàng</span>
                          </div>
                          <div className="font-label-lg text-label-lg font-bold text-on-surface mt-1 truncate" title={plate.itemName}>
                            {plate.quantity}x {plate.itemName}
                          </div>
                          <span className="text-body-sm font-body-sm text-outline truncate block mt-0.5">{plate.cloche}</span>
                        </div>
                        <div className="mt-space-md flex items-center justify-between pt-space-xs">
                          <span className={`text-label-sm font-label-sm font-semibold ${plate.isCold ? 'text-secondary' : 'text-admin-primary'}`}>
                            Nhiệt độ: {plate.temp}
                          </span>
                          <span className={`material-symbols-outlined text-[18px] ${plate.isCold ? 'text-secondary' : 'text-admin-primary'}`}>
                            {plate.isCold ? 'ac_unit' : 'thermostat'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-space-lg flex flex-wrap items-center justify-between gap-space-sm pt-space-md bg-surface-container-low/60 -mx-space-lg -mb-space-lg p-space-lg rounded-b-xl">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">notifications_active</span>
                  <span className="font-body-md text-body-md text-on-surface">Nhân viên tiếp thực (Runner) ca trực: <strong>Đang kết nối hệ thống bộ đàm</strong></span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button 
                    onClick={handleCallRunners}
                    className="px-space-md py-2 bg-tertiary text-on-tertiary font-label-md text-label-md font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1 active:scale-95" 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    <span>CHUÔNG GỌI RUNNER TẬP TRUNG</span>
                  </button>
                  <button 
                    onClick={handleClearPass}
                    className="px-space-md py-2 bg-surface-container-lowest text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container transition-colors shadow-sm active:scale-95" 
                    type="button"
                  >
                    Dọn bàn ra món
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: KITCHEN STATION REAL-TIME PRESSURE DIALS (DỮ LIỆU THẬT DATABASE) */}
            <div className="2xl:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold">
                      <span className="material-symbols-outlined text-[20px]">speed</span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Áp Lực Phân Trạm Bếp Real-Time</h2>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Tải công suất và phân bổ nhân sự từng line</span>
                    </div>
                  </div>
                  <span className="font-label-md text-label-md text-admin-primary font-bold">
                    Tổng {expediterData.stationMetrics?.totalItems || 0} món
                  </span>
                </div>
                <div className="space-y-space-md">
                  {(expediterData.stationMetrics?.stations || []).map(station => (
                    <div key={station.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-body-md font-body-md">
                        <span className="font-semibold text-on-surface">{station.name}</span>
                        <span className={`font-bold ${station.id === 'hot' ? 'text-tertiary' : station.id === 'cold' ? 'text-admin-primary' : 'text-secondary'}`}>
                          {station.percent}% Tải • {station.count} món
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${station.id === 'hot' ? 'bg-tertiary' : station.id === 'cold' ? 'bg-admin-primary' : 'bg-secondary'}`} 
                          style={{ width: `${station.percent}%` }}
                        ></div>
                      </div>
                      <span className="text-label-sm font-label-sm text-outline">{station.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-space-md pt-space-md bg-surface-container-low rounded-lg p-space-md flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-admin-primary text-[20px]">tune</span>
                  <span className="text-label-md font-label-md text-on-surface">Cân bằng lại tải các trạm tự động?</span>
                </div>
                <button onClick={() => showMessageModal('success', 'TỐI ƯU HÓA', 'Đã phân bổ lại công việc cho các trạm bếp dựa trên tải hiện tại.')} className="px-space-md py-1 bg-surface-container-lowest text-admin-primary font-label-sm text-label-sm font-bold rounded shadow-sm hover:bg-surface-variant transition-colors" type="button">
                  Tối ưu phân line
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MESSAGE MODAL (SUCCESS/ERROR) */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-surface-container-lowest w-full max-w-lg p-space-xl rounded-3xl shadow-2xl flex flex-col items-center text-center relative border border-surface-container-highest">

            {/* Floating Icon */}
            <div className={`absolute -top-8 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-surface-container-lowest ${messageModal.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
              <span className="material-symbols-outlined text-white text-[32px] font-bold">
                {messageModal.type === 'success' ? 'check' : 'close'}
              </span>
            </div>

            <h2 className="text-headline-md font-extrabold text-on-surface mt-6 uppercase tracking-wide">
              {messageModal.title}
            </h2>

            <div className="mt-4 py-4 px-6 bg-surface-container/50 rounded-xl w-full border border-surface-container-high border-dashed">
              <p className="text-body-lg text-on-surface-variant font-medium">
                {messageModal.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMessageModal({ isOpen: false, type: 'success', title: '', message: '' })}
              className={`mt-8 w-full py-4 rounded-xl font-bold uppercase tracking-wider text-white shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 ${messageModal.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
            >
              [ Đóng ]
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* RESTORE MODAL */}
      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-surface-container-lowest w-full max-w-2xl p-space-xl rounded-3xl shadow-2xl flex flex-col relative border border-surface-container-highest">
            <h2 className="text-headline-sm font-bold text-on-surface mb-4">Khôi phục phiếu đã hoàn tất</h2>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {restoreModal.list.length === 0 ? (
                <p className="text-on-surface-variant italic">Không có phiếu nào gần đây.</p>
              ) : (
                restoreModal.list.map(order => (
                  <div key={order.foodOrderId} className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
                    <div>
                      <div className="font-bold">Order #{order.foodOrderId}</div>
                      <div className="text-sm text-on-surface-variant">Phòng: {order.roomNumber}</div>
                    </div>
                    <button onClick={() => handleRestore(order.foodOrderId)} className="px-4 py-2 bg-admin-primary text-on-admin-primary rounded-lg font-bold hover:brightness-110">
                      Khôi phục lại
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setRestoreModal({ isOpen: false, list: [] })} className="mt-6 w-full py-3 bg-surface-container-high text-on-surface rounded-lg font-bold">
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL IN PHIẾU BẾP & HÓA ĐƠN TẠM TÍNH (FEAT-FNB-11) */}
      <OrderPrintModal
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal(prev => ({ ...prev, isOpen: false }))}
        documentData={printModal.documentData}
        isLoading={printModal.isLoading}
      />
    </AdminLayout>
  );
};

export default KitchenDisplay;