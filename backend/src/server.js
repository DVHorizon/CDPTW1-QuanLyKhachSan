const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.send('Grand Horizon Hotel Management Backend API is running!');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is healthy' });
});

// Routes API trang chủ
app.use('/api', require('./routes/homeRoutes'));

// Routes API Xác thực & Người dùng (Authentication)
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Route tìm kiếm phòng & chi nhánh (FEAT-GUEST-02 / A2)
app.use('/api/v1/rooms', require('./routes/roomSearchRoutes'));
app.use('/api/rooms', require('./routes/roomSearchRoutes'));

// Route quản lý loại phòng
app.use('/api/loai-phong', require('./routes/roomTypes'));

// Route quản lý phòng vật lý
app.use('/api/phong', require('./routes/rooms'));

// Routes F&B Quản lý Menu
app.use('/api/v1', require('./routes/admin/menuRoutes'));

// Route Audit Logs & Fraud Prevention
app.use('/api/audit', require('./routes/auditLogRoutes'));

// Route Tiếp Thị & Chăm Sóc Khách Hàng Đa Kênh (Marketing Automation)
app.use('/api/marketing', require('./routes/marketingAutomationRoutes'));

// Route Quản Lý Kho Đồ Tiêu Hao, Minibar & Luân Chuyển Đồ Vải (Inventory & Linen)
app.use('/api/housekeeping/inventory', require('./routes/housekeepingInventoryRoutes'));

// Route Tiếp Nhận Sự Cố & Bảo Trì Kỹ Thuật Buồng Phòng (Engineering & Maintenance Ticketing)
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));

// Route Quản Lý Đồ Thất Lạc & Bỏ Quên (Lost & Found Management)
app.use('/api/housekeeping/lost-and-found', require('./routes/lostAndFoundRoutes'));

// Route Khóa Cửa Điện Tử Thông Minh IoT (E-Key & Smart Lock Management)
app.use('/api/smart-lock', require('./routes/smartLockRoutes'));

const { AuditLog } = require('./models');

app.listen(PORT, async () => {
  console.log(`Backend server is running on port ${PORT}`);
  if (AuditLog && AuditLog.initDatabaseTriggers) {
    await AuditLog.initDatabaseTriggers();
    console.log('[Security] Đã kích hoạt Triggers bảo vệ bất biến (WORM) cho Audit Log.');
  }
});

