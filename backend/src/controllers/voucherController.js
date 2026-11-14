'use strict';

const { Op } = require('sequelize');
const { sequelize, Voucher, Booking } = require('../models');

let defaultVouchersPromise = null;

async function ensureDefaultVouchers() {
  if (defaultVouchersPromise) return defaultVouchersPromise;
  defaultVouchersPromise = (async () => {
    try {
      const now = new Date();
      const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const pastStart = new Date('2020-01-01T00:00:00Z');
      const pastEnd = new Date('2020-12-31T23:59:59Z');
      const seeds = [
        {
          Code: 'SUMMER20',
          DiscountType: 'Percentage',
          DiscountValue: 20,
          MinOrderAmount: 3000000,
          MaxDiscountAmount: 1000000,
          StartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          EndDate: nextYear,
          UsageLimit: 1000,
          UsedCount: 0,
          Status: 'Active',
          IsDeleted: false
        },
        {
          Code: 'ELITE10',
          DiscountType: 'Percentage',
          DiscountValue: 10,
          MinOrderAmount: 2000000,
          MaxDiscountAmount: 2000000,
          StartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          EndDate: nextYear,
          UsageLimit: 2000,
          UsedCount: 0,
          Status: 'Active',
          IsDeleted: false
        },
        {
          Code: 'HORIZON500',
          DiscountType: 'Fixed',
          DiscountValue: 500000,
          MinOrderAmount: 2500000,
          MaxDiscountAmount: 500000,
          StartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          EndDate: nextYear,
          UsageLimit: 1000,
          UsedCount: 0,
          Status: 'Active',
          IsDeleted: false
        },
        {
          Code: 'VIPMILLION',
          DiscountType: 'Fixed',
          DiscountValue: 1000000,
          MinOrderAmount: 10000000,
          MaxDiscountAmount: 1000000,
          StartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          EndDate: nextYear,
          UsageLimit: 500,
          UsedCount: 0,
          Status: 'Active',
          IsDeleted: false
        },
        {
          Code: 'EXPIRED2020',
          DiscountType: 'Percentage',
          DiscountValue: 15,
          MinOrderAmount: 1000000,
          MaxDiscountAmount: 500000,
          StartDate: pastStart,
          EndDate: pastEnd,
          UsageLimit: 100,
          UsedCount: 0,
          Status: 'Active',
          IsDeleted: false
        },
        {
          Code: 'SOLDOUT10',
          DiscountType: 'Percentage',
          DiscountValue: 10,
          MinOrderAmount: 1000000,
          MaxDiscountAmount: 500000,
          StartDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          EndDate: nextYear,
          UsageLimit: 5,
          UsedCount: 5,
          Status: 'Active',
          IsDeleted: false
        }
      ];

      for (const item of seeds) {
        const existing = await Voucher.findOne({ where: { Code: item.Code } });
        if (!existing) {
          await Voucher.create(item);
        }
      }
    } catch (err) {
      console.error('Lỗi seed voucher mặc định:', err.message);
      defaultVouchersPromise = null;
    }
  })();
  return defaultVouchersPromise;
}

exports.ensureDefaultVouchers = ensureDefaultVouchers;
setTimeout(() => { ensureDefaultVouchers().catch(() => {}); }, 2500);

/**
 * Helper định dạng tiền tệ hiển thị cho thông báo voucher
 */
function formatVoucherDiscountDisplay(voucher, discountAmount, isUSD = false) {
  const type = String(voucher.DiscountType || '').toLowerCase();
  if (type.includes('percent')) {
    return `${parseFloat(voucher.DiscountValue)}%`;
  }
  if (isUSD) {
    return `$${parseFloat(discountAmount).toFixed(2)}`;
  }
  return `${Math.round(discountAmount).toLocaleString('vi-VN')}đ`;
}

/**
 * ─── TÍNH NĂNG 7: ÁP DỤNG MÃ GIẢM GIÁ VÀ VOUCHER KHUYẾN MÃI (FEAT-GUEST-07 / A7) ───
 * Hàm kiểm tra hợp lệ và tính toán số tiền giảm giá của Voucher
 */
function evaluateVoucherRules(voucher, bookingTotal, isUSD = false) {
  const now = new Date();

  // 1. Kiểm tra tồn tại, bị xóa hoặc trạng thái
  if (!voucher || voucher.IsDeleted || voucher.Status !== 'Active') {
    return {
      isValid: false,
      status: 404,
      code: 'ERROR_0026_VOUCHER_NOT_FOUND',
      message: 'Mã giảm giá không tồn tại hoặc đã nhập sai'
    };
  }

  // 2. Kiểm tra thời hạn hiệu lực (StartDate, EndDate)
  if (voucher.StartDate && new Date(voucher.StartDate) > now) {
    return {
      isValid: false,
      status: 400,
      code: 'ERROR_0027_VOUCHER_EXPIRED',
      message: 'Mã giảm giá đã hết hạn sử dụng'
    };
  }
  if (voucher.EndDate && new Date(voucher.EndDate) < now) {
    return {
      isValid: false,
      status: 400,
      code: 'ERROR_0027_VOUCHER_EXPIRED',
      message: 'Mã giảm giá đã hết hạn sử dụng'
    };
  }

  // 3. Kiểm tra số lượng lượt sử dụng (UsageLimit vs UsedCount)
  const usageLimit = parseInt(voucher.UsageLimit, 10);
  const usedCount = parseInt(voucher.UsedCount, 10) || 0;
  if (!isNaN(usageLimit) && usageLimit > 0 && usedCount >= usageLimit) {
    return {
      isValid: false,
      status: 400,
      code: 'ERROR_0028_VOUCHER_LIMIT_REACHED',
      message: 'Mã khuyến mãi đã hết lượt sử dụng'
    };
  }

  // 4. Kiểm tra điều kiện giá trị đơn tối thiểu (MinOrderAmount)
  const total = parseFloat(bookingTotal) || 0;
  const minOrder = parseFloat(voucher.MinOrderAmount) || 0;
  if (total < minOrder) {
    return {
      isValid: false,
      status: 400,
      code: 'ERROR_0029_VOUCHER_MIN_NOT_MET',
      message: 'Đơn đặt phòng chưa đạt giá trị tối thiểu để áp dụng mã này'
    };
  }

  // 5. Tính toán mức giảm
  const discountType = String(voucher.DiscountType || '').toLowerCase();
  const discountVal = parseFloat(voucher.DiscountValue) || 0;
  let discountAmount = 0;

  if (discountType.includes('percent')) {
    discountAmount = (total * discountVal) / 100;
    const maxDiscount = parseFloat(voucher.MaxDiscountAmount);
    if (!isNaN(maxDiscount) && maxDiscount > 0 && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else {
    // Fixed amount
    discountAmount = Math.min(total, discountVal);
  }

  discountAmount = isUSD 
    ? Math.round(discountAmount * 100) / 100 
    : Math.round(discountAmount);

  const discountDisplay = formatVoucherDiscountDisplay(voucher, discountAmount, isUSD);
  const newBookingTotal = Math.max(0, isUSD ? Math.round((total - discountAmount) * 100) / 100 : Math.round(total - discountAmount));

  return {
    isValid: true,
    discountAmount,
    discountDisplay,
    newBookingTotal,
    discountType: voucher.DiscountType,
    discountValue: voucher.DiscountValue,
    voucherId: voucher.VoucherId,
    voucherCode: voucher.Code
  };
}

/**
 * 1. POST /bookings/apply-voucher hoặc /api/v1/vouchers/validate
 * Kiểm tra mã và tính số tiền giảm giá theo thời gian thực (Trước khi tạo booking)
 */
exports.validateVoucher = async (req, res) => {
  try {
    const rawCode = req.body.voucherCode || req.body.code;
    const bookingTotal = parseFloat(req.body.bookingTotal || req.body.totalAmount || req.body.roomSubtotal);
    const currency = req.body.currency || 'VND';
    const isUSD = currency === 'USD' || (bookingTotal < 5000 && bookingTotal > 0);

    if (!rawCode) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0026_VOUCHER_NOT_FOUND',
        message: 'Mã giảm giá không tồn tại hoặc đã nhập sai'
      });
    }

    const cleanCode = String(rawCode).trim().toUpperCase();

    // Tìm voucher theo Code
    const voucher = await Voucher.findOne({
      where: {
        Code: cleanCode,
        IsDeleted: false
      }
    });

    const evalResult = evaluateVoucherRules(voucher, bookingTotal, isUSD);
    if (!evalResult.isValid) {
      return res.status(evalResult.status).json({
        success: false,
        code: evalResult.code,
        message: evalResult.message
      });
    }

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_VOUCHER_APPLIED',
      message: `Áp dụng mã giảm giá thành công! Quý khách được giảm ${evalResult.discountDisplay}`,
      data: {
        voucherId: evalResult.voucherId,
        voucherCode: evalResult.voucherCode,
        discountType: evalResult.discountType,
        discountValue: evalResult.discountValue,
        discountAmount: evalResult.discountAmount,
        discountDisplay: evalResult.discountDisplay,
        originalTotal: bookingTotal,
        newBookingTotal: evalResult.newBookingTotal
      }
    });
  } catch (err) {
    console.error('Lỗi khi kiểm tra voucher:', err);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Đã xảy ra sự cố máy chủ khi kiểm tra mã giảm giá'
    });
  }
};

/**
 * 2. POST /bookings/:bookingId/apply-voucher
 * Áp dụng mã giảm giá vào đơn đặt phòng cụ thể (Atomic Update + Concurrency Safe)
 */
exports.applyVoucherToBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { bookingId } = req.params;
    const rawCode = req.body.voucherCode || req.body.code;

    if (!rawCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0026_VOUCHER_NOT_FOUND',
        message: 'Mã giảm giá không tồn tại hoặc đã nhập sai'
      });
    }

    const cleanCode = String(rawCode).trim().toUpperCase();

    // 1. Tìm đơn đặt phòng
    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_BOOKING_NOT_FOUND',
        message: 'Không tìm thấy thông tin đơn đặt phòng'
      });
    }

    if (booking.Status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_INVALID_STATUS',
        message: 'Chỉ có thể áp dụng mã giảm giá cho đơn đặt phòng ở trạng thái Chờ xử lý'
      });
    }

    // 2. Tìm voucher
    const voucher = await Voucher.findOne({
      where: {
        Code: cleanCode,
        IsDeleted: false
      },
      transaction
    });

    const isUSD = parseFloat(booking.TotalAmount) < 5000 && parseFloat(booking.TotalAmount) > 0;
    const evalTotal = parseFloat(booking.RoomSubtotal) || parseFloat(booking.TotalAmount);
    const evalResult = evaluateVoucherRules(voucher, evalTotal, isUSD);

    if (!evalResult.isValid) {
      await transaction.rollback();
      return res.status(evalResult.status).json({
        success: false,
        code: evalResult.code,
        message: evalResult.message
      });
    }

    // 3. Concurrency Protection & Atomic update UsedCount
    // Tăng UsedCount an toàn với WHERE (UsageLimit IS NULL OR UsageLimit = 0 OR UsedCount < UsageLimit)
    const [affectedCount] = await Voucher.update(
      { UsedCount: sequelize.literal('UsedCount + 1') },
      {
        where: {
          VoucherId: voucher.VoucherId,
          [Op.or]: [
            { UsageLimit: null },
            { UsageLimit: 0 },
            { UsedCount: { [Op.lt]: voucher.UsageLimit } }
          ]
        },
        transaction
      }
    );

    if (affectedCount === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0028_VOUCHER_LIMIT_REACHED',
        message: 'Mã khuyến mãi đã hết lượt sử dụng'
      });
    }

    // Nếu booking đã có VoucherId cũ khác với voucher mới, hoàn trả lượt cho voucher cũ
    if (booking.VoucherId && booking.VoucherId !== voucher.VoucherId) {
      await Voucher.update(
        { UsedCount: sequelize.literal('GREATEST(0, UsedCount - 1)') },
        { where: { VoucherId: booking.VoucherId }, transaction }
      );
    }

    // 4. Tính toán lại tổng tiền phòng sau giảm giá
    const discountAmount = evalResult.discountAmount;
    const roomSubtotal = parseFloat(booking.RoomSubtotal) || evalTotal;
    const surchargeAmount = parseFloat(booking.SurchargeAmount) || 0;
    const preTax = Math.max(0, roomSubtotal - discountAmount + surchargeAmount);
    const totalAmount = Math.round(preTax * 1.12 * 100) / 100;
    const depositAmount = Math.round(totalAmount * 0.20 * 100) / 100;

    await booking.update({
      VoucherId: voucher.VoucherId,
      DiscountAmount: discountAmount,
      TotalAmount: totalAmount,
      DepositAmount: depositAmount
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_VOUCHER_APPLIED',
      message: `Áp dụng mã giảm giá thành công! Quý khách được giảm ${evalResult.discountDisplay}`,
      data: {
        bookingId: booking.BookingId,
        voucherId: voucher.VoucherId,
        voucherCode: voucher.Code,
        discountAmount,
        discountDisplay: evalResult.discountDisplay,
        roomSubtotal,
        totalAmount,
        depositAmount
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Lỗi khi áp dụng voucher vào booking:', err);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Đã xảy ra sự cố máy chủ khi áp dụng mã giảm giá'
    });
  }
};

/**
 * 3. GET /api/v1/vouchers/available
 * Danh sách các mã khuyến mãi đang hoạt động để hiển thị gợi ý cho khách hàng
 */
exports.getAvailableVouchers = async (req, res) => {
  try {
    await ensureDefaultVouchers();
    const now = new Date();
    const vouchers = await Voucher.findAll({
      where: {
        IsDeleted: false,
        Status: 'Active',
        [Op.and]: [
          {
            [Op.or]: [
              { StartDate: null },
              { StartDate: { [Op.lte]: now } }
            ]
          },
          {
            [Op.or]: [
              { EndDate: null },
              { EndDate: { [Op.gte]: now } }
            ]
          },
          sequelize.literal('COALESCE(UsageLimit, 0) = 0 OR UsedCount < UsageLimit')
        ]
      },
      attributes: ['VoucherId', 'Code', 'DiscountType', 'DiscountValue', 'MinOrderAmount', 'MaxDiscountAmount', 'EndDate'],
      order: [['DiscountValue', 'DESC']],
      limit: 6
    });

    return res.status(200).json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách voucher:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách voucher'
    });
  }
};
