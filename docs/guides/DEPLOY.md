# HƯỚNG DẪN TRIỂN KHAI VÀ CHẠY DỰ ÁN TRÊN MÁY MỚI (DEPLOYMENT GUIDE)

Dự án **Grand Horizon Luxury Hotel Management System (PMS)** có 2 phương pháp triển khai trên máy khác:

---

## ⚡ PHƯƠNG PHÁP 1: Chạy bằng Docker (Khuyên dùng - Nhanh nhất)
> **Yêu cầu:** Máy đã cài đặt **Docker Desktop** (Windows/Mac) hoặc Docker Engine (Linux). Không cần cài đặt Node.js hay MySQL trên máy.

### Bước 1: Sao chép mã nguồn về máy mới
```bash
git clone <repository_url>
cd CDPTW1-QuanLyKhachSan
```

### Bước 2: Khởi động toàn bộ hệ thống bằng 1 lệnh duy nhất
```bash
docker compose up -d --build
```

### Bước 3: Truy cập hệ thống
- **Giao diện Client & Admin (Frontend):** `http://localhost:3000`
- **Backend API & WebSocket:** `http://localhost:5000`
- **Quản trị CSDL (phpMyAdmin):** `http://localhost:8080` (Tài khoản: `root`, Mật khẩu trống)
- **MySQL Port:** `3306`

---

## 💻 PHƯƠNG PHÁP 2: Chạy trực tiếp trên máy Host (Local Development)
> **Yêu cầu máy mới:**
> - **Node.js:** Phiên bản `>= 18.x` (khuyên dùng Node 20 LTS hoặc 22).
> - **MySQL Server:** Phiên bản `8.0` (chạy qua Docker, XAMPP, hoặc MySQL Installer).

### Bước 1: Cấu hình Cơ sở dữ liệu MySQL
1. Khởi động MySQL trên cổng `3306`.
2. Tạo database `hotel_management` và nạp dữ liệu:
   - **Cách nhanh nhất:** Import file sao lưu toàn diện đã có sẵn trong dự án:
     ```bash
     # Nếu dùng MySQL Command Line / Terminal:
     mysql -u root -p hotel_management < db/hotel_management_full.sql

     # Hoặc mở phpMyAdmin (http://localhost:8080) -> Chọn Import -> Chọn file db/hotel_management_full.sql
     ```

### Bước 2: Kiểm tra file cấu hình môi trường (.env)
Dự án đã cấu hình sẵn `.env` chuẩn loopback `127.0.0.1`. Nếu mật khẩu MySQL trên máy mới khác rỗng, chỉ cần mở file `.env` và `backend/.env` sửa lại:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<mat_khau_mysql_cua_may_ban>
DB_NAME=hotel_management
PORT=5000
```

### Bước 3: Cài đặt thư viện dependencies
Tại thư mục gốc dự án:
```bash
# 1. Cài đặt thư viện Backend
cd backend
npm install

# 2. Cài đặt thư viện Frontend
cd ../frontend
npm install
```

### Bước 4: Khởi động dịch vụ
Mở 2 cửa sổ Terminal:
- **Terminal 1 (Backend):**
  ```bash
  cd backend
  npm run dev
  # Server chạy tại: http://localhost:5000
  ```
- **Terminal 2 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  # Giao diện chạy tại: http://localhost:3000
  ```

---

## 🧪 Bước 5: Chạy kiểm thử xác nhận sau khi cài đặt trên máy mới
Tại thư mục gốc dự án, bạn chạy script kiểm thử:
```bash
# Chạy menu tương tác chọn tính năng:
npm run test:manual

# Hoặc kiểm tra liên hoàn toàn bộ 14 tính năng C1 - C14:
npm run test:manual all
```
Nếu màn hình báo `ALL 14 FEATURES PASSED 100% 🌟`, hệ thống trên máy mới đã hoạt động hoàn toàn chính xác!

---

## ⚠️ Những điểm khác biệt cần lưu ý khi sang máy mới:
1. **Xung đột cổng (Port In Use):** Đảm bảo các cổng `3000`, `5000`, `3306`, `8080` không bị ứng dụng khác chiếm dụng (ví dụ XAMPP Apache, IIS, Skype).
2. **IP Database:** Luôn để `DB_HOST=127.0.0.1` (không dùng IP mạng nội bộ tĩnh của máy cũ).
3. **Dữ liệu mẫu:** Sử dụng file `db/hotel_management_full.sql` sẽ có ngay lập tức 160 dịch vụ, phòng mẫu, tài khoản admin/lễ tân/khách hàng mà không phải chạy lại seeder từ đầu.

