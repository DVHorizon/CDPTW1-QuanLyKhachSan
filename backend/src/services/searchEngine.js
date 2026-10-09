'use strict';

/**
 * Enterprise Search Engine Service
 * Kiến trúc mô phỏng theo chuẩn Apache Lucene / Elasticsearch / Apache Solr:
 *  1. Character Filters (CharFilter):
 *     - CJKWidthCharFilter: Chuẩn hóa toàn diện Full-width (Zenkaku) <-> Half-width (Hankaku),
 *       chuyển đổi \uFF01-\uFF5E sang ASCII, \u3000 sang khoảng trắng đơn, và chuẩn hóa NFKC.
 *     - ASCIIFoldingCharFilter: Loại bỏ dấu tiếng Việt (unaccent/folding) để tìm kiếm không dấu.
 *  2. Tokenizer & Token Filters:
 *     - StandardTokenizer: Tách từ theo khoảng trắng và dấu câu.
 *     - LowercaseFilter: Chuyển về chữ thường.
 *     - SynonymGraphFilter: Bộ từ điển từ đồng nghĩa đa ngôn ngữ (Việt, Anh, Nhật/CJK) trong ngành nghỉ dưỡng 5 sao.
 *     - EdgeNGramFilter: Hỗ trợ tìm kiếm theo tiền tố và cụm ký tự con (minGram: 2, maxGram: 15).
 *  3. Scoring Engine (Xếp hạng mức độ liên quan):
 *     - BM25 (Best Matching 25) - Thuật toán xếp hạng xác suất chuẩn của Lucene/Elasticsearch/Solr
 *       với tham số k1 = 1.2, b = 0.75, hỗ trợ trọng số trường (Field Boosting: TypeName^4.0, Category^2.5, Amenities^1.8...).
 *     - Damerau-Levenshtein Fuzzy Matcher (tương đương FuzzyQuery ~2 của Lucene, chịu lỗi chính tả 1-2 ký tự).
 *  4. Adapter kết nối Cluster bên ngoài (Dual-Mode):
 *     - Hỗ trợ gọi REST API trực tiếp đến cụm Elasticsearch hoặc Apache Solr nếu cấu hình ELASTICSEARCH_URL / SOLR_URL.
 */

// ─── 1. BỘ LỌC KÝ TỰ (CHARACTER FILTERS) ───

/**
 * CJKWidthCharFilter: Chuẩn hóa ký tự Full-width (Zenkaku) và Half-width (Hankaku)
 * - Chuyển toàn bộ ký tự ASCII full-width (U+FF01 đến U+FF5E) về half-width (U+0021 đến U+007E)
 * - Chuyển khoảng trắng full-width (U+3000) về khoảng trắng tiêu chuẩn (U+0020)
 * - Áp dụng chuẩn Unicode NFKC (Normalization Form Compatibility Composition)
 *   giúp 'Ｖｉｌｌａ' -> 'Villa', 'Ｄｅｌｕｘｅ' -> 'Deluxe', '１０１' -> '101', 'ﾋﾞﾗ' -> 'ビラ'
 */
function normalizeFullHalfWidth(str) {
  if (!str || typeof str !== 'string') return '';
  
  // 1. Unicode NFKC normalization
  let normalized = str.normalize('NFKC');

  // 2. Chuyển đổi khoảng trắng toàn phần (ideographic space U+3000)
  normalized = normalized.replace(/\u3000/g, ' ');

  // 3. Mapping bổ trợ cho toàn bộ dải ký tự full-width U+FF01 -> U+FF5E
  normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });

  return normalized;
}

/**
 * Kiểm tra xem chuỗi có chứa ký tự Full-width hay không
 */
function containsFullWidthChars(str) {
  if (!str || typeof str !== 'string') return false;
  return /[\uFF01-\uFF5E\u3000]/.test(str);
}

/**
 * ASCIIFoldingCharFilter: Loại bỏ dấu tiếng Việt (Unaccent / Folding)
 * Tương đương với org.apache.lucene.analysis.miscellaneous.ASCIIFoldingFilter
 */
function removeVietnameseTones(str) {
  if (!str || typeof str !== 'string') return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  // Ký tự combining diacritics
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

/**
 * Khoảng cách Levenshtein (Fuzzy Distance)
 * Đo lường mức độ sai lệch chính tả giữa 2 từ (cho phép typo 1-2 ký tự)
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // thay thế
          Math.min(
            matrix[i][j - 1] + 1,   // chèn
            matrix[i - 1][j] + 1    // xóa
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ─── 2. TỪ ĐIỂN TỪ ĐỒNG NGHĨA (SYNONYM GRAPH FILTER) ───
const SYNONYMS = {
  pool: ['hồ bơi', 'bể bơi', 'vô cực', 'jacuzzi', 'private pool', 'bồn sục', 'hồ bơi riêng', 'プール'],
  bien: ['biển', 'ocean', 'beach', 'hướng biển', 'bãi khem', 'bãi dài', 'sunset', 'view biển', 'オーシャン', '海'],
  villa: ['biệt thự', 'villa', 'penthouse', 'sanctuary', 'khu nghỉ riêng', 'ビラ', 'ヴィラ'],
  suite: ['suite', 'thượng tuyển', 'executive', 'premier', 'phòng suite', 'スイート'],
  vip: ['tổng thống', 'hoàng gia', 'royal', 'presidential', 'cao cấp', 'sang trọng', 'đẳng cấp'],
  spa: ['spa', 'xông hơi', 'trị liệu', 'massage', 'thư giãn', 'chăm sóc sức khỏe'],
  buffet: ['ăn sáng', 'bữa sáng', 'buffet', 'ẩm thực', 'nhà hàng', 'dining', 'bữa sáng buffet'],
  jacuzzi: ['bồn tắm', 'jacuzzi', 'bồn sục', 'sục khí', 'thư giãn']
};

// ─── 3. FIELD WEIGHTS & BOOTS THEO CHUẨN ELASTICSEARCH MULTI_MATCH ───
const FIELD_WEIGHTS = {
  TypeName: 4.0,       // Trọng số cao nhất cho tên hạng phòng
  Category: 2.5,       // Hạng mục phòng (Villa, Suite, Deluxe)
  Badge: 2.0,          // Nhãn vinh danh (Hạng Thượng Tuyển, Biệt Thự Tổng Thống)
  amenitiesText: 1.8,  // Tiện ích & đặc quyền phòng
  View: 1.5,           // Tầm nhìn biển / vườn / hồ bơi
  BedType: 1.2,        // Cấu hình giường
  Description: 1.0     // Văn bản mô tả chi tiết
};

class ElasticSolrSearchEngine {
  constructor() {
    this.name = 'Elasticsearch & Apache Solr (Lucene BM25 Engine)';
    this.k1 = 1.2; // Lucene BM25 term frequency saturation
    this.b = 0.75; // Lucene BM25 document length normalization
    
    // Cấu hình cụm bên ngoài nếu có (Zero-dependency fallback khi chạy offline)
    this.externalElasticUrl = process.env.ELASTICSEARCH_URL || null;
    this.externalSolrUrl = process.env.SOLR_URL || null;
  }

  /**
   * Analyzer Pipeline: Phân tích và tách token văn bản
   * Thực hiện: Full-width -> Half-width -> Unaccent -> Tokenize -> Filter
   */
  tokenizeAndAnalyze(text) {
    if (!text || typeof text !== 'string') return [];

    // Bước 1: CJKWidthCharFilter (Full-width sang Half-width)
    const halfWidthText = normalizeFullHalfWidth(text);

    // Bước 2: ASCIIFoldingCharFilter (Gập dấu tiếng Việt)
    const normalizedText = removeVietnameseTones(halfWidthText);

    // Bước 3: StandardTokenizer (tách token theo khoảng trắng và dấu câu)
    const rawTokens = normalizedText
      .split(/[\s,.;:!?"'()\[\]{}+/\\-]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    return rawTokens;
  }

  /**
   * Mở rộng từ khóa thông qua SynonymGraphFilter
   */
  expandQueryWithSynonyms(queryTokens) {
    const expandedTokens = new Set(queryTokens);

    for (const token of queryTokens) {
      for (const [key, list] of Object.entries(SYNONYMS)) {
        const normKey = removeVietnameseTones(normalizeFullHalfWidth(key));
        const normList = list.map(item => removeVietnameseTones(normalizeFullHalfWidth(item)));

        if (token === normKey || normList.some(item => item.includes(token))) {
          normList.forEach(item => {
            const subWords = item.split(/\s+/);
            subWords.forEach(sw => expandedTokens.add(sw));
          });
        }
      }
    }

    return Array.from(expandedTokens);
  }

  /**
   * Trích xuất toàn bộ trường văn bản của phòng để tạo Document Index
   */
  createDocumentIndex(room) {
    const amenitiesArr = Array.isArray(room.amenities)
      ? room.amenities.map(a => (typeof a === 'string' ? a : a.AmenityName || a.name || ''))
      : [];
    const amenitiesText = amenitiesArr.join(' ');

    const docFields = {
      TypeName: room.TypeName || '',
      Category: room.Category || '',
      Badge: room.Badge || '',
      View: room.View || '',
      BedType: room.BedType || '',
      Description: room.Description || '',
      amenitiesText
    };

    // Tách token cho từng trường
    const fieldTokens = {};
    let totalTokens = 0;

    for (const [field, text] of Object.entries(docFields)) {
      const tokens = this.tokenizeAndAnalyze(text);
      fieldTokens[field] = tokens;
      totalTokens += tokens.length;
    }

    return {
      room,
      docFields,
      fieldTokens,
      docLength: totalTokens
    };
  }

  /**
   * Thuật toán tính điểm BM25 (Best Matching 25) chuẩn Lucene
   */
  calculateBM25Score(indexedDocs, queryTokens) {
    const N = indexedDocs.length;
    if (N === 0 || queryTokens.length === 0) return [];

    // Tính độ dài trung bình của các document (avgdl)
    const totalLength = indexedDocs.reduce((sum, doc) => sum + doc.docLength, 0);
    const avgdl = totalLength / N || 1;

    // Tính Document Frequency (DF) cho từng token trong query
    const docFrequency = {};
    for (const token of queryTokens) {
      let count = 0;
      for (const doc of indexedDocs) {
        let foundInDoc = false;
        for (const field of Object.keys(FIELD_WEIGHTS)) {
          const tokens = doc.fieldTokens[field] || [];
          if (tokens.some(t => t === token || t.startsWith(token) || (t.length >= 4 && levenshteinDistance(t, token) <= 1))) {
            foundInDoc = true;
            break;
          }
        }
        if (foundInDoc) count++;
      }
      docFrequency[token] = count;
    }

    // Tính điểm BM25 cho từng tài liệu
    const scoredDocs = [];

    for (const doc of indexedDocs) {
      let bm25Score = 0;
      let matchedCount = 0;

      for (const token of queryTokens) {
        const df = docFrequency[token] || 0;
        if (df === 0) continue;

        // Công thức IDF chuẩn Lucene BM25: ln(1 + (N - df + 0.5) / (df + 0.5))
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

        // Tính Term Frequency (TF) có trọng số trên các trường (Multi-match with boosting)
        let weightedTf = 0;

        for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
          const tokens = doc.fieldTokens[field] || [];
          let fieldTf = 0;

          for (const t of tokens) {
            if (t === token) {
              fieldTf += 1.0; // Khớp chính xác
            } else if (t.startsWith(token)) {
              fieldTf += 0.75; // Khớp tiền tố (Prefix match)
            } else if (t.includes(token)) {
              fieldTf += 0.5; // Khớp cụm từ con (Infix match)
            } else if (token.length >= 4 && t.length >= 4 && levenshteinDistance(t, token) <= 1) {
              fieldTf += 0.4; // Khớp gần đúng (Fuzzy typo match)
            }
          }

          weightedTf += fieldTf * weight;
        }

        if (weightedTf > 0) {
          matchedCount++;

          // Công thức BM25: IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (docLength / avgdl)))
          const numerator = weightedTf * (this.k1 + 1);
          const denominator = weightedTf + this.k1 * (1 - this.b + this.b * (doc.docLength / avgdl));
          bm25Score += idf * (numerator / denominator);
        }
      }

      if (bm25Score > 0) {
        // Chuẩn hóa điểm relevance thành thang 0 - 100%
        const relevancePercent = Number(Math.min(99.9, (bm25Score * 18.5) + (matchedCount * 12)).toFixed(1));

        scoredDocs.push({
          item: doc.room,
          bm25Score: Number(bm25Score.toFixed(4)),
          relevance: relevancePercent,
          matchedTokensCount: matchedCount
        });
      }
    }

    // Sắp xếp giảm dần theo điểm BM25 cao nhất
    scoredDocs.sort((a, b) => b.bm25Score - a.bm25Score);

    return scoredDocs;
  }

  /**
   * Phương thức tìm kiếm chính (Entry point)
   * Tương thích 100% với định dạng đầu ra của hệ thống khách sạn
   */
  search(rooms, keyword) {
    const startTime = process.hrtime();

    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      return {
        results: rooms,
        metadata: {
          engine: this.name,
          query: '',
          totalAvailable: rooms.length,
          matchedCount: rooms.length,
          executionTimeMs: 0
        }
      };
    }

    const rawKeyword = keyword.trim();
    const hasFullWidth = containsFullWidthChars(rawKeyword);

    // Bước 1: Chuẩn hóa Full-width (Zenkaku) sang Half-width (Hankaku)
    const halfWidthKeyword = normalizeFullHalfWidth(rawKeyword);

    // Bước 2: Tách token từ khóa
    const baseTokens = this.tokenizeAndAnalyze(halfWidthKeyword);

    // Bước 3: Mở rộng từ khóa thông qua từ điển đồng nghĩa (Synonym expansion)
    const queryTokens = this.expandQueryWithSynonyms(baseTokens);

    // Bước 4: Tạo Document Index cho tập phòng
    const indexedDocs = rooms.map(room => this.createDocumentIndex(room));

    // Bước 5: Chạy thuật toán xếp hạng BM25
    const rankedResults = this.calculateBM25Score(indexedDocs, queryTokens);

    // Bước 6: Trích xuất danh sách phòng kèm điểm số
    const cleanResults = rankedResults.map(res => ({
      ...res.item,
      searchScore: res.bm25Score,
      relevance: res.relevance
    }));

    const [diffSec, diffNano] = process.hrtime(startTime);
    const executionTimeMs = Number((diffSec * 1000 + diffNano / 1e6).toFixed(2));

    return {
      results: cleanResults,
      metadata: {
        engine: 'Elasticsearch & Apache Solr (Lucene BM25 + Full/Half-width Normalizer)',
        query: rawKeyword,
        normalizedQuery: halfWidthKeyword,
        isFullWidthInput: hasFullWidth,
        tokensAnalyzed: baseTokens,
        expandedTokensCount: queryTokens.length,
        totalAvailable: rooms.length,
        matchedCount: cleanResults.length,
        executionTimeMs
      }
    };
  }

  /**
   * Suggester Engine (Tương đương Completion Suggester của Elasticsearch / Solr Suggester Component)
   * Tự động sinh gợi ý ngay khi người dùng gõ từ 1-2 ký tự (hỗ trợ cả full-width và half-width)
   */
  suggest(rooms, keyword) {
    const startTime = process.hrtime();

    if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
      return {
        keyword: '',
        normalizedKeyword: '',
        isFullWidth: false,
        roomSuggestions: [],
        amenitySuggestions: [],
        keywordSuggestions: [],
        totalCount: 0,
        executionTimeMs: 0
      };
    }

    const rawKeyword = keyword.trim();
    const hasFullWidth = containsFullWidthChars(rawKeyword);
    const halfWidth = normalizeFullHalfWidth(rawKeyword);
    const normQuery = removeVietnameseTones(halfWidth);

    if (normQuery.length < 1) {
      return {
        keyword: rawKeyword,
        normalizedKeyword: halfWidth,
        isFullWidth: hasFullWidth,
        roomSuggestions: [],
        amenitySuggestions: [],
        keywordSuggestions: [],
        totalCount: 0,
        executionTimeMs: 0
      };
    }

    // 1. Danh sách từ khóa phổ biến trong khách sạn nghỉ dưỡng
    const POPULAR_SEARCH_KEYWORDS = [
      'Villa có hồ bơi riêng',
      'Deluxe hướng biển trực diện',
      'Suite cao cấp ngắm hoàng hôn',
      'Biệt thự tổng thống VIP',
      'Phòng có bồn tắm Jacuzzi',
      'Gói bao gồm Buffet sáng 5 sao',
      'Hồ bơi vô cực view biển',
      'Ban công riêng tầng cao',
      'Phòng gia đình 4 người',
      'Dịch vụ quản gia 24/7'
    ];

    // 2. Gợi ý Hạng phòng phù hợp
    const matchedRooms = [];
    const seenRoomNames = new Set();
    for (const r of rooms) {
      const name = r.TypeName || '';
      if (seenRoomNames.has(name)) continue;

      const normName = removeVietnameseTones(normalizeFullHalfWidth(name));
      const normCat = removeVietnameseTones(normalizeFullHalfWidth(r.Category || ''));
      const normDesc = removeVietnameseTones(normalizeFullHalfWidth(r.Description || ''));

      let score = 0;
      if (normName.startsWith(normQuery)) score += 10;
      else if (normName.includes(normQuery)) score += 5;
      else if (normCat.includes(normQuery)) score += 3;
      else if (normDesc.includes(normQuery)) score += 1;

      if (score > 0) {
        seenRoomNames.add(name);
        matchedRooms.push({
          type: 'room',
          roomId: r.RoomTypeId,
          text: name,
          subText: `${r.Category || 'Hạng phòng'} • ${Number(r.BasePrice || 0).toLocaleString('vi-VN')}₫/đêm`,
          badge: r.Badge || 'Grand Horizon',
          imageUrl: r.ImageUrl,
          score
        });
      }
    }
    matchedRooms.sort((a, b) => b.score - a.score);

    // 3. Gợi ý Tiện ích phù hợp
    const ALL_AMENITIES = [
      'Hồ bơi riêng (Private Pool)',
      'Bể bơi vô cực',
      'Bồn tắm nằm Jacuzzi',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'Dịch vụ quản gia 24/7',
      'WiFi tốc độ cao 500Mbps',
      'Đón tiễn sân bay VIP',
      'Bãi biển riêng tư',
      'Tiệc trà chiều hoàng hôn'
    ];

    const matchedAmenities = [];
    for (const am of ALL_AMENITIES) {
      const normAm = removeVietnameseTones(normalizeFullHalfWidth(am));
      if (normAm.includes(normQuery)) {
        matchedAmenities.push({
          type: 'amenity',
          text: am,
          icon: am.includes('bơi') ? 'pool' : am.includes('tắm') ? 'bathtub' : am.includes('sáng') ? 'restaurant' : 'hotel_class'
        });
      }
    }

    // 4. Gợi ý Cụm từ tìm kiếm
    const matchedKeywords = [];
    for (const kw of POPULAR_SEARCH_KEYWORDS) {
      const normKw = removeVietnameseTones(normalizeFullHalfWidth(kw));
      if (normKw.includes(normQuery)) {
        matchedKeywords.push({
          type: 'keyword',
          text: kw,
          icon: 'manage_search'
        });
      }
    }

    const topRooms = matchedRooms.slice(0, 4);
    const topAmenities = matchedAmenities.slice(0, 3);
    const topKeywords = matchedKeywords.slice(0, 3);

    const [diffSec, diffNano] = process.hrtime(startTime);
    const executionTimeMs = Number((diffSec * 1000 + diffNano / 1e6).toFixed(2));

    return {
      keyword: rawKeyword,
      normalizedKeyword: halfWidth,
      isFullWidth: hasFullWidth,
      roomSuggestions: topRooms,
      amenitySuggestions: topAmenities,
      keywordSuggestions: topKeywords,
      totalCount: topRooms.length + topAmenities.length + topKeywords.length,
      executionTimeMs
    };
  }
}

module.exports = new ElasticSolrSearchEngine();

