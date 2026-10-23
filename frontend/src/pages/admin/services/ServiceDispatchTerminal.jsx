import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import styles from "./ServiceDispatchTerminal.module.css";
import {
  fetchActiveStaysApi,
  fetchServicesApi,
  fetchCategoriesApi,
  createServiceOrderApi,
  fetchServiceOrdersApi,
} from "../../../api/serviceApi";

const ServiceDispatchTerminal = () => {
  // ─── DỮ LIỆU ĐỘNG TỪ DATABASE ───
  const [activeStays, setActiveStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [searchStayTerm, setSearchStayTerm] = useState("");
  const [showStayDropdown, setShowStayDropdown] = useState(false);
  const [isLoadingStays, setIsLoadingStays] = useState(true);

  // Danh mục & Dịch vụ
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [allServices, setAllServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Giỏ hàng dịch vụ yêu cầu (Batch order)
  const [cart, setCart] = useState([]);

  // Tùy chọn thực hiện dịch vụ
  const [serviceLocation, setServiceLocation] = useState("room"); // "room" | "counter"
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState("16:30 - 17:30");
  const [dispatchNote, setDispatchNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("charge_room"); // "charge_room" | "pos" | "comp_gm"

  // Trạng thái giao diện
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Tải danh sách phòng lưu trú (CheckedIn / Extended) thực tế từ API
  const loadStays = async () => {
    setIsLoadingStays(true);
    try {
      const res = await fetchActiveStaysApi();
      if (res && res.data && res.data.length > 0) {
        const mapped = res.data.map((st) => {
          const roomObj = st.room || st.Room;
          const bookingObj = st.booking || st.Booking;
          const userObj = bookingObj?.user || bookingObj?.User;
          return {
            StayId: st.StayId,
            roomNumber: roomObj?.RoomNumber || `P-${st.RoomId}`,
            floor: roomObj?.Floor || "1",
            roomType: roomObj?.roomType?.TypeName || roomObj?.RoomType?.TypeName || "Phòng Tiêu Chuẩn",
            fullName: userObj?.FullName || "Khách Hàng Lưu Trú",
            vipTier: userObj?.membershipTier?.TierName || "Hội Viên",
            folioCode: bookingObj?.ConfirmationCode || bookingObj?.BookingCode || `#FL-${st.StayId}-C`,
            checkInDate: st.ActualCheckIn || st.CheckInTime || st.CheckInDate || bookingObj?.CheckInDate,
            checkOutDate: st.ExpectedCheckOut || st.ActualCheckOut || st.CheckOutDate || bookingObj?.CheckOutDate,
            phoneNumber: userObj?.Phone || userObj?.PhoneNumber || "Chưa cập nhật",
            email: userObj?.Email || "Chưa cập nhật",
          };
        });
        setActiveStays(mapped);
        setSelectedStay(mapped[0]);
        setSearchStayTerm(`Phòng ${mapped[0].roomNumber} // ${mapped[0].fullName}`);
      } else {
        setActiveStays([]);
        setSelectedStay(null);
        setSearchStayTerm("");
      }
    } catch (err) {
      console.error("Lỗi khi tải phòng in-house:", err);
      setActiveStays([]);
      setSelectedStay(null);
    } finally {
      setIsLoadingStays(false);
    }
  };

  // 2. Tải danh mục & dịch vụ thực tế từ API
  const loadCatalog = async () => {
    setIsLoadingServices(true);
    try {
      const [catRes, svcRes] = await Promise.all([
        fetchCategoriesApi().catch(() => ({ data: [] })),
        fetchServicesApi({ status: "Active" }).catch(() => ({ data: [] })),
      ]);

      if (catRes && catRes.data) {
        setCategories(catRes.data.filter((c) => !c.IsDeleted && c.Status !== "Inactive"));
      }

      if (svcRes && svcRes.data) {
        setAllServices(svcRes.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh mục/dịch vụ:", err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    loadStays();
    loadCatalog();
  }, []);

  // Show Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 3. Quản lý giỏ hàng (Thêm / Tăng / Giảm / Xóa)
  const handleAddToCart = (service) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ServiceId === service.ServiceId);
      if (existing) {
        if (existing.quantity >= 50) {
          showToast("Số lượng tối đa cho mỗi dịch vụ là 50", "error");
          return prev;
        }
        return prev.map((item) =>
          item.ServiceId === service.ServiceId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          ServiceId: service.ServiceId,
          ServiceCode: service.ServiceCode,
          ServiceName: service.ServiceName,
          Price: Number(service.Price),
          Unit: service.Unit || "Lượt",
          quantity: 1,
        },
      ];
    });
    showToast(`Đã thêm "${service.ServiceName}" vào đơn dịch vụ!`);
  };

  const handleUpdateQuantity = (serviceId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.ServiceId === serviceId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > 50) {
              showToast("Số lượng tối đa cho mỗi dịch vụ là 50", "error");
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromCart = (serviceId) => {
    setCart((prev) => prev.filter((item) => item.ServiceId !== serviceId));
  };

  // 4. Lọc dịch vụ theo danh mục đang chọn
  const filteredServices = useMemo(() => {
    if (activeCategoryId === "all") return allServices;
    return allServices.filter(
      (s) => String(s.CategoryId) === String(activeCategoryId)
    );
  }, [allServices, activeCategoryId]);

  // 5. Lọc danh sách phòng theo từ khóa tìm kiếm
  const filteredStays = useMemo(() => {
    if (!searchStayTerm.trim()) return activeStays;
    const term = searchStayTerm.toLowerCase();
    return activeStays.filter(
      (s) =>
        s.roomNumber.toLowerCase().includes(term) ||
        s.fullName.toLowerCase().includes(term) ||
        s.folioCode.toLowerCase().includes(term)
    );
  }, [activeStays, searchStayTerm]);

  // 6. Tính tổng tiền (Giá niêm yết đã bao gồm thuế phí)
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.Price, 0);
  }, [cart]);

  // 7. Tải lịch sử đơn
  const handleOpenHistory = async () => {
    setShowHistoryDrawer(true);
    setLoadingHistory(true);
    try {
      const res = await fetchServiceOrdersApi({
        stayId: selectedStay ? selectedStay.StayId : undefined,
      });
      if (res && res.data) {
        setHistoryOrders(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 8. Gửi lệnh đặt dịch vụ (Batch order hoặc Single)
  const handleSubmitOrder = async () => {
    if (!selectedStay) {
      showToast("Vui lòng chọn phòng lưu trú đang in-house", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Vui lòng thêm ít nhất 1 dịch vụ vào đơn đặt", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const locationText =
        serviceLocation === "room"
          ? `Tại Phòng ${selectedStay.roomNumber}`
          : "Tại quầy phục vụ / Spa";

      const fullNote = `[Khung giờ: ${scheduleDate} ${scheduleTime}] [Địa điểm: ${locationText}] ${
        dispatchNote ? "- " + dispatchNote : ""
      }`;

      // Gửi danh sách các món trong giỏ hàng (Batch order)
      const itemsPayload = cart.map((c) => ({
        serviceId: c.ServiceId,
        quantity: c.quantity,
        note: fullNote.slice(0, 500),
      }));

      const payload = {
        stayId: selectedStay.StayId,
        items: itemsPayload,
      };

      const res = await createServiceOrderApi(payload);
      if (res.success) {
        showToast(
          `✓ Đã đặt thành công ${cart.length} dịch vụ cho phòng ${selectedStay.roomNumber}! Đã lưu snapshot giá.`
        );
        setCart([]);
        setDispatchNote("");
      } else {
        showToast(res.message || "Không thể tạo đơn đặt dịch vụ", "error");
      }
    } catch (err) {
      showToast(err.message || "Lỗi hệ thống khi gửi lệnh đặt dịch vụ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* Toast thông báo */}
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
                event_available
              </span>
            </div>
            <div>
              <div className={styles.headerBadge}>
                <span className={styles.liveDot} />
                <span>PHÂN HỆ ĐIỀU PHỐI LỊCH TRÌNH • Terminal #DISP-04</span>
              </div>
              <h1 className={styles.headerTitle}>
                TIẾP NHẬN ĐẶT DỊCH VỤ &amp; ĐIỀU PHỐI LỊCH TRÌNH
              </h1>
              <div className={styles.headerSubtitle}>
                SERVICE DISPATCH &amp; SCHEDULING TERMINAL • PMS CORE LUXURY CONCIERGE
              </div>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.dateBadge}>
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                event
              </span>
              <span>
                {new Date().toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenHistory}
              className={styles.actionBtnOutline}
              title="Xem danh sách các lệnh điều phối dịch vụ đã tạo"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Lịch Sử Lệnh</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className={styles.actionBtnOutline}
              title="In phiếu yêu cầu dịch vụ"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>In Phiếu Yêu Cầu</span>
            </button>
          </div>
        </div>

        {/* ─── 3 CỘT GRID ─── */}
        <div className={styles.terminalGrid}>
          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 1: TRA CỨU KHÁCH IN-HOUSE / PHÒNG (DỮ LIỆU ĐỘNG)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={`${styles.columnCard} ${styles.guestCol}`}>
            <div className={styles.columnHeader}>
              <h2 className={styles.columnTitle}>
                <span className="material-symbols-outlined text-[18px] text-emerald-700">
                  person_search
                </span>
                <span>TRA CỨU KHÁCH IN-HOUSE / PHÒNG</span>
              </h2>
              <span className="text-[11px] font-mono font-bold text-slate-400">⌘K</span>
            </div>

            {/* Trạng thái chưa có phòng lưu trú */}
            {activeStays.length === 0 && !isLoadingStays ? (
              <div className={styles.emptyInHouseBox}>
                <span className={`material-symbols-outlined ${styles.emptyInHouseIcon}`}>
                  hotel
                </span>
                <h3 className={styles.emptyInHouseTitle}>
                  Hiện chưa có phòng nào đang lưu trú
                </h3>
                <p className={styles.emptyInHouseSub}>
                  Hệ thống yêu cầu phòng phải ở trạng thái <strong>CheckedIn</strong> hoặc{" "}
                  <strong>Extended</strong> để có thể đặt dịch vụ.
                </p>
                <Link to="/admin/check-in" className={styles.emptyInHouseBtn}>
                  <span className="material-symbols-outlined text-[16px]">
                    how_to_reg
                  </span>
                  <span>Chuyển tới Quầy Check-in</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Ô tìm kiếm phòng */}
                <div className={styles.searchBoxWrapper}>
                  <div className={styles.searchInputRow}>
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchStayTerm}
                      onChange={(e) => {
                        setSearchStayTerm(e.target.value);
                        setShowStayDropdown(true);
                      }}
                      onFocus={() => setShowStayDropdown(true)}
                      placeholder="Tìm số phòng hoặc tên khách..."
                      className={styles.searchInput}
                    />
                    <span className={styles.selectedTag}>Đã Chọn</span>
                  </div>

                  {/* Dropdown danh sách phòng in-house */}
                  {showStayDropdown && (
                    <div className={styles.dropdownStays}>
                      {filteredStays.map((st) => (
                        <div
                          key={st.StayId}
                          className={styles.stayItem}
                          onClick={() => {
                            setSelectedStay(st);
                            setSearchStayTerm(`Phòng ${st.roomNumber} // ${st.fullName}`);
                            setShowStayDropdown(false);
                          }}
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-800">
                              Phòng {st.roomNumber} - {st.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {st.roomType} • {st.folioCode}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {st.vipTier}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Thẻ thông tin khách được chọn */}
                {selectedStay && (
                  <div className={styles.guestProfileCard}>
                    <div className={styles.guestHeaderRow}>
                      <div className={styles.guestAvatar}>
                        {selectedStay.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .slice(-2)
                          .join("")
                          .toUpperCase() || "KH"}
                      </div>
                      <div className={styles.guestNameCol}>
                        <h3 className={styles.guestName}>{selectedStay.fullName}</h3>
                        <div className={styles.guestBadges}>
                          <span className={styles.vipBadge}>
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            <span>{selectedStay.vipTier}</span>
                          </span>
                          <span className={styles.folioBadge}>{selectedStay.folioCode}</span>
                        </div>
                      </div>
                      <div className={styles.roomBadgeBox}>
                        <div className="text-[10px] opacity-80 uppercase tracking-wider">Phòng</div>
                        <div className="font-mono text-sm font-black">{selectedStay.roomNumber}</div>
                      </div>
                    </div>

                    <div className={styles.guestMetaGrid}>
                      <div>
                        <div className={styles.metaLabel}>Hạng Phòng:</div>
                        <div className={styles.metaVal}>{selectedStay.roomType}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Tầng:</div>
                        <div className={styles.metaVal}>{selectedStay.floor || "1"}</div>
                      </div>
                    </div>

                    <div className={styles.stayDetailList}>
                      <div className={styles.stayDetailRow}>
                        <span className="text-slate-500">Ngày Nhận Phòng:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedStay.checkInDate
                            ? new Date(selectedStay.checkInDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.stayDetailRow}>
                        <span className="text-slate-500">Ngày Dự Kiến Trả:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedStay.checkOutDate
                            ? new Date(selectedStay.checkOutDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </span>
                      </div>
                      <div className={styles.stayDetailRow}>
                        <span className="text-slate-500">Số Điện Thoại:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedStay.phoneNumber}
                        </span>
                      </div>
                      <div className={styles.stayDetailRow}>
                        <span className="text-slate-500">Email:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {selectedStay.email}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 2: PHÂN HỆ DỊCH VỤ YÊU CẦU (DANH SÁCH & BATCH SELECTION)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={`${styles.columnCard} ${styles.servicesCol}`}>
            <div className={styles.columnHeader}>
              <h2 className={styles.columnTitle}>
                <span className="material-symbols-outlined text-[18px] text-emerald-700">
                  room_service
                </span>
                <span>DANH SÁCH DỊCH VỤ KHÁCH SẠN</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold">
                {filteredServices.length} Dịch vụ khả dụng
              </span>
            </div>

            {/* Thanh chọn danh mục động */}
            <div className={styles.categoryPills}>
              <button
                type="button"
                onClick={() => setActiveCategoryId("all")}
                className={`${styles.categoryPillBtn} ${
                  activeCategoryId === "all" ? styles.categoryPillBtnActive : ""
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apps</span>
                <span>Tất Cả ({allServices.length})</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.CategoryId}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.CategoryId)}
                  className={`${styles.categoryPillBtn} ${
                    String(activeCategoryId) === String(cat.CategoryId)
                      ? styles.categoryPillBtnActive
                      : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">spa</span>
                  <span>{cat.CategoryName}</span>
                </button>
              ))}
            </div>

            {/* Danh sách dịch vụ thực tế để chọn */}
            <div className={styles.servicesScrollArea}>
              {isLoadingServices ? (
                <div className="p-8 text-center text-slate-400">
                  Đang tải danh sách dịch vụ...
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Không có dịch vụ nào trong nhóm này.
                </div>
              ) : (
                filteredServices.map((svc) => (
                  <div key={svc.ServiceId} className={styles.serviceItemCard}>
                    <div className={styles.serviceItemHeader}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={styles.codeBadge}>{svc.ServiceCode}</span>
                        <span className={styles.unitBadge}>{svc.Unit || "Lượt"}</span>
                      </div>
                      <div className={styles.servicePrice}>
                        {Number(svc.Price).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                    <h3 className={styles.serviceName}>{svc.ServiceName}</h3>
                    {svc.Description && (
                      <p className={styles.serviceDesc}>{svc.Description}</p>
                    )}
                    <div className={styles.serviceItemFooter}>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(svc)}
                        className={styles.addServiceBtn}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add_circle
                        </span>
                        <span>Thêm vào đơn</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Địa điểm triển khai phục vụ */}
            <div>
              <div className={styles.sectionTitleSmall}>ĐỊA ĐIỂM TRIỂN KHAI PHỤC VỤ</div>
              <div className={styles.locationRadios}>
                <div
                  className={`${styles.locationOption} ${
                    serviceLocation === "room" ? styles.locationOptionSelected : ""
                  }`}
                  onClick={() => setServiceLocation("room")}
                >
                  <input
                    type="radio"
                    name="serviceLocation"
                    checked={serviceLocation === "room"}
                    onChange={() => setServiceLocation("room")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className={styles.locLabel}>
                      Tại Phòng {selectedStay?.roomNumber || "Khách"}
                    </div>
                    <div className={styles.locSub}>Phục vụ tận phòng</div>
                  </div>
                </div>

                <div
                  className={`${styles.locationOption} ${
                    serviceLocation === "counter" ? styles.locationOptionSelected : ""
                  }`}
                  onClick={() => setServiceLocation("counter")}
                >
                  <input
                    type="radio"
                    name="serviceLocation"
                    checked={serviceLocation === "counter"}
                    onChange={() => setServiceLocation("counter")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className={styles.locLabel}>Tại Quầy Dịch Vụ / Spa</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Khách đến sử dụng trực tiếp
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ngày thực hiện & Khung giờ */}
            <div className={styles.scheduleGrid}>
              <div className={styles.scheduleCol}>
                <div className={styles.sectionTitleSmall}>NGÀY THỰC HIỆN</div>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className={styles.scheduleInput}
                />
              </div>

              <div className={styles.scheduleCol}>
                <div className={styles.sectionTitleSmall}>KHUNG GIỜ PHỤC VỤ</div>
                <select
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className={styles.scheduleInput}
                >
                  <option value="16:30 - 17:30">16:30 - 17:30 (Chiều)</option>
                  <option value="09:00 - 10:00">09:00 - 10:00 (Sáng)</option>
                  <option value="11:00 - 12:00">11:00 - 12:00 (Trưa)</option>
                  <option value="14:00 - 15:00">14:00 - 15:00 (Đầu chiều)</option>
                  <option value="19:00 - 20:00">19:00 - 20:00 (Tối)</option>
                  <option value="Phục vụ ngay">Phục vụ ngay (Express)</option>
                </select>
              </div>
            </div>

            {/* Ghi chú điều phối ca trực */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={styles.sectionTitleSmall}>
                  GHI CHÚ ĐIỀU HÀNH / PHỤC VỤ
                </span>
              </div>
              <textarea
                rows={2}
                value={dispatchNote}
                onChange={(e) => setDispatchNote(e.target.value)}
                placeholder="Nhập ghi chú yêu cầu riêng của khách (ví dụ: giờ giấc, lưu ý đặc biệt)..."
                className={styles.noteTextarea}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              CỘT 3: PHÂN RÃ QUYẾT TOÁN & BATCH ORDER CART
             ═══════════════════════════════════════════════════════════════════ */}
          <div id="cart-section" className={`${styles.columnCard} ${styles.cartCol}`}>
            <div className={styles.breakdownHeader}>
              <h2 className={styles.columnTitle}>
                <span className="material-symbols-outlined text-[18px] text-emerald-700">
                  shopping_cart_checkout
                </span>
                <span>GIỎ HÀNG DỊCH VỤ</span>
              </h2>
              <span className={styles.cartCountBadge}>{cart.length} Dịch vụ</span>
            </div>

            {/* Danh sách các dịch vụ trong đơn */}
            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>
                  <span className="material-symbols-outlined text-[32px] text-slate-300">
                    add_shopping_cart
                  </span>
                  <span>Chưa chọn dịch vụ nào</span>
                  <span className="text-[11px] text-slate-400">
                    Bấm "+ Thêm vào đơn" ở cột giữa để chọn dịch vụ
                  </span>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.ServiceId} className={styles.cartItem}>
                    <div className={styles.cartItemTop}>
                      <span className={styles.cartItemName}>{item.ServiceName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.ServiceId)}
                        className={styles.cartRemoveBtn}
                        title="Xóa khỏi đơn"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          close
                        </span>
                      </button>
                    </div>

                    <div className={styles.cartItemBottom}>
                      {/* Bộ điều khiển số lượng (+ / -) */}
                      <div className={styles.qtyControl}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.ServiceId, -1)}
                          className={styles.qtyBtn}
                        >
                          -
                        </button>
                        <span className={styles.qtyValue}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.ServiceId, 1)}
                          className={styles.qtyBtn}
                        >
                          +
                        </button>
                      </div>

                      <div className={styles.cartItemPrice}>
                        {(item.quantity * item.Price).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Hộp tổng cộng nổi bật (Giá đã bao gồm thuế phí) */}
            <div className={styles.totalBox}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>TỔNG CỘNG:</span>
                <span className={styles.totalAmount}>
                  {totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className={styles.totalNote}>
                Đơn giá niêm yết đã bao gồm thuế &amp; phí dịch vụ
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div>
              <div className={styles.sectionTitleSmall}>PHƯƠNG THỨC THANH TOÁN</div>
              <div className={styles.paymentRadios}>
                <div
                  className={`${styles.paymentOption} ${
                    paymentMethod === "charge_room"
                      ? styles.paymentOptionSelected
                      : ""
                  }`}
                  onClick={() => setPaymentMethod("charge_room")}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "charge_room"}
                    onChange={() => setPaymentMethod("charge_room")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className={styles.payTitle}>
                      Ký nợ trực tiếp vào Hóa đơn phòng
                    </div>
                    <div className={styles.paySub}>
                      Charge to Room Folio #{selectedStay?.folioCode || "001"}
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.paymentOption} ${
                    paymentMethod === "pos" ? styles.paymentOptionSelected : ""
                  }`}
                  onClick={() => setPaymentMethod("pos")}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "pos"}
                    onChange={() => setPaymentMethod("pos")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className={styles.payTitle}>
                      Thanh toán thẻ POS / Tiền mặt tại quầy
                    </div>
                    <div className={styles.paySub}>
                      Khách thanh toán trực tiếp khi nhận dịch vụ
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.paymentOption} ${
                    paymentMethod === "comp_gm" ? styles.paymentOptionSelected : ""
                  }`}
                  onClick={() => setPaymentMethod("comp_gm")}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "comp_gm"}
                    onChange={() => setPaymentMethod("comp_gm")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <div className={styles.payTitle}>Miễn trừ chi phí (Comp GM)</div>
                    <div className={styles.paySub}>
                      Đặc quyền phê duyệt của Ban Giám Đốc
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nút hành động chính */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || cart.length === 0 || !selectedStay}
                className={styles.submitBtn}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isSubmitting ? "hourglass_top" : "send"}
                </span>
                <span>
                  {isSubmitting
                    ? "ĐANG XÁC NHẬN..."
                    : `XÁC NHẬN ĐẶT ${cart.length} DỊCH VỤ & GỬI LỆNH`}
                </span>
              </button>

              <div className={styles.secondaryActionsRow}>
                <button
                  type="button"
                  onClick={() => {
                    if (cart.length === 0) {
                      showToast("Chưa có dịch vụ nào trong đơn để lưu", "error");
                      return;
                    }
                    showToast("Đã lưu nháp giỏ dịch vụ của phòng!");
                  }}
                  className={styles.draftBtn}
                >
                  <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  <span>Lưu Nháp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setDispatchNote("");
                    showToast("Đã xóa trắng giỏ dịch vụ");
                  }}
                  className={styles.cancelBtn}
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>Xóa Trắng</span>
                </button>
              </div>
            </div>

            {/* Trạng thái footer */}
            <div className={styles.footerStatusRow}>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">
                  sync
                </span>
                <span>Đồng bộ tức thì vào CSDL</span>
              </div>
              <span className={styles.statusPillActive}>
                <span className={styles.liveDot} />
                <span>API ACTIVE</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Quick Cart Action Bar */}
        {cart.length > 0 && (
          <div className={styles.mobileCartBar}>
            <div className={styles.mobileCartBarLeft}>
              <span className={styles.mobileCartBarBadge}>{cart.length} dịch vụ</span>
              <span className={styles.mobileCartBarTotal}>
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("cart-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={styles.mobileCartBarBtn}
            >
              <span>Xem đơn &amp; Đặt</span>
              <span className="material-symbols-outlined text-[16px]">
                arrow_downward
              </span>
            </button>
          </div>
        )}

        {/* ─── DRAWER LỊCH SỬ LỆNH ĐIỀU PHỐI (DỮ LIỆU THỰC TẾ) ─── */}
        {showHistoryDrawer && (
          <div
            className={styles.modalBackdrop}
            onClick={() => setShowHistoryDrawer(false)}
          >
            <div
              className={styles.drawerContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.drawerHeader}>
                <h3 className={styles.drawerTitle}>
                  Lịch Sử Đơn Đặt Dịch Vụ
                  {selectedStay ? ` (Phòng ${selectedStay.roomNumber})` : ""}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className={styles.closeDrawerBtn}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className={styles.drawerBody}>
                {loadingHistory ? (
                  <div className="p-8 text-center text-slate-400">
                    Đang tải danh sách lệnh điều phối...
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    Chưa có đơn đặt dịch vụ nào được ghi nhận.
                  </div>
                ) : (
                  historyOrders.map((ord) => (
                    <div key={ord.OrderId} className={styles.historyOrderCard}>
                      <div className={styles.historyOrderHeader}>
                        <span className={styles.orderIdBadge}>#ORD-{ord.OrderId}</span>
                        <span
                          className={`${styles.orderStatusBadge} ${
                            ord.Status === "Completed"
                              ? styles.statusCompleted
                              : ord.Status === "Processing"
                              ? styles.statusProcessing
                              : styles.statusReceived
                          }`}
                        >
                          {ord.Status === "Received"
                            ? "✓ Đã tiếp nhận"
                            : ord.Status === "Processing"
                            ? "Đang phục vụ"
                            : ord.Status}
                        </span>
                      </div>
                      <div className={styles.orderServiceTitle}>
                        {ord.service?.ServiceName || "Dịch vụ đã đặt"}
                      </div>
                      <div className={styles.orderRoomMeta}>
                        <span>
                          Phòng: {ord.stay?.Room?.RoomNumber || ord.stay?.room?.RoomNumber || "—"}
                        </span>
                        <span>•</span>
                        <span>
                          {ord.OrderDate
                            ? new Date(ord.OrderDate).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                      {ord.Note && (
                        <div className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                          {ord.Note}
                        </div>
                      )}
                      <div className={styles.orderPriceRow}>
                        <span className="text-slate-500">
                          SL: {Number(ord.Quantity) || 1} x{" "}
                          {Number(ord.UnitPrice || 0).toLocaleString("vi-VN")} đ
                        </span>
                        <span className={styles.orderTotalAmount}>
                          {Number(ord.TotalPrice || 0).toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ServiceDispatchTerminal;
