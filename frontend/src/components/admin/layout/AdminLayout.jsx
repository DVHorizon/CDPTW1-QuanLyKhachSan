import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-theme bg-background font-body-md text-on-surface antialiased min-h-screen">
      <AdminSidebar />
      <div className="pl-72">
        <AdminHeader />
        <main className="w-full pt-16 bg-surface min-h-screen px-space-lg pb-margin-lg">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
