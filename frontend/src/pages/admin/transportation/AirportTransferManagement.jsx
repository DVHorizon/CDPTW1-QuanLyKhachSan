import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const INITIAL_TRANSFERS = [
  {
    id: 'TR-801',
    code: '#TR-801',
    direction: 'ARRIVAL',
    status: 'PICKING_UP', // PENDING (Chưa đón) | PICKING_UP (Đang đón) | COMPLETED (Hoàn thành)
    statusBadge: 'ĐANG ĐÓN VỀ RESORT',
    flightCode: 'VN-1233',
    flightTime: '14:10',
    flightLabel: 'Chuyến bay: VN-1233 (14:10)',
    scheduledTime: '14:10',
    estimatedArrival: '14:28',
    startHour: 13.5,
    endHour: 15.0,
    guestName: 'Arthur Dent',
    guestBadge: 'VIP Titan',
    guestBadgeStyle: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white',
    roomNumber: '804',
    passengerCount: 2,
    luggageCount: 3,
    pickupLocation: 'Sân bay PQC (Ga T1/T2)',
    dropoffLocation: 'Grand Horizon Bãi Dài',
    vehicleId: 'VH-01',
    vehicleName: 'Mercedes Maybach S450',
    plateNumber: '68A-888.99',
    driverId: 'CH-402',
    driverName: 'Đỗ Văn Sơn',
    driverPhone: '0903 888 402',
    rightLabel: 'Khoảng cách thực tế',
    distanceText: '6.2 km tới sảnh',
    distanceColor: 'text-[#006c49]',
    distanceSubtext: 'Dự kiến: 14:28',
    subtextColor: 'text-slate-600 font-semibold',
    vipNote: null,
    gpsCoords: { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 }
  },
  {
    id: 'TR-802',
    code: '#TR-802',
    direction: 'ARRIVAL',
    status: 'PENDING',
    statusBadge: 'SẮP XUẤT BẾN SẢNH',
    flightCode: 'VJ-324',
    flightTime: '14:35',
    flightLabel: 'Đoàn 8 Khách',
    scheduledTime: '14:35',
    estimatedArrival: '15:25',
    startHour: 14.5,
    endHour: 16.2,
    guestName: 'Đoàn Khách Gia Đình Phòng 618',
    guestSubInline: '(Đón Sân Bay Ga Quốc Nội)',
    guestBadge: null,
    roomNumber: '618',
    passengerCount: 8,
    luggageCount: 10,
    pickupLocation: 'Sân bay PQC (Ga Quốc Nội)',
    dropoffLocation: 'Grand Horizon Bãi Dài',
    vehicleId: 'VH-02',
    vehicleName: 'Ford Transit Dcar Limousine',
    plateNumber: '68B-123.45',
    driverId: 'CH-405',
    driverName: 'Trần Quốc Bảo',
    driverPhone: '0908 123 405',
    rightLabel: 'Khởi hành từ Bãi Xe',
    distanceText: '14:35',
    distanceColor: 'text-sky-600',
    distanceSubtext: 'Xe đã sẵn sàng ở sảnh A',
    subtextColor: 'text-slate-600 font-medium',
    vipNote: null,
    gpsCoords: { progress: 12, speed: '0 km/h (Sảnh A)', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-803',
    code: '#TR-803',
    direction: 'ARRIVAL',
    status: 'PENDING',
    statusBadge: 'CHỜ CẤT CÁNH / HẠ CÁNH',
    flightCode: 'SQ-22',
    flightTime: '16:30',
    flightLabel: 'Chuyến bay SQ-22',
    scheduledTime: '16:30',
    estimatedArrival: '17:05',
    startHour: 16.0,
    endHour: 17.8,
    guestName: 'Ngài Kenji Sato',
    guestBadge: 'Suite 1401 Penthouse',
    guestBadgeStyle: 'bg-[#10b981] text-white',
    roomNumber: '1401',
    passengerCount: 2,
    luggageCount: 4,
    pickupLocation: 'Sân bay PQC (Ga Quốc Tế VIP)',
    dropoffLocation: 'Sky Villa Penthouse 1401',
    vehicleId: 'VH-03',
    vehicleName: 'Mercedes Maybach S680',
    plateNumber: '68A-999.88',
    driverId: 'CH-408',
    driverName: 'Lê Hoàng Phúc',
    driverPhone: '0912 999 408',
    rightLabel: 'Dự kiến hạ cánh',
    distanceText: '16:30',
    distanceColor: 'text-slate-800',
    distanceSubtext: 'Tài xế đã có mặt tại PQC',
    subtextColor: 'text-[#006c49] font-semibold',
    vipNote: 'Bảng đón VIP mạ vàng + Nước suối Evian lạnh đã cấp phát cho đội lễ tân sân bay.',
    gpsCoords: { progress: 5, speed: 'Trực chờ tại PQC', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-804',
    code: '#TR-804',
    direction: 'DEPARTURE',
    status: 'COMPLETED',
    statusBadge: 'HOÀN TẤT TIỄN KHÁCH',
    flightCode: 'VN-1230',
    flightTime: '12:45',
    flightLabel: 'Tiễn Sân Bay PQC',
    scheduledTime: '12:00',
    estimatedArrival: '12:45',
    startHour: 11.5,
    endHour: 13.0,
    guestName: 'Bà Clara Higgins',
    guestSubInline: 'Check-out Folio #9042',
    guestBadge: null,
    roomNumber: '407',
    passengerCount: 2,
    luggageCount: 3,
    pickupLocation: 'Grand Horizon Bãi Dài',
    dropoffLocation: 'Sân bay PQC (Quầy Vietnam Airlines)',
    vehicleId: 'VH-04',
    vehicleName: 'Kia Carnival Signature VIP',
    plateNumber: '68A-456.78',
    driverId: 'CH-410',
    driverName: 'Nguyễn Minh Tâm',
    driverPhone: '0918 456 410',
    rightLabel: 'Giờ hoàn thành',
    distanceText: '12:45',
    distanceColor: 'text-slate-600',
    distanceSubtext: 'Ký nhận điện tử: ĐẠT',
    subtextColor: 'text-[#006c49] font-semibold',
    vipNote: 'Đã bàn giao hành lý tại Quầy Vietnam Airlines lúc 12:45. Xe đang trên đường quay lại Resort.',
    gpsCoords: { progress: 100, speed: 'Đã hoàn thành', etaMinutes: 0, distanceKm: 0 }
  },
  {
    id: 'TR-805',
    code: '#TR-805',
    direction: 'DEPARTURE',
    status: 'PENDING',
    statusBadge: 'CHỜ TIỄN SÂN BAY',
    flightCode: 'QH-1524',
    flightTime: '19:20',
    flightLabel: 'Chuyến bay: QH-1524 (19:20)',
    scheduledTime: '17:15',
    estimatedArrival: '17:50',
    startHour: 17.2,
    endHour: 18.8,
    guestName: 'Gia Đình Ông Hoàng Nam',
    guestBadge: 'Ocean Villa 102',
    guestBadgeStyle: 'bg-[#006c49] text-white',
    roomNumber: '102',
    passengerCount: 4,
    luggageCount: 6,
    pickupLocation: 'Ocean Villa 102 - Grand Horizon',
    dropoffLocation: 'Sân bay PQC (Ga T1)',
    vehicleId: 'VH-05',
    vehicleName: 'Toyota Alphard Executive',
    plateNumber: '68A-333.66',
    driverId: 'CH-412',
    driverName: 'Phạm Gia Huy',
    driverPhone: '0909 333 412',
    rightLabel: 'Giờ xuất phát tiễn',
    distanceText: '17:15',
    distanceColor: 'text-sky-600',
    distanceSubtext: 'Buggy đón tại Villa 17:00',
    subtextColor: 'text-slate-600 font-medium',
    vipNote: 'Hỗ trợ đóng gói 2 bộ gậy Golf Titleist và làm thủ tục Fast-Track tại sân bay Phú Quốc.',
    gpsCoords: { progress: 0, speed: 'Chờ xuất bến', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-806',
    code: '#TR-806',
    direction: 'ARRIVAL',
    status: 'PICKING_UP',
    statusBadge: 'ĐANG ĐÓN TOUR NAM ĐẢO',
    flightCode: 'TOUR-VIP02',
    flightTime: '13:30',
    flightLabel: 'Hải trình Du Thuyền Hòn Thơm',
    scheduledTime: '13:30',
    estimatedArrival: '16:00',
    startHour: 13.5,
    endHour: 16.0,
    guestName: 'Vợ Chồng Ông David Beckham',
    guestBadge: 'Royal Suite 1501',
    guestBadgeStyle: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white',
    roomNumber: '1501',
    passengerCount: 2,
    luggageCount: 2,
    pickupLocation: 'Cảng Du Thuyền An Thới',
    dropoffLocation: 'Grand Horizon Bãi Dài',
    vehicleId: 'VH-06',
    vehicleName: 'Ford Transit Dcar President',
    plateNumber: '68B-567.89',
    driverId: 'CH-415',
    driverName: 'Vũ Đình Trọng',
    driverPhone: '0938 567 415',
    rightLabel: 'Khoảng cách thực tế',
    distanceText: '11.4 km tới sảnh',
    distanceColor: 'text-[#006c49]',
    distanceSubtext: 'Dự kiến: 14:40',
    subtextColor: 'text-slate-600 font-semibold',
    vipNote: null,
    gpsCoords: { progress: 58, speed: '48 km/h', etaMinutes: 15, distanceKm: 11.4 }
  }
];

const INITIAL_FLEET = [
  {
    id: 'VH-01',
    name: 'Mercedes Maybach S450',
    shortName: 'Mercedes Maybach ...',
    plateNumber: '68A-888.99',
    tierTag: 'VIP 1:1',
    type: 'Maybach',
    seats: 3,
    fuelLevel: 92,
    specLine: 'Nhiên liệu: 92% • Wifi • Khăn Lạnh',
    status: 'ON_ROUTE',
    driverId: 'CH-402',
    driverName: 'Đỗ Văn Sơn',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-02',
    name: 'Transit Dcar Limousine',
    shortName: 'Transit Dcar Limousi...',
    plateNumber: '68B-123.45',
    tierTag: '9 Chỗ VIP',
    type: 'Limousine',
    seats: 9,
    fuelLevel: 88,
    specLine: 'Nhiên liệu: 88% • Ghế Massage',
    status: 'STANDBY',
    driverId: 'CH-405',
    driverName: 'Trần Quốc Bảo',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-03',
    name: 'Mercedes Maybach S680',
    shortName: 'Mercedes Maybach S680',
    plateNumber: '68A-999.88',
    tierTag: 'VVIP Penthouse',
    type: 'Maybach',
    seats: 3,
    fuelLevel: 96,
    specLine: 'Nhiên liệu: 96% • Bàn VIP • Evian',
    status: 'STANDBY',
    driverId: 'CH-408',
    driverName: 'Lê Hoàng Phúc',
    image: 'https://images.unsplash.com/photo-1618843479319-561729142657?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-04',
    name: 'Kia Carnival Signature VIP',
    shortName: 'Kia Carnival Signatu...',
    plateNumber: '68A-456.78',
    tierTag: '7 Chỗ Thương Gia',
    type: 'Carnival',
    seats: 7,
    fuelLevel: 84,
    specLine: 'Nhiên liệu: 84% • Sạc Đa Năng',
    status: 'AVAILABLE',
    driverId: 'CH-410',
    driverName: 'Nguyễn Minh Tâm',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-05',
    name: 'Toyota Alphard Executive',
    shortName: 'Toyota Alphard Execu...',
    plateNumber: '68A-333.66',
    tierTag: '6 Chỗ Hạng Nhất',
    type: 'Limousine',
    seats: 6,
    fuelLevel: 90,
    specLine: 'Nhiên liệu: 90% • Ghế Ottoman',
    status: 'AVAILABLE',
    driverId: 'CH-412',
    driverName: 'Phạm Gia Huy',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-06',
    name: 'Ford Transit Dcar President',
    shortName: 'Dcar President Limou...',
    plateNumber: '68B-567.89',
    tierTag: '9 Chỗ Chủ Tịch',
    type: 'Limousine',
    seats: 9,
    fuelLevel: 79,
    specLine: 'Nhiên liệu: 79% • Quầy Bar Mini',
    status: 'ON_ROUTE',
    driverId: 'CH-415',
    driverName: 'Vũ Đình Trọng',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=500&auto=format&fit=crop&q=80'
  }
];

const INITIAL_CHAUFFEURS = [
  {
    id: 'CH-402',
    name: 'Đỗ Văn Sơn',
    code: 'CH-402',
    rating: '4.98',
    experience: 'Kinh nghiệm 12 năm • Thông thạo Anh - Việt ...',
    fullExperience: 'Kinh nghiệm 12 năm • Thông thạo Anh - Việt • Chứng chỉ Lái xe Phòng vệ Quốc tế',
    phone: '0903 888 402',
    status: 'ON_ROUTE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'CH-405',
    name: 'Trần Quốc Bảo',
    code: 'CH-405',
    rating: '4.95',
    experience: 'Kinh nghiệm 9 năm • Chuyên trách Đoàn VIP ...',
    fullExperience: 'Kinh nghiệm 9 năm • Chuyên trách Đoàn Gia Đình & Chuyên gia Quốc tế',
    phone: '0908 123 405',
    status: 'LOBBY_STANDBY',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'CH-408',
    name: 'Lê Hoàng Phúc',
    code: 'CH-408',
    rating: '4.97',
    experience: 'Kinh nghiệm 10 năm • Thông thạo Anh - Nhật ...',
    fullExperience: 'Kinh nghiệm 10 năm • Thông thạo Anh - Nhật • Chuyên trách khách Penthouse',
    phone: '0912 999 408',
    status: 'WAITING_PQC',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'CH-410',
    name: 'Nguyễn Minh Tâm',
    code: 'CH-410',
    rating: '4.92',
    experience: 'Kinh nghiệm 8 năm • Lái xe an toàn 100k km ...',
    fullExperience: 'Kinh nghiệm 8 năm • Lái xe an toàn 100.000 km không vi phạm',
    phone: '0918 456 410',
    status: 'ON_ROUTE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'CH-412',
    name: 'Phạm Gia Huy',
    code: 'CH-412',
    rating: '4.94',
    experience: 'Kinh nghiệm 7 năm • Thông thạo Anh - Hàn ...',
    fullExperience: 'Kinh nghiệm 7 năm • Thông thạo Anh - Hàn • Đón tiễn Golf & Villa VIP',
    phone: '0909 333 412',
    status: 'LOBBY_STANDBY',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'CH-415',
    name: 'Vũ Đình Trọng',
    code: 'CH-415',
    rating: '4.96',
    experience: 'Kinh nghiệm 11 năm • Chuyên tuyến Nam Đảo ...',
    fullExperience: 'Kinh nghiệm 11 năm • Am hiểu tuyến Nam Đảo & Bến Du Thuyền',
    phone: '0938 567 415',
    status: 'ON_ROUTE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  }
];

const GANTT_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const STORAGE_KEY = 'grand_horizon_transfers_v1';

export default function AirportTransferManagement() {
  const [transfers, setTransfers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_TRANSFERS;
  });
  const [fleet, setFleet] = useState(INITIAL_FLEET);
  const [chauffeurs, setChauffeurs] = useState(INITIAL_CHAUFFEURS);

  // Bộ lọc Bảng điều độ: 'ALL' | 'ARRIVAL' | 'DEPARTURE'
  const [directionFilter, setDirectionFilter] = useState('ALL');
  // Bộ lọc theo trạng thái: 'ALL' | 'PENDING' | 'PICKING_UP' | 'COMPLETED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Chế độ hiển thị: 'MATRIX_AND_GANTT' | 'MATRIX' | 'GANTT'
  const [viewMode, setViewMode] = useState('MATRIX_AND_GANTT');
  // Xem tất cả chuyến hay rút gọn 4 chuyến tiêu biểu
  const [showAllTrips, setShowAllTrips] = useState(false);
  // Xem toàn bộ đội xe hay 2 xe tiêu biểu
  const [showAllFleet, setShowAllFleet] = useState(false);

  // Chuyến xe đang được focus trên Radar GPS
  const [activeRadarTripId, setActiveRadarTripId] = useState('TR-801');
  const [liveTimeStr, setLiveTimeStr] = useState('14:18:20');

  // Modals
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isRadioModalOpen, setIsRadioModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTripForDispatch, setSelectedTripForDispatch] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Form đặt chuyến đưa đón mới
  const [newTripForm, setNewTripForm] = useState({
    direction: 'ARRIVAL',
    flightCode: 'VN-1239',
    flightTime: '15:30',
    guestName: '',
    guestBadge: 'VIP Titan',
    roomNumber: '808',
    passengerCount: 2,
    luggageCount: 2,
    vehicleId: 'VH-01',
    driverId: 'CH-402',
    vipNote: 'Bảng đón VIP mạ vàng + Nước khoáng Evian lạnh & Khăn lạnh sả chanh.'
  });

  // Form điều phối xe nhanh
  const [dispatchForm, setDispatchForm] = useState({
    tripId: 'TR-802',
    vehicleId: 'VH-02',
    driverId: 'CH-405',
    vipNote: ''
  });

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Đồng hồ GPS thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setLiveTimeStr(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động lưu lịch trình vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
    } catch (_) {}
  }, [transfers]);

  // Tải dữ liệu từ API Backend (MySQL) và đồng bộ với dữ liệu đã lưu
  useEffect(() => {
    fetch('/api/transportation/overview')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.success && Array.isArray(data.transfers) && data.transfers.length > 0) {
          setTransfers(prev => {
            const serverMap = new Map(data.transfers.map(item => [item.id, item]));
            const mergedIds = new Set();
            const merged = [];

            // Giữ thứ tự ưu tiên các chuyến mới tạo ở đầu danh sách
            prev.forEach(localItem => {
              const item = serverMap.get(localItem.id) || localItem;
              merged.push(item);
              mergedIds.add(item.id);
            });

            data.transfers.forEach(serverItem => {
              if (!mergedIds.has(serverItem.id)) {
                if (serverItem.sortOrder === 0) {
                  merged.unshift(serverItem);
                } else {
                  merged.push(serverItem);
                }
                mergedIds.add(serverItem.id);
              }
            });

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Chuyến xe đang hiển thị trên GPS Radar
  const activeRadarTrip =
    transfers.find(t => t.id === activeRadarTripId) ||
    transfers.find(t => t.status === 'PICKING_UP') ||
    transfers[0];

  // Tài xế tiêu biểu đang hiển thị
  const featuredChauffeur =
    chauffeurs.find(c => c.id === activeRadarTrip?.driverId) || chauffeurs[0];

  // Lọc danh sách chuyến xe
  const filteredTransfers = transfers.filter(item => {
    if (directionFilter !== 'ALL' && item.direction !== directionFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  const displayedTransfers = showAllTrips
    ? filteredTransfers
    : filteredTransfers.slice(0, 4);

  const displayedFleet = showAllFleet ? fleet : fleet.slice(0, 2);

  // Thống kê theo trạng thái
  const pendingCount = transfers.filter(t => t.status === 'PENDING').length;
  const pickingUpCount = transfers.filter(t => t.status === 'PICKING_UP').length;
  const completedCount = transfers.filter(t => t.status === 'COMPLETED').length;

  // Hàm chuyển trạng thái chuyến xe (Chưa đón -> Đang đón -> Hoàn thành)
  const handleStatusChange = async (tripId, nextStatus) => {
    const target = transfers.find(t => t.id === tripId);
    if (!target) return;

    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setTransfers(prev =>
      prev.map(item => {
        if (item.id !== tripId) return item;
        if (nextStatus === 'PENDING') {
          return {
            ...item,
            status: 'PENDING',
            statusBadge: item.direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH',
            rightLabel: item.direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh',
            distanceText: item.flightTime,
            distanceColor: 'text-sky-600',
            distanceSubtext: 'Xe đã sẵn sàng ở vị trí tập kết',
            subtextColor: 'text-slate-600 font-medium',
            gpsCoords: { progress: 10, speed: '0 km/h (Chờ đón)', etaMinutes: 32, distanceKm: 24.0 }
          };
        }
        if (nextStatus === 'PICKING_UP') {
          return {
            ...item,
            status: 'PICKING_UP',
            statusBadge: item.direction === 'DEPARTURE' ? 'ĐANG TIỄN RA SÂN BAY' : 'ĐANG ĐÓN VỀ RESORT',
            rightLabel: 'Khoảng cách thực tế',
            distanceText: '6.2 km tới sảnh',
            distanceColor: 'text-[#006c49]',
            distanceSubtext: `Dự kiến: ${item.estimatedArrival || '14:45'}`,
            subtextColor: 'text-slate-600 font-semibold',
            gpsCoords: { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 }
          };
        }
        return {
          ...item,
          status: 'COMPLETED',
          statusBadge: item.direction === 'DEPARTURE' ? 'HOÀN TẤT TIỄN KHÁCH' : 'HOÀN TẤT ĐÓN KHÁCH',
          rightLabel: 'Giờ hoàn thành',
          distanceText: nowTime,
          distanceColor: 'text-slate-600',
          distanceSubtext: 'Ký nhận điện tử: ĐẠT',
          subtextColor: 'text-[#006c49] font-semibold',
          gpsCoords: { progress: 100, speed: 'Hoàn tất tại sảnh', etaMinutes: 0, distanceKm: 0 }
        };
      })
    );

    if (nextStatus === 'PICKING_UP') {
      setActiveRadarTripId(tripId);
    }

    const statusVi =
      nextStatus === 'PENDING'
        ? 'Chưa đón (Chờ khởi hành)'
        : nextStatus === 'PICKING_UP'
        ? 'Đang đón trên lộ trình'
        : 'Hoàn thành chuyến xe';

    showToast(
      `Cập nhật trạng thái ${target.code}`,
      `Chuyến xe của khách ${target.guestName} đã chuyển sang: ${statusVi}.`
    );

    try {
      await fetch(`/api/transportation/transfers/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (_) {}
  };

  // Hàm tạo chuyến đưa đón mới
  const handleCreateTrip = async e => {
    e.preventDefault();
    if (!newTripForm.guestName.trim()) {
      showToast('Thiếu thông tin', 'Vui lòng nhập tên hành khách hoặc đoàn khách!', 'warning');
      return;
    }

    const vehicle = fleet.find(v => v.id === newTripForm.vehicleId) || fleet[0];
    const driver = chauffeurs.find(c => c.id === newTripForm.driverId) || chauffeurs[0];
    const existingNums = transfers
      .map(t => parseInt(String(t.id).replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 806;
    const nextIdx = maxNum + 1;
    const newId = `TR-${nextIdx}`;

    const [hhStr, mmStr] = (newTripForm.flightTime || '15:30').split(':');
    const hh = parseInt(hhStr, 10) || 15;
    const mm = parseInt(mmStr, 10) || 30;
    const startHour = Math.max(10, Math.min(19.5, hh + mm / 60));

    const createdTrip = {
      id: newId,
      code: `#${newId}`,
      direction: newTripForm.direction,
      status: 'PENDING',
      statusBadge:
        newTripForm.direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH',
      flightCode: newTripForm.flightCode.toUpperCase(),
      flightTime: newTripForm.flightTime,
      flightLabel:
        newTripForm.direction === 'DEPARTURE'
          ? `Tiễn Sân Bay PQC (${newTripForm.flightCode.toUpperCase()})`
          : `Chuyến bay: ${newTripForm.flightCode.toUpperCase()} (${newTripForm.flightTime})`,
      scheduledTime: newTripForm.flightTime,
      estimatedArrival: `${String((hh + 1) % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      startHour,
      endHour: Math.min(20.8, startHour + 1.5),
      guestName: newTripForm.guestName.trim(),
      guestBadge: `${newTripForm.guestBadge} • P.${newTripForm.roomNumber}`,
      guestBadgeStyle: 'bg-[#10b981] text-white',
      roomNumber: newTripForm.roomNumber,
      passengerCount: Number(newTripForm.passengerCount) || 2,
      luggageCount: Number(newTripForm.luggageCount) || 2,
      pickupLocation:
        newTripForm.direction === 'DEPARTURE'
          ? `Grand Horizon (Phòng ${newTripForm.roomNumber})`
          : 'Sân bay PQC (Ga T1/T2)',
      dropoffLocation:
        newTripForm.direction === 'DEPARTURE'
          ? 'Sân bay PQC (Ga T1/T2)'
          : `Grand Horizon (Phòng ${newTripForm.roomNumber})`,
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      plateNumber: vehicle.plateNumber,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      rightLabel:
        newTripForm.direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh',
      distanceText: newTripForm.flightTime,
      distanceColor: 'text-sky-600',
      distanceSubtext:
        newTripForm.direction === 'DEPARTURE'
          ? 'Xe đã sẵn sàng ở sảnh A'
          : 'Tài xế đã nhận lệnh đón PQC',
      subtextColor: 'text-[#006c49] font-semibold',
      vipNote: newTripForm.vipNote,
      gpsCoords: { progress: 8, speed: 'Chờ xuất phát', etaMinutes: 32, distanceKm: 24.0 }
    };

    const payloadToSubmit = { ...newTripForm };
    setTransfers(prev => {
      const updated = [createdTrip, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    setActiveRadarTripId(newId);
    setIsNewTripModalOpen(false);
    setNewTripForm(prev => ({ ...prev, guestName: '' }));

    showToast(
      `Đã tạo chuyến ${createdTrip.code}`,
      `Đã xếp xe ${vehicle.name} (${vehicle.plateNumber}) và tài xế ${driver.name} đón khách ${createdTrip.guestName}.`
    );

    try {
      await fetch('/api/transportation/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSubmit)
      });
    } catch (_) {}
  };

  // Hàm lưu điều phối xe nhanh
  const handleSaveDispatch = async e => {
    e.preventDefault();
    const vehicle = fleet.find(v => v.id === dispatchForm.vehicleId);
    const driver = chauffeurs.find(c => c.id === dispatchForm.driverId);
    if (!vehicle || !driver) return;

    setTransfers(prev =>
      prev.map(item => {
        if (item.id !== dispatchForm.tripId) return item;
        return {
          ...item,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          plateNumber: vehicle.plateNumber,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          vipNote: dispatchForm.vipNote || item.vipNote
        };
      })
    );

    setIsDispatchModalOpen(false);
    showToast(
      'Điều phối thành công',
      `Đã gán xe ${vehicle.name} (${vehicle.plateNumber}) và Chauffeur ${driver.name} cho chuyến #${dispatchForm.tripId}.`
    );

    try {
      await fetch(`/api/transportation/transfers/${dispatchForm.tripId}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchForm)
      });
    } catch (_) {}
  };

  const openQuickDispatchForTrip = trip => {
    setSelectedTripForDispatch(trip);
    setDispatchForm({
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      vipNote: trip.vipNote || ''
    });
    setIsDispatchModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="max-w-[1620px] mx-auto py-5 space-y-5 text-slate-800">
        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-emerald-500/40 max-w-md animate-bounce">
            <span className="material-symbols-outlined text-emerald-400 mt-0.5">
              {toast.type === 'warning' ? 'warning' : 'verified'}
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {toast.title}
              </div>
              <div className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* 1. HEADER CHÍNH (KHỚP 100% ẢNH MẪU PHÂN HỆ 50)                          */}
        {/* ======================================================================= */}
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pt-1">
          <div className="space-y-1.5 max-w-3xl">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#006c49]">
              TERMINAL VẬN HÀNH / MODULE 50
            </div>
            <h1
              className="text-2xl md:text-[30px] leading-[1.22] font-normal text-slate-900 tracking-tight uppercase"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              PHÂN HỆ 50 // TRUNG TÂM ĐIỀU PHỐI ĐỘI XE ĐƯA ĐÓN SÂN BAY &amp; XE ĐIỆN RESORT
            </h1>
          </div>

          {/* 4 Nút công cụ điều hành góc phải */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNewTripModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#006c49] hover:bg-[#005538] text-white text-xs font-bold tracking-wide shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                + ĐẶT CHUYẾN ĐƯA ĐÓN MỚI
              </button>

              <button
                type="button"
                onClick={() => openQuickDispatchForTrip(activeRadarTrip)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#f1f3f1] hover:bg-[#e3e7e3] text-slate-700 text-xs font-bold tracking-wide border border-slate-200/80 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                ĐIỀU PHỐI XE NHANH
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-start xl:self-auto">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e8ece9] hover:bg-[#dce2dd] text-slate-700 text-xs font-bold tracking-wide transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                XUẤT LỊCH TRÌNH TÀI XẾ
              </button>

              <button
                type="button"
                onClick={() => setIsRadioModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-950 text-xs font-extrabold tracking-wide shadow-sm transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                <span className="material-symbols-outlined text-[15px]">radio</span>
                BỘ ĐÀM KÊNH 04 (CONCIERGE)
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. DẢI 3 KPI CARDS ĐỈNH TRANG (HÔM NAY • ĐỘI XE • NHÂN SỰ CA TRỰC)      */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* KPI Card 1: HÔM NAY */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-[#006c49]" />
                  HÔM NAY
                </span>
                <span className="material-symbols-outlined text-slate-500 text-[20px]">
                  local_shipping
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                TỔNG CHUYẾN ĐÓN • TIỄN
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-4xl font-bold text-slate-900"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {12 + transfers.length}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#006c49]">
                  CHUYẾN
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f3f6f8] border border-slate-200/60">
                <span className="material-symbols-outlined text-sky-700 text-[16px]">flight</span>
                <span className="text-[11px] font-bold text-slate-700 leading-tight">
                  12 Sân bay Phú Quốc (PQC)
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f1f6f3] border border-emerald-200/50">
                <span className="material-symbols-outlined text-[#006c49] text-[16px]">flag</span>
                <span className="text-[11px] font-bold text-slate-700 leading-tight">
                  6 Tour đảo
                </span>
              </div>
            </div>
          </div>

          {/* KPI Card 2: ĐỘI XE SẴN SÀNG */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  ĐỘI XE SẴN SÀNG
                </span>
                <span className="material-symbols-outlined text-slate-500 text-[20px]">
                  directions_car
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                TÌNH TRẠNG PHƯƠNG TIỆN
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-4xl font-bold text-slate-900"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  08
                </span>
                <span
                  className="text-2xl font-normal text-slate-300"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  /10
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 ml-1">
                  HOẠT ĐỘNG
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 mt-4 rounded-xl bg-[#f5f6f7] border border-slate-200/60 text-[11px]">
              <span className="font-bold text-slate-700">
                3 Maybach • 4 Limousine • 1 Carnival
              </span>
              <span className="font-extrabold text-rose-700 pl-2 border-l border-slate-300">
                2 Bảo dưỡng
              </span>
            </div>
          </div>

          {/* KPI Card 3: NHÂN SỰ CA TRỰC */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden"
            style={{
              background:
                'radial-gradient(circle at 88% 45%, rgba(254, 226, 226, 0.55) 0%, rgba(255, 255, 255, 1) 68%)'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-[#006c49]" />
                  NHÂN SỰ CA TRỰC
                </span>
                <span className="material-symbols-outlined text-slate-600 text-[20px]">badge</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CHAUFFEUR CHUYÊN TRÁCH
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-4xl font-bold text-slate-900"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  08
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  TÀI XẾ TRỰC TIẾP
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 mt-4 rounded-xl bg-white/90 border border-slate-200/70 text-[11px] font-bold">
              <span className="text-[#006c49]">4 Trên lộ trình</span>
              <span className="text-slate-600">2 Chờ PQC</span>
              <span className="text-slate-600">2 Túc trực sảnh</span>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. BỐ CỤC 2 CỘT CHÍNH: BẢN ĐỒ RADAR GPS (TRÁI) & BẢNG ĐIỀU ĐỘ (PHẢI)    */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ================= CỘT TRÁI (5 PHẦN): GPS RADAR & CHAUFFEUR TIÊU BIỂU ================= */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card Hải Trình & GPS Radar Thời Gian Thực */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              {/* Tiêu đề & Badge GPS ACTIVE */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse" />
                  <h2 className="text-[15px] font-extrabold text-slate-900 leading-snug">
                    Hải Trình &amp; GPS Radar Thời Gian Thực
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#e3f3eb] text-[#006c49] text-[10px] font-extrabold uppercase tracking-wider">
                  GPS ACTIVE
                </span>
              </div>

              {/* Thanh lộ trình Điểm đón <-> Điểm đến */}
              <div className="bg-[#f6f8f6] rounded-xl p-3.5 border border-slate-200/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[20px]">
                    flight
                  </span>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      ĐIỂM ĐÓN
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 leading-tight">
                      {activeRadarTrip?.pickupLocation || 'Sân bay PQC (Ga T1/T2)'}
                    </div>
                  </div>
                </div>

                {/* Đường kẻ đứt đoạn + chấm tiến độ ở giữa */}
                <div className="flex-1 px-2 flex flex-col items-center">
                  <div className="text-[10px] font-extrabold text-[#006c49] tracking-wide mb-1">
                    24 KM • ~32 PHÚT
                  </div>
                  <div className="w-full relative flex items-center">
                    <div className="w-full border-t-2 border-dashed border-emerald-300" />
                    <span
                      className="absolute w-3 h-3 rounded-full bg-[#006c49] ring-4 ring-emerald-200 transition-all duration-500"
                      style={{
                        left: `${Math.min(90, Math.max(10, activeRadarTrip?.gpsCoords?.progress || 74))}%`
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      ĐIỂM ĐẾN
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 leading-tight">
                      {activeRadarTrip?.dropoffLocation || 'Grand Horizon Bãi Dài'}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 text-[20px]">
                    apartment
                  </span>
                </div>
              </div>

              {/* Khung Bản Đồ Đảo Phú Quốc & Overlay Telemetry */}
              <div className="relative rounded-2xl overflow-hidden border border-sky-200/80 h-[325px] bg-[#8fd3e8]">
                {/* Bản đồ Vector Địa hình Đảo Phú Quốc & Tuyến ĐT47 */}
                <svg
                  viewBox="0 0 500 360"
                  className="w-full h-full object-cover"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9be0f2" />
                      <stop offset="50%" stopColor="#7ccce5" />
                      <stop offset="100%" stopColor="#65bddb" />
                    </linearGradient>
                    <linearGradient id="landGrad" x1="0" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#d9f0d0" />
                      <stop offset="60%" stopColor="#c4e6bc" />
                      <stop offset="100%" stopColor="#b0dcb0" />
                    </linearGradient>
                  </defs>

                  {/* Vùng biển Phú Quốc */}
                  <rect width="500" height="360" fill="url(#seaGrad)" />

                  {/* Đường bờ biển sóng nhẹ */}
                  <path
                    d="M 155,15 C 195,12 245,25 270,58 C 292,90 295,140 282,195 C 272,240 255,295 238,342 C 218,352 195,345 188,315 C 182,275 186,230 175,190 C 160,145 128,125 130,85 C 132,48 140,22 155,15 Z"
                    fill="#b8e8d5"
                    opacity="0.55"
                  />

                  {/* Hình dáng Đảo Ngọc Phú Quốc */}
                  <path
                    d="M 162,22 C 198,18 240,32 262,62 C 282,92 286,142 274,192 C 264,235 248,288 232,334 C 216,342 200,334 195,308 C 190,270 192,225 182,188 C 168,142 136,122 138,85 C 140,52 148,28 162,22 Z"
                    fill="url(#landGrad)"
                    stroke="#8ec998"
                    strokeWidth="2"
                  />

                  {/* Mảng rừng quốc gia & đồi núi phía Đông đảo */}
                  <path
                    d="M 195,45 C 225,45 250,70 258,110 C 264,145 256,185 244,225 C 228,215 215,180 210,140 C 204,100 185,65 195,45 Z"
                    fill="#9fd19b"
                    opacity="0.55"
                  />

                  {/* Lưới đường giao thông chính trên đảo (TL46, TL47, TL975) */}
                  <path
                    d="M 168,50 L 188,135 L 204,195 L 218,265 L 225,320"
                    fill="none"
                    stroke="#f6d57a"
                    strokeWidth="2.5"
                    opacity="0.85"
                  />
                  <path
                    d="M 155,138 L 258,155"
                    fill="none"
                    stroke="#f6d57a"
                    strokeWidth="2"
                    opacity="0.75"
                  />

                  {/* Hải trình GPS Đang hoạt động (Sân bay PQC -> Grand Horizon) */}
                  <path
                    d="M 196,195 C 208,215 216,242 214,272"
                    fill="none"
                    stroke="#006c49"
                    strokeWidth="3.5"
                    strokeDasharray="6 4"
                  />

                  {/* Các địa danh trên bản đồ */}
                  <g className="text-[9px] font-bold" fill="#3b5bdb">
                    <circle cx="196" cy="195" r="4" fill="#2563eb" />
                    <text x="140" y="192" fill="#1e40af" fontWeight="700" fontSize="9">
                      ✈️ Sân bay Quốc tế
                    </text>
                    <text x="150" y="203" fill="#1e40af" fontWeight="700" fontSize="9">
                      Phú Quốc (PQC)
                    </text>
                  </g>

                  <text x="142" y="128" fill="#475569" fontWeight="700" fontSize="8">
                    TT. DƯƠNG ĐÔNG
                  </text>
                  <text x="225" y="218" fill="#475569" fontWeight="600" fontSize="8">
                    DƯƠNG TƠ • ĐT47
                  </text>
                  <text x="200" y="328" fill="#475569" fontWeight="700" fontSize="8">
                    CẢNG AN THỚI
                  </text>

                  {/* Điểm đích: Grand Horizon Resort */}
                  <circle cx="214" cy="274" r="5" fill="#006c49" stroke="#ffffff" strokeWidth="2" />
                  <text x="224" y="276" fill="#064e3b" fontWeight="800" fontSize="8.5">
                    Grand Horizon Resort
                  </text>

                  {/* Marker VIP đang di chuyển trên tuyến */}
                  <g transform="translate(212, 238)">
                    <circle r="18" fill="#006c49" opacity="0.22" className="animate-ping" />
                    <circle r="13" fill="#006c49" stroke="#ffffff" strokeWidth="2.5" />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.5"
                      fontWeight="900"
                    >
                      VIP
                    </text>
                  </g>
                </svg>

                {/* Thẻ nổi (Floating Telemetry Card) phía trên bản đồ khớp 100% ảnh mẫu */}
                <div className="absolute top-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-white/80">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-extrabold uppercase tracking-wider text-[#006c49]">
                      CHUYẾN {activeRadarTrip?.code || '#TR-801'}
                    </span>
                    <span className="font-mono font-bold text-slate-500">{liveTimeStr}</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {activeRadarTrip?.vehicleName || 'Mercedes Maybach S450'} •{' '}
                    {activeRadarTrip?.plateNumber || '68A-888.99'}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f1f5f3] border border-emerald-200/60 text-[11px]">
                    <span className="text-slate-600 font-medium">Khoảng cách tới sảnh:</span>
                    <span className="font-extrabold text-[#006c49]">
                      {activeRadarTrip?.gpsCoords?.distanceKm ?? 6.2} km (
                      {activeRadarTrip?.gpsCoords?.etaMinutes ?? 7} phút)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Ô chỉ số Telemetry dưới bản đồ */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="bg-[#f7f8f7] rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[10px] font-semibold text-slate-500 leading-tight">
                    Tốc độ trung bình
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">
                    {activeRadarTrip?.gpsCoords?.speed || '54 km/h'}
                  </div>
                </div>

                <div className="bg-[#f7f8f7] rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[10px] font-semibold text-slate-500 leading-tight">
                    Tắc nghẽn ĐT47
                  </div>
                  <div className="text-sm font-extrabold text-[#006c49] mt-1">Thông suốt</div>
                </div>

                <div className="bg-[#f7f8f7] rounded-xl p-3 border border-slate-200/60">
                  <div className="text-[10px] font-semibold text-slate-500 leading-tight">
                    Xe Điện Buggy Sảnh
                  </div>
                  <div className="text-sm font-extrabold text-[#006c49] mt-1">6/6 Sạc 100%</div>
                </div>
              </div>
            </div>

            {/* Card Chauffeur Tiêu Biểu Ca Ngày */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3.5">
              <img
                src={featuredChauffeur.avatar}
                alt={featuredChauffeur.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006c49]">
                    CHAUFFEUR TIÊU BIỂU CA NGÀY
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#ebf5ef] text-[#006c49] text-[10px] font-extrabold shrink-0">
                    Đánh giá: {featuredChauffeur.rating} ★
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                  {featuredChauffeur.name} • Mã NV: {featuredChauffeur.code}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {featuredChauffeur.experience}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI (7 PHẦN): BẢNG ĐIỀU ĐỘ & ĐỘI XE HẠNG SANG ================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Card BẢNG ĐIỀU ĐỘ THỜI GIAN THỰC — Lịch Trình Chuyến Xe Đưa Đón */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              {/* Header Bảng điều độ */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    BẢNG ĐIỀU ĐỘ THỜI GIAN THỰC
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Lịch Trình Chuyến Xe Đưa Đón (Transfer Schedule Matrix)
                  </h2>
                </div>

                {/* Bộ lọc Tất cả / Đến (Arrival) / Đi (Departure) khớp ảnh mẫu */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      directionFilter === 'ALL'
                        ? 'bg-[#e5ebe7] text-slate-900 shadow-2xs'
                        : 'bg-[#f4f6f4] text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    Bộ lọc: Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('ARRIVAL')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      directionFilter === 'ARRIVAL'
                        ? 'bg-[#006c49] text-white shadow-2xs'
                        : 'bg-[#f4f6f4] text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    Đến (Arrival)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectionFilter('DEPARTURE')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      directionFilter === 'DEPARTURE'
                        ? 'bg-[#006c49] text-white shadow-2xs'
                        : 'bg-[#f4f6f4] text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    Đi (Departure)
                  </button>
                </div>
              </div>

              {/* Thanh theo dõi quy trình trạng thái chuyến xe (Chưa đón -> Đang đón -> Hoàn thành) & Chuyển đổi Gantt */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#f7f9f7] border border-slate-200/70">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-bold text-slate-500 mr-1">Luồng trạng thái:</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Tất cả ({transfers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'PENDING'
                        ? 'bg-sky-600 text-white'
                        : 'bg-white text-sky-700 border border-sky-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    1. Chưa đón ({pendingCount})
                  </button>
                  <span className="text-slate-400 font-bold">→</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PICKING_UP')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'PICKING_UP'
                        ? 'bg-[#006c49] text-white'
                        : 'bg-white text-[#006c49] border border-emerald-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-ping" />
                    2. Đang đón ({pickingUpCount})
                  </button>
                  <span className="text-slate-400 font-bold">→</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('COMPLETED')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'COMPLETED'
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    3. Hoàn thành ({completedCount})
                  </button>
                </div>

                {/* Nút chọn chế độ xem Matrix / Gantt */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('MATRIX_AND_GANTT')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      viewMode === 'MATRIX_AND_GANTT'
                        ? 'bg-[#006c49] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Kết hợp
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('GANTT')}
                    className={`px-2.5 py-1 rounded cursor-pointer ${
                      viewMode === 'GANTT'
                        ? 'bg-[#006c49] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Gantt View
                  </button>
                </div>
              </div>

              {/* Danh sách các thẻ Chuyến xe (#TR-801, #TR-802, #TR-803, #TR-804...) */}
              <div className="space-y-3">
                {displayedTransfers.map(trip => {
                  const isPickingUp = trip.status === 'PICKING_UP';
                  const isCompleted = trip.status === 'COMPLETED';
                  const isSelectedOnRadar = activeRadarTrip?.id === trip.id;

                  // Cấu hình màu sắc & icon bên trái theo từng mã chuyến khớp ảnh mẫu
                  let cardBg = 'bg-[#f8faf9] border-slate-200/80';
                  let iconBoxStyle = 'bg-[#e6ebe8] text-slate-700';
                  let iconName = 'flight_land';
                  let statusPillStyle = 'bg-[#e2e7e4] text-slate-700';

                  if (isPickingUp) {
                    cardBg = 'bg-[#f2f9f5] border-emerald-300/80';
                    iconBoxStyle = 'bg-[#006c49] text-white';
                    iconName = 'near_me';
                    statusPillStyle = 'bg-[#ccebd9] text-[#005236]';
                  } else if (trip.id === 'TR-802' || trip.statusBadge.includes('SẮP XUẤT BẾN')) {
                    cardBg = 'bg-[#f4f9fd] border-sky-200/80';
                    iconBoxStyle = 'bg-[#38bdf8] text-slate-950';
                    iconName = 'departure_board';
                    statusPillStyle = 'bg-[#bae6fd] text-sky-900';
                  } else if (isCompleted) {
                    cardBg = 'bg-[#f6f7f6] border-slate-200/70 opacity-90';
                    iconBoxStyle = 'bg-[#e8ece9] text-slate-500';
                    iconName = 'check_circle';
                    statusPillStyle = 'bg-[#e2e6e3] text-slate-600';
                  }

                  return (
                    <div
                      key={trip.id}
                      onClick={() => setActiveRadarTripId(trip.id)}
                      className={`rounded-2xl border p-4 transition-all cursor-pointer ${cardBg} ${
                        isSelectedOnRadar ? 'ring-2 ring-[#006c49]/35 shadow-xs' : 'hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Cột trái của Card chuyến xe */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${iconBoxStyle}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Dòng 1: Mã chuyến + Trạng thái + Chuyến bay */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-extrabold">
                                {trip.code}
                              </span>

                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${statusPillStyle}`}
                              >
                                {isPickingUp && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-ping" />
                                )}
                                {trip.statusBadge}
                              </span>

                              <span className="text-[11px] font-semibold text-slate-500">
                                {trip.flightLabel}
                              </span>
                            </div>

                            {/* Dòng 2: Tên khách & Huy hiệu VIP / Phòng */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span
                                className={`text-[15px] font-extrabold ${
                                  isCompleted
                                    ? 'line-through text-slate-500'
                                    : 'text-slate-900'
                                }`}
                              >
                                {trip.guestName}
                              </span>

                              {trip.guestSubInline && (
                                <span className="text-xs font-medium text-slate-500">
                                  {trip.guestSubInline}
                                </span>
                              )}

                              {trip.guestBadge && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide ${
                                    trip.guestBadgeStyle || 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {trip.guestBadge}
                                </span>
                              )}
                            </div>

                            {/* Dòng 3: Thông tin Xe & Tài xế hoặc Ghi chú VIP */}
                            {trip.vipNote ? (
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {trip.vipNote}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-600">
                                {trip.vehicleName} (
                                <strong className="text-slate-800">{trip.plateNumber}</strong>) • Tài
                                xế: <strong className="text-slate-800">{trip.driverName}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cột phải của Card chuyến xe: Khoảng cách / Giờ hạ cánh / Giờ hoàn thành */}
                        <div className="sm:text-right shrink-0 flex sm:flex-col justify-between items-end gap-1 pl-12 sm:pl-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            {trip.rightLabel}
                          </div>
                          <div className={`text-base font-extrabold ${trip.distanceColor}`}>
                            {trip.distanceText}
                          </div>
                          <div className={`text-[11px] ${trip.subtextColor}`}>
                            {trip.distanceSubtext}
                          </div>
                        </div>
                      </div>

                      {/* Thanh thao tác nhanh: Theo dõi & Chuyển trạng thái (Chưa đón -> Đang đón -> Hoàn thành) */}
                      <div
                        className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="material-symbols-outlined text-[15px] text-[#006c49]">
                            directions_car
                          </span>
                          <span>
                            {trip.vehicleName} ({trip.plateNumber}) • TX:{' '}
                            <strong className="text-slate-700">{trip.driverName}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                            Trạng thái:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(trip.id, 'PENDING')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              trip.status === 'PENDING'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            1. Chưa đón
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(trip.id, 'PICKING_UP')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              trip.status === 'PICKING_UP'
                                ? 'bg-[#006c49] text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            2. Đang đón
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(trip.id, 'COMPLETED')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              trip.status === 'COMPLETED'
                                ? 'bg-slate-800 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            3. Hoàn thành
                          </button>

                          <button
                            type="button"
                            onClick={() => openQuickDispatchForTrip(trip)}
                            className="ml-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#006c49] border border-emerald-200 text-[10px] font-bold cursor-pointer"
                            title="Điều phối đổi xe / tài xế"
                          >
                            Điều phối
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer đồng bộ sân bay & Nút Xem tất cả 18 chuyến */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">
                    sync
                  </span>
                  <span>
                    Đồng bộ tự động với Hệ thống Sân bay Tân Sơn Nhất &amp; Phú Quốc mỗi 30 giây
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllTrips(prev => !prev)}
                  className="px-4 py-2 rounded-xl bg-[#f1f3f1] hover:bg-[#e3e7e3] text-slate-800 text-xs font-extrabold transition-all cursor-pointer"
                >
                  {showAllTrips ? 'Thu Gọn Danh Sách' : 'Xem Tất Cả 18 Chuyến'}
                </button>
              </div>
            </div>

            {/* Card Phương Tiện Hạng Sang Trực Chiến (Dedicated Luxury Fleet) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-extrabold text-slate-900">
                  Phương Tiện Hạng Sang Trực Chiến (Dedicated Luxury Fleet)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAllFleet(prev => !prev)}
                  className="text-xs font-extrabold text-[#006c49] hover:underline cursor-pointer text-right"
                >
                  {showAllFleet ? 'Thu gọn đội xe' : '8 Xe Sạch Tiêu Chuẩn 5 Sao'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {displayedFleet.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#f8faf8] border border-slate-200/70 hover:border-emerald-300 transition-all"
                  >
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {vehicle.shortName || vehicle.name}
                      </div>
                      <div className="text-[11px] font-bold text-[#006c49] mt-0.5">
                        Biển: {vehicle.plateNumber} • {vehicle.tierTag}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {vehicle.specLine}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 4. SƠ ĐỒ GANTT LỊCH TRÌNH ĐỘI XE (GANTT VIEW) & ĐIỀU PHỐI TÀI XẾ       */}
        {/* ======================================================================= */}
        {(viewMode === 'MATRIX_AND_GANTT' || viewMode === 'GANTT') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#006c49]">
                  BIỂU ĐỒ GANTT ĐIỀU ĐỘ ĐỘI XE (FLEET GANTT TIMELINE VIEW)
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Lịch Trình Xe Đưa Đón Sân Bay &amp; Theo Dõi Trạng Thái Chuyến Xe Theo Khung Giờ
                </h3>
              </div>

              {/* Chú giải màu trạng thái trên Gantt */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                  Chưa đón (Chờ bay / Sắp xuất bến)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#006c49] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#006c49]" />
                  Đang đón (Trên lộ trình GPS)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
                  Hoàn thành (Đã ký nhận)
                </span>
              </div>
            </div>

            {/* Lưới Gantt Timeline */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="min-w-[920px]">
                {/* Header Khung giờ (10:00 -> 20:00) */}
                <div className="grid grid-cols-12 bg-[#f4f7f5] border-b border-slate-200 text-[11px] font-extrabold text-slate-600">
                  <div className="col-span-3 px-4 py-3 border-r border-slate-200 uppercase tracking-wider">
                    Phương Tiện &amp; Chauffeur Trực
                  </div>
                  <div className="col-span-9 grid grid-cols-11 relative">
                    {GANTT_HOURS.map(hour => (
                      <div
                        key={hour}
                        className={`px-2 py-3 text-center border-r border-slate-200/70 last:border-r-0 ${
                          hour === 14 ? 'bg-emerald-50 text-[#006c49]' : ''
                        }`}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Các dòng phương tiện trong đội xe */}
                {fleet.map(vehicle => {
                  const vehicleTrips = transfers.filter(t => t.vehicleId === vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      className="grid grid-cols-12 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Cột thông tin Xe & Tài xế */}
                      <div className="col-span-3 px-4 py-3 border-r border-slate-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 truncate">
                            {vehicle.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            <span className="font-mono font-bold text-[#006c49]">
                              {vehicle.plateNumber}
                            </span>{' '}
                            • TX: {vehicle.driverName}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">
                          {vehicle.tierTag}
                        </span>
                      </div>

                      {/* Cột thanh lịch trình Gantt (10:00 -> 21:00 = 11 tiếng) */}
                      <div className="col-span-9 relative h-16 bg-white flex items-center">
                        {/* Lưới chia cột giờ */}
                        <div className="absolute inset-0 grid grid-cols-11 pointer-events-none">
                          {GANTT_HOURS.map(hour => (
                            <div
                              key={hour}
                              className={`border-r border-dashed border-slate-200/80 last:border-r-0 ${
                                hour === 14 ? 'bg-emerald-50/30' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* Vạch đỏ thời gian thực 14:18 */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                          style={{ left: `${((14.3 - 10) / 11) * 100}%` }}
                          title="Thời gian thực: 14:18"
                        />

                        {/* Các khối chuyến xe trên dòng Gantt */}
                        {vehicleTrips.map(trip => {
                          const start = Math.max(10, Math.min(20, trip.startHour || 14));
                          const end = Math.max(start + 0.9, Math.min(21, trip.endHour || start + 1.5));
                          const leftPercent = ((start - 10) / 11) * 100;
                          const widthPercent = ((end - start) / 11) * 100;

                          let barClass =
                            'bg-sky-500 hover:bg-sky-600 text-white border-sky-600';
                          let statusDot = 'Chưa đón';
                          if (trip.status === 'PICKING_UP') {
                            barClass =
                              'bg-[#006c49] hover:bg-[#005538] text-white border-emerald-900 ring-2 ring-emerald-300';
                            statusDot = 'Đang đón';
                          } else if (trip.status === 'COMPLETED') {
                            barClass =
                              'bg-slate-500 hover:bg-slate-600 text-white border-slate-600 opacity-85';
                            statusDot = 'Hoàn thành';
                          }

                          return (
                            <div
                              key={trip.id}
                              onClick={() => setActiveRadarTripId(trip.id)}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`
                              }}
                              className={`absolute h-11 rounded-xl px-2.5 py-1 border shadow-xs cursor-pointer transition-all z-20 flex flex-col justify-center overflow-hidden ${barClass}`}
                              title={`${trip.code} • ${trip.guestName} (${trip.flightCode}) - Bấm để xem GPS hoặc đổi trạng thái`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold leading-none">
                                <span className="truncate">
                                  {trip.code} • {trip.flightCode} ({trip.flightTime})
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-black/20 text-[9px] shrink-0">
                                  {statusDot}
                                </span>
                              </div>
                              <div className="text-[10px] font-medium truncate mt-1 opacity-95">
                                {trip.guestName} (P.{trip.roomNumber})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* 5. BANNER TIÊU CHUẨN ĐÓN TIỄN CONCIERGE LUXURY (KHỚP 100% ẢNH MẪU)      */}
        {/* ======================================================================= */}
        <div className="bg-[#eff4f1] rounded-2xl border border-emerald-200/70 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#006c49] text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                TIÊU CHUẨN ĐÓN TIỄN CONCIERGE LUXURY • 100% ĐẠT CHUẨN FORBES TRAVEL GUIDE
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Kiểm tra áp suất lốp, khử khuẩn buồng lái, sạc điện thoại đa năng và ô che mưa cao
                cấp sẵn sàng trên từng xe.
              </div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 shrink-0 md:text-right">
            TRỰC BAN QUẢN LÝ XE:{' '}
            <strong className="text-[#006c49] font-extrabold">TRẦN ANH TUẤN (EXT: 884)</strong>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* MODAL 1: + ĐẶT CHUYẾN ĐƯA ĐÓN MỚI (TIẾP NHẬN MÃ CHUYẾN BAY, GIỜ HẠ CÁNH) */}
        {/* ======================================================================= */}
        {isNewTripModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="px-6 py-4 bg-[#006c49] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined">flight_land</span>
                  <div>
                    <h3 className="text-base font-extrabold">
                      Đặt Chuyến Đưa Đón Sân Bay &amp; Điều Phối Xe Mới
                    </h3>
                    <p className="text-[11px] text-emerald-100">
                      Tiếp nhận lịch bay của khách lưu trú &amp; gán phương tiện hạng sang
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTripModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loại hành trình đưa đón
                    </label>
                    <select
                      value={newTripForm.direction}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, direction: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    >
                      <option value="ARRIVAL">✈️ Đón Sân Bay Phú Quốc (Arrival)</option>
                      <option value="DEPARTURE">🛫 Tiễn Sân Bay Phú Quốc (Departure)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã chuyến bay (Flight Code)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: VN-1233, SQ-22, VJ-324"
                      value={newTripForm.flightCode}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, flightCode: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giờ hạ cánh / Khởi hành
                    </label>
                    <input
                      type="time"
                      required
                      value={newTripForm.flightTime}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, flightTime: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số phòng lưu trú</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 804, 1401"
                      value={newTripForm.roomNumber}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, roomNumber: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hạng thẻ / VIP</label>
                    <select
                      value={newTripForm.guestBadge}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, guestBadge: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    >
                      <option value="VIP Titan">VIP Titan</option>
                      <option value="Penthouse VVIP">Penthouse VVIP</option>
                      <option value="Ocean Villa VIP">Ocean Villa VIP</option>
                      <option value="Đoàn Gia Đình">Đoàn Gia Đình</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ tên khách hàng / Đoàn khách
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập tên khách VIP (VD: Ngài Alexander Wright)"
                      value={newTripForm.guestName}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, guestName: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số lượng khách</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={newTripForm.passengerCount}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, passengerCount: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Điều phối Phương tiện
                    </label>
                    <select
                      value={newTripForm.vehicleId}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, vehicleId: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    >
                      {fleet.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.plateNumber}) - {v.tierTag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Điều phối Chauffeur (Tài xế)
                    </label>
                    <select
                      value={newTripForm.driverId}
                      onChange={e =>
                        setNewTripForm(prev => ({ ...prev, driverId: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    >
                      {chauffeurs.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) • {c.rating}★
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ghi chú chuẩn bị đón tiếp Concierge (Bảng tên, Nước Evian, Ghế trẻ em...)
                  </label>
                  <textarea
                    rows={2}
                    value={newTripForm.vipNote}
                    onChange={e => setNewTripForm(prev => ({ ...prev, vipNote: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsNewTripModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#006c49] hover:bg-[#005538] text-white font-bold shadow-md cursor-pointer"
                  >
                    Xác Nhận &amp; Phát Lệnh Điều Xe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL 2: ĐIỀU PHỐI XE & TÀI XẾ NHANH                                    */}
        {/* ======================================================================= */}
        {isDispatchModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">swap_horiz</span>
                  <div>
                    <h3 className="text-base font-extrabold">Điều Phối Đội Xe &amp; Tài Xế Nhanh</h3>
                    <p className="text-[11px] text-slate-300">
                      Thay đổi phương tiện hoặc Chauffeur chuyên trách theo thời gian thực
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveDispatch} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chọn chuyến xe cần điều phối
                  </label>
                  <select
                    value={dispatchForm.tripId}
                    onChange={e => {
                      const t = transfers.find(item => item.id === e.target.value);
                      if (t) {
                        setDispatchForm({
                          tripId: t.id,
                          vehicleId: t.vehicleId,
                          driverId: t.driverId,
                          vipNote: t.vipNote || ''
                        });
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                  >
                    {transfers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.guestName} ({t.flightCode} • {t.flightTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phương tiện hạng sang chỉ định
                  </label>
                  <select
                    value={dispatchForm.vehicleId}
                    onChange={e =>
                      setDispatchForm(prev => ({ ...prev, vehicleId: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                  >
                    {fleet.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} • Biển: {v.plateNumber} ({v.tierTag})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chauffeur (Tài xế) phụ trách
                  </label>
                  <select
                    value={dispatchForm.driverId}
                    onChange={e =>
                      setDispatchForm(prev => ({ ...prev, driverId: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                  >
                    {chauffeurs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Mã NV: {c.code}) — Đánh giá {c.rating}★
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chỉ thị bổ sung cho Tài xế &amp; Lễ tân sân bay
                  </label>
                  <textarea
                    rows={2}
                    value={dispatchForm.vipNote}
                    onChange={e => setDispatchForm(prev => ({ ...prev, vipNote: e.target.value }))}
                    placeholder="Nhập ghi chú đón tiếp..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsDispatchModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#006c49] hover:bg-[#005538] text-white font-bold cursor-pointer"
                  >
                    Cập Nhật Điều Phối
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL 3: BỘ ĐÀM KÊNH 04 (CONCIERGE RADIO)                               */}
        {/* ======================================================================= */}
        {isRadioModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 text-white rounded-2xl border border-sky-500/40 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
                  <h3 className="text-base font-extrabold text-sky-400 uppercase tracking-wider">
                    Bộ Đàm Kênh 04 • Concierge &amp; Đội Xe
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRadioModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="bg-slate-800/90 rounded-xl p-4 space-y-3 text-xs border border-slate-700">
                <div className="border-l-2 border-emerald-400 pl-3">
                  <div className="font-bold text-emerald-400">
                    [14:16] TX Đỗ Văn Sơn (Maybach 68A-888.99):
                  </div>
                  <p className="text-slate-200 mt-0.5">
                    &ldquo;Báo cáo Sảnh: Đã đón khách VIP Arthur Dent (#TR-801) từ Ga đến PQC, cách
                    Resort 6.2 km, dự kiến 7 phút nữa chạm sảnh chính.&rdquo;
                  </p>
                </div>
                <div className="border-l-2 border-sky-400 pl-3">
                  <div className="font-bold text-sky-400">
                    [14:17] Trực ban Quản lý xe Trần Anh Tuấn (EXT: 884):
                  </div>
                  <p className="text-slate-200 mt-0.5">
                    &ldquo;Rõ! Đội Bellman &amp; Xe điện Buggy Sảnh A đã sẵn sàng đón tiếp phòng
                    804.&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRadioModalOpen(false);
                    showToast(
                      'Tín hiệu Bộ đàm Kênh 04',
                      'Đã gửi lệnh xác nhận chuẩn bị đón VIP tới toàn đội xe & Bellman sảnh chính!'
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  🎙️ Phát Tín Hiệu Điều Đón Sảnh Chính
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL 4: XUẤT LỊCH TRÌNH TÀI XẾ (PRINT MANIFEST)                        */}
        {/* ======================================================================= */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#006c49]">
                    GRAND HORIZON PHÚ QUỐC SANCTUARY • CONCIERGE FLEET
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Phiếu Lệnh Điều Độ Lịch Trình Tài Xế Trong Ngày
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Mã</th>
                      <th className="p-2.5">Chuyến bay / Giờ</th>
                      <th className="p-2.5">Khách hàng</th>
                      <th className="p-2.5">Phương tiện</th>
                      <th className="p-2.5">Tài xế</th>
                      <th className="p-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map(t => (
                      <tr key={t.id} className="border-b border-slate-100">
                        <td className="p-2.5 font-mono font-bold">{t.code}</td>
                        <td className="p-2.5">
                          {t.flightCode} ({t.flightTime})
                        </td>
                        <td className="p-2.5 font-bold">
                          {t.guestName} (P.{t.roomNumber})
                        </td>
                        <td className="p-2.5">
                          {t.vehicleName} ({t.plateNumber})
                        </td>
                        <td className="p-2.5 font-semibold">{t.driverName}</td>
                        <td className="p-2.5 font-bold text-[#006c49]">{t.statusBadge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setIsPrintModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#006c49] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  In Lịch Trình Ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

