import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

export default function SmartLockManagement() {
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'VIP' | 'HK' | 'WARNING'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalActive: 142,
    mobileBleCount: 98,
    rfidCount: 44,
    successRate: '98.4%',
    meshOnline: '248/250',
    warningCount: 2,
    rejectedLogs: 1
  });

  // State Trạm cấp E-Key bên phải (Direct Encoder Bay #01)
  const [selectedRoomToIssue, setSelectedRoomToIssue] = useState('804');
  const [issueGuestName, setIssueGuestName] = useState('Arthur Dent');
  const [issueBookingId, setIssueBookingId] = useState('RES-8891');
  const [checkInDate, setCheckInDate] = useState('2024-10-24');
  const [checkOutDate, setCheckOutDate] = useState('2024-10-28');
  const [checkOutTime, setCheckOutTime] = useState('12:00 PM');
  const [accessAreas, setAccessAreas] = useState({
    door: true,
    elevator: true,
    gymSpa: true,
    lounge: false,
    parking: false,
    beach: false
  });
  const [isEncodingRfid, setIsEncodingRfid] = useState(false);
  const [isIssuingWallet, setIsIssuingWallet] = useState(false);

  // Modal hiển thị chi tiết E-Key & Mã PIN
  const [modalKey, setModalKey] = useState(null);

  // Modal Cấp lại mã PIN mở cửa phòng
  const [reissueModalKey, setReissueModalKey] = useState(null);
  const [customPinInput, setCustomPinInput] = useState('');
  const [pinGenMode, setPinGenMode] = useState('AUTO'); // 'AUTO' | 'MANUAL'
  const [isSubmittingReissue, setIsSubmittingReissue] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // HÀM CẤP LẠI MÃ PIN MỚI KHI PHÒNG ĐÃ BỊ VÔ HIỆU HÓA
  const handleReissuePin = async (e) => {
    if (e) e.preventDefault();
    if (!reissueModalKey) return;

    if (pinGenMode === 'MANUAL' && (!customPinInput || customPinInput.length < 4)) {
      showToast('Vui lòng nhập mã PIN tối thiểu 4 - 6 số!', 'warning');
      return;
    }

    setIsSubmittingReissue(true);
    try {
      const res = await fetch(`/api/smart-lock/regenerate-pin/${reissueModalKey.KeyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPin: pinGenMode === 'MANUAL' ? customPinInput : undefined
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Đã cấp lại mã PIN [${result.newPin}] và kích hoạt lại phòng ${reissueModalKey.RoomNumber} thành công!`);
        fetchKeys();
        setReissueModalKey(null);
        setCustomPinInput('');
        setModalKey(result.data); // Mở popup xem mã PIN mới
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi cấp lại mã PIN!', 'warning');
    } finally {
      setIsSubmittingReissue(false);
    }
  };

  // Tải danh sách khóa từ Database MySQL Docker
  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/smart-lock/keys?tab=${activeTab}&search=${encodeURIComponent(searchTerm)}&room=${filterRoom}`);
      const result = await res.json();
      if (result.success) {
        setKeys(result.data);
        if (result.stats) setStats(result.stats);
        if (!selectedKey && result.data.length > 0) {
          setSelectedKey(result.data[0]);
        }
      }
    } catch (err) {
      console.warn('Lỗi kết nối API SmartLock:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchTerm, filterRoom, selectedKey]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Chọn phòng từ dropdown bên form cấp khóa
  const handleSelectRoomChange = (roomNo) => {
    setSelectedRoomToIssue(roomNo);
    const existing = keys.find(k => k.RoomNumber === roomNo);
    if (existing) {
      setIssueGuestName(existing.GuestName);
      setIssueBookingId(existing.BookingId);
      setSelectedKey(existing);
    } else {
      setIssueGuestName('Khách Đặt Phòng Mới');
      setIssueBookingId(`RES-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // Toggle quyền khu vực
  const toggleArea = (key) => {
    setAccessAreas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. CẤP E-KEY GỬI ĐẾN APPLE / GOOGLE WALLET
  const handleIssueWalletKey = async () => {
    setIsIssuingWallet(true);
    const activeAreasList = [];
    if (accessAreas.door) activeAreasList.push(`Cửa Phòng ${selectedRoomToIssue}`);
    if (accessAreas.elevator) activeAreasList.push('Thang Máy Tầng 8');
    if (accessAreas.gymSpa) activeAreasList.push('Phòng Gym & Spa');
    if (accessAreas.lounge) activeAreasList.push('Executive Lounge');
    if (accessAreas.parking) activeAreasList.push('Bãi Xe VIP Ocean');
    if (accessAreas.beach) activeAreasList.push('Cổng Bãi Biển Riêng');

    try {
      const res = await fetch('/api/smart-lock/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RoomNumber: selectedRoomToIssue,
          BookingId: issueBookingId,
          GuestName: issueGuestName,
          LockType: 'App BLE Mobile Key',
          ValidFrom: checkInDate,
          ValidTo: `${checkOutDate} (Hết hạn: ${checkOutTime})`,
          AccessAreas: activeAreasList,
          Provider: 'VISIONLINE'
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Đã đẩy E-Key & mã PIN [${result.data.PasscodePin}] lên Apple/Google Wallet và lưu MySQL thành công!`);
        fetchKeys();
        setModalKey(result.data);
      }
    } catch (err) {
      showToast('Lỗi khi cấp E-Key!', 'warning');
    } finally {
      setIsIssuingWallet(false);
    }
  };

  // 2. MÃ HÓA & GHI THẺ TỪ RFID TỨC THÌ
  const handleEncodeRfid = async () => {
    setIsEncodingRfid(true);
    setTimeout(async () => {
      try {
        const res = await fetch('/api/smart-lock/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RoomNumber: selectedRoomToIssue,
            BookingId: issueBookingId,
            GuestName: issueGuestName,
            LockType: 'Thẻ Vật Lý Mifare DESFire EV3',
            ValidFrom: checkInDate,
            ValidTo: `${checkOutDate} (Hết hạn: ${checkOutTime})`,
            AccessAreas: [`Cửa Phòng ${selectedRoomToIssue}`, 'Thang Máy Tầng 8', 'Phòng Gym & Spa'],
            Provider: 'SALTO'
          })
        });
        const result = await res.json();
        if (result.success) {
          showToast(`Đã mã hóa thẻ từ RFID UID: ${result.data.RfidCardUid} cho phòng ${selectedRoomToIssue} thành công!`);
          fetchKeys();
        }
      } catch (e) {
        showToast('Lỗi mã hóa thẻ RFID!', 'warning');
      } finally {
        setIsEncodingRfid(false);
      }
    }, 1200);
  };

  // 3. THU HỒI KHÓA ĐIỆN TỬ TỨC THÌ
  const handleRevokeKey = async (keyId, roomNo) => {
    if (!window.confirm(`Bạn có chắc muốn THU HỒI quyền mở cửa và vô hiệu hóa mã PIN của phòng ${roomNo}?`)) return;
    try {
      const res = await fetch(`/api/smart-lock/revoke/${keyId}`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        showToast(`Đã thu hồi và vô hiệu hóa mã PIN phòng ${roomNo} trong MySQL Docker!`);
        fetchKeys();
      }
    } catch (e) {
      showToast('Lỗi thu hồi khóa!', 'warning');
    }
  };

  // 4. GIA HẠN GIỜ CHECK-OUT
  const handleExtendKey = async (keyId, roomNo) => {
    const newCheckout = prompt(`Nhập giờ Check-out mới cho phòng ${roomNo}:`, '14:00 (Late Check-out)');
    if (!newCheckout) return;
    try {
      const res = await fetch(`/api/smart-lock/extend/${keyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newValidTo: `Hạn: ${newCheckout}` })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Đã gia hạn hiệu lực khóa phòng ${roomNo} thành công!`);
        fetchKeys();
      }
    } catch (e) {
      showToast('Lỗi gia hạn khóa!', 'warning');
    }
  };

  // 5. KHÓA KHẨN CẤP TOÀN TÒA NHÀ
  const handleEmergencyLockdown = async () => {
    if (!window.confirm('CẢNH BÁO BẢO MẬT: Kích hoạt LỆNH KHÓA KHẨN CẤP trên toàn bộ 250 chốt cửa tòa nhà?')) return;
    try {
      const res = await fetch('/api/smart-lock/emergency-lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOCK' })
      });
      const result = await res.json();
      showToast(result.message, 'warning');
      fetchKeys();
    } catch (e) {
      showToast('Lỗi lệnh khóa khẩn cấp', 'warning');
    }
  };

  // 6. ĐỒNG BỘ KHÓA CỤM MESH ZIGBEE
  const handleSyncMesh = async () => {
    try {
      const res = await fetch('/api/smart-lock/sync-mesh', { method: 'POST' });
      const result = await res.json();
      showToast(result.message);
    } catch (e) {
      showToast('Đang đồng bộ mạng Mesh...');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1650px] mx-auto space-y-5 pb-12 print:p-0">

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-emerald-500/30 animate-bounce">
            <span className="material-symbols-outlined text-emerald-400">
              {toastMessage.type === 'warning' ? 'warning' : 'verified_user'}
            </span>
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* =============================================================== */}
        {/* DẢI STATUS SYSTEM BAR & HEADER CHÍNH (KHỚP MOCKUP 100%) */}
        {/* =============================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-3">
          {/* Dải thông số bảo mật đỉnh trang */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono border-b pb-3 text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                HỆ THỐNG KIỂM SOÁT KHÓA TRUNG TÂM
              </span>
              <span className="text-gray-300">•</span>
              <span>GATEWAY: VISIONLINE V7.4 PRO // SALTO NETWORKS</span>
              <span className="text-gray-300">•</span>
              <span className="text-emerald-700 font-semibold">ĐỒNG BỘ MESH ZIGBEE 3.0: ỔN ĐỊNH (12ms)</span>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <span>BẢN GHI AUDIT KHÓA: <strong className="text-gray-900">#LK-89410-VN</strong></span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                <span className="material-symbols-outlined text-xs">lock</span>
                ENCRYPTION AES-256
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-bold">
                MYSQL DOCKER :3306
              </span>
            </div>
          </div>

          {/* Tiêu đề Phân hệ 47 & 2 Nút hành động */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase">
                KIẾN TRÚC AN NINH NOCTURNE —— PHÂN HỆ 47
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Trung Tâm Điều Hành Khóa Thông Minh IoT & Cấp Thẻ E-Key
              </h1>
              <p className="text-xs text-gray-500 max-w-4xl">
                Quản lý ma trận phân quyền kỹ thuật số, phát hành thẻ từ RFID NFC và đẩy khóa E-Key tức thì qua Apple Wallet & Google Wallet cho phân khu Ocean Wing & Sky Villa.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncMesh}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all border border-gray-300 shadow-2xs"
              >
                <span className="material-symbols-outlined text-base">sync</span>
                Đồng Bộ Khóa Cụm
              </button>

              <button
                type="button"
                onClick={handleEmergencyLockdown}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all"
              >
                <span className="material-symbols-outlined text-base">lock</span>
                Khóa Khẩn Cấp Tòa Nhà
              </button>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* 4 CARD THỐNG KÊ KPI ĐỈNH TRANG (KHỚP 100% MOCKUP) */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng khóa & Thẻ active */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>TỔNG KHÓA & THẺ ACTIVE</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">key</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{stats.totalActive}</span>
              <span className="text-xs font-bold text-emerald-700 uppercase">KHÓA ACTIVE</span>
            </div>
            <div className="flex items-center gap-4 text-xs pt-1 border-t border-gray-100 font-medium">
              <span className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <strong>{stats.mobileBleCount}</strong> Mobile BLE
              </span>
              <span className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <strong>{stats.rfidCount}</strong> Thẻ RFID
              </span>
            </div>
          </div>

          {/* Card 2: Tỷ lệ cấp khóa thành công */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>TỶ LỆ CẤP KHÓA THÀNH CÔNG</span>
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">phone_iphone</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{stats.successRate}</span>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Tốc độ: 14s
              </span>
            </div>
            <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between">
              <span>Độ trễ OTA qua API: 1.2s</span>
              <span className="text-emerald-700 font-bold">↑ 2.1% ca trước</span>
            </div>
          </div>

          {/* Card 3: Mạng Mesh Zigbee / BLE */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>MẠNG MESH ZIGBEE / BLE</span>
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">hub</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{stats.meshOnline}</span>
              <span className="text-xs font-bold text-emerald-700 uppercase">ONLINE</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-amber-700 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">battery_alert</span>
                  {stats.warningCount} khóa cảnh báo pin yếu (&lt; 20%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '99.2%' }}></div>
              </div>
            </div>
          </div>

          {/* Card 4: Cảnh báo dị thường */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>CẢNH BÁO DỊ THƯỜNG</span>
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">gpp_maybe</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-700">01</span>
              <span className="text-xs font-bold text-rose-700 uppercase">LƯỢT TỪ CHỐI</span>
            </div>
            <div className="text-[11px] text-gray-600 pt-1 border-t border-gray-100 flex items-center justify-between">
              <span className="truncate max-w-[170px]">Phòng 305: Thẻ hết hạn [13:48]</span>
              <span className="text-rose-600 font-bold cursor-pointer hover:underline">
                Xem Log
              </span>
            </div>
          </div>

        </div>

        {/* =============================================================== */}
        {/* NỘI DUNG CHÍNH: 2 CỘT (DANH SÁCH BÊN TRÁI & TRẠM CẤP BÊN PHẢI) */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ================= CỘT TRÁI (7 PHẦN): DANH SÁCH CẤP KHÓA THỜI GIAN THỰC ================= */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">

              {/* Header danh sách & Tabs lọc */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-2xl">badge</span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Danh Sách Cấp Khóa Thời Gian Thực
                    </h2>
                    <p className="text-xs text-gray-500">
                      Bản quyền mã truy cập đang hiệu lực cho Khách lưu trú & Nhân viên bộ phận
                    </p>
                  </div>
                </div>

                {/* Tabs lọc */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600'}`}
                  >
                    Tất Cả ({stats.totalActive})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('VIP')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'VIP' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600'}`}
                  >
                    Khách VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('HK')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'HK' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600'}`}
                  >
                    Buồng Phòng
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('WARNING')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'WARNING' ? 'bg-rose-50 text-rose-800 shadow-sm font-bold' : 'text-gray-600'}`}
                  >
                    Cảnh Báo ({stats.warningCount})
                  </button>
                </div>
              </div>

              {/* Bảng danh sách khóa E-Key */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-3">ĐỐI TƯỢNG & PHÒNG</th>
                      <th className="py-3 px-3">PHƯƠNG THỨC & LOẠI KHÓA</th>
                      <th className="py-3 px-3">HIỆU LỰC</th>
                      <th className="py-3 px-3">TÌNH TRẠNG PIN KHÓA</th>
                      <th className="py-3 px-3">QUYỀN KHU VỰC</th>
                      <th className="py-3 px-3 text-right">LỆNH VẬN HÀNH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {keys.map((k) => (
                      <tr 
                        key={k.KeyId}
                        onClick={() => setSelectedKey(k)}
                        className={`cursor-pointer hover:bg-emerald-50/40 transition-colors ${selectedKey?.KeyId === k.KeyId ? 'bg-emerald-50/60' : ''}`}
                      >
                        {/* Cột 1: Đối tượng & Phòng */}
                        {/* Cột 1: Đối tượng & Phòng */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-black font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                              {k.RoomNumber}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm">{k.GuestName}</span>
                                {k.GuestTier?.includes('VIP') && (
                                  <span className="text-[9px] font-black bg-black text-white px-1.5 py-0.2 rounded tracking-wider">
                                    VIP BLACK
                                  </span>
                                )}
                                {k.GuestTier === 'NHÂN VIÊN' && (
                                  <span className="text-[9px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded">
                                    NHÂN VIÊN
                                  </span>
                                )}
                                {k.Status === 'REVOKED' && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded">
                                    ĐÃ VÔ HIỆU HÓA
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {k.RoomWing} • {k.RoomType}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Phương thức khóa */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-emerald-700 text-base">
                              {k.LockType?.includes('App') || k.LockType?.includes('Passkey') ? 'smartphone' : 'contactless'}
                            </span>
                            <div className="font-semibold text-gray-800">
                              {k.LockType}
                            </div>
                          </div>
                          {k.PhysicalCardsCount > 0 && (
                            <div className="text-[10px] text-gray-500 font-mono">
                              + 0{k.PhysicalCardsCount} Thẻ Vật Lý phụ
                            </div>
                          )}
                          {k.Status === 'REVOKED' ? (
                            <div className="text-[10px] font-mono text-rose-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              PIN: Đã vô hiệu hóa
                            </div>
                          ) : k.PasscodePin ? (
                            <div className="text-[10px] font-mono text-emerald-700 font-bold">
                              PIN: {k.PasscodePin}
                            </div>
                          ) : null}
                        </td>

                        {/* Cột 3: Hiệu lực checkin - checkout */}
                        <td className="py-3.5 px-3 font-mono">
                          <div className="font-bold text-gray-900">{k.ValidFrom}</div>
                          <div className="text-gray-400 text-[10px]">——</div>
                          <div className={`font-bold ${k.Status === 'REVOKED' ? 'text-rose-600 line-through' : 'text-emerald-800'}`}>
                            {k.ValidTo}
                          </div>
                        </td>

                        {/* Cột 4: Pin khóa */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-gray-500">battery_horiz_075</span>
                            <span className={`font-bold text-xs ${k.BatteryLevel < 30 ? 'text-rose-600' : 'text-gray-900'}`}>
                              {k.BatteryLevel}%
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              k.BatteryLevel < 30 
                                ? 'bg-rose-100 text-rose-800 font-bold' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {k.BatteryStatus}
                            </span>
                          </div>
                        </td>

                        {/* Cột 5: Quyền khu vực */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(k.AccessAreas || []).slice(0, 2).map((a, i) => (
                              <span key={i} className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                                {a}
                              </span>
                            ))}
                            {(k.AccessAreas || []).length > 2 && (
                              <span className="text-[10px] font-bold text-gray-400">
                                +{(k.AccessAreas || []).length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 6: Thao tác lệnh */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {k.Status === 'REVOKED' ? (
                              /* NÚT CẤP LẠI PIN NỔI BẬT DÀNH CHO PHÒNG ĐÃ VÔ HIỆU HÓA */
                              <button
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setReissueModalKey(k); 
                                }}
                                title="Cấp lại mã PIN mới và khôi phục hiệu lực"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">vpn_key</span>
                                <span>Cấp Lại PIN</span>
                              </button>
                            ) : (
                              <>
                                {/* Nút Cấp lại / Đổi PIN nhanh */}
                                <button
                                  type="button"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setReissueModalKey(k); 
                                  }}
                                  title="Cấp lại / Đổi mã PIN mới cho phòng"
                                  className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">vpn_key</span>
                                </button>

                                {/* Nút Xem Chi Tiết PIN & Wallet */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setModalKey(k); }}
                                  title="Xem mã PIN & Thẻ Wallet"
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 text-gray-600 flex items-center justify-center transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">pin</span>
                                </button>

                                {/* Nút Gia hạn */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleExtendKey(k.KeyId, k.RoomNumber); }}
                                  title="Gia hạn giờ Check-out"
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-800 text-gray-600 flex items-center justify-center transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">update</span>
                                </button>

                                {/* Nút Thu hồi / Vô hiệu hóa */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRevokeKey(k.KeyId, k.RoomNumber); }}
                                  title="Thu hồi khóa và vô hiệu hóa mã PIN"
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-rose-100 hover:text-rose-800 text-gray-600 flex items-center justify-center transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">block</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phân trang footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Hiển thị 4 trong số {stats.totalActive} khóa quyền truy cập hiệu lực</span>
                <div className="flex items-center gap-2">
                  <button className="px-2.5 py-1 rounded-lg border bg-white hover:bg-gray-50 text-gray-600">Trước</button>
                  <span className="font-bold text-gray-900">Trang 1 / 36</span>
                  <button className="px-2.5 py-1 rounded-lg border bg-white hover:bg-gray-50 text-gray-900 font-bold">Sau</button>
                </div>
              </div>

            </div>

            {/* SƠ ĐỒ HẠ TẦNG IOT GATEWAY & VISIONLINE SERVER (GÓC DƯỚI TRÁI KHỚP MOCKUP) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-xl">device_hub</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Sơ Đồ Hạ Tầng IoT Gateway & Visionline Server
                    </h3>
                    <p className="text-xs text-gray-500">
                      Kết nối thời gian thực giữa bộ điều khiển cánh tầng, bộ mã hóa RFID và chốt cửa BLE
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ONLINE DUPLEX
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Node 1: Core Server */}
                <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono font-bold">
                    <span>01 // CORE SERVER</span>
                    <span className="material-symbols-outlined text-sm text-emerald-700">dns</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">PMS Gateway</div>
                  <div className="text-[11px] text-gray-500 font-mono">Port 9094 TLS 1.3</div>
                  <div className="text-[10px] text-emerald-700 font-bold pt-1">99.99% Uptime</div>
                </div>

                {/* Node 2: Encoder Hub */}
                <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono font-bold">
                    <span>02 // ENCODER HUB</span>
                    <span className="material-symbols-outlined text-sm text-blue-700">contactless</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">Visionline Pro</div>
                  <div className="text-[11px] text-gray-500 font-mono">Assa Abloy API v4.2</div>
                  <div className="text-[10px] text-blue-700 font-bold pt-1">Trạm nạp USB Connected</div>
                </div>

                {/* Node 3: Mesh Bridges */}
                <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono font-bold">
                    <span>03 // MESH BRIDGES</span>
                    <span className="material-symbols-outlined text-sm text-teal-700">hub</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">Zigbee Mesh (24 node)</div>
                  <div className="text-[11px] text-gray-500 font-mono">Tầng 1 đến Tầng 14</div>
                  <div className="text-[10px] text-teal-700 font-bold pt-1">248 Điểm Khóa Đã Nối</div>
                </div>

                {/* Node 4: Passkey Relay */}
                <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono font-bold">
                    <span>04 // PASSKEY RELAY</span>
                    <span className="material-symbols-outlined text-sm text-indigo-700">phone_iphone</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">Apple/Google Wallet</div>
                  <div className="text-[11px] text-gray-500 font-mono">Chứng thư số HSM Active</div>
                  <div className="text-[10px] text-indigo-700 font-bold pt-1">Auto Provisioning</div>
                </div>
              </div>

              {/* Dòng Log Live Stream */}
              <div className="bg-slate-900 text-emerald-400 rounded-xl p-2.5 font-mono text-[11px] flex items-center justify-between gap-3 overflow-hidden">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm text-emerald-500">live_tv</span>
                  <span className="text-white font-bold">LIVE STREAM:</span>
                  <span className="truncate">[14:02:18] MESH_NODE_T4: ACK khóa 407 (Battery level 24%, signal -64dBm)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase shrink-0">
                  SALTO VIRTUAL NETWORK READY
                </span>
              </div>
            </div>

          </div>

          {/* ================= CỘT PHẢI (5 PHẦN): TRẠM CẤP E-KEY & THẺ TỪ RFID ================= */}
          <div className="lg:col-span-4 space-y-5">

            {/* CARD FORM: TRẠM CẤP E-KEY & THẺ TỪ */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-xl">contactless</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Trạm Cấp E-Key & Thẻ Từ
                    </h3>
                    <p className="text-[10px] font-mono text-gray-400">DIRECT ENCODER BAY #01</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Chọn mã đặt phòng / số phòng */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 uppercase">
                  CHỌN MÃ ĐẶT PHÒNG / SỐ PHÒNG
                </label>
                <select
                  value={selectedRoomToIssue}
                  onChange={(e) => handleSelectRoomChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="804">RES-8891 // Phòng 804 (Arthur Dent)</option>
                  <option value="1401">RES-9902 // Phòng 1401 (Kenji Sato)</option>
                  <option value="407">RES-9921 // Phòng 407 (Clara Higgins)</option>
                  <option value="302">RES-9410 // Phòng 302 (Jonathan King)</option>
                  <option value="512">RES-9915 // Phòng 512 (Trần Hoàng Nam)</option>
                </select>
              </div>

              {/* Phân quyền khu vực mở rộng */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-mono font-bold text-gray-500 uppercase">
                  PHÂN QUYỀN KHU VỰC MỞ RỘNG
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.door}
                      onChange={() => toggleArea('door')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Cửa Phòng {selectedRoomToIssue}</span>
                  </label>

                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.elevator}
                      onChange={() => toggleArea('elevator')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Thang Máy Tầng 8</span>
                  </label>

                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.gymSpa}
                      onChange={() => toggleArea('gymSpa')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Phòng Gym & Spa</span>
                  </label>

                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.lounge}
                      onChange={() => toggleArea('lounge')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Executive Lounge</span>
                  </label>

                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.parking}
                      onChange={() => toggleArea('parking')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Bãi Xe VIP Ocean</span>
                  </label>

                  <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={accessAreas.beach}
                      onChange={() => toggleArea('beach')}
                      className="accent-emerald-600 rounded"
                    />
                    <span className="font-semibold text-gray-800">Cổng Biển Riêng</span>
                  </label>
                </div>
              </div>

              {/* Ngày bắt đầu & Giờ Check-out */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                    NGÀY BẮT ĐẦU
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                    GIỜ CHECK-OUT
                  </label>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* Box Đầu đọc RFID #01: Sẵn sàng ghi */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <span className="material-symbols-outlined text-xl">contactless</span>
                </div>
                <div className="text-xs font-bold text-emerald-900 uppercase">
                  ĐẦU ĐỌC RFID #01: SẴN SÀNG GHI
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">
                  Đặt thẻ Mifare Ultralight EV1 hoặc DESFire EV3 lên khay cảm ứng phía trước quầy lễ tân
                </p>
              </div>

              {/* 2 Nút Hành Động Lớn */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleIssueWalletKey}
                  disabled={isIssuingWallet}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-800/20 transition-all"
                >
                  <span className="material-symbols-outlined text-base">wallet</span>
                  {isIssuingWallet ? 'ĐANG TẠO MÃ PIN & DIGITAL KEY...' : 'GỬI E-KEY ĐẾN APPLE / GOOGLE WALLET'}
                </button>

                <button
                  type="button"
                  onClick={handleEncodeRfid}
                  disabled={isEncodingRfid}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-700/20 transition-all"
                >
                  <span className="material-symbols-outlined text-base">nfc</span>
                  {isEncodingRfid ? 'ĐANG MÃ HÓA THẺ TỪ...' : 'MÃ HÓA & GHI THẺ TỪ RFID TỨC THÌ'}
                </button>
              </div>
            </div>

            {/* CARD THÔNG SỐ PHẦN CỨNG CHỐT CỬA PHÒNG (KHỚP GÓC DƯỚI PHẢI MOCKUP) */}
            {selectedKey && (
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold font-mono text-gray-500 uppercase">
                    TỔNG QUAN PHẦN CỨNG PHÒNG {selectedKey.RoomNumber}
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border">
                    ASSA ABLOY NOIR
                  </span>
                </div>

                {/* BANNER NẾU PHÒNG ĐANG BỊ VÔ HIỆU HÓA */}
                {selectedKey.Status === 'REVOKED' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                      <span className="material-symbols-outlined text-lg text-rose-600">gpp_bad</span>
                      <span>PHÒNG ĐANG BỊ VÔ HIỆU HÓA QUYỀN MỞ CỬA</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Mã PIN cũ đã bị xóa khỏi hệ thống. Khách không thể mở cửa phòng {selectedKey.RoomNumber}. Bạn có thể cấp lại pass mới bất cứ lúc nào.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReissueModalKey(selectedKey)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">vpn_key</span>
                      <span>CẤP LẠI MÃ PIN & KHÔI PHỤC QUYỀN MỞ PHÒNG</span>
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div className="w-12 h-14 rounded-lg bg-gray-800 text-white flex flex-col items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-emerald-400">door_front</span>
                    <span className="text-[9px] font-mono">BLE</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-gray-900">
                      Chốt Điện Tử VingCard Signature
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      Serial: {selectedKey.HardwareSerial} • Firmware: {selectedKey.HardwareFirmware}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Cảm biến đóng cửa: {selectedKey.DoorSensorStatus}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">PIN KHÓA</div>
                    <div className="text-sm font-black text-emerald-700 mt-0.5">{selectedKey.BatteryLevel}%</div>
                  </div>

                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">TÍN HIỆU MESH</div>
                    <div className="text-sm font-black text-gray-900 mt-0.5">{selectedKey.SignalDbm} dBm</div>
                  </div>

                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">LẦN CHẠM CUỐI</div>
                    <div className="text-sm font-black text-gray-900 mt-0.5">{selectedKey.LastTapTime}</div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* =============================================================== */}
        {/* MODAL 1: CẤP LẠI MÃ PIN & KHÔI PHỤC HIỆU LỰC CHO PHÒNG */}
        {/* =============================================================== */}
        {reissueModalKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 text-left">
              
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">vpn_key</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">
                      Cấp Lại Mã PIN Phòng {reissueModalKey.RoomNumber}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Khách: <strong className="text-gray-800">{reissueModalKey.GuestName}</strong> ({reissueModalKey.BookingId})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReissueModalKey(null)}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Thông tin trạng thái */}
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                reissueModalKey.Status === 'REVOKED'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">
                    {reissueModalKey.Status === 'REVOKED' ? 'info' : 'check_circle'}
                  </span>
                  Trạng thái hiện tại: {reissueModalKey.Status === 'REVOKED' ? 'ĐANG BỊ VÔ HIỆU HÓA' : 'ĐANG HOẠT ĐỘNG'}
                </div>
                {reissueModalKey.Status === 'REVOKED'
                  ? 'Khi bạn xác nhận cấp lại, hệ thống sẽ kích hoạt lại trạng thái ACTIVE, nạp mã PIN mới vào MySQL Docker và đồng bộ ngay sang Gateway khóa cửa.'
                  : 'Bạn có thể đổi mã PIN mới cho khách nếu khách quên pass hoặc nghi ngờ mã cũ bị lộ.'}
              </div>

              {/* Chọn chế độ cấp mã PIN */}
              <div className="space-y-3">
                <label className="text-[11px] font-mono font-bold text-gray-500 uppercase tracking-wide block">
                  CHỌN PHƯƠNG THỨC TẠO MÃ PIN
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pinGenMode === 'AUTO' 
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="pinMode"
                      value="AUTO"
                      checked={pinGenMode === 'AUTO'}
                      onChange={() => setPinGenMode('AUTO')}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 font-bold text-xs text-gray-900 mb-1">
                      <span className="material-symbols-outlined text-emerald-600 text-base">autorenew</span>
                      Tự Động Tạo (6 Số)
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Hệ thống tự động sinh 6 số ngẫu nhiên có độ bảo mật cao nhất.
                    </p>
                  </label>

                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    pinGenMode === 'MANUAL' 
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="pinMode"
                      value="MANUAL"
                      checked={pinGenMode === 'MANUAL'}
                      onChange={() => setPinGenMode('MANUAL')}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 font-bold text-xs text-gray-900 mb-1">
                      <span className="material-symbols-outlined text-blue-600 text-base">edit</span>
                      Tự Nhập Thủ Công
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Đặt mã PIN dễ nhớ theo yêu cầu của khách (từ 4 - 8 chữ số).
                    </p>
                  </label>
                </div>

                {pinGenMode === 'MANUAL' && (
                  <div className="space-y-1.5 pt-1 animate-fade-in">
                    <label className="text-[11px] font-mono font-bold text-gray-600 uppercase">
                      NHẬP MÃ PIN TÙY CHỌN CHO KHÁCH (4 - 8 SỐ):
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={customPinInput}
                      onChange={(e) => setCustomPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ví dụ: 123456 hoặc ngày sinh khách"
                      className="w-full bg-gray-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-emerald-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-gray-400">Chỉ cho phép nhập ký tự số từ 0 đến 9.</span>
                  </div>
                )}
              </div>

              {/* Lệnh xác nhận */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReissueModalKey(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors"
                >
                  Đóng / Hủy
                </button>
                <button
                  type="button"
                  onClick={handleReissuePin}
                  disabled={isSubmittingReissue}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  {isSubmittingReissue ? 'ĐANG KÍCH HOẠT...' : 'XÁC NHẬN CẤP LẠI PASS & MỞ LẠI PHÒNG'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* MODAL 2: XEM CHI TIẾT DIGITAL KEY, MÃ PIN & QR WALLET */}
        {/* =============================================================== */}
        {modalKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-center">
              
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-2xl">key</span>
                  <div className="text-left">
                    <h4 className="text-base font-bold text-gray-900">Chi Tiết Khóa E-Key</h4>
                    <p className="text-[11px] text-gray-400 font-mono">#{modalKey.KeyId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalKey(null)}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Khối Mã PIN Mở Cửa To Đẹp */}
              <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl space-y-3">
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-mono">
                  MÃ PIN MỞ CỬA PHÒNG {modalKey.RoomNumber}
                </div>
                <div className="text-4xl font-mono font-black tracking-widest text-emerald-300">
                  {modalKey.PasscodePin || '******'}
                </div>
                <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                  Hiệu lực chính xác từ giờ Check-in đến Check-out:
                  <br />
                  <strong className="text-white">{modalKey.ValidFrom} —— {modalKey.ValidTo}</strong>
                </p>
                <div className="text-[10px] bg-black/30 rounded-lg p-2 font-mono text-emerald-200">
                  Tự động vô hiệu hóa trên Gateway Visionline khi quá giờ Check-out
                </div>
              </div>

              {/* Thông tin khách & Wallet Pass */}
              <div className="space-y-2 text-xs text-left bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Khách hàng:</span>
                  <strong className="text-gray-900">{modalKey.GuestName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã đặt phòng:</span>
                  <span className="font-mono font-bold text-gray-900">{modalKey.BookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hạng phòng:</span>
                  <span className="text-gray-900">{modalKey.RoomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thẻ RFID UID:</span>
                  <span className="font-mono text-emerald-700 font-bold">{modalKey.RfidCardUid || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(modalKey.PasscodePin || '');
                    showToast('Đã sao chép mã PIN vào bộ nhớ tạm!');
                  }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Sao Chép Mã PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`Đã gửi SMS chứa Digital Key tới ${modalKey.GuestPhone || 'khách'}!`);
                    setModalKey(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  Gửi SMS / Email
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
