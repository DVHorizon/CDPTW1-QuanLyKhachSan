import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { lookupGuestBookingApi, cancelGuestBookingLookupApi } from '../../api/roomApi';

const formatCurrency = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
};

export default function GuestBookingLookup() {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [booking, setBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Thay đổi kế hoạch nghỉ dưỡng');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCancelSuccess('');
    setBooking(null);

    if (!confirmationCode.trim() || !email.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Mã đặt phòng (VD: GH-366599) và Email xác nhận.');
      return;
    }

    setLoading(true);
    const res = await lookupGuestBookingApi({
      confirmationCode: confirmationCode.trim(),
      email: email.trim()
    });
    setLoading(false);

    if (res.success && res.data) {
      setBooking(res.data);
    } else {
      setErrorMsg(res.message || 'Không tìm thấy đơn đặt phòng phù hợp.');
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    setErrorMsg('');
    const res = await cancelGuestBookingLookupApi({
      confirmationCode: booking.confirmationCode,
      email: email.trim(),
      cancellationReason: cancelReason
    });
    setCancelling(false);

    if (res.success) {
      setCancelSuccess(`${res.message} (${res.data?.refundPolicyNote || ''})`);
      setBooking((prev) => (prev ? { ...prev, status: 'Cancelled' } : prev));
    } else {
      setErrorMsg(res.message || 'Không thể hủy đơn đặt phòng.');
    }
  };

  const canCancel = booking && ['Pending', 'Confirmed'].includes(booking.status);

  return (
    <div className="min-h-screen bg-[#faf9f6] pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fedeb2]/50 text-[#725b38] text-xs font-bold tracking-wider uppercase mb-3">
            <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
            Guest Booking Lookup
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#0b1c30]">Tra Cứu Đơn Đặt Phòng</h1>
          <p className="text-sm text-[#45464d] mt-2">
            Dành cho khách vãng lai chưa đăng nhập: Xem lại thẻ QR Check-in điện tử, thông tin kỳ nghỉ hoặc hủy đặt phòng theo chính sách 72 giờ.
          </p>
        </div>

        <form onSubmit={handleLookup} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e2dc] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#45464d] mb-1.5">
                Mã xác nhận (Confirmation Code)
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="VD: GH-366599"
                className="w-full px-4 py-2.5 rounded-xl border border-[#c6c6cd] text-sm font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#725b38]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#45464d] mb-1.5">
                Email đặt phòng
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#c6c6cd] text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#725b38]/30"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {cancelSuccess && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {cancelSuccess}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link to="/auth" className="text-xs font-semibold text-[#725b38] hover:underline">
              Đã có tài khoản? Đăng nhập để xem toàn bộ lịch sử →
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#0b1c30] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1a3250] transition disabled:opacity-60"
            >
              {loading ? 'Đang tra cứu...' : 'Tra cứu đơn đặt phòng'}
            </button>
          </div>
        </form>

        {booking && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e2dc] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold text-[#725b38] uppercase tracking-wider">#{booking.confirmationCode}</p>
                <h2 className="font-serif text-xl font-bold text-[#0b1c30]">
                  {booking.roomType?.Name || booking.roomType?.RoomTypeName || 'Luxury Suite'}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#faf9f6]">
                <p className="text-[#76777d] font-semibold">Nhận phòng</p>
                <p className="font-bold text-[#0b1c30] mt-1">{formatDate(booking.checkInDate)} (15:00)</p>
              </div>
              <div className="p-3 rounded-xl bg-[#faf9f6]">
                <p className="text-[#76777d] font-semibold">Trả phòng</p>
                <p className="font-bold text-[#0b1c30] mt-1">{formatDate(booking.checkOutDate)} (11:00)</p>
              </div>
              <div className="p-3 rounded-xl bg-[#faf9f6]">
                <p className="text-[#76777d] font-semibold">Số phòng / Đêm</p>
                <p className="font-bold text-[#0b1c30] mt-1">{booking.roomQuantity} phòng • {booking.numberOfNights} đêm</p>
              </div>
              <div className="p-3 rounded-xl bg-[#faf9f6]">
                <p className="text-[#76777d] font-semibold">Tổng tiền / Đã cọc</p>
                <p className="font-bold text-[#0b1c30] mt-1">
                  {formatCurrency(booking.totalAmount)} / {formatCurrency(booking.depositAmount)}
                </p>
              </div>
            </div>

            {booking.bookingQrCode && (
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#faf9f6] border border-[#e5e2dc]">
                <img
                  src={booking.bookingQrCode}
                  alt="Contactless Check-in QR"
                  className="w-28 h-28 rounded-lg border border-slate-200 bg-white p-1"
                />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-[#0b1c30] text-sm">Contactless Check-in Pass Sẵn Sàng</p>
                  <p className="text-[#45464d]">
                    Xuất trình mã QR này tại quầy Lễ tân để hoàn tất thủ tục nhận phòng trong 1 phút.
                  </p>
                  <a
                    href={booking.bookingQrCode}
                    download={`QR_Pass_${booking.confirmationCode}.png`}
                    className="inline-block mt-1 font-bold text-[#725b38] hover:underline"
                  >
                    Tải xuống thẻ QR →
                  </a>
                </div>
              </div>
            )}

            {canCancel && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>Chính sách hủy 72 giờ:</strong>{' '}
                  {booking.isEligibleForFullRefund
                    ? 'Đơn của bạn đủ điều kiện hoàn lại 100% tiền đặt cọc.'
                    : 'Đơn đang trong vòng 72 giờ trước nhận phòng — hủy cận giờ sẽ áp dụng phạt 100% tiền cọc.'}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Lý do hủy phòng..."
                    className="flex-1 px-3 py-2 rounded-xl border border-[#c6c6cd] text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {cancelling ? 'Đang hủy...' : 'Xác nhận hủy đặt phòng'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
