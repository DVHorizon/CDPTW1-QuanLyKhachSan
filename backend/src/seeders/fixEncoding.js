/**
 * Script sửa lại tên phòng bị lỗi encoding trong DB
 * Chỉ sửa những RoomType có TypeName bị lỗi (chứa ký tự ? hoặc ký tự không đọc được)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const pool = require('../config/db');

// Map tên đúng cho từng RoomTypeId bị lỗi encoding
const fixedNames = {
  5: { TypeName: 'Hạng Phòng Tiêu Chuẩn 5', Description: 'Hạng phòng sang trọng đẳng cấp 5 sao với view trực diện biển ngọc bích, ban công tắm nắng riêng biệt.' },
  6: { TypeName: 'Hạng Phòng Tiêu Chuẩn 6', Description: 'Hạng phòng sang trọng đẳng cấp 5 sao với view trực diện biển ngọc bích, ban công tắm nắng riêng biệt.' },
};

async function fixEncoding() {
  try {
    // Lấy danh sách tất cả phòng
    const [rows] = await pool.query('SELECT RoomTypeId, TypeName, Description FROM RoomTypes WHERE IsDeleted = 0 ORDER BY RoomTypeId ASC LIMIT 150');
    
    let fixedCount = 0;
    for (const row of rows) {
      // Kiểm tra nếu TypeName có ký tự bị lỗi (dấu ? thay cho tiếng Việt)
      const hasBrokenChars = /\?/.test(row.TypeName) || /[\uFFFD]/.test(row.TypeName);
      
      if (hasBrokenChars) {
        // Kiểm tra nếu có tên fix cứng
        if (fixedNames[row.RoomTypeId]) {
          await pool.query(
            'UPDATE RoomTypes SET TypeName = ?, Description = ?, UpdatedAt = NOW() WHERE RoomTypeId = ?',
            [fixedNames[row.RoomTypeId].TypeName, fixedNames[row.RoomTypeId].Description, row.RoomTypeId]
          );
          console.log(`✅ Fixed RoomTypeId ${row.RoomTypeId}: "${row.TypeName}" → "${fixedNames[row.RoomTypeId].TypeName}"`);
        } else {
          // Tạo tên generic
          const cleanName = `Hạng Phòng Tiêu Chuẩn ${row.RoomTypeId}`;
          await pool.query(
            'UPDATE RoomTypes SET TypeName = ?, UpdatedAt = NOW() WHERE RoomTypeId = ?',
            [cleanName, row.RoomTypeId]
          );
          console.log(`✅ Auto-fixed RoomTypeId ${row.RoomTypeId}: "${row.TypeName}" → "${cleanName}"`);
        }
        fixedCount++;
      }
    }

    if (fixedCount === 0) {
      console.log('✅ Không có TypeName nào bị lỗi encoding. Dữ liệu đã sạch.');
    } else {
      console.log(`\n🎉 Đã sửa ${fixedCount} bản ghi bị lỗi encoding.`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

fixEncoding();
