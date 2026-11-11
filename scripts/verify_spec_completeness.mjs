import fs from 'fs';
import path from 'path';

const txtPath = path.resolve('docs/Spec_ChiTiet_DichVu_C1-C14.txt');
const mdPath = path.resolve('docs/Spec_ChiTiet_DichVu_C1-C14.md');

console.log('=== BẮT ĐẦU KIỂM THỬ ĐỐI CHIẾU TÀI LIỆU SPEC (TXT -> MD) ===\n');

// 1. Kiểm tra sự tồn tại của 2 file
if (!fs.existsSync(txtPath)) {
    console.error('❌ LỖI: File nguồn docs/Spec_ChiTiet_DichVu_C1-C14.txt không tồn tại!');
    process.exit(1);
}
if (!fs.existsSync(mdPath)) {
    console.error('❌ LỖI: File đích docs/Spec_ChiTiet_DichVu_C1-C14.md không tồn tại!');
    process.exit(1);
}
console.log('✅ File nguồn docs/Spec_ChiTiet_DichVu_C1-C14.txt tồn tại nguyên vẹn.');
console.log('✅ File đích docs/Spec_ChiTiet_DichVu_C1-C14.md tồn tại.');

const txtContent = fs.readFileSync(txtPath, 'utf8');
const mdContent = fs.readFileSync(mdPath, 'utf8');

// 2. Kiểm tra đầy đủ 14 tính năng C1 - C14
const requiredFeatures = [
    { code: 'C1', feat: 'FEAT-SERVICE-01', name: 'Quản lý danh mục dịch vụ khách sạn' },
    { code: 'C2', feat: 'FEAT-SERVICE-02', name: 'Xem danh sách, tìm kiếm và phân loại dịch vụ' },
    { code: 'C3', feat: 'FEAT-SERVICE-03', name: 'Đặt dịch vụ' },
    { code: 'C4', feat: 'FEAT-SERVICE-04', name: 'Quản lý tiến độ thực hiện dịch vụ' },
    { code: 'C5', feat: 'FEAT-PAYMENT-01', name: 'Core Payment Module' },
    { code: 'C6', feat: 'FEAT-INVOICE-01', name: 'Tự động gom chi phí lưu trú' },
    { code: 'C7', feat: 'FEAT-INVOICE-02', name: 'Tạo hoá đơn tổng hợp' },
    { code: 'C8', feat: 'FEAT-INVOICE-03', name: 'Xuất hoá đơn PDF' },
    { code: 'C9', feat: 'FEAT-INVOICE-04', name: 'Thanh toán hoá đơn tổng hợp' },
    { code: 'C10', feat: 'FEAT-INVOICE-05', name: 'Quản lý danh sách hoá đơn' },
    { code: 'C11', feat: 'FEAT-REPORT-01', name: 'Master Dashboard' },
    { code: 'C12', feat: 'FEAT-REPORT-02', name: 'Occupancy Report' },
    { code: 'C13', feat: 'FEAT-AI-01', name: 'Chatbot AI' },
    { code: 'C14', feat: 'FEAT-AI-02', name: 'Huấn luyện Knowledge Base cho AI' },
];

console.log('\n--- KIỂM TRA 14 TÍNH NĂNG C1 - C14 ---');
let missingFeatures = 0;
for (const f of requiredFeatures) {
    const hasFeat = mdContent.includes(f.feat);
    const hasCode = mdContent.includes(f.code);
    if (hasFeat && hasCode) {
        console.log(`✅ [${f.code}] ${f.feat}: Có mặt đầy đủ trong tài liệu Markdown`);
    } else {
        console.error(`❌ [${f.code}] ${f.feat}: THIẾU! (hasFeat=${hasFeat}, hasCode=${hasCode})`);
        missingFeatures++;
    }
}
if (missingFeatures > 0) {
    console.error(`❌ Có ${missingFeatures} tính năng bị thiếu!`);
    process.exit(1);
}

// 3. Kiểm tra đầy đủ 22 mã lỗi ERROR_0001 -> ERROR_0022
console.log('\n--- KIỂM TRA 22 MÃ LỖI TỪ ERROR_0001 ĐẾN ERROR_0022 ---');
let missingErrors = 0;
for (let i = 1; i <= 22; i++) {
    const codePrefix = 'ERROR_' + String(i).padStart(4, '0');
    const regex = new RegExp(codePrefix + '(?:_[A-Z0-9_]+)?');
    if (regex.test(mdContent)) {
        console.log(`✅ ${codePrefix}: Có mặt trong tài liệu Markdown`);
    } else {
        console.error(`❌ ${codePrefix}: THIẾU trong tài liệu Markdown!`);
        missingErrors++;
    }
}
if (missingErrors > 0) {
    console.error(`❌ Có ${missingErrors} mã lỗi bị thiếu!`);
    process.exit(1);
}

// 4. Kiểm tra toàn bộ mã lỗi xuất hiện trong file TXT có mặt trong MD
console.log('\n--- ĐỐI CHIẾU TOÀN BỘ MÃ LỖI TỪ FILE GỐC SANG FILE MD ---');
const txtErrors = new Set(txtContent.match(/ERROR_\d{4}(?:_[A-Z0-9_]+)?/g) || []);
let missingTxtErrors = 0;
for (const err of txtErrors) {
    if (!mdContent.includes(err)) {
        console.error(`❌ Mã lỗi ${err} có trong TXT nhưng thiếu trong MD!`);
        missingTxtErrors++;
    }
}
if (missingTxtErrors === 0) {
    console.log(`✅ Toàn bộ ${txtErrors.size} mã lỗi từ file nguồn TXT đều có mặt đầy đủ trong file MD.`);
} else {
    process.exit(1);
}

// 5. Kiểm tra danh sách API endpoints từ file gốc sang file MD
console.log('\n--- ĐỐI CHIẾU CÁC ENDPOINT API ---');
const endpointRegex = /(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/[a-zA-Z0-9_\-\/{}\.]+/g;
const txtEndpoints = new Set(txtContent.match(endpointRegex) || []);
let missingEndpoints = 0;
for (const ep of txtEndpoints) {
    const cleanEp = ep.replace(/\s+/, ' ');
    const parts = cleanEp.split(' ');
    const url = parts[1];
    if (!mdContent.includes(url)) {
        console.error(`❌ Endpoint ${cleanEp} không tìm thấy trong file MD!`);
        missingEndpoints++;
    }
}
if (missingEndpoints === 0) {
    console.log(`✅ Toàn bộ ${txtEndpoints.size} API endpoints từ file nguồn đều có mặt trong file MD.`);
} else {
    process.exit(1);
}

// 6. Kiểm tra tính toàn vẹn của các bảng Markdown (GFM Tables)
console.log('\n--- KIỂM TRA CHẤT LƯỢNG BẢNG GFM MARKDOWN ---');
const mdLines = mdContent.split(/\r?\n/);
let inTable = false;
let tableCount = 0;
let tableErrors = 0;
let currentTableCols = 0;

for (let lineNum = 0; lineNum < mdLines.length; lineNum++) {
    const line = mdLines[lineNum].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
        // Strip escaped pipes before counting columns
        const normalized = line.replace(/\\\|/g, 'ESCAPED_PIPE');
        const cols = normalized.split('|').length - 2;
        if (!inTable) {
            inTable = true;
            tableCount++;
            currentTableCols = cols;
        } else {
            if (cols !== currentTableCols) {
                console.error(`❌ Dòng ${lineNum + 1}: Lệch số cột trong bảng ${tableCount} (mong đợi ${currentTableCols}, thực tế ${cols})`);
                tableErrors++;
            }
        }
    } else {
        inTable = false;
    }
}
console.log(`✅ Tổng cộng ${tableCount} bảng Markdown hợp lệ đã được kiểm tra (Lỗi lệch cột: ${tableErrors}).`);
if (tableErrors > 0) {
    process.exit(1);
}

// 7. Kiểm tra các công thức tính toán tài chính & thống kê
console.log('\n--- KIỂM TRA CÔNG THỨC TOÁN HỌC & NGHIỆP VỤ ---');
const requiredFormulas = [
    'remainingBalance = Booking.TotalAmount − Σ (Payments.Amount − Payments.RefundAmount)',
    'remainingBalance = Invoice.TotalAmount − Σ (Payments.Amount − Payments.RefundAmount)',
    'netSurcharge = MAX(0, Bookings.SurchargeAmount − extensionSubtotal − damageSubtotal)',
    'totalPaid',
    'grandTotal',
    'occupancyRate = roomNightsSold / roomNightsAvailable',
    'revPar',
    'roomRevenue',
    'occupancyRateDeltaPct',
    'revParDeltaPct',
];
let missingFormulas = 0;
for (const formula of requiredFormulas) {
    if (mdContent.includes(formula)) {
        console.log(`✅ Công thức / Thuộc tính: "${formula}" có mặt đầy đủ.`);
    } else {
        console.error(`❌ Thiếu công thức: "${formula}"`);
        missingFormulas++;
    }
}
if (missingFormulas > 0) {
    process.exit(1);
}

console.log('\n🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỐI CHIẾU ĐÃ ĐẠT 100%! TÀI LIỆU MARKDOWN ĐẢM BẢO HOÀN TOÀN TÍNH TOÀN VẸN VÀ CHUẨN ĐỊNH DẠNG.');
