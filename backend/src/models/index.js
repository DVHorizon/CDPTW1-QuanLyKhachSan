const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Menu Models (HEAD)
db.MenuCategory = require('./MenuCategory')(sequelize);
db.MenuItem = require('./MenuItem')(sequelize);

// Menu Associations
db.MenuCategory.hasMany(db.MenuItem, { foreignKey: 'CategoryId' });
db.MenuItem.belongsTo(db.MenuCategory, { foreignKey: 'CategoryId' });

// Other Models (Master)
const defineBranch = require('./Branch');
const defineRoomType = require('./RoomType');
const defineRoom = require('./Room');
const defineAmenity = require('./Amenity');
const defineUser = require('./User');
const defineBooking = require('./Booking');
const defineReview = require('./Review');

// Initialize models
db.Branch = defineBranch(sequelize);
db.RoomType = defineRoomType(sequelize);
db.Room = defineRoom(sequelize);
db.Amenity = defineAmenity(sequelize);
db.User = defineUser(sequelize);
db.Booking = defineBooking(sequelize);
db.Review = defineReview(sequelize);

// Setup Relationships / Associations
// 1. Branch & Room
db.Branch.hasMany(db.Room, { foreignKey: 'BranchId', as: 'rooms' });
db.Room.belongsTo(db.Branch, { foreignKey: 'BranchId', as: 'branch' });

// 2. RoomType & Room
db.RoomType.hasMany(db.Room, { foreignKey: 'RoomTypeId', as: 'rooms' });
db.Room.belongsTo(db.RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 3. User & Booking
db.User.hasMany(db.Booking, { foreignKey: 'UserId', as: 'bookings' });
db.Booking.belongsTo(db.User, { foreignKey: 'UserId', as: 'user' });

// 4. RoomType & Booking
db.RoomType.hasMany(db.Booking, { foreignKey: 'RoomTypeId', as: 'bookings' });
db.Booking.belongsTo(db.RoomType, { foreignKey: 'RoomTypeId', as: 'roomType' });

// 5. User & Review
db.User.hasMany(db.Review, { foreignKey: 'UserId', as: 'reviews' });
db.Review.belongsTo(db.User, { foreignKey: 'UserId', as: 'user' });

module.exports = db;
