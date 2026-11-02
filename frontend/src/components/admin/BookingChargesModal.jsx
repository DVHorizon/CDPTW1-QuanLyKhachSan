import React, { useState, useEffect } from 'react';
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

export default function BookingChargesModal({ bookingId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCharges = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getBookingCharges(bookingId);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Không thể tải bảng kê chi phí lưu trú.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchCharges();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{ backgroundColor: '#1E293B' }}
          className="px-6 py-4 flex items-center justify-between text-white flex-shrink-0 border-b border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Bảng Kê Chi Phí Lưu Trú (Master Folio)
                </h3>
                {data?.estimated && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                    Tạm tính (Chưa check-in)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Booking ID: <strong className="text-slate-200 font-mono">#{bookingId}</strong>
                {data?.guestName ? ` • Khách hàng: ${data.guestName}` : ''}
                {data?.roomNumber ? ` • Phòng: ${data.roomNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCharges}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Tải lại số liệu"
            >
              <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="In bảng kê"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>In Bảng Kê</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 ml-1"
              title="Đóng modal"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Cảnh báo dịch vụ chưa hoàn tất */}
        {data?.hasPendingServices && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 flex-shrink-0 animate-in fade-in">
            <span className="material-symbols-outlined text-amber-600 text-lg flex-shrink-0">
              warning
            </span>
            <span className="leading-snug">
              <strong>Lưu ý:</strong> Booking này vẫn còn dịch vụ đang trong trạng thái tiếp nhận hoặc đang thực hiện (chưa hoàn thành). Chi phí các dịch vụ đó chưa được tính vào tổng thanh toán.
            </span>
          </div>
        )}

        {/* Nội dung chi tiết */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Đang tự động gom chi phí từ các phân hệ...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-200">
                <span className="material-symbols-outlined text-3xl">error</span>
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">Không thể gom chi phí</h4>
              <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchCharges}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : !data ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Chưa có dữ liệu chi phí.
            </div>
          ) : (
            <>
              {/* Thẻ tóm tắt thông tin thời gian lưu trú */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Khách đại diện:</span>
                  <strong className="font-semibold text-slate-900 text-sm">{data.guestName || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Phòng lưu trú:</span>
                  <strong className="font-mono font-bold text-blue-700 text-sm">{data.roomNumber || 'Chưa gán'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Ngày nhận (Check-in):</span>
                  <span className="font-mono text-slate-800 font-medium">{fmtDate(data.checkInDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ngày trả (Check-out):</span>
                  <span className="font-mono text-slate-800 font-medium">{fmtDate(data.checkOutDate)}</span>
                </div>
              </div>

              {/* 1. MỤC TIỀN PHÒNG & LƯU TRÚ (ROOM CHARGES) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-base">hotel</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Tiền Phòng & Lưu Trú ({stays.length} lượt ở)
                    </h4>
                  </div>
                  <span className="font-mono font-bold text-xs text-blue-900">
                    {fmtMoney(summary.roomSubtotal)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2 px-3">Phòng</th>
                        <th className="py-2 px-3">Loại phòng</th>
                        <th className="py-2 px-3">Thời gian ở</th>
                        <th className="py-2 px-3 text-center">Số đêm</th>
                        <th className="py-2 px-3 text-right">Đơn giá/đêm</th>
                        <th className="py-2 px-3 text-right">Phụ thu (Sớm/Trễ)</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stays.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-3 px-3 text-center text-slate-500 italic">
                            Chưa có thông tin nhận phòng (Stay). Tiền phòng được dự tính dựa trên đặt phòng: {fmtMoney(summary.roomSubtotal)}
                          </td>
                        </tr>
                      ) : (
                        stays.map((st, i) => (
                          <tr key={st.stayId || i} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                              {st.roomNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {st.roomTypeName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {fmtDateTime(st.checkIn)} → {fmtDateTime(st.checkOut)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">
                              {st.nights}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-700">
                              {fmtMoney(st.pricePerNight)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-slate-600 text-[11px]">
                              {st.earlyCheckInFee || st.lateCheckOutFee
                                ? `+${fmtMoney((st.earlyCheckInFee || 0) + (st.lateCheckOutFee || 0))}`
                                : '0 ₫'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                              {fmtMoney(st.roomTotal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. MỤC TIÊU DÙNG MINIBAR */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">kitchen</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Tiêu Dùng Minibar ({minibar.length} món)
                    </h4>
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-800">
                    {fmtMoney(summary.minibarSubtotal)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2 px-3">Tên món đồ</th>
                        <th className="py-2 px-3 text-center">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                        <th className="py-2 px-3 text-right">Thời điểm dùng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {minibar.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-3 px-3 text-center text-slate-400 italic">
                            Không phát sinh tiêu dùng minibar
                          </td>
                        </tr>
                      ) : (
                        minibar.map((mb, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-medium text-slate-800">{mb.item}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold">{mb.quantity}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-700">{fmtMoney(mb.price)}</td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">{fmtMoney(mb.total)}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(mb.consumedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. MỤC DỊCH VỤ PHÒNG (LAUNDRY, SPA, TOUR, ROOM SERVICE) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-base">room_service</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3. Dịch Vụ Khách Sạn (Giặt ủi, Spa, Tour...) ({services.length} lượt)
                    </h4>
                  </div>
                  <span className="font-mono font-bold text-xs text-purple-900">
                    {fmtMoney(summary.serviceSubtotal)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2 px-3">Tên dịch vụ</th>
                        <th className="py-2 px-3">Phân loại</th>
                        <th className="py-2 px-3 text-center">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                        <th className="py-2 px-3 text-center">Trạng thái</th>
                        <th className="py-2 px-3 text-right">Thời gian gọi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {services.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-3 px-3 text-center text-slate-400 italic">
                            Không phát sinh dịch vụ bổ sung
                          </td>
                        </tr>
                      ) : (
                        services.map((sv, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-medium text-slate-800">{sv.service}</td>
                            <td className="py-2 px-3 text-slate-600">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-semibold">
                                {sv.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold">{sv.quantity}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-700">{fmtMoney(sv.price)}</td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">{fmtMoney(sv.total)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {sv.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(sv.orderedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. MỤC ẨM THỰC NHÀ HÀNG & BAR (F&B - ROOM INVOICE) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-base">restaurant</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      4. Nhà Hàng / Quầy Bar Ghi Nợ Phòng ({fnb.length} món)
                    </h4>
                  </div>
                  <span className="font-mono font-bold text-xs text-amber-900">
                    {fmtMoney(summary.foodSubtotal)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                        <th className="py-2 px-3">Món ăn / Đồ uống</th>
                        <th className="py-2 px-3 text-center">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                        <th className="py-2 px-3 font-mono text-center">Mã đơn F&B</th>
                        <th className="py-2 px-3 text-right">Thời gian đặt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fnb.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-3 px-3 text-center text-slate-400 italic">
                            Không có hóa đơn nhà hàng/bar ghi nợ phòng
                          </td>
                        </tr>
                      ) : (
                        fnb.map((fb, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-medium text-slate-800">{fb.item}</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold">{fb.quantity}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-700">{fmtMoney(fb.price)}</td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">{fmtMoney(fb.total)}</td>
                            <td className="py-2 px-3 font-mono text-center text-slate-600 text-[11px]">{fb.orderCode || '—'}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-500 text-[11px]">{fmtDateTime(fb.orderedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KHỐI TỔNG KẾT TÀI CHÍNH & QUYẾT TOÁN (GRAND TOTAL & BALANCE) */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xl border border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cột trái: Chi tiết từng nhóm phí */}
                  <div className="space-y-2 text-xs border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-6">
                    <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">calculate</span>
                      Chi tiết cộng dồn các khoản phí
                    </h5>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Tiền phòng & phụ thu:</span>
                      <span className="font-mono">{fmtMoney(summary.roomSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Tiêu dùng Minibar:</span>
                      <span className="font-mono">{fmtMoney(summary.minibarSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Dịch vụ phát sinh (Laundry/Spa...):</span>
                      <span className="font-mono">{fmtMoney(summary.serviceSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Ẩm thực F&B ghi nợ phòng:</span>
                      <span className="font-mono">{fmtMoney(summary.foodSubtotal)}</span>
                    </div>
                    {summary.surcharge > 0 && (
                      <div className="flex justify-between items-center text-amber-300">
                        <span>Phụ phí khác:</span>
                        <span className="font-mono">+{fmtMoney(summary.surcharge)}</span>
                      </div>
                    )}
                    {summary.discount > 0 && (
                      <div className="flex justify-between items-center text-rose-300">
                        <span>Giảm giá / Ưu đãi:</span>
                        <span className="font-mono">-{fmtMoney(summary.discount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Cột phải: 3 Số Liệu Cốt Lõi */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                      <span className="text-xs text-slate-300 font-medium">TỔNG PHÁT SINH (Grand Total):</span>
                      <span className="text-base font-bold font-mono text-cyan-300">
                        {fmtMoney(summary.grandTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                      <span className="text-xs text-slate-300 font-medium">ĐÃ THANH TOÁN / ĐẶT CỌC:</span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        {fmtMoney(summary.totalPaid)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider block text-slate-200">
                          SỐ TIỀN CÒN PHẢI THU:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {summary.remainingBalance > 0 ? 'Cần thu thêm từ khách' : 'Đã thanh toán đủ'}
                        </span>
                      </div>
                      <span
                        className={`text-xl font-extrabold font-mono ${
                          summary.remainingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {fmtMoney(summary.remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-slate-400">info</span>
            <span>Bảng kê được gom tự động theo thời gian thực từ API `FEAT-INVOICE-01`.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-sm cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
