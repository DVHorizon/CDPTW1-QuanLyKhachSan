import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const MIcon = ({ name, className = '' }) => (
  <span
    className={`material-symbols-outlined inline-flex items-center justify-center select-none leading-none ${className}`}
    style={{ fontSize: '16px' }}
  >
    {name}
  </span>
);

const STORAGE_KEY = 'grand_horizon_channel_manager_v1';

const INITIAL_CHANNELS = [
  {
    id: 'OTA-BOOKING',
    shortCode: 'B.',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-200',
    barColor: 'bg-emerald-700',
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
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    barColor: 'bg-sky-600',
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
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    barColor: 'bg-teal-600',
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
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-200',
    barColor: 'bg-emerald-500',
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

const fmtVnd = (n) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' đ';

const ChannelManagerSync = () => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.channels) && Array.isArray(parsed.allotments)) {
          return parsed;
        }
      }
    } catch (_) {}
    return {
      channels: INITIAL_CHANNELS,
      allotments: INITIAL_ALLOTMENTS,
      logs: INITIAL_API_LOGS,
      dynamicPricingEnabled: true,
      yieldBonusPercent: 8,
      masterStopSell: false,
    };
  });

  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [editingAllotment, setEditingAllotment] = useState(null);
  const [showAddAllotmentModal, setShowAddAllotmentModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState(null); // { kind: 'allotment' | 'channel', item }

  // Form states
  const [allotmentForm, setAllotmentForm] = useState({
    roomTypeName: '',
    subtitle: 'Tổng quy mô: 20 phòng • Khu Ocean Wing',
    totalRooms: 20,
    otaAllotment: 12,
    directWebRooms: 6,
    holdMaintenanceRooms: 2,
    barPrice: 5500000,
    status: 'OPEN',
    image:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
  });

  const [channelForm, setChannelForm] = useState({
    shortCode: 'TV',
    name: 'Traveloka SEA',
    accountCode: 'ID: TV-VN-5520',
    latencyMs: 260,
    commissionRate: 15.0,
    marketLabel: 'Đông Nam Á (VN/TH/SG)',
    bookingsToday: 6,
    revenueToday: 45000000,
    icalUrl: 'https://tera.traveloka.com/ical/pq-res-00421.ics',
  });

  const showNotification = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  // Persist to localStorage & Backend
  const persistState = async (nextState) => {
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (_) {}
    try {
      await fetch('/api/channel-manager/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      });
    } catch (_) {}
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }, [state]);

  useEffect(() => {
    let mounted = true;
    const loadOverview = async () => {
      try {
        const res = await fetch('/api/channel-manager/overview');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json?.data?.channels && !localStorage.getItem(STORAGE_KEY)) {
          setState((prev) => ({
            ...prev,
            ...json.data,
          }));
        }
      } catch (_) {}
    };
    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  // Dynamic KPI Calculations
  const totalBookingsToday = useMemo(
    () =>
      state.channels.reduce((sum, c) => sum + (Number(c.bookingsToday) || 0), 0),
    [state.channels]
  );

  const totalOtaRevenueToday = useMemo(
    () =>
      state.channels.reduce((sum, c) => sum + (Number(c.revenueToday) || 0), 0),
    [state.channels]
  );

  const stopSellCount = useMemo(
    () =>
      state.allotments.filter(
        (a) => a.status === 'STOP_SELL' || a.status === 'BESPOKE'
      ).length,
    [state.allotments]
  );

  const stopSellNames = useMemo(() => {
    const names = state.allotments
      .filter((a) => a.status === 'STOP_SELL' || a.status === 'BESPOKE')
      .map((a) => a.roomTypeName.split(' ').slice(0, 2).join(' '));
    return names.length > 0 ? names.join(' & ') : 'Tất cả đang mở bán';
  }, [state.allotments]);

  // Force Sync All Channels
  const handleForceSyncAll = () => {
    setIsForceSyncing(true);
    const nowStr =
      new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7';
    const newLog = {
      id: `LOG-${Date.now()}`,
      type: 'FORCE_SYNC_2WAY',
      badgeClass: 'bg-emerald-800 text-white',
      time: nowStr,
      title: `Đồng bộ 2 chiều toàn bộ ${state.channels.length} kênh OTA & PMS`,
      detail: `Tự động đối soát ${state.allotments.length} hạng phòng (iCal / XML REST v4.8)`,
      result: 'Khớp 100% Allotment Checksum (0x99A4) • Zero Overbooking',
    };

    setTimeout(() => {
      setIsForceSyncing(false);
      persistState({
        ...state,
        logs: [newLog, ...state.logs].slice(0, 20),
      });
      showNotification(
        `Đã đồng bộ 2 chiều toàn bộ ${state.channels.length} kênh OTA & kho phòng PMS!`
      );
    }, 450);
  };

  // Sync Real RoomTypes from PMS Database
  const handleSyncFromPmsRooms = async () => {
    setIsForceSyncing(true);
    try {
      const res = await fetch('/api/channel-manager/sync-pms-rooms', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.allotments) {
          persistState({
            ...state,
            allotments: json.data.allotments,
            logs: json.data.logs || state.logs,
          });
          setIsForceSyncing(false);
          showNotification(json.message || 'Đã đồng bộ hạng phòng từ PMS!');
          return;
        }
      }
    } catch (_) {}
    setIsForceSyncing(false);
    showNotification('Đã đồng bộ số lượng phòng trống & giá BAR từ PMS!');
  };

  // Push Rate for a Specific OTA Channel
  const handlePushRateChannel = (channel) => {
    const nowStr =
      new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7';
    const newLog = {
      id: `LOG-${Date.now()}`,
      type: 'RATE_PUSH',
      badgeClass: 'bg-sky-700 text-white',
      time: nowStr,
      title: `Đẩy bảng giá BAR & Allotment lên ${channel.name}`,
      detail: `Mã kết nối: ${channel.accountCode} • Độ trễ: ${channel.latencyMs}ms`,
      result: 'Xác nhận thành công từ máy chủ OTA (HTTP 200 OK)',
    };
    persistState({
      ...state,
      logs: [newLog, ...state.logs].slice(0, 20),
    });
    showNotification(
      `Đã đẩy bảng giá BAR & Allotment tức thời lên ${channel.name}!`
    );
  };

  // Simulate Incoming OTA Booking Webhook (Anti-Overbooking Demo)
  const handleSimulateOtaWebhook = async () => {
    try {
      const res = await fetch('/api/channel-manager/webhook-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: state.channels[0]?.id || 'OTA-BOOKING',
          guestName: 'Liam Anderson (VIP)',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setState(json.data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          showNotification(json.message);
          return;
        }
      }
    } catch (_) {}

    // Fallback local webhook simulation
    const openAllot =
      state.allotments.find((a) => a.status === 'OPEN' && a.otaAllotment > 0) ||
      state.allotments[0];
    if (!openAllot) return;

    const nextQty = Math.max(0, Number(openAllot.otaAllotment) - 1);
    const isNowZero = nextQty === 0;
    const nextAllotments = state.allotments.map((a) =>
      a.id === openAllot.id
        ? {
            ...a,
            otaAllotment: nextQty,
            status: isNowZero ? 'STOP_SELL' : a.status,
            statusLabel: isNowZero ? 'STOP-SELL' : a.statusLabel,
          }
        : a
    );
    const nextChannels = state.channels.map((c, idx) =>
      idx === 0
        ? {
            ...c,
            bookingsToday: Number(c.bookingsToday) + 1,
            revenueToday: Number(c.revenueToday) + Number(openAllot.barPrice),
            revenueShort: `${(
              (Number(c.revenueToday) + Number(openAllot.barPrice)) /
              1000000
            ).toFixed(1)}M đ`,
          }
        : c
    );
    const newLog = {
      id: `LOG-${Date.now()}`,
      type: 'BOOKING_NEW',
      badgeClass: 'bg-emerald-800 text-white',
      time:
        new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
      title: `Booking.com #BK-${Math.floor(100000 + Math.random() * 899999)} • ${openAllot.roomTypeName}`,
      detail: 'Webhook 2 chiều • Tự động khóa phòng tức thời (Instant Lock 300s)',
      result: `Đã trừ 1 Allotment trên toàn bộ kênh OTA (Còn ${nextQty} phòng)`,
    };
    persistState({
      ...state,
      channels: nextChannels,
      allotments: nextAllotments,
      logs: [newLog, ...state.logs].slice(0, 20),
    });
    showNotification(
      `Nhận 1 Booking mới cho ${openAllot.roomTypeName} -> Đã tự động trừ 1 Allotment trên mọi kênh OTA!`
    );
  };

  // Toggle Stop-Sell on a single Room Type Allotment
  const handleToggleRoomStopSell = (allot) => {
    const isCurrentlyStop =
      allot.status === 'STOP_SELL' || allot.status === 'BESPOKE';
    const nextStatus = isCurrentlyStop ? 'OPEN' : 'STOP_SELL';
    const nextLabel = isCurrentlyStop ? 'MỞ BÁN' : 'STOP-SELL';
    const restoredOta =
      isCurrentlyStop && Number(allot.otaAllotment) === 0
        ? Math.max(4, Math.round(Number(allot.totalRooms || 12) * 0.5))
        : isCurrentlyStop
        ? allot.otaAllotment
        : 0;

    const nextAllotments = state.allotments.map((a) =>
      a.id === allot.id
        ? {
            ...a,
            status: nextStatus,
            statusLabel: nextLabel,
            otaAllotment: restoredOta,
            autoLockStatus: isCurrentlyStop ? 'STANDBY' : 'ACTIVE',
          }
        : a
    );

    const newLog = {
      id: `LOG-${Date.now()}`,
      type: isCurrentlyStop ? 'ALLOTMENT_OPEN' : 'STOP_SELL_TRIGGER',
      badgeClass: isCurrentlyStop
        ? 'bg-emerald-800 text-white'
        : 'bg-rose-800 text-white',
      time:
        new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
      title: `${allot.roomTypeName} -> ${nextLabel}`,
      detail: isCurrentlyStop
        ? `Mở khóa phân phối lại (${restoredOta} phòng OTA Allotment)`
        : 'Ngắt mở bán tự động trên toàn bộ các kênh OTA',
      result: 'Đồng bộ thành công trong 420ms',
    };

    persistState({
      ...state,
      allotments: nextAllotments,
      logs: [newLog, ...state.logs].slice(0, 20),
    });
    showNotification(
      isCurrentlyStop
        ? `Đã mở khóa bán cho hạng phòng ${allot.roomTypeName}!`
        : `Đã kích hoạt STOP-SELL cho hạng phòng ${allot.roomTypeName}!`
    );
  };

  // Apply Weekend Rate (+15%)
  const handleApplyWeekendRate = () => {
    const nextAllotments = state.allotments.map((a) => ({
      ...a,
      barPrice: Math.round((Number(a.barPrice) * 1.15) / 50000) * 50000,
    }));
    const newLog = {
      id: `LOG-${Date.now()}`,
      type: 'RATE_PUSH',
      badgeClass: 'bg-sky-700 text-white',
      time:
        new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
      title: 'Đẩy bảng giá cuối tuần (+15% Yield) toàn hệ thống',
      detail: `Áp dụng cho ${state.allotments.length} hạng phòng trên ${state.channels.length} kênh OTA`,
      result: 'Xác nhận HTTP 200 OK từ tất cả cổng phân phối',
    };
    persistState({
      ...state,
      yieldBonusPercent: 15,
      allotments: nextAllotments,
      logs: [newLog, ...state.logs].slice(0, 20),
    });
    showNotification(
      'Đã áp dụng và đồng bộ bảng giá cuối tuần (+15%) lên toàn bộ kênh OTA!'
    );
  };

  // Master Stop-Sell Toggle
  const handleToggleMasterStopSell = () => {
    const nextMaster = !state.masterStopSell;
    const nextAllotments = state.allotments.map((a) => ({
      ...a,
      status: nextMaster ? 'STOP_SELL' : 'OPEN',
      statusLabel: nextMaster ? 'STOP-SELL' : 'MỞ BÁN',
      otaAllotment: nextMaster
        ? 0
        : Math.max(4, Math.round((Number(a.totalRooms) || 12) * 0.6)),
    }));
    const newLog = {
      id: `LOG-${Date.now()}`,
      type: 'STOP_SELL_TRIGGER',
      badgeClass: nextMaster
        ? 'bg-rose-800 text-white'
        : 'bg-emerald-800 text-white',
      time:
        new Date().toLocaleTimeString('vi-VN', { hour12: false }) + ' GMT+7',
      title: nextMaster
        ? 'KHẨN CẤP: KÍCH HOẠT MASTER STOP-SELL TOÀN RESORT'
        : 'KHÔI PHỤC MỞ BÁN TOÀN BỘ KÊNH OTA',
      detail: nextMaster
        ? 'Đã khóa toàn bộ kho phòng OTA ngoài để giữ độc quyền kênh trực tiếp'
        : 'Đã mở lại phân phối Pooled Inventory cho tất cả kênh OTA',
      result: 'Thực thi tức thời trên 6 cổng toàn cầu',
    };
    persistState({
      ...state,
      masterStopSell: nextMaster,
      allotments: nextAllotments,
      logs: [newLog, ...state.logs].slice(0, 20),
    });
    showNotification(
      nextMaster
        ? 'Đã kích hoạt MASTER STOP-SELL: Khóa bán toàn bộ kênh OTA ngoài!'
        : 'Đã mở lại phân phối bình thường cho tất cả kênh OTA!'
    );
  };

  // Save Edited or Added Allotment
  const handleSaveAllotment = (e) => {
    e.preventDefault();
    const total = Math.max(1, Number(allotmentForm.totalRooms) || 10);
    const ota = Math.max(0, Number(allotmentForm.otaAllotment) || 0);
    const direct = Math.max(0, Number(allotmentForm.directWebRooms) || 0);
    const maint = Math.max(0, Number(allotmentForm.holdMaintenanceRooms) || 0);
    const price = Math.max(100000, Number(allotmentForm.barPrice) || 4500000);
    const status = allotmentForm.status || (ota === 0 ? 'STOP_SELL' : 'OPEN');
    const statusLabel =
      status === 'STOP_SELL'
        ? 'STOP-SELL'
        : status === 'BESPOKE'
        ? 'BESPOKE ONLY'
        : 'MỞ BÁN';

    if (editingAllotment) {
      const nextAllotments = state.allotments.map((a) =>
        a.id === editingAllotment.id
          ? {
              ...a,
              roomTypeName: allotmentForm.roomTypeName.trim(),
              subtitle: allotmentForm.subtitle.trim(),
              totalRooms: total,
              otaAllotment: ota,
              otaMax: total,
              directWebRooms: direct,
              holdMaintenanceRooms: maint,
              barPrice: price,
              status,
              statusLabel,
            }
          : a
      );
      persistState({ ...state, allotments: nextAllotments });
      setEditingAllotment(null);
      showNotification(
        `Đã cập nhật phân bổ Allotment & giá BAR cho ${allotmentForm.roomTypeName}!`
      );
    } else {
      const newAllot = {
        id: `ALLOT-${Date.now()}`,
        roomTypeName: allotmentForm.roomTypeName.trim() || 'Ocean Suite Mới',
        subtitle:
          allotmentForm.subtitle.trim() || `Tổng quy mô: ${total} phòng • PMS`,
        totalRooms: total,
        otaAllotment: ota,
        otaMax: total,
        directWebRooms: direct,
        holdMaintenanceRooms: maint,
        barPrice: price,
        status,
        statusLabel,
        autoLockStatus: status === 'STOP_SELL' ? 'ACTIVE' : 'STANDBY',
        image:
          allotmentForm.image ||
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=300&auto=format&fit=crop&q=80',
      };
      persistState({
        ...state,
        allotments: [newAllot, ...state.allotments],
      });
      setShowAddAllotmentModal(false);
      showNotification(
        `Đã thêm hạng phòng ${newAllot.roomTypeName} vào bảng điều khiển Allotment!`
      );
    }
  };

  // Save Edited or Added OTA Channel
  const handleSaveChannel = (e) => {
    e.preventDefault();
    const rev = Number(channelForm.revenueToday) || 0;
    const revShort = `${(rev / 1000000).toFixed(1)}M đ`;

    if (editingChannel) {
      const nextChannels = state.channels.map((c) =>
        c.id === editingChannel.id
          ? {
              ...c,
              shortCode: channelForm.shortCode.trim() || c.shortCode,
              name: channelForm.name.trim(),
              accountCode: channelForm.accountCode.trim(),
              latencyMs: Number(channelForm.latencyMs) || 250,
              commissionRate: Number(channelForm.commissionRate) || 15,
              marketLabel: channelForm.marketLabel.trim() || null,
              bookingsToday: Number(channelForm.bookingsToday) || 0,
              revenueToday: rev,
              revenueShort: revShort,
              icalUrl: channelForm.icalUrl.trim(),
            }
          : c
      );
      persistState({ ...state, channels: nextChannels });
      setEditingChannel(null);
      showNotification(`Đã cập nhật cổng phân phối ${channelForm.name}!`);
    } else {
      const newChan = {
        id: `OTA-${Date.now()}`,
        shortCode: channelForm.shortCode.trim() || 'OTA',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        barColor: 'bg-emerald-600',
        name: channelForm.name.trim() || 'Traveloka',
        accountCode: channelForm.accountCode.trim() || 'ID: TV-VN-5520',
        status: 'ONLINE',
        statusLabel: 'TRỰC TUYẾN',
        latencyMs: Number(channelForm.latencyMs) || 260,
        commissionRate: Number(channelForm.commissionRate) || 15,
        marketLabel: channelForm.marketLabel.trim() || null,
        bookingsToday: Number(channelForm.bookingsToday) || 0,
        revenueToday: rev,
        revenueShort: revShort,
        icalUrl: channelForm.icalUrl.trim(),
      };
      persistState({
        ...state,
        channels: [...state.channels, newChan],
      });
      setShowAddChannelModal(false);
      showNotification(`Đã kết nối kênh OTA mới: ${newChan.name}!`);
    }
  };

  // Delete Allotment or Channel
  const handleConfirmDelete = () => {
    if (!deletingTarget) return;
    if (deletingTarget.kind === 'allotment') {
      const nextAllotments = state.allotments.filter(
        (a) => a.id !== deletingTarget.item.id
      );
      persistState({ ...state, allotments: nextAllotments });
      showNotification(
        `Đã xóa hạng phòng ${deletingTarget.item.roomTypeName} khỏi bảng Allotment!`
      );
    } else if (deletingTarget.kind === 'channel') {
      const nextChannels = state.channels.filter(
        (c) => c.id !== deletingTarget.item.id
      );
      persistState({ ...state, channels: nextChannels });
      showNotification(`Đã ngắt và xóa kênh OTA ${deletingTarget.item.name}!`);
    }
    setDeletingTarget(null);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 pb-12 font-sans">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-emerald-950 text-white border-emerald-700">
            <MIcon name="check_circle" className="text-emerald-400" />
            <span className="text-sm font-medium">{toast}</span>
            <button
              onClick={() => setToast(null)}
              className="text-emerald-300 hover:text-white"
            >
              <MIcon name="close" />
            </button>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-6 pt-6 space-y-6">
          {/* ─── HEADER SECTION ─────────────────────────────────────────────── */}
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-200/80 text-slate-700 border border-slate-300">
                  PHÂN HỆ 52 // PHÂN PHỐI TRỰC TUYẾN &amp; ĐIỀU HÀNH KÊNH BÁN
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  2-WAY LIVE • KẾT NỐI PMS VỚI {state.channels.length + 2} KÊNH
                  TOÀN CẦU
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-white text-slate-700 border border-slate-200">
                  TẦNG TRUYỀN DẪN XML/REST v4.8
                </span>
              </div>

              <h1
                className="text-3xl sm:text-[36px] font-bold text-slate-900 tracking-tight leading-tight"
                style={{
                  fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                }}
              >
                Trung Tâm Điều Hành Kênh Bán Phòng &amp; Đồng Bộ OTA Tức Thời
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                Quản trị kết nối hai chiều (2-Way XML/API &amp; iCal Webhook)
                giữa PMS Grand Horizon với các kênh phân phối toàn cầu: Agoda,
                Booking.com, Expedia, Trip.com, Traveloka và Cổng đặt phòng trực
                tiếp. Tự động cân bằng Allotment và đẩy bảng giá động theo thuật
                toán tối ưu doanh thu RevPAR, ngăn chặn tuyệt đối tình trạng
                Overbooking.
              </p>
            </div>

            {/* Top Right Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleForceSyncAll}
                disabled={isForceSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0d6e48] hover:bg-[#095738] text-white shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                <MIcon
                  name="sync"
                  className={isForceSyncing ? 'animate-spin' : ''}
                />
                <span>Đồng bộ toàn bộ kênh ngay (Force Sync)</span>
              </button>

              <button
                onClick={() => {
                  setEditingAllotment(null);
                  setShowAddAllotmentModal(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <MIcon name="tune" />
                <span>Cấu hình phân bổ Allotment</span>
              </button>

              <button
                onClick={() => setShowConsoleModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <MIcon name="terminal" />
                <span>Lịch sử truyền tin API</span>
              </button>
            </div>
          </div>

          {/* ─── 4 KPI SUMMARY CARDS ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  TỶ LỆ ĐỒNG BỘ THÀNH
                  <br />
                  CÔNG
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <MIcon name="speed" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold text-emerald-800"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  99.98%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Độ trễ TB: <strong>1.2s</strong>
                  </span>
                  <span className="text-slate-400">14.8k gói tin / giờ</span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-[99%] bg-emerald-600 rounded-full" />
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  LƯỢT ĐẶT QUA OTA TRONG
                  <br />
                  NGÀY
                </span>
                <span className="p-2 rounded-lg bg-sky-50 text-sky-700">
                  <MIcon name="shopping_cart_checkout" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {totalBookingsToday}
                </span>
                <span className="text-xs font-bold uppercase text-slate-500">
                  BOOKING
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-slate-800">
                    {fmtVnd(totalOtaRevenueToday)}
                  </span>
                  <span className="font-bold text-sky-700">
                    +18.4% so kế hoạch
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-[82%] bg-sky-600 rounded-full" />
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-[#fffafa] rounded-2xl p-4 border border-rose-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 leading-snug">
                  KÊNH ĐÓNG BÁN / CHÁY
                  <br />
                  PHÒNG
                </span>
                <span className="p-2 rounded-lg bg-rose-100/80 text-rose-700">
                  <MIcon name="block" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-rose-800"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {String(stopSellCount).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold uppercase text-rose-700">
                  STOP-SELL
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] text-rose-800 truncate font-medium">
                  {stopSellNames}
                </div>
                <div className="h-1 w-full rounded-full bg-rose-100 overflow-hidden">
                  <div className="h-full w-[45%] bg-rose-700 rounded-full" />
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  LỖI KẾT NỐI / XUNG ĐỘT
                  <br />
                  KHO
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <MIcon name="verified" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-emerald-800"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  00
                </span>
                <span className="text-xs font-bold uppercase text-emerald-800">
                  LỖI THÔNG SUỐT
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-emerald-800">
                    100% Khớp Allotment
                  </span>
                  <span className="text-slate-400">Zero Overbooking</span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-full bg-emerald-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION 1: CÁC CỔNG PHÂN PHỐI CHIẾN LƯỢC (OTA CARDS) ───────── */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                  CÁC CỔNG PHÂN PHỐI CHIẾN LƯỢC
                </div>
                <h2
                  className="text-xl font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Trạng Thái Kết Nối Trực Tuyến &amp; Tỷ Lệ Hoa Hồng OTA
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Chu kỳ thăm dò: 15 giây/lần
                </span>
                <button
                  onClick={() => {
                    setEditingChannel(null);
                    setShowAddChannelModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
                >
                  + Thêm kênh OTA (Traveloka / Airbnb)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {state.channels.map((chan) => (
                <div
                  key={chan.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center border ${
                          chan.badgeBg ||
                          'bg-emerald-100 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {chan.shortCode}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {chan.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {chan.accountCode}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 leading-tight text-center">
                        TRỰC
                        <br />
                        TUYẾN
                      </span>
                      <button
                        onClick={() => {
                          setEditingChannel(chan);
                          setChannelForm({
                            shortCode: chan.shortCode,
                            name: chan.name,
                            accountCode: chan.accountCode,
                            latencyMs: chan.latencyMs,
                            commissionRate: chan.commissionRate,
                            marketLabel: chan.marketLabel || '',
                            bookingsToday: chan.bookingsToday,
                            revenueToday: chan.revenueToday,
                            icalUrl: chan.icalUrl || '',
                          });
                        }}
                        title="Sửa kênh OTA"
                        className="p-1 rounded text-slate-400 hover:text-sky-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <MIcon name="edit" />
                      </button>
                      <button
                        onClick={() =>
                          setDeletingTarget({ kind: 'channel', item: chan })
                        }
                        title="Xóa kênh OTA"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <MIcon name="delete" />
                      </button>
                    </div>
                  </div>

                  {/* Specs Box */}
                  <div className="p-3 rounded-xl bg-[#f5f8f6] border border-slate-200/70 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-sans">
                        Tốc độ phản hồi:
                      </span>
                      <span className="font-bold text-emerald-700">
                        {chan.latencyMs}ms
                      </span>
                    </div>

                    {chan.marketLabel ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans">
                          Thị trường trọng tâm:
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {chan.marketLabel}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans">
                          Mức hoa hồng:
                        </span>
                        <span className="font-bold text-slate-800">
                          {Number(chan.commissionRate).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-sans">
                        Booking hôm nay:
                      </span>
                      <span className="font-bold text-slate-900">
                        {String(chan.bookingsToday).padStart(2, '0')} lượt (
                        {chan.revenueShort})
                      </span>
                    </div>
                  </div>

                  {/* Card Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePushRateChannel(chan)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-[#eef3f0] hover:bg-emerald-100 text-slate-800 border border-slate-200/80 transition cursor-pointer"
                    >
                      Đẩy Giá Ngay
                    </button>
                    <button
                      onClick={() => {
                        const firstOpen =
                          state.allotments[0] || INITIAL_ALLOTMENTS[0];
                        setEditingAllotment(firstOpen);
                        setAllotmentForm({
                          roomTypeName: firstOpen.roomTypeName,
                          subtitle: firstOpen.subtitle,
                          totalRooms: firstOpen.totalRooms,
                          otaAllotment: firstOpen.otaAllotment,
                          directWebRooms: firstOpen.directWebRooms,
                          holdMaintenanceRooms: firstOpen.holdMaintenanceRooms,
                          barPrice: firstOpen.barPrice,
                          status: firstOpen.status,
                          image: firstOpen.image,
                        });
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-[#eef3f0] hover:bg-emerald-100 text-slate-800 border border-slate-200/80 transition cursor-pointer"
                    >
                      Chỉnh Allotment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SECTION 2: 2-COLUMN WORKSPACE (ALLOTMENT MATRIX + LIVE API FEED) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN (8 COLS): ALLOTMENT & BAR PRICING CONTROL */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
                      <MIcon name="table_chart" />
                    </span>
                    <h3
                      className="text-lg font-bold text-slate-900"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      Bảng Điều Khiển Kho Phòng Allotment &amp; Bảng Giá BAR
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Thiết lập chia sẻ lượng phòng tồn (Pooled Inventory) và điều
                    chỉnh giá thời gian thực cho từng hạng phòng.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncFromPmsRooms}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
                  >
                    Đồng bộ từ Hạng Phòng PMS
                  </button>
                  <button
                    onClick={() => {
                      setEditingAllotment(null);
                      setShowAddAllotmentModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                  >
                    + Thêm hạng phòng
                  </button>
                  <span className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-[#f2f6f4] text-slate-700 border border-slate-200">
                    NGÀY ĐANG CHỌN: HÔM NAY (24/10/2025)
                  </span>
                </div>
              </div>

              {/* Room Type Allotment Cards */}
              <div className="space-y-3.5">
                {state.allotments.map((allot) => {
                  const isStopSell = allot.status === 'STOP_SELL';
                  const isBespoke = allot.status === 'BESPOKE';

                  return (
                    <div
                      key={allot.id}
                      className={`rounded-2xl p-4 border transition ${
                        isStopSell
                          ? 'bg-[#fff5f5] border-rose-200'
                          : 'bg-[#f6f9f7] border-slate-200/80 hover:border-emerald-300'
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Room Info & Thumbnail (5 cols) */}
                        <div className="md:col-span-5 flex items-center gap-3.5">
                          <img
                            src={allot.image}
                            alt={allot.roomTypeName}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">
                                {allot.roomTypeName}
                              </h4>
                              {isStopSell ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-800 text-white">
                                  STOP-SELL
                                </span>
                              ) : isBespoke ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-white">
                                  BESPOKE ONLY
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  MỞ BÁN
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] mt-1 leading-snug ${
                                isStopSell ? 'text-rose-800 font-medium' : 'text-slate-500'
                              }`}
                            >
                              {allot.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Metrics (5 cols) */}
                        <div className="md:col-span-5 grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {isBespoke ? 'KÊNH OTA TOÀN CẦU' : 'OTA ALLOTMENT'}
                            </div>
                            {isStopSell ? (
                              <div className="font-mono font-bold text-rose-800 mt-0.5">
                                00/{String(allot.otaMax || 8).padStart(2, '0')} (HẾT)
                              </div>
                            ) : isBespoke ? (
                              <div className="font-mono font-bold text-slate-700 mt-0.5">
                                00 (ĐÓNG)
                              </div>
                            ) : (
                              <div className="font-mono font-bold text-slate-900 mt-0.5">
                                {String(allot.otaAllotment).padStart(2, '0')}{' '}
                                <span className="text-slate-400 font-normal">
                                  / {allot.totalRooms}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {isBespoke ? 'VIP CONCIERGE' : 'DIRECT WEB'}
                            </div>
                            {isStopSell ? (
                              <div className="font-mono font-bold text-rose-800 mt-0.5">
                                04/04 (HẾT)
                              </div>
                            ) : isBespoke ? (
                              <div className="font-mono font-bold text-emerald-800 mt-0.5">
                                0{allot.directWebRooms} sẵn sàng
                              </div>
                            ) : (
                              <div className="font-mono font-bold text-slate-900 mt-0.5">
                                {String(allot.directWebRooms).padStart(2, '0')}{' '}
                                <span className="text-slate-500 font-sans font-normal">
                                  phòng
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {isStopSell
                                ? 'LỆNH KHÓA TỰ ĐỘNG'
                                : isBespoke
                                ? 'ĐIỀU KIỆN ĐẶT'
                                : 'GIỮ CHỖ/BẢO DƯỠNG'}
                            </div>
                            {isStopSell ? (
                              <div className="font-mono font-bold text-rose-800 mt-0.5">
                                ACTIVE
                              </div>
                            ) : isBespoke ? (
                              <div className="font-semibold text-slate-700 mt-0.5">
                                Thẩm định hồ sơ VIP
                              </div>
                            ) : (
                              <div className="font-mono font-bold text-slate-800 mt-0.5">
                                {String(
                                  allot.holdMaintenanceRooms || 0
                                ).padStart(2, '0')}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {isBespoke ? 'GIÁ NIÊM YẾT' : 'GIÁ BAR (ĐÊM)'}
                            </div>
                            <div
                              className={`font-mono font-bold mt-0.5 ${
                                isStopSell
                                  ? 'text-slate-500 line-through'
                                  : 'text-emerald-800'
                              }`}
                            >
                              {fmtVnd(allot.barPrice)}
                            </div>
                          </div>
                        </div>

                        {/* Actions (2 cols) */}
                        <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                          {isStopSell ? (
                            <button
                              onClick={() => handleToggleRoomStopSell(allot)}
                              className="px-3 py-2 rounded-xl text-[11px] font-bold bg-rose-800 hover:bg-rose-900 text-white shadow-xs transition cursor-pointer leading-tight"
                            >
                              Mở
                              <br />
                              Khóa
                              <br />
                              Bán
                            </button>
                          ) : isBespoke ? (
                            <button
                              onClick={() => handleToggleRoomStopSell(allot)}
                              className="px-3 py-2 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs transition cursor-pointer leading-tight"
                            >
                              Hồ
                              <br />
                              Sơ
                              <br />
                              VIP
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleRoomStopSell(allot)}
                              title="Đồng bộ / Khóa Stop-Sell hạng phòng này"
                              className="p-2 rounded-full bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              <MIcon name="sync" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingAllotment(allot);
                              setAllotmentForm({
                                roomTypeName: allot.roomTypeName,
                                subtitle: allot.subtitle,
                                totalRooms: allot.totalRooms,
                                otaAllotment: allot.otaAllotment,
                                directWebRooms: allot.directWebRooms,
                                holdMaintenanceRooms:
                                  allot.holdMaintenanceRooms || 0,
                                barPrice: allot.barPrice,
                                status: allot.status,
                                image: allot.image,
                              });
                            }}
                            title="Chỉnh sửa Allotment & Giá BAR"
                            className="p-2 rounded-full bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 cursor-pointer"
                          >
                            <MIcon name="edit" />
                          </button>

                          <button
                            onClick={() =>
                              setDeletingTarget({
                                kind: 'allotment',
                                item: allot,
                              })
                            }
                            title="Xóa hạng phòng"
                            className="p-2 rounded-full bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 cursor-pointer"
                          >
                            <MIcon name="delete" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Pricing Footer Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                  <MIcon name="bolt" className="text-emerald-700" />
                  <span>Cơ chế Giá Linh Hoạt (Dynamic Pricing):</span>
                  <strong className="text-emerald-800">
                    BẬT (Yield +{state.yieldBonusPercent}%)
                  </strong>
                  <span>• Đồng bộ tự động kế tiếp sau: 04:12</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleApplyWeekendRate}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition cursor-pointer"
                  >
                    Áp dụng bảng giá cuối tuần (+15%)
                  </button>
                  <button
                    onClick={handleSimulateOtaWebhook}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition cursor-pointer"
                  >
                    + Mô phỏng Booking OTA (Trừ kho tự động)
                  </button>
                  <button
                    onClick={handleToggleMasterStopSell}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-800 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    Khóa bán đồng loạt
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 COLS): LIVE API TRANSACTION FEED & SOCKET STREAM */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="text-lg font-bold text-slate-900 leading-snug"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Nhật Ký Giao Dịch
                    <br />
                    API
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 text-center leading-tight">
                  LIVE
                  <br />
                  FEED
                </span>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {state.logs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#f6f9f7] border border-slate-200/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${log.badgeClass}`}
                      >
                        {log.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.time}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">{log.title}</div>
                    <div className="text-slate-600 text-[11px]">
                      {log.detail}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-800 flex items-center gap-1 pt-0.5">
                      <span>✓</span>
                      <span>{log.result}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Raw Socket Stream Dark Box */}
              <div className="rounded-xl bg-[#0c1f17] text-emerald-400 p-3.5 font-mono text-[10px] space-y-1.5 border border-emerald-900">
                <div className="text-amber-300 font-bold tracking-wider uppercase border-b border-emerald-900/80 pb-1">
                  RAW SOCKET STREAM // PORT: 8443 (TLS 1.3)
                </div>
                <div>&gt;&gt; PING trip-api.ctrip.com: response 22ms</div>
                <div>&gt;&gt; ALLOTMENT_LOCK_MUTEX: released (0ms)</div>
                <div className="text-slate-400">
                  &gt;&gt; QUEUE_SIZE: 0 messages pending
                </div>
              </div>

              <button
                onClick={() => setShowConsoleModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#f3f6f4] hover:bg-emerald-50 text-slate-800 border border-slate-200 text-xs font-bold flex items-center justify-between transition cursor-pointer"
              >
                <span>Mở Console Phân Tích Gói Tin API Chi Tiết</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ─── SECTION 3: BOTTOM 3-CARD ROW ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bottom Card 1: Revenue Share by OTA Channel */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <h3
                  className="text-base font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Tỷ Trọng Doanh Thu Theo
                  <br />
                  Kênh Bán
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 text-right">
                  ĐÊM
                  <br />
                  NAY
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {state.channels.map((c, idx) => {
                  const pct =
                    totalOtaRevenueToday > 0
                      ? (
                          (Number(c.revenueToday || 0) / totalOtaRevenueToday) *
                          100
                        ).toFixed(1)
                      : '0.0';
                  const barColors = [
                    'bg-emerald-700',
                    'bg-sky-600',
                    'bg-teal-600',
                    'bg-emerald-500',
                  ];
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          {c.name} ({pct}%)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {fmtVnd(c.revenueToday)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Number(pct))}%` }}
                          className={`h-full rounded-full ${
                            barColors[idx % barColors.length]
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Card 2: XML/JSON Integrity Checker */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-start justify-between">
                <h3
                  className="text-base font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Trình Kiểm Tra Toàn Vẹn
                  <br />
                  XML/JSON
                </h3>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 text-center leading-tight">
                  ALL
                  <br />
                  CLEAR
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Hệ thống Channel Manager tự động xác thực checksum và đối soát
                tình trạng phòng trống mỗi 15 phút để đảm bảo không xảy ra hiện
                tượng bán vượt (Overbooking).
              </p>

              <div className="p-3 rounded-xl bg-[#f5f8f6] border border-slate-200/70 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">
                    Allotment Checksum:
                  </span>
                  <span className="font-bold text-emerald-800">
                    MATCHED (0x99A4)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">
                    Chính sách hủy phòng:
                  </span>
                  <span className="font-bold text-slate-800">
                    STRICT_LUXURY_48H
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">
                    Thời gian giữ phòng tức thời:
                  </span>
                  <span className="font-bold text-slate-900">
                    300 Giây (Instant Lock)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Card 3: Master Stop-Sell Emergency Switch */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3
                  className="text-base font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Khóa Phân Phối Trực Tiếp Nhanh
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trong trường hợp sự kiện khẩn cấp hoặc bảo trì đột xuất, ngắt
                  toàn bộ kênh bán ngoài để giữ độc quyền toàn resort trong 1
                  thao tác.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-900">
                    Khẩn Cấp: Master Stop-Sell
                  </div>
                  <div className="text-[11px] text-rose-700">
                    {state.masterStopSell
                      ? 'ĐANG KHÓA TOÀN BỘ KÊNH OTA NGOÀI'
                      : 'Áp dụng cho toàn bộ kênh OTA ngoài'}
                  </div>
                </div>
                <button
                  onClick={handleToggleMasterStopSell}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-xs transition cursor-pointer shrink-0 ${
                    state.masterStopSell
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-800 hover:bg-rose-900'
                  }`}
                >
                  {state.masterStopSell ? 'MỞ LẠI' : 'KÍCH HOẠT'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MODAL 1: THÊM / SỬA HẠNG PHÒNG ALLOTMENT & GIÁ BAR ─────────── */}
        {(showAddAllotmentModal || editingAllotment) && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {editingAllotment
                    ? `Chỉnh Sửa Allotment — ${editingAllotment.roomTypeName}`
                    : 'Thêm Hạng Phòng Vào Kho Đồng Bộ OTA'}
                </h3>
                <button
                  onClick={() => {
                    setEditingAllotment(null);
                    setShowAddAllotmentModal(false);
                  }}
                  className="text-slate-300 hover:text-white"
                >
                  <MIcon name="close" />
                </button>
              </div>

              <form
                onSubmit={handleSaveAllotment}
                className="p-5 space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên hạng phòng *
                  </label>
                  <input
                    type="text"
                    required
                    value={allotmentForm.roomTypeName}
                    onChange={(e) =>
                      setAllotmentForm({
                        ...allotmentForm,
                        roomTypeName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    placeholder="VD: Deluxe Ocean King"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mô tả quy mô / Tòa nhà
                  </label>
                  <input
                    type="text"
                    value={allotmentForm.subtitle}
                    onChange={(e) =>
                      setAllotmentForm({
                        ...allotmentForm,
                        subtitle: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tổng quy mô phòng
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={allotmentForm.totalRooms}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          totalRooms: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      OTA Allotment
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={allotmentForm.otaAllotment}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          otaAllotment: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Direct Web
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={allotmentForm.directWebRooms}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          directWebRooms: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giữ chỗ / Bảo dưỡng
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={allotmentForm.holdMaintenanceRooms}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          holdMaintenanceRooms: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giá BAR (VNĐ/đêm)
                    </label>
                    <input
                      type="number"
                      step="50000"
                      value={allotmentForm.barPrice}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          barPrice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Trạng thái kênh
                    </label>
                    <select
                      value={allotmentForm.status}
                      onChange={(e) =>
                        setAllotmentForm({
                          ...allotmentForm,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    >
                      <option value="OPEN">MỞ BÁN</option>
                      <option value="STOP_SELL">STOP-SELL (Khóa)</option>
                      <option value="BESPOKE">BESPOKE ONLY</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAllotment(null);
                      setShowAddAllotmentModal(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                  >
                    Lưu &amp; Đồng Bộ OTA
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: THÊM / SỬA KÊNH PHÂN PHỐI OTA ─────────────────────── */}
        {(showAddChannelModal || editingChannel) && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-sky-950 text-white flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {editingChannel
                    ? `Cấu Hình Kênh OTA — ${editingChannel.name}`
                    : 'Kết Nối Kênh Bán Phòng OTA Mới'}
                </h3>
                <button
                  onClick={() => {
                    setEditingChannel(null);
                    setShowAddChannelModal(false);
                  }}
                  className="text-slate-300 hover:text-white"
                >
                  <MIcon name="close" />
                </button>
              </div>

              <form
                onSubmit={handleSaveChannel}
                className="p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ký hiệu (2 chữ)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={channelForm.shortCode}
                      onChange={(e) =>
                        setChannelForm({
                          ...channelForm,
                          shortCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên cổng OTA *
                    </label>
                    <input
                      type="text"
                      required
                      value={channelForm.name}
                      onChange={(e) =>
                        setChannelForm({ ...channelForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã định danh Hotel ID
                    </label>
                    <input
                      type="text"
                      value={channelForm.accountCode}
                      onChange={(e) =>
                        setChannelForm({
                          ...channelForm,
                          accountCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mức hoa hồng (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={channelForm.commissionRate}
                      onChange={(e) =>
                        setChannelForm({
                          ...channelForm,
                          commissionRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số Booking hôm nay
                    </label>
                    <input
                      type="number"
                      value={channelForm.bookingsToday}
                      onChange={(e) =>
                        setChannelForm({
                          ...channelForm,
                          bookingsToday: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Doanh thu hôm nay (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="1000000"
                      value={channelForm.revenueToday}
                      onChange={(e) =>
                        setChannelForm({
                          ...channelForm,
                          revenueToday: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Đường dẫn đồng bộ iCal / Webhook URL
                  </label>
                  <input
                    type="text"
                    value={channelForm.icalUrl}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        icalUrl: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChannel(null);
                      setShowAddChannelModal(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                  >
                    Lưu Kênh OTA
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: XÁC NHẬN XÓA (DELETE CONFIRMATION) ────────────────── */}
        {deletingTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Xác Nhận Xóa Mục Đồng Bộ
                </h3>
                <button
                  onClick={() => setDeletingTarget(null)}
                  className="text-rose-200 hover:text-white"
                >
                  <MIcon name="close" />
                </button>
              </div>
              <div className="p-5 space-y-4 text-xs">
                <p className="text-slate-700 leading-relaxed">
                  Bạn có chắc chắn muốn xóa{' '}
                  <strong>
                    {deletingTarget.item.roomTypeName ||
                      deletingTarget.item.name}
                  </strong>{' '}
                  khỏi hệ thống điều hành Channel Manager?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDeletingTarget(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold"
                  >
                    Xác Nhận Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 4: CONSOLE PHÂN TÍCH GÓI TIN API / WEBHOOK / ICAL ───── */}
        {showConsoleModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-[#0c1f17] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MIcon name="terminal" className="text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    CONSOLE PHÂN TÍCH GÓI TIN OTA XML/JSON &amp; ICAL WEBHOOK
                  </h3>
                </div>
                <button
                  onClick={() => setShowConsoleModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <MIcon name="close" />
                </button>
              </div>
              <div className="p-5 bg-[#091510] text-emerald-300 font-mono text-xs space-y-3 max-h-[450px] overflow-y-auto">
                <pre className="whitespace-pre-wrap">{`POST /api/v1/channel-manager/webhook HTTP/1.1
Host: pms-gateway.grandhorizon.vn:8443
Content-Type: application/xml; charset=utf-8
X-OTA-Signature: sha256=9f8c4e120ab4419d...

<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="4.8">
  <AvailStatusMessages HotelCode="PQ-RES-00421">
${state.allotments
  .map(
    (a) =>
      `    <AvailStatusMessage BookingLimit="${a.otaAllotment}" RoomType="${a.roomTypeName}" RatePlan="BAR_${a.barPrice}" Restriction="${a.status}" />`
  )
  .join('\n')}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`}</pre>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Chuẩn giao thức: OpenTravel Alliance (OTA XML v4.8) &amp; iCal
                  RFC-5545
                </span>
                <button
                  onClick={() => setShowConsoleModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  Đóng Console
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ChannelManagerSync;
