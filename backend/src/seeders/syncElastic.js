require('dotenv').config();
const client = require('../config/elasticsearch');
const { RoomType, Amenity } = require('../models');
const { createRoomIndex, INDEX_NAME } = require('../services/esIndexManager');

async function syncData() {
  // 1. Đảm bảo Index đã tồn tại
  await createRoomIndex();

  // 2. Lấy dữ liệu từ MySQL thông qua Sequelize
  const rooms = await RoomType.findAll({
    where: { IsDeleted: false },
    include: [{ model: Amenity, as: 'amenityList', through: { attributes: [] } }]
  });

  // 3. Chuẩn bị định dạng Bulk Insert của Elasticsearch
  const operations = rooms.flatMap(room => [
    { index: { _index: INDEX_NAME, _id: String(room.RoomTypeId) } },
    {
      RoomTypeId: room.RoomTypeId,
      TypeName: room.TypeName,
      Description: room.Description || '',
      BasePrice: Number(room.BasePrice),
      AdultCapacity: room.AdultCapacity,
      Amenities: room.amenityList ? room.amenityList.map(a => a.Name).join(', ') : ''
    }
  ]);

  // 4. Gửi hàng loạt (Bulk) sang Elasticsearch
  if (operations.length > 0) {
    await client.bulk({ refresh: true, operations });
    console.log(`Đã đồng bộ ${rooms.length} phòng vào Elasticsearch!`);
  }
}

syncData();