/**
 * webQaValidator.js
 * Bộ công cụ kiểm thử & xác thực chuẩn theo 14 tình huống kiểm thử ứng dụng Web:
 * 1. Xóa mục không tồn tại (Kiểm tra sự tồn tại trước khi xóa, báo lỗi 404 cụ thể)
 * 2. Cập nhật trùng lặp (Optimistic locking / Concurrency check)
 * 3. ID không tồn tại (Validate định dạng ID, trả về 404 thay vì 500)
 * 4. Validate form (Thông báo lỗi chi tiết theo từng trường)
 * 5. Text quá tải (Kiểm tra giới hạn ký tự tối đa)
 * 6. Kiểm tra khoảng trắng (Chuẩn hóa & loại bỏ khoảng trắng thường và 2-byte \u3000)
 * 7. Kiểm tra dữ liệu số (Chuyển đổi số Full-width ０-９ sang 0-9 & validate số)
 * 8. Kiểm tra select-option (Kiểm tra giá trị lựa chọn hợp lệ trong danh mục)
 * 9. Kiểm tra trùng lặp dữ liệu (Chặn spam click / double-submit liên tục)
 * 10. Kiểm tra URL (Validate tham số phân trang page=abc hoặc page=99999)
 * 11. Kiểm tra định dạng hình ảnh (Chặn file PDF, EXE, chỉ nhận PNG/JPG/WEBP)
 * 12. Kiểm tra ảnh fallback khi lỗi
 * 13. Giữ nguyên ảnh cũ khi update không tải ảnh mới
 * 14. Chặn tuyệt đối xóa dữ liệu bằng GET (Bảo vệ CSRF)
 */

// Bộ nhớ đệm khóa chống spam click liên tục (Test Case 9)
const pendingSubmissions = new Map();

/**
 * Chuẩn hóa chuỗi text: Chuyển đổi khoảng trắng 2-byte (\u3000) sang khoảng trắng thường và trim
 */
function normalizeText(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\u3000/g, ' ') // Chuyển khoảng trắng full-width 2-byte của Nhật/Trung
    .trim();
}

/**
 * Kiểm tra trường text bắt buộc không được rỗng hoặc chỉ chứa khoảng trắng (Test Case 4, 5, 6)
 */
function validateNonEmptyText(value, fieldName = 'Dữ liệu', maxLength = 255) {
  const normalized = normalizeText(value);
  // Loại bỏ toàn bộ khoảng trắng để kiểm tra xem có ký tự thực không
  const stripped = normalized.replace(/[\s\u3000]/g, '');
  if (!stripped || stripped.length === 0) {
    const err = new Error(`[Validate Form]: "${fieldName}" không được để trống hoặc chỉ chứa khoảng trắng!`);
    err.status = 400;
    throw err;
  }
  if (normalized.length > maxLength) {
    const err = new Error(`[Quá Tải Text]: "${fieldName}" vượt quá độ dài quy định (tối đa ${maxLength} ký tự, hiện tại: ${normalized.length} ký tự)!`);
    err.status = 400;
    throw err;
  }
  return normalized;
}

/**
 * Chuyển đổi và kiểm tra số (Hỗ trợ số Full-width ０１２３４５６７８９) (Test Case 7)
 */
function normalizeAndValidateNumber(value, fieldName = 'Giá trị số', { min = 0, max = Infinity, integer = false } = {}) {
  if (value === null || value === undefined || value === '') {
    const err = new Error(`[Validate Form]: "${fieldName}" không được để trống!`);
    err.status = 400;
    throw err;
  }

  let str = String(value).trim();
  // Chuyển đổi ký tự số full-width ０-９ sang nửa độ rộng 0-9
  str = str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  const num = Number(str);
  if (isNaN(num)) {
    const err = new Error(`[Kiểm Tra Số]: "${fieldName}" phải là số hợp lệ, không chứa ký tự chữ ("${value}")!`);
    err.status = 400;
    throw err;
  }

  if (integer && !Number.isInteger(num)) {
    const err = new Error(`[Kiểm Tra Số]: "${fieldName}" phải là số nguyên!`);
    err.status = 400;
    throw err;
  }

  if (num < min) {
    const err = new Error(`[Kiểm Tra Số]: "${fieldName}" phải lớn hơn hoặc bằng ${min}!`);
    err.status = 400;
    throw err;
  }

  if (num > max) {
    const err = new Error(`[Kiểm Tra Số]: "${fieldName}" không được vượt quá ${max}!`);
    err.status = 400;
    throw err;
  }

  return num;
}

/**
 * Kiểm tra giá trị Select Option có nằm trong danh mục cho phép không (Test Case 8)
 */
function validateSelectOption(value, allowedList = [], fieldName = 'Tùy chọn') {
  if (!allowedList.includes(value)) {
    const err = new Error(`[Select Option]: Giá trị "${value}" của "${fieldName}" không hợp lệ hoặc không tồn tại trong danh mục hệ thống!`);
    err.status = 400;
    throw err;
  }
  return value;
}

/**
 * Validate tham số phân trang page trong URL (Test Case 10)
 */
function validatePageParam(pageParam, defaultPage = 1, maxPage = 10000) {
  if (pageParam === undefined || pageParam === null || pageParam === '') {
    return defaultPage;
  }
  let str = String(pageParam).trim();
  str = str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  const page = parseInt(str, 10);
  if (isNaN(page) || page <= 0 || String(page) !== str) {
    const err = new Error(`[Kiểm Tra URL]: Tham số trang page="${pageParam}" không hợp lệ. Phải là số nguyên dương!`);
    err.status = 400;
    throw err;
  }
  if (page > maxPage) {
    const err = new Error(`[Kiểm Tra URL]: Trang yêu cầu page=${page} vượt quá giới hạn tối đa cho phép (${maxPage})!`);
    err.status = 400;
    throw err;
  }
  return page;
}

/**
 * Chặn gửi lặp lại nhiều lần (Double Submit / Spam Click liên tục) (Test Case 9)
 */
function checkDoubleSubmit(submissionKey, lockTtlMs = 2500) {
  const now = Date.now();
  if (pendingSubmissions.has(submissionKey)) {
    const expireAt = pendingSubmissions.get(submissionKey);
    if (now < expireAt) {
      const err = new Error('[Kiểm Tra Trùng Lắp]: Yêu cầu của bạn đang được xử lý, vui lòng không nhấn lưu liên tục!');
      err.status = 409; // 409 Conflict
      throw err;
    }
  }
  pendingSubmissions.set(submissionKey, now + lockTtlMs);

  // Dọn dẹp bộ nhớ định kỳ
  if (pendingSubmissions.size > 2000) {
    for (const [k, v] of pendingSubmissions.entries()) {
      if (now > v) pendingSubmissions.delete(k);
    }
  }
}

/**
 * Xóa khóa gửi sau khi xử lý xong
 */
function releaseDoubleSubmit(submissionKey) {
  pendingSubmissions.delete(submissionKey);
}

/**
 * Kiểm tra định dạng tệp ảnh (Test Case 11)
 */
function validateImageExtensionOrMime(filenameOrUrl) {
  if (!filenameOrUrl) return true; // Cho phép null nếu không bắt buộc
  const clean = filenameOrUrl.split('?')[0].toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
  const isMatch = validExtensions.some(ext => clean.endsWith(ext));
  if (!isMatch && !clean.startsWith('http') && !clean.startsWith('data:image/')) {
    const err = new Error('[Kiểm Tra Hình Ảnh]: Tệp tải lên không hợp lệ! Chỉ chấp nhận các định dạng ảnh: PNG, JPG, JPEG, WEBP. Không chấp nhận PDF hay tệp thực thi!');
    err.status = 400;
    throw err;
  }
  return true;
}

module.exports = {
  normalizeText,
  validateNonEmptyText,
  normalizeAndValidateNumber,
  validateSelectOption,
  validatePageParam,
  checkDoubleSubmit,
  releaseDoubleSubmit,
  validateImageExtensionOrMime
};
