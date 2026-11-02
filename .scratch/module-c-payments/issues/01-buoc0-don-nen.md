# 01 — Bước 0: Dọn nền

Status: resolved
Type: task

## Việc cần làm
- [x] `modules/services/routes/serviceRoutes.js` → `checkServicePermission`:
  - Không có token thì trả 401 `ERROR_0009_UNAUTHENTICATED`, bất kể `STRICT_AUTH`.
  - Route ghi (POST/PUT/PATCH/DELETE) yêu cầu Admin hoặc quyền `manage_services` (D5). Không đủ quyền thì trả 403 `ERROR_0010_FORBIDDEN`.
  - Route GET giữ nguyên hành vi hiện tại.
- [x] Bỏ `POST /sync-pos`: route, `serviceController.syncToPos`, hàm gọi trong `frontend/src/api/serviceApi.js` và nút trên UI (D10).
- [x] Đối chiếu C1 `POST /api/v1/services/categories`: đã thêm route và controller `createCategory`, validate đầy đủ (tên 2-100 ký tự, chống trùng lặp NFD không dấu, phân quyền ghi).
- [x] Đối chiếu C3 `items[]`: xác nhận `createServiceOrder` validate toàn bộ items trước khi `bulkCreate`, một item lỗi thì dừng ngay không tạo dòng nào.

## Không làm
- `ServiceOrders.AssignedTo` (D1).

## Comments
- Đã hoàn tất và pass 100% test case trong `backend/tests/test_feat_service_01_step0.js`.
- Đã commit lên branch `ha-feat/c4_service_orders_status` (commit `5584b33`).
