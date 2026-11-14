const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/v1/auth/register - Đăng ký tài khoản khách mới
router.post('/register', authController.register);

// POST /api/v1/auth/login - Đăng nhập hệ thống, trả về JWT token
router.post('/login', authController.login);

// POST /api/v1/auth/forgot-password - Yêu cầu mã OTP 6 số khôi phục mật khẩu
router.post('/forgot-password', authController.forgotPassword);

// POST /api/v1/auth/reset-password - Xác thực OTP và đặt lại mật khẩu mới
router.post('/reset-password', authController.resetPassword);

// POST /api/v1/auth/google - Đăng nhập / Đăng ký nhanh qua Google OAuth
router.post('/google', authController.googleLogin);

// POST /api/v1/auth/facebook - Đăng nhập / Đăng ký nhanh qua Facebook OAuth
router.post('/facebook', authController.facebookLogin);

// GET /api/v1/auth/me - Lấy thông tin tài khoản hiện tại từ JWT token
router.get('/me', verifyToken, authController.getMe);

// PUT /api/v1/auth/me - Cập nhật hồ sơ cá nhân
router.put('/me', verifyToken, authController.updateProfile);

// PUT /api/v1/auth/change-password - Đổi mật khẩu tài khoản
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
