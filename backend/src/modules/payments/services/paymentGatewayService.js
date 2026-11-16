'use strict';

/**
 * modules/payments/services/paymentGatewayService.js
 * Dịch vụ tích hợp cổng thanh toán (Hỗ trợ cả chế độ MOCK và REAL theo mục 1.5 & 1.6)
 */

const crypto = require('crypto');

// Cấu hình chế độ cổng thanh toán: "mock" (mặc định) | "real"
const GATEWAY_MODE = process.env.PAYMENT_GATEWAY_MODE || 'mock';

// Thời hạn phiên chờ thanh toán (ms)
const VIETQR_EXPIRY_MS = 15 * 60 * 1000; // 15 phút
const VNPAY_MOMO_EXPIRY_MS = 30 * 60 * 1000; // 30 phút

/**
 * Sinh mã giao dịch chuẩn duy nhất toàn hệ thống:
 * Định dạng: PMT-{yyyyMMddHHmmss}-{4 số ngẫu nhiên}
 */
exports.generateTransactionCode = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `PMT-${yyyy}${MM}${dd}${hh}${mm}${ss}-${random4}`;
};

/**
 * Kiểm tra xem giao dịch Pending có bị quá hạn (Timeout) hay không
 */
exports.isPaymentExpired = (payment) => {
  if (!payment || payment.Status !== 'Pending') return false;

  const createdAt = new Date(payment.PaymentDate || payment.createdAt || Date.now()).getTime();
  const elapsed = Date.now() - createdAt;

  if (payment.PaymentMethod === 'VietQR') {
    return elapsed > VIETQR_EXPIRY_MS;
  }
  if (['VNPay', 'MoMo'].includes(payment.PaymentMethod)) {
    return elapsed > VNPAY_MOMO_EXPIRY_MS;
  }

  return false;
};

/**
 * Xử lý tạo cổng thanh toán VNPay / MoMo / VietQR
 */
exports.createGatewayTransaction = async ({
  transactionCode,
  amount,
  method,
  returnUrl,
  orderInfo,
}) => {
  if (method === 'VietQR') {
    const qrExpiresAt = new Date(Date.now() + VIETQR_EXPIRY_MS).toISOString();
    // Chuỗi mã QR động tiêu chuẩn thanh toán chuyển khoản nhanh
    const qrCodeData = `vietqr://pay?bank=MB&account=0987654321&amount=${Math.round(
      amount
    )}&memo=${transactionCode}`;

    return {
      transactionCode,
      method,
      amount,
      qrCodeData,
      qrExpiresAt,
      // Trang hiển thị QR giả lập ở chế độ mock
      paymentUrl: `http://localhost:3000/mock-payment/${transactionCode}?amount=${amount}&method=${method}&returnUrl=${encodeURIComponent(
        returnUrl || 'http://localhost:3000'
      )}`,
    };
  }

  if (['VNPay', 'MoMo'].includes(method)) {
    if (GATEWAY_MODE === 'mock') {
      // Chế độ Mock Gateway (mục 1.5)
      const mockUrl = `http://localhost:3000/mock-payment/${transactionCode}?amount=${amount}&method=${method}&returnUrl=${encodeURIComponent(
        returnUrl || 'http://localhost:3000'
      )}`;
      return {
        transactionCode,
        method,
        amount,
        paymentUrl: mockUrl,
      };
    }

    // Chế độ REAL (nếu cấu hình merchant key)
    // Tạm thời fallback về mock url nếu chưa cấu hình secret
    return {
      transactionCode,
      method,
      amount,
      paymentUrl: `http://localhost:3000/mock-payment/${transactionCode}?amount=${amount}&method=${method}&returnUrl=${encodeURIComponent(
        returnUrl || 'http://localhost:3000'
      )}`,
    };
  }

  return { transactionCode, method, amount };
};

/**
 * Xác thực chữ ký webhook từ cổng thanh toán (chỉ ở chế độ real)
 */
exports.verifyWebhookSignature = ({ method, payload, signature }) => {
  if (GATEWAY_MODE === 'mock') {
    return true; // Mock bỏ qua kiểm tra chữ ký
  }

  if (!signature) return false;

  // Ví dụ HMAC-SHA512 cho VNPay / MoMo khi kích hoạt real
  const secretKey = process.env[`${method.toUpperCase()}_SECRET_KEY`] || 'mock_secret_key';
  const computedHash = crypto
    .createHmac('sha512', secretKey)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');

  return computedHash === signature;
};
