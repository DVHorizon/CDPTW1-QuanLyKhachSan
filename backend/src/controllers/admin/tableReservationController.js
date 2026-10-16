'use strict';

const { Op } = require('sequelize');
const { sequelize, RestaurantTable, TableReservation, User } = require('../../models');
const { broadcastTableReservation } = require('../../services/websocketService');

// Khoảng thời gian dùng bữa trung bình (120 phút = 2 giờ)
const RESERVATION_DURATION_MINUTES = 120;

/**
 * Helper: Kiểm tra xem một bàn có bị trùng lượt đặt (Pending hoặc Confirmed) trong khung giờ hay không
 */
async function isTableBooked(tableId, targetTime, excludeReservationId = null, transaction = null) {
  const windowStart = new Date(targetTime.getTime() - RESERVATION_DURATION_MINUTES * 60 * 1000);
  const windowEnd   = new Date(targetTime.getTime() + RESERVATION_DURATION_MINUTES * 60 * 1000);

  const where = {
    TableId: tableId,
    Status: { [Op.in]: ['Pending', 'Confirmed'] },
    ReservationTime: {
      [Op.between]: [windowStart, windowEnd]
    }
  };

  if (excludeReservationId) {
    where.TableReservationId = { [Op.ne]: excludeReservationId };
  }

  const existing = await TableReservation.findOne({
    where,
    transaction
  });

  return !!existing;
}

/**
 * GET /api/v1/table-reservations/available-tables
 * Xem sơ đồ / danh sách bàn trống theo ngày giờ và số người
 */
exports.getAvailableTables = async (req, res) => {
  try {
    const { reservationTime, guestCount } = req.query;

    if (!reservationTime) {
      return res.status(400).json({
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn ngày giờ đặt bàn.'
      });
    }

    const resTime = new Date(reservationTime);
    if (isNaN(resTime.getTime())) {
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Thời gian đặt bàn không hợp lệ.'
      });
    }

    if (resTime.getTime() < Date.now()) {
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Thời gian đặt bàn không hợp lệ.'
      });
    }

    const count = parseInt(guestCount || 1, 10);
    if (isNaN(count) || count <= 0) {
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Số lượng khách không hợp lệ.'
      });
    }

    // 1. Lấy tất cả các bàn đang hoạt động
    const allTables = await RestaurantTable.findAll({
      where: {
        IsDeleted: false,
        Status: { [Op.ne]: 'Inactive' }
      },
      order: [['TableNumber', 'ASC']]
    });

    // 2. Lấy danh sách các bàn đã có lịch đặt trùng khung giờ (+- 2 tiếng)
    const windowStart = new Date(resTime.getTime() - RESERVATION_DURATION_MINUTES * 60 * 1000);
    const windowEnd   = new Date(resTime.getTime() + RESERVATION_DURATION_MINUTES * 60 * 1000);

    const bookedReservations = await TableReservation.findAll({
      where: {
        Status: { [Op.in]: ['Pending', 'Confirmed'] },
        ReservationTime: {
          [Op.between]: [windowStart, windowEnd]
        }
      },
      attributes: ['TableId']
    });

    const bookedTableIds = new Set(bookedReservations.map(r => r.TableId));

    // 3. Phân loại bàn trống và kiểm tra sức chứa
    const tablesData = allTables.map(t => {
      const isBooked = bookedTableIds.has(t.TableId);
      const isCapacityEnough = t.Capacity >= count;
      return {
        tableId: t.TableId,
        tableNumber: t.TableNumber,
        location: t.Location,
        capacity: t.Capacity,
        branchName: t.BranchName,
        isAvailable: !isBooked && isCapacityEnough,
        isBooked,
        isCapacityEnough
      };
    });

    const suitableTables = tablesData.filter(t => t.isAvailable);

    return res.status(200).json({
      success: true,
      data: {
        totalTables: allTables.length,
        availableCount: suitableTables.length,
        tables: tablesData
      }
    });
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi tải sơ đồ bàn.'
    });
  }
};

/**
 * POST /api/v1/table-reservations
 * Tạo lượt đặt bàn mới (FEAT-FNB-09: A4.9)
 */
exports.createReservation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { reservationTime, guestCount, tableId, note } = req.body;
    // 1. Kiểm tra tài khoản người dùng (nếu có token lấy từ token, nếu không cho phép lấy userId hoặc mặc định khách VIP 1)
    let currentUserId = req.user?.id || req.user?.UserId || req.body?.userId;
    if (!currentUserId) {
      currentUserId = 1; // Default Guest VIP
    }

    // 2. Validate Ngày giờ đặt bàn
    if (!reservationTime) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn ngày giờ đặt bàn.'
      });
    }

    const resTime = new Date(reservationTime);
    if (isNaN(resTime.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Thời gian đặt bàn không hợp lệ.'
      });
    }

    // Thời gian không được ở quá khứ
    if (resTime.getTime() < Date.now()) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Thời gian đặt bàn không hợp lệ.'
      });
    }

    // 3. Validate Số người
    if (guestCount === undefined || guestCount === null || isNaN(guestCount)) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Số lượng khách không hợp lệ.'
      });
    }

    const parsedGuestCount = parseInt(guestCount, 10);
    if (parsedGuestCount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Số lượng khách không hợp lệ.'
      });
    }

    // 4. Validate Ghi chú
    if (note && typeof note === 'string' && note.length > 500) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Ghi chú không được vượt quá 500 ký tự'
      });
    }

    // 5. Xác định bàn (chọn bàn cụ thể hoặc hệ thống tự động gán)
    let assignedTable = null;

    if (tableId) {
      // Khách chọn bàn cụ thể
      assignedTable = await RestaurantTable.findOne({
        where: {
          TableId: tableId,
          IsDeleted: false,
          Status: { [Op.ne]: 'Inactive' }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!assignedTable) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Bàn được chọn không tồn tại hoặc tạm ngưng phục vụ.'
        });
      }

      // Kiểm tra sức chứa bàn
      if (parsedGuestCount > assignedTable.Capacity) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Số khách vượt quá sức chứa của bàn.'
        });
      }

      // Kiểm tra trùng giờ
      const booked = await isTableBooked(assignedTable.TableId, resTime, null, transaction);
      if (booked) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Bàn đã được đặt trong khung giờ này.'
        });
      }
    } else {
      // Hệ thống tự động tìm bàn phù hợp nhất (Capacity >= guestCount, gần nhất)
      const potentialTables = await RestaurantTable.findAll({
        where: {
          IsDeleted: false,
          Status: { [Op.ne]: 'Inactive' },
          Capacity: { [Op.gte]: parsedGuestCount }
        },
        order: [['Capacity', 'ASC'], ['TableNumber', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      for (const t of potentialTables) {
        const booked = await isTableBooked(t.TableId, resTime, null, transaction);
        if (!booked) {
          assignedTable = t;
          break;
        }
      }

      if (!assignedTable) {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Không còn bàn trống trong khung giờ đã chọn. Vui lòng chọn khung giờ khác.'
        });
      }
    }

    // 6. Tạo bản ghi TableReservations với Status = 'Confirmed'
    const reservation = await TableReservation.create({
      TableId: assignedTable.TableId,
      UserId: currentUserId,
      ReservationTime: resTime,
      GuestCount: parsedGuestCount,
      Status: 'Confirmed',
      Note: note ? note.trim() : null
    }, { transaction });

    // 7. Cập nhật trạng thái bàn sang 'Reserved'
    await assignedTable.update({ Status: 'Reserved' }, { transaction });

    await transaction.commit();

    // 8. Tải thông tin chi tiết để gửi WebSocket thông báo Lễ tân / Nhà hàng
    const fullReservation = await TableReservation.findByPk(reservation.TableReservationId, {
      include: [
        { model: RestaurantTable, as: 'table' },
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] }
      ]
    });

    broadcastTableReservation(fullReservation, 'NEW_RESERVATION');

    // 9. Trả về phản hồi thành công theo chuẩn SPEC
    return res.status(201).json({
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới lượt đặt bàn thành công',
      data: {
        tableReservationId: reservation.TableReservationId,
        tableId: assignedTable.TableId,
        tableNumber: assignedTable.TableNumber,
        guestCount: reservation.GuestCount,
        reservationTime: reservation.ReservationTime,
        status: reservation.Status,
        note: reservation.Note,
        createdAt: reservation.CreatedAt
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating table reservation:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi tạo lượt đặt bàn.'
    });
  }
};

/**
 * GET /api/v1/table-reservations
 * Lấy danh sách lượt đặt bàn (khách xem của mình, nhân viên xem toàn bộ)
 */
exports.getReservations = async (req, res) => {
  try {
    const currentUser = req.user;
    const roleId = currentUser?.roleId || currentUser?.RoleId;
    const roleName = (currentUser?.roleName || currentUser?.role || '').toLowerCase();
    const isStaff = roleId === 1 || roleId === 2 || roleId === 3 ||
      ['admin', 'manager', 'staff', 'reception', 'fnb'].some(r => roleName.includes(r));

    const where = {};
    if (!isStaff) {
      where.UserId = currentUser.id || currentUser.UserId;
    } else {
      if (req.query.status) where.Status = req.query.status;
      if (req.query.tableId) where.TableId = req.query.tableId;
    }

    const reservations = await TableReservation.findAll({
      where,
      order: [['ReservationTime', 'DESC']],
      include: [
        { model: RestaurantTable, as: 'table' },
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Email', 'Phone'] }
      ]
    });

    return res.status(200).json({
      success: true,
      data: reservations.map(r => ({
        tableReservationId: r.TableReservationId,
        tableId: r.TableId,
        tableNumber: r.table?.TableNumber || `Bàn ${r.TableId}`,
        location: r.table?.Location,
        capacity: r.table?.Capacity,
        userId: r.UserId,
        customerName: r.user?.FullName || 'Khách vãng lai',
        customerPhone: r.user?.Phone,
        guestCount: r.GuestCount,
        reservationTime: r.ReservationTime,
        status: r.Status,
        note: r.Note,
        createdAt: r.CreatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching table reservations:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Không thể tải danh sách đặt bàn.'
    });
  }
};

/**
 * PATCH /api/v1/table-reservations/:reservationId/check-in
 * Nhân viên check-in khi khách đến đúng giờ: Bàn -> Occupied, Lượt đặt -> Completed
 */
exports.checkInReservation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { reservationId } = req.params;
    const reservation = await TableReservation.findByPk(reservationId, {
      include: [{ model: RestaurantTable, as: 'table' }],
      transaction
    });

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Lượt đặt bàn không tồn tại.'
      });
    }

    if (reservation.Status !== 'Confirmed') {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: `Không thể check-in lượt đặt ở trạng thái ${reservation.Status}.`
      });
    }

    await reservation.update({ Status: 'Completed' }, { transaction });
    if (reservation.table) {
      await reservation.table.update({ Status: 'Occupied' }, { transaction });
    }

    await transaction.commit();

    broadcastTableReservation(reservation, 'CHECK_IN');

    return res.status(200).json({
      success: true,
      message: 'Check-in bàn thành công.',
      data: {
        reservationId: reservation.TableReservationId,
        status: 'Completed',
        tableStatus: 'Occupied'
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error checking in reservation:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi check-in đặt bàn.'
    });
  }
};

/**
 * PATCH /api/v1/table-reservations/:reservationId/no-show
 * Quá thời gian giữ bàn hoặc hủy: Lượt đặt -> NoShow, Bàn -> Available
 */
exports.noShowReservation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { reservationId } = req.params;
    const reservation = await TableReservation.findByPk(reservationId, {
      include: [{ model: RestaurantTable, as: 'table' }],
      transaction
    });

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Lượt đặt bàn không tồn tại.'
      });
    }

    await reservation.update({ Status: 'NoShow' }, { transaction });
    if (reservation.table) {
      await reservation.table.update({ Status: 'Available' }, { transaction });
    }

    await transaction.commit();

    broadcastTableReservation(reservation, 'NO_SHOW');

    return res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái No-Show, bàn đã sẵn sàng đón khách mới.',
      data: {
        reservationId: reservation.TableReservationId,
        status: 'NoShow',
        tableStatus: 'Available'
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error handling no-show reservation:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi xử lý No-Show.'
    });
  }
};
