// frontend/src/api/bookingApi.js

const API_ENDPOINTS = [
  ...(import.meta.env.VITE_API_URL
    ? [`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/v1/bookings`]
    : []),
  'http://localhost:5000/api/v1/bookings',
  '/api/v1/bookings',
  '/api/bookings',
  'http://localhost:5000/api/v1/bookings',
  'http://localhost:5000/api/bookings',
  'http://localhost:5000/bookings',
];

async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('hotel_token') || localStorage.getItem('token'))
        : null;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
      });

      const text = await res.text();
      if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
        lastErr = new Error('Máy chủ phản hồi HTML thay vì JSON.');
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        lastErr = new Error('Phản hồi từ máy chủ không phải định dạng JSON hợp lệ.');
        continue;
      }

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || `Lỗi máy chủ HTTP ${res.status}`;
        const errObj = new Error(errorMsg);
        errObj.status = res.status;
        errObj.errorCode = data?.errorCode || data?.code;
        errObj.data = data;
        throw errObj;
      }

      return data;
    } catch (err) {
      lastErr = err;
      if (err.status && err.message) {
        throw err;
      }
    }
  }
  throw lastErr || new Error('Không thể kết nối đến máy chủ backend.');
}

export const bookingApi = {
  // Lấy chi tiết bảng gom chi phí lưu trú (FEAT-INVOICE-01 / C6)
  getBookingCharges: async (bookingId) => {
    // Lấy thêm thông tin khách hàng / hạng phòng / ngày lưu trú và hỗ trợ tra cứu theo cả ConfirmationCode
    let bookingMeta = null;
    try {
      const metaJson = await safeFetchJson(`/${bookingId}`).catch(() => null);
      bookingMeta = metaJson?.data || metaJson || null;
    } catch (_) {}

    const resolvedId = bookingMeta?.bookingId || bookingId;
    const res = await safeFetchJson(`/${resolvedId}/charges`);
    const raw = res?.data || res || {};

    const rawStays = Array.isArray(raw.stays) ? raw.stays : [];
    const defaultRoomTypeName =
      bookingMeta?.roomType?.TypeName ||
      raw.roomTypeName ||
      'Hạng Phòng Tiêu Chuẩn';
    const defaultCheckIn = raw.checkInDate || bookingMeta?.checkInDate || null;
    const defaultCheckOut = raw.checkOutDate || bookingMeta?.checkOutDate || null;

    const stays = rawStays.map((st) => ({
      ...st,
      stayId: st.stayId,
      roomId: st.roomId,
      roomNumber: st.roomNumber || `P.${st.roomId}`,
      roomTypeName: st.roomTypeName || defaultRoomTypeName,
      roomType: st.roomTypeName || defaultRoomTypeName,
      checkIn: st.checkIn || st.actualCheckIn || defaultCheckIn,
      checkOut: st.checkOut || st.actualCheckOut || defaultCheckOut,
      nights: Number(st.nights ?? st.room?.nights ?? 1),
      pricePerNight: Number(st.pricePerNight ?? st.room?.unitPrice ?? 0),
      ratePerNight: Number(st.pricePerNight ?? st.room?.unitPrice ?? 0),
      earlyCheckInFee: Number(st.earlyCheckInFee || 0),
      lateCheckOutFee: Number(st.lateCheckOutFee || 0),
      roomTotal: Number(st.roomTotal ?? st.room?.subtotal ?? 0),
      totalRoomCost: Number(st.roomTotal ?? st.room?.subtotal ?? 0),
    }));

    const minibar = Array.isArray(raw.minibar)
      ? raw.minibar
      : rawStays.flatMap((st) =>
          (st.minibar || []).map((mb) => ({
            usageId: mb.usageId,
            item:
              mb.item ||
              mb.itemName ||
              `Sản phẩm Minibar #${mb.itemId} (${st.roomNumber || `P.${st.roomId}`})`,
            quantity: Number(mb.quantity || 1),
            price: Number(mb.price ?? mb.unitPrice ?? 0),
            total: Number(mb.total ?? mb.subtotal ?? 0),
            roomNumber: mb.roomNumber || st.roomNumber || (st.roomId ? `P.${st.roomId}` : '—'),
            consumedAt: mb.consumedAt || mb.usageDate || null,
            usedAt: mb.consumedAt || mb.usageDate || null,
          }))
        );

    const services = Array.isArray(raw.services)
      ? raw.services
      : rawStays.flatMap((st) =>
          (st.services || []).map((sv) => ({
            orderId: sv.orderId,
            service:
              sv.service ||
              sv.serviceName ||
              `Dịch vụ khách sạn #${sv.serviceId} (${st.roomNumber || `P.${st.roomId}`})`,
            type: sv.type || sv.categoryName || 'Dịch vụ lưu trú',
            quantity: Number(sv.quantity || 1),
            price: Number(sv.price ?? sv.unitPrice ?? 0),
            total: Number(sv.total ?? sv.subtotal ?? 0),
            status: sv.status || 'Completed',
            orderedAt: sv.orderedAt || sv.orderDate || null,
          }))
        );

    const foodAndBeverage = Array.isArray(raw.foodAndBeverage)
      ? raw.foodAndBeverage
      : rawStays.flatMap((st) =>
          (st.food || []).map((fb) => ({
            foodOrderId: fb.foodOrderId,
            item:
              fb.item ||
              `Đơn ẩm thực ${fb.orderType || 'RoomService'} (${st.roomNumber || `P.${st.roomId}`})`,
            quantity: Number(fb.quantity || 1),
            price: Number(fb.price ?? fb.subtotal ?? 0),
            total: Number(fb.total ?? fb.subtotal ?? 0),
            orderCode: fb.orderCode || `FNB-${fb.foodOrderId}`,
            orderedAt: fb.orderedAt || fb.orderTime || null,
          }))
        );

    // Bóc tách Phí gia hạn phòng (StayExtensions)
    const extensions = Array.isArray(raw.extensions)
      ? raw.extensions
      : rawStays.flatMap((st) =>
          (st.extensions || []).map((ext) => ({
            extensionId: ext.extensionId,
            stayId: st.stayId,
            roomNumber: ext.roomNumber || st.roomNumber || (st.roomId ? `P.${st.roomId}` : '—'),
            nights: Number(ext.nights || 1),
            total: Number(ext.total || ext.amount || 0),
            createdAt: ext.createdAt || null,
          }))
        );

    // Bóc tách Bồi thường thiệt hại buồng phòng (DamageItems, Linen, Keycard)
    const damages = Array.isArray(raw.damages)
      ? raw.damages
      : rawStays.flatMap((st) =>
          (st.damages || []).map((dam) => ({
            damageId: dam.damageId || dam.damageItemId,
            stayId: st.stayId,
            roomNumber: dam.roomNumber || st.roomNumber || (st.roomId ? `P.${st.roomId}` : '—'),
            item: dam.item || dam.itemName || 'Bồi thường tài sản phòng',
            reason: dam.reason || dam.reasonCode || '',
            total: Number(dam.total || dam.approvedCharge || dam.proposedCharge || 0),
            createdAt: dam.createdAt || null,
          }))
        );

    const roomSubtotalFromStays = stays.reduce((sum, st) => sum + Number(st.roomTotal || 0), 0);
    const extensionSubtotal = extensions.reduce((sum, e) => sum + Number(e.total || 0), 0);
    const minibarSubtotal = minibar.reduce((sum, m) => sum + Number(m.total || 0), 0);
    const serviceSubtotal = services.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const foodSubtotal = foodAndBeverage.reduce((sum, f) => sum + Number(f.total || 0), 0);
    const damageSubtotal = damages.reduce((sum, d) => sum + Number(d.total || 0), 0);
    const surcharge = Number(raw.surchargeAmount ?? raw.summary?.surcharge ?? 0);
    const discount = Number(raw.discountAmount ?? raw.summary?.discount ?? 0);
    const metaTotal = Number(bookingMeta?.totalAmount || bookingMeta?.payment?.totalAmount || 0);
    const metaDeposit = Number(bookingMeta?.depositAmount || bookingMeta?.payment?.depositAmount || 0);
    const computedGrandTotal = roomSubtotalFromStays + extensionSubtotal + minibarSubtotal + serviceSubtotal + foodSubtotal + damageSubtotal + surcharge - discount;
    const grandTotal = Number(raw.grandTotal > 0 ? raw.grandTotal : (raw.summary?.grandTotal > 0 ? raw.summary.grandTotal : (stays.length > 0 ? computedGrandTotal : metaTotal)));
    const totalPaid = Math.max(Number(raw.totalPaid ?? raw.summary?.totalPaid ?? 0), metaDeposit);
    const remainingBalance = Number(raw.remainingBalance >= 0 ? raw.remainingBalance : (raw.summary?.remainingBalance >= 0 ? raw.summary.remainingBalance : Math.max(0, grandTotal - totalPaid)));
    const roomSubtotal =
      stays.length > 0
        ? roomSubtotalFromStays
        : Number(bookingMeta?.roomSubtotal || bookingMeta?.payment?.originalPrice || Math.max(0, grandTotal - surcharge + discount));

    const guestName =
      raw.guestName ||
      bookingMeta?.primaryGuest?.FullName ||
      bookingMeta?.note?.guestFullName ||
      `Khách đặt phòng #${raw.bookingId || bookingId}`;

    const roomNumber =
      raw.roomNumber ||
      (stays.length > 0
        ? [...new Set(stays.map((s) => s.roomNumber).filter(Boolean))].join(', ')
        : 'Chưa gán');

    return {
      ...raw,
      bookingId: raw.bookingId || Number(bookingId) || bookingId,
      guestName,
      roomNumber,
      checkInDate: defaultCheckIn,
      checkOutDate: defaultCheckOut,
      estimated: Boolean(raw.estimated),
      hasPendingServices: Boolean(raw.hasPendingServices),
      stays,
      extensions,
      minibar,
      services,
      foodAndBeverage,
      damages,
      summary: {
        roomSubtotal,
        extensionSubtotal,
        minibarSubtotal,
        serviceSubtotal,
        foodSubtotal,
        damageSubtotal,
        surcharge,
        discount,
        grandTotal,
        totalPaid,
        remainingBalance,
      },
    };
  },

  // Lấy chi tiết booking
  getBookingDetail: async (bookingId) => {
    return await safeFetchJson(`/${bookingId}`);
  },

  // Lấy danh sách booking gần đây để chọn nhanh trên trang Master Folio
  getRecentBookings: async (limit = 20) => {
    const res = await safeFetchJson(`?limit=${limit}`);
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.data?.bookings)) return res.data.bookings;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  },
};

export default bookingApi;
