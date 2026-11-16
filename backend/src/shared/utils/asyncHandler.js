'use strict';

/**
 * shared/utils/asyncHandler.js
 * Bọc controller async để tự động catch lỗi mà không cần try/catch trong mỗi hàm.
 *
 * Dùng:
 *   const asyncHandler = require('../../shared/utils/asyncHandler');
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
