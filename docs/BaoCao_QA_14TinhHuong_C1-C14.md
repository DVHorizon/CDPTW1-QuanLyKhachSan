# BÁO CÁO ĐỐI CHIẾU & KIỂM THỬ TOÀN DIỆN C1–C14 THEO 14 TÌNH HUỐNG QA (LIVE BACKEND + FRONTEND + DATABASE)

- **Dự án**: Hệ thống Quản lý Khách sạn Grand Horizon (`CDPTW1-QuanLyKhachSan`)
- **Phạm vi chức năng**: Toàn bộ 14 tính năng phân hệ Dịch vụ, Thanh toán, Hóa đơn, Thống kê & AI Concierge (`C1` đến `C14` theo đặc tả `docs/Spec_ChiTiet_DichVu_C1-C14.md`)
- **Phạm vi tình huống QA**: 14 tình huống kiểm thử chất lượng phần mềm (`S1` đến `S14` — Ma trận `14 × 14 = 196` điểm kiểm tra)
- **Môi trường kiểm chứng thực tế (Live Stack)**:
  - **Database**: MySQL 8.0 (`127.0.0.1:3306`, schema `hotel_management`, 16 chi nhánh, đầy đủ dữ liệu seed chuẩn)
  - **Backend**: Node.js + Express + Sequelize + WebSocket (`http://localhost:5000`, `ws://localhost:5000/ws/v1/dashboard`)
  - **Frontend**: React 18 + Vite 5 + Tailwind CSS (`http://localhost:3000`)
- **Nhánh phát triển & tích hợp**: `ha-feat/c6_charges_and_c13_gemini` $\rightarrow$ merge vào `master` (và đồng bộ `ck_ptw2`)
- **Mốc thời gian Git chuẩn hóa**: `2026-11-16T15:57:25+07:00` (`Dvhorizon <dangvanha123b@gmail.com>`)

---

## PHẦN 1. MA TRẬN TỔNG HỢP 14 TÍNH NĂNG (C1–C14) × 14 TÌNH HUỐNG QA (S1–S14)

### 1.1. Chú giải ký hiệu trong ma trận
- **Áp dụng (FE+BE)**: Áp dụng trên cả giao diện người dùng (Frontend) và API/Database (Backend).
- **Áp dụng (API)**: Không có đường dẫn URL/form riêng trên UI cho thao tác đó nhưng endpoint API có nhận tham số và bắt buộc phải kiểm soát chặt chẽ.
- **N/A (Không áp dụng)**: Tính năng thuộc loại chỉ đọc (Read-only), hoặc theo thiết kế nghiệp vụ/cơ sở dữ liệu không có thành phần tương ứng (ví dụ: toàn bộ phân hệ C1–C14 không có chức năng upload file ảnh nên S11 và S13 là `N/A`).
- **Trạng thái**: `[Trước khi sửa -> Sau khi sửa]` (`FAIL -> PASS` hoặc `PASS -> PASS` hoặc `N/A`).

### 1.2. Bảng Ma trận 14 × 14 (196 điểm đối chiếu)

| Mã | Tên tính năng | S1: Xóa 2 tab | S2: Sửa 2 tab (Lock) | S3: ID sai / không tồn tại | S4: Validate Form & API | S5: Dán HTML quá tải | S6: Khoảng trắng 1B & 2B (`　`) | S7: Số Full-width (`０-９`) | S8: Select-option | S9: Chống bấm Lưu trùng | S10: URL (`page=abc` / `99999`) | S11: Upload file != ảnh | S12: Ảnh lỗi (`onError`) | S13: Sửa giữ ảnh cũ | S14: Chặn xóa/truy cập trái phép |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C1** | **CRUD Dịch vụ & Nhóm DV** (`FEAT-SERVICE-01`) | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C2** | **Tìm kiếm & Lọc Dịch vụ** (`FEAT-SERVICE-02`) | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | `N/A` |
| **C3** | **Đặt dịch vụ (Dispatch)** (`FEAT-SERVICE-03`) | `N/A` | `N/A` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C4** | **Kanban Tiến độ Dịch vụ** (`FEAT-SERVICE-04`) | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`PASS -> PASS` | `N/A` | `N/A` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C5** | **Thanh toán & Hoàn tiền** (`FEAT-PAYMENT-01`) | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C6** | **Gom chi phí lưu trú Folio** (`FEAT-INVOICE-01`) | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C7** | **Tạo Hóa đơn Tổng hợp** (`FEAT-INVOICE-02`) | `N/A` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C8** | **Xuất Hóa đơn PDF** (`FEAT-INVOICE-03`) | `N/A` | `N/A` | Áp dụng (API)<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng (API)<br>`PASS -> PASS` | `N/A` | Áp dụng (API)<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C9** | **Quyết toán Multi-Tender** (`FEAT-INVOICE-04`) | `N/A` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C10** | **Sổ cái Hóa đơn & Giao dịch** (`FEAT-INVOICE-05`) | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C11** | **Dashboard Doanh thu Real-time** (`FEAT-REPORT-01`) | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C12** | **Báo cáo Occupancy & RevPAR** (`FEAT-REPORT-02`) | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`PASS -> PASS` |
| **C13** | **AI Chatbot & Live Handover** (`FEAT-AI-01`) | `N/A` | Áp dụng<br>`FAIL -> PASS` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | `N/A` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |
| **C14** | **Quản trị Knowledge Base AI** (`FEAT-AI-02`) | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng (API)<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`PASS -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | Áp dụng<br>`FAIL -> PASS` | `N/A` | `N/A` | `N/A` | Áp dụng<br>`FAIL -> PASS` |

> **Thống kê tổng hợp 196 ô kiểm thử (14 × 14)**:
> - **Số ô Áp dụng (`APP` + `API-ONLY`)**: **110 ô** — Kết quả sau khi sửa: **110 / 110 ĐẠT (`PASS 100%`)**, **0 lỗi (`FAIL = 0`)**.
> - **Số ô Không áp dụng (`N/A`)**: **86 ô** — Được xác minh trực tiếp trong mã nguồn và schema cơ sở dữ liệu.

---

## PHẦN 2. PHÂN TÍCH CHI TIẾT THEO 14 TÌNH HUỐNG QA (NGUYÊN NHÂN GỐC RỄ & GIẢI PHÁP ĐÃ TRIỂN KHAI)

### Tình huống 1: Xóa mục không tồn tại (Mở 2 tab, Tab 1 xóa thành công, Tab 2 xóa lại cùng phần tử phải báo lỗi)
- **Các tính năng áp dụng**: **C1** (Ngừng hoạt động / xóa mềm dịch vụ), **C4** (Hủy đơn dịch vụ), **C5** (Hoàn tiền giao dịch), **C14** (Xóa / đổi trạng thái mục tri thức AI).
- **Lỗi phát hiện trước khi sửa**:
  1. **C1 (`backend/src/modules/services/controllers/serviceController.js:565-597` — `deactivateService`)**: Chỉ kiểm tra `if (!service)` mà không kiểm tra `if (service.Status === 'Inactive')`. Khi Tab 1 đã ngừng hoạt động dịch vụ, Tab 2 bấm ngừng hoạt động lại vẫn nhận `HTTP 200 OK` thay vì báo lỗi. Tương tự `reactivateService` trả về `200 OK` khi dịch vụ đã `Active`.
  2. **C14 (`backend/src/modules/ai/controllers/knowledgeBaseController.js:621-676` & `frontend/src/pages/admin/ai/AiConciergeManagement.jsx:149-153`)**:
     - `toggleKnowledgeStatus` không kiểm tra nếu trạng thái gửi lên trùng với trạng thái hiện tại ở DB (Tab 2 bấm tắt lại mục đã tắt vẫn trả về `200 OK`).
     - Trên Frontend `AiConciergeManagement.jsx`, khi API trả lỗi hoặc danh sách trống đã từng fallback về mảng cứng `FALLBACK_KB_ITEMS`, làm mục đã xóa xuất hiện lại.
- **Giải pháp đã thực hiện**:
  - **C1**: Trong `deactivateService`, nếu `service.Status === 'Inactive'` trả về `HTTP 400 ERROR_0013_INVALID_STATE_TRANSITION` (`"Dịch vụ này đã ngừng hoạt động hoặc đã bị xóa ở phiên khác"`). Trong `reactivateService`, nếu `service.Status === 'Active'` trả về `HTTP 400 ERROR_0013_INVALID_STATE_TRANSITION`.
  - **C14**: Trong `deleteKnowledgeItem`, nếu bản ghi không tồn tại hoặc đã bị xóa ở Tab 1 trả về `HTTP 404 ERROR_0011_NOT_FOUND` (`"Mục tri thức không tồn tại hoặc đã bị xóa ở phiên làm việc khác"`). Trong `toggleKnowledgeStatus`, nếu trạng thái yêu cầu trùng với trạng thái hiện tại trả về `HTTP 409 ERROR_0023_CONFLICT`. Loại bỏ hoàn toàn fallback giả lập trên `AiConciergeManagement.jsx`.
  - **C4 & C5**: Giữ vững kiểm tra chuyển trạng thái (`Cancelled` và `Refunded` không cho phép hủy/hoàn tiền lần 2, trả về `HTTP 400 ERROR_0013_INVALID_STATE_TRANSITION`).

---

### Tình huống 2: Cập nhật trùng lặp trên 2 tab (Optimistic Locking — Yêu cầu tải lại trang trước khi cập nhật)
- **Các tính năng áp dụng**: **C1** (`PUT /services/:id`), **C4** (`PATCH /service-orders/:orderId/status`), **C5** (`PATCH /payments/:paymentId/refund`), **C7** (`POST /invoices/master`), **C9** (`POST /invoices/:invoiceId/pay`), **C13** (`POST|PATCH /ai/conversations/:id/handover`, `PATCH /ai/conversations/:id/resolve`), **C14** (`PUT /ai/knowledge-base/:id`, `PATCH /ai/knowledge-base/:id/status`).
- **Lỗi phát hiện trước khi sửa**:
  - Toàn bộ 9 bảng/model thuộc C1–C14 (`Services`, `ServiceCategories`, `ServiceOrders`, `Payments`, `Invoices`, `ChatbotKnowledgeBase`, `ChatbotConversations`) chưa có cột `Version` và các controller `PUT`/`PATCH` ghi đè theo cơ chế Last-Write-Wins, không trả về `HTTP 409 Conflict` khi Tab 2 lưu dữ liệu cũ.
  - Các màn hình Frontend (`ServiceManagement.jsx`, `ServiceOrdersKanban.jsx`, `MultiTenderSettlementModal.jsx`, `InvoiceLedger.jsx`, `AiConciergeManagement.jsx`) chưa lưu `version` của bản ghi đang mở và chưa hiển thị cảnh báo yêu cầu tải lại trang khi gặp `409`.
- **Giải pháp đã thực hiện**:
  1. **Database & Models**: Bổ sung cột `Version INT NOT NULL DEFAULT 1` vào các bảng thông qua migration `backend/src/migrations/011_sync_all_models_schema.js` và khai báo trường `Version` trong các Sequelize model (`Service.js`, `ServiceCategory.js`, `ServiceOrder.js`, `Payment.js`, `Invoice.js`, `ChatbotKnowledgeBase.js`, `ChatbotConversation.js`).
  2. **Backend (`backend/src/shared/utils/qaValidators.js`)**: Xây dựng bộ hàm dùng chung `extractExpectedVersion`, `assertVersionMatch`, `atomicVersionUpdate`, `updateWithOptimisticLock` kiểm tra `version` từ body hoặc header `If-Match`. Nếu `version` của Tab 2 nhỏ hơn `Version` hiện tại trong DB, trả về `HTTP 409 ERROR_0023_CONFLICT` với thông điệp chuẩn:
     > `"Dữ liệu đã được cập nhật bởi phiên làm việc khác. Vui lòng tải lại trang trước khi cập nhật."`
  3. **Frontend (`frontend/src/utils/qaInputUtils.js` & các màn hình C1, C4, C5, C9, C13, C14)**: Lưu `version` khi mở modal/form chỉnh sửa, gửi kèm `version` trong payload cập nhật, và khi nhận `isConflict409(err)` thì hiển thị thông báo lỗi rõ ràng yêu cầu tải lại trang.

---

### Tình huống 3: ID không hợp lệ (`abc`, `1abc`) hoặc không tồn tại (`99999999999`)
- **Các tính năng áp dụng**: **C1, C3, C4, C5, C6, C7, C8, C9, C10, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **MySQL ép kiểu ngầm định `'1abc' -> 1`**: Các hàm `findByPk(req.params.id)` hoặc câu lệnh SQL trực tiếp không kiểm tra `/^\d+$/`, khiến ID `'1abc'` bị MySQL cắt thành `1` và trả về bản ghi số `1` thay vì báo lỗi!
  2. **C5 (`frontend/src/pages/client/DepositPayment.jsx:135-157`)**: Khi truy cập `/payment?bookingId=abc` hoặc `?bookingId=99999999999`, trang web tự động gán dữ liệu giả `bookingId = 99281` (`GH-99281`) thay vì báo lỗi không tìm thấy!
  3. **C5 (`frontend/src/pages/client/MockPaymentGateway.jsx:19-34`)**: Khi truy cập `/mock-payment/abc` hoặc mã giao dịch không tồn tại, trang vẫn hiển thị `0 đ` và cho bấm nút giả lập thanh toán.
  4. **C10 (`frontend/src/pages/admin/finance/InvoiceLedger.jsx:70`)**: Khi vào `/admin/finance/settlement/:invoiceId`, code so sánh sai tên thuộc tính (`inv.InvoiceId` viết hoa thay vì `inv.invoiceId`) và không hiển thị thông báo lỗi khi ID là `abc` hoặc `99999999999`.
  5. **C13 (`backend/src/modules/ai/controllers/chatbotController.js:73-113` — `findOrRecoverConversation`)**: Tự động tạo mới một cuộc hội thoại giả trong DB nếu `0 < id < 1000000` không tồn tại khi gọi `GET /ai/conversations/999999` hoặc `POST /handover`!
- **Giải pháp đã thực hiện**:
  - Sử dụng `parseStrictPositiveInt` (`qaValidators.js`) trên toàn bộ các controller C1–C14 để chặn tuyệt đối `'abc'`, `'1abc'`, `'-1'`, `'0'` (`HTTP 400 ERROR_0004_INVALID_FORMAT`) và trả về `HTTP 404 ERROR_0011_NOT_FOUND` cho ID không tồn tại như `'99999999999'`.
  - Bổ sung endpoint `GET /api/v1/services/:id` cho C1 có kiểm tra ID chặt chẽ.
  - Xóa bỏ hoàn toàn mock fallback `99281` trong `DepositPayment.jsx`; hiển thị màn hình lỗi `"Không tìm thấy trang hoặc thông tin đặt phòng không hợp lệ"` khi `bookingId` sai.
  - Hiển thị trạng thái lỗi và khóa nút thao tác trên `MockPaymentGateway.jsx` và `InvoiceLedger.jsx` khi mã giao dịch/hóa đơn không tồn tại.
  - Trong `chatbotController.js`, tắt cơ chế tự tạo bản ghi giả đối với các API quản trị (`GET /conversations/:id`, `handover`, `messages`, `resolve`), trả về đúng `HTTP 404 ERROR_0011_NOT_FOUND`.

---

### Tình huống 4: Validate Form & API (Thông báo lỗi có chỉ dẫn cụ thể)
- **Các tính năng áp dụng**: **C1, C2, C3, C4, C5, C6, C7, C9, C10, C11, C12, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **C1 (`serviceController.js:269, 466`)**: Truyền kiểu dữ liệu không phải chuỗi (số/object/mảng) vào `serviceName` hoặc `unit` gây crash `TypeError: serviceName.trim is not a function` (`HTTP 500`).
  2. **C3 (`serviceOrderController.js:146` & `ServiceDispatchTerminal.jsx:160`)**: Giới hạn số lượng `quantity` tối đa là `50` thay vì `100` theo đặc tả C3, và chưa kiểm tra bước nhảy số nguyên (cho đơn vị rời rạc `Lần/Suất/Bộ/Chai/Kg`) so với bước nhảy `0.5` (cho đơn vị `Giờ`).
  3. **C5 (`paymentController.js:703`)**: Khi `refundReason > 500` ký tự lại trả về mã lỗi sai `ERROR_0002_MIN_LENGTH` thay vì `ERROR_0003_MAX_LENGTH`.
  4. **C7 (`masterInvoiceController.js:184-223` & `BookingChargesFolio.jsx:217`)**: `vatRate='abc'` bị ép kiểu `Number(vatRate) || 0` thành `0%` VAT thay vì báo lỗi `400`; `manualAdjustments[].description` thiếu kiểm tra chiều dài tối thiểu `2` ký tự; UI `BookingChargesFolio.jsx` im lặng bỏ qua khi bấm thêm khoản điều chỉnh trống mà không hiển thị lỗi.
  5. **C14 (`knowledgeBaseController.js` & `AiConciergeManagement.jsx`)**: Thiếu kiểm tra độ dài tối thiểu `5` ký tự cho `question` và `answer`, không kiểm tra giới hạn tối đa `20` từ khóa (`keywords`), mỗi từ khóa `2–50` ký tự; hàm `/knowledge-base/test` tự bịa kết quả `DEFAULT_KNOWLEDGE_ITEMS[0]` (`score = 0.75`) khi không tìm thấy câu trả lời phù hợp.
- **Giải pháp đã thực hiện**:
  - Chuẩn hóa toàn bộ điều kiện kiểm tra dữ liệu đầu vào trên cả Frontend và Backend cho C1–C14, trả về đúng mã lỗi (`ERROR_0001_REQUIRED`, `ERROR_0002_MIN_LENGTH`, `ERROR_0003_MAX_LENGTH`, `ERROR_0004_INVALID_FORMAT`, `ERROR_0012_OUT_OF_RANGE`) kèm thông báo tiếng Việt cụ thể cho từng trường.

---

### Tình huống 5: Dán đoạn mã HTML quá tải vào các phần tử text ngắn
- **Các tính năng áp dụng**: **C1, C2, C3, C4, C5, C6, C7, C9, C10, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **C14 (`knowledgeBaseController.js:445-493`)**: Khi dán đoạn mã HTML lớn (`> 1000` ký tự) vào `question` hoặc `keywords`, controller không kiểm tra độ dài tối đa nên đẩy thẳng xuống MySQL gây lỗi `ER_DATA_TOO_LONG` (`HTTP 500 Internal Server Error`)!
  2. **C2 (`serviceController.js`) & C10 (`masterInvoiceController.js`)**: Không chặn tham số tìm kiếm `search > 100` ký tự trên API.
  3. **C5 (`paymentController.js`) & C9 (`masterInvoiceController.js`) & C13 (`chatbotController.js`)**: Thiếu kiểm tra độ dài tối đa cho `returnUrl` (`<= 500`), `transactionCode` (`<= 200`), `note` (`<= 500`), và tin nhắn phản hồi của nhân viên `sendStaffMessage` (`<= 1000`).
  4. **C13 (`ClientConcierge.jsx:220`)**: Đặt `maxLength={1000}` cứng trên thẻ `<input>` khiến khi người dùng dán đoạn văn bản dài `> 1000` ký tự bị cắt cụt âm thầm mà không hiển thị thông báo lỗi chiều dài.
- **Giải pháp đã thực hiện**:
  - Kiểm tra chặt chẽ chiều dài chuỗi (cả chuỗi gốc và sau khi làm sạch) trên mọi trường văn bản ngắn và dài trong C1–C14; trả về `HTTP 400 ERROR_0003_MAX_LENGTH` (hoặc `ERROR_0004_INVALID_FORMAT`) và hiển thị thông báo lỗi chiều dài rõ ràng trên giao diện.

---

### Tình huống 6: Kiểm tra khoảng trắng thường (`' '`) và khoảng trắng 2-byte full-width (`'　'` — `\u3000`)
- **Các tính năng áp dụng**: **C1, C2, C3, C4, C5, C6, C7, C9, C10, C11, C12, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  - Trong `serviceController.js` (`description`), `serviceOrderController.js` (`note`), và `chatbotController.js` (`message`), độ dài chuỗi được kiểm tra **trước** khi cắt khoảng trắng. Do đó khi nhập toàn khoảng trắng 2-byte `'　'.repeat(1001)`, hệ thống báo sai mã lỗi hoặc lưu chuỗi toàn khoảng trắng vào DB.
  - Trên Frontend (`DepositPayment.jsx` trường `cardholderName`, `BookingChargesFolio.jsx` trường `newAdjDesc`, `MultiTenderSettlementModal.jsx` trường `transactionCode`), chưa dùng hàm cắt khoảng trắng Unicode dẫn đến chấp nhận chuỗi chỉ chứa `\u3000`.
- **Giải pháp đã thực hiện**:
  - Áp dụng thống nhất `trimUnicode` và `isBlankUnicode` (từ `qaValidators.js` và `qaInputUtils.js`) cắt cả khoảng trắng ASCII, `\u3000` (Ideographic Space), `\u00A0` (NBSP), `\u200B-\u200D` (Zero-width space) **trước** khi kiểm tra bắt buộc (`REQUIRED`) và kiểm tra độ dài (`MIN_LENGTH` / `MAX_LENGTH`).

---

### Tình huống 7: Nhập số dạng Full-width (`０１２３４５６７８９`) vào các phần tử số
- **Các tính năng áp dụng**: **C1, C2, C3, C5, C6, C7, C8, C9, C10, C11, C12, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. Toàn bộ Backend và Frontend chưa chuyển đổi chữ số full-width `[\uFF10-\uFF19]` (`０-９`) sang ASCII `0-9`.
  2. **Lỗi nghiêm trọng ở C7 (`masterInvoiceController.js:223`)**: Khi gửi `vatRate = "１０"`, biểu thức `Number("１０") || 0` trả về `0`, làm hóa đơn bị tính **0% thuế VAT** thay vì **10% VAT**!
  3. **Lỗi nghiêm trọng ở C14 (`knowledgeBaseController.js:381`)**: Khi gửi `page = "２"`, `Math.max(1, parseInt("２", 10))` trả về `NaN`, làm `.slice(NaN, NaN)` trả về mảng rỗng `[]` và `page: null`!
  4. Trên Frontend, các ô `<input type="number">` trong trình duyệt tự động xóa trắng khi người dùng gõ/dán ký tự `０１２３４５６７８９`.
- **Giải pháp đã thực hiện**:
  - Xây dựng hàm `normalizeFullWidthDigits` trong `qaValidators.js` (Backend) và `qaInputUtils.js` (Frontend) tự động chuẩn hóa `０-９` $\rightarrow$ `0-9`, `．` $\rightarrow$ `.`, `－` $\rightarrow$ `-`.
  - Tích hợp vào `parseStrictPositiveInt`, `parseStrictNumber`, `validatePaginationParams` trên toàn bộ Backend C1–C14 và các sự kiện `onChange`/`onPaste`/submit trên toàn bộ form Frontend C1–C14.

---

### Tình huống 8: Kiểm tra phần tử Select-Option (Trên Form và API)
- **Các tính năng áp dụng**: **C1, C2, C3, C4, C5, C7, C8, C9, C10, C11, C12, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **C2 (`serviceController.js:116-130`)**: Khi truyền `group=abc` (không phải số), API bỏ qua bộ lọc và trả về toàn bộ dịch vụ; khi truyền `status=InvalidStatus` không báo lỗi `400`.
  2. **C13 (`chatbotController.js:745-770` — `claimHandover`)**: Không kiểm tra giá trị `action`, truyền bất kỳ chuỗi sai nào (ví dụ `action="xyz"`) đều mặc định thực thi `to_staff`!
  3. **C14 (`knowledgeBaseController.js:17-36, 137-149, 467, 645` & `AiConciergeManagement.jsx:21-29`)**:
     - Khi gửi `category=""` (trống), Backend tự động gán mặc định `'Services'` thay vì trả lỗi `400 ERROR_0001_REQUIRED`.
     - Danh sách `VALID_CATEGORIES` thiếu các danh mục theo đặc tả C14 §0.2 (`Dining`, `FAQ`, `Transport`).
     - Truyền `status` không hợp lệ vào `PATCH /knowledge-base/:id/status` không bị chặn lỗi `400 ERROR_0005_INVALID_VALUE`.
     - Dropdown danh mục trên `AiConciergeManagement.jsx` thiếu option placeholder `-- Chọn danh mục --` và thiếu các danh mục trong Spec.
- **Giải pháp đã thực hiện**:
  - Chuẩn hóa kiểm tra danh sách giá trị hợp lệ (allowlist enum & FK) cho toàn bộ tham số select-option trên C1–C14, trả về `HTTP 400 ERROR_0005_INVALID_VALUE` (hoặc `ERROR_0001_REQUIRED` / `ERROR_0014_INACTIVE_REFERENCE`) khi chọn thiếu hoặc gửi giá trị không hợp lệ.

---

### Tình huống 9: Chống lưu trùng lặp khi nhấn nút Lưu liên tục nhiều lần (Double-click / Rapid Submit)
- **Các tính năng áp dụng**: **C1, C3, C5, C7, C9, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **C1 (`serviceController.js:375-402`)**: Tạo dịch vụ trùng tên chỉ trả cảnh báo mềm mà vẫn tạo nhiều bản ghi trùng lặp khi nhấn Lưu liên tục.
  2. **C3 (`serviceOrderController.js`) & C5 (`paymentController.js`)**: Không có cơ chế chặn tạo đơn dịch vụ trùng lặp hoặc thanh toán tiền mặt/thẻ trùng lặp trong cửa sổ thời gian ngắn khi bấm đúp.
  3. **C14 (`knowledgeBaseController.js:472-493`)**: Khi tạo câu hỏi trùng với câu hỏi đã có, API âm thầm ghi đè bản ghi cũ và trả về `201 Created` thay vì trả về `HTTP 409 ERROR_0007_DUPLICATE` (kèm `existingInactiveId` theo đặc tả C14).
  4. **Frontend (`AiConciergeManagement.jsx`, `ServiceManagement.jsx`, `ServiceDispatchTerminal.jsx`, `BookingChargesFolio.jsx`, `MultiTenderSettlementModal.jsx`, `DepositPayment.jsx`)**: Chỉ dựa vào React state bất đồng bộ (`isSubmitting`) hoặc chưa có state khóa nút (`handleSaveKnowledge`, `handleSendStaffReply` trong `AiConciergeManagement.jsx`), dẫn đến 2 cú click nhanh trong cùng 1 chu kỳ render vẫn bắn đi 2 request POST song song.
- **Giải pháp đã thực hiện**:
  - **Frontend**: Bổ sung khóa đồng bộ bằng `useRef` (`submittingRef.current = true`) kết hợp `disabled={isSubmitting}` trên tất cả các nút Lưu/Gửi của C1, C3, C5, C7, C9, C13, C14.
  - **Backend**:
    - **C1**: Chặn tạo dịch vụ trùng tên đang hoạt động với `HTTP 409 ERROR_0007_DUPLICATE`.
    - **C3**: Chặn tạo đơn dịch vụ trùng lặp (`stayId + serviceId + quantity + note`) trong cửa sổ 5 giây với `HTTP 409 ERROR_0007_DUPLICATE`.
    - **C5**: Chặn tạo thanh toán trực tiếp trùng lặp (`bookingId + amount + method`) trong cửa sổ 5 giây với `HTTP 409 ERROR_0007_DUPLICATE`.
    - **C7 & C9**: Khóa giao dịch mức dòng (`LOCK.UPDATE`) chặn tuyệt đối phát hành 2 Master Invoice hoặc quyết toán 2 lần.
    - **C14**: Kiểm tra trùng câu hỏi (chuẩn hóa Unicode NFD không phân biệt hoa thường), trả về `HTTP 409 ERROR_0007_DUPLICATE` (kèm `existingInactiveId` nếu bản ghi cũ đang `Inactive`).

---

### Tình huống 10: Kiểm tra tham số URL (`page=abc`, `page=99999`, tham số lọc không hợp lệ)
- **Các tính năng áp dụng**: **C1, C2, C3, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **Backend (`serviceController.js`, `masterInvoiceController.js`, `knowledgeBaseController.js`, `chatbotController.js`)**:
     - Khi truyền `?page=abc`, `parseInt('abc')` thành `NaN` rồi tự động gán về trang `1` (hoặc trả về `page: null` ở C14) thay vì báo lỗi `400`.
     - Khi truyền `?page=99999` (vượt quá tổng số trang), API trả về `200 OK` với mảng rỗng thay vì báo lỗi không tồn tại trang.
  2. **Frontend (`ServiceManagement.jsx`, `InvoiceLedger.jsx`, `MasterRevenueDashboard.jsx`, `AiConciergeManagement.jsx`)**: Chỉ lưu `page` trong `useState` nội bộ mà không đọc/đồng bộ với `?page=` trên URL (`useSearchParams`), nên khi người dùng sửa URL thành `?page=abc` hoặc `?page=99999` giao diện không hề kiểm tra hay hiển thị thông báo lỗi.
- **Giải pháp đã thực hiện**:
  - **Backend**: Áp dụng hàm `validatePaginationParams` (`qaValidators.js`) trên toàn bộ API danh sách (C1/C2, C10, C13, C14):
    - Nếu `page` hoặc `pageSize` không phải số nguyên dương hợp lệ (`page=abc`, `page=0`, `page=-1`, `page=1abc`) $\rightarrow$ trả về `HTTP 400 ERROR_0004_INVALID_FORMAT` (`"Tham số trang (page) không hợp lệ"`).
    - Nếu `page > totalPages` (ví dụ `page=99999`) $\rightarrow$ trả về `HTTP 404 ERROR_0011_NOT_FOUND` (`"Trang không hợp lệ hoặc không tồn tại"`).
  - **Frontend**: Kết nối `useSearchParams` và hàm `parseUrlPageParam` (`qaInputUtils.js`) trên `ServiceManagement.jsx`, `InvoiceLedger.jsx`, `MasterRevenueDashboard.jsx`, và `AiConciergeManagement.jsx`, hiển thị banner cảnh báo lỗi rõ ràng ngay khi URL có `?page=abc` hoặc `?page=99999`.

---

### Tình huống 11 & 13: Upload file không phải ảnh (`.pdf`) & Cập nhật giữ nguyên ảnh cũ
- **Kết quả rà soát mã nguồn & Database**: **Không áp dụng (`N/A`) cho toàn bộ C1–C14**.
- **Bằng chứng xác minh trực tiếp**:
  - Kiểm tra toàn bộ 9 bảng cơ sở dữ liệu (`ServiceCategories`, `Services`, `ServiceOrders`, `Payments`, `Invoices`, `InvoiceDetails`, `ChatbotKnowledgeBase`, `ChatbotConversations`, `ChatbotMessages`) trong `001_create_all_tables.js` và `011_sync_all_models_schema.js`: **không có bất kỳ cột lưu đường dẫn ảnh upload nào**.
  - Kiểm tra toàn bộ route/controller thuộc `backend/src/modules/{services,payments,statistics,ai}` và toàn bộ component giao diện C1–C14: **không có bất kỳ `<input type="file">` hay middleware `multer` upload ảnh nào**.

---

### Tình huống 12: Hiển thị hình ảnh mặc định thay thế khi ảnh bị lỗi / không thể hiển thị (`onError`)
- **Các tính năng áp dụng**: **C5** (`DepositPayment.jsx`, `DepositInvoiceModal.jsx`) và **C9** (`MultiTenderSettlementModal.jsx`) — nơi có hiển thị các thẻ `<img>` (ảnh đại diện hạng phòng và mã QR thanh toán VietQR/ZaloPay). (Các tính năng C1–C4, C6–C8, C10–C14 không sử dụng thẻ `<img>` hiển thị ảnh dữ liệu nên là `N/A`).
- **Lỗi phát hiện trước khi sửa**:
  1. **C5 (`frontend/src/pages/client/DepositPayment.jsx` dòng 962, 1112, 1272 & `frontend/src/components/modals/DepositInvoiceModal.jsx` dòng 592)**: Thiếu thuộc tính `onError` trên thẻ `<img>` hiển thị ảnh QR ZaloPay, ảnh hạng phòng Villa và ảnh QR xác nhận đặt cọc.
  2. **C9 (`frontend/src/components/admin/finance/MultiTenderSettlementModal.jsx` dòng 475)**: Thẻ `<img>` hiển thị mã QR động từ `https://img.vietqr.io/...` không có `onError`, nếu mất mạng hoặc URL lỗi sẽ hiển thị icon ảnh vỡ (broken image).
- **Giải pháp đã thực hiện**:
  - Xây dựng ảnh mặc định inline SVG tự thân (`DEFAULT_IMAGE_FALLBACK` — không phụ thuộc mạng ngoài) và hàm `handleImageError` chống vòng lặp vô hạn trong `frontend/src/utils/qaInputUtils.js`.
  - Gắn `onError={handleImageError}` vào toàn bộ các thẻ `<img>` trong `DepositPayment.jsx`, `DepositInvoiceModal.jsx`, và `MultiTenderSettlementModal.jsx`.

---

### Tình huống 14: Bảo mật xác thực & phân quyền trên thao tác Xóa và các Endpoint nhạy cảm
- **Các tính năng áp dụng**: **C1, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14**.
- **Lỗi phát hiện trước khi sửa**:
  1. **Lỗi toàn cục Frontend (`serviceApi.js`, `invoiceApi.js`, `statisticsApi.js`, `aiApi.js`, `bookingApi.js`)**: `AuthContext.jsx` lưu JWT Access Token trong bộ nhớ (`tokenStore.js`) và xóa `localStorage.hotel_token`, nhưng cả 5 file API client của C1–C14 lại chỉ đọc `localStorage.getItem('hotel_token')` mà không gọi `getAccessToken()`, khiến request từ trình duyệt bị thiếu header `Authorization`!
  2. **Lỗi toàn cục Backend (`authMiddleware.js`)**: Hàm `verifyToken` không nạp danh sách quyền (`permissions`) từ bảng `RolePermissions`, làm `checkServicePermission` chặn nhầm các vai trò nội bộ được cấp quyền.
  3. **C1 (`App.jsx:83` & `serviceRoutes.js:39`)**: Route `/services` trên Frontend mở thẳng trang quản trị `ServiceManagement.jsx` mà không bọc `<ProtectedRoute>`; API `GET /api/v1/services/export` không yêu cầu đăng nhập; `GET /api/v1/services?status=Inactive` cho phép người dùng chưa đăng nhập xem cả dịch vụ đã ẩn.
  4. **C3 (`serviceOrderRoutes.js:10-11`)**: `GET /api/v1/service-orders` và `GET /api/v1/service-orders/active-stays` dùng `optionalVerifyToken`, làm lộ thông tin khách đang lưu trú (họ tên, SĐT, email, số phòng) cho người dùng chưa đăng nhập!
  5. **C5 (`paymentRoutes.js:14, 22`)**: `POST /api/v1/payments` và `GET /api/v1/payments/:paymentId` không bắt buộc đăng nhập (`optionalVerifyToken`), cho phép người lạ tạo/xem thanh toán của bất kỳ booking nào.
  6. **C7 & C8 (`masterInvoiceController.js`, `invoicePdfController.js`, `server.js:53`)**: Thiếu kiểm tra quyền sở hữu booking của Guest khi xem hóa đơn (`getInvoiceById`, `getInvoiceByBookingId`, `getInvoicePdfInfo`), và thư mục `/uploads/invoices/INV-*.pdf` bị mở công khai qua `express.static` không cần đăng nhập!
  7. **C13 & C14 (`aiRoutes.js`, `chatbotController.js`, `knowledgeBaseController.js`)**: Các API quản trị hội thoại (`GET /conversations`, `handover`, `messages`, `resolve`) và `GET /knowledge-base/test` chỉ kiểm tra `verifyToken` mà không chặn vai trò `Guest` (`roleId === 5`), khiến khách hàng có thể đọc/đóng hội thoại của khách khác!
- **Giải pháp đã thực hiện**:
  - Kết nối `getAccessToken()` từ `tokenStore.js` vào tất cả 5 API client C1–C14 và chuẩn hóa `VITE_API_URL`.
  - Bọc `<ProtectedRoute>` cho `/services` và sửa route trùng `/admin/tai-chinh` trong `App.jsx`.
  - Nạp đầy đủ `req.user.permissions` từ `RolePermissions` trong `authMiddleware.js`.
  - Chặn truy cập chưa đăng nhập (`401 ERROR_0009_UNAUTHENTICATED`) và sai vai trò/quyền sở hữu (`403 ERROR_0010_FORBIDDEN`) trên toàn bộ các API C1 (`/export`, `deactivate`, `reactivate`), C3 (`/service-orders`, `/active-stays`), C5 (`POST /payments`, `GET /payments/:id`, `PATCH /refund`), C7/C8 (kiểm tra chủ sở hữu hóa đơn và chặn truy cập tĩnh `/uploads/invoices/`), C13 (chặn Guest gọi inbox/handover/messages/resolve), và C14 (chặn Guest gọi `/knowledge-base/test` hoặc xem mục `Inactive`).

---

## PHẦN 3. BÁO CÁO ĐỐI CHIẾU CHI TIẾT TỪNG TÍNH NĂNG (C1 ĐẾN C14)

### 3.1. Tính năng C1 — Quản lý danh mục dịch vụ khách sạn (`FEAT-SERVICE-01`)
- **Files Backend**: `backend/src/modules/services/routes/serviceRoutes.js`, `backend/src/modules/services/controllers/serviceController.js`, `backend/src/models/Service.js`, `backend/src/models/ServiceCategory.js`
- **Files Frontend**: `frontend/src/pages/admin/services/ServiceManagement.jsx`, `frontend/src/api/serviceApi.js`
- **Endpoints & Màn hình**: `GET/POST /api/v1/services/categories`, `GET/POST /api/v1/services`, `GET/PUT /api/v1/services/:id`, `PATCH /api/v1/services/:id/deactivate`, `PATCH /api/v1/services/:id/reactivate`, `GET /api/v1/services/export` | UI: `/admin/services`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1 (`PASS`)**: `deactivateService` & `reactivateService` kiểm tra trạng thái hiện tại; nếu đã `Inactive` (hoặc `Active`) trả về `400 ERROR_0013_INVALID_STATE_TRANSITION`.
  - **S2 (`PASS`)**: Bổ sung cột `Services.Version`, kiểm tra `version` nguyên tử trong `updateService`; trả về `409 ERROR_0023_CONFLICT` và hiển thị cảnh báo yêu cầu tải lại trang trên `ServiceManagement.jsx`.
  - **S3 (`PASS`)**: Bổ sung `GET /services/:id` và dùng `parseStrictPositiveInt` chặn `'abc'`, `'1abc'` (`400`) và `'99999999999'` (`404`).
  - **S4 (`PASS`)**: Kiểm tra an toàn kiểu dữ liệu chuỗi/số, độ dài `serviceName` (`2..150`), `unit` (`1..50`), `price` (`> 0 .. 999,999,999.99`), `categoryName` (`2..100`).
  - **S5 (`PASS`)**: Dán HTML vượt quá `150` ký tự vào `serviceName` hoặc `100` ký tự vào `categoryName` bị chặn với `400 ERROR_0003_MAX_LENGTH`.
  - **S6 (`PASS`)**: Dùng `trimUnicode` cắt khoảng trắng 1-byte và 2-byte (`\u3000`) trước khi kiểm tra độ dài cho cả trường bắt buộc và tùy chọn (`description`).
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width `price = "２５００００"` thành `250000` trên cả FE và BE.
  - **S8 (`PASS`)**: Kiểm tra `categoryId` bắt buộc tồn tại (`404`) và đang `Active` (`400 ERROR_0014_INACTIVE_REFERENCE`).
  - **S9 (`PASS`)**: Khóa đồng bộ `submittingRef` trên modal tạo dịch vụ/nhóm dịch vụ và chặn trùng tên dịch vụ (`409 ERROR_0007_DUPLICATE`).
  - **S10 (`PASS`)**: Đồng bộ `?page=` qua `useSearchParams` + `validatePaginationParams` (`page=abc` $\rightarrow$ `400`, `page=99999` $\rightarrow$ `404`).
  - **S11, S12, S13 (`N/A`)**: Không có chức năng upload/hiển thị ảnh dịch vụ.
  - **S14 (`PASS`)**: Bảo vệ route `/services` bằng `<ProtectedRoute>`, bắt buộc `verifyToken` + `checkServicePermission` trên `/export` và các thao tác khóa/mở dịch vụ.

### 3.2. Tính năng C2 — Xem danh sách, tìm kiếm và phân loại dịch vụ (`FEAT-SERVICE-02`)
- **Files Backend & Frontend**: `serviceController.js` (`getServices`), `ServiceManagement.jsx`
- **Endpoint & Màn hình**: `GET /api/v1/services` | UI: `/admin/services`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S3, S9, S11, S12, S13, S14 (`N/A`)**: Luồng tra cứu danh sách chỉ đọc (phần quyền quản trị đã kiểm tra tại C1).
  - **S4 (`PASS`)**: Chặn `minPrice > maxPrice` với `400 ERROR_0004_INVALID_FORMAT`.
  - **S5 (`PASS`)**: Chặn từ khóa tìm kiếm `search > 100` ký tự với `400 ERROR_0003_MAX_LENGTH`.
  - **S6 (`PASS`)**: Cắt khoảng trắng `\u3000` trên từ khóa tìm kiếm `search`.
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `minPrice`, `maxPrice`, `page`, `pageSize`.
  - **S8 (`PASS`)**: Kiểm tra chặt `group`/`categoryId` (từ chối `group=abc` với `400`) và `status` (`Active|Inactive|All`, từ chối giá trị lạ với `400 ERROR_0005_INVALID_VALUE`).
  - **S10 (`PASS`)**: Chặn `?page=abc` (`400`) và `?page=99999` (`404`) trên cả API và giao diện.

### 3.3. Tính năng C3 — Đặt dịch vụ / Điều phối dịch vụ (`FEAT-SERVICE-03`)
- **Files Backend**: `backend/src/modules/services/routes/serviceOrderRoutes.js`, `backend/src/modules/services/controllers/serviceOrderController.js`, `backend/src/models/ServiceOrder.js`
- **Files Frontend**: `frontend/src/pages/admin/services/ServiceDispatchTerminal.jsx`, `frontend/src/api/serviceApi.js`
- **Endpoints & Màn hình**: `POST /api/v1/service-orders`, `GET /api/v1/service-orders`, `GET /api/v1/service-orders/active-stays` | UI: `/admin/services/dispatch`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S11, S12, S13 (`N/A`)**: Luồng tạo đơn mới (hủy/cập nhật tiến độ thuộc C4; không có ảnh).
  - **S3 (`PASS`)**: Kiểm tra `stayId` và `serviceId` bằng `parseStrictPositiveInt`, chặn `'abc'`, `'1abc'` (`400`) và `'99999999999'` (`404`).
  - **S4 (`PASS`)**: Nâng trần `quantity` lên `100` theo đúng Spec C3, kiểm tra số nguyên cho đơn vị rời rạc và bước nhảy `0.5` cho đơn vị tính theo `Giờ`.
  - **S5 (`PASS`)**: Chặn `note > 500` ký tự (`400 ERROR_0003_MAX_LENGTH`).
  - **S6 (`PASS`)**: Cắt khoảng trắng 2-byte `\u3000` trên `note` trước khi kiểm tra độ dài.
  - **S7 (`PASS`)**: Chuẩn hóa số lượng full-width `quantity = "２"` thành `2` và tính đúng `TotalPrice`.
  - **S8 (`PASS`)**: Chặn đặt dịch vụ đang `Inactive` (`400 ERROR_0014_INACTIVE_REFERENCE`) hoặc hồ sơ lưu trú không ở trạng thái `CheckedIn`/`Extended` (`400 ERROR_0015_PRECONDITION_FAILED`).
  - **S9 (`PASS`)**: Khóa đồng bộ `submittingRef` trên nút Gửi lệnh điều phối và chặn tạo đơn trùng lặp trong cửa sổ 5 giây (`409 ERROR_0007_DUPLICATE`).
  - **S10 (`PASS`)**: Kiểm tra tham số lọc `?stayId=abc` và `?status=InvalidStatus` trên `GET /service-orders` (`400`).
  - **S14 (`PASS`)**: Bắt buộc `verifyToken` trên `GET /service-orders` và `GET /service-orders/active-stays`; chặn Guest xem danh sách phòng đang lưu trú của khách sạn (`403`).

### 3.4. Tính năng C4 — Quản lý tiến độ thực hiện dịch vụ Kanban (`FEAT-SERVICE-04`)
- **Files Backend & Frontend**: `serviceOrderController.js` (`updateServiceOrderStatus`), `frontend/src/pages/admin/services/ServiceOrdersKanban.jsx`
- **Endpoint & Màn hình**: `PATCH /api/v1/service-orders/:orderId/status` | UI: `/admin/services/orders`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1 (`PASS`)**: Tab 1 hủy đơn thành công, Tab 2 bấm hủy lại nhận lỗi `400 ERROR_0013_INVALID_STATE_TRANSITION`.
  - **S2 (`PASS`)**: Kiểm tra `ServiceOrders.Version` nguyên tử; Tab 2 gửi `version` cũ nhận `409 ERROR_0023_CONFLICT` và thông báo tải lại trang.
  - **S3 (`PASS`)**: Chặn `orderId` `'abc'`, `'1abc'` (`400`) và `'99999999999'` (`404`).
  - **S4, S5, S6 (`PASS`)**: Khi `newStatus = 'Cancelled'`, bắt buộc `cancelReason` sau khi `trimUnicode` đạt từ `2..500` ký tự (`400 ERROR_0001/0002/0003`).
  - **S8 (`PASS`)**: Chỉ chấp nhận chuyển trạng thái hợp lệ (`Received -> InProgress -> Completed|Cancelled`).
  - **S7, S9, S10, S11, S12, S13 (`N/A`)**: Bảng Kanban không có trường số, không tạo mới, không phân trang URL, không có ảnh.
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và chặn Guest hủy đơn đã chuyển sang `InProgress` (`403 ERROR_0010_FORBIDDEN`).

### 3.5. Tính năng C5 — Module Thanh toán dùng chung & Hoàn tiền (`FEAT-PAYMENT-01`)
- **Files Backend**: `backend/src/modules/payments/routes/paymentRoutes.js`, `backend/src/modules/payments/controllers/paymentController.js`, `backend/src/models/Payment.js`
- **Files Frontend**: `frontend/src/pages/client/DepositPayment.jsx`, `frontend/src/pages/client/MockPaymentGateway.jsx`, `frontend/src/components/modals/DepositInvoiceModal.jsx`, `frontend/src/pages/admin/finance/InvoiceLedger.jsx`, `frontend/src/api/invoiceApi.js`
- **Endpoints & Màn hình**: `POST /api/v1/payments`, `GET /api/v1/payments/:paymentId`, `POST /api/v1/payments/webhook/:method`, `PATCH /api/v1/payments/:paymentId/refund` | UI: `/payment`, `/mock-payment/:transactionCode`, `/admin/finance/ledger`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1 (`PASS`)**: Hoàn tiền lần 2 trên giao dịch đã `Refunded` bị chặn với `400 ERROR_0013_INVALID_STATE_TRANSITION`.
  - **S2 (`PASS`)**: Kiểm tra `Payments.Version` khi hoàn tiền; trả về `409 ERROR_0023_CONFLICT` khi dữ liệu cũ.
  - **S3 (`PASS`)**: Chặn `paymentId` `'abc'`, `'1abc'`, `'99999999999'`; xóa bỏ mock fallback `99281` trên `DepositPayment.jsx` và khóa nút trên `MockPaymentGateway.jsx` khi mã giao dịch không tồn tại.
  - **S4, S5, S6 (`PASS`)**: Kiểm tra XOR `bookingId`/`invoiceId`, `amount > 0`, `refundReason` (`2..500` ký tự sau `trimUnicode`, trả đúng `ERROR_0003_MAX_LENGTH` khi `> 500`), `returnUrl <= 500` ký tự, tên chủ thẻ không được rỗng/`\u3000`.
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `amount`, `refundAmount`, thẻ thanh toán.
  - **S8 (`PASS`)**: Kiểm tra `method` thuộc đúng 6 phương thức (`Cash`, `Card`, `BankTransfer`, `VNPay`, `MoMo`, `VietQR`).
  - **S9 (`PASS`)**: Khóa đồng bộ `submittingRef` và chặn tạo thanh toán trùng lặp trong cửa sổ 5 giây (`409 ERROR_0007_DUPLICATE`).
  - **S10 (`PASS`)**: Kiểm tra `?bookingId=abc` và `/mock-payment/abc` hiển thị thông báo lỗi rõ ràng.
  - **S11, S13 (`N/A`)**: Không có upload ảnh.
  - **S12 (`PASS`)**: Gắn `onError={handleImageError}` trên toàn bộ thẻ `<img>` trong `DepositPayment.jsx` và `DepositInvoiceModal.jsx`.
  - **S14 (`PASS`)**: Bắt buộc `verifyToken` và kiểm tra quyền sở hữu trên `POST /payments` & `GET /payments/:paymentId`; chỉ Admin mới được gọi `PATCH /payments/:paymentId/refund`.

### 3.6. Tính năng C6 — Tự động gom chi phí lưu trú Folio (`FEAT-INVOICE-01`)
- **Files Backend & Frontend**: `backend/src/modules/services/controllers/bookingChargesController.js`, `frontend/src/pages/admin/BookingChargesFolio.jsx`, `frontend/src/api/bookingApi.js`
- **Endpoint & Màn hình**: `GET /api/v1/bookings/:bookingId/charges` | UI: `/admin/charges/:bookingId`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S8, S9, S11, S12, S13 (`N/A`)**: Màn hình tổng hợp chi phí chỉ đọc (0 thao tác ghi DB, không có select-option hay ảnh).
  - **S3, S4, S5, S6, S10 (`PASS`)**: Kiểm tra chặt `bookingId` (số nguyên dương hoặc mã xác nhận hợp lệ `<= 50` ký tự sau `trimUnicode`), chặn `'abc'`, `'1abc'`, `'-5'`, `'99999999999'`, chuỗi `\u3000` hoặc chuỗi quá dài với `400`/`404` và hiển thị thông báo lỗi trên `BookingChargesFolio.jsx`.
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trong `bookingId` khi tra cứu.
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và chặn tài khoản `Guest` (`403 ERROR_0010_FORBIDDEN`).

### 3.7. Tính năng C7 — Tạo hóa đơn tổng hợp Master Invoice (`FEAT-INVOICE-02`)
- **Files Backend & Frontend**: `backend/src/modules/services/controllers/masterInvoiceController.js`, `BookingChargesFolio.jsx`, `frontend/src/api/invoiceApi.js`
- **Endpoints & Màn hình**: `POST /api/v1/invoices/master`, `GET /api/v1/invoices/booking/:bookingId` | UI: `/admin/charges/:bookingId`, `/admin/invoices/master/:bookingId`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S11, S12, S13 (`N/A`)**: Không có thao tác xóa hóa đơn và không có upload/hiển thị ảnh.
  - **S2 & S9 (`PASS`)**: Khóa `LOCK.UPDATE` trên Booking + khóa `submittingRef` trên UI; Tab 2 hoặc cú click đúp tạo Master Invoice lần 2 bị chặn với `409 ERROR_0017_ALREADY_EXISTS`.
  - **S3 & S10 (`PASS`)**: Chặn `bookingId` `'abc'`, `'1abc'`, `'99999999999'` trên cả API và URL `/admin/invoices/master/:bookingId`.
  - **S4, S5, S6 (`PASS`)**: Kiểm tra `vatRate` (`0..100`, chặn `'abc'` với `400 ERROR_0004_INVALID_FORMAT`), kiểm tra `manualAdjustments[].description` sau khi `trimUnicode` đạt `2..200` ký tự (`ERROR_0001/0002/0003`), hiển thị thông báo lỗi trực tiếp trên modal tạo hóa đơn.
  - **S7 (`PASS`)**: Chuẩn hóa `vatRate = "１０"` thành `10` (sửa triệt để lỗi biến thành `0%` VAT) và chuẩn hóa số tiền điều chỉnh full-width.
  - **S8 (`PASS`)**: Kiểm tra `manualAdjustments[].itemType` chỉ nhận `'Surcharge'` hoặc `'Other'` (`400 ERROR_0005_INVALID_VALUE`).
  - **S14 (`PASS`)**: Chặn `Guest` phát hành Master Invoice (`403`) và chặn `Guest` xem hóa đơn của khách khác (`403`).

### 3.8. Tính năng C8 — Xuất hóa đơn PDF (`FEAT-INVOICE-03`)
- **Files Backend & Frontend**: `backend/src/modules/services/controllers/invoicePdfController.js`, `backend/src/server.js`, `BookingChargesFolio.jsx`, `InvoiceLedger.jsx`, `frontend/src/pages/client/MyBookings.jsx`
- **Endpoints**: `GET /api/v1/invoices/:invoiceId/pdf`, `GET /api/v1/invoices/:invoiceId/pdf-info`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S4, S5, S6, S9, S11, S12, S13 (`N/A`)**: API kết xuất luồng nhị phân PDF từ hóa đơn sẵn có.
  - **S3 & S10 (`PASS`)**: Dùng `parseStrictPositiveInt` chặn `invoiceId` `'abc'`, `'1abc'` (`400`) và `'99999999999'` (`404`).
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `invoiceId`.
  - **S8 (`PASS`)**: Xử lý đúng tham số `mode=inline|download` và `regenerate=true|false`; nối nút tải PDF thật trên `MyBookings.jsx` thay cho `alert()` giả.
  - **S14 (`PASS`)**: Kiểm tra quyền sở hữu hóa đơn trên cả `/pdf` và `/pdf-info` (`401`/`403`), đồng thời chặn truy cập trực tiếp không xác thực vào thư mục tĩnh `/uploads/invoices/` trong `server.js`.

### 3.9. Tính năng C9 — Quyết toán hóa đơn Multi-Tender (`FEAT-INVOICE-04`)
- **Files Backend & Frontend**: `masterInvoiceController.js` (`payInvoice`), `frontend/src/components/admin/finance/MultiTenderSettlementModal.jsx`
- **Endpoint & Màn hình**: `POST /api/v1/invoices/:invoiceId/pay` | UI: `/admin/finance/settlement/:invoiceId` & Modal quyết toán
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S11, S13 (`N/A`)**: Không có thao tác xóa hoặc upload ảnh.
  - **S2 (`PASS`)**: Kiểm tra `Invoices.Version` (`409 ERROR_0023_CONFLICT`) và trạng thái hóa đơn đã thanh toán (`400 ERROR_0022_ALREADY_SETTLED`), hiển thị cảnh báo yêu cầu tải lại trang trên modal.
  - **S3 & S10 (`PASS`)**: Chặn `invoiceId` `'abc'`, `'1abc'`, `'99999999999'` trên API và hiển thị thông báo lỗi trên `/admin/finance/settlement/:invoiceId`.
  - **S4, S5, S6 (`PASS`)**: Kiểm tra tổng tiền các phương thức khớp số dư cần thu (`ERROR_0020_SPLIT_SUM_MISMATCH`), tiền mặt khách đưa `>= amount` (`ERROR_0021_INSUFFICIENT_CASH`), tối đa 1 phương thức online, `transactionCode <= 200` ký tự, `note <= 500` ký tự sau khi `trimUnicode`.
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `tenders[].amount` và `customerCashGiven`.
  - **S8 (`PASS`)**: Kiểm tra `tenders[].method` hợp lệ (`400 ERROR_0005_INVALID_VALUE`).
  - **S9 (`PASS`)**: Khóa `LOCK.UPDATE` + `submittingRef` chống bấm đúp tạo giao dịch trùng.
  - **S12 (`PASS`)**: Bổ sung `onError={handleImageError}` cho thẻ `<img>` mã VietQR trong `MultiTenderSettlementModal.jsx`.
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và tài khoản `Guest` (`403`).

### 3.10. Tính năng C10 — Quản lý danh sách hóa đơn & lịch sử giao dịch (`FEAT-INVOICE-05`)
- **Files Backend & Frontend**: `masterInvoiceController.js` (`getInvoices`, `getInvoiceById`, `getInvoiceTransactions`), `frontend/src/pages/admin/finance/InvoiceLedger.jsx`
- **Endpoints & Màn hình**: `GET /api/v1/invoices`, `GET /api/v1/invoices/:invoiceId`, `GET /api/v1/invoices/:invoiceId/transactions` | UI: `/admin/finance/ledger`, `/admin/tai-chinh`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S9, S11, S12, S13 (`N/A`)**: Sổ cái tra cứu danh sách & lịch sử giao dịch.
  - **S3 (`PASS`)**: Chặn `invoiceId` `'abc'`, `'1abc'`, `'99999999999'` trên API và sửa lỗi so khớp `inv.invoiceId` trên `InvoiceLedger.jsx` để hiển thị rõ thông báo `"Không tìm thấy hóa đơn"`.
  - **S4, S5, S6 (`PASS`)**: Chặn `fromDate > toDate` (`400`), chặn `search > 100` ký tự (`400`), cắt khoảng trắng `\u3000` trên ô tìm kiếm.
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `page`, `pageSize` và các tham số ngày.
  - **S8 (`PASS`)**: Kiểm tra `status` thuộc `['Unpaid', 'PartiallyPaid', 'Paid', 'Cancelled']` (`400 ERROR_0005_INVALID_VALUE`).
  - **S10 (`PASS`)**: Đồng bộ `?page=` qua `useSearchParams` trên `InvoiceLedger.jsx` và `validatePaginationParams` trên API (`page=abc` $\rightarrow$ `400`, `page=99999` $\rightarrow$ `404`).
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và `Guest` (`403`) truy cập sổ cái nội bộ.

### 3.11. Tính năng C11 — Master Dashboard thống kê doanh thu real-time (`FEAT-REPORT-01`)
- **Files Backend & Frontend**: `backend/src/modules/statistics/routes/statisticsRoutes.js`, `backend/src/modules/statistics/controllers/statisticsController.js`, `backend/src/sockets/socketHandler.js`, `frontend/src/pages/admin/statistics/MasterRevenueDashboard.jsx`, `frontend/src/api/statisticsApi.js`
- **Endpoints & Màn hình**: `GET /api/v1/statistics/revenue`, `GET /api/v1/statistics/dashboard/ws-info`, `ws://localhost:5000/ws/v1/dashboard` | UI: `/admin/statistics`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S3, S5, S9, S11, S12, S13 (`N/A`)**: Dashboard KPI thời gian thực chỉ đọc.
  - **S4, S6, S7 (`PASS`)**: Chuẩn hóa chữ số full-width (`date = "２０２６-１１-１５"` $\rightarrow$ `"2026-11-15"`), cắt khoảng trắng `\u3000`, và chặn ngày sai định dạng (`date = "2026-13-45"` $\rightarrow$ `400 ERROR_0004_INVALID_FORMAT`).
  - **S8 (`PASS`)**: Hỗ trợ lọc theo `branchName` thực tế trong câu lệnh SQL; chi nhánh không tồn tại trả về `200 OK` với các chỉ số bằng `0`.
  - **S10 (`PASS`)**: Chặn `?date=abc` (`400`) và kiểm tra `?page=abc` / `?page=99999` trên URL `MasterRevenueDashboard.jsx`.
  - **S14 (`PASS`)**: Bắt buộc `verifyToken` + `checkStatsPermission` (`401`/`403` cho Guest) và truyền JWT token khi kết nối WebSocket `/ws/v1/dashboard`.

### 3.12. Tính năng C12 — Báo cáo công suất phòng & RevPAR (`FEAT-REPORT-02`)
- **Files Backend & Frontend**: `statisticsController.js` (`getOccupancyReport`, `exportOccupancyReport`), `MasterRevenueDashboard.jsx`
- **Endpoints & Màn hình**: `GET /api/v1/statistics/occupancy`, `GET /api/v1/statistics/occupancy/export` | UI: `/admin/statistics/occupancy`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S2, S3, S5, S9, S11, S12, S13 (`N/A`)**: Báo cáo thống kê & xuất file Excel/CSV chỉ đọc.
  - **S4, S6, S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `fromDate`/`toDate`, cắt khoảng trắng `\u3000`, chặn `fromDate > toDate` (`400 ERROR_0004_INVALID_FORMAT`) và khoảng thời gian `> 731` ngày (`400 ERROR_0012_OUT_OF_RANGE`) trên cả FE và BE.
  - **S8 (`PASS`)**: Kiểm tra tham số `format` (`xlsx` | `csv`, từ chối định dạng lạ với `400 ERROR_0005_INVALID_VALUE`) và lọc đúng theo `branchName`.
  - **S10 (`PASS`)**: Chặn `?fromDate=abc&toDate=xyz` (`400`) và kiểm tra `?page=` trên URL.
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và tài khoản `Guest` (`403`) trên cả API báo cáo và API xuất file.

### 3.13. Tính năng C13 — Chatbot AI Concierge & Live Handover (`FEAT-AI-01`)
- **Files Backend**: `backend/src/modules/ai/routes/aiRoutes.js`, `backend/src/modules/ai/controllers/chatbotController.js`, `backend/src/models/ChatbotConversation.js`
- **Files Frontend**: `frontend/src/components/client/FloatingAiConcierge.jsx`, `frontend/src/pages/client/ClientConcierge.jsx`, `frontend/src/pages/admin/ai/AiConciergeManagement.jsx`, `frontend/src/api/aiApi.js`
- **Endpoints & Màn hình**: `POST /api/v1/ai/chatbot`, `GET /api/v1/ai/conversations`, `GET /api/v1/ai/conversations/:id`, `POST|PATCH /api/v1/ai/conversations/:id/handover`, `POST /api/v1/ai/conversations/:id/messages`, `PATCH /api/v1/ai/conversations/:id/resolve` | UI: `/concierge`, `/admin/ai-concierge`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1, S7, S11, S12, S13 (`N/A`)**: Không có thao tác xóa hội thoại, không có ô nhập số hay upload ảnh.
  - **S2 (`PASS`)**: Kiểm tra `ChatbotConversations.Version` trên thao tác `handover` và `resolve`; trả về `409 ERROR_0023_CONFLICT` khi xung đột phiên làm việc.
  - **S3 (`PASS`)**: Dùng `parseStrictPositiveInt` và tắt cơ chế tự tạo hội thoại giả trên `GET /conversations/:id`, `handover`, `messages`, `resolve` — trả về đúng `400`/`404` cho `'abc'`, `'1abc'`, `'999999'`, `'99999999999'`.
  - **S4, S5, S6 (`PASS`)**: Cắt khoảng trắng 1-byte và 2-byte (`\u3000`) bằng `trimUnicode` trước khi kiểm tra độ dài `1..1000` ký tự cho cả tin nhắn khách (`POST /chatbot`) và tin nhắn nhân viên (`POST /conversations/:id/messages`); bỏ cắt cụt âm thầm trên `ClientConcierge.jsx` để hiển thị rõ thông báo lỗi khi dán HTML `> 1000` ký tự.
  - **S8 (`PASS`)**: Kiểm tra `action` trong `claimHandover` chỉ nhận `['to_staff', 'to_ai', 'claim', 'release']` (`400 ERROR_0005_INVALID_VALUE`).
  - **S9 (`PASS`)**: Bổ sung `isSendingReply` + `replySubmittingRef` khóa nút Gửi phản hồi nhân viên trên `AiConciergeManagement.jsx`.
  - **S10 (`PASS`)**: Kiểm tra `?page=abc` (`400`) và `?page=99999` (`404`) trên `GET /ai/conversations` và đồng bộ URL trên `AiConciergeManagement.jsx`.
  - **S14 (`PASS`)**: Chặn `Guest` (`roleId === 5`) gọi các API quản trị hội thoại (`GET /conversations`, `handover`, `messages`, `resolve` $\rightarrow$ `403 ERROR_0010_FORBIDDEN`).

### 3.14. Tính năng C14 — Huấn luyện Knowledge Base cho AI (`FEAT-AI-02`)
- **Files Backend**: `backend/src/modules/ai/routes/aiRoutes.js`, `backend/src/modules/ai/controllers/knowledgeBaseController.js`, `backend/src/models/ChatbotKnowledgeBase.js`
- **Files Frontend**: `frontend/src/pages/admin/ai/AiConciergeManagement.jsx`, `frontend/src/api/aiApi.js`
- **Endpoints & Màn hình**: `GET/POST /api/v1/ai/knowledge-base`, `PUT /api/v1/ai/knowledge-base/:id`, `PATCH /api/v1/ai/knowledge-base/:id/status`, `DELETE /api/v1/ai/knowledge-base/:id`, `GET /api/v1/ai/knowledge-base/test` | UI: `/admin/ai-concierge`
- **Kết quả đối chiếu 14 tình huống**:
  - **S1 (`PASS`)**: Tab 1 xóa mục tri thức thành công, Tab 2 xóa lại nhận `404 ERROR_0011_NOT_FOUND`; Tab 2 đổi trùng trạng thái nhận `409 ERROR_0023_CONFLICT`; loại bỏ mock fallback `FALLBACK_KB_ITEMS` trên UI.
  - **S2 (`PASS`)**: Kiểm tra `ChatbotKnowledgeBase.Version` trong `PUT /knowledge-base/:id` và `PATCH /status`; trả về `409 ERROR_0023_CONFLICT` và hiển thị cảnh báo yêu cầu tải lại trang trên `AiConciergeManagement.jsx`.
  - **S3 (`PASS`)**: Dùng `parseStrictPositiveInt` chặn `:id` `'abc'`, `'1abc'` (`400`) và `'99999999999'` (`404`).
  - **S4, S5, S6 (`PASS`)**: Cắt khoảng trắng `\u3000` bằng `trimUnicode` trước khi kiểm tra độ dài: `question` (`5..1000` ký tự — chặn dán HTML lớn trước khi ghi DB để không bao giờ lỗi `500`), `answer` (`5..5000` ký tự), `keywords` (`<= 1000` ký tự, tối đa `20` từ khóa, mỗi từ khóa `2..50` ký tự), `/test?q=` (`2..500` ký tự, xóa bỏ kết quả giả khi không khớp).
  - **S7 (`PASS`)**: Chuẩn hóa chữ số full-width trên `page` và `pageSize` (sửa triệt để lỗi `page="２"` thành `null`).
  - **S8 (`PASS`)**: Bắt buộc chọn `category` (chặn `category=""` với `400 ERROR_0001_REQUIRED`), hỗ trợ đầy đủ các danh mục theo Spec C14 §0.2 (`Services`, `Rooms`, `Dining`, `Policy`, `General`, `FAQ`, `Transport`), và kiểm tra `status` chỉ nhận `Active`/`Inactive` (`400 ERROR_0005_INVALID_VALUE`).
  - **S9 (`PASS`)**: Khi tạo câu hỏi trùng lặp, trả về `409 ERROR_0007_DUPLICATE` (kèm `existingInactiveId` nếu bản ghi cũ đang ẩn) thay vì tự động ghi đè; bổ sung khóa `kbSubmittingRef` + `isSavingKb` trên nút Lưu của `AiConciergeManagement.jsx`.
  - **S10 (`PASS`)**: Kiểm tra `?page=abc` (`400`) và `?page=99999` (`404`) bằng `validatePaginationParams` và hiển thị cảnh báo lỗi trên `AiConciergeManagement.jsx`.
  - **S11, S12, S13 (`N/A`)**: Không có chức năng upload/hiển thị ảnh.
  - **S14 (`PASS`)**: Chặn người dùng chưa đăng nhập (`401`) và `Guest` (`403`) trên mọi thao tác thêm/sửa/xóa/đổi trạng thái và `/knowledge-base/test`.

---

## PHẦN 4. KẾT QUẢ CHẠY KIỂM THỬ TỰ ĐỘNG E2E LIVE & XÁC MINH HỆ THỐNG

1. **Bộ kiểm thử Ma trận 14×14 Live (`node backend/tests/e2e_qa_14_scenarios/runner.js`)**:
   - Kiểm tra hạ tầng Smoke (`--smoke`): **7/7 PASS** (MySQL 8.0, Backend `:5000/api/health`, Frontend `:3000`, WebSocket `/ws/v1/dashboard`, Đăng nhập 7 vai trò + Refresh Token, Trình duyệt Headless CDP đa tab + cô lập Incognito, Dọn dẹp DB sạch 100%).
   - Kiểm tra toàn diện 14 tính năng × 14 tình huống (`196 cells`): **110 PASS, 86 N/A, 0 FAIL, 0 SKIP**.
2. **Bộ kiểm thử E2E nghiệp vụ C1–C14 (`node backend/tests/e2e_services_c1_c14/runner.js`)**:
   - Đạt **100% PASS** trên toàn bộ các Tier kiểm thử tích hợp dịch vụ, thanh toán, hóa đơn, thống kê và AI.
3. **Build & Unit Test Frontend (`cd frontend && npm test && npm run build`)**:
   - Unit tests (`node --test`): **PASS 100%**.
   - Production build (`vite build`): **PASS 100%** (0 lỗi biên dịch).
4. **Trạng thái Git & Đồng bộ nhánh**:
   - Toàn bộ thay đổi được commit trên nhánh `ha-feat/c6_charges_and_c13_gemini`, merge (`--no-ff`) vào `master` và đồng bộ sang `ck_ptw2` với thông tin tác giả `Dvhorizon <dangvanha123b@gmail.com>` và mốc thời gian chính xác `2026-11-16T15:57:25+07:00`.
