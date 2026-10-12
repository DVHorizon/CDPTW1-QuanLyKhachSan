const pool = require('../config/db');

// Fallback images cho phòng không có ảnh
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200&auto=format&fit=crop',
];

// Gán Category dựa vào tên phòng / sức chứa
function inferCategory(typeName, maxOccupancy) {
  const name = (typeName || '').toLowerCase();
  if (name.includes('villa') || name.includes('biệt thự') || name.includes('bungalow')) return 'villa';
  if (name.includes('suite') || name.includes('penthouse') || name.includes('presidential')) return 'suite';
  if (name.includes('family') || name.includes('gia đình') || (maxOccupancy >= 4)) return 'family';
  return 'deluxe';
}

// Gán ViewType dựa vào tên phòng
function inferViewType(typeName) {
  const name = (typeName || '').toLowerCase();
  if (name.includes('ocean') || name.includes('biển') || name.includes('beach')) return 'Trực diện biển';
  if (name.includes('garden') || name.includes('vườn')) return 'Vườn nhiệt đới';
  if (name.includes('pool') || name.includes('hồ bơi')) return 'Hướng hồ bơi';
  if (name.includes('mountain') || name.includes('núi')) return 'Hướng núi';
  return 'Cảnh quan resort';
}

// Gán Badge dựa vào category
function inferBadge(category, idx) {
  const badges = {
    villa: 'Biệt Thự Cao Cấp',
    suite: 'Suite 5 Sao',
    family: 'Dành Cho Gia Đình',
    deluxe: 'Grand Horizon 5 Sao',
  };
  return badges[category] || 'Grand Horizon 5 Sao';
}

/**
 * Controller: Xử lý nghiệp vụ cho Trang chủ (dùng mysql2/promise để đảm bảo encoding utf8mb4)
 */
exports.getHomeData = async (req, res) => {
  try {
    // 1. Lấy danh sách Chi Nhánh hoạt động
    const [branches] = await pool.query(
      'SELECT BranchId, BranchName, Address, Phone, Status FROM Branches WHERE Status = ? ORDER BY BranchId ASC LIMIT 10',
      ['Active']
    );

    // 2. Lấy danh sách Hạng Phòng nổi bật
    const [roomTypesRaw] = await pool.query(
      'SELECT RoomTypeId, TypeName, Description, BasePrice, MaxOccupancy, AdultCapacity, ChildCapacity, ImageUrl, Status FROM RoomTypes WHERE Status = ? AND IsDeleted = 0 ORDER BY RoomTypeId ASC LIMIT 6',
      ['Active']
    );

    // Enrich dữ liệu RoomType với các trường frontend cần
    const featuredRoomTypes = roomTypesRaw.map((rt, idx) => {
      const category = inferCategory(rt.TypeName, rt.MaxOccupancy);
      const imageUrl = rt.ImageUrl || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
      return {
        RoomTypeId: rt.RoomTypeId,
        TypeName: rt.TypeName,
        Description: rt.Description,
        BasePrice: parseFloat(rt.BasePrice),
        MaxOccupancy: rt.MaxOccupancy,
        AdultCapacity: rt.AdultCapacity,
        ChildCapacity: rt.ChildCapacity,
        ImageUrl: imageUrl,
        Status: rt.Status,
        Category: category,
        ViewType: inferViewType(rt.TypeName),
        Badge: inferBadge(category, idx),
        SizeM2: 55 + idx * 15, // Ước lượng diện tích theo thứ tự
        BedType: rt.AdultCapacity <= 2 ? '1 Giường King' : '1 Giường King + Giường phụ',
        Rating: 4.8 + (idx % 3) * 0.1,
        TotalReviews: 42 + idx * 17,
        Gallery: [imageUrl],
      };
    });

    // 3. Lấy danh sách Tiện nghi cao cấp
    const [amenities] = await pool.query(
      'SELECT AmenityId, AmenityName, Description, IconUrl FROM Amenities ORDER BY AmenityId ASC LIMIT 8'
    );

    // 4. Lấy Đánh giá từ khách hàng
    let reviews = [];
    try {
      const [reviewRows] = await pool.query(
        `SELECT r.ReviewId, r.ReviewTitle, r.ReviewBody, r.OverallRating, r.TripClassification, r.CreatedAt,
                u.FullName AS ReviewerName
         FROM Reviews r
         LEFT JOIN Users u ON r.UserId = u.UserId
         ORDER BY r.ReviewId ASC LIMIT 4`
      );
      reviews = reviewRows.map(r => ({
        ReviewId: r.ReviewId,
        ReviewTitle: r.ReviewTitle,
        ReviewBody: r.ReviewBody,
        OverallRating: r.OverallRating,
        TripClassification: r.TripClassification,
        CreatedAt: r.CreatedAt,
        ReviewerName: r.ReviewerName || 'Thượng Khách VIP',
      }));
    } catch (e) {
      // Reviews table có thể chưa có dữ liệu
    }

    // 5. Thống kê tổng thể
    let stats = { totalRooms: 0, totalBookings: 0, totalBranches: branches.length, avgRating: 5.0 };
    try {
      const [[roomCount]] = await pool.query('SELECT COUNT(*) AS cnt FROM Rooms WHERE IsDeleted = 0');
      const [[bookingCount]] = await pool.query('SELECT COUNT(*) AS cnt FROM Bookings');
      stats.totalRooms = roomCount.cnt;
      stats.totalBookings = bookingCount.cnt;
    } catch (e) { /* ignore */ }

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu trang chủ thành công',
      data: {
        branches,
        featuredRoomTypes,
        amenities,
        reviews,
        stats,
      },
    });
  } catch (error) {
    console.error('Lỗi trong homeController:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu trang chủ',
      error: error.message,
    });
  }
};

/**
 * Controller: Lấy danh sách toàn bộ Chi Nhánh
 */
exports.getBranches = async (req, res) => {
  try {
    const [branches] = await pool.query('SELECT * FROM Branches ORDER BY BranchId ASC');
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
    const [roomTypes] = await pool.query(
      'SELECT * FROM RoomTypes WHERE Status = ? AND IsDeleted = 0 ORDER BY RoomTypeId ASC LIMIT ?',
      ['Active', limit]
    );
    return res.status(200).json({ success: true, data: roomTypes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
