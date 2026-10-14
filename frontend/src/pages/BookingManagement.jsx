import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';

const API_BASE = 'http://localhost:5000/api/bookings';
const API_ROOM_TYPES = 'http://localhost:5000/api/loai-phong';

// ─── Tab trạng thái (khớp đúng giá trị Status lưu trong CSDL) ────────────────
const STATUS_TABS = [
  { key: 'all',       label: 'Tất Cả',           icon: 'list_alt',          countKey: 'all',       color: 'text-on-surface' },
  { key: 'Pending',   label: 'Chờ Xác Nhận',     icon: 'pending_actions',   countKey: 'pending',   color: 'text-amber-500' },
  { key: 'Confirmed', label: 'Đã Xác Nhận',      icon: 'check_circle',      countKey: 'confirmed', color: 'text-emerald-500' },
  { key: 'CheckedIn', label: 'Đang Lưu Trú',     icon: 'person_pin_circle', countKey: 'checkedIn', color: 'text-sky-500' },
  { key: 'DueIn',     label: 'Đến Hôm Nay',      icon: 'login',             countKey: 'dueIn',     color: 'text-violet-500' },
  { key: 'DueOut',    label: 'Trả Phòng Hôm Nay', icon: 'logout',           countKey: 'dueOut',    color: 'text-orange-500' },
  { key: 'Completed', label: 'Đã Trả Phòng',     icon: 'task_alt',          countKey: 'completed', color: 'text-slate-400' },
  { key: 'Cancelled', label: 'Đã Hủy',           icon: 'cancel',            countKey: 'cancelled', color: 'text-rose-500' },
];

const STATUS_BADGE = {
  Pending:    { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30',   label: 'Chờ Xác Nhận' },
  Confirmed:  { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', label: 'Đã Xác Nhận' },
  CheckedIn:  { cls: 'bg-sky-500/15 text-sky-600 border-sky-500/30',         label: 'Đang Lưu Trú' },
  InHouse:    { cls: 'bg-sky-500/15 text-sky-600 border-sky-500/30',         label: 'Đang Lưu Trú' },
  Completed:  { cls: 'bg-slate-500/15 text-slate-500 border-slate-500/30',   label: 'Đã Trả Phòng' },
  CheckedOut: { cls: 'bg-slate-500/15 text-slate-500 border-slate-500/30',   label: 'Đã Trả Phòng' },
  Cancelled:  { cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30',      label: 'Đã Hủy' },
  NoShow:     { cls: 'bg-rose-500/15 text-rose-600 border-rose-500/30',      label: 'Không Đến' },
  default:    { cls: 'bg-surface-variant/50 text-on-surface-variant border-outline-variant/30', label: '—' },
};

const SOURCE_BADGE = {
  WalkIn:    { cls: 'bg-violet-500/15 text-violet-600 border-violet-500/30', label: 'Walk-in' },
  DirectWeb: { cls: 'bg-sky-500/15 text-sky-600 border-sky-500/30',          label: 'Website' },
  OTA:       { cls: 'bg-orange-500/15 text-orange-600 border-orange-500/30', label: 'OTA' },
  Corp:      { cls: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30', label: 'Doanh Nghiệp' },
  Phone:     { cls: 'bg-teal-500/15 text-teal-600 border-teal-500/30',       label: 'Điện Thoại' },
  default:   { cls: 'bg-surface-variant/50 text-on-surface-variant border-outline-variant/30', label: 'Khác' },
};

// ─── Tiện ích định dạng ─────────────────────────────────────────────────────
// Ngày hôm nay theo giờ địa phương (KHÔNG dùng toISOString để tránh lệch múi giờ)
const todayLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  // Dữ liệu seeder cũ có thể chứa '0000-00-00' — coi như chưa có ngày
  if (!m || m[1] === '0000' || m[2] === '00' || m[3] === '00') return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  const d1 = new Date(`${String(a).slice(0, 10)}T00:00:00`);
  const d2 = new Date(`${String(b).slice(0, 10)}T00:00:00`);
  const diff = Math.round((d2 - d1) / 86400000);
  return diff > 0 ? diff : 0;
};

// ─── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm text-sm pointer-events-auto
        ${t.type === 'error'   ? 'bg-rose-950 border-rose-500/40 text-rose-200' : ''}
        ${t.type === 'success' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-200' : ''}
        ${t.type === 'info'    ? 'bg-sky-950 border-sky-500/40 text-sky-200' : ''}
        ${t.type === 'warn'    ? 'bg-amber-950 border-amber-500/40 text-amber-200' : ''}
      `}>
        <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">
          {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : t.type === 'warn' ? 'warning' : 'info'}
        </span>
        <p>{t.message}</p>
      </div>
    ))}
  </div>
);

const INPUT_CLS = 'w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-admin-primary/50 focus:border-admin-primary transition-all';

// ─── Modal tạo đặt phòng mới (Walk-in / tại quầy) ───────────────────────────
const WalkInModal = ({ onClose, onCreated, showToast }) => {
  const today = todayLocal();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  const [form, setForm] = useState({
    guestName: '', guestPhone: '', guestEmail: '', nationalId: '',
    checkInDate: today, checkOutDate: tomorrow,
    adults: 2, children: 0, totalAmount: '', depositAmount: 0,
    bookingSource: 'WalkIn', roomTypeId: '',
  });
  const [saving, setSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Tải danh sách hạng phòng từ API thật của hệ thống
  useEffect(() => {
    let alive = true;
    setLoadingTypes(true);
    fetch(`${API_ROOM_TYPES}?trang_thai=active&limit=200`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.success) setRoomTypes(d.data || []);
      })
      .catch(() => { if (alive) showToast('Không tải được danh sách hạng phòng.', 'error'); })
      .finally(() => { if (alive) setLoadingTypes(false); });
    return () => { alive = false; };
  }, [showToast]);

  const nights = nightsBetween(form.checkInDate, form.checkOutDate);
  const selectedType = roomTypes.find((rt) => String(rt.id) === String(form.roomTypeId));
  const suggestedTotal = selectedType && nights > 0 ? Number(selectedType.gia_co_ban) * nights : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guestName.trim()) { showToast('Họ tên khách không được để trống.', 'error'); return; }
    if (!form.roomTypeId) { showToast('Vui lòng chọn hạng phòng.', 'error'); return; }
    if (nights < 1) { showToast('Ngày đi phải sau ngày đến ít nhất 1 đêm.', 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim(),
          guestEmail: form.guestEmail.trim(),
          nationalId: form.nationalId.trim(),
          roomTypeId: Number(form.roomTypeId),
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          adults: Number(form.adults) || 1,
          children: Number(form.children) || 0,
          depositAmount: Number(form.depositAmount) || 0,
          totalAmount: Number(form.totalAmount) || 0,
          bookingSource: form.bookingSource,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        onCreated();
      } else {
        showToast(data.message || 'Không thể tạo đặt phòng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-low rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-lowest rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500 text-[20px]">hail</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-base">Tạo Đặt Phòng Mới</h2>
              <p className="text-xs text-on-surface-variant">Khách đến trực tiếp hoặc đặt tại quầy lễ tân</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Thông tin khách hàng */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-admin-primary mb-3">Thông Tin Khách Hàng</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-on-surface-variant mb-1">Họ &amp; Tên <span className="text-rose-400">*</span></label>
                <input name="guestName" value={form.guestName} onChange={handleChange} placeholder="Nguyễn Văn A" className={INPUT_CLS} required />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Số Điện Thoại</label>
                <input name="guestPhone" value={form.guestPhone} onChange={handleChange} placeholder="0912 345 678" className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">CCCD / Hộ Chiếu</label>
                <input name="nationalId" value={form.nationalId} onChange={handleChange} placeholder="012345678901" className={INPUT_CLS} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-on-surface-variant mb-1">Email</label>
                <input name="guestEmail" value={form.guestEmail} onChange={handleChange} type="email" placeholder="email@example.com" className={INPUT_CLS} />
              </div>
            </div>
          </div>

          {/* Thông tin đặt phòng */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-admin-primary mb-3">Thông Tin Đặt Phòng</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Ngày Đến <span className="text-rose-400">*</span></label>
                <input type="date" name="checkInDate" value={form.checkInDate} onChange={handleChange} className={INPUT_CLS} required />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Ngày Trả <span className="text-rose-400">*</span></label>
                <input type="date" name="checkOutDate" value={form.checkOutDate} onChange={handleChange} className={INPUT_CLS} required />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Người Lớn</label>
                <input type="number" name="adults" value={form.adults} onChange={handleChange} min={1} max={10} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Trẻ Em</label>
                <input type="number" name="children" value={form.children} onChange={handleChange} min={0} max={10} className={INPUT_CLS} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-on-surface-variant mb-1">Hạng Phòng <span className="text-rose-400">*</span></label>
                <select name="roomTypeId" value={form.roomTypeId} onChange={handleChange} className={INPUT_CLS} required>
                  <option value="">{loadingTypes ? '-- Đang tải hạng phòng... --' : '-- Chọn hạng phòng --'}</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.ten_loai} — {fmtMoney(rt.gia_co_ban)}/đêm
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Kênh Đặt Phòng</label>
                <select name="bookingSource" value={form.bookingSource} onChange={handleChange} className={INPUT_CLS}>
                  <option value="WalkIn">Walk-in (Trực Tiếp)</option>
                  <option value="Phone">Điện Thoại</option>
                  <option value="DirectWeb">Website</option>
                  <option value="OTA">OTA (Booking.com)</option>
                  <option value="Corp">Doanh Nghiệp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Số Đêm</label>
                <input value={nights > 0 ? `${nights} đêm` : '—'} readOnly className={`${INPUT_CLS} bg-surface-container-high/50 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">
                  Tổng Tiền (VND)
                  {suggestedTotal > 0 && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, totalAmount: String(suggestedTotal) }))}
                      className="ml-2 text-[10px] text-admin-primary hover:underline cursor-pointer">
                      dùng gợi ý {fmtMoney(suggestedTotal)}
                    </button>
                  )}
                </label>
                <input type="number" name="totalAmount" value={form.totalAmount} onChange={handleChange}
                  placeholder={suggestedTotal > 0 ? String(suggestedTotal) : '0'} min={0} step={100000} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Tiền Đặt Cọc (VND)</label>
                <input type="number" name="depositAmount" value={form.depositAmount} onChange={handleChange} min={0} step={100000} className={INPUT_CLS} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container text-sm font-medium transition-all cursor-pointer">Hủy Bỏ</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-admin-primary text-on-admin-primary font-semibold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
              {saving ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">hail</span>}
              {saving ? 'Đang Tạo...' : 'Tạo Đặt Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Drawer chi tiết đặt phòng ──────────────────────────────────────────────
const BookingDetailDrawer = ({ bookingId, onClose, showToast, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${bookingId}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else {
        showToast(json.message || 'Không thể tải chi tiết.', 'error');
        if (json.isRecordDeleted) { onRefresh(); onClose(); }
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setLoading(false);
    }
  }, [bookingId, onClose, onRefresh, showToast]);

  useEffect(() => { load(); }, [load]);

  // Mở khối check-in thì nạp danh sách phòng còn trống theo đúng hạng phòng
  const openCheckIn = async () => {
    setShowCheckIn(true);
    setLoadingRooms(true);
    try {
      const params = new URLSearchParams();
      if (data?.RoomTypeId) params.set('roomTypeId', data.RoomTypeId);
      params.set('bookingId', bookingId);
      const res = await fetch(`${API_BASE}/phong-trong?${params}`);
      const json = await res.json();
      if (json.success) {
        setRooms(json.data || []);
        if (json.data?.length) setSelectedRoomId(String(json.data[0].RoomId));
        if (!json.data?.length) showToast('Hiện không còn phòng trống thuộc hạng phòng này.', 'warn');
      } else {
        showToast(json.message || 'Không tải được danh sách phòng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tải danh sách phòng.', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  const changeStatus = async (newStatus, roomId) => {
    setChanging(true);
    try {
      const res = await fetch(`${API_BASE}/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomId ? { status: newStatus, roomId } : { status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        setShowCheckIn(false);
        setSelectedRoomId('');
        load();
        onRefresh();
      } else if (json.isRecordDeleted) {
        showToast(json.message, 'error');
        onRefresh();
        onClose();
      } else {
        showToast(json.message || 'Không thể đổi trạng thái.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setChanging(false);
    }
  };

  const sCfg = data ? (STATUS_BADGE[data.Status] || STATUS_BADGE.default) : STATUS_BADGE.default;
  const rCfg = data ? (SOURCE_BADGE[data.BookingSource] || SOURCE_BADGE.default) : SOURCE_BADGE.default;

  const Row = ({ label, value, mono }) => (
    <div className="flex items-start gap-2 py-2 border-b border-outline-variant/10 last:border-0">
      <span className="text-xs text-on-surface-variant w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-on-surface flex-1 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );

  const canCheckIn = data && ['Pending', 'Confirmed'].includes(data.Status);
  const canCheckOut = data && ['CheckedIn', 'InHouse'].includes(data.Status);
  const canCancel = data && !['Cancelled', 'Completed', 'CheckedOut'].includes(data.Status);
  const canRestore = data && ['Cancelled', 'NoShow', 'Completed'].includes(data.Status);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-surface-container-low shadow-2xl flex flex-col border-l border-outline-variant/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-admin-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-admin-primary text-[20px]">receipt_long</span>
            </div>
            <div>
              <h2 className="font-bold text-on-surface text-sm">Chi Tiết Đặt Phòng</h2>
              {data && <p className="text-xs text-admin-primary font-mono font-semibold">{data.ConfirmationCode}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[28px] animate-spin">progress_activity</span>
            <span className="text-sm">Đang tải dữ liệu...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${sCfg.cls}`}>{sCfg.label}</span>
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${rCfg.cls}`}>{rCfg.label}</span>
              {data.RoomNumber && (
                <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-surface-container text-on-surface border-outline-variant/30">
                  <span className="material-symbols-outlined text-[12px] align-middle mr-1">meeting_room</span>
                  Phòng {data.RoomNumber}{data.Floor ? ` (Tầng ${data.Floor})` : ''}
                </span>
              )}
              {data.ConfirmationSentAt && (
                <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-teal-500/10 text-teal-600 border-teal-500/30">
                  <span className="material-symbols-outlined text-[12px] align-middle mr-1">mark_email_read</span>
                  Đã gửi email
                </span>
              )}
            </div>

            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">person</span> Khách Hàng
              </p>
              <Row label="Họ &amp; Tên" value={data.GuestName} />
              <Row label="Số Điện Thoại" value={data.GuestPhone} />
              <Row label="Email" value={data.GuestEmail} />
              <Row label="CCCD / Hộ Chiếu" value={data.NationalId} mono />
            </div>

            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">calendar_month</span> Thông Tin Lưu Trú
              </p>
              <Row label="Mã Đặt Phòng" value={data.ConfirmationCode} mono />
              <Row label="Hạng Phòng" value={data.RoomTypeName} />
              <Row label="Số Phòng" value={data.RoomNumber ? `${data.RoomNumber}${data.Floor ? ` (Tầng ${data.Floor})` : ''}` : 'Chưa gán phòng'} />
              <Row label="Ngày Đến" value={fmtDate(data.CheckInDate)} />
              <Row label="Ngày Trả" value={fmtDate(data.CheckOutDate)} />
              <Row label="Số Đêm" value={`${data.NumberOfNights} đêm`} />
              <Row label="Người Lớn / Trẻ Em" value={`${data.Adults} người lớn, ${data.Children} trẻ em`} />
              {data.CheckInTime && <Row label="Giờ Nhận Phòng" value={String(data.CheckInTime).replace('T', ' ').slice(0, 16)} />}
              {data.CheckOutTime && <Row label="Giờ Trả Phòng" value={String(data.CheckOutTime).replace('T', ' ').slice(0, 16)} />}
            </div>

            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">payments</span> Tài Chính
              </p>
              <Row label="Tổng Tiền" value={fmtMoney(data.TotalAmount)} />
              <Row label="Tiền Cọc" value={fmtMoney(data.DepositAmount)} />
              <Row label="Còn Lại" value={fmtMoney(Number(data.TotalAmount || 0) - Number(data.DepositAmount || 0))} />
              <Row label="Ngày Đặt" value={fmtDate(data.CreatedAt)} />
            </div>

            {/* Khu vực thao tác nghiệp vụ */}
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span> Thao Tác Nghiệp Vụ
              </p>

              <div className="flex flex-wrap gap-2">
                {data.Status === 'Pending' && (
                  <button onClick={() => changeStatus('Confirmed')} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span> Xác Nhận Đặt Phòng
                  </button>
                )}

                {canCheckIn && !showCheckIn && (
                  <button onClick={openCheckIn} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">login</span> Check-in &amp; Gán Phòng
                  </button>
                )}

                {canCheckOut && (
                  <button onClick={() => changeStatus('Completed')} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">logout</span> Check-out &amp; Trả Phòng
                  </button>
                )}

                {canCancel && (
                  <button onClick={() => changeStatus('Cancelled')} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">cancel</span> Hủy Đặt Phòng
                  </button>
                )}

                {data.Status === 'Confirmed' && (
                  <button onClick={() => changeStatus('NoShow')} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/40 text-rose-500 text-xs font-semibold hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">person_off</span> Khách Không Đến
                  </button>
                )}

                {canRestore && (
                  <button onClick={() => changeStatus('Confirmed')} disabled={changing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60">
                    <span className="material-symbols-outlined text-[15px]">restore</span> Khôi Phục
                  </button>
                )}
              </div>

              {/* Chọn phòng khi check-in */}
              {showCheckIn && canCheckIn && (
                <div className="mt-4 p-3 rounded-lg bg-surface-container-high/60 border border-sky-500/30">
                  <label className="block text-xs font-semibold text-on-surface mb-2">
                    Chọn phòng để gán cho khách <span className="text-rose-400">*</span>
                  </label>
                  {loadingRooms ? (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant py-2">
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Đang tải phòng trống...
                    </div>
                  ) : rooms.length === 0 ? (
                    <p className="text-xs text-amber-600 py-2">
                      Hạng phòng này hiện không còn phòng trống. Vui lòng dọn phòng hoặc chọn hạng phòng khác.
                    </p>
                  ) : (
                    <>
                      <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className={INPUT_CLS}>
                        {rooms.map((r) => (
                          <option key={r.RoomId} value={r.RoomId}>
                            Phòng {r.RoomNumber} — Tầng {r.Floor} ({r.Status})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setShowCheckIn(false)} disabled={changing}
                          className="flex-1 py-2 rounded-lg border border-outline-variant/40 text-on-surface-variant text-xs font-medium hover:bg-surface-container transition-all cursor-pointer">
                          Hủy
                        </button>
                        <button onClick={() => changeStatus('CheckedIn', Number(selectedRoomId))} disabled={changing || !selectedRoomId}
                          className="flex-1 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">login</span>
                          Xác Nhận Check-in
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Không thể tải dữ liệu.</div>
        )}
      </div>
    </div>
  );
};

// ─── Trang chính ────────────────────────────────────────────────────────────
export default function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [tabCounts, setTabCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('all');
  const [roomTypes, setRoomTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [detailBookingId, setDetailBookingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [limit, setLimit] = useState(20);
  const debounceRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      if (filterDate) params.set('date', filterDate);
      if (filterSource !== 'all') params.set('source', filterSource);
      if (filterRoomType !== 'all') params.set('roomType', filterRoomType);
      if (activeTab !== 'all') params.set('status', activeTab);
      params.set('page', page);
      params.set('limit', limit);

      const res = await fetch(`${API_BASE}?${params}`);
      const json = await res.json();
      if (json.success) {
        setBookings(json.data || []);
        setPagination(json.pagination || { page: 1, totalPages: 1, total: 0 });
        setTabCounts(json.tabCounts || {});
        setSelectedIds([]);
      } else {
        setError(json.message || 'Không tìm thấy đặt phòng phù hợp.');
        setBookings([]);
      }
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra backend.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterDate, filterSource, filterRoomType, activeTab, limit]);

  // Nạp danh sách hạng phòng cho bộ lọc
  useEffect(() => {
    fetch(`${API_ROOM_TYPES}?trang_thai=active&limit=200`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRoomTypes(d.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setCurrentPage(1); fetchBookings(1); }, 380);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, filterDate, filterSource, filterRoomType, activeTab, limit]);

  useEffect(() => { fetchBookings(currentPage); }, [currentPage]);

  const handleBatchConfirm = async () => {
    if (!selectedIds.length) { showToast('Vui lòng chọn ít nhất một đặt phòng.', 'warn'); return; }
    setBatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/batch-confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }),
      });
      const j = await res.json();
      showToast(j.message, j.success ? 'success' : 'error');
      if (j.success) { setSelectedIds([]); fetchBookings(currentPage); }
    } catch { showToast('Lỗi kết nối.', 'error'); }
    finally { setBatchLoading(false); }
  };

  const handleBatchEmail = async () => {
    if (!selectedIds.length) { showToast('Vui lòng chọn ít nhất một đặt phòng.', 'warn'); return; }
    setBatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/batch-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }),
      });
      const j = await res.json();
      showToast(j.message, j.success ? 'success' : 'error');
      if (j.success) setSelectedIds([]);
    } catch { showToast('Lỗi kết nối.', 'error'); }
    finally { setBatchLoading(false); }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const toggleSelectAll = () => {
    if (selectedIds.length === bookings.length) setSelectedIds([]);
    else setSelectedIds(bookings.map((b) => b.BookingId));
  };
  const clearFilters = () => {
    setSearchQuery(''); setFilterDate(''); setFilterSource('all'); setFilterRoomType('all'); setActiveTab('all'); setCurrentPage(1);
  };
  const hasFilters = searchQuery || filterDate || filterSource !== 'all' || filterRoomType !== 'all' || activeTab !== 'all';

  const todayStr = todayLocal();

  return (
    <AdminLayout>
      <Toast toasts={toasts} />

      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onCreated={() => { setShowWalkIn(false); setCurrentPage(1); fetchBookings(1); }}
          showToast={showToast}
        />
      )}

      {detailBookingId && (
        <BookingDetailDrawer
          bookingId={detailBookingId}
          onClose={() => setDetailBookingId(null)}
          showToast={showToast}
          onRefresh={() => fetchBookings(currentPage)}
        />
      )}

      <div className="min-h-screen bg-surface flex flex-col">
        {/* Tiêu đề */}
        <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-5 flex-shrink-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-[24px]">receipt_long</span>
                Danh Sách Đặt Phòng Toàn Hệ Thống
              </h1>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Master Booking Roster — Tìm kiếm, xem chi tiết, lọc theo ngày &amp; trạng thái, check-in/check-out
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.length > 0 && (
                <>
                  <button onClick={handleBatchConfirm} disabled={batchLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 shadow-md">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Xác Nhận ({selectedIds.length})
                  </button>
                  <button onClick={handleBatchEmail} disabled={batchLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 shadow-md">
                    <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                    Gửi Email ({selectedIds.length})
                  </button>
                </>
              )}
              <button onClick={() => setShowWalkIn(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-admin-primary text-on-admin-primary text-sm font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-admin-primary/20">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Tạo Đặt Phòng Mới
              </button>
              <button onClick={() => fetchBookings(currentPage)} title="Làm Mới" aria-label="Làm mới"
                className="w-9 h-9 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
                <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab trạng thái */}
        <div className="border-b border-outline-variant/20 bg-surface-container-low flex-shrink-0">
          <div className="flex overflow-x-auto px-6">
            {STATUS_TABS.map((tab) => {
              const count = tabCounts[tab.countKey] ?? 0;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer flex-shrink-0
                    ${isActive ? `${tab.color} border-current` : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                  <span className="min-w-[22px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1.5 bg-surface-container text-on-surface-variant">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-3 flex-shrink-0">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">search</span>
              <input type="text" placeholder="Tìm theo mã, tên, CCCD, SĐT, email, số phòng..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container border border-outline-variant/40 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-admin-primary/50 focus:border-admin-primary transition-all" />
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">calendar_today</span>
              <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 py-2 text-sm bg-surface-container border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-admin-primary/50 transition-all cursor-pointer" />
            </div>

            <select value={filterRoomType} onChange={(e) => { setFilterRoomType(e.target.value); setCurrentPage(1); }}
              className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-admin-primary/50 transition-all cursor-pointer max-w-[200px]">
              <option value="all">Tất Cả Hạng Phòng</option>
              {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.ten_loai}</option>)}
            </select>

            <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
              className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-admin-primary/50 transition-all cursor-pointer">
              <option value="all">Tất Cả Kênh</option>
              <option value="WalkIn">Walk-in</option>
              <option value="DirectWeb">Website</option>
              <option value="OTA">OTA</option>
              <option value="Corp">Doanh Nghiệp</option>
              <option value="Phone">Điện Thoại</option>
            </select>

            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/40 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-admin-primary/50 transition-all cursor-pointer">
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-sm font-medium hover:bg-rose-500/20 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[15px]">filter_alt_off</span> Xóa Bộ Lọc
              </button>
            )}

            <span className="ml-auto text-xs text-on-surface-variant">
              {loading ? 'Đang tải...' : `Hiển thị ${bookings.length} / ${pagination.total || 0} kết quả`}
            </span>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && !bookings.length ? (
            <div className="flex-1 flex items-center justify-center gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
              <span>Đang tải danh sách đặt phòng...</span>
            </div>
          ) : error && !bookings.length ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-rose-400 opacity-60">search_off</span>
              <p className="text-sm">{error}</p>
              {hasFilters && <button onClick={clearFilters} className="text-sm text-admin-primary hover:underline cursor-pointer">Xóa bộ lọc và thử lại</button>}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse min-w-[960px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-container-low border-b border-outline-variant/20">
                    <th className="w-10 px-3 py-3">
                      <input type="checkbox" aria-label="Chọn tất cả"
                        checked={bookings.length > 0 && selectedIds.length === bookings.length}
                        onChange={toggleSelectAll} className="w-4 h-4 accent-admin-primary cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mã Đặt Phòng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Khách Hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Phòng / Hạng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ngày Đến</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ngày Trả</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tổng Tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kênh</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Trạng Thái</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-on-surface-variant uppercase tracking-wider w-16">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-[40px] block mb-2 opacity-40">inbox</span>
                        Không tìm thấy đặt phòng phù hợp.
                      </td>
                    </tr>
                  ) : bookings.map((b, idx) => {
                    const isSel = selectedIds.includes(b.BookingId);
                    const sCfg = STATUS_BADGE[b.Status] || STATUS_BADGE.default;
                    const rCfg = SOURCE_BADGE[b.BookingSource] || SOURCE_BADGE.default;
                    const ci = String(b.CheckInDate || '').slice(0, 10);
                    const co = String(b.CheckOutDate || '').slice(0, 10);
                    const isDueIn = ci === todayStr && !['Cancelled', 'NoShow', 'Completed', 'CheckedIn', 'InHouse'].includes(b.Status);
                    const isDueOut = co === todayStr && ['CheckedIn', 'InHouse'].includes(b.Status);
                    return (
                      <tr key={b.BookingId} className={`border-b border-outline-variant/10 transition-colors
                        ${isSel ? 'bg-admin-primary/5' : idx % 2 === 0 ? 'bg-surface' : 'bg-surface-container/30'} hover:bg-admin-primary/10`}>
                        <td className="px-3 py-3 text-center">
                          <input type="checkbox" aria-label={`Chọn ${b.ConfirmationCode}`} checked={isSel} onChange={() => toggleSelect(b.BookingId)} className="w-4 h-4 accent-admin-primary cursor-pointer" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-bold text-admin-primary">{b.ConfirmationCode || `#${b.BookingId}`}</div>
                          <div className="text-[10px] text-on-surface-variant">{fmtDate(b.CreatedAt)}</div>
                          {isDueIn && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 text-[10px] font-bold border border-violet-500/30">
                              <span className="material-symbols-outlined text-[10px]">login</span> Đến hôm nay
                            </span>
                          )}
                          {isDueOut && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 text-[10px] font-bold border border-orange-500/30">
                              <span className="material-symbols-outlined text-[10px]">logout</span> Trả hôm nay
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm text-on-surface truncate max-w-[160px]">{b.GuestName}</div>
                          <div className="text-xs text-on-surface-variant">
                            {b.GuestPhone !== '---' ? b.GuestPhone : b.GuestEmail !== '---' ? b.GuestEmail : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {b.RoomNumber
                            ? <span className="flex items-center gap-1 text-sm font-semibold text-on-surface">
                                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">meeting_room</span>{b.RoomNumber}
                              </span>
                            : <span className="text-xs text-on-surface-variant italic">Chưa gán</span>}
                          <div className="text-xs text-on-surface-variant truncate max-w-[130px]">{b.RoomTypeName}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">{fmtDate(b.CheckInDate)}</td>
                        <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">{fmtDate(b.CheckOutDate)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-on-surface whitespace-nowrap">{fmtMoney(b.TotalAmount)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${rCfg.cls}`}>{rCfg.label}</span></td>
                        <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${sCfg.cls}`}>{sCfg.label}</span></td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setDetailBookingId(b.BookingId)} title="Xem chi tiết" aria-label="Xem chi tiết"
                            className="w-8 h-8 rounded-lg hover:bg-admin-primary/10 flex items-center justify-center text-on-surface-variant hover:text-admin-primary transition-all cursor-pointer mx-auto">
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-outline-variant/20 bg-surface-container-lowest px-6 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-on-surface-variant">
              Trang {pagination.page} / {pagination.totalPages} — Tổng {pagination.total} đặt phòng
            </span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} aria-label="Trang trước"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                let pg;
                if (pagination.totalPages <= 7) pg = i + 1;
                else if (currentPage <= 4) pg = i + 1;
                else if (currentPage >= pagination.totalPages - 3) pg = pagination.totalPages - 6 + i;
                else pg = currentPage - 3 + i;
                return (
                  <button key={pg} onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer
                      ${pg === currentPage ? 'bg-admin-primary text-on-admin-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container'}`}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} aria-label="Trang sau"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
