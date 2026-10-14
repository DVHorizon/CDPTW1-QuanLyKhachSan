# 🌱 THIẾT KẾ SEEDER 100K RECORDS/TABLE

> Yêu cầu cứng: **Bảng tạo bằng Migration**, **mỗi bảng ≥ 100.000 records qua Seeder**
> Quy mô: 57 bảng × 100k = **5.700.000 records** cần seed vào MySQL.

---

## 1. ⚠️ TẠI SAO CẦN THIẾT KẾ ĐẶC BIỆT

### 1.1 Vấn đề với cách làm thông thường

```javascript
// ❌ CÁCH SAI - sẽ crash khi seed 100k records
for (let i = 1; i <= 100000; i++) {
  await db.Booking.create({...});  // 100k lần INSERT đơn lẻ
}
// → Chậm 30+ phút, dễ timeout, chiếm RAM, dễ OOM
```

### 1.2 Vấn đề với Seed hiện tại của dự án

`backend/src/seeders/seedAll.js` (file hiện tại):
- ❌ **Chỉ seed 1 bảng** (MenuItems)
- ❌ **Không đảm bảo FK** giữa các bảng
- ❌ Không có cách seed các bảng phụ thuộc lẫn nhau
- ❌ Không có progress logging khi chạy lâu
- ❌ Không chia được cho 5 người làm song song

### 1.3 Mục tiêu thiết kế

| Yêu cầu | Giải pháp |
|---|---|
| Mỗi bảng ≥ 100k records | Auto generator với chunked bulk insert |
| Đảm bảo FK giữa các bảng | Pre-fetch ID pools trước khi seed bảng phụ thuộc |
| Không timeout/OOM | Disable FK_CHECKS, batch 5.000/lần |
| Chia được cho 5 người | Mỗi module có 1-2 file seeder độc lập |
| Chạy 1 lần vs chạy lại | Hỗ trợ `--count=1000` (test) và `--count=100000` (chính thức) |
| Log progress | In % mỗi chunk, ETA còn lại |
| An toàn khi lỗi | Có thể chạy từng bảng riêng |

---

## 2. 📐 KIẾN TRÚC SEEDER

### 2.1 Cấu trúc thư mục

```
backend/src/seeders/
├── seedRunner.js              🆕 Entry point - orchestrate toàn bộ
├── lib/
│   ├── chunkWriter.js         🆕 Helper bulk insert có transaction
│   ├── idPool.js              🆕 Cache pool IDs từ DB để dùng làm FK
│   ├── vietnameseFaker.js     🆕 Sinh data tiếng Việt realistic
│   └── progressBar.js         🆕 In progress đẹp mắt
│
└── tables/                    🆕 14 file seeder theo nhóm nghiệp vụ
    ├── 00_static_reference.js      ← Tuyền/Thực: Roles, Tiers, Branches, Amenities
    ├── 01_users.js                 ← Thực: 100k users
    ├── 02_roomtypes_amenities.js   ← Thực: 100k RoomTypes + mapping
    ├── 03_rooms.js                 ← Thực: 100k Rooms (mapped to RoomType + Branch)
    ├── 04_vouchers_ota.js          ← Hà + Tuyền: 100k Vouchers + 100k OTA mappings
    ├── 05_bookings.js              ← Bảo: 100k Bookings (FK -> User, RoomType)
    ├── 06_booking_guests.js        ← Thực: 500k BookingGuests
    ├── 07_stays_room_moves.js      ← Thực: 100k Stays + 100k RoomMoveHistory
    ├── 08_housekeeping_assignments.js ← Thực: 100k HK assignments
    ├── 09_menu_restaurant.js       ← Trang: 100k MenuItems + 100k Tables + 100k Reservations
    ├── 10_food_orders.js           ← Trang: 100k FoodOrders + 500k FoodOrderDetails
    ├── 11_inventory_minibar.js     ← Tuyền: 100k InventoryItems + 100k Transactions + 100k MinibarUsages
    ├── 12_services_invoices.js     ← Hà: 100k Services + 100k ServiceOrders + 100k Invoices + 300k InvoiceDetails + 100k Payments
    ├── 13_reviews_chatbot.js       ← Bảo + Hà: 100k Reviews + 100k Photos + 100k KB + 100k Conversations + 500k Messages
    └── 14_operations_extras.js     ← Tuyền: 100k MarketingCampaigns + 100k Tickets + 100k LostFound + 100k CashShifts + 100k NightAudit + 100k Vehicles + 100k ShuttleSchedules + 100k PoliceDecl + 100k BanquetEvents + 100k StaffSchedules + 100k AuditLogs + 100k FraudAlerts + 100k Wishlists + 100k NewsletterSubs + 100k LoyaltyTxns
```

### 2.2 Thứ tự seed (quan trọng — phải theo đúng)

```
Bước 1 (Master Data - không phụ thuộc ai):
├── 00_static_reference.js
│   ├── Roles (5 records - fixed)
│   ├── Permissions (50 records - fixed)
│   ├── RolePermissions (mapping)
│   ├── MembershipTiers (5 records - fixed)
│   ├── Branches (5 records - fixed)
│   ├── Amenities (50 records - fixed)
│   ├── ServiceCategories (10 records - fixed)
│   └── MenuCategories (10 records - fixed)

Bước 2 (Schema độc lập - 100k mỗi bảng):
├── 02_roomtypes_amenities.js   (12 + 100k)
├── 11_inventory_minibar.js     (Services, Inventory items - không FK)
└── ... (các bảng standalone khác)

Bước 3 (Bảng có 1-level FK):
├── 01_users.js                → FK Roles, Tiers
├── 03_rooms.js                → FK RoomTypes, Branches
├── 04_vouchers_ota.js         → OTA channels + mappings
└── ...

Bước 4 (Bảng có 2-level FK):
├── 05_bookings.js             → FK Users, RoomTypes, Vouchers, OTA
├── 09_menu_restaurant.js      → FK Categories
└── ...

Bước 5 (Bảng có 3-level FK):
├── 06_booking_guests.js       → FK Bookings
├── 07_stays_room_moves.js     → FK Bookings, Rooms
├── 10_food_orders.js          → FK Stays, MenuItems, Tables
└── ...

Bước 6 (Deepest FK - cuối cùng):
└── 14_operations_extras.js    ← Tất cả bảng cuối
```

### 2.3 Sơ đồ phụ thuộc FK (rút gọn)

```
Roles ──┬─→ Users ──┬─→ Bookings ──┬─→ BookingGuests
Tiers ──┘    │       │              │
             │       │              ├─→ Stays ──┬─→ RoomMoveHistory
             │       │              │            ├─→ MinibarUsages
             │       │              │            ├─→ ServiceOrders
             │       │              │            ├─→ FoodOrders ──→ FoodOrderDetails
             │       │              │            ├─→ Reviews ──→ ReviewPhotos
             │       │              │            └─→ PoliceDeclarations
             │       │              └─→ Invoices ──→ InvoiceDetails
             │       │                               └─→ Payments
             │       └─→ Wishlists
             │       └─→ LoyaltyPointTransactions
             │       └─→ ChatbotConversations ──→ ChatbotMessages
             │       └─→ Reviews
             │       └─→ StaffSchedules
             │       └─→ CashShifts
             │       └─→ AuditLogs
             │       └─→ MarketingCampaigns ──→ CampaignRecipients
             │       └─→ HousekeepingAssignments
             │       └─→ BanquetEvents
             │       └─→ ShuttleSchedules
             │       └─→ MaintenanceTickets ──→ MaintenanceTicketPhotos
             │       └─→ LostAndFoundItems
             │       └─→ SmartLockLogs
             │
Branches ──┬─→ Rooms ──┬─→ Stays, HK, RoomMove, Maintenance, InventoryTx, LostFound, SmartLock
          │           └─→ HousekeepingAssignments
          │
RoomTypes ─┼─→ Rooms, Bookings, PricingRules, Wishlists, RoomTypeAmenities, OTARoomMappings
Amenities ─┴─→ RoomTypeAmenities (many-to-many)

FoodOrders.FoodOrderId → Reviews, FoodOrderDetails
MenuItems → FoodOrderDetails

MenuCategories → MenuItems
ServiceCategories → Services → ServiceOrders
RestaurantTables → FoodOrders, TableReservations
```

---

## 3. ⚡ CHIẾN LƯỢC PERFORMANCE

### 3.1 Bulk Insert Strategy

```javascript
// ✅ CÁCH ĐÚNG - chunk 5000 records/lần
async function seedInChunks(model, dataGenerator, totalCount, chunkSize = 5000) {
  let inserted = 0;
  const chunks = Math.ceil(totalCount / chunkSize);
  
  for (let i = 0; i < chunks; i++) {
    const chunkData = [];
    for (let j = 0; j < chunkSize && inserted < totalCount; j++) {
      chunkData.push(dataGenerator(inserted + j + 1));
    }
    await model.bulkCreate(chunkData, { 
      ignoreDuplicates: true,
      logging: false,
      benchmark: false
    });
    inserted += chunkData.length;
    printProgress(inserted, totalCount);
  }
}
```

### 3.2 Tối ưu ở cấp DB

```sql
-- Trước khi seed
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET SESSION bulk_insert_buffer_size = 1024 * 1024;  -- 1MB buffer

-- Sau khi seed xong
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
ANALYZE TABLE Users, Bookings, Stays;  -- update statistics
```

### 3.3 Tham số Sequelize tối ưu

```javascript
return sequelize.transaction(async (t) => {
  await model.bulkCreate(data, {
    transaction: t,
    ignoreDuplicates: true,
    hooks: false,        // KHÔNG chạy hooks khi seed
    validate: false,     // KHÔNG validate khi seed
    logging: false,
    benchmark: false,
    fields: [...]        // chỉ định rõ fields tránh SELECT trước
  });
});
```

### 3.4 Bảng ước tính thời gian seed

| Bảng | Records | Ước tính | Khó khăn |
|---|---|---|---|
| Roles, Tiers, Branches | < 100 | < 1s | Dễ |
| Users | 100k | 30s | Cần pool FK |
| Rooms | 100k | 30s | Cần room types pool |
| Bookings | 100k | 1-2 min | FK depth cao |
| BookingGuests | 500k | 5-8 min | Vol lớn |
| Stays | 100k | 2-3 min | FK Users + Rooms |
| FoodOrderDetails | 500k | 8-10 min | Vol lớn |
| InvoiceDetails | 300k | 5-7 min | Vol lớn |
| **TỔNG** | **5.7M** | **~30-45 phút** | |

---

## 4. 🎯 DATA GENERATION REALISTIC

### 4.1 Vietnamese Faker (lib/vietnameseFaker.js)

```javascript
// Sinh data tiếng Việt chuẩn khách sạn 5 sao
class VNFaker {
  fullName()        // "Nguyễn Văn A", "Trần Thị B..."
  email()           // "user_12345@hoteldomain.vn" 
  phone()           // "0912345678" format VN
  idNumber()        // CCCD 12 số
  vndPrice(min, max)// 500,000đ - 25,000,000đ format VND
  bookingDate()     // random 2 năm gần đây
  stayDuration()    // 1-7 đêm theo distribution
  roomNumber(branch, floor) // "1201", "1202" theo tầng
  reviewTitle()     // "Trải nghiệm tuyệt vời", "View đẹp"
  reviewBody()      // đoạn văn 200-500 từ
  dishName()        // "Phở bò Wagyu", "Cá Tuyết hấp xì dầu"
  serviceName()     // "Spa thư giãn 90 phút", "Đón sân bay VIP"
}
```

### 4.2 Distributed Random (quan trọng để data realistic)

```javascript
// Giá phòng theo phân phối (không random đều)
function realisticRoomPrice() {
  const r = Math.random();
  if (r < 0.6) return VNFaker.vndPrice(800000, 2500000);    // 60% Standard
  if (r < 0.85) return VNFaker.vndPrice(2500000, 5500000);   // 25% Deluxe
  if (r < 0.97) return VNFaker.vndPrice(5500000, 12000000);  // 12% Suite
  return VNFaker.vndPrice(12000000, 45000000);               // 3% Presidential
}

// Status phân phối theo dữ liệu thật
function realisticBookingStatus() {
  const r = Math.random();
  if (r < 0.05) return 'Pending';      // 5%
  if (r < 0.15) return 'Confirmed';    // 10%
  if (r < 0.75) return 'CheckedIn';    // 60%
  if (r < 0.85) return 'CheckedOut';   // 10%
  if (r < 0.92) return 'Completed';    // 7%
  return 'Cancelled';                   // 8%
}
```

### 4.3 ID Pool Pattern (tránh FK conflict)

```javascript
// Pre-fetch tất cả IDs có thể dùng làm FK
class IdPool {
  static async preload(sequelize) {
    this.userIds = (await sequelize.query(
      'SELECT UserId FROM Users', { type: 'SELECT' }
    )).map(r => r.UserId);
    
    this.roomIds = ...
    this.roomTypeIds = ...
    this.branchIds = ...
  }
  
  static pickUser() { return faker.random.arrayElement(this.userIds); }
  static pickRoom(roomTypeId) {
    return faker.random.arrayElement(
      this.roomByTypeMap.get(roomTypeId)
    );
  }
}
```

---

## 5. 🔧 CLI RUNNER (seedRunner.js)

### 5.1 Cách chạy

```bash
# Seed đầy đủ 100k/bảng (chậm, ~30 phút)
npm run seed

# Seed nhanh 1000/bảng (test trong 2 phút)
node src/seeders/seedRunner.js --count=1000

# Seed chỉ 1 bảng cụ thể
node src/seeders/seedRunner.js --tables=Users,Bookings --count=100000

# Chỉ seed Step 1 (master data)
node src/seeders/seedRunner.js --step=0 --count=100

# Skip master data, chỉ seed dependent
node src/seeders/seedRunner.js --skip-master=true

# Resume từ bảng bị lỗi
node src/seeders/seedRunner.js --resume-from=Bookings
```

### 5.2 Output mẫu

```
================================================================================
🏨  GRAND HORIZON HOTEL - DATABASE SEEDER
================================================================================
Target:  100,000 records/table × 57 tables = 5,700,000 records
Mode:    BULK INSERT (5000 chunks), FK_CHECKS off
================================================================================

[STEP 0/14] ⏱  00:02  Static Reference Data ........................... ✅ DONE
  ✓ Roles ............... 5 records
  ✓ Permissions ........ 50 records
  ✓ RolePermissions .... 250 records
  ✓ MembershipTiers .... 5 records
  ✓ Branches ........... 5 records
  ✓ Amenities .......... 50 records

[STEP 1/14] ⏱  00:45  Users .......................................... 🔄 67%
  ████████████████████░░░░░░░  67,432 / 100,000  (ETA: 00:30)

[STEP 2/14] ⏱  ...    Bookings ..................................... ⏳ WAITING
...
```

---

## 6. 🔄 WORKFLOW CHO 5 NGƯỜI

### 6.1 Chia file seeder theo Module Owner

| File seeder | Người phụ trách | Bảng |
|---|---|---|
| `00_static_reference.js` | **Thực + Tuyền** | Roles, Tiers, Branches, Amenities |
| `01_users.js` | **Thực** | Users |
| `02_roomtypes_amenities.js` | **Thực** | RoomTypes, RoomTypeAmenities |
| `03_rooms.js` | **Thực** | Rooms |
| `04_vouchers_ota.js` | **Hà + Tuyền** | Vouchers, OTAChannels, OTARoomMappings, PricingRules |
| `05_bookings.js` | **Bảo** | Bookings |
| `06_booking_guests.js` | **Thực** | BookingGuests |
| `07_stays_room_moves.js` | **Thực** | Stays, RoomMoveHistory |
| `08_housekeeping.js` | **Thực** | HousekeepingAssignments, MinibarUsages |
| `09_menu_restaurant.js` | **Trang** | MenuCategories, MenuItems, RestaurantTables, TableReservations |
| `10_food_orders.js` | **Trang** | FoodOrders, FoodOrderDetails |
| `11_inventory.js` | **Tuyền** | InventoryItems, InventoryTransactions |
| `12_services_invoices.js` | **Hà** | ServiceCategories, Services, ServiceOrders, Invoices, InvoiceDetails, Payments |
| `13_reviews_chatbot.js` | **Bảo + Hà** | Reviews, ReviewPhotos, ChatbotKB, ChatbotConversations, ChatbotMessages |
| `14_operations_extras.js` | **Tuyền** | còn lại ~ 14 bảng |

### 6.2 Quy tắc commit

```bash
# Mỗi người viết xong seeder của mình:
git checkout develop
git pull origin develop
git checkout -b Bao/seed_bookings
# Sửa file tables/05_bookings.js
git add backend/src/seeders/tables/05_bookings.js
git commit -m "feat(seed): Bao viết seeder Bookings 100k records"
git push origin Bao/seed_bookings
# Tạo PR vào develop
```

### 6.3 Khi nào seed bảng phụ thuộc của người khác?

**Quy tắc:** Người viết seeder Bookings **không sửa** seeder Users. Nếu cần data từ bảng khác, dùng **IdPool** để query lúc runtime.

```javascript
// Bảo viết seeder Bookings, cần UserId:
// ❌ SAI - Bảo không sửa file seeder của Thực
// ✅ ĐÚNG - dùng IdPool tự fetch lúc chạy
const userId = IdPool.pickUser();
```

---

## 7. 🛡️ DATA INTEGRITY

### 7.1 Đảm bảo FK luôn valid

```javascript
// Khi tạo Booking, UserId & RoomTypeId phải valid
function createBooking(id) {
  return {
    BookingId: id,                                    // Auto-increment
    UserId: IdPool.pickUser(),                         // ✅ Valid
    RoomTypeId: IdPool.pickRoomType(),                 // ✅ Valid
    VoucherId: Math.random() < 0.3 ? IdPool.pickVoucher() : null,  // 30% có voucher
    CheckInDate: VNFaker.dateInPast(),
    CheckOutDate: ...,
    NumberOfNights: VNFaker.nights(),
    Adults: VNFaker.adults(),
    Children: VNFaker.children(),
    RoomQuantity: 1,
    RoomSubtotal: ...,
    TotalAmount: ...,
    Status: realisticBookingStatus(),
    BookingSource: realisticBookingSource(),           // DirectWeb, OTA, etc.
    ConfirmationCode: VNFaker.confirmationCode()
  };
}
```

### 7.2 Coherent date ranges

```javascript
// CheckOut > CheckIn (KHÔNG BAO GIỜ ngược)
function bookingDates() {
  const checkIn = faker.date.recent(180);    // 6 tháng gần đây
  const nights = VNFaker.nights();             // 1-7 đêm
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  return { checkIn, checkOut, nights };
}
```

### 7.3 TotalAmount phải khớp với RoomSubtotal + Surcharge - Discount

```javascript
function calculateBookingMoney(roomType, nights, adults, voucher) {
  const baseSubtotal = roomType.BasePrice * nights;
  const surcharge = adults > roomType.AdultCapacity 
    ? (adults - roomType.AdultCapacity) * 200000 * nights 
    : 0;
  const discount = voucher 
    ? Math.min(voucher.DiscountValue, voucher.MaxDiscountAmount || Infinity)
    : 0;
  const total = baseSubtotal + surcharge - discount;
  return { 
    RoomSubtotal: baseSubtotal, 
    SurchargeAmount: surcharge, 
    DiscountAmount: discount, 
    TotalAmount: total 
  };
}
```

---

## 8. 📊 CHECKLIST ĐẦY ĐỦ

### 8.1 Migration Checklist (đã có một phần)

- [x] `001_create_all_tables.js` tạo 57 bảng (đã có)
- [ ] `002_seed_migration_metadata.js` đánh dấu FK_CHECKS=0 runtime (optional)
- [ ] Verify `npm run migrate` chạy sạch trên MySQL 8.0 trống

### 8.2 Seeder Checklist

- [ ] Tạo `seedRunner.js` với CLI argument parser
- [ ] Tạo `lib/chunkWriter.js` helper
- [ ] Tạo `lib/vietnameseFaker.js` data generator
- [ ] Tạo `lib/idPool.js` ID pool manager
- [ ] Tạo `lib/progressBar.js` hiển thị tiến độ
- [ ] Viết 14 file seeder theo thứ tự FK
- [ ] Mỗi file dùng `seedInChunks(model, factory, N, 5000)`
- [ ] Test: `npm run seed` chạy không lỗi 100k/bảng
- [ ] Test: `--count=1000` chạy trong < 5 phút
- [ ] Verify FK: query cross-table cho kết quả hợp lý
- [ ] Verify indexes được dùng: `EXPLAIN SELECT * FROM Bookings WHERE UserId=?`
- [ ] Update README với cách chạy

### 8.3 Performance Benchmark

```bash
# Sau khi seed xong, chạy benchmark
mysql -u root hotel_management -e "
  SELECT 'Users' AS tbl, COUNT(*) FROM Users
  UNION SELECT 'Bookings', COUNT(*) FROM Bookings
  UNION SELECT 'Stays', COUNT(*) FROM Stays
  UNION SELECT 'Reviews', COUNT(*) FROM Reviews
  ORDER BY tbl;
"
-- Verify tất cả đều ≥ 100k
```

---

## 9. 🚨 TROUBLESHOOTING

### Vấn đề thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| `Lock wait timeout exceeded` | Có transaction chưa commit | Tắt FK_CHECKS + dùng 1 connection |
| `Out of memory` | Bulk insert quá lớn | Giảm chunk xuống 2000 |
| Seed chậm hơn 60 phút | Quá nhiều index update | Drop index trước, tạo lại sau |
| Duplicate key FK | Pool ID chưa preload | Đảm bảo `IdPool.preload()` trước khi seeder chạy |
| Seed chỉ chạy 1 bảng | Thiếu trong `seedRunner.js` registry | Thêm vào danh sách |

### Drop index trước, recreate sau (tăng tốc 3-5x)

```javascript
// Trong seedRunner.js trước khi seed:
await sequelize.query('ALTER TABLE Bookings DROP INDEX idx_user');
await sequelize.query('ALTER TABLE Bookings DROP INDEX idx_dates');
// ... seed ...
await sequelize.query('ALTER TABLE Bookings ADD INDEX idx_user (UserId)');
await sequelize.query('ALTER TABLE Bookings ADD INDEX idx_dates (CheckInDate, CheckOutDate)');
```

---

## 10. 🎁 TIẾP THEO

Tôi sẵn sàng generate code thực tế cho bạn, theo thứ tự ưu tiên:

1. **🥇 `seedRunner.js`** - Orchestrator CLI (entry point chính)
2. **🥈 `lib/chunkWriter.js`** - Helper bulk insert
3. **🥉 `lib/vietnameseFaker.js`** - Sinh data tiếng Việt
4. **🏅 `lib/idPool.js`** - Quản lý FK IDs
5. **🎖️ 14 file seeder** theo từng module

Bạn muốn tôi **generate code thực tế** file nào trước?
