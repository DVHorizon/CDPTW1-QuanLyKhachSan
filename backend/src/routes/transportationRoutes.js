'use strict';

const express = require('express');
const router = express.Router();

// Dữ liệu mẫu chuẩn xác theo giao diện Phân hệ 50 - Grand Horizon Phú Quốc Sanctuary
let TRANSFERS_DB = [
  {
    id: 'TR-801',
    code: '#TR-801',
    direction: 'ARRIVAL', // ARRIVAL (Đón sân bay) | DEPARTURE (Tiễn sân bay) | TOUR (Tour đảo)
    status: 'PICKING_UP', // PENDING (Chưa đón) | PICKING_UP (Đang đón) | COMPLETED (Hoàn thành)
    statusBadge: 'ĐANG ĐÓN VỀ RESORT',
    flightCode: 'VN-1233',
    flightTime: '14:10',
    scheduledTime: '14:10',
    estimatedArrival: '14:28',
    startHour: 13.5,
    endHour: 15.0,
    guestName: 'Arthur Dent',
    guestBadge: 'VIP Titan',
    guestBadgeType: 'vip_titan',
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
    distanceText: '6.2 km tới sảnh',
    distanceSubtext: 'Dự kiến: 14:28',
    rightLabel: 'Khoảng cách thực tế',
    vipNote: 'Khách yêu cầu nhạc cổ điển, nước khoáng San Pellegrino và khăn lạnh hương sả chanh.',
    gpsCoords: { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 }
  },
  {
    id: 'TR-802',
    code: '#TR-802',
    direction: 'ARRIVAL',
    status: 'PENDING', // Chưa đón (Sắp xuất bến sảnh đi đón)
    statusBadge: 'SẮP XUẤT BẾN SẢNH',
    flightCode: 'VJ-324',
    flightTime: '15:05',
    scheduledTime: '14:35',
    estimatedArrival: '15:40',
    startHour: 14.5,
    endHour: 16.2,
    guestName: 'Đoàn Khách Gia Đình Phòng 618',
    guestSubLabel: '(Đón Sân Bay Ga Quốc Nội)',
    guestBadge: 'Đoàn 8 Khách',
    guestBadgeType: 'group',
    roomNumber: '618',
    passengerCount: 8,
    luggageCount: 10,
    pickupLocation: 'Sân bay PQC (Ga Quốc Nội)',
    dropoffLocation: 'Grand Horizon Bãi Dài - Sảnh A',
    vehicleId: 'VH-02',
    vehicleName: 'Ford Transit Dcar Limousine',
    plateNumber: '68B-123.45',
    driverId: 'CH-405',
    driverName: 'Trần Quốc Bảo',
    driverPhone: '0908 123 405',
    distanceText: '14:35',
    distanceSubtext: 'Xe đã sẵn sàng ở sảnh A',
    rightLabel: 'Khởi hành từ Bãi Xe',
    vipNote: 'Có 2 trẻ nhỏ, đã chuẩn bị ghế an toàn trẻ em (ISOFIX) và bánh ngọt chào mừng trên xe.',
    gpsCoords: { progress: 10, speed: '0 km/h (Đỗ sảnh A)', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-803',
    code: '#TR-803',
    direction: 'ARRIVAL',
    status: 'PENDING', // Chưa đón (Chờ cất cánh / hạ cánh)
    statusBadge: 'CHỜ CẤT CÁNH / HẠ CÁNH',
    flightCode: 'SQ-22',
    flightTime: '16:30',
    scheduledTime: '16:30',
    estimatedArrival: '17:05',
    startHour: 16.0,
    endHour: 17.8,
    guestName: 'Ngài Kenji Sato',
    guestBadge: 'Suite 1401 Penthouse',
    guestBadgeType: 'penthouse',
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
    distanceText: '16:30',
    distanceSubtext: 'Tài xế đã có mặt tại PQC',
    rightLabel: 'Dự kiến hạ cánh',
    vipNote: 'Bảng đón VIP mạ vàng + Nước suối Evian lạnh đã cấp phát cho đội lễ tân sân bay.',
    gpsCoords: { progress: 0, speed: 'Trực chờ Ga VIP PQC', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-804',
    code: '#TR-804',
    direction: 'DEPARTURE',
    status: 'COMPLETED', // Hoàn thành
    statusBadge: 'HOÀN TẤT TIỄN KHÁCH',
    flightCode: 'VN-1230',
    flightTime: '14:00',
    scheduledTime: '12:00',
    estimatedArrival: '12:45',
    startHour: 11.8,
    endHour: 13.2,
    guestName: 'Bà Clara Higgins',
    guestSubLabel: 'Check-out Folio #9042',
    guestBadge: 'Tiễn Sân Bay PQC',
    guestBadgeType: 'completed',
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
    distanceText: '12:45',
    distanceSubtext: 'Ký nhận điện tử: ĐẠT',
    rightLabel: 'Giờ hoàn thành',
    vipNote: 'Đã bàn giao hành lý tại Quầy Vietnam Airlines lúc 12:45. Xe đang trên đường quay lại Resort.',
    gpsCoords: { progress: 100, speed: 'Hoàn tất lộ trình', etaMinutes: 0, distanceKm: 0 }
  },
  {
    id: 'TR-805',
    code: '#TR-805',
    direction: 'DEPARTURE',
    status: 'PENDING',
    statusBadge: 'CHỜ ĐÓN TẠI VILLA',
    flightCode: 'QH-1524',
    flightTime: '19:20',
    scheduledTime: '17:15',
    estimatedArrival: '17:50',
    startHour: 17.2,
    endHour: 18.8,
    guestName: 'Gia Đình Ông Hoàng Nam',
    guestBadge: 'Ocean Villa 102',
    guestBadgeType: 'penthouse',
    roomNumber: '102',
    passengerCount: 4,
    luggageCount: 6,
    pickupLocation: 'Ocean Villa 102 - Grand Horizon',
    dropoffLocation: 'Sân bay PQC (Ga T1)',
    vehicleId: 'VH-05',
    vehicleName: 'Toyota Alphard Executive Lounge',
    plateNumber: '68A-333.66',
    driverId: 'CH-412',
    driverName: 'Phạm Gia Huy',
    driverPhone: '0909 333 412',
    distanceText: '17:15',
    distanceSubtext: 'Buggy đón tại Villa 17:00',
    rightLabel: 'Giờ xuất phát tiễn',
    vipNote: 'Hỗ trợ đóng gói 2 bộ gậy Golf Titleist và làm thủ tục Fast-Track tại sân bay Phú Quốc.',
    gpsCoords: { progress: 0, speed: 'Chờ xuất bến', etaMinutes: 32, distanceKm: 24.0 }
  },
  {
    id: 'TR-806',
    code: '#TR-806',
    direction: 'TOUR',
    status: 'PICKING_UP',
    statusBadge: 'ĐANG DI CHUYỂN TOUR NAM ĐẢO',
    flightCode: 'TOUR-VIP02',
    flightTime: '13:30',
    scheduledTime: '13:30',
    estimatedArrival: '18:00',
    startHour: 13.5,
    endHour: 18.0,
    guestName: 'Vợ Chồng Ông David Beckham',
    guestBadge: 'Royal Suite 1501',
    guestBadgeType: 'vip_titan',
    roomNumber: '1501',
    passengerCount: 2,
    luggageCount: 2,
    pickupLocation: 'Grand Horizon Bãi Dài',
    dropoffLocation: 'Bến Du Thuyền An Thới • Hòn Thơm',
    vehicleId: 'VH-06',
    vehicleName: 'Ford Transit Dcar President',
    plateNumber: '68B-567.89',
    driverId: 'CH-415',
    driverName: 'Vũ Đình Trọng',
    driverPhone: '0938 567 415',
    distanceText: '11.4 km tới cảng',
    distanceSubtext: 'Dự kiến: 14:40',
    rightLabel: 'Hành trình Tour Đảo',
    vipNote: 'Phục vụ Champagne ướp lạnh trên xe, kết nối bộ đàm trực tiếp với Thuyền trưởng Du thuyền.',
    gpsCoords: { progress: 58, speed: '48 km/h', etaMinutes: 15, distanceKm: 11.4 }
  }
];

const FLEET_VEHICLES = [
  {
    id: 'VH-01',
    name: 'Mercedes Maybach S450',
    shortName: 'Mercedes Maybach ...',
    plateNumber: '68A-888.99',
    tierTag: 'VIP 1:1',
    type: 'Maybach',
    seats: 3,
    fuelLevel: 92,
    amenities: ['Wifi', 'Khăn Lạnh', 'Champagne Box'],
    specLine: 'Nhiên liệu: 92% • Wifi • Khăn Lạnh',
    status: 'ON_ROUTE', // AVAILABLE | ON_ROUTE | STANDBY | MAINTENANCE
    statusLabel: 'Đang đón #TR-801',
    driverId: 'CH-402',
    driverName: 'Đỗ Văn Sơn',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=80'
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
    amenities: ['Ghế Massage', 'TV 32"', 'Tủ Lạnh Mini'],
    specLine: 'Nhiên liệu: 88% • Ghế Massage',
    status: 'STANDBY',
    statusLabel: 'Sẵn sàng Sảnh A',
    driverId: 'CH-405',
    driverName: 'Trần Quốc Bảo',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-03',
    name: 'Mercedes Maybach S680',
    shortName: 'Mercedes Maybach S680',
    plateNumber: '68A-999.88',
    tierTag: 'VVIP Tổng Thống',
    type: 'Maybach',
    seats: 3,
    fuelLevel: 96,
    amenities: ['Bàn Làm Việc', 'Ly Bạc Robbe & Berking', 'Cách Âm Chủ Động'],
    specLine: 'Nhiên liệu: 96% • Bàn VIP • Evian',
    status: 'STANDBY',
    statusLabel: 'Chờ tại Ga VIP PQC',
    driverId: 'CH-408',
    driverName: 'Lê Hoàng Phúc',
    image: 'https://images.unsplash.com/photo-1618843479319-561729142657?w=600&auto=format&fit=crop&q=80'
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
    amenities: ['Ghế Thương Gia', 'Sạc Không Dây', 'Rèm Chắn Nắng'],
    specLine: 'Nhiên liệu: 84% • Sạc Đa Năng',
    status: 'AVAILABLE',
    statusLabel: 'Vừa về từ PQC',
    driverId: 'CH-410',
    driverName: 'Nguyễn Minh Tâm',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80'
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
    amenities: ['Ghế Ottoman Sưởi/Làm Mát', 'Trần Sao LED', 'Wifi 5G'],
    specLine: 'Nhiên liệu: 90% • Ghế Ottoman',
    status: 'AVAILABLE',
    statusLabel: 'Túc trực Bãi Xe Sảnh',
    driverId: 'CH-412',
    driverName: 'Phạm Gia Huy',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80'
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
    amenities: ['Quầy Bar Mini', 'Âm Thanh Bose', 'Ghế Massage Toàn Thân'],
    specLine: 'Nhiên liệu: 79% • Quầy Bar Mini',
    status: 'ON_ROUTE',
    statusLabel: 'Đang chạy Tour Đảo',
    driverId: 'CH-415',
    driverName: 'Vũ Đình Trọng',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-07',
    name: 'Mercedes Maybach GLS 600',
    shortName: 'Maybach GLS 600 SUV',
    plateNumber: '68A-777.99',
    tierTag: 'SUV Hạng Sang',
    type: 'Maybach',
    seats: 4,
    fuelLevel: 95,
    amenities: ['Hệ Thống Treo E-Active', 'Tủ Lạnh Champagne', 'Khử Khuẩn Ion'],
    specLine: 'Nhiên liệu: 95% • Khử Khuẩn Ion',
    status: 'AVAILABLE',
    statusLabel: 'Sẵn sàng điều phối',
    driverId: 'CH-418',
    driverName: 'Đặng Tuấn Kiệt',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'VH-08',
    name: 'Mercedes-Benz V250 Luxury',
    shortName: 'Mercedes V250 Luxury',
    plateNumber: '68A-112.23',
    tierTag: 'Bảo Dưỡng Định Kỳ',
    type: 'Limousine',
    seats: 7,
    fuelLevel: 100,
    amenities: ['Kiểm tra áp suất lốp', 'Thay lọc gió điều hòa'],
    specLine: 'Đang bảo dưỡng định kỳ tại Xưởng',
    status: 'MAINTENANCE',
    statusLabel: 'Bảo dưỡng định kỳ',
    driverId: 'CH-420',
    driverName: 'Hoàng Văn Thái',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80'
  }
];

const CHAUFFEURS = [
  {
    id: 'CH-402',
    name: 'Đỗ Văn Sơn',
    code: 'CH-402',
    rating: '4.98',
    experience: 'Kinh nghiệm 12 năm • Thông thạo Anh - Việt • Chứng chỉ Lái xe Phòng vệ Quốc tế',
    status: 'ON_ROUTE',
    statusLabel: 'Trên lộ trình (#TR-801)',
    phone: '0903 888 402',
    assignedVehicle: 'Mercedes Maybach S450 (68A-888.99)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    isFeatured: true
  },
  {
    id: 'CH-405',
    name: 'Trần Quốc Bảo',
    code: 'CH-405',
    rating: '4.95',
    experience: 'Kinh nghiệm 9 năm • Chuyên trách Đoàn Gia Đình & Chuyên gia Quốc tế',
    status: 'LOBBY_STANDBY',
    statusLabel: 'Túc trực sảnh A (#TR-802)',
    phone: '0908 123 405',
    assignedVehicle: 'Ford Transit Dcar Limousine (68B-123.45)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    isFeatured: false
  },
  {
    id: 'CH-408',
    name: 'Lê Hoàng Phúc',
    code: 'CH-408',
    rating: '4.97',
    experience: 'Kinh nghiệm 10 năm • Thông thạo Anh - Nhật • Chuyên trách khách Penthouse',
    status: 'WAITING_PQC',
    statusLabel: 'Chờ PQC (#TR-803)',
    phone: '0912 999 408',
    assignedVehicle: 'Mercedes Maybach S680 (68A-999.88)',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    isFeatured: false
  },
  {
    id: 'CH-410',
    name: 'Nguyễn Minh Tâm',
    code: 'CH-410',
    rating: '4.92',
    experience: 'Kinh nghiệm 8 năm • Lái xe an toàn 100.000 km không vi phạm',
    status: 'ON_ROUTE',
    statusLabel: 'Đang về từ PQC (#TR-804)',
    phone: '0918 456 410',
    assignedVehicle: 'Kia Carnival Signature VIP (68A-456.78)',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    isFeatured: false
  },
  {
    id: 'CH-412',
    name: 'Phạm Gia Huy',
    code: 'CH-412',
    rating: '4.94',
    experience: 'Kinh nghiệm 7 năm • Thông thạo Anh - Hàn • Đón tiễn Golf & Villa VIP',
    status: 'LOBBY_STANDBY',
    statusLabel: 'Túc trực sảnh (#TR-805)',
    phone: '0909 333 412',
    assignedVehicle: 'Toyota Alphard Executive (68A-333.66)',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
    isFeatured: false
  },
  {
    id: 'CH-415',
    name: 'Vũ Đình Trọng',
    code: 'CH-415',
    rating: '4.96',
    experience: 'Kinh nghiệm 11 năm • Am hiểu tuyến Nam Đảo & Bến Du Thuyền',
    status: 'ON_ROUTE',
    statusLabel: 'Trên lộ trình (#TR-806)',
    phone: '0938 567 415',
    assignedVehicle: 'Ford Transit Dcar President (68B-567.89)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    isFeatured: false
  }
];

// 1. GET /api/transportation/overview
router.get('/overview', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalTripsToday: 18,
      airportTrips: 12,
      islandTourTrips: 6,
      activeVehicles: 8,
      totalVehicles: 10,
      maybachCount: 3,
      limousineCount: 4,
      carnivalCount: 1,
      maintenanceCount: 2,
      activeChauffeurs: 8,
      onRouteChauffeurs: 4,
      waitingPqcChauffeurs: 2,
      lobbyStandbyChauffeurs: 2
    },
    transfers: TRANSFERS_DB,
    fleet: FLEET_VEHICLES,
    chauffeurs: CHAUFFEURS
  });
});

// 2. POST /api/transportation/transfers - Đặt chuyến đưa đón mới
router.post('/transfers', (req, res) => {
  const {
    direction = 'ARRIVAL',
    flightCode = 'VN-1239',
    flightTime = '15:30',
    guestName = 'Khách VIP Mới',
    guestBadge = 'VIP Suite',
    roomNumber = '901',
    passengerCount = 2,
    luggageCount = 2,
    vehicleId = 'VH-01',
    driverId = 'CH-402',
    vipNote = 'Đón tiêu chuẩn Concierge Luxury 5 sao.'
  } = req.body;

  const vehicle = FLEET_VEHICLES.find(v => v.id === vehicleId) || FLEET_VEHICLES[0];
  const driver = CHAUFFEURS.find(d => d.id === driverId) || CHAUFFEURS[0];

  const nextNum = 800 + TRANSFERS_DB.length + 1;
  const id = `TR-${nextNum}`;

  const parsedHour = parseInt((flightTime || '15:00').split(':')[0], 10) || 15;
  const parsedMin = parseInt((flightTime || '15:00').split(':')[1], 10) || 0;
  const startHour = parsedHour + (parsedMin / 60);

  const newTransfer = {
    id,
    code: `#${id}`,
    direction,
    status: 'PENDING',
    statusBadge: direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH',
    flightCode,
    flightTime,
    scheduledTime: flightTime,
    estimatedArrival: `${String((parsedHour + 1) % 24).padStart(2, '0')}:${String(parsedMin).padStart(2, '0')}`,
    startHour,
    endHour: Math.min(22, startHour + 1.5),
    guestName,
    guestBadge,
    guestBadgeType: 'vip_titan',
    roomNumber,
    passengerCount: Number(passengerCount) || 2,
    luggageCount: Number(luggageCount) || 2,
    pickupLocation: direction === 'DEPARTURE' ? `Grand Horizon - Phòng ${roomNumber}` : 'Sân bay PQC (Ga T1/T2)',
    dropoffLocation: direction === 'DEPARTURE' ? 'Sân bay PQC (Ga T1/T2)' : `Grand Horizon - Phòng ${roomNumber}`,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    plateNumber: vehicle.plateNumber,
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone,
    distanceText: flightTime,
    distanceSubtext: direction === 'DEPARTURE' ? 'Xe đã sẵn sàng ở sảnh A' : 'Tài xế đã nhận lệnh điều động',
    rightLabel: direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh',
    vipNote,
    gpsCoords: { progress: 0, speed: 'Chờ xuất phát', etaMinutes: 32, distanceKm: 24.0 }
  };

  TRANSFERS_DB.unshift(newTransfer);

  res.status(201).json({
    success: true,
    message: `Đã khởi tạo lịch trình đưa đón ${newTransfer.code} cho khách ${guestName} thành công!`,
    data: newTransfer
  });
});

// 3. PATCH /api/transportation/transfers/:id/status - Cập nhật trạng thái: Chưa đón -> Đang đón -> Hoàn thành
router.patch('/transfers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'PENDING' | 'PICKING_UP' | 'COMPLETED'

  const transfer = TRANSFERS_DB.find(t => t.id === id || t.code === id);
  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe!' });
  }

  transfer.status = status;
  if (status === 'PENDING') {
    transfer.statusBadge = transfer.direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH';
    transfer.rightLabel = transfer.direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh';
    transfer.distanceText = transfer.flightTime;
    transfer.distanceSubtext = 'Tài xế đã sẵn sàng tại vị trí';
    transfer.gpsCoords = { progress: 10, speed: 'Chờ xuất phát', etaMinutes: 32, distanceKm: 24.0 };
  } else if (status === 'PICKING_UP') {
    transfer.statusBadge = transfer.direction === 'DEPARTURE' ? 'ĐANG TIỄN RA SÂN BAY PQC' : 'ĐANG ĐÓN VỀ RESORT';
    transfer.rightLabel = 'Khoảng cách thực tế';
    transfer.distanceText = '6.2 km tới sảnh';
    transfer.distanceSubtext = `Dự kiến: ${transfer.estimatedArrival}`;
    transfer.gpsCoords = { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 };
  } else if (status === 'COMPLETED') {
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    transfer.statusBadge = transfer.direction === 'DEPARTURE' ? 'HOÀN TẤT TIỄN KHÁCH' : 'HOÀN TẤT ĐÓN KHÁCH';
    transfer.rightLabel = 'Giờ hoàn thành';
    transfer.distanceText = nowTime;
    transfer.distanceSubtext = 'Ký nhận điện tử: ĐẠT';
    transfer.gpsCoords = { progress: 100, speed: 'Hoàn tất tại sảnh', etaMinutes: 0, distanceKm: 0 };
  }

  res.json({
    success: true,
    message: `Đã chuyển trạng thái chuyến ${transfer.code} sang [${transfer.statusBadge}]!`,
    data: transfer
  });
});

// 4. PATCH /api/transportation/transfers/:id/dispatch - Điều phối đổi xe & tài xế
router.patch('/transfers/:id/dispatch', (req, res) => {
  const { id } = req.params;
  const { vehicleId, driverId, vipNote } = req.body;

  const transfer = TRANSFERS_DB.find(t => t.id === id || t.code === id);
  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe!' });
  }

  if (vehicleId) {
    const vehicle = FLEET_VEHICLES.find(v => v.id === vehicleId);
    if (vehicle) {
      transfer.vehicleId = vehicle.id;
      transfer.vehicleName = vehicle.name;
      transfer.plateNumber = vehicle.plateNumber;
    }
  }

  if (driverId) {
    const driver = CHAUFFEURS.find(d => d.id === driverId);
    if (driver) {
      transfer.driverId = driver.id;
      transfer.driverName = driver.name;
      transfer.driverPhone = driver.phone;
    }
  }

  if (vipNote !== undefined) {
    transfer.vipNote = vipNote;
  }

  res.json({
    success: true,
    message: `Đã điều phối ${transfer.vehicleName} (${transfer.plateNumber}) • Tài xế ${transfer.driverName} cho chuyến ${transfer.code}!`,
    data: transfer
  });
});

module.exports = router;

