'use strict';

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    };
    const clientReq = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          body: raw,
          data: json
        });
      });
    });
    clientReq.on('error', reject);
    if (dataStr) clientReq.write(dataStr);
    clientReq.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName, extraInfo = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} -> ${extraInfo}`);
    failed++;
  }
}

async function runAll13ModuleTests() {
  console.log('========================================================================');
  console.log('🚀 KIỂM THỬ TOÀN DIỆN 13 CHỨC NĂNG NGHIỆP VỤ HỆ THỐNG KHÁCH SẠN');
  console.log('========================================================================\n');

  // ============================================================================
  // 1. TỰ ĐỘNG HÓA TIẾP THỊ ĐA KÊNH (MARKETING AUTOMATION)
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 1. Tự Động Hóa Tiếp Thị Đa Kênh (Marketing Automation)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const overview = await req('GET', '/api/marketing/overview');
    assert(overview.ok && overview.data?.data?.gateways, '1.1 Lấy tổng quan & số liệu thống kê Gateway Zalo/SMS/Email');

    const addCmp = await req('POST', '/api/marketing/campaigns', {
      name: `Chiến Dịch Khuyến Mãi Hè ${Date.now()}`,
      channels: ['Zalo OA', 'Email'],
      targetAudience: 'Khách VIP Diamond',
      targetCount: 1200
    });
    assert(addCmp.ok && (addCmp.status === 201 || addCmp.status === 200), '1.2 Tạo chiến dịch tiếp thị mới');
    const cmpCode = addCmp.data?.data?.CampaignCode || addCmp.data?.data?.id;

    if (cmpCode) {
      const editCmp = await req('PUT', `/api/marketing/campaigns/${cmpCode}`, {
        name: `Chiến Dịch Khuyến Mãi Hè (Đã Cập Nhật)`,
        targetCount: 1500
      });
      assert(editCmp.ok, '1.3 Hiệu chỉnh thông tin chiến dịch tiếp thị');

      const delCmp = await req('DELETE', `/api/marketing/campaigns/${cmpCode}`);
      assert(delCmp.ok, '1.4 Xóa chiến dịch tiếp thị');
    }

    const tplList = await req('GET', '/api/marketing/templates');
    assert(tplList.ok, '1.5 Lấy danh mục mẫu tin nhắn tự động theo sự kiện');
  } catch (err) {
    assert(false, '1. Tự động hóa tiếp thị đa kênh', err.message);
  }

  // ============================================================================
  // 2. KHO ĐỒ TIÊU HAO, MINIBAR & ĐỒ VẢI (HOUSEKEEPING INVENTORY & LINEN)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 2. Kho Đồ Tiêu Hao, Minibar & Đồ Vải (Inventory & Linen)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const invOverview = await req('GET', '/api/housekeeping/inventory/overview');
    assert(invOverview.ok, '2.1 Lấy tổng quan chỉ số tồn kho, định mức an toàn & cảnh báo cạn kiệt');

    const addConsumable = await req('POST', '/api/housekeeping/inventory/consumables', {
      itemName: `Trà Ô Long Thượng Hạng ${Date.now()}`,
      category: 'Minibar',
      supplier: 'Cty Trà Cầu Tre',
      location: 'Kho Minibar B-02',
      currentStock: 150,
      parStock: 200,
      costPrice: 15000,
      sellingPrice: 45000
    });
    assert(addConsumable.ok && (addConsumable.status === 201 || addConsumable.status === 200), '2.2 Thêm mặt hàng tiêu hao / minibar mới');
    const consumableId = addConsumable.data?.data?.ItemId;

    if (consumableId) {
      const editConsumable = await req('PUT', `/api/housekeeping/inventory/consumables/${consumableId}`, {
        currentStock: 180,
        sellingPrice: 50000
      });
      assert(editConsumable.ok, '2.3 Hiệu chỉnh định mức & giá bán mặt hàng minibar');

      const delConsumable = await req('DELETE', `/api/housekeeping/inventory/consumables/${consumableId}`);
      assert(delConsumable.ok, '2.4 Xóa mặt hàng tiêu hao khỏi kho');
    }

    const linenCycles = await req('GET', '/api/housekeeping/inventory/linen/laundry-cycles');
    assert(linenCycles.ok, '2.5 Theo dõi quy trình giặt ủi và luân chuyển đồ vải RFID');
  } catch (err) {
    assert(false, '2. Kho đồ tiêu hao, Minibar & Đồ vải', err.message);
  }

  // ============================================================================
  // 3. SỰ CỐ & BẢO TRÌ KỸ THUẬT BUỒNG PHÒNG (ENGINEERING & MAINTENANCE)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 3. Sự Cố & Bảo Trì Kỹ Thuật Buồng Phòng (Maintenance)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const maintOverview = await req('GET', '/api/maintenance/overview');
    assert(maintOverview.ok, '3.1 Lấy số liệu giám sát sự cố & phân bổ đội ngũ kỹ thuật');

    const addTicket = await req('POST', '/api/maintenance/tickets', {
      roomNumber: 'Villa-302',
      assetName: 'Điều hòa Daikin Inverter 2.5HP',
      category: 'Điện Lạnh HVAC',
      priority: 'P1 KHẨN CẤP',
      symptom: 'Chớp đèn vàng, không làm lạnh sâu',
      description: 'Khách VIP báo nhiệt độ phòng không giảm sau 30 phút bật'
    });
    assert(addTicket.ok && (addTicket.status === 201 || addTicket.status === 200), '3.2 Tiếp nhận và tạo phiếu bảo trì kỹ thuật mới');
    const ticketId = addTicket.data?.data?.TicketId || addTicket.data?.ticket?.TicketId;

    if (ticketId) {
      const editTicket = await req('PUT', `/api/maintenance/tickets/${ticketId}`, {
        status: 'IN_PROGRESS',
        statusLabel: 'ĐANG XỬ LÝ',
        technicianName: 'Trần Văn Kỹ Sư'
      });
      assert(editTicket.ok, '3.3 Cập nhật tiến độ điều phối kỹ sư xử lý sự cố');

      const delTicket = await req('DELETE', `/api/maintenance/tickets/${ticketId}`);
      assert(delTicket.ok, '3.4 Xóa / Đóng phiếu bảo trì');
    }
  } catch (err) {
    assert(false, '3. Sự cố & Bảo trì kỹ thuật buồng phòng', err.message);
  }

  // ============================================================================
  // 4. ĐỒ THẤT LẠC & BỎ QUÊN (LOST & FOUND MANAGEMENT)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 4. Đồ Thất Lạc & Bỏ Quên (Lost & Found)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const lfList = await req('GET', '/api/housekeeping/lost-and-found');
    assert(lfList.ok, '4.1 Lấy danh sách hồ sơ tài sản bỏ quên trong khách sạn');

    const addLf = await req('POST', '/api/housekeeping/lost-and-found', {
      itemName: 'Đồng Hồ Rolex Datejust 41mm',
      category: 'Tài sản giá trị cao',
      foundLocation: 'Két an toàn Phòng 1204',
      roomNumber: '1204',
      finderName: 'Nguyễn Thị Buồng Phòng',
      estimatedValue: 280000000,
      status: 'SAFES_STORAGE',
      statusLabel: 'ĐANG LƯU KÉT BẢO AN'
    });
    assert(addLf.ok && (addLf.status === 201 || addLf.status === 200), '4.2 Khởi tạo biên bản tiếp nhận đồ thất lạc mới');
    const lfId = addLf.data?.data?.id || addLf.data?.item?.id;

    if (lfId) {
      const editLf = await req('PUT', `/api/housekeeping/lost-and-found/${lfId}`, {
        guestContact: 'Nguyễn Văn Chủ Sở Hữu (+84 908 123 456)',
        note: 'Khách đã liên hệ xác nhận sẽ nhận lại vào chiều nay'
      });
      assert(editLf.ok, '4.3 Cập nhật tiến trình xác minh & thông tin chủ sở hữu');

      const delLf = await req('DELETE', `/api/housekeeping/lost-and-found/${lfId}`);
      assert(delLf.ok, '4.4 Xóa hồ sơ tài sản thất lạc');
    }
  } catch (err) {
    assert(false, '4. Đồ thất lạc & Bỏ quên', err.message);
  }

  // ============================================================================
  // 5. KHÓA CỬA ĐIỆN TỬ THÔNG MINH (E-KEY / SMART LOCK MANAGEMENT)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 5. Khóa Cửa Điện Tử Thông Minh (Smart Lock IoT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const lockOverview = await req('GET', '/api/smart-lock/overview');
    assert(lockOverview.ok, '5.1 Lấy tình trạng Mesh Network khóa cửa và thời lượng pin');

    const addKey = await req('POST', '/api/smart-lock/keys', {
      RoomNumber: 'Suite-808',
      GuestName: 'Ngô Thanh Vân',
      LockType: 'BLE Mobile Key + Passcode',
      PasscodePin: '987654'
    });
    assert(addKey.ok && (addKey.status === 201 || addKey.status === 200), '5.2 Cấp mới chìa khóa điện tử E-Key cho khách');
    const keyId = addKey.data?.data?.KeyId;

    if (keyId) {
      const editKey = await req('PUT', `/api/smart-lock/keys/${keyId}`, {
        PasscodePin: '123987',
        BatteryLevel: 98
      });
      assert(editKey.ok, '5.3 Đổi mã PIN & gia hạn hiệu lực khóa phòng');

      const delKey = await req('DELETE', `/api/smart-lock/keys/${keyId}`);
      assert(delKey.ok, '5.4 Thu hồi và xóa mã khóa điện tử');
    }
  } catch (err) {
    assert(false, '5. Khóa cửa điện tử thông minh', err.message);
  }

  // ============================================================================
  // 6. BÀN GIAO CA & QUỸ TIỀN MẶT LỄ TÂN (FRONT DESK CASH SHIFT HANDOVER)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 6. Bàn Giao Ca & Quỹ Tiền Mặt Lễ Tân (Front Desk Shift Handover)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const cashOverview = await req('GET', '/api/cash-shifts/overview');
    assert(cashOverview.ok && cashOverview.data?.data?.activeCashDrawer, '6.1 Lấy thông tin số dư két tiền mặt quầy Lễ tân hiện tại');

    const openShift = await req('POST', '/api/cash-shifts', {
      shiftType: 'Morning',
      openingAmount: 5000000,
      note: 'Mở ca sáng - Tiếp nhận quỹ tiền mặt tiêu chuẩn 5.000.000 đ'
    });
    assert(openShift.ok && openShift.status === 201, '6.2 Mở ca lễ tân & xác nhận quỹ tiền mặt đầu ca');
    const shiftId = openShift.data?.data?.ShiftId;

    if (shiftId) {
      const handover = await req('PUT', `/api/cash-shifts/${shiftId}`, {
        closingAmount: 28500000,
        handoverAmount: 5000000,
        status: 'Closed',
        note: 'Bàn giao ca thành công cho ca chiều - Két tiền khớp số sách 100%'
      });
      assert(handover.ok, '6.3 Chốt doanh thu tiền mặt và bàn giao ca lễ tân');

      const delShift = await req('DELETE', `/api/cash-shifts/${shiftId}`);
      assert(delShift.ok, '6.4 Xóa phiên ca tiền mặt');
    }
  } catch (err) {
    assert(false, '6. Bàn giao ca & Quỹ tiền mặt Lễ tân', err.message);
  }

  // ============================================================================
  // 7. KIỂM TOÁN ĐÊM TỰ ĐỘNG (NIGHT AUDIT & CLOSING)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 7. Kiểm Toán Đêm Tự Động (Night Audit & Day-End Closing)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const auditOverview = await req('GET', '/api/night-audit/overview');
    assert(auditOverview.ok && auditOverview.data?.data?.steps, '7.1 Lấy 5 bước quy trình kiểm toán đêm tự động & USALI Ledger');

    const approveNoshow = await req('POST', '/api/night-audit/approve-noshow', {
      resolution: 'CHARGED_PENALTY'
    });
    assert(approveNoshow.ok, '7.2 Phê duyệt xử lý phòng No-Show và phạt cước theo chính sách');

    const addReport = await req('POST', '/api/night-audit/reports', {
      auditDate: new Date().toISOString().split('T')[0],
      auditor: 'Hệ Thống Tự Động PMS',
      totalRevenue: '1.013.300.000 đ',
      notes: 'Báo cáo doanh thu & đóng sổ ngày kế toán'
    });
    assert(addReport.ok && (addReport.status === 201 || addReport.status === 200), '7.3 Kết xuất và lưu báo cáo kiểm toán đêm');
    const rptId = addReport.data?.data?.id;

    if (rptId) {
      const editRpt = await req('PUT', `/api/night-audit/reports/${rptId}`, {
        notes: 'Đã hoàn tất sao lưu dữ liệu điện toán đám mây'
      });
      assert(editRpt.ok, '7.4 Cập nhật ghi chú biên bản kiểm toán');

      const delRpt = await req('DELETE', `/api/night-audit/reports/${rptId}`);
      assert(delRpt.ok, '7.5 Xóa báo cáo kiểm toán thử nghiệm');
    }
  } catch (err) {
    assert(false, '7. Kiểm toán đêm tự động', err.message);
  }

  // ============================================================================
  // 8. ĐÓN TIỄN SÂN BAY & XE ĐƯA ĐÓN (AIRPORT TRANSFER & SHUTTLE FLEET)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 8. Đón Tiễn Sân Bay & Xe Đưa Đón (Transportation)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const fleetOverview = await req('GET', '/api/transportation/overview');
    assert(fleetOverview.ok, '8.1 Lấy biểu đồ lịch trình xe đưa đón & GPS realtime');

    const addTrip = await req('POST', '/api/transportation/transfers', {
      guestName: 'Đoàn Khách VIP Singapore Airlines',
      guestPhone: '+65 9123 4567',
      flightNumber: 'SQ-178',
      pickupTime: '18:45',
      guestCount: 3,
      luggageCount: 4,
      direction: 'ARRIVAL',
      vehicleId: 'VEH-01',
      driverId: 'DRV-01'
    });
    assert(addTrip.ok && (addTrip.status === 201 || addTrip.status === 200), '8.2 Đặt lịch chuyến xe đưa đón sân bay mới');
    const tripId = addTrip.data?.data?.id;

    if (tripId) {
      const editTrip = await req('PUT', `/api/transportation/transfers/${tripId}`, {
        guestCount: 4,
        vipNote: 'Chuẩn bị nước dừa tươi và khăn ướp lạnh trên xe'
      });
      assert(editTrip.ok, '8.3 Hiệu chỉnh thông tin chuyến xe & ghi chú phục vụ');

      const delTrip = await req('DELETE', `/api/transportation/transfers/${tripId}`);
      assert(delTrip.ok, '8.4 Hủy / Xóa chuyến đưa đón');
    }
  } catch (err) {
    assert(false, '8. Đón tiễn sân bay & Xe đưa đón', err.message);
  }

  // ============================================================================
  // 9. KHAI BÁO TẠM TRÚ CHO CÔNG AN (POLICE GUEST DECLARATION)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 9. Khai Báo Tạm Trú Cho Công An (Police Guest Declaration)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const policeOverview = await req('GET', '/api/police-declaration/overview');
    assert(policeOverview.ok, '9.1 Lấy danh sách hồ sơ khai báo tạm trú & ICAO Doc 9303 MRZ');

    const addDecl = await req('POST', '/api/police-declaration/declarations', {
      guestName: 'Johnathan Edwards',
      roomNumber: 'Villa-502',
      nationalityCode: 'USA',
      nationality: 'Hoa Kỳ',
      documentType: 'HC',
      documentNumber: 'A98210492',
      entryPort: 'Sân bay Quốc tế Tân Sơn Nhất'
    });
    assert(addDecl.ok && (addDecl.status === 201 || addDecl.status === 200), '9.2 Thêm hồ sơ đăng ký tạm trú khách quốc tế');
    const declId = addDecl.data?.data?.id;

    if (declId) {
      const editDecl = await req('PUT', `/api/police-declaration/declarations/${declId}`, {
        visaType: 'Miễn thị thực 45 ngày',
        status: 'SENT_POLICE',
        statusLabel: 'ĐÃ GỬI BỘ CÔNG AN'
      });
      assert(editDecl.ok, '9.3 Cập nhật trạng thái duyệt & truyền dữ liệu Cổng dịch vụ công');

      const delDecl = await req('DELETE', `/api/police-declaration/declarations/${declId}`);
      assert(delDecl.ok, '9.4 Xóa hồ sơ tạm trú');
    }
  } catch (err) {
    assert(false, '9. Khai báo tạm trú cho công an', err.message);
  }

  // ============================================================================
  // 10. ĐỒNG BỘ KÊNH OTA (CHANNEL MANAGER TWO-WAY SYNC)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 10. Đồng Bộ Kênh OTA (Channel Manager Two-Way Sync)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const cmState = await req('GET', '/api/channel-manager/state');
    assert(cmState.ok, '10.1 Lấy trạng thái phân bổ Allotment và kết nối các kênh Booking.com/Agoda');

    const addChannel = await req('POST', '/api/channel-manager/channels', {
      name: `Expedia Global Connect ${Date.now()}`,
      code: 'OTA-EXPEDIA-TEST',
      commissionRate: '15%'
    });
    assert(addChannel.ok && (addChannel.status === 201 || addChannel.status === 200), '10.2 Kết nối thêm kênh OTA mới');
    const chId = addChannel.data?.data?.id;

    if (chId) {
      const editChannel = await req('PUT', `/api/channel-manager/channels/${chId}`, {
        commissionRate: '13%',
        statusLabel: 'ONLINE ỔN ĐỊNH'
      });
      assert(editChannel.ok, '10.3 Cập nhật tỷ lệ hoa hồng & trạng thái kênh');

      const delChannel = await req('DELETE', `/api/channel-manager/channels/${chId}`);
      assert(delChannel.ok, '10.4 Ngắt kết nối và xóa kênh OTA');
    }
  } catch (err) {
    assert(false, '10. Đồng bộ kênh OTA', err.message);
  }

  // ============================================================================
  // 11. ĐẶT SẢNH TIỆC, HỘI NGHỊ (BANQUET & MICE EVENT BOOKING)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 11. Đặt Sảnh Tiệc, Hội Nghị (Banquet & MICE Booking)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const miceStats = await req('GET', '/api/banquet-events/stats');
    assert(miceStats.ok, '11.1 Lấy chỉ số tổng doanh thu tiệc MICE & tỷ lệ cọc Master Folio');

    const addEvent = await req('POST', '/api/banquet-events', {
      title: 'Đại Hội Cổ Đông Ngân Hàng ACB 2026',
      eventType: 'Đại hội thường niên',
      company: 'Ngân Hàng TMCP Á Châu',
      contactPerson: { name: 'Vũ Thị Minh Hằng', phone: '+84 903 888 999' },
      date: '2026-11-20',
      timeRange: '08:00 - 18:00',
      pax: 400,
      totalAmount: 350000000
    });
    assert(addEvent.ok && (addEvent.status === 201 || addEvent.status === 200), '11.2 Tạo hồ sơ đặt sảnh tiệc BEO mới');
    const evtId = addEvent.data?.event?.id || addEvent.data?.data?.id;

    if (evtId) {
      const editEvent = await req('PUT', `/api/banquet-events/${evtId}`, {
        title: 'Đại Hội Cổ Đông Ngân Hàng ACB 2026 (Mở Rộng Gala)',
        pax: 450
      });
      assert(editEvent.ok, '11.3 Hiệu chỉnh quy mô & yêu cầu thực đơn sảnh tiệc');

      const delEvent = await req('DELETE', `/api/banquet-events/${evtId}`);
      assert(delEvent.ok, '11.4 Hủy / Xóa hồ sơ sự kiện MICE');
    }
  } catch (err) {
    assert(false, '11. Đặt sảnh tiệc, hội nghị (MICE)', err.message);
  }

  // ============================================================================
  // 12. NHẬT KÝ HÀNH VI & CẢNH BÁO GIAN LẬN (AUDIT LOG & FRAUD DETECTION)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 12. Nhật Ký Hành Vi & Cảnh Báo Gian Lận (Audit Log & Fraud Alerts)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const logs = await req('GET', '/api/audit/logs');
    assert(logs.ok, '12.1 Truy vấn hệ thống nhật ký Audit Log bảo mật bất biến (WORM)');

    const addLog = await req('POST', '/api/audit/logs', {
      userId: 1,
      action: 'NIGHT_AUDIT_VERIFY',
      target: 'Ledger-101',
      details: 'Kiểm toán viên xác nhận số dư tài khoản tiền mặt đối soát'
    });
    assert(addLog.ok, '12.2 Ghi nhận bản ghi nhật ký hành vi mới');

    // Kiểm tra tính bất biến WORM: Cố tình PUT hoặc DELETE log sẽ bị từ chối 403 Forbidden!
    const rejectEdit = await req('PUT', '/api/audit/logs/1', { action: 'HACKED' });
    assert(rejectEdit.status === 403, '12.3 Cơ chế WORM ngăn chặn sửa đổi nhật ký (Trả về 403 Forbidden)');

    const addAlert = await req('POST', '/api/audit/alerts', {
      severity: 'HIGH',
      type: 'DISCOUNT_ABUSE',
      description: 'Phát hiện nhân viên giảm giá phòng 80% vượt quyền hạn',
      userId: 1
    });
    assert(addAlert.ok, '12.4 Tạo cảnh báo gian lận & nghi vấn vi phạm nội bộ');
    const alertId = addAlert.data?.data?.id || 1;

    const resolveAlert = await req('PUT', `/api/audit/alerts/${alertId}/resolve`, {
      resolutionNote: 'Đã xử lý nhắc nhở và thu hồi giảm giá'
    });
    assert(resolveAlert.ok, '12.5 Đóng và giải quyết cảnh báo gian lận');
  } catch (err) {
    assert(false, '12. Nhật ký hành vi & Cảnh báo gian lận', err.message);
  }

  // ============================================================================
  // 13. PHÂN CA, ĐIỀU PHỐI & CHẤM CÔNG (STAFF SCHEDULE, ROSTER & ATTENDANCE)
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 13. Phân Ca, Điều Phối & Chấm Công (Roster & Attendance)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const rosterList = await req('GET', '/api/roster');
    assert(rosterList.ok, '13.1 Lấy ma trận lịch trực theo tuần của toàn bộ các bộ phận FO/FB/HK');

    const assignShift = await req('POST', '/api/roster', {
      staffId: 'EMP-104',
      dayKey: 'sun',
      shiftType: 'afternoon',
      startTime: '15:00',
      endTime: '23:30',
      location: 'Quầy Lễ Tân VIP'
    });
    assert(assignShift.ok && assignShift.status === 201, '13.2 Phân công ca trực mới cho nhân sự');

    const editShift = await req('PUT', '/api/roster/EMP-104', {
      dayKey: 'sun',
      shiftType: 'morning',
      time: '07:00 - 15:30',
      location: 'Sảnh Check-in A'
    });
    assert(editShift.ok, '13.3 Hiệu chỉnh giờ ca trực & vị trí công tác');

    const attendance = await req('POST', '/api/roster/attendance', {
      staffId: 'EMP-104',
      dayKey: 'sun',
      status: 'ON_TIME',
      time: '06:54'
    });
    assert(attendance.ok, '13.4 Chấm công ca trực realtime (Vào ca đúng giờ)');

    const delShift = await req('DELETE', '/api/roster/EMP-104?dayKey=sun');
    assert(delShift.ok, '13.5 Hủy ca làm việc (Chuyển trạng thái OFF)');
  } catch (err) {
    assert(false, '13. Phân ca, điều phối & chấm công', err.message);
  }

  console.log('\n========================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed} THÀNH CÔNG, ${failed} THẤT BẠI`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll13ModuleTests().catch(err => {
  console.error('Lỗi ngoại lệ kiểm thử:', err);
  process.exit(1);
});
