'use strict';

/**
 * modules/pms/routes/roomTypeRoutes.js
 * 👤 OWNER: Thực
 * Endpoint: /api/v1/pms/room-types
 *
 * Bridge tới /api/loai-phong nhưng theo pattern modular /api/v1/pms/*
 * Dùng Sequelize RoomType model (bảng RoomTypes)
 */

const express = require('express');
const router = express.Router();
const { RoomType, Room } = require('../../../models');
const { Op } = require('sequelize');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const { success, error, paginated } = require('../../../shared/utils/response');
const { parsePage } = require('../../../shared/utils/pagination');
// const verifyToken = require('../../../middlewares/authMiddleware');
// const { requireRole } = require('../../../shared/middlewares/rbacMiddleware');

// GET /api/v1/pms/room-types
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePage(req);
  const { status, q } = req.query;
  const where = { IsDeleted: false };
  if (status) where.Status = status === 'active' ? 'Active' : 'Inactive';
  if (q) where[Op.or] = [
    { TypeName:    { [Op.like]: `%${q}%` } },
    { Description: { [Op.like]: `%${q}%` } },
  ];

  const { count, rows } = await RoomType.findAndCountAll({ where, limit, offset, order: [['RoomTypeId', 'ASC']] });
  return paginated(res, rows, { page, limit, total: count }, 'Lấy danh sách hạng phòng thành công');
}));

// GET /api/v1/pms/room-types/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const rt = await RoomType.findOne({ where: { RoomTypeId: req.params.id, IsDeleted: false } });
  if (!rt) return error(res, 404, 'Không tìm thấy loại phòng');
  return success(res, rt, 'Lấy chi tiết hạng phòng thành công');
}));

// POST /api/v1/pms/room-types
// router.post('/', verifyToken, requireRole('Admin'), asyncHandler(async (req, res) => { ... }));

// PUT /api/v1/pms/room-types/:id
// PATCH /api/v1/pms/room-types/:id/status
// DELETE /api/v1/pms/room-types/:id

module.exports = router;
