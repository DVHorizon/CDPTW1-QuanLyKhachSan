import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Component bảo vệ các tuyến đường Admin / Phân quyền dựa trên Database
 * Chặn tài khoản khách thông thường (Guest) truy cập trang quản trị
 * Chặn các nhân viên không phải Admin truy cập chức năng Quản lý tài khoản (USER_MANAGE)
 */
const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, token, isLoading } = useAuth();
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
  // Nếu là tài khoản Khách hàng (roleId 5 hoặc Guest), chặn hoàn toàn không cho vào /admin
  const internalRoleIds = [1, 2, 3, 4];
  const internalRoleNames = ['Admin', 'Receptionist', 'Kitchen', 'Housekeeping'];
  const isInternal = internalRoleIds.includes(user.roleId) || internalRoleNames.includes(user.roleName);

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
                localStorage.removeItem('hotel_token');
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

  // 3. Nếu route yêu cầu quyền quản trị USER_MANAGE (Quản lý tài khoản & phân quyền)
  if (requiredPermission === 'USER_MANAGE' || requiredRole === 'Admin') {
    const isAdmin = user.roleId === 1 || user.roleName === 'Admin';
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#07131e] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d2135] border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
              <span className="material-symbols-outlined text-3xl text-amber-400">lock</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">GIỚI HẠN QUYỀN HẠN</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Chức năng Quản lý tài khoản & phân quyền nội bộ (USER_MANAGE) chỉ dành riêng cho Quản trị viên (Admin). Bạn đang đăng nhập với vai trò <span className="font-semibold text-blue-400">{user.roleName}</span>.
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
