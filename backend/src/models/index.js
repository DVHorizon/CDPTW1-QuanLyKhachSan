const sequelize = require('../config/sequelize');

// Import model definitions
const defineBranch = require('./Branch');
const defineRoomType = require('./RoomType');
const defineRoom = require('./Room');
const defineAmenity = require('./Amenity');
const defineRole = require('./Role');
const defineMembershipTier = require('./MembershipTier');
const defineUser = require('./User');
const defineBooking = require('./Booking');
const defineReview = require('./Review');
const defineMenuCategory = require('./MenuCategory');
const defineMenuItem = require('./MenuItem');
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

// Initialize models
const Branch = defineBranch(sequelize);
const RoomType = defineRoomType(sequelize);
const Room = defineRoom(sequelize);
const Amenity = defineAmenity(sequelize);
const Role = defineRole(sequelize);
const MembershipTier = defineMembershipTier(sequelize);
const User = defineUser(sequelize);
const Booking = defineBooking(sequelize);
const Review = defineReview(sequelize);
const MenuCategory = defineMenuCategory(sequelize);
const MenuItem = defineMenuItem(sequelize);
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

// Inventory Relationships
InventoryItem.hasMany(InventoryBatch, { foreignKey: 'ItemId', as: 'batches' });
InventoryBatch.belongsTo(InventoryItem, { foreignKey: 'ItemId', as: 'item' });

// Setup Relationships / Associations
// 1. Role & User
Role.hasMany(User, { foreignKey: 'RoleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'RoleId', as: 'role' });

// 2. MembershipTier & User
MembershipTier.hasMany(User, { foreignKey: 'TierId', as: 'users' });
User.belongsTo(MembershipTier, { foreignKey: 'tier', as: 'membershipTier' });

// 3. Branch & Room
Branch.hasMany(Room, { foreignKey: 'BranchId', as: 'rooms' });
Room.belongsTo(Branch, { foreignKey: 'BranchId', as: 'branch' });

// 4. RoomType & Room
RoomType.hasMany(Room, { foreignKey: 'RoomTypeId', as: 'rooms' });
Room.belongsTo(RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 5. User & Booking
User.hasMany(Booking, { foreignKey: 'UserId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 6. RoomType & Booking
RoomType.hasMany(Booking, { foreignKey: 'RoomTypeId', as: 'bookings' });
Booking.belongsTo(RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 7. User & Review
User.hasMany(Review, { foreignKey: 'UserId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

// 8. MenuCategory & MenuItem
MenuCategory.hasMany(MenuItem, { foreignKey: 'CategoryId' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'CategoryId' });

module.exports = {
  sequelize,
  Branch,
  RoomType,
  Room,
  Amenity,
  Role,
  MembershipTier,
  User,
  Booking,
  Review,
  MenuCategory,
  MenuItem,
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
  SmartLockKey
};
