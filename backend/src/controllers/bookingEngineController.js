'use strict';

/**
 * controllers/bookingEngineController.js
 * 
 * TÍNH NĂNG 5: ĐẶT PHÒNG TRỰC TUYẾN (ONLINE BOOKING ENGINE)
 * Mã tính năng: FEAT-GUEST-05 (Mã truy vết: A5)
 * Màn hình liên quan: Màn hình 6 (Details & Guest Info - Checkout Step 1)
 */

const { sequelize, Booking, BookingGuest, RoomType, User } = require('../models');
const availabilityService = require('../services/availabilityService');
const { broadcastRoomEvent } = require('../sockets/socketHandler');

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
// Vietnamese phone and E.164 phone regex
const PHONE_REGEX = /^(\+?[0-9]{1,4}[\s-]?)?(\(?[0-9]{2,5}\)?[\s-]?)?[0-9]{6,12}$/;
// Unicode letters check for Vietnamese and international names
const NAME_REGEX = /^[\p{L}\s'-]{2,50}$/u;

/**
 * Khởi tạo đơn đặt phòng trực tuyến (Checkout Step 1)
 * POST /api/v1/guest/bookings or POST /api/v1/rooms/book or POST /api/bookings
 */
exports.createOnlineBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      roomTypeId,
      checkInDate,
      checkOutDate,
      adultsCount = 2,
      adults,
      childrenCount = 0,
      children,
      unitsAllocated = 1,
      roomQuantity,
      estimatedArrivalTime = '',
      firstName = '',
      lastName = '',
      guestName = '',
      email = '',
      guestEmail = '',
      phoneNumber = '',
      guestPhone = '',
      specialRequests = '',
      specialRequest = '',
      isPolicyAccepted,
      lockSessionId,
      bedPreference = 'king',
      selectedAddons = [],
      isGoldMember = false
    } = req.body;

    // Normalizing field inputs (supporting both spec names and legacy aliases)
    const effectiveAdults = parseInt(adultsCount ?? adults ?? 2, 10);
    const effectiveChildren = parseInt(childrenCount ?? children ?? 0, 10);
    const effectiveUnits = parseInt(unitsAllocated ?? roomQuantity ?? 1, 10);
    const effectiveEmail = (email || guestEmail || '').trim();
    const effectivePhone = (phoneNumber || guestPhone || '').trim();
    const effectiveSpecialReq = (specialRequests || specialRequest || '').trim();

    // 1. Validate Policy Acceptance (TC02)
    if (isPolicyAccepted !== true && isPolicyAccepted !== 'true') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0025_POLICY_NOT_ACCEPTED',
        message: 'Quý khách vui lòng xác nhận đồng ý với Điều khoản và Quy định lưu trú'
      });
    }

    // 2. Validate First Name / Last Name
    let trimmedFirstName = firstName.trim();
    let trimmedLastName = lastName.trim();

    if (!trimmedFirstName && !trimmedLastName && guestName.trim()) {
      const parts = guestName.trim().split(/\s+/);
      if (parts.length > 1) {
        trimmedLastName = parts.slice(0, -1).join(' ');
        trimmedFirstName = parts[parts.length - 1];
      } else {
        trimmedFirstName = parts[0];
        trimmedLastName = parts[0];
      }
    }

    if (!trimmedFirstName || !trimmedLastName) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'name',
        message: 'Vui lòng nhập đầy đủ Họ và Tên khách lưu trú'
      });
    }

    if (!NAME_REGEX.test(trimmedFirstName) || !NAME_REGEX.test(trimmedLastName)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        field: 'name',
        message: 'Họ và Tên chỉ được chứa chữ cái, từ 2 đến 50 ký tự'
      });
    }

    // 3. Validate Email (TC01)
    if (!effectiveEmail) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'email',
        message: 'Vui lòng nhập địa chỉ email nhận thư xác nhận'
      });
    }

    if (!EMAIL_REGEX.test(effectiveEmail) || effectiveEmail.length > 255) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'email',
        message: 'Email nhận xác nhận đặt phòng không đúng định dạng'
      });
    }

    // 4. Validate Phone Number
    const rawPhone = effectivePhone.trim();
    if (!rawPhone) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        field: 'phoneNumber',
        message: 'Vui lòng nhập số điện thoại liên lạc'
      });
    }

    const cleanPhone = rawPhone.replace(/[\s.\-()]/g, '');
    // Standard E.164 (e.g. +84912345678, +15550194829) or domestic Vietnam (0912345678)
    const E164_PHONE_REGEX = /^(\+?[1-9]\d{7,14}|0[1-9]\d{8})$/;
    if (!E164_PHONE_REGEX.test(cleanPhone)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0004_INVALID_FORMAT',
        field: 'phoneNumber',
        message: 'Số điện thoại liên lạc không đúng định dạng chuẩn (VD: +84912345678 hoặc 0912345678)'
      });
    }

    // 5. Validate Dates & Units
    if (!roomTypeId || !checkInDate || !checkOutDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0001_REQUIRED',
        message: 'Vui lòng chọn loại phòng và ngày đến/đi'
      });
    }

    const dIn = new Date(checkInDate);
    const dOut = new Date(checkOutDate);
    if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Ngày trả phòng phải sau ngày nhận phòng'
      });
    }

    if (effectiveUnits < 1 || effectiveUnits > 5) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Số lượng phòng đặt phải từ 1 đến 5 phòng'
      });
    }

    // 6. Concurrency & Room Availability Check (Atomic DB / Lock Check)
    const availCheck = await availabilityService.checkAvailability({
      roomTypeId: parseInt(roomTypeId, 10),
      checkInDate,
      checkOutDate,
      quantity: effectiveUnits,
      excludeSessionId: lockSessionId || null
    });

    if (!availCheck.isAvailable || availCheck.availableRoomsCount < effectiveUnits) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        code: 'ERROR_0024_CONCURRENT_LOCK_FAILED',
        message: 'Rất tiếc, phòng vừa được giữ chỗ bởi khách hàng khác. Vui lòng chọn loại phòng khác',
        availableRoomsCount: availCheck.availableRoomsCount || 0
      });
    }

    const roomType = await RoomType.findByPk(roomTypeId, { transaction });
    if (!roomType) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        code: 'ERROR_0005_INVALID_VALUE',
        message: 'Không tìm thấy loại phòng được yêu cầu'
      });
    }

    // 7. Calculate Pricing
    const diffTime = Math.max(dOut - dIn, 86400000);
    const numberOfNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const basePrice = parseFloat(roomType.BasePrice || 0);
    const roomSubtotal = numberOfNights * basePrice * effectiveUnits;

    // Gold discount 10% if applicable
    let discountAmount = 0;
    if (isGoldMember || req.user?.MembershipTier?.TierName === 'Gold' || req.user?.TierId === 3) {
      discountAmount = Math.round(roomSubtotal * 0.1);
    }

    // Add-on services calculation
    let addonsTotal = 0;
    const resolvedAddons = [];
    if (Array.isArray(selectedAddons)) {
      for (const addon of selectedAddons) {
        if (typeof addon === 'object' && addon.price) {
          addonsTotal += parseFloat(addon.price) || 0;
          resolvedAddons.push(addon);
        } else if (typeof addon === 'string') {
          if (addon === 'addon-limo' || addon === 'limousine') {
            addonsTotal += 800000;
            resolvedAddons.push({ id: 'limousine', name: 'Đưa đón sân bay Limousine khứ hồi', price: 800000 });
          } else if (addon === 'addon-floating' || addon === 'floating_breakfast') {
            addonsTotal += 900000;
            resolvedAddons.push({ id: 'floating_breakfast', name: 'Bữa sáng bồng bềnh Floating Breakfast', price: 900000 });
          } else if (addon === 'addon-spa' || addon === 'couple_spa') {
            addonsTotal += 1800000;
            resolvedAddons.push({ id: 'couple_spa', name: 'Trị liệu Spa toàn thân cặp đôi 90 phút', price: 1800000 });
          } else if (addon === 'addon-bbq' || addon === 'seafood_bbq') {
            addonsTotal += 2200000;
            resolvedAddons.push({ id: 'seafood_bbq', name: 'Tiệc BBQ Hải sản lãng mạn bờ cát', price: 2200000 });
          }
        }
      }
    }

    const finalTotal = Math.max(0, roomSubtotal - discountAmount + addonsTotal);
    const depositAmount = Math.round(finalTotal / 2); // 50% deposit required
    const confirmationCode = 'GH-' + Math.floor(100000 + Math.random() * 900000);

    const fullGuestName = `${trimmedLastName} ${trimmedFirstName}`.trim();
    const noteObj = {
      estimatedArrivalTime,
      bedPreference,
      specialRequests: effectiveSpecialReq,
      addons: resolvedAddons
    };

    // 8. DB Transaction: Create Booking & Primary Guest
    const booking = await Booking.create({
      UserId: req.user?.id || req.user?.UserId || 1,
      RoomTypeId: parseInt(roomTypeId, 10),
      CheckInDate: checkInDate,
      CheckOutDate: checkOutDate,
      NumberOfNights: numberOfNights,
      Adults: effectiveAdults,
      Children: effectiveChildren,
      RoomQuantity: effectiveUnits,
      RoomSubtotal: roomSubtotal,
      DiscountAmount: discountAmount,
      SurchargeAmount: addonsTotal,
      TotalAmount: finalTotal,
      DepositAmount: depositAmount,
      Status: 'Pending', // Initial status PENDING_PAYMENT / Pending
      BookingSource: 'DirectWeb',
      ConfirmationCode: confirmationCode,
      Note: JSON.stringify(noteObj)
    }, { transaction });

    // Create Primary Guest in BookingGuests table
    const bookingGuest = await BookingGuest.create({
      BookingId: booking.BookingId,
      FullName: fullGuestName,
      Email: effectiveEmail,
      Phone: cleanPhone || effectivePhone,
      IsPrimaryGuest: true
    }, { transaction });

    await transaction.commit();

    // 9. Release temporary hold-lock session if used
    if (lockSessionId) {
      try {
        await availabilityService.releaseRoomLock(lockSessionId);
      } catch (lockErr) {
        console.warn('Warning: Could not release hold-lock after booking:', lockErr.message);
      }
    }

    // 10. Broadcast Realtime Booking Created Event
    try {
      broadcastRoomEvent('BOOKING_CREATED', {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        roomTypeId: booking.RoomTypeId,
        checkInDate: booking.CheckInDate,
        checkOutDate: booking.CheckOutDate,
        roomQuantity: booking.RoomQuantity,
        totalAmount: booking.TotalAmount,
        depositAmount: booking.DepositAmount,
        status: booking.Status,
        guestName: fullGuestName
      });
    } catch (bcErr) {
      console.warn('Warning: Broadcast failed:', bcErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Khởi tạo đơn đặt phòng trực tuyến thành công.',
      data: {
        bookingId: booking.BookingId,
        confirmationCode: booking.ConfirmationCode,
        status: booking.Status,
        checkInDate: booking.CheckInDate,
        checkOutDate: booking.CheckOutDate,
        numberOfNights: booking.NumberOfNights,
        roomQuantity: booking.RoomQuantity,
        roomSubtotal: booking.RoomSubtotal,
        discountAmount: booking.DiscountAmount,
        addonsTotal,
        totalAmount: booking.TotalAmount,
        depositAmount: booking.DepositAmount,
        primaryGuest: {
          guestId: bookingGuest.BookingGuestId,
          fullName: bookingGuest.FullName,
          email: bookingGuest.Email,
          phone: bookingGuest.Phone
        }
      }
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr.message);
      }
    }
    console.error('Error in createOnlineBooking:', error);
    return res.status(500).json({
      success: false,
      code: 'ERROR_0005_INVALID_VALUE',
      message: 'Không thể khởi tạo đơn đặt phòng do lỗi hệ thống.'
    });
  }
};
