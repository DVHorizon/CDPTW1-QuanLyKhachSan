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

## 3. Hướng Dẫn Khởi Chạy Dự Án Bằng Docker (Khuyên Dùng)

> [!TIP]
> Trước khi khởi chạy hoặc sau khi cập nhật dự án, hãy đảm bảo bạn đã kéo mã nguồn mới nhất:
> ```bash
> git pull origin master
> ```

---

### 3.1 Khởi chạy tự động 1-Click (Khuyến nghị cho tất cả thành viên)

Dự án đã tích hợp sẵn script tự động hóa toàn bộ quy trình thiết lập môi trường từ A - Z:

- **Trên Windows:** 
  - Cách 1: Nhấp đúp chuột trực tiếp vào tệp [`setup.bat`](file:///d:/CDPTW1-QuanLyKhachSan/setup.bat).
  - Cách 2: Mở PowerShell / CMD tại thư mục gốc dự án và gõ:
    ```cmd
    .\setup.bat
    ```
- **Trên macOS / Linux:** 
  - Cấp quyền thực thi và chạy script [`setup.sh`](file:///d:/CDPTW1-QuanLyKhachSan/setup.sh):
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

#### ⚙️ Quy trình tự động mà Script thực hiện:
1. **Khởi động Docker Containers:** Kích hoạt 4 dịch vụ (`hotel_mysql`, `hotel_phpmyadmin`, `hotel_backend`, `hotel_frontend`).
2. **Kiểm tra trạng thái MySQL:** Tự động chờ đến khi MySQL container sẵn sàng nhận kết nối.
3. **Dọn dẹp schema cũ:** Tự động xóa các bảng xung đột (nếu có từ các bản chạy trước) để chống lỗi Foreign Key.
4. **Đồng bộ thư viện Backend:** Chạy `npm install` bên trong container để cài đặt đầy đủ `sequelize-cli`, `bcryptjs`, và các dependencies.
5. **Chạy Migration:** Tạo mới toàn bộ 57 bảng chuẩn hóa quan hệ khóa ngoại (Foreign Keys).
6. **Nạp dữ liệu mẫu (Seeder):** Sinh tự động hàng ngàn bản ghi mẫu cho tất cả các bảng chỉ trong ~20 giây.

---

### 3.2 Khởi chạy thủ công từng bước bằng lệnh Docker

Nếu muốn chạy thủ công từng câu lệnh qua dòng lệnh Terminal/PowerShell:

```bash
# Bước 1: Khởi động toàn bộ container chạy ngầm
docker compose up -d

# Bước 2: Đồng bộ thư viện trong container backend (tránh lỗi thiếu bcryptjs, sequelize-cli)
docker exec hotel_backend npm install

# Bước 3: Thực thi Migration tạo 57 bảng cơ sở dữ liệu
docker exec hotel_backend npm run migrate

# Bước 4: Chạy Seeder nạp dữ liệu kiểm thử
# Cách A: Seed nhanh (1.000 bản ghi/bảng, hoàn thành sau ~20 giây - KHUYÊN DÙNG KHI DEV)
docker exec hotel_backend npm run seed:fast

# Cách B: Seed đầy đủ (100.000 bản ghi/bảng theo yêu cầu đề tài lớn)
docker exec hotel_backend npm run seed:all

# Bước 5: Kiểm tra và xác thực số lượng bản ghi thực tế trong 57 bảng
docker exec hotel_backend npm run verify:db
```

---

### 3.3 Thông Tin Cổng Kết Nối & Địa Chỉ Truy Cập Dịch Vụ

Sau khi khởi chạy thành công, hệ thống hoạt động tại các địa chỉ sau:

| Dịch Vụ | Địa Chỉ Truy Cập | Thông Tin Đăng Nhập / Ghi Chú |
| :--- | :--- | :--- |
| **Giao diện Khách hàng & Quản trị** | [http://localhost:3000](http://localhost:3000) | Ứng dụng ReactJS (Vite + Nginx) |
| **Giao diện Quản trị CSDL (phpMyAdmin)** | [http://localhost:8080](http://localhost:8080) | **Server:** `mysql`<br>**User:** `root`<br>**Password:** *(Để trống)* |
| **Máy chủ Back-end API** | [http://localhost:5000](http://localhost:5000) | Kiểm tra trạng thái: [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| **Cổng kết nối MySQL trực tiếp** | `localhost:3306` hoặc `127.0.0.1:3306` | Dùng cho DBeaver, Navicat, MySQL Workbench, DataGrip:<br>**Host:** `127.0.0.1`<br>**Port:** `3306`<br>**User:** `root`<br>**Password:** *(Để trống)*<br>**Database:** `hotel_management` |

---

## 4. Hướng Dẫn Chạy Cục Bộ (Local Development Không Dùng Docker)

> [!NOTE]
> Khuyến khích sử dụng Docker ở mục 3 để đảm bảo tính đồng nhất giữa tất cả các máy tính thành viên. Nếu chạy trực tiếp trên máy chủ cục bộ (Node.js cài sẵn trên máy):

### 4.1 Yêu cầu tiên quyết
- Cài đặt **Node.js** (Khuyến nghị phiên bản v18.x hoặc v20.x).
- Cài đặt **MySQL 8.0** (hoặc XAMPP / WampServer) đang mở tại cổng `3306`.
- Tạo cơ sở dữ liệu rỗng có tên: `hotel_management`.

### 4.2 Thiết lập và chạy Backend
```bash
cd backend

# 1. Cài đặt thư viện dependencies
npm install

# 2. Chạy Migration tạo 57 bảng vào MySQL cục bộ
npm run migrate

# 3. Nạp dữ liệu mẫu (Seeder)
npm run seed:fast

# 4. Khởi động máy chủ backend chế độ phát triển (tự động reload khi sửa code)
npm run dev
```

### 4.3 Thiết lập và chạy Frontend
Mở một cửa sổ Terminal mới:
```bash
cd frontend

# 1. Cài đặt thư viện
npm install

# 2. Khởi động máy chủ phát triển Vite
npm run dev
```
Truy cập giao diện tại: [http://localhost:5173](http://localhost:5173)

---

## 5. Cơ Chế Migration & Seeder (>= 100.000 Records / Bảng)

Hệ thống cơ sở dữ liệu được thiết kế gồm **57 bảng** chia thành các nhóm phân hệ chuyên biệt:
- **Người dùng & Phân quyền:** `Users`, `Roles`, `Permissions`, `RolePermissions`, `UserRoles`, `UserActivityLogs`, `PasswordResetTokens`.
- **Cấu hình & Hạng phòng:** `RoomTypes`, `Rooms`, `Amenities`, `RoomTypeAmenities`, `BedTypes`, `RoomBedTypes`, `PriceModifiers`.
- **Đặt phòng & Dịch vụ lưu trú:** `Bookings`, `BookingDetails`, `BookingStatusHistory`, `Keycards`, `KeycardLogs`, `MinibarItems`, `MinibarConsumptions`.
- **Hóa đơn & Thanh toán:** `Invoices`, `InvoiceDetails`, `Payments`, `PaymentRefunds`, `Folios`, `FolioTransactions`.
- **Nhà hàng & F&B (KDS Bếp):** `Restaurants`, `RestaurantTables`, `MenuCategories`, `MenuItems`, `FoodOrders`, `FoodOrderDetails`, `KitchenQueue`.
- **Buồng phòng & Bảo trì:** `HousekeepingTasks`, `HousekeepingChecklists`, `MaintenanceRequests`, `LostAndFoundItems`.
- **CSKH, Khuyến mãi & Loyalty:** `GuestFeedback`, `Surveys`, `SurveyQuestions`, `SurveyResponses`, `Promotions`, `Coupons`, `MembershipTiers`, `LoyaltyPoints`, `PointTransactions`, `Notifications`, `AuditLogs`.

### 5.1 Các câu lệnh quản lý CSDL (Backend Scripts)

| Lệnh thực thi | Mục đích |
| :--- | :--- |
| `npm run migrate` | Thực thi tất cả các file migration chưa chạy trong thư mục `migrations/`. |
| `npm run migrate:undo` | Rollback lượt migration gần nhất. |
| `npm run seed:fast` | Sinh dữ liệu mẫu nhanh (~1.000 records/bảng, hoàn thành sau ~20 giây). |
| `npm run seed:all` hoặc `npm run seed` | Sinh dữ liệu lớn (100.000 records/bảng) đáp ứng chuẩn yêu cầu đề tài. |
| `npm run verify:db` | Thống kê và hiển thị số lượng bản ghi thực tế của từng bảng trong 57 bảng. |

---

## 6. Danh Sách Tài Khoản Kiểm Thử Mặc Định

Tất cả các tài khoản mẫu đều được mã hóa bằng **Bcrypt** với mật khẩu mặc định chung: **`123456`**

| Phân Hệ / Vai Trò | Email Cố Định | Email Thay Thế | Mật Khẩu | Quyền Hạn & Chức Năng Chính |
| :--- | :--- | :--- | :---: | :--- |
| 👑 **Quản Trị Viên (Admin)** | `admin@hoteldomain.vn` | `user_1@hoteldomain.vn` | `123456` | Toàn quyền quản trị hệ thống, nhân sự, cấu hình giá và báo cáo doanh thu. |
| 🛎️ **Lễ Tân (Receptionist)** | `receptionist@hoteldomain.vn` | `user_2@hoteldomain.vn` | `123456` | Quản lý sơ đồ phòng trực quan, Check-in, Check-out, tạo booking, thu ngân. |
| 🍳 **Bếp Trưởng (Kitchen)** | `kitchen@hoteldomain.vn` | `user_3@hoteldomain.vn` | `123456` | Màn hình điều phối bếp (KDS), nhận order món ăn từ phòng/nhà hàng, cập nhật trạng thái chế biến. |
| 🧹 **Buồng Phòng (Housekeeping)** | `housekeeping@hoteldomain.vn` | `user_4@hoteldomain.vn` | `123456` | Nhận danh sách phòng bẩn cần dọn, kiểm tra minibar, chuyển trạng thái phòng sạch/bảo trì. |
| 🧳 **Khách Hàng VIP (Guest)** | `guest@hoteldomain.vn` | `user_5@hoteldomain.vn` | `123456` | Đặt phòng trực tuyến, theo dõi lịch sử đặt phòng, gọi món ăn tại phòng, gửi đánh giá phản hồi. |

> [!TIP]
> Tại trang Đăng nhập giao diện web, hệ thống có sẵn các nút bấm chọn nhanh vai trò để bạn đăng nhập thử nghiệm ngay lập tức mà không cần nhập thủ công.

---

## 7. Xử Lý Các Lỗi Thường Gặp (Troubleshooting / FAQ)

### ❓ 1. Lỗi: `sh: sequelize-cli: not found` hoặc `Cannot find module 'bcryptjs'`
- **Nguyên nhân:** Khi mount thư mục mã nguồn vào Docker container, thư mục `node_modules` bên trong container chưa được đồng bộ hoặc chưa chạy `npm install`.
- **Cách xử lý:** Chạy lệnh sau để đồng bộ thư viện trực tiếp vào container:
  ```bash
  docker exec hotel_backend npm install
  ```
  *(Hoặc đơn giản là chạy script `setup.bat` vì script đã tích hợp sẵn bước này).*

---

### ❓ 2. Lỗi: `Missing column 'UserId'` hoặc `Cannot add foreign key constraint` khi migrate
- **Nguyên nhân:** Dữ liệu volume cũ của MySQL còn tồn tại các bảng với cấu trúc cũ không tương thích với schema 57 bảng mới.
- **Cách xử lý:** 
  - Cách 1: Chạy lại `.\setup.bat` (script mới nhất đã tự động dọn dẹp các bảng cũ trước khi migrate).
  - Cách 2: Reset sạch hoàn toàn volume CSDL rồi khởi tạo lại:
    ```bash
    docker compose down -v
    .\setup.bat
    ```

---

### ❓ 3. Lỗi: `Additional property volumes is not allowed` khi chạy `docker compose`
- **Nguyên nhân:** Tệp `docker-compose.yml` trên máy bạn là phiên bản cũ bị khai báo trùng khối `volumes:`.
- **Cách xử lý:** Kéo mã nguồn mới nhất từ nhánh chính:
  ```bash
  git pull origin master
  ```

---

### ❓ 4. Lỗi: Không khởi động được MySQL do trùng cổng `3306`
- **Nguyên nhân:** Máy tính của bạn đang bật sẵn dịch vụ MySQL từ XAMPP, WampServer hoặc dịch vụ MySQL service của Windows.
- **Cách xử lý:** 
  - Mở Task Manager hoặc Services (`services.msc`), tìm dịch vụ `MySQL` và chọn **Stop**.
  - Hoặc nếu dùng XAMPP, nhấn nút **Stop** ở dòng MySQL trên XAMPP Control Panel trước khi chạy Docker.

---

## 8. Quy Định Làm Việc Nhóm Với Git & SmartGit

1. **Nhánh chính (`master`):** Tuyệt đối không commit hoặc push code trực tiếp lên nhánh `master`.
2. **Quy tắc đặt tên nhánh tính năng:**
   - Cú pháp: `<Tên_Thành_Viên>/<Tên_Tính_Năng>`
   - Ví dụ: `NhanBao/Database`, `VanA/QuanLyPhong`, `ThiB/ManHinhBepKDS`.
3. **Quy tắc Commit message chuẩn Conventional Commits:**
   - `feat: thêm chức năng đặt phòng online`
   - `fix: sửa lỗi tính tổng tiền minibar`
   - `refactor: tối ưu hóa truy vấn sequelize seeder`
   - `docs: cập nhật tài liệu hướng dẫn readme`
4. **Quy trình tích hợp:**
   - Sau khi hoàn thành tính năng trên nhánh cá nhân, kiểm tra kỹ lưỡng và push lên remote.
   - Tạo **Pull Request (PR)** trên GitHub hướng vào nhánh `master` để các thành viên khác review trước khi merge.
