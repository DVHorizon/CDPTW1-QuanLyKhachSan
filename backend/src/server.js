const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
