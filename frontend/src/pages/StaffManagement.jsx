import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser
} from '../api/userManagementApi';

// ═══════════════════════════════════════════════════════════════════════════════
// HẰNG SỐ & GIAO DIỆN THEO SPEC 3
// ═══════════════════════════════════════════════════════════════════════════════

// 4 màu cố định của Badge vai trò theo Spec 3 (Wireframe 6.1 - Mục 3)
// Admin: đỏ đậm, Lễ tân: xanh dương, Bếp: cam, Dọn phòng: xanh lá
const ROLE_BADGE_CONFIG = {
  Admin: {
    bg: 'bg-[#991B1B] text-white border-red-700/60 shadow-xs',
    label: 'Admin'
  },
  Receptionist: {
    bg: 'bg-[#1E40AF] text-white border-blue-700/60 shadow-xs',
    label: 'Lễ Tân'
  },
  Kitchen: {
    bg: 'bg-[#C2410C] text-white border-amber-600/60 shadow-xs',
    label: 'Bếp'
  },
  Housekeeping: {
    bg: 'bg-[#166534] text-white border-emerald-700/60 shadow-xs',
    label: 'Dọn Phòng'
  }
};

const DEFAULT_ROLE_CONFIG = {
  bg: 'bg-slate-700 text-slate-200 border-slate-600',
  label: 'Nhân Viên'
};

const StaffManagement = () => {
  const { user: currentUser } = useAuth();

  // Danh sách người dùng & phân trang
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 10 dòng/trang theo Spec 6.1

  // Bộ lọc & Tìm kiếm (Spec 6.1)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('TAT_CA');
  const [selectedStatus, setSelectedStatus] = useState('TAT_CA');
  const [sortOrder, setSortOrder] = useState('asc'); // Họ tên A-Z mặc định

  // Modal Thêm / Sửa
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    employeeCode: '',
    avatarUrl: '',
    roleId: '',
    status: 'Active'
  });

  // State lỗi validate theo từng trường (Spec 5.2 & 6.3 - màu đỏ 13px dưới input)
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Modal xác nhận Khóa / Mở khóa
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);

  // Modal xác nhận Xóa
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  // Modal hiển thị Mật khẩu tạm 1 lần duy nhất (Spec 3 - Luồng 4.4)
  const [tempPasswordModal, setTempPasswordModal] = useState({
    isOpen: false,
    targetName: '',
    password: '',
    copied: false
  });

  // Toast thông báo toàn màn hình (Spec 3 - Mục 5 & 6.3)
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message, code = '') => {
    setToast({ type, message, code });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load danh mục 4 vai trò cố định từ Database
  useEffect(() => {
    const loadRoles = async () => {
      const res = await fetchRoles();
      if (res.ok && res.data.success) {
        setRoles(res.data.data || []);
      }
    };
    loadRoles();
  }, []);

  // Load danh sách người dùng
  const loadUsersList = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchUsers({
      search: debouncedSearch,
      role: selectedRole,
      status: selectedStatus,
      page: currentPage,
      limit: pageSize,
      sort: sortOrder
    });

    if (res.ok && res.data.success) {
      setUsers(res.data.data || []);
      if (res.data.pagination) {
        setTotalUsers(res.data.pagination.total || 0);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } else {
      showToast('error', res.data.message || 'Lỗi khi tải danh sách người dùng', res.data.code);
    }
    setIsLoading(false);
  }, [debouncedSearch, selectedRole, selectedStatus, currentPage, pageSize, sortOrder, showToast]);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATION THEO SPEC 3 (CLIENT-SIDE ONBLUR & SUBMIT)
  // ═══════════════════════════════════════════════════════════════════════════════
  const validateField = (name, value, isEditing = false) => {
    let error = '';

    switch (name) {
      case 'username':
        if (!isEditing) {
          if (!value || !value.trim()) {
            error = 'Tên đăng nhập không được để trống';
          } else {
            const trimmed = value.trim();
            if (trimmed.length < 4 || trimmed.length > 50) {
              error = 'Tên đăng nhập phải có từ 4 đến 50 ký tự';
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
              error = 'Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới';
            }
          }
        }
        break;

      case 'fullName':
        if (!value || !value.trim()) {
          error = 'Họ và tên không được để trống';
        } else if (value.trim().length < 2 || value.trim().length > 100) {
          error = 'Họ và tên phải có từ 2 đến 100 ký tự';
        }
        break;

      case 'email':
        if (!value || !value.trim()) {
          error = 'Email không được để trống';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            error = 'Email không đúng định dạng';
          }
        }
        break;

      case 'phone':
        if (value && value.trim()) {
          if (!/^0[0-9]{9}$/.test(value.trim())) {
            error = 'Số điện thoại không đúng định dạng';
          }
        }
        break;

      case 'password':
        if (!isEditing) {
          if (!value) {
            error = 'Mật khẩu không được để trống';
          } else {
            const hasUpper = /[A-Z]/.test(value);
            const hasLower = /[a-z]/.test(value);
            const hasDigit = /[0-9]/.test(value);
            if (value.length < 8 || value.length > 32 || !hasUpper || !hasLower || !hasDigit) {
              error = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số';
            }
          }
        } else {
          // Khi Sửa: để trống là giữ nguyên mật khẩu cũ, nếu có nhập thì phải đủ mạnh
          if (value && value.trim()) {
            const hasUpper = /[A-Z]/.test(value);
            const hasLower = /[a-z]/.test(value);
            const hasDigit = /[0-9]/.test(value);
            if (value.length < 8 || value.length > 32 || !hasUpper || !hasLower || !hasDigit) {
              error = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số';
            }
          }
        }
        break;

      case 'roleId':
        if (!value) {
          error = 'Vui lòng chọn vai trò cho tài khoản';
        }
        break;

      default:
        break;
    }

    return error;
  };

  const handleBlur = (field) => {
    const error = validateField(field, formData[field], modalMode === 'edit');
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Xóa lỗi ngay khi người dùng bắt đầu sửa
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Mở modal Thêm mới
  const handleOpenCreateModal = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      employeeCode: '',
      avatarUrl: '',
      roleId: roles.length > 0 ? String(roles[0].roleId) : '2',
      status: 'Active'
    });
    setFieldErrors({});
    setShowPassword(false);
    setModalMode('create');
  };

  // Mở modal Sửa
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      password: '', // để trống giữ nguyên
      employeeCode: user.employeeCode || '',
      avatarUrl: user.avatarUrl || '',
      roleId: String(user.roleId),
      status: user.status
    });
    setFieldErrors({});
    setShowPassword(false);
    setModalMode('edit');
  };

  // Submit Form Thêm / Sửa
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const isEditing = modalMode === 'edit';
    const errors = {};

    // Validate tất cả các trường cùng lúc (Spec 4.1 Bước 3)
    ['username', 'fullName', 'email', 'phone', 'password', 'roleId'].forEach(field => {
      const err = validateField(field, formData[field], isEditing);
      if (err) errors[field] = err;
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    if (isEditing) {
      // Gọi API cập nhật
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone ? formData.phone.trim() : null,
        employeeCode: formData.employeeCode ? formData.employeeCode.trim() : null,
        avatarUrl: formData.avatarUrl || null,
        roleId: parseInt(formData.roleId, 10),
        status: formData.status
      };
      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await updateUser(editingUser.userId, payload);
      setIsSubmitting(false);

      if (res.ok && res.data.success) {
        showToast('success', 'Cập nhật tài khoản thành công', 'SUCCESS_0002_UPDATED');
        setModalMode(null);
        loadUsersList();
      } else {
        if (res.data.field) {
          setFieldErrors({ [res.data.field]: res.data.message });
        } else {
          showToast('error', res.data.message || 'Cập nhật không thành công', res.data.code);
        }
      }
    } else {
      // Gọi API tạo mới
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone ? formData.phone.trim() : null,
        password: formData.password,
        employeeCode: formData.employeeCode ? formData.employeeCode.trim() : null,
        avatarUrl: formData.avatarUrl || null,
        roleId: parseInt(formData.roleId, 10)
      };

      const res = await createUser(payload);
      setIsSubmitting(false);

      if (res.ok && res.data.success) {
        showToast('success', 'Thêm mới tài khoản thành công', 'SUCCESS_0001_CREATED');
        setModalMode(null);
        loadUsersList();
      } else {
        if (res.data.field) {
          setFieldErrors({ [res.data.field]: res.data.message });
        } else {
          showToast('error', res.data.message || 'Thêm tài khoản không thành công', res.data.code);
        }
      }
    }
  };

  // Xác nhận Khóa / Mở khóa
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;

    const nextStatus = statusConfirmTarget.status === 'Active' ? 'Locked' : 'Active';
    const res = await updateUserStatus(statusConfirmTarget.userId, nextStatus);

    if (res.ok && res.data.success) {
      showToast('success', res.data.message || 'Cập nhật trạng thái thành công');
      setStatusConfirmTarget(null);
      loadUsersList();
    } else {
      showToast('error', res.data.message || 'Không thể thay đổi trạng thái', res.data.code);
      setStatusConfirmTarget(null);
    }
  };

  // Đặt lại mật khẩu ngẫu nhiên
  const handleResetPassword = async (targetUser) => {
    const res = await resetUserPassword(targetUser.userId);
    if (res.ok && res.data.success && res.data.temporaryPassword) {
      setTempPasswordModal({
        isOpen: true,
        targetName: targetUser.fullName,
        password: res.data.temporaryPassword,
        copied: false
      });
    } else {
      showToast('error', res.data.message || 'Không thể đặt lại mật khẩu', res.data.code);
    }
  };

  // Xác nhận Xóa mềm
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;

    const res = await deleteUser(deleteConfirmTarget.userId);
    if (res.ok && res.data.success) {
      showToast('success', 'Xóa tài khoản thành công', 'SUCCESS_0003_DELETED');
      setDeleteConfirmTarget(null);
      loadUsersList();
    } else {
      showToast('error', res.data.message || 'Không thể xóa tài khoản', res.data.code);
      setDeleteConfirmTarget(null);
    }
  };

  // Copy password vào clipboard
  const handleCopyPassword = () => {
    if (tempPasswordModal.password) {
      navigator.clipboard.writeText(tempPasswordModal.password);
      setTempPasswordModal(prev => ({ ...prev, copied: true }));
      setTimeout(() => {
        setTempPasswordModal(prev => ({ ...prev, copied: false }));
      }, 3000);
    }
  };

  // Chữ viết tắt Avatar
  const getInitials = (name) => {
    if (!name) return 'NV';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <AdminLayout>
      {/* Toast Notification (Toàn màn hình / Thông báo) */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/95 border-red-500/50 text-red-200'
          }`}>
            <span className="material-symbols-outlined text-2xl shrink-0">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <div>
              <p className="font-bold text-sm">{toast.message}</p>
              {toast.code && <p className="text-[11px] opacity-75 font-mono">{toast.code}</p>}
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-3 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-space-lg pb-margin-lg">
        {/* Header Tiêu Đề Tính Năng */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md border-b border-outline-variant/20 pb-space-md">
          <div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1 font-medium">
              <span>Bàn Làm Việc</span>
              <span>/</span>
              <span>Quản Trị Hệ Thống</span>
              <span>/</span>
              <span className="text-admin-primary font-bold">Quản Lý Tài Khoản (FEAT-USER-01)</span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-admin-primary text-[28px]">
                manage_accounts
              </span>
              Quản Lý Tài Khoản &amp; Phân Quyền Người Dùng Nội Bộ
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Cấp phát tài khoản, phân quyền 4 vai trò cố định và giám sát trạng thái đăng nhập hệ thống PMS
            </p>
          </div>

          {/* Nút Thêm mới tài khoản - Chỉ hiển thị khi có quyền USER_MANAGE */}
          <button
            onClick={handleOpenCreateModal}
            type="button"
            className="flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-[#1F4E78] hover:bg-[#163a5a] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>+ Thêm Tài Khoản Mới</span>
          </button>
        </div>

        {/* Thanh Công Cụ (Wireframe 6.1 - Mục 1) */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-space-md shadow-xs space-y-space-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm">
            {/* 1. Ô tìm kiếm theo tên / username / email */}
            <div className="md:col-span-5 relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo Họ tên, Username, Email, SĐT..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-admin-primary transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>

            {/* 2. Bộ lọc Vai trò (Admin, Lễ tân, Bếp, Dọn phòng, Tất cả) */}
            <div className="md:col-span-3">
              <select
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-admin-primary transition-colors cursor-pointer"
              >
                <option value="TAT_CA">Tất cả vai trò</option>
                <option value="Admin">Admin (Quản trị viên)</option>
                <option value="Receptionist">Lễ tân (Receptionist)</option>
                <option value="Kitchen">Bếp (Kitchen)</option>
                <option value="Housekeeping">Dọn phòng (Housekeeping)</option>
              </select>
            </div>

            {/* 3. Bộ lọc Trạng thái (Active, Locked, Tất cả) */}
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-admin-primary transition-colors cursor-pointer"
              >
                <option value="TAT_CA">Tất cả trạng thái</option>
                <option value="Active">Đang hoạt động</option>
                <option value="Locked">Đã khóa</option>
              </select>
            </div>

            {/* 4. Thứ tự sắp xếp A-Z */}
            <div className="md:col-span-2">
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Thay đổi thứ tự sắp xếp theo Họ và tên"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
                <span>Tên: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-space-xs border-t border-outline-variant/15">
            <span>
              Tìm thấy <strong className="text-on-surface">{totalUsers}</strong> tài khoản nội bộ phù hợp
            </span>
            <span>Hiển thị 10 dòng/trang theo chuẩn nghiệp vụ PMS</span>
          </div>
        </div>

        {/* Bảng Danh Sách Người Dùng (Wireframe 6.1 - Mục 2) */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Avatar</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Tên Đăng Nhập</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Số Điện Thoại</th>
                  <th className="py-3.5 px-4 text-center">Vai Trò</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center w-36">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-on-surface-variant">
                      <div className="inline-block w-8 h-8 border-3 border-admin-primary/30 border-t-admin-primary rounded-full animate-spin mb-2"></div>
                      <p className="text-xs">Đang tải danh sách tài khoản...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                        person_off
                      </span>
                      <p className="font-semibold text-sm">Không tìm thấy tài khoản nào phù hợp</p>
                      <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc tìm kiếm hoặc thêm mới tài khoản</p>
                    </td>
                  </tr>
                ) : (
                  users.map((item) => {
                    const isSelf = currentUser && currentUser.userId === item.userId;
                    const roleBadge = ROLE_BADGE_CONFIG[item.roleName] || DEFAULT_ROLE_CONFIG;
                    const isActive = item.status === 'Active';

                    return (
                      <tr
                        key={item.userId}
                        className="hover:bg-surface-container/50 transition-colors group"
                      >
                        {/* Avatar preview (Wireframe 6.1) */}
                        <td className="py-3 px-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center mx-auto overflow-hidden shadow-xs border border-outline-variant/30">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(item.fullName)}</span>
                            )}
                          </div>
                        </td>

                        {/* Họ và tên */}
                        <td className="py-3 px-4 font-bold text-on-surface">
                          <div className="flex items-center gap-1.5">
                            <span>{item.fullName}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold">
                                Bạn
                              </span>
                            )}
                          </div>
                          {item.employeeCode && (
                            <span className="text-[11px] font-mono text-on-surface-variant block">
                              Mã: {item.employeeCode}
                            </span>
                          )}
                        </td>

                        {/* Tên đăng nhập */}
                        <td className="py-3 px-4 font-mono text-xs text-on-surface font-semibold">
                          @{item.username}
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-on-surface-variant text-xs">
                          {item.email}
                        </td>

                        {/* Số điện thoại */}
                        <td className="py-3 px-4 text-on-surface-variant text-xs font-mono">
                          {item.phone || <span className="text-slate-500 italic">Chưa có</span>}
                        </td>

                        {/* Vai trò (4 màu cố định theo Spec 3 - Wireframe 6.1 Mục 3) */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${roleBadge.bg}`}>
                            {roleBadge.label}
                          </span>
                        </td>

                        {/* Trạng thái (Badge xanh Active / xám Locked theo Spec 3 - Wireframe 6.1 Mục 4) */}
                        <td className="py-3 px-4 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Đã khóa
                            </span>
                          )}
                        </td>

                        {/* Thao tác (Sửa / Khóa-Mở khóa / Reset mật khẩu / Xóa) */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Nút Sửa */}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              type="button"
                              title="Sửa thông tin tài khoản"
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-admin-primary hover:bg-admin-primary/10 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>

                            {/* Nút Khóa / Mở khóa (Rule 6.3: Disable nếu là chính mình) */}
                            <button
                              onClick={() => !isSelf && setStatusConfirmTarget(item)}
                              disabled={isSelf}
                              type="button"
                              title={
                                isSelf
                                  ? 'Bạn không thể khóa chính tài khoản đang đăng nhập'
                                  : (isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản')
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-slate-600 cursor-not-allowed opacity-40'
                                  : isActive
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isActive ? 'lock' : 'lock_open'}
                              </span>
                            </button>

                            {/* Nút Reset mật khẩu */}
                            <button
                              onClick={() => handleResetPassword(item)}
                              type="button"
                              title="Đặt lại mật khẩu tạm ngẫu nhiên"
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">key</span>
                            </button>

                            {/* Nút Xóa (Rule 6.3: Disable nếu là chính mình) */}
                            <button
                              onClick={() => !isSelf && setDeleteConfirmTarget(item)}
                              disabled={isSelf}
                              type="button"
                              title={
                                isSelf
                                  ? 'Bạn không thể xóa chính tài khoản đang đăng nhập'
                                  : 'Xóa mềm tài khoản'
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-slate-600 cursor-not-allowed opacity-40'
                                  : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân Trang (Wireframe 6.1 - Mục 5: 10 dòng/trang, vô hiệu hóa trang đầu/cuối) */}
          <div className="flex items-center justify-between px-space-md py-3 bg-surface-container-low border-t border-outline-variant/20 text-xs">
            <span className="text-on-surface-variant font-medium">
              Trang {currentPage} / {totalPages || 1} • Tổng {totalUsers} tài khoản
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-semibold hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-admin-primary text-[#002114] shadow-xs'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-semibold hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Sau</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL THÊM / SỬA TÀI KHOẢN (WIREFRAME 6.2) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Form: Nền xanh đậm #1F4E78, chữ trắng (Wireframe 6.2 - Mục 1) */}
            <div className="bg-[#1F4E78] text-white px-space-lg py-4 flex items-center justify-between shadow-xs">
              <h3 className="font-headline-sm text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px]">
                  {modalMode === 'create' ? 'person_add' : 'manage_accounts'}
                </span>
                {modalMode === 'create' ? 'Thêm Tài Khoản Mới' : 'Sửa Tài Khoản'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Nội dung Form - Thứ tự các field theo đúng Wireframe 6.2 & 6.3 */}
            <form onSubmit={handleSubmitForm} className="p-space-lg space-y-4 text-on-surface">
              {/* 1. Upload ảnh / Avatar preview (Wireframe 6.2 - Mục 2) */}
              <div className="flex items-center gap-4 pb-2 border-b border-outline-variant/15">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-white font-bold text-lg flex items-center justify-center overflow-hidden border-2 border-admin-primary/40 shadow-xs shrink-0">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(formData.fullName || 'NV')}</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Ảnh đại diện
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                    placeholder="URL ảnh (JPG, PNG, WEBP tối đa 2MB)"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-admin-primary"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Nếu để trống, hệ thống sẽ sử dụng biểu tượng avatar mặc định theo vai trò
                  </p>
                </div>
              </div>

              {/* 2. Tên đăng nhập * (Wireframe 6.2 - Mục 3: readonly khi sửa) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tên đăng nhập <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  disabled={modalMode === 'edit'}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  onBlur={() => handleBlur('username')}
                  placeholder="VD: nguyenvana"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm transition-colors ${
                    modalMode === 'edit'
                      ? 'bg-surface-container/60 text-on-surface-variant cursor-not-allowed border-outline-variant/30 font-mono'
                      : fieldErrors.username
                      ? 'bg-surface-container border-red-500 focus:outline-none'
                      : 'bg-surface-container border-outline-variant/30 text-on-surface focus:outline-none focus:border-admin-primary'
                  }`}
                />
                {modalMode === 'edit' && (
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Tên đăng nhập là định danh cố định không thể chỉnh sửa sau khi tạo
                  </p>
                )}
                {/* Lỗi hiển thị màu đỏ 13px ngay dưới ô input theo Spec 5.2 & 6.3 */}
                {fieldErrors.username && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {/* 3. Họ và tên * (Wireframe 6.2 - Mục 4) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Họ và tên <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  placeholder="VD: Nguyễn Văn A"
                  className={`w-full px-3.5 py-2 rounded-xl bg-surface-container border text-sm text-on-surface transition-colors ${
                    fieldErrors.fullName ? 'border-red-500 focus:outline-none' : 'border-outline-variant/30 focus:outline-none focus:border-admin-primary'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* 4. Email * (Wireframe 6.2 - Mục 5) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Email <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="VD: nguyenvana@hoteldomain.vn"
                  className={`w-full px-3.5 py-2 rounded-xl bg-surface-container border text-sm text-on-surface transition-colors ${
                    fieldErrors.email ? 'border-red-500 focus:outline-none' : 'border-outline-variant/30 focus:outline-none focus:border-admin-primary'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* 5. Số điện thoại (Wireframe 6.2 - Mục 6 - không bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="VD: 0912345678 (10 chữ số)"
                  className={`w-full px-3.5 py-2 rounded-xl bg-surface-container border text-sm text-on-surface transition-colors ${
                    fieldErrors.phone ? 'border-red-500 focus:outline-none' : 'border-outline-variant/30 focus:outline-none focus:border-admin-primary'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* 6. Mật khẩu (Wireframe 6.2 - Mục 7) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-on-surface">
                    {modalMode === 'create' ? (
                      <>Mật khẩu <span className="text-red-500 font-bold">*</span></>
                    ) : (
                      <>Mật khẩu <span className="text-on-surface-variant font-normal">(để trống nếu không đổi)</span></>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-admin-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder={modalMode === 'create' ? 'Tối thiểu 8 ký tự, gồm hoa, thường và số' : 'Nhập mật khẩu mới nếu muốn thay đổi'}
                  className={`w-full px-3.5 py-2 rounded-xl bg-surface-container border text-sm text-on-surface transition-colors ${
                    fieldErrors.password ? 'border-red-500 focus:outline-none' : 'border-outline-variant/30 focus:outline-none focus:border-admin-primary'
                  }`}
                />
                {fieldErrors.password && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* 7. Mã nhân viên (Wireframe 6.2 - Mục 8 - không bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  name="employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                  placeholder="VD: NV-0012 (nếu để trống hệ thống tự sinh)"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:border-admin-primary"
                />
              </div>

              {/* 8. Vai trò * (Wireframe 6.2 - Mục 9: Dropdown load động từ Roles) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Vai trò <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={(e) => handleInputChange('roleId', e.target.value)}
                  onBlur={() => handleBlur('roleId')}
                  className={`w-full px-3.5 py-2 rounded-xl bg-surface-container border text-sm text-on-surface transition-colors cursor-pointer ${
                    fieldErrors.roleId ? 'border-red-500 focus:outline-none' : 'border-outline-variant/30 focus:outline-none focus:border-admin-primary'
                  }`}
                >
                  <option value="">-- Vui lòng chọn 1 vai trò --</option>
                  {roles.map(r => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName} — {r.description}
                    </option>
                  ))}
                </select>
                {fieldErrors.roleId && (
                  <p className="text-[#D93025] text-[13px] font-medium mt-1 animate-in fade-in">
                    {fieldErrors.roleId}
                  </p>
                )}
              </div>

              {/* 9. Trạng thái (Wireframe 6.2 - Mục 10: Toggle chỉ hiển thị khi Sửa) */}
              {modalMode === 'edit' && (
                <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-on-surface">
                      Trạng thái tài khoản
                    </label>
                    <p className="text-[11px] text-on-surface-variant">
                      Tài khoản đã khóa sẽ không thể đăng nhập vào hệ thống
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('status', formData.status === 'Active' ? 'Locked' : 'Active')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        formData.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold">
                      {formData.status === 'Active' ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              )}

              {/* 10 & 11. Hàng nút Hủy và Lưu (Wireframe 6.2 - Mục 11 & 12, Rule 6.4: Hủy bên trái, Lưu bên phải) */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-white border border-[#999999] text-slate-800 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#1F4E78] text-white font-bold text-sm shadow-md hover:bg-[#163a5a] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL XÁC NHẬN KHÓA / MỞ KHÓA (SPEC 3 - LUỒNG 4.3) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {statusConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl p-space-lg text-on-surface animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                statusConfirmTarget.status === 'Active' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {statusConfirmTarget.status === 'Active' ? 'lock' : 'lock_open'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {statusConfirmTarget.status === 'Active' ? 'Khóa Tài Khoản' : 'Mở Khóa Tài Khoản'}
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">@{statusConfirmTarget.username}</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Bạn có chắc chắn muốn {statusConfirmTarget.status === 'Active' ? 'khóa' : 'mở khóa'} tài khoản của{' '}
              <strong className="text-on-surface">{statusConfirmTarget.fullName}</strong>?
              {statusConfirmTarget.status === 'Active' && (
                <span className="block text-xs text-amber-400 mt-2">
                  Lưu ý: Mọi phiên đăng nhập hiện tại của người dùng này sẽ bị thu hồi và buộc đăng xuất ngay lập tức.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#999999] text-slate-800 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                  statusConfirmTarget.status === 'Active'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Xác Nhận {statusConfirmTarget.status === 'Active' ? 'Khóa' : 'Mở Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL HIỂN THỊ MẬT KHẨU TẠM 1 LẦN DUY NHẤT (SPEC 3 - LUỒNG 4.4) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {tempPasswordModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl p-space-lg text-on-surface animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">key</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-blue-400">Đặt Lại Mật Khẩu Thành Công</h3>
                <p className="text-xs text-on-surface-variant">Nhân viên: {tempPasswordModal.targetName}</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Mật khẩu tạm thời đã được tạo ngẫu nhiên. Vì lý do an toàn bảo mật, mật khẩu này <strong>chỉ hiển thị 1 lần duy nhất</strong> cho Quản trị viên sao chép:
            </p>

            <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant/30 flex items-center justify-between mb-4">
              <span className="font-mono text-lg font-bold text-amber-300 tracking-wider">
                {tempPasswordModal.password}
              </span>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-primary text-[#002114] text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {tempPasswordModal.copied ? 'check' : 'content_copy'}
                </span>
                <span>{tempPasswordModal.copied ? 'Đã Sao Chép!' : 'Sao Chép'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-6 italic">
              * Nhân viên bắt buộc phải đổi sang mật khẩu mới ngay trong lần đăng nhập đầu tiên.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTempPasswordModal({ isOpen: false, targetName: '', password: '', copied: false })}
                className="px-5 py-2 rounded-xl bg-[#1F4E78] text-white font-bold text-sm shadow-md hover:bg-[#163a5a] transition-all cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL XÁC NHẬN XÓA TÀI KHOẢN (SPEC 3 - LUỒNG 4.5 & QUY TẮC 3.9) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl p-space-lg text-on-surface animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-red-400">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-on-surface-variant font-mono">@{deleteConfirmTarget.username}</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của{' '}
              <strong className="text-on-surface">{deleteConfirmTarget.fullName}</strong>?
              Hành động này sẽ thực hiện <strong>xóa mềm</strong> và vô hiệu hóa vĩnh viễn quyền truy cập của nhân viên này khỏi hệ thống.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#999999] text-slate-800 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-sm text-white shadow-md transition-all cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StaffManagement;
