# 03 — C5: Core Payment

Status: done
Type: task
Blocked by: 02

Làm theo checklist C5 (5.2 → 5.7), có các điều chỉnh sau:
- Không viết migration cho Payments (D2). TTL tính từ `PaymentDate`. `GatewayResponse` lưu JSON dạng `{ gatewayTransactionId, rawPayload, ... }`.
- `PAID_STATUSES = ['Paid','Success','Completed']` dùng khi tính tổng đã thu (D6). Bản ghi mới tạo thì ghi `'Paid'`.
- Số dư booking = `TotalAmount − Σ đã thu` (D7). Số dư invoice = `TotalAmount − Σ đã thu của invoice`.
- Quyền: dùng `process_payment` cho Cash/Card/BankTransfer; refund chỉ Admin (D5).
- Webhook cho booking: chỉ ghi nhận Payment, không đổi `Booking.Status`.
- Gỡ `app.post('/payments', ...processDepositPayment)` trong `server.js`. Giữ `/bookings/:id/deposit`.

## Comments
- 2026-10-26 (Hà): Đã hoàn thiện toàn bộ Core Payment Module C5, đối chiếu spec và test suite pass 11/11 TC. Đã cập nhật 3 điểm nghiệp vụ chốt (D5, D6, D7), áp dụng `PAID_STATUSES`, tính số dư theo `TotalAmount - Σ đã thu`, tách biệt vòng đời booking cho A8.
