import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

// Danh sách menu sidebar với phân quyền tương ứng
const ALL_NAV_ITEMS = [
  { icon: "grid_view", label: "Bàn Làm Việc", to: "/admin/ban-lam-viec", allowedRoles: ['Admin', 'Receptionist', 'Kitchen', 'Housekeeping'] },
  { icon: "room_service", label: "Lễ Tân & Tiền Sảnh", to: "/admin/le-tan", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "bedroom_parent", label: "Quản Lý Hạng Phòng", to: "/admin/room-types", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "meeting_room", label: "Quản Lý Phòng Vật Lý", to: "/admin/rooms", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "dashboard", label: "Sơ Đồ Phòng Trực Quan (Real-time)", to: "/admin/room-availability", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  { icon: "grid_on", label: "Sơ Đồ Phòng & Trạng Thái", to: "/admin/so-do-phong", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  { icon: "receipt_long", label: "Quản Lý Đặt Phòng", to: "/admin/dat-phong", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "assignment_turned_in", label: "Gán Phòng (Room Allocation)", to: "/admin/room-assignment", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "how_to_reg", label: "Check-in Tại Quầy (Express)", to: "/admin/check-in", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "more_time", label: "Gia Hạn Lưu Trú & Đổi Phòng", to: "/admin/extend-stay", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "logout", label: "Check-Out & Kiểm Phòng", to: "/admin/check-out", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "kitchen", label: "Quản Lý Minibar Phòng", to: "/admin/minibar", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  { icon: "cleaning_services", label: "Buồng Phòng & Kỹ Thuật", to: "/admin/buong-phong", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  
  // tuyen/7 Operations, Smart Lock, Housekeeping & Maintenance
  { icon: "inventory_2", label: "Kho Đồ Tiêu Hao & Minibar", to: "/admin/housekeeping/inventory", allowedRoles: ['Admin', 'Housekeeping', 'Receptionist'] },
  { icon: "dry_cleaning", label: "Đồ Vải & Chu Kỳ Giặt Ủi", to: "/admin/housekeeping/linen", allowedRoles: ['Admin', 'Housekeeping'] },
  { icon: "search_hands_free", label: "Đồ Thất Lạc & Bỏ Quên", to: "/admin/housekeeping/lost-and-found", allowedRoles: ['Admin', 'Housekeeping', 'Receptionist'] },
  { icon: "engineering", label: "Bảo Trì & Kỹ Thuật", to: "/admin/engineering", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  { icon: "key", label: "Khóa Thông Minh & E-Key", to: "/admin/security/smart-lock", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "security", label: "Kiểm Soát Nội Bộ & Nhật Ký", to: "/admin/audit-logs", allowedRoles: ['Admin'] },
  { icon: "event_available", label: "Điều Độ Lịch Trực Ca", to: "/admin/roster", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "campaign", label: "Tiếp Thị & CSKH (Marketing)", to: "/admin/marketing", allowedRoles: ['Admin', 'Receptionist'] },

  { icon: "spa", label: "Danh Mục Dịch Vụ", to: "/admin/services", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "event_available", label: "Tiếp Nhận & Đặt Dịch Vụ", to: "/admin/services/dispatch", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "pending_actions", label: "Tiến Độ Đơn Dịch Vụ", to: "/admin/services/orders", allowedRoles: ['Admin', 'Receptionist', 'Housekeeping'] },
  { icon: "restaurant", label: "Quản Lý Thực Đơn (F&B)", to: "/admin/menu", allowedRoles: ['Admin', 'Kitchen', 'Receptionist'] },
  { icon: "table_restaurant", label: "Sơ Đồ Bàn Ăn (Table Map)", to: "/admin/fnb/table-map", allowedRoles: ['Admin', 'Kitchen', 'Receptionist'] },
  { icon: "soup_kitchen", label: "Màn Hình Bếp (KDS)", to: "/admin/fnb/kitchen", allowedRoles: ['Admin', 'Kitchen'] },
  { icon: "local_shipping", label: "Theo Dõi & Giao Món", to: "/admin/fnb/dispatch", allowedRoles: ['Admin', 'Kitchen', 'Receptionist'] },
  { icon: "receipt_long", label: "Lịch Sử & Tổng Hợp F&B", to: "/admin/fnb/history", allowedRoles: ['Admin', 'Kitchen', 'Receptionist'] },
  { icon: "account_balance", label: "Tài Chính & Sổ Cái", to: "/admin/tai-chinh", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "neurology", label: "AI Concierge & Chatbot", to: "/admin/ai-concierge", allowedRoles: ['Admin', 'Receptionist'] },
  { icon: "loyalty", label: "Khách Hàng & Hội Viên", to: "/admin/loyalty", allowedRoles: ['Admin', 'Receptionist'] },
  // Quản lý tài khoản (USER_MANAGE) — Spec 3: CHỈ ADMIN mới nhìn thấy menu này!
  { icon: "manage_accounts", label: "Quản Lý Tài Khoản & Phân Quyền", to: "/admin/staff", allowedRoles: ['Admin'], requiredPermission: 'USER_MANAGE' },
  { icon: "admin_panel_settings", label: "Quản Trị Hệ Thống", to: "/admin/quan-tri", allowedRoles: ['Admin'] },
];

const AdminSidebar = ({ isCollapsed = false, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.roleName || 'Staff';
  const isAdmin = user?.roleId === 1 || userRole === 'Admin';

  // Lọc menu theo vai trò người dùng (Spec 3 - Mục 3.1 & 3.6)
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (isAdmin) return true; // Admin có toàn quyền xem tất cả module
    if (item.requiredPermission === 'USER_MANAGE') return false; // Chỉ Admin mới có quyền USER_MANAGE
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) return false;
    return true;
  });

  // Badge màu theo vai trò (Spec 3 - Wireframe 6.1)
  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return { bg: 'bg-red-800 text-red-100 border-red-700/60', text: 'Quản Trị Viên' };
      case 'Receptionist':
        return { bg: 'bg-blue-800 text-blue-100 border-blue-700/60', text: 'Lễ Tân' };
      case 'Kitchen':
        return { bg: 'bg-amber-700 text-amber-100 border-amber-600/60', text: 'Bếp / F&B' };
      case 'Housekeeping':
        return { bg: 'bg-emerald-800 text-emerald-100 border-emerald-700/60', text: 'Dọn Phòng' };
      default:
        return { bg: 'bg-slate-700 text-slate-200 border-slate-600', text: role || 'Nhân Viên' };
    }
  };

  const badgeInfo = getRoleBadge(userRole);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${
        isCollapsed ? "w-20" : "w-72"
      } bg-surface-container-lowest z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out border-r border-outline-variant/20`}
    >
      <div className="h-full flex flex-col justify-between overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col">
          {/* Logo / Brand */}
          <div
            className={`h-16 ${
              isCollapsed
                ? "px-2 justify-center"
                : "px-space-md justify-between"
            } flex items-center bg-surface-container-low flex-shrink-0 border-b border-outline-variant/20`}
          >
            {isCollapsed ? (
              <button
                onClick={toggleSidebar}
                type="button"
                title="Mở rộng thanh điều hướng"
                className="w-9 h-9 rounded-lg bg-admin-primary flex items-center justify-center text-on-admin-primary shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  corporate_fare
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-space-sm overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-admin-primary flex items-center justify-center text-on-admin-primary shadow-[0_0_10px_rgba(16,185,129,0.25)] flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    corporate_fare
                  </span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-headline-sm text-label-md uppercase tracking-wider text-on-surface font-bold truncate">
                    Grand Horizon
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-semibold truncate">
                    Resort &amp; Suites • PMS
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div
            className={`${
              isCollapsed ? "px-space-xs" : "px-space-md"
            } py-space-sm transition-all duration-300`}
          >
            <div
              className={`px-space-sm py-space-xs mb-space-xs font-label-sm text-label-sm uppercase text-on-surface-variant font-bold tracking-wider ${
                isCollapsed ? "text-center text-[10px]" : ""
              }`}
            >
              {isCollapsed ? "•••" : "Phân Hệ Tác Nghiệp"}
            </div>
            <nav className="flex flex-col gap-space-xs">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  end={true}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isCollapsed
                        ? "justify-center w-11 h-11 mx-auto rounded-xl"
                        : "gap-space-md px-space-md py-space-sm rounded-lg"
                    } transition-all duration-200 group no-underline relative
                    ${
                      isActive
                        ? "bg-admin-primary text-[#002114] font-bold shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`material-symbols-outlined text-[20px] transition-colors flex-shrink-0 ${
                          isActive ? 'text-[#002114]' : ''
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="font-body-md text-body-md whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                            {item.label}
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#002114] flex-shrink-0" />
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* User Card & Logout Bottom */}
        <div className="border-t border-outline-variant/20 p-space-sm bg-surface-container-low">
          {!isCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-8 h-8 rounded-full bg-admin-primary text-[#002114] font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{(user?.fullName || 'NV').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-on-surface truncate">
                    {user?.fullName || 'Nhân Viên'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeInfo.bg}`}>
                      {badgeInfo.text}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => { logout(); navigate('/login'); }}
                title="Đăng xuất"
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
