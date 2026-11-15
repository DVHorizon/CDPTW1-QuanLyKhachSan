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

  if (res.headersSent) {
    return next(err);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle SyntaxError from express.json() (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'ERROR_0002_INVALID_FORMAT',
      errorCode: 'ERROR_0002_INVALID_FORMAT',
      message: 'Dữ liệu JSON gửi lên không đúng định dạng',
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      errorCode: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      errors: err.errors ? err.errors.map(e => ({ field: e.path, message: e.message })) : [],
      timestamp: new Date().toISOString(),
    });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      errorCode: 'DUPLICATE_ENTRY',
      message: 'Dữ liệu đã tồn tại',
      timestamp: new Date().toISOString(),
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      errorCode: 'UNAUTHORIZED',
      message: 'Token không hợp lệ hoặc đã hết hạn',
      timestamp: new Date().toISOString(),
    });
  }

  // Mặc định 500
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    errorCode: err.code || err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.'
      : (err.message || 'Lỗi máy chủ'),
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
