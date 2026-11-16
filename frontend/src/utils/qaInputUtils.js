/**
 * frontend/src/utils/qaInputUtils.js
 * Pure ES module helpers for QA Scenarios #2, #6, #7, #10, #12 (Node.js & Vite compatible).
 */

export const CONFLICT_RELOAD_MESSAGE =
  'Dữ liệu đã được cập nhật bởi phiên làm việc khác. Vui lòng tải lại trang trước khi cập nhật.';

/**
 * Convert Japanese/full-width digits & numeric punctuation (０-９, ．, －, ＋) to ASCII.
 */
export function normalizeFullWidthDigits(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\uFF0E/g, '.')
    .replace(/\uFF0D/g, '-')
    .replace(/\uFF0B/g, '+');
}

/**
 * Trim ASCII whitespace as well as 2-byte ideographic space (\u3000), NBSP (\u00A0),
 * zero-width characters (\u200B-\u200D), and BOM (\uFEFF).
 */
export function trimUnicode(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(
    /^[\s\u3000\u00A0\u200B-\u200D\uFEFF]+|[\s\u3000\u00A0\u200B-\u200D\uFEFF]+$/g,
    ''
  );
}

/**
 * Returns true when value is empty or contains only Unicode/ASCII whitespace.
 */
export function isBlankUnicode(val) {
  return trimUnicode(val).length === 0;
}

/**
 * Validate URL page query parameter (QA Scenario #10).
 * Accepts URLSearchParams, query string (e.g. '?page=2'), or plain object ({ page: '2' }).
 */
export function parseUrlPageParam(searchParams, paramName = 'page', totalPages = null) {
  let raw = null;

  if (searchParams instanceof URLSearchParams) {
    raw = searchParams.has(paramName) ? searchParams.get(paramName) : null;
  } else if (typeof searchParams === 'string') {
    const qs = searchParams.startsWith('?') ? searchParams.slice(1) : searchParams;
    const usp = new URLSearchParams(qs);
    raw = usp.has(paramName) ? usp.get(paramName) : null;
  } else if (searchParams && typeof searchParams === 'object') {
    if (Object.prototype.hasOwnProperty.call(searchParams, paramName)) {
      raw = searchParams[paramName] == null ? '' : String(searchParams[paramName]);
    }
  }

  if (raw === null) {
    return { valid: true, page: 1, raw: null, error: null };
  }

  const trimmed = trimUnicode(raw);
  if (!trimmed) {
    return {
      valid: false,
      page: 1,
      raw,
      error: 'Tham số trang không hợp lệ. Số trang phải là số nguyên dương.',
    };
  }

  const norm = normalizeFullWidthDigits(trimmed);
  if (!/^\d+$/.test(norm)) {
    return {
      valid: false,
      page: 1,
      raw,
      error: 'Tham số trang không hợp lệ. Số trang phải là số nguyên dương.',
    };
  }

  const parsedPage = Number(norm);
  if (!Number.isSafeInteger(parsedPage) || parsedPage < 1) {
    return {
      valid: false,
      page: 1,
      raw,
      error: 'Tham số trang không hợp lệ. Số trang phải là số nguyên dương.',
    };
  }

  if (totalPages !== null && totalPages !== undefined) {
    const tp = Number(totalPages);
    if (Number.isFinite(tp)) {
      if (tp === 0 && parsedPage > 1) {
        return {
          valid: false,
          page: parsedPage,
          raw,
          error: `Trang ${parsedPage} không tồn tại.`,
        };
      }
      if (tp >= 1 && parsedPage > tp) {
        return {
          valid: false,
          page: parsedPage,
          raw,
          error: `Trang ${parsedPage} không tồn tại (chỉ có ${tp} trang).`,
        };
      }
    }
  }

  return { valid: true, page: parsedPage, raw, error: null };
}

/**
 * Self-contained inline SVG fallback image (zero network dependency, QA Scenario #12).
 */
export const DEFAULT_IMAGE_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">' +
      '<rect width="320" height="220" rx="12" fill="#0f172a"/>' +
      '<rect x="12" y="12" width="296" height="196" rx="8" fill="#1e293b" stroke="#334155" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<path d="M128 118l22-24 18 18 14-14 26 28H128z" fill="#64748b"/>' +
      '<circle cx="144" cy="82" r="9" fill="#94a3b8"/>' +
      '<text x="160" y="156" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#cbd5e1">Không thể hiển thị ảnh</text>' +
      '</svg>'
  );

/**
 * Safe img onError handler applying DEFAULT_IMAGE_FALLBACK without infinite loops.
 */
export function handleImageError(event, fallbackSrc = DEFAULT_IMAGE_FALLBACK) {
  const img = event?.currentTarget;
  if (!img) return;
  if (img.dataset && img.dataset.fallbackApplied === '1') return;
  if (img.dataset) {
    img.dataset.fallbackApplied = '1';
  }
  img.onerror = null;
  img.src = fallbackSrc;
}

/**
 * Detect HTTP 409 Conflict / ERROR_0023_CONFLICT from fetch/API error or response objects (QA Scenario #2).
 */
export function isConflict409(errOrRes) {
  if (!errOrRes || typeof errOrRes !== 'object') return false;
  if (
    Number(errOrRes.status) === 409 ||
    Number(errOrRes.statusCode) === 409 ||
    Number(errOrRes.response?.status) === 409
  ) {
    return true;
  }
  const code =
    errOrRes.code ||
    errOrRes.errorCode ||
    errOrRes.data?.code ||
    errOrRes.data?.errorCode ||
    errOrRes.response?.data?.code ||
    errOrRes.response?.data?.errorCode;
  return code === 'ERROR_0023_CONFLICT';
}
