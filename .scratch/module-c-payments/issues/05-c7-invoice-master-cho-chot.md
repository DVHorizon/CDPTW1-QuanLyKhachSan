# 05 — C7, C8, C9: Master Invoice, Xuất PDF VAT & Quyết toán Đa phương thức (VietQR)

Status: done
Type: task
Blocked by: 04

## Nội dung đã hoàn thiện & chuẩn hoá
1. **C7 — Tạo Hoá Đơn Tổng Hợp (`POST /api/v1/invoices/master` — `masterInvoiceController.js`):**
   - Mở DB Transaction với `lock: t.LOCK.UPDATE` trên `Booking`, `Invoice`, `Payments` để chống Race Condition.
   - Chặn tạo trùng hoá đơn (`409 ERROR_0017_ALREADY_EXISTS`).
   - Kết xuất trực tiếp từ `calculateBookingChargesData` (C6) gồm đủ 6 nguồn chi phí (`Room`, `Extension`, `Service`, `Minibar`, `Food`, `Damage`) + `Surcharge` / `Other` (`DiscountAmount`) + `manualAdjustments[]`.
   - Chuẩn hoá làm tròn 2 chữ số thập phân (`Math.round(val * 100) / 100`) cho `Subtotal`, `VATAmount` (mặc định `10%`), `TotalAmount`.
   - Tự động liên kết các khoản tiền cọc `Payments` (`Status ∈ PAID_STATUSES`) vào `InvoiceId` mới và suy diễn trạng thái `Unpaid / PartiallyPaid / Paid`.
2. **C8 — Xuất Hoá Đơn PDF Chuẩn VAT (`GET /api/v1/invoices/:id/pdf` & `/pdf-info` — `invoicePdfController.js`):**
   - Sinh file PDF tiếng Việt chuẩn mẫu thuế GTGT, lưu cache tại `/uploads/invoices/INV-{InvoiceNumber}.pdf`, hỗ trợ watermark `ĐÃ HUỶ / CANCELLED` và tự động xoá cache (`invalidateInvoicePdfCache`) khi có thanh toán mới hoặc hoàn tiền.
3. **C9 — Quyết Toán Đa Phương Thức & VietQR (`POST /api/v1/invoices/:id/pay` & `MultiTenderSettlementModal.jsx`):**
   - Hỗ trợ ghép 1–3 phương thức thanh toán (`Cash`, `Card`, `BankTransfer`, `VietQR`, `VNPay`, `MoMo`), tính tiền thối (`changeDue`), tạo mã QR VietQR động (`img.vietqr.io`) và kết nối cổng giả lập `/mock-payment/:transactionCode`.

## Comments
- 2026-11-11 (Hà): Đã hoàn thiện, chuẩn hoá spec và pass 100% bộ kiểm thử tích hợp `test_feat_invoice_c6_c7_c8.js` cùng 40/40 test cases E2E Tier 1 & Tier 2 cho C5, C6, C7, C8, C9.
