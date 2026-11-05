#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "🏨 GRAND HORIZON HOTEL - KHỞI TẠO HỆ THỐNG & CƠ SỞ DỮ LIỆU TỰ ĐỘNG"
echo "=============================================================================="
echo ""

echo "[1/7] 🚀 Đang khởi động Docker (MySQL, phpMyAdmin, Backend, Frontend)..."
if command -v docker compose &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo "[2/7] ⏳ Đang đợi MySQL sẵn sàng kết nối..."
retries=0
until docker exec hotel_mysql mysqladmin ping -h localhost --silent &> /dev/null; do
    retries=$((retries + 1))
    if [ $retries -ge 30 ]; then
        echo "❌ Quá thời gian chờ MySQL. Vui lòng kiểm tra Docker container!"
        exit 1
    fi
    echo "   Đang chờ MySQL khởi động..."
    sleep 2
done
echo "   ✅ MySQL đã sẵn sàng!"

echo ""
echo "[3/7] 🧹 Dọn dẹp CSDL cũ để chuẩn hóa cấu trúc..."
docker exec hotel_mysql mysql -uroot -e "DROP DATABASE IF EXISTS hotel_management; CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo ""
echo "[4/7] 📄 Khởi tạo cấu trúc bảng nền tảng (Users, Roles, MembershipTiers) từ init.sql..."
docker exec -i hotel_mysql mysql -uroot hotel_management < db/init.sql || echo "   ⚠️ Tiếp tục qua bước Sequelize Migration..."

echo ""
echo "[5/7] 📥 Đang đồng bộ thư viện Backend (npm install)..."
docker exec hotel_backend npm install

echo ""
echo "[6/7] 📦 Đang thực thi Migration toàn bộ 57 bảng CSDL (Sequelize Migration)..."
docker exec hotel_backend npm run migrate

echo ""
echo "[7/7] 🌱 Đang nạp dữ liệu mẫu vào CSDL (Fast Seed) và kiểm tra bảng Users..."
docker exec hotel_backend npm run seed:fast
docker exec hotel_backend npm run verify:db

echo ""
echo "=============================================================================="
echo "🎉 HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG!"
echo ""
echo "🌐 phpMyAdmin (Xem Database): http://localhost:8080"
echo "   - Máy chủ: mysql"
echo "   - Tài khoản: root"
echo "   - Mật khẩu: (Để trống)"
echo ""
echo "🚀 Backend API:              http://localhost:5000"
echo "💻 Frontend Website:         http://localhost:3000"
echo "=============================================================================="

