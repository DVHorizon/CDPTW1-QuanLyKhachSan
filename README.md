# Đồ Án Chuyên Đề Phát Triển Web 1 - Nhóm C

## HỆ THỐNG QUẢN LÝ KHÁCH SẠN (HOTEL MANAGEMENT SYSTEM)

Hệ thống ứng dụng web quản lý khách sạn và khu nghỉ dưỡng toàn diện, hỗ trợ đầy đủ các bộ phận vận hành (Quản trị viên, Lễ tân, Đầu bếp, Buồng phòng) và Cổng đặt phòng trực tuyến dành cho Khách hàng.

---

## 1. Công Nghệ Sử Dụng

- **Back-end:** Node.js, Express.js (Kiến trúc MVC), ORM Sequelize, Socket.IO (Real-time WebSocket), JWT & RBAC.
- **Front-end:** ReactJS (Vite), TailwindCSS, React Router, Axios, Lucide Icons.
- **Cơ sở dữ liệu:** MySQL 8.0 (Bao gồm 50 bảng chuẩn hóa theo mô tả đề tài).
- **Containerization:** Docker & Docker Compose (MySQL 8.0, phpMyAdmin, Backend API, Frontend Nginx).
- **Quản lý mã nguồn:** Git & SmartGit.

---

## 2. Cấu Trúc Thư Mục Dự Án (Monorepo)

```
CDPTW1-QuanLyKhachSan/
├── .gitignore                    # Cấu hình bỏ qua tệp tạm, dependencies, logs
├── docker-compose.yml            # Khởi chạy toàn bộ hệ sinh thái dịch vụ bằng Docker
├── README.md                     # Tài liệu hướng dẫn sử dụng và phát triển
│
├── db/                           # Thư mục chứa tệp SQL khởi tạo CSDL
│   └── init.sql                  # Định nghĩa toàn bộ 50 bảng CSDL (DDL)
│
├── backend/                      # Dịch vụ Back-end API (Node.js + Express + Sequelize)
│   ├── src/
│   │   ├── config/               # Cấu hình kết nối MySQL (db.js)
│   │   ├── constants/            # Hằng số Roles, RoomStatus, BookingStatus, OrderStatus
│   │   ├── controllers/          # Bộ điều khiển (auth, rooms, bookings, food-orders)
│   │   ├── middlewares/          # JWT authMiddleware, rbacMiddleware, errorHandler
│   │   ├── migrations/           # Cơ chế Migration tự động tạo bảng (001_create_all_tables.js)
│   │   ├── models/               # Định nghĩa Sequelize Models & Associations
│   │   ├── routes/               # Định tuyến API endpoints
│   │   ├── seeders/              # Bộ sinh dữ liệu Seeder hiệu năng cao (seedAll.js)
│   │   ├── sockets/              # Quản lý sự kiện WebSocket Realtime (socketHandler.js)
│   │   ├── app.js                # Khởi tạo Express app & middlewares
│   │   └── server.js             # Điểm chạy máy chủ HTTP & Socket.IO
│   ├── Dockerfile
│   └── package.json
│
└── frontend/                     # Dịch vụ Front-end (React + Vite + TailwindCSS)
    ├── src/
    │   ├── api/                  # Axios Client với bộ chặn JWT Token
    │   ├── context/              # AuthContext (đăng nhập/vai trò), SocketContext
    │   ├── layouts/              # GuestLayout (khách hàng), DashboardLayout (nhân viên)
    │   ├── pages/                # Các màn hình: Trang chủ, Đặt phòng, Sơ đồ phòng, KDS Bếp
    │   ├── routes/               # Bộ định tuyến AppRoutes.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── Dockerfile
    ├── nginx.conf
    └── package.json
```

---

## 3. Hướng Dẫn Chạy Dự Án Bằng Docker (Khuyên Dùng)

### 3.1 Cơ chế chạy Docker với file `.sql`:

Trong tệp `docker-compose.yml`, dịch vụ `mysql` đã được cấu hình tự động ánh xạ tệp `./db/init.sql` vào thư mục khởi tạo đặc biệt của MySQL Docker:

```yaml
volumes:
  - mysql_data:/var/lib/mysql
  - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

👉 **Cơ chế:** Khi MySQL container khởi động lần đầu tiên, hệ thống sẽ tự động quét thư mục `/docker-entrypoint-initdb.d/` và thực thi toàn bộ câu lệnh trong tệp `init.sql` để tạo cơ sở dữ liệu `hotel_management` cùng toàn bộ 50 bảng mà bạn không cần phải import thủ công!

### 3.2 Các bước khởi chạy:

1. Mở terminal tại thư mục gốc dự án:
   ```bash
   docker compose up -d --build
   ```
2. Kiểm tra trạng thái các container:
   ```bash
   docker compose ps
   ```
3. Truy cập các dịch vụ:
   - **Giao diện Khách hàng & Quản trị:** [http://localhost:3000](http://localhost:3000)
   - **Máy chủ Backend API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
   - **Giao diện quản lý CSDL phpMyAdmin:** [http://localhost:8080](http://localhost:8080)  
     _(Tài khoản: `root` / Mật khẩu:)_

---

## 4. Hướng Dẫn Chạy Cục Bộ (Local Development Không Dùng Docker)

### 4.1 Khởi động MySQL cục bộ

Đảm bảo bạn đã cài đặt MySQL (hoặc XAMPP / WampServer) trên máy và mở cổng `3306`.

### 4.2 Thiết lập Backend

```bash
cd backend

# 1. Cài đặt thư viện
npm install

# 2. Chạy Migration tạo 50 bảng vào MySQL
npm run migrate

# 3. Chạy Seeder nạp dữ liệu (xem chi tiết mục 5)
npm run seed

# 4. Khởi động máy chủ backend chế độ phát triển
npm run dev
```

### 4.3 Thiết lập Frontend

Mở một cửa sổ terminal mới:

```bash
cd frontend

# 1. Cài đặt thư viện
npm install

# 2. Khởi động ứng dụng React Vite
npm run dev
```

Truy cập: [http://localhost:5173](http://localhost:5173)

---

## 5. Cơ Chế Migration & Seeder (>= 100.000 Records / Bảng)

### 5.1 Chạy Migration tạo bảng

Theo đúng yêu cầu kỹ thuật, toàn bộ 50 bảng được tạo thông qua hệ thống migration:

```bash
cd backend
npm run migrate
```

Lịch sử các lần chạy migration được lưu tại bảng `SequelizeMeta` để đảm bảo tính toàn vẹn và không chạy trùng lặp.

### 5.2 Chạy Seeder nạp dữ liệu hiệu năng cao

Hệ sinh thái đi kèm script `seedAll.js` áp dụng kỹ thuật **Bulk Insert Chunks (5.000 records/lô)**, tự động ngắt `FOREIGN_KEY_CHECKS` trong quá trình nạp để tăng tốc độ ghi lên gấp 50 lần:

```bash
cd backend

# Chạy seed mặc định 100.000 records cho mỗi bảng (bắt buộc theo yêu cầu đề tài):
npm run seed

# Tùy chỉnh số lượng records khi cần test nhanh (ví dụ: 1.000 records/bảng):
node src/seeders/seedAll.js --count=1000

# Chỉ seed riêng các bảng chỉ định:
node src/seeders/seedAll.js --count=100000 --tables=Users,Roles,Rooms
```

---

## 6. Danh Sách Tài Khoản Kiểm Thử Mặc Định

Tất cả các tài khoản mẫu được tạo sẵn với mật khẩu mặc định: **`123456`**

| Vai Trò                        | Email Đăng Nhập         | Quyền Hạn Chính                             |
| ------------------------------ | ----------------------- | ------------------------------------------- |
| **Admin (Quản trị)**           | `user_1@hoteldomain.vn` | Toàn quyền cấu hình, nhân sự, báo cáo       |
| **Receptionist (Lễ tân)**      | `user_2@hoteldomain.vn` | Sơ đồ phòng, Check-in, Check-out, Thu ngân  |
| **Kitchen (Đầu bếp)**          | `user_3@hoteldomain.vn` | Màn hình bếp KDS, cập nhật trạng thái món   |
| **Housekeeping (Buồng phòng)** | `user_4@hoteldomain.vn` | Nhận phòng bẩn, cập nhật phòng sạch/bảo trì |
| **Guest (Khách hàng)**         | `user_5@hoteldomain.vn` | Đặt phòng trực tuyến, gọi món tại phòng     |

_(Tại trang Đăng nhập [http://localhost:5173/login](http://localhost:5173/login), hệ thống có sẵn các nút bấm chọn nhanh vai trò để kiểm thử tức thì)._

---

## 7. Quy Định Làm Việc Nhóm Với Git & SmartGit

1. **Nhánh chính (Main/Master):** Được bảo vệ nghiêm ngặt, tuyệt đối không commit code trực tiếp.
2. **Quy tắc tạo nhánh:**
   - Cú pháp: `<Tên_Thành_Viên>/<STT>_<Tên_Tính_Năng>`
   - Ví dụ: `NhanBao/0_khoi_tao`, `VanA/1_quan_ly_phong`, `ThiB/2_man_hinh_bep`.
3. **Quy tắc Commit:**
   - `feat: thêm chức năng mới`
   - `fix: sửa lỗi`
   - `refactor: tối ưu mã nguồn`
   - `docs: cập nhật tài liệu`
4. **Quy tắc tích hợp:**
   - Thực hiện commit và push lên nhánh cá nhân trên Git/SmartGit.
   - Tạo Pull Request (PR) để các thành viên trong nhóm review code trước khi merge vào nhánh chính.
