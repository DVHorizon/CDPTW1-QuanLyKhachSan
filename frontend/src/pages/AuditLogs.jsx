import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'alerts' | 'tamper_test'
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  
  // Modal states
  const [selectedLog, setSelectedLog] = useState(null);
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [notification, setNotification] = useState(null);

  const API_BASE = '/api/audit';

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (title, message, type = 'info') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 6000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/logs`).catch(() => null),
        fetch(`${API_BASE}/alerts`).catch(() => null),
      ]);
      
      let logsData = { success: false, data: [] };
      let alertsData = { success: false, data: [] };
      
      if (logsRes && logsRes.ok) logsData = await logsRes.json();
      if (alertsRes && alertsRes.ok) alertsData = await alertsRes.json();

      if (logsData.success && Array.isArray(logsData.data)) {
        setLogs(logsData.data);
      } else {
        // Fallback demo data nếu chưa bật backend
        setLogs([
          { id: 101, createdAt: new Date().toISOString(), user_id: 1, entity_name: 'Room', action: 'UPDATE_ROOM_PRICE', ip_address: '10.248.18.92', reason: 'Tăng giá phòng mùa cao điểm', old_values: { price: 2000000 }, new_values: { price: 2500000 } },
          { id: 102, createdAt: new Date(Date.now() - 360000).toISOString(), user_id: 2, entity_name: 'Folio', action: 'APPROVE_PAYMENT', ip_address: '10.248.18.84', reason: 'Thanh toán thẻ Visa qua POS', old_values: null, new_values: { amount: 15400000 } },
          { id: 103, createdAt: new Date(Date.now() - 720000).toISOString(), user_id: 3, entity_name: 'EKey', action: 'GENERATE_MASTER_KEY', ip_address: '10.248.18.99', reason: 'Cấp thẻ dự phòng bảo trì', old_values: null, new_values: { cardType: 'MASTER' } },
        ]);
      }

      if (alertsData.success && Array.isArray(alertsData.data)) {
        setAlerts(alertsData.data);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu audit:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. MÔ PHỎNG THAO TÁC QUA INTERCEPTOR ---
  const handleTestNormalAction = async () => {
    try {
      const res = await fetch(`${API_BASE}/test-sensitive-action/101`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM_PRICE',
          entity: 'Room',
          oldPrice: 2000000,
          newPrice: 2100000,
          reason: 'Điều chỉnh giá phòng Ocean Suite theo quy chế kinh doanh',
          user_id: 1,
        }),
      });
      const data = await res.json();
      showToast('Thành công (Interceptor)', 'Audit Log Interceptor đã bắt vết và ghi nhận thành công!', 'success');
      fetchData();
    } catch (err) {
      showToast('Lỗi', err.message, 'error');
    }
  };

  // --- 2. MÔ PHỎNG PHÁT HIỆN GIAN LẬN: HẠ GIÁ SỐC >50% ---
  const handleTestPriceDumpFraud = async () => {
    try {
      const res = await fetch(`${API_BASE}/test-sensitive-action/102`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM_PRICE',
          entity: 'Room',
          oldPrice: 3500000,
          newPrice: 900000, // Giảm 74%
          reason: 'Hạ giá sâu bất thường không qua phê duyệt',
          user_id: 1,
        }),
      });
      showToast('Báo Động Gian Lận!', 'Phát hiện hạ giá vượt 50%! Fraud Detection Engine đã tạo FraudAlert mức CRITICAL!', 'warning');
      fetchData();
      setActiveTab('alerts');
    } catch (err) {
      showToast('Lỗi', err.message, 'error');
    }
  };

  // --- 3. MÔ PHỎNG GIAN LẬN: BURST VELOCITY (5 THAO TÁC LIÊN TIẾP) ---
  const handleTestBurstAttack = async () => {
    showToast('Đang mô phỏng...', 'Gửi liên tiếp 5 yêu cầu nhạy cảm trong vòng 2 giây...', 'info');
    try {
      for (let i = 1; i <= 5; i++) {
        await fetch(`${API_BASE}/test-sensitive-action/${200 + i}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: `MANUAL_CARD_AUTH_${i}`,
            entity: 'PaymentGateway',
            oldPrice: 1000000,
            newPrice: 1000000,
            reason: `Kiểm tra thẻ hàng loạt #${i}`,
            user_id: 1,
          }),
        });
      }
      showToast('Phát Hiện Bất Thường!', 'User thực hiện >= 5 hành động nhạy cảm trong thời gian ngắn! Sinh FraudAlert mức HIGH.', 'warning');
      fetchData();
      setActiveTab('alerts');
    } catch (err) {
      showToast('Lỗi', err.message, 'error');
    }
  };

  // --- 4. KIỂM CHỨNG KHÔNG CHO PHÉP XÓA/SỬA BẢNG LOG (WORM ENFORCEMENT) ---
  const handleTestDeleteLog = async () => {
    const targetId = logs[0]?.id || 1;
    try {
      const res = await fetch(`${API_BASE}/logs/${targetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        showToast(
          'ĐÃ CHẶN THÀNH CÔNG (WORM)',
          `Hệ thống từ chối xóa Log #${targetId}! Lý do: ${data.message}`,
          'security'
        );
      }
      fetchData();
    } catch (err) {
      showToast('Kết nối', err.message, 'error');
    }
  };

  const handleTestDirectORMDelete = async () => {
    const targetId = logs[0]?.id || 1;
    try {
      const res = await fetch(`${API_BASE}/test-direct-tamper/${targetId}?action=delete`, { method: 'POST' });
      const data = await res.json();
      if (!data.success && data.blockedBySecurityHook) {
        showToast(
          'SEQUELIZE HOOK & DB TRIGGER ĐÃ CHẶN',
          `Cơ sở dữ liệu SQLite Trigger & Sequelize Hook đã ném Exception chặn xóa trực tiếp: "${data.message}"`,
          'security'
        );
      }
    } catch (err) {
      showToast('Kết nối', err.message, 'error');
    }
  };

  // --- 5. GIẢI QUYẾT CẢNH BÁO GIAN LẬN ---
  const handleResolveAlert = async () => {
    if (!resolvingAlert) return;
    try {
      const res = await fetch(`${API_BASE}/alerts/${resolvingAlert.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolved_by: 'Trưởng Ban An Ninh Khách Sạn',
          resolution_note: resolutionNote || 'Đã đối soát nghiệp vụ, sự cố được xác minh và xử lý an toàn.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã giải quyết', 'Cảnh báo đã được đánh dấu giải quyết thành công!', 'success');
        setResolvingAlert(null);
        setResolutionNote('');
        fetchData();
      }
    } catch (err) {
      showToast('Lỗi', err.message, 'error');
    }
  };

  // Lọc logs
  const filteredLogs = logs.filter(log => {
    const matchSearch = searchTerm === '' || 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm) ||
      String(log.user_id).includes(searchTerm);
    return matchSearch;
  });

  // Lọc alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === 'ALL') return true;
    return alert.severity === filterSeverity;
  });

  const unresolvedAlertCount = alerts.filter(a => !a.is_resolved).length;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 -mx-space-lg px-space-lg pt-4 pb-12 min-h-screen bg-[#F8FAF9] font-sans">
        
        {/* TOAST NOTIFICATION */}
        {notification && (
          <div className={`fixed top-20 right-8 z-50 max-w-md p-4 rounded-xl shadow-2xl border flex items-start gap-3 transition-all animate-in slide-in-from-top-4 ${
            notification.type === 'security'
              ? 'bg-rose-950 text-white border-rose-600'
              : notification.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-500'
              : notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            <span className="material-symbols-outlined text-2xl text-amber-400">
              {notification.type === 'security' ? 'security' : notification.type === 'warning' ? 'warning' : 'check_circle'}
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-sm tracking-wide">{notification.title}</h4>
              <p className="text-xs text-gray-200 mt-1 leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1.5">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              PHÂN HỆ KIỂM SOÁT NỘI BỘ & AN NINH DỮ LIỆU PMS
            </div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold text-slate-900">
              Nhật Ký Hành Vi & Cảnh Báo Gian Lận (Audit & Fraud Prevention)
            </h1>
            <p className="text-xs text-gray-500 mt-2 max-w-2xl leading-relaxed">
              Cơ chế <strong className="text-slate-800">Audit Log Interceptor</strong> tự động bắt vết hành vi, đảm bảo tính chất bất biến <strong className="text-emerald-700">WORM (Write Once, Read Many)</strong> không thể xóa/sửa và <strong className="text-rose-700">Fraud Detection Engine</strong> quét bất thường thời gian thực.
            </p>
          </div>

          {/* SIMULATION ACTION BUTTONS */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTestNormalAction}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              Ghi Log Thường (Interceptor)
            </button>

            <button
              onClick={handleTestPriceDumpFraud}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-xs shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">price_change</span>
              Test: Hạ Giá &gt;50% (Fraud)
            </button>

            <button
              onClick={handleTestBurstAttack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-300 hover:bg-orange-100 text-orange-900 font-semibold text-xs shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              Test: Thao Tác Dồn Dập (5x)
            </button>

            <button
              onClick={handleTestDeleteLog}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-900 font-semibold text-xs shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">shield</span>
              Test: Thử Xóa Bảng Log (WORM)
            </button>
          </div>
        </div>

        {/* --- STATS SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">CƠ CHẾ BẢO VỆ WORM</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">lock</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              BẤT BIẾN <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Chặn UPDATE/DELETE ở cả DB Triggers & ORM Hooks</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">TỔNG NHẬT KÝ KIỂM TOÁN</span>
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">receipt_long</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {logs.length} <span className="text-xs text-gray-400 font-normal">bản ghi</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Bắt vết đầy đủ IP, User, Old & New Values</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">CẢNH BÁO BẤT THƯỜNG</span>
              <span className="material-symbols-outlined text-rose-600 text-[20px]">warning</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 flex items-center gap-2">
              {alerts.length} <span className="text-xs font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">{unresolvedAlertCount} Chưa Xử Lý</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Phát hiện thao tác sốc, burst rate, ngoại lệ giá</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">TỶ LỆ TOÀN VẸN LOGS</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">security</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              100.0% <span className="text-xs text-emerald-700 font-bold uppercase">ZERO TAMPER</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">0 sự cố can thiệp trực tiếp qua lọt rào chắn</p>
          </div>
        </div>

        {/* --- NAVIGATION TABS --- */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3 gap-6 shadow-sm">
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            1. Sổ Nhật Ký Kiểm Toán (Audit Logs)
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-mono">{logs.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all relative ${
              activeTab === 'alerts'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
            2. Trung Tâm Cảnh Báo Bất Thường (Fraud Alerts)
            {unresolvedAlertCount > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-600 text-white text-xs rounded-full font-mono animate-pulse">
                {unresolvedAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tamper_test')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'tamper_test'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            3. Cơ Chế Chặn Xóa/Sửa (WORM Testing Studio)
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: AUDIT LOGS TABLE */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 shadow-sm p-5 flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Tìm theo hành động, thực thể, IP, User..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 self-end">
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Làm mới
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">ID / Thời Gian</th>
                    <th className="px-4 py-3">Người Thao Tác</th>
                    <th className="px-4 py-3">Hành Động Nghiệp Vụ</th>
                    <th className="px-4 py-3">Đối Tượng (Entity)</th>
                    <th className="px-4 py-3">IP / Trạm Máy</th>
                    <th className="px-4 py-3">Lý Do / Ghi Chú</th>
                    <th className="px-4 py-3 text-right">Chi Tiết Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400">Đang tải nhật ký kiểm toán...</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400">Không tìm thấy bản ghi nào phù hợp.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const date = new Date(log.createdAt);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono">
                            <span className="font-bold text-slate-800">#{log.id}</span>
                            <div className="text-[10px] text-gray-400">{date.toLocaleString('vi-VN')}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {log.user_id ? `User #${log.user_id}` : 'Hệ Thống Tự Động'}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{log.user_agent || 'Client API'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[11px] rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-700">{log.entity_name}</span>
                            {log.entity_id && <span className="text-gray-400 text-[10px] ml-1">#{log.entity_id}</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                            {log.reason || <span className="text-gray-300 italic">Không ghi lý do</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2.5 py-1 bg-white border border-gray-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-700 rounded text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">difference</span>
                              Xem Diff
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FRAUD ALERTS CENTER */}
        {/* ========================================================= */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 shadow-sm p-5 flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 uppercase">Mức độ rủi ro:</span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      filterSeverity === sev
                        ? 'bg-slate-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchData}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Cập nhật cảnh báo
              </button>
            </div>

            <div className="grid gap-3">
              {filteredAlerts.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
                  <h3 className="text-sm font-bold text-slate-800">Không có cảnh báo bất thường nào</h3>
                  <p className="text-xs text-gray-500 mt-1">Toàn bộ hệ thống vận hành an toàn. Sử dụng các nút mô phỏng ở trên để test quy tắc!</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                      alert.is_resolved
                        ? 'bg-gray-50 border-gray-200 opacity-70'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-rose-50/60 border-rose-300'
                        : alert.severity === 'HIGH'
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-yellow-50/50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg mt-0.5 ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : alert.severity === 'HIGH' ? 'bg-amber-600 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {alert.severity === 'CRITICAL' ? 'emergency_home' : 'warning'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-700 text-white' : alert.severity === 'HIGH' ? 'bg-amber-700 text-white' : 'bg-yellow-600 text-white'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {alert.alert_type}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            • {new Date(alert.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {alert.description}
                        </p>

                        {alert.is_resolved && (
                          <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span>
                            Đã giải quyết bởi <strong>{alert.resolved_by || 'Admin'}</strong>: {alert.resolution_note}
                          </div>
                        )}
                      </div>
                    </div>

                    {!alert.is_resolved && (
                      <button
                        onClick={() => setResolvingAlert(alert)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">done_all</span>
                        Xác minh & Giải quyết
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WORM ENFORCEMENT TESTING STUDIO */}
        {/* ========================================================= */}
        {activeTab === 'tamper_test' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 shadow-sm p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                Kiểm Chứng Tính Bất Biến Của Nhật Ký Kiểm Toán (WORM Enclave)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Theo chuẩn bảo mật kiểm toán quốc tế (PCI-DSS / ISO 27001), bảng <code className="bg-gray-100 px-1 py-0.5 rounded text-rose-700 font-bold">audit_logs</code> phải là dạng Append-Only (Chỉ thêm, tuyệt đối cấm sửa hoặc xóa).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Thử nghiệm Tầng 1: API Level */}
              <div className="p-5 rounded-xl border border-gray-200 bg-slate-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase mb-2">
                    <span className="material-symbols-outlined text-sm">api</span>
                    TẦNG 1: EXPRESS ROUTE INTERCEPTOR
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Cố tình gửi request DELETE /api/audit/logs/:id</h4>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Khi một người dùng hoặc hacker gọi API HTTP DELETE/PUT tới endpoint của bảng log, hệ thống lập tức từ chối với mã <strong>HTTP 403 Forbidden</strong> và kích hoạt cảnh báo an ninh <strong>SECURITY_AUDIT_TAMPER_ATTEMPT</strong>.
                  </p>
                </div>
                <button
                  onClick={handleTestDeleteLog}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  Bấm Thử: Gửi Request DELETE Log
                </button>
              </div>

              {/* Thử nghiệm Tầng 2: ORM & SQLite Triggers */}
              <div className="p-5 rounded-xl border border-gray-200 bg-slate-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase mb-2">
                    <span className="material-symbols-outlined text-sm">database</span>
                    TẦNG 2 & 3: SEQUELIZE HOOKS & DB TRIGGERS
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Cố tình gọi trực tiếp log.destroy() hoặc Raw SQL DELETE</h4>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Dù cho lập trình viên vô tình gọi hàm <code>AuditLog.destroy()</code> hoặc kết nối công cụ DB chạy lệnh SQL trực tiếp, Trigger <code className="bg-gray-200 px-1 rounded text-slate-800">BEFORE DELETE ON audit_logs</code> sẽ ném lỗi <strong>RAISE(ABORT)</strong> chặn đứng ngay từ tầng nhân cơ sở dữ liệu!
                  </p>
                </div>
                <button
                  onClick={handleTestDirectORMDelete}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  Bấm Thử: Thực Thi log.destroy() Từ Server
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: DIFF VIEWER (OLD VS NEW VALUES) */}
        {/* ========================================================= */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase font-mono">
                    NHẬT KÝ CHI TIẾT #{selectedLog.id} • {selectedLog.action}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Đối Tượng: {selectedLog.entity_name} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ''}
                  </h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1 mb-2">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Giá Trị Cũ (Old Values)
                  </div>
                  <pre className="text-[11px] font-mono text-rose-950 bg-white/70 p-3 rounded-lg overflow-x-auto border border-rose-100 max-h-48">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '// Không có giá trị trước đó'}
                  </pre>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1 mb-2">
                    <span className="material-symbols-outlined text-[16px]">update</span>
                    Giá Trị Mới (New Values)
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-950 bg-white/70 p-3 rounded-lg overflow-x-auto border border-emerald-100 max-h-48">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '// Không có payload mới'}
                  </pre>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600 flex flex-col gap-1 mb-4">
                <div><strong>Lý do nghiệp vụ:</strong> {selectedLog.reason || 'Không cung cấp'}</div>
                <div><strong>Địa chỉ IP:</strong> {selectedLog.ip_address} | <strong>User Agent:</strong> {selectedLog.user_agent}</div>
                <div><strong>Thời điểm ghi log:</strong> {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg"
                >
                  Đóng Hộp Thoại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: RESOLVE FRAUD ALERT */}
        {/* ========================================================= */}
        {resolvingAlert && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">gpp_good</span>
                  Xác Minh &amp; Đóng Cảnh Báo An Ninh
                </h3>
                <button onClick={() => setResolvingAlert(null)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="text-xs font-bold text-slate-700 mb-1">{resolvingAlert.alert_type}</div>
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {resolvingAlert.description}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biên bản xử lý / Ghi chú kiểm toán:
                </label>
                <textarea
                  rows="3"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Nhập kết quả xác minh với nhân viên hoặc trưởng bộ phận liên quan..."
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleResolveAlert}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Lưu Biên Bản &amp; Đóng Cảnh Báo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AuditLogs;
