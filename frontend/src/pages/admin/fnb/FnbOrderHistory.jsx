import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../../components/admin/layout/AdminLayout";

const API = "http://localhost:5000/api/v1/fnb-orders/history";

const STATUS_LABEL = {
  Pending:    { label: "Đang chờ",     color: "bg-amber-100 text-amber-800" },
  Confirmed:  { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  Preparing:  { label: "Đang làm",    color: "bg-indigo-100 text-indigo-700" },
  Ready:      { label: "Sẵn sàng",    color: "bg-emerald-100 text-emerald-700" },
  Delivering: { label: "Đang giao",   color: "bg-cyan-100 text-cyan-700" },
  Served:     { label: "Đã phục vụ",  color: "bg-teal-100 text-teal-700" },
  Delivered:  { label: "Đã giao",     color: "bg-green-100 text-green-700" },
  Cancelled:  { label: "Đã huỷ",      color: "bg-red-100 text-red-600" },
};

const PAY_LABEL = {
  RoomInvoice: "Gộp hoá đơn phòng",
  PayNow:      "Thanh toán ngay",
};

function fmt(n) {
  return Number(n).toLocaleString("vi-VN") + " đ";
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function SummaryCards({ summary }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="rounded-xl bg-white shadow-sm p-4 flex flex-col gap-2 border border-slate-100">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Tổng đơn (không huỷ)</span>
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">receipt_long</span>
        </div>
        <div className="text-3xl font-bold font-mono text-slate-800">{summary.totalOrders}</div>
        <div className="text-xs text-slate-400">
          {summary.cancelledCount > 0 && <span className="text-red-400">{summary.cancelledCount} đơn đã huỷ (không tính)</span>}
        </div>
      </div>
      <div className="rounded-xl bg-white shadow-sm p-4 flex flex-col gap-2 border border-slate-100">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Tổng doanh thu F&B</span>
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">payments</span>
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-600">{fmt(summary.totalRevenue)}</div>
        <div className="text-xs text-slate-400">Đã loại trừ đơn Cancelled</div>
      </div>
      <div className="rounded-xl bg-white shadow-sm p-4 flex flex-col gap-2 border border-slate-100">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Khoảng thời gian</span>
          <span className="material-symbols-outlined text-slate-400 text-[20px]">date_range</span>
        </div>
        <div className="text-base font-semibold text-slate-700">{summary.fromDate} → {summary.toDate}</div>
        <div className="text-xs text-slate-400">Lọc theo ngày đặt món</div>
      </div>
    </div>
  );
}

function FilterBar({ filters, onChange, onApply, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Từ ngày</label>
        <input type="date" value={filters.fromDate} onChange={e => onChange("fromDate", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đến ngày</label>
        <input type="date" value={filters.toDate} onChange={e => onChange("toDate", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</label>
        <select value={filters.status} onChange={e => onChange("status", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Tất cả</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hình thức TT</label>
        <select value={filters.paymentMode} onChange={e => onChange("paymentMode", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Tất cả</option>
          <option value="RoomInvoice">Gộp hoá đơn phòng</option>
          <option value="PayNow">Thanh toán ngay</option>
        </select>
      </div>
      <button onClick={onApply} disabled={loading}
        className="ml-auto flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow disabled:opacity-60">
        <span className="material-symbols-outlined text-[18px]">filter_list</span>
        {loading ? "Đang tải..." : "Lọc"}
      </button>
    </div>
  );
}

function StaffTable({ orders }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Mã đơn</th>
              <th className="py-3 px-4">Phòng / Bàn</th>
              <th className="py-3 px-4">Món (tóm tắt)</th>
              <th className="py-3 px-4 text-right">Tổng tiền</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4">Hình thức TT</th>
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map(o => {
              const s = STATUS_LABEL[o.status] || { label: o.status, color: "bg-slate-100 text-slate-600" };
              const itemSummary = o.items?.slice(0, 2).map(i => i.itemName + " ×" + i.quantity).join(", ")
                + (o.items?.length > 2 ? " +" + (o.items.length - 2) + " món" : "");
              const isOpen = expanded === o.foodOrderId;
              return (
                <React.Fragment key={o.foodOrderId}>
                  <tr className={"hover:bg-slate-50 transition-colors cursor-pointer" + (isOpen ? " bg-emerald-50" : "")}
                    onClick={() => setExpanded(isOpen ? null : o.foodOrderId)}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">#{o.foodOrderId}</td>
                    <td className="py-3 px-4 text-slate-600">{o.roomNumber || "—"}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{itemSummary || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{fmt(o.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + s.color}>{s.label}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{PAY_LABEL[o.paymentMode] || o.paymentMode}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(o.orderTime)}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="material-symbols-outlined text-[18px]">{isOpen ? "expand_less" : "expand_more"}</span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-emerald-50/60">
                      <td colSpan={8} className="px-6 pb-4 pt-2">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chi tiết món ăn</div>
                          {(o.items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm text-slate-700 bg-white rounded-lg px-4 py-2 border border-slate-100">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500">restaurant_menu</span>
                                <span className="font-medium">{item.itemName}</span>
                                <span className="text-slate-400">×{item.quantity}</span>
                                {item.note && <span className="text-xs italic text-slate-400">({item.note})</span>}
                              </div>
                              <span className="font-mono text-emerald-700 font-semibold">{fmt(item.totalPrice)}</span>
                            </div>
                          ))}
                          {o.note && <div className="text-xs text-slate-500 mt-1"><span className="font-semibold">Ghi chú:</span> {o.note}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GuestTimeline({ orders }) {
  return (
    <div className="flex flex-col gap-0">
      {orders.map((o, idx) => {
        const s = STATUS_LABEL[o.status] || { label: o.status, color: "bg-slate-100 text-slate-600" };
        const isDone = o.status === "Served" || o.status === "Delivered";
        const isCancelled = o.status === "Cancelled";
        return (
          <div key={o.foodOrderId} className="relative pl-10 pb-6">
            {idx < orders.length - 1 && <div className="absolute left-[15px] top-7 bottom-0 w-px bg-slate-200" />}
            <div className={"absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border-2 border-white " +
              (isCancelled ? "bg-red-100" : isDone ? "bg-emerald-100" : "bg-slate-100")}>
              <span className={"material-symbols-outlined text-[16px] " + (isCancelled ? "text-red-400" : isDone ? "text-emerald-600" : "text-slate-400")}>
                {isCancelled ? "cancel" : isDone ? "check_circle" : "restaurant"}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">#{o.foodOrderId}</span>
                    <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + s.color}>{s.label}</span>
                    {o.roomNumber && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{o.roomNumber}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-2 mt-1">
                    {(o.items || []).map((item, i) => (
                      <span key={i} className="text-sm text-slate-700">
                        <span className="font-medium">{item.itemName}</span>
                        <span className="text-slate-400"> ×{item.quantity}</span>
                        {i < o.items.length - 1 && <span className="text-slate-300 mx-1">•</span>}
                      </span>
                    ))}
                  </div>
                  {o.note && <div className="text-xs italic text-slate-400 mt-1">{o.note}</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="font-mono font-bold text-emerald-700 text-base">{fmt(o.totalAmount)}</div>
                  <div className="text-xs text-slate-400">{PAY_LABEL[o.paymentMode] || ""}</div>
                  <div className="text-xs text-slate-400">{fmtDate(o.orderTime)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function defaultFromDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

export default function FnbOrderHistory() {
  const [orders, setOrders]     = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [emptyMsg, setEmptyMsg] = useState("");
  
  // Chế độ xem: 'staff' (Màn hình 1: Nhân viên) hoặc 'guest' (Màn hình 2: Khách hàng)
  const isGuestPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/fnb/history');
  const [activeTab, setActiveTab] = useState(isGuestPath ? "guest" : "staff");
  
  const [filters, setFilters]   = useState({
    fromDate: defaultFromDateStr(),
    toDate: todayStr(),
    status: "",
    paymentMode: ""
  });

  const fetchOrders = useCallback(async (tabToFetch = activeTab) => {
    setLoading(true); setError(""); setEmptyMsg("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (tabToFetch === "guest") {
        params.set("view", "guest");
      } else {
        params.set("view", "staff");
        if (filters.fromDate)    params.set("fromDate",    filters.fromDate);
        if (filters.toDate)      params.set("toDate",      filters.toDate);
        if (filters.status)      params.set("status",      filters.status);
        if (filters.paymentMode) params.set("paymentMode", filters.paymentMode);
      }

      const headers = {};
      if (token) headers["Authorization"] = "Bearer " + token;
      
      const res = await fetch(API + "?" + params.toString(), { headers });
      const json = await res.json();
      
      if (!res.ok) {
        setError(json.message || "Không thể tải lịch sử gọi món.");
        return;
      }
      
      if (!json.data?.length) {
        setEmptyMsg(json.message || (tabToFetch === "staff"
          ? "Không có đơn món ăn nào trong khoảng thời gian đã chọn."
          : "Bạn chưa có đơn món ăn nào."));
        setOrders([]);
        setSummary(null);
      } else {
        setOrders(json.data);
        setSummary(json.summary || null);
      }
    } catch {
      setError("Không thể kết nối đến máy chủ Backend.");
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab]); // eslint-disable-line

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    fetchOrders(newTab);
  };

  const isStaff = activeTab === "staff";

  return (
    <AdminLayout>
      <div className="w-full pb-12 space-y-6">
        {/* Top Header & Command Ribbon */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-white text-[22px]">restaurant</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                    PHÂN HỆ 30: KẾ TOÁN ẨM THỰC & BẾP TRƯỞNG
                  </span>
                  <span className="text-xs text-slate-400 font-mono">// TERMINAL F&B-AUDIT</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight mt-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Phân Tích Doanh Thu F&B, Định Mức Food Cost & Danh Sách Đơn Hàng
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">table_view</span>
                Xuất Báo Cáo P&L (Excel)
              </button>
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                title="Tải lại dữ liệu từ DB"
              >
                <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                  refresh
                </span>
                Làm mới DB
              </button>
            </div>
          </div>
        </div>

        {/* Info Callout */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 mb-5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">database</span>
            <span>
              <strong>Dữ liệu thực tế:</strong> Đang kết nối trực tiếp MySQL <code>hotel_management</code> ({orders.length} đơn hàng được nạp từ cơ sở dữ liệu).
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700/80">
            Trang dành riêng cho Quản lý & Kế toán F&B (Khách hàng xem tại /fnb/history)
          </span>
        </div>

        {/* Main Content */}
        <SummaryCards summary={summary} />
        
        <FilterBar
          filters={filters}
          onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
          onApply={() => fetchOrders("staff")}
          loading={loading}
        />

        {/* Thông báo lỗi */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-5">
            <span className="material-symbols-outlined text-[22px]">error</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Hiệu ứng loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl animate-pulse shadow-sm" />
            ))}
          </div>
        )}

        {/* Trường hợp không có dữ liệu */}
        {!loading && !error && emptyMsg && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 py-20 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-slate-400">restaurant_menu</span>
            </div>
            <p className="text-base font-medium text-slate-600">{emptyMsg}</p>
          </div>
        )}

        {/* Danh sách hiển thị bảng đơn hàng F&B */}
        {!loading && !error && orders.length > 0 && (
          <StaffTable orders={orders} />
        )}
      </div>
    </AdminLayout>
  );
}
