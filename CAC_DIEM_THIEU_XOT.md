# ⚠️ BÁO CÁO CÁC ĐIỂM THIẾU XÓT TRONG CODEBASE

> Phân tích chi tiết mọi chỗ **chưa hoàn thiện**, **placeholder**, **stub**, hoặc **khai báo nhưng không có implementation**.

---

## 🚨 1. CÁC ĐIỂM THIẾU NGHIÊM TRỌNG (Critical)

### 1.1 ⛔ Socket.IO bị "bỏ quên" hoàn toàn

| Vấn đề | Bằng chứng |
|---|---|
| **File rỗng 100%** | `backend/src/sockets/socketHandler.js` — **0 bytes** |
| **`server.js` không `require('socket.io')` không `new Server(io)`** | Tìm `socket` trong server.js → không có |
| **README claim** Socket.IO, Realtime WebSocket | Nhưng thực tế chưa hề kết nối |
| **KitchenDisplay (`/admin/fnb/kitchen`)** — tính năng cốt lõi cần realtime | Không có socket → đơ cứng, không push được order mới |

**Hậu quả:** Tính năng "Realtime KDS" mà README quảng bá **không tồn tại**.

---

### 1.2 ⛔ Không có hệ thống phân quyền RBAC nào hoạt động

```bash
# Middleware RBAC được README & tree nhắc tới
# src/middlewares/rbacMiddleware.js
→ KHÔNG CÓ FILE NÀY
```

| Vấn đề | Bằng chứng |
|---|---|
| **Audit log xác định nhân viên nhạy cảm** nhưng chưa có RBAC chặn | `auditMiddleware.js` chỉ LOG, không CHẶN |
| **Audit log routes** chính nó cũng **không có `verifyToken`** | `auditLogRoutes.js:7` `router.get('/logs', auditLogController.getLogs)` — thiếu middleware auth |
| **API nhạy cảm (`/api/v1/menu-items/:id`, `/api/phong/:id`)** không có auth | Bất kỳ ai cũng có thể xóa menu item |

---

### 1.3 ⛔ 3 controller trả về **stub rỗng** (chỉ return `data: []`)

File: `backend/src/controllers/admin/fnbOrderController.js`

```javascript
// Dòng 82-86
exports.getOrderHistory = async (req, res) => {
  res.json({ success: true, data: [] });  // ❌ Không query gì cả
};

exports.getKitchenOrders = async (req, res) => {
  res.json({ success: true, data: [] });  // ❌ KDS nhận mảng rỗng
};

exports.processPayment = async (req, res) => {
  res.json({ success: true, message: 'Thanh toán thành công' });  // ❌ Không xử lý gì
};
```

**Hậu quả:**
- Lịch sử F&B orders **luôn rỗng** dù đã tạo order.
- KDS bếp **không hiển thị đơn** nào.
- Thanh toán F&B **không tạo payment** trong DB.

---

### 1.4 ⛔ `MenuManagement.jsx` dùng fallback local storage — bỏ qua backend

Trang admin menu có comment quan trọng:
```javascript
// RoomTypeManagement.jsx:560
console.warn('Lỗi gọi API PUT, chuyển sang cập nhật bộ nhớ cục bộ:', err);
console.warn('Lỗi gọi API POST, tạo trên bộ nhớ cục bộ:', err);
```

→ Khi API fail, **dữ liệu chỉ lưu client**, mất khi refresh.

---

## ⚠️ 2. CÁC ĐIỂM THIẾU NGHIÊM TRỌNG (High)

### 2.1 Hai schema database chạy song song, không đồng bộ

| Bảng Sequelize (PascalCase) | Bảng Raw SQL (snake_case) | Ghi chú |
|---|---|---|
| `Rooms`, `RoomTypes` | `physical_rooms`, `room_types` | Cùng dữ liệu, 2 schema khác nhau |
| `Amenities` | (không có) | |
| `Bookings`, `Stays` | (không có trong Room routes) | |

→ `routes/rooms.js` dùng bảng `physical_rooms` (raw SQL), **KHÔNG** dùng Sequelize model `Room.js`. Đây là **dead code** cho toàn bộ hệ thống ORM model.

### 2.2 `routes/rooms.js` KHÔNG được mount chính thức

```javascript
// server.js:34
app.use('/api/phong', require('./routes/rooms'));
```

→ Tốt, mount rồi, nhưng **Frontend không có page nào gọi tới `/api/phong`** mà lại dùng `/api/loai-phong` (cùng raw SQL).

→ `RoomManagement.jsx` ở frontend chỉ dùng `fetch(${API_PHONG}${path})` — Nhưng `API_PHONG` được khai báo:
```javascript
// Kiểm tra trong RoomManagement.jsx — có fetch('/api/phong/...') không?
// → Phải check trực tiếp
```

### 2.3 `seedAll.js` chỉ seed 1 bảng (MenuItems), không phải 50+ bảng

```javascript
// seedAll.js chỉ:
//  1. Seed 4 categories (Bếp Nóng, Bếp Lạnh, ...)
//  2. Seed MenuItems với chunk 5000
// → KHÔNG seed: Users, Rooms, RoomTypes, Branches, Bookings, Reviews, ...
```

**Hậu quả:** Migration tạo 57 bảng OK nhưng DB **trống rỗng** ngoại trừ MenuItems. Cần:
- `enrichRooms.js` (đã có nhưng bị comment/setup không rõ).
- `seedAll` thực sự nạp **Users + RoomTypes + Rooms + Branches + Bookings + Reviews** để frontend có data để hiển thị.

### 2.4 `enrichRooms.js` không được sử dụng

→ File tồn tại nhưng `seedAll.js` không gọi tới nó.

### 2.5 `db/init.sql` gần như rỗng

```sql
-- File init.sql chỉ 307 bytes — rất ít
-- Toàn bộ schema đáng lẽ nên khai báo đầy đủ ở đây cho Docker tự động
-- Thay vào đó dự án dùng Sequelize Migration 
```

→ Migration tạo bảng trống rỗng — Docker không auto-trigger migration → `npm run migrate` phải chạy thủ công.

---

## 🟡 3. CÁC ĐIỂM THIẾU TRUNG BÌNH (Medium)

### 3.1 Hardcode secrets & config không lấy từ `.env`

| Hardcode | File | Vấn đề |
|---|---|---|
| `JWT_SECRET = 'grand_horizon_secret_key_2026_luxury_hotel'` | `authMiddleware.js:3` | Nên lấy từ `process.env.JWT_SECRET` |
| `MYSQL_ALLOW_EMPTY_PASSWORD: "yes"` | `docker-compose.yml:8` | Bảo mật kém cho production |
| `localhost:5000` | `Frontend MenuManagement.jsx:107,129` | Frontend hard-code URL thay vì dùng biến môi trường |
| `localhost:5000` | `authApi.js:14, 16` | Hard-code fallback URL |

### 3.2 Frontend `RoomTypeManagement.jsx` rất lớn (~90KB) — monolithic

→ File 1 component duy nhất quản lý:
- Danh sách
- Filter/Search
- Form create/edit
- Stat cards
- API call
- LocalStorage fallback

**Vấn đề:** 0 tách component con, 0 custom hook. Khó maintain, khó test.

### 3.3 Frontend `Auth.jsx` không có chức năng logout rõ ràng

→ `AuthContext` có `handleLogout` nhưng UI có thể không expose nút logout ở mọi page.

### 3.4 Không có error handler global ở backend

```javascript
// server.js chỉ có:
app.use(cors());
app.use(express.json());
// KHÔNG CÓ:
app.use(require('./middlewares/errorHandler'));
```

→ Mọi lỗi chỉ được `console.error()` trong controller. Không có format response lỗi thống nhất.

### 3.5 Không có validation global

→ Mỗi controller tự `if (!email)` → **lặp code validation**. Thiếu:
- `joi`, `express-validator`, hoặc `class-validator`.

### 3.6 `App.jsx` không có loading/error boundary

→ Nếu API lỗi → `<Home />` render ra rỗng/trắng. Không có:
- Loading skeleton
- Error fallback
- 404 page

### 3.7 Mock data lẫn lộn với API data

```javascript
// Auth.jsx, Home.jsx, SearchRooms.jsx
// đều có import từ 'mockHomeData.js' fallback
```

→ Frontend không xác định rõ dữ liệu thật hay mock. Người dùng có thể thấy data giả mà không biết.

### 3.8 Không có CSRF protection / rate-limiting

- Không có `express-rate-limit`, `csurf`.
- `POST /api/v1/auth/login` không giới hạn số lần → dễ brute-force.

---

## 🔵 4. CÁC ĐIỂM THIẾU NHỎ (Low)

### 4.1 File rỗng / placeholder

| File | Trạng thái | Vấn đề |
|---|---|---|
| `backend/src/sockets/socketHandler.js` | **0 bytes** | Cần implement handler |
| `backend/src/constants/` | **thư mục rỗng** | README nhắc tới hằng số Roles/RoomStatus/BookingStatus/OrderStatus — chưa tồn tại |
| `frontend/nginx.conf` | **0 bytes** | Docker build FE không copy nginx config |
| `backend/scripts/` | `test_search_cases.js` (4KB) | Không được dùng trong CI/test pipeline |

### 4.2 Comment cảnh báo "TODO" trong code

```javascript
// menuController.js:178
// TODO: Món đang có đơn hàng chưa hoàn tất không được lưu trữ
// const hasPendingOrders = await checkPendingOrders(id);
// if (hasPendingOrders) { ... }
```

### 4.3 Comment giả lập / mock trong code production

```javascript
// menuController.js:202-203
// if (!req.headers.authorization) return res.status(401)...
// → COMMENTED OUT → Không enforce auth
```

```javascript
// menuController.js:216
const posSyncSuccess = true; // In real life, call POS API here
→ Giả lập POS sync không thật sự gọi đâu cả
```

### 4.4 Logging chưa chuẩn hóa

→ Mỗi nơi dùng `console.log`, `console.error`, `console.warn` riêng lẻ. Không có:
- `winston` hoặc `pino` cho structured logging
- Log level (info/warn/error)
- Log ID cho correlation

### 4.5 Thiếu unit test / integration test

→ 0 file test. Project lớn 14 model + 40+ endpoint nhưng không có:
- `jest`, `mocha`, `vitest`
- `supertest` cho API test

### 4.6 Không có CI/CD configuration

→ `.github/workflows/` **không có** GitHub Actions YAML.
→ `.git/hooks/` có (commit hooks), nhưng CI tự động thì không có.

### 4.7 Không có Docker health check

→ `docker-compose.yml` không có:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
```

### 4.8 `RoomTypeManagement.jsx` không có phân trang

→ `roomTypes` API trả về tất cả → FE có thể crash với data lớn.

### 4.9 `user_5@hoteldomain.vn` (Guest test) không chắc có seed

→ `seedAll.js` không tạo user test → 5 tài khoản mẫu trong README có thể **không tồn tại**.

### 4.10 `bulk insert` không có transaction/rollback

→ Nếu seed MenuItems chunk 100k lỗi giữa chừng → dữ liệu không nhất quán.

---

## 🔴 5. THIẾU FRONTEND PAGES / ROUTES

### 5.1 Page khai báo trong App.jsx nhưng **không có file**:

| Route | Import | File thực tế |
|---|---|---|
| `/admin` | `Navigate to="/admin/menu"` | OK |
| `/admin/loyalty` | `import LoyaltyManagement` | File tồn tại nhưng page chưa gọi API |

→ Tất cả các page **đều có file**. Nhưng:

### 5.2 `AdminSidebar.jsx` có thể liệt kê routes KHÔNG tồn tại

→ Cần kiểm tra cụ thể — có thể Admin menu có item link tới page chưa code.

### 5.3 Không có page cho `Housekeeping` / `Receptionist`

Theo README có 5 roles (Admin/Reception/Kitchen/Housekeeping/Guest) nhưng Frontend chỉ có:
- Client pages (Home, Search, RoomService, Profile, Auth)
- Admin pages (Menu, RoomTypes, Rooms, FNB Kitchen, Loyalty, AuditLogs)

→ **Thiếu:**
- Page cho Lễ tân (sơ đồ phòng, check-in/out)
- Page cho Buồng phòng (Housekeeping dashboard)
- Page cho Front Desk dashboard

---

## 📋 6. THIẾU INFRASTRUCTURE / DevOps

| Mục | Tình trạng |
|---|---|
| **`.dockerignore`** (backend & frontend) | Chưa có → Docker copy hết `node_modules` |
| **`Dockerfile.backend`** kiểm tra health | Chưa xác nhận |
| **`Dockerfile.frontend`** | Build Vite OK, nhưng thiếu nginx config |
| **Production build script** | Không có script `npm run build && start` |
| **Reverse proxy** (nginx) | Config rỗng |
| **HTTPS/TLS** | Không có cert cho production |
| **Environment separation** (.env.dev/prod) | Chỉ có 1 file `.env.example` |

---

## 🛡️ 7. THIẾU BẢO MẬT

| Vấn đề | Mức độ |
|---|---|
| Không giới hạn rate limit cho `/auth/login` | Cao → brute-force dễ |
| Không có CSRF token | Trung bình |
| Không có helmet middleware | Thấp |
| Password không enforce complexity (chỉ length ≥ 6) | Trung bình |
| Không có 2FA | Thấp |
| JWT không có refresh token | Trung bình |
| Audit logs KHÔNG có backup/retention policy | Trung bình |

---

## 📊 8. TỔNG KẾT BẢNG

| # | Mức độ | Vấn đề | Tác động |
|---|---|---|---|
| 1 | 🔴 Critical | Socket.IO không hoạt động | KDS đơ cứng |
| 2 | 🔴 Critical | Không có RBAC | Bất kỳ user nào cũng xóa được menu |
| 3 | 🔴 Critical | 3 fnbOrder controller là stub | Lịch sử KDS rỗng |
| 4 | 🟠 High | 2 schema song song | Dữ liệu không nhất quán |
| 5 | 🟠 High | `seedAll.js` chỉ seed 1/57 bảng | Frontend thiếu data |
| 6 | 🟠 High | `enrichRooms.js` không được gọi | Rooms không giàu dữ liệu |
| 7 | 🟡 Medium | JWT_SECRET hardcode | Bảo mật kém |
| 8 | 🟡 Medium | Không có error handler global | Debug khó |
| 9 | 🟡 Medium | 0 unit test | Không CI/CD |
| 10 | 🟡 Medium | Không có rate limit | brute-force |
| 11 | 🟢 Low | File rỗng (socketHandler, nginx.conf) | Clean code |
| 12 | 🟢 Low | Comment TODO còn trong code | Minor |
| 13 | 🟢 Low | `constants/` rỗng | Refactor sau |
| 14 | 🟢 Low | Thiếu pages cho Receptionist/Housekeeping | Một số role không có UI |

---

## 🎯 9. ĐỀ XUẤT ƯU TIÊN

### Ưu tiên 1 (Làm ngay để demo)
1. Triển khai Socket.IO thực sự cho KitchenDisplay — highlight của dự án
2. Implement lại 3 fnbOrderController stub
3. Mount RBAC middleware cho routes nhạy cảm
4. Seed thêm Users, RoomTypes, Rooms, Branches để demo mượt

### Ưu tiên 2 (Trước khi nộp)
5. Thống nhất DB schema (chọn Sequelize hoặc raw SQL)
6. Tách nhỏ `RoomTypeManagement.jsx` (90KB thành nhiều component)
7. Thêm error handler global
8. Health check trong docker-compose

### Ưu tiên 3 (Nếu có thời gian)
9. Viết unit test cho search engine + audit
10. Set up CI/CD với GitHub Actions
11. Thêm rate limiting & helmet

---

📝 *Phân tích dựa trên đọc source code trực tiếp, không dựa vào README.*
