'use strict';

require('dotenv').config();
const esClient = require('../config/elasticsearch');
const solrClient = require('../config/solr');
const { RoomType, Amenity } = require('../models');
const { createRoomIndex, INDEX_NAME: ES_INDEX } = require('../services/esIndexManager');

/**
 * Script đồng bộ kép: MySQL -> Cả Elasticsearch & Apache Solr
 */
async function syncBothEngines() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ SONG SONG (DUAL-SYNC PIPELINE)');
  console.log('========================================================');

  try {
    // 1. Chuẩn bị Elasticsearch Index
    await createRoomIndex().catch(err => console.warn('Lưu ý ES Index:', err.message));

    // 2. Lấy dữ liệu 1000 phòng từ MySQL
    const roomTypes = await RoomType.findAll({
      where: { IsDeleted: false },
      include: [
        {
          model: Amenity,
          as: 'amenityList',
          through: { attributes: [] },
          required: false
        }
      ]
    });

    console.log(`📦 Tìm thấy ${roomTypes.length} loại phòng trong MySQL.`);

    if (roomTypes.length === 0) {
      console.log('Không có dữ liệu để đồng bộ.');
      return;
    }

    // 3. Chuẩn bị định dạng cho Elasticsearch
    const esOperations = roomTypes.flatMap(room => {
      const amenitiesText = Array.isArray(room.amenityList)
        ? room.amenityList.map(a => a.Name || a.AmenityName).join(', ')
        : '';

      return [
        { index: { _index: ES_INDEX, _id: String(room.RoomTypeId) } },
        {
          RoomTypeId: room.RoomTypeId,
          TypeName: room.TypeName,
          Description: room.Description || '',
          BasePrice: Number(room.BasePrice) || 0,
          AdultCapacity: room.AdultCapacity || 2,
          Amenities: amenitiesText
        }
      ];
    });

    // 4. Chuẩn bị định dạng cho Apache Solr
    const solrDocs = roomTypes.map(room => {
      const amenitiesText = Array.isArray(room.amenityList)
        ? room.amenityList.map(a => a.Name || a.AmenityName).join(', ')
        : '';

      return {
        id: String(room.RoomTypeId),
        name: room.TypeName,
        description: room.Description || '',
        price: Number(room.BasePrice) || 0,
        capacity: room.AdultCapacity || 2,
        amenities: amenitiesText
      };
    });

    // 5. Bắn song song sang cả 2 Search Engines
    console.log('⏳ Đang đồng bộ đồng thời sang Elasticsearch và Apache Solr...');
    const startTime = Date.now();

    const [esRes, solrRes] = await Promise.allSettled([
      esClient.bulk({ refresh: true, operations: esOperations }),
      solrClient.update(solrDocs)
    ]);

    const duration = Date.now() - startTime;

    console.log(`⏱️ Thời gian thực thi kép: ${duration} ms`);

    // Kiểm tra kết quả Elasticsearch
    if (esRes.status === 'fulfilled') {
      console.log(`✅ [Elasticsearch] Đã đồng bộ thành công ${roomTypes.length} phòng vào index "${ES_INDEX}".`);
    } else {
      console.error('❌ [Elasticsearch] Lỗi đồng bộ:', esRes.reason?.message || esRes.reason);
    }

    // Kiểm tra kết quả Apache Solr
    if (solrRes.status === 'fulfilled') {
      console.log(`✅ [Apache Solr] Đã đồng bộ thành công ${roomTypes.length} phòng vào collection "${solrClient.collection}".`);
    } else {
      console.error('❌ [Apache Solr] Lỗi đồng bộ:', solrRes.reason?.message || solrRes.reason);
    }

    console.log('========================================================');
    console.log('🎉 HOÀN TẤT ĐỒNG BỘ DUAL-SEARCH ENGINE!');
    console.log('========================================================');

  } catch (error) {
    console.error('❌ Lỗi tiến trình Dual-Sync:', error.message || error);
  } finally {
    process.exit(0);
  }
}

syncBothEngines();
