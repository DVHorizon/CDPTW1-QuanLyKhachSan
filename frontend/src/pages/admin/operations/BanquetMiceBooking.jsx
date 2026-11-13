import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const MIcon = ({ name, className = '', style = {} }) => (
  <span
    className={`material-symbols-outlined inline-flex items-center justify-center select-none leading-none ${className}`}
    style={{ fontSize: '18px', ...style }}
  >
    {name}
  </span>
);

const fmtVnd = (num) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(Number(num) || 0)) + ' đ';
};

const INITIAL_EVENTS = [
  {
    id: 'MICE-2025-081',
    beoNumber: 'BEO #MICE-2025-081',
    masterFolio: 'MASTER FOLIO #EV-8819',
    title: 'Hội Nghị Thượng Đỉnh FinTech Châu Á 2025',
    eventType: 'Hội nghị quốc tế',
    company: 'Hiệp Hội Công Nghệ Tài Chính Châu Á (AFTA)',
    host: 'Đơn vị chủ trì: Hiệp Hội Công Nghệ Tài Chính • Chủ trì đoàn: TS. Nguyễn Hùng Việt',
    contactPerson: {
      name: 'TS. Nguyễn Hùng Việt',
      title: 'Chủ tịch Hiệp hội & Trưởng Ban Tổ Chức',
      phone: '+84 908 112 334',
      email: 'hungviet.nguyen@afta-fintech.org',
      initials: 'HV',
    },
    status: 'IN_PROGRESS',
    statusBadge: 'ĐANG DIỄN RA • ĐÃ PHỤC VỤ TEABREAK',
    statusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    timeRange: '08:00 - 17:30',
    sessionNote: 'Phiên Chiều: Q&A Diễn Đàn',
    venuePill: 'Sảnh Grand Horiz...',
    venueFull: 'Sảnh Grand Horizon Ballroom Khu A',
    paxPill: '350 Khách VIP',
    pax: 350,
    cateringPill: 'Teabreak Cao Cấ...',
    cateringFull: 'Teabreak Cao Cấp (Bánh Pháp, Macaron, Trà TWG)',
    setup: {
      diagramCode: 'SƠ ĐỒ: FINTECH-THEATER-CONF-A1',
      seatingStyle: 'Kiểu lớp học kết hợp Theater (350 chỗ ngồi tài liệu)',
      tablesChairs: '35 dãy bàn chữ nhật phủ nỉ sẫm màu + 350 ghế banquet VIP',
      stageLed: 'P3 Indoor LED 14m x 4.5m + 2 màn hình phụ 85 inch',
      soundLight: 'Dàn Line Array JBL VTX + 12 mic cổ ngỗng + 6 mic không dây',
    },
    catering: {
      menuSignature: 'MENU CORPORATE #02',
      galaDinner: 'Buffet Á - Âu 350 suất phục vụ tại Horizon Grand Terrace',
      welcomeWine: 'Gói trà cao cấp TWG, Nước ép Cold-pressed organic & Cocktail nhẹ',
      lunchBuffet: 'Buffet hội thảo trưa: 350 suất phục vụ tại Horizon Grand Terrace',
    },
    financial: {
      totalAmount: 520000000,
      depositPaid: 364000000,
      remainingDue: 156000000,
      depositText: 'Đã cọc Đợt 1 (50%) & Đợt 2 (20% qua VCB):',
      dueDate: '24/10/2025 (Check-out đoàn)',
      guaranteeType: 'BẢO LÃNH DOANH NGHIỆP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc ký kết hợp đồng', amount: 260000000, percent: 50, date: '15/09/2025', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng AV & Setup sảnh', amount: 104000000, percent: 20, date: '10/10/2025', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 3 - Quyết toán Master Folio', amount: 156000000, percent: 30, date: '24/10/2025', method: 'Chờ quyết toán', status: 'PENDING' },
      ],
    },
  },
  {
    id: 'WED-2025-044',
    beoNumber: 'BEO #WED-2025-044',
    masterFolio: 'MASTER FOLIO #EV-8820',
    title: 'Tiệc Cưới Hoàng Hôn Bãi Biển - Arthur & Linh Wedding',
    eventType: 'Tiệc cưới hoàng hôn bãi biển',
    company: 'Arthur Morgan & Khánh Linh Wedding',
    host: 'Wedding Planner: The Planners Vietnam • Phong cách: Tropical White Riviera',
    contactPerson: {
      name: 'Ms. Chloe Hoàng (The Planners)',
      title: 'Senior Wedding Planner & Điều Phối',
      phone: '+84 938 789 654',
      email: 'chloe@theplanners.vn',
      initials: 'CL',
    },
    status: 'SETUP',
    statusBadge: 'TỐI NAY 18:30 • ĐANG SETUP BÀN HOA & SÂN KHẤU',
    statusBadgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    timeRange: '18:30 - 22:30',
    sessionNote: 'Khai tiệc & Pháo hoa',
    venuePill: 'Bãi Sunset Lawn &...',
    venueFull: 'Bãi Sunset Lawn & Thảm Cỏ Bờ Biển',
    paxPill: '120 Khách Mời VIP',
    pax: 120,
    cateringPill: 'Set 6 món: Cá tuy...',
    cateringFull: 'Set 6 món cao cấp: Cá tuyết Chi-lê áp chảo, Bò Wagyu A5',
    setup: {
      diagramCode: 'SƠ ĐỒ: WEDDING-RIVIERA-BEACH',
      seatingStyle: 'Bàn tròn tiệc cưới 10 người/bàn (12 bàn = 120 pax)',
      tablesChairs: '12 bàn tròn nỉ trắng san hô + Ghế Chiavari vàng champagne đính hoa hồng',
      stageLed: 'Cổng hoa vòm nghệ thuật ngoài biển + Bục gỗ teak + Pháo hoa tầm thấp',
      soundLight: 'Dàn âm thanh biển Acoustic D&B Audiotechnik + Dải đèn fairy light lung linh',
    },
    catering: {
      menuSignature: 'MENU WEDDING ROYAL #01',
      galaDinner: 'Set 6 món: Súp vi cá, Cá tuyết Chi-lê áp chảo sốt bơ chanh, Thăn ngoại Wagyu A5',
      welcomeWine: 'Champagne Moët & Chandon đón dâu (24 chai) + Tropical Cocktail Bar bãi biển',
      lunchBuffet: 'N/A (Chỉ tiệc Gala tối ngoài trời)',
    },
    financial: {
      totalAmount: 430000000,
      depositPaid: 344000000,
      remainingDue: 86000000,
      depositText: 'Đã cọc Đợt 1 (50%) & Đợt 2 (30% qua Visa):',
      dueDate: '23/10/2025 (Trước giờ khai tiệc)',
      guaranteeType: 'BẢO LÃNH THẺ TÍN DỤNG VIP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc giữ ngày tiệc cưới', amount: 215000000, percent: 50, date: '01/08/2025', method: 'Visa Signature', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng menu & décor hoa tươi', amount: 129000000, percent: 30, date: '05/10/2025', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 3 - Quyết toán sau pháo hoa', amount: 86000000, percent: 20, date: '23/10/2025', method: 'Chờ quyết toán', status: 'PENDING' },
      ],
    },
  },
  {
    id: 'MICE-2025-089',
    beoNumber: 'BEO #MICE-2025-089',
    masterFolio: 'MASTER FOLIO #EV-8821',
    title: 'Dạ Tiệc Tri Ân Khách Hàng VIP Mercedes-Benz',
    eventType: 'Gala Dinner Doanh Nghiệp',
    company: 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm',
    host: 'Đơn vị: Mercedes-Benz Vietnam • Yêu cầu đặc biệt: Đưa 02 xe sedan lên bục xoay',
    contactPerson: {
      name: 'Bà Trần Thu Trang',
      title: 'Giám Đốc Đối Ngoại & Truyền Thông',
      phone: '+84 912 345 889',
      email: 'trang.tran@vinapharm.vn',
      initials: 'TT',
    },
    status: 'UPCOMING',
    statusBadge: 'NGÀY MAI 18:00 • TIỀN KỲ SETUP SÂN KHẤU',
    statusBadgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    timeRange: '18:00 - 22:00',
    sessionNote: 'Ngày mai (24/10)',
    venuePill: 'Horizon Ballroom...',
    venueFull: 'Horizon Ballroom & Ocean Loggia',
    paxPill: '200 Khách VIP',
    pax: 200,
    cateringPill: 'Cocktail Receptio...',
    cateringFull: 'Cocktail Reception & Set Menu 6 món cao cấp Signature #04',
    setup: {
      diagramCode: 'SƠ ĐỒ: GALA-BANQUET-A3',
      seatingStyle: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
      tablesChairs: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
      stageLed: 'P3 Indoor 12m x 4m + 2 cánh LED phụ',
      soundLight: 'Hệ thống Line Array + 8 mic hội nghị không dây',
    },
    catering: {
      menuSignature: 'MENU SIGNATURE #04',
      galaDinner: 'Set Menu 6 món cao cấp (Bào ngư, Bò Wagyu)',
      welcomeWine: 'Château Margaux 2018 (35 chai) + Cocktail Bar',
      lunchBuffet: '350 suất phục vụ tại Horizon Grand Terrace',
    },
    financial: {
      totalAmount: 680000000,
      depositPaid: 340000000,
      remainingDue: 340000000,
      depositText: 'Đã cọc Đợt 1 (50% qua VCB):',
      dueDate: '25/10/2025 (Check-out đoàn)',
      guaranteeType: 'BẢO LÃNH DOANH NGHIỆP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc hợp đồng 50%', amount: 340000000, percent: 50, date: '01/10/2025', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng trước tiệc 24h', amount: 204000000, percent: 30, date: '23/10/2025', method: 'Chờ đến hạn', status: 'PENDING' },
        { stage: 'Đợt 3 - Quyết toán Master Folio', amount: 136000000, percent: 20, date: '25/10/2025', method: 'Chờ check-out', status: 'PENDING' },
      ],
    },
  },
];

const VENUES = [
  { id: 'HALL-BALLROOM-A', name: 'Grand Horizon Ballroom Khu A', capacity: '400 - 550 pax', area: '750 m²', ceiling: '7.5m' },
  { id: 'HALL-SUNSET-LAWN', name: 'Bãi Biển & Thảm Cỏ Hoàng Hôn (Sunset Lawn)', capacity: '150 - 350 pax', area: '1.200 m²', ceiling: 'Bãi biển mở' },
  { id: 'HALL-HORIZON-BALLROOM', name: 'Horizon Ballroom & Ocean Loggia', capacity: '300 - 450 pax', area: '820 m²', ceiling: '8.0m' },
  { id: 'HALL-BOARDROOM-VIP', name: 'Imperial Presidential Boardroom', capacity: '20 - 40 pax', area: '150 m²', ceiling: '4.2m' },
];

const STORAGE_KEY = 'grand_horizon_banquet_mice_events_v2';
const STORAGE_SELECTED_ID = 'grand_horizon_banquet_selected_id_v2';

export default function BanquetMiceBooking() {
  const navigate = useNavigate();

  // Selected event & persistence (loads from localStorage so F5 retains all changes)
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return INITIAL_EVENTS;
  });

  const [selectedEventId, setSelectedEventId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELECTED_ID);
      if (saved) return saved;
    } catch (_) {}
    return 'MICE-2025-089';
  });

  const [filterPeriod, setFilterPeriod] = useState('day'); // 'day' | 'week' | 'month'

  // Persist helper
  const persistEvents = (nextEvents) => {
    setEvents(nextEvents);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
    } catch (_) {}
  };

  const handleSelectEvent = (id) => {
    setSelectedEventId(id);
    try {
      localStorage.setItem(STORAGE_SELECTED_ID, id);
    } catch (_) {}
  };

  // Reset to default initial events
  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục về dữ liệu sự kiện mẫu ban đầu không?')) {
      persistEvents(INITIAL_EVENTS);
      handleSelectEvent('MICE-2025-089');
      showNotification('Đã khôi phục dữ liệu mẫu ban đầu!');
    }
  };

  // Sync with backend API on mount if available
  useEffect(() => {
    let isMounted = true;
    fetch('/api/banquet-events')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.success && Array.isArray(data.events) && data.events.length > 0) {
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
              persistEvents(data.events);
            }
          } catch (_) {}
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Modals state
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [show3DFloorPlanModal, setShow3DFloorPlanModal] = useState(false);
  const [showBEOExportModal, setShowBEOExportModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [toast, setToast] = useState(null);

  // New Event Form State (5-step wizard)
  const [wizardStep, setWizardStep] = useState(1);
  const [contractForm, setContractForm] = useState({
    title: '',
    eventType: 'Gala Dinner Doanh Nghiệp',
    company: '',
    contactName: '',
    contactTitle: 'Trưởng Ban Tổ Chức',
    contactPhone: '',
    contactEmail: '',
    date: new Date().toISOString().slice(0, 10),
    timeRange: '18:00 - 22:00',
    venueId: 'HALL-BALLROOM-A',
    pax: 250,
    seatingStyle: 'Bàn tròn 10 người/bàn',
    tablesChairs: '25 bàn tròn phủ nỉ cao cấp + Ghế banquet nơ vàng',
    stageLed: 'P3 Indoor LED 12m x 4m + 2 cánh LED phụ',
    soundLight: 'Hệ thống Line Array + 8 mic hội nghị không dây',
    menuType: 'Set Menu Gala 6 Món Cao Cấp',
    galaDinner: 'Set 6 món: Súp vi cá, Bào ngư hầm dầu hào, Thăn bò Wagyu nướng sốt nấm Truffle',
    welcomeWine: 'Château Margaux 2018 + Cocktail Bar',
    lunchBuffet: 'Buffet Á - Âu tại Horizon Grand Terrace',
    totalAmount: 480000000,
    depositPercent: 50,
    paymentMethod: 'Chuyển khoản VCB',
    guaranteeType: 'BẢO LÃNH DOANH NGHIỆP',
  });

  // Deposit recording modal form
  const [depositForm, setDepositForm] = useState({
    amount: 150000000,
    stage: 'Đợt 2 - Tạm ứng thực đơn & setup AV',
    method: 'Chuyển khoản VCB',
    note: 'Đã nhận chuyển khoản theo ủy nhiệm chi',
  });

  // Dispatch modal form
  const [dispatchForm, setDispatchForm] = useState({
    department: 'Đội AV & Kỹ Thuật',
    urgentLevel: 'KHẨN CẤP',
    message: 'Kiểm tra tín hiệu màn LED P3, giàn âm thanh Line Array và 8 mic không dây trước 15:30.',
  });

  // Current selected event object
  const currentEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle create new event contract
  const handleCreateContract = async (e) => {
    e.preventDefault();
    const total = Number(contractForm.totalAmount) || 450000000;
    const depVal = Math.round((total * Number(contractForm.depositPercent || 50)) / 100);
    const remVal = total - depVal;

    const newId = `MICE-2025-${String(events.length + 90).padStart(3, '0')}`;
    const selectedVenue = VENUES.find((v) => v.id === contractForm.venueId) || VENUES[0];

    const newEventObj = {
      id: newId,
      beoNumber: `BEO #${newId}`,
      masterFolio: `MASTER FOLIO #EV-${Math.floor(1000 + Math.random() * 9000)}`,
      title: contractForm.title || `${contractForm.company || 'Doanh Nghiệp'} - Sự Kiện MICE Mới`,
      eventType: contractForm.eventType,
      company: contractForm.company || 'Tập đoàn Khách hàng MICE',
      host: `Đơn vị: ${contractForm.company || 'Đoàn đại biểu'} • Chủ trì: ${contractForm.contactName || 'Đại diện'}`,
      contactPerson: {
        name: contractForm.contactName || 'Ông/Bà Đại diện',
        title: contractForm.contactTitle,
        phone: contractForm.contactPhone || '+84 901 234 567',
        email: contractForm.contactEmail || 'contact@client.com',
        initials: (contractForm.contactName || 'KH').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      },
      status: 'UPCOMING',
      statusBadge: `${contractForm.date} • ĐÃ KÝ HỢP ĐỒNG & NHẬN CỌC`,
      statusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      timeRange: contractForm.timeRange,
      sessionNote: 'Tiền kỳ setup & Tiếp đón',
      venuePill: selectedVenue.name.slice(0, 16) + '...',
      venueFull: selectedVenue.name,
      paxPill: `${contractForm.pax} Khách VIP`,
      pax: Number(contractForm.pax),
      cateringPill: contractForm.menuType.slice(0, 16) + '...',
      cateringFull: contractForm.menuType,
      setup: {
        diagramCode: `SƠ ĐỒ: ${contractForm.venueId}-PLAN-B1`,
        seatingStyle: contractForm.seatingStyle,
        tablesChairs: contractForm.tablesChairs,
        stageLed: contractForm.stageLed,
        soundLight: contractForm.soundLight,
      },
      catering: {
        menuSignature: 'MENU CUSTOM SIGNATURE',
        galaDinner: contractForm.galaDinner,
        welcomeWine: contractForm.welcomeWine,
        lunchBuffet: contractForm.lunchBuffet,
      },
      financial: {
        totalAmount: total,
        depositPaid: depVal,
        remainingDue: remVal,
        depositText: `Đã cọc Đợt 1 (${contractForm.depositPercent}% qua ${contractForm.paymentMethod}):`,
        dueDate: `${contractForm.date} (Check-out đoàn)`,
        guaranteeType: contractForm.guaranteeType,
        paymentHistory: [
          { stage: 'Đợt 1 - Cọc hợp đồng', amount: depVal, percent: contractForm.depositPercent, date: new Date().toLocaleDateString('vi-VN'), method: contractForm.paymentMethod, status: 'PAID' },
          { stage: 'Đợt 2 - Tạm ứng trước tiệc 24h', amount: Math.round(total * 0.3), percent: 30, date: 'Trước sự kiện', method: 'Chờ đến hạn', status: 'PENDING' },
          { stage: 'Đợt 3 - Quyết toán Master Folio', amount: total - depVal - Math.round(total * 0.3), percent: 100 - contractForm.depositPercent - 30, date: 'Check-out đoàn', method: 'Chờ kết thúc', status: 'PENDING' },
        ],
      },
    };

    const nextList = [newEventObj, ...events];
    persistEvents(nextList);
    handleSelectEvent(newId);
    setShowNewContractModal(false);
    setWizardStep(1);
    showNotification(`Đã tạo thành công Hợp đồng MICE & Lệnh BEO #${newId}!`);

    // Gửi đồng bộ lên backend
    try {
      await fetch('/api/banquet-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          title: newEventObj.title,
          eventType: newEventObj.eventType,
          company: newEventObj.company,
          contactName: newEventObj.contactPerson.name,
          contactTitle: newEventObj.contactPerson.title,
          contactPhone: newEventObj.contactPerson.phone,
          contactEmail: newEventObj.contactPerson.email,
          date: contractForm.date,
          timeRange: contractForm.timeRange,
          venueName: selectedVenue.name,
          pax: contractForm.pax,
          seatingStyle: contractForm.seatingStyle,
          tablesChairs: contractForm.tablesChairs,
          stageLed: contractForm.stageLed,
          soundLight: contractForm.soundLight,
          menuType: contractForm.menuType,
          galaDinner: contractForm.galaDinner,
          welcomeWine: contractForm.welcomeWine,
          lunchBuffet: contractForm.lunchBuffet,
          totalAmount: total,
          depositPercent: contractForm.depositPercent,
          depositPaid: depVal,
          paymentMethod: contractForm.paymentMethod,
          guaranteeType: contractForm.guaranteeType,
        }),
      });
    } catch (_) {}
  };

  // Handle record deposit payment
  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    const addAmt = Number(depositForm.amount) || 0;
    if (addAmt <= 0) {
      showNotification('Vui lòng nhập số tiền cọc hợp lệ', 'error');
      return;
    }

    const nextEvents = events.map((ev) => {
      if (ev.id === currentEvent.id) {
        const nextPaid = ev.financial.depositPaid + addAmt;
        const nextRemaining = Math.max(0, ev.financial.totalAmount - nextPaid);
        const nextHistory = [
          ...ev.financial.paymentHistory,
          {
            stage: depositForm.stage,
            amount: addAmt,
            percent: Math.round((addAmt / ev.financial.totalAmount) * 100),
            date: new Date().toLocaleDateString('vi-VN'),
            method: depositForm.method,
            status: 'PAID',
            note: depositForm.note,
          },
        ];
        return {
          ...ev,
          financial: {
            ...ev.financial,
            depositPaid: nextPaid,
            remainingDue: nextRemaining,
            paymentHistory: nextHistory,
          },
        };
      }
      return ev;
    });

    persistEvents(nextEvents);
    setShowDepositModal(false);
    showNotification(`Đã ghi nhận đặt cọc ${fmtVnd(addAmt)} vào Master Folio!`);

    // Gửi đồng bộ lên backend
    try {
      await fetch(`/api/banquet-events/${currentEvent.id}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: addAmt,
          stage: depositForm.stage,
          method: depositForm.method,
          note: depositForm.note,
        }),
      });
    } catch (_) {}
  };

  // Handle Dispatch AV
  const handleSendDispatch = async (e) => {
    e.preventDefault();
    setShowDispatchModal(false);
    showNotification(`Đã gửi lệnh điều phối khẩn đến ${dispatchForm.department}!`);

    try {
      await fetch(`/api/banquet-events/${currentEvent.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: dispatchForm.department,
          urgentLevel: dispatchForm.urgentLevel,
          message: dispatchForm.message,
        }),
      });
    } catch (_) {}
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 font-sans pb-12 -mx-space-lg -mt-16 px-space-lg pt-20">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all duration-300 ${
              toast.type === 'error'
                ? 'bg-rose-950 text-white border-rose-700'
                : 'bg-[#0f1f1a] text-white border-emerald-500'
            }`}
          >
            <MIcon
              name={toast.type === 'error' ? 'error' : 'verified'}
              className={toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}
            />
            <span>{toast.msg}</span>
          </div>
        )}

        {/* TOP CONTEXT BAR: Location, Occupancy & Operational Shift */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Phú Quốc Sanctuary</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-normal">Tower A • Ocean Wing</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ca trực vận hành: <span className="font-semibold text-slate-700">AM / ROTATION 06:00 - 14:30 GMT+7</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                occ 84%
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                REVPAR $428
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              CONSOLE: WS-SANCTUARY-04 [V4.92-PROD]
            </span>
          </div>
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <div className="space-y-6">
          {/* TITLE & ACTION BUTTONS ROW (MATCHING SCREENSHOT) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-emerald-800 uppercase mb-1">
                <span>PHÂN HỆ 53 // HỘI NGHỊ MICE & TIỆC CƯỚI NGHỈ DƯỠNG</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">TẬP ĐOÀN GRAND HORIZON PHÚ QUỐC</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-900 leading-snug">
                Trung Tâm Điều Hành Sự Kiện, Hội Nghị MICE & Yến Tiệc
              </h2>
              <p className="text-xs text-slate-600 max-w-3xl mt-1 leading-relaxed">
                Lập kế hoạch, điều phối sảnh tiệc Ballroom, bãi biển tiệc cưới ngoài trời và phòng hội thảo đa chức năng.
                Kiểm soát BEO (Banquet Event Order), thực đơn gala và tích hợp hóa đơn Master Folio sự kiện.
              </p>
            </div>

            {/* TOP RIGHT ACTION BUTTONS */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleResetToDefault}
                title="Khôi phục dữ liệu mẫu mặc định nếu cần làm mới"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <MIcon name="restart_alt" className="text-slate-500 text-base" />
                <span className="hidden sm:inline">Khôi phục mẫu</span>
              </button>

              <button
                onClick={() => setShow3DFloorPlanModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <MIcon name="view_in_ar" className="text-slate-600 text-base" />
                <span>Sơ đồ sảnh tiệc 3D</span>
              </button>

              <button
                onClick={() => setShowBEOExportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <MIcon name="receipt_long" className="text-slate-600 text-base" />
                <span>Xuất lệnh điều hành BEO</span>
              </button>

              <button
                onClick={() => {
                  setWizardStep(1);
                  setShowNewContractModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition active:scale-95"
              >
                <MIcon name="add" className="text-base" />
                <span>+ Lập hợp đồng sự kiện mới</span>
              </button>
            </div>
          </div>

          {/* 4 STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Sự kiện diễn ra trong tuần */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  SỰ KIỆN DIỄN RA TRONG TUẦN
                </span>
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                  <MIcon name="calendar_month" className="text-base" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">06 SỰ KIỆN</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  02 Hội nghị quốc tế • 01 Gala DN • 03 Cưới biển
                </div>
              </div>
            </div>

            {/* Card 2: Doanh thu MICE tháng này */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  DOANH THU MICE THÁNG NÀY
                </span>
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                  <MIcon name="payments" className="text-base" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">4.820.000.000 đ</div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                  <span>↗ +18.5% YoY</span>
                  <span className="text-slate-400 font-normal">(Đạt 94% KPI quý)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Công suất khai thác sảnh */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  CÔNG SUẤT KHAI THÁC SẢNH
                </span>
                <span className="p-1 rounded-md bg-sky-50 text-sky-700">
                  <MIcon name="meeting_room" className="text-base" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                  78.4% <span className="text-xs font-normal text-slate-600">Khu sảnh tiệc</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Grand Ballroom & Ocean Loggia kín lịch
                </div>
              </div>
            </div>

            {/* Card 4: Tổng số lượng khách (PAX) */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  TỔNG SỐ LƯỢNG KHÁCH (PAX)
                </span>
                <span className="p-1 rounded-md bg-purple-50 text-purple-700">
                  <MIcon name="groups" className="text-base" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">1.450 KHÁCH VIP</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  F&B Kitchen chuẩn bị 2.180 suất ăn & teabreak
                </div>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN SECTION: LEFT (DISPATCH & CAMERAS) + RIGHT (BEO DETAILS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: 7/12 (~58%) */}
            <div className="lg:col-span-7 space-y-6">
              {/* CARD 1: LỊCH ĐIỀU PHỐI KHÔNG GIAN & SỰ KIỆN */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header with tabs */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MIcon name="calendar_month" className="text-emerald-700 text-lg" />
                    <h3 className="font-bold text-slate-900 text-sm">Lịch Điều Phối Không Gian & Sự Kiện</h3>
                  </div>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                    <button
                      onClick={() => setFilterPeriod('day')}
                      className={`px-3 py-1 rounded-md transition ${
                        filterPeriod === 'day' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      Ngày (Hôm Nay)
                    </button>
                    <button
                      onClick={() => setFilterPeriod('week')}
                      className={`px-3 py-1 rounded-md transition ${
                        filterPeriod === 'week' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      Tuần này
                    </button>
                    <button
                      onClick={() => setFilterPeriod('month')}
                      className={`px-3 py-1 rounded-md transition ${
                        filterPeriod === 'month' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      Tháng 10
                    </button>
                  </div>
                </div>

                {/* Sub status strip */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600 flex items-center gap-3 overflow-x-auto whitespace-nowrap">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">TRẠNG THÁI SẢNH:</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Ballroom A: Đang chạy</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>Sunset Lawn: Đang setup</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Horizon Ballroom: Khóa kỹ thuật</span>
                  </span>
                </div>

                {/* Event Cards List */}
                <div className="p-4 space-y-3.5">
                  {events.map((ev) => {
                    const isSelected = ev.id === currentEvent.id;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectEvent(ev.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-50/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Status badge & BEO number */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${ev.statusBadgeColor}`}
                          >
                            {ev.statusBadge}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">{ev.beoNumber}</span>
                        </div>

                        {/* Event Title & Timing */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1.5">
                          <h4 className="font-bold text-slate-900 text-sm hover:text-emerald-800 transition">
                            {ev.title}
                          </h4>
                          <div className="text-right sm:flex-shrink-0">
                            <span className="font-mono font-bold text-xs text-slate-800">{ev.timeRange}</span>
                            <div className="text-[10px] text-slate-500">{ev.sessionNote}</div>
                          </div>
                        </div>

                        {/* Host / Company */}
                        <p className="text-xs text-slate-600 mb-3 line-clamp-1">{ev.host}</p>

                        {/* Detail Pills */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
                            <MIcon name="meeting_room" className="text-xs text-slate-500" />
                            <span>{ev.venuePill}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
                            <MIcon name="groups" className="text-xs text-slate-500" />
                            <span>{ev.paxPill}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
                            <MIcon name="restaurant_menu" className="text-xs text-slate-500" />
                            <span>{ev.cateringPill}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARD 2: HÌNH ẢNH GIÁM SÁT KHÔNG GIAN THỰC TẾ (DRONE & FLOOR CHECK) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MIcon name="photo_camera" className="text-emerald-700 text-lg" />
                    <h3 className="font-bold text-slate-900 text-sm">Hình Ảnh Giám Sát Không Gian Thực Tế</h3>
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    CAMERA DRONE & FLOOR CHECK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo 1: Ballroom A */}
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80"
                      alt="Grand Ballroom Khu A"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 uppercase tracking-wider inline-block mb-1">
                        GRAND BALLROOM KHU A
                      </span>
                      <p className="text-[11px] leading-tight text-slate-200 font-medium">
                        FinTech Summit: Đã đón 350 đại biểu
                      </p>
                    </div>
                  </div>

                  {/* Photo 2: Sunset Lawn */}
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-video">
                    <img
                      src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80"
                      alt="Bãi Biển Sunset Lawn"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-600 uppercase tracking-wider inline-block mb-1">
                        BÃI BIỂN SUNSET LAWN
                      </span>
                      <p className="text-[11px] leading-tight text-slate-200 font-medium">
                        Setup bàn hoa cưới hoàng hôn Arthur & Linh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 5/12 (~42%) (MATCHING THE BEO CARD IN IMAGE) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                <div>
                  {/* BEO Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                      HỒ SƠ BEO CHI TIẾT <span className="text-slate-800">{currentEvent.beoNumber}</span>
                    </div>
                    <MIcon name="verified" className="text-emerald-600 text-lg" />
                  </div>

                  {/* Company & Event Name */}
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{currentEvent.company}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sự kiện: <span className="font-medium text-slate-800">{currentEvent.title}</span>
                    </p>
                  </div>

                  {/* Contact Person Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                        {currentEvent.contactPerson.initials}
                      </div>
                      <div className="leading-tight">
                        <div className="font-bold text-slate-900 text-xs">{currentEvent.contactPerson.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{currentEvent.contactPerson.title}</div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-600 leading-tight">
                      <div className="font-mono font-semibold text-slate-800">{currentEvent.contactPerson.phone}</div>
                      <div className="text-[10px] text-slate-500">{currentEvent.contactPerson.email}</div>
                    </div>
                  </div>

                  {/* SECTION 1: SẮP ĐẶT KHÔNG GIAN & KỸ THUẬT */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
                        SẮP ĐẶT KHÔNG GIAN & KỸ THUẬT
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {currentEvent.setup.diagramCode}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex items-start gap-2.5">
                        <MIcon name="table_restaurant" className="text-slate-500 text-base mt-0.5" />
                        <div>
                          <span className="font-medium text-slate-900">Quy cách bàn ghế: </span>
                          <span>{currentEvent.setup.tablesChairs}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <MIcon name="tv" className="text-slate-500 text-base mt-0.5" />
                        <div>
                          <span className="font-medium text-slate-900">Sân khấu & Màn hình LED: </span>
                          <span>{currentEvent.setup.stageLed}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <MIcon name="volume_up" className="text-slate-500 text-base mt-0.5" />
                        <div>
                          <span className="font-medium text-slate-900">Âm thanh & Ánh sáng: </span>
                          <span>{currentEvent.setup.soundLight}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: CHI TIẾT ẨM THỰC & F&B CATERING */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
                        CHI TIẾT ẨM THỰC & F&B CATERING
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">
                        {currentEvent.catering.menuSignature}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                        <div>
                          <span className="font-medium text-slate-900">Thực đơn Gala tối: </span>
                          <span>{currentEvent.catering.galaDinner}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                        <div>
                          <span className="font-medium text-slate-900">Rượu vang đón khách: </span>
                          <span>{currentEvent.catering.welcomeWine}</span>
                        </div>
                      </div>

                      {currentEvent.catering.lunchBuffet && currentEvent.catering.lunchBuffet !== 'N/A' && (
                        <div className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5"></span>
                          <div>
                            <span className="font-medium text-slate-900">Buffet hội thảo trưa: </span>
                            <span>{currentEvent.catering.lunchBuffet}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: KÊ KHAI CHI PHÍ & ĐẶT CỌC HỢP ĐỒNG */}
                  <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
                        KÊ KHAI CHI PHÍ & ĐẶT CỌC HỢP ĐỒNG
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 font-bold">
                        {currentEvent.masterFolio}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Tổng giá trị hợp đồng:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {fmtVnd(currentEvent.financial.totalAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>{currentEvent.financial.depositText}</span>
                        <span className="font-mono">-{fmtVnd(currentEvent.financial.depositPaid)}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-200">
                        <span>Còn lại kỳ nợ Master Folio:</span>
                        <span className="font-mono text-sm text-emerald-800">
                          {fmtVnd(currentEvent.financial.remainingDue)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar of deposits */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Tiến độ thanh toán cọc:</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round((currentEvent.financial.depositPaid / currentEvent.financial.totalAmount) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (currentEvent.financial.depositPaid / currentEvent.financial.totalAmount) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-slate-200 text-slate-500">
                      <div>
                        Hạn thanh toán đợt cuối: <span className="font-medium text-slate-700">{currentEvent.financial.dueDate}</span>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase px-1.5 py-0.5 rounded bg-emerald-100">
                        {currentEvent.financial.guaranteeType}
                      </span>
                    </div>

                    {/* Quick Button to Record More Deposits */}
                    <button
                      onClick={() => {
                        setDepositForm({
                          amount: currentEvent.financial.remainingDue > 0 ? Math.round(currentEvent.financial.remainingDue * 0.5) : 50000000,
                          stage: `Đợt bổ sung (${new Date().toLocaleDateString('vi-VN')})`,
                          method: 'Chuyển khoản VCB',
                          note: 'Thu cọc bổ sung cho dịch vụ phát sinh',
                        });
                        setShowDepositModal(true);
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <MIcon name="add_card" className="text-sm" />
                      <span>+ Ghi Nhận Đặt Cọc Giai Đoạn Tiếp Theo</span>
                    </button>
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowBEOExportModal(true)}
                    className="w-full py-2.5 px-3 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <MIcon name="print" className="text-base" />
                    <span>In Lệnh BEO Bếp & Buồng</span>
                  </button>

                  <button
                    onClick={() => setShowDispatchModal(true)}
                    className="w-full py-2.5 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <MIcon name="sensors" className="text-base" />
                    <span>Thông Báo Đội AV & Kỹ Thuật</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: LẬP HỢP ĐỒNG SỰ KIỆN MỚI (5-STEP WIZARD) */}
        {/* ========================================================================= */}
        {showNewContractModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
                    QUY TRÌNH TƯ VẤN & ĐẶT SẢNH TIỆC MICE
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif">
                    Lập Hợp Đồng Sự Kiện & Tạo Lệnh Điều Hành BEO
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewContractModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                >
                  <MIcon name="close" className="text-lg" />
                </button>
              </div>

              {/* Stepper Indicator */}
              <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className={wizardStep === 1 ? 'text-emerald-800 font-bold' : ''}>1. Khách & Ngày Giờ</span>
                <span>›</span>
                <span className={wizardStep === 2 ? 'text-emerald-800 font-bold' : ''}>2. Sảnh Tiệc</span>
                <span>›</span>
                <span className={wizardStep === 3 ? 'text-emerald-800 font-bold' : ''}>3. Bàn Ghế & AV</span>
                <span>›</span>
                <span className={wizardStep === 4 ? 'text-emerald-800 font-bold' : ''}>4. Thực Đơn F&B</span>
                <span>›</span>
                <span className={wizardStep === 5 ? 'text-emerald-800 font-bold' : ''}>5. Hợp Đồng & Cọc</span>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateContract} className="p-6 overflow-y-auto space-y-4 flex-1">
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Bước 1: Thông Tin Khách Hàng & Sự Kiện</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Sự Kiện *</label>
                        <input
                          type="text"
                          required
                          value={contractForm.title}
                          onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                          placeholder="VD: Hội Nghị Thượng Đỉnh Ngành Dược 2025"
                          className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Loại Hình Sự Kiện</label>
                        <select
                          value={contractForm.eventType}
                          onChange={(e) => setContractForm({ ...contractForm, eventType: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option>Hội nghị quốc tế</option>
                          <option>Tiệc cưới hoàng hôn bãi biển</option>
                          <option>Gala Dinner Doanh Nghiệp</option>
                          <option>Dạ Tiệc Tri Ân Khách Hàng</option>
                          <option>Hội Thảo Ra Mắt Sản Phẩm</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Công Ty / Đơn Vị Chủ Trì *</label>
                        <input
                          type="text"
                          required
                          value={contractForm.company}
                          onChange={(e) => setContractForm({ ...contractForm, company: e.target.value })}
                          placeholder="VD: Tập đoàn Dược phẩm Vinapharm"
                          className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Số Lượng Khách Dự Kiến (PAX) *</label>
                        <input
                          type="number"
                          min="20"
                          max="800"
                          value={contractForm.pax}
                          onChange={(e) => setContractForm({ ...contractForm, pax: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Người Liên Hệ / Đại Diện</label>
                        <input
                          type="text"
                          value={contractForm.contactName}
                          onChange={(e) => setContractForm({ ...contractForm, contactName: e.target.value })}
                          placeholder="VD: Bà Trần Thu Trang"
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                        <input
                          type="text"
                          value={contractForm.contactPhone}
                          onChange={(e) => setContractForm({ ...contractForm, contactPhone: e.target.value })}
                          placeholder="+84 912 345 889"
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Tổ Chức</label>
                        <input
                          type="date"
                          value={contractForm.date}
                          onChange={(e) => setContractForm({ ...contractForm, date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Khung Giờ</label>
                        <input
                          type="text"
                          value={contractForm.timeRange}
                          onChange={(e) => setContractForm({ ...contractForm, timeRange: e.target.value })}
                          placeholder="18:00 - 22:30"
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Bước 2: Chọn Sảnh Tiệc & Không Gian Vận Hành</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {VENUES.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => setContractForm({ ...contractForm, venueId: v.id })}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            contractForm.venueId === v.id
                              ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-500'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-slate-900 text-xs mb-1">{v.name}</div>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div>Sức chứa: <span className="font-semibold text-slate-800">{v.capacity}</span></div>
                            <div>Diện tích: {v.area} • Trần cao: {v.ceiling}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Bước 3: Quy Cách Sắp Đặt Bàn Ghế & Kỹ Thuật AV</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phong Cách Sắp Đặt Bàn Ghế</label>
                        <select
                          value={contractForm.seatingStyle}
                          onChange={(e) => setContractForm({ ...contractForm, seatingStyle: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        >
                          <option>Bàn tròn 10 người/bàn (Banquet Round Tables)</option>
                          <option>Kiểu Rạp Hát (Theater Style 400 - 600 pax)</option>
                          <option>Kiểu Lớp Học (Classroom Style có bàn ghi chép)</option>
                          <option>Kiểu Chữ U Hội Nghị (U-Shape VIP Boardroom)</option>
                          <option>Tiệc Đứng Cocktail (Cocktail High Tables)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Mô Tả Quy Cách Bàn Ghế & Décor</label>
                        <input
                          type="text"
                          value={contractForm.tablesChairs}
                          onChange={(e) => setContractForm({ ...contractForm, tablesChairs: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Sân Khấu & Màn Hình LED</label>
                        <input
                          type="text"
                          value={contractForm.stageLed}
                          onChange={(e) => setContractForm({ ...contractForm, stageLed: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Âm Thanh & Ánh Sáng</label>
                        <input
                          type="text"
                          value={contractForm.soundLight}
                          onChange={(e) => setContractForm({ ...contractForm, soundLight: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Bước 4: Thực Đơn Tiệc Đoàn & F&B Catering</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Gói Thực Đơn Chính</label>
                        <select
                          value={contractForm.menuType}
                          onChange={(e) => setContractForm({ ...contractForm, menuType: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        >
                          <option>Set Menu Gala 6 Món Cao Cấp (Bào ngư, Wagyu)</option>
                          <option>Set Menu Hoàng Gia 8 Món Hải Sản & Bò Úc</option>
                          <option>Buffet Quốc Tế Á - Âu 60 Món (Horizon Terrace)</option>
                          <option>Tiệc Cưới Bãi Biển Riviera BBQ Hải Sản Sống</option>
                          <option>Teabreak VIP & Finger Food Canapé</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Chi Tiết Món Ăn Gala Tối</label>
                        <textarea
                          rows="2"
                          value={contractForm.galaDinner}
                          onChange={(e) => setContractForm({ ...contractForm, galaDinner: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Rượu Vang & Đồ Uống Đón Khách</label>
                        <input
                          type="text"
                          value={contractForm.welcomeWine}
                          onChange={(e) => setContractForm({ ...contractForm, welcomeWine: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="space-y-4 animate-fadeIn">
                    <h4 className="font-bold text-slate-900 text-sm border-b pb-2">
                      Bước 5: Kê Khai Chi Phí & Phân Kỳ Đặt Cọc Hợp Đồng MICE
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tổng Giá Trị Hợp Đồng (VNĐ)</label>
                        <input
                          type="number"
                          step="10000000"
                          value={contractForm.totalAmount}
                          onChange={(e) => setContractForm({ ...contractForm, totalAmount: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ Lệ Đặt Cọc Đợt 1 (%)</label>
                        <select
                          value={contractForm.depositPercent}
                          onChange={(e) => setContractForm({ ...contractForm, depositPercent: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        >
                          <option value="50">50% (Tiêu chuẩn hợp đồng MICE)</option>
                          <option value="30">30% (Doanh nghiệp đối tác thân thiết)</option>
                          <option value="70">70% (Tiệc cưới & Đặt chỗ cao điểm)</option>
                          <option value="100">100% (Thanh toán toàn bộ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phương Thức Thanh Toán Cọc</label>
                        <select
                          value={contractForm.paymentMethod}
                          onChange={(e) => setContractForm({ ...contractForm, paymentMethod: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        >
                          <option>Chuyển khoản VCB</option>
                          <option>Thẻ Tín Dụng Doanh Nghiệp (Corporate Card)</option>
                          <option>Bảo Lãnh Ngân Hàng</option>
                          <option>Tiền Mặt Tại Quầy Lễ Tân</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Hình Thức Bảo Lãnh</label>
                        <input
                          type="text"
                          value={contractForm.guaranteeType}
                          onChange={(e) => setContractForm({ ...contractForm, guaranteeType: e.target.value })}
                          className="w-full px-3 py-2 text-xs border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Summary preview */}
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-emerald-950">
                        <span>Số tiền cọc Đợt 1 cần thu ngay:</span>
                        <span className="font-mono font-bold">
                          {fmtVnd((contractForm.totalAmount * contractForm.depositPercent) / 100)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Dư nợ Master Folio chờ quyết toán:</span>
                        <span className="font-mono">
                          {fmtVnd(contractForm.totalAmount - (contractForm.totalAmount * contractForm.depositPercent) / 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Nav Controls */}
                <div className="pt-4 border-t flex items-center justify-between">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Quay Lại
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {wizardStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                    >
                      Tiếp Tục ›
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-200 transition"
                    >
                      Xác Nhận Ký Hợp Đồng & Phát Hành BEO
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: SƠ ĐỒ SẢNH TIỆC 3D (3D / 2D INTERACTIVE VENUE LAYOUT) */}
        {/* ========================================================================= */}
        {show3DFloorPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MIcon name="view_in_ar" className="text-emerald-400 text-xl" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white">
                      Sơ Đồ Sảnh Tiệc 3D & Bản Vẽ Bố Trí Bàn Ghế
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {currentEvent.venueFull} • {currentEvent.setup.diagramCode}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShow3DFloorPlanModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 flex items-center justify-center"
                >
                  <MIcon name="close" className="text-base" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {/* Interactive Visual Floor Layout Simulation */}
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 relative min-h-[360px] flex flex-col justify-between select-none">
                  {/* Stage Area */}
                  <div className="mx-auto w-3/4 py-3 bg-emerald-950/80 border-2 border-emerald-500/50 rounded-xl text-center shadow-lg shadow-emerald-950">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                      SÂN KHẤU CHÍNH & MÀN HÌNH LED P3 (12m x 4m)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      2 Bục xoay siêu xe Mercedes Maybach • Dàn Line Array 2 bên cánh gà
                    </div>
                  </div>

                  {/* Round Tables Grid Simulation */}
                  <div className="my-6 grid grid-cols-5 sm:grid-cols-7 gap-3 text-center">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className="group p-2 rounded-full aspect-square bg-[#1a2f27] border border-emerald-600/40 hover:border-emerald-400 hover:bg-emerald-900 transition flex flex-col items-center justify-center cursor-pointer relative"
                      >
                        <span className="text-[10px] font-bold text-emerald-300">T{i + 1}</span>
                        <span className="text-[8px] text-slate-400">10 pax</span>
                      </div>
                    ))}
                  </div>

                  {/* Entrance & FOH Sound Booth */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
                    <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      🚪 CỬA CHÍNH ĐÓN KHÁCH (RED CARPET)
                    </div>
                    <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      🎛️ KHU VỰC KỸ THUẬT FOH (ÂM THANH & ÁNH SÁNG)
                    </div>
                    <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      🥂 QUẦY COCKTAIL BAR & CANAPÉ
                    </div>
                  </div>
                </div>

                {/* Specs Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div className="text-slate-400">Quy mô tiệc bàn tròn:</div>
                    <div className="font-bold text-white text-sm mt-0.5">35 bàn tròn (350 pax)</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div className="text-slate-400">Hệ thống đèn beam & wash:</div>
                    <div className="font-bold text-white text-sm mt-0.5">24 Moving Heads DMX</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div className="text-slate-400">Độ giãn cách lối đi VIP:</div>
                    <div className="font-bold text-white text-sm mt-0.5">Tiêu chuẩn 1.8m an toàn</div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button
                  onClick={() => setShow3DFloorPlanModal(false)}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  Đóng Sơ Đồ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: XUẤT LỆNH ĐIỀU HÀNH BEO (BANQUET EVENT ORDER DISPATCH SHEET) */}
        {/* ========================================================================= */}
        {showBEOExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-emerald-800 uppercase">
                    LỆNH ĐIỀU HÀNH YẾN TIỆC & MICE
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Banquet Event Order (BEO) - {currentEvent.beoNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBEOExportModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <MIcon name="close" className="text-base" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 leading-relaxed font-sans">
                {/* Hotel Header Stamp */}
                <div className="text-center pb-4 border-b border-slate-200">
                  <h2 className="font-serif text-lg font-bold text-slate-900">GRAND HORIZON RESORT & SUITES PHÚ QUỐC</h2>
                  <p className="text-[11px] text-slate-500">Ban Điều Hành Khối Yến Tiệc, Hội Nghị & Khách Đoàn</p>
                  <div className="inline-block px-3 py-1 mt-2 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-800">
                    {currentEvent.beoNumber} • {currentEvent.masterFolio}
                  </div>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Tên Sự Kiện:</span>
                    <strong className="text-slate-900">{currentEvent.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Khách Hàng:</span>
                    <strong className="text-slate-900">{currentEvent.company}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Thời Gian Diễn Ra:</span>
                    <span>{currentEvent.timeRange} (Ngày {currentEvent.financial.dueDate})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Địa Điểm / Sảnh:</span>
                    <strong className="text-emerald-800">{currentEvent.venueFull}</strong>
                  </div>
                </div>

                {/* Departmental Instructions */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b pb-1">
                    Phân Công Nhiệm Vụ 5 Khối Vận Hành:
                  </h4>
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-emerald-900">1. Bếp Trưởng & Ẩm Thực F&B:</div>
                    <p className="text-slate-600">{currentEvent.catering.galaDinner}. Rượu: {currentEvent.catering.welcomeWine}.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-emerald-900">2. Kỹ Thuật AV, Âm Thanh & Ánh Sáng:</div>
                    <p className="text-slate-600">{currentEvent.setup.stageLed}. {currentEvent.setup.soundLight}.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-emerald-900">3. Bộ Phận Buồng Phòng & Setup Sảnh:</div>
                    <p className="text-slate-600">{currentEvent.setup.tablesChairs}. Khăn trải bàn kiểm tra độ phẳng 100%.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-emerald-900">4. Kế Toán & Thu Ngân Master Folio:</div>
                    <p className="text-slate-600">Đã thu {fmtVnd(currentEvent.financial.depositPaid)}. Thu nốt {fmtVnd(currentEvent.financial.remainingDue)} khi check-out.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">Trạng thái: ĐÃ PHÊ DUYỆT BỞI TỔNG QUẢN LÝ</span>
                <button
                  onClick={() => {
                    window.print();
                    showNotification('Lệnh in BEO đã được gửi đến máy in mạng bộ phận!');
                  }}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <MIcon name="print" className="text-sm" />
                  <span>In Bản Lệnh BEO (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: GHI NHẬN ĐẶT CỌC THEO TỪNG GIAI ĐOẠN HỢP ĐỒNG */}
        {/* ========================================================================= */}
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MIcon name="payments" className="text-emerald-700 text-lg" />
                  <h3 className="font-bold text-sm text-slate-900">Thu Tiền Đặt Cọc Sự Kiện MICE</h3>
                </div>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <MIcon name="close" className="text-base" />
                </button>
              </div>

              <form onSubmit={handleSaveDeposit} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên Hợp Đồng</label>
                  <input
                    type="text"
                    readOnly
                    value={`${currentEvent.title} (${currentEvent.company})`}
                    className="w-full px-3 py-2 bg-slate-100 border rounded-lg text-slate-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Tiền Đặt Cọc (VNĐ) *</label>
                  <input
                    type="number"
                    step="5000000"
                    required
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giai Đoạn Cọc</label>
                  <input
                    type="text"
                    value={depositForm.stage}
                    onChange={(e) => setDepositForm({ ...depositForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hình Thức Thanh Toán</label>
                  <select
                    value={depositForm.method}
                    onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option>Chuyển khoản VCB</option>
                    <option>Ủy Nhiệm Chi BIDV</option>
                    <option>Thẻ Tín Dụng Corporate</option>
                    <option>Tiền Mặt</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Chứng Từ</label>
                  <textarea
                    rows="2"
                    value={depositForm.note}
                    onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  ></textarea>
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDepositModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                  >
                    Xác Nhận Thu Cọc
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: THÔNG BÁO ĐỘI AV & KỸ THUẬT */}
        {/* ========================================================================= */}
        {showDispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MIcon name="sensors" className="text-emerald-700 text-lg" />
                  <h3 className="font-bold text-sm text-slate-900">Thông Báo Điều Phối Đội Kỹ Thuật AV</h3>
                </div>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <MIcon name="close" className="text-base" />
                </button>
              </div>

              <form onSubmit={handleSendDispatch} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ Phận Tiếp Nhận</label>
                  <select
                    value={dispatchForm.department}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                  >
                    <option>Đội AV & Kỹ Thuật (Sound & Light)</option>
                    <option>Bếp Trưởng & Tổ Yến Tiệc (F&B Kitchen)</option>
                    <option>Tổ Buồng Phòng & Khăn Vải (Housekeeping)</option>
                    <option>An Ninh & Điều Phối Bãi Đỗ Xe VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức Độ Ưu Tiên</label>
                  <select
                    value={dispatchForm.urgentLevel}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, urgentLevel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-rose-700 font-bold"
                  >
                    <option>KHẨN CẤP (Xử lý ngay lập tức)</option>
                    <option>ƯU TIÊN CAO</option>
                    <option>THÔNG BÁO TIÊU CHUẨN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nội Dung Điều Phối</label>
                  <textarea
                    rows="3"
                    value={dispatchForm.message}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  ></textarea>
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDispatchModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                  >
                    Phát Lệnh Điều Phối
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
