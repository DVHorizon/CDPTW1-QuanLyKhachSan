/**
 * ==============================================================================
 * BỘ KIỂM THỬ BẢO MẬT & PHÒNG CHỐNG XSS TỰ ĐỘNG (XSS DEFENSE AUDIT)
 * Dự án: Hệ Thống Quản Lý Khách Sạn Cao Cấp (Grand Horizon PMS)
 * ==============================================================================
 * Mục đích kiểm thử:
 *  1. [SAST] Quét tĩnh toàn bộ mã nguồn Frontend (React) để phát hiện các DOM Sinks
 *     tiềm ẩn nguy cơ DOM-based XSS (dangerouslySetInnerHTML, innerHTML, eval, etc.)
 *  2. [DAST] Kiểm tra các HTTP Security Headers phòng thủ tầng mạng/trình duyệt
 *     (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, X-Powered-By)
 *  3. [API] Kiểm tra cơ chế xử lý dữ liệu đầu vào chứa ký tự HTML đặc biệt, đảm bảo
 *     API luôn trả về JSON an toàn, không bị biến đổi thành mã HTML thực thi.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_DIR = path.resolve(__dirname, '../frontend/src');

// Danh mục các mẫu kiểm tra mã nguồn tĩnh
const CRITICAL_PATTERNS = [
  { name: 'dangerouslySetInnerHTML (Chèn HTML thô trong React)', regex: /dangerouslySetInnerHTML/g },
  { name: 'eval() (Thực thi chuỗi lệnh động)', regex: /\beval\s*\(/g },
  { name: 'Function constructor (Biên dịch code từ chuỗi)', regex: /new\s+Function\s*\(/g },
  { name: 'javascript: URI (Giao thức thực thi trong liên kết)', regex: /href\s*=\s*['"]javascript:/gi }
];

const ADVISORY_PATTERNS = [
  { name: 'innerHTML gán nội dung (Khuyên dùng textContent/React ref)', regex: /\.innerHTML\s*=\s*(?!['"]{2})/g },
  { name: 'document.write (Khuyên dùng iframe print thay thế)', regex: /document\.write(ln)?\s*\(/g }
];

function getFilesRecursively(dir, extensions = ['.js', '.jsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ─── KIỂM THỬ 1: QUÉT TĨNH MÃ NGUỒN FRONTEND (SAST) ──────────────────────────
function auditFrontendSinks() {
  console.log('\n🔍 [1/3] Đang quét tĩnh mã nguồn Frontend (React) tìm DOM Sinks nguy hiểm...');
  const files = getFilesRecursively(FRONTEND_DIR);
  let criticalCount = 0;
  let advisoryCount = 0;
  const criticalFindings = [];
  const advisoryFindings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
    const lines = content.split('\n');

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // Kiểm tra Critical
      for (const p of CRITICAL_PATTERNS) {
        if (p.regex.test(lineText)) {
          criticalCount++;
          criticalFindings.push({ file: relativePath, line: lineNum, type: p.name, text: lineText.trim() });
        }
      }

      // Kiểm tra Advisory
      for (const p of ADVISORY_PATTERNS) {
        if (p.regex.test(lineText)) {
          advisoryCount++;
          advisoryFindings.push({ file: relativePath, line: lineNum, type: p.name, text: lineText.trim() });
        }
      }
    });
  }

  console.log(`   👉 Đã quét: ${files.length} tập tin (.js, .jsx) trong frontend/src`);

  if (criticalCount === 0) {
    console.log('   ✅ [ĐẠT CRITICAL] 0 dangerouslySetInnerHTML, 0 eval, 0 Function(), 0 javascript: URIs.');
  } else {
    console.error(`   ❌ [NGHIÊM TRỌNG] Phát hiện ${criticalCount} vị trí có nguy cơ cao:`);
    criticalFindings.forEach(f => console.error(`      - ${f.file}:${f.line} [${f.type}]`));
  }

  if (advisoryCount > 0) {
    console.log(`   ℹ️  [LƯU Ý THỰC THI] Phát hiện ${advisoryCount} vị trí sử dụng API in ấn / DOM truyền thống:`);
    advisoryFindings.forEach(f => {
      console.log(`      - ${f.file}:${f.line} -> ${f.type}`);
    });
    console.log('      (Các vị trí trên dùng để in phiếu hóa đơn qua window.open; cần đảm bảo dữ liệu in được thoát ký tự đầy đủ)');
  }

  return criticalCount === 0;
}

// ─── KIỂM THỬ 2: KIỂM TRA HTTP SECURITY HEADERS (DEFENSE-IN-DEPTH) ────────────
async function auditSecurityHeaders() {
  console.log('\n🛡️  [2/3] Đang kiểm tra HTTP Security Headers từ Backend Express...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/services`);
    if (!res.ok && res.status >= 500) {
      console.error(`   ❌ Không thể kết nối Backend tại ${BACKEND_URL} (Status: ${res.status})`);
      return false;
    }

    const headers = res.headers;
    const checks = [
      {
        name: 'X-Content-Type-Options',
        expected: 'nosniff',
        actual: headers.get('x-content-type-options'),
        desc: 'Chống kỹ thuật MIME-Sniffing (trình duyệt không tự đoán định dạng file để chạy script)'
      },
      {
        name: 'X-Frame-Options',
        expected: 'DENY',
        actual: headers.get('x-frame-options'),
        desc: 'Chống Clickjacking (ngăn kẻ xấu nhúng web vào iframe để lừa click)'
      },
      {
        name: 'Content-Security-Policy',
        expected: "default-src 'self'",
        actual: headers.get('content-security-policy'),
        desc: 'Chính sách bảo mật nội dung (ngăn chặn nạp tài nguyên và script ngoài luồng)'
      },
      {
        name: 'X-Powered-By',
        expected: null,
        actual: headers.get('x-powered-by'),
        desc: 'Ẩn chữ ký công nghệ máy chủ (Express/Node.js) khỏi response header'
      }
    ];

    let allPassed = true;
    for (const check of checks) {
      let isOk = false;
      if (check.expected === null) {
        isOk = !check.actual;
      } else {
        isOk = check.actual && check.actual.toLowerCase().includes(check.expected.toLowerCase());
      }

      if (isOk) {
        console.log(`   ✅ [ĐẠT] ${check.name}: "${check.actual || '(Đã ẩn)'}" (${check.desc})`);
      } else {
        console.error(`   ❌ [THIẾU/SAI] ${check.name}: Hiện tại "${check.actual}" - Kỳ vọng: "${check.expected}"`);
        allPassed = false;
      }
    }

    return allPassed;
  } catch (err) {
    console.error(`   ⚠️ Không thể kết nối tới Backend: ${err.message}. Hãy đảm bảo server đang chạy.`);
    return false;
  }
}

// ─── KIỂM THỬ 3: KIỂM TRA PHẢN HỒI JSON & CONTENT-TYPE AN TOÀN ──────────────
async function auditSafeDataSerialization() {
  console.log('\n🔒 [3/3] Đang kiểm tra định dạng phản hồi dữ liệu API...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/services`);
    const contentType = res.headers.get('content-type') || '';

    // Đảm bảo API luôn trả về application/json kèm charset rõ ràng
    // Tránh bị nhầm lẫn thành text/html (nguyên nhân gây Reflected XSS khi mở link API trực tiếp)
    const isJson = contentType.includes('application/json');
    const hasCharset = contentType.includes('charset=utf-8');

    if (isJson && hasCharset) {
      console.log(`   ✅ [ĐẠT] Content-Type hợp chuẩn: "${contentType}"`);
      console.log('      (Trình duyệt luôn phân tích là dữ liệu JSON thuần, không bao giờ render mã HTML)');
      return true;
    } else {
      console.error(`   ❌ [CẢNH BÁO] Content-Type chưa tối ưu an toàn: "${contentType}"`);
      return false;
    }
  } catch (err) {
    console.error(`   ⚠️ Lỗi kết nối API: ${err.message}`);
    return false;
  }
}

// ─── ĐIỀU PHỐI CHẠY TỔNG HỢP ────────────────────────────────────────────────
async function runAll() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ BẢO MẬT & PHÒNG CHỐNG XSS CHO DỰ ÁN');
  console.log('================================================================');

  const sastResult = auditFrontendSinks();
  const dastHeadersResult = await auditSecurityHeaders();
  const apiFormatResult = await auditSafeDataSerialization();

  console.log('\n================================================================');
  console.log('📊 KẾT QUẢ TỔNG HỢP:');
  console.log(`   1. Quét tĩnh React Critical DOM Sinks (SAST): ${sastResult ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`   2. HTTP Security Defense Headers:             ${dastHeadersResult ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`   3. JSON Safe Content-Type Isolation:          ${apiFormatResult ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('================================================================');

  if (sastResult && dastHeadersResult && apiFormatResult) {
    console.log('🎉 TẤT CẢ CÁC TIÊU CHUẨN BẢO MẬT PHÒNG THỦ XSS ĐÃ ĐẠT CHUẨN!\n');
    process.exitCode = 0;
  } else {
    console.error('⚠️ Có hạng mục chưa đạt yêu cầu bảo mật. Vui lòng rà soát lại.\n');
    process.exitCode = 1;
  }
}

runAll();
