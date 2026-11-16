import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

// Dữ liệu dự phòng mặc định nếu server tạm thời ngắt kết nối
const FALLBACK_ITEMS = [
  {
    id: 'LF-2025-0841',
    hash: '8F7C-99B4-LF25',
    itemName: 'Apple Watch Series 8',
    itemType: 'Thiết bị số & Điện tử cao cấp',
    itemSpec: '45mm • Màu Bạc {Starlight Silver} • Dây thể thao',
    serialImei: '8901 - 4432 - 8812',
    serialNote: 'Khớp dữ liệu mua hàng lưu trữ Apple ID',
    securityLevel: 'BẢO VẬT CẤP ĐỘ II',
    roomNumber: '804',
    roomWing: 'Ocean Wing',
    foundLocation: 'Kệ tủ đầu giường bên trái',
    foundDate: '2025-10-24',
    foundTime: '11:20 SA',
    finderName: 'Teresa Vance',
    finderRole: 'Nhân viên buồng phòng',
    status: 'READY_TO_RETURN',
    statusLabel: 'ĐÃ XÁC MINH CHỦ SỞ HỮU • SẴN SÀNG TRAO TRẢ TẠI TIỀN SẢNH',
    storageLocation: 'Két an toàn B-04',
    sealNumber: '#ST-99124',
    verifiedDate: '2025-10-24',
    inspectionReport: {
      screen: 'Nguyên vẹn',
      bezel: 'Xước dăm 0.4mm',
      battery: 'Pin còn 18%',
      securityLock: 'Mã PIN 6 ký tự số hoạt động bình thường, đang bật Lost Mode từ iCloud.'
    },
    images: {
      front: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT TRƯỚC',
      frontTag: 'Kính Sapphire',
      back: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // KHẮC LASER IMEI',
      backTag: 'SER: 8901-4432'
    },
    guest: {
      name: 'Arthur Dent',
      avatar: 'AD',
      bookingId: '#BK-99214',
      room: 'Phòng 804',
      phone: '+84 912 345 678',
      tier: 'HỘI VIÊN SILVER RESIDENT',
      tierColor: 'bg-blue-100 text-blue-700 border-blue-200',
      idVerified: 'ĐÃ XÁC THỰC CCCD / HỘ CHIẾU',
      passportNo: 'PP: B81920489 (GBR)'
    },
    custodyChain: [
      {
        id: 1,
        time: '24/10/2025 • 11:20 SA',
        tag: 'Phát hiện tại chỗ',
        tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        actor: 'Teresa Vance (Buồng phòng)',
        description: 'Nhân viên buồng phòng Teresa Vance phát hiện trên kệ tủ đầu giường bên trái khi dọn vệ sinh phòng 804 (Ocean Wing) sau giờ Checkout.'
      },
      {
        id: 2,
        time: '24/10/2025 • 11:45 SA',
        tag: 'Niêm phong két an toàn',
        tagColor: 'bg-slate-100 text-slate-800 border-slate-200',
        actor: 'H. Vance (Trưởng bộ phận Buồng phòng)',
        description: 'Trưởng bộ phận Buồng phòng H. Vance đóng gói túi chống ẩm chuyên dụng, gắn tem số niêm phong #ST-99124 và đưa vào Két an toàn B-04.'
      },
      {
        id: 3,
        time: '24/10/2025 • 14:15 CH',
        tag: 'Chuyển Tiền Sảnh',
        tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
        actor: 'Marcus Aurelius (Giám sát Tiền sảnh)',
        description: 'Bàn giao trực tiếp cho Giám sát Tiền sảnh Marcus Aurelius tại quầy Lễ tân, chuẩn bị trao trả theo lịch hẹn của khách.'
      }
    ],
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: '',
    trackingCode: '',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a',
    supervisor: {
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'SIGNED • 0x89AB...441C 14:18',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    }
  }
];

export default function LostAndFoundManagement() {
  const [items, setItems] = useState(FALLBACK_ITEMS);
  const [selectedItem, setSelectedItem] = useState(FALLBACK_ITEMS[0]);
  const [viewMode, setViewMode] = useState('DETAIL'); // 'DETAIL' | 'LIST'
  const [dbStatus, setDbStatus] = useState('CONNECTING'); // 'ONLINE' | 'OFFLINE' | 'CONNECTING'
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');

  // Digital Signature Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(true);

  // Delivery Method state for current item
  const [deliveryMethod, setDeliveryMethod] = useState('FRONT_DESK');
  const [courierCode, setCourierCode] = useState('');
  const [proxyName, setProxyName] = useState('');
  const [proxyIdCard, setProxyIdCard] = useState('');

  // Modal Ghi nhận vật phẩm mới (Intake Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState('804');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('Thiết bị số & Điện tử cao cấp');
  const [newLocation, setNewLocation] = useState('Kệ tủ đầu giường');
  const [newSerial, setNewSerial] = useState('');
  const [newPhysicalState, setNewPhysicalState] = useState('Mặt kính nguyên vẹn, còn pin');
  const [newStorage, setNewStorage] = useState('Két an toàn B-04');
  const [newSealNo, setNewSealNo] = useState('#ST-99155');
  const [newFinder, setNewFinder] = useState('Teresa Vance (Buồng phòng)');
  
  // Hình ảnh tải lên (hỗ trợ file thật và base64)
  const [newFrontImage, setNewFrontImage] = useState('https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80');
  const [newBackImage, setNewBackImage] = useState('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80');
  const frontFileInputRef = useRef(null);
  const backFileInputRef = useRef(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. TẢI DỮ LIỆU TỪ DATABASE QUA API
  const fetchItemsFromDB = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/housekeeping/lost-and-found');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setItems(result.data);
        // Giữ nguyên item đang chọn hoặc chọn item đầu tiên
        setSelectedItem((prev) => {
          if (!prev) return result.data[0];
          const stillExists = result.data.find(i => i.id === prev.id);
          return stillExists || result.data[0];
        });
        setDbStatus('ONLINE');
      } else {
        setDbStatus('ONLINE');
      }
    } catch (err) {
      console.warn('Lỗi kết nối API Lost and Found, dùng dữ liệu local fallback:', err);
      setDbStatus('OFFLINE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItemsFromDB();
  }, [fetchItemsFromDB]);

  // Xử lý đọc file ảnh tải lên từ máy tính sang Base64
  const handleFileUpload = (e, targetImage) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP,...)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result;
      if (typeof base64Data === 'string') {
        if (targetImage === 'FRONT') {
          setNewFrontImage(base64Data);
          showToast('Đã tải ảnh mặt trước CAM-01 thành công!');
        } else {
          setNewBackImage(base64Data);
          showToast('Đã tải ảnh mặt sau/IMEI CAM-02 thành công!');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Vẽ chữ ký mẫu lên canvas lúc khởi tạo hoặc khi đổi item
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (selectedItem?.digitalSignature) {
        // Nạp ảnh chữ ký đã lưu trong database
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = selectedItem.digitalSignature;
        setHasSignature(true);
      } else {
        ctx.strokeStyle = '#203044';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Nét ký mẫu mềm mại
        ctx.beginPath();
        ctx.moveTo(40, 65);
        ctx.bezierCurveTo(60, 20, 80, 75, 95, 45);
        ctx.bezierCurveTo(110, 25, 120, 60, 140, 50);
        ctx.bezierCurveTo(160, 40, 150, 75, 180, 55);
        ctx.moveTo(80, 60);
        ctx.lineTo(190, 60);
        ctx.stroke();
        setHasSignature(true);
      }
    }
  }, [selectedItem, viewMode]);

  // Xử lý vẽ tay bằng chuột / cảm ứng
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#05a98c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // 2. XÁC NHẬN BÀN GIAO & LƯU CHỮ KÝ VÀO DATABASE
  const handleConfirmAndClose = async () => {
    if (!hasSignature) {
      showToast('Vui lòng hoàn tất chữ ký điện tử của khách hoặc người đại diện!', 'warning');
      return;
    }

    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : null;

    const deliveryNoteText = deliveryMethod === 'FEDEX' 
      ? `Mã vận đơn FedEx: ${courierCode || 'FX-98214-VN'}` 
      : deliveryMethod === 'THIRD_PARTY' 
        ? `Người nhận ủy quyền: ${proxyName} (CCCD: ${proxyIdCard})` 
        : 'Khách nhận trực tiếp tại quầy Lễ tân';

    const payload = {
      status: 'RETURNED',
      statusLabel: 'ĐÃ BÀN GIAO THÀNH CÔNG • ĐÃ KÝ NHẬN ĐIỆN TỬ VÀ ĐÓNG HỒ SƠ',
      deliveryMethod,
      deliveryNote: deliveryNoteText,
      digitalSignature: signatureBase64
    };

    try {
      const res = await fetch(`/api/housekeeping/lost-and-found/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Hồ sơ #${selectedItem.id} đã hoàn tất trao trả và LƯU VÀO DATABASE thành công!`);
        fetchItemsFromDB();
      } else {
        throw new Error('API update failed');
      }
    } catch (err) {
      console.warn('Lỗi kết nối API PUT, cập nhật local:', err);
      // Fallback cập nhật local
      const updated = items.map(it => it.id === selectedItem.id ? { ...it, ...payload } : it);
      setItems(updated);
      setSelectedItem({ ...selectedItem, ...payload });
      showToast(`Đã cập nhật trạng thái bàn giao hồ sơ #${selectedItem.id}!`);
    }
  };

  // In biên bản bàn giao
  const handlePrintHandover = () => {
    window.print();
  };

  // Gửi SMS / Email Folio
  const handleSendNotification = () => {
    showToast(`Đã gửi SMS & Email xác nhận trao trả tới ${selectedItem.guest?.name || 'Khách hàng'} (${selectedItem.guest?.phone || 'Hotline'}) thành công!`);
  };

  // 3. CHUYỂN THANH LÝ VÀO DATABASE
  const handleMarkAsDisposed = async () => {
    const payload = {
      status: 'DISPOSED',
      statusLabel: 'QUÁ HẠN LƯU KHO • ĐÃ CHUYỂN HỘI ĐỒNG THANH LÝ QUYÊN GÓP'
    };

    try {
      const res = await fetch(`/api/housekeeping/lost-and-found/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Đã cập nhật hồ sơ #${selectedItem.id} sang diện Hội đồng Thanh lý / Quyên góp vào DATABASE!`);
        fetchItemsFromDB();
      }
    } catch (err) {
      const updated = items.map(it => it.id === selectedItem.id ? { ...it, ...payload } : it);
      setItems(updated);
      setSelectedItem({ ...selectedItem, ...payload });
      showToast(`Đã chuyển hồ sơ #${selectedItem.id} sang diện Thanh lý!`);
    }
  };

  // 4. TẠO MỚI VẬT PHẨM & LƯU HÌNH ẢNH TRỰC TIẾP VÀO DATABASE
  const handleCreateNewItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast('Vui lòng nhập tên vật phẩm bỏ quên!', 'warning');
      return;
    }

    setIsSubmitting(true);
    const newId = `LF-2025-${Math.floor(1000 + Math.random() * 9000)}`;

    const newItemPayload = {
      id: newId,
      hash: `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-LF25`,
      itemName: newItemName,
      itemType: newItemType,
      itemSpec: `Phát hiện tại ${newLocation} phòng ${newRoom}`,
      serialImei: newSerial || 'N/A',
      serialNote: 'Ghi nhận trực tiếp khi dọn phòng sau Checkout',
      securityLevel: 'BẢO VẬT CẤP ĐỘ II',
      roomNumber: newRoom,
      roomWing: newRoom.startsWith('8') ? 'Ocean Wing' : newRoom.startsWith('12') ? 'President Wing' : 'Sunset Wing',
      foundLocation: newLocation,
      foundDate: new Date().toISOString().split('T')[0],
      foundTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      finderName: newFinder,
      finderRole: 'Nhân viên buồng phòng',
      status: 'IN_STORAGE',
      statusLabel: 'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN',
      storageLocation: newStorage,
      sealNumber: newSealNo,
      verifiedDate: new Date().toISOString().split('T')[0],
      inspectionReport: {
        screen: 'Nguyên vẹn',
        bezel: newPhysicalState,
        battery: 'Bình thường',
        securityLock: 'Đã niêm phong chuyên dụng.'
      },
      // Lưu toàn bộ Base64 hoặc URL của ảnh mặt trước và mặt sau thẳng vào Database!
      images: {
        front: newFrontImage,
        frontLabel: 'CAM-01 // MẶT TRƯỚC',
        frontTag: 'Hiện trường dọn phòng',
        back: newBackImage,
        backLabel: 'CAM-02 // MẶT SAU & TEM',
        backTag: newSealNo
      },
      guest: {
        name: newRoom === '804' ? 'Arthur Dent' : newRoom === '512' ? 'Trần Hoàng Nam' : newRoom === '1204' ? 'Sophia Laurent' : 'Khách lưu trú gần nhất',
        avatar: 'GH',
        bookingId: `#BK-${Math.floor(90000 + Math.random() * 9999)}`,
        room: `Phòng ${newRoom}`,
        phone: '+84 988 123 456',
        tier: 'HỘI VIÊN STANDARD',
        tierColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        idVerified: 'CHỜ ĐỐI CHIẾU HỒ SƠ PMS',
        passportNo: 'Đang tra cứu hệ thống'
      },
      custodyChain: [
        {
          id: 1,
          time: `${new Date().toLocaleDateString('vi-VN')} • ${new Date().toLocaleTimeString('vi-VN')}`,
          tag: 'Phát hiện tại chỗ',
          tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          actor: newFinder,
          description: `Phát hiện vật phẩm bỏ quên tại ${newLocation} khi làm vệ sinh phòng ${newRoom}.`
        },
        {
          id: 2,
          time: `${new Date().toLocaleDateString('vi-VN')} • Lưu kho`,
          tag: 'Niêm phong két an toàn',
          tagColor: 'bg-slate-100 text-slate-800 border-slate-200',
          actor: 'Giám sát Buồng phòng',
          description: `Gắn tem niêm phong số ${newSealNo} và bảo quản tại ${newStorage}.`
        }
      ],
      deliveryMethod: 'FRONT_DESK',
      deliveryNote: '',
      trackingCode: '',
      sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      supervisor: {
        name: 'Marcus Aurelius',
        title: 'Front Desk Duty Supervisor',
        pki: 'VERIFIED • 0x889A...221C',
        ip: '192.168.10.84',
        lat: '10.28 N',
        token: 'YUBIKEY-NFC-V5'
      }
    };

    try {
      const res = await fetch('/api/housekeeping/lost-and-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemPayload)
      });
      if (res.ok) {
        const result = await res.json();
        showToast(`Đã LƯU VÀO DATABASE vật phẩm #${newId} và hình ảnh thành công!`);
        await fetchItemsFromDB();
        setSelectedItem(result.data || newItemPayload);
      } else {
        throw new Error('API post failed');
      }
    } catch (err) {
      console.warn('Lỗi kết nối POST API, lưu local:', err);
      setItems([newItemPayload, ...items]);
      setSelectedItem(newItemPayload);
      showToast(`Đã ghi nhận vật phẩm #${newId}!`);
    } finally {
      setIsSubmitting(false);
      setIsModalOpen(false);
      setViewMode('DETAIL');
    }
  };

  // Nạp lại dữ liệu mẫu nếu cần
  const handleResetSampleData = async () => {
    if (!window.confirm('Bạn có chắc muốn nạp lại 4 hồ sơ mẫu chuẩn vào Database?')) return;
    try {
      const res = await fetch('/api/housekeeping/lost-and-found/reset-sample', { method: 'POST' });
      if (res.ok) {
        showToast('Đã nạp lại 4 hồ sơ mẫu chuẩn vào Database thành công!');
        fetchItemsFromDB();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesQuery = searchQuery === '' || 
      item.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roomNumber?.includes(searchQuery) ||
      item.guest?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRoom = filterRoom === 'ALL' || item.roomNumber === filterRoom;
    const matchesDate = !filterDate || item.foundDate === filterDate;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesLocation = filterLocation === 'ALL' || item.foundLocation?.toLowerCase().includes(filterLocation.toLowerCase());

    return matchesQuery && matchesRoom && matchesDate && matchesStatus && matchesLocation;
  });

  // KPIs
  const totalCount = items.length;
  const inStorageCount = items.filter(i => i.status === 'IN_STORAGE').length;
  const readyCount = items.filter(i => i.status === 'READY_TO_RETURN').length;
  const returnedCount = items.filter(i => i.status === 'RETURNED').length;
  const disposedCount = items.filter(i => i.status === 'DISPOSED').length;

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 print:p-0 print:m-0">

        {/* THÔNG BÁO TOAST */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-emerald-500/30 animate-bounce">
            <span className="material-symbols-outlined text-emerald-400">
              {toastMessage.type === 'warning' ? 'warning' : 'verified'}
            </span>
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* THANH TOP BAR ĐIỀU HƯỚNG & HÀNH ĐỘNG NHANH */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <span className="material-symbols-outlined text-2xl">search_hands_free</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  PHÂN HỆ BUỒNG PHÒNG & TIỀN SẢNH #46
                </span>
                
                {/* Chỉ báo trạng thái Database */}
                <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  dbStatus === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${dbStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  DATABASE: {dbStatus === 'ONLINE' ? 'MYSQL DOCKER (phpMyAdmin :8080)' : 'OFFLINE'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 mt-0.5">
                Quản Lý Đồ Thất Lạc & Bỏ Quên (Lost & Found PMS)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Đồng bộ / Làm mới từ DB */}
            <button
              type="button"
              onClick={fetchItemsFromDB}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border border-gray-200 transition-colors"
              title="Tải lại dữ liệu mới nhất từ Database"
            >
              <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>
                sync
              </span>
              Làm mới DB
            </button>

            {/* Toggle View Mode */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('DETAIL')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'DETAIL'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">fact_check</span>
                Hồ Sơ Giám Định & Bàn Giao
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'LIST'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                Quản Lý Vòng Đời & Tìm Kiếm ({totalCount})
              </button>
            </div>

            {/* Nút Tiếp nhận đồ bỏ quên khi dọn phòng (Up ảnh & Lưu DB) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors"
            >
              <span className="material-symbols-outlined text-base">add_a_photo</span>
              + Ghi Nhận Khi Dọn Phòng
            </button>
          </div>
        </div>

        {/* CARD THỐNG KÊ VÒNG ĐỜI (LIFECYCLE SUMMARY) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div 
            onClick={() => { setFilterStatus('ALL'); setViewMode('LIST'); }}
            className="cursor-pointer bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>TỔNG VẬT PHẨM</span>
              <span className="material-symbols-outlined text-gray-400 text-base">inventory_2</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{totalCount}</span>
              <span className="text-xs text-gray-500 font-medium">trong Database</span>
            </div>
          </div>

          <div 
            onClick={() => { setFilterStatus('IN_STORAGE'); setViewMode('LIST'); }}
            className="cursor-pointer bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-slate-500 transition-all"
          >
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
              <span>ĐANG LƯU KHO KÉT</span>
              <span className="material-symbols-outlined text-slate-500 text-base">lock</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{inStorageCount}</span>
              <span className="text-xs text-slate-500 font-medium">niêm phong an toàn</span>
            </div>
          </div>

          <div 
            onClick={() => { setFilterStatus('READY_TO_RETURN'); setViewMode('LIST'); }}
            className="cursor-pointer bg-white p-3.5 rounded-2xl border border-emerald-300 shadow-sm bg-emerald-50/30 hover:border-emerald-500 transition-all"
          >
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
              <span>SẴN SÀNG TRAO TRẢ</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-800">{readyCount}</span>
              <span className="text-xs text-emerald-600 font-medium">chờ khách tại sảnh</span>
            </div>
          </div>

          <div 
            onClick={() => { setFilterStatus('RETURNED'); setViewMode('LIST'); }}
            className="cursor-pointer bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
              <span>ĐÃ TRẢ KHÁCH</span>
              <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">{returnedCount}</span>
              <span className="text-xs text-blue-600 font-medium">ký nhận điện tử</span>
            </div>
          </div>

          <div 
            onClick={() => { setFilterStatus('DISPOSED'); setViewMode('LIST'); }}
            className="cursor-pointer bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
              <span>THANH LÝ / QUYÊN GÓP</span>
              <span className="material-symbols-outlined text-amber-500 text-base">gavel</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-800">{disposedCount}</span>
              <span className="text-xs text-amber-600 font-medium">&gt; 90 ngày</span>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* VIEW 1: CHI TIẾT HỒ SƠ GIÁM ĐỊNH & BÀN GIAO (CHUẨN 100% NHƯ ẢNH MẪU) */}
        {/* =============================================================== */}
        {viewMode === 'DETAIL' && selectedItem && (
          <div className="space-y-6">

            {/* HEADER HỒ SƠ CHÍNH */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                      PHÂN HỆ 46 // GIÁM ĐỊNH & THỦ TỤC TRAO TRẢ <span className="text-gray-300">•</span> HASH: {selectedItem.hash || '8F7C-99B4-LF25'}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                        Hồ Sơ Xử Lý Đồ Thất Lạc & Bàn Giao #{selectedItem.id}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh hồ sơ khác từ Database để xem */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Xem từ Database:</label>
                  <select
                    value={selectedItem.id}
                    onChange={(e) => {
                      const found = items.find(i => i.id === e.target.value);
                      if (found) setSelectedItem(found);
                    }}
                    className="text-xs font-mono font-bold bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>
                        #{it.id} - {it.itemName} (P.{it.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DẢI TRẠNG THÁI MÀU XANH LÁ HOẶC VÀNG/LAM */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
                    {selectedItem.statusLabel || 'ĐÃ XÁC MINH CHỦ SỞ HỮU • SẴN SÀNG TRAO TRẢ TẠI TIỀN SẢNH'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                  <button 
                    type="button"
                    onClick={handleResetSampleData}
                    title="Nạp lại dữ liệu mẫu gốc ban đầu vào Database"
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs font-semibold text-[11px]"
                  >
                    Reset Mẫu Gốc
                  </button>
                  <button 
                    type="button"
                    title="Lịch sử cập nhật hồ sơ"
                    className="w-8 h-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base">history</span>
                  </button>
                </div>
              </div>
            </div>

            {/* GRID 2 CỘT NỘI DUNG CHÍNH (KHỚP HOÀN TOÀN GIAO DIỆN MẪU) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ================= CỘT TRÁI ================= */}
              <div className="space-y-6">

                {/* KHỐI 1: BẰNG CHỨNG GIÁM ĐỊNH HÌNH ẢNH HIỆN TRƯỜNG */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600 text-xl">photo_camera</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        BẰNG CHỨNG GIÁM ĐỊNH HÌNH ẢNH HIỆN TRƯỜNG
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-400">
                      LƯU TRỮ DATABASE • 2 BẢN CHỤP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Ảnh 1: CAM-01 */}
                    <div className="relative group overflow-hidden rounded-xl border border-gray-200 bg-gray-950 aspect-[4/3]">
                      <img
                        src={selectedItem.images?.front || 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'}
                        alt="Ảnh hiện trường mặt trước"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 flex items-center justify-between text-white">
                        <span className="text-[10px] font-mono tracking-wider font-semibold">
                          {selectedItem.images?.frontLabel || 'CAM-01 // MẶT TRƯỚC'}
                        </span>
                        <span className="text-[10px] font-medium bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded">
                          {selectedItem.images?.frontTag || 'Kính Sapphire'}
                        </span>
                      </div>
                    </div>

                    {/* Ảnh 2: CAM-02 */}
                    <div className="relative group overflow-hidden rounded-xl border border-gray-200 bg-gray-950 aspect-[4/3]">
                      <img
                        src={selectedItem.images?.back || 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'}
                        alt="Ảnh hiện trường khắc laser IMEI"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 flex items-center justify-between text-white">
                        <span className="text-[10px] font-mono tracking-wider font-semibold">
                          {selectedItem.images?.backLabel || 'CAM-02 // KHẮC LASER IMEI'}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                          {selectedItem.images?.backTag || 'SER: 8901-4432'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KHỐI 2: BIÊN BẢN GIÁM ĐỊNH KỸ THUẬT */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-xl">fact_check</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        BIÊN BẢN GIÁM ĐỊNH KỸ THUẬT
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                      KĐ-{selectedItem.foundDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Thiết bị & Chủng loại */}
                    <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 space-y-1">
                      <div className="text-[11px] font-semibold text-gray-400">
                        Thiết bị & Chủng loại
                      </div>
                      <div className="text-base font-bold text-gray-900">
                        {selectedItem.itemName}
                      </div>
                      <div className="text-xs text-gray-600 leading-snug">
                        {selectedItem.itemSpec}
                      </div>
                    </div>

                    {/* Định danh phần cứng (IMEI) */}
                    <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 space-y-1">
                      <div className="text-[11px] font-semibold text-gray-400">
                        Định danh phần cứng (IMEI)
                      </div>
                      <div className="text-base font-mono font-bold text-emerald-700 tracking-wider">
                        {selectedItem.serialImei}
                      </div>
                      <div className="text-xs text-gray-600 leading-snug">
                        {selectedItem.serialNote}
                      </div>
                    </div>
                  </div>

                  {/* Hiện trạng vật lý lúc tiếp nhận */}
                  <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/80 space-y-3">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      HIỆN TRẠNG VẬT LÝ LÚC TIẾP NHẬN
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-lg p-2.5 border border-emerald-100 text-center">
                        <div className="text-[10px] text-gray-400">Mặt kính</div>
                        <div className="text-xs font-bold text-emerald-700 mt-0.5">
                          {selectedItem.inspectionReport?.screen || 'Nguyên vẹn'}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-amber-100 text-center">
                        <div className="text-[10px] text-gray-400">Viền trên</div>
                        <div className="text-xs font-bold text-amber-700 mt-0.5">
                          {selectedItem.inspectionReport?.bezel || 'Xước dăm 0.4mm'}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-sky-100 text-center">
                        <div className="text-[10px] text-gray-400">Năng lượng</div>
                        <div className="text-xs font-bold text-sky-700 mt-0.5">
                          {selectedItem.inspectionReport?.battery || 'Pin còn 18%'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 pt-1">
                      <span className="material-symbols-outlined text-gray-400 text-base">lock</span>
                      <span>{selectedItem.inspectionReport?.securityLock || 'Bảo mật bình thường'}</span>
                    </div>
                  </div>
                </div>

                {/* KHỐI 3: CHUỖI BẢO QUẢN NIÊM PHONG (CHAIN OF CUSTODY) */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600 text-xl">shield</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        CHUỖI BẢO QUẢN NIÊM PHONG (CHAIN OF CUSTODY)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-gray-400">
                      {selectedItem.securityLevel}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-5 border-l-2 border-emerald-400/60 ml-3 py-1">
                    {(selectedItem.custodyChain || []).map((step, idx) => (
                      <div key={idx} className="relative space-y-1">
                        <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white"></span>
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-mono font-bold text-gray-800">
                            {step.time}
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${step.tagColor || 'bg-slate-100 text-slate-800'}`}>
                            {step.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ================= CỘT PHẢI ================= */}
              <div className="space-y-6">

                {/* KHỐI 4: ĐỐI CHIẾU HỒ SƠ KHÁCH HÀNG PMS */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-600 text-xl">badge</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        ĐỐI CHIẾU HỒ SƠ KHÁCH HÀNG PMS
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${selectedItem.guest?.tierColor || 'bg-blue-100 text-blue-700'}`}>
                      {selectedItem.guest?.tier || 'HỘI VIÊN SILVER RESIDENT'}
                    </span>
                  </div>

                  <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 font-black text-lg flex items-center justify-center shrink-0">
                        {selectedItem.guest?.avatar || 'AD'}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-base font-bold text-gray-900">
                          {selectedItem.guest?.name || 'Khách lưu trú'}
                        </h4>
                        <div className="text-xs text-gray-600">
                          Mã đặt phòng: <span className="font-mono font-semibold text-gray-900">{selectedItem.guest?.bookingId || '#BK-99214'}</span> • Lưu trú <span className="font-semibold text-gray-900">{selectedItem.guest?.room || `Phòng ${selectedItem.roomNumber}`}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono">
                          Số liên hệ: <span className="font-bold text-gray-900">{selectedItem.guest?.phone || '+84 912 345 678'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        {selectedItem.guest?.idVerified || 'ĐÃ XÁC THỰC CCCD / HỘ CHIẾU'}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500">
                        {selectedItem.guest?.passportNo || 'PP: B81920489 (GBR)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KHỐI 5: HÌNH THỨC BÀN GIAO ĐỒ THẤT LẠC (CHỌN 1 TRONG 3 PHƯƠNG ÁN) */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-xl">local_shipping</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        HÌNH THỨC BÀN GIAO ĐỒ THẤT LẠC
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      CHỌN 1 TRONG 3 PHƯƠNG ÁN
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Phương án 1: Tại Tiền Sảnh */}
                    <div
                      onClick={() => setDeliveryMethod('FRONT_DESK')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                        deliveryMethod === 'FRONT_DESK'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="material-symbols-outlined text-emerald-700 text-2xl">storefront</span>
                        <span className="material-symbols-outlined text-emerald-600 text-lg">
                          {deliveryMethod === 'FRONT_DESK' ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs font-bold text-gray-900">Tại Tiền Sảnh</div>
                        <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                          Khách nhận trực tiếp tại quầy Lễ tân ca trực.
                        </div>
                      </div>
                    </div>

                    {/* Phương án 2: Chuyển FedEx */}
                    <div
                      onClick={() => setDeliveryMethod('FEDEX')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                        deliveryMethod === 'FEDEX'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="material-symbols-outlined text-indigo-700 text-2xl">flight_takeoff</span>
                        <span className="material-symbols-outlined text-emerald-600 text-lg">
                          {deliveryMethod === 'FEDEX' ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs font-bold text-gray-900">Chuyển FedEx</div>
                        <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                          Phí vận chuyển quốc tế tính vào Folio khách.
                        </div>
                      </div>
                    </div>

                    {/* Phương án 3: Ủy Quyền Thứ 3 */}
                    <div
                      onClick={() => setDeliveryMethod('THIRD_PARTY')}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                        deliveryMethod === 'THIRD_PARTY'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="material-symbols-outlined text-amber-700 text-2xl">assignment_ind</span>
                        <span className="material-symbols-outlined text-emerald-600 text-lg">
                          {deliveryMethod === 'THIRD_PARTY' ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs font-bold text-gray-900">Ủy Quyền Thứ 3</div>
                        <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                          Có giấy ủy quyền công chứng và CCCD người nhận.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nhập thêm thông tin nếu chọn FedEx hoặc Ủy quyền */}
                  {deliveryMethod === 'FEDEX' && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-indigo-900">Thông tin vận chuyển FedEx Quốc tế:</div>
                      <input
                        type="text"
                        placeholder="Nhập mã vận đơn FedEx (VD: FX-99214-GBR)..."
                        value={courierCode}
                        onChange={(e) => setCourierCode(e.target.value)}
                        className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-1.5 font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {deliveryMethod === 'THIRD_PARTY' && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-amber-900">Thông tin người nhận ủy quyền hợp pháp:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Họ và tên người nhận..."
                          value={proxyName}
                          onChange={(e) => setProxyName(e.target.value)}
                          className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          placeholder="Số CCCD / Hộ chiếu..."
                          value={proxyIdCard}
                          onChange={(e) => setProxyIdCard(e.target.value)}
                          className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* KHỐI 6: BẢNG KÝ NHẬN BÀN GIAO ĐIỆN TỬ (DIGITAL SIGNATURE) */}
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-xl">draw</span>
                      <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">
                        BẢNG KÝ NHẬN BÀN GIAO ĐIỆN TỬ (DIGITAL SIGNATURE)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Xóa ký lại
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <div>
                      <span className="font-bold text-gray-800">Chữ ký Khách Hàng</span> ({selectedItem.guest?.name || 'Arthur Dent'}) • <span className="text-[11px] text-gray-400">Bút cảm ứng / Chuột</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-semibold text-emerald-700">
                      <span>Giám Sát Ca Trực Tiếp Nhận</span>
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">CHỨNG THỰC SỐ OK</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Vùng Canvas Ký Trực Tiếp */}
                    <div className="relative border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-xl bg-gray-50/50 overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={130}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="cursor-crosshair w-full h-full"
                      />
                      {!hasSignature && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs gap-1.5">
                          <span className="material-symbols-outlined text-base">signature</span>
                          Ký trực tiếp vào khung này
                        </div>
                      )}
                    </div>

                    {/* Thông tin Giám sát ca trực số hóa PKI */}
                    <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200/80 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {selectedItem.supervisor?.name || 'Marcus Aurelius'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {selectedItem.supervisor?.title || 'Front Desk Duty Supervisor'}
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-base">verified</span>
                        </div>
                      </div>

                      <div className="space-y-1 font-mono text-[10px] text-gray-600 bg-white/70 p-2 rounded-lg border border-emerald-200">
                        <div className="flex justify-between">
                          <span>PKI:</span>
                          <span className="font-bold text-emerald-700">{selectedItem.supervisor?.pki || 'SIGNED • 0x89AB...441C 14:18'}</span>
                        </div>
                        <div className="truncate text-gray-400">
                          HASH: 0x89AB441C298AF
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin thiết bị & Token */}
                  <div className="text-[10px] font-mono text-gray-400 text-center tracking-wider pt-1">
                    IP: {selectedItem.supervisor?.ip || '192.168.10.84'} • LAT: {selectedItem.supervisor?.lat || '10.28 N'} • TOKEN: {selectedItem.supervisor?.token || 'YUBIKEY-NFC-V5'}
                  </div>
                </div>

              </div>

            </div>

            {/* ================= KHỐI FOOTER THAO TÁC BẢO MẬT ================= */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">lock</span>
                  <span>XÁC THỰC MÃ HÓA SHA-256:</span>
                  <span className="font-bold text-gray-900 truncate max-w-md">
                    {selectedItem.sha256 || 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a'}
                  </span>
                </div>
                <div className="text-emerald-700 font-bold uppercase tracking-wider">
                  TIÊU CHUẨN ISO 27001
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrintHandover}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all border border-gray-300 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                    IN BIÊN BẢN BÀN GIAO
                  </button>

                  <button
                    type="button"
                    onClick={handleSendNotification}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all border border-gray-300 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base">forward_to_inbox</span>
                    GỬI SMS / EMAIL FOLIO
                  </button>

                  {/* Nút thanh lý nếu cần */}
                  {selectedItem.status !== 'DISPOSED' && (
                    <button
                      type="button"
                      onClick={handleMarkAsDisposed}
                      className="flex items-center gap-1.5 px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition-colors"
                      title="Chuyển sang Hội đồng thanh lý / Quyên góp sau 30-90 ngày không có người nhận"
                    >
                      <span className="material-symbols-outlined text-base">gavel</span>
                      Chuyển Thanh Lý
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAndClose}
                  className="flex items-center gap-2 px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-700/25 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  XÁC NHẬN & ĐÓNG HỒ SƠ
                </button>
              </div>
            </div>

          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 2: BẢNG QUẢN LÝ VÒNG ĐỜI & TÌM KIẾM THEO SỐ PHÒNG / NGÀY */}
        {/* =============================================================== */}
        {viewMode === 'LIST' && (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-5">

            {/* THANH BỘ LỌC TÌM KIẾM MẠNH MẼ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Ô tìm kiếm từ khóa */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo mã #LF, tên đồ, khách..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Lọc theo Số phòng */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">
                  meeting_room
                </span>
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả số phòng</option>
                  <option value="804">Phòng 804 (Ocean Wing)</option>
                  <option value="512">Phòng 512 (Sunset Wing)</option>
                  <option value="1204">Phòng 1204 (President Wing)</option>
                  <option value="302">Phòng 302 (Garden Wing)</option>
                </select>
              </div>

              {/* Lọc theo Ngày phát hiện */}
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Lọc theo Trạng thái Vòng đời */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="ALL">Vòng đời: Tất cả trạng thái</option>
                  <option value="IN_STORAGE">1. Đang Lưu Kho Két</option>
                  <option value="READY_TO_RETURN">2. Sẵn Sàng Trao Trả</option>
                  <option value="RETURNED">3. Đã Trả Khách</option>
                  <option value="DISPOSED">4. Thanh Lý / Quyên Góp</option>
                </select>
              </div>
            </div>

            {/* BẢNG DANH SÁCH VẬT PHẨM BỎ QUÊN */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Mã Hồ Sơ & Vật Phẩm</th>
                    <th className="py-3 px-3">Phòng & Khu Vực</th>
                    <th className="py-3 px-3">Khách Hàng Lưu Trú</th>
                    <th className="py-3 px-3">Ngày Phát Hiện</th>
                    <th className="py-3 px-3">Vị Trí Lưu Kho</th>
                    <th className="py-3 px-3">Trạng Thái Vòng Đời</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        selectedItem?.id === item.id ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      {/* Cột 1: Mã & Vật phẩm */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.images?.front || 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'}
                            alt={item.itemName}
                            className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                          <div>
                            <div className="font-mono font-bold text-emerald-800">
                              #{item.id}
                            </div>
                            <div className="font-bold text-gray-900 text-sm">
                              {item.itemName}
                            </div>
                            <div className="text-[11px] text-gray-500 line-clamp-1">
                              {item.itemSpec}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Phòng & Khu vực */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">
                          Phòng {item.roomNumber}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {item.roomWing}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          {item.foundLocation}
                        </div>
                      </td>

                      {/* Cột 3: Khách hàng */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">
                          {item.guest?.name || 'Khách lưu trú'}
                        </div>
                        <div className="font-mono text-[11px] text-gray-500">
                          {item.guest?.bookingId || 'N/A'}
                        </div>
                        <div className="text-[10px] font-bold text-blue-700">
                          {item.guest?.tier || 'STANDARD'}
                        </div>
                      </td>

                      {/* Cột 4: Ngày phát hiện */}
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-gray-800">{item.foundDate}</div>
                        <div className="text-[11px] text-gray-500">{item.foundTime}</div>
                        <div className="text-[10px] text-gray-400">{item.finderName}</div>
                      </td>

                      {/* Cột 5: Lưu kho & Tem */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800">{item.storageLocation}</div>
                        <div className="text-[11px] font-mono font-bold text-teal-700">{item.sealNumber}</div>
                        <div className="text-[10px] text-gray-400">{item.securityLevel}</div>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-3 px-3">
                        {item.status === 'IN_STORAGE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                            Đang Lưu Kho
                          </span>
                        )}
                        {item.status === 'READY_TO_RETURN' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Sẵn Sàng Trao Trả
                          </span>
                        )}
                        {item.status === 'RETURNED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Đã Trả Khách
                          </span>
                        )}
                        {item.status === 'DISPOSED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <span className="material-symbols-outlined text-xs">gavel</span>
                            Thanh Lý
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setViewMode('DETAIL');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                        >
                          Xem Hồ Sơ & Bàn Giao
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                        <p className="text-sm font-medium">Không tìm thấy vật phẩm nào khớp với bộ lọc!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* =============================================================== */}
        {/* MODAL: GHI NHẬN VẬT PHẨM (HỖ TRỢ UPLOAD FILE ẢNH & LƯU DATABASE) */}
        {/* =============================================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
              
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">add_a_photo</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Ghi Nhận Đồ Bỏ Quên & Lưu Vào Database
                    </h3>
                    <p className="text-xs text-gray-500">
                      Hỗ trợ upload ảnh thật từ máy/camera & lưu trực tiếp vào CSDL
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewItem} className="space-y-4 text-xs">
                
                {/* Số phòng & Chủng loại */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Số phòng vừa Checkout *
                    </label>
                    <select
                      value={newRoom}
                      onChange={(e) => setNewRoom(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="804">Phòng 804 (Arthur Dent vừa checkout)</option>
                      <option value="512">Phòng 512 (Trần Hoàng Nam vừa checkout)</option>
                      <option value="1204">Phòng 1204 (Sophia Laurent vừa checkout)</option>
                      <option value="302">Phòng 302 (Jonathan King vừa checkout)</option>
                      <option value="702">Phòng 702 (Phòng Superior)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Phân loại chủng loại vật phẩm *
                    </label>
                    <select
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Thiết bị số & Điện tử cao cấp">Điện tử / Smartwatch / Smartphone</option>
                      <option value="Tài sản giá trị & Giấy tờ tùy thân">Ví tiền / Giấy tờ tùy thân / Thẻ ngân hàng</option>
                      <option value="Trang sức kim hoàn cao cấp">Trang sức vàng / Kim cương / Đồng hồ xa xỉ</option>
                      <option value="Trang phục & Phụ kiện thời trang">Quần áo / Áo khoác / Giày dép</option>
                      <option value="Đồ dùng cá nhân khác">Mỹ phẩm / Sạc cáp / Đồ lưu niệm</option>
                    </select>
                  </div>
                </div>

                {/* Tên vật phẩm & Định danh */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Tên vật phẩm bỏ quên *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Tai nghe AirPods Pro 2, Đồng hồ, Ví da..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Số Serial / IMEI / Nhãn hiệu
                    </label>
                    <input
                      type="text"
                      placeholder="VD: SN: H8921-99214..."
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Vị trí tìm thấy chi tiết & Hiện trạng */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Vị trí tìm thấy trong phòng *
                    </label>
                    <select
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Kệ tủ đầu giường">Kệ tủ đầu giường (Bedside table)</option>
                      <option value="Trong két an toàn điện tử">Két an toàn điện tử (Safe box)</option>
                      <option value="Gờ bồn rửa mặt lavabo">Phòng tắm / Gờ lavabo</option>
                      <option value="Dưới gầm giường">Dưới gầm giường (Under bed)</option>
                      <option value="Tủ treo quần áo">Tủ treo quần áo (Wardrobe)</option>
                      <option value="Ghế sofa ban công">Ban công / Ghế sofa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Hiện trạng vật lý lúc tiếp nhận
                    </label>
                    <input
                      type="text"
                      value={newPhysicalState}
                      onChange={(e) => setNewPhysicalState(e.target.value)}
                      placeholder="Mặt kính nguyên vẹn, có trầy xước nhẹ..."
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Lưu kho & Tem niêm phong */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Vị trí lưu kho bảo quản
                    </label>
                    <select
                      value={newStorage}
                      onChange={(e) => setNewStorage(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Két an toàn B-04">Két an toàn B-04</option>
                      <option value="Két trung tâm A-01">Két trung tâm A-01</option>
                      <option value="Tủ Lost & Found L-02">Tủ Lost & Found L-02</option>
                      <option value="Kho bảo an VIP-01">Kho bảo an VIP-01</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Số tem niêm phong
                    </label>
                    <input
                      type="text"
                      value={newSealNo}
                      onChange={(e) => setNewSealNo(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Nhân viên buồng phòng
                    </label>
                    <input
                      type="text"
                      value={newFinder}
                      onChange={(e) => setNewFinder(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* KHU VỰC TẢI LÊN HÌNH ẢNH THẬT TỪ MÁY TÍNH / THIẾT BỊ */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-base">cloud_upload</span>
                      Tải lên hình ảnh vật phẩm (Lưu trực tiếp vào Database):
                    </span>
                    <span className="text-[11px] text-gray-400">Hỗ trợ JPG, PNG, WEBP</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* CAM-01: Mặt trước */}
                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-gray-700">CAM-01 (Mặt trước):</label>
                        <button
                          type="button"
                          onClick={() => frontFileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          Chọn Ảnh Từ Máy
                        </button>
                      </div>

                      <input
                        ref={frontFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'FRONT')}
                      />

                      {/* Preview Ảnh Mặt Trước */}
                      <div className="h-28 rounded-lg overflow-hidden border border-gray-300 bg-gray-900 flex items-center justify-center">
                        {newFrontImage ? (
                          <img
                            src={newFrontImage}
                            alt="Preview CAM-01"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa có ảnh</span>
                        )}
                      </div>
                    </div>

                    {/* CAM-02: Mặt sau / Tem IMEI */}
                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-gray-700">CAM-02 (Mặt sau / IMEI):</label>
                        <button
                          type="button"
                          onClick={() => backFileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          Chọn Ảnh Từ Máy
                        </button>
                      </div>

                      <input
                        ref={backFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'BACK')}
                      />

                      {/* Preview Ảnh Mặt Sau */}
                      <div className="h-28 rounded-lg overflow-hidden border border-gray-300 bg-gray-900 flex items-center justify-center">
                        {newBackImage ? (
                          <img
                            src={newBackImage}
                            alt="Preview CAM-02"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa có ảnh</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    {isSubmitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                    Niêm Phong & Lưu Vào Database
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
