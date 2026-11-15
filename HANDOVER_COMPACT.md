# BÁO CÁO BÀN GIAO PHIÊN LÀM VIỆC (HANDOVER & CONTINUATION SUMMARY)

> **Hướng dẫn sử dụng cho tài khoản mới:**
> Khi mở dự án `d:\2_Projects\CDPTW1-QuanLyKhachSan` ở tài khoản mới, bạn chỉ cần nhắn cho AI:
> *"Đọc file `HANDOVER_COMPACT.md` và thực hiện tiếp Mục 6 (Next Steps) để hoàn tất phiên làm việc."*

---

## 1. Tổng quan nhiệm vụ (Task Overview)
1. **Di chuyển bong bóng chat AI Concierge**: Cho phép kéo thả (drag & drop) bong bóng chat AI nổi trên giao diện khách hàng để không che khuất các nút điều khiển khác. *(Đã hoàn tất 100%)*
2. **Gộp Migration & Làm sạch Database Seeder**: Gộp toàn bộ schema C1–C14 vào 1 file migration duy nhất và tạo seeder sạch không trùng lặp dữ liệu. *(Đã hoàn tất 100%)*
3. **Sửa lỗi Hiển thị Đặt phòng & Gán phòng (Room Allocation)**: Mở rộng khoảng ngày lọc mặc định và sửa lỗi query SQL tìm phòng trống. *(Đã hoàn tất 100%)*
4. **Sửa lỗi Check-in (`SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`)**: Khắc phục triệt để lỗi trả về HTML thay vì JSON khi nhận phòng tại `CheckInDesk.jsx` và các endpoint Express ở Backend. *(Đã xong 95% — chỉ còn 3 chỉnh sửa nhỏ từ bước Code Review ở Mục 6)*.

---

## 2. Tiến độ đã hoàn thành (Completed Work)

### A. Draggable Floating AI Concierge (100% PASS)
- [draggableUtils.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/utils/draggableUtils.js): Hàm tính toán toạ độ, giới hạn biên viewport (`clampPosition`), ngưỡng kéo phân biệt click vs drag (`DRAG_THRESHOLD_PX = 5`), đọc/ghi `localStorage` an toàn.
- [useDraggable.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/hooks/useDraggable.js): Custom React hook quản lý Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`), tự động điều chỉnh vị trí khi `window.resize`.
- [FloatingAiConcierge.jsx](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/components/client/FloatingAiConcierge.jsx): Tích hợp `useDraggable`, thêm `touch-action: none`, `user-select: none` và hiệu ứng con trỏ `cursor-grab` / `cursor-grabbing`.
- **Tests**: [draggableUtils.test.mjs](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/tests/draggableUtils.test.mjs) & [draggableInteraction.test.mjs](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/tests/draggableInteraction.test.mjs) (26/26 PASS + 10,000 vòng Monte Carlo fuzzing PASS).

### B. Gộp Migration & Seeder sạch (100% PASS)
- [001_create_all_tables.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/migrations/001_create_all_tables.js): Gộp toàn bộ schema C1–C14 vào 1 file migration duy nhất.
- [seedPristineClean.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/seeders/seedPristineClean.js): Xoá dữ liệu rác trùng lặp, bổ sung quyền RBAC (`CHECKIN_CREATE` - PermissionId: 31 cho Role 1 Admin & Role 2 Receptionist) và phòng trống cho hạng phòng Lotus Spa Suite (RoomType 7).

### C. Đặt phòng & Gán phòng (100% PASS)
- [BookingManagement.jsx](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/pages/BookingManagement.jsx) & [bookings.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/routes/bookings.js): Mở rộng mặc định bộ lọc `dateTo` thành `today + 30 days`.
- [roomAllocationController.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/controllers/admin/roomAllocationController.js): Sửa lỗi push lặp tham số SQL (`params.push`) khiến truy vấn tìm phòng trống trả về rỗng.

### D. Khắc phục lỗi Check-in `Unexpected token '<'` (Phase 1 Hoàn tất)
- [server.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/server.js): Thêm JSON 404 Catch-all Middleware cho toàn bộ `/api/*` (trả về HTTP 404 kèm `{ success: false, code: 'ERROR_0004_NOT_FOUND', message: 'Tài nguyên API không tồn tại' }`) và đăng ký các route alias cho check-in (`/api/v1/checkin`, `/api/checkin`, `/api/v1/stays/check-in`, `/api/v1/pms/check-in`).
- [index.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/modules/pms/index.js): Đồng bộ hóa các route check-in trong module PMS.
- [errorHandler.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/shared/middlewares/errorHandler.js): Ép kiểu header `Content-Type: application/json; charset=utf-8` và bắt lỗi cú pháp JSON từ `body-parser` (`400 ERROR_0002_INVALID_FORMAT`).
- [CheckInDesk.jsx](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/pages/admin/CheckInDesk.jsx): Bổ sung `safeFetchJson` (kiểm tra `content-type` và tiền tố `<!DOCTYPE` / `<html` trước khi `JSON.parse`) cùng hàm `sanitizeErrorMessage` để hiển thị thông báo tiếng Việt.

---

## 3. Phát hiện kỹ thuật quan trọng (Key Findings)
- **Nguyên nhân gốc rễ lỗi `Unexpected token '<'`:** Khi Frontend gọi API tới một đường dẫn chưa khớp hoặc proxy trả về lỗi 404/502, Express mặc định trả về trang HTML `<!DOCTYPE html>...`. Hàm `res.json()` ở Frontend parse trực tiếp chuỗi HTML này gây văng lỗi `SyntaxError: Unexpected token '<'`.
- **SQL Filter trong `checkInController.js`:** Hàm `findBookingByCodeOrId` hiện đang lọc bỏ các đơn có trạng thái `Cancelled` ngay trong mệnh đề `WHERE` của SQL. Điều này khiến đơn đã hủy bị trả về lỗi `404 ERROR_0004_NOT_FOUND` thay vì trả về đúng mã lỗi nghiệp vụ `400 ERROR_0018_BOOKING_STATUS` ("Đặt phòng đã bị hủy, không thể nhận phòng").

---

## 4. Trạng thái môi trường hiện tại (Active Context)
- **Workspace**: `d:\2_Projects\CDPTW1-QuanLyKhachSan` (OS: Windows, Shell: PowerShell).
- **Docker Containers**: `hotel_backend` (port 5000), `hotel_frontend` (port 3000), `hotel_mysql` (port 3306) đang hoạt động.
- **Database**: Đã được gộp migration và chạy `seedPristineClean.js` sạch sẽ.

---

## 5. Các bước tiếp theo cho tài khoản mới (Next Steps)

Thực hiện tuần tự 4 bước sau để hoàn tất 100% công việc:

### Bước 1: Áp dụng 3 chỉnh sửa nhỏ từ kết quả Code Review
1. **[checkInController.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/src/controllers/admin/checkInController.js)**: Trong hàm `findBookingByCodeOrId`, bỏ điều kiện lọc loại trừ `Cancelled` trong mệnh đề `WHERE` của SQL để hàm vẫn lấy được bản ghi Booking đã hủy, từ đó bước kiểm tra trạng thái phía sau trả về đúng chuẩn HTTP `400` với mã `ERROR_0018_BOOKING_STATUS`.
2. **[CheckInDesk.jsx](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/frontend/src/pages/admin/CheckInDesk.jsx)**: Tại khối `try / catch` của hàm quét OCR giấy tờ tùy thân (document scanning), sửa `catch {` thành `catch (err) {` và truyền `err` qua hàm `sanitizeErrorMessage(err)` trước khi hiển thị toast lỗi.
3. **[test_checkin_safe_error_handling.js](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/backend/tests/test_checkin_safe_error_handling.js)**: Ở cuối file test, đảm bảo đóng mock server bằng `await new Promise(r => server.close(r))` để không bị cảnh báo `libuv assertion` trên Windows khi tiến trình kết thúc.

### Bước 2: Chạy lại bộ lệnh kiểm thử tự động (Verification Commands)
```powershell
node backend/tests/test_checkin_safe_error_handling.js
node backend/tests/test_checkin_api_integration.js
node backend/src/tests/test_spec8.js
npm run --prefix frontend build
```

### Bước 3: Đồng bộ container Backend (nếu chạy qua Docker)
- Khởi động lại hoặc đảm bảo code mới nhất trong `backend/` đã được cập nhật vào container `hotel_backend`.

### Bước 4: Báo cáo hoàn tất cho User bằng tiếng Việt.

---

## 6. Quy tắc & Ràng buộc cần tuân thủ (Constraints)
- Giao tiếp và viết báo cáo, thông báo lỗi trên UI hoàn toàn bằng **tiếng Việt**.
- Giữ nguyên cấu trúc khoá ngoại, indexes và ràng buộc dữ liệu của các bảng theo đúng đặc tả C1–C14.
- Không xoá hoặc làm hỏng dữ liệu sạch đã được khởi tạo từ `backend/src/seeders/seedPristineClean.js`.
- Tuân thủ quy tắc trong [AGENTS.md](file:///d:/2_Projects/CDPTW1-QuanLyKhachSan/AGENTS.md): Issues lưu tại `.scratch/<feature>/`, tài liệu domain tại `GLOSSARY.md` và `docs/adr/`.

