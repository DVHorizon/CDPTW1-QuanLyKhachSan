import React from "react";
import { NavLink } from "react-router-dom";

// Danh sách menu sidebar với route tương ứng
const NAV_ITEMS = [
  { icon: "grid_view", label: "Bàn Làm Việc", to: "/admin/ban-lam-viec" },
  { icon: "room_service", label: "Lễ Tân & Tiền Sảnh", to: "/admin/le-tan" },
  {
    icon: "bedroom_parent",
    label: "Quản Lý Hạng Phòng",
    to: "/admin/room-types",
  },
  { icon: "meeting_room", label: "Quản Lý Phòng Vật Lý", to: "/admin/rooms" },
  {
    icon: "cleaning_services",
    label: "Buồng Phòng & Kỹ Thuật",
    to: "/admin/buong-phong",
  },
  { icon: "spa", label: "Danh Mục Dịch Vụ", to: "/admin/services" },
  { icon: "restaurant", label: "Ẩm Thực F&B & Bếp", to: "/admin/menu" },
  {
    icon: "account_balance",
    label: "Tài Chính & Sổ Cái",
    to: "/admin/tai-chinh",
  },
{icon: "soup_kitchen",
label: "Màn hình bếp (KDS)",
to: "/admin/fnb/kitchen",},
  {
    icon: "neurology",
    label: "AI Concierge & Chatbot",
    to: "/admin/ai-concierge",
  },
  { icon: "loyalty", label: "Khách Hàng & Hội Viên", to: "/admin/loyalty" },
  {
    icon: "admin_panel_settings",
    label: "Quản Trị Hệ Thống",
    to: "/admin/quan-tri",
  },
];

const AdminSidebar = ({ isCollapsed = false, toggleSidebar }) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${
        isCollapsed ? "w-20" : "w-72"
      } bg-surface-container-lowest z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out border-r border-outline-variant/20`}
    >
      {/* Khung nội dung scrollable bên trong */}
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
              <>
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
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
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
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isCollapsed
                        ? "justify-center w-11 h-11 mx-auto rounded-xl"
                        : "gap-space-md px-space-md py-space-sm rounded-lg"
                    } transition-all duration-200 group no-underline relative
                    ${
                      isActive
                        ? "bg-admin-primary-container text-on-admin-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="material-symbols-outlined text-[20px] transition-colors flex-shrink-0">
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="font-body-md text-body-md whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                            {item.label}
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-admin-primary flex-shrink-0" />
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

        {/* PMS Sync Status */}
        {isCollapsed ? (
          <div
            title="Đồng Bộ PMS Core: Trực Tiếp • Bàn giao ca trực: 02:45:18"
            className="p-space-xs bg-surface-container-low mx-space-xs mb-space-sm rounded-xl flex-shrink-0 flex flex-col items-center justify-center py-2.5 border border-outline-variant/20 cursor-pointer group hover:bg-surface-container transition-colors"
          >
            <span className="relative flex h-2.5 w-2.5 mb-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-admin-primary" />
            </span>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant group-hover:text-admin-primary transition-colors">
              LIVE
            </span>
          </div>
        ) : (
          <div className="p-space-md bg-surface-container-low mx-space-sm mb-space-sm rounded-xl flex-shrink-0 border border-outline-variant/20">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-admin-primary" />
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Đồng Bộ PMS Core
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-admin-primary font-bold uppercase tracking-wider">
                Trực Tiếp
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant pt-space-xs font-label-sm text-label-sm">
              <span>Bàn giao ca trực:</span>
              <span className="font-bold text-on-surface font-mono">
                02:45:18
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
