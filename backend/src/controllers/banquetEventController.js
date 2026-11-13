'use strict';

const {
  sequelize,
  BanquetHall,
  BanquetEventBooking,
  BanquetDepositStage,
} = require('../models');
const { Op } = require('sequelize');

// Seed data definitions matching the 5-star PMS Grand Horizon theme
const DEFAULT_HALLS = [
  {
    HallCode: 'HALL-BALLROOM-A',
    HallName: 'Grand Horizon Ballroom Khu A',
    HallType: 'BALLROOM',
    MaxCapacityBanquet: 400,
    MaxCapacityTheater: 550,
    MaxCapacityClassroom: 300,
    AreaM2: 750,
    CeilingHeight: '7.5m',
    BaseRentalPricePerSession: 85000000,
    FeaturesJson: JSON.stringify(['Vách ngăn cách âm', 'Màn LED P3 14m', 'Sàn thảm Axminster', 'Lối vào xe hơi']),
    Status: 'OCCUPIED',
    ImageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80',
  },
  {
    HallCode: 'HALL-SUNSET-LAWN',
    HallName: 'Bãi Biển & Thảm Cỏ Hoàng Hôn (Sunset Lawn)',
    HallType: 'BEACH_OUTDOOR',
    MaxCapacityBanquet: 250,
    MaxCapacityTheater: 350,
    MaxCapacityClassroom: 150,
    AreaM2: 1200,
    CeilingHeight: 'Không gian mở trời biển',
    BaseRentalPricePerSession: 65000000,
    FeaturesJson: JSON.stringify(['View hoàng hôn Bãi Dài', 'Sân khấu bãi cát', 'Đèn Fairy light lều bạt', 'Bãi bắn pháo hoa']),
    Status: 'SETUP_IN_PROGRESS',
    ImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
  },
  {
    HallCode: 'HALL-HORIZON-BALLROOM',
    HallName: 'Horizon Ballroom & Ocean Loggia',
    HallType: 'BALLROOM',
    MaxCapacityBanquet: 450,
    MaxCapacityTheater: 600,
    MaxCapacityClassroom: 350,
    AreaM2: 820,
    CeilingHeight: '8.0m',
    BaseRentalPricePerSession: 95000000,
    FeaturesJson: JSON.stringify(['Loggia ngắm biển 200m²', 'Hệ thống giàn truss treo tải 5 tấn', 'Bục nâng xe hơi']),
    Status: 'AVAILABLE',
    ImageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop&q=80',
  },
  {
    HallCode: 'HALL-BOARDROOM-VIP',
    HallName: 'Imperial Presidential Boardroom',
    HallType: 'BOARDROOM',
    MaxCapacityBanquet: 30,
    MaxCapacityTheater: 45,
    MaxCapacityClassroom: 25,
    AreaM2: 150,
    CeilingHeight: '4.2m',
    BaseRentalPricePerSession: 25000000,
    FeaturesJson: JSON.stringify(['Bàn gỗ mun nguyên khối', 'Hội nghị truyền hình Polycom 4K', 'Phòng phục vụ riêng']),
    Status: 'AVAILABLE',
    ImageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&auto=format&fit=crop&q=80',
  },
];

// Fallback in-memory state
let memoryEvents = [
  {
    BookingId: 1,
    id: 'MICE-2025-081',
    EventCode: 'MICE-2025-081',
    beoNumber: 'BEO #MICE-2025-081',
    BeoNumber: 'BEO #MICE-2025-081',
    masterFolio: 'MASTER FOLIO #EV-8819',
    MasterFolio: 'MASTER FOLIO #EV-8819',
    title: 'Hội Nghị Thượng Đỉnh FinTech Châu Á 2025',
    EventTitle: 'Hội Nghị Thượng Đỉnh FinTech Châu Á 2025',
    eventType: 'Hội nghị quốc tế',
    EventType: 'Hội nghị quốc tế',
    company: 'Hiệp Hội Công Nghệ Tài Chính Châu Á (AFTA)',
    CompanyName: 'Hiệp Hội Công Nghệ Tài Chính Châu Á (AFTA)',
    host: 'Đơn vị chủ trì: Hiệp Hội Công Nghệ Tài Chính • Chủ trì đoàn: TS. Nguyễn Hùng Việt',
    HostName: 'Đơn vị chủ trì: Hiệp Hội Công Nghệ Tài Chính • Chủ trì đoàn: TS. Nguyễn Hùng Việt',
    contactPerson: {
      name: 'TS. Nguyễn Hùng Việt',
      title: 'Chủ tịch Hiệp hội & Trưởng Ban Tổ Chức',
      phone: '+84 908 112 334',
      email: 'hungviet.nguyen@afta-fintech.org',
      initials: 'HV',
    },
    ContactName: 'TS. Nguyễn Hùng Việt',
    ContactTitle: 'Chủ tịch Hiệp hội & Trưởng Ban Tổ Chức',
    ContactPhone: '+84 908 112 334',
    ContactEmail: 'hungviet.nguyen@afta-fintech.org',
    ContactInitials: 'HV',
    status: 'IN_PROGRESS',
    Status: 'IN_PROGRESS',
    statusBadge: 'ĐANG DIỄN RA • ĐÃ PHỤC VỤ TEABREAK',
    StatusBadge: 'ĐANG DIỄN RA • ĐÃ PHỤC VỤ TEABREAK',
    statusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    StatusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    EventDate: '2025-10-23',
    timeRange: '08:00 - 17:30',
    TimeRange: '08:00 - 17:30',
    sessionNote: 'Phiên Chiều: Q&A Diễn Đàn',
    CurrentSession: 'Phiên Chiều: Q&A Diễn Đàn',
    venuePill: 'Sảnh Grand Horiz...',
    venueFull: 'Sảnh Grand Horizon Ballroom Khu A',
    HallName: 'Sảnh Grand Horizon Ballroom Khu A',
    paxPill: '350 Khách VIP',
    pax: 350,
    PaxCount: 350,
    cateringPill: 'Teabreak Cao Cấ...',
    cateringFull: 'Teabreak Cao Cấp (Bánh Pháp, Macaron, Trà TWG)',
    setup: {
      diagramCode: 'SƠ ĐỒ: FINTECH-THEATER-CONF-A1',
      seatingStyle: 'Kiểu lớp học kết hợp Theater (350 chỗ ngồi tài liệu)',
      tablesChairs: '35 dãy bàn chữ nhật phủ nỉ sẫm màu + 350 ghế banquet VIP',
      stageLed: 'P3 Indoor LED 14m x 4.5m + 2 màn hình phụ 85 inch',
      soundLight: 'Dàn Line Array JBL VTX + 12 mic cổ ngỗng + 6 mic không dây',
    },
    TablesChairsSetup: '35 dãy bàn chữ nhật phủ nỉ sẫm màu + 350 ghế banquet VIP',
    StageLedConfig: 'P3 Indoor LED 14m x 4.5m + 2 màn hình phụ 85 inch',
    SoundLightConfig: 'Dàn Line Array JBL VTX + 12 mic cổ ngỗng + 6 mic không dây',
    DiagramCode: 'SƠ ĐỒ: FINTECH-THEATER-CONF-A1',
    catering: {
      menuSignature: 'MENU CORPORATE #02',
      galaDinner: 'Buffet Á - Âu 350 suất phục vụ tại Horizon Grand Terrace',
      welcomeWine: 'Gói trà cao cấp TWG, Nước ép Cold-pressed organic & Cocktail nhẹ',
      lunchBuffet: 'Buffet hội thảo trưa: 350 suất phục vụ tại Horizon Grand Terrace',
    },
    GalaDinnerMenu: 'Buffet Á - Âu 350 suất phục vụ tại Horizon Grand Terrace',
    WelcomeWineDrinks: 'Gói trà cao cấp TWG, Nước ép Cold-pressed organic & Cocktail nhẹ',
    LunchBuffetMenu: 'Buffet hội thảo trưa: 350 suất phục vụ tại Horizon Grand Terrace',
    MenuType: 'Buffet Á - Âu & Teabreak TWG',
    MenuCode: 'MENU CORPORATE #02',
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
    TotalContractAmount: 520000000,
    DepositPaid: 364000000,
    RemainingDue: 156000000,
    DueDate: '24/10/2025 (Check-out đoàn)',
    GuaranteeType: 'BẢO LÃNH DOANH NGHIỆP',
  },
  {
    BookingId: 2,
    id: 'WED-2025-044',
    EventCode: 'WED-2025-044',
    beoNumber: 'BEO #WED-2025-044',
    BeoNumber: 'BEO #WED-2025-044',
    masterFolio: 'MASTER FOLIO #EV-8820',
    MasterFolio: 'MASTER FOLIO #EV-8820',
    title: 'Tiệc Cưới Hoàng Hôn Bãi Biển - Arthur & Linh Wedding',
    EventTitle: 'Tiệc Cưới Hoàng Hôn Bãi Biển - Arthur & Linh Wedding',
    eventType: 'Tiệc cưới hoàng hôn bãi biển',
    EventType: 'Tiệc cưới hoàng hôn bãi biển',
    company: 'Arthur Morgan & Khánh Linh Wedding',
    CompanyName: 'Arthur Morgan & Khánh Linh Wedding',
    host: 'Wedding Planner: The Planners Vietnam • Phong cách: Tropical White Riviera',
    HostName: 'Wedding Planner: The Planners Vietnam • Phong cách: Tropical White Riviera',
    contactPerson: {
      name: 'Ms. Chloe Hoàng (The Planners)',
      title: 'Senior Wedding Planner & Điều Phối',
      phone: '+84 938 789 654',
      email: 'chloe@theplanners.vn',
      initials: 'CL',
    },
    ContactName: 'Ms. Chloe Hoàng (The Planners)',
    ContactTitle: 'Senior Wedding Planner & Điều Phối',
    ContactPhone: '+84 938 789 654',
    ContactEmail: 'chloe@theplanners.vn',
    ContactInitials: 'CL',
    status: 'SETUP',
    Status: 'SETUP',
    statusBadge: 'TỐI NAY 18:30 • ĐANG SETUP BÀN HOA & SÂN KHẤU',
    StatusBadge: 'TỐI NAY 18:30 • ĐANG SETUP BÀN HOA & SÂN KHẤU',
    statusBadgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    StatusBadgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    EventDate: '2025-10-23',
    timeRange: '18:30 - 22:30',
    TimeRange: '18:30 - 22:30',
    sessionNote: 'Khai tiệc & Pháo hoa',
    CurrentSession: 'Khai tiệc & Pháo hoa',
    venuePill: 'Bãi Sunset Lawn &...',
    venueFull: 'Bãi Sunset Lawn & Thảm Cỏ Bờ Biển',
    HallName: 'Bãi Sunset Lawn & Thảm Cỏ Bờ Biển',
    paxPill: '120 Khách Mời VIP',
    pax: 120,
    PaxCount: 120,
    cateringPill: 'Set 6 món: Cá tuy...',
    cateringFull: 'Set 6 món cao cấp: Cá tuyết Chi-lê áp chảo, Bò Wagyu A5',
    setup: {
      diagramCode: 'SƠ ĐỒ: WEDDING-RIVIERA-BEACH',
      seatingStyle: 'Bàn tròn tiệc cưới 10 người/bàn (12 bàn = 120 pax)',
      tablesChairs: '12 bàn tròn nỉ trắng san hô + Ghế Chiavari vàng champagne đính hoa hồng',
      stageLed: 'Cổng hoa vòm nghệ thuật ngoài biển + Bục gỗ teak + Pháo hoa tầm thấp',
      soundLight: 'Dàn âm thanh biển Acoustic D&B Audiotechnik + Dải đèn fairy light lung linh',
    },
    TablesChairsSetup: '12 bàn tròn nỉ trắng san hô + Ghế Chiavari vàng champagne đính hoa hồng',
    StageLedConfig: 'Cổng hoa vòm nghệ thuật ngoài biển + Bục gỗ teak + Pháo hoa tầm thấp',
    SoundLightConfig: 'Dàn âm thanh biển Acoustic D&B Audiotechnik + Dải đèn fairy light lung linh',
    DiagramCode: 'SƠ ĐỒ: WEDDING-RIVIERA-BEACH',
    catering: {
      menuSignature: 'MENU WEDDING ROYAL #01',
      galaDinner: 'Set 6 món: Súp vi cá, Cá tuyết Chi-lê áp chảo sốt bơ chanh, Thăn ngoại Wagyu A5',
      welcomeWine: 'Champagne Moët & Chandon đón dâu (24 chai) + Tropical Cocktail Bar bãi biển',
      lunchBuffet: 'N/A (Chỉ tiệc Gala tối ngoài trời)',
    },
    GalaDinnerMenu: 'Set 6 món: Súp vi cá, Cá tuyết Chi-lê áp chảo sốt bơ chanh, Thăn ngoại Wagyu A5',
    WelcomeWineDrinks: 'Champagne Moët & Chandon đón dâu (24 chai) + Tropical Cocktail Bar bãi biển',
    LunchBuffetMenu: 'N/A',
    MenuType: 'Set Menu Wedding 6 Món Cao Cấp',
    MenuCode: 'MENU WEDDING ROYAL #01',
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
    TotalContractAmount: 430000000,
    DepositPaid: 344000000,
    RemainingDue: 86000000,
    DueDate: '23/10/2025 (Trước giờ khai tiệc)',
    GuaranteeType: 'BẢO LÃNH THẺ TÍN DỤNG VIP',
  },
  {
    BookingId: 3,
    id: 'MICE-2025-089',
    EventCode: 'MICE-2025-089',
    beoNumber: 'BEO #MICE-2025-089',
    BeoNumber: 'BEO #MICE-2025-089',
    masterFolio: 'MASTER FOLIO #EV-8821',
    MasterFolio: 'MASTER FOLIO #EV-8821',
    title: 'Dạ Tiệc Tri Ân Khách Hàng VIP Mercedes-Benz',
    EventTitle: 'Dạ Tiệc Tri Ân Khách Hàng VIP Mercedes-Benz',
    eventType: 'Gala Dinner Doanh Nghiệp',
    EventType: 'Gala Dinner Doanh Nghiệp',
    company: 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm',
    CompanyName: 'Công ty Cổ phần Tập đoàn Dược phẩm Vinapharm',
    host: 'Đơn vị: Mercedes-Benz Vietnam • Yêu cầu đặc biệt: Đưa 02 xe sedan lên bục xoay',
    HostName: 'Đơn vị: Mercedes-Benz Vietnam • Yêu cầu đặc biệt: Đưa 02 xe sedan lên bục xoay',
    contactPerson: {
      name: 'Bà Trần Thu Trang',
      title: 'Giám Đốc Đối Ngoại & Truyền Thông',
      phone: '+84 912 345 889',
      email: 'trang.tran@vinapharm.vn',
      initials: 'TT',
    },
    ContactName: 'Bà Trần Thu Trang',
    ContactTitle: 'Giám Đốc Đối Ngoại & Truyền Thông',
    ContactPhone: '+84 912 345 889',
    ContactEmail: 'trang.tran@vinapharm.vn',
    ContactInitials: 'TT',
    status: 'UPCOMING',
    Status: 'UPCOMING',
    statusBadge: 'NGÀY MAI 18:00 • TIỀN KỲ SETUP SÂN KHẤU',
    StatusBadge: 'NGÀY MAI 18:00 • TIỀN KỲ SETUP SÂN KHẤU',
    statusBadgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    StatusBadgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    EventDate: '2025-10-24',
    timeRange: '18:00 - 22:00',
    TimeRange: '18:00 - 22:00',
    sessionNote: 'Ngày mai (24/10)',
    CurrentSession: 'Ngày mai (24/10)',
    venuePill: 'Horizon Ballroom...',
    venueFull: 'Horizon Ballroom & Ocean Loggia',
    HallName: 'Horizon Ballroom & Ocean Loggia',
    paxPill: '200 Khách VIP',
    pax: 200,
    PaxCount: 200,
    cateringPill: 'Cocktail Receptio...',
    cateringFull: 'Cocktail Reception & Set Menu 6 món cao cấp Signature #04',
    setup: {
      diagramCode: 'SƠ ĐỒ: GALA-BANQUET-A3',
      seatingStyle: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
      tablesChairs: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
      stageLed: 'P3 Indoor 12m x 4m + 2 cánh LED phụ',
      soundLight: 'Hệ thống Line Array + 8 mic hội nghị không dây',
    },
    TablesChairsSetup: 'Bàn tròn 10 người/bàn (35 bàn = 350 pax)',
    StageLedConfig: 'P3 Indoor 12m x 4m + 2 cánh LED phụ',
    SoundLightConfig: 'Hệ thống Line Array + 8 mic hội nghị không dây',
    DiagramCode: 'SƠ ĐỒ: GALA-BANQUET-A3',
    catering: {
      menuSignature: 'MENU SIGNATURE #04',
      galaDinner: 'Set Menu 6 món cao cấp (Bào ngư, Bò Wagyu)',
      welcomeWine: 'Château Margaux 2018 (35 chai) + Cocktail Bar',
      lunchBuffet: '350 suất phục vụ tại Horizon Grand Terrace',
    },
    GalaDinnerMenu: 'Set Menu 6 món cao cấp (Bào ngư, Bò Wagyu)',
    WelcomeWineDrinks: 'Château Margaux 2018 (35 chai) + Cocktail Bar',
    LunchBuffetMenu: '350 suất phục vụ tại Horizon Grand Terrace',
    MenuType: 'Set Menu 6 Món Cao Cấp Signature #04',
    MenuCode: 'MENU SIGNATURE #04',
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
    TotalContractAmount: 680000000,
    DepositPaid: 340000000,
    RemainingDue: 340000000,
    DueDate: '25/10/2025 (Check-out đoàn)',
    GuaranteeType: 'BẢO LÃNH DOANH NGHIỆP',
  },
];

// Helper to calculate statistics
function calculateStatistics(eventsList) {
  const totalPax = eventsList.reduce((sum, ev) => sum + (Number(ev.pax || ev.PaxCount) || 0), 0);
  const totalRevenue = eventsList.reduce((sum, ev) => sum + (Number(ev.financial?.totalAmount || ev.TotalContractAmount) || 0), 0);

  return {
    eventsThisWeek: eventsList.length,
    eventsThisWeekLabel: `0${eventsList.length} SỰ KIỆN`,
    eventsThisWeekDetail: '02 Hội nghị quốc tế • 01 Gala DN • 03 Cưới biển',
    revenueMonth: totalRevenue || 4820000000,
    revenueMonthLabel: `${new Intl.NumberFormat('vi-VN').format(totalRevenue || 4820000000)} đ`,
    revenueGrowth: '+18.5% YoY (Đạt 94% KPI quý)',
    hallUtilization: 78.4,
    hallUtilizationLabel: '78.4% Khu sảnh tiệc',
    hallUtilizationDetail: 'Grand Ballroom & Ocean Loggia kín lịch',
    totalPax: totalPax || 1450,
    totalPaxLabel: `${new Intl.NumberFormat('vi-VN').format(totalPax || 1450)} KHÁCH VIP`,
    totalPaxDetail: `F&B Kitchen chuẩn bị ${new Intl.NumberFormat('vi-VN').format((totalPax || 1450) * 1.5)} suất ăn & teabreak`,
  };
}

// 1. GET ALL EVENTS & STATS
exports.getAllEvents = async (req, res) => {
  try {
    const { period, status, search } = req.query;

    let dbEvents = [];
    try {
      dbEvents = await BanquetEventBooking.findAll({
        include: [
          { model: BanquetDepositStage, as: 'depositStages' },
          { model: BanquetHall, as: 'hall' },
        ],
        order: [['CreatedAt', 'DESC']],
      });
    } catch (_) {
      dbEvents = [];
    }

    const mergedEvents = dbEvents.length > 0 ? dbEvents.map((e) => e.toJSON()) : memoryEvents;

    // Filter by period/search if provided
    let filtered = [...mergedEvents];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.title || e.EventTitle || '').toLowerCase().includes(q) ||
          (e.company || e.CompanyName || '').toLowerCase().includes(q) ||
          (e.beoNumber || e.BeoNumber || '').toLowerCase().includes(q)
      );
    }

    const stats = calculateStatistics(mergedEvents);

    return res.json({
      success: true,
      stats,
      venues: DEFAULT_HALLS,
      events: filtered,
      total: filtered.length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách sự kiện MICE',
      error: err.message,
    });
  }
};

// 2. GET EVENT BY ID / BEO NUMBER
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    let event = null;
    try {
      event = await BanquetEventBooking.findOne({
        where: {
          [Op.or]: [
            { EventCode: id },
            { BeoNumber: id },
            { BeoNumber: `BEO #${id}` },
          ],
        },
        include: [
          { model: BanquetDepositStage, as: 'depositStages' },
          { model: BanquetHall, as: 'hall' },
        ],
      });
      if (event) event = event.toJSON();
    } catch (_) {}

    if (!event) {
      event = memoryEvents.find(
        (e) => e.id === id || e.EventCode === id || e.beoNumber.includes(id) || e.BeoNumber?.includes(id)
      );
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ sự kiện ${id}`,
      });
    }

    return res.json({
      success: true,
      event,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết sự kiện',
      error: err.message,
    });
  }
};

// 3. CREATE EVENT CONTRACT & BEO (WITH HALL CONFLICT CHECKING)
exports.createEventBooking = async (req, res) => {
  try {
    const data = req.body || {};

    // Validation checks
    if (!data.title && !data.company) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên sự kiện và tên công ty/đoàn khách',
      });
    }

    const eventDate = data.date || data.EventDate || new Date().toISOString().slice(0, 10);
    const hallName = data.venueName || data.HallName || 'Grand Horizon Ballroom Khu A';

    // Conflict detection: Check if same hall is already booked for that date & time
    const isConflict = memoryEvents.some(
      (e) =>
        (e.EventDate === eventDate || e.financial?.dueDate?.includes(eventDate)) &&
        (e.venueFull === hallName || e.HallName === hallName) &&
        e.Status !== 'CANCELLED'
    );

    if (isConflict && data.forceOverride !== true) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: `Sảnh tiệc "${hallName}" đã có lịch tổ chức sự kiện vào ngày ${eventDate}. Vui lòng chọn khung giờ khác hoặc kích hoạt chế độ forceOverride.`,
      });
    }

    const eventId = data.id || `MICE-2025-${String(memoryEvents.length + 90).padStart(3, '0')}`;
    const beoNumber = `BEO #${eventId}`;
    const masterFolio = `MASTER FOLIO #EV-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalAmount = Number(data.totalAmount) || 450000000;
    const depositPercent = Number(data.depositPercent) || 50;
    const depositPaid = Number(data.depositPaid) || Math.round((totalAmount * depositPercent) / 100);
    const remainingDue = Math.max(0, totalAmount - depositPaid);

    // Initial 3-stage payment plan
    const depositStages = [
      {
        stage: `Đợt 1 - Cọc hợp đồng (${depositPercent}%)`,
        amount: depositPaid,
        percent: depositPercent,
        date: new Date().toLocaleDateString('vi-VN'),
        method: data.paymentMethod || 'Chuyển khoản VCB',
        status: 'PAID',
        notes: 'Cọc giữ chỗ & xác nhận dịch vụ',
      },
      {
        stage: 'Đợt 2 - Tạm ứng thực đơn & setup AV (30%)',
        amount: Math.round(totalAmount * 0.3),
        percent: 30,
        date: 'Trước sự kiện 24h',
        method: 'Chờ đến hạn',
        status: 'PENDING',
        notes: 'Tạm ứng nhập thực phẩm & giàn đèn sân khấu',
      },
      {
        stage: 'Đợt 3 - Quyết toán Master Folio',
        amount: Math.max(0, totalAmount - depositPaid - Math.round(totalAmount * 0.3)),
        percent: Math.max(0, 100 - depositPercent - 30),
        date: 'Check-out đoàn',
        method: 'Chờ kết thúc',
        status: 'PENDING',
        notes: 'Thanh toán số dư thực tế theo BEO',
      },
    ];

    const newEvent = {
      BookingId: Date.now(),
      id: eventId,
      EventCode: eventId,
      beoNumber,
      BeoNumber: beoNumber,
      masterFolio,
      MasterFolio: masterFolio,
      title: data.title || `${data.company || 'Doanh Nghiệp'} - Sự Kiện MICE Mới`,
      EventTitle: data.title || `${data.company || 'Doanh Nghiệp'} - Sự Kiện MICE Mới`,
      eventType: data.eventType || 'Gala Dinner Doanh Nghiệp',
      EventType: data.eventType || 'Gala Dinner Doanh Nghiệp',
      company: data.company || 'Tập đoàn Khách hàng MICE',
      CompanyName: data.company || 'Tập đoàn Khách hàng MICE',
      host: `Đơn vị: ${data.company || 'Đoàn đại biểu'} • Chủ trì: ${data.contactName || 'Đại diện'}`,
      HostName: `Đơn vị: ${data.company || 'Đoàn đại biểu'} • Chủ trì: ${data.contactName || 'Đại diện'}`,
      contactPerson: {
        name: data.contactName || 'Ông/Bà Đại diện',
        title: data.contactTitle || 'Trưởng Ban Tổ Chức',
        phone: data.contactPhone || '+84 901 234 567',
        email: data.contactEmail || 'contact@client.com',
        initials: (data.contactName || 'KH').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      },
      ContactName: data.contactName || 'Ông/Bà Đại diện',
      ContactTitle: data.contactTitle || 'Trưởng Ban Tổ Chức',
      ContactPhone: data.contactPhone || '+84 901 234 567',
      ContactEmail: data.contactEmail || 'contact@client.com',
      ContactInitials: (data.contactName || 'KH').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      status: 'UPCOMING',
      Status: 'UPCOMING',
      statusBadge: `${eventDate} • ĐÃ KÝ HỢP ĐỒNG & NHẬN CỌC`,
      StatusBadge: `${eventDate} • ĐÃ KÝ HỢP ĐỒNG & NHẬN CỌC`,
      statusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      StatusBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      EventDate: eventDate,
      timeRange: data.timeRange || '18:00 - 22:00',
      TimeRange: data.timeRange || '18:00 - 22:00',
      sessionNote: 'Tiền kỳ setup & Tiếp đón',
      CurrentSession: 'Tiền kỳ setup & Tiếp đón',
      venuePill: hallName.slice(0, 16) + '...',
      venueFull: hallName,
      HallName: hallName,
      paxPill: `${data.pax || 200} Khách VIP`,
      pax: Number(data.pax) || 200,
      PaxCount: Number(data.pax) || 200,
      cateringPill: (data.menuType || 'Set Menu Gala 6 Món').slice(0, 16) + '...',
      cateringFull: data.menuType || 'Set Menu Gala 6 Món Cao Cấp',
      setup: {
        diagramCode: data.diagramCode || 'SƠ ĐỒ: GALA-STANDARD-A1',
        seatingStyle: data.seatingStyle || 'Bàn tròn 10 người/bàn',
        tablesChairs: data.tablesChairs || `Bàn tròn 10 người/bàn (${Math.ceil((Number(data.pax) || 200) / 10)} bàn)`,
        stageLed: data.stageLed || 'Sân khấu & Màn hình LED P3 Indoor 12m x 4m',
        soundLight: data.soundLight || 'Hệ thống Line Array + 8 mic hội nghị không dây',
      },
      TablesChairsSetup: data.tablesChairs || `Bàn tròn 10 người/bàn (${Math.ceil((Number(data.pax) || 200) / 10)} bàn)`,
      StageLedConfig: data.stageLed || 'Sân khấu & Màn hình LED P3 Indoor 12m x 4m',
      SoundLightConfig: data.soundLight || 'Hệ thống Line Array + 8 mic hội nghị không dây',
      DiagramCode: data.diagramCode || 'SƠ ĐỒ: GALA-STANDARD-A1',
      catering: {
        menuSignature: data.menuCode || 'MENU SIGNATURE #05',
        galaDinner: data.galaDinner || 'Set 6 món cao cấp tiêu chuẩn 5 sao',
        welcomeWine: data.welcomeWine || 'Rượu vang Château Margaux 2018 + Cocktail Bar',
        lunchBuffet: data.lunchBuffet || 'Buffet Á - Âu tại Horizon Grand Terrace',
      },
      GalaDinnerMenu: data.galaDinner || 'Set 6 món cao cấp tiêu chuẩn 5 sao',
      WelcomeWineDrinks: data.welcomeWine || 'Rượu vang Château Margaux 2018 + Cocktail Bar',
      LunchBuffetMenu: data.lunchBuffet || 'Buffet Á - Âu tại Horizon Grand Terrace',
      MenuType: data.menuType || 'Set Menu Gala 6 Món Cao Cấp',
      MenuCode: data.menuCode || 'MENU SIGNATURE #05',
      financial: {
        totalAmount,
        depositPaid,
        remainingDue,
        depositText: `Đã cọc Đợt 1 (${depositPercent}% qua ${data.paymentMethod || 'VCB'}):`,
        dueDate: `${eventDate} (Check-out đoàn)`,
        guaranteeType: data.guaranteeType || 'BẢO LÃNH DOANH NGHIỆP',
        paymentHistory: depositStages,
      },
      TotalContractAmount: totalAmount,
      DepositPaid: depositPaid,
      RemainingDue: remainingDue,
      DueDate: `${eventDate} (Check-out đoàn)`,
      GuaranteeType: data.guaranteeType || 'BẢO LÃNH DOANH NGHIỆP',
    };

    memoryEvents.unshift(newEvent);

    // Persist to DB if table exists
    try {
      await BanquetEventBooking.create({
        EventCode: eventId,
        BeoNumber: beoNumber,
        MasterFolio: masterFolio,
        EventTitle: newEvent.title,
        EventType: newEvent.eventType,
        CompanyName: newEvent.company,
        HostName: newEvent.host,
        ContactName: newEvent.ContactName,
        ContactTitle: newEvent.ContactTitle,
        ContactPhone: newEvent.ContactPhone,
        ContactEmail: newEvent.ContactEmail,
        ContactInitials: newEvent.ContactInitials,
        HallName: hallName,
        EventDate: eventDate,
        TimeRange: newEvent.timeRange,
        CurrentSession: newEvent.CurrentSession,
        PaxCount: newEvent.PaxCount,
        SeatingStyle: newEvent.setup.seatingStyle,
        TablesChairsSetup: newEvent.setup.tablesChairs,
        StageLedConfig: newEvent.setup.stageLed,
        SoundLightConfig: newEvent.setup.soundLight,
        DiagramCode: newEvent.setup.diagramCode,
        MenuType: newEvent.MenuType,
        MenuCode: newEvent.MenuCode,
        GalaDinnerMenu: newEvent.catering.galaDinner,
        WelcomeWineDrinks: newEvent.catering.welcomeWine,
        LunchBuffetMenu: newEvent.catering.lunchBuffet,
        TotalContractAmount: totalAmount,
        DepositPaid: depositPaid,
        RemainingDue: remainingDue,
        DueDate: newEvent.financial.dueDate,
        GuaranteeType: newEvent.financial.guaranteeType,
        Status: 'CONFIRMED',
        StatusBadge: newEvent.statusBadge,
        StatusBadgeColor: newEvent.statusBadgeColor,
      });
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: 'Lập hợp đồng sự kiện MICE và tạo BEO thành công!',
      event: newEvent,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hợp đồng sự kiện MICE',
      error: err.message,
    });
  }
};

// 4. RECORD DEPOSIT PAYMENT BY STAGE
exports.recordDepositPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, stage, method, receiptNumber, note } = req.body;

    const depositVal = Number(amount) || 0;
    if (depositVal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền đặt cọc phải lớn hơn 0',
      });
    }

    const event = memoryEvents.find((e) => e.id === id || e.EventCode === id || e.beoNumber.includes(id));
    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sự kiện ${id}`,
      });
    }

    event.financial.depositPaid += depositVal;
    event.DepositPaid = event.financial.depositPaid;
    event.financial.remainingDue = Math.max(0, event.financial.totalAmount - event.financial.depositPaid);
    event.RemainingDue = event.financial.remainingDue;

    const newPaymentRecord = {
      stage: stage || `Đợt bổ sung (${new Date().toLocaleDateString('vi-VN')})`,
      amount: depositVal,
      percent: Math.round((depositVal / event.financial.totalAmount) * 100),
      date: new Date().toLocaleDateString('vi-VN'),
      method: method || 'Chuyển khoản VCB',
      receiptNumber: receiptNumber || `UNC-VCB-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'PAID',
      notes: note || 'Thu cọc bổ sung cho hợp đồng sự kiện',
    };

    event.financial.paymentHistory.push(newPaymentRecord);

    // Update in DB if available
    try {
      await BanquetEventBooking.update(
        {
          DepositPaid: event.financial.depositPaid,
          RemainingDue: event.financial.remainingDue,
        },
        { where: { EventCode: event.EventCode || event.id } }
      );
    } catch (_) {}

    return res.json({
      success: true,
      message: `Đã ghi nhận đặt cọc ${new Intl.NumberFormat('vi-VN').format(depositVal)} đ vào Master Folio!`,
      financial: event.financial,
      payment: newPaymentRecord,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi thu tiền cọc sự kiện',
      error: err.message,
    });
  }
};

// 5. SEND REAL-TIME DISPATCH NOTIFICATION
exports.sendDispatchNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, urgentLevel, message } = req.body;

    const event = memoryEvents.find((e) => e.id === id || e.EventCode === id || e.beoNumber.includes(id));
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
    }

    const dispatchRecord = {
      id: `DISPATCH-${Date.now()}`,
      beoId: event.id || event.EventCode,
      eventTitle: event.title || event.EventTitle,
      department: department || 'AV & Kỹ Thuật (Sound & Light)',
      urgentLevel: urgentLevel || 'KHẨN CẤP',
      message: message || `Điều phối âm thanh ánh sáng cho sự kiện ${event.title}`,
      sentAt: new Date().toISOString(),
      acknowledged: false,
    };

    return res.json({
      success: true,
      message: `Đã phát lệnh điều phối đến ${dispatchRecord.department} thành công!`,
      dispatch: dispatchRecord,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi thông báo điều phối',
      error: err.message,
    });
  }
};

// 6. EXPORT BEO DOCUMENT FOR 5 DEPARTMENTS
exports.exportBEODocument = async (req, res) => {
  try {
    const { id } = req.params;
    const event = memoryEvents.find((e) => e.id === id || e.EventCode === id || e.beoNumber.includes(id));
    if (!event) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ BEO' });
    }

    const beoDossier = {
      hotel: 'GRAND HORIZON RESORT & SUITES PHÚ QUỐC',
      resortAddress: 'Bãi Dài, Gành Dầu, TP. Phú Quốc, Kiên Giang',
      documentTitle: 'BANQUET EVENT ORDER (BEO) - LỆNH ĐIỀU HÀNH YẾN TIỆC & MICE',
      beoCode: event.beoNumber || event.BeoNumber,
      masterFolio: event.masterFolio || event.MasterFolio,
      generatedAt: new Date().toISOString(),
      eventOverview: {
        title: event.title || event.EventTitle,
        company: event.company || event.CompanyName,
        contact: event.contactPerson || {
          name: event.ContactName,
          title: event.ContactTitle,
          phone: event.ContactPhone,
          email: event.ContactEmail,
        },
        venue: event.venueFull || event.HallName,
        timeRange: event.timeRange || event.TimeRange,
        pax: event.pax || event.PaxCount,
      },
      departmentalOrders: [
        {
          department: '1. Bếp Trưởng & Ẩm Thực F&B Kitchen',
          tasks: [
            `Thực đơn: ${event.catering?.galaDinner || event.GalaDinnerMenu}`,
            `Rượu & Đồ uống: ${event.catering?.welcomeWine || event.WelcomeWineDrinks}`,
            `Buffet trưa: ${event.catering?.lunchBuffet || event.LunchBuffetMenu || 'N/A'}`,
            'Kiểm tra chứng nhận vệ sinh an toàn thực phẩm & lưu mẫu 24h',
          ],
        },
        {
          department: '2. Kỹ Thuật AV, Âm Thanh & Ánh Sáng',
          tasks: [
            `Màn LED: ${event.setup?.stageLed || event.StageLedConfig}`,
            `Dàn loa & Micro: ${event.setup?.soundLight || event.SoundLightConfig}`,
            'Kiểm tra tín hiệu đường truyền trực tiếp & slide thuyết trình của diễn giả trước 60 phút',
          ],
        },
        {
          department: '3. Bộ Phận Buồng Phòng & Khăn Vải Linen',
          tasks: [
            `Quy cách bàn ghế: ${event.setup?.tablesChairs || event.TablesChairsSetup}`,
            `Sơ đồ sắp đặt: ${event.setup?.diagramCode || event.DiagramCode}`,
            'Ủi phẳng khăn trải bàn nỉ cao cấp & vệ sinh lối đi đại biểu',
          ],
        },
        {
          department: '4. Lễ Tân & An Ninh Điều Phối Bãi Đỗ Xe',
          tasks: [
            'Bố trí thảm đỏ và bàn Welcome Desk đón tiếp đoàn',
            'Sắp xếp chỗ đỗ xe VIP cho đoàn lãnh đạo & xe trưng bày',
            'Hỗ trợ thẻ đeo đại biểu và thủ tục tạm trú nếu có khách lưu trú qua đêm',
          ],
        },
        {
          department: '5. Kế Toán & Thu Ngân Master Folio',
          tasks: [
            `Tổng giá trị hợp đồng: ${new Intl.NumberFormat('vi-VN').format(event.financial?.totalAmount || event.TotalContractAmount)} đ`,
            `Đã cọc: ${new Intl.NumberFormat('vi-VN').format(event.financial?.depositPaid || event.DepositPaid)} đ`,
            `Dư nợ Master Folio: ${new Intl.NumberFormat('vi-VN').format(event.financial?.remainingDue || event.RemainingDue)} đ`,
            'Kiểm tra ủy nhiệm chi và phát hành hóa đơn VAT khi check-out',
          ],
        },
      ],
    };

    return res.json({
      success: true,
      dossier: beoDossier,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất lệnh điều hành BEO',
      error: err.message,
    });
  }
};

// 7. GET HALLS & REAL-TIME AVAILABILITY
exports.getHalls = async (req, res) => {
  try {
    let dbHalls = [];
    try {
      dbHalls = await BanquetHall.findAll({ order: [['HallId', 'ASC']] });
    } catch (_) {}

    return res.json({
      success: true,
      halls: dbHalls.length > 0 ? dbHalls : DEFAULT_HALLS,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sảnh tiệc',
      error: err.message,
    });
  }
};
