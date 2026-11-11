/**
 * frontend/src/utils/toastSanitizer.js
 * Tiện ích làm sạch thông báo người dùng và ghi log kỹ thuật ra Console.
 * Đảm bảo 100% UI chỉ hiển thị tiếng Việt tự nhiên, mã kỹ thuật lưu log có cấu trúc.
 */

// Bảng ánh xạ thông báo tiếng Việt lịch sự chuẩn mực
export const VIETNAMESE_ERROR_MESSAGES = {
  ERROR_0001_REQUIRED: 'Vui lòng điền đầy đủ các thông tin bắt buộc.',
  ERROR_0002_MIN_LENGTH: 'Dữ liệu nhập vào quá ngắn so với yêu cầu tối thiểu.',
  ERROR_0003_MAX_LENGTH: 'Dữ liệu nhập vào vượt quá độ dài tối đa cho phép.',
  ERROR_0004_INVALID_FORMAT: 'Định dạng dữ liệu không hợp lệ.',
  ERROR_0005_PASSWORD_WEAK: 'Mật khẩu chưa đủ độ an toàn (tối thiểu 6 ký tự).',
  ERROR_0007_DUPLICATE: 'Dữ liệu đã tồn tại trong hệ thống.',
  ERROR_0009_UNAUTHENTICATED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  ERROR_0010_FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
  ERROR_0012_OUT_OF_RANGE: 'Giá trị nằm ngoài khoảng cho phép.',
  ERROR_0015_HAS_RELATED_DATA: 'Không thể xóa do bản ghi đang có liên kết dữ liệu.',
  ERROR_0016_NO_ITEM_SELECTED: 'Vui lòng chọn ít nhất một mục để thao tác.',
  ERROR_0017_ALREADY_EXISTS: 'Bản ghi này đã tồn tại trên hệ thống.',
  ERROR_0018_GENERATION_FAILED: 'Khởi tạo tài liệu không thành công.',
  ERROR_0019_STORAGE_FAILED: 'Lưu trữ tài liệu thất bại.',
  ERROR_0021_CHECKIN_TRANSACTION: 'Không thể hoàn tất thủ tục nhận phòng.',
  ERROR_0030_ALLOCATION_TRANSACTION: 'Không thể xử lý giao dịch phân bổ buồng phòng.',
  ERROR_NETWORK: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.',
};

/**
 * Loại bỏ mã lỗi kỹ thuật (ERROR_..., SUCCESS_..., INFO_..., WARN_...) khỏi chuỗi thông báo
 * Xử lý triệt để mã trong ngoặc, mã lồng nhau, mã prefix, mã bare và ký tự phân cách sót lại.
 * @param {string|any} rawMsg - Thông điệp thô từ API, Exception hoặc Form validation
 * @returns {string} - Chuỗi tiếng Việt thuần túy, sạch sẽ hiển thị trên Toast UI
 */
export const cleanMessage = (rawMsg) => {
  if (!rawMsg) return '';
  let str = '';
  if (typeof rawMsg === 'string') {
    str = rawMsg;
  } else if (rawMsg && typeof rawMsg === 'object') {
    str = rawMsg.message || rawMsg.msg || rawMsg.error || '';
    if (typeof str !== 'string') {
      str = String(str);
    }
  } else {
    str = String(rawMsg);
  }

  if (!str.trim()) return '';

  // 1. Loại bỏ các mã kỹ thuật nằm trong ngoặc (hỗ trợ lồng nhau, giới hạn an toàn tối đa 5 vòng lặp)
  const bracketCodeRegex = /\s*[\(\[\{<]\s*(?:ERROR|SUCCESS|INFO|WARN|ERR)_[A-Z0-9_]+\s*[\)\]\}>]\s*/gi;
  let prevStr = '';
  let iter = 0;
  while (str !== prevStr && iter < 5) {
    prevStr = str;
    iter++;
    str = str.replace(bracketCodeRegex, ' ');
  }

  // 2. Loại bỏ các cặp ngoặc rỗng còn sót lại sau khi bóc tách mã lồng nhau (( )) -> ( ) -> ''
  let prevBracket = '';
  iter = 0;
  while (str !== prevBracket && iter < 5) {
    prevBracket = str;
    iter++;
    str = str.replace(/\s*(?:\(\s*\)|\[\s*\]|\{\s*\}|<\s*>)\s*/g, ' ');
  }

  // 3. Loại bỏ tiền tố mã kỹ thuật ở đầu chuỗi dạng prefix: ERROR_0001: hoặc [ERROR_0001] -
  str = str.replace(/^\[?[A-Z0-9_]+\]?[:\s-]+/g, '');

  // 4. Loại bỏ mã lỗi bare hoặc kỹ thuật đứng độc lập còn sót lại
  str = str.replace(/\b(?:ERROR|SUCCESS|INFO|WARN|ERR)_[A-Z0-9_]+\b/gi, ' ');

  // 5. Dọn sạch ký tự phân cách thừa sót lại ở đầu chuỗi (-, –, —, :, ;, ., ngoặc cụt, khoảng trắng)
  str = str.replace(/^[\s\(\[\-–—:;,.]+/g, '');

  // 6. Dọn sạch ký tự phân cách thừa sót lại ở cuối chuỗi (-, –, —, :, ;, khoảng trắng)
  str = str.replace(/[\s\-–—:;,]+$/g, '');

  // 7. Chuẩn hóa khoảng trắng và dấu câu tiếng Việt
  str = str
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  return str;
};

/**
 * Trích xuất mã kỹ thuật từ chuỗi thông báo hoặc error object
 * @param {string|any} rawMsg
 * @param {string|null} fallbackCode
 * @returns {string|null}
 */
export const extractErrorCode = (rawMsg, fallbackCode = null) => {
  if (fallbackCode) return String(fallbackCode);
  if (!rawMsg) return null;
  const str = typeof rawMsg === 'string'
    ? rawMsg
    : (rawMsg.code || rawMsg.response?.data?.code || rawMsg.data?.code || rawMsg.error?.code || rawMsg.message || '');
  const match = typeof str === 'string' ? str.match(/(?:ERROR|SUCCESS|INFO|WARN|ERR)_[A-Z0-9_]+/i) : null;
  return match ? match[0].toUpperCase() : null;
};

/**
 * Ghi log kỹ thuật có cấu trúc ra trình duyệt Console với badge màu
 */
export const logSystemEvent = ({ code, message, rawMessage, type = 'info', context = null }) => {
  const timestamp = new Date().toISOString();
  const meta = {
    code: code || 'N/A',
    userMessage: message,
    rawMessage: rawMessage || message,
    timestamp,
    ...(context ? { context } : {}),
  };

  const isErr = type === 'error' || (code && code.startsWith('ERROR_'));
  const isWarn = type === 'warning' || type === 'warn';
  const isSuccess = type === 'success' || (code && code.startsWith('SUCCESS_'));

  if (isErr) {
    console.error(`%c[Hệ Thống] Mã lỗi kỹ thuật: ${code || 'ERROR'}`, 'color: #ef4444; font-weight: bold;', meta);
  } else if (isWarn) {
    console.warn(`%c[Hệ Thống] Cảnh báo nghiệp vụ: ${code || 'WARNING'}`, 'color: #f59e0b; font-weight: bold;', meta);
  } else if (isSuccess) {
    console.log(`%c[Hệ Thống] Thao tác thành công: ${code || 'SUCCESS'}`, 'color: #10b981; font-weight: bold;', meta);
  } else {
    console.log(`%c[Hệ Thống] Thông báo: ${code || 'INFO'}`, 'color: #2563eb; font-weight: bold;', meta);
  }
};
