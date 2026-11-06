import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

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
  const fileInputRef = useRef(null);

  // ─── Modal Xóa mềm & Cảnh báo ràng buộc (ERROR_0015) ─────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorPrompt, setDeleteErrorPrompt] = useState(null);

  // ─── Modal Xác nhận đổi trạng thái hoạt động ──────────────────────────────
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // ─── Toast thông báo ──────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ─── ĐỒNG BỘ ĐA NGƯỜI DÙNG & KHÓA CHỈNH SỬA (CONCURRENCY CONTROL) ─────────
  const { isConnected: isWsConnected, subscribe } = useSocket();
  const [activeLocks, setActiveLocks] = useState({}); // { [roomTypeId]: { userName, userId } }
  const [currentEditLockNotice, setCurrentEditLockNotice] = useState(null); // Có người khác đang mở sửa
  const [conflictAlert, setConflictAlert] = useState(null); // { type: 'DELETED' | 'UPDATED' | 'CONCURRENT_SAVE', title, message }
  const [editOriginalUpdatedAt, setEditOriginalUpdatedAt] = useState(null);
  const lockHeartbeatTimerRef = useRef(null);

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
      let res;
      try {
        res = await fetch(API_BASE_URL, {
          headers: { Authorization: authHeaderVal },
        });
        if (!res.ok && API_BASE_URL.startsWith('/')) {
          res = await fetch('http://localhost:5000/api/v1/room-types', {
            headers: { Authorization: authHeaderVal },
          });
        }
      } catch (e) {
        if (API_BASE_URL.startsWith('/')) {
          res = await fetch('http://localhost:5000/api/v1/room-types', {
            headers: { Authorization: authHeaderVal },
          });
        } else {
          throw e;
        }
      }

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

  // ─── QUẢN LÝ KHÓA CHỈNH SỬA VÀ ĐỒNG BỘ THỜI GIAN THỰC ────────────────────
  const acquireEditLock = async (targetId) => {
    if (!targetId) return;
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';
    try {
      const res = await fetch(`${API_BASE_URL}/${targetId}/editing-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
      });
      const data = await res.json();
      if (data.success) {
        if (data.isLockedByOther) {
          setCurrentEditLockNotice(data.lockedBy);
        } else {
          setCurrentEditLockNotice(null);
        }
      }
    } catch (_) {}

    // Gia hạn khóa định kỳ mỗi 45s nếu đang mở form
    if (lockHeartbeatTimerRef.current) clearInterval(lockHeartbeatTimerRef.current);
    lockHeartbeatTimerRef.current = setInterval(async () => {
      try {
        await fetch(`${API_BASE_URL}/${targetId}/editing-lock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeaderVal,
          },
        });
      } catch (_) {}
    }, 45000);
  };

  const releaseEditLock = async (targetId) => {
    if (!targetId) return;
    if (lockHeartbeatTimerRef.current) {
      clearInterval(lockHeartbeatTimerRef.current);
      lockHeartbeatTimerRef.current = null;
    }
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';
    try {
      await fetch(`${API_BASE_URL}/${targetId}/editing-lock`, {
        method: 'DELETE',
        headers: { Authorization: authHeaderVal },
      });
    } catch (_) {}
  };

  const closeModal = () => {
    if (editingId) {
      releaseEditLock(editingId);
    }
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setCurrentEditLockNotice(null);
    setConflictAlert(null);
  };

  // Tải danh sách khóa chỉnh sửa ban đầu
  useEffect(() => {
    const fetchLocks = async () => {
      try {
        const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';
        const res = await fetch(`${API_BASE_URL}/editing-locks`, {
          headers: { Authorization: authHeaderVal },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setActiveLocks(data.data);
          }
        }
      } catch (_) {}
    };
    fetchLocks();
  }, []);

  // Lắng nghe sự kiện WebSocket Realtime cho quản lý loại phòng
  useEffect(() => {
    if (!subscribe) return;

    const unsubEditingStart = subscribe('ROOM_TYPE_EDITING_START', (data) => {
      if (data?.roomTypeId) {
        setActiveLocks((prev) => ({
          ...prev,
          [data.roomTypeId]: { userName: data.user, userId: data.userId },
        }));
      }
    });

    const unsubEditingEnd = subscribe('ROOM_TYPE_EDITING_END', (data) => {
      if (data?.roomTypeId) {
        setActiveLocks((prev) => {
          const cp = { ...prev };
          delete cp[data.roomTypeId];
          return cp;
        });
      }
    });

    const unsubUpdated = subscribe('ROOM_TYPE_UPDATED', (data) => {
      if (data?.roomTypeId) {
        // Trường hợp 1: Người này đang mở form sửa chính loại phòng này mà người khác vừa lưu xong
        if (isModalOpen && isEditMode && String(editingId) === String(data.roomTypeId)) {
          setConflictAlert({
            type: 'UPDATED',
            title: '⚠️ Dữ liệu loại phòng đã thay đổi!',
            message: `Quản trị viên [${data.updatedBy || 'khác'}] vừa lưu các thay đổi mới cho loại phòng "${data.typeName}" vào lúc ${new Date(data.updatedAt || Date.now()).toLocaleTimeString('vi-VN')}. Nếu bạn lưu tiếp, những thông tin mới cập nhật sẽ bị ghi đè!`,
          });
        } else {
          showToast(`Loại phòng "${data.typeName}" vừa được [${data.updatedBy || 'đồng nghiệp'}] cập nhật`, 'info');
        }
        fetchAllData();
      }
    });

    const unsubDeleted = subscribe('ROOM_TYPE_DELETED', (data) => {
      if (data?.roomTypeId) {
        // Trường hợp 2: Người này đang mở form sửa mà người khác vừa xóa loại phòng này
        if (isModalOpen && isEditMode && String(editingId) === String(data.roomTypeId)) {
          setConflictAlert({
            type: 'DELETED',
            title: '⚠️ Loại phòng đã bị xóa bởi người khác!',
            message: `Loại phòng "${data.typeName}" bạn đang chỉnh sửa vừa bị quản trị viên [${data.deletedBy || 'khác'}] xóa khỏi hệ thống. Thao tác chỉnh sửa không thể hoàn tất.`,
          });
        } else {
          showToast(`Loại phòng "${data.typeName}" vừa bị [${data.deletedBy || 'đồng nghiệp'}] xóa`, 'warn');
        }
        fetchAllData();
      }
    });

    const unsubStatus = subscribe('ROOM_TYPE_STATUS_CHANGED', (data) => {
      if (data?.roomTypeId) {
        showToast(
          `Loại phòng "${data.typeName || data.roomTypeId}" đã đổi trạng thái sang ${data.status === 'Active' ? 'Hoạt động' : 'Ngừng cung cấp'}`,
          'info'
        );
        fetchAllData();
      }
    });

    return () => {
      unsubEditingStart();
      unsubEditingEnd();
      unsubUpdated();
      unsubDeleted();
      unsubStatus();
    };
  }, [subscribe, isModalOpen, isEditMode, editingId]);

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
      images: [],
      amenityIds: amenitiesList.length > 0 ? [amenitiesList[0].id] : [1],
      status: 'Active',
    });
    setFormErrors({});
    setIsEditMode(false);
    setEditingId(null);
    setEditOriginalUpdatedAt(null);
    setCurrentEditLockNotice(null);
    setConflictAlert(null);
    setIsModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (rt) => {
    const targetId = rt.RoomTypeId || rt.id;
    const rawImages = rt.images || (rt.hinh_anh ? [rt.hinh_anh] : (rt.image ? [rt.image] : []));
    const rawAmenities = rt.amenityIds || rt.amenities || rt.tien_ich || [];
    const parsedAmenities = rawAmenities.map((item) => (typeof item === 'object' ? item.id : Number(item)));

    setFormData({
      typeName: rt.typeName || rt.name || '',
      description: rt.description || rt.mo_ta || '',
      basePrice: rt.basePrice || rt.gia_co_ban || rt.baseRate || '',
      adultCapacity: rt.adultCapacity || rt.toi_da_nguoi_lon || 2,
      childCapacity: rt.childCapacity !== undefined ? rt.childCapacity : (rt.toi_da_tre_em ?? 1),
      images: rawImages.length > 0 ? rawImages : [],
      amenityIds: parsedAmenities.length > 0 ? parsedAmenities : [1],
      status: rt.status === 'Inactive' || rt.status === 'inactive' ? 'Inactive' : 'Active',
    });
    setFormErrors({});
    setIsEditMode(true);
    setEditingId(targetId);
    setEditOriginalUpdatedAt(rt.updatedAt || rt.UpdatedAt || null);
    setCurrentEditLockNotice(null);
    setConflictAlert(null);
    setIsModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Nhận khóa chỉnh sửa trên backend & kiểm tra xem có ai khác đang sửa không
    acquireEditLock(targetId);
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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = [];
    let err = '';

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        err = 'Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)';
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        err = 'Dung lượng mỗi ảnh vượt quá 5MB cho phép';
        break;
      }
      if (formData.images.length + validFiles.length >= 10) {
        err = 'Chỉ được chọn tối đa 10 hình ảnh';
        break;
      }
      validFiles.push(file);
    }

    if (err) {
      setFormErrors((prev) => ({ ...prev, images: err }));
      if (validFiles.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    Promise.all(
      validFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          })
      )
    ).then((base64Urls) => {
      setFormData((prev) => {
        const merged = [...prev.images, ...base64Urls].slice(0, 10);
        return { ...prev, images: merged };
      });
      setFormErrors((prev) => {
        const cp = { ...prev };
        delete cp.images;
        return cp;
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      lastUpdatedAt: isEditMode ? editOriginalUpdatedAt : undefined,
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
        if (data.code === 'ERROR_0016_CONCURRENT_MODIFICATION') {
          setConflictAlert({
            type: 'CONCURRENT_SAVE',
            title: '⚠️ Xung đột chỉnh sửa đồng thời!',
            message:
              data.message ||
              'Loại phòng này vừa được một quản trị viên khác lưu thay đổi trước bạn. Để tránh mất dữ liệu của đồng nghiệp, hệ thống đã ngăn chặn việc ghi đè.',
          });
        } else if (data.code === 'ERROR_0017_RECORD_DELETED') {
          setConflictAlert({
            type: 'DELETED',
            title: '⚠️ Loại phòng đã bị xóa bởi người khác!',
            message:
              data.message ||
              'Không thể lưu: Loại phòng này đã bị một quản trị viên khác xóa khỏi hệ thống trong lúc bạn đang chỉnh sửa.',
          });
        } else if (data.code === 'ERROR_0007_DUPLICATE') {
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
      closeModal();
      fetchAllData();
    } catch (err) {
      showToast('Lỗi máy chủ hoặc mất kết nối CSDL!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── CHUYỂN ĐỔI TRẠNG THÁI (HỎI XÁC NHẬN NGƯỜI DÙNG) ─────────────────────
  const handleToggleStatus = (rt) => {
    if (!canManage) return;
    const currentActive = rt.status === 'Active' || rt.status === 'active';
    const nextStatus = currentActive ? 'Inactive' : 'Active';
    setStatusConfirmTarget({ roomType: rt, targetStatus: nextStatus });
  };

  const executeToggleStatus = async (rt, nextStatus) => {
    if (!canManage || !rt) return;
    const targetId = rt.RoomTypeId || rt.id;
    const currentActive = rt.status === 'Active' || rt.status === 'active';
    const isBecomingActive = nextStatus === 'Active';

    if ((currentActive && isBecomingActive) || (!currentActive && !isBecomingActive)) {
      return;
    }

    setIsStatusUpdating(true);

    // Cập nhật giao diện tức thì (Optimistic)
    setRoomTypes((prev) =>
      prev.map((r) =>
        r.RoomTypeId === targetId || r.id === targetId ? { ...r, status: nextStatus } : r
      )
    );

    // Cập nhật thống kê tức thì
    setStats((prev) => ({
      ...prev,
      active: isBecomingActive ? prev.active + 1 : prev.active - 1,
      inactive: isBecomingActive ? prev.inactive - 1 : prev.inactive + 1,
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
      fetchAllData();
    } catch (_) {
      showToast('Lỗi kết nối MySQL khi lưu trạng thái!', 'error');
      fetchAllData();
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // ─── XÓA MỀM LOẠI PHÒNG ───────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const targetId = deleteTarget.RoomTypeId || deleteTarget.id;
    const currentTarget = { ...deleteTarget };
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: authHeaderVal },
      });

      const data = await res.json();

      if (data.code === 'ERROR_0015_HAS_RELATED_DATA') {
        setIsDeleting(false);
        setDeleteTarget(null);
        setDeleteErrorPrompt({
          roomType: currentTarget,
          message: data.message || 'Không thể xóa loại phòng vì vẫn còn phòng hoặc đặt phòng liên quan',
          roomsCount: data.relatedData?.rooms || 0,
          bookingsCount: data.relatedData?.bookings || 0,
          canCascadeDelete: Boolean(data.relatedData?.canCascadeDelete),
          hasActiveBookings: Boolean(data.relatedData?.hasActiveBookings),
        });
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

  // ─── XÓA LOẠI PHÒNG KÈM CÁC PHÒNG LIÊN KẾT (KHI KHÔNG CÒN BOOKING ACTIVE) ──
  const handleCascadeDelete = async (roomType) => {
    if (!roomType) return;
    setIsDeleting(true);

    const targetId = roomType.RoomTypeId || roomType.id;
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/${targetId}?cascadeRooms=true`, {
        method: 'DELETE',
        headers: { Authorization: authHeaderVal },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể xóa loại phòng', 'error');
        return;
      }

      showToast(
        data.message || 'Xóa loại phòng và các phòng liên kết thành công',
        'success'
      );
      setDeleteErrorPrompt(null);
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
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">
                                {rt.typeName || rt.name}
                              </span>
                              {activeLocks[rt.RoomTypeId || rt.id] && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse shrink-0"
                                  title={`Đang được quản trị viên "${activeLocks[rt.RoomTypeId || rt.id].userName}" mở chỉnh sửa`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">edit_note</span>
                                  <span>{activeLocks[rt.RoomTypeId || rt.id].userName} đang sửa</span>
                                </span>
                              )}
                            </div>
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
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition text-white"
                  type="button"
                  title="Đóng form"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Nội Dung (Mục 6.2 & 6.3) */}
              <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
                {/* Cảnh báo xung đột nếu có người khác đang mở chỉnh sửa cùng lúc */}
                {currentEditLockNotice && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3 text-amber-900 animate-fadeIn">
                    <span className="material-symbols-outlined text-amber-600 text-[24px] shrink-0">
                      warning
                    </span>
                    <div className="text-sm">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>Cảnh báo: Có người khác cũng đang mở sửa loại phòng này!</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                          Đồng thời
                        </span>
                      </p>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        Quản trị viên <strong>"{currentEditLockNotice.userName}"</strong> đang mở màn hình sửa cùng một lúc. Hệ thống sẽ ưu tiên người lưu trước và <strong>chặn người lưu sau</strong> để tránh ghi đè làm mất thông tin.
                      </p>
                    </div>
                  </div>
                )}
                {/* 1. Upload ảnh */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Hình ảnh loại phòng <span className="text-[#D93025]">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Tối thiểu 1 ảnh (ảnh đầu tiên là <strong>Ảnh đại diện / Thumbnail</strong>), tối đa 10 ảnh. Định dạng JPG, PNG, WEBP (tối đa 5MB/ảnh).
                  </p>

                  {formData.images.length > 0 && (
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
                  )}

                  {/* Input ẩn để chọn file ảnh từ máy tính (không cho dán link) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {formData.images.length < 10 ? (
                    <div
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                        formErrors.images
                          ? 'border-red-400 bg-red-50/50 hover:bg-red-50'
                          : 'border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 hover:border-[#1F4E78]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1F4E78]">
                        <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Tải ảnh từ máy tính lên (Bắt buộc chọn file ảnh)
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Định dạng JPG, PNG, WEBP &bull; Tối đa 5MB/ảnh &bull; Đã chọn {formData.images.length}/10 ảnh
                        </p>
                      </div>
                      <button
                        type="button"
                        className="mt-1 px-3 py-1.5 bg-[#1F4E78] hover:bg-[#163a5c] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 pointer-events-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        <span>Chọn ảnh từ thiết bị</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>Đã đạt số lượng tối đa 10 ảnh. Xóa bớt ảnh nếu bạn muốn tải lên ảnh khác.</span>
                    </div>
                  )}

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
                    onClick={closeModal}
                    className="px-5 py-2.5 bg-white border border-[#999999] text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition shadow-xs cursor-pointer"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#1F4E78] text-white text-sm font-bold rounded-lg hover:bg-[#163a5c] disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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

        {/* ─── MODAL CẢNH BÁO XUNG ĐỘT THỜI GIAN THỰC (BỊ XÓA HOẶC SỬA TRÙNG) ─ */}
        {conflictAlert && (
          <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border-2 border-red-500 animate-scaleIn">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <span className="material-symbols-outlined text-[36px]">
                  {conflictAlert.type === 'DELETED' ? 'delete_forever' : 'sync_problem'}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {conflictAlert.title}
                  </h3>
                  <span className="text-xs text-red-600 font-mono font-medium">
                    {conflictAlert.type === 'DELETED'
                      ? 'RÀNG BUỘC: ĐÃ BỊ XÓA BỞI NGƯỜI KHÁC'
                      : 'RÀNG BUỘC: XUNG ĐỘT SỬA ĐỔI ĐỒNG THỜI'}
                  </span>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 mb-5">
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  {conflictAlert.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {conflictAlert.type === 'DELETED'
                    ? 'Hệ thống cần đồng bộ lại danh sách phòng để loại bỏ dữ liệu đã xóa.'
                    : 'Hệ thống đã tự động ngăn chặn việc ghi đè để không làm mất các thay đổi của quản trị viên khác.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                {conflictAlert.type === 'DELETED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConflictAlert(null);
                      closeModal();
                      fetchAllData();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Đã hiểu, đóng form và tải lại danh sách</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConflictAlert(null)}
                      className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition shadow-xs cursor-pointer"
                    >
                      Xem lại nội dung trên form
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConflictAlert(null);
                        closeModal();
                        fetchAllData();
                      }}
                      className="px-5 py-2.5 bg-[#1F4E78] text-white text-sm font-bold rounded-lg hover:bg-[#163a5c] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      <span>Đóng form và tải dữ liệu mới</span>
                    </button>
                  </>
                )}
              </div>
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

        {/* ─── HỘP THOẠI CẢNH BÁO RÀNG BUỘC KHI XÓA & HƯỚNG DẪN XÓA (ERROR_0015) ─── */}
        {deleteErrorPrompt && (
          <div className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border border-amber-300">
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <span className="material-symbols-outlined text-[36px]">
                  {deleteErrorPrompt.bookingsCount === 0 ? 'help_outline' : 'warning'}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {deleteErrorPrompt.bookingsCount === 0
                      ? 'Lựa Chọn Xóa Loại Phòng'
                      : 'Không Thể Xóa Loại Phòng Ngay'}
                  </h3>
                  <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Mã lỗi: ERROR_0015_HAS_RELATED_DATA
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl mb-4 text-sm text-gray-800 space-y-2">
                <p>
                  Loại phòng{' '}
                  <strong className="text-gray-900">
                    [{deleteErrorPrompt.roomType?.typeName || deleteErrorPrompt.roomType?.name}]
                  </strong>{' '}
                  hiện đang có dữ liệu liên kết:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]">meeting_room</span>
                    <div>
                      <p className="text-gray-500">Số phòng vật lý:</p>
                      <p className="font-bold text-gray-900 text-sm">{deleteErrorPrompt.roomsCount} phòng</p>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-[20px]">book_online</span>
                    <div>
                      <p className="text-gray-500">Đơn đặt phòng đang hoạt động:</p>
                      <p className={`font-bold text-sm ${deleteErrorPrompt.bookingsCount > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {deleteErrorPrompt.bookingsCount} đơn
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {deleteErrorPrompt.bookingsCount === 0 ? (
                /* Trường hợp KHÔNG CÓ đơn đặt phòng nào đang hoạt động → Cho phép xóa kèm các phòng */
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-5 text-sm text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Không có đơn đặt phòng nào đang hoạt động!</span>
                  </p>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Hệ thống đã kiểm tra: <strong>Không có khách nào đang lưu trú hoặc đặt trước loại phòng này</strong>.
                  </p>
                  <p className="text-xs text-emerald-800 mt-2 font-semibold">
                    👉 Bạn có muốn xóa loại phòng này và <strong>đồng thời xóa mềm toàn bộ {deleteErrorPrompt.roomsCount} phòng vật lý liên kết</strong> không?
                  </p>
                </div>
              ) : (
                /* Trường hợp CÓ đơn đặt phòng đang hoạt động → Hướng dẫn cách xử lý để xóa */
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-950">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-red-800">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>Làm sao để xóa được loại phòng này?</span>
                  </p>
                  <p className="text-xs text-red-900 leading-relaxed">
                    Hiện có <strong>{deleteErrorPrompt.bookingsCount} đơn đặt phòng</strong> (Pending / Confirmed / CheckedIn). Để bảo vệ quyền lợi của khách và tránh mất dữ liệu hóa đơn, hệ thống chưa cho phép xóa ngay.
                  </p>
                  <p className="text-xs text-red-800 mt-2">
                    👉 <strong>Cách xử lý để xóa được:</strong> Vào trang <em>Quản lý Đặt phòng</em> để hoàn tất Check-out hoặc chuyển phòng cho các đơn này sang loại phòng khác. Sau khi số đơn hoạt động về 0, bạn sẽ xóa được loại phòng bình thường!
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 italic">
                    * Trong lúc chờ, bạn nên chuyển sang &quot;Ngừng cung cấp&quot; để không phát sinh thêm khách mới đặt.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteErrorPrompt(null)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition"
                >
                  Đóng / Hủy bỏ
                </button>

                {deleteErrorPrompt.bookingsCount === 0 ? (
                  /* NÚT HÀNH ĐỘNG XÓA THỰC TẾ */
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleCascadeDelete(deleteErrorPrompt.roomType)}
                    className="w-full sm:w-auto px-5 py-2 bg-[#D93025] hover:bg-red-700 text-white text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isDeleting ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    )}
                    <span>Xóa loại phòng &amp; {deleteErrorPrompt.roomsCount} phòng liên kết</span>
                  </button>
                ) : (
                  /* NÚT CHUYỂN SANG NGỪNG CUNG CẤP TRONG KHI CHỜ HẾT BOOKING */
                  <button
                    type="button"
                    onClick={() => {
                      const rt = deleteErrorPrompt.roomType;
                      setDeleteErrorPrompt(null);
                      executeToggleStatus(rt, 'Inactive');
                    }}
                    className="w-full sm:w-auto px-5 py-2 bg-[#1F4E78] hover:bg-[#163a5c] text-white text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">toggle_off</span>
                    <span>Chuyển sang Ngừng cung cấp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── HỘP THOẠI XÁC NHẬN CHUYỂN TRẠNG THÁI HOẠT ĐỘNG ───────────────── */}
        {statusConfirmTarget && (
          <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    statusConfirmTarget.targetStatus === 'Active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {statusConfirmTarget.targetStatus === 'Active' ? 'check_circle' : 'pause_circle'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Xác Nhận Thay Đổi Trạng Thái
                </h3>
              </div>

              <div className="text-sm text-gray-700 leading-relaxed mb-5 space-y-2">
                <p>
                  Bạn có chắc chắn muốn chuyển trạng thái loại phòng{' '}
                  <strong className="text-gray-900">
                    [{statusConfirmTarget.roomType?.typeName || statusConfirmTarget.roomType?.name}]
                  </strong>{' '}
                  sang:
                </p>
                <div
                  className={`p-3 rounded-lg border font-semibold text-center text-sm ${
                    statusConfirmTarget.targetStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  {statusConfirmTarget.targetStatus === 'Active'
                    ? '🟢 Đang hoạt động (Active)'
                    : '⚪ Ngừng cung cấp (Inactive)'}
                </div>
                <p className="text-xs text-gray-500 italic">
                  {statusConfirmTarget.targetStatus === 'Active'
                    ? 'Loại phòng này sẽ được kích hoạt và hiển thị công khai trên Trang chủ cho khách hàng đặt phòng.'
                    : 'Loại phòng này sẽ tạm ẩn khỏi Trang chủ và không nhận đặt phòng mới. Các đơn hiện tại vẫn được giữ nguyên.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStatusConfirmTarget(null)}
                  disabled={isStatusUpdating}
                  className="px-4 py-2 bg-white border border-[#999999] text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isStatusUpdating}
                  onClick={() => {
                    const { roomType, targetStatus } = statusConfirmTarget;
                    setStatusConfirmTarget(null);
                    executeToggleStatus(roomType, targetStatus);
                  }}
                  className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                    statusConfirmTarget.targetStatus === 'Active'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#1F4E78] hover:bg-[#163a5c]'
                  }`}
                >
                  {isStatusUpdating && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>Xác nhận chuyển</span>
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
