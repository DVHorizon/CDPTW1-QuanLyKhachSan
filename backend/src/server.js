'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { initSocket } = require('./sockets/socketHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Ẩn thông tin phiên bản/công nghệ máy chủ khỏi HTTP response headers
app.disable('x-powered-by');

// Thiết lập các HTTP Security Headers tiêu chuẩn cho toàn bộ phản hồi
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  next();
});

// Giới hạn CORS theo danh sách Origin hợp lệ thay vì mở toàn bộ (*)
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Phục vụ tệp tĩnh ảnh phòng, CCCD, thẻ khách và chữ ký số
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

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
// Spec 2 Physical Rooms API
app.use('/api/v1/rooms',      require('./routes/rooms'));
app.use('/api/phong',          require('./routes/rooms'));
app.use('/api/so-do-phong',    require('./routes/rooms'));
app.use('/api/room-status',    require('./routes/rooms'));
// FEAT-INVOICE-01: Booking Charges Aggregation (C6)
const bookingChargesController = require('./modules/services/controllers/bookingChargesController');
const { verifyToken, requirePermission } = require('./middlewares/authMiddleware');
app.get('/api/v1/bookings/:bookingId/charges', verifyToken, bookingChargesController.getBookingCharges);
app.get('/api/bookings/:bookingId/charges',    verifyToken, bookingChargesController.getBookingCharges);
app.get('/bookings/:bookingId/charges',        verifyToken, bookingChargesController.getBookingCharges);

// Route Quản lý danh sách booking toàn hệ thống (Master Bookings)
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/v1/bookings', require('./routes/bookings'));

// Routes F&B Quản lý Menu
app.use('/api/v1', require('./routes/admin/menuRoutes'));

// Route F&B Orders (Room Service, KDS, History)
app.use('/api/v1/fnb-orders', require('./routes/admin/fnbOrderRoutes'));
app.use('/api/v1/kitchen-inventory', require('./routes/admin/kitchenInventoryRoutes'));

// Route Quản lý tình trạng phòng trống (Room Availability)
app.use('/api/admin/room-availability', require('./routes/admin/roomAvailability'));
app.use('/api/v1/room-map', require('./routes/admin/roomAvailability'));
app.use('/api/v1/rooms/:roomId/status', (req, res, next) => {
  req.url = `/${req.params.roomId}/status`;
  return require('./routes/admin/roomAvailability')(req, res, next);
});

// Route Phân bổ phòng & xác nhận (Room Allocation & Confirmation Engine)
app.use('/api/v1/allocation', require('./routes/admin/roomAllocationRoutes'));
app.use('/api/allocation', require('./routes/admin/roomAllocationRoutes'));

// Route Nghiệp vụ Check-in tại quầy (Front Desk Express Check-In Workflow - Spec 8)
const checkInRoutes = require('./routes/admin/checkInRoutes');
app.use('/api/v1/check-ins', checkInRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/v1/check-in', checkInRoutes);
app.use('/api/check-in', checkInRoutes);
app.use('/api/v1/checkin', checkInRoutes);
app.use('/api/checkin', checkInRoutes);

const checkInController = require('./controllers/admin/checkInController');


// Additional Check-In aliases for Stays and Bookings
app.post('/api/v1/stays/check-in', verifyToken, requirePermission('CHECKIN_CREATE'), checkInController.processCheckIn);
app.post('/api/stays/check-in',    verifyToken, requirePermission('CHECKIN_CREATE'), checkInController.processCheckIn);

// Booking param aliases: POST /api/v1/bookings/:bookingId/check-in
const handleBookingCheckInAlias = (req, res, next) => {
  req.body = { ...req.body, bookingId: req.params.bookingId };
  return checkInController.processCheckIn(req, res, next);
};
app.post('/api/v1/bookings/:bookingId/check-in', verifyToken, requirePermission('CHECKIN_CREATE'), handleBookingCheckInAlias);
app.post('/api/v1/bookings/:bookingId/checkin',  verifyToken, requirePermission('CHECKIN_CREATE'), handleBookingCheckInAlias);
app.post('/api/bookings/:bookingId/check-in',    verifyToken, requirePermission('CHECKIN_CREATE'), handleBookingCheckInAlias);
app.post('/api/bookings/:bookingId/checkin',     verifyToken, requirePermission('CHECKIN_CREATE'), handleBookingCheckInAlias);

// Route Nghiệp vụ Check-out & Kiểm phòng (FEAT-CHECKOUT-INSPECT-01)
const checkOutRoutes = require('./routes/admin/checkOutRoutes');
app.use('/api/v1/check-out', checkOutRoutes);
app.use('/api/check-out', checkOutRoutes);
app.use('/api/v1/folio', checkOutRoutes);

// Route Quản lý Minibar phòng (FEAT-MINIBAR-01 - Spec 12)
const minibarRoutes = require('./routes/admin/minibarRoutes');
app.use('/api/v1/minibar', minibarRoutes);
app.use('/api/minibar', minibarRoutes);
app.use('/api/v1/stays/:stayId/minibar', (req, res, next) => {
  req.url = `/stays/${req.params.stayId}${req.url === '/' ? '' : req.url}`;
  return minibarRoutes(req, res, next);
});

// Route Gia hạn lưu trú & Đổi phòng (Stay Extension & Room Move Terminal - Spec 9 & Spec 10)
const { router: roomMoveRouter } = require('./routes/admin/roomMoveRoutes');
app.use('/api/v1/room-moves', roomMoveRouter);
app.use('/api/room-moves', roomMoveRouter);
app.use('/api/v1/stays', require('./routes/admin/stayExtensionRoutes'));
app.use('/api/stays', require('./routes/admin/stayExtensionRoutes'));
app.use('/api/v1/stay-extensions', require('./routes/admin/stayExtensionRoutes'));
app.use('/api/stay-extensions', require('./routes/admin/stayExtensionRoutes'));
app.use('/api/v1/stays', checkOutRoutes);

// Route Quản lý người dùng & nhân viên (Spec 3 - FEAT-USER-01)
app.use('/api/users', require('./routes/users'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/v1/roles', require('./routes/roleRoutes'));

// ─── Operations & Smart Lock routes (tuyen/7) ─────────────────────────────
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

// Route Quản lý Đón tiễn sân bay & Lịch trình xe đưa đón (Airport Transfer & Shuttle Fleet - Module 50)
app.use('/api/transportation', require('./routes/transportationRoutes'));
app.use('/api/v1/transportation', require('./routes/transportationRoutes'));

// Route Quy trình Kiểm toán đêm tự động & Đóng sổ tài chính (Automated Night Audit - Module 49)
app.use('/api/night-audit', require('./routes/nightAuditRoutes'));
app.use('/api/v1/night-audit', require('./routes/nightAuditRoutes'));

// Route Tự động kết xuất dữ liệu Khai báo tạm trú Công an (Police Guest Declaration Export - Module 51)
app.use('/api/police-declaration', require('./routes/policeDeclarationRoutes'));
app.use('/api/v1/police-declaration', require('./routes/policeDeclarationRoutes'));

// Route Đồng bộ Kênh bán phòng trực tuyến OTA 2 chiều (Channel Manager Two-Way Sync - Module 52)
app.use('/api/channel-manager', require('./routes/channelManagerRoutes'));
app.use('/api/v1/channel-manager', require('./routes/channelManagerRoutes'));

// Route Quản lý Đặt sảnh tiệc, Hội nghị & Sự kiện đoàn (Banquet & MICE Event Booking - Module 53)
app.use('/api/banquet-events', require('./routes/banquetRoutes'));
app.use('/api/v1/banquet-events', require('./routes/banquetRoutes'));

// ─── MODULAR ROUTES /api/v1/{module}/* ────────────────────────────────────
// 👤 Bảo  — Guest Portal
app.use('/api/v1/guest',      require('./modules/guest'));

// Alias hỗ trợ FEAT-GUEST-04: Kiểm tra phòng trống & Khóa phòng trực tiếp
const roomAvailabilityController = require('./controllers/roomAvailabilityController');
app.get('/api/v1/rooms/availability',       roomAvailabilityController.checkRoomAvailability);
app.get('/api/rooms/availability',          roomAvailabilityController.checkRoomAvailability);
app.post('/api/v1/rooms/lock',              roomAvailabilityController.lockRoomSession);
app.post('/api/rooms/lock',                 roomAvailabilityController.lockRoomSession);
app.delete('/api/v1/rooms/lock/:sessionId', roomAvailabilityController.releaseRoomLock);
app.delete('/api/rooms/lock/:sessionId',    roomAvailabilityController.releaseRoomLock);

// 👤 Thực — PMS (Property Management)
app.use('/api/v1/pms',        require('./modules/pms'));

// 👤 Hà   — Services / Payment / AI
app.use('/api/v1/services',       require('./modules/services'));
app.use('/api/v1/service-orders', require('./modules/services/routes/serviceOrderRoutes'));
app.use('/api/service-orders',    require('./modules/services/routes/serviceOrderRoutes'));
app.use('/service-orders',        require('./modules/services/routes/serviceOrderRoutes'));

// FEAT-PAYMENT-01: Core Payment Module (C5)
app.use('/api/v1/payments',       require('./modules/payments'));
app.use('/api/payments',          require('./modules/payments'));
app.use('/payments',              require('./modules/payments'));

// FEAT-INVOICE-02 & FEAT-INVOICE-03: Master Folio Invoice (C7 & C8)
app.use('/api/v1/invoices',       require('./modules/services/routes/invoiceRoutes'));
app.use('/api/invoices',          require('./modules/services/routes/invoiceRoutes'));
app.use('/invoices',              require('./modules/services/routes/invoiceRoutes'));

// FEAT-REPORT-01 & FEAT-REPORT-02: Real-time Revenue & Occupancy Statistics (C11 & C12)
app.use('/api/v1/statistics',     require('./modules/statistics'));
app.use('/api/statistics',        require('./modules/statistics'));
app.use('/statistics',            require('./modules/statistics'));

// FEAT-AI-01 & FEAT-AI-02: AI Concierge Chatbot & Knowledge Base (C13 & C14)
app.use('/api/v1/ai',             require('./modules/ai'));
app.use('/api/ai',                require('./modules/ai'));
app.use('/ai',                    require('./modules/ai'));

// 👤 Trang — F&B
app.use('/api/v1/fnb',                require('./modules/fnb'));
app.use('/api/v1/fnb-orders',         require('./routes/admin/fnbOrderRoutes'));
app.use('/api/fnb-orders',            require('./routes/admin/fnbOrderRoutes'));
app.use('/api/v1/table-reservations', require('./routes/admin/tableReservationRoutes'));
app.use('/api/table-reservations',    require('./routes/admin/tableReservationRoutes'));
app.get('/api/v1/statistics/fnb',     require('./controllers/admin/fnbOrderController').getFnbStatistics);
app.post('/api/v1/ai/combo-suggestion', require('./controllers/admin/fnbOrderController').getAiComboSuggestion);

// 👤 Tuyền — Back-office Operations
app.use('/api/v1/operations', require('./modules/operations'));

// Guest search (backward compat — cũng hoạt động qua /api/v1/guest/rooms/search)
app.use('/api/v1/rooms', require('./routes/roomSearchRoutes'));
app.use('/api/rooms',    require('./routes/roomSearchRoutes'));
// FEAT-GUEST-05: Direct booking endpoint
app.post('/bookings', require('./middlewares/authMiddleware').verifyToken, require('./controllers/bookingEngineController').createOnlineBooking);

// FEAT-GUEST-06: Direct automated real-time pricing calculation endpoint
app.post('/bookings/calculate-pricing', require('./controllers/bookingEngineController').calculatePricing);
app.post('/api/bookings/calculate-pricing', require('./controllers/bookingEngineController').calculatePricing);

// FEAT-GUEST-07: Promotion & Voucher Redemption endpoints (Mã truy vết: A7)
app.use('/api/v1/vouchers', require('./routes/voucherRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.post('/bookings/apply-voucher', require('./controllers/voucherController').validateVoucher);
app.post('/api/bookings/apply-voucher', require('./controllers/voucherController').validateVoucher);
app.post('/bookings/:bookingId/apply-voucher', require('./controllers/voucherController').applyVoucherToBooking);
app.post('/api/bookings/:bookingId/apply-voucher', require('./controllers/voucherController').applyVoucherToBooking);

// FEAT-GUEST-08: Direct deposit payment & booking retrieval endpoints
app.get('/bookings/:id', require('./controllers/onlineDepositPaymentController').getBookingDetails);
app.post('/bookings/:bookingId/deposit', require('./controllers/onlineDepositPaymentController').processDepositPayment);

// FEAT-INVOICE-01: Booking Charges Aggregation (C6)
app.get('/api/v1/bookings/:bookingId/charges', require('./middlewares/authMiddleware').verifyToken, require('./modules/services/controllers/bookingChargesController').getBookingCharges);
app.get('/api/bookings/:bookingId/charges', require('./middlewares/authMiddleware').verifyToken, require('./modules/services/controllers/bookingChargesController').getBookingCharges);
app.get('/bookings/:bookingId/charges', require('./middlewares/authMiddleware').verifyToken, require('./modules/services/controllers/bookingChargesController').getBookingCharges);

// FEAT-GUEST-09: Xem lịch sử đặt phòng & Hủy phòng (Mã truy vết: A9)
app.use('/api/v1/me', require('./routes/bookingHistoryRoutes'));
app.use('/api/me',    require('./routes/bookingHistoryRoutes'));
app.use('/me',        require('./routes/bookingHistoryRoutes'));

// FEAT-GUEST-10: Cổng gửi Email xác nhận & Thông báo
const bookingQrNotificationController = require('./controllers/bookingQrNotificationController');
app.post('/api/v1/notifications/email-confirmation', bookingQrNotificationController.sendEmailConfirmation);
app.post('/api/notifications/email-confirmation', bookingQrNotificationController.sendEmailConfirmation);

// ─── Catch-all 404 Handler for API Routes (Guarantees JSON) ────────────────
app.all(['/api', '/api/*'], (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(404).json({
    success: false,
    code: 'ERROR_0004_NOT_FOUND',
    errorCode: 'ERROR_0004_NOT_FOUND',
    message: `Đường dẫn API không tồn tại: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

// Catch-all 404 for remaining non-API routes
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).send('<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>');
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Tài nguyên không tồn tại: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler (phải đặt CUỐI CÙNG) ────────────────────────────
app.use(require('./shared/middlewares/errorHandler'));

// ─── HTTP Server & WebSocket ───────────────────────────────────────────────
const server = http.createServer(app);
try {
  initSocket(server);
} catch (wsErr) {
  console.warn('⚠️ WebSocket init warning:', wsErr.message);
}

const { AuditLog } = require('./models');

// ─── Global Unhandled Error Prevention (Ngăn chặn tiến trình Node.js bị crash) ───
process.on('uncaughtException', (err) => {
  console.error('🔥 [CRITICAL] Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [CRITICAL] Unhandled Rejection:', reason);
});

// ─── Start server ──────────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`✅ Backend server with WebSocket running on port ${PORT}`);
  console.log(`   Modules: /api/v1/{guest|pms|services|fnb|operations}`);
  console.log(`   Legacy:  /api/{loai-phong|phong|v1/auth|rooms|users}`);
  if (AuditLog && AuditLog.initDatabaseTriggers) {
    await AuditLog.initDatabaseTriggers();
    console.log('[Security] Đã kích hoạt Triggers bảo vệ bất biến (WORM) cho Audit Log.');
  }
});
