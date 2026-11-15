# Hướng Dẫn Tích Hợp C5 Core Payment Module (`FEAT-PAYMENT-01`)

> **Owner:** Đặng Văn Hà (Module C — Dịch Vụ & Thanh Toán)  
> **Phạm vi sử dụng:** Dùng chung cho toàn bộ các phân hệ có phát sinh thu tiền / đặt cọc / quyết toán hoá đơn / hoàn tiền (Booking A8, Check-In Spec 8, Check-Out Spec 11, F&B, Master Invoice C9, Folio Ledger C10).

---

## 1. Cấu Trúc Thư Mục & Danh Sách File C5 Core Payment

| Thành phần | Đường dẫn file | Vai trò |
| :--- | :--- | :--- |
| **Module Entry** | `backend/src/modules/payments/index.js` | Mount router tại `/api/v1/payments` (và alias `/payments`) |
| **Routes** | `backend/src/modules/payments/routes/paymentRoutes.js` | Định nghĩa 4 endpoint chuẩn của C5 |
| **Controller** | `backend/src/modules/payments/controllers/paymentController.js` | Xử lý khởi tạo giao dịch, tra cứu trạng thái, webhook IPN, hoàn tiền |
| **Gateway Service** | `backend/src/modules/payments/services/paymentGatewayService.js` | Sinh mã giao dịch `PMT-...`, tạo URL/QR thanh toán, kiểm tra hết hạn, xác thực chữ ký |
| **Sequelize Model** | `backend/src/models/Payment.js` | Bảng `Payments` trong MySQL |
| **Frontend API Client** | `frontend/src/api/invoiceApi.js` | Các hàm `createPayment`, `settleInvoicePayment`, `getPaymentStatus`, `refundPayment` |
| **Frontend Mock Gateway** | `frontend/src/pages/client/MockPaymentGateway.jsx` | Giao diện cổng thanh toán giả lập tại route `/mock-payment/:transactionCode` |

---

## 2. Quy Chuẩn Dữ Liệu Bảng `Payments` (Database Contract)

Mọi giao dịch thanh toán trong hệ thống khi ghi vào bảng `Payments` **BẮT BUỘC** tuân thủ các quy ước sau để không làm sai lệch báo cáo doanh thu (C11) và đối soát hoá đơn (C7/C9/C10):

1. **`TransactionCode`**:
   - Định dạng chuẩn: `PMT-{yyyyMMddHHmmss}-{4 số ngẫu nhiên}` (Ví dụ: `PMT-20261111133000-4821`).
   - **Tuyệt đối không** tự ghép chuỗi kiểu `TXN-...`, `CI-...`, `CO-...` mà phải gọi hàm `generateTransactionCode()` của C5.
2. **`PaymentMethod`** (Chỉ nhận đúng 1 trong 6 giá trị phân biệt hoa/thường):
   - Tại quầy (POS - chỉ Nhân viên/Admin): `'Cash'` | `'Card'` | `'BankTransfer'`
   - Trực tuyến (Gateway - Khách & Nhân viên): `'VietQR'` | `'VNPay'` | `'MoMo'`
3. **`Status`** (Trạng thái chuẩn):
   - `'Pending'`: Đang chờ khách quét QR / thanh toán trên cổng trực tuyến.
   - `'Paid'`: Đã thu tiền thành công (C5 cũng tương thích ngược với `'Success'`, `'Completed'`, nhưng khi ghi mới **luôn ghi `'Paid'`**).
   - `'Failed'`: Giao dịch thất bại hoặc quá hạn (Timeout: VietQR > 15 phút, VNPay/MoMo > 30 phút).
   - `'Refunded'`: Đã hoàn tiền (kèm `RefundAmount` và `RefundReason`).
4. **Ngữ cảnh liên kết (`BookingId` vs `InvoiceId`)**:
   - Thu tiền **Đặt cọc / Thu trước khi có hoá đơn**: gắn `BookingId` (`InvoiceId = null`).
   - Thu tiền **Quyết toán hoá đơn / Check-out / Dịch vụ**: gắn `InvoiceId` (`BookingId` có thể null hoặc giữ tham chiếu).

---

## 3. Cách 1: Tích Hợp Ở Tầng Backend (Import Trực Tiếp Helper / Model)

Dành cho các bạn viết Backend ở phân hệ khác (ví dụ: **Check-In**, **Check-Out**, **Online Deposit**) muốn tự tạo bản ghi `Payment` bên trong Database Transaction riêng của phân hệ đó:

### Bước 1: Import hàm từ C5 `paymentGatewayService.js` và Model `Payment`
```javascript
const { Payment } = require('../models'); // hoặc đường dẫn tương ứng tới src/models
const {
  generateTransactionCode,
  createGatewayTransaction,
  isPaymentExpired,
} = require('../modules/payments/services/paymentGatewayService');
```

### Bước 2: Tạo giao dịch thu tiền tại quầy (Cash / Card / BankTransfer)
```javascript
const txCode = generateTransactionCode(); // Sinh mã chuẩn: PMT-20261111142030-8392

const payment = await Payment.create({
  BookingId: bookingId || null,
  InvoiceId: invoiceId || null,
  UserId: req.user?.id || null,
  Amount: Number(amount),
  PaymentMethod: 'Cash', // 'Cash' | 'Card' | 'BankTransfer'
  PaymentDate: new Date(),
  TransactionCode: txCode,
  Status: 'Paid', // Thu tại quầy -> Paid ngay lập tức
  GatewayResponse: JSON.stringify({ source: 'CHECK_IN_POS', staffId: req.user?.id }),
}, { transaction: t });
```

### Bước 3: Tạo giao dịch trực tuyến (VietQR / VNPay / MoMo) từ Backend
```javascript
const txCode = generateTransactionCode();

const payment = await Payment.create({
  BookingId: bookingId || null,
  InvoiceId: invoiceId || null,
  UserId: req.user?.id || null,
  Amount: Number(amount),
  PaymentMethod: method, // 'VietQR' | 'VNPay' | 'MoMo'
  PaymentDate: new Date(),
  TransactionCode: txCode,
  Status: 'Pending', // Online -> Bắt đầu bằng Pending
}, { transaction: t });

// Sinh URL chuyển hướng sang Mock Gateway (/mock-payment/PMT-...) và chuỗi QR
const gatewayData = await createGatewayTransaction({
  transactionCode: txCode,
  amount: Number(amount),
  method,
  returnUrl: 'http://localhost:3000/my-bookings',
});
// gatewayData trả về: { transactionCode, method, amount, paymentUrl, qrCodeData, qrExpiresAt }
```

---

## 4. Cách 2: Tích Hợp Qua REST API C5 (`/api/v1/payments`)

Thay vì viết lại logic tạo Payment ở từng phân hệ, Frontend hoặc Backend có thể gọi trực tiếp 4 Endpoint của C5:

### 4.1. Khởi tạo giao dịch thanh toán
- **Endpoint:** `POST /api/v1/payments`
- **Auth:** `optionalVerifyToken` (Khách vãng lai đặt phòng online gọi được với `VietQR`/`VNPay`/`MoMo`; Nhân viên/Admin có token gọi được thêm `Cash`/`Card`/`BankTransfer`).
- **Request Body:**
```json
{
  "bookingId": 12,
  "invoiceId": null,
  "amount": 1500000,
  "method": "VietQR",
  "returnUrl": "http://localhost:3000/deposit-payment/12"
}
```
*(Lưu ý: Chỉ truyền **1 trong 2**: `bookingId` HOẶC `invoiceId`)*.

- **Response (201 Created / 200 OK nếu tái sử dụng phiên Pending còn hạn):**
```json
{
  "success": true,
  "code": "SUCCESS_0001_CREATED",
  "message": "Tạo yêu cầu thanh toán thành công",
  "data": {
    "paymentId": 45,
    "transactionCode": "PMT-20261111133000-4821",
    "status": "Pending",
    "amount": 1500000,
    "method": "VietQR",
    "qrCodeData": "vietqr://pay?bank=MB&account=0987654321&amount=1500000&memo=PMT-20261111133000-4821",
    "qrExpiresAt": "2026-11-11T06:45:00.000Z",
    "paymentUrl": "http://localhost:3000/mock-payment/PMT-20261111133000-4821?amount=1500000&method=VietQR&returnUrl=..."
  }
}
```

### 4.2. Tra cứu trạng thái giao dịch (Polling / Kiểm tra kết quả)
- **Endpoint:** `GET /api/v1/payments/:paymentIdOrTransactionCode`
- Truyền `PaymentId` (số, VD: `45`) hoặc `TransactionCode` (chuỗi, VD: `PMT-20261111133000-4821`).
- Tự động xử lý **Lazy Timeout**: Nếu giao dịch `Pending` đã quá 15 phút (`VietQR`) hoặc 30 phút (`VNPay`/`MoMo`), API tự chuyển sang `Failed` trước khi trả kết quả.

### 4.3. Webhook nhận kết quả từ Cổng Thanh Toán / Trang Mock Gateway
- **Endpoint:** `POST /api/v1/payments/webhook/:method` (`:method` là `VietQR`, `VNPay`, hoặc `MoMo`)
- **Request Body:**
```json
{
  "transactionCode": "PMT-20261111133000-4821",
  "gatewayStatus": "success",
  "gatewayTransactionId": "GW-1731309000"
}
```
- **Tự động hoá của C5 khi Webhook báo `success`:**
  1. Đổi `Payment.Status` từ `'Pending'` $\rightarrow$ `'Paid'`.
  2. Nếu là thanh toán **Booking (`BookingId`)**: Tự động cộng dồn `Booking.DepositAmount`, chuyển `Booking.Status` từ `'Pending'` $\rightarrow$ `'Confirmed'`, tự sinh `BookingQrCode`, và bắn WebSocket realtime (`PAYMENT_COMPLETED`, `BOOKING_CONFIRMED`, `PAYMENT_SUCCESS`).
  3. Nếu là thanh toán **Hoá đơn (`InvoiceId`)**: Tự động tính tổng tiền đã trả và chuyển `Invoice.Status` sang `'PartiallyPaid'` hoặc `'Paid'`.

### 4.4. Hoàn tiền giao dịch (Refund)
- **Endpoint:** `PATCH /api/v1/payments/:paymentIdOrTransactionCode/refund`
- **Auth:** Yêu cầu Token `Admin`.
- **Request Body:**
```json
{
  "refundAmount": 500000,
  "refundReason": "Khách huỷ dịch vụ Spa trước giờ thực hiện"
}
```

---

## 5. Cách 3: Tích Hợp Ở Tầng Frontend (React Components)

Các trang Frontend khi cần gọi thanh toán C5 chỉ cần import `invoiceApi` từ `frontend/src/api/invoiceApi.js`:

```javascript
import invoiceApi from '../../api/invoiceApi';

// 1. Khởi tạo thanh toán Online (VietQR / VNPay / MoMo) cho Booking hoặc Invoice
const handleOpenOnlineGateway = async ({ bookingId, invoiceId, amount, method }) => {
  const res = await invoiceApi.createPayment({
    bookingId,            // Truyền bookingId nếu đặt cọc phòng
    invoiceId,            // Hoặc truyền invoiceId nếu thanh toán hoá đơn
    amount: Number(amount),
    method,               // 'VietQR' | 'VNPay' | 'MoMo'
    returnUrl: window.location.href,
  });

  const txCode = res.data.transactionCode;
  // Chuyển hướng hoặc mở tab cổng thanh toán giả lập của C5:
  window.open(
    `/mock-payment/${txCode}?amount=${amount}&method=${method}&returnUrl=${encodeURIComponent(window.location.href)}`,
    '_blank'
  );
};

// 2. Kiểm tra trạng thái giao dịch theo mã PMT-...
const checkStatus = async (txCode) => {
  const res = await invoiceApi.getPaymentStatus(txCode);
  if (res.data.status === 'Paid') {
    alert('Thanh toán thành công!');
  }
};
```

> **Lưu ý quan trọng trên Frontend:**  
> Trước khi mở đường dẫn `/mock-payment/PMT-...`, Frontend **BẮT BUỘC** phải gọi `invoiceApi.createPayment(...)` (tức `POST /api/v1/payments`) để đăng ký bản ghi `Pending` vào DB trước. Nếu tự sinh chuỗi `PMT-...` ở client rồi mở `/mock-payment/...` mà chưa gọi `POST /api/v1/payments`, khi bấm "Giả lập Thành công" webhook sẽ báo `404 Giao dịch không tồn tại`.

