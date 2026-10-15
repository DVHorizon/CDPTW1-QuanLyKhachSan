import React from "react";

const AdminHeader = ({ isCollapsed = false, toggleSidebar }) => {
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
        <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded-lg">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            schedule
          </span>
          <span className="font-body-sm text-body-sm text-on-surface font-medium">
            Ca Chiều 14:00 - 22:00
          </span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <button
          className="relative w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error"></span>
        </button>
        <div className="flex items-center gap-space-sm pl-space-sm">
          <div className="flex flex-col text-right">
            <span className="font-label-md text-label-md text-on-surface font-bold">
              Lê Minh Anh
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Quản Lý
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-admin-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-admin-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
