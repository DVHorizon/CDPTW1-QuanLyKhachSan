'use strict';

/**
 * shared/utils/response.js
 * Format response chuẩn cho mọi API trong hệ thống.
 * Dùng: const { success, error, paginated } = require('../../shared/utils/response');
 */

/**
 * Trả về response thành công
 * @param {Response} res - Express response object
 * @param {*} data - Dữ liệu trả về
 * @param {string} [message] - Thông báo (tùy chọn)
 * @param {number} [statusCode=200] - HTTP status code
 */
function success(res, data, message = 'Thành công', statusCode = 200) {
  return res.status(statusCode).json({
    success:   true,
    code:      'SUCCESS',
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Trả về response thành công có phân trang
 */
function paginated(res, data, { page, limit, total }, message = 'Thành công') {
  return res.status(200).json({
    success:   true,
    code:      'SUCCESS',
    message,
    data,
    meta: {
      page:       Number(page),
      limit:      Number(limit),
      total:      Number(total),
      totalPages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Trả về response lỗi
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status (400, 401, 403, 404, 409, 500)
 * @param {string} message - Thông báo lỗi
 * @param {string} [code='ERROR'] - Mã lỗi nội bộ
 * @param {Array} [errors=[]] - Chi tiết lỗi validation
 */
function error(res, statusCode, message, code = 'ERROR', errors = []) {
  const body = {
    success:   false,
    code,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors.length) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { success, paginated, error };
