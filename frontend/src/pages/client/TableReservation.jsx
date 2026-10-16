import React, { useState, useEffect } from "react";
import GuestSidebar from "../../components/layout/GuestSidebar";
import GuestHeader from "../../components/layout/GuestHeader";

const timeSlots = [
  { time: "18:00", label: "Còn 8 bàn", alert: false },
  { time: "18:30", label: "Còn 4 bàn", alert: false },
  { time: "19:00", label: "Hot • Còn 2 bàn", alert: true },
  { time: "19:30", label: "Còn 5 bàn", alert: false },
  { time: "20:00", label: "Còn 9 bàn", alert: false },
  { time: "20:30", label: "Còn 12 bàn", alert: false },
];

export default function TableReservation() {
  const [selectedDate, setSelectedDate] = useState("28");
  const [mealPeriod, setMealPeriod] = useState("dinner");
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [guestCount, setGuestCount] = useState(4);
  const [tableType, setTableType] = useState("family");
  const [seatingZone, setSeatingZone] = useState("terrace");
  const [specialNotes, setSpecialNotes] = useState(
    "Chỗ ngồi trực diện ngắm biển hoàng hôn. Yêu cầu bình hoa tươi mừng kỷ niệm ngày cưới trên bàn trước 19:00. Trong nhóm có 1 người ăn thanh đạm: không dùng mì chính, kiêng hải sản có vỏ."
  );
  const [roomFolio, setRoomFolio] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Lấy danh sách lượt đặt bàn của mình từ Database
  const fetchMyReservations = async () => {
    try {
      const token = localStorage.getItem("hotel_token");
      const res = await fetch("http://localhost:5000/api/v1/table-reservations", {
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

  const handleConfirmReservation = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("hotel_token");
      
      // Tạo ngày đặt trong tương lai hợp lệ (tháng 11 năm 2026 hoặc năm hiện tại)
      const now = new Date();
      let targetYear = now.getFullYear();
      let targetMonth = "11";
      // Nếu hiện tại đã qua năm 2025 thì lấy năm hiện tại hoặc kế tiếp
      if (now.getFullYear() > 2025) {
        targetYear = now.getFullYear();
      } else {
        targetYear = 2026;
      }
      const targetDate = `${targetYear}-${targetMonth}-${selectedDate}T${selectedTime}:00.000Z`;

      const response = await fetch("http://localhost:5000/api/v1/table-reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reservationTime: targetDate,
          guestCount,
          note: specialNotes,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setErrorMsg(json.message || "Không thể đặt bàn lúc này. Vui lòng thử lại.");
      } else {
        setReservationResult(json.data);
        setShowModal(true);
        fetchMyReservations(); // Cập nhật lại lịch sử đặt bàn ngay
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
                    Hôm nay: Thứ Sáu, 28/11/2025
                  </span>
                </div>

                {/* Date Fast Selector */}
                <div className="mb-6">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    Chọn Ngày Đến Thưởng Thức
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { day: "T.Năm", date: "27", note: "Hết bàn sớm", disabled: true },
                      { day: "T.Sáu", date: "28", note: "Hôm Nay", current: true },
                      { day: "T.Bảy", date: "29", note: "Còn 6 bàn" },
                      { day: "C.Nhật", date: "30", note: "Còn 12 bàn" },
                      { day: "T.Hai", date: "01", note: "Còn 15 bàn" },
                      { day: "T.Ba", date: "02", note: "Còn 18 bàn" },
                    ].map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDate(d.date)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                          selectedDate === d.date
                            ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
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
                              : d.disabled
                              ? "text-slate-400"
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
                      onClick={() => setMealPeriod("breakfast")}
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
                      onClick={() => setMealPeriod("lunch")}
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
                      onClick={() => setMealPeriod("dinner")}
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

              {/* STEP 2: Time Slot Selector */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      2
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Chọn Khung Giờ Khả Dụng</h2>
                      <p className="text-xs text-slate-500">Giờ hoàng hôn lý tưởng nhất tại bờ Tây Phú Quốc: 17:45 - 18:30</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">Bàn giữ tối đa 15 phút</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {timeSlots.map((ts) => {
                    const isSelected = selectedTime === ts.time;
                    return (
                      <button
                        key={ts.time}
                        type="button"
                        onClick={() => setSelectedTime(ts.time)}
                        className={`p-3.5 rounded-xl transition-all flex flex-col items-center gap-0.5 relative ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-base font-bold">{ts.time}</span>
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "text-white/90 font-medium"
                              : ts.alert
                              ? "text-rose-600 font-medium"
                              : "text-slate-400"
                          }`}
                        >
                          {isSelected ? "Đang chọn" : ts.label}
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

              {/* STEP 3: Party Size & Table Type */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Số Lượng Thực Khách & Loại Hình</h2>
                    <p className="text-xs text-slate-500">Bố trí chỗ ngồi và chuẩn bị bộ đồ ăn chuẩn mực theo phong vị châu Âu</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Counter Block */}
                  <div className="md:col-span-6 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tổng Số Khách</span>
                      <span className="text-xs text-slate-500">Bao gồm người lớn & trẻ em</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-9 h-9 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="text-lg font-bold text-slate-800 w-8 text-center">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                        className="w-9 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Character Tags */}
                  <div className="md:col-span-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTableType("couple")}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        tableType === "couple"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-rose-500">favorite</span>
                      Bàn Đôi Lãng Mạn (2 người)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableType("family")}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        tableType === "family"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-300">group</span>
                      Bàn Gia Đình Thân Mật (4 - 6 người)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableType("vip")}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        tableType === "vip"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">domain_verification</span>
                      Tiệc Doanh Nhân / VIP (&gt;8 người)
                    </button>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Zone 1: Ocean Terrace */}
                  <label
                    onClick={() => setSeatingZone("terrace")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "terrace"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-36 w-full overflow-hidden">
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
                        Bàn B-01 đến B-12
                      </span>
                    </div>
                    <div className="p-3.5 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Ngoài Trời Sát Biển</span>
                        <span className="material-symbols-outlined text-emerald-600 text-[20px]">beach_access</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Không gian thoáng đãng ngoài ban công sát mép sóng, ngắm trọn hoàng hôn và nghe tiếng sóng vỗ rì rào.
                      </p>
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mt-auto">
                        <span>View biển 180° thoáng đãng</span>
                        <span className="font-bold">Terrace B-04</span>
                      </div>
                    </div>
                  </label>

                  {/* Zone 2: Indoor Lounge */}
                  <label
                    onClick={() => setSeatingZone("indoor")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "indoor"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-36 w-full overflow-hidden">
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
                        Sảnh Chính L-01 - L-10
                      </span>
                    </div>
                    <div className="p-3.5 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Trong Sảnh Cổ Điển</span>
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">ac_unit</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Nhiệt độ điều hòa mát lạnh 23°C lý tưởng, âm nhạc violin du dương cổ điển và dịch vụ sommelier cá nhân.
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
                        <span>Yên tĩnh & riêng tư</span>
                        <span className="text-slate-600 font-semibold">Còn 5 bàn</span>
                      </div>
                    </div>
                  </label>

                  {/* Zone 3: Window */}
                  <label
                    onClick={() => setSeatingZone("window")}
                    className={`cursor-pointer rounded-xl overflow-hidden border transition-all flex flex-col ${
                      seatingZone === "window"
                        ? "border-emerald-600 shadow-sm ring-2 ring-emerald-600/20"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                        style={{
                          backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKbCFVDZIegzAxKp7lwaqOXpwUWGfmGCai1dBzlHXRoEzZ8x-fnzOoyQ0b66n9MxL4UxxUa6gb4oH3nu8dsAKb9w67DpiqbQUd0fd8mTq4uIWTxhGLeBYKH_cGNXQCB4zv-b0JjZ2HTgi8D3aPujF9Afq9Fg-Zhxp3qYFsa5QDfzugysE86Sq_weIMuckeM0hQY_Q9PuoLSobzQwLGivSllt4BIydG8gQEE5B5mZVHDM_cJ3d_clVj')",
                        }}
                      ></div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-700 text-white text-[10px] uppercase font-bold tracking-wider">
                        Cửa Kính Toàn Cảnh
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] backdrop-blur-sm">
                        Dãy Kính W-01 - W-08
                      </span>
                    </div>
                    <div className="p-3.5 flex flex-col flex-1 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800">Cạnh Kính Hoàng Hôn</span>
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">window</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Tầm nhìn vô cực ra bãi biển nhưng hoàn toàn êm ái trong sảnh kính chống tia UV, không bị ảnh hưởng gió biển.
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
                        <span>Tránh gió & mát mẻ</span>
                        <span className="text-slate-600 font-semibold">Còn 3 bàn</span>
                      </div>
                    </div>
                  </label>
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

                {/* Quick Tags */}
                <div className="mb-4">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    Chọn Nhanh Yêu Cầu Phổ Biến
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: "celebration", label: "Kỷ niệm ngày cưới (Bố trí hoa tươi)", active: true },
                      { icon: "no_food", label: "Không dùng bột ngọt (No MSG)", active: true },
                      { icon: "set_meal", label: "Dị ứng hải sản có vỏ (Tôm/Cua)", active: true },
                      { label: "+ Ghế ăn cho trẻ sơ sinh" },
                      { label: "+ Bánh kem sinh nhật chúc mừng" },
                    ].map((tag, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          tag.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tag.icon && <span className="material-symbols-outlined text-[15px]">{tag.icon}</span>}
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detailed Textarea */}
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2" htmlFor="specialNotes">
                    Chi Tiết Ghi Chú Đặc Biệt Cho Bếp Trưởng
                  </label>
                  <textarea
                    id="specialNotes"
                    rows={3}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Ví dụ: Chuẩn bị bình hoa hồng kèm lời chúc..."
                  ></textarea>
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
                      <p className="text-xs text-slate-500">Bàn Ngoài Trời Terrace • Mã: #B-04</p>
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
                    <span className="font-semibold text-slate-800">{selectedDate}/11/2025</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">schedule</span>
                      Buổi Ăn & Giờ Đến
                    </span>
                    <span className="font-bold text-emerald-700">Bữa Tối Thượng Hạng ({selectedTime})</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">people</span>
                      Số Lượng Thực Khách
                    </span>
                    <span className="font-semibold text-slate-800">
                      {guestCount < 10 ? `0${guestCount}` : guestCount} Khách (Bàn Gia Đình)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">chair</span>
                      Khu Vực Chỉ Định
                    </span>
                    <span className="font-medium text-slate-800">
                      {seatingZone === "terrace"
                        ? "Ban Công Sát Biển (B-04)"
                        : seatingZone === "indoor"
                        ? "Sảnh Lạnh Cổ Điển"
                        : "Cạnh Kính Hoàng Hôn"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">card_giftcard</span>
                      Dịp Kỷ Niệm
                    </span>
                    <span className="font-medium text-rose-600">Kỷ Niệm Ngày Cưới</span>
                  </div>
                </div>

                {/* Room Folio Integration Option */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">hotel</span>
                      <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Hồ Sơ Lưu Trú Phòng</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] uppercase font-bold">
                      VIP Titan
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">Phòng 804 - Sunset Villa</span>
                      <span className="text-xs text-slate-500">Khách: Ông Arthur Dent</span>
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
                  <p className="text-[11px] text-slate-400 mt-2">
                    Hóa đơn ăn uống sẽ được tự động ghi nợ vào Master Folio khi dùng bữa xong.
                  </p>
                </div>

                {/* Cancellation Policy Notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/50 mb-5 text-slate-600">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0">info</span>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-slate-800">Chính sách hủy linh hoạt:</span> Quý khách có thể thay đổi hoặc hủy bàn miễn phí trước 2 giờ (trước 17:00 ngày 28/11/2025). Không áp dụng phụ phí đặt cọc.
                  </p>
                </div>

                {/* Primary Call-to-Actions */}
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirmReservation}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">restaurant</span>
                    {loading ? "Đang xử lý đặt bàn..." : "Xác Nhận Đặt Bàn Ngay"}
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
              Bàn ngoài trời <strong className="text-slate-800">Terrace B-04</strong> đã được phong tỏa sẵn cho quý khách lúc{" "}
              <strong className="text-slate-800">{selectedTime} ngày {selectedDate}/11/2025</strong>. Mã xác nhận:{" "}
              <span className="font-mono font-bold text-emerald-700">
                #GHR-DINE-{reservationResult?.tableReservationId || "8829"}
              </span>.
            </p>
            <div className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6 text-left flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Thực khách:</span>
                <span className="font-bold text-slate-800">Arthur Dent (Phòng 804)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số lượng:</span>
                <span className="font-bold text-slate-800">{guestCount < 10 ? `0${guestCount}` : guestCount} Người</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dịch vụ đặc biệt:</span>
                <span className="font-bold text-emerald-700">Hoa tươi kỷ niệm ngày cưới</span>
              </div>
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
                myReservations.map((res) => (
                  <div
                    key={res.tableReservationId}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                        #RES-{res.tableReservationId}
                      </span>
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
                      <span className="font-bold text-slate-800">{res.tableNumber}</span>
                      <span className="text-slate-500 font-medium">{res.guestCount} Người</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600">schedule</span>
                      <span>{new Date(res.reservationTime).toLocaleString("vi-VN")}</span>
                    </div>

                    {res.note && (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                        "{res.note}"
                      </div>
                    )}
                  </div>
                ))
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
