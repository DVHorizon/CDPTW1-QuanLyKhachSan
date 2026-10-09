# 🏨 HƯỚNG DẪN XÁC THỰC, ĐĂNG KÝ, ĐĂNG NHẬP GOOGLE & FACEBOOK
**Dự án: Hệ thống Quản Lý Khách Sạn & Nghỉ Dưỡng Grand Horizon Danang**

---

## 📌 1. Tổng Quan Tính Năng Xác Thực
Hệ thống xác thực đã được xây dựng hoàn chỉnh và đồng bộ giữa Frontend và Backend:
* **Giao diện Modal sang trọng (`/auth`)**: Hỗ trợ 3 chế độ: Đăng Nhập, Đăng Ký Hội Viên Horizon Elite, và Khôi Phục Mật Khẩu.
* **Cơ sở dữ liệu MySQL chuẩn 57 bảng**: Lưu trữ và quản lý trực tiếp trên các bảng chính thức: `Users`, `Roles`, `MembershipTiers`.
* **Ba phương thức đăng nhập tiện lợi**:
  1. **Đăng nhập truyền thống**: Bằng **Email** hoặc **Số điện thoại** + **Mật khẩu** (mã hóa chuẩn Bcrypt).
  2. **Đăng nhập nhanh bằng Google OAuth 2.0 (Google Identity Services)**.
  3. **Đăng nhập nhanh bằng Facebook OAuth (Facebook Graph API & Fast Sandbox)**.
* **Tạo tài khoản / Đăng ký hội viên**:
  - Tự động gán quyền Khách hàng (`RoleId = 5 - Guest`).
  - Tự động cấp hạng hội viên (`TierId = 1 - Standard`), tích điểm và chiết khấu.
  - Có nút **"Tự động điền mẫu"** giúp kiểm thử và tạo tài khoản nhanh chóng chỉ trong 1 cú nhấp chuột.

---

## ⚙️ 2. Dành Cho Bạn (Người Quản Trị Google Cloud Console)
> **Lưu ý quan trọng**: Khi tạo Google OAuth ở chế độ mặc định, ứng dụng sẽ ở trạng thái **Testing (Đang thử nghiệm)**. Google sẽ chặn các email lạ nếu chưa được cấp phép.

Để **tất cả các thành viên trong nhóm** có thể đăng nhập bằng tài khoản Google cá nhân của họ, bạn chỉ cần thực hiện **1 trong 2 cách** sau:

### ✅ Cách 1: Thêm Email của thành viên vào Test Users (Nhanh nhất & Khuyên dùng)
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn project **Grand Horizon Resort**.
3. Vào menu bên trái: **Audience** (dưới mục Branding).
4. Cuộn xuống mục **Test users / Người dùng thử nghiệm**.
5. Bấm **`+ ADD USERS`** (Thêm người dùng).
6. Nhập địa chỉ Gmail của từng bạn trong nhóm vào danh sách và bấm **Save (Lưu)**.
👉 *Ngay lập tức các bạn trong nhóm có thể dùng tài khoản Google đó để đăng nhập ở máy của họ!*

### 🌐 Cách 2: Bấm Xuất Bản Ứng Dụng (Publish App)
1. Tại menu bên trái, chọn **Audience**.
2. Nhìn lên phần **Publishing status** (Trạng thái xuất bản) đang hiển thị `Testing`.
3. Bấm nút **`PUBLISH APP`** (Xuất bản ứng dụng) ➡️ Bấm **CONFIRM** (Xác nhận).
👉 *Ứng dụng chuyển sang chế độ "In production" (Công khai), cho phép BẤT KỲ AI có tài khoản Google đều đăng nhập được ngay mà không cần thêm từng email.*

---

## 🔵 3. Đăng Nhập Bằng Facebook (Facebook OAuth)
* Nút biểu tượng Facebook trên modal đăng nhập hỗ trợ 2 chế độ:
  1. **Chế độ Thử nghiệm Nhanh (Fast Sandbox)**: Dành riêng cho môi trường đồ án Localhost. Bấm vào nút Facebook sẽ tự động khởi tạo hoặc đăng nhập tài khoản Facebook liên kết vào MySQL bảng `Users` mà không cần chờ duyệt ứng dụng từ Meta.
  2. **Chế độ Meta App ID chính thức**: Nếu bạn có Facebook App ID, chỉ cần khai báo vào file `.env`:
     ```env
     VITE_FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
     ```
     Hệ thống sẽ tự động bật cửa sổ Facebook Login chính thức của Meta!

---

## 🚀 4. Dành Cho Thành Viên Nhóm Khi Pull Code Về Máy

### Bước 1: Cập nhật mã nguồn
```bash
git checkout NhanBao/1a_dangky_dangnhap
git pull origin NhanBao/1a_dangky_dangnhap
```

### Bước 2: Cấu hình biến môi trường
Mã nguồn đã tích hợp sẵn **Fallback mặc định trong code**, nhưng để chuẩn hóa môi trường:
* Ở thư mục gốc (`/`), copy file mẫu:
  ```bash
  cp .env.example .env
  ```
* Ở thư mục `frontend/`, copy file mẫu:
  ```bash
  cp frontend/.env.example frontend/.env
  ```
*(Mã `GOOGLE_CLIENT_ID` đã được điền sẵn trong `.env.example` để toàn bộ nhóm dùng chung 1 cấu hình).*

### Bước 3: Khởi động hệ thống
Chạy bằng Docker (khuyên dùng):
```bash
docker-compose up -d
```
Hoặc chạy trực tiếp trên máy:
* **Backend**: `cd backend && npm install && npm run dev` (Cổng `5000`)
* **Frontend**: `cd frontend && npm install && npm run dev` (Cổng `3000`)

### Bước 4: Trải nghiệm đăng nhập
Mở trình duyệt truy cập: **`http://localhost:3000/auth`**

---

## 🔑 5. Danh Sách Tài Khoản Thử Nghiệm Có Sẵn

| Vai trò | Email / Tài khoản | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- |
| **VIP Guest** | `vip.guest@grandhorizon.com` | `123456` | Hội viên VIP có sẵn quyền lợi chiết khấu |
| **Admin** | `admin@grandhorizon.com` | `123456` | Tự động chuyển hướng về `/admin` sau khi đăng nhập |
| **Standard Guest** | `user_1@hoteldomain.vn` | `123456` | Tài khoản khách hàng thông thường |
| **Tài khoản Google** | *(Tài khoản Gmail cá nhân)* | *(Đăng nhập qua Popup)* | Hệ thống tự động tạo hồ sơ khách hàng mới nếu chưa có |
| **Tài khoản Facebook** | *(Click nút Facebook)* | *(Một chạm)* | Tự động tạo hồ sơ khách hàng Facebook trong CSDL |
| **Tạo tài khoản mới** | *(Tab "Tạo Tài Khoản Mới")* | *(Tự chọn)* | Có nút "Tự động điền mẫu" để test nhanh |
