import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PERMISSION_ALIASES = {
  USER_MANAGE: ['edit_users', 'delete_users'],
  BOOKING_VIEW: ['view_bookings'],
  INVOICE_VIEW: ['view_invoices'],
  SERVICE_VIEW: ['manage_services', 'view_bookings'],
  SERVICE_MANAGE: ['manage_services'],
  SERVICE_ORDER_MANAGE: ['manage_services', 'view_bookings', 'housekeeping_clean'],
  STATS_VIEW: ['view_dashboard', 'export_reports'],
  AI_MANAGE: [],
};

const PERMISSION_ROLE_FALLBACK = {
  USER_MANAGE: ['admin'],
  BOOKING_VIEW: ['admin', 'receptionist', 'manager', 'staff', 'lễ tân'],
  INVOICE_VIEW: ['admin', 'receptionist', 'manager'],
  SERVICE_VIEW: ['admin', 'receptionist', 'manager', 'staff'],
  SERVICE_MANAGE: ['admin', 'manager', 'staff'],
  SERVICE_ORDER_MANAGE: ['admin', 'receptionist', 'housekeeping', 'manager', 'staff', 'kitchen'],
  STATS_VIEW: ['admin', 'receptionist', 'kitchen', 'housekeeping', 'manager', 'staff'],
  AI_MANAGE: ['admin', 'receptionist', 'manager'],
};

/**
 * Component bảo vệ các tuyến đường Admin / Phân quyền dựa trên Database
 * Chặn tài khoản khách thông thường (Guest) truy cập trang quản trị
 * Hỗ trợ kiểm tra linh hoạt theo requiredRole (string | string[]) và requiredPermission (string | string[])
 */
const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, token, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07131e] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-amber-200/80 tracking-widest text-sm uppercase">Đang đồng bộ phân quyền người dùng...</p>
      </div>
    );
  }

  // 1. Chưa đăng nhập -> chuyển hướng sang /login
  if (!token || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 2. Phân quyền Admin vs User dựa vào database:
  // Hỗ trợ đầy đủ các vai trò nội bộ: Admin (1), Receptionist (2), Kitchen (3), Housekeeping (4), Manager (6), Staff (7)
  const internalRoleIds = [1, 2, 3, 4, 6, 7];
  const internalRoleNames = ['admin', 'receptionist', 'kitchen', 'housekeeping', 'manager', 'staff'];
  const userRoleLower = String(user.roleName || '').toLowerCase();
  const isInternal =
    internalRoleIds.includes(Number(user.roleId)) || internalRoleNames.includes(userRoleLower);

  if (!isInternal) {
    return (
      <div className="min-h-screen bg-[#07131e] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d2135] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
            <span className="material-symbols-outlined text-3xl text-red-400">gpp_maybe</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">TRUY CẬP BỊ TỪ CHỐI</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Tài khoản <span className="font-semibold text-amber-300">{user.email || user.username}</span> được cấp quyền Khách hàng và không thể truy cập phân hệ Quản trị nội bộ Grand Horizon.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition-all"
            >
              Về Trang Khách Hàng
            </button>
            <button
              onClick={() => {
                if (typeof logout === 'function') {
                  logout();
                } else {
                  localStorage.removeItem('hotel_token');
                }
                window.location.href = '/login';
              }}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium text-sm transition-all"
            >
              Đổi Tài Khoản
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = Number(user.roleId) === 1 || userRoleLower === 'admin';

  // 3. Kiểm tra requiredRole (hỗ trợ string hoặc string[])
  if (requiredRole) {
    const allowedRoles = (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map((r) =>
      String(r).toLowerCase()
    );
    if (!isAdmin && !allowedRoles.includes(userRoleLower)) {
      console.warn('[Phân quyền] Từ chối truy cập (requiredRole):', {
        code: 'ERROR_0010_FORBIDDEN',
        requiredRole,
        userRole: user.roleName,
        userId: user.userId || user.id,
        path: location.pathname,
        timestamp: new Date().toISOString()
      });

      return (
        <div className="min-h-screen bg-[#07131e] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d2135] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
              <span className="material-symbols-outlined text-3xl text-red-400">lock</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">TRUY CẬP BỊ TỪ CHỐI</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Vai trò <span className="font-semibold text-blue-400">{user.roleName}</span> không có quyền truy cập chức năng này.
            </p>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all cursor-pointer"
            >
              Quay lại Bàn Làm Việc
            </button>
          </div>
        </div>
      );
    }
  }

  // 4. Kiểm tra requiredPermission (hỗ trợ string hoặc string[], đối chiếu user.permissions + fallback role)
  if (requiredPermission && !isAdmin) {
    const requiredPerms = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    const hasAllPermissions = requiredPerms.every((perm) => {
      const aliases = PERMISSION_ALIASES[perm];
      if (userPerms.length > 0 && Array.isArray(aliases) && aliases.length > 0) {
        if (aliases.some((a) => userPerms.includes(a)) || userPerms.includes(perm)) {
          return true;
        }
      }
      if (userPerms.length > 0 && !aliases && userPerms.includes(perm)) {
        return true;
      }
      const fallbackRoles = PERMISSION_ROLE_FALLBACK[perm];
      if (Array.isArray(fallbackRoles) && fallbackRoles.includes(userRoleLower)) {
        return true;
      }
      if (perm === 'BOOKING_VIEW' && Number(user.roleId) === 2) {
        return true;
      }
      return false;
    });

    if (!hasAllPermissions) {
      console.warn('[Phân quyền] Từ chối truy cập:', {
        code: 'ERROR_0010_FORBIDDEN',
        requiredPermission,
        userRole: user.roleName,
        userId: user.userId || user.id,
        path: location.pathname,
        timestamp: new Date().toISOString()
      });

      const isUserManage = requiredPerms.includes('USER_MANAGE');
      return (
        <div className="min-h-screen bg-[#07131e] flex items-center justify-center p-4">
          <div className={`max-w-md w-full bg-[#0d2135] border ${isUserManage ? 'border-amber-500/30' : 'border-red-500/30'} rounded-2xl p-8 text-center shadow-2xl`}>
            <div className={`w-16 h-16 ${isUserManage ? 'bg-amber-500/20 border-amber-500/40' : 'bg-red-500/20 border-red-500/40'} rounded-full flex items-center justify-center mx-auto mb-4 border`}>
              <span className={`material-symbols-outlined text-3xl ${isUserManage ? 'text-amber-400' : 'text-red-400'}`}>
                {isUserManage ? 'lock' : 'gpp_maybe'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isUserManage ? 'GIỚI HẠN QUYỀN HẠN' : 'TRUY CẬP BỊ TỪ CHỐI'}
            </h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {isUserManage
                ? <>Chức năng Quản lý tài khoản &amp; phân quyền nội bộ (USER_MANAGE) chỉ dành riêng cho Quản trị viên (Admin). Bạn đang đăng nhập với vai trò <span className="font-semibold text-blue-400">{user.roleName}</span>.</>
                : 'Bạn không có quyền thực hiện chức năng này.'}
            </p>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all cursor-pointer"
            >
              Quay lại Bàn Làm Việc
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
