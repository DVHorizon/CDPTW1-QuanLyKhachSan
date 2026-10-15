# Grand Horizon PMS (Property Management System) — Admin & Staff Design System

> **Tài liệu đặc tả hệ thống thiết kế giao diện Quản trị & Vận hành Khách sạn**  
> Dựa trên Moodboard chuẩn: **Grand Horizon Hospitality · Product language** (`Baseline · 20260905-2`)  
> Triết lý thiết kế: **"Calm operations. Clear decisions."** (Vận hành điềm tĩnh · Quyết định chuẩn xác)

---

## 1. Tầm nhìn & Nguyên lý Thiết kế (Design Principles)

Hệ thống quản trị khách sạn **Grand Horizon PMS** phục vụ các bộ phận: **Lễ tân (Front Desk), Buồng phòng (Housekeeping), Thu ngân (Folio & Billing), Kế toán và Ban Quản lý (Admin)**. Môi trường làm việc yêu cầu nhân viên phải xử lý khối lượng dữ liệu lớn trong thời gian thực, tốc độ cao và áp lực phục vụ khách trực tiếp.

1. **Calm Operations (Giao diện dịu mắt, giảm tải căng thẳng)**:
   - Sử dụng nền kính sáng mờ (*Light glass surfaces*) với hiệu ứng khuếch tán ánh sáng tự nhiên từ `#FBFCFF` sang `#EEF7F5`.
   - Loại bỏ các đường viền đen đậm, thay bằng viền mờ `rgba(70, 90, 106, 0.17)`.
2. **Clear Decisions (Trực quan hóa trạng thái, hạn chế nhầm lẫn)**:
   - Mã màu trạng thái nghiệp vụ chuẩn hóa: **"Same meaning everywhere"** (Đồng nhất ý nghĩa trên mọi màn hình: Dashboard, Lịch phòng, Front Desk, Buồng phòng).
   - **Quy tắc vàng tiếp cận (Accessibility Rule)**: *Không bao giờ sử dụng màu sắc đơn độc* — Luôn kết hợp màu với Icon hoặc Text nhãn rõ ràng.
3. **High Density & Fast Scanability (Mật độ cao, quét nhanh)**:
   - Sử dụng font chữ **Plus Jakarta Sans** (kết hợp **Playfair Display** cho tiêu đề thương hiệu) với tính năng `tabular-nums` (số hiển thị đồng độ rộng) cho tiền tệ, số phòng và KPI.
   - Nhịp lưới chuẩn **8pt rhythm** giúp bố cục cân đối và dễ canh chỉnh.
4. **Mobile-First & Responsive Ready (Tối ưu hóa thiết bị di động 390px)**:
   - Nhân viên buồng phòng và lễ tân di động có thể sử dụng mượt mà trên điện thoại/máy tính bảng với vùng chạm tối thiểu **44px**.

---

## 2. Bảng Token Thiết Kế Cốt Lõi (Core Design Tokens)

### 2.1. Bảng Màu Hệ Thống (Palette Tokens)

| Tên Token | Mã Màu / Gradient | Ý Nghĩa Nghiệp Vụ | Ứng Dụng Thực Tế |
| :--- | :--- | :--- | :--- |
| `--pms-bg-start` | `#FBFCFF` | Atmosphere Top | Nền trang phía trên, mang lại cảm giác sáng và sạch sẽ |
| `--pms-bg-end` | `#EEF7F5` | Atmosphere Bottom | Nền trang phía dưới với ánh xanh ngọc lam thư giãn |
| `--pms-ink` | `#14212B` | Văn bản chính (Primary Ink) | Tiêu đề, số liệu KPI, tên khách, số phòng |
| `--pms-muted` | `#526575` | Văn bản phụ (Secondary) | Nhãn phụ, tiêu đề cột bảng, mô tả ngắn |
| `--pms-soft` | `#6F8190` | Văn bản mờ (Tertiary) | Kicker nhãn nhỏ, placeholder, timestamp |
| `--pms-line` | `rgba(70, 90, 106, 0.17)` | Đường phân cách / Viền | Viền thẻ panel, đường kẻ bảng dữ liệu |
| `--pms-glass` | `rgba(255, 255, 255, 0.78)` | Nền kính thường | Nền input, thẻ con, KPI card |
| `--pms-glass-strong`| `rgba(255, 255, 255, 0.92)` | Nền kính nổi | Nền Panel điều khiển, Modal, Dropdown |
| `--pms-table-head` | `#F4F8F8` | Nền đầu bảng | Hàng header của bảng dữ liệu vận hành |
| `--pms-trust` | `linear-gradient(135deg, #1A7AC7, #3862D7)` | Xanh tin cậy (Trust Blue) | Nút hành động chính (Primary), Menu đang chọn |
| `--pms-action` | `linear-gradient(135deg, #FFD985, #C9993D)` | Vàng hổ phách (Action Gold)| Nút tạo Booking mới, thanh toán, duyệt nhanh |
| `--pms-success`| `linear-gradient(135deg, #05A98C, #2B9A68)` | Xanh ngọc lục bảo (Success) | Trạng thái phòng sạch, khách đang ở, thanh toán đủ |
| `--pms-alert` | `linear-gradient(135deg, #E86A7C, #E4714D)` | Đỏ san hô (Alert / Coral) | Cảnh báo quá giờ, phòng hỏng, khiếu nại |

---

### 2.2. Hệ Thống Trạng Thái Đặt Phòng (Booking Lifecycle System)

Mỗi trạng thái đặt phòng mang một bộ nhận diện màu sắc không đổi trên toàn hệ thống:

```
[ Đã đặt (Reserved) ]  --->  [ Chưa đến (Arriving) ]  --->  [ Đang ở (In-house) ]
      (Trust Blue)                   (Cyan)                    (Green Emerald)
                                                                     │
[ Cần xử lý (Overdue/Alert) ] <--- [ Đã trả (Checked out) ] <--- [ Sắp trả (Due out) ]
        (Coral Red)                    (Slate Grey)                 (Amber Orange)
```

| Tên Trạng Thái | Màu Chữ | Gradient Nền | Màu Viền (Border) | Ngữ Cảnh Sử Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Đã đặt (Reserved)** | `#FFFFFF` | `linear-gradient(135deg, #3862D7, #1A7AC7)` | `rgba(36, 69, 168, 0.58)` | Booking tương lai đã đặt cọc / xác nhận |
| **Chưa đến (Arriving)** | `#FFFFFF` | `linear-gradient(135deg, #17A7C7, #48BFD2)` | `rgba(8, 122, 146, 0.62)` | Khách dự kiến check-in trong ngày hôm nay |
| **Đang ở (In-house)** | `#FFFFFF` | `linear-gradient(135deg, #04735F, #05A98C 58%, #2B9A68)` | `rgba(4, 115, 95, 0.60)` | Khách đã hoàn tất nhận phòng và đang lưu trú |
| **Sắp trả (Due out)** | `#56370D` | `linear-gradient(135deg, #F2B950, #ED8B3A)` | `rgba(149, 96, 20, 0.50)` | Khách có lịch trả phòng trong ca trực hôm nay |
| **Đã trả (Checked out)** | `#FFFFFF` | `linear-gradient(135deg, #7A8A98, #586A78)` | `rgba(79, 96, 109, 0.54)` | Đã hoàn tất thanh toán và trả phòng |
| **Cần xử lý (Overdue / Alert)**| `#FFFFFF` | `linear-gradient(135deg, #E86A7C, #E4714D)` | `rgba(172, 63, 49, 0.56)` | Quá hạn check-out, chưa thanh toán cọc, sự cố |

---

### 2.3. Trạng Thái Buồng Phòng (Room Condition Legend)

Hiển thị dưới dạng **Chấm chỉ báo tròn (Dot 10px kèm vòng bóng 4px) + Nhãn chữ (Label)**:

| Trạng Thái | Màu Chấm Dot | Mã Hex | Ý Nghĩa Buồng Phòng |
| :--- | :--- | :--- | :--- |
| **Sạch (Clean)** | Xanh ngọc | `#05A98C` | Phòng đã dọn sạch, kiểm tra đạt chuẩn, sẵn sàng đón khách |
| **Bẩn (Dirty)** | Vàng mù tạt | `#F2B950` | Khách vừa trả hoặc phòng cần dọn dẹp hàng ngày |
| **Đang dọn (Cleaning)** | Xanh dương | `#1A7AC7` | Nhân viên buồng phòng đang thực hiện công việc dọn dẹp |
| **Bảo trì (Out of Order - OOO)** | Đỏ san hô | `#E4714D` | Thiết bị hỏng hóc hoặc phòng đang khóa để sửa chữa |

---

## 3. Quy Chuẩn Kiểu Chữ (Typography Scale)

* **Font Family**:
  * **Chính / Giao diện (Sans-serif)**: `Plus Jakarta Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  * **Tiêu đề Thương hiệu (Serif / Display)**: `Playfair Display, Georgia, serif`
* **Quy tắc Font chữ số**: Bắt buộc thêm `font-feature-settings: "tnum"; font-variant-numeric: tabular-nums;` đối với tất cả cột tiền tệ, số phòng, số lượng và ngày giờ.

| Cấp Bậc | Kích Thước Chữ | Chiều Cao Dòng (Line Height) | Độ Đậm (Weight) | Trường Hợp Sử Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **H1 (Hero / Page Title)** | `28px – 36px` | `1.15` | `500` (Medium) | Tiêu đề module chính (ví dụ: *Tổng quan hôm nay*) |
| **H2 (Section Header)** | `18px – 20px` | `1.25` | `500` (Medium) | Tiêu đề khối / Panel chức năng |
| **H3 (Card Title / Subtitle)**| `14px – 16px` | `1.30` | `500` (Medium) | Tiêu đề thẻ, tiêu đề popup modal |
| **Body (Văn bản thường)** | `13px – 14px` | `1.50` | `400` (Regular) | Nội dung bảng, thông tin chi tiết khách hàng |
| **Small / Caption** | `11px – 12px` | `1.40` | `400` / `500` | Header bảng dữ liệu, ghi chú ngày giờ |
| **Micro / Kicker** | `10px – 11px` | `1.20` | `500` / `uppercase` | Nhãn tag siêu nhỏ, letter-spacing: `.12em` |
| **KPI Number** | `20px – 24px` | `1.20` | `600` / `tabular-nums` | Số liệu thống kê phòng trống, doanh thu, công suất |

---

## 4. Hình Khối, Khoảng Cách & Hiệu Ứng (Shape, Rhythm & Elevation)

### 4.1. Nhịp lưới Khoảng Cách (8pt Grid Rhythm)
* **Khoảng cách cơ sở**: `4px` (nửa bước), `8px` (1 bước), `12px` (1.5 bước), `16px` (2 bước), `20px` (2.5 bước), `24px` (3 bước).
* **Padding thẻ (Card Padding)**: `16px – 20px` cho màn hình lớn; `12px – 14px` trên màn hình nhỏ.
* **Khoảng cách giữa các nút/controls (Gap)**: `8px – 12px`.

### 4.2. Độ Bo Góc (Border Radius)
* `radius-controls`: **`11px`** — Cho nút bấm (`button`), ô nhập liệu (`input`), hộp chọn (`select`).
* `radius-badge`: **`14px`** — Cho thẻ trạng thái, nhãn buồng phòng.
* `radius-card`: **`16px – 20px`** — Cho các khối nội dung, sidebar menu, form đặt phòng.
* `radius-board`: **`28px`** — Cho khung viền bao quanh toàn bộ trang Dashboard chính.
* `radius-pill`: **`999px`** — Dành riêng cho chip đếm số và nút chuyển chế độ.

### 4.3. Hiệu Ứng Đổ Bóng & Kính Mờ (Glassmorphism & Shadows)
```css
/* Nền kính mờ chuẩn Grand Horizon PMS Panel */
background: linear-gradient(145deg, rgba(255, 255, 255, 0.90), rgba(247, 251, 251, 0.70));
border: 1px solid rgba(70, 90, 106, 0.17);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.98), 0 9px 24px rgba(30, 65, 82, 0.075);
backdrop-filter: blur(20px) saturate(1.16);
```

---

## 5. Quy Chuẩn Thành Phần Giao Diện (Components Spec)

### 5.1. Nút Bấm Điều Khiển (Action Buttons)
* **Chiều cao tối thiểu**: `38px` (Desktop) / `44px` (Mobile touch target).
* **Padding**: `9px 14px`.
* **Font**: `Plus Jakarta Sans`, cỡ `12px – 13px`, trọng số `500`.

1. **Nút Primary (`.pms-btn.primary`)**:
   - Dùng cho: *Lưu thay đổi, Xác nhận Check-in, Thanh toán hóa đơn*.
   - Nền: `linear-gradient(135deg, #1A7AC7, #3862D7)` | Chữ trắng | Box-shadow: `0 4px 12px rgba(56, 98, 215, 0.25)`.
2. **Nút Action (`.pms-btn.action`)**:
   - Dùng cho: *Tạo Booking mới, Thêm dịch vụ phòng, Nâng hạng phòng*.
   - Nền: `linear-gradient(135deg, #FFD985, #C9993D)` | Chữ `#2F2718` đậm | Border: `rgba(153, 104, 18, 0.25)`.
3. **Nút Quiet / Secondary (`.pms-btn.quiet`)**:
   - Dùng cho: *Xuất file Excel/CSV, Đóng popup, Bộ lọc nâng cao*.
   - Nền: `rgba(255, 255, 255, 0.75)` | Chữ `#14212B` | Border: `rgba(70, 90, 106, 0.20)`.

### 5.2. Ô Nhập Liệu & Tìm Kiếm (Form Controls)
* Chiều cao `38px`, bo góc `11px`.
* Nền kính mờ: `rgba(255, 255, 255, 0.78)` kèm hiệu ứng lún nhẹ `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95)`.
* Trạng thái `:focus-visible`: Viền sáng xanh `border-color: #1A7AC7; box-shadow: 0 0 0 3px rgba(26, 122, 199, 0.15)`.

### 5.3. Bảng Dữ Liệu Vận Hành (Data Table)
* **Header (`thead th`)**: Chiều cao `36px`, nền `#F4F8F8`, chữ `#526575`, font size `11px`, căn lề trái.
* **Row (`tbody tr`)**: Padding trên dưới `10px`, viền ngang mờ `border-top: 1px solid rgba(70, 90, 106, 0.10)`.
* **Hover State**: Nền sáng nhẹ `rgba(23, 167, 199, 0.075)` giúp mắt người theo dõi hàng ngang dễ dàng mà không bị lóa.

### 5.4. Sơ Đồ Lịch Phòng (Tape Chart Semantics)
* **Quy ước thanh lưu trú (Stay Bar Semantics)**:
  - Giờ nhận phòng tiêu chuẩn: **`14:00`** (bắt đầu từ nửa phải của ô ngày nhận).
  - Giờ trả phòng tiêu chuẩn: **`12:00` trưa** (kết thúc ở nửa trái của ô ngày trả).
  - Màu thanh lưu trú bắt buộc áp dụng đúng dải màu **Booking Lifecycle** tại mục 2.2.

---

## 6. Mẫu Cấu Hình CSS Variables (Sẵn sàng copy vào dự án)

```css
/* ========================================================
   GRAND HORIZON PMS ADMIN & STAFF DESIGN SYSTEM VARIABLES
   ======================================================== */
:root {
  /* Atmosphere & Surfaces */
  --pms-bg-start: #fbfcff;
  --pms-bg-end: #eef7f5;
  --pms-glass: rgba(255, 255, 255, 0.78);
  --pms-glass-strong: rgba(255, 255, 255, 0.92);
  --pms-table-head: #f4f8f8;
  --pms-line: rgba(70, 90, 106, 0.17);

  /* Typography Colors */
  --pms-ink: #14212b;
  --pms-muted: #526575;
  --pms-soft: #6f8190;

  /* Brand Accents */
  --pms-trust-a: #1a7ac7;
  --pms-trust-b: #3862d7;
  --pms-action-a: #ffd985;
  --pms-action-b: #c9993d;

  /* Status Tokens */
  --pms-reserved: linear-gradient(135deg, #3862d7, #1a7ac7);
  --pms-arriving: linear-gradient(135deg, #17a7c7, #48bfd2);
  --pms-inhouse: linear-gradient(135deg, #04735f, #05a98c 58%, #2b9a68);
  --pms-dueout: linear-gradient(135deg, #f2b950, #ed8b3a);
  --pms-checkedout: linear-gradient(135deg, #7a8a98, #586a78);
  --pms-alert: linear-gradient(135deg, #e86a7c, #e4714d);

  /* Housekeeping Status Dots */
  --dot-clean: #05a98c;
  --dot-dirty: #f2b950;
  --dot-cleaning: #1a7ac7;
  --dot-ooo: #e4714d;

  /* Elevations */
  --pms-shadow: 0 18px 44px rgba(30, 65, 82, 0.11);
  --pms-shadow-soft: 0 9px 24px rgba(30, 65, 82, 0.075);

  /* Radii */
  --pms-radius-sm: 11px;
  --pms-radius-md: 14px;
  --pms-radius-lg: 20px;
  --pms-radius-board: 28px;
  --pms-radius-full: 999px;
}
```

---

## 7. Tiêu Chuẩn Kiểm Thử Chất Lượng (QA Checklist)

Trước khi nghiệm thu bất kỳ màn hình quản trị / dashboard nào của Grand Horizon PMS:
- [ ] **Accessibility Contrast**: Tất cả nhãn chữ trên các thanh trạng thái đều đạt tỷ lệ tương phản tối thiểu **4.5:1** (WCAG 2.2 AA).
- [ ] **Dual Coding Rule**: Không có trạng thái nào chỉ thể hiện bằng màu sắc; bắt buộc có kèm Icon hoặc nhãn chữ tiếng Việt chuẩn.
- [ ] **Tabular Numerics**: Toàn bộ số phòng, cột tiền tệ, số booking và thời gian đều dùng font số thẳng cột (`tabular-nums`).
- [ ] **Touch Target Check**: Tất cả nút thao tác nhanh (Check-in, Check-out, Đổi phòng, Tạo đơn) có diện tích chạm $\ge 44 \times 44\text{ px}$ trên màn hình di động/tablet.
- [ ] **Stay Bar Time Alignment**: Vị trí thanh đặt phòng trên sơ đồ lịch hiển thị chính xác theo mốc nhận phòng 14:00 và trả phòng 12:00.
