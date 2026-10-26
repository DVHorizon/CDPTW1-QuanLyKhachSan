'use strict';

const { Op } = require('sequelize');
const { sequelize, RestaurantTable, TableReservation, User, FoodOrder, FoodOrderDetail, MenuItem } = require('../../models');
const { broadcastTableReservation, broadcastTableUpdate } = require('../../services/websocketService');

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

    // Cho phép xem bàn trống trong ngày hiện tại (grace period 2 giờ để tra cứu sơ đồ bàn ăn của ngày hôm nay)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    if (resTime.getTime() < twoHoursAgo) {
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

    // Thống kê số lượng bàn trống theo từng khu vực
    const locationStats = {};
    tablesData.forEach(t => {
      if (!locationStats[t.location]) {
        locationStats[t.location] = { total: 0, available: 0, booked: 0 };
      }
      locationStats[t.location].total += 1;
      if (t.isBooked) {
        locationStats[t.location].booked += 1;
      }
      if (t.isAvailable) {
        locationStats[t.location].available += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalTables: allTables.length,
        availableCount: suitableTables.length,
        locationStats,
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

    // Thời gian không được ở quá khứ (cho phép dung sai 24h hoặc trong ngày hôm nay để khách đặt bàn trong ngày thuận tiện)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (resTime.getTime() < todayStart.getTime()) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Không thể đặt bàn cho ngày trong quá khứ.'
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
      // Hệ thống tự động tìm bàn phù hợp nhất (Capacity >= guestCount, ưu tiên theo location nếu có)
      const { location } = req.body;
      const whereCondition = {
        IsDeleted: false,
        Status: { [Op.ne]: 'Inactive' },
        Capacity: { [Op.gte]: parsedGuestCount }
      };
      if (location) {
        whereCondition.Location = location;
      }

      let potentialTables = await RestaurantTable.findAll({
        where: whereCondition,
        order: [['Capacity', 'ASC'], ['TableNumber', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      // Nếu tìm theo location không còn thì fallback sang tất cả khu vực
      if (potentialTables.length === 0 && location) {
        potentialTables = await RestaurantTable.findAll({
          where: {
            IsDeleted: false,
            Status: { [Op.ne]: 'Inactive' },
            Capacity: { [Op.gte]: parsedGuestCount }
          },
          order: [['Capacity', 'ASC'], ['TableNumber', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      }

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

    // Đồng bộ tức thì sang Sơ đồ bàn ăn (Table Map)
    try {
      broadcastTableUpdate({
        tableId: assignedTable.TableId,
        tableNumber: assignedTable.TableNumber,
        status: 'Reserved',
        action: 'NewReservation',
        timestamp: new Date().toISOString()
      });
    } catch (_) {}

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
    const guestId = currentUser?.id || currentUser?.UserId || req.query.userId;

    // Nếu là client view hoặc tài khoản khách: Lấy lượt đặt bàn của chính client đó
    if (req.query.view === 'client' || req.query.view === 'guest') {
      if (guestId) {
        where.UserId = guestId;
      } else {
        // Nếu client chưa đăng nhập hoặc không có userId thì lấy danh sách các lượt đặt bàn mới nhất gần đây của khách vãng lai hoặc rỗng
        return res.status(200).json({ success: true, data: [] });
      }
    } else if (!isStaff && guestId) {
      // Nếu là khách thông thường đã đăng nhập
      where.UserId = guestId;
    } else {
      // Admin / Nhân viên: Xem toàn bộ danh sách hoặc lọc theo query
      if (req.query.status && req.query.status !== 'ALL') where.Status = req.query.status;
      if (req.query.tableId) where.TableId = req.query.tableId;
      if (req.query.userId) where.UserId = req.query.userId;
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : (isStaff || !where.UserId ? 100 : 50);

    const reservations = await TableReservation.findAll({
      where,
      limit: isNaN(limit) ? 100 : limit,
      order: [['TableReservationId', 'DESC']],
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FEAT-FNB-13 (A4.13): SƠ ĐỒ BÀN ĂN TRỰC QUAN (TABLE MAP)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/v1/table-reservations/table-map
 * Lấy sơ đồ bàn theo khu vực, bữa ăn và khung giờ
 */
exports.getTableMapOverview = async (req, res) => {
  try {
    const { zone, mealPeriod, timeSlot } = req.query;

    const where = { IsDeleted: false };
    if (zone && zone !== 'ALL' && zone !== 'All Zones') {
      where.Location = zone;
    }

    const tables = await RestaurantTable.findAll({
      where,
      order: [['TableId', 'ASC']]
    });

    if (!tables || tables.length === 0) {
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Không có dữ liệu bàn cho khung giờ đã chọn.'
      });
    }

    const now = new Date();
    // Quét toàn bộ các lượt đặt bàn trong ngày hôm nay (từ đầu ngày đến cuối ngày)
    // để bất kỳ bàn nào vừa đặt xong trong ngày đều lập tức hiện trạng thái "Đã Đặt Trước (Reserved)" và tên khách
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(now);
    windowEnd.setHours(23, 59, 59, 999);

    const activeReservations = await TableReservation.findAll({
      where: {
        Status: { [Op.in]: ['Pending', 'Confirmed'] },
        ReservationTime: {
          [Op.gte]: windowStart
        }
      },
      order: [['ReservationTime', 'ASC']],
      include: [
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Phone', 'Email'] }
      ]
    });

    const reservationMap = new Map();
    activeReservations.forEach(r => {
      // Ưu tiên hiển thị lượt đặt gần nhất của bàn
      if (!reservationMap.has(r.TableId)) {
        reservationMap.set(r.TableId, r);
      }
    });

    // Lấy các đơn món chưa hoàn tất của bàn (kể cả đang chuẩn bị, sẵn sàng hoặc đang dùng món)
    const activeOrders = await FoodOrder.findAll({
      where: {
        OrderType: 'Restaurant',
        Status: { [Op.notIn]: ['Cancelled', 'Completed', 'Paid'] }
      },
      include: [
        { model: User, attributes: ['UserId', 'FullName'] },
        { 
          model: FoodOrderDetail, 
          as: 'details',
          include: [{ model: MenuItem, attributes: ['MenuItemId', 'ItemName', 'Price'] }]
        }
      ]
    });

    const orderMap = new Map();
    activeOrders.forEach(o => {
      if (o.TableId) {
        orderMap.set(o.TableId, o);
      }
    });

    let totalSeats = 0;
    let occupiedSeats = 0;
    let availableCount = 0;
    let reservedCount = 0;
    let occupiedCount = 0;
    let cleaningCount = 0;

    const tableList = tables.map(t => {
      const activeRes = reservationMap.get(t.TableId);
      const activeOrd = orderMap.get(t.TableId);

      let effectiveStatus = t.Status || 'Available';
      if (activeOrd && effectiveStatus !== 'Cleaning') {
        effectiveStatus = 'Occupied';
      } else if (activeRes && effectiveStatus === 'Available') {
        effectiveStatus = 'Reserved';
      }

      totalSeats += (t.Capacity || 4);
      if (effectiveStatus === 'Occupied') {
        occupiedSeats += (t.Capacity || 4);
        occupiedCount++;
      } else if (effectiveStatus === 'Reserved') {
        reservedCount++;
      } else if (effectiveStatus === 'Cleaning') {
        cleaningCount++;
      } else if (effectiveStatus === 'Available') {
        availableCount++;
      }

      return {
        tableId: t.TableId,
        tableNumber: t.TableNumber,
        location: t.Location,
        capacity: t.Capacity,
        status: effectiveStatus,
        branchName: t.BranchName,
        currentReservation: activeRes ? {
          reservationId: activeRes.TableReservationId,
          guestName: activeRes.user?.FullName || 'Khách đặt trước',
          phone: activeRes.user?.Phone || '',
          guestCount: activeRes.GuestCount,
          time: activeRes.ReservationTime,
          note: activeRes.Note
        } : null,
        currentOrder: activeOrd ? {
          orderId: activeOrd.FoodOrderId,
          status: activeOrd.Status,
          totalAmount: activeOrd.TotalAmount,
          orderTime: activeOrd.OrderTime,
          guestName: activeOrd.User?.FullName || 'Khách tại bàn',
          itemCount: activeOrd.details?.length || 0,
          items: activeOrd.details?.map(d => ({
            name: d.MenuItem?.ItemName || 'Món ăn',
            quantity: d.Quantity,
            price: d.UnitPrice,
            total: d.TotalPrice
          })) || []
        } : null
      };
    });

    // Gom nhóm theo phân khu (Location)
    const zones = {};

    // Sắp xếp các bàn có hoạt động (Occupied / Reserved / Cleaning) lên trước, sau đó theo số bàn
    const sortedTableList = [...tableList].sort((a, b) => {
      const getPriority = (status) => {
        if (status === 'Occupied') return 1;
        if (status === 'Reserved') return 2;
        if (status === 'Cleaning') return 3;
        return 4;
      };
      const pDiff = getPriority(a.status) - getPriority(b.status);
      if (pDiff !== 0) return pDiff;
      return String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, { numeric: true });
    });

    // Gom toàn bộ bàn vào từng phân khu (không cắt xén chỉ lấy 12 bàn)
    sortedTableList.forEach(t => {
      const loc = t.location || 'Khu Vực Chung';
      if (!zones[loc]) {
        zones[loc] = [];
      }
      zones[loc].push(t);
    });

    const occupancyRate = totalSeats > 0 ? ((occupiedSeats / totalSeats) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalTables: tables.length,
          availableCount,
          reservedCount,
          occupiedCount,
          cleaningCount,
          totalSeats,
          occupiedSeats,
          occupancyRate: parseFloat(occupancyRate),
          mealPeriod: mealPeriod || 'Bữa Tối Fine Dining Hoàng Hôn',
          timeSlot: timeSlot || '19:30 LIVE'
        },
        zones,
        tables: tableList
      }
    });
  } catch (error) {
    console.error('Error fetching table map overview:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi tải sơ đồ bàn ăn.'
    });
  }
};

/**
 * GET /api/v1/table-reservations/table-map/:tableId
 * Lấy chi tiết hồ sơ điều phối của một bàn
 */
exports.getTableDetail = async (req, res) => {
  try {
    const { tableId } = req.params;

    const table = await RestaurantTable.findOne({
      where: { TableId: tableId, IsDeleted: false }
    });

    if (!table) {
      return res.status(404).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Bàn không tồn tại.'
      });
    }

    // Lấy thông tin đặt bàn đang hiệu lực hoặc gần nhất của bàn
    let reservation = await TableReservation.findOne({
      where: {
        TableId: tableId,
        Status: { [Op.in]: ['Pending', 'Confirmed'] }
      },
      include: [{ model: User, as: 'user', attributes: ['UserId', 'FullName', 'Phone', 'Email'] }],
      order: [['ReservationTime', 'ASC']]
    });

    if (!reservation) {
      reservation = await TableReservation.findOne({
        where: { TableId: tableId },
        include: [{ model: User, as: 'user', attributes: ['UserId', 'FullName', 'Phone', 'Email'] }],
        order: [['ReservationTime', 'DESC']]
      });
    }

    // Lấy thông tin đơn món đang hoạt động (gồm cả món đang làm, sẵn sàng, hoặc đang phục vụ ăn uống)
    const activeOrder = await FoodOrder.findOne({
      where: {
        TableId: tableId,
        OrderType: 'Restaurant',
        Status: { [Op.notIn]: ['Cancelled', 'Completed', 'Paid'] }
      },
      include: [
        { model: User, as: 'user', attributes: ['UserId', 'FullName', 'Phone', 'Email'] },
        {
          model: Stay,
          include: [{ model: Room, attributes: ['RoomId', 'RoomNumber'] }]
        },
        {
          model: FoodOrderDetail,
          as: 'details',
          include: [{ model: MenuItem, attributes: ['MenuItemId', 'ItemName', 'Price'] }]
        }
      ],
      order: [['OrderTime', 'DESC']]
    });

    const roomNumber = activeOrder?.Stay?.Room?.RoomNumber || null;

    return res.status(200).json({
      success: true,
      data: {
        tableId: table.TableId,
        tableNumber: table.TableNumber,
        location: table.Location,
        capacity: table.Capacity,
        status: activeOrder ? 'Occupied' : table.Status,
        reservation: reservation ? {
          reservationId: reservation.TableReservationId,
          guestName: reservation.user?.FullName || 'Khách đặt trước',
          phone: reservation.user?.Phone || '',
          email: reservation.user?.Email || '',
          guestCount: reservation.GuestCount,
          time: reservation.ReservationTime,
          note: reservation.Note
        } : null,
        activeOrder: activeOrder ? {
          orderId: activeOrder.FoodOrderId,
          status: activeOrder.Status,
          totalAmount: activeOrder.TotalAmount,
          orderTime: activeOrder.OrderTime,
          guestName: activeOrder.user?.FullName || reservation?.user?.FullName || 'Khách tại bàn',
          phone: activeOrder.user?.Phone || reservation?.user?.Phone || '',
          roomNumber: roomNumber,
          note: activeOrder.Note || reservation?.Note || '',
          items: activeOrder.details?.map(d => ({
            detailId: d.FoodOrderDetailId,
            name: d.MenuItem?.ItemName || 'Món ăn',
            quantity: d.Quantity,
            unitPrice: d.UnitPrice,
            totalPrice: d.TotalPrice,
            note: d.Note
          })) || []
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching table detail:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi tải chi tiết bàn.'
    });
  }
};

/**
 * POST /api/v1/table-reservations/table-map/action
 * Thao tác trên bàn: QuickReserve | AssignWalkIn | CheckOut | MarkCleaned
 */
exports.handleTableAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { tableId, action, guestCount, customerName, phone, note } = req.body;
    const currentUserId = req.user?.userId || req.user?.id || req.user?.UserId || 1;

    // 1. Kiểm tra bàn tồn tại
    if (!tableId) {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0001_REQUIRED',
        message: 'Mã bàn là bắt buộc.'
      });
    }

    const table = await RestaurantTable.findOne({
      where: { TableId: tableId, IsDeleted: false },
      transaction
    });

    if (!table) {
      await transaction.rollback();
      return res.status(404).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Bàn không tồn tại.'
      });
    }

    if (table.Status === 'Inactive') {
      await transaction.rollback();
      return res.status(400).json({
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Bàn đang ngừng sử dụng, không thể thao tác.'
      });
    }

    let updatedStatus = table.Status;
    let resultData = {};

    switch (action) {
      // 2. Gán khách walk-in hoặc Check-in nhận khách đã đặt vào bàn (AssignWalkIn / CheckIn)
      case 'CheckIn':
      case 'AssignWalkIn': {
        // Cho phép nhận khách khi bàn đang Available (khách vãng lai) hoặc Reserved (khách đã đặt trước đến nhận bàn)
        if (table.Status !== 'Available' && table.Status !== 'Reserved') {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Bàn không ở trạng thái cho phép thực hiện thao tác này.'
          });
        }

        // Nếu bàn đang Reserved, cập nhật lượt đặt trước của bàn sang Completed
        const activeRes = await TableReservation.findOne({
          where: {
            TableId: table.TableId,
            Status: { [Op.in]: ['Confirmed', 'Pending'] }
          },
          order: [['ReservationTime', 'DESC']],
          transaction
        });
        if (activeRes) {
          await activeRes.update({ Status: 'Completed' }, { transaction });
        }

        const count = parseInt(guestCount || (activeRes ? activeRes.GuestCount : 1), 10);
        if (isNaN(count) || count <= 0) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Số lượng khách không hợp lệ.'
          });
        }

        if (count > table.Capacity) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Số khách vượt quá sức chứa của bàn.'
          });
        }

        // Cập nhật trạng thái bàn sang Occupied
        await table.update({ Status: 'Occupied' }, { transaction });
        updatedStatus = 'Occupied';

        // Tạo order nhà hàng giả lập cho khách walk-in
        const newOrder = await FoodOrder.create({
          TableId: table.TableId,
          UserId: currentUserId,
          OrderType: 'Restaurant',
          Status: 'Pending',
          TotalAmount: 0,
          PaymentMode: 'PayNow',
          Note: note ? `[Walk-in ${count}K] ${note}` : `[Khách vãng lai Walk-in: ${count} người]`
        }, { transaction });

        resultData = {
          tableId: table.TableId,
          tableNumber: table.TableNumber,
          status: 'Occupied',
          guestCount: count,
          orderId: newOrder.FoodOrderId,
          message: `Đã xếp bàn thành công cho khách walk-in (${count} khách).`
        };
        break;
      }

      // Gọi món trực tiếp tại bàn (OrderDishes)
      case 'OrderDishes': {
        const { items, orderNote } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0001_REQUIRED',
            message: 'Vui lòng chọn ít nhất một món ăn.'
          });
        }

        // Tìm đơn đang mở của bàn hoặc tạo mới
        let existingOrder = await FoodOrder.findOne({
          where: {
            TableId: table.TableId,
            OrderType: 'Restaurant',
            Status: { [Op.notIn]: ['Cancelled', 'Completed', 'Paid'] }
          },
          order: [['OrderTime', 'DESC']],
          transaction
        });

        if (!existingOrder) {
          existingOrder = await FoodOrder.create({
            TableId: table.TableId,
            UserId: currentUserId,
            OrderType: 'Restaurant',
            Status: 'Pending',
            TotalAmount: 0,
            PaymentMode: 'PayNow',
            Note: orderNote || `Gọi món tại bàn ${table.TableNumber}`
          }, { transaction });
        }

        let addedAmount = 0;
        const createdDetails = [];

        for (const item of items) {
          const qty = parseInt(item.quantity, 10);
          if (isNaN(qty) || qty <= 0) continue;

          const menuItem = await MenuItem.findByPk(item.menuItemId, { transaction });
          if (!menuItem) continue;

          const unitPrice = parseFloat(menuItem.Price) || 0;
          const totalPrice = unitPrice * qty;
          addedAmount += totalPrice;

          const detail = await FoodOrderDetail.create({
            FoodOrderId: existingOrder.FoodOrderId,
            MenuItemId: menuItem.MenuItemId,
            Quantity: qty,
            UnitPrice: unitPrice,
            TotalPrice: totalPrice,
            Note: item.note || ''
          }, { transaction });

          createdDetails.push(detail);
        }

        // Cập nhật lại tổng tiền đơn hàng
        const newTotal = (parseFloat(existingOrder.TotalAmount) || 0) + addedAmount;
        await existingOrder.update({
          TotalAmount: newTotal,
          Status: 'Preparing'
        }, { transaction });

        // Đảm bảo bàn chuyển Occupied nếu chưa
        if (table.Status !== 'Occupied') {
          await table.update({ Status: 'Occupied' }, { transaction });
          updatedStatus = 'Occupied';
        }

        resultData = {
          tableId: table.TableId,
          tableNumber: table.TableNumber,
          orderId: existingOrder.FoodOrderId,
          totalAmount: newTotal,
          itemsCount: createdDetails.length,
          status: 'Occupied',
          message: `Đã gửi ${createdDetails.length} món xuống bếp thành công!`
        };
        break;
      }

      // 3. Đặt bàn nhanh (QuickReserve)
      case 'QuickReserve': {
        if (table.Status !== 'Available') {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Bàn không ở trạng thái cho phép thực hiện thao tác này.'
          });
        }

        const count = parseInt(guestCount || 1, 10);
        if (isNaN(count) || count <= 0) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Số lượng khách không hợp lệ.'
          });
        }

        if (count > table.Capacity) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Số khách vượt quá sức chứa của bàn.'
          });
        }

        await table.update({ Status: 'Reserved' }, { transaction });
        updatedStatus = 'Reserved';

        const reservation = await TableReservation.create({
          TableId: table.TableId,
          UserId: currentUserId,
          ReservationTime: new Date(),
          GuestCount: count,
          Status: 'Confirmed',
          Note: note ? `[Đặt nhanh] ${customerName || ''} - ${note}` : `[Đặt nhanh tại quầy] ${customerName || 'Khách vãng lai'}`
        }, { transaction });

        resultData = {
          tableId: table.TableId,
          tableNumber: table.TableNumber,
          status: 'Reserved',
          reservationId: reservation.TableReservationId,
          message: 'Đặt bàn nhanh thành công.'
        };
        break;
      }

      // 4. Check-out bàn (CheckOut)
      case 'CheckOut': {
        // Quy tắc 3.4: Bàn phải ở trạng thái đang phục vụ (Occupied)
        // Tìm xem bàn có đơn món nhà hàng đang phục vụ không
        const activeTableOrder = await FoodOrder.findOne({
          where: {
            TableId: table.TableId,
            OrderType: 'Restaurant',
            Status: { [Op.notIn]: ['Served', 'Delivered', 'Cancelled'] }
          },
          transaction
        });

        if (table.Status !== 'Occupied' && !activeTableOrder) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Bàn không ở trạng thái cho phép thực hiện thao tác này.'
          });
        }

        // Quy tắc 3.4: Check-out bàn chỉ thực hiện được khi không còn đơn món chưa hoàn tất (khác Served/Delivered/Cancelled)
        const pendingOrders = await FoodOrder.findAll({
          where: {
            TableId: table.TableId,
            OrderType: 'Restaurant',
            Status: { [Op.notIn]: ['Served', 'Delivered', 'Cancelled'] }
          },
          transaction
        });

        if (pendingOrders.length > 0) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Không thể check-out. Bàn còn đơn món chưa hoàn tất.'
          });
        }

        // Hoàn tất mọi đơn món của bàn nếu có
        await FoodOrder.update(
          { Status: 'Delivered' },
          {
            where: {
              TableId: table.TableId,
              OrderType: 'Restaurant',
              Status: 'Served'
            },
            transaction
          }
        );

        // Sau khi check-out, bàn chuyển Cleaning
        await table.update({ Status: 'Cleaning' }, { transaction });
        updatedStatus = 'Cleaning';

        resultData = {
          tableId: table.TableId,
          tableNumber: table.TableNumber,
          status: 'Cleaning',
          message: 'Giải phóng bàn thành công. Bàn đã chuyển sang trạng thái Cần dọn.'
        };
        break;
      }

      // 4b. Chuyển bàn khách (MoveTable)
      case 'MoveTable': {
        const targetTableId = req.body.targetTableId;
        if (!targetTableId) {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0001_REQUIRED',
            message: 'Vui lòng chọn bàn đích để chuyển khách.'
          });
        }

        const targetTable = await RestaurantTable.findOne({
          where: { TableId: targetTableId, IsDeleted: false },
          transaction
        });

        if (!targetTable || targetTable.Status !== 'Available') {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Bàn đích không còn trống hoặc không thể sử dụng.'
          });
        }

        // Chuyển toàn bộ đơn món đang mở của bàn cũ sang bàn mới
        await FoodOrder.update(
          { TableId: targetTable.TableId },
          {
            where: {
              TableId: table.TableId,
              OrderType: 'Restaurant',
              Status: { [Op.notIn]: ['Cancelled', 'Delivered'] }
            },
            transaction
          }
        );

        // Chuyển bản ghi đặt bàn (nếu có)
        await TableReservation.update(
          { TableId: targetTable.TableId },
          {
            where: {
              TableId: table.TableId,
              Status: { [Op.in]: ['Pending', 'Confirmed'] }
            },
            transaction
          }
        );

        // Bàn đích chuyển thành Occupied
        await targetTable.update({ Status: 'Occupied' }, { transaction });

        // Bàn nguồn chuyển thành Cleaning
        await table.update({ Status: 'Cleaning' }, { transaction });
        updatedStatus = 'Cleaning';

        // Phát WebSocket cho cả 2 bàn
        try {
          broadcastTableUpdate({
            tableId: targetTable.TableId,
            tableNumber: targetTable.TableNumber,
            status: 'Occupied',
            action: 'MoveTable_Target',
            timestamp: new Date().toISOString()
          });
        } catch (_) {}

        resultData = {
          fromTableId: table.TableId,
          fromTableNumber: table.TableNumber,
          toTableId: targetTable.TableId,
          toTableNumber: targetTable.TableNumber,
          status: 'Cleaning',
          message: `Đã chuyển khách thành công từ Bàn ${table.TableNumber} sang Bàn ${targetTable.TableNumber}.`
        };
        break;
      }

      // 5. Xác nhận đã dọn bàn (MarkCleaned)
      case 'MarkCleaned': {
        if (table.Status !== 'Cleaning') {
          await transaction.rollback();
          return res.status(400).json({
            code: 'ERROR_0005_INVALID_VALUE',
            message: 'Bàn không ở trạng thái cho phép thực hiện thao tác này.'
          });
        }

        // Sau khi dọn dẹp xong, bàn chuyển Available
        await table.update({ Status: 'Available' }, { transaction });
        updatedStatus = 'Available';

        resultData = {
          tableId: table.TableId,
          tableNumber: table.TableNumber,
          status: 'Available',
          message: 'Bàn đã được khử khuẩn dọn dẹp sạch sẽ, sẵn sàng đón khách mới.'
        };
        break;
      }

      default: {
        await transaction.rollback();
        return res.status(400).json({
          code: 'ERROR_0005_INVALID_VALUE',
          message: 'Thao tác không hợp lệ.'
        });
      }
    }

    await transaction.commit();

    // 6. Phát sự kiện WebSocket Realtime tới tất cả client
    try {
      broadcastTableUpdate({
        tableId: table.TableId,
        tableNumber: table.TableNumber,
        status: updatedStatus,
        action,
        timestamp: new Date().toISOString()
      });
    } catch (wsErr) {
      console.warn('⚠️ WebSocket sync warning:', wsErr.message);
      // Quy tắc 4.2 bước 8: Nếu đồng bộ thất bại
      // return res.status(500).json({ code: 'ERROR_0005_INVALID_VALUE', message: 'Không thể đồng bộ trạng thái bàn.' });
    }

    return res.status(200).json({
      success: true,
      message: resultData.message,
      data: resultData
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error handling table action:', error);
    return res.status(500).json({
      code: 'ERROR_5000_INTERNAL',
      message: 'Lỗi hệ thống khi thao tác trên bàn ăn.'
    });
  }
};
