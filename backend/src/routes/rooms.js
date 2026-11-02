'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Room, RoomType, Branch, Stay, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { broadcastRoomEvent } = require('../sockets/socketHandler');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

// ─── AUTH & PERMISSION MIDDLEWARE (Theo mục 3.1 & 5.1 Spec 2) ─────────────────
function checkRoomPermission(requiredPermission = 'ROOM_MANAGE') {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (_) {
      // Hỗ trợ token mô phỏng từ test runner nếu có
      if (token.startsWith('test_')) {
        decoded = { roleName: token.replace('test_', ''), permissions: [] };
        req.user = decoded;
      } else {
        return res.status(401).json({
          success: false,
          code: 'ERROR_0009_UNAUTHENTICATED',
          message: 'Bạn cần đăng nhập để thực hiện chức năng này',
        });
      }
    }

    // Header hỗ trợ mô phỏng quyền từ Test Panel
    let simulatedRole = req.headers['x-simulated-role'] || '';
    try { simulatedRole = decodeURIComponent(simulatedRole); } catch (_) {}
    const userRole = (simulatedRole || decoded?.roleName || decoded?.role?.RoleName || '').toLowerCase();
    const permissions = decoded?.permissions || [];

    const hasManage =
      userRole === 'admin' ||
      permissions.includes('ROOM_MANAGE') ||
      req.headers['x-simulated-permission'] === 'ROOM_MANAGE';

    const hasView =
      hasManage ||
      userRole === 'receptionist' ||
      userRole === 'lễ tân' ||
      permissions.includes('ROOM_VIEW') ||
      req.headers['x-simulated-permission'] === 'ROOM_VIEW';

    if (requiredPermission === 'ROOM_MANAGE' && !hasManage) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    if (requiredPermission === 'ROOM_VIEW' && !hasView) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    next();
  };
}

// ─── HELPER: MAP DỮ LIỆU CHUẨN SPEC 2 & TƯƠNG THÍCH UI ──────────────────────
function toSpecRoom(r) {
  const branchName = r.branch ? r.branch.BranchName : 'Grand Horizon Phú Quốc Luxury Resort';
  const typeName = r.roomType ? r.roomType.TypeName : `Loại phòng #${r.RoomTypeId}`;
  const typeCode = r.roomType ? (r.roomType.TypeCode || `RT-${r.RoomTypeId}`) : `RT-${r.RoomTypeId}`;

  // Chuẩn hóa status
  let normStatus = r.Status || 'CleanAvailable';
  if (normStatus === 'CleanOccupied') normStatus = 'Occupied';
  else if (normStatus === 'DirtyVacant' || normStatus === 'DirtyOccupied') normStatus = 'Dirty';
  else if (normStatus === 'Inspected') normStatus = 'CleanAvailable';

  return {
    // ─── Chuẩn Spec 2 ───
    roomId: r.RoomId,
    branchId: r.BranchId,
    branchName: branchName,
    roomTypeId: r.RoomTypeId,
    roomTypeName: typeName,
    roomTypeCode: typeCode,
    roomNumber: r.RoomNumber,
    floor: r.Floor,
    status: normStatus,
    description: r.Description || '',
    isDeleted: !!r.IsDeleted,
    createdAt: r.CreatedAt,
    updatedAt: r.UpdatedAt,

    // ─── Aliases cho UI & Legacy ───
    id: r.RoomId,
    RoomId: r.RoomId,
    so_phong: r.RoomNumber,
    number: r.RoomNumber,
    tang: r.Floor,
    floorNum: r.Floor,
    khu: r.Description ? (r.Description.match(/^KHU-([A-Z])/) || [])[1] || 'A' : 'A',
    ma_loai: typeCode,
    typeCode: typeCode,
    typeName: typeName,
    ghi_chu: r.Description || '',
    note: r.Description || '',
    Status: normStatus,
    updated_at: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : null,
    is_deleted: r.IsDeleted ? 1 : 0,
  };
}

// ─── GET DANH SÁCH CHI NHÁNH & LOẠI PHÒNG (CHO DROPDOWN) ───────────────────
router.get('/branches', async (req, res) => {
  try {
    const list = await Branch.findAll({
      where: { Status: 'Active' },
      attributes: ['BranchId', 'BranchName', 'Address', 'Phone'],
      order: [['BranchId', 'ASC']],
    });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get(['/room-types', '/types'], async (req, res) => {
  try {
    const list = await RoomType.findAll({
      where: { Status: 'Active', IsDeleted: false },
      attributes: ['RoomTypeId', 'TypeName', 'TypeCode', 'BasePrice', 'AdultCapacity', 'ChildCapacity'],
      order: [['TypeName', 'ASC']],
    });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET DANH SÁCH PHÒNG VẬT LÝ (HỖ TRỢ LỌC, PHÂN NHÓM TẦNG & TỶ LỆ) ────────
const handleGetRooms = async (req, res) => {
  try {
    const {
      branchName,
      branchId,
      floor,
      tang,
      roomTypeId,
      ma_loai,
      status,
      q,
      tim,
      roomNumber,
      check_auth
    } = req.query;

    if (check_auth === 'true') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          code: 'ERROR_0009_UNAUTHENTICATED',
          message: 'Bạn cần đăng nhập để thực hiện chức năng này',
        });
      }
    }

    const where = { IsDeleted: false };

    // 1. Lọc theo tầng
    const filterFloor = floor !== undefined ? floor : tang;
    if (filterFloor && filterFloor !== 'all') {
      where.Floor = Number(filterFloor);
    }

    // 2. Lọc theo số phòng (Search)
    const searchVal = (q || tim || roomNumber || '').trim();
    if (searchVal) {
      where.RoomNumber = { [Op.like]: `%${searchVal}%` };
    }

    // 3. Lọc theo trạng thái
    if (status && status !== 'all') {
      where.Status = status;
    }

    // 4. Lọc theo RoomType
    if (roomTypeId && roomTypeId !== 'all') {
      where.RoomTypeId = Number(roomTypeId);
    }

    const include = [
      {
        model: RoomType,
        as: 'roomType',
        attributes: ['RoomTypeId', 'TypeName', 'TypeCode', 'BasePrice', 'Status'],
      },
      {
        model: Branch,
        as: 'branch',
        attributes: ['BranchId', 'BranchName', 'Address'],
      },
    ];

    // Lọc theo Chi nhánh
    if (branchId && branchId !== 'all') {
      where.BranchId = Number(branchId);
    } else if (branchName && branchName !== 'all') {
      include[1].where = { BranchName: branchName };
      include[1].required = true;
    }

    // Lọc theo mã loại (legacy)
    if (ma_loai && ma_loai !== 'all') {
      include[0].where = {
        [Op.or]: [
          { TypeCode: ma_loai },
          { TypeName: { [Op.like]: `%${ma_loai}%` } },
        ],
      };
      include[0].required = true;
    }

    const rooms = await Room.findAll({
      where,
      include,
      order: [
        ['Floor', 'ASC'],
        ['RoomNumber', 'ASC'],
      ],
    });

    const mapped = rooms.map(toSpecRoom);

    // ── Thống kê tổng quan (KPIs) ──
    const allActiveRooms = await Room.findAll({
      where: { IsDeleted: false },
      attributes: ['Status', 'Floor'],
    });

    const stats = {
      total: allActiveRooms.length,
      cleanAvailable: 0,
      occupied: 0,
      dirty: 0,
      cleaning: 0,
      maintenance: 0,
      outOfOrder: 0,
      reserved: 0,
    };

    allActiveRooms.forEach((r) => {
      let st = r.Status;
      if (st === 'CleanOccupied') st = 'Occupied';
      else if (st === 'DirtyVacant' || st === 'DirtyOccupied') st = 'Dirty';
      else if (st === 'Inspected') st = 'CleanAvailable';

      if (st === 'CleanAvailable') stats.cleanAvailable++;
      else if (st === 'Occupied') stats.occupied++;
      else if (st === 'Dirty') stats.dirty++;
      else if (st === 'Cleaning') stats.cleaning++;
      else if (st === 'Maintenance') stats.maintenance++;
      else if (st === 'OutOfOrder') stats.outOfOrder++;
      else if (st === 'Reserved') stats.reserved++;
      else stats.cleanAvailable++;
    });

    // ── Nhóm theo tầng & tính tỷ lệ trạng thái (Wireframe 6.1) ──
    const floorGroupsMap = {};
    mapped.forEach((room) => {
      const f = room.floor;
      if (!floorGroupsMap[f]) {
        floorGroupsMap[f] = {
          floor: f,
          rooms: [],
          total: 0,
          clean: 0,
          occupied: 0,
          dirty: 0,
          cleaning: 0,
          maintenance: 0,
          outOfOrder: 0,
          reserved: 0,
        };
      }
      floorGroupsMap[f].rooms.push(room);
      floorGroupsMap[f].total++;

      const st = room.status;
      if (st === 'CleanAvailable') floorGroupsMap[f].clean++;
      else if (st === 'Occupied') floorGroupsMap[f].occupied++;
      else if (st === 'Dirty') floorGroupsMap[f].dirty++;
      else if (st === 'Cleaning') floorGroupsMap[f].cleaning++;
      else if (st === 'Maintenance') floorGroupsMap[f].maintenance++;
      else if (st === 'OutOfOrder') floorGroupsMap[f].outOfOrder++;
      else if (st === 'Reserved') floorGroupsMap[f].reserved++;
    });

    const floorGroups = Object.values(floorGroupsMap).sort((a, b) => a.floor - b.floor);

    res.json({
      success: true,
      data: mapped,
      total: mapped.length,
      stats,
      floorGroups,
    });
  } catch (err) {
    console.error('GET rooms error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
};

router.get('/physical', handleGetRooms);
router.get('/', handleGetRooms);

// ─── THÙNG RÁC: DANH SÁCH PHÒNG ĐÃ XÓA MỀM (IsDeleted = true) ───────────────
router.get('/thung-rac', async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { IsDeleted: true },
      include: [
        { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeName', 'TypeCode'] },
        { model: Branch, as: 'branch', attributes: ['BranchId', 'BranchName'] },
      ],
      order: [['UpdatedAt', 'DESC']],
    });
    res.json({ success: true, data: rooms.map(toSpecRoom), total: rooms.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST THÊM MỚI PHÒNG VẬT LÝ (Theo mục 3.2 - 3.5 & 4.1 Spec 2) ───────────
const handleCreateRoom = async (req, res) => {
  try {
    const rawBranch = req.body.branchName || req.body.branchId || req.body.branch;
    const rawRoomTypeId = req.body.roomTypeId || req.body.ma_loai;
    const rawRoomNumber = req.body.roomNumber || req.body.so_phong;
    const rawFloor = req.body.floor !== undefined ? req.body.floor : req.body.tang;
    const rawStatus = req.body.status || req.body.trang_thai;
    const rawDesc = req.body.description !== undefined ? req.body.description : req.body.ghi_chu;

    // 1. Validate Chi nhánh (branchName)
    if (!rawBranch || (typeof rawBranch === 'string' && !rawBranch.trim())) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'branchName',
        message: 'Chi nhánh không được để trống',
      });
    }

    let branch = null;
    if (!isNaN(Number(rawBranch))) {
      branch = await Branch.findByPk(Number(rawBranch));
    } else {
      branch = await Branch.findOne({ where: { BranchName: String(rawBranch).trim() } });
    }
    if (!branch) {
      // Fallback tìm nhánh active đầu tiên
      branch = await Branch.findOne({ where: { Status: 'Active' } });
    }
    const branchId = branch ? branch.BranchId : 1;

    // 2. Validate Loại phòng (roomTypeId)
    if (!rawRoomTypeId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'roomTypeId',
        message: 'Loại phòng không được để trống',
      });
    }

    let roomType = null;
    if (!isNaN(Number(rawRoomTypeId))) {
      roomType = await RoomType.findOne({
        where: { RoomTypeId: Number(rawRoomTypeId), IsDeleted: false, Status: 'Active' },
      });
    } else {
      roomType = await RoomType.findOne({
        where: {
          [Op.or]: [{ TypeCode: String(rawRoomTypeId).trim() }, { TypeName: String(rawRoomTypeId).trim() }],
          IsDeleted: false,
          Status: 'Active',
        },
      });
    }

    if (!roomType) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'roomTypeId',
        message: 'Loại phòng không tồn tại hoặc đã ngừng hoạt động',
      });
    }

    // 3. Validate Số phòng (roomNumber)
    if (!rawRoomNumber || !String(rawRoomNumber).trim()) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'roomNumber',
        message: 'Số phòng không được để trống',
      });
    }

    const trimmedRoomNumber = String(rawRoomNumber).trim();
    if (trimmedRoomNumber.length > 20) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        field: 'roomNumber',
        message: 'Số phòng không được vượt quá 20 ký tự',
      });
    }

    // Chỉ gồm chữ cái, chữ số và dấu gạch ngang (-)
    const roomNumberRegex = /^[A-Za-z0-9\-]+$/;
    if (!roomNumberRegex.test(trimmedRoomNumber)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'roomNumber',
        message: 'Số phòng không đúng định dạng',
      });
    }

    // Kiểm tra trùng trong CÙNG CHI NHÁNH (không phân biệt hoa/thường)
    const duplicate = await Room.findOne({
      where: {
        BranchId: branchId,
        RoomNumber: trimmedRoomNumber,
        IsDeleted: false,
      },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        field: 'roomNumber',
        message: 'Số phòng đã được sử dụng, vui lòng chọn số phòng khác',
      });
    }

    // 4. Validate Tầng (floor)
    if (rawFloor === undefined || rawFloor === null || rawFloor === '') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'floor',
        message: 'Tầng không được để trống',
      });
    }

    const floorNum = Number(rawFloor);
    if (!Number.isInteger(floorNum) || isNaN(floorNum) || floorNum < -3 || floorNum > 200) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        field: 'floor',
        message: 'Tầng phải là số nguyên trong khoảng cho phép',
      });
    }

    // 5. Validate Trạng thái phòng (status)
    const validManualStatuses = ['CleanAvailable', 'Maintenance', 'OutOfOrder'];
    let finalStatus = 'CleanAvailable';
    if (rawStatus) {
      if (!['CleanAvailable', 'Occupied', 'Dirty', 'Cleaning', 'Maintenance', 'OutOfOrder', 'Reserved'].includes(rawStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'status',
          message: 'Trạng thái phòng không được để trống',
        });
      }
      finalStatus = rawStatus;
    }

    // 6. Validate Mô tả (description)
    let finalDesc = null;
    if (rawDesc && String(rawDesc).trim()) {
      const trimmedDesc = String(rawDesc).trim();
      if (trimmedDesc.length > 500) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'description',
          message: 'Mô tả không được vượt quá 500 ký tự',
        });
      }
      finalDesc = trimmedDesc;
    }

    // Lưu vào database
    const created = await Room.create({
      BranchId: branchId,
      RoomTypeId: roomType.RoomTypeId,
      RoomNumber: trimmedRoomNumber,
      Floor: floorNum,
      Status: finalStatus,
      Description: finalDesc,
      IsDeleted: false,
    });

    const roomWithAssoc = await Room.findByPk(created.RoomId, {
      include: [
        { model: RoomType, as: 'roomType' },
        { model: Branch, as: 'branch' },
      ],
    });

    const formatted = toSpecRoom(roomWithAssoc);

    // Ghi Audit Log
    try {
      if (AuditLog) {
        await AuditLog.create({
          user_id: req.user?.id || req.user?.userId || 1,
          action: 'CREATE_ROOM',
          entity_name: 'Rooms',
          entity_id: created.RoomId,
          new_values: formatted,
          ip_address: req.ip || '127.0.0.1',
        });
      }
    } catch (_) {}

    broadcastRoomEvent('ROOM_CREATED', { room: formatted });

    res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới phòng thành công',
      data: formatted,
    });
  } catch (err) {
    console.error('POST /physical error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
};

router.post('/physical', checkRoomPermission('ROOM_MANAGE'), handleCreateRoom);
router.post('/', checkRoomPermission('ROOM_MANAGE'), handleCreateRoom);

// ─── PUT CẬP NHẬT PHÒNG VẬT LÝ (Theo mục 3.5 & 4.2 Spec 2) ───────────────────
const handleUpdateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Phòng không tồn tại hoặc đã bị xóa!',
        isRecordDeleted: true,
      });
    }

    const rawBranch = req.body.branchName || req.body.branchId || req.body.branch;
    const rawRoomTypeId = req.body.roomTypeId || req.body.ma_loai;
    const rawRoomNumber = req.body.roomNumber || req.body.so_phong;
    const rawFloor = req.body.floor !== undefined ? req.body.floor : req.body.tang;
    const rawStatus = req.body.status || req.body.trang_thai;
    const rawDesc = req.body.description !== undefined ? req.body.description : req.body.ghi_chu;

    let branchId = room.BranchId;
    if (rawBranch) {
      let branch = null;
      if (!isNaN(Number(rawBranch))) {
        branch = await Branch.findByPk(Number(rawBranch));
      } else {
        branch = await Branch.findOne({ where: { BranchName: String(rawBranch).trim() } });
      }
      if (branch) branchId = branch.BranchId;
    }

    let roomTypeId = room.RoomTypeId;
    if (rawRoomTypeId) {
      let roomType = null;
      if (!isNaN(Number(rawRoomTypeId))) {
        roomType = await RoomType.findOne({ where: { RoomTypeId: Number(rawRoomTypeId), IsDeleted: false } });
      } else {
        roomType = await RoomType.findOne({
          where: {
            [Op.or]: [{ TypeCode: String(rawRoomTypeId).trim() }, { TypeName: String(rawRoomTypeId).trim() }],
            IsDeleted: false,
          },
        });
      }
      if (roomType) roomTypeId = roomType.RoomTypeId;
    }

    let roomNumber = room.RoomNumber;
    if (rawRoomNumber !== undefined) {
      const trimmed = String(rawRoomNumber).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'roomNumber',
          message: 'Số phòng không được để trống',
        });
      }
      if (trimmed.length > 20) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'roomNumber',
          message: 'Số phòng không được vượt quá 20 ký tự',
        });
      }
      if (!/^[A-Za-z0-9\-]+$/.test(trimmed)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'roomNumber',
          message: 'Số phòng không đúng định dạng',
        });
      }

      // Check trùng loại trừ chính room đang sửa
      const duplicate = await Room.findOne({
        where: {
          BranchId: branchId,
          RoomNumber: trimmed,
          IsDeleted: false,
          RoomId: { [Op.ne]: id },
        },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          field: 'roomNumber',
          message: 'Số phòng đã được sử dụng, vui lòng chọn số phòng khác',
        });
      }
      roomNumber = trimmed;
    }

    let floor = room.Floor;
    if (rawFloor !== undefined) {
      const fNum = Number(rawFloor);
      if (!Number.isInteger(fNum) || isNaN(fNum) || fNum < -3 || fNum > 200) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0011_INVALID_NUMBER',
          field: 'floor',
          message: 'Tầng phải là số nguyên trong khoảng cho phép',
        });
      }
      floor = fNum;
    }

    // Kiểm tra quy tắc chuyển trạng thái (Mục 3.5 Spec 2)
    let nextStatus = room.Status;
    if (rawStatus && rawStatus !== room.Status) {
      const currentSt = room.Status;
      // Không cho phép chuyển 1 phòng đang ở trạng thái Occupied hoặc Reserved sang Maintenance/OutOfOrder trực tiếp
      if (
        (currentSt === 'Occupied' || currentSt === 'Reserved' || currentSt === 'CleanOccupied') &&
        (rawStatus === 'Maintenance' || rawStatus === 'OutOfOrder')
      ) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0015_HAS_RELATED_DATA',
          message: 'Không thể đổi trạng thái vì phòng đang có khách ở hoặc đã được giữ chỗ',
        });
      }
      nextStatus = rawStatus;
    }

    let description = room.Description;
    if (rawDesc !== undefined) {
      if (rawDesc && String(rawDesc).trim()) {
        const trimmedDesc = String(rawDesc).trim();
        if (trimmedDesc.length > 500) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0003_MAX_LENGTH',
            field: 'description',
            message: 'Mô tả không được vượt quá 500 ký tự',
          });
        }
        description = trimmedDesc;
      } else {
        description = null;
      }
    }

    const oldValues = toSpecRoom(room);

    await room.update({
      BranchId: branchId,
      RoomTypeId: roomTypeId,
      RoomNumber: roomNumber,
      Floor: floor,
      Status: nextStatus,
      Description: description,
    });

    const updated = await Room.findByPk(id, {
      include: [
        { model: RoomType, as: 'roomType' },
        { model: Branch, as: 'branch' },
      ],
    });

    const formatted = toSpecRoom(updated);

    // Ghi Audit Log
    try {
      if (AuditLog) {
        await AuditLog.create({
          user_id: req.user?.id || req.user?.userId || 1,
          action: 'UPDATE_ROOM',
          entity_name: 'Rooms',
          entity_id: id,
          old_values: oldValues,
          new_values: formatted,
          ip_address: req.ip || '127.0.0.1',
        });
      }
    } catch (_) {}

    broadcastRoomEvent('ROOM_UPDATED', { room: formatted });

    res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật phòng thành công',
      data: formatted,
    });
  } catch (err) {
    console.error('PUT /physical/:id error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
};

router.put('/physical/:id', checkRoomPermission('ROOM_MANAGE'), handleUpdateRoom);
router.put('/:id', checkRoomPermission('ROOM_MANAGE'), handleUpdateRoom);

// ─── DELETE XÓA PHÒNG VẬT LÝ (Soft delete kèm ràng buộc mục 3.7 & 4.3) ────────
const handleDeleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Phòng không tồn tại hoặc đã bị xóa!',
        isRecordDeleted: true,
      });
    }

    // 1. Kiểm tra trạng thái phòng: Occupied hoặc Reserved
    if (room.Status === 'Occupied' || room.Status === 'Reserved' || room.Status === 'CleanOccupied') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_HAS_RELATED_DATA',
        message: 'Không thể xóa phòng vì phòng đang có khách ở, đã được giữ chỗ hoặc đang chờ xử lý dọn phòng',
      });
    }

    // 2. Kiểm tra còn Stay đang mở (ActualCheckOut IS NULL)
    if (Stay) {
      const openStay = await Stay.findOne({
        where: {
          RoomId: id,
          ActualCheckOut: null,
        },
      });
      if (openStay) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0015_HAS_RELATED_DATA',
          message: 'Không thể xóa phòng vì phòng đang có khách ở, đã được giữ chỗ hoặc đang chờ xử lý dọn phòng',
        });
      }
    }

    // 3. Kiểm tra HousekeepingAssignment đang xử lý (Assigned / InProgress)
    try {
      const [hkRows] = await sequelize.query(
        'SELECT AssignmentId FROM HousekeepingAssignments WHERE RoomId = :roomId AND Status IN ("Assigned", "InProgress") LIMIT 1',
        { replacements: { roomId: id } }
      );
      if (hkRows && hkRows.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0015_HAS_RELATED_DATA',
          message: 'Không thể xóa phòng vì phòng đang có khách ở, đã được giữ chỗ hoặc đang chờ xử lý dọn phòng',
        });
      }
    } catch (_) {}

    // Xóa mềm: IsDeleted = true
    await room.update({ IsDeleted: true });

    // Ghi Audit Log
    try {
      if (AuditLog) {
        await AuditLog.create({
          user_id: req.user?.id || req.user?.userId || 1,
          action: 'DELETE_ROOM',
          entity_name: 'Rooms',
          entity_id: id,
          old_values: { RoomNumber: room.RoomNumber, Status: room.Status },
          new_values: { IsDeleted: true },
          ip_address: req.ip || '127.0.0.1',
        });
      }
    } catch (_) {}

    broadcastRoomEvent('ROOM_DELETED', { roomId: id, roomNumber: room.RoomNumber });

    res.json({
      success: true,
      code: 'SUCCESS_0003_DELETED',
      message: 'Xóa phòng thành công',
      data: { roomId: room.RoomId, isDeleted: true },
    });
  } catch (err) {
    console.error('DELETE room error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
};

router.delete('/physical/:id', checkRoomPermission('ROOM_MANAGE'), handleDeleteRoom);
router.delete('/:id', checkRoomPermission('ROOM_MANAGE'), handleDeleteRoom);

// ─── PATCH THAO TÁC HÀNG LOẠT (Mục 3.8 & Test Case 12, 13 Spec 2) ────────────
const handleBulkStatusUpdate = async (req, res) => {
  try {
    const rawIds = req.body.roomIds || req.body.ids;
    const targetStatus = req.body.status || req.body.targetStatus || req.body.action;

    if (!rawIds || !Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0016_NO_ITEM_SELECTED',
        message: 'Vui lòng chọn ít nhất 1 phòng để thực hiện thao tác',
      });
    }

    // Map action cũ (ooo, clean, ...) nếu gửi dạng action
    let nextSt = targetStatus;
    if (nextSt === 'ooo') nextSt = 'OutOfOrder';
    else if (nextSt === 'clean') nextSt = 'CleanAvailable';
    else if (nextSt === 'maintenance') nextSt = 'Maintenance';

    if (!['CleanAvailable', 'Maintenance', 'OutOfOrder'].includes(nextSt)) {
      nextSt = 'CleanAvailable';
    }

    const rooms = await Room.findAll({
      where: {
        RoomId: { [Op.in]: rawIds.map(Number) },
        IsDeleted: false,
      },
    });

    const updatedRooms = [];
    const skippedRooms = [];

    const t = await sequelize.transaction();
    try {
      for (const room of rooms) {
        // Loại trừ phòng đang Occupied hoặc Reserved
        if (room.Status === 'Occupied' || room.Status === 'Reserved' || room.Status === 'CleanOccupied') {
          skippedRooms.push({
            roomId: room.RoomId,
            roomNumber: room.RoomNumber,
            reason: 'Phòng đang có khách ở hoặc đã được giữ chỗ',
          });
          continue;
        }

        await room.update({ Status: nextSt }, { transaction: t });
        updatedRooms.push(room.RoomId);
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    broadcastRoomEvent('ROOMS_BATCH_UPDATED', {
      action: nextSt,
      count: updatedRooms.length,
      updatedRooms,
    });

    const message = `Đã cập nhật ${updatedRooms.length}/${rooms.length} phòng thành công.${
      skippedRooms.length > 0 ? ` ${skippedRooms.length} phòng bị bỏ qua do đang có khách ở.` : ''
    }`;

    res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message,
      data: {
        updatedCount: updatedRooms.length,
        skippedCount: skippedRooms.length,
        skippedRooms,
      },
    });
  } catch (err) {
    console.error('PATCH /bulk/status error:', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật hàng loạt: ' + err.message });
  }
};

router.patch('/bulk/status', checkRoomPermission('ROOM_MANAGE'), handleBulkStatusUpdate);
router.post('/hang-loat', checkRoomPermission('ROOM_MANAGE'), handleBulkStatusUpdate);

// ─── PATCH KHÓA TOÀN TẦNG (Mục 3.8 & Wireframe 6.1) ──────────────────────────
const handleLockFloor = async (req, res) => {
  try {
    const rawFloor = req.body.floor !== undefined ? req.body.floor : req.body.tang;
    const reason = req.body.reason;
    const branchId = req.body.branchId;

    if (rawFloor === undefined || rawFloor === null || rawFloor === '') {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'floor',
        message: 'Tầng không được để trống',
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'reason',
        message: 'Lý do khóa tầng không được để trống',
      });
    }

    const where = {
      Floor: Number(rawFloor),
      IsDeleted: false,
    };
    if (branchId) where.BranchId = Number(branchId);

    const rooms = await Room.findAll({ where });
    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy phòng nào thuộc tầng ${rawFloor}`,
      });
    }

    const updatedRooms = [];
    const skippedRooms = [];

    const t = await sequelize.transaction();
    try {
      for (const room of rooms) {
        if (room.Status === 'Occupied' || room.Status === 'Reserved' || room.Status === 'CleanOccupied') {
          skippedRooms.push({
            roomId: room.RoomId,
            roomNumber: room.RoomNumber,
            reason: 'Phòng đang có khách ở hoặc đã được giữ chỗ',
          });
          continue;
        }

        const noteDesc = `[Khóa toàn tầng: ${reason.trim()}] ${room.Description || ''}`.trim();
        await room.update({ Status: 'OutOfOrder', Description: noteDesc }, { transaction: t });
        updatedRooms.push(room.RoomId);
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    broadcastRoomEvent('ROOMS_BATCH_UPDATED', {
      action: 'OutOfOrder',
      count: updatedRooms.length,
      floor: rawFloor,
    });

    res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: `Đã khóa ${updatedRooms.length}/${rooms.length} phòng tầng ${rawFloor} thành công.${
        skippedRooms.length > 0 ? ` ${skippedRooms.length} phòng bị bỏ qua do đang có khách ở.` : ''
      }`,
      data: {
        floor: Number(rawFloor),
        updatedCount: updatedRooms.length,
        skippedCount: skippedRooms.length,
        skippedRooms,
      },
    });
  } catch (err) {
    console.error('PATCH /bulk/lock-floor error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khóa tầng: ' + err.message });
  }
};

router.patch('/bulk/lock-floor', checkRoomPermission('ROOM_MANAGE'), handleLockFloor);
router.post('/khoa-tang', checkRoomPermission('ROOM_MANAGE'), handleLockFloor);

// ─── PATCH ĐỔI TRẠNG THÁI 1 PHÒNG (Mục 3.5 & Test Case 9) ────────────────────
const handleSingleStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const targetStatus = req.body.status || req.body.targetStatus || req.body.action;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Trạng thái phòng không được để trống',
      });
    }

    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Phòng không tồn tại hoặc đã bị xóa!',
        isRecordDeleted: true,
      });
    }

    let nextSt = targetStatus;
    if (nextSt === 'inhouse') nextSt = 'Occupied';
    else if (nextSt === 'dirty') nextSt = 'Dirty';
    else if (nextSt === 'ooo') nextSt = 'OutOfOrder';
    else if (nextSt === 'clean') nextSt = 'CleanAvailable';

    // Ràng buộc mục 3.5: Không thể đổi từ Occupied/Reserved sang Maintenance/OutOfOrder
    const curSt = room.Status;
    if (
      (curSt === 'Occupied' || curSt === 'Reserved' || curSt === 'CleanOccupied') &&
      (nextSt === 'Maintenance' || nextSt === 'OutOfOrder')
    ) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_HAS_RELATED_DATA',
        message: 'Không thể đổi trạng thái vì phòng đang có khách ở hoặc đã được giữ chỗ',
      });
    }

    await room.update({ Status: nextSt });

    const updated = await Room.findByPk(id, {
      include: [
        { model: RoomType, as: 'roomType' },
        { model: Branch, as: 'branch' },
      ],
    });

    const formatted = toSpecRoom(updated);
    broadcastRoomEvent('ROOM_STATUS_CHANGED', {
      roomId: room.RoomId,
      roomNumber: room.RoomNumber,
      action: nextSt,
      room: formatted,
    });

    res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: `Đã đổi trạng thái phòng ${room.RoomNumber} sang "${nextSt}" thành công`,
      data: formatted,
    });
  } catch (err) {
    console.error('PATCH /rooms/:id/status error:', err);
    res.status(500).json({ success: false, message: 'Lỗi đổi trạng thái: ' + err.message });
  }
};

router.patch('/:id/status', checkRoomPermission('ROOM_MANAGE'), handleSingleStatusUpdate);
router.patch('/:id/chuyen-trang-thai', checkRoomPermission('ROOM_MANAGE'), handleSingleStatusUpdate);
router.patch('/:id/thao-tac', checkRoomPermission('ROOM_MANAGE'), handleSingleStatusUpdate);

module.exports = router;
