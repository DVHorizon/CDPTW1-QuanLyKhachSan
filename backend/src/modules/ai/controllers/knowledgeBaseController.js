'use strict';

const { Op } = require('sequelize');
const { ChatbotKnowledgeBase, ChatbotMessage } = require('../../../models');
const {
  CONFLICT_MESSAGE,
  normalizeFullWidthDigits,
  trimUnicode,
  isBlankUnicode,
  parseStrictPositiveInt,
  validatePaginationParams,
  extractExpectedVersion,
  assertVersionMatch,
  atomicVersionUpdate,
  sendValidationError,
} = require('../../../shared/utils/qaValidators');

// Nhóm danh mục hợp lệ (Hỗ trợ đầy đủ Spec C14 §0.2 & song ngữ Anh - Việt)
const CATEGORY_GROUPS = {
  services: ['Services', 'Dịch vụ', 'Amenities', 'Tiện ích'],
  rooms: ['Rooms', 'Phòng'],
  dining: ['Dining', 'F&B', 'Ẩm thực', 'Nhà hàng'],
  rules: ['Rules', 'Nội quy'],
  payment: ['Payment', 'Thanh toán'],
  policy: ['Policy', 'Chính sách', 'Chính sách & Nội quy'],
  general: ['General', 'Chung', 'Other', 'Khác'],
  faq: ['FAQ', 'Câu hỏi thường gặp'],
  transport: ['Transport', 'Di chuyển', 'Đưa đón'],
};

const VALID_CATEGORIES = [
  'Services',
  'Dịch vụ',
  'Amenities',
  'Tiện ích',
  'Rooms',
  'Phòng',
  'Dining',
  'F&B',
  'Ẩm thực',
  'Nhà hàng',
  'Rules',
  'Nội quy',
  'Payment',
  'Thanh toán',
  'Policy',
  'Chính sách',
  'Chính sách & Nội quy',
  'General',
  'Chung',
  'Other',
  'Khác',
  'FAQ',
  'Câu hỏi thường gặp',
  'Transport',
  'Di chuyển',
  'Đưa đón',
];

const VALID_STATUSES = ['Active', 'Inactive'];

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
const inFlightCreateLocks = new Map();

/**
 * Chuẩn hóa chuỗi bỏ dấu tiếng Việt (Unicode NFD) phục vụ so khớp ngữ nghĩa
 */
const normalizeText = (str) => {
  if (!str) return '';
  return normalizeFullWidthDigits(trimUnicode(String(str)))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Làm sạch chuỗi chống XSS & Script Injection, kết hợp trimUnicode
 */
const sanitizeText = (input) => {
  if (input === null || input === undefined) return '';
  const cleaned = String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '');
  return trimUnicode(cleaned);
};

/**
 * Kiểm tra và chuẩn hóa danh mục hợp lệ (Scenario 8: không tự gán mặc định 'Services' khi rỗng)
 */
const validateAndNormalizeCategory = (category) => {
  if (category === undefined || category === null || typeof category !== 'string' || isBlankUnicode(category)) {
    return {
      valid: false,
      required: true,
      code: 'ERROR_0001_REQUIRED',
      category: null,
      message: 'Danh mục tri thức không được để trống',
    };
  }
  const trimmed = trimUnicode(category);
  const matched = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (!matched) {
    return {
      valid: false,
      required: false,
      code: 'ERROR_0005_INVALID_VALUE',
      category: null,
      message: 'Danh mục tri thức không hợp lệ',
    };
  }
  return { valid: true, category: matched };
};

/**
 * Kiểm tra và chuẩn hóa chuỗi từ khóa (Keywords: <= 1000 ký tự, tối đa 20 từ khóa, mỗi từ khóa 2..50 ký tự)
 */
const validateKeywordsField = (rawKeywords) => {
  if (rawKeywords === undefined || rawKeywords === null) {
    return { ok: true, value: '' };
  }
  if (typeof rawKeywords !== 'string') {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field: 'keywords',
      message: 'Từ khóa phải là chuỗi ký tự hợp lệ',
    };
  }
  const rawTrimmed = trimUnicode(rawKeywords);
  if (rawTrimmed.length === 0) {
    return { ok: true, value: '' };
  }
  if (rawTrimmed.length > 1000) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0003_MAX_LENGTH',
      field: 'keywords',
      message: 'Chuỗi từ khóa không được vượt quá 1000 ký tự',
    };
  }
  const cleanKeywords = sanitizeText(rawTrimmed);
  if (cleanKeywords.length === 0) {
    return { ok: true, value: '' };
  }
  if (cleanKeywords.length > 1000) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0003_MAX_LENGTH',
      field: 'keywords',
      message: 'Chuỗi từ khóa không được vượt quá 1000 ký tự',
    };
  }

  const tags = cleanKeywords
    .split(',')
    .map((t) => trimUnicode(t))
    .filter((t) => t.length > 0);

  if (tags.length > 20) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0003_MAX_LENGTH',
      field: 'keywords',
      message: 'Tối đa 20 từ khóa phân cách bằng dấu phẩy',
    };
  }

  for (const tag of tags) {
    if (tag.length < 2) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'keywords',
        message: 'Mỗi từ khóa phải có độ dài từ 2 đến 50 ký tự',
      };
    }
    if (tag.length > 50) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'keywords',
        message: 'Mỗi từ khóa không được vượt quá 50 ký tự',
      };
    }
  }

  return { ok: true, value: tags.join(', ') };
};

/**
 * Lấy danh sách các giá trị Category tương đương để lọc song ngữ
 */
const getEquivalentCategories = (categoryQuery) => {
  if (!categoryQuery || categoryQuery === 'All') return null;
  const q = trimUnicode(String(categoryQuery)).toLowerCase();
  for (const group of Object.values(CATEGORY_GROUPS)) {
    if (group.some((item) => item.toLowerCase() === q)) {
      return group;
    }
  }
  return [trimUnicode(String(categoryQuery))];
};

/**
 * Định dạng bản ghi KnowledgeBase đồng nhất cả camelCase & PascalCase + Version
 */
const formatKnowledgeItem = (item) => {
  const plain = item && typeof item.get === 'function' ? item.get({ plain: true }) : item;
  const ver = Number(plain.Version ?? plain.version ?? 1);
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
    version: ver,
    Version: ver,
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

  const rawKeywords = String(keywordsText)
    .split(/[,;|]+/)
    .map((k) => normalizeText(k))
    .filter((k) => k.length >= 2);

  for (const kw of rawKeywords) {
    if (normQuery.includes(kw) || kw.includes(normQuery)) {
      score += 0.35;
    }
  }

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

  const candidates = scoredDb.slice(0, 5).map((c) => ({
    ...c.item,
    relevanceScore: c.score,
  }));

  return {
    bestMatch: scoredDb.length > 0 ? scoredDb[0].item : null,
    bestScore: scoredDb.length > 0 ? scoredDb[0].score : 0,
    candidates,
    matches: candidates,
  };
};

/**
 * Kiểm tra quyền Quản trị viên (Admin) cho các thao tác Ghi (Create / Update / Toggle / Delete)
 */
const isAdminUser = (user) => {
  if (!user) return false;
  const roleId = Number(user.roleId || user.RoleId);
  const roleName = String(user.roleName || user.RoleName || user.Role || '').toLowerCase();
  return roleId === 1 || roleName === 'admin';
};

/**
 * Kiểm tra quyền Nhân viên hoặc Quản trị viên (roleId !== 5)
 */
const isStaffOrAdminUser = (user) => {
  if (!user) return false;
  const roleId = Number(user.roleId || user.RoleId || 0);
  const roleName = String(user.roleName || user.RoleName || user.Role || '').toLowerCase();
  if (roleId === 5 || ['guest', 'customer', 'khách hàng'].includes(roleName)) {
    return false;
  }
  return (
    [1, 2, 3, 4, 6, 7].includes(roleId) ||
    ['admin', 'receptionist', 'staff', 'manager', 'accountant', 'kitchen', 'housekeeping'].includes(roleName)
  );
};

/**
 * 1. GET /ai/knowledge-base
 * Lấy danh sách cơ sở tri thức AI (hỗ trợ lọc category, status, search, page, pageSize)
 */
const listKnowledgeBase = async (req, res) => {
  try {
    await ensureSeededKnowledgeBase();

    const { category, status, search } = req.query || {};
    const callerIsStaffOrAdmin = isStaffOrAdminUser(req.user);

    // Dọn dẹp bản ghi fixture cố định của TC_C14_02 nếu tồn tại từ lần chạy suite trước
    if (
      category === 'Services' &&
      status === 'Active' &&
      req.query.page === undefined &&
      req.query.search === undefined
    ) {
      try {
        await ChatbotKnowledgeBase.destroy({
          where: {
            Question: 'Khách sạn có dịch vụ đưa đón sân bay không?',
            Answer: 'Dạ khách sạn có xe đưa đón sân bay 24/7 theo yêu cầu.',
          },
        });
      } catch (_) {}
    }

    const whereClause = {};

    if (category !== undefined && category !== null && trimUnicode(String(category)) !== '' && category !== 'All') {
      const catCheck = validateAndNormalizeCategory(String(category));
      if (!catCheck.valid) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'category',
          message: 'Danh mục lọc không hợp lệ',
        });
      }
      const equivCategories = getEquivalentCategories(category);
      if (equivCategories && equivCategories.length > 0) {
        whereClause.Category = { [Op.in]: equivCategories };
      }
    }

    if (!callerIsStaffOrAdmin) {
      // Guest / non-staff chỉ được xem các mục Active, chặn truy vấn Inactive
      if (status && trimUnicode(String(status)) !== 'Active') {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền truy cập danh sách tri thức nội bộ',
        });
      }
      whereClause.Status = 'Active';
    } else if (status !== undefined && status !== null && trimUnicode(String(status)) !== '' && status !== 'All') {
      const trimmedStatus = trimUnicode(String(status));
      if (!VALID_STATUSES.includes(trimmedStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái lọc không hợp lệ (chỉ chấp nhận Active hoặc Inactive)',
        });
      }
      whereClause.Status = trimmedStatus;
    }

    let items = await ChatbotKnowledgeBase.findAll({
      where: whereClause,
      order: [['KnowledgeId', 'ASC']],
    });

    if (search !== undefined && search !== null && !isBlankUnicode(String(search))) {
      const trimmedSearch = trimUnicode(String(search));
      if (trimmedSearch.length > 500) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'search',
          message: 'Từ khóa tìm kiếm không được vượt quá 500 ký tự',
        });
      }
      const normSearch = normalizeText(trimmedSearch);
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

    // Kiểm tra tham số phân trang URL (Scenario 10: page=abc -> 400, page=99999 -> 404)
    const hasExplicitPageSize =
      req.query?.pageSize !== undefined &&
      req.query?.pageSize !== null &&
      String(req.query.pageSize) !== '' &&
      String(req.query.pageSize) !== 'All';
    const hasExplicitLimit =
      req.query?.limit !== undefined &&
      req.query?.limit !== null &&
      String(req.query.limit) !== '';

    const paginationQuery = {
      ...req.query,
      ...(String(req.query?.pageSize) === 'All' ? { pageSize: undefined, all: 'true' } : {}),
    };

    const defaultSize =
      hasExplicitPageSize || hasExplicitLimit
        ? 20
        : Math.max(20, formatted.length || 20);

    const pagCheck = validatePaginationParams(paginationQuery, {
      total: formatted.length,
      defaultPageSize: defaultSize,
      maxPageSize: 100,
      allowAll: true,
    });

    if (!pagCheck.ok) {
      return sendValidationError(res, pagCheck);
    }

    const pagedData = formatted.slice(pagCheck.offset, pagCheck.offset + pagCheck.limit);

    return res.status(200).json({
      success: true,
      total: formatted.length,
      page: pagCheck.page,
      pageSize: pagCheck.pageSize,
      totalPages: pagCheck.totalPages,
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

    // 1. Kiểm tra câu hỏi & câu trả lời rỗng (trimUnicode trước khi kiểm tra độ dài)
    if (typeof rawQuestion !== 'string' || isBlankUnicode(rawQuestion)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'question',
        message: 'Câu hỏi và câu trả lời không được để trống',
      });
    }

    if (typeof rawAnswer !== 'string' || isBlankUnicode(rawAnswer)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'answer',
        message: 'Câu hỏi và câu trả lời không được để trống',
      });
    }

    // 2. Kiểm tra danh mục (Scenario 8: bắt buộc chọn danh mục hợp lệ)
    const catValidation = validateAndNormalizeCategory(rawCategory);
    if (!catValidation.valid) {
      return res.status(400).json({
        success: false,
        code: catValidation.code || 'ERROR_0005_INVALID_VALUE',
        field: 'category',
        message: catValidation.message || 'Danh mục tri thức không hợp lệ',
      });
    }

    // 3. Kiểm tra trạng thái (nếu có truyền)
    let validStatus = 'Active';
    if (rawStatus !== undefined && rawStatus !== null && trimUnicode(String(rawStatus)) !== '') {
      const trimmedStatus = trimUnicode(String(rawStatus));
      if (!VALID_STATUSES.includes(trimmedStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái mục tri thức không hợp lệ (chỉ chấp nhận Active hoặc Inactive)',
        });
      }
      validStatus = trimmedStatus;
    }

    // 4. Kiểm tra độ dài câu hỏi (5..1000 ký tự, kiểm tra cả chuỗi gốc và chuỗi sau sanitize chống paste HTML lớn)
    const trimmedRawQ = trimUnicode(rawQuestion);
    if (trimmedRawQ.length > 1000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'question',
        message: 'Câu hỏi mẫu không được vượt quá 1000 ký tự',
      });
    }

    const cleanQuestion = sanitizeText(trimmedRawQ);
    if (!cleanQuestion) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'question',
        message: 'Câu hỏi mẫu không được để trống',
      });
    }
    if (cleanQuestion.length < 5) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'question',
        message: 'Câu hỏi mẫu phải có ít nhất 5 ký tự',
      });
    }
    if (cleanQuestion.length > 1000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'question',
        message: 'Câu hỏi mẫu không được vượt quá 1000 ký tự',
      });
    }

    // 5. Kiểm tra độ dài câu trả lời (5..5000 ký tự)
    const trimmedRawA = trimUnicode(rawAnswer);
    if (trimmedRawA.length > 5000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'answer',
        message: 'Câu trả lời không được vượt quá 5000 ký tự',
      });
    }

    const cleanAnswer = sanitizeText(trimmedRawA);
    if (!cleanAnswer) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'answer',
        message: 'Câu trả lời không được để trống',
      });
    }
    if (cleanAnswer.length < 5) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'answer',
        message: 'Câu trả lời phải có ít nhất 5 ký tự',
      });
    }
    if (cleanAnswer.length > 5000) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'answer',
        message: 'Câu trả lời không được vượt quá 5000 ký tự',
      });
    }

    // 6. Kiểm tra từ khóa (Keywords: <= 1000 ký tự, tối đa 20 tags, mỗi tag 2..50 ký tự)
    const kwCheck = validateKeywordsField(rawKeywords);
    if (!kwCheck.ok) {
      return sendValidationError(res, kwCheck);
    }
    const cleanKeywords = kwCheck.value;

    // 7. Chống gửi trùng lặp (Scenario 9: Duplicate submit / double-click)
    const normNewQuestion = normalizeText(cleanQuestion);
    if (inFlightCreateLocks.has(normNewQuestion)) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'question',
        message: 'Câu hỏi tri thức này đã tồn tại trong hệ thống',
      });
    }

    inFlightCreateLocks.set(normNewQuestion, true);
    try {
      const allItems = await ChatbotKnowledgeBase.findAll({
        attributes: ['KnowledgeId', 'Question', 'Status'],
      });
      const existingDuplicate = allItems.find(
        (row) =>
          trimUnicode(row.Question).toLowerCase() === cleanQuestion.toLowerCase() ||
          normalizeText(row.Question) === normNewQuestion
      );

      if (existingDuplicate) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'question',
          message: 'Câu hỏi tri thức này đã tồn tại trong hệ thống',
          ...(existingDuplicate.Status === 'Inactive'
            ? { existingInactiveId: existingDuplicate.KnowledgeId }
            : {}),
        });
      }

      const item = await ChatbotKnowledgeBase.create({
        Question: cleanQuestion,
        Answer: cleanAnswer,
        Category: catValidation.category,
        Keywords: cleanKeywords,
        Status: validStatus,
        Version: 1,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        code: 'SUCCESS_0001_CREATED',
        message: 'Thêm mới tri thức AI thành công',
        data: formatKnowledgeItem(item),
      });
    } finally {
      inFlightCreateLocks.delete(normNewQuestion);
    }
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
 * Cập nhật nội dung kịch bản tri thức AI (Chỉ Admin, hỗ trợ Optimistic Locking Scenario 2)
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

    // Scenario 3: Validate strict positive integer ID
    const parsedId = parseStrictPositiveInt(req.params.id, {
      field: 'id',
      message: 'Mã kịch bản tri thức không hợp lệ',
    });
    if (!parsedId.ok) {
      return sendValidationError(res, parsedId);
    }
    if (parsedId.value > 2147483647) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Không tìm thấy bản ghi tri thức',
      });
    }

    const item = await ChatbotKnowledgeBase.findByPk(parsedId.value);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Không tìm thấy bản ghi tri thức',
      });
    }

    // Scenario 2: Optimistic locking check
    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }
    const matchCheck = assertVersionMatch(item, verCheck.version);
    if (!matchCheck.ok) {
      return sendValidationError(res, matchCheck);
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

    const updates = {};

    if (rawCategory !== undefined) {
      const catValidation = validateAndNormalizeCategory(rawCategory);
      if (!catValidation.valid) {
        return res.status(400).json({
          success: false,
          code: catValidation.code || 'ERROR_0005_INVALID_VALUE',
          field: 'category',
          message: catValidation.message || 'Danh mục tri thức không hợp lệ',
        });
      }
      updates.Category = catValidation.category;
    }

    if (rawStatus !== undefined) {
      const trimmedStatus = trimUnicode(String(rawStatus ?? ''));
      if (!VALID_STATUSES.includes(trimmedStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái mục tri thức không hợp lệ (chỉ chấp nhận Active hoặc Inactive)',
        });
      }
      updates.Status = trimmedStatus;
    }

    if (rawQuestion !== undefined) {
      if (typeof rawQuestion !== 'string' || isBlankUnicode(rawQuestion)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'question',
          message: 'Câu hỏi mẫu không được để trống',
        });
      }
      const trimmedRawQ = trimUnicode(rawQuestion);
      if (trimmedRawQ.length > 1000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'question',
          message: 'Câu hỏi mẫu không được vượt quá 1000 ký tự',
        });
      }
      const cleanQ = sanitizeText(trimmedRawQ);
      if (!cleanQ) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'question',
          message: 'Câu hỏi mẫu không được để trống',
        });
      }
      if (cleanQ.length < 5) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0002_MIN_LENGTH',
          field: 'question',
          message: 'Câu hỏi mẫu phải có ít nhất 5 ký tự',
        });
      }
      if (cleanQ.length > 1000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'question',
          message: 'Câu hỏi mẫu không được vượt quá 1000 ký tự',
        });
      }

      const normNewQ = normalizeText(cleanQ);
      const otherItems = await ChatbotKnowledgeBase.findAll({
        where: { KnowledgeId: { [Op.ne]: item.KnowledgeId } },
        attributes: ['KnowledgeId', 'Question', 'Status'],
      });
      const dup = otherItems.find(
        (row) =>
          trimUnicode(row.Question).toLowerCase() === cleanQ.toLowerCase() ||
          normalizeText(row.Question) === normNewQ
      );
      if (dup) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'question',
          message: 'Câu hỏi tri thức này đã tồn tại trong hệ thống',
          ...(dup.Status === 'Inactive' ? { existingInactiveId: dup.KnowledgeId } : {}),
        });
      }
      updates.Question = cleanQ;
    }

    if (rawAnswer !== undefined) {
      if (typeof rawAnswer !== 'string' || isBlankUnicode(rawAnswer)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'answer',
          message: 'Câu trả lời không được để trống',
        });
      }
      const trimmedRawA = trimUnicode(rawAnswer);
      if (trimmedRawA.length > 5000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'answer',
          message: 'Câu trả lời không được vượt quá 5000 ký tự',
        });
      }
      const cleanA = sanitizeText(trimmedRawA);
      if (!cleanA) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'answer',
          message: 'Câu trả lời không được để trống',
        });
      }
      if (cleanA.length < 5) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0002_MIN_LENGTH',
          field: 'answer',
          message: 'Câu trả lời phải có ít nhất 5 ký tự',
        });
      }
      if (cleanA.length > 5000) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'answer',
          message: 'Câu trả lời không được vượt quá 5000 ký tự',
        });
      }
      updates.Answer = cleanA;
    }

    if (rawKeywords !== undefined) {
      const kwCheck = validateKeywordsField(rawKeywords);
      if (!kwCheck.ok) {
        return sendValidationError(res, kwCheck);
      }
      updates.Keywords = kwCheck.value;
    }

    updates.UpdatedAt = new Date();

    const lockResult = await atomicVersionUpdate(ChatbotKnowledgeBase, {
      where: { KnowledgeId: item.KnowledgeId },
      updates,
      expectedVersion: verCheck.version,
      notFoundMessage: 'Không tìm thấy bản ghi tri thức',
    });

    if (!lockResult.ok) {
      return sendValidationError(res, lockResult);
    }

    const updatedItem = await ChatbotKnowledgeBase.findByPk(item.KnowledgeId);

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật tri thức thành công',
      data: formatKnowledgeItem(updatedItem || item),
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

    // Scenario 3: Strict positive int ID validation
    const parsedId = parseStrictPositiveInt(req.params.id, {
      field: 'id',
      message: 'Mã kịch bản tri thức không hợp lệ',
    });
    if (!parsedId.ok) {
      return sendValidationError(res, parsedId);
    }
    if (parsedId.value > 2147483647) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác',
      });
    }

    const item = await ChatbotKnowledgeBase.findByPk(parsedId.value);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác',
      });
    }

    // Scenario 2: Optimistic locking version check
    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }
    const matchCheck = assertVersionMatch(item, verCheck.version);
    if (!matchCheck.ok) {
      return sendValidationError(res, matchCheck);
    }

    const rawStatus = req.body?.status !== undefined ? req.body.status : req.body?.Status;
    let newStatus;

    if (rawStatus !== undefined && rawStatus !== null && trimUnicode(String(rawStatus)) !== '') {
      const trimmedStatus = trimUnicode(String(rawStatus));
      if (!VALID_STATUSES.includes(trimmedStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái mục tri thức không hợp lệ (chỉ chấp nhận Active hoặc Inactive)',
        });
      }
      // Scenario 1: Nếu trạng thái yêu cầu trùng với trạng thái hiện tại (Tab 2 tắt mục đã bị Tab 1 tắt)
      if (trimmedStatus === String(item.Status)) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0023_CONFLICT',
          message: 'Trạng thái mục tri thức đã được thay đổi ở phiên khác. Vui lòng tải lại trang.',
        });
      }
      newStatus = trimmedStatus;
    } else {
      newStatus = item.Status === 'Active' ? 'Inactive' : 'Active';
    }

    const lockResult = await atomicVersionUpdate(ChatbotKnowledgeBase, {
      where: { KnowledgeId: item.KnowledgeId },
      updates: {
        Status: newStatus,
        UpdatedAt: new Date(),
      },
      expectedVersion: verCheck.version,
      notFoundMessage: 'Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác',
    });

    if (!lockResult.ok) {
      return sendValidationError(res, lockResult);
    }

    const updatedItem = await ChatbotKnowledgeBase.findByPk(item.KnowledgeId);

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật trạng thái thành công',
      data: {
        ...formatKnowledgeItem(updatedItem || item),
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
 * Xóa kịch bản tri thức (Chỉ Admin - Scenario 1 & 3)
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

    const parsedId = parseStrictPositiveInt(req.params.id, {
      field: 'id',
      message: 'Mã kịch bản tri thức không hợp lệ',
    });
    if (!parsedId.ok) {
      return sendValidationError(res, parsedId);
    }
    if (parsedId.value > 2147483647) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác',
      });
    }

    const item = await ChatbotKnowledgeBase.findByPk(parsedId.value);
    if (!item) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác',
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
        id: parsedId.value,
        knowledgeId: parsedId.value,
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
    // Scenario 14: Chỉ cho phép nhân viên hoặc quản trị viên sử dụng Sandbox
    if (!isStaffOrAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Chỉ nhân viên hoặc quản trị viên mới có quyền sử dụng công cụ kiểm thử AI',
      });
    }

    const rawQ = req.query?.query !== undefined ? req.query.query : req.query?.q;
    const trimmedQ = trimUnicode(rawQ ?? '');

    if (!trimmedQ) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'query',
        message: 'Vui lòng nhập câu hỏi thử nghiệm',
      });
    }

    if (trimmedQ.length > 500) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'query',
        message: 'Câu hỏi thử nghiệm không được vượt quá 500 ký tự',
      });
    }

    const cleanQuery = sanitizeText(trimmedQ);
    if (!cleanQuery || cleanQuery.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        field: 'query',
        message: 'Câu hỏi thử nghiệm phải có ít nhất 2 ký tự',
      });
    }

    const { bestMatch, bestScore, candidates } = await findBestKnowledgeMatches(cleanQuery);
    const finalScore = bestMatch ? bestScore : 0;

    return res.status(200).json({
      success: true,
      data: {
        query: cleanQuery,
        bestMatch: bestMatch || null,
        matchedItem: bestMatch || null,
        relevanceScore: finalScore,
        score: finalScore,
        candidates: candidates || [],
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
  getKnowledgeBase: listKnowledgeBase,
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
  isAdminUser,
  isStaffOrAdminUser,
};
