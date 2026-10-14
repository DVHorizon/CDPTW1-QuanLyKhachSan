#!/usr/bin/env bash
set -e

echo "=============================================================================="
echo "🏨 GRAND HORIZON HOTEL - KHỞI TẠO HỆ THỐNG & CƠ SỞ DỮ LIỆU TỰ ĐỘNG"
echo "=============================================================================="
echo ""

echo "[1/4] 🚀 Đang khởi động Docker (MySQL, phpMyAdmin, Backend, Frontend)..."
if command -v docker compose &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

echo ""
echo "[2/4] ⏳ Đang đợi MySQL sẵn sàng kết nối..."
until docker exec hotel_mysql mysqladmin ping -h localhost --silent &> /dev/null; do
    echo "   Đang chờ MySQL khởi động..."
    sleep 2
done
echo "   ✅ MySQL đã sẵn sàng!"

echo ""
echo "[3/5] 📥 Đang đồng bộ thư viện Backend (npm install)..."
docker exec hotel_backend npm install

echo ""
echo "[4/5] 📦 Đang khởi tạo cấu trúc 57 bảng (Sequelize Migration)..."
docker exec hotel_backend npm run migrate

echo ""
echo "[5/5] 🌱 Đang nạp dữ liệu vào cơ sở dữ liệu (Chế độ Fast Seed ~20 giây)..."
docker exec hotel_backend npm run seed:fast

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
