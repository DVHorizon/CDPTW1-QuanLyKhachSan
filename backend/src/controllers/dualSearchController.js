'use strict';

const { searchRooms: searchES } = require('../services/esSearchService');
const solrClient = require('../config/solr');

/**
 * Unified Search Controller (Dual-Engine: Elasticsearch & Apache Solr)
 * GET /api/rooms/search?keyword=...&engine=...&maxPrice=...&adults=...
 */
async function unifiedSearchRooms(req, res) {
  const startTime = Date.now();
  const { keyword, engine, maxPrice, adults, capacity } = req.query;

  // 1. Xác định engine được chọn (mặc định là 'elasticsearch' hoặc 'solr')
  const selectedEngine = (engine || 'elasticsearch').toLowerCase().trim();

  try {
    // ------------------------------------------------------------------
    // A. NHÁNH 1: APACHE SOLR
    // ------------------------------------------------------------------
    if (selectedEngine === 'solr' || selectedEngine === 'apache-solr') {
      let filterQuery = null;
      const filters = [];

      if (maxPrice) {
        filters.push(`price:[* TO ${Number(maxPrice)}]`);
      }
      const cap = capacity || adults;
      if (cap) {
        filters.push(`capacity:[${Number(cap)} TO *]`);
      }
      if (filters.length > 0) {
        filterQuery = filters.join(' AND ');
      }

      const solrRes = await solrClient.search(keyword, {
        rows: 20,
        filterQuery
      });

      const docs = (solrRes.response && solrRes.response.docs) || [];
      const executionTimeMs = Date.now() - startTime;

      const formattedData = docs.map(doc => ({
        RoomTypeId: Number(doc.id) || doc.id,
        TypeName: Array.isArray(doc.name) ? doc.name[0] : doc.name,
        Description: Array.isArray(doc.description) ? doc.description[0] : doc.description,
        BasePrice: Array.isArray(doc.price) ? doc.price[0] : doc.price,
        AdultCapacity: Array.isArray(doc.capacity) ? doc.capacity[0] : doc.capacity,
        Amenities: Array.isArray(doc.amenities) ? doc.amenities[0] : doc.amenities,
        score: doc.score || null
      }));

      return res.status(200).json({
        success: true,
        engine: 'Apache Solr 10.1.0',
        activeEngine: 'solr',
        executionTimeMs,
        total: solrRes.response ? solrRes.response.numFound : 0,
        data: formattedData
      });
    }

    // ------------------------------------------------------------------
    // B. NHÁNH 2: ELASTICSEARCH (MẶC ĐỊNH)
    // ------------------------------------------------------------------
    const esResults = await searchES(keyword, { maxPrice, adults: adults || capacity });
    const executionTimeMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      engine: 'Elasticsearch 9.5.6',
      activeEngine: 'elasticsearch',
      executionTimeMs,
      total: esResults.length,
      data: esResults
    });

  } catch (error) {
    // ------------------------------------------------------------------
    // C. CƠ CHẾ FAILOVER TỰ ĐỘNG (FALLBACK)
    // Nếu 1 bên chết (vd: ES chưa bật), tự động chuyển sang bên còn lại
    // ------------------------------------------------------------------
    console.warn(`[DualSearch] Engine "${selectedEngine}" gặp lỗi (${error.message}). Đang kích hoạt Failover...`);

    try {
      if (selectedEngine === 'elasticsearch') {
        // Fallback sang Solr
        const solrRes = await solrClient.search(keyword, { rows: 20 });
        const docs = (solrRes.response && solrRes.response.docs) || [];
        const executionTimeMs = Date.now() - startTime;

        const formattedData = docs.map(doc => ({
          RoomTypeId: Number(doc.id) || doc.id,
          TypeName: Array.isArray(doc.name) ? doc.name[0] : doc.name,
          Description: Array.isArray(doc.description) ? doc.description[0] : doc.description,
          BasePrice: Array.isArray(doc.price) ? doc.price[0] : doc.price,
          AdultCapacity: Array.isArray(doc.capacity) ? doc.capacity[0] : doc.capacity,
          Amenities: Array.isArray(doc.amenities) ? doc.amenities[0] : doc.amenities
        }));

        return res.status(200).json({
          success: true,
          engine: 'Apache Solr 10.1.0 (Failover fallback)',
          activeEngine: 'solr',
          fallbackNotice: 'Elasticsearch hiện không khả dụng, đã tự động chuyển sang Apache Solr',
          executionTimeMs,
          total: solrRes.response ? solrRes.response.numFound : 0,
          data: formattedData
        });
      } else {
        // Fallback sang Elasticsearch
        const esResults = await searchES(keyword, { maxPrice, adults });
        const executionTimeMs = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          engine: 'Elasticsearch 9.5.6 (Failover fallback)',
          activeEngine: 'elasticsearch',
          fallbackNotice: 'Apache Solr hiện không khả dụng, đã tự động chuyển sang Elasticsearch',
          executionTimeMs,
          total: esResults.length,
          data: esResults
        });
      }
    } catch (fallbackErr) {
      console.error('[DualSearch] Cả hai engines đều gặp lỗi:', fallbackErr);
      return res.status(500).json({
        success: false,
        message: 'Lỗi tìm kiếm Dual Engine',
        error: error.message
      });
    }
  }
}

module.exports = { unifiedSearchRooms };
