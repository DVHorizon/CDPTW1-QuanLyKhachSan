'use strict';

const availabilityService = require('../services/availabilityService');
const { success, error } = require('../shared/utils/response');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROOM AVAILABILITY CONTROLLER
 * Mã tính năng: FEAT-GUEST-04 (Mã truy vết: A4)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /rooms/availability
 * Params: roomTypeId, checkInDate, checkOutDate, quantity
 */
exports.checkRoomAvailability = async (req, res) => {
  try {
    const { roomTypeId, checkInDate, checkOutDate, quantity = 1, lockSessionId } = req.query;

    if (!roomTypeId) {
      return error(res, 400, 'Mã loại phòng không được để trống', 'ERROR_0005_INVALID_VALUE');
    }

    const result = await availabilityService.checkAvailability({
      roomTypeId,
      checkInDate,
      checkOutDate,
      quantity,
      excludeSessionId: lockSessionId
    });

    // Nếu không còn phòng nào (availableRoomsCount === 0)
    if (result.availableRoomsCount === 0) {
      return res.status(200).json({
        success: true,
        code: 'ERROR_0022_ROOM_SOLD_OUT',
        message: 'Loại phòng này đã hết phòng trống trong khoảng thời gian quý khách chọn',
        data: {
          ...result,
          isAvailable: false
        }
      });
    }

    // Nếu có phòng nhưng không đủ số lượng yêu cầu
    if (!result.isAvailable) {
      return res.status(200).json({
        success: true,
        code: 'ERROR_0023_INSUFFICIENT_ROOMS',
        message: `Hiện chỉ còn lại ${result.availableRoomsCount} phòng trống, không đủ số lượng quý khách yêu cầu`,
        data: {
          ...result,
          isAvailable: false
        }
      });
    }

    return success(res, result, 'Kiểm tra phòng trống khả dụng thành công');
  } catch (err) {
    console.error('Lỗi checkRoomAvailability:', err.message);
    const statusCode = err.statusCode || 500;
    const errCode = err.code || 'ERROR_INTERNAL_SERVER';
    return error(res, statusCode, err.message, errCode);
  }
};

/**
 * POST /rooms/lock
 * Body: { roomTypeId, checkInDate, checkOutDate, quantity }
 * Kích hoạt phiên giữ phòng tạm thời 15 phút (Pessimistic/Optimistic Locking)
 */
exports.lockRoomSession = async (req, res) => {
  try {
    const { roomTypeId, checkInDate, checkOutDate, quantity = 1 } = req.body;

    if (!roomTypeId) {
      return error(res, 400, 'Mã loại phòng không được để trống', 'ERROR_0005_INVALID_VALUE');
    }

    const lockResult = await availabilityService.acquireRoomLock({
      roomTypeId,
      checkInDate,
      checkOutDate,
      quantity
    });

    return success(res, lockResult, 'Giữ phòng tạm thời thành công trong 15 phút', 201);
  } catch (err) {
    console.error('Lỗi lockRoomSession:', err.message);
    
    // Xử lý tranh chấp phòng cuối cùng
    if (err.code === 'ERROR_0022_ROOM_SOLD_OUT' || err.code === 'ERROR_0023_INSUFFICIENT_ROOMS') {
      return error(
        res,
        409,
        err.message || 'Rất tiếc, phòng vừa được khách hàng khác giữ chỗ. Vui lòng chọn khoảng ngày hoặc hạng phòng khác',
        err.code
      );
    }

    const statusCode = err.statusCode || 500;
    const errCode = err.code || 'ERROR_0024_CONCURRENT_LOCK_FAILED';
    const message = err.message || 'Rất tiếc, phòng vừa được khách hàng khác giữ chỗ. Vui lòng chọn khoảng ngày hoặc hạng phòng khác';

    return error(res, statusCode, message, errCode);
  }
};

/**
 * DELETE /rooms/lock/:sessionId
 * Nhả phiên giữ phòng
 */
exports.releaseRoomLock = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const released = availabilityService.releaseRoomLock(sessionId);
    return success(res, { released }, released ? 'Đã nhả phòng giữ chỗ thành công' : 'Phiên giữ phòng không tồn tại hoặc đã hết hạn');
  } catch (err) {
    return error(res, 500, err.message);
  }
};
