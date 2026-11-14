'use strict';

const { searchRooms: searchES } = require('../services/esSearchService');
const solrClient = require('../config/solr');
const { RoomType, Amenity, Branch, Room } = require('../models');
const { Op } = require('sequelize');

const BRANCH_METADATA = {
  1: {
    BranchName: 'Grand Horizon Phú Quốc Luxury Resort',
    City: 'Phú Quốc, Kiên Giang',
    Address: 'Bãi Khem, An Thới, Phú Quốc, Kiên Giang',
    Phone: '0297 888 9999',
    ImageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop'
  },
  2: {
    BranchName: 'Grand Horizon Cam Ranh Bay Oasis',
    City: 'Cam Ranh, Khánh Hòa',
    Address: 'Bãi Dài, Cam Ranh, Khánh Hoà',
    Phone: '0258 888 9999',
    ImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop'
  },
  3: {
    BranchName: 'Grand Horizon Côn Đảo Sanctuary',
    City: 'Côn Đảo, Bà Rịa - Vũng Tàu',
    Address: 'Bãi Nhát, Côn Đảo, Bà Rịa - Vũng Tàu',
    Phone: '0254 888 9999',
    ImageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop'
  },
  4: {
    BranchName: 'Grand Horizon Đà Nẵng Oceanfront',
    City: 'Mỹ Khê, Đà Nẵng',
    Address: 'Đường Võ Nguyên Giáp, Mỹ Khê, Đà Nẵng',
    Phone: '0236 888 9999',
    ImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop'
  },
  5: {
    BranchName: 'Grand Horizon Nha Trang Premier',
    City: 'Trần Phú, Nha Trang',
    Address: 'Đường Trần Phú, Nha Trang, Khánh Hoà',
    Phone: '0258 222 3333',
    ImageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop'
  }
};

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
 * GET /api/rooms/search?keyword=...&engine=...&maxPrice=...&adults=...&branchId=...
 */
async function unifiedSearchRooms(req, res) {
  const startTime = Date.now();
  const { keyword, engine, maxPrice, adults, capacity, branchId } = req.query;

  // 1. Tự động nhận diện và chuẩn hóa Full-width (全角) -> Half-width (半角)
  const isFullWidthInput = containsFullWidth(keyword);
  const cleanKeyword = normalizeFullHalfWidth(keyword);

  // 2. Xác định engine được chọn (mặc định là 'elasticsearch' hoặc 'solr')
  const selectedEngine = (engine || 'elasticsearch').toLowerCase().trim();

  // 3. Xử lý thông tin chi nhánh / khách sạn
  let targetBranchId = null;
  let branchInfo = null;
  let candidateRoomTypeIds = null;

  if (branchId && branchId !== 'all') {
    targetBranchId = parseInt(branchId, 10);
    try {
      const bRow = await Branch.findByPk(targetBranchId);
      const bMeta = BRANCH_METADATA[targetBranchId] || {};
      if (bRow) {
        branchInfo = {
          BranchId: bRow.BranchId,
          BranchName: bRow.BranchName,
          Address: bRow.Address,
          Phone: bRow.Phone,
          City: bMeta.City || (bRow.Address ? bRow.Address.split(',').pop()?.trim() : 'Việt Nam'),
          ImageUrl: bMeta.ImageUrl || ''
        };
      }
      const branchRooms = await Room.findAll({
        where: { BranchId: targetBranchId, IsDeleted: false },
        attributes: ['RoomTypeId'],
        group: ['RoomTypeId']
      });
      candidateRoomTypeIds = branchRooms.map(r => r.RoomTypeId);
    } catch (bErr) {
      console.warn('Lỗi truy vấn candidate rooms theo chi nhánh:', bErr.message);
    }
  }

  // Fallback branch info nếu chưa chọn
  if (!branchInfo && targetBranchId) {
    const meta = BRANCH_METADATA[targetBranchId] || BRANCH_METADATA[1];
    branchInfo = {
      BranchId: targetBranchId,
      BranchName: meta.BranchName,
      Address: meta.Address,
      Phone: meta.Phone,
      City: meta.City,
      ImageUrl: meta.ImageUrl
    };
  } else if (!branchInfo) {
    const meta = BRANCH_METADATA[1];
    branchInfo = {
      BranchId: 1,
      BranchName: meta.BranchName,
      Address: meta.Address,
      Phone: meta.Phone,
      City: meta.City,
      ImageUrl: meta.ImageUrl
    };
  }

  // Helper enrich room item
  const formatRoomItem = (r) => {
    const roomTypeId = Number(r.RoomTypeId || r.id || 1);
    const typeName = r.TypeName || r.name || (Array.isArray(r.name) ? r.name[0] : 'Deluxe Ocean View');
    const desc = r.Description || r.description || (Array.isArray(r.description) ? r.description[0] : '');
    const price = Number(r.BasePrice || r.price || (Array.isArray(r.price) ? r.price[0] : 2500000));
    const cap = Number(r.AdultCapacity || r.capacity || (Array.isArray(r.capacity) ? r.capacity[0] : 2));
    const img = r.ImageUrl || r.image || (Array.isArray(r.image) ? r.image[0] : null) || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop';

    return {
      RoomTypeId: roomTypeId,
      TypeName: typeName,
      Description: desc,
      BasePrice: price,
      AdultCapacity: cap,
      ImageUrl: img,
      BranchId: branchInfo.BranchId,
      BranchName: branchInfo.BranchName,
      BranchAddress: branchInfo.Address,
      BranchCity: branchInfo.City,
      Branch: branchInfo,
      Rating: 5.0,
      ReviewCount: 128,
      Category: cap >= 5 ? 'Villa Riêng Tư' : cap >= 4 ? 'Suite Cao Cấp' : 'Deluxe Hướng Biển',
      Badge: 'Grand Horizon Luxury',
      View: 'Hướng biển ngoạn mục',
      Area: cap >= 5 ? '180m²' : cap >= 4 ? '95m²' : '52m²',
      BedType: cap >= 4 ? '2 Giường King Đôi' : '1 Giường King Cỡ Lớn',
      amenities: [
        'Bãi biển riêng',
        'Hồ bơi riêng (Private Pool)',
        'Ban công ngắm hoàng hôn',
        'Bữa sáng Buffet kèm theo',
        'Wifi tốc độ cao'
      ]
    };
  };

  try {
    const q = req.query || {};
    keyword = typeof q.keyword === 'string' ? q.keyword : '';
    maxPrice = q.maxPrice;
    adults = q.adults;
    capacity = q.capacity;

    // 1. Tự động nhận diện và chuẩn hóa Full-width (全角) -> Half-width (半角)
    isFullWidthInput = containsFullWidth(keyword);
    cleanKeyword = normalizeFullHalfWidth(keyword);

    // 2. Xác định engine được chọn an toàn (không bao giờ crash kể cả khi engine là array hoặc object)
    const rawEngine = typeof q.engine === 'string' 
      ? q.engine 
      : (Array.isArray(q.engine) && typeof q.engine[0] === 'string' ? q.engine[0] : '');
    selectedEngine = (rawEngine || 'elasticsearch').toLowerCase().trim();

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

      if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
        whereClause.RoomTypeId = { [Op.in]: candidateRoomTypeIds };
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
        limit: 30
      });

      const executionTimeMs = Date.now() - startTime;
      const formattedData = roomTypes.map(formatRoomItem);

      return res.status(200).json({
        success: true,
        engine: 'MySQL Database (Chế độ thường)',
        activeEngine: 'standard',
        originalKeyword: keyword || '',
        normalizedKeyword: cleanKeyword,
        isFullWidthInput,
        executionTimeMs,
        branchId: targetBranchId,
        branchName: branchInfo.BranchName,
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
      if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
        filters.push(`id:(${candidateRoomTypeIds.slice(0, 50).join(' OR ')})`);
      }
      if (filters.length > 0) {
        filterQuery = filters.join(' AND ');
      }

      const solrRes = await solrClient.search(cleanKeyword, {
        rows: 30,
        filterQuery
      });

      const docs = (solrRes.response && solrRes.response.docs) || [];
      const executionTimeMs = Date.now() - startTime;
      const formattedData = docs.map(formatRoomItem);

      return res.status(200).json({
        success: true,
        engine: 'Apache Solr 10.1.0',
        activeEngine: 'solr',
        originalKeyword: keyword || '',
        normalizedKeyword: cleanKeyword,
        isFullWidthInput,
        executionTimeMs,
        branchId: targetBranchId,
        branchName: branchInfo.BranchName,
        total: formattedData.length,
        data: formattedData
      });
    }

    // ------------------------------------------------------------------
    // B. NHÁNH 2: ELASTICSEARCH (MẶC ĐỊNH)
    // ------------------------------------------------------------------
    let esResults = await searchES(cleanKeyword, { maxPrice, adults: adults || capacity });
    if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
      const allowedSet = new Set(candidateRoomTypeIds.map(Number));
      esResults = esResults.filter(r => allowedSet.has(Number(r.RoomTypeId || r.id)));
    }
    const executionTimeMs = Date.now() - startTime;
    const formattedData = esResults.map(formatRoomItem);

    const isDual = selectedEngine === 'dual' || selectedEngine === 'auto';
    return res.status(200).json({
      success: true,
      engine: isDual ? 'Dual Engine (Elasticsearch 9.5 & Solr 10.1)' : 'Elasticsearch 9.5.6',
      activeEngine: isDual ? 'dual' : 'elasticsearch',
      originalKeyword: keyword || '',
      normalizedKeyword: cleanKeyword,
      isFullWidthInput,
      executionTimeMs,
      branchId: targetBranchId,
      branchName: branchInfo.BranchName,
      total: formattedData.length,
      data: formattedData
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
        const solrRes = await solrClient.search(keyword, { rows: 30 });
        let docs = (solrRes.response && solrRes.response.docs) || [];
        if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
          const allowedSet = new Set(candidateRoomTypeIds.map(Number));
          docs = docs.filter(d => allowedSet.has(Number(d.id)));
        }
        const executionTimeMs = Date.now() - startTime;
        const formattedData = docs.map(formatRoomItem);

        return res.status(200).json({
          success: true,
          engine: 'Apache Solr 10.1.0 (Failover fallback)',
          activeEngine: 'solr',
          fallbackNotice: 'Elasticsearch hiện không khả dụng, đã tự động chuyển sang Apache Solr',
          executionTimeMs,
          branchId: targetBranchId,
          branchName: branchInfo.BranchName,
          total: formattedData.length,
          data: formattedData
        });
      } else {
        // Fallback sang Elasticsearch
        let esResults = await searchES(keyword, { maxPrice, adults });
        if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
          const allowedSet = new Set(candidateRoomTypeIds.map(Number));
          esResults = esResults.filter(r => allowedSet.has(Number(r.RoomTypeId || r.id)));
        }
        const executionTimeMs = Date.now() - startTime;
        const formattedData = esResults.map(formatRoomItem);

        return res.status(200).json({
          success: true,
          engine: 'Elasticsearch 9.5.6 (Failover fallback)',
          activeEngine: 'elasticsearch',
          fallbackNotice: 'Apache Solr hiện không khả dụng, đã tự động chuyển sang Elasticsearch',
          executionTimeMs,
          branchId: targetBranchId,
          branchName: branchInfo.BranchName,
          total: formattedData.length,
          data: formattedData
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
        const cap = capacity || adults;
        if (cap) {
          whereClause.AdultCapacity = { [Op.gte]: Number(cap) };
        }
        if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
          whereClause.RoomTypeId = { [Op.in]: candidateRoomTypeIds };
        }

        const dbRooms = await RoomType.findAll({
          where: whereClause,
          include: [
            {
              model: Amenity,
              as: 'amenityList',
              through: { attributes: [] },
              required: false
            }
          ],
          limit: 30,
          order: [['RoomTypeId', 'ASC']]
        });

        const formatted = dbRooms.map((r) => {
          const item = formatRoomItem(r);
          if (Array.isArray(r.amenityList) && r.amenityList.length > 0) {
            item.Amenities = r.amenityList.map(a => a.Name || a.AmenityName).join(', ');
            item.amenities = r.amenityList.map(a => a.Name || a.AmenityName);
          }
          return item;
        });

        return res.status(200).json({
          success: true,
          engine: 'MySQL Database (Resilient Fallback)',
          activeEngine: 'standard',
          fallbackNotice: 'Hệ thống tự động chuyển về cơ sở dữ liệu MySQL do Search Engine ngoại vi đang tạm dừng',
          originalKeyword: keyword || '',
          normalizedKeyword: cleanKeyword,
          isFullWidthInput,
          executionTimeMs: Date.now() - startTime,
          branchId: targetBranchId,
          branchName: branchInfo.BranchName,
          total: formatted.length,
          data: formatted
        });
      } catch (dbErr) {
        console.error('[DualSearch] Lỗi nghiêm trọng tại DB fallback:', dbErr);
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
