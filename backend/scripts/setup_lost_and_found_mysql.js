const mysql = require('mysql2/promise');

const SEED_DATA = [
  {
    id: 'LF-2025-0841',
    hash: '8F7C-99B4-LF25',
    itemName: 'Apple Watch Series 8',
    itemType: 'Thiết bị số & Điện tử cao cấp',
    itemSpec: '45mm • Màu Bạc {Starlight Silver} • Dây thể thao',
    serialImei: '8901 - 4432 - 8812',
    serialNote: 'Khớp dữ liệu mua hàng lưu trữ Apple ID',
    securityLevel: 'BẢO VẬT CẤP ĐỘ II',
    roomNumber: '804',
    roomWing: 'Ocean Wing',
    foundLocation: 'Kệ tủ đầu giường bên trái',
    foundDate: '2025-10-24',
    foundTime: '11:20 SA',
    finderName: 'Teresa Vance',
    finderRole: 'Nhân viên buồng phòng',
    status: 'READY_TO_RETURN',
    statusLabel: 'ĐÃ XÁC MINH CHỦ SỞ HỮU • SẴN SÀNG TRAO TRẢ TẠI TIỀN SẢNH',
    storageLocation: 'Két an toàn B-04',
    sealNumber: '#ST-99124',
    verifiedDate: '2025-10-24',
    inspectionReport: JSON.stringify({
      screen: 'Nguyên vẹn',
      bezel: 'Xước dăm 0.4mm',
      battery: 'Pin còn 18%',
      securityLock: 'Mã PIN 6 ký tự số hoạt động bình thường, đang bật Lost Mode từ iCloud.'
    }),
    images: JSON.stringify({
      front: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT TRƯỚC',
      frontTag: 'Kính Sapphire',
      back: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // KHẮC LASER IMEI',
      backTag: 'SER: 8901-4432'
    }),
    guest: JSON.stringify({
      name: 'Arthur Dent',
      avatar: 'AD',
      bookingId: '#BK-99214',
      room: 'Phòng 804',
      phone: '+84 912 345 678',
      tier: 'HỘI VIÊN SILVER RESIDENT',
      tierColor: 'bg-blue-100 text-blue-700 border-blue-200',
      idVerified: 'ĐÃ XÁC THỰC CCCD / HỘ CHIẾU',
      passportNo: 'PP: B81920489 (GBR)'
    }),
    custodyChain: JSON.stringify([
      {
        id: 1,
        time: '24/10/2025 • 11:20 SA',
        tag: 'Phát hiện tại chỗ',
        tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        actor: 'Teresa Vance (Buồng phòng)',
        description: 'Nhân viên buồng phòng Teresa Vance phát hiện trên kệ tủ đầu giường bên trái khi dọn vệ sinh phòng 804 (Ocean Wing) sau giờ Checkout.'
      },
      {
        id: 2,
        time: '24/10/2025 • 11:45 SA',
        tag: 'Niêm phong két an toàn',
        tagColor: 'bg-slate-100 text-slate-800 border-slate-200',
        actor: 'H. Vance (Trưởng bộ phận Buồng phòng)',
        description: 'Trưởng bộ phận Buồng phòng H. Vance đóng gói túi chống ẩm chuyên dụng, gắn tem số niêm phong #ST-99124 và đưa vào Két an toàn B-04.'
      },
      {
        id: 3,
        time: '24/10/2025 • 14:15 CH',
        tag: 'Chuyển Tiền Sảnh',
        tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
        actor: 'Marcus Aurelius (Giám sát Tiền sảnh)',
        description: 'Bàn giao trực tiếp cho Giám sát Tiền sảnh Marcus Aurelius tại quầy Lễ tân, chuẩn bị trao trả theo lịch hẹn của khách.'
      }
    ]),
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: '',
    trackingCode: '',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a',
    supervisor: JSON.stringify({
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'SIGNED • 0x89AB...441C 14:18',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    })
  },
  {
    id: 'LF-2025-0839',
    hash: '5A2E-44B1-LF19',
    itemName: 'Ví da Montblanc Meisterstück & Tiền mặt',
    itemType: 'Tài sản giá trị & Giấy tờ tùy thân',
    itemSpec: 'Da bò hạt màu đen sần • Có chứa 4.200.000 VNĐ & 2 Thẻ Visa Signature',
    serialImei: 'MB-MST-9921',
    serialNote: 'Khớp nhận diện thương hiệu dập nổi góc trong',
    securityLevel: 'BẢO VẬT CẤP ĐỘ I (TIỀN MẶT & THẺ)',
    roomNumber: '512',
    roomWing: 'Sunset Wing',
    foundLocation: 'Két an toàn điện tử trong tủ quần áo',
    foundDate: '2025-10-23',
    foundTime: '15:10 CH',
    finderName: 'Nguyễn Thị Lành',
    finderRole: 'Nhân viên buồng phòng',
    status: 'IN_STORAGE',
    statusLabel: 'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN',
    storageLocation: 'Két trung tâm A-01',
    sealNumber: '#ST-99088',
    verifiedDate: '2025-10-23',
    inspectionReport: JSON.stringify({
      screen: 'Nguyên vẹn',
      bezel: 'Da mềm không trầy',
      battery: 'N/A',
      securityLock: '2 Thẻ ngân hàng đã được niêm phong túi bạc có niêm phong bảo mật.'
    }),
    images: JSON.stringify({
      front: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT NGOÀI',
      frontTag: 'Logo Ngôi Sao Trắng',
      back: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // NGĂN TIỀN MẶT',
      backTag: 'Niêm phong túi số 08'
    }),
    guest: JSON.stringify({
      name: 'Trần Hoàng Nam',
      avatar: 'TH',
      bookingId: '#BK-99150',
      room: 'Phòng 512',
      phone: '+84 903 888 999',
      tier: 'HỘI VIÊN GOLD ELITE',
      tierColor: 'bg-amber-100 text-amber-800 border-amber-300',
      idVerified: 'ĐÃ XÁC THỰC CCCD GẮN CHIP',
      passportNo: 'CCCD: 079092019482'
    }),
    custodyChain: JSON.stringify([
      {
        id: 1,
        time: '23/10/2025 • 15:10 CH',
        tag: 'Phát hiện két sắt',
        tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        actor: 'Nguyễn Thị Lành (Buồng phòng)',
        description: 'Phát hiện ví bỏ quên trong két an toàn mở hé phòng 512 sau khi khách làm thủ tục Check-out.'
      },
      {
        id: 2,
        time: '23/10/2025 • 15:30 CH',
        tag: 'Niêm phong kép',
        tagColor: 'bg-slate-100 text-slate-800 border-slate-200',
        actor: 'Lê Minh Anh & An ninh KS',
        description: 'Kiểm đếm tiền mặt trước camera an ninh, cho vào phong bì bảo mật số #ST-99088 và khóa két trung tâm.'
      }
    ]),
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: '',
    trackingCode: '',
    sha256: '9a3d42bc110f01988ef11c90021ba0928ff210381014cc491910bc412384aee1',
    supervisor: JSON.stringify({
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'VERIFIED • 0x489B...119C 15:40',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    })
  },
  {
    id: 'LF-2025-0835',
    hash: '3D9B-12C8-LF08',
    itemName: 'Nhẫn Kim Cương Platinum 1.2ct',
    itemType: 'Trang sức kim hoàn cao cấp',
    itemSpec: 'Bạch kim 950 • Kim cương chủ giác cắt Round Brilliant • Khắc laser GIA-5491',
    serialImei: 'GIA-5491-0021',
    serialNote: 'Khắc laser cạnh kim cương soi bằng kính hiển vi',
    securityLevel: 'BẢO VẬT CẤP ĐỘ I (SIÊU GIÁ TRỊ)',
    roomNumber: '1204',
    roomWing: 'President Wing',
    foundLocation: 'Gờ bồn rửa mặt lavabo phòng tắm master',
    foundDate: '2025-10-22',
    foundTime: '09:45 SA',
    finderName: 'Lý Lan Hương',
    finderRole: 'Trưởng nhóm buồng phòng VIP',
    status: 'RETURNED',
    statusLabel: 'ĐÃ BÀN GIAO THÀNH CÔNG • ĐÃ KÝ NHẬN ĐIỆN TỬ VÀ ĐÓNG HỒ SƠ',
    storageLocation: 'Két bảo an VIP-01',
    sealNumber: '#ST-98920',
    verifiedDate: '2025-10-22',
    inspectionReport: JSON.stringify({
      screen: 'Nguyên vẹn',
      bezel: 'Chấu nhẫn chắc chắn',
      battery: 'N/A',
      securityLock: 'Giấy chứng nhận GIA đi kèm đã đối chiếu trực tuyến.'
    }),
    images: JSON.stringify({
      front: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT CHÍNH',
      frontTag: 'Platinum 950',
      back: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // CHẤU KIM CƯƠNG',
      backTag: 'GIA 1.2ct'
    }),
    guest: JSON.stringify({
      name: 'Sophia Laurent',
      avatar: 'SL',
      bookingId: '#BK-98840',
      room: 'Phòng 1204',
      phone: '+33 6 12 34 56 78',
      tier: 'HỘI VIÊN DIAMOND PRESIDENT',
      tierColor: 'bg-purple-100 text-purple-800 border-purple-300',
      idVerified: 'HỘ CHIẾU PHÁP ĐÃ ĐỐI CHIẾU',
      passportNo: 'PP: 19AB84912 (FRA)'
    }),
    custodyChain: JSON.stringify([
      {
        id: 1,
        time: '22/10/2025 • 09:45 SA',
        tag: 'Phát hiện Lavabo',
        tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        actor: 'Lý Lan Hương',
        description: 'Phát hiện nhẫn kim cương để quên trên viền bồn rửa mặt phòng Tổng Thống.'
      },
      {
        id: 2,
        time: '22/10/2025 • 10:30 SA',
        tag: 'Trao trả trực tiếp',
        tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
        actor: 'Marcus Aurelius & Tổng quản lý',
        description: 'Bàn giao trực tiếp tại phòng VIP Lounge trước khi khách lên xe đưa đón ra sân bay.'
      }
    ]),
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: 'Khách nhận trực tiếp tại sảnh VIP Lounge',
    trackingCode: '',
    sha256: '77c8e9b41a998bc1001dfa192837bc991024bbcae12984ef001924abcf183201',
    supervisor: JSON.stringify({
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'SIGNED • 0x99AA...331B 10:35',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    })
  },
  {
    id: 'LF-2025-0780',
    hash: '11B8-90A4-LF02',
    itemName: 'Áo khoác Cashmere Trench Coat',
    itemType: 'Trang phục & Phụ kiện thời trang',
    itemSpec: 'Áo măng tô dạ màu be cát • Size 40 • Nhãn hiệu Burberry London',
    serialImei: 'BBY-40-LON',
    serialNote: 'Tag cổ áo có ghi tên viết tắt J.K',
    securityLevel: 'ĐỒ DÙNG THÔNG THƯỜNG',
    roomNumber: '302',
    roomWing: 'Garden Wing',
    foundLocation: 'Tủ treo quần áo phòng ngủ',
    foundDate: '2025-07-15',
    foundTime: '12:00 TR',
    finderName: 'Trần Văn Tùng',
    finderRole: 'Nhân viên buồng phòng',
    status: 'DISPOSED',
    statusLabel: 'QUÁ HẠN LƯU KHO 90 NGÀY • CHUYỂN HỘI ĐỒNG THANH LÝ QUYÊN GÓP',
    storageLocation: 'Kho thanh lý H-02',
    sealNumber: '#ST-95100',
    verifiedDate: '2025-07-15',
    inspectionReport: JSON.stringify({
      screen: 'N/A',
      bezel: 'Nguyên vẹn',
      battery: 'N/A',
      securityLock: 'Đã giặt hấp diệt khuẩn và bọc túi nilon bảo quản.'
    }),
    images: JSON.stringify({
      front: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // TOÀN THÂN ÁO',
      frontTag: 'Màu Be Cát',
      back: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // TAG BURBERRY',
      backTag: 'Size 40'
    }),
    guest: JSON.stringify({
      name: 'Jonathan King',
      avatar: 'JK',
      bookingId: '#BK-94110',
      room: 'Phòng 302',
      phone: '+44 7700 900123',
      tier: 'KHÁCH HÀNG STANDARD',
      tierColor: 'bg-gray-100 text-gray-700 border-gray-200',
      idVerified: 'ĐÃ THÔNG BÁO QUA EMAIL 3 LẦN NHƯNG KHÔNG PHẢN HỒI',
      passportNo: 'PP: 55910248 (GBR)'
    }),
    custodyChain: JSON.stringify([
      {
        id: 1,
        time: '15/07/2025 • 12:00 TR',
        tag: 'Phát hiện tủ áo',
        tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        actor: 'Trần Văn Tùng',
        description: 'Phát hiện trong tủ đồ sau khi khách checkout.'
      },
      {
        id: 2,
        time: '15/10/2025 • 10:00 SA',
        tag: 'Biên bản thanh lý',
        tagColor: 'bg-amber-100 text-amber-800 border-amber-300',
        actor: 'Hội đồng Khách sạn',
        description: 'Hết hạn lưu kho 90 ngày. Đã lập biên bản chuyển quỹ thiện nguyện theo quy chế Lost & Found.'
      }
    ]),
    deliveryMethod: 'THIRD_PARTY',
    deliveryNote: 'Chuyển quỹ từ thiện Phú Quốc Care',
    trackingCode: 'CHARITY-2025-091',
    sha256: '4410abce19284fa98011ccbe091244ae998104271890471bcca1192801948ae8',
    supervisor: JSON.stringify({
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'AUTHORIZED • 0x88CC...990A 10:15',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    })
  }
];

async function setupLostAndFoundMySQL() {
  console.log('--- BẮT ĐẦU KẾT NỐI VÀO DATABASE MYSQL DOCKER (PHPMYADMIN) ---');
  
  // Thử kết nối với root trước
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: 'root',
      password: '',
      database: 'hotel_management'
    });
    console.log('✓ Đã kết nối thành công với MySQL Docker qua user root');
  } catch (err) {
    console.log('Thử kết nối với hotel_user...');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'hotel_user',
      password: process.env.DB_PASSWORD || 'hotel_password',
      database: 'hotel_management'
    });
    console.log('✓ Đã kết nối thành công với MySQL Docker qua hotel_user');
  }

  // Tạo user hotel_user nếu chưa có
  try {
    await conn.query("CREATE USER IF NOT EXISTS 'hotel_user'@'%' IDENTIFIED BY 'hotel_password'");
    await conn.query("GRANT ALL PRIVILEGES ON hotel_management.* TO 'hotel_user'@'%'");
    await conn.query("FLUSH PRIVILEGES");
    console.log('✓ Đã cấp quyền đầy đủ cho user hotel_user trong MySQL Docker');
  } catch (e) {
    console.log('Thông báo quyền user:', e.message);
  }

  // Tạo bảng chuẩn LostAndFoundItems trong MySQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS LostAndFoundItems (
      id VARCHAR(50) NOT NULL PRIMARY KEY,
      hash VARCHAR(50) NOT NULL DEFAULT '8F7C-99B4-LF25',
      itemName VARCHAR(255) NOT NULL,
      itemType VARCHAR(100) DEFAULT 'Thiết bị số & Điện tử cao cấp',
      itemSpec TEXT,
      serialImei VARCHAR(100),
      serialNote TEXT,
      securityLevel VARCHAR(100) DEFAULT 'BẢO VẬT CẤP ĐỘ II',
      roomNumber VARCHAR(50) NOT NULL,
      roomWing VARCHAR(100) DEFAULT 'Ocean Wing',
      foundLocation VARCHAR(255) NOT NULL,
      foundDate VARCHAR(50) NOT NULL,
      foundTime VARCHAR(50) NOT NULL,
      finderName VARCHAR(100) NOT NULL,
      finderRole VARCHAR(100) DEFAULT 'Nhân viên buồng phòng',
      status VARCHAR(50) DEFAULT 'IN_STORAGE',
      statusLabel VARCHAR(255) DEFAULT 'ĐANG LƯU KHO BẢO QUẢN NIÊM PHONG KÉT AN TOÀN',
      storageLocation VARCHAR(100) DEFAULT 'Két an toàn B-04',
      sealNumber VARCHAR(50) DEFAULT '#ST-99124',
      verifiedDate VARCHAR(50),
      inspectionReport LONGTEXT,
      images LONGTEXT,
      guest LONGTEXT,
      custodyChain LONGTEXT,
      deliveryMethod VARCHAR(50) DEFAULT 'FRONT_DESK',
      deliveryNote TEXT,
      trackingCode VARCHAR(100),
      sha256 VARCHAR(255) DEFAULT 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a',
      supervisor LONGTEXT,
      digitalSignature LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  // Kiểm tra xem bảng LostAndFoundItems cũ có cột 'id' hay 'LostFoundId'
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM LostAndFoundItems");
    const hasIdCol = cols.some(c => c.Field === 'id');
    if (!hasIdCol) {
      console.log('Phát hiện bảng cũ có cấu trúc khác, đang sao lưu và tạo mới bảng LostAndFoundItems chuẩn...');
      await conn.query("RENAME TABLE LostAndFoundItems TO LostAndFoundItems_legacy_" + Date.now());
    }
  } catch (e) {
    // Bảng chưa tồn tại
  }

  await conn.query(createTableSQL);
  console.log('✓ Bảng LostAndFoundItems chuẩn MySQL đã sẵn sàng trong database hotel_management');

  // Nạp seed data vào MySQL Docker
  for (const item of SEED_DATA) {
    const query = `
      INSERT INTO LostAndFoundItems (
        id, hash, itemName, itemType, itemSpec, serialImei, serialNote, securityLevel,
        roomNumber, roomWing, foundLocation, foundDate, foundTime, finderName, finderRole,
        status, statusLabel, storageLocation, sealNumber, verifiedDate, inspectionReport,
        images, guest, custodyChain, deliveryMethod, deliveryNote, trackingCode, sha256, supervisor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        itemName = VALUES(itemName),
        status = VALUES(status),
        statusLabel = VALUES(statusLabel),
        images = VALUES(images),
        guest = VALUES(guest);
    `;
    const params = [
      item.id, item.hash, item.itemName, item.itemType, item.itemSpec, item.serialImei, item.serialNote, item.securityLevel,
      item.roomNumber, item.roomWing, item.foundLocation, item.foundDate, item.foundTime, item.finderName, item.finderRole,
      item.status, item.statusLabel, item.storageLocation, item.sealNumber, item.verifiedDate, item.inspectionReport,
      item.images, item.guest, item.custodyChain, item.deliveryMethod, item.deliveryNote, item.trackingCode, item.sha256, item.supervisor
    ];
    await conn.query(query, params);
    console.log(`✓ Đã nạp hồ sơ #${item.id} vào MySQL Docker (phpMyAdmin)`);
  }

  const [countRes] = await conn.query('SELECT COUNT(*) as total FROM LostAndFoundItems');
  console.log('----------------------------------------------------');
  console.log(`✓ TỔNG SỐ HỒ SƠ TRONG MYSQL DOCKER (PHPMYADMIN): ${countRes[0].total}`);
  console.log('✓ Bạn có thể mở phpMyAdmin tại http://localhost:8080 để kiểm tra trực tiếp!');
  console.log('----------------------------------------------------');

  await conn.end();
}

setupLostAndFoundMySQL().catch(e => {
  console.error('Lỗi thiết lập MySQL:', e.message);
  process.exit(1);
});
