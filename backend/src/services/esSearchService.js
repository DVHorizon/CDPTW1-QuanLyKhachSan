"use strict";

const client = require("../config/elasticsearch");

const INDEX_NAME = 'room_types'; // Tên index đồng bộ loại phòng
const ES_TIMEOUT_MS = 2500;
const ES_CIRCUIT_COOLDOWN_MS = 5000;
let esOfflineUntil = 0;

async function searchRooms(keyword, filters = {}) {
  if (Date.now() < esOfflineUntil) {
    throw new Error("Elasticsearch offline circuit breaker open");
  }
  const esQuery = {
    bool: {
      must: [],
      filter: [],
    },
  };

  // 1. Tìm kiếm Full-Text theo từ khóa (ưu tiên khớp cụm -> đủ từ -> khớp mờ đủ từ)
  const cleanKw = keyword ? keyword.trim() : '';
  if (cleanKw !== '') {
    esQuery.bool.must.push({
      bool: {
        minimum_should_match: 1,
        should: [
          {
            multi_match: {
              query: cleanKw,
              type: 'phrase',
              fields: ['TypeName^6.0', 'Description^3.0', 'Amenities^2.0'],
              boost: 10.0
            }
          },
          {
            multi_match: {
              query: cleanKw,
              fields: ['TypeName^4.0', 'Description^2.0', 'Amenities^1.5'],
              operator: 'and',
              boost: 5.0
            }
          },
          {
            multi_match: {
              query: cleanKw,
              fields: ['TypeName^4.0', 'Description^2.0', 'Amenities^1.5'],
              operator: 'and',
              fuzziness: 'AUTO',
              prefix_length: 1,
              boost: 1.0
            }
          }
        ]
      }
    });
  } else {
    esQuery.bool.must.push({ match_all: {} });
  }

  // 2. Lọc theo danh sách RoomTypeId thuộc chi nhánh (nếu có)
  if (Array.isArray(filters.allowedIds) && filters.allowedIds.length > 0) {
    esQuery.bool.filter.push({
      terms: { RoomTypeId: filters.allowedIds.map(Number) }
    });
  }

  // 3. Lọc theo giá tối đa (nếu có truyền vào)
  if (filters.maxPrice) {
    esQuery.bool.filter.push({
      range: { BasePrice: { lte: Number(filters.maxPrice) } },
    });
  }

  // 4. Lọc theo số lượng người lớn (nếu có truyền vào)
  if (filters.adults) {
    esQuery.bool.filter.push({
      range: { AdultCapacity: { gte: Number(filters.adults) } },
    });
  }

  // 5. Gửi truy vấn sang Elasticsearch (fail-fast + circuit breaker)
  let response;
  try {
    response = await Promise.race([
      client.search({
        index: INDEX_NAME,
        body: {
          query: esQuery,
          size: 30
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Elasticsearch timeout after ${ES_TIMEOUT_MS}ms`)), ES_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    esOfflineUntil = Date.now() + ES_CIRCUIT_COOLDOWN_MS;
    throw err;
  }

  // 6. Trả về danh sách kết quả kèm điểm tương quan BM25 (_score)
  let hits = response.hits.hits || [];

  // Lọc theo ngưỡng tương quan (Score Cutoff): Nếu có truy vấn từ khóa cụ thể,
  // chỉ giữ các kết quả có điểm >= 35% điểm cao nhất để loại bỏ các kết quả chỉ ăn khớp vớt từ phụ.
  if (cleanKw !== '' && hits.length > 0) {
    const maxScore = response.hits.max_score || (hits[0] && hits[0]._score) || 0;
    const scoreThreshold = maxScore * 0.35;
    hits = hits.filter((hit) => hit._score >= scoreThreshold);
  }

  return hits.map((hit) => ({
    ...hit._source,
    score: hit._score,
  }));
}

module.exports = { searchRooms };
