import React, { useRef } from 'react';

// Helper format VND
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num || 0)) + ' ₫';
};

// Helper format date DD/MM/YYYY
const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  const parts = String(dStr).split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
};

export default function DepositInvoiceModal({
  isOpen,
  onClose,
  booking,
  paymentSuccess,
  paymentMethod = 'BANK_TRANSFER',
  user
}) {
  const invoiceRef = useRef(null);

  if (!isOpen || !paymentSuccess) return null;

  // Extract variables with robust fallbacks
  const transactionCode = paymentSuccess.transactionCode || 'TXN-' + Date.now();
  const confirmationCode = paymentSuccess.confirmationCode || booking?.confirmationCode || 'GH-293357';
  const amountPaid = paymentSuccess.amountPaid || 0;
  const remainingBalance = paymentSuccess.remainingBalance !== undefined ? paymentSuccess.remainingBalance : 0;
  const totalAmount = (amountPaid + remainingBalance) || booking?.totalAmount || 0;
  const qrCodeUrl = paymentSuccess.qrCodeUrl || booking?.BookingQrCode || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${confirmationCode}`;

  const guestName = booking?.primaryGuest?.fullName || user?.FullName || 'Nguyễn Văn An';
  const guestPhone = booking?.primaryGuest?.phone || user?.Phone || '+84 908 123 456';
  const guestEmail = booking?.primaryGuest?.email || user?.Email || 'an.nguyen@grandhorizon.vn';
  const memberTier = user?.MembershipTier?.TierName || 'Hội viên Gold';

  const roomTypeName = booking?.roomType?.TypeName || 'Biệt Thự Hồ Bơi Vách Biển (Sunset Villa)';
  const checkInDate = booking?.checkInDate || '2024-11-15';
  const checkOutDate = booking?.checkOutDate || '2024-11-18';
  const numberOfNights = booking?.numberOfNights || 3;
  const roomQuantity = booking?.roomQuantity || 1;
  const adults = booking?.adults || 2;
  const children = booking?.children || 0;

  const paymentMethodLabel = 
    paymentMethod === 'CREDIT_CARD' ? 'Thẻ Quốc Tế (Visa/Mastercard)' :
    paymentMethod === 'DIGITAL_WALLET' ? 'Ví Điện Tử VNPAY' :
    'Chuyển Khoản Ngân Hàng (VietQR)';

  const issueDateStr = paymentSuccess.paymentDate 
    ? new Date(paymentSuccess.paymentDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  // Standalone Iframe Printing: strictly fits on 1 single A4 page
  const handlePrint = () => {
    try {
      const printableContent = invoiceRef.current;
      if (!printableContent) {
        window.print();
        return;
      }

      let iframe = document.getElementById('deposit-invoice-print-frame');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'deposit-invoice-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
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
                height: 100%;
                max-height: 284mm;
                overflow: hidden;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #0b1c30;
                background: #ffffff;
                font-size: 11.5px;
                line-height: 1.35;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                page-break-inside: avoid;
                page-break-after: avoid;
              }
              .font-serif {
                font-family: 'Playfair Display', Georgia, serif;
              }
              .invoice-page {
                width: 100%;
                max-width: 780px;
                margin: 0 auto;
                padding: 6px 10px;
                page-break-inside: avoid;
              }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .items-start { align-items: flex-start; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: 700; }
              .font-extrabold { font-weight: 800; }
              .font-semibold { font-weight: 600; }
              .uppercase { text-transform: uppercase; }
              .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
              .text-gold { color: #725b38; }
              .bg-gold-light { background-color: #eff4ff; }
              .border-slate { border: 1px solid #cbd5e1; }
              .rounded-lg { border-radius: 6px; }
              .rounded-xl { border-radius: 10px; }
              .p-2 { padding: 8px; }
              .p-3 { padding: 10px; }
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 7px; }
              .mb-3 { margin-bottom: 10px; }
              .table-custom {
                width: 100%;
                border-collapse: collapse;
                margin: 6px 0;
              }
              .table-custom th {
                background-color: #f1f5f9;
                color: #334155;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-weight: 700;
                padding: 6px 8px;
                border-top: 1px solid #cbd5e1;
                border-bottom: 1.5px solid #94a3b8;
                text-align: left;
              }
              .table-custom td {
                padding: 5px 8px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 11px;
                vertical-align: middle;
              }
            </style>
          </head>
          <body>
            <div class="invoice-page">
              ${printableContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 300);
    } catch (err) {
      console.warn('Lỗi in qua iframe, chuyển sang window.print():', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#fedeb2] text-[22px]">receipt_long</span>
            <div>
              <h3 className="font-bold text-xs sm:text-sm tracking-wide">HÓA ĐƠN TIỀN CỌC &amp; MÃ CHECK-IN (1 TRANG A4)</h3>
              <p className="text-[11px] text-slate-300">
                Mã Check-in: <strong className="text-[#fedeb2] font-mono tracking-wider">{confirmationCode}</strong> • Giao dịch: <strong className="text-slate-200 font-mono">{transactionCode}</strong>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              <span>In Hóa Đơn (1 Trang A4 / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Đóng"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-slate-100 flex-1">
          <div 
            ref={invoiceRef}
            className="bg-white max-w-[760px] mx-auto p-5 sm:p-7 rounded-xl shadow-md border border-slate-200 text-slate-800"
            style={{ minHeight: 'auto', pageBreakInside: 'avoid' }}
          >
            {/* 1. COMPACT RESORT HEADER */}
            <div className="border-b-2 border-[#725b38] pb-3 mb-3 flex justify-between items-start">
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  GRAND HORIZON
                </h1>
                <div className="text-[10px] tracking-[0.25em] uppercase text-[#725b38] font-bold">
                  Resort &amp; Suites Đà Nẵng
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Bán đảo Horizon, Đường Duyên Hải, TP. Đà Nẵng • Hotline: <strong>1900 6868</strong> • MST: <strong>0401892837</strong>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-0.5">
                  ✓ ĐÃ THANH TOÁN TIỀN CỌC
                </div>
                <div className="text-[10px] text-slate-500">
                  Ngày lập: <span className="text-slate-800 font-semibold">{issueDateStr}</span> • {paymentMethodLabel}
                </div>
              </div>
            </div>

            {/* 2. PROMINENT FAST CHECK-IN PASS BANNER (MÃ SỐ CHECK-IN & MÃ QR) */}
            <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-[#eff4ff] via-amber-50/50 to-[#eff4ff] border-2 border-[#725b38]/40 flex items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>MÃ SỐ CHECK-IN TẠI QUẦY (FAST CHECK-IN CODE)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#725b38] tracking-widest bg-white px-3 py-1 rounded-lg border border-[#725b38]/30 shadow-xs">
                    {confirmationCode}
                  </span>
                  <span className="text-[10px] font-bold bg-[#fedeb2] text-[#78603e] px-2 py-1 rounded">
                    XÁC NHẬN
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Xuất trình <strong>Mã số này</strong> hoặc <strong>Mã QR</strong> tại quầy Lễ Tân khi đến khách sạn để nhận phòng ngay lập tức.
                </p>
              </div>

              {/* QR Code Box */}
              <div className="shrink-0 text-center bg-white p-1.5 rounded-lg border border-slate-300 shadow-xs">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Check-in" 
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain mx-auto"
                />
                <span className="text-[9px] font-extrabold text-[#725b38] block mt-0.5 tracking-wider">
                  QR CHECK-IN
                </span>
              </div>
            </div>

            {/* 3. METADATA: GUEST & STAY DETAILS (2 COMPACT COLUMNS) */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 text-[11px]">
              {/* Cột 1: Thông tin khách hàng */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-[#725b38] uppercase text-[10px] tracking-wider border-b border-slate-200 pb-1 flex justify-between">
                  <span>Thông Tin Khách Hàng</span>
                  <span className="text-slate-500">{memberTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách lưu trú:</span>
                  <span className="font-bold text-slate-900">{guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-medium text-slate-800">{guestPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao dịch:</span>
                  <span className="font-mono text-slate-700 font-semibold">{transactionCode}</span>
                </div>
              </div>

              {/* Cột 2: Chi tiết đặt phòng */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-[#725b38] uppercase text-[10px] tracking-wider border-b border-slate-200 pb-1 flex justify-between">
                  <span>Chi Tiết Kỳ Nghỉ</span>
                  <span className="font-mono text-slate-700 font-bold">{roomQuantity} Phòng</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạng phòng:</span>
                  <span className="font-bold text-slate-900 truncate pl-2">{roomTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhận phòng:</span>
                  <span className="font-semibold text-slate-800">14:00 • {formatDisplayDate(checkInDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trả phòng:</span>
                  <span className="font-semibold text-slate-800">12:00 • {formatDisplayDate(checkOutDate)} ({numberOfNights} đêm)</span>
                </div>
              </div>
            </div>

            {/* 4. FINANCIAL BREAKDOWN TABLE (COMPACT) */}
            <div className="mb-2.5">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-y border-slate-300">
                    <th className="py-1.5 px-2.5">Khoản Mục Chi Phí (Description)</th>
                    <th className="py-1.5 px-2.5 text-center">SL / Đêm</th>
                    <th className="py-1.5 px-2.5 text-right">Đơn Giá</th>
                    <th className="py-1.5 px-2.5 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-1.5 px-2.5">
                      <strong className="text-slate-900">{roomTypeName}</strong> ({adults} lớn{children > 0 ? `, ${children} trẻ` : ''})
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono">{numberOfNights} đêm × {roomQuantity} phòng</td>
                    <td className="py-1.5 px-2.5 text-right font-mono">{formatVND(booking?.roomType?.BasePrice || (totalAmount / (numberOfNights || 1)))}</td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono">{formatVND(booking?.roomSubtotal || (totalAmount * 0.88))}</td>
                  </tr>

                  {booking?.addonsBreakdown && booking.addonsBreakdown.length > 0 && booking.addonsBreakdown.map((addon, index) => (
                    <tr key={index}>
                      <td className="py-1 px-2.5">
                        <span className="font-medium text-slate-800">• {addon.name}</span>
                      </td>
                      <td className="py-1 px-2.5 text-center font-mono">{addon.quantity || 1}</td>
                      <td className="py-1 px-2.5 text-right font-mono">{formatVND(addon.unitPrice)}</td>
                      <td className="py-1 px-2.5 text-right font-semibold font-mono text-slate-900">{formatVND(addon.total)}</td>
                    </tr>
                  ))}

                  <tr>
                    <td colSpan="3" className="py-1 px-2.5 text-right text-slate-500">
                      Thuế Giá Trị Gia Tăng (VAT) &amp; Phí Dịch Vụ Địa Phương (12%):
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold font-mono text-slate-800">
                      {formatVND(Math.round(totalAmount * 0.12 / 1.12))}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-t border-slate-300">
                    <td colSpan="3" className="py-1.5 px-2.5 text-right uppercase text-slate-900">
                      Tổng Giá Trị Đặt Phòng (Total Amount):
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 text-xs">
                      {formatVND(totalAmount)}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/90 text-emerald-950 font-bold border-t border-emerald-200">
                    <td colSpan="3" className="py-1.5 px-2.5 text-right uppercase text-emerald-900">
                      Số Tiền Cọc Đã Thanh Toán (Deposit Paid):
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700 text-sm">
                      {formatVND(amountPaid)}
                    </td>
                  </tr>

                  <tr className="bg-amber-50/90 text-amber-950 font-bold border-t border-amber-200">
                    <td colSpan="3" className="py-1.5 px-2.5 text-right uppercase text-amber-900">
                      Số Tiền Còn Lại Cần Thanh Toán Khi Check-in:
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-amber-800 text-sm">
                      {formatVND(remainingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. BRIEF TERMS & SIGNATURE (COMPACT BOTTOM) */}
            <div className="grid grid-cols-12 gap-3 pt-2 border-t border-slate-200 items-center text-[10px]">
              <div className="col-span-8 text-slate-500 space-y-0.5">
                <p>• Nhận phòng từ <strong>14:00</strong> • Trả phòng trước <strong>12:00</strong> trưa. Quý khách vui lòng mang theo CCCD/Passport gốc.</p>
                <p>• Số tiền còn lại <strong>{formatVND(remainingBalance)}</strong> sẽ thanh toán tại quầy Lễ Tân khi nhận phòng (Tiền mặt / Thẻ / QR).</p>
                <p>• Chứng từ điện tử được tạo tự động bởi Hệ Thống Grand Horizon Resort. Có giá trị xác nhận đặt cọc chính thức.</p>
              </div>

              <div className="col-span-4 text-center">
                <div className="border border-red-700 text-red-700 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transform -rotate-2 inline-block">
                  GRAND HORIZON RESORT<br />
                  ★ ĐÃ THU TIỀN CỌC ★
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Xác nhận bởi Bộ phận Thu ngân</div>
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
