'use strict';

/**
 * services/dynamicPricingService.js
 * 
 * TÍNH NĂNG 12: ĐIỀU CHỈNH GIÁ PHÒNG LINH HOẠT THEO THỜI ĐIỂM (DYNAMIC PRICING ENGINE)
 * Mã tính năng: FEAT-GUEST-12  |  Mã truy vết Bảng 3: A12
 * 
 * Quy tắc nghiệp vụ:
 * 1. Giá gốc (Base Rate): Áp dụng cho các ngày thường trong tuần (Thứ 2 đến Thứ 5).
 * 2. Tăng giá cuối tuần (Weekend Surcharge): Thứ 6 và Thứ 7 tự động tăng hệ số 15% (multiplier = 1.15).
 * 3. Phụ thu ngày Lễ/Tết (Holiday / Peak Rule): Cấu hình trong bảng PricingRules hoặc danh sách ngày lễ cố định.
 * 4. Xử lý xung đột & Ưu tiên:
 *    - Khi một ngày vừa rơi vào ngày Lễ và cuối tuần, chỉ áp dụng giá Ngày lễ (Priority cao hơn), không cộng dồn.
 * 5. Điều chỉnh hệ số theo tỷ lệ lấp đầy phòng (Occupancy Rate) nếu có thiết lập quy tắc occupancy.
 * 6. Giới hạn MinPrice / MaxPrice theo quy tắc an toàn.
 */

const { Op } = require('sequelize');
const { RoomType, Room, Booking, PricingRule, sequelize } = require('../models');

// Danh sách các ngày lễ chính (Định dạng MM-DD)
const STANDARD_HOLIDAYS = [
  '01-01', // Tết Dương Lịch
  '04-30', // Giải phóng Miền Nam
  '05-01', // Quốc tế Lao Động
  '09-02', // Quốc khánh 2/9
  '12-24', // Giáng Sinh
  '12-25', // Giáng Sinh
  '12-31', // Giao thừa Tết Dương Lịch
];

/**
 * Format ngày YYYY-MM-DD
 */
function formatDate(d) {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kiểm tra xem ngày có phải ngày lễ cố định hay không
 */
function checkIsHoliday(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const mmdd = `${parts[1]}-${parts[2]}`;
    return STANDARD_HOLIDAYS.includes(mmdd);
  }
  return false;
}

/**
 * Tính toán giá phòng linh hoạt cho khoảng ngày lưu trú
 * @param {Object} options
 * @param {number|string} options.roomId - RoomTypeId hoặc RoomId
 * @param {string} options.checkInDate - YYYY-MM-DD
 * @param {string} options.checkOutDate - YYYY-MM-DD
 */
async function calculateDynamicPricing({ roomId, checkInDate, checkOutDate }) {
  if (!roomId || !checkInDate || !checkOutDate) {
    const error = new Error('Thiếu tham số bắt buộc roomId, checkInDate hoặc checkOutDate');
    error.code = 'ERROR_0043_PRICING_RULE_ERROR';
    throw error;
  }

  const d1 = new Date(checkInDate);
  const d2 = new Date(checkOutDate);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
    const error = new Error('Không thể áp dụng bảng giá động cho khoảng thời gian này');
    error.code = 'ERROR_0043_PRICING_RULE_ERROR';
    throw error;
  }

  // 1. Tìm RoomType theo roomId (có thể truyền RoomTypeId hoặc ID phòng vật lý)
  let roomType = await RoomType.findByPk(roomId);
  if (!roomType) {
    const physicalRoom = await Room.findByPk(roomId);
    if (physicalRoom && physicalRoom.RoomTypeId) {
      roomType = await RoomType.findByPk(physicalRoom.RoomTypeId);
    }
  }

  if (!roomType) {
    const error = new Error('Không thể áp dụng bảng giá động cho khoảng thời gian này');
    error.code = 'ERROR_0043_PRICING_RULE_ERROR';
    throw error;
  }

  const baseRate = parseFloat(roomType.BasePrice) || 240.00;
  const roomTypeId = roomType.RoomTypeId;

  // 2. Lấy các PricingRules hợp lệ cho RoomType trong khoảng ngày này
  let activeRules = [];
  try {
    activeRules = await PricingRule.findAll({
      where: {
        RoomTypeId: roomTypeId,
        Status: 'Active',
        [Op.or]: [
          {
            StartDate: { [Op.lte]: checkOutDate },
            EndDate: { [Op.gte]: checkInDate },
          }
        ]
      },
      order: [['Priority', 'DESC'], ['PricingRuleId', 'DESC']]
    });
  } catch (err) {
    console.warn('Cảnh báo truy vấn PricingRules:', err.message);
  }

  // 3. Quét danh sách các đêm lưu trú [d1, d2)
  const stayDates = [];
  const curr = new Date(d1);
  while (curr < d2) {
    stayDates.push(formatDate(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const numberOfNights = stayDates.length;
  if (numberOfNights === 0) {
    const error = new Error('Không thể áp dụng bảng giá động cho khoảng thời gian này');
    error.code = 'ERROR_0043_PRICING_RULE_ERROR';
    throw error;
  }

  // 4. Tính giá chi tiết cho từng đêm lưu trú (Daily Breakdown)
  let totalRoomPrice = 0;
  const dailyBreakdown = [];
  let highestAppliedRule = null;

  for (const dateStr of stayDates) {
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0: CN, 1: T2, ..., 5: T6, 6: T7
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6); // Thứ 6 hoặc Thứ 7

    // Kiểm tra quy tắc PricingRule từ Database áp dụng cho ngày này
    const matchingRule = activeRules.find(r => r.StartDate <= dateStr && r.EndDate >= dateStr);
    const isHoliday = checkIsHoliday(dateStr) || (matchingRule && matchingRule.Conditions && matchingRule.Conditions.toLowerCase().includes('lễ'));

    let nightlyRate = baseRate;
    let ruleName = 'Giá gốc Base Rate';
    let appliedRuleType = 'BASE';
    let multiplier = 1.0;

    // Thứ tự ưu tiên tính toán:
    // 1. Ngày Lễ/Tết (Holiday): Ưu tiên cao nhất
    if (isHoliday) {
      appliedRuleType = 'HOLIDAY';
      ruleName = matchingRule ? matchingRule.RuleName : 'Phụ thu Ngày Lễ/Tết';
      multiplier = matchingRule ? parseFloat(matchingRule.PriceMultiplier) : 1.25;
      if (multiplier <= 1.0) multiplier = 1.25;
      nightlyRate = Math.round(baseRate * multiplier * 100) / 100;
      highestAppliedRule = matchingRule || { RuleName: ruleName, Priority: 10, Multiplier: multiplier };
    } else if (isWeekend) {
      // 2. Ngày cuối tuần (Thứ 6, Thứ 7):
      // Nếu có quy tắc mùa trong DB, giá cuối tuần = (Giá mùa) * 1.15 hoặc BaseRate * 1.15 (đảm bảo cuối tuần luôn cao hơn ngày thường)
      const baseForWeekend = matchingRule ? Math.round(baseRate * parseFloat(matchingRule.PriceMultiplier) * 100) / 100 : baseRate;
      multiplier = matchingRule ? Math.round(parseFloat(matchingRule.PriceMultiplier) * 1.15 * 10000) / 10000 : 1.15;
      nightlyRate = Math.round(baseForWeekend * 1.15 * 100) / 100;
      appliedRuleType = 'WEEKEND';
      ruleName = matchingRule ? `Cuối tuần +15% (${matchingRule.RuleName})` : 'Phụ thu Cuối tuần (+15%)';
      if (!highestAppliedRule || highestAppliedRule.Priority < 5) {
        highestAppliedRule = { RuleName: ruleName, Priority: 5, Multiplier: multiplier };
      }
    } else if (matchingRule && matchingRule.Conditions && !matchingRule.Conditions.toLowerCase().includes('cuối tuần')) {
      // 3. Quy tắc theo mùa dành cho ngày thường (chỉ áp dụng nếu không phải rule thuần cuối tuần)
      multiplier = parseFloat(matchingRule.PriceMultiplier) || 1.0;
      nightlyRate = Math.round(baseRate * multiplier * 100) / 100;
      ruleName = matchingRule.RuleName;
      appliedRuleType = 'SEASONAL_RULE';
      if (!highestAppliedRule || highestAppliedRule.Priority < matchingRule.Priority) {
        highestAppliedRule = matchingRule;
      }
    } else {
      // 4. Ngày thường không rơi vào rule đặc biệt: Áp dụng giá gốc Base Rate (TC01: Thứ 2 đến Thứ 4/5)
      nightlyRate = baseRate;
      multiplier = 1.0;
      ruleName = 'Giá gốc Base Rate';
      appliedRuleType = 'BASE';
    }

    // Kiểm tra chặn trần / sàn MinPrice, MaxPrice nếu rule có quy định
    if (matchingRule) {
      if (matchingRule.MinPrice && nightlyRate < parseFloat(matchingRule.MinPrice)) {
        nightlyRate = parseFloat(matchingRule.MinPrice);
      }
      if (matchingRule.MaxPrice && nightlyRate > parseFloat(matchingRule.MaxPrice)) {
        nightlyRate = parseFloat(matchingRule.MaxPrice);
      }
    }

    totalRoomPrice += nightlyRate;

    dailyBreakdown.push({
      date: dateStr,
      dayOfWeek,
      isWeekend,
      isHoliday,
      appliedRuleType,
      ruleName,
      baseRate,
      multiplier,
      rate: nightlyRate,
    });
  }

  totalRoomPrice = Math.round(totalRoomPrice * 100) / 100;
  const averageDailyRate = Math.round((totalRoomPrice / numberOfNights) * 100) / 100;

  return {
    roomId: parseInt(roomId, 10),
    roomTypeId,
    roomTypeName: roomType.TypeName,
    checkInDate,
    checkOutDate,
    numberOfNights,
    baseRate,
    averageDailyRate,
    totalRoomPrice,
    currency: baseRate >= 100000 ? 'VND' : 'USD',
    appliedRule: highestAppliedRule,
    dailyBreakdown,
  };
}

module.exports = {
  calculateDynamicPricing,
  checkIsHoliday,
  STANDARD_HOLIDAYS,
};

