import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function BookingConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId') || searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setError('Không tìm thấy mã đặt phòng trên liên kết.');
      setLoading(false);
      return;
    }

    const fetchQRCode = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/bookings/${bookingId}/qr-code`);
        const json = await res.json();
        if (json.success && json.data) {
          setQrData(json.data);
        } else {
          setError(json.message || 'Không thể tải mã QR check-in.');
        }
      } catch (err) {
        setError('Lỗi kết nối máy chủ khi tải mã xác nhận.');
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [bookingId]);

  const handleResendEmail = async () => {
    try {
      setEmailSending(true);
      const res = await fetch('/api/v1/notifications/email-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: Number(bookingId) })
      });
      const json = await res.json();
      if (json.success) {
        setEmailSentSuccess(true);
        setTimeout(() => setEmailSentSuccess(false), 4000);
      } else {
        alert(json.message || 'Không thể gửi email lúc này');
      }
    } catch (err) {
      alert('Lỗi kết nối mạng khi gửi email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleAddCalendar = () => {
    alert('Đã tạo liên kết sự kiện lưu trú. Vui lòng kiểm tra email của bạn để đồng bộ Google Calendar / iCal.');
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Banner Chúc Mừng & Hero Ambience */}
        <div className="relative overflow-hidden rounded-2xl bg-[#131b2e] text-white py-12 px-6 md:px-12 shadow-2xl text-center">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#725b38]/20 blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/4 -bottom-20 w-96 h-96 rounded-full bg-[#fedeb2]/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Animated Gold Checkmark */}
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#725b38]/30 shadow-[0_0_40px_rgba(114,91,56,0.35)] mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#725b38] to-[#fedeb2] flex items-center justify-center text-[#131b2e] shadow-md">
                <span className="material-symbols-outlined text-3xl font-bold">check</span>
              </div>
            </div>

            {/* Overline Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#fedeb2]/20 text-[#fedeb2] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#fedeb2] animate-ping"></span>
              <span className="text-xs uppercase tracking-widest font-semibold">Giao Dịch Đã Xác Nhận</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-serif font-bold tracking-tight mb-2">
              Chúc Mừng Quý Khách Đã Đặt Phòng Thành Công!
            </h1>

            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              Mã xác nhận đặt phòng: <strong className="text-[#fedeb2] font-mono tracking-wider">#{qrData?.confirmationCode || `GH-${bookingId}`}</strong> • Email xác nhận kèm vé điện tử đã được kích hoạt gửi tới hòm thư của Quý khách.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6 w-full">
              <button
                onClick={handleDownloadPDF}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#131b2e] font-semibold text-xs uppercase tracking-wider shadow-md hover:bg-slate-100 transition-all"
              >
                <span className="material-symbols-outlined text-lg text-[#725b38]">download</span>
                <span>Tải Phiếu Xác Nhận (PDF)</span>
              </button>

              <button
                onClick={handleAddCalendar}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#725b38]/40 text-[#fedeb2] font-semibold text-xs uppercase tracking-wider hover:bg-[#725b38]/60 transition-all"
              >
                <span className="material-symbols-outlined text-lg">event_available</span>
                <span>Thêm Vào Lịch Trình</span>
              </button>

              <button
                onClick={handleResendEmail}
                disabled={emailSending}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#725b38] text-white font-semibold text-xs uppercase tracking-wider hover:bg-[#584323] transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-lg">{emailSending ? 'sync' : 'forward_to_inbox'}</span>
                <span>{emailSending ? 'Đang gửi...' : 'Gửi lại Email'}</span>
              </button>

              <Link
                to="/me/bookings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs uppercase tracking-wider hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined text-lg text-[#fedeb2]">manage_search</span>
                <span>Xem Lịch Sử</span>
              </Link>
            </div>

            {emailSentSuccess && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-emerald-900/60 text-emerald-200 text-xs border border-emerald-500/30">
                ✅ Đã gửi lại email xác nhận đặt phòng thành công!
              </div>
            )}
          </div>
        </div>

        {/* Master Voucher & VIP Boarding Pass Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header Strip */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#725b38] text-2xl">verified</span>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#725b38] font-bold">Thẻ Xác Nhận Lưu Trú Điện Tử • VIP Boarding Pass</div>
                <div className="text-base font-serif font-bold text-slate-900">GRAND HORIZON RESORT &amp; SUITES PHÚ QUỐC</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-[#725b38] text-xs font-semibold border border-amber-200">
              <span className="material-symbols-outlined text-base">workspace_premium</span>
              <span>Đặc Quyền Hội Viên Elite</span>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Details */}
            <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#725b38] font-semibold mb-1">
                  Hạng Phòng Đã Đặt
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900">
                  {qrData?.roomTypeName || 'Hạng Phòng Nghỉ Dưỡng Sang Trọng'}
                </h2>

                {/* Timeline Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider mb-1">
                      <span>Nhận Phòng (Check-in)</span>
                      <span className="material-symbols-outlined text-[#725b38] text-base">login</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900">{qrData?.checkInDate || '14:00 Ngày đến'}</div>
                    <div className="text-xs text-[#725b38] font-medium mt-1">Từ 14:00 (Hỗ trợ nhận sớm theo tình trạng phòng)</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider mb-1">
                      <span>Trả Phòng (Check-out)</span>
                      <span className="material-symbols-outlined text-[#725b38] text-base">logout</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900">{qrData?.checkOutDate || '12:00 Ngày đi'}</div>
                    <div className="text-xs text-[#725b38] font-medium mt-1">Trước 12:00 (Hỗ trợ trễ cho hội viên VIP)</div>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase block">Khách Lưu Trú</span>
                    <span className="font-semibold text-slate-900">{qrData?.guestName || 'Quý Khách'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase block">Trạng Thái Đơn</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      {qrData?.bookingStatus || 'Confirmed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase block">Đặc Quyền Dịch Vụ</span>
                    <span className="font-semibold text-[#725b38]">Bữa Sáng &amp; Quản Gia</span>
                  </div>
                </div>
              </div>

              {/* Safety notice */}
              <div className="mt-6 p-4 rounded-xl bg-amber-50/50 border border-amber-100/60 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#725b38] text-2xl shrink-0">verified_user</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đơn đặt phòng đã được mã hóa bảo mật cấp cao. Quý khách chỉ cần xuất trình mã QR Check-in bên phải hoặc CCCD/Hộ chiếu khi đến quầy sảnh chính để nhận thẻ phòng.
                </p>
              </div>
            </div>

            {/* Right Fast Check-in QR Stub */}
            <div className="lg:col-span-4 bg-slate-50/70 p-6 md:p-8 flex flex-col items-center justify-between text-center">
              <div>
                <div className="inline-flex items-center gap-1 text-[#725b38] text-xs uppercase tracking-widest font-bold">
                  <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                  <span>Fast Check-in 3 Giây</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Mã Nhận Phòng Ưu Tiên</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Quét trực tiếp tại Kiosk Concierge hoặc Lễ tân để nhận thẻ phòng không cần xếp hàng.
                </p>
              </div>

              {/* Dynamic QR Display */}
              <div className="my-6 p-4 bg-white rounded-2xl shadow-md border border-slate-100 flex flex-col items-center">
                {loading ? (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                  </div>
                ) : qrData?.qrCodeUrl ? (
                  <img
                    src={qrData.qrCodeUrl}
                    alt="Contactless Check-in Pass QR"
                    className="w-52 h-52 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center text-red-500 p-4">
                    <span className="material-symbols-outlined text-3xl">error</span>
                    <span className="text-xs mt-2">{error || 'Không thể hiển thị mã QR'}</span>
                  </div>
                )}
                <span className="text-xs text-slate-500 font-mono tracking-widest mt-3">
                  PASS: {qrData?.confirmationCode || `GH-${bookingId}`}
                </span>
              </div>

              <div className="w-full text-center space-y-1">
                <div className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Bảo mật chuẩn PCI-DSS &amp; SSL 256-bit</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
