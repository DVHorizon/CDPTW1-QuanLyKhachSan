@echo off
chcp 65001 >nul
echo ==============================================================================
echo 🏨 GRAND HORIZON HOTEL - KHỞI TẠO HỆ THỐNG ^& CƠ SỞ DỮ LIỆU TỰ ĐỘNG
echo ==============================================================================
echo.

echo [1/5] 🚀 Đang khởi động Docker (MySQL, phpMyAdmin, Backend, Frontend)...
docker compose up -d
if errorlevel 1 (
    echo [Fallback] Thử với lệnh docker-compose...
    docker-compose up -d
)

echo.
echo [2/5] ⏳ Đang đợi MySQL sẵn sàng kết nối...
:wait_mysql
docker exec hotel_mysql mysqladmin ping -h localhost --silent >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_mysql
)
echo    ✅ MySQL đã sẵn sàng!

echo.
echo [3/6] 🧹 Dọn dẹp CSDL cũ để tránh xung đột cấu trúc...
docker exec hotel_mysql mysql -uroot -e "DROP DATABASE IF EXISTS hotel_management; CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo.
echo [4/6] 📥 Đang đồng bộ thư viện Backend (npm install)...
docker exec hotel_backend npm install

echo.
echo [5/6] 📦 Đang khởi tạo cấu trúc 57 bảng (Sequelize Migration)...
docker exec hotel_backend npm run migrate

echo.
echo [6/6] 🌱 Đang nạp dữ liệu vào cơ sở dữ liệu (Chế độ Fast Seed ~20 giây)...
docker exec hotel_backend npm run seed:fast

echo.
echo ==============================================================================
echo 🎉 HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG!
echo.
echo 🌐 phpMyAdmin (Xem Database): http://localhost:8080
echo    - Máy chủ: mysql
echo    - Tài khoản: root
echo    - Mật khẩu: (Để trống)
echo.
echo 🚀 Backend API:              http://localhost:5000
echo 💻 Frontend Website:         http://localhost:3000
echo ==============================================================================
echo.
pause
