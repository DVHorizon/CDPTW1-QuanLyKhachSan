'use strict';

const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initSocket } = require('./sockets/socketHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Grand Horizon Hotel Management Backend API is running!'));
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Backend is healthy', timestamp: new Date().toISOString() }));

// ─── Trang chủ & Auth (dùng chung) ────────────────────────────────────────
app.use('/api',          require('./routes/homeRoutes'));
app.use('/api/v1/auth',  require('./routes/authRoutes'));
app.use('/api/auth',     require('./routes/authRoutes'));   // backward compat

// ─── LEGACY routes (backward compat — giữ để frontend cũ không bị break) ──
// Admin Room & RoomType pages vẫn dùng /api/phong và /api/loai-phong
// Nhưng giờ chúng đã được rewrite để dùng Sequelize model (bảng Rooms/RoomTypes)
app.use('/api/loai-phong', require('./routes/roomTypes'));
app.use('/api/phong',      require('./routes/rooms'));
app.use('/api/so-do-phong', require('./routes/rooms'));
app.use('/api/room-status', require('./routes/rooms'));
// Route Quản lý danh sách booking toàn hệ thống (Master Bookings)
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/v1/bookings', require('./routes/bookings'));

// Routes F&B Quản lý Menu
app.use('/api/v1', require('./routes/admin/menuRoutes'));

// Route F&B Orders (Room Service, KDS, History)
app.use('/api/v1/fnb-orders', require('./routes/admin/fnbOrderRoutes'));

// Route Quản lý tình trạng phòng trống (Room Availability)
app.use('/api/admin/room-availability', require('./routes/admin/roomAvailability'));

// Route Phân bổ phòng & xác nhận (Room Allocation & Confirmation Engine)
app.use('/api/v1/allocation', require('./routes/admin/roomAllocationRoutes'));
app.use('/api/allocation', require('./routes/admin/roomAllocationRoutes'));

// Route Nghiệp vụ Check-in tại quầy (Front Desk Express Check-In Workflow)
app.use('/api/v1/check-in', require('./routes/admin/checkInRoutes'));
app.use('/api/check-in', require('./routes/admin/checkInRoutes'));

// Route Nghiệp vụ Check-out & Kiểm phòng (FEAT-CHECKOUT-INSPECT-01)
const checkOutRoutes = require('./routes/admin/checkOutRoutes');
app.use('/api/v1/check-out', checkOutRoutes);
app.use('/api/check-out', checkOutRoutes);
app.use('/api/v1/stays', checkOutRoutes);
app.use('/api/v1/folio', checkOutRoutes);

// Route Quản lý người dùng & nhân viên (Spec 3 - FEAT-USER-01)
app.use('/api/users', require('./routes/users'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/v1/roles', require('./routes/roleRoutes'));

// ─── MODULAR ROUTES /api/v1/{module}/* ────────────────────────────────────
// 👤 Bảo  — Guest Portal
app.use('/api/v1/guest',      require('./modules/guest'));

// 👤 Thực — PMS (Property Management)
app.use('/api/v1/pms',        require('./modules/pms'));

// 👤 Hà   — Services / Payment / AI
app.use('/api/v1/services',       require('./modules/services'));
app.use('/api/v1/service-orders', require('./modules/services/routes/serviceOrderRoutes'));

// 👤 Trang — F&B
app.use('/api/v1/fnb',                require('./modules/fnb'));
app.use('/api/v1/fnb-orders',         require('./routes/admin/fnbOrderRoutes'));
app.use('/api/fnb-orders',            require('./routes/admin/fnbOrderRoutes'));
app.use('/api/v1/table-reservations', require('./routes/admin/tableReservationRoutes'));
app.use('/api/table-reservations',    require('./routes/admin/tableReservationRoutes'));

// 👤 Tuyền — Back-office Operations
app.use('/api/v1/operations', require('./modules/operations'));

// Guest search (backward compat — cũng hoạt động qua /api/v1/guest/rooms/search)
app.use('/api/v1/rooms', require('./routes/roomSearchRoutes'));
app.use('/api/rooms',    require('./routes/roomSearchRoutes'));
// FEAT-GUEST-05: Direct booking endpoint
app.post('/bookings', require('./controllers/bookingEngineController').createOnlineBooking);

// FEAT-GUEST-08: Direct deposit payment & booking retrieval endpoints
app.get('/bookings/:id', require('./controllers/onlineDepositPaymentController').getBookingDetails);
app.post('/bookings/:bookingId/deposit', require('./controllers/onlineDepositPaymentController').processDepositPayment);
app.post('/payments', require('./controllers/onlineDepositPaymentController').processDepositPayment);

// ─── Global Error Handler (phải đặt CUỐI CÙNG) ────────────────────────────
app.use(require('./shared/middlewares/errorHandler'));

// ─── HTTP Server & WebSocket ───────────────────────────────────────────────
const server = http.createServer(app);
try {
  initSocket(server);
} catch (wsErr) {
  console.warn('⚠️ WebSocket init warning:', wsErr.message);
}

// ─── Start server ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`✅ Backend server with WebSocket running on port ${PORT}`);
  console.log(`   Modules: /api/v1/{guest|pms|services|fnb|operations}`);
  console.log(`   Legacy:  /api/{loai-phong|phong|v1/auth|rooms|users}`);
});
