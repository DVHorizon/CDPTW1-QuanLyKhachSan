'use strict';

const express = require('express');
const router = express.Router();
const { Room, RoomType, Branch } = require('../models');
const { Op } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════════
// API PHÒNG VẬT LÝ  →  /api/phong
// Bảng: Rooms (Sequelize model - đồng bộ với migration 001)
//   Status: CleanAvailable | CleanOccupied | DirtyVacant | OutOfOrder | ...
// ═══════════════════════════════════════════════════════════════════════════

// Map trạng thái UI (2 trường cũ) → Status chuẩn Sequelize
function encodeStatus(buong_phong, luu_tru) {
  if (buong_phong === 'ooo') return 'OutOfOrder';
  if (luu_tru === 'inhouse' && buong_phong === 'clean') return 'CleanOccupied';
  if (luu_tru === 'inhouse' && buong_phong === 'dirty') return 'DirtyOccupied';
  if (buong_phong === 'dirty') return 'DirtyVacant';
  return 'CleanAvailable'; // clean + vacant
}

// Map Status Sequelize → {buong_phong, luu_tru} cho frontend cũ
function decodeStatus(status) {
  switch (status) {
    case 'OutOfOrder':     return { buong_phong: 'ooo',   luu_tru: 'vacant' };
    case 'CleanOccupied':  return { buong_phong: 'clean', luu_tru: 'inhouse' };
    case 'DirtyOccupied':  return { buong_phong: 'dirty', luu_tru: 'inhouse' };
    case 'DirtyVacant':    return { buong_phong: 'dirty', luu_tru: 'vacant' };
    default:               return { buong_phong: 'clean', luu_tru: 'vacant' };
  }
}

// Chuyển Sequelize Room row → định dạng mà frontend RoomManagement.jsx đang dùng
function toUIFormat(room) {
  const decoded = decodeStatus(room.Status);
  // Lấy ma_loai từ RoomType association (nếu có) hoặc RoomTypeId
  const ma_loai = room.roomType ? (room.roomType.TypeCode || room.roomType.TypeName) : String(room.RoomTypeId);
  return {
    id:              room.RoomId,
    so_phong:        room.RoomNumber,
    tang:            room.Floor,
    khu:             room.Description ? (room.Description.match(/^KHU-([A-Z])/) || [])[1] || 'A' : 'A',
    ma_loai,
    ma_khoa:         `RFID-${room.RoomNumber}`,
    phong_lien_thong: null,
    ghi_chu:         room.Description || '',
    buong_phong:     decoded.buong_phong,
    luu_tru:         decoded.luu_tru,
    // Thêm field để Guest search dùng
    RoomId:          room.RoomId,
    RoomTypeId:      room.RoomTypeId,
    BranchId:        room.BranchId,
    Status:          room.Status,
  };
}

const ACTIONS = ['clean', 'dirty', 'checkin', 'checkout', 'ooo', 'restore'];
const MSG_INVALID = 'Thao tác không hợp lệ với trạng thái hiện tại.';

// Quy tắc chuyển trạng thái
function applyAction(room, action) {
  const { buong_phong: hk, luu_tru: occ } = decodeStatus(room.Status);
  let nextHk = hk, nextOcc = occ;
  switch (action) {
    case 'clean':    if (hk !== 'dirty') return null; nextHk = 'clean'; break;
    case 'dirty':    if (hk !== 'clean') return null; nextHk = 'dirty'; break;
    case 'checkin':  if (hk !== 'clean' || occ !== 'vacant') return null; nextOcc = 'inhouse'; break;
    case 'checkout': if (occ !== 'inhouse' || hk === 'ooo') return null; nextHk = 'dirty'; nextOcc = 'vacant'; break;
    case 'ooo':      if (hk === 'ooo' || occ !== 'vacant') return null; nextHk = 'ooo'; break;
    case 'restore':  if (hk !== 'ooo') return null; nextHk = 'dirty'; break;
    default:         return null;
  }
  return encodeStatus(nextHk, nextOcc);
}

// Helper: Tìm RoomType linh hoạt theo bất kỳ định dạng nào mà frontend gửi lên
async function resolveRoomType(ma_loai) {
  if (!ma_loai) return null;
  const clean = String(ma_loai).trim();

  // 1. Nếu là số nguyên
  if (!isNaN(clean)) {
    const byId = await RoomType.findOne({ where: { RoomTypeId: Number(clean), IsDeleted: false } });
    if (byId) return byId;
  }

  // 2. Định dạng RT-123
  const matchRt = clean.match(/^RT-(\d+)$/i);
  if (matchRt) {
    const byRtId = await RoomType.findOne({ where: { RoomTypeId: Number(matchRt[1]), IsDeleted: false } });
    if (byRtId) return byRtId;
  }

  // 3. Khớp chính xác TypeCode (ví dụ: STD-DBL, DLX-OCN)
  const byCode = await RoomType.findOne({ where: { TypeCode: clean, IsDeleted: false } });
  if (byCode) return byCode;

  // 4. Khớp TypeName
  const byName = await RoomType.findOne({
    where: {
      [Op.or]: [
        { TypeName: clean },
        { TypeName: { [Op.like]: `%${clean}%` } },
      ],
      IsDeleted: false,
    }
  });
  if (byName) return byName;

  // 5. Fallback loại phòng đầu tiên nếu không tìm thấy
  return await RoomType.findOne({ where: { IsDeleted: false }, order: [['RoomTypeId', 'ASC']] });
}

// ─── GET danh sách phòng ────────────────────────────────────────────────────
// GET /api/phong?tang=4&khu=A&ma_loai=DLX-OCN&tim=101
router.get('/', async (req, res) => {
  try {
    const { tang, khu, ma_loai, tim } = req.query;
    const where = { IsDeleted: false };

    if (tang) where.Floor = Number(tang);
    if (tim) where.RoomNumber = { [Op.like]: `%${tim}%` };

    const include = [
      { model: RoomType, as: 'roomType', attributes: ['RoomTypeId', 'TypeCode', 'TypeName', 'BasePrice', 'ImageUrl'] },
      { model: Branch,   as: 'branch',   attributes: ['BranchId', 'BranchName'] },
    ];

    // Filter theo ma_loai (TypeCode hoặc TypeName)
    if (ma_loai) {
      include[0].where = {
        [Op.or]: [
          { TypeCode: ma_loai },
          { TypeName: { [Op.like]: `%${ma_loai}%` } }
        ]
      };
      include[0].required = true;
    }

    // Filter khu qua Description
    if (khu) {
      where.Description = { [Op.like]: `KHU-${khu}%` };
    }

    const rooms = await Room.findAll({
      where,
      include,
      order: [['Floor', 'ASC'], ['RoomNumber', 'ASC']],
    });

    const data = rooms.map(toUIFormat);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error('GET /phong error:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── POST thao tác hàng loạt ────────────────────────────────────────────────
router.post('/hang-loat', async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: 'Chưa chọn phòng nào để áp dụng.' });
    if (!ACTIONS.includes(action))
      return res.status(400).json({ success: false, message: MSG_INVALID });

    const rooms = await Room.findAll({ where: { RoomId: { [Op.in]: ids.map(Number) }, IsDeleted: false } });
    const updated = [];
    let skipped = 0;

    for (const room of rooms) {
      const nextStatus = applyAction(room, action);
      if (!nextStatus) { skipped++; continue; }
      await room.update({ Status: nextStatus });
      updated.push(toUIFormat(room));
    }

    if (updated.length === 0)
      return res.status(400).json({ success: false, message: MSG_INVALID });

    res.json({ success: true, data: { updated, ok: updated.length, skipped } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST khóa cả tầng ──────────────────────────────────────────────────────
router.post('/khoa-tang', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một phòng.' });

    // Lấy danh sách floor từ ids đã chọn
    const picked = await Room.findAll({
      where: { RoomId: { [Op.in]: ids.map(Number) }, IsDeleted: false },
      attributes: ['Floor'],
      group: ['Floor'],
    });
    const floors = picked.map(p => p.Floor);
    if (!floors.length)
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng đã chọn' });

    const rooms = await Room.findAll({ where: { Floor: { [Op.in]: floors }, IsDeleted: false } });
    const updated = [];
    let skipped = 0;

    for (const room of rooms) {
      const nextStatus = applyAction(room, 'ooo');
      if (!nextStatus) { if (room.Status !== 'OutOfOrder') skipped++; continue; }
      await room.update({ Status: nextStatus });
      updated.push(toUIFormat(room));
    }

    if (updated.length === 0)
      return res.status(400).json({ success: false, message: MSG_INVALID });

    res.json({ success: true, data: { updated, ok: updated.length, skipped, floors } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST tạo phòng mới ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { so_phong, tang, khu, ma_loai, ma_khoa, ghi_chu, buong_phong, luu_tru } = req.body;

    if (!so_phong || !String(so_phong).trim())
      return res.status(400).json({ success: false, message: 'Số phòng không được để trống' });
    if (!/^[A-Za-z0-9._\-\/]{1,20}$/.test(String(so_phong).trim()))
      return res.status(400).json({ success: false, message: 'Số phòng chỉ gồm chữ, số, ký tự đặc biệt hợp lệ (tối đa 20 ký tự)' });

    const floor = Number(tang);
    if (!Number.isInteger(floor) || floor < 1 || floor > 99)
      return res.status(400).json({ success: false, message: 'Tầng phải là số nguyên từ 1 đến 99' });

    if (!ma_loai)
      return res.status(400).json({ success: false, message: 'Vui lòng chọn loại phòng' });

    // Tìm RoomType theo resolveRoomType linh hoạt
    const roomType = await resolveRoomType(ma_loai);
    if (!roomType)
      return res.status(400).json({ success: false, message: `Loại phòng "${ma_loai}" không tồn tại` });

    // Lấy BranchId mặc định (branch đầu tiên)
    const branch = await Branch.findOne({ where: { Status: 'Active' } });
    const branchId = branch ? branch.BranchId : 1;

    // Kiểm tra trùng RoomNumber
    const existing = await Room.findOne({ where: { RoomNumber: String(so_phong).trim(), IsDeleted: false } });
    if (existing)
      return res.status(409).json({ success: false, message: `Số phòng "${so_phong}" đã tồn tại trên hệ thống` });

    const description = `KHU-${(khu || 'A').toUpperCase()} | ${ghi_chu || ''}`.trim();
    const status = encodeStatus(buong_phong || 'clean', luu_tru || 'vacant');

    const newRoom = await Room.create({
      BranchId:   branchId,
      RoomTypeId: roomType.RoomTypeId,
      RoomNumber: String(so_phong).trim(),
      Floor:      floor,
      Status:     status,
      Description: description,
      IsDeleted:  false,
    });

    const roomWithAssoc = await Room.findByPk(newRoom.RoomId, {
      include: [
        { model: RoomType, as: 'roomType' },
        { model: Branch,   as: 'branch' },
      ]
    });

    res.status(201).json({ success: true, message: 'Đã thêm phòng thành công', data: toUIFormat(roomWithAssoc) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT cập nhật phòng ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Phòng này không còn tồn tại!' });

    const { so_phong, tang, khu, ma_loai, ghi_chu, buong_phong, luu_tru } = req.body;

    const floor = Number(tang);
    if (!Number.isInteger(floor) || floor < 1 || floor > 99)
      return res.status(400).json({ success: false, message: 'Tầng phải là số nguyên từ 1 đến 99' });

    let roomTypeId = room.RoomTypeId;
    if (ma_loai) {
      const roomType = await resolveRoomType(ma_loai);
      if (!roomType)
        return res.status(400).json({ success: false, message: `Loại phòng "${ma_loai}" không tồn tại` });
      roomTypeId = roomType.RoomTypeId;
    }

    const description = `KHU-${(khu || 'A').toUpperCase()} | ${ghi_chu || ''}`.trim();
    const status = encodeStatus(buong_phong || 'clean', luu_tru || 'vacant');

    await room.update({
      RoomNumber:  String(so_phong || room.RoomNumber).trim(),
      Floor:       floor,
      RoomTypeId:  roomTypeId,
      Status:      status,
      Description: description,
    });

    const updated = await Room.findByPk(id, {
      include: [
        { model: RoomType, as: 'roomType' },
        { model: Branch,   as: 'branch' },
      ]
    });
    res.json({ success: true, message: 'Đã cập nhật phòng thành công', data: toUIFormat(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH đổi trạng thái một phòng ─────────────────────────────────────────
// PATCH /api/phong/:id/thao-tac  { action: "checkin" }
router.patch('/:id/thao-tac', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Phòng này không còn tồn tại!' });

    const nextStatus = ACTIONS.includes(action) ? applyAction(room, action) : null;
    if (!nextStatus)
      return res.status(400).json({ success: false, message: MSG_INVALID });

    await room.update({ Status: nextStatus });
    res.json({ success: true, data: toUIFormat(room) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa phòng (soft delete) ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { RoomId: id, IsDeleted: false } });
    if (!room)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Phòng này không còn tồn tại hoặc đã bị xóa!' });

    const { luu_tru } = decodeStatus(room.Status);
    if (luu_tru === 'inhouse')
      return res.status(400).json({ success: false, message: 'Không thể xóa phòng đang có khách ở!' });

    await room.update({ IsDeleted: true });
    res.json({ success: true, message: `Đã xóa phòng ${room.RoomNumber} thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
