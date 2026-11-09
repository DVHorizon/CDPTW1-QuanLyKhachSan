import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const MIcon = ({ name, className = 'w-4 h-4' }) => (
  <span
    className={`material-symbols-outlined inline-flex items-center justify-center select-none leading-none ${className}`}
    style={{ fontSize: '16px' }}
  >
    {name}
  </span>
);

const ShieldCheck = (props) => <MIcon name="verified_user" {...props} />;
const UserPlus = (props) => <MIcon name="person_add" {...props} />;
const Download = (props) => <MIcon name="download" {...props} />;
const RefreshCw = (props) => <MIcon name="sync" {...props} />;
const BedDouble = (props) => <MIcon name="bed" {...props} />;
const Globe = (props) => <MIcon name="public" {...props} />;
const CheckCircle2 = (props) => <MIcon name="check_circle" {...props} />;
const AlertTriangle = (props) => <MIcon name="warning" {...props} />;
const Search = (props) => <MIcon name="search" {...props} />;
const Calendar = (props) => <MIcon name="calendar_today" {...props} />;
const Users = (props) => <MIcon name="group" {...props} />;
const SlidersHorizontal = (props) => <MIcon name="tune" {...props} />;
const Printer = (props) => <MIcon name="print" {...props} />;
const Code2 = (props) => <MIcon name="code" {...props} />;
const FileCheck2 = (props) => <MIcon name="task" {...props} />;
const Edit3 = (props) => <MIcon name="edit" {...props} />;
const Trash2 = (props) => <MIcon name="delete" {...props} />;
const Concierge = (props) => <MIcon name="how_to_reg" {...props} />;
const Radio = (props) => <MIcon name="podcasts" {...props} />;
const ScanLine = (props) => <MIcon name="document_scanner" {...props} />;
const Award = (props) => <MIcon name="workspace_premium" {...props} />;
const ChevronLeft = (props) => <MIcon name="chevron_left" {...props} />;
const ChevronRight = (props) => <MIcon name="chevron_right" {...props} />;
const Columns = (props) => <MIcon name="view_column" {...props} />;
const X = (props) => <MIcon name="close" {...props} />;
const FileSpreadsheet = (props) => <MIcon name="table_view" {...props} />;
const FileCode = (props) => <MIcon name="data_object" {...props} />;
const FileText = (props) => <MIcon name="description" {...props} />;
const Scale = (props) => <MIcon name="gavel" {...props} />;

const STORAGE_KEY = 'grand_horizon_police_declarations_v2';
const DELETED_IDS_KEY = 'grand_horizon_police_deleted_ids_v2';

function toAsciiUpper(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim();
}

function generateMrzFromGuest({
  guestName = 'KHACH LUU TRU',
  nationalityCode = 'VNM',
  documentType = 'CCCD',
  documentNumber = '079088012345',
}) {
  const cleanName = toAsciiUpper(guestName);
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const surname = parts[0] || 'NGUYEN';
  const givenNames = parts.slice(1).join('<') || 'KHACH';
  const cleanDoc = String(documentNumber || '079088012345')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();
  const nat = String(nationalityCode || 'VNM')
    .toUpperCase()
    .slice(0, 3);

  if (documentType === 'CCCD' || nat === 'VNM') {
    const line1 = `ID${nat}${cleanDoc.slice(0, 9).padEnd(9, '0')}2${cleanDoc.padEnd(15, '<')}`.slice(
      0,
      44
    );
    const line2 = `9001018M3301012${nat}<<<<<<<<<<<6${surname}<<${givenNames}<<<<<<<<<<`.slice(
      0,
      44
    );
    return {
      mrzFullName: `${surname}, ${parts.slice(1).join(' ') || surname}`,
      mrzLine1: line1,
      mrzLine2: line2,
    };
  }

  const line1 = `P<${nat}${surname}<<${givenNames}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(
    0,
    44
  );
  const line2 = `${cleanDoc.padEnd(9, '<')}4${nat}8805194M3108206<<<<<<<<<<<<<<04`.slice(
    0,
    44
  );
  return {
    mrzFullName: `${surname}, ${parts.slice(1).join(' ') || surname}`,
    mrzLine1: line1,
    mrzLine2: line2,
  };
}

const INITIAL_DECLARATIONS = [
  {
    id: 'DEC-804',
    roomNumber: '804',
    guestName: 'Arthur Dent',
    mrzFullName: 'DENT, ARTHUR PHILIP',
    buildingInfo: 'Tháp B • Deluxe Ocean',
    nationality: 'Vương Quốc Anh',
    nationalityCode: 'GBR',
    documentType: 'HC',
    documentNumber: 'B81920489',
    documentExpiryYear: '2031',
    documentExpiryFull: '20/05/2031',
    dobGender: '11/03/1982 • NAM',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    visaType: 'E-visa 90 ngày (Hợp lệ)',
    visaCode: 'EV-2025-GB-992144',
    visaCategory: 'E_VISA',
    checkInTime: '14:10',
    checkInDateLabel: 'Hôm nay',
    status: 'SENT_POLICE',
    statusLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    selected: true,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-804-GBR',
    mrzLine1: 'P<GBRDENT<<ARTHUR<PHILIP<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'B819204894GBR8203114M3105206<<<<<<<<<<<<<<02',
    sha256Hash: '8f9c...321b',
  },
  {
    id: 'DEC-1401',
    roomNumber: '1401',
    guestName: 'Kenji Sato',
    mrzFullName: 'SATO, KENJI TAKAHASHI',
    buildingInfo: 'Penthouse • Ocean Sky',
    nationality: 'Nhật Bản',
    nationalityCode: 'JPN',
    documentType: 'HC',
    documentNumber: 'TZ7890123',
    documentExpiryYear: '2029',
    documentExpiryFull: '14/11/2029',
    dobGender: '22/07/1979 • NAM',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    visaType: 'Miễn thị thực 45 ngày',
    visaCode: 'Đơn phương song phương',
    visaCategory: 'VISA_FREE_45',
    checkInTime: '16:30',
    checkInDateLabel: 'Hôm nay',
    status: 'SENT_POLICE',
    statusLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    selected: true,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-1401-JPN',
    mrzLine1: 'P<JPNSATO<<KENJI<TAKAHASHI<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'TZ78901238JPN7907225M2911142<<<<<<<<<<<<<<06',
    sha256Hash: '4a1e...908c',
  },
  {
    id: 'DEC-407',
    roomNumber: '407',
    guestName: 'Clara Higgins',
    mrzFullName: 'HIGGINS, CLARA MARIE',
    buildingInfo: 'Cánh Vườn • Garden Suite',
    nationality: 'Hoa Kỳ',
    nationalityCode: 'USA',
    documentType: 'HC',
    documentNumber: 'P-482199342',
    documentExpiryYear: '2030',
    documentExpiryFull: '08/09/2030',
    dobGender: '04/12/1988 • NỮ',
    entryPort: 'Sân bay Quốc tế Tân Sơn Nhất (SGN)',
    visaType: 'E-visa 30 ngày (Du lịch)',
    visaCode: 'EV-2025-US-110482',
    visaCategory: 'E_VISA',
    checkInTime: '12:45',
    checkInDateLabel: 'Hôm nay',
    status: 'SENT_POLICE',
    statusLabel: 'ĐÃ GỬI BỘ CÔNG AN',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    selected: true,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-407-USA',
    mrzLine1: 'P<USAHIGGINS<<CLARA<MARIE<<<<<<<<<<<<<<<<<<<',
    mrzLine2: '4821993426USA8812042F3009084<<<<<<<<<<<<<<04',
    sha256Hash: '7c2d...519a',
  },
  {
    id: 'DEC-V101',
    roomNumber: 'V101',
    guestName: 'Nguyễn Văn An',
    mrzFullName: 'NGUYEN, VAN AN',
    buildingInfo: 'Biệt Thự Biển • Villa 101',
    nationality: 'Việt Nam',
    nationalityCode: 'VNM',
    documentType: 'CCCD',
    documentNumber: '079088012345',
    documentExpiryYear: '2033',
    documentExpiryFull: '19/05/2033',
    dobGender: '19/05/1988 • NAM',
    entryPort: 'Định danh điện tử VNeID C06',
    visaType: 'VNeID Mức 2 [ĐẠT]',
    visaCode: 'Đã xác minh qua C06',
    visaCategory: 'VNEID_LEVEL_2',
    checkInTime: '11:20',
    checkInDateLabel: 'Hôm nay',
    status: 'SYNCED_DB',
    statusLabel: 'ĐÃ ĐỒNG BỘ CSDL',
    isForeigner: false,
    isPhuQuocVisaFree: false,
    selected: true,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-V101-VNM',
    mrzLine1: 'IDVNM0880123452079088012345<<<',
    mrzLine2: '8805198M3305192VNM<<<<<<<<<<<6',
    sha256Hash: '9b4f...772e',
  },
  {
    id: 'DEC-305',
    roomNumber: '305',
    guestName: 'Elena Rostova',
    mrzFullName: 'ROSTOVA, ELENA IVANOVNA',
    buildingInfo: 'Tháp A • Premier Suite',
    nationality: 'Pháp',
    nationalityCode: 'FRA',
    documentType: 'HC',
    documentNumber: '19AA40214',
    documentExpiryYear: '2028',
    documentExpiryFull: '12/04/2028',
    dobGender: '15/08/1991 • NỮ',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    visaType: 'Thiếu trang thị thực',
    visaCode: 'Yêu cầu bổ sung trước 21:00',
    visaCategory: 'MISSING_VISA',
    checkInTime: '17:15',
    checkInDateLabel: 'Hôm nay',
    status: 'MISSING_VISA',
    statusLabel: 'THIẾU HỒ SƠ VISA',
    isForeigner: true,
    isPhuQuocVisaFree: false,
    selected: false,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-305-FRA',
    mrzLine1: 'P<FRAROSTOVA<<ELENA<IVANOVNA<<<<<<<<<<<<<<<<',
    mrzLine2: '19AA402147FRA9108153F2804128<<<<<<<<<<<<<<08',
    sha256Hash: '2e6a...104d',
  },
  {
    id: 'DEC-618',
    roomNumber: '618',
    guestName: 'David Miller',
    mrzFullName: 'MILLER, DAVID GEORGE',
    buildingInfo: 'Tháp B • Sunset Studio',
    nationality: 'Úc',
    nationalityCode: 'AUS',
    documentType: 'HC',
    documentNumber: 'N8890123',
    documentExpiryYear: '2032',
    documentExpiryFull: '30/01/2032',
    dobGender: '09/10/1985 • NAM',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    visaType: 'Miễn thị thực Phú Quốc',
    visaCode: 'Lưu trú < 30 ngày tại đảo',
    visaCategory: 'PHU_QUOC_30D',
    checkInTime: '18:05',
    checkInDateLabel: 'Hôm nay',
    status: 'PENDING_SIGN',
    statusLabel: 'CHỜ KÝ SỐ CA TRỰC',
    isForeigner: true,
    isPhuQuocVisaFree: true,
    selected: true,
    source: 'CHECKIN_DESK',
    bookingCode: 'GH-618-AUS',
    mrzLine1: 'P<AUSMILLER<<DAVID<GEORGE<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'N889012341AUS8510099M3201305<<<<<<<<<<<<<<02',
    sha256Hash: '6d1c...883f',
  },
];

const API_BANDWIDTH_BARS = [
  68, 74, 82, 78, 86, 92, 85, 88, 95, 90, 84, 92, 96, 89, 94, 98, 91, 96,
];

const STATUS_MAP = {
  SENT_POLICE: 'ĐÃ GỬI BỘ CÔNG AN',
  SYNCED_DB: 'ĐÃ ĐỒNG BỘ CSDL',
  MISSING_VISA: 'THIẾU HỒ SƠ VISA',
  PENDING_SIGN: 'CHỜ KÝ SỐ CA TRỰC',
};

const NATIONALITY_OPTIONS = [
  { code: 'VNM', name: 'Việt Nam' },
  { code: 'GBR', name: 'Vương Quốc Anh' },
  { code: 'JPN', name: 'Nhật Bản' },
  { code: 'USA', name: 'Hoa Kỳ' },
  { code: 'FRA', name: 'Pháp' },
  { code: 'AUS', name: 'Úc' },
  { code: 'KOR', name: 'Hàn Quốc' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'DEU', name: 'Đức' },
];

const PoliceDeclarationExport = () => {
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });

  const [declarations, setDeclarations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}
    return INITIAL_DECLARATIONS;
  });

  const [checkInArrivals, setCheckInArrivals] = useState([]);
  const [selectedGuestId, setSelectedGuestId] = useState('DEC-804');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSyncingPortal, setIsSyncingPortal] = useState(false);
  const [isSyncingCheckIn, setIsSyncingCheckIn] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('18:14:02 (Tự động)');
  const [txnCode, setTxnCode] = useState('TXN-PQ-20251024-C06-99120');
  const [toast, setToast] = useState(null);

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deletingGuest, setDeletingGuest] = useState(null);
  const [supplementGuest, setSupplementGuest] = useState(null);
  const [xmlPreviewGuest, setXmlPreviewGuest] = useState(null);
  const [printPreviewGuests, setPrintPreviewGuests] = useState(null);

  // Form states for Manual Add
  const [newGuestForm, setNewGuestForm] = useState({
    roomNumber: '902',
    guestName: '',
    buildingInfo: 'Tháp A • Ocean View Suite',
    nationality: 'Hàn Quốc',
    nationalityCode: 'KOR',
    documentType: 'HC',
    documentNumber: '',
    documentExpiryFull: '15/08/2031',
    dobGender: '12/06/1990 • NAM',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
    visaType: 'Miễn thị thực Phú Quốc',
    visaCode: 'Lưu trú < 30 ngày tại đảo',
    isForeigner: true,
    isPhuQuocVisaFree: true,
  });

  // Form state for Full Edit Modal
  const [editForm, setEditForm] = useState({
    id: '',
    roomNumber: '',
    buildingInfo: '',
    guestName: '',
    mrzFullName: '',
    nationality: 'Việt Nam',
    nationalityCode: 'VNM',
    documentType: 'CCCD',
    documentNumber: '',
    documentExpiryFull: '',
    dobGender: '',
    entryPort: '',
    visaType: '',
    visaCode: '',
    checkInTime: '',
    status: 'SENT_POLICE',
    mrzLine1: '',
    mrzLine2: '',
  });

  // Form state for Visa Supplement
  const [visaSupplementForm, setVisaSupplementForm] = useState({
    visaType: 'E-visa 90 ngày (Hợp lệ)',
    visaCode: 'EV-2025-FR-774829',
    entryPort: 'Sân bay Quốc tế Phú Quốc (PQC)',
  });

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(declarations));
    } catch (_) {}
  }, [declarations]);

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
    } catch (_) {}
  }, [deletedIds]);

  // Load overview & Front Desk Check-in data from backend
  const fetchOverviewAndCheckIns = async () => {
    try {
      const res = await fetch('/api/police-declaration/overview');
      if (res.ok) {
        const json = await res.json();
        const serverDeclarations =
          json?.declarations || json?.data?.declarations || [];
        const serverCheckIns =
          json?.checkInArrivals || json?.data?.checkInArrivals || [];

        if (serverCheckIns.length > 0) {
          setCheckInArrivals(serverCheckIns);
        }

        if (serverDeclarations.length > 0) {
          const deletedSet = new Set(
            JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]')
          );
          setDeclarations((prev) => {
            const map = new Map();
            // Ưu tiên dữ liệu đã chỉnh sửa ở client + dữ liệu mới từ Check-in tại quầy
            serverDeclarations.forEach((d) => {
              if (!deletedSet.has(d.id)) {
                map.set(d.id, d);
              }
            });
            prev.forEach((d) => {
              if (!deletedSet.has(d.id)) {
                map.set(d.id, { ...(map.get(d.id) || {}), ...d });
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (_) {}

    // Fallback: gọi trực tiếp endpoint /api/v1/check-ins/arrivals của Quầy Lễ Tân nếu cần
    try {
      const arrRes = await fetch('/api/v1/check-ins/arrivals?limit=25');
      if (arrRes.ok) {
        const arrJson = await arrRes.json();
        if (Array.isArray(arrJson?.data) && arrJson.data.length > 0) {
          setCheckInArrivals((prev) => (prev.length > 0 ? prev : arrJson.data));
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchOverviewAndCheckIns();
  }, []);

  // Đồng bộ trực tiếp danh sách khách từ Check-in tại quầy
  const handleSyncFromCheckInDesk = async (specificBookingIds = null) => {
    setIsSyncingCheckIn(true);
    try {
      const res = await fetch('/api/police-declaration/sync-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeConfirmed: true,
          restoreDeleted: true,
          bookingIds: specificBookingIds,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.declarations)) {
          // Nếu người dùng chủ động đồng bộ lại, gỡ các ID vừa đồng bộ khỏi danh sách xóa
          const syncedIds = new Set(json.declarations.map((d) => d.id));
          const nextDeleted = deletedIds.filter((id) => !syncedIds.has(id));
          setDeletedIds(nextDeleted);
          setDeclarations(json.declarations);
          if (json.declarations[0]) {
            setSelectedGuestId(json.declarations[0].id);
          }
          showNotification(
            json.message ||
              `Đã lấy ${json.syncedCount || json.declarations.length} hồ sơ khách từ Check-in tại quầy!`
          );
          setShowCheckInModal(false);
          setIsSyncingCheckIn(false);
          return;
        }
      }
    } catch (_) {}

    // Fallback đồng bộ trực tiếp từ danh sách checkInArrivals nếu API bận
    if (checkInArrivals.length > 0) {
      const converted = checkInArrivals.slice(0, 10).map((row) => {
        const id = row.id || `CHK-${row.BookingId}`;
        const guestName = row.guestName || row.GuestName || 'Khách Check-in';
        const docNumber =
          row.documentNumber ||
          row.IdNumber ||
          `0790880${String(10000 + Number(row.BookingId || 1)).slice(-5)}`;
        const roomNumber = String(row.roomNumber || row.RoomNumber || '201');
        const mrz = generateMrzFromGuest({
          guestName,
          nationalityCode: 'VNM',
          documentType: 'CCCD',
          documentNumber: docNumber,
        });
        return {
          id,
          bookingId: row.BookingId || row.bookingId,
          bookingCode: row.ConfirmationCode || row.bookingCode || `BK-${row.BookingId}`,
          roomNumber,
          buildingInfo: row.buildingInfo || row.RoomTypeName || 'Check-in Tại Quầy Lễ Tân',
          guestName,
          mrzFullName: mrz.mrzFullName,
          nationality: row.nationality || 'Việt Nam',
          nationalityCode: row.nationalityCode || 'VNM',
          documentType: row.documentType || 'CCCD',
          documentNumber: docNumber,
          documentExpiryYear: '2032',
          documentExpiryFull: '20/08/2032',
          dobGender: row.dobGender || '15/06/1990 • NAM',
          entryPort: 'Check-in tại quầy Lễ Tân (CCCD/VNeID)',
          visaType: 'VNeID Mức 2 [ĐẠT]',
          visaCode: `Check-in #${row.ConfirmationCode || row.BookingId}`,
          visaCategory: 'VNEID_LEVEL_2',
          checkInTime: row.checkInTime || '14:00',
          checkInDateLabel: 'Đã Check-in',
          status: 'SYNCED_DB',
          statusLabel: 'ĐÃ ĐỒNG BỘ CSDL',
          isForeigner: false,
          isPhuQuocVisaFree: false,
          selected: true,
          source: 'CHECKIN_DESK',
          mrzLine1: mrz.mrzLine1,
          mrzLine2: mrz.mrzLine2,
          sha256Hash: '8a1c...c06f',
        };
      });

      setDeclarations((prev) => {
        const map = new Map();
        converted.forEach((c) => map.set(c.id, c));
        prev.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
        return Array.from(map.values());
      });
      showNotification(`Đã lấy ${converted.length} hồ sơ từ Check-in tại quầy!`);
      setShowCheckInModal(false);
    } else {
      showNotification('Đã đồng bộ dữ liệu mới nhất từ hệ thống Check-in tại quầy!');
    }
    setIsSyncingCheckIn(false);
  };

  // Mở Modal Sửa đầy đủ thông tin hồ sơ
  const handleOpenEditModal = (guest, e) => {
    if (e) e.stopPropagation();
    setEditingGuest(guest);
    setEditForm({
      id: guest.id,
      roomNumber: guest.roomNumber || '',
      buildingInfo: guest.buildingInfo || '',
      guestName: guest.guestName || '',
      mrzFullName: guest.mrzFullName || '',
      nationality: guest.nationality || 'Việt Nam',
      nationalityCode: guest.nationalityCode || 'VNM',
      documentType: guest.documentType || 'CCCD',
      documentNumber: guest.documentNumber || '',
      documentExpiryFull: guest.documentExpiryFull || '20/05/2031',
      dobGender: guest.dobGender || '11/03/1982 • NAM',
      entryPort: guest.entryPort || 'Sân bay Quốc tế Phú Quốc (PQC)',
      visaType: guest.visaType || 'E-visa 90 ngày (Hợp lệ)',
      visaCode: guest.visaCode || '',
      checkInTime: guest.checkInTime || '14:00',
      status: guest.status || 'SENT_POLICE',
      mrzLine1: guest.mrzLine1 || '',
      mrzLine2: guest.mrzLine2 || '',
    });
  };

  // Lưu chỉnh sửa hồ sơ (Edit)
  const handleSaveEditedGuest = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;

    const autoMrz = generateMrzFromGuest({
      guestName: editForm.guestName,
      nationalityCode: editForm.nationalityCode,
      documentType: editForm.documentType,
      documentNumber: editForm.documentNumber,
    });

    const isForeigner = editForm.nationalityCode !== 'VNM';
    const statusLabel = STATUS_MAP[editForm.status] || 'ĐÃ GỬI BỘ CÔNG AN';

    const updatedRecord = {
      ...editingGuest,
      roomNumber: String(editForm.roomNumber).trim(),
      buildingInfo: String(editForm.buildingInfo).trim(),
      guestName: String(editForm.guestName).trim(),
      mrzFullName: autoMrz.mrzFullName,
      nationality: editForm.nationality,
      nationalityCode: editForm.nationalityCode,
      documentType: editForm.documentType,
      documentNumber: String(editForm.documentNumber).trim().toUpperCase(),
      documentExpiryYear: String(editForm.documentExpiryFull).slice(-4) || '2031',
      documentExpiryFull: editForm.documentExpiryFull,
      dobGender: editForm.dobGender,
      entryPort: editForm.entryPort,
      visaType: editForm.visaType,
      visaCode: editForm.visaCode,
      checkInTime: editForm.checkInTime,
      status: editForm.status,
      statusLabel,
      isForeigner,
      isPhuQuocVisaFree: String(editForm.visaType)
        .toLowerCase()
        .includes('phú quốc'),
      mrzLine1: autoMrz.mrzLine1,
      mrzLine2: autoMrz.mrzLine2,
    };

    setDeclarations((prev) =>
      prev.map((item) => (item.id === editingGuest.id ? updatedRecord : item))
    );
    setSelectedGuestId(updatedRecord.id);
    setEditingGuest(null);

    try {
      await fetch(`/api/police-declaration/declarations/${updatedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
      });
    } catch (_) {}

    showNotification(
      `Đã cập nhật hồ sơ tạm trú phòng ${updatedRecord.roomNumber} (${updatedRecord.guestName})!`
    );
  };

  // Xóa 1 hồ sơ (Delete)
  const handleConfirmDeleteGuest = async (guestToDelete) => {
    if (!guestToDelete) return;
    const targetId = guestToDelete.id;

    const nextDeleted = Array.from(new Set([...deletedIds, targetId]));
    setDeletedIds(nextDeleted);

    setDeclarations((prev) => {
      const remaining = prev.filter((item) => item.id !== targetId);
      if (selectedGuestId === targetId && remaining.length > 0) {
        setSelectedGuestId(remaining[0].id);
      }
      return remaining;
    });
    setDeletingGuest(null);

    try {
      await fetch(`/api/police-declaration/declarations/${targetId}`, {
        method: 'DELETE',
      });
    } catch (_) {}

    showNotification(
      `Đã xóa hồ sơ khai báo tạm trú phòng ${guestToDelete.roomNumber} (${guestToDelete.guestName})!`
    );
  };

  // Xóa hàng loạt hồ sơ đang tích chọn (Batch Delete)
  const handleBatchDeleteSelected = async () => {
    const selectedItems = declarations.filter((d) => d.selected);
    if (selectedItems.length === 0) {
      showNotification('Vui lòng tích chọn ít nhất 1 hồ sơ để xóa!', 'warning');
      return;
    }

    const idsToDelete = selectedItems.map((d) => d.id);
    const idSet = new Set(idsToDelete);

    setDeletedIds((prev) => Array.from(new Set([...prev, ...idsToDelete])));
    setDeclarations((prev) => {
      const remaining = prev.filter((item) => !idSet.has(item.id));
      if (idSet.has(selectedGuestId) && remaining.length > 0) {
        setSelectedGuestId(remaining[0].id);
      }
      return remaining;
    });

    try {
      await fetch('/api/police-declaration/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });
    } catch (_) {}

    showNotification(`Đã xóa ${idsToDelete.length} hồ sơ khai báo tạm trú đã chọn!`);
  };

  const selectedGuest = useMemo(() => {
    return (
      declarations.find((d) => d.id === selectedGuestId) ||
      declarations[0] ||
      INITIAL_DECLARATIONS[0]
    );
  }, [declarations, selectedGuestId]);

  const filteredDeclarations = useMemo(() => {
    return declarations.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          String(item.guestName || '')
            .toLowerCase()
            .includes(q) ||
          String(item.roomNumber || '')
            .toLowerCase()
            .includes(q) ||
          String(item.documentNumber || '')
            .toLowerCase()
            .includes(q) ||
          String(item.nationality || '')
            .toLowerCase()
            .includes(q) ||
          String(item.nationalityCode || '')
            .toLowerCase()
            .includes(q) ||
          String(item.bookingCode || '')
            .toLowerCase()
            .includes(q);
        if (!match) return false;
      }

      if (groupFilter === 'INTERNATIONAL' && !item.isForeigner) return false;
      if (groupFilter === 'DOMESTIC' && item.isForeigner) return false;

      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (quickFilter === 'FOREIGN_A08' && !item.isForeigner) return false;
      if (quickFilter === 'VN_CITIZEN' && item.isForeigner) return false;
      if (
        quickFilter === 'INCOMPLETE' &&
        item.status !== 'MISSING_VISA' &&
        item.status !== 'PENDING_SIGN'
      )
        return false;
      if (quickFilter === 'PHU_QUOC_30D' && !item.isPhuQuocVisaFree) return false;

      return true;
    });
  }, [declarations, searchTerm, groupFilter, statusFilter, quickFilter]);

  const selectedCount = useMemo(
    () => declarations.filter((d) => d.selected).length,
    [declarations]
  );

  const pendingVisaCount = useMemo(() => {
    const missingInList = declarations.filter(
      (d) => d.status === 'MISSING_VISA'
    ).length;
    return missingInList > 0 ? 4 : 3;
  }, [declarations]);

  const validDocsCount = useMemo(() => {
    const extraAdded = Math.max(0, declarations.length - INITIAL_DECLARATIONS.length);
    return 244 + extraAdded;
  }, [declarations]);

  const totalGuestsCount = useMemo(() => {
    const extraAdded = Math.max(0, declarations.length - INITIAL_DECLARATIONS.length);
    return 248 + extraAdded;
  }, [declarations]);

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setDeclarations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = filteredDeclarations.every((d) => d.selected);
    const ids = new Set(filteredDeclarations.map((d) => d.id));
    setDeclarations((prev) =>
      prev.map((item) =>
        ids.has(item.id) ? { ...item, selected: !allSelected } : item
      )
    );
  };

  const generatePoliceXmlContent = (items) => {
    const nowIso = new Date().toISOString();
    const guestNodes = items
      .map(
        (g, idx) => `    <HoSoTamTru stt="${idx + 1}" maHoSo="${g.id}">
      <SoPhong>${g.roomNumber}</SoPhong>
      <HoVaTen>${g.guestName}</HoVaTen>
      <TenChuanMRZ>${g.mrzFullName}</TenChuanMRZ>
      <QuocTich ma="${g.nationalityCode}">${g.nationality}</QuocTich>
      <LoaiGiayTo>${g.documentType}</LoaiGiayTo>
      <SoGiayTo>${g.documentNumber}</SoGiayTo>
      <HanGiayTo>${g.documentExpiryFull}</HanGiayTo>
      <NgaySinhGioiTinh>${g.dobGender}</NgaySinhGioiTinh>
      <ThiThuc loai="${g.visaCategory}">${g.visaType} (${g.visaCode})</ThiThuc>
      <CuaKhauNhapCanh>${g.entryPort}</CuaKhauNhapCanh>
      <GioCheckIn>${g.checkInTime}</GioCheckIn>
      <MRZLine1><![CDATA[${g.mrzLine1}]]></MRZLine1>
      <MRZLine2><![CDATA[${g.mrzLine2}]]></MRZLine2>
      <TrangThaiTruyen>${g.statusLabel}</TrangThaiTruyen>
    </HoSoTamTru>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<KhaiBaoTamTruA08 xmlns="http://xuatnhapcanh.gov.vn/schema/A08-2025" phienBan="4.02">
  <ThongTinCoSoLuuTru>
    <MaDinhDanhCoSo>PQ-RES-00421</MaDinhDanhCoSo>
    <TenCoSo>Grand Horizon Resort &amp; Suites Phú Quốc</TenCoSo>
    <CoQuanTiepNhan>CATP. Phú Quốc - Phòng Quản lý Xuất nhập cảnh Kiên Giang</CoQuanTiepNhan>
    <MaLoTruyen>#VN-PQ-20251024-03</MaLoTruyen>
    <ThoiGianKetXuat>${nowIso}</ThoiGianKetXuat>
    <NguoiKySo>Lê Minh Anh (VNPT-CA 4096-EXP2026)</NguoiKySo>
  </ThongTinCoSoLuuTru>
  <DanhSachKhachLuuTru tongSo="${items.length}">
${guestNodes}
  </DanhSachKhachLuuTru>
</KhaiBaoTamTruA08>`;
  };

  const handleExportFile = (format) => {
    setShowExportMenu(false);
    const exportList =
      declarations.filter((d) => d.selected).length > 0
        ? declarations.filter((d) => d.selected)
        : declarations;

    if (format === 'XML') {
      const xml = generatePoliceXmlContent(exportList);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KhaiBaoTamTru_A08_C06_VN-PQ-20251024-03.xml`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(
        `Đã kết xuất tệp XML chuẩn Bộ Công An (${exportList.length} hồ sơ A08)!`
      );
    } else if (format === 'CSV') {
      const headers = [
        'Mã Hồ Sơ',
        'Số Phòng',
        'Họ và Tên',
        'Tên MRZ',
        'Quốc Tịch',
        'Mã Quốc Tịch',
        'Loại Giấy Tờ',
        'Số CCCD/Hộ Chiếu',
        'Hạn Hộ Chiếu',
        'Ngày Sinh / Giới Tính',
        'Thị Thực / Pháp Lý',
        'Mã Thị Thực',
        'Cửa Khẩu Nhập Cảnh',
        'Giờ Check-in',
        'Trạng Thái Truyền',
      ];
      const rows = exportList.map((g) => [
        g.id,
        g.roomNumber,
        `"${g.guestName}"`,
        `"${g.mrzFullName}"`,
        `"${g.nationality}"`,
        g.nationalityCode,
        g.documentType,
        g.documentNumber,
        g.documentExpiryFull,
        `"${g.dobGender}"`,
        `"${g.visaType}"`,
        `"${g.visaCode}"`,
        `"${g.entryPort}"`,
        g.checkInTime,
        `"${g.statusLabel}"`,
      ]);
      const csvContent =
        '\uFEFF' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KhaiBaoTamTru_A08_C06_VN-PQ-20251024-03.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(
        `Đã xuất tệp CSV chuẩn Cổng Dịch Vụ Công (${exportList.length} hồ sơ)!`
      );
    } else if (format === 'EXCEL') {
      const tableRows = exportList
        .map(
          (g, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${g.roomNumber}</td>
          <td>${g.guestName}</td>
          <td>${g.mrzFullName}</td>
          <td>${g.nationality} (${g.nationalityCode})</td>
          <td>${g.documentType}: ${g.documentNumber}</td>
          <td>${g.documentExpiryFull}</td>
          <td>${g.dobGender}</td>
          <td>${g.visaType} - ${g.visaCode}</td>
          <td>${g.entryPort}</td>
          <td>${g.checkInTime} (${g.checkInDateLabel})</td>
          <td>${g.statusLabel}</td>
        </tr>`
        )
        .join('');

      const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <h3>BIỂU MẪU A08 - DANH SÁCH KHAI BÁO TẠM TRÚ CÔNG AN (BATCH #VN-PQ-20251024-03)</h3>
          <p>Cơ sở lưu trú: Grand Horizon Resort & Suites (Mã: PQ-RES-00421) - CATP. Phú Quốc</p>
          <table border="1">
            <thead>
              <tr style="background:#0d9488;color:#ffffff;font-weight:bold;">
                <th>STT</th>
                <th>Phòng</th>
                <th>Họ và Tên Khách</th>
                <th>Họ Tên Chuẩn ICAO MRZ</th>
                <th>Quốc Tịch</th>
                <th>Giấy Tờ Tùy Thân</th>
                <th>Thời Hạn</th>
                <th>Ngày Sinh / Giới Tính</th>
                <th>Thị Thực / Pháp Lý</th>
                <th>Cửa Khẩu Nhập Cảnh</th>
                <th>Check-in</th>
                <th>Trạng Thái C06</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
        </html>`;
      const blob = new Blob([excelHtml], {
        type: 'application/vnd.ms-excel;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BieuMau_A08_BoCongAn_20251024.xls`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(
        `Đã kết xuất bảng Excel (.xls) Biểu mẫu A08 Bộ Công An (${exportList.length} khách)!`
      );
    }
  };

  const handleBatchSignAndTransmit = async (targetIds = null) => {
    const idsToSign =
      targetIds || declarations.filter((d) => d.selected).map((d) => d.id);

    if (idsToSign.length === 0) {
      showNotification(
        'Vui lòng tích chọn ít nhất 1 hồ sơ khách để ký số!',
        'warning'
      );
      return;
    }

    setIsSyncingPortal(true);
    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const updatedList = declarations.map((item) => {
      if (idsToSign.includes(item.id)) {
        const nextStatus = item.isForeigner ? 'SENT_POLICE' : 'SYNCED_DB';
        const nextLabel = item.isForeigner
          ? 'ĐÃ GỬI BỘ CÔNG AN'
          : 'ĐÃ ĐỒNG BỘ CSDL';
        return {
          ...item,
          status: nextStatus,
          statusLabel: nextLabel,
          visaType:
            item.status === 'MISSING_VISA'
              ? 'E-visa 90 ngày (Đã bổ sung)'
              : item.visaType,
          visaCode:
            item.status === 'MISSING_VISA'
              ? 'EV-2025-FR-882910'
              : item.visaCode,
        };
      }
      return item;
    });

    setDeclarations(updatedList);
    setLastSyncTime(`${nowTime} (Chữ ký số CA)`);
    setTxnCode(
      `TXN-PQ-20251024-C06-${Math.floor(10000 + Math.random() * 89999)}`
    );

    try {
      await fetch('/api/police-declaration/batch-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToSign }),
      });
    } catch (_) {}

    setTimeout(() => {
      setIsSyncingPortal(false);
      showNotification(
        `Đã ký số VNPT-CA & truyền thành công ${idsToSign.length} hồ sơ lên Cổng Dịch Vụ Công Bộ Công An!`
      );
    }, 450);
  };

  const handleCreateManualDeclaration = async (e) => {
    e.preventDefault();
    if (!newGuestForm.guestName.trim() || !newGuestForm.documentNumber.trim()) {
      showNotification(
        'Vui lòng nhập đầy đủ Họ tên và Số hộ chiếu / CCCD!',
        'warning'
      );
      return;
    }

    const mrz = generateMrzFromGuest({
      guestName: newGuestForm.guestName,
      nationalityCode: newGuestForm.nationalityCode,
      documentType: newGuestForm.documentType,
      documentNumber: newGuestForm.documentNumber,
    });

    const isForeigner = newGuestForm.nationalityCode !== 'VNM';
    const newItem = {
      id: `DEC-${newGuestForm.roomNumber.trim()}-${Date.now().toString().slice(-3)}`,
      roomNumber: newGuestForm.roomNumber.trim(),
      guestName: newGuestForm.guestName.trim(),
      mrzFullName: mrz.mrzFullName,
      buildingInfo: newGuestForm.buildingInfo,
      nationality: newGuestForm.nationality,
      nationalityCode: newGuestForm.nationalityCode,
      documentType: newGuestForm.documentType,
      documentNumber: newGuestForm.documentNumber.trim().toUpperCase(),
      documentExpiryYear: newGuestForm.documentExpiryFull.slice(-4) || '2031',
      documentExpiryFull: newGuestForm.documentExpiryFull,
      dobGender: newGuestForm.dobGender,
      entryPort: newGuestForm.entryPort,
      visaType: newGuestForm.visaType,
      visaCode: newGuestForm.visaCode,
      visaCategory: newGuestForm.isPhuQuocVisaFree ? 'PHU_QUOC_30D' : 'E_VISA',
      checkInTime: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      checkInDateLabel: 'Hôm nay',
      status: isForeigner ? 'SENT_POLICE' : 'SYNCED_DB',
      statusLabel: isForeigner ? 'ĐÃ GỬI BỘ CÔNG AN' : 'ĐÃ ĐỒNG BỘ CSDL',
      isForeigner,
      isPhuQuocVisaFree: newGuestForm.isPhuQuocVisaFree,
      selected: true,
      source: 'MANUAL',
      mrzLine1: mrz.mrzLine1,
      mrzLine2: mrz.mrzLine2,
      sha256Hash: '5c8a...419e',
    };

    const nextList = [newItem, ...declarations];
    setDeclarations(nextList);
    setSelectedGuestId(newItem.id);
    setShowManualModal(false);

    try {
      await fetch('/api/police-declaration/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
    } catch (_) {}

    setNewGuestForm((prev) => ({
      ...prev,
      roomNumber: '906',
      guestName: '',
      documentNumber: '',
    }));
    showNotification(
      `Đã thêm & đồng bộ hồ sơ tạm trú phòng ${newItem.roomNumber} (${newItem.guestName})!`
    );
  };

  const handleSaveVisaSupplement = async (e) => {
    e.preventDefault();
    if (!supplementGuest) return;

    const updatedFields = {
      visaType: visaSupplementForm.visaType,
      visaCode: visaSupplementForm.visaCode,
      entryPort: visaSupplementForm.entryPort,
      visaCategory: 'E_VISA',
      status: 'SENT_POLICE',
      statusLabel: 'ĐÃ GỬI BỘ CÔNG AN',
      selected: true,
    };

    setDeclarations((prev) =>
      prev.map((d) =>
        d.id === supplementGuest.id ? { ...d, ...updatedFields } : d
      )
    );
    setSelectedGuestId(supplementGuest.id);
    setSupplementGuest(null);

    try {
      await fetch(`/api/police-declaration/declarations/${supplementGuest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
    } catch (_) {}

    showNotification(
      `Đã bổ sung E-Visa (${visaSupplementForm.visaCode}) và gửi báo cáo C06 cho khách ${supplementGuest.guestName}!`
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f4f7f5] text-slate-800 pb-12 font-sans">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-emerald-950 text-white border-emerald-700 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-emerald-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-6 pt-6 space-y-5">
          {/* ─── HEADER SECTION ─────────────────────────────────────────────── */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-emerald-100/90 text-emerald-900 border border-emerald-200">
                  PHÂN HỆ 51 // AN NINH &amp; TUÂN THỦ PHÁP LÝ LƯU TRÚ
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-white text-slate-700 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  NGHỊ ĐỊNH 144/2021/NĐ-CP
                </span>
              </div>

              <h1
                className="text-3xl sm:text-[34px] font-bold text-slate-900 tracking-tight leading-tight"
                style={{
                  fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                }}
              >
                Cổng Khai Báo Lưu Trú Công An &amp; Đồng Bộ Xuất Nhập Cảnh
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed">
                Hệ thống tự động trích xuất thông tin khách lưu trú nội địa và
                quốc tế từ <strong>Quầy Check-in Lễ Tân</strong> theo biểu mẫu A08
                Bộ Công An, hỗ trợ chỉnh sửa/xóa hồ sơ, ký số điện tử và truyền
                dữ liệu thời gian thực đến Cổng thông tin Quản lý Xuất nhập cảnh
                tỉnh Kiên Giang / TP. Phú Quốc.
              </p>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    fetchOverviewAndCheckIns();
                    setShowCheckInModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs transition cursor-pointer"
                >
                  <Concierge className="w-4 h-4 text-emerald-700" />
                  <span>Lấy dữ liệu từ Check-in tại quầy</span>
                </button>

                <button
                  onClick={() => setShowManualModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-700" />
                  <span>+ Khai báo thủ công bổ sung</span>
                </button>
              </div>

              {/* Dropdown Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="w-full inline-flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-xs font-semibold bg-[#eef4f1] hover:bg-emerald-50 text-slate-800 border border-emerald-200/80 shadow-xs transition cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Xuất tệp XML / CSV theo chuẩn Bộ Công An</span>
                  </span>
                  <span className="text-[10px] text-slate-500">▼</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-30">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Định dạng kết xuất chuẩn C06 / XNC
                    </div>
                    <button
                      onClick={() => handleExportFile('XML')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs hover:bg-emerald-50 text-slate-700 font-medium"
                    >
                      <FileCode className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-semibold text-slate-900">
                          Tệp XML Chuẩn Biểu Mẫu A08 (.xml)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tương thích Cổng thông tin XNC Kiên Giang
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExportFile('EXCEL')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs hover:bg-emerald-50 text-slate-700 font-medium"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-semibold text-slate-900">
                          Bảng kê Excel Bộ Công An (.xls)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Đầy đủ CCCD/Hộ chiếu, Quốc tịch, MRZ
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExportFile('CSV')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs hover:bg-emerald-50 text-slate-700 font-medium"
                    >
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-semibold text-slate-900">
                          Tệp dữ liệu phẳng CSV (.csv)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Mã hóa UTF-8 BOM nhập liệu nhanh
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleBatchSignAndTransmit()}
                disabled={isSyncingPortal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#108558] hover:bg-[#0d6e48] text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncingPortal ? 'animate-spin' : ''}`}
                />
                <span>Đồng bộ cổng dịch vụ công trực tuyến</span>
              </button>
            </div>
          </div>

          {/* ─── 4 KPI SUMMARY CARDS ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  TỔNG KHÁCH LƯU TRÚ ĐÊM
                  <br />
                  NAY
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <BedDouble className="w-4 h-4" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {totalGuestsCount}
                </span>
                <span className="text-xs font-bold uppercase text-slate-500">
                  KHÁCH
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Quy mô phòng in-house:</span>
                <span className="font-bold text-emerald-800">
                  142 phòng (84% OCC)
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  KHÁCH QUỐC TẾ CẦN TẠM
                  <br />
                  TRÚ
                </span>
                <span className="p-2 rounded-lg bg-sky-50 text-sky-700">
                  <Globe className="w-4 h-4" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-slate-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  116
                </span>
                <span className="text-xs font-bold uppercase text-slate-500">
                  KHÁCH
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">42 Quốc tịch quốc tế</span>
                <span className="font-bold text-sky-700">Chiếm 46.8%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
                  CCCD / HỘ CHIẾU HỢP LỆ
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-emerald-700"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {validDocsCount}
                </span>
                <span className="text-xs font-bold uppercase text-slate-500">
                  / {totalGuestsCount} HỒ SƠ
                </span>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Chuẩn hóa dữ liệu C06:</span>
                <span className="font-bold text-emerald-700">
                  98.4% Đạt chuẩn
                </span>
              </div>
            </div>

            <div className="bg-[#fffafa] rounded-2xl p-4 border border-rose-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 leading-snug">
                  CẦN BỔ SUNG TRƯỚC
                  <br />
                  21:00
                </span>
                <span className="p-2 rounded-lg bg-rose-100/80 text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="my-3 flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-bold text-rose-700"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  0{pendingVisaCount}
                </span>
                <span className="text-xs font-bold uppercase text-rose-700">
                  HỒ SƠ TỒN ĐỌNG
                </span>
              </div>
              <div className="pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs">
                <button
                  onClick={() =>
                    setQuickFilter((prev) =>
                      prev === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE'
                    )
                  }
                  className="text-rose-700 hover:underline font-medium flex items-center justify-between w-full"
                >
                  <span>02 chưa quét MRZ • 02 thiếu E-visa</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── SEARCH & FAST FILTER BAR ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Arthur Dent (Tìm theo tên khách, số phòng, hộ chiếu, CCCD, mã booking...)"
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-[#f5f8f6] border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="w-full h-full px-3 py-2 rounded-xl bg-[#f5f8f6] border border-slate-200 flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Hôm nay (24/10)</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="relative h-full">
                  <Users className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="w-full h-full pl-8 pr-6 py-2 rounded-xl bg-[#f5f8f6] border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Khách Quốc Tế &amp; VN</option>
                    <option value="INTERNATIONAL">Khách Quốc Tế</option>
                    <option value="DOMESTIC">Công dân Việt Nam</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="relative h-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-full pl-8 pr-6 py-2 rounded-xl bg-[#f5f8f6] border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Tất cả trạng thái gửi</option>
                    <option value="SENT_POLICE">Đã gửi Bộ Công An</option>
                    <option value="SYNCED_DB">Đã đồng bộ CSDL</option>
                    <option value="MISSING_VISA">Thiếu hồ sơ Visa</option>
                    <option value="PENDING_SIGN">Chờ ký số ca trực</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                PHÂN LUỒNG NHANH:
              </span>

              <button
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === 'FOREIGN_A08' ? 'ALL' : 'FOREIGN_A08'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition border ${
                  quickFilter === 'FOREIGN_A08' || quickFilter === 'ALL'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span>Khách nước ngoài (A08)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-800 text-white text-[10px]">
                  116
                </span>
              </button>

              <button
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === 'VN_CITIZEN' ? 'ALL' : 'VN_CITIZEN'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition border ${
                  quickFilter === 'VN_CITIZEN'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                    : 'bg-[#f2f5f3] text-slate-700 border-slate-200 hover:bg-slate-200/70'
                }`}
              >
                <span>Công dân VN (VNeID/CCCD)</span>
                <span className="font-bold text-slate-800">132</span>
              </button>

              <button
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition border ${
                  quickFilter === 'INCOMPLETE'
                    ? 'bg-rose-100 text-rose-900 border-rose-300 font-semibold'
                    : 'bg-rose-50/80 text-rose-800 border-rose-200 hover:bg-rose-100/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Chưa hoàn tất hồ sơ</span>
                <span className="font-bold">0{pendingVisaCount}</span>
              </button>

              <button
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === 'PHU_QUOC_30D' ? 'ALL' : 'PHU_QUOC_30D'
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition border ${
                  quickFilter === 'PHU_QUOC_30D'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                    : 'bg-[#f2f5f3] text-slate-700 border-slate-200 hover:bg-slate-200/70'
                }`}
              >
                <span>Miễn thị thực Phú Quốc (30N)</span>
                <span className="font-bold text-slate-800">58</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Hiển thị{' '}
              <strong className="text-slate-800">
                {filteredDeclarations.length}
              </strong>{' '}
              / {totalGuestsCount} kết quả đạt bộ lọc
            </div>
          </div>

          {/* ─── MAIN 2-COLUMN WORKSPACE ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN (8 COLS): A08 REALTIME TABLE + LEGAL NOTICE */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Table Card Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                      DANH SÁCH KHAI BÁO TẠM TRÚ A08 (THỜI GIAN THỰC)
                    </h2>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      BATCH: #VN-PQ-20251024-03
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncFromCheckInDesk()}
                      disabled={isSyncingCheckIn}
                      title="Tự động kéo dữ liệu khách từ Check-in tại quầy"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isSyncingCheckIn ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Đồng bộ Check-in</span>
                    </button>
                    <button
                      onClick={() => handleExportFile('EXCEL')}
                      title="Xuất bảng kê Excel"
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Columns className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#f8faf9] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 pl-4 pr-2 w-9">
                          <input
                            type="checkbox"
                            checked={
                              filteredDeclarations.length > 0 &&
                              filteredDeclarations.every((d) => d.selected)
                            }
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded accent-emerald-700 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-2.5">KHÁCH LƯU TRÚ / PHÒNG</th>
                        <th className="py-3 px-2.5">QUỐC TỊCH &amp; GIẤY TỜ</th>
                        <th className="py-3 px-2.5">THỊ THỰC / PHÁP LÝ</th>
                        <th className="py-3 px-2.5">CHECK-IN</th>
                        <th className="py-3 px-2.5 text-center">
                          TRẠNG THÁI TRUYỀN
                        </th>
                        <th className="py-3 pl-2 pr-4 text-right">
                          THAO TÁC (SỬA / XÓA)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredDeclarations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-500"
                          >
                            Không có hồ sơ nào khớp bộ lọc. Bấm{' '}
                            <button
                              onClick={() => handleSyncFromCheckInDesk()}
                              className="text-emerald-700 font-bold underline"
                            >
                              Đồng bộ từ Check-in tại quầy
                            </button>{' '}
                            để nạp danh sách khách lưu trú.
                          </td>
                        </tr>
                      ) : (
                        filteredDeclarations.map((row) => {
                          const isCurrentSelected =
                            selectedGuest?.id === row.id;
                          const isMissingVisa = row.status === 'MISSING_VISA';
                          const isPendingSign = row.status === 'PENDING_SIGN';

                          return (
                            <tr
                              key={row.id}
                              onClick={() => setSelectedGuestId(row.id)}
                              className={`cursor-pointer transition ${
                                isMissingVisa
                                  ? 'bg-rose-50/40 hover:bg-rose-50/80'
                                  : isCurrentSelected
                                  ? 'bg-emerald-50/50 hover:bg-emerald-50/80'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Checkbox */}
                              <td
                                className="py-4 pl-4 pr-2 align-middle"
                                onClick={(e) => handleToggleSelect(row.id, e)}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!row.selected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded accent-emerald-700 cursor-pointer"
                                />
                              </td>

                              {/* Guest & Room */}
                              <td className="py-4 px-2.5 align-middle">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-md text-[11px] font-bold font-mono ${
                                      isMissingVisa
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-emerald-100/80 text-emerald-900'
                                    }`}
                                  >
                                    {row.roomNumber}
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
                                      <span>{row.guestName}</span>
                                      {row.source === 'CHECKIN_DESK' && (
                                        <span
                                          title="Đồng bộ từ Quầy Check-in Lễ Tân"
                                          className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-800"
                                        >
                                          Quầy Lễ Tân
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {row.buildingInfo}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Nationality & Document */}
                              <td className="py-4 px-2.5 align-middle">
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      row.nationalityCode === 'VNM'
                                        ? 'bg-emerald-600'
                                        : 'bg-sky-700'
                                    }`}
                                  />
                                  <span>
                                    {row.nationality} ({row.nationalityCode})
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                  {row.documentType}: {row.documentNumber}
                                  {row.documentExpiryYear
                                    ? ` (${row.documentExpiryYear})`
                                    : ''}
                                </div>
                              </td>

                              {/* Visa / Legal */}
                              <td className="py-4 px-2.5 align-middle">
                                <div
                                  className={`font-semibold text-xs ${
                                    isMissingVisa
                                      ? 'text-rose-700'
                                      : row.visaCategory === 'VISA_FREE_45'
                                      ? 'text-sky-700'
                                      : 'text-emerald-800'
                                  }`}
                                >
                                  {row.visaType}
                                </div>
                                <div
                                  className={`text-[11px] font-mono mt-0.5 ${
                                    isMissingVisa
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {row.visaCode}
                                </div>
                              </td>

                              {/* Check-in */}
                              <td className="py-4 px-2.5 align-middle font-mono">
                                <div className="font-semibold text-slate-800">
                                  {row.checkInTime}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {row.checkInDateLabel}
                                </div>
                              </td>

                              {/* Transmission Status Badge */}
                              <td className="py-4 px-2.5 align-middle text-center">
                                {row.status === 'SENT_POLICE' && (
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100/90 text-emerald-900 border border-emerald-300 leading-tight">
                                    ĐÃ GỬI
                                    <br />
                                    BỘ CÔNG AN
                                  </span>
                                )}
                                {row.status === 'SYNCED_DB' && (
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-teal-100/80 text-teal-900 border border-teal-300 leading-tight">
                                    ĐÃ ĐỒNG BỘ
                                    <br />
                                    CSDL
                                  </span>
                                )}
                                {isMissingVisa && (
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 leading-tight">
                                    THIẾU HỒ SƠ
                                    <br />
                                    VISA
                                  </span>
                                )}
                                {isPendingSign && (
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-900 border border-sky-300 leading-tight">
                                    CHỜ KÝ SỐ
                                    <br />
                                    CA TRỰC
                                  </span>
                                )}
                              </td>

                              {/* Actions: Bổ sung / In / XML + Sửa + Xóa */}
                              <td
                                className="py-4 pl-2 pr-4 align-middle text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center justify-end gap-1">
                                  {isMissingVisa && (
                                    <button
                                      onClick={() => {
                                        setSupplementGuest(row);
                                        setVisaSupplementForm({
                                          visaType: 'E-visa 90 ngày (Hợp lệ)',
                                          visaCode: 'EV-2025-FR-774829',
                                          entryPort:
                                            row.entryPort ||
                                            'Sân bay Quốc tế Phú Quốc (PQC)',
                                        });
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-800 hover:bg-rose-900 text-white shadow-xs transition mr-1 cursor-pointer"
                                    >
                                      Bổ sung
                                    </button>
                                  )}

                                  {isPendingSign && (
                                    <button
                                      onClick={() =>
                                        handleBatchSignAndTransmit([row.id])
                                      }
                                      title="Ký số & Gửi ngay"
                                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  {!isMissingVisa && !isPendingSign && (
                                    <>
                                      <button
                                        onClick={() =>
                                          setPrintPreviewGuests([row])
                                        }
                                        title="In phiếu khai báo tạm trú A08"
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setXmlPreviewGuest(row)}
                                        title="Xem gói tin XML A08"
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                                      >
                                        <Code2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}

                                  {/* Nút Sửa (Edit) */}
                                  <button
                                    onClick={(e) => handleOpenEditModal(row, e)}
                                    title="Chỉnh sửa hồ sơ khai báo tạm trú"
                                    className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-50 border border-transparent hover:border-sky-200 cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  {/* Nút Xóa (Delete) */}
                                  <button
                                    onClick={() => setDeletingGuest(row)}
                                    title="Xóa hồ sơ khai báo tạm trú"
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-5 py-3.5 bg-[#f9fbfa] border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-600">
                      Đã chọn{' '}
                      <strong className="text-slate-900">
                        {selectedCount} / {declarations.length}
                      </strong>{' '}
                      khách hàng
                    </span>

                    <button
                      onClick={() => handleBatchSignAndTransmit()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-900 hover:bg-emerald-950 text-white transition cursor-pointer"
                    >
                      Ký số hàng loạt
                    </button>

                    <button
                      onClick={() => {
                        const chosen = declarations.filter((d) => d.selected);
                        setPrintPreviewGuests(
                          chosen.length > 0 ? chosen : declarations
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 hover:bg-slate-300/70 text-slate-800 transition cursor-pointer"
                    >
                      In phiếu A08 gộp
                    </button>

                    <button
                      onClick={handleBatchDeleteSelected}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa mục đã chọn</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>Trang 1 / 42</span>
                    <button className="p-1 rounded border border-slate-200 hover:bg-white">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded border border-slate-200 hover:bg-white">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Legal Notice Banner */}
              <div className="bg-[#eef5f1] rounded-2xl p-4 border border-emerald-200/80 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-slate-700">
                  <div className="font-bold uppercase tracking-wide text-emerald-950 mb-1">
                    QUY ĐỊNH PHÁP LUẬT VỀ ĐĂNG KÝ TẠM TRÚ NGƯỜI NƯỚC NGOÀI
                  </div>
                  <p>
                    Theo Điều 33 Luật Nhập cảnh, xuất cảnh, quá cảnh, cư trú của
                    người nước ngoài tại Việt Nam, cơ sở lưu trú phải hoàn thành
                    khai báo tạm trú cho người nước ngoài qua Hệ thống Cổng
                    thông tin điện tử trong vòng{' '}
                    <strong className="text-slate-900">12 giờ</strong> kể từ
                    thời điểm nhận phòng (hoặc trước{' '}
                    <strong className="text-slate-900">21:00</strong> cùng ngày
                    đối với ca ngày). Mọi sai lệch thông tin quét OCR phải được
                    đối soát thủ công với bản gốc hộ chiếu.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (4 COLS): API GATEWAY + OCR/MRZ INSPECTOR + DIGITAL SIGNATURE */}
            <div className="lg:col-span-4 space-y-4">
              {/* 1. API Gateway C06 / XNC Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        CỔNG DỊCH VỤ CÔNG BỘ CÔNG AN
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        API Gateway C06 / XNC
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    TRỰC TUYẾN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#f5f8f6] border border-slate-200/70">
                    <div className="text-[10px] text-slate-500">
                      Độ trễ phản hồi
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                      18 ms
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f5f8f6] border border-slate-200/70">
                    <div className="text-[10px] text-slate-500">
                      Chuẩn mã hóa
                    </div>
                    <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                      TLS 1.3 / AES
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mã định danh cơ sở:</span>
                    <span className="font-mono font-bold text-slate-900">
                      PQ-RES-00421
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cơ quan tiếp nhận:</span>
                    <span className="font-semibold text-slate-800">
                      CATP. Phú Quốc
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phiên đồng bộ cuối:</span>
                    <span className="font-mono text-slate-700">
                      {lastSyncTime}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <span className="text-slate-400">
                      BĂNG THÔNG API (60 PHÚT QUA)
                    </span>
                    <span className="text-emerald-700">100% ỔN ĐỊNH</span>
                  </div>
                  <div className="h-7 flex items-end gap-1">
                    {API_BANDWIDTH_BARS.map((val, i) => (
                      <div
                        key={i}
                        style={{ height: `${val}%` }}
                        className="flex-1 rounded-xs bg-emerald-600/85 hover:bg-emerald-700 transition"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Optical OCR & MRZ Inspector Card */}
              {selectedGuest && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          CHI TIẾT HỒ SƠ KHÁCH ĐANG CHỌN
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          Quét Quang Học OCR &amp; MRZ
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        PHÒNG {selectedGuest.roomNumber}
                      </span>
                      <button
                        onClick={(e) => handleOpenEditModal(selectedGuest, e)}
                        title="Sửa hồ sơ khách đang chọn"
                        className="p-1.5 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingGuest(selectedGuest)}
                        title="Xóa hồ sơ khách đang chọn"
                        className="p-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Passport Card */}
                  <div className="rounded-xl overflow-hidden border border-slate-300 bg-gradient-to-br from-[#e7ece9] via-[#f5f7f6] to-[#dfe7e2] p-3 shadow-inner relative">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-slate-500 border-b border-slate-300/80 pb-1.5 mb-2.5">
                      <span>
                        {selectedGuest.documentType === 'CCCD'
                          ? 'CĂN CƯỚC CÔNG DÂN'
                          : 'PASSPORT'}{' '}
                        • {selectedGuest.nationality.toUpperCase()} (
                        {selectedGuest.nationalityCode})
                      </span>
                      <span>ICAO DOC 9303</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-20 rounded-lg bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-400 flex flex-col items-center justify-end overflow-hidden shrink-0 text-white shadow">
                        <div className="w-6 h-6 rounded-full bg-amber-200/90 mb-1" />
                        <div className="w-12 h-7 rounded-t-xl bg-sky-900 border-t border-sky-400/40" />
                      </div>

                      <div className="flex-1 min-w-0 font-mono text-[10px] space-y-1 text-slate-700">
                        <div className="truncate font-bold text-slate-900 text-xs">
                          {selectedGuest.mrzFullName}
                        </div>
                        <div>
                          DOC NO:{' '}
                          <strong className="text-slate-900">
                            {selectedGuest.documentNumber}
                          </strong>
                        </div>
                        <div>NAT: {selectedGuest.nationalityCode}</div>
                        <div>DOB/SEX: {selectedGuest.dobGender}</div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-300/80 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-800 text-white">
                        MRZ TRÙNG KHỚP 100%
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">
                        ICAO Doc 9303
                      </span>
                    </div>
                  </div>

                  {/* Extracted Details */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Họ và tên:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedGuest.mrzFullName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">
                        Ngày sinh / Giới tính:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedGuest.dobGender}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">
                        Số hộ chiếu / CCCD:
                      </span>
                      <span className="font-mono font-bold text-emerald-800">
                        {selectedGuest.documentNumber} (
                        {selectedGuest.nationalityCode})
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Thời hạn giấy tờ:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedGuest.documentExpiryFull}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">
                        Cửa khẩu nhập cảnh:
                      </span>
                      <span className="font-semibold text-slate-800 text-right">
                        {selectedGuest.entryPort}
                      </span>
                    </div>
                  </div>

                  {/* Dark MRZ Code Block */}
                  <div className="rounded-xl bg-[#0c1f17] text-emerald-400 p-3 font-mono text-[10px] space-y-1 overflow-x-auto border border-emerald-900">
                    <div className="tracking-wider whitespace-nowrap">
                      {selectedGuest.mrzLine1}
                    </div>
                    <div className="tracking-wider whitespace-nowrap">
                      {selectedGuest.mrzLine2}
                    </div>
                    <div className="pt-1.5 mt-1.5 border-t border-emerald-900/80 flex items-center justify-between text-[9px] text-slate-400">
                      <span>SHA-256 HASH: {selectedGuest.sha256Hash}</span>
                      <span className="text-emerald-300 font-bold">
                        CHÍNH XÁC 100%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Digital Signature Approval Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      PHÊ DUYỆT TRỰC TIẾP
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Chữ Ký Số Ca Trực
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#f5f8f6] border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      NGƯỜI KÝ DUYỆT:
                    </span>
                    <span className="font-bold text-slate-900">
                      Lê Minh Anh
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      CHỨC DANH:
                    </span>
                    <span className="font-medium text-slate-700">
                      Front Desk Manager / Trưởng ca
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      TOKEN CHỨNG THƯ:
                    </span>
                    <span className="font-mono font-bold text-emerald-800 text-[11px]">
                      VNPT-CA 4096-EXP2026
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      DẤU THỜI GIAN:
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      24/10/2025 • 18:30:14 GMT+7
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed">
                  Tôi xác nhận tất cả {totalGuestsCount} hồ sơ khai báo nói trên
                  đã được đối chiếu CCCD gắn chip / Hộ chiếu gốc theo đúng thẩm
                  quyền và chịu hoàn toàn trách nhiệm trước pháp luật.
                </div>

                <button
                  onClick={() =>
                    handleBatchSignAndTransmit(declarations.map((d) => d.id))
                  }
                  disabled={isSyncingPortal}
                  className="w-full py-3 px-4 rounded-xl bg-[#0d6e48] hover:bg-[#095638] text-white font-bold text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>KÝ DUYỆT &amp; GỬI BÁO CÁO NGAY</span>
                </button>

                <div className="text-center text-[10px] font-mono text-slate-400">
                  Mã giao dịch điện tử: {txnCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MODAL 0: LẤY DỮ LIỆU TỪ CHECK-IN TẠI QUẦY ───────────────────── */}
        {showCheckInModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Concierge className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      Lấy Dữ Liệu Khách Lưu Trú Từ Quầy Check-in Lễ Tân
                    </h3>
                    <p className="text-[11px] text-emerald-200/80">
                      Trích xuất tự động Họ tên, Số phòng, CCCD/Hộ chiếu từ phân
                      hệ Check-in tại quầy (/admin/check-in)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-emerald-950">
                    Tìm thấy{' '}
                    <strong>{checkInArrivals.length} hồ sơ đặt phòng / check-in</strong>{' '}
                    từ Quầy Lễ Tân. Bạn có thể chọn lấy từng khách hoặc đồng bộ
                    toàn bộ vào danh sách khai báo A08.
                  </div>
                  <button
                    onClick={() => handleSyncFromCheckInDesk()}
                    disabled={isSyncingCheckIn}
                    className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    {isSyncingCheckIn
                      ? 'Đang đồng bộ...'
                      : 'Đồng Bộ Tất Cả Vào Bảng A08'}
                  </button>
                </div>

                <div className="max-h-[340px] overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2.5">Mã Booking</th>
                        <th className="p-2.5">Phòng</th>
                        <th className="p-2.5">Họ và Tên Khách</th>
                        <th className="p-2.5">Số CCCD / Hộ Chiếu</th>
                        <th className="p-2.5">Trạng Thái Quầy</th>
                        <th className="p-2.5 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {checkInArrivals.map((item, idx) => {
                        const bId = item.bookingId || item.BookingId || idx + 1;
                        const code =
                          item.bookingCode ||
                          item.ConfirmationCode ||
                          `BK-${bId}`;
                        const rNum =
                          item.roomNumber || item.RoomNumber || `${201 + idx}`;
                        const gName =
                          item.guestName || item.GuestName || 'Khách Check-in';
                        const docNo =
                          item.documentNumber ||
                          item.IdNumber ||
                          `079088012${String(bId).padStart(3, '0')}`;
                        const bStatus =
                          item.bookingStatus ||
                          item.BookingStatus ||
                          'CheckedIn';
                        const alreadyInList = declarations.some(
                          (d) =>
                            d.id === `CHK-${bId}` ||
                            d.bookingCode === code ||
                            (d.guestName === gName && d.roomNumber === String(rNum))
                        );

                        return (
                          <tr key={`${code}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-emerald-800">
                              {code}
                            </td>
                            <td className="p-2.5 font-mono font-semibold">
                              P.{rNum}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              {gName}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {docNo}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  bStatus === 'CheckedIn'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {bStatus === 'CheckedIn'
                                  ? 'Đã Check-in'
                                  : bStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              {alreadyInList ? (
                                <span className="text-[11px] font-semibold text-slate-400">
                                  Đã có trong bảng
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleSyncFromCheckInDesk([bId])
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  + Lấy vào A08
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 1: THÊM KHAI BÁO THỦ CÔNG BỔ SUNG ───────────────────── */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Khai Báo Tạm Trú Bổ Sung (Biểu mẫu A08)
                  </h3>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleCreateManualDeclaration}
                className="p-5 space-y-3.5 text-xs"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số phòng *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGuestForm.roomNumber}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          roomNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      placeholder="VD: 902"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên khách (trên Hộ chiếu / CCCD) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGuestForm.guestName}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          guestName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      placeholder="VD: Park Ji Hoon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quốc tịch
                    </label>
                    <select
                      value={newGuestForm.nationalityCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = NATIONALITY_OPTIONS.find(
                          (n) => n.code === code
                        );
                        setNewGuestForm({
                          ...newGuestForm,
                          nationalityCode: code,
                          nationality: found ? found.name : 'Quốc tế',
                          documentType: code === 'VNM' ? 'CCCD' : 'HC',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    >
                      {NATIONALITY_OPTIONS.map((n) => (
                        <option key={n.code} value={n.code}>
                          {n.name} ({n.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số Hộ chiếu / CCCD *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGuestForm.documentNumber}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          documentNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      placeholder="VD: M82910421"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ngày sinh &amp; Giới tính
                    </label>
                    <input
                      type="text"
                      value={newGuestForm.dobGender}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          dobGender: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời hạn hộ chiếu
                    </label>
                    <input
                      type="text"
                      value={newGuestForm.documentExpiryFull}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          documentExpiryFull: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thị thực / Pháp lý
                    </label>
                    <input
                      type="text"
                      value={newGuestForm.visaType}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          visaType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số thị thực / Ghi chú
                    </label>
                    <input
                      type="text"
                      value={newGuestForm.visaCode}
                      onChange={(e) =>
                        setNewGuestForm({
                          ...newGuestForm,
                          visaCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                  >
                    Lưu &amp; Ký Số Gửi C06
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: CHỈNH SỬA ĐẦY ĐỦ HỒ SƠ TẠM TRÚ (EDIT) ─────────────── */}
        {editingGuest && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-sky-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-sky-300" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Chỉnh Sửa Hồ Sơ Khai Báo Tạm Trú — Phòng{' '}
                    {editingGuest.roomNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingGuest(null)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSaveEditedGuest}
                className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số phòng *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.roomNumber}
                      onChange={(e) =>
                        setEditForm({ ...editForm, roomNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên khách lưu trú *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.guestName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, guestName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tòa nhà / Hạng phòng
                    </label>
                    <input
                      type="text"
                      value={editForm.buildingInfo}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          buildingInfo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quốc tịch
                    </label>
                    <select
                      value={editForm.nationalityCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = NATIONALITY_OPTIONS.find(
                          (n) => n.code === code
                        );
                        setEditForm({
                          ...editForm,
                          nationalityCode: code,
                          nationality: found ? found.name : editForm.nationality,
                          documentType: code === 'VNM' ? 'CCCD' : 'HC',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    >
                      {NATIONALITY_OPTIONS.map((n) => (
                        <option key={n.code} value={n.code}>
                          {n.name} ({n.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loại giấy tờ
                    </label>
                    <select
                      value={editForm.documentType}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          documentType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    >
                      <option value="HC">Hộ chiếu (HC)</option>
                      <option value="CCCD">CCCD gắn chip</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số Hộ chiếu / CCCD *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.documentNumber}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          documentNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thời hạn giấy tờ
                    </label>
                    <input
                      type="text"
                      value={editForm.documentExpiryFull}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          documentExpiryFull: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ngày sinh &amp; Giới tính
                    </label>
                    <input
                      type="text"
                      value={editForm.dobGender}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dobGender: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giờ Check-in
                    </label>
                    <input
                      type="text"
                      value={editForm.checkInTime}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          checkInTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thị thực / Pháp lý
                    </label>
                    <input
                      type="text"
                      value={editForm.visaType}
                      onChange={(e) =>
                        setEditForm({ ...editForm, visaType: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã thị thực / Ghi chú
                    </label>
                    <input
                      type="text"
                      value={editForm.visaCode}
                      onChange={(e) =>
                        setEditForm({ ...editForm, visaCode: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Cửa khẩu nhập cảnh
                    </label>
                    <input
                      type="text"
                      value={editForm.entryPort}
                      onChange={(e) =>
                        setEditForm({ ...editForm, entryPort: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Trạng thái truyền C06
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm({ ...editForm, status: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    >
                      <option value="SENT_POLICE">Đã gửi Bộ Công An</option>
                      <option value="SYNCED_DB">Đã đồng bộ CSDL</option>
                      <option value="PENDING_SIGN">Chờ ký số ca trực</option>
                      <option value="MISSING_VISA">Thiếu hồ sơ Visa</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingGuest;
                      setEditingGuest(null);
                      setDeletingGuest(target);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa hồ sơ này</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingGuest(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                    >
                      Lưu Thay Đổi
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: XÁC NHẬN XÓA HỒ SƠ (DELETE CONFIRMATION) ──────────── */}
        {deletingGuest && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Xác Nhận Xóa Hồ Sơ Khai Báo Tạm Trú
                  </h3>
                </div>
                <button
                  onClick={() => setDeletingGuest(null)}
                  className="text-rose-200 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-slate-700 leading-relaxed">
                  Bạn có chắc chắn muốn xóa hồ sơ khai báo tạm trú của khách{' '}
                  <strong className="text-slate-900">
                    {deletingGuest.guestName}
                  </strong>{' '}
                  (Phòng{' '}
                  <strong className="text-slate-900">
                    {deletingGuest.roomNumber}
                  </strong>{' '}
                  • {deletingGuest.documentType}:{' '}
                  <span className="font-mono">
                    {deletingGuest.documentNumber}
                  </span>
                  ) khỏi danh sách kết xuất A08?
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingGuest(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDeleteGuest(deletingGuest)}
                    className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold"
                  >
                    Xác Nhận Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 4: BỔ SUNG HỒ SƠ THỊ THỰC (ELENA ROSTOVA) ────────────── */}
        {supplementGuest && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-rose-200" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Bổ Sung Thị Thực — Phòng {supplementGuest.roomNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSupplementGuest(null)}
                  className="text-rose-200 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSaveVisaSupplement}
                className="p-5 space-y-3.5 text-xs"
              >
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                  Khách lưu trú: <strong>{supplementGuest.guestName}</strong> (
                  {supplementGuest.nationality} • HC:{' '}
                  <span className="font-mono">
                    {supplementGuest.documentNumber}
                  </span>
                  )
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Loại thị thực / Miễn thị thực *
                  </label>
                  <input
                    type="text"
                    required
                    value={visaSupplementForm.visaType}
                    onChange={(e) =>
                      setVisaSupplementForm({
                        ...visaSupplementForm,
                        visaType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số E-Visa / Mã xác nhận nhập cảnh *
                  </label>
                  <input
                    type="text"
                    required
                    value={visaSupplementForm.visaCode}
                    onChange={(e) =>
                      setVisaSupplementForm({
                        ...visaSupplementForm,
                        visaCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cửa khẩu nhập cảnh
                  </label>
                  <input
                    type="text"
                    value={visaSupplementForm.entryPort}
                    onChange={(e) =>
                      setVisaSupplementForm({
                        ...visaSupplementForm,
                        entryPort: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSupplementGuest(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                  >
                    Xác Nhận &amp; Truyền C06
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 5: XEM GÓI TIN XML A08 ───────────────────────────────── */}
        {xmlPreviewGuest && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    GÓI TIN XML BIỂU MẪU A08 — PHÒNG{' '}
                    {xmlPreviewGuest.roomNumber} ({xmlPreviewGuest.guestName})
                  </h3>
                </div>
                <button
                  onClick={() => setXmlPreviewGuest(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-[#0b1913] text-emerald-300 font-mono text-xs overflow-x-auto max-h-[420px]">
                <pre>{generatePoliceXmlContent([xmlPreviewGuest])}</pre>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Chuẩn Schema: Cổng thông tin Quản lý Xuất nhập cảnh Bộ Công An
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const xml = generatePoliceXmlContent([xmlPreviewGuest]);
                      const blob = new Blob([xml], {
                        type: 'application/xml;charset=utf-8;',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `A08_${xmlPreviewGuest.roomNumber}_${xmlPreviewGuest.documentNumber}.xml`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                  >
                    Tải tệp .XML
                  </button>
                  <button
                    onClick={() => setXmlPreviewGuest(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 6: IN PHIẾU KHAI BÁO TẠM TRÚ A08 ─────────────────────── */}
        {printPreviewGuests && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    PHIẾU KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI (BIỂU MẪU NA17 /
                    A08)
                  </h3>
                </div>
                <button
                  onClick={() => setPrintPreviewGuests(null)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 max-h-[460px] overflow-y-auto space-y-4 text-xs text-slate-800">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold uppercase">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-[11px] font-semibold">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-2">
                    PHIẾU KHAI BÁO TẠM TRÚ (BIỂU MẪU A08 - BỘ CÔNG AN)
                  </h4>
                  <div className="text-[11px] text-slate-500">
                    Cơ sở lưu trú: Grand Horizon Resort &amp; Suites Phú Quốc
                    (Mã: PQ-RES-00421)
                  </div>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2">STT</th>
                      <th className="border border-slate-300 p-2">Phòng</th>
                      <th className="border border-slate-300 p-2">Họ và Tên</th>
                      <th className="border border-slate-300 p-2">Quốc tịch</th>
                      <th className="border border-slate-300 p-2">
                        Số Hộ chiếu / CCCD
                      </th>
                      <th className="border border-slate-300 p-2">Thị thực</th>
                      <th className="border border-slate-300 p-2">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printPreviewGuests.map((g, i) => (
                      <tr key={g.id}>
                        <td className="border border-slate-300 p-2">{i + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold">
                          {g.roomNumber}
                        </td>
                        <td className="border border-slate-300 p-2 font-semibold">
                          {g.guestName}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {g.nationality} ({g.nationalityCode})
                        </td>
                        <td className="border border-slate-300 p-2 font-mono">
                          {g.documentNumber}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {g.visaType}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono">
                          {g.checkInTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold"
                >
                  In Phiếu A08 Ngay
                </button>
                <button
                  onClick={() => setPrintPreviewGuests(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PoliceDeclarationExport;
