const express = require('express');
const router = express.Router();
const { LostAndFoundItem } = require('../models');
const { Op } = require('sequelize');

// Dữ liệu mẫu ban đầu khớp 100% với giao diện PMS Grand Horizon
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
    inspectionReport: {
      screen: 'Nguyên vẹn',
      bezel: 'Xước dăm 0.4mm',
      battery: 'Pin còn 18%',
      securityLock: 'Mã PIN 6 ký tự số hoạt động bình thường, đang bật Lost Mode từ iCloud.'
    },
    images: {
      front: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT TRƯỚC',
      frontTag: 'Kính Sapphire',
      back: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // KHẮC LASER IMEI',
      backTag: 'SER: 8901-4432'
    },
    guest: {
      name: 'Arthur Dent',
      avatar: 'AD',
      bookingId: '#BK-99214',
      room: 'Phòng 804',
      phone: '+84 912 345 678',
      tier: 'HỘI VIÊN SILVER RESIDENT',
      tierColor: 'bg-blue-100 text-blue-700 border-blue-200',
      idVerified: 'ĐÃ XÁC THỰC CCCD / HỘ CHIẾU',
      passportNo: 'PP: B81920489 (GBR)'
    },
    custodyChain: [
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
    ],
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: '',
    trackingCode: '',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb7f2834b6932a934d40232efd6d84f88410a',
    supervisor: {
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'SIGNED • 0x89AB...441C 14:18',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    }
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
    inspectionReport: {
      screen: 'Nguyên vẹn',
      bezel: 'Da mềm không trầy',
      battery: 'N/A',
      securityLock: '2 Thẻ ngân hàng đã được niêm phong túi bạc có niêm phong bảo mật.'
    },
    images: {
      front: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT NGOÀI',
      frontTag: 'Logo Ngôi Sao Trắng',
      back: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // NGĂN TIỀN MẶT',
      backTag: 'Niêm phong túi số 08'
    },
    guest: {
      name: 'Trần Hoàng Nam',
      avatar: 'TH',
      bookingId: '#BK-99150',
      room: 'Phòng 512',
      phone: '+84 903 888 999',
      tier: 'HỘI VIÊN GOLD ELITE',
      tierColor: 'bg-amber-100 text-amber-800 border-amber-300',
      idVerified: 'ĐÃ XÁC THỰC CCCD GẮN CHIP',
      passportNo: 'CCCD: 079092019482'
    },
    custodyChain: [
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
    ],
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: '',
    trackingCode: '',
    sha256: '9a3d42bc110f01988ef11c90021ba0928ff210381014cc491910bc412384aee1',
    supervisor: {
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'VERIFIED • 0x489B...119C 15:40',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    }
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
    inspectionReport: {
      screen: 'Nguyên vẹn',
      bezel: 'Chấu nhẫn chắc chắn',
      battery: 'N/A',
      securityLock: 'Giấy chứng nhận GIA đi kèm đã đối chiếu trực tuyến.'
    },
    images: {
      front: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // MẶT CHÍNH',
      frontTag: 'Platinum 950',
      back: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // CHẤU KIM CƯƠNG',
      backTag: 'GIA 1.2ct'
    },
    guest: {
      name: 'Sophia Laurent',
      avatar: 'SL',
      bookingId: '#BK-98840',
      room: 'Phòng 1204',
      phone: '+33 6 12 34 56 78',
      tier: 'HỘI VIÊN DIAMOND PRESIDENT',
      tierColor: 'bg-purple-100 text-purple-800 border-purple-300',
      idVerified: 'HỘ CHIẾU PHÁP ĐÃ ĐỐI CHIẾU',
      passportNo: 'PP: 19AB84912 (FRA)'
    },
    custodyChain: [
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
    ],
    deliveryMethod: 'FRONT_DESK',
    deliveryNote: 'Khách nhận trực tiếp tại sảnh VIP Lounge',
    trackingCode: '',
    sha256: '77c8e9b41a998bc1001dfa192837bc991024bbcae12984ef001924abcf183201',
    supervisor: {
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'SIGNED • 0x99AA...331B 10:35',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    }
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
    inspectionReport: {
      screen: 'N/A',
      bezel: 'Nguyên vẹn',
      battery: 'N/A',
      securityLock: 'Đã giặt hấp diệt khuẩn và bọc túi nilon bảo quản.'
    },
    images: {
      front: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80',
      frontLabel: 'CAM-01 // TOÀN THÂN ÁO',
      frontTag: 'Màu Be Cát',
      back: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80',
      backLabel: 'CAM-02 // TAG BURBERRY',
      backTag: 'Size 40'
    },
    guest: {
      name: 'Jonathan King',
      avatar: 'JK',
      bookingId: '#BK-94110',
      room: 'Phòng 302',
      phone: '+44 7700 900123',
      tier: 'KHÁCH HÀNG STANDARD',
      tierColor: 'bg-gray-100 text-gray-700 border-gray-200',
      idVerified: 'ĐÃ THÔNG BÁO QUA EMAIL 3 LẦN NHƯNG KHÔNG PHẢN HỒI',
      passportNo: 'PP: 55910248 (GBR)'
    },
    custodyChain: [
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
    ],
    deliveryMethod: 'THIRD_PARTY',
    deliveryNote: 'Chuyển quỹ từ thiện Phú Quốc Care',
    trackingCode: 'CHARITY-2025-091',
    sha256: '4410abce19284fa98011ccbe091244ae998104271890471bcca1192801948ae8',
    supervisor: {
      name: 'Marcus Aurelius',
      title: 'Front Desk Duty Supervisor',
      pki: 'AUTHORIZED • 0x88CC...990A 10:15',
      ip: '192.168.10.84',
      lat: '10.28 N',
      token: 'YUBIKEY-NFC-V5'
    }
  }
];

let isSynced = false;
const ensureSeeded = async () => {
  try {
    await LostAndFoundItem.sync();
    isSynced = true;
    const count = await LostAndFoundItem.count();
    if (count === 0) {
      console.log('[Lost & Found] Đang khởi tạo dữ liệu mẫu ban đầu vào Database...');
      for (const item of SEED_DATA) {
        await LostAndFoundItem.create(item);
      }
      console.log('[Lost & Found] Đã nạp thành công dữ liệu mẫu vào Database.');
    }
  } catch (error) {
    console.error('[Lost & Found] Lỗi khởi tạo bảng LostAndFoundItem:', error);
  }
};
ensureSeeded();

// Middleware đảm bảo bảng đã sync trước khi xử lý request
router.use(async (req, res, next) => {
  if (!isSynced) {
    await ensureSeeded();
  }
  next();
});

// 1. GET / - Lấy toàn bộ danh sách đồ thất lạc & bỏ quên từ Database
router.get('/', async (req, res) => {
  try {
    const { roomNumber, foundDate, status, search } = req.query;
    const where = {};

    if (roomNumber && roomNumber !== 'ALL') {
      where.roomNumber = roomNumber;
    }
    if (foundDate) {
      where.foundDate = foundDate;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { itemName: { [Op.like]: `%${search}%` } },
        { roomNumber: { [Op.like]: `%${search}%` } },
        { foundLocation: { [Op.like]: `%${search}%` } }
      ];
    }

    const items = await LostAndFoundItem.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: items,
      total: items.length
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách Lost & Found từ Database:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu từ Database', error: error.message });
  }
});

// 2. GET /:id - Lấy chi tiết 1 hồ sơ
router.get('/:id', async (req, res) => {
  try {
    const item = await LostAndFoundItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ đồ thất lạc' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Lỗi lấy chi tiết hồ sơ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. POST / - Tạo mới ghi nhận đồ bỏ quên từ buồng phòng (Lưu ảnh & dữ liệu vào Database)
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    
    // Nếu chưa có ID thì tự sinh mã hồ sơ chuẩn
    if (!payload.id) {
      payload.id = `LF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!payload.hash) {
      payload.hash = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-LF25`;
    }

    // Đảm bảo có chuỗi bảo quản ban đầu
    if (!payload.custodyChain || payload.custodyChain.length === 0) {
      payload.custodyChain = [
        {
          id: 1,
          time: `${payload.foundDate || new Date().toISOString().split('T')[0]} • ${payload.foundTime || '10:00 SA'}`,
          tag: 'Phát hiện tại chỗ',
          tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          actor: payload.finderName || 'Nhân viên buồng phòng',
          description: `Phát hiện vật phẩm bỏ quên tại ${payload.foundLocation} phòng ${payload.roomNumber}.`
        },
        {
          id: 2,
          time: `${payload.foundDate || new Date().toISOString().split('T')[0]} • Lưu kho`,
          tag: 'Niêm phong két an toàn',
          tagColor: 'bg-slate-100 text-slate-800 border-slate-200',
          actor: 'Giám sát Buồng phòng',
          description: `Gắn tem niêm phong ${payload.sealNumber || '#ST-99155'} và lưu giữ tại ${payload.storageLocation || 'Két an toàn B-04'}.`
        }
      ];
    }

    const newItem = await LostAndFoundItem.create(payload);
    res.status(201).json({
      success: true,
      message: 'Ghi nhận và lưu hình ảnh vật phẩm vào Database thành công!',
      data: newItem
    });
  } catch (error) {
    console.error('Lỗi tạo mới vật phẩm Lost & Found:', error);
    res.status(500).json({ success: false, message: 'Không thể lưu vào Database', error: error.message });
  }
});

// 4. PUT /:id - Cập nhật vòng đời, chữ ký điện tử, thông tin bàn giao vào Database
router.put('/:id', async (req, res) => {
  try {
    const item = await LostAndFoundItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ để cập nhật' });
    }

    await item.update(req.body);
    res.json({
      success: true,
      message: 'Cập nhật hồ sơ vào Database thành công!',
      data: item
    });
  } catch (error) {
    console.error('Lỗi cập nhật hồ sơ Lost & Found:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật Database', error: error.message });
  }
});

// 5. DELETE /:id - Xóa hồ sơ
router.delete('/:id', async (req, res) => {
  try {
    const item = await LostAndFoundItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    await item.destroy();
    res.json({ success: true, message: 'Đã xóa hồ sơ khỏi Database thành công' });
  } catch (error) {
    console.error('Lỗi xóa hồ sơ:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa khỏi Database', error: error.message });
  }
});

// 6. POST /reset-sample - Nạp lại dữ liệu mẫu ban đầu
router.post('/reset-sample', async (req, res) => {
  try {
    await LostAndFoundItem.destroy({ where: {}, truncate: true });
    for (const item of SEED_DATA) {
      await LostAndFoundItem.create(item);
    }
    const items = await LostAndFoundItem.findAll();
    res.json({ success: true, message: 'Đã nạp lại dữ liệu mẫu vào Database!', data: items });
  } catch (error) {
    console.error('Lỗi reset dữ liệu mẫu:', error);
    res.status(500).json({ success: false, message: 'Lỗi nạp lại Database', error: error.message });
  }
});

module.exports = router;
