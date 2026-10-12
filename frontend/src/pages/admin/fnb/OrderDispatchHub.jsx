import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../../../components/admin/layout/AdminLayout";

/**
 * FEAT-FNB-06 (Mã truy vết: A4.6)
 * TÍNH NĂNG 6: THEO DÕI TRẠNG THÁI ĐƠN MÓN REAL-TIME BẰNG WEBSOCKET
 *
 * Chuỗi trạng thái chuẩn theo mô tả đặc tả:
 * 1. Chờ xác nhận (Pending / Confirmed)
 * 2. Bếp nấu (Preparing)
 * 3. Đang giao (Ready / Delivering)
 * 4. Đã phục vụ (Served / Delivered)
 *
 * Quy tắc nghiệp vụ:
 * - Khi server phát sự kiện mới, client cập nhật không cần refresh.
 * - Client chỉ hiển thị trạng thái do server xác nhận (không tự đổi trạng thái phía client).
 * - Khi mất WebSocket, hiển thị cảnh báo kết nối.
 * - Khi kết nối lại, lấy Status hiện tại từ server và đồng bộ.
 * Hỗ trợ:
 * - Thu gọn danh sách (giới hạn 3 đơn gần nhất mỗi cột)
 * - Nút "Xem tất cả" mở Modal xem toàn bộ danh sách đơn của từng giai đoạn hoặc tất cả giai đoạn.
 */

const OrderDispatchHub = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionNotice, setActionNotice] = useState(null);

  // Modal xem tất cả
  const [allOrdersModal, setAllOrdersModal] = useState({
    isOpen: false,
    stageTitle: "",
    orders: [],
    stageKey: ""
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const alertSound = useRef(new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"));

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // 1. Fetch Status hiện tại từ server (REST API)
  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/fnb-orders/track/hub");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        setErrorMessage("Không thể cập nhật trạng thái đơn.");
      }
    } catch (err) {
      setErrorMessage("Không thể kết nối đến hệ thống theo dõi trạng thái đơn.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Thiết lập kết nối WebSocket Real-Time
  const setupWebSocket = () => {
    try {
      const socket = new WebSocket("ws://localhost:5000/ws/fnb-orders");
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        setErrorMessage("");
        fetchOrders();
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ORDER_STATUS_CHANGED" && msg.data) {
            const updated = msg.data;
            try { alertSound.current.play(); } catch (e) { }

            setOrders((prev) => {
              const existingIdx = prev.findIndex((o) => o.foodOrderId === updated.foodOrderId);
              if (existingIdx !== -1) {
                const nextList = [...prev];
                nextList[existingIdx] = {
                  ...nextList[existingIdx],
                  status: updated.status,
                  orderTime: updated.orderTime || nextList[existingIdx].orderTime
                };
                return nextList;
              } else {
                return [
                  {
                    foodOrderId: updated.foodOrderId,
                    status: updated.status,
                    orderTime: updated.orderTime,
                    roomNumber: updated.roomNumber || "N/A",
                    totalAmount: updated.totalAmount || 0,
                    items: []
                  },
                  ...prev
                ];
              }
            });

            // Cập nhật modal nếu đang mở
            setAllOrdersModal((prev) => {
              if (!prev.isOpen) return prev;
              const nextOrders = prev.orders.map(o =>
                o.foodOrderId === updated.foodOrderId ? { ...o, status: updated.status } : o
              );
              return { ...prev, orders: nextOrders };
            });

            showNotice(`Đơn #${updated.foodOrderId} vừa cập nhật trạng thái: ${updated.status}`);
          }
        } catch (e) {
          console.error("Lỗi parse WS:", e);
        }
      };

      socket.onerror = () => {
        setWsConnected(false);
        setErrorMessage("Không thể kết nối đến hệ thống theo dõi trạng thái đơn.");
      };

      socket.onclose = () => {
        setWsConnected(false);
        setErrorMessage("Không thể kết nối đến hệ thống theo dõi trạng thái đơn.");
        reconnectTimeoutRef.current = setTimeout(() => {
          setupWebSocket();
        }, 4000);
      };
    } catch (err) {
      setWsConnected(false);
      setErrorMessage("Không thể kết nối đến hệ thống theo dõi trạng thái đơn.");
    }
  };

  useEffect(() => {
    fetchOrders();
    setupWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Cập nhật trạng thái chuyển giao qua Server
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/fnb-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage("Không thể cập nhật trạng thái đơn.");
      } else {
        showNotice(`Đã chuyển đơn #${orderId} sang trạng thái: ${newStatus}`);
      }
    } catch (e) {
      setErrorMessage("Không thể cập nhật trạng thái đơn.");
    }
  };

  // Phân nhóm đơn theo 4 giai đoạn
  const stage1Orders = orders.filter((o) => o.status === "Pending" || o.status === "Confirmed");
  const stage2Orders = orders.filter((o) => o.status === "Preparing");
  const stage3Orders = orders.filter((o) => o.status === "Ready" || o.status === "Delivering");
  const stage4Orders = orders.filter((o) => o.status === "Served" || o.status === "Delivered");

  // Mở modal xem tất cả
  const openViewAllModal = (stageTitle, list, stageKey) => {
    setAllOrdersModal({
      isOpen: true,
      stageTitle,
      orders: list,
      stageKey
    });
  };

  const closeViewAllModal = () => {
    setAllOrdersModal({
      isOpen: false,
      stageTitle: "",
      orders: [],
      stageKey: ""
    });
  };

  // Render thẻ Order Card
  const renderOrderCard = (order, stageIndex) => {
    return (
      <div
        key={order.foodOrderId}
        className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container-high/40 hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${stageIndex === 1
            ? "bg-outline"
            : stageIndex === 2
              ? "bg-secondary"
              : stageIndex === 3
                ? "bg-tertiary"
                : "bg-primary"
            }`}
        ></div>

        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
              Mã Đơn: #{order.foodOrderId}
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
              {order.roomNumber ? `Phòng ${order.roomNumber}` : "Khách Vãng Lai"}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-label-sm font-label-sm font-bold ${stageIndex === 1
              ? "bg-surface-container text-on-surface-variant"
              : stageIndex === 2
                ? "bg-secondary/15 text-secondary"
                : stageIndex === 3
                  ? "bg-tertiary-container/20 text-tertiary animate-pulse"
                  : "bg-primary/10 text-primary"
              }`}
          >
            {stageIndex === 1
              ? "Chờ xác nhận"
              : stageIndex === 2
                ? "Bếp nấu"
                : stageIndex === 3
                  ? "Đang giao"
                  : "Đã phục vụ"}
          </span>
        </div>

        <div className="text-body-sm text-on-surface-variant flex items-center justify-between">
          <span>Thời điểm đặt:</span>
          <span className="font-medium text-on-surface">
            {order.orderTime ? new Date(order.orderTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
          </span>
        </div>

        <div className="bg-surface-container-low p-space-sm rounded text-body-sm font-body-sm text-on-surface flex flex-col gap-1 max-h-24 overflow-y-auto">
          <span className="font-semibold text-label-sm text-on-surface">Món đã gọi:</span>
          <p className="text-on-surface-variant leading-relaxed text-xs">
            {order.items?.map((i) => `${i.quantity}x ${i.itemName}`).join(", ") || "Xem chi tiết món..."}
          </p>
        </div>

        <div className="flex items-center justify-between text-body-sm">
          <span className="text-outline">Tổng tiền:</span>
          <span className="font-bold text-primary">
            {Number(order.totalAmount).toLocaleString("vi-VN")} ₫
          </span>
        </div>

        {/* Nút hành động tương ứng với giai đoạn */}
        {stageIndex === 1 && (
          <button
            onClick={() => handleUpdateStatus(order.foodOrderId, "Preparing")}
            className="w-full mt-1 py-2 bg-secondary text-on-secondary rounded text-label-sm font-label-sm hover:brightness-105 transition-all flex items-center justify-center gap-1 shadow-sm font-bold cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
            BẾP XÁC NHẬN NẤU MÓN
          </button>
        )}

        {stageIndex === 2 && (
          <button
            onClick={() => handleUpdateStatus(order.foodOrderId, "Delivering")}
            className="w-full mt-1 py-2 bg-tertiary text-on-tertiary hover:brightness-105 rounded text-label-sm font-label-sm transition-all flex items-center justify-center gap-1 font-bold cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            NẤU XONG • GIAO ĐƠN HÀNG
          </button>
        )}

        {stageIndex === 3 && (
          <button
            onClick={() => handleUpdateStatus(order.foodOrderId, "Served")}
            className="w-full mt-1 py-2 bg-primary text-on-primary hover:brightness-105 rounded text-label-sm font-label-sm transition-colors flex items-center justify-center gap-1 font-bold cursor-pointer shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            KHÁCH ĐÃ NHẬN • ĐÃ PHỤC VỤ
          </button>
        )}

        {stageIndex === 4 && (
          <div className="w-full py-1.5 bg-primary/10 text-primary rounded text-label-sm font-label-sm flex items-center justify-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            HOÀN TẤT QUY TRÌNH
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased">
        {/* BANNER MẤT KẾT NỐI (TC05) */}
        {!wsConnected && (
          <div className="w-full bg-[#EF4444] text-white px-gutter-lg py-2.5 flex items-center justify-between font-bold shadow-md z-40 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">wifi_off</span>
              <span>LỖI: Không thể kết nối đến hệ thống theo dõi trạng thái đơn. (Đang kết nối lại...)</span>
            </div>
            <button
              onClick={() => setupWebSocket()}
              className="px-3 py-1 bg-white text-error rounded font-bold hover:bg-surface-variant transition-colors text-sm cursor-pointer"
              type="button"
            >
              Thử kết nối lại
            </button>
          </div>
        )}

        {/* Thông báo cập nhật trạng thái thời gian thực */}
        {actionNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-primary-container text-on-primary-container px-space-lg py-space-md rounded-xl shadow-xl flex items-center gap-2 font-bold animate-bounce border border-primary/20">
            <span className="material-symbols-outlined">notifications_active</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Header Module 33: Theo dõi & Giao món ăn */}
        <div className="px-space-xl py-space-lg bg-surface-container-lowest shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-space-md border-b border-surface-container-high/50">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="px-space-sm py-0.5 rounded text-label-sm font-label-sm bg-primary text-on-primary tracking-widest uppercase font-bold">
                MÀN HÌNH 33
              </span>
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-semibold">
                FEAT-FNB-06 • THEO DÕI TRẠNG THÁI ĐƠN MÓN REAL-TIME BẰNG WEBSOCKET
              </span>
              <span className={`inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm font-bold ${wsConnected ? 'bg-primary-container/20 text-primary' : 'bg-error/20 text-error'}`}>
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-primary animate-pulse' : 'bg-error'}`}></span>
                {wsConnected ? 'KẾT NỐI WEBSOCKET: TRỰC TIẾP' : 'MẤT KẾT NỐI WEBSOCKET'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Theo Dõi Trạng Thái &amp; Giao Món Ăn
            </h1>
          </div>

          <div className="flex items-center gap-space-sm">
            <button
              onClick={() => openViewAllModal("Tất Cả Đơn Hàng F&B", orders, "all")}
              className="px-space-md py-2 rounded-lg bg-primary text-on-primary text-label-md font-label-md font-bold shadow-sm hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>Xem Tất Cả ({orders.length} Đơn)</span>
            </button>
            <button
              onClick={() => fetchOrders()}
              className="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-md font-label-md transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Đồng Bộ</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-space-xl flex flex-col gap-space-xl">
          {/* Tóm tắt số lượng đơn theo giai đoạn */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
            <div
              onClick={() => openViewAllModal("Giai Đoạn 01: Chờ Xác Nhận", stage1Orders, "stage1")}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/40 flex items-center justify-between cursor-pointer hover:border-outline transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[24px]">pending_actions</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-semibold">Chờ xác nhận</span>
                  <span className="text-headline-md font-bold text-on-surface">{stage1Orders.length} Đơn</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
            </div>

            <div
              onClick={() => openViewAllModal("Giai Đoạn 02: Bếp Nấu", stage2Orders, "stage2")}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/40 flex items-center justify-between cursor-pointer hover:border-secondary transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[24px]">soup_kitchen</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-semibold">Bếp nấu</span>
                  <span className="text-headline-md font-bold text-secondary">{stage2Orders.length} Đơn</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
            </div>

            <div
              onClick={() => openViewAllModal("Giai Đoạn 03: Đang Giao", stage3Orders, "stage3")}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/40 flex items-center justify-between cursor-pointer hover:border-tertiary transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[24px]">delivery_dining</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-semibold">Đang giao</span>
                  <span className="text-headline-md font-bold text-tertiary">{stage3Orders.length} Đơn</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
            </div>

            <div
              onClick={() => openViewAllModal("Giai Đoạn 04: Đã Phục Vụ", stage4Orders, "stage4")}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/40 flex items-center justify-between cursor-pointer hover:border-primary transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">task_alt</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-semibold">Đã phục vụ</span>
                  <span className="text-headline-md font-bold text-primary">{stage4Orders.length} Đơn</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
            </div>
          </div>

          {/* Quy Trình 4 Giai Đoạn F&B (Hiển thị tối đa 3 đơn mỗi cột + Nút Xem tất cả) */}
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[22px]">alt_route</span>
                <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold">
                  Quy Trình 4 Giai Đoạn Theo Dõi Đơn Món
                </h2>
              </div>
              <div className="text-label-sm font-label-sm text-outline font-medium">
                Chuỗi xử lý: Chờ xác nhận → Bếp nấu → Đang giao → Đã phục vụ
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg items-start">
              {/* CỘT 1: Chờ xác nhận */}
              <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center justify-between px-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-outline"></span>
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">01. Chờ Xác Nhận</span>
                  </div>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
                    {stage1Orders.length} đơn
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant px-space-xs -mt-1">
                  Đơn vừa tạo • Chờ nhà bếp xác nhận
                </div>

                {stage1Orders.length === 0 ? (
                  <div className="py-8 text-center text-outline text-sm italic bg-surface-container-lowest/50 rounded-lg">
                    Không có đơn nào chờ xác nhận.
                  </div>
                ) : (
                  <>
                    {stage1Orders.slice(0, 3).map((order) => renderOrderCard(order, 1))}
                    {stage1Orders.length > 3 && (
                      <button
                        onClick={() => openViewAllModal("Giai Đoạn 01: Chờ Xác Nhận", stage1Orders, "stage1")}
                        className="w-full py-2.5 bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container rounded-lg text-label-sm font-bold text-on-surface transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        Xem tất cả {stage1Orders.length} đơn (+{stage1Orders.length - 3})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* CỘT 2: Bếp nấu */}
              <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center justify-between px-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">02. Bếp Nấu</span>
                  </div>
                  <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-container font-label-sm text-label-sm font-bold">
                    {stage2Orders.length} đơn
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant px-space-xs -mt-1">
                  Đầu bếp đang chế biến các line tại bếp
                </div>

                {stage2Orders.length === 0 ? (
                  <div className="py-8 text-center text-outline text-sm italic bg-surface-container-lowest/50 rounded-lg">
                    Không có đơn nào đang nấu.
                  </div>
                ) : (
                  <>
                    {stage2Orders.slice(0, 3).map((order) => renderOrderCard(order, 2))}
                    {stage2Orders.length > 3 && (
                      <button
                        onClick={() => openViewAllModal("Giai Đoạn 02: Bếp Nấu", stage2Orders, "stage2")}
                        className="w-full py-2.5 bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container rounded-lg text-label-sm font-bold text-secondary transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        Xem tất cả {stage2Orders.length} đơn (+{stage2Orders.length - 3})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* CỘT 3: Đang giao */}
              <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center justify-between px-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">03. Đang Giao</span>
                  </div>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
                    {stage3Orders.length} đơn
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant px-space-xs -mt-1">
                  Nhân viên tiếp thực đang vận chuyển lên phòng
                </div>

                {stage3Orders.length === 0 ? (
                  <div className="py-8 text-center text-outline text-sm italic bg-surface-container-lowest/50 rounded-lg">
                    Không có đơn nào đang trên đường giao.
                  </div>
                ) : (
                  <>
                    {stage3Orders.slice(0, 3).map((order) => renderOrderCard(order, 3))}
                    {stage3Orders.length > 3 && (
                      <button
                        onClick={() => openViewAllModal("Giai Đoạn 03: Đang Giao", stage3Orders, "stage3")}
                        className="w-full py-2.5 bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container rounded-lg text-label-sm font-bold text-tertiary transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        Xem tất cả {stage3Orders.length} đơn (+{stage3Orders.length - 3})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* CỘT 4: Đã phục vụ */}
              <div className="flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center justify-between px-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">04. Đã Phục Vụ</span>
                  </div>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
                    {stage4Orders.length} đơn
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-on-surface-variant px-space-xs -mt-1">
                  Đã bàn giao và khách hoàn tất dùng bữa
                </div>

                {stage4Orders.length === 0 ? (
                  <div className="py-8 text-center text-outline text-sm italic bg-surface-container-lowest/50 rounded-lg">
                    Chưa có đơn nào hoàn tất phục vụ hôm nay.
                  </div>
                ) : (
                  <>
                    {stage4Orders.slice(0, 3).map((order) => renderOrderCard(order, 4))}
                    {stage4Orders.length > 3 && (
                      <button
                        onClick={() => openViewAllModal("Giai Đoạn 04: Đã Phục Vụ", stage4Orders, "stage4")}
                        className="w-full py-2.5 bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container rounded-lg text-label-sm font-bold text-primary transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        Xem tất cả {stage4Orders.length} đơn (+{stage4Orders.length - 3})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* MODAL XEM TẤT CẢ ĐƠN HÀNG (TRÁNH BỊ DÀI MÀN HÌNH)                          */}
        {/* ========================================================================= */}
        {allOrdersModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-container-lowest w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-surface-container-highest overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-space-lg bg-surface-container-low flex items-center justify-between border-b border-surface-container-high">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                      {allOrdersModal.stageTitle}
                    </h3>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Tổng số: {allOrdersModal.orders.length} đơn hàng • Đồng bộ WebSocket Real-Time
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeViewAllModal}
                  className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body: Danh sách đơn dạng lưới gọn gàng */}
              <div className="p-space-lg overflow-y-auto max-h-[70vh]">
                {allOrdersModal.orders.length === 0 ? (
                  <div className="py-12 text-center text-outline">
                    Không có đơn nào trong danh sách này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
                    {allOrdersModal.orders.map((order) => {
                      const stageIdx =
                        order.status === "Pending" || order.status === "Confirmed"
                          ? 1
                          : order.status === "Preparing"
                            ? 2
                            : order.status === "Ready" || order.status === "Delivering"
                              ? 3
                              : 4;
                      return renderOrderCard(order, stageIdx);
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-space-md bg-surface-container-low flex items-center justify-between border-t border-surface-container-high">
                <span className="text-body-sm text-outline">
                  Nhấn vào nút hành động trên từng thẻ để cập nhật trạng thái đơn tức thì.
                </span>
                <button
                  onClick={closeViewAllModal}
                  className="px-space-lg py-2 bg-surface-container-highest hover:bg-surface-container text-on-surface rounded-lg font-bold text-label-md transition-colors cursor-pointer"
                  type="button"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OrderDispatchHub;
