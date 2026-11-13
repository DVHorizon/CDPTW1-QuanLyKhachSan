import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';
import statisticsApi, { getWsDashboardUrl } from '../../../api/statisticsApi';
import { cleanMessage, logSystemEvent } from '../../../utils/toastSanitizer';

const fmtMoney = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtNumber = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '0';
  return new Intl.NumberFormat('vi-VN').format(Number(n));
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const p = (v) => String(v).padStart(2, '0');
  return `${p(dt.getHours())}:${p(dt.getMinutes())} ${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const getTodayYMD = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDaysAgoYMD = (days = 29) => {
  const dt = new Date(Date.now() - days * 86400000);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const FNB_STATUS_LABELS = {
  Pending: { label: 'Chờ xác nhận', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  Confirmed: { label: 'Đã xác nhận', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  Preparing: { label: 'Đang chế biến', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  Ready: { label: 'Sẵn sàng phục vụ', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  Delivering: { label: 'Đang giao tới phòng', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  Served: { label: 'Đã phục vụ', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Delivered: { label: 'Đã hoàn tất', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Cancelled: { label: 'Đã hủy', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export default function MasterRevenueDashboard() {
  const location = useLocation();
  const initialTab = location.pathname.includes('occupancy') ? 'occupancy' : 'realtime';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [toast, setToast] = useState(null);

  // Tự động đồng bộ tab hiển thị khi người dùng điều hướng URL trực tiếp (/revenue hoặc /occupancy)
  useEffect(() => {
    if (location.pathname.includes('occupancy')) {
      setActiveTab('occupancy');
    } else if (location.pathname.includes('revenue')) {
      setActiveTab('realtime');
    }
  }, [location.pathname]);

  // ─── State Tab 1: C11 Real-time Revenue Dashboard ──────────────────────────
  const [selectedDate, setSelectedDate] = useState(getTodayYMD);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);

  // ─── State Tab 2: C12 Occupancy & RevPAR Analytics ─────────────────────────
  const [fromDate, setFromDate] = useState(() => getDaysAgoYMD(29));
  const [toDate, setToDate] = useState(getTodayYMD);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);

  const showSanitizedToast = useCallback((rawMsg, type = 'success') => {
    const msg = cleanMessage(rawMsg) || 'Thao tác đã được xử lý.';
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Tải dữ liệu C11: Real-time Revenue Dashboard ──────────────────────────
  const fetchRevenueDashboard = useCallback(
    async (dateParam = selectedDate, silent = false) => {
      if (!silent) setLoadingDashboard(true);
      try {
        const res = await statisticsApi.getRevenueDashboard(dateParam);
        if (res?.data) {
          setDashboardData(res.data);
          setLastUpdated(new Date());
          logSystemEvent({
            code: 'SUCCESS_LOAD_REVENUE_DASHBOARD',
            message: 'Tải dữ liệu Dashboard doanh thu thành công',
            type: 'info',
            context: { date: dateParam },
          });
        }
      } catch (err) {
        const friendlyMsg = cleanMessage(err) || 'Không thể tải dữ liệu thống kê doanh thu.';
        showSanitizedToast(friendlyMsg, 'error');
        logSystemEvent({
          code: err.code || 'ERROR_LOAD_REVENUE_DASHBOARD',
          message: friendlyMsg,
          rawMessage: err.message,
          type: 'error',
        });
      } finally {
        if (!silent) setLoadingDashboard(false);
      }
    },
    [selectedDate, showSanitizedToast]
  );

  // ─── Tải dữ liệu C12: Occupancy & RevPAR Report ────────────────────────────
  const fetchOccupancyReport = useCallback(async () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showSanitizedToast(
        'Khoảng thời gian không hợp lệ. Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.',
        'error'
      );
      return;
    }

    setLoadingOccupancy(true);
    try {
      const res = await statisticsApi.getOccupancyReport({ fromDate, toDate });
      if (res?.data) {
        setOccupancyData(res.data);
        logSystemEvent({
          code: 'SUCCESS_LOAD_OCCUPANCY_REPORT',
          message: 'Tải báo cáo công suất phòng & RevPAR thành công',
          type: 'info',
          context: { fromDate, toDate },
        });
      }
    } catch (err) {
      const friendlyMsg = cleanMessage(err) || 'Không thể tải báo cáo công suất phòng & RevPAR.';
      showSanitizedToast(friendlyMsg, 'error');
      logSystemEvent({
        code: err.code || 'ERROR_LOAD_OCCUPANCY_REPORT',
        message: friendlyMsg,
        rawMessage: err.message,
        type: 'error',
      });
    } finally {
      setLoadingOccupancy(false);
    }
  }, [fromDate, toDate, showSanitizedToast]);

  // ─── Kết nối WebSocket /ws/v1/dashboard ────────────────────────────────────
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connectWs = () => {
      try {
        const wsUrl = getWsDashboardUrl();
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          fetchRevenueDashboard(selectedDate, true);
          logSystemEvent({
            code: 'INFO_WS_DASHBOARD_CONNECTED',
            message: 'Đã kết nối luồng dữ liệu thời gian thực Dashboard',
            type: 'info',
          });
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.event === 'DASHBOARD_UPDATE' || payload.type === 'DASHBOARD_UPDATE') {
              if (payload.data && payload.data.kpis) {
                setDashboardData((prev) => ({
                  ...(prev || {}),
                  ...payload.data,
                }));
                setLastUpdated(new Date());
              } else if (payload.action) {
                // Event notification (e.g. PAYMENT_SUCCESS, NEW_BOOKING) -> refresh dashboard data
                fetchRevenueDashboard(selectedDate, true);
              }
            }
          } catch (_) {
            // Bỏ qua gói tin không phải JSON
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (_) {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedDate, fetchRevenueDashboard]);

  // Bộ đếm 5 phút tự động đồng bộ (auto-resync)
  useEffect(() => {
    const resyncInterval = setInterval(() => {
      fetchRevenueDashboard(selectedDate, true);
    }, 5 * 60 * 1000);

    return () => clearInterval(resyncInterval);
  }, [selectedDate, fetchRevenueDashboard]);

  useEffect(() => {
    fetchRevenueDashboard(selectedDate);
  }, [selectedDate, fetchRevenueDashboard]);

  useEffect(() => {
    if (activeTab === 'occupancy' && !occupancyData) {
      fetchOccupancyReport();
    }
  }, [activeTab, occupancyData, fetchOccupancyReport]);

  // ─── Xuất file Excel (.xlsx) hoặc CSV (.csv) ───────────────────────────────
  const handleExportReport = async (format = 'xlsx') => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showSanitizedToast(
        'Khoảng thời gian xuất báo cáo không hợp lệ. Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.',
        'error'
      );
      return;
    }

    setExportingFormat(format);
    try {
      await statisticsApi.exportOccupancyExcel({ fromDate, toDate, format });
      showSanitizedToast(
        `Đã xuất báo cáo Công suất phòng & RevPAR định dạng ${format.toUpperCase()} thành công.`,
        'success'
      );
      logSystemEvent({
        code: 'SUCCESS_EXPORT_OCCUPANCY',
        message: 'Xuất báo cáo Occupancy & RevPAR thành công',
        type: 'success',
        context: { fromDate, toDate, format },
      });
    } catch (err) {
      const friendlyMsg = cleanMessage(err) || 'Không thể xuất file báo cáo công suất phòng.';
      showSanitizedToast(friendlyMsg, 'error');
      logSystemEvent({
        code: err.code || 'ERROR_EXPORT_OCCUPANCY',
        message: friendlyMsg,
        rawMessage: err.message,
        type: 'error',
      });
    } finally {
      setExportingFormat(null);
    }
  };

  // Dữ liệu hiển thị cho Tab 1
  const kpis = dashboardData?.kpis || {
    revenueToday: 0,
    newBookingsToday: 0,
    occupancyRate: 0,
    newFnbOrdersToday: 0,
  };
  const hourlyRevenue = Array.isArray(dashboardData?.hourlyRevenue)
    ? dashboardData.hourlyRevenue
    : Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        revenue: 0,
        count: 0,
      }));
  const maxHourlyRev = Math.max(1, ...hourlyRevenue.map((h) => Number(h.revenue || 0)));

  const roomDist = dashboardData?.roomStatusDistribution || {
    Available: 0,
    Occupied: 0,
    Cleaning: 0,
    Maintenance: 0,
    OutOfOrder: 0,
  };
  const totalPhysicalRooms = Math.max(
    1,
    Number(roomDist.Available || 0) +
      Number(roomDist.Occupied || 0) +
      Number(roomDist.Cleaning || 0) +
      Number(roomDist.Maintenance || 0) +
      Number(roomDist.OutOfOrder || 0)
  );
  const recentFnbOrders = Array.isArray(dashboardData?.recentFnbOrders)
    ? dashboardData.recentFnbOrders
    : [];

  // Dữ liệu hiển thị cho Tab 2
  const occSummary = occupancyData?.summary || {
    totalRooms: 0,
    roomNightsAvailable: 0,
    roomNightsSold: 0,
    occupancyRate: 0,
    totalRoomRevenue: 0,
    adr: 0,
    revPar: 0,
  };
  const monthlyBreakdown = Array.isArray(occupancyData?.monthlyBreakdown)
    ? occupancyData.monthlyBreakdown
    : [];
  const compareLastYear = occupancyData?.compareLastYear || {
    occupancyChange: 0,
    adrChange: 0,
    revParChange: 0,
    lastYearOccupancyRate: 0,
    lastYearRevPar: 0,
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Toast Thông báo tiếng Việt */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="font-semibold text-sm">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs opacity-70 hover:opacity-100 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                Trung Tâm Điều Hành Tài Chính
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  wsConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {wsConnected ? 'Trực tuyến (WebSocket Live)' : 'Chế độ đồng bộ tiêu chuẩn'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Master Dashboard Thống Kê Doanh Thu & Báo Cáo RevPAR
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Giám sát dòng tiền thực thu theo thời gian thực, công suất lấp đầy buồng phòng và phân tích chỉ số ADR / RevPAR
            </p>
          </div>

          {/* Chuyển đổi Tab C11 / C12 */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('realtime')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'realtime'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard Doanh Thu Thực Tế (C11)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('occupancy')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'occupancy'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Báo Cáo Occupancy & RevPAR (C12)
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1 (C11): MASTER DASHBOARD DOANH THU THỜI GIAN THỰC
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'realtime' && (
          <div className="space-y-6">
            {/* Bộ lọc ngày & làm mới */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="dashboard-date" className="text-sm font-semibold text-slate-700">
                  Ngày thống kê:
                </label>
                <input
                  id="dashboard-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayYMD())}
                  className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                >
                  Hôm nay
                </button>
              </div>

              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-slate-500">
                    Cập nhật lúc: <strong>{fmtDateTime(lastUpdated)}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fetchRevenueDashboard(selectedDate)}
                  disabled={loadingDashboard}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {loadingDashboard ? 'Đang đồng bộ...' : 'Làm mới dữ liệu'}
                </button>
              </div>
            </div>

            {/* 4 Thẻ KPI Cốt Lõi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* KPI 1: Thực thu trong ngày */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    Thực Thu Trong Ngày (Cash Inflow)
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {fmtMoney(kpis.revenueToday)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tổng giao dịch thanh toán thành công trừ hoàn tiền
                  </p>
                </div>
              </div>

              {/* KPI 2: Đặt phòng mới hôm nay */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Đặt Phòng Mới Trong Ngày
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {fmtNumber(kpis.newBookingsToday)} <span className="text-sm font-medium text-slate-500">đơn</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tổng lượt booking khởi tạo mới trong ngày {selectedDate}
                  </p>
                </div>
              </div>

              {/* KPI 3: Công suất phòng tức thời */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                    Công Suất Phòng Tức Thời
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {Number(kpis.occupancyRate || 0).toFixed(2)}%
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Number(kpis.occupancyRate || 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI 4: Đơn F&B phát sinh */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    Đơn Ẩm Thực (F&B) Trong Ngày
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {fmtNumber(kpis.newFnbOrdersToday)} <span className="text-sm font-medium text-slate-500">đơn</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Bao gồm Room Service và Nhà hàng phát sinh
                  </p>
                </div>
              </div>
            </div>

            {/* Biểu đồ doanh thu 24h & Phân bổ trạng thái phòng */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Biểu đồ 24 khung giờ */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Biểu Đồ Dòng Tiền Thực Thu Theo 24 Khung Giờ
                    </h2>
                    <p className="text-xs text-slate-500">
                      Phân bổ doanh thu thanh toán thực tế từ 00:00 đến 23:00 ({selectedDate})
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                    Tổng: {fmtMoney(kpis.revenueToday)}
                  </span>
                </div>

                <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-200 overflow-x-auto">
                  {hourlyRevenue.map((bucket) => {
                    const rev = Number(bucket.revenue || 0);
                    const heightPct = rev > 0 ? Math.max(8, Math.round((rev / maxHourlyRev) * 100)) : 3;
                    return (
                      <div
                        key={bucket.hour}
                        className="flex-1 min-w-[22px] flex flex-col items-center group relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-9 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap z-10 shadow">
                          {bucket.label}: {fmtMoney(rev)} ({bucket.count || 0} GD)
                        </div>
                        <div className="w-full h-40 flex items-end justify-center">
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              rev > 0
                                ? 'bg-indigo-600 group-hover:bg-indigo-500'
                                : 'bg-slate-100 group-hover:bg-slate-200'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1.5 font-medium">
                          {String(bucket.hour).padStart(2, '0')}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phân bổ trạng thái phòng vật lý */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Phân Bổ Trạng Thái Phòng Vật Lý
                  </h2>
                  <p className="text-xs text-slate-500 mb-5">
                    Tổng hợp trực tiếp từ sơ đồ buồng phòng hiện hành
                  </p>

                  <div className="space-y-4">
                    {[
                      {
                        key: 'Available',
                        label: 'Phòng trống sẵn sàng (Available)',
                        count: Number(roomDist.Available || 0),
                        barColor: 'bg-emerald-500',
                        badgeColor: 'text-emerald-700 bg-emerald-50',
                      },
                      {
                        key: 'Occupied',
                        label: 'Đang có khách lưu trú (Occupied)',
                        count: Number(roomDist.Occupied || 0),
                        barColor: 'bg-indigo-600',
                        badgeColor: 'text-indigo-700 bg-indigo-50',
                      },
                      {
                        key: 'Cleaning',
                        label: 'Đang dọn phòng / Chờ kiểm tra',
                        count: Number(roomDist.Cleaning || 0),
                        barColor: 'bg-amber-500',
                        badgeColor: 'text-amber-700 bg-amber-50',
                      },
                      {
                        key: 'Maintenance',
                        label: 'Đang bảo trì kỹ thuật (Maintenance)',
                        count: Number(roomDist.Maintenance || 0),
                        barColor: 'bg-orange-500',
                        badgeColor: 'text-orange-700 bg-orange-50',
                      },
                      {
                        key: 'OutOfOrder',
                        label: 'Ngưng khai thác (Out of Order)',
                        count: Number(roomDist.OutOfOrder || 0),
                        barColor: 'bg-rose-500',
                        badgeColor: 'text-rose-700 bg-rose-50',
                      },
                    ].map((item) => {
                      const pct = Math.round((item.count / totalPhysicalRooms) * 100);
                      return (
                        <div key={item.key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{item.label}</span>
                            <span className={`px-2 py-0.5 rounded-md font-bold ${item.badgeColor}`}>
                              {item.count} phòng ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.barColor}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Tổng quỹ phòng quản lý:</span>
                  <strong className="text-slate-900 text-sm">{totalPhysicalRooms} phòng</strong>
                </div>
              </div>
            </div>

            {/* Danh sách đơn F&B gần đây */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Luồng Đơn Dịch Vụ Ẩm Thực & Room Service Gần Đây
                  </h2>
                  <p className="text-xs text-slate-500">
                    10 đơn đặt món F&B mới nhất trên toàn hệ thống
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Mã Đơn F&B</th>
                      <th className="py-3.5 px-6">Phòng / Vị Trí</th>
                      <th className="py-3.5 px-6">Hình Thức</th>
                      <th className="py-3.5 px-6">Thời Gian Đặt</th>
                      <th className="py-3.5 px-6">Trạng Thái</th>
                      <th className="py-3.5 px-6 text-right">Tổng Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {recentFnbOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Chưa có đơn ẩm thực F&B nào phát sinh.
                        </td>
                      </tr>
                    ) : (
                      recentFnbOrders.map((order) => {
                        const id = order.FoodOrderId || order.foodOrderId;
                        const statusKey = order.Status || order.status || 'Pending';
                        const statusMeta = FNB_STATUS_LABELS[statusKey] || {
                          label: statusKey,
                          badge: 'bg-slate-100 text-slate-700 border-slate-200',
                        };
                        return (
                          <tr key={id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-6 font-bold text-slate-900">#FNB-{id}</td>
                            <td className="py-3.5 px-6 font-medium text-slate-700">
                              {order.RoomNumber || order.roomNumber || 'Nhà hàng'}
                            </td>
                            <td className="py-3.5 px-6 text-slate-600">
                              {(order.OrderType || order.orderType) === 'Restaurant'
                                ? 'Tại nhà hàng'
                                : 'Phục vụ tại phòng (Room Service)'}
                            </td>
                            <td className="py-3.5 px-6 text-slate-600">
                              {fmtDateTime(order.OrderDate || order.orderDate || order.OrderTime)}
                            </td>
                            <td className="py-3.5 px-6">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badge}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right font-bold text-slate-900">
                              {fmtMoney(order.TotalAmount ?? order.totalAmount ?? 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2 (C12): BÁO CÁO CÔNG SUẤT PHÒNG (OCCUPANCY) & CHỈ SỐ REVPAR
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'occupancy' && (
          <div className="space-y-6">
            {/* Bộ lọc khoảng ngày & Nút Xuất Excel / CSV */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="occ-from-date" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Từ ngày
                  </label>
                  <input
                    id="occ-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="occ-to-date" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Đến ngày
                  </label>
                  <input
                    id="occ-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchOccupancyReport}
                  disabled={loadingOccupancy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {loadingOccupancy ? 'Đang phân tích...' : 'Phân tích kỳ báo cáo'}
                </button>
              </div>

              {/* Cụm nút Xuất Báo Cáo */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExportReport('xlsx')}
                  disabled={exportingFormat !== null}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {exportingFormat === 'xlsx' ? 'Đang xuất Excel...' : 'Xuất Excel (.xlsx)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReport('csv')}
                  disabled={exportingFormat !== null}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {exportingFormat === 'csv' ? 'Đang xuất CSV...' : 'Xuất CSV (.csv)'}
                </button>
              </div>
            </div>

            {/* Thẻ Tổng hợp KPIs Occupancy, ADR, RevPAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Occupancy Rate */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  Công Suất Lấp Đầy (Occupancy)
                </span>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {Number(occSummary.occupancyRate || 0).toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      compareLastYear.occupancyChange >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {compareLastYear.occupancyChange >= 0 ? '▲ +' : '▼ '}
                    {compareLastYear.occupancyChange}% so với cùng kỳ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Đã bán {fmtNumber(occSummary.roomNightsSold)} / {fmtNumber(occSummary.roomNightsAvailable)} đêm phòng khả dụng
                </p>
              </div>

              {/* ADR (Average Daily Rate) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Giá Phòng Bình Quân (ADR)
                </span>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {fmtMoney(occSummary.adr)}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Doanh thu phòng bình quân trên mỗi đêm phòng đã bán
                  </p>
                </div>
              </div>

              {/* RevPAR (Revenue Per Available Room) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Chỉ Số RevPAR (ADR × Occupancy)
                </span>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {fmtMoney(occSummary.revPar)}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      compareLastYear.revParChange >= 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {compareLastYear.revParChange >= 0 ? '+' : ''}
                    {fmtMoney(compareLastYear.revParChange)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Doanh thu phòng đạt được trên mỗi đêm phòng khả dụng
                </p>
              </div>

              {/* Tổng doanh thu phòng trong kỳ */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                  Tổng Doanh Thu Phòng Thuần
                </span>
                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {fmtMoney(occSummary.totalRoomRevenue)}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Quỹ phòng vật lý: {fmtNumber(occSummary.totalRooms)} phòng
                  </p>
                </div>
              </div>
            </div>

            {/* Bảng phân tích theo từng tháng (Monthly Breakdown) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Bảng Phân Tích Công Suất Phòng, ADR & RevPAR Theo Tháng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chuẩn kiểm toán quản trị khách sạn (RevPAR = ADR × Occupancy Rate)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Tháng</th>
                      <th className="py-3.5 px-6">Khoảng Ngày</th>
                      <th className="py-3.5 px-6 text-right">Đêm Phòng Khả Dụng</th>
                      <th className="py-3.5 px-6 text-right">Đêm Phòng Đã Bán</th>
                      <th className="py-3.5 px-6 text-right">Công Suất (%)</th>
                      <th className="py-3.5 px-6 text-right">Doanh Thu Phòng</th>
                      <th className="py-3.5 px-6 text-right">ADR</th>
                      <th className="py-3.5 px-6 text-right">RevPAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {monthlyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Không có dữ liệu phân tích cho khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    ) : (
                      monthlyBreakdown.map((m) => (
                        <tr key={m.month} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-6 font-bold text-indigo-700">{m.month}</td>
                          <td className="py-3.5 px-6 text-slate-600 text-xs">
                            {m.fromDate} → {m.toDate}
                          </td>
                          <td className="py-3.5 px-6 text-right font-medium text-slate-700">
                            {fmtNumber(m.roomNightsAvailable)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-semibold text-slate-900">
                            {fmtNumber(m.roomNightsSold)}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                              {Number(m.occupancyRate || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right font-semibold text-slate-900">
                            {fmtMoney(m.totalRoomRevenue)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-medium text-slate-800">
                            {fmtMoney(m.adr)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-bold text-emerald-700">
                            {fmtMoney(m.revPar)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
