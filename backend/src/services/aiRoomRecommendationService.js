'use strict';

const { RoomType, Booking, Amenity } = require('../models');

/**
 * Gọi Google Gemini REST API khi có API KEY
 */
async function callGeminiApiForRecommendation(prompt, candidateRooms = [], userContext = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;

  const modelsToTry = [
    process.env.AI_MODEL || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest'
  ];

  const systemInstruction = `Bạn là Trợ lý Cố vấn Phòng Nghỉ Dưỡng Cao Cấp (AI Luxury Room Advisor) của khách sạn Grand Horizon.
Nhiệm vụ:
1. Dựa trên NGÂN SÁCH, PHONG CÁCH NGHỈ DƯỠNG và LỊCH SỬ ĐẶT PHÒNG của khách (nếu có), phân tích danh sách các phòng thực tế được cung cấp.
2. Chọn ra 2 đến 3 phòng phù hợp nhất.
3. Bắt buộc trả về đúng định dạng JSON thuần (KHÔNG kèm cú pháp markdown, không kèm \`\`\`json):
{
  "summaryGreeting": "Lời chào ấm áp, ngắn gọn (1-2 câu) nêu rõ lý do AI đề xuất những lựa chọn này dựa trên tiêu chí ngân sách và sở thích của khách",
  "recommendations": [
    {
      "roomTypeId": 1,
      "matchScore": 98,
      "badge": "Phù hợp ngân sách nhất / View biển lý tưởng",
      "aiReason": "1-2 câu giải thích vì sao phòng này tối ưu nhất cho khách"
    }
  ]
}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `THÔNG TIN KHÁCH HÀNG:
- Ngân sách tối đa/đêm: ${userContext.maxBudget ? Number(userContext.maxBudget).toLocaleString('vi-VN') + ' VND' : 'Không giới hạn'}
- Phong cách mong muốn: ${userContext.travelStyle || 'Tự do / Thư giãn'}
- Số khách dự kiến: ${userContext.guests || 2}
- Yêu cầu thêm: ${userContext.customPrompt || 'Không'}
- Lịch sử đặt phòng: ${userContext.hasHistory ? `Đã từng đặt ${userContext.pastBookingsCount} lần, mức chi trung bình: ${Number(userContext.avgPastSpend).toLocaleString('vi-VN')} VND/đêm, các phòng từng ở: ${userContext.pastRoomNames.join(', ')}` : 'Khách hàng mới chưa có lịch sử'}

DANH SÁCH PHÒNG THỰC TẾ ĐANG KHẢ DỤNG:
${candidateRooms.map(r => `- ID: ${r.RoomTypeId} | Tên: ${r.TypeName} | Giá: ${Number(r.BasePrice).toLocaleString('vi-VN')} VND/đêm | Sức chứa: ${r.MaxOccupancy} người | Mô tả: ${r.Description}`).join('\n')}
`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 800,
      responseMimeType: 'application/json'
    }
  };

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          try {
            const parsed = JSON.parse(candidateText.trim());
            return parsed;
          } catch (_) {
            const clean = candidateText.replace(/^```json/i, '').replace(/```$/i, '').trim();
            return JSON.parse(clean);
          }
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[GeminiRecommendation] Model ${model} failed:`, err.message);
    }
  }

  return null;
}

/**
 * Thuật toán Smart RAG Fallback (chạy khi không có API key hoặc mạng ngoài lỗi)
 */
function smartRuleBasedRecommendation(candidateRooms = [], userContext = {}) {
  const maxBudget = Number(userContext.maxBudget) || Infinity;
  const travelStyle = (userContext.travelStyle || '').toLowerCase();
  const customPrompt = (userContext.customPrompt || '').toLowerCase();

  const scoredRooms = candidateRooms.map(room => {
    let score = 50;
    const price = Number(room.BasePrice) || 0;
    const typeName = (room.TypeName || '').toLowerCase();
    const desc = (room.Description || '').toLowerCase();

    // 1. Chấm điểm theo ngân sách
    if (price <= maxBudget) {
      score += 30;
      // Nếu ngân sách rộng và chọn phòng gần ngân sách
      if (maxBudget !== Infinity && price >= maxBudget * 0.6) {
        score += 10;
      }
    } else {
      score -= 20;
    }

    // 2. Chấm điểm theo phong cách & yêu cầu thêm
    if (travelStyle.includes('biển') || customPrompt.includes('biển') || customPrompt.includes('ocean')) {
      if (typeName.includes('ocean') || typeName.includes('biển') || desc.includes('biển')) score += 15;
    }
    if (travelStyle.includes('villa') || customPrompt.includes('villa') || customPrompt.includes('hồ bơi')) {
      if (typeName.includes('villa') || desc.includes('hồ bơi') || desc.includes('pool')) score += 15;
    }
    if (travelStyle.includes('gia đình') || travelStyle.includes('family')) {
      if (room.MaxOccupancy >= 4 || typeName.includes('family') || desc.includes('2-bedroom')) score += 15;
    }
    if (travelStyle.includes('cặp đôi') || travelStyle.includes('trăng mật') || customPrompt.includes('lãng mạn')) {
      if (typeName.includes('suite') || desc.includes('jacuzzi') || desc.includes('hoàng hôn')) score += 15;
    }

    // 3. Khớp lịch sử khách hàng
    if (userContext.hasHistory && userContext.avgPastSpend > 0) {
      const spendDiff = Math.abs(price - userContext.avgPastSpend) / userContext.avgPastSpend;
      if (spendDiff <= 0.3) score += 10;
    }

    const matchScore = Math.min(99, Math.max(75, Math.round(score)));

    let badge = 'Lựa chọn tiêu chuẩn';
    let aiReason = `Thiết kế thanh lịch, giá ${price.toLocaleString('vi-VN')}đ/đêm phù hợp tối ưu với tiêu chuẩn nghỉ dưỡng của quý khách.`;

    if (typeName.includes('villa') || typeName.includes('pool')) {
      badge = 'Trải nghiệm riêng tư biệt lập';
      aiReason = `Hồ bơi riêng biệt và không gian rộng rãi, cực kỳ lý tưởng cho kỳ nghỉ dưỡng cao cấp theo gu của bạn.`;
    } else if (typeName.includes('ocean') || typeName.includes('biển')) {
      badge = 'Tầm nhìn biển ngoạn mục';
      aiReason = `Ban công hướng trọn đại dương lam ngọc, thỏa mãn hoàn hảo sở thích ngắm biển và thư giãn.`;
    } else if (price <= maxBudget) {
      badge = 'Tối ưu ngân sách nhất';
      aiReason = `Mức giá hợp lý chỉ ${price.toLocaleString('vi-VN')}đ/đêm với đầy đủ tiện nghi 5 sao chuẩn mực.`;
    }

    return {
      roomTypeId: room.RoomTypeId,
      matchScore,
      badge,
      aiReason
    };
  });

  // Sắp xếp theo điểm tương thích giảm dần
  scoredRooms.sort((a, b) => b.matchScore - a.matchScore);

  let greeting = 'AI Concierge đã tổng hợp các lựa chọn phòng nghỉ dưỡng phù hợp nhất theo ngân sách và phong cách mong muốn của quý khách.';
  if (userContext.hasHistory) {
    greeting = `Chào mừng quý khách trở lại! Dựa trên ${userContext.pastBookingsCount} kỳ nghỉ trước cùng mức ngân sách hiện tại, AI đã lựa chọn những phòng tối ưu nhất cho bạn.`;
  }

  return {
    summaryGreeting: greeting,
    recommendations: scoredRooms.slice(0, 3)
  };
}

/**
 * Service chính: RAG + Gemini AI gợi ý phòng
 */
async function recommendRooms({ userId = null, maxBudget, travelStyle, guests = 2, customPrompt = '' }) {
  // 1. RAG: Lấy lịch sử đặt phòng của User (nếu có userId)
  let userContext = {
    hasHistory: false,
    pastBookingsCount: 0,
    avgPastSpend: 0,
    pastRoomNames: [],
    maxBudget: maxBudget ? Number(maxBudget) : null,
    travelStyle: travelStyle || '',
    guests: Number(guests) || 2,
    customPrompt: customPrompt || ''
  };

  if (userId) {
    try {
      const pastBookings = await Booking.findAll({
        where: { UserId: userId, IsDeleted: false },
        limit: 5,
        order: [['CreatedAt', 'DESC']]
      });

      if (pastBookings && pastBookings.length > 0) {
        userContext.hasHistory = true;
        userContext.pastBookingsCount = pastBookings.length;
        const total = pastBookings.reduce((sum, b) => sum + (Number(b.RoomSubtotal) || Number(b.TotalAmount) || 0), 0);
        userContext.avgPastSpend = Math.round(total / pastBookings.length);
      }
    } catch (err) {
      console.warn('[RAG] Không thể đọc lịch sử booking:', err.message);
    }
  }

  // 2. RAG: Lấy danh sách các loại phòng đang hoạt động trong DB
  const rawRooms = await RoomType.findAll({
    where: { IsDeleted: false, Status: 'Active' },
    limit: 30,
    order: [['RoomTypeId', 'ASC']]
  });

  const candidateRooms = rawRooms.map(r => ({
    RoomTypeId: r.RoomTypeId,
    TypeName: r.TypeName,
    Description: r.Description,
    BasePrice: Number(r.BasePrice),
    MaxOccupancy: r.MaxOccupancy,
    AdultCapacity: r.AdultCapacity,
    ChildCapacity: r.ChildCapacity,
    ImageUrl: r.ImageUrl
  }));

  // 3. Gọi Gemini API (RAG augmented generation)
  let aiResult = null;
  let sourceMode = 'gemini_real';

  try {
    aiResult = await callGeminiApiForRecommendation(customPrompt, candidateRooms, userContext);
  } catch (e) {
    console.warn('[GeminiRecommendation] API Error:', e.message);
  }

  // 4. Nếu không có kết quả từ Gemini -> chuyển sang Smart Rule-based Fallback
  if (!aiResult || !aiResult.recommendations || aiResult.recommendations.length === 0) {
    aiResult = smartRuleBasedRecommendation(candidateRooms, userContext);
    sourceMode = 'smart_rag_fallback';
  }

  // 5. Kết hợp thông tin chi tiết của phòng với kết quả gợi ý
  const enrichedRecommendations = (aiResult.recommendations || []).map(rec => {
    const matchedRoom = candidateRooms.find(r => Number(r.RoomTypeId) === Number(rec.roomTypeId));
    return {
      ...rec,
      roomDetails: matchedRoom || null
    };
  }).filter(rec => rec.roomDetails !== null);

  return {
    aiProvider: sourceMode === 'gemini_real' ? 'Google Gemini 2.5 Flash (RAG)' : 'Grand Horizon Smart RAG Engine',
    sourceMode,
    userContext: {
      hasHistory: userContext.hasHistory,
      pastBookingsCount: userContext.pastBookingsCount,
      avgPastSpend: userContext.avgPastSpend,
      requestedBudget: userContext.maxBudget,
      travelStyle: userContext.travelStyle
    },
    summaryGreeting: aiResult.summaryGreeting,
    recommendations: enrichedRecommendations
  };
}

module.exports = {
  recommendRooms,
  callGeminiApiForRecommendation,
  smartRuleBasedRecommendation
};
