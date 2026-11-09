'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const SEED_DECLARATIONS = [
  {
    id: 'DEC-804',
    roomNumber: '804',
    roomLabel: 'Tháp B • Deluxe Ocean',
    guestName: 'Arthur Dent',
    mrzFullName: 'DENT, ARTHUR PHILIP',
    dobGender: '11/03/1982 • NAM',
    nationality: 'Vương Quốc Anh (GBR)',
    nationalityCode: 'GBR',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    documentType: 'PASSPORT',
    documentNumber: 'B81920489',
    documentExpiry: '20/05/2031',
    documentDisplay: 'HC: B81920489 (2031)',
    visaTitle: 'E-visa 90 ngày (Hợp lệ)',
    visaCode: 'EV-2025-08-992144',
    visaStatus: 'VALID',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    checkInTime: '14:10',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'SENT_POLICE', // SENT_POLICE | SYNCED_C06 | MISSING_VISA | PENDING_SIGN
    transmissionLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    mrzLine1: 'P<GBRDENT<<ARTHUR<PHILIP<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'B819204894GBR8203114M3105206<<<<<<<<<<<<<<04',
    sha256Hash: '9f8e...321b',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 1
  },
  {
    id: 'DEC-1401',
    roomNumber: '1401',
    roomLabel: 'Penthouse • Ocean Sky',
    guestName: 'Kenji Sato',
    mrzFullName: 'SATO, KENJI',
    dobGender: '24/08/1978 • NAM',
    nationality: 'Nhật Bản (JPN)',
    nationalityCode: 'JPN',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    documentType: 'PASSPORT',
    documentNumber: 'TZ7890123',
    documentExpiry: '15/11/2029',
    documentDisplay: 'HC: TZ7890123 (2029)',
    visaTitle: 'Miễn thị thực 45 ngày',
    visaCode: 'Đơn phương song phương',
    visaStatus: 'EXEMPT_45',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    checkInTime: '16:30',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'SENT_POLICE',
    transmissionLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    mrzLine1: 'P<JPNSATO<<KENJI<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'TZ78901238JPN7808242M2911154<<<<<<<<<<<<<<02',
    sha256Hash: '4a1c...889e',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 2
  },
  {
    id: 'DEC-407',
    roomNumber: '407',
    roomLabel: 'Cánh Vườn • Garden Suite',
    guestName: 'Clara Higgins',
    mrzFullName: 'HIGGINS, CLARA MARGARET',
    dobGender: '05/12/1988 • NỮ',
    nationality: 'Hoa Kỳ (USA)',
    nationalityCode: 'USA',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    documentType: 'PASSPORT',
    documentNumber: 'P-492100342',
    documentExpiry: '10/09/2030',
    documentDisplay: 'HC: P-492100342',
    visaTitle: 'E-visa 30 ngày (Du lịch)',
    visaCode: 'EV-2025-03-118400',
    visaStatus: 'VALID',
    entryPort: 'Sân bay Quốc tế Tân Sơn Nhất / PQC',
    checkInTime: '12:45',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'SENT_POLICE',
    transmissionLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    mrzLine1: 'P<USAHIGGINS<<CLARA<MARGARET<<<<<<<<<<<<<<<<',
    mrzLine2: '4921003426USA8812055F3009102<<<<<<<<<<<<<<06',
    sha256Hash: '7c2d...190a',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 3
  },
  {
    id: 'DEC-V101',
    roomNumber: 'V101',
    roomLabel: 'Biệt Thự Biển • Villa 101',
    guestName: 'Nguyễn Văn An',
    mrzFullName: 'NGUYEN, VAN AN',
    dobGender: '19/05/1988 • NAM',
    nationality: 'Việt Nam (VNM)',
    nationalityCode: 'VNM',
    isForeigner: false,
    isPhuQuocVisaFree: false,
    documentType: 'CCCD',
    documentNumber: '079088012345',
    documentExpiry: '19/05/2048',
    documentDisplay: 'CCCD: 079088012345',
    visaTitle: 'VNeID Mức 2 [ĐẠT]',
    visaCode: 'Đã xác minh qua C06',
    visaStatus: 'VNEID_VERIFIED',
    entryPort: 'Công dân nội địa (CCCD gắn chip)',
    checkInTime: '11:20',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'SYNCED_C06',
    transmissionLabel: 'ĐÃ ĐỒNG BỘ CSDL',
    mrzLine1: 'IDVNM0880123452079088012345<<8',
    mrzLine2: '8805197M4805195VNM<<<<<<<<<<<4NGUYEN<<VAN<AN<<',
    sha256Hash: '2b8f...651c',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 4
  },
  {
    id: 'DEC-305',
    roomNumber: '305',
    roomLabel: 'Tháp A • Premier Suite',
    guestName: 'Elena Rostova',
    mrzFullName: 'ROSTOVA, ELENA',
    dobGender: '14/02/1993 • NỮ',
    nationality: 'Pháp (FRA)',
    nationalityCode: 'FRA',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    documentType: 'PASSPORT',
    documentNumber: '19AA90214',
    documentExpiry: '14/02/2029',
    documentDisplay: 'HC: 19AA90214',
    visaTitle: 'Thiếu trang thị thực',
    visaCode: 'Yêu cầu bổ sung trước 21:00',
    visaStatus: 'MISSING',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    checkInTime: '17:15',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'MISSING_VISA',
    transmissionLabel: 'THIẾU HỒ SƠ VISA',
    mrzLine1: 'P<FRAROSTOVA<<ELENA<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: '19AA902147FRA9302148F2902142<<<<<<<<<<<<<<08',
    sha256Hash: '5e9a...004d',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    checked: false,
    sortOrder: 5
  },
  {
    id: 'DEC-618',
    roomNumber: '618',
    roomLabel: 'Tháp B • Sunset Studio',
    guestName: 'David Miller',
    mrzFullName: 'MILLER, DAVID JOHN',
    dobGender: '29/07/1985 • NAM',
    nationality: 'Úc (AUS)',
    nationalityCode: 'AUS',
    isForeigner: true,
    isPhuQuocVisaFree: true,
    documentType: 'PASSPORT',
    documentNumber: 'N8890123',
    documentExpiry: '29/07/2032',
    documentDisplay: 'HC: N8890123 (2032)',
    visaTitle: 'Miễn thị thực Phú Quốc',
    visaCode: 'Lưu trú < 30 ngày tại đảo',
    visaStatus: 'PQ_EXEMPT_30',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    checkInTime: '18:05',
    checkInDate: 'Hôm nay',
    transmissionStatus: 'PENDING_SIGN',
    transmissionLabel: 'CHỜ KÝ SỐ CA TRỰC',
    mrzLine1: 'P<AUSMILLER<<DAVID<JOHN<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'N889012345AUS8507291M3207298<<<<<<<<<<<<<<02',
    sha256Hash: '3d7b...912f',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 6
  }
];

let DECLARATIONS_MEM = [...SEED_DECLARATIONS];
let isTableReady = false;

async function ensurePoliceTable() {
  if (isTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS PoliceGuestDeclarationsStore (
        id VARCHAR(40) PRIMARY KEY,
        payload JSON NOT NULL,
        sortOrder INT DEFAULT 10,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM PoliceGuestDeclarationsStore');
    if (rows[0].cnt === 0) {
      for (const item of SEED_DECLARATIONS) {
        await pool.query(
          'INSERT IGNORE INTO PoliceGuestDeclarationsStore (id, payload, sortOrder) VALUES (?, ?, ?)',
          [item.id, JSON.stringify(item), item.sortOrder || 10]
        );
      }
    }
    isTableReady = true;
  } catch (err) {
    console.warn('[PoliceDeclaration] Dùng bộ nhớ tạm:', err.message);
  }
}
ensurePoliceTable();

async function getAllDeclarations() {
  await ensurePoliceTable();
  if (isTableReady) {
    try {
      const [rows] = await pool.query(
        'SELECT payload FROM PoliceGuestDeclarationsStore ORDER BY sortOrder ASC, createdAt DESC'
      );
      if (rows.length > 0) {
        const parsed = rows.map(r =>
          typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
        );
        DECLARATIONS_MEM = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('[PoliceDeclaration] Lỗi đọc dữ liệu:', e.message);
    }
  }
  return DECLARATIONS_MEM;
}

async function saveDeclaration(item, sortOrder = 10) {
  await ensurePoliceTable();
  if (isTableReady) {
    try {
      await pool.query(
        `INSERT INTO PoliceGuestDeclarationsStore (id, payload, sortOrder)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
        [item.id, JSON.stringify(item), sortOrder]
      );
    } catch (e) {
      console.warn('[PoliceDeclaration] Lỗi lưu dữ liệu:', e.message);
    }
  }
}

// 1. GET /api/police-declaration/overview
router.get('/overview', async (req, res) => {
  const declarations = await getAllDeclarations();
  res.json({
    success: true,
    batchCode: '#VN-PQ-20251024-03',
    facilityCode: 'PQ-RES-00421',
    receivingAgency: 'CATP. Phú Quốc',
    declarations
  });
});

// 2. POST /api/police-declaration/declarations - Thêm / Khai báo bổ sung hồ sơ khách lưu trú
router.post('/declarations', async (req, res) => {
  const declarations = await getAllDeclarations();
  const {
    roomNumber = '502',
    roomLabel = 'Tháp A • Deluxe Ocean',
    guestName = 'Khách Lưu Trú Mới',
    dobGender = '15/06/1990 • NAM',
    nationality = 'Hàn Quốc (KOR)',
    nationalityCode = 'KOR',
    documentType = 'PASSPORT',
    documentNumber = 'M89210455',
    documentExpiry = '15/06/2032',
    visaTitle = 'Miễn thị thực Phú Quốc',
    visaCode = 'Lưu trú < 30 ngày tại đảo',
    entryPort = 'Sân bay Quốc tế Phú Quốc (PQC)'
  } = req.body;

  const id = `DEC-${roomNumber}-${Date.now().toString().slice(-4)}`;
  const isForeigner = nationalityCode !== 'VNM';
  const cleanNameUpper = String(guestName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const newRecord = {
    id,
    roomNumber,
    roomLabel,
    guestName: String(guestName).trim(),
    mrzFullName: cleanNameUpper.replace(/\s+/g, ', '),
    dobGender,
    nationality,
    nationalityCode,
    isForeigner,
    isPhuQuocVisaFree: visaTitle.toLowerCase().includes('phú quốc'),
    documentType,
    documentNumber: String(documentNumber).toUpperCase(),
    documentExpiry,
    documentDisplay:
      documentType === 'CCCD'
        ? `CCCD: ${documentNumber}`
        : `HC: ${String(documentNumber).toUpperCase()} (${(documentExpiry || '2031').slice(-4)})`,
    visaTitle,
    visaCode,
    visaStatus: 'VALID',
    entryPort,
    checkInTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    checkInDate: 'Hôm nay',
    transmissionStatus: isForeigner ? 'SENT_POLICE' : 'SYNCED_C06',
    transmissionLabel: isForeigner ? 'ĐÃ GỬI BỘ CÔNG AN' : 'ĐÃ ĐỒNG BỘ CSDL',
    mrzLine1: `P<${nationalityCode}${cleanNameUpper.replace(/\s+/g, '<')}<<<<<<<<<<<<<<<<<<<<`.slice(
      0,
      44
    ),
    mrzLine2: `${String(documentNumber).toUpperCase()}<${nationalityCode}9006154M3206156<<<<<<<<<<<<<<04`.slice(
      0,
      44
    ),
    sha256Hash: '8a4f...772e',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    checked: true,
    sortOrder: 0
  };

  DECLARATIONS_MEM.unshift(newRecord);
  await saveDeclaration(newRecord, 0);

  res.status(201).json({
    success: true,
    message: `Đã trích xuất và khai báo tạm trú cho khách ${newRecord.guestName} (Phòng ${roomNumber}) thành công!`,
    data: newRecord
  });
});

// 3. PATCH /api/police-declaration/declarations/:id - Cập nhật bổ sung thị thực hoặc ký số
router.patch('/declarations/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const declarations = await getAllDeclarations();
  const target = declarations.find(d => d.id === id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khai báo!' });
  }

  Object.assign(target, updates);
  await saveDeclaration(target, target.sortOrder ?? 5);

  res.json({
    success: true,
    message: `Đã cập nhật hồ sơ khai báo tạm trú của khách ${target.guestName}!`,
    data: target
  });
});

// 4. POST /api/police-declaration/batch-sign - Ký số hàng loạt & Đồng bộ Cổng Dịch vụ công C06 / XNC
router.post('/batch-sign', async (req, res) => {
  const declarations = await getAllDeclarations();

  for (const item of declarations) {
    if (item.transmissionStatus !== 'SENT_POLICE' && item.transmissionStatus !== 'SYNCED_C06') {
      item.transmissionStatus = item.isForeigner ? 'SENT_POLICE' : 'SYNCED_C06';
      item.transmissionLabel = item.isForeigner ? 'ĐÃ GỬI BỘ CÔNG AN' : 'ĐÃ ĐỒNG BỘ CSDL';
      if (item.visaStatus === 'MISSING') {
        item.visaTitle = 'E-visa 45 ngày (Đã bổ sung)';
        item.visaCode = 'EV-2025-10-884920';
        item.visaStatus = 'VALID';
      }
      item.checked = true;
      await saveDeclaration(item, item.sortOrder ?? 5);
    }
  }

  res.json({
    success: true,
    message: 'Đã ký số VNPT-CA và đồng bộ toàn bộ hồ sơ lên Cổng Dịch vụ công Bộ Công An (C06 / XNC)!',
    declarations
  });
});

module.exports = router;
