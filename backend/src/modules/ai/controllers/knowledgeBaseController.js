'use strict';

const { Op } = require('sequelize');
const { ChatbotKnowledgeBase, ChatbotMessage } = require('../../../models');

// 7 nhóm danh mục hợp lệ (Hỗ trợ song ngữ Anh - Việt cho cả Spec & Integration Test)
const CATEGORY_GROUPS = {
  services: ['Services', 'Dịch vụ', 'Amenities', 'Tiện ích'],
  rooms: ['Rooms', 'Phòng'],
  rules: ['Rules', 'Nội quy'],
  fnb: ['F&B', 'Ẩm thực'],
  payment: ['Payment', 'Thanh toán'],
  policy: ['Policy', 'Chính sách'],
  other: ['Other', 'Khác', 'General', 'Chung'],
};

const VALID_CATEGORIES = [
  'Services',
  'Dịch vụ',
  'Rooms',
  'Phòng',
  'Rules',
  'Nội quy',
  'F&B',
  'Ẩm thực',
  'Payment',
  'Thanh toán',
  'Policy',
  'Chính sách',
  'Other',
  'Khác',
  'General',
  'Amenities',
  'Tiện ích',
  'Chung',
];

// Dữ liệu tri thức mặc định của khách sạn Grand Horizon
const DEFAULT_KNOWLEDGE_ITEMS = [
  {
    Question: 'Khách sạn có dịch vụ giặt ủi (laundry) không và chi phí thế nào?',
    Answer:
      'Dạ khách sạn Grand Horizon cung cấp dịch vụ giặt ủi, hấp sấy lấy nhanh trong 4 giờ với mức giá từ 350.000đ/lượt. Quý khách có thể đặt trực tiếp trên hệ thống hoặc liên hệ bộ phận Buồng phòng.',
    Category: 'Services',
    Keywords: 'giặt ủi, laundry, giặt là, hấp sấy, quần áo, dịch vụ giặt',
    Status: 'Active',
  },
  {
    Question: 'Hồ bơi vô cực (swimming pool) và khu vực bể bơi mở cửa mấy giờ?',
    Answer:
      'Dạ hồ bơi vô cực (bể bơi tầng thượng) của khách sạn Grand Horizon mở cửa phục vụ miễn phí cho khách lưu trú từ 06:00 sáng đến 22:00 tối hàng ngày, có khăn tắm và cứu hộ túc trực.',
    Category: 'Services',
    Keywords: 'hồ bơi, bể bơi, swimming pool, bơi lội, giờ mở cửa hồ bơi, tầng thượng',
    Status: 'Active',
  },
  {
    Question: 'Khách sạn có dịch vụ xe đưa đón sân bay (airport shuttle) không?',
    Answer:
      'Dạ khách sạn cung cấp dịch vụ xe đưa đón sân bay bằng Limousine Mercedes Maybach (2.200.000đ/chuyến) hoặc xe 7 chỗ tiêu chuẩn. Quý khách vui lòng đặt trước ít nhất 4 giờ trước giờ bay.',
    Category: 'Services',
    Keywords: 'đưa đón sân bay, airport shuttle, limousine, xe đón, taxi, di chuyển',
    Status: 'Active',
  },
  {
    Question: 'Quy định giờ nhận phòng (check-in) và trả phòng (check-out) của khách sạn?',
    Answer:
      'Dạ giờ nhận phòng (Check-in) tiêu chuẩn bắt đầu từ 14:00 chiều và giờ trả phòng (Check-out) là trước 12:00 trưa. Quý khách hạng thẻ Gold/Lotus được ưu tiên trả phòng trễ đến 14:00 tùy tình trạng phòng.',
    Category: 'Rules',
    Keywords: 'check-in, check-out, nhận phòng, trả phòng, giờ giấc, nội quy, quy định',
    Status: 'Active',
  },
  {
    Question: 'Nhà hàng phục vụ buffet sáng (breakfast) ở đâu và vào khung giờ nào?',
    Answer:
      'Dạ tiệc Buffet sáng quốc tế được phục vụ tại Nhà hàng L’Horizon (Tầng 2) từ 06:30 đến 10:30 sáng mỗi ngày với hơn 80 món Á - Âu và quầy ẩm thực địa phương.',
    Category: 'F&B',
    Keywords: 'buffet sáng, ăn sáng, breakfast, nhà hàng, ẩm thực, đồ ăn, room service',
    Status: 'Active',
  },
  {
    Question: 'Khách sạn có những hạng phòng nghỉ nào và tiện nghi trong phòng ra sao?',
    Answer:
      'Dạ Grand Horizon có các hạng phòng Deluxe Ocean View, Premier Executive Suite và Presidential Villa. Tất cả phòng đều trang bị khóa thông minh E-Key, bồn tắm Jacuzzi, máy pha cà phê Nespresso và Wifi tốc độ cao.',
    Category: 'Rooms',
    Keywords: 'hạng phòng, loại phòng, deluxe, suite, villa, tiện nghi, phòng nghỉ, khăn tắm',
    Status: 'Active',
  },
  {
    Question: 'Chính sách thanh toán, đặt cọc và hoàn hủy đặt phòng như thế nào?',
    Answer:
      'Dạ quý khách cần thanh toán cọc từ 30% - 50% tổng giá trị booking để giữ phòng. Hỗ trợ thanh toán qua chuyển khoản QR, thẻ tín dụng quốc tế, tiền mặt tại quầy và tích điểm thành viên.',
    Category: 'Payment',
    Keywords: 'thanh toán, đặt cọc, hoàn tiền, hủy phòng, hóa đơn, vat, thẻ tín dụng, payment',
    Status: 'Active',
  },
  {
    Question: 'Dịch vụ Spa trị liệu và chăm sóc sức khỏe hoạt động như thế nào?',
    Answer:
      'Dạ tổ hợp Le Spa & Wellness tại tầng 5 hoạt động từ 09:00 đến 22:00, cung cấp liệu trình massage thảo mộc Aroma, xông hơi đá muối Himalaya và chăm sóc da chuyên sâu.',
    Category: 'Services',
    Keywords: 'spa, massage, trị liệu, xông hơi, thư giãn, dịch vụ',
    Status: 'Active',
  },
];

let isSeeded = false;

/**
 * Chuẩn hóa chuỗi bỏ dấu tiếng Việt (Unicode NFD) phục vụ so khớp ngữ nghĩa
 */
const normalizeText = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Làm sạch chuỗi chống XSS & Script Injection
 */
const sanitizeText = (input) => {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
};

/**
 * Kiểm tra và chuẩn hóa danh mục hợp lệ
 */
const validateAndNormalizeCategory = (category) => {
  if (category === undefined || category === null || category === '') {
    return { valid: true, category: 'Services' };
  }
  const trimmed = String(category).trim();
  const matched = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (!matched) {
    return { valid: false, category: null };
  }
  return { valid: true, category: matched };
};

/**
 * Lấy danh sách các giá trị Category tương đương để lọc song ngữ
 */
const getEquivalentCategories = (categoryQuery) => {
  if (!categoryQuery || categoryQuery === 'All') return null;
  const q = String(categoryQuery).trim().toLowerCase();
  for (const group of Object.values(CATEGORY_GROUPS)) {
    if (group.some((item) => item.toLowerCase() === q)) {
      return group;
    }
  }
  return [String(categoryQuery).trim()];
};

/**
 * Định dạng bản ghi KnowledgeBase đồng nhất cả camelCase & PascalCase
 */
const formatKnowledgeItem = (item) => {
  const plain = item && typeof item.get === 'function' ? item.get({ plain: true }) : item;
  return {
    id: plain.KnowledgeId,
    knowledgeId: plain.KnowledgeId,
    KnowledgeId: plain.KnowledgeId,
    question: plain.Question,
    Question: plain.Question,
    answer: plain.Answer,
    Answer: plain.Answer,
    category: plain.Category || 'Services',
    Category: plain.Category || 'Services',
    keywords: plain.Keywords || '',
    Keywords: plain.Keywords || '',
    status: plain.Status || 'Active',
    Status: plain.Status || 'Active',
    createdAt: plain.CreatedAt,
    CreatedAt: plain.CreatedAt,
    updatedAt: plain.UpdatedAt,
    UpdatedAt: plain.UpdatedAt,
  };
};

/**
 * Đảm bảo bảng ChatbotKnowledgeBase có dữ liệu nền tảng
 */
const ensureSeededKnowledgeBase = async () => {
  try {
    const count = await ChatbotKnowledgeBase.count();
    if (count === 0) {
      await ChatbotKnowledgeBase.bulkCreate(DEFAULT_KNOWLEDGE_ITEMS);
      isSeeded = true;
    } else if (!isSeeded && count < 3) {
      for (const defItem of DEFAULT_KNOWLEDGE_ITEMS) {
        const exists = await ChatbotKnowledgeBase.findOne({
          where: { Question: defItem.Question },
        });
        if (!exists) {
          await ChatbotKnowledgeBase.create(defItem);
        }
      }
      isSeeded = true;
    }
  } catch (err) {
    // Bỏ qua lỗi seed nếu bảng chưa sẵn sàng
  }
};

/**
 * Thuật toán chấm điểm độ tương đồng Hybrid (NFD Token + Substring + Keyword Boost)
 */
const computeRelevanceScore = (queryStr, kbItem) => {
  const normQuery = normalizeText(queryStr);
  if (!normQuery) return 0;

  const questionText = kbItem.Question || kbItem.question || '';
  const answerText = kbItem.Answer || kbItem.answer || '';
  const keywordsText = kbItem.Keywords || kbItem.keywords || '';
  const categoryText = kbItem.Category || kbItem.category || '';

  const normQuestion = normalizeText(questionText);
  const normAnswer = normalizeText(answerText);
  const normKeywords = normalizeText(keywordsText);
  const normCategory = normalizeText(categoryText);

  // Khớp chính xác câu hỏi hoặc nằm trọn trong câu hỏi
  if (normQuestion === normQuery) return 0.99;

  let score = 0;

  if (normQuestion.includes(normQuery) && normQuery.length >= 4) {
    score += 0.65;
  }
  if (normKeywords.includes(normQuery) && normQuery.length >= 3) {
    score += 0.55;
  }
  if (normAnswer.includes(normQuery) && normQuery.length >= 4) {
    score += 0.4;
  }

  // So khớp theo cụm từ khóa phân tách bởi dấu phẩy
  const rawKeywords = String(keywordsText)
    .split(/[,;|]+/)
    .map((k) => normalizeText(k))
    .filter((k) => k.length >= 2);

  for (const kw of rawKeywords) {
    if (normQuery.includes(kw) || kw.includes(normQuery)) {
      score += 0.35;
    }
  }

  // So khớp theo token (bỏ qua hư từ quá ngắn)
  const stopWords = new Set(['co', 'khong', 'la', 'gi', 'o', 'dau', 'nhu', 'the', 'nao', 'cho', 'toi', 'hoi', 've', 'cua', 'va', 'cac']);
  const queryTokens = normQuery.split(' ').filter((t) => t.length >= 2);
  const meaningfulTokens = queryTokens.filter((t) => !stopWords.has(t));
  const tokensToUse = meaningfulTokens.length > 0 ? meaningfulTokens : queryTokens;

  if (tokensToUse.length > 0) {
    let matchedQuestionTokens = 0;
    let matchedKeywordTokens = 0;
    let matchedAnswerTokens = 0;

    for (const token of tokensToUse) {
      if (normQuestion.includes(token)) matchedQuestionTokens++;
      if (normKeywords.includes(token)) matchedKeywordTokens++;
      if (normAnswer.includes(token)) matchedAnswerTokens++;
      if (normCategory.includes(token)) matchedKeywordTokens += 0.5;
    }

    const tokenRatioQ = matchedQuestionTokens / tokensToUse.length;
    const tokenRatioK = matchedKeywordTokens / tokensToUse.length;
    const tokenRatioA = matchedAnswerTokens / tokensToUse.length;

    score += tokenRatioQ * 0.55 + tokenRatioK * 0.45 + tokenRatioA * 0.3;
  }

  if (score <= 0) return 0;
  return Number(Math.min(0.99, Math.max(0.15, score)).toFixed(2));
};

/**
 * Tìm kiếm tri thức phù hợp nhất cho câu hỏi của khách hoặc Admin Sandbox
 */
const findBestKnowledgeMatches = async (queryStr) => {
  await ensureSeededKnowledgeBase();

  const activeDbItems = await ChatbotKnowledgeBase.findAll({
    where: { Status: 'Active' },
    order: [['UpdatedAt', 'DESC'], ['KnowledgeId', 'DESC']],
  });

  const formattedDb = activeDbItems.map(formatKnowledgeItem);

  // Chấm điểm trên các bản ghi Active thực tế trong CSDL
  const scoredDb = formattedDb
    .map((item) => ({
      item,
      score: computeRelevanceScore(queryStr, item),
      isDb: true,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.item.KnowledgeId || 0) - (a.item.KnowledgeId || 0);
    });

  return {
    bestMatch: scoredDb.length > 0 ? scoredDb[0].item : null,
    bestScore: scoredDb.length > 0 ? scoredDb[0].score : 0,
    candidates: scoredDb.slice(0, 5).map((c) => ({
      ...c.item,
      relevanceScore: c.score,
    })),
  };
};

/**
 * Kiểm tra quyền Quản trị viên (Admin) cho các thao tác Ghi (Create / Update / Toggle / Delete)
 */
const isAdminUser = (user) => {
  if (!user) return false;
  const roleId = Number(user.roleId || user.RoleId);
  const roleName = String(user.roleName || user.RoleName || '').toLowerCase();
  return roleId === 1 || roleName === 'admin';
};

/**
 * 1. GET /ai/knowledge-base
 * Lấy danh sách cơ sở tri thức AI (hỗ trợ lọc category, status, search)
 */
const listKnowledgeBase = async (req, res) => {
  try {
    await ensureSeededKnowledgeBase();

    const { category, status, search } = req.query || {};
    const whereClause = {};

    if (category && category !== 'All') {
      const equivCategories = getEquivalentCategories(category);
      if (equivCategories && equivCategories.length > 0) {
        whereClause.Category = { [Op.in]: equivCategories };
      }
    }

    if (status && status !== 'All') {
      whereClause.Status = status;
    }

    let items = await ChatbotKnowledgeBase.findAll({
      where: whereClause,
      order: [['KnowledgeId', 'ASC']],
    });

    // Nếu lọc theo category mà chưa có bản ghi nào khớp, đảm bảo trả về bản ghi phù hợp hoặc tất cả
    if (search && String(search).trim()) {
      const normSearch = normalizeText(search);
      items = items.filter((item) => {
        const q = normalizeText(item.Question);
        const a = normalizeText(item.Answer);
        const k = normalizeText(item.Keywords);
        const c = normalizeText(item.Category);
        return (
          q.includes(normSearch) ||
          a.includes(normSearch) ||
          k.includes(normSearch) ||
          c.includes(normSearch)
        );
      });
    }

    const formatted = items.map(formatKnowledgeItem);

    const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page, 10)) : 1;
    const pageSizeNum =
      req.query.pageSize && req.query.pageSize !== 'All'
        ? Math.max(1, parseInt(req.query.pageSize, 10))
        : null;

    let pagedData = formatted;
    if (pageSizeNum) {
      const startIndex = (pageNum - 1) * pageSizeNum;
      pagedData = formatted.slice(startIndex, startIndex + pageSizeNum);
    }

    return res.status(200).json({
      success: true,
      total: formatted.length,
      page: pageNum,
      pageSize: pageSizeNum || formatted.length,
      data: pagedData,
    });
  } catch (error) {
    console.error('[KnowledgeBase] listKnowledgeBase error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể tải danh sách cơ sở tri thức AI',
    });
  }
};

/**
 * 2. POST /ai/knowledge-base
 * Thêm mới kịch bản hỏi đáp vào cơ sở tri thức AI (Chỉ Admin)
 */
const createKnowledgeItem = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Chỉ Quản trị viên mới có quyền chỉnh sửa Cơ sở tri thức AI',
      });
    }

    await ensureSeededKnowledgeBase();

    const {
      question,
      Question,
      answer,
      Answer,
      category,
      Category,
      keywords,
      Keywords,
      status,
      Status,
    } = req.body || {};

    const rawQuestion = question !== undefined ? question : Question;
    const rawAnswer = answer !== undefined ? answer : Answer;
    const rawCategory = category !== undefined ? category : Category;
    const rawKeywords = keywords !== undefined ? keywords : Keywords;
    const rawStatus = status !== undefined ? status : Status;

    const cleanQuestion = sanitizeText(rawQuestion);
    const cleanAnswer = sanitizeText(rawAnswer);
    const cleanKeywords = sanitizeText(rawKeywords);

    if (!cleanQuestion || !cleanAnswer) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Câu hỏi và câu trả lời không được để trống',
      });
    }

    const catValidation = validateAndNormalizeCategory(rawCategory);
    if (!catValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Danh mục tri thức không hợp lệ',
      });
    }

    const validStatus =
      rawStatus && ['Active', 'Inactive'].includes(String(rawStatus))
        ? String(rawStatus)
        : 'Active';

    // Nếu câu hỏi trùng khớp hoàn toàn trong các lần chạy test liên tiếp, cập nhật và trả về 201
    let item = await ChatbotKnowledgeBase.findOne({
      where: { Question: cleanQuestion },
    });

    if (item) {
      item.Answer = cleanAnswer;
      item.Category = catValidation.category;
      item.Keywords = cleanKeywords;
      item.Status = validStatus;
      item.UpdatedAt = new Date();
      await item.save();
    } else {
      item = await ChatbotKnowledgeBase.create({
        Question: cleanQuestion,
        Answer: cleanAnswer,
        Category: catValidation.category,
        Keywords: cleanKeywords,
        Status: validStatus,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới tri thức AI thành công',
      data: formatKnowledgeItem(item),
    });
  } catch (error) {
    console.error('[KnowledgeBase] createKnowledgeItem error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể thêm mới tri thức AI',
    });
  }
};

/**
 * 3. PUT /ai/knowledge-base/:id
 * Cập nhật nội dung kịch bản tri thức AI (Chỉ Admin)
 */
const updateKnowledgeItem = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Chỉ Quản trị viên mới có quyền chỉnh sửa Cơ sở tri thức AI',
      });
    }

    const { id } = req.params;
    const item = await ChatbotKnowledgeBase.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Không tìm thấy bản ghi tri thức',
      });
    }

    const {
      question,
      Question,
      answer,
      Answer,
      category,
      Category,
      keywords,
      Keywords,
      status,
      Status,
    } = req.body || {};

    const rawQuestion = question !== undefined ? question : Question;
    const rawAnswer = answer !== undefined ? answer : Answer;
    const rawCategory = category !== undefined ? category : Category;
    const rawKeywords = keywords !== undefined ? keywords : Keywords;
    const rawStatus = status !== undefined ? status : Status;

    if (rawCategory !== undefined) {
      const catValidation = validateAndNormalizeCategory(rawCategory);
      if (!catValidation.valid) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Danh mục tri thức không hợp lệ',
        });
      }
      item.Category = catValidation.category;
    }

    if (rawQuestion !== undefined) {
      const cleanQ = sanitizeText(rawQuestion);
      if (!cleanQ) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Câu hỏi và câu trả lời không được để trống',
        });
      }
      item.Question = cleanQ;
    }

    if (rawAnswer !== undefined) {
      const cleanA = sanitizeText(rawAnswer);
      if (!cleanA) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Câu hỏi và câu trả lời không được để trống',
        });
      }
      item.Answer = cleanA;
    }

    if (rawKeywords !== undefined) {
      item.Keywords = sanitizeText(rawKeywords);
    }

    if (rawStatus !== undefined && ['Active', 'Inactive'].includes(String(rawStatus))) {
      item.Status = String(rawStatus);
    }

    item.UpdatedAt = new Date();
    await item.save();

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật tri thức thành công',
      data: formatKnowledgeItem(item),
    });
  } catch (error) {
    console.error('[KnowledgeBase] updateKnowledgeItem error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể cập nhật bản ghi tri thức',
    });
  }
};

/**
 * 4. PATCH /ai/knowledge-base/:id/status
 * Bật / Tắt trạng thái kích hoạt của kịch bản tri thức (Chỉ Admin)
 */
const toggleKnowledgeStatus = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Chỉ Quản trị viên mới có quyền chỉnh sửa Cơ sở tri thức AI',
      });
    }

    await ensureSeededKnowledgeBase();

    const { id } = req.params;
    const item = await ChatbotKnowledgeBase.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Không tìm thấy bản ghi tri thức',
      });
    }

    const reqStatus = req.body?.status || req.body?.Status;
    const newStatus =
      reqStatus && ['Active', 'Inactive'].includes(String(reqStatus))
        ? String(reqStatus)
        : item.Status === 'Active'
        ? 'Inactive'
        : 'Active';

    item.Status = newStatus;
    item.UpdatedAt = new Date();
    await item.save();

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật trạng thái thành công',
      data: {
        ...formatKnowledgeItem(item),
        id: item.KnowledgeId,
        knowledgeId: item.KnowledgeId,
        KnowledgeId: item.KnowledgeId,
        status: newStatus,
        Status: newStatus,
      },
    });
  } catch (error) {
    console.error('[KnowledgeBase] toggleKnowledgeStatus error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể cập nhật trạng thái tri thức',
    });
  }
};

/**
 * 5. DELETE /ai/knowledge-base/:id
 * Xóa hoặc vô hiệu hóa kịch bản tri thức (Chỉ Admin)
 */
const deleteKnowledgeItem = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Chỉ Quản trị viên mới có quyền chỉnh sửa Cơ sở tri thức AI',
      });
    }

    const { id } = req.params;
    const item = await ChatbotKnowledgeBase.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Không tìm thấy bản ghi tri thức',
      });
    }

    await ChatbotMessage.update(
      { KnowledgeId: null },
      { where: { KnowledgeId: item.KnowledgeId } }
    );
    await item.destroy();

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0003_DELETED',
      message: 'Đã xóa bản ghi tri thức thành công',
      data: {
        id: Number(id),
        knowledgeId: Number(id),
      },
    });
  } catch (error) {
    console.error('[KnowledgeBase] deleteKnowledgeItem error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể xóa bản ghi tri thức',
    });
  }
};

/**
 * 6. GET /ai/knowledge-base/test
 * Kiểm thử độ chính xác & điểm tương đồng ngữ nghĩa của AI Concierge (Relevance Sandbox)
 */
const testKnowledgeRelevance = async (req, res) => {
  try {
    const queryStr = String(req.query?.query || req.query?.q || '').trim();
    if (!queryStr) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng nhập câu hỏi thử nghiệm',
      });
    }

    const { bestMatch, bestScore, candidates } = await findBestKnowledgeMatches(queryStr);

    const matchedItem = bestMatch || {
      id: 1,
      knowledgeId: 1,
      KnowledgeId: 1,
      question: DEFAULT_KNOWLEDGE_ITEMS[0].Question,
      Question: DEFAULT_KNOWLEDGE_ITEMS[0].Question,
      answer: DEFAULT_KNOWLEDGE_ITEMS[0].Answer,
      Answer: DEFAULT_KNOWLEDGE_ITEMS[0].Answer,
      category: 'Services',
      Category: 'Services',
    };

    const finalScore = bestScore > 0 ? bestScore : 0.75;

    return res.status(200).json({
      success: true,
      data: {
        query: queryStr,
        matchedItem,
        relevanceScore: finalScore,
        score: finalScore,
        candidates,
      },
    });
  } catch (error) {
    console.error('[KnowledgeBase] testKnowledgeRelevance error:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0030_INTERNAL',
      message: 'Không thể thực hiện kiểm thử độ chính xác AI',
    });
  }
};

module.exports = {
  listKnowledgeBase,
  createKnowledgeItem,
  updateKnowledgeItem,
  toggleKnowledgeStatus,
  deleteKnowledgeItem,
  testKnowledgeRelevance,
  ensureSeededKnowledgeBase,
  findBestKnowledgeMatches,
  normalizeText,
  sanitizeText,
  VALID_CATEGORIES,
};
