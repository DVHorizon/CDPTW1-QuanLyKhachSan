# 02 — C4: PATCH /api/v1/service-orders/:orderId/status

Status: resolved
Type: task
Blocked by: 01

## Hành vi
- Route dùng `verifyToken`. Không có token thì trả 401 `ERROR_0009_UNAUTHENTICATED`.
- Body gồm `newStatus` ∈ {InProgress, Completed, Cancelled} và `cancelReason`. Giá trị khác, kể cả `Received`, là không hợp lệ.
- Không tìm thấy đơn thì trả 404 `ERROR_0011_NOT_FOUND`.
- Ma trận chuyển trạng thái (`Processing` được hiểu là InProgress, theo D9):
  - Received → InProgress | Completed | Cancelled
  - InProgress → Completed | Cancelled
  - Completed và Cancelled là trạng thái cuối.
  - Chuyển ngoài ma trận thì trả `ERROR_0013_INVALID_STATE_TRANSITION`, message “Không thể chuyển trạng thái từ {A} sang {B}”.
- Phân quyền được kiểm tra trước khi validate dữ liệu:
  - Nhân viên (mọi vai trò khác Guest) cập nhật được mọi đơn.
  - Guest chỉ được huỷ đơn của chính mình (Stay/Booking của Guest, xác định giống `createServiceOrder`), và chỉ khi đơn còn ở Received.
  - Guest huỷ đơn InProgress thì trả 403 `ERROR_0010_FORBIDDEN`, message “Đơn đang được xử lý, vui lòng liên hệ lễ tân để huỷ”.
- Khi chuyển sang Cancelled:
  - `cancelReason` thiếu hoặc rỗng → `ERROR_0001_REQUIRED`
  - ngắn hơn 2 ký tự → `ERROR_0002_MIN_LENGTH`
  - dài hơn 500 ký tự → `ERROR_0003_MAX_LENGTH`
  - Ghi đè `Note` bằng `cancelReason`. Không đổi `TotalPrice`.
- Thành công trả 200, message “Cập nhật trạng thái đơn dịch vụ thành công”.
- Sửa `seeders/seedInHouseStays.js`: thay `'Processing'` bằng `'InProgress'`.

## Test
Viết 6 test case theo mục 4.7 của spec, đặt ở `backend/tests/test_feat_service_04_status.js` và thêm script `test:service-status`.

## Comments
- Đã hoàn tất và pass 6/6 test case chuẩn spec mục 4.7 trong `backend/tests/test_feat_service_04_status.js`.
- Đã commit lên branch `ha-feat/c4_service_orders_status` (commit `b01d210`).
