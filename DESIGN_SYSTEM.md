# Grand Horizon PMS - Design System & Guidelines

Tài liệu này định nghĩa hệ thống thiết kế (Design System) và các chuẩn màu sắc, typography, components cho ứng dụng quản lý khách sạn Grand Horizon PMS. Khi lập trình các chức năng hoặc giao diện mới (đặc biệt là giao diện Admin), hãy luôn sử dụng các biến màu và quy tắc dưới đây để đảm bảo tính đồng nhất.

## 1. Core Palette (Bảng màu cốt lõi)
Các biến màu CSS (CSS Variables) tiêu chuẩn cho dự án:

| Tên | Màu sắc / Mã HEX | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Atmosphere (Nền)** | Gradient: `#FBFCFF` → `#EEF7F5` | Màu nền chính của ứng dụng |
| **Ink (Chữ chính)** | `#14212B` | Màu text chính, headings |
| **Muted (Chữ phụ)** | `#526575` | Text phụ, mô tả, nhãn phụ |
| **Soft** | `#6F8190` | Các chi tiết text rất nhỏ |
| **Trust (Xanh lam)** | `#1A7AC7` · `#3862D7` | Nút bấm chính (Primary), Link, Nhấn mạnh |
| **Success (Xanh lá)** | `#05A98C` · `#2B9A68` | Trạng thái thành công, hoàn thành |
| **Action (Vàng/Cam)** | `#FFD985` · `#C9993D` | Nút hành động phụ, Cảnh báo nhẹ |
| **Alert (Đỏ/San hô)** | `#E86A7C` · `#E4714D` | Lỗi, Cảnh báo khẩn cấp, Trạng thái trễ hạn |
| **Table head** | `#F4F8F8` | Nền cho phần header của bảng dữ liệu (Table) |
| **Line (Đường kẻ)** | `rgba(70, 90, 106, 0.17)` | Border, đường phân cách (Divider) |

**Các hiệu ứng Glassmorphism & Shadow:**
- **Glass:** `rgba(255, 255, 255, 0.78)`
- **Glass Strong:** `rgba(255, 255, 255, 0.92)`
- **Shadow:** `0 18px 44px rgba(30, 65, 82, 0.11)`
- **Shadow Soft:** `0 9px 24px rgba(30, 65, 82, 0.075)`

---

## 2. Booking Lifecycle (Vòng đời đặt phòng)
Trạng thái của các booking phòng sẽ được quy định thống nhất trên toàn hệ thống bằng màu sắc:

- **Đã đặt (Reserved):** Màu Trust (Xanh lam)
- **Chưa đến (Arriving):** Màu Cyan (`#17A7C7` · `#48BFD2`)
- **Đang ở (In house):** Màu Success (Xanh lá)
- **Sắp trả (Due out):** Màu Amber (`#F2B950` · `#ED8B3A` / Chữ `#56370D`)
- **Đã trả (Checked out):** Màu Slate (`#7A8A98` · `#586A78`)
- **Cần xử lý (Overdue/Alert):** Màu Alert (Đỏ)

---

## 3. Room Condition (Tình trạng buồng phòng)
Hiển thị kèm biểu tượng chấm tròn (dot) và màu sắc tương ứng:

- 🟢 **Sạch (Clean):** `#05A98C`
- 🟡 **Bẩn (Dirty):** `#F2B950`
- 🔵 **Đang dọn (Cleaning):** `#1A7AC7`
- 🔴 **Bảo trì (Out of order/OOO):** `#E4714D`

---

## 4. Component Language (Quy tắc thiết kế UI)

- **Type (Font chữ):** Sử dụng System sans (Inter, -apple-system, UI-sans). Weight: 400 hoặc 500. Dùng `tabular-nums` cho tiền tệ và số liệu KPI.
- **Space (Khoảng cách):** Áp dụng lưới nhịp điệu `8px`. Padding cho các thẻ (Cards): `16-20px`. Khoảng cách giữa các control/nút: `10-14px`.
- **Shape (Độ bo góc):** Các thẻ (Card) bo góc `14-20px`. Nút bấm và Input bo góc `11px`. Chỉ bo góc tròn hoàn toàn (full pill) cho các badge trạng thái (status).
- **State (Trạng thái):** Không bao giờ dùng màu sắc đơn độc để hiển thị trạng thái. Luôn luôn đi kèm icon hoặc chữ diễn giải.
- **Touch (Mobile):** Kích thước vùng bấm tối thiểu cho mobile là `44px` đối với các nút hành động (operational actions).
- **Time (Thời gian):** Thanh lưu trú mặc định hiển thị theo quy tắc Check-in lúc `14:00` và Check-out lúc `12:00`.
