/**
 * test_tuyen_all_crud.js
 * Comprehensive integration test verifying all Add (POST), Edit (PUT/PATCH), and Delete (DELETE)
 * operations across ALL tuyen/* back-office operational modules.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function req(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  return { status: res.status, ok: res.ok, data: json };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 KIỂM THỬ TOÀN BỘ CHỨC NĂNG THÊM, SỬA, XÓA CÁC MODULE TUYEN/*');
  console.log('================================================================\n');

  // --- 1. MODULE LOYALTY (tuyen/1) ---
  console.log('🔹 1. Module Quản Lý Hội Viên & Hạng Thẻ (Loyalty)');
  const addTier = await req('POST', '/api/loyalty/tiers', {
    tierCode: 'TEST-RUBY',
    tierName: 'Hạng Thẻ Ruby VIP Thử Nghiệm',
    badgeColor: 'bg-rose-100 text-rose-800',
    minPoints: 12000,
    pointMultiplier: 2.2,
    discountPercent: 18,
    benefits: ['Ưu tiên checkin', 'Tặng rượu vang'],
    isActive: true
  });
  assert(addTier.ok && addTier.status === 201, `POST /api/loyalty/tiers -> Status ${addTier.status}`);
  const tierId = addTier.data?.tier?.id || addTier.data?.tier?.tierId || addTier.data?.data?.TierId;

  if (tierId) {
    const editTier = await req('PUT', `/api/loyalty/tiers/${tierId}`, {
      tierName: 'Hạng Thẻ Ruby VIP Đã Sửa',
      discountPercent: 20
    });
    assert(editTier.ok, `PUT /api/loyalty/tiers/${tierId} -> Status ${editTier.status}`);

    const delTier = await req('DELETE', `/api/loyalty/tiers/${tierId}`);
    assert(delTier.ok, `DELETE /api/loyalty/tiers/${tierId} -> Status ${delTier.status}`);
  }

  // --- 2. MODULE MARKETING AUTOMATION (tuyen/4) ---
  console.log('\n🔹 2. Module Tiếp Thị Tự Động Hóa (Marketing Automation)');
  const addCmp = await req('POST', '/api/marketing/campaigns', {
    name: 'Chiến Dịch Black Friday Siêu Sale Test',
    channels: ['Zalo OA', 'SMS'],
    targetAudience: 'Khách VIP',
    targetCount: 1500
  });
  assert(addCmp.ok && addCmp.status === 201, `POST /api/marketing/campaigns -> Status ${addCmp.status}`);
  const cmpCode = addCmp.data?.data?.CampaignCode;

  if (cmpCode) {
    const editCmp = await req('PUT', `/api/marketing/campaigns/${cmpCode}`, {
      name: 'Chiến Dịch Black Friday Đã Sửa Tên',
      targetCount: 2000
    });
    assert(editCmp.ok, `PUT /api/marketing/campaigns/${cmpCode} -> Status ${editCmp.status}`);

    const delCmp = await req('DELETE', `/api/marketing/campaigns/${cmpCode}`);
    assert(delCmp.ok, `DELETE /api/marketing/campaigns/${cmpCode} -> Status ${delCmp.status}`);
  }

  // --- 3. MODULE HOUSEKEEPING INVENTORY - CONSUMABLES (tuyen/5) ---
  console.log('\n🔹 3. Module Kho Đồ Tiêu Hao & Minibar (Consumables)');
  const addConsumable = await req('POST', '/api/housekeeping/inventory/consumables', {
    itemName: 'Bia Thủ Công Jasmine IPA 330ml',
    category: 'Minibar',
    supplier: 'Pasteur Street Brewing',
    location: 'Kho A-09',
    currentStock: 48,
    parStock: 120,
    costPrice: 28000,
    sellingPrice: 75000
  });
  assert(addConsumable.ok && addConsumable.status === 201, `POST /api/housekeeping/inventory/consumables -> Status ${addConsumable.status}`);
  const consumableId = addConsumable.data?.data?.ItemId;

  if (consumableId) {
    const editConsumable = await req('PUT', `/api/housekeeping/inventory/consumables/${consumableId}`, {
      itemName: 'Bia Thủ Công Jasmine IPA Đã Cập Nhật',
      sellingPrice: 85000
    });
    assert(editConsumable.ok, `PUT /api/housekeeping/inventory/consumables/${consumableId} -> Status ${editConsumable.status}`);

    const delConsumable = await req('DELETE', `/api/housekeeping/inventory/consumables/${consumableId}`);
    assert(delConsumable.ok, `DELETE /api/housekeeping/inventory/consumables/${consumableId} -> Status ${delConsumable.status}`);
  }

  // --- 4. MODULE HOUSEKEEPING INVENTORY - LINEN (tuyen/5) ---
  console.log('\n🔹 4. Module Luân Chuyển Đồ Vải & Giặt Ủi (Linen)');
  const addLinen = await req('POST', '/api/housekeeping/inventory/linen', {
    itemName: 'Khăn Tắm Bể Bơi Sọc Xanh Navy 700GSM',
    specification: 'RFID Gen2 UHF • Sợi dài Ai Cập',
    totalStock: 500,
    cleanStock: 300,
    inUseStock: 150,
    laundryStock: 50
  });
  assert(addLinen.ok && addLinen.status === 201, `POST /api/housekeeping/inventory/linen -> Status ${addLinen.status}`);
  const linenId = addLinen.data?.data?.LinenId;

  if (linenId) {
    const editLinen = await req('PUT', `/api/housekeeping/inventory/linen/${linenId}`, {
      itemName: 'Khăn Tắm Bể Bơi Sọc Xanh Navy Đã Sửa',
      cleanStock: 350
    });
    assert(editLinen.ok, `PUT /api/housekeeping/inventory/linen/${linenId} -> Status ${editLinen.status}`);

    const delLinen = await req('DELETE', `/api/housekeeping/inventory/linen/${linenId}`);
    assert(delLinen.ok, `DELETE /api/housekeeping/inventory/linen/${linenId} -> Status ${delLinen.status}`);
  }

  // --- 5. MODULE BẢO TRÌ SỰ CỐ KỸ THUẬT (tuyen/6) ---
  console.log('\n🔹 5. Module Tiếp Nhận Sự Cố & Bảo Trì Kỹ Thuật (Maintenance)');
  const addTicket = await req('POST', '/api/maintenance/tickets', {
    roomNumber: 'Phòng 902 Ocean Wing',
    assetName: 'Khóa cửa vân tay cảm biến thẻ từ',
    category: 'Điện & Điện Tử IoT',
    priority: 'P2 ƯU TIÊN',
    symptom: 'Đèn LED báo đỏ chớp nháy liên tục',
    description: 'Khách không mở được cửa phòng bằng thẻ phụ'
  });
  assert(addTicket.ok && addTicket.status === 201, `POST /api/maintenance/tickets -> Status ${addTicket.status}`);
  const ticketId = addTicket.data?.data?.TicketId || addTicket.data?.ticket?.TicketId;

  if (ticketId) {
    const editTicket = await req('PUT', `/api/maintenance/tickets/${ticketId}`, {
      symptom: 'Đã thay pin nguồn và kiểm tra anten',
      technicianName: 'Trần Văn Kỹ Sư'
    });
    assert(editTicket.ok, `PUT /api/maintenance/tickets/${ticketId} -> Status ${editTicket.status}`);

    const delTicket = await req('DELETE', `/api/maintenance/tickets/${ticketId}`);
    assert(delTicket.ok, `DELETE /api/maintenance/tickets/${ticketId} -> Status ${delTicket.status}`);
  }

  // --- 6. MODULE KHÓA CỬA ĐIỆN TỬ IOT (tuyen/7) ---
  console.log('\n🔹 6. Module Khóa Cửa Điện Tử Thông Minh (Smart Lock)');
  const addKey = await req('POST', '/api/smart-lock/keys', {
    RoomNumber: '805',
    GuestName: 'Elon Traveler',
    LockType: 'App BLE Mobile Key',
    PasscodePin: '654321'
  });
  assert(addKey.ok && addKey.status === 201, `POST /api/smart-lock/keys -> Status ${addKey.status}`);
  const keyId = addKey.data?.data?.KeyId;

  if (keyId) {
    const editKey = await req('PUT', `/api/smart-lock/keys/${keyId}`, {
      GuestPhone: '+84 988 999 888',
      PasscodePin: '123456'
    });
    assert(editKey.ok, `PUT /api/smart-lock/keys/${keyId} -> Status ${editKey.status}`);

    const delKey = await req('DELETE', `/api/smart-lock/keys/${keyId}`);
    assert(delKey.ok, `DELETE /api/smart-lock/keys/${keyId} -> Status ${delKey.status}`);
  }

  // --- 7. MODULE KIỂM TOÁN ĐÊM (tuyen/8) ---
  console.log('\n🔹 7. Module Quy Trình Kiểm Toán Đêm (Night Audit)');
  const addReport = await req('POST', '/api/night-audit/reports', {
    auditDate: '2025-10-25',
    auditor: 'Marcus Aurelius Lead',
    notes: 'Kiểm toán phiên bổ sung thử nghiệm',
    totalRevenue: '1.250.000.000 đ'
  });
  assert(addReport.ok && addReport.status === 201, `POST /api/night-audit/reports -> Status ${addReport.status}`);
  const reportId = addReport.data?.data?.id;

  if (reportId) {
    const editReport = await req('PUT', `/api/night-audit/reports/${reportId}`, {
      notes: 'Đã hoàn tất đối soát số dư ngân hàng'
    });
    assert(editReport.ok, `PUT /api/night-audit/reports/${reportId} -> Status ${editReport.status}`);

    const delReport = await req('DELETE', `/api/night-audit/reports/${reportId}`);
    assert(delReport.ok, `DELETE /api/night-audit/reports/${reportId} -> Status ${delReport.status}`);
  }

  // --- 8. MODULE ĐIỀU PHỐI XE ĐƯA ĐÓN SÂN BAY (tuyen/9) ---
  console.log('\n🔹 8. Module Đội Xe & Đưa Đón Sân Bay (Transportation)');
  const addTransfer = await req('POST', '/api/transportation/transfers', {
    guestName: 'Nguyễn Văn Khách VIP',
    guestPhone: '+84 909 888 777',
    flightNumber: 'VN-1824',
    pickupTime: '15:30',
    guestCount: 2,
    luggageCount: 2,
    direction: 'ARRIVAL',
    vehicleId: 'VEH-01',
    driverId: 'DRV-01'
  });
  assert(addTransfer.ok && addTransfer.status === 201, `POST /api/transportation/transfers -> Status ${addTransfer.status}`);
  const transferId = addTransfer.data?.data?.id;

  if (transferId) {
    const editTransfer = await req('PUT', `/api/transportation/transfers/${transferId}`, {
      guestCount: 4,
      vipNote: 'Khách yêu cầu khăn lạnh & nước suối trên xe'
    });
    assert(editTransfer.ok, `PUT /api/transportation/transfers/${transferId} -> Status ${editTransfer.status}`);

    const delTransfer = await req('DELETE', `/api/transportation/transfers/${transferId}`);
    assert(delTransfer.ok, `DELETE /api/transportation/transfers/${transferId} -> Status ${delTransfer.status}`);
  }

  // --- 9. MODULE ĐỒNG BỘ KÊNH OTA (tuyen/11) ---
  console.log('\n🔹 9. Module Đồng Bộ Kênh Bán Phòng OTA (Channel Manager)');
  const addChannel = await req('POST', '/api/channel-manager/channels', {
    name: 'Trip.com Global OTA Test',
    code: 'OTA-TRIPCOM-TEST',
    commissionRate: '16%'
  });
  assert(addChannel.ok && addChannel.status === 201, `POST /api/channel-manager/channels -> Status ${addChannel.status}`);
  const channelId = addChannel.data?.data?.id;

  if (channelId) {
    const editChannel = await req('PUT', `/api/channel-manager/channels/${channelId}`, {
      commissionRate: '14%',
      statusLabel: 'KẾT NỐI ONLINE ỔN ĐỊNH'
    });
    assert(editChannel.ok, `PUT /api/channel-manager/channels/${channelId} -> Status ${editChannel.status}`);

    const delChannel = await req('DELETE', `/api/channel-manager/channels/${channelId}`);
    assert(delChannel.ok, `DELETE /api/channel-manager/channels/${channelId} -> Status ${delChannel.status}`);
  }

  // --- 10. MODULE ĐẶT SẢNH TIỆC & MICE (tuyen/11) ---
  console.log('\n🔹 10. Module Đặt Sảnh Tiệc & MICE (Banquet Events)');
  const addBanquet = await req('POST', '/api/banquet-events', {
    title: 'Hội Thảo Công Nghệ AI 2026',
    eventType: 'Hội thảo chuyên đề',
    company: 'Vietnam AI Innovation Group',
    contactPerson: { name: 'Đặng Tuấn Anh', phone: '+84 911 222 333' },
    date: '2026-12-15',
    timeRange: '08:30 - 17:00',
    pax: 200,
    totalAmount: 180000000
  });
  assert(addBanquet.ok && addBanquet.status === 201, `POST /api/banquet-events -> Status ${addBanquet.status}`);
  const banquetId = addBanquet.data?.event?.id || addBanquet.data?.data?.id;

  if (banquetId) {
    const editBanquet = await req('PUT', `/api/banquet-events/${banquetId}`, {
      title: 'Hội Thảo Công Nghệ AI 2026 - Bản Mở Rộng',
      pax: 250
    });
    assert(editBanquet.ok, `PUT /api/banquet-events/${banquetId} -> Status ${editBanquet.status}`);

    const delBanquet = await req('DELETE', `/api/banquet-events/${banquetId}`);
    assert(delBanquet.ok, `DELETE /api/banquet-events/${banquetId} -> Status ${delBanquet.status}`);
  }

  // --- 11. MODULE PHÂN CA & CHẤM CÔNG (tuyen/3) ---
  console.log('\n🔹 11. Module Phân Ca & Chấm Công (Roster Shifts)');
  const addShift = await req('POST', '/api/roster', {
    staffId: 'EMP-104',
    dayKey: 'sat',
    shiftType: 'morning',
    startTime: '07:00',
    endTime: '15:30',
    location: 'Quầy Lễ Tân VIP'
  });
  assert(addShift.ok && addShift.status === 201, `POST /api/roster -> Status ${addShift.status}`);

  const editShift = await req('PUT', '/api/roster/EMP-104', {
    dayKey: 'sat',
    shiftType: 'afternoon',
    time: '15:00 - 23:30',
    location: 'Sảnh Executive Club'
  });
  assert(editShift.ok, `PUT /api/roster/EMP-104 -> Status ${editShift.status}`);

  const attendShift = await req('POST', '/api/roster/attendance', {
    staffId: 'EMP-104',
    dayKey: 'sat',
    status: 'ON_TIME',
    time: '14:55'
  });
  assert(attendShift.ok, `POST /api/roster/attendance -> Status ${attendShift.status}`);

  const delShift = await req('DELETE', '/api/roster/EMP-104?dayKey=sat');
  assert(delShift.ok, `DELETE /api/roster/EMP-104 -> Status ${delShift.status}`);

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
