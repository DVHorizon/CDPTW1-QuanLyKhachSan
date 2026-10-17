import React, { useState, useEffect } from "react";
import GuestSidebar from "../../components/layout/GuestSidebar";
import GuestHeader from "../../components/layout/GuestHeader";

// Định nghĩa giới hạn số lượng khách theo loại bàn chuẩn nghiệp vụ
const TABLE_TYPE_RANGES = {
  couple: {
    min: 1,
    max: 2,
    default: 2,
    label: "Bàn Đôi Lãng Mạn (1 - 2 người)",
    tag: "Bàn Đôi Lãng Mạn (1 - 2 người)",
    icon: "favorite",
    iconColor: "text-rose-500",
    desc: "1 - 2 người"
  },
  standard: {
    min: 2,
    max: 4,
    default: 3,
    label: "Bàn Tiêu Chuẩn (2 - 4 người)",
    tag: "Bàn Tiêu Chuẩn (2 - 4 người)",
    icon: "table_restaurant",
    iconColor: "text-sky-500",
    desc: "2 - 4 người"
  },
  family: {
    min: 4,
    max: 6,
    default: 5,
    label: "Bàn Gia Đình Thân Mật (4 - 6 người)",
    tag: "Bàn Gia Đình Thân Mật (4 - 6 người)",
    icon: "group",
    iconColor: "text-emerald-500",
    desc: "4 - 6 người"
  },
  vip: {
    min: 8,
    max: 16,
    default: 8,
    label: "Tiệc Doanh Nhân / VIP (8+ người)",
    tag: "Tiệc Doanh Nhân / VIP (8+ người)",
    icon: "domain_verification",
    iconColor: "text-amber-500",
    desc: "8 - 16 người"
  }
};

// Khung giờ hoạt động chuẩn theo từng buổi ẩm thực của nhà hàng
const MEAL_PERIOD_TIME_SLOTS = {
  breakfast: [
    { time: "06:30" },
    { time: "07:00" },
    { time: "07:30" },
    { time: "08:00" },
    { time: "08:30" },
    { time: "09:00" },
    { time: "09:30" },
    { time: "10:00" },
  ],
  lunch: [
    { time: "11:30" },
    { time: "12:00" },
    { time: "12:30" },
    { time: "13:00" },
    { time: "13:30" },
    { time: "14:00" },
    { time: "14:30" },
  ],
  dinner: [
    { time: "17:30" },
    { time: "18:00" },
    { time: "18:30" },
    { time: "19:00" },
    { time: "19:30" },
    { time: "20:00" },
    { time: "20:30" },
    { time: "21:00" },
  ]
};

export default function TableReservation() {
  const [selectedDate, setSelectedDate] = useState("18");
  const [mealPeriod, setMealPeriod] = useState("dinner");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [tableType, setTableType] = useState("family");
  const [guestCount, setGuestCount] = useState(4);
  const [seatingZone, setSeatingZone] = useState("terrace");
  const [selectedTableId, setSelectedTableId] = useState(null);
  
  // Dữ liệu lượt lưu trú phòng thực tế của khách hàng (active stay)
  const [activeStays, setActiveStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedDietaryTags, setSelectedDietaryTags] = useState([]);
  const [customDietaryNote, setCustomDietaryNote] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [roomFolio, setRoomFolio] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dữ liệu số bàn trống theo thời gian thực từ Database
  const [availableData, setAvailableData] = useState({
    totalTables: 500,
    availableCount: 500,
    locationStats: {},
    tables: []
  });
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false);

  // Khởi tạo thông tin người dùng từ localStorage
  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("hotel_user") || "{}");
      setCurrentUser(savedUser);
    } catch {}
  }, []);

  // Lấy danh sách lượt lưu trú đang hoạt động để tự động điền thông tin phòng
  useEffect(() => {
    const fetchActiveStays = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/v1/fnb-orders/active-stays");
        const json = await res.json();
        if (res.ok && json.data && json.data.length > 0) {
          setActiveStays(json.data);
          // Tìm phòng phù hợp với user hiện tại nếu có, hoặc chọn phòng active đầu tiên
          let matched = null;
          try {
            const savedUser = JSON.parse(localStorage.getItem("hotel_user") || "{}");
            const uid = savedUser?.id || savedUser?.UserId || savedUser?.userId;
            if (uid) {
              matched = json.data.find((s) => s.userId === uid);
            }
          } catch {}
          const stayToSelect = matched || json.data[0];
          setSelectedStay(stayToSelect);
          
          // Tự động điền ghi chú dựa trên thông tin phòng được chọn
          if (stayToSelect) {
            setSpecialNotes(
              `Khách lưu trú phòng ${stayToSelect.roomNumber} (${stayToSelect.guestName}). Yêu cầu chuẩn bị bàn trang trọng, view ngắm biển hoàng hôn lúc ${selectedTime}.`
            );
          }
        }
      } catch (err) {
        console.warn("Không thể tải danh sách phòng active:", err);
      }
    };
    fetchActiveStays();
  }, []);

  // Lấy danh sách lượt đặt bàn của mình từ Database
  const fetchMyReservations = async () => {
    try {
      const token = localStorage.getItem("hotel_token");
      let url = "http://localhost:5000/api/v1/table-reservations";
      try {
        const savedUser = JSON.parse(localStorage.getItem("hotel_user") || "{}");
        const uid = savedUser?.id || savedUser?.UserId || savedUser?.userId;
        if (uid) url += `?userId=${uid}`;
      } catch {}

      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMyReservations(json.data);
      }
    } catch (e) {
      console.warn("Could not load reservations", e);
    }
  };

  useEffect(() => {
    fetchMyReservations();
  }, []);

  // Hàm tính toán targetDate chuẩn ISO
  const getTargetDateTime = (dateStr, timeStr) => {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(dateStr).padStart(2, "0");
    return `${targetYear}-${targetMonth}-${day}T${timeStr}:00.000Z`;
  };

  // Lấy số lượng bàn khả dụng từ Database theo ngày, giờ và số người
  const fetchTableAvailability = async () => {
    setIsFetchingAvailability(true);
    try {
      const targetDate = getTargetDateTime(selectedDate, selectedTime);
      const res = await fetch(
        `http://localhost:5000/api/v1/table-reservations/available-tables?reservationTime=${targetDate}&guestCount=${guestCount}`
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setAvailableData(json.data);
      }
    } catch (e) {
      console.warn("Could not fetch table availability", e);
    } finally {
      setIsFetchingAvailability(false);
    }
  };

  useEffect(() => {
    fetchTableAvailability();
  }, [selectedDate, selectedTime, guestCount]);

  // Xử lý chuyển đổi loại bàn: Khóa số lượng khách đúng theo khoảng giới hạn của loại bàn
  const handleSelectTableType = (typeKey) => {
    setTableType(typeKey);
    const range = TABLE_TYPE_RANGES[typeKey];
    if (range) {
      // Ép số lượng khách nằm chuẩn trong khoảng [min, max]
      setGuestCount((prev) => {
        let newCount = prev;
        if (prev < range.min) newCount = range.min;
        else if (prev > range.max) newCount = range.max;

        // Nếu bàn đang chọn không còn vừa sức chứa mới, tự động hủy hoặc gán bàn phù hợp
        if (selectedTableId) {
          const currentTable = (availableData.tables || []).find((t) => t.tableId === selectedTableId);
          if (currentTable && (newCount > currentTable.capacity || newCount < currentTable.capacity - 2)) {
            setSelectedTableId(null);
          }
        }
        return newCount;
      });
    }
  };

  // Tăng/giảm số lượng khách tuân thủ nghiêm ngặt giới hạn của tableType
  const handleIncrementGuests = () => {
    const range = TABLE_TYPE_RANGES[tableType] || { min: 1, max: 20 };
    setGuestCount((prev) => {
      const next = Math.min(range.max, prev + 1);
      // Tự động kiểm tra bàn đang chọn
      if (selectedTableId) {
        const currentTable = (availableData.tables || []).find((t) => t.tableId === selectedTableId);
        if (currentTable && next > currentTable.capacity) {
          setSelectedTableId(null); // Bỏ chọn nếu số khách vượt sức chứa bàn
        }
      }
      return next;
    });
  };

  const handleDecrementGuests = () => {
    const range = TABLE_TYPE_RANGES[tableType] || { min: 1, max: 20 };
    setGuestCount((prev) => {
      const next = Math.max(range.min, prev - 1);
      if (selectedTableId) {
        const currentTable = (availableData.tables || []).find((t) => t.tableId === selectedTableId);
        if (currentTable && next < currentTable.capacity - 3) {
          setSelectedTableId(null);
        }
      }
      return next;
    });
  };

  // Danh sách thẻ yêu cầu phổ biến
  const POPULAR_DIETARY_TAGS = [
    { id: "anniversary", icon: "celebration", label: "Kỷ niệm ngày cưới (Bố trí hoa tươi)" },
    { id: "no_msg", icon: "no_food", label: "Không dùng bột ngọt (No MSG)" },
    { id: "seafood_allergy", icon: "set_meal", label: "Dị ứng hải sản có vỏ (Tôm/Cua)" },
    { id: "baby_chair", icon: "child_care", label: "Ghế ăn cho trẻ sơ sinh" },
    { id: "birthday_cake", icon: "cake", label: "Bánh kem sinh nhật chúc mừng" },
  ];

  // Tự động kết hợp ghi chú: Thông tin phòng + Các yêu cầu chọn nhanh + Ghi chú tùy chỉnh của khách
  useEffect(() => {
    const parts = [];
    if (selectedStay) {
      parts.push(`Khách lưu trú phòng ${selectedStay.roomNumber} (${selectedStay.guestName}). Yêu cầu chuẩn bị bàn trang trọng, view ngắm biển hoàng hôn lúc ${selectedTime}.`);
    }
    if (selectedDietaryTags.length > 0) {
      const tagLabels = selectedDietaryTags.map((t) => t.label).join(", ");
      parts.push(`Yêu cầu đặc biệt: ${tagLabels}.`);
    }
    if (customDietaryNote.trim()) {
      parts.push(customDietaryNote.trim());
    }
    setSpecialNotes(parts.join(" "));
  }, [selectedStay, selectedTime, selectedDietaryTags, customDietaryNote]);

  // Toggle chọn hoặc bỏ chọn thẻ yêu cầu (chống trùng lặp tuyệt đối)
  const handleToggleDietaryTag = (tag) => {
    setSelectedDietaryTags((prev) => {
      const exists = prev.some((t) => t.id === tag.id || t.label === tag.label);
      if (exists) {
        // Bỏ chọn
        return prev.filter((t) => t.id !== tag.id && t.label !== tag.label);
      } else {
        // Chọn mới
        return [...prev, tag];
      }
    });
  };

  // Đổi phòng đang lưu trú
  const handleStayChange = (stay) => {
    setSelectedStay(stay);
  };

  // Mapping khu vực sang Location trong DB (chuẩn 4 Location trong bảng RestaurantTables)
  const getZoneDbLocation = (zoneKey) => {
    if (zoneKey === "terrace") return "Ban Công Hướng Biển";
    if (zoneKey === "indoor") return "Sảnh Trong Nhà VIP";
    if (zoneKey === "garden") return "Sân Vườn Nhiệt Đới";
    if (zoneKey === "rooftop") return "Khu Bể Bơi Rooftop";
    return "Ban Công Hướng Biển";
  };

  const handleConfirmReservation = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("hotel_token");
      let currentUserId = selectedStay?.userId || 1;
      try {
        const savedUser = JSON.parse(localStorage.getItem("hotel_user") || "{}");
        const uid = savedUser?.id || savedUser?.UserId || savedUser?.userId;
        if (uid) currentUserId = uid;
      } catch {}
      
      const targetDate = getTargetDateTime(selectedDate, selectedTime);
      const dbLocation = getZoneDbLocation(seatingZone);

      const response = await fetch("http://localhost:5000/api/v1/table-reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: currentUserId,
          reservationTime: targetDate,
          guestCount,
          tableId: selectedTableId || undefined,
          location: dbLocation,
          note: specialNotes,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setErrorMsg(json.message || "Không thể đặt bàn lúc này. Vui lòng thử lại.");
      } else {
        setReservationResult(json.data);
        setShowModal(true);
        if (json.data?.tableReservationId) {
          try {
            localStorage.setItem("just_booked_table_res_id", String(json.data.tableReservationId));
          } catch {}
        }
        // Đưa ngay lượt vừa đặt lên đầu danh sách để làm nổi bật ngay lập tức
        if (json.data) {
          setMyReservations((prev) => [
            {
              tableReservationId: json.data.tableReservationId,
              tableId: json.data.tableId,
              tableNumber: json.data.tableNumber,
              guestCount: json.data.guestCount,
              reservationTime: json.data.reservationTime,
              status: json.data.status,
              note: json.data.note,
              createdAt: json.data.createdAt,
            },
            ...prev.filter((r) => r.tableReservationId !== json.data.tableReservationId)
          ]);
        }
        // Đặt thành công: Quay trở lại trạng thái chưa chọn bàn để sẵn sàng cho lượt đặt tiếp theo
        setSelectedTableId(null);
        setSelectedDietaryTags([]);
        setCustomDietaryNote("");

        // Trừ số lượng bàn khả dụng & cập nhật lại dữ liệu từ Database
        fetchTableAvailability();
        fetchMyReservations();
      }
    } catch {
      setErrorMsg("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f4fbf4] min-h-screen text-slate-800 font-sans antialiased">
      {/* Sidebar của khách hàng theo đúng ảnh */}
      <GuestSidebar />

      {/* Main Content Area */}
      <div className="pl-72">
        {/* Header trên cùng theo đúng ảnh */}
        <GuestHeader />

        <main className="relative pt-24 px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {/* Immersive Dining Hero Section */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white">
            <div
              className="relative h-[360px] md:h-[400px] w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAroyeoZvBCTRIC_emwzZZ8Lq_lEkUmnuQrYKtkZdqQnAjOOn7p8G3Ohrdqz0hkjjTox9oAyrOE6yMWIxZIPuSNCMxO8aRcP7SB2ky0ij-7ux4qX46fwlQXU8e7-oleTq-vMmBhnzYiqd_vLYO8uLHkUZM_4vvvoz_-vQfgwaeidlHpmQcigz1PWuz4tyYWWfjhit2RBndwKuR9_o-6HN_Ur03NCYwtkKFv5I1EEhL2twAFYd3pbAvP')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent flex flex-col justify-end p-8">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                    Ẩm Thực Đẳng Cấp 5 Sao
                  </span>
                  <span className="text-emerald-100 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-cyan-300">water_lux</span>
                    Bãi Trường, Phú Quốc
                  </span>
                  <span className="text-white/60 text-xs">•</span>
                  <span className="text-white/90 text-xs flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-amber-300">star</span>
                    4.9/5.0 (Hơn 580 thực khách đánh giá cao)
                  </span>
                </div>
                <h1
                  className="text-3xl sm:text-4xl text-white font-bold tracking-tight mb-2 drop-shadow-md"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Nhà Hàng Biển Horizon Dining & Grill
                </h1>
                <p className="text-white/90 text-sm sm:text-base max-w-3xl drop-shadow mb-4">
                  Thưởng vị ẩm thực bờ biển nguyên bản hòa quyện cùng mỹ vị Á - Âu đỉnh cao. Tận hưởng khoảnh khắc hoàng hôn tráng lệ trong không gian ngập tràn thanh âm của sóng biển ngọc lục bảo.
                </p>

                {/* Culinary Fast Facts Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">schedule</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/70 uppercase font-semibold">Giờ Phục Vụ</span>
                      <span className="text-sm text-white font-bold">06:30 - 23:00</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">local_bar</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/70 uppercase font-semibold">Phong Cách</span>
                      <span className="text-sm text-white font-bold">Ẩm Thực Cao Cấp & Hải Sản Tươi</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">styler</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/70 uppercase font-semibold">Trang Phục</span>
                      <span className="text-sm text-white font-bold">Lịch Lãm / Trang Nhã</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/70 uppercase font-semibold">Đặc Quyền Lưu Trú</span>
                      <span className="text-sm text-white font-bold">Ưu Tiên Vị Trí Sát Biển</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error alert if any */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Main Booking Console Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 4-Step Interactive Configuration Form */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* STEP 1: Select Date & Meal Period */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      1
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Chọn Ngày & Buổi Thưởng Vị</h2>
                      <p className="text-xs text-slate-500">Thực đơn được thiết kế riêng theo từng khung thời gian trong ngày</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Hôm nay: Ngày {new Date().getDate()}/{new Date().getMonth() + 1}/{new Date().getFullYear()}
                  </span>
                </div>

                {/* Date Fast Selector */}
                <div className="mb-6">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    Chọn Ngày Đến Thưởng Thức (Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()})
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { day: "Hôm nay", date: "16", note: "Còn bàn" },
                      { day: "T.Bảy", date: "17", note: "Còn bàn" },
                      { day: "C.Nhật", date: "18", note: "Được chọn nhiều" },
                      { day: "T.Hai", date: "19", note: "Còn trống" },
                      { day: "T.Ba", date: "20", note: "Còn trống" },
                      { day: "T.Tư", date: "21", note: "Còn trống" },
                    ].map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDate(d.date)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                          selectedDate === d.date
                            ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)] scale-[1.02]"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`text-[11px] ${selectedDate === d.date ? "text-white/80" : "text-slate-400"}`}>
                          {d.day}
                        </span>
                        <span className="text-lg font-bold">{d.date}</span>
                        <span
                          className={`text-[10px] font-medium ${
                            selectedDate === d.date
                              ? "text-white/90"
                              : "text-emerald-600"
                          }`}
                        >
                          {d.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Period Options */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    Chọn Buổi Ẩm Thực
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label
                      onClick={() => {
                        setMealPeriod("breakfast");
                        const firstSlot = MEAL_PERIOD_TIME_SLOTS.breakfast[0]?.time;
                        if (firstSlot) setSelectedTime(firstSlot);
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col ${
                        mealPeriod === "breakfast"
                          ? "border-emerald-600 bg-emerald-50/20 shadow-sm"
                          : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${mealPeriod === "breakfast" ? "text-emerald-700" : "text-slate-800"}`}>
                          Bữa Sáng Buffet
                        </span>
                        <span className="material-symbols-outlined text-slate-400">bakery_dining</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mb-1">06:30 - 10:30 • Grand Horizon Lounge</span>
                      <p className="text-xs text-slate-500 mb-3">Ẩm thực quốc tế không giới hạn, quầy bánh thủ công Pháp và đặc sản Phú Quốc.</p>
                      <span className="text-xs text-emerald-700 font-semibold mt-auto">Bao gồm trong gói lưu trú</span>
                    </label>

                    <label
                      onClick={() => {
                        setMealPeriod("lunch");
                        const firstSlot = MEAL_PERIOD_TIME_SLOTS.lunch[0]?.time;
                        if (firstSlot) setSelectedTime(firstSlot);
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col ${
                        mealPeriod === "lunch"
                          ? "border-emerald-600 bg-emerald-50/20 shadow-sm"
                          : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${mealPeriod === "lunch" ? "text-emerald-700" : "text-slate-800"}`}>
                          Bữa Trưa Hải Sản
                        </span>
                        <span className="material-symbols-outlined text-slate-400">set_meal</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mb-1">11:30 - 15:00 • Nướng Than Bờ Biển</span>
                      <p className="text-xs text-slate-500 mb-3">Hải sản tươi sống đánh bắt trong ngày nướng bơ tỏi, sò điệp nướng mỡ hành.</p>
                      <span className="text-xs text-slate-700 font-semibold mt-auto">À la carte / Set Menu</span>
                    </label>

                    <label
                      onClick={() => {
                        setMealPeriod("dinner");
                        const firstSlot = MEAL_PERIOD_TIME_SLOTS.dinner[3]?.time || MEAL_PERIOD_TIME_SLOTS.dinner[0]?.time;
                        if (firstSlot) setSelectedTime(firstSlot);
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col ${
                        mealPeriod === "dinner"
                          ? "border-emerald-600 bg-emerald-50/30 shadow-sm"
                          : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-emerald-800">Bữa Tối Thượng Hạng</span>
                        <span className="material-symbols-outlined text-emerald-700">candle</span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium mb-1">17:30 - 22:30 • Ngắm Hoàng Hôn Lãng Mạn</span>
                      <p className="text-xs text-slate-500 mb-3">Bò Wagyu thượng hạng, tôm hùm sốt nấm truffle, rượu vang hảo hạng tinh tế.</p>
                      <span className="text-xs text-emerald-700 font-bold mt-auto flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                        Trải nghiệm được yêu thích nhất
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* STEP 2: Time Slot Selector - Dữ liệu bàn trống hiển thị và trừ từ Database */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      2
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">
                        Chọn Khung Giờ Khả Dụng ({mealPeriod === "breakfast" ? "Bữa Sáng: 06:30 - 10:30" : mealPeriod === "lunch" ? "Bữa Trưa: 11:30 - 15:00" : "Bữa Tối: 17:30 - 22:30"})
                      </h2>
                      <p className="text-xs text-slate-500">
                        {isFetchingAvailability
                          ? "Đang tải dữ liệu số lượng bàn trống thực tế..."
                          : `Hệ thống ghi nhận còn ${availableData.availableCount}/${availableData.totalTables} bàn phù hợp (${guestCount} khách)`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                    Giữ bàn 15 phút
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {(MEAL_PERIOD_TIME_SLOTS[mealPeriod] || MEAL_PERIOD_TIME_SLOTS.dinner).map((ts) => {
                    const isSelected = selectedTime === ts.time;
                    const isAvailable = availableData.availableCount > 0;
                    return (
                      <button
                        key={ts.time}
                        type="button"
                        onClick={() => setSelectedTime(ts.time)}
                        className={`p-3.5 rounded-xl transition-all flex flex-col items-center gap-0.5 relative ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]"
                            : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-base font-bold">{ts.time}</span>
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "text-white/90 font-medium"
                              : isAvailable
                              ? "text-emerald-700 font-semibold"
                              : "text-rose-600 font-medium"
                          }`}
                        >
                          {isSelected
                            ? "Đang chọn"
                            : isAvailable
                            ? `Còn ${availableData.availableCount} bàn`
                            : "Hết bàn"}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[10px]">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* STEP 3: Party Size & Table Type - Chặn min/max nghiêm ngặt theo loại bàn */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      3
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Số Lượng Thực Khách & Loại Hình</h2>
                      <p className="text-xs text-slate-500">Giới hạn số khách tự động áp dụng theo tiêu chuẩn sức chứa từng loại bàn</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                    {selectedTableId ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">table_bar</span>
                        Khóa theo bàn {(availableData.tables || []).find((t) => t.tableId === selectedTableId)?.tableNumber}: {guestCount} chỗ
                      </span>
                    ) : (
                      `Giới hạn: ${TABLE_TYPE_RANGES[tableType]?.desc}`
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Counter Block */}
                  <div className="md:col-span-6 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tổng Số Khách</span>
                      <span className="text-xs text-emerald-700 font-medium">
                        Khoảng cho phép: {TABLE_TYPE_RANGES[tableType]?.min} - {TABLE_TYPE_RANGES[tableType]?.max} khách
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                      <button
                        type="button"
                        disabled={guestCount <= (TABLE_TYPE_RANGES[tableType]?.min || 1)}
                        onClick={handleDecrementGuests}
                        className="w-9 h-9 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Tối thiểu ${TABLE_TYPE_RANGES[tableType]?.min} người`}
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="text-lg font-bold text-slate-800 w-8 text-center">{guestCount}</span>
                      <button
                        type="button"
                        disabled={guestCount >= (TABLE_TYPE_RANGES[tableType]?.max || 20)}
                        onClick={handleIncrementGuests}
                        className="w-9 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={`Tối đa ${TABLE_TYPE_RANGES[tableType]?.max} người`}
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Character Tags */}
                  <div className="md:col-span-6 flex flex-wrap gap-2">
                    {Object.entries(TABLE_TYPE_RANGES).map(([key, config]) => {
                      const isSelected = tableType === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectTableType(key)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              isSelected ? "text-white" : config.iconColor
                            }`}
                          >
                            {config.icon}
                          </span>
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* STEP 4: Seating Zone Selection */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      4
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Chọn Khu Vực Ưa Thích Kèm Hình Ảnh</h2>
                      <p className="text-xs text-slate-500">Không gian được bài trí tinh xảo để ngắm trọn vẻ đẹp biển đảo</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Giữ chỗ trực quan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Zone 1: Ban Công Hướng Biển */}
                  <label
                    onClick={() => setSeatingZone("terrace")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "terrace"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                        style={{
                          backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBZiN5nHk7MpP8t9CBp3n2tXYPd7840sAD_egx5V0TfSetx0BbBTEeHvoQE0V1BYQWAaI9AoVvJ38VWNEFnx1lkFSMyLmSDZVr73OwZ7UkbQo39nbiUCk7NLwKGUZ0vh_xjhKA8oBUxy1Q7moEY1R3YNe-tAO8sJmKkLR7PMWnov2eGoPlDFHxJvDpwSNJ50kXW07eb_yooRoRq-FvE5bvn-odfG7Sem6S_ZMAc1Clt6w9gEMGQQIPW')",
                        }}
                      ></div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">
                        Được Chọn Nhiều Nhất
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] backdrop-blur-sm">
                        Ban Công Hướng Biển
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Ban Công Hướng Biển</span>
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">beach_access</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Gió biển thoáng mát, view trực diện hoàng hôn biển Phú Quốc.
                      </p>
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mt-auto pt-1 border-t border-slate-100">
                        <span>View biển 180°</span>
                        <span className="font-bold">
                          Còn {availableData.locationStats?.["Ban Công Hướng Biển"]?.available ?? 25} bàn
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Zone 2: Sảnh Trong Nhà VIP */}
                  <label
                    onClick={() => setSeatingZone("indoor")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "indoor"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                        style={{
                          backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD0DYylnYXHU-h3sI-yiS9aTrVpEo_SKIIBi6vcV9GXMDJefK7jzcQMhmtgEfDQy1XAARSORzjKkJkOp8FnwNha_7EUMkkd_iIj9diyMO3HvC8ZZ-ed5W6jv-ZUnkPa-hpm2TJNzwGouGj47C4DdGe0y3VbqFW7mKVxp_OGY7m5uZho2-H7s-YfiQabdG12Ifr96I8j2DNU5R56nm5GSAb-OMVe6Bv6A73MPcv2iBrssKhoEv-GVKkz')",
                        }}
                      ></div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] uppercase font-bold tracking-wider">
                        Máy Lạnh Sang Trọng
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] backdrop-blur-sm">
                        Sảnh Trong Nhà VIP
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Sảnh Trong Nhà VIP</span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">ac_unit</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Điều hòa mát lạnh 23°C, ấm cúng riêng tư và sommelier cá nhân.
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-auto pt-1 border-t border-slate-100">
                        <span>Yên tĩnh cao cấp</span>
                        <span className="text-emerald-700 font-bold">
                          Còn {availableData.locationStats?.["Sảnh Trong Nhà VIP"]?.available ?? 25} bàn
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Zone 3: Sân Vườn Nhiệt Đới */}
                  <label
                    onClick={() => setSeatingZone("garden")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "garden"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                        style={{
                          backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKbCFVDZIegzAxKp7lwaqOXpwUWGfmGCai1dBzlHXRoEzZ8x-fnzOoyQ0b66n9MxL4UxxUa6gb4oH3nu8dsAKb9w67DpiqbQUd0fd8mTq4uIWTxhGLeBYKH_cGNXQCB4zv-b0JjZ2HTgi8D3aPujF9Afq9Fg-Zhxp3qYFsa5QDfzugysE86Sq_weIMuckeM0hQY_Q9PuoLSobzQwLGivSllt4BIydG8gQEE5B5mZVHDM_cJ3d_clVj')",
                        }}
                      ></div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] uppercase font-bold tracking-wider">
                        Không Gian Xanh
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] backdrop-blur-sm">
                        Sân Vườn Nhiệt Đới
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Sân Vườn Nhiệt Đới</span>
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">park</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Hòa quyện cỏ cây nhiệt đới tươi xanh ngát và ánh đèn lãng mạn.
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-auto pt-1 border-t border-slate-100">
                        <span>Thiên nhiên thư thái</span>
                        <span className="text-emerald-700 font-bold">
                          Còn {availableData.locationStats?.["Sân Vườn Nhiệt Đới"]?.available ?? 25} bàn
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Zone 4: Khu Bể Bơi Rooftop */}
                  <label
                    onClick={() => setSeatingZone("rooftop")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "rooftop"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-32 w-full overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                        style={{
                          backgroundImage:
                            "url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop')",
                        }}
                      ></div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] uppercase font-bold tracking-wider">
                        Rooftop Sky View
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] backdrop-blur-sm">
                        Khu Bể Bơi Rooftop
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Khu Bể Bơi Rooftop</span>
                        <span className="material-symbols-outlined text-purple-600 text-[18px]">pool</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Tầng thượng ngắm toàn cảnh vịnh biển và hồ bơi chân mây huyền ảo.
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-auto pt-1 border-t border-slate-100">
                        <span>Sky View 360°</span>
                        <span className="text-emerald-700 font-bold">
                          Còn {availableData.locationStats?.["Khu Bể Bơi Rooftop"]?.available ?? 25} bàn
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* SƠ ĐỒ CHỌN BÀN TRỰC TIẾP TỪ DATABASE (CỘT TableNumber, Capacity, Location) */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">table_bar</span>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Danh Sách Bàn Thực Tế Trong Database ({getZoneDbLocation(seatingZone)})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Trống (Khả dụng)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Đã có khách đặt
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 ring-2 ring-emerald-500"></span> Đang chọn
                      </span>
                    </div>
                  </div>

                  {/* Lọc danh sách bàn thuộc khu vực đang chọn */}
                  {(() => {
                    const currentDbLocation = getZoneDbLocation(seatingZone);
                    const zoneTables = (availableData.tables || []).filter(
                      (t) => t.location === currentDbLocation
                    );

                    if (zoneTables.length === 0) {
                      return (
                        <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl">
                          Đang tải sơ đồ các bàn từ hệ thống...
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-slate-100">
                          {zoneTables.map((tbl) => {
                            const isChosen = selectedTableId === tbl.tableId;
                            const isAvailable = tbl.isAvailable;
                            const isBooked = tbl.isBooked;

                            return (
                              <button
                                key={tbl.tableId}
                                type="button"
                                disabled={isBooked}
                                onClick={() => {
                                  if (isChosen) {
                                    setSelectedTableId(null);
                                  } else {
                                    setSelectedTableId(tbl.tableId);
                                    // Tự động đồng bộ số lượng khách và loại bàn khớp với sức chứa của bàn được chọn
                                    setGuestCount(tbl.capacity);
                                    if (tbl.capacity <= 2) {
                                      setTableType("couple");
                                    } else if (tbl.capacity <= 4) {
                                      setTableType("standard");
                                    } else if (tbl.capacity <= 6) {
                                      setTableType("family");
                                    } else {
                                      setTableType("vip");
                                    }
                                  }
                                }}
                                className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all text-center relative ${
                                  isChosen
                                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.05] z-10"
                                    : isBooked
                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed border border-dashed border-slate-200"
                                    : isAvailable
                                    ? "bg-white text-slate-700 hover:border-emerald-500 hover:shadow-sm border border-slate-200/80"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                                title={`${tbl.tableNumber} - ${tbl.capacity} chỗ (${tbl.location}) - ${
                                  isBooked ? "Đã có khách đặt" : "Bàn trống"
                                }`}
                              >
                                <span className="font-mono text-xs font-bold">{tbl.tableNumber}</span>
                                <span className={`text-[9px] ${isChosen ? "text-white/80" : "text-slate-400"}`}>
                                  {tbl.capacity} ghế
                                </span>
                                {isChosen && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                          <span>
                            {selectedTableId ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                Đã chọn đích danh bàn:{" "}
                                <strong>
                                  {(availableData.tables || []).find((t) => t.tableId === selectedTableId)?.tableNumber}
                                </strong>{" "}
                                ({(availableData.tables || []).find((t) => t.tableId === selectedTableId)?.capacity} ghế)
                              </span>
                            ) : (
                              "Chưa chọn bàn cụ thể: Hệ thống sẽ tự động gán bàn trống tốt nhất phù hợp với bạn."
                            )}
                          </span>
                          {selectedTableId && (
                            <button
                              type="button"
                              onClick={() => setSelectedTableId(null)}
                              className="text-slate-400 hover:text-slate-600 underline text-[11px]"
                            >
                              Bỏ chọn bàn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>

              {/* Dietary Preferences & Special Occasion Notes */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">room_service</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Ghi Chú Yêu Cầu Ẩm Thực & Dị Ứng</h2>
                    <p className="text-xs text-slate-500">Bếp trưởng sẽ trực tiếp điều chỉnh công thức để trải nghiệm của quý khách trọn vẹn nhất</p>
                  </div>
                </div>

                {/* Quick Tags - Toggle chọn / bỏ chọn và đổi màu trực quan */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      Chọn Nhanh Yêu Cầu Phổ Biến (Nhấp để Bật / Tắt)
                    </label>
                    {selectedDietaryTags.length > 0 && (
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Đã chọn {selectedDietaryTags.length} yêu cầu
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_DIETARY_TAGS.map((tag) => {
                      const isActive = selectedDietaryTags.some((t) => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleDietaryTag(tag)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                            isActive
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20 scale-[1.02]"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[15px] ${
                              isActive ? "text-white" : "text-emerald-700"
                            }`}
                          >
                            {tag.icon}
                          </span>
                          <span>{tag.label}</span>
                          {isActive && (
                            <span className="material-symbols-outlined text-[14px] text-white">check</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Textarea */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2" htmlFor="specialNotes">
                    Ghi Chú Chi Tiết Khác Cho Bếp Trưởng (Tùy Chọn)
                  </label>
                  <textarea
                    id="specialNotes"
                    rows={3}
                    value={customDietaryNote}
                    onChange={(e) => setCustomDietaryNote(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Nhập thêm yêu cầu riêng nếu có (Ví dụ: Thêm nến thơm, không ăn cay...)"
                  ></textarea>

                  {/* Preview ghi chú đầy đủ hệ thống sẽ lưu */}
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-slate-600 flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">assignment</span>
                    <div>
                      <strong className="text-slate-700 font-semibold">Nội dung ghi chú gửi đến bếp: </strong>
                      <span className="italic text-slate-600">"{specialNotes}"</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Reservation Summary Sticky Ledger */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 relative overflow-hidden">
                {/* Visual Mini Header */}
                <div className="relative h-28 -mx-6 -mt-6 mb-4 overflow-hidden">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCi-yZmRzW3rA99dbTUulxUSL46F4qNZcyDccM6LauKxbA3D_X4BKWiRH7LyjIxpcD01WwX9-VxJtlLoHqcAuLjU83sK319BxQn19pEcw3emqhLbDm49h75BeTG80tOGSN1jWr5-Ev4-j4Sh1UOIIF0qhC9A9x0V9-dhKr7sShAzuSa7nR4qozB3OdszP2YyoggCWKfDj_LP9olqcEorddyKDzZAHvbSNtEZnHZfBAIsqOz1S6rkOb_')",
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
                  <div className="absolute bottom-2 left-6">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">
                      Tóm Tắt Đặt Chỗ
                    </span>
                  </div>
                </div>

                {/* Table Information */}
                <div className="mb-4 pb-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Nhà Hàng</span>
                      <h3 className="text-base font-bold text-slate-800">Horizon Dining & Grill</h3>
                      <p className="text-xs text-slate-500">
                        {getZoneDbLocation(seatingZone)} • {TABLE_TYPE_RANGES[tableType]?.tag}
                      </p>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        {selectedTableId
                          ? `Đã chọn: ${(availableData.tables || []).find((t) => t.tableId === selectedTableId)?.tableNumber} (${(availableData.tables || []).find((t) => t.tableId === selectedTableId)?.capacity} chỗ)`
                          : "Hệ thống tự động điều phối bàn phù hợp"}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[20px]">deck</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Grid Meta */}
                <div className="flex flex-col gap-2.5 mb-6 text-sm">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">calendar_today</span>
                      Ngày Thưởng Thức
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedDate}/{new Date().getMonth() + 1}/{new Date().getFullYear()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">schedule</span>
                      Buổi Ăn & Giờ Đến
                    </span>
                    <span className="font-bold text-emerald-700">
                      {mealPeriod === "breakfast" ? "Bữa Sáng" : mealPeriod === "lunch" ? "Bữa Trưa" : "Bữa Tối Thượng Hạng"} ({selectedTime})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">people</span>
                      Số Lượng Thực Khách
                    </span>
                    <span className="font-semibold text-slate-800">
                      {guestCount < 10 ? `0${guestCount}` : guestCount} Khách ({TABLE_TYPE_RANGES[tableType]?.desc})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">chair</span>
                      Khu Vực Chỉ Định
                    </span>
                    <span className="font-medium text-slate-800">
                      {getZoneDbLocation(seatingZone)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">table_restaurant</span>
                      Tình Trạng Khả Dụng
                    </span>
                    <span className="font-bold text-emerald-700">
                      {selectedTableId ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Đã chọn bàn riêng (Sẵn sàng)
                        </span>
                      ) : (
                        `Còn ${availableData.locationStats?.[getZoneDbLocation(seatingZone)]?.available ?? availableData.availableCount} bàn trống`
                      )}
                    </span>
                  </div>
                </div>

                {/* Dynamic Room Folio Integration Option */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">hotel</span>
                      <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Hồ Sơ Lưu Trú Phòng</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] uppercase font-bold">
                      Khách Đang Ở
                    </span>
                  </div>

                  {activeStays.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">
                            Phòng {selectedStay?.roomNumber || "Chưa chọn"}
                          </span>
                          <span className="text-xs text-slate-500">
                            Khách: {selectedStay?.guestName || currentUser?.FullName || "Quý khách"}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roomFolio}
                            onChange={(e) => setRoomFolio(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* Dropdown chọn phòng nhanh nếu có nhiều phòng active */}
                      {activeStays.length > 1 && (
                        <div className="mt-1">
                          <label className="text-[10px] text-slate-400 block mb-1">Đổi phòng lưu trú:</label>
                          <select
                            value={selectedStay?.stayId || ""}
                            onChange={(e) => {
                              const st = activeStays.find((s) => String(s.stayId) === e.target.value);
                              if (st) handleStayChange(st);
                            }}
                            className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            {activeStays.slice(0, 15).map((st) => (
                              <option key={st.stayId} value={st.stayId}>
                                Phòng {st.roomNumber} - {st.guestName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">
                      Đang đồng bộ thông tin phòng lưu trú từ PMS...
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2">
                    Hóa đơn ăn uống sẽ được tự động ghi nợ vào Master Folio của phòng khi dùng bữa xong.
                  </p>
                </div>

                {/* Cancellation Policy Notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/50 mb-5 text-slate-600">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0">info</span>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-slate-800">Chính sách hủy linh hoạt:</span> Quý khách có thể thay đổi hoặc hủy bàn miễn phí trước 2 giờ trước giờ hẹn.
                  </p>
                </div>

                {/* Primary Call-to-Actions */}
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={loading || availableData.availableCount === 0}
                    onClick={handleConfirmReservation}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">restaurant</span>
                    {loading
                      ? "Đang xử lý đặt bàn..."
                      : availableData.availableCount === 0
                      ? "Hết bàn trong khung giờ này"
                      : "Xác Nhận Đặt Bàn Ngay"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(true)}
                    className="w-full py-2.5 px-6 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">bookmark_added</span>
                    <span>Xem Bàn Đã Đặt Của Quý Khách</span>
                    {myReservations.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        {myReservations.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Concierge Direct Dial */}
                <div className="text-center mt-4">
                  <a href="tel:3301" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                    <span className="material-symbols-outlined text-[15px]">call</span>
                    Cần hỗ trợ riêng? Gọi Quầy Concierge (Máy nhánh #3301)
                  </a>
                </div>
              </div>

              {/* Live Kitchen Chef Special Widget */}
              <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center shrink-0 shadow-sm"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDtirABJV3zkpO8gVAhEj7QxUbS9OJUtpt7mApMGy4jW2yStxs6k7R34lj07htxkEn7efrY5j7pTSwgsuxjLvastIf66yc5xsotcfcd8WUrKxQX9skHfJUUkNBfjuqbFVTH2mS67CLl02scPyJt5c_KBN9enSZN5UBSlAfXkB9-Zr3VYm0y0Hn_Oos72MAMhKHsuxcETYvmsWo0mW9EoagBflBS8DxvLwkLZUQ7DT9AJXwtNIFnFC93')",
                  }}
                ></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Gợi Ý Từ Bếp Trưởng Pierre Tuấn</span>
                  <span className="text-sm font-bold text-slate-800">Cua Hoàng Đế Nướng Tiêu Phú Quốc</span>
                  <span className="text-xs text-slate-500">Đặc sản tiêu chín đỏ vườn đảo kết hợp sốt rượu vang trắng</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>
            <span className="text-xs text-emerald-700 uppercase tracking-wider font-bold mb-1">Đặt Bàn Thành Công</span>
            <h3
              className="text-2xl font-bold text-slate-800 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Grand Horizon Hân Hạnh Đón Tiếp!
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              Bàn <strong className="text-slate-800">{reservationResult?.tableNumber || "Horizon #VIP"}</strong> ({getZoneDbLocation(seatingZone)}) đã được phong tỏa và lưu vào hệ thống cho quý khách lúc{" "}
              <strong className="text-slate-800">
                {selectedTime} ngày {selectedDate}/{new Date().getMonth() + 1}/{new Date().getFullYear()}
              </strong>. Mã xác nhận:{" "}
              <span className="font-mono font-bold text-emerald-700">
                #GHR-DINE-{reservationResult?.tableReservationId || "8829"}
              </span>.
            </p>
            <div className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6 text-left flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Thực khách:</span>
                <span className="font-bold text-slate-800">
                  {selectedStay?.guestName || currentUser?.FullName || "Quý Khách"} (Phòng {selectedStay?.roomNumber || "Standard"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số lượng khách:</span>
                <span className="font-bold text-slate-800">
                  {guestCount < 10 ? `0${guestCount}` : guestCount} Người ({TABLE_TYPE_RANGES[tableType]?.desc})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bàn được phân bổ:</span>
                <span className="font-bold text-emerald-700">
                  {reservationResult?.tableNumber || "Bàn tự động gán"} ({getZoneDbLocation(seatingZone)})
                </span>
              </div>
              {specialNotes && (
                <div className="flex flex-col mt-1 pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Ghi chú bếp trưởng:</span>
                  <span className="font-medium text-slate-700 italic">"{specialNotes}"</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setShowHistoryDrawer(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all text-sm"
            >
              Hoàn Tất & Xem Danh Sách Bàn Đã Đặt
            </button>
          </div>
        </div>
      )}

      {/* Drawer Danh Sách Lượt Đặt Bàn Thực Tế Trong Database */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">table_restaurant</span>
                <h3 className="text-lg font-bold text-slate-800">Bàn Ăn Của Quý Khách</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
              {myReservations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[48px] text-slate-300">event_busy</span>
                  <p className="text-sm">Quý khách chưa có lượt đặt bàn nào.</p>
                </div>
              ) : (
                myReservations.map((res) => {
                  const justBookedId = reservationResult?.tableReservationId || Number(localStorage.getItem("just_booked_table_res_id") || 0);
                  const isJustBooked = Boolean(
                    justBookedId && (
                      res.tableReservationId === justBookedId ||
                      (res.tableNumber === reservationResult?.tableNumber && res.status === 'Confirmed')
                    )
                  );

                  return (
                    <div
                      key={res.tableReservationId}
                      className={`p-4 rounded-xl flex flex-col gap-2 transition-all ${
                        isJustBooked
                          ? "bg-emerald-50/80 border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/10"
                          : "bg-slate-50 border border-slate-200/80 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            isJustBooked ? "bg-emerald-600 text-white" : "text-emerald-700 bg-emerald-100/70"
                          }`}>
                            #RES-{res.tableReservationId}
                          </span>
                          {isJustBooked && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              Vừa đặt xong
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            res.status === "Confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : res.status === "Completed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {res.status === "Confirmed"
                            ? "✓ Đã xác nhận"
                            : res.status === "Completed"
                            ? "Đã phục vụ"
                            : res.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isJustBooked ? "text-emerald-900 text-base" : "text-slate-800"}`}>
                            {res.tableNumber}
                          </span>
                          {res.location && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 text-slate-600 font-medium">
                              {res.location}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-700 font-bold">{res.guestCount} Khách</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-slate-600">
                          <span className="material-symbols-outlined text-[15px] text-emerald-600">schedule</span>
                          {new Date(res.reservationTime).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </span>
                        {res.customerName && (
                          <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                            {res.customerName}
                          </span>
                        )}
                      </div>

                      {res.note && (
                        <div className={`text-xs p-2 rounded-lg border italic ${
                          isJustBooked
                            ? "text-emerald-800 bg-white border-emerald-200 font-medium"
                            : "text-slate-600 bg-white border-slate-100"
                        }`}>
                          "{res.note}"
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
