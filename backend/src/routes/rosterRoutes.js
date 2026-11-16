const express = require('express');
const router = express.Router();

// Bộ nhớ mẫu khởi tạo cho Roster & Ca Trực (Đồng bộ với RosterShifts UI)
let ROSTER_DATA = [
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
      mon: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '06:00 - 14:30', attendance: 'ON_TIME', location: 'Bếp Bánh & Buffet Sáng' },
      tue: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '06:00 - 14:30', attendance: 'ON_TIME', location: 'Bếp Bánh & Buffet Sáng' },
      wed: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '06:00 - 14:30', attendance: 'ON_TIME', location: 'Bếp Bánh & Buffet Sáng' },
      thu: { type: 'morning', title: 'CA SÁNG', icon: 'wb_sunny', time: '06:00 - 14:30', attendance: 'PENDING', location: 'Bếp Bánh & Buffet Sáng' },
      fri: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Bếp Nóng Gala Dinner' },
      sat: { type: 'afternoon', title: 'CA CHIỀU', icon: 'nights_stay', time: '14:00 - 22:30', attendance: 'PENDING', location: 'Bếp Nóng Gala Dinner' },
    }
  }
];

// 1. GET /api/roster - Lấy danh sách lịch trực & ca làm việc
router.get('/', (req, res) => {
  const { dept } = req.query;
  let filtered = ROSTER_DATA;
  if (dept && dept !== 'ALL') {
    filtered = ROSTER_DATA.filter(s => s.dept === dept);
  }
  res.json({
    success: true,
    week: 'Tuần 43 (20/10/2025 - 26/10/2025)',
    count: filtered.length,
    data: filtered
  });
});

// 2. POST /api/roster - Thêm ca làm việc mới / Phân công ca
router.post('/', (req, res) => {
  const { staffId, dayKey, shiftType, startTime, endTime, location, overrideReason } = req.body;
  if (!staffId || !dayKey || !shiftType) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin phân ca (staffId, dayKey, shiftType)!' });
  }

  const staff = ROSTER_DATA.find(s => s.id === staffId);
  if (!staff) {
    return res.status(404).json({ success: false, message: `Không tìm thấy nhân viên #${staffId}` });
  }

  const titleMap = {
    morning: 'CA SÁNG',
    afternoon: 'CA CHIỀU',
    night_audit: 'CA ĐÊM (NA)',
    night: 'CA ĐÊM',
    off: 'NGHỈ (OFF)'
  };

  const iconMap = {
    morning: 'wb_sunny',
    afternoon: 'nights_stay',
    night_audit: 'bedtime',
    night: 'bedtime',
    off: 'hotel'
  };

  const newShift = {
    type: shiftType,
    title: titleMap[shiftType] || shiftType.toUpperCase(),
    icon: iconMap[shiftType] || 'schedule',
    time: shiftType === 'off' ? '' : `${startTime || '07:00'} - ${endTime || '15:30'}`,
    sub: shiftType === 'off' ? (overrideReason || 'Nghỉ phép') : '',
    location: location || 'Khu vực chỉ định',
    attendance: shiftType === 'off' ? 'OFF' : 'PENDING'
  };

  staff.shifts[dayKey] = newShift;

  res.status(201).json({
    success: true,
    message: `Đã phân công ${newShift.title} cho nhân viên ${staff.name} vào ${dayKey}!`,
    data: staff
  });
});

// 3. PUT /api/roster/:id - Sửa ca làm việc của nhân viên
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { dayKey, shiftType, time, location, attendance, notes } = req.body;
  const staff = ROSTER_DATA.find(s => s.id === id);
  if (!staff) {
    return res.status(404).json({ success: false, message: `Không tìm thấy nhân viên #${id}` });
  }

  if (dayKey && staff.shifts[dayKey]) {
    if (shiftType) staff.shifts[dayKey].type = shiftType;
    if (time) staff.shifts[dayKey].time = time;
    if (location) staff.shifts[dayKey].location = location;
    if (attendance) staff.shifts[dayKey].attendance = attendance;
    if (notes) staff.shifts[dayKey].notes = notes;
  }

  res.json({
    success: true,
    message: `Đã cập nhật ca làm việc của ${staff.name} thành công!`,
    data: staff
  });
});

// 4. DELETE /api/roster/:id - Xóa ca làm việc (Chuyển sang OFF)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { dayKey } = req.query;
  const staff = ROSTER_DATA.find(s => s.id === id);
  if (!staff) {
    return res.status(404).json({ success: false, message: `Không tìm thấy nhân viên #${id}` });
  }

  if (dayKey && staff.shifts[dayKey]) {
    staff.shifts[dayKey] = {
      type: 'off',
      title: 'NGHỈ (OFF)',
      icon: 'hotel',
      time: '',
      sub: 'Đã hủy ca làm việc',
      attendance: 'OFF'
    };
  }

  res.json({
    success: true,
    message: `Đã hủy ca làm việc ngày ${dayKey} của ${staff.name}!`,
    data: staff
  });
});

// 5. POST /api/roster/swap - Hoán đổi ca giữa 2 nhân sự
router.post('/swap', (req, res) => {
  const { staffId1, staffId2, dayKey } = req.body;
  const staff1 = ROSTER_DATA.find(s => s.id === staffId1);
  const staff2 = ROSTER_DATA.find(s => s.id === staffId2);
  if (!staff1 || !staff2) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy một trong hai nhân viên cần đổi ca!' });
  }

  const shift1 = staff1.shifts[dayKey];
  const shift2 = staff2.shifts[dayKey];

  staff1.shifts[dayKey] = shift2;
  staff2.shifts[dayKey] = shift1;

  res.json({
    success: true,
    message: `Đã hoán đổi ca thành công giữa ${staff1.name} và ${staff2.name} vào ngày ${dayKey}!`,
    data: { staff1, staff2 }
  });
});

// 6. POST /api/roster/attendance - Chấm công ca làm việc
router.post('/attendance', (req, res) => {
  const { staffId, dayKey, status, time } = req.body;
  const staff = ROSTER_DATA.find(s => s.id === staffId);
  if (!staff || !staff.shifts[dayKey]) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc để chấm công!' });
  }

  staff.shifts[dayKey].attendance = status;
  if (status === 'ON_TIME' || status === 'LATE') {
    staff.shifts[dayKey].checkIn = time || new Date().toLocaleTimeString('vi-VN');
  } else if (status === 'CHECKED_OUT') {
    staff.shifts[dayKey].checkOut = time || new Date().toLocaleTimeString('vi-VN');
  }

  res.json({
    success: true,
    message: `Đã ghi nhận chấm công [${status}] cho ${staff.name}!`,
    data: staff.shifts[dayKey]
  });
});

// 7. POST /api/roster/staff - Thêm nhân viên mới vào bảng phân ca
router.post('/staff', (req, res) => {
  const { name, role, dept } = req.body;
  if (!name || !dept) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên và bộ phận của nhân viên!' });
  }

  const newStaff = {
    id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    name,
    role: role || 'Nhân viên',
    dept,
    badge: dept,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    avatarBg: 'bg-emerald-600 text-white',
    initials: name.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase(),
    shifts: {
      mon: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
      tue: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
      wed: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
      thu: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
      fri: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
      sat: { type: 'off', title: 'NGHỈ (OFF)', icon: 'hotel', time: '', attendance: 'OFF' },
    }
  };

  ROSTER_DATA.push(newStaff);
  res.status(201).json({
    success: true,
    message: `Đã thêm nhân viên ${name} vào danh sách phân ca!`,
    data: newStaff
  });
});

module.exports = router;
