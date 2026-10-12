`import React, { useState, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import AdminLayout from '../components/admin/layout/AdminLayout';

// =============================================================================
// API SERVICE LAYER — Thay thế các hàm này bằng fetch() khi kết nối database
// =============================================================================
const RosterAPI = {
  fetchRoster: async (weekId) => {
    console.log('[API] fetchRoster week=', weekId);
    return null;
  },
  createShift: async (payload) => {
    console.log('[API] createShift', payload);
    return { success: true, id: Date.now() };
  },
  recordAttendance: async (shiftId, payload) => {
    console.log('[API] recordAttendance', shiftId, payload);
    return { success: true };
  },
  approveSwap: async (swapId, payload) => {
    console.log('[API] approveSwap', swapId, payload);
    return { success: true };
  },
  rejectSwap: async (swapId) => {
    console.log('[API] rejectSwap', swapId);
    return { success: true };
  }
};

// =============================================================================
// CONFIG — Nguồn sự thật duy nhất cho metadata loại ca
// =============================================================================
const SHIFT_META = {
  morning:     { title: 'CA SÁNG',      icon: 'wb_sunny',    start: '07:00', end: '15:30', colorClass: 'bg-[#E8F8F0] border-[#BDEBD3] text-[#0E6245]' },
  afternoon:   { title: 'CA CHIỀU',     icon: 'nights_stay', start: '15:00', end: '23:30', colorClass: 'bg-[#EBF3FF] border-[#C5DCFF] text-[#1D4ED8]' },
  night:       { title: 'CA ĐÊM',       icon: 'bedtime',     start: '23:00', end: '07:30', colorClass: 'bg-[#1C262B] border-[#2D3A40] text-[#4ADE80]' },
  night_audit: { title: 'CA ĐÊM (NA)',  icon: 'bedtime',     start: '23:00', end: '07:30', colorClass: 'bg-[#1C262B] border-[#2D3A40] text-[#4ADE80]' },
  off:         { title: 'NGHỈ (OFF)',   icon: 'hotel',       start: '',      end: '',      colorClass: 'bg-[#F4F4F5] border-[#E4E4E7] text-[#71717A]' },
};

const SHIFT_DISPLAY = {
  morning:     'CA SÁNG',
  afternoon:   'CA CHIỀU',
  night:       'CA ĐÊM',
  night_audit: 'CA ĐÊM (NA)',
  off:         'NGHỈ (OFF)',
};

const NIGHT_TYPES = new Set(['night', 'night_audit']);

const DAYS_CONFIG = [
  { key: 'mon', label: 'THỨ HAI',  date: '20/10' },
  { key: 'tue', label: 'THỨ BA',   date: '21/10' },
  { key: 'wed', label: 'THỨ TƯ',   date: '22/10' },
  { key: 'thu', label: 'THỨ NĂM',  date: '23/10' },
  { key: 'fri', label: 'THỨ SÁU',  date: '24/10' },
  { key: 'sat', label: 'THỨ BẢY',  date: '25/10', isPeak: true },
];

const INITIAL_STAFF = [
  {
    id: 'EMP-104', name: 'Lê Minh Anh',   role: 'Trưởng Bộ Phận Lễ Tân',   dept: 'FO',
    badge: 'FOM', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    avatarBg: 'bg-emerald-500', initials: 'MA',
    shifts: {
      mon: { type: 'morning',   attendance: 'ON_TIME',  checkIn: '06:55', checkOut: '15:32', location: 'Quầy Lễ Tân A' },
      tue: { type: 'morning',   attendance: 'ON_TIME',  checkIn: '06:58', checkOut: '15:30', location: 'Quầy Lễ Tân A' },
      wed: { type: 'morning',   attendance: 'ON_TIME',  checkIn: '06:52', checkOut: '15:35', location: 'Quầy Lễ Tân A' },
      thu: { type: 'afternoon', attendance: 'PENDING',  location: 'Quầy Tiền Sảnh Executive' },
      fri: { type: 'morning',   attendance: 'PENDING',  location: 'Quầy Lễ Tân A' },
      sat: { type: 'off',       attendance: 'OFF' },
    }
  },
  {
    id: 'EMP-218', name: 'Marcus Aurelius', role: 'Trưởng Ca Tiền Sảnh', dept: 'FO',
    badge: 'SUP', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    avatarBg: 'bg-blue-500', initials: 'MA',
    shifts: {
      mon: { type: 'afternoon', attendance: 'ON_TIME', checkIn: '14:55', checkOut: '23:35', location: 'Quầy Check-in VIP' },
      tue: { type: 'afternoon', attendance: 'ON_TIME', checkIn: '14:52', checkOut: '23:31', location: 'Quầy Check-in VIP' },
      wed: { type: 'afternoon', attendance: 'LATE',    checkIn: '15:15', location: 'Quầy Check-in VIP', lateNote: 'Trễ 15 phút' },
      thu: { type: 'morning',   attendance: 'PENDING', location: 'Quầy Tiền Sảnh' },
      fri: { type: 'afternoon', attendance: 'PENDING', location: 'Quầy Check-in VIP' },
      sat: { type: 'morning',   attendance: 'PENDING', location: 'Quầy Tiền Sảnh' },
    }
  },
  {
    id: 'EMP-401', name: 'Jean-Luc Phan', role: 'Bếp Trưởng Điều Hành', dept: 'FB',
    badge: 'EXEC-CHEF', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    avatarBg: 'bg-amber-600', initials: 'JP',
    shifts: {
      mon: { type: 'morning',   attendance: 'ON_TIME', location: 'Bếp Nóng Trung Tâm' },
      tue: { type: 'morning',   attendance: 'ON_TIME', location: 'Bếp Nóng Trung Tâm' },
      wed: { type: 'afternoon', attendance: 'ON_TIME', location: 'Bếp Banquet & Buffet' },
      thu: { type: 'afternoon', attendance: 'PENDING', location: 'Bếp Banquet & Buffet' },
      fri: { type: 'afternoon', attendance: 'PENDING', location: 'Bếp Banquet & Buffet' },
      sat: { type: 'night',     attendance: 'PENDING', location: 'Chuẩn Bị Gala Cuối Tuần' },
    }
  },
  {
    id: 'EMP-332', name: 'Teresa Vance', role: 'Trưởng Ca Buồng Phòng HK', dept: 'HK',
    badge: 'HK-LEAD', badgeColor: 'bg-slate-200 text-slate-700 border-slate-300',
    avatarBg: 'bg-slate-500', initials: 'TV',
    shifts: {
      mon: { type: 'morning',   attendance: 'ON_TIME', location: 'Phân Khu Villa Ocean' },
      tue: { type: 'morning',   attendance: 'ON_TIME', location: 'Tower A Tầng 5-10' },
      wed: { type: 'off',       attendance: 'OFF' },
      thu: { type: 'morning',   attendance: 'PENDING', location: 'Kho Vải Linen Trung Tâm' },
      fri: { type: 'afternoon', attendance: 'PENDING', location: 'Penthouse & Royal Suites' },
      sat: { type: 'afternoon', attendance: 'PENDING', location: 'Phân Khu Villa Ocean' },
    }
  },
  {
    id: 'EMP-504', name: 'Daniel Miller', role: 'Kỹ Sư Trưởng Trực Ca', dept: 'ENG',
    badge: 'ENG-CHIEF', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    avatarBg: 'bg-rose-500', initials: 'DM',
    shifts: {
      mon: { type: 'morning',   attendance: 'ON_TIME', location: 'Trạm Chiller Trung Tâm' },
      tue: { type: 'morning',   attendance: 'ON_TIME', location: 'Hệ Thống Boiler Năng Lượng' },
      wed: { type: 'morning',   attendance: 'ON_TIME', location: 'Phòng Điều Khiển BMS' },
      thu: { type: 'off',       attendance: 'OFF' },
      fri: { type: 'afternoon', attendance: 'PENDING', location: 'Kỹ Thuật Vận Hành' },
      sat: { type: 'night',     attendance: 'PENDING', location: 'Toàn Khu Khẩn Cấp' },
    }
  },
  {
    id: 'EMP-488', name: 'Phạm Hồng Vân', role: 'Chuyên Viên Kiểm Toán Đêm', dept: 'FO',
    badge: 'AUDITOR', badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
    avatarBg: 'bg-slate-800', initials: 'HV',
    shifts: {
      mon: { type: 'night_audit', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
      tue: { type: 'night_audit', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
      wed: { type: 'night_audit', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
      thu: { type: 'night_audit', attendance: 'PENDING', location: 'Phòng Kiểm Toán PMS' },
      fri: { type: 'night_audit', attendance: 'PENDING', location: 'Phòng Kiểm Toán PMS' },
      sat: { type: 'off',         attendance: 'OFF' },
    }
  },
];

const INITIAL_SWAPS = [
  {
    id: 'SW-001',
    requesterId: 'EMP-104', requesterName: 'Lê Minh Anh',
    targetId:    'EMP-218', targetName:    'Marcus Aurelius',
    dayKey: 'wed', dayLabel: 'Thứ Tư (22/10)',
    fromType: 'morning', toType: 'afternoon',
    reason: 'Đón đoàn khách VIP quốc tế buổi chiều',
    status: 'PENDING',
  },
  {
    id: 'SW-002',
    requesterId: 'EMP-401', requesterName: 'Jean-Luc Phan',
    targetId:    'EMP-401', targetName:    'Nguyễn Văn Tuấn (Bếp)',
    dayKey: 'fri', dayLabel: 'Thứ Sáu (24/10)',
    fromType: 'morning', toType: 'afternoon',
    reason: 'Phụ trách bếp tiệc Gala Dinner',
    status: 'PENDING',
  },
  {
    id: 'SW-003',
    requesterId: 'EMP-332', requesterName: 'Teresa Vance',
    targetId:    'EMP-332', targetName:    'Nguyễn Thị Lan (HK)',
    dayKey: 'sat', dayLabel: 'Thứ Bảy (25/10)',
    fromType: 'afternoon', toType: 'morning',
    reason: 'Yêu cầu cá nhân — đám cưới gia đình',
    status: 'PENDING',
  },
];

// =============================================================================
// CONFLICT DETECTION ENGINE
// =============================================================================
function detectConflict(staffRoster, staffId, dayKey, newShiftType) {
  const staff = staffRoster.find(s => s.id === staffId);
  if (!staff) return null;

  const existing = staff.shifts[dayKey];

  // Rule 1: Trùng ca cùng ngày (Double Booking)
  if (existing && existing.type !== 'off' && newShiftType !== 'off') {
    const existMeta = SHIFT_META[existing.type] || SHIFT_META.morning;
    return {
      level: 'CRITICAL',
      title: 'XUNG ĐỘT TRÙNG CA CÙNG NGÀY (DOUBLE BOOKING)',
      message: `${staff.name} (#${staff.id}) đã được xếp [${existMeta.title}: ${existMeta.start}–${existMeta.end}] hôm đó. Phân thêm ca mới sẽ gây chồng lấn thời gian làm việc!`,
    };
  }

  // Rule 2: Vi phạm nghỉ ngơi liên ca < 8h
  const dayIndex = DAYS_CONFIG.findIndex(d => d.key === dayKey);
  if (dayIndex > 0 && newShiftType === 'morning') {
    const prevDayKey = DAYS_CONFIG[dayIndex - 1].key;
    const prevShift  = staff.shifts[prevDayKey];
    if (prevShift && NIGHT_TYPES.has(prevShift.type)) {
      return {
        level: 'HIGH',
        title: 'VI PHẠM QUY TẮC NGHỈ NGƠI LIÊN CA (< 8 GIỜ)',
        message: `Hôm trước (${DAYS_CONFIG[dayIndex - 1].label}), ${staff.name} làm ca đêm đến ~07:30. Xếp Ca Sáng ngay hôm sau lúc 07:00 vi phạm quy định nghỉ ngơi tối thiểu 8 giờ!`,
      };
    }
  }

  // Rule 3: Chuyển OFF khi là ca đêm duy nhất trong bộ phận
  if (newShiftType === 'off' && existing && NIGHT_TYPES.has(existing.type)) {
    const hasOtherNight = staffRoster.some(
      s => s.id !== staffId && s.dept === staff.dept && s.shifts[dayKey] && NIGHT_TYPES.has(s.shifts[dayKey].type)
    );
    if (!hasOtherNight) {
      return {
        level: 'MEDIUM',
        title: 'CẢNH BÁO THIẾU ĐỊNH BIÊN CA ĐÊM TỐI THIỂU',
        message: `Chuyển ${staff.name} sang NGHỈ (OFF) sẽ khiến bộ phận ${staff.dept} KHÔNG còn nhân sự trực Ca Đêm ngày đó!`,
      };
    }
  }

  return null;
}

// =============================================================================
// COMPONENTS PHỤ
// =============================================================================
function Toast({ msg }) {
  if (!msg) return null;
  const isError = msg.type === 'error';
  return (
    <div
      className={`fixed top-20 right-8 z-[100] px-5 py-3.5 rounded-xl shadow-2xl border flex items-start gap-3
        ${isError ? 'bg-rose-950 border-rose-800' : 'bg-[#0F172A] border-slate-700'} text-white`}
      style={{ animation: 'fadeIn 0.3s ease' }}
    >
      <span className={`material-symbols-outlined text-xl shrink-0 ${isError ? 'text-rose-400' : 'text-emerald-400'}`}>
        {isError ? 'error' : 'check_circle'}
      </span>
      <div>
        <div className="font-bold text-xs">{msg.title}</div>
        <div className="text-[11px] text-gray-300 mt-0.5 max-w-xs leading-relaxed">{msg.desc}</div>
      </div>
    </div>
  );
}

function AttendanceBadge({ status }) {
  const MAP = {
    ON_TIME:     'bg-emerald-200/80 text-emerald-900',
    LATE:        'bg-amber-200 text-amber-900',
    CHECKED_OUT: 'bg-blue-200 text-blue-900',
    ABSENT:      'bg-rose-200 text-rose-900',
    PENDING:     'bg-black/5 text-gray-500',
  };
  const LABEL = {
    ON_TIME: '✓ Đúng giờ', LATE: '⚠ Đi trễ', CHECKED_OUT: '✓ Hoàn thành',
    ABSENT: '✗ Vắng', PENDING: 'Chờ ca',
  };
  if (status === 'OFF') return null;
  return (
    <span className={`text-[8.5px] px-1 rounded font-bold uppercase tracking-tight shrink-0 ${MAP[status] || MAP.PENDING}`}>
      {LABEL[status] || 'Chờ ca'}
    </span>
  );
}

function ShiftCard({ staffId, dayKey, shift, onClick }) {
  if (!shift) return null;
  const isOff = shift.type === 'off';
  const meta = SHIFT_META[shift.type] || SHIFT_META.morning;
  const timeStr = (!isOff && shift.startTime && shift.endTime)
    ? `${shift.startTime} – ${shift.endTime}`
    : (!isOff ? `${meta.start} – ${meta.end}` : '');

  return (
    <div
      onClick={() => onClick({ staffId, dayKey, shift })}
      className={`border p-2 rounded-lg flex flex-col justify-between cursor-pointer relative group transition-all duration-150 hover:shadow-md hover:scale-[1.02] ${meta.colorClass}`}
      style={{ minHeight: '62px' }}
      title="Nhấp để xem chi tiết, chấm công hoặc đổi ca"
    >
      {shift.hasConflictOverride && (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm"
          title={`Ghi đè xung đột: ${shift.overrideReason}`}
        >!</span>
      )}
      <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
        <span className="truncate">{SHIFT_DISPLAY[shift.type] || meta.title}</span>
        <span className="material-symbols-outlined text-[13px] opacity-80 shrink-0">{shift.icon || meta.icon}</span>
      </div>
      <div className="flex items-center justify-between mt-0.5 gap-1">
        <span className="text-[9.5px] font-mono font-semibold truncate">
          {isOff ? (shift.offNote || 'Theo lịch tuần') : timeStr}
        </span>
        <AttendanceBadge status={shift.attendance} />
      </div>
      {shift.location && !isOff && (
        <div className="text-[8.5px] opacity-60 truncate leading-tight mt-0.5">{shift.location}</div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const RosterShifts = () => {
  const [selectedDept, setSelectedDept]           = useState('ALL');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [staffRoster, setStaffRoster]             = useState(INITIAL_STAFF);
  const [swapRequests, setSwapRequests]           = useState(INITIAL_SWAPS);
  const [toast, setToast]                         = useState(null);
  const [aiOptimizing, setAiOptimizing]           = useState(false);

  // Modal states
  const [assignModal, setAssignModal] = useState(false);
  const [shiftDetail, setShiftDetail] = useState(null);
  const [swapModal, setSwapModal]     = useState(false);
  const [statsModal, setStatsModal]   = useState(false);

  // Assign form
  const defaultAssignForm = {
    staffId: INITIAL_STAFF[0].id, dayKey: 'mon',
    shiftType: 'morning', startTime: '07:00', endTime: '15:30',
    location: '', offNote: '', overrideConflict: false, overrideReason: '',
  };
  const [assignForm, setAssignForm]       = useState(defaultAssignForm);
  const [conflictAlert, setConflictAlert] = useState(null);

  // Attendance form
  const [attendForm, setAttendForm] = useState({ status: '', timeInput: '', note: '' });

  // --- Helpers ---
  const showToast = useCallback((title, desc, type = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const WEEK_LABELS = {
    '-1': 'Tuần 42 (13/10 – 19/10/2025)',
     '0': 'Tuần 43 (20/10 – 26/10/2025)',
     '1': 'Tuần 44 (27/10 – 02/11/2025)',
  };
  const currentWeekLabel = WEEK_LABELS[String(currentWeekOffset)] || `Tuần ${43 + currentWeekOffset}`;

  const handleWeekChange = (delta) => {
    setCurrentWeekOffset(prev => Math.max(-1, Math.min(1, prev + delta)));
  };

  const departments = [
    { id: 'ALL', label: 'Tất cả bộ phận' },
    { id: 'FO',  label: 'Lễ Tân (FO)' },
    { id: 'FB',  label: 'Ẩm Thực & Bếp (FB)' },
    { id: 'HK',  label: 'Buồng Phòng (HK)' },
    { id: 'ENG', label: 'Kỹ Thuật (ENG)' },
    { id: 'SEC', label: 'An Ninh (SEC)' },
  ];

  const filteredStaff = useMemo(
    () => staffRoster.filter(s => selectedDept === 'ALL' || s.dept === selectedDept),
    [staffRoster, selectedDept]
  );

  // Thống kê tính toán thực từ state
  const stats = useMemo(() => {
    let morning = 0, afternoon = 0, night = 0, off = 0, onTime = 0, late = 0, absent = 0, pending = 0;
    filteredStaff.forEach(s => {
      Object.values(s.shifts).forEach(sh => {
        if (!sh) return;
        const t = sh.type;
        if (t === 'morning') morning++;
        else if (t === 'afternoon') afternoon++;
        else if (NIGHT_TYPES.has(t)) night++;
        else if (t === 'off') off++;
        if (sh.attendance === 'ON_TIME')      onTime++;
        else if (sh.attendance === 'LATE')    late++;
        else if (sh.attendance === 'ABSENT')  absent++;
        else if (sh.attendance === 'PENDING') pending++;
      });
    });
    return { morning, afternoon, night, off, onTime, late, absent, pending };
  }, [filteredStaff]);

  const pendingSwaps = swapRequests.filter(s => s.status === 'PENDING');

  // Cập nhật ca trực tiếp vào state
  const updateShift = useCallback((staffId, dayKey, shiftData) => {
    setStaffRoster(prev => prev.map(s =>
      s.id === staffId
        ? { ...s, shifts: { ...s.shifts, [dayKey]: { ...s.shifts[dayKey], ...shiftData } } }
        : s
    ));
  }, []);

  // --- Action 1: Phân ca mới ---
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    const { staffId, dayKey, shiftType, startTime, endTime, location, offNote, overrideConflict, overrideReason } = assignForm;

    const conflict = detectConflict(staffRoster, staffId, dayKey, shiftType);
    if (conflict && !overrideConflict) {
      setConflictAlert(conflict);
      return;
    }

    const meta = SHIFT_META[shiftType] || SHIFT_META.morning;
    const newShift = {
      type: shiftType, icon: meta.icon,
      startTime: shiftType !== 'off' ? startTime : '',
      endTime:   shiftType !== 'off' ? endTime   : '',
      location:  shiftType !== 'off' ? location  : '',
      offNote:   shiftType === 'off' ? offNote   : '',
      attendance: shiftType === 'off' ? 'OFF' : 'PENDING',
      hasConflictOverride: !!conflict,
      overrideReason: overrideReason || '',
    };

    updateShift(staffId, dayKey, newShift);
    RosterAPI.createShift({ staffId, weekLabel: currentWeekLabel, dayKey, ...newShift });

    const targetStaff = staffRoster.find(s => s.id === staffId);
    const dayLabel    = DAYS_CONFIG.find(d => d.key === dayKey)?.label || dayKey;
    showToast('Phân Ca Thành Công!', `Đã xếp ${meta.title} cho ${targetStaff?.name} vào ${dayLabel}. Bảng điều độ đã cập nhật.`);
    setAssignModal(false);
    setConflictAlert(null);
    setAssignForm(defaultAssignForm);
  };

  // --- Action 2: Ghi nhận chấm công ---
  const handleRecordAttendance = () => {
    if (!shiftDetail) return;
    const { staffId, dayKey } = shiftDetail;
    const { status, timeInput, note } = attendForm;
    if (!status) { showToast('Thiếu thông tin', 'Vui lòng chọn trạng thái chấm công.', 'error'); return; }

    const update = { attendance: status, note };
    if (status === 'ON_TIME' || status === 'LATE') update.checkIn  = timeInput || '--:--';
    if (status === 'CHECKED_OUT')                  update.checkOut = timeInput || '--:--';

    updateShift(staffId, dayKey, update);
    RosterAPI.recordAttendance(`${staffId}_${dayKey}`, update);

    const s = staffRoster.find(x => x.id === staffId);
    showToast('Chấm Công Ghi Nhận', `Đã cập nhật [${status}] cho ${s?.name}.`);
    setShiftDetail(null);
    setAttendForm({ status: '', timeInput: '', note: '' });
  };

  // --- Action 3: Đổi nhanh loại ca ---
  const handleQuickShiftChange = (newType) => {
    if (!shiftDetail) return;
    const { staffId, dayKey } = shiftDetail;
    const conflict = detectConflict(staffRoster, staffId, dayKey, newType);
    if (conflict && conflict.level === 'CRITICAL') {
      showToast(conflict.title, conflict.message, 'error');
      return;
    }
    const meta = SHIFT_META[newType] || SHIFT_META.morning;
    updateShift(staffId, dayKey, {
      type: newType, icon: meta.icon,
      startTime: meta.start, endTime: meta.end,
      attendance: newType === 'off' ? 'OFF' : 'PENDING',
      hasConflictOverride: !!conflict,
      overrideReason: conflict ? 'Ghi đè thủ công' : '',
    });
    const s = staffRoster.find(x => x.id === staffId);
    showToast('Đổi Ca Thành Công', `Đã chuyển sang ${meta.title} cho ${s?.name}.`);
    setShiftDetail(null);
  };

  // --- Action 4: Phê duyệt / từ chối đổi ca ---
  const handleApproveSwap = (swap) => {
    setStaffRoster(prev => prev.map(s => {
      if (s.id === swap.requesterId) {
        const meta = SHIFT_META[swap.toType] || SHIFT_META.morning;
        return { ...s, shifts: { ...s.shifts, [swap.dayKey]: { ...s.shifts[swap.dayKey], type: swap.toType, icon: meta.icon, attendance: 'PENDING' } } };
      }
      if (s.id !== swap.requesterId && s.id === swap.targetId) {
        const meta = SHIFT_META[swap.fromType] || SHIFT_META.morning;
        return { ...s, shifts: { ...s.shifts, [swap.dayKey]: { ...s.shifts[swap.dayKey], type: swap.fromType, icon: meta.icon, attendance: 'PENDING' } } };
      }
      return s;
    }));
    setSwapRequests(prev => prev.map(sw => sw.id === swap.id ? { ...sw, status: 'APPROVED' } : sw));
    RosterAPI.approveSwap(swap.id, { managerId: 'ADMIN' });
    showToast('Đã Phê Duyệt Đổi Ca', `Đã hoán đổi ca thành công cho ${swap.requesterName} & ${swap.targetName}. Bảng điều độ cập nhật!`);
  };

  const handleRejectSwap = (swap) => {
    setSwapRequests(prev => prev.map(sw => sw.id === swap.id ? { ...sw, status: 'REJECTED' } : sw));
    RosterAPI.rejectSwap(swap.id);
    showToast('Đã Từ Chối Đổi Ca', `Yêu cầu của ${swap.requesterName} đã bị từ chối.`, 'error');
  };

  // --- Action 5: AI tối ưu ca ---
  const handleAiOptimize = () => {
    setAiOptimizing(true);
    setTimeout(() => {
      setAiOptimizing(false);
      showToast('AI Cân Bằng Ca Hoàn Tất', 'Đã phân bổ lại toàn bộ ca trực, khắc phục 0 xung đột, tối ưu 100% quân số!');
    }, 1400);
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 max-w-[1580px] w-full mx-auto px-4 lg:px-6 pt-2 pb-14 font-sans antialiased text-[#1A202C]">

        <Toast msg={toast} />

        {/* ── A. HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pt-1">
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="bg-[#0D6246] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                MÃ LỆNH // 55
              </span>
              <span className="text-[11px] font-bold text-[#0D6246] uppercase tracking-wider">
                NHÂN SỰ &amp; ĐIỀU ĐỘ CA TRỰC RESORT • PHÚ QUỐC LUXURY ECO-GRID
              </span>
            </div>
            <h1 className="font-serif text-2xl lg:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
              Bảng Điều Độ Lịch Trực Ca &amp; Phân Bổ Nhân Sự Toàn Khu
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Lập lịch ca (Sáng / Chiều / Đêm) cho Lễ Tân, Bếp, Buồng Phòng; ghi nhận chấm công thời gian thực;
              kiểm tra xung đột tự động; duyệt đổi ca và cập nhật bảng ngay lập tức.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
            <button
              onClick={() => showToast('Xuất File', 'Đang kết xuất báo cáo bảng công PDF/Excel...')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-gray-500">download</span>
              Xuất Excel / PDF
            </button>
            <button
              onClick={() => setStatsModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-indigo-500">bar_chart</span>
              Thống kê ca
            </button>
            <button
              onClick={handleAiOptimize}
              disabled={aiOptimizing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E0F2FE] border border-[#BAE6FD] hover:bg-[#BAE6FD] text-[#0369A1] text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[16px]${aiOptimizing ? ' animate-spin' : ''}`}>auto_awesome</span>
              {aiOptimizing ? 'AI Đang Xếp Ca...' : 'AI Tối Ưu Ca'}
            </button>
            <button
              onClick={() => { setConflictAlert(null); setAssignForm(defaultAssignForm); setAssignModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#065F46] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              + Phân ca mới
            </button>
          </div>
        </div>

        {/* ── B. KPI CARDS (tính từ state thực) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Ca Sáng Tuần Này',  value: stats.morning,   color: 'text-[#0D6246]', bg: 'bg-emerald-50', icon: 'wb_sunny' },
            { label: 'Ca Chiều Tuần Này', value: stats.afternoon, color: 'text-blue-700',  bg: 'bg-blue-50',   icon: 'nights_stay' },
            { label: 'Ca Đêm Tuần Này',   value: stats.night,     color: 'text-slate-800', bg: 'bg-slate-100', icon: 'bedtime' },
            { label: 'Đúng Giờ / Trễ / Vắng', value: `${stats.onTime}/${stats.late}/${stats.absent}`, color: 'text-slate-800', bg: 'bg-gray-50', icon: 'how_to_reg' },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.bg} p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                <span>{kpi.label}</span>
                <span className={`material-symbols-outlined text-base ${kpi.color}`}>{kpi.icon}</span>
              </div>
              <div className={`text-2xl font-bold tracking-tight mt-1 ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* ── C. FILTER BAR ── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleWeekChange(-1)} disabled={currentWeekOffset <= -1}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-all">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-slate-800 min-w-[240px] justify-center">
              <span className="material-symbols-outlined text-[15px] text-emerald-700">calendar_month</span>
              <span>{currentWeekLabel}</span>
            </div>
            <button onClick={() => handleWeekChange(1)} disabled={currentWeekOffset >= 1}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-all">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            <button onClick={() => setCurrentWeekOffset(0)}
              className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors ml-1">
              Tuần này
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            {departments.map(dept => (
              <button key={dept.id} onClick={() => setSelectedDept(dept.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedDept === dept.id
                    ? 'border-[#0D6246] bg-[#E8F8F0] text-[#0D6246]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {dept.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── D. ROSTER TABLE ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-gray-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left w-[230px] uppercase tracking-wider text-slate-600">
                    NHÂN SỰ / BỘ PHẬN
                  </th>
                  {DAYS_CONFIG.map(day => (
                    <th key={day.key} className={`py-3 px-2 text-center w-[155px] ${day.isPeak ? 'bg-[#E8F8F0]/70 text-[#0D6246] border-l border-emerald-100' : ''}`}>
                      <div>{day.label}</div>
                      <div className={`text-[10px] font-mono ${day.isPeak ? 'text-[#0D6246] font-bold' : 'text-gray-400'}`}>
                        {day.date}{day.isPeak ? ' ★' : ''}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center text-[10px] uppercase text-gray-500 w-[70px]">Tổng ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map(staff => {
                  const totalWorked = Object.values(staff.shifts).filter(sh => sh && sh.type !== 'off').length;
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${staff.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                            {staff.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 truncate">{staff.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${staff.badgeColor}`}>{staff.badge}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                              {staff.role} · <span className="font-mono text-gray-400">#{staff.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {DAYS_CONFIG.map(day => (
                        <td key={day.key} className={`py-2 px-2 ${day.isPeak ? 'bg-[#F0FDF4]/30 border-l border-emerald-50' : ''}`}>
                          <ShiftCard staffId={staff.id} dayKey={day.key} shift={staff.shifts[day.key]} onClick={setShiftDetail} />
                        </td>
                      ))}
                      <td className="py-2 px-3 text-center">
                        <span className="text-xs font-bold text-slate-700">{totalWorked}</span>
                        <div className="text-[9px] text-gray-400">/ {DAYS_CONFIG.length}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer bảng */}
          <div className="bg-[#F8FAFC] border-t border-gray-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-600 gap-2">
            <div className="font-mono flex flex-wrap gap-x-4 gap-y-1">
              <span><strong className="text-slate-800">HIỂN THỊ:</strong> {filteredStaff.length}/{staffRoster.length} nhân viên</span>
              <span>SÁNG: <strong className="text-[#0D6246]">{stats.morning}</strong></span>
              <span>CHIỀU: <strong className="text-blue-700">{stats.afternoon}</strong></span>
              <span>ĐÊM: <strong className="text-slate-900">{stats.night}</strong></span>
              <span>NGHỈ: <strong className="text-gray-500">{stats.off}</strong></span>
              <span>CHỜ CA: <strong className="text-amber-600">{stats.pending}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#0D6246] font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              ĐỒNG BỘ THỜI GIAN THỰC
            </div>
          </div>
        </div>

        {/* ── E. BOTTOM PANELS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Heatmap */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                TẢI TRỌNG NHÂN LỰC 24H — PEAK HEATMAP
              </h3>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {[['#E2E8F0','Thấp'],['#86EFAC','Chuẩn'],['#FDE047','Cao điểm'],['#F87171','Đỉnh']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">Phân bổ mật độ nhân viên theo 24h để ngăn thắt cổ chai dịch vụ</p>
            <div className="flex flex-col gap-2 mb-5">
              {[
                { color: 'bg-[#E8F8F0] border-[#BDEBD3] text-[#0D6246]', icon: 'luggage',    label: 'CHECK-IN & XE ĐÓN SÂN BAY (14:00 – 16:30)', count: '28 NHÂN VIÊN HUY ĐỘNG' },
                { color: 'bg-[#EBF3FF] border-[#C5DCFF] text-[#1D4ED8]', icon: 'restaurant', label: 'ĂN TỐI & GALA DINNER (18:30 – 21:00)',            count: '34 NHÂN VIÊN F&B + BẾP' },
              ].map(p => (
                <div key={p.label} className={`p-3 ${p.color} border rounded-lg flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                    <span>{p.label}</span>
                  </div>
                  <span className="bg-white border text-[10px] font-bold font-mono px-2.5 py-1 rounded shrink-0">{p.count}</span>
                </div>
              ))}
            </div>
            <div className="h-7 w-full flex gap-0.5 rounded overflow-hidden">
              {['#E2E8F0','#E2E8F0','#E2E8F0','#BBF7D0','#86EFAC','#86EFAC','#FDE047','#86EFAC',
                '#F87171','#F87171','#FDE047','#86EFAC','#F87171','#F87171','#FDE047','#BBF7D0','#E2E8F0','#E2E8F0']
                .map((c, i) => <div key={i} className="flex-1 rounded-sm" style={{ background: c }} />)}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1.5 px-1">
              {['00:00','04:00','08:00','12:00','16:00','20:00','23:59'].map(t => <span key={t}>{t}</span>)}
            </div>
          </div>

          {/* Dispatch */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0D6246] uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-[16px]">cell_tower</span>
                KÊNH ĐIỀU PHỐI &amp; DUYỆT ĐỔI CA
              </div>
              <h3 className="text-sm font-bold text-slate-900">Tác Vụ Điều Phối Trực Tiếp</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Đẩy thông báo lịch ca, duyệt yêu cầu hoán đổi và phát hành bảng công tuần.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {pendingSwaps.length} Yêu Cầu Đổi Ca Chờ Duyệt
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {pendingSwaps.slice(0, 3).map(s => s.requesterName.split(' ').pop()).join(' • ')}
                  </div>
                </div>
              </div>
              <button onClick={() => setSwapModal(true)}
                className="px-3 py-1.5 bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs rounded-lg shadow-sm transition-all">
                Xem &amp; Duyệt
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => showToast('Phát Hành Thành Công', `Lịch ${currentWeekLabel} đã gửi qua App & Zalo ZNS!`)}
                className="w-full py-2.5 bg-[#0D6246] hover:bg-[#0A4D37] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Phát Hành Lịch Ca Đến Nhân Viên (App &amp; Zalo)
              </button>
              <NavLink to="/admin/audit-logs"
                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-gray-500">history</span>
                Nhật Ký Thay Đổi &amp; Audit Trail
              </NavLink>
            </div>
          </div>
        </div>


        {/* ================================================================ */}
        {/* MODAL 1 — PHÂN CA LÀM VIỆC MỚI                                 */}
        {/* ================================================================ */}
        {assignModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Phân Ca Làm Việc Mới</h3>
                    <p className="text-[11px] text-gray-500">Cập nhật trực tiếp lên bảng, kiểm tra xung đột tự động</p>
                  </div>
                </div>
                <button onClick={() => { setAssignModal(false); setConflictAlert(null); }} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Cảnh báo xung đột */}
              {conflictAlert && (
                <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-rose-600 text-xl mt-0.5">warning</span>
                    <div className="flex-1">
                      <div className="font-bold text-xs uppercase tracking-wide text-rose-800">
                        [{conflictAlert.level}] {conflictAlert.title}
                      </div>
                      <p className="text-xs text-rose-900 mt-1 leading-relaxed font-medium">{conflictAlert.message}</p>
                      <div className="mt-3 pt-3 border-t border-rose-200">
                        <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer">
                          <input type="checkbox" checked={assignForm.overrideConflict}
                            onChange={(e) => setAssignForm(p => ({ ...p, overrideConflict: e.target.checked }))}
                            className="rounded border-rose-300" />
                          Ghi đè ngoại lệ (cần nhập lý do bên dưới)
                        </label>
                        {assignForm.overrideConflict && (
                          <input type="text" placeholder="Lý do nghiệp vụ phê duyệt ghi đè ca..."
                            value={assignForm.overrideReason}
                            onChange={(e) => setAssignForm(p => ({ ...p, overrideReason: e.target.value }))}
                            className="w-full mt-2 p-2 bg-white border border-rose-300 rounded text-xs outline-none focus:border-rose-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4 text-xs">
                {/* Nhân viên */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nhân Viên Cần Phân Ca:</label>
                  <select value={assignForm.staffId}
                    onChange={(e) => { setAssignForm(p => ({ ...p, staffId: e.target.value })); setConflictAlert(null); }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium focus:border-emerald-600 focus:bg-white">
                    {staffRoster.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.badge} — {s.dept} · #{s.id})</option>
                    ))}
                  </select>
                </div>

                {/* Ngày + Loại ca */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Ngày Trong Tuần:</label>
                    <select value={assignForm.dayKey}
                      onChange={(e) => { setAssignForm(p => ({ ...p, dayKey: e.target.value })); setConflictAlert(null); }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium focus:border-emerald-600 focus:bg-white">
                      {DAYS_CONFIG.map(d => <option key={d.key} value={d.key}>{d.label} ({d.date})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Khung Ca Làm Việc:</label>
                    <select value={assignForm.shiftType}
                      onChange={(e) => {
                        const v = e.target.value;
                        const m = SHIFT_META[v] || SHIFT_META.morning;
                        setAssignForm(p => ({ ...p, shiftType: v, startTime: m.start, endTime: m.end }));
                        setConflictAlert(null);
                      }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-bold text-emerald-800 focus:border-emerald-600 focus:bg-white">
                      <option value="morning">CA SÁNG (07:00 – 15:30)</option>
                      <option value="afternoon">CA CHIỀU (15:00 – 23:30)</option>
                      <option value="night">CA ĐÊM (23:00 – 07:30)</option>
                      <option value="off">NGHỈ (OFF)</option>
                    </select>
                  </div>
                </div>

                {/* Giờ tùy chỉnh */}
                {assignForm.shiftType !== 'off' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Giờ Vào Ca:</label>
                      <input type="time" value={assignForm.startTime}
                        onChange={(e) => setAssignForm(p => ({ ...p, startTime: e.target.value }))}
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none font-mono focus:border-emerald-600" />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Giờ Tan Ca:</label>
                      <input type="time" value={assignForm.endTime}
                        onChange={(e) => setAssignForm(p => ({ ...p, endTime: e.target.value }))}
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none font-mono focus:border-emerald-600" />
                    </div>
                  </div>
                )}

                {/* Vị trí */}
                {assignForm.shiftType !== 'off' && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Vị Trí Phân Bổ (Chốt Trực):</label>
                    <input type="text" value={assignForm.location}
                      onChange={(e) => setAssignForm(p => ({ ...p, location: e.target.value }))}
                      placeholder="VD: Quầy Lễ Tân Sảnh A, Bếp Banquet, Villa Ocean..."
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-emerald-600 focus:bg-white" />
                  </div>
                )}

                {/* Ghi chú nghỉ */}
                {assignForm.shiftType === 'off' && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Ghi Chú Ngày Nghỉ:</label>
                    <input type="text" value={assignForm.offNote}
                      onChange={(e) => setAssignForm(p => ({ ...p, offNote: e.target.value }))}
                      placeholder="VD: Nghỉ phép năm, Nghỉ bù ca đêm..."
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-emerald-600 focus:bg-white" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <button type="button" onClick={() => { setAssignModal(false); setConflictAlert(null); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg">Hủy</button>
                  <button type="submit"
                    className="px-5 py-2 bg-[#064E3B] hover:bg-[#065F46] text-white font-bold rounded-lg shadow-sm">
                    Lưu &amp; Cập Nhật Bảng
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* ================================================================ */}
        {/* MODAL 2 — CHI TIẾT CA & CHẤM CÔNG                              */}
        {/* ================================================================ */}
        {shiftDetail && (() => {
          const staff = staffRoster.find(s => s.id === shiftDetail.staffId);
          const shift = staff?.shifts[shiftDetail.dayKey];
          if (!staff || !shift) return null;
          const dayLabel = DAYS_CONFIG.find(d => d.key === shiftDetail.dayKey)?.label || shiftDetail.dayKey;
          const meta = SHIFT_META[shift.type] || SHIFT_META.morning;
          const isOff = shift.type === 'off';
          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">
                      CHI TIẾT CA TÁC NGHIỆP · {dayLabel}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{staff.name}</h3>
                    <div className="text-[10px] text-gray-500">{staff.role} · #{staff.id}</div>
                  </div>
                  <button onClick={() => { setShiftDetail(null); setAttendForm({ status: '', timeInput: '', note: '' }); }}
                    className="text-gray-400 hover:text-gray-700">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Thông tin ca */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 text-xs mb-4 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loại ca:</span>
                    <span className="font-bold text-slate-800">{SHIFT_DISPLAY[shift.type] || meta.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Thời gian:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {!isOff ? `${shift.startTime || meta.start} – ${shift.endTime || meta.end}` : 'Nghỉ ca'}
                    </span>
                  </div>
                  {shift.location && !isOff && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vị trí trực:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[200px]">{shift.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                    <span className="text-gray-500">Trạng thái chấm công:</span>
                    <span className="font-bold text-emerald-700">{shift.attendance}</span>
                  </div>
                  {shift.checkIn  && <div className="flex justify-between text-[10.5px] text-gray-500"><span>Check-in:</span><span className="font-mono">{shift.checkIn}</span></div>}
                  {shift.checkOut && <div className="flex justify-between text-[10.5px] text-gray-500"><span>Check-out:</span><span className="font-mono">{shift.checkOut}</span></div>}
                  {shift.lateNote && <div className="text-[10.5px] text-amber-700 font-semibold">⚠ {shift.lateNote}</div>}
                </div>

                {/* Ghi nhận chấm công */}
                {!isOff && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Ghi Nhận Chấm Công:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold mb-3">
                      {[
                        { status: 'ON_TIME',     label: 'Check-in Đúng Giờ',    icon: 'how_to_reg', color: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' },
                        { status: 'LATE',        label: 'Check-in Đi Trễ',      icon: 'alarm_on',   color: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' },
                        { status: 'CHECKED_OUT', label: 'Check-out Hoàn Thành', icon: 'task_alt',   color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100' },
                        { status: 'ABSENT',      label: 'Báo Vắng / Đột Xuất',  icon: 'person_off', color: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100' },
                      ].map(btn => (
                        <button key={btn.status} onClick={() => setAttendForm(p => ({ ...p, status: btn.status }))}
                          className={`p-2.5 border rounded-lg flex items-center justify-center gap-1.5 transition-all ${btn.color} ${attendForm.status === btn.status ? 'ring-2 ring-offset-1 ring-current font-extrabold' : ''}`}>
                          <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Giờ thực tế */}
                    {(attendForm.status === 'ON_TIME' || attendForm.status === 'LATE' || attendForm.status === 'CHECKED_OUT') && (
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">
                            {attendForm.status === 'CHECKED_OUT' ? 'Giờ Check-out thực tế:' : 'Giờ Check-in thực tế:'}
                          </label>
                          <input type="time" value={attendForm.timeInput}
                            onChange={(e) => setAttendForm(p => ({ ...p, timeInput: e.target.value }))}
                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none font-mono text-xs focus:border-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Ghi chú:</label>
                          <input type="text" value={attendForm.note}
                            onChange={(e) => setAttendForm(p => ({ ...p, note: e.target.value }))}
                            placeholder="Tùy chọn..."
                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none text-xs focus:border-emerald-600" />
                        </div>
                      </div>
                    )}

                    <button onClick={handleRecordAttendance} disabled={!attendForm.status}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">save</span>
                      Xác Nhận Chấm Công
                    </button>
                  </div>
                )}

                {/* Chuyển sang ca khác */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Chuyển Sang Khung Ca Khác:
                  </label>
                  <div className="flex gap-1.5 text-xs">
                    {[
                      { type: 'morning',   label: 'CA SÁNG',  color: 'bg-emerald-100/60 hover:bg-emerald-100 text-emerald-800' },
                      { type: 'afternoon', label: 'CA CHIỀU', color: 'bg-blue-100/60 hover:bg-blue-100 text-blue-800' },
                      { type: 'night',     label: 'CA ĐÊM',   color: 'bg-slate-800 hover:bg-slate-900 text-emerald-400' },
                      { type: 'off',       label: 'NGHỈ',     color: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
                    ].map(btn => (
                      <button key={btn.type} onClick={() => handleQuickShiftChange(btn.type)}
                        className={`flex-1 py-1.5 rounded font-semibold text-[11px] transition-all ${btn.color}`}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-gray-200">
                  <button onClick={() => { setShiftDetail(null); setAttendForm({ status: '', timeInput: '', note: '' }); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg">
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          );
        })()}


        {/* ================================================================ */}
        {/* MODAL 3 — DUYỆT YÊU CẦU ĐỔI CA                                */}
        {/* ================================================================ */}
        {swapModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">swap_horiz</span>
                  Duyệt Yêu Cầu Hoán Đổi Ca Làm Việc
                </h3>
                <button onClick={() => setSwapModal(false)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 mb-5 max-h-[360px] overflow-y-auto pr-1">
                {swapRequests.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-6">Không có yêu cầu đổi ca nào.</div>
                )}
                {swapRequests.map(sw => (
                  <div key={sw.id} className={`p-3.5 rounded-xl border text-xs ${
                    sw.status === 'PENDING'  ? 'bg-slate-50 border-gray-200' :
                    sw.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-rose-50 border-rose-200 opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-slate-800">{sw.requesterName} ⇄ {sw.targetName}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {sw.dayLabel}: {SHIFT_DISPLAY[sw.fromType]} ⇄ {SHIFT_DISPLAY[sw.toType]}
                        </div>
                        <div className="text-[10.5px] text-gray-600 mt-1 italic">Lý do: {sw.reason}</div>
                      </div>
                      <div className="shrink-0">
                        {sw.status === 'PENDING' ? (
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => handleApproveSwap(sw)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-xs">
                              ✓ Duyệt
                            </button>
                            <button onClick={() => handleRejectSwap(sw)}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-all text-xs">
                              ✗ Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${sw.status === 'APPROVED' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                            {sw.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500">{pendingSwaps.length} yêu cầu chờ xử lý</span>
                <button onClick={() => setSwapModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ================================================================ */}
        {/* MODAL 4 — THỐNG KÊ CHI TIẾT                                     */}
        {/* ================================================================ */}
        {statsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">bar_chart</span>
                  Thống Kê Ca — {currentWeekLabel}
                </h3>
                <button onClick={() => setStatsModal(false)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Ca theo loại */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                {[
                  { label: 'Ca Sáng',  value: stats.morning,   color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'wb_sunny' },
                  { label: 'Ca Chiều', value: stats.afternoon, color: 'text-blue-700',    bg: 'bg-blue-50',    icon: 'nights_stay' },
                  { label: 'Ca Đêm',   value: stats.night,     color: 'text-slate-800',   bg: 'bg-slate-100',  icon: 'bedtime' },
                  { label: 'Nghỉ OFF', value: stats.off,       color: 'text-gray-600',    bg: 'bg-gray-100',   icon: 'hotel' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} p-3 rounded-xl flex items-center gap-3`}>
                    <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
                    <div>
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-gray-500">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chấm công */}
              <div className="border-t border-gray-200 pt-3 mb-4">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Chấm Công Tuần Này</div>
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  {[
                    { label: 'Đúng giờ', value: stats.onTime,  color: 'text-emerald-700 bg-emerald-50' },
                    { label: 'Đi trễ',   value: stats.late,    color: 'text-amber-700 bg-amber-50' },
                    { label: 'Vắng',     value: stats.absent,  color: 'text-rose-700 bg-rose-50' },
                    { label: 'Chờ ca',   value: stats.pending, color: 'text-gray-700 bg-gray-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} p-2 rounded-lg`}>
                      <div className="text-lg font-bold">{s.value}</div>
                      <div className="text-[9px] font-semibold">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theo bộ phận */}
              <div className="border-t border-gray-200 pt-3">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Theo Bộ Phận</div>
                {['FO','FB','HK','ENG','SEC'].map(dept => {
                  const dStaff = staffRoster.filter(s => s.dept === dept);
                  let dm = 0, da = 0, dn = 0;
                  dStaff.forEach(s => Object.values(s.shifts).forEach(sh => {
                    if (sh?.type === 'morning') dm++;
                    else if (sh?.type === 'afternoon') da++;
                    else if (sh && NIGHT_TYPES.has(sh.type)) dn++;
                  }));
                  return (
                    <div key={dept} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-xs">
                      <span className="font-bold text-slate-700 w-12">{dept}</span>
                      <span className="text-gray-500">{dStaff.length} NV</span>
                      <span className="text-emerald-700">☀ {dm}</span>
                      <span className="text-blue-700">🌙 {da}</span>
                      <span className="text-slate-800">★ {dn}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => setStatsModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default RosterShifts;
