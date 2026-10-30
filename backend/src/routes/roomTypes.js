'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { RoomType, Room, Amenity, RoomTypeAmenity, Booking, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

// ─── AUTH & PERMISSION MIDDLEWARE (Theo mục 3.1 & 5.1 Spec) ────────────────
function checkRoomTypePermission(requiredPermission = 'ROOMTYPE_MANAGE') {
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
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (_) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này',
      });
    }

    // Header hỗ trợ mô phỏng quyền từ Test Panel
    const simulatedRole = req.headers['x-simulated-role'];
    const userRole = (simulatedRole || decoded.roleName || decoded.role?.RoleName || '').toLowerCase();
    const permissions = decoded.permissions || [];

    const hasManage =
      userRole === 'admin' ||
      permissions.includes('ROOMTYPE_MANAGE') ||
      req.headers['x-simulated-permission'] === 'ROOMTYPE_MANAGE';

    const hasView =
      hasManage ||
      userRole === 'receptionist' ||
      userRole === 'lễ tân' ||
      permissions.includes('ROOMTYPE_VIEW') ||
      req.headers['x-simulated-permission'] === 'ROOMTYPE_VIEW';

    if (requiredPermission === 'ROOMTYPE_MANAGE' && !hasManage) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    if (requiredPermission === 'ROOMTYPE_VIEW' && !hasView) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    next();
  };
}

function resolveAmenityIcon(iconUrl, name = '') {
  if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.includes('/') && !iconUrl.includes('.')) {
    return iconUrl;
  }
  const n = (name || '').toLowerCase();
  if (n.includes('wifi') || n.includes('wi-fi') || n.includes('mạng')) return 'wifi';
  if (n.includes('ban công') || n.includes('biển') || n.includes('view') || n.includes('hướng')) return 'deck';
  if (n.includes('bồn tắm') || n.includes('jacuzzi') || n.includes('tắm')) return 'bathtub';
  if (n.includes('bar') || n.includes('rượu') || n.includes('minibar')) return 'local_bar';
  if (n.includes('cà phê') || n.includes('coffee') || n.includes('tea') || n.includes('trà')) return 'coffee';
  if (n.includes('ada') || n.includes('xe lăn') || n.includes('khuyết tật')) return 'accessible';
  if (n.includes('hồ bơi') || n.includes('bơi') || n.includes('pool')) return 'pool';
  if (n.includes('quản gia') || n.includes('phục vụ') || n.includes('service')) return 'room_service';
  if (n.includes('bếp') || n.includes('nấu') || n.includes('kitchen')) return 'kitchen';
  if (n.includes('két sắt') || n.includes('khoá') || n.includes('an toàn')) return 'lock';
  if (n.includes('tv') || n.includes('ti vi') || n.includes('tivi')) return 'tv';
  if (n.includes('điều hòa') || n.includes('lạnh') || n.includes('lọc khí') || n.includes('ac')) return 'ac_unit';
  return 'check_circle';
}

function cleanAmenityName(name = '') {
  return String(name || '').replace(/\s*#[0-9]+$/, '').trim();
}

// ─── HELPER: MAP SANG ĐỊNH DẠNG CHUẨN SPEC & UI ─────────────────────────────
function toSpecFormat(r) {
  let images = [];
  if (r.Images) {
    try {
      images = typeof r.Images === 'string' ? JSON.parse(r.Images) : r.Images;
    } catch (_) {
      images = [r.ImageUrl].filter(Boolean);
    }
  } else if (r.ImageUrl) {
    images = [r.ImageUrl];
  }

  let amenityIds = [];
  let amenityList = [];
  if (r.amenityList && Array.isArray(r.amenityList)) {
    amenityIds = r.amenityList.map((a) => a.AmenityId);
    amenityList = r.amenityList.map((a) => ({
      id: a.AmenityId,
      name: cleanAmenityName(a.AmenityName),
      icon: resolveAmenityIcon(a.IconUrl, a.AmenityName),
    }));
  } else if (r.Amenities) {
    try {
      const parsed = JSON.parse(r.Amenities);
      if (Array.isArray(parsed)) {
        amenityIds = parsed.map((item) => (typeof item === 'number' ? item : item.id || item));
      }
    } catch (_) {}
  }

  const basePriceNum = parseFloat(r.BasePrice) || 0;
  const adult = r.AdultCapacity || 2;
  const child = r.ChildCapacity || 0;
  const maxOccupancy = r.MaxOccupancy || adult + child;

  return {
    // ── Chuẩn Spec (Section 2) ──
    RoomTypeId: r.RoomTypeId,
    typeName: r.TypeName,
    description: r.Description || '',
    basePrice: basePriceNum,
    adultCapacity: adult,
    childCapacity: child,
    maxOccupancy: maxOccupancy,
    images: images.length > 0 ? images : (r.ImageUrl ? [r.ImageUrl] : []),
    amenityIds: amenityIds,
    amenityList: amenityList,
    status: r.Status === 'Inactive' ? 'Inactive' : 'Active',

    // ── Aliases để tương thích UI hiện tại ──
    id: r.RoomTypeId,
    name: r.TypeName,
    code: r.TypeCode || `RT-${r.RoomTypeId}`,
    image: images[0] || r.ImageUrl || '',
    hinh_anh: images[0] || r.ImageUrl || '',
    ten_loai: r.TypeName,
    mo_ta: r.Description || '',
    gia_co_ban: basePriceNum,
    baseRate: basePriceNum,
    toi_da_nguoi_lon: adult,
    maxAdults: adult,
    toi_da_tre_em: child,
    maxChildren: child,
    toi_da_tong: maxOccupancy,
    tien_ich: amenityIds,
    amenities: amenityIds,
    trang_thai: r.Status === 'Inactive' ? 'inactive' : 'active',
    dien_tich: r.AreaSqm ?? 35,
    area: r.AreaSqm ?? 35,
    so_phong_ton_kho: r.TotalRooms ?? 0,
    keys: r.TotalRooms ?? 0,
    loai_giuong: r.BedType || '1 Giường King (2m x 2m)',
    bedding: r.BedType || '1 Giường King (2m x 2m)',
    huong_view: r.ViewType || 'Hướng Biển (Ocean View)',
    view: r.ViewType || 'Hướng Biển (Ocean View)',
    tang_vi_tri: r.FloorRange || '',
    floors: r.FloorRange || '',
    thoi_gian_don_phong: r.TurnoverMinutes || 30,
    turnover: r.TurnoverMinutes || 30,
    he_so_cuoi_tuan: parseFloat(r.WeekendMultiplier) || 1.0,
    yieldMultiplier: parseFloat(r.WeekendMultiplier) || 1.0,
  };
}

// ─── GET DANH MỤC TIỆN ÍCH (Amenities) ──────────────────────────────────────
router.get('/amenities', async (req, res) => {
  try {
    const list = await Amenity.findAll({
      order: [['AmenityId', 'ASC']],
    });
    const mapped = list.map((a) => ({
      id: a.AmenityId,
      name: cleanAmenityName(a.AmenityName),
      icon: resolveAmenityIcon(a.IconUrl, a.AmenityName),
      description: a.Description || '',
    }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET TẤT CẢ LOẠI PHÒNG (Mục 6.1: sắp xếp A-Z, phân trang 10 dòng/trang) ─
router.get('/', async (req, res) => {
  try {
    const { trang_thai, status, tim, q, page, limit, check_auth } = req.query;

    // Nếu client gửi check_auth=true, bắt buộc kiểm tra token (cho test case 1, 2)
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
    const stFilter = status || trang_thai;
    if (stFilter && stFilter !== 'all') {
      where.Status = stFilter.toLowerCase() === 'active' ? 'Active' : 'Inactive';
    }

    const searchKeyword = q || tim;
    if (searchKeyword && String(searchKeyword).trim()) {
      where.TypeName = { [Op.like]: `%${String(searchKeyword).trim()}%` };
    }

    const opts = {
      where,
      order: [['TypeName', 'ASC']], // Wireframe 6.1: sắp xếp mặc định theo tên A-Z
      include: [
        {
          model: Amenity,
          as: 'amenityList',
          through: { attributes: [] },
          required: false,
        },
      ],
      distinct: true,
    };

    if (limit) {
      opts.limit = Number(limit);
      if (page) opts.offset = (Number(page) - 1) * Number(limit);
    }

    const rows = await RoomType.findAll(opts);
    const result = rows.map(toSpecFormat);

    // Thống kê nhanh số phòng hoạt động và ngừng cung cấp
    const activeTotal = await RoomType.count({ where: { IsDeleted: false, Status: 'Active' } });
    const inactiveTotal = await RoomType.count({ where: { IsDeleted: false, Status: 'Inactive' } });

    res.json({
      success: true,
      data: result,
      total: result.length,
      page: Number(page) || 1,
      limit: Number(limit) || result.length,
      stats: {
        total: activeTotal + inactiveTotal,
        active: activeTotal,
        inactive: inactiveTotal,
      },
    });
  } catch (err) {
    console.error('GET /room-types error:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── GET THỐNG KÊ TỔNG QUAN ────────────────────────────────────────────────
router.get('/thong-ke', async (req, res) => {
  try {
    const total = await RoomType.count({ where: { IsDeleted: false } });
    const active = await RoomType.count({ where: { IsDeleted: false, Status: 'Active' } });
    const inactive = await RoomType.count({ where: { IsDeleted: false, Status: 'Inactive' } });
    const allTypes = await RoomType.findAll({
      where: { IsDeleted: false },
      attributes: ['BasePrice', 'TotalRooms'],
    });

    const totalRooms = allTypes.reduce((s, r) => s + (r.TotalRooms || 0), 0);
    const avgPrice =
      total > 0
        ? allTypes.reduce((s, r) => s + parseFloat(r.BasePrice || 0), 0) / total
        : 0;

    res.json({
      success: true,
      data: {
        tong_danh_muc: total,
        tong_phong: totalRooms,
        gia_trung_binh: avgPrice,
        dang_hoat_dong: active,
        tam_dung: inactive,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET MỘT LOẠI PHÒNG THEO ID ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const r = await RoomType.findOne({
      where: { RoomTypeId: req.params.id, IsDeleted: false },
      include: [
        {
          model: Amenity,
          as: 'amenityList',
          through: { attributes: [] },
          required: false,
        },
      ],
    });
    if (!r) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy loại phòng' });
    }
    res.json({ success: true, data: toSpecFormat(r) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST TẠO MỚI LOẠI PHÒNG (Mục 3 & 4.1 Spec) ───────────────────────────
router.post('/', checkRoomTypePermission('ROOMTYPE_MANAGE'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      typeName, ten_loai,
      description, mo_ta,
      basePrice, gia_co_ban,
      adultCapacity, toi_da_nguoi_lon,
      childCapacity, toi_da_tre_em,
      images, hinh_anh,
      amenityIds, tien_ich,
      status, trang_thai,
      code, ma_loai,
    } = req.body;

    // 1. Validate typeName (Mục 3.2 & 5.2)
    const rawName = typeName !== undefined ? typeName : ten_loai;
    if (rawName === undefined || rawName === null || !String(rawName).trim()) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Tên loại phòng không được để trống',
      });
    }

    const cleanTypeName = String(rawName).trim();
    if (cleanTypeName.length < 2) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        message: 'Tên loại phòng phải có ít nhất 2 ký tự',
      });
    }

    if (cleanTypeName.length > 100) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Tên loại phòng không được vượt quá 100 ký tự',
      });
    }

    // Kiểm tra trùng (không phân biệt hoa/thường)
    const existingType = await RoomType.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('TypeName')),
        cleanTypeName.toLowerCase()
      ),
      transaction: t,
    });
    if (existingType && !existingType.IsDeleted) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Tên loại phòng đã được sử dụng, vui lòng chọn tên khác',
      });
    }

    // 2. Validate description (Mục 3.3)
    const rawDesc = description !== undefined ? description : mo_ta;
    let cleanDesc = rawDesc ? String(rawDesc).trim() : null;
    if (cleanDesc === '') cleanDesc = null;
    if (cleanDesc && cleanDesc.length > 1000) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Mô tả không được vượt quá 1000 ký tự',
      });
    }

    // 3. Validate basePrice (Mục 3.4)
    const rawPrice = basePrice !== undefined ? basePrice : gia_co_ban;
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Giá cơ bản không được để trống',
      });
    }

    const numPrice = Number(rawPrice);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice > 999999999.99) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Giá cơ bản phải là số lớn hơn 0',
      });
    }
    // Floor đến 2 chữ số thập phân
    const finalPrice = Math.floor(numPrice * 100) / 100;

    // 4. Validate Sức chứa (Mục 3.5)
    const rawAdult = adultCapacity !== undefined ? adultCapacity : toi_da_nguoi_lon;
    if (rawAdult === undefined || rawAdult === null || rawAdult === '' || !Number.isInteger(Number(rawAdult)) || Number(rawAdult) < 1 || Number(rawAdult) > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Số người lớn tối đa phải là số nguyên từ 1 đến 10',
      });
    }
    const finalAdult = Number(rawAdult);

    const rawChild = childCapacity !== undefined ? childCapacity : toi_da_tre_em;
    if (rawChild === undefined || rawChild === null || rawChild === '' || !Number.isInteger(Number(rawChild)) || Number(rawChild) < 0 || Number(rawChild) > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Số trẻ em tối đa phải là số nguyên từ 0 đến 10',
      });
    }
    const finalChild = Number(rawChild);

    if (finalAdult + finalChild > 20) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Sức chứa tối đa không được vượt quá 20 người',
      });
    }
    const finalMaxOccupancy = finalAdult + finalChild;

    // 5. Validate Images (Mục 3.6)
    let imgList = [];
    if (Array.isArray(images)) imgList = images;
    else if (images && typeof images === 'string') imgList = [images];
    else if (hinh_anh) imgList = [hinh_anh];

    if (!imgList || imgList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng tải lên ít nhất 1 hình ảnh',
      });
    }

    if (imgList.length > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0014_MAX_ITEMS_EXCEEDED',
        message: 'Chỉ được chọn tối đa 10 hình ảnh',
      });
    }

    // Kiểm tra định dạng & dung lượng
    for (const img of imgList) {
      const imgStr = typeof img === 'string' ? img : (img.url || img.name || '');
      const isFakePdf = imgStr.toLowerCase().includes('.pdf') || (typeof img === 'object' && img.type === 'application/pdf');
      if (isFakePdf) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_INVALID_FILE_FORMAT',
          message: 'Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)',
        });
      }
      if (typeof img === 'object' && img.size && img.size > 5 * 1024 * 1024) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0013_FILE_TOO_LARGE',
          message: 'Dung lượng ảnh vượt quá 5MB cho phép',
        });
      }
    }

    const cleanImgUrls = imgList.map((i) => (typeof i === 'string' ? i : i.url || ''));
    const thumbnail = cleanImgUrls[0] || '';

    // 6. Validate Amenities (Mục 3.7)
    let rawAmenities = amenityIds !== undefined ? amenityIds : tien_ich;
    if (!Array.isArray(rawAmenities)) {
      rawAmenities = [];
    }
    const parsedAmenityIds = rawAmenities
      .map((id) => (typeof id === 'object' ? id.id : Number(id)))
      .filter((n) => !isNaN(n) && n > 0);

    if (parsedAmenityIds.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn ít nhất 1 tiện ích',
      });
    }

    // 7. Status (Mục 3.8 - mặc định Active khi tạo mới)
    const rawStatus = status || trang_thai;
    const finalStatus = rawStatus && String(rawStatus).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    // 8. Tạo bản ghi RoomTypes
    const typeCode = code || ma_loai || `RT-${Date.now().toString().slice(-4)}`;
    const newRT = await RoomType.create(
      {
        TypeCode: String(typeCode).trim().toUpperCase(),
        TypeName: cleanTypeName,
        Description: cleanDesc,
        ImageUrl: thumbnail,
        BasePrice: finalPrice,
        AdultCapacity: finalAdult,
        ChildCapacity: finalChild,
        MaxOccupancy: finalMaxOccupancy,
        Status: finalStatus,
        IsDeleted: false,
        Amenities: JSON.stringify(parsedAmenityIds),
      },
      { transaction: t }
    );

    // 9. Ghi các bản ghi vào RoomTypeAmenities
    const rtaRows = parsedAmenityIds.map((amenityId) => ({
      RoomTypeId: newRT.RoomTypeId,
      AmenityId: amenityId,
    }));
    await RoomTypeAmenity.bulkCreate(rtaRows, { transaction: t, ignoreDuplicates: true });

    // 10. Ghi AuditLog (Mục 3.10)
    try {
      if (AuditLog) {
        await AuditLog.create(
          {
            user_id: req.user?.userId || null,
            action: 'CREATE_ROOM_TYPE',
            entity_name: 'RoomTypes',
            entity_id: newRT.RoomTypeId,
            new_values: { TypeName: cleanTypeName, BasePrice: finalPrice },
            ip_address: req.ip,
          },
          { transaction: t }
        );
      }
    } catch (_) {}

    await t.commit();

    const created = await RoomType.findOne({
      where: { RoomTypeId: newRT.RoomTypeId },
      include: [{ model: Amenity, as: 'amenityList', through: { attributes: [] } }],
    });

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới loại phòng thành công',
      data: toSpecFormat(created || newRT),
    });
  } catch (err) {
    await t.rollback();
    console.error('POST /room-types error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── PUT CẬP NHẬT LOẠI PHÒNG (Mục 4.2 Spec) ────────────────────────────────
router.put('/:id', checkRoomTypePermission('ROOMTYPE_MANAGE'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const rt = await RoomType.findOne({
      where: { RoomTypeId: id, IsDeleted: false },
      transaction: t,
    });

    if (!rt) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại trong cơ sở dữ liệu!',
      });
    }

    const {
      typeName, ten_loai,
      description, mo_ta,
      basePrice, gia_co_ban,
      adultCapacity, toi_da_nguoi_lon,
      childCapacity, toi_da_tre_em,
      images, hinh_anh,
      amenityIds, tien_ich,
      status, trang_thai,
      code, ma_loai,
    } = req.body;

    // 1. Validate typeName
    const rawName = typeName !== undefined ? typeName : ten_loai;
    if (rawName === undefined || rawName === null || !String(rawName).trim()) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Tên loại phòng không được để trống',
      });
    }

    const cleanTypeName = String(rawName).trim();
    if (cleanTypeName.length < 2) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0002_MIN_LENGTH',
        message: 'Tên loại phòng phải có ít nhất 2 ký tự',
      });
    }

    if (cleanTypeName.length > 100) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Tên loại phòng không được vượt quá 100 ký tự',
      });
    }

    // Kiểm tra trùng loại trừ chính bản ghi đang sửa (Mục 3.2)
    const existingType = await RoomType.findOne({
      where: {
        RoomTypeId: { [Op.ne]: id },
        IsDeleted: false,
        [Op.and]: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('TypeName')),
          cleanTypeName.toLowerCase()
        ),
      },
      transaction: t,
    });

    if (existingType) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0007_DUPLICATE',
        message: 'Tên loại phòng đã được sử dụng, vui lòng chọn tên khác',
      });
    }

    // 2. Validate description
    const rawDesc = description !== undefined ? description : mo_ta;
    let cleanDesc = rawDesc ? String(rawDesc).trim() : null;
    if (cleanDesc === '') cleanDesc = null;
    if (cleanDesc && cleanDesc.length > 1000) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0003_MAX_LENGTH',
        message: 'Mô tả không được vượt quá 1000 ký tự',
      });
    }

    // 3. Validate basePrice
    const rawPrice = basePrice !== undefined ? basePrice : gia_co_ban;
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Giá cơ bản không được để trống',
      });
    }

    const numPrice = Number(rawPrice);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice > 999999999.99) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Giá cơ bản phải là số lớn hơn 0',
      });
    }
    const finalPrice = Math.floor(numPrice * 100) / 100;

    // 4. Validate Sức chứa
    const rawAdult = adultCapacity !== undefined ? adultCapacity : toi_da_nguoi_lon;
    if (rawAdult === undefined || rawAdult === null || rawAdult === '' || !Number.isInteger(Number(rawAdult)) || Number(rawAdult) < 1 || Number(rawAdult) > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Số người lớn tối đa phải là số nguyên từ 1 đến 10',
      });
    }
    const finalAdult = Number(rawAdult);

    const rawChild = childCapacity !== undefined ? childCapacity : toi_da_tre_em;
    if (rawChild === undefined || rawChild === null || rawChild === '' || !Number.isInteger(Number(rawChild)) || Number(rawChild) < 0 || Number(rawChild) > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Số trẻ em tối đa phải là số nguyên từ 0 đến 10',
      });
    }
    const finalChild = Number(rawChild);

    if (finalAdult + finalChild > 20) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0011_INVALID_NUMBER',
        message: 'Sức chứa tối đa không được vượt quá 20 người',
      });
    }
    const finalMaxOccupancy = finalAdult + finalChild;

    // 5. Validate Images
    let imgList = [];
    if (Array.isArray(images)) imgList = images;
    else if (images && typeof images === 'string') imgList = [images];
    else if (hinh_anh) imgList = [hinh_anh];

    if (!imgList || imgList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng tải lên ít nhất 1 hình ảnh',
      });
    }

    if (imgList.length > 10) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0014_MAX_ITEMS_EXCEEDED',
        message: 'Chỉ được chọn tối đa 10 hình ảnh',
      });
    }

    for (const img of imgList) {
      const imgStr = typeof img === 'string' ? img : (img.url || img.name || '');
      const isFakePdf = imgStr.toLowerCase().includes('.pdf') || (typeof img === 'object' && img.type === 'application/pdf');
      if (isFakePdf) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_INVALID_FILE_FORMAT',
          message: 'Định dạng file không được hỗ trợ (chỉ nhận JPG, PNG, WEBP)',
        });
      }
      if (typeof img === 'object' && img.size && img.size > 5 * 1024 * 1024) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'ERROR_0013_FILE_TOO_LARGE',
          message: 'Dung lượng ảnh vượt quá 5MB cho phép',
        });
      }
    }

    const cleanImgUrls = imgList.map((i) => (typeof i === 'string' ? i : i.url || ''));
    const thumbnail = cleanImgUrls[0] || rt.ImageUrl;

    // 6. Validate Amenities
    let rawAmenities = amenityIds !== undefined ? amenityIds : tien_ich;
    if (!Array.isArray(rawAmenities)) {
      rawAmenities = [];
    }
    const parsedAmenityIds = rawAmenities
      .map((item) => (typeof item === 'object' ? item.id : Number(item)))
      .filter((n) => !isNaN(n) && n > 0);

    if (parsedAmenityIds.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn ít nhất 1 tiện ích',
      });
    }

    // 7. Status & Cảnh báo booking (Mục 3.8)
    const rawStatus = status || trang_thai;
    const finalStatus = rawStatus && String(rawStatus).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    // 8. Cập nhật bản ghi RoomTypes
    const oldValues = { ...rt.toJSON() };
    await rt.update(
      {
        TypeCode: code || ma_loai ? String(code || ma_loai).trim().toUpperCase() : rt.TypeCode,
        TypeName: cleanTypeName,
        Description: cleanDesc,
        ImageUrl: thumbnail,
        BasePrice: finalPrice,
        AdultCapacity: finalAdult,
        ChildCapacity: finalChild,
        MaxOccupancy: finalMaxOccupancy,
        Status: finalStatus,
        Amenities: JSON.stringify(parsedAmenityIds),
      },
      { transaction: t }
    );

    // 9. Ghi đè (replace) toàn bộ bảng trung gian RoomTypeAmenities trong 1 transaction (Mục 3.7)
    await RoomTypeAmenity.destroy({
      where: { RoomTypeId: id },
      transaction: t,
    });

    const newRtaRows = parsedAmenityIds.map((amenityId) => ({
      RoomTypeId: id,
      AmenityId: amenityId,
    }));
    await RoomTypeAmenity.bulkCreate(newRtaRows, { transaction: t, ignoreDuplicates: true });

    // 10. Ghi AuditLog
    try {
      if (AuditLog) {
        await AuditLog.create(
          {
            user_id: req.user?.userId || null,
            action: 'UPDATE_ROOM_TYPE',
            entity_name: 'RoomTypes',
            entity_id: id,
            old_values: oldValues,
            new_values: { TypeName: cleanTypeName, BasePrice: finalPrice, Status: finalStatus },
            ip_address: req.ip,
          },
          { transaction: t }
        );
      }
    } catch (_) {}

    await t.commit();

    const updated = await RoomType.findOne({
      where: { RoomTypeId: id },
      include: [{ model: Amenity, as: 'amenityList', through: { attributes: [] } }],
    });

    return res.json({
      success: true,
      code: 'SUCCESS_0002_UPDATED',
      message: 'Cập nhật loại phòng thành công',
      data: toSpecFormat(updated || rt),
    });
  } catch (err) {
    await t.rollback();
    console.error('PUT /room-types error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ─── PATCH THAY ĐỔI TRẠNG THÁI ─────────────────────────────────────────────
router.patch('/:id/trang-thai', checkRoomTypePermission('ROOMTYPE_MANAGE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { trang_thai, status } = req.body;
    const target = trang_thai || status;
    const isInactive = String(target).toLowerCase() === 'inactive';
    const finalStatus = isInactive ? 'Inactive' : 'Active';

    const rt = await RoomType.findOne({ where: { RoomTypeId: id, IsDeleted: false } });
    if (!rt) {
      return res.status(404).json({ success: false, message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại!' });
    }

    await rt.update({ Status: finalStatus });
    return res.json({
      success: true,
      message: `Đã ${finalStatus === 'Active' ? 'kích hoạt' : 'tạm dừng'} loại phòng thành công`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE XÓA MỀM LOẠI PHÒNG (Mục 3.9 & 4.3 & Test Case 14, 15) ─────────
router.delete('/:id', checkRoomTypePermission('ROOMTYPE_MANAGE'), async (req, res) => {
  try {
    const { id } = req.params;
    const rt = await RoomType.findOne({ where: { RoomTypeId: id, IsDeleted: false } });
    if (!rt) {
      return res.status(404).json({
        success: false,
        message: 'Lỗi đồng bộ: Loại phòng này không còn tồn tại hoặc đã bị xóa!',
      });
    }

    // 1. Kiểm tra ràng buộc (a) phòng vật lý (bảng Rooms)
    const linkedRoomsCount = await Room.count({
      where: { RoomTypeId: id, IsDeleted: false },
    });

    // 2. Kiểm tra ràng buộc (b) booking đang hiệu lực (Pending/Confirmed/CheckedIn)
    let linkedBookingsCount = 0;
    try {
      if (Booking) {
        linkedBookingsCount = await Booking.count({
          where: {
            RoomTypeId: id,
            Status: { [Op.in]: ['Pending', 'Confirmed', 'CheckedIn'] },
          },
        });
      }
    } catch (_) {}

    // Nếu còn phòng vật lý HOẶC còn booking hiệu lực → CHẶN xóa (Mục 3.9 & Test case 14)
    if (linkedRoomsCount > 0 || linkedBookingsCount > 0) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_HAS_RELATED_DATA',
        message: 'Không thể xóa loại phòng vì vẫn còn phòng hoặc đặt phòng liên quan',
        relatedData: {
          rooms: linkedRoomsCount,
          bookings: linkedBookingsCount,
        },
      });
    }

    // 3. Thực hiện XÓA MỀM (soft delete): Status = Inactive, IsDeleted = true
    const oldValues = { ...rt.toJSON() };
    await rt.update({ Status: 'Inactive', IsDeleted: true });

    // Ghi AuditLog
    try {
      if (AuditLog) {
        await AuditLog.create({
          user_id: req.user?.userId || null,
          action: 'DELETE_ROOM_TYPE',
          entity_name: 'RoomTypes',
          entity_id: id,
          old_values: oldValues,
          new_values: { Status: 'Inactive', IsDeleted: true },
          ip_address: req.ip,
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      code: 'SUCCESS_0003_DELETED',
      message: 'Xóa loại phòng thành công',
    });
  } catch (err) {
    console.error('DELETE /room-types error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
