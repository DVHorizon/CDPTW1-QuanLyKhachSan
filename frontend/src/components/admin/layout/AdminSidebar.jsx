
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const menuItems = [
  {
    label: 'Bàn Làm Việc',
    icon: 'grid_view',
    to: '/admin/dashboard',
  },
  {
    label: 'Lễ Tân & Tiền Sảnh',
    icon: 'room_service',
    to: '/admin/front-desk',
  },
  {
    label: 'Quản Lý Phòng & Hạng Phòng',
    icon: 'bedroom_parent',
    to: '/admin/rooms',
  },
  {
    label: 'Buồng Phòng & Kỹ Thuật',
    icon: 'cleaning_services',
    to: '/admin/housekeeping',
  },
  {
    label: 'Dịch Vụ & Spa',
    icon: 'spa',
    to: '/admin/services',
  },
  {
    label: 'Ẩm Thực F&B & Bếp',
    icon: 'restaurant',
    to: '/admin/menu',

  },
  {
    label: 'Tài Chính & Sổ Cái',
    icon: 'account_balance',
    to: '/admin/finance',
  },
  {
    label: 'AI Concierge & Chatbot',
    icon: 'neurology',
    to: '/admin/ai-concierge',
  },
  {
    label: 'Khách Hàng & Hội Viên',
    icon: 'loyalty',
    to: '/admin/loyalty',
  },
  {
    label: 'Quản Trị Hệ Thống',
    icon: 'admin_panel_settings',
    to: '/admin/settings',
  },
  {
    label: 'Kiểm Soát Nội Bộ (Audit)',
    icon: 'security',
    to: '/admin/audit-logs',
  },
  {
    label: 'Điều Độ Lịch Trực Ca (Roster)',
    icon: 'event_available',
    to: '/admin/roster',
  },
];

const AdminSidebar = () => {
  const location = useLocation();

  // Chuẩn hóa URL hiện tại để so sánh chính xác
  const currentPath =
    location.pathname.replace(/\/+$/, '') || '/';

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col overflow-hidden border-r border-gray-200 bg-white text-gray-800 shadow-lg">

      {/* LOGO */}
      <div className="flex h-16 shrink-0 items-center gap-3 bg-gray-50 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <span className="material-symbols-outlined text-2xl">
            corporate_fare
          </span>
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-bold uppercase tracking-wider">
            Grand Horizon
          </div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
            Resort &amp; Suites • PMS Core
          </div>
        </div>
      </div>

      {/* DANH SÁCH MENU */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <div className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Phân Hệ Tác Nghiệp
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            // F&B chỉ active khi URL chính xác là /admin
            const isSelected = item.exact
              ? currentPath === item.to
              : currentPath === item.to ||
              currentPath.startsWith(`${item.to}/`);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact === true}
                className={[
                  'group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5',
                  'transition-colors duration-200',
                  isSelected
                    ? 'bg-emerald-100 font-semibold text-emerald-800'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                ].join(' ')}
              >
                <span className="material-symbols-outlined shrink-0 text-xl">
                  {item.icon}
                </span>

                <span className="text-sm leading-5">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* TRẠNG THÁI HỆ THỐNG */}
      <div className="m-3 shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <span className="truncate text-xs font-semibold text-gray-700">
              Đồng Bộ PMS Core
            </span>
          </div>

          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
            Trực Tiếp
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2 text-xs text-gray-500">
          <span>Bàn giao ca trực:</span>
          <span className="font-mono font-bold text-gray-800">
            02:45:18
          </span>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
