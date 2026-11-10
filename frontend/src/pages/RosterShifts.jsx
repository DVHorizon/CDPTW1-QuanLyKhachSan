import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AdminLayout from '../components/admin/layout/AdminLayout';

const RosterShifts = () => {
  // --- STATE BỘ LỌC & TUẦN ---
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [currentWeek, setCurrentWeek] = useState('Tuần 43 (20/10/2025 - 26/10/2025)');
  const [toastMessage, setToastMessage] = useState(null);
  const [aiOptimizing, setAiOptimizing] = useState(false);

  // --- STATE MODAL ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // --- STATE FORM PHÂN CA MỚI ---
  const [assignForm, setAssignForm] = useState({
    staffId: 'EMP-104',
    dayKey: 'mon',
    shiftType: 'morning',
    startTime: '07:00',
    endTime: '15:30',
    location: 'Quầy Lễ Tân Sảnh A',
    overrideConflict: false,
    overrideReason: ''
  });
  const [conflictAlert, setConflictAlert] = useState(null);

  const showToast = (title, desc, type = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // --- DANH SÁCH BỘ PHẬN ---
  const departments = [
    { id: 'ALL', label: 'Tất cả bộ phận (148)' },
    { id: 'FO', label: 'Lễ Tân & Tiền Sảnh (26)' },
    { id: 'FB', label: 'Ẩm Thực & Bếp (38)' },
    { id: 'HK', label: 'Buồng Phòng HK (42)' },
    { id: 'ENG', label: 'Kỹ Thuật Bảo Trì (18)' },
    { id: 'SEC', label: 'An Ninh & Xe Đón (24)' },
  ];

  const DAYS_CONFIG = [
    { key: 'mon', label: 'THỨ HAI', date: '20/10' },
    { key: 'tue', label: 'THỨ BA', date: '21/10' },
    { key: 'wed', label: 'THỨ TƯ', date: '22/10' },
    { key: 'thu', label: 'THỨ NĂM', date: '23/10' },
    { key: 'fri', label: 'THỨ SÁU', date: '24/10' },
    { key: 'sat', label: 'THỨ BẢY', date: '25/10 (ĐỈNH)', isPeak: true },
  ];

  // --- STATE DỮ LIỆU NHÂN SỰ & LỊCH TRỰC (TƯƠNG TÁC THAY ĐỔI ĐƯỢC) ---
  const [staffRoster, setStaffRoster] = useState([
    // 1. LỄ TÂN (FRONT OFFICE)
    {
      id: 'EMP-104',
      name: 'Lê Minh Anh',
      role: 'Trưởng Bộ Phận Lễ Tân',
      dept: 'FO',
      badge: 'FOM',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      avatarBg: 'bg-emerald-500 text-white',
      initials: 'MA',
      shifts: {
        mon: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'ON_TIME', checkIn: '06:55', checkOut: '15:32', location: 'Quầy Lễ Tân A' },
        tue: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'ON_TIME', checkIn: '06:58', checkOut: '15:30', location: 'Quầy Lễ Tân A' },
        wed: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'ON_TIME', checkIn: '06:52', checkOut: '15:35', location: 'Quầy Lễ Tân A' },
        thu: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '15:00 - 23:30', attendance: 'PENDING', location: 'Quầy Tiền Sảnh Executive' },
        fri: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'PENDING', location: 'Quầy Lễ Tân A' },
        sat: { type: 'off', title: 'NGHỈ (OFF)', sub: 'Hưởng phép tuần', attendance: 'OFF' },
      }
    },
    {
      id: 'EMP-218',
      name: 'Marcus Aurelius',
      role: 'Trưởng Ca Tiền Sảnh',
      dept: 'FO',
      badge: 'SUP',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      avatarBg: 'bg-blue-500 text-white',
      initials: 'MA',
      shifts: {
        mon: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '15:00 - 23:30', attendance: 'ON_TIME', checkIn: '14:55', checkOut: '23:35', location: 'Quầy Check-in VIP' },
        tue: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '15:00 - 23:30', attendance: 'ON_TIME', checkIn: '14:52', checkOut: '23:31', location: 'Quầy Check-in VIP' },
        wed: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '15:00 - 23:30', attendance: 'LATE', checkIn: '15:15 (Trễ 15p)', location: 'Quầy Check-in VIP' },
        thu: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'PENDING', location: 'Quầy Tiền Sảnh' },
        fri: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '15:00 - 23:30', attendance: 'PENDING', location: 'Quầy Check-in VIP' },
        sat: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '07:00 - 15:30', attendance: 'PENDING', location: 'Quầy Tiền Sảnh' },
      }
    },
    // 2. ẨM THỰC & BẾP (F&B / KITCHEN)
    {
      id: 'EMP-401',
      name: 'Jean-Luc Phan',
      role: 'Bếp Trưởng Điều Hành',
      dept: 'FB',
      badge: 'EXEC-CHEF',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      avatarBg: 'bg-amber-600 text-white',
      initials: 'JP',
      shifts: {
        mon: { type: 'morning', title: 'CA SÁNG (BẾP)', icon: 'restaurant', time: '06:00 - 14:30', attendance: 'ON_TIME', location: 'Bếp Nóng Trung Tâm' },
        tue: { type: 'morning', title: 'CA SÁNG (BẾP)', icon: 'restaurant', time: '06:00 - 14:30', attendance: 'ON_TIME', location: 'Bếp Nóng Trung Tâm' },
        wed: { type: 'afternoon', title: 'CA CHIỀU (GALA)', icon: 'dinner_dining', time: '14:00 - 22:30', attendance: 'ON_TIME', location: 'Bếp Banquet & Buffet' },
        thu: { type: 'afternoon', title: 'CA CHIỀU (GALA)', icon: 'dinner_dining', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Bếp Banquet & Buffet' },
        fri: { type: 'afternoon', title: 'CA CHIỀU (GALA)', icon: 'dinner_dining', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Bếp Banquet & Buffet' },
        sat: { type: 'night', title: 'CA ĐÊM (SETUP)', icon: 'outdoor_grill', time: '22:00 - 06:30', attendance: 'PENDING', location: 'Chuẩn Bị Gala Cuối Tuần' },
      }
    },
    // 3. BUỒNG PHÒNG (HOUSEKEEPING)
    {
      id: 'EMP-332',
      name: 'Teresa Vance',
      role: 'Trưởng Ca Buồng Phòng HK',
      dept: 'HK',
      badge: 'HK-LEAD',
      badgeColor: 'bg-slate-200 text-slate-700 border-slate-300',
      avatarBg: 'bg-slate-500 text-white',
      initials: 'TV',
      shifts: {
        mon: { type: 'morning_hk', title: 'SÁNG (CÁNH A)', icon: 'hotel', time: '07:30 - 16:00', attendance: 'ON_TIME', location: 'Phân Khu Villa Ocean' },
        tue: { type: 'morning_hk', title: 'SÁNG (CÁNH B)', icon: 'hotel', time: '07:30 - 16:00', attendance: 'ON_TIME', location: 'Tower A Tầng 5-10' },
        wed: { type: 'off', title: 'NGHỈ (OFF)', sub: 'Xoay ca tuần', attendance: 'OFF' },
        thu: { type: 'morning_hk', title: 'SÁNG (TỔNG KHO)', icon: 'inventory_2', time: '07:30 - 16:00', attendance: 'PENDING', location: 'Kho Vải Linen Trung Tâm' },
        fri: { type: 'vip_hk', title: 'CHIỀU (VIP FLOORS)', icon: 'star', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Penthouse & Royal Suites' },
        sat: { type: 'afternoon_hk', title: 'CHIỀU (CÁNH A)', icon: 'hotel', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Phân Khu Villa Ocean' },
      }
    },
    // 4. KỸ THUẬT (ENGINEERING)
    {
      id: 'EMP-504',
      name: 'Daniel Miller',
      role: 'Kỹ Sư Trưởng Trực Ca',
      dept: 'ENG',
      badge: 'ENG-CHIEF',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      avatarBg: 'bg-rose-500 text-white',
      initials: 'DM',
      shifts: {
        mon: { type: 'tech', title: 'ĐIỆN LẠNH HVAC', icon: 'ac_unit', time: '08:00 - 16:30', attendance: 'ON_TIME', location: 'Trạm Chiller Trung Tâm' },
        tue: { type: 'tech', title: 'NƯỚC NÓNG TT', icon: 'water_drop', time: '08:00 - 16:30', attendance: 'ON_TIME', location: 'Hệ Thống Boiler Năng Lượng' },
        wed: { type: 'tech', title: 'KỸ THUẬT BMS', icon: 'settings_input_component', time: '08:00 - 16:30', attendance: 'ON_TIME', location: 'Phòng Điều Khiển BMS' },
        thu: { type: 'off', title: 'NGHỈ (OFF)', sub: 'Bảo dưỡng định kỳ', attendance: 'OFF' },
        fri: { type: 'tech_blue', title: 'CHIỀU KỸ THUẬT', icon: 'build', time: '15:00 - 23:30', attendance: 'PENDING', location: 'Kỹ Thuật Vận Hành' },
        sat: { type: 'emergency_dark', title: 'TRỰC SỰ CỐ 24/7', icon: 'emergency', time: 'ON-CALL KHẨN CẤP', attendance: 'PENDING', location: 'Toàn Khu Khẩn Cấp' },
      }
    },
    // 5. AN NINH & XE ĐÓN (FLEET & SECURITY)
    {
      id: 'EMP-612',
      name: 'Đỗ Văn Sơn',
      role: 'Đội Trưởng Tài Xế Xe VIP',
      dept: 'SEC',
      badge: 'FLEET-VIP',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      avatarBg: 'bg-sky-500 text-white',
      initials: 'DS',
      shifts: {
        mon: { type: 'car_blue', title: 'MAYBACH PQC-01', icon: 'directions_car', time: 'Sân bay PQC VIP', attendance: 'ON_TIME', location: 'Sân Bay Quốc Tế Phú Quốc' },
        tue: { type: 'car_blue', title: 'PENTHOUSE SHUTTLE', icon: 'airport_shuttle', time: '13:00 - 21:30', attendance: 'ON_TIME', location: 'Tuyến Sảnh - Bến Du Thuyền' },
        wed: { type: 'car_mint', title: 'MAYBACH PQC-02', icon: 'directions_car', time: '08:00 - 16:30', attendance: 'ON_TIME', location: 'Đón Khách Tổng Thống' },
        thu: { type: 'car_blue', title: 'PENTHOUSE CONVOY', icon: 'star', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Hộ Tống Đoàn VIP' },
        fri: { type: 'off', title: 'NGHỈ (OFF)', sub: 'Đổi ca lái xe', attendance: 'OFF' },
        sat: { type: 'flight_peak', title: 'VIP FLIGHT PEAK', icon: 'flight_takeoff', time: '11:00 - 19:30', attendance: 'PENDING', location: 'Đón Các Chuyến Bay Vàng' },
      }
    },
    // 6. KIỂM TOÁN ĐÊM (NIGHT AUDIT)
    {
      id: 'EMP-488',
      name: 'Phạm Hồng Vân',
      role: 'Chuyên Viên Kiểm Toán Đêm',
      dept: 'FO',
      badge: 'AUDITOR',
      badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
      avatarBg: 'bg-slate-800 text-white',
      initials: 'HV',
      shifts: {
        mon: { type: 'night_audit', title: 'CA ĐÊM (NA)', icon: 'bedtime', time: '23:00 - 07:30', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
        tue: { type: 'night_audit', title: 'CA ĐÊM (NA)', icon: 'bedtime', time: '23:00 - 07:30', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
        wed: { type: 'night_audit', title: 'CA ĐÊM (NA)', icon: 'bedtime', time: '23:00 - 07:30', attendance: 'ON_TIME', location: 'Phòng Kiểm Toán PMS' },
        thu: { type: 'night_audit', title: 'CA ĐÊM (NA)', icon: 'bedtime', time: '23:00 - 07:30', attendance: 'PENDING', location: 'Phòng Kiểm Toán PMS' },
        fri: { type: 'night_audit', title: 'CA ĐÊM (NA)', icon: 'bedtime', time: '23:00 - 07:30', attendance: 'PENDING', location: 'Phòng Kiểm Toán PMS' },
        sat: { type: 'off', title: 'NGHỈ (OFF)', sub: 'Nghỉ phục hồi ca', attendance: 'OFF' },
      }
    }
  ]);

  // --- THUẬT TOÁN KIỂM TRA XUNG ĐỘT TRÙNG CA (CONFLICT DETECTION ENGINE) ---
  const checkShiftConflict = (staffId, dayKey, newShiftType) => {
    const staff = staffRoster.find(s => s.id === staffId);
    if (!staff) return null;

    const existingShift = staff.shifts[dayKey];
    
    // 1. Kiểm tra Trùng ca đã có trong cùng ngày (Double Booking)
    if (existingShift && existingShift.type !== 'off' && newShiftType !== 'off') {
      return {
        level: 'CRITICAL',
        title: 'XUNG ĐỘT TRÙNG CA CÙNG NGÀY (DOUBLE BOOKING)',
        message: `Nhân viên ${staff.name} (#${staff.id}) hiện đã được xếp [${existingShift.title}: ${existingShift.time}]. Phân công thêm ca mới sẽ dẫn tới tình trạng chồng lấn thời gian làm việc!`
      };
    }

    // 2. Kiểm tra Vi phạm thời gian nghỉ ngơi (< 8 tiếng) giữa 2 ngày liên tiếp
    const dayIndex = DAYS_CONFIG.findIndex(d => d.key === dayKey);
    if (dayIndex > 0) {
      const prevDayKey = DAYS_CONFIG[dayIndex - 1].key;
      const prevShift = staff.shifts[prevDayKey];
      
      // Nếu hôm trước làm ca Đêm (tan 07:30) mà hôm nay xếp Ca Sáng (vào 07:00)
      if (prevShift && (prevShift.type === 'night_audit' || prevShift.type === 'night') && newShiftType === 'morning') {
        return {
          level: 'HIGH',
          title: 'VI PHẠM QUY TẮC NGHỈ NGƠI LIÊN CA (<8 GIỜ NGHỈ)',
          message: `Nhôm trước ${DAYS_CONFIG[dayIndex - 1].label}, nhân viên ${staff.name} làm ${prevShift.title} đến 07:30 sáng. Xếp Ca Sáng hôm nay lúc 07:00 sẽ vi phạm luật lao động về thời gian hồi phục sức khỏe!`
        };
      }
    }

    // 3. Kiểm tra thiếu định biên ca đêm cho bộ phận
    if (newShiftType === 'off' && existingShift && (existingShift.type === 'night_audit' || existingShift.type === 'night')) {
      const otherNightStaff = staffRoster.filter(s => s.dept === staff.dept && s.id !== staff.id && s.shifts[dayKey]?.type?.includes('night'));
      if (otherNightStaff.length === 0) {
        return {
          level: 'MEDIUM',
          title: 'CẢNH BÁO THIẾU ĐỊNH BIÊN CA ĐÊM TỐI THIỂU',
          message: `Nếu chuyển ${staff.name} sang NGHỈ (OFF), bộ phận ${staff.dept} sẽ KHÔNG còn nhân sự nào trực Ca Đêm trong ngày này!`
        };
      }
    }

    return null;
  };

  // --- XỬ LÝ PHÂN CÔNG CA LÀM VIỆC MỚI (DYNAMIC UPDATE) ---
  const handleAssignShiftSubmit = (e) => {
    e.preventDefault();
    const { staffId, dayKey, shiftType, startTime, endTime, location, overrideConflict, overrideReason } = assignForm;

    // Kiểm tra xung đột
    const conflict = checkShiftConflict(staffId, dayKey, shiftType);
    if (conflict && !overrideConflict) {
      setConflictAlert(conflict);
      return;
    }

    // Tạo thông tin ca mới
    let shiftData = {
      type: shiftType,
      title: shiftType === 'morning' ? 'CA SÁNG' : shiftType === 'afternoon' ? 'CA CHIỀU' : shiftType === 'night' ? 'CA ĐÊM' : 'NGHỈ (OFF)',
      icon: shiftType === 'morning' ? 'wb_sunny' : shiftType === 'afternoon' ? 'nights_stay' : shiftType === 'night' ? 'bedtime' : 'hotel',
      time: shiftType === 'off' ? '' : `${startTime} - ${endTime}`,
      sub: shiftType === 'off' ? 'Nghỉ phép theo yêu cầu' : '',
      location: location || 'Khu vực tác nghiệp',
      attendance: shiftType === 'off' ? 'OFF' : 'PENDING',
      hasConflictOverride: !!conflict,
      overrideReason: overrideReason || ''
    };

    // CẬP NHẬT TRỰC TIẾP VÀO BẢNG HIỂN THỊ
    setStaffRoster(prev => prev.map(staff => {
      if (staff.id === staffId) {
        return {
          ...staff,
          shifts: {
            ...staff.shifts,
            [dayKey]: shiftData
          }
        };
      }
      return staff;
    }));

    setIsAssignModalOpen(false);
    setConflictAlert(null);
    setAssignForm({
      staffId: 'EMP-104',
      dayKey: 'mon',
      shiftType: 'morning',
      startTime: '07:00',
      endTime: '15:30',
      location: 'Quầy Lễ Tân Sảnh A',
      overrideConflict: false,
      overrideReason: ''
    });

    const targetStaff = staffRoster.find(s => s.id === staffId);
    showToast(
      'Phân Ca Thành Công!',
      `Đã cập nhật ca ${shiftData.title} cho ${targetStaff?.name} vào ${DAYS_CONFIG.find(d => d.key === dayKey)?.label}. Bảng điều độ đã cập nhật tức thì!`
    );
  };

  // --- XỬ LÝ CHẤM CÔNG NHANH (CHECK-IN / CHECK-OUT) ---
  const handleRecordAttendance = (status, customTime = '') => {
    if (!selectedShiftForEdit) return;
    const { staffId, dayKey } = selectedShiftForEdit;

    setStaffRoster(prev => prev.map(staff => {
      if (staff.id === staffId) {
        const curShift = staff.shifts[dayKey];
        return {
          ...staff,
          shifts: {
            ...staff.shifts,
            [dayKey]: {
              ...curShift,
              attendance: status,
              checkIn: status === 'ON_TIME' ? (customTime || '06:58 (Đúng giờ)') : status === 'LATE' ? (customTime || '07:20 (Trễ 20p)') : curShift.checkIn,
              checkOut: status === 'CHECKED_OUT' ? (customTime || '15:30 (Hoàn thành ca)') : curShift.checkOut
            }
          }
        };
      }
      return staff;
    }));

    setSelectedShiftForEdit(null);
    showToast('Chấm Công Đã Ghi Nhận', `Đã cập nhật trạng thái chấm công: [${status}] thành công vào hệ thống PMS!`);
  };

  // --- XỬ LÝ ĐỔI CA / XÓA CA TRỰC TIẾP ---
  const handleQuickChangeShiftType = (newType) => {
    if (!selectedShiftForEdit) return;
    const { staffId, dayKey } = selectedShiftForEdit;

    const timeMap = {
      morning: '07:00 - 15:30',
      afternoon: '15:00 - 23:30',
      night_audit: '23:00 - 07:30',
      night: '22:00 - 06:30',
      off: ''
    };

    const titleMap = {
      morning: 'CA SÁNG',
      afternoon: 'CA CHIỀU',
      night_audit: 'CA ĐÊM (NA)',
      night: 'CA ĐÊM',
      off: 'NGHỈ (OFF)'
    };

    setStaffRoster(prev => prev.map(staff => {
      if (staff.id === staffId) {
        return {
          ...staff,
          shifts: {
            ...staff.shifts,
            [dayKey]: {
              type: newType,
              title: titleMap[newType],
              time: timeMap[newType],
              icon: newType === 'morning' ? 'wb_sunny' : newType === 'afternoon' ? 'nights_stay' : newType.includes('night') ? 'bedtime' : 'hotel',
              sub: newType === 'off' ? 'Đổi sang ngày OFF' : '',
              attendance: newType === 'off' ? 'OFF' : 'PENDING'
            }
          }
        };
      }
      return staff;
    }));

    setSelectedShiftForEdit(null);
    showToast('Đổi Ca Thành Công', 'Lịch ca của nhân viên đã được cập nhật trực tiếp trên bảng!');
  };

  // --- RENDER THẺ CA VỚI BADGE CHẤM CÔNG & CẢNH BÁO XUNG ĐỘT ---
  const renderInteractiveShiftCard = (staffId, dayKey, shift) => {
    if (!shift) return null;

    const isOff = shift.type === 'off';
    const hasConflict = shift.hasConflictOverride;

    // Màu sắc theo loại ca
    let cardBg = 'bg-[#F4F4F5] border-[#E4E4E7] text-[#71717A]';
    if (shift.type === 'morning' || shift.type === 'morning_hk' || shift.type === 'car_mint') {
      cardBg = 'bg-[#E8F8F0] border-[#BDEBD3] text-[#0E6245]';
    } else if (shift.type === 'afternoon' || shift.type === 'afternoon_hk' || shift.type === 'car_blue' || shift.type === 'tech_blue' || shift.type === 'flight_peak') {
      cardBg = 'bg-[#EBF3FF] border-[#C5DCFF] text-[#1D4ED8]';
    } else if (shift.type === 'vip_hk') {
      cardBg = 'bg-[#E0F7FA] border-[#B2EBF2] text-[#006064]';
    } else if (shift.type === 'night_audit' || shift.type === 'night') {
      cardBg = 'bg-[#1C262B] border-[#2D3A40] text-[#4ADE80]';
    } else if (shift.type === 'emergency_dark') {
      cardBg = 'bg-[#18181B] border-[#27272A] text-rose-400';
    } else if (shift.type === 'tech') {
      cardBg = 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]';
    }

    return (
      <div
        onClick={() => setSelectedShiftForEdit({ staffId, dayKey, shift })}
        className={`border p-2 rounded-lg flex flex-col justify-between h-[58px] shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer relative group ${cardBg}`}
        title="Nhấp để xem chi tiết ca, chấm công hoặc hoán đổi ca"
      >
        {/* Dấu chấm cảnh báo xung đột nếu có */}
        {hasConflict && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-xs animate-bounce" title={`Ca xung đột được ghi đè: ${shift.overrideReason}`}>
            !
          </span>
        )}

        <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
          <span className="truncate">{shift.title}</span>
          <span className="material-symbols-outlined text-[13px] opacity-80 shrink-0">{shift.icon}</span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9.5px] font-mono font-semibold truncate">
            {isOff ? (shift.sub || 'Theo lịch tuần') : shift.time}
          </span>

          {/* Badge Chấm công thu nhỏ */}
          {!isOff && (
            <span className={`text-[8.5px] px-1 rounded font-bold uppercase tracking-tight shrink-0 ${
              shift.attendance === 'ON_TIME'
                ? 'bg-emerald-200/80 text-emerald-900'
                : shift.attendance === 'LATE'
                ? 'bg-amber-200 text-amber-900 animate-pulse'
                : shift.attendance === 'CHECKED_OUT'
                ? 'bg-blue-200 text-blue-900'
                : 'bg-black/5 text-gray-500'
            }`}>
              {shift.attendance === 'ON_TIME' ? '✓ Đúng giờ' : shift.attendance === 'LATE' ? '⚠ Đi trễ' : shift.attendance === 'CHECKED_OUT' ? '✓ Hoàn thành' : 'Chờ ca'}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Tính toán số liệu thống kê realtime
  const filteredStaff = staffRoster.filter(s => selectedDepartment === 'ALL' || s.dept === selectedDepartment);
  
  let totalMorning = 0;
  let totalAfternoon = 0;
  let totalNight = 0;
  let totalOff = 0;

  filteredStaff.forEach(s => {
    Object.values(s.shifts).forEach(shift => {
      if (shift.type === 'morning' || shift.type === 'morning_hk' || shift.type === 'tech') totalMorning++;
      else if (shift.type === 'afternoon' || shift.type === 'afternoon_hk' || shift.type === 'car_blue' || shift.type === 'tech_blue' || shift.type === 'vip_hk' || shift.type === 'flight_peak') totalAfternoon++;
      else if (shift.type === 'night_audit' || shift.type === 'night' || shift.type === 'emergency_dark') totalNight++;
      else if (shift.type === 'off') totalOff++;
    });
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 max-w-[1580px] w-full mx-auto -mx-space-lg px-space-lg pt-2 pb-12 font-sans antialiased text-[#1A202C]">
        
        {/* TOAST POPUP */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-[#0F172A] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
            <span className={`material-symbols-outlined text-xl ${toastMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {toastMessage.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <div>
              <div className="font-bold text-xs">{toastMessage.title}</div>
              <div className="text-[11px] text-gray-300">{toastMessage.desc}</div>
            </div>
          </div>
        )}

        {/* --- A. COMMAND CODE & PAGE TITLE HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pt-1">
          <div>
            {/* Badge Tag */}
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="bg-[#0D6246] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                MÃ LỆNH // 55
              </span>
              <span className="text-[11px] font-bold text-[#0D6246] uppercase tracking-wider">
                NHÂN SỰ &amp; ĐIỀU ĐỘ CA TRỰC RESORT • PHÚ QUỐC LUXURY ECO-GRID
              </span>
            </div>

            {/* Main Heading */}
            <h2 className="font-serif text-2xl lg:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
              Bảng Điều Độ Lịch Trực Ca &amp; Phân Bổ Nhân Sự Toàn Khu
            </h2>

            {/* Sub-paragraph */}
            <p className="text-xs text-gray-600 mt-1 max-w-4xl leading-relaxed">
              Lập lịch ca làm việc (Ca sáng, Ca chiều, Ca đêm) cho Lễ tân, Bếp, Buồng phòng; Ghi nhận chấm công ca thời gian thực; Kiểm tra xung đột trùng ca và cập nhật bảng phân công trực tiếp.
            </p>
          </div>

          {/* Action Buttons Top Right */}
          <div className="flex items-center gap-2.5 shrink-0 self-start">
            <button 
              onClick={() => showToast('Xuất File', 'Đang kết xuất báo cáo bảng công PDF/Excel chuẩn ISO 27001...')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-gray-500">download</span>
              Xuất bảng công Excel/PDF
            </button>

            <button 
              onClick={() => {
                setAiOptimizing(true);
                setTimeout(() => {
                  setAiOptimizing(false);
                  showToast('AI Cân Bằng Ca Hoàn Tất', 'Đã phân bổ lại 148 ca trực, khắc phục 0 xung đột và tối ưu 100% quân số!');
                }, 1200);
              }}
              disabled={aiOptimizing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#E0F2FE] border border-[#BAE6FD] hover:bg-[#BAE6FD] text-[#0369A1] text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              <span className={`material-symbols-outlined text-[16px] ${aiOptimizing ? 'animate-spin' : ''}`}>
                auto_awesome
              </span>
              {aiOptimizing ? 'AI Đang Xếp Ca...' : 'Tự động xếp ca AI tối ưu'}
            </button>

            {/* NÚT PHÂN CA MỚI (MỞ MODAL CẬP NHẬT TRỰC TIẾP VÀO BẢNG) */}
            <button 
              onClick={() => {
                setConflictAlert(null);
                setIsAssignModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] hover:bg-[#065F46] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              + Phân ca làm việc mới
            </button>
          </div>
        </div>

        {/* --- B. 4 METRIC KPI SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              <span>TỔNG NHÂN SỰ TRỰC CA HÔM NAY</span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">48</span>
              <span className="text-xs font-bold text-gray-500">/ 48 NHÂN VIÊN</span>
            </div>
            <div className="text-[10.5px] font-medium text-[#0D6246] flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Đang hiện diện 100% quân số tại các chốt trực
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              <span>DỰ PHÒNG ON-CALL SẴN SÀNG</span>
              <span className="bg-[#E0F2FE] text-[#0369A1] font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                READY
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-bold text-[#0284C7] tracking-tight">08</span>
              <span className="text-xs font-bold text-gray-500">NHÂN VIÊN SẴN SÀNG</span>
            </div>
            <div className="text-[10.5px] text-gray-500 mt-1">
              Kích hoạt bổ sung tức thì khi công suất phòng &gt; 90%
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              <span>TỔNG GIỜ CÔNG TÍCH LŨY TUẦN</span>
              <span className="bg-gray-100 text-gray-600 font-bold text-[9px] px-1.5 py-0.5 rounded">
                T.43
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">2.140</span>
              <span className="text-xs font-bold text-gray-500">GIỜ LAO ĐỘNG</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 mt-1">
              <span>Kiểm soát Overtime:</span>
              <span className="bg-[#DCFCE7] text-[#166534] font-bold text-[9.5px] px-2 py-0.5 rounded">
                3.2% (Đạt tiêu chuẩn)
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              <span>ĐỊNH BIÊN LAO ĐỘNG 5 SAO</span>
              <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-3xl font-bold text-[#0D6246] tracking-tight">98.6%</span>
              <span className="text-xs font-bold text-[#0D6246]">ĐẠT CHUẨN</span>
            </div>
            <div className="text-[10.5px] text-gray-500 mt-1">
              Đảm bảo tỷ lệ 1.8 nhân viên / phòng nghỉ cao cấp
            </div>
          </div>
        </div>

        {/* --- C. FILTER & DATE SELECTION BAR --- */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs">
          
          {/* Week Switcher */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentWeek('Tuần 42 (13/10/2025 - 19/10/2025)')}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-slate-800">
              <span className="material-symbols-outlined text-[15px] text-emerald-700">calendar_month</span>
              <span>{currentWeek}</span>
            </div>

            <button 
              onClick={() => setCurrentWeek('Tuần 44 (27/10/2025 - 02/11/2025)')}
              className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>

            <button 
              onClick={() => setCurrentWeek('Tuần 43 (20/10/2025 - 26/10/2025)')}
              className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors ml-1"
            >
              Hôm nay
            </button>
          </div>

          {/* Department Filter Tabs (Có Lễ Tân, Bếp, Buồng Phòng) */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0">
            {departments.map((dept) => {
              const isActive = selectedDepartment === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'border border-[#0D6246] bg-[#E8F8F0] text-[#0D6246]'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* --- D. THE ROSTER SCHEDULE MATRIX (TABLE) --- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              
              {/* TABLE HEADER */}
              <thead className="bg-[#F8FAFC] border-b border-gray-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4 text-left w-[240px] uppercase tracking-wider text-slate-600">
                    NHÂN SỰ / BỘ PHẬN
                  </th>
                  {DAYS_CONFIG.map(day => (
                    <th 
                      key={day.key} 
                      className={`py-3 px-2 text-center w-[160px] ${
                        day.isPeak ? 'bg-[#E8F8F0]/70 text-[#0D6246] border-l border-emerald-100 font-bold' : ''
                      }`}
                    >
                      <div>{day.label}</div>
                      <div className={`text-[10px] font-mono ${day.isPeak ? 'text-[#0D6246] font-bold' : 'text-gray-400'}`}>
                        {day.date}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* TABLE BODY (CÁC DÒNG NHÂN SỰ ĐỘNG) */}
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Col 1: Staff Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${staff.avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                          {staff.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {staff.name}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono ${staff.badgeColor}`}>
                              {staff.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {staff.role} • <span className="font-mono text-gray-400">#{staff.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Các cột ca theo ngày */}
                    {DAYS_CONFIG.map(day => (
                      <td 
                        key={day.key} 
                        className={`py-2 px-2 text-center ${day.isPeak ? 'bg-[#F0FDF4]/30 border-l border-emerald-50' : ''}`}
                      >
                        {renderInteractiveShiftCard(staff.id, day.key, staff.shifts[day.key])}
                      </td>
                    ))}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary (Tính toán động realtime) */}
          <div className="bg-[#F8FAFC] border-t border-gray-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-600 gap-2">
            <div className="font-mono">
              <strong className="text-slate-800">TỔNG ĐIỀU ĐỘ CA:</strong> {filteredStaff.length}/148 NHÂN VIÊN &nbsp;|&nbsp; 
              TRỰC SÁNG: <strong className="text-[#0D6246]">{totalMorning}</strong> &nbsp;|&nbsp; 
              TRỰC CHIỀU: <strong className="text-blue-700">{totalAfternoon}</strong> &nbsp;|&nbsp; 
              TRỰC ĐÊM: <strong className="text-slate-900">{totalNight}</strong> &nbsp;|&nbsp; 
              NGHỈ OFF: <strong className="text-gray-500">{totalOff}</strong>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#0D6246] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              HỆ THỐNG ĐỒNG BỘ THỜI GIAN THỰC <span className="text-gray-400 font-normal">| Cập nhật vừa xong</span>
            </div>
          </div>

        </div>

        {/* --- E. BOTTOM TWO PANELS (HEATMAP & DIRECT DISPATCH) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT PANEL: PEAK HEATMAP */}
          <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  MÔ PHỎNG TẢI TRỌNG NHÂN LỰC THEO GIỜ CAO ĐIỂM (PEAK HEATMAP)
                </h3>
                
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#E2E8F0]" /> Thấp</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#86EFAC]" /> Chuẩn</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#FDE047]" /> Cao điểm</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#F87171]" /> Đỉnh</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 mb-4">
                Phân bổ mật độ nhân viên theo 24 giờ nhằm ngăn ngừa thắt cổ chai dịch vụ
              </p>

              {/* Peak Alert Cards */}
              <div className="flex flex-col gap-2.5 mb-5">
                <div className="p-3 bg-[#E8F8F0] border border-[#BDEBD3] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#0D6246]">
                    <span className="material-symbols-outlined text-[18px]">luggage</span>
                    <span>ĐỢT CAO ĐIỂM 1: CHECK-IN &amp; XE ĐÓN SÂN BAY (14:00 - 16:30)</span>
                  </div>
                  <span className="bg-white border border-[#BDEBD3] text-[#0D6246] font-bold text-[10px] font-mono px-2.5 py-1 rounded">
                    28 NHÂN VIÊN HUY ĐỘNG
                  </span>
                </div>

                <div className="p-3 bg-[#EBF3FF] border border-[#C5DCFF] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#1D4ED8]">
                    <span className="material-symbols-outlined text-[18px]">restaurant</span>
                    <span>ĐỢT CAO ĐIỂM 2: ĂN TỐI &amp; SỰ KIỆN GALA DINNER (18:30 - 21:00)</span>
                  </div>
                  <span className="bg-white border border-[#C5DCFF] text-[#1D4ED8] font-bold text-[10px] font-mono px-2.5 py-1 rounded">
                    34 NHÂN VIÊN F&amp;B + BẾP
                  </span>
                </div>
              </div>
            </div>

            {/* 24H Heatmap Timeline Bars */}
            <div>
              <div className="h-6 w-full flex gap-1 rounded overflow-hidden">
                <div className="flex-1 bg-[#E2E8F0] rounded-xs" />
                <div className="flex-1 bg-[#E2E8F0] rounded-xs" />
                <div className="flex-1 bg-[#E2E8F0] rounded-xs" />
                <div className="flex-1 bg-[#BBF7D0] rounded-xs" />
                <div className="flex-1 bg-[#86EFAC] rounded-xs" />
                <div className="flex-1 bg-[#86EFAC] rounded-xs" />
                <div className="flex-1 bg-[#FDE047] rounded-xs" />
                <div className="flex-1 bg-[#86EFAC] rounded-xs" />
                <div className="flex-1 bg-[#F87171] rounded-xs" />
                <div className="flex-1 bg-[#F87171] rounded-xs" />
                <div className="flex-1 bg-[#FDE047] rounded-xs" />
                <div className="flex-1 bg-[#86EFAC] rounded-xs" />
                <div className="flex-1 bg-[#F87171] rounded-xs" />
                <div className="flex-1 bg-[#F87171] rounded-xs" />
                <div className="flex-1 bg-[#FDE047] rounded-xs" />
                <div className="flex-1 bg-[#BBF7D0] rounded-xs" />
                <div className="flex-1 bg-[#E2E8F0] rounded-xs" />
                <div className="flex-1 bg-[#E2E8F0] rounded-xs" />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1.5 px-1">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>23:59</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: DIRECT DISPATCH */}
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0D6246] uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-[16px]">cell_tower</span>
                KÊNH TRUYỀN THÔNG &amp; DUYỆT ĐỔI CA
              </div>
              
              <h3 className="text-sm font-bold text-slate-900">
                Tác Vụ Điều Phối Trực Tiếp
              </h3>

              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Đẩy thông báo ca trực tự động đến ứng dụng nội bộ nhân viên và tài khoản Zalo OA của Grand Horizon.
              </p>
            </div>

            {/* Shift Swap Pending Request Card */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">03 Yêu Cầu Đổi Ca Chờ Duyệt</div>
                  <div className="text-[10px] text-gray-500">Lễ Tân (2) • F&amp;B Bếp (1)</div>
                </div>
              </div>

              <button
                onClick={() => setIsSwapModalOpen(true)}
                className="px-3 py-1.5 bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs rounded-lg shadow-2xs transition-all"
              >
                Xem &amp; Duyệt
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => showToast('Phát Hành Thành Công', 'Lịch tuần 43 đã được gửi qua push-notification App và Zalo ZNS!')}
                className="w-full py-2.5 bg-[#0D6246] hover:bg-[#0A4D37] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Phát Hành Lịch Ca Tuần 43 Đến Nhân Viên (App &amp; Zalo)
              </button>

              <NavLink
                to="/admin/audit-logs"
                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-gray-500">history</span>
                Nhật Ký Thay Đổi &amp; Lịch Sử Điều Động (Audit Trail)
              </NavLink>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 1. MODAL PHÂN CA LÀM VIỆC MỚI (CẬP NHẬT TRỰC TIẾP VÀO BẢNG) */}
        {/* ========================================================= */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Phân Ca Làm Việc Mới</h3>
                    <p className="text-[11px] text-gray-500">Cập nhật trực tiếp lên bảng lịch biểu và kiểm tra xung đột</p>
                  </div>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* KHUNG CẢNH BÁO XUNG ĐỘT TRÙNG CA (NẾU PHÁT HIỆN) */}
              {conflictAlert && (
                <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-rose-600 text-xl mt-0.5">warning</span>
                    <div className="flex-1">
                      <div className="font-bold text-xs uppercase tracking-wide text-rose-800">
                        {conflictAlert.title}
                      </div>
                      <p className="text-xs text-rose-900 mt-1 leading-relaxed font-medium">
                        {conflictAlert.message}
                      </p>

                      <div className="mt-3 pt-3 border-t border-rose-200 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignForm.overrideConflict}
                            onChange={(e) => setAssignForm(prev => ({ ...prev, overrideConflict: e.target.checked }))}
                            className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                          />
                          Ghi đè ngoại lệ (Cần nhập lý do)
                        </label>
                      </div>

                      {assignForm.overrideConflict && (
                        <input
                          type="text"
                          placeholder="Nhập lý do nghiệp vụ phê duyệt ghi đè ca..."
                          value={assignForm.overrideReason}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, overrideReason: e.target.value }))}
                          className="w-full mt-2 p-2 bg-white border border-rose-300 rounded text-xs outline-none focus:border-rose-600"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAssignShiftSubmit} className="flex flex-col gap-4 text-xs">
                
                {/* 1. Chọn Nhân Sự */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Nhân Viên Cần Phân Ca:
                  </label>
                  <select
                    value={assignForm.staffId}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, staffId: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium focus:border-emerald-600 focus:bg-white"
                  >
                    {staffRoster.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.badge} - {s.role} • #{s.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Ngày Phân Ca */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Ngày Trong Tuần:</label>
                    <select
                      value={assignForm.dayKey}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, dayKey: e.target.value }))}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-medium focus:border-emerald-600 focus:bg-white"
                    >
                      {DAYS_CONFIG.map(d => (
                        <option key={d.key} value={d.key}>{d.label} ({d.date})</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Loại Ca Trực */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Khung Ca Làm Việc:</label>
                    <select
                      value={assignForm.shiftType}
                      onChange={(e) => {
                        const val = e.target.value;
                        let start = '07:00', end = '15:30';
                        if (val === 'afternoon') { start = '15:00'; end = '23:30'; }
                        else if (val === 'night') { start = '23:00'; end = '07:30'; }
                        setAssignForm(prev => ({ ...prev, shiftType: val, startTime: start, endTime: end }));
                      }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none font-bold text-emerald-800 focus:border-emerald-600 focus:bg-white"
                    >
                      <option value="morning">CA SÁNG (07:00 - 15:30)</option>
                      <option value="afternoon">CA CHIỀU (15:00 - 23:30)</option>
                      <option value="night">CA ĐÊM (23:00 - 07:30)</option>
                      <option value="off">NGHỈ (OFF) - Hưởng phép</option>
                    </select>
                  </div>
                </div>

                {/* 4. Giờ Bắt Đầu - Kết Thúc */}
                {assignForm.shiftType !== 'off' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Giờ Vào Ca:</label>
                      <input
                        type="time"
                        value={assignForm.startTime}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Giờ Tan Ca:</label>
                      <input
                        type="time"
                        value={assignForm.endTime}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Vị Trí / Chốt Trực */}
                {assignForm.shiftType !== 'off' && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Vị Trí Phân Bổ (Chốt Trực):</label>
                    <input
                      type="text"
                      value={assignForm.location}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="VD: Quầy Lễ Tân Sảnh A, Bếp Bánh, Villa Ocean..."
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#064E3B] hover:bg-[#065F46] text-white font-bold rounded-lg shadow-sm"
                  >
                    Lưu &amp; Cập Nhật Bảng
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. MODAL CHI TIẾT CA & GHI NHẬN CHẤM CÔNG (TƯƠNG TÁC Ô CA) */}
        {/* ========================================================= */}
        {selectedShiftForEdit && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">
                    CHI TIẾT CA TÁC NGHIỆP • {DAYS_CONFIG.find(d => d.key === selectedShiftForEdit.dayKey)?.label}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {staffRoster.find(s => s.id === selectedShiftForEdit.staffId)?.name}
                  </h3>
                </div>
                <button onClick={() => setSelectedShiftForEdit(null)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Thông tin ca */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 text-xs mb-4 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ca hiện tại:</span>
                  <span className="font-bold text-slate-800">{selectedShiftForEdit.shift.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian quy định:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedShiftForEdit.shift.time || 'Nghỉ ca'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vị trí trực:</span>
                  <span className="font-medium text-slate-800">{selectedShiftForEdit.shift.location || 'Theo phân công'}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="text-gray-500">Trạng thái chấm công:</span>
                  <span className="font-bold text-emerald-700">{selectedShiftForEdit.shift.attendance || 'Chờ ca'}</span>
                </div>
                {selectedShiftForEdit.shift.checkIn && (
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Nhật ký Check-in:</span>
                    <span className="font-mono text-slate-700">{selectedShiftForEdit.shift.checkIn}</span>
                  </div>
                )}
              </div>

              {/* TÁC VỤ 1: GHI NHẬN CHẤM CÔNG CA */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Tác Vụ Chấm Công Nhanh:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    onClick={() => handleRecordAttendance('ON_TIME')}
                    className="p-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    Check-in Đúng Giờ
                  </button>

                  <button
                    onClick={() => handleRecordAttendance('LATE')}
                    className="p-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">alarm_on</span>
                    Check-in Đi Trễ (15p)
                  </button>

                  <button
                    onClick={() => handleRecordAttendance('CHECKED_OUT')}
                    className="p-2.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    Check-out Hoàn Thành
                  </button>

                  <button
                    onClick={() => handleRecordAttendance('ABSENT')}
                    className="p-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_off</span>
                    Báo Vắng / Nghỉ Đột Xuất
                  </button>
                </div>
              </div>

              {/* TÁC VỤ 2: HOÁN ĐỔI NHANH SANG CA KHÁC */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Chuyển Sang Khung Ca Khác:
                </label>
                <div className="flex gap-1.5 text-xs">
                  <button onClick={() => handleQuickChangeShiftType('morning')} className="flex-1 py-1.5 bg-emerald-100/60 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                    Sáng
                  </button>
                  <button onClick={() => handleQuickChangeShiftType('afternoon')} className="flex-1 py-1.5 bg-blue-100/60 hover:bg-blue-100 text-blue-800 rounded font-semibold text-[11px]">
                    Chiều
                  </button>
                  <button onClick={() => handleQuickChangeShiftType('night')} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 text-emerald-400 rounded font-semibold text-[11px]">
                    Đêm
                  </button>
                  <button onClick={() => handleQuickChangeShiftType('off')} className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-[11px]">
                    OFF
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-5 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setSelectedShiftForEdit(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-lg"
                >
                  Đóng Hộp Thoại
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MODAL DUYỆT ĐỔI CA LÀM VIỆC */}
        {/* ========================================================= */}
        {isSwapModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">swap_horiz</span>
                  Duyệt Yêu Cầu Hoán Đổi Ca Làm Việc
                </h3>
                <button onClick={() => setIsSwapModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 mb-5">
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800">Lê Minh Anh ⇄ Marcus Aurelius</div>
                    <div className="text-[10px] text-gray-500">Thứ Tư (22/10): Ca Sáng ⇄ Ca Chiều (Lý do: Đón đoàn VIP)</div>
                  </div>
                  <button 
                    onClick={() => {
                      showToast('Đã Phê Duyệt', 'Đã duyệt đổi ca và cập nhật ma trận điều độ!');
                      setIsSwapModalOpen(false);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs"
                  >
                    Duyệt
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800">Jean-Luc Phan ⇄ Nguyễn Văn Tuấn (Bếp)</div>
                    <div className="text-[10px] text-gray-500">Thứ Sáu (24/10): Ca Sáng ⇄ Ca Chiều (Lý do: Phụ trách tiệc Gala)</div>
                  </div>
                  <button 
                    onClick={() => {
                      showToast('Đã Phê Duyệt', 'Đã duyệt đổi ca bếp!');
                      setIsSwapModalOpen(false);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs"
                  >
                    Duyệt
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg"
                >
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
