# 🤖 SPEC CHO ANTIGRAVITY — Implement Seeder 100k records cho Grand Horizon Hotel

> Paste toàn bộ nội dung file này vào Antigravity IDE (Cursor / Continue / Cody / etc.) để AI tự generate code seeder chạy được.

---

## 🎯 MỤC TIÊU

Dự án `CDPTW1-QuanLyKhachSan` cần hoàn thiện hệ thống seeder cho **57 bảng**, mỗi bảng **tối thiểu 100.000 records** (yêu cầu cứng của giảng viên). Hiện tại file `backend/src/seeders/seedAll.js` chỉ seed đúng 1 bảng (MenuItems) — không đủ.

Antigravity hãy generate code MỚI thay thế, theo đúng spec dưới đây.

---

## 📂 CẤU TRÚC THƯ MỤC CẦN TẠO

```
backend/src/seeders/
├── seedRunner.js                    # [MỚI] Entry point CLI
├── lib/
│   ├── chunkWriter.js               # [MỚI] Bulk insert helper
│   ├── idPool.js                    # [MỚI] FK ID pool cache
│   ├── vietnameseFaker.js           # [MỚI] Sinh data tiếng Việt realistic
│   └── progressBar.js               # [MỚI] Progress logger
└── tables/                          # [MỚI] 14 file seeder
    ├── 00_static_reference.js
    ├── 01_users.js
    ├── 02_roomtypes_amenities.js
    ├── 03_rooms.js
    ├── 04_vouchers_ota.js
    ├── 05_bookings.js
    ├── 06_booking_guests.js
    ├── 07_stays_room_moves.js
    ├── 08_housekeeping.js
    ├── 09_menu_restaurant.js
    ├── 10_food_orders.js
    ├── 11_inventory.js
    ├── 12_services_invoices.js
    ├── 13_reviews_chatbot.js
    └── 14_operations_extras.js
```

**LƯU Ý:** Các file hiện tại trong `backend/src/seeders/` (seedAll.js, enrichRooms.js) → **XÓA** hoặc **GIỮ LẠI nhưng không dùng** (đặt vào folder `legacy/`).

---

## ⚙️ CẤU HÌNH CHUNG

**Stack:**
- Node.js 18+, Express, Sequelize ORM (đã có)
- MySQL 8.0 (đã chạy trong docker-compose.yml)
- Không thêm package mới ngoài những gì đã có trong `package.json`

**Default config (CLI flags):**
| Flag | Mặc định | Mô tả |
|---|---|---|
| `--count` | `100000` | Số records mỗi bảng |
| `--tables` | (all) | Chỉ seed các bảng trong danh sách (CSV) |
| `--step` | (all) | Chỉ chạy 1 step (0-14) |
| `--skip-master` | `false` | Bỏ qua static reference data |
| `--resume-from` | none | Tiếp tục từ bảng bị lỗi |
| `--drop-indexes` | `true` | Drop index trước khi seed, recreate sau |

**package.json cần update:**
```json
"scripts": {
  "seed": "node src/seeders/seedRunner.js",
  "seed:fast": "node src/seeders/seedRunner.js --count=1000",
  "seed:dev": "node src/seeders/seedRunner.js --count=10000"
}
```

---

## 📊 DANH SÁCH 57 BẢNG — PHẢI SEED ≥ 100K MỖI BẢNG

Cột **Actual Records** = số records cuối cùng phải đạt được. Bảng nào đặc biệt thì ghi chú.

| # | Bảng | Actual Records | Ghi chú |
|---|---|---|---|
| 1 | Roles | 5 | Fixed (5 role: Admin, Receptionist, Kitchen, Housekeeping, Guest) |
| 2 | Permissions | 50 | Fixed (module permissions) |
| 3 | RolePermissions | 250 | Fixed (mapping) |
| 4 | MembershipTiers | 5 | Fixed (Standard/Silver/Gold/Platinum/Diamond) |
| 5 | Branches | 5 | Fixed (5 chi nhánh nghỉ dưỡng) |
| 6 | Users | **100,000** | Phải ≥ 100k |
| 7 | PasswordResetTokens | 100,000 | |
| 8 | RoomTypes | **100,000** | Generate tên phòng đa dạng |
| 9 | Amenities | **100,000** | |
| 10 | RoomTypeAmenities | 300,000 | Mối quan hệ N-N |
| 11 | Rooms | **100,000** | |
| 12 | PricingRules | **100,000** | |
| 13 | Vouchers | **100,000** | |
| 14 | OTAChannels | 50 | Fixed (Booking, Agoda, Traveloka...) |
| 15 | OTARoomMappings | **100,000** | |
| 16 | Bookings | **100,000** | |
| 17 | BookingGuests | 200,000 | Trung bình 2 khách/booking |
| 18 | Stays | **100,000** | |
| 19 | RoomMoveHistory | **100,000** | |
| 20 | HousekeepingAssignments | **100,000** | |
| 21 | ServiceCategories | 10 | Fixed |
| 22 | Services | **100,000** | |
| 23 | ServiceOrders | **100,000** | |
| 24 | Invoices | **100,000** | |
| 25 | InvoiceDetails | 300,000 | Trung bình 3 dòng/HD |
| 26 | Payments | **100,000** | |
| 27 | MenuCategories | 20 | Fixed |
| 28 | MenuItems | **100,000** | |
| 29 | RestaurantTables | 500 | Bàn theo từng chi nhánh |
| 30 | FoodOrders | **100,000** | |
| 31 | FoodOrderDetails | 400,000 | Trung bình 4 món/order |
| 32 | TableReservations | **100,000** | |
| 33 | InventoryItems | **100,000** | |
| 34 | InventoryTransactions | **100,000** | |
| 35 | MinibarUsages | **100,000** | |
| 36 | Reviews | **100,000** | |
| 37 | ReviewPhotos | 200,000 | Trung bình 2 ảnh/review |
| 38 | ChatbotKnowledgeBase | **100,000** | |
| 39 | ChatbotConversations | **100,000** | |
| 40 | ChatbotMessages | 500,000 | Trung bình 5 tin/conversation |
| 41 | LoyaltyPointTransactions | **100,000** | |
| 42 | MarketingCampaigns | **100,000** | |
| 43 | CampaignRecipients | **100,000** | |
| 44 | MaintenanceTickets | **100,000** | |
| 45 | MaintenanceTicketPhotos | 200,000 | |
| 46 | LostAndFoundItems | **100,000** | |
| 47 | SmartLockLogs | **100,000** | |
| 48 | CashShifts | **100,000** | |
| 49 | NightAuditReports | 365 | Fixed (1 năm) |
| 50 | Vehicles | 50 | Fixed (đội xe) |
| 51 | ShuttleSchedules | **100,000** | |
| 52 | PoliceDeclarations | **100,000** | |
| 53 | BanquetEvents | **100,000** | |
| 54 | StaffSchedules | **100,000** | |
| 55 | AuditLogs | **100,000** | |
| 56 | FraudAlerts | **100,000** | |
| 57 | Wishlists | **100,000** | |
| 58 | NewsletterSubscribers | **100,000** | |

---

## 🔗 THỨ TỰ SEED (THEO PHỤ THUỘC FK)

```
STEP 0 (Master - không FK)        → tables/00_static_reference.js
                                    Roles, Permissions, MembershipTiers,
                                    Branches, Amenities, ServiceCategories,
                                    MenuCategories

STEP 1 (Users 1-level FK)         → tables/01_users.js
                                    Users, PasswordResetTokens

STEP 2 (Room types)               → tables/02_roomtypes_amenities.js
                                    RoomTypes, RoomTypeAmenities, PricingRules

STEP 3 (Rooms 2-level FK)         → tables/03_rooms.js
                                    Rooms

STEP 4 (Vouchers & OTA)           → tables/04_vouchers_ota.js
                                    Vouchers, OTAChannels, OTARoomMappings

STEP 5 (Bookings 3-level FK)      → tables/05_bookings.js
                                    Bookings

STEP 6 (Booking children)         → tables/06_booking_guests.js
                                    BookingGuests

STEP 7 (Stays deeper)             → tables/07_stays_room_moves.js
                                    Stays, RoomMoveHistory

STEP 8 (Operations)               → tables/08_housekeeping.js
                                    HousekeepingAssignments, MinibarUsages

STEP 9 (Menu & F&B)               → tables/09_menu_restaurant.js
                                    MenuItems, RestaurantTables, TableReservations

STEP 10 (Food orders)             → tables/10_food_orders.js
                                    FoodOrders, FoodOrderDetails

STEP 11 (Inventory)               → tables/11_inventory.js
                                    InventoryItems, InventoryTransactions

STEP 12 (Services & Money)        → tables/12_services_invoices.js
                                    Services, ServiceOrders,
                                    Invoices, InvoiceDetails, Payments

STEP 13 (Reviews & Chatbot)       → tables/13_reviews_chatbot.js
                                    Reviews, ReviewPhotos,
                                    ChatbotKnowledgeBase, ChatbotConversations,
                                    ChatbotMessages

STEP 14 (Final operations)        → tables/14_operations_extras.js
                                    LoyaltyPointTransactions, MarketingCampaigns,
                                    CampaignRecipients, MaintenanceTickets,
                                    MaintenanceTicketPhotos, LostAndFoundItems,
                                    SmartLockLogs, CashShifts, NightAuditReports,
                                    Vehicles, ShuttleSchedules, PoliceDeclarations,
                                    BanquetEvents, StaffSchedules,
                                    AuditLogs, FraudAlerts,
                                    Wishlists, NewsletterSubscribers
```

**Tổng output: ~5.7 triệu records**, chạy trong khoảng **30-45 phút**.

---

## 🔧 HELPER LIBRARIES — CODE MẪU

### lib/chunkWriter.js

```javascript
/**
 * Helper bulk insert với chunk + transaction + progress logging
 */
const { sequelize } = require('../models');

/**
 * Insert N records vào model bằng chunk với size chunkSize, có transaction.
 * @param {SequelizeModel} model  - Sequelize Model
 * @param {Function} factory       - (index) => { field: value }   tạo 1 record
 * @param {number} total           - tổng số record cần tạo
 * @param {number} chunkSize       - số record mỗi lần insert (default 5000)
 * @param {Object} options         - { silent: bool, indexesToPreserve: [] }
 * @returns {Promise<{inserted: number}>}
 */
async function seedInChunks(model, factory, total, chunkSize = 5000, options = {}) {
  const inserted = { count: 0 };
  const totalChunks = Math.ceil(total / chunkSize);

  console.log(`   [${model.name}] Seeding ${total.toLocaleString()} records in ${totalChunks} chunks...`);

  await sequelize.transaction(async (t) => {
    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const startIdx = chunkIdx * chunkSize + 1;
      const endIdx = Math.min(startIdx + chunkSize - 1, total);
      const chunkData = [];

      for (let i = startIdx; i <= endIdx; i++) {
        chunkData.push(factory(i));
      }

      await model.bulkCreate(chunkData, {
        transaction: t,
        ignoreDuplicates: true,
        hooks: false,
        validate: false,
        logging: false
      });

      inserted.count += chunkData.length;
      if (!options.silent && (chunkIdx + 1) % Math.max(1, Math.floor(totalChunks / 20)) === 0) {
        const percent = ((inserted.count / total) * 100).toFixed(1);
        process.stdout.write(`\r   [${model.name}] ${inserted.count.toLocaleString()}/${total.toLocaleString()} (${percent}%)   `);
      }
    }
  });

  if (!options.silent) console.log(`\r   [${model.name}] ✅ ${inserted.count.toLocaleString()} records seeded.          `);
  return inserted;
}

/**
 * Drop indexes trước khi seed để tăng tốc.
 */
async function dropIndexes(tableName, indexes) {
  for (const idx of indexes) {
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${idx}\``);
  }
}

/**
 * Recreate indexes sau khi seed.
 */
async function recreateIndexes(tableName, indexes) {
  for (const idx of indexes) {
    await sequelize.query(idx);
  }
}

module.exports = { seedInChunks, dropIndexes, recreateIndexes };
```

### lib/idPool.js

```javascript
/**
 * Cache IDs từ các bảng khác để dùng làm FK.
 * Phải gọi preload() TRƯỚC khi seeder bảng phụ thuộc chạy.
 */
const { sequelize } = require('../models');

const pool = {};

async function preload() {
  console.log('   [IdPool] Preloading FK ID pools...');

  const tables = {
    userIds: 'SELECT UserId FROM Users',
    userIdsByRole: null,  // special - load separately
    tierIds: 'SELECT TierId FROM MembershipTiers',
    branchIds: 'SELECT BranchId FROM Branches',
    roleIds: 'SELECT RoleId FROM Roles',
    roomIds: 'SELECT RoomId FROM Rooms',
    roomTypeIds: 'SELECT RoomTypeId FROM RoomTypes',
    roomsByType: null,    // special: GROUP BY RoomTypeId
    roomsByBranch: null,
    amenityIds: 'SELECT AmenityId FROM Amenities',
    voucherIds: 'SELECT VoucherId FROM Vouchers',
    otaChannelIds: 'SELECT OTAChannelId FROM OTAChannels',
    bookingIds: 'SELECT BookingId FROM Bookings',
    bookingIdsByUser: null,
    stayIds: 'SELECT StayId FROM Stays',
    stayIdsByBooking: null,
    menuItemIds: 'SELECT MenuItemId FROM MenuItems',
    menuCategoryIds: 'SELECT CategoryId FROM MenuCategories',
    restaurantTableIds: 'SELECT TableId FROM RestaurantTables',
    serviceIds: 'SELECT ServiceId FROM Services',
    serviceCategoryIds: 'SELECT CategoryId FROM ServiceCategories',
    invoiceIds: 'SELECT InvoiceId FROM Invoices',
    paymentIds: 'SELECT PaymentId FROM Payments',
    inventoryItemIds: 'SELECT ItemId FROM InventoryItems',
    reviewIds: 'SELECT ReviewId FROM Reviews',
    chatbotKbIds: 'SELECT KnowledgeId FROM ChatbotKnowledgeBase',
    shiftUserIds: null,  // reuse userIds
    staffUserIds: null,
  };

  for (const [key, sql] of Object.entries(tables)) {
    if (sql === null) continue;
    const [rows] = await sequelize.query(sql);
    pool[key] = rows.map(r => Object.values(r)[0]);
    console.log(`   [IdPool] ${key}: ${pool[key].length.toLocaleString()} IDs`);
  }

  // Special groups
  const [roomsByType] = await sequelize.query(
    'SELECT RoomId, RoomTypeId, BranchId FROM Rooms ORDER BY RoomId'
  );
  pool.roomsByType = roomsByType.reduce((acc, r) => {
    if (!acc[r.RoomTypeId]) acc[r.RoomTypeId] = [];
    acc[r.RoomTypeId].push(r.RoomId);
    return acc;
  }, {});

  pool.roomsByBranch = roomsByType.reduce((acc, r) => {
    if (!acc[r.BranchId]) acc[r.BranchId] = [];
    acc[r.BranchId].push(r.RoomId);
    return acc;
  }, {});

  const [bookingsByUser] = await sequelize.query(
    'SELECT BookingId, UserId FROM Bookings ORDER BY BookingId'
  );
  pool.bookingIdsByUser = bookingsByUser.reduce((acc, b) => {
    if (!acc[b.UserId]) acc[b.UserId] = [];
    acc[b.UserId].push(b.BookingId);
    return acc;
  }, {});

  const [staysByBooking] = await sequelize.query(
    'SELECT StayId, BookingId FROM Stays ORDER BY StayId'
  );
  pool.stayIdsByBooking = staysByBooking.reduce((acc, s) => {
    if (!acc[s.BookingId]) acc[s.BookingId] = [];
    acc[s.BookingId].push(s.StayId);
    return acc;
  }, {});

  pool.staffUserIds = pool.userIds;  // alias
  pool.shiftUserIds = pool.userIds;
  console.log('   [IdPool] ✅ All FK pools preloaded\n');
}

function pick(arr) {
  if (!arr || arr.length === 0) {
    throw new Error('IdPool: pool rỗng. Gọi preload() trước.');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min, max) {
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
  pickRoomByType: (roomTypeId) => pick(pool.roomsByType[roomTypeId] || pool.roomIds),
  pickRoomType: () => pick(pool.roomTypeIds),
  pickAmenity: () => pick(pool.amenityIds),
  pickManyAmenities: () => pickMany(pool.amenityIds, 2, 6),
  pickVoucher: () => pool.voucherIds.length ? pick(pool.voucherIds) : null,
  pickOTAChannel: () => pick(pool.otaChannelIds),
  pickBooking: () => pick(pool.bookingIds),
  pickBookingByUser: (userId) => pick(pool.bookingIdsByUser[userId] || pool.bookingIds),
  pickStay: () => pick(pool.stayIds),
  pickStayByBooking: (bookingId) => pick(pool.stayIdsByBooking[bookingId] || pool.stayIds),
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
};

module.exports = { preload, pick, pickMany, ...helpers };
```

### lib/vietnameseFaker.js

```javascript
/**
 * Sinh dữ liệu tiếng Việt realistic cho khách sạn 5 sao Grand Horizon
 */
const faker = {
  random: {
    int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    float: (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec)),
    arrayElement: (arr) => arr[Math.floor(Math.random() * arr.length)],
    weighted: (weights) => {
      // weights: { value: probability }
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (const [value, weight] of Object.entries(weights)) {
        if ((r -= weight) < 0) return value;
      }
      return Object.keys(weights)[0];
    },
    bool: (prob = 0.5) => Math.random() < prob,
  },
};

// ============ VIETNAMESE NAMES ============
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const TEN_DEM_NAM = ['Văn', 'Hữu', 'Đức', 'Quang', 'Minh', 'Thanh', 'Hoàng', 'Anh', 'Bảo', 'Công'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Hưng', 'Khoa', 'Long', 'Mạnh', 'Phong', 'Quân', 'Sơn', 'Tùng', 'Việt'];
const TEN_DEM_NU = ['Thị', 'Ngọc', 'Thuỷ', 'Hồng', 'Kim', 'Phương', 'Trúc', 'Bích'];
const TEN_NU = ['Anh', 'Bình', 'Châu', 'Dung', 'Hà', 'Hương', 'Lan', 'Linh', 'Mai', 'Phương', 'Thảo', 'Trang', 'Uyên'];

function fullName() {
  const isMale = Math.random() < 0.55;
  const ho = faker.random.arrayElement(HO);
  const tendem = isMale ? faker.random.arrayElement(TEN_DEM_NAM) : faker.random.arrayElement(TEN_DEM_NU);
  const ten = isMale ? faker.random.arrayElement(TEN_NAM) : faker.random.arrayElement(TEN_NU);
  return `${ho} ${tendem} ${ten}`;
}

// ============ EMAIL & PHONE ============
function email(seed, roleName = 'user') {
  return `${roleName}_${seed}@hoteldomain.vn`;
}
function phone() {
  const prefix = faker.random.arrayElement(['090', '091', '093', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039']);
  let body = '';
  for (let i = 0; i < 8; i++) body += faker.random.int(0, 9);
  return `${prefix}${body}`;
}
function idNumber() {
  let s = '';
  for (let i = 0; i < 12; i++) s += faker.random.int(0, 9);
  return s;
}

// ============ MONEY (VND) ============
function vndPrice(min, max) {
  // Trả về số VND, làm tròn đến 1.000đ
  const raw = Math.random() * (max - min) + min;
  return Math.round(raw / 1000) * 1000;
}

// ============ DATES ============
function dateInPast(maxDaysAgo = 365) {
  const d = new Date();
  d.setDate(d.getDate() - faker.random.int(0, maxDaysAgo));
  return d;
}
function dateInFuture(maxDaysAhead = 365) {
  const d = new Date();
  d.setDate(d.getDate() + faker.random.int(1, maxDaysAhead));
  return d;
}
function dateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============ BOOKING SPECIFIC ============
function nights() {
  // 1-3 đêm phổ biến nhất
  return faker.random.weighted({
    1: 30, 2: 35, 3: 15, 4: 8, 5: 5, 6: 3, 7: 2,
    8: 0.5, 9: 0.3, 10: 0.2, 14: 0.5, 30: 0.5
  });
}
function adults() {
  return faker.random.weighted({ 1: 15, 2: 60, 3: 15, 4: 8, 5: 1, 6: 0.5, 8: 0.5 });
}
function children() {
  return faker.random.weighted({ 0: 70, 1: 18, 2: 10, 3: 1.5, 4: 0.5 });
}
function bookingStatus() {
  return faker.random.weighted({
    'Pending': 5, 'Confirmed': 25, 'CheckedIn': 45, 'CheckedOut': 15, 'Completed': 5, 'Cancelled': 5
  });
}
function bookingSource() {
  return faker.random.weighted({
    'DirectWeb': 50, 'OTA.Agoda': 15, 'OTA.Booking': 12, 'OTA.Traveloka': 10, 'Phone': 5, 'WalkIn': 5, 'Email': 3
  });
}
function confirmationCode() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[faker.random.int(0, chars.length - 1)];
  return `GH${s}`;
}

// ============ ROOM TYPES / ROOMS ============
const ROOM_TYPE_TEMPLATES = [
  { name: 'Deluxe Ocean View', basePrice: 2500000, capacity: 2 },
  { name: 'Premier Suite', basePrice: 4500000, capacity: 3 },
  { name: 'Royal Villa', basePrice: 12000000, capacity: 4 },
  { name: 'Garden Bungalow', basePrice: 3200000, capacity: 2 },
  { name: 'Family Suite', basePrice: 5500000, capacity: 5 },
  { name: 'Presidential Penthouse', basePrice: 25000000, capacity: 6 },
  { name: 'Spa Suite', basePrice: 3800000, capacity: 2 },
  { name: 'Beachfront Villa', basePrice: 15000000, capacity: 4 },
  { name: 'Sky Room', basePrice: 1800000, capacity: 2 },
  { name: 'Honeymoon Suite', basePrice: 4800000, capacity: 2 },
];

function roomTypeName(idx) {
  const t = ROOM_TYPE_TEMPLATES[idx % ROOM_TYPE_TEMPLATES.length];
  return `${t.name} #${idx}`;
}

function roomTypeBasePrice(idx) {
  const t = ROOM_TYPE_TEMPLATES[idx % ROOM_TYPE_TEMPLATES.length];
  const multiplier = 0.85 + (Math.random() * 0.3); // ±15%
  return Math.round((t.basePrice * multiplier) / 1000) * 1000;
}

function roomNumber(branchId, floor, numOnFloor) {
  return `${branchId}${String(floor).padStart(2, '0')}${String(numOnFloor).padStart(2, '0')}`;
}

// ============ FOOD / MENU ============
const DISH_TEMPLATES = [
  'Phở bò Wagyu', 'Bún chả Hà Nội', 'Cơm tấm sườn bê', 'Bánh xèo', 'Gỏi cuốn tôm thịt',
  'Cá Tuyết hấp xì dầu', 'Bò Wagyu A5 nướng than', 'Tôm hùm Alaska nướng bơ tỏi',
  'Cua Hoàng đế hấp bia', 'Sò điệp áp chảo', 'Bào ngư sốt nấm truffle',
  'Salad cá hồi Na Uy', 'Súp bào ngư vi cá', 'Chè hạt sen long nhãn',
  'Bánh flan caramel', 'Tiramisu Ý', 'Trà sen vàng', 'Cà phê sữa đá',
  'Rượu vang Chile 2018', 'Bia Tiger thùng', 'Nước ép cam tươi',
];

function dishName(idx) {
  const t = DISH_TEMPLATES[idx % DISH_TEMPLATES.length];
  return `${t} - Biến thể #${idx}`;
}

function dishPrice(min = 80000, max = 5000000) {
  return Math.round((Math.random() * (max - min) + min) / 1000) * 1000;
}

// ============ SERVICES (Spa, etc.) ============
const SERVICE_TEMPLATES = [
  { name: 'Massage toàn thân 60 phút', price: 850000 },
  { name: 'Massage chân 30 phút', price: 350000 },
  { name: 'Spa đá nóng 90 phút', price: 1500000 },
  { name: 'Giặt ủi áo sơ mi', price: 80000 },
  { name: 'Giặt ủi vest', price: 150000 },
  { name: 'Đưa đón sân bay VIP', price: 1200000 },
  { name: 'Thuê xe máy 1 ngày', price: 200000 },
  { name: 'Yoga buổi sáng', price: 300000 },
  { name: 'Tour tham quan đảo', price: 2500000 },
  { name: 'Dịch vụ phòng 24/7', price: 0 },
];

function serviceName(idx) {
  const t = SERVICE_TEMPLATES[idx % SERVICE_TEMPLATES.length];
  return `${t.name} (gói ${idx})`;
}
function servicePrice(idx) {
  const t = SERVICE_TEMPLATES[idx % SERVICE_TEMPLATES.length];
  return t.price + faker.random.int(-50000, 50000);
}

// ============ REVIEWS ============
const REVIEW_TITLES = [
  'Trải nghiệm tuyệt vời', 'Khách sạn xứng đáng 5 sao', 'Dịch vụ chuyên nghiệp',
  'Phòng đẹp, view tuyệt', 'Nhân viên thân thiện', 'Buffet sáng đa dạng',
  'Spa rất thoải mái', 'Sẽ quay lại lần sau', 'View biển cực đẹp',
  'Hồ bơi tuyệt vời', 'Đáng tiền', 'Hoàn hảo cho kỳ nghỉ gia đình',
  'Phòng sạch sẽ', 'Đồ ăn ngon', 'Dịch vụ concierge xuất sắc',
  'Check-in nhanh', 'Nhà hàng phong phú', 'Yên tĩnh, thư giãn',
];

function reviewTitle() {
  return faker.random.arrayElement(REVIEW_TITLES) + ' #' + faker.random.int(1, 10000);
}

const REVIEW_BODY = [
  'Tôi vừa có một kỳ nghỉ tuyệt vời tại Grand Horizon. Phòng rộng rãi, sạch sẽ, view biển tuyệt đẹp. Nhân viên phục vụ nhiệt tình, chu đáo. Buffet sáng rất phong phú với nhiều món Á - Âu. Đặc biệt là hồ bơi vô cực nhìn ra biển rất ấn tượng. Sẽ quay lại vào mùa hè sau.',
  'Khách sạn đạt chuẩn 5 sao quốc tế. Check-in nhanh, phòng đẹp, giường rất êm. Spa services thật sự thư giãn. Giá hơi cao nhưng xứng đáng với chất lượng.',
  'Tôi đã ở đây 4 đêm cùng gia đình. Phòng Family Suite rất rộng, có view nhìn ra hồ bơi và biển. Con tôi rất thích buffet trẻ em. Dịch vụ phòng 24/7 phục vụ nhanh và chu đáo.',
  'Đây là lần thứ 3 tôi quay lại Grand Horizon. Mỗi lần đều có trải nghiệm mới mẻ. Đội ngũ staff nhớ tên tôi - rất cảm động! Sẽ giới thiệu bạn bè.',
  'Phòng Deluxe view biển rất đẹp, ánh sáng tự nhiên. Wifi tốc độ cao. Nhà hàng Sen phục vụ món Việt Nam chuẩn vị. Nhân viên lễ tân nói tiếng Anh lưu loát.',
];

function reviewBody() {
  return faker.random.arrayElement(REVIEW_BODY);
}

// ============ EXPORTS ============
module.exports = {
  ...faker.random,
  fullName,
  email,
  phone,
  idNumber,
  vndPrice,
  dateInPast,
  dateInFuture,
  dateBetween,
  nights,
  adults,
  children,
  bookingStatus,
  bookingSource,
  confirmationCode,
  roomTypeName,
  roomTypeBasePrice,
  roomNumber,
  dishName,
  dishPrice,
  serviceName,
  servicePrice,
  reviewTitle,
  reviewBody,
};
```

### lib/progressBar.js

```javascript
/**
 * Hiển thị progress bar đơn giản cho console
 */
function start(message) {
  process.stdout.write(`\n${message}\n`);
  return { lastPercent: -1 };
}

function update(state, current, total, label = '') {
  const percent = Math.floor((current / total) * 100);
  if (percent === state.lastPercent) return;
  state.lastPercent = percent;

  const barLen = 30;
  const filled = Math.floor((barLen * current) / total);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  process.stdout.write(
    `\r   ${bar} ${percent}% (${current.toLocaleString()}/${total.toLocaleString()}) ${label}`
  );
}

function finish(message) {
  console.log(`\n✅ ${message}\n`);
}

module.exports = { start, update, finish };
```

---

## 🚀 MAIN RUNNER — seedRunner.js

```javascript
#!/usr/bin/env node
'use strict';

/**
 * Hotel Management System Seeder
 * Chạy 14 step theo thứ tự FK
 * Mỗi bảng ≥ 100k records
 */

const { sequelize } = require('../models');
const { seedInChunks, dropIndexes, recreateIndexes } = require('./lib/chunkWriter');
const IdPool = require('./lib/idPool');

// Import 14 seeder steps
const step00 = require('./tables/00_static_reference');
const step01 = require('./tables/01_users');
const step02 = require('./tables/02_roomtypes_amenities');
const step03 = require('./tables/03_rooms');
const step04 = require('./tables/04_vouchers_ota');
const step05 = require('./tables/05_bookings');
const step06 = require('./tables/06_booking_guests');
const step07 = require('./tables/07_stays_room_moves');
const step08 = require('./tables/08_housekeeping');
const step09 = require('./tables/09_menu_restaurant');
const step10 = require('./tables/10_food_orders');
const step11 = require('./tables/11_inventory');
const step12 = require('./tables/12_services_invoices');
const step13 = require('./tables/13_reviews_chatbot');
const step14 = require('./tables/14_operations_extras');

const steps = [
  { name: 'Static Reference Data', run: step00, needsPool: false },
  { name: 'Users', run: step01, needsPool: false },
  { name: 'Room Types & Amenities', run: step02, needsPool: false },
  { name: 'Rooms', run: step03, needsPool: ['roomTypeIds', 'branchIds'] },
  { name: 'Vouchers & OTA', run: step04, needsPool: ['roomTypeIds'] },
  { name: 'Bookings', run: step05, needsPool: ['userIds', 'roomTypeIds'] },
  { name: 'Booking Guests', run: step06, needsPool: ['bookingIds'] },
  { name: 'Stays & Room Moves', run: step07, needsPool: ['bookingIds', 'roomIds'] },
  { name: 'Housekeeping & Minibar', run: step08, needsPool: ['roomIds', 'userIds', 'stayIds'] },
  { name: 'Menu & Restaurant', run: step09, needsPool: ['menuCategoryIds'] },
  { name: 'Food Orders', run: step10, needsPool: ['stayIds', 'menuItemIds', 'restaurantTableIds', 'userIds'] },
  { name: 'Inventory', run: step11, needsPool: ['roomIds', 'userIds', 'inventoryItemIds'] },
  { name: 'Services & Invoices', run: step12, needsPool: ['stayIds', 'serviceIds', 'userIds', 'serviceCategoryIds'] },
  { name: 'Reviews & Chatbot', run: step13, needsPool: ['userIds', 'stayIds', 'foodOrderIds'] },
  { name: 'Operations Extras', run: step14, needsPool: ['userIds', 'roomIds'] },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    count: 100000,
    tables: null,
    step: null,
    skipMaster: false,
    resumeFrom: null,
  };
  for (const arg of args) {
    if (arg.startsWith('--count=')) opts.count = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--tables=')) opts.tables = arg.split('=')[1].split(',');
    if (arg.startsWith('--step=')) opts.step = parseInt(arg.split('=')[1], 10);
    if (arg === '--skip-master') opts.skipMaster = true;
    if (arg.startsWith('--resume-from=')) opts.resumeFrom = arg.split('=')[1];
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node seedRunner.js [options]
  --count=N          Số records mỗi bảng (mặc định 100000)
  --tables=a,b,c     Chỉ seed các bảng chỉ định
  --step=N           Chỉ chạy step thứ N
  --skip-master      Bỏ qua master data
  --resume-from=NAME Tiếp tục từ bảng bị lỗi
  --help, -h         Hiển thị trợ giúp`);
      process.exit(0);
    }
  }
  return opts;
}

async function run() {
  const opts = parseArgs();
  const t0 = Date.now();

  console.log('\n=================================================================');
  console.log('🏨  GRAND HORIZON HOTEL - DATABASE SEEDER (100K RECORDS/TABLE)');
  console.log('=================================================================');
  console.log(`Target:    ${opts.count.toLocaleString()} records per table`);
  console.log(`Mode:      BULK INSERT chunks of 5000, FK_CHECKS off`);
  console.log(`Started:   ${new Date().toISOString()}`);
  console.log('=================================================================\n');

  // Tắt FK_CHECKS và UNIQUE_CHECKS
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
  await sequelize.query('SET UNIQUE_CHECKS = 0;');
  await sequelize.query('SET SESSION bulk_insert_buffer_size = 1024 * 1024;');

  // Step 0: Master data (luôn chạy, records cố định)
  if (!opts.skipMaster && (opts.step === null || opts.step === 0)) {
    console.log('[STEP 0/14] 📦 Static Reference Data...');
    await step00.run(sequelize, { count: 100 });
    console.log('   ✅ Master data seeded (Roles, Tiers, Branches, Amenities...)\n');
  }

  // Preload ID pools trước khi seeder phụ thuộc
  console.log('[IdPool] 🔄 Preloading FK pools...');
  await IdPool.preload();
  console.log('');

  // Chạy các step còn lại (Step 1-14)
  for (let i = 1; i < steps.length; i++) {
    if (opts.step !== null && opts.step !== i) continue;
    if (opts.resumeFrom && steps[i].name !== opts.resumeFrom) {
      console.log(`[STEP ${i}/14] ⏭  Skipping (resume-from requested)`);
      continue;
    }
    const step = steps[i];
    const startTime = Date.now();
    console.log(`[STEP ${i}/14] 🔄 ${step.name}...`);

    try {
      await step.run(sequelize, IdPool, { count: opts.count, tables: opts.tables });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Done in ${elapsed}s\n`);
    } catch (err) {
      console.error(`   ❌ Step ${i} failed:`, err.message);
      throw err;
    }
  }

  // Bật lại FK_CHECKS
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  await sequelize.query('SET UNIQUE_CHECKS = 1;');
  await sequelize.query('ANALYZE TABLE Users, Bookings, Stays;');

  const totalElapsed = ((Date.now() - t0) / 60000).toFixed(1);
  console.log('=================================================================');
  console.log(`🎉 ALL DONE in ${totalElapsed} minutes`);
  console.log('=================================================================\n');

  // Verify
  console.log('📊 Verification:');
  const [users] = await sequelize.query('SELECT COUNT(*) AS cnt FROM Users');
  const [bookings] = await sequelize.query('SELECT COUNT(*) AS cnt FROM Bookings');
  console.log(`   Users:    ${users[0].cnt.toLocaleString()}`);
  console.log(`   Bookings: ${bookings[0].cnt.toLocaleString()}`);

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
```

---

## 📝 MẪU 1 FILE SEEDER — tables/00_static_reference.js

Đây là file đơn giản nhất (master data không cần FK pool). Các file khác theo cùng pattern.

```javascript
'use strict';

const { Roles, Permissions, RolePermissions, MembershipTiers, Branches, Amenities, ServiceCategories, MenuCategories } = require('../../models');
const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

const BRANCH_NAMES = [
  { name: 'Grand Horizon Phú Quốc', address: 'Bãi Khem, Phú Quốc, Kiên Giang', phone: '0297 888 9999' },
  { name: 'Grand Horizon Cam Ranh', address: 'Bãi Dài, Cam Ranh, Khánh Hoà', phone: '0258 888 9999' },
  { name: 'Grand Horizon Côn Đảo', address: 'Bãi Nhát, Côn Đảo, Bà Rịa-Vũng Tàu', phone: '0254 888 9999' },
  { name: 'Grand Horizon Đà Nẵng', address: 'Bãi Biển Mỹ Khê, Đà Nẵng', phone: '0236 888 9999' },
  { name: 'Grand Horizon Nha Trang', address: 'Bãi Trần Phú, Nha Trang, Khánh Hoà', phone: '0258 222 3333' },
];

const PERMISSION_NAMES = [
  'view_users', 'edit_users', 'delete_users',
  'view_bookings', 'create_booking', 'cancel_booking',
  'view_rooms', 'edit_rooms',
  'view_invoices', 'create_invoice', 'process_payment',
  'manage_menu', 'manage_services',
  'view_dashboard', 'export_reports',
  // ... 50 total permissions across modules
];

const ROLE_PERMISSIONS_MAP = {
  Admin: '*', // all
  Receptionist: ['view_users', 'view_bookings', 'create_booking', 'cancel_booking', 'view_rooms', 'edit_rooms'],
  Kitchen: ['manage_menu', 'view_orders'],
  Housekeeping: ['view_rooms'],
  Guest: ['view_rooms', 'create_booking'],
};

async function run(sequelize, options = {}) {
  const counts = options.count || 100;

  // ============= Roles (5 cố định) =============
  console.log('   • Seeding Roles (5)...');
  const rolesData = [
    { RoleName: 'Admin', Description: 'Quản trị viên toàn quyền' },
    { RoleName: 'Receptionist', Description: 'Lễ tân' },
    { RoleName: 'Kitchen', Description: 'Nhân viên bếp' },
    { RoleName: 'Housekeeping', Description: 'Nhân viên buồng phòng' },
    { RoleName: 'Guest', Description: 'Khách hàng' },
  ];
  await Roles.bulkCreate(rolesData, { ignoreDuplicates: true, logging: false });

  // ============= Permissions (50) =============
  console.log(`   • Seeding Permissions (${PERMISSION_NAMES.length})...`);
  const permissionsData = PERMISSION_NAMES.map(p => ({
    PermissionName: p,
    Module: p.split('_')[0],
    Description: `Permission to ${p.replace(/_/g, ' ')}`,
  }));
  await Permissions.bulkCreate(permissionsData, { ignoreDuplicates: true, logging: false });

  // ============= RolePermissions =============
  console.log('   • Seeding RolePermissions...');
  const [allRoles] = await sequelize.query('SELECT RoleId, RoleName FROM Roles');
  const [allPerms] = await sequelize.query('SELECT PermissionId, PermissionName FROM Permissions');
  const rpData = [];
  for (const role of allRoles) {
    const allowed = ROLE_PERMISSIONS_MAP[role.RoleName];
    if (allowed === '*') {
      allPerms.forEach(p => rpData.push({ RoleId: role.RoleId, PermissionId: p.PermissionId }));
    } else {
      allowed.forEach(permName => {
        const p = allPerms.find(ap => ap.PermissionName === permName);
        if (p) rpData.push({ RoleId: role.RoleId, PermissionId: p.PermissionId });
      });
    }
  }
  await RolePermissions.bulkCreate(rpData, { ignoreDuplicates: true, logging: false });

  // ============= MembershipTiers (5 cố định) =============
  console.log('   • Seeding MembershipTiers (5)...');
  const tiersData = [
    { TierName: 'Standard', MinPoints: 0, DiscountRate: 0.00, PointMultiplier: 1.00, Benefits: 'Tích điểm cơ bản' },
    { TierName: 'Silver', MinPoints: 10000, DiscountRate: 0.05, PointMultiplier: 1.25, Benefits: 'Giảm 5%, tích 1.25x' },
    { TierName: 'Gold', MinPoints: 30000, DiscountRate: 0.10, PointMultiplier: 1.50, Benefits: 'Giảm 10%, tích 1.5x' },
    { TierName: 'Platinum', MinPoints: 80000, DiscountRate: 0.15, PointMultiplier: 2.00, Benefits: 'Giảm 15%, tích 2x' },
    { TierName: 'Diamond', MinPoints: 200000, DiscountRate: 0.20, PointMultiplier: 3.00, Benefits: 'Giảm 20%, tích 3x, ưu tiên check-in' },
  ];
  await MembershipTiers.bulkCreate(tiersData, { ignoreDuplicates: true, logging: false });

  // ============= Branches (5 cố định) =============
  console.log(`   • Seeding Branches (${BRANCH_NAMES.length})...`);
  await Branches.bulkCreate(BRANCH_NAMES.map(b => ({
    BranchName: b.name,
    Address: b.address,
    Phone: b.phone,
    Status: 'Active',
  })), { ignoreDuplicates: true, logging: false });

  // ============= Amenities =============
  console.log(`   • Seeding Amenities (${counts})...`);
  await seedInChunks(Amenities, (i) => ({
    AmenityName: `Tiện nghi ${i}`,
    Description: `Mô tả chi tiết tiện nghi loại ${i} - 5 sao Grand Horizon`,
    IconUrl: `https://icons.hoteldomain.vn/amenity/${i}.svg`,
  }), counts, 5000, { silent: false });

  // ============= ServiceCategories =============
  console.log('   • Seeding ServiceCategories (10)...');
  await ServiceCategories.bulkCreate([
    { CategoryName: 'Spa & Wellness', Description: 'Dịch vụ spa, massage, chăm sóc sức khỏe' },
    { CategoryName: 'F&B Service', Description: 'Ăn uống tại phòng, nhà hàng' },
    { CategoryName: 'Laundry', Description: 'Giặt ủi, là hấp' },
    { CategoryName: 'Transportation', Description: 'Đưa đón sân bay, thuê xe' },
    { CategoryName: 'Tour & Activities', Description: 'Tour tham quan, hoạt động' },
    { CategoryName: 'Business Center', Description: 'In ấn, hội họp, dịch vụ văn phòng' },
    { CategoryName: 'Events & Wedding', Description: 'Tổ chức sự kiện, tiệc cưới' },
    { CategoryName: 'Kids Service', Description: 'Dịch vụ trẻ em' },
    { CategoryName: 'Pet Care', Description: 'Chăm sóc thú cưng' },
    { CategoryName: 'Other', Description: 'Dịch vụ khác' },
  ], { ignoreDuplicates: true, logging: false });

  // ============= MenuCategories =============
  console.log('   • Seeding MenuCategories (20)...');
  const menuCategories = [
    'Khai vị nóng', 'Khai vị lạnh', 'Salad', 'Soup',
    'Món chính - Bò', 'Món chính - Heo', 'Món chính - Gia cầm',
    'Món chính - Hải sản', 'Món chính - Chay', 'Món chính - Trẻ em',
    'Lẩu', 'Sushi & Sashimi', 'Mì & Cơm', 'Bánh mì',
    'Tráng miệng', 'Kem & Sorbet', 'Trái cây tươi', 'Bánh ngọt',
    'Cà phê & Trà', 'Rượu vang & Cocktail'
  ];
  await MenuCategories.bulkCreate(menuCategories.map((name, idx) => ({
    CategoryId: idx + 1,
    CategoryName: name,
    Description: `Các món ${name.toLowerCase()} tại Grand Horizon`,
  })), { ignoreDuplicates: true, logging: false });

  console.log('   ✅ Static reference data completed');
}

module.exports = { run };
```

---

## 📝 MẪU FILE SEEDER LỚN — tables/01_users.js

Đây là pattern quan trọng cho các bảng cần 100k records:

```javascript
'use strict';

const { Users, MembershipTiers } = require('../../models');
const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;

  // ============= Users =============
  console.log(`   • Seeding Users (${count.toLocaleString()})...`);
  // Lấy role IDs trước
  const [roles] = await sequelize.query('SELECT RoleId, RoleName FROM Roles');
  const [tiers] = await sequelize.query('SELECT TierId FROM MembershipTiers');

  // Pre-hash mật khẩu "123456" bcrypt (chỉ hash 1 lần dùng cho 100k users)
  const bcrypt = require('bcryptjs');
  const commonHashedPassword = await bcrypt.hash('123456', 10);

  await seedInChunks(Users, (i) => {
    // 70% Guest, 15% Receptionist, 5% Kitchen, 5% Housekeeping, 5% Admin
    const role = faker.random.weighted({
      Guest: 70, Receptionist: 15, Kitchen: 5, Housekeeping: 5, Admin: 5
    });
    const roleObj = roles.find(r => r.RoleName === role);
    // 80% có tier, 20% null
    const hasTier = Math.random() < 0.8;
    const tier = hasTier ? faker.random.arrayElement(tiers) : null;

    const fullName = faker.fullName();
    const gender = Math.random() < 0.5 ? 'Male' : 'Female';

    return {
      RoleId: roleObj.RoleId,
      TierId: tier?.TierId || null,
      FullName: fullName,
      Email: faker.email(i, role.toLowerCase()),
      Phone: faker.phone(),
      PasswordHash: commonHashedPassword,
      IdNumber: faker.idNumber(),
      IdType: 'CCCD',
      DateOfBirth: faker.dateInPast(15000),
      Gender: gender,
      Status: faker.random.weighted({ Active: 95, Inactive: 3, Banned: 2 }),
    };
  }, count, 5000);

  console.log(`   ✅ Users done.`);
}

module.exports = { run };
```

---

## 📝 MẪU FILE SEEDER VỚI FK POOL — tables/05_bookings.js

Đây là pattern quan trọng cho bảng có nhiều FK:

```javascript
'use strict';

const { Bookings } = require('../../models');
const { seedInChunks } = require('../lib/chunkWriter');
const faker = require('../lib/vietnameseFaker');

async function run(sequelize, IdPool, options = {}) {
  const count = options.count || 100000;
  console.log(`   • Seeding Bookings (${count.toLocaleString()})...`);

  // Lấy room types trước để biết BasePrice
  const [roomTypes] = await sequelize.query(
    'SELECT RoomTypeId, BasePrice, AdultCapacity, ChildCapacity FROM RoomTypes ORDER BY RoomTypeId'
  );

  await seedInChunks(Bookings, (i) => {
    const checkIn = faker.dateInPast(365);
    const nights = faker.nights();
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);

    const adults = faker.adults();
    const children = faker.children();
    const roomQuantity = faker.random.weighted({ 1: 80, 2: 15, 3: 4, 4: 1 });

    const rt = faker.random.arrayElement(roomTypes);
    const subtotal = rt.BasePrice * nights * roomQuantity;

    // Surcharge for extra adults
    const surcharge = adults > rt.AdultCapacity
      ? (adults - rt.AdultCapacity) * 200000 * nights * roomQuantity
      : 0;

    // Voucher discount (30% có)
    const hasVoucher = Math.random() < 0.3;
    const voucherId = hasVoucher ? IdPool.pickVoucher() : null;
    const discount = voucherId ? Math.floor(subtotal * 0.1) : 0;

    const total = subtotal + surcharge - discount;
    const deposit = Math.floor(total * 0.3);

    return {
      UserId: IdPool.pickUser(),
      RoomTypeId: rt.RoomTypeId,
      VoucherId: voucherId,
      OTAChannelId: Math.random() < 0.3 ? IdPool.pickOTAChannel() : null,
      CheckInDate: checkIn.toISOString().split('T')[0],
      CheckOutDate: checkOut.toISOString().split('T')[0],
      NumberOfNights: nights,
      Adults: adults,
      Children: children,
      RoomQuantity: roomQuantity,
      RoomSubtotal: subtotal,
      SurchargeAmount: surcharge,
      DiscountAmount: discount,
      TotalAmount: total,
      DepositAmount: deposit,
      Status: faker.bookingStatus(),
      BookingSource: faker.bookingSource(),
      ConfirmationCode: faker.confirmationCode(),
      BookingQrCode: `https://api.qrserver.com/v1/create-qr-code/?data=GH-${faker.confirmationCode()}`,
    };
  }, count, 5000);

  console.log(`   ✅ Bookings done.`);
}

module.exports = { run };
```

---

## 📝 13 FILE SEEDER CÒN LẠI (Skeleton cho Antigravity generate)

**Mỗi file seeder sau phải follow pattern trên. Antigravity generate code dựa trên:**

- **tables/02_roomtypes_amenities.js**: RoomTypes (dùng `roomTypeName(i)`, `roomTypeBasePrice(i)`) 100k, RoomTypeAmenities 300k (dùng `pickManyAmenities()`)
- **tables/03_rooms.js**: Rooms 100k, dùng `roomNumber(branch, floor, numOnFloor)`, FK `RoomTypeId` từ pool, `BranchId`
- **tables/04_vouchers_ota.js**: Vouchers 100k (random discount 5%-30%), OTAChannels 50 (Booking, Agoda...), OTARoomMappings 100k
- **tables/06_booking_guests.js**: 200k records, mỗi booking trung bình 2 khách. FK `BookingId` từ pool
- **tables/07_stays_room_moves.js**: Stays 100k (FK BookingId, RoomId), RoomMoveHistory 100k
- **tables/08_housekeeping.js**: HousekeepingAssignments 100k, MinibarUsages 100k
- **tables/09_menu_restaurant.js**: MenuItems 100k (dùng `dishName(i)`, `dishPrice()`), RestaurantTables 500 (mỗi chi nhánh 100 bàn), TableReservations 100k
- **tables/10_food_orders.js**: FoodOrders 100k, FoodOrderDetails 400k (4 chi tiết/order)
- **tables/11_inventory.js**: InventoryItems 100k (tên đồ dùng phòng), InventoryTransactions 100k
- **tables/12_services_invoices.js**: Services 100k (dùng `serviceName(i)`), ServiceOrders 100k, Invoices 100k, InvoiceDetails 300k, Payments 100k
- **tables/13_reviews_chatbot.js**: Reviews 100k (dùng `reviewTitle()`, `reviewBody()`), ReviewPhotos 200k, ChatbotKnowledgeBase 100k, ChatbotConversations 100k, ChatbotMessages 500k
- **tables/14_operations_extras.js**: 14 bảng còn lại (LoyaltyPointTransactions, MarketingCampaigns, MaintenanceTickets, LostAndFoundItems, SmartLockLogs, CashShifts, NightAuditReports, Vehicles, ShuttleSchedules, PoliceDeclarations, BanquetEvents, StaffSchedules, AuditLogs, FraudAlerts, Wishlists, NewsletterSubscribers) mỗi bảng 100k records

---

## 📦 ĐÓNG GÓI CUỐI CÙNG

Sau khi tất cả 17 file code đã được viết (4 lib + seedRunner + 14 seeder):

**Verify:**
```bash
# 1. Drop & re-create database (nếu cần)
mysql -u root -e "DROP DATABASE IF EXISTS hotel_management; CREATE DATABASE hotel_management;"

# 2. Chạy migration
cd backend && npm run migrate

# 3. Seed 1000 records trước để test nhanh
npm run seed:fast

# 4. Verify counts
mysql -u root hotel_management -e "
  SELECT 'Users' tbl, COUNT(*) cnt FROM Users
  UNION SELECT 'Bookings', COUNT(*) FROM Bookings
  UNION SELECT 'Stays', COUNT(*) FROM Stays
  UNION SELECT 'Reviews', COUNT(*) FROM Reviews;"

# 5. Nếu OK, seed đầy đủ 100k
npm run seed

# 6. Verify FK integrity
mysql -u root hotel_management -e "
  SELECT COUNT(*) AS orphan_bookings
  FROM Bookings b
  LEFT JOIN Users u ON b.UserId = u.UserId
  WHERE u.UserId IS NULL;"
-- Kết quả phải = 0
```

**Update `package.json`:**
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "migrate": "sequelize-cli db:migrate",
  "seed": "node src/seeders/seedRunner.js",
  "seed:fast": "node src/seeders/seedRunner.js --count=1000",
  "seed:dev": "node src/seeders/seedRunner.js --count=10000"
}
```

---

## ✅ CHECKLIST TRƯỚC KHI BÁO CÁO GIẢNG VIÊN

- [ ] 58 bảng đều có số records ≥ 100,000 (xác minh bằng query `SELECT COUNT(*)`)
- [ ] Mọi FK đều valid (xác minh bằng LEFT JOIN ... IS NULL = 0)
- [ ] Tổng dung lượng DB khoảng 3-5 GB
- [ ] Thời gian seed toàn bộ dưới 60 phút
- [ ] README có hướng dẫn `npm run seed` rõ ràng
- [ ] Migration có file riêng (đã có `001_create_all_tables.js`)
- [ ] Có demo screenshots từ MySQL Workbench / phpMyAdmin

---

🎯 **Antigravity**: Hãy generate đầy đủ 17 file code theo spec này. Đảm bảo:
1. Tất cả file JS đều dùng CommonJS (`require`/`module.exports`)
2. Mỗi seeder file export `async function run(sequelize, [IdPool,] options)`
3. Mỗi seeder dùng `seedInChunks(model, factoryFn, count, 5000)` từ `lib/chunkWriter`
4. Khi cần FK ID, dùng helper `IdPool.pickUser()`, `pickRoom()`, etc.
5. Data phải tiếng Việt realistic (dùng `vietnameseFaker.js`)
6. Code phải chạy được với `npm run seed` không lỗi
