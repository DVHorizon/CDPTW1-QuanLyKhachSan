'use strict';

/**
 * modules/pms/routes/roomRoutes.js
 * 👤 OWNER: Thực
 * Endpoint: /api/v1/pms/rooms
 * Dùng Sequelize Room model (bảng Rooms)
 */

const express = require('express');
const router = express.Router();
const { Room, RoomType, Branch } = require('../../../models');
const { Op } = require('sequelize');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const { success, error, paginated } = require('../../../shared/utils/response');
const { parsePage } = require('../../../shared/utils/pagination');

// GET /api/v1/pms/rooms — danh sách phòng vật lý (có filter)
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePage(req);
  const { floor, status, branchId, roomTypeId } = req.query;
  const where = { IsDeleted: false };
  if (floor)      where.Floor      = Number(floor);
  if (status)     where.Status     = status;
  if (branchId)   where.BranchId   = Number(branchId);
  if (roomTypeId) where.RoomTypeId = Number(roomTypeId);

  const { count, rows } = await Room.findAndCountAll({
    where,
    limit,
    offset,
    include: [
      { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeName', 'BasePrice'] },
      { model: Branch,   as: 'branch',   attributes: ['BranchId', 'BranchName'] },
    ],
    order: [['Floor', 'ASC'], ['RoomNumber', 'ASC']],
  });

  return paginated(res, rows, { page, limit, total: count }, 'Lấy danh sách phòng thành công');
}));

// GET /api/v1/pms/rooms/map — sơ đồ phòng (tất cả, không phân trang)
router.get('/map', asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const where = { IsDeleted: false };
  if (branchId) where.BranchId = Number(branchId);

  const rooms = await Room.findAll({
    where,
    include: [
      { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeName', 'BasePrice'] },
    ],
    order: [['Floor', 'ASC'], ['RoomNumber', 'ASC']],
  });
  return success(res, rooms, 'Lấy sơ đồ phòng thành công');
}));

// GET /api/v1/pms/rooms/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const room = await Room.findOne({
    where: { RoomId: req.params.id, IsDeleted: false },
    include: [
      { model: RoomType, as: 'roomType' },
      { model: Branch,   as: 'branch'   },
    ],
  });
  if (!room) return error(res, 404, 'Không tìm thấy phòng');
  return success(res, room, 'Lấy chi tiết phòng thành công');
}));

// PATCH /api/v1/pms/rooms/:id/status — đổi trạng thái phòng
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const VALID_STATUSES = ['CleanAvailable','CleanOccupied','DirtyVacant','DirtyOccupied','OutOfOrder'];
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status))
    return error(res, 400, `Trạng thái không hợp lệ. Chấp nhận: ${VALID_STATUSES.join(', ')}`);

  const room = await Room.findOne({ where: { RoomId: req.params.id, IsDeleted: false } });
  if (!room) return error(res, 404, 'Không tìm thấy phòng');

  await room.update({ Status: status });
  return success(res, room, 'Cập nhật trạng thái phòng thành công');
}));

// POST /api/v1/pms/rooms — tạo phòng mới (sẽ implement đầy đủ bởi Thực)
// PUT  /api/v1/pms/rooms/:id — cập nhật phòng
// DELETE /api/v1/pms/rooms/:id — soft delete

module.exports = router;
