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
  const memberTier = user?.MembershipTier?.TierName || 'Hội viên Gold (Elite Club)';

  const roomTypeName = booking?.roomType?.TypeName || 'Biệt Thự Hồ Bơi Vách Biển (Oceanfront Sunset Pool Villa)';
  const checkInDate = booking?.checkInDate || '2024-11-15';
  const checkOutDate = booking?.checkOutDate || '2024-11-18';
  const numberOfNights = booking?.numberOfNights || 3;
  const roomQuantity = booking?.roomQuantity || 1;
  const adults = booking?.adults || 2;
  const children = booking?.children || 0;

  const paymentMethodLabel = 
    paymentMethod === 'CREDIT_CARD' ? 'Thẻ Tín Dụng / Ghi Nợ Quốc Tế (Visa / Mastercard)' :
    paymentMethod === 'DIGITAL_WALLET' ? 'Ví Điện Tử VNPAY / QR Pay' :
    'Chuyển Khoản Ngân Hàng (VietQR 24/7)';

  const issueDateStr = paymentSuccess.paymentDate 
    ? new Date(paymentSuccess.paymentDate).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

  // Standalone Iframe Printing for pristine A4 export & PDF download
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
            <title>Hoa_Don_Coc_${confirmationCode}_GrandHorizon</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              body {
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #0b1c30;
                background: #ffffff;
                font-size: 13px;
                line-height: 1.5;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .font-serif {
                font-family: 'Playfair Display', Georgia, serif;
              }
              .invoice-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                padding: 10px;
              }
              .header-border {
                border-bottom: 2px solid #725b38;
                padding-bottom: 14px;
                margin-bottom: 16px;
              }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .items-start { align-items: flex-start; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: 700; }
              .font-semibold { font-weight: 600; }
              .uppercase { text-transform: uppercase; }
              .text-gold { color: #725b38; }
              .bg-gold-light { background-color: #eff4ff; }
              .border-slate { border: 1px solid #e2e8f0; }
              .rounded-lg { border-radius: 8px; }
              .rounded-xl { border-radius: 12px; }
              .p-3 { padding: 12px; }
              .p-4 { padding: 16px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-3 { margin-bottom: 12px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-2 { margin-top: 8px; }
              .mt-4 { margin-top: 16px; }
              .gap-2 { gap: 8px; }
              .gap-4 { gap: 16px; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 12px; }
              .text-base { font-size: 14px; }
              .text-lg { font-size: 16px; }
              .text-xl { font-size: 18px; }
              .text-2xl { font-size: 22px; }
              .text-muted { color: #64748b; }
              .table-custom {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                margin-bottom: 14px;
              }
              .table-custom th {
                background-color: #f8fafc;
                color: #334155;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 700;
                padding: 10px 8px;
                border-bottom: 2px solid #cbd5e1;
                text-align: left;
              }
              .table-custom td {
                padding: 10px 8px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: top;
                font-size: 12.5px;
              }
              .badge-paid {
                display: inline-block;
                background-color: #ecfdf5;
                color: #047857;
                border: 1px solid #a7f3d0;
                padding: 4px 10px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .stamp-box {
                border: 2px dashed #b91c1c;
                color: #b91c1c;
                border-radius: 8px;
                padding: 8px 14px;
                display: inline-block;
                text-align: center;
                font-weight: 700;
                font-size: 11px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                transform: rotate(-3deg);
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
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
      console.warn('Lỗi in qua iframe, chuyển sang window.print():', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#fedeb2] text-[24px]">receipt_long</span>
            <div>
              <h3 className="font-bold text-sm tracking-wide">HÓA ĐƠN XÁC NHẬN THANH TOÁN TIỀN CỌC</h3>
              <p className="text-[11px] text-slate-300">Mã đặt chỗ: <strong className="text-[#fedeb2] font-mono">{confirmationCode}</strong> • Mã giao dịch: <strong className="text-slate-200 font-mono">{transactionCode}</strong></p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#725b38] hover:bg-[#584323] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>In Hóa Đơn / Lưu PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Đóng modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex-1">
          <div 
            ref={invoiceRef}
            className="bg-white max-w-[780px] mx-auto p-6 sm:p-10 rounded-xl shadow-md border border-slate-200 text-slate-800"
          >
            {/* 1. RESORT LETTERHEAD */}
            <div className="border-b-2 border-[#725b38] pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  GRAND HORIZON
                </h1>
                <div className="text-[11px] tracking-[0.25em] uppercase text-[#725b38] font-bold">
                  Resort &amp; Suites Đà Nẵng
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <p>Bán đảo Horizon, Đường Duyên Hải, Phường Bãi Biển, TP. Đà Nẵng</p>
                  <p>Hotline: <strong>1900 6868</strong> • Email: reservations@grandhorizonresort.com</p>
                  <p>Mã số thuế: <strong>0401892837-001</strong> • www.grandhorizon.vn</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase px-3 py-1 rounded-full mb-1">
                  ✓ Đã Xác Nhận Thanh Toán Cọc
                </div>
                <div className="text-[11px] text-slate-500">
                  Ngày lập phiếu: <span className="text-slate-800 font-semibold">{issueDateStr}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Kênh thanh toán: <span className="text-slate-800 font-medium">{paymentMethodLabel}</span>
                </div>
              </div>
            </div>

            {/* 2. INVOICE TITLE & STATUS */}
            <div className="text-center my-6">
              <h2 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-wide text-slate-900">
                Phiếu Thu Tiền Cọc &amp; Xác Nhận Đặt Phòng
              </h2>
              <p className="text-xs italic text-slate-500 mt-0.5">
                (Booking Deposit Receipt &amp; Reservation Confirmation)
              </p>
            </div>

            {/* 3. METADATA CARDS (2 COLUMNS: GUEST INFO & RESERVATION DETAILS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Box A: Khách hàng */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-[#725b38] uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span>Thông Tin Khách Hàng</span>
                  <span className="text-[10px] bg-[#fedeb2] text-[#78603e] px-2 py-0.5 rounded-full font-semibold">{memberTier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-medium text-slate-800">{guestPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{guestEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao dịch (Txn):</span>
                  <span className="font-mono font-bold text-slate-800">{transactionCode}</span>
                </div>
              </div>

              {/* Box B: Kỳ nghỉ & Phòng */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-[#725b38] uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span>Chi Tiết Đặt Phòng</span>
                  <span className="font-mono font-bold text-[#725b38] text-[12px]">{confirmationCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loại biệt thự:</span>
                  <span className="font-bold text-slate-900 text-right truncate pl-2">{roomTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhận phòng (Check-in):</span>
                  <span className="font-semibold text-slate-800">14:00 • {formatDisplayDate(checkInDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trả phòng (Check-out):</span>
                  <span className="font-semibold text-slate-800">12:00 • {formatDisplayDate(checkOutDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quy mô lưu trú:</span>
                  <span className="font-medium text-slate-800">{numberOfNights} đêm • {adults} lớn{children > 0 ? `, ${children} trẻ` : ''} • {roomQuantity} phòng</span>
                </div>
              </div>
            </div>

            {/* 4. FINANCIAL BREAKDOWN TABLE */}
            <div className="mb-6 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-y border-slate-200">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Khoản Mục Chi Phí (Description)</th>
                    <th className="py-2.5 px-3 text-center">Số Lượng</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                    <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-3 text-center font-mono">1</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{roomTypeName}</div>
                      <div className="text-[11px] text-slate-500">Lưu trú trọn gói resort 5 sao kèm hồ bơi riêng</div>
                    </td>
                    <td className="py-3 px-3 text-center">{numberOfNights} đêm × {roomQuantity} phòng</td>
                    <td className="py-3 px-3 text-right font-mono">{formatVND(booking?.roomType?.BasePrice || (totalAmount / (numberOfNights || 1)))}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">{formatVND(booking?.roomSubtotal || (totalAmount * 0.88))}</td>
                  </tr>

                  {booking?.addonsBreakdown && booking.addonsBreakdown.length > 0 && booking.addonsBreakdown.map((addon, index) => (
                    <tr key={index}>
                      <td className="py-2.5 px-3 text-center font-mono">{index + 2}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{addon.name}</div>
                        <div className="text-[11px] text-slate-500">Dịch vụ trải nghiệm cao cấp đã chọn thêm</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">{addon.quantity || 1}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatVND(addon.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold font-mono text-slate-900">{formatVND(addon.total)}</td>
                    </tr>
                  ))}

                  <tr>
                    <td colSpan="4" className="py-2 px-3 text-right text-slate-500">
                      Thuế Giá Trị Gia Tăng (VAT) &amp; Phí Dịch Vụ Địa Phương (12%):
                    </td>
                    <td className="py-2 px-3 text-right font-semibold font-mono text-slate-800">
                      {formatVND(Math.round(totalAmount * 0.12 / 1.12))}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 border-t-2 border-slate-300 text-sm">
                    <td colSpan="4" className="py-3 px-3 text-right font-bold text-slate-900 uppercase">
                      Tổng Giá Trị Đơn Đặt Phòng (Total Amount):
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 text-base">
                      {formatVND(totalAmount)}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/80 text-emerald-900 border-t border-emerald-200">
                    <td colSpan="4" className="py-3 px-3 text-right font-bold uppercase">
                      Số Tiền Cọc Đã Thanh Toán (Deposit Paid):
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-emerald-700 text-base">
                      {formatVND(amountPaid)}
                    </td>
                  </tr>

                  <tr className="bg-amber-50/80 text-amber-900 border-t border-amber-200 font-bold">
                    <td colSpan="4" className="py-3 px-3 text-right uppercase">
                      Số Tiền Còn Lại Thanh Toán Khi Nhận Phòng (Remaining Balance):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-800 text-base">
                      {formatVND(remainingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. FAST CHECK-IN QR & RESORT POLICIES */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="shrink-0 text-center bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code Check-in" 
                  className="w-28 h-28 object-contain mx-auto"
                />
                <span className="text-[10px] font-bold text-[#725b38] block mt-1">QR FAST CHECK-IN</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-[#725b38]">
                  Quy Định Nhận Phòng &amp; Lưu Ý Quan Trọng:
                </h4>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Quý khách vui lòng xuất trình mã QR này hoặc cung cấp Mã đặt chỗ <strong>{confirmationCode}</strong> tại quầy Lễ Tân khi làm thủ tục nhận phòng.</li>
                  <li>Giờ nhận phòng tiêu chuẩn: từ <strong>14:00</strong>. Giờ trả phòng: trước <strong>12:00</strong>.</li>
                  <li>Khách lưu trú chính vui lòng mang theo Căn cước công dân (hoặc Hộ chiếu) bản gốc còn hiệu lực để hoàn tất thủ tục đăng ký tạm trú theo luật định.</li>
                  <li>Số tiền còn lại <strong>{formatVND(remainingBalance)}</strong> sẽ được thanh toán trực tiếp tại quầy Lễ Tân khi nhận phòng bằng Tiền mặt, Thẻ tín dụng hoặc Chuyển khoản.</li>
                </ul>
              </div>
            </div>

            {/* 6. SIGNATURES & OFFICIAL STAMP */}
            <div className="grid grid-cols-2 pt-4 border-t border-slate-200 text-center text-xs">
              <div>
                <div className="font-bold text-slate-800 uppercase text-[11px]">Khách Hàng Xác Nhận</div>
                <div className="text-[11px] italic text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-900 font-serif italic text-sm">
                  {guestName}
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-800 uppercase text-[11px]">Đại Diện Khu Nghỉ Dưỡng</div>
                <div className="text-[11px] italic text-slate-400 mt-0.5">Grand Horizon Resort &amp; Suites</div>
                <div className="h-16 flex items-center justify-center relative">
                  {/* Official Verified Stamp Badge */}
                  <div className="border-2 border-red-700 text-red-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transform -rotate-3 select-none">
                    GRAND HORIZON RESORT<br />
                    ★ ĐÃ THU TIỀN CỌC ★
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer Note */}
            <div className="mt-8 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
              Chứng từ điện tử được tạo tự động bởi Hệ Thống Quản Lý Đặt Phòng Grand Horizon Resort &amp; Suites. Có giá trị xác nhận đặt phòng và thu cọc chính thức.
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
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>In Hóa Đơn Cọc (A4 / PDF)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
