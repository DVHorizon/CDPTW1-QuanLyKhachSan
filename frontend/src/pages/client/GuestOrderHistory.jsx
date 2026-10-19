import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api/v1/fnb-orders/history?view=guest";

const STATUS_CONFIG = {
  Pending:    { label: "Đang chờ xác nhận",  color: "bg-amber-50 text-amber-700 border-amber-200",  icon: "pending" },
  Confirmed:  { label: "Đã xác nhận",       color: "bg-blue-50 text-blue-700 border-blue-200",    icon: "check_circle" },
  Preparing:  { label: "Bếp đang chế biến",   color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "soup_kitchen" },
  Ready:      { label: "Món đã sẵn sàng",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "restaurant" },
  Delivering: { label: "Đang giao lên phòng", color: "bg-cyan-50 text-cyan-700 border-cyan-200",   icon: "local_shipping" },
  Served:     { label: "Đã phục vụ",        color: "bg-teal-50 text-teal-700 border-teal-200",    icon: "done_all" },
  Delivered:  { label: "Đã giao thành công", color: "bg-green-50 text-green-700 border-green-200",  icon: "task_alt" },
  Cancelled:  { label: "Đơn đã huỷ",        color: "bg-red-50 text-red-600 border-red-200",      icon: "cancel" },
};

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN") + " đ";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function GuestOrderHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGuestOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("hotel_token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Lấy user id từ context trực tiếp từ database
      let url = API;
      if (user?.userId || user?.id || user?.UserId) {
        url += `&userId=${user.userId || user.id || user.UserId}`;
      }

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Không thể tải lịch sử gọi món.");
      } else {
        setOrders(json.data || []);
      }
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestOrders();
  }, []);

  const totalSpent = orders.reduce((sum, o) => sum + (o.status !== "Cancelled" ? Number(o.totalAmount || 0) : 0), 0);

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#fafaf8] py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-5xl mx-auto">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#b9a277] mb-1">
                  <span className="material-symbols-outlined text-[18px]">room_service</span>
                  Phục Vụ Ẩm Thực Tại Phòng • In-Room Dining
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Lịch Sử Gọi Món Của Quý Khách
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Theo dõi trạng thái các đơn ẩm thực và hóa đơn Room Service tại phòng nghỉ dưỡng của quý khách.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/room-service")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                  Gọi món mới
                </button>
                <button
                  onClick={fetchGuestOrders}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Tải lại"
                >
                  <span className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin text-emerald-600" : ""}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* Guest Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div className="bg-[#fbfbf9] rounded-xl p-4 border border-slate-100">
                <div className="text-xs text-slate-400 font-medium uppercase">Phòng lưu trú</div>
                <div className="text-xl font-bold text-slate-800 mt-0.5">Phòng Deluxe #804</div>
                <div className="text-xs text-emerald-600 font-medium mt-1">Trạng thái: Đang lưu trú (In-House)</div>
              </div>
              <div className="bg-[#fbfbf9] rounded-xl p-4 border border-slate-100">
                <div className="text-xs text-slate-400 font-medium uppercase">Tổng số đơn ẩm thực</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">{orders.length} đơn</div>
                <div className="text-xs text-slate-500 mt-1">Đã ghi nhận vào hồ sơ phòng</div>
              </div>
              <div className="bg-[#fbfbf9] rounded-xl p-4 border border-slate-100">
                <div className="text-xs text-slate-400 font-medium uppercase">Tổng chi tiêu F&B</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{fmt(totalSpent)}</div>
                <div className="text-xs text-slate-500 mt-1">Tự động gộp vào hóa đơn trả phòng</div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200/80 animate-pulse p-6" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center my-6">
              <span className="material-symbols-outlined text-[32px] text-red-500 mb-2">error</span>
              <p className="font-medium">{error}</p>
              <button
                onClick={fetchGuestOrders}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && orders.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center my-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">receipt_long</span>
              </div>
              <h3 className="text-lg font-bold text-slate-700">Quý khách chưa có đơn gọi món nào</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Khám phá thực đơn Room Service thượng hạng của Grand Horizon và đặt món ngay đến tận phòng nghỉ.
              </p>
              <button
                onClick={() => navigate("/room-service")}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                Khám phá thực đơn
              </button>
            </div>
          )}

          {/* Orders Timeline List */}
          {!loading && !error && orders.length > 0 && (
            <div className="space-y-5">
              {orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || {
                  label: order.status,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                  icon: "info",
                };

                return (
                  <div
                    key={order.foodOrderId}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Order Header */}
                    <div className="bg-slate-50/60 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-800 text-base">
                          #{order.foodOrderId}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400">• {fmtDate(order.orderTime)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Tổng thanh toán</span>
                        <span className="text-lg font-bold font-mono text-emerald-700">
                          {fmt(order.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-6">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Món ăn đã chọn ({order.items?.length || 0})
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <span className="material-symbols-outlined text-[20px]">restaurant</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>Số lượng: <strong className="text-slate-600">x{item.quantity}</strong></span>
                                  {item.note && (
                                    <span className="text-amber-600 italic truncate">Ghi chú: {item.note}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="font-mono font-semibold text-sm text-slate-700 text-right flex-shrink-0">
                              {fmt(item.totalPrice)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                        <div>
                          Hình thức thanh toán: <strong className="text-slate-700">
                            {order.paymentMode === "RoomInvoice" ? "Gộp vào hoá đơn phòng" : "Thanh toán ngay"}
                          </strong>
                        </div>
                        {order.note && (
                          <div className="italic text-slate-400">
                            Yêu cầu đặc biệt: {order.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
