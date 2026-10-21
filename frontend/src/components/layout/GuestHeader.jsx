import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GuestHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-8 border-b border-slate-100 select-none">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex flex-col group">
          <span className="text-xl font-medium text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
            Grand Horizon Resort & Suites
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Bãi Trường, Phú Quốc</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Khu Nghỉ Dưỡng 5 Sao Quốc Tế
            </span>
          </div>
        </Link>

        {/* Guest Hotline Pill */}
        <div className="hidden xl:flex items-center gap-2 bg-emerald-50/70 border border-emerald-100/70 px-4 py-1.5 rounded-full text-xs text-emerald-800">
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">support_agent</span>
          <span>Dịch vụ hỗ trợ khách lưu trú: </span>
          <strong className="font-mono text-emerald-700">Phím 0 (Lễ Tân) / #3302 (Ẩm Thực)</strong>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Tra cứu tiện ích */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-xl text-slate-400">
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="text-xs text-slate-500">Tìm món ăn, bàn tiệc, dịch vụ...</span>
          <kbd className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>

        {/* Nút đặt phòng nhanh */}
        <Link
          to="/rooms"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">bed</span>
          <span>Đặt Thêm Phòng</span>
        </Link>

        {/* Thông báo khách */}
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Thông báo khách"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
            type="button"
            title="Thông báo đơn hàng & dịch vụ"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        {/* Profile Dropdown Khách Hàng */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 cursor-pointer group select-none text-left"
            type="button"
          >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                {user?.fullName || user?.name || "Khách Lưu Trú"}
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                {user?.tierName ? `Hạng ${user.tierName}` : "Thành Viên Thượng Lưu"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm border border-emerald-600 group-hover:scale-105 transition-transform">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-[20px]">person</span>}
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.fullName || "Khách Lưu Trú"}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || "Phòng Deluxe #804"}</p>
              </div>

              <Link
                to="/"
                onClick={() => setShowDropdown(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
                <span>Trang Chủ Khách Sạn</span>
              </Link>

              <Link
                to="/profile"
                onClick={() => setShowDropdown(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span>Hồ Sơ Của Tôi</span>
              </Link>

              <Link
                to="/fnb/history"
                onClick={() => setShowDropdown(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Lịch Sử Gọi Món</span>
              </Link>

              <Link
                to="/fnb/dat-ban"
                onClick={() => setShowDropdown(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restaurant</span>
                <span>Đặt Bàn Thưởng Vị</span>
              </Link>

              <div className="my-1 border-t border-slate-100"></div>

              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  if (logout) logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
