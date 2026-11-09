'use strict';

const solrClient = require('../config/solr');

/**
 * Controller tìm kiếm phòng qua Apache Solr
 * GET /api/rooms/search-solr?keyword=...&maxPrice=...
 */
async function searchRoomsSolr(req, res) {
  try {
    const { keyword, maxPrice, capacity } = req.query;

    let filterQuery = null;
    const filters = [];

    if (maxPrice) {
      filters.push(`price:[* TO ${Number(maxPrice)}]`);
    }
    if (capacity) {
      filters.push(`capacity:[${Number(capacity)} TO *]`);
    }

    if (filters.length > 0) {
      filterQuery = filters.join(' AND ');
    }

    const solrRes = await solrClient.search(keyword, {
      rows: 20,
      filterQuery
    });

    const docs = (solrRes.response && solrRes.response.docs) || [];

    // Chuẩn hóa định dạng trả về giống API của dự án
    const formattedData = docs.map(doc => ({
      RoomTypeId: doc.id,
      TypeName: Array.isArray(doc.name) ? doc.name[0] : doc.name,
      Description: Array.isArray(doc.description) ? doc.description[0] : doc.description,
      BasePrice: Array.isArray(doc.price) ? doc.price[0] : doc.price,
      AdultCapacity: Array.isArray(doc.capacity) ? doc.capacity[0] : doc.capacity,
      Amenities: Array.isArray(doc.amenities) ? doc.amenities[0] : doc.amenities
    }));

    return res.status(200).json({
      success: true,
      engine: 'Apache Solr 10.1.0',
      total: solrRes.response ? solrRes.response.numFound : 0,
      qTimeMs: solrRes.responseHeader ? solrRes.responseHeader.QTime : 0,
      data: formattedData
    });

  } catch (error) {
    console.error('Lỗi tìm kiếm Solr:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm Apache Solr',
      error: error.message
    });
  }
}

module.exports = { searchRoomsSolr };
