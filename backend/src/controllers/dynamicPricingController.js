'use strict';

/**
 * controllers/dynamicPricingController.js
 * 
 * TÍNH NĂNG 12: ĐIỀU CHỈNH GIÁ PHÒNG LINH HOẠT THEO THỜI ĐIỂM (DYNAMIC PRICING ENGINE)
 * Mã tính năng: FEAT-GUEST-12  |  Mã truy vết Bảng 3: A12
 * Endpoint: GET /api/v1/rooms/{roomId}/pricing
 */

const dynamicPricingService = require('../services/dynamicPricingService');

/**
 * GET /api/v1/rooms/:roomId/pricing
 * Query params: checkInDate, checkOutDate
 */
exports.getRoomDynamicPricing = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0043_PRICING_RULE_ERROR',
        errorCode: 'ERROR_0043_PRICING_RULE_ERROR',
        message: 'Không thể áp dụng bảng giá động cho khoảng thời gian này'
      });
    }

    const pricingResult = await dynamicPricingService.calculateDynamicPricing({
      roomId,
      checkInDate,
      checkOutDate
    });

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0008_PRICING_CALCULATED',
      message: 'Tính toán giá phòng theo thời điểm thành công',
      data: pricingResult
    });
  } catch (error) {
    console.error('Lỗi tính toán dynamic pricing:', error);
    return res.status(400).json({
      success: false,
      code: error.code || 'ERROR_0043_PRICING_RULE_ERROR',
      errorCode: error.code || 'ERROR_0043_PRICING_RULE_ERROR',
      message: error.message || 'Không thể áp dụng bảng giá động cho khoảng thời gian này'
    });
  }
};

