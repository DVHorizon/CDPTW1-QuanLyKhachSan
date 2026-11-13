#!/usr/bin/env node
'use strict';

/**
 * scripts/test_manual.js
 * Trình kiểm thử thủ công tự động từng tính năng C1 - C14 cho Khách Sạn Grand Horizon PMS.
 *
 * Cách dùng:
 *   1. Chạy tương tác (Interactive Menu):
 *      node scripts/test_manual.js
 *
 *   2. Chạy trực tiếp 1 tính năng cụ thể:
 *      node scripts/test_manual.js c1       (hoặc: node scripts/test_manual.js 1)
 *      node scripts/test_manual.js c12      (hoặc: node scripts/test_manual.js 12)
 *
 *   3. Chạy toàn bộ 14 tính năng:
 *      node scripts/test_manual.js all      (hoặc: node scripts/test_manual.js a)
 */

const path = require('path');
const readline = require('readline');

// Danh mục định nghĩa 14 tính năng
const FEATURES = {
  1: {
    code: 'C1',
    name: 'Quản trị danh mục & CRUD Dịch vụ',
    english: 'Service Catalog CRUD',
    url: 'http://localhost:3000/admin/services/management',
    description: 'Tạo mới, sửa tên/giá/đơn vị, dừng cung cấp (deactivate) và kích hoạt lại (reactivate) dịch vụ.',
    endpoints: [
      'GET   /api/v1/services/categories',
      'POST  /api/v1/services/categories',
      'POST  /api/v1/services',
      'PUT   /api/v1/services/:id',
      'PATCH /api/v1/services/:id/deactivate',
      'PATCH /api/v1/services/:id/reactivate'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c01_service_crud.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c01_boundaries.js'
    ]
  },
  2: {
    code: 'C2',
    name: 'Tìm kiếm không dấu & Phân loại bộ lọc dịch vụ',
    english: 'Service Search & Filtering',
    url: 'http://localhost:3000/admin/services/management',
    description: 'Tìm kiếm tiếng Việt không dấu (Unicode NFD), lọc theo nhóm, khoảng giá minPrice-maxPrice, phân trang.',
    endpoints: [
      'GET /api/v1/services?search=spa',
      'GET /api/v1/services?categoryId=1',
      'GET /api/v1/services?minPrice=50000&maxPrice=500000',
      'GET /api/v1/services?page=1&pageSize=10'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c02_service_search.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c02_boundaries.js'
    ]
  },
  3: {
    code: 'C3',
    name: 'Tạo đơn đặt dịch vụ phòng cho khách lưu trú',
    english: 'Room Service Ordering (In-House Stays)',
    url: 'http://localhost:3000/admin/services/dispatch',
    description: 'Gán đơn theo Stay phòng khách đang ở, snapshot giá tại thời điểm đặt, tạo batch nhiều món dịch vụ.',
    endpoints: [
      'GET  /api/v1/service-orders/active-stays',
      'POST /api/v1/service-orders',
      'GET  /api/v1/service-orders'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c03_service_order.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c03_boundaries.js'
    ]
  },
  4: {
    code: 'C4',
    name: 'Điều phối tiến độ & Bảng Kanban dịch vụ',
    english: 'Service Kanban Board & Lifecycle',
    url: 'http://localhost:3000/admin/services/kanban',
    description: 'Chuyển trạng thái đơn: Tiếp nhận (Received) -> Đang làm (InProgress) -> Hoàn thành (Completed), hủy đơn có lý do.',
    endpoints: [
      'PATCH /api/v1/service-orders/:orderId/status',
      'GET   /api/v1/service-orders?status=InProgress',
      'GET   /api/v1/service-orders?status=Completed'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c04_order_progress.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c04_boundaries.js'
    ]
  },
  5: {
    code: 'C5',
    name: 'Cổng thanh toán & Giao dịch điện tử VietQR / Tiền mặt',
    english: 'Core Payment Gateway & VietQR',
    url: 'http://localhost:3000/admin/finance/checkout',
    description: 'Ghi nhận thanh toán tiền mặt, sinh mã giao dịch VietQR PMT-xxxx động, quy trình hoàn tiền (Refund).',
    endpoints: [
      'GET  /api/v1/payments/ping',
      'POST /api/v1/payments',
      'GET  /api/v1/payments/:id',
      'POST /api/v1/payments/:id/refund'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c05_core_payment.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c05_boundaries.js'
    ]
  },
  6: {
    code: 'C6',
    name: 'Bảng kê chi phí Folio & Đối soát lưu trú',
    english: 'Folio Charges Aggregation & Reconciliation',
    url: 'http://localhost:3000/admin/finance/folio/2',
    description: 'Tổng hợp tiền phòng theo đêm + dịch vụ buồng phòng + minibar - giảm giá, cảnh báo dịch vụ dở dang.',
    endpoints: [
      'GET /api/v1/bookings/:bookingId/charges'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c06_folio_charges.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c06_boundaries.js'
    ]
  },
  7: {
    code: 'C7',
    name: 'Khởi tạo Hóa đơn tổng Master Invoice',
    english: 'Master Invoice Generation',
    url: 'http://localhost:3000/admin/finance/checkout',
    description: 'Phát hành số hóa đơn chuẩn INV-YYYY-xxxxxxx, lưu snapshot tĩnh các khoản mục chi phí, chặn tạo trùng lặp.',
    endpoints: [
      'POST /api/v1/invoices/master',
      'GET  /api/v1/invoices/:invoiceId',
      'GET  /api/v1/invoices/booking/:bookingId'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c07_master_invoice.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c07_boundaries.js'
    ]
  },
  8: {
    code: 'C8',
    name: 'Xuất bản và in ấn Hóa đơn PDF chuẩn',
    english: 'Invoice PDF Stream & Disk-caching',
    url: 'http://localhost:3000/admin/finance/invoices/1',
    description: 'Tạo luồng nhị phân application/pdf chuẩn Adobe %PDF-, bảng kê chi tiết dòng hóa đơn, cache đĩa tăng tốc độ.',
    endpoints: [
      'GET /api/v1/invoices/:id/pdf-info',
      'GET /api/v1/invoices/:id/pdf'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c08_invoice_pdf.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c08_boundaries.js'
    ]
  },
  9: {
    code: 'C9',
    name: 'Thanh toán chia nhỏ nhiều phương thức (Multi-Tender)',
    english: 'Multi-Tender Split Settlement',
    url: 'http://localhost:3000/admin/finance/checkout',
    description: 'Chia nhỏ thanh toán: Tiền mặt + Thẻ POS + VietQR, tự động tính tiền thối (change), chặn thanh toán thiếu.',
    endpoints: [
      'POST /api/v1/invoices/:invoiceId/settle'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c09_multi_tender.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c09_boundaries.js'
    ]
  },
  10: {
    code: 'C10',
    name: 'Sổ cái hóa đơn thời gian thực & Truy vết tài chính',
    english: 'Invoice Ledger & Transaction History',
    url: 'http://localhost:3000/admin/finance/ledger',
    description: 'Tra cứu hóa đơn theo ngày, chi nhánh, trạng thái, theo dõi chi tiết lịch sử từng lần quẹt thẻ / tiền mặt.',
    endpoints: [
      'GET /api/v1/invoices',
      'GET /api/v1/invoices/:id/transactions'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c10_invoice_ledger.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c10_boundaries.js'
    ]
  },
  11: {
    code: 'C11',
    name: 'Bảng điều khiển doanh thu tổng thể (Dashboard)',
    english: 'Master Revenue Dashboard',
    url: 'http://localhost:3000/admin/statistics/revenue',
    description: '4 chỉ số KPI doanh thu hôm nay, biểu đồ cột 24 giờ, biểu đồ phân bổ tình trạng phòng theo thời gian thực.',
    endpoints: [
      'GET /api/v1/statistics/revenue?date=YYYY-MM-DD'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c11_revenue_dashboard.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c11_boundaries.js'
    ]
  },
  12: {
    code: 'C12',
    name: 'Công suất phòng & Doanh thu RevPAR + Xuất Excel 5 sao',
    english: 'Occupancy Rate, RevPAR & Excel Export',
    url: 'http://localhost:3000/admin/statistics/revenue',
    description: 'Công thức RevPAR = ADR × Occupancy, phân tích theo tháng, so sánh YoY, xuất file Excel .xlsx thiết kế sang trọng.',
    endpoints: [
      'GET /api/v1/statistics/occupancy?fromDate=...&toDate=...',
      'GET /api/v1/statistics/occupancy/export?format=xlsx'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c12_occupancy_revpar.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c12_boundaries.js'
    ]
  },
  13: {
    code: 'C13',
    name: 'Trợ lý ảo AI Concierge & Chatbot thông minh',
    english: 'AI Concierge Chatbot & Smart RAG',
    url: 'http://localhost:3000/ (Nút chat góc phải)',
    description: 'Tư vấn thông minh buồng phòng và dịch vụ, chống prompt injection, quy trình bàn giao cho lễ tân (Handover).',
    endpoints: [
      'POST /api/v1/ai/chat',
      'GET  /api/v1/ai/conversations',
      'POST /api/v1/ai/conversations/:id/handover'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c13_ai_chatbot.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c13_boundaries.js'
    ]
  },
  14: {
    code: 'C14',
    name: 'Quản trị Kho tri thức AI (Knowledge Base)',
    english: 'AI Knowledge Base Management',
    url: 'http://localhost:3000/admin/ai/knowledge',
    description: 'CRUD câu hỏi & câu trả lời chuẩn, gắn từ khóa, kiểm tra độ tương đồng ngữ nghĩa để AI học ngay lập tức.',
    endpoints: [
      'GET    /api/v1/ai/knowledge-base',
      'POST   /api/v1/ai/knowledge-base',
      'PUT    /api/v1/ai/knowledge-base/:id',
      'DELETE /api/v1/ai/knowledge-base/:id',
      'POST   /api/v1/ai/knowledge-base/test-relevance'
    ],
    suites: [
      '../backend/tests/e2e_services_c1_c14/tier1_features/test_c14_knowledge_base.js',
      '../backend/tests/e2e_services_c1_c14/tier2_boundaries/test_c14_boundaries.js'
    ]
  }
};

function printBanner() {
  console.log('\n' + '='.repeat(76));
  console.log('🏛️   GRAND HORIZON HOTEL PMS — TRÌNH KIỂM THỬ THỦ CÔNG TỰ ĐỘNG (C1 - C14)');
  console.log('='.repeat(76));
}

async function runFeatureTest(featKey) {
  const feat = FEATURES[featKey];
  if (!feat) {
    console.error(`❌ Không tìm thấy tính năng [${featKey}]. Vui lòng chọn từ 1 đến 14 hoặc 'all'.`);
    return false;
  }

  console.log('\n' + '─'.repeat(76));
  console.log(`🚀 [${feat.code}] ${feat.name}`);
  console.log(`   English:      ${feat.english}`);
  console.log(`   Mô tả:        ${feat.description}`);
  console.log(`   Giao diện:    ${feat.url}`);
  console.log(`   Endpoints:    ${feat.endpoints.join(', ')}`);
  console.log('─'.repeat(76));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const startTime = Date.now();

  for (const suiteRelPath of feat.suites) {
    const fullPath = path.resolve(__dirname, suiteRelPath);
    try {
      const suiteModule = require(fullPath);
      const runnerFn = suiteModule.run || suiteModule;
      if (typeof runnerFn === 'function') {
        const result = await runnerFn();
        if (result && typeof result === 'object') {
          totalTests += result.total || 0;
          passedTests += result.passed || 0;
          failedTests += result.failed || 0;
        }
      }
    } catch (err) {
      console.error(`   ❌ Lỗi khi thực thi suite ${path.basename(suiteRelPath)}:`, err.message);
      failedTests++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('─'.repeat(76));
  if (failedTests === 0) {
    console.log(`🎉 [KẾT QUẢ ${feat.code}]: HOÀN TOÀN ĐẠT CHUẨN (100% PASS)`);
    console.log(`   ✅ Số ca kiểm thử thành công: ${passedTests}/${totalTests} tests (${durationSec}s)`);
  } else {
    console.log(`⚠️ [KẾT QUẢ ${feat.code}]: CÓ ${failedTests} CA KIỂM THỬ THẤT BẠI!`);
    console.log(`   ❌ Thành công: ${passedTests}/${totalTests} | Thất bại: ${failedTests} (${durationSec}s)`);
  }
  console.log('─'.repeat(76) + '\n');

  return failedTests === 0;
}

async function runAllFeatures() {
  printBanner();
  console.log('⚡ BẮT ĐẦU CHẠY TOÀN BỘ 14 TÍNH NĂNG TỰ ĐỘNG LIÊN HOÀN (C1 -> C14)...');
  const startTime = Date.now();
  let overallPass = true;
  const summaryList = [];

  for (let i = 1; i <= 14; i++) {
    const passed = await runFeatureTest(i);
    summaryList.push({ code: FEATURES[i].code, name: FEATURES[i].name, passed });
    if (!passed) overallPass = false;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(76));
  console.log('📊 TỔNG KẾT BÁO CÁO NGHIỆM THU 14 TÍNH NĂNG (C1 - C14)');
  console.log('='.repeat(76));
  summaryList.forEach((s) => {
    const icon = s.passed ? '✅ ĐẠT' : '❌ LỖI';
    console.log(`  ${icon}  [${s.code.padEnd(3)}] ${s.name}`);
  });
  console.log('─'.repeat(76));
  console.log(`⏱️  Tổng thời gian thực thi: ${durationSec}s`);
  console.log(`🏆 Trạng thái chung: ${overallPass ? 'ALL 14 FEATURES PASSED 100% 🌟' : 'SOME TESTS FAILED ⚠️'}`);
  console.log('='.repeat(76) + '\n');
  return overallPass;
}

function printMenu() {
  printBanner();
  console.log('DANH SÁCH 14 TÍNH NĂNG CẦN KIỂM THỬ:');
  for (let i = 1; i <= 14; i++) {
    const f = FEATURES[i];
    const numStr = `[${i < 10 ? ' ' + i : i}]`;
    console.log(`  ${numStr}  ${f.code}:  ${f.name}`);
  }
  console.log('  [ A]  ALL: Chạy toàn bộ 14 tính năng liên hoàn (Full Suite)');
  console.log('  [ 0]  Thoát chương trình');
  console.log('='.repeat(76));
}

async function interactiveLoop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    printMenu();
    rl.question('\n👉 Nhập lựa chọn tính năng muốn kiểm tra [1-14, A hoặc 0]: ', async (ans) => {
      const input = ans.trim().toLowerCase();
      if (input === '0' || input === 'exit' || input === 'q') {
        console.log('\n👋 Tạm biệt!');
        rl.close();
        process.exit(0);
      }

      if (input === 'a' || input === 'all') {
        await runAllFeatures();
      } else {
        let key = null;
        if (/^c([1-9]|1[0-4])$/.test(input)) {
          key = parseInt(input.slice(1), 10);
        } else if (/^([1-9]|1[0-4])$/.test(input)) {
          key = parseInt(input, 10);
        }

        if (key && FEATURES[key]) {
          await runFeatureTest(key);
        } else {
          console.log('\n❌ Lựa chọn không hợp lệ, vui lòng thử lại.');
        }
      }

      rl.question('\nBấm [Enter] để quay lại menu chính...', () => {
        promptUser();
      });
    });
  };

  promptUser();
}

async function main() {
  const arg = process.argv[2]?.trim()?.toLowerCase();

  if (!arg) {
    // Chế độ tương tác Menu
    await interactiveLoop();
    return;
  }

  if (arg === 'all' || arg === 'a') {
    const ok = await runAllFeatures();
    process.exit(ok ? 0 : 1);
  }

  let key = null;
  if (/^c([1-9]|1[0-4])$/.test(arg)) {
    key = parseInt(arg.slice(1), 10);
  } else if (/^([1-9]|1[0-4])$/.test(arg)) {
    key = parseInt(arg, 10);
  }

  if (key && FEATURES[key]) {
    printBanner();
    const ok = await runFeatureTest(key);
    process.exit(ok ? 0 : 1);
  } else {
    console.error(`\n❌ Tham số '${process.argv[2]}' không hợp lệ. Ví dụ: node scripts/test_manual.js c1 (hoặc c2...c14, all)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});

