import React, { useRef } from "react";

// Common CSS for both on-screen modal and 1-page A4 print iframe
const INVOICE_CSS = `
  @page {
    size: A4 portrait;
    margin: 6mm 8mm;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: 100%;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0b1c30;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .font-serif {
    font-family: 'Playfair Display', Georgia, serif;
  }
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .invoice-wrapper {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    page-break-inside: avoid;
    page-break-after: avoid;
  }
  .invoice-frame {
    border: 2px solid #725b38;
    outline: 1px solid #d4b26f;
    outline-offset: -5px;
    border-radius: 8px;
    padding: 16px 20px;
    background: #ffffff;
    position: relative;
    box-shadow: 0 4px 15px rgba(114, 91, 56, 0.08);
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #725b38;
    padding-bottom: 10px;
    margin-bottom: 11px;
  }
  .resort-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px;
    font-weight: 800;
    color: #0b1c30;
    letter-spacing: 0.03em;
    line-height: 1.1;
  }
  .resort-sub {
    font-size: 9.5px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #725b38;
    font-weight: 700;
    margin-top: 2px;
  }
  .resort-info {
    font-size: 9px;
    color: #64748b;
    margin-top: 3px;
    line-height: 1.35;
  }
  .header-right {
    text-align: right;
  }
  .paid-badge {
    display: inline-block;
    background-color: #ecfdf5;
    border: 1.5px solid #10b981;
    color: #065f46;
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 10px;
    border-radius: 9999px;
    margin-bottom: 3px;
  }
  .meta-info {
    font-size: 9.5px;
    color: #64748b;
    text-align: right;
  }

  /* FAST CHECK-IN PASS CARD */
  .pass-card {
    background: linear-gradient(135deg, #fdfaf6 0%, #f6eee3 100%);
    border: 1.5px solid #c8a368;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 11px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .pass-left {
    flex: 1;
  }
  .pass-badge {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 800;
    color: #64748b;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
  }
  .pass-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #10b981;
    display: inline-block;
  }
  .pass-code-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .pass-code-box {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 20px;
    font-weight: 800;
    color: #725b38;
    letter-spacing: 2.5px;
    background: #ffffff;
    padding: 3px 12px;
    border: 1.5px solid #725b38;
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    display: inline-block;
  }
  .pass-confirm-badge {
    font-size: 9.5px;
    font-weight: 800;
    background-color: #fedeb2;
    color: #725b38;
    padding: 4px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: inline-block;
  }
  .pass-desc {
    font-size: 9.5px;
    color: #475569;
    line-height: 1.35;
  }
  .qr-container {
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px;
    text-align: center;
    width: 96px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .qr-img {
    width: 78px;
    height: 78px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
  .qr-caption {
    font-size: 8px;
    font-weight: 800;
    color: #725b38;
    display: block;
    margin-top: 3px;
    letter-spacing: 0.06em;
  }

  /* INFO GRID */
  .info-grid {
    display: flex;
    gap: 10px;
    margin-bottom: 11px;
  }
  .info-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
  }
  .info-card-header {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #725b38;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3.5px;
    font-size: 10px;
  }
  .info-row:last-child {
    margin-bottom: 0;
  }
  .info-label {
    color: #64748b;
    font-weight: 500;
  }
  .info-val {
    color: #0f172a;
    font-weight: 600;
    text-align: right;
  }

  /* FINANCIAL TABLE */
  .finance-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .finance-table th {
    background-color: #f1f5f9;
    color: #334155;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5.5px 8px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1.5px solid #94a3b8;
    text-align: left;
  }
  .finance-table td {
    padding: 5.5px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10px;
    vertical-align: middle;
  }
  .text-right {
    text-align: right !important;
  }
  .text-center {
    text-align: center !important;
  }
  .row-total {
    background-color: #f8fafc;
    font-weight: 700;
    border-top: 1.5px solid #cbd5e1;
  }
  .row-deposit {
    background-color: #ecfdf5;
    border-top: 1px solid #a7f3d0;
    border-bottom: 1px solid #a7f3d0;
    font-weight: 700;
  }
  .row-remaining {
    background-color: #fffbeb;
    border-top: 1px solid #fde68a;
    border-bottom: 1.5px solid #fde68a;
    font-weight: 700;
  }

  /* FOOTER & SEAL */
  .footer-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px dashed #cbd5e1;
    padding-top: 8px;
    gap: 12px;
  }
  .notes-list {
    flex: 1;
    font-size: 8.5px;
    color: #64748b;
    line-height: 1.4;
  }
  .seal-box {
    width: 170px;
    text-align: center;
    flex-shrink: 0;
  }
  .official-stamp {
    border: 1.5px dashed #b91c1c;
    color: #b91c1c;
    background-color: #fef2f2;
    padding: 4px 8px;
    border-radius: 6px;
    display: inline-block;
    transform: rotate(-2deg);
    font-size: 8px;
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: 0.04em;
  }
  .stamp-sub {
    font-size: 7px;
    font-weight: 600;
    opacity: 0.85;
  }
  .seal-caption {
    font-size: 7.5px;
    color: #94a3b8;
    margin-top: 3px;
  }
`;

// Helper format VND
const formatVND = (num) => {
  return new Intl.NumberFormat("vi-VN").format(Math.round(num || 0)) + " ₫";
};

// Helper format date DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return "";
  const parts = String(dStr).split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
};

export default function DepositInvoiceModal({
  isOpen,
  onClose,
  booking,
  paymentSuccess,
  paymentMethod = "BANK_TRANSFER",
  user,
}) {
  const invoiceRef = useRef(null);

  if (!isOpen) return null;

  // Extract variables with intelligent fallbacks
  const transactionCode =
    paymentSuccess?.transactionCode ||
    "TXN-" + (booking?.bookingId || Date.now().toString().slice(-8));
  const confirmationCode =
    paymentSuccess?.confirmationCode ||
    booking?.confirmationCode ||
    "GH-293357";

  // Compute total amount
  let totalAmount = booking?.totalAmount || paymentSuccess?.totalAmount || 0;
  if (!totalAmount && booking?.roomSubtotal) {
    totalAmount = Math.round(booking.roomSubtotal * 1.12);
  }
  if (!totalAmount) {
    totalAmount = 6506000;
  }

  // Compute deposit (standard 20% if not explicitly set)
  let amountPaid = paymentSuccess?.amountPaid ?? booking?.depositAmount;
  if (!amountPaid || amountPaid === 0) {
    amountPaid = Math.round(totalAmount * 0.2); // 20%
  }

  // Compute remaining balance
  let remainingBalance = paymentSuccess?.remainingBalance;
  if (
    remainingBalance === undefined ||
    remainingBalance === null ||
    (remainingBalance === 0 && amountPaid < totalAmount)
  ) {
    remainingBalance = Math.max(0, totalAmount - amountPaid);
  }

  const qrCodeUrl =
    paymentSuccess?.qrCodeUrl ||
    booking?.BookingQrCode ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${confirmationCode}`;

  const guestName =
    booking?.primaryGuest?.fullName || user?.FullName || "Nguyễn Văn An";
  const guestPhone =
    booking?.primaryGuest?.phone || user?.Phone || "+84 908 123 456";
  const memberTier = user?.MembershipTier?.TierName || "Hội viên Gold";

  const roomTypeName =
    booking?.roomType?.TypeName || booking?.roomTypeName || "Spa Suite #136";
  const checkInDate = booking?.checkInDate || "2026-10-21";
  const checkOutDate = booking?.checkOutDate || "2026-10-23";
  const numberOfNights = booking?.numberOfNights || 2;
  const roomQuantity = booking?.roomQuantity || 1;
  const adults = booking?.adults || 2;
  const children = booking?.children || 0;

  const paymentMethodLabel =
    paymentMethod === "CREDIT_CARD"
      ? "Thẻ Quốc Tế (Visa/Mastercard)"
      : paymentMethod === "DIGITAL_WALLET"
        ? "Ví Điện Tử VNPAY"
        : "Chuyển Khoản Ngân Hàng (VietQR)";

  const issueDateStr = paymentSuccess?.paymentDate
    ? new Date(paymentSuccess.paymentDate).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : new Date().toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      });

  // Base price per night estimation
  const basePricePerNight =
    booking?.roomType?.BasePrice ||
    Math.round(totalAmount / 1.12 / (numberOfNights || 1));
  const roomSubtotal = booking?.roomSubtotal || Math.round(totalAmount / 1.12);
  const taxAndFee = totalAmount - roomSubtotal;

  // Standalone Iframe Printing: strictly fits on 1 single A4 page with 100% intact CSS
  const handlePrint = () => {
    try {
      const printableContent = invoiceRef.current;
      if (!printableContent) {
        window.print();
        return;
      }

      let iframe = document.getElementById("deposit-invoice-print-frame");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "deposit-invoice-print-frame";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <meta charset="utf-8" />
            <title>Hoa_Don_Checkin_${confirmationCode}_GrandHorizon</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            <style>
              ${INVOICE_CSS}
            </style>
          </head>
          <body>
            <div class="invoice-wrapper">
              ${printableContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 350);
    } catch (err) {
      console.warn("Lỗi in qua iframe, chuyển sang window.print():", err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Inject styles into modal preview as well */}
      <style>{INVOICE_CSS}</style>

      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Top Control Bar */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#fedeb2] text-[22px]">
              receipt_long
            </span>
            <div>
              <h3 className="font-bold text-xs sm:text-sm tracking-wide">
                XÁC NHẬN CỌC &amp; MÃ NHẬN PHÒNG NHANH (1 TRANG A4)
              </h3>
              <p className="text-[11px] text-slate-300">
                Mã Check-in:{" "}
                <strong className="text-[#fedeb2] font-mono tracking-wider">
                  {confirmationCode}
                </strong>{" "}
                • Giao dịch:{" "}
                <strong className="text-slate-200 font-mono">
                  {transactionCode}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-[17px]">
                print
              </span>
              <span>In Hóa Đơn (A4 / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Đóng"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100 flex-1">
          <div className="invoice-wrapper">
            <div ref={invoiceRef} className="invoice-frame">
              {/* 1. COMPACT RESORT HEADER */}
              <div className="header-row">
                <div>
                  <h1 className="resort-title">GRAND HORIZON</h1>
                  <div className="resort-sub">
                    RESORT &amp; SUITES ĐÀ NẴNG ★★★★★
                  </div>
                  <div className="resort-info">
                    Bán đảo Horizon, Đường Duyên Hải, TP. Đà Nẵng • Hotline:{" "}
                    <strong>1900 6868</strong> • MST:{" "}
                    <strong>0401892837</strong>
                  </div>
                </div>

                <div className="header-right">
                  <div className="paid-badge">✓ ĐÃ THANH TOÁN TIỀN CỌC</div>
                  <div className="meta-info">
                    Ngày lập:{" "}
                    <strong style={{ color: "#0f172a" }}>{issueDateStr}</strong>
                  </div>
                  <div className="meta-info">{paymentMethodLabel}</div>
                </div>
              </div>

              {/* 2. PROMINENT FAST CHECK-IN PASS BANNER (MÃ SỐ CHECK-IN & MÃ QR) */}
              <div className="pass-card">
                <div className="pass-left">
                  <div className="pass-badge">
                    <span className="pass-dot"></span>
                    <span>MÃ SỐ CHECK-IN TẠI QUẦY (FAST CHECK-IN CODE)</span>
                  </div>
                  <div className="pass-code-container">
                    <span className="pass-code-box">{confirmationCode}</span>
                    <span className="pass-confirm-badge">XÁC NHẬN</span>
                  </div>
                  <p className="pass-desc">
                    Xuất trình <strong>Mã số này</strong> hoặc{" "}
                    <strong>Mã QR</strong> tại quầy Lễ Tân (Fast Track Check-in)
                    khi đến khách sạn để nhận phòng ngay lập tức.
                  </p>
                </div>

                {/* QR Code Box */}
                <div className="qr-container">
                  <img
                    src={qrCodeUrl}
                    alt="QR Check-in"
                    className="qr-img"
                    style={{
                      width: "78px",
                      height: "78px",
                      objectFit: "contain",
                    }}
                  />
                  <span className="qr-caption">QUÉT CHECK-IN</span>
                </div>
              </div>

              {/* 3. METADATA: GUEST & STAY DETAILS (2 STRUCTURED COLUMNS) */}
              <div className="info-grid">
                {/* Cột 1: Thông tin khách hàng */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span>Thông Tin Khách Hàng</span>
                    <span style={{ color: "#64748b" }}>{memberTier}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Khách lưu trú:</span>
                    <span className="info-val">{guestName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Số điện thoại:</span>
                    <span className="info-val">{guestPhone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Mã giao dịch:</span>
                    <span className="info-val font-mono">
                      {transactionCode}
                    </span>
                  </div>
                </div>

                {/* Cột 2: Chi tiết đặt phòng */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span>Chi Tiết Kỳ Nghỉ</span>
                    <span className="font-mono" style={{ color: "#0f172a" }}>
                      {roomQuantity} Phòng
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Hạng phòng:</span>
                    <span className="info-val">{roomTypeName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Nhận phòng:</span>
                    <span className="info-val">
                      14:00 • {formatDisplayDate(checkInDate)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Trả phòng:</span>
                    <span className="info-val">
                      12:00 • {formatDisplayDate(checkOutDate)} (
                      {numberOfNights} đêm)
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. FINANCIAL BREAKDOWN TABLE */}
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Khoản Mục Chi Phí (Description)</th>
                    <th className="text-center">SL / Đêm</th>
                    <th className="text-right">Đơn Giá</th>
                    <th className="text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong style={{ color: "#0f172a" }}>
                        {roomTypeName}
                      </strong>{" "}
                      ({adults} lớn{children > 0 ? `, ${children} trẻ` : ""})
                    </td>
                    <td className="text-center font-mono">
                      {numberOfNights} đêm × {roomQuantity} phòng
                    </td>
                    <td className="text-right font-mono">
                      {formatVND(basePricePerNight)}
                    </td>
                    <td
                      className="text-right font-mono"
                      style={{ fontWeight: 700, color: "#0f172a" }}
                    >
                      {formatVND(roomSubtotal)}
                    </td>
                  </tr>

                  {booking?.addonsBreakdown &&
                    booking.addonsBreakdown.length > 0 &&
                    booking.addonsBreakdown.map((addon, index) => (
                      <tr key={index}>
                        <td>
                          <span style={{ color: "#334155" }}>
                            • {addon.name}
                          </span>
                        </td>
                        <td className="text-center font-mono">
                          {addon.quantity || 1}
                        </td>
                        <td className="text-right font-mono">
                          {formatVND(addon.unitPrice)}
                        </td>
                        <td
                          className="text-right font-mono"
                          style={{ fontWeight: 600, color: "#0f172a" }}
                        >
                          {formatVND(addon.total)}
                        </td>
                      </tr>
                    ))}

                  <tr>
                    <td
                      colSpan="3"
                      className="text-right"
                      style={{ color: "#64748b" }}
                    >
                      Thuế Giá Trị Gia Tăng (VAT) &amp; Phí Dịch Vụ Địa Phương
                      (12%):
                    </td>
                    <td
                      className="text-right font-mono"
                      style={{ fontWeight: 600, color: "#334155" }}
                    >
                      {formatVND(taxAndFee)}
                    </td>
                  </tr>

                  <tr className="row-total">
                    <td
                      colSpan="3"
                      className="text-right"
                      style={{
                        textTransform: "uppercase",
                        color: "#0f172a",
                        fontSize: "10.5px",
                      }}
                    >
                      Tổng Giá Trị Đặt Phòng (Total Amount):
                    </td>
                    <td
                      className="text-right font-mono"
                      style={{
                        color: "#0f172a",
                        fontSize: "11.5px",
                        fontWeight: 800,
                      }}
                    >
                      {formatVND(totalAmount)}
                    </td>
                  </tr>

                  <tr className="row-deposit">
                    <td
                      colSpan="3"
                      className="text-right"
                      style={{ textTransform: "uppercase", color: "#065f46" }}
                    >
                      Số Tiền Cọc Đã Thanh Toán (Deposit Paid):
                    </td>
                    <td
                      className="text-right font-mono"
                      style={{
                        color: "#047857",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {formatVND(amountPaid)}
                    </td>
                  </tr>

                  <tr className="row-remaining">
                    <td
                      colSpan="3"
                      className="text-right"
                      style={{ textTransform: "uppercase", color: "#92400e" }}
                    >
                      Số Tiền Còn Lại Cần Thanh Toán Khi Check-in:
                    </td>
                    <td
                      className="text-right font-mono"
                      style={{
                        color: "#b45309",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {formatVND(remainingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 5. BRIEF TERMS & OFFICIAL RESORT SEAL */}
              <div className="footer-section">
                <div className="notes-list">
                  <p>
                    • Nhận phòng từ <strong>14:00</strong> • Trả phòng trước{" "}
                    <strong>12:00</strong> trưa. Quý khách vui lòng mang theo
                    CCCD/Passport gốc.
                  </p>
                  <p>
                    • Số tiền còn lại{" "}
                    <strong style={{ color: "#b45309" }}>
                      {formatVND(remainingBalance)}
                    </strong>{" "}
                    sẽ thanh toán tại quầy Lễ Tân khi nhận phòng (Tiền mặt / Thẻ
                    / QR).
                  </p>
                  <p>
                    • Chứng từ điện tử được tạo tự động bởi Hệ Thống Grand
                    Horizon Resort. Có giá trị xác nhận đặt cọc chính thức.
                  </p>
                </div>

                <div className="seal-box">
                  <div className="official-stamp">
                    GRAND HORIZON RESORT
                    <br />
                    ★ ĐÃ THU TIỀN CỌC ★<br />
                    <span className="stamp-sub">
                      Xác nhận bởi Bộ phận Thu ngân
                    </span>
                  </div>
                  <div className="seal-caption">Hệ Thống Đặt Phòng Điện Tử</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>In Ngay (1 Trang A4 / PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
