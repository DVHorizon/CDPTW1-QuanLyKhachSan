import React, { useState, useEffect, useMemo, useRef } from 'react';

import AdminLayout from '../components/layout/AdminLayout';
import {
  performSemanticSearch,
  generateRagAnswer,
  trackUserInteraction,
  getUserPreferences,
} from '../utils/semanticRagSearch';



// ─── Dữ Liệu Tùy Chọn Tiện Nghi (100% Tiếng Việt có dấu) ────────────────────



const AMENITY_OPTIONS = [
  { id: 'wifi', icon: 'wifi', label: 'Wi-Fi Tốc Độ Cao' },
  { id: 'balcony', icon: 'deck', label: 'Ban Công View Biển' },
  { id: 'bathtub', icon: 'bathtub', label: 'Bồn Tắm Nằm Thư Giãn' },
  { id: 'minibar', icon: 'local_bar', label: 'Quầy Bar Mini Cao Cấp' },
  { id: 'nespresso', icon: 'coffee', label: 'Máy Pha Cà Phê Nespresso' },
  { id: 'ada', icon: 'accessible', label: 'Phòng Tắm Hỗ Trợ ADA (Người Khuyết Tật)' },
  { id: 'pool', icon: 'pool', label: 'Hồ Bơi Vô Cực Riêng' },
  { id: 'butler', icon: 'room_service', label: 'Dịch Vụ Quản Gia 24/7' },
  { id: 'jacuzzi', icon: 'spa', label: 'Bồn Sục Jacuzzi / Spa' },
  { id: 'kitchen', icon: 'kitchen', label: 'Bếp Mini / Gian Bếp Nhỏ' },
  { id: 'safe', icon: 'lock', label: 'Két Sắt Điện Tử' },
  { id: 'tv', icon: 'tv', label: 'Smart TV 4K 65 Inch' },
  { id: 'ac', icon: 'ac_unit', label: 'Điều Hòa Không Khí Trung Tâm' },
  { id: 'workspace', icon: 'desk', label: 'Khu Vực Bàn Làm Việc' },
];

// ─── Tùy Chọn Loại Giường ───────────────────────────────────────────────────
const BEDDING_OPTIONS = [
  '1 Giường King (2m x 2m)',
  '1 Giường Queen (1.6m x 2m)',
  '2 Giường Đôi (Double)',
  '2 Giường Đơn (Twin)',
  '1 Giường King + Giường Sofa',
  '2 Giường King',
  'Linh Hoạt / Tùy Chỉnh Theo Yêu Cầu',
];

// ─── Tùy Chọn Hướng Nhìn (View) ─────────────────────────────────────────────
const VIEW_OPTIONS = [
  'Hướng Biển (Ocean View)',
  'Hướng Vườn (Garden View)',
  'Hướng Thành Phố (City View)',
  'Hướng Hồ Bơi (Pool View)',
  'Hướng Núi (Mountain View)',
  'Hai Mặt Thoáng (Dual Aspect)',
  'Ban Công Riêng Biệt (Private Deck)',
];

// ─── Dữ Liệu Khởi Tạo Mẫu (Tiếng Việt Đầy Đủ) ──────────────────────────────
const INITIAL_ROOM_TYPES = [
  {
    id: 1,
    code: 'STD-DBL',
    name: 'Phòng Tiêu Chuẩn 2 Giường Đôi - Hướng Phố',
    subtitle: 'Tầng 2–5 // Hướng Phía Bắc',
    status: 'active',
    floors: 'Tầng 2–5',
    maxAdults: 2,
    maxChildren: 1,
    area: 32,
    bedding: '2 Giường Đôi (Double)',
    view: 'Hướng Thành Phố (City View)',
    keys: 40,
    baseRate: 1500000,
    amenities: ['wifi', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    turnover: 30,
    yieldMultiplier: 1.0,
    description: 'Phòng tiêu chuẩn tiện nghi, thoáng mát, nhìn ra toàn cảnh đô thị năng động. Giá rẻ tiết kiệm, phù hợp chuyến công tác hoặc du lịch bình dân.',
  },
  {
    id: 2,
    code: 'DLX-OCN',
    name: 'Phòng Deluxe Giường King Hướng Biển Kèm Ban Công',
    subtitle: 'Đang Chọn // Ban Công Biển Riêng',
    status: 'active',
    floors: 'Tầng 6–9',
    maxAdults: 2,
    maxChildren: 1,
    area: 48,
    bedding: '1 Giường King (2m x 2m)',
    view: 'Hướng Biển (Ocean View)',
    keys: 48,
    baseRate: 2800000,
    amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
    turnover: 35,
    yieldMultiplier: 1.15,
    description: 'Suite cao cấp với ban công riêng biệt và tầm nhìn trực diện biển panorama 180 độ. Trang bị bồn tắm nằm ngâm mình thư giãn ngắm hoàng hôn.',
  },
  {
    id: 3,
    code: 'EXC-PAN',
    name: 'Phòng Executive Góc Hai Mặt Thoáng Kèm Bồn Sục',
    subtitle: 'Tầng 6–8 // Hai Mặt Thoáng',
    status: 'active',
    floors: 'Tầng 6–8',
    maxAdults: 2,
    maxChildren: 2,
    area: 58,
    bedding: '1 Giường King + Giường Sofa',
    view: 'Hai Mặt Thoáng (Dual Aspect)',
    keys: 24,
    baseRate: 3900000,
    amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'jacuzzi', 'workspace', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
    turnover: 40,
    yieldMultiplier: 1.2,
    description: 'Suite góc với không gian rộng mở, khu vực bàn làm việc doanh nhân và bồn sục jacuzzi thủy lực thư giãn. Phù hợp gia đình nhỏ hoặc khách công tác cao cấp.',
  },
  {
    id: 4,
    code: 'PNT-VIL',
    name: 'Biệt Thự Penthouse Horizon Sky Villa Trên Không',
    subtitle: 'Tầng Thượng Rooftop // Hồ Bơi Riêng',
    status: 'active',
    floors: 'Tầng Thượng Rooftop',
    maxAdults: 4,
    maxChildren: 2,
    area: 110,
    bedding: '2 Giường King',
    view: 'Hướng Biển (Ocean View)',
    keys: 8,
    baseRate: 9500000,
    amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'pool', 'butler', 'jacuzzi', 'kitchen', 'ac', 'safe', 'tv', 'workspace'],
    image: 'https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=600&q=80',
    turnover: 60,
    yieldMultiplier: 1.3,
    description: 'Biệt thự trên không sang trọng bậc nhất với hồ bơi vô cực riêng, gian bếp nhỏ tự nấu nướng và quản gia phục vụ 24/7. Hoàn hảo cho gia đình đông người và khách VIP.',
  },
  {
    id: 5,
    code: 'ACC-KNG',
    name: 'Phòng Suite Hỗ Trợ Người Khuyết Tật (Tiêu Chuẩn ADA)',
    subtitle: 'Tầng 1 // Phòng Tắm Roll-In Đạt Chuẩn',
    status: 'active',
    floors: 'Tầng 1',
    maxAdults: 2,
    maxChildren: 0,
    area: 42,
    bedding: '1 Giường King (2m x 2m)',
    view: 'Hướng Vườn (Garden View)',
    keys: 24,
    baseRate: 2100000,
    amenities: ['wifi', 'ada', 'ac', 'safe', 'tv', 'workspace'],
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    turnover: 30,
    yieldMultiplier: 1.0,
    description: 'Phòng tiếp cận đặc biệt thiết kế đạt tiêu chuẩn ADA quốc tế tại tầng 1, không bậc thang, lối đi xe lăn rộng rãi và phòng tắm không rào cản.',
  },
];

const EMPTY_FORM = {
  code: '',
  name: '',
  subtitle: '',
  status: 'active',
  floors: '',
  maxAdults: 2,
  maxChildren: 1,
  area: '',
  bedding: '1 Giường King (2m x 2m)',
  view: 'Hướng Biển (Ocean View)',
  keys: '',
  baseRate: '',
  amenities: [],
  image: '',
  turnover: 30,
  yieldMultiplier: 1.0,
  description: '',
};

// Định dạng tiền tệ VNĐ an toàn, không bị tràn số
const fmtVND = (n) => {
  const num = Number(n);
  if (isNaN(num) || num === null || num === undefined) return '0 ₫';
  return `${num.toLocaleString('vi-VN')} ₫`;
};

// Giới hạn giá trị nhập số tối đa (Test Case: <= 9,999,999,999)
const MAX_ALLOWED_NUMBER = 9999999999;
const MAX_KEYS = 99999;
const MAX_AREA = 99999;

const DIST_COLORS = [
  'bg-admin-primary',
  'bg-secondary',
  'bg-tertiary-fixed-dim',
  'bg-secondary-fixed-dim',
  'bg-on-surface-variant',
];

const API_BASE_URL = 'http://localhost:5000/api/loai-phong';

// Các câu hỏi gợi ý thông minh cho Semantic Search
const QUICK_SEMANTIC_PROMPTS = [
  { icon: 'waves', label: 'View biển có ban công', query: 'view biển có ban công' },
  { icon: 'family_restroom', label: 'Gia đình 4 người', query: 'phòng cho gia đình 4 người' },
  { icon: 'bathtub', label: 'Có bồn tắm nằm thư giãn', query: 'có bồn tắm ngâm mình view đẹp' },
  { icon: 'diamond', label: 'Suite VIP cao cấp nhất', query: 'phòng vip sang trọng đắt nhất' },
  { icon: 'savings', label: 'Giá tiết kiệm dưới 2.5 triệu', query: 'phòng giá rẻ dưới 2.5 triệu' },
  { icon: 'accessible', label: 'Tiếp cận xe lăn ADA', query: 'phòng cho người khuyết tật xe lăn' },
  { icon: 'countertops', label: 'Có bếp tự nấu ăn & hồ bơi', query: 'phòng có bếp tự nấu và hồ bơi' },
];

// =============================================================================
// COMPONENT CHÍNH
// =============================================================================
const RoomTypeManagement = () => {
  // Quản lý danh sách loại phòng với LocalStorage đồng bộ
  const [roomTypes, setRoomTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('qlks_room_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) { }
    return INITIAL_ROOM_TYPES;
  });

  const [selectedId, setSelectedId] = useState(2);
  const [form, setForm] = useState({ ...INITIAL_ROOM_TYPES[1] });
  const [isNew, setIsNew] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [imgUrl, setImgUrl] = useState(INITIAL_ROOM_TYPES[1].image);
  const [formErrors, setFormErrors] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showRagAnswer, setShowRagAnswer] = useState(true);
  const tableScrollRef = useRef(null);

  // Lăn chuột trên bảng thì cuộn ngang
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // Bảng không tràn thì không làm gì
      if (el.scrollWidth <= el.clientWidth) return;
      // Nếu đã là cuộn ngang (touchpad, Shift + lăn) thì để trình duyệt tự xử lý
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      // Tới mép thì cho trang cuộn dọc bình thường
      if (atStart || atEnd) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Lưu vào localStorage khi danh sách thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('qlks_room_types', JSON.stringify(roomTypes));
    } catch (_) { }
  }, [roomTypes]);

  // Thử kết nối backend API khi tải trang
  useEffect(() => {
    fetchFromBackend();
  }, []);

  const fetchFromBackend = async () => {
    setIsSyncing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(API_BASE_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((r) => ({
            id: r.id,
            code: r.ma_loai,
            name: r.ten_loai,
            subtitle: r.tang_vi_tri ? `Tầng: ${r.tang_vi_tri}` : '',
            status: r.trang_thai,
            floors: r.tang_vi_tri || '',
            maxAdults: r.toi_da_nguoi_lon || 2,
            maxChildren: r.toi_da_tre_em || 1,
            area: r.dien_tich || 0,
            bedding: r.loai_giuong || '1 Giường King (2m x 2m)',
            view: r.huong_view || 'Hướng Biển (Ocean View)',
            keys: r.so_phong_ton_kho || 0,
            baseRate: Number(r.gia_co_ban) || 0,
            amenities: Array.isArray(r.tien_ich) ? r.tien_ich : [],
            image: r.hinh_anh || '',
            turnover: r.thoi_gian_don_phong || 30,
            yieldMultiplier: Number(r.he_so_cuoi_tuan) || 1.0,
            description: r.mo_ta || '',
          }));
          setRoomTypes(mapped);
          setBackendConnected(true);
          showToast('Đã đồng bộ dữ liệu từ Cơ sở dữ liệu MySQL!', 'success');
        }
      }
    } catch (_) {
      setBackendConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── TÌM KIẾM NGỮ NGHĨA (SEMANTIC SEARCH & NLP) ─────────────────────────────
  const semanticResults = useMemo(() => {
    return performSemanticSearch(roomTypes, filterText);
  }, [roomTypes, filterText]);

  // Lọc thêm theo trạng thái hoạt động
  const filtered = useMemo(() => {
    return semanticResults.filter(
      (r) => filterStatus === 'all' || r.status === filterStatus
    );
  }, [semanticResults, filterStatus]);

  // ─── RAG (Retrieval-Augmented Generation): AI Trả lời kèm trích dẫn nguồn ───
  const ragResponse = useMemo(() => {
    if (!filterText || filterText.trim().length < 2) return null;
    return generateRagAnswer(filterText, filtered);
  }, [filterText, filtered]);

  // Tính toán KPI Thống kê
  const totalKeys = roomTypes.reduce((s, r) => s + Number(r.keys || 0), 0);
  const activeCount = roomTypes.filter((r) => r.status === 'active').length;
  const avgRate = roomTypes.length
    ? roomTypes.reduce((s, r) => s + Number(r.baseRate || 0), 0) / roomTypes.length
    : 0;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Chọn một hàng trong bảng để chỉnh sửa (kèm ghi nhận sở thích cá nhân hóa)
  const selectRow = (rt) => {
    setSelectedId(rt.id);
    setForm({ ...rt });
    setImgUrl(rt.image || '');
    setIsNew(false);
    setShowConfirm(false);
    setShowDeleteConfirm(false);
    setFormErrors({});

    // Ghi nhận tương tác để cá nhân hóa
    trackUserInteraction(rt, 'view');
  };

  // Chọn một phòng từ trích dẫn nguồn của RAG
  const selectFromCitation = (code) => {
    const target = roomTypes.find((r) => r.code === code);
    if (target) {
      selectRow(target);
      showToast(`Đã chọn phòng [${code}] từ gợi ý của Trợ lý AI!`, 'info');
    }
  };

  // Bắt đầu tạo mới loại phòng
  const handleNew = () => {
    setSelectedId(null);
    setForm({ ...EMPTY_FORM });
    setImgUrl('');
    setIsNew(true);
    setShowConfirm(false);
    setShowDeleteConfirm(false);
    setFormErrors({});
  };

  // Cập nhật giá trị trường và validate ngay tức thì
  const setField = (field, value) => {
    if (['baseRate', 'keys', 'area', 'turnover'].includes(field)) {
      if (value !== '' && (isNaN(Number(value)) || Number(value) < 0)) {
        return;
      }
      if (field === 'baseRate' && Number(value) > MAX_ALLOWED_NUMBER) {
        setFormErrors((p) => ({
          ...p,
          baseRate: `Giá không được vượt quá ${MAX_ALLOWED_NUMBER.toLocaleString('vi-VN')} ₫!`,
        }));
        showToast(`Lỗi: Giá nhập vào đã vượt quá giới hạn tối đa 9.999.999.999!`, 'error');
        return;
      }
      if (field === 'keys' && Number(value) > MAX_KEYS) {
        setFormErrors((p) => ({
          ...p,
          keys: `Số lượng phòng không được vượt quá ${MAX_KEYS.toLocaleString('vi-VN')} phòng!`,
        }));
        return;
      }
      if (field === 'area' && Number(value) > MAX_AREA) {
        setFormErrors((p) => ({
          ...p,
          area: `Diện tích không được vượt quá ${MAX_AREA.toLocaleString('vi-VN')} m²!`,
        }));
        return;
      }
    }

    if (formErrors[field]) {
      setFormErrors((p) => {
        const c = { ...p };
        delete c[field];
        return c;
      });
    }

    setForm((p) => ({ ...p, [field]: value }));
  };

  const toggleAmenity = (id) =>
    setForm((p) => ({
      ...p,
      amenities: p.amenities.includes(id)
        ? p.amenities.filter((a) => a !== id)
        : [...p.amenities, id],
    }));

  // Kiểm tra tính hợp lệ toàn bộ form trước khi lưu (Test Cases)
  const validateForm = () => {
    const errors = {};

    if (!form.code || !form.code.trim()) {
      errors.code = 'Vui lòng nhập Mã loại phòng (ví dụ: DLX-OCN)';
    } else if (form.code.trim().length > 20) {
      errors.code = 'Mã loại phòng không được vượt quá 20 ký tự';
    } else if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) {
      errors.code = 'Mã loại phòng chỉ bao gồm chữ cái, chữ số, dấu gạch ngang (-) hoặc gạch dưới (_)';
    }

    const isDuplicateCode = roomTypes.some(
      (r) =>
        r.code.trim().toUpperCase() === form.code.trim().toUpperCase() &&
        (isNew || r.id !== selectedId)
    );
    if (isDuplicateCode) {
      errors.code = `Mã loại phòng "${form.code.trim().toUpperCase()}" đã tồn tại! Vui lòng chọn mã khác.`;
    }

    if (!form.name || !form.name.trim()) {
      errors.name = 'Vui lòng nhập Tên loại phòng';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Tên loại phòng phải có ít nhất 2 ký tự';
    } else if (form.name.trim().length > 200) {
      errors.name = 'Tên loại phòng không được vượt quá 200 ký tự';
    }

    const price = Number(form.baseRate);
    if (form.baseRate === '' || isNaN(price) || price <= 0) {
      errors.baseRate = 'Giá cơ bản phải là số dương lớn hơn 0';
    } else if (price > MAX_ALLOWED_NUMBER) {
      errors.baseRate = `Giá cơ bản không được vượt quá ${MAX_ALLOWED_NUMBER.toLocaleString('vi-VN')} ₫`;
    }

    if (form.area !== '' && (isNaN(Number(form.area)) || Number(form.area) <= 0 || Number(form.area) > MAX_AREA)) {
      errors.area = `Diện tích phòng phải từ 1 đến ${MAX_AREA.toLocaleString('vi-VN')} m²`;
    }

    if (form.keys !== '' && (isNaN(Number(form.keys)) || Number(form.keys) < 0 || Number(form.keys) > MAX_KEYS)) {
      errors.keys = `Số lượng phòng tồn kho phải từ 0 đến ${MAX_KEYS.toLocaleString('vi-VN')}`;
    }

    if (form.turnover !== '' && (isNaN(Number(form.turnover)) || Number(form.turnover) < 5 || Number(form.turnover) > 1440)) {
      errors.turnover = 'Thời gian dọn phòng phải từ 5 đến 1.440 phút (tối đa 24 giờ)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── LƯU LOẠI PHÒNG (Bao gồm Xử Lý Lỗi Xóa Ở Database Khi Đang Sửa) ────────
  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường vi phạm!', 'error');
      return;
    }

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      baseRate: Number(form.baseRate),
      keys: form.keys === '' ? 0 : Number(form.keys),
      area: form.area === '' ? 0 : Number(form.area),
      turnover: form.turnover === '' ? 30 : Number(form.turnover),
      image: imgUrl.trim(),
    };

    if (!isNew) {
      // ⚠️ TEST CASE QUAN TRỌNG: Kiểm tra xem loại phòng còn tồn tại trong Cơ sở dữ liệu hay không!
      const isStillInDatabase = roomTypes.some((r) => r.id === selectedId);

      if (!isStillInDatabase) {
        showToast(
          `⚠️ LỖI ĐỒNG BỘ CSDL: Loại phòng này không còn tồn tại trong cơ sở dữ liệu (có thể đã bị xóa bởi người khác hoặc quản trị viên)! Thao tác cập nhật đã bị từ chối.`,
          'error'
        );
        handleNew();
        return;
      }

      if (backendConnected) {
        try {
          const res = await fetch(`${API_BASE_URL}/${selectedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ma_loai: payload.code,
              ten_loai: payload.name,
              mo_ta: payload.description,
              hinh_anh: payload.image,
              dien_tich: payload.area,
              so_phong_ton_kho: payload.keys,
              gia_co_ban: payload.baseRate,
              loai_giuong: payload.bedding,
              huong_view: payload.view,
              tang_vi_tri: payload.floors,
              toi_da_nguoi_lon: payload.maxAdults,
              toi_da_tre_em: payload.maxChildren,
              thoi_gian_don_phong: payload.turnover,
              he_so_cuoi_tuan: payload.yieldMultiplier,
              tien_ich: payload.amenities,
              trang_thai: payload.status,
            }),
          });

          if (res.status === 404) {
            showToast(
              `⚠️ LỖI ĐỒNG BỘ: Bản ghi loại phòng ID #${selectedId} đã bị xóa trực tiếp khỏi cơ sở dữ liệu MySQL! Hệ thống sẽ tự động cập nhật lại danh sách.`,
              'error'
            );
            setRoomTypes((p) => p.filter((r) => r.id !== selectedId));
            handleNew();
            return;
          }

          const resData = await res.json();
          if (!res.ok || !resData.success) {
            showToast(resData.message || 'Không thể cập nhật trên cơ sở dữ liệu', 'error');
            return;
          }
        } catch (err) {
          console.warn('Lỗi gọi API PUT, chuyển sang cập nhật bộ nhớ cục bộ:', err);
        }
      }

      setRoomTypes((p) =>
        p.map((r) => (r.id === selectedId ? { ...payload, id: selectedId } : r))
      );
      showToast(`Đã cập nhật thành công loại phòng "${payload.name}".`, 'success');
    } else {
      let newId = Date.now();

      if (backendConnected) {
        try {
          const res = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ma_loai: payload.code,
              ten_loai: payload.name,
              mo_ta: payload.description,
              hinh_anh: payload.image,
              dien_tich: payload.area,
              so_phong_ton_kho: payload.keys,
              gia_co_ban: payload.baseRate,
              loai_giuong: payload.bedding,
              huong_view: payload.view,
              tang_vi_tri: payload.floors,
              toi_da_nguoi_lon: payload.maxAdults,
              toi_da_tre_em: payload.maxChildren,
              thoi_gian_don_phong: payload.turnover,
              he_so_cuoi_tuan: payload.yieldMultiplier,
              tien_ich: payload.amenities,
              trang_thai: payload.status,
            }),
          });

          const resData = await res.json();
          if (!res.ok || !resData.success) {
            showToast(resData.message || 'Không thể tạo mới loại phòng trên CSDL', 'error');
            return;
          }
          if (resData.data && resData.data.id) {
            newId = resData.data.id;
          }
        } catch (err) {
          console.warn('Lỗi gọi API POST, tạo trên bộ nhớ cục bộ:', err);
        }
      }

      const createdItem = { ...payload, id: newId };
      setRoomTypes((p) => [...p, createdItem]);
      setSelectedId(newId);
      setIsNew(false);
      showToast(`Đã tạo mới thành công loại phòng "${payload.name}".`, 'success');
    }
  };

  const handleReset = () => {
    if (isNew) {
      setForm({ ...EMPTY_FORM });
      setImgUrl('');
    } else {
      const orig = roomTypes.find((r) => r.id === selectedId);
      if (orig) {
        setForm({ ...orig });
        setImgUrl(orig.image || '');
      }
    }
    setFormErrors({});
    showToast('Đã khôi phục dữ liệu ban đầu của biểu mẫu.', 'info');
  };

  const handleToggleStatus = async () => {
    if (!selectedId) return;

    const isStillInDatabase = roomTypes.some((r) => r.id === selectedId);
    if (!isStillInDatabase) {
      showToast(
        '⚠️ Lỗi đồng bộ: Loại phòng này đã bị xóa khỏi cơ sở dữ liệu! Không thể đổi trạng thái.',
        'error'
      );
      setShowConfirm(false);
      handleNew();
      return;
    }

    const ns = form.status === 'active' ? 'inactive' : 'active';

    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE_URL}/${selectedId}/trang-thai`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trang_thai: ns }),
        });
        if (res.status === 404) {
          showToast(
            '⚠️ Lỗi đồng bộ: Loại phòng đã bị xóa khỏi cơ sở dữ liệu bởi người khác!',
            'error'
          );
          setRoomTypes((p) => p.filter((r) => r.id !== selectedId));
          handleNew();
          setShowConfirm(false);
          return;
        }
      } catch (_) { }
    }

    setRoomTypes((p) => p.map((r) => (r.id === selectedId ? { ...r, status: ns } : r)));
    setForm((p) => ({ ...p, status: ns }));
    showToast(
      `Đã chuyển trạng thái sang: ${ns === 'active' ? 'Đang hoạt động' : 'Tạm dừng kinh doanh'}.`,
      'success'
    );
    setShowConfirm(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    const isStillInDatabase = roomTypes.some((r) => r.id === selectedId);
    if (!isStillInDatabase) {
      showToast(
        '⚠️ Loại phòng này đã bị xóa trước đó hoặc không tồn tại trong cơ sở dữ liệu!',
        'error'
      );
      setShowDeleteConfirm(false);
      handleNew();
      return;
    }

    const currentName = form.name;

    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE_URL}/${selectedId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.message || 'Không thể xóa loại phòng', 'error');
          setShowDeleteConfirm(false);
          return;
        }
      } catch (_) { }
    }

    const remaining = roomTypes.filter((r) => r.id !== selectedId);
    setRoomTypes(remaining);
    setShowDeleteConfirm(false);
    showToast(`Đã xóa loại phòng "${currentName}" thành công.`, 'success');

    if (remaining.length > 0) {
      selectRow(remaining[0]);
    } else {
      handleNew();
    }
  };

  // ─── CÁC HÀM TIỆN ÍCH KIỂM THỬ TEST CASES ─────────────────────────────────
  const simulateDatabaseDeletion = () => {
    if (!selectedId || isNew) {
      showToast('Vui lòng chọn một loại phòng có sẵn để thử nghiệm test case này!', 'info');
      return;
    }
    setRoomTypes((p) => p.filter((r) => r.id !== selectedId));
    showToast(
      `🧪 TEST CASE ĐÃ KÍCH HOẠT: Đã xóa ngầm loại phòng ID #${selectedId} khỏi CSDL! Bây giờ hãy nhấn nút "Lưu Thay Đổi" để kiểm tra hệ thống báo lỗi.`,
      'info'
    );
  };

  const simulateOverflowInput = () => {
    setField('baseRate', 99999999999);
  };

  const restoreSampleData = () => {
    setRoomTypes(INITIAL_ROOM_TYPES);
    try {
      localStorage.setItem('qlks_room_types', JSON.stringify(INITIAL_ROOM_TYPES));
    } catch (_) { }
    selectRow(INITIAL_ROOM_TYPES[1]);
    showToast('Đã khôi phục dữ liệu danh mục loại phòng mẫu ban đầu!', 'success');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">
        {/* Toast Thông Báo */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[200] max-w-md flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl font-label-md text-label-md font-semibold transition-all duration-300 animate-bounce-short ${toast.type === 'error'
              ? 'bg-error text-white shadow-error/30'
              : toast.type === 'info'
                ? 'bg-surface-container-highest text-on-surface border border-outline-variant shadow-lg'
                : 'bg-admin-primary text-white shadow-admin-primary/30'
              }`}
          >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <div className="flex flex-col">
              <span className="text-body-sm leading-snug">{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Tiêu Đề Trang & Thanh Điều Hướng Trên (100% Tiếng Việt có dấu) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold flex-wrap">
              <span>PMS Quản Trị</span>
              <span className="text-outline-variant">//</span>
              <span className="text-on-surface-variant">Cấu Hình Tài Sản</span>
              <span className="text-outline-variant">//</span>
              <span>Hạng Mục &amp; Loại Phòng</span>
              <span className="text-outline-variant">//</span>
              <span className="inline-flex items-center gap-1.5 text-admin-primary bg-admin-primary/10 px-space-xs py-0.5 rounded-full">
                <span
                  className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-admin-primary animate-pulse' : 'bg-secondary'
                    }`}
                />
                {backendConnected ? 'CSDL Trực Tiếp (MySQL)' : 'Chế Độ Cục Bộ (Đồng Bộ)'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-1">
              Quản Lý Danh Mục &amp; Thông Số Loại Phòng
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tìm kiếm ngữ nghĩa (Semantic Search), AI RAG phân tích nhu cầu tự nhiên và quản lý toàn diện thông số vận hành cho từng hạng phòng resort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              className={`flex items-center gap-space-xs px-space-md py-space-sm rounded-lg font-label-md text-label-md font-semibold transition-all shadow-sm border ${showTestPanel
                ? 'bg-admin-primary/15 text-admin-primary border-admin-primary/30'
                : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high'
                }`}
              type="button"
              title="Mở bảng kiểm tra các test case đặc biệt (CSDL xóa ngầm, số quá lớn 9.999.999.999...)"
            >
              <span className="material-symbols-outlined text-[18px]">science</span>
              <span>Kiểm Thử Test Cases</span>
            </button>

            <button
              onClick={fetchFromBackend}
              disabled={isSyncing}
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm disabled:opacity-50"
              type="button"
              title="Làm mới và kiểm tra đồng bộ lại với CSDL"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm Mới</span>
            </button>

            <button
              onClick={handleNew}
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Thêm Loại Phòng Mới</span>
            </button>
          </div>
        </div>

        {/* 🧪 Bảng Công Cụ Kiểm Thử Nghiệp Vụ & Test Cases */}
        {showTestPanel && (
          <div className="mb-space-lg p-space-md bg-admin-primary/5 border border-admin-primary/30 rounded-xl shadow-sm flex flex-col gap-space-sm animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-admin-primary text-[22px]">bug_report</span>
                <span className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide">
                  Công Cụ Kiểm Thử Các Test Case Đặc Biệt Theo Yêu Cầu
                </span>
              </div>
              <button
                onClick={() => setShowTestPanel(false)}
                className="text-on-surface-variant hover:text-on-surface p-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Các nút dưới đây giúp kiểm thử nhanh chóng các trường hợp ngoại lệ (Edge Cases) như: CSDL bị xóa khi người dùng đang sửa, nhập số vượt quá 9.999.999.999, khôi phục dữ liệu mẫu:
            </p>
            <div className="flex flex-wrap items-center gap-space-sm pt-1">
              <button
                onClick={simulateDatabaseDeletion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded-lg text-label-md font-bold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>Test 1: Mô phỏng xóa khỏi CSDL khi đang sửa</span>
              </button>

              <button
                onClick={simulateOverflowInput}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-container/40 hover:bg-warning-container text-on-warning-container border border-outline-variant rounded-lg text-label-md font-bold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>Test 2: Thử nhập giá vượt quá 9.999.999.999</span>
              </button>

              <button
                onClick={restoreSampleData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-label-md font-semibold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>Khôi phục CSDL mẫu</span>
              </button>
            </div>
          </div>
        )}

        {/* Thẻ Thống Kê Tổng Quan (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Tổng Danh Mục
              </span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">category</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">
                {String(roomTypes.length).padStart(2, '0')}
              </span>
              <span className="font-label-sm text-label-sm text-admin-primary font-semibold">Hạng Phòng</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Đang hoạt động:{' '}
              <strong className="text-admin-primary font-mono">
                {activeCount} ({roomTypes.length > 0 ? Math.round((activeCount / roomTypes.length) * 100) : 0}%)
              </strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Tổng Số Phòng Tồn Kho
              </span>
              <span className="material-symbols-outlined text-[20px] text-secondary">bedroom_parent</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">
                {totalKeys.toLocaleString('vi-VN')}
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Phòng Khả Dụng</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Trạng thái:{' '}
              <strong className="text-on-surface font-mono">ĐÃ PHÂN BỔ TOÀN KHU</strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Giá Niêm Yết Trung Bình
              </span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">payments</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-admin-primary font-mono">
                {fmtVND(avgRate)}
              </span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              / Đêm <strong className="text-on-surface font-mono">(Chưa bao gồm thuế VAT)</strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                Giới Hạn Đặt Vượt (Overbooking)
              </span>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">warning</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">05%</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Tối đa: <strong className="text-on-surface font-mono">7 PHÒNG VƯỢT MỨC</strong>
            </div>
          </div>
        </div>

        {/* Khu Vực Làm Việc Chính (Grid 12 Cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* CỘT TRÁI (7 CỘT): Danh Sách Loại Phòng & Thanh Tìm Kiếm AI Thông Minh */}
          <div className="lg:col-span-7 flex flex-col gap-space-md min-w-0">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">

              {/* 🌟 THANH TÌM KIẾM THÔNG MINH: SEMANTIC SEARCH, NLP & RAG */}
              <div className="flex flex-col gap-2.5 p-space-sm bg-gradient-to-r from-admin-primary/5 via-surface-container-low to-surface-container rounded-xl border border-admin-primary/20">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm">
                  {/* Trạng thái bộ lọc */}
                  <div className="inline-flex p-1 bg-surface rounded-lg gap-1 border border-outline-variant shadow-xs">
                    {[
                      ['all', 'Tất Cả'],
                      ['active', 'Hoạt Động'],
                      ['inactive', 'Tạm Dừng'],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => setFilterStatus(v)}
                        className={`px-space-sm py-1 rounded text-label-md font-label-md whitespace-nowrap transition-colors ${filterStatus === v
                          ? 'bg-admin-primary text-white shadow-sm font-bold'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        type="button"
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Input Semantic Search */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-admin-primary animate-pulse">
                      auto_awesome
                    </span>
                    <input
                      className="w-full bg-surface pl-10 pr-9 py-2 rounded-xl text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-admin-primary border border-admin-primary/30 shadow-sm"
                      placeholder="Tìm kiếm ngữ nghĩa (VD: 'view biển có ban công', 'phòng 4 người', 'giá dưới 3tr', 'ada')..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                    />
                    {filterText && (
                      <button
                        onClick={() => setFilterText('')}
                        className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container-high"
                        type="button"
                        title="Xóa tìm kiếm"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Các câu hỏi gợi ý nhanh (Quick Semantic Prompts) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-label-sm scrollbar-none">
                  <span className="text-on-surface-variant text-[11px] font-semibold uppercase flex-shrink-0 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-admin-primary">psychology</span>
                    Gợi ý AI:
                  </span>
                  {QUICK_SEMANTIC_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFilterText(item.query)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${filterText === item.query
                        ? 'bg-admin-primary text-white border-admin-primary shadow-xs'
                        : 'bg-surface hover:bg-surface-container-highest text-on-surface-variant border-outline-variant/60 hover:text-on-surface'
                        }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🧠 HỘP TRẢ LỜI RAG (RETRIEVAL-AUGMENTED GENERATION - AI INSIGHT & REASONING) */}
              {ragResponse && (
                <div className="p-space-md rounded-xl bg-surface-container-lowest border border-admin-primary/30 shadow-md flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                      </div>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        Trợ Lý AI Khách Sạn (RAG Assistant) • Phân Tích Dựa Trên Dữ Liệu Phòng
                      </span>
                    </div>

                    <button
                      onClick={() => setShowRagAnswer(!showRagAnswer)}
                      className="text-on-surface-variant hover:text-on-surface text-label-sm flex items-center gap-1"
                      type="button"
                    >
                      <span>{showRagAnswer ? 'Thu gọn' : 'Xem chi tiết'}</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {showRagAnswer ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>

                  {showRagAnswer && (
                    <div className="flex flex-col gap-2 text-body-sm text-on-surface leading-relaxed">
                      {/* Thẻ nhận diện ý định */}
                      {ragResponse.matchedConcepts.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                            Ý định nhận diện:
                          </span>
                          {ragResponse.matchedConcepts.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-admin-primary/10 text-admin-primary font-mono text-[11px] font-bold"
                            >
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Nội dung trả lời tự nhiên */}
                      <p className="whitespace-pre-line text-on-surface font-body-sm bg-surface-container-low p-3 rounded-lg border border-outline-variant/40">
                        {ragResponse.answerText}
                      </p>

                      {/* Nguồn dẫn chứng (Citations - Click để chọn phòng) */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-label-sm text-on-surface-variant font-semibold">
                          📌 Trích dẫn nguồn (Bấm để xem &amp; sửa nhanh):
                        </span>
                        {ragResponse.citedRooms.map((cr) => (
                          <button
                            key={cr.id}
                            type="button"
                            onClick={() => selectFromCitation(cr.code)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm font-bold border transition-all ${cr.id === selectedId
                              ? 'bg-admin-primary text-white border-admin-primary shadow-xs'
                              : 'bg-surface hover:bg-surface-container-high text-on-surface border-outline-variant hover:border-admin-primary'
                              }`}
                          >
                            <span className="font-mono text-admin-primary font-bold">[{cr.code}]</span>
                            <span className="truncate max-w-[140px]">{cr.name}</span>
                            <span className="text-secondary font-mono text-[11px]">
                              ({cr.semanticScore}% khớp)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tiêu đề bảng danh mục */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                    Bảng Danh Mục Loại Phòng
                  </span>
                  <span className="bg-surface-container px-2 py-0.5 rounded font-mono text-[10px] text-on-surface-variant font-bold">
                    {filtered.length} KẾT QUẢ KHỚP
                  </span>
                </div>
                {filterText && (
                  <span className="text-body-xs text-admin-primary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">insights</span>
                    Đã xếp hạng theo độ khớp ngữ nghĩa AI
                  </span>
                )}
              </div>


              {/* Bảng Hiển Thị (100% Tiếng Việt có dấu) */}


              <div ref={tableScrollRef} className="overflow-x-auto pb-2">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">Mã / Tên Hạng Phòng</th>
                      <th className="py-2.5 px-3 text-center">Độ Khớp AI</th>
                      <th className="py-2.5 px-3 text-center">Sức Chứa</th>
                      <th className="py-2.5 px-3 text-center">Loại Giường</th>
                      <th className="py-2.5 px-3 text-center">Diện Tích</th>
                      <th className="py-2.5 px-3 text-right">Giá Chuẩn / Đêm</th>
                      <th className="py-2.5 px-3 text-center rounded-r-lg">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm font-body-sm divide-y divide-surface-container-high/60">
                    {filtered.map((rt) => (
                      <tr
                        key={rt.id}
                        onClick={() => selectRow(rt)}
                        className={`hover:bg-surface-container-high/50 transition-colors cursor-pointer group ${rt.id === selectedId && !isNew ? 'bg-surface-container-high/40' : ''
                          }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-1.5 h-8 rounded flex-shrink-0 ${rt.id === selectedId && !isNew ? 'bg-admin-primary' : 'bg-transparent'
                                }`}
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-body-md text-body-md font-bold truncate transition-colors ${rt.id === selectedId && !isNew
                                    ? 'text-admin-primary'
                                    : 'text-on-surface group-hover:text-admin-primary'
                                    }`}
                                >
                                  {rt.name}
                                </span>
                                {rt.personalizationBoost && (
                                  <span
                                    className="px-1.5 py-0.2 rounded text-[10px] bg-secondary-fixed-dim/30 text-secondary font-bold"
                                    title="Phòng này thường xuyên được bạn quan tâm"
                                  >
                                    ⭐ Gu của bạn
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-label-sm text-on-surface-variant truncate">
                                {rt.code} &bull; {rt.subtitle || rt.floors || 'Toàn khu'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Điểm tương thích ngữ nghĩa (Semantic Score) */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${rt.semanticScore >= 70
                                ? 'bg-admin-primary/15 text-admin-primary'
                                : rt.semanticScore >= 40
                                  ? 'bg-secondary/15 text-secondary'
                                  : 'bg-on-surface-variant/10 text-on-surface-variant'
                                }`}
                              title={rt.matchedReasons?.join('; ')}
                            >
                              {rt.semanticScore}%
                            </span>
                            {rt.matchedReasons && rt.matchedReasons[0] && (
                              <span className="text-[10px] text-on-surface-variant truncate max-w-[90px]">
                                {rt.matchedReasons[0]}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-semibold text-on-surface text-label-sm whitespace-nowrap">
                            {rt.maxAdults} Lớn / {rt.maxChildren} Trẻ
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="text-on-surface-variant text-[11px] leading-tight block max-w-[120px] truncate mx-auto">
                            {rt.bedding}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-semibold text-on-surface">{rt.area} m²</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                          {fmtVND(rt.baseRate)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap ${rt.status === 'active'
                              ? 'bg-admin-primary/10 text-admin-primary'
                              : 'bg-on-surface-variant/15 text-on-surface-variant'
                              }`}
                          >
                            {rt.status === 'active' ? 'Hoạt Động' : 'Tạm Dừng'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-on-surface-variant font-body-sm">
                          Không tìm thấy loại phòng nào phù hợp với câu hỏi hoặc bộ lọc của bạn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>
                  Hiển thị {filtered.length} / {roomTypes.length} loại phòng đã đăng ký
                </span>
                <span className="font-mono text-on-surface">CHẾ ĐỘ TỔNG HỢP PMS &bull; AI READY</span>
              </div>
            </div>

            {/* Thanh Phân Bổ Sức Chứa Theo Danh Mục */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-space-sm">
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                  Phân Bổ Sức Chứa Theo Từng Hạng Phòng
                </span>
                <span className="font-mono text-label-sm text-on-surface font-bold">
                  TỔNG CỘNG: {totalKeys.toLocaleString('vi-VN')} PHÒNG
                </span>
              </div>

              <div className="flex rounded-lg overflow-hidden h-7 mb-space-sm gap-0.5 bg-surface-container">
                {roomTypes.map((rt, i) => {
                  const pct = totalKeys > 0 ? (Number(rt.keys) / totalKeys) * 100 : 0;
                  return (
                    <div
                      key={rt.id}
                      className={`${DIST_COLORS[i % DIST_COLORS.length]} flex items-center justify-center transition-all cursor-pointer hover:brightness-110`}
                      style={{ width: `${pct}%` }}
                      title={`${rt.code}: ${rt.keys} phòng (${Math.round(pct)}%)`}
                      onClick={() => selectRow(rt)}
                    >
                      {pct > 8 && (
                        <span className="font-mono text-[10px] text-white font-bold truncate px-1">
                          {rt.code} ({rt.keys})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-space-sm">
                {roomTypes.map((rt, i) => (
                  <div
                    key={rt.id}
                    onClick={() => selectRow(rt)}
                    className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant cursor-pointer hover:text-on-surface"
                  >
                    <div className={`w-2.5 h-2.5 rounded-sm ${DIST_COLORS[i % DIST_COLORS.length]}`} />
                    <span className="font-mono font-semibold">{rt.code}</span>
                    <span className="text-[10px]">
                      ({totalKeys > 0 ? Math.round((Number(rt.keys) / totalKeys) * 100) : 0}%)
                    </span>
                    {rt.id === selectedId && !isNew && (
                      <span className="text-admin-primary font-bold">[ĐANG CHỌN]</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5 CỘT): Biểu Mẫu Nhập Thông Số & Chỉnh Sửa */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
              {/* Tiêu Đề Biểu Mẫu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-mono text-admin-primary font-bold uppercase tracking-wider truncate">
                    {isNew
                      ? 'TẠO MỚI LOẠI PHÒNG'
                      : `MÃ HẠNG: ${form.code || '---'} // ID HỆ THỐNG: ${selectedId ?? '---'}`}
                  </span>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">
                    {isNew ? 'Phiếu Tạo Mới Loại Phòng' : 'Thông Số Kỹ Thuật Hạng Phòng'}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap flex-shrink-0 ${isNew
                    ? 'bg-admin-primary-container text-on-admin-primary'
                    : 'bg-surface-container text-on-surface'
                    }`}
                >
                  {isNew ? 'CHẾ ĐỘ: TẠO MỚI' : 'CHẾ ĐỘ: CHỈNH SỬA'}
                </span>
              </div>

              {/* Ảnh Đại Diện Loại Phòng */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">
                  Ảnh Đại Diện Hạng Phòng
                </span>
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-surface-container mb-2 group border border-outline-variant">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={form.name || 'Ảnh phòng'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-2">
                      <span className="material-symbols-outlined text-[48px]">image</span>
                      <span className="font-label-sm text-label-sm">Chưa có ảnh hoặc liên kết không hợp lệ</span>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  placeholder="https://... (Dán liên kết URL hình ảnh hạng phòng tại đây)"
                  value={imgUrl}
                  onChange={(e) => {
                    setImgUrl(e.target.value);
                    setField('image', e.target.value);
                  }}
                />
              </div>

              {/* Mã Loại Phòng & Trạng Thái */}
              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
                    Mã Loại Phòng *
                  </label>
                  <input
                    type="text"
                    className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 uppercase ${formErrors.code
                      ? 'border-error focus:ring-error'
                      : 'border-outline-variant focus:ring-admin-primary'
                      }`}
                    placeholder="VD: DLX-OCN"
                    value={form.code}
                    maxLength={20}
                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  />
                  {formErrors.code && (
                    <span className="text-error text-body-xs font-semibold mt-1 block">
                      {formErrors.code}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
                    Trạng Thái Kinh Doanh
                  </label>
                  <select
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                  >
                    <option value="active">Đang Hoạt Động (Kinh Doanh)</option>
                    <option value="inactive">Tạm Dừng Kinh Doanh</option>
                  </select>
                </div>
              </div>

              {/* Tên Hiển Thị Hạng Phòng */}
              <div>
                <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
                  Tên Hiển Thị Hạng Phòng *
                </label>
                <input
                  type="text"
                  maxLength={200}
                  className={`w-full bg-surface border rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 ${formErrors.name
                    ? 'border-error focus:ring-error'
                    : 'border-outline-variant focus:ring-admin-primary'
                    }`}
                  placeholder="VD: Phòng Deluxe Giường King Hướng Biển Kèm Ban Công"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
                {formErrors.name && (
                  <span className="text-error text-body-xs font-semibold mt-1 block">
                    {formErrors.name}
                  </span>
                )}
              </div>

              {/* Mô Tả Chi Tiết */}
              <div>
                <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
                  Mô Tả Chi Tiết (Hiển thị cho Lễ Tân &amp; Hóa Đơn)
                </label>
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary resize-none"
                  placeholder="Mô tả tóm tắt về đặc điểm phòng, tiện nghi, ưu thế cho khách lưu trú..."
                  rows={2}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>

              {/* Diện Tích, Giá & Sức Chứa (Test Cases: Validate không vượt quá 9,999,999,999) */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">
                  Diện Tích &amp; Bảng Giá Chuẩn
                </span>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Diện Tích (m²)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={MAX_AREA}
                      className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 ${formErrors.area
                        ? 'border-error focus:ring-error'
                        : 'border-outline-variant focus:ring-admin-primary'
                        }`}
                      placeholder="VD: 45"
                      value={form.area}
                      onChange={(e) => setField('area', e.target.value)}
                    />
                    {formErrors.area && (
                      <span className="text-error text-body-xs font-semibold mt-1 block">
                        {formErrors.area}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Giá Chuẩn (VNĐ/Đêm) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_ALLOWED_NUMBER}
                      className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 ${formErrors.baseRate
                        ? 'border-error focus:ring-error'
                        : 'border-outline-variant focus:ring-admin-primary'
                        }`}
                      placeholder="VD: 2500000"
                      value={form.baseRate}
                      onChange={(e) => setField('baseRate', e.target.value)}
                    />
                    {formErrors.baseRate && (
                      <span className="text-error text-body-xs font-semibold mt-1 block">
                        {formErrors.baseRate}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Số Lượng Người Lớn Tối Đa
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.maxAdults}
                      onChange={(e) => setField('maxAdults', Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} Người Lớn
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Số Lượng Trẻ Em Tối Đa
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.maxChildren}
                      onChange={(e) => setField('maxChildren', Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 6].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'Không Cho Phép' : `${n} Trẻ Em`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Quy Cách Giường
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.bedding}
                      onChange={(e) => setField('bedding', e.target.value)}
                    >
                      {BEDDING_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Số Phòng Tồn Kho (Khả Dụng)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_KEYS}
                      className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 ${formErrors.keys
                        ? 'border-error focus:ring-error'
                        : 'border-outline-variant focus:ring-admin-primary'
                        }`}
                      placeholder="VD: 30"
                      value={form.keys}
                      onChange={(e) => setField('keys', e.target.value)}
                    />
                    {formErrors.keys && (
                      <span className="text-error text-body-xs font-semibold mt-1 block">
                        {formErrors.keys}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Tầng / Vị Trí Khu Vực
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      placeholder="VD: Tầng 6–9, Tầng Thượng"
                      value={form.floors}
                      maxLength={50}
                      onChange={(e) => setField('floors', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Hướng Nhìn (Cảnh Quan)
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.view}
                      onChange={(e) => setField('view', e.target.value)}
                    >
                      {VIEW_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Cài Đặt Giá & Doanh Thu */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">
                  Cài Đặt Vận Hành &amp; Doanh Thu
                </span>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Thời Gian Dọn Phòng (Phút)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 ${formErrors.turnover
                        ? 'border-error focus:ring-error'
                        : 'border-outline-variant focus:ring-admin-primary'
                        }`}
                      value={form.turnover}
                      onChange={(e) => setField('turnover', e.target.value)}
                    />
                    {formErrors.turnover && (
                      <span className="text-error text-body-xs font-semibold mt-1 block">
                        {formErrors.turnover}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Hệ Số Giá Cuối Tuần
                      <span className="font-mono text-admin-primary ml-1">
                        {form.yieldMultiplier > 1
                          ? `+${Math.round((form.yieldMultiplier - 1) * 100)}%`
                          : ''}
                      </span>
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.yieldMultiplier}
                      onChange={(e) => setField('yieldMultiplier', Number(e.target.value))}
                    >
                      <option value={1.0}>1.00x Giá Ngày Thường (Chuẩn)</option>
                      <option value={1.1}>1.10x Cuối Tuần (+10%)</option>
                      <option value={1.15}>1.15x Cuối Tuần (+15%)</option>
                      <option value={1.2}>1.20x Cuối Tuần (+20%)</option>
                      <option value={1.25}>1.25x Cuối Tuần (+25%)</option>
                      <option value={1.3}>1.30x Cuối Tuần (+30%)</option>
                      <option value={1.5}>1.50x Mùa Cao Điểm (+50%)</option>
                    </select>
                  </div>
                </div>

                {form.baseRate && !isNaN(Number(form.baseRate)) && (
                  <div className="mt-space-xs bg-admin-primary/5 border border-admin-primary/20 rounded-lg p-space-sm flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Giá Cuối Tuần Dự Kiến (Xem trước):
                    </span>
                    <span className="font-mono font-bold text-admin-primary text-body-md">
                      {fmtVND(Number(form.baseRate) * Number(form.yieldMultiplier))} / đêm
                    </span>
                  </div>
                )}
              </div>

              {/* Gói Tiện Ích Tiêu Chuẩn */}
              <div>
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                    Gói Tiện Ích Phòng Tiêu Chuẩn
                  </span>
                  <span className="font-mono text-label-sm text-admin-primary font-bold">
                    {form.amenities.length}/{AMENITY_OPTIONS.length} Đã Chọn
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                  {AMENITY_OPTIONS.map((a) => {
                    const checked = form.amenities.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${checked
                          ? 'bg-admin-primary/10 border-admin-primary/30'
                          : 'bg-surface-container hover:bg-surface-container-high border-transparent'
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-admin-primary w-3.5 h-3.5 rounded flex-shrink-0"
                          checked={checked}
                          onChange={() => toggleAmenity(a.id)}
                        />
                        <span
                          className={`material-symbols-outlined text-[14px] flex-shrink-0 ${checked ? 'text-admin-primary' : 'text-on-surface-variant'
                            }`}
                        >
                          {a.icon}
                        </span>
                        <span
                          className={`font-body-sm text-body-sm leading-tight select-none ${checked ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
                            }`}
                        >
                          {a.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Các Nút Thao Tác Biểu Mẫu */}
              <div className="flex flex-col sm:flex-row items-stretch gap-space-xs pt-space-md border-t border-surface-container-high">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-sm transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{isNew ? 'Tạo Loại Phòng Mới' : 'Lưu Thay Đổi'}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  <span>Đặt Lại</span>
                </button>
              </div>

              {/* Khu Vực Tạm Dừng / Kích Hoạt Lại & Xóa Loại Phòng (Chế độ sửa) */}
              {!isNew && selectedId && (
                <div className="border-t border-surface-container-high pt-space-sm flex flex-col gap-space-xs">
                  {!showConfirm ? (
                    <button
                      onClick={() => {
                        setShowConfirm(true);
                        setShowDeleteConfirm(false);
                      }}
                      className="w-full text-center font-label-sm text-label-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors py-1.5 rounded-lg border border-outline-variant"
                      type="button"
                    >
                      {form.status === 'active'
                        ? '⏸ Tạm Dừng Kinh Doanh Hạng Phòng Này'
                        : '▶️ Kích Hoạt Lại Hạng Phòng Này'}
                    </button>
                  ) : (
                    <div className="bg-surface-container-high rounded-lg p-space-sm flex flex-col gap-space-xs border border-outline-variant animate-fadeIn">
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">
                        Xác nhận {form.status === 'active' ? 'tạm dừng kinh doanh' : 'kích hoạt lại'} loại phòng "
                        {form.name}"?
                      </span>
                      <div className="flex gap-space-xs">
                        <button
                          onClick={handleToggleStatus}
                          className="flex-1 py-1.5 bg-admin-primary text-white font-label-sm text-label-sm font-bold rounded-lg hover:brightness-110 transition"
                          type="button"
                        >
                          Xác Nhận
                        </button>

                        <button
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 py-1.5 bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold rounded-lg hover:bg-surface-container-highest transition"
                          type="button"
                        >
                          Hủy Bỏ
                        </button>
                      </div>
                    </div>
                  )}

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowConfirm(false);
                      }}
                      className="w-full text-center font-label-sm text-label-sm font-bold text-error hover:text-white hover:bg-error transition-colors py-1.5 rounded-lg border border-error/30"
                      type="button"
                    >
                      🗑️ Xóa Loại Phòng Khỏi Cơ Sở Dữ Liệu
                    </button>
                  ) : (
                    <div className="bg-error-container rounded-lg p-space-sm flex flex-col gap-space-xs border border-error/40 animate-fadeIn">
                      <span className="font-label-sm text-label-sm font-bold text-on-error-container">
                        CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn loại phòng "{form.name}" ({form.code}) khỏi cơ sở dữ liệu không?
                      </span>
                      <div className="flex gap-space-xs">
                        <button
                          onClick={handleDelete}
                          className="flex-1 py-1.5 bg-error text-white font-label-sm text-label-sm font-bold rounded-lg hover:brightness-110 transition shadow-sm"
                          type="button"
                        >
                          Xác Nhận Xóa
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-1.5 bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold rounded-lg hover:bg-surface-container-high transition"
                          type="button"
                        >
                          Hủy Bỏ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RoomTypeManagement;
