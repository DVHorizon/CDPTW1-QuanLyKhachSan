'use strict';

const client = require('../config/elasticsearch');

const INDEX_NAME = 'room_types'; // Tên index ta đã đồng bộ 1000 phòng

async function searchRooms(keyword, filters = {}) {
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

  // 4. Gửi truy vấn sang Elasticsearch
  const response = await client.search({
    index: INDEX_NAME,
    body: {
      query: esQuery,
      size: 20 // Lấy 20 kết quả phù hợp nhất
    }
  });

  // 5. Trả về danh sách kết quả kèm điểm tương quan BM25 (_score)
  return response.hits.hits.map(hit => ({
    ...hit._source,
    score: hit._score
  }));
}

module.exports = { searchRooms };