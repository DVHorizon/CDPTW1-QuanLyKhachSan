'use strict';

/**
 * Shared QA Validation, Normalization & Optimistic Locking Utilities (M1.3)
 * CommonJS module for C1–C14 controllers & middlewares.
 */

const CONFLICT_MESSAGE =
  'Dữ liệu đã được cập nhật bởi phiên làm việc khác. Vui lòng tải lại trang trước khi cập nhật.';

/**
 * Convert Japanese/full-width digits & numeric symbols (０-９, ．, －, ＋) to ASCII.
 * Safe for non-string inputs (returns unchanged).
 */
function normalizeFullWidthDigits(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\uFF0E/g, '.')
    .replace(/\uFF0D/g, '-')
    .replace(/\uFF0B/g, '+');
}

/**
 * Trim ASCII whitespace plus 2-byte full-width space (\u3000), NBSP (\u00A0),
 * zero-width characters (\u200B-\u200D) and BOM (\uFEFF).
 * Safe for non-string inputs (returns '').
 */
function trimUnicode(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/^[\s\u3000\u00A0\u200B-\u200D\uFEFF]+|[\s\u3000\u00A0\u200B-\u200D\uFEFF]+$/g, '');
}

/**
 * Check if value is blank after Unicode trimming.
 * Non-string values return true.
 */
function isBlankUnicode(val) {
  return trimUnicode(val).length === 0;
}

/**
 * Strictly parse a positive integer (rejects 'abc', '1abc', '0', '-1', '1.5', floats, booleans, objects).
 * Supports full-width digit normalization by default.
 */
function parseStrictPositiveInt(val, opts = {}) {
  const {
    normalizeFullWidth = true,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
    field = 'id',
    message,
  } = opts;

  const defaultMsg = message || 'Giá trị số nguyên dương không hợp lệ';

  if (typeof val === 'number') {
    if (!Number.isSafeInteger(val) || val < min || val > max) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0004_INVALID_FORMAT',
        field,
        message: defaultMsg,
      };
    }
    return { ok: true, value: val };
  }

  if (typeof val !== 'string') {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field,
      message: defaultMsg,
    };
  }

  let str = trimUnicode(val);
  if (normalizeFullWidth) {
    str = normalizeFullWidthDigits(str);
  }

  if (!/^\d+$/.test(str)) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field,
      message: defaultMsg,
    };
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num) || num < min || num > max) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field,
      message: defaultMsg,
    };
  }

  return { ok: true, value: num };
}

/**
 * Strictly parse a numeric value (for prices, rates, quantities).
 * Rejects partial numeric strings like '12abc', NaN, Infinity, non-primitives.
 */
function parseStrictNumber(val, opts = {}) {
  const {
    normalizeFullWidth = true,
    allowDecimal = true,
    min = null,
    max = null,
    field = 'value',
    message,
  } = opts;

  const formatMsg = message || 'Giá trị số không đúng định dạng';
  let num;

  if (typeof val === 'number') {
    if (!Number.isFinite(val) || (!allowDecimal && !Number.isInteger(val))) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0004_INVALID_FORMAT',
        field,
        message: formatMsg,
      };
    }
    num = val;
  } else if (typeof val === 'string') {
    let str = trimUnicode(val);
    if (normalizeFullWidth) {
      str = normalizeFullWidthDigits(str);
    }
    const pattern = allowDecimal ? /^-?\d+(?:\.\d+)?$/ : /^-?\d+$/;
    if (!pattern.test(str)) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0004_INVALID_FORMAT',
        field,
        message: formatMsg,
      };
    }
    num = Number(str);
    if (!Number.isFinite(num)) {
      return {
        ok: false,
        status: 400,
        code: 'ERROR_0004_INVALID_FORMAT',
        field,
        message: formatMsg,
      };
    }
  } else {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field,
      message: formatMsg,
    };
  }

  if (min !== null && min !== undefined && num < min) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0012_OUT_OF_RANGE',
      field,
      message: message || `Giá trị không được nhỏ hơn ${min}`,
    };
  }

  if (max !== null && max !== undefined && num > max) {
    return {
      ok: false,
      status: 400,
      code: 'ERROR_0012_OUT_OF_RANGE',
      field,
      message: message || `Giá trị không được vượt quá ${max}`,
    };
  }

  return { ok: true, value: num };
}

/**
 * Validate URL/query pagination parameters (QA #10).
 * Returns 400 ERROR_0004_INVALID_FORMAT for invalid page/pageSize,
 * and 404 ERROR_0011_NOT_FOUND when total is provided and page > totalPages.
 */
function validatePaginationParams(query = {}, opts = {}) {
  const {
    total = null,
    defaultPageSize = 20,
    maxPageSize = 100,
    allowAll = false,
  } = opts;

  const effectiveMaxPageSize =
    allowAll && String(query?.all) === 'true' ? Math.max(maxPageSize, 1000) : maxPageSize;

  let page = 1;
  if (query?.page !== undefined && query?.page !== null) {
    const rawPage = typeof query.page === 'string' ? trimUnicode(query.page) : query.page;
    if (rawPage !== '') {
      const parsedPage = parseStrictPositiveInt(rawPage, {
        min: 1,
        field: 'page',
        message: 'Tham số trang (page) không hợp lệ',
      });
      if (!parsedPage.ok) {
        return parsedPage;
      }
      page = parsedPage.value;
    }
  }

  let pageSize = defaultPageSize;
  const rawPageSizeInput = query?.pageSize !== undefined ? query.pageSize : query?.limit;
  if (rawPageSizeInput !== undefined && rawPageSizeInput !== null) {
    const rawSize = typeof rawPageSizeInput === 'string' ? trimUnicode(rawPageSizeInput) : rawPageSizeInput;
    if (rawSize !== '') {
      const parsedSize = parseStrictPositiveInt(rawSize, {
        min: 1,
        max: effectiveMaxPageSize,
        field: 'pageSize',
        message: `Kích thước trang (pageSize) phải là số nguyên từ 1 đến ${effectiveMaxPageSize}`,
      });
      if (!parsedSize.ok) {
        return parsedSize;
      }
      pageSize = parsedSize.value;
    }
  }

  let totalPages = null;
  if (typeof total === 'number' && Number.isFinite(total) && total >= 0) {
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      return {
        ok: false,
        status: 404,
        code: 'ERROR_0011_NOT_FOUND',
        field: 'page',
        message: 'Trang không hợp lệ hoặc không tồn tại',
      };
    }
  }

  return {
    ok: true,
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    totalPages,
  };
}

/**
 * Extract expected optimistic-locking version from req.body.version / req.body.Version / If-Match header.
 */
function extractExpectedVersion(req, opts = {}) {
  const { required = false } = opts;
  let raw = req?.body?.version ?? req?.body?.Version;

  if (raw === undefined || raw === null || raw === '') {
    const ifMatch = req?.headers?.['if-match'];
    if (typeof ifMatch === 'string' && trimUnicode(ifMatch) !== '') {
      raw = trimUnicode(ifMatch).replace(/^W\//i, '').replace(/^"(.*)"$/, '$1');
    }
  }

  if (raw === undefined || raw === null || (typeof raw === 'string' && trimUnicode(raw) === '')) {
    if (required) {
      return {
        ok: false,
        provided: false,
        status: 400,
        code: 'ERROR_0001_REQUIRED',
        field: 'version',
        message: 'Thiếu thông tin phiên bản dữ liệu (version)',
      };
    }
    return { ok: true, provided: false, version: null };
  }

  const parsed = parseStrictPositiveInt(raw, {
    min: 1,
    field: 'version',
    message: 'Phiên bản dữ liệu (version) không hợp lệ',
  });
  if (!parsed.ok) {
    return {
      ok: false,
      provided: true,
      status: 400,
      code: 'ERROR_0004_INVALID_FORMAT',
      field: 'version',
      message: 'Phiên bản dữ liệu (version) không hợp lệ',
    };
  }

  return { ok: true, provided: true, version: parsed.value };
}

/**
 * Check in-memory version equality against a loaded Sequelize/DB record.
 */
function assertVersionMatch(record, expectedVersion, versionField = 'Version') {
  if (expectedVersion === null || expectedVersion === undefined || expectedVersion === '') {
    return { ok: true };
  }
  const currentVersion = Number(record?.[versionField] ?? 1);
  if (currentVersion !== Number(expectedVersion)) {
    return {
      ok: false,
      status: 409,
      code: 'ERROR_0023_CONFLICT',
      message: CONFLICT_MESSAGE,
    };
  }
  return { ok: true };
}

/**
 * Execute an atomic Sequelize UPDATE incrementing Version = COALESCE(Version, 1) + 1.
 * Enforces WHERE ... AND Version = expectedVersion when expectedVersion is provided.
 */
async function atomicVersionUpdate(
  Model,
  {
    where,
    updates = {},
    expectedVersion = null,
    versionField = 'Version',
    transaction = null,
    notFoundMessage = 'Bản ghi không tồn tại hoặc đã bị xoá',
  }
) {
  const hasExpected = expectedVersion !== null && expectedVersion !== undefined && expectedVersion !== '';
  let parsedVer = null;

  if (hasExpected) {
    const vCheck = parseStrictPositiveInt(expectedVersion, {
      min: 1,
      field: 'version',
      message: 'Phiên bản dữ liệu (version) không hợp lệ',
    });
    if (!vCheck.ok) {
      return vCheck;
    }
    parsedVer = vCheck.value;
  }

  const updateWhere = hasExpected
    ? { ...where, [versionField]: parsedVer }
    : { ...where };

  const [affectedRows] = await Model.update(
    {
      ...updates,
      [versionField]: Model.sequelize.literal(`COALESCE(\`${versionField}\`, 1) + 1`),
    },
    { where: updateWhere, transaction }
  );

  if (affectedRows > 0) {
    return { ok: true, affectedRows };
  }

  const existing = await Model.findOne({ where, transaction });
  if (!existing) {
    return {
      ok: false,
      status: 404,
      code: 'ERROR_0011_NOT_FOUND',
      message: notFoundMessage,
    };
  }

  return {
    ok: false,
    status: 409,
    code: 'ERROR_0023_CONFLICT',
    message: CONFLICT_MESSAGE,
  };
}

/**
 * Convenience wrapper around atomicVersionUpdate that fetches and returns the updated record.
 */
async function updateWithOptimisticLock({
  Model,
  pkField,
  id,
  expectedVersion = null,
  updates = {},
  extraWhere = {},
  transaction = null,
  versionField = 'Version',
  notFoundMessage = 'Bản ghi không tồn tại hoặc đã bị xoá',
}) {
  const where = { [pkField]: id, ...extraWhere };
  const result = await atomicVersionUpdate(Model, {
    where,
    updates,
    expectedVersion,
    versionField,
    transaction,
    notFoundMessage,
  });

  if (!result.ok) {
    return result;
  }

  const record = await Model.findByPk(id, { transaction });
  return {
    ok: true,
    affectedRows: result.affectedRows,
    record,
  };
}

/**
 * Send standardized error response from any validation/lock result object.
 */
function sendValidationError(res, result) {
  return res.status(result?.status || 400).json({
    success: false,
    code: result?.code || 'ERROR_0004_INVALID_FORMAT',
    ...(result?.field ? { field: result.field } : {}),
    message: result?.message || 'Dữ liệu không hợp lệ',
  });
}

module.exports = {
  CONFLICT_MESSAGE,
  normalizeFullWidthDigits,
  trimUnicode,
  isBlankUnicode,
  parseStrictPositiveInt,
  parseStrictNumber,
  validatePaginationParams,
  extractExpectedVersion,
  assertVersionMatch,
  atomicVersionUpdate,
  updateWithOptimisticLock,
  sendValidationError,
};
