import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = typeof window !== 'undefined' && window.location.port === '3000'
  ? '/api/v1/room-types'
  : 'http://localhost:5000/api/v1/room-types';

const EMPTY_FORM = {
  typeName: '',
  description: '',
  basePrice: '',
  adultCapacity: 2,
  childCapacity: 1,
  images: [],
  amenityIds: [],
  status: 'Active',
};

// Định dạng tiền tệ VND có dấu phân cách
const fmtVND = (n) =>
  Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' ₫';

// Xử lý icon tiện ích chuẩn Material Symbols (tránh truyền URL vào font ligature)
const getSafeAmenityIcon = (rawIcon, name = '') => {
  if (rawIcon && !rawIcon.startsWith('http') && !rawIcon.includes('/') && !rawIcon.includes('.')) {
    return rawIcon;
  }
  const n = (name || '').toLowerCase();
  if (n.includes('wifi') || n.includes('wi-fi') || n.includes('mạng')) return 'wifi';
  if (n.includes('ban công') || n.includes('biển') || n.includes('view') || n.includes('hướng')) return 'deck';
  if (n.includes('bồn tắm') || n.includes('jacuzzi') || n.includes('tắm')) return 'bathtub';
  if (n.includes('bar') || n.includes('rượu') || n.includes('minibar')) return 'local_bar';
  if (n.includes('cà phê') || n.includes('coffee') || n.includes('tea') || n.includes('trà')) return 'coffee';
  if (n.includes('ada') || n.includes('xe lăn') || n.includes('khuyết tật')) return 'accessible';
  if (n.includes('hồ bơi') || n.includes('bơi') || n.includes('pool')) return 'pool';
  if (n.includes('quản gia') || n.includes('phục vụ') || n.includes('service')) return 'room_service';
  if (n.includes('bếp') || n.includes('nấu') || n.includes('kitchen')) return 'kitchen';
  if (n.includes('két sắt') || n.includes('khoá') || n.includes('an toàn')) return 'lock';
  if (n.includes('tv') || n.includes('ti vi') || n.includes('tivi')) return 'tv';
  if (n.includes('điều hòa') || n.includes('lạnh') || n.includes('lọc khí') || n.includes('ac')) return 'ac_unit';
  return 'check_circle';
};

const RoomTypeManagement = () => {
  const { user, token } = useAuth();

  // ─── Dữ liệu thật 100% từ MySQL (Không dùng mock data) ─────────────────────
  const [roomTypes, setRoomTypes] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Trạng thái kết nối CSDL MySQL & Cảnh báo mất kết nối ─────────────────
  const [backendConnected, setBackendConnected] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // ─── Thống kê số lượng phòng hoạt động & ngừng cung cấp ───────────────────
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    avgPrice: 0,
  });

  // ─── Bộ lọc & Tìm kiếm ───────────────────────────────────────────────────
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | Active | Inactive
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Form Modal Thêm/Sửa (Wireframe 6.2) ──────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // ─── Modal Xóa mềm ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Toast thông báo ──────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  const canManage = useMemo(() => {
    const roleName = user?.roleName || user?.role?.RoleName || '';
    return roleName.toLowerCase() === 'admin' || !user;
  }, [user]);

  const showToast = (msg, type = 'success', code = '') => {
    setToast({ msg, type, code });
    setTimeout(() => setToast(null), 4500);
  };

  // ─── TẢI DỮ LIỆU THẬT & KIỂM TRA KẾT NỐI MYSQL ────────────────────────────
  const fetchAllData = async () => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

      // 1. Tải danh sách Loại phòng từ MySQL
      const res = await fetch(API_BASE_URL, {
        headers: { Authorization: authHeaderVal },
      });

      if (!res.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRoomTypes(json.data);
        setBackendConnected(true);
        setConnectionError(null);
        setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));

        // Cập nhật thống kê từ server hoặc tự tính từ dữ liệu thật
        const realTotal = json.data.length;
        const realActive = json.data.filter(
          (r) => r.status === 'Active' || r.status === 'active'
        ).length;
        const realInactive = realTotal - realActive;
        const avgPrice =
          realTotal > 0
            ? json.data.reduce((sum, r) => sum + Number(r.basePrice || 0), 0) / realTotal
            : 0;

        setStats({
          total: json.stats?.total ?? realTotal,
          active: json.stats?.active ?? realActive,
          inactive: json.stats?.inactive ?? realInactive,
          avgPrice: Math.round(avgPrice),
        });
      } else {
        throw new Error(json.message || 'Dữ liệu trả về không hợp lệ');
      }

      // 2. Tải danh mục tiện ích thật từ MySQL
      try {
        const amenRes = await fetch(`${API_BASE_URL}/amenities`);
        if (amenRes.ok) {
          const amenJson = await amenRes.json();
          if (amenJson.success && Array.isArray(amenJson.data)) {
            setAmenitiesList(amenJson.data);
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('Lỗi kết nối CSDL MySQL:', err);
      setBackendConnected(false);
      setConnectionError(
        'MẤT KẾT NỐI TỚI CƠ SỞ DỮ LIỆU MYSQL! Vui lòng kiểm tra Docker container (hotel_backend, hotel_mysql) hoặc dịch vụ mạng.'
      );
      showToast(
        'Mất kết nối tới CSDL MySQL! Không thể đồng bộ dữ liệu.',
        'error',
        'ERR_MYSQL_DISCONNECTED'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Tự động kiểm tra lại kết nối định kỳ mỗi 30 giây
    const interval = setInterval(() => {
      const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';
      fetch(`${API_BASE_URL}?limit=1`, {
        headers: { Authorization: authHeaderVal }
      })
        .then((r) => {
          if (r.ok) {
            setBackendConnected(true);
            setConnectionError(null);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── TÍNH TOÁN SỨC CHỨA TỰ ĐỘNG (adultCapacity + childCapacity) ───────────
  const computedMaxOccupancy = useMemo(() => {
    const a = Number(formData.adultCapacity) || 0;
    const c = Number(formData.childCapacity) || 0;
    return a + c;
  }, [formData.adultCapacity, formData.childCapacity]);

  // ─── TÌM KIẾM VÀ PHÂN TRANG 10 DÒNG/TRANG (Wireframe 6.1) ─────────────────
  const filteredList = useMemo(() => {
    return roomTypes
      .filter((r) => {
        const nameMatch = (r.typeName || r.name || '')
          .toLowerCase()
          .includes(filterText.trim().toLowerCase());
        const statusMatch =
          filterStatus === 'all' ||
          (filterStatus === 'Active' && (r.status === 'Active' || r.status === 'active')) ||
          (filterStatus === 'Inactive' && (r.status === 'Inactive' || r.status === 'inactive'));
        return nameMatch && statusMatch;
      })
      .sort((a, b) => (a.typeName || a.name || '').localeCompare(b.typeName || b.name || ''));
  }, [roomTypes, filterText, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterStatus]);

  // ─── VALIDATE FORM (Mục 3 & 5.2 Spec) ─────────────────────────────────────
  const validateField = (field, val, allData = formData) => {
    let err = '';
    if (field === 'typeName') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        err = 'Tên loại phòng không được để trống';
      } else if (trimmed.length < 2) {
        err = 'Tên loại phòng phải có ít nhất 2 ký tự';
      } else if (trimmed.length > 100) {
        err = 'Tên loại phòng không được vượt quá 100 ký tự';
      } else {
        const isDuplicate = roomTypes.some(
          (r) =>
            (r.typeName || r.name || '').trim().toLowerCase() === trimmed.toLowerCase() &&
            (!isEditMode || (r.id !== editingId && r.RoomTypeId !== editingId))
        );
        if (isDuplicate) {
          err = 'Tên loại phòng đã được sử dụng, vui lòng chọn tên khác';
        }
      }
    }

    if (field === 'description') {
      if (val && String(val).length > 1000) {
        err = 'Mô tả không được vượt quá 1000 ký tự';
      }
    }

    if (field === 'basePrice') {
      if (val === '' || val === null || val === undefined) {
        err = 'Giá cơ bản không được để trống';
      } else {
        const num = Number(val);
        if (isNaN(num) || num <= 0 || num > 999999999.99) {
          err = 'Giá cơ bản phải là số lớn hơn 0';
        }
      }
    }

    if (field === 'adultCapacity') {
      const num = Number(val);
      if (val === '' || val === null || val === undefined || isNaN(num) || !Number.isInteger(num) || num < 1 || num > 10) {
        err = 'Số người lớn tối đa phải là số nguyên từ 1 đến 10';
      }
    }

    if (field === 'childCapacity') {
      const num = Number(val);
      if (val === '' || val === null || val === undefined || isNaN(num) || !Number.isInteger(num) || num < 0 || num > 10) {
        err = 'Số trẻ em tối đa phải là số nguyên từ 0 đến 10';
      } else {
        const total = (Number(allData.adultCapacity) || 0) + num;
        if (total > 20) {
          err = 'Sức chứa tối đa không được vượt quá 20 người';
        }
      }
    }

    if (field === 'images') {
      const arr = Array.isArray(val) ? val : [];
      if (arr.length === 0) {
        err = 'Vui lòng tải lên ít nhất 1 hình ảnh';
      } else if (arr.length > 10) {
        err = 'Chỉ được chọn tối đa 10 hình ảnh';
      }
    }

    if (field === 'amenityIds') {
      const arr = Array.isArray(val) ? val : [];
      if (arr.length === 0) {
        err = 'Vui lòng chọn ít nhất 1 tiện ích';
      }
    }

    return err;
  };

  const validateAll = () => {
    const errors = {};
    const fields = ['typeName', 'description', 'basePrice', 'adultCapacity', 'childCapacity', 'images', 'amenityIds'];
    fields.forEach((f) => {
      const msg = validateField(f, formData[f], formData);
      if (msg) errors[f] = msg;
    });

    const totalCap = (Number(formData.adultCapacity) || 0) + (Number(formData.childCapacity) || 0);
    if (totalCap > 20 && !errors.childCapacity) {
      errors.childCapacity = 'Sức chứa tối đa không được vượt quá 20 người';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── THAO TÁC MODAL THÊM / SỬA ───────────────────────────────────────────
  const openCreateModal = () => {
    setFormData({
      typeName: '',
      description: '',
      basePrice: '',
      adultCapacity: 2,
      childCapacity: 1,
      images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'],
      amenityIds: amenitiesList.length > 0 ? [amenitiesList[0].id] : [1],
      status: 'Active',
    });
    setFormErrors({});
    setIsEditMode(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rt) => {
    const rawImages = rt.images || (rt.hinh_anh ? [rt.hinh_anh] : (rt.image ? [rt.image] : []));
    const rawAmenities = rt.amenityIds || rt.amenities || rt.tien_ich || [];
    const parsedAmenities = rawAmenities.map((item) => (typeof item === 'object' ? item.id : Number(item)));

    setFormData({
      typeName: rt.typeName || rt.name || '',
      description: rt.description || rt.mo_ta || '',
      basePrice: rt.basePrice || rt.gia_co_ban || rt.baseRate || '',
      adultCapacity: rt.adultCapacity || rt.toi_da_nguoi_lon || 2,
      childCapacity: rt.childCapacity !== undefined ? rt.childCapacity : (rt.toi_da_tre_em ?? 1),
      images: rawImages.length > 0 ? rawImages : ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'],
      amenityIds: parsedAmenities.length > 0 ? parsedAmenities : [1],
      status: rt.status === 'Inactive' || rt.status === 'inactive' ? 'Inactive' : 'Active',
    });
    setFormErrors({});
    setIsEditMode(true);
    setEditingId(rt.RoomTypeId || rt.id);
    setIsModalOpen(true);
  };

  const handleInputChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const cp = { ...prev };
        delete cp[field];
        return cp;
      });
    }
  };

  const handleBlur = (field) => {
    const msg = validateField(field, formData[field], formData);
    if (msg) {
      setFormErrors((prev) => ({ ...prev, [field]: msg }));
    }
  };

  const handleAddImage = (url) => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();

    if (cleanUrl.toLowerCase().includes('.pdf')) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)',
      }));
      return;
    }

    if (formData.images.length >= 10) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'Chỉ được chọn tối đa 10 hình ảnh',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, images: [...prev.images, cleanUrl] }));
    setNewImageUrl('');
    setFormErrors((prev) => {
      const cp = { ...prev };
      delete cp.images;
      return cp;
    });
  };

  const handleRemoveImage = (indexToRemove) => {
    const nextImages = formData.images.filter((_, idx) => idx !== indexToRemove);
    setFormData((prev) => ({ ...prev, images: nextImages }));
    if (nextImages.length === 0) {
      setFormErrors((prev) => ({
        ...prev,
        images: 'Vui lòng tải lên ít nhất 1 hình ảnh',
      }));
    }
  };

  const handleMakeThumbnail = (index) => {
    if (index === 0) return;
    const chosen = formData.images[index];
    const remaining = formData.images.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, images: [chosen, ...remaining] }));
  };

  const toggleAmenity = (amenityId) => {
    const numId = Number(amenityId);
    let nextList = [];
    if (formData.amenityIds.includes(numId)) {
      nextList = formData.amenityIds.filter((id) => id !== numId);
    } else {
      nextList = [...formData.amenityIds, numId];
    }
    setFormData((prev) => ({ ...prev, amenityIds: nextList }));
    if (nextList.length === 0) {
      setFormErrors((prev) => ({
        ...prev,
        amenityIds: 'Vui lòng chọn ít nhất 1 tiện ích',
      }));
    } else {
      setFormErrors((prev) => {
        const cp = { ...prev };
        delete cp.amenityIds;
        return cp;
      });
    }
  };

  // ─── GỬI FORM LƯU (POST / PUT) ────────────────────────────────────────────
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    const cleanTypeName = formData.typeName.trim();
    const cleanPrice = Math.floor(Number(formData.basePrice) * 100) / 100;
    const cleanDesc = formData.description ? formData.description.trim() : null;

    const payload = {
      typeName: cleanTypeName,
      description: cleanDesc,
      basePrice: cleanPrice,
      adultCapacity: Number(formData.adultCapacity),
      childCapacity: Number(formData.childCapacity),
      images: formData.images,
      amenityIds: formData.amenityIds,
      status: formData.status,
    };

    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const url = isEditMode ? `${API_BASE_URL}/${editingId}` : API_BASE_URL;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === 'ERROR_0007_DUPLICATE') {
          setFormErrors((p) => ({ ...p, typeName: data.message }));
        } else {
          showToast(data.message || 'Thao tác không thành công', 'error', data.code);
        }
        setIsSubmitting(false);
        return;
      }

      showToast(
        isEditMode ? 'Cập nhật loại phòng thành công' : 'Thêm mới loại phòng thành công',
        'success'
      );
      setIsModalOpen(false);
      fetchAllData();
    } catch (err) {
      showToast('Lỗi máy chủ hoặc mất kết nối CSDL!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── CHUYỂN ĐỔI TRẠNG THÁI TRỰC TIẾP (1 CLICK TRÊN BẢNG) ─────────────────
  const handleToggleStatus = async (rt) => {
    if (!canManage) return;
    const currentActive = rt.status === 'Active' || rt.status === 'active';
    const nextStatus = currentActive ? 'Inactive' : 'Active';
    const targetId = rt.RoomTypeId || rt.id;

    // Cập nhật giao diện tức thì (Optimistic)
    setRoomTypes((prev) =>
      prev.map((r) =>
        r.RoomTypeId === targetId || r.id === targetId ? { ...r, status: nextStatus } : r
      )
    );

    // Cập nhật thống kê tức thì
    setStats((prev) => ({
      ...prev,
      active: currentActive ? prev.active - 1 : prev.active + 1,
      inactive: currentActive ? prev.inactive + 1 : prev.inactive - 1,
    }));

    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/${targetId}/trang-thai`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
        body: JSON.stringify({ status: nextStatus, trang_thai: nextStatus.toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback nếu thất bại
        setRoomTypes((prev) =>
          prev.map((r) =>
            r.RoomTypeId === targetId || r.id === targetId ? { ...r, status: rt.status } : r
          )
        );
        showToast(data.message || 'Không thể đổi trạng thái', 'error');
        fetchAllData();
        return;
      }

      showToast(
        `Đã chuyển loại phòng "${rt.typeName || rt.name}" sang: ${
          nextStatus === 'Active'
            ? 'Đang hoạt động (Hiển thị trên Home)'
            : 'Ngừng cung cấp (Ẩn khỏi Home)'
        }`,
        'success'
      );
    } catch (_) {
      showToast('Lỗi kết nối MySQL khi lưu trạng thái!', 'error');
      fetchAllData();
    }
  };

  // ─── XÓA MỀM LOẠI PHÒNG ───────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const targetId = deleteTarget.RoomTypeId || deleteTarget.id;
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: authHeaderVal },
      });

      const data = await res.json();

      if (data.code === 'ERROR_0015_HAS_RELATED_DATA') {
        showToast(
          'Không thể xóa loại phòng vì vẫn còn phòng hoặc đặt phòng liên quan',
          'error',
          'ERROR_0015_HAS_RELATED_DATA'
        );
        setIsDeleting(false);
        setDeleteTarget(null);
        return;
      }

      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể xóa loại phòng', 'error');
        setIsDeleting(false);
        setDeleteTarget(null);
        return;
      }

      showToast('Xóa loại phòng thành công', 'success');
      setDeleteTarget(null);
      fetchAllData();
    } catch (_) {
      showToast('Lỗi máy chủ khi xóa loại phòng!', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full min-h-screen">
        {/* Toast thông báo */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[300] max-w-md flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl font-semibold transition-all duration-300 animate-bounce-short ${
              toast.type === 'error'
                ? 'bg-[#D93025] text-white shadow-red-500/30'
                : toast.type === 'info'
                ? 'bg-[#1F4E78] text-white shadow-blue-500/30'
                : 'bg-emerald-600 text-white shadow-emerald-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <div className="flex flex-col">
              <span className="text-[14px] leading-snug">{toast.msg}</span>
              {toast.code && (
                <span className="text-[11px] font-mono opacity-80 mt-0.5">Mã lỗi: {toast.code}</span>
              )}
            </div>
          </div>
        )}

        {/* ⚠️ CẢNH BÁO MẤT KẾT NỐI MYSQL (NẾU MẤT KẾT NỐI) */}
        {!backendConnected && (
          <div className="mb-5 p-4 bg-red-50 border-2 border-[#D93025] rounded-xl flex items-center justify-between gap-4 text-[#D93025] shadow-md animate-pulse">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] flex-shrink-0">
                cloud_off
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-base uppercase tracking-wide">
                  CẢNH BÁO: MẤT KẾT NỐI TỚI CƠ SỞ DỮ LIỆU MYSQL!
                </span>
                <span className="text-xs text-red-700">
                  {connectionError || 'Không thể kết nối đến máy chủ MySQL. Dữ liệu chưa thể đồng bộ và thao tác cập nhật sẽ bị gián đoạn.'}
                </span>
              </div>
            </div>

            <button
              onClick={fetchAllData}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#D93025] text-white rounded-lg text-xs font-bold hover:bg-red-700 transition shadow-sm whitespace-nowrap"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              <span>Thử Kết Nối Lại Ngay</span>
            </button>
          </div>
        )}

        {/* Header Trang & Trạng Thái Đồng Bộ MySQL */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider font-bold">
              <span className="text-[#1F4E78]">PMS Quản Trị Khách Sạn</span>
              <span className="text-gray-400">//</span>
              <span className="text-gray-500">Bảng Dữ Liệu Thực Tế MySQL</span>
              <span className="text-gray-400">//</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  backendConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-red-50 text-red-700 border border-red-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                {backendConnected
                  ? `MySQL Đã Kết Nối (${lastSyncedTime || 'Trực tiếp'})`
                  : 'Mất Kết Nối MySQL'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight mt-1">
              Quản Lý Danh Mục Loại Phòng (Room Type Catalog)
            </h1>
            <p className="text-sm text-gray-600">
              Đồng bộ dữ liệu thực tế từ MySQL với Trang chủ (Home). Quản lý chính xác số lượng phòng hoạt động &amp; ngừng cung cấp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Xem Trang Chủ */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm font-bold hover:bg-emerald-100 transition shadow-xs"
              title="Mở Trang Chủ để kiểm tra phòng Active hiển thị ra sao"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              <span>Xem Trang Chủ (Home)</span>
            </a>

            {/* Nút Tải lại dữ liệu */}
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition shadow-xs"
              type="button"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Đồng Bộ Lại</span>
            </button>

            {/* Nút Thêm loại phòng mới */}
            {canManage && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1F4E78] text-white text-sm font-bold rounded-lg hover:bg-[#163a5c] shadow-xs transition"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Thêm Loại Phòng Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── THẺ THỐNG KÊ RÕ RÀNG: PHÒNG HOẠT ĐỘNG & NGỪNG CUNG CẤP ───────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* 1. Tổng số loại phòng */}
          <div
            onClick={() => setFilterStatus('all')}
            className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition hover:shadow-md ${
              filterStatus === 'all' ? 'border-[#1F4E78] ring-2 ring-[#1F4E78]/20' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Tổng Danh Mục Loại Phòng
              </span>
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1F4E78]">
                <span className="material-symbols-outlined text-[20px]">category</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-gray-900">
                {stats.total.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-semibold text-gray-500">Hạng phòng</span>
            </div>
            <span className="text-[11px] text-[#1F4E78] font-semibold mt-1 block">
              Bấm để xem tất cả
            </span>
          </div>

          {/* 2. Số phòng đang hoạt động (Hiển thị trên Home) */}
          <div
            onClick={() => setFilterStatus('Active')}
            className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition hover:shadow-md ${
              filterStatus === 'Active' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">
                Đang Hoạt Động (Mở Bán)
              </span>
              <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {stats.active.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                ({stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
              ✓ Hiển thị trên Trang Chủ &amp; Đặt phòng
            </span>
          </div>

          {/* 3. Số phòng ngừng cung cấp (Ẩn khỏi Home) */}
          <div
            onClick={() => setFilterStatus('Inactive')}
            className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition hover:shadow-md ${
              filterStatus === 'Inactive' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-gray-600 tracking-wider">
                Ngừng Cung Cấp (Tạm Dừng)
              </span>
              <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                <span className="material-symbols-outlined text-[20px]">pause_circle</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-gray-700">
                {stats.inactive.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                ({stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%)
              </span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium mt-1 block">
              ⏸ Bị ẩn khỏi Trang Chủ (Chỉ lưu tra cứu)
            </span>
          </div>

          {/* 4. Giá niêm yết trung bình */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Giá Niêm Yết Trung Bình
              </span>
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1F4E78]">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-[#1F4E78]">
                {fmtVND(stats.avgPrice)}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono mt-1 block">
              Giá chuẩn theo ngày thường
            </span>
          </div>
        </div>

        {/* ─── THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ───────────────────────────────── */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">
                search
              </span>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-300 pl-10 pr-9 py-2 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E78] focus:bg-white transition"
                placeholder="Tìm kiếm theo tên loại phòng..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Lọc trạng thái:
            </span>
            <div className="inline-flex p-1 bg-gray-100 rounded-lg gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  filterStatus === 'all'
                    ? 'bg-[#1F4E78] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất Cả ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Active')}
                className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                  filterStatus === 'Active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Đang hoạt động ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Inactive')}
                className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                  filterStatus === 'Inactive'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Ngừng cung cấp ({stats.inactive})
              </button>
            </div>
          </div>
        </div>

        {/* ─── BẢNG DANH SÁCH LOẠI PHÒNG (10 DÒNG/TRANG) ────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4 w-28">Ảnh đại diện</th>
                  <th className="py-3 px-4">Tên loại phòng</th>
                  <th className="py-3 px-4 text-center">Sức chứa</th>
                  <th className="py-3 px-4 text-right">Giá cơ bản</th>
                  <th className="py-3 px-4 text-center">Số tiện ích</th>
                  <th className="py-3 px-4 text-center">Trạng thái (Bấm để đổi)</th>
                  <th className="py-3 px-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-500">
                      <div className="inline-flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[32px] text-[#1F4E78] animate-spin">
                          progress_activity
                        </span>
                        <span className="text-xs font-semibold">Đang tải dữ liệu thật từ MySQL...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                      Không tìm thấy loại phòng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((rt) => {
                    const thumbnail =
                      (rt.images && rt.images[0]) ||
                      rt.hinh_anh ||
                      rt.image ||
                      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80';
                    const adult = rt.adultCapacity || rt.toi_da_nguoi_lon || 2;
                    const child = rt.childCapacity !== undefined ? rt.childCapacity : (rt.toi_da_tre_em ?? 1);
                    const maxOcc = rt.maxOccupancy || rt.toi_da_tong || adult + child;
                    const price = rt.basePrice || rt.gia_co_ban || rt.baseRate || 0;
                    const amenitiesCount =
                      (rt.amenityIds && rt.amenityIds.length) ||
                      (rt.amenities && rt.amenities.length) ||
                      (rt.tien_ich && rt.tien_ich.length) ||
                      0;
                    const isActive = rt.status === 'Active' || rt.status === 'active';

                    return (
                      <tr key={rt.RoomTypeId || rt.id} className="hover:bg-blue-50/40 transition">
                        {/* 1. Ảnh đại diện */}
                        <td className="py-3 px-4">
                          <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                            <img
                              src={thumbnail}
                              alt={rt.typeName || rt.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80';
                              }}
                            />
                          </div>
                        </td>

                        {/* 2. Tên loại phòng */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">
                              {rt.typeName || rt.name}
                            </span>
                            {rt.description && (
                              <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {rt.description}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-gray-400 mt-0.5">
                              ID: #{rt.RoomTypeId || rt.id} {rt.code ? `• Mã: ${rt.code}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* 3. Sức chứa */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-semibold text-gray-900 text-xs">
                              {adult} Lớn / {child} Trẻ
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              (Tối đa: {maxOcc} người)
                            </span>
                          </div>
                        </td>

                        {/* 4. Giá cơ bản */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                          {fmtVND(price)}
                        </td>

                        {/* 5. Số tiện ích */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            <span className="material-symbols-outlined text-[14px] text-[#1F4E78]">
                              local_hotel
                            </span>
                            {amenitiesCount} tiện ích
                          </span>
                        </td>

                        {/* 6. Trạng thái (Bấm trực tiếp để chuyển đổi) */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => handleToggleStatus(rt)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition select-none ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                            } ${canManage ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
                            title={
                              canManage
                                ? `Bấm để chuyển sang: ${
                                    isActive
                                      ? 'Ngừng cung cấp (Sẽ ẩn khỏi Home)'
                                      : 'Đang hoạt động (Sẽ hiện lên Home)'
                                  }`
                                : 'Chỉ xem'
                            }
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-1.5 ${
                                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                              }`}
                            />
                            <span>{isActive ? 'Đang hoạt động' : 'Ngừng cung cấp'}</span>
                            {canManage && (
                              <span
                                className="material-symbols-outlined text-[14px] ml-1 opacity-60 hover:opacity-100"
                                title="Đổi trạng thái"
                              >
                                swap_horiz
                              </span>
                            )}
                          </button>
                        </td>

                        {/* 7. Nút Sửa / Xóa */}
                        <td className="py-3 px-4 text-center">
                          {canManage ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(rt)}
                                className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                title="Sửa loại phòng"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(rt)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                                title="Xóa loại phòng"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang 10 dòng/trang */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-600">
              Hiển thị {filteredList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filteredList.length)} trên tổng số{' '}
              <strong>{filteredList.length}</strong> loại phòng (10 dòng/trang)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                &larr; Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push(-1 * p);
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p) => {
                  if (p < 0) {
                    return (
                      <span key={p} className="px-1 text-gray-400 font-mono text-xs">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded text-xs font-bold transition ${
                        currentPage === p
                          ? 'bg-[#1F4E78] text-white shadow-xs'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* ─── MODAL DIALOG THÊM / SỬA LOẠI PHÒNG (MỤC 6.2 WIREFRAME) ───────── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-gray-200">
              {/* Header: Nền xanh đậm #1F4E78, chữ trắng (Mục 6.2 STT 1) */}
              <div className="bg-[#1F4E78] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px]">
                    {isEditMode ? 'edit_note' : 'add_box'}
                  </span>
                  <h2 className="text-lg font-bold tracking-tight">
                    {isEditMode ? 'Sửa loại phòng' : 'Thêm loại phòng mới'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
                  type="button"
                  title="Đóng form"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Nội Dung (Mục 6.2 & 6.3) */}
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
                {/* 1. Upload ảnh */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Hình ảnh loại phòng <span className="text-[#D93025]">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Tối thiểu 1 ảnh (ảnh đầu tiên là <strong>Ảnh đại diện / Thumbnail</strong>), tối đa 10 ảnh. Định dạng JPG, PNG, WEBP (tối đa 5MB/ảnh).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-3">
                    {formData.images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative group rounded-lg overflow-hidden border-2 h-24 bg-gray-100 ${
                          idx === 0 ? 'border-[#1F4E78] ring-2 ring-[#1F4E78]/30' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80';
                          }}
                        />

                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-[#1F4E78] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            Đại diện
                          </span>
                        )}

                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleMakeThumbnail(idx)}
                            className="absolute bottom-1 left-1 bg-black/60 hover:bg-[#1F4E78] text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                            title="Đặt làm ảnh đại diện"
                          >
                            Đại diện
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-[#D93025] text-white rounded-full flex items-center justify-center transition"
                          title="Xóa ảnh"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Dán link ảnh (https://...) và bấm Thêm ảnh..."
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddImage(newImageUrl)}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition"
                    >
                      + Thêm URL
                    </button>
                  </div>

                  {formErrors.images && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.images}
                    </span>
                  )}
                </div>

                {/* 2. Tên loại phòng */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Tên loại phòng <span className="text-[#D93025]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.typeName}
                    maxLength={100}
                    onChange={(e) => handleInputChange('typeName', e.target.value)}
                    onBlur={() => handleBlur('typeName')}
                    placeholder="VD: Deluxe, Suite, Standard"
                    className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      formErrors.typeName
                        ? 'border-[#D93025] focus:ring-[#D93025]'
                        : 'border-gray-300 focus:ring-[#1F4E78]'
                    }`}
                  />
                  {formErrors.typeName && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.typeName}
                    </span>
                  )}
                </div>

                {/* 3. Mô tả */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-800">Mô tả</label>
                    <span className="text-xs text-gray-500 font-mono">
                      {formData.description ? formData.description.length : 0} / 1000 ký tự
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    placeholder="Mô tả đặc điểm loại phòng (không bắt buộc)"
                    className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none ${
                      formErrors.description
                        ? 'border-[#D93025] focus:ring-[#D93025]'
                        : 'border-gray-300 focus:ring-[#1F4E78]'
                    }`}
                  />
                  {formErrors.description && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.description}
                    </span>
                  )}
                </div>

                {/* 4. Giá cơ bản */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Giá cơ bản (VND) <span className="text-[#D93025]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999999999.99}
                    step="any"
                    value={formData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                    onBlur={() => handleBlur('basePrice')}
                    placeholder="VD: 1,500,000"
                    className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                      formErrors.basePrice
                        ? 'border-[#D93025] focus:ring-[#D93025]'
                        : 'border-gray-300 focus:ring-[#1F4E78]'
                    }`}
                  />
                  {formData.basePrice && !isNaN(Number(formData.basePrice)) && (
                    <span className="text-xs text-gray-500 font-mono mt-0.5 block">
                      Hiển thị định dạng: <strong>{fmtVND(formData.basePrice)}</strong>
                    </span>
                  )}
                  {formErrors.basePrice && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.basePrice}
                    </span>
                  )}
                </div>

                {/* 5. Sức chứa */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-gray-800 block mb-1">
                        Số người lớn tối đa <span className="text-[#D93025]">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.adultCapacity}
                        onChange={(e) => handleInputChange('adultCapacity', e.target.value)}
                        onBlur={() => handleBlur('adultCapacity')}
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                          formErrors.adultCapacity
                            ? 'border-[#D93025] focus:ring-[#D93025]'
                            : 'border-gray-300 focus:ring-[#1F4E78]'
                        }`}
                      />
                      {formErrors.adultCapacity && (
                        <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                          {formErrors.adultCapacity}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-bold text-gray-800 block mb-1">
                        Số trẻ em tối đa <span className="text-[#D93025]">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={formData.childCapacity}
                        onChange={(e) => handleInputChange('childCapacity', e.target.value)}
                        onBlur={() => handleBlur('childCapacity')}
                        className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                          formErrors.childCapacity
                            ? 'border-[#D93025] focus:ring-[#D93025]'
                            : 'border-gray-300 focus:ring-[#1F4E78]'
                        }`}
                      />
                      {formErrors.childCapacity && (
                        <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                          {formErrors.childCapacity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 p-2 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-gray-700">
                    <span className="font-medium">
                      Sức chứa tối đa: <strong className="text-[#1F4E78] font-mono text-sm">{computedMaxOccupancy}</strong> người (người lớn + trẻ em)
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">(Tối đa 20 người)</span>
                  </div>
                </div>

                {/* 6. Tiện ích */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-800">
                      Tiện ích <span className="text-[#D93025]">*</span>
                    </label>
                    <span className="text-xs text-gray-500 font-mono">
                      Đã chọn: <strong>{formData.amenityIds.length}</strong> tiện ích
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    {amenitiesList.map((a) => {
                      const isChecked = formData.amenityIds.includes(Number(a.id));
                      const iconName = getSafeAmenityIcon(a.icon, a.name);
                      return (
                        <label
                          key={a.id}
                          className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border text-xs font-medium transition select-none ${
                            isChecked
                              ? 'bg-blue-50 border-[#1F4E78] text-[#1F4E78] shadow-xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                          title={a.name}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAmenity(a.id)}
                            className="w-4 h-4 accent-[#1F4E78] rounded cursor-pointer flex-shrink-0"
                          />
                          <span className="material-symbols-outlined text-[18px] text-[#1F4E78] flex-shrink-0">
                            {iconName}
                          </span>
                          <span className="truncate flex-1">{a.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {formErrors.amenityIds && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.amenityIds}
                    </span>
                  )}
                </div>

                {/* 7. Trạng thái */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">Trạng thái</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={formData.status === 'Active'}
                        onChange={() => handleInputChange('status', 'Active')}
                        className="w-4 h-4 accent-[#1F4E78]"
                      />
                      <span>Đang hoạt động (Active - Hiển thị trên Home)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                      <input
                        type="radio"
                        name="status"
                        value="Inactive"
                        checked={formData.status === 'Inactive'}
                        onChange={() => handleInputChange('status', 'Inactive')}
                        className="w-4 h-4 accent-[#1F4E78]"
                      />
                      <span>Ngừng cung cấp (Inactive - Ẩn khỏi Home)</span>
                    </label>
                  </div>
                </div>

                {/* 8. Hàng nút Hủy & Lưu */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-[#999999] text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition shadow-xs"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#1F4E78] text-white text-sm font-bold rounded-lg hover:bg-[#163a5c] disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                    )}
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── HỘP THOẠI XÁC NHẬN XÓA LOẠI PHÒNG (Mục 3.9) ──────────────────── */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border border-gray-200">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <span className="material-symbols-outlined text-[32px]">warning</span>
                <h3 className="text-lg font-bold text-gray-900">Xác Nhận Xóa Loại Phòng</h3>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed mb-6">
                Bạn có chắc chắn muốn xóa loại phòng{' '}
                <strong className="text-gray-900">
                  [{deleteTarget.typeName || deleteTarget.name}]
                </strong>
                ? Hành động này có thể khôi phục trong vòng 30 ngày.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-white border border-[#999999] text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-[#D93025] text-white text-sm font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  {isDeleting && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>Xác nhận xóa</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RoomTypeManagement;
