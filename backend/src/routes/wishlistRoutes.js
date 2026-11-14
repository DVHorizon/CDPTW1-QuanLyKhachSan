'use strict';

/**
 * routes/wishlistRoutes.js
 * 
 * TÍNH NĂNG 13C: DANH SÁCH PHÒNG YÊU THÍCH (GUEST ROOM WISHLIST & SAVED SUITES)
 * Mã tính năng: FEAT-GUEST-13C  |  Mã truy vết: A13 (Wishlist)
 * Màn hình liên quan: Màn hình 59 (MODULE: WSH-059 / SAVED_WISHLIST_SPEC_059)
 * 
 * Endpoints:
 * - GET    /me/wishlist               -> Xem danh sách phòng yêu thích
 * - POST   /me/wishlist/:roomTypeId   -> Thêm một phòng vào danh sách yêu thích
 * - DELETE /me/wishlist/:roomTypeId   -> Xóa một phòng khỏi danh sách yêu thích
 * - DELETE /me/wishlist               -> Xóa toàn bộ danh sách yêu thích (Empty state)
 * - POST   /me/wishlist/sync          -> Đồng bộ danh sách sau khi đăng nhập
 */

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

// Middleware giải mã token linh hoạt (hỗ trợ cả khách vãng lai và thành viên)
const flexibleAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // Bỏ qua lỗi token hết hạn/sai định dạng, để resolveUserId xử lý tiếp
    }
  }
  next();
};

router.use(flexibleAuth);

// Định tuyến các API Wishlist
router.get('/', wishlistController.getWishlist);
router.post('/', (req, res, next) => {
  req.params.roomTypeId = req.body?.roomTypeId || req.query?.roomTypeId;
  return wishlistController.addToWishlist(req, res, next);
});
router.post('/sync', wishlistController.syncWishlist);
router.post('/:roomTypeId', wishlistController.addToWishlist);
router.delete('/:roomTypeId', wishlistController.removeFromWishlist);
router.delete('/', wishlistController.clearWishlist);

module.exports = router;

