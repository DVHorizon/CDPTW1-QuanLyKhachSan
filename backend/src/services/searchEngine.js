'use strict';

const Fuse = require('fuse.js');

/**
 * Loại bỏ dấu tiếng Việt để hỗ trợ tìm kiếm không dấu
 * ví dụ: 'Bể Bơi Vô Cực' -> 'be boi vo cuc'
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
  // Xóa các ký tự đặc biệt
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

/**
 * Từ điển từ đồng nghĩa trong ngành khách sạn nghỉ dưỡng cao cấp
 */
const SYNONYMS = {
  pool: ['hồ bơi', 'bể bơi', 'vô cực', 'jacuzzi', 'private pool'],
  bien: ['biển', 'ocean', 'beach', 'hướng biển', 'bãi khem', 'bãi dài', 'sunset'],
  villa: ['biệt thự', 'villa', 'penthouse', 'sanctuary'],
  suite: ['suite', 'thượng tuyển', 'executive', 'premier'],
  vip: ['tổng thống', 'hoàng gia', 'royal', 'presidential', 'cao cấp'],
  spa: ['spa', 'xông hơi', 'trị liệu', 'massage', 'thư giãn'],
  buffet: ['ăn sáng', 'bữa sáng', 'buffet', 'ẩm thực', 'nhà hàng', 'dining'],
  jacuzzi: ['bồn tắm', 'jacuzzi', 'bồn sục', 'sục khí']
};

class RoomSearchEngine {
  constructor() {
    this.fuseOptions = {
      includeScore: true,
      shouldSort: true,
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: 'TypeName', weight: 0.45 },
        { name: 'typeNameNorm', weight: 0.35 },
        { name: 'Category', weight: 0.2 },
        { name: 'categoryNorm', weight: 0.15 },
        { name: 'Description', weight: 0.15 },
        { name: 'descNorm', weight: 0.1 },
        { name: 'amenitiesText', weight: 0.2 },
        { name: 'amenitiesNorm', weight: 0.15 },
        { name: 'View', weight: 0.15 },
        { name: 'BedType', weight: 0.1 }
      ]
    };
  }

  /**
   * Chuẩn bị dữ liệu chỉ mục tìm kiếm
   */
  prepareIndexData(rooms) {
    return rooms.map(room => {
      const amenitiesArr = Array.isArray(room.amenities)
        ? room.amenities.map(a => (typeof a === 'string' ? a : a.AmenityName || a.name || ''))
        : [];
      const amenitiesText = amenitiesArr.join(' ');

      return {
        ...room,
        typeNameNorm: removeVietnameseTones(room.TypeName || ''),
        categoryNorm: removeVietnameseTones(room.Category || ''),
        descNorm: removeVietnameseTones(room.Description || ''),
        amenitiesText,
        amenitiesNorm: removeVietnameseTones(amenitiesText),
        viewNorm: removeVietnameseTones(room.View || '')
      };
    });
  }

  /**
   * Mở rộng từ khóa tìm kiếm qua từ điển đồng nghĩa
   */
  expandKeyword(keyword) {
    if (!keyword) return '';
    const norm = removeVietnameseTones(keyword).toLowerCase();
    const additions = [];
    for (const [key, synList] of Object.entries(SYNONYMS)) {
      if (norm.includes(key)) {
        additions.push(...synList);
      } else {
        for (const syn of synList) {
          if (norm.includes(removeVietnameseTones(syn))) {
            additions.push(key, ...synList);
            break;
          }
        }
      }
    }
    return additions.length > 0 ? `${keyword} ${Array.from(new Set(additions)).join(' ')}` : keyword;
  }

  /**
   * Thực hiện tìm kiếm và xếp hạng phù hợp
   * @param {Array} rooms - Danh sách phòng khả dụng
   * @param {string} keyword - Từ khóa tìm kiếm tự do
   * @returns {Object} { results, metadata }
   */
  search(rooms, keyword) {
    const startTime = process.hrtime();

    if (!rooms || rooms.length === 0) {
      return {
        results: [],
        metadata: {
          engine: 'Fuse.js + Vietnamese NLP Normalizer',
          totalAvailable: 0,
          matchedCount: 0,
          executionTimeMs: 0
        }
      };
    }

    const indexedRooms = this.prepareIndexData(rooms);

    if (!keyword || !keyword.trim()) {
      const [diffSec, diffNano] = process.hrtime(startTime);
      const executionTimeMs = Number((diffSec * 1000 + diffNano / 1e6).toFixed(2));
      return {
        results: rooms,
        metadata: {
          engine: 'Fuse.js + Vietnamese NLP Normalizer',
          totalAvailable: rooms.length,
          matchedCount: rooms.length,
          executionTimeMs
        }
      };
    }

    const trimmedKeyword = keyword.trim();
    const expandedKeyword = this.expandKeyword(trimmedKeyword);
    const normalizedKeyword = removeVietnameseTones(trimmedKeyword);

    const fuse = new Fuse(indexedRooms, this.fuseOptions);

    // Tìm kiếm với từ khóa gốc & từ khóa chuẩn hóa
    const searchResults = fuse.search(trimmedKeyword);
    let matchedItems = [];

    if (searchResults.length > 0) {
      matchedItems = searchResults.map(res => ({
        ...res.item,
        searchScore: res.score,
        relevance: Number(((1 - (res.score || 0)) * 100).toFixed(1))
      }));
    } else {
      // Thử tìm kiếm với từ khóa chuẩn hóa không dấu
      const fallbackResults = fuse.search(normalizedKeyword);
      matchedItems = fallbackResults.map(res => ({
        ...res.item,
        searchScore: res.score,
        relevance: Number(((1 - (res.score || 0)) * 100).toFixed(1))
      }));
    }

    // Làm sạch các trường chuẩn hóa tạm thời trước khi trả về
    const cleanResults = matchedItems.map(item => {
      const copy = { ...item };
      delete copy.typeNameNorm;
      delete copy.categoryNorm;
      delete copy.descNorm;
      delete copy.amenitiesText;
      delete copy.amenitiesNorm;
      delete copy.viewNorm;
      return copy;
    });

    const [diffSec, diffNano] = process.hrtime(startTime);
    const executionTimeMs = Number((diffSec * 1000 + diffNano / 1e6).toFixed(2));

    return {
      results: cleanResults,
      metadata: {
        engine: 'Fuse.js + Vietnamese NLP Normalizer',
        query: trimmedKeyword,
        expandedQuery: expandedKeyword !== trimmedKeyword ? expandedKeyword : undefined,
        totalAvailable: rooms.length,
        matchedCount: cleanResults.length,
        executionTimeMs
      }
    };
  }
}

module.exports = new RoomSearchEngine();
