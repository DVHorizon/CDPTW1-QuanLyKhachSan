# 🤖 BỘ PROMPT CHO ANTIGRAVITY IDE - DỰ ÁN GRAND HORIZON HOTEL

> 4 phiên bản prompt được thiết kế riêng cho dự án Quản Lý Khách Sạn. Copy và sử dụng trực tiếp.

---

## 📋 PROMPT 1 — TỔNG QUAN (Dùng khi bắt đầu phiên mới)

```
Bạn là một kiến trúc sư phần mềm cao cấp (Senior Software Architect) với chuyên môn về:
- Node.js/Express, React 18, MySQL, Docker
- Kiến trúc MVC, ORM Sequelize, JWT Authentication
- Hệ thống khách sạn, đặt phòng, F&B, thanh toán

Tôi đang phát triển đồ án "Hệ thống Quản lý Khách sạn Grand Horizon" (mã: CDPTW1-QuanLyKhachSan).

**Tech stack thực tế:**
- Backend: Node.js + Express + Sequelize ORM + mysql2/promise (hybrid)
- Frontend: React 18 + Vite + TailwindCSS + React Router v6 + fetch API
- DB: MySQL 8.0 với 57 bảng (qua Sequelize Migration)
- Auth: JWT + bcryptjs
- Real-time: Socket.IO (chưa kết nối)
- Container: Docker Compose (mysql:8.0, phpmyadmin, backend, frontend)
- Search: Một search engine mô phỏng Apache Lucene (BM25 + CharFilter)

**Cấu trúc:**
```
backend/src/
├── server.js (44 dòng, không dùng Socket.IO)
├── config/{db,sequelize,config}.js
├── models/ (14 file: User, Role, Room, RoomType, Booking, Stay, FoodOrder...)
├── controllers/ (auth, home, roomSearch, auditLog, admin/{menu,fnb})
├── routes/ (auth, home, roomSearch, roomTypes, rooms, auditLog, admin/*)
├── services/searchEngine.js (~600 dòng, mô phỏng Lucene)
├── middlewares/ (authMiddleware JWT, auditMiddleware)
├── migrations/001_create_all_tables.js (57 bảng)
├── seeders/{seedAll.js, enrichRooms.js}
└── sockets/socketHandler.js (file RỖNG)

frontend/src/
├── App.jsx (Router với 12 routes)
├── api/{authApi, hotelApi, roomApi}.js (dùng fetch, có safeFetch fallback)
├── context/AuthContext.jsx (JWT + localStorage)
├── components/{layout, modals, admin}
├── pages/{client, admin, Auth.jsx, SearchRooms.jsx, RoomTypeManagement.jsx (90KB!), RoomManagement.jsx, LoyaltyManagement.jsx, AuditLogs.jsx}
├── utils/{loyaltyRules, semanticRagSearch}.js
└── data/mockHomeData.js (fallback khi API lỗi)
```

**Các điểm bất nhất/tôi cần bạn xem xét (đã tự rà soát):**
1. Socket.IO chưa kết nối vào server.js dù có socketHandler.js rỗng
2. Không có RBAC middleware, mọi API nhạy cảm không có auth
3. 3 fnbOrderController trả về data:[] stub (getOrderHistory, getKitchenOrders, processPayment)
4. Hai schema song song: Rooms/RoomTypes (Sequelize) vs physical_rooms/room_types (raw SQL)
5. seedAll.js chỉ seed 1/57 bảng (chỉ MenuItem)
6. JWT_SECRET hardcode 'grand_horizon_secret_key_2026_luxury_hotel'
7. Frontend RoomTypeManagement.jsx 90KB đơn thân, không tách component
8. Không có test, CI/CD, error handler global, rate limit
9. Có TODO/FIXME trong code production (menuController.js:178)

**Tôi cần bạn:**
1. Đọc kỹ codebase (chạy Glob/Grep/Read trên các file chính)
2. Đưa ra PHẢN HỒI ƯU TIÊN 3 MỨC:
   - **P0 (Ngay lập tức):** Bug nghiêm trọng / security hole / logic sai
   - **P1 (Trước khi demo):** Thiếu chức năng / UX hỏng / performance kém
   - **P2 (Refactor sau):** Clean code, tách component, thêm test
3. Với mỗi vấn đề: chỉ rõ FILE:DÒNG, nguyên nhân gốc, và ĐOẠN CODE FIX ĐỀ XUẤT (đầy đủ, không pseudo-code)
4. Thứ tự giải quyết nên như thế nào để không vỡ các phần đang chạy
5. Có cần thiết kế lại phần nào không, nếu có thì kiến trúc đề xuất cụ thể ra sao

Trả lời bằng tiếng Việt, dùng prose rõ ràng với heading theo cấu trúc. Tránh liệt kê bullet dài lê thê — tập trung vào actionable advice.
```

---

## 📋 PROMPT 2 — KIỂM TRA BẢO MẬT & RACE CONDITION (Security Review)

```
Bạn là chuyên gia bảo mật ứng dụng web (Application Security Specialist).

Hãy audit toàn bộ dự án Quản lý Khách sạn Grand Horizon trong thư mục D:\CDPTW1-QuanLyKhachSan.

**Stack:**
- Backend: Node.js + Express + Sequelize ORM + JWT
- DB: MySQL 8.0 (57 bảng)
- Auth: JWT trong Authorization: Bearer header

**Checklist phải đánh giá (mỗi mục cho điểm 1-10 + bằng chứng FILE:DÒNG):**

1. **Authentication & Authorization:**
   - Có route nào không có verifyToken middleware không?
   - Có RBAC (phân quyền theo Role) cho Admin/Reception/Kitchen/Housekeeping/Guest không?
   - JWT_SECRET có bị hardcode không?
   - Password hash có dùng bcrypt đúng cách không? Salt rounds?
   - Có token expiration hợp lý không? Có refresh token không?

2. **SQL Injection:**
   - Tất cả query đều dùng parameterized queries (?, :placeholder) hay có string concatenation nào không?
   - Kiểm tra cả Sequelize raw queries và mysql2 queries

3. **Input Validation:**
   - File upload path có được kiểm tra không? (MaintenanceTicketPhotos, ReviewPhotos)
   - SĐT, email, ID number có validate đúng format không?
   - User input length có bound không? (Description 1000 chars, etc.)

4. **IDOR (Insecure Direct Object Reference):**
   - Khi user truy cập /bookings/:id, /users/:id có check ownership không?
   - Cập nhật/xóa các entity có ai cũng làm được không?

5. **Rate Limiting & DoS:**
   - /auth/login có rate limit không?
   - bulk insert routes (/phong/hang-loat, /phong/khoa-tang) có giới hạn số lượng không?

6. **Sensitive Data Exposure:**
   - PasswordHash có lộ trong API response không?
   - AuditLog có chứa password/PII không?
   - Logs có thể lộ token không?

7. **CORS:**
   - cors() wildcard hay whitelist?
   - credentials có được truyền đúng cách không?

8. **Audit & Fraud Detection:**
   - auditMiddleware có bypass được không?
   - AuditLog có chống update/delete (hooks) không?
   - Fraud threshold có phù hợp không?

9. **Dependency vulnerabilities:**
   - Chạy `npm audit` trong backend và frontend, list các CVE nghiêm trọng

10. **Production secrets:**
    - Có file .env nào bị commit không?
    - MYSQL_ALLOW_EMPTY_PASSWORD="yes" trong docker-compose có hợp lý cho prod không?

OUTPUT dạng bảng markdown:

| # | Lỗ hổng | File | Dòng | Mức độ (CVSS) | Đề xuất fix |

Sau bảng, đưa ra TOP 3 vấn đề nguy hiểm nhất cần fix ngay với code patch cụ thể (copy-paste được).
```

---

## 📋 PROMPT 3 — TỐI ƯU HIỆU NĂNG (Performance)

```
Bạn là Performance Engineer chuyên về Node.js backend và React frontend.

Dự án: Hệ thống Quản lý Khách sạn Grand Horizon
- Backend: Node.js + Express + Sequelize với 14 model
- Frontend: React 18 + Vite (chưa có Suspense/lazy)
- DB: MySQL 8.0 có 57 bảng, có 1 bảng sẽ có 100.000 records (MenuItems)
- Search engine mô phỏng Lucene (BM25) trong services/searchEngine.js

**Hãy tìm và phân tích:**

1. **Backend Bottlenecks:**
   - Có N+1 query ở đâu không? (Ví dụ: include trong vòng lặp)
   - Bulk operations có dùng bulkCreate / bulkInsert đúng không?
   - Sequelize có tắt logging không? Có dùng connection pooling đúng chưa?
   - searchEngine.js có xử lý được dataset lớn không? (O(n²) complexity?)

2. **Database:**
   - Index nào cần có mà chưa có? (Branch, RoomNumber, Booking.UserId, FoodOrder.StayId...)
   - Có query nào full-table-scan không?
   - Migration có tạo FOREIGN KEY index không?
   - Bảng nào nên được denormalized (read-heavy)?

3. **Frontend Performance:**
   - RoomTypeManagement.jsx (90KB) — render có memo hóa không?
   - Có list nào render > 1000 items mà không virtualize không?
   - Bundle size có phân tích được không? (npm run build --report)
   - Có thể dùng React.lazy() + Suspense cho Admin pages không?

4. **Network & API:**
   - Có N+1 request liên tiếp không? (gọi API song song bằng Promise.all hay tuần tự?)
   - Response payload có quá lớn không? Có cần pagination không?
   - Có cache strategy không? (Redis, ETags, in-memory LRU)

5. **Real-time & Streaming:**
   - KitchenDisplay nên nhận push qua Socket.IO (chưa implement) — khi nào nên implement?
   - Long polling vs WebSocket trade-off

**OUTPUT format:**

### Bảng 1: Top 5 bottleneck (Impact: High/Medium/Low)
| Hotspot | File:Dòng | Ảnh hưởng | Đề xuất tối ưu | Code patch |

### Bảng 2: Index cần tạo
```sql
CREATE INDEX ... ON ...; -- với benchmark dự kiến
```

### Bảng 3: Frontend micro-optimization
| Page | Issue | Fix đề xuất | Effort (h) |

### Bảng 4: 3 thay đổi lớn có ROI cao nhất
- Refactor gì → tiết kiệm bao nhiêu ms/latency/memory
```

---

## 📋 PROMPT 4 — FIX REALTIME KDS (Implementation Sprint)

```
Bạn là Full-stack Engineer giỏi Socket.IO và React realtime patterns.

BỐI CẢNH:
Dự án Quản lý Khách sạn Grand Horizon. Tính năng "Kitchen Display System (KDS)" hiện ĐANG HỎNG vì:
- File backend/src/sockets/socketHandler.js rỗng (0 bytes)
- server.js không kết nối socket.io
- fnbOrderController.getKitchenOrders() trả về data:[] (stub)
- Frontend pages/admin/fnb/KitchenDisplay.jsx (~5KB) đang poll hoặc không có data

NGHIỆP VỤ CẦN LÀM:
1. Khách gọi món → POST /api/v1/fnb-orders/ → Lưu DB → Phát socket event tới bếp
2. Bếp click "Bắt đầu nấu" → PATCH /api/v1/fnb-orders/:id/status → Phát socket event update
3. Bếp click "Hoàn tất" → PATCH status → Phát socket "Sẵn sàng phục vụ"
4. Frontend KitchenDisplay tự động cập nhật không cần F5

YÊU CẦU TRIỂN KHAI:

### Bước 1: Backend Socket.IO Setup
Viết file backend/src/sockets/socketHandler.js đầy đủ:
- Khởi tạo Socket.IO server
- Middleware xác thực JWT cho socket connection
- Namespace `/kitchen` riêng cho staff bếp
- Event `order:new`, `order:status`
- Cleanup khi disconnect

### Bước 2: Tích hợp vào server.js
- Sửa server.js để attach Socket.IO instance vào HTTP server
- Truyền socket instance cho controller qua cách nào? (global.io? request.app.get('io')?)

### Bước 3: Sửa fnbOrderController
- getOrderHistory: query thực sự, có filter theo StayId, status, date range
- getKitchenOrders: query các order status Pending/Preparing
- processPayment: tạo record Payments, update Invoice
- Mỗi action emit socket event

### Bước 4: Frontend KitchenDisplay.jsx
- Tạo SocketContext riêng (src/context/SocketContext.jsx)
- Connect tới namespace /kitchen với JWT
- Hiển thị danh sách order realtime với TailwindCSS
- Nút "Bắt đầu" / "Hoàn tất" gọi API PATCH

### Bước 5: Test thủ công
- Spin 2 browser: 1 làm khách (gọi món), 1 làm bếp (xem có nhận không)
- Verify không cần F5

**OUTPUT:**
- Từng file hoàn chỉnh, copy-paste được (không pseudo-code)
- Giải thích trade-off cho mỗi lựa chọn kiến trúc
- Test script để verify
- Checklist go-live (cần config gì, env vars, etc.)
```

---

## 🎯 CÁCH SỬ DỤNG

| Bạn muốn | Dùng Prompt |
|---|---|
| Bắt đầu phiên mới, muốn AI review tổng quan | **Prompt 1** |
| Audit bảo mật chuyên sâu | **Prompt 2** |
| Tối ưu performance khi demo bị lag | **Prompt 3** |
| Fix 1 tính năng cụ thể (KDS, Auth, etc.) | **Prompt 4** |

## 💡 MẸO KHI DÙNG

1. **Luôn đính kèm context**: nói rõ "đây là đồ án Nhóm C, deadline X, cần demo Y"
2. **Sau khi AI trả lời**, hỏi tiếp: "Phần nào cần làm trước để không vỡ phần khác?"
3. **Yêu cầu cụ thể**: thay vì "fix hết", nói "fix P0 trước, viết test cho auth flow"
4. **Đính kèm file đã đọc** để AI tiết kiệm thời gian globbing

## ⚡ BONUS PROMPT — Dành cho bug cụ thể

```
Tôi đang gặp bug: [MÔ TẢ NGẮN]
- Steps để reproduce: ...
- Expected: ...
- Actual: ...
- File liên quan: [FILE]

Hãy:
1. Đọc file đó và 2-3 file liên quan (cùng module)
2. Tìm root cause không phải symptom
3. Đề xuất fix (đoạn code đầy đủ)
4. Đề xuất test case để prevent regression
5. Nếu có approach thay thế tốt hơn, nêu rõ trade-off
```
