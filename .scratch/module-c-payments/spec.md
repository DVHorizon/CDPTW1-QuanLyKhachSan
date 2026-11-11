
# Module C — Đặc tả & Trạng thái Hoàn thiện Toàn diện (C1 → C14)

Nguồn spec chuẩn: `docs/Spec_ChiTiet_DichVu_C1-C14.txt`.
Chủ sở hữu: Đặng Văn Hà. Nhánh: `ha-feat/c6_charges_and_c13_gemini`.
Trạng thái: **HOÀN THÀNH 100% (C1 → C14 đều đã triển khai, chuẩn hoá công thức và vượt qua 100% bài kiểm thử tự động & E2E)**.


## Quyết định kỹ thuật & Kiến trúc đã chốt (Đã đồng bộ 100% với Codebase)

| # | Chủ đề | Quyết định chuẩn hoá trong Codebase |
|---|---|---|
  | D1 | `ServiceOrders.Status` (C3, C4) | Luồng trạng thái chuẩn: `Received → InProgress → Completed / Cancelled` (tương thích ngược đọc cả `Processing` như `InProgress`). |
  | D2 | Cột & TTL của `Payments` (C5) | Mã giao dịch chuẩn `PMT-{yyyyMMddHHmmss}-{4 số}`. Hết hạn tính theo Lazy Timeout từ `PaymentDate + TTL` (VietQR: 15 phút, VNPay/MoMo: 30 phút). `GatewayResponse` lưu JSON chứa `gatewayTransactionId`, `rawPayload`, `qrCodeData`. |
  | D3 | Vị trí file spec | Lưu tại `docs/Spec_ChiTiet_DichVu_C1-C14.txt`, đồng bộ 100% với triển khai thực tế của C1–C14. |
  | D4 | Hệ thống mã lỗi | Chuẩn hoá xuyên suốt từ `ERROR_0001_REQUIRED` đến `ERROR_0022_ALREADY_SETTLED` và `SUCCESS_0001_CREATED` / `SUCCESS_0002_UPDATED`. Giao diện người dùng lọc sạch mã lỗi thô qua `toastSanitizer.js`. |
  | D5 | Phân quyền | Quản trị dịch vụ (C1) và Cơ sở tri thức AI (C14 - Ghi/Xoá): chỉ `Admin`. Thu tiền tại quầy (C5/C9), xem Bảng kê (C6), lập Master Invoice (C7), xuất PDF (C8), xem Sổ cái (C10) và tiếp nhận Handover AI (C13): `Admin`, `Manager`, `Receptionist`, `Accountant`. Hoàn tiền (Refund C5): chỉ `Admin`. |
  | D6 | Trạng thái "Đã thu" (`PAID_STATUSES`) | Khi tính tổng tiền đã thanh toán ở C5/C6/C7/C9, công nhận `PAID_STATUSES = ['Paid', 'Success', 'Completed']` theo công thức ròng `SUM(MAX(0, Amount − RefundAmount))`. |
  | D7 | Công thức Gom chi phí 6 nguồn (C6) | Tách bạch đêm hợp đồng gốc (`baseContractNights`) và đêm gia hạn (`StayExtensions` CONFIRMED) để chống nhân trùng tiền phòng ("Floating Nights"). Cộng đủ 6 nguồn: `Room + Extensions + Services (Completed) + Minibar + Food (RoomInvoice & Served/Delivered) + Damages (DamageItems + RoomInspectionReports)`. Khử trùng lặp phụ thu: `netSurcharge = MAX(0, Bookings.SurchargeAmount − extensionSubtotal − damageSubtotal)`. |
  | D8 | Master Invoice (C7) & Xuất PDF (C8) | Đã hoàn thiện tại `masterInvoiceController.js` & `invoicePdfController.js`. Dùng `SELECT ... FOR UPDATE` chống Race Condition, chặn tạo trùng (`409 ERROR_0017_ALREADY_EXISTS`), làm tròn 2 chữ số thập phân chống sai số IEEE 754, tự động liên kết tiền cọc `Payments` và tự động xoá cache PDF (`invalidateInvoicePdfCache`) khi quyết toán/hoàn tiền. |
  | D9 | Quyết toán đa phương thức & VietQR (C9) | Đã hoàn thiện tại `payInvoice` (`POST /api/v1/invoices/:invoiceId/pay`) & `MultiTenderSettlementModal.jsx`. Hỗ trợ chia 1–3 phương thức (`Cash`, `Card`, `VietQR`, `VNPay`, `MoMo`, `BankTransfer`), tính tiền thối (`changeDue`), hiển thị QR động `img.vietqr.io` và cổng giả lập `/mock-payment/:transactionCode`. |
  | D10 | AI Concierge (C13) & Knowledge Base (C14) | Tích hợp **Google Gemini API thật** (`gemini-3.1-flash-lite` → `gemini-3.5-flash-lite` → `gemini-flash-latest`) kết hợp RAG từ `ChatbotKnowledgeBase` (25 Q&A chuẩn 5 sao), chống Prompt Injection, giới hạn 20 req/phút, tự động khôi phục phiên (`findOrRecoverConversation`) và đồng bộ Handover 2 chiều thời gian thực giữa `FloatingAiConcierge.jsx` và `AiConciergeManagement.jsx`. |
