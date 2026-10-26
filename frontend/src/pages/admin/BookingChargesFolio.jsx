import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/layout/AdminLayout';
import bookingApi from '../../api/bookingApi';

const fmtMoney = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getHours())}:${p(dt.getMinutes())} ${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

export default function BookingChargesFolio() {
  const { bookingId: paramBookingId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeBookingId = paramBookingId || searchParams.get('bookingId') || '';

  const [inputBookingId, setInputBookingId] = useState(activeBookingId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCharges = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getBookingCharges(idToFetch);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Không thể tổng hợp chi phí cho mã đặt phòng này.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeBookingId) {
      setInputBookingId(activeBookingId);
      fetchCharges(activeBookingId);
    } else {
      setData(null);
    }
  }, [activeBookingId, fetchCharges]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanId = String(inputBookingId).trim().replace(/^GH-|^#BK-|^BK-|^#/i, '');
    if (!cleanId) return;
    navigate(`/admin/charges/${cleanId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const stays = data?.stays || [];
  const minibar = data?.minibar || [];
  const services = data?.services || [];
  const fnb = data?.foodAndBeverage || [];
  const summary = data?.summary || {
    roomSubtotal: 0,
    minibarSubtotal: 0,
    serviceSubtotal: 0,
    foodSubtotal: 0,
    surcharge: 0,
    discount: 0,
    grandTotal: 0,
    totalPaid: 0,
    remainingBalance: 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-2xl">receipt_long</span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Bảng Kê Chi Phí Lưu Trú (Master Folio Preview)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Màn 25 / FEAT-INVOICE-01
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Tự động gom tạm tính toàn bộ chi phí lưu trú (Phòng, Minibar, Laundry, Spa, Tour, Nhà hàng/Bar) theo Booking
            </p>
          </div>

          {/* Ô Tra cứu Booking ID nhanh */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Nhập mã đặt phòng (VD: 1, 102)..."
                value={inputBookingId}
                onChange={(e) => setInputBookingId(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 font-mono transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">manage_search</span>
              <span>Xem Bảng Kê</span>
            </button>
          </form>
        </div>

        {/* Chưa chọn Booking */}
        {!activeBookingId ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-800">Chưa chọn mã đặt phòng</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vui lòng nhập mã đặt phòng (Booking ID) vào ô tìm kiếm ở trên hoặc truy cập từ danh sách đặt phòng để xem bảng kê chi phí tổng hợp.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Đến Danh Sách Đặt Phòng</span>
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-medium text-slate-600">Đang tự động gom chi phí từ các phân hệ lưu trú...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-800">Không thể tải dữ liệu chi phí</h3>
              <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => fetchCharges(activeBookingId)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* Thanh công cụ thao tác */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-lg print:hidden">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 font-mono text-xs font-bold">
                  BOOKING #{data.bookingId}
                </span>
                <span className="text-xs text-slate-300">
                  Khách đại diện: <strong className="text-white">{data.guestName || '—'}</strong> • Phòng: <strong className="text-blue-300">{data.roomNumber || 'Chưa gán'}</strong>
                </span>
                {data.estimated && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                    Tạm tính (Chưa Check-in)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchCharges(activeBookingId)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Làm mới</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>In Bảng Kê (Folio)</span>
                </button>
                <Link
                  to="/admin/bookings"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700 ml-1"
                >
                  Quay lại
                </Link>
              </div>
            </div>

            {/* Banner Cảnh báo Dịch vụ còn dở dang */}
            {data.hasPendingServices && (
              <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900 shadow-sm animate-in fade-in">
                <span className="material-symbols-outlined text-amber-600 text-2xl flex-shrink-0">
                  warning
                </span>
                <div className="leading-relaxed">
                  <strong className="font-bold text-amber-950 uppercase tracking-wide">Cảnh báo nghiệp vụ lễ tân:</strong> Booking này hiện đang có đơn dịch vụ (giặt ủi, spa, tour...) ở trạng thái tiếp nhận hoặc đang xử lý. Chi phí của các dịch vụ chưa hoàn thành này tạm thời chưa được tính vào tổng thanh toán. Vui lòng kiểm tra với bộ phận liên quan trước khi chốt hóa đơn trả phòng.
                </div>
              </div>
            )}

            {/* THẺ TÓM TẮT THÔNG TIN LƯU TRÚ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Khách hàng đại diện:</span>
                <strong className="text-sm font-bold text-slate-900">{data.guestName || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phòng lưu trú:</span>
                <strong className="text-sm font-bold font-mono text-blue-700">{data.roomNumber || 'Chưa gán'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Ngày nhận phòng (Check-in):</span>
                <span className="text-sm font-mono font-medium text-slate-800">{fmtDate(data.checkInDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Ngày trả phòng (Check-out):</span>
                <span className="text-sm font-mono font-medium text-slate-800">{fmtDate(data.checkOutDate)}</span>
              </div>
            </div>

            {/* BẢNG 1: TIỀN PHÒNG & LƯU TRÚ (ROOM CHARGES) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">hotel</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Chi Phí Tiền Phòng & Lưu Trú ({stays.length} lượt ở)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-blue-900">
                  {fmtMoney(summary.roomSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Số phòng</th>
                      <th className="py-3 px-4">Hạng phòng</th>
                      <th className="py-3 px-4">Khoảng thời gian lưu trú</th>
                      <th className="py-3 px-4 text-center">Số đêm</th>
                      <th className="py-3 px-4 text-right">Đơn giá / đêm</th>
                      <th className="py-3 px-4 text-right">Phụ thu nhận sớm / trả trễ</th>
                      <th className="py-3 px-4 text-right">Thành tiền phòng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stays.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 px-4 text-center text-slate-500 italic">
                          Chưa có thông tin lượt nhận phòng (Stay). Tiền phòng được dự tính theo đặt phòng: {fmtMoney(summary.roomSubtotal)}
                        </td>
                      </tr>
                    ) : (
                      stays.map((st, i) => (
                        <tr key={st.stayId || i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700 text-sm">
                            {st.roomNumber}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {st.roomTypeName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {fmtDateTime(st.checkIn)} → {fmtDateTime(st.checkOut)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {st.nights}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-slate-700">
                            {fmtMoney(st.pricePerNight)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-slate-600 text-[11px]">
                            {st.earlyCheckInFee || st.lateCheckOutFee
                              ? `+${fmtMoney((st.earlyCheckInFee || 0) + (st.lateCheckOutFee || 0))}`
                              : '0 ₫'}
                          </td>
                          <td className="py-3 px-4 font-mono text-right font-bold text-slate-900 text-sm">
                            {fmtMoney(st.roomTotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 2: TIÊU DÙNG MINIBAR */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">kitchen</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Tiêu Dùng Minibar Trong Phòng ({minibar.length} món)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-emerald-800">
                  {fmtMoney(summary.minibarSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Tên sản phẩm minibar</th>
                      <th className="py-3 px-4 text-center">Số lượng tiêu dùng</th>
                      <th className="py-3 px-4 text-right">Đơn giá niêm yết</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 text-right">Thời điểm ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {minibar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 px-4 text-center text-slate-400 italic">
                          Không phát sinh tiêu dùng minibar trong suốt kỳ lưu trú
                        </td>
                      </tr>
                    ) : (
                      minibar.map((mb, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{mb.item}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{mb.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(mb.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(mb.total)}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(mb.consumedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 3: DỊCH VỤ PHÒNG (LAUNDRY, SPA, TOUR...) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-lg">room_service</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Dịch Vụ Khách Sạn (Giặt Ủi, Spa, Tour, Room Service) ({services.length} lượt)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-purple-900">
                  {fmtMoney(summary.serviceSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Tên dịch vụ</th>
                      <th className="py-3 px-4">Phân loại</th>
                      <th className="py-3 px-4 text-center">Số lượng</th>
                      <th className="py-3 px-4 text-right">Đơn giá</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thời gian gọi dịch vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 px-4 text-center text-slate-400 italic">
                          Không phát sinh dịch vụ bổ sung
                        </td>
                      </tr>
                    ) : (
                      services.map((sv, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{sv.service}</td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border text-[11px] font-semibold">
                              {sv.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{sv.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(sv.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(sv.total)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(sv.orderedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 4: NHÀ HÀNG & QUẦY BAR (F&B - GHI NỢ PHÒNG) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">restaurant</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    4. Nhà Hàng / Quầy Bar Ghi Nợ Về Phòng ({fnb.length} món)
                  </h3>
                </div>
                <span className="font-mono font-extrabold text-sm text-amber-900">
                  {fmtMoney(summary.foodSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/40">
                      <th className="py-3 px-4">Món ăn / Đồ uống</th>
                      <th className="py-3 px-4 text-center">Số lượng</th>
                      <th className="py-3 px-4 text-right">Đơn giá</th>
                      <th className="py-3 px-4 text-right">Thành tiền</th>
                      <th className="py-3 px-4 font-mono text-center">Mã đơn F&B</th>
                      <th className="py-3 px-4 text-right">Thời gian đặt món</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fnb.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 px-4 text-center text-slate-400 italic">
                          Không có hóa đơn ẩm thực nhà hàng/bar ghi nợ phòng
                        </td>
                      </tr>
                    ) : (
                      fnb.map((fb, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{fb.item}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{fb.quantity}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-700">{fmtMoney(fb.price)}</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">{fmtMoney(fb.total)}</td>
                          <td className="py-2.5 px-4 font-mono text-center text-slate-600 text-[11px]">{fb.orderCode || '—'}</td>
                          <td className="py-2.5 px-4 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(fb.orderedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD QUYẾT TOÁN TÀI CHÍNH TỔNG THỂ (GRAND TOTAL & BALANCE) */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-2xl border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cột trái: Tóm tắt từng khoản */}
                <div className="space-y-3 text-xs border-b md:border-b-0 md:border-r border-slate-700/80 pb-6 md:pb-0 md:pr-8">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-blue-400">calculate</span>
                    <span>Chi tiết cộng dồn các khoản chi phí</span>
                  </h4>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>1. Tiền phòng & phụ thu lưu trú:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.roomSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>2. Tiêu dùng Minibar trong phòng:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.minibarSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>3. Dịch vụ khách sạn (Laundry, Spa...):</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.serviceSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 py-1 border-b border-slate-800">
                    <span>4. Ẩm thực F&B ghi nợ phòng:</span>
                    <span className="font-mono text-sm">{fmtMoney(summary.foodSubtotal)}</span>
                  </div>
                  {summary.surcharge > 0 && (
                    <div className="flex justify-between items-center text-amber-300 py-1 border-b border-slate-800">
                      <span>Phụ phí phát sinh khác:</span>
                      <span className="font-mono text-sm">+{fmtMoney(summary.surcharge)}</span>
                    </div>
                  )}
                  {summary.discount > 0 && (
                    <div className="flex justify-between items-center text-rose-300 py-1 border-b border-slate-800">
                      <span>Giảm giá / Chiết khấu voucher:</span>
                      <span className="font-mono text-sm">-{fmtMoney(summary.discount)}</span>
                    </div>
                  )}
                </div>

                {/* Cột phải: 3 Chỉ Số Quyết Toán Cốt Lõi */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                    <span className="text-xs text-slate-300 font-semibold">TỔNG PHÁT SINH (Grand Total):</span>
                    <span className="text-lg font-bold font-mono text-cyan-300">
                      {fmtMoney(summary.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                    <span className="text-xs text-slate-300 font-semibold">ĐÃ THANH TOÁN / ĐẶT CỌC:</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {fmtMoney(summary.totalPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider block text-slate-100">
                        SỐ TIỀN CÒN PHẢI THU:
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {summary.remainingBalance > 0 ? 'Thu ngân cần thu thêm từ khách' : 'Đã thanh toán đủ toàn bộ'}
                      </span>
                    </div>
                    <span
                      className={`text-2xl font-black font-mono ${
                        summary.remainingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {fmtMoney(summary.remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
