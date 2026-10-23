import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import styles from "./MockPaymentGateway.module.css";

const MockPaymentGateway = () => {
  const { transactionCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method") || "VNPay";
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Tra cứu thông tin giao dịch từ Backend
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/v1/payments/${transactionCode}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPaymentData(data.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải thông tin thanh toán:", err);
      }
    };
    if (transactionCode) {
      fetchPayment();
    }
  }, [transactionCode]);

  const displayAmount = paymentData?.Amount || amountParam || 0;
  const displayMethod = paymentData?.PaymentMethod || methodParam;

  // Xử lý gửi Webhook giả lập tới Server
  const handleSimulate = async (gatewayStatus) => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("http://localhost:5000/api/v1/payments/webhook/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionCode,
          gatewayStatus,
          gatewayTransactionId: `MOCK-${Date.now()}`,
          rawPayload: {
            simulation: true,
            status: gatewayStatus,
            amount: displayAmount,
            method: displayMethod,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (gatewayStatus === "success") {
          setStatusMessage({
            type: "success",
            text: "✓ Giao dịch đã được xác nhận THÀNH CÔNG! Đang chuyển hướng...",
          });
        } else {
          setStatusMessage({
            type: "error",
            text: "✗ Giao dịch đã bị HUỶ / THẤT BẠI. Đang quay lại...",
          });
        }

        setTimeout(() => {
          if (returnUrl.startsWith("http://") || returnUrl.startsWith("https://")) {
            window.location.href = returnUrl;
          } else {
            navigate(returnUrl);
          }
        }, 1800);
      } else {
        setStatusMessage({
          type: "error",
          text: data.message || "Lỗi khi xử lý mô phỏng cổng thanh toán",
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Không thể kết nối đến Webhook Server để cập nhật kết quả.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.mockContainer}>
      <div className={styles.mockCard}>
        <div className={styles.cardHeader}>
          <div className={styles.badgeSandbox}>
            <span className="material-symbols-outlined text-[14px]">science</span>
            <span>MOCK PAYMENT SANDBOX • FEAT-PAYMENT-01</span>
          </div>
          <h1 className={styles.hotelTitle}>CỔNG THANH TOÁN MÔ PHỎNG</h1>
          <div className={styles.subTitle}>
            HỆ THỐNG GIẢ LẬP GIAO DỊCH VNPAY / MOMO / VIETQR CHO ĐỒ ÁN
          </div>
        </div>

        <div className={styles.cardBody}>
          {statusMessage && (
            <div
              className={`${styles.statusMessage} ${
                statusMessage.type === "success"
                  ? styles.statusSuccess
                  : styles.statusError
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className={styles.amountBox}>
            <div className={styles.amountLabel}>Số Tiền Cần Thanh Toán</div>
            <div className={styles.amountVal}>
              {Number(displayAmount).toLocaleString("vi-VN")} đ
            </div>
          </div>

          {displayMethod === "VietQR" && (
            <div className={styles.qrBox}>
              <div className={styles.qrPlaceholder}>
                <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                <span className="text-[11px] font-bold mt-1">QUÉT MÃ VIETQR</span>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-slate-700">
                  Nội dung CK: <span className="text-emerald-700 font-mono">{transactionCode}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Thời hạn giữ mã: 15 phút
                </div>
              </div>
            </div>
          )}

          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Mã Giao Dịch:</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {transactionCode}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phương Thức:</span>
              <span className={styles.methodPill}>{displayMethod}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Trạng Thái Hiện Tại:</span>
              <span className="text-xs font-bold text-amber-600">
                {paymentData?.Status || "Pending (Đang chờ)"}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>URL Trả Về (ReturnUrl):</span>
              <span className="font-mono text-[11px] text-slate-500 truncate max-w-[220px]">
                {returnUrl}
              </span>
            </div>
          </div>

          <div className={styles.actionArea}>
            <button
              type="button"
              disabled={loading || paymentData?.Status === "Paid"}
              onClick={() => handleSimulate("success")}
              className={styles.btnSuccess}
            >
              <span className="material-symbols-outlined">check_circle</span>
              <span>
                {loading ? "Đang Xử Lý..." : "Giả Lập Thanh Toán Thành Công"}
              </span>
            </button>

            <button
              type="button"
              disabled={loading || paymentData?.Status === "Paid"}
              onClick={() => handleSimulate("fail")}
              className={styles.btnFailed}
            >
              <span className="material-symbols-outlined">cancel</span>
              <span>Giả Lập Giao Dịch Thất Bại / Huỷ Bỏ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockPaymentGateway;
