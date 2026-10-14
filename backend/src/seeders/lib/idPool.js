'use strict';

/**
 * Cache IDs từ các bảng cha để dùng làm khóa ngoại (FK).
 * Phải gọi preload() TRƯỚC khi seeder bảng phụ thuộc chạy.
 */
const { sequelize } = require('../../models');

const pool = {
  userIds: [],
  tierIds: [],
  branchIds: [],
  roleIds: [],
  roomIds: [],
  roomTypeIds: [],
  roomsByType: {},
  roomsByBranch: {},
  amenityIds: [],
  voucherIds: [],
  otaChannelIds: [],
  bookingIds: [],
  bookingIdsByUser: {},
  stayIds: [],
  stayIdsByBooking: {},
  menuItemIds: [],
  menuCategoryIds: [],
  restaurantTableIds: [],
  serviceIds: [],
  serviceCategoryIds: [],
  invoiceIds: [],
  paymentIds: [],
  inventoryItemIds: [],
  reviewIds: [],
  chatbotKbIds: [],
  staffUserIds: [],
  shiftUserIds: [],
  foodOrderIds: [],
};

async function preload() {
  console.log('   [IdPool] Preloading FK ID pools...');

  const querySingleCol = async (sql) => {
    try {
      const [rows] = await sequelize.query(sql);
      return rows.map(r => Object.values(r)[0]);
    } catch (_) {
      return [];
    }
  };

  pool.userIds = await querySingleCol('SELECT UserId FROM Users');
  pool.tierIds = await querySingleCol('SELECT TierId FROM MembershipTiers');
  pool.branchIds = await querySingleCol('SELECT BranchId FROM Branches');
  pool.roleIds = await querySingleCol('SELECT RoleId FROM Roles');
  pool.roomIds = await querySingleCol('SELECT RoomId FROM Rooms');
  pool.roomTypeIds = await querySingleCol('SELECT RoomTypeId FROM RoomTypes');
  pool.amenityIds = await querySingleCol('SELECT AmenityId FROM Amenities');
  pool.voucherIds = await querySingleCol('SELECT VoucherId FROM Vouchers');
  pool.otaChannelIds = await querySingleCol('SELECT OTAChannelId FROM OTAChannels');
  pool.bookingIds = await querySingleCol('SELECT BookingId FROM Bookings');
  pool.stayIds = await querySingleCol('SELECT StayId FROM Stays');
  pool.menuItemIds = await querySingleCol('SELECT MenuItemId FROM MenuItems');
  pool.menuCategoryIds = await querySingleCol('SELECT CategoryId FROM MenuCategories');
  pool.restaurantTableIds = await querySingleCol('SELECT TableId FROM RestaurantTables');
  pool.serviceIds = await querySingleCol('SELECT ServiceId FROM Services');
  pool.serviceCategoryIds = await querySingleCol('SELECT CategoryId FROM ServiceCategories');
  pool.invoiceIds = await querySingleCol('SELECT InvoiceId FROM Invoices');
  pool.paymentIds = await querySingleCol('SELECT PaymentId FROM Payments');
  pool.inventoryItemIds = await querySingleCol('SELECT ItemId FROM InventoryItems');
  pool.reviewIds = await querySingleCol('SELECT ReviewId FROM Reviews');
  pool.chatbotKbIds = await querySingleCol('SELECT KnowledgeId FROM ChatbotKnowledgeBase');
  pool.foodOrderIds = await querySingleCol('SELECT FoodOrderId FROM FoodOrders');

  // Nhóm Rooms theo RoomTypeId & BranchId
  try {
    const [rooms] = await sequelize.query('SELECT RoomId, RoomTypeId, BranchId FROM Rooms ORDER BY RoomId');
    pool.roomsByType = rooms.reduce((acc, r) => {
      if (!acc[r.RoomTypeId]) acc[r.RoomTypeId] = [];
      acc[r.RoomTypeId].push(r.RoomId);
      return acc;
    }, {});

    pool.roomsByBranch = rooms.reduce((acc, r) => {
      if (!acc[r.BranchId]) acc[r.BranchId] = [];
      acc[r.BranchId].push(r.RoomId);
      return acc;
    }, {});
  } catch (_) { }

  // Nhóm Bookings theo UserId
  try {
    const [bookings] = await sequelize.query('SELECT BookingId, UserId FROM Bookings ORDER BY BookingId');
    pool.bookingIdsByUser = bookings.reduce((acc, b) => {
      if (!acc[b.UserId]) acc[b.UserId] = [];
      acc[b.UserId].push(b.BookingId);
      return acc;
    }, {});
  } catch (_) { }

  // Nhóm Stays theo BookingId
  try {
    const [stays] = await sequelize.query('SELECT StayId, BookingId FROM Stays ORDER BY StayId');
    pool.stayIdsByBooking = stays.reduce((acc, s) => {
      if (!acc[s.BookingId]) acc[s.BookingId] = [];
      acc[s.BookingId].push(s.StayId);
      return acc;
    }, {});
  } catch (_) { }

  pool.staffUserIds = pool.userIds.length ? pool.userIds : [1];
  pool.shiftUserIds = pool.userIds.length ? pool.userIds : [1];

  console.log(`   [IdPool] Preloaded: Users(${pool.userIds.length}), Rooms(${pool.roomIds.length}), Bookings(${pool.bookingIds.length})...\n`);
}

function pick(arr, fallback = 1) {
  if (!arr || arr.length === 0) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min = 1, max = 5) {
  if (!arr || arr.length === 0) return [];
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const result = [];
  const used = new Set();
  for (let i = 0; i < count && used.size < arr.length; i++) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

const helpers = {
  pickUser: () => pick(pool.userIds),
  pickTier: () => pick(pool.tierIds),
  pickBranch: () => pick(pool.branchIds),
  pickRole: () => pick(pool.roleIds),
  pickRoom: () => pick(pool.roomIds),
  pickRoomByType: (roomTypeId) => {
    const list = pool.roomsByType[roomTypeId];
    return list && list.length ? pick(list) : pick(pool.roomIds);
  },
  pickRoomType: () => pick(pool.roomTypeIds),
  pickAmenity: () => pick(pool.amenityIds),
  pickManyAmenities: () => pickMany(pool.amenityIds, 2, 6),
  pickVoucher: () => pool.voucherIds.length ? pick(pool.voucherIds) : null,
  pickOTAChannel: () => pick(pool.otaChannelIds),
  pickBooking: () => pick(pool.bookingIds),
  pickBookingByUser: (userId) => {
    const list = pool.bookingIdsByUser[userId];
    return list && list.length ? pick(list) : pick(pool.bookingIds);
  },
  pickStay: () => pick(pool.stayIds),
  pickStayByBooking: (bookingId) => {
    const list = pool.stayIdsByBooking[bookingId];
    return list && list.length ? pick(list) : pick(pool.stayIds);
  },
  pickMenuItem: () => pick(pool.menuItemIds),
  pickMenuCategory: () => pick(pool.menuCategoryIds),
  pickRestaurantTable: () => pick(pool.restaurantTableIds),
  pickService: () => pick(pool.serviceIds),
  pickServiceCategory: () => pick(pool.serviceCategoryIds),
  pickInvoice: () => pick(pool.invoiceIds),
  pickPayment: () => pick(pool.paymentIds),
  pickInventoryItem: () => pick(pool.inventoryItemIds),
  pickReview: () => pick(pool.reviewIds),
  pickChatbotKb: () => pick(pool.chatbotKbIds),
  pickStaffUser: () => pick(pool.staffUserIds),
  pickFoodOrder: () => pick(pool.foodOrderIds),
};

module.exports = { preload, pick, pickMany, pool, ...helpers };
