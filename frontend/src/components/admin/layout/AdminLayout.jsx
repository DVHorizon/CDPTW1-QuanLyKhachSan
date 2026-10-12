import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="admin-theme bg-background font-body-md text-on-surface antialiased min-h-screen">
      <AdminSidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div
        className={`transition-all duration-300 ease-in-out ${isCollapsed ? "pl-20" : "pl-72"}`}
      >
        <AdminHeader isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
        <main className="w-full pt-16 bg-surface min-h-screen px-space-lg pb-margin-lg transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
