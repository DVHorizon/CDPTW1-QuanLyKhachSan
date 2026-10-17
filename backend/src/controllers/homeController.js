const { Branch, RoomType, Room, Amenity, User, Booking, Review } = require('../models');

// ─── Helper: Map RoomType DB record → Vietnamese field names (đồng bộ với /api/loai-phong) ───
function toUIFormat(r) {
  let tien_ich = [];
  try { tien_ich = r.Amenities ? JSON.parse(r.Amenities) : []; } catch (_) {}
  return {
    id:                 r.RoomTypeId,
    ma_loai:            r.TypeCode || String(r.RoomTypeId),
    ten_loai:           r.TypeName,
    mo_ta:              r.Description || '',
    hinh_anh:           r.ImageUrl || '',
    dien_tich:          r.AreaSqm   ?? null,
    so_phong_ton_kho:   r.TotalRooms || 0,
    gia_co_ban:         parseFloat(r.BasePrice) || 0,
    loai_giuong:        r.BedType   || '1 Giường King (2m x 2m)',
    huong_view:         r.ViewType  || 'Hướng Biển (Ocean View)',
    tang_vi_tri:        r.FloorRange || null,
    toi_da_nguoi_lon:   r.AdultCapacity  || 2,
    toi_da_tre_em:      r.ChildCapacity  || 1,
    toi_da_tong:        r.MaxOccupancy   || (r.AdultCapacity || 2) + (r.ChildCapacity || 1),
    thoi_gian_don_phong: r.TurnoverMinutes || 30,
    he_so_cuoi_tuan:    parseFloat(r.WeekendMultiplier) || 1.0,
    tien_ich,
    trang_thai:         r.Status === 'Active' ? 'active' : 'inactive',
    // Alias cho guest search
    RoomTypeId:  r.RoomTypeId,
    TypeName:    r.TypeName,
    BasePrice:   parseFloat(r.BasePrice) || 0,
    ImageUrl:    r.ImageUrl || '',
    MaxOccupancy: r.MaxOccupancy || 2,
  };
}

/**
 * GET /api/home — Dữ liệu tổng hợp cho Trang chủ
 */
exports.getHomeData = async (req, res) => {
  try {
    const [branches, roomTypesRaw, amenities, reviews, totalRooms, totalBookings, totalBranches] =
      await Promise.all([
        Branch.findAll({
          where: { Status: 'Active' },
          attributes: ['BranchId', 'BranchName', 'Address', 'Phone', 'Status'],
          order: [['BranchId', 'ASC']], limit: 10
        }),
        RoomType.findAll({
          where: { Status: 'Active', IsDeleted: false },
          order: [['RoomTypeId', 'ASC']], limit: 6
        }),
        Amenity.findAll({
          attributes: ['AmenityId', 'AmenityName', 'Description', 'IconUrl'],
          order: [['AmenityId', 'ASC']], limit: 8
        }),
        Review.findAll({
          attributes: ['ReviewId', 'ReviewTitle', 'ReviewBody', 'OverallRating', 'TripClassification', 'CreatedAt'],
          include: [{ model: User, as: 'user', attributes: ['FullName'] }],
          order: [['ReviewId', 'ASC']], limit: 4
        }),
        Room.count({ where: { IsDeleted: false } }),
        Booking.count(),
        Branch.count({ where: { Status: 'Active' } }),
      ]);

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu trang chủ thành công',
      data: {
        branches,
        // featuredRoomTypes dùng Vietnamese field names — đồng bộ với /api/loai-phong
        featuredRoomTypes: roomTypesRaw.map(toUIFormat),
        amenities,
        reviews: reviews.map(r => ({
          ReviewId: r.ReviewId,
          ReviewTitle: r.ReviewTitle,
          ReviewBody: r.ReviewBody,
          OverallRating: r.OverallRating,
          TripClassification: r.TripClassification,
          CreatedAt: r.CreatedAt,
          ReviewerName: r.user?.FullName || 'Thượng Khách VIP',
        })),
        stats: { totalRooms, totalBookings, totalBranches, avgRating: 5.0 },
      },
    });
  } catch (error) {
    console.error('Lỗi trong homeController:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * Controller: Lấy danh sách toàn bộ Chi Nhánh
 */
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      order: [['BranchId', 'ASC']]
    });
    return res.status(200).json({ success: true, data: branches });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Controller: Lấy danh sách Hạng phòng (RoomTypes)
 */
exports.getRoomTypes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 12;
    const roomTypes = await RoomType.findAll({
      where: { Status: 'Active', IsDeleted: false },
      order: [['RoomTypeId', 'ASC']],
      limit
    });
    return res.status(200).json({ success: true, data: roomTypes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
