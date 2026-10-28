'use strict';

const { sequelize, Branch, RoomType, Room, Booking } = require('../models');
const { Op } = require('sequelize');
const searchEngine = require('../services/searchEngine');

/**
 * Trả về chuỗi ngày hiện tại YYYY-MM-DD theo giờ địa phương
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Dữ liệu bổ trợ phong phú cho các loại phòng (đặc tả kiến trúc, view, diện tích, review)
 */
const ROOM_METADATA = {
  1: {
    category: 'Suite Cao Cấp',
    badge: 'Hạng Thượng Tuyển',
    view: 'Biển Trực Diện',
    bedType: '1 King Siêu Lớn',
    area: '65 m²',
    floorRange: 'Tầng 12 - 18',
    rating: 4.9,
    reviewCount: 128,
    includedServices: [
      'Bao gồm Buffet Sáng 5*',
      'Đón tiễn sân bay VIP',
      'Hủy miễn phí trước 48h'
    ],
    amenities: [
      'Bể bơi vô cực',
      'Bồn tắm nằm Jacuzzi',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'WiFi tốc độ cao 500Mbps'
    ]
  },
  2: {
    category: 'Villa Riêng Tư',
    badge: 'Biệt Thự Tổng Thống',
    view: 'Trực diện biển',
    bedType: '2 King Suites',
    area: '220 m²',
    floorRange: 'Sát mép biển',
    rating: 5.0,
    reviewCount: 64,
    includedServices: [
      'Quản gia riêng phục vụ 24/7',
      'Tiệc trà chiều Sunset High Tea',
      'Champagne chào mừng cao cấp'
    ],
    amenities: [
      'Hồ bơi riêng (Private Pool)',
      'Bồn tắm nằm Jacuzzi',
      'Dịch vụ quản gia 24/7',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo'
    ]
  },
  3: {
    category: 'Deluxe Hướng Biển',
    badge: 'Tự Nhiên & Tĩnh Tại',
    view: 'Hướng vườn',
    bedType: '1 King / 2 Twins',
    area: '48 m²',
    floorRange: 'Tầng Trệt Biệt Lập',
    rating: 4.8,
    reviewCount: 210,
    includedServices: [
      'Bữa sáng tự chọn tại Nhà hàng Sen',
      'Wi-Fi Tốc độ cao 500Mbps',
      'Ưu đãi 15% Dịch vụ Spa'
    ],
    amenities: [
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'WiFi Tốc độ cao',
      'Dịch vụ Spa thư giãn'
    ]
  },
  4: {
    category: 'Suite Cao Cấp',
    badge: 'Thượng Tuyển Hướng Biển',
    view: 'Trực diện biển',
    bedType: '1 King Siêu Lớn',
    area: '85 m²',
    floorRange: 'Tầng 8 - 14',
    rating: 4.9,
    reviewCount: 95,
    includedServices: [
      'Bữa sáng Buffet quốc tế',
      'Tiệc trà chiều Sunset High Tea',
      'Đưa đón sân bay riêng'
    ],
    amenities: [
      'Bồn tắm nằm Jacuzzi',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'Dịch vụ quản gia 24/7'
    ]
  },
  5: {
    category: 'Standard Garden',
    badge: 'Ốc Đảo Xanh Mát',
    view: 'Hướng vườn',
    bedType: '1 King / 2 Twins',
    area: '42 m²',
    floorRange: 'Tầng 1 - 3',
    rating: 4.7,
    reviewCount: 88,
    includedServices: [
      'Buffet sáng tự chọn',
      'Wi-Fi tốc độ cao miễn phí',
      'Trà và cà phê Nespresso'
    ],
    amenities: [
      'Bữa sáng Buffet kèm theo',
      'Ban công sân vườn',
      'WiFi Tốc độ cao'
    ]
  },
  6: {
    category: 'Villa Riêng Tư',
    badge: 'Đỉnh Cao Xa Hoa',
    view: 'Trực diện biển',
    bedType: '3 King Suites',
    area: '350 m²',
    floorRange: 'Tầng Thượng Penthouse',
    rating: 5.0,
    reviewCount: 42,
    includedServices: [
      'Quản gia cá nhân 24/7',
      'Hồ bơi vô cực trên mây',
      'Xe Limousine đưa đón tận nơi'
    ],
    amenities: [
      'Hồ bơi riêng (Private Pool)',
      'Bồn tắm nằm Jacuzzi',
      'Dịch vụ quản gia 24/7',
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo'
    ]
  },
  7: {
    category: 'Villa Riêng Tư',
    badge: 'Ốc Đảo Biệt Lập',
    view: 'Hướng hồ bơi',
    bedType: '2 King Suites',
    area: '180 m²',
    floorRange: 'Khu Biệt Thự Hồ Bơi',
    rating: 4.9,
    reviewCount: 76,
    includedServices: [
      'Hồ bơi riêng 50m²',
      'Tiệc BBQ bãi biển riêng',
      'Buffet sáng thượng hạng'
    ],
    amenities: [
      'Hồ bơi riêng (Private Pool)',
      'Bồn tắm nằm Jacuzzi',
      'Bữa sáng Buffet kèm theo'
    ]
  },
  8: {
    category: 'Deluxe Hướng Biển',
    badge: 'Đại Dương Khoáng Đạt',
    view: 'Trực diện biển',
    bedType: '1 King Bed',
    area: '52 m²',
    floorRange: 'Tầng 5 - 10',
    rating: 4.8,
    reviewCount: 154,
    includedServices: [
      'Buffet sáng tại nhà hàng Ocean',
      'Ban công ngắm bình minh',
      'Miễn phí minibar ngày đầu'
    ],
    amenities: [
      'Ban công ngắm hoàng hôn',
      'Bữa sáng Buffet kèm theo',
      'WiFi Tốc độ cao'
    ]
  }
};

/**
 * Controller tìm kiếm phòng (FEAT-GUEST-02 / A2)
 * GET /api/v1/rooms/search
 */
exports.searchRooms = async (req, res) => {
  try {
    const {
      branchId,
      checkInDate,
      checkOutDate,
      totalGuests = 2,
      keyword = '',
      priceMin,
      priceMax,
      roomTypes: roomTypesFilter,
      view: viewFilter,
      amenities: amenitiesFilter,
      rating: ratingFilter,
      sortBy = 'price_asc'
    } = req.query;

    const todayStr = getTodayString();

    // ─── BƯỚC 1: VALIDATE RÀNG BUỘC NGÀY LƯU TRÚ (TC01, TC02, TC03) ───
    if (!checkInDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0012_DATE_PAST',
        message: 'Ngày nhận phòng không được để trống'
      });
    }

    // TC01: checkInDate < Today
    if (checkInDate < todayStr) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0012_DATE_PAST',
        message: 'Ngày nhận phòng không được ở trong quá khứ'
      });
    }

    if (!checkOutDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0013_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng không được để trống'
      });
    }

    // TC02: checkOutDate <= checkInDate
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0013_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm'
      });
    }

    // Tính số đêm lưu trú
    const d1 = new Date(checkInDate + 'T00:00:00');
    const d2 = new Date(checkOutDate + 'T00:00:00');
    const numberOfNights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));

    if (numberOfNights < 1) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0013_INVALID_DATE_RANGE',
        message: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm'
      });
    }

    // TC03: numberOfNights > 30
    if (numberOfNights > 30) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0018_MAX_STAY_EXCEEDED',
        message: 'Hệ thống chỉ hỗ trợ đặt phòng tối đa 30 đêm trực tuyến'
      });
    }

    // ─── BƯỚC 2: VALIDATE TỪ KHÓA (KEYWORD) ───
    let cleanKeyword = '';
    if (keyword && typeof keyword === 'string') {
      cleanKeyword = keyword.trim();
      if (cleanKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          errorCode: 'ERROR_0003_MAX_LENGTH',
          message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự'
        });
      }
    }

    // Validate số lượng khách
    const guests = parseInt(totalGuests, 10) || 2;
    const validatedGuests = Math.max(1, Math.min(guests, 20));

    // Validate chi nhánh nếu có truyền vào
    let targetBranchId = null;
    let branchName = 'Tất Cả Chi Nhánh';
    if (branchId && branchId !== 'all' && branchId !== '') {
      targetBranchId = parseInt(branchId, 10);
      const branchRow = await Branch.findOne({
        where: { BranchId: targetBranchId, Status: 'Active' }
      });
      if (!branchRow) {
        return res.status(404).json({
          success: false,
          errorCode: 'ERROR_0014_NO_RESULT',
          message: 'Chi nhánh được chọn không tồn tại hoặc đã ngừng hoạt động'
        });
      }
      branchName = branchRow.BranchName;
    }

    // ─── BƯỚC 3: THUẬT TOÁN QUÉT PHÒNG KHẢ DỤNG & TRÙNG LỊCH ───
    // 3.1. Xác định các RoomTypes khả dụng theo chi nhánh
    let candidateRoomTypeIds = null;
    if (targetBranchId) {
      const branchRooms = await Room.findAll({
        where: { BranchId: targetBranchId, IsDeleted: false },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('RoomTypeId')), 'RoomTypeId']],
        raw: true
      });
      candidateRoomTypeIds = branchRooms.map(r => r.RoomTypeId);
      if (candidateRoomTypeIds.length === 0) {
        return res.status(200).json({
          success: true,
          errorCode: 'ERROR_0014_NO_RESULT',
          message: 'Không tìm thấy phòng trống phù hợp với khoảng thời gian đã chọn',
          data: [],
          total: 0,
          criteria: {
            branchId: targetBranchId,
            branchName,
            checkInDate,
            checkOutDate,
            numberOfNights,
            totalGuests: validatedGuests,
            keyword: cleanKeyword
          }
        });
      }
    } else {
      // Khi không chọn chi nhánh, ưu tiên các hạng phòng mẫu tiêu biểu (1..20)
      const topRooms = await Room.findAll({
        where: { BranchId: { [Op.in]: [1, 2, 3] }, IsDeleted: false },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('RoomTypeId')), 'RoomTypeId']],
        raw: true
      });
      candidateRoomTypeIds = topRooms.map(r => r.RoomTypeId);
    }

    const roomTypeWhere = {
      Status: 'Active',
      IsDeleted: false,
      MaxOccupancy: { [Op.gte]: validatedGuests }
    };

    if (candidateRoomTypeIds && candidateRoomTypeIds.length > 0) {
      roomTypeWhere.RoomTypeId = { [Op.in]: candidateRoomTypeIds };
    }

    const candidateRoomTypes = await RoomType.findAll({
      where: roomTypeWhere,
      order: [['BasePrice', 'ASC']],
      limit: 50
    });

    const availableRoomsList = [];

    for (const rt of candidateRoomTypes) {
      const rtId = rt.RoomTypeId;

      // Tính tổng số phòng vật lý của RoomType này
      const roomWhere = {
        RoomTypeId: rtId,
        IsDeleted: false
      };
      if (targetBranchId) {
        roomWhere.BranchId = targetBranchId;
      }

      // Tổng số phòng vật lý
      const totalPhysical = await Room.count({ where: roomWhere });
      if (totalPhysical === 0) continue;

      // Số phòng đang bảo trì / hỏng hóc (Status IN ('Maintenance', 'OutOfOrder'))
      const maintenanceRooms = await Room.count({
        where: {
          ...roomWhere,
          Status: { [Op.in]: ['Maintenance', 'OutOfOrder'] }
        }
      });

      // Số phòng vật lý sẵn sàng hoạt động
      const operationalRooms = totalPhysical - maintenanceRooms;
      if (operationalRooms <= 0) continue;

      // 3.2. Thuật toán kiểm tra trùng lịch (Overlap Bookings):
      // Điều kiện trùng lịch: (Booking.CheckInDate < checkOutDate) AND (Booking.CheckOutDate > checkInDate)
      // Booking Status IN ('Pending', 'Confirmed', 'CheckedIn')
      const overlappingBookings = await Booking.findAll({
        attributes: ['BookingId', 'RoomQuantity'],
        where: {
          RoomTypeId: rtId,
          Status: { [Op.in]: ['Pending', 'Confirmed', 'CheckedIn'] },
          CheckInDate: { [Op.lt]: checkOutDate },
          CheckOutDate: { [Op.gt]: checkInDate }
        }
      });

      const bookedCount = overlappingBookings.reduce(
        (sum, b) => sum + (b.RoomQuantity || 1),
        0
      );

      // Công thức: Available = Tổng phòng vật lý - Bảo trì - Trùng lịch
      const availableRooms = operationalRooms - bookedCount;

      // Một loại phòng chỉ hiển thị nếu AvailableRooms >= 1
      if (availableRooms >= 1) {
        const meta = ROOM_METADATA[rtId] || {
          category: rt.MaxOccupancy >= 5 ? 'Villa Riêng Tư' : rt.MaxOccupancy >= 4 ? 'Suite Cao Cấp' : 'Deluxe Hướng Biển',
          badge: 'Hạng Phòng Tiêu Chuẩn',
          view: 'Trực diện biển',
          bedType: '1 King Siêu Lớn',
          area: '55 m²',
          floorRange: 'Tầng 5 - 12',
          rating: 4.8,
          reviewCount: 85,
          includedServices: ['Bao gồm Buffet Sáng', 'WiFi Tốc độ cao', 'Hủy miễn phí trước 48h'],
          amenities: ['Bữa sáng Buffet kèm theo', 'WiFi tốc độ cao', 'Ban công ngắm hoàng hôn']
        };

        const basePriceNum = parseFloat(rt.BasePrice);
        const originalPriceNum = Math.round(basePriceNum * 1.25);
        const totalPrice = basePriceNum * numberOfNights;

        availableRoomsList.push({
          RoomTypeId: rtId,
          TypeName: rt.TypeName,
          Description: rt.Description,
          BasePrice: basePriceNum,
          OriginalPrice: originalPriceNum,
          TotalPrice: totalPrice,
          NumberOfNights: numberOfNights,
          MaxOccupancy: rt.MaxOccupancy,
          AdultCapacity: rt.AdultCapacity,
          ChildCapacity: rt.ChildCapacity,
          ImageUrl: rt.ImageUrl,
          AvailableRooms: availableRooms,
          IsLimited: availableRooms <= 2,
          BranchId: targetBranchId,
          BranchName: branchName,
          Category: meta.category,
          Badge: meta.badge,
          View: meta.view,
          BedType: meta.bedType,
          Area: meta.area,
          FloorRange: meta.floorRange,
          Rating: meta.rating,
          ReviewCount: meta.reviewCount,
          IncludedServices: meta.includedServices,
          amenities: meta.amenities
        });
      }
    }

    // ─── BƯỚC 4: SỬ DỤNG SEARCH ENGINE (FUSE.JS + NLP TỪ KHÓA TỰ DO) ───
    const searchEngineResult = searchEngine.search(availableRoomsList, cleanKeyword);
    let filteredResults = searchEngineResult.results;

    // ─── BƯỚC 5: ÁP DỤNG CÁC BỘ LỌC TÙY CHỌN (SIDEBAR FILTERS) ───
    // Lọc theo giá
    if (priceMin) {
      const min = parseFloat(priceMin);
      if (!isNaN(min)) filteredResults = filteredResults.filter(r => r.BasePrice >= min);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      if (!isNaN(max)) filteredResults = filteredResults.filter(r => r.BasePrice <= max);
    }

    // Lọc theo Hạng phòng & Biệt thự (checkboxes)
    if (roomTypesFilter) {
      const types = Array.isArray(roomTypesFilter)
        ? roomTypesFilter
        : roomTypesFilter.split(',').map(t => t.trim().toLowerCase());
      if (types.length > 0) {
        filteredResults = filteredResults.filter(r =>
          types.some(t => (r.Category || '').toLowerCase().includes(t) || (r.TypeName || '').toLowerCase().includes(t))
        );
      }
    }

    // Lọc theo Tầm nhìn (View)
    if (viewFilter && viewFilter !== 'all' && viewFilter !== 'Tất cả') {
      const cleanView = viewFilter.toLowerCase();
      filteredResults = filteredResults.filter(r =>
        (r.View || '').toLowerCase().includes(cleanView)
      );
    }

    // Lọc theo Tiện nghi (Amenities)
    if (amenitiesFilter) {
      const amenitiesList = Array.isArray(amenitiesFilter)
        ? amenitiesFilter
        : amenitiesFilter.split(',').map(a => a.trim().toLowerCase());
      if (amenitiesList.length > 0) {
        filteredResults = filteredResults.filter(r =>
          amenitiesList.some(amenity =>
            (r.amenities || []).some(a => a.toLowerCase().includes(amenity))
          )
        );
      }
    }

    // Lọc theo đánh giá (Rating)
    if (ratingFilter) {
      const minRating = parseFloat(ratingFilter);
      if (!isNaN(minRating)) {
        filteredResults = filteredResults.filter(r => (r.Rating || 5.0) >= minRating);
      }
    }

    // ─── BƯỚC 6: SẮP XẾP KẾT QUẢ ───
    if (sortBy === 'price_asc') {
      filteredResults.sort((a, b) => a.BasePrice - b.BasePrice);
    } else if (sortBy === 'price_desc') {
      filteredResults.sort((a, b) => b.BasePrice - a.BasePrice);
    } else if (sortBy === 'rating_desc') {
      filteredResults.sort((a, b) => (b.Rating || 0) - (a.Rating || 0));
    } else if (sortBy === 'popular') {
      filteredResults.sort((a, b) => (b.ReviewCount || 0) - (a.ReviewCount || 0));
    }

    // ─── BƯỚC 7: TRẢ VỀ PHẢN HỒI THEO ĐẶC TẢ (TC04, TC05) ───
    if (filteredResults.length === 0) {
      return res.status(200).json({
        success: true,
        errorCode: 'ERROR_0014_NO_RESULT',
        message: 'Không tìm thấy phòng trống phù hợp với khoảng thời gian đã chọn',
        data: [],
        total: 0,
        criteria: {
          branchId: targetBranchId,
          branchName,
          checkInDate,
          checkOutDate,
          numberOfNights,
          totalGuests: validatedGuests,
          keyword: cleanKeyword
        },
        searchEngine: searchEngineResult.metadata
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Tìm kiếm phòng thành công',
      data: filteredResults,
      total: filteredResults.length,
      criteria: {
        branchId: targetBranchId,
        branchName,
        checkInDate,
        checkOutDate,
        numberOfNights,
        totalGuests: validatedGuests,
        keyword: cleanKeyword
      },
      searchEngine: searchEngineResult.metadata
    });
  } catch (error) {
    console.error('Lỗi khi tìm kiếm phòng:', error);
    return res.status(500).json({
      success: false,
      errorCode: 'ERROR_5000_INTERNAL',
      message: 'Đã xảy ra lỗi trên máy chủ khi quét phòng trống',
      error: error.message
    });
  }
};

/**
 * Lấy danh sách các chi nhánh hoạt động phục vụ selector
 * GET /api/v1/rooms/branches
 */
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      where: { Status: 'Active' },
      attributes: ['BranchId', 'BranchName', 'Address', 'Phone', 'Status'],
      order: [['BranchId', 'ASC']],
      limit: 20
    });
    return res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chi nhánh:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách chi nhánh'
    });
  }
};

/**
 * Lấy thông tin chi tiết một loại phòng
 * GET /api/v1/rooms/:id
 */
exports.getRoomDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findByPk(id);
    if (!roomType || roomType.IsDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy loại phòng này'
      });
    }

    const meta = ROOM_METADATA[roomType.RoomTypeId] || {};
    return res.json({
      success: true,
      data: {
        ...roomType.toJSON(),
        ...meta
      }
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết loại phòng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

/**
 * Suggester Endpoint (Autocomplete tìm kiếm tức thì theo 1-2 ký tự)
 * GET /api/v1/rooms/suggest?q=...
 */
exports.suggestRooms = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        data: {
          keyword: '',
          roomSuggestions: [],
          amenitySuggestions: [],
          keywordSuggestions: [],
          totalCount: 0
        }
      });
    }

    // Lấy danh sách hạng phòng đang hoạt động
    const roomTypes = await RoomType.findAll({
      where: { Status: 'Active', IsDeleted: false },
      attributes: ['RoomTypeId', 'TypeName', 'Description', 'BasePrice', 'ImageUrl', 'MaxOccupancy'],
      limit: 50
    });

    const roomList = roomTypes.map(rt => {
      const meta = ROOM_METADATA[rt.RoomTypeId] || {};
      return {
        ...rt.toJSON(),
        Category: meta.category || (rt.MaxOccupancy >= 5 ? 'Villa Riêng Tư' : rt.MaxOccupancy >= 4 ? 'Suite Cao Cấp' : 'Deluxe Hướng Biển'),
        Badge: meta.badge || 'Grand Horizon',
        View: meta.view || 'Hướng biển',
        amenities: meta.amenities || []
      };
    });

    const suggestions = searchEngine.suggest(roomList, q);

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý tìm kiếm:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy gợi ý'
    });
  }
};

