import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GuestSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <span className="material-symbols-outlined text-white text-[22px]">hotel_class</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-emerald-800 tracking-tight truncate">GRAND HORIZON</span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase truncate">Phu Quoc Luxury PMS</span>
          </div>
        </div>

        {/* Trạm trực hiện tại badge */}
        <div className="px-3 py-2">
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100/50 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Trạm Trực Hiện Tại</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Trực Tuyến
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-800 truncate">Grand Lounge & Front Desk</div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Ca: Sáng - Chiều (06:00 - 14:30)</span>
              <span className="font-semibold text-emerald-700">PQC-T1</span>
            </div>
          </div>
        </div>

        {/* Phân hệ Quản lý vận hành */}
        <div className="px-3 pt-2 pb-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider px-2">Phân Hệ Quản Lý Vận Hành</span>
        </div>
        <nav className="px-3 flex flex-col gap-1">
          <NavLink to="/admin/menu" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm">Tổng Quan Vận Hành</span>
          </NavLink>
          <NavLink to="/admin/fnb/tables" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
            <span className="text-sm">Sơ Đồ Bàn Ăn Trực Quan</span>
          </NavLink>
          <NavLink to="/admin/fnb/kitchen" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="text-sm">Kho Nguyên Liệu Bếp</span>
          </NavLink>
          <NavLink to="/admin/buong-phong" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">bed</span>
            <span className="text-sm">Điều Phối Buồng Phòng</span>
          </NavLink>
        </nav>

        {/* Cổng khách hàng & Dịch vụ */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider px-2">Cổng Khách Hàng & Dịch Vụ</span>
        </div>
        <nav className="px-3 flex flex-col gap-1">
          <NavLink to="/fnb/dat-ban" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">restaurant</span>
            <span className="text-sm">Đặt Bàn Thưởng Vị</span>
          </NavLink>
          <NavLink to="/fnb/danh-gia" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">reviews</span>
            <span className="text-sm">Đánh Giá Món Ăn</span>
          </NavLink>
          <NavLink to="/rooms" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">compare</span>
            <span className="text-sm">So Sánh Phòng Nghỉ</span>
          </NavLink>
          <NavLink to="/wishlist" className={navItemClass}>
            <span className="material-symbols-outlined text-[20px]">bookmark_heart</span>
            <span className="text-sm">Danh Sách Yêu Thích</span>
          </NavLink>
        </nav>
      </div>

      {/* User Card Bottom */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm text-slate-800 font-semibold truncate">
              {user?.fullName || user?.name || "Lê Minh Anh"}
            </span>
            <span className="text-[11px] text-slate-400 truncate">Quản Lý F&B & Lễ Tân</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
          <span className="text-xs text-slate-500">Mã nhân sự: #GHR-982</span>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="text-rose-600 hover:text-rose-700 transition-colors flex items-center"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
