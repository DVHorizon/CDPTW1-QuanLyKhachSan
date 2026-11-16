# 05 — C7: Invoice master (chờ chốt)

Status: needs-info
Type: grilling

`checkOutRoutes.js` đã tạo Invoice theo từng Stay. Nếu giữ quy tắc “booking đã có Invoice thì trả ERROR_0017” thì C7 sẽ luôn bị chặn.

Cần chốt với người làm CheckOutDesk và Trang. Hai hướng đang cân nhắc:
1. Checkout gọi C7 để lập hóa đơn.
2. C7 chỉ gộp các hóa đơn Stay đã có (Invoice master có `StayId = NULL`).

Các điểm cần chốt thêm:
- Đổi `Invoices.StayId` thành nullable.
- Nơi lưu VAT mặc định.

## Comments
