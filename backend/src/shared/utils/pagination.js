'use strict';

/**
 * shared/utils/pagination.js
 * Helper parse tham số phân trang từ query string.
 *
 * Dùng:
 *   const { parsePage } = require('../../shared/utils/pagination');
 *   const { page, limit, offset } = parsePage(req);
 */

/**
 * Trả về { page, limit, offset } từ req.query
 * Mặc định: page=1, limit=20. Tối đa limit=100.
 */
function parsePage(req, defaultLimit = 20) {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || String(defaultLimit), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { parsePage };
