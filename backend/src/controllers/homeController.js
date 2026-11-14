const { Branch, RoomType, Room, Amenity, User, Booking, Review, sequelize } = require('../models');
const { BRANCH_METADATA } = require('./roomSearchController');

/**
 * Controller: Xử lý nghiệp vụ cho Trang chủ theo chuẩn kiến trúc MVC
 */
exports.getHomeData = async (req, res) => {
  try {
    // 1. Model: Lấy danh sách Chi Nhánh hoạt động
    const rawBranches = await Branch.findAll({
      where: { Status: 'Active' },
      attributes: ['BranchId', 'BranchName', 'Address', 'Phone', 'Status'],
      order: [['BranchId', 'ASC']],
      limit: 50
    });

    const branches = rawBranches.map(b => {
      const meta = (BRANCH_METADATA && BRANCH_METADATA[b.BranchId]) || {};
      return {
        BranchId: b.BranchId,
        BranchName: b.BranchName,
        Address: b.Address,
        Phone: b.Phone,
        Status: b.Status,
        City: meta.City || (b.Address ? b.Address.split(',').pop()?.trim() : 'Việt Nam'),
        ImageUrl: meta.ImageUrl || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop',
        Gallery: meta.Gallery || [],
        Rating: meta.Rating || 4.9,
        TotalReviews: meta.TotalReviews || 180,
        Highlight: meta.Highlight || 'Khu nghỉ dưỡng 5 sao thượng lưu tiêu chuẩn quốc tế',
        Tag: meta.Tag || 'Nghỉ dưỡng 5 sao',
        MinPrice: 1850000
      };
    });

    // 2. Model: Lấy danh sách Hạng Phòng nổi bật (RoomTypes)
    const featuredRoomTypes = await RoomType.findAll({
      where: { Status: 'Active', IsDeleted: false },
      attributes: [
        'RoomTypeId', 'TypeName', 'Description', 'BasePrice',
        'MaxOccupancy', 'AdultCapacity', 'ChildCapacity', 'ImageUrl', 'Status'
      ],
      order: [['RoomTypeId', 'ASC']],
      limit: 6
    });

    // 3. Model: Lấy danh sách Tiện nghi cao cấp (Amenities)
    const amenities = await Amenity.findAll({
      attributes: ['AmenityId', 'AmenityName', 'Description', 'IconUrl'],
      order: [['AmenityId', 'ASC']],
      limit: 8
    });

    // 4. Model: Lấy Đánh giá trải nghiệm thực tế từ khách (Review kết hợp User)
    const reviews = await Review.findAll({
      attributes: ['ReviewId', 'ReviewTitle', 'ReviewBody', 'OverallRating', 'TripClassification', 'CreatedAt'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['FullName']
        }
      ],
      order: [['ReviewId', 'ASC']],
      limit: 4
    });

    // Format lại dữ liệu review cho view
    const formattedReviews = reviews.map(r => ({
      ReviewId: r.ReviewId,
      ReviewTitle: r.ReviewTitle,
      ReviewBody: r.ReviewBody,
      OverallRating: r.OverallRating,
      TripClassification: r.TripClassification,
      CreatedAt: r.CreatedAt,
      ReviewerName: r.user?.FullName || 'Thượng Khách VIP'
    }));

    // 5. Model: Đếm thống kê tổng thể
    const [totalRooms, totalBookings, totalBranches] = await Promise.all([
      Room.count({ where: { IsDeleted: false } }),
      Booking.count(),
      Branch.count({ where: { Status: 'Active' } })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu trang chủ theo mô hình MVC thành công',
      data: {
        branches,
        featuredRoomTypes,
        amenities,
        reviews: formattedReviews,
        stats: {
          totalRooms,
          totalBookings,
          totalBranches,
          avgRating: 5.0
        }
      }
    });
  } catch (error) {
    console.error('Lỗi trong homeController (MVC):', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu trang chủ',
      error: error.message
    });
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

const NEWSLETTER_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

/**
 * Controller: Đăng ký nhận bản tin / Hội viên Elite trên Trang Chủ
 * POST /api/newsletter/subscribe
 */
exports.subscribeNewsletter = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fullName = String(req.body?.fullName || req.body?.name || '').trim().slice(0, 120);

    if (!email || !NEWSLETTER_EMAIL_REGEX.test(email) || email.length > 255) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        message: 'Email nhận bản tin không đúng định dạng'
      });
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS NewsletterSubscribers (
        SubscriberId INT AUTO_INCREMENT PRIMARY KEY,
        Email VARCHAR(255) NOT NULL UNIQUE,
        IsActive TINYINT(1) DEFAULT 1,
        SubscribedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await sequelize.query(
      `INSERT INTO NewsletterSubscribers (Email, IsActive, SubscribedAt)
       VALUES (:email, 1, NOW())
       ON DUPLICATE KEY UPDATE IsActive = 1, SubscribedAt = NOW()`,
      { replacements: { email } }
    );

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0011_SUBSCRIBED',
      message: 'Đăng ký nhận bản tin ưu đãi độc quyền thành công!',
      data: {
        email,
        fullName: fullName || null,
        promoCode: 'ELITE10'
      }
    });
  } catch (error) {
    console.error('Lỗi subscribeNewsletter:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Lỗi máy chủ khi đăng ký nhận bản tin'
    });
  }
};
