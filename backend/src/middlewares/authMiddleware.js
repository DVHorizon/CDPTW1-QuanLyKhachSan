const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_key_2026_luxury_hotel';

/**
 * Middleware xác thực JWT token từ Header Authorization
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy mã xác thực (Token). Vui lòng đăng nhập.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Mã xác thực không hợp lệ.'
    });
  }
};

module.exports = {
  verifyToken,
  JWT_SECRET
};
