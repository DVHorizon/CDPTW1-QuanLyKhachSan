'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

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
// Spec 1 Room Types API
app.use('/api/v1/room-types', require('./routes/roomTypes'));
app.use('/api/loai-phong', require('./routes/roomTypes'));
app.use('/api/phong',      require('./routes/rooms'));
app.use('/api/so-do-phong', require('./routes/rooms'));
app.use('/api/room-status', require('./routes/rooms'));

// Route Quản lý người dùng & nhân viên
app.use('/api/users', require('./routes/users'));
app.use('/api/v1/users', require('./routes/users'));

// ─── MODULAR ROUTES /api/v1/{module}/* ────────────────────────────────────
// 👤 Bảo  — Guest Portal
app.use('/api/v1/guest',      require('./modules/guest'));

// 👤 Thực — PMS (Property Management)
app.use('/api/v1/pms',        require('./modules/pms'));

// 👤 Hà   — Services / Payment / AI
app.use('/api/v1/services',   require('./modules/services'));

// 👤 Trang — F&B
app.use('/api/v1/fnb',        require('./modules/fnb'));
app.use('/api/v1/fnb-orders', require('./routes/admin/fnbOrderRoutes'));
app.use('/api/fnb-orders',    require('./routes/admin/fnbOrderRoutes'));

// 👤 Tuyền — Back-office Operations
app.use('/api/v1/operations', require('./modules/operations'));

// Guest search (backward compat — cũng hoạt động qua /api/v1/guest/rooms/search)
app.use('/api/v1/rooms', require('./routes/roomSearchRoutes'));
app.use('/api/rooms',    require('./routes/roomSearchRoutes'));

// ─── Global Error Handler (phải đặt CUỐI CÙNG) ────────────────────────────
app.use(require('./shared/middlewares/errorHandler'));

// ─── Start server with WebSocket ───────────────────────────────────────────
const http = require('http');
const { initWebSocket } = require('./services/websocketService');

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`✅ Backend server with WebSocket running on port ${PORT}`);
  console.log(`   Modules: /api/v1/{guest|pms|services|fnb|operations}`);
  console.log(`   Legacy:  /api/{loai-phong|phong|v1/auth|rooms|users}`);
});
