const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/v1/auth/register - Đăng ký tài khoản khách mới
router.post('/register', authController.register);

// POST /api/v1/auth/login - Đăng nhập hệ thống, trả về JWT token
router.post('/login', authController.login);

// POST /api/v1/auth/google - Đăng nhập / Đăng ký nhanh qua Google OAuth
router.post('/google', authController.googleLogin);

// POST /api/v1/auth/facebook - Đăng nhập / Đăng ký nhanh qua Facebook OAuth
router.post('/facebook', authController.facebookLogin);

// GET /api/v1/auth/me - Lấy thông tin tài khoản hiện tại từ JWT token
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
