'use strict';

const express = require('express');
const router = express.Router();
const { RoomType, Room } = require('../models');
const { Op } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════════
// API LOẠI PHÒNG  →  /api/loai-phong
// Bảng: RoomTypes (Sequelize model - đồng bộ với migration 001)
// ═══════════════════════════════════════════════════════════════════════════

// Map Sequelize RoomType → định dạng mà frontend RoomTypeManagement.jsx đang dùng
function toUIFormat(r) {
  let tien_ich = [];
  try {
    tien_ich = r.Amenities ? JSON.parse(r.Amenities) : [];
  } catch (_) {}

  return {
    id:                 r.RoomTypeId,
    ma_loai:            r.TypeCode || String(r.RoomTypeId),
    ten_loai:           r.TypeName,
    mo_ta:              r.Description || '',
    hinh_anh:           r.ImageUrl || '',
    dien_tich:          r.AreaSqm ?? null,
    so_phong_ton_kho:   r.TotalRooms || 0,
    gia_co_ban:         parseFloat(r.BasePrice) || 0,
    loai_giuong:        r.BedType || '1 Giường King (2m x 2m)',
    huong_view:         r.ViewType || 'Hướng Biển (Ocean View)',
    tang_vi_tri:        r.FloorRange || null,
    toi_da_nguoi_lon:   r.AdultCapacity || 2,
    toi_da_tre_em:      r.ChildCapacity || 1,
    toi_da_tong:        r.MaxOccupancy || (r.AdultCapacity || 2) + (r.ChildCapacity || 1),
    thoi_gian_don_phong: r.TurnoverMinutes || 30,
    he_so_cuoi_tuan:    parseFloat(r.WeekendMultiplier) || 1.0,
    tien_ich,
    trang_thai:         r.Status === 'Active' ? 'active' : 'inactive',
    // Alias để Guest search dùng được
    RoomTypeId:         r.RoomTypeId,
    TypeName:           r.TypeName,
    BasePrice:          parseFloat(r.BasePrice) || 0,
    ImageUrl:           r.ImageUrl || '',
    MaxOccupancy:       r.MaxOccupancy || 2,
    name:               r.TypeName,
    code:               r.TypeCode || String(r.RoomTypeId),
  };
}

// ─── GET tất cả loại phòng ──────────────────────────────────────────────────
// GET /api/loai-phong?trang_thai=active&tim=ocean
router.get('/', async (req, res) => {
  try {
    const { trang_thai, tim, limit } = req.query;
    const where = { IsDeleted: false };

    if (trang_thai && trang_thai !== 'all') {
      where.Status = trang_thai === 'active' ? 'Active' : 'Inactive';
    }
    if (tim) {
      where[Op.or] = [
        { TypeName:    { [Op.like]: `%${tim}%` } },
        { Description: { [Op.like]: `%${tim}%` } },
      ];
    }

    const opts = { where, order: [['RoomTypeId', 'ASC']] };
    if (limit) opts.limit = Number(limit);

    const rows = await RoomType.findAll(opts);
    const result = rows.map(toUIFormat);

    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error('GET /loai-phong error:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── GET thống kê tổng quan ─────────────────────────────────────────────────
router.get('/thong-ke', async (req, res) => {
  try {
    const total = await RoomType.count({ where: { IsDeleted: false } });
    const active = await RoomType.count({ where: { IsDeleted: false, Status: 'Active' } });
    const inactive = await RoomType.count({ where: { IsDeleted: false, Status: 'Inactive' } });
    const allTypes = await RoomType.findAll({ where: { IsDeleted: false }, attributes: ['BasePrice', 'TotalRooms'] });

    const totalRooms = allTypes.reduce((s, r) => s + (r.TotalRooms || 0), 0);
    const avgPrice = total > 0
      ? allTypes.reduce((s, r) => s + parseFloat(r.BasePrice || 0), 0) / total
      : 0;

    res.json({
      success: true,
      data: {
        tong_danh_muc:  total,
        tong_phong:     totalRooms,
        gia_trung_binh: avgPrice,
        dang_hoat_dong: active,
        tam_dung:       inactive,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET một loại phòng theo ID ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const r = await RoomType.findOne({ where: { RoomTypeId: req.params.id, IsDeleted: false } });
    if (!r) return res.status(404).json({ success: false, message: 'Không tìm thấy loại phòng' });
    res.json({ success: true, data: toUIFormat(r) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST tạo loại phòng mới ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      ma_loai, ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
      gia_co_ban, loai_giuong, huong_view, tang_vi_tri,
      toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong,
      he_so_cuoi_tuan, tien_ich, trang_thai,
    } = req.body;

    if (!ten_loai || !String(ten_loai).trim())
      return res.status(400).json({ success: false, message: 'Tên loại phòng không được để trống' });

    const numGia = Number(gia_co_ban);
    if (isNaN(numGia) || numGia <= 0)
      return res.status(400).json({ success: false, message: 'Giá cơ bản phải là số dương lớn hơn 0' });

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    const newRT = await RoomType.create({
      TypeCode:          ma_loai ? String(ma_loai).trim().toUpperCase() : null,
      TypeName:          String(ten_loai).trim(),
      Description:       mo_ta || null,
      ImageUrl:          hinh_anh || null,
      AreaSqm:           dien_tich || null,
      TotalRooms:        so_phong_ton_kho || 0,
      BasePrice:         numGia,
      MaxOccupancy:      (toi_da_nguoi_lon || 2) + (toi_da_tre_em || 1),
      AdultCapacity:     toi_da_nguoi_lon || 2,
      ChildCapacity:     toi_da_tre_em || 1,
      BedType:           loai_giuong || '1 Giường King (2m x 2m)',
      ViewType:          huong_view || 'Hướng Biển (Ocean View)',
      FloorRange:        tang_vi_tri || null,
      TurnoverMinutes:   thoi_gian_don_phong || 30,
      WeekendMultiplier: he_so_cuoi_tuan || 1.0,
      Amenities:         tienIchJson,
      Status:            trang_thai === 'inactive' ? 'Inactive' : 'Active',
      IsDeleted:         false,
    });

    res.status(201).json({ success: true, message: 'Đã tạo loại phòng thành công', data: toUIFormat(newRT) });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Mã loại phòng đã tồn tại: ' + req.body.ma_loai });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT cập nhật toàn bộ loại phòng ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rt = await RoomType.findOne({ where: { RoomTypeId: id, IsDeleted: false } });
    if (!rt)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại trong cơ sở dữ liệu!' });

    const {
      ma_loai, ten_loai, mo_ta, hinh_anh, dien_tich, so_phong_ton_kho,
      gia_co_ban, loai_giuong, huong_view, tang_vi_tri,
      toi_da_nguoi_lon, toi_da_tre_em, thoi_gian_don_phong,
      he_so_cuoi_tuan, tien_ich, trang_thai,
    } = req.body;

    if (!ten_loai || !String(ten_loai).trim())
      return res.status(400).json({ success: false, message: 'Tên loại phòng không được để trống' });

    const numGia = Number(gia_co_ban);
    if (isNaN(numGia) || numGia <= 0)
      return res.status(400).json({ success: false, message: 'Giá cơ bản phải là số dương lớn hơn 0' });

    const tienIchJson = JSON.stringify(Array.isArray(tien_ich) ? tien_ich : []);

    await rt.update({
      TypeCode:          ma_loai ? String(ma_loai).trim().toUpperCase() : rt.TypeCode,
      TypeName:          String(ten_loai).trim(),
      Description:       mo_ta || null,
      ImageUrl:          hinh_anh || null,
      AreaSqm:           dien_tich || null,
      TotalRooms:        so_phong_ton_kho ?? rt.TotalRooms,
      BasePrice:         numGia,
      MaxOccupancy:      (toi_da_nguoi_lon || 2) + (toi_da_tre_em || 1),
      AdultCapacity:     toi_da_nguoi_lon || 2,
      ChildCapacity:     toi_da_tre_em || 1,
      BedType:           loai_giuong || rt.BedType,
      ViewType:          huong_view || rt.ViewType,
      FloorRange:        tang_vi_tri || null,
      TurnoverMinutes:   thoi_gian_don_phong || 30,
      WeekendMultiplier: he_so_cuoi_tuan || 1.0,
      Amenities:         tienIchJson,
      Status:            trang_thai === 'inactive' ? 'Inactive' : 'Active',
    });

    res.json({ success: true, message: 'Đã cập nhật loại phòng thành công', data: toUIFormat(rt) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH thay đổi trạng thái ──────────────────────────────────────────────
router.patch('/:id/trang-thai', async (req, res) => {
  try {
    const { id } = req.params;
    const { trang_thai } = req.body;
    if (!['active', 'inactive'].includes(trang_thai))
      return res.status(400).json({ success: false, message: "Trạng thái phải là 'active' hoặc 'inactive'" });

    const rt = await RoomType.findOne({ where: { RoomTypeId: id, IsDeleted: false } });
    if (!rt)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại!' });

    await rt.update({ Status: trang_thai === 'active' ? 'Active' : 'Inactive' });
    res.json({ success: true, message: `Đã ${trang_thai === 'active' ? 'kích hoạt' : 'tạm dừng'} loại phòng thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE xóa loại phòng (soft delete) ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rt = await RoomType.findOne({ where: { RoomTypeId: id, IsDeleted: false } });
    if (!rt)
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại hoặc đã bị xóa!' });

    // Kiểm tra có phòng vật lý nào đang thuộc loại này không
    const linkedCount = await Room.count({ where: { RoomTypeId: id, IsDeleted: false } });
    if (linkedCount > 0)
      return res.status(400).json({
        success: false,
        message: `Không thể xóa loại phòng "${rt.TypeName}" vì đang có ${linkedCount} phòng trực thuộc!`
      });

    await rt.update({ IsDeleted: true });
    res.json({ success: true, message: `Đã xóa loại phòng "${rt.TypeName}" thành công` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
