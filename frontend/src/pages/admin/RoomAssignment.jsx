import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/layout/AdminLayout';

// Hỗ trợ cả kết nối trực tiếp cổng 5000 và qua Proxy /api của Vite
const API_ENDPOINTS = [
  'http://localhost:5000/api/v1/allocation',
  '/api/v1/allocation',
];

// Hàm gọi API an toàn, kèm JWT Bearer Token theo chuẩn Spec
async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  const token = localStorage.getItem('hotel_token');
  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
      });

      const text = await res.text();
      if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
        lastErr = new Error('Máy chủ phản hồi trang lỗi HTML thay vì JSON. Đang thử kênh kết nối dự phòng...');
        continue;
      }

      const data = JSON.parse(text);
      return { status: res.status, ok: res.ok, data };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Không thể kết nối đến máy chủ cơ sở dữ liệu backend.');
}

// ─── Tiện ích định dạng ─────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const fmtDateMonth = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

// ─── Toast Thông Báo ────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-md text-sm pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2 ${
          t.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/50'
            : t.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
            : t.type === 'warn'
            ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/50'
            : 'bg-sky-950/95 border-sky-500/50 text-sky-100 shadow-sky-950/50'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
          {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : t.type === 'warn' ? 'warning' : 'info'}
        </span>
        <div className="flex-1">
          {t.title && <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">{t.title}</p>}
          <p className="font-normal text-xs leading-relaxed">{t.message}</p>
        </div>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-white/60 hover:text-white transition-colors cursor-pointer ml-2"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    ))}
  </div>
);

// ─── Modal Cảnh Báo Xung Đột Concurrency (Người này sửa người kia xóa) ───────
const ConcurrencyConflictModal = ({ conflictData, onReload }) => {
  if (!conflictData || !conflictData.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-high border-2 border-rose-500/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-on-surface relative space-y-5 animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-2xl animate-pulse">sync_problem</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-300">Phát Hiện Xung Đột Dữ Liệu Đồng Thời</h3>
            <p className="text-xs text-on-surface-variant">Hệ thống đồng bộ dữ liệu Grand Horizon</p>
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-100 space-y-2">
          <p className="font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-rose-400">warning</span>
            {conflictData.message || 'Dữ liệu đặt phòng đã bị xóa hoặc thay đổi bởi người dùng khác trong cơ sở dữ liệu.'}
          </p>
          <p className="text-xs text-rose-200/80">
            Để đảm bảo tính toàn vẹn và tránh sai lệch thông tin phòng, thao tác hiện tại đã tạm dừng. Vui lòng nhấn nút bên dưới để tải lại trang và nhận dữ liệu mới nhất.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onReload}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/50 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Tải Lại Trang Ngay
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal In & Xem Trước Phiếu Gán Phòng (Chuyên Nghiệp Cho Cả Xem Trước & In Ra) ───
const PrintVoucherModal = ({ booking, room, onClose }) => {
  if (!booking) return null;

  const assignedRoomNum = room ? room.RoomNumber : booking.AssignedRoomNumber || 'Chưa Gán';
  const assignedRoomType = room ? room.RoomTypeName : booking.RoomTypeName;
  const assignedFloor = room ? room.Floor : booking.AssignedFloor || '—';
  const nowStr = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Hàm in phiếu trực tiếp ra cửa sổ in chuyên nghiệp (Chỉ in duy nhất phiếu này)
  const handlePrintDirectly = () => {
    const voucherElement = document.getElementById('printable-voucher-sheet');
    if (!voucherElement) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Phieu_Gan_Phong_${booking.ConfirmationCode}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif, system-ui;
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .voucher-container {
              width: 100%;
              max-width: 820px;
              margin: 0 auto;
              padding: 16px;
              border: 2px solid #0f172a;
              background: #ffffff;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .title-block {
              text-align: center;
              margin-bottom: 16px;
            }
            .title-main {
              font-size: 19px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0;
              color: #0f172a;
            }
            .title-sub {
              font-size: 11px;
              font-style: italic;
              color: #475569;
              margin-top: 3px;
            }
            .info-grid {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .info-grid td, .info-grid th {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 13px;
            }
            .info-grid th {
              background-color: #f1f5f9 !important;
              color: #0f172a;
              font-weight: bold;
              text-align: left;
            }
            .room-highlight-box {
              background-color: #ecfdf5 !important;
              border: 2px solid #059669;
              padding: 8px 12px;
              text-align: center;
              border-radius: 6px;
            }
            .room-number-text {
              font-size: 22px;
              font-weight: 900;
              color: #047857;
              letter-spacing: 1px;
            }
            .finance-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              margin-bottom: 14px;
            }
            .finance-table td, .finance-table th {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              font-size: 13px;
            }
            .finance-table th {
              background-color: #f8fafc !important;
              font-weight: 600;
            }
            .balance-due-row {
              background-color: #fff1f2 !important;
              font-weight: bold;
              font-size: 14px;
              color: #e11d48;
            }
            .policy-box {
              font-size: 11px;
              color: #475569;
              border: 1px dashed #94a3b8;
              padding: 8px 12px;
              border-radius: 4px;
              margin-bottom: 20px;
              line-height: 1.5;
            }
            .signatures-table {
              width: 100%;
              margin-top: 20px;
            }
            .signatures-table td {
              width: 50%;
              text-align: center;
              vertical-align: top;
              font-size: 13px;
            }
            .signature-space {
              height: 70px;
            }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            ${voucherElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Vùng Modal Chứa Chế Độ Xem Trước & Nút Thao Tác */}
      <div className="bg-surface-container rounded-3xl border border-outline-variant/40 max-w-4xl w-full my-auto flex flex-col max-h-[94vh] shadow-2xl overflow-hidden">
        {/* Header Thanh Công Cụ Xem Trước */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-on-surface">Xem Trước Phiếu Điều Phối & Gán Phòng</h3>
              <p className="text-xs text-on-surface-variant">Chế độ hiển thị xem trước trang in khổ A4 tiêu chuẩn khách sạn</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDirectly}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs shadow-lg shadow-admin-primary/30 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">print</span>
              In Phiếu Ngay
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:text-white hover:bg-surface-container-highest transition-colors cursor-pointer"
              title="Đóng bản xem trước"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Nội Dung Bản Xem Trước (Tờ Giấy A4 Trắng Tinh Chuẩn In Ấn) */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-900/80 flex justify-center">
          <div
            id="printable-voucher-sheet"
            className="bg-white text-slate-900 w-full max-w-[780px] p-6 sm:p-10 rounded-xl shadow-2xl border border-slate-300 font-sans relative"
          >
            {/* 1. Header Khách Sạn */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-600 font-bold text-sm tracking-widest">★★★★★</span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RESORT & LUXURY SUITES</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider uppercase font-serif">
                  GRAND HORIZON HOTELS
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Địa chỉ: 01 Võ Nguyên Giáp, P. Phước Mỹ, Q. Sơn Trà, TP. Đà Nẵng, Việt Nam
                </p>
                <p className="text-xs text-slate-600">
                  Hotline: <strong>1900 6868</strong> • Email: reservations@grandhorizon.vn
                </p>
              </div>

              {/* Mã vạch & QR Code giả lập */}
              <div className="text-right flex flex-col items-end sm:items-end">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">MÃ ĐẶT PHÒNG HỆ THỐNG</span>
                <span className="font-mono text-base font-black text-slate-900 bg-slate-100 border border-slate-300 px-3 py-1 rounded-md mt-1 inline-block">
                  {booking.ConfirmationCode}
                </span>
                <div className="mt-2 text-[10px] font-mono text-slate-500">
                  IN LÚC: {nowStr}
                </div>
              </div>
            </div>

            {/* 2. Tiêu Đề Phiếu */}
            <div className="text-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900 font-serif">
                PHIẾU ĐIỀU PHỐI GÁN PHÒNG & XÁC NHẬN LƯU TRÚ
              </h2>
              <p className="text-xs text-slate-500 italic mt-0.5">
                (ROOM ALLOCATION & GUEST REGISTRATION CARD)
              </p>
            </div>

            {/* 3. Ô Nổi Bật Số Phòng Gán Được Đồng Bộ CSDL */}
            <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  SỐ PHÒNG GÁN CỤ THỂ (ASSIGNED ROOM UNIT)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-wide mt-0.5 font-mono">
                  PHÒNG {assignedRoomNum}
                </div>
                <span className="text-xs text-emerald-800 font-medium">
                  {assignedRoomType} • Tầng {assignedFloor} • Tháp Grand Tower
                </span>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white inline-block">
                  ĐÃ XÁC NHẬN ĐIỀU PHỐI
                </span>
                <p className="text-[11px] text-emerald-800 mt-1">Đồng bộ cơ sở dữ liệu thời gian thực</p>
              </div>
            </div>

            {/* 4. Bảng Thông Tin Khách Hàng */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-2.5">
                1. THÔNG TIN KHÁCH HÀNG (GUEST INFORMATION)
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/4 bg-slate-50 p-2 font-semibold text-slate-700">Họ và tên khách:</td>
                    <td className="w-1/4 p-2 font-bold text-slate-900">{booking.GuestName}</td>
                    <td className="w-1/4 bg-slate-50 p-2 font-semibold text-slate-700">Hạng hội viên:</td>
                    <td className="w-1/4 p-2 font-bold text-amber-700">{booking.VipTier || 'TIÊU CHUẨN'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">Số điện thoại:</td>
                    <td className="p-2 text-slate-800">{booking.GuestPhone || '---'}</td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">Email:</td>
                    <td className="p-2 text-slate-800">{booking.GuestEmail || '---'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">CCCD / Hộ chiếu:</td>
                    <td className="p-2 font-mono text-slate-900">{booking.NationalId || 'ID-VERIFIED'}</td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">Số lượng khách:</td>
                    <td className="p-2 text-slate-800">
                      <strong>{booking.Adults || 1}</strong> Người lớn, <strong>{booking.Children || 0}</strong> Trẻ em
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. Bảng Thông Số Lưu Trú */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-2.5">
                2. THỜI GIAN VÀ ĐẶC TÍNH LƯU TRÚ (STAY SPECIFICATIONS)
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/4 bg-slate-50 p-2 font-semibold text-slate-700">Ngày nhận phòng:</td>
                    <td className="w-1/4 p-2 font-bold text-slate-900">
                      {fmtDateMonth(booking.CheckInDate)} <span className="text-[10px] text-slate-500 font-normal">(Từ 14:00)</span>
                    </td>
                    <td className="w-1/4 bg-slate-50 p-2 font-semibold text-slate-700">Ngày trả phòng:</td>
                    <td className="w-1/4 p-2 font-bold text-slate-900">
                      {fmtDateMonth(booking.CheckOutDate)} <span className="text-[10px] text-slate-500 font-normal">(Trước 12:00)</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">Số đêm lưu trú:</td>
                    <td className="p-2 font-bold text-slate-900">{booking.NumberOfNights} đêm</td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-700">Nguồn đặt phòng:</td>
                    <td className="p-2 text-slate-800">{booking.BookingSource || 'WalkIn'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. Bảng Kê Dự Toán Tài Chính */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-2.5">
                3. CHI TIẾT TÀI CHÍNH DỰ TOÁN (FINANCIAL FOLIO BREAKDOWN)
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 text-left">Hạng Mục</th>
                    <th className="p-2 text-center w-24">Số Lượng</th>
                    <th className="p-2 text-right w-36">Đơn Giá / Đêm</th>
                    <th className="p-2 text-right w-36">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2">Tiền phòng ({assignedRoomType})</td>
                    <td className="p-2 text-center">{booking.NumberOfNights} đêm</td>
                    <td className="p-2 text-right">{fmtMoney(booking.baseRate)}</td>
                    <td className="p-2 text-right font-medium">{fmtMoney(Number(booking.baseRate) * Number(booking.NumberOfNights))}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2">Thuế VAT (8%) và Phí dịch vụ (5%)</td>
                    <td className="p-2 text-center">Gói</td>
                    <td className="p-2 text-right">—</td>
                    <td className="p-2 text-right font-medium">{fmtMoney(booking.taxesAndFees)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 font-bold bg-slate-50">
                    <td colSpan="3" className="p-2 text-right">Tổng Dự Toán Hóa Đơn:</td>
                    <td className="p-2 text-right text-slate-900">{fmtMoney(booking.totalFolio)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 text-emerald-700 font-semibold">
                    <td colSpan="3" className="p-2 text-right">Số Tiền Đã Thanh Toán / Đặt Cọc:</td>
                    <td className="p-2 text-right">-{fmtMoney(booking.depositPaid)}</td>
                  </tr>
                  <tr className="bg-rose-50 text-rose-700 font-bold text-sm">
                    <td colSpan="3" className="p-2 text-right uppercase">CÔNG NỢ CẦN THU TẠI QUẦY LỄ TÂN:</td>
                    <td className="p-2 text-right">{fmtMoney(booking.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 7. Quy Định & Chính Sách */}
            <div className="border border-slate-300 rounded-lg p-3 text-[11px] text-slate-600 mb-6 space-y-1 bg-slate-50/50">
              <span className="font-bold text-slate-800 uppercase block">Quy định & Chính sách lưu trú:</span>
              <p>• Thời gian nhận phòng tiêu chuẩn từ 14:00, trả phòng trước 12:00 trưa. Trả phòng trễ phụ thu theo biểu phí khách sạn.</p>
              <p>• Khách sạn áp dụng chính sách 100% không hút thuốc lá trong tất cả các phòng nghỉ.</p>
              <p>• Vui lòng bảo quản tài sản có giá trị trong két sắt an toàn tại phòng hoặc gửi quầy lễ tân.</p>
            </div>

            {/* 8. Phần Chữ Ký Xác Nhận */}
            <div className="grid grid-cols-2 gap-8 text-center pt-2">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase block">ĐẠI DIỆN LỄ TÂN KHÁCH SẠN</span>
                <span className="text-[10px] text-slate-500 italic block">(Ký và ghi rõ họ tên)</span>
                <div className="h-16"></div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-xs text-slate-700 font-medium">
                  Nhân viên ca trực PMS
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 uppercase block">KHÁCH HÀNG XÁC NHẬN</span>
                <span className="text-[10px] text-slate-500 italic block">(Ký xác nhận thông tin lưu trú)</span>
                <div className="h-16"></div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-xs text-slate-900 font-bold">
                  {booking.GuestName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Trang Chính: RoomAssignment ────────────────────────────────────────────
export default function RoomAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Kiểm tra quyền hạn vai trò (RBAC)
  const isUnauthorized = user && user.role && !['Admin', 'Manager', 'Staff', 'Receptionist'].includes(user.role);

  // Lấy bookingId đang active
  const activeBookingId = params.bookingId || searchParams.get('bookingId') || '';

  // Danh sách các booking cần gán phòng
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(activeBookingId);
  const [searchBookingQuery, setSearchBookingQuery] = useState('');

  // Chi tiết booking đang xử lý
  const [bookingDossier, setBookingDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Bộ lọc phòng gợi ý
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterHK, setFilterHK] = useState('clean');
  const [filterView, setFilterView] = useState('all');
  const [searchRoomQuery, setSearchRoomQuery] = useState('');

  // Yêu cầu đặc biệt checklist
  const [activeRequests, setActiveRequests] = useState({
    req_high_floor: true,
    req_quiet: true,
    req_nonsmoking: true,
    req_allergy: false,
    req_ocean: true,
  });

  // Danh sách phòng gợi ý & Gán phòng theo Spec FEAT-ROOMALLOC-01
  const [recommendedRooms, setRecommendedRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [allocationNote, setAllocationNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);
  const [isComboAllocating, setIsComboAllocating] = useState(false);
  const [isDeallocating, setIsDeallocating] = useState(false);

  // Sơ đồ mặt bằng CAD theo tầng
  const [cadRooms, setCadRooms] = useState([]);
  const [cadFloor, setCadFloor] = useState(8);
  const [loadingCad, setLoadingCad] = useState(false);

  // Lock Lease & Giữ tạm 15 phút
  const [heldRoom, setHeldRoom] = useState(null);
  const [holdToken, setHoldToken] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const [isHoldExpired, setIsHoldExpired] = useState(false);

  // Switches điều phối
  const [sendSmsEmail, setSendSmsEmail] = useState(true);
  const [notifyHousekeeping, setNotifyHousekeeping] = useState(true);
  const [preProgramKeycard, setPreProgramKeycard] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Hệ thống Toast
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, message, title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Xung đột Concurrency (Người này sửa người kia xóa)
  const [concurrencyConflict, setConcurrencyConflict] = useState({
    isOpen: false,
    message: '',
  });

  // Đồng hồ thời gian thực PMS
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const p = (n) => String(n).padStart(2, '0');
      setCurrentTimeStr(`${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Đếm ngược 15 phút Lease
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsHoldExpired(true);
        setHeldRoom(null);
        addToast('warn', 'Thời gian giữ phòng tạm (15 phút) đã hết hạn. Vui lòng chọn lại!', 'HẾT HẠN GIỮ PHÒNG');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, addToast]);

  // ─── 1. Tải danh sách bookings cần gán phòng từ CSDL ──────────────────────
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      const { data } = await safeFetchJson('/bookings');
      if (data.success && Array.isArray(data.data)) {
        setBookingsList(data.data);
        if (!selectedBookingId && data.data.length > 0) {
          setSelectedBookingId(String(data.data[0].BookingId));
        }
      } else {
        addToast('error', data.message || 'Không thể tải danh sách đặt phòng', 'LỖI HỆ THỐNG');
      }
    } catch (err) {
      console.error('Fetch bookings error:', err);
      addToast('error', 'Lỗi kết nối cơ sở dữ liệu: ' + err.message, 'LỖI KẾT NỐI');
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedBookingId, addToast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ─── 2. Tải chi tiết booking đang chọn từ CSDL ────────────────────────────
  const fetchBookingDossier = useCallback(async (bId) => {
    if (!bId) {
      setBookingDossier(null);
      return;
    }
    try {
      setLoadingDossier(true);
      const { status, data } = await safeFetchJson(`/booking/${bId}`);

      if (status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Đặt phòng này đã bị xóa hoặc không còn tồn tại trong cơ sở dữ liệu.',
        });
        return;
      }

      if (data.success && data.data) {
        setBookingDossier(data.data);
        if (data.data.AssignedFloor) {
          setCadFloor(Number(data.data.AssignedFloor) || 8);
        }
        const initialRoomIds = Array.isArray(data.data.roomIds) && data.data.roomIds.length
          ? data.data.roomIds
          : (data.data.AssignedRoomId ? [data.data.AssignedRoomId] : []);
        setSelectedRoomIds(initialRoomIds);
        if (initialRoomIds.length > 0) {
          setSelectedRoomId(initialRoomIds[0]);
        }
        if (data.data.allocationNote || data.data.Note) {
          setAllocationNote(data.data.allocationNote || data.data.Note || '');
        }
        setFieldError('');
      } else {
        addToast('error', data.message || 'Không tìm thấy hồ sơ đặt phòng', 'LỖI DỮ LIỆU');
      }
    } catch (err) {
      console.error('Fetch booking dossier error:', err);
      addToast('error', 'Không thể kết nối máy chủ để tải hồ sơ đặt phòng: ' + err.message, 'LỖI KẾT NỐI');
    } finally {
      setLoadingDossier(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedBookingId) {
      fetchBookingDossier(selectedBookingId);
      setHeldRoom(null);
      setHoldExpiresAt(null);
      setIsHoldExpired(false);
    }
  }, [selectedBookingId, fetchBookingDossier]);

  // ─── 3. Tải danh sách phòng gợi ý từ CSDL ──────────────────────────────────
  const fetchRecommendedRooms = useCallback(async () => {
    if (!selectedBookingId) return;
    try {
      setLoadingRooms(true);
      const q = new URLSearchParams({
        bookingId: selectedBookingId,
        roomTypeId: bookingDossier?.RoomTypeId || '',
        targetFloor: filterFloor,
        hkStatus: filterHK,
        viewAspect: filterView,
        search: searchRoomQuery,
      });

      const { data } = await safeFetchJson(`/recommended-rooms?${q.toString()}`);

      if (data.success && Array.isArray(data.data)) {
        setRecommendedRooms(data.data);
        if (!selectedRoomId && data.data.length > 0) {
          setSelectedRoomId(data.data[0].RoomId);
        }
      } else {
        addToast('error', data.message || 'Không có phòng phù hợp', 'THÔNG BÁO');
      }
    } catch (err) {
      console.error('Fetch recommended rooms error:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedBookingId, bookingDossier, filterFloor, filterHK, filterView, searchRoomQuery, selectedRoomId, addToast]);

  useEffect(() => {
    fetchRecommendedRooms();
  }, [fetchRecommendedRooms]);

  // ─── 4. Tải sơ đồ CAD mặt bằng từ CSDL ────────────────────────────────────
  const fetchCadFloorSchematic = useCallback(async (floorNum) => {
    try {
      setLoadingCad(true);
      const { data } = await safeFetchJson(`/floor-schematic?floor=${floorNum}`);
      if (data.success && Array.isArray(data.data)) {
        setCadRooms(data.data);
      }
    } catch (err) {
      console.error('Fetch CAD schematic error:', err);
    } finally {
      setLoadingCad(false);
    }
  }, []);

  useEffect(() => {
    fetchCadFloorSchematic(cadFloor);
  }, [cadFloor, fetchCadFloorSchematic]);

  // ─── 5. Heartbeat đồng bộ Concurrency định kỳ ─────────────────────────────
  useEffect(() => {
    if (!selectedBookingId) return;

    const interval = setInterval(async () => {
      try {
        const { status, data } = await safeFetchJson(`/check-sync/${selectedBookingId}`);
        if (status === 404 || data.isRecordDeleted) {
          setConcurrencyConflict({
            isOpen: true,
            message: data.message || 'Đặt phòng này vừa bị xóa hoặc hủy bỏ bởi người dùng khác trong cơ sở dữ liệu!',
          });
        }
      } catch (e) {
        // bỏ qua lỗi gián đoạn mạng tạm thời
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedBookingId]);

  // ─── Phòng đang được chọn ─────────────────────────────────────────────────
  const currentSelectedRoom = useMemo(() => {
    return (
      recommendedRooms.find((r) => r.RoomId === selectedRoomId) ||
      cadRooms.find((r) => r.RoomId === selectedRoomId) ||
      (bookingDossier?.AssignedRoomId ? {
        RoomId: bookingDossier.AssignedRoomId,
        RoomNumber: bookingDossier.AssignedRoomNumber,
        Floor: bookingDossier.AssignedFloor || 8,
        RoomTypeName: bookingDossier.RoomTypeName,
        RoomStatus: 'CleanAvailable',
        ViewAspect: 'HƯỚNG BIỂN TRỰC DIỆN (OCEAN FRONT)',
        AreaSqm: 55,
        BedConfig: '1 Giường King Đôi (200x220)',
        Corner: 'GÓC ĐÔNG NAM (YÊN TĨNH)',
        Wing: 'TÒA B (WING B)',
        MatchPercent: 96,
      } : null)
    );
  }, [recommendedRooms, cadRooms, selectedRoomId, bookingDossier]);

  useEffect(() => {
    if (currentSelectedRoom && currentSelectedRoom.Floor) {
      setCadFloor(Number(currentSelectedRoom.Floor));
    }
  }, [currentSelectedRoom]);

  // Số lượng phòng cần gán theo hồ sơ đặt phòng (Spec FEAT-ROOMALLOC-01)
  const targetQuantity = Number(bookingDossier?.quantity || bookingDossier?.RoomQuantity || 1);

  // ─── Tiện ích chọn / bỏ chọn phòng tương tác (Hỗ trợ gán nhiều phòng) ──────
  const toggleRoomSelection = useCallback((rId) => {
    setFieldError('');
    const idNum = Number(rId);
    setSelectedRoomIds((prev) => {
      if (prev.includes(idNum)) {
        const next = prev.filter((id) => id !== idNum);
        if (selectedRoomId === idNum) {
          setSelectedRoomId(next[0] || null);
        }
        return next;
      }

      if (targetQuantity === 1) {
        setSelectedRoomId(idNum);
        return [idNum];
      }

      if (prev.length < targetQuantity) {
        setSelectedRoomId(idNum);
        return [...prev, idNum];
      }

      addToast(
        'warn',
        `Đã chọn đủ ${targetQuantity} phòng theo yêu cầu đặt phòng. Bỏ bớt phòng cũ nếu muốn chọn phòng khác.`,
        'ĐÃ CHỌN ĐỦ SỐ LƯỢNG'
      );
      return prev;
    });
  }, [targetQuantity, selectedRoomId, addToast]);

  // ─── HÀNH ĐỘNG 1: Tự Động Phân Bổ (Auto-Allocate Best Match) ───────────────
  const handleAutoAllocate = () => {
    if (!recommendedRooms.length) {
      addToast('error', 'Không có phòng phù hợp để gán tự động.', 'BỘ ĐIỀU PHỐI PHÒNG');
      return;
    }
    const chosenRooms = recommendedRooms.slice(0, targetQuantity);
    const chosenIds = chosenRooms.map((r) => r.RoomId);
    setSelectedRoomIds(chosenIds);
    if (chosenRooms[0]) {
      setSelectedRoomId(chosenRooms[0].RoomId);
      setCadFloor(Number(chosenRooms[0].Floor) || 8);
    }
    setFieldError('');
    addToast(
      'success',
      `Đã tự động chọn ${chosenIds.length} phòng có độ phù hợp cao nhất.`,
      'TỰ ĐỘNG ĐIỀU PHỐI'
    );
  };

  // ─── HÀNH ĐỘNG 2: Giữ Phòng Tạm Thời (Hold Reservation 15 Phút) ───────────
  const handleHoldRoom = async () => {
    const targetRoom = selectedRoomId || selectedRoomIds[0];
    if (!targetRoom) {
      addToast('warn', 'Vui lòng chọn một phòng trong danh sách trước khi kích hoạt giữ phòng.', 'CẢNH BÁO');
      return;
    }
    try {
      const { status, data } = await safeFetchJson('/hold', {
        method: 'POST',
        body: JSON.stringify({ roomId: targetRoom, bookingId: selectedBookingId }),
      });

      if (status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Đặt phòng hoặc phòng đã bị xóa bởi người dùng khác.',
        });
        return;
      }

      if (status === 409 || data.isConflict) {
        addToast('error', data.message || 'Phòng vừa được gán hoặc giữ bởi người khác.', 'XUNG ĐỘT PHÒNG');
        fetchRecommendedRooms();
        return;
      }

      if (data.success) {
        setHeldRoom(currentSelectedRoom);
        setHoldToken(data.holdToken);
        setHoldExpiresAt(data.expiresAt);
        setSecondsRemaining(data.expiresInSeconds || 900);
        setIsHoldExpired(false);
        addToast('success', data.message, 'ĐÃ KHÓA GIỮ PHÒNG 15 PHÚT');
      } else {
        addToast('error', data.message, 'LỖI GIỮ PHÒNG');
      }
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    }
  };

  // ─── HÀNH ĐỘNG 3: Hủy Giữ Phòng (Release Hold) ─────────────────────────────
  const handleReleaseHold = async () => {
    const targetRoom = selectedRoomId || selectedRoomIds[0];
    if (targetRoom) {
      await safeFetchJson('/release-hold', {
        method: 'POST',
        body: JSON.stringify({ roomId: targetRoom, bookingId: selectedBookingId }),
      });
    }
    setHeldRoom(null);
    setHoldExpiresAt(null);
    setHoldToken('');
    addToast('info', 'Đã hủy giữ phòng tạm thời.', 'GIẢI PHÓNG PHÒNG');
  };

  // ─── HÀNH ĐỘNG 4: Luồng 4.1 - Xác Nhận Booking Riêng Biệt ─────────────────
  const handleConfirmBookingOnly = async () => {
    if (!selectedBookingId) return;
    try {
      setIsConfirmingBooking(true);
      const { status, data } = await safeFetchJson(`/booking/${selectedBookingId}/confirm`, {
        method: 'PUT',
      });

      if (status === 401 || data.code === 'ERROR_0009_UNAUTHENTICATED') {
        addToast('error', data.message || 'Bạn cần đăng nhập để thực hiện chức năng này', 'CHƯA ĐĂNG NHẬP');
        return;
      }
      if (status === 403 || data.code === 'ERROR_0010_FORBIDDEN') {
        addToast('error', data.message || 'Bạn không có quyền thực hiện chức năng này', 'TỪ CHỐI TRUY CẬP');
        return;
      }
      if (!data.success) {
        addToast('error', data.message || 'Không thể xác nhận booking', data.code || 'LỖI');
        return;
      }

      addToast('success', data.message || 'Xác nhận booking thành công', 'SUCCESS_0005_CONFIRMED');
      await fetchBookingDossier(selectedBookingId);
      await fetchBookings();
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setIsConfirmingBooking(false);
    }
  };

  // ─── HÀNH ĐỘNG 5: Luồng 4.2 - Gán Phòng (POST /api/v1/bookings/:id/room-allocation) ──
  const handleSaveAllocation = async () => {
    if (!selectedBookingId) return;

    if (selectedRoomIds.length !== targetQuantity) {
      const msg = `Vui lòng chọn đúng ${targetQuantity} phòng`;
      setFieldError(msg);
      addToast('error', msg, 'ERROR_0027_ROOM_ALLOCATION_COUNT');
      return;
    }

    try {
      setIsSavingAllocation(true);
      setFieldError('');
      const { status, data } = await safeFetchJson(`/booking/${selectedBookingId}/room-allocation`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: targetQuantity,
          roomIds: selectedRoomIds,
          allocationNote,
        }),
      });

      if (status === 401 || data.code === 'ERROR_0009_UNAUTHENTICATED') {
        addToast('error', data.message || 'Bạn cần đăng nhập để thực hiện chức năng này', 'CHƯA ĐĂNG NHẬP');
        return;
      }
      if (status === 403 || data.code === 'ERROR_0010_FORBIDDEN') {
        addToast('error', data.message || 'Bạn không có quyền thực hiện chức năng này', 'TỪ CHỐI TRUY CẬP');
        return;
      }
      if (!data.success) {
        if (data.code === 'ERROR_0027_ROOM_ALLOCATION_COUNT') {
          setFieldError(data.message);
        }
        addToast('error', data.message || 'Không thể gán phòng', data.code || 'LỖI GÁN PHÒNG');
        await fetchRecommendedRooms();
        return;
      }

      addToast('success', data.message || 'Gán phòng thành công', 'SUCCESS_0006_ROOM_ALLOCATED');
      setHeldRoom(null);
      setHoldExpiresAt(null);
      await fetchBookingDossier(selectedBookingId);
      await fetchBookings();
      await fetchRecommendedRooms();
      await fetchCadFloorSchematic(cadFloor);
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setIsSavingAllocation(false);
    }
  };

  // ─── HÀNH ĐỘNG 6: Luồng 4.3 - Xác Nhận & Gán Phòng Cùng Lúc ───────────────
  const handleConfirmAndAllocateCombo = async () => {
    if (!selectedBookingId) return;

    if (selectedRoomIds.length !== targetQuantity) {
      const msg = `Vui lòng chọn đúng ${targetQuantity} phòng`;
      setFieldError(msg);
      addToast('error', msg, 'ERROR_0027_ROOM_ALLOCATION_COUNT');
      return;
    }

    try {
      setIsComboAllocating(true);
      setFieldError('');
      const { status, data } = await safeFetchJson(`/booking/${selectedBookingId}/confirm-and-allocate`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: targetQuantity,
          roomIds: selectedRoomIds,
          allocationNote,
        }),
      });

      if (status === 401 || data.code === 'ERROR_0009_UNAUTHENTICATED') {
        addToast('error', data.message || 'Bạn cần đăng nhập để thực hiện chức năng này', 'CHƯA ĐĂNG NHẬP');
        return;
      }
      if (status === 403 || data.code === 'ERROR_0010_FORBIDDEN') {
        addToast('error', data.message || 'Bạn không có quyền thực hiện chức năng này', 'TỪ CHỐI TRUY CẬP');
        return;
      }
      if (!data.success) {
        if (data.code === 'ERROR_0027_ROOM_ALLOCATION_COUNT') {
          setFieldError(data.message);
        }
        addToast('error', data.message || 'Không thể xác nhận và gán phòng', data.code || 'LỖI');
        await fetchRecommendedRooms();
        return;
      }

      addToast('success', data.message || 'Xác nhận và gán phòng thành công', 'SUCCESS_0006_ROOM_ALLOCATED');
      setHeldRoom(null);
      setHoldExpiresAt(null);
      await fetchBookingDossier(selectedBookingId);
      await fetchBookings();
      await fetchRecommendedRooms();
      await fetchCadFloorSchematic(cadFloor);
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setIsComboAllocating(false);
    }
  };

  // ─── HÀNH ĐỘNG 7: Luồng 3.5 - Hủy / Bỏ Gán Phòng Trước Check-In ───────────
  const handleDeallocateRooms = async () => {
    if (!selectedBookingId) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy phân bổ phòng cho đặt phòng này không?')) return;

    try {
      setIsDeallocating(true);
      const { status, data } = await safeFetchJson(`/booking/${selectedBookingId}/room-allocation`, {
        method: 'DELETE',
      });

      if (!data.success) {
        addToast('error', data.message || 'Không thể hủy gán phòng', data.code || 'LỖI');
        return;
      }

      addToast('info', data.message || 'Đã hủy gán phòng cho booking thành công.', 'HỦY GÁN PHÒNG');
      setSelectedRoomIds([]);
      await fetchBookingDossier(selectedBookingId);
      await fetchBookings();
      await fetchRecommendedRooms();
      await fetchCadFloorSchematic(cadFloor);
    } catch (err) {
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setIsDeallocating(false);
    }
  };

  // ─── HÀNH ĐỘNG 8: Tương thích Check-in tại quầy trực tiếp ────────────────
  const handleConfirmAllocation = async (proceedToCheckIn = false) => {
    if (!selectedBookingId) return;

    if (proceedToCheckIn) {
      if (selectedRoomIds.length !== targetQuantity) {
        const msg = `Vui lòng chọn đúng ${targetQuantity} phòng trước khi nhận phòng.`;
        setFieldError(msg);
        addToast('error', msg, 'ERROR_0027_ROOM_ALLOCATION_COUNT');
        return;
      }

      try {
        setConfirming(true);
        // 1. Thực hiện gán phòng (hoặc xác nhận & gán phòng nếu Pending)
        if (bookingDossier?.Status === 'Pending') {
          const { data } = await safeFetchJson(`/booking/${selectedBookingId}/confirm-and-allocate`, {
            method: 'POST',
            body: JSON.stringify({
              quantity: targetQuantity,
              roomIds: selectedRoomIds,
              allocationNote,
            }),
          });
          if (!data.success) {
            addToast('error', data.message || 'Không thể xác nhận và gán phòng', data.code || 'LỖI');
            return;
          }
        } else {
          const { data } = await safeFetchJson(`/booking/${selectedBookingId}/room-allocation`, {
            method: 'POST',
            body: JSON.stringify({
              quantity: targetQuantity,
              roomIds: selectedRoomIds,
              allocationNote,
            }),
          });
          if (!data.success) {
            addToast('error', data.message || 'Không thể gán phòng', data.code || 'LỖI');
            return;
          }
        }

        // 2. Chuyển trạng thái sang CheckedIn qua API bookings
        const targetRoomId = selectedRoomIds[0] || selectedRoomId;
        const token = localStorage.getItem('token') || localStorage.getItem('hotel_token');
        const checkInRes = await fetch(`http://localhost:5000/api/bookings/${selectedBookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: 'CheckedIn',
            roomId: targetRoomId,
          }),
        });
        const checkInData = await checkInRes.json();

        if (checkInData.success) {
          addToast('success', 'Đã gán phòng và hoàn tất thủ tục nhận phòng (Check-in) thành công!', 'NHẬN PHÒNG THÀNH CÔNG');
        } else {
          addToast('warn', 'Gán phòng thành công. Trạng thái Check-in: ' + (checkInData.message || 'Chờ hoàn tất'), 'THÔNG BÁO');
        }

        setHeldRoom(null);
        setHoldExpiresAt(null);
        await fetchBookingDossier(selectedBookingId);
        await fetchBookings();
        await fetchRecommendedRooms();
        await fetchCadFloorSchematic(cadFloor);
      } catch (err) {
        addToast('error', 'Lỗi kết nối khi nhận phòng: ' + err.message, 'LỖI');
      } finally {
        setConfirming(false);
      }
      return;
    }

    await handleSaveAllocation();
  };

  // ─── Bộ lọc danh sách booking nhanh ───────────────────────────────────────
  const filteredBookingsList = useMemo(() => {
    if (!searchBookingQuery.trim()) return bookingsList;
    const q = searchBookingQuery.toLowerCase().trim();
    return bookingsList.filter(
      (b) =>
        (b.ConfirmationCode && b.ConfirmationCode.toLowerCase().includes(q)) ||
        (b.GuestName && b.GuestName.toLowerCase().includes(q)) ||
        (b.AssignedRoomNumber && b.AssignedRoomNumber.toLowerCase().includes(q))
    );
  }, [bookingsList, searchBookingQuery]);

  // ─── Format thời gian đếm ngược Lease ─────────────────────────────────────
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Kiểm tra quyền truy cập RBAC
  if (isUnauthorized) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-rose-400">Bạn không có quyền truy cập chức năng này</h2>
          <p className="text-sm text-on-surface-variant max-w-md">
            Chức năng Điều phối & Gán Phòng chỉ dành cho Quản Trị Viên, Lễ Tân và Quản Lý buồng phòng.
          </p>
          <Link
            to="/admin/bookings"
            className="px-5 py-2.5 rounded-xl bg-admin-primary text-on-primary font-medium text-xs hover:bg-admin-primary/90 transition-all"
          >
            Quay lại Danh Sách Đặt Phòng
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Tiêu Đề & Thanh Điều Hướng ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Link to="/admin/bookings" className="hover:text-admin-primary transition-colors">
                Quản Lý Đặt Phòng
              </Link>
              <span>/</span>
              <span className="text-admin-primary font-medium">Điều Phối & Gán Số Phòng</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-2xl">meeting_room</span>
                Xác Nhận & Gán Số Phòng Cụ Thể
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-admin-primary/15 text-admin-primary border border-admin-primary/30">
                HỆ THỐNG PMS GRAND HORIZON
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Dữ liệu đồng bộ trực tiếp cơ sở dữ liệu MySQL, khớp phòng tự động và khóa bảo vệ 15 phút.
            </p>
          </div>

          {/* Đồng Hồ & Công Suất Phòng */}
          <div className="flex items-center gap-3">
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 flex items-center gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">{currentTimeStr}</span>
              </div>
              <div className="h-4 w-[1px] bg-outline-variant/30"></div>
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant block uppercase leading-none">Công Suất Phòng</span>
                <span className="text-xs font-bold text-on-surface">84.5%</span>
              </div>
            </div>

            <button
              onClick={() => {
                fetchBookings();
                if (selectedBookingId) fetchBookingDossier(selectedBookingId);
                fetchRecommendedRooms();
                addToast('info', 'Đã nạp lại dữ liệu mới nhất từ cơ sở dữ liệu.', 'LÀM MỚI');
              }}
              className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer shadow-sm"
              title="Tải lại dữ liệu từ máy chủ"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </div>

        {/* ─── 1. BỘ CHỌN ĐẶT PHÒNG CẦN GÁN ─────────────────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">assignment_ind</span>
              <h2 className="text-sm font-bold text-on-surface">
                Danh Sách Đặt Phòng Cần Gán Phòng ({bookingsList.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-2.5 text-base pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm mã booking, tên khách..."
                  value={searchBookingQuery}
                  onChange={(e) => setSearchBookingQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-admin-primary"
                />
              </div>
            </div>
          </div>

          {/* Băng Chuyền Đặt Phòng */}
          {loadingBookings ? (
            <div className="flex items-center justify-center p-6 text-xs text-on-surface-variant gap-2">
              <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
              Đang tải danh sách đặt phòng từ cơ sở dữ liệu...
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {filteredBookingsList.slice(0, 15).map((b) => {
                const isSelected = String(b.BookingId) === String(selectedBookingId);
                const hasAssigned = Boolean(b.AssignedRoomNumber);
                return (
                  <button
                    key={b.BookingId}
                    onClick={() => {
                      setSelectedBookingId(String(b.BookingId));
                      setSearchParams({ bookingId: b.BookingId });
                    }}
                    className={`flex-shrink-0 text-left w-64 p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-admin-primary/10 border-admin-primary shadow-md shadow-admin-primary/10 ring-1 ring-admin-primary'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-on-surface">{b.ConfirmationCode}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          hasAssigned
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {hasAssigned ? `Phòng ${b.AssignedRoomNumber}` : 'Chưa gán'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface truncate mb-0.5">{b.GuestName}</div>
                    <div className="text-[11px] text-on-surface-variant flex items-center justify-between">
                      <span>{b.RoomTypeName}</span>
                      <span className="text-amber-300 font-medium">{b.VipTier}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 2. THANH CÔNG CỤ ĐIỀU PHỐI (ALLOCATION ENGINE TOOLBAR) ─────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary">
              <span className="material-symbols-outlined text-xl">tune</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-on-surface">Bộ Điều Phối & Gán Phòng Tự Động</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ĐỒNG BỘ THỜI GIAN THỰC
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">
                Mã Booking: <span className="text-admin-primary font-bold">{bookingDossier?.ConfirmationCode || '---'}</span> • ID #{selectedBookingId || '---'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoAllocate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-semibold text-xs transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              Gán Tự Động Phòng Phù Hợp Nhất
            </button>

            <button
              onClick={heldRoom ? handleReleaseHold : handleHoldRoom}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                heldRoom
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-surface-container-high border-outline-variant/40 text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {heldRoom ? 'lock_open' : 'lock_clock'}
              </span>
              {heldRoom ? 'Hủy Giữ Phòng Tạm' : 'Giữ Phòng Tạm (15 Phút)'}
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/40 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Xem trước và in phiếu điều phối"
            >
              <span className="material-symbols-outlined text-base text-admin-primary">print</span>
              Xem & In Phiếu Gán Phòng
            </button>
          </div>
        </div>

        {/* ─── 3. HỒ SƠ KHÁCH HÀNG & TÀI CHÍNH DỰ TOÁN ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CỘT TRÁI: HỒ SƠ CHI TIẾT KHÁCH HÀNG */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-xl">badge</span>
                <h3 className="font-bold text-sm text-on-surface">Hồ Sơ Chi Tiết Khách Hàng</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {bookingDossier?.stayHistory?.vipTier || 'HẠNG HỘI VIÊN: TIÊU CHUẨN'}
              </span>
            </div>

            {loadingDossier ? (
              <div className="p-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
                Đang nạp hồ sơ khách hàng...
              </div>
            ) : bookingDossier ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary font-bold text-lg flex-shrink-0">
                    {bookingDossier.GuestName ? bookingDossier.GuestName.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-base text-on-surface">{bookingDossier.GuestName}</h4>
                    <p className="text-xs text-on-surface-variant flex items-center gap-3">
                      <span>📞 {bookingDossier.GuestPhone}</span>
                      <span>✉️ {bookingDossier.GuestEmail}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-on-surface-variant">
                        Mã Hội Viên: <strong className="text-admin-primary">{bookingDossier.stayHistory?.membershipRef}</strong>
                      </span>
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-on-surface-variant">
                        Mã Doanh Nghiệp: <strong className="text-on-surface">{bookingDossier.stayHistory?.corpCode}</strong>
                      </span>
                      <span className="bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/20 text-emerald-400">
                        {bookingDossier.stayHistory?.passportHash}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ghi chú lịch sử lưu trú */}
                <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/20 space-y-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Lịch Sử Lưu Trú & Ghi Chú Kiểm Tra
                  </span>
                  <p className="text-xs text-on-surface leading-relaxed font-mono">
                    {bookingDossier.stayHistory?.auditNote}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Vui lòng chọn một đặt phòng từ danh sách phía trên.</p>
            )}
          </div>

          {/* CỘT PHẢI: THÔNG SỐ LƯU TRÚ & TÀI CHÍNH DỰ TOÁN */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-xl">payments</span>
                <h3 className="font-bold text-sm text-on-surface">Thông Số Lưu Trú & Dự Toán Chi Phí</h3>
              </div>
              <span className="text-xs font-mono text-on-surface-variant">
                {bookingDossier?.NumberOfNights || 1} ĐÊM • {bookingDossier?.Adults || 1} NGƯỜI LỚN
              </span>
            </div>

            {bookingDossier ? (
              <div className="space-y-4">
                {/* Thời Gian Lưu Trú */}
                <div className="grid grid-cols-2 gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">Ngày Nhận Phòng</span>
                    <span className="text-xs font-bold text-on-surface">
                      {fmtDateMonth(bookingDossier.CheckInDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase block">Ngày Trả Phòng</span>
                    <span className="text-xs font-bold text-on-surface">
                      {fmtDateMonth(bookingDossier.CheckOutDate)}
                    </span>
                  </div>
                </div>

                {/* Bảng Chi Tiết Tài Chính */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant block uppercase">Giá Gốc / Đêm</span>
                    <span className="text-xs font-bold text-on-surface">{fmtMoney(bookingDossier.baseRate)}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                    <span className="text-[10px] text-emerald-400 block uppercase">Đã Đặt Cọc</span>
                    <span className="text-xs font-bold text-emerald-400">{fmtMoney(bookingDossier.depositPaid)}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-rose-500/30 bg-rose-500/5">
                    <span className="text-[10px] text-rose-400 block uppercase">Công Nợ Còn Lại</span>
                    <span className="text-xs font-bold text-rose-400">{fmtMoney(bookingDossier.balanceDue)}</span>
                  </div>
                </div>

                {/* Tổng Chi Phí */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-admin-primary/10 border border-admin-primary/30">
                  <span className="text-xs font-semibold text-on-surface">Tổng Dự Toán Hóa Đơn:</span>
                  <span className="text-base font-bold text-admin-primary">{fmtMoney(bookingDossier.totalFolio)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Đang tải thông số tài chính...</p>
            )}
          </div>
        </div>

        {/* ─── 4. YÊU CẦU ĐẶC BIỆT & SỞ THÍCH LƯU TRÚ ──────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">fact_check</span>
              <h3 className="font-bold text-sm text-on-surface">Yêu Cầu & Sở Thích Của Khách Hàng</h3>
            </div>
            <span className="text-xs text-on-surface-variant font-mono">
              TRỌNG SỐ THUẬT TOÁN: <strong className="text-admin-primary">100%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: 'req_high_floor', label: 'Tầng cao ưu tiên (08+)', icon: 'apartment', satisfied: true },
              { id: 'req_quiet', label: 'Xa thang máy / Yên tĩnh', icon: 'volume_off', satisfied: true },
              { id: 'req_nonsmoking', label: 'Khu vực không hút thuốc', icon: 'smoke_free', satisfied: true },
              { id: 'req_allergy', label: 'Chăn gối chống dị ứng', icon: 'bed', satisfied: false },
              { id: 'req_ocean', label: 'Hướng biển trực diện (Ocean)', icon: 'waves', satisfied: true },
            ].map((req) => (
              <label
                key={req.id}
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  activeRequests[req.id]
                    ? 'bg-admin-primary/10 border-admin-primary/50 text-on-surface'
                    : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(activeRequests[req.id])}
                  onChange={(e) => setActiveRequests({ ...activeRequests, [req.id]: e.target.checked })}
                  className="mt-0.5 rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm text-admin-primary">{req.icon}</span>
                    <span>{req.label}</span>
                  </div>
                  <span className={`text-[10px] block ${req.satisfied ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {req.satisfied ? '✓ Đã khớp tiêu chí' : '— Tùy chọn bổ sung'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ─── SPEC FEAT-ROOMALLOC-01: FORM GÁN PHÒNG CHO BOOKING (MỤC 6.2) ─── */}
        <div className="bg-surface-container border-2 border-admin-primary/40 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary font-bold">
                <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface uppercase tracking-wide">
                  Gán phòng cho booking
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  MÃ ĐẶT PHÒNG: <strong className="text-admin-primary">{bookingDossier?.ConfirmationCode || '---'}</strong> • TRẠNG THÁI: <span className="font-bold">{bookingDossier?.Status || 'Pending'}</span>
                </p>
              </div>
            </div>

            {/* Bộ đếm Đã chọn X/{quantity} phòng theo Mục 6.3 */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                selectedRoomIds.length === targetQuantity
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                Đã chọn {selectedRoomIds.length}/{targetQuantity} phòng
              </span>
            </div>
          </div>

          {/* Các trường thông tin Read-only theo Mục 6.2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 text-xs">
            <div>
              <span className="text-[10px] uppercase text-on-surface-variant block font-medium">Mã Booking</span>
              <span className="font-mono font-bold text-on-surface">{bookingDossier?.ConfirmationCode || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-on-surface-variant block font-medium">Loại phòng</span>
              <span className="font-bold text-admin-primary">{bookingDossier?.RoomTypeName || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-on-surface-variant block font-medium">Nhận phòng – Trả phòng</span>
              <span className="font-bold text-on-surface">
                {fmtDateMonth(bookingDossier?.CheckInDate)} – {fmtDateMonth(bookingDossier?.CheckOutDate)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-on-surface-variant block font-medium">Số phòng cần gán</span>
              <span className="font-bold text-emerald-400 font-mono">{targetQuantity} phòng</span>
            </div>
          </div>

          {/* Lỗi field hiển thị màu đỏ ngay dưới field theo Mục 6.3 */}
          {fieldError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold">
              <span className="material-symbols-outlined text-lg text-rose-400">error</span>
              <span>{fieldError}</span>
            </div>
          )}

          {/* Trường Ghi chú gán phòng (allocationNote - tối đa 500 ký tự) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-on-surface">
              Ghi chú gán phòng <span className="text-on-surface-variant text-[11px] font-normal">(Tối đa 500 ký tự)</span>
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={allocationNote}
              onChange={(e) => setAllocationNote(e.target.value)}
              placeholder="Nhập ghi chú gán phòng nếu cần (ví dụ: ưu tiên tầng cao yên tĩnh, gần lối thoát hiểm...)"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-admin-primary"
            />
            <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
              <span>Không bắt buộc</span>
              <span>{allocationNote.length}/500</span>
            </div>
          </div>

          {/* Nút thao tác của Form theo Mục 6.2 (btnCancel bên trái, btnSave bên phải) & các luồng Spec */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">
            <button
              onClick={() => {
                setSelectedRoomIds([]);
                setFieldError('');
              }}
              className="px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-all cursor-pointer"
            >
              Hủy Chọn Phòng ({selectedRoomIds.length})
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Nút Xác nhận Booking (Mục 6.1 - Luồng 4.1) */}
              {bookingDossier?.Status === 'Pending' && (
                <button
                  disabled={isConfirmingBooking}
                  onClick={handleConfirmBookingOnly}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Chuyển trạng thái booking sang Confirmed"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {isConfirmingBooking ? 'Đang xác nhận...' : 'Xác nhận Booking'}
                </button>
              )}

              {/* Nút Xác nhận & Gán phòng kết hợp (Mục 6.1 - Luồng 4.3) */}
              {bookingDossier?.Status === 'Pending' && (
                <button
                  disabled={isComboAllocating || selectedRoomIds.length !== targetQuantity}
                  onClick={handleConfirmAndAllocateCombo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                  title="Xác nhận và gán phòng trong cùng 1 transaction"
                >
                  <span className="material-symbols-outlined text-base">domain_verification</span>
                  {isComboAllocating ? 'Đang xử lý...' : 'Xác nhận & Gán phòng'}
                </button>
              )}

              {/* Nút Bỏ / Hủy gán phòng trước check-in (Mục 3.5) */}
              {bookingDossier?.assignedRooms?.length > 0 && bookingDossier?.Status !== 'CheckedIn' && (
                <button
                  disabled={isDeallocating}
                  onClick={handleDeallocateRooms}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Bỏ phân bổ phòng hiện tại cho booking này"
                >
                  <span className="material-symbols-outlined text-base">link_off</span>
                  {isDeallocating ? 'Đang hủy...' : 'Hủy Gán Phòng'}
                </button>
              )}

              {/* Nút btnSave: Gán phòng (Mục 6.2 & 6.3 - chỉ enable khi đã chọn đúng số lượng) */}
              <button
                disabled={isSavingAllocation || selectedRoomIds.length !== targetQuantity}
                onClick={handleSaveAllocation}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary text-xs font-bold transition-all cursor-pointer shadow-lg shadow-admin-primary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">meeting_room</span>
                {isSavingAllocation ? 'Đang lưu...' : 'Gán phòng'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── 5. DANH SÁCH PHÒNG PHÙ HỢP NHẤT ĐƯỢC CHẤM ĐIỂM ────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-admin-primary text-xl">recommend</span>
              <h3 className="font-bold text-sm text-on-surface">
                Danh Sách Phòng Phù Hợp Nhất (Xếp Hạng Tương Thích)
              </h3>
            </div>

            {/* Bộ Lọc Nhanh */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="all">Tất Cả Các Tầng</option>
                <option value="high">Tầng Cao (Tầng 8 Trở Lên)</option>
                <option value="mid">Tầng Trung (Tầng 4 - 7)</option>
                <option value="low">Tầng Thấp (Tầng 1 - 3)</option>
              </select>

              <select
                value={filterHK}
                onChange={(e) => setFilterHK(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="clean">Đã Dọn Sạch (Sẵn Sàng Gán)</option>
                <option value="clean_inspected">Chỉ Phòng Đã Kiểm Tra Kỹ (Inspected)</option>
                <option value="all">Tất Cả Trạng Thái</option>
              </select>

              <select
                value={filterView}
                onChange={(e) => setFilterView(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
              >
                <option value="all">Tất Cả Hướng Nhìn</option>
                <option value="ocean">Hướng Nhìn Biển (Ocean View)</option>
                <option value="city">Hướng Nhìn Thành Phố (City View)</option>
              </select>

              <input
                type="text"
                placeholder="Tìm số phòng..."
                value={searchRoomQuery}
                onChange={(e) => setSearchRoomQuery(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface w-32 focus:outline-none focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>

          {/* Lưới Thẻ Phòng */}
          {loadingRooms ? (
            <div className="p-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-admin-primary">progress_activity</span>
              Đang chấm điểm và xếp hạng phòng tương thích...
            </div>
          ) : recommendedRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-3xl text-amber-400 block">search_off</span>
              <p>Không có phòng nào thỏa mãn tiêu chí lọc hiện tại.</p>
              <button
                onClick={() => {
                  setFilterFloor('all');
                  setFilterHK('clean');
                  setFilterView('all');
                  setSearchRoomQuery('');
                }}
                className="text-admin-primary underline text-xs cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedRooms.slice(0, 9).map((room) => {
                const isSelected = selectedRoomIds.includes(room.RoomId) || selectedRoomId === room.RoomId;
                const isHeld = heldRoom && heldRoom.RoomId === room.RoomId;

                return (
                  <div
                    key={room.RoomId}
                    onClick={() => {
                      toggleRoomSelection(room.RoomId);
                      setCadFloor(Number(room.Floor) || 8);
                    }}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer relative space-y-3 ${
                      isSelected
                        ? 'bg-admin-primary/10 border-admin-primary shadow-lg shadow-admin-primary/10 ring-2 ring-admin-primary'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50'
                    }`}
                  >
                    {/* Header: Số Phòng & % Phù Hợp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center font-bold text-sm text-on-surface">
                          {room.RoomNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{room.RoomTypeName}</h4>
                          <span className="text-[10px] text-on-surface-variant">
                            Tầng {room.Floor} • {room.Wing}
                          </span>
                        </div>
                      </div>

                      {/* Huy Hiệu Phù Hợp */}
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                            room.MatchPercent >= 90
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : room.MatchPercent >= 80
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                              : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                          }`}
                        >
                          {room.MatchPercent}% Phù Hợp
                        </span>
                      </div>
                    </div>

                    {/* Thanh Tiến Trình Độ Phù Hợp */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-on-surface-variant">
                        <span>Thỏa mãn tiêu chí ({room.SatisfiedCount}/{room.TotalCriteria})</span>
                        <span className="font-mono text-emerald-400">{room.MatchPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            room.MatchPercent >= 90 ? 'bg-emerald-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${room.MatchPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Đặc Tính Phòng */}
                    <div className="text-[10px] text-on-surface-variant line-clamp-1 border-t border-outline-variant/10 pt-2 font-mono">
                      {room.UnitAttributes}
                    </div>

                    {/* Kiểm Định Sạch */}
                    <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 rounded-lg px-2.5 py-1 border border-emerald-500/20 flex items-center justify-between">
                      <span>{room.InspectionTimelog}</span>
                      {room.RoomStatus === 'Inspected' && (
                        <span className="material-symbols-outlined text-xs">verified</span>
                      )}
                    </div>

                    {/* Thao Tác Chọn */}
                    <div className="flex items-center justify-between pt-1">
                      {isHeld && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">lock</span>
                          Đang giữ tạm
                        </span>
                      )}
                      {room.IsUpgrade && (
                        <span className="text-[10px] text-violet-400 font-bold bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/30">
                          Ưu Tiên Nâng Hạng
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-admin-primary">
                        <span>{isSelected ? 'Đã Chọn' : 'Chọn Phòng Này'}</span>
                        <span className="material-symbols-outlined text-sm">
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 6. SƠ ĐỒ MẶT BẰNG TẦNG CAD TƯƠNG TÁC ─────────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-xl">map</span>
              <div>
                <h3 className="font-bold text-sm text-on-surface">
                  Sơ Đồ Mặt Bằng CAD Tương Tác
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  TẦNG {cadFloor} • TÒA THÁP CHÍNH • BẤM VÀO PHÒNG ĐỂ CHỌN NGAY
                </p>
              </div>
            </div>

            {/* Chuyển Tầng Nhanh */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Chọn Tầng:</span>
              <div className="flex gap-1">
                {[1, 4, 6, 8, 10, 11].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setCadFloor(fl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      cadFloor === fl
                        ? 'bg-admin-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    T.{fl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sơ Đồ Vector CAD */}
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-2xl p-5 relative overflow-hidden shadow-inner">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #38bdf8 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Chú Thích Phương Hướng & Trạng Thái */}
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/80 mb-4 border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-4">
                <span>[ KHU A // PHÍA BẮC ]</span>
                <span>--- HÀNH LANG TRUNG TÂM ---</span>
                <span>[ KHU B // HƯỚNG BIỂN NAM ]</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span> Trống / Sẵn Sàng
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 ring-2 ring-cyan-400 animate-pulse"></span> Đang Chọn
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-600"></span> Đang Có Khách
                </span>
              </div>
            </div>

            {/* Ma Trận Các Phòng Trên Tầng */}
            {loadingCad ? (
              <div className="py-12 text-center text-xs text-cyan-300 font-mono flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Đang kết xuất sơ đồ mặt bằng CAD...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 relative z-10">
                {cadRooms.map((rm) => {
                  const isSelected = selectedRoomIds.includes(rm.RoomId) || selectedRoomId === rm.RoomId;
                  const isOccupied = rm.Status === 'Occupied';
                  const isClean = rm.Status === 'CleanAvailable' || rm.Status === 'Inspected';

                  return (
                    <button
                      key={rm.RoomId}
                      disabled={isOccupied}
                      onClick={() => toggleRoomSelection(rm.RoomId)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative font-mono ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20'
                          : isOccupied
                          ? 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'
                          : isClean
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{rm.RoomNumber}</div>
                      <div className="text-[10px] uppercase truncate opacity-80 mt-0.5">
                        {isOccupied ? 'CÓ KHÁCH' : rm.Status === 'Inspected' ? 'ĐÃ KIỂM ĐỊNH' : 'ĐÃ DỌN SẠCH'}
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-2 ring-white animate-ping"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hạ Tầng Phụ Trợ */}
            <div className="mt-5 pt-3 border-t border-cyan-500/20 flex flex-wrap items-center justify-between text-[11px] font-mono text-cyan-300/80 gap-2">
              <div className="flex items-center gap-3">
                <span className="bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  🛗 HỘC THANG MÁY TRUNG TÂM
                </span>
                <span className="bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  🚪 CẦU THANG THOÁT HIỂM ĐÔNG
                </span>
              </div>
              <div className="bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/30 text-emerald-400">
                📶 TRẠM LẬP THẺ TỪ RFID: ĐANG KẾT NỐI (BÀN SỐ 2)
              </div>
            </div>
          </div>

          {/* Chi Tiết Phòng Đang Chọn */}
          {currentSelectedRoom && (
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Diện Tích Phòng</span>
                <strong className="text-on-surface">{currentSelectedRoom.AreaSqm || 55} m² (Phòng King Suite)</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Cấu Hình Giường</span>
                <strong className="text-on-surface">{currentSelectedRoom.BedConfig || '1 Giường King Đôi (200x220)'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Hướng Nhìn</span>
                <strong className="text-emerald-400">{currentSelectedRoom.ViewAspect}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block uppercase">Vị Trí Hành Lang</span>
                <strong className="text-on-surface">{currentSelectedRoom.Corner || 'Góc Yên Tĩnh'}</strong>
              </div>
            </div>
          )}
        </div>

        {/* ─── 7. THANH ĐIỀU KHIỂN & XÁC NHẬN GÁN PHÒNG (STICKY ACTION BAR) ─── */}
        <div className="sticky bottom-4 z-40 bg-surface-container-high/95 backdrop-blur-md border border-admin-primary/40 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Trạng Thái & Đồng Hồ 15 Phút Lease */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-admin-primary flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  {heldRoom ? 'lock_clock' : 'room_preferences'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-on-surface">
                    {heldRoom
                      ? `Phòng ${heldRoom.RoomNumber} Đang Được Giữ Tạm`
                      : selectedRoomIds.length > 0
                      ? `Đã chọn ${selectedRoomIds.length}/${targetQuantity} phòng`
                      : currentSelectedRoom
                      ? `Đã chọn Phòng ${currentSelectedRoom.RoomNumber} để gán`
                      : 'Chưa chọn số phòng'}
                  </span>
                  {heldRoom && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      THỜI GIAN GIỮ: {timeFormatted}
                    </span>
                  )}
                  {selectedRoomIds.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                      selectedRoomIds.length === targetQuantity
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {selectedRoomIds.length}/{targetQuantity} PHÒNG
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {bookingDossier
                    ? `Khách hàng: ${bookingDossier.GuestName} • Hạng phòng: ${bookingDossier.RoomTypeName}`
                    : 'Vui lòng chọn đặt phòng'}
                </p>
              </div>
            </div>

            {/* Checkbox Tự Động Hóa */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={sendSmsEmail}
                  onChange={(e) => setSendSmsEmail(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Gửi SMS & Email báo số phòng</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={notifyHousekeeping}
                  onChange={(e) => setNotifyHousekeeping(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Báo Buồng phòng</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={preProgramKeycard}
                  onChange={(e) => setPreProgramKeycard(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Lập mã thẻ từ RFID</span>
              </label>
            </div>

            {/* Nút Hành Động Theo Spec FEAT-ROOMALLOC-01 */}
            <div className="flex flex-wrap items-center gap-2">
              {heldRoom && (
                <button
                  onClick={handleReleaseHold}
                  className="px-3 py-2 rounded-xl border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Hủy Giữ Phòng
                </button>
              )}

              {/* Nút Xác nhận Booking riêng biệt (Luồng 4.1) */}
              {bookingDossier?.Status === 'Pending' && (
                <button
                  disabled={isConfirmingBooking}
                  onClick={handleConfirmBookingOnly}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Xác nhận đặt phòng riêng biệt"
                >
                  {isConfirmingBooking ? 'Đang xác nhận...' : 'Xác Nhận Booking'}
                </button>
              )}

              {/* Nút Xác nhận & Gán phòng Combo (Luồng 4.3) */}
              {bookingDossier?.Status === 'Pending' && (
                <button
                  disabled={isComboAllocating || selectedRoomIds.length !== targetQuantity}
                  onClick={handleConfirmAndAllocateCombo}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                  title="Xác nhận và gán phòng cùng lúc trong 1 transaction"
                >
                  <span className="material-symbols-outlined text-base">domain_verification</span>
                  {isComboAllocating ? 'Đang xử lý...' : 'Xác Nhận & Gán'}
                </button>
              )}

              {/* Nút Gán phòng (Luồng 4.2) */}
              <button
                disabled={isSavingAllocation || selectedRoomIds.length !== targetQuantity}
                onClick={handleSaveAllocation}
                className="px-4 py-2 rounded-xl border border-admin-primary/60 bg-admin-primary/10 hover:bg-admin-primary/20 text-admin-primary font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSavingAllocation ? 'Đang Xử Lý...' : 'Gán Phòng'}
              </button>

              {/* Nút Nhận Phòng Ngay */}
              <button
                disabled={confirming || selectedRoomIds.length !== targetQuantity}
                onClick={() => handleConfirmAllocation(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs transition-all cursor-pointer shadow-lg shadow-admin-primary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">login</span>
                {confirming ? 'Đang Nhận Phòng...' : 'Nhận Phòng Ngay'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── TOAST THÔNG BÁO ────────────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* ─── MODAL CẢNH BÁO XUNG ĐỘT CONCURRENCY ─────────────────────────── */}
        <ConcurrencyConflictModal
          conflictData={concurrencyConflict}
          onReload={() => {
            window.location.reload();
          }}
        />

        {/* ─── MODAL IN & XEM TRƯỚC PHIẾU GÁN PHÒNG CHUẨN IN ẤN ────────────── */}
        {showPrintModal && (
          <PrintVoucherModal
            booking={bookingDossier}
            room={currentSelectedRoom}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
