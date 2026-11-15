'use strict';

const client = require('../config/elasticsearch');

const INDEX_NAME = 'room_types'; // Tên index ta đã đồng bộ 1000 phòng
const ES_TIMEOUT_MS = 800;
const ES_CIRCUIT_COOLDOWN_MS = 60000;
let esOfflineUntil = 0;

async function searchRooms(keyword, filters = {}) {
  if (Date.now() < esOfflineUntil) {
    throw new Error('Elasticsearch offline circuit breaker open');
  }
  const esQuery = {
    bool: {
      must: [],
      filter: []
    }
  };

  // 1. Tìm kiếm Full-Text theo từ khóa
  if (keyword && keyword.trim() !== '') {
    esQuery.bool.must.push({
      multi_match: {
        query: keyword,
        fields: ['TypeName^4.0', 'Description^2.0', 'Amenities^1.5'],
        fuzziness: 'AUTO' // Tự động sửa lỗi gõ sai chính tả (vd: "Duluxe" -> "Deluxe")
      }
    });
  } else {
    esQuery.bool.must.push({ match_all: {} });
  }

  // 2. Lọc theo giá tối đa (nếu có truyền vào)
  if (filters.maxPrice) {
    esQuery.bool.filter.push({
      range: { BasePrice: { lte: Number(filters.maxPrice) } }
    });
  }

  // 3. Lọc theo số lượng người lớn (nếu có truyền vào)
  if (filters.adults) {
    esQuery.bool.filter.push({
      range: { AdultCapacity: { gte: Number(filters.adults) } }
    });
  }

  // 4. Gửi truy vấn sang Elasticsearch (fail-fast 800ms + 60s circuit breaker)
  let response;
  try {
    response = await Promise.race([
      client.search({
        index: INDEX_NAME,
        body: {
          query: esQuery,
          size: 20 // Lấy 20 kết quả phù hợp nhất
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Elasticsearch timeout after 800ms')), ES_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    esOfflineUntil = Date.now() + ES_CIRCUIT_COOLDOWN_MS;
    throw err;
  }

  // 5. Trả về danh sách kết quả kèm điểm tương quan BM25 (_score)
  let hits = response.hits.hits || [];

  // Lọc theo ngưỡng tương quan (Score Cutoff): Nếu có truy vấn từ khóa cụ thể,
  // chỉ giữ các kết quả có điểm >= 35% điểm cao nhất để loại bỏ các kết quả chỉ ăn khớp vớt từ phụ.
  if (keyword && keyword.trim() !== '' && hits.length > 0) {
    const maxScore = response.hits.max_score || (hits[0] && hits[0]._score) || 0;
    const scoreThreshold = maxScore * 0.35;
    hits = hits.filter(hit => hit._score >= scoreThreshold);
  }

  return hits.map(hit => ({
    ...hit._source,
    score: hit._score
  }));
}

module.exports = { searchRooms };
