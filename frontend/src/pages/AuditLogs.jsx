import React, { useState, useEffect } from 'react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(true);

  // Note: Adjust the base URL if needed based on the proxy config
  const API_BASE = 'http://localhost:5000/api/audit';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/logs`),
        fetch(`${API_BASE}/alerts`),
      ]);
      const logsData = await logsRes.json();
      const alertsData = await alertsRes.json();

      if (logsData.success) setLogs(logsData.data);
      if (alertsData.success) setAlerts(alertsData.data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === id ? { ...alert, is_resolved: true } : alert
          )
        );
      }
    } catch (error) {
      console.error('Lỗi khi resolve alert:', error);
    }
  };

  const testSensitiveAction = async () => {
    try {
      await fetch(`${API_BASE}/test-sensitive-action/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 1200000, reason: 'Test từ frontend' }),
      });
      fetchData();
    } catch (error) {
      console.error('Lỗi test:', error);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'UPDATE_ROOM_PRICE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE_BILL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCEL_ORDER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white shadow-red-500/50 shadow-sm';
      case 'HIGH':
        return 'bg-orange-500 text-white shadow-orange-500/50 shadow-sm';
      case 'MEDIUM':
        return 'bg-yellow-400 text-black shadow-yellow-500/50 shadow-sm';
      case 'LOW':
        return 'bg-blue-400 text-white shadow-blue-500/50 shadow-sm';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            Kiểm soát nội bộ
          </h1>
          <p className="text-slate-500">
            Giám sát hành vi nhạy cảm & Cảnh báo gian lận
          </p>
        </div>
        <button
          onClick={testSensitiveAction}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Mô phỏng hành vi nhạy cảm
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-px">
        <button
          className={`pb-4 px-2 text-sm font-semibold transition-all relative ${
            activeTab === 'logs'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          Nhật ký hệ thống ({logs.length})
          {activeTab === 'logs' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-md"></div>
          )}
        </button>
        <button
          className={`pb-4 px-2 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'text-rose-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('alerts')}
        >
          Cảnh báo bất thường ({alerts.length})
          {alerts.some(a => !a.is_resolved) && (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
          {activeTab === 'alerts' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-600 rounded-t-md"></div>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'logs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium">Thời gian</th>
                    <th className="p-4 font-medium">User ID</th>
                    <th className="p-4 font-medium">Hành động</th>
                    <th className="p-4 font-medium">Đối tượng</th>
                    <th className="p-4 font-medium">Lý do</th>
                    <th className="p-4 font-medium text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">Chưa có nhật ký nào.</td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {log.user_id ? `User #${log.user_id}` : 'System/Guest'}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {log.entity_name} {log.entity_id ? `(#${log.entity_id})` : ''}
                      </td>
                      <td className="p-4 text-sm text-slate-600 max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline"
                          onClick={() => alert(`Cũ: ${JSON.stringify(log.old_values)}\nMới: ${JSON.stringify(log.new_values)}`)}
                        >
                          Xem Data
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="p-4 grid gap-4 md:grid-cols-2">
              {alerts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500">Tuyệt vời! Không có cảnh báo gian lận nào.</div>
              ) : alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-5 rounded-xl border transition-all ${
                    alert.is_resolved 
                      ? 'bg-slate-50 border-slate-200 opacity-60' 
                      : 'bg-white border-rose-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(alert.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{alert.alert_type}</h3>
                  <p className="text-sm text-slate-600 mb-4">{alert.description}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-500">
                      Target User: #{alert.user_id || 'N/A'}
                    </span>
                    {alert.is_resolved ? (
                      <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Đã xử lý
                      </span>
                    ) : (
                      <button 
                        onClick={() => resolveAlert(alert.id)}
                        className="text-sm font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded transition-colors"
                      >
                        Đánh dấu đã xử lý
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
