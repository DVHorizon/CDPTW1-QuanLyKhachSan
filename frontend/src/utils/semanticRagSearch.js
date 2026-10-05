/**
 * SEMANTIC SEARCH & RAG (Retrieval-Augmented Generation) ENGINE
 * Dành cho Hệ Thống Quản Lý Loại Phòng Khách Sạn & Resort Grand Horizon
 * 
 * Tính năng:
 * 1. Semantic Search: Hiểu từ đồng nghĩa, ngữ cảnh du lịch/khách sạn.
 * 2. NLP (Natural Language Processing): Tiếng Việt không dấu, chịu lỗi chính tả (fuzzy matching), phân tích câu hỏi dài.
 * 3. Trích xuất ý định (Intent Extraction): lọc giá, sức chứa, diện tích, tiện nghi.
 * 4. RAG: Truy xuất các phòng phù hợp nhất và sinh câu trả lời tự nhiên có trích dẫn nguồn [Mã phòng].
 * 5. Cá nhân hóa (Personalization): Học từ lịch sử tương tác và sở thích của người dùng.
 */

// ─── 1. Tiện Ích Xử Lý Ngôn Ngữ Tự Nhiên (NLP Helpers) ───────────────────────

/**
 * Loại bỏ dấu tiếng Việt chuẩn
 */
const str = (v) => (v == null ? '' : String(v));
const lower = (v) => str(v).toLowerCase();
const has = (list, item) =>
  Array.isArray(list) ? list.includes(item) : typeof list === 'string' ? list.includes(item) : false;

export function removeVietnameseDiacritics(str = '') {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Tính khoảng cách Levenshtein để chịu lỗi chính tả (Typo Tolerance)
 */
export function levenshteinDistance(a = '', b = '') {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Thay thế
          matrix[i][j - 1] + 1,     // Chèn
          matrix[i - 1][j] + 1      // Xóa
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Kiểm tra khớp mờ (Fuzzy Match) chịu lỗi gõ máy
 */
export function isFuzzyMatch(wordA = '', wordB = '', maxDistance = 2) {
  if (!wordA || !wordB) return false;
  if (wordA === wordB) return true;
  if (wordA.includes(wordB) || wordB.includes(wordA)) return true;

  // Với từ ngắn (<= 3 ký tự), chỉ cho phép sai 1 ký tự
  const threshold = Math.min(wordA.length, wordB.length) <= 4 ? 1 : maxDistance;
  return levenshteinDistance(wordA, wordB) <= threshold;
}

// ─── 2. Cơ Sở Tri Thức Ngữ Nghĩa Khách Sạn (Domain Knowledge Graph) ─────────
const SEMANTIC_CONCEPTS = {
  OCEAN_VIEW: {
    label: 'Hướng Biển',
    keywords: [
      'bien', 'bai bien', 'ocean', 'sea', 'dai duong', 'song bien',
      'nhin ra bien', 'view bien', 'tam nhin bien', 'mat bien', 'huong bien',
      'vew bien', 'viw bien', 'bien ca'
    ],
    check: (r) =>
      r.view?.toLowerCase().includes('biển') ||
      r.view?.toLowerCase().includes('ocean') ||
      r.amenities?.includes('balcony') ||
      r.description?.toLowerCase().includes('biển') ||
      r.name?.toLowerCase().includes('biển'),
  },

  GARDEN_VIEW: {
    label: 'Hướng Vườn',
    keywords: ['vuon', 'garden', 'cay coi', 'thien nhien', 'cay xanh', 'xanh mat', 'yen tinh'],
    check: (r) => r.view?.toLowerCase().includes('vườn') || r.view?.toLowerCase().includes('garden'),
  },

  CITY_VIEW: {
    label: 'Hướng Thành Phố',
    keywords: ['pho', 'thanh pho', 'city', 'do thi', 'trung tam', 'nhon nhip', 'pho thi'],
    check: (r) => r.view?.toLowerCase().includes('thành phố') || r.view?.toLowerCase().includes('city'),
  },

  LUXURY: {
    label: 'Hạng Phòng Cao Cấp / Sang Trọng',
    keywords: [
      'vip', 'sang trong', 'luxury', 'cao cap', 'dat nhat', 'xin nhat', 'xin xo',
      'thuong gia', 'villa', 'biet thu', 'penthouse', 'hoang gia', 'dang cap', 'dac biet'
    ],
    check: (r) => r.baseRate >= 3500000 || r.code.includes('PNT') || r.code.includes('EXC'),
  },

  BUDGET: {
    label: 'Giá Tốt / Tiết Kiệm',
    keywords: [
      're', 'gia re', 'tiet kiem', 'binh dan', 'tieu chuan', 're nhat',
      'hat de', 'kinh te', 'vua tui tien', 'gia tot', 'hop ly'
    ],
    check: (r) => r.baseRate <= 2500000 || r.code.includes('STD'),
  },

  FAMILY: {
    label: 'Gia Đình / Nhóm Đông Người',
    keywords: [
      'gia dinh', 'family', 'dong nguoi', 'nhieu nguoi', 'nhom', 'tre em',
      'con nho', 'em be', '4 nguoi', '3 nguoi', '5 nguoi', 'nhieu giuong', '2 giuong'
    ],
    check: (r) =>
      r.maxAdults >= 3 ||
      r.maxChildren >= 2 ||
      r.bedding?.toLowerCase().includes('2 ') ||
      r.bedding?.toLowerCase().includes('sofa') ||
      r.area >= 50,
  },

  COUPLE: {
    label: 'Cặp Đôi / Tuần Trăng Mật',
    keywords: [
      'cap doi', 'tinh nhan', 'lang man', '2 nguoi', 'honeymoon', 'trang mat',
      'rieng tu', 'king bed', 'giuong king'
    ],
    check: (r) => r.maxAdults === 2 && (r.bedding?.includes('King') || r.amenities?.includes('bathtub')),
  },

  ACCESSIBLE: {
    label: 'Tiếp Cận Xe Lăn (ADA)',
    keywords: [
      'khuyet tat', 'xe lan', 'tiep can', 'ada', 'roll-in', 'tang 1', 'tang tret',
      'loi di rong', 'khong bac thang', 'khong rao can', 'nguoi gia', 'kho di lai'
    ],
    check: (r) =>
      r.amenities?.includes('ada') ||
      r.code.includes('ACC') ||
      r.description?.toLowerCase().includes('ada') ||
      r.name?.toLowerCase().includes('khuyết tật'),
  },

  BATHTUB: {
    label: 'Bồn Tắm Nằm Thư Giãn',
    keywords: ['bon tam', 'tam ngam', 'bathtub', 'soaking', 'ngam minh', 'tam bon', 'bon nam'],
    check: (r) => r.amenities?.includes('bathtub') || r.description?.toLowerCase().includes('bồn tắm'),
  },

  JACUZZI: {
    label: 'Bồn Sục Jacuzzi / Spa',
    keywords: ['bon suc', 'jacuzzi', 'thuy luc', 'spa', 'massage', 'suc nuoc', 'jacuzi'],
    check: (r) => r.amenities?.includes('jacuzzi') || r.description?.toLowerCase().includes('jacuzzi'),
  },

  BALCONY: {
    label: 'Ban Công View Biển',
    keywords: ['ban cong', 'balcony', 'hien', 'san thuong', 'deck', 'ngoai troi', 'ngam canh'],
    check: (r) => r.amenities?.includes('balcony') || r.view?.toLowerCase().includes('deck'),
  },

  POOL: {
    label: 'Hồ Bơi Riêng',
    keywords: ['ho boi', 'be boi', 'pool', 'boi loi', 'ho boi rieng', 'private pool', 'vo cuc'],
    check: (r) => r.amenities?.includes('pool'),
  },

  KITCHEN: {
    label: 'Bếp / Tự Nấu Ăn',
    keywords: ['bep', 'kitchen', 'nau an', 'kitchenette', 'nau nuong', 'che bien', 'tu nau'],
    check: (r) => r.amenities?.includes('kitchen'),
  },

  WORKSPACE: {
    label: 'Khu Vực Bàn Làm Việc',
    keywords: ['lam viec', 'work', 'workspace', 'cong tac', 'doanh nhan', 'ban lam viec', 'laptop'],
    check: (r) => r.amenities?.includes('workspace'),
  },

  BUTLER: {
    label: 'Dịch Vụ Quản Gia 24/7',
    keywords: ['quan gia', 'butler', 'phuc vu 24/7', 'cham soc', 'rieng biet'],
    check: (r) => r.amenities?.includes('butler'),
  },
};

// ─── 3. Trích Xuất Ý Định Người Dùng (Intent & Constraint Parser) ────────────
export function extractIntentsFromQuery(rawQuery = '') {
  const norm = removeVietnameseDiacritics(rawQuery);
  const intents = {
    priceMax: null,
    priceMin: null,
    sortByPrice: null, // 'asc' | 'desc'
    targetAdults: null,
    targetChildren: null,
    minArea: null,
    matchedConcepts: [],
    rawTokens: norm.split(/\s+/).filter(Boolean),
  };

  // Trích xuất giá (ví dụ: "dưới 3 triệu", "duoi 3tr", "dưới 3.000.000", "tầm 2tr")
  const matchMaxPrice = norm.match(/(?:duoi|nho hon|toi da|tam|khoang)\s*([0-9.,]+)\s*(tr|trieu|k|nghin|ngan|dong|vnd|d)?/);
  if (matchMaxPrice) {
    let val = parseFloat(matchMaxPrice[1].replace(/,/g, '.'));
    const unit = matchMaxPrice[2];
    if (unit === 'tr' || unit === 'trieu' || val < 100) {
      val = val * 1000000;
    } else if (unit === 'k' || unit === 'nghin' || unit === 'ngan') {
      val = val * 1000;
    }
    if (!isNaN(val) && val > 0) intents.priceMax = val;
  }

  // "trên X triệu"
  const matchMinPrice = norm.match(/(?:tren|lon hon|tu)\s*([0-9.,]+)\s*(tr|trieu|k|nghin|ngan|dong|vnd|d)?/);
  if (matchMinPrice) {
    let val = parseFloat(matchMinPrice[1].replace(/,/g, '.'));
    const unit = matchMinPrice[2];
    if (unit === 'tr' || unit === 'trieu' || val < 100) {
      val = val * 1000000;
    }
    if (!isNaN(val) && val > 0) intents.priceMin = val;
  }

  if (norm.includes('re nhat') || norm.includes('tiet kiem nhat')) {
    intents.sortByPrice = 'asc';
  } else if (norm.includes('dat nhat') || norm.includes('cao cap nhat') || norm.includes('vip nhat')) {
    intents.sortByPrice = 'desc';
  }

  // Trích xuất số người (ví dụ: "4 nguoi", "2 nguoi lon", "cho 3 nguoi")
  const matchAdults = norm.match(/([1-9])\s*(?:nguoi lon|nguoi|khach)/);
  if (matchAdults) {
    intents.targetAdults = parseInt(matchAdults[1], 10);
  }

  // Trích xuất trẻ em (ví dụ: "2 tre em", "1 con nho")
  const matchChildren = norm.match(/([1-9])\s*(?:tre em|tre con|em be|con nho)/);
  if (matchChildren) {
    intents.targetChildren = parseInt(matchChildren[1], 10);
  }

  // Trích xuất diện tích (ví dụ: "tren 50m2", "rong hon 40 met")
  const matchArea = norm.match(/(?:tren|lon hon|rong hon)\s*([0-9]+)\s*(?:m2|met|m vuông)/);
  if (matchArea) {
    intents.minArea = parseInt(matchArea[1], 10);
  }

  // Khớp các khái niệm ngữ nghĩa (Semantic Concepts)
  Object.entries(SEMANTIC_CONCEPTS).forEach(([key, concept]) => {
    const isMatched = concept.keywords.some((kw) => {
      if (norm.includes(kw)) return true;
      // Thử fuzzy match với từng token
      const kwTokens = kw.split(' ');
      if (kwTokens.length === 1) {
        return intents.rawTokens.some((t) => isFuzzyMatch(t, kw, 1));
      }
      return false;
    });

    if (isMatched) {
      intents.matchedConcepts.push({ key, label: concept.label, concept });
    }
  });

  return intents;
}

// ─── 4. Hệ Thống Đánh Giá Cá Nhân Hóa (Personalization Store) ─────────────────
const PERSONALIZATION_KEY = 'qlks_user_behavior';

export function getUserPreferences() {
  const base = { viewedRoomIds: {}, preferredConcepts: {}, recentSearches: [] };
  try {
    const raw = localStorage.getItem(PERSONALIZATION_KEY);
    if (raw) {
      const p = JSON.parse(raw) || {};
      return {
        viewedRoomIds: p.viewedRoomIds || {},
        preferredConcepts: p.preferredConcepts || {},
        recentSearches: Array.isArray(p.recentSearches) ? p.recentSearches : [],
      };
    }
  } catch (_) { }
  return base;
}

export function trackUserInteraction(room, action = 'view') {
  try {
    const prefs = getUserPreferences();
    prefs.viewedRoomIds[room.id] = (prefs.viewedRoomIds[room.id] || 0) + 1;

    // Ghi nhận tiện nghi phòng người dùng ưa thích
    if (room.view?.includes('Ocean') || room.view?.includes('Biển')) {
      prefs.preferredConcepts.OCEAN_VIEW = (prefs.preferredConcepts.OCEAN_VIEW || 0) + 1;
    }
    if (room.amenities?.includes('bathtub')) {
      prefs.preferredConcepts.BATHTUB = (prefs.preferredConcepts.BATHTUB || 0) + 1;
    }
    if (room.amenities?.includes('jacuzzi')) {
      prefs.preferredConcepts.JACUZZI = (prefs.preferredConcepts.JACUZZI || 0) + 1;
    }

    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(prefs));
  } catch (_) { }
}

export function saveSearchHistory(query) {
  if (!query || !query.trim()) return;
  try {
    const prefs = getUserPreferences();
    prefs.recentSearches = [query.trim(), ...(prefs.recentSearches || []).filter((q) => q !== query.trim())].slice(0, 5);
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(prefs));
  } catch (_) { }
}

// ─── 5. Thuật Toán Tìm Kiếm Ngữ Nghĩa & Chấm Điểm (Semantic Retrieval) ────────
export function performSemanticSearch(roomTypes = [], query = '') {
  if (!query || !query.trim()) {
    return roomTypes.map((r) => ({
      ...r,
      semanticScore: 100,
      matchedReasons: ['Hiển thị danh sách tiêu chuẩn'],
      personalizationBoost: false,
    }));
  }

  saveSearchHistory(query);
  const intents = extractIntentsFromQuery(query);
  const normQuery = removeVietnameseDiacritics(query);
  const queryTokens = intents.rawTokens;
  const userPrefs = getUserPreferences();

  const scoredList = roomTypes.map((room) => {
    let score = 0;
    const reasons = [];

    const normName = removeVietnameseDiacritics(room.name);
    const normCode = removeVietnameseDiacritics(room.code);
    const normDesc = removeVietnameseDiacritics(room.description);
    const normBedding = removeVietnameseDiacritics(room.bedding);
    const normView = removeVietnameseDiacritics(room.view);

    // a. Trực tiếp khớp từ khóa (Exact & Fuzzy Token Match)
    queryTokens.forEach((token) => {
      if (token.length <= 1) return;
      if (normCode.includes(token)) {
        score += 35;
        reasons.push(`Trùng mã phòng: ${room.code}`);
      } else if (normName.includes(token)) {
        score += 25;
        reasons.push(`Trùng tên hạng phòng: ${token}`);
      } else if (normView.includes(token)) {
        score += 20;
        reasons.push(`Trùng hướng nhìn: ${room.view}`);
      } else if (normBedding.includes(token)) {
        score += 15;
        reasons.push(`Trùng kiểu giường: ${room.bedding}`);
      } else if (normDesc.includes(token)) {
        score += 10;
      } else {
        // Thử fuzzy tolerance
        const isFuzzyName = normName.split(' ').some((w) => isFuzzyMatch(token, w, 1));
        if (isFuzzyName) {
          score += 15;
          reasons.push(`Khớp chính tả gần đúng: "${token}"`);
        }
      }
    });

    // b. Khớp ngữ cảnh ngữ nghĩa (Semantic Concepts)
    intents.matchedConcepts.forEach(({ key, label, concept }) => {
      if (concept.check(room)) {
        score += 40;
        reasons.push(`Khớp tiêu chí: ${label}`);
      }
    });

    // c. Ràng buộc về giá (Price Constraints)
    if (intents.priceMax !== null) {
      if (room.baseRate <= intents.priceMax) {
        score += 30;
        reasons.push(`Giá trong ngân sách (<= ${(intents.priceMax / 1000000).toFixed(1)} triệu)`);
      } else {
        score -= 25; // Trừ điểm nếu vượt ngân sách
      }
    }
    if (intents.priceMin !== null) {
      if (room.baseRate >= intents.priceMin) {
        score += 20;
      }
    }

    // d. Ràng buộc về sức chứa (Capacity Constraints)
    if (intents.targetAdults !== null) {
      if (room.maxAdults >= intents.targetAdults) {
        score += 25;
        reasons.push(`Đủ sức chứa cho ${intents.targetAdults} người lớn`);
      } else {
        score -= 30; // Không đủ chỗ
      }
    }

    // e. Ràng buộc diện tích
    if (intents.minArea !== null) {
      if (room.area >= intents.minArea) {
        score += 20;
        reasons.push(`Diện tích rộng (${room.area}m² >= ${intents.minArea}m²)`);
      }
    }

    // f. Cá nhân hóa (Personalization Boost)
    let hasPersonalizationBoost = false;
    const viewCount = userPrefs.viewedRoomIds[room.id] || 0;
    if (viewCount > 0) {
      score += Math.min(viewCount * 5, 20); // Tối đa +20 điểm
      reasons.push(`Ưu tiên theo thói quen: Bạn đã quan tâm phòng này ${viewCount} lần`);
      hasPersonalizationBoost = true;
    }

    return {
      ...room,
      semanticScore: Math.max(0, Math.min(score, 100)),
      matchedReasons: Array.from(new Set(reasons)),
      personalizationBoost: hasPersonalizationBoost,
    };
  });

  // Lọc chỉ giữ lại những phòng có điểm liên quan hoặc sắp xếp theo độ phù hợp
  let filtered = scoredList.filter((r) => r.semanticScore > 0);

  // Nếu không khớp từ nào, dùng fallback fuzzy rộng
  if (filtered.length === 0) {
    filtered = scoredList.map((r) => ({
      ...r,
      semanticScore: 10,
      matchedReasons: ['Gợi ý tham khảo dựa trên toàn bộ danh mục'],
    }));
  }

  // Sắp xếp
  if (intents.sortByPrice === 'asc') {
    filtered.sort((a, b) => a.baseRate - b.baseRate);
  } else if (intents.sortByPrice === 'desc') {
    filtered.sort((a, b) => b.baseRate - a.baseRate);
  } else {
    // Sắp xếp theo điểm số ngữ nghĩa cao nhất
    filtered.sort((a, b) => b.semanticScore - a.semanticScore);
  }

  return filtered;
}

// ─── 6. RAG: TỔNG HỢP VĂN BẢN TRẢ LỜI TỰ NHIÊN (Generation Phase) ────────────
/**
 * RAG Generator: Đọc các tài liệu phòng liên quan vừa truy xuất (Retrieval)
 * và tổng hợp câu trả lời tự nhiên kèm trích dẫn nguồn [Mã phòng].
 */
export function generateRagAnswer(query = '', topRooms = []) {
  if (!query || !query.trim() || topRooms.length === 0) {
    return null;
  }

  const intents = extractIntentsFromQuery(query);
  const bestMatch = topRooms[0];
  const secondMatch = topRooms[1];

  // 1. Tóm tắt ý định người dùng nhận diện được
  const identifiedTraits = [];
  if (intents.matchedConcepts.length > 0) {
    identifiedTraits.push(intents.matchedConcepts.map((c) => c.label).join(', '));
  }
  if (intents.targetAdults) {
    identifiedTraits.push(`cho ${intents.targetAdults} người lớn`);
  }
  if (intents.priceMax) {
    identifiedTraits.push(`ngân sách dưới ${(intents.priceMax / 1000000).toFixed(1)} triệu`);
  }

  const intentSummary = identifiedTraits.length > 0
    ? `Dựa trên yêu cầu của bạn về "${identifiedTraits.join(', ')}"`
    : `Dựa trên câu hỏi "${query.trim()}"`;

  // 2. Tổng hợp câu trả lời chi tiết kèm dẫn chứng trích dẫn nguồn
  let answerContent = '';
  let recommendations = [];

  if (bestMatch) {
    answerContent = `${intentSummary}, hệ thống AI đã phân tích cơ sở dữ liệu khách sạn và gợi ý lựa chọn tối ưu nhất là [${bestMatch.code}] - ${bestMatch.name}. `;

    // Nêu lý do vì sao phù hợp
    const reasonsStr = bestMatch.matchedReasons.slice(0, 3).join(', ');
    if (reasonsStr) {
      answerContent += `Phòng này đáp ứng xuất sắc các tiêu chí (${reasonsStr}). `;
    }

    answerContent += `Thông số chính: Diện tích ${bestMatch.area} m², quy cách ${bestMatch.bedding}, hướng nhìn ${bestMatch.view}, sức chứa ${bestMatch.maxAdults} người lớn + ${bestMatch.maxChildren} trẻ em với mức giá niêm yết ${Number(bestMatch.baseRate).toLocaleString('vi-VN')} ₫/đêm.`;

    recommendations.push({
      room: bestMatch,
      highlight: `Lựa chọn số 1: [${bestMatch.code}] với điểm tương thích ${bestMatch.semanticScore}%`,
    });
  }

  if (secondMatch && secondMatch.semanticScore >= 30) {
    answerContent += `\n\nNgoài ra, bạn cũng có thể cân nhắc thêm [${secondMatch.code}] - ${secondMatch.name} (${Number(secondMatch.baseRate).toLocaleString('vi-VN')} ₫/đêm). `;
    if (secondMatch.baseRate < bestMatch.baseRate) {
      answerContent += `Đây là phương án giúp tiết kiệm hơn ${(Number(bestMatch.baseRate) - Number(secondMatch.baseRate)).toLocaleString('vi-VN')} ₫/đêm mà vẫn đảm bảo tiện nghi chuẩn resort.`;
    } else {
      answerContent += `Đây là phương án mở rộng không gian với diện tích ${secondMatch.area} m² và dịch vụ cao cấp hơn.`;
    }

    recommendations.push({
      room: secondMatch,
      highlight: `Lựa chọn số 2: [${secondMatch.code}] - Điểm tương thích ${secondMatch.semanticScore}%`,
    });
  }

  return {
    query,
    intentSummary,
    answerText: answerContent,
    citedRooms: topRooms.slice(0, 3),
    recommendations,
    matchedConcepts: intents.matchedConcepts.map((c) => c.label),
  };
}
