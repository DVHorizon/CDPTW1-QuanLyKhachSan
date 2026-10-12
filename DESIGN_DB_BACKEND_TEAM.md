# 🏗️ THIẾT KẾ DB & BACKEND PHÂN CHIA CHO 5 THÀNH VIÊN

> Giải pháp để 5 người làm việc **song song, ít xung đột, merge an toàn**.

---

## 1. 🎯 TỔNG QUAN CHIẾN LƯỢC

```
┌──────────────────────────────────────────────────────────┐
│   FRONTEND (React SPA)                                   │
│   ├── guest-portal/  ← Bảo                              │
│   ├── pms/           ← Thực                              │
│   ├── services/      ← Hà                                │
│   ├── fnb/           ← Trang                             │
│   └── operations/    ← Tuyền                             │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTP REST API
┌────────────────────▼─────────────────────────────────────┐
│   BACKEND GATEWAY (server.js) - 1 instance duy nhất       │
│   /api/v1/auth/*          (auth chung)                   │
│   /api/v1/guest/*         ← module của Bảo               │
│   /api/v1/pms/*           ← module của Thực               │
│   /api/v1/services/*      ← module của Hà                │
│   /api/v1/fnb/*           ← module của Trang             │
│   /api/v1/operations/*    ← module của Tuyền             │
│   /api/v1/shared/*        (bảng dùng chung)              │
└────────────────────┬─────────────────────────────────────┘
                     │ Sequelize ORM
┌────────────────────▼─────────────────────────────────────┐
│   MYSQL (1 schema duy nhất - shared database)            │
│   57 bảng - mỗi bảng có 1 OWNER rõ ràng                 │
│   Quyền: OWNER write/read, người khác read-only          │
└──────────────────────────────────────────────────────────┘
```

**Nguyên tắc cốt lõi:**
1. **1 database duy nhất**, **1 server backend** chạy port 5000.
2. Mỗi bảng có **đúng 1 OWNER** — người duy nhất được CRUD.
3. **API có version `/v1/{module}/*`** để biết ngay module nào sở hữu.
4. **Shared models** ở `models/shared/` cho bảng mà nhiều người cần đọc.
5. **Git branching** mỗi người 1 branch + 1 folder riêng → giảm merge conflict.

---

## 2. 📊 BẢNG PHÂN CHIA QUYỀN SỞ HỮU 57 BẢNG

### 2.1 Ma trận Owner

| STT | Bảng | OWNER | Quyền của người khác |
|-----|------|-------|----------------------|
| 1 | `Roles` | **Thực** | Read-only |
| 2 | `Permissions` | **Thực** | Read-only |
| 3 | `RolePermissions` | **Thực** | Read-only |
| 4 | `MembershipTiers` | **Tuyền** | Read-only |
| 5 | `Branches` | **Thực** | Read-only |
| 6 | `Users` | **Thực** | Update limited (chỉ sửa profile của mình) |
| 7 | `PasswordResetTokens` | **Thực** | - |
| 8 | `RoomTypes` | **Thực** | Read-only |
| 9 | `Amenities` | **Thực** | Read-only |
| 10 | `RoomTypeAmenities` | **Thực** | Read-only |
| 11 | `Rooms` | **Thực** | Read-only |
| 12 | `PricingRules` | **Hà** | Read-only |
| 13 | `Vouchers` | **Hà** | Read-only |
| 14 | `OTAChannels` | **Tuyền** | Read-only |
| 15 | `OTARoomMappings` | **Tuyền** | Read-only |
| 16 | `Bookings` | **Bảo** (Guest CRUD own) + **Thực** (Admin all) | Read |
| 17 | `BookingGuests` | **Thực** | Read-only |
| 18 | `Stays` | **Thực** | Read-only |
| 19 | `RoomMoveHistory` | **Thực** | - |
| 20 | `HousekeepingAssignments` | **Thực** | - |
| 21 | `ServiceCategories` | **Hà** | Read-only |
| 22 | `Services` | **Hà** | Read-only |
| 23 | `ServiceOrders` | **Hà** | Read-only |
| 24 | `Invoices` | **Hà** | Read-only |
| 25 | `InvoiceDetails` | **Hà** | Read-only |
| 26 | `Payments` | **Hà** | Read-only |
| 27 | `MenuCategories` | **Trang** | Read-only |
| 28 | `MenuItems` | **Trang** | Read-only |
| 29 | `RestaurantTables` | **Trang** | Read-only |
| 30 | `FoodOrders` | **Trang** | Read-only |
| 31 | `FoodOrderDetails` | **Trang** | Read-only |
| 32 | `TableReservations` | **Trang** | Read-only |
| 33 | `InventoryItems` | **Tuyền** | Read-only |
| 34 | `InventoryTransactions` | **Tuyền** | Read-only |
| 35 | `MinibarUsages` | **Thực** | Read-only |
| 36 | `Reviews` | **Bảo** (Guest own) | Read |
| 37 | `ReviewPhotos` | **Bảo** | Read |
| 38 | `ChatbotKnowledgeBase` | **Hà** | Read-only |
| 39 | `ChatbotConversations` | **Hà** | Own only |
| 40 | `ChatbotMessages` | **Hà** | Own only |
| 41 | `LoyaltyPointTransactions` | **Tuyền** | Read-only |
| 42 | `MarketingCampaigns` | **Tuyền** | Read-only |
| 43 | `CampaignRecipients` | **Tuyền** | Read-only |
| 44 | `MaintenanceTickets` | **Tuyền** | Read-only |
| 45 | `MaintenanceTicketPhotos` | **Tuyền** | - |
| 46 | `LostAndFoundItems` | **Tuyền** | - |
| 47 | `SmartLockLogs` | **Thực** | Read-only |
| 48 | `CashShifts` | **Thực** | Read-only |
| 49 | `NightAuditReports` | **Tuyền** | - |
| 50 | `Vehicles` | **Tuyền** | - |
| 51 | `ShuttleSchedules` | **Tuyền** | - |
| 52 | `PoliceDeclarations` | **Tuyền** | - |
| 53 | `BanquetEvents` | **Tuyền** | Read-only |
| 54 | `StaffSchedules` | **Tuyền** | Own only |
| 55 | `AuditLogs` | **Tuyền** (System-wide) | - |
| 56 | `FraudAlerts` | **Tuyền** | - |
| 57 | `Wishlists` | **Bảo** | Own only |
| 58 | `NewsletterSubscribers` | **Bảo** | - |

### 2.2 Tổng kết số bảng mỗi người

| Thành viên | Module | Số bảng OWNER | Số bảng Read-Only |
|---|---|---|---|
| **Bảo** | guest-portal | 5 (Bookings*, Reviews, ReviewPhotos, Wishlists, NewsletterSubscribers) | ~25 |
| **Thực** | pms | 18 (Roles, Users, Rooms, Stays, MinibarUsages, SmartLockLogs, CashShifts, etc.) | ~15 |
| **Hà** | services | 12 (Services, Invoices, Payments, PricingRules, Vouchers, Chatbot*) | ~20 |
| **Trang** | fnb | 6 (Menu*, FoodOrders, TableReservations) | ~10 |
| **Tuyền** | operations | 18 (AuditLogs, Inventory, Maintenance, NightAudit, OTA, Banquet, Staff, Loyalty, Marketing) | ~20 |

*Note: Bookings có Bảo CRUD own + Thực CRUD all (rule đặc biệt cần convention rõ trong API contract)

---

## 3. 🗂️ CẤU TRÚC BACKEND MODULAR

```
backend/src/
├── server.js                       # Entry point - mount tất cả modules
├── app.js                          # Express app + middlewares chung
├── config/
│   ├── db.js                       # MySQL pool (shared)
│   ├── sequelize.js                # Sequelize instance (shared)
│   └── config.js                   # Dev/Test/Prod config
│
├── shared/                         # Thư mục DÙNG CHUNG (Team-wide)
│   ├── models/                     # 14 models đã có - CẤM SỬA
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Booking.js
│   │   └── ... (14 file hiện tại)
│   ├── middlewares/
│   │   ├── authMiddleware.js       # verifyToken - đã có
│   │   ├── errorHandler.js         # 🆕 format lỗi thống nhất
│   │   ├── validate.js             # 🆕 validation helper dùng chung
│   │   └── auditMiddleware.js      # đã có
│   ├── utils/
│   │   ├── response.js             # 🆕 success(res, data) / error(res, code, msg)
│   │   ├── pagination.js           # 🆕 parsePage(req) -> {page, limit, offset}
│   │   └── constants.js            # 🆕 ErrorCodes, HttpStatus chuẩn
│   └── routes/
│       └── index.js                # 🆕 Auto-load tất cả module routes
│
└── modules/                        # MỖI NGƯỜI MỘT THƯ MỤC
    ├── guest/                      # 👤 Bảo - Guest Portal
    │   ├── routes/
    │   │   ├── searchRoutes.js     # /api/v1/guest/search
    │   │   ├── bookingRoutes.js    # /api/v1/guest/bookings
    │   │   ├── reviewRoutes.js     # /api/v1/guest/reviews
    │   │   ├── wishlistRoutes.js   # /api/v1/guest/wishlist
    │   │   └── homeRoutes.js       # /api/v1/guest/home
    │   ├── controllers/
    │   ├── services/
    │   │   ├── bookingService.js   # business logic booking
    │   │   └── searchService.js    # gọi Lucene
    │   └── validators/             # joi schemas
    │
    ├── pms/                        # 👤 Thực - Reception/PMS
    │   ├── routes/
    │   │   ├── roomTypeRoutes.js
    │   │   ├── roomRoutes.js
    │   │   ├── userRoutes.js       # CRUD nhân viên
    │   │   ├── checkinRoutes.js
    │   │   ├── checkoutRoutes.js
    │   │   ├── roomMapRoutes.js    # sơ đồ phòng
    │   │   └── housekeepingRoutes.js
    │   ├── controllers/
    │   ├── services/
    │   │   ├── checkinService.js
    │   │   └── roomMapService.js
    │   └── validators/
    │
    ├── services/                   # 👤 Hà - Dịch vụ/Payment/AI
    │   ├── routes/
    │   │   ├── spaRoutes.js        # /api/v1/services/spa
    │   │   ├── paymentRoutes.js    # /api/v1/services/payment (CORE)
    │   │   ├── invoiceRoutes.js
    │   │   ├── dashboardRoutes.js
    │   │   ├── chatbotRoutes.js    # /api/v1/services/chatbot
    │   │   └── voucherRoutes.js
    │   ├── controllers/
    │   ├── services/
    │   │   ├── paymentGateway.js   # VNPay/MoMo integration
    │   │   ├── invoiceService.js   # gom bill tổng
    │   │   └── chatbotService.js   # AI
    │   └── validators/
    │
    ├── fnb/                        # 👤 Trang - F&B
    │   ├── routes/
    │   │   ├── menuRoutes.js
    │   │   ├── orderRoutes.js
    │   │   ├── kitchenRoutes.js    # KDS
    │   │   ├── tableRoutes.js
    │   │   └── reservationRoutes.js
    │   ├── controllers/
    │   ├── services/
    │   │   ├── kdsService.js
    │   │   └── recommendationService.js # AI combo
    │   └── validators/
    │
    └── operations/                 # 👤 Tuyền - Back-office
        ├── routes/
        │   ├── auditRoutes.js
        │   ├── inventoryRoutes.js
        │   ├── maintenanceRoutes.js
        │   ├── lostFoundRoutes.js
        │   ├── nightAuditRoutes.js
        │   ├── otaRoutes.js
        │   ├── shuttleRoutes.js
        │   ├── banquetRoutes.js
        │   ├── rosterRoutes.js
        │   └── loyaltyRoutes.js
        ├── controllers/
        ├── services/
        │   ├── nightAuditService.js
        │   └── otaSyncService.js
        └── validators/
```

---

## 4. 🔌 API CONTRACT CHUẨN HÓA

### 4.1 Quy tắc đặt tên endpoint

```
METHOD   /api/v1/{module}/{resource}
GET      /api/v1/guest/rooms?branch=1&checkin=2026-01-01  (danh sách, filter)
GET      /api/v1/guest/rooms/:id                          (chi tiết)
POST     /api/v1/guest/bookings                           (tạo mới)
PUT      /api/v1/guest/bookings/:id                       (cập nhật toàn bộ)
PATCH    /api/v1/guest/bookings/:id                       (cập nhật một phần)
DELETE   /api/v1/guest/bookings/:id                       (xóa)
GET      /api/v1/guest/bookings/:id/cancel                (action cụ thể)
```

### 4.2 Response Format chuẩn (MỌI API phải tuân thủ)

```javascript
// Success
{
  "success": true,
  "code": "SUCCESS_0001",
  "message": "Lấy danh sách phòng thành công",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}

// Error
{
  "success": false,
  "code": "ERROR_0001_REQUIRED",
  "message": "Email không được để trống",
  "errors": [                    // optional - validation errors
    { "field": "email", "message": "Required" }
  ],
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### 4.3 Bảng API theo module

#### 🔐 AUTH (dùng chung - chỉ Thực modify)

| Method | Endpoint | Owner | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Thực | Đăng ký |
| POST | `/api/v1/auth/login` | Thực | Đăng nhập |
| POST | `/api/v1/auth/google` | Thực | OAuth |
| POST | `/api/v1/auth/facebook` | Thực | OAuth |
| POST | `/api/v1/auth/logout` | Thực | Logout |
| POST | `/api/v1/auth/forgot-password` | Thực | Quên MK |
| POST | `/api/v1/auth/reset-password` | Thực | Reset MK |
| GET | `/api/v1/auth/me` | Thực | Current user |

#### 👤 BẢO - Guest Portal (`/api/v1/guest/*`)

| Method | Endpoint | Bảng đụng | Mô tả |
|---|---|---|---|
| GET | `/guest/home` | Branches, RoomTypes, Amenities, Reviews | Trang chủ |
| GET | `/guest/branches` | Branches | Danh sách chi nhánh |
| GET | `/guest/room-types` | RoomTypes, Amenities | Hạng phòng |
| GET | `/guest/rooms/search` | RoomTypes, Rooms, Bookings | Tìm kiếm (BM25) |
| GET | `/guest/rooms/:id` | RoomTypes, Rooms, Reviews | Chi tiết phòng |
| GET | `/guest/rooms/suggest` | RoomTypes | Autocomplete |
| GET | `/guest/bookings` | Bookings | Lịch sử booking của tôi |
| GET | `/guest/bookings/:id` | Bookings, BookingGuests | Chi tiết booking của tôi |
| POST | `/guest/bookings` | Bookings, BookingGuests | Tạo booking |
| PATCH | `/guest/bookings/:id/cancel` | Bookings | Hủy booking |
| POST | `/guest/bookings/:id/payment` | Bookings (call Hà) | Trả cọc |
| GET | `/guest/bookings/:id/qr` | Bookings | Lấy QR |
| POST | `/guest/reviews` | Reviews, Stays | Tạo review |
| GET | `/guest/reviews/my` | Reviews | Review của tôi |
| POST | `/guest/wishlist` | Wishlists | Thêm yêu thích |
| GET | `/guest/wishlist` | Wishlists, RoomTypes | DS yêu thích |
| DELETE | `/guest/wishlist/:roomTypeId` | Wishlists | Xóa yêu thích |
| POST | `/guest/newsletter` | NewsletterSubscribers | Đăng ký nhận tin |
| GET | `/guest/vouchers` | Vouchers (read) | DS voucher khả dụng |
| GET | `/guest/compare?ids=1,2,3` | RoomTypes | So sánh phòng |

#### 👤 THỰC - PMS (`/api/v1/pms/*`)

| Method | Endpoint | Bảng đụng | Mô tả |
|---|---|---|---|
| CRUD | `/pms/roles` | Roles | Vai trò |
| CRUD | `/pms/users` | Users, Roles, MembershipTiers | User nội bộ |
| PATCH | `/pms/users/:id/role` | Users | Đổi vai trò |
| CRUD | `/pms/room-types` | RoomTypes, Amenities, RoomTypeAmenities | Hạng phòng |
| CRUD | `/pms/rooms` | Rooms, RoomTypes, Branches | Phòng vật lý |
| GET | `/pms/room-map` | Rooms, Bookings, Stays | Sơ đồ phòng |
| PATCH | `/pms/rooms/:id/status` | Rooms | Đổi trạng thái |
| GET | `/pms/bookings` | Bookings, Users, RoomTypes | Tất cả booking |
| PATCH | `/pms/bookings/:id/allocate` | Bookings, Rooms | Gán phòng |
| POST | `/pms/checkin` | Bookings, Stays, Rooms, BookingGuests | Check-in |
| POST | `/pms/checkout` | Stays, Invoices (call Hà) | Check-out |
| PATCH | `/pms/stays/:id/extend` | Stays, Bookings | Gia hạn |
| PATCH | `/pms/stays/:id/move` | Stays, Rooms, RoomMoveHistory | Đổi phòng |
| GET | `/pms/stays/:id/minibar` | MinibarUsages, InventoryItems | Minibar |
| POST | `/pms/stays/:id/minibar` | MinibarUsages | Ghi minibar |
| GET | `/pms/housekeeping/assignments` | HousekeepingAssignments | Phân công |
| POST | `/pms/housekeeping/assign` | HousekeepingAssignments, Stays | Phân công tự động |
| PATCH | `/pms/housekeeping/:id/complete` | HousekeepingAssignments | Hoàn tất |
| GET | `/pms/cash-shift` | CashShifts | Ca hiện tại |
| POST | `/pms/cash-shift/open` | CashShifts | Mở ca |
| POST | `/pms/cash-shift/close` | CashShifts | Đóng ca |
| GET | `/pms/smart-locks/logs` | SmartLockLogs | Lịch sử khóa |

#### 👤 HÀ - Services/Payment/AI (`/api/v1/services/*`)

| Method | Endpoint | Bảng đụng | Mô tả |
|---|---|---|---|
| CRUD | `/services/categories` | ServiceCategories | DM dịch vụ |
| CRUD | `/services/items` | Services, ServiceCategories | DS dịch vụ |
| GET | `/services/items` | Services | Cho khách xem |
| POST | `/services/orders` | ServiceOrders, Stays, Services | Đặt dịch vụ |
| GET | `/services/orders` | ServiceOrders | Lịch sử |
| PATCH | `/services/orders/:id/status` | ServiceOrders | Cập nhật TT |
| CRUD | `/services/vouchers` | Vouchers | Mã giảm giá |
| CRUD | `/services/pricing-rules` | PricingRules | Quy tắc giá |
| POST | `/services/payment/vnpay` | Payments | Tạo URL VNPay |
| POST | `/services/payment/momo` | Payments | Tạo URL MoMo |
| POST | `/services/payment/vietqr` | Payments | Tạo QR |
| POST | `/services/payment/callback` | Payments, Bookings | Webhook cổng TT |
| GET | `/services/payment/:id/status` | Payments | Trạng thái TT |
| GET | `/services/invoices` | Invoices, InvoiceDetails, Stays | DS hóa đơn |
| GET | `/services/invoices/:id` | Invoices, InvoiceDetails | Chi tiết HD |
| GET | `/services/invoices/:id/pdf` | Invoices | Xuất PDF |
| POST | `/services/invoices/aggregate` | Invoices, Bookings, ServiceOrders, FoodOrders | Gom bill tổng |
| GET | `/services/dashboard/revenue` | Invoices, Payments, Bookings | Doanh thu |
| GET | `/services/dashboard/occupancy` | Bookings, Stays, Rooms | Tỷ lệ lấp đầy |
| GET | `/services/dashboard/revpar` | Invoices, Rooms | RevPAR |
| POST | `/services/chatbot/message` | ChatbotConversations, ChatbotMessages, ChatbotKnowledgeBase | Chat |
| CRUD | `/services/chatbot/knowledge` | ChatbotKnowledgeBase | Knowledge Base |

#### 👤 TRANG - F&B (`/api/v1/fnb/*`)

| Method | Endpoint | Bảng đụng | Mô tả |
|---|---|---|---|
| CRUD | `/fnb/categories` | MenuCategories | DM món |
| CRUD | `/fnb/menu` | MenuItems, MenuCategories | Menu CRUD |
| PATCH | `/fnb/menu/:id/status` | MenuItems | Còn/hết |
| GET | `/fnb/menu` | MenuItems, MenuCategories | DS cho khách |
| POST | `/fnb/orders` | FoodOrders, FoodOrderDetails, Stays | Room service |
| GET | `/fnb/orders` | FoodOrders | Lịch sử |
| GET | `/fnb/orders/kitchen` | FoodOrders, FoodOrderDetails, MenuItems, Rooms | KDS |
| PATCH | `/fnb/orders/:id/status` | FoodOrders | Cập nhật TT bếp |
| PATCH | `/fnb/orders/:id/payment` | FoodOrders, Payments (call Hà) | Thanh toán |
| GET | `/fnb/orders/:id/receipt` | FoodOrders | In bill |
| CRUD | `/fnb/tables` | RestaurantTables | DS bàn |
| POST | `/fnb/reservations` | TableReservations, RestaurantTables, Users | Đặt bàn |
| GET | `/fnb/reservations` | TableReservations | DS đặt bàn |
| POST | `/fnb/orders/:id/review` | Reviews, FoodOrders | Đánh giá món |
| GET | `/fnb/analytics/top-dishes` | FoodOrders, FoodOrderDetails | Top món |
| GET | `/fnb/analytics/revenue` | FoodOrders, Payments | Doanh thu F&B |
| GET | `/fnb/recommendation` | MenuItems, FoodOrderDetails | AI gợi ý combo |

#### 👤 TUYỀN - Operations (`/api/v1/operations/*`)

| Method | Endpoint | Bảng đụng | Mô tả |
|---|---|---|---|
| CRUD | `/operations/loyalty-tiers` | MembershipTiers | Hạng hội viên |
| GET | `/operations/loyalty-transactions` | LoyaltyPointTransactions | LS giao dịch điểm |
| CRUD | `/operations/campaigns` | MarketingCampaigns, CampaignRecipients | Marketing |
| POST | `/operations/campaigns/:id/send` | MarketingCampaigns, CampaignRecipients | Gửi campaign |
| CRUD | `/operations/inventory` | InventoryItems, InventoryTransactions | Kho |
| POST | `/operations/inventory/import` | InventoryTransactions | Nhập kho |
| POST | `/operations/inventory/export` | InventoryTransactions | Xuất kho |
| CRUD | `/operations/maintenance` | MaintenanceTickets, MaintenanceTicketPhotos | Bảo trì |
| POST | `/operations/maintenance/:id/photos` | MaintenanceTicketPhotos | Upload ảnh |
| CRUD | `/operations/lost-found` | LostAndFoundItems | Đồ thất lạc |
| GET | `/operations/smart-locks` | SmartLockLogs (read) | Lịch sử khóa |
| POST | `/operations/smart-locks/unlock` | SmartLockLogs | Mở khóa từ xa |
| GET | `/operations/night-audit` | NightAuditReports | Lịch sử audit |
| POST | `/operations/night-audit/run` | NightAuditReports, Bookings, Invoices, Payments | Chạy audit đêm |
| CRUD | `/operations/vehicles` | Vehicles | Xe |
| CRUD | `/operations/shuttles` | ShuttleSchedules, Vehicles, Bookings | Đặt xe |
| POST | `/operations/police-declaration` | PoliceDeclarations, Stays | Khai báo tạm trú |
| GET | `/operations/police-declaration/export` | PoliceDeclarations | Export XML/CSV |
| CRUD | `/operations/banquet` | BanquetEvents, Bookings | Tiệc/hội nghị |
| CRUD | `/operations/roster` | StaffSchedules, Users | Lịch làm việc |
| GET | `/operations/audit-logs` | AuditLogs | Nhật ký |
| GET | `/operations/fraud-alerts` | FraudAlerts | Cảnh báo |
| PATCH | `/operations/fraud-alerts/:id/resolve` | FraudAlerts | Xử lý cảnh báo |
| CRUD | `/operations/ota-channels` | OTAChannels, OTARoomMappings | Kênh OTA |
| POST | `/operations/ota/sync` | OTAChannels, Bookings, Rooms | Đồng bộ OTA |

---

## 5. 🔄 GIAO TIẾP GIỮA CÁC MODULE

### 5.1 Quy tắc vàng

**Module KHÔNG ĐƯỢC gọi trực tiếp database của module khác** để ghi.
Thay vào đó phải gọi **HTTP API nội bộ** hoặc dùng **Shared Service**.

### 5.2 Cross-Module Communication Patterns

```
┌─────────────────────────────────────────────────────────┐
│         PATTERN 1: HTTP API nội bộ (ưu tiên)            │
│  modules/pms/controllers/checkoutController.js          │
│       ↓ axios.post('http://localhost:5000/api/v1/      │
│                     services/invoices/aggregate')       │
│  modules/services/controllers/invoiceController.js      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         PATTERN 2: Shared Service (cho read)            │
│  modules/pms/controllers/checkinController.js           │
│       ↓                                                  │
│  shared/services/bookingService.js (read Booking)      │
│  shared/services/paymentService.js (gọi Hà's logic)    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         PATTERN 3: Domain Event qua Socket.IO           │
│  modules/fnb/controllers/orderController.js             │
│       ↓                                                  │
│  emit 'order:new' → namespace /kitchen                  │
│  → Trang's frontend nhận realtime                       │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Bảng các cross-module dependency

| Module A gọi | Module B | Action | Pattern |
|---|---|---|---|
| Bảo (guest) | Hà (services) | Tạo payment cho booking | HTTP `/services/payment/vnpay` |
| Thực (pms) | Hà (services) | Aggregate invoice khi check-out | HTTP `/services/invoices/aggregate` |
| Thực (pms) | Hà (services) | Tính giá booking có voucher | HTTP `/services/pricing-rules/calculate` |
| Trang (fnb) | Hà (services) | Tạo payment cho F&B | HTTP `/services/payment/vnpay` |
| Thực (pms) | Tuyền (operations) | Ghi audit log | HTTP `/operations/audit-logs` |
| Trang (fnb) | Tuyền (operations) | Trừ nguyên liệu kho | HTTP `/operations/inventory/export` |
| Bảo (guest) | Tuyền (operations) | Áp dụng loyalty điểm | HTTP `/operations/loyalty/calculate` |
| Thực (pms) | Tuyền (operations) | Khai báo tạm trú | HTTP `/operations/police-declaration` |

---

## 6. 🌿 GIT BRANCHING STRATEGY

### 6.1 Branch layout

```
main (protected)
  ├── develop (integration)
  │   ├── Bao/0_init
  │   ├── Bao/1_guest_search
  │   ├── Bao/2_booking_engine
  │   │
  │   ├── Thuc/0_init
  │   ├── Thuc/1_user_crud
  │   ├── Thuc/2_room_map
  │   ├── Thuc/3_checkin
  │   │
  │   ├── Ha/0_init
  │   ├── Ha/1_service_crud
  │   ├── Ha/2_payment_core
  │   ├── Ha/3_invoice_aggregate
  │   │
  │   ├── Trang/0_init
  │   ├── Trang/1_menu_crud
  │   ├── Trang/2_kds
  │   ├── Trang/3_ai_combo
  │   │
  │   └── Tuyen/0_init
  │       ├── Tuyen/1_loyalty
  │       ├── Tuyen/2_inventory
  │       ├── Tuyen/3_night_audit
  │       └── Tuyen/4_ota
  │
  └── release/v1.0
```

### 6.2 Quy tắc merge

1. **Mỗi người chỉ code trong folder `modules/{ten-minh}/`**
2. **`shared/` chỉ thay đổi qua Pull Request có review của team lead**
3. **Mỗi tính năng = 1 branch riêng**, PR mô tả rõ ràng
4. **Merge vào `develop` mỗi khi xong 1 task** để tích hợp sớm
5. **`main` chỉ merge từ `develop` khi release**

### 6.3 Convention commit

```bash
feat(Bao): thêm API search phòng theo ngày
fix(Thuc): sửa bug checkin không gán phòng
refactor(Ha): tách payment service ra module riêng
docs(Trang): cập nhật API doc cho KDS
chore(Tuyen): thêm seed cho bảng OTAChannels
```

---

## 7. 🗄️ CHIA SẺ DATABASE

### 7.1 Một database duy nhất qua Docker

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD:-secret123}
      MYSQL_DATABASE: hotel_management
    ports: ["3306:3306"]
    volumes:
      - mysql_data:/var/lib/mysql  # ← PERSISTENT volume
```

**Ai cũng dùng chung container MySQL** → schema luôn đồng bộ.

### 7.2 Migration ownership

Mỗi người tạo migration trong folder riêng, **KHÔNG sửa migration của người khác**:

```
backend/src/migrations/
├── 001_create_all_tables.js          # Thực (đã có - schema chính)
├── 002_seed_initial_data.js          # Tuyền (seed loại, role, tier)
├── 003_add_loyalty_indexes.js        # Tuyền
├── 004_add_payment_indexes.js        # Hà
├── 005_add_kds_indexes.js            # Trang
└── 006_add_guest_indexes.js          # Bảo
```

### 7.3 Seeding phân chia

```
backend/src/seeders/
├── 00_thuc_roles_users.js            # Thực seed 5 roles + 5 users test
├── 01_thuc_roomtypes_rooms.js        # Thực seed 5 room types + 50 rooms
├── 02_tuyen_branches_tiers.js        # Tuyền seed 3 branches + 4 tiers
├── 03_ha_services_vouchers.js        # Hà seed 10 services + 5 vouchers
├── 04_trang_menu.js                  # Trang seed 4 cats + 30 menu items
└── 99_bao_bookings_reviews.js        # Bảo seed 20 bookings + 10 reviews
```

Cú pháp gọi: `node src/seeders/00_thuc_roles_users.js` (chạy từng file).

---

## 8. 🔐 RBAC PERMISSIONS

### 8.1 Bảng Role × Module

| Role | Modules có quyền | Endpoint pattern |
|---|---|---|
| **Guest** (user_5) | guest (own only) | `/api/v1/guest/*` |
| **Receptionist** (user_2) | pms + guest(read) | `/api/v1/pms/*` |
| **Kitchen** (user_3) | fnb (kitchen) | `/api/v1/fnb/orders/kitchen` |
| **Housekeeping** (user_4) | pms (housekeeping subset) | `/api/v1/pms/housekeeping/*` |
| **Admin** (user_1) | ALL | `*` |

### 8.2 Middleware áp dụng

```javascript
// shared/middlewares/rbacMiddleware.js
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json(...);
  if (!roles.includes(req.user.roleName)) {
    return res.status(403).json({ 
      success: false, 
      code: 'ERROR_0009_FORBIDDEN',
      message: 'Bạn không có quyền truy cập' 
    });
  }
  next();
};

// Dùng trong routes:
router.post('/', requireRole('Admin', 'Receptionist'), controller.create);
```

---

## 9. 📡 REAL-TIME NAMESPACES (Socket.IO)

```
io.of('/kitchen')     ← Trang - F&B orders mới
io.of('/pms')         ← Thực - Room status realtime
io.of('/chatbot')     ← Hà - AI streaming response
io.of('/dashboard')   ← Hà - Master dashboard updates
io.of('/housekeeping')← Thực - Assignment notifications
```

Mỗi namespace có **JWT auth riêng** và **room theo role**.

---

## 10. 🧪 TESTING & MOCKING

### 10.1 Mỗi người có bộ test riêng

```
backend/
├── modules/guest/__tests__/     ← Bảo viết
├── modules/pms/__tests__/       ← Thực viết
├── modules/services/__tests__/  ← Hà viết
├── modules/fnb/__tests__/       ← Trang viết
└── modules/operations/__tests__/← Tuyền viết
```

### 10.2 Mock server khi FE chưa sẵn sàng

`server.js` cung cấp **mock data khi DB lỗi** qua flag `MOCK_MODE=true`:

```javascript
if (process.env.MOCK_MODE === 'true') {
  // Trả mock data thay vì query DB
}
```

Giúp người khác không bị block khi chờ backend module khác xong.

---

## 11. 📋 CHECKLIST "DEFINITION OF DONE" CHO MỖI TASK

Một task được coi là xong khi:

- [ ] Code chỉ chạm vào `modules/{ten-minh}/` (trừ khi cần cross-module)
- [ ] Response đúng format chuẩn (success/data/meta)
- [ ] Có validation input (joi hoặc class-validator)
- [ ] Có error handling (try/catch + next(err))
- [ ] Có ít nhất 1 test cho happy path
- [ ] README trong folder module (cách chạy, env vars)
- [ ] Đã gọi qua Postman/Insomnia & screenshot
- [ ] Đã merge vào `develop` không conflict
- [ ] Đã báo cho team khi có breaking change

---

## 12. 🚀 LỘ TRÌNH TRIỂN KHAI 2 TUẦN

### Tuần 1 — Nền tảng & Schema
| Ngày | Tất cả | Từng người |
|---|---|---|
| T2 | Họp kickoff, phân module, thống nhất API contract | Tạo branch + folder |
| T3 | Thực merge schema chuẩn + Auth | Tạo skeleton routes |
| T4 | - | CRUD models cơ bản |
| T5 | Tuyền merge Audit + Auth middleware (verifyToken, rbac) | Tiếp tục CRUD |
| T6 | Họp review, fix bug, đồng bộ | Demo nội bộ module |

### Tuần 2 — Tích hợp & Hoàn thiện
| Ngày | Công việc |
|---|---|
| T7 | Cross-module: Thực+Trang, Thực+Hà, Bảo+Hà test |
| T8 | Realtime: Trang socket KDS, Thực socket room map |
| T9 | Seed data đầy đủ cho demo |
| T10 | E2E test toàn hệ thống |
| T11 | Fix bug, polish UI |
| T12 | **DEMO** |

---

## 13. 📞 KÊNH LIÊN LẠC NHANH

| Mục đích | Kênh |
|---|---|
| Hỏi nhanh về API của module khác | Group chat + tag người đó |
| Cross-module change | Tạo issue + tag 2+ người |
| Cần review code | PR vào `develop` |
| Block bởi người khác | Liên hệ trực tiếp + update trên board |

---

## 14. 🎁 BONUS - File khởi tạo nhanh

Tôi sẽ chuẩn bị sẵn cho bạn **bộ file scaffold** để 5 người khởi đầu nhanh:

1. `shared/utils/response.js` - format response chuẩn
2. `shared/utils/asyncHandler.js` - bọc try/catch
3. `shared/middlewares/errorHandler.js` - xử lý lỗi tập trung
4. `shared/middlewares/rbacMiddleware.js` - phân quyền
5. `shared/utils/validation.js` - validator helper
6. `server.js` mới mount tất cả module
7. `shared/routes/index.js` - auto loader

Bạn muốn tôi **generate luôn bộ file scaffold** này vào codebase không?
