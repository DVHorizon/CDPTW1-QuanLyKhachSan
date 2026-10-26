import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';

// Danh sách bữa ăn theo chuẩn F&B
const MEAL_PERIODS = [
  'Bữa Sáng Buffet Á - Âu (06:00 - 10:00)',
  'Bữa Trưa Set Menu Doanh Nhân (11:30 - 14:00)',
  'Bữa Tối Fine Dining Hoàng Hôn (17:30 - 22:00)'
];

const TIME_SLOTS = [
  '18:00', '18:30', '19:00', '19:30 LIVE', '20:00', '20:30', '21:00'
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BẢNG MÀU CHUẨN ĐỒNG BỘ TOÀN DỰ ÁN (ROOM MAP, KITCHEN KDS, F&B PMS):
 * 1. Available (Trống & Sạch)      -> Emerald (#10b981)
 * 2. Reserved (Đã Đặt Trước)       -> Sky Blue (#0284c7)
 * 3. Occupied (Đang Phục Vụ/Có Khách) -> Indigo / Navy (#4f46e5 / #1e293b)
 * 4. Cleaning (Cần Dọn/Khử Khuẩn)  -> Amber (#d97706)
 * 5. OutOfService (Ngừng Sử Dụng)  -> Slate / Rose (#64748b / #e11d48)
 * ═══════════════════════════════════════════════════════════════════════════
 */
const STATUS_THEME = {
  Available: {
    label: 'Trống Sẵn Sàng',
    shortLabel: 'Trống',
    bgBadge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    topBar: 'bg-emerald-500',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
    cardBorder: 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    chipBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    countBadge: 'bg-emerald-100 text-emerald-800 font-bold'
  },
  Reserved: {
    label: 'Đã Đặt Trước',
    shortLabel: 'Đã Đặt',
    bgBadge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
    topBar: 'bg-sky-500',
    dot: 'bg-sky-500 shadow-[0_0_8px_rgba(2,132,199,0.7)]',
    cardBorder: 'border-sky-200 dark:border-sky-800/40 hover:border-sky-400',
    iconColor: 'text-sky-600 dark:text-sky-400',
    chipBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
    countBadge: 'bg-sky-100 text-sky-800 font-bold'
  },
  Occupied: {
    label: 'Đang Phục Vụ (Có Khách)',
    shortLabel: 'Có Khách',
    bgBadge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
    topBar: 'bg-indigo-600',
    dot: 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.7)]',
    cardBorder: 'border-indigo-200 dark:border-indigo-800/40 hover:border-indigo-400',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    chipBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    countBadge: 'bg-indigo-100 text-indigo-800 font-bold'
  },
  Cleaning: {
    label: 'Cần Dọn Dẹp / Khử Khuẩn',
    shortLabel: 'Cần Dọn',
    bgBadge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    topBar: 'bg-amber-500',
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.7)]',
    cardBorder: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    chipBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
    countBadge: 'bg-amber-100 text-amber-800 font-bold'
  },
  Inactive: {
    label: 'Ngừng Sử Dụng',
    shortLabel: 'Khóa Bàn',
    bgBadge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30',
    topBar: 'bg-slate-500',
    dot: 'bg-slate-400',
    cardBorder: 'border-slate-200 dark:border-slate-800/40',
    iconColor: 'text-slate-400',
    chipBg: 'bg-slate-100 text-slate-700',
    countBadge: 'bg-slate-100 text-slate-700 font-bold'
  }
};

export default function TableMap() {
  const { user } = useAuth();
  const { subscribe, isConnected } = useSocket();

  // Filters
  const [mealPeriod, setMealPeriod] = useState('Bữa Tối Fine Dining Hoàng Hôn');
  const [timeSlot, setTimeSlot] = useState('19:30 LIVE');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Table & Detail Panel
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableDetail, setTableDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Inputs
  const [modalGuestCount, setModalGuestCount] = useState(2);
  const [modalCustomerName, setModalCustomerName] = useState('');
  const [modalCustomerPhone, setModalCustomerPhone] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [modalTargetTableId, setModalTargetTableId] = useState(null);

  // Load Table Map Data
  const fetchTableMap = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (mealPeriod) params.append('mealPeriod', mealPeriod);
      if (timeSlot) params.append('timeSlot', timeSlot);
      if (selectedZone && selectedZone !== 'ALL') params.append('zone', selectedZone);

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hotel_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/table-reservations/table-map?${params.toString()}`, { headers });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.message || 'Không có dữ liệu bàn cho khung giờ đã chọn.');
        setMapData(null);
        return;
      }

      setMapData(json.data);
      // Auto-select first table if nothing selected
      if (!selectedTableId && json.data?.tables?.length > 0) {
        setSelectedTableId(json.data.tables[0].tableId);
      }
    } catch (err) {
      console.error('Fetch table map error:', err);
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [mealPeriod, timeSlot, selectedZone, selectedTableId]);

  // Load Table Detail when selectedTableId changes
  const fetchTableDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hotel_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/table-reservations/table-map/${id}`, { headers });
      const json = await res.json();
      if (res.ok && json.data) {
        setTableDetail(json.data);
      } else {
        setTableDetail(null);
      }
    } catch (err) {
      console.error('Fetch table detail error:', err);
      setTableDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchTableMap();
  }, [fetchTableMap]);

  useEffect(() => {
    if (selectedTableId) {
      fetchTableDetail(selectedTableId);
    }
  }, [selectedTableId, fetchTableDetail]);

  // WebSocket Subscription for Realtime Table Status
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('TABLE_STATUS_CHANGED', (data) => {
      console.log('⚡ [TableMap Realtime] Nhận sự kiện TABLE_STATUS_CHANGED:', data);
      fetchTableMap(false);
      if (selectedTableId && data?.tableId === selectedTableId) {
        fetchTableDetail(selectedTableId);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [subscribe, fetchTableMap, fetchTableDetail, selectedTableId]);

  // Thao tác hành động trên bàn (AssignWalkIn, QuickReserve, CheckOut, MarkCleaned)
  const executeTableAction = async (action, payload = {}) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hotel_token');
      if (!token) {
        setErrorMsg('Bạn cần đăng nhập để thực hiện chức năng này');
        setActionLoading(false);
        return;
      }

      const body = {
        action,
        tableId: payload.tableId || selectedTableId,
        guestCount: payload.guestCount,
        note: payload.note,
        customerName: payload.customerName,
        phone: payload.phone
      };

      const res = await fetch('/api/v1/table-reservations/table-map/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.message || 'Thao tác không thành công.');
        return;
      }

      setSuccessMsg(json.message || 'Thao tác thành công.');
      setShowWalkInModal(false);
      setShowReserveModal(false);

      await fetchTableMap(false);
      if (body.tableId) {
        await fetchTableDetail(body.tableId);
      }
    } catch (err) {
      console.error('Execute table action error:', err);
      setErrorMsg('Không thể thực hiện thao tác bàn. Vui lòng kiểm tra kết nối.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Walk-In Modal
  const openWalkIn = (targetTableId = null) => {
    const tId = targetTableId || selectedTableId;
    setModalTargetTableId(tId);
    const tbl = mapData?.tables?.find(t => t.tableId === tId);
    setModalGuestCount(tbl?.capacity ? Math.min(2, tbl.capacity) : 2);
    setModalCustomerName('Khách Vãng Lai (Walk-in)');
    setModalNote('');
    setShowWalkInModal(true);
  };

  // Open Quick Reserve Modal
  const openQuickReserve = (targetTableId = null) => {
    const tId = targetTableId || selectedTableId;
    setModalTargetTableId(tId);
    const tbl = mapData?.tables?.find(t => t.tableId === tId);
    setModalGuestCount(tbl?.capacity ? Math.min(2, tbl.capacity) : 2);
    setModalCustomerName('');
    setModalCustomerPhone('');
    setModalNote('');
    setShowReserveModal(true);
  };

  // Filtered Zones and tables
  const displayedZones = useMemo(() => {
    if (!mapData?.zones) return {};
    const result = {};
    Object.keys(mapData.zones).forEach(zoneKey => {
      if (selectedZone !== 'ALL' && zoneKey !== selectedZone) return;

      const filteredTables = mapData.zones[zoneKey].filter(t => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const numMatch = String(t.tableNumber).toLowerCase().includes(q);
        const guestMatch = t.currentReservation?.guestName?.toLowerCase()?.includes(q) ||
                           t.currentOrder?.guestName?.toLowerCase()?.includes(q);
        return numMatch || guestMatch;
      });

      if (filteredTables.length > 0) {
        result[zoneKey] = filteredTables;
      }
    });
    return result;
  }, [mapData, selectedZone, statusFilter, searchTerm]);

  // Currently selected table object
  const activeTable = useMemo(() => {
    if (!mapData?.tables || !selectedTableId) return null;
    return mapData.tables.find(t => t.tableId === selectedTableId) || null;
  }, [mapData, selectedTableId]);

  const getTableIcon = (capacity) => {
    if (capacity >= 8) return 'groups';
    if (capacity >= 6) return 'meeting_room';
    if (capacity >= 4) return 'table_restaurant';
    return 'table_bar';
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full gap-space-lg pb-12">

        {/* Thông báo lỗi / thành công dạng Toast Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 text-red-800 flex items-center justify-between border border-red-200 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-red-600">error</span>
              <span className="text-sm font-semibold">{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="p-1 rounded-full hover:bg-red-100 text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-between border border-emerald-200 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-emerald-600">check_circle</span>
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg('')}
              className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* 1. Thanh Tiêu Đề Phiên Dịch Vụ & Tải Trọng Sức Chứa (Phong cách Dashboard Resort) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phiên Dịch Vụ F&B</span>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {isConnected ? 'REAL-TIME TRỰC TUYẾN' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={mealPeriod}
                    onChange={(e) => setMealPeriod(e.target.value)}
                    className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {MEAL_PERIODS.map(m => (
                      <option key={m} value={m} className="text-slate-800 dark:text-slate-100 text-sm font-normal">{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="hidden xl:block h-10 w-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tải Trọng Sức Chứa Khách</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                    {mapData?.metrics?.occupiedSeats || 0}/{mapData?.metrics?.totalSeats || 0}
                  </span>
                  <span className="text-xs text-slate-500">Ghế Đang Dùng</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                    {mapData?.metrics?.occupancyRate || 0}%
                  </span>
                </div>
              </div>

              <div className="w-28 hidden md:flex flex-col gap-1.5">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, mapData?.metrics?.occupancyRate || 0))}%` }}
                  ></div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 text-right">
                  {mapData?.metrics?.occupancyRate > 70 ? 'Bếp: Cao Điểm' : 'Bếp: Bình Ổn'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openWalkIn()}
              type="button"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Xếp Bàn Vãng Lai (Walk-in)</span>
            </button>

            <button
              onClick={() => openQuickReserve()}
              type="button"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white transition-all rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
              <span>Đặt Bàn Nhanh</span>
            </button>

            <button
              onClick={() => fetchTableMap(true)}
              type="button"
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors rounded-xl cursor-pointer"
              title="Làm mới sơ đồ"
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>

        {/* 2. Thanh Thống Kê 4 Trạng Thái & Bộ Lọc Khu Vực (Đồng Bộ Mã Màu PMS Toàn Hệ Thống) */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            {/* Có khách (Occupied) */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'Occupied' ? 'ALL' : 'Occupied')}
              className={`flex items-center gap-2 cursor-pointer transition-all px-2.5 py-1 rounded-lg ${statusFilter === 'Occupied' ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-500' : 'hover:bg-slate-50'}`}
            >
              <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.7)]"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">Đang Phục Vụ</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-mono">
                {String(mapData?.metrics?.occupiedCount || 0).padStart(2, '0')} Bàn
              </span>
            </div>

            {/* Đã đặt trước (Reserved) */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'Reserved' ? 'ALL' : 'Reserved')}
              className={`flex items-center gap-2 cursor-pointer transition-all px-2.5 py-1 rounded-lg ${statusFilter === 'Reserved' ? 'bg-sky-50 dark:bg-sky-950/60 ring-1 ring-sky-500' : 'hover:bg-slate-50'}`}
            >
              <span className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(2,132,199,0.7)]"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">Đã Đặt Trước</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold font-mono">
                {String(mapData?.metrics?.reservedCount || 0).padStart(2, '0')} Bàn
              </span>
            </div>

            {/* Bàn trống sẵn sàng (Available) */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'Available' ? 'ALL' : 'Available')}
              className={`flex items-center gap-2 cursor-pointer transition-all px-2.5 py-1 rounded-lg ${statusFilter === 'Available' ? 'bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-500' : 'hover:bg-slate-50'}`}
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">Trống Sẵn Sàng</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                {String(mapData?.metrics?.availableCount || 0).padStart(2, '0')} Bàn
              </span>
            </div>

            {/* Đang dọn dẹp (Cleaning) */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'Cleaning' ? 'ALL' : 'Cleaning')}
              className={`flex items-center gap-2 cursor-pointer transition-all px-2.5 py-1 rounded-lg ${statusFilter === 'Cleaning' ? 'bg-amber-50 dark:bg-amber-950/60 ring-1 ring-amber-500' : 'hover:bg-slate-50'}`}
            >
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.7)]"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">Cần Dọn Dẹp</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold font-mono">
                {String(mapData?.metrics?.cleaningCount || 0).padStart(2, '0')} Bàn
              </span>
            </div>
          </div>

          {/* Quick Filters: Search input */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
              <input
                type="text"
                placeholder="Tìm bàn, khách..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-0 text-xs sm:text-sm focus:ring-0 p-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-32 sm:w-44"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                Xóa Lọc
              </button>
            )}
          </div>
        </div>

        {/* 3. Lưới Sơ Đồ Bàn (Left: 8 cols) & Hồ Sơ Điều Phối Chi Tiết (Right: 4 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Cột Trái: Lưới các phân khu (Terrace, Sảnh Chính, VIP, Bể bơi...) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {loading && !mapData ? (
              <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center border border-slate-200/80">
                <span className="material-symbols-outlined text-[48px] text-indigo-600 animate-spin">progress_activity</span>
                <span className="text-base font-bold mt-3 text-slate-800">Đang tải sơ đồ bàn ăn trực quan...</span>
                <span className="text-xs text-slate-400 mt-1">Đồng bộ danh sách bàn và đơn gọi món real-time</span>
              </div>
            ) : Object.keys(displayedZones).length === 0 ? (
              <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center border border-slate-200/80">
                <span className="material-symbols-outlined text-[48px] text-slate-300">table_restaurant</span>
                <span className="text-base font-bold mt-3 text-slate-800">Không có dữ liệu bàn cho khung giờ hoặc bộ lọc đã chọn.</span>
                <span className="text-xs text-slate-400 mt-1">Vui lòng chọn khung giờ khác hoặc xóa bộ lọc để hiển thị toàn bộ sơ đồ.</span>
              </div>
            ) : (
              Object.entries(displayedZones).map(([zoneName, tables]) => (
                <div key={zoneName} className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
                  
                  {/* Zone Header */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-[22px]">
                          {zoneName.includes('VIP') ? 'meeting_room' : (zoneName.includes('Biển') || zoneName.includes('Vườn') ? 'deck' : 'storefront')}
                        </span>
                      </div>
                      <div>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-100">{zoneName}</span>
                        <p className="text-xs text-slate-400">
                          {tables.length} Vị trí bàn bàn giao tiêu chuẩn • Resort &amp; Suites
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-semibold">
                      Phục vụ: {tables.filter(t => t.status === 'Occupied').length}/{tables.length} bàn có khách
                    </span>
                  </div>

                  {/* Tables Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                    {tables.map(tbl => {
                      const isSelected = selectedTableId === tbl.tableId;
                      const theme = STATUS_THEME[tbl.status] || STATUS_THEME.Available;

                      return (
                        <div
                          key={tbl.tableId}
                          onClick={() => setSelectedTableId(tbl.tableId)}
                          className={`group relative p-3.5 rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-200 border ${theme.cardBorder} ${
                            isSelected
                              ? 'bg-slate-50 dark:bg-slate-800/80 shadow-lg ring-2 ring-indigo-600 scale-[1.03] z-10'
                              : 'bg-white dark:bg-slate-900 hover:shadow-md hover:scale-[1.01]'
                          }`}
                          title={`Bàn ${tbl.tableNumber} - ${theme.label} (${tbl.capacity} Khách)`}
                        >
                          {/* Top Colored Indicator Bar */}
                          <div className={`absolute top-0 left-3 right-3 h-1 rounded-b-md ${theme.topBar}`}></div>

                          {/* Selected Tag */}
                          {isSelected && (
                            <div className="absolute -top-2.5 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider font-bold">
                              Đang Chọn
                            </div>
                          )}

                          {/* Table Header: Table Number & Status Dot */}
                          <div className="w-full flex items-center justify-between pt-1">
                            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-600 dark:text-slate-300'}`}>
                              {tbl.tableNumber}
                            </span>
                            <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`}></span>
                          </div>

                          {/* Center Content: Icon + Guest Count + Guest Name */}
                          <div className="my-2.5 flex flex-col items-center">
                            <span className={`material-symbols-outlined text-[30px] ${theme.iconColor}`}>
                              {getTableIcon(tbl.capacity)}
                            </span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 font-mono">
                              {tbl.capacity} Khách
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px] mt-0.5">
                              {tbl.currentReservation?.guestName || tbl.currentOrder?.guestName || (tbl.status === 'Cleaning' ? 'Khử khuẩn' : 'Sẵn sàng')}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme.chipBg}`}>
                            {tbl.status === 'Occupied' ? (tbl.currentOrder ? 'Đang Ăn' : 'Có Khách') : theme.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cột Phải: Hồ Sơ Điều Phối Chi Tiết (Sticky Right: 4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6 sticky top-24">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-800 flex flex-col gap-5">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${activeTable ? (STATUS_THEME[activeTable.status] || STATUS_THEME.Available).dot : 'bg-slate-400'}`}></span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Hồ Sơ Điều Phối: {activeTable ? `BÀN ${activeTable.tableNumber}` : 'Chưa Chọn Bàn'}
                  </span>
                </div>
                {activeTable && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                    {activeTable.location || 'Sảnh Chung'}
                  </span>
                )}
              </div>

              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-[32px] animate-spin text-indigo-600">progress_activity</span>
                  <span className="text-xs mt-2">Đang tải chi tiết bàn...</span>
                </div>
              ) : !activeTable ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-[40px]">touch_app</span>
                  <span className="text-sm font-bold mt-2 text-slate-700">Nhấp chọn một bàn ăn trên sơ đồ</span>
                  <span className="text-xs mt-1">Để kiểm tra khách ngồi, gọi món và thực hiện check-out giải phóng bàn.</span>
                </div>
              ) : (
                <>
                  {/* Guest Info Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center gap-3.5 border border-slate-200/60 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                      {(tableDetail?.reservation?.user?.FullName || tableDetail?.activeOrder?.user?.FullName || 'GH').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {tableDetail?.reservation?.user?.FullName || tableDetail?.activeOrder?.user?.FullName || 'Khách Tại Bàn'}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-sky-500" title="Khách Đã Xác Thực">verified</span>
                      </div>
                      <span className="text-xs text-slate-500 truncate">
                        {tableDetail?.reservation?.user?.Phone ? `SĐT: ${tableDetail.reservation.user.Phone}` : `Sức chứa tối đa: ${activeTable.capacity} khách`}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${(STATUS_THEME[activeTable.status] || STATUS_THEME.Available).bgBadge}`}>
                          {(STATUS_THEME[activeTable.status] || STATUS_THEME.Available).label}
                        </span>
                        {tableDetail?.reservation?.Note && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                            {tableDetail.reservation.Note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time & Server Info */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Thời Gian Vào Bàn</span>
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
                        {tableDetail?.reservation?.ReservationTime
                          ? new Date(tableDetail.reservation.ReservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : (tableDetail?.activeOrder?.OrderTime ? new Date(tableDetail.activeOrder.OrderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '19:30')}
                      </span>
                      <span className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                        {activeTable.status === 'Occupied' ? 'Đang phục vụ' : (activeTable.status === 'Reserved' ? 'Đã đặt trước' : 'Bàn sạch')}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phục Vụ Viên</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                        {user?.fullName || 'Lê Minh Anh'}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Trạm F&amp;B PQC-T1
                      </span>
                    </div>
                  </div>

                  {/* Kitchen Progress */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tiến Độ Món Bếp Nóng (KDS)</span>
                      <span className="text-xs font-bold text-indigo-600 font-mono">
                        {tableDetail?.activeOrder ? `${tableDetail.activeOrder.Status}` : 'Chưa có đơn'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{
                          width: tableDetail?.activeOrder?.Status === 'Served' ? '100%' :
                                 (tableDetail?.activeOrder?.Status === 'Ready' ? '75%' :
                                 (tableDetail?.activeOrder?.Status === 'Preparing' ? '50%' : '15%'))
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Chi Tiết Gọi Món (Order)
                    </span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {tableDetail?.activeOrder?.items?.length > 0 ? (
                        tableDetail.activeOrder.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {item.quantity}x
                              </span>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                              {Number(item.total || (item.unitPrice * item.quantity) || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400 text-xs">
                          Chưa có đơn gọi món trực tiếp.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimation */}
                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl flex items-center justify-between border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tạm Tính Hóa Đơn</span>
                      <span className="text-[11px] text-slate-400">Đã gồm phí 5% &amp; VAT</span>
                    </div>
                    <span className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {Number(tableDetail?.activeOrder?.TotalAmount || tableDetail?.activeOrder?.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Available */}
                    {activeTable.status === 'Available' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openWalkIn(activeTable.tableId)}
                          disabled={actionLoading}
                          type="button"
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          <span>Xếp Khách Walk-in</span>
                        </button>
                        <button
                          onClick={() => openQuickReserve(activeTable.tableId)}
                          disabled={actionLoading}
                          type="button"
                          className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                          <span>Đặt Bàn Nhanh</span>
                        </button>
                      </div>
                    )}

                    {/* Reserved */}
                    {activeTable.status === 'Reserved' && (
                      <button
                        onClick={() => executeTableAction('AssignWalkIn', { tableId: activeTable.tableId, guestCount: activeTable.capacity })}
                        disabled={actionLoading}
                        type="button"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                        <span>Nhận Khách Vào Bàn (Chuyển Phục Vụ)</span>
                      </button>
                    )}

                    {/* Occupied */}
                    {activeTable.status === 'Occupied' && (
                      <button
                        onClick={() => executeTableAction('CheckOut', { tableId: activeTable.tableId })}
                        disabled={actionLoading}
                        type="button"
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">output</span>
                        <span>Giải Phóng Bàn (Check-Out)</span>
                      </button>
                    )}

                    {/* Cleaning */}
                    {activeTable.status === 'Cleaning' && (
                      <button
                        onClick={() => executeTableAction('MarkCleaned', { tableId: activeTable.tableId })}
                        disabled={actionLoading}
                        type="button"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                        <span>Xác Nhận Đã Dọn Xong (Chuyển Sẵn Sàng)</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Xếp Bàn Vãng Lai */}
        {showWalkInModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">person_add</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">Xếp Bàn Vãng Lai (Walk-in)</span>
                </div>
                <button onClick={() => setShowWalkInModal(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Mã Bàn</label>
                  <input
                    type="text"
                    disabled
                    value={mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.tableNumber || `Bàn #${modalTargetTableId}`}
                    className="w-full px-3 py-2 bg-slate-100 rounded-lg font-bold text-slate-700 border-0"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">
                    Sức chứa tối đa: {mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.capacity || 4} khách
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Số Lượng Khách (*)</label>
                  <input
                    type="number"
                    min="1"
                    max={mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.capacity || 20}
                    value={modalGuestCount}
                    onChange={(e) => setModalGuestCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg font-semibold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tên Đại Diện</label>
                  <input
                    type="text"
                    value={modalCustomerName}
                    onChange={(e) => setModalCustomerName(e.target.value)}
                    placeholder="VD: Anh Nam (Walk-in)"
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Ghi Chú Đón Tiếp</label>
                  <textarea
                    rows="2"
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="VD: Cần ghế trẻ em..."
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  ></textarea>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 rounded-lg"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => executeTableAction('AssignWalkIn', {
                    tableId: modalTargetTableId,
                    guestCount: modalGuestCount,
                    customerName: modalCustomerName,
                    note: modalNote
                  })}
                  className="px-5 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  {actionLoading ? 'Đang xếp bàn...' : 'Xác Nhận Xếp Bàn'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Đặt Bàn Nhanh */}
        {showReserveModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-600 text-[22px]">bookmark_add</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">Đặt Bàn Nhanh Cho Khách</span>
                </div>
                <button onClick={() => setShowReserveModal(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Mã Bàn</label>
                  <input
                    type="text"
                    disabled
                    value={mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.tableNumber || `Bàn #${modalTargetTableId}`}
                    className="w-full px-3 py-2 bg-slate-100 rounded-lg font-bold text-slate-700 border-0"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">
                    Sức chứa tối đa: {mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.capacity || 4} khách
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Số Lượng Khách (*)</label>
                  <input
                    type="number"
                    min="1"
                    max={mapData?.tables?.find(t => t.tableId === modalTargetTableId)?.capacity || 20}
                    value={modalGuestCount}
                    onChange={(e) => setModalGuestCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg font-semibold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Họ Và Tên Khách (*)</label>
                  <input
                    type="text"
                    value={modalCustomerName}
                    onChange={(e) => setModalCustomerName(e.target.value)}
                    placeholder="VD: Trần Hải Long"
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-slate-800 border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={modalCustomerPhone}
                    onChange={(e) => setModalCustomerPhone(e.target.value)}
                    placeholder="VD: 0987654321"
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-slate-800 border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Ghi Chú Đặt Bàn</label>
                  <textarea
                    rows="2"
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    placeholder="VD: Kỷ niệm ngày cưới..."
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-slate-800 border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  ></textarea>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-200 rounded-lg"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => executeTableAction('QuickReserve', {
                    tableId: modalTargetTableId,
                    guestCount: modalGuestCount,
                    customerName: modalCustomerName,
                    phone: modalCustomerPhone,
                    note: modalNote
                  })}
                  className="px-5 py-2 text-sm bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 shadow-sm"
                >
                  {actionLoading ? 'Đang đặt bàn...' : 'Xác Nhận Đặt Bàn'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
