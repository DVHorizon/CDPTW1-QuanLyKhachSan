# 04 — C6: GET /api/v1/bookings/:id/charges

Status: done
Type: task
Blocked by: 03

- Endpoint chỉ đọc dữ liệu. Chỉ nhân viên (vai trò khác Guest) được gọi.
- Tính phí từ: đơn dịch vụ ở trạng thái Completed, và đơn F&B có `PaymentMode=RoomInvoice` và `Status IN ('Served', 'Delivered')`.
- Nếu booking chưa có Stay thì trả `estimated=true`.
- Không đụng tới bảng Invoices.
- Phần "đã thanh toán" dùng `PAID_STATUSES` từ Core Payment và trả kèm `totalPaid`, `remainingBalance` (D12).
- Tạo `MinibarUsage` model với association đầy đủ (D14).

## Comments
- 2026-10-26 (Hà): Đã hoàn thiện toàn bộ tính năng C6 (FEAT-INVOICE-01). Controller đặt tại `modules/services/controllers/bookingChargesController.js`, route gắn tại `routes/bookings.js` và alias `/bookings/:bookingId/charges` trong `server.js`. Test suite `test_feat_invoice_01_c6.js` bao phủ đủ 8/8 TC theo Spec Mục 1.7.
- 2026-10-26 (Hà): Hoàn thiện Frontend C6:
  + API helper: `frontend/src/api/bookingApi.js` (`getBookingCharges`).
  + Component UI: `frontend/src/components/admin/BookingChargesModal.jsx` (Master Folio Preview: hiển thị danh sách Stays, Minibar, Dịch vụ phát sinh, F&B RoomInvoice, cảnh báo dịch vụ chưa xong, tổng hợp Grand Total, Đã cọc/thanh toán, Số dư nợ, hỗ trợ Print).
  + Tích hợp vào `frontend/src/pages/BookingManagement.jsx`: Nút icon "Bảng kê" tại từng dòng trong bảng đặt phòng và nút "Xem Bảng Kê Chi Phí Lưu Trú (Folio)" trong popup Chi tiết booking.
  + Kiểm tra `npm run build` thành công 100%.
