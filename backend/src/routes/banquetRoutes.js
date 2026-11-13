'use strict';

const express = require('express');
const router = express.Router();
let pool = null;
try {
  pool = require('../config/db');
} catch (_) {
  pool = null;
}

// In-Memory fallback store for Module 53 (Banquet & MICE Event Booking)
let MICE_EVENTS = [
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
      initials: 'HV'
    },
    status: 'IN_PROGRESS', // IN_PROGRESS | SETUP_IN_PROGRESS | UPCOMING | COMPLETED | CANCELLED
    statusBadge: 'ĐANG DIỄN RA • ĐÃ PHỤC VỤ TEABREAK',
    statusBadgeType: 'success', // success | info | warning | gray
    date: '2025-10-23',
    timeRange: '08:00 - 17:30',
    currentSession: 'Phiên Chiều: Q&A Diễn Đàn & Tọa Đàm Chuyên Đề',
    venue: {
      id: 'HALL-BALLROOM-A',
      name: 'Sảnh Grand Horizon Khu A',
      type: 'Ballroom trong nhà',
      paxMax: 500,
      areaM2: 750,
      ceilingHeight: '7.5m'
    },
    pax: 350,
    paxLabel: '350 Khách VIP',
    catering: {
      menuType: 'Teabreak & Buffet Trưa Quốc Tế',
      menuCode: 'MENU CORPORATE #02',
      teabreakTag: 'Teabreak Cao Cấp (Bánh mặn, Macaron, Trà TWG)',
      lunchBuffet: 'Buffet Á - Âu 350 suất phục vụ tại Horizon Grand Terrace',
      dinnerGala: 'Tiệc nhẹ Cocktail Networking sau hội thảo',
      wineBeverage: 'Gói trà cao cấp, nước ép organic & mocktail'
    },
    setup: {
      diagramCode: 'SƠ ĐỒ: FINTECH-THEATER-CONF-A1',
      seatingStyle: 'Kiểu lớp học kết hợp Theater (350 chỗ ngồi tài liệu)',
      tablesChairs: '35 dãy bàn chữ nhật bọc nỉ đen + 350 ghế hội nghị banquet',
      stageLed: 'P3 Indoor LED 14m x 4.5m + Hệ thống 2 màn hình phụ 85 inch',
      soundLight: 'Dàn loa Line Array JBL VTX + 12 mic cổ ngỗng + 6 mic không dây Shure'
    },
    financial: {
      totalAmount: 520000000,
      currency: 'VND',
      depositPaid: 364000000, // 70%
      depositStage: 'Đã cọc Đợt 1 (50%) & Đợt 2 (20%) qua VCB',
      remainingDue: 156000000,
      dueDate: '24/10/2025 (Check-out đoàn)',
      guarantee: 'BẢO LÃNH DOANH NGHIỆP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc ký hợp đồng', amount: 260000000, percent: 50, date: '2025-09-15', method: 'VCB Transfer', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng setup AV & F&B', amount: 104000000, percent: 20, date: '2025-10-10', method: 'VCB Transfer', status: 'PAID' },
        { stage: 'Đợt 3 - Quyết toán Master Folio', amount: 156000000, percent: 30, date: '2025-10-24', method: 'Chờ quyết toán', status: 'PENDING' }
      ]
    },
    realtimeFeed: {
      dronePhoto: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
      label: 'GRAND BALLROOM KHU A',
      caption: 'FinTech Summit: Đã đón 350 đại biểu tham dự phiên chiều'
    }
  },
  {
    id: 'WED-2025-044',
    beoNumber: 'BEO #WED-2025-044',
    masterFolio: 'MASTER FOLIO #EV-8820',
    title: 'Tiệc Cưới Hoàng Hôn Bãi Biển - Arthur & Linh Wedding',
    eventType: 'Tiệc cưới ngoài trời',
    company: 'Gia đình Chú rể Arthur Morgan & Cô dâu Khánh Linh',
    host: 'Wedding Planner: The Planners Vietnam • Phong cách: Tropical White Riviera',
    contactPerson: {
      name: 'Ms. Chloe Hoàng (The Planners)',
      title: 'Senior Wedding Planner & Điều phối trưởng',
      phone: '+84 938 789 654',
      email: 'chloe@theplanners.vn',
      initials: 'CL'
    },
    status: 'SETUP_IN_PROGRESS',
    statusBadge: 'TỐI NAY 18:30 • ĐANG SETUP BÀN HOA & SÂN KHẤU',
    statusBadgeType: 'info',
    date: '2025-10-23',
    timeRange: '18:30 - 22:30',
    currentSession: 'Lễ Trao Nhẫn Bãi Biển (18:30) • Khai tiệc & Pháo hoa (19:30)',
    venue: {
      id: 'HALL-SUNSET-LAWN',
      name: 'Bãi Sunset Lawn & Bãi Biển',
      type: 'Bãi cỏ bãi biển riêng tư',
      paxMax: 250,
      areaM2: 1200,
      ceilingHeight: 'Không gian mở bờ biển'
    },
    pax: 120,
    paxLabel: '120 Khách Mời VIP',
    catering: {
      menuType: 'Set Menu 6 Món Cao Cấp Hải Sản & Steak',
      menuCode: 'MENU WEDDING ROYAL #01',
      teabreakTag: 'Tiệc Welcome Cocktail Bãi Biển & Canapé',
      lunchBuffet: 'N/A',
      dinnerGala: 'Set 6 món: Súp vi cá hải sản, Cá tuyết Chi-lê áp chảo, Bò Wagyu A5 sốt truffle, Tráng miệng Lava dừa',
      wineBeverage: 'Champagne Moët & Chandon đón dâu + Quầy Bar Tropical Cocktail không giới hạn'
    },
    setup: {
      diagramCode: 'SƠ ĐỒ: WEDDING-RIVIERA-BEACH',
      seatingStyle: 'Bàn tiệc tròn 10 người kết hợp 2 bàn dài gia đình VIP',
      tablesChairs: '12 bàn tròn bọc nỉ linen màu cát trắng + Ghế Chiavari vàng đồng đính hoa hồng David Austin',
      stageLed: 'Cổng hoa vòm nghệ thuật ngoài biển + Bục gỗ tếch + Hệ thống pháo hoa tầm thấp',
      soundLight: 'Âm thanh Acoustic biển kháng gió D&B Audiotechnik + Đèn rọi màu vàng ấm vintage'
    },
    financial: {
      totalAmount: 430000000,
      currency: 'VND',
      depositPaid: 344000000, // 80%
      depositStage: 'Đã cọc Đợt 1 (50%) & Đợt 2 (30%)',
      remainingDue: 86000000,
      dueDate: '23/10/2025 (Trước giờ khai tiệc)',
      guarantee: 'BẢO LÃNH THẺ TÍN DỤNG VIP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc giữ ngày tiệc', amount: 215000000, percent: 50, date: '2025-08-01', method: 'Thẻ Visa Signature', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng menu & décor hoa', amount: 129000000, percent: 30, date: '2025-10-05', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 3 - Quyết toán sau tiệc cưới', amount: 86000000, percent: 20, date: '2025-10-23', method: 'Chờ quyết toán', status: 'PENDING' }
      ]
    },
    realtimeFeed: {
      dronePhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
      label: 'BÃI BIỂN SUNSET LAWN',
      caption: 'Setup bàn hoa cưới hoàng hôn Arthur & Linh hoàn tất 90%'
    }
  },
  {
    id: 'MICE-2025-089',
    beoNumber: 'BEO #MICE-2025-089',
    masterFolio: 'MASTER FOLIO #EV-8821',
    title: 'Dạ Tiệc Tri Ân Khách Hàng VIP Mercedes-Benz',
    eventType: 'Gala Dinner Doanh Nghiệp',
    company: 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm & Đối tác Mercedes-Benz',
    host: 'Đơn vị: Mercedes-Benz Vietnam & Vinapharm • Yêu cầu đặc biệt: Đưa 02 xe sedan lên bục xoay',
    contactPerson: {
      name: 'Bà Trần Thu Trang',
      title: 'Giám Đốc Đối Ngoại & Truyền Thông',
      phone: '+84 912 345 889',
      email: 'trang.tran@vinapharm.vn',
      initials: 'TT'
    },
    status: 'UPCOMING',
    statusBadge: 'NGÀY MAI 18:00 • TIỀN KỲ SETUP SÂN KHẤU',
    statusBadgeType: 'warning',
    date: '2025-10-24',
    timeRange: '18:00 - 22:00',
    currentSession: 'Ngày mai (24/10) • Thảm đỏ đón khách & Trưng bày xe (18:00)',
    venue: {
      id: 'HALL-HORIZON-BALLROOM',
      name: 'Horizon Ballroom & Ocean Loggia',
      type: 'Ballroom hội nghị phức hợp',
      paxMax: 400,
      areaM2: 820,
      ceilingHeight: '8.0m (Tải trọng bục xe 3.5 tấn)'
    },
    pax: 200,
    paxLabel: '200 Khách VIP',
    catering: {
      menuType: 'Set Menu 6 Món Cao Cấp Signature #04',
      menuCode: 'MENU SIGNATURE #04',
      teabreakTag: 'Cocktail Reception & Canapé Đón Khách',
      lunchBuffet: 'Buffet hội thảo trưa: 350 suất phục vụ tại Horizon Grand Terrace',
      dinnerGala: 'Set Menu 6 món cao cấp (Bào ngư hầm vi cá, Thăn bò Wagyu nướng sốt vang đỏ)',
      wineBeverage: 'Rượu vang đón khách: Château Margaux 2018 (35 chai) + Quầy Cocktail Bar chuyên nghiệp'
    },
    setup: {
      diagramCode: 'SƠ ĐỒ: GALA-BANQUET-A3',
      seatingStyle: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
      tablesChairs: 'Quy cách bàn ghế: Bàn tròn 10 người/bàn (35 bàn = 350 pax) khăn phủ nhung đen & vàng kim',
      stageLed: 'Sân khấu & Màn hình LED: P3 Indoor 12m x 4m + 2 cánh LED phụ + 2 bục xoay 360 độ xe sang',
      soundLight: 'Âm thanh & Ánh sáng: Hệ thống Line Array + 8 mic hội nghị không dây + 24 đèn Beam Moving Head'
    },
    financial: {
      totalAmount: 680000000,
      currency: 'VND',
      depositPaid: 340000000, // 50%
      depositStage: 'Đã cọc Đợt 1 (50% qua VCB)',
      remainingDue: 340000000,
      dueDate: '25/10/2025 (Check-out đoàn)',
      guarantee: 'BẢO LÃNH DOANH NGHIỆP',
      paymentHistory: [
        { stage: 'Đợt 1 - Cọc hợp đồng 50%', amount: 340000000, percent: 50, date: '2025-10-01', method: 'Chuyển khoản VCB', status: 'PAID' },
        { stage: 'Đợt 2 - Tạm ứng trước tiệc 24h', amount: 204000000, percent: 30, date: '2025-10-23', method: 'Chờ đến hạn', status: 'PENDING' },
        { stage: 'Đợt 3 - Quyết toán Master Folio', amount: 136000000, percent: 20, date: '2025-10-25', method: 'Chờ check-out', status: 'PENDING' }
      ]
    },
    realtimeFeed: {
      dronePhoto: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop&q=80',
      label: 'HORIZON BALLROOM SÂN KHẤU',
      caption: 'Thi công bục xoay chịu lực cho 02 xe Mercedes Maybach thành công'
    }
  }
];

const VENUE_CATALOG = [
  {
    id: 'HALL-BALLROOM-A',
    name: 'Grand Horizon Ballroom Khu A',
    area: '750 m²',
    capacityBanquet: 400,
    capacityTheater: 550,
    ceilingHeight: '7.5m',
    features: ['Vách ngăn cách âm', 'Màn LED P3 14m', 'Sàn thảm Axminster', 'Lối vào xe hơi']
  },
  {
    id: 'HALL-SUNSET-LAWN',
    name: 'Bãi Biển & Thảm Cỏ Hoàng Hôn (Sunset Lawn)',
    area: '1.200 m²',
    capacityBanquet: 250,
    capacityTheater: 350,
    ceilingHeight: 'Không gian mở trời biển',
    features: ['View hoàng hôn Bãi Dài', 'Sân khấu bãi cát', 'Đèn Fairy light lều bạt', 'Bãi bắn pháo hoa']
  },
  {
    id: 'HALL-HORIZON-BALLROOM',
    name: 'Horizon Ballroom & Ocean Loggia',
    area: '820 m²',
    capacityBanquet: 450,
    capacityTheater: 600,
    ceilingHeight: '8.0m',
    features: ['Loggia ngắm biển 200m²', 'Hệ thống giàn truss treo tải 5 tấn', 'Bục nâng xe hơi']
  },
  {
    id: 'HALL-BOARDROOM-VIP',
    name: 'Imperial Presidential Boardroom',
    area: '150 m²',
    capacityBanquet: 30,
    capacityTheater: 45,
    ceilingHeight: '4.2m',
    features: ['Bàn gỗ mun nguyên khối', 'Hội nghị truyền hình Polycom 4K', 'Phòng phục vụ riêng']
  }
];

const STATS_SUMMARY = {
  eventsThisWeek: 6,
  eventsThisWeekLabel: '06 SỰ KIỆN',
  eventsThisWeekDetail: '02 Hội nghị quốc tế • 01 Gala DN • 03 Cưới biển',
  revenueMonth: 4820000000,
  revenueMonthLabel: '4.820.000.000 đ',
  revenueGrowth: '+18.5% YoY (Đạt 94% KPI quý)',
  hallUtilization: 78.4,
  hallUtilizationLabel: '78.4% Khu sảnh tiệc',
  hallUtilizationDetail: 'Grand Ballroom & Ocean Loggia kín lịch',
  totalPax: 1450,
  totalPaxLabel: '1.450 KHÁCH VIP',
  totalPaxDetail: 'F&B Kitchen chuẩn bị 2.180 suất ăn & teabreak'
};

// GET /api/banquet-events - Lấy danh sách toàn bộ sự kiện & thống kê
router.get('/', (req, res) => {
  return res.json({
    success: true,
    stats: STATS_SUMMARY,
    venues: VENUE_CATALOG,
    events: MICE_EVENTS,
    total: MICE_EVENTS.length
  });
});

// GET /api/banquet-events/stats
router.get('/stats', (req, res) => {
  return res.json({
    success: true,
    stats: STATS_SUMMARY
  });
});

// GET /api/banquet-events/venues
router.get('/venues', (req, res) => {
  return res.json({
    success: true,
    venues: VENUE_CATALOG
  });
});

// GET /api/banquet-events/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const event = MICE_EVENTS.find(e => e.id === id || e.beoNumber.includes(id));
  if (!event) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy hồ sơ sự kiện ${id}`
    });
  }
  return res.json({
    success: true,
    event
  });
});

// POST /api/banquet-events - Lập hợp đồng sự kiện & BEO mới
router.post('/', (req, res) => {
  try {
    const data = req.body || {};
    const eventId = data.id || `MICE-${new Date().getFullYear()}-${String(MICE_EVENTS.length + 85).padStart(3, '0')}`;
    const beoNumber = `BEO #${eventId}`;
    const masterFolio = `MASTER FOLIO #EV-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalAmount = Number(data.totalAmount) || 350000000;
    const depositPaid = Number(data.depositPaid) || Math.round(totalAmount * 0.5);
    const remainingDue = totalAmount - depositPaid;

    const newEvent = {
      id: eventId,
      beoNumber,
      masterFolio,
      title: data.title || 'Hội Thảo & Dạ Tiệc Doanh Nghiệp',
      eventType: data.eventType || 'Gala Dinner Doanh Nghiệp',
      company: data.company || 'Tập đoàn Khách hàng MICE',
      host: data.host || `Chủ trì: ${data.company || 'Đoàn đại biểu'}`,
      contactPerson: {
        name: data.contactName || 'Ông/Bà Đại diện',
        title: data.contactTitle || 'Đại diện hợp đồng',
        phone: data.contactPhone || '+84 900 000 000',
        email: data.contactEmail || 'contact@client.com',
        initials: (data.contactName || 'KH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      },
      status: 'UPCOMING',
      statusBadge: `${data.date || 'HÔM NAY'} • ĐÃ XÁC NHẬN HỢP ĐỒNG`,
      statusBadgeType: 'info',
      date: data.date || new Date().toISOString().slice(0, 10),
      timeRange: data.timeRange || '18:00 - 22:00',
      currentSession: data.currentSession || 'Chương trình tiệc & Trao giải',
      venue: {
        id: data.venueId || 'HALL-BALLROOM-A',
        name: data.venueName || 'Grand Horizon Ballroom Khu A',
        type: 'Ballroom trong nhà cao cấp',
        paxMax: 500,
        areaM2: 750,
        ceilingHeight: '7.5m'
      },
      pax: Number(data.pax) || 200,
      paxLabel: `${Number(data.pax) || 200} Khách VIP`,
      catering: {
        menuType: data.menuType || 'Set Menu Gala Cao Cấp',
        menuCode: data.menuCode || 'MENU SIGNATURE #05',
        teabreakTag: data.teabreakTag || 'Teabreak & Cocktail Bar',
        lunchBuffet: data.lunchBuffet || 'N/A',
        dinnerGala: data.dinnerGala || 'Set Menu 6 món cao cấp tiêu chuẩn 5 sao',
        wineBeverage: data.wineBeverage || 'Rượu vang ngoại & Đồ uống suốt tiệc'
      },
      setup: {
        diagramCode: data.diagramCode || 'SƠ ĐỒ: GALA-STANDARD-B2',
        seatingStyle: data.seatingStyle || 'Bàn tròn 10 người/bàn',
        tablesChairs: data.tablesChairs || `Bàn tròn 10 người (${Math.ceil((Number(data.pax) || 200)/10)} bàn)`,
        stageLed: data.stageLed || 'Sân khấu & Màn hình LED P3 Indoor 12m x 4m',
        soundLight: data.soundLight || 'Dàn Line Array chuyên nghiệp + 6 mic không dây'
      },
      financial: {
        totalAmount,
        currency: 'VND',
        depositPaid,
        depositStage: `Đã cọc Đợt 1 (${Math.round((depositPaid/totalAmount)*100)}%)`,
        remainingDue,
        dueDate: data.dueDate || 'Trước ngày tổ chức 24h',
        guarantee: data.guarantee || 'BẢO LÃNH DOANH NGHIỆP',
        paymentHistory: [
          {
            stage: 'Đợt 1 - Cọc ký hợp đồng',
            amount: depositPaid,
            percent: Math.round((depositPaid / totalAmount) * 100),
            date: new Date().toISOString().slice(0, 10),
            method: data.paymentMethod || 'Chuyển khoản VCB',
            status: 'PAID'
          },
          {
            stage: 'Đợt 2 - Tạm ứng setup & F&B',
            amount: Math.round(totalAmount * 0.3),
            percent: 30,
            date: 'Theo phụ lục HĐ',
            method: 'Chờ đến hạn',
            status: 'PENDING'
          },
          {
            stage: 'Đợt 3 - Quyết toán Master Folio',
            amount: totalAmount - depositPaid - Math.round(totalAmount * 0.3),
            percent: 100 - Math.round((depositPaid / totalAmount) * 100) - 30,
            date: 'Check-out đoàn',
            method: 'Chờ kết thúc sự kiện',
            status: 'PENDING'
          }
        ]
      },
      realtimeFeed: {
        dronePhoto: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
        label: (data.venueName || 'BALLROOM KHU A').toUpperCase(),
        caption: `Chuẩn bị không gian cho ${data.title || 'Sự kiện mới'}`
      }
    };

    MICE_EVENTS.unshift(newEvent);

    // Update stats
    STATS_SUMMARY.eventsThisWeek += 1;
    STATS_SUMMARY.eventsThisWeekLabel = `0${STATS_SUMMARY.eventsThisWeek} SỰ KIỆN`;
    STATS_SUMMARY.totalPax += newEvent.pax;
    STATS_SUMMARY.totalPaxLabel = `${new Intl.NumberFormat('vi-VN').format(STATS_SUMMARY.totalPax)} KHÁCH VIP`;
    STATS_SUMMARY.revenueMonth += newEvent.financial.totalAmount;
    STATS_SUMMARY.revenueMonthLabel = `${new Intl.NumberFormat('vi-VN').format(STATS_SUMMARY.revenueMonth)} đ`;

    return res.status(201).json({
      success: true,
      message: 'Lập hợp đồng sự kiện MICE và tạo BEO thành công!',
      event: newEvent
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hợp đồng sự kiện MICE',
      error: err.message
    });
  }
});

// POST /api/banquet-events/:id/deposits - Ghi nhận thêm đợt đặt cọc
router.post('/:id/deposits', (req, res) => {
  const { id } = req.params;
  const { amount, stage, method, note } = req.body;
  const event = MICE_EVENTS.find(e => e.id === id || e.beoNumber.includes(id));
  if (!event) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
  }

  const depositVal = Number(amount) || 0;
  if (depositVal <= 0) {
    return res.status(400).json({ success: false, message: 'Số tiền đặt cọc phải lớn hơn 0' });
  }

  event.financial.depositPaid += depositVal;
  event.financial.remainingDue = Math.max(0, event.financial.totalAmount - event.financial.depositPaid);
  
  event.financial.paymentHistory.push({
    stage: stage || `Đợt bổ sung (${new Date().toLocaleDateString('vi-VN')})`,
    amount: depositVal,
    percent: Math.round((depositVal / event.financial.totalAmount) * 100),
    date: new Date().toISOString().slice(0, 10),
    method: method || 'Chuyển khoản VCB',
    note: note || 'Thu cọc bổ sung',
    status: 'PAID'
  });

  return res.json({
    success: true,
    message: `Đã ghi nhận đặt cọc ${new Intl.NumberFormat('vi-VN').format(depositVal)} đ cho hợp đồng!`,
    financial: event.financial
  });
});

// POST /api/banquet-events/:id/dispatch - Gửi thông báo điều hành AV & Kỹ thuật / Bếp
router.post('/:id/dispatch', (req, res) => {
  const { id } = req.params;
  const { department, urgentLevel, message } = req.body;
  const event = MICE_EVENTS.find(e => e.id === id || e.beoNumber.includes(id));
  if (!event) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
  }

  const dispatchLog = {
    id: `DISPATCH-${Date.now()}`,
    beoId: event.id,
    department: department || 'AV & Kỹ thuật',
    urgentLevel: urgentLevel || 'CAO',
    message: message || `Kiểm tra tổng duyệt âm thanh ánh sáng và micro cho sự kiện ${event.title}`,
    sentAt: new Date().toISOString()
  };

  return res.json({
    success: true,
    message: `Đã gửi lệnh điều phối đến ${dispatchLog.department} thành công!`,
    dispatch: dispatchLog
  });
});

// GET /api/banquet-events/:id/beo-export - Kết xuất nội dung BEO chi tiết
router.get('/:id/beo-export', (req, res) => {
  const { id } = req.params;
  const event = MICE_EVENTS.find(e => e.id === id || e.beoNumber.includes(id));
  if (!event) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ BEO' });
  }

  return res.json({
    success: true,
    hotel: 'GRAND HORIZON RESORT & SUITES PHÚ QUỐC',
    documentTitle: 'BANQUET EVENT ORDER (BEO) - LỆNH ĐIỀU HÀNH YẾN TIỆC & MICE',
    event,
    generatedAt: new Date().toISOString(),
    departments: ['F&B Kitchen', 'Banquet Service', 'AV Sound & Light', 'Housekeeping Linen', 'Security & Valet']
  });
});

module.exports = router;
