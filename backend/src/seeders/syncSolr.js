'use strict';

require('dotenv').config();
const solrClient = require('../config/solr');
const { RoomType, Amenity } = require('../models');

async function syncSolr() {
  console.log('--- Bắt đầu đồng bộ 1000 phòng vào Apache Solr ---');
  try {
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

    console.log(`Tìm thấy ${roomTypes.length} loại phòng trong MySQL.`);

    if (roomTypes.length === 0) {
      console.log('Không có dữ liệu phòng để đồng bộ.');
      return;
    }

    const docs = roomTypes.map(room => {
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

    const result = await solrClient.update(docs);
    console.log(`🎉 Đã đồng bộ thành công ${docs.length} phòng vào Solr collection "${solrClient.collection}"!`, result);
  } catch (error) {
    console.error('❌ Lỗi đồng bộ Solr:', error.message || error);
  } finally {
    process.exit(0);
  }
}

syncSolr();
