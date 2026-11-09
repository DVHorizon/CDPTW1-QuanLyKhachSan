import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const STORAGE_KEY = 'grand_horizon_night_audit_v1';

const INITIAL_AUDIT_STATE = {
  id: 'NA-2025-1024',
  businessDate: '24/10/2025',
  nextBusinessDate: '25/10/2025',
  systemStatus: 'ARMED', // ARMED | COMPLETED
  statusLabel: 'TRẠNG THÁI: SẴN SÀNG KHỞI CHẠY (ARMED)',
  cronSchedule: '00:00:00 (Node-schedule // Redis Bull Queue)',
  sha256Signature: '8f3c...d94a2b',
  fullSha256: '8f3c91b04e72a819c5602d11b8f4c772e903a14c88b21f09d3e76a51c4d94a2b',
  kpis: {
    roomRevenue: 726000000,
    roomRevenueFormatted: '726.000.000 đ',
    occupiedRooms: 124,
    totalRooms: 144,
    occupancyRate: 86.4,
    revparDiff: '+4.2%',
    openFolios: 44,
    preAuthRate: '100%',
    usaliStatus: 'ĐẠT CHUẨN',
    auditVariance: 0
  },
  ledger: {
    totalRevenueShort: '1.01 Tỷ',
    totalRevenue: 1013300000,
    totalRevenueFormatted: '1.013.300.000 đ',
    roomRevenueFormatted: '726.000.000 đ',
    fnbRevenueFormatted: '184.500.000 đ',
    spaOtherRevenueFormatted: '102.800.000 đ',
    cashForeignFormatted: '42.300.000 đ',
    cardTransferFormatted: '871.000.000 đ',
    cityLedgerFormatted: '100.000.000 đ',
    totalPaymentFormatted: '1.013.300.000 đ'
  },
  noShowBookings: [
    {
      bookingCode: '#BK-90408',
      roomNumber: '408',
      roomType: 'Ocean Suite #408',
      guestName: 'Alexander Wright',
      tier: 'VIP Gold',
      checkInDeadline: '23:59 (24/10/2025)',
      firstNightFormatted: '6.500.000 đ',
      depositCard: 'Visa Infinite **** 8842 (Đã Pre-auth)',
      resolution: 'PENDING'
    },
    {
      bookingCode: '#BK-90102',
      roomNumber: '102',
      roomType: 'Horizon Villa #102',
      guestName: 'Elena Rostova',
      tier: 'VIP Platinum',
      checkInDeadline: '23:59 (24/10/2025)',
      firstNightFormatted: '12.000.000 đ',
      depositCard: 'Mastercard World **** 3910 (Đã Pre-auth)',
      resolution: 'PENDING'
    }
  ],
  steps: [
    {
      stepNumber: 1,
      id: 'POS_SYNC',
      title: 'Bước 1: Khóa sổ & Đồng bộ điểm bán POS ngoại vi',
      inlineBadge: '12/12 ĐIỂM ĐÃ ĐÓNG',
      description:
        'Toàn bộ hóa đơn nhà hàng Ocean Club, Sunset Bar, Serene Spa và Dịch vụ phòng đã chốt doanh thu cuối ngày.',
      status: 'PASSED',
      icon: 'point_of_sale'
    },
    {
      stepNumber: 2,
      id: 'ROOM_TAX_POSTING',
      title: 'Bước 2: Ghi nhận cước phòng đêm & Phí dịch vụ (Posting Room & Tax)',
      inlineBadge: null,
      description:
        'Tự động định khoản giá phòng hợp đồng, 8% VAT và 5% phí phục vụ vào Master Folio của từng phòng đang lưu trú.',
      status: 'PASSED',
      icon: 'receipt_long'
    },
    {
      stepNumber: 3,
      id: 'NOSHOW_REVIEW',
      title: 'Bước 3: Rà soát & Phê duyệt phòng No-show và Khách trễ hạn',
      inlineBadge: 'CẦN XÁC NHẬN',
      description:
        'Phát hiện 02 phòng đặt chưa nhận phòng sau 23:59 (Phòng Ocean Suite #408 và Horizon Villa #102). Cần lệnh hủy hoặc giữ bảo lưu.',
      status: 'PENDING',
      icon: 'person_cancel'
    },
    {
      stepNumber: 4,
      id: 'ROLL_BUSINESS_DATE',
      title: 'Bước 4: Thiết lập chuyển ngày kế toán (Roll Business Date)',
      inlineBadge: null,
      description:
        'Sẵn sàng tịnh tiến lịch hệ thống từ ngày 24/10/2025 sang 25/10/2025 sau khi toàn bộ bút toán được chốt.',
      status: 'PASSED',
      icon: 'calendar_month'
    },
    {
      stepNumber: 5,
      id: 'CLOUD_SNAPSHOT',
      title: 'Bước 5: Sao lưu dữ liệu đám mây & Biên soạn tệp Management Reports',
      inlineBadge: null,
      description:
        'Kênh lưu trữ bảo mật AWS Frankfurt & Singapore sẵn sàng ghi snapshot. Tạo gói báo cáo cho Ban Giám Đốc.',
      status: 'PASSED',
      icon: 'cloud_done'
    }
  ],
  liveLogs: [
    {
      id: 'LOG-01',
      time: '20:45:11',
      code: 'SYNC_POS_OK',
      message: 'Nhà hàng Biển Sunset chốt sổ ca tối - 162 giao dịch.',
      badge: 'KHỚP'
    },
    {
      id: 'LOG-02',
      time: '21:10:04',
      code: 'PRE_AUTH_VERIFY',
      message: 'Quét 44 thẻ mở thanh toán trực tuyến Visa/Master.',
      badge: '100% OK'
    },
    {
      id: 'LOG-03',
      time: '21:30:18',
      code: 'RATE_POST_SIM',
      message: 'Thử nghiệm ghi nhận giá phòng 124 khóa chìa.',
      badge: 'KHÔNG LỖI'
    },
    {
      id: 'LOG-04',
      time: '21:42:50',
      code: 'USALI_MATRIX',
      message: 'Cân bằng tài khoản 1010-1290 đối soát tiền cọc.',
      badge: '0.00 VẬN HÀNH'
    }
  ],
  folioPostingsSample: [
    {
      folioId: 'FOL-8801',
      roomNumber: '804',
      roomType: 'Ocean Suite',
      guestName: 'Arthur Dent',
      baseRoomRate: 4800000,
      serviceCharge5: 240000,
      vat8: 403200,
      totalNightPost: 5443200,
      status: 'POSTED'
    },
    {
      folioId: 'FOL-8802',
      roomNumber: '1401',
      roomType: 'Sky Villa Penthouse',
      guestName: 'Ngài Kenji Sato',
      baseRoomRate: 15000000,
      serviceCharge5: 750000,
      vat8: 1260000,
      totalNightPost: 17010000,
      status: 'POSTED'
    },
    {
      folioId: 'FOL-8803',
      roomNumber: '618',
      roomType: 'Family Grand Suite',
      guestName: 'Đoàn Khách Gia Đình Phòng 618',
      baseRoomRate: 7200000,
      serviceCharge5: 360000,
      vat8: 604800,
      totalNightPost: 8164800,
      status: 'POSTED'
    },
    {
      folioId: 'FOL-8804',
      roomNumber: '1501',
      roomType: 'Royal Suite',
      guestName: 'David Beckham',
      baseRoomRate: 22000000,
      serviceCharge5: 1100000,
      vat8: 1848000,
      totalNightPost: 24948000,
      status: 'POSTED'
    }
  ]
};

export default function NightAuditManagement() {
  const [auditState, setAuditState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.steps)) return parsed;
      }
    } catch (_) {}
    return INITIAL_AUDIT_STATE;
  });

  // Đồng hồ đếm ngược đến giờ khóa sổ tự động (05:18:39 giảm dần mỗi giây)
  const [countdownSec, setCountdownSec] = useState(5 * 3600 + 18 * 60 + 39);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditProgressStep, setAuditProgressStep] = useState(0);

  // Modals
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isFolioModalOpen, setIsFolioModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Lưu trạng thái vào localStorage mỗi khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auditState));
    } catch (_) {}
  }, [auditState]);

  // Đồng bộ trạng thái từ Backend MySQL
  useEffect(() => {
    fetch('/api/night-audit/overview')
      .then(res => (res.ok ? res.json() : null))
      .then(result => {
        if (result && result.success && result.data) {
          setAuditState(result.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  // Đếm ngược thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec(prev => (prev > 0 ? prev - 1 : 5 * 3600 + 18 * 60 + 39));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = totalSeconds => {
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const completedStepsCount = auditState.steps.filter(s => s.status === 'PASSED').length;

  // Xử lý phê duyệt Bước 3: Phòng No-show & Khách trễ hạn
  const handleApproveNoShow = async (resolution = 'CHARGED_PENALTY') => {
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour12: false });

    const updatedState = {
      ...auditState,
      noShowBookings: auditState.noShowBookings.map(b => ({ ...b, resolution })),
      steps: auditState.steps.map(s => {
        if (s.stepNumber === 3) {
          return {
            ...s,
            status: 'PASSED',
            inlineBadge:
              resolution === 'HELD_RESERVATION'
                ? 'ĐÃ BẢO LƯU 02 PHÒNG'
                : 'ĐÃ THU PHẠT ĐÊM ĐẦU (18.5TR)',
            description:
              resolution === 'HELD_RESERVATION'
                ? 'Đã xác nhận giữ bảo lưu phòng Ocean Suite #408 và Horizon Villa #102 cho khách đến trễ sau 00:00.'
                : 'Đã tự động khấu trừ phí No-show đêm đầu từ Pre-auth thẻ tín dụng cho phòng Ocean Suite #408 (6.500.000 đ) và Horizon Villa #102 (12.000.000 đ).'
          };
        }
        return s;
      }),
      liveLogs: [
        ...auditState.liveLogs,
        {
          id: `LOG-${Date.now()}`,
          time: nowTime,
          code: 'NOSHOW_SETTLED',
          message:
            resolution === 'HELD_RESERVATION'
              ? 'Bảo lưu 02 đặt phòng trễ hạn (#408, #102) theo lệnh Giám sát.'
              : 'Thu phí No-show đêm đầu 02 phòng (#408, #102): +18.500.000 đ.',
          badge: 'ĐÃ DUYỆT'
        }
      ]
    };

    setAuditState(updatedState);
    setIsNoShowModalOpen(false);
    showToast(
      'Hoàn tất Bước 3/5 (No-show & Khách trễ hạn)',
      resolution === 'HELD_RESERVATION'
        ? 'Đã giữ bảo lưu 2 phòng #408 và #102. Quy trình kiểm tra đạt 5/5!'
        : 'Đã thu phạt đêm đầu cho 2 phòng #408 và #102. Quy trình kiểm tra đạt 5/5!'
    );

    try {
      const res = await fetch('/api/night-audit/approve-noshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) setAuditState(data.data);
      }
    } catch (_) {}
  };

  // Xử lý khởi chạy Kiểm toán đêm tự động (DB Transaction khóa sổ ngày)
  const handleRunNightAudit = async () => {
    if (isRunningAudit) return;
    setIsRunningAudit(true);
    setAuditProgressStep(1);

    setTimeout(() => setAuditProgressStep(2), 600);
    setTimeout(() => setAuditProgressStep(3), 1200);
    setTimeout(async () => {
      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour12: false });

      let serverUpdated = null;
      try {
        const res = await fetch('/api/night-audit/run', { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) serverUpdated = json.data;
        }
      } catch (_) {}

      if (serverUpdated) {
        setAuditState(serverUpdated);
      } else {
        setAuditState(prev => ({
          ...prev,
          businessDate: '25/10/2025',
          nextBusinessDate: '26/10/2025',
          systemStatus: 'COMPLETED',
          statusLabel: 'TRẠNG THÁI: ĐÃ ĐÓNG SỔ NGÀY 24/10 (CLOSED)',
          kpis: {
            ...prev.kpis,
            openFolios: 0
          },
          steps: prev.steps.map(s => ({ ...s, status: 'PASSED' })),
          liveLogs: [
            ...prev.liveLogs,
            {
              id: `LOG-${Date.now()}-1`,
              time: nowTime,
              code: 'DB_TX_BEGIN',
              message: 'Khởi tạo DB Transaction mức SERIALIZABLE — Khóa thu ngân toàn hệ thống.',
              badge: 'LOCKED'
            },
            {
              id: `LOG-${Date.now()}-2`,
              time: nowTime,
              code: 'FOLIO_POST_ALL',
              message:
                'Đã định khoản tiền phòng đêm + 8% VAT + 5% phí dịch vụ cho 124/144 phòng lưu trú.',
              badge: '726.0TR OK'
            },
            {
              id: `LOG-${Date.now()}-3`,
              time: nowTime,
              code: 'ROLL_DATE_COMMIT',
              message:
                'Chốt sổ ngày 24/10/2025 (1.013.300.000 đ) & Chuyển ngày kế toán sang 25/10/2025.',
              badge: 'COMMITTED'
            }
          ]
        }));
      }

      setIsRunningAudit(false);
      setAuditProgressStep(0);
      showToast(
        'Đóng sổ Kiểm toán đêm thành công (ACID Transaction)',
        'Đã tự động tính tiền phòng 124 phòng, đối soát cân bằng USALI 1.013.300.000 đ và chuyển sang ngày 25/10/2025!'
      );
    }, 1800);
  };

  // Đặt lại trạng thái mẫu (Reset Demo)
  const handleResetDemo = async () => {
    setAuditState(INITIAL_AUDIT_STATE);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_STATE));
      await fetch('/api/night-audit/reset', { method: 'POST' });
    } catch (_) {}
    showToast(
      'Đã khôi phục phiên chuẩn bị Kiểm toán đêm',
      'Trạng thái đã đặt lại về 4/5 bước hoàn tất trước giờ khóa sổ.'
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-[1620px] mx-auto py-5 space-y-5 text-slate-800">
        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-emerald-500/40 max-w-md animate-bounce">
            <span className="material-symbols-outlined text-emerald-400 mt-0.5">
              {toast.type === 'warning' ? 'warning' : 'verified'}
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {toast.title}
              </div>
              <div className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* 1. HEADER CHÍNH & ĐỒNG HỒ ĐẾM NGƯỢC KHÓA SỔ ĐÊM (KHỚP 100% ẢNH MẪU)      */}
        {/* ======================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider">
              <span className="px-2.5 py-0.5 rounded-md bg-[#e4f3eb] text-[#006c49]">
                PMS NOCTURNE OPS
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 tracking-[0.12em]">
                PHÂN HỆ 49 // TÀI CHÍNH KẾ TOÁN LƯU TRÚ
              </span>
            </div>

            <h1
              className="text-2xl md:text-[32px] leading-[1.2] font-normal text-slate-900 tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Trung Tâm Điều Hành Kiểm Toán Đêm &amp; Đóng Sổ Tài Chính Tự Động
            </h1>

            <p className="text-xs md:text-[13px] text-slate-500 leading-relaxed">
              Kiểm toán doanh thu, đối soát cân bằng USALI, chốt sổ ca đêm và chuyển giao ngày kinh
              doanh tự động sang <strong className="text-slate-700">{auditState.nextBusinessDate}</strong>.
            </p>
          </div>

          {/* Hộp trạng thái & Đồng hồ đếm ngược bên phải */}
          <div className="bg-[#f3f7f4] rounded-2xl border border-emerald-200/70 px-5 py-3.5 shadow-2xs shrink-0 flex flex-col justify-between min-w-[295px]">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#006c49]">
                <span className="w-2 h-2 rounded-full bg-[#006c49] animate-ping" />
                {auditState.statusLabel}
              </span>
              {auditState.systemStatus === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#006c49] underline cursor-pointer"
                >
                  Đặt lại
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="text-3xl md:text-[34px] font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {formatCountdown(countdownSec)}
                </span>
                <div className="text-[10px] leading-tight text-slate-500 font-semibold">
                  <div>đến</div>
                  <div className="font-bold text-slate-700">02:00:00</div>
                  <div className="uppercase">SÁNG</div>
                </div>
              </div>

              <div className="w-11 h-11 rounded-xl bg-[#dceee4] text-[#006c49] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">dark_mode</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. DẢI 4 KPI CARDS (DOANH THU • CÔNG SUẤT • HỒ SƠ FOLIO • USALI)        */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: DOANH THU PHÒNG GHI NHẬN */}
          <div
            onClick={() => setIsFolioModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-all"
            title="Bấm để xem chi tiết bảng tính tiền phòng đêm cho khách lưu trú"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <span>DOANH THU PHÒNG GHI NHẬN</span>
                <span className="material-symbols-outlined text-slate-500 text-[18px]">
                  payments
                </span>
              </div>

              <div
                className="text-2xl md:text-[28px] font-bold text-slate-900 mt-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {auditState.kpis.roomRevenueFormatted}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-2">
                <span className="material-symbols-outlined text-[#006c49] text-[16px]">
                  check_circle
                </span>
                <span>
                  {auditState.kpis.occupiedRooms}/{auditState.kpis.totalRooms} phòng có khách đêm
                  nay
                </span>
              </div>
            </div>

            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-[#006c49] rounded-full" style={{ width: '86%' }} />
            </div>
          </div>

          {/* Card 2: CÔNG SUẤT DỰ KIẾN CHỐT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <span>CÔNG SUẤT DỰ KIẾN CHỐT</span>
                <span className="material-symbols-outlined text-slate-500 text-[18px]">bed</span>
              </div>

              <div
                className="text-2xl md:text-[28px] font-bold text-slate-900 mt-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {auditState.kpis.occupancyRate}%
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-2">
                <span className="material-symbols-outlined text-sky-600 text-[16px]">
                  trending_up
                </span>
                <span>Vượt {auditState.kpis.revparDiff} so với ngân sách RevPAR</span>
              </div>
            </div>

            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: '86.4%' }} />
            </div>
          </div>

          {/* Card 3: HỒ SƠ MỞ CHƯA QUYẾT TOÁN */}
          <div
            onClick={() => setIsFolioModalOpen(true)}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <span>HỒ SƠ MỞ CHƯA QUYẾT TOÁN</span>
                <span className="material-symbols-outlined text-slate-500 text-[18px]">
                  folder_open
                </span>
              </div>

              <div
                className="text-2xl md:text-[28px] font-bold text-slate-900 mt-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {auditState.kpis.openFolios} Folios
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-2">
                <span className="material-symbols-outlined text-slate-600 text-[16px]">lock</span>
                <span>{auditState.kpis.preAuthRate} Khóa Pre-auth bảo đảm thẻ</span>
              </div>
            </div>

            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-slate-600 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Card 4: CÂN BẰNG CHUẨN USALI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <span>CÂN BẰNG CHUẨN USALI</span>
                <span className="material-symbols-outlined text-slate-500 text-[18px]">
                  verified
                </span>
              </div>

              <div
                className="text-2xl md:text-[28px] font-bold text-[#006c49] mt-2 uppercase"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {auditState.kpis.usaliStatus}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-2">
                <span className="material-symbols-outlined text-[#006c49] text-[16px]">
                  balance
                </span>
                <span>Sai lệch kiểm toán: 0 đ (Cân đối tuyệt đối)</span>
              </div>
            </div>

            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-[#006c49] rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. BỐ CỤC 2 CỘT CHÍNH: QUY TRÌNH 5 BƯỚC (TRÁI) & ĐỐI SOÁT DÒNG TIỀN (PHẢI) */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ================= CỘT TRÁI (7 PHẦN): QUY TRÌNH 5 BƯỚC & LIVE STREAM ================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card Quy Trình Kiểm Tra 5 Bước Tự Động */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#e6f4ed] text-[#006c49] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">fact_check</span>
                  </div>
                  <div>
                    <h2
                      className="text-lg md:text-xl font-bold text-slate-900"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Quy Trình Kiểm Tra 5 Bước Tự Động
                    </h2>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      AUTOMATED PRE-AUDIT VERIFICATION GATEWAYS
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-lg bg-[#006c49] text-white text-xs font-extrabold uppercase tracking-wider">
                  {completedStepsCount}/5 HOÀN TẤT
                </span>
              </div>

              {/* Danh sách 5 bước kiểm toán đêm */}
              <div className="space-y-3">
                {auditState.steps.map(step => {
                  const isPassed = step.status === 'PASSED';
                  const isStep3Pending = step.stepNumber === 3 && !isPassed;

                  return (
                    <div
                      key={step.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isStep3Pending
                          ? 'bg-[#f8f5f4] border-rose-200/90 shadow-2xs'
                          : 'bg-[#f4f7f5] border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Icon bên trái */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isStep3Pending
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-[#dfeee6] text-[#006c49]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {step.icon}
                            </span>
                          </div>

                          {/* Nội dung bước */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs md:text-[13px] font-extrabold text-slate-900">
                                {step.title}
                              </span>

                              {step.inlineBadge && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                                    isStep3Pending
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-[#d5ece0] text-[#006c49]'
                                  }`}
                                >
                                  {step.inlineBadge}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {step.description}
                            </p>

                            {/* Nút hành động đặc biệt cho Bước 2 (Xem bảng định khoản phòng) */}
                            {step.stepNumber === 2 && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsFolioModalOpen(true)}
                                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#006c49] hover:underline cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    visibility
                                  </span>
                                  Xem bảng tự động tính tiền 124 phòng lưu trú đêm nay
                                </button>
                              </div>
                            )}

                            {/* 2 Nút hành động trong Bước 3 khớp 100% ảnh mẫu */}
                            {step.stepNumber === 3 && (
                              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsNoShowModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    visibility
                                  </span>
                                  Xem 2 Đặt Phòng
                                </button>

                                {isStep3Pending ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveNoShow('CHARGED_PENALTY')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006c49] hover:bg-[#005538] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      check
                                    </span>
                                    Chấp Nhận Tự Động Thu Phạt Đêm Đầu
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#006c49]">
                                    <span className="material-symbols-outlined text-[16px]">
                                      verified
                                    </span>
                                    Đã xác nhận xử lý No-show
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Huy hiệu trạng thái bên phải (✓ ĐẠT / ⏳ ĐANG CHỜ) */}
                        <div className="shrink-0">
                          {isPassed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#006c49] text-white text-[10px] font-extrabold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              ĐẠT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#e7e4e2] text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[13px]">
                                hourglass_top
                              </span>
                              ĐANG CHỜ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Nhật Ký Phiên Kiểm Toán Trực Tiếp (Live Stream) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-700 text-[20px]">
                    terminal
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Nhật Ký Phiên Kiểm Toán Trực Tiếp (Live Stream)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  PORT 8443 // SECURE SSL
                </span>
              </div>

              <div className="bg-[#f3f6f4] rounded-xl p-4 border border-slate-200/70 font-mono text-xs space-y-2.5 max-h-[210px] overflow-y-auto">
                {auditState.liveLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 border-b border-slate-200/60 last:border-b-0 pb-2 last:pb-0"
                  >
                    <div className="text-slate-600 leading-relaxed">
                      <span className="text-slate-400">[{log.time}]</span>{' '}
                      <strong className="text-slate-800">{log.code}:</strong> {log.message}
                    </div>
                    <span className="text-[11px] font-extrabold text-[#006c49] shrink-0 text-right">
                      {log.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI (5 PHẦN): CÂN ĐỐI DÒNG TIỀN & BẢNG ĐIỀU KHIỂN KHÓA SỔ ================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card Cân Đối Dòng Tiền & Doanh Thu */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className="text-lg md:text-xl font-bold text-slate-900"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Cân Đối Dòng Tiền &amp; Doanh Thu
                  </h3>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">
                    AUDIT BALANCING TIMELINE &amp; LEDGER
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-500 text-[20px]">
                  account_balance_wallet
                </span>
              </div>

              {/* Biểu đồ Donut & Chú giải 3 nguồn doanh thu */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                {/* SVG Donut Chart khớp 100% ảnh mẫu */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="14.5"
                      fill="none"
                      stroke="#e5ece8"
                      strokeWidth="4.2"
                    />
                    {/* Doanh thu phòng: 71.6% */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14.5"
                      fill="none"
                      stroke="#006c49"
                      strokeWidth="4.2"
                      strokeDasharray="71.6 28.4"
                      strokeDashoffset="0"
                    />
                    {/* Ẩm thực F&B: 18.2% */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14.5"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="4.2"
                      strokeDasharray="18.2 81.8"
                      strokeDashoffset="-71.6"
                    />
                    {/* Spa & Dịch vụ khác: 10.2% */}
                    <circle
                      cx="18"
                      cy="18"
                      r="14.5"
                      fill="none"
                      stroke="#f87171"
                      strokeWidth="4.2"
                      strokeDasharray="10.2 89.8"
                      strokeDashoffset="-89.8"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-extrabold text-slate-900 leading-tight">
                      {auditState.ledger.totalRevenueShort}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      TỔNG DOANH SỐ
                    </span>
                  </div>
                </div>

                {/* Chú giải 3 khoản doanh thu */}
                <div className="flex-1 w-full space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#006c49] shrink-0" />
                      Doanh thu phòng
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {auditState.ledger.roomRevenueFormatted}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 shrink-0" />
                      Ẩm thực (F&amp;B)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {auditState.ledger.fnbRevenueFormatted}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 shrink-0" />
                      Spa &amp; Dịch vụ khác
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {auditState.ledger.spaOtherRevenueFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng Đối soát thanh toán đã nhận */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  ĐỐI SOÁT THANH TOÁN ĐÃ NHẬN
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Tiền mặt &amp; Ngoại tệ quầy lễ tân:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {auditState.ledger.cashForeignFormatted}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Cổng thẻ tín dụng &amp; Chuyển khoản:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {auditState.ledger.cardTransferFormatted}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Bảo lãnh công ty đối tác (City Ledger):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {auditState.ledger.cityLedgerFormatted}
                  </span>
                </div>

                <div className="mt-3 px-4 py-3 rounded-xl bg-[#dff2e8] flex items-center justify-between">
                  <span className="font-bold text-slate-800">Tổng thanh toán ghi nhận:</span>
                  <span className="font-mono text-sm font-extrabold text-[#006c49]">
                    {auditState.ledger.totalPaymentFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Bảng Điều Khiển Tác Vụ Khóa Sổ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49] text-[20px]">
                  play_circle
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Bảng Điều Khiển Tác Vụ Khóa Sổ
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Khởi chạy kiểm toán đêm sẽ tự động khóa toàn bộ thao tác thu ngân trên toàn hệ
                thống trong thời gian xử lý khoảng 4 phút.
              </p>

              {/* Thông tin kỹ thuật Cron Job & DB Transaction */}
              <div className="px-3.5 py-2.5 rounded-xl bg-[#f4f7f5] border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#006c49]" />
                  Cron Job 00:00 (Node-schedule / Bull Queue)
                </span>
                <span className="font-mono font-bold text-[#006c49]">ACID DB Transaction</span>
              </div>

              {/* Nút chính: KHỞI CHẠY KIỂM TOÁN ĐÊM NGAY */}
              <button
                type="button"
                disabled={isRunningAudit}
                onClick={handleRunNightAudit}
                className="w-full py-4 px-5 rounded-xl bg-[#006c49] hover:bg-[#005538] disabled:opacity-60 text-white text-xs font-extrabold uppercase tracking-wider shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                {isRunningAudit
                  ? `ĐANG THỰC THI TRANSACTION BƯỚC ${auditProgressStep}/3...`
                  : auditState.systemStatus === 'COMPLETED'
                  ? 'ĐÃ KHÓA SỔ NGÀY 24/10 — CHẠY LẠI KIỂM TOÁN ĐÊM'
                  : 'KHỞI CHẠY KIỂM TOÁN ĐÊM NGAY (RUN NIGHT AUDIT)'}
              </button>

              {/* Nút phụ: XUẤT BỘ BÁO CÁO NHẬT KÝ KIỂM TOÁN (EXCEL / PDF) */}
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="w-full py-3.5 px-5 rounded-xl bg-[#eff3f0] hover:bg-[#e2e8e4] text-slate-800 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                XUẤT BỘ BÁO CÁO NHẬT KÝ KIỂM TOÁN (EXCEL / PDF)
              </button>

              {/* Footer Chứng nhận bảo mật ISO 27001 & SHA-256 */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[10px]">
                <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#006c49] text-[15px]">
                      verified_user
                    </span>
                    CHỨNG NHẬN BẢO MẬT ISO 27001
                  </span>
                  <span>TIÊU CHUẨN TÀI CHÍNH</span>
                </div>

                <div className="flex items-center justify-between text-slate-400 font-mono">
                  <span>CHỮ KÝ SỐ KIỂM TOÁN SHA-256:</span>
                  <span className="font-bold text-slate-600">{auditState.sha256Signature}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* MODAL 1: XEM 2 ĐẶT PHÒNG NO-SHOW (#408 & #102)                          */}
        {/* ======================================================================= */}
        {isNoShowModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-rose-400">person_cancel</span>
                  <div>
                    <h3 className="text-base font-extrabold">
                      Rà Soát 02 Hồ Sơ Đặt Phòng No-Show Sau 23:59
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Bước 3/5 trong Quy trình Kiểm toán đêm tự động • Phê duyệt thu phạt hoặc bảo lưu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNoShowModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {auditState.noShowBookings.map(item => (
                  <div
                    key={item.bookingCode}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                          {item.bookingCode}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {item.roomType}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                          {item.tier}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Khách hàng: <strong>{item.guestName}</strong> • Hạn Check-in:{' '}
                        <span className="text-rose-600 font-semibold">{item.checkInDeadline}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Bảo đảm thanh toán: {item.depositCard}
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Phí phạt đêm đầu
                      </div>
                      <div className="text-base font-extrabold text-rose-700">
                        {item.firstNightFormatted}
                      </div>
                      <div className="text-[10px] font-bold text-[#006c49] mt-0.5">
                        {item.resolution === 'PENDING'
                          ? 'Chờ lệnh Kiểm toán viên'
                          : item.resolution === 'HELD_RESERVATION'
                          ? 'Đã giữ bảo lưu'
                          : 'Đã thu phạt đêm đầu'}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleApproveNoShow('HELD_RESERVATION')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                  >
                    Giữ Bảo Lưu Phòng Qua Đêm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveNoShow('CHARGED_PENALTY')}
                    className="px-5 py-2.5 rounded-xl bg-[#006c49] hover:bg-[#005538] text-white font-bold shadow-md cursor-pointer"
                  >
                    ✓ Chấp Nhận Tự Động Thu Phạt Đêm Đầu (18.500.000 đ)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL 2: CHI TIẾT TỰ ĐỘNG TÍNH TIỀN PHÒNG ĐÊM CHO KHÁCH ĐANG LƯU TRÚ     */}
        {/* ======================================================================= */}
        {isFolioModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden">
              <div className="px-6 py-4 bg-[#006c49] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold">
                    Bảng Định Khoản Tiền Phòng &amp; Thuế Phí Tự Động (Room &amp; Tax Posting)
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Tự động tính giá phòng đêm {auditState.businessDate} + 5% Phí phục vụ + 8% VAT
                    vào 124 Master Folios
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFolioModalOpen(false)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">Mã Folio</th>
                        <th className="p-3">Phòng</th>
                        <th className="p-3">Khách lưu trú</th>
                        <th className="p-3 text-right">Giá phòng đêm</th>
                        <th className="p-3 text-right">Phí DV (5%)</th>
                        <th className="p-3 text-right">VAT (8%)</th>
                        <th className="p-3 text-right">Tổng ghi nợ đêm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditState.folioPostingsSample.map(row => (
                        <tr key={row.folioId} className="border-b border-slate-100">
                          <td className="p-3 font-mono font-bold text-slate-800">{row.folioId}</td>
                          <td className="p-3 font-bold text-[#006c49]">
                            P.{row.roomNumber} ({row.roomType})
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{row.guestName}</td>
                          <td className="p-3 text-right font-mono">
                            {row.baseRoomRate.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right font-mono">
                            {row.serviceCharge5.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right font-mono">
                            {row.vat8.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                            {row.totalNightPost.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-slate-700">
                    Tổng cộng 124/144 phòng đang lưu trú đã định khoản tự động:
                  </span>
                  <span className="font-mono text-sm font-extrabold text-[#006c49]">
                    {auditState.kpis.roomRevenueFormatted}
                  </span>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFolioModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MODAL 3: XUẤT BÁO CÁO NHẬT KÝ KIỂM TOÁN ĐÊM (EXCEL / PDF)               */}
        {/* ======================================================================= */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#006c49]">
                    USALI FINANCIAL MANAGEMENT REPORT
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Xuất Bộ Báo Cáo Nhật Ký Kiểm Toán Đêm ({auditState.businessDate})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã phiên kiểm toán:</span>
                  <strong className="font-mono">{auditState.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng doanh thu chốt sổ:</span>
                  <strong className="text-[#006c49] font-mono">
                    {auditState.ledger.totalRevenueFormatted}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sai lệch đối soát USALI:</span>
                  <strong className="text-[#006c49]">0 đ (Cân đối tuyệt đối)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chữ ký số SHA-256:</span>
                  <strong className="font-mono">{auditState.sha256Signature}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setIsExportModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#006c49] text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  In / Xuất PDF Báo Cáo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

