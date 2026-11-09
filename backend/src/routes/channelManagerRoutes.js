'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const INITIAL_CHANNELS = [
  {
    id: 'OTA-BOOKING',
    shortCode: 'B.',
    badgeBg: 'bg-sky-100 text-sky-900',
    name: 'Booking.com',
    accountCode: 'ID: BK-VN-7749',
    status: 'ONLINE',
    statusLabel: 'TRỰC TUYẾN',
    latencyMs: 240,
    commissionRate: 15.0,
    marketLabel: null,
    bookingsToday: 14,
    revenueToday: 136200000,
    revenueShort: '136.2M đ',
    icalUrl: 'https://admin.booking.com/hotel/ical/pq-res-00421.ics',
  },
  {
    id: 'OTA-AGODA',
    shortCode: 'ag',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    name: 'Agoda International',
    accountCode: 'ID: AG-PQ-8812',
    status: 'ONLINE',
    statusLabel: 'TRỰC TUYẾN',
    latencyMs: 310,
    commissionRate: 14.0,
    marketLabel: null,
    bookingsToday: 12,
    revenueToday: 98400000,
    revenueShort: '98.4M đ',
    icalUrl: 'https://ycs.agoda.com/en-us/ical/export/8812.ics',
  },
  {
    id: 'OTA-EXPEDIA',
    shortCode: 'Ex',
    badgeBg: 'bg-amber-100 text-amber-900',
    name: 'Expedia Group',
    accountCode: 'ID: EX-SG-9921',
    status: 'ONLINE',
    statusLabel: 'TRỰC TUYẾN',
    latencyMs: 280,
    commissionRate: 18.0,
    marketLabel: null,
    bookingsToday: 8,
    revenueToday: 69800000,
    revenueShort: '69.8M đ',
    icalUrl: 'https://apps.expediapartnercentral.com/ical/9921.ics',
  },
  {
    id: 'OTA-TRIP',
    shortCode: 'CT',
    badgeBg: 'bg-teal-100 text-teal-900',
    name: 'Trip.com / Ctrip',
    accountCode: 'ID: TR-CN-3105',
    status: 'ONLINE',
    statusLabel: 'TRỰC TUYẾN',
    latencyMs: 340,
    commissionRate: 15.0,
    marketLabel: 'Đông Bắc Á (CN/KR)',
    bookingsToday: 4,
    revenueToday: 38100000,
    revenueShort: '38.1M đ',
    icalUrl: 'https://ebooking.trip.com/ical/sync/3105.ics',
  },
];

const INITIAL_ALLOTMENTS = [
  {
    id: 'ALLOT-DELUXE-KING',
    roomTypeName: 'Deluxe Ocean King',
    subtitle: 'Tổng quy mô: 48 phòng • Tháp San Hô (Coral Wing)',
    totalRooms: 48,
    otaAllotment: 28,
    otaMax: 48,
    directWebRooms: 15,
    holdMaintenanceRooms: 5,
    barPrice: 4850000,
    status: 'OPEN', // OPEN | STOP_SELL | BESPOKE
    statusLabel: 'MỞ BÁN',
    autoLockStatus: 'STANDBY',
    image:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALLOT-PANORAMIC-SUITE',
    roomTypeName: 'Grand Ocean Panoramic Suite',
    subtitle: 'Tổng quy mô: 24 phòng • Tầng 12 - 18 Sky Tower',
    totalRooms: 24,
    otaAllotment: 14,
    otaMax: 24,
    directWebRooms: 8,
    holdMaintenanceRooms: 2,
    barPrice: 8500000,
    status: 'OPEN',
    statusLabel: 'MỞ BÁN',
    autoLockStatus: 'STANDBY',
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALLOT-SUNSET-VILLA',
    roomTypeName: 'Oceanfront Sunset Pool Villa',
    subtitle: 'Đã bán 12/12 (Đạt 100% công suất phòng)',
    totalRooms: 12,
    otaAllotment: 0,
    otaMax: 8,
    directWebRooms: 0,
    directMax: 4,
    holdMaintenanceRooms: 0,
    barPrice: 16200000,
    status: 'STOP_SELL',
    statusLabel: 'STOP-SELL',
    autoLockStatus: 'ACTIVE',
    image:
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'ALLOT-PRESIDENTIAL',
    roomTypeName: 'The Presidential Beach Villa',
    subtitle: 'Tổng quy mô: 2 căn đặc biệt • Không phân phối qua OTA phổ thông',
    totalRooms: 2,
    otaAllotment: 0,
    otaMax: 2,
    directWebRooms: 2,
    holdMaintenanceRooms: 0,
    barPrice: 52000000,
    status: 'BESPOKE',
    statusLabel: 'BESPOKE ONLY',
    bookingCondition: 'Thẩm định hồ sơ VIP',
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=300&auto=format&fit=crop&q=80',
  },
];

const INITIAL_API_LOGS = [
  {
    id: 'LOG-1',
    type: 'BOOKING_NEW',
    badgeClass: 'bg-emerald-800 text-white',
    time: '14:48:12 GMT+7',
    title: 'Agoda #AG-998142 • Deluxe Ocean King',
    detail: 'Khách: David K. • Check-in: 25/10 (3 đêm)',
    result: 'Tự động trừ 1 Allotment trên Booking.com, Expedia, Trip.com',
  },
  {
    id: 'LOG-2',
    type: 'RATE_PUSH',
    badgeClass: 'bg-sky-700 text-white',
    time: '14:42:05 GMT+7',
    title: 'Đẩy giá động cuối tuần (+10% Yield)',
    detail: 'Kênh áp dụng: Booking.com, Expedia Group, Agoda',
    result: 'Xác nhận thành công từ 3 máy chủ OTA (HTTP 200 OK)',
  },
  {
    id: 'LOG-3',
    type: 'STOP_SELL_TRIGGER',
    badgeClass: 'bg-rose-800 text-white',
    time: '14:35:22 GMT+7',
    title: 'Villa Hoàng Hôn (Oceanfront Sunset) đạt 100%',
    detail: 'Lệnh tự động ngắt mở bán toàn cầu được gửi đến toàn bộ 6 kênh',
    result: 'Broadcast Stop-Sell hoàn tất trong 640ms',
  },
  {
    id: 'LOG-4',
    type: 'BOOKING_MOD',
    badgeClass: 'bg-slate-200 text-slate-800',
    time: '14:18:09 GMT+7',
    title: 'Expedia #EX-554109 • Đổi ngày lưu trú',
    detail: 'Khách: Michael Trương • Đổi ngày sang 28/10',
    result: 'Cập nhật lịch phòng PMS thành công không phụ phí',
  },
];

let STATE_MEM = {
  channels: INITIAL_CHANNELS,
  allotments: INITIAL_ALLOTMENTS,
  logs: INITIAL_API_LOGS,
  dynamicPricingEnabled: true,
  yieldBonusPercent: 8,
  masterStopSell: false,
};

let isTableReady = false;

async function ensureChannelTable() {
  if (isTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ChannelManagerStateStore (
        id VARCHAR(40) PRIMARY KEY,
        payload JSON NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const [rows] = await pool.query(
      'SELECT payload FROM ChannelManagerStateStore WHERE id = ?',
      ['MAIN_OTA_STATE']
    );
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO ChannelManagerStateStore (id, payload) VALUES (?, ?)',
        ['MAIN_OTA_STATE', JSON.stringify(STATE_MEM)]
      );
    } else {
      const parsed =
        typeof rows[0].payload === 'string'
          ? JSON.parse(rows[0].payload)
          : rows[0].payload;
      if (parsed && Array.isArray(parsed.channels)) {
        STATE_MEM = { ...STATE_MEM, ...parsed };
      }
    }
    isTableReady = true;
  } catch (err) {
    console.warn('[ChannelManager] Dùng bộ nhớ tạm:', err.message);
  }
}

async function getChannelState() {
  await ensureChannelTable();
  if (isTableReady) {
    try {
      const [rows] = await pool.query(
        'SELECT payload FROM ChannelManagerStateStore WHERE id = ?',
        ['MAIN_OTA_STATE']
      );
      if (rows.length > 0) {
        const parsed =
          typeof rows[0].payload === 'string'
            ? JSON.parse(rows[0].payload)
            : rows[0].payload;
        STATE_MEM = { ...STATE_MEM, ...parsed };
      }
    } catch (_) {}
  }
  return STATE_MEM;
}

async function saveChannelState(nextState) {
  await ensureChannelTable();
  STATE_MEM = { ...STATE_MEM, ...nextState };
  if (isTableReady) {
    try {
      await pool.query(
        `INSERT INTO ChannelManagerStateStore (id, payload)
         VALUES ('MAIN_OTA_STATE', ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [JSON.stringify(STATE_MEM)]
      );
    } catch (e) {
      console.warn('[ChannelManager] Lỗi lưu state:', e.message);
    }
  }
  return STATE_MEM;
}

// Truy vấn danh sách Hạng phòng & Số lượng phòng trống thực tế từ PMS Database (RoomTypes & Rooms)
async function queryPmsRoomTypes() {
  try {
    const sql = `
      SELECT
        rt.RoomTypeId,
        rt.TypeName,
        rt.BasePrice,
        rt.TotalRooms,
        rt.FloorRange,
        rt.ViewType,
        COUNT(r.RoomId) AS PhysicalRoomsCount,
        SUM(CASE WHEN r.Status IN ('CleanAvailable', 'Available', 'Inspected') THEN 1 ELSE 0 END) AS AvailableRoomsCount,
        SUM(CASE WHEN r.Status IN ('Maintenance', 'OutOfOrder', 'Dirty') THEN 1 ELSE 0 END) AS MaintenanceRoomsCount
      FROM RoomTypes rt
      LEFT JOIN Rooms r ON rt.RoomTypeId = r.RoomTypeId AND (r.IsDeleted = 0 OR r.IsDeleted IS NULL)
      WHERE rt.IsDeleted = 0 OR rt.IsDeleted IS NULL
      GROUP BY rt.RoomTypeId, rt.TypeName, rt.BasePrice, rt.TotalRooms, rt.FloorRange, rt.ViewType
      ORDER BY rt.BasePrice ASC
      LIMIT 20
    `;
    const [rows] = await pool.query(sql);
    return rows.map((r) => {
      const total = Math.max(Number(r.PhysicalRoomsCount) || Number(r.TotalRooms) || 12, 2);
      const avail = Number(r.AvailableRoomsCount) || Math.round(total * 0.7);
      const maint = Number(r.MaintenanceRoomsCount) || 1;
      const otaAlloc = Math.max(0, Math.round(avail * 0.65));
      const directAlloc = Math.max(0, avail - otaAlloc);
      return {
        id: `PMS-RT-${r.RoomTypeId}`,
        roomTypeId: r.RoomTypeId,
        roomTypeName: r.TypeName,
        subtitle: `Tổng quy mô: ${total} phòng • ${r.FloorRange || r.ViewType || 'PMS Core Sync'}`,
        totalRooms: total,
        otaAllotment: otaAlloc,
        otaMax: total,
        directWebRooms: directAlloc,
        holdMaintenanceRooms: maint,
        barPrice: Number(r.BasePrice) || 3500000,
        status: avail === 0 ? 'STOP_SELL' : 'OPEN',
        statusLabel: avail === 0 ? 'STOP-SELL' : 'MỞ BÁN',
        autoLockStatus: avail === 0 ? 'ACTIVE' : 'STANDBY',
        image:
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
      };
    });
  } catch (e) {
    console.warn('[ChannelManager] Không thể đọc RoomTypes:', e.message);
    return [];
  }
}

// 1. GET /api/channel-manager/overview
router.get('/overview', async (req, res) => {
  const state = await getChannelState();
  const pmsRoomTypes = await queryPmsRoomTypes();
  res.json({
    success: true,
    data: {
      ...state,
      pmsRoomTypes,
    },
  });
});

// 2. PUT /api/channel-manager/state - Lưu toàn bộ cấu hình kênh OTA & Allotment
router.put('/state', async (req, res) => {
  const body = req.body || {};
  const saved = await saveChannelState(body);
  res.json({
    success: true,
    message: 'Đã lưu cấu hình Channel Manager & Allotment thành công!',
    data: saved,
  });
});

// 3. POST /api/channel-manager/sync-pms-rooms - Đồng bộ kho phòng thực tế từ PMS RoomTypes & Rooms
router.post('/sync-pms-rooms', async (req, res) => {
  const pmsRoomTypes = await queryPmsRoomTypes();
  const state = await getChannelState();

  const existingMap = new Map(state.allotments.map((a) => [a.id, a]));
  pmsRoomTypes.forEach((rt) => {
    existingMap.set(rt.id, { ...(existingMap.get(rt.id) || {}), ...rt });
  });

  const mergedAllotments = Array.from(existingMap.values());
  const newLog = {
    id: `LOG-${Date.now()}`,
    type: 'PMS_INVENTORY_SYNC',
    badgeClass: 'bg-emerald-800 text-white',
    time:
      new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
    title: `Đồng bộ 2 chiều kho phòng từ PMS (${pmsRoomTypes.length} hạng phòng)`,
    detail: 'Cập nhật số lượng phòng trống CleanAvailable & giá cơ sở từ PMS',
    result: 'Đã cân bằng Pooled Inventory trên tất cả kênh OTA',
  };

  const saved = await saveChannelState({
    allotments: mergedAllotments,
    logs: [newLog, ...(state.logs || [])].slice(0, 20),
  });

  res.json({
    success: true,
    message: `Đã đồng bộ ${pmsRoomTypes.length} hạng phòng thực tế từ PMS!`,
    data: saved,
  });
});

// 4. POST /api/channel-manager/webhook-simulate - Mô phỏng nhận Webhook đặt phòng OTA & chống Overbooking
router.post('/webhook-simulate', async (req, res) => {
  const { channelId = 'OTA-AGODA', allotmentId, guestName = 'alex.traveler' } =
    req.body || {};
  const state = await getChannelState();

  const targetChannel =
    state.channels.find((c) => c.id === channelId) || state.channels[0];
  const targetAllotment =
    state.allotments.find((a) => a.id === allotmentId) ||
    state.allotments.find((a) => a.status === 'OPEN' && a.otaAllotment > 0) ||
    state.allotments[0];

  if (!targetAllotment) {
    return res
      .status(400)
      .json({ success: false, message: 'Không có hạng phòng khả dụng.' });
  }

  const nextOtaQty = Math.max(0, Number(targetAllotment.otaAllotment || 0) - 1);
  const autoStopSell = nextOtaQty === 0;

  const updatedAllotments = state.allotments.map((a) => {
    if (a.id === targetAllotment.id) {
      return {
        ...a,
        otaAllotment: nextOtaQty,
        status: autoStopSell ? 'STOP_SELL' : a.status,
        statusLabel: autoStopSell ? 'STOP-SELL' : a.statusLabel,
        autoLockStatus: autoStopSell ? 'ACTIVE' : a.autoLockStatus,
      };
    }
    return a;
  });

  const updatedChannels = state.channels.map((c) => {
    if (c.id === targetChannel.id) {
      const nextBookings = Number(c.bookingsToday || 0) + 1;
      const nextRev =
        Number(c.revenueToday || 0) + Number(targetAllotment.barPrice || 4850000);
      return {
        ...c,
        bookingsToday: nextBookings,
        revenueToday: nextRev,
        revenueShort: `${(nextRev / 1000000).toFixed(1)}M đ`,
      };
    }
    return c;
  });

  const newLog = {
    id: `LOG-${Date.now()}`,
    type: autoStopSell ? 'STOP_SELL_TRIGGER' : 'BOOKING_NEW',
    badgeClass: autoStopSell
      ? 'bg-rose-800 text-white'
      : 'bg-emerald-800 text-white',
    time:
      new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
    title: `${targetChannel.name} #${Math.floor(100000 + Math.random() * 899999)} • ${targetAllotment.roomTypeName}`,
    detail: `Khách: ${guestName} • Giữ phòng tức thời (Instant Lock 300s)`,
    result: autoStopSell
      ? 'Allotment về 0 -> Tự động kích hoạt STOP-SELL toàn cầu chống Overbooking'
      : `Tự động trừ 1 Allotment trên toàn bộ kênh OTA (Còn ${nextOtaQty} phòng)`,
  };

  const saved = await saveChannelState({
    channels: updatedChannels,
    allotments: updatedAllotments,
    logs: [newLog, ...(state.logs || [])].slice(0, 20),
  });

  res.json({
    success: true,
    message: `Đã xử lý Webhook từ ${targetChannel.name} và trừ 1 Allotment chống Overbooking!`,
    data: saved,
  });
});

module.exports = router;
