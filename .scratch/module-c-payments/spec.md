# Module C — Bước 0, C4, C5, C6 (C7 tạm hoãn)

Nguồn spec: `docs/Spec_ChiTiet_DichVu_C1-C14.txt` (bản local, không commit — chép từ `frontend/dist/`).
Chủ sở hữu: Đặng Văn Hà. Nhánh: `ha-feat/c3_services`.
Thứ tự: 01 → 02 → 03 → 04. Mỗi ticket xong thì dừng lại để review.

## Quyết định đã chốt (grill-me 2026-10-23)

| # | Chủ đề | Quyết định |
|---|---|---|
| D1 | `ServiceOrders.AssignedTo` | Chưa làm. Bảng ServiceOrders không có cột này (cột `AssignedTo` trong migration 001 thuộc bảng **Invoices**). C4 chỉ đổi Status. |
| D2 | Cột của Payments | Không viết migration. Status là `STRING(30)` nên không có ràng buộc ENUM. Hết hạn tính bằng `PaymentDate + TTL` (VietQR 15 phút, VNPay/MoMo 30 phút). `gatewayTransactionId` và `rawPayload` lưu dạng JSON trong `GatewayResponse`. |
| D3 | Vị trí file spec | Để ở `docs/`, chỉ local, không commit. |
| D4 | Mã lỗi | Mã lỗi nhận diện bằng cả chuỗi (số + tên). Trong repo vốn đã có nhiều số trùng, ví dụ `ERROR_0011_NOT_FOUND` và `ERROR_0011_INVALID_NUMBER`. Giữ nguyên `ERROR_0018_GENERATION_FAILED` và `ERROR_0018_RATE_LIMITED`. Chỉ sửa khi trùng **cả chuỗi**. C4 dùng `ERROR_0013_INVALID_STATE_TRANSITION` theo spec; mã này khác với `ERROR_0019_INVALID_STATUS_TRANSITION` đang có. |
| D5 | Phân quyền | Ghi danh mục dịch vụ (C1) cần `manage_services`, chỉ Admin. Thu tiền tại quầy (C5) cần `process_payment`, gồm Admin và Receptionist. Refund chỉ Admin. C7 (về sau) cần `create_invoice`, gồm Admin và Receptionist. Hệ thống không có vai trò Kế toán. Vai trò lấy từ `req.user.roleName` / `req.user.roleId` (xem `authMiddleware.js`). |
| D6 | Trạng thái "đã thu" | C5 ghi `'Paid'`. Khi tính số dư, coi `PAID_STATUSES = ['Paid','Success','Completed']` là đã thu. Seed và check-in ghi `Success`; A8 và CheckOutDesk ghi `Completed`. Không sửa code của người khác. |
| D7 | Số dư booking | Số dư = `Booking.TotalAmount − Σ đã thu`. Số tiền trả cho booking không được vượt TotalAmount. Hiện A8 cộng dồn vào `DepositAmount` (`+= payableAmount`), nên trường này đang có nghĩa là "số đã cọc". Cần Bảo xác nhận. |
| D8 | C7 Invoice master | Hoãn. `checkOutRoutes.js` đã tạo Invoice theo từng Stay, kèm InvoiceDetails và Payment, nên nếu giữ quy tắc ERROR_0017 của C7 thì C7 luôn bị chặn. Cần chốt với người làm CheckOutDesk và Trang. |
| D9 | `Processing` và `InProgress` | Dùng `InProgress`. C4 đọc `Processing` như bí danh của InProgress. Sửa `seedInHouseStays.js` để ghi `InProgress`. |
| D10 | `POST /sync-pos` | Bỏ endpoint, bỏ hàm API và nút gọi trên frontend. |
| D11 | Cách làm | TDD theo từng lát dọc. Thống nhất seam trước khi viết test. Dừng lại để review sau mỗi ticket. |
| D12 | Response C6 & Số dư | Trả đủ cấu trúc Mục 1.3 của Spec, bổ sung totalPaid (dựa trên PAID_STATUSES) và remainingBalance = grandTotal - totalPaid. |
| D13 | Vị trí C6 | Controller tại modules/services/controllers/bookingChargesController.js, route trong routes/bookings.js và alias /bookings/:bookingId/charges trong server.js. |
| D14 | Model MinibarUsages | Tạo model Sequelize MinibarUsage.js và khai báo association trong models/index.js. |
| D15 | Tính số đêm Stay | Làm tròn lên theo ngày (tối thiểu 1 đêm). Fallback Bookings.NumberOfNights nếu thiếu ActualCheckIn. |
| D16 | Lọc Service & F&B | ServiceOrders: chỉ Completed; nếu có Received/InProgress thì set hasPendingServices=true. FoodOrders: PaymentMode=RoomInvoice và Status IN ('Served', 'Delivered'). |

## Cần chốt với người khác
- **Bảo (A8):** ý nghĩa của `DepositAmount`; ai chuyển `Booking.Status` sau khi Payment Paid; khi nào bỏ `/bookings/:id/deposit`.
- **Người làm CheckOutDesk và Trang:** quan hệ giữa C7 và hóa đơn theo Stay; Payment status `Completed` hay `Paid`; VAT mặc định.
- **DB:** bảng `Roles` đang bị nhân 3 (RoleId 1–15) vì seed chạy lặp. Code kiểm tra theo `roleName` nên vẫn chạy, nhưng cần báo người phụ trách seed.
