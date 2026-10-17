import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
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
                  <td className="bg-slate-50 p-2 font-semibold">Số CCCD / Hộ chiếu:</td>
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

// ─── Modal Quét Mã QR ──────────────────────────────────────────────────────
const QrScannerModal = ({ onScanSuccess, onClose }) => {
  const [sampleCodes] = useState([
    'GH3DEEBVYFLN',
    'GHR9Z3P4QZV7',
    'GHUY7B454JVF',
    'GHDZGKU84ZPL',
  ]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/40 max-w-md w-full p-6 text-on-surface space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-admin-primary">qr_code_scanner</span>
            <h3 className="font-bold text-sm">Quét Mã QR Đặt Phòng Của Khách</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Khung Quét Giả Lập Laser */}
        <div className="relative w-full aspect-square max-w-[260px] mx-auto bg-black rounded-2xl border-2 border-admin-primary/60 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle,#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
          {/* Animated Laser line */}
          <div className="absolute w-full h-1 bg-admin-primary shadow-[0_0_15px_#10b981] animate-bounce top-1/2 -translate-y-1/2"></div>
          <span className="material-symbols-outlined text-6xl text-admin-primary/40">qr_code_2</span>
          <span className="absolute bottom-3 text-[10px] font-mono text-emerald-400 bg-black/70 px-2 py-0.5 rounded">
            CAMERA FEED ACTIVE (720P)
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant text-center">Hoặc chọn nhanh mã QR mẫu đã lưu trong CSDL:</p>
          <div className="grid grid-cols-2 gap-2">
            {sampleCodes.map((code) => (
              <button
                key={code}
                onClick={() => {
                  onScanSuccess(code);
                  onClose();
                }}
                className="p-2 rounded-xl border border-outline-variant/30 bg-surface-container-high hover:bg-admin-primary/20 hover:border-admin-primary text-xs font-mono text-center transition-all cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>
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

  // Search input mã REF# / QR
  const [searchQuery, setSearchQuery] = useState(params.bookingId || searchParams.get('bookingId') || '1');
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // Modal QR & Modal In thẻ
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ─── CỘT 1: Quét OCR & Chữ Ký Điện Tử ───
  const [docType, setDocType] = useState('passport'); // 'passport' | 'natl_id' | 'driver_lic'
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(99.4);
  const [ocrData, setOcrData] = useState({
    legalFullName: 'ALEXANDER MORGAN',
    documentNumber: 'P-482190342',
    issuingState: 'Việt Nam (VNM)',
    birthDate: '1988-04-15',
    expirationDate: '2031-08-20',
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

  // Tự động load booking khi vào trang
  useEffect(() => {
    handleLookupBooking(searchQuery);
  }, []);

  // ─── 2. Thao tác Quét lại OCR (Re-Scan) ────────────────────────────────────
  const handleOcrScan = async () => {
    if (!docType) {
      addToast('warn', 'Vui lòng chọn loại giấy tờ.', 'CẢNH BÁO OCR');
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
        addToast('success', data.message, 'CHECK-IN HOÀN TẤT THÀNH CÔNG');
        // Nạp lại dữ liệu mới từ CSDL
        await handleLookupBooking(bookingData.BookingId);
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleLookupBooking()}
              disabled={loadingLookup}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-admin-primary hover:bg-admin-primary/90 text-on-primary font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">search</span>
              TRA CỨU HỒ SƠ
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-admin-primary/50 bg-admin-primary/10 hover:bg-admin-primary/20 text-admin-primary font-bold text-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">qr_code_scanner</span>
              QUÉT MÃ QR KHÁCH
            </button>
          </div>
        </div>

        {/* ─── 4. KHÔNG GIAN LÀM VIỆC 3 CỘT (MATCHING EXACT WIREFRAME) ──────── */}
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
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {[
                  { id: 'passport', label: 'HỘ CHIẾU' },
                  { id: 'natl_id', label: 'CCCD' },
                  { id: 'driver_lic', label: 'BẰNG LÁI' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDocType(t.id)}
                    className={`py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
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
            <div className="bg-[#0b1329] border border-cyan-500/40 rounded-xl p-4 text-center font-mono relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 border-b border-cyan-500/20 pb-1">
                <span>KHUNG QUÉT PHẦN CỨNG</span>
                <span className="font-bold text-emerald-400">[ ĐỘ TIN CẬY: {ocrConfidence}% ]</span>
              </div>

              {/* Viewport quét với reticles */}
              <div className="relative py-6 flex flex-col items-center justify-center space-y-1 border border-cyan-500/20 rounded-lg bg-black/40">
                <span className="material-symbols-outlined text-4xl text-cyan-400 animate-pulse">document_scanner</span>
                <p className="text-[11px] font-bold text-cyan-200">OPTICAL SCANNER FEED: CALIBRATED</p>
                <p className="text-[10px] text-cyan-400/80">MRZ LINE 1-2 DECODED // EMV CHIP VERIFIED</p>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-on-surface-variant">TỆP: P-482190342_RAW.TIF</span>
                <button
                  onClick={handleOcrScan}
                  disabled={ocrScanning}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold cursor-pointer transition-colors"
                >
                  {ocrScanning ? 'ĐANG QUÉT...' : 'QUÉT LẠI (RE-SCAN)'}
                </button>
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
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm space-y-4">
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

        {/* ─── 5. THANH ĐIỀU KHIỂN DƯỚI CÙNG (BOTTOM STICKY ACTION BAR) ──────── */}
        <div className="sticky bottom-4 z-40 bg-surface-container-high/95 backdrop-blur-md border border-admin-primary/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
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
          </div>

          <div className="w-full md:w-auto flex items-center gap-3">
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
                : `HOÀN TẤT CHECK-IN & KÍCH HOẠT PHÒNG ${bookingData?.RoomNumber || '804'}`}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* ─── TOASTS & MODALS ────────────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        <ConcurrencyConflictModal
          conflictData={concurrencyConflict}
          onReload={() => window.location.reload()}
        />

        {showQrModal && (
          <QrScannerModal
            onScanSuccess={(code) => {
              setSearchQuery(code);
              handleLookupBooking(code);
            }}
            onClose={() => setShowQrModal(false)}
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
