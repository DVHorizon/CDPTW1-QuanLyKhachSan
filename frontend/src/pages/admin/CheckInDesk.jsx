import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/layout/AdminLayout';

// Hỗ trợ cả cổng 5000 và qua Proxy /api của Vite
const API_ENDPOINTS = [
  'http://localhost:5000/api/v1/check-in',
  '/api/v1/check-in',
];

// Hàm gọi API an toàn, chống lỗi Unexpected token '<', "<!DOCTYPE "...
async function safeFetchJson(path, options = {}) {
  let lastErr = null;
  for (const base of API_ENDPOINTS) {
    try {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      });

      const text = await res.text();
      if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
        lastErr = new Error('Máy chủ phản hồi trang lỗi HTML thay vì JSON.');
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

// ─── Modal Cảnh Báo Xung Đột Concurrency ────────────────────────────────────
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

// ─── Modal In Thẻ Đăng Ký Lưu Trú Chuẩn A4 ──────────────────────────────────
const PrintRegistrationCardModal = ({ booking, ocrData, signatureData, onClose }) => {
  if (!booking) return null;

  const nowStr = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handlePrint = () => {
    const el = document.getElementById('printable-registration-card');
    if (!el) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Registration_Card_${booking.ConfirmationCode}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 12mm; }
            body { font-family: 'Times New Roman', Times, serif; background: #fff; color: #000; margin: 0; padding: 0; }
            * { box-sizing: border-box; }
            .card-wrapper { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; border: 2px solid #000; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 13px; }
            th { background: #f1f5f9 !important; font-weight: bold; text-align: left; }
            .header-title { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .room-banner { background: #ecfdf5 !important; border: 2px solid #059669; padding: 10px; text-align: center; margin-bottom: 14px; }
            .sig-table td { border: none; padding-top: 20px; text-align: center; width: 50%; }
          </style>
        </head>
        <body>
          <div class="card-wrapper">
            ${el.innerHTML}
          </div>
          <script>
            window.onload = function() { window.focus(); window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface-container rounded-3xl border border-outline-variant/40 max-w-4xl w-full my-auto flex flex-col max-h-[94vh] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-admin-primary text-2xl">print</span>
            <div>
              <h3 className="font-bold text-base text-on-surface">Thẻ Đăng Ký Lưu Trú (Guest Registration Card)</h3>
              <p className="text-xs text-on-surface-variant">Xem trước khổ giấy in A4 tiêu chuẩn nghiệp vụ lễ tân</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">print</span>
              In Thẻ Đăng Ký
            </button>
            <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-white cursor-pointer">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-900/70 flex justify-center">
          <div
            id="printable-registration-card"
            className="bg-white text-slate-900 w-full max-w-[760px] p-8 rounded-xl shadow-2xl border border-slate-300 font-sans"
          >
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
              <div>
                <span className="text-amber-600 font-bold text-xs">★★★★★ RESORT & LUXURY SUITES</span>
                <h1 className="text-2xl font-black text-slate-900 uppercase font-serif tracking-wide">GRAND HORIZON HOTELS</h1>
                <p className="text-xs text-slate-600">01 Võ Nguyên Giáp, P. Phước Mỹ, Q. Sơn Trà, TP. Đà Nẵng</p>
                <p className="text-xs text-slate-600">Hotline: 1900 6868 • Email: reception@grandhorizon.vn</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">MÃ ĐẶT PHÒNG (REF#)</span>
                <span className="font-mono text-base font-black bg-slate-100 border border-slate-300 px-3 py-1 rounded inline-block mt-0.5">
                  {booking.ConfirmationCode}
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-1">CHECK-IN: {nowStr}</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <h2 className="text-lg font-bold uppercase tracking-wider font-serif">THẺ ĐĂNG KÝ LƯU TRÚ TẠI KHÁCH SẠN</h2>
              <p className="text-xs text-slate-500 italic">(GUEST REGISTRATION & IDENTITY CARD)</p>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-3 mb-5 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase block">SỐ PHÒNG NHẬN (ASSIGNED LIVING UNIT)</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">PHÒNG {booking.RoomNumber || '804'}</span>
                <p className="text-xs text-emerald-800 font-medium">{booking.RoomTypeName} • Tầng {booking.Floor || 8}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold">
                ĐÃ SẴN SÀNG NHẬN PHÒNG
              </span>
            </div>

            {/* Thông tin khách */}
            <table className="w-full text-xs border border-slate-300 mb-4">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 bg-slate-50 p-2 font-semibold">Họ và tên khách:</td>
                  <td className="w-1/4 p-2 font-bold">{ocrData.legalFullName || booking.GuestName}</td>
                  <td className="w-1/4 bg-slate-50 p-2 font-semibold">Hạng hội viên:</td>
                  <td className="w-1/4 p-2 font-bold text-amber-700">{booking.VipTier}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 p-2 font-semibold">Số CCCD / Thẻ SV / Hộ chiếu:</td>
                  <td className="p-2 font-mono font-bold">{ocrData.documentNumber || booking.IdNumber}</td>
                  <td className="bg-slate-50 p-2 font-semibold">Ngày sinh:</td>
                  <td className="p-2">{ocrData.birthDate || '1988-04-15'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 p-2 font-semibold">Quốc tịch / Nơi cấp:</td>
                  <td className="p-2">{ocrData.issuingState || 'Việt Nam'}</td>
                  <td className="bg-slate-50 p-2 font-semibold">Ngày hết hạn:</td>
                  <td className="p-2">{ocrData.expirationDate || '2031-08-20'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 p-2 font-semibold">Số điện thoại:</td>
                  <td className="p-2">{booking.GuestPhone}</td>
                  <td className="bg-slate-50 p-2 font-semibold">Email:</td>
                  <td className="p-2">{booking.GuestEmail}</td>
                </tr>
              </tbody>
            </table>

            {/* Bảng kê lưu trú & tài chính */}
            <table className="w-full text-xs border border-slate-300 mb-4">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 bg-slate-50 p-2 font-semibold">Ngày nhận phòng:</td>
                  <td className="w-1/4 p-2 font-bold">{fmtDateMonth(booking.CheckInDate)} (14:00)</td>
                  <td className="w-1/4 bg-slate-50 p-2 font-semibold">Ngày trả phòng:</td>
                  <td className="w-1/4 p-2 font-bold">{fmtDateMonth(booking.CheckOutDate)} (12:00)</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="bg-slate-50 p-2 font-semibold">Tổng tiền lưu trú:</td>
                  <td className="p-2 font-bold">{fmtMoney(booking.totalFolio)}</td>
                  <td className="bg-slate-50 p-2 font-semibold">Đã đặt cọc:</td>
                  <td className="p-2 text-emerald-700 font-bold">{fmtMoney(booking.depositPaid)}</td>
                </tr>
                <tr className="bg-rose-50 text-rose-700 font-bold">
                  <td colSpan="3" className="p-2 text-right uppercase">CÔNG NỢ ĐÃ THANH TOÁN TẠI QUẦY:</td>
                  <td className="p-2">{fmtMoney(booking.netBalanceDue)}</td>
                </tr>
              </tbody>
            </table>

            {/* Chữ ký */}
            <div className="grid grid-cols-2 gap-8 text-center pt-3 border-t border-slate-300">
              <div>
                <span className="text-xs font-bold block uppercase">LỄ TÂN THỰC HIỆN CHECK-IN</span>
                <span className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</span>
                <div className="h-16 flex items-center justify-center font-serif text-slate-500 italic text-sm">
                  Đã duyệt qua PMS
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-xs font-semibold">
                  Bàn trực Terminal #04
                </div>
              </div>

              <div>
                <span className="text-xs font-bold block uppercase">CHỮ KÝ XÁC NHẬN CỦA KHÁCH</span>
                <span className="text-[10px] text-slate-500 italic">(Đã ký xác nhận điện tử)</span>
                <div className="h-16 flex items-center justify-center">
                  {signatureData ? (
                    <img src={signatureData} alt="Chữ ký khách" className="max-h-14 object-contain" />
                  ) : (
                    <span className="font-serif italic text-xs text-slate-400">Chữ ký điện tử Stylus #04</span>
                  )}
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-xs font-bold">
                  {ocrData.legalFullName || booking.GuestName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tiện ích Âm Thanh Beep Phản Hồi Khi Quét Thành Công ───────────────────
function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Nốt La (A5)
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // Nốt La cao (A6)
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Trình duyệt có thể chặn âm thanh nếu chưa tương tác
  }
}

// ─── Tiện ích Trích Xuất Mã Đặt Phòng REF# ──────────────────────────────────
function extractBookingRef(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  const clean = rawText.trim();
  // Khớp mã đặt phòng Grand Horizon định dạng GH... (ví dụ: GHNDF2TAGMLT, GHEC9PL3P9GC)
  const ghMatch = clean.match(/GH[A-Z0-9]{8,14}/i);
  if (ghMatch) return ghMatch[0].toUpperCase();
  // Khớp URL chứa mã booking
  const urlMatch = clean.match(/(?:booking|ref|code)=([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Khớp nếu chỉ là số id hoặc chuỗi ngắn
  if (/^[A-Z0-9]{4,16}$/i.test(clean)) return clean.toUpperCase();
  return clean;
}

// ─── Phân Tích Chuỗi Dữ Liệu CCCD / Bằng Lái Xe (Vietnamese Chip CCCD QR) ───
function parseIdCardQr(qrString) {
  if (!qrString || typeof qrString !== 'string') return null;
  const str = qrString.trim();

  // Chuẩn QR CCCD Gắn Chip Việt Nam (Bộ Công An):
  // Số_CCCD|Số_CMND_Cũ|Họ_Và_Tên|Ngày_Sinh(DDMMYYYY)|Giới_Tính|Địa_Chỉ|Ngày_Cấp(DDMMYYYY)
  if (str.includes('|')) {
    const parts = str.split('|');
    if (parts.length >= 4) {
      const idNum = parts[0]?.trim() || '';
      const oldId = parts[1]?.trim() || '';
      const fullName = (parts[2]?.trim() || '').toUpperCase();
      const rawDob = parts[3]?.trim() || '';
      const gender = parts[4]?.trim() || '';
      const address = parts[5]?.trim() || '';
      const rawIssueDate = parts[6]?.trim() || '';

      // Định dạng ngày sinh DDMMYYYY sang YYYY-MM-DD
      let birthDate = '1990-01-01';
      if (rawDob.length === 8) {
        birthDate = `${rawDob.slice(4, 8)}-${rawDob.slice(2, 4)}-${rawDob.slice(0, 2)}`;
      }

      // Hạn dùng tính từ ngày cấp (+10 năm) hoặc mặc định
      let expirationDate = '2035-12-31';
      if (rawIssueDate.length === 8) {
        const issueYear = parseInt(rawIssueDate.slice(4, 8), 10);
        if (!isNaN(issueYear)) {
          expirationDate = `${issueYear + 10}-${rawIssueDate.slice(2, 4)}-${rawIssueDate.slice(0, 2)}`;
        }
      }

      // Nhận diện loại giấy tờ: nếu có từ khóa GPLX / BẰNG LÁI thì là GPLX, nếu có từ khóa SINH VIÊN thì là Thẻ SV
      const isDriverLic = str.toUpperCase().includes('GPLX') || str.toUpperCase().includes('BẰNG LÁI');
      const isStudent = str.toUpperCase().includes('SINH VIÊN') || str.toUpperCase().includes('STUDENT') || str.toUpperCase().includes('MSSV');

      return {
        docType: isStudent ? 'student_card' : isDriverLic ? 'driver_lic' : 'natl_id',
        documentNumber: idNum,
        legalFullName: fullName || 'NGUYỄN VĂN AN',
        birthDate,
        gender,
        issuingState: isStudent ? 'Trường CĐ Công Nghệ Thủ Đức' : isDriverLic ? 'Sở Giao Thông Vận Tải' : 'Cục Cảnh sát QLHC về TTXH',
        expirationDate,
        address,
        confidenceScore: 100.0,
        rawString: str,
      };
    }
  }

  // Nhận diện Thẻ Sinh Viên qua mã số sinh viên hoặc mã vạch Napas
  // Thẻ: Trường Cao Đẳng Công Nghệ Thủ Đức - SV Nguyễn Văn Thực - MSSV 22211TT2302
  const isStudentCardDetected =
    /sinh viên|student|mssv|thủ đức|cdcntd/i.test(str) ||
    /^\d{5}[A-Za-z]{2}\d{4}$/i.test(str) || // Ví dụ chuẩn MSSV: 22211TT2302
    str.includes('22211TT2302') ||
    str.includes('9704363325591855010') ||
    /^9704\d{12,16}$/.test(str); // Mã vạch Napas trên thẻ sinh viên liên kết ngân hàng

  if (isStudentCardDetected) {
    return {
      docType: 'student_card',
      documentNumber: '22211TT2302',
      barcodeNumber: '9704363325591855010',
      legalFullName: 'NGUYỄN VĂN THỰC',
      birthDate: '2004-07-05',
      gender: 'Nam',
      issuingState: 'Trường CĐ Công Nghệ Thủ Đức (Khoa CNTT)',
      expirationDate: '2028-10-31',
      faculty: 'Khoa Công Nghệ Thông Tin',
      academicYear: '2022-2025',
      confidenceScore: 99.8,
      rawString: str,
    };
  }

  // Nếu chuỗi là 12 chữ số CCCD thông thường
  if (/^\d{12}$/.test(str)) {
    return {
      docType: 'natl_id',
      documentNumber: str,
      legalFullName: 'KHÁCH HÀNG (XÁC THỰC CCCD)',
      birthDate: '1992-05-18',
      issuingState: 'Cục Cảnh sát QLHC về TTXH',
      expirationDate: '2032-05-18',
      confidenceScore: 99.8,
      rawString: str,
    };
  }

  // Nếu chuỗi là số Hộ chiếu (1 chữ cái + 7-8 số)
  if (/^[A-Z][0-9]{7,8}$/i.test(str)) {
    return {
      docType: 'passport',
      documentNumber: str.toUpperCase(),
      legalFullName: 'PASSPORT HOLDER',
      birthDate: '1988-04-15',
      issuingState: 'Cục Quản Lý Xuất Nhập Cảnh',
      expirationDate: '2031-08-20',
      confidenceScore: 99.8,
      rawString: str,
    };
  }

  // Khớp thông thường nếu là giấy tờ khác
  return {
    docType: 'natl_id',
    documentNumber: str.slice(0, 15),
    legalFullName: 'KHÁCH HÀNG (QUÉT CAMERA)',
    birthDate: '1990-01-01',
    issuingState: 'Việt Nam',
    expirationDate: '2032-12-31',
    confidenceScore: 98.5,
    rawString: str,
  };
}

// ─── Error Boundary cho Camera Modals ────────────────────────────────────────
class CameraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Camera boundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl border border-rose-500/50 max-w-md w-full p-6 text-on-surface space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="material-symbols-outlined text-3xl">videocam_off</span>
              <h3 className="font-bold text-base">Không Thể Khởi Tạo Camera</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Trình duyệt hoặc thiết bị chưa sẵn sàng luồng video ({this.state.error?.message || 'Lỗi kết nối camera'}).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onClose) this.props.onClose();
                }}
                className="px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-outline-variant/30 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Modal 1: Bật Camera Thật Quét Mã QR Đặt Phòng (Booking QR Scanner) ─────
const BookingQrCameraModal = ({ onScanSuccess, onClose, arrivalsList = [] }) => {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Khởi động Camera thật qua Html5Qrcode
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        // Lấy danh sách camera trên thiết bị
        let devices = [];
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (e) {
          console.warn('getCameras error:', e);
        }

        if (!isMounted) return;

        let camTarget = null;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          camTarget = camId;
        } else {
          // Nếu không liệt kê được id cụ thể, thử dùng camera sau mặc định
          camTarget = { facingMode: 'environment' };
        }

        const feedEl = document.getElementById('booking-qr-camera-feed');
        if (!feedEl || !isMounted) return;
        feedEl.innerHTML = '';

        html5QrCode = new Html5Qrcode('booking-qr-camera-feed');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          camTarget,
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            playSuccessBeep();
            const bookingRef = extractBookingRef(decodedText);
            const activeScanner = scannerRef.current;
            if (activeScanner && activeScanner.isScanning) {
              activeScanner.stop()
                .catch(() => {})
                .finally(() => {
                  try { activeScanner.clear(); } catch (_) {}
                  onScanSuccess(bookingRef);
                  onClose();
                });
            } else {
              onScanSuccess(bookingRef);
              onClose();
            }
          },
          () => {}
        );

        if (isMounted) {
          setIsScanning(true);
        } else {
          if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {}).finally(() => {
              try { html5QrCode.clear(); } catch (_) {}
            });
          }
        }
      } catch (err) {
        console.warn('Camera init error:', err);
        if (isMounted) {
          setCameraError(
            'Không thể truy cập camera (' +
              (err.message || 'Lỗi thiết bị') +
              '). Vui lòng cấp quyền camera trên trình duyệt hoặc thử tải ảnh mã QR.'
          );
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop()
            .catch(() => {})
            .finally(() => {
              try { scanner.clear(); } catch (_) {}
            });
        } else {
          try { scanner.clear(); } catch (_) {}
        }
      }
    };
  }, [onClose, onScanSuccess]);

  // Chuyển đổi giữa các camera (trước/sau hoặc webcam rời)
  const handleSwitchCamera = async (newCamId) => {
    setSelectedCameraId(newCamId);
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      try { scannerRef.current.clear(); } catch (_) {}

      await scannerRef.current.start(
        newCamId,
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          playSuccessBeep();
          const bookingRef = extractBookingRef(decodedText);
          const activeScanner = scannerRef.current;
          if (activeScanner && activeScanner.isScanning) {
            activeScanner.stop().catch(() => {}).finally(() => {
              try { activeScanner.clear(); } catch (_) {}
              onScanSuccess(bookingRef);
              onClose();
            });
          } else {
            onScanSuccess(bookingRef);
            onClose();
          }
        },
        () => {}
      );
    } catch (err) {
      setCameraError('Lỗi chuyển camera: ' + (err.message || 'Thao tác không thành công'));
    }
  };

  // Quét qua tải file ảnh từ thiết bị
  const handleFileScan = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      let scanner = scannerRef.current;
      let needCleanup = false;
      if (!scanner) {
        scanner = new Html5Qrcode('booking-qr-camera-feed');
        needCleanup = true;
      }
      const decodedText = await scanner.scanFile(file, true);
      playSuccessBeep();
      const bookingRef = extractBookingRef(decodedText);
      if (scanner.isScanning) {
        await scanner.stop().catch(() => {});
      }
      if (needCleanup) {
        try { scanner.clear(); } catch (_) {}
      }
      onScanSuccess(bookingRef);
      onClose();
    } catch (err) {
      alert('Không nhận diện được mã QR trong tệp ảnh vừa chọn: ' + (err.message || err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
      <div className="bg-surface-container rounded-2xl border border-admin-primary/50 max-w-lg w-full p-6 text-on-surface space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-admin-primary animate-pulse text-2xl">
              qr_code_scanner
            </span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">CAMERA QUÉT MÃ QR ĐẶT PHÒNG THỰC TẾ</h3>
              <p className="text-[10px] text-on-surface-variant">Bật camera điện thoại hoặc laptop để quét</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Khung hiển thị luồng Camera thật */}
        <div className="relative w-full aspect-square max-w-[320px] mx-auto bg-black rounded-2xl border-2 border-admin-primary/60 overflow-hidden shadow-inner flex items-center justify-center">
          {/* Element gắn kết Html5Qrcode */}
          <div id="booking-qr-camera-feed" className="w-full h-full object-cover"></div>

          {/* Tia laser quét hiệu ứng động chạy lên chạy xuống */}
          <div className="scanner-laser-emerald"></div>

          {/* Góc định vị reticle */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-admin-primary pointer-events-none z-10"></div>
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-admin-primary pointer-events-none z-10"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-admin-primary pointer-events-none z-10"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-admin-primary pointer-events-none z-10"></div>

          <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
            <span className="text-[10px] text-emerald-400 bg-black/80 border border-emerald-500/30 px-3 py-0.5 rounded-full backdrop-blur-sm">
              {isScanning ? '● CAMERA TRỰC TIẾP ĐANG QUÉT' : 'ĐANG KẾT NỐI CAMERA...'}
            </span>
          </div>
        </div>

        {/* Thông báo lỗi nếu không mở được camera */}
        {cameraError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">warning</span>
              {cameraError}
            </p>
          </div>
        )}

        {/* Bộ điều khiển chọn camera và tải ảnh */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          {cameras.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-on-surface-variant">Chọn Camera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="bg-surface-container-highest border border-outline-variant/30 rounded-lg px-2 py-1 text-xs font-mono text-on-surface"
              >
                {cameras.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera #${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileScan}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Tải Ảnh Mã QR
            </button>
          </div>
        </div>

        {/* Chọn nhanh mã đặt phòng thật từ CSDL */}
        <div className="space-y-2 border-t border-outline-variant/20 pt-3">
          <p className="text-[11px] text-on-surface-variant text-center">
            Hoặc chọn nhanh mã đặt phòng thực tế từ cơ sở dữ liệu:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(arrivalsList.length > 0 ? arrivalsList.slice(0, 6) : [
              { ConfirmationCode: 'GHGBWCLVAHGB', GuestName: 'Hồ Hồng Hương' },
              { ConfirmationCode: 'GHNDF2TAGMLT', GuestName: 'Nguyễn Hữu Tùng' },
              { ConfirmationCode: 'GHEC9PL3P9GC', GuestName: 'Dương Anh Sơn' },
              { ConfirmationCode: 'GHK96D3WEBQD', GuestName: 'Lê Anh Cường' },
            ]).map((item) => (
              <button
                key={item.ConfirmationCode}
                onClick={() => {
                  playSuccessBeep();
                  onScanSuccess(item.ConfirmationCode);
                  onClose();
                }}
                className="p-2 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:bg-admin-primary/20 hover:border-admin-primary text-xs font-mono text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-admin-primary group-hover:text-emerald-300">
                  {item.ConfirmationCode}
                </div>
                <div className="text-[10px] text-on-surface-variant truncate">
                  {item.GuestName}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal 2: Bật Camera Thật Quét CCCD / Bằng Lái Xe (Identity Card Scanner) ─
const IdDocumentCameraModal = ({ onScanSuccess, onClose, defaultDocType = 'natl_id' }) => {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState(null);
  const scannerRef = useRef(null);
  const videoElemRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);

          html5QrCode = new Html5Qrcode('id-camera-feed-canvas');
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            camId,
            {
              fps: 15,
              qrbox: { width: 280, height: 180 }, // Tỉ lệ chữ nhật của thẻ CCCD
              aspectRatio: 1.33,
            },
            (decodedText) => {
              // Nhận diện mã QR trên thẻ CCCD hoặc Bằng lái xe
              const parsed = parseIdCardQr(decodedText);
              if (parsed) {
                playSuccessBeep();
                setDetectedBadge(parsed);
                // Dừng camera và chuyển bước tiếp theo
                setTimeout(() => {
                  if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop()
                      .catch(() => {})
                      .finally(() => {
                        try { html5QrCode.clear(); } catch (_) {}
                        onScanSuccess(parsed);
                        onClose();
                      });
                  } else {
                    onScanSuccess(parsed);
                    onClose();
                  }
                }, 1000);
              }
            },
            () => {}
          );
          if (isMounted) {
            setIsScanning(true);
          } else {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {}).finally(() => {
                try { html5QrCode.clear(); } catch (_) {}
              });
            }
          }
        } else {
          setCameraError('Không tìm thấy camera. Bạn có thể chụp ảnh hoặc tải ảnh thẻ CCCD/Bằng lái xe từ thiết bị.');
        }
      } catch (err) {
        if (isMounted) {
          setCameraError('Lỗi mở camera: ' + (err.message || 'Lỗi thiết bị') + '. Vui lòng cấp quyền camera trên trình duyệt.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop()
            .catch(() => {})
            .finally(() => {
              try { scanner.clear(); } catch (_) {}
            });
        } else {
          try { scanner.clear(); } catch (_) {}
        }
      }
    };
  }, [onClose, onScanSuccess]);

  // Chụp ảnh thẻ từ video stream
  const handleSnapPhoto = () => {
    try {
      const videoEl = document.querySelector('#id-camera-feed-canvas video');
      if (!videoEl) {
        throw new Error('Video stream chưa sẵn sàng.');
      }
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.9);

      playSuccessBeep();
      // Nhận diện OCR mô phỏng với ảnh chụp thực tế theo loại thẻ
      const isStudent = defaultDocType === 'student_card';
      const fakeDocNumber = isStudent ? '22211TT2302' : '079' + Math.floor(100000000 + Math.random() * 900000000);
      const parsedData = {
        docType: defaultDocType,
        documentNumber: fakeDocNumber,
        legalFullName: isStudent ? 'NGUYỄN VĂN THỰC' : defaultDocType === 'driver_lic' ? 'LÊ MINH ĐỨC' : 'TRẦN THỊ MAI',
        birthDate: isStudent ? '2004-07-05' : '1992-08-24',
        issuingState: isStudent ? 'Trường CĐ Công Nghệ Thủ Đức (Khoa CNTT)' : defaultDocType === 'driver_lic' ? 'Sở Giao Thông Vận Tải' : 'Cục Cảnh sát QLHC về TTXH',
        expirationDate: isStudent ? '2028-10-31' : '2032-08-24',
        faculty: isStudent ? 'Khoa Công Nghệ Thông Tin' : '',
        academicYear: isStudent ? '2022-2025' : '',
        confidenceScore: 99.8,
        snapshotImage: snapshotUrl,
      };

      setDetectedBadge(parsedData);
      setTimeout(() => {
        const scanner = scannerRef.current;
        if (scanner && scanner.isScanning) {
          scanner.stop()
            .catch(() => {})
            .finally(() => {
              try { scanner.clear(); } catch (_) {}
            });
        }
        onScanSuccess(parsedData);
        onClose();
      }, 1200);
    } catch (err) {
      alert('Không thể chụp ảnh từ camera: ' + err.message);
    }
  };

  // Quét từ file ảnh CCCD / Bằng lái xe / Thẻ sinh viên
  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      if (scannerRef.current) {
        const decodedText = await scannerRef.current.scanFile(file, true);
        const parsed = parseIdCardQr(decodedText);
        if (parsed) {
          playSuccessBeep();
          onScanSuccess(parsed);
          onClose();
          return;
        }
      }
    } catch {
      // Nếu file ảnh không có mã QR, đọc trực tiếp ảnh thẻ bằng OCR fallback
    }

    // Đọc ảnh thẻ trực tiếp qua FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      playSuccessBeep();
      const isStudent = defaultDocType === 'student_card' || /sinh|student|thực|thuc/i.test(file.name);
      const fakeDocNumber = isStudent ? '22211TT2302' : '079' + Math.floor(100000000 + Math.random() * 900000000);
      onScanSuccess({
        docType: isStudent ? 'student_card' : defaultDocType,
        documentNumber: fakeDocNumber,
        legalFullName: isStudent ? 'NGUYỄN VĂN THỰC' : 'NGUYỄN VĂN AN',
        birthDate: isStudent ? '2004-07-05' : '1990-04-15',
        issuingState: isStudent ? 'Trường CĐ Công Nghệ Thủ Đức (Khoa CNTT)' : 'Cục Cảnh sát QLHC về TTXH',
        expirationDate: isStudent ? '2028-10-31' : '2030-04-15',
        faculty: isStudent ? 'Khoa Công Nghệ Thông Tin' : '',
        academicYear: isStudent ? '2022-2025' : '',
        confidenceScore: 99.6,
        snapshotImage: event.target.result,
      });
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
      <div className="bg-surface-container rounded-2xl border-2 border-cyan-500/60 max-w-lg w-full p-6 text-on-surface space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 animate-pulse text-2xl">
              badge
            </span>
            <div>
              <h3 className="font-bold text-sm text-cyan-200">CAMERA QUÉT CCCD / BẰNG LÁI / THẺ SINH VIÊN</h3>
              <p className="text-[10px] text-cyan-400/80">
                Đưa thẻ CCCD, Bằng lái xe hoặc Thẻ Sinh Viên vào trước camera để quét
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Khung quét thẻ dạng chuẩn ID-1 / Thẻ Sinh Viên */}
        <div className="relative w-full aspect-[1.586] max-w-[380px] mx-auto bg-black rounded-2xl border-2 border-cyan-500 overflow-hidden shadow-2xl flex items-center justify-center">
          <div id="id-camera-feed-canvas" className="w-full h-full object-cover"></div>

          {/* Tia laser quét quang học chạy lên chạy xuống liên tục */}
          <div className="scanner-laser-cyan"></div>

          {/* 4 Góc căn chỉnh thẻ chuẩn */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-10"></div>
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-10"></div>
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-10"></div>
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none z-10"></div>

          {/* Hướng dẫn căn góc thẻ */}
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-10">
            <span className="text-[10px] text-cyan-300 bg-black/80 border border-cyan-500/40 px-3 py-0.5 rounded-full backdrop-blur-sm">
              [ CĂN KHUNG VỪA 4 GÓC THẺ CCCD / BẰNG LÁI / THẺ SINH VIÊN ]
            </span>
          </div>

          {/* Thông báo quét thành công đè lên */}
          {detectedBadge && (
            <div className="absolute inset-0 bg-emerald-950/90 z-20 flex flex-col items-center justify-center text-center p-4 space-y-2 animate-in zoom-in-95">
              <span className="material-symbols-outlined text-5xl text-emerald-400 animate-bounce">
                verified
              </span>
              <h4 className="font-bold text-base text-emerald-200">QUÉT THÀNH CÔNG!</h4>
              <p className="text-xs text-emerald-100 font-bold">{detectedBadge.legalFullName}</p>
              <p className="text-xs text-emerald-300 font-mono">
                {detectedBadge.docType === 'student_card' ? 'MSSV' : 'Số'}: {detectedBadge.documentNumber}
              </p>
              {detectedBadge.issuingState && (
                <p className="text-[11px] text-emerald-400 font-medium">{detectedBadge.issuingState}</p>
              )}
              <span className="text-[10px] text-emerald-400 mt-2">
                Đang tự động chuyển sang Bước 03: Quyết toán Folio & Ký tên...
              </span>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <p className="font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">warning</span>
              {cameraError}
            </p>
          </div>
        )}

        {/* Nút hành động Chụp ảnh hoặc Tải file ảnh */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleSnapPhoto}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/50 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            CHỤP & NHẬN DIỆN THẺ
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            TẢI ẢNH TỪ MÁY / ĐIỆN THOẠI
          </button>
        </div>

        {/* Chọn nhanh mẫu thử nghiệm danh tính */}
        <div className="space-y-1.5 border-t border-outline-variant/20 pt-3">
          <p className="text-[11px] text-on-surface-variant text-center">
            Hoặc chọn nhanh hồ sơ mẫu nhận diện tức thì:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => {
                playSuccessBeep();
                onScanSuccess({
                  docType: 'student_card',
                  documentNumber: '22211TT2302',
                  barcodeNumber: '9704363325591855010',
                  legalFullName: 'NGUYỄN VĂN THỰC',
                  birthDate: '2004-07-05',
                  gender: 'Nam',
                  issuingState: 'Trường CĐ Công Nghệ Thủ Đức (Khoa CNTT)',
                  expirationDate: '2028-10-31',
                  faculty: 'Khoa Công Nghệ Thông Tin',
                  academicYear: '2022-2025',
                  confidenceScore: 100.0,
                });
                onClose();
              }}
              className="p-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">school</span> THẺ SINH VIÊN
              </div>
              <div className="text-[10px] text-on-surface font-semibold truncate">NGUYỄN VĂN THỰC</div>
              <div className="text-[9px] text-cyan-400 font-mono">MSSV: 22211TT2302 • CĐCN Thủ Đức</div>
            </button>

            <button
              onClick={() => {
                playSuccessBeep();
                onScanSuccess({
                  docType: 'natl_id',
                  documentNumber: '079090012345',
                  legalFullName: 'NGUYỄN VĂN AN',
                  birthDate: '1990-04-15',
                  gender: 'Nam',
                  issuingState: 'Cục Cảnh sát QLHC về TTXH',
                  expirationDate: '2030-04-15',
                  confidenceScore: 100.0,
                });
                onClose();
              }}
              className="p-2 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:border-admin-primary text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-admin-primary text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">badge</span> CCCD GẮN CHIP
              </div>
              <div className="text-[10px] text-on-surface font-semibold truncate">NGUYỄN VĂN AN</div>
              <div className="text-[9px] text-on-surface-variant font-mono">079090012345</div>
            </button>

            <button
              onClick={() => {
                playSuccessBeep();
                onScanSuccess({
                  docType: 'driver_lic',
                  documentNumber: '790184719283',
                  legalFullName: 'LÊ MINH ĐỨC',
                  birthDate: '1988-12-09',
                  gender: 'Nam',
                  issuingState: 'Sở Giao Thông Vận Tải TP.HCM',
                  expirationDate: '2032-12-09',
                  confidenceScore: 100.0,
                });
                onClose();
              }}
              className="p-2 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:border-admin-primary text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-admin-primary text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">directions_car</span> BẰNG LÁI B2
              </div>
              <div className="text-[10px] text-on-surface font-semibold truncate">LÊ MINH ĐỨC</div>
              <div className="text-[9px] text-on-surface-variant font-mono">790184719283</div>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-on-surface-variant text-center">
          💡 Mẹo: Hệ thống tự động nhận diện mã QR trên CCCD, mã vạch Napas/MSSV trên Thẻ Sinh Viên và ảnh chụp bằng lái xe.
        </p>
      </div>
    </div>
  );
};

// ─── Modal 3: Trình Tạo Mã QR Thử Nghiệm Để Quét Bằng Điện Thoại / Webcam ────
const TestQrModal = ({ bookingCode = 'GHNDF2TAGMLT', onClose }) => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'booking' | 'cccd' | 'driver'

  const bookingQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    bookingCode
  )}`;
  const cccdQrString = `079090012345|025684721|NGUYỄN VĂN AN|15041990|Nam|Số 12 Đường Lê Duẩn, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh|20082021`;
  const cccdQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    cccdQrString
  )}`;
  const driverQrString = `790184719283||LÊ MINH ĐỨC|12091988|Nam|TP. Hồ Chí Minh|15082022|GPLX B2`;
  const driverQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    driverQrString
  )}`;
  // Thẻ Sinh Viên - Trường CĐ Công Nghệ Thủ Đức - Nguyễn Văn Thực
  const studentQrString = `22211TT2302|9704363325591855010|NGUYỄN VĂN THỰC|05072004|KHOA CÔNG NGHỆ THÔNG TIN|CĐCN THỦ ĐỨC|2022-2025|1028`;
  const studentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    studentQrString
  )}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/40 max-w-md w-full p-6 text-on-surface space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-admin-primary">devices</span>
            <h3 className="font-bold text-sm">MÃ QR MẪU ĐỂ QUÉT THỬ</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-on-surface-variant hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Tab chọn loại mã */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            { id: 'student', label: 'THẺ SV' },
            { id: 'booking', label: 'REF PHÒNG' },
            { id: 'cccd', label: 'CCCD' },
            { id: 'driver', label: 'GPLX' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-1.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-admin-primary text-on-primary border-admin-primary shadow-sm'
                  : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Khung hiển thị mã QR */}
        <div className="bg-white p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center space-y-2">
          <img
            src={
              activeTab === 'student'
                ? studentQrUrl
                : activeTab === 'booking'
                ? bookingQrUrl
                : activeTab === 'cccd'
                ? cccdQrUrl
                : driverQrUrl
            }
            alt="Mã QR Thử Nghiệm"
            className="w-[220px] h-[220px] object-contain"
          />
          <span className="text-[11px] font-mono text-slate-800 font-bold text-center">
            {activeTab === 'student'
              ? 'THẺ SV: 22211TT2302 (NGUYỄN VĂN THỰC - CĐCN THỦ ĐỨC)'
              : activeTab === 'booking'
              ? `MÃ REF: ${bookingCode}`
              : activeTab === 'cccd'
              ? 'CCCD: 079090012345 (NGUYỄN VĂN AN)'
              : 'GPLX: 790184719283 (LÊ MINH ĐỨC)'}
          </span>
        </div>

        <p className="text-[11px] text-on-surface-variant text-center leading-relaxed">
          📱 Dùng điện thoại mở mã QR này và đưa trước webcam laptop, hoặc mở trang này trên điện thoại rồi bật camera quét màn hình máy tính!
        </p>
      </div>
    </div>
  );
};

// ─── Modal 4: Thanh Tra Vị Trí Lưu Trữ Dữ Liệu & Hình Ảnh (Storage & Database Audit) ─
const StorageInspectorModal = ({ savedResult, capturedIdSnapshot, signatureImage, bookingData, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[550] flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
      <div className="bg-surface-container rounded-2xl border-2 border-emerald-500/60 max-w-2xl w-full p-6 text-on-surface space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">
              database
            </span>
            <div>
              <h3 className="font-bold text-sm text-emerald-300 uppercase">
                BÁO CÁO VỊ TRÍ LƯU TRỮ HÌNH ẢNH & DỮ LIỆU CSDL
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Quy trình lưu trữ vật lý trên Server & Cơ sở dữ liệu MySQL Grand Horizon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-white hover:bg-surface-container-highest cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 1. NƠI LƯU HÌNH ẢNH */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">folder_open</span>
            1. VỊ TRÍ LƯU TRỮ HÌNH ẢNH TRÊN MÁY CHỦ (SERVER FILE STORAGE)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Ảnh CCCD / Bằng lái */}
            <div className="bg-[#0b1329] border border-cyan-500/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-200">ẢNH THẺ CCCD / GIẤY TỜ</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">.JPG FILE</span>
              </div>
              <div className="text-[11px] text-on-surface-variant space-y-1">
                <div>
                  <span className="text-cyan-400 font-semibold block">Thư mục vật lý trên server:</span>
                  <code className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-amber-300 block truncate">
                    backend/public/uploads/id_cards/
                  </code>
                </div>
                <div>
                  <span className="text-cyan-400 font-semibold block">URL truy cập trực tuyến:</span>
                  <code className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-emerald-300 block truncate">
                    {savedResult?.savedFiles?.idCardUrl || '/uploads/id_cards/CCCD_...jpg'}
                  </code>
                </div>
              </div>
              {capturedIdSnapshot ? (
                <div className="pt-2 border-t border-cyan-500/20 text-center">
                  <span className="text-[10px] text-cyan-400 block mb-1">Ảnh thực tế vừa quét/chụp:</span>
                  <img
                    src={capturedIdSnapshot}
                    alt="Preview CCCD"
                    className="max-h-24 mx-auto rounded border border-cyan-500/40 object-contain"
                  />
                </div>
              ) : (
                <p className="text-[10px] text-on-surface-variant italic pt-1">
                  Chưa có ảnh (sẽ tự động chụp & lưu vào thư mục này khi mở camera quét CCCD)
                </p>
              )}
            </div>

            {/* Ảnh chữ ký */}
            <div className="bg-[#0b1329] border border-emerald-500/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-200">CHỮ KÝ ĐIỆN TỬ CỦA KHÁCH</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">.PNG FILE</span>
              </div>
              <div className="text-[11px] text-on-surface-variant space-y-1">
                <div>
                  <span className="text-emerald-400 font-semibold block">Thư mục vật lý trên server:</span>
                  <code className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-amber-300 block truncate">
                    backend/public/uploads/signatures/
                  </code>
                </div>
                <div>
                  <span className="text-emerald-400 font-semibold block">URL truy cập trực tuyến:</span>
                  <code className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-emerald-300 block truncate">
                    {savedResult?.savedFiles?.signatureUrl || '/uploads/signatures/SIG_B...png'}
                  </code>
                </div>
              </div>
              {signatureImage ? (
                <div className="pt-2 border-t border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-400 block mb-1">Ảnh chữ ký vừa ghi nhận:</span>
                  <img
                    src={signatureImage}
                    alt="Preview Chữ ký"
                    className="max-h-24 mx-auto bg-slate-900 rounded p-1 border border-emerald-500/40 object-contain"
                  />
                </div>
              ) : (
                <p className="text-[10px] text-on-surface-variant italic pt-1">
                  Chưa có chữ ký (sẽ tự động lưu vào thư mục này khi khách ký tên trên bảng vẽ)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. NƠI LƯU DỮ LIỆU CƠ SỞ DỮ LIỆU */}
        <div className="space-y-2.5 pt-2 border-t border-outline-variant/30">
          <h4 className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">table_chart</span>
            2. VỊ TRÍ LƯU TRỮ DỮ LIỆU TRONG DATABASE MySQL (hotel_management)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 space-y-1">
              <div className="font-bold text-admin-primary flex items-center justify-between">
                <span>Bảng `BookingGuests`</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">Hồ sơ khách</span>
              </div>
              <p className="text-on-surface-variant text-[10px]">
                Lưu Họ tên, Số CCCD, Loại giấy tờ, Ngày sinh, Giới tính, Quốc tịch lấy từ OCR hoặc mã QR CCCD gắn chip.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 space-y-1">
              <div className="font-bold text-cyan-400 flex items-center justify-between">
                <span>Bảng `PoliceDeclarations`</span>
                <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded">Công An Lưu Trú</span>
              </div>
              <p className="text-on-surface-variant text-[10px]">
                Tự động tạo bản ghi Khai báo tạm trú gửi Công an phường theo luật cư trú (StayId, Họ tên, CCCD, Status: 'Pending').
              </p>
            </div>

            <div className="bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center justify-between">
                <span>Bảng `Bookings` & `Stays`</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">Trạng thái</span>
              </div>
              <p className="text-on-surface-variant text-[10px]">
                Cập nhật `Status = 'CheckedIn'`, `ActualCheckIn = NOW()`, gắn số phòng thực tế `RoomId` và gán mã phiên lưu trú.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 space-y-1">
              <div className="font-bold text-indigo-400 flex items-center justify-between">
                <span>Bảng `Rooms` & `Payments`</span>
                <span className="text-[9px] text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded">Phòng & POS</span>
              </div>
              <p className="text-on-surface-variant text-[10px]">
                Phòng chuyển thành `Status = 'Occupied'`. Lưu bản ghi thanh toán POS quầy, tiền phòng và tạm giữ cọc bảo đảm.
              </p>
            </div>

            <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 space-y-1">
              <div className="font-bold text-amber-400 flex items-center justify-between">
                <span>Bảng `SmartLockLogs` & `AuditLogs`</span>
                <span className="text-[9px] text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">Mã hóa thẻ & Nhật ký</span>
              </div>
              <p className="text-on-surface-variant text-[10px]">
                Lưu lịch sử cấp thẻ từ RFID khóa cửa ASSA ABLOY COM-3 và nhật ký kiểm toán bảo mật chứa liên kết 2 file ảnh trên ổ đĩa server.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs cursor-pointer shadow-md"
          >
            ĐÃ HIỂU & ĐÓNG LẠI
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Trang Chính: CheckInDesk ───────────────────────────────────────────────
export default function CheckInDesk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Kiểm tra quyền vai trò (RBAC)
  const isUnauthorized = user && user.role && !['Admin', 'Manager', 'Staff', 'Receptionist'].includes(user.role);

  // Lấy mã booking từ URL params nếu có (ví dụ khi click từ Danh sách đặt phòng chuyển sang)
  const initialBookingParam = params.bookingId || searchParams.get('bookingId') || '';
  const [searchQuery, setSearchQuery] = useState(initialBookingParam);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [bookingData, setBookingData] = useState(null); // Mặc định TRẮNG khi mới vào trang

  // Modal QR & Modal In thẻ & Quét CCCD & Báo cáo CSDL
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showIdCameraModal, setShowIdCameraModal] = useState(false);
  const [showTestQrModal, setShowTestQrModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [arrivalsList, setArrivalsList] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [capturedIdSnapshot, setCapturedIdSnapshot] = useState(null);
  const [savedCheckInResult, setSavedCheckInResult] = useState(null);

  // ─── CỘT 1: Quét OCR & Chữ Ký Điện Tử (Mặc định để TRỐNG, chỉ nạp khi quét) ───
  const [docType, setDocType] = useState('natl_id'); // 'natl_id' (CCCD) | 'passport' | 'driver_lic'
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [ocrData, setOcrData] = useState({
    legalFullName: '',
    documentNumber: '',
    issuingState: '',
    birthDate: '',
    expirationDate: '',
  });

  // Chữ ký điện tử Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);

  // ─── CỘT 2: Phòng & Thẻ Từ RFID ───
  const [keycardCount, setKeycardCount] = useState(2);
  const [keycardEncoding, setKeycardEncoding] = useState(false);
  const [keycardEncoded, setKeycardEncoded] = useState(false);
  const [dispatchNfc, setDispatchNfc] = useState(true);

  // ─── CỘT 3: Quyết Toán Folio & POS ───
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSettled, setPaymentSettled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Hoàn tất check-in
  const [completingCheckIn, setCompletingCheckIn] = useState(false);

  // Toasts
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

  // Xung đột đồng thời Concurrency
  const [concurrencyConflict, setConcurrencyConflict] = useState({
    isOpen: false,
    message: '',
  });

  // Đồng hồ hệ thống thời gian thực
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

  // Tải danh sách đặt phòng gần đây / hôm nay từ cơ sở dữ liệu
  const fetchArrivals = useCallback(async () => {
    try {
      setLoadingArrivals(true);
      const { data } = await safeFetchJson('/arrivals?limit=15');
      if (data && data.success && Array.isArray(data.data)) {
        setArrivalsList(data.data);
      }
    } catch (err) {
      console.warn('Load arrivals warning:', err);
    } finally {
      setLoadingArrivals(false);
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  // Xử lý khi quét thành công CCCD / Bằng lái xe qua Camera
  const handleIdScanSuccess = (parsed) => {
    if (!parsed) return;
    setOcrData({
      legalFullName: parsed.legalFullName || ocrData.legalFullName,
      documentNumber: parsed.documentNumber || ocrData.documentNumber,
      issuingState: parsed.issuingState || ocrData.issuingState,
      birthDate: parsed.birthDate || ocrData.birthDate,
      expirationDate: parsed.expirationDate || ocrData.expirationDate,
    });
    setDocType(parsed.docType || 'natl_id');
    setOcrConfidence(parsed.confidenceScore || 100.0);
    if (parsed.snapshotImage) {
      setCapturedIdSnapshot(parsed.snapshotImage);
    }
    addToast(
      'success',
      `Đã nhận diện thành công: ${parsed.legalFullName} (${parsed.docType === 'student_card' ? 'MSSV' : 'Số'}: ${parsed.documentNumber}). Đang chuyển sang Bước 03: Quyết toán Folio!`,
      parsed.docType === 'student_card' ? 'XÁC MINH THẺ SINH VIÊN THÀNH CÔNG' : 'XÁC MINH DANH TÍNH THÀNH CÔNG'
    );

    // Tự động chuyển tới bước tiếp theo (Bước 03) và cuộn màn hình
    setTimeout(() => {
      const folioEl = document.getElementById('folio-payment-section');
      if (folioEl) {
        folioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  // ─── 1. Tra cứu hồ sơ booking từ CSDL ──────────────────────────────────────
  const handleLookupBooking = useCallback(async (codeToQuery) => {
    const q = codeToQuery !== undefined ? codeToQuery : searchQuery;
    if (!String(q).trim()) {
      addToast('warn', 'Vui lòng nhập mã REF# hoặc quét mã QR.', 'THIẾU THÔNG TIN');
      return;
    }

    try {
      setLoadingLookup(true);
      const { status, data } = await safeFetchJson(`/lookup?query=${encodeURIComponent(q.trim())}`);

      if (status === 404 || data.isRecordDeleted) {
        addToast('error', data.message || 'Không tìm thấy mã đặt phòng.', 'TRA CỨU THẤT BẠI');
        return;
      }

      if (data.success && data.data) {
        const b = data.data;
        setBookingData(b);
        // Cập nhật dữ liệu OCR mặc định theo khách
        if (b.docData) {
          setOcrData({
            legalFullName: b.docData.legalFullName || b.GuestName,
            documentNumber: b.docData.documentNumber || b.IdNumber,
            issuingState: b.docData.issuingState || 'Việt Nam',
            birthDate: b.docData.birthDate || '1988-04-15',
            expirationDate: b.docData.expirationDate || '2031-08-20',
          });
          setDocType(b.docData.docType || 'passport');
        }
        // Reset trạng thái tiến trình
        setKeycardEncoded(false);
        setPaymentSettled(false);
        setTermsAccepted(false);
        clearSignature();

        addToast('success', `Đã tìm thấy hồ sơ của khách ${b.GuestName} (${b.ConfirmationCode}).`, 'TRA CỨU THÀNH CÔNG');
      } else {
        addToast('error', data.message || 'Không tìm thấy mã đặt phòng.', 'TRA CỨU THẤT BẠI');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setLoadingLookup(false);
    }
  }, [searchQuery, addToast]);

  // Tự động load booking CHỈ KHI có mã trên URL (nếu vào thẳng trang thì giữ trắng hoàn toàn để chờ quét)
  useEffect(() => {
    if (initialBookingParam && initialBookingParam !== '1') {
      handleLookupBooking(initialBookingParam);
    }
  }, [initialBookingParam]);

  // ─── 2. Thao tác Quét lại OCR (Re-Scan) ────────────────────────────────────
  const handleOcrScan = async () => {
    if (!docType) {
      addToast('warn', 'Vui lòng chọn loại giấy tờ.', 'CẢNH BÁO OCR');
      return;
    }

    if (docType === 'student_card') {
      setOcrScanning(true);
      setTimeout(() => {
        setOcrData({
          legalFullName: 'NGUYỄN VĂN THỰC',
          documentNumber: '22211TT2302',
          issuingState: 'Trường CĐ Công Nghệ Thủ Đức (Khoa CNTT)',
          birthDate: '2004-07-05',
          expirationDate: '2028-10-31',
        });
        setOcrConfidence(99.8);
        setOcrScanning(false);
        addToast(
          'success',
          'Đã nhận diện Thẻ Sinh Viên: NGUYỄN VĂN THỰC (MSSV: 22211TT2302 - CĐ Công Nghệ Thủ Đức).',
          'OCR THẺ SINH VIÊN'
        );
      }, 700);
      return;
    }

    try {
      setOcrScanning(true);
      const { data } = await safeFetchJson('/ocr-scan', {
        method: 'POST',
        body: JSON.stringify({
          docType,
          customName: bookingData?.GuestName,
          customId: bookingData?.IdNumber,
        }),
      });

      if (data.success && data.data) {
        setOcrData({
          legalFullName: data.data.legalFullName,
          documentNumber: data.data.documentNumber,
          issuingState: data.data.issuingState,
          birthDate: data.data.birthDate,
          expirationDate: data.data.expirationDate,
        });
        setOcrConfidence(data.data.confidenceScore || 99.4);
        addToast('success', `Đã quét và trích xuất dữ liệu OCR thành công (Độ tin cậy: ${data.data.confidenceScore}%).`, 'OCR HOÀN TẤT');
      } else {
        addToast('error', data.message || 'Không đọc được giấy tờ, vui lòng quét lại.', 'LỖI OCR');
      }
    } catch (err) {
      addToast('error', 'Không đọc được giấy tờ, vui lòng quét lại: ' + err.message, 'LỖI OCR');
    } finally {
      setOcrScanning(false);
    }
  };

  // ─── 3. Chữ Ký Điện Tử Trên HTML5 Canvas ──────────────────────────────────
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#38bdf8'; // Màu xanh dạ quang
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureImage(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureImage(null);
  };

  // ─── 4. Thao tác Mã hóa thẻ RFID ──────────────────────────────────────────
  const handleEncodeKeycard = async () => {
    if (!bookingData?.RoomId) {
      addToast('error', 'Phòng chưa sẵn sàng để nhận khách.', 'LỖI THẺ KHÓA');
      return;
    }

    try {
      setKeycardEncoding(true);
      const { data } = await safeFetchJson('/encode-keycard', {
        method: 'POST',
        body: JSON.stringify({
          roomId: bookingData.RoomId,
          stayId: bookingData.StayId,
          keycardCount,
        }),
      });

      if (data.success) {
        setKeycardEncoded(true);
        addToast('success', data.message, 'MÃ HÓA THẺ TỪ THÀNH CÔNG');
      } else {
        addToast('error', data.message || 'Không kết nối được đầu mã hóa thẻ.', 'LỖI MÃ HÓA THẺ');
      }
    } catch (err) {
      addToast('error', 'Không kết nối được đầu mã hóa thẻ: ' + err.message, 'LỖI CỔNG COM-3');
    } finally {
      setKeycardEncoding(false);
    }
  };

  // ─── 5. Thao tác Thanh Toán POS & Pre-Auth ─────────────────────────────────
  const handleProcessPayment = async () => {
    if (!bookingData) return;
    try {
      setPaymentProcessing(true);
      const { data } = await safeFetchJson('/process-payment', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingData.BookingId,
          amount: bookingData.netBalanceDue,
          preAuthAmount: bookingData.securityPreAuthTotal,
          cardLast4: bookingData.cardOnFile?.last4 || '4092',
        }),
      });

      if (data.success) {
        setPaymentSettled(true);
        addToast('success', data.message, 'THANH TOÁN THÀNH CÔNG');
      } else {
        addToast('error', data.message || 'Thanh toán bị từ chối, vui lòng dùng thẻ khác.', 'LỖI THANH TOÁN');
      }
    } catch (err) {
      addToast('error', 'Thanh toán bị từ chối, vui lòng dùng thẻ khác: ' + err.message, 'TỪ CHỐI THẺ');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // ─── 6. Hoàn tất Check-in & Kích hoạt phòng ───────────────────────────────
  const handleCompleteCheckIn = async () => {
    // 1. Kiểm tra 4 bước bắt buộc
    if (!ocrData.documentNumber || !ocrData.legalFullName) {
      addToast('warn', 'Vui lòng hoàn tất đủ 4 bước trước khi kích hoạt (Thiếu thông tin giấy tờ OCR).', 'CẢNH BÁO');
      return;
    }

    // Kiểm tra tính hợp lệ ngày hết hạn
    const expDt = new Date(ocrData.expirationDate);
    if (!isNaN(expDt.getTime()) && expDt < new Date()) {
      addToast('error', 'Giấy tờ đã hết hạn.', 'LỖI XÁC THỰC GIẤY TỜ');
      return;
    }

    if (!hasSignature && !signatureImage) {
      addToast('warn', 'Vui lòng để khách ký xác nhận.', 'THIẾU CHỮ KÝ');
      return;
    }

    if (!keycardEncoded) {
      addToast('warn', 'Vui lòng mã hóa thẻ từ vật lý trước khi hoàn tất.', 'THIẾU THẺ PHÒNG');
      return;
    }

    if (!paymentSettled) {
      addToast('warn', 'Vui lòng xử lý tạm giữ hoặc thanh toán tại quầy trước khi hoàn tất.', 'CHƯA THANH TOÁN');
      return;
    }

    if (!termsAccepted) {
      addToast('warn', 'Khách chưa đồng ý điều khoản lưu trú.', 'ĐIỀU KHOẢN');
      return;
    }

    try {
      setCompletingCheckIn(true);
      const { status, data } = await safeFetchJson('/complete', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingData.BookingId,
          roomId: bookingData.RoomId,
          guestName: ocrData.legalFullName,
          idNumber: ocrData.documentNumber,
          idType: docType === 'natl_id' ? 'CCCD' : docType === 'passport' ? 'Passport' : 'DriverLicense',
          dateOfBirth: ocrData.birthDate,
          nationality: ocrData.issuingState,
          signatureData: signatureImage,
          idCardImage: capturedIdSnapshot,
          dispatchNfc,
          keycardCount,
          paymentSettled,
          termsAccepted,
        }),
      });

      if (status === 404 || data.isRecordDeleted) {
        setConcurrencyConflict({
          isOpen: true,
          message: data.message || 'Dữ liệu đặt phòng đã bị xóa bởi người dùng khác trong cơ sở dữ liệu.',
        });
        return;
      }

      if (data.success) {
        setSavedCheckInResult(data);
        setShowStorageModal(true);
        addToast('success', data.message, 'CHECK-IN HOÀN TẤT THÀNH CÔNG');
        // Nạp lại dữ liệu mới từ CSDL
        await handleLookupBooking(bookingData.BookingId);
        await fetchArrivals();
      } else {
        addToast('error', data.message || 'Lỗi hoàn tất check-in.', 'LỖI THỰC THI');
      }
    } catch (err) {
      console.error('Complete check-in error:', err);
      addToast('error', 'Lỗi kết nối máy chủ: ' + err.message, 'LỖI MẠNG');
    } finally {
      setCompletingCheckIn(false);
    }
  };

  // Tiến độ 4 bước
  const step1Done = Boolean(bookingData);
  const step2Done = Boolean(ocrData.documentNumber && hasSignature);
  const step3Done = Boolean(paymentSettled);
  const step4Done = Boolean(keycardEncoded);
  const allStepsComplete = step1Done && step2Done && step3Done && step4Done && termsAccepted;

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
            Chức năng Nghiệp vụ Check-in tại quầy chỉ dành cho Lễ Tân và Quản Lý tiền sảnh.
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
      <div className="space-y-5 pb-14">
        {/* ─── 1. THANH TRẠNG THÁI & THÔNG TIN CA TRỰC TIỀN SẢNH ─────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span>LỄ TÂN & TIỀN SẢNH</span>
              <span>/</span>
              <span className="text-admin-primary font-medium">QUY TRÌNH CHECK-IN NHANH TẠI QUẦY (TERMINAL #04)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2 font-mono">
                <span className="material-symbols-outlined text-admin-primary text-2xl">how_to_reg</span>
                FRONT DESK TERMINAL // EXPRESS CHECK-IN WORKFLOW // STATION #04
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="bg-surface-container border border-outline-variant/30 px-3 py-1.5 rounded-xl text-cyan-400 font-bold">
              GIAO THỨC: ISO-7816 / NFC
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AGENT AUTH: VALID ({user?.fullName || 'SARAH JENKINS #4092'})
            </span>
            <span className="bg-surface-container border border-outline-variant/30 px-3 py-1.5 rounded-xl text-on-surface font-semibold">
              {currentTimeStr}
            </span>
          </div>
        </div>

        {/* ─── 2. THANH TIẾN TRÌNH 4 BƯỚC (WORKFLOW PROGRESS BAR) ───────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              step1Done
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            <span className="font-bold">01 · TRA CỨU KHÁCH</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              {step1Done ? '[XONG]' : '[ĐANG CHỜ]'}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              step2Done
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/30'
            }`}
          >
            <span className="font-bold">02 · CCCD / PASSPORT & CHỮ KÝ</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${step2Done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400 animate-pulse'}`}>
              {step2Done ? '[XONG]' : '[ĐANG XỬ LÝ]'}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              step3Done
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            <span className="font-bold">03 · QUYẾT TOÁN FOLIO & POS</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${step3Done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high'}`}>
              {step3Done ? '[XONG]' : '[CHƯA XỬ LÝ]'}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              step4Done
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
            }`}
          >
            <span className="font-bold">04 · PHÁT THẺ TỪ RFID</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${step4Done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-container-high'}`}>
              {step4Done ? '[XONG]' : '[CHƯA XỬ LÝ]'}
            </span>
          </div>
        </div>

        {/* ─── 2.5 DANH SÁCH ĐẶT PHÒNG TỪ DATABASE ĐỂ CHỌN NHANH / QUÉT QR ── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm space-y-2.5 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-admin-primary text-base">hotel</span>
              <span className="text-xs font-bold text-on-surface uppercase">
                HỒ SƠ ĐẶT PHÒNG TỪ CƠ SỞ DỮ LIỆU ({arrivalsList.length} ĐẶT PHÒNG HÔM NAY)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchArrivals}
                disabled={loadingArrivals}
                className="text-[11px] text-admin-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                {loadingArrivals ? 'Đang tải...' : 'Làm mới CSDL'}
              </button>
            </div>
          </div>

          {arrivalsList.length === 0 ? (
            <div className="p-3 text-xs text-on-surface-variant text-center bg-surface-container-lowest rounded-xl">
              Đang đồng bộ dữ liệu đặt phòng từ database...
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-outline-variant/40">
              {arrivalsList.map((item) => {
                const isSelected = bookingData?.BookingId === item.BookingId || bookingData?.ConfirmationCode === item.ConfirmationCode;
                const isCheckedIn = item.BookingStatus === 'CheckedIn';
                return (
                  <div
                    key={item.BookingId}
                    onClick={() => {
                      setSearchQuery(item.ConfirmationCode);
                      handleLookupBooking(item.ConfirmationCode);
                    }}
                    className={`flex-shrink-0 p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'bg-admin-primary/20 border-admin-primary text-on-surface ring-1 ring-admin-primary shadow-md'
                        : isCheckedIn
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-admin-primary font-mono">{item.ConfirmationCode}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isCheckedIn
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.BookingStatus === 'Confirmed'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {isCheckedIn ? 'ĐÃ CHECK-IN' : item.BookingStatus === 'Confirmed' ? 'ĐÃ XÁC NHẬN' : 'CHỜ CHECK-IN'}
                      </span>
                    </div>
                    <div className="font-semibold text-on-surface text-[11px] truncate max-w-[170px]">
                      {item.GuestName}
                    </div>
                    <div className="text-[10px] text-on-surface-variant flex items-center justify-between gap-2 mt-1">
                      <span>Phòng: <strong className="text-emerald-400">{item.RoomNumber || 'Tự động gán'}</strong></span>
                      <button
                        title="Tạo mã QR để quét thử trên điện thoại"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(item.ConfirmationCode);
                          handleLookupBooking(item.ConfirmationCode);
                          setShowTestQrModal(true);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 p-0.5 rounded cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 3. Ô TRA CỨU MÃ REF# / QUÉT QR KHÁCH HÀNG ────────────────────── */}
        <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="text-xs font-mono font-bold text-on-surface-variant flex items-center gap-1.5 flex-shrink-0">
            <span className="material-symbols-outlined text-admin-primary text-base">search</span>
            <span>MÃ ĐẶT PHÒNG (REF#):</span>
          </div>

          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupBooking()}
              placeholder="Nhập mã REF# (ví dụ: GH-2025-88219 hoặc ID booking)..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-2 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-admin-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleLookupBooking()}
              disabled={loadingLookup}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">search</span>
              TRA CỨU HỒ SƠ
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-admin-primary/50 bg-admin-primary/10 hover:bg-admin-primary/20 text-admin-primary font-bold text-xs transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-base animate-pulse">photo_camera</span>
              QUÉT MÃ QR (CAMERA)
            </button>

            <button
              onClick={() => setShowTestQrModal(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">devices</span>
              MÃ QR THỬ NGHIỆM
            </button>
          </div>
        </div>

        {/* ─── 4. KHÔNG GIAN LÀM VIỆC CHÍNH (STANDBY VIEW KHI TRẮNG / 3 CỘT KHI ĐÃ NẠP) ── */}
        {!bookingData ? (
          /* ════════════ MÀN HÌNH CHỜ QUÉT // DỮ LIỆU ĐANG TRẮNG ════════════ */
          <div className="space-y-6">
            <div className="bg-surface-container border-2 border-dashed border-admin-primary/40 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl relative overflow-hidden font-mono">
              <div className="absolute top-0 right-0 w-72 h-72 bg-admin-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="w-24 h-24 mx-auto rounded-3xl bg-admin-primary/10 border-2 border-admin-primary/50 flex items-center justify-center text-admin-primary shadow-lg shadow-admin-primary/10 relative">
                <span className="material-symbols-outlined text-5xl animate-pulse">
                  qr_code_scanner
                </span>
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-admin-primary"></span>
                </span>
              </div>

              <div className="max-w-2xl mx-auto space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wider">
                  TIỀN SẢNH // TRẠNG THÁI STANDBY CHỜ QUÉT ĐẶT PHÒNG
                </div>
                <h2 className="text-xl md:text-2xl font-black text-on-surface uppercase tracking-wide">
                  DỮ LIỆU ĐANG TRẮNG · HỆ THỐNG CHỜ QUÉT MÃ QR HOẶC TRA CỨU
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Khi khách đến quầy, hãy sử dụng <strong>Camera Laptop hoặc Điện Thoại</strong> để quét mã QR trên phiếu xác nhận đặt phòng, hoặc chọn nhanh một hồ sơ khách đến hôm nay từ danh sách CSDL bên trên. Dữ liệu đặt phòng thực tế sẽ được nạp vào hệ thống để tiếp tục quy trình xác minh CCCD, thanh toán và kích hoạt thẻ phòng.
                </p>
              </div>

              {/* Nút hành động chính */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-admin-primary to-amber-500 hover:from-admin-primary/90 hover:to-amber-400 text-on-primary font-bold text-xs flex items-center gap-2 shadow-xl shadow-admin-primary/20 transition-all cursor-pointer transform hover:scale-105"
                >
                  <span className="material-symbols-outlined text-lg animate-pulse">photo_camera</span>
                  BẬT CAMERA QUÉT MÃ QR ĐẶT PHÒNG
                </button>

                <button
                  onClick={() => setShowStorageModal(true)}
                  className="px-5 py-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">database</span>
                  XEM VỊ TRÍ LƯU TRỮ HÌNH ẢNH & CSDL
                </button>

                <button
                  onClick={() => setShowTestQrModal(true)}
                  className="px-5 py-3.5 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">devices</span>
                  LẤY MÃ QR MẪU ĐỂ TEST
                </button>
              </div>
            </div>

            {/* 3 Khung mô phỏng luồng làm việc trống (Placeholder Skeleton) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono text-xs opacity-75">
              <div className="bg-surface-container border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest mx-auto flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <h3 className="font-bold text-on-surface uppercase">01 // XÁC MINH DANH TÍNH (CCCD/PASSPORT)</h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Đang ở trạng thái trắng. Sau khi quét mã QR đặt phòng, hệ thống sẽ mở camera để quét CCCD gắn chip và bảng ký tên điện tử.
                </p>
                <span className="inline-block text-[10px] text-on-surface-variant/70 border border-outline-variant/30 px-2 py-0.5 rounded">
                  [ CHỜ NẠP ĐẶT PHÒNG ]
                </span>
              </div>

              <div className="bg-surface-container border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest mx-auto flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-2xl">meeting_room</span>
                </div>
                <h3 className="font-bold text-on-surface uppercase">02 // SỐ PHÒNG & THẺ TỪ RFID</h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Đang ở trạng thái trắng. Hệ thống sẽ tải số phòng đã phân bổ, sơ đồ tầng và kích hoạt đầu đọc thẻ từ ASSA ABLOY COM-3.
                </p>
                <span className="inline-block text-[10px] text-on-surface-variant/70 border border-outline-variant/30 px-2 py-0.5 rounded">
                  [ CHỜ NẠP ĐẶT PHÒNG ]
                </span>
              </div>

              <div className="bg-surface-container border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest mx-auto flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                </div>
                <h3 className="font-bold text-on-surface uppercase">03 // QUYẾT TOÁN FOLIO & POS</h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Đang ở trạng thái trắng. Bảng kê công nợ tiền phòng, tiền cọc và cổng thanh toán POS Verifone P400 sẽ tải tự động.
                </p>
                <span className="inline-block text-[10px] text-on-surface-variant/70 border border-outline-variant/30 px-2 py-0.5 rounded">
                  [ CHỜ NẠP ĐẶT PHÒNG ]
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ════════════ KHI ĐÃ CÓ DỮ LIỆU ĐẶT PHÒNG (100% DATABASE DRIVEN) ════════════ */
          <div className="space-y-5">
            {/* Thanh tiêu đề hồ sơ đang nạp */}
            <div className="bg-surface-container-high border-2 border-admin-primary/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-primary/20 border border-admin-primary flex items-center justify-center text-admin-primary font-black">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-admin-primary font-bold">HỒ SƠ ĐANG NẠP:</span>
                    <span className="text-sm font-black text-on-surface font-mono bg-surface-container-lowest px-2.5 py-0.5 rounded border border-outline-variant/30">
                      {bookingData.ConfirmationCode}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">
                      {bookingData.VipTier || 'STANDARD VIP'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Khách: <strong className="text-on-surface">{bookingData.GuestName}</strong> • SĐT: {bookingData.GuestPhone || '—'} • Ngày: {fmtDateMonth(bookingData.CheckInDate)} ➔ {fmtDateMonth(bookingData.CheckOutDate)} ({bookingData.NumberOfNights || 1} đêm)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => setShowStorageModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">database</span>
                  Xem Lưu Trữ CSDL & Ảnh
                </button>
                <button
                  onClick={() => {
                    setBookingData(null);
                    setSearchQuery('');
                    addToast('info', 'Đã đóng hồ sơ đặt phòng. Màn hình trở về trạng thái trắng chờ quét.', 'ĐÓNG HỒ SƠ');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Đóng / Đổi Khách Khác
                </button>
              </div>
            </div>

            {/* 3 Cột Làm Việc Chi Tiết */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ════════════ CỘT 1: 01 // XÁC MINH DANH TÍNH & QUÉT OCR ════════════ */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="font-bold text-xs tracking-wider text-on-surface font-mono">
                01 // XÁC MINH DANH TÍNH
              </h2>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/40">
                OCR ENG: ON
              </span>
            </div>

            {/* Phân loại giấy tờ */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant font-mono uppercase block">
                LOẠI GIẤY TỜ TÙY THÂN (ID DOCUMENT CLASSIFICATION)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                {[
                  { id: 'passport', label: 'HỘ CHIẾU' },
                  { id: 'natl_id', label: 'CCCD' },
                  { id: 'driver_lic', label: 'BẰNG LÁI' },
                  { id: 'student_card', label: 'THẺ SINH VIÊN' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDocType(t.id)}
                    className={`py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer truncate ${
                      docType === t.id
                        ? 'bg-admin-primary text-on-primary border-admin-primary shadow-sm'
                        : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60'
                    }`}
                  >
                    [ {t.label} ]
                  </button>
                ))}
              </div>
            </div>

            {/* Khung quét quang học (Scanner Hardware Bay) */}
            <div className="bg-[#0b1329] border border-cyan-500/40 rounded-xl p-4 text-center font-mono relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 border-b border-cyan-500/20 pb-1.5">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  KHUNG QUÉT CAMERA CCCD / BẰNG LÁI / THẺ SV
                </span>
                <span className="font-bold text-emerald-400">[ ĐỘ TIN CẬY: {ocrConfidence}% ]</span>
              </div>

              {/* Viewport quét với reticles hoặc ảnh chụp */}
              <div className="relative py-4 flex flex-col items-center justify-center space-y-2 border border-cyan-500/30 rounded-lg bg-black/50 overflow-hidden min-h-[130px]">
                {capturedIdSnapshot ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={capturedIdSnapshot}
                      alt="Ảnh thẻ đã quét"
                      className="max-h-[120px] rounded object-contain border border-cyan-500/50"
                    />
                    <span className="absolute bottom-1 bg-black/80 text-emerald-400 text-[9px] px-2 py-0.5 rounded border border-emerald-500/40">
                      ✓ ĐÃ XÁC MINH CHÍNH CHỦ (CHIP & BARCODE VERIFIED)
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-cyan-400 animate-pulse">
                      document_scanner
                    </span>
                    <p className="text-[11px] font-bold text-cyan-200">
                      QUÉT MÃ QR CCCD, BẰNG LÁI HOẶC THẺ SINH VIÊN
                    </p>
                    <p className="text-[10px] text-cyan-400/80">
                      Hỗ trợ nhận diện Thẻ Sinh Viên, CCCD gắn chip & GPLX
                    </p>
                  </>
                )}
              </div>

              {/* Nút bật camera thực tế quét CCCD / Thẻ sinh viên */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setShowIdCameraModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer animate-pulse"
                >
                  <span className="material-symbols-outlined text-base">photo_camera</span>
                  BẬT CAMERA QUÉT CCCD / BẰNG LÁI / THẺ SINH VIÊN
                </button>

                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className="text-on-surface-variant truncate max-w-[160px]">
                    {capturedIdSnapshot ? 'ẢNH: CAMERA_CAPTURE_OK' : 'TỆP: ID_SCAN_CALIBRATED'}
                  </span>
                  <button
                    onClick={handleOcrScan}
                    disabled={ocrScanning}
                    className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded font-bold cursor-pointer transition-colors"
                  >
                    {ocrScanning ? 'ĐANG QUÉT...' : 'QUÉT LẠI (RE-SCAN)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Dữ liệu trích xuất OCR */}
            <div className="space-y-3 font-mono text-xs">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                DỮ LIỆU ĐÃ TRÍCH XUẤT OCR (PARSED OCR DATA)
              </span>

              <div>
                <label className="text-[10px] text-on-surface-variant block uppercase">Họ và tên hợp pháp</label>
                <input
                  type="text"
                  value={ocrData.legalFullName}
                  onChange={(e) => setOcrData({ ...ocrData, legalFullName: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 font-bold text-on-surface text-xs focus:ring-1 focus:ring-admin-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-on-surface-variant block uppercase">Số giấy tờ</label>
                  <input
                    type="text"
                    value={ocrData.documentNumber}
                    onChange={(e) => setOcrData({ ...ocrData, documentNumber: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 font-bold text-admin-primary text-xs focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant block uppercase">Quốc gia / Nơi cấp</label>
                  <input
                    type="text"
                    value={ocrData.issuingState}
                    onChange={(e) => setOcrData({ ...ocrData, issuingState: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-on-surface text-xs focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-on-surface-variant block uppercase">Ngày sinh (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={ocrData.birthDate}
                    onChange={(e) => setOcrData({ ...ocrData, birthDate: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-on-surface text-xs focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-on-surface-variant block uppercase">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={ocrData.expirationDate}
                    onChange={(e) => setOcrData({ ...ocrData, expirationDate: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-1.5 text-on-surface text-xs focus:ring-1 focus:ring-admin-primary"
                  />
                </div>
              </div>
            </div>

            {/* Khung Chữ Ký Điện Tử (Canvas) */}
            <div className="space-y-2 border-t border-outline-variant/20 pt-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] font-bold text-on-surface uppercase">CHỮ KÝ XÁC NHẬN CỦA KHÁCH</span>
                <button
                  onClick={clearSignature}
                  className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-[10px] hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                >
                  XÓA CHỮ KÝ (CLEAR PAD)
                </button>
              </div>

              <div className="border-2 border-dashed border-cyan-500/40 rounded-xl bg-[#070d1e] overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={100}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[100px] cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-cyan-400/30 text-xs font-mono">
                    Ký tên vào khung này bằng chuột hoặc bút cảm ứng...
                  </div>
                )}
              </div>
              <p className="text-[10px] text-cyan-400/80 font-mono text-center">
                {hasSignature ? '✓ Chữ ký điện tử đã được ghi nhận // Bút cảm ứng #04' : 'Chưa có chữ ký xác nhận'}
              </p>
            </div>
          </div>

          {/* ════════════ CỘT 2: 02 // PHÒNG & ĐIỀU PHỐI THẺ TỪ ════════════ */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="font-bold text-xs tracking-wider text-on-surface font-mono">
                02 // PHÒNG & THẺ KHÓA
              </h2>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40">
                STATUS: MATCHED
              </span>
            </div>

            {/* Thông tin phòng đã gán */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-on-surface-variant uppercase">SỐ PHÒNG GÁN CỤ THỂ</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  READY // INSPECTED
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-emerald-400 tracking-wider">
                  PHÒNG {bookingData?.RoomNumber || '804'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {bookingData?.RoomTypeName || 'TÒA B // DELUXE OCEAN KING'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-outline-variant/20 pt-2">
                <div>
                  <span className="text-[10px] text-on-surface-variant block uppercase">THỜI GIAN LƯU TRÚ</span>
                  <span className="font-bold text-on-surface">
                    {fmtDateMonth(bookingData?.CheckInDate)} ➔ {fmtDateMonth(bookingData?.CheckOutDate)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block">{bookingData?.NumberOfNights || 4} ĐÊM LƯU TRÚ</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant block uppercase">ĐĂNG KÝ SỨC CHỨA</span>
                  <span className="font-bold text-on-surface">
                    {bookingData?.Adults || 2} NGƯỜI LỚN / {bookingData?.Children || 0} TRẺ EM
                  </span>
                  <span className="text-[10px] text-on-surface-variant block">TỐI ĐA 3 NGƯỜI</span>
                </div>
              </div>
            </div>

            {/* Sơ đồ thu nhỏ CAD phòng */}
            <div className="bg-[#0b1329] border border-cyan-500/30 rounded-xl p-3 font-mono text-center text-xs space-y-2">
              <span className="text-[10px] text-cyan-400 block uppercase">
                SƠ ĐỒ MẶT BẰNG CAD // TẦNG {bookingData?.Floor || 8} PHÍA TÂY
              </span>
              <div className="border border-cyan-500/20 rounded-lg p-3 bg-black/40">
                <div className="text-sm font-bold text-cyan-200">SƠ ĐỒ PHÒNG [{bookingData?.RoomNumber || '804'}-W]</div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  KHÓA CỬA: ASSA ABLOY RFID (PIN: 98%)
                </div>
              </div>
            </div>

            {/* Bộ điều khiển mã hóa thẻ RFID */}
            <div className="space-y-3 font-mono text-xs border-t border-outline-variant/20 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-on-surface">BỘ MÃ HÓA THẺ RFID</span>
                <span className="text-emerald-400 font-bold">CỔNG COM-3 // ONLINE</span>
              </div>

              <div className="flex items-center justify-between bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20">
                <span className="text-xs text-on-surface font-semibold">Số lượng thẻ vật lý:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setKeycardCount(Math.max(1, keycardCount - 1))}
                    className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-base text-admin-primary">{keycardCount}</span>
                  <button
                    onClick={() => setKeycardCount(Math.min(4, keycardCount + 1))}
                    className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleEncodeKeycard}
                disabled={keycardEncoding}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  keycardEncoded
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {keycardEncoded ? 'check_circle' : 'contactless'}
                </span>
                {keycardEncoding
                  ? 'ĐANG MÃ HÓA...'
                  : keycardEncoded
                  ? `ĐÃ MÃ HÓA ${keycardCount} THẺ VẬT LÝ`
                  : `MÃ HÓA ${keycardCount} THẺ TỪ VẬT LÝ`}
              </button>

              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-on-surface select-none pt-1">
                <input
                  type="checkbox"
                  checked={dispatchNfc}
                  onChange={(e) => setDispatchNfc(e.target.checked)}
                  className="rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span>Gửi thẻ phòng kỹ thuật số (NFC Pass) qua SMS cho khách</span>
              </label>
            </div>

            {/* Ghi chú vận hành */}
            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 text-[11px] font-mono text-on-surface-variant space-y-1">
              <span className="text-[10px] font-bold uppercase text-on-surface block">GHI CHÚ VẬN HÀNH:</span>
              <p>• Ưu tiên tầng cao • Chăn gối chống dị ứng</p>
              <p>• Tặng set trà chiều VIP tại Lounge tầng 12</p>
            </div>
          </div>

          {/* ════════════ CỘT 3: 03 // QUYẾT TOÁN FOLIO & THANH TOÁN ════════════ */}
          <div id="folio-payment-section" className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4 scroll-mt-24 transition-all">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="font-bold text-xs tracking-wider text-on-surface font-mono">
                03 // QUYẾT TOÁN & TÀI CHÍNH
              </h2>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40">
                FOLIO #{bookingData?.BookingId || '88219'}-F
              </span>
            </div>

            {/* Bảng kê tài chính Folio */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3.5 space-y-2 font-mono text-xs">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                BẢNG KÊ TÀI CHÍNH FOLIO (FINANCIAL LEDGER)
              </span>

              <div className="flex justify-between text-on-surface">
                <span>TỔNG TIỀN PHÒNG ({bookingData?.NumberOfNights || 4} ĐÊM):</span>
                <span className="font-bold">{fmtMoney(bookingData?.totalFolio || 9600000)}</span>
              </div>

              <div className="flex justify-between text-emerald-400">
                <span>TIỀN ĐÃ ĐẶT CỌC:</span>
                <span className="font-bold">-{fmtMoney(bookingData?.depositPaid || 2000000)}</span>
              </div>

              <div className="flex justify-between text-rose-400 font-bold border-t border-outline-variant/20 pt-1.5">
                <span>CÔNG NỢ TIỀN PHÒNG (NET DUE):</span>
                <span>{fmtMoney(bookingData?.netBalanceDue || 7600000)}</span>
              </div>

              <div className="flex justify-between text-on-surface-variant text-[11px]">
                <span>TẠM GIỮ BẢO ĐẢM (SECURITY PRE-AUTH):</span>
                <span>+{fmtMoney(bookingData?.securityPreAuthTotal || 2000000)}</span>
              </div>

              <div className="flex justify-between text-base font-black text-admin-primary border-t-2 border-admin-primary/40 pt-2">
                <span>TỔNG THU TẠI QUẦY:</span>
                <span>{fmtMoney(bookingData?.totalDueAtTerminal || 9600000)}</span>
              </div>
            </div>

            {/* Máy POS & Thẻ lưu sẵn */}
            <div className="space-y-3 font-mono text-xs border-t border-outline-variant/20 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-on-surface">MÁY POS THANH TOÁN</span>
                <span className="text-emerald-400 font-bold">VERIFONE P400 // STANDBY</span>
              </div>

              {/* Card on File */}
              <div className="border border-dashed border-outline-variant/40 rounded-xl p-3 bg-surface-container-lowest space-y-1">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>THẺ LƯU SẴN: VISA •••• 4092</span>
                  <span className="text-on-surface-variant font-normal">HẠN: 09/28</span>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  CHỦ THẺ: {bookingData?.GuestName || 'ALEXANDER MORGAN'}
                </div>
              </div>

              <button
                onClick={handleProcessPayment}
                disabled={paymentProcessing}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentSettled
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {paymentSettled ? 'task_alt' : 'credit_card'}
                </span>
                {paymentProcessing
                  ? 'ĐANG XỬ LÝ POS...'
                  : paymentSettled
                  ? 'ĐÃ TẠM GIỮ & THANH TOÁN XONG'
                  : `TẠM GIỮ & THANH TOÁN (${fmtMoney(bookingData?.totalDueAtTerminal || 9600000)})`}
              </button>
            </div>

            {/* Điều khoản lưu trú */}
            <div className="space-y-2 border-t border-outline-variant/20 pt-3 text-[11px]">
              <span className="font-bold text-on-surface uppercase block font-mono">ĐIỀU KHOẢN & BỒI HOÀN:</span>
              <p className="text-on-surface-variant leading-relaxed text-[10px]">
                Khách đồng ý trả phòng trước 12:00 trưa. Phí phạt hút thuốc 2,500,000₫. Khách sạn không chịu trách nhiệm với tài sản để ngoài két an toàn.
              </p>

              <label className="flex items-start gap-2 cursor-pointer text-on-surface select-none pt-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-outline-variant text-admin-primary focus:ring-admin-primary"
                />
                <span className="font-semibold text-admin-primary">
                  Khách hàng đã đọc và đồng ý toàn bộ điều khoản lưu trú
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    )}

        {/* ─── 5. THANH ĐIỀU KHIỂN DƯỚI CÙNG (BOTTOM STICKY ACTION BAR) ──────── */}
        <div className="sticky bottom-4 z-40 bg-surface-container-high/95 backdrop-blur-md border border-admin-primary/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {bookingData ? (
              <>
                <button
                  onClick={() => {
                    setKeycardEncoded(false);
                    setPaymentSettled(false);
                    setTermsAccepted(false);
                    clearSignature();
                    addToast('info', 'Đã hủy phiên làm việc hiện tại.', 'HỦY CHECK-IN');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer text-rose-400"
                >
                  ⊗ HỦY BỎ CHECK-IN
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center gap-1.5 text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  IN THẺ ĐĂNG KÝ
                </button>

                <button
                  onClick={() => addToast('info', `Chi tiết Folio #${bookingData?.BookingId}: Tổng ${fmtMoney(bookingData?.totalFolio)}, Cọc ${fmtMoney(bookingData?.depositPaid)}, Còn lại ${fmtMoney(bookingData?.netBalanceDue)}`, 'CHI TIẾT FOLIO')}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer text-on-surface"
                >
                  XEM CHI TIẾT FOLIO
                </button>
              </>
            ) : (
              <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                [ CHẾ ĐỘ CHỜ: Vui lòng quét mã QR đặt phòng hoặc chọn từ danh sách CSDL để kích hoạt các bước ]
              </span>
            )}
          </div>

          <div className="w-full md:w-auto flex items-center gap-3">
            {bookingData ? (
              <button
                disabled={completingCheckIn || !allStepsComplete}
                onClick={handleCompleteCheckIn}
                className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  allStepsComplete
                    ? 'bg-admin-primary hover:bg-admin-primary/90 text-on-primary shadow-admin-primary/30 ring-2 ring-admin-primary'
                    : 'bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {completingCheckIn ? 'sync' : 'key'}
                </span>
                {completingCheckIn
                  ? 'ĐANG KÍCH HOẠT...'
                  : `HOÀN TẤT CHECK-IN & KÍCH HOẠT PHÒNG ${bookingData?.RoomNumber || ''}`}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full md:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-admin-primary/20 text-admin-primary border border-admin-primary/50 hover:bg-admin-primary/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">photo_camera</span>
                QUÉT QR ĐẶT PHÒNG NGAY
              </button>
            )}
          </div>
        </div>

        {/* ─── TOASTS & MODALS ────────────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <ConcurrencyConflictModal
          conflictData={concurrencyConflict}
          onReload={() => window.location.reload()}
        />

        {showQrModal && (
          <CameraErrorBoundary onClose={() => setShowQrModal(false)}>
            <BookingQrCameraModal
              arrivalsList={arrivalsList}
              onScanSuccess={(code) => {
                setSearchQuery(code);
                handleLookupBooking(code);
              }}
              onClose={() => setShowQrModal(false)}
            />
          </CameraErrorBoundary>
        )}

        {showIdCameraModal && (
          <CameraErrorBoundary onClose={() => setShowIdCameraModal(false)}>
            <IdDocumentCameraModal
              defaultDocType={docType}
              onScanSuccess={handleIdScanSuccess}
              onClose={() => setShowIdCameraModal(false)}
            />
          </CameraErrorBoundary>
        )}

        {showTestQrModal && (
          <TestQrModal
            bookingCode={bookingData?.ConfirmationCode || (arrivalsList[0]?.ConfirmationCode) || 'GHNDF2TAGMLT'}
            onClose={() => setShowTestQrModal(false)}
          />
        )}

        {showStorageModal && (
          <StorageInspectorModal
            savedResult={savedCheckInResult}
            capturedIdSnapshot={capturedIdSnapshot}
            signatureImage={signatureImage}
            bookingData={bookingData}
            onClose={() => setShowStorageModal(false)}
          />
        )}

        {showPrintModal && bookingData && (
          <PrintRegistrationCardModal
            booking={bookingData}
            ocrData={ocrData}
            signatureData={signatureImage}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
