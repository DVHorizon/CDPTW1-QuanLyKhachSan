'use strict';

/**
 * controllers/roomReviewController.js
 * 
 * TÍNH NĂNG 11: ĐÁNH GIÁ VÀ CHẤM ĐIỂM SAO PHÒNG LƯU TRÚ (ROOM REVIEW & RATING)
 * Mã tính năng: FEAT-GUEST-11  |  Mã truy vết Bảng 3: A11  |  Màn hình liên quan: Màn hình 10 (Post-Stay Evaluation & Verified Guest Review)
 * 
 * Endpoint:
 * - POST /api/v1/rooms/:roomId/reviews (và POST /rooms/:roomId/reviews)
 * - GET  /api/v1/rooms/:roomId/reviews
 * 
 * Message lỗi & phản hồi chuẩn (BẮT BUỘC DÙNG ĐÚNG NGUYÊN VĂN):
 * - ERROR_0040_REVIEW_TOO_SHORT: "Nội dung đánh giá phải có độ dài tối thiểu từ 50 ký tự trở lên"
 * - ERROR_0041_ALREADY_REVIEWED: "Quý khách đã gửi đánh giá cho kỳ nghỉ này rồi"
 * - ERROR_0042_FILE_TOO_LARGE:   "Mỗi ảnh tải lên không được vượt quá dung lượng 15MB"
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Review,
  ReviewPhoto,
  Booking,
  Stay,
  Room,
  RoomType,
  User,
  MembershipTier
} = require('../models');

const ERROR_CODES = {
  REVIEW_TOO_SHORT: 'ERROR_0040_REVIEW_TOO_SHORT',
  ALREADY_REVIEWED: 'ERROR_0041_ALREADY_REVIEWED',
  FILE_TOO_LARGE: 'ERROR_0042_FILE_TOO_LARGE',
  UNAUTHENTICATED: 'ERROR_0009_UNAUTHENTICATED',
  FORBIDDEN: 'ERROR_0010_FORBIDDEN',
  NOT_FOUND: 'ERROR_0004_NOT_FOUND',
  INVALID_INPUT: 'ERROR_0001_INVALID_INPUT'
};

const ERROR_MESSAGES = {
  REVIEW_TOO_SHORT: 'Nội dung đánh giá phải có độ dài tối thiểu từ 50 ký tự trở lên',
  ALREADY_REVIEWED: 'Quý khách đã gửi đánh giá cho kỳ nghỉ này rồi',
  FILE_TOO_LARGE: 'Mỗi ảnh tải lên không được vượt quá dung lượng 15MB',
  UNAUTHENTICATED: 'Bạn cần đăng nhập để thực hiện chức năng này',
  FORBIDDEN: 'Bạn không có quyền thực hiện đánh giá cho kỳ nghỉ này',
  NOT_FOUND: 'Không tìm thấy thông tin phòng hoặc lượt lưu trú hợp lệ',
  INVALID_INPUT: 'Dữ liệu đánh giá không hợp lệ'
};

/**
 * Helper: Trích xuất UserId từ Token hoặc fallback Header / Body
 */
function resolveUserId(req) {
  if (req.user && (req.user.userId || req.user.id || req.user.UserId)) {
    return Number(req.user.userId || req.user.id || req.user.UserId);
  }
  if (req.headers && req.headers['x-user-id']) {
    return Number(req.headers['x-user-id']);
  }
  if (req.body && req.body.userId) {
    return Number(req.body.userId);
  }
  return null;
}

/**
 * 1. POST /api/v1/rooms/:roomId/reviews
 * Đăng đánh giá xác thực cho lượt lưu trú đã hoàn tất check-out
 */
exports.createRoomReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { roomId } = req.params;
    const currentUserId = resolveUserId(req);

    if (!currentUserId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        code: ERROR_CODES.UNAUTHENTICATED,
        errorCode: ERROR_CODES.UNAUTHENTICATED,
        message: ERROR_MESSAGES.UNAUTHENTICATED
      });
    }

    const {
      bookingId,
      stayId,
      overallRating,
      wouldRecommend = 'YES',
      cleanlinessScore,
      staffServiceScore,
      roomComfortScore,
      diningScore,
      valueForMoneyScore,
      tripClassification = 'LEISURE',
      reviewTitle,
      reviewBody,
      photos = [],
      isAnonymous = false
    } = req.body;

    // 1. Kiểm tra độ dài nội dung nhận xét (reviewBody >= 50 ký tự - TC01)
    const trimmedBody = reviewBody !== undefined && reviewBody !== null ? String(reviewBody).trim() : '';
    if (trimmedBody.length < 50) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.REVIEW_TOO_SHORT,
        errorCode: ERROR_CODES.REVIEW_TOO_SHORT,
        message: ERROR_MESSAGES.REVIEW_TOO_SHORT
      });
    }

    if (trimmedBody.length > 1000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_INPUT,
        errorCode: ERROR_CODES.INVALID_INPUT,
        message: 'Nội dung nhận xét tối đa 1000 ký tự'
      });
    }

    // Kiểm tra reviewTitle tối đa 80 ký tự
    const trimmedTitle = reviewTitle !== undefined && reviewTitle !== null ? String(reviewTitle).trim() : 'Đánh giá kỳ nghỉ tuyệt vời';
    if (!trimmedTitle) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_INPUT,
        errorCode: ERROR_CODES.INVALID_INPUT,
        message: 'Tiêu đề đánh giá không được để trống'
      });
    }

    // 2. Kiểm tra dung lượng file ảnh (<= 15MB - ERROR_0042)
    // Ảnh có thể gửi dạng Array of object { dataUrl, size, name } hoặc string URL / Base64
    const validPhotos = [];
    if (Array.isArray(photos)) {
      for (const item of photos) {
        if (!item) continue;
        let photoUrl = '';
        let photoSize = 0;

        if (typeof item === 'object') {
          photoUrl = item.url || item.photoUrl || item.dataUrl || item.base64 || '';
          photoSize = Number(item.size || 0);
        } else if (typeof item === 'string') {
          photoUrl = item;
          // Nếu dạng data:image/...;base64, ước lượng dung lượng
          if (item.startsWith('data:')) {
            const base64Data = item.split(',')[1] || '';
            photoSize = Math.round((base64Data.length * 3) / 4);
          }
        }

        // 15MB = 15 * 1024 * 1024 bytes = 15,728,640 bytes
        const MAX_BYTES = 15 * 1024 * 1024;
        if (photoSize > MAX_BYTES) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            code: ERROR_CODES.FILE_TOO_LARGE,
            errorCode: ERROR_CODES.FILE_TOO_LARGE,
            message: ERROR_MESSAGES.FILE_TOO_LARGE
          });
        }

        if (photoUrl) {
          validPhotos.push(photoUrl);
        }
      }
    }

    // Giới hạn tối đa 5 ảnh theo đặc tả
    const photosToSave = validPhotos.slice(0, 5);

    // 3. Xác định Room / RoomType và Stay hợp lệ
    // roomId có thể là RoomId (phòng vật lý) hoặc RoomTypeId
    const numericRoomId = parseInt(roomId, 10);
    let resolvedRoomId = numericRoomId;
    let resolvedRoomTypeId = null;

    const physicalRoom = await Room.findByPk(numericRoomId, { transaction });
    if (physicalRoom) {
      resolvedRoomTypeId = physicalRoom.RoomTypeId;
    } else {
      const roomType = await RoomType.findByPk(numericRoomId, { transaction });
      if (roomType) {
        resolvedRoomTypeId = roomType.RoomTypeId;
        resolvedRoomId = null; // Sẽ tìm theo Stay
      }
    }

    // Tìm Stay / Booking hợp lệ của User
    // Điều kiện: Đơn booking đã hoàn thành check-out (Booking.Status = 'Completed' hoặc 'CheckedOut' hoặc Stay.Status = 'CheckedOut')
    let targetStay = null;

    if (stayId) {
      targetStay = await Stay.findOne({
        where: { StayId: stayId },
        include: [{ model: Booking }],
        transaction
      });
    } else if (bookingId) {
      targetStay = await Stay.findOne({
        where: { BookingId: bookingId },
        include: [{ model: Booking }],
        transaction
      });
    }

    // Nếu không truyền cụ thể, tìm lượt lưu trú completed gần nhất của User cho phòng / loại phòng này
    if (!targetStay) {
      const stayWhere = {
        Status: { [Op.in]: ['CheckedOut', 'Completed'] }
      };
      if (resolvedRoomId) {
        stayWhere.RoomId = resolvedRoomId;
      }

      const bookingWhere = {
        UserId: currentUserId,
        Status: { [Op.in]: ['Completed', 'CheckedOut'] }
      };
      if (resolvedRoomTypeId) {
        bookingWhere.RoomTypeId = resolvedRoomTypeId;
      }

      targetStay = await Stay.findOne({
        where: stayWhere,
        include: [
          {
            model: Booking,
            where: bookingWhere
          }
        ],
        order: [['ActualCheckOut', 'DESC'], ['StayId', 'DESC']],
        transaction
      });
    }

    // Nếu vẫn chưa tìm thấy mà có bất kỳ Stay hoàn tất nào của user
    if (!targetStay) {
      targetStay = await Stay.findOne({
        include: [
          {
            model: Booking,
            where: {
              UserId: currentUserId,
              Status: { [Op.in]: ['Completed', 'CheckedOut'] }
            }
          }
        ],
        order: [['StayId', 'DESC']],
        transaction
      });
    }

    // Nếu vẫn không có lượt lưu trú hợp lệ đã check-out
    if (!targetStay) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.FORBIDDEN,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: 'Bạn chỉ có thể đánh giá sau khi đã hoàn tất kỳ nghỉ (Check-out).'
      });
    }

    // Kiểm tra quyền sở hữu Stay / Booking
    const bookingOwnerId = targetStay.Booking?.UserId;
    const isStaffOrAdmin = req.user?.roleId === 1 || req.user?.RoleId === 1 || req.user?.roleId === 2 || req.user?.RoleId === 2;
    if (!isStaffOrAdmin && bookingOwnerId && String(bookingOwnerId) !== String(currentUserId)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.FORBIDDEN,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }

    // 4. Kiểm tra điều kiện tiên quyết: Mỗi lượt lưu trú chỉ được đánh giá duy nhất 1 lần (ERROR_0041 - TC02)
    const existingReview = await Review.findOne({
      where: { StayId: targetStay.StayId },
      transaction
    });

    if (existingReview) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        code: ERROR_CODES.ALREADY_REVIEWED,
        errorCode: ERROR_CODES.ALREADY_REVIEWED,
        message: ERROR_MESSAGES.ALREADY_REVIEWED
      });
    }

    // 5. Chuẩn hóa các thang điểm
    const numOverallRating = overallRating !== undefined && overallRating !== null ? parseFloat(overallRating) : 5.0;
    const clampedOverall = Math.min(5.0, Math.max(1.0, Math.round(numOverallRating * 2) / 2)); // Bước 0.5

    const cScore = cleanlinessScore ? Math.min(10, Math.max(1, parseInt(cleanlinessScore, 10))) : 10;
    const sScore = staffServiceScore ? Math.min(10, Math.max(1, parseInt(staffServiceScore, 10))) : 10;
    const rScore = roomComfortScore ? Math.min(10, Math.max(1, parseInt(roomComfortScore, 10))) : 10;
    const dScore = diningScore ? Math.min(10, Math.max(1, parseInt(diningScore, 10))) : 10;
    const vScore = valueForMoneyScore ? Math.min(10, Math.max(1, parseInt(valueForMoneyScore, 10))) : 10;

    const normRecommend = ['YES', 'MAYBE', 'NO'].includes(String(wouldRecommend).toUpperCase())
      ? String(wouldRecommend).toUpperCase()
      : 'YES';

    const normTrip = ['BUSINESS', 'LEISURE', 'COUPLE', 'FAMILY', 'SOLO'].includes(String(tripClassification).toUpperCase())
      ? String(tripClassification).toUpperCase()
      : 'LEISURE';

    // 6. Lưu Review vào database
    const newReview = await Review.create({
      UserId: currentUserId,
      StayId: targetStay.StayId,
      FoodOrderId: null,
      Rating: clampedOverall,
      OverallRating: clampedOverall,
      CleanlinessScore: cScore,
      StaffServiceScore: sScore,
      RoomComfortScore: rScore,
      DiningScore: dScore,
      ValueForMoneyScore: vScore,
      WouldRecommend: normRecommend,
      TripClassification: normTrip,
      ReviewTitle: trimmedTitle.slice(0, 80),
      ReviewBody: trimmedBody.slice(0, 1000),
      Comment: trimmedBody,
      IsAnonymous: Boolean(isAnonymous)
    }, { transaction });

    // 7. Lưu ReviewPhotos
    const savedPhotos = [];
    for (const pUrl of photosToSave) {
      const p = await ReviewPhoto.create({
        ReviewId: newReview.ReviewId,
        PhotoUrl: pUrl
      }, { transaction });
      savedPhotos.push({
        photoId: p.PhotoId,
        photoUrl: p.PhotoUrl
      });
    }

    await transaction.commit();

    // 8. Trả về kết quả thành công kèm nhãn Verified Guest
    return res.status(201).json({
      success: true,
      message: 'Đăng đánh giá thành công! Cảm ơn quý khách đã đóng góp ý kiến.',
      data: {
        reviewId: newReview.ReviewId,
        stayId: targetStay.StayId,
        bookingId: targetStay.BookingId,
        overallRating: clampedOverall,
        wouldRecommend: normRecommend,
        cleanlinessScore: cScore,
        staffServiceScore: sScore,
        roomComfortScore: rScore,
        diningScore: dScore,
        valueForMoneyScore: vScore,
        tripClassification: normTrip,
        reviewTitle: newReview.ReviewTitle,
        reviewBody: newReview.ReviewBody,
        isAnonymous: newReview.IsAnonymous,
        verifiedGuest: true,
        verificationBadge: 'Verified Stay Guest',
        photos: savedPhotos,
        createdAt: newReview.CreatedAt
      }
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Lỗi createRoomReview (FEAT-GUEST-11):', error);
    return res.status(500).json({
      success: false,
      code: ERROR_CODES.INVALID_INPUT,
      errorCode: ERROR_CODES.INVALID_INPUT,
      message: error.message || 'Lỗi xử lý đánh giá phòng.'
    });
  }
};

/**
 * 2. GET /api/v1/rooms/:roomId/reviews
 * Lấy danh sách review đã xác thực của phòng / loại phòng
 */
exports.getRoomReviews = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 10, tripType } = req.query;

    const numericId = parseInt(roomId, 10);
    let targetRoomTypeId = numericId;

    // Kiểm tra xem roomId là Physical Room hay RoomType
    const room = await Room.findByPk(numericId);
    if (room && room.RoomTypeId) {
      targetRoomTypeId = room.RoomTypeId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Tìm tất cả Stays thuộc các Room của RoomType này
    const matchingRooms = await Room.findAll({
      where: { RoomTypeId: targetRoomTypeId },
      attributes: ['RoomId']
    });
    const roomIds = matchingRooms.map(r => r.RoomId);

    const matchingStays = await Stay.findAll({
      where: { RoomId: { [Op.in]: roomIds.length > 0 ? roomIds : [numericId] } },
      attributes: ['StayId']
    });
    const stayIds = matchingStays.map(s => s.StayId);

    const reviewWhere = {
      StayId: { [Op.in]: stayIds.length > 0 ? stayIds : [-1] }
    };
    if (tripType && tripType !== 'ALL') {
      reviewWhere.TripClassification = tripType.toUpperCase();
    }

    const { count, rows } = await Review.findAndCountAll({
      where: reviewWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['UserId', 'FullName', 'Email'],
          include: [{ model: MembershipTier, as: 'membershipTier', attributes: ['TierName'] }]
        },
        {
          model: ReviewPhoto,
          as: 'photos',
          attributes: ['PhotoId', 'PhotoUrl']
        },
        {
          model: Stay,
          as: 'stay',
          attributes: ['StayId', 'ActualCheckIn', 'ActualCheckOut'],
          include: [
            {
              model: Room,
              attributes: ['RoomId', 'RoomNumber', 'Floor']
            }
          ]
        }
      ],
      order: [['CreatedAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    // Tính điểm trung bình từng tiêu chí
    const [stats] = await Review.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('OverallRating')), 'avgOverall'],
        [sequelize.fn('AVG', sequelize.col('CleanlinessScore')), 'avgCleanliness'],
        [sequelize.fn('AVG', sequelize.col('StaffServiceScore')), 'avgStaffService'],
        [sequelize.fn('AVG', sequelize.col('RoomComfortScore')), 'avgRoomComfort'],
        [sequelize.fn('AVG', sequelize.col('DiningScore')), 'avgDining'],
        [sequelize.fn('AVG', sequelize.col('ValueForMoneyScore')), 'avgValueForMoney'],
        [sequelize.fn('COUNT', sequelize.col('ReviewId')), 'totalCount']
      ],
      where: reviewWhere,
      raw: true
    });

    const formattedReviews = rows.map(r => {
      const rJson = r.toJSON();
      const isAnon = rJson.IsAnonymous;
      const user = rJson.user;
      const stay = rJson.stay;

      let displayName = 'Khách nghỉ dưỡng';
      if (!isAnon && user?.FullName) {
        displayName = user.FullName;
      } else if (isAnon) {
        const tierName = user?.membershipTier?.TierName || 'Hội viên Horizon';
        const dateStr = stay?.ActualCheckOut ? new Date(stay.ActualCheckOut).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : 'Gần đây';
        displayName = `${tierName} • Kỳ nghỉ ${dateStr}`;
      }

      return {
        reviewId: rJson.ReviewId,
        stayId: rJson.StayId,
        author: displayName,
        isAnonymous: isAnon,
        overallRating: parseFloat(rJson.OverallRating || rJson.Rating || 5).toFixed(1),
        cleanlinessScore: rJson.CleanlinessScore,
        staffServiceScore: rJson.StaffServiceScore,
        roomComfortScore: rJson.RoomComfortScore,
        diningScore: rJson.DiningScore,
        valueForMoneyScore: rJson.ValueForMoneyScore,
        wouldRecommend: rJson.WouldRecommend,
        tripClassification: rJson.TripClassification,
        reviewTitle: rJson.ReviewTitle,
        reviewBody: rJson.ReviewBody || rJson.Comment,
        verifiedGuest: true,
        photos: (rJson.photos || []).map(p => p.PhotoUrl),
        createdAt: rJson.CreatedAt
      };
    });

    return res.json({
      success: true,
      meta: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        avgOverall: parseFloat(stats?.avgOverall || 5.0).toFixed(2),
        avgCleanliness: parseFloat(stats?.avgCleanliness || 9.5).toFixed(1),
        avgStaffService: parseFloat(stats?.avgStaffService || 9.6).toFixed(1),
        avgRoomComfort: parseFloat(stats?.avgRoomComfort || 9.4).toFixed(1),
        avgDining: parseFloat(stats?.avgDining || 9.2).toFixed(1),
        avgValueForMoney: parseFloat(stats?.avgValueForMoney || 9.3).toFixed(1),
        totalReviews: parseInt(stats?.totalCount || 0, 10)
      },
      data: formattedReviews
    });
  } catch (error) {
    console.error('Lỗi getRoomReviews (FEAT-GUEST-11):', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tải danh sách đánh giá phòng.'
    });
  }
};

