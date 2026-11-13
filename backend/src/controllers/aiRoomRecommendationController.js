'use strict';

const aiRoomRecommendationService = require('../services/aiRoomRecommendationService');

/**
 * POST /api/v1/guest/rooms/ai-recommend
 * Gợi ý phòng thông minh dựa trên Ngân sách, Phong cách nghỉ dưỡng và Lịch sử khách hàng
 */
const getAiRoomRecommendations = async (req, res) => {
  try {
    const { maxBudget, travelStyle, guests, customPrompt } = req.body || {};
    const userId = req.user?.userId || req.user?.id || null;

    const result = await aiRoomRecommendationService.recommendRooms({
      userId,
      maxBudget,
      travelStyle,
      guests,
      customPrompt
    });

    return res.status(200).json({
      success: true,
      message: 'Gợi ý phòng thông minh từ AI thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi gọi AI gợi ý phòng:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_5000_AI_RECOMMENDATION_FAILED',
      message: 'Không thể tạo gợi ý phòng từ AI. Vui lòng thử lại sau.'
    });
  }
};

module.exports = {
  getAiRoomRecommendations
};
