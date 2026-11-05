import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import styles from "./ServiceOrdersKanban.module.css";
import {
  fetchServiceOrdersApi,
  updateServiceOrderStatusApi,
} from "../../../api/serviceApi";

const ServiceOrdersKanban = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today"
  const [toast, setToast] = useState(null);
  const [historyTab, setHistoryTab] = useState("completed"); // "completed" | "cancelled"

  // Cancel Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Quick Preset Reasons
  const PRESET_REASONS = [
    "Khách yêu cầu đổi lịch / hoãn lại",
    "Khách huỷ do bận việc đột xuất",
    "Hết kỹ thuật viên / cơ sở vật chất bảo trì",
    "Nhân viên tạo nhầm đơn",
  ];

  // Helper show Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Tải danh sách đơn dịch vụ từ backend
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetchServiceOrdersApi();
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải đơn dịch vụ:", err);
      showToast(err.message || "Không thể tải danh sách đơn dịch vụ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // Tự động làm mới mỗi 30 giây để cập nhật tiến độ
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Chuyển trạng thái đơn dịch vụ (InProgress | Completed)
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await updateServiceOrderStatusApi(orderId, { newStatus });
      if (res.success) {
        showToast(
          newStatus === "InProgress"
            ? `✓ Đơn #${orderId} đã bắt đầu thực hiện!`
            : `✓ Đơn #${orderId} đã hoàn tất phục vụ!`
        );
        loadOrders();
      } else {
        showToast(res.message || "Không thể cập nhật trạng thái", "error");
      }
    } catch (err) {
      showToast(err.message || "Lỗi khi cập nhật trạng thái đơn", "error");
    }
  };

  // 3. Mở Modal Huỷ Đơn
  const handleOpenCancelModal = (order) => {
    setCancelModalOrder(order);
    setCancelReason("");
  };

  // 4. Xác nhận Huỷ Đơn
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    const trimmed = cancelReason.trim();
    if (!trimmed || trimmed.length < 2) {
      showToast("Lý do huỷ phải có ít nhất 2 ký tự", "error");
      return;
    }
    if (trimmed.length > 500) {
      showToast("Lý do huỷ không được vượt quá 500 ký tự", "error");
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await updateServiceOrderStatusApi(cancelModalOrder.OrderId, {
        newStatus: "Cancelled",
        cancelReason: trimmed,
      });
      if (res.success) {
        showToast(`✓ Đã huỷ đơn #${cancelModalOrder.OrderId} thành công`);
        setCancelModalOrder(null);
        setCancelReason("");
        loadOrders();
      } else {
        showToast(res.message || "Không thể huỷ đơn", "error");
      }
    } catch (err) {
      showToast(err.message || "Lỗi khi huỷ đơn", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // 5. Lọc đơn theo từ khoá và ngày
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lọc theo ngày
      if (dateFilter === "today") {
        const orderDate = new Date(order.OrderDate || order.createdAt).toDateString();
        const today = new Date().toDateString();
        if (orderDate !== today) return false;
      }

      // Lọc theo từ khóa
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const serviceName = order.service?.ServiceName?.toLowerCase() || "";
      const serviceCode = order.service?.ServiceCode?.toLowerCase() || "";
      const roomNumber = String(order.stay?.Room?.RoomNumber || order.stay?.room?.RoomNumber || "").toLowerCase();
      const guestName = (
        order.stay?.Booking?.user?.FullName ||
        order.stay?.booking?.user?.FullName ||
        ""
      ).toLowerCase();
      const orderIdStr = String(order.OrderId);

      return (
        serviceName.includes(term) ||
        serviceCode.includes(term) ||
        roomNumber.includes(term) ||
        guestName.includes(term) ||
        orderIdStr.includes(term)
      );
    });
  }, [orders, searchTerm, dateFilter]);

  // 6. Phân nhóm theo 3 cột Kanban
  const receivedOrders = useMemo(
    () => filteredOrders.filter((o) => o.Status === "Received"),
    [filteredOrders]
  );

  const inProgressOrders = useMemo(
    () =>
      filteredOrders.filter(
        (o) => o.Status === "InProgress" || o.Status === "Processing"
      ),
    [filteredOrders]
  );

  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.Status === "Completed"),
    [filteredOrders]
  );

  const cancelledOrders = useMemo(
    () => filteredOrders.filter((o) => o.Status === "Cancelled"),
    [filteredOrders]
  );

  return (
    <AdminLayout>
      <div className={styles.kanbanContainer}>
        {/* Toast Thông báo */}
        {toast && (
          <div
            className={`${styles.toast} ${
              toast.type === "success" ? styles.toastSuccess : styles.toastError
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* ─── BANNER HEADER ─── */}
        <div className={styles.headerBanner}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBox}>
              <span className="material-symbols-outlined text-[28px]">
                pending_actions
              </span>
            </div>
            <div>
              <div className={styles.headerBadge}>
                <span className={styles.liveDot} />
                <span>PHÂN HỆ ĐIỀU PHỐI &amp; THEO DÕI TIẾN ĐỘ • FEAT-SERVICE-04</span>
              </div>
              <h1 className={styles.headerTitle}>
                TIẾN ĐỘ &amp; ĐIỀU PHỐI ĐƠN DỊCH VỤ (KANBAN)
              </h1>
              <div className={styles.headerSubtitle}>
                THEO DÕI VÀ CẬP NHẬT TRẠNG THÁI TIẾP NHẬN • ĐANG THỰC HIỆN • HOÀN TẤT
              </div>
            </div>
          </div>

          <div className={styles.headerRight}>
            <Link
              to="/admin/services/dispatch"
              className={styles.actionBtnPrimary}
              title="Mở màn hình tiếp nhận đặt dịch vụ mới"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Tiếp Nhận Đặt Dịch Vụ</span>
            </Link>

            <Link
              to="/admin/services"
              className={styles.actionBtnOutline}
              title="Quản lý danh mục & bảng giá dịch vụ"
            >
              <span className="material-symbols-outlined text-[16px]">spa</span>
              <span>Danh Mục Dịch Vụ</span>
            </Link>

            <button
              type="button"
              onClick={loadOrders}
              className={styles.actionBtnOutline}
              title="Tải lại danh sách"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Làm Mới</span>
            </button>
          </div>
        </div>

        {/* ─── THẺ THỐNG KÊ NHANH ─── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>Tổng Đơn Dịch Vụ</div>
              <div className={`${styles.statValue} text-slate-800`}>
                {filteredOrders.length}
              </div>
            </div>
            <div className={`${styles.statIconBox} bg-slate-100 text-slate-600`}>
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>Chờ Tiếp Nhận</div>
              <div className={`${styles.statValue} text-amber-600`}>
                {receivedOrders.length}
              </div>
            </div>
            <div className={`${styles.statIconBox} bg-amber-50 text-amber-600`}>
              <span className="material-symbols-outlined">hourglass_top</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>Đang Thực Hiện</div>
              <div className={`${styles.statValue} text-sky-600`}>
                {inProgressOrders.length}
              </div>
            </div>
            <div className={`${styles.statIconBox} bg-sky-50 text-sky-600`}>
              <span className="material-symbols-outlined">directions_run</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>Đã Hoàn Tất</div>
              <div className={`${styles.statValue} text-emerald-600`}>
                {completedOrders.length}
              </div>
            </div>
            <div className={`${styles.statIconBox} bg-emerald-50 text-emerald-600`}>
              <span className="material-symbols-outlined">task_alt</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div>
              <div className={styles.statLabel}>Đã Huỷ</div>
              <div className={`${styles.statValue} text-rose-600`}>
                {cancelledOrders.length}
              </div>
            </div>
            <div className={`${styles.statIconBox} bg-rose-50 text-rose-600`}>
              <span className="material-symbols-outlined">cancel</span>
            </div>
          </div>
        </div>

        {/* ─── THANH TÌM KIẾM & BỘ LỌC ─── */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số phòng, tên khách, dịch vụ, mã đơn..."
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thời Gian:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`text-xs font-bold px-3 py-1 rounded-md transition-all ${
                  dateFilter === "all"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Tất Cả
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("today")}
                className={`text-xs font-bold px-3 py-1 rounded-md transition-all ${
                  dateFilter === "today"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Hôm Nay
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3 CỘT KANBAN BOARD ─── */}
        <div className={styles.kanbanGrid}>
          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 1: TIẾP NHẬN YÊU CẦU (Received)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={styles.kanbanColumn}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitleBox}>
                <span className={`${styles.columnDot} bg-amber-500`} />
                <h2 className={styles.columnTitle}>1. TIẾP NHẬN YÊU CẦU</h2>
              </div>
              <span className={`${styles.columnBadge} bg-amber-100 text-amber-800`}>
                {receivedOrders.length}
              </span>
            </div>

            <div className={styles.cardsContainer}>
              {receivedOrders.length === 0 ? (
                <div className={styles.emptyColumn}>
                  <span className="material-symbols-outlined text-3xl">inbox</span>
                  <span>Không có đơn nào chờ tiếp nhận</span>
                </div>
              ) : (
                receivedOrders.map((order) => {
                  const roomNum =
                    order.stay?.Room?.RoomNumber ||
                    order.stay?.room?.RoomNumber ||
                    `P-${order.StayId}`;
                  const guestName =
                    order.stay?.Booking?.user?.FullName ||
                    order.stay?.booking?.user?.FullName ||
                    "Khách Lưu Trú";
                  const guestPhone =
                    order.stay?.Booking?.user?.Phone ||
                    order.stay?.booking?.user?.Phone ||
                    "";
                  const createdTime = order.OrderDate || order.createdAt;

                  return (
                    <div key={order.OrderId} className={styles.orderCard}>
                      <div className={styles.cardTopRow}>
                        <span className={styles.orderRoomBadge}>Phòng {roomNum}</span>
                        <div className={styles.orderTimeBadge}>
                          <span className="material-symbols-outlined text-[13px]">
                            schedule
                          </span>
                          <span>
                            {createdTime
                              ? new Date(createdTime).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                          <span className="font-mono text-slate-400">
                            #{order.OrderId}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cardServiceName}>
                        <span className={styles.cardQtyBadge}>
                          {order.Quantity} {order.service?.Unit || "Lượt"}
                        </span>
                        <span>{order.service?.ServiceName || "Dịch vụ"}</span>
                      </div>

                      <div className={styles.cardMetaRow}>
                        <div className={styles.guestInfo} title={guestName}>
                          <span className="material-symbols-outlined text-[15px] text-slate-400">
                            person
                          </span>
                          <span className="font-semibold">{guestName}</span>
                          {guestPhone && (
                            <span className="text-slate-400">({guestPhone})</span>
                          )}
                        </div>
                        <span className={styles.cardPrice}>
                          {Number(order.TotalPrice).toLocaleString("vi-VN")} đ
                        </span>
                      </div>

                      {order.Note && (
                        <div className={styles.cardNoteBox}>
                          <strong>Ghi chú:</strong> {order.Note}
                        </div>
                      )}

                      <div className={styles.cardActionRow}>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.OrderId, "InProgress")}
                          className={`${styles.btnActionSmall} ${styles.btnStart}`}
                          title="Bắt đầu thực hiện dịch vụ"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            play_arrow
                          </span>
                          <span>Bắt Đầu Làm</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.OrderId, "Completed")}
                          className={`${styles.btnActionSmall} ${styles.btnComplete}`}
                          title="Hoàn tất nhanh dịch vụ"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            done_all
                          </span>
                          <span>Hoàn Tất</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(order)}
                          className={`${styles.btnActionSmall} ${styles.btnCancel}`}
                          title="Huỷ đơn dịch vụ"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                          <span>Huỷ</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 2: ĐANG THỰC HIỆN (InProgress)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={styles.kanbanColumn}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitleBox}>
                <span className={`${styles.columnDot} bg-sky-500`} />
                <h2 className={styles.columnTitle}>2. ĐANG THỰC HIỆN</h2>
              </div>
              <span className={`${styles.columnBadge} bg-sky-100 text-sky-800`}>
                {inProgressOrders.length}
              </span>
            </div>

            <div className={styles.cardsContainer}>
              {inProgressOrders.length === 0 ? (
                <div className={styles.emptyColumn}>
                  <span className="material-symbols-outlined text-3xl">pending</span>
                  <span>Hiện không có đơn nào đang thực hiện</span>
                </div>
              ) : (
                inProgressOrders.map((order) => {
                  const roomNum =
                    order.stay?.Room?.RoomNumber ||
                    order.stay?.room?.RoomNumber ||
                    `P-${order.StayId}`;
                  const guestName =
                    order.stay?.Booking?.user?.FullName ||
                    order.stay?.booking?.user?.FullName ||
                    "Khách Lưu Trú";
                  const createdTime = order.OrderDate || order.createdAt;

                  return (
                    <div key={order.OrderId} className={styles.orderCard}>
                      <div className={styles.cardTopRow}>
                        <span className={styles.orderRoomBadge}>Phòng {roomNum}</span>
                        <div className={styles.orderTimeBadge}>
                          <span className="material-symbols-outlined text-[13px] text-sky-600 animate-spin">
                            sync
                          </span>
                          <span className="text-sky-700 font-bold">Đang phục vụ</span>
                          <span className="font-mono text-slate-400">
                            #{order.OrderId}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cardServiceName}>
                        <span className={styles.cardQtyBadge}>
                          {order.Quantity} {order.service?.Unit || "Lượt"}
                        </span>
                        <span>{order.service?.ServiceName || "Dịch vụ"}</span>
                      </div>

                      <div className={styles.cardMetaRow}>
                        <div className={styles.guestInfo} title={guestName}>
                          <span className="material-symbols-outlined text-[15px] text-slate-400">
                            person
                          </span>
                          <span className="font-semibold">{guestName}</span>
                        </div>
                        <span className={styles.cardPrice}>
                          {Number(order.TotalPrice).toLocaleString("vi-VN")} đ
                        </span>
                      </div>

                      {order.Note && (
                        <div className={styles.cardNoteBox}>
                          <strong>Ghi chú:</strong> {order.Note}
                        </div>
                      )}

                      <div className={styles.cardActionRow}>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.OrderId, "Completed")}
                          className={`${styles.btnActionSmall} ${styles.btnComplete}`}
                          title="Xác nhận hoàn tất phục vụ"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            check
                          </span>
                          <span>Xác Nhận Hoàn Tất</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(order)}
                          className={`${styles.btnActionSmall} ${styles.btnCancel}`}
                          title="Huỷ đơn dịch vụ"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                          <span>Huỷ</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 3: HOÀN TẤT & LỊCH SỬ (Completed & Cancelled)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={styles.kanbanColumn}>
            <div className={styles.columnHeader}>
              <div className={styles.columnTitleBox}>
                <span
                  className={`${styles.columnDot} ${
                    historyTab === "completed" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <h2 className={styles.columnTitle}>3. LỊCH SỬ KẾT THÚC</h2>
              </div>

              {/* Tab chuyển đổi giữa Hoàn tất vs Đã huỷ */}
              <div className={styles.tabToggleGroup}>
                <button
                  type="button"
                  onClick={() => setHistoryTab("completed")}
                  className={`${styles.tabToggleBtn} ${
                    historyTab === "completed" ? styles.tabToggleBtnActive : ""
                  }`}
                >
                  Hoàn Tất ({completedOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("cancelled")}
                  className={`${styles.tabToggleBtn} ${
                    historyTab === "cancelled" ? styles.tabToggleBtnActive : ""
                  }`}
                >
                  Đã Huỷ ({cancelledOrders.length})
                </button>
              </div>
            </div>

            <div className={styles.cardsContainer}>
              {historyTab === "completed" ? (
                completedOrders.length === 0 ? (
                  <div className={styles.emptyColumn}>
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                    <span>Chưa có đơn nào hoàn tất trong phiên này</span>
                  </div>
                ) : (
                  completedOrders.map((order) => {
                    const roomNum =
                      order.stay?.Room?.RoomNumber ||
                      order.stay?.room?.RoomNumber ||
                      `P-${order.StayId}`;
                    const guestName =
                      order.stay?.Booking?.user?.FullName ||
                      order.stay?.booking?.user?.FullName ||
                      "Khách Lưu Trú";

                    return (
                      <div
                        key={order.OrderId}
                        className={`${styles.orderCard} border-emerald-200 bg-emerald-50/20`}
                      >
                        <div className={styles.cardTopRow}>
                          <span className={styles.orderRoomBadge}>Phòng {roomNum}</span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">
                              check_circle
                            </span>
                            <span>Hoàn Tất</span>
                          </span>
                        </div>

                        <div className={styles.cardServiceName}>
                          <span className={styles.cardQtyBadge}>
                            {order.Quantity} {order.service?.Unit || "Lượt"}
                          </span>
                          <span>{order.service?.ServiceName || "Dịch vụ"}</span>
                        </div>

                        <div className={styles.cardMetaRow}>
                          <div className={styles.guestInfo}>
                            <span className="material-symbols-outlined text-[15px] text-slate-400">
                              person
                            </span>
                            <span>{guestName}</span>
                          </div>
                          <span className={styles.cardPrice}>
                            {Number(order.TotalPrice).toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                cancelledOrders.length === 0 ? (
                  <div className={styles.emptyColumn}>
                    <span className="material-symbols-outlined text-3xl">check</span>
                    <span>Không có đơn nào bị huỷ</span>
                  </div>
                ) : (
                  cancelledOrders.map((order) => {
                    const roomNum =
                      order.stay?.Room?.RoomNumber ||
                      order.stay?.room?.RoomNumber ||
                      `P-${order.StayId}`;

                    return (
                      <div
                        key={order.OrderId}
                        className={`${styles.orderCard} border-rose-200 bg-rose-50/30 opacity-90`}
                      >
                        <div className={styles.cardTopRow}>
                          <span className="font-mono text-xs font-bold text-slate-500">
                            Phòng {roomNum} • #{order.OrderId}
                          </span>
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">
                              cancel
                            </span>
                            <span>Đã Huỷ</span>
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-slate-600 line-through">
                          {order.Quantity}x {order.service?.ServiceName || "Dịch vụ"}
                        </div>

                        <div className={styles.cancelReasonBox}>
                          <strong>Lý do huỷ:</strong> {order.Note || "Không ghi rõ"}
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>

        {/* ─── MODAL HUỶ ĐƠN DỊCH VỤ ─── */}
        {cancelModalOrder && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <span className="material-symbols-outlined">warning</span>
                  <span>Xác Nhận Huỷ Đơn Dịch Vụ #{cancelModalOrder.OrderId}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className={styles.modalCloseBtn}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="text-xs text-slate-600">
                Bạn đang thực hiện huỷ đơn{" "}
                <strong>{cancelModalOrder.service?.ServiceName}</strong> của Phòng{" "}
                <strong>
                  {cancelModalOrder.stay?.Room?.RoomNumber ||
                    cancelModalOrder.stay?.room?.RoomNumber ||
                    `P-${cancelModalOrder.StayId}`}
                </strong>
                . Vui lòng nhập lý do huỷ theo quy định (từ 2 đến 500 ký tự):
              </div>

              {/* Gợi ý lý do huỷ nhanh */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Gợi Ý Lý Do Nhanh:
                </div>
                <div className={styles.quickReasonRow}>
                  {PRESET_REASONS.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={styles.quickReasonChip}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô nhập lý do */}
              <div>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết huỷ đơn..."
                  maxLength={500}
                  className={styles.reasonTextarea}
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Tối thiểu 2 ký tự</span>
                  <span>{cancelReason.length} / 500</span>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className={styles.modalBtnCancel}
                  disabled={isSubmittingCancel}
                >
                  Quay Lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className={styles.modalBtnConfirm}
                  disabled={isSubmittingCancel || cancelReason.trim().length < 2}
                >
                  {isSubmittingCancel ? "Đang Huỷ..." : "Xác Nhận Huỷ Đơn"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ServiceOrdersKanban;
