const client = require('../config/elasticsearch');

const INDEX_NAME = 'room_types';

async function createRoomIndex() {
  // 1. Kiểm tra xem index đã tồn tại chưa
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    console.log(`Index "${INDEX_NAME}" đã có sẵn.`);
    return;
  }

  // 2. Tạo index với analyzer hỗ trợ tiếng Việt (bỏ dấu)
  await client.indices.create({
    index: INDEX_NAME,
    body: {
      settings: {
        analysis: {
          analyzer: {
            vn_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'] // Tự động hiểu cả "biển" lẫn "bien"
            }
          }
        }
      },
      mappings: {
        properties: {
          RoomTypeId: { type: 'integer' },
          TypeName: { 
            type: 'text', 
            analyzer: 'vn_analyzer',
            fields: { keyword: { type: 'keyword' } } // Vừa search full-text vừa sort được
          },
          Description: { type: 'text', analyzer: 'vn_analyzer' },
          BasePrice: { type: 'double' },
          AdultCapacity: { type: 'integer' },
          Amenities: { type: 'text', analyzer: 'vn_analyzer' }
        }
      }
    }
  });

  console.log(`Đã tạo index "${INDEX_NAME}" thành công!`);
}

module.exports = { createRoomIndex, INDEX_NAME };