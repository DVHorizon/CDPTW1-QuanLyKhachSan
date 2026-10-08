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

const defineStay = require('./Stay');
const defineFoodOrder = require('./FoodOrder');
const defineFoodOrderDetail = require('./FoodOrderDetail');

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
const Stay = defineStay(sequelize);
const FoodOrder = defineFoodOrder(sequelize);
const FoodOrderDetail = defineFoodOrderDetail(sequelize);

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

// 9. Booking & Stay
Booking.hasMany(Stay, { foreignKey: 'BookingId' });
Stay.belongsTo(Booking, { foreignKey: 'BookingId' });

// 10. Room & Stay
Room.hasMany(Stay, { foreignKey: 'RoomId' });
Stay.belongsTo(Room, { foreignKey: 'RoomId' });

// 11. Stay & FoodOrder
Stay.hasMany(FoodOrder, { foreignKey: 'StayId' });
FoodOrder.belongsTo(Stay, { foreignKey: 'StayId' });

// 12. Room & FoodOrder
Room.hasMany(FoodOrder, { foreignKey: 'RoomId' });
FoodOrder.belongsTo(Room, { foreignKey: 'RoomId' });

// 13. FoodOrder & FoodOrderDetail
FoodOrder.hasMany(FoodOrderDetail, { foreignKey: 'FoodOrderId', as: 'details' });
FoodOrderDetail.belongsTo(FoodOrder, { foreignKey: 'FoodOrderId' });

// 14. MenuItem & FoodOrderDetail
MenuItem.hasMany(FoodOrderDetail, { foreignKey: 'MenuItemId' });
FoodOrderDetail.belongsTo(MenuItem, { foreignKey: 'MenuItemId' });

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
  Stay,
  FoodOrder,
  FoodOrderDetail
};
