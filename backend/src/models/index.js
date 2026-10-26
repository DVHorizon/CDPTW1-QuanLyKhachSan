const sequelize = require('../config/sequelize');

// Import model definitions
const defineBranch = require('./Branch');
const defineRoomType = require('./RoomType');
const defineRoom = require('./Room');
const defineRoomSearchIndex = require('./RoomSearchIndex');
const defineAmenity = require('./Amenity');
const defineRoomTypeAmenity = require('./RoomTypeAmenity');
const defineRole = require('./Role');
const defineMembershipTier = require('./MembershipTier');
const defineUser = require('./User');
const defineBooking = require('./Booking');
const defineBookingGuest = require('./BookingGuest');
const defineReview = require('./Review');
const defineReviewPhoto = require('./ReviewPhoto');
const defineMenuCategory = require('./MenuCategory');
const defineMenuItem = require('./MenuItem');
const defineRoomStatusHistory = require('./RoomStatusHistory');
const defineStay = require('./Stay');
const defineFoodOrder = require('./FoodOrder');
const defineFoodOrderDetail = require('./FoodOrderDetail');
const defineInvoice = require('./Invoice');
const defineInvoiceDetail = require('./InvoiceDetail');
const definePayment = require('./Payment');
const defineServiceCategory = require('./ServiceCategory');
const defineService = require('./Service');
const defineServiceOrder = require('./ServiceOrder');
const defineLateFeePolicy = require('./LateFeePolicy');
const defineRoomInspectionReport = require('./RoomInspectionReport');
const defineDamageItem = require('./DamageItem');
const defineVoucher = require('./Voucher');
const defineMinibarProduct = require('./MinibarProduct');
const defineMinibarInspection = require('./MinibarInspection');
const defineMinibarInspectionLine = require('./MinibarInspectionLine');
const defineMinibarInspectionEvent = require('./MinibarInspectionEvent');

// Operations & Smart Lock models (tuyen/7)
const defineAuditLog = require('./AuditLog');
const defineFraudAlert = require('./FraudAlert');
const defineMarketingCampaign = require('./MarketingCampaign');
const defineGuestNotificationTemplate = require('./GuestNotificationTemplate');
const defineDispatchLog = require('./DispatchLog');
const defineInventoryItem = require('./InventoryItem');
const defineInventoryBatch = require('./InventoryBatch');
const defineLinenItem = require('./LinenItem');
const defineLaundryBatch = require('./LaundryBatch');
const defineMaintenanceTicket = require('./MaintenanceTicket');
const defineLostAndFoundItem = require('./LostAndFoundItem');
const defineSmartLockKey = require('./SmartLockKey');
const defineMinibarUsage = require('./MinibarUsage');

// Initialize models
const Branch = defineBranch(sequelize);
const RoomType = defineRoomType(sequelize);
const Room = defineRoom(sequelize);
const RoomSearchIndex = defineRoomSearchIndex(sequelize);
const Amenity = defineAmenity(sequelize);
const RoomTypeAmenity = defineRoomTypeAmenity(sequelize);
const Role = defineRole(sequelize);
const MembershipTier = defineMembershipTier(sequelize);
const User = defineUser(sequelize);
const Booking = defineBooking(sequelize);
const BookingGuest = defineBookingGuest(sequelize);
const Voucher = defineVoucher(sequelize);
const Review = defineReview(sequelize);
const ReviewPhoto = defineReviewPhoto(sequelize);
const MenuCategory = defineMenuCategory(sequelize);
const MenuItem = defineMenuItem(sequelize);
const RoomStatusHistory = defineRoomStatusHistory(sequelize);
const Stay = defineStay(sequelize);
const FoodOrder = defineFoodOrder(sequelize);
const FoodOrderDetail = defineFoodOrderDetail(sequelize);
const Invoice = defineInvoice(sequelize);
const InvoiceDetail = defineInvoiceDetail(sequelize);
const Payment = definePayment(sequelize);
const ServiceCategory = defineServiceCategory(sequelize);
const Service = defineService(sequelize);
const ServiceOrder = defineServiceOrder(sequelize);
const LateFeePolicy = defineLateFeePolicy(sequelize);
const RoomInspectionReport = defineRoomInspectionReport(sequelize);
const DamageItem = defineDamageItem(sequelize);
const MinibarProduct = defineMinibarProduct(sequelize);
const MinibarInspection = defineMinibarInspection(sequelize);
const MinibarInspectionLine = defineMinibarInspectionLine(sequelize);
const MinibarInspectionEvent = defineMinibarInspectionEvent(sequelize);

// Initialize Operations & Smart Lock models
const AuditLog = defineAuditLog(sequelize);
const FraudAlert = defineFraudAlert(sequelize);
const MarketingCampaign = defineMarketingCampaign(sequelize);
const GuestNotificationTemplate = defineGuestNotificationTemplate(sequelize);
const DispatchLog = defineDispatchLog(sequelize);
const InventoryItem = defineInventoryItem(sequelize);
const InventoryBatch = defineInventoryBatch(sequelize);
const LinenItem = defineLinenItem(sequelize);
const LaundryBatch = defineLaundryBatch(sequelize);
const MaintenanceTicket = defineMaintenanceTicket(sequelize);
const LostAndFoundItem = defineLostAndFoundItem(sequelize);
const SmartLockKey = defineSmartLockKey(sequelize);
const MinibarUsage = defineMinibarUsage(sequelize);

// Inventory Relationships
InventoryItem.hasMany(InventoryBatch, { foreignKey: 'ItemId', as: 'batches' });
InventoryBatch.belongsTo(InventoryItem, { foreignKey: 'ItemId', as: 'item' });

// Setup Relationships / Associations
// 1. Role & User
Role.hasMany(User, { foreignKey: 'RoleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'RoleId', as: 'role' });

// 2. MembershipTier & User
MembershipTier.hasMany(User, { foreignKey: 'TierId', as: 'users' });
User.belongsTo(MembershipTier, { foreignKey: 'TierId', as: 'membershipTier' });

// 3. Branch & Room
Branch.hasMany(Room, { foreignKey: 'BranchId', as: 'rooms' });
Room.belongsTo(Branch, { foreignKey: 'BranchId', as: 'branch' });

// 4. RoomType & Room
RoomType.hasMany(Room, { foreignKey: 'RoomTypeId', as: 'rooms' });
Room.belongsTo(RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 4b. RoomType & Amenity (N-N through RoomTypeAmenities)
RoomType.belongsToMany(Amenity, { through: RoomTypeAmenity, foreignKey: 'RoomTypeId', otherKey: 'AmenityId', as: 'amenityList' });
Amenity.belongsToMany(RoomType, { through: RoomTypeAmenity, foreignKey: 'AmenityId', otherKey: 'RoomTypeId', as: 'roomTypes' });

// 5. User & Booking
User.hasMany(Booking, { foreignKey: 'UserId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 6. RoomType & Booking
RoomType.hasMany(Booking, { foreignKey: 'RoomTypeId', as: 'bookings' });
Booking.belongsTo(RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 6b. Booking & BookingGuest
Booking.hasMany(BookingGuest, { foreignKey: 'BookingId', as: 'guests' });
BookingGuest.belongsTo(Booking, { foreignKey: 'BookingId', as: 'booking' });

// 6c. Booking & Voucher
Voucher.hasMany(Booking, { foreignKey: 'VoucherId', as: 'bookings' });
Booking.belongsTo(Voucher, { foreignKey: 'VoucherId', as: 'voucher' });

// 7. User & Review
User.hasMany(Review, { foreignKey: 'UserId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 7b. Review & ReviewPhoto
Review.hasMany(ReviewPhoto, { foreignKey: 'ReviewId', as: 'photos' });
ReviewPhoto.belongsTo(Review, { foreignKey: 'ReviewId', as: 'review' });

// 8. MenuCategory & MenuItem
MenuCategory.hasMany(MenuItem, { foreignKey: 'CategoryId' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'CategoryId' });

// 9. Booking & Stay
Booking.hasMany(Stay, { foreignKey: 'BookingId' });
Stay.belongsTo(Booking, { foreignKey: 'BookingId' });

// 10. Room & Stay
Room.hasMany(Stay, { foreignKey: 'RoomId' });
Stay.belongsTo(Room, { foreignKey: 'RoomId' });

// 15. Room & RoomStatusHistory (FEAT-ROOMSTATUS-01)
Room.hasMany(RoomStatusHistory, { foreignKey: 'RoomId', as: 'statusHistory' });
RoomStatusHistory.belongsTo(Room, { foreignKey: 'RoomId', as: 'room' });
User.hasMany(RoomStatusHistory, { foreignKey: 'StatusChangedBy', as: 'statusChanges' });
RoomStatusHistory.belongsTo(User, { foreignKey: 'StatusChangedBy', as: 'changedBy' });

// 11. Stay & FoodOrder
Stay.hasMany(FoodOrder, { foreignKey: 'StayId' });
FoodOrder.belongsTo(Stay, { foreignKey: 'StayId' });

// 12. Invoices & InvoiceDetails
Stay.hasOne(Invoice, { foreignKey: 'StayId' });
Invoice.belongsTo(Stay, { foreignKey: 'StayId' });
Booking.hasMany(Invoice, { foreignKey: 'BookingId' });
Invoice.belongsTo(Booking, { foreignKey: 'BookingId' });

Invoice.hasMany(InvoiceDetail, { foreignKey: 'InvoiceId', as: 'details' });
InvoiceDetail.belongsTo(Invoice, { foreignKey: 'InvoiceId' });

// Payments
Booking.hasMany(Payment, { foreignKey: 'BookingId', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'BookingId', as: 'booking' });

// 13. FoodOrder & FoodOrderDetail
FoodOrder.hasMany(FoodOrderDetail, { foreignKey: 'FoodOrderId', as: 'details' });
FoodOrderDetail.belongsTo(FoodOrder, { foreignKey: 'FoodOrderId' });

// 14. MenuItem & FoodOrderDetail
MenuItem.hasMany(FoodOrderDetail, { foreignKey: 'MenuItemId' });
FoodOrderDetail.belongsTo(MenuItem, { foreignKey: 'MenuItemId' });

// 14b. FoodOrder & Review (FEAT-FNB-10)
FoodOrder.hasOne(Review, { foreignKey: 'FoodOrderId', as: 'review' });
Review.belongsTo(FoodOrder, { foreignKey: 'FoodOrderId', as: 'foodOrder' });

// 15. RestaurantTable & TableReservation
const defineRestaurantTable = require('./RestaurantTable');
const defineTableReservation = require('./TableReservation');
const RestaurantTable = defineRestaurantTable(sequelize);
const TableReservation = defineTableReservation(sequelize);

RestaurantTable.hasMany(TableReservation, { foreignKey: 'TableId', as: 'reservations' });
TableReservation.belongsTo(RestaurantTable, { foreignKey: 'TableId', as: 'table' });

User.hasMany(TableReservation, { foreignKey: 'UserId', as: 'tableReservations' });
TableReservation.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 16. ServiceCategory & Service
ServiceCategory.hasMany(Service, { foreignKey: 'CategoryId', as: 'services' });
Service.belongsTo(ServiceCategory, { foreignKey: 'CategoryId', as: 'category' });

// 16. ServiceOrder associations
Stay.hasMany(ServiceOrder, { foreignKey: 'StayId', as: 'serviceOrders' });
ServiceOrder.belongsTo(Stay, { foreignKey: 'StayId', as: 'stay' });

Service.hasMany(ServiceOrder, { foreignKey: 'ServiceId', as: 'orders' });
ServiceOrder.belongsTo(Service, { foreignKey: 'ServiceId', as: 'service' });

RoomType.hasMany(RoomSearchIndex, { foreignKey: 'RoomTypeId', as: 'searchIndices' });
RoomSearchIndex.belongsTo(RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 17. Inspection & Damage Associations
Stay.hasOne(RoomInspectionReport, { foreignKey: 'StayId', as: 'inspectionReport' });
RoomInspectionReport.belongsTo(Stay, { foreignKey: 'StayId', as: 'stay' });

Stay.hasMany(DamageItem, { foreignKey: 'StayId', as: 'damageItems' });
DamageItem.belongsTo(Stay, { foreignKey: 'StayId', as: 'stay' });

RoomInspectionReport.hasMany(DamageItem, { foreignKey: 'InspectionId', as: 'damageItems' });
DamageItem.belongsTo(RoomInspectionReport, { foreignKey: 'InspectionId', as: 'inspection' });

// 18. Payment Associations (FEAT-PAYMENT-01)
Invoice.hasMany(Payment, { foreignKey: 'InvoiceId', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'InvoiceId', as: 'invoice' });

// 19. Minibar Associations (FEAT-MINIBAR-01 - Spec 12)
Stay.hasMany(MinibarInspection, { foreignKey: 'StayId', as: 'minibarInspections' });
MinibarInspection.belongsTo(Stay, { foreignKey: 'StayId', as: 'stay' });

MinibarInspection.hasMany(MinibarInspectionLine, { foreignKey: 'InspectionId', as: 'lines' });
MinibarInspectionLine.belongsTo(MinibarInspection, { foreignKey: 'InspectionId', as: 'inspection' });

MinibarInspectionLine.belongsTo(MinibarProduct, { foreignKey: 'ProductId', as: 'product' });
User.hasMany(Payment, { foreignKey: 'UserId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 19. Minibar Associations (FEAT-INVOICE-01 / C6)
Stay.hasMany(MinibarUsage, { foreignKey: 'StayId', as: 'minibarUsages' });
MinibarUsage.belongsTo(Stay, { foreignKey: 'StayId', as: 'stay' });

module.exports = {
  sequelize,
  Branch,
  RoomType,
  Room,
  RoomSearchIndex,
  Amenity,
  RoomTypeAmenity,
  Role,
  MembershipTier,
  User,
  Booking,
  BookingGuest,
  Review,
  ReviewPhoto,
  MenuCategory,
  MenuItem,
  Stay,
  FoodOrder,
  FoodOrderDetail,
  Invoice,
  InvoiceDetail,
  Payment,
  RestaurantTable,
  TableReservation,
  ServiceCategory,
  Service,
  ServiceOrder,
  LateFeePolicy,
  RoomInspectionReport,
  DamageItem,
  RoomStatusHistory,
  // Operations & Smart Lock models (tuyen/7)
  AuditLog,
  FraudAlert,
  MarketingCampaign,
  GuestNotificationTemplate,
  DispatchLog,
  InventoryItem,
  InventoryBatch,
  LinenItem,
  LaundryBatch,
  MaintenanceTicket,
  LostAndFoundItem,
  SmartLockKey,
  // Minibar models (Spec 12)
  MinibarProduct,
  MinibarInspection,
  MinibarInspectionLine,
  MinibarInspectionEvent,
  Voucher,
  MinibarUsage,
};
