'use strict';

const { searchRooms: searchES } = require('../services/esSearchService');
const solrClient = require('../config/solr');
const { RoomType, Amenity } = require('../models');
const { Op } = require('sequelize');

/**
 * CJKWidthCharFilter: Chuẩn hóa toàn diện Full-width (Zenkaku 全角) <-> Half-width (Hankaku 半角)
 * - Chuyển toàn bộ ký tự ASCII full-width (U+FF01 đến U+FF5E: Ａ-Ｚ, ａ-ｚ, ０-９) về half-width chuẩn
 * - Chuyển khoảng trắng full-width (U+3000) về khoảng trắng tiêu chuẩn (U+0020)
 * - Chuẩn hóa Unicode NFKC
 * Ví dụ: 'Ｄｅｌｕｘｅ' -> 'Deluxe', 'Ｎｅｙｍａｒ' -> 'Neymar', '１０１' -> '101'
 */
function normalizeFullHalfWidth(str) {
  if (!str || typeof str !== 'string') return '';
  let normalized = str.normalize('NFKC');
  normalized = normalized.replace(/\u3000/g, ' ');
  normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });
  return normalized;
}

function containsFullWidth(str) {
  if (!str || typeof str !== 'string') return false;
  return /[\uFF01-\uFF5E\u3000]/.test(str);
}

/**
 * Unified Search Controller (Dual-Engine: Elasticsearch & Apache Solr)
 * GET /api/rooms/search?keyword=...&engine=...&maxPrice=...&adults=...
 */
async function unifiedSearchRooms(req, res) {
  const startTime = Date.now();
  const { keyword, engine, maxPrice, adults, capacity } = req.query;

  // 1. Tự động nhận diện và chuẩn hóa Full-width (全角) -> Half-width (半角)
  const isFullWidthInput = containsFullWidth(keyword);
  const cleanKeyword = normalizeFullHalfWidth(keyword);

  // 2. Xác định engine được chọn (mặc định là 'elasticsearch' hoặc 'solr')
  const selectedEngine = (engine || 'elasticsearch').toLowerCase().trim();

  try {
    // ------------------------------------------------------------------
    // NHÁNH 0: CHẾ ĐỘ THƯỜNG (MYSQL DATABASE)
    // ------------------------------------------------------------------
    if (selectedEngine === 'standard' || selectedEngine === 'normal' || selectedEngine === 'thuong' || selectedEngine === 'database' || selectedEngine === 'db') {
      const whereClause = {
        IsDeleted: false
      };

      if (cleanKeyword) {
        whereClause[Op.or] = [
          { TypeName: { [Op.like]: `%${cleanKeyword}%` } },
          { Description: { [Op.like]: `%${cleanKeyword}%` } }
        ];
      }

      if (maxPrice) {
        whereClause.BasePrice = { [Op.lte]: Number(maxPrice) };
      }

      const cap = capacity || adults;
      if (cap) {
        whereClause.AdultCapacity = { [Op.gte]: Number(cap) };
      }

      const roomTypes = await RoomType.findAll({
        where: whereClause,
        include: [
          {
            model: Amenity,
            as: 'amenityList',
            through: { attributes: [] },
            required: false
          }
        ],
        limit: 20
      });

      const executionTimeMs = Date.now() - startTime;
      const formattedData = roomTypes.map(r => ({
        RoomTypeId: r.RoomTypeId,
        TypeName: r.TypeName,
        Description: r.Description,
        BasePrice: r.BasePrice,
        AdultCapacity: r.AdultCapacity,
        Amenities: Array.isArray(r.amenityList) ? r.amenityList.map(a => a.Name || a.AmenityName).join(', ') : ''
      }));

      return res.status(200).json({
        success: true,
        engine: 'MySQL Database (Chế độ thường)',
        activeEngine: 'standard',
        originalKeyword: keyword || '',
        normalizedKeyword: cleanKeyword,
        isFullWidthInput,
        executionTimeMs,
        total: formattedData.length,
        data: formattedData
      });
    }

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

      const solrRes = await solrClient.search(cleanKeyword, {
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
        originalKeyword: keyword || '',
        normalizedKeyword: cleanKeyword,
        isFullWidthInput,
        executionTimeMs,
        total: solrRes.response ? solrRes.response.numFound : 0,
        data: formattedData
      });
    }

    // ------------------------------------------------------------------
    // B. NHÁNH 2: ELASTICSEARCH (MẶC ĐỊNH)
    // ------------------------------------------------------------------
    const esResults = await searchES(cleanKeyword, { maxPrice, adults: adults || capacity });
    const executionTimeMs = Date.now() - startTime;

    const isDual = selectedEngine === 'dual' || selectedEngine === 'auto';
    return res.status(200).json({
      success: true,
      engine: isDual ? 'Dual Engine (Elasticsearch 9.5 & Solr 10.1)' : 'Elasticsearch 9.5.6',
      activeEngine: isDual ? 'dual' : 'elasticsearch',
      originalKeyword: keyword || '',
      normalizedKeyword: cleanKeyword,
      isFullWidthInput,
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
      console.warn('[DualSearch] Cả hai search engine đều không kết nối được, tự động chuyển về MySQL Database:', fallbackErr.message);
      try {
        const whereClause = { IsDeleted: false };
        if (cleanKeyword) {
          whereClause[Op.or] = [
            { TypeName: { [Op.like]: `%${cleanKeyword}%` } },
            { Description: { [Op.like]: `%${cleanKeyword}%` } }
          ];
        }
        if (maxPrice) {
          whereClause.BasePrice = { [Op.lte]: Number(maxPrice) };
        }
        if (adults) {
          whereClause.AdultCapacity = { [Op.gte]: Number(adults) };
        }

        const dbRooms = await RoomType.findAll({
          where: whereClause,
          limit: 30,
          order: [['RoomTypeId', 'ASC']]
        });

        const formatted = dbRooms.map(r => ({
          RoomTypeId: r.RoomTypeId,
          TypeName: r.TypeName,
          Description: r.Description,
          BasePrice: Number(r.BasePrice),
          AdultCapacity: r.AdultCapacity,
          ImageUrl: r.ImageUrl
        }));

        return res.status(200).json({
          success: true,
          engine: 'MySQL Database (Auto-Failover)',
          activeEngine: 'standard',
          fallbackNotice: 'Hệ thống tự động chuyển về cơ sở dữ liệu MySQL do Search Engine ngoại vi đang tạm dừng',
          executionTimeMs: Date.now() - startTime,
          total: formatted.length,
          data: formatted
        });
      } catch (dbErr) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi tìm kiếm dữ liệu',
          error: dbErr.message
        });
      }
    }
  }
}

module.exports = { unifiedSearchRooms };
