'use strict';

const {
  ServiceOrder,
  Service,
  ServiceCategory,
  Stay,
  Booking,
  User,
  Room,
  RoomType,
  MembershipTier,
  sequelize,
} = require('../../../models');

/**
 * 1. POST /api/v1/service-orders
 * Đặt dịch vụ cho khách đang lưu trú (FEAT-SERVICE-03)
 * Hỗ trợ cả Khách tự đặt (Guest) và Lễ tân đặt hộ (Receptionist)
 */
exports.createServiceOrder = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const isStaffOrAdmin = ['Admin', 'Staff', 'Receptionist', 'Manager'].includes(userRole);

    const { stayId, serviceId, quantity, note, items } = req.body;

    // Hỗ trợ đặt nhiều dịch vụ cùng lúc (batch) hoặc 1 dịch vụ đơn lẻ
    const orderItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ serviceId, quantity, note }];

    if (!stayId) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Mã lượt lưu trú (stayId) là bắt buộc',
      });
    }

    // 1. Kiểm tra StayId tồn tại (Mục 3.3.b & 3.5)
    const stay = await Stay.findByPk(stayId, {
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['BookingId', 'UserId', 'Status'],
        },
      ],
    });

    if (!stay) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Lượt lưu trú không tồn tại hoặc đã bị xoá',
      });
    }

    // 2. Quyền thực hiện (Mục 3.3.a & Test case 1)
    // Guest chỉ được đặt cho đúng Stay của chính mình
    if (!isStaffOrAdmin) {
      const stayOwnerId = stay.booking?.UserId || stay.Booking?.UserId;
      if (stayOwnerId && Number(stayOwnerId) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền thực hiện chức năng này',
        });
      }
    }

    // 3. Trạng thái Stay (Mục 3.3.b & Test case 2)
    // Chỉ chấp nhận tạo đơn khi Stay.Status thuộc {CheckedIn, Extended}
    const validStayStatuses = ['CheckedIn', 'Extended'];
    if (!validStayStatuses.includes(stay.Status)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0015_PRECONDITION_FAILED',
        message: 'Chỉ áp dụng cho khách đang lưu trú',
      });
    }

    // 4. Validate từng dịch vụ và chuẩn bị dữ liệu tạo
    const createdOrders = [];

    for (const item of orderItems) {
      const sId = item.serviceId;
      const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
      const itemNote = item.note || note || '';

      // Validate Service tồn tại (Mục 3.3.c & 3.5)
      if (!sId) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Mã dịch vụ (serviceId) là bắt buộc',
        });
      }

      const service = await Service.findByPk(sId);
      if (!service || service.IsDeleted) {
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
        });
      }

      // Service Status phải là Active (Test case 3)
      if (service.Status !== 'Active') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0014_INACTIVE_REFERENCE',
          message: 'Dịch vụ hiện không còn hoạt động',
        });
      }

      // Validate quantity (Mục 3.3.d & Test case 4)
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          message: 'Số lượng phải lớn hơn 0',
        });
      }

      if (qty > 50) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          message: 'Số lượng vượt quá giới hạn cho phép (tối đa 50)',
        });
      }

      // Validate note (Mục 3.2 & 3.5)
      if (itemNote && itemNote.length > 500) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Ghi chú không được vượt quá 500 ký tự',
        });
      }

      // Snapshot giá tại thời điểm đặt (Mục 3.3.c & Test case 5)
      const unitPrice = Math.floor(Number(service.Price));
      const totalPrice = Math.floor(qty * unitPrice);

      createdOrders.push({
        StayId: stay.StayId,
        ServiceId: service.ServiceId,
        CreatedBy: userId || null,
        Quantity: qty,
        UnitPrice: unitPrice,
        TotalPrice: totalPrice,
        OrderDate: new Date(),
        Status: 'Received',
        Note: itemNote ? itemNote.trim() : null,
      });
    }

    // 5. Lưu vào Database
    const savedRecords = await ServiceOrder.bulkCreate(createdOrders);

    // Lấy bản ghi hoàn chỉnh kèm thông tin Service để trả về FE
    const orderIds = savedRecords.map((r) => r.OrderId);
    const resultOrders = await ServiceOrder.findAll({
      where: { OrderId: orderIds },
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['ServiceId', 'ServiceCode', 'ServiceName', 'Price', 'Unit'],
          include: [{ model: ServiceCategory, as: 'category', attributes: ['CategoryName'] }],
        },
      ],
    });

    const isSingle = orderItems.length === 1 && !Array.isArray(items);
    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới đơn dịch vụ thành công',
      data: isSingle ? resultOrders[0] : resultOrders,
    });
  } catch (error) {
    console.error('Error in createServiceOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo đơn đặt dịch vụ.',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/v1/service-orders/active-stays
 * Danh sách các phòng đang lưu trú (CheckedIn hoặc Extended) cho Lễ tân tra cứu
 */
exports.getActiveStays = async (req, res) => {
  try {
    const activeStays = await Stay.findAll({
      where: {
        Status: ['CheckedIn', 'Extended'],
      },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['RoomId', 'RoomNumber', 'Floor'],
          include: [
            {
              model: RoomType,
              as: 'roomType',
              attributes: ['RoomTypeId', 'TypeName', 'PricePerNight'],
            },
          ],
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['BookingId', 'BookingCode', 'CheckInDate', 'CheckOutDate', 'TotalPrice'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['UserId', 'FullName', 'Email', 'PhoneNumber'],
              include: [
                {
                  model: MembershipTier,
                  as: 'membershipTier',
                  attributes: ['TierName', 'DiscountPercent'],
                },
              ],
            },
          ],
        },
      ],
      order: [['StayId', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      total: activeStays.length,
      data: activeStays,
    });
  } catch (error) {
    console.error('Error in getActiveStays:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tải danh sách phòng in-house.',
      error: error.message,
    });
  }
};

/**
 * 3. GET /api/v1/service-orders/my-stay
 * Lấy thông tin lượt lưu trú hiện tại của Khách hàng (Guest) đang đăng nhập
 */
exports.getMyActiveStay = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'ERROR_0009_UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập để thực hiện chức năng này',
      });
    }

    const myStay = await Stay.findOne({
      where: {
        Status: ['CheckedIn', 'Extended'],
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { UserId: userId },
          attributes: ['BookingId', 'BookingCode', 'CheckInDate', 'CheckOutDate', 'TotalPrice'],
        },
        {
          model: Room,
          as: 'room',
          attributes: ['RoomId', 'RoomNumber', 'Floor'],
          include: [
            {
              model: RoomType,
              as: 'roomType',
              attributes: ['RoomTypeId', 'TypeName', 'PricePerNight'],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      hasActiveStay: Boolean(myStay),
      data: myStay || null,
    });
  } catch (error) {
    console.error('Error in getMyActiveStay:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tải lượt lưu trú của bạn.',
      error: error.message,
    });
  }
};

/**
 * 4. GET /api/v1/service-orders
 * Lấy danh sách các đơn đặt dịch vụ (kèm bộ lọc stayId)
 */
exports.getServiceOrders = async (req, res) => {
  try {
    const { stayId, status } = req.query;
    const where = {};
    if (stayId) where.StayId = stayId;
    if (status && status !== 'All') where.Status = status;

    const orders = await ServiceOrder.findAll({
      where,
      include: [
        {
          model: Service,
          as: 'service',
          attributes: ['ServiceId', 'ServiceCode', 'ServiceName', 'Price', 'Unit'],
          include: [{ model: ServiceCategory, as: 'category', attributes: ['CategoryName'] }],
        },
        {
          model: Stay,
          as: 'stay',
          attributes: ['StayId', 'Status', 'CheckInDate', 'CheckOutDate'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['RoomId', 'RoomNumber'],
            },
          ],
        },
      ],
      order: [['OrderId', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      total: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Error in getServiceOrders:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách đơn dịch vụ.',
      error: error.message,
    });
  }
};
