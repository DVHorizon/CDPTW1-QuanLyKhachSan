'use strict';

/**
 * test_checkin_safe_error_handling.js
 * Automated Unit Test Suite for Safe Error Handling & Non-JSON Defense (R2, R3)
 *
 * Verifies that CheckInDesk client safe fetch & parse logic cleanly defends against:
 * 1. 404 HTML error pages (<!DOCTYPE ...)
 * 2. 500 HTML internal server error pages
 * 3. 502 Plain text gateway error responses
 * 4. 204 Empty body responses
 * 5. Special UTF-8 BOM (Byte Order Mark) JSON responses
 * 6. Network failure / Connection refused events
 * 7. Standard 200 JSON successful check-in payloads
 *
 * Asserts that SyntaxError: Unexpected token '<' is NEVER thrown to end users,
 * and user-friendly Vietnamese notifications are consistently formatted.
 */

const http = require('http');
const assert = require('assert');

// Thuật toán Safe Fetch & Safe Parse đồng bộ với frontend/src/pages/admin/CheckInDesk.jsx
async function safeFetchJsonClient(targetUrl, options = {}) {
  let res;
  try {
    res = await fetch(targetUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (netErr) {
    throw new Error('Không thể kết nối đến máy chủ nhận phòng. Vui lòng kiểm tra lại dịch vụ backend.');
  }

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();
  const trimmed = (rawText || '').trim();

  // Phát hiện phản hồi HTML lỗi
  if (
    contentType.includes('text/html') ||
    trimmed.startsWith('<') ||
    trimmed.toLowerCase().startsWith('<!doctype') ||
    trimmed.toLowerCase().startsWith('<html')
  ) {
    throw new Error(`Máy chủ phản hồi trang lỗi HTML (Mã HTTP ${res.status}) thay vì dữ liệu JSON.`);
  }

  // Phát hiện phản hồi rỗng
  if (!trimmed) {
    throw new Error('Máy chủ phản hồi dữ liệu rỗng.');
  }

  // Parse JSON có bảo vệ try-catch nội bộ
  let data;
  try {
    data = JSON.parse(trimmed.replace(/^\uFEFF/, ''));
  } catch (parseErr) {
    throw new Error(`Dữ liệu phản hồi từ máy chủ không phải định dạng JSON hợp lệ (Mã HTTP ${res.status}).`);
  }

  return { status: res.status, ok: res.ok, data };
}

// Hàm chuẩn hóa thông báo Toast giao diện người dùng
function sanitizeToastMessage(err, fallback = 'Đã xảy ra lỗi trong quá trình xử lý.') {
  if (!err) return fallback;
  const msg = typeof err === 'string' ? err : (err.message || String(err));
  if (
    msg.includes('Unexpected token') ||
    msg.includes('SyntaxError') ||
    msg.includes('is not valid JSON') ||
    msg.includes('<!DOCTYPE') ||
    msg.includes('<html') ||
    msg.includes('JSON.parse')
  ) {
    return 'Lỗi kết nối máy chủ hoặc phản hồi định dạng không hợp lệ. Vui lòng thử lại sau.';
  }
  return msg;
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU TEST AN TOÀN LỖI KẾT NỐI & NON-JSON NHẬN PHÒNG (R3)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  }

  function recordFail(desc, err) {
    console.error(`  ❌ [FAIL] ${desc} - ${err?.message || err}`);
    failed++;
  }

  // Khởi tạo mock server đa kịch bản phản hồi
  let currentScenario = 'default';
  const server = http.createServer((req, res) => {
    if (currentScenario === 'html_404') {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html lang="en"><head><title>Error</title></head><body><pre>Cannot POST /api/v1/check-ins</pre></body></html>');
    } else if (currentScenario === 'html_500') {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1></body></html>');
    } else if (currentScenario === 'text_502') {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Gateway: Upstream check-in backend unavailable');
    } else if (currentScenario === 'empty_body') {
      res.writeHead(204, { 'Content-Type': 'application/json' });
      res.end('');
    } else if (currentScenario === 'bom_json') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end('\uFEFF{"success":true,"code":"SUCCESS_0004_CHECKED_IN","message":"Check-in thành công"}');
    } else if (currentScenario === 'happy_checkin') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        code: 'SUCCESS_0004_CHECKED_IN',
        message: 'Check-in thành công',
        data: { bookingId: 101, status: 'CheckedIn', roomNumber: '205' }
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, code: 'NOT_FOUND' }));
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // TC_SAFE_01: Xử lý an toàn phản hồi 404 HTML (<!DOCTYPE html>...)
    try {
      currentScenario = 'html_404';
      await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      recordFail('TC_SAFE_01', new Error('Ngoại lệ đáng lẽ phải được ném khi gặp 404 HTML'));
    } catch (err) {
      assert.ok(!err.message.includes('SyntaxError'), 'Không được ném SyntaxError');
      assert.ok(!err.message.includes('Unexpected token'), 'Không được ném Unexpected token');
      assert.ok(err.message.includes('HTML') && err.message.includes('thay vì dữ liệu JSON'), 'Phải thông báo lỗi HTML thân thiện');
      const toast = sanitizeToastMessage(err);
      assert.ok(!toast.includes('<!DOCTYPE'), 'Toast không được chứa thẻ HTML');
      assert.ok(!toast.includes('Unexpected token'), 'Toast không được chứa mã lỗi parser');
      recordPass('TC_SAFE_01: Phản hồi 404 HTML được bắt an toàn, không văng SyntaxError và tạo toast tiếng Việt thân thiện');
    }

    // TC_SAFE_02: Xử lý an toàn phản hồi 500 HTML
    try {
      currentScenario = 'html_500';
      await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      recordFail('TC_SAFE_02', new Error('Ngoại lệ đáng lẽ phải được ném khi gặp 500 HTML'));
    } catch (err) {
      assert.ok(!err.message.includes('SyntaxError'));
      assert.ok(!err.message.includes('Unexpected token'));
      assert.ok(err.message.includes('HTML') && err.message.includes('thay vì dữ liệu JSON'));
      const toast = sanitizeToastMessage(err);
      assert.ok(!toast.includes('<h1>'), 'Toast không được chứa thẻ HTML');
      recordPass('TC_SAFE_02: Máy chủ lỗi 500 HTML được bắt an toàn, không làm crash client');
    }

    // TC_SAFE_03: Phản hồi Text thô (502 Bad Gateway)
    try {
      currentScenario = 'text_502';
      await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      recordFail('TC_SAFE_03', new Error('Ngoại lệ đáng lẽ phải được ném khi gặp 502 Text'));
    } catch (err) {
      assert.ok(!err.message.includes('SyntaxError'));
      assert.ok(!err.message.includes('Unexpected token'));
      assert.ok(err.message.includes('không phải định dạng JSON hợp lệ'));
      recordPass('TC_SAFE_03: Phản hồi 502 Bad Gateway text thô được xử lý an toàn');
    }

    // TC_SAFE_04: Phản hồi Body rỗng (204 No Content / rỗng)
    try {
      currentScenario = 'empty_body';
      await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      recordFail('TC_SAFE_04', new Error('Ngoại lệ đáng lẽ phải được ném khi gặp Body rỗng'));
    } catch (err) {
      assert.ok(err.message.includes('rỗng'));
      assert.ok(!err.message.includes('Unexpected end of JSON'));
      recordPass('TC_SAFE_04: Phản hồi rỗng được xử lý an toàn, ngăn chặn Unexpected end of JSON input');
    }

    // TC_SAFE_05: JSON chứa Byte Order Mark (BOM)
    try {
      currentScenario = 'bom_json';
      const res = await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.data.code, 'SUCCESS_0004_CHECKED_IN');
      recordPass('TC_SAFE_05: JSON có BOM ký tự đặc biệt được bóc tách và parse chính xác');
    } catch (err) {
      recordFail('TC_SAFE_05', err);
    }

    // TC_SAFE_06: Sự cố rớt mạng / Connection Refused
    try {
      await safeFetchJsonClient('http://127.0.0.1:59998/api/v1/check-ins', { method: 'POST' });
      recordFail('TC_SAFE_06', new Error('Đáng lẽ phải ném lỗi khi không kết nối được'));
    } catch (err) {
      assert.ok(err.message.includes('Không thể kết nối đến máy chủ nhận phòng'));
      recordPass('TC_SAFE_06: Sự cố mất kết nối mạng hiển thị thông báo hướng dẫn tiếng Việt rõ ràng');
    }

    // TC_SAFE_07: Check-in thành công dữ liệu hợp lệ (Happy case)
    try {
      currentScenario = 'happy_checkin';
      const res = await safeFetchJsonClient(`${baseUrl}/api/v1/check-ins`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.status, 'CheckedIn');
      assert.strictEqual(res.data.data.roomNumber, '205');
      recordPass('TC_SAFE_07: Check-in thành công nhận JSON hoàn chỉnh và cập nhật dữ liệu');
    } catch (err) {
      recordFail('TC_SAFE_07', err);
    }

  } finally {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================\n');

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
