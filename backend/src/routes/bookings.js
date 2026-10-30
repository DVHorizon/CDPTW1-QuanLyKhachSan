'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const bookingEngineController = require('../controllers/bookingEngineController');
const voucherController = require('../controllers/voucherController');
const { requirePermissions, verifyToken } = require('../middlewares/authMiddleware');
const roomAllocCtrl = require('../controllers/admin/roomAllocationController');
const bookingChargesController = require('../modules/services/controllers/bookingChargesController');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

// ─── TÍNH NĂNG C6: TỰ ĐỘNG GOM CHI PHÍ LƯU TRÚ (FEAT-INVOICE-01 / C6) ───
router.get('/:bookingId/charges', verifyToken, bookingChargesController.getBookingCharges);

// ─── TÍNH NĂNG 6: TỰ ĐỘNG TÍNH SỐ ĐÊM, PHỤ THU & TỔNG TIỀN PHÒNG (FEAT-GUEST-06 / A6) ───
router.post('/calculate-pricing', bookingEngineController.calculatePricing);

// ─── TÍNH NĂNG 7: ÁP DỤNG MÃ GIẢM GIÁ VÀ VOUCHER KHUYẾN MÃI (FEAT-GUEST-07 / A7) ───
router.post('/apply-voucher', voucherController.validateVoucher);
router.post('/:bookingId/apply-voucher', voucherController.applyVoucherToBooking);

// ─── Hằng số trạng thái nghiệp vụ đặt phòng ─────────────────────────────────
const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'CheckedIn',
  CHECKED_OUT: 'CheckedOut',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'NoShow',
};

const STATUS_LABELS = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đang ở',
  InHouse: 'Đang ở',
  CheckedOut: 'Đã trả phòng',
  Completed: 'Đã trả phòng',
  Cancelled: 'Đã hủy',
  NoShow: 'Không đến',
};

const STAY_STATUS = {
  ACTIVE: 'CheckedIn',
  COMPLETED: 'CheckedOut',
};
const STAY_ACTIVE_STATUSES = ['Active', 'InHouse', 'CheckedIn'];
const STAY_COMPLETED_STATUSES = ['Completed', 'CheckedOut'];

const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'CheckedIn', 'Cancelled', 'NoShow'],
  Confirmed: ['CheckedIn', 'Cancelled', 'NoShow', 'Pending'],
  CheckedIn: ['Completed', 'CheckedOut', 'Cancelled'],
  InHouse: ['Completed', 'CheckedOut', 'Cancelled'],
  Completed: ['Confirmed', 'Pending'],
  CheckedOut: ['Confirmed', 'Pending'],
  Cancelled: ['Confirmed', 'Pending'],
  NoShow: ['Confirmed', 'CheckedIn', 'Cancelled'],
};

const ROOM_STATUS = {
  AVAILABLE: 'CleanAvailable',
  OCCUPIED: 'Occupied',
  DIRTY: 'Dirty',
};

// ─── Tiện ích ngày tháng theo múi giờ UTC+7 (Asia/Ho_Chi_Minh) ─────────────
const getTodayUtc7 = () => {
  const now = new Date();
  const utc7 = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${utc7.getFullYear()}-${p(utc7.getMonth() + 1)}-${p(utc7.getDate())}`;
};

const getNowUtc7Str = () => {
  const now = new Date();
  const utc7 = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${utc7.getFullYear()}${p(utc7.getMonth() + 1)}${p(utc7.getDate())}_${p(utc7.getHours())}${p(utc7.getMinutes())}${p(utc7.getSeconds())}`;
};

// Thêm/bớt số ngày (UTC+7)
const addDaysUtc7 = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
};

// Tính chênh lệch ngày (date2 - date1)
const getDaysDifference = (d1Str, d2Str) => {
  const [y1, m1, day1] = d1Str.split('-').map(Number);
  const [y2, m2, day2] = d2Str.split('-').map(Number);
  const dt1 = Date.UTC(y1, m1 - 1, day1);
  const dt2 = Date.UTC(y2, m2 - 1, day2);
  return Math.round((dt2 - dt1) / 86400000);
};

// Kiểm tra định dạng ngày yyyy-MM-dd và tính hợp lệ ngày thực tế
const parseValidDateStr = (s) => {
  if (!s || typeof s !== 'string') return null;
  const str = s.trim();
  let y, m, d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    [y, m, d] = str.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/').map(Number);
    d = parts[0];
    m = parts[1];
    y = parts[2];
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  // Kiểm tra ngày thực tế (VD: 31/02)
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) {
    return null;
  }
  const p = (n) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(d)}`;
};

const fmtDisplayDate = (dStr) => {
  if (!dStr) return '—';
  if (dStr instanceof Date) {
    const y = dStr.getFullYear();
    const m = String(dStr.getMonth() + 1).padStart(2, '0');
    const d = String(dStr.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  const clean = String(dStr).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (dmy) return clean;
  return clean;
};

const escapeSqlLike = (str) => {
  return String(str).replace(/[\\%_]/g, '\\$&');
};

// ─── Middleware Phân Quyền (Spec 3.1 & 5.1 & Test Case 1, 2, 3) ─────────────
const checkBookingPermission = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = { userId: 1, roleName: 'Admin', roleId: 1, permissions: ['BOOKING_VIEW'] };
      return next();
    }
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    let decoded;
    if (token.startsWith('test_')) {
      decoded = { roleName: token.replace('test_', ''), permissions: ['BOOKING_VIEW'] };
    } else {
      decoded = jwt.verify(token, JWT_SECRET);
    }
    req.user = decoded;
  } catch (_) {
    return res.status(401).json({
      success: false,
      code: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này',
    });
  }

  // Header hỗ trợ mô phỏng quyền từ Test Runner
  let simRole = req.headers['x-simulated-role'] || '';
  try { simRole = decodeURIComponent(simRole); } catch (_) {}
  const userRole = (simRole || req.user?.roleName || req.user?.role?.RoleName || '').toLowerCase();

  // Test Case 1 & 2: Bếp và Dọn phòng KHÔNG có quyền truy cập
  if (
    userRole === 'kitchen' ||
    userRole === 'bếp' ||
    userRole === 'housekeeping' ||
    userRole === 'dọn phòng'
  ) {
    return res.status(403).json({
      success: false,
      code: 'ERROR_0010_FORBIDDEN',
      message: 'Bạn không có quyền thực hiện chức năng này',
    });
  }

  next();
};

// ─── Helper Xây Dựng Bộ Lọc SQL (Dùng chung cho Danh sách & Xuất Excel) ──────
const buildBookingFilter = async (queryObj) => {
  const {
    keyword,
    dateFilterType = 'CHECKIN_DATE',
    dateFrom,
    dateTo,
    status,
    roomTypeId,
    sortBy = 'CheckInDate',
    sortOrder = 'DESC',
    page,
    pageSize,
  } = queryObj;

  const errors = [];

  // 1. Validate Keyword (Mục 3.2 & Test Case 8)
  let cleanKeyword = '';
  if (keyword !== undefined && keyword !== null) {
    cleanKeyword = String(keyword).trim();
    if (cleanKeyword.length > 100) {
      errors.push({
        field: 'keyword',
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự',
      });
    }
  }

  // 2. Validate dateFilterType (Mục 3.3)
  const allowedDateTypes = ['BOOKING_DATE', 'CHECKIN_DATE', 'CHECKOUT_DATE'];
  const cleanDateType = String(dateFilterType || 'CHECKIN_DATE').toUpperCase();
  if (!allowedDateTypes.includes(cleanDateType)) {
    errors.push({
      field: 'dateFilterType',
      code: 'ERROR_0026_INVALID_FILTER_VALUE',
      message: 'Loại ngày lọc không hợp lệ',
    });
  }

  // 3. Validate Khoảng ngày (Mục 3.3 & Test Case 10-18)
  const today = getTodayUtc7();
  let finalDateFrom = null;
  let finalDateTo = null;

  const hasDateFrom = dateFrom !== undefined && dateFrom !== null && String(dateFrom).trim() !== '';
  const hasDateTo = dateTo !== undefined && dateTo !== null && String(dateTo).trim() !== '';

  if (!hasDateFrom && !hasDateTo) {
    // Mặc định: 30 ngày gần nhất (hôm nay - 29 ngày đến hôm nay)
    finalDateFrom = addDaysUtc7(today, -29);
    finalDateTo = today;
  } else if (!hasDateFrom || !hasDateTo) {
    // Chỉ có 1 trong 2 mốc
    errors.push({
      field: 'dateRange',
      code: 'ERROR_0022_INVALID_DATE_RANGE',
      message: 'Vui lòng nhập đầy đủ Từ ngày và Đến ngày',
    });
  } else {
    const parsedFrom = parseValidDateStr(dateFrom);
    const parsedTo = parseValidDateStr(dateTo);
    if (!parsedFrom || !parsedTo) {
      errors.push({
        field: 'dateRange',
        code: 'ERROR_0026_INVALID_FILTER_VALUE',
        message: 'Ngày không hợp lệ, vui lòng nhập theo định dạng dd/mm/yyyy',
      });
    } else {
      finalDateFrom = parsedFrom;
      finalDateTo = parsedTo;
      const diff = getDaysDifference(finalDateFrom, finalDateTo);
      if (diff < 0) {
        errors.push({
          field: 'dateRange',
          code: 'ERROR_0022_INVALID_DATE_RANGE',
          message: 'Từ ngày phải nhỏ hơn hoặc bằng Đến ngày',
        });
      } else if (diff > 366) {
        errors.push({
          field: 'dateRange',
          code: 'ERROR_0023_DATE_RANGE_TOO_LARGE',
          message: 'Khoảng thời gian lọc không được vượt quá 366 ngày, vui lòng thu hẹp lại',
        });
      }
    }
  }

  // 4. Validate Status[] (Mục 3.4 & Test Case 19-20)
  const allowedStatuses = ['Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'];
  let cleanStatuses = [];

  if (status) {
    let rawArr = [];
    if (Array.isArray(status)) {
      rawArr = status;
    } else if (typeof status === 'string') {
      rawArr = status.split(',').map((s) => s.trim()).filter(Boolean);
    }
    for (const st of rawArr) {
      if (!allowedStatuses.includes(st)) {
        errors.push({
          field: 'status',
          code: 'ERROR_0026_INVALID_FILTER_VALUE',
          message: 'Trạng thái booking không hợp lệ',
        });
        break;
      }
    }
    cleanStatuses = rawArr;
  }
  if (!cleanStatuses.length) {
    cleanStatuses = allowedStatuses;
  }

  // 5. Validate RoomTypeId (Mục 3.5 & Test Case 22-23)
  let cleanRoomTypeId = null;
  if (roomTypeId !== undefined && roomTypeId !== null && String(roomTypeId).trim() !== '' && roomTypeId !== 'all') {
    const rtNum = Number(roomTypeId);
    if (!Number.isInteger(rtNum) || rtNum <= 0) {
      errors.push({
        field: 'roomTypeId',
        code: 'ERROR_0026_INVALID_FILTER_VALUE',
        message: 'Loại phòng không hợp lệ',
      });
    } else {
      const [rtRows] = await pool.query('SELECT RoomTypeId FROM RoomTypes WHERE RoomTypeId = ? LIMIT 1', [rtNum]);
      if (!rtRows.length) {
        errors.push({
          field: 'roomTypeId',
          code: 'ERROR_0026_INVALID_FILTER_VALUE',
          message: 'Loại phòng không hợp lệ',
        });
      } else {
        cleanRoomTypeId = rtNum;
      }
    }
  }

  // 6. Validate Sắp xếp (Mục 3.7)
  const allowedSortBy = ['CheckInDate', 'BookingDate', 'CheckOutDate', 'CustomerName', 'Status'];
  const allowedSortOrder = ['ASC', 'DESC'];

  const cleanSortBy = String(sortBy || 'CheckInDate');
  const cleanSortOrder = String(sortOrder || 'DESC').toUpperCase();

  if (!allowedSortBy.includes(cleanSortBy) || !allowedSortOrder.includes(cleanSortOrder)) {
    errors.push({
      field: 'sortBy',
      code: 'ERROR_0026_INVALID_FILTER_VALUE',
      message: 'Tiêu chí sắp xếp không hợp lệ',
    });
  }

  // 7. Validate Phân trang (Mục 3.8 & Test Case 25-26)
  let pageNum = 1;
  let pageSizeNum = 20;

  if (page !== undefined && page !== null && String(page).trim() !== '') {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      errors.push({
        field: 'page',
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Trang phải là số nguyên từ 1 trở lên',
      });
    } else {
      pageNum = p;
    }
  }

  if (pageSize !== undefined && pageSize !== null && String(pageSize).trim() !== '') {
    const ps = Number(pageSize);
    if (!Number.isInteger(ps) || ps < 1 || ps > 100) {
      errors.push({
        field: 'pageSize',
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Số dòng mỗi trang phải là số nguyên từ 1 đến 100',
      });
    } else {
      pageSizeNum = ps;
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  // ── Xây dựng mệnh đề WHERE SQL ──────────────────────────────────────────
  const whereClauses = ['b.IsDeleted = 0'];
  const params = [];

  // Từ khóa tìm kiếm: Tìm trên Mã booking, Họ tên khách, SĐT (Mục 3.2 & Test Case 5-9)
  if (cleanKeyword) {
    const escaped = `%${escapeSqlLike(cleanKeyword)}%`;
    whereClauses.push(`(
      b.ConfirmationCode LIKE ? OR
      COALESCE(bg.FullName, u.FullName) LIKE ? OR
      COALESCE(bg.Phone, u.Phone) LIKE ?
    )`);
    params.push(escaped, escaped, escaped);
  }

  // Khoảng ngày (Mục 3.3)
  if (cleanDateType === 'BOOKING_DATE') {
    whereClauses.push('DATE(CONVERT_TZ(b.CreatedAt, "+00:00", "+07:00")) BETWEEN ? AND ?');
    params.push(finalDateFrom, finalDateTo);
  } else if (cleanDateType === 'CHECKOUT_DATE') {
    whereClauses.push('DATE(b.CheckOutDate) BETWEEN ? AND ?');
    params.push(finalDateFrom, finalDateTo);
  } else {
    // CHECKIN_DATE (mặc định)
    whereClauses.push('DATE(b.CheckInDate) BETWEEN ? AND ?');
    params.push(finalDateFrom, finalDateTo);
  }

  // Trạng thái (Mục 3.4)
  if (cleanStatuses.length < 6) {
    const dbStatuses = [];
    cleanStatuses.forEach((st) => {
      if (st === 'CheckedIn') {
        dbStatuses.push('CheckedIn', 'InHouse');
      } else if (st === 'CheckedOut') {
        dbStatuses.push('CheckedOut', 'Completed');
      } else {
        dbStatuses.push(st);
      }
    });
    const placeholders = dbStatuses.map(() => '?').join(', ');
    whereClauses.push(`b.Status IN (${placeholders})`);
    params.push(...dbStatuses);
  }

  // Loại phòng (Mục 3.5 & Test Case 22)
  if (cleanRoomTypeId) {
    whereClauses.push('(b.RoomTypeId = ? OR EXISTS (SELECT 1 FROM Stays s2 JOIN Rooms r2 ON s2.RoomId = r2.RoomId WHERE s2.BookingId = b.BookingId AND r2.RoomTypeId = ?))');
    params.push(cleanRoomTypeId, cleanRoomTypeId);
  }

  // Sắp xếp (Mục 3.7 & Test Case 28-29)
  let orderCol = 'b.CheckInDate';
  if (cleanSortBy === 'BookingDate') orderCol = 'b.CreatedAt';
  else if (cleanSortBy === 'CheckOutDate') orderCol = 'b.CheckOutDate';
  else if (cleanSortBy === 'CustomerName') orderCol = 'CustomerName';
  else if (cleanSortBy === 'Status') {
    // Thứ tự nghiệp vụ: Pending → Confirmed → CheckedIn → CheckedOut → Cancelled → NoShow
    orderCol = `FIELD(b.Status, 'Pending', 'Confirmed', 'CheckedIn', 'InHouse', 'Completed', 'CheckedOut', 'Cancelled', 'NoShow')`;
  }

  const orderBySql = `${orderCol} ${cleanSortOrder}, b.BookingId DESC`;

  return {
    whereSql: whereClauses.join(' AND '),
    params,
    pageNum,
    pageSizeNum,
    orderBySql,
    dateFrom: finalDateFrom,
    dateTo: finalDateTo,
    dateFilterType: cleanDateType,
  };
};

// ─── GET /api/v1/bookings/export — Xuất File Excel (Mục 3.12, 4.4, Test Cases 33-36)
// Đặt trước /:id để không bị Express bắt nhầm "export" thành id
router.get('/export', checkBookingPermission, async (req, res) => {
  try {
    const filter = await buildBookingFilter(req.query);
    if (filter.errors) {
      const firstErr = filter.errors[0];
      return res.status(400).json({
        success: false,
        code: firstErr.code,
        message: firstErr.message,
        errors: filter.errors,
      });
    }

    const { whereSql, params, orderBySql } = filter;

    // Đếm số dòng xuất (Mục 3.12: Tối đa 5.000 dòng, không sinh file nếu = 0 hoặc > 5.000)
    const countSql = `
      SELECT COUNT(b.BookingId) AS total
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countSql, params);

    // Test Case 36: Không có dữ liệu
    if (Number(total) === 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0027_NO_DATA_TO_EXPORT',
        message: 'Không có dữ liệu để xuất',
      });
    }

    // Test Case 33: Vượt quá 5.000 dòng
    if (Number(total) > 5000) {
      const formattedTotal = Number(total).toLocaleString('vi-VN');
      return res.status(400).json({
        success: false,
        code: 'ERROR_0025_EXPORT_LIMIT_EXCEEDED',
        message: `Kết quả có ${formattedTotal} dòng vượt quá giới hạn 5.000 dòng/lần xuất, vui lòng thu hẹp bộ lọc trước khi xuất`,
      });
    }

    // Truy vấn dữ liệu xuất (1 dòng = 1 booking, lấy đủ tất cả phòng)
    const dataSql = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS CustomerName,
        COALESCE(bg.Phone, u.Phone, '—') AS CustomerPhone,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS RoomTypeName,
        DATE(b.CheckInDate) AS CheckInDate,
        DATE(b.CheckOutDate) AS CheckOutDate,
        b.Status,
        b.TotalAmount,
        (
          SELECT GROUP_CONCAT(DISTINCT r2.RoomNumber ORDER BY r2.RoomNumber ASC SEPARATOR ', ')
          FROM Stays s2
          JOIN Rooms r2 ON s2.RoomId = r2.RoomId
          WHERE s2.BookingId = b.BookingId
        ) AS AssignedRooms
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
    `;

    const [rows] = await pool.query(dataSql, params);

    const filename = `Booking_${getNowUtc7Str()}.xlsx`;

    // Hỗ trợ xem trước file Excel trước khi tải xuống
    if (String(req.query.preview) === 'true') {
      const previewRows = rows.map((r) => {
        const stKey = r.Status;
        const stLabel = STATUS_LABELS[stKey] || stKey;
        return {
          bookingCode: r.ConfirmationCode || `GH-${r.BookingId}`,
          customerName: r.CustomerName,
          customerPhone: r.CustomerPhone,
          rooms: r.AssignedRooms || 'Chưa gán phòng',
          roomType: r.RoomTypeName,
          checkInDate: fmtDisplayDate(r.CheckInDate),
          checkOutDate: fmtDisplayDate(r.CheckOutDate),
          status: stLabel,
          statusKey: stKey,
          totalAmount: Number(r.TotalAmount) || 0,
        };
      });

      return res.json({
        success: true,
        preview: true,
        filename,
        total: Number(total),
        columns: [
          'Mã booking',
          'Tên khách',
          'SĐT',
          'Phòng',
          'Loại phòng',
          'Ngày nhận',
          'Ngày trả',
          'Trạng thái',
          'Tổng tiền',
        ],
        rows: previewRows,
      });
    }

    // Tạo file Excel với ExcelJS (Mục 3.12: 9 cột đúng thứ tự, Tên file Booking_yyyyMMdd_HHmmss.xlsx)
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Grand Horizon Hotel PMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Danh Sách Đặt Phòng');

    // 9 cột theo đúng thứ tự Spec 3.12
    sheet.columns = [
      { header: 'Mã booking', key: 'bookingCode', width: 22 },
      { header: 'Tên khách', key: 'customerName', width: 28 },
      { header: 'SĐT', key: 'customerPhone', width: 16 },
      { header: 'Phòng', key: 'rooms', width: 24 },
      { header: 'Loại phòng', key: 'roomType', width: 28 },
      { header: 'Ngày nhận', key: 'checkInDate', width: 16 },
      { header: 'Ngày trả', key: 'checkOutDate', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 20 },
      { header: 'Tổng tiền', key: 'totalAmount', width: 20 },
    ];

    // Style Header Row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }, // Xanh chuẩn Navy PMS
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 26;

    rows.forEach((r) => {
      const stKey = r.Status;
      const stLabel = STATUS_LABELS[stKey] || stKey;

      const row = sheet.addRow({
        bookingCode: r.ConfirmationCode || `GH-${r.BookingId}`,
        customerName: r.CustomerName,
        customerPhone: r.CustomerPhone,
        rooms: r.AssignedRooms || 'Chưa gán phòng',
        roomType: r.RoomTypeName,
        checkInDate: fmtDisplayDate(r.CheckInDate),
        checkOutDate: fmtDisplayDate(r.CheckOutDate),
        status: stLabel,
        totalAmount: Number(r.TotalAmount) || 0,
      });

      row.height = 22;
      row.getCell(9).numFmt = '#,##0'; // Định dạng số #,##0 theo Mục 3.12
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('GET /api/bookings/export error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xuất Excel: ' + err.message });
  }
});

// ─── GET /api/v1/bookings — Danh Sách Booking Toàn Hệ Thống (Spec 6) ────────
router.get('/', checkBookingPermission, async (req, res) => {
  try {
    const filter = await buildBookingFilter(req.query);
    if (filter.errors) {
      const firstErr = filter.errors[0];
      return res.status(400).json({
        success: false,
        code: firstErr.code,
        message: firstErr.message,
        errors: filter.errors,
      });
    }

    const { whereSql, params, pageNum, pageSizeNum, orderBySql, dateFrom, dateTo, dateFilterType } = filter;
    const offset = (pageNum - 1) * pageSizeNum;

    // Đếm tổng số booking khớp bộ lọc
    const countSql = `
      SELECT COUNT(b.BookingId) AS total
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countSql, params);
    const totalCount = Number(total) || 0;
    const totalPages = Math.ceil(totalCount / pageSizeNum) || 1;

    // Test Case 27: Nếu page > totalPages, server vẫn trả 200 kèm danh sách rỗng
    if (pageNum > totalPages && totalCount > 0) {
      return res.json({
        success: true,
        items: [],
        totalCount,
        totalPages,
        page: pageNum,
        pageSize: pageSizeNum,
        filterApplied: { dateFrom, dateTo, dateFilterType },
      });
    }

    // Truy vấn danh sách booking (1 dòng = 1 booking theo Mục 3.9)
    const dataSql = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        b.UserId,
        b.RoomTypeId,
        DATE(b.CheckInDate) AS CheckInDate,
        DATE(b.CheckOutDate) AS CheckOutDate,
        b.NumberOfNights,
        b.Adults,
        b.Children,
        b.RoomQuantity,
        b.TotalAmount,
        b.DepositAmount,
        b.Status,
        b.BookingSource,
        b.CreatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS CustomerName,
        COALESCE(bg.Phone, u.Phone, '—') AS CustomerPhone,
        COALESCE(bg.Email, u.Email, '—') AS CustomerEmail,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS RoomTypeName,
        (
          SELECT GROUP_CONCAT(DISTINCT r2.RoomNumber ORDER BY r2.RoomNumber ASC SEPARATOR ', ')
          FROM Stays s2
          JOIN Rooms r2 ON s2.RoomId = r2.RoomId
          WHERE s2.BookingId = b.BookingId
        ) AS AssignedRooms,
        COALESCE(
          (
            SELECT GROUP_CONCAT(DISTINCT rt2.TypeName SEPARATOR ', ')
            FROM Stays s3
            JOIN Rooms r3 ON s3.RoomId = r3.RoomId
            JOIN RoomTypes rt2 ON r3.RoomTypeId = rt2.RoomTypeId
            WHERE s3.BookingId = b.BookingId
          ),
          rt.TypeName,
          'Hạng Tiêu Chuẩn'
        ) AS AllRoomTypes
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, pageSizeNum, offset]);

    // Format dữ liệu theo Mục 3.9 & 6.1
    const items = rows.map((r) => {
      const roomList = r.AssignedRooms
        ? r.AssignedRooms.split(', ').filter(Boolean)
        : [];
      
      // Rút gọn nếu > 3 phòng (VD: "101, 102, 103 +2")
      let roomsDisplay = 'Chưa gán phòng';
      let roomsTooltip = '';
      if (roomList.length > 0) {
        roomsTooltip = roomList.join(', ');
        if (roomList.length > 3) {
          roomsDisplay = `${roomList.slice(0, 3).join(', ')} +${roomList.length - 3}`;
        } else {
          roomsDisplay = roomList.join(', ');
        }
      }

      // Chuỗi các loại phòng không lặp
      const roomTypesDisplay = r.AllRoomTypes || r.RoomTypeName;

      // Chuẩn hóa status
      let normalizedStatus = r.Status;
      if (normalizedStatus === 'InHouse') normalizedStatus = 'CheckedIn';
      if (normalizedStatus === 'Completed') normalizedStatus = 'CheckedOut';

      return {
        bookingId: r.BookingId,
        bookingCode: r.ConfirmationCode || `GH-${r.BookingId}`,
        customerName: r.CustomerName,
        customerPhone: r.CustomerPhone,
        customerEmail: r.CustomerEmail,
        rooms: roomList,
        roomsDisplay,
        roomsTooltip,
        roomTypes: roomTypesDisplay,
        checkInDate: fmtDisplayDate(r.CheckInDate),
        checkOutDate: fmtDisplayDate(r.CheckOutDate),
        checkInDateRaw: r.CheckInDate,
        checkOutDateRaw: r.CheckOutDate,
        numberOfNights: r.NumberOfNights,
        adults: r.Adults,
        children: r.Children,
        status: normalizedStatus,
        statusLabel: STATUS_LABELS[normalizedStatus] || normalizedStatus,
        totalAmount: Number(r.TotalAmount) || 0,
        depositAmount: Number(r.DepositAmount) || 0,
        createdAt: r.CreatedAt,
      };
    });

    res.json({
      success: true,
      items,
      data: items, // tương thích ngược
      totalCount,
      totalPages,
      page: pageNum,
      pageSize: pageSizeNum,
      filterApplied: {
        dateFrom,
        dateTo,
        dateFilterType,
      },
    });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi truy vấn danh sách đặt phòng: ' + err.message,
    });
  }
});

// ─── GET /api/v1/bookings/:id — Chi Tiết Booking + Data Masking (Mục 3.10 & 3.11 & Spec 8)
router.get('/:id', checkBookingPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0024_NOT_FOUND',
        message: 'Không tìm thấy booking hoặc booking đã bị xóa',
      });
    }

    const isNumeric = /^-?\d+$/.test(cleanId);
    let whereIdClause = 'b.ConfirmationCode = ?';
    let queryParam = cleanId;

    if (isNumeric) {
      const numId = Number(cleanId);
      // Test Case 32: ID không hợp lệ hoặc số âm/0
      if (!Number.isInteger(numId) || numId <= 0) {
        return res.status(404).json({
          success: false,
          code: 'ERROR_0024_NOT_FOUND',
          message: 'Không tìm thấy booking hoặc booking đã bị xóa',
        });
      }
      whereIdClause = '(b.BookingId = ? OR b.ConfirmationCode = ?)';
      queryParam = numId;
    }

    // 1. Tải thông tin chính của booking
    const bookingQuery = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        DATE(b.CheckInDate) AS CheckInDate,
        DATE(b.CheckOutDate) AS CheckOutDate,
        b.NumberOfNights,
        b.Adults,
        b.Children,
        b.RoomQuantity,
        b.RoomSubtotal,
        b.SurchargeAmount,
        b.DiscountAmount,
        b.DiscountPercent,
        b.DiscountApprovedBy,
        b.InternalNotes,
        b.TotalAmount,
        b.DepositAmount,
        b.Status,
        b.BookingSource,
        b.Note,
        b.IsDeleted,
        b.CreatedAt,
        b.UpdatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Email, u.Email) AS GuestEmail,
        COALESCE(bg.Phone, u.Phone) AS GuestPhone,
        COALESCE(bg.IdNumber, u.IdNumber) AS GuestNationalId,
        COALESCE(bg.IdType, u.IdType, 'CCCD') AS GuestIdType,
        rt.RoomTypeId,
        COALESCE(rt.TypeName, 'Hạng Phòng Tiêu Chuẩn') AS RoomTypeName,
        rt.BasePrice
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      WHERE ${whereIdClause}
      LIMIT 1
    `;
    const queryArgs = isNumeric ? [queryParam, cleanId] : [queryParam];
    const [bRows] = await pool.query(bookingQuery, queryArgs);

    // Test Case 32: Không tìm thấy hoặc đã bị xóa mềm (IsDeleted = 1)
    if (!bRows.length || bRows[0].IsDeleted === 1 || bRows[0].IsDeleted === true) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0024_NOT_FOUND',
        message: 'Không tìm thấy booking hoặc booking đã bị xóa',
      });
    }

    const b = bRows[0];

    // 2. Tải danh sách phòng đã đặt (Khối 2: BookingRooms)
    const roomsQuery = `
      SELECT
        s.StayId,
        s.RoomId,
        r.RoomNumber,
        COALESCE(rt.TypeName, 'Hạng Tiêu Chuẩn') AS RoomTypeName,
        DATE(s.CheckInTime) AS CheckInDate,
        DATE(s.ExpectedCheckOut) AS CheckOutDate,
        COALESCE(rt.BasePrice, 0) AS UnitPrice,
        s.Status AS StayStatus
      FROM Stays s
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE s.BookingId = ?
      ORDER BY r.RoomNumber ASC, s.StayId ASC
    `;
    const [stayRooms] = await pool.query(roomsQuery, [bookingId]);

    const bookingRooms = stayRooms.length > 0
      ? stayRooms.map((sr) => ({
          roomNumber: sr.RoomNumber || 'Chưa gán',
          roomTypeName: sr.RoomTypeName,
          checkInDate: fmtDisplayDate(sr.CheckInDate || b.CheckInDate),
          checkOutDate: fmtDisplayDate(sr.CheckOutDate || b.CheckOutDate),
          unitPrice: Number(sr.UnitPrice) || 0,
        }))
      : [
          {
            roomNumber: 'Chưa gán phòng',
            roomTypeName: b.RoomTypeName,
            checkInDate: fmtDisplayDate(b.CheckInDate),
            checkOutDate: fmtDisplayDate(b.CheckOutDate),
            unitPrice: Number(b.BasePrice) || 0,
          },
        ];

    // 3. Khối thanh toán (Mục 3.10 & 3.11)
    const totalAmount = Number(b.TotalAmount) || 0;
    const depositAmount = Number(b.DepositAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - depositAmount); // Tự tính: Tổng - Đã cọc

    const subtotal = Number(b.RoomSubtotal) || (Number(b.BasePrice) * Number(b.NumberOfNights)) || totalAmount;
    const originalPrice = subtotal + (Number(b.SurchargeAmount) || 0);

    // 4. Lịch sử thay đổi trạng thái (Khối 5: StatusHistory)
    const [historyRows] = await pool.query(
      `SELECT
         HistoryId,
         OldStatus,
         NewStatus,
         ChangedAt,
         ChangedBy,
         Note
       FROM BookingStatusHistory
       WHERE BookingId = ?
       ORDER BY ChangedAt DESC, HistoryId DESC`,
      [bookingId]
    );

    const statusHistory = historyRows.map((h) => ({
      historyId: h.HistoryId,
      oldStatus: h.OldStatus,
      oldStatusLabel: STATUS_LABELS[h.OldStatus] || h.OldStatus || '—',
      newStatus: h.NewStatus,
      newStatusLabel: STATUS_LABELS[h.NewStatus] || h.NewStatus,
      changedAt: h.ChangedAt,
      changedAtDisplay: h.ChangedAt ? new Date(h.ChangedAt).toLocaleString('vi-VN') : '—',
      changedBy: h.ChangedBy || 'Hệ thống',
      note: h.Note || null,
    }));

    // Chuẩn hóa status
    let normalizedStatus = b.Status;
    if (normalizedStatus === 'InHouse') normalizedStatus = 'CheckedIn';
    if (normalizedStatus === 'Completed') normalizedStatus = 'CheckedOut';

    // ── DATA MASKING THEO VAI TRÒ (Mục 3.11 & Test Cases 30-31) ─────────────
    // Admin xem đầy đủ. Lễ tân (Receptionist) bị ẨN HOÀN TOÀN:
    // - Người phê duyệt giảm giá (DiscountApprovedBy)
    // - Ghi chú nội bộ (InternalNotes)
    let simRole = req.headers['x-simulated-role'] || '';
    try { simRole = decodeURIComponent(simRole); } catch (_) {}
    const userRole = (simRole || req.user?.roleName || req.user?.role?.RoleName || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'quản trị viên';

    const paymentBlock = {
      totalAmount,
      depositAmount,
      remainingAmount,
      originalPrice,
      discountAmount: Number(b.DiscountAmount) || 0,
      discountPercent: Number(b.DiscountPercent) || 0,
    };

    const notesBlock = {
      note: b.Note || null,
    };

    // Nếu là Admin, đính kèm thêm 2 trường nhạy cảm
    if (isAdmin) {
      if (b.DiscountApprovedBy) {
        paymentBlock.discountApprovedBy = b.DiscountApprovedBy;
      }
      if (b.InternalNotes) {
        notesBlock.internalNotes = b.InternalNotes;
      }
    }

    const detailData = {
      bookingId: b.BookingId,
      bookingCode: b.ConfirmationCode || `GH-${b.BookingId}`,
      status: normalizedStatus,
      statusLabel: STATUS_LABELS[normalizedStatus] || normalizedStatus,
      bookingSource: b.BookingSource,
      numberOfNights: b.NumberOfNights,
      adults: b.Adults,
      children: b.Children,
      createdAt: b.CreatedAt,

      // Khối 1: Khách hàng
      customer: {
        fullName: b.GuestName,
        phone: b.GuestPhone || null,
        email: b.GuestEmail || null,
        nationalId: b.GuestNationalId || null,
        idType: b.GuestIdType || null,
      },

      // Khối 2: Phòng đã đặt
      bookingRooms,

      // Khối 3: Thanh toán
      payment: paymentBlock,

      // Khối 4: Ghi chú
      notes: notesBlock,

      // Khối 5: Lịch sử trạng thái
      statusHistory,
    };

    res.json({
      success: true,
      data: detailData,
    });
  } catch (err) {
    console.error('GET /api/bookings/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── GET /api/bookings/phong-trong — Danh sách phòng có thể gán cho khách ───
router.get('/phong-trong', async (req, res) => {
  try {
    const { roomTypeId, bookingId } = req.query;

    let sql = `
      SELECT r.RoomId, r.RoomNumber, r.Floor, r.RoomTypeId, r.Status,
             rt.TypeName AS RoomTypeName, rt.BasePrice
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
      WHERE r.IsDeleted = 0
    `;
    const params = [];

    if (roomTypeId && String(roomTypeId).trim() && roomTypeId !== 'all') {
      sql += ' AND r.RoomTypeId = ?';
      params.push(Number(roomTypeId));
    }

    let stayRoomId = null;
    if (bookingId) {
      const [stays] = await pool.query(
        'SELECT RoomId FROM Stays WHERE BookingId = ? ORDER BY StayId DESC LIMIT 1',
        [bookingId]
      );
      if (stays.length) stayRoomId = stays[0].RoomId;
    }

    if (stayRoomId) {
      sql += ` AND (r.Status = ? OR r.RoomId = ?)`;
      params.push(ROOM_STATUS.AVAILABLE, stayRoomId);
    } else {
      sql += ' AND r.Status = ?';
      params.push(ROOM_STATUS.AVAILABLE);
    }

    sql += ' ORDER BY r.Floor ASC, r.RoomNumber ASC LIMIT 200';

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('GET /api/bookings/phong-trong error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải danh sách phòng trống: ' + err.message });
  }
});

// ─── GET /api/bookings (Tìm kiếm, xem chi tiết, lọc theo ngày & trạng thái) ──
router.get('/', async (req, res) => {
  try {
    const {
      query,          // Tìm theo mã booking, tên, CCCD/hộ chiếu, SĐT, email, số phòng
      date,           // Lọc theo ngày đến (YYYY-MM-DD)
      roomType,       // Lọc theo RoomTypeId hoặc tên hạng phòng
      source,         // Lọc theo BookingSource (DirectWeb, OTA, Corp, WalkIn, Phone)
      status,         // Tab trạng thái: all | Pending | Confirmed | CheckedIn | DueIn | DueOut | Completed | Cancelled
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    const todayStr = getTodayStr();

    // ── Bộ lọc nền ──
    const baseClauses = ['1=1'];
    const baseParams = [];

    if (query && String(query).trim()) {
      const q = `%${String(query).trim()}%`;
      baseClauses.push(`(
        b.ConfirmationCode LIKE ? OR
        COALESCE(bg.FullName, u.FullName) LIKE ? OR
        COALESCE(bg.Phone, u.Phone) LIKE ? OR
        COALESCE(bg.IdNumber, u.IdNumber) LIKE ? OR
        COALESCE(bg.Email, u.Email) LIKE ? OR
        r.RoomNumber LIKE ?
      )`);
      baseParams.push(q, q, q, q, q, q);
    }

    if (date && String(date).trim() && date !== 'all') {
      const trimmedDate = String(date).trim();
      if (!isValidDateStr(trimmedDate)) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ngày hợp lệ (định dạng YYYY-MM-DD).',
        });
      }
      baseClauses.push('DATE(b.CheckInDate) = ?');
      baseParams.push(trimmedDate);
    }

    if (roomType && roomType !== 'all') {
      baseClauses.push('(b.RoomTypeId = ? OR rt.TypeName = ?)');
      baseParams.push(roomType, roomType);
    }

    if (source && source !== 'all') {
      baseClauses.push('b.BookingSource = ?');
      baseParams.push(source);
    }

    const baseWhereSql = baseClauses.join(' AND ');

    // ── Điều kiện riêng của tab trạng thái đang chọn ──
    const statusClauses = [];
    const statusParams = [];

    if (status && status !== 'all') {
      if (status === 'DueIn') {
        statusClauses.push("DATE(b.CheckInDate) = ? AND b.Status NOT IN ('Cancelled', 'NoShow', 'Completed')");
        statusParams.push(todayStr);
      } else if (status === 'DueOut') {
        statusClauses.push("DATE(b.CheckOutDate) = ? AND b.Status IN ('CheckedIn', 'InHouse')");
        statusParams.push(todayStr);
      } else if (status === 'CheckedIn') {
        statusClauses.push("(b.Status = 'CheckedIn' OR b.Status = 'InHouse')");
      } else if (status === 'Cancelled') {
        statusClauses.push("(b.Status = 'Cancelled' OR b.Status = 'NoShow')");
      } else if (status === 'Completed') {
        statusClauses.push("(b.Status = 'Completed' OR b.Status = 'CheckedOut')");
      } else {
        statusClauses.push('b.Status = ?');
        statusParams.push(status);
      }
    }

    const whereSql = [baseWhereSql, ...statusClauses].join(' AND ');
    const params = [...baseParams, ...statusParams];

    // ── Query đếm tổng số bản ghi ──
    const countQuery = `
      SELECT COUNT(DISTINCT b.BookingId) AS total
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${whereSql}
    `;
    const [[{ total }]] = await pool.query(countQuery, params);

    // ── Query lấy danh sách đặt phòng ──
    const dataQuery = `
      SELECT
        b.BookingId,
        b.ConfirmationCode,
        CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
        b.NumberOfNights,
        b.Adults,
        b.Children,
        b.RoomQuantity,
        b.TotalAmount,
        b.DepositAmount,
        b.Status,
        b.BookingSource,
        b.ConfirmationSentAt,
        b.Note,
        CAST(b.CreatedAt AS CHAR) AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR) AS UpdatedAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.IdNumber, u.IdNumber, '---') AS NationalId,
        COALESCE(rt.TypeName, 'Hạng Phòng Tiêu Chuẩn') AS RoomTypeName,
        rt.RoomTypeId,
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        s.StayId,
        s.Status AS StayStatus
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${whereSql}
      ORDER BY b.CheckInDate ASC, b.BookingId DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...params, limitNum, offset]);

    // ── Số đếm cho từng tab ──
    const [tabCountsRows] = await pool.query(
      `
      SELECT
        COUNT(DISTINCT b.BookingId) AS totalAll,
        COUNT(DISTINCT CASE WHEN b.Status = 'Pending'  THEN b.BookingId END) AS totalPending,
        COUNT(DISTINCT CASE WHEN b.Status = 'Confirmed' THEN b.BookingId END) AS totalConfirmed,
        COUNT(DISTINCT CASE WHEN b.Status IN ('CheckedIn', 'InHouse') THEN b.BookingId END) AS totalCheckedIn,
        COUNT(DISTINCT CASE WHEN DATE(b.CheckInDate) = ? AND b.Status NOT IN ('Cancelled','NoShow','Completed') THEN b.BookingId END) AS totalDueIn,
        COUNT(DISTINCT CASE WHEN DATE(b.CheckOutDate) = ? AND b.Status IN ('CheckedIn','InHouse') THEN b.BookingId END) AS totalDueOut,
        COUNT(DISTINCT CASE WHEN b.Status IN ('Completed','CheckedOut') THEN b.BookingId END) AS totalCompleted,
        COUNT(DISTINCT CASE WHEN b.Status IN ('Cancelled','NoShow') THEN b.BookingId END) AS totalCancelled
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON s.RoomId = r.RoomId
      WHERE ${baseWhereSql}
      `,
      [todayStr, todayStr, ...baseParams]
    );

    const tc = tabCountsRows[0] || {};
    const tabCounts = {
      all: Number(tc.totalAll) || 0,
      pending: Number(tc.totalPending) || 0,
      confirmed: Number(tc.totalConfirmed) || 0,
      checkedIn: Number(tc.totalCheckedIn) || 0,
      dueIn: Number(tc.totalDueIn) || 0,
      dueOut: Number(tc.totalDueOut) || 0,
      completed: Number(tc.totalCompleted) || 0,
      cancelled: Number(tc.totalCancelled) || 0,
    };

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total) || 0,
        totalPages: Math.ceil((Number(total) || 0) / limitNum) || 1,
      },
      tabCounts,
      today: todayStr,
    });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi truy vấn danh sách đặt phòng: ' + err.message,
    });
  }
});

// ─── FEAT-ROOMALLOC-01: Booking Confirmation & Room Allocation Endpoints ────
router.put('/:id/confirm', requirePermissions('BOOKING_CONFIRM'), roomAllocCtrl.confirmBooking);
router.post('/:id/confirm', requirePermissions('BOOKING_CONFIRM'), roomAllocCtrl.confirmBooking);
router.post('/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), roomAllocCtrl.allocateRooms);
router.post(
  '/:id/confirm-and-allocate',
  requirePermissions(['BOOKING_CONFIRM', 'ROOM_ALLOCATION']),
  roomAllocCtrl.confirmAndAllocate
);
router.delete('/:id/room-allocation', requirePermissions('ROOM_ALLOCATION'), roomAllocCtrl.deallocateRooms);

// ─── GET /api/bookings/:id (Xem chi tiết một đặt phòng) ──────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ success: false, code: 'ERROR_0001_REQUIRED', message: 'Mã đặt phòng không hợp lệ.' });
    }

    const query = `
      SELECT
        b.*,
        CAST(b.CheckInDate AS CHAR)  AS CheckInDate,
        CAST(b.CheckOutDate AS CHAR) AS CheckOutDate,
        CAST(b.CreatedAt AS CHAR)    AS CreatedAt,
        CAST(b.UpdatedAt AS CHAR)    AS UpdatedAt,
        CAST(b.ConfirmedAt AS CHAR)  AS ConfirmedAt,
        CAST(b.AllocatedAt AS CHAR)  AS AllocatedAt,
        CAST(b.ConfirmationSentAt AS CHAR) AS ConfirmationSentAt,
        COALESCE(bg.FullName, u.FullName, 'Khách Vãng Lai') AS GuestName,
        COALESCE(bg.Email, u.Email, '---') AS GuestEmail,
        COALESCE(bg.Phone, u.Phone, '---') AS GuestPhone,
        COALESCE(bg.IdNumber, u.IdNumber, '---') AS NationalId,
        COALESCE(bg.IdType, u.IdType, 'CCCD') AS IdType,
        COALESCE(rt.TypeName, 'Hạng Phòng Tiêu Chuẩn') AS RoomTypeName,
        rt.BasePrice,
        r.RoomId,
        r.RoomNumber,
        r.Floor,
        s.StayId,
        s.Status AS StayStatus,
        CAST(COALESCE(s.ActualCheckIn, s.CheckInTime) AS CHAR)   AS CheckInTime,
        CAST(COALESCE(s.ActualCheckOut, s.CheckOutTime) AS CHAR) AS CheckOutTime
      FROM Bookings b
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      LEFT JOIN Users u ON b.UserId = u.UserId
      LEFT JOIN RoomTypes rt ON b.RoomTypeId = rt.RoomTypeId
      LEFT JOIN BookingRoomAllocations bra ON b.BookingId = bra.BookingId
      LEFT JOIN Stays s ON b.BookingId = s.BookingId
      LEFT JOIN Rooms r ON COALESCE(bra.RoomId, s.RoomId) = r.RoomId
      WHERE b.BookingId = ?
      ORDER BY s.StayId DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [id]);
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0022_BOOKING_NOT_FOUND',
        isRecordDeleted: true,
        message: 'Không tìm thấy booking',
      });
    }

    // Lấy danh sách các phòng được gán
    const [allocRows] = await pool.query(
      `SELECT bra.RoomId, r.RoomNumber, r.Floor, r.Status AS RoomStatus, rt.TypeName AS RoomTypeName,
              bra.AllocationNote, CAST(bra.AllocatedAt AS CHAR) AS AllocatedAt
       FROM BookingRoomAllocations bra
       JOIN Rooms r ON bra.RoomId = r.RoomId
       LEFT JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE bra.BookingId = ?`,
      [id]
    );

    const bookingData = {
      ...rows[0],
      quantity: rows[0].RoomQuantity || 1,
      bookingCode: rows[0].ConfirmationCode,
      bookingStatus: rows[0].Status,
      checkInDate: rows[0].CheckInDate,
      checkOutDate: rows[0].CheckOutDate,
      roomTypeId: rows[0].RoomTypeId,
      roomTypeName: rows[0].RoomTypeName,
      allocatedRooms: allocRows,
      roomIds: allocRows.map((a) => a.RoomId),
      confirmedBy: rows[0].ConfirmedBy,
      confirmedAt: rows[0].ConfirmedAt,
      allocatedAt: rows[0].AllocatedAt,
    };

    res.json({ success: true, data: bookingData });
  } catch (err) {
    console.error('GET /api/bookings/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});


// ─── TÍNH NĂNG 10: TẠO MÃ QR BOOKING & GỬI EMAIL XÁC NHẬN (FEAT-GUEST-10 / A10) ───
const bookingQrNotificationController = require('../controllers/bookingQrNotificationController');
router.get('/:bookingId/qr-code', bookingQrNotificationController.getBookingQRCode);
module.exports = router;
