import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GuestSidebar from "../../components/layout/GuestSidebar";
import GuestHeader from "../../components/layout/GuestHeader";

const API = "http://localhost:5000/api/v1/fnb-orders/history?view=guest";

const STATUS_CONFIG = {
  Pending:    { label: "Đang chờ xác nhận",  color: "bg-amber-100 text-amber-800 border-amber-300",  icon: "pending" },
  Confirmed:  { label: "Đã xác nhận",       color: "bg-blue-100 text-blue-800 border-blue-300",    icon: "check_circle" },
  Preparing:  { label: "Bếp đang chế biến",   color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: "soup_kitchen" },
  Ready:      { label: "Món đã sẵn sàng",    color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "restaurant" },
  Delivering: { label: "Đang giao lên phòng", color: "bg-cyan-100 text-cyan-800 border-cyan-300",   icon: "local_shipping" },
  Served:     { label: "Đã phục vụ",        color: "bg-teal-100 text-teal-800 border-teal-300",    icon: "done_all" },
  Delivered:  { label: "Đã giao thành công", color: "bg-green-100 text-green-800 border-green-300",  icon: "task_alt" },
  Cancelled:  { label: "Đơn đã huỷ",        color: "bg-red-100 text-red-800 border-red-300",      icon: "cancel" },
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchGuestOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("hotel_token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Lấy user id từ localStorage nếu có
      let url = API;
      try {
        const savedUser = JSON.parse(localStorage.getItem("hotel_user") || "{}");
        const uid = savedUser?.id || savedUser?.UserId || savedUser?.userId;
        if (uid) {
          url += `&userId=${uid}`;
        }
      } catch {}

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) {
        // Nếu chưa đăng nhập hoặc lỗi, xử lý thông báo nhẹ nhàng
        if (res.status === 401) {
          setError("Vui lòng đăng nhập để xem danh sách lịch sử gọi món của quý khách.");
        } else {
          setError(json.message || "Không thể tải lịch sử gọi món.");
        }
      } else {
        setOrders(json.data || []);
      }
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestOrders();
  }, []);

  const totalSpent = orders.reduce((sum, o) => sum + (o.status !== "Cancelled" ? Number(o.totalAmount || 0) : 0), 0);

  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter(o => o.status === filterStatus);

  return (
    <div className="bg-[#f4fbf4] min-h-screen text-slate-800 font-sans antialiased">
      {/* Sidebar đồng bộ hoàn toàn với Đặt Bàn */}
      <GuestSidebar />

      {/* Main Content Area */}
      <div className="pl-72">
        {/* Header trên cùng đồng bộ */}
        <GuestHeader />

        <main className="relative pt-24 px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {/* Immersive Dining Hero Section */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white">
            <div
              className="relative h-[300px] sm:h-[340px] w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCi-yZmRzW3rA99dbTUulxUSL46F4qNZcyDccM6LauKxbA3D_X4BKWiRH7LyjIxpcD01WwX9-VxJtlLoHqcAuLjU83sK319BxQn19pEcw3emqhLbDm49h75BeTG80tOGSN1jWr5-Ev4-j4Sh1UOIIF0qhC9A9x0V9-dhKr7sShAzuSa7nR4qozB3OdszP2YyoggCWKfDj_LP9olqcEorddyKDzZAHvbSNtEZnHZfBAIsqOz1S6rkOb_')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent flex flex-col justify-end p-8">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                    Ẩm Thực Phục Vụ Tại Phòng
                  </span>
                  <span className="text-emerald-100 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-cyan-300">room_service</span>
                    Phục Vụ Tận Phòng 24/7
                  </span>
                  <span className="text-white/60 text-xs">•</span>
                  <span className="text-white/90 text-xs flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-amber-300">verified</span>
                    Hồ Sơ Tiện Ích Phòng Khách Sạn
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1
                      className="text-3xl sm:text-4xl text-white font-bold tracking-tight mb-2 drop-shadow-md"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Lịch Sử Gọi Món Của Quý Khách
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base max-w-2xl drop-shadow">
                      Theo dõi trạng thái chế biến thời gian thực, tiến độ giao món đến phòng và chi tiết hóa đơn phục vụ tại phòng của quý khách.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate("/room-service")}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
                      Đặt Thêm Món
                    </button>
                    <button
                      onClick={fetchGuestOrders}
                      disabled={loading}
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                      title="Làm mới dữ liệu"
                    >
                      <span className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin text-emerald-300" : ""}`}>
                        refresh
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">hotel</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Phòng Lưu Trú</span>
                <span className="text-lg font-bold text-slate-800">Deluxe #804</span>
                <span className="text-xs text-emerald-600 block font-medium">Trạng thái: Đang lưu trú</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">receipt_long</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tổng Đơn Đã Đặt</span>
                <span className="text-lg font-bold text-slate-800 font-mono">{orders.length} Đơn hàng</span>
                <span className="text-xs text-slate-500 block">Được bảo lưu trong lịch sử hồ sơ</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">payments</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tổng Chi Tiêu Ẩm Thực</span>
                <span className="text-lg font-bold text-emerald-700 font-mono">{fmt(totalSpent)}</span>
                <span className="text-xs text-slate-500 block">Tự động gộp vào hóa đơn phòng</span>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: List of Orders */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-semibold px-2 uppercase">Lọc theo:</span>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "Pending", label: "Đang chờ" },
                    { id: "Preparing", label: "Đang chế biến" },
                    { id: "Delivering", label: "Đang giao" },
                    { id: "Delivered", label: "Đã hoàn tất" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        filterStatus === tab.id
                          ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị <strong className="text-slate-800">{filteredOrders.length}</strong> đơn
                </span>
              </div>

              {/* Error Box */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center shadow-sm">
                  <span className="material-symbols-outlined text-[36px] text-red-500 mb-2">lock</span>
                  <p className="font-semibold text-sm mb-1">{error}</p>
                  <p className="text-xs text-red-600/80 mb-4">
                    Vui lòng đăng nhập với tài khoản khách lưu trú để xem các đơn gọi món của bạn.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => navigate("/login")}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Đăng Nhập Ngay
                    </button>
                    <button
                      onClick={fetchGuestOrders}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      Thử Lại
                    </button>
                  </div>
                </div>
              )}

              {/* Loading Skeletons */}
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse p-6" />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && filteredOrders.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-[32px]">dinner_dining</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Không tìm thấy đơn gọi món nào</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                    Quý khách chưa có đơn Room Service nào trong danh mục đã chọn. Thưởng thức ngay các mỹ vị hải sản và món ngon tại phòng.
                  </p>
                  <button
                    onClick={() => navigate("/room-service")}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                  >
                    Xem Menu Room Service
                  </button>
                </div>
              )}

              {/* Orders List */}
              {!loading && !error && filteredOrders.length > 0 && (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                      icon: "info",
                    };

                    return (
                      <div
                        key={order.foodOrderId}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Order Header */}
                        <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-800 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              #{order.foodOrderId}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
                              <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              • {fmtDate(order.orderTime)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block">Tổng thanh toán</span>
                            <span className="text-base font-bold font-mono text-emerald-700">
                              {fmt(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Order Details & Items */}
                        <div className="p-6">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Danh Sách Món Đã Đặt ({order.items?.length || 0})
                          </div>

                          <div className="divide-y divide-slate-100">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">restaurant</span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-800 truncate">
                                      {item.itemName}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>Số lượng: <strong className="text-slate-700 font-mono">x{item.quantity}</strong></span>
                                      {item.note && (
                                        <span className="text-amber-700 italic truncate bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                          Ghi chú: {item.note}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="font-mono font-bold text-sm text-slate-800 text-right shrink-0">
                                  {fmt(item.totalPrice)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer Info */}
                          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-emerald-600">credit_card</span>
                              <span>Phương thức:</span>
                              <strong className="text-slate-800 font-semibold">
                                {order.paymentMode === "RoomInvoice" ? "Gộp vào hóa đơn phòng khi trả phòng" : "Thanh toán ngay"}
                              </strong>
                            </div>
                            {order.note && (
                              <div className="text-slate-500 italic">
                                Yêu cầu: <span className="text-slate-700 font-medium">"{order.note}"</span>
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

            {/* Right 4 Cols: Quick Actions & In-Room Dining Service Support Card */}
            <div className="lg:col-span-4 flex flex-col gap-5 sticky top-24">
              {/* Concierge & In-Room Service Assistance */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">support_agent</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Dịch Vụ Khách Hàng 24/7</h3>
                    <p className="text-xs text-slate-400">Bộ phận Phục Vụ Tại Phòng & Tiền Sảnh</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Quý khách muốn thay đổi khẩu vị, yêu cầu dụng cụ ăn uống riêng hoặc kiểm tra thời gian giao món cụ thể?
                </p>

                <div className="space-y-2.5">
                  <a
                    href="tel:3302"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/70 transition-all text-xs font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">call</span>
                      Gọi Phục Vụ Tại Phòng
                    </span>
                    <span className="font-mono text-emerald-700">#3302</span>
                  </a>

                  <a
                    href="tel:3300"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/70 transition-all text-xs font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">desk</span>
                      Quầy Lễ Tân Tiền Sảnh
                    </span>
                    <span className="font-mono text-emerald-700">Phím 0</span>
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => navigate("/fnb/dat-ban")}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                    Đặt Bàn Trước Tại Nhà Hàng
                  </button>
                </div>
              </div>

              {/* Chef Recommendation Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center shrink-0 shadow-sm"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDtirABJV3zkpO8gVAhEj7QxUbS9OJUtpt7mApMGy4jW2yStxs6k7R34lj07htxkEn7efrY5j7pTSwgsuxjLvastIf66yc5xsotcfcd8WUrKxQX9skHfJUUkNBfjuqbFVTH2mS67CLl02scPyJt5c_KBN9enSZN5UBSlAfXkB9-Zr3VYm0y0Hn_Oos72MAMhKHsuxcETYvmsWo0mW9EoagBflBS8DxvLwkLZUQ7DT9AJXwtNIFnFC93')",
                  }}
                ></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Bếp Trưởng Grand Horizon</span>
                  <span className="text-sm font-bold text-slate-800">Ẩm Thực Bờ Biển Đặc Tuyển</span>
                  <span className="text-xs text-slate-500">Món ăn luôn được bảo quản nhiệt độ chuẩn khi giao tận phòng</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
