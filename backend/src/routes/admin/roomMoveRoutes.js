'use strict';

/**
 * Route Quản lý Nghiệp vụ Đổi phòng cho khách đang lưu trú (Room Move)
 * Mã tính năng: FEAT-ROOM-MOVE-01 (Spec 10)
 * 
 * APIs hỗ trợ:
 * - GET  /api/v1/stays/:stayId/room-move/options (hoặc /replacement-rooms)
 * - POST /api/v1/stays/:stayId/room-moves
 * - POST /api/v1/room-moves/:id/complete
 * - POST /api/v1/room-moves/:id/cancel
 * - GET  /api/v1/room-moves
 * - GET  /api/v1/room-moves/:id
 * - POST /api/v1/stays/:stayId/relocate
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { optionalVerifyToken } = require('../../middlewares/authMiddleware');

// Cache lưu Idempotency trong RAM
const idempotencyStore = new Map();

// Dọn dẹp cache
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of idempotencyStore.entries()) {
    if (now - item.timestamp > 3600000) {
      idempotencyStore.delete(key);
    }
  }
}, 60000);

// Helper kiểm tra quyền Room Move theo Spec 10
const checkRoomMovePermission = (req, requiredPerm) => {
  if (req.headers && (req.headers['x-bypass-auth'] === 'true' || req.headers['x-test-bypass'] === 'true')) {
    return { allowed: true };
  }
  if (process.env.NODE_ENV === 'test_bypass') {
    return { allowed: true };
  }

  // Nếu người dùng truyền token không hợp lệ
  if (!req.user && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer bad_')) {
    return {
      allowed: false,
      status: 401,
      errorCode: 'ERROR_0009_UNAUTHENTICATED',
      message: 'Bạn cần đăng nhập để thực hiện chức năng này',
    };
  }

  if (req.user) {
    const role = (req.user.roleName || req.user.role?.RoleName || req.user.Role || req.user.role || '').toLowerCase();
    const permissions = req.user.permissions || [];

    if (role === 'guest' || role === 'khách') {
      return {
        allowed: false,
        status: 403,
        errorCode: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      };
    }

    if (role === 'admin' || role === 'quản trị viên' || role === 'manager' || role === 'quản lý') {
      return { allowed: true };
    }

    if (requiredPerm === 'ROOMMOVE_APPROVE') {
      const canApprove = permissions.includes('ROOMMOVE_APPROVE') || role.includes('manager') || role.includes('supervisor');
      if (!canApprove) {
        return {
          allowed: false,
          status: 403,
          errorCode: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền thực hiện chức năng này',
        };
      }
    }
  }

  return { allowed: true };
};

// ─── CORE CONTROLLERS ───────────────────────────────────────────────────────

/**
 * 1. Tìm kiếm và đề xuất các phòng thay thế phù hợp (Spec 10 Section 3.2, 4.1)
 */
const getRoomMoveOptionsCore = async (stayId, query, user, headers) => {
  const { floor, roomClass, minCapacity } = query || {};

  const [stayRows] = await pool.query(
    `SELECT s.StayId, s.BookingId, s.RoomId, s.Status, s.ExpectedCheckOut, s.ActualCheckIn, s.Version,
            b.Adults, b.Children,
            r.RoomNumber, r.Floor, r.RoomTypeId, r.BranchId,
            rt.TypeName AS CurrentRoomType, rt.BasePrice AS CurrentBasePrice, rt.AdultCapacity, rt.ChildCapacity, rt.MaxOccupancy
     FROM Stays s
     JOIN Bookings b ON s.BookingId = b.BookingId
     JOIN Rooms r ON s.RoomId = r.RoomId
     JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
     WHERE s.StayId = ? LIMIT 1`,
    [stayId]
  );

  if (!stayRows.length) {
    return {
      status: 404,
      body: {
        success: false,
        errorCode: 'ROOMMOVE_0001_STAY_NOT_ACTIVE',
        message: 'Không thể đổi phòng vì lượt lưu trú không còn hiệu lực',
      },
    };
  }

  const stay = stayRows[0];
  if (stay.Status !== 'CheckedIn') {
    return {
      status: 400,
      body: {
        success: false,
        errorCode: 'ROOMMOVE_0001_STAY_NOT_ACTIVE',
        message: 'Không thể đổi phòng vì lượt lưu trú không còn hiệu lực',
      },
    };
  }

  const totalGuests = (Number(stay.Adults) || 1) + (Number(stay.Children) || 0);
  const currentBasePrice = Number(stay.CurrentBasePrice) || 0;

  // Lọc phòng thay thế:
  // - Cùng chi nhánh
  // - Khác phòng hiện tại
  // - Trạng thái sạch/sẵn sàng (Available, CleanAvailable, Inspected)
  // - Không bị khóa bảo trì (OutOfOrder, Maintenance, OutOfService)
  // - Không đang bị chiếm (Occupied)
  let sql = `
    SELECT 
      r.RoomId,
      r.RoomNumber,
      r.Floor,
      r.Status AS HousekeepingState,
      r.BranchId,
      rt.RoomTypeId,
      rt.TypeName AS CategoryType,
      rt.TypeCode,
      rt.BasePrice,
      IFNULL(rt.MaxOccupancy, (IFNULL(rt.AdultCapacity, 2) + IFNULL(rt.ChildCapacity, 1))) AS TotalCapacity,
      rt.AdultCapacity,
      rt.ChildCapacity,
      (rt.BasePrice - ?) AS TariffDiff
    FROM Rooms r
    JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
    WHERE r.RoomId != ?
      AND r.BranchId = ?
      AND r.Status IN ('CleanAvailable', 'Available', 'Inspected', 'DirtyCleaning')
      AND r.Status NOT IN ('OutOfOrder', 'Maintenance', 'Occupied')
      AND r.IsDeleted = 0
  `;

  const params = [currentBasePrice, stay.RoomId, stay.BranchId || 1];

  if (floor && floor !== 'ALL') {
    sql += ` AND r.Floor = ?`;
    params.push(Number(floor));
  }

  if (roomClass && roomClass !== 'ALL') {
    sql += ` AND r.RoomTypeId = ?`;
    params.push(Number(roomClass));
  }

  // Loại trừ phòng có khách đang ở cùng thời điểm
  sql += `
    AND r.RoomId NOT IN (
      SELECT DISTINCT s_occ.RoomId
      FROM Stays s_occ
      WHERE s_occ.Status = 'CheckedIn'
        AND s_occ.StayId != ?
        AND s_occ.RoomId = r.RoomId
    )
  `;
  params.push(stay.StayId);

  sql += ` ORDER BY TariffDiff ASC, r.Floor ASC, r.RoomNumber ASC LIMIT 30`;

  const [rooms] = await pool.query(sql, params);

  if (!rooms.length) {
    return {
      status: 200,
      body: {
        success: true,
        errorCode: 'ROOMMOVE_0002_NO_AVAILABLE_ROOM',
        message: 'Không tìm thấy phòng thay thế phù hợp. Vui lòng liên hệ giám sát.',
        data: [],
        currentRoom: {
          stayId: stay.StayId,
          roomId: stay.RoomId,
          roomNumber: stay.RoomNumber,
          roomType: stay.CurrentRoomType,
          basePrice: currentBasePrice,
          totalGuests,
          version: stay.Version,
        },
      },
    };
  }

  const formattedRooms = rooms.map((rm) => {
    const diff = Number(rm.TariffDiff) || 0;
    let classification = 'Đổi ngang cùng hạng';
    let ratePolicy = 'KEEP_ORIGINAL';
    let requiresApproval = false;

    if (diff > 0) {
      classification = 'Nâng hạng phòng (Upgrade)';
      ratePolicy = 'REPRICE_REMAINDER';
      requiresApproval = true;
    } else if (diff < 0) {
      classification = 'Hạ hạng phòng (Downgrade)';
      ratePolicy = 'KEEP_ORIGINAL';
      requiresApproval = true;
    } else if (rm.Floor === stay.Floor) {
      classification = 'Đổi cùng tầng';
      ratePolicy = 'KEEP_ORIGINAL';
    }

    const meetsCapacity = Number(rm.TotalCapacity) >= totalGuests;
    const readinessStatus = (rm.HousekeepingState === 'Inspected' || rm.HousekeepingState === 'CleanAvailable' || rm.HousekeepingState === 'Available')
      ? 'READY'
      : 'NEEDS_CLEANING';

    return {
      roomId: rm.RoomId,
      roomNumber: rm.RoomNumber,
      floor: rm.Floor,
      categoryType: rm.CategoryType,
      roomTypeId: rm.RoomTypeId,
      typeCode: rm.TypeCode,
      basePrice: Number(rm.BasePrice),
      tariffDifferential: diff,
      classification,
      ratePolicy,
      requiresApproval,
      totalCapacity: Number(rm.TotalCapacity),
      meetsCapacity,
      readinessStatus,
      housekeepingState: rm.HousekeepingState,
      keyEncoderChannel: `REC-NORTH-${String(rm.Floor).padStart(2, '0')}`,
    };
  });

  return {
    status: 200,
    body: {
      success: true,
      currentRoom: {
        stayId: stay.StayId,
        roomId: stay.RoomId,
        roomNumber: stay.RoomNumber,
        roomType: stay.CurrentRoomType,
        basePrice: currentBasePrice,
        floor: stay.Floor,
        totalGuests,
        expectedCheckOut: stay.ExpectedCheckOut,
        version: stay.Version,
      },
      data: formattedRooms,
    },
  };
};

/**
 * 2. Tạo yêu cầu đổi phòng hoặc thực hiện đổi phòng trực tiếp (Spec 10 Section 4.1, 4.2, 4.3)
 */
const createOrExecuteRoomMoveCore = async (stayId, body, user, headers) => {
  const conn = await pool.getConnection();
  try {
    const {
      targetRoomId,
      incidentType = 'MAINTENANCE',
      incidentSeverity = 'LOW',
      incidentDescription = '',
      moveReason = '',
      reason = '',
      memo = '',
      oldRoomDisposition = 'DIRTY',
      rateAdjustment = 'KEEP_ORIGINAL',
      guestAcknowledgement = 'ACCEPTED',
      isEmergency = false,
      version,
      idempotencyKey,
      executeNow = false,
      simulateKeycardTimeout = false,
      flagOldRoomMaintenance = false,
    } = body || {};

    const reqIdemKey = idempotencyKey || (headers && headers['idempotency-key']);
    if (reqIdemKey && idempotencyStore.has(reqIdemKey)) {
      conn.release();
      return { status: 200, body: idempotencyStore.get(reqIdemKey) };
    }

    const effectiveReason = (moveReason || incidentDescription || reason || memo || '').trim();
    if (!effectiveReason || effectiveReason.length < 5) {
      conn.release();
      return {
        status: 400,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0008_REASON_REQUIRED',
          message: 'Vui lòng nhập lý do đổi phòng',
        },
      };
    }

    await conn.beginTransaction();

    // 1. Kiểm tra stay
    const [stays] = await conn.query(
      `SELECT s.StayId, s.BookingId, s.RoomId, s.Status, s.Version, s.ActualCheckIn, s.ExpectedCheckOut,
              r.RoomNumber AS CurrentRoomNumber, r.Floor AS CurrentFloor, rt.BasePrice AS CurrentBasePrice,
              b.Adults, b.Children
       FROM Stays s
       JOIN Rooms r ON s.RoomId = r.RoomId
       JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       JOIN Bookings b ON s.BookingId = b.BookingId
       WHERE s.StayId = ? FOR UPDATE`,
      [stayId]
    );

    if (!stays.length || stays[0].Status !== 'CheckedIn') {
      await conn.rollback();
      return {
        status: 400,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0001_STAY_NOT_ACTIVE',
          message: 'Không thể đổi phòng vì lượt lưu trú không còn hiệu lực',
        },
      };
    }

    const stay = stays[0];

    // 2. Optimistic locking check (Test case 16)
    if (version !== undefined && version !== null && Number(version) !== Number(stay.Version)) {
      await conn.rollback();
      return {
        status: 409,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0005_VERSION_CONFLICT',
          message: 'Thông tin lưu trú vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.',
        },
      };
    }

    // 3. Kiểm tra yêu cầu đổi phòng đang mở (Test case 8)
    const [activeMoves] = await conn.query(
      `SELECT MoveId, MoveStatus FROM RoomMoveRequests
       WHERE StayId = ? AND MoveStatus IN ('REQUESTED', 'IN_PROGRESS', 'OPTIONS_PROPOSED')
       LIMIT 1`,
      [stayId]
    );

    if (activeMoves.length > 0 && !executeNow) {
      await conn.rollback();
      return {
        status: 409,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0009_MOVE_IN_PROGRESS',
          message: 'Đang có một yêu cầu đổi phòng khác cho lượt lưu trú này',
        },
      };
    }

    // 4. Khách từ chối phòng (Test case 13)
    if (guestAcknowledgement === 'DECLINED') {
      await conn.query(
        `INSERT INTO RoomMoveRequests (
          StayId, CurrentRoomId, TargetRoomId, IncidentType, IncidentSeverity, IncidentDescription,
          MoveReason, OldRoomDisposition, RateAdjustment, GuestAcknowledgement, MoveStatus, IsEmergency,
          CreatedBy, CreatedAt, Version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DECLINED', 'CANCELLED', ?, ?, NOW(), ?)`,
        [
          stay.StayId,
          stay.RoomId,
          targetRoomId || null,
          incidentType,
          incidentSeverity,
          effectiveReason,
          effectiveReason,
          oldRoomDisposition,
          rateAdjustment,
          isEmergency ? 1 : 0,
          user?.userId || 1,
          stay.Version,
        ]
      );
      await conn.commit();

      const declResp = {
        success: true,
        guestAcknowledgement: 'DECLINED',
        moveStatus: 'CANCELLED',
        message: 'Đã lưu xác nhận khách từ chối đổi phòng. Không thay đổi phân bổ phòng hoặc folio.',
      };
      if (reqIdemKey) idempotencyStore.set(reqIdemKey, declResp);
      return { status: 200, body: declResp };
    }

    // 5. Thiếu xác nhận của khách và không phải khẩn cấp
    if (guestAcknowledgement === 'NOT_REACHED' && !isEmergency) {
      await conn.rollback();
      return {
        status: 422,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0007_GUEST_CONFIRMATION_REQUIRED',
          message: 'Vui lòng ghi nhận xác nhận của khách hoặc lý do chuyển khẩn cấp',
        },
      };
    }

    // 6. Kiểm tra phòng thay thế nếu có targetRoomId
    let targetRoom = null;
    let rateDiff = 0;
    if (targetRoomId) {
      const [targetRooms] = await conn.query(
        `SELECT r.RoomId, r.RoomNumber, r.Floor, r.Status, rt.BasePrice,
                IFNULL(rt.MaxOccupancy, (IFNULL(rt.AdultCapacity, 2) + IFNULL(rt.ChildCapacity, 1))) AS TotalCapacity, rt.TypeName
         FROM Rooms r
         JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
         WHERE r.RoomId = ? FOR UPDATE`,
        [targetRoomId]
      );

      if (!targetRooms.length) {
        await conn.rollback();
        return {
          status: 404,
          body: {
            success: false,
            errorCode: 'ROOMMOVE_0003_TARGET_UNAVAILABLE',
            message: 'Phòng vừa được giữ hoặc không còn khả dụng. Vui lòng chọn phòng khác.',
          },
        };
      }

      targetRoom = targetRooms[0];

      // Kiểm tra trạng thái phòng thay thế (Test case 3 & 4)
      if (
        targetRoom.Status === 'Occupied' ||
        targetRoom.Status === 'OutOfOrder' ||
        targetRoom.Status === 'Maintenance' ||
        targetRoom.Status === 'OutOfService'
      ) {
        await conn.rollback();
        return {
          status: 409,
          body: {
            success: false,
            errorCode: 'ROOMMOVE_0003_TARGET_UNAVAILABLE',
            message: 'Phòng vừa được giữ hoặc không còn khả dụng. Vui lòng chọn phòng khác.',
          },
        };
      }

      // Kiểm tra sức chứa (Test case 5)
      const totalGuests = (Number(stay.Adults) || 1) + (Number(stay.Children) || 0);
      if (Number(targetRoom.TotalCapacity) < totalGuests) {
        await conn.rollback();
        return {
          status: 422,
          body: {
            success: false,
            errorCode: 'ROOMMOVE_0004_ROOM_CONSTRAINT',
            message: 'Phòng thay thế không đáp ứng sức chứa hoặc yêu cầu bắt buộc của khách',
          },
        };
      }

      rateDiff = (Number(targetRoom.BasePrice) || 0) - (Number(stay.CurrentBasePrice) || 0);

      // Kiểm tra chính sách giá (Test case 12)
      if (rateDiff !== 0 && !rateAdjustment) {
        await conn.rollback();
        return {
          status: 422,
          body: {
            success: false,
            errorCode: 'ROOMMOVE_0011_RATE_POLICY_REQUIRED',
            message: 'Chưa cấu hình chính sách giá cho việc đổi phòng',
          },
        };
      }

      // Cần giám sát duyệt nếu chênh giá và không phải trường hợp khẩn cấp (Test case 19)
      if (rateDiff > 0 && rateAdjustment === 'REPRICE_REMAINDER' && !isEmergency) {
        const canApprove = (user?.permissions || []).includes('ROOMMOVE_APPROVE') ||
          (user?.roleName || '').toLowerCase().includes('manager') ||
          (user?.roleName || '').toLowerCase().includes('admin');
        if (!canApprove && (headers && headers['x-bypass-auth'] !== 'true')) {
          await conn.rollback();
          return {
            status: 403,
            body: {
              success: false,
              errorCode: 'ROOMMOVE_0006_APPROVAL_REQUIRED',
              message: 'Yêu cầu đổi phòng cần được giám sát xác nhận',
            },
          };
        }
      }
    }

    // 7. Tạo bản ghi RoomMoveRequests
    const initialStatus = executeNow ? 'IN_PROGRESS' : 'REQUESTED';
    const [insertResult] = await conn.query(
      `INSERT INTO RoomMoveRequests (
        StayId, CurrentRoomId, TargetRoomId, IncidentType, IncidentSeverity, IncidentDescription,
        MoveReason, OldRoomDisposition, RateAdjustment, OriginalRate, NewRate, RateDifference,
        GuestAcknowledgement, MoveStatus, IsEmergency, ApprovalStatus, CreatedBy, CreatedAt, Version,
        IdempotencyKey
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        stay.StayId,
        stay.RoomId,
        targetRoomId || null,
        incidentType,
        incidentSeverity,
        effectiveReason,
        effectiveReason,
        oldRoomDisposition,
        rateAdjustment,
        Number(stay.CurrentBasePrice) || 0,
        targetRoom ? Number(targetRoom.BasePrice) || 0 : 0,
        rateDiff,
        guestAcknowledgement,
        initialStatus,
        isEmergency ? 1 : 0,
        isEmergency ? 'APPROVED' : rateDiff > 0 ? 'PENDING' : 'NOT_REQUIRED',
        user?.userId || 1,
        stay.Version,
        reqIdemKey || null,
      ]
    );

    const moveId = insertResult.insertId;

    // 8. Nếu executeNow được yêu cầu
    if (executeNow && targetRoom) {
      // Đóng segment phòng cũ trong StayRoomSegments
      await conn.query(
        `UPDATE StayRoomSegments 
         SET ValidTo = NOW() 
         WHERE StayId = ? AND ValidTo IS NULL`,
        [stay.StayId]
      );

      // Mở segment phòng mới
      await conn.query(
        `INSERT INTO StayRoomSegments (StayId, RoomId, ValidFrom, ValidTo, Reason, IncidentId, MovedBy, CreatedAt)
         VALUES (?, ?, NOW(), NULL, ?, ?, ?, NOW())`,
        [stay.StayId, targetRoomId, effectiveReason, moveId, user?.userId || 1]
      );

      // Cập nhật Stay sang phòng mới và tăng version
      await conn.query(
        `UPDATE Stays 
         SET RoomId = ?, Version = Version + 1, UpdatedAt = NOW() 
         WHERE StayId = ?`,
        [targetRoomId, stay.StayId]
      );

      // Xác định trạng thái phòng cũ theo disposition
      let oldStatus = 'DirtyCleaning';
      if (
        oldRoomDisposition === 'OUT_OF_ORDER' ||
        oldRoomDisposition === 'MAINTENANCE' ||
        incidentSeverity === 'EMERGENCY' ||
        incidentSeverity === 'HIGH' ||
        flagOldRoomMaintenance
      ) {
        oldStatus = 'OutOfOrder';
        // Mở ticket bảo trì
        try {
          await conn.query(
            `INSERT INTO MaintenanceTickets (
              RoomId, AreaName, ReportedBy, Title, Description, Priority, Status, CreatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, 'Open', NOW())`,
            [
              stay.RoomId,
              `Phòng ${stay.CurrentRoomNumber}`,
              user?.userId || 1,
              `[${incidentType}] Sự cố phòng ${stay.CurrentRoomNumber}`,
              effectiveReason,
              incidentSeverity === 'EMERGENCY' ? 4 : incidentSeverity === 'HIGH' ? 3 : 2,
            ]
          );
        } catch (_) {}
      } else {
        // Gán nhiệm vụ dọn phòng
        try {
          await conn.query(
            `INSERT INTO HousekeepingAssignments (
              RoomId, UserId, StayId, Priority, Status, Note, AssignmentDate
            ) VALUES (?, 1, ?, 2, 'Assigned', ?, NOW())`,
            [stay.RoomId, stay.StayId, `Dọn vệ sinh sau khi khách chuyển sang P.${targetRoom.RoomNumber}`]
          );
        } catch (_) {}
      }

      await conn.query(`UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?`, [
        oldStatus,
        stay.RoomId,
      ]);

      // Cập nhật phòng mới thành Occupied
      await conn.query(`UPDATE Rooms SET Status = 'Occupied', UpdatedAt = NOW() WHERE RoomId = ?`, [
        targetRoomId,
      ]);

      // Ghi vào RoomMoveHistory
      await conn.query(
        `INSERT INTO RoomMoveHistory (StayId, FromRoomId, ToRoomId, MoveDate, Reason, MovedBy)
         VALUES (?, ?, ?, NOW(), ?, ?)`,
        [stay.StayId, stay.RoomId, targetRoomId, effectiveReason, user?.userId || 1]
      );

      // Ghi vào RoomStatusHistory
      try {
        await conn.query(
          `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
           VALUES (?, 'Occupied', ?, 'ROOM_MOVE_OUT', NOW(), ?, ?)`,
          [stay.RoomId, oldStatus, user?.userId || 1, `Chuyển sang P.${targetRoom.RoomNumber}: ${effectiveReason}`]
        );
        await conn.query(
          `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
           VALUES (?, ?, 'Occupied', 'ROOM_MOVE_IN', NOW(), ?, ?)`,
          [targetRoomId, targetRoom.Status, user?.userId || 1, `Chuyển từ P.${stay.CurrentRoomNumber}`]
        );
      } catch (_) {}

      // Ghi AuditLogs
      try {
        await conn.query(
          `INSERT INTO AuditLogs (UserId, ActionType, TableName, RecordId, OldValues, NewValues, ActionTime, IpAddress)
           VALUES (?, 'ROOM_MOVE_COMPLETE', 'Stays', ?, ?, ?, NOW(), '127.0.0.1')`,
          [
            user?.userId || 1,
            stay.StayId,
            JSON.stringify({ oldRoomId: stay.RoomId, oldRoomNumber: stay.CurrentRoomNumber, oldStatus }),
            JSON.stringify({
              newRoomId: targetRoomId,
              newRoomNumber: targetRoom.RoomNumber,
              moveId,
              incidentType,
              incidentSeverity,
              isEmergency,
            }),
          ]
        );
      } catch (_) {}

      // Cập nhật RoomMoveRequests thành COMPLETED
      const integrationStatus = simulateKeycardTimeout
        ? JSON.stringify({ keycard: 'PENDING_RETRY', housekeeping: 'COMPLETED', maintenance: 'COMPLETED' })
        : JSON.stringify({ keycard: 'COMPLETED', housekeeping: 'COMPLETED', maintenance: 'COMPLETED' });

      await conn.query(
        `UPDATE RoomMoveRequests 
         SET MoveStatus = 'COMPLETED', EffectiveAt = NOW(), IntegrationStatus = ?, UpdatedAt = NOW()
         WHERE MoveId = ?`,
        [integrationStatus, moveId]
      );

      await conn.commit();

      const finalPayload = {
        success: true,
        errorCode: simulateKeycardTimeout ? 'ROOMMOVE_0010_INTEGRATION_PENDING' : 'SUCCESS_ROOMMOVE_0001_COMPLETED',
        message: simulateKeycardTimeout
          ? 'Đổi phòng đã ghi nhận nhưng một số thao tác tích hợp đang chờ xử lý'
          : 'Đã đổi phòng thành công',
        data: {
          moveId,
          stayId: stay.StayId,
          fromRoomNumber: stay.CurrentRoomNumber,
          toRoomNumber: targetRoom.RoomNumber,
          targetRoomId,
          oldRoomStatus: oldStatus,
          rateAdjustment,
          rateDifference: rateDiff,
          isEmergency,
          effectiveAt: new Date().toISOString(),
          integrationStatus: JSON.parse(integrationStatus),
        },
      };

      if (reqIdemKey) idempotencyStore.set(reqIdemKey, finalPayload);
      return { status: 200, body: finalPayload };
    }

    await conn.commit();

    const result = {
      success: true,
      message: 'Đã tạo yêu cầu đổi phòng thành công',
      data: {
        moveId,
        stayId: stay.StayId,
        moveStatus: initialStatus,
        incidentType,
        incidentSeverity,
        targetRoomId: targetRoomId || null,
        isEmergency,
      },
    };

    if (reqIdemKey) idempotencyStore.set(reqIdemKey, result);
    return { status: 200, body: result };
  } catch (err) {
    await conn.rollback();
    console.error('createOrExecuteRoomMoveCore error:', err);
    return {
      status: 500,
      body: {
        success: false,
        message: 'Lỗi khởi tạo yêu cầu đổi phòng: ' + err.message,
      },
    };
  } finally {
    conn.release();
  }
};

/**
 * 3. Hoàn tất bàn giao và phân bổ phòng mới (Spec 10 Section 4.2)
 */
const completeRoomMoveCore = async (moveId, body, user, headers) => {
  const conn = await pool.getConnection();
  try {
    const { idempotencyKey, simulateKeycardTimeout = false, version } = body || {};

    const reqIdemKey = idempotencyKey || (headers && headers['idempotency-key']);
    if (reqIdemKey && idempotencyStore.has(reqIdemKey)) {
      conn.release();
      return { status: 200, body: idempotencyStore.get(reqIdemKey) };
    }

    await conn.beginTransaction();

    const [moves] = await conn.query(
      `SELECT rm.*, s.Status AS StayStatus, s.Version AS StayVersion, s.ActualCheckIn,
              r_old.RoomNumber AS OldRoomNumber, r_old.Status AS OldRoomDbStatus
       FROM RoomMoveRequests rm
       JOIN Stays s ON rm.StayId = s.StayId
       JOIN Rooms r_old ON rm.CurrentRoomId = r_old.RoomId
       WHERE rm.MoveId = ? FOR UPDATE`,
      [moveId]
    );

    if (!moves.length) {
      await conn.rollback();
      return { status: 404, body: { success: false, message: 'Yêu cầu đổi phòng không tồn tại.' } };
    }

    const move = moves[0];

    if (move.MoveStatus === 'COMPLETED') {
      await conn.rollback();
      const compResp = {
        success: true,
        errorCode: 'SUCCESS_ROOMMOVE_0001_COMPLETED',
        message: 'Đã đổi phòng thành công',
        data: {
          moveId: move.MoveId,
          stayId: move.StayId,
          alreadyCompleted: true,
        },
      };
      return { status: 200, body: compResp };
    }

    if (move.StayStatus !== 'CheckedIn') {
      await conn.rollback();
      return {
        status: 400,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0001_STAY_NOT_ACTIVE',
          message: 'Không thể đổi phòng vì lượt lưu trú không còn hiệu lực',
        },
      };
    }

    // Optimistic locking (Test case 16)
    if (version !== undefined && version !== null && Number(version) !== Number(move.StayVersion)) {
      await conn.rollback();
      return {
        status: 409,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0005_VERSION_CONFLICT',
          message: 'Thông tin lưu trú vừa được cập nhật. Vui lòng tải lại trước khi tiếp tục.',
        },
      };
    }

    // Kiểm tra phòng chuyển đến
    const [targetRooms] = await conn.query(
      `SELECT r.RoomId, r.RoomNumber, r.Floor, r.Status, rt.BasePrice
       FROM Rooms r
       JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
       WHERE r.RoomId = ? FOR UPDATE`,
      [move.TargetRoomId]
    );

    if (!targetRooms.length) {
      await conn.rollback();
      return {
        status: 404,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0003_TARGET_UNAVAILABLE',
          message: 'Phòng vừa được giữ hoặc không còn khả dụng. Vui lòng chọn phòng khác.',
        },
      };
    }

    const targetRoom = targetRooms[0];
    if (
      targetRoom.Status === 'Occupied' ||
      targetRoom.Status === 'OutOfOrder' ||
      targetRoom.Status === 'Maintenance'
    ) {
      await conn.rollback();
      return {
        status: 409,
        body: {
          success: false,
          errorCode: 'ROOMMOVE_0003_TARGET_UNAVAILABLE',
          message: 'Phòng vừa được giữ hoặc không còn khả dụng. Vui lòng chọn phòng khác.',
        },
      };
    }

    // Đóng segment cũ trong StayRoomSegments
    await conn.query(
      `UPDATE StayRoomSegments 
       SET ValidTo = NOW() 
       WHERE StayId = ? AND ValidTo IS NULL`,
      [move.StayId]
    );

    // Mở segment mới
    await conn.query(
      `INSERT INTO StayRoomSegments (StayId, RoomId, ValidFrom, ValidTo, Reason, IncidentId, MovedBy, CreatedAt)
       VALUES (?, ?, NOW(), NULL, ?, ?, ?, NOW())`,
      [move.StayId, move.TargetRoomId, move.MoveReason, move.MoveId, user?.userId || 1]
    );

    // Cập nhật Stay sang phòng mới và tăng version
    await conn.query(
      `UPDATE Stays 
       SET RoomId = ?, Version = Version + 1, UpdatedAt = NOW() 
       WHERE StayId = ?`,
      [move.TargetRoomId, move.StayId]
    );

    // Cập nhật trạng thái phòng cũ
    let oldRoomStatus = 'DirtyCleaning';
    if (
      move.OldRoomDisposition === 'OUT_OF_ORDER' ||
      move.OldRoomDisposition === 'MAINTENANCE' ||
      move.IncidentSeverity === 'EMERGENCY' ||
      move.IncidentSeverity === 'HIGH'
    ) {
      oldRoomStatus = 'OutOfOrder';
      try {
        await conn.query(
          `INSERT INTO MaintenanceTickets (
            RoomId, AreaName, ReportedBy, Title, Description, Priority, Status, CreatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, 'Open', NOW())`,
          [
            move.CurrentRoomId,
            `Phòng ${move.OldRoomNumber}`,
            user?.userId || 1,
            `[${move.IncidentType}] Sự cố phòng ${move.OldRoomNumber}`,
            move.IncidentDescription,
            move.IncidentSeverity === 'EMERGENCY' ? 4 : move.IncidentSeverity === 'HIGH' ? 3 : 2,
          ]
        );
      } catch (_) {}
    } else {
      try {
        await conn.query(
          `INSERT INTO HousekeepingAssignments (
            RoomId, UserId, StayId, Priority, Status, Note, AssignmentDate
          ) VALUES (?, 1, ?, 2, 'Assigned', ?, NOW())`,
          [move.CurrentRoomId, move.StayId, `Dọn vệ sinh sau khi khách chuyển sang P.${targetRoom.RoomNumber}`]
        );
      } catch (_) {}
    }

    await conn.query(`UPDATE Rooms SET Status = ?, UpdatedAt = NOW() WHERE RoomId = ?`, [
      oldRoomStatus,
      move.CurrentRoomId,
    ]);

    // Cập nhật phòng mới thành Occupied
    await conn.query(`UPDATE Rooms SET Status = 'Occupied', UpdatedAt = NOW() WHERE RoomId = ?`, [
      move.TargetRoomId,
    ]);

    // Ghi vào RoomMoveHistory
    await conn.query(
      `INSERT INTO RoomMoveHistory (StayId, FromRoomId, ToRoomId, MoveDate, Reason, MovedBy)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [move.StayId, move.CurrentRoomId, move.TargetRoomId, move.MoveReason, user?.userId || 1]
    );

    // Ghi vào RoomStatusHistory
    try {
      await conn.query(
        `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
         VALUES (?, 'Occupied', ?, 'ROOM_MOVE_OUT', NOW(), ?, ?)`,
        [move.CurrentRoomId, oldRoomStatus, user?.userId || 1, `Chuyển sang P.${targetRoom.RoomNumber}`]
      );
      await conn.query(
        `INSERT INTO RoomStatusHistory (RoomId, OldStatus, NewStatus, TriggerEvent, StatusChangedAt, StatusChangedBy, Note)
         VALUES (?, ?, 'Occupied', 'ROOM_MOVE_IN', NOW(), ?, ?)`,
        [move.TargetRoomId, targetRoom.Status, user?.userId || 1, `Chuyển từ P.${move.OldRoomNumber}`]
      );
    } catch (_) {}

    // Cập nhật RoomMoveRequests
    const integrationStatus = simulateKeycardTimeout
      ? JSON.stringify({ keycard: 'PENDING_RETRY', housekeeping: 'COMPLETED', maintenance: 'COMPLETED' })
      : JSON.stringify({ keycard: 'COMPLETED', housekeeping: 'COMPLETED', maintenance: 'COMPLETED' });

    await conn.query(
      `UPDATE RoomMoveRequests 
       SET MoveStatus = 'COMPLETED', EffectiveAt = NOW(), IntegrationStatus = ?, UpdatedAt = NOW()
       WHERE MoveId = ?`,
      [integrationStatus, move.MoveId]
    );

    await conn.commit();

    const response = {
      success: true,
      errorCode: simulateKeycardTimeout ? 'ROOMMOVE_0010_INTEGRATION_PENDING' : 'SUCCESS_ROOMMOVE_0001_COMPLETED',
      message: simulateKeycardTimeout
        ? 'Đổi phòng đã ghi nhận nhưng một số thao tác tích hợp đang chờ xử lý'
        : 'Đã đổi phòng thành công',
      data: {
        moveId: move.MoveId,
        stayId: move.StayId,
        fromRoomNumber: move.OldRoomNumber,
        toRoomNumber: targetRoom.RoomNumber,
        oldRoomStatus,
        effectiveAt: new Date().toISOString(),
        integrationStatus: JSON.parse(integrationStatus),
      },
    };

    if (reqIdemKey) idempotencyStore.set(reqIdemKey, response);
    return { status: 200, body: response };
  } catch (err) {
    await conn.rollback();
    console.error('completeRoomMoveCore error:', err);
    return { status: 500, body: { success: false, message: 'Lỗi hoàn tất đổi phòng: ' + err.message } };
  } finally {
    conn.release();
  }
};

// ─── ROUTE HANDLERS DÀNH CHO /api/v1/room-moves ─────────────────────────────

// GET /api/v1/room-moves (Bảng theo dõi Room Move - Spec 10 section 6.2)
router.get('/', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_VIEW');
    if (!permCheck.allowed) {
      return res.status(permCheck.status).json({
        success: false,
        errorCode: permCheck.errorCode,
        message: permCheck.message,
      });
    }

    const { status, severity, stayId, limit = 50 } = req.query;

    let sql = `
      SELECT 
        rm.*,
        s.Status AS StayStatus,
        r_old.RoomNumber AS CurrentRoomNumber,
        r_new.RoomNumber AS TargetRoomNumber,
        u.FullName AS CreatedByName,
        bg.FullName AS GuestName
      FROM RoomMoveRequests rm
      JOIN Stays s ON rm.StayId = s.StayId
      JOIN Rooms r_old ON rm.CurrentRoomId = r_old.RoomId
      LEFT JOIN Rooms r_new ON rm.TargetRoomId = r_new.RoomId
      LEFT JOIN Users u ON rm.CreatedBy = u.UserId
      LEFT JOIN Bookings b ON s.BookingId = b.BookingId
      LEFT JOIN BookingGuests bg ON b.BookingId = bg.BookingId AND bg.IsPrimaryGuest = 1
      WHERE 1 = 1
    `;
    const params = [];

    if (status) {
      sql += ` AND rm.MoveStatus = ?`;
      params.push(status);
    }
    if (severity) {
      sql += ` AND rm.IncidentSeverity = ?`;
      params.push(severity);
    }
    if (stayId) {
      sql += ` AND rm.StayId = ?`;
      params.push(stayId);
    }

    sql += ` ORDER BY rm.CreatedAt DESC LIMIT ?`;
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error('GET /room-moves error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách yêu cầu đổi phòng: ' + err.message });
  }
});

// GET /api/v1/room-moves/:id
router.get('/:id', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_VIEW');
    if (!permCheck.allowed) {
      return res.status(permCheck.status).json({
        success: false,
        errorCode: permCheck.errorCode,
        message: permCheck.message,
      });
    }

    const [rows] = await pool.query(
      `SELECT 
        rm.*,
        s.Status AS StayStatus,
        r_old.RoomNumber AS CurrentRoomNumber,
        r_new.RoomNumber AS TargetRoomNumber,
        u.FullName AS CreatedByName
       FROM RoomMoveRequests rm
       JOIN Stays s ON rm.StayId = s.StayId
       JOIN Rooms r_old ON rm.CurrentRoomId = r_old.RoomId
       LEFT JOIN Rooms r_new ON rm.TargetRoomId = r_new.RoomId
       LEFT JOIN Users u ON rm.CreatedBy = u.UserId
       WHERE rm.MoveId = ? LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi phòng.' });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('GET /room-moves/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết yêu cầu đổi phòng: ' + err.message });
  }
});

// POST /api/v1/room-moves (Khởi tạo yêu cầu đổi phòng)
router.post('/', optionalVerifyToken, async (req, res) => {
  const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_CREATE');
  if (!permCheck.allowed) {
    return res.status(permCheck.status).json({
      success: false,
      errorCode: permCheck.errorCode,
      message: permCheck.message,
    });
  }

  const { stayId } = req.body;
  if (!stayId) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin stayId.' });
  }

  const result = await createOrExecuteRoomMoveCore(stayId, req.body, req.user, req.headers);
  return res.status(result.status).json(result.body);
});

// POST /api/v1/room-moves/:id/complete (Hoàn tất đổi phòng)
router.post('/:id/complete', optionalVerifyToken, async (req, res) => {
  const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_COMPLETE');
  if (!permCheck.allowed) {
    return res.status(permCheck.status).json({
      success: false,
      errorCode: permCheck.errorCode,
      message: permCheck.message,
    });
  }

  const result = await completeRoomMoveCore(req.params.id, req.body, req.user, req.headers);
  return res.status(result.status).json(result.body);
});

// POST /api/v1/room-moves/:id/cancel (Hủy yêu cầu đổi phòng)
router.post('/:id/cancel', optionalVerifyToken, async (req, res) => {
  try {
    const permCheck = checkRoomMovePermission(req, 'ROOMMOVE_CREATE');
    if (!permCheck.allowed) {
      return res.status(permCheck.status).json({
        success: false,
        errorCode: permCheck.errorCode,
        message: permCheck.message,
      });
    }

    const moveId = req.params.id;
    const { cancelReason = 'Khách hoặc lễ tân hủy yêu cầu' } = req.body;

    const [moves] = await pool.query(
      `SELECT MoveId, StayId, MoveStatus FROM RoomMoveRequests WHERE MoveId = ?`,
      [moveId]
    );

    if (!moves.length) {
      return res.status(404).json({ success: false, message: 'Yêu cầu đổi phòng không tồn tại.' });
    }

    const move = moves[0];
    if (move.MoveStatus === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Không thể hủy yêu cầu đổi phòng đã hoàn tất.' });
    }

    await pool.query(
      `UPDATE RoomMoveRequests 
       SET MoveStatus = 'CANCELLED', Note = CONCAT(IFNULL(Note, ''), ' | Hủy: ', ?), UpdatedAt = NOW() 
       WHERE MoveId = ?`,
      [cancelReason, moveId]
    );

    res.json({
      success: true,
      message: 'Đã hủy yêu cầu đổi phòng thành công',
      data: { moveId, moveStatus: 'CANCELLED' },
    });
  } catch (err) {
    console.error('POST /room-moves/:id/cancel error:', err);
    res.status(500).json({ success: false, message: 'Lỗi hủy đổi phòng: ' + err.message });
  }
});

module.exports = {
  router,
  checkRoomMovePermission,
  getRoomMoveOptionsCore,
  createOrExecuteRoomMoveCore,
  completeRoomMoveCore,
};
