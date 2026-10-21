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
          } else if (addon === 'addon-bbq' || addon === 'seafood_bbq' || addon === 'ADDON_BBQ') {
            addonsTotal += 2200000;
            resolvedAddons.push({ id: 'seafood_bbq', name: 'Tiệc BBQ Hải sản lãng mạn bờ cát', price: 2200000 });
          } else if (addon === 'addon-buffet' || addon === 'ADDON_BUFFET' || addon === 'buffet') {
            const buffetPrice = (effectiveBaseRate >= 100000 ? 250000 : 25) * numberOfNights;
            addonsTotal += buffetPrice;
            resolvedAddons.push({ id: 'buffet', name: 'Buffet Sáng Hàng Ngày (Daily Buffet)', price: buffetPrice });
          } else if (addon === 'ADDON_SHUTTLE') {
            const shuttlePrice = effectiveBaseRate >= 100000 ? 800000 : 35;
            addonsTotal += shuttlePrice;
            resolvedAddons.push({ id: 'ADDON_SHUTTLE', name: 'Đưa Đón Sân Bay Bằng Limousine', price: shuttlePrice });
          } else if (addon === 'ADDON_EARLY_CI') {
            const earlyPrice = effectiveBaseRate >= 100000 ? Math.round(effectiveBaseRate * 0.5) : Math.round(effectiveBaseRate * 0.5 * 100) / 100;
            addonsTotal += earlyPrice;
            resolvedAddons.push({ id: 'ADDON_EARLY_CI', name: 'Nhận Phòng Sớm (Early Check-In)', price: earlyPrice });
          } else if (addon === 'ADDON_LATE_CO') {
            const latePrice = effectiveBaseRate >= 100000 ? Math.round(effectiveBaseRate * 0.5) : Math.round(effectiveBaseRate * 0.5 * 100) / 100;
            addonsTotal += latePrice;
            resolvedAddons.push({ id: 'ADDON_LATE_CO', name: 'Trả Phòng Trễ (Late Check-Out)', price: latePrice });
          }
        }
      }
    }

    const finalTotal = Math.max(0, roomSubtotal - discountAmount + addonsTotal);
    const depRate = req.body.depositRate ? parseFloat(req.body.depositRate) : 0.20;
    const depositAmount = Math.round(finalTotal * depRate);
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

/**
 * TÍNH NĂNG 6: TỰ ĐỘNG TÍNH SỐ ĐÊM, PHỤ THU & TỔNG TIỀN PHÒNG (FEAT-GUEST-06 / A6)
 * Động cơ tự động tính toán chi phí thời gian thực:
 * - Số đêm lưu trú (NumberOfNights)
 * - Tiền phòng gốc (RoomSubtotal)
 * - Phụ thu thêm người lớn / trẻ em phát sinh (ExtraGuestSurcharge)
 * - Phụ thu tiện ích chọn thêm (AddOnsBreakdown)
 * - Thuế & Phí dịch vụ 12% (TaxesAndFees)
 * - Tiền cọc tối thiểu cần thanh toán ngay 20% (DepositAmount)
 * 
 * Endpoint: POST /api/bookings/calculate-pricing hoặc /api/v1/guest/bookings/calculate-pricing
 */
exports.calculatePricing = async (req, res) => {
  try {
    const {
      checkInDate,
      checkOutDate,
      baseRate,
      roomTypeId,
      adults = 2,
      children = 0,
      roomQuantity = 1,
      selectedAddOns = [],
      taxesAndFeesRate = 0.12,
      depositRate = 0.20,
      isGoldMember = false
    } = req.body;

    // 1. Kiểm tra tham số ngày & số lượng khách
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0034_INVALID_CALCULATION_PARAMS',
        message: 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá'
      });
    }

    const d1 = new Date(`${checkInDate}T00:00:00`);
    const d2 = new Date(`${checkOutDate}T00:00:00`);
    const numAdults = parseInt(adults, 10);
    const numChildren = parseInt(children, 10) || 0;
    const numRooms = parseInt(roomQuantity, 10) || 1;

    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1 || isNaN(numAdults) || numAdults < 1) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0034_INVALID_CALCULATION_PARAMS',
        message: 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá'
      });
    }

    // Tính số đêm lưu trú (NumberOfNights)
    const numberOfNights = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (numberOfNights <= 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'ERROR_0034_INVALID_CALCULATION_PARAMS',
        message: 'Dữ liệu ngày hoặc số lượng khách không hợp lệ để tính giá'
      });
    }

    // 2. Xác định đơn giá phòng mỗi đêm (baseRate)
    let effectiveRate = parseFloat(baseRate);
    let standardAdultCapacity = 2;
    let standardChildCapacity = 1;

    if (roomTypeId) {
      try {
        const rt = await RoomType.findByPk(roomTypeId);
        if (rt) {
          if (isNaN(effectiveRate) || effectiveRate <= 0) {
            effectiveRate = parseFloat(rt.BasePrice);
          }
          if (rt.AdultCapacity) standardAdultCapacity = rt.AdultCapacity;
          if (rt.ChildCapacity) standardChildCapacity = rt.ChildCapacity;
        }
      } catch (_) {}
    }

    if (isNaN(effectiveRate) || effectiveRate <= 0) {
      effectiveRate = 240.00; // Tiêu chuẩn theo wireframe
    }

    // Tiền phòng gốc: NumberOfNights * baseRate * roomQuantity
    const roomSubtotal = Math.round((numberOfNights * effectiveRate * numRooms) * 100) / 100;

    // 3. Phụ thu thêm người lớn / trẻ em vượt chuẩn phòng
    const maxStandardAdults = standardAdultCapacity * numRooms;
    const maxStandardChildren = standardChildCapacity * numRooms;

    const extraAdults = Math.max(0, numAdults - maxStandardAdults);
    const extraChildren = Math.max(0, numChildren - maxStandardChildren);

    const isVND = effectiveRate >= 100000;
    const adultSurchargeRate = isVND ? 500000 : 30.00;
    const childSurchargeRate = isVND ? 250000 : 15.00;

    const extraAdultSurcharge = extraAdults * adultSurchargeRate * numberOfNights;
    const extraChildSurcharge = extraChildren * childSurchargeRate * numberOfNights;
    const extraGuestSurcharge = Math.round((extraAdultSurcharge + extraChildSurcharge) * 100) / 100;

    // 4. Phụ thu Add-on (selectedAddOns)
    const ADDON_CATALOG = {
      ADDON_BUFFET: {
        code: 'ADDON_BUFFET',
        name: 'Buffet Sáng Hàng Ngày (Daily Buffet)',
        pricePerNight: isVND ? 250000 : 25.00,
        type: 'PER_NIGHT'
      },
      ADDON_SHUTTLE: {
        code: 'ADDON_SHUTTLE',
        name: 'Đưa Đón Sân Bay Bằng Limousine',
        fixedPrice: isVND ? 800000 : 35.00,
        type: 'FIXED'
      },
      ADDON_EARLY_CI: {
        code: 'ADDON_EARLY_CI',
        name: 'Nhận Phòng Sớm (Early Check-In)',
        fixedPrice: isVND ? Math.round(effectiveRate * 0.5) : Math.round(effectiveRate * 0.5 * 100) / 100,
        type: 'FIXED'
      },
      ADDON_LATE_CO: {
        code: 'ADDON_LATE_CO',
        name: 'Trả Phòng Trễ (Late Check-Out)',
        fixedPrice: isVND ? Math.round(effectiveRate * 0.5) : Math.round(effectiveRate * 0.5 * 100) / 100,
        type: 'FIXED'
      },
      ADDON_SPA: {
        code: 'ADDON_SPA',
        name: 'Trị Liệu Spa Toàn Thân Cặp Đôi 90 Phút',
        fixedPrice: isVND ? 1800000 : 80.00,
        type: 'FIXED'
      },
      ADDON_BBQ: {
        code: 'ADDON_BBQ',
        name: 'Tiệc BBQ Hải Sản Tối Lãng Mạn Bờ Cát',
        fixedPrice: isVND ? 2200000 : 100.00,
        type: 'FIXED'
      },
      ADDON_FLOATING: {
        code: 'ADDON_FLOATING',
        name: 'Bữa Sáng Bồng Bềnh Floating Breakfast',
        fixedPrice: isVND ? 900000 : 40.00,
        type: 'FIXED'
      }
    };

    const addOnsBreakdown = [];
    let addOnsTotal = 0;

    const addOnList = Array.isArray(selectedAddOns) ? selectedAddOns : [];
    for (const code of addOnList) {
      const normalizedCode = String(code).trim().toUpperCase();
      let key = normalizedCode;
      if (normalizedCode.includes('LIMO') || normalizedCode === 'ADDON_SHUTTLE') key = 'ADDON_SHUTTLE';
      else if (normalizedCode.includes('BUFFET') || normalizedCode === 'ADDON_BUFFET') key = 'ADDON_BUFFET';
      else if (normalizedCode.includes('SPA') || normalizedCode === 'ADDON_SPA') key = 'ADDON_SPA';
      else if (normalizedCode.includes('BBQ') || normalizedCode === 'ADDON_BBQ') key = 'ADDON_BBQ';
      else if (normalizedCode.includes('FLOAT') || normalizedCode === 'ADDON_FLOATING') key = 'ADDON_FLOATING';
      else if (normalizedCode.includes('EARLY') || normalizedCode === 'ADDON_EARLY_CI') key = 'ADDON_EARLY_CI';
      else if (normalizedCode.includes('LATE') || normalizedCode === 'ADDON_LATE_CO') key = 'ADDON_LATE_CO';

      const addonConfig = ADDON_CATALOG[key];
      if (addonConfig) {
        let total = 0;
        let unitPrice = 0;
        let qty = 1;

        if (addonConfig.type === 'PER_NIGHT') {
          unitPrice = addonConfig.pricePerNight;
          qty = numberOfNights;
          total = Math.round(unitPrice * qty * 100) / 100;
        } else {
          unitPrice = addonConfig.fixedPrice;
          qty = 1;
          total = unitPrice;
        }

        addOnsBreakdown.push({
          code: addonConfig.code,
          name: addonConfig.name,
          unitPrice,
          quantity: qty,
          total
        });
        addOnsTotal += total;
      }
    }
    addOnsTotal = Math.round(addOnsTotal * 100) / 100;

    // Tổng tiền phụ thu = phụ thu người lớn/trẻ em + phụ thu tiện ích đã chọn
    const surchargeAmount = Math.round((extraGuestSurcharge + addOnsTotal) * 100) / 100;

    // Ưu đãi hội viên Gold (nếu có)
    let discountAmount = 0;
    if (isGoldMember) {
      discountAmount = Math.round((roomSubtotal * 0.10) * 100) / 100;
    }

    // Chi phí trước thuế
    const subtotalBeforeTax = Math.round((roomSubtotal + surchargeAmount - discountAmount) * 100) / 100;

    // Thuế & Phí dịch vụ (Mặc định 12% = 0.12 theo quy định đặc tả)
    const taxRate = parseFloat(taxesAndFeesRate) >= 0 ? parseFloat(taxesAndFeesRate) : 0.12;
    const taxesAndFees = Math.round((subtotalBeforeTax * taxRate) * 100) / 100;

    // Tổng chi phí (TotalAmount)
    const totalAmount = Math.round((subtotalBeforeTax + taxesAndFees) * 100) / 100;

    // Tiền cọc tối thiểu cần thanh toán ngay (Mặc định 20% = 0.20 theo đặc tả)
    const depRate = parseFloat(depositRate) > 0 ? parseFloat(depositRate) : 0.20;
    const depositAmount = Math.round((totalAmount * depRate) * 100) / 100;

    return res.status(200).json({
      success: true,
      code: 'SUCCESS_0003_PRICE_CALCULATED',
      message: 'Tính toán chi phí thành công',
      data: {
        checkInDate,
        checkOutDate,
        numberOfNights,
        baseRate: effectiveRate,
        roomQuantity: numRooms,
        roomSubtotal,
        extraAdults,
        extraChildren,
        extraGuestSurcharge,
        selectedAddOns: addOnList,
        addOnsBreakdown,
        addOnsTotal,
        surchargeAmount,
        discountAmount,
        subtotalBeforeTax,
        taxesAndFeesRate: taxRate,
        taxesAndFees,
        totalAmount,
        depositRate: depRate,
        depositAmount,
        currency: isVND ? 'VND' : 'USD'
      }
    });
  } catch (error) {
    console.error('Lỗi khi tính toán chi phí đặt phòng:', error);
    return res.status(500).json({
      success: false,
      errorCode: 'ERROR_SERVER',
      message: 'Lỗi máy chủ khi tính toán giá phòng'
    });
  }
};
