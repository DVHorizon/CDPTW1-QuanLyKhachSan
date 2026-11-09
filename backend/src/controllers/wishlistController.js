'use strict';

/**
 * controllers/wishlistController.js
 * 
 * TÍNH NĂNG 13C: DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)
 * Màn hình liên quan: Màn hình 59 (MODULE: WSH-059 / SAVED_WISHLIST_SPEC_059)
 * 
 * Endpoints:
 * - GET    /me/wishlist               -> Xem danh sách phòng yêu thích (hỗ trợ sắp xếp & guest fallback)
 * - POST   /me/wishlist/:roomTypeId   -> Thêm một phòng vào Wishlist
 * - DELETE /me/wishlist/:roomTypeId   -> Xóa một phòng khỏi Wishlist
 * - DELETE /me/wishlist               -> Xóa toàn bộ Wishlist (Empty state)
 * - POST   /me/wishlist/sync          -> Đồng bộ wishlist từ LocalStorage sau khi khách đăng nhập
 * 
 * Bảng Message & Lỗi chuẩn (Bắt buộc dùng đúng nguyên văn):
 * - SUCCESS_0010_WISHLIST_UPDATED: "Đã cập nhật danh sách phòng yêu thích"
 * - ERROR_0009_UNAUTHENTICATED: "Bạn cần đăng nhập để thực hiện chức năng này"
 * - ERROR_0004_NOT_FOUND: "Không tìm thấy thông tin loại phòng"
 * - ERROR_0001_INVALID_INPUT: "Dữ liệu đầu vào không hợp lệ"
 */

const { Op } = require('sequelize');
const { sequelize, Wishlist, RoomType, Amenity } = require('../models');

const SPEC_CODES = {
  WISHLIST_UPDATED: 'SUCCESS_0010_WISHLIST_UPDATED',
  UNAUTHENTICATED: 'ERROR_0009_UNAUTHENTICATED',
  NOT_FOUND: 'ERROR_0004_NOT_FOUND',
  INVALID_INPUT: 'ERROR_0001_INVALID_INPUT',
  SERVER_ERROR: 'ERROR_0005_INTERNAL_SERVER_ERROR'
};

const SPEC_MESSAGES = {
  WISHLIST_UPDATED: 'Đã cập nhật danh sách phòng yêu thích',
  UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện chức năng này',
  ROOM_NOT_FOUND: 'Không tìm thấy thông tin loại phòng',
  INVALID_INPUT: 'Dữ liệu đầu vào không hợp lệ',
  SERVER_ERROR: 'Lỗi hệ thống khi xử lý danh sách yêu thích'
};

// Đảm bảo bảng Wishlists luôn tồn tại trong DB (Khắc phục lỗi thiếu bảng DB)
let tableChecked = false;
async function ensureWishlistTableExists() {
  if (tableChecked) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Wishlists (
        WishlistId INT AUTO_INCREMENT PRIMARY KEY,
        UserId INT NOT NULL,
        RoomTypeId INT NOT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wishlist_user (UserId),
        INDEX idx_wishlist_roomtype (RoomTypeId),
        CONSTRAINT fk_wishlist_user FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT fk_wishlist_roomtype FOREIGN KEY (RoomTypeId) REFERENCES RoomTypes(RoomTypeId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableChecked = true;
  } catch (err) {
    console.error('Warning ensureWishlistTableExists:', err.message);
  }
}

/**
 * Helper: Trích xuất UserId linh hoạt từ JWT req.user, header x-user-id hoặc query (phục vụ cả API và Test)
 */
function resolveUserId(req) {
  if (req.user && (req.user.userId || req.user.id || req.user.UserId)) {
    return Number(req.user.userId || req.user.id || req.user.UserId);
  }
  if (req.headers && req.headers['x-user-id']) {
    const headerId = Number(req.headers['x-user-id']);
    if (!isNaN(headerId) && headerId > 0) return headerId;
  }
  if (req.query && req.query.userId) {
    const qId = Number(req.query.userId);
    if (!isNaN(qId) && qId > 0) return qId;
  }
  return null;
}

/**
 * Format thông tin RoomType thành card hiển thị dạng lưới 3 cột theo đặc tả Grand Horizon
 */
function formatRoomTypeForCard(rt, wishlistId = null, addedAt = null) {
  let images = [];
  if (rt.ImageUrl) {
    try {
      const parsed = JSON.parse(rt.ImageUrl);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === 'string') images = [parsed];
    } catch {
      images = [rt.ImageUrl];
    }
  }

  const primaryImage = images[0] || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80';

  // Thu thập tiện ích
  const amenities = (rt.amenityList || []).map(a => ({
    amenityId: a.AmenityId,
    name: a.AmenityName,
    icon: a.Icon || 'check_circle'
  }));

  return {
    wishlistId: wishlistId || null,
    roomTypeId: rt.RoomTypeId,
    typeName: rt.TypeName,
    description: rt.Description || '',
    basePrice: Number(rt.BasePrice) || 0,
    maxOccupancy: rt.MaxOccupancy || 2,
    adultCapacity: rt.AdultCapacity || 2,
    childCapacity: rt.ChildCapacity || 1,
    imageUrl: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    amenities: amenities,
    status: rt.Status,
    addedAt: addedAt || rt.CreatedAt,
    isSaved: true
  };
}

/**
 * 1. GET /me/wishlist
 * Lấy danh sách phòng yêu thích
 * Query params:
 *   - sortOption: DATE_ADDED_NEWEST | DATE_ADDED_OLDEST | PRICE_LOW_TO_HIGH | PRICE_HIGH_TO_LOW
 *   - roomTypeIds: "1,2,3" (cho khách vãng lai lưu session LocalStorage)
 */
async function getWishlist(req, res) {
  await ensureWishlistTableExists();
  try {
    const userId = resolveUserId(req);
    const sortOption = (req.query.sortOption || req.query.sort || 'DATE_ADDED_NEWEST').toUpperCase();

    // Trường hợp 1: Khách thành viên đã đăng nhập -> truy vấn DB
    if (userId) {
      // Tự động đồng bộ các phòng từ localStorage/query (nếu có) vào DB cho thành viên
      const rawIds = req.query.roomTypeIds || req.query.ids;
      if (rawIds) {
        const idArray = String(rawIds)
          .split(',')
          .map(id => Number(id.trim()))
          .filter(id => !isNaN(id) && id > 0);
        for (const rId of idArray) {
          const roomExists = await RoomType.count({ where: { RoomTypeId: rId, IsDeleted: false } });
          if (roomExists) {
            await Wishlist.findOrCreate({
              where: { UserId: userId, RoomTypeId: rId },
              defaults: { UserId: userId, RoomTypeId: rId, CreatedAt: new Date() }
            });
          }
        }
      }

      // Xác định thứ tự sắp xếp
      let orderClause = [['CreatedAt', 'DESC'], ['WishlistId', 'DESC']];
      if (sortOption === 'DATE_ADDED_OLDEST') {
        orderClause = [['CreatedAt', 'ASC'], ['WishlistId', 'ASC']];
      } else if (sortOption === 'PRICE_LOW_TO_HIGH') {
        orderClause = [[{ model: RoomType, as: 'roomType' }, 'BasePrice', 'ASC']];
      } else if (sortOption === 'PRICE_HIGH_TO_LOW') {
        orderClause = [[{ model: RoomType, as: 'roomType' }, 'BasePrice', 'DESC']];
      }

      const wishlists = await Wishlist.findAll({
        where: { UserId: userId },
        include: [
          {
            model: RoomType,
            as: 'roomType',
            where: { IsDeleted: false },
            required: true,
            include: [
              {
                model: Amenity,
                as: 'amenityList',
                through: { attributes: [] },
                required: false
              }
            ]
          }
        ],
        order: orderClause
      });

      // Deduplicate theo roomTypeId để mỗi phòng chỉ hiển thị 1 thẻ card duy nhất
      const seenIds = new Set();
      const uniqueItems = [];
      for (const w of wishlists) {
        if (!w.roomType) continue;
        const rId = w.roomType.RoomTypeId;
        if (!seenIds.has(rId)) {
          seenIds.add(rId);
          uniqueItems.push(formatRoomTypeForCard(w.roomType, w.WishlistId, w.CreatedAt));
        }
      }

      return res.status(200).json({
        success: true,
        code: SPEC_CODES.WISHLIST_UPDATED,
        message: SPEC_MESSAGES.WISHLIST_UPDATED,
        data: {
          total: uniqueItems.length,
          sortOption,
          items: uniqueItems,
          roomTypeIds: uniqueItems.map(i => i.roomTypeId)
        }
      });
    }

    // Trường hợp 2: Khách vãng lai (chưa đăng nhập, hỗ trợ lấy thông tin phòng theo roomTypeIds từ LocalStorage)
    const rawIds = req.query.roomTypeIds || req.query.ids;
    if (rawIds) {
      const idArray = String(rawIds)
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => !isNaN(id) && id > 0);

      if (idArray.length > 0) {
        let orderClause = [['BasePrice', 'ASC']];
        if (sortOption === 'PRICE_HIGH_TO_LOW') {
          orderClause = [['BasePrice', 'DESC']];
        }

        const roomTypes = await RoomType.findAll({
          where: {
            RoomTypeId: { [Op.in]: idArray },
            IsDeleted: false
          },
          include: [
            {
              model: Amenity,
              as: 'amenityList',
              through: { attributes: [] },
              required: false
            }
          ],
          order: orderClause
        });

        // Nếu sắp xếp theo thứ tự thêm (giữ nguyên thứ tự trong mảng idArray)
        let sorted = roomTypes;
        if (sortOption === 'DATE_ADDED_NEWEST') {
          // Newest first = đảo ngược mảng idArray
          const reverseIds = [...idArray].reverse();
          sorted = [...roomTypes].sort((a, b) => reverseIds.indexOf(a.RoomTypeId) - reverseIds.indexOf(b.RoomTypeId));
        } else if (sortOption === 'DATE_ADDED_OLDEST') {
          sorted = [...roomTypes].sort((a, b) => idArray.indexOf(a.RoomTypeId) - idArray.indexOf(b.RoomTypeId));
        }

        const items = sorted.map(rt => formatRoomTypeForCard(rt));

        return res.status(200).json({
          success: true,
          code: SPEC_CODES.WISHLIST_UPDATED,
          message: SPEC_MESSAGES.WISHLIST_UPDATED,
          data: {
            total: items.length,
            sortOption,
            items,
            roomTypeIds: items.map(i => i.roomTypeId)
          }
        });
      }
    }

    // Fallback rỗng khi chưa có danh sách
    return res.status(200).json({
      success: true,
      code: SPEC_CODES.WISHLIST_UPDATED,
      message: SPEC_MESSAGES.WISHLIST_UPDATED,
      data: {
        total: 0,
        sortOption,
        items: [],
        roomTypeIds: []
      }
    });
  } catch (err) {
    console.error('Lỗi getWishlist:', err);
    return res.status(500).json({
      success: false,
      code: SPEC_CODES.SERVER_ERROR,
      message: SPEC_MESSAGES.SERVER_ERROR,
      error: err.message
    });
  }
}

/**
 * 2. POST /me/wishlist/:roomTypeId
 * Thêm một phòng vào Wishlist của người dùng
 */
async function addToWishlist(req, res) {
  await ensureWishlistTableExists();
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const roomTypeId = Number(req.params.roomTypeId);
    if (isNaN(roomTypeId) || roomTypeId <= 0) {
      return res.status(400).json({
        success: false,
        code: SPEC_CODES.INVALID_INPUT,
        message: SPEC_MESSAGES.INVALID_INPUT
      });
    }

    // Kiểm tra phòng có tồn tại không
    const roomType = await RoomType.findOne({
      where: { RoomTypeId: roomTypeId, IsDeleted: false }
    });

    if (!roomType) {
      return res.status(404).json({
        success: false,
        code: SPEC_CODES.NOT_FOUND,
        message: SPEC_MESSAGES.ROOM_NOT_FOUND
      });
    }

    // Kiểm tra đã có trong Wishlist chưa (idempotent)
    let [wishlistRecord, created] = await Wishlist.findOrCreate({
      where: {
        UserId: userId,
        RoomTypeId: roomTypeId
      },
      defaults: {
        UserId: userId,
        RoomTypeId: roomTypeId,
        CreatedAt: new Date()
      }
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      code: SPEC_CODES.WISHLIST_UPDATED,
      message: SPEC_MESSAGES.WISHLIST_UPDATED,
      data: {
        wishlistId: wishlistRecord.WishlistId,
        userId: userId,
        roomTypeId: roomTypeId,
        typeName: roomType.TypeName,
        action: 'SAVED',
        isSaved: true
      }
    });
  } catch (err) {
    console.error('Lỗi addToWishlist:', err);
    return res.status(500).json({
      success: false,
      code: SPEC_CODES.SERVER_ERROR,
      message: SPEC_MESSAGES.SERVER_ERROR,
      error: err.message
    });
  }
}

/**
 * 3. DELETE /me/wishlist/:roomTypeId
 * Xóa một phòng khỏi danh sách yêu thích
 */
async function removeFromWishlist(req, res) {
  await ensureWishlistTableExists();
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const roomTypeId = Number(req.params.roomTypeId);
    if (isNaN(roomTypeId) || roomTypeId <= 0) {
      return res.status(400).json({
        success: false,
        code: SPEC_CODES.INVALID_INPUT,
        message: SPEC_MESSAGES.INVALID_INPUT
      });
    }

    const deleted = await Wishlist.destroy({
      where: {
        UserId: userId,
        RoomTypeId: roomTypeId
      }
    });

    return res.status(200).json({
      success: true,
      code: SPEC_CODES.WISHLIST_UPDATED,
      message: SPEC_MESSAGES.WISHLIST_UPDATED,
      data: {
        roomTypeId: roomTypeId,
        removed: deleted > 0,
        action: 'UNSAVED',
        isSaved: false
      }
    });
  } catch (err) {
    console.error('Lỗi removeFromWishlist:', err);
    return res.status(500).json({
      success: false,
      code: SPEC_CODES.SERVER_ERROR,
      message: SPEC_MESSAGES.SERVER_ERROR,
      error: err.message
    });
  }
}

/**
 * 4. DELETE /me/wishlist
 * Xóa toàn bộ danh sách phòng yêu thích (TC02: Clear Wishlist / Empty state)
 */
async function clearWishlist(req, res) {
  await ensureWishlistTableExists();
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const deletedCount = await Wishlist.destroy({
      where: { UserId: userId }
    });

    return res.status(200).json({
      success: true,
      code: SPEC_CODES.WISHLIST_UPDATED,
      message: SPEC_MESSAGES.WISHLIST_UPDATED,
      data: {
        cleared: true,
        removedCount: deletedCount,
        total: 0,
        items: []
      }
    });
  } catch (err) {
    console.error('Lỗi clearWishlist:', err);
    return res.status(500).json({
      success: false,
      code: SPEC_CODES.SERVER_ERROR,
      message: SPEC_MESSAGES.SERVER_ERROR,
      error: err.message
    });
  }
}

/**
 * 5. POST /me/wishlist/sync
 * Đồng bộ danh sách từ LocalStorage lên Database sau khi khách hàng đăng nhập
 */
async function syncWishlist(req, res) {
  await ensureWishlistTableExists();
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: SPEC_CODES.UNAUTHENTICATED,
        message: SPEC_MESSAGES.UNAUTHENTICATED
      });
    }

    const { roomTypeIds } = req.body || {};
    if (Array.isArray(roomTypeIds) && roomTypeIds.length > 0) {
      for (const rawId of roomTypeIds) {
        const rId = Number(rawId);
        if (!isNaN(rId) && rId > 0) {
          const roomExists = await RoomType.count({ where: { RoomTypeId: rId, IsDeleted: false } });
          if (roomExists) {
            await Wishlist.findOrCreate({
              where: { UserId: userId, RoomTypeId: rId },
              defaults: { UserId: userId, RoomTypeId: rId, CreatedAt: new Date() }
            });
          }
        }
      }
    }

    // Lấy lại danh sách sau khi đồng bộ
    const all = await Wishlist.findAll({
      where: { UserId: userId },
      attributes: ['RoomTypeId']
    });

    return res.status(200).json({
      success: true,
      code: SPEC_CODES.WISHLIST_UPDATED,
      message: SPEC_MESSAGES.WISHLIST_UPDATED,
      data: {
        synced: true,
        roomTypeIds: all.map(w => w.RoomTypeId),
        total: all.length
      }
    });
  } catch (err) {
    console.error('Lỗi syncWishlist:', err);
    return res.status(500).json({
      success: false,
      code: SPEC_CODES.SERVER_ERROR,
      message: SPEC_MESSAGES.SERVER_ERROR,
      error: err.message
    });
  }
}

module.exports = {
  SPEC_CODES,
  SPEC_MESSAGES,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  syncWishlist,
  resolveUserId
};

