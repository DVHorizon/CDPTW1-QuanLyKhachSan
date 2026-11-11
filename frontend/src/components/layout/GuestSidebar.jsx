import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GuestSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stayInfo, setStayInfo] = useState(null);

  useEffect(() => {
    const fetchGuestStay = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const uid = user?.id || user?.UserId || user?.userId;
        const queryParam = uid ? `?userId=${uid}&userOnly=true` : "";
        const res = await fetch(
          `http://localhost:5000/api/v1/fnb-orders/active-stays${queryParam}`,
          { headers },
        );
        const json = await res.json();
        if (
          json &&
          json.success &&
          Array.isArray(json.data) &&
          json.data.length > 0
        ) {
          const matched = uid
            ? json.data.find((s) => String(s.userId) === String(uid))
            : null;
          setStayInfo(matched || json.data[0]);
        }
      } catch (err) {
        console.error("Failed to load guest stay info for sidebar:", err);
      }
    };
    fetchGuestStay();
  }, [user]);

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
      isActive
        ? "bg-emerald-500 text-white font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center gap-3 bg-white">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="material-symbols-outlined text-white text-[22px]">
              hotel_class
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-emerald-800 tracking-tight truncate">
              GRAND HORIZON
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase truncate">
              Khách Sạn & Nghỉ Dưỡng Phú Quốc
            </span>
          </div>
        </div>

        {/* Thông tin phòng & lưu trú của khách */}
        <div className="px-3 py-2">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">
                Kỳ Nghỉ Của Quý Khách
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {stayInfo ? "Đang Lưu Trú" : "Đặt Phòng Trực Tuyến"}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-800 truncate">
              {stayInfo
                ? `Phòng #${stayInfo.roomNumber}`
                : "Standard Garden Villa"}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>
                {stayInfo ? `Tầng ${stayInfo.floor || 5}` : "Khu Nghỉ Dưỡng"}
              </span>
              <span className="font-bold text-emerald-700">Tháp B</span>
            </div>
          </div>
        </div>

        {/* Cổng khách hàng & Dịch vụ */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider px-2">
            Dịch Vụ Khách Hàng
          </span>
        </div>
        <nav className="px-3 flex flex-col gap-1">
          <NavLink to="/fnb/dat-ban" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              restaurant
            </span>
            <span className="text-sm">Đặt Bàn Thưởng Vị</span>
          </NavLink>
          <NavLink to="/fnb/history" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              receipt_long
            </span>
            <span className="text-sm">Lịch Sử Gọi Món</span>
          </NavLink>
          <NavLink to="/room-service" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              room_service
            </span>
            <span className="text-sm">Đặt Món Tại Phòng</span>
          </NavLink>
          <NavLink to="/rooms" end className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">bed</span>
            <span className="text-sm">Khám Phá Phòng Nghỉ</span>
          </NavLink>
          <NavLink to="/rooms/compare" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              compare
            </span>
            <span className="text-sm">So Sánh Phòng Nghỉ</span>
          </NavLink>
          <NavLink to="/fnb/danh-gia" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              reviews
            </span>
            <span className="text-sm">Đánh Giá Món Ăn</span>
          </NavLink>
          <NavLink to="/wishlist" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">
              bookmark_heart
            </span>
            <span className="text-sm">Danh Sách Yêu Thích</span>
          </NavLink>
        </nav>
      </div>

      {/* User Card Bottom */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold">
            {user?.fullName ? (
              user.fullName.charAt(0).toUpperCase()
            ) : (
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm text-slate-800 font-semibold truncate">
              {user?.fullName || user?.name || "Khách Lưu Trú"}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium truncate">
              {user?.tierName
                ? `Hạng ${user.tierName}`
                : "Thành Viên Thượng Lưu"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
          <span className="text-xs text-slate-500">Phòng: #804 Deluxe</span>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="text-rose-600 hover:text-rose-700 transition-colors flex items-center"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
