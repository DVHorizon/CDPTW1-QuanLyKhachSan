'use strict';

/**
 * challenger_m1_toast_stress.mjs
 * Empirical Challenger Stress Harness for frontend/src/utils/toastSanitizer.js:
 * Tests boundary strings, nested error tags, empty string, multiple error codes,
 * Unicode normalization, object inputs, edge cases, and fallback behavior.
 */

import assert from 'assert';
import {
  cleanMessage,
  extractErrorCode,
  logSystemEvent,
  VIETNAMESE_ERROR_MESSAGES
} from '../../frontend/src/utils/toastSanitizer.js';

console.log('================================================================');
console.log('🔥 EMPIRICAL CHALLENGER: FRONTEND TOAST SANITIZER STRESS TEST');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function check(desc, condition, actual, expected) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${desc}\n      Actual:   ${JSON.stringify(actual)}\n      Expected: ${JSON.stringify(expected)}`);
  }
}

// 1. EMPTY & FALSY INPUTS
console.log('👉 [1] Kiểm tra các đầu vào rỗng và Falsy...');
check('cleanMessage(null) trả về chuỗi rỗng', cleanMessage(null) === '', cleanMessage(null), '');
check('cleanMessage(undefined) trả về chuỗi rỗng', cleanMessage(undefined) === '', cleanMessage(undefined), '');
check('cleanMessage("") trả về chuỗi rỗng', cleanMessage('') === '', cleanMessage(''), '');
check('cleanMessage("   ") trả về chuỗi rỗng', cleanMessage('   ') === '', cleanMessage('   '), '');
check('cleanMessage(0) trả về chuỗi rỗng', cleanMessage(0) === '', cleanMessage(0), '');
check('cleanMessage(false) trả về chuỗi rỗng', cleanMessage(false) === '', cleanMessage(false), '');

// 2. STANDARD TECHNICAL ERROR CODES IN PARENTHESES / BRACKETS
console.log('\n👉 [2] Kiểm tra bóc tách mã lỗi kỹ thuật chuẩn trong ngoặc...');
{
  const input = 'Tên dịch vụ không được để trống (ERROR_0001_REQUIRED)';
  const expected = 'Tên dịch vụ không được để trống';
  const res = cleanMessage(input);
  check('Bóc (ERROR_0001_REQUIRED) ở cuối câu', res === expected, res, expected);
}
{
  const input = '(ERROR_0004) Định dạng giá dịch vụ không hợp lệ!';
  const expected = 'Định dạng giá dịch vụ không hợp lệ!';
  const res = cleanMessage(input);
  check('Bóc (ERROR_0004) ở đầu câu', res === expected, res, expected);
}
{
  const input = 'Cảnh báo [WARN_0002_TIMEOUT] kết nối chậm';
  const expected = 'Cảnh báo kết nối chậm';
  const res = cleanMessage(input);
  check('Bóc [WARN_0002_TIMEOUT] ở giữa câu', res === expected, res, expected);
}
{
  const input = 'Thành công [SUCCESS_0001_CREATED] đã tạo bản ghi';
  const expected = 'Thành công đã tạo bản ghi';
  const res = cleanMessage(input);
  check('Bóc [SUCCESS_0001_CREATED] trong ngoặc vuông', res === expected, res, expected);
}

// 3. PREFIX FORMAT CODES
console.log('\n👉 [3] Kiểm tra mã lỗi dạng Prefix (ERROR_...: hoặc [ERROR_...] -)...');
{
  const input = 'ERROR_0001_REQUIRED: Vui lòng nhập số điện thoại';
  const expected = 'Vui lòng nhập số điện thoại';
  const res = cleanMessage(input);
  check('Bóc prefix ERROR_0001_REQUIRED:', res === expected, res, expected);
}
{
  const input = '[ERROR_0010_FORBIDDEN] - Không có quyền truy cập';
  const expected = 'Không có quyền truy cập';
  const res = cleanMessage(input);
  check('Bóc prefix [ERROR_0010_FORBIDDEN] -', res === expected, res, expected);
}

// 4. MULTIPLE ERROR CODES
console.log('\n👉 [4] Kiểm tra nhiều mã lỗi đồng thời trong một chuỗi...');
{
  const input = '(ERROR_0001_REQUIRED) (ERROR_0004_INVALID_FORMAT) Dữ liệu nhập vào chưa đúng';
  const expected = 'Dữ liệu nhập vào chưa đúng';
  const res = cleanMessage(input);
  check('Bóc 2 mã liên tiếp ở đầu chuỗi', res === expected, res, expected);
}
{
  const input = 'Lỗi [ERROR_0002] và lỗi (ERROR_0003) phát sinh cùng lúc';
  const expected = 'Lỗi và lỗi phát sinh cùng lúc';
  const res = cleanMessage(input);
  check('Bóc nhiều mã phân tán ở giữa chuỗi', res === expected, res, expected);
}

// 5. NESTED & MALFORMED TAGS (BOUNDARY / ADVERSARIAL)
console.log('\n👉 [5] Kiểm tra lồng nhau và thẻ bất thường (Nested & Malformed)...');
{
  const input = '((ERROR_0001_REQUIRED)) Lỗi lồng ngoặc kép';
  const res = cleanMessage(input);
  // Đo lường xem còn sót mã kỹ thuật ERROR_ không
  const hasErrorCode = /ERROR_[A-Z0-9_]+/i.test(res);
  check('Không còn mã ERROR_ trong lồng ngoặc kép ((ERROR_...))', !hasErrorCode, res, 'Không chứa ERROR_');
}
{
  const input = '[(ERROR_0001_REQUIRED)] Lỗi lồng ngoặc vuông tròn';
  const res = cleanMessage(input);
  const hasErrorCode = /ERROR_[A-Z0-9_]+/i.test(res);
  check('Không còn mã ERROR_ trong lồng ngoặc vuông tròn [(ERROR_...)]', !hasErrorCode, res, 'Không chứa ERROR_');
}
{
  const input = '(ERROR_0001_REQUIRED (ERROR_0002_MIN_LENGTH)) Hai mã lồng nhau';
  const res = cleanMessage(input);
  const hasErrorCode = /ERROR_[A-Z0-9_]+/i.test(res);
  console.log(`      [Adversarial Note] Chuỗi sau khi clean: "${res}"`);
  check('Hai mã lồng nhau không làm sập hàm cleanMessage', typeof res === 'string', res, 'string');
}

// 6. UNICODE & VIETNAMESE ACCENTS & EMOJIS
console.log('\n👉 [6] Kiểm tra chuỗi tiếng Việt Unicode, ký tự có dấu, Emojis...');
{
  const input = '⚠️ Cảnh báo: (ERROR_0010_FORBIDDEN) Bạn không có quyền truy cập khu vực này! 🚫🔒';
  const expected = '⚠️ Cảnh báo: Bạn không có quyền truy cập khu vực này! 🚫🔒';
  const res = cleanMessage(input);
  check('Giữ nguyên Unicode emojis và dấu câu tiếng Việt', res === expected, res, expected);
}
{
  // Unicode NFD (tổ hợp) vs NFC (dựng sẵn)
  const nfdStr = 'Tiếng Việt kiểm thử (ERROR_0001_REQUIRED) hoàn tất'.normalize('NFD');
  const res = cleanMessage(nfdStr);
  const hasErrorCode = /ERROR_[A-Z0-9_]+/i.test(res);
  check('Xử lý mượt mà Unicode NFD (không sót mã lỗi)', !hasErrorCode, res, 'NFD clean');
}

// 7. INPUT LÀ OBJECT HOẶC ERROR INSTANCE
console.log('\n👉 [7] Kiểm tra đầu vào là Object / Error instance...');
{
  const obj = { message: 'Có lỗi xảy ra (ERROR_0007_DUPLICATE)' };
  const expected = 'Có lỗi xảy ra';
  const res = cleanMessage(obj);
  check('Đầu vào { message: ... } được làm sạch đúng', res === expected, res, expected);
}
{
  const err = new Error('Lỗi từ API (ERROR_0012_OUT_OF_RANGE)');
  const expected = 'Lỗi từ API';
  const res = cleanMessage(err);
  check('Đầu vào new Error(...) được làm sạch đúng', res === expected, res, expected);
}

// 8. CHUỖI CHỈ CHỨA DUY NHẤT MÃ LỖI
console.log('\n👉 [8] Kiểm tra chuỗi CHỈ chứa duy nhất mã lỗi (không có text kèm theo)...');
{
  const input = '(ERROR_0001_REQUIRED)';
  const res = cleanMessage(input);
  check('Chuỗi chỉ chứa mã lỗi sau khi cleanMessage phải trả về rỗng', res === '', res, '');
  // Khi kết hợp với fallback pattern:
  const code = extractErrorCode(input);
  const fallbackMsg = VIETNAMESE_ERROR_MESSAGES[code] || cleanMessage(input) || 'Lỗi mặc định';
  check('Fallback ánh xạ sang VIETNAMESE_ERROR_MESSAGES thành công', 
    fallbackMsg === 'Vui lòng điền đầy đủ các thông tin bắt buộc.', 
    fallbackMsg, 
    'Vui lòng điền đầy đủ các thông tin bắt buộc.'
  );
}

// 9. EXTRACT ERROR CODE
console.log('\n👉 [9] Kiểm tra hàm extractErrorCode...');
check('extractErrorCode với chuỗi ngoặc tròn', 
  extractErrorCode('Lỗi (ERROR_0010_FORBIDDEN)') === 'ERROR_0010_FORBIDDEN',
  extractErrorCode('Lỗi (ERROR_0010_FORBIDDEN)'),
  'ERROR_0010_FORBIDDEN'
);
check('extractErrorCode với chuỗi prefix', 
  extractErrorCode('ERROR_0001_REQUIRED: Thiếu họ tên') === 'ERROR_0001_REQUIRED',
  extractErrorCode('ERROR_0001_REQUIRED: Thiếu họ tên'),
  'ERROR_0001_REQUIRED'
);
check('extractErrorCode với object { code }', 
  extractErrorCode({ code: 'ERROR_0012_OUT_OF_RANGE' }) === 'ERROR_0012_OUT_OF_RANGE',
  extractErrorCode({ code: 'ERROR_0012_OUT_OF_RANGE' }),
  'ERROR_0012_OUT_OF_RANGE'
);
check('extractErrorCode với chuỗi không có mã lỗi (trả về null)', 
  extractErrorCode('Một thông báo hoàn toàn bình thường') === null,
  extractErrorCode('Một thông báo hoàn toàn bình thường'),
  null
);
check('extractErrorCode với fallbackCode khi rawMsg không có mã', 
  extractErrorCode('Một thông báo bình thường', 'FALLBACK_01') === 'FALLBACK_01',
  extractErrorCode('Một thông báo bình thường', 'FALLBACK_01'),
  'FALLBACK_01'
);

// 10. LOG SYSTEM EVENT EXECUTION SAFETY
console.log('\n👉 [10] Kiểm tra an toàn khi gọi logSystemEvent (không crash runtime)...');
try {
  logSystemEvent({ code: 'ERROR_0001', message: 'Lỗi thử nghiệm', type: 'error' });
  logSystemEvent({ code: 'WARN_0001', message: 'Cảnh báo thử nghiệm', type: 'warning' });
  logSystemEvent({ code: 'SUCCESS_0001', message: 'Thành công', type: 'success' });
  logSystemEvent({ code: 'INFO_0001', message: 'Thông tin', type: 'info' });
  logSystemEvent({ message: 'Không có code hay type' });
  check('logSystemEvent chạy an toàn với mọi loại tham số không ném lỗi', true, true, true);
} catch (logErr) {
  check('logSystemEvent chạy an toàn', false, logErr.message, 'No throw');
}

console.log('\n================================================================');
console.log(`🏁 TỔNG KẾT TOAST SANITIZER: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
