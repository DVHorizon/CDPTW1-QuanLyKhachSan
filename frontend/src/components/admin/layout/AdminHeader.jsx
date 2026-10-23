import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const AdminHeader = ({ isCollapsed = false, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Badge màu theo vai trò (Spec 3 - Wireframe 6.1: Admin đỏ đậm, Lễ tân xanh dương, Bếp cam, Dọn phòng xanh lá)
  const getRoleBadgeStyle = (roleName) => {
    switch (roleName) {
      case 'Admin':
        return 'bg-red-900/60 text-red-200 border-red-700/60';
      case 'Receptionist':
        return 'bg-blue-900/60 text-blue-200 border-blue-700/60';
      case 'Kitchen':
        return 'bg-amber-900/60 text-amber-200 border-amber-700/60';
      case 'Housekeeping':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getRoleDisplayName = (roleName) => {
    switch (roleName) {
      case 'Admin': return 'Quản Trị Viên';
      case 'Receptionist': return 'Lễ Tân';
      case 'Kitchen': return 'Bếp / F&B';
      case 'Housekeeping': return 'Dọn Phòng';
      default: return roleName || 'Nhân Viên';
    }
  };

  return (
    <header
      className={`fixed top-0 ${
        isCollapsed ? "left-20" : "left-72"
      } right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg transition-all duration-300 ease-in-out border-b border-outline-variant/20`}
    >
      <div className="flex items-center gap-space-md">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            type="button"
            title={
              isCollapsed
                ? "Mở rộng thanh điều hướng"
                : "Thu gọn thanh điều hướng"
            }
            className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-admin-primary active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? "menu" : "menu_open"}
            </span>
          </button>
        )}
        <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded-lg border border-outline-variant/10">
          <span className="material-symbols-outlined text-[18px] text-admin-primary">
            verified_user
          </span>
          <span className="font-body-sm text-body-sm text-on-surface font-medium">
            Hệ Thống Phân Quyền RBAC • Cơ Sở Dữ Liệu Trực Tiếp
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        {/* Nút về trang Client */}
        <button
          onClick={() => navigate('/')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-admin-primary hover:bg-surface-container-high text-xs font-semibold border border-outline-variant/15 transition-all cursor-pointer"
          title="Xem Cổng Khách Hàng"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Xem Cổng Khách</span>
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-space-sm pl-space-sm cursor-pointer select-none py-1 px-2 rounded-xl hover:bg-surface-container-high transition-colors"
          >
            <div className="flex flex-col text-right">
              <span className="font-label-md text-label-md text-on-surface font-bold truncate max-w-[150px]">
                {user?.fullName || 'Người Dùng'}
              </span>
              <div className="flex justify-end">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user?.roleName)} uppercase tracking-wider`}>
                  {getRoleDisplayName(user?.roleName)}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-admin-primary flex items-center justify-center font-bold text-on-admin-primary shadow-sm text-sm overflow-hidden border border-admin-primary/40">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.fullName || 'NV').substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-outline-variant/20">
                <p className="text-xs text-on-surface-variant font-medium">Đang đăng nhập bằng</p>
                <p className="text-sm font-bold text-on-surface truncate">{user?.email || user?.username}</p>
                <p className="text-[11px] text-admin-primary mt-0.5">Tên đăng nhập: @{user?.username || 'user'}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  <span>Hồ Sơ Cá Nhân</span>
                </button>
                {user?.roleId === 1 && (
                  <button
                    onClick={() => { setShowDropdown(false); navigate('/admin/staff'); }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    <span>Quản Lý Tài Khoản (Admin)</span>
                  </button>
                )}
              </div>

              <div className="border-t border-outline-variant/20 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-error hover:bg-error/10 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Đăng Xuất Khỏi Hệ Thống</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
