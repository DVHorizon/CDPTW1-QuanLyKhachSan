'use strict';

const { RoomType, Amenity, Room } = require('../models');
const { Op } = require('sequelize');

/**
 * Metadata mở rộng cho các phòng nhằm hiển thị phong phú 9 tiêu chí
 * (Diện tích, Sức chứa, Cấu hình giường, Hướng view, Hồ bơi, Dịch vụ quản gia, Tiện nghi phòng tắm, Giải trí & smart home, v.v.)
 */
const ROOM_METADATA = {
  1: {
    category: 'Hạng Vườn Tự Nhiên',
    view: 'Vườn Nhiệt Đới & Rừng Thông',
    viewDesc: 'Hiên gỗ teak riêng biệt tĩnh lặng',
    bedConfig: '1 Giường King',
    bedDesc: 'Đệm cao su thiên nhiên 100% hữu cơ',
    area: '115 m²',
    capacityDesc: '2 người lớn + 1 trẻ em dưới 6 tuổi',
    pool: 'Hồ Bơi Vô Cực Chính',
    poolDesc: 'Sử dụng chung với khu vực resort (3 hồ)',
    hasPrivatePool: false,
    butler: 'Phục Vụ Bữa Ăn Tiêu Chuẩn',
    butlerDesc: 'Dùng bữa tại nhà hàng hoặc gọi món phòng',
    hasPrivateButler: false,
    bathroom: 'Vòi Sen Mưa Đá Khối Monolith',
    bathroomDesc: 'Dược mỹ phẩm hữu cơ Acqua di Parma',
    smartHome: 'TV OLED 65" + Loa Marshall',
    smartHomeDesc: 'Điều khiển đèn cảm ứng cơ bản',
    badge: 'Khởi điểm thư thái',
    availableRooms: 4
  },
  2: {
    category: 'Đẳng Cấp Tầm Cao',
    view: 'Trực Diện Hoàng Hôn Bãi Trường',
    viewDesc: 'Góc nhìn panorama tầng cao không góc khuất',
    bedConfig: '1 Giường California King',
    bedDesc: 'Ngoại cỡ 2.2m × 2.0m, lụa tơ tằm Bảo Lộc',
    area: '160 m²',
    capacityDesc: '3 người lớn (hoặc 2 lớn + 2 trẻ em)',
    pool: 'Hồ Bơi Nước Ấm Tràn Viền 18 m²',
    poolDesc: 'Bố trí ngay ban công riêng tầng cao',
    hasPrivatePool: true,
    butler: 'Quản Gia Riêng (08:00 - 22:00)',
    butlerDesc: 'Hỗ trợ setup trà chiều & đặt chỗ ưu tiên',
    hasPrivateButler: true,
    bathroom: 'Bồn Tắm Ngắm Biển + Xông Hơi Ướt',
    bathroomDesc: 'Trang bị phòng xông hơi ướt steam bath',
    smartHome: 'TV OLED 75" + Dàn Âm Thanh Devialet',
    smartHomeDesc: 'Máy tính bảng điều khiển toàn phòng Lutron',
    badge: 'Khuyến nghị cho lứa đôi',
    isPopular: true,
    highlightOffer: 'Ưu đãi kèm 01 set trà chiều hoàng hôn',
    breakfastIncluded: 'Bao gồm buffet sáng cao cấp',
    availableRooms: 2
  },
  3: {
    category: 'Tối Thượng Tột Bậc',
    view: 'Toàn Cảnh Bờ Biển Riêng Biệt 360°',
    viewDesc: 'Lối bước thẳng xuống bãi cát trắng riêng tư',
    bedConfig: '2 Master King + 2 Queen',
    bedDesc: 'Hệ đệm lò xo túi độc lập 7 vùng nâng đỡ',
    area: '340 m²',
    capacityDesc: '6 người lớn (3 phòng ngủ en-suite riêng biệt)',
    pool: 'Hồ Bơi Vô Cực 45 m² + Jacuzzi',
    poolDesc: 'Bể sục sủi bọt khí khoáng nước nóng riêng',
    hasPrivatePool: true,
    butler: 'Quản Gia 24/7 & Đầu Bếp Riêng',
    butlerDesc: 'Nấu tiệc BBQ hải sản cao cấp ngay sân vườn',
    hasPrivateButler: true,
    bathroom: '3 Phòng Tắm Cẩm Thạch Ý + Sauna',
    bathroomDesc: 'Bồn tắm đôi ngoại cỡ & phòng sauna khô riêng',
    smartHome: 'Phòng Chiếu Phim Bang & Olufsen 85"',
    smartHomeDesc: 'Hệ thống vòm âm thanh acoustic biệt lập',
    badge: 'Kỳ nghỉ vương giả đại gia đình',
    specialPrivilege: 'ĐẶC QUYỀN THƯỢNG LƯU',
    conciergeNote: 'Concierge liên hệ bảo mật 15 phút',
    availableRooms: 1
  },
  4: {
    category: 'Biệt Thự Hướng Biển',
    view: 'Trực Diện Bãi Biển & Vườn Nhiệt Đới',
    viewDesc: 'Khoảng cách 20m chạm làn sóng xanh',
    bedConfig: '2 Giường King Ngoại Cỡ',
    bedDesc: 'Đệm Dunlopillo Royal Executive',
    area: '210 m²',
    capacityDesc: '4 người lớn + 2 trẻ em',
    pool: 'Hồ Bơi Riêng 28 m²',
    poolDesc: 'Hồ bơi vô cực ngắm hoàng hôn',
    hasPrivatePool: true,
    butler: 'Quản Gia Riêng 12/7',
    butlerDesc: 'Hỗ trợ đặt tiệc nướng và chăm sóc đồ uống',
    hasPrivateButler: true,
    bathroom: '2 Phòng Tắm Đá Cẩm Thạch + Bồn Tắm Jacuzzi',
    bathroomDesc: 'Mỹ phẩm cao cấp BVLGARI White Tea',
    smartHome: 'Smart TV 70" + Loa Harman Kardon',
    smartHomeDesc: 'Hệ thống điều khiển ánh sáng thông minh Smart Home',
    badge: 'Không gian gia đình hoàn mỹ',
    availableRooms: 3
  }
};

/**
 * Controller so sánh phòng trực quan (Room Specification Comparison Matrix)
 * Mã tính năng: FEAT-GUEST-13B | Mã truy vết: A13
 * Endpoint: GET /rooms/compare?ids=101,304,501 (và /api/v1/rooms/compare, /api/v1/guest/rooms/compare)
 */
exports.compareRooms = async (req, res) => {
  try {
    const rawIds = req.query.ids || req.query.roomTypeIds;
    const filterView = (req.query.filterView || 'ALL_ATTRIBUTES').toUpperCase();

    if (!rawIds) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0044_MIN_COMPARE_ROOMS',
        message: 'Vui lòng chọn ít nhất 2 loại phòng để tiến hành so sánh'
      });
    }

    // Parse danh sách ID
    let ids = [];
    if (Array.isArray(rawIds)) {
      ids = rawIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    } else if (typeof rawIds === 'string') {
      ids = rawIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
    }

    // Loại bỏ id trùng lặp
    ids = Array.from(new Set(ids));

    // Ràng buộc kỹ thuật chính:
    // Tối thiểu 2 phòng
    if (ids.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0044_MIN_COMPARE_ROOMS',
        message: 'Vui lòng chọn ít nhất 2 loại phòng để tiến hành so sánh'
      });
    }

    // Tối đa 4 phòng
    if (ids.length > 4) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0045_MAX_COMPARE_ROOMS',
        message: 'Hệ thống chỉ hỗ trợ so sánh tối đa 4 loại phòng cùng lúc'
      });
    }

    // Truy vấn cơ sở dữ liệu
    const roomTypes = await RoomType.findAll({
      where: {
        RoomTypeId: { [Op.in]: ids },
        IsDeleted: false
      },
      include: [
        {
          model: Amenity,
          as: 'amenityList',
          through: { attributes: [] }
        },
        {
          model: Room,
          as: 'rooms',
          attributes: ['RoomId', 'RoomNumber', 'Status']
        }
      ]
    });

    if (!roomTypes || roomTypes.length < 2) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0044_MIN_COMPARE_ROOMS',
        message: 'Vui lòng chọn ít nhất 2 loại phòng để tiến hành so sánh'
      });
    }

    // Sắp xếp roomTypes theo đúng thứ tự mảng ids truyền vào
    const sortedRoomTypes = ids
      .map(id => roomTypes.find(rt => rt.RoomTypeId === id))
      .filter(Boolean);

    // Map dữ liệu 9 tiêu chí so sánh đối chiếu đa chiều cạnh nhau (Side-by-side Matrix)
    const comparedRooms = sortedRoomTypes.map(rt => {
      const meta = ROOM_METADATA[rt.RoomTypeId] || {};
      const adultCap = rt.AdultCapacity || 2;
      const childCap = rt.ChildCapacity || 1;
      const maxOcc = rt.MaxOccupancy || (adultCap + childCap);

      const area = meta.area || `${Math.min(115 + (rt.RoomTypeId % 5) * 45, 360)} m²`;
      const bedConfig = meta.bedConfig || (adultCap > 3 ? '2 Master King + 2 Queen' : (adultCap > 2 ? '1 Giường California King' : '1 Giường King'));
      const bedDesc = meta.bedDesc || 'Menu gối lông vũ theo sở thích';
      const view = meta.view || (rt.RoomTypeId % 2 === 0 ? 'Trực Diện Hoàng Hôn Bãi Trường' : 'Vườn Nhiệt Đới & Rừng Thông');
      const viewDesc = meta.viewDesc || 'Hiên gỗ teak riêng biệt tĩnh lặng';
      const pool = meta.pool || (rt.RoomTypeId % 2 === 0 ? 'Hồ Bơi Nước Ấm Tràn Viền 18 m²' : 'Hồ Bơi Vô Cực Chính');
      const poolDesc = meta.poolDesc || (rt.RoomTypeId % 2 === 0 ? 'Bố trí ngay ban công riêng tầng cao' : 'Sử dụng chung với khu vực resort (3 hồ)');
      const butler = meta.butler || (rt.RoomTypeId === 3 || rt.RoomTypeId === 5 ? 'Quản Gia 24/7 & Đầu Bếp Riêng' : (rt.RoomTypeId % 2 === 0 ? 'Quản Gia Riêng (08:00 - 22:00)' : 'Phục Vụ Bữa Ăn Tiêu Chuẩn'));
      const butlerDesc = meta.butlerDesc || 'Hỗ trợ setup trà chiều & đặt chỗ ưu tiên';
      const bathroom = meta.bathroom || (rt.RoomTypeId % 2 === 0 ? 'Bồn Tắm Ngắm Biển + Xông Hơi Ướt' : 'Vòi Sen Mưa Đá Khối Monolith');
      const bathroomDesc = meta.bathroomDesc || 'Dược mỹ phẩm hữu cơ Acqua di Parma';
      const smartHome = meta.smartHome || 'TV OLED 65" + Loa Marshall';
      const smartHomeDesc = meta.smartHomeDesc || 'Điều khiển đèn cảm ứng cơ bản';

      const physicalRooms = rt.rooms || [];
      const availableCount = meta.availableRooms || physicalRooms.filter(r => r.Status === 'Available').length || 3;

      return {
        roomTypeId: rt.RoomTypeId,
        typeName: rt.TypeName,
        description: rt.Description,
        basePrice: parseFloat(rt.BasePrice),
        formattedPrice: Number(rt.BasePrice).toLocaleString('vi-VN') + ' đ',
        imageUrl: rt.ImageUrl,
        category: meta.category || 'Hạng Nghỉ Dưỡng 5 Sao',
        badge: meta.badge || 'Lựa chọn tinh tế',
        isPopular: !!meta.isPopular,
        highlightOffer: meta.highlightOffer || null,
        breakfastIncluded: meta.breakfastIncluded || 'Bao gồm buffet sáng cao cấp',
        specialPrivilege: meta.specialPrivilege || null,
        conciergeNote: meta.conciergeNote || null,
        availableRooms: availableCount,
        specifications: {
          area: { title: 'Diện Tích', value: area, desc: 'Không gian lưu trú tiêu chuẩn', category: 'DIMENSIONS_CAPACITY' },
          capacity: {
            title: 'Sức Chứa',
            value: `${adultCap} người lớn + ${childCap} trẻ em`,
            adults: adultCap,
            children: childCap,
            maxOccupancy: maxOcc,
            desc: meta.capacityDesc || `Tối đa ${maxOcc} khách`,
            category: 'DIMENSIONS_CAPACITY'
          },
          bedConfig: { title: 'Cấu Trúc Giường & Đệm', value: bedConfig, desc: bedDesc, category: 'ALL_ATTRIBUTES' },
          view: { title: 'Hướng Nhìn & Ban Công', value: view, desc: viewDesc, category: 'ALL_ATTRIBUTES' },
          pool: {
            title: 'Hồ Bơi / Thủy Liệu Pháp',
            value: pool,
            desc: poolDesc,
            hasPrivatePool: meta.hasPrivatePool ?? (pool.toLowerCase().includes('riêng') || pool.toLowerCase().includes('tràn viền')),
            category: 'INCLUSIONS'
          },
          butler: {
            title: 'Ẩm Thực & Quản Gia',
            value: butler,
            desc: butlerDesc,
            hasPrivateButler: meta.hasPrivateButler ?? butler.toLowerCase().includes('quản gia'),
            category: 'INCLUSIONS'
          },
          bathroom: { title: 'Không Gian Phòng Tắm & Bồn Tắm', value: bathroom, desc: bathroomDesc, category: 'ALL_ATTRIBUTES' },
          smartHome: { title: 'Hệ Thống Giải Trí & Smart Home', value: smartHome, desc: smartHomeDesc, category: 'ALL_ATTRIBUTES' }
        },
        amenities: (rt.amenityList || []).map(a => ({
          amenityId: a.AmenityId,
          amenityName: a.AmenityName,
          iconUrl: a.IconUrl
        }))
      };
    });

    // 9 Tiêu chí đối chiếu theo chuẩn Ma trận (Matrix Criteria)
    const criteriaList = [
      { key: 'area', label: 'Diện Tích', category: 'DIMENSIONS_CAPACITY', icon: 'aspect_ratio' },
      { key: 'capacity', label: 'Sức Chứa', category: 'DIMENSIONS_CAPACITY', icon: 'groups' },
      { key: 'price', label: 'Giá Mỗi Đêm', category: 'ALL_ATTRIBUTES', icon: 'payments' },
      { key: 'bedConfig', label: 'Cấu Trúc Giường & Đệm', category: 'ALL_ATTRIBUTES', icon: 'bed' },
      { key: 'view', label: 'Hướng Nhìn & Ban Công', category: 'ALL_ATTRIBUTES', icon: 'landscape' },
      { key: 'pool', label: 'Hồ Bơi / Thủy Liệu Pháp', category: 'INCLUSIONS', icon: 'pool' },
      { key: 'butler', label: 'Ẩm Thực & Quản Gia', category: 'INCLUSIONS', icon: 'room_service' },
      { key: 'bathroom', label: 'Không Gian Phòng Tắm & Bồn Tắm', category: 'ALL_ATTRIBUTES', icon: 'bathtub' },
      { key: 'smartHome', label: 'Hệ Thống Giải Trí & Smart Home', category: 'ALL_ATTRIBUTES', icon: 'hub' }
    ];

    // Xác định các hàng có giá trị khác biệt giữa các phòng (DIFFERENCES_ONLY)
    const criteriaWithDiffStatus = criteriaList.map(crit => {
      let values = [];
      if (crit.key === 'price') {
        values = comparedRooms.map(r => r.basePrice);
      } else {
        values = comparedRooms.map(r => r.specifications[crit.key]?.value);
      }
      const isDifferent = new Set(values).size > 1;
      return {
        ...crit,
        isDifferent
      };
    });

    return res.json({
      success: true,
      meta: {
        activeCompareCount: comparedRooms.length,
        maxCompareCount: 4,
        minCompareCount: 2,
        activeLabel: `ACTIVE_COMPARE: ${comparedRooms.length} OF 4 MAX`,
        filterView,
        totalCriteria: 9,
        differencesCount: criteriaWithDiffStatus.filter(c => c.isDifferent).length
      },
      criteria: criteriaWithDiffStatus,
      rooms: comparedRooms
    });
  } catch (error) {
    console.error('Lỗi compareRooms:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_SERVER',
      message: 'Đã xảy ra lỗi trong quá trình so sánh các loại phòng.'
    });
  }
};

