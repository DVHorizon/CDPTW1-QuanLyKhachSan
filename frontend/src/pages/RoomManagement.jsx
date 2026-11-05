import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = typeof window !== 'undefined' && window.location.port === '3000'
  ? '/api/v1/rooms'
  : 'http://localhost:5000/api/v1/rooms';

// ─── 7 TRẠNG THÁI CHUẨN SPEC 2 (Mục 2 & 6.1) ─────────────────────────────────
const ROOM_STATUS_CONFIG = {
  CleanAvailable: {
    label: 'Trống sạch',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    icon: 'check_circle',
  },
  Occupied: {
    label: 'Đang ở',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
    icon: 'person',
  },
  Dirty: {
    label: 'Bẩn / Chờ dọn',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    icon: 'cleaning_services',
  },
  Cleaning: {
    label: 'Đang dọn',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    icon: 'mop',
  },
  Maintenance: {
    label: 'Đang bảo trì',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    dot: 'bg-gray-500',
    icon: 'build',
  },
  OutOfOrder: {
    label: 'Ngừng sử dụng',
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-800',
    dot: 'bg-red-400',
    icon: 'block',
  },
  Reserved: {
    label: 'Đã giữ chỗ',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
    icon: 'bookmark',
  },
};

const EMPTY_FORM = {
  branchName: '',
  roomTypeId: '',
  roomNumber: '',
  floor: 1,
  status: 'CleanAvailable',
  description: '',
};

const RoomManagement = () => {
  const { user, token } = useAuth();

  // ─── Dữ liệu thật 100% từ MySQL (Rooms, Branches, RoomTypes) ────────────────
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [floorGroups, setFloorGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Trạng thái kết nối CSDL MySQL ─────────────────────────────────────────
  const [backendConnected, setBackendConnected] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // ─── Thống kê KPIs (Mục 6.1) ───────────────────────────────────────────────
  const [stats, setStats] = useState({
    total: 0,
    cleanAvailable: 0,
    occupied: 0,
    dirty: 0,
    cleaning: 0,
    maintenance: 0,
    outOfOrder: 0,
    reserved: 0,
  });

  // ─── Bộ lọc (Mục 6.1) ───────────────────────────────────────────────────────
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ─── Thao tác hàng loạt (Bulk Actions - Mục 3.8) ───────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatusTarget, setBulkStatusTarget] = useState('CleanAvailable');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // ─── Khóa toàn tầng modal ──────────────────────────────────────────────────
  const [isLockFloorOpen, setIsLockFloorOpen] = useState(false);
  const [lockFloorTarget, setLockFloorTarget] = useState('');
  const [lockFloorReason, setLockFloorReason] = useState('');
  const [lockFloorError, setLockFloorError] = useState('');
  const [isLockingFloor, setIsLockingFloor] = useState(false);

  // ─── Modal Thêm / Sửa Phòng vật lý (Wireframe 6.2) ─────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Modal Xác nhận xóa ───────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Toast thông báo ───────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success', code = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, code });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };


  // Phân quyền: Admin hoặc có quyền ROOM_MANAGE
  const userRole = (user?.roleName || user?.role?.RoleName || '').toLowerCase();
  const canManage =
    userRole === 'admin' ||
    (user?.permissions && user.permissions.includes('ROOM_MANAGE'));

  // ─── TẢI DỮ LIỆU TỪ MYSQL ─────────────────────────────────────────────────
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

      // 1. Tải danh mục Chi nhánh & Loại phòng
      const [branchesRes, rtRes] = await Promise.all([
        fetch(`${API_BASE_URL}/branches`),
        fetch(`${API_BASE_URL}/room-types`),
      ]);

      if (branchesRes.ok) {
        const bJson = await branchesRes.json();
        if (bJson.success) setBranches(bJson.data || []);
      }

      if (rtRes.ok) {
        const rtJson = await rtRes.json();
        if (rtJson.success) setRoomTypes(rtJson.data || []);
      }

      // 2. Tải danh sách phòng vật lý (với fallback cổng 5000)
      let roomsRes;
      try {
        roomsRes = await fetch(`${API_BASE_URL}/physical`, {
          headers: { Authorization: authHeaderVal },
        });
        if (!roomsRes.ok && API_BASE_URL.startsWith('/')) {
          roomsRes = await fetch('http://localhost:5000/api/v1/rooms/physical', {
            headers: { Authorization: authHeaderVal },
          });
        }
      } catch (e) {
        if (API_BASE_URL.startsWith('/')) {
          roomsRes = await fetch('http://localhost:5000/api/v1/rooms/physical', {
            headers: { Authorization: authHeaderVal },
          });
        } else {
          throw e;
        }
      }

      if (!roomsRes.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${roomsRes.status}: ${roomsRes.statusText}`);
      }

      const roomsJson = await roomsRes.json();
      if (roomsJson.success && Array.isArray(roomsJson.data)) {
        setRooms(roomsJson.data);
        if (roomsJson.stats) setStats(roomsJson.stats);
        if (roomsJson.floorGroups) setFloorGroups(roomsJson.floorGroups);
        setBackendConnected(true);
        setConnectionError(null);
        setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        throw new Error(roomsJson.message || 'Dữ liệu trả về không hợp lệ');
      }
    } catch (err) {
      console.error('Lỗi kết nối CSDL MySQL:', err);
      setBackendConnected(false);
      setConnectionError(
        'MẤT KẾT NỐI TỚI CƠ SỞ DỮ LIỆU MYSQL! Vui lòng kiểm tra Docker container (hotel_backend, hotel_mysql).'
      );
      showToast('Mất kết nối tới CSDL MySQL!', 'error', 'ERR_MYSQL_DISCONNECTED');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';
      fetch(`${API_BASE_URL}/physical?limit=1`, {
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

  // ─── LỌC DỮ LIỆU PHÒNG THEO TIÊU CHÍ (Mục 6.1) ───────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // 1. Chi nhánh
      if (filterBranch !== 'all' && String(r.branchId) !== String(filterBranch) && r.branchName !== filterBranch) {
        return false;
      }
      // 2. Tầng
      if (filterFloor !== 'all' && String(r.floor) !== String(filterFloor)) {
        return false;
      }
      // 3. Loại phòng
      if (filterRoomType !== 'all' && String(r.roomTypeId) !== String(filterRoomType)) {
        return false;
      }
      // 4. Trạng thái
      if (filterStatus !== 'all' && r.status !== filterStatus) {
        return false;
      }
      // 5. Tìm kiếm số phòng
      if (searchText.trim()) {
        const query = searchText.trim().toLowerCase();
        const num = (r.roomNumber || '').toLowerCase();
        if (!num.includes(query)) return false;
      }
      return true;
    });
  }, [rooms, filterBranch, filterFloor, filterRoomType, filterStatus, searchText]);

  // Nhóm các phòng đã lọc theo tầng
  const groupedByFloor = useMemo(() => {
    const map = {};
    filteredRooms.forEach((r) => {
      const f = r.floor;
      if (!map[f]) {
        map[f] = {
          floor: f,
          rooms: [],
          total: 0,
          clean: 0,
          occupied: 0,
          dirty: 0,
          cleaning: 0,
          maintenance: 0,
          outOfOrder: 0,
          reserved: 0,
        };
      }
      map[f].rooms.push(r);
      map[f].total++;
      if (r.status === 'CleanAvailable') map[f].clean++;
      else if (r.status === 'Occupied') map[f].occupied++;
      else if (r.status === 'Dirty') map[f].dirty++;
      else if (r.status === 'Cleaning') map[f].cleaning++;
      else if (r.status === 'Maintenance') map[f].maintenance++;
      else if (r.status === 'OutOfOrder') map[f].outOfOrder++;
      else if (r.status === 'Reserved') map[f].reserved++;
    });

    // Sắp xếp số phòng tăng dần trong từng tầng
    Object.values(map).forEach((group) => {
      group.rooms.sort((a, b) =>
        String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })
      );
    });

    return Object.values(map).sort((a, b) => Number(a.floor) - Number(b.floor));
  }, [filteredRooms]);

  // Danh sách các tầng duy nhất có trong CSDL
  const availableFloors = useMemo(() => {
    const s = new Set(rooms.map((r) => r.floor));
    return Array.from(s).sort((a, b) => a - b);
  }, [rooms]);

  // ─── VALIDATE FIELD THEO SPEC 2 (Mục 5.2) ─────────────────────────────────
  const validateField = (field, val, allData = formData) => {
    let err = '';

    if (field === 'branchName') {
      if (!val || !String(val).trim()) {
        err = 'Chi nhánh không được để trống';
      }
    }

    if (field === 'roomTypeId') {
      if (!val) {
        err = 'Loại phòng không được để trống';
      }
    }

    if (field === 'roomNumber') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        err = 'Số phòng không được để trống';
      } else if (trimmed.length > 20) {
        err = 'Số phòng không được vượt quá 20 ký tự';
      } else if (!/^[A-Za-z0-9\-]+$/.test(trimmed)) {
        err = 'Số phòng không đúng định dạng';
      } else {
        // Kiểm tra trùng trong cùng chi nhánh
        const targetBranch = allData.branchName;
        const duplicate = rooms.some(
          (r) =>
            (r.branchName === targetBranch || String(r.branchId) === String(targetBranch)) &&
            String(r.roomNumber).toLowerCase() === trimmed.toLowerCase() &&
            (!isEditMode || (r.roomId !== editingId && r.id !== editingId))
        );
        if (duplicate) {
          err = 'Số phòng đã được sử dụng, vui lòng chọn số phòng khác';
        }
      }
    }

    if (field === 'floor') {
      if (val === '' || val === null || val === undefined) {
        err = 'Tầng không được để trống';
      } else {
        const num = Number(val);
        if (!Number.isInteger(num) || isNaN(num) || num < -3 || num > 200) {
          err = 'Tầng phải là số nguyên trong khoảng cho phép';
        }
      }
    }

    if (field === 'status') {
      if (!val) {
        err = 'Trạng thái phòng không được để trống';
      }
    }

    if (field === 'description') {
      if (val && String(val).length > 500) {
        err = 'Mô tả không được vượt quá 500 ký tự';
      }
    }

    return err;
  };

  const validateAll = () => {
    const errors = {};
    const fields = ['branchName', 'roomTypeId', 'roomNumber', 'floor', 'status', 'description'];
    fields.forEach((f) => {
      const msg = validateField(f, formData[f], formData);
      if (msg) errors[f] = msg;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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

  // ─── MỞ MODAL THÊM MỚI (Mục 4.1 & 6.2) ────────────────────────────────────
  const openCreateModal = () => {
    setFormData({
      branchName: branches.length > 0 ? branches[0].BranchName : 'Grand Horizon Phú Quốc Luxury Resort',
      roomTypeId: roomTypes.length > 0 ? roomTypes[0].RoomTypeId : '',
      roomNumber: '',
      floor: 1,
      status: 'CleanAvailable',
      description: '',
    });
    setFormErrors({});
    setIsEditMode(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  // ─── MỞ MODAL SỬA PHÒNG (Mục 4.2 & 6.2) ───────────────────────────────────
  const openEditModal = (r) => {
    setFormData({
      branchName: r.branchName || (branches.length > 0 ? branches[0].BranchName : ''),
      roomTypeId: r.roomTypeId || '',
      roomNumber: r.roomNumber || '',
      floor: r.floor !== undefined ? r.floor : 1,
      status: r.status || 'CleanAvailable',
      description: r.description || '',
    });
    setFormErrors({});
    setIsEditMode(true);
    setEditingId(r.roomId || r.id);
    setIsModalOpen(true);
  };

  // ─── SUBMIT LƯU PHÒNG VẬT LÝ (THÊM / SỬA) ─────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const url = isEditMode
        ? `${API_BASE_URL}/physical/${editingId}`
        : `${API_BASE_URL}/physical`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
        body: JSON.stringify({
          branchName: formData.branchName,
          roomTypeId: Number(formData.roomTypeId),
          roomNumber: String(formData.roomNumber).trim(),
          floor: Number(formData.floor),
          status: formData.status,
          description: formData.description ? formData.description.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.field) {
          setFormErrors((prev) => ({ ...prev, [data.field]: data.message }));
        }
        showToast(data.message || 'Lỗi khi lưu phòng vật lý', 'error', data.code);
        return;
      }

      showToast(
        data.message || (isEditMode ? 'Cập nhật phòng thành công' : 'Thêm mới phòng thành công'),
        'success',
        data.code
      );
      setIsModalOpen(false);
      fetchAllData();
    } catch (_) {
      showToast('Lỗi máy chủ khi gửi dữ liệu!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── XÓA MỀM PHÒNG VẬT LÝ (Mục 3.7 & 4.3) ─────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const targetId = deleteTarget.roomId || deleteTarget.id;
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/physical/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: authHeaderVal },
      });

      const data = await res.json();

      if (data.code === 'ERROR_0015_HAS_RELATED_DATA') {
        showToast(
          data.message ||
            'Không thể xóa phòng vì phòng đang có khách ở, đã được giữ chỗ hoặc đang chờ xử lý dọn phòng',
          'error',
          'ERROR_0015_HAS_RELATED_DATA'
        );
        setIsDeleting(false);
        setDeleteTarget(null);
        return;
      }

      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể xóa phòng', 'error', data.code);
        setIsDeleting(false);
        setDeleteTarget(null);
        return;
      }

      showToast('Xóa phòng thành công', 'success', 'SUCCESS_0003_DELETED');
      setDeleteTarget(null);
      fetchAllData();
    } catch (_) {
      showToast('Lỗi máy chủ khi xóa phòng!', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── CẬP NHẬT TRẠNG THÁI HÀNG LOẠT (Mục 3.8 & Test Case 12, 13) ────────────
  const handleBulkUpdateStatus = async () => {
    if (selectedIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 phòng để thực hiện thao tác', 'error', 'ERROR_0016_NO_ITEM_SELECTED');
      return;
    }

    setIsBulkUpdating(true);
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/bulk/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
        body: JSON.stringify({
          roomIds: selectedIds,
          status: bulkStatusTarget,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Lỗi cập nhật hàng loạt', 'error', data.code);
        return;
      }

      showToast(data.message || 'Cập nhật trạng thái hàng loạt thành công', 'success');
      setSelectedIds([]);
      fetchAllData();
    } catch (_) {
      showToast('Lỗi máy chủ khi cập nhật hàng loạt!', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // ─── KHÓA TOÀN TẦNG (Mục 3.8 & Wireframe 6.1) ──────────────────────────────
  const handleLockFloorSubmit = async (e) => {
    e.preventDefault();
    if (!lockFloorTarget) {
      setLockFloorError('Vui lòng chọn tầng cần khóa');
      return;
    }
    if (!lockFloorReason.trim()) {
      setLockFloorError('Lý do khóa tầng không được để trống');
      return;
    }

    setIsLockingFloor(true);
    const authHeaderVal = token ? `Bearer ${token}` : 'Bearer test_admin_jwt_token';

    try {
      const res = await fetch(`${API_BASE_URL}/bulk/lock-floor`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeaderVal,
        },
        body: JSON.stringify({
          floor: Number(lockFloorTarget),
          reason: lockFloorReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLockFloorError(data.message || 'Lỗi khi khóa toàn tầng');
        return;
      }

      showToast(data.message || `Đã khóa toàn bộ phòng tầng ${lockFloorTarget}`, 'success');
      setIsLockFloorOpen(false);
      setLockFloorReason('');
      setLockFloorError('');
      fetchAllData();
    } catch (_) {
      setLockFloorError('Lỗi máy chủ khi khóa toàn tầng!');
    } finally {
      setIsLockingFloor(false);
    }
  };

  // ─── CHECKBOX LỰA CHỌN PHÒNG ──────────────────────────────────────────────
  const toggleSelectRoom = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectFloor = (floorRooms) => {
    const floorIds = floorRooms.map((r) => r.roomId || r.id);
    const allSelected = floorIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !floorIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...floorIds])));
    }
  };


  return (
    <AdminLayout>
      <div className="flex flex-col w-full min-h-screen bg-gray-50/50">
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
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <div className="flex-1 text-sm">
              {toast.code && (
                <span className="block text-[11px] font-mono uppercase tracking-wider opacity-90 mb-0.5">
                  [{toast.code}]
                </span>
              )}
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white ml-2 text-lg font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* CẢNH BÁO MẤT KẾT NỐI MYSQL */}
        {!backendConnected && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border-2 border-[#D93025] rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3 text-[#D93025]">
              <span className="material-symbols-outlined text-3xl animate-pulse">cloud_off</span>
              <div>
                <h4 className="font-bold text-base">CẢNH BÁO MẤT KẾT NỐI TỚI MYSQL!</h4>
                <p className="text-xs text-red-700 mt-0.5">{connectionError}</p>
              </div>
            </div>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-[#D93025] text-white text-xs font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2 shadow"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              Thử kết nối lại
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* HEADER CHÍNH & THANH CÔNG CỤ (Wireframe 6.1) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Quản lý danh sách Phòng vật lý
                </h1>
                <span className="px-2.5 py-0.5 bg-blue-100 text-[#1F4E78] font-mono text-xs font-bold rounded-full border border-blue-200">
                  FEAT-ROOM-01 (Spec 2)
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                Quản lý kho phòng thực tế, gắn Loại phòng, Chi nhánh và Tầng.
                {lastSyncedTime && (
                  <span className="text-xs text-emerald-600 font-medium">
                    (Đồng bộ lúc: {lastSyncedTime})
                  </span>
                )}
              </p>
            </div>

            {/* THANH CÔNG CỤ: NÚT THAO TÁC (CHỈ HIỂN THỊ KHI CÓ QUYỀN ROOM_MANAGE) */}
            <div className="flex flex-wrap items-center gap-2.5">

              <button
                type="button"
                onClick={fetchAllData}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Làm mới dữ liệu từ CSDL MySQL"
              >
                <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                Làm mới
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLockFloorTarget(availableFloors.length > 0 ? String(availableFloors[0]) : '1');
                      setLockFloorReason('');
                      setLockFloorError('');
                      setIsLockFloorOpen(true);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                    title="Khóa toàn bộ phòng của một tầng (chuyển sang OutOfOrder)"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    Khóa toàn tầng
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-[#1F4E78] hover:bg-[#163a5c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:shadow-lg"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    + Thêm phòng vật lý
                  </button>
                </>
              )}
            </div>
          </div>


          {/* KPI STATS CARDS (7 TRẠNG THÁI CHUẨN) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase">TỔNG PHÒNG</span>
              <span className="text-2xl font-black text-gray-900 font-mono mt-1">
                {stats.total.toLocaleString()}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                TRỐNG SẠCH
              </span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1">
                {stats.cleanAvailable}
              </span>
            </div>

            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ĐANG Ở
              </span>
              <span className="text-2xl font-black text-rose-800 font-mono mt-1">
                {stats.occupied}
              </span>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                BẨN / CHỜ DỌN
              </span>
              <span className="text-2xl font-black text-amber-900 font-mono mt-1">
                {stats.dirty}
              </span>
            </div>

            <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-orange-700 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                ĐANG DỌN
              </span>
              <span className="text-2xl font-black text-orange-800 font-mono mt-1">
                {stats.cleaning}
              </span>
            </div>

            <div className="bg-gray-100/70 p-3.5 rounded-xl border border-gray-300 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                ĐANG BẢO TRÌ
              </span>
              <span className="text-2xl font-black text-gray-800 font-mono mt-1">
                {stats.maintenance}
              </span>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between text-white">
              <span className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                NGỪNG SỬ DỤNG
              </span>
              <span className="text-2xl font-black text-white font-mono mt-1">
                {stats.outOfOrder}
              </span>
            </div>

            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                ĐÃ GIỮ CHỖ
              </span>
              <span className="text-2xl font-black text-blue-800 font-mono mt-1">
                {stats.reserved}
              </span>
            </div>
          </div>

          {/* BỘ LỌC TỔNG HỢP (Wireframe 6.1) */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* 1. Lọc Chi nhánh */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Chi nhánh</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.BranchId} value={b.BranchName}>
                    {b.BranchName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Lọc Tầng */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Tầng</label>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
              >
                <option value="all">Tất cả các tầng</option>
                {availableFloors.map((f) => (
                  <option key={f} value={f}>
                    Tầng {f} {f < 0 ? '(Hầm)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Lọc Loại phòng */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Loại phòng</label>
              <select
                value={filterRoomType}
                onChange={(e) => setFilterRoomType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
              >
                <option value="all">Tất cả loại phòng</option>
                {roomTypes.map((rt) => (
                  <option key={rt.RoomTypeId} value={rt.RoomTypeId}>
                    {rt.TypeName}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Lọc Trạng thái */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Trạng thái phòng</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.keys(ROOM_STATUS_CONFIG).map((st) => (
                  <option key={st} value={st}>
                    {ROOM_STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Tìm kiếm Số phòng */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Tìm theo số phòng</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="VD: 101, 205..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-sm">
                  search
                </span>
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* DANH SÁCH BẢNG PHÒNG THEO TẦNG (Wireframe 6.1) */}
          <div className="space-y-6">
            {groupedByFloor.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl text-gray-300">meeting_room</span>
                <h3 className="text-base font-bold text-gray-700 mt-2">Không tìm thấy phòng phù hợp</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Vui lòng thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              groupedByFloor.map((floorGroup) => {
                const floorRooms = floorGroup.rooms;
                const floorIds = floorRooms.map((r) => r.roomId || r.id);
                const isAllFloorSelected =
                  floorIds.length > 0 && floorIds.every((id) => selectedIds.includes(id));

                return (
                  <div
                    key={floorGroup.floor}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* FLOOR HEADER: Nhóm theo tầng & tỷ lệ trạng thái (Wireframe 6.1) */}
                    <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isAllFloorSelected}
                          onChange={() => toggleSelectFloor(floorRooms)}
                          className="w-4 h-4 accent-[#1F4E78] rounded cursor-pointer"
                          title="Chọn tất cả phòng ở tầng này"
                        />
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1F4E78] text-xl">
                            layers
                          </span>
                          <h3 className="font-extrabold text-gray-900 text-base">
                            Tầng {floorGroup.floor} {floorGroup.floor < 0 ? '(Tầng hầm)' : ''}
                          </h3>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-mono text-xs font-bold rounded-full">
                            {floorGroup.total} phòng
                          </span>
                        </div>
                      </div>

                      {/* TỶ LỆ TRẠNG THÁI CỦA TẦNG */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {floorGroup.clean > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            {floorGroup.clean} Trống sạch
                          </span>
                        )}
                        {floorGroup.occupied > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
                            {floorGroup.occupied} Đang ở
                          </span>
                        )}
                        {floorGroup.dirty > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                            {floorGroup.dirty} Bẩn
                          </span>
                        )}
                        {floorGroup.cleaning > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">
                            {floorGroup.cleaning} Đang dọn
                          </span>
                        )}
                        {floorGroup.maintenance > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                            {floorGroup.maintenance} Bảo trì
                          </span>
                        )}
                        {floorGroup.outOfOrder > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-medium">
                            {floorGroup.outOfOrder} Ngừng dùng
                          </span>
                        )}
                        {floorGroup.reserved > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {floorGroup.reserved} Đã giữ chỗ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* TABLE DỮ LIỆU CÁC PHÒNG TRONG TẦNG */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100/60 text-[11px] font-bold text-gray-600 uppercase border-b border-gray-200">
                            <th className="py-2.5 px-4 w-10 text-center">
                              <span className="sr-only">Chọn</span>
                            </th>
                            <th className="py-2.5 px-4">Số phòng</th>
                            <th className="py-2.5 px-4">Loại phòng</th>
                            <th className="py-2.5 px-4 text-center">Tầng</th>
                            <th className="py-2.5 px-4 text-center">Trạng thái</th>
                            <th className="py-2.5 px-4">Chi nhánh & Ghi chú</th>
                            <th className="py-2.5 px-4 text-center w-28">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {floorRooms.map((room) => {
                            const roomId = room.roomId || room.id;
                            const isChecked = selectedIds.includes(roomId);
                            const stConfig =
                              ROOM_STATUS_CONFIG[room.status] || ROOM_STATUS_CONFIG.CleanAvailable;

                            return (
                              <tr
                                key={roomId}
                                className={`hover:bg-blue-50/40 transition select-none ${
                                  isChecked ? 'bg-blue-50/60' : ''
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectRoom(roomId)}
                                    className="w-4 h-4 accent-[#1F4E78] rounded cursor-pointer"
                                  />
                                </td>

                                {/* Số phòng */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-gray-900 text-sm">
                                      {room.roomNumber}
                                    </span>
                                  </div>
                                </td>

                                {/* Loại phòng */}
                                <td className="py-3 px-4">
                                  <span className="font-medium text-gray-800">
                                    {room.roomTypeName}
                                  </span>
                                  <span className="block text-[11px] text-gray-500 font-mono">
                                    {room.roomTypeCode}
                                  </span>
                                </td>

                                {/* Tầng */}
                                <td className="py-3 px-4 text-center font-mono font-semibold text-gray-700">
                                  {room.floor}
                                </td>

                                {/* Trạng thái Badge (7 màu chuẩn Mục 6.1) */}
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition ${stConfig.bg} ${stConfig.text} ${stConfig.border}`}
                                  >
                                    <span className={`w-2 h-2 rounded-full mr-1.5 ${stConfig.dot}`} />
                                    {stConfig.label}
                                  </span>
                                </td>

                                {/* Chi nhánh & Ghi chú */}
                                <td className="py-3 px-4 max-w-xs">
                                  <div className="text-gray-900 font-medium truncate">
                                    {room.branchName}
                                  </div>
                                  <div className="text-[11px] text-gray-500 truncate" title={room.description}>
                                    {room.description || '—'}
                                  </div>
                                </td>

                                {/* Thao tác (Sửa / Xóa) */}
                                <td className="py-3 px-4 text-center">
                                  {canManage ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(room)}
                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                                        title="Sửa phòng vật lý"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          edit
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget(room)}
                                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                                        title="Xóa phòng vật lý"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          delete
                                        </span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs italic">Chỉ xem</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STICKY BULK ACTION BAR (Mục 3.8 & 6.3) */}
        {selectedIds.length > 0 && canManage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-slideUp border border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-[#1F4E78] text-white flex items-center justify-center text-xs">
                {selectedIds.length}
              </span>
              <span>Đã chọn {selectedIds.length} phòng</span>
            </div>

            <div className="h-5 w-px bg-slate-700" />

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300">Đổi trạng thái sang:</label>
              <select
                value={bulkStatusTarget}
                onChange={(e) => setBulkStatusTarget(e.target.value)}
                className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1F4E78]"
              >
                <option value="CleanAvailable">Trống sạch (CleanAvailable)</option>
                <option value="Maintenance">Đang bảo trì (Maintenance)</option>
                <option value="OutOfOrder">Ngừng sử dụng (OutOfOrder)</option>
              </select>

              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={handleBulkUpdateStatus}
                className="px-4 py-1.5 bg-[#1F4E78] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {isBulkUpdating ? 'Đang cập nhật...' : 'Áp dụng'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              Bỏ chọn
            </button>
          </div>
        )}

        {/* MODAL THÊM / SỬA PHÒNG VẬT LÝ (Wireframe 6.2 Spec 2) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[280] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn border border-gray-100">
              {/* Header #1F4E78 theo chuẩn Wireframe 6.2 */}
              <div className="bg-[#1F4E78] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-2xl">
                    {isEditMode ? 'edit_square' : 'add_box'}
                  </span>
                  <h3 className="font-extrabold text-lg">
                    {isEditMode ? 'Sửa phòng vật lý' : 'Thêm phòng vật lý'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/80 hover:text-white transition text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Form Input theo thứ tự Spec 2 (Mục 6.2) */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                {/* 1. Chi nhánh * */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Chi nhánh <span className="text-[#D93025]">*</span>
                  </label>
                  <select
                    value={formData.branchName}
                    onChange={(e) => handleInputChange('branchName', e.target.value)}
                    onBlur={() => handleBlur('branchName')}
                    className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      formErrors.branchName
                        ? 'border-[#D93025] focus:ring-[#D93025]'
                        : 'border-gray-300 focus:ring-[#1F4E78]'
                    }`}
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map((b) => (
                      <option key={b.BranchId} value={b.BranchName}>
                        {b.BranchName}
                      </option>
                    ))}
                  </select>
                  {formErrors.branchName && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.branchName}
                    </span>
                  )}
                </div>

                {/* 2. Loại phòng * (Chỉ loại phòng Active) */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Loại phòng <span className="text-[#D93025]">*</span>
                  </label>
                  <select
                    value={formData.roomTypeId}
                    onChange={(e) => handleInputChange('roomTypeId', e.target.value)}
                    onBlur={() => handleBlur('roomTypeId')}
                    className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                      formErrors.roomTypeId
                        ? 'border-[#D93025] focus:ring-[#D93025]'
                        : 'border-gray-300 focus:ring-[#1F4E78]'
                    }`}
                  >
                    <option value="">-- Chọn loại phòng đang hoạt động --</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.RoomTypeId} value={rt.RoomTypeId}>
                        {rt.TypeName} ({rt.TypeCode || `RT-${rt.RoomTypeId}`})
                      </option>
                    ))}
                  </select>
                  {formErrors.roomTypeId && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.roomTypeId}
                    </span>
                  )}
                </div>

                {/* 3. Số phòng & Tầng (Cùng hàng theo Mục 6.2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Số phòng * */}
                  <div>
                    <label className="text-sm font-bold text-gray-800 block mb-1">
                      Số phòng <span className="text-[#D93025]">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={formData.roomNumber}
                      onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                      onBlur={() => handleBlur('roomNumber')}
                      placeholder="VD: 101, P-205"
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                        formErrors.roomNumber
                          ? 'border-[#D93025] focus:ring-[#D93025]'
                          : 'border-gray-300 focus:ring-[#1F4E78]'
                      }`}
                    />
                    {formErrors.roomNumber && (
                      <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                        {formErrors.roomNumber}
                      </span>
                    )}
                  </div>

                  {/* Tầng * */}
                  <div>
                    <label className="text-sm font-bold text-gray-800 block mb-1">
                      Tầng <span className="text-[#D93025]">*</span>
                    </label>
                    <input
                      type="number"
                      min={-3}
                      max={200}
                      value={formData.floor}
                      onChange={(e) => handleInputChange('floor', e.target.value)}
                      onBlur={() => handleBlur('floor')}
                      placeholder="VD: 1, 2, -1 (hầm)"
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 ${
                        formErrors.floor
                          ? 'border-[#D93025] focus:ring-[#D93025]'
                          : 'border-gray-300 focus:ring-[#1F4E78]'
                      }`}
                    />
                    {formErrors.floor && (
                      <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                        {formErrors.floor}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Trạng thái * (Mục 3.5 & 6.2) */}
                <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">
                    Trạng thái <span className="text-[#D93025]">*</span>
                  </label>
                  {isEditMode &&
                  (formData.status === 'Occupied' ||
                    formData.status === 'Reserved' ||
                    formData.status === 'Dirty' ||
                    formData.status === 'Cleaning') ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
                      <strong>Lưu ý nghiệp vụ (Mục 3.5 Spec 2):</strong> Phòng đang ở trạng thái{' '}
                      <strong>{ROOM_STATUS_CONFIG[formData.status]?.label || formData.status}</strong>.
                      Hệ thống tự động cập nhật qua Check-in / Check-out / Buồng phòng, không được phép
                      chuyển đổi thủ công tại đây.
                    </div>
                  ) : (
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      onBlur={() => handleBlur('status')}
                      className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 ${
                        formErrors.status
                          ? 'border-[#D93025] focus:ring-[#D93025]'
                          : 'border-gray-300 focus:ring-[#1F4E78]'
                      }`}
                    >
                      <option value="CleanAvailable">Trống sạch (CleanAvailable)</option>
                      <option value="Maintenance">Đang bảo trì (Maintenance)</option>
                      <option value="OutOfOrder">Ngừng sử dụng (OutOfOrder)</option>
                    </select>
                  )}
                  {formErrors.status && (
                    <span className="text-[#D93025] text-[13px] font-semibold mt-1 block">
                      {formErrors.status}
                    </span>
                  )}
                </div>

                {/* 5. Mô tả / Ghi chú (tối đa 500 ký tự) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-800">Mô tả / Ghi chú</label>
                    <span className="text-xs text-gray-500 font-mono">
                      {formData.description ? formData.description.length : 0} / 500 ký tự
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    onBlur={() => handleBlur('description')}
                    placeholder="VD: view biển, gần thang máy, phòng yên tĩnh (không bắt buộc)"
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

                {/* NÚT THAO TÁC: HỦY (TRÁI) & LƯU (PHẢI) THEO MỤC 6.2 & 6.3 */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-[#999999] text-gray-700 bg-white font-bold text-sm hover:bg-gray-50 transition shadow-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-[#1F4E78] hover:bg-[#163a5c] text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <span className="material-symbols-outlined text-sm animate-spin">
                        progress_activity
                      </span>
                    )}
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL KHÓA TOÀN TẦNG */}
        {isLockFloorOpen && (
          <div className="fixed inset-0 z-[280] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-gray-100">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">lock</span>
                  <h3 className="font-extrabold text-base">Khóa toàn bộ phòng theo tầng</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLockFloorOpen(false)}
                  className="text-white/80 hover:text-white text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLockFloorSubmit} className="p-6 space-y-4">
                <p className="text-xs text-gray-600">
                  Hành động này sẽ chuyển toàn bộ phòng của tầng được chọn sang trạng thái{' '}
                  <strong className="text-slate-900">Ngừng sử dụng (OutOfOrder)</strong>. Các phòng đang
                  có khách ở (Occupied / Reserved) sẽ được tự động bỏ qua để đảm bảo an toàn.
                </p>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">
                    Chọn tầng cần khóa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lockFloorTarget}
                    onChange={(e) => setLockFloorTarget(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold"
                  >
                    {availableFloors.map((f) => (
                      <option key={f} value={f}>
                        Tầng {f} {f < 0 ? '(Hầm)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">
                    Lý do khóa tầng (bắt buộc) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={lockFloorReason}
                    onChange={(e) => setLockFloorReason(e.target.value)}
                    placeholder="VD: Bảo trì hệ thống điện lạnh toàn tầng, sơn sửa định kỳ..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                  {lockFloorError && (
                    <span className="text-[#D93025] text-xs font-semibold block mt-1">
                      {lockFloorError}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsLockFloorOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLockingFloor}
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow"
                  >
                    {isLockingFloor ? 'Đang thực hiện...' : 'Xác nhận khóa tầng'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN XÓA PHÒNG (Mục 3.7 Spec 2) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[290] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-gray-100">
              <div className="p-6">
                <div className="flex items-center gap-3 text-rose-600 mb-3">
                  <span className="material-symbols-outlined text-3xl">warning</span>
                  <h3 className="font-extrabold text-base text-gray-900">Xác nhận xóa phòng vật lý</h3>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  Bạn có chắc chắn muốn xóa phòng{' '}
                  <strong className="text-gray-900 font-mono text-base font-black">
                    {deleteTarget.roomNumber}
                  </strong>{' '}
                  (Tầng {deleteTarget.floor}, {deleteTarget.branchName})?
                </p>
                <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  Hành động này là <strong>xóa mềm (soft delete)</strong> và có thể khôi phục trong vòng
                  30 ngày từ thùng rác.
                </p>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
                  >
                    {isDeleting && (
                      <span className="material-symbols-outlined text-xs animate-spin">
                        progress_activity
                      </span>
                    )}
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RoomManagement;
