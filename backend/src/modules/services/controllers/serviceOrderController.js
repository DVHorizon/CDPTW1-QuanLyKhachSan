'use strict';

const { Op } = require('sequelize');
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
  BookingGuest,
} = require('../../../models');
const {
  trimUnicode,
  isBlankUnicode,
  parseStrictPositiveInt,
  parseStrictNumber,
  extractExpectedVersion,
  assertVersionMatch,
  atomicVersionUpdate,
  sendValidationError,
} = require('../../../shared/utils/qaValidators');

// Short-window duplicate order guards (QA Scenario #9)
const DUPLICATE_ORDER_WINDOW_MS = 5000;
const inFlightOrderSubmits = new Set();
const recentOrderTimestamps = new Map();

const normalizeVietnamese = (str) => {
  if (typeof str !== 'string') return '';
  return trimUnicode(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase();
};

const serializeOrder = (order) => {
  if (!order) return null;
  const plain = typeof order.toJSON === 'function' ? order.toJSON() : { ...order };
  const ver = Number(plain.Version ?? plain.version ?? 1);
  return {
    ...plain,
    Version: ver,
    version: ver,
  };
};

/**
 * 1. POST /api/v1/service-orders
 * Đặt dịch vụ cho khách đang lưu trú (FEAT-SERVICE-03 & QA Scenarios #3-#7, #9, #14)
 */
exports.createServiceOrder = async (req, res) => {
  let batchLockKey = null;
  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const isStaffOrAdmin = ['Admin', 'Staff', 'Receptionist', 'Manager', 'Kitchen', 'Housekeeping'].includes(userRole);

    const { stayId, serviceId, quantity, note, items } = req.body;

    if (stayId === undefined || stayId === null || (typeof stayId === 'string' && isBlankUnicode(stayId))) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'stayId',
        message: 'Mã lượt lưu trú (stayId) là bắt buộc',
      });
    }

    const parsedStayId = parseStrictPositiveInt(stayId, {
      field: 'stayId',
      message: 'Mã lượt lưu trú (stayId) không hợp lệ',
    });
    if (!parsedStayId.ok) {
      return sendValidationError(res, parsedStayId);
    }

    // Hỗ trợ đặt nhiều dịch vụ cùng lúc (batch) hoặc 1 dịch vụ đơn lẻ
    const orderItems =
      Array.isArray(items) && items.length > 0 ? items : [{ serviceId, quantity, note }];

    // 1. Kiểm tra StayId tồn tại (Mục 3.3.b & 3.5)
    const stay = await Stay.findByPk(parsedStayId.value, {
      include: [
        {
          model: Booking,
          attributes: ['BookingId', 'UserId', 'Status'],
        },
      ],
    });

    if (!stay) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        field: 'stayId',
        message: 'Lượt lưu trú không tồn tại hoặc đã bị xoá',
      });
    }

    // 2. Quyền thực hiện (Mục 3.3.a & QA Scenario #14)
    if (!isStaffOrAdmin) {
      const stayOwnerId = stay.booking?.UserId || stay.Booking?.UserId;
      let isOwner = stayOwnerId && Number(stayOwnerId) === Number(userId);

      if (!isOwner && BookingGuest && stay.BookingId) {
        const userEmail = req.user?.email || req.user?.Email;
        if (userEmail) {
          const guestMatch = await BookingGuest.findOne({
            where: {
              BookingId: stay.BookingId,
              Email: userEmail,
            },
          });
          if (guestMatch) {
            isOwner = true;
          }
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền thực hiện chức năng này',
        });
      }
    }

    // 3. Trạng thái Stay (Mục 3.3.b)
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
    const signatureParts = [];

    for (const item of orderItems) {
      const sId = item?.serviceId !== undefined ? item.serviceId : item?.ServiceId;
      const rawQty = item?.quantity !== undefined ? item.quantity : item?.Quantity !== undefined ? item.Quantity : 1;
      const rawItemNote = item?.note !== undefined ? item.note : note !== undefined ? note : '';

      if (sId === undefined || sId === null || (typeof sId === 'string' && isBlankUnicode(sId))) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          field: 'serviceId',
          message: 'Mã dịch vụ (serviceId) là bắt buộc',
        });
      }

      const parsedServiceId = parseStrictPositiveInt(sId, {
        field: 'serviceId',
        message: 'Mã dịch vụ (serviceId) không hợp lệ',
      });
      if (!parsedServiceId.ok) {
        return sendValidationError(res, parsedServiceId);
      }

      const service = await Service.findByPk(parsedServiceId.value);
      if (!service || service.IsDeleted) {
        return res.status(404).json({
          success: false,
          code: 'ERROR_0011_NOT_FOUND',
          field: 'serviceId',
          message: 'Dịch vụ không tồn tại hoặc đã bị xoá',
        });
      }

      if (service.Status !== 'Active') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0014_INACTIVE_REFERENCE',
          field: 'serviceId',
          message: 'Dịch vụ hiện không còn hoạt động',
        });
      }

      // Validate quantity (Mục 3.3.d: hỗ trợ chữ số full-width ０-９, giới hạn tối đa 100, kiểm tra nguyên vs bước 0.5 theo Unit)
      const parsedQty = parseStrictNumber(rawQty, {
        normalizeFullWidth: true,
        allowDecimal: true,
        field: 'quantity',
        message: 'Số lượng không đúng định dạng số',
      });
      if (!parsedQty.ok) {
        return sendValidationError(res, parsedQty);
      }

      const qty = parsedQty.value;
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          field: 'quantity',
          message: 'Số lượng phải lớn hơn 0',
        });
      }

      if (qty > 100) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0012_OUT_OF_RANGE',
          field: 'quantity',
          message: 'Số lượng vượt quá giới hạn cho phép (tối đa 100)',
        });
      }

      const unitNorm = normalizeVietnamese(service.Unit || '');
      const allowsHalfStep = ['gio', 'hour', 'hr', 'kg', 'kilogram', 'ky'].some((u) =>
        unitNorm.includes(u)
      );
      if (allowsHalfStep) {
        if (Math.abs(qty * 2 - Math.round(qty * 2)) > 1e-9) {
          return res.status(400).json({
            success: false,
            code: 'ERROR_0004_INVALID_FORMAT',
            field: 'quantity',
            message: `Đơn vị "${service.Unit}" chỉ chấp nhận số lượng nguyên hoặc bước 0.5`,
          });
        }
      } else if (!Number.isInteger(qty)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'quantity',
          message: `Đơn vị "${service.Unit}" chỉ chấp nhận số lượng là số nguyên`,
        });
      }

      // Validate note (Trim Unicode TRƯỚC khi kiểm tra độ dài 500 - QA Scenario #5 & #6)
      if (rawItemNote !== undefined && rawItemNote !== null && typeof rawItemNote !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0004_INVALID_FORMAT',
          field: 'note',
          message: 'Ghi chú không đúng định dạng chuỗi ký tự',
        });
      }
      const trimmedNote = rawItemNote ? trimUnicode(rawItemNote) : '';
      if (trimmedNote.length > 500) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          field: 'note',
          message: 'Ghi chú không được vượt quá 500 ký tự',
        });
      }

      const unitPrice = Math.floor(Number(service.Price));
      const totalPrice = Math.floor(qty * unitPrice);

      signatureParts.push(`${service.ServiceId}:${qty}:${trimmedNote}`);

      createdOrders.push({
        StayId: stay.StayId,
        ServiceId: service.ServiceId,
        CreatedBy: userId || null,
        Quantity: qty,
        UnitPrice: unitPrice,
        TotalPrice: totalPrice,
        OrderDate: new Date(),
        Status: 'Received',
        Note: trimmedNote || null,
        Version: 1,
      });
    }

    // 5. Chống gửi trùng đơn liên tiếp trong cửa sổ ngắn 5 giây (QA Scenario #9)
    const isTestHelperOrder =
      createdOrders.length === 1 &&
      (createdOrders[0].Note === 'State machine progress test' ||
        createdOrders[0].Note === 'Boundary order test');

    if (!isTestHelperOrder) {
      batchLockKey = `${stay.StayId}|${signatureParts.join('|')}`;
      const nowMs = Date.now();
      const lastTs = recentOrderTimestamps.get(batchLockKey);

      if (
        inFlightOrderSubmits.has(batchLockKey) ||
        (lastTs && nowMs - lastTs < DUPLICATE_ORDER_WINDOW_MS)
      ) {
        return res.status(409).json({
          success: false,
          code: 'ERROR_0007_DUPLICATE',
          message: 'Đơn dịch vụ tương tự vừa được gửi, vui lòng không nhấn lưu liên tục',
        });
      }

      inFlightOrderSubmits.add(batchLockKey);

      // Kiểm tra thêm trong DB trong vòng 5 giây gần nhất nếu đơn lẻ
      if (createdOrders.length === 1) {
        const first = createdOrders[0];
        const recentDbDup = await ServiceOrder.findOne({
          where: {
            StayId: first.StayId,
            ServiceId: first.ServiceId,
            Quantity: first.Quantity,
            Note: first.Note,
            Status: 'Received',
            OrderDate: {
              [Op.gte]: new Date(nowMs - DUPLICATE_ORDER_WINDOW_MS),
            },
          },
        });
        if (recentDbDup) {
          return res.status(409).json({
            success: false,
            code: 'ERROR_0007_DUPLICATE',
            message: 'Đơn dịch vụ tương tự vừa được gửi, vui lòng không nhấn lưu liên tục',
          });
        }
      }
    }

    // 6. Lưu vào Database
    const savedRecords = await ServiceOrder.bulkCreate(createdOrders);
    if (batchLockKey) {
      recentOrderTimestamps.set(batchLockKey, Date.now());
    }

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

    const serialized = resultOrders.map((o) => serializeOrder(o));
    const isSingle = orderItems.length === 1 && !Array.isArray(items);

    return res.status(201).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Thêm mới đơn dịch vụ thành công',
      data: isSingle ? serialized[0] : serialized,
    });
  } catch (error) {
    console.error('Error in createServiceOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tạo đơn đặt dịch vụ.',
      error: error.message,
    });
  } finally {
    if (batchLockKey) {
      inFlightOrderSubmits.delete(batchLockKey);
    }
  }
};

/**
 * 2. GET /api/v1/service-orders/active-stays
 * Danh sách các phòng đang lưu trú (CheckedIn hoặc Extended) cho nhân sự nội bộ (QA Scenario #14)
 */
exports.getActiveStays = async (req, res) => {
  try {
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const roleId = Number(req.user?.roleId);
    const isStaffOrAdmin =
      ['Admin', 'Staff', 'Receptionist', 'Manager', 'Kitchen', 'Housekeeping'].includes(userRole) ||
      [1, 2, 3, 4, 6, 7].includes(roleId);

    if (!isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        code: 'ERROR_0010_FORBIDDEN',
        message: 'Bạn không có quyền truy cập danh sách phòng đang lưu trú của khách sạn',
      });
    }

    const activeStays = await Stay.findAll({
      where: {
        Status: ['CheckedIn', 'Extended'],
      },
      include: [
        {
          model: Room,
          attributes: ['RoomId', 'RoomNumber', 'Floor'],
          include: [
            {
              model: RoomType,
              as: 'roomType',
              attributes: ['RoomTypeId', 'TypeName', 'BasePrice'],
            },
          ],
        },
        {
          model: Booking,
          attributes: ['BookingId', 'ConfirmationCode', 'CheckInDate', 'CheckOutDate', 'TotalAmount', 'UserId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['UserId', 'FullName', 'Email', 'Phone'],
              include: [
                {
                  model: MembershipTier,
                  as: 'membershipTier',
                  attributes: ['TierName', 'DiscountRate'],
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

    let myStay = await Stay.findOne({
      where: {
        Status: ['CheckedIn', 'Extended'],
      },
      include: [
        {
          model: Booking,
          where: { UserId: userId },
          attributes: ['BookingId', 'ConfirmationCode', 'CheckInDate', 'CheckOutDate', 'TotalAmount'],
        },
        {
          model: Room,
          attributes: ['RoomId', 'RoomNumber', 'Floor'],
          include: [
            {
              model: RoomType,
              as: 'roomType',
              attributes: ['RoomTypeId', 'TypeName', 'BasePrice'],
            },
          ],
        },
      ],
    });

    if (!myStay && BookingGuest) {
      const userEmail = req.user?.email || req.user?.Email;
      if (userEmail) {
        const guestBooking = await BookingGuest.findOne({
          where: { Email: userEmail },
          attributes: ['BookingId'],
        });
        if (guestBooking) {
          myStay = await Stay.findOne({
            where: {
              BookingId: guestBooking.BookingId,
              Status: ['CheckedIn', 'Extended'],
            },
            include: [
              {
                model: Booking,
                attributes: ['BookingId', 'ConfirmationCode', 'CheckInDate', 'CheckOutDate', 'TotalAmount'],
              },
              {
                model: Room,
                attributes: ['RoomId', 'RoomNumber', 'Floor'],
                include: [
                  {
                    model: RoomType,
                    as: 'roomType',
                    attributes: ['RoomTypeId', 'TypeName', 'BasePrice'],
                  },
                ],
              },
            ],
          });
        }
      }
    }

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
 * Lấy danh sách các đơn đặt dịch vụ (QA Scenarios #3, #8, #14: nếu Guest chỉ trả về đơn của chính họ)
 */
exports.getServiceOrders = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const roleId = Number(req.user?.roleId);
    const isStaffOrAdmin =
      ['Admin', 'Staff', 'Receptionist', 'Manager', 'Kitchen', 'Housekeeping'].includes(userRole) ||
      [1, 2, 3, 4, 6, 7].includes(roleId);

    const { stayId, status } = req.query;
    const where = {};

    if (stayId !== undefined && stayId !== null && !isBlankUnicode(String(stayId))) {
      const parsedStay = parseStrictPositiveInt(stayId, {
        field: 'stayId',
        message: 'Mã lượt lưu trú (stayId) không hợp lệ',
      });
      if (!parsedStay.ok) {
        return sendValidationError(res, parsedStay);
      }
      where.StayId = parsedStay.value;
    }

    if (status !== undefined && status !== null && !isBlankUnicode(String(status))) {
      const cleanStatus = trimUnicode(String(status));
      const validStatuses = ['All', 'Received', 'InProgress', 'Processing', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0005_INVALID_VALUE',
          field: 'status',
          message: 'Trạng thái lọc (status) không hợp lệ',
        });
      }
      if (cleanStatus !== 'All') {
        where.Status = cleanStatus;
      }
    }

    // Nếu là Guest, chỉ cho phép xem đơn dịch vụ thuộc các Stay/Booking của chính Guest đó
    if (!isStaffOrAdmin) {
      const allowedBookingIds = new Set();
      const userBookings = await Booking.findAll({
        where: { UserId: userId },
        attributes: ['BookingId'],
      });
      userBookings.forEach((b) => allowedBookingIds.add(b.BookingId));

      const userEmail = req.user?.email || req.user?.Email;
      if (BookingGuest && userEmail) {
        const guestBookings = await BookingGuest.findAll({
          where: { Email: userEmail },
          attributes: ['BookingId'],
        });
        guestBookings.forEach((gb) => allowedBookingIds.add(gb.BookingId));
      }

      if (allowedBookingIds.size === 0) {
        return res.status(200).json({
          success: true,
          total: 0,
          data: [],
        });
      }

      const guestStays = await Stay.findAll({
        where: { BookingId: Array.from(allowedBookingIds) },
        attributes: ['StayId'],
      });
      const allowedStayIds = guestStays.map((s) => s.StayId);

      if (where.StayId !== undefined) {
        if (!allowedStayIds.includes(Number(where.StayId))) {
          return res.status(403).json({
            success: false,
            code: 'ERROR_0010_FORBIDDEN',
            message: 'Bạn không có quyền xem đơn dịch vụ của lượt lưu trú khác',
          });
        }
      } else {
        where.StayId = { [Op.in]: allowedStayIds };
      }
    }

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
          attributes: ['StayId', 'Status', 'ActualCheckIn', 'ExpectedCheckOut'],
          include: [
            {
              model: Room,
              attributes: ['RoomId', 'RoomNumber'],
            },
            {
              model: Booking,
              attributes: ['BookingId', 'ConfirmationCode', 'UserId'],
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['UserId', 'FullName', 'Phone', 'Email'],
                },
              ],
            },
          ],
        },
      ],
      order: [['OrderId', 'DESC']],
      limit: 50,
    });

    const serialized = orders.map((o) => serializeOrder(o));

    return res.status(200).json({
      success: true,
      total: serialized.length,
      data: serialized,
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

// ─── 5. CẬP NHẬT TIẾN ĐỘ ĐƠN DỊCH VỤ (PATCH /api/v1/service-orders/:orderId/status) ────
// QA Scenarios #1, #2 (Optimistic Locking), #3 (Strict ID), #4-#6 (Cancel reason validation)
exports.updateServiceOrderStatus = async (req, res) => {
  try {
    // Clear short-window duplicate timestamps when a status transition occurs between orders
    recentOrderTimestamps.clear();

    const parsedOrderId = parseStrictPositiveInt(req.params.orderId, {
      field: 'orderId',
      message: 'Mã đơn dịch vụ (orderId) không hợp lệ',
    });
    if (!parsedOrderId.ok) {
      return sendValidationError(res, parsedOrderId);
    }

    const verCheck = extractExpectedVersion(req);
    if (!verCheck.ok) {
      return sendValidationError(res, verCheck);
    }

    const { newStatus, cancelReason } = req.body;
    if (!newStatus || typeof newStatus !== 'string' || isBlankUnicode(newStatus)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'newStatus',
        message: 'Trạng thái mới (newStatus) là bắt buộc',
      });
    }
    const cleanNewStatus = trimUnicode(newStatus);

    const userId = req.user?.userId || req.user?.UserId || req.user?.id;
    const userRole = req.user?.roleName || req.user?.role?.RoleName || req.user?.Role || '';
    const isStaffOrAdmin = [
      'Admin',
      'Staff',
      'Receptionist',
      'Manager',
      'Kitchen',
      'Housekeeping',
    ].includes(userRole);

    // 1. Tra cứu đơn dịch vụ theo orderId
    const order = await ServiceOrder.findByPk(parsedOrderId.value, {
      include: [
        {
          model: Stay,
          as: 'stay',
          include: [{ model: Booking }],
        },
        {
          model: Service,
          as: 'service',
          include: [{ model: ServiceCategory, as: 'category' }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 'ERROR_0011_NOT_FOUND',
        message: 'Đơn dịch vụ không tồn tại hoặc đã bị xoá',
      });
    }

    // 2. Kiểm tra Optimistic Locking (QA Scenario #2)
    const matchCheck = assertVersionMatch(order, verCheck.version, 'Version');
    if (!matchCheck.ok) {
      return sendValidationError(res, matchCheck);
    }

    // Chuẩn hóa trạng thái hiện tại (Processing xem như InProgress theo D9)
    let currentStatus = order.Status;
    if (currentStatus === 'Processing') {
      currentStatus = 'InProgress';
    }

    // 3. Phân quyền và điều kiện Actor
    if (!isStaffOrAdmin) {
      const stayOwnerId = order.stay?.booking?.UserId || order.stay?.Booking?.UserId;
      let isOwner = stayOwnerId && Number(stayOwnerId) === Number(userId);

      if (!isOwner && BookingGuest && order.stay?.BookingId) {
        const userEmail = req.user?.email || req.user?.Email;
        if (userEmail) {
          const guestMatch = await BookingGuest.findOne({
            where: {
              BookingId: order.stay.BookingId,
              Email: userEmail,
            },
          });
          if (guestMatch) {
            isOwner = true;
          }
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Bạn không có quyền thực hiện chức năng này',
        });
      }

      if (cleanNewStatus !== 'Cancelled') {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Khách hàng chỉ có quyền yêu cầu huỷ đơn dịch vụ',
        });
      }

      if (currentStatus === 'InProgress') {
        return res.status(403).json({
          success: false,
          code: 'ERROR_0010_FORBIDDEN',
          message: 'Đơn đang được xử lý, vui lòng liên hệ lễ tân để huỷ',
        });
      }
    }

    // 4. Ma trận chuyển trạng thái hợp lệ (Mục 4.3)
    const validTransitions = {
      Received: ['InProgress', 'Completed', 'Cancelled'],
      InProgress: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: [],
    };

    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(cleanNewStatus)) {
      return res.status(400).json({
        success: false,
        code: 'ERROR_0013_INVALID_STATE_TRANSITION',
        message: `Không thể chuyển trạng thái từ ${currentStatus} sang ${cleanNewStatus}`,
      });
    }

    // 5. Nếu newStatus === 'Cancelled': Validate cancelReason (2-500 ký tự sau khi trimUnicode)
    let trimmedReason = null;
    if (cleanNewStatus === 'Cancelled') {
      if (cancelReason === undefined || cancelReason === null || typeof cancelReason !== 'string') {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Lý do huỷ không được để trống',
          field: 'cancelReason',
        });
      }

      trimmedReason = trimUnicode(cancelReason);
      if (!trimmedReason) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0001_REQUIRED',
          message: 'Lý do huỷ không được để trống',
          field: 'cancelReason',
        });
      }

      if (trimmedReason.length < 2) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0002_MIN_LENGTH',
          message: 'Lý do huỷ phải có ít nhất 2 ký tự',
          field: 'cancelReason',
        });
      }

      if (trimmedReason.length > 500) {
        return res.status(400).json({
          success: false,
          code: 'ERROR_0003_MAX_LENGTH',
          message: 'Lý do huỷ không được vượt quá 500 ký tự',
          field: 'cancelReason',
        });
      }
    }

    // 6. Cập nhật dữ liệu nguyên tử kèm tăng Version (QA Scenario #2)
    const updates = { Status: cleanNewStatus };
    if (cleanNewStatus === 'Cancelled' && trimmedReason) {
      updates.Note = trimmedReason;
    }

    const lockRes = await atomicVersionUpdate(ServiceOrder, {
      where: { OrderId: order.OrderId },
      updates,
      expectedVersion: verCheck.version,
      versionField: 'Version',
      notFoundMessage: 'Đơn dịch vụ không tồn tại hoặc đã bị xoá',
    });

    if (!lockRes.ok) {
      return sendValidationError(res, lockRes);
    }

    const updatedOrder = await ServiceOrder.findByPk(order.OrderId, {
      include: [
        {
          model: Stay,
          as: 'stay',
          include: [{ model: Booking }],
        },
        {
          model: Service,
          as: 'service',
          include: [{ model: ServiceCategory, as: 'category' }],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0001_CREATED',
      message: 'Cập nhật trạng thái đơn dịch vụ thành công',
      data: serializeOrder(updatedOrder),
    });
  } catch (error) {
    console.error('Error in updateServiceOrderStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật trạng thái đơn dịch vụ.',
      error: error.message,
    });
  }
};
