import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import { useSocket } from '../context/SocketContext';

// ─── Cấu hình API Backend ──────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api/phong';

// Mapping 4 trạng thái chuẩn PMS
const STATUS_CONFIG = {
  clean: {
    key: 'clean',
    label: 'Trống & Sạch Sẽ',
    shortLabel: 'Trống Sạch',
    color: '#10b981',
    bgBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    topBorder: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]',
    cardRing: 'ring-emerald-500/50',
    icon: 'verified',
    description: 'Phòng đã được dọn sạch và kiểm định chất lượng, sẵn sàng đón khách mới nhận phòng.',
    nextActions: [
      { action: 'inhouse', label: 'Nhận Phòng (Check-in)', icon: 'login', cls: 'bg-secondary text-white hover:brightness-110' },
      { action: 'dirty', label: 'Báo Bẩn (Chờ Dọn)', icon: 'mop', cls: 'bg-amber-600 text-white hover:brightness-110' },
      { action: 'ooo', label: 'Khóa Bảo Trì (Kỹ Thuật)', icon: 'build', cls: 'bg-slate-600 text-white hover:brightness-110' },
    ]
  },
  inhouse: {
    key: 'inhouse',
    label: 'Đang Có Khách',
    shortLabel: 'Đang Ở',
    color: '#0284c7',
    bgBadge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    topBorder: 'bg-sky-500 shadow-[0_0_12px_rgba(2,132,199,0.7)]',
    cardRing: 'ring-sky-500/50',
    icon: 'person_pin_circle',
    description: 'Khách đang lưu trú tại phòng. Khóa thẻ thông minh đang được kích hoạt.',
    nextActions: [
      { action: 'dirty', label: 'Trả Phòng (Check-out)', icon: 'logout', cls: 'bg-amber-600 text-white hover:brightness-110' },
      { action: 'clean', label: 'Chuyển Trống Sạch', icon: 'check_circle', cls: 'bg-emerald-600 text-white hover:brightness-110' },
    ]
  },
  dirty: {
    key: 'dirty',
    label: 'Bẩn Chờ Dọn Dẹp',
    shortLabel: 'Chờ Dọn Dẹp',
    color: '#d97706',
    bgBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    topBorder: 'bg-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.7)]',
    cardRing: 'ring-amber-500/50',
    icon: 'cleaning_services',
    description: 'Phòng khách vừa trả hoặc đang chờ bộ phận buồng phòng vệ sinh, thay ga gối.',
    nextActions: [
      { action: 'clean', label: 'Đã Dọn Xong (Sạch)', icon: 'task_alt', cls: 'bg-emerald-600 text-white hover:brightness-110' },
      { action: 'inhouse', label: 'Nhận Phòng Ngay', icon: 'login', cls: 'bg-secondary text-white hover:brightness-110' },
      { action: 'ooo', label: 'Khóa Kỹ Thuật Bảo Trì', icon: 'build', cls: 'bg-slate-600 text-white hover:brightness-110' },
    ]
  },
  ooo: {
    key: 'ooo',
    label: 'Đang Khóa Bảo Trì',
    shortLabel: 'Đang Bảo Trì',
    color: '#e11d48',
    bgBadge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    topBorder: 'bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.7)]',
    cardRing: 'ring-rose-500/50',
    icon: 'build_circle',
    description: 'Phòng bị khóa kỹ thuật do hỏng hóc hoặc sửa chữa định kỳ. Cấm gán phòng.',
    nextActions: [
      { action: 'dirty', label: 'Sửa Xong (Chờ Dọn)', icon: 'mop', cls: 'bg-amber-600 text-white hover:brightness-110' },
      { action: 'clean', label: 'Khôi Phục Trống Sạch', icon: 'check_circle', cls: 'bg-emerald-600 text-white hover:brightness-110' },
    ]
  }
};

// Xác định nhóm trạng thái của phòng
const getRoomStatusKey = (r) => {
  if (r.buong_phong === 'ooo') return 'ooo';
  if (r.luu_tru === 'inhouse') return 'inhouse';
  if (r.buong_phong === 'dirty') return 'dirty';
  return 'clean';
};

const DEFAULT_TYPES = [
  { code: 'RT-1', name: 'Deluxe King Hướng Biển', price: '2.500.000 đ' },
  { code: 'RT-2', name: 'Premier Suite Ban Công Riêng', price: '3.800.000 đ' },
  { code: 'RT-3', name: 'Executive Suite Góc Hai Mặt Thoáng', price: '4.500.000 đ' },
  { code: 'RT-4', name: 'Biệt Thự Tổng Thống Sky Villa', price: '12.000.000 đ' },
  { code: 'RT-5', name: 'Phòng Gia Đình Liên Thông', price: '5.200.000 đ' },
];

const RoomStatusManagement = () => {
  // Hook kết nối WebSocket Realtime tập trung
  const { isConnected, subscribe } = useSocket();

  // State phòng & CSDL
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalInDb, setTotalInDb] = useState(50);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomTypes, setRoomTypes] = useState(DEFAULT_TYPES);

  // Bộ lọc & Giao diện
  const [filterStatus, setFilterStatus] = useState('all'); // all | clean | inhouse | dirty | ooo
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterWing, setFilterWing] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'wing' | 'table'

  // Countdown auto-refresh 30s
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast & Modal cảnh báo đồng bộ / xóa sửa
  const [toast, setToast] = useState(null);
  const [syncModal, setSyncModal] = useState(null); // { title, message, type: 'deleted'|'conflict', onConfirm }
  const [editModal, setEditModal] = useState(null); // null | { room, isNew: boolean }
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // null | room

  // ─── Modal bảo trì (FEAT-ROOMSTATUS-01 Spec 6.2) ──────────────────────────
  const [maintenanceModal, setMaintenanceModal] = useState(null); // null | { room, action: 'on'|'off' }
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // ─── Modal lịch sử trạng thái (FEAT-ROOMSTATUS-01 Spec 6.1) ──────────────
  const [historyModal, setHistoryModal] = useState(false);
  const [historyRoomId, setHistoryRoomId] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyRoomNumber, setHistoryRoomNumber] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Tải dữ liệu thật từ Backend (50 phòng) ──────────────────────────────
  const fetchRealRooms = async (silence = false) => {
    if (!silence) setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}?limit=50&cat_bot_du_thua=true`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRooms(data.data);
        setTotalInDb(data.totalInDb || data.data.length);

        // Tự động giữ selection hoặc ưu tiên chọn theo URL param roomId (?roomId=...)
        const searchParams = new URLSearchParams(window.location.search);
        const targetRoomId = searchParams.get('roomId');
        setSelectedRoom((prev) => {
          if (targetRoomId) {
            const foundByParam = data.data.find((x) => String(x.id) === String(targetRoomId) || String(x.so_phong) === String(targetRoomId));
            if (foundByParam) return foundByParam;
          }
          if (!prev) return data.data[0] || null;
          const found = data.data.find((x) => x.id === prev.id);
          return found || data.data[0] || null;
        });
      } else {
        showToast(data.message || 'Không thể tải dữ liệu phòng từ máy chủ', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ backend: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setSecondsLeft(30);
    }
  };

  // ─── Tải danh mục loại phòng ─────────────────────────────────────────────
  const fetchRoomTypes = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/loai-phong');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setRoomTypes(
          data.data.map((t) => ({
            code: t.ma_loai || `RT-${t.id}`,
            name: t.ten_loai || t.name || `Hạng phòng #${t.id}`,
            price: t.gia_co_ban ? Number(t.gia_co_ban).toLocaleString('vi-VN') + ' đ' : '2.500.000 đ'
          }))
        );
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchRealRooms();
    fetchRoomTypes();
  }, []);

  // ─── Auto-refresh mỗi 30s ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchRealRooms(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Lắng nghe sự kiện WebSocket Realtime ──────────────────────────────
  useEffect(() => {
    // 1. Thay đổi trạng thái buồng phòng đơn lẻ (Clean / Inhouse / Dirty / OOO)
    const unsubStatus = subscribe('ROOM_STATUS_CHANGED', (payload) => {
      if (payload?.room) {
        setRooms((prev) => prev.map((r) => (r.id === payload.roomId ? { ...r, ...payload.room } : r)));
        setSelectedRoom((prev) => (prev && prev.id === payload.roomId ? { ...prev, ...payload.room } : prev));
      } else {
        fetchRealRooms(true);
      }
      showToast(`⚡ Phòng ${payload?.roomNumber || ''} vừa cập nhật trạng thái (${payload?.action || 'thao tác'})`, 'info');
    });

    // 2. Thao tác hàng loạt hoặc khóa cả tầng
    const unsubBatch = subscribe('ROOMS_BATCH_UPDATED', (payload) => {
      fetchRealRooms(true);
      showToast(`⚡ Cập nhật hàng loạt ${payload?.count || ''} phòng (${payload?.action || ''})`, 'info');
    });

    // 3. Thêm / Sửa / Xóa phòng
    const unsubCreated = subscribe('ROOM_CREATED', () => {
      fetchRealRooms(true);
      showToast('⚡ Có phòng mới vừa được thêm vào sơ đồ', 'success');
    });
    const unsubUpdated = subscribe('ROOM_UPDATED', (payload) => {
      if (payload?.room) {
        setRooms((prev) => prev.map((r) => (r.id === payload.room.id ? payload.room : r)));
      } else {
        fetchRealRooms(true);
      }
    });
    const unsubDeleted = subscribe('ROOM_DELETED', (payload) => {
      fetchRealRooms(true);
      showToast(`⚡ Phòng ${payload?.roomNumber || ''} vừa được xóa khỏi hệ thống`, 'warning');
    });

    // 4. Khách hàng khóa phòng trực tuyến 15 phút
    const unsubLockAcquired = subscribe('ROOM_LOCK_ACQUIRED', (payload) => {
      showToast(`🔒 Khách đang giữ chỗ ${payload?.quantity || 1} phòng (Hạng #${payload?.roomTypeId}) trong 15p`, 'warning');
    });

    // 5. Nhả phòng về kho trống
    const unsubLockReleased = subscribe('ROOM_LOCK_RELEASED', (payload) => {
      showToast(`🔓 Phòng giữ chỗ (Hạng #${payload?.roomTypeId}) đã được nhả về kho trống`, 'info');
    });

    // 6. Đơn đặt phòng mới
    const unsubBooking = subscribe('BOOKING_CREATED', (payload) => {
      showToast(`🎉 Đơn đặt phòng mới: ${payload?.confirmationCode || ''} (${payload?.guestName || 'Khách trực tuyến'})`, 'success');
      fetchRealRooms(true);
    });

    return () => {
      unsubStatus();
      unsubBatch();
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubLockAcquired();
      unsubLockReleased();
      unsubBooking();
    };
  }, [subscribe]);

  // ─── Chuyển đổi trạng thái phòng tự động ─────────────────────────────────
  const handleChangeStatus = async (roomId, targetStatus) => {
    const currentRoom = rooms.find((r) => r.id === roomId);
    if (!currentRoom) return;

    try {
      const res = await fetch(`${API_BASE}/${roomId}/chuyen-trang-thai`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          prevUpdatedAt: currentRoom.updated_at
        })
      });

      const result = await res.json();

      // Trường hợp 1: Phòng bị xóa bởi người khác (Xung đột sửa - xóa)
      if (res.status === 404 || result.isRecordDeleted) {
        setSyncModal({
          title: 'CẢNH BÁO ĐỒNG BỘ: PHÒNG ĐÃ BỊ XÓA KHỎI DATABASE!',
          message: `Trong lúc bạn đang thao tác, phòng [${currentRoom.so_phong}] (ID #${roomId}) đã bị nhân viên khác hoặc quản trị viên xóa khỏi cơ sở dữ liệu! Thao tác đổi trạng thái không thể thực hiện.`,
          type: 'deleted',
          onConfirm: () => {
            setSyncModal(null);
            fetchRealRooms();
          }
        });
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        if (selectedRoom?.id === roomId) setSelectedRoom(null);
        return;
      }

      // Trường hợp 2: Xung đột sửa đồng thời (người khác vừa cập nhật)
      if (res.status === 409 || result.isConflict) {
        setSyncModal({
          title: 'XUNG ĐỘT DỮ LIỆU: TRẠNG THÁI VỪA BỊ THAY ĐỔI!',
          message: result.message || `Phòng [${currentRoom.so_phong}] vừa được người khác cập nhật trạng thái mới. Vui lòng tải lại dữ liệu để đảm bảo tính nhất quán!`,
          type: 'conflict',
          onConfirm: () => {
            setSyncModal(null);
            fetchRealRooms();
          }
        });
        return;
      }

      if (!res.ok || !result.success) {
        showToast(result.message || 'Lỗi khi cập nhật trạng thái phòng', 'error');
        return;
      }

      // Cập nhật thành công vào UI
      const updated = result.data;
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRoom?.id === updated.id) setSelectedRoom(updated);

      showToast(`Đã chuyển phòng ${updated.so_phong} sang: ${STATUS_CONFIG[targetStatus]?.label}`);
    } catch (err) {
      showToast('Lỗi kết nối khi cập nhật trạng thái: ' + err.message, 'error');
    }
  };

  // ─── Xử lý bảo trì (FEAT-ROOMSTATUS-01 Spec 3.5 & 4.4) ──────────────────
  const handleOpenMaintenanceModal = (room, action) => {
    setMaintenanceModal({ room, action });
    setMaintenanceNote('');
    setMaintenanceError('');
  };

  const handleSubmitMaintenance = async () => {
    if (!maintenanceModal) return;
    const { room, action } = maintenanceModal;

    // Validate client-side (Spec 3.5 & 3.9)
    if (action === 'on') {
      const trimmed = maintenanceNote.trim();
      if (!trimmed) { setMaintenanceError('Vui lòng nhập lý do bảo trì'); return; }
      if (trimmed.length < 5) { setMaintenanceError('Lý do bảo trì phải có ít nhất 5 ký tự'); return; }
      if (trimmed.length > 500) { setMaintenanceError('Lý do bảo trì không được vượt quá 500 ký tự'); return; }
    }

    setMaintenanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${room.id}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, maintenanceNote: maintenanceNote.trim() })
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setMaintenanceError(result.message || 'Lỗi khi cập nhật trạng thái bảo trì');
        return;
      }

      setRooms(prev => prev.map(r => r.id === result.data.id ? result.data : r));
      if (selectedRoom?.id === result.data.id) setSelectedRoom(result.data);
      showToast('Cập nhật trạng thái phòng thành công');
      setMaintenanceModal(null);
    } catch (err) {
      setMaintenanceError('Lỗi kết nối khi cập nhật bảo trì: ' + err.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // ─── Tải lịch sử trạng thái phòng (FEAT-ROOMSTATUS-01 Spec 6.1) ──────────
  const fetchStatusHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      let url;
      if (historyRoomId) {
        const params = new URLSearchParams({ page, pageSize: 20 });
        if (historyFrom) params.append('from', historyFrom);
        if (historyTo) params.append('to', historyTo);
        url = `${API_BASE}/${historyRoomId}/status-history?${params}`;
      } else {
        const params = new URLSearchParams({ page, pageSize: 20 });
        if (historyFrom) params.append('from', historyFrom);
        if (historyTo) params.append('to', historyTo);
        if (historyRoomNumber) params.append('roomNumber', historyRoomNumber);
        url = `${API_BASE}/all-status-history?${params}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data || []);
        setHistoryTotal(data.total || 0);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryPage(page);
      } else {
        showToast(data.message || 'Lỗi tải lịch sử trạng thái', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };


  const handleSync50Rooms = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`${API_BASE}/dong-bo-50`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã đồng bộ cơ sở dữ liệu thành công!');
        fetchRealRooms();
      } else {
        showToast(data.message || 'Lỗi khi đồng bộ 50 phòng', 'error');
      }
    } catch (err) {
      showToast('Lỗi khi gọi API đồng bộ: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ─── Xóa phòng với kiểm tra xung đột CSDL ────────────────────────────────
  const handleDeleteRoom = async (roomToDelete) => {
    if (!roomToDelete) return;
    if (roomToDelete.luu_tru === 'inhouse') {
      showToast('Không thể xóa phòng đang có khách lưu trú!', 'error');
      setDeleteConfirmModal(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/${roomToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.status === 404 || data.isRecordDeleted) {
        setSyncModal({
          title: 'CẢNH BÁO: PHÒNG ĐÃ BỊ XÓA TRƯỚC ĐÓ!',
          message: `Phòng "${roomToDelete.so_phong}" (ID #${roomToDelete.id}) đã được xóa khỏi cơ sở dữ liệu bởi quản trị viên hoặc tiến trình khác!`,
          type: 'deleted',
          onConfirm: () => {
            setSyncModal(null);
            fetchRealRooms();
          }
        });
        setRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
        setDeleteConfirmModal(null);
        return;
      }

      if (!res.ok || !data.success) {
        showToast(data.message || 'Không thể xóa phòng', 'error');
        setDeleteConfirmModal(null);
        return;
      }

      showToast(`Đã xóa thành công phòng ${roomToDelete.so_phong}`);
      setRooms((prev) => prev.filter((r) => r.id !== roomToDelete.id));
      if (selectedRoom?.id === roomToDelete.id) {
        setSelectedRoom(null);
      }
      setDeleteConfirmModal(null);
    } catch (err) {
      showToast('Lỗi khi xóa phòng: ' + err.message, 'error');
      setDeleteConfirmModal(null);
    }
  };

  // ─── Lưu Form Thêm / Sửa Phòng (Hỗ trợ tiếng Việt có dấu, chặn lỗi ký tự) ─
  const handleSaveRoomForm = async (e) => {
    e.preventDefault();
    const f = editModal.room;

    // Validate ký tự hợp lệ
    const trimmedNum = String(f.so_phong || '').trim();
    if (!trimmedNum) {
      showToast('Số phòng không được để trống!', 'error');
      return;
    }
    if (!/^[\p{L}0-9._\-\/\s]{1,30}$/u.test(trimmedNum)) {
      showToast('Số phòng chứa ký tự không hợp lệ!', 'error');
      return;
    }

    try {
      const isNew = editModal.isNew;
      const url = isNew ? API_BASE : `${API_BASE}/${f.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f)
      });
      const data = await res.json();

      // Kiểm tra phòng bị xóa khi đang sửa
      if (!isNew && (res.status === 404 || data.isRecordDeleted)) {
        setSyncModal({
          title: 'CẢNH BÁO ĐỒNG BỘ: PHÒNG ĐÃ BỊ XÓA KHỎI DATABASE!',
          message: `Trong lúc bạn đang sửa, phòng [${trimmedNum}] đã bị xóa khỏi cơ sở dữ liệu! Không thể lưu thay đổi.`,
          type: 'deleted',
          onConfirm: () => {
            setSyncModal(null);
            setEditModal(null);
            fetchRealRooms();
          }
        });
        return;
      }

      if (!res.ok || !data.success) {
        showToast(data.message || 'Lỗi khi lưu phòng', 'error');
        return;
      }

      showToast(isNew ? `Đã thêm phòng ${trimmedNum} thành công!` : `Đã cập nhật thông tin phòng ${trimmedNum}!`);
      setEditModal(null);
      fetchRealRooms();
    } catch (err) {
      showToast('Lỗi lưu phòng: ' + err.message, 'error');
    }
  };

  // ─── Tính toán KPI thống kê trực tiếp ────────────────────────────────────
  const stats = useMemo(() => {
    const s = { clean: 0, inhouse: 0, dirty: 0, ooo: 0, total: rooms.length };
    rooms.forEach((r) => {
      const k = getRoomStatusKey(r);
      s[k]++;
    });
    const occRate = s.total > 0 ? ((s.inhouse / s.total) * 100).toFixed(1) : 0;
    return { ...s, occRate };
  }, [rooms]);

  // ─── Lọc danh sách phòng theo điều kiện ─────────────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const statusKey = getRoomStatusKey(r);
      if (filterStatus !== 'all' && statusKey !== filterStatus) return false;
      if (filterFloor !== 'all' && String(r.tang) !== String(filterFloor)) return false;
      if (filterWing !== 'all' && String(r.khu).toUpperCase() !== String(filterWing).toUpperCase()) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchNum = String(r.so_phong).toLowerCase().includes(q);
        const matchKey = String(r.ma_khoa || '').toLowerCase().includes(q);
        const matchType = String(r.ma_loai || '').toLowerCase().includes(q);
        const matchNote = String(r.ghi_chu || '').toLowerCase().includes(q);
        if (!matchNum && !matchKey && !matchType && !matchNote) return false;
      }
      return true;
    });
  }, [rooms, filterStatus, filterFloor, filterWing, searchTerm]);

  // Gom nhóm phòng theo Tầng
  const groupedByFloor = useMemo(() => {
    const map = {};
    filteredRooms.forEach((r) => {
      const f = r.tang || 1;
      if (!map[f]) map[f] = [];
      map[f].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
  }, [filteredRooms]);

  // Gom nhóm phòng theo Khu (Wings)
  const groupedByWing = useMemo(() => {
    const map = {};
    filteredRooms.forEach((r) => {
      const w = r.khu || 'A';
      if (!map[w]) map[w] = [];
      map[w].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRooms]);

  const getTypeName = (code) => {
    const found = roomTypes.find((t) => t.code === code || t.code?.toUpperCase() === code?.toUpperCase());
    return found ? found.name : code || 'Deluxe Room';
  };

  const getPrice = (code) => {
    const found = roomTypes.find((t) => t.code === code || t.code?.toUpperCase() === code?.toUpperCase());
    return found?.price || '2.500.000 đ';
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full pb-20 select-none">
        {/* Toast Thông báo */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[250] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl font-label-md text-label-md font-semibold text-white transition-all transform animate-bounce ${
              toast.type === 'error' ? 'bg-error shadow-red-500/30' : 'bg-admin-primary shadow-emerald-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ─── 1. TOP COMMAND BAR ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low p-gutter rounded-2xl shadow-sm border border-outline-variant/30 mb-gutter">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-admin-primary/15 text-admin-primary font-label-sm text-label-sm font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-admin-primary animate-ping" />
                Dữ Liệu Trực Tiếp Thời Gian Thực
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                SƠ ĐỒ PHÒNG &amp; QUẢN LÝ TRẠNG THÁI PHÒNG TỰ ĐỘNG
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
              <span>Đồng bộ 4 trạng thái chuẩn PMS: Trống sạch • Đang ở • Chờ dọn dẹp • Đang bảo trì</span>
              <span className="text-outline-variant">•</span>
              <span className="font-mono text-admin-primary font-bold">
                CSDL MySQL: {stats.total} / {totalInDb} phòng vận hành
              </span>
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            {/* Realtime Live Indicator Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xs transition-all ${
              isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
            }`}>
              <span className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[11px] font-bold tracking-wide uppercase">
                {isConnected ? 'Realtime Live' : 'Đang kết nối lại'}
              </span>
            </div>

            {/* Countdown auto-refresh badge */}
            <div className="flex items-center gap-2 bg-surface-container-high px-space-md py-1.5 rounded-xl border border-outline-variant/20 shadow-xs">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">
                av_timer
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-on-surface-variant leading-none uppercase font-bold">Tự làm mới</span>
                <span className="font-mono text-label-md font-bold text-amber-600 dark:text-amber-400 leading-tight">
                  {secondsLeft}s
                </span>
              </div>
            </div>

            {/* Nút Làm Mới */}
            <button
              onClick={() => fetchRealRooms()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px- space-md px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-bold transition-all shadow-xs border border-outline-variant/30 cursor-pointer active:scale-95"
            >
              <span className={`material-symbols-outlined text-[18px] text-admin-primary ${isRefreshing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>Làm Mới</span>
            </button>

            {/* Nút Đồng bộ 50 phòng chuẩn */}
            <button
              onClick={handleSync50Rooms}
              title="Đảm bảo database có đúng 50 phòng thực tế, dọn bớt nếu vượt quá"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-md text-label-md font-bold transition-all shadow-xs border border-outline-variant/30 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Đồng Bộ 50 Phòng</span>
            </button>

            {/* Nút Thêm phòng mới */}
            <button
              onClick={() =>
                setEditModal({
                  isNew: true,
                  room: {
                    so_phong: '',
                    tang: 1,
                    khu: 'A',
                    ma_loai: 'RT-1',
                    ma_khoa: `RFID-${Date.now().toString().slice(-4)}`,
                    phong_lien_thong: '',
                    ghi_chu: 'Phòng mới tạo',
                    buong_phong: 'clean',
                    luu_tru: 'vacant'
                  }
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold hover:brightness-105 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Thêm Phòng</span>
            </button>
          </div>
        </div>

        {/* ─── 2. STATUS KPI STRIP (4 Trạng thái chuẩn + Tổng số) ────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-space-sm mb-gutter">
          {/* 1. Trống sạch */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'clean' ? 'all' : 'clean')}
            className={`p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between shadow-xs border transition-all cursor-pointer group hover:bg-surface-container ${
              filterStatus === 'clean' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-outline-variant/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                TRỐNG &amp; SẠCH SẼ
              </span>
              <span className="material-symbols-outlined text-emerald-500 text-[22px]">verified</span>
            </div>
            <div className="mt-space-sm flex items-baseline justify-between">
              <span className="font-display-lg text-[2rem] font-bold text-on-surface font-mono">{stats.clean}</span>
              <span className="font-label-md text-label-md font-bold text-emerald-600 dark:text-emerald-400">
                {stats.total > 0 ? ((stats.clean / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-sm">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.clean / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 2. Đang ở */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'inhouse' ? 'all' : 'inhouse')}
            className={`p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between shadow-xs border transition-all cursor-pointer group hover:bg-surface-container ${
              filterStatus === 'inhouse' ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-outline-variant/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-sky-600 dark:text-sky-400 tracking-wider uppercase">
                ĐANG CÓ KHÁCH
              </span>
              <span className="material-symbols-outlined text-sky-500 text-[22px]">person_pin_circle</span>
            </div>
            <div className="mt-space-sm flex items-baseline justify-between">
              <span className="font-display-lg text-[2rem] font-bold text-on-surface font-mono">{stats.inhouse}</span>
              <span className="font-label-md text-label-md font-bold text-sky-600 dark:text-sky-400">
                {stats.total > 0 ? ((stats.inhouse / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-sm">
              <div
                className="bg-sky-500 h-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.inhouse / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 3. Chờ dọn dẹp */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'dirty' ? 'all' : 'dirty')}
            className={`p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between shadow-xs border transition-all cursor-pointer group hover:bg-surface-container ${
              filterStatus === 'dirty' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-outline-variant/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">
                BẨN CHỜ DỌN DẸP
              </span>
              <span className="material-symbols-outlined text-amber-500 text-[22px]">cleaning_services</span>
            </div>
            <div className="mt-space-sm flex items-baseline justify-between">
              <span className="font-display-lg text-[2rem] font-bold text-on-surface font-mono">{stats.dirty}</span>
              <span className="font-label-md text-label-md font-bold text-amber-600 dark:text-amber-400">
                {stats.total > 0 ? ((stats.dirty / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-sm">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.dirty / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 4. Khóa bảo trì */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'ooo' ? 'all' : 'ooo')}
            className={`p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between shadow-xs border transition-all cursor-pointer group hover:bg-surface-container ${
              filterStatus === 'ooo' ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-outline-variant/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase">
                ĐANG BẢO TRÌ (OOO)
              </span>
              <span className="material-symbols-outlined text-rose-500 text-[22px]">build_circle</span>
            </div>
            <div className="mt-space-sm flex items-baseline justify-between">
              <span className="font-display-lg text-[2rem] font-bold text-on-surface font-mono">{stats.ooo}</span>
              <span className="font-label-md text-label-md font-bold text-rose-600 dark:text-rose-400">
                {stats.total > 0 ? ((stats.ooo / stats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-sm">
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.ooo / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 5. Tổng công suất */}
          <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col justify-between shadow-xs border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold text-on-surface-variant tracking-wider uppercase">
                CÔNG SUẤT PHÒNG
              </span>
              <span className="material-symbols-outlined text-admin-primary text-[22px]">hotel</span>
            </div>
            <div className="mt-space-sm flex items-baseline justify-between">
              <span className="font-display-lg text-[2rem] font-bold text-admin-primary font-mono">{stats.occRate}%</span>
              <span className="font-label-sm text-label-sm font-mono text-on-surface-variant">
                {stats.inhouse} / {stats.total} phòng
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-space-sm">
              <div
                className="bg-admin-primary h-full transition-all duration-500"
                style={{ width: `${stats.occRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* ─── 3. OPERATIONAL FILTERS & CONTROL BAR ──────────────────────── */}
        <div className="bg-surface-container-low p-space-md rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md mb-gutter">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/30 self-start">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-admin-primary-container text-on-admin-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Lưới Phòng (Rack)</span>
            </button>
            <button
              onClick={() => setViewMode('wing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold transition-all ${
                viewMode === 'wing'
                  ? 'bg-admin-primary-container text-on-admin-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">domain</span>
              <span>Theo Phân Khu</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-admin-primary-container text-on-admin-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
              <span>Bảng Chi Tiết</span>
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-bold whitespace-nowrap transition-colors border ${
                filterStatus === 'all'
                  ? 'bg-on-surface text-surface border-on-surface'
                  : 'bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest'
              }`}
            >
              Tất Cả ({stats.total})
            </button>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
              <button
                key={k}
                onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-bold whitespace-nowrap transition-colors border flex items-center gap-1 ${
                  filterStatus === k
                    ? `${cfg.bgBadge} border-current ring-1 ring-current`
                    : 'bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                <span>{cfg.shortLabel} ({stats[k]})</span>
              </button>
            ))}
          </div>

          {/* Filters dropdown & search */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterWing}
              onChange={(e) => setFilterWing(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-1.5 text-body-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
            >
              <option value="all">Tất cả khu</option>
              <option value="A">Khu A (Biệt Thự)</option>
              <option value="B">Khu B (Căn Hộ Nghỉ Dưỡng)</option>
              <option value="C">Khu C (Hướng Biển)</option>
            </select>

            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-1.5 text-body-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
            >
              <option value="all">Tất cả tầng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
                <option key={f} value={f}>
                  Tầng {f}
                </option>
              ))}
            </select>

            <div className="relative min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm số phòng, mã RFID..."
                className="w-full bg-surface-container-lowest pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/40 text-body-sm text-on-surface placeholder:text-outline-variant outline-none focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>
        </div>

        {/* ─── 4. MAIN SPLIT LAYOUT (Room Rack + Detail Drawer) ───────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">
          {/* CỘT TRÁI: ROOM RACK (8 CỘT) */}
          <div className="xl:col-span-8 flex flex-col space-y-gutter">
            {loading ? (
              <div className="p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[36px] text-admin-primary animate-spin">sync</span>
                <span className="font-label-md text-label-md font-bold text-on-surface-variant">
                  Đang đồng bộ sơ đồ phòng thực tế từ MySQL CSDL...
                </span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2">meeting_room</span>
                <p className="font-headline-sm text-on-surface font-bold">Không tìm thấy phòng phù hợp với bộ lọc</p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Hãy thử chọn lại trạng thái, tầng hoặc xóa từ khóa tìm kiếm.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Dạng 1: Nhóm theo Tầng (Grid Rack) */
              groupedByFloor.map(([floor, floorRooms]) => (
                <div
                  key={floor}
                  className="bg-surface-container-low p-gutter rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col space-y-space-md"
                >
                  <div className="flex items-center justify-between border-b pb-space-xs border-outline-variant/20">
                    <div className="flex items-center gap-space-sm">
                      <span className="w-8 h-8 rounded-lg bg-on-surface text-surface flex items-center justify-center font-mono font-bold text-label-md shadow-xs">
                        {String(floor).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col">
                        <h2 className="font-headline-sm text-label-lg font-bold text-on-surface">
                          Tầng {floor} • Khu {floorRooms[0]?.khu || 'A'}
                        </h2>
                        <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">
                          {floorRooms.length} phòng đang hoạt động
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-label-sm font-mono">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                        {floorRooms.filter((r) => getRoomStatusKey(r) === 'clean').length} Sạch
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-bold">
                        {floorRooms.filter((r) => getRoomStatusKey(r) === 'inhouse').length} Ở
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                        {floorRooms.filter((r) => getRoomStatusKey(r) === 'dirty').length} Bẩn
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-sm">
                    {floorRooms.map((r) => {
                      const st = getRoomStatusKey(r);
                      const cfg = STATUS_CONFIG[st];
                      const isSelected = selectedRoom?.id === r.id;

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoom(r)}
                          className={`cursor-pointer group rounded-xl p-space-md bg-surface-container hover:bg-surface-container-high transition-all shadow-xs relative overflow-hidden border ${
                            isSelected
                              ? 'border-admin-primary ring-2 ring-admin-primary/70 bg-surface-container-highest'
                              : 'border-outline-variant/30 hover:shadow-md'
                          }`}
                        >
                          {/* Dải màu trạng thái trên cùng */}
                          <div className={`absolute top-0 left-0 right-0 h-1.5 ${cfg.topBorder}`} />

                          <div className="flex items-start justify-between mt-1">
                            <div>
                              <span className="font-mono text-[1.4rem] font-bold text-on-surface tracking-tight">
                                {r.so_phong}
                              </span>
                              <span
                                className={`ml-1.5 font-label-sm text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${cfg.bgBadge}`}
                              >
                                {cfg.shortLabel}
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[18px]" style={{ color: cfg.color }}>
                              {cfg.icon}
                            </span>
                          </div>

                          <div className="mt-space-xs pt-space-xs text-body-sm">
                            <span className="font-bold text-on-surface line-clamp-1">{getTypeName(r.ma_loai)}</span>
                            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-0.5 font-mono">
                              <span>Mã: {r.ma_khoa || 'RFID-STD'}</span>
                              <span className="text-secondary font-semibold">{getPrice(r.ma_loai)}</span>
                            </div>
                          </div>

                          {/* Thao tác chuyển đổi trạng thái nhanh */}
                          <div className="mt-space-sm pt-space-xs border-t border-outline-variant/20 flex items-center justify-between">
                            <span className="text-[11px] text-on-surface-variant font-medium">Tự động:</span>
                            <div className="flex items-center gap-1">
                              {cfg.nextActions.slice(0, 2).map((na) => (
                                <button
                                  key={na.action}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeStatus(r.id, na.action);
                                  }}
                                  title={na.label}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition-transform active:scale-95 ${na.cls}`}
                                >
                                  {na.action === 'inhouse' ? 'Nhận' : na.action === 'dirty' ? 'Trả' : 'Dọn'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : viewMode === 'wing' ? (
              /* Dạng 2: Nhóm theo Phân Khu (Wings) */
              groupedByWing.map(([wing, wingRooms]) => (
                <div
                  key={wing}
                  className="bg-surface-container-low p-gutter rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col space-y-space-md"
                >
                  <div className="flex items-center justify-between border-b pb-space-xs border-outline-variant/20">
                    <div className="flex items-center gap-space-sm">
                      <span className="w-8 h-8 rounded-lg bg-admin-primary text-on-admin-primary flex items-center justify-center font-bold text-label-md">
                        {wing}
                      </span>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Phân Khu {wing} • {wingRooms.length} Phòng Hoạt Động
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-space-sm">
                    {wingRooms.map((r) => {
                      const st = getRoomStatusKey(r);
                      const cfg = STATUS_CONFIG[st];
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoom(r)}
                          className={`p-space-sm rounded-xl bg-surface-container border cursor-pointer hover:bg-surface-container-high transition-all ${
                            selectedRoom?.id === r.id ? 'border-admin-primary ring-2 ring-admin-primary/60' : 'border-outline-variant/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-headline-sm font-bold text-on-surface">{r.so_phong}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${cfg.bgBadge}`}>
                              {cfg.shortLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant truncate mt-1">Tầng {r.tang} • {getTypeName(r.ma_loai)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Dạng 3: Bảng danh sách chi tiết (Table View) */
              <div className="bg-surface-container-low rounded-2xl shadow-xs border border-outline-variant/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                        <th className="py-3 px-4">Số Phòng</th>
                        <th className="py-3 px-4">Tầng / Khu</th>
                        <th className="py-3 px-4">Hạng Phòng</th>
                        <th className="py-3 px-4">Mã Khóa RFID</th>
                        <th className="py-3 px-4 text-center">Trạng Thái Tự Động</th>
                        <th className="py-3 px-4 text-right">Thao Tác Chuyển</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm font-body-sm divide-y divide-outline-variant/20">
                      {filteredRooms.map((r) => {
                        const st = getRoomStatusKey(r);
                        const cfg = STATUS_CONFIG[st];
                        const isSelected = selectedRoom?.id === r.id;

                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedRoom(r)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-admin-primary/10' : 'hover:bg-surface-container-high/40'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-body-lg text-on-surface">
                              {r.so_phong}
                            </td>
                            <td className="py-3 px-4 font-mono text-on-surface-variant">
                              Tầng {r.tang} • Khu {r.khu}
                            </td>
                            <td className="py-3 px-4 font-semibold text-on-surface">
                              {getTypeName(r.ma_loai)}
                            </td>
                            <td className="py-3 px-4 font-mono text-on-surface-variant">{r.ma_khoa || '---'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${cfg.bgBadge}`}>
                                <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {cfg.nextActions.map((na) => (
                                  <button
                                    key={na.action}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleChangeStatus(r.id, na.action);
                                    }}
                                    className={`px-2 py-1 rounded text-label-sm font-bold cursor-pointer ${na.cls}`}
                                  >
                                    {na.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: LIVE DRAWER / INSPECTOR DOSSIER (4 CỘT) */}
          <div className="xl:col-span-4 flex flex-col space-y-gutter sticky top-20">
            {selectedRoom ? (
              <div className="bg-surface-container-low rounded-2xl p-gutter shadow-xl border border-outline-variant/30 flex flex-col space-y-space-md relative overflow-hidden">
                {/* Header thẻ phòng đang chọn */}
                <div className="flex items-center justify-between border-b pb-space-sm border-outline-variant/20">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-11 h-11 rounded-xl bg-admin-primary/15 flex items-center justify-center text-admin-primary font-bold shadow-xs">
                      <span className="material-symbols-outlined text-[26px]">villa</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-headline-md font-bold text-on-surface">
                          {selectedRoom.so_phong}
                        </span>
                        <span
                          className={`font-label-sm text-[11px] px-2.5 py-0.5 rounded-full border uppercase font-bold ${
                            STATUS_CONFIG[getRoomStatusKey(selectedRoom)].bgBadge
                          }`}
                        >
                          {STATUS_CONFIG[getRoomStatusKey(selectedRoom)].label}
                        </span>
                      </div>
                      <span className="text-[12px] text-on-surface-variant font-medium">
                        Tầng {selectedRoom.tang} • Khu {selectedRoom.khu} • {getTypeName(selectedRoom.ma_loai)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditModal({ isNew: false, room: { ...selectedRoom } })}
                      title="Sửa phòng"
                      className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmModal(selectedRoom)}
                      title="Xóa phòng"
                      className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-rose-500/20 flex items-center justify-center text-rose-500 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Banner ảnh minh họa Resort */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-sm bg-surface-container-high">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80')`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">Hạng Nghỉ Dưỡng</span>
                      <p className="text-body-sm font-bold text-white drop-shadow-md">
                        {getPrice(selectedRoom.ma_loai)} / đêm
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-admin-primary font-bold shadow-xs">
                      {selectedRoom.ma_khoa || 'Thẻ Kích Hoạt'}
                    </span>
                  </div>
                </div>

                {/* Khối quy tắc chuyển trạng thái tự động 4 nút chuẩn */}
                <div className="p-space-md rounded-xl bg-surface-container flex flex-col space-y-space-sm border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-admin-primary text-[18px]">tune</span>
                    Chuyển Trạng Thái Phòng Tự Động
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChangeStatus(selectedRoom.id, 'clean')}
                      className={`flex items-center gap-1.5 p-2.5 rounded-xl font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        getRoomStatusKey(selectedRoom) === 'clean'
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                          : 'bg-surface-container-lowest hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Trống Sạch</span>
                    </button>

                    <button
                      onClick={() => handleChangeStatus(selectedRoom.id, 'inhouse')}
                      className={`flex items-center gap-1.5 p-2.5 rounded-xl font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        getRoomStatusKey(selectedRoom) === 'inhouse'
                          ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/50'
                          : 'bg-surface-container-lowest hover:bg-sky-500/10 text-sky-600 border border-sky-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
                      <span>Nhận Phòng</span>
                    </button>

                    <button
                      onClick={() => handleChangeStatus(selectedRoom.id, 'dirty')}
                      className={`flex items-center gap-1.5 p-2.5 rounded-xl font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                        getRoomStatusKey(selectedRoom) === 'dirty'
                          ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                          : 'bg-surface-container-lowest hover:bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                      <span>Chờ Dọn Dẹp</span>
                    </button>

                    {/* Nút Bảo Trì / Gỡ Bảo Trì — đi qua modal có maintenanceNote (Spec 3.5) */}
                    {getRoomStatusKey(selectedRoom) === 'ooo' ? (
                      <button
                        onClick={() => handleOpenMaintenanceModal(selectedRoom, 'off')}
                        className="flex items-center gap-1.5 p-2.5 rounded-xl font-label-sm text-label-sm font-bold transition-all cursor-pointer bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50"
                      >
                        <span className="material-symbols-outlined text-[18px]">build_circle</span>
                        <span>Gỡ Bảo Trì</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenMaintenanceModal(selectedRoom, 'on')}
                        disabled={getRoomStatusKey(selectedRoom) === 'inhouse'}
                        className={`flex items-center gap-1.5 p-2.5 rounded-xl font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                          getRoomStatusKey(selectedRoom) === 'inhouse'
                            ? 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30 opacity-50 cursor-not-allowed'
                            : 'bg-surface-container-lowest hover:bg-rose-500/10 text-rose-600 border border-rose-500/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">build_circle</span>
                        <span>Khóa Bảo Trì</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant italic mt-1">
                    * {STATUS_CONFIG[getRoomStatusKey(selectedRoom)].description}
                  </p>
                  {/* Nút xem lịch sử trạng thái phòng (Spec 6.1) */}
                  <button
                    onClick={() => {
                      setHistoryRoomId(String(selectedRoom.id));
                      setHistoryRoomNumber(selectedRoom.so_phong);
                      setHistoryModal(true);
                      fetchStatusHistory(1);
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high font-label-sm text-label-sm font-bold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    <span>Xem Lịch Sử Trạng Thái</span>
                  </button>

                </div>

                {/* Thông tin phần cứng & IoT */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-surface-container text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-admin-primary text-[20px]">thermostat</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">Nhiệt Độ</span>
                    <span className="font-mono text-label-md font-bold text-on-surface">23.0°C</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-sky-500 text-[20px]">vpn_key</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">Đầu Khóa</span>
                    <span className="font-mono text-label-md font-bold text-sky-500">Trực Tuyến</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">wifi</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">Mạng Cảm Biến</span>
                    <span className="font-mono text-label-md font-bold text-admin-primary">98%</span>
                  </div>
                </div>

                {/* Ghi chú & Thao tác buồng phòng */}
                <div className="p-space-md rounded-xl bg-surface-container flex flex-col space-y-1.5 border border-outline-variant/20">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-500 text-[16px]">notes</span>
                    Ghi Chú Vận Hành &amp; Buồng Phòng
                  </span>
                  <p className="text-body-sm text-on-surface bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/30 min-h-[48px]">
                    {selectedRoom.ghi_chu || 'Không có ghi chú đặc biệt cho phòng này.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[40px] text-outline-variant">touch_app</span>
                <span className="font-headline-sm text-on-surface font-bold">Chưa Chọn Phòng</span>
                <p className="text-body-sm text-on-surface-variant">
                  Bấm vào bất kỳ thẻ phòng nào bên trái để xem hồ sơ và điều khiển trạng thái tự động.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── 5. MODAL XUNG ĐỘT / PHÒNG ĐÃ BỊ XÓA (Concurrency Modal) ──── */}
        {syncModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-500/40 flex flex-col space-y-4 animate-scaleIn">
              <div className="flex items-center gap-3 text-red-500">
                <span className="material-symbols-outlined text-[32px]">warning</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {syncModal.title}
                </h3>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {syncModal.message}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={syncModal.onConfirm}
                  className="px-5 py-2.5 rounded-xl bg-admin-primary text-white font-label-md text-label-md font-bold shadow-md hover:brightness-110 cursor-pointer"
                >
                  Tải Lại Dữ Liệu Ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 6. MODAL XÁC NHẬN XÓA PHÒNG ───────────────────────────────── */}
        {deleteConfirmModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/40 flex flex-col space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                <span className="material-symbols-outlined text-[32px]">delete_forever</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Xác Nhận Xóa Phòng
                </h3>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Bạn có chắc chắn muốn xóa phòng{' '}
                <strong className="text-on-surface font-mono">{deleteConfirmModal.so_phong}</strong> (ID #{deleteConfirmModal.id}) khỏi cơ sở dữ liệu MySQL?
                Thao tác này không thể hoàn tác.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(deleteConfirmModal)}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-label-md text-label-md font-bold hover:bg-rose-700 shadow-md cursor-pointer"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 7. MODAL THÊM / SỬA PHÒNG (Hỗ trợ ký tự tiếng Việt) ───────── */}
        {editModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-outline-variant/40 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 border-outline-variant/30">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-admin-primary">
                    {editModal.isNew ? 'add_circle' : 'edit'}
                  </span>
                  <span>{editModal.isNew ? 'Thêm Phòng Vật Lý Mới' : `Sửa Phòng ${editModal.room.so_phong}`}</span>
                </h3>
                <button
                  onClick={() => setEditModal(null)}
                  className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveRoomForm} className="flex flex-col space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">
                      Số phòng * (Hỗ trợ tiếng Việt)
                    </span>
                    <input
                      type="text"
                      required
                      value={editModal.room.so_phong}
                      onChange={(e) =>
                        setEditModal({ ...editModal, room: { ...editModal.room, so_phong: e.target.value } })
                      }
                      placeholder="vd: 101, V-101, P.201"
                      className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm font-mono text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">Tầng *</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={99}
                      value={editModal.room.tang}
                      onChange={(e) =>
                        setEditModal({ ...editModal, room: { ...editModal.room, tang: Number(e.target.value) } })
                      }
                      className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm font-mono text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">Phân Khu (Dãy)</span>
                    <select
                      value={editModal.room.khu || 'A'}
                      onChange={(e) =>
                        setEditModal({ ...editModal, room: { ...editModal.room, khu: e.target.value } })
                      }
                      className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                    >
                      <option value="A">Khu A (Biệt Thự)</option>
                      <option value="B">Khu B (Căn Hộ Nghỉ Dưỡng)</option>
                      <option value="C">Khu C (Hướng Biển)</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">Loại phòng</span>
                    <select
                      value={editModal.room.ma_loai || 'RT-1'}
                      onChange={(e) =>
                        setEditModal({ ...editModal, room: { ...editModal.room, ma_loai: e.target.value } })
                      }
                      className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                    >
                      {roomTypes.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.code} - {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">
                    Mã đầu đọc khóa RFID *
                  </span>
                  <input
                    type="text"
                    required
                    value={editModal.room.ma_khoa || ''}
                    onChange={(e) =>
                      setEditModal({ ...editModal, room: { ...editModal.room, ma_khoa: e.target.value } })
                    }
                    placeholder="vd: RFID-101"
                    className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm font-mono text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">
                    Ghi chú buồng phòng / bảo trì
                  </span>
                  <textarea
                    rows={2}
                    value={editModal.room.ghi_chu || ''}
                    onChange={(e) =>
                      setEditModal({ ...editModal, room: { ...editModal.room, ghi_chu: e.target.value } })
                    }
                    placeholder="Ghi chú chi tiết..."
                    className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-admin-primary"
                  />
                </label>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-admin-primary text-white font-label-md text-label-md font-bold shadow-md hover:brightness-110 cursor-pointer"
                  >
                    {editModal.isNew ? 'Thêm Mới' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ─── 8. MODAL BẢO TRÌ PHÒNG (FEAT-ROOMSTATUS-01 Spec 6.2) ──────────── */}
        {maintenanceModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/40 flex flex-col space-y-4">
              {/* Tiêu đề (Spec 6.2 STT 1) */}
              <div className="flex items-center justify-between border-b pb-3 border-outline-variant/30">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[24px] ${maintenanceModal.action === 'on' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {maintenanceModal.action === 'on' ? 'build' : 'check_circle'}
                  </span>
                  <span>
                    {maintenanceModal.action === 'on'
                      ? `Đánh Dấu Bảo Trì Phòng ${maintenanceModal.room.so_phong}`
                      : `Gỡ Bảo Trì Phòng ${maintenanceModal.room.so_phong}`}
                  </span>
                </h3>
                <button onClick={() => setMaintenanceModal(null)} className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Textarea lý do bảo trì — chỉ hiển thị khi đánh dấu (Spec 6.2 STT 2) */}
              {maintenanceModal.action === 'on' && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm font-bold text-on-surface-variant">
                    Lý do bảo trì <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={maintenanceNote}
                    onChange={(e) => {
                      setMaintenanceNote(e.target.value);
                      setMaintenanceError('');
                    }}
                    onBlur={() => {
                      const trimmed = maintenanceNote.trim();
                      if (!trimmed) setMaintenanceError('Vui lòng nhập lý do bảo trì');
                      else if (trimmed.length < 5) setMaintenanceError('Lý do bảo trì phải có ít nhất 5 ký tự');
                      else if (trimmed.length > 500) setMaintenanceError('Lý do bảo trì không được vượt quá 500 ký tự');
                      else setMaintenanceError('');
                    }}
                    maxLength={500}
                    placeholder="Mô tả chi tiết lý do khóa phòng bảo trì..."
                    className="bg-surface border border-outline-variant rounded-xl px-3 py-2 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-rose-400 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    {maintenanceError ? (
                      <span className="text-rose-500 text-[13px] font-semibold">{maintenanceError}</span>
                    ) : (
                      <span />
                    )}
                    <span className={`text-[11px] font-mono ${maintenanceNote.length > 480 ? 'text-rose-500' : 'text-on-surface-variant'}`}>
                      {maintenanceNote.length}/500
                    </span>
                  </div>
                </div>
              )}

              {/* Cảnh báo phụ khi gỡ bảo trì (Spec 6.2 STT 3) */}
              {maintenanceModal.action === 'off' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-[13px] text-amber-700 dark:text-amber-400 font-semibold">
                    Sau khi gỡ bảo trì, phòng sẽ chuyển về trạng thái Chờ dọn dẹp và cần được dọn lại trước khi đón khách.
                  </p>
                </div>
              )}

              {/* Hàng nút (Spec 6.2 STT 4) */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setMaintenanceModal(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmitMaintenance}
                  disabled={maintenanceLoading}
                  className={`px-5 py-2 rounded-xl font-label-md text-label-md font-bold shadow-md text-white cursor-pointer transition-all ${
                    maintenanceModal.action === 'on'
                      ? 'bg-[#EA4335] hover:brightness-110'
                      : 'bg-[#1F4E78] hover:brightness-110'
                  } ${maintenanceLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {maintenanceLoading ? 'Đang xử lý...' : 'Xác Nhận'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 9. MODAL LỊCH SỬ TRẠNG THÁI PHÒNG (FEAT-ROOMSTATUS-01 Spec 6.1) ── */}
        {historyModal && (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-4xl w-full shadow-2xl border border-outline-variant/40 flex flex-col space-y-4 max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3 border-outline-variant/30 flex-shrink-0">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-admin-primary">history</span>
                  <span>Lịch Sử Trạng Thái Phòng</span>
                  {historyRoomNumber && <span className="text-admin-primary font-mono">— {historyRoomNumber}</span>}
                </h3>
                <button onClick={() => { setHistoryModal(false); setHistoryRoomId(''); setHistoryRoomNumber(''); setHistoryData([]); }} className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Thanh công cụ (Spec 6.1 STT 1) */}
              <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                <input
                  type="text"
                  value={historyRoomNumber}
                  onChange={(e) => { setHistoryRoomNumber(e.target.value); setHistoryRoomId(''); }}
                  placeholder="Tìm theo số phòng..."
                  className="bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-admin-primary min-w-[140px]"
                />
                <input type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-admin-primary" />
                <span className="text-on-surface-variant text-sm">đến</span>
                <input type="date" value={historyTo} onChange={e => setHistoryTo(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-admin-primary" />
                <button
                  onClick={() => fetchStatusHistory(1)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-admin-primary text-white font-label-sm text-label-sm font-bold hover:brightness-110 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  Tra cứu
                </button>
              </div>

              {/* Bảng lịch sử (Spec 6.1 STT 2-3, sắp xếp mới nhất trước, 20 dòng/trang) */}
              <div className="overflow-y-auto flex-1">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined text-[36px] text-admin-primary animate-spin">sync</span>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px]">history_toggle_off</span>
                    <p className="mt-2 font-semibold">Không có dữ liệu lịch sử</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                        <th className="py-3 px-4">Thời Điểm</th>
                        <th className="py-3 px-4">Phòng</th>
                        <th className="py-3 px-4">Trạng Thái Cũ → Mới</th>
                        <th className="py-3 px-4">Nguồn Kích Hoạt</th>
                        <th className="py-3 px-4">Người Thực Hiện</th>
                        <th className="py-3 px-4">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {historyData.map(h => (
                        <tr key={h.historyId} className="hover:bg-surface-container/40 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-on-surface-variant whitespace-nowrap">
                            {new Date(h.changedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-on-surface">
                            {h.roomNumber}{h.floor ? ` (T${h.floor})` : ''}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold">{h.oldStatusLabel || '—'}</span>
                              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_forward</span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-admin-primary/10 text-admin-primary font-bold">{h.newStatusLabel}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            {/* Badge nguồn kích hoạt (Spec 6.1 STT 3) */}
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                              h.isAutomatic
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">{h.isAutomatic ? 'smart_toy' : 'person'}</span>
                              {h.isAutomatic ? 'Tự Động' : 'Thủ Công'}
                            </span>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">{h.triggerEventLabel}</div>
                          </td>
                          <td className="py-2.5 px-4 text-[12px] text-on-surface">{h.changedBy}</td>
                          <td className="py-2.5 px-4 text-[11px] text-on-surface-variant max-w-[160px] truncate" title={h.note || ''}>{h.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Phân trang (Spec 6.1: 20 dòng/trang) */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between flex-shrink-0 pt-2 border-t border-outline-variant/20">
                  <span className="text-[12px] text-on-surface-variant">
                    Tổng {historyTotal} bản ghi • Trang {historyPage}/{historyTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={historyPage <= 1}
                      onClick={() => fetchStatusHistory(historyPage - 1)}
                      className="px-3 py-1 rounded-lg bg-surface-container font-label-sm font-bold text-on-surface disabled:opacity-40 cursor-pointer"
                    >‹ Trước</button>
                    <button
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => fetchStatusHistory(historyPage + 1)}
                      className="px-3 py-1 rounded-lg bg-surface-container font-label-sm font-bold text-on-surface disabled:opacity-40 cursor-pointer"
                    >Tiếp ›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default RoomStatusManagement;
