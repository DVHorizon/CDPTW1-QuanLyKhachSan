'use strict';

const crypto = require('crypto');
const { RoomType, Room, Booking, Stay, sequelize } = require('../models');
const { Op } = require('sequelize');
const { broadcastRoomEvent } = require('../sockets/socketHandler');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOM AVAILABILITY & CONCURRENCY LOCK SERVICE
 * Mã tính năng: FEAT-GUEST-04 (Mã truy vết: A4)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Thời gian giữ phòng tạm thời: 15 phút (ms)
const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

// Bộ nhớ lưu trữ phiên giữ phòng tạm thời (In-memory Lock Store / Distributed lock abstraction)
// Map<lockSessionId, { lockSessionId, roomTypeId, checkInDate, checkOutDate, quantity, expiresAt, createdAt }>
const activeLocks = new Map();

/**
 * Background cleaner: Tự động nhả phòng về kho trống sau 15 phút nếu chưa thanh toán
 */
setInterval(async () => {
  const now = Date.now();
  for (const [id, lock] of activeLocks.entries()) {
    if (lock.expiresAt <= now) {
      activeLocks.delete(id);
      broadcastRoomEvent('ROOM_LOCK_RELEASED', { lockSessionId: id, roomTypeId: lock.roomTypeId, reason: 'TIMEOUT' });
    }
  }

  // Dọn dẹp trong MySQL Database: Tự động hủy các đơn Pending HoldLock quá 15 phút
  try {
    const expiredThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS);
    await Booking.update(
      { Status: 'Cancelled' },
      {
        where: {
          Status: 'Pending',
          BookingSource: 'HoldLock',
          CreatedAt: { [Op.lt]: expiredThreshold }
        }
      }
    );
  } catch (_) {}
}, 30000);

/**
 * Định dạng ngày sang 'YYYY-MM-DD'
 */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tạo danh sách ngày lưu trú [checkInDate, checkOutDate)
 */
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (curr < end) {
    dates.push(formatDate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Lấy số lượng phòng đang bị khóa tạm thời (bởi lockSession) cho một ngày cụ thể
 */
function getLockedRoomsForDate(roomTypeId, dateStr, excludeSessionId = null) {
  const now = Date.now();
  let lockedCount = 0;

  for (const [sessionId, lock] of activeLocks.entries()) {
    if (lock.expiresAt <= now) {
      activeLocks.delete(sessionId);
      continue;
    }
    if (excludeSessionId && sessionId === excludeSessionId) {
      continue;
    }
    if (Number(lock.roomTypeId) === Number(roomTypeId)) {
      if (dateStr >= lock.checkInDate && dateStr < lock.checkOutDate) {
        lockedCount += Number(lock.quantity) || 1;
      }
    }
  }

  return lockedCount;
}

/**
 * Core Algorithm: Kiểm tra phòng trống theo loại phòng và khoảng ngày
 * @param {Object} params
 * @param {number|string} params.roomTypeId
 * @param {string} params.checkInDate YYYY-MM-DD
 * @param {string} params.checkOutDate YYYY-MM-DD
 * @param {number} [params.quantity=1]
 * @param {string} [params.excludeSessionId]
 */
async function checkAvailability({ roomTypeId, checkInDate, checkOutDate, quantity = 1, excludeSessionId = null }) {
  const numQuantity = parseInt(quantity, 10);
  if (isNaN(numQuantity) || numQuantity < 1) {
    const err = new Error('Số lượng phòng đặt phải lớn hơn hoặc bằng 1');
    err.code = 'ERROR_0005_INVALID_VALUE';
    err.statusCode = 400;
    throw err;
  }

  // 1. Kiểm tra tồn tại và hoạt động của RoomType
  const roomType = await RoomType.findOne({
    where: {
      RoomTypeId: roomTypeId,
      IsDeleted: false,
    }
  });

  if (!roomType || roomType.Status !== 'Active') {
    const err = new Error('Loại phòng yêu cầu không tồn tại hoặc đã ngừng phục vụ');
    err.code = 'ERROR_0021_ROOM_TYPE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // 2. Validate ngày lưu trú
  const todayStr = formatDate(new Date());
  if (!checkInDate || checkInDate < todayStr) {
    const err = new Error('Ngày nhận phòng không hợp lệ hoặc trước ngày hiện tại');
    err.code = 'ERROR_0005_INVALID_VALUE';
    err.statusCode = 400;
    throw err;
  }

  if (!checkOutDate || checkOutDate <= checkInDate) {
    const err = new Error('Ngày trả phòng phải sau ngày nhận phòng');
    err.code = 'ERROR_0005_INVALID_VALUE';
    err.statusCode = 400;
    throw err;
  }

  // 3. Đếm số phòng vật lý thực tế của loại phòng này
  const physicalRooms = await Room.findAll({
    where: {
      RoomTypeId: roomTypeId,
      IsDeleted: false,
    },
    attributes: ['RoomId', 'RoomNumber', 'Status']
  });

  // Số phòng đang bảo trì / tạm ngưng
  const maintenanceRoomsCount = physicalRooms.filter(r => 
    r.Status === 'Maintenance' || r.Status === 'OutOfOrder'
  ).length;

  const totalPhysicalRooms = physicalRooms.length > 0 
    ? physicalRooms.length 
    : (roomType.TotalRooms || 10); // Fallback nếu chưa seed đủ bảng Rooms

  // 4. Quét Bookings xung đột lịch (Overlap Check)
  // Công thức: NOT (check_out <= start OR check_in >= end)
  // <=> (Booking.CheckInDate < RequestedCheckOut) AND (Booking.CheckOutDate > RequestedCheckIn)
  const overlappingBookings = await Booking.findAll({
    where: {
      RoomTypeId: roomTypeId,
      Status: {
        [Op.in]: ['Confirmed', 'CheckedIn', 'Pending']
      },
      CheckInDate: { [Op.lt]: checkOutDate },
      CheckOutDate: { [Op.gt]: checkInDate }
    },
    attributes: ['BookingId', 'CheckInDate', 'CheckOutDate', 'RoomQuantity', 'Status', 'CreatedAt']
  });

  // Lọc lại các booking Pending: chỉ tính nếu chưa quá 15 phút
  const nowTime = Date.now();
  const validBookings = overlappingBookings.filter(b => {
    if (b.Status === 'Pending') {
      const createdTime = new Date(b.CreatedAt).getTime();
      return (nowTime - createdTime) <= LOCK_TIMEOUT_MS;
    }
    return true;
  });

  // 5. Duyệt qua từng ngày trong khoảng [CheckInDate, CheckOutDate) để tính AvailableCount
  const stayDates = getDatesInRange(checkInDate, checkOutDate);
  const dailyInventory = [];

  for (const dateStr of stayDates) {
    // Đếm số phòng đã đặt trong ngày này
    let bookedRoomsOnDate = 0;
    for (const b of validBookings) {
      if (dateStr >= b.CheckInDate && dateStr < b.CheckOutDate) {
        bookedRoomsOnDate += Number(b.RoomQuantity) || 1;
      }
    }

    // Đếm số phòng bị khóa tạm thời trong ngày này
    const lockedRoomsOnDate = getLockedRoomsForDate(roomTypeId, dateStr, excludeSessionId);

    // Công thức: AvailableCount = Tổng số phòng vật lý - Đã đặt - Đang bảo trì - Đang khóa
    const availableRooms = Math.max(
      0,
      totalPhysicalRooms - bookedRoomsOnDate - maintenanceRoomsCount - lockedRoomsOnDate
    );

    dailyInventory.push({
      date: dateStr,
      totalRooms: totalPhysicalRooms,
      bookedRooms: bookedRoomsOnDate,
      maintenanceRooms: maintenanceRoomsCount,
      lockedRooms: lockedRoomsOnDate,
      availableRooms
    });
  }

  // 6. Số lượng phòng vật lý thực tế còn trống ít nhất trong các ngày lưu trú (MIN theo từng ngày)
  const availableRoomsCount = dailyInventory.length > 0
    ? Math.min(...dailyInventory.map(d => d.availableRooms))
    : 0;

  const isAvailable = availableRoomsCount >= numQuantity;

  // 7. Tính toán bảng tổng tiền (Pricing Summary)
  const numberOfNights = stayDates.length;
  const basePricePerNight = parseFloat(roomType.BasePrice) || 0;
  const roomSubtotal = basePricePerNight * numberOfNights * numQuantity;

  // Ưu đãi hội viên Gold 10% (theo spec wireframe)
  const discountRate = 0.10;
  const discountAmount = Math.round(roomSubtotal * discountRate);
  const discountedSubtotal = roomSubtotal - discountAmount;

  // 8% thuế VAT + 5% phí phục vụ cao cấp
  const vatTaxAmount = Math.round(discountedSubtotal * 0.08);
  const serviceFeeAmount = Math.round(discountedSubtotal * 0.05);
  const totalAmount = discountedSubtotal + vatTaxAmount + serviceFeeAmount;

  const formatVND = (num) => new Intl.NumberFormat('vi-VN').format(num) + '₫';

  const pricingSummary = {
    basePricePerNight,
    numberOfNights,
    roomQuantity: numQuantity,
    roomSubtotal,
    discountRate,
    discountAmount,
    vatTaxAmount,
    serviceFeeAmount,
    totalAmount,
    currency: 'VND',
    formattedBasePrice: formatVND(basePricePerNight),
    formattedSubtotal: formatVND(roomSubtotal),
    formattedDiscount: '-' + formatVND(discountAmount),
    formattedTotal: formatVND(totalAmount)
  };

  return {
    isAvailable,
    availableRoomsCount,
    requestedQuantity: numQuantity,
    roomType: {
      RoomTypeId: roomType.RoomTypeId,
      TypeCode: roomType.TypeCode,
      TypeName: roomType.TypeName,
      Description: roomType.Description,
      BasePrice: basePricePerNight,
      AreaSqm: roomType.AreaSqm,
      BedType: roomType.BedType,
      ViewType: roomType.ViewType,
      AdultCapacity: roomType.AdultCapacity,
      ChildCapacity: roomType.ChildCapacity,
      TotalRooms: totalPhysicalRooms,
      ImageUrl: roomType.ImageUrl,
      Amenities: roomType.Amenities ? JSON.parse(roomType.Amenities) : []
    },
    dailyInventory,
    pricingSummary
  };
}

/**
 * Khóa giao dịch phòng chống Overbooking (Hold Room Lock for 15 minutes)
 * Áp dụng Pessimistic Locking hoặc Atomic Session Check
 */
async function acquireRoomLock({ roomTypeId, checkInDate, checkOutDate, quantity = 1 }) {
  const numQuantity = parseInt(quantity, 10);

  // Kiểm tra phòng trống thời gian thực trước khi khóa
  const check = await checkAvailability({ roomTypeId, checkInDate, checkOutDate, quantity: numQuantity });

  if (check.availableRoomsCount === 0) {
    const err = new Error('Loại phòng này đã hết phòng trống trong khoảng thời gian quý khách chọn');
    err.code = 'ERROR_0022_ROOM_SOLD_OUT';
    err.statusCode = 409;
    err.availableCount = 0;
    throw err;
  }

  if (check.availableRoomsCount < numQuantity) {
    const err = new Error(`Hiện chỉ còn lại ${check.availableRoomsCount} phòng trống, không đủ số lượng quý khách yêu cầu`);
    err.code = 'ERROR_0023_INSUFFICIENT_ROOMS';
    err.statusCode = 409;
    err.availableCount = check.availableRoomsCount;
    throw err;
  }

  // Tạo Lock Session 15 phút
  const lockSessionId = crypto.randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + LOCK_TIMEOUT_MS;

  activeLocks.set(lockSessionId, {
    lockSessionId,
    roomTypeId: Number(roomTypeId),
    checkInDate,
    checkOutDate,
    quantity: numQuantity,
    createdAt,
    expiresAt
  });

  const lockData = {
    lockSessionId,
    expiresAt: new Date(expiresAt).toISOString(),
    timeoutSeconds: Math.floor(LOCK_TIMEOUT_MS / 1000),
    pricingSummary: check.pricingSummary,
    roomType: check.roomType
  };

  // Lưu phiên giữ phòng trực tiếp vào MySQL Database (Persistence)
  try {
    await Booking.create({
      UserId: 1,
      RoomTypeId: Number(roomTypeId),
      CheckInDate: checkInDate,
      CheckOutDate: checkOutDate,
      RoomQuantity: numQuantity,
      Status: 'Pending',
      BookingSource: 'HoldLock',
      ConfirmationCode: `HOLD-${lockSessionId}`,
      RoomSubtotal: check.pricingSummary.roomSubtotal,
      TotalAmount: check.pricingSummary.totalAmount
    });
  } catch (dbErr) {
    console.warn('⚠️ Ghi hold lock vào MySQL:', dbErr.message);
  }

  broadcastRoomEvent('ROOM_LOCK_ACQUIRED', {
    lockSessionId,
    roomTypeId: Number(roomTypeId),
    checkInDate,
    checkOutDate,
    quantity: numQuantity,
    expiresAt: lockData.expiresAt
  });

  return lockData;
}

/**
 * Nhả khóa phòng thủ công (khi khách hủy hoặc hoàn tất thanh toán)
 */
function releaseRoomLock(lockSessionId) {
  // Cập nhật trạng thái hủy giữ chỗ trong MySQL Database
  try {
    Booking.update(
      { Status: 'Cancelled' },
      { where: { ConfirmationCode: `HOLD-${lockSessionId}` } }
    ).catch(() => {});
  } catch (_) {}

  if (activeLocks.has(lockSessionId)) {
    const lock = activeLocks.get(lockSessionId);
    activeLocks.delete(lockSessionId);
    broadcastRoomEvent('ROOM_LOCK_RELEASED', { lockSessionId, roomTypeId: lock?.roomTypeId, reason: 'MANUAL' });
    return true;
  }
  return false;
}

/**
 * Lấy thông tin lock session
 */
function getRoomLock(lockSessionId) {
  const lock = activeLocks.get(lockSessionId);
  if (!lock) return null;
  if (lock.expiresAt <= Date.now()) {
    activeLocks.delete(lockSessionId);
    return null;
  }
  return lock;
}

module.exports = {
  checkAvailability,
  acquireRoomLock,
  releaseRoomLock,
  getRoomLock,
  LOCK_TIMEOUT_MS
};
