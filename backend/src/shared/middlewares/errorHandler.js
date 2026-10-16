'use strict';

/**
 * shared/middlewares/errorHandler.js
 * Global error handler — mount cuối cùng trong server.js.
 *
 * Dùng trong server.js:
 *   app.use(require('./shared/middlewares/errorHandler'));
 */

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message || err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      code:    'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      errors:  err.errors.map(e => ({ field: e.path, message: e.message })),
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      code:    'DUPLICATE_ENTRY',
      message: 'Dữ liệu đã tồn tại',
      timestamp: new Date().toISOString(),
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code:    'UNAUTHORIZED',
      message: 'Token không hợp lệ hoặc đã hết hạn',
      timestamp: new Date().toISOString(),
    });
  }

  // Mặc định 500
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    code:    'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.'
      : (err.message || 'Lỗi máy chủ'),
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
