# 📊 PHÂN TÍCH TỔNG QUAN DỰ ÁN QUẢN LÝ KHÁCH SẠN (GRAND HORIZON)

> **Đồ án Chuyên Đề Phát Triển Web 1 - Nhóm C** | Hotel Management System (Monorepo Node.js + React)

---

## 1. TỔNG QUAN ĐỀ TÀI & CÔNG NGHỆ

| Hạng mục | Chi tiết |
|---|---|
| **Tên dự án** | Grand Horizon – Hệ thống quản lý khách sạn & khu nghỉ dưỡng 5 sao |
| **Loại dự án** | Đồ án môn học (CDPTW1) – Web fullstack |
| **Kiến trúc** | Monorepo gồm **2 service** + **Database** + **Container hóa** |
| **Backend** | Node.js (Express), Sequelize ORM, JWT Auth, có sẵn lớp Socket.IO nhưng **chưa kết nối trong server.js** |
| **Frontend** | React 18 + Vite + TailwindCSS + React Router v6 |
| **Database** | MySQL 8.0 với **57 bảng** chuẩn hóa |
| **Triển khai** | Docker Compose (mysql + phpmyadmin + backend + frontend) |

---

## 2. CẤU TRÚC THƯ MỤC (Monorepo 2 service)

```
CDPTW1-QuanLyKhachSan/
├── docker-compose.yml          # 4 services: mysql, phpmyadmin, backend, frontend
├── db/init.sql                 # Khởi tạo DB (đơn giản)
├── backend/                    # Node.js + Express + Sequelize
│   ├── src/
│   │   ├── server.js           # Entry point – KHÔNG có Socket.IO
│   │   ├── config/             # db.js (mysql2 pool), sequelize.js, config.js
│   │   ├── models/             # 14 file model + index.js (associations)
│   │   ├── controllers/        # auth, home, roomSearch, auditLog, admin/{menu,fnb}
│   │   ├── routes/             # auth, home, roomSearch, roomTypes, rooms, admin/*
│   │   ├── services/           # searchEngine.js (~600 dòng – Lucene mô phỏng)
│   │   ├── middlewares/        # authMiddleware (JWT), auditMiddleware
│   │   ├── migrations/         # 001_create_all_tables.js (57 bảng)
│   │   ├── seeders/            # seedAll.js (100k records), enrichRooms.js
│   │   ├── sockets/            # socketHandler.js (file rỗng)
│   │   └── constants/          # (rỗng)
│   └── scripts/                # Test scripts
└── frontend/                   # React + Vite + Tailwind
    └── src/
        ├── App.jsx             # Định tuyến SPA
        ├── main.jsx            # React 18 createRoot + StrictMode
        ├── api/                # authApi, hotelApi, roomApi (fetch + safeFetch)
        ├── context/AuthContext # Quản lý JWT + user localStorage
        ├── components/
        │   ├── layout/         # Header (i18n VN/EN), AdminSidebar, Footer, Navbar
        │   └── modals/         # QuickBookingModal, RoomDetailModal
        ├── layouts/            # MainLayout.jsx
        ├── pages/
        │   ├── client/         # Home, RoomService, Profile
        │   ├── admin/
        │   │   ├── menu/       # MenuManagement, MenuForm
        │   │   └── fnb/        # KitchenDisplay (KDS)
        │   ├── Auth.jsx        # Đăng nhập / Đăng ký (Google/Facebook OAuth)
        │   ├── SearchRooms.jsx # Tìm kiếm & đặt phòng (~68KB)
        │   ├── RoomTypeManagement.jsx (~90KB)
        │   ├── RoomManagement.jsx (~64KB)
        │   ├── LoyaltyManagement.jsx (~33KB)
        │   └── AuditLogs.jsx   # Xem audit logs & fraud alerts
        ├── utils/              # loyaltyRules.js, semanticRagSearch.js
        └── data/mockHomeData.js # Mock data fallback ~20KB
```

---

## 3. BACKEND – PHÂN TÍCH CHI TIẾT

### 3.1 Điểm khởi chạy `server.js` (chỉ 44 dòng!)

```js
app.use(cors());
app.use(express.json());
app.get('/', ...);
app.get('/api/health', ...);

// Mount routes:
app.use('/api', homeRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomSearchRoutes);
app.use('/api/loai-phong', roomTypes);   // Tiếng Việt
app.use('/api/phong', rooms);             // Tiếng Việt
app.use('/api/v1', admin/menuRoutes);
app.use('/api/v1/fnb-orders', admin/fnbOrderRoutes);
```

⚠️ **Lưu ý quan trọng:** `server.js` hiện tại **KHÔNG** khởi tạo Socket.IO dù đã có `sockets/socketHandler.js` (file rỗng) và package.json README nhắc tới. Đây là khoảng cách giữa tài liệu và code thực tế.

### 3.2 Kết nối cơ sở dữ liệu (2 cách song song)

| File | Công nghệ | Cách dùng |
|---|---|---|
| `config/db.js` | **mysql2/promise** | Raw SQL, dùng trong `authController.js` |
| `config/sequelize.js` + `config/config.js` | **Sequelize ORM** | Dùng trong `models/`, `roomSearchController`, `menuController`, v.v. |

Đây là **kiến trúc lai (hybrid)** – dự án dùng cả ORM và raw query tùy controller.

### 3.3 Xác thực (Authentication) – `authController.js` (~600 dòng)

**Cơ chế:**
1. **JWT Token** ký với secret `grand_horizon_secret_key_2026_luxury_hotel` (cứng trong middleware, không chỉ lấy từ `.env`).
2. **bcryptjs** hash mật khẩu (10 rounds).
3. **3 luồng đăng nhập:** `register`, `login` (email hoặc phone), `loginGoogle`, `loginFacebook` (OAuth).
4. Token có payload `{ userId, roleId, roleName, email, fullName }`, mặc định hết hạn `7d`.

**Đặc điểm:**
- Dùng `authController.register/login` dùng **raw SQL qua `mysql2/promise`** trong khi model `User.js` lại là Sequelize – **không đồng nhất**.
- Endpoint `GET /api/v1/auth/me` yêu cầu Bearer token → verify với `authMiddleware`.

### 3.4 Tìm kiếm phòng – **Điểm nhấn kỹ thuật của dự án**

`services/searchEngine.js` (~600 dòng) là **engine tìm kiếm mô phỏng Apache Lucene**:

| Thành phần | Mô tả |
|---|---|
| **CharFilter 1: CJKWidthCharFilter** | Chuẩn hóa Full-width ↔ Half-width qua Unicode NFKC |
| **CharFilter 2: ASCIIFoldingCharFilter** | Bỏ dấu tiếng Việt để tìm không dấu |
| **Tokenizer** | Tách theo khoảng trắng & dấu câu |
| **LowercaseFilter** | Chuyển về chữ thường |
| **SynonymGraphFilter** | Từ điển đa ngôn ngữ (Việt–Anh–Nhật) |
| **EdgeNGramFilter** | Tiền tố & cụm con, minGram=2, maxGram=15 |
| **Scoring** | **BM25** (k1=1.2, b=0.75) với Field Boosting |
| **Fuzzy** | Damerau-Levenshtein (chịu lỗi chính tả 1-2 ký tự) |
| **Dual-Mode Adapter** | Có thể fallback sang Elasticsearch/Solr cluster qua env |

`roomSearchController.searchRooms` sử dụng engine này qua các filter:
```
branchId, checkInDate, checkOutDate, totalGuests, keyword,
priceMin, priceMax, roomTypes[], view, amenities[], rating, sortBy
```

Ngoài ra còn có `endpoint /api/v1/rooms/suggest?q=...` cho **autocomplete** như Elasticsearch Suggester.

### 3.5 Audit Log & Fraud Detection (tính năng bảo mật)

`middlewares/auditMiddleware.js`:
- Ghi log **mọi hành động nhạy cảm** (UPDATE_PRICE, DELETE_BILL, ...) bằng cách override `res.send`.
- Lưu `old_values`, `new_values`, `ip_address`, `user_agent`, `reason`.
- **Tự động cảnh báo gian lận:** nếu user thực hiện **≥5 hành động nhạy cảm trong 10 phút** → tạo `FraudAlert` severity = `HIGH`.

`models/AuditLog.js` đặc biệt: có hooks `beforeUpdate` & `beforeDestroy` **throw error** để **không ai xóa/sửa được log**.

### 3.6 Phòng vật lý theo dõi – `routes/rooms.js` (bảng `physical_rooms` riêng)

Đoạn code này **TỰ TẠO BẢNG** `physical_rooms` ở lần chạy đầu nếu chưa có (qua `ensureTable()`), cùng ENUM:
- **buong_phong**: `clean`, `dirty`, `ooo` (Out of Order)
- **luu_tru**: `vacant`, `inhouse`

Kèm **6 actions** cho phép: `clean`, `dirty`, `checkin`, `checkout`, `ooo`, `restore`. Tự động sinh 144 phòng mẫu cho 12 tầng × 12 phòng.

`routes/roomTypes.js` dùng bảng `room_types` (tiếng Việt) – khác hoàn toàn bảng `RoomTypes` Sequelize. **Đây là một điểm bất nhất quán của dự án.**

### 3.7 Các bảng Model Sequelize (14 file)

```
Branch        RoomType     Room          Amenity     Role
MembershipTier User        Booking       Review      MenuCategory
MenuItem      Stay         FoodOrder     FoodOrderDetail  AuditLog  FraudAlert
```

Các **quan hệ** đã setup:
```
Role 1—N User
MembershipTier 1—N User
Branch 1—N Room
RoomType 1—N Room
User 1—N Booking
RoomType 1—N Booking
User 1—N Review
MenuCategory 1—N MenuItem
Booking 1—N Stay
Room 1—N Stay
Stay 1—N FoodOrder
Room 1—N FoodOrder
FoodOrder 1—N FoodOrderDetail
MenuItem 1—N FoodOrderDetail
```

### 3.8 API Endpoints tổng hợp

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/home` | Tổng hợp data trang chủ |
| GET | `/api/branches` | Danh sách chi nhánh |
| GET | `/api/room-types` | Hạng phòng |
| POST | `/api/v1/auth/register` | Đăng ký |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/google` | Google OAuth |
| POST | `/api/v1/auth/facebook` | Facebook OAuth |
| GET | `/api/v1/auth/me` | Lấy user hiện tại |
| PUT | `/api/v1/auth/me` | Cập nhật user |
| GET | `/api/v1/rooms/search` | Tìm kiếm BM25 |
| GET | `/api/v1/rooms/suggest` | Autocomplete |
| GET | `/api/v1/rooms/branches` | Chi nhánh cho filter |
| GET | `/api/v1/rooms/:id` | Chi tiết phòng |
| GET/POST/PUT/DELETE/PATCH | `/api/v1/menu-items` | CRUD menu |
| POST | `/api/v1/fnb-orders` | Tạo order room service |
| GET | `/api/v1/fnb-orders` | Lịch sử order |
| GET | `/api/v1/fnb-orders/kitchen` | KDS bếp |
| PATCH | `/api/v1/fnb-orders/:id/payment` | Thanh toán |
| GET | `/api/audit-logs/logs` | Audit logs |
| GET | `/api/audit-logs/alerts` | Fraud alerts |

---

## 4. DATABASE – 57 BẢNG (xem `001_create_all_tables.js`)

### 4.1 Nhóm chức năng chính

| Nhóm | Bảng tiêu biểu |
|---|---|
| **Người dùng & Phân quyền** | Roles, Permissions, RolePermissions, Users, MembershipTiers, PasswordResetTokens |
| **Lưu trú** | Branches, RoomTypes, Rooms, Amenities, RoomTypeAmenities, PricingRules |
| **Đặt phòng** | Bookings, BookingGuests, Stays, RoomMoveHistory, Vouchers, OTAChannels, OTARoomMappings |
| **Vận hành phòng** | HousekeepingAssignments, MaintenanceTickets, MaintenanceTicketPhotos, LostAndFoundItems, SmartLockLogs |
| **Dịch vụ F&B** | ServiceCategories, Services, ServiceOrders, MenuCategories, MenuItems, RestaurantTables, FoodOrders, FoodOrderDetails, TableReservations |
| **Kho & Minibar** | InventoryItems, InventoryTransactions, MinibarUsages |
| **Tài chính** | Invoices, InvoiceDetails, Payments, CashShifts, NightAuditReports |
| **Đánh giá** | Reviews, ReviewPhotos |
| **Chatbot & Loyalty** | ChatbotKnowledgeBase, ChatbotConversations, ChatbotMessages, LoyaltyPointTransactions |
| **Marketing** | MarketingCampaigns, CampaignRecipients, NewsletterSubscribers |
| **Vận tải & Sự kiện** | Vehicles, ShuttleSchedules, BanquetEvents, StaffSchedules, PoliceDeclarations |
| **Bảo mật & Wishlist** | AuditLogs, Wishlists |

### 4.2 Quy ước đặt tên

- Một số bảng dùng **PascalCase** (`Rooms`, `Users`, `Bookings` – qua Sequelize): migration dùng tên này.
- Một số bảng dùng **snake_case** (`audit_logs`, `fraud_alerts`, `physical_rooms`, `room_types`): tạo raw trong routes.
- **Không đồng nhất** giữa hai schema. Đây là điểm cần cải thiện.

---

## 5. FRONTEND – PHÂN TÍCH CHI TIẾT

### 5.1 Routing (`App.jsx`)

```
/                          → Home (client)
/rooms, /tim-kiem          → SearchRooms
/room-service              → RoomService (F&B)
/profile                   → Profile
/auth, /login, /register   → Auth
/admin                     → redirect /admin/menu
/admin/menu                → MenuManagement
/admin/room-types          → RoomTypeManagement
/admin/rooms               → RoomManagement
/admin/fnb/kitchen         → KitchenDisplay (KDS)
/admin/loyalty             → LoyaltyManagement
*                          → redirect /
```

⚠️ **Không có RouteGuard / PrivateRoute theo role**. Bất kỳ ai cũng vào được `/admin/*`.

### 5.2 AuthContext (`context/AuthContext.jsx`)

- State: `token`, `user`, `isLoading`
- Lưu vào `localStorage` (`hotel_token`, `hotel_user`)
- Tự verify lại user khi reload nhờ `fetchCurrentUser(token)`.
- Nếu token chết → tự `logout`.
- Hỗ trợ: `login`, `register`, `loginGoogle`, `loginFacebook`, `logout`, `updateUser`.

### 5.3 API Layer (`src/api/`)

| File | Cơ chế |
|---|---|
| `authApi.js` | `safeFetch` tự **fallback** giữa proxy `/api` và `http://localhost:5000/api`. Có `loginUser`, `registerUser`, `fetchCurrentUser`, `loginWithGoogle/Facebook`, `updateCurrentUser`. |
| `hotelApi.js` | `fetchHomeData`, `fetchBranches`, `fetchRoomTypes` – gọi `/api/home`, `/api/branches`, `/api/room-types`. |
| `roomApi.js` | `searchRoomsApi`, `getBranchesApi`, `getRoomDetailApi`, `suggestRoomsApi`. |

Không dùng **Axios** như README ghi – thực tế là dùng `fetch` thuần.

### 5.4 Các trang chính

| Trang | Chức năng |
|---|---|
| **Home** (~54KB) | Hero, chi nhánh, phòng nổi bật, tiện nghi, review, CTA đặt phòng – dùng mockHomeData nếu API lỗi |
| **SearchRooms** (~68KB) | Tìm kiếm nâng cao với filters, gợi ý autocomplete (BM25), modal chi tiết & đặt nhanh |
| **Auth** (~40KB) | Đăng nhập/Đăng ký, có nút chọn nhanh vai trò test, OAuth Google/Facebook |
| **Profile** (~37KB) | Hồ sơ cá nhân + Loyalty tier |
| **RoomService** (~47KB) | Đặt món tại phòng (Room Service F&B) |
| **MenuManagement** (~34KB) | CRUD món ăn (filter + search) |
| **MenuForm** | Form thêm/sửa món với validation đầy đủ |
| **KitchenDisplay** | Màn hình KDS bếp (realtime – **chưa dùng socket**) |
| **RoomTypeManagement** (~90KB) | CRUD hạng phòng |
| **RoomManagement** (~64KB) | Quản lý phòng vật lý (sơ đồ phòng) |
| **LoyaltyManagement** (~33KB) | Quản lý điểm thưởng, tier, campaign |
| **AuditLogs** | Xem log kiểm toán & cảnh báo gian lận |

### 5.5 Layout & Header

`components/layout/Header.jsx` (~25KB):
- **Navbar luxury** với hiệu ứng cuộn (show/hide khi scroll).
- **Wishlist counter** lưu trong localStorage.
- **Language switcher VN/EN** với vector SVG cờ.
- Tích hợp `useAuth()` để hiển thị nút Login/User profile.

`components/layout/AdminSidebar.jsx` (~5KB): menu quản trị với navigation đến 5 module admin.

### 5.6 Constants về Roles (cho test nhanh)

Từ README – dự án có **5 tài khoản test** với mật khẩu `123456`:
- `user_1@hoteldomain.vn` (Admin)
- `user_2@hoteldomain.vn` (Receptionist)
- `user_3@hoteldomain.vn` (Kitchen)
- `user_4@hoteldomain.vn` (Housekeeping)
- `user_5@hoteldomain.vn` (Guest)

---

## 6. TÍNH NĂNG ĐẶC BIỆT ĐÁNG CHÚ Ý

### 6.1 Audit Log & Fraud Detection 🛡️
- `auditMiddleware` ghi log tự động với override `res.send`.
- `AuditLog` model có **hooks chặn update/delete** – log là bất biến.
- Tự động tạo `FraudAlert` khi phát hiện **≥5 hành động nhạy cảm/10 phút**.

### 6.2 Enterprise Search Engine 🔍
- Mô phỏng stack **Apache Lucene / Elasticsearch** trong JS thuần (~600 dòng).
- Hỗ trợ **tiếng Việt** (bỏ dấu) + đa ngôn ngữ đồng nghĩa.
- **BM25 scoring** với field boosting.

### 6.3 Seeding tốc độ cao 🚀
- `seedAll.js` chèn **100.000 records** qua chunk 5.000/lần.
- Tắt `FOREIGN_KEY_CHECKS` để tăng tốc gấp 50×.

### 6.4 Mock Fallback 🎯
- FE có `mockHomeData.js` (~20KB) fallback khi API lỗi.
- FE `safeFetch` tự đổi giữa relative `/api` và `localhost:5000`.

### 6.5 Auto-migrate self-healing schema 🩹
- `routes/rooms.js` tự tạo bảng `physical_rooms` nếu chưa có.
- `roomTypes.js` thao tác trên bảng `room_types` tự phát sinh.

---

## 7. CÁC VẤN ĐỀ BẤT NHẤT QUÁN CẦN BIẾT

| # | Vấn đề | Vị trí |
|---|---|---|
| 1 | **Socket.IO không kết nối** trong `server.js` | Đã có `sockets/socketHandler.js` rỗng nhưng server không dùng |
| 2 | **Không đồng nhất ORM vs raw SQL** | `authController` dùng mysql2 trực tiếp, các controller khác dùng Sequelize |
| 3 | **Hai schema song song** | `RoomTypes/Rooms` (Sequelize) + `room_types/physical_rooms` (raw) |
| 4 | **README không khớp thực tế** | README nói dùng Axios, Socket.IO, RBAC – code thực tế không có |
| 5 | **Không có RouteGuard theo role** | Bất kỳ ai cũng truy cập `/admin/*` |
| 6 | **`postcss.config.js` & `tailwind.config.js`** nhưng FE package.json chưa có postcss/autoprefixer | Có thể là dev deps chưa được install đúng |
| 7 | **Frontend không có `@tailwindcss` processing** rõ ràng | `index.css` cần check |
| 8 | **`Auth.jsx` lên tới 40KB** – component đăng nhập khá phức tạp | |
| 9 | **`SocketContext` được nhắc trong README** nhưng không có file đó | |
| 10 | **Thư mục `constants/` rỗng** – chưa có file constant nào | |
| 11 | **Nginx config rỗng** (0 bytes) cho frontend Docker | |

---

## 8. LƯU ĐỒ LUỒNG NGHIỆP VỤ CHÍNH

### 8.1 Khách đặt phòng
```
[Khách] → Trang chủ → Tìm phòng (/rooms) → Chọn chi nhánh + ngày
       → searchRoomsApi (gọi BM25 search) → Trả kết quả + điểm relevance
       → Click phòng → RoomDetailModal → QuickBookingModal
       → Tạo Booking → JWT check → Lưu DB → ConfirmationCode + QR
```

### 8.2 Nhân viên thao tác nhạy cảm
```
[Nhân viên] → Gọi API có auditMiddleware(action, entityName)
           → Xử lý thành công → Override res.send
           → Tạo AuditLog(old, new, ip, user_agent)
           → Nếu user có ≥5 sensitive actions /10 phút → Tạo FraudAlert(severity=HIGH)
```

### 8.3 Đặt món Room Service
```
[Khách] → /room-service → Chọn món (MenuItems) → Tạo order
       → fnbOrderController.createRoomServiceOrder
       → Validate StayId + RoomId (phải Active)
       → Kiểm tra từng MenuItem còn Available
       → Tính totalAmount → Tạo FoodOrder (Pending) → Tạo FoodOrderDetail
       → Kitchen nhận (KDS màn hình bếp) → Update Status: Preparing → Ready → Delivered
```

---

## 9. CÁCH CHẠY DỰ ÁN NHANH

### Cách 1: Docker (khuyên dùng – README)
```bash
cd D:\CDPTW1-QuanLyKhachSan
docker compose up -d --build
# Truy cập: FE:  http://localhost:3000
#           API:  http://localhost:5000/api/health
#           DB:   http://localhost:8080 (phpMyAdmin)
```

### Cách 2: Local
```bash
cd backend
npm install
npm run migrate   # chạy 001_create_all_tables.js (57 bảng)
npm run seed      # nạp 100k menu items (hoặc --count=1000)
npm run dev       # nodemon port 5000

cd frontend
npm install
npm run dev       # vite port 3000 (đã override Vite config)
```

---

## 10. KẾT LUẬN & GỢI Ý HỌC TẬP

### Điểm mạnh
- **Kiến trúc MVC rõ ràng** (controllers/, models/, routes/).
- **Search engine mô phỏng Lucene** ấn tượng – phù hợp đồ án chuyên đề.
- **Audit log với fraud detection** thể hiện tư duy bảo mật tốt.
- **Hệ thống bảng phong phú 57 bảng** chuẩn hóa theo ca sử dụng thực tế khách sạn.
- **Docker compose 4 service** giúp chạy thử nghiệm nhanh.

### Điểm cần cải thiện (nếu có thời gian)
1. **Tích hợp Socket.IO** thực sự cho KDS realtime + notification.
2. **Đồng nhất schema** – dùng Sequelize toàn bộ hoặc raw SQL toàn bộ.
3. **Thêm PrivateRoute** cho từng role (Admin/Receptionist/Kitchen/Housekeeping).
4. **Bổ sung RBAC middleware** thực sự (đã có auditMiddleware nhưng chưa có rbac).
5. **Move JWT_SECRET** từ hardcode ra `.env`.
6. **Tách `AuditLog` thành schema riêng** (DB riêng cho log) vì dữ liệu sẽ rất lớn.
7. **Test room_types vs RoomTypes bất nhất quán** – chọn 1 chiến lược.

### Nếu bạn mới đọc codebase, nên đi theo thứ tự:
1. `README.md` → hiểu bức tranh lớn.
2. `docker-compose.yml` → hiểu các service.
3. `backend/src/server.js` → hiểu routing.
4. `backend/src/models/index.js` → hiểu các quan hệ dữ liệu.
5. `backend/src/migrations/001_create_all_tables.js` → hiểu schema 57 bảng.
6. `frontend/src/App.jsx` → hiểu luồng trang.
7. `frontend/src/context/AuthContext.jsx` → hiểu auth flow.
8. `backend/src/services/searchEngine.js` → tính năng "ăn điểm" nhất.

---

*📝 Phân tích được tạo tự động bằng cách đọc codebase theo kiến trúc top-down từ README → server.js → models → routes → controllers → frontend.*
