import React from "react";
import { useAuth } from "../../context/AuthContext";

export default function GuestHeader() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-8 border-b border-slate-100">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xl font-medium text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Grand Horizon Resort & Suites
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Bãi Trường, Phú Quốc</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Tiêu Chuẩn 5 Sao Quốc Tế
            </span>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 bg-slate-100/70 px-4 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-emerald-700 text-[18px]">schedule</span>
          <span className="text-xs text-slate-600">
            Ca làm việc: 06:00 - 14:30 | Quản trị F&B & Tiền sảnh
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-lg text-slate-400">
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="text-xs text-slate-400">Tra cứu phòng, bàn ăn, khách lưu trú...</span>
          <kbd className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Thông báo"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>
          <button
            aria-label="Trạng thái hệ thống"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">wifi_tethering</span>
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-semibold text-slate-800">
              {user?.fullName || user?.name || "Lê Minh Anh"}
            </span>
            <span className="text-xs text-emerald-700">Duty Manager</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
