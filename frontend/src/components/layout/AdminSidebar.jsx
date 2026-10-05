import React from 'react';
import { NavLink } from 'react-router-dom';

// Danh sách menu sidebar với route tương ứng
const NAV_ITEMS = [
  { icon: 'grid_view', label: 'Bàn Làm Việc', to: '/admin/ban-lam-viec' },
  { icon: 'room_service', label: 'Lễ Tân & Tiền Sảnh', to: '/admin/le-tan' },
  { icon: 'bedroom_parent', label: 'Quản Lý Phòng & Hạng Phòng', to: '/admin/room-types' },
  { icon: 'meeting_room', label: 'Quản Lý Phòng Vật Lý', to: '/admin/rooms' },
  { icon: 'cleaning_services', label: 'Buồng Phòng & Kỹ Thuật', to: '/admin/buong-phong' },
  { icon: 'spa', label: 'Dịch Vụ & Spa', to: '/admin/dich-vu-spa' },
  { icon: 'restaurant', label: 'Ẩm Thực F&B & Bếp', to: '/admin' },
  { icon: 'account_balance', label: 'Tài Chính & Sổ Cái', to: '/admin/tai-chinh' },
  { icon: 'neurology', label: 'AI Concierge & Chatbot', to: '/admin/ai-concierge' },
  { icon: 'admin_panel_settings', label: 'Quản Trị Hệ Thống', to: '/admin/quan-tri' },
];

const AdminSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest flex flex-col justify-between z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-y-auto">
      <div className="flex flex-col">
        {/* Logo / Brand */}
        <div className="h-16 px-space-lg flex items-center gap-space-sm bg-surface-container-low flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-admin-primary flex items-center justify-center text-on-admin-primary shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-label-md uppercase tracking-wider text-on-surface font-bold">Grand Horizon</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-semibold">Resort &amp; Suites • PMS Core</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-space-md py-space-sm">
          <div className="px-space-sm py-space-xs mb-space-xs font-label-sm text-label-sm uppercase text-on-surface-variant font-bold tracking-wider">
            Phân Hệ Tác Nghiệp
          </div>
          <nav className="flex flex-col gap-space-xs">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-all group no-underline
                  ${isActive
                    ? 'bg-admin-primary/10 text-admin-primary font-semibold shadow-sm border border-admin-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-admin-primary' : ''}`}>
                      {item.icon}
                    </span>
                    <span className="font-body-md text-body-md">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-admin-primary flex-shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* PMS Sync Status */}
      <div className="p-space-md bg-surface-container-low mx-space-sm mb-space-sm rounded-xl flex-shrink-0">
        <div className="flex items-center justify-between mb-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-admin-primary" />
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">Đồng Bộ PMS Core</span>
          </div>
          <span className="font-label-sm text-label-sm text-admin-primary font-bold uppercase tracking-wider">Trực Tiếp</span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant pt-space-xs font-label-sm text-label-sm">
          <span>Bàn giao ca trực:</span>
          <span className="font-bold text-on-surface font-mono">02:45:18</span>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
