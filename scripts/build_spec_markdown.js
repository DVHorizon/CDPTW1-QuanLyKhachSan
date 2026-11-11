const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('docs/Spec_ChiTiet_DichVu_C1-C14.txt');
const dstPath = path.resolve('docs/Spec_ChiTiet_DichVu_C1-C14.md');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

console.log(`Processing ${lines.length} lines from source...`);

// Helper to escape pipe inside markdown table cells
function escapePipes(cell) {
    return cell.replace(/(?<!\\)\|/g, '\\|');
}

// Format a single cell nicely
function formatTableCell(cell, isHeader = false) {
    let trimmed = cell.trim();
    if (!trimmed) return '';
    return escapePipes(trimmed);
}

// Convert table block to markdown
function convertTableBlock(rows) {
    const rawRows = rows.map(r => r.split('\t').map(c => c.trim()));
    const colCount = rawRows[0].length;
    
    let headerRow = [];
    let dataRows = [];
    
    // Check if row 0 is empty or key-value overview table
    if (rawRows[0].every(c => c === '')) {
        headerRow = ['Trường', 'Nội dung'];
        dataRows = rawRows.slice(1);
    } else if (rawRows[0][0] === 'Mã tính năng' && colCount === 2) {
        headerRow = ['Trường', 'Nội dung'];
        dataRows = rawRows;
    } else {
        headerRow = rawRows[0];
        dataRows = rawRows.slice(1);
    }
    
    const out = [];
    // Header
    const formattedHeader = headerRow.map(c => `**${formatTableCell(c, true)}**`);
    out.push(`| ${formattedHeader.join(' | ')} |`);
    
    // Separator
    const sep = headerRow.map(() => ':---');
    out.push(`| ${sep.join(' | ')} |`);
    
    // Data rows
    for (const r of dataRows) {
        const formattedCells = r.map((c, colIdx) => {
            let cell = formatTableCell(c);
            if (headerRow[0] === '**Trường**' && headerRow[1] === '**Nội dung**' && colIdx === 0) {
                cell = `**${cell}**`;
            }
            return cell;
        });
        while (formattedCells.length < headerRow.length) formattedCells.push('');
        out.push(`| ${formattedCells.join(' | ')} |`);
    }
    
    return out.join('\n');
}

// Master Error Table to inject into Section 0.1
const MASTER_ERROR_TABLE = `
#### Bảng danh mục 22 mã lỗi chuẩn toàn hệ thống (ERROR_0001 → ERROR_0022)

Hệ thống quản lý khách sạn chuẩn hoá danh mục 22 mã lỗi nghiệp vụ dùng chung xuyên suốt cho toàn bộ các module C1–C14:

| STT | Mã lỗi (Error Code) | Ý nghĩa nghiệp vụ | Message mẫu (Template) | Áp dụng khi |
| :---: | :--- | :--- | :--- | :--- |
| 1 | \`ERROR_0001_REQUIRED\` | Trường bắt buộc bị để trống | \`{Tên trường} không được để trống\` | Bỏ trống thông tin bắt buộc khi submit form hoặc gọi API |
| 2 | \`ERROR_0002_MIN_LENGTH\` | Độ dài chuỗi ngắn hơn mức tối thiểu | \`{Tên trường} phải có ít nhất {n} ký tự\` | Độ dài chuỗi nhập vào sau trim < ngưỡng tối thiểu |
| 3 | \`ERROR_0003_MAX_LENGTH\` | Độ dài chuỗi vượt quá mức tối đa | \`{Tên trường} không được vượt quá {n} ký tự\` | Độ dài chuỗi nhập vào > ngưỡng tối đa cho phép |
| 4 | \`ERROR_0004_INVALID_FORMAT\` | Định dạng dữ liệu không hợp lệ | \`{Tên trường} không đúng định dạng\` | Sai cú pháp email, số điện thoại, kiểu số, cấu trúc JSON body |
| 5 | \`ERROR_0005_INVALID_VALUE\` | Giá trị dữ liệu không hợp lệ | \`{Tên trường} không hợp lệ\` | Giá trị nằm ngoài enum / danh mục định sẵn (status, category, ...) |
| 6 | \`ERROR_0006_APPROVAL_REQUIRED\` | Yêu cầu phê duyệt cấp quản lý | \`Thao tác yêu cầu phê duyệt từ cấp quản lý\` | Phụ thu/bồi thường vượt thẩm quyền hoặc vi phạm chính sách |
| 7 | \`ERROR_0007_DUPLICATE\` | Dữ liệu bị trùng lặp | \`{Tên trường} đã tồn tại trong hệ thống\` | Vi phạm ràng buộc unique (serviceName, question, bookingCode...) |
| 8 | \`ERROR_0008_MISMATCH\` | Dữ liệu đối chiếu không trùng khớp | \`Dữ liệu xác nhận không khớp\` | Xung đột phiên bản dữ liệu hoặc tham số đối chiếu không khớp |
| 9 | \`ERROR_0009_UNAUTHENTICATED\` | Chưa xác thực hoặc Token hết hạn | \`Bạn cần đăng nhập để thực hiện chức năng này\` | Request thiếu Authorization header hoặc JWT token hết hạn / không hợp lệ |
| 10 | \`ERROR_0010_FORBIDDEN\` | Không đủ quyền truy cập / thực thi | \`Bạn không có quyền thực hiện chức năng này\` | Role không có quyền tương ứng trong RolePermissions |
| 11 | \`ERROR_0011_NOT_FOUND\` | Đối tượng tham chiếu không tồn tại | \`{Tên đối tượng} không tồn tại hoặc đã bị xoá\` | ID tham chiếu (CategoryId, ServiceId, StayId, OrderId...) không có trong DB |
| 12 | \`ERROR_0012_OUT_OF_RANGE\` | Giá trị số nằm ngoài khoảng cho phép | \`{Tên trường} phải lớn hơn {n}\` | Price, Quantity, Amount ≤ 0 hoặc vượt giới hạn tối đa |
| 13 | \`ERROR_0013_INVALID_STATE_TRANSITION\` | Chuyển trạng thái không hợp lệ | \`Không thể chuyển trạng thái từ {A} sang {B}\` | Cập nhật Status không nằm trong ma trận chuyển trạng thái hợp lệ |
| 14 | \`ERROR_0014_INACTIVE_REFERENCE\` | Tham chiếu đối tượng đã ngừng hoạt động | \`{Tên đối tượng} hiện không còn hoạt động\` | Category/Service có Status='Inactive' nhưng bị dùng ở thao tác yêu cầu Active |
| 15 | \`ERROR_0015_PRECONDITION_FAILED\` | Điều kiện tiên quyết chưa được đáp ứng | \`{Điều kiện} chưa được đáp ứng\` | Stay chưa ở CheckedIn/Extended khi tạo đơn; Booking chưa sẵn sàng thanh toán |
| 16 | \`ERROR_0016_INVALID_COMBINATION\` | Tổ hợp trường không hợp lệ (XOR) | \`Chỉ được cung cấp đúng 1 trong 2: {A} hoặc {B}\` | Gửi cả bookingId & invoiceId, hoặc thiếu cả hai khi gọi POST /payments |
| 17 | \`ERROR_0017_ALREADY_EXISTS\` | Hoá đơn master đã tồn tại cho booking | \`Booking này đã có hoá đơn, vui lòng dùng hoá đơn hiện có\` | Booking đã có Master Invoice với Status ≠ Cancelled |
| 18 | \`ERROR_0018_GENERATION_FAILED\` / \`ERROR_0018_RATE_LIMITED\` | Khởi tạo tài liệu lỗi / Vượt ngưỡng rate limit | \`Khởi tạo tài liệu không thành công\` / \`Quá nhiều yêu cầu, vui lòng thử lại sau\` | Lỗi sinh PDF hoá đơn hoặc client gửi >20 tin nhắn AI trong 60 giây |
| 19 | \`ERROR_0019_STORAGE_FAILED\` | Lưu trữ file hoá đơn PDF thất bại | \`Không thể lưu trữ tệp tin hoá đơn\` | Lỗi ghi file PDF vào ổ cứng server hoặc hệ thống lưu trữ |
| 20 | \`ERROR_0020_SPLIT_SUM_MISMATCH\` | Tổng tiền tách dòng không khớp số dư | \`Tổng số tiền các hình thức thanh toán chưa khớp với số dư\` | Σ tenders[].amount ≠ Net Outstanding Balance của hoá đơn |
| 21 | \`ERROR_0021_INSUFFICIENT_CASH\` | Tiền mặt khách đưa không đủ | \`Số tiền mặt khách đưa ({A}) nhỏ hơn số tiền phải thanh toán ({B})\` | tender.cashGiven < tender.amount trong giao dịch tiền mặt |
| 22 | \`ERROR_0022_ALREADY_SETTLED\` | Hoá đơn đã được thanh toán đủ trước đó | \`Hoá đơn này đã được thanh toán đủ, không còn số dư cần thanh toán\` | Gọi thanh toán khi Invoices.Status đã là Paid và outstandingBalance ≤ 0 |
`;

const mdLines = [];

// Header of the whole document
mdLines.push('# HỆ THỐNG QUẢN LÝ KHÁCH SẠN — ĐẶC TẢ CHI TIẾT NGHIỆP VỤ (SRS)');
mdLines.push('## Module C: Dịch Vụ & Thanh Toán | Module F: Báo Cáo & Thống Kê | Module G: Chatbot AI Concierge (C1 – C14)');
mdLines.push('');
mdLines.push('- **Đơn vị đào tạo:** TRƯỜNG CAO ĐẲNG CÔNG NGHỆ THỦ ĐỨC — KHOA CNTT');
mdLines.push('- **Học phần:** Chuyên đề phát triển Web 1 — Hệ thống Quản lý Khách sạn');
mdLines.push('- **Tài liệu:** SPEC CHI TIẾT TÍNH NĂNG (Module C & Module F & Module G — C1 đến C14)');
mdLines.push('- **Phụ trách nghiệp vụ (báo cáo đồ án):** Đặng Văn Hà');
mdLines.push('- **Căn cứ:** Spec mẫu FEAT-USER-01 (Thêm mới người dùng) + Bảng truy vết dự án + Báo cáo đồ án ver 1.4 & ver 1.5');
mdLines.push('- **Mục tiêu tài liệu:** Đặc tả chi tiết nghiệp vụ, API và cấu trúc dữ liệu khớp với schema cơ sở dữ liệu của hệ thống cho toàn bộ 14 tính năng từ C1 đến C14.');
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## MỤC LỤC TỔNG QUAN TÍNH NĂNG C1 – C14');
mdLines.push('');
mdLines.push('| STT | Mã tính năng | Tên tính năng | Endpoint chính | Ghi chú |');
mdLines.push('| :---: | :--- | :--- | :--- | :--- |');
mdLines.push('| **C1** | `FEAT-SERVICE-01` | Quản lý danh mục dịch vụ khách sạn (CRUD) | `GET/POST /api/v1/services`, `GET/POST /api/v1/services/categories` | Màn hình 22, Bảng Services/ServiceCategories |');
mdLines.push('| **C2** | `FEAT-SERVICE-02` | Xem danh sách, tìm kiếm và phân loại dịch vụ | `GET /api/v1/services` | Tra cứu lọc danh mục, so khớp không dấu |');
mdLines.push('| **C3** | `FEAT-SERVICE-03` | Đặt dịch vụ (khách tự đặt / lễ tân ghi nhận) | `POST /api/v1/service-orders` | Đơn lẻ hoặc giỏ hàng Batch Order |');
mdLines.push('| **C4** | `FEAT-SERVICE-04` | Quản lý tiến độ thực hiện dịch vụ | `PATCH /api/v1/service-orders/{orderId}/status` | Bảng Kanban, ma trận chuyển trạng thái |');
mdLines.push('| **C5** | `FEAT-PAYMENT-01` | Core Payment Module (Thanh toán dùng chung) | `POST /api/v1/payments`, `PATCH /payments/{id}/refund` | Dịch vụ thanh toán dùng chung toàn hệ thống |');
mdLines.push('| **C6** | `FEAT-INVOICE-01` | Tự động gom chi phí lưu trú (Charges Aggregation) | `GET /api/v1/bookings/{bookingId}/charges` | Bảng kê tạm tính đa phòng, minibar, F&B |');
mdLines.push('| **C7** | `FEAT-INVOICE-02` | Tạo hoá đơn tổng hợp (Master Invoice) tại quầy | `POST /api/v1/invoices/master` | Chốt số liệu chính thức, liên kết tiền cọc |');
mdLines.push('| **C8** | `FEAT-INVOICE-03` | Xuất hoá đơn PDF (Invoice PDF Export) | `GET /api/v1/invoices/{invoiceId}/pdf` | Sinh PDF chuẩn in ấn, mã QR, chữ ký điện tử |');
mdLines.push('| **C9** | `FEAT-INVOICE-04` | Quyết toán hoá đơn (Settlement / Multi-Tender) | `POST /api/v1/invoices/{invoiceId}/pay` | Tách dòng thanh toán tiền mặt, thẻ, chuyển khoản |');
mdLines.push('| **C10** | `FEAT-INVOICE-05` | Quản lý danh sách hoá đơn & lịch sử giao dịch | `GET /api/v1/invoices` | Sổ cái giao dịch, kiểm toán, hoàn tiền |');
mdLines.push('| **C11** | `FEAT-REPORT-01` | Master Dashboard thống kê doanh thu real-time | `GET /api/v1/statistics/revenue`, `/ws/v1/dashboard` | KPI doanh thu, biểu đồ giờ, phòng real-time |');
mdLines.push('| **C12** | `FEAT-REPORT-02` | Occupancy Report & RevPAR Report | `GET /api/v1/statistics/occupancy` | Báo cáo tỷ lệ lấp đầy, RevPAR theo tháng |');
mdLines.push('| **C13** | `FEAT-AI-01` | Gửi tin nhắn & nhận phản hồi Chatbot AI | `POST /api/v1/ai/chatbot` | Google Gemini LLM, Hybrid RAG, Live Handover |');
mdLines.push('| **C14** | `FEAT-AI-02` | Huấn luyện Knowledge Base cho AI | `POST /api/v1/ai/knowledge-base` | Quản trị tri thức Q&A, Soft-delete, Fulltext |');
mdLines.push('');
mdLines.push('---');
mdLines.push('');

// Now let's iterate through lines and parse
let idx = 0;
let currentFeature = 'C1';

while (idx < lines.length) {
    const line = lines[idx];
    
    // Check if table
    if (line.includes('\t')) {
        const tableRows = [];
        while (idx < lines.length && lines[idx].includes('\t')) {
            tableRows.push(lines[idx]);
            idx++;
        }
        mdLines.push(convertTableBlock(tableRows));
        mdLines.push('');
        
        // If this was the first error table in section 0.1, inject master error table
        if (tableRows.some(r => r.includes('ERROR_0011_NOT_FOUND'))) {
            mdLines.push(MASTER_ERROR_TABLE.trim());
            mdLines.push('');
        }
        continue;
    }
    
    const trimmed = line.trim();
    
    // Skip original file headers lines 1-7 because we already created comprehensive header
    if (idx < 8 && (trimmed.startsWith('TRƯỜNG CAO ĐẲNG') || trimmed.startsWith('Chuyên đề') || trimmed.startsWith('SPEC CHI TIẾT') || trimmed.startsWith('Module C') || trimmed.startsWith('Phụ trách') || trimmed.startsWith('Căn cứ') || trimmed.startsWith('Mục tiêu'))) {
        idx++;
        continue;
    }
    
    // Handle repeated section headers (e.g. lines 276, 410, 517, etc.)
    if (trimmed.startsWith('TRƯỜNG CAO ĐẲNG CÔNG NGHỆ THỦ ĐỨC') || trimmed.startsWith('Chuyên đề phát triển Web 1') || trimmed === 'SPEC CHI TIẾT TÍNH NĂNG') {
        idx++;
        continue;
    }
    
    // Module title / Section banner
    if (trimmed.startsWith('Module C — Dịch Vụ & Thanh Toán') || trimmed.startsWith('Module F — Báo Cáo & Thống Kê')) {
        mdLines.push('');
        mdLines.push('---');
        mdLines.push('');
        if (trimmed.includes('C5 —')) {
            mdLines.push('# PHẦN II: CORE PAYMENT MODULE (C5)');
            currentFeature = 'C5';
        } else if (trimmed.includes('C6 —')) {
            mdLines.push('# PHẦN III: HỆ THỐNG HOÁ ĐƠN & QUYẾT TOÁN (C6 – C10)');
            currentFeature = 'C6';
        } else if (trimmed.includes('C7 —')) {
            currentFeature = 'C7';
        } else if (trimmed.includes('C8 —')) {
            currentFeature = 'C8';
        } else if (trimmed.includes('C9 —')) {
            currentFeature = 'C9';
        } else if (trimmed.includes('C10 —')) {
            currentFeature = 'C10';
        } else if (trimmed.includes('C11 —')) {
            mdLines.push('# PHẦN IV: BÁO CÁO & THỐNG KÊ (C11 – C12)');
            currentFeature = 'C11';
        } else if (trimmed.includes('C12 —')) {
            currentFeature = 'C12';
        } else if (trimmed.includes('C13 —')) {
            mdLines.push('# PHẦN V: CHATBOT AI CONCIERGE & CƠ SỞ TRI THỨC (C13 – C14)');
            currentFeature = 'C13';
        } else if (trimmed.includes('C14 —')) {
            currentFeature = 'C14';
        }
        mdLines.push(`### Thông tin định danh phân hệ: ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Metadata lines: Phụ trách, Căn cứ, Mục tiêu
    if (trimmed.startsWith('Phụ trách nghiệp vụ') || trimmed.startsWith('Căn cứ:') || trimmed.startsWith('Mục tiêu tài liệu:')) {
        mdLines.push(`- **${trimmed.replace(':', ':**')}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Section 0 headings
    if (trimmed.startsWith('0. QUY ƯỚC DÙNG CHUNG')) {
        mdLines.push('');
        mdLines.push('# PHẦN I: QUY ƯỚC DÙNG CHUNG TOÀN HỆ THỐNG');
        mdLines.push('');
        mdLines.push(`## ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    if (trimmed.startsWith('0. QUY ƯỚC BỔ SUNG') || trimmed.startsWith('0. QUYẾT ĐỊNH KỸ THUẬT')) {
        mdLines.push('');
        mdLines.push(`### ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    if (/^0\.[0-9]+\.\s+/.test(trimmed)) {
        mdLines.push('');
        // Sub-section of 0
        if (currentFeature === 'C1' || currentFeature === 'C2' || currentFeature === 'C3' || currentFeature === 'C4') {
            mdLines.push(`### ${trimmed}`);
        } else {
            mdLines.push(`#### ${trimmed}`);
        }
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Main feature headings:
    if (/^[0-9]+\.\s+FEAT-[A-Z]+-[0-9]+\s+—\s+/.test(trimmed)) {
        mdLines.push('');
        mdLines.push('---');
        mdLines.push('');
        
        let cTag = '';
        if (trimmed.includes('FEAT-SERVICE-01')) { cTag = 'C1'; currentFeature = 'C1'; }
        else if (trimmed.includes('FEAT-SERVICE-02')) { cTag = 'C2'; currentFeature = 'C2'; }
        else if (trimmed.includes('FEAT-SERVICE-03')) { cTag = 'C3'; currentFeature = 'C3'; }
        else if (trimmed.includes('FEAT-SERVICE-04')) { cTag = 'C4'; currentFeature = 'C4'; }
        else if (trimmed.includes('FEAT-PAYMENT-01')) { cTag = 'C5'; currentFeature = 'C5'; }
        else if (trimmed.includes('FEAT-INVOICE-01')) { cTag = 'C6'; currentFeature = 'C6'; }
        else if (trimmed.includes('FEAT-INVOICE-02')) { cTag = 'C7'; currentFeature = 'C7'; }
        else if (trimmed.includes('FEAT-INVOICE-03')) { cTag = 'C8'; currentFeature = 'C8'; }
        else if (trimmed.includes('FEAT-INVOICE-04')) { cTag = 'C9'; currentFeature = 'C9'; }
        else if (trimmed.includes('FEAT-INVOICE-05')) { cTag = 'C10'; currentFeature = 'C10'; }
        else if (trimmed.includes('FEAT-REPORT-01')) { cTag = 'C11'; currentFeature = 'C11'; }
        else if (trimmed.includes('FEAT-REPORT-02')) { cTag = 'C12'; currentFeature = 'C12'; }
        else if (trimmed.includes('FEAT-AI-01')) { cTag = 'C13'; currentFeature = 'C13'; }
        else if (trimmed.includes('FEAT-AI-02')) { cTag = 'C14'; currentFeature = 'C14'; }
        
        const cleanTitle = trimmed.replace(/^[0-9]+\.\s+/, '');
        mdLines.push(`## ${cTag}. ${cleanTitle}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Sub-headings inside features
    if (/^[0-9]+\.[0-9]+(\.[0-9]+)*\.\s+/.test(trimmed)) {
        mdLines.push('');
        mdLines.push(`### ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Section 2 in C13 & C14
    if (trimmed.startsWith('2. CÁC ENDPOINT VẬN HÀNH') || trimmed.startsWith('2. CÁC THAO TÁC QUẢN LÝ')) {
        mdLines.push('');
        mdLines.push(`### ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Section 2.1 .. 2.6 in C13 & C14
    if (/^2\.[0-9]+\.\s+/.test(trimmed)) {
        mdLines.push('');
        mdLines.push(`#### ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Alphabet headings: a) Quyền truy cập, b) ..., c) ...
    if (/^[a-z]\)\s+/.test(trimmed)) {
        mdLines.push('');
        mdLines.push(`#### ${trimmed}`);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Bullet points: • ...
    if (trimmed.startsWith('•')) {
        let content = trimmed.substring(1).trim();
        // If content starts with an HTTP method, wrap in code
        if (/^(GET|POST|PUT|PATCH|DELETE)\s+\//.test(content)) {
            const m = content.match(/^((?:GET|POST|PUT|PATCH|DELETE)\s+[^—\s]+)\s*(?:—\s*(.*))?$/);
            if (m) {
                const endpointPart = m[1].trim();
                const descPart = m[2] ? ` — ${m[2].trim()}` : '';
                mdLines.push(`- \`${endpointPart}\`${descPart}`);
                idx++;
                continue;
            }
        }
        mdLines.push(`- ${content}`);
        idx++;
        continue;
    }
    
    // Sub-bullets: – ...
    if (trimmed.startsWith('–') || trimmed.startsWith('- ')) {
        let content = trimmed.replace(/^[–\-]\s*/, '').trim();
        mdLines.push(`  - ${content}`);
        idx++;
        continue;
    }
    
    // Numbered process steps: 1. Actor bấm ..., 2. Hệ thống ..., etc.
    if (/^[0-9]+\.\s+/.test(trimmed)) {
        mdLines.push(trimmed);
        idx++;
        continue;
    }
    
    // Endpoint header or banner lines:
    if (trimmed.startsWith('Tương ứng:')) {
        const formatted = trimmed
            .replace(/Tương ứng:/g, '**Tương ứng:**')
            .replace(/Màn hình:/g, '**Màn hình:**')
            .replace(/Màn hình\s+([0-9]+)/g, '**Màn hình:** $1')
            .replace(/Endpoint:/g, '**Endpoint:**')
            .replace(/Bảng DB:/g, '**Bảng DB:**');
        mdLines.push(formatted);
        mdLines.push('');
        idx++;
        continue;
    }
    
    // Normal paragraph line or empty line
    mdLines.push(line);
    idx++;
}

const finalMarkdown = mdLines.join('\n');
fs.writeFileSync(dstPath, finalMarkdown, 'utf8');

console.log(`Markdown written to ${dstPath}.`);
console.log(`Output size: ${Buffer.byteLength(finalMarkdown, 'utf8')} bytes, ${finalMarkdown.split(/\r?\n/).length} lines.`);
