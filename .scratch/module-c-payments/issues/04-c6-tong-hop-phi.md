# 04 — C6: GET /api/v1/bookings/:id/charges

Status: done
Type: task
Blocked by: 03

- Endpoint chỉ đọc dữ liệu. Chỉ nhân viên (vai trò khác Guest) được gọi.
- Tổng hợp đầy đủ 7 luồng chi phí vận hành của Booking (gộp tất cả Stays):
  1. Tiền phòng cơ sở (`stays[].room` / `roomSubtotal`) — tự động tách số đêm hợp đồng gốc khỏi số đêm gia hạn để không nhân đôi hoặc làm loãng đơn giá đêm.
  2. Phí gia hạn lưu trú (`StayExtensions` có `ExtensionStatus = 'CONFIRMED'`) & phụ thu nâng hạng đổi phòng (`RoomMoveRequests` có `MoveStatus = 'COMPLETED'`, `RateDifference > 0`) -> trả về mảng phẳng `extensions[]` và `summary.extensionSubtotal`.
  3. Tiêu dùng Minibar (`MinibarUsages` tra tên từ `InventoryItems` + `MinibarProducts`, fallback sang `MinibarInspectionLines` `CONFIRMED`) -> trả về `minibar[]` và `summary.minibarSubtotal`.
  4. Dịch vụ khách sạn (`ServiceOrders` ở trạng thái `Completed`, kèm phân loại `ServiceCategories`) -> trả về `services[]` và `summary.serviceSubtotal`.
  5. Ẩm thực F&B ghi nợ phòng (`FoodOrders` có `PaymentMode = 'RoomInvoice'` và `Status IN ('Served', 'Delivered', 'Completed')`) -> trả về `foodAndBeverage[]` và `summary.foodSubtotal`.
  6. Bồi thường thiệt hại buồng phòng & phạt kiểm phòng (`DamageItems` `APPROVED/CONFIRMED/CHARGED` + `RoomInspectionReports` `LinenDamageFee` & `KeycardLossPenalty`) -> trả về `damages[]` và `summary.damageSubtotal`.
  7. Phụ thu / Giảm giá cấp Booking (`netSurcharge = MAX(0, Bookings.SurchargeAmount - extensionSubtotal - damageSubtotal)`, `discountAmount = Bookings.DiscountAmount`) và đối trừ thanh toán/đặt cọc từ Module C5 (`PAID_STATUSES` trừ `RefundAmount`) -> trả về `grandTotal`, `totalPaid`, `remainingBalance`.
- Cảnh báo `hasPendingServices = true` khi còn `ServiceOrders`, `FoodOrders (RoomInvoice)` hoặc `DamageItems` đang xử lý/chờ duyệt.
- Nếu booking chưa có Stay thì trả `estimated=true`.
- Không đụng tới bảng Invoices.
- Phần "đã thanh toán" dùng `PAID_STATUSES` từ Core Payment và trả kèm `totalPaid`, `remainingBalance` (D12).
- Tạo `MinibarUsage` model với association đầy đủ (D14).

## Comments
- 2026-10-26 (Hà): Đã hoàn thiện toàn bộ tính năng C6 (FEAT-INVOICE-01). Controller đặt tại `modules/services/controllers/bookingChargesController.js`, route gắn tại `routes/bookings.js` và alias `/bookings/:bookingId/charges` trong `server.js`. Test suite `test_feat_invoice_01_c6.js` bao phủ đủ 8/8 TC theo Spec Mục 1.7.
- 2026-10-26 (Hà): Hoàn thiện Frontend C6:
  + API helper: `frontend/src/api/bookingApi.js` (`getBookingCharges`).
  + Component UI: `frontend/src/components/admin/BookingChargesModal.jsx` và `frontend/src/pages/admin/BookingChargesFolio.jsx` (`/admin/charges`).
  + Tích hợp vào `frontend/src/pages/BookingManagement.jsx`: Nút icon "Bảng kê" tại từng dòng trong bảng đặt phòng và nút "Xem Bảng Kê Chi Phí Lưu Trú (Folio)" trong popup Chi tiết booking.
- 2026-11-11 (Hà): Đồng bộ Spec C6 & Controller `bookingChargesController.js` với toàn bộ các luồng phát sinh chi phí mới trên `master` (StayExtensions, RoomMoveRequests, MinibarProducts/MinibarInspectionLines, ServiceCategories, FoodOrders RoomInvoice, DamageItems/RoomInspectionReports) và cập nhật hiển thị bảng trên `BookingChargesFolio.jsx` & `BookingChargesModal.jsx`.
