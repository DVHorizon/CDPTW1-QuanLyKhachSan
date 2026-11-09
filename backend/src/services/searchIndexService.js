'use strict';

const { sequelize, RoomType, Room, RoomSearchIndex } = require('../models');

/**
 * Loại bỏ dấu tiếng Việt để phục vụ chỉ mục B-Tree không dấu
 */
function removeVietnameseTones(str) {
  if (!str || typeof str !== 'string') return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str.trim();
}

/**
 * Đồng bộ toàn bộ dữ liệu từ RoomTypes sang bảng RoomSearchIndex
 * Đánh chỉ mục dạng Cây Nhị Phân (B-Tree) để truy vấn O(log N)
 */
async function syncSearchIndex() {
  try {
    const roomTypes = await RoomType.findAll({
      where: { Status: 'Active', IsDeleted: false }
    });

    // Lấy thông tin chi nhánh của từng loại phòng
    const [branchMappings] = await sequelize.query(`
      SELECT DISTINCT RoomTypeId, BranchId 
      FROM Rooms 
      WHERE IsDeleted = 0
    `);

    const branchMap = {};
    for (const b of branchMappings) {
      if (!branchMap[b.RoomTypeId]) branchMap[b.RoomTypeId] = [];
      branchMap[b.RoomTypeId].push(b.BranchId);
    }

    const rowsToInsert = [];

    for (const rt of roomTypes) {
      const branches = branchMap[rt.RoomTypeId] || [null];
      const typeName = rt.TypeName || '';
      const description = rt.Description || '';
      const category = rt.BedType || rt.TypeName || 'Tiêu chuẩn';

      const unaccentName = removeVietnameseTones(typeName);
      const unaccentDesc = removeVietnameseTones(description);

      // Vector tổng hợp cho Fulltext & Text analysis
      const searchVector = `${typeName} ${description} ${unaccentName} ${unaccentDesc}`;

      // Mỗi loại phòng tạo index liên kết với từng chi nhánh (hoặc null nếu toàn hệ thống)
      for (const branchId of branches) {
        // Keyword chính
        rowsToInsert.push({
          RoomTypeId: rt.RoomTypeId,
          BranchId: branchId,
          Keyword: typeName,
          KeywordUnaccent: unaccentName,
          Category: category,
          BasePrice: rt.BasePrice,
          MaxOccupancy: rt.MaxOccupancy || 2,
          SearchVector: searchVector
        });

        // Bổ sung các từ khóa phụ (tokens) để Binary Tree tra cứu nhanh theo tiền tố / từ đơn
        const tokens = typeName.split(/\s+/).filter(t => t.length >= 2);
        for (const token of tokens) {
          const uToken = removeVietnameseTones(token);
          if (uToken !== unaccentName) {
            rowsToInsert.push({
              RoomTypeId: rt.RoomTypeId,
              BranchId: branchId,
              Keyword: token,
              KeywordUnaccent: uToken,
              Category: category,
              BasePrice: rt.BasePrice,
              MaxOccupancy: rt.MaxOccupancy || 2,
              SearchVector: searchVector
            });
          }
        }
      }
    }

    // Xóa chỉ mục cũ và nạp mới
    await RoomSearchIndex.destroy({ where: {}, truncate: true });
    if (rowsToInsert.length > 0) {
      await RoomSearchIndex.bulkCreate(rowsToInsert);
    }

    console.log(`✅ Đã đồng bộ thành công ${rowsToInsert.length} bản ghi vào Cây Nhị Phân Chỉ Mục (RoomSearchIndex).`);
    return { success: true, count: rowsToInsert.length };
  } catch (error) {
    console.error('❌ Lỗi khi đồng bộ RoomSearchIndex:', error);
    throw error;
  }
}

module.exports = {
  syncSearchIndex,
  removeVietnameseTones
};
