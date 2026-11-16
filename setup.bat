@echo off
chcp 65001 >nul
echo ==============================================================================
echo 🏨 GRAND HORIZON HOTEL - KHỞI TẠO HỆ THỐNG ^& CƠ SỞ DỮ LIỆU TỰ ĐỘNG
echo ==============================================================================
echo.

echo [1/7] 🚀 Đang khởi động Docker (MySQL, phpMyAdmin, Backend, Frontend)...
docker compose up -d
if errorlevel 1 (
    echo [Fallback] Thử với lệnh docker-compose...
    docker-compose up -d
)

echo.
echo [2/7] ⏳ Đang đợi MySQL sẵn sàng kết nối...
set /a retries=0

:wait_mysql
set /a retries+=1
if %retries% geq 30 goto timeout_mysql

docker exec hotel_mysql mysqladmin ping -h localhost --silent >nul 2>&1
if errorlevel 1 (
    ping 127.0.0.1 -n 3 >nul
    goto wait_mysql
)
echo    ✅ MySQL đã sẵn sàng!
goto continue_setup

:timeout_mysql
echo ❌ Quá thời gian chờ MySQL sau 60 giây. Vui lòng kiểm tra Docker Desktop!
goto finish

:continue_setup

echo.
echo [3/7] 🧹 Dọn dẹp CSDL cũ để chuẩn hóa cấu trúc...
docker exec hotel_mysql mysql -uroot -e "DROP DATABASE IF EXISTS hotel_management; CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo.
echo [4/7] 📄 Khởi tạo cấu trúc bảng nền tảng (Users, Roles, MembershipTiers) từ init.sql...
type db\init.sql | docker exec -i hotel_mysql mysql -uroot hotel_management
if errorlevel 1 (
    echo    ⚠️ Không thể nạp trực tiếp qua init.sql, sẽ tiếp tục qua Sequelize Migration...
) else (
    echo    ✅ Đã khởi tạo cấu trúc bảng Users thành công!
)

echo.
echo [5/7] 📥 Đang đồng bộ thư viện Backend (npm install)...
docker exec hotel_backend npm install

echo.
echo [6/7] 📦 Đang thực thi Migration toàn bộ 57 bảng CSDL (Sequelize Migration)...
docker exec hotel_backend npm run migrate

echo.
echo [7/7] 🌱 Đang nạp dữ liệu mẫu vào CSDL (Fast Seed) và kiểm tra bảng Users...
docker exec hotel_backend npm run seed:fast
echo.
docker exec hotel_backend npm run verify:db

:finish
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

