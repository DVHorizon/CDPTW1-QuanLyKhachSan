'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Dữ liệu mẫu chuẩn xác theo giao diện Phân hệ 50 - Grand Horizon Phú Quốc Sanctuary
const SEED_TRANSFERS = [
  {
    id: 'TR-801',
    code: '#TR-801',
    direction: 'ARRIVAL',
    status: 'PICKING_UP',
    statusBadge: 'ĐANG ĐÓN VỀ RESORT',
    flightCode: 'VN-1233',
    flightTime: '14:10',
    flightLabel: 'Chuyến bay: VN-1233 (14:10)',
    scheduledTime: '14:10',
    estimatedArrival: '14:28',
    startHour: 13.5,
    endHour: 15.0,
    guestName: 'Arthur Dent',
    guestSubInline: null,
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
    gpsCoords: { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 },
    sortOrder: 1
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
    guestBadgeStyle: null,
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
    gpsCoords: { progress: 12, speed: '0 km/h (Sảnh A)', etaMinutes: 32, distanceKm: 24.0 },
    sortOrder: 2
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
    guestSubInline: null,
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
    gpsCoords: { progress: 5, speed: 'Trực chờ tại PQC', etaMinutes: 32, distanceKm: 24.0 },
    sortOrder: 3
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
    guestBadgeStyle: null,
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
    gpsCoords: { progress: 100, speed: 'Đã hoàn thành', etaMinutes: 0, distanceKm: 0 },
    sortOrder: 4
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
    guestSubInline: null,
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
    gpsCoords: { progress: 0, speed: 'Chờ xuất bến', etaMinutes: 32, distanceKm: 24.0 },
    sortOrder: 5
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
    guestSubInline: null,
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
    gpsCoords: { progress: 58, speed: '48 km/h', etaMinutes: 15, distanceKm: 11.4 },
    sortOrder: 6
  }
];

let TRANSFERS_MEM = [...SEED_TRANSFERS];

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
    specLine: 'Nhiên liệu: 92% • Wifi • Khăn Lạnh',
    status: 'ON_ROUTE',
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
    specLine: 'Nhiên liệu: 88% • Ghế Massage',
    status: 'STANDBY',
    driverId: 'CH-405',
    driverName: 'Trần Quốc Bảo',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'
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
    specLine: 'Nhiên liệu: 84% • Sạc Đa Năng',
    status: 'AVAILABLE',
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
    specLine: 'Nhiên liệu: 90% • Ghế Ottoman',
    status: 'AVAILABLE',
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
    specLine: 'Nhiên liệu: 79% • Quầy Bar Mini',
    status: 'ON_ROUTE',
    driverId: 'CH-415',
    driverName: 'Vũ Đình Trọng',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80'
  }
];

const CHAUFFEURS = [
  {
    id: 'CH-402',
    name: 'Đỗ Văn Sơn',
    code: 'CH-402',
    rating: '4.98',
    experience: 'Kinh nghiệm 12 năm • Thông thạo Anh - Việt ...',
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
    phone: '0938 567 415',
    status: 'ON_ROUTE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  }
];

// Tự động tạo bảng AirportTransfers trong MySQL và seed dữ liệu mẫu
let isTableReady = false;
async function ensureAirportTransfersTable() {
  if (isTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS AirportTransfers (
        id VARCHAR(32) PRIMARY KEY,
        payload JSON NOT NULL,
        sortOrder INT DEFAULT 100,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM AirportTransfers');
    if (rows[0].cnt === 0) {
      for (const item of SEED_TRANSFERS) {
        await pool.query(
          'INSERT IGNORE INTO AirportTransfers (id, payload, sortOrder) VALUES (?, ?, ?)',
          [item.id, JSON.stringify(item), item.sortOrder || 10]
        );
      }
    }
    isTableReady = true;
  } catch (err) {
    console.warn('[Transportation] Dùng bộ nhớ tạm do chưa kết nối bảng AirportTransfers:', err.message);
  }
}
ensureAirportTransfersTable();

async function getAllTransfers() {
  await ensureAirportTransfersTable();
  if (isTableReady) {
    try {
      const [rows] = await pool.query(
        'SELECT payload FROM AirportTransfers ORDER BY sortOrder ASC, createdAt DESC'
      );
      if (rows.length > 0) {
        const parsed = rows.map(r => (typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload));
        TRANSFERS_MEM = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('[Transportation] Lỗi đọc AirportTransfers:', e.message);
    }
  }
  return TRANSFERS_MEM;
}

async function saveTransferRecord(transfer, sortOrder = 0) {
  await ensureAirportTransfersTable();
  if (isTableReady) {
    try {
      await pool.query(
        `INSERT INTO AirportTransfers (id, payload, sortOrder)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [transfer.id, JSON.stringify(transfer), sortOrder]
      );
    } catch (e) {
      console.warn('[Transportation] Lỗi lưu AirportTransfers:', e.message);
    }
  }
}

// 1. GET /api/transportation/overview
router.get('/overview', async (req, res) => {
  const transfers = await getAllTransfers();
  res.json({
    success: true,
    stats: {
      totalTripsToday: 12 + transfers.length,
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
    transfers,
    fleet: FLEET_VEHICLES,
    chauffeurs: CHAUFFEURS
  });
});

// 2. POST /api/transportation/transfers - Đặt chuyến đưa đón mới (Lưu vĩnh viễn vào MySQL)
router.post('/transfers', async (req, res) => {
  const transfers = await getAllTransfers();
  const {
    direction = 'ARRIVAL',
    flightCode = 'VN-1239',
    flightTime = '15:30',
    guestName = 'Khách VIP Mới',
    guestBadge = 'VIP Titan',
    roomNumber = '808',
    passengerCount = 2,
    luggageCount = 2,
    vehicleId = 'VH-01',
    driverId = 'CH-402',
    vipNote = ''
  } = req.body;

  const vehicle = FLEET_VEHICLES.find(v => v.id === vehicleId) || FLEET_VEHICLES[0];
  const driver = CHAUFFEURS.find(d => d.id === driverId) || CHAUFFEURS[0];

  // Tạo mã chuyến tiếp theo không trùng
  const existingNums = transfers
    .map(t => parseInt(String(t.id).replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 806;
  const nextNum = maxNum + 1;
  const id = `TR-${nextNum}`;

  const [hhStr, mmStr] = (flightTime || '15:30').split(':');
  const hh = parseInt(hhStr, 10) || 15;
  const mm = parseInt(mmStr, 10) || 30;
  const startHour = Math.max(10, Math.min(19.5, hh + mm / 60));
  const cleanFlight = String(flightCode || 'VN-1239').toUpperCase();

  const newTransfer = {
    id,
    code: `#${id}`,
    direction,
    status: 'PENDING',
    statusBadge: direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH',
    flightCode: cleanFlight,
    flightTime,
    flightLabel:
      direction === 'DEPARTURE'
        ? `Tiễn Sân Bay PQC (${cleanFlight})`
        : `Chuyến bay: ${cleanFlight} (${flightTime})`,
    scheduledTime: flightTime,
    estimatedArrival: `${String((hh + 1) % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    startHour,
    endHour: Math.min(20.8, startHour + 1.5),
    guestName: String(guestName).trim(),
    guestSubInline: null,
    guestBadge: `${guestBadge} • P.${roomNumber}`,
    guestBadgeStyle: 'bg-[#10b981] text-white',
    roomNumber,
    passengerCount: Number(passengerCount) || 2,
    luggageCount: Number(luggageCount) || 2,
    pickupLocation:
      direction === 'DEPARTURE'
        ? `Grand Horizon (Phòng ${roomNumber})`
        : 'Sân bay PQC (Ga T1/T2)',
    dropoffLocation:
      direction === 'DEPARTURE'
        ? 'Sân bay PQC (Ga T1/T2)'
        : `Grand Horizon (Phòng ${roomNumber})`,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    plateNumber: vehicle.plateNumber,
    driverId: driver.id,
    driverName: driver.name,
    driverPhone: driver.phone,
    rightLabel: direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh',
    distanceText: flightTime,
    distanceColor: 'text-sky-600',
    distanceSubtext:
      direction === 'DEPARTURE' ? 'Xe đã sẵn sàng ở sảnh A' : 'Tài xế đã nhận lệnh đón PQC',
    subtextColor: 'text-[#006c49] font-semibold',
    vipNote: vipNote || null,
    gpsCoords: { progress: 8, speed: 'Chờ xuất phát', etaMinutes: 32, distanceKm: 24.0 },
    sortOrder: 0
  };

  TRANSFERS_MEM.unshift(newTransfer);
  await saveTransferRecord(newTransfer, 0);

  res.status(201).json({
    success: true,
    message: `Đã khởi tạo lịch trình đưa đón ${newTransfer.code} cho khách ${guestName} thành công!`,
    data: newTransfer
  });
});

// 3. PATCH /api/transportation/transfers/:id/status - Cập nhật trạng thái lưu vào MySQL
router.patch('/transfers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const transfers = await getAllTransfers();
  const transfer = transfers.find(t => t.id === id || t.code === id);
  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe!' });
  }

  transfer.status = status;
  if (status === 'PENDING') {
    transfer.statusBadge =
      transfer.direction === 'DEPARTURE' ? 'SẮP XUẤT BẾN SẢNH' : 'CHỜ CẤT CÁNH / HẠ CÁNH';
    transfer.rightLabel =
      transfer.direction === 'DEPARTURE' ? 'Khởi hành từ Bãi Xe' : 'Dự kiến hạ cánh';
    transfer.distanceText = transfer.flightTime;
    transfer.distanceColor = 'text-sky-600';
    transfer.distanceSubtext = 'Xe đã sẵn sàng ở vị trí tập kết';
    transfer.subtextColor = 'text-slate-600 font-medium';
    transfer.gpsCoords = { progress: 10, speed: '0 km/h (Chờ đón)', etaMinutes: 32, distanceKm: 24.0 };
  } else if (status === 'PICKING_UP') {
    transfer.statusBadge =
      transfer.direction === 'DEPARTURE' ? 'ĐANG TIỄN RA SÂN BAY' : 'ĐANG ĐÓN VỀ RESORT';
    transfer.rightLabel = 'Khoảng cách thực tế';
    transfer.distanceText = '6.2 km tới sảnh';
    transfer.distanceColor = 'text-[#006c49]';
    transfer.distanceSubtext = `Dự kiến: ${transfer.estimatedArrival || '14:45'}`;
    transfer.subtextColor = 'text-slate-600 font-semibold';
    transfer.gpsCoords = { progress: 74, speed: '54 km/h', etaMinutes: 7, distanceKm: 6.2 };
  } else if (status === 'COMPLETED') {
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    transfer.statusBadge =
      transfer.direction === 'DEPARTURE' ? 'HOÀN TẤT TIỄN KHÁCH' : 'HOÀN TẤT ĐÓN KHÁCH';
    transfer.rightLabel = 'Giờ hoàn thành';
    transfer.distanceText = nowTime;
    transfer.distanceColor = 'text-slate-600';
    transfer.distanceSubtext = 'Ký nhận điện tử: ĐẠT';
    transfer.subtextColor = 'text-[#006c49] font-semibold';
    transfer.gpsCoords = { progress: 100, speed: 'Đã hoàn thành', etaMinutes: 0, distanceKm: 0 };
  }

  await saveTransferRecord(transfer, transfer.sortOrder ?? 1);

  res.json({
    success: true,
    message: `Đã chuyển trạng thái chuyến ${transfer.code} sang [${transfer.statusBadge}]!`,
    data: transfer
  });
});

// 4. PATCH /api/transportation/transfers/:id/dispatch - Điều phối đổi xe & tài xế lưu vào MySQL
router.patch('/transfers/:id/dispatch', async (req, res) => {
  const { id } = req.params;
  const { vehicleId, driverId, vipNote } = req.body;

  const transfers = await getAllTransfers();
  const transfer = transfers.find(t => t.id === id || t.code === id);
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
    transfer.vipNote = vipNote || null;
  }

  await saveTransferRecord(transfer, transfer.sortOrder ?? 1);

  res.json({
    success: true,
    message: `Đã điều phối ${transfer.vehicleName} (${transfer.plateNumber}) • Tài xế ${transfer.driverName} cho chuyến ${transfer.code}!`,
    data: transfer
  });
});

module.exports = router;
