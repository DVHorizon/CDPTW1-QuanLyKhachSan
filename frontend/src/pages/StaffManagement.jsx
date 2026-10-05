import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../components/layout/AdminLayout';

// ═══════════════════════════════════════════════════════════════════════════════
// HẰNG SỐ & CẤU HÌNH
// ═══════════════════════════════════════════════════════════════════════════════
const STORAGE_KEY_STAFF  = 'qlks_nhan_vien_v5';
const STORAGE_KEY_LOGS   = 'qlks_nhat_ky_v5';
const SO_DONG_TRANG      = 5;

// GM key hợp lệ (thực tế sẽ gọi API backend)
const GM_KEYS_HOP_LE = ['GM-KEY-2026', 'SUPERADMIN', 'GM8888', 'GRANDHORIZON'];

// ═══════════════════════════════════════════════════════════════════════════════
// DỮ LIỆU MẪU — 100% TIẾNG VIỆT
// ═══════════════════════════════════════════════════════════════════════════════
const DU_LIEU_NHAN_VIEN_MAU = [
  {
    id: 'NV-4092',
    hoTen: 'Nguyễn Thị Minh Châu',
    email: 'chau.nguyen@grandhorizon.vn',
    phongBan: 'Lễ Tân & Tiền Sảnh',
    vaiTro: 'Trưởng Ca Lễ Tân',
    maVaiTro: 'VAI_TRO #TC-04',
    trangThai: 'hoat_dong',
    vienTat: 'CH',
    ngayVaoLam: '15/03/2022',
    quyenHan: {
      quyen_checkin:     true,
      quyen_chuyen_phong: true,
      quyen_the_tu:      true,
      quyen_buong_phong: true,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    60,
      thoiGianIdlePhut:  15,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
  {
    id: 'NV-3180',
    hoTen: 'Trần Văn Tuấn Anh',
    email: 'tuananh.tran@grandhorizon.vn',
    phongBan: 'Lễ Tân & Tiền Sảnh',
    vaiTro: 'Nhân Viên Lễ Tân',
    maVaiTro: 'VAI_TRO #LT-02',
    trangThai: 'hoat_dong',
    vienTat: 'TA',
    ngayVaoLam: '10/01/2023',
    quyenHan: {
      quyen_checkin:     true,
      quyen_chuyen_phong: false,
      quyen_the_tu:      true,
      quyen_buong_phong: false,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    60,
      thoiGianIdlePhut:  15,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
  {
    id: 'NV-1044',
    hoTen: 'Lê Thị Bích Ngọc',
    email: 'bicngoc.le@grandhorizon.vn',
    phongBan: 'Buồng Phòng & Kỹ Thuật',
    vaiTro: 'Trưởng Bộ Phận Buồng Phòng',
    maVaiTro: 'VAI_TRO #BP-01',
    trangThai: 'hoat_dong',
    vienTat: 'BN',
    ngayVaoLam: '22/08/2021',
    quyenHan: {
      quyen_checkin:     false,
      quyen_chuyen_phong: false,
      quyen_the_tu:      true,
      quyen_buong_phong: true,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    90,
      thoiGianIdlePhut:  20,
      baoMatMFA:         true,
      hanPhienGio:       10,
    },
  },
  {
    id: 'NV-2089',
    hoTen: 'Phạm Quốc Dũng',
    email: 'quocdung.pham@grandhorizon.vn',
    phongBan: 'Ẩm Thực F&B & Bếp',
    vaiTro: 'Quản Lý Nhà Hàng',
    maVaiTro: 'VAI_TRO #FB-03',
    trangThai: 'hoat_dong',
    vienTat: 'QD',
    ngayVaoLam: '05/11/2022',
    quyenHan: {
      quyen_checkin:     false,
      quyen_chuyen_phong: false,
      quyen_the_tu:      false,
      quyen_buong_phong: false,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    60,
      thoiGianIdlePhut:  30,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
  {
    id: 'NV-0012',
    hoTen: 'Võ Minh Khoa',
    email: 'minhkhoa.vo@grandhorizon.vn',
    phongBan: 'Quản Trị & Công Nghệ',
    vaiTro: 'Quản Trị Viên Hệ Thống',
    maVaiTro: 'VAI_TRO #QT-01',
    trangThai: 'hoat_dong',
    vienTat: 'MK',
    ngayVaoLam: '01/06/2020',
    quyenHan: {
      quyen_checkin:     true,
      quyen_chuyen_phong: true,
      quyen_the_tu:      true,
      quyen_buong_phong: true,
      quyen_night_audit: true,
      quyen_he_thong:    true,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    30,
      thoiGianIdlePhut:  10,
      baoMatMFA:         true,
      hanPhienGio:       4,
    },
  },
  {
    id: 'NV-2150',
    hoTen: 'Hoàng Thị Thu Hà',
    email: 'thuha.hoang@grandhorizon.vn',
    phongBan: 'Ẩm Thực F&B & Bếp',
    vaiTro: 'Bếp Trưởng Điều Hành',
    maVaiTro: 'VAI_TRO #FB-02',
    trangThai: 'hoat_dong',
    vienTat: 'TH',
    ngayVaoLam: '18/04/2022',
    quyenHan: {
      quyen_checkin:     false,
      quyen_chuyen_phong: false,
      quyen_the_tu:      false,
      quyen_buong_phong: false,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    60,
      thoiGianIdlePhut:  30,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
  {
    id: 'NV-1192',
    hoTen: 'Nguyễn Văn Hoàng',
    email: 'vanhoang.nguyen@grandhorizon.vn',
    phongBan: 'Buồng Phòng & Kỹ Thuật',
    vaiTro: 'Nhân Viên Dọn Phòng',
    maVaiTro: 'VAI_TRO #BP-04',
    trangThai: 'hoat_dong',
    vienTat: 'VH',
    ngayVaoLam: '20/07/2023',
    quyenHan: {
      quyen_checkin:     false,
      quyen_chuyen_phong: false,
      quyen_the_tu:      true,
      quyen_buong_phong: true,
      quyen_night_audit: false,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    90,
      thoiGianIdlePhut:  30,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
  {
    id: 'NV-3204',
    hoTen: 'Bùi Thị Thanh Thảo',
    email: 'thanhthao.bui@grandhorizon.vn',
    phongBan: 'Lễ Tân & Tiền Sảnh',
    vaiTro: 'Kiểm Toán Viên Ca Đêm',
    maVaiTro: 'VAI_TRO #KT-01',
    trangThai: 'tam_dung',
    vienTat: 'TT',
    ngayVaoLam: '14/12/2021',
    quyenHan: {
      quyen_checkin:     true,
      quyen_chuyen_phong: true,
      quyen_the_tu:      true,
      quyen_buong_phong: false,
      quyen_night_audit: true,
      quyen_he_thong:    false,
    },
    chinhSachBaoMat: {
      hanMatKhauNgay:    45,
      thoiGianIdlePhut:  15,
      baoMatMFA:         true,
      hanPhienGio:       8,
    },
  },
];

const NHAT_KY_MAU = [
  {
    id: 'NK-8891', thoiGian: '05/10/2026 14:28:10',
    nguoiThucHien: 'Võ Minh Khoa (NV-0012)',
    hanhDong: 'CẬP NHẬT CHÍNH SÁCH', mucTieu: 'NV-4092',
    chiTiet: 'Cập nhật quyền Lập Trình Thẻ Từ cho Nguyễn Thị Minh Châu → ĐÃ CẤP',
    ketQua: 'THÀNH CÔNG',
  },
  {
    id: 'NK-8889', thoiGian: '05/10/2026 13:45:00',
    nguoiThucHien: 'Võ Minh Khoa (NV-0012)',
    hanhDong: 'ĐỊNH NGHĨA VAI TRÒ', mucTieu: 'VAI_TRO #FB-03',
    chiTiet: 'Khởi tạo hồ sơ Quản Lý Nhà Hàng với 0 quyền ban đầu',
    ketQua: 'THÀNH CÔNG',
  },
  {
    id: 'NK-8882', thoiGian: '05/10/2026 11:15:22',
    nguoiThucHien: 'Nguyễn Thị Minh Châu (NV-4092)',
    hanhDong: 'XÁC THỰC PHIÊN', mucTieu: 'TRẠM SỐ 04',
    chiTiet: 'Đăng nhập thành công qua SmartCard kết hợp token MFA',
    ketQua: 'THÀNH CÔNG',
  },
  {
    id: 'NK-8875', thoiGian: '05/10/2026 09:10:04',
    nguoiThucHien: 'Trần Văn Tuấn Anh (NV-3180)',
    hanhDong: 'TỪ CHỐI THAY ĐỔI QUYỀN', mucTieu: 'NV-4092',
    chiTiet: 'Cố thay đổi phân quyền mà không có xác nhận của Quản Trị Viên',
    ketQua: 'BỊ CHẶN',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CẤU HÌNH 6 QUYỀN HẠN RBAC
// ═══════════════════════════════════════════════════════════════════════════════
const CAU_HINH_QUYEN = [
  {
    key: 'quyen_checkin',
    icon: 'how_to_reg',
    tieuDe: 'Check-In Khách & Điều Chỉnh Folio',
    moTa: 'Phân quyền ghi nợ, chỉnh sửa dòng mục, xử lý hoàn tiền tại terminal',
    laCaoCapBac: false,
  },
  {
    key: 'quyen_chuyen_phong',
    icon: 'swap_horiz',
    tieuDe: 'Chuyển Phòng & Override Giá (≤15%)',
    moTa: 'Override vượt 15% cần token phê duyệt của Ban Quản Lý',
    laCaoCapBac: false,
  },
  {
    key: 'quyen_the_tu',
    icon: 'key',
    tieuDe: 'Lập Trình Thẻ Từ Đọc/Ghi',
    moTa: 'Quyền trạm mã hóa RFID cho thẻ Master & thẻ khách vật lý',
    laCaoCapBac: false,
  },
  {
    key: 'quyen_buong_phong',
    icon: 'cleaning_services',
    tieuDe: 'Phân Bổ Ưu Tiên Buồng Phòng',
    moTa: 'Sắp xếp lại hàng đợi VIP & đẩy nhanh dọn phòng khẩn cấp',
    laCaoCapBac: false,
  },
  {
    key: 'quyen_night_audit',
    icon: 'nightlight',
    tieuDe: 'Ký Duyệt Kiểm Toán Ca Đêm',
    moTa: 'YÊU CẦU KHÓA TỔNG QUẢN LÝ để kích hoạt',
    laCaoCapBac: true,
  },
  {
    key: 'quyen_he_thong',
    icon: 'settings_applications',
    tieuDe: 'Cấu Hình Hệ Thống & Cấp Phát Terminal',
    moTa: 'YÊU CẦU VAI TRÒ QUẢN TRỊ VIÊN HỆ THỐNG để kích hoạt',
    laCaoCapBac: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DANH MỤC LỰA CHỌN
// ═══════════════════════════════════════════════════════════════════════════════
const DANH_SACH_PHONG_BAN = [
  'Lễ Tân & Tiền Sảnh',
  'Buồng Phòng & Kỹ Thuật',
  'Ẩm Thực F&B & Bếp',
  'Quản Trị & Công Nghệ',
  'Bảo Trì & Kỹ Thuật Cơ Sở Hạ Tầng',
  'Marketing & Kinh Doanh',
];

const DANH_SACH_VAI_TRO = [
  'Trưởng Ca Lễ Tân',
  'Nhân Viên Lễ Tân',
  'Trưởng Bộ Phận Buồng Phòng',
  'Nhân Viên Dọn Phòng',
  'Quản Lý Nhà Hàng',
  'Bếp Trưởng Điều Hành',
  'Nhân Viên Phục Vụ Bàn',
  'Kiểm Toán Viên Ca Đêm',
  'Quản Trị Viên Hệ Thống',
  'Giám Đốc Vận Hành',
];

const MAU_AVATAR = [
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700',
  'from-cyan-500 to-cyan-700',
];

// ═══════════════════════════════════════════════════════════════════════════════
// HÀM TIỆN ÍCH
// ═══════════════════════════════════════════════════════════════════════════════
const layMauAvatar = (id) => {
  // Tính toán màu avatar dựa trên mã ID → nhất quán, không thay đổi khi render
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return MAU_AVATAR[Math.abs(hash) % MAU_AVATAR.length];
};

const nhanDangTrangThai = (trangThai) => {
  if (trangThai === 'hoat_dong') return { nhan: 'Hoạt Động', cls: 'bg-admin-primary/10 text-admin-primary border border-admin-primary/20', dot: 'bg-admin-primary' };
  if (trangThai === 'da_thu_hoi') return { nhan: 'Đã Thu Hồi', cls: 'bg-error/10 text-error border border-error/20', dot: 'bg-error' };
  return { nhan: 'Tạm Dừng', cls: 'bg-surface-container text-on-surface-variant border border-outline-variant', dot: 'bg-on-surface-variant' };
};

const taoMaNV = () => `NV-${Math.floor(1000 + Math.random() * 9000)}`;

const layThoiGian = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH
// ═══════════════════════════════════════════════════════════════════════════════
const QuanLyTaiKhoan = () => {

  // ─── STATE DANH SÁCH & NHẬT KÝ ──────────────────────────────────────────────
  const [danhSachNV, setDanhSachNV] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STAFF);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DU_LIEU_NHAN_VIEN_MAU;
  });

  const [nhatKy, setNhatKy] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return NHAT_KY_MAU;
  });

  // ─── PHIÊN LÀM VIỆC GIẢ LẬP (Vai trò đang đăng nhập) ───────────────────────
  // Nhân viên đang đăng nhập là Nguyễn Thị Minh Châu (NV-4092), vai trò: Quản Trị Viên
  const [vaiTroHienTai, setVaiTroHienTai] = useState(() => localStorage.getItem('qlks_vai_tro_phien') || 'Quản Trị Viên');
  const maNVDangDangNhap = 'NV-4092';
  const laQuanTriVien = vaiTroHienTai === 'Quản Trị Viên';

  // ─── CHỌN NHÂN VIÊN ─────────────────────────────────────────────────────────
  const [idDangChon, setIdDangChon] = useState('NV-4092');

  // ─── TÌM KIẾM & LỌC ─────────────────────────────────────────────────────────
  const [tuKhoa, setTuKhoa] = useState('');
  const [locPhongBan, setLocPhongBan] = useState('TAT_CA');
  const [locVaiTro, setLocVaiTro] = useState('TAT_CA');
  const [locTrangThai, setLocTrangThai] = useState('TAT_CA');
  const [trangHienTai, setTrangHienTai] = useState(1);

  // ─── RBAC INSPECTOR (Bản sao làm việc — chưa lưu) ───────────────────────────
  const [quyenLamViec, setQuyenLamViec] = useState({});
  const [chinhSachLamViec, setChinhSachLamViec] = useState({
    hanMatKhauNgay: 60, thoiGianIdlePhut: 15, baoMatMFA: true, hanPhienGio: 8,
  });
  const [daCoBanLuu, setDaCoBanLuu] = useState(false); // Cờ phát hiện thay đổi chưa lưu

  // ─── THÔNG BÁO TOAST ─────────────────────────────────────────────────────────
  const [thongBao, setThongBao] = useState(null);

  // ─── MODAL STATES ─────────────────────────────────────────────────────────────
  const [modalCapPhat, setModalCapPhat]     = useState(false);
  const [modalVaiTro, setModalVaiTro]       = useState(false);
  const [modalNhatKy, setModalNhatKy]       = useState(false);
  const [modalXacThuc, setModalXacThuc]     = useState(false);
  const [modalThuHoi, setModalThuHoi]       = useState(false);
  const [modalNhanBan, setModalNhanBan]     = useState(false);

  // Trạng thái form cấp phát nhân viên mới
  const [formNVMoi, setFormNVMoi] = useState({ id: taoMaNV(), hoTen: '', email: '', phongBan: DANH_SACH_PHONG_BAN[0], vaiTro: '' });
  const [loiFormNVMoi, setLoiFormNVMoi] = useState('');

  // Trạng thái form định nghĩa vai trò
  const [formVaiTro, setFormVaiTro] = useState({ tenVaiTro: '', phongBan: DANH_SACH_PHONG_BAN[0] });

  // Trạng thái xác thực GM Key
  const [quyenDangXacThuc, setQuyenDangXacThuc] = useState('');
  const [gmKey, setGmKey] = useState('');
  const [loiGmKey, setLoiGmKey] = useState('');

  // Trạng thái nhân bản vai trò
  const [tenVaiTroMoi, setTenVaiTroMoi] = useState('');

  // ─── ĐỒNG BỘ LƯU TRỮ ────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(danhSachNV));
  }, [danhSachNV]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(nhatKy));
  }, [nhatKy]);

  useEffect(() => {
    localStorage.setItem('qlks_vai_tro_phien', vaiTroHienTai);
  }, [vaiTroHienTai]);

  // ─── NHÂN VIÊN ĐANG CHỌN ─────────────────────────────────────────────────────
  const nvDangChon = useMemo(() =>
    danhSachNV.find(nv => nv.id === idDangChon) || null,
    [danhSachNV, idDangChon]
  );

  // ─── ĐỒNG BỘ RBAC INSPECTOR KHI CHỌN NHÂN VIÊN MỚI ─────────────────────────
  useEffect(() => {
    if (nvDangChon) {
      setQuyenLamViec({ ...nvDangChon.quyenHan });
      setChinhSachLamViec({ ...nvDangChon.chinhSachBaoMat, baoMatMFA: true });
      setDaCoBanLuu(false);
    }
  }, [idDangChon]); // Chỉ chạy khi idDangChon thay đổi, không phụ thuộc danhSachNV

  // ─── HÀM GHI NHẬT KÝ ────────────────────────────────────────────────────────
  const ghiNhatKy = useCallback((hanhDong, mucTieu, chiTiet, ketQua = 'THÀNH CÔNG') => {
    const banGhi = {
      id: `NK-${Math.floor(1000 + Math.random() * 9000)}`,
      thoiGian: layThoiGian(),
      nguoiThucHien: nvDangChon?.id === maNVDangDangNhap
        ? `Nguyễn Thị Minh Châu (${maNVDangDangNhap})` 
        : `Người dùng [${vaiTroHienTai}]`,
      hanhDong, mucTieu, chiTiet, ketQua,
    };
    setNhatKy(prev => [banGhi, ...prev]);
  }, [vaiTroHienTai, nvDangChon, maNVDangDangNhap]);

  // ─── HÀM HIỂN THỊ TOAST ─────────────────────────────────────────────────────
  const hienThongBao = useCallback((noiDung, loai = 'thanh_cong') => {
    setThongBao({ noiDung, loai, id: Date.now() });
    setTimeout(() => setThongBao(null), 4500);
  }, []);

  // ─── KIỂM TRA QUYỀN QUẢN TRỊ ────────────────────────────────────────────────
  const kiemTraQuyenAdmin = useCallback(() => {
    if (!laQuanTriVien) {
      hienThongBao('Bạn không có quyền quản lý tài khoản nhân viên.', 'loi');
      ghiNhatKy('TRUY CẬP BỊ TỪ CHỐI', 'QUẢN LÝ NHÂN VIÊN',
        `Vai trò [${vaiTroHienTai}] không được phép thực hiện thao tác quản trị`, 'BỊ CHẶN');
      return false;
    }
    return true;
  }, [laQuanTriVien, hienThongBao, ghiNhatKy, vaiTroHienTai]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 1: TÌM KIẾM & LỌC
  // Kết hợp nhiều bộ lọc đồng thời, bảng cập nhật ngay lập tức
  // ═══════════════════════════════════════════════════════════════════════════════
  const danhSachDaLoc = useMemo(() => {
    const kw = tuKhoa.toLowerCase().trim();
    return danhSachNV.filter(nv => {
      const khopTimKiem = !kw ||
        nv.hoTen.toLowerCase().includes(kw) ||
        nv.id.toLowerCase().includes(kw) ||
        nv.email.toLowerCase().includes(kw) ||
        nv.phongBan.toLowerCase().includes(kw) ||
        nv.vaiTro.toLowerCase().includes(kw);

      const khopPhongBan  = locPhongBan  === 'TAT_CA' || nv.phongBan  === locPhongBan;
      const khopVaiTro    = locVaiTro    === 'TAT_CA' || nv.vaiTro    === locVaiTro;
      const khopTrangThai = locTrangThai === 'TAT_CA' || nv.trangThai === locTrangThai;

      return khopTimKiem && khopPhongBan && khopVaiTro && khopTrangThai;
    });
  }, [danhSachNV, tuKhoa, locPhongBan, locVaiTro, locTrangThai]);

  // Tổng số trang
  const tongSoTrang = Math.max(1, Math.ceil(danhSachDaLoc.length / SO_DONG_TRANG));

  // Reset về trang 1 khi bộ lọc thay đổi
  useEffect(() => { setTrangHienTai(1); }, [tuKhoa, locPhongBan, locVaiTro, locTrangThai]);

  // Đảm bảo trang không vượt quá tổng số trang
  useEffect(() => {
    if (trangHienTai > tongSoTrang) setTrangHienTai(tongSoTrang);
  }, [tongSoTrang, trangHienTai]);

  const danhSachTrang = useMemo(() => {
    const batDau = (trangHienTai - 1) * SO_DONG_TRANG;
    return danhSachDaLoc.slice(batDau, batDau + SO_DONG_TRANG);
  }, [danhSachDaLoc, trangHienTai]);

  // Số quyền đã cấp trong inspector
  const soQuyenDaCap = useMemo(() =>
    Object.values(quyenLamViec).filter(Boolean).length, [quyenLamViec]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 2: CẤP PHÁT NHÂN VIÊN MỚI
  // - Mã NV & email không được trùng
  // - Phải gán ít nhất 1 vai trò
  // ═══════════════════════════════════════════════════════════════════════════════
  const xuLyCapPhat = (e) => {
    e.preventDefault();
    setLoiFormNVMoi('');

    const id      = formNVMoi.id.trim().toUpperCase();
    const hoTen   = formNVMoi.hoTen.trim();
    const email   = formNVMoi.email.trim().toLowerCase();
    const vaiTro  = formNVMoi.vaiTro.trim();

    // Kiểm tra trường rỗng
    if (!id)     { setLoiFormNVMoi('Mã nhân viên không được để trống.'); return; }
    if (!hoTen)  { setLoiFormNVMoi('Họ và tên không được để trống.'); return; }
    if (!email)  { setLoiFormNVMoi('Địa chỉ email không được để trống.'); return; }

    // TEST CASE: Nhân viên mới phải gán ít nhất một vai trò
    if (!vaiTro) {
      setLoiFormNVMoi('Nhân viên mới phải được gán ít nhất một vai trò trước khi cấp phát.');
      return;
    }

    // Định dạng email cơ bản
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoiFormNVMoi('Địa chỉ email không đúng định dạng.');
      return;
    }

    // TEST CASE: Mã nhân viên không trùng
    if (danhSachNV.some(nv => nv.id.toUpperCase() === id)) {
      setLoiFormNVMoi(`Mã nhân viên "${id}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    // TEST CASE: Email không trùng
    if (danhSachNV.some(nv => nv.email.toLowerCase() === email)) {
      setLoiFormNVMoi(`Địa chỉ email "${email}" đã được sử dụng bởi một nhân viên khác.`);
      return;
    }

    // Tạo chữ viết tắt avatar từ tên
    const phanTen = hoTen.split(' ').filter(Boolean);
    const vienTat = phanTen.length >= 2
      ? (phanTen[0][0] + phanTen[phanTen.length - 1][0]).toUpperCase()
      : hoTen.substring(0, 2).toUpperCase();

    const nvMoi = {
      id, hoTen, email,
      phongBan: formNVMoi.phongBan,
      vaiTro,
      maVaiTro: `VAI_TRO #${id.replace('NV-', '')}`,
      trangThai: 'hoat_dong',
      vienTat,
      ngayVaoLam: layThoiGian().split(' ')[0],
      quyenHan: {
        quyen_checkin:      vaiTro.includes('Lễ Tân') || vaiTro.includes('Trưởng Ca'),
        quyen_chuyen_phong: false,
        quyen_the_tu:       true,
        quyen_buong_phong:  vaiTro.includes('Buồng') || vaiTro.includes('Dọn'),
        quyen_night_audit:  false,
        quyen_he_thong:     false,
      },
      chinhSachBaoMat: { hanMatKhauNgay: 60, thoiGianIdlePhut: 15, baoMatMFA: true, hanPhienGio: 8 },
    };

    setDanhSachNV(prev => [nvMoi, ...prev]);
    setIdDangChon(id); // Tự động chọn nhân viên vừa tạo → RBAC Inspector cập nhật

    ghiNhatKy('CẤP PHÁT TÀI KHOẢN', id,
      `Cấp phát thành công: ${hoTen} (${email}) với vai trò ${vaiTro}`);
    hienThongBao(`Đã cấp phát tài khoản ${hoTen} [${id}] thành công!`, 'thanh_cong');

    setModalCapPhat(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 3: TOGGLE QUYỀN HẠN
  // - Quyền cấp cao cần xác thực GM Key
  // - Các thay đổi chưa lưu được đánh dấu (cờ daCoBanLuu)
  // ═══════════════════════════════════════════════════════════════════════════════
  const xuLyToggleQuyen = (key, laCaoCapBac) => {
    if (!kiemTraQuyenAdmin()) return;

    const giaTriMoi = !quyenLamViec[key];

    // TEST CASE: Kích hoạt quyền cấp cao → yêu cầu xác thực GM Key
    if (giaTriMoi && laCaoCapBac) {
      setQuyenDangXacThuc(key);
      setGmKey('');
      setLoiGmKey('');
      setModalXacThuc(true);
      return;
    }

    setQuyenLamViec(prev => ({ ...prev, [key]: giaTriMoi }));
    setDaCoBanLuu(true); // Đánh dấu có thay đổi chưa lưu
  };

  // TEST CASE: Xác thực GM Key
  const xuLyXacThucGMKey = (e) => {
    e.preventDefault();
    const keyNhap = gmKey.trim().toUpperCase();

    if (GM_KEYS_HOP_LE.includes(keyNhap)) {
      setQuyenLamViec(prev => ({ ...prev, [quyenDangXacThuc]: true }));
      setDaCoBanLuu(true);
      ghiNhatKy('XÁC THỰC QUYỀN ĐẶC BIỆT', nvDangChon?.id || 'UNKNOWN',
        `Cấp quyền cao cấp [${quyenDangXacThuc}] qua khóa GM`);
      hienThongBao('Xác thực thành công! Đã cấp quyền đặc biệt.', 'thanh_cong');
      setModalXacThuc(false);
    } else {
      setLoiGmKey('Quyền này yêu cầu xác thực từ cấp quản lý cao hơn.');
      ghiNhatKy('XÁC THỰC THẤT BẠI', nvDangChon?.id || 'UNKNOWN',
        `Nhập sai khóa GM khi cố cấp quyền [${quyenDangXacThuc}]`, 'BỊ CHẶN');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 4: CHÍNH SÁCH BẢO MẬT — Giá trị trong khoảng cho phép
  // hanMatKhauNgay: 15–365, thoiGianIdlePhut: 1–120, hanPhienGio: 1–24
  // MFA bắt buộc không thể tắt
  // ═══════════════════════════════════════════════════════════════════════════════
  const capNhatChinhSach = (truong, giaTriRaw) => {
    if (!kiemTraQuyenAdmin()) return;
    const giaTri = Number(giaTriRaw);
    setChinhSachLamViec(prev => ({ ...prev, [truong]: isNaN(giaTri) ? prev[truong] : giaTri }));
    setDaCoBanLuu(true);
  };

  const kiemTraChinhSachHopLe = () => {
    const { hanMatKhauNgay, thoiGianIdlePhut, hanPhienGio } = chinhSachLamViec;
    const exp = Number(hanMatKhauNgay);
    const idle = Number(thoiGianIdlePhut);
    const sess = Number(hanPhienGio);
    if (isNaN(exp)  || exp  < 15  || exp  > 365) return 'Hạn mật khẩu phải từ 15 đến 365 ngày.';
    if (isNaN(idle) || idle < 1   || idle > 120) return 'Thời gian tự khóa phải từ 1 đến 120 phút.';
    if (isNaN(sess) || sess < 1   || sess > 24)  return 'Thời hạn phiên token phải từ 1 đến 24 giờ.';
    return null;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 5: LƯU THAY ĐỔI — Cập nhật danhSachNV, reset cờ thay đổi
  // ═══════════════════════════════════════════════════════════════════════════════
  const xuLyLuuThayDoi = () => {
    if (!kiemTraQuyenAdmin() || !nvDangChon) return;

    const loiChinhSach = kiemTraChinhSachHopLe();
    if (loiChinhSach) {
      hienThongBao(`Giá trị chính sách không hợp lệ: ${loiChinhSach}`, 'loi');
      return;
    }

    setDanhSachNV(prev => prev.map(nv =>
      nv.id === nvDangChon.id
        ? {
            ...nv,
            quyenHan: { ...quyenLamViec },
            chinhSachBaoMat: {
              hanMatKhauNgay:   Number(chinhSachLamViec.hanMatKhauNgay),
              thoiGianIdlePhut: Number(chinhSachLamViec.thoiGianIdlePhut),
              baoMatMFA:        true, // MFA bắt buộc không thể thay đổi
              hanPhienGio:      Number(chinhSachLamViec.hanPhienGio),
            },
          }
        : nv
    ));

    setDaCoBanLuu(false); // Xóa cờ thay đổi sau khi lưu
    ghiNhatKy('LƯU THAY ĐỔI PHÂN QUYỀN', nvDangChon.id,
      `Đã lưu cấu hình RBAC và chính sách bảo mật cho ${nvDangChon.hoTen}`);
    hienThongBao(`Đã lưu thay đổi phân quyền cho ${nvDangChon.hoTen} thành công.`, 'thanh_cong');
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 6: NHÂN BẢN VAI TRÒ
  // ═══════════════════════════════════════════════════════════════════════════════
  const xuLyNhanBan = (e) => {
    e.preventDefault();
    if (!kiemTraQuyenAdmin() || !nvDangChon) return;
    if (!tenVaiTroMoi.trim()) { hienThongBao('Tên vai trò mới không được để trống.', 'loi'); return; }
    ghiNhatKy('NHÂN BẢN VAI TRÒ', nvDangChon.vaiTro,
      `Sao chép hồ sơ từ "${nvDangChon.vaiTro}" sang "${tenVaiTroMoi.trim()}"`);
    hienThongBao(`Đã nhân bản vai trò thành "${tenVaiTroMoi.trim()}" thành công!`, 'thanh_cong');
    setModalNhanBan(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST CASE 7: THU HỒI QUYỀN TRUY CẬP
  // - Không thể thu hồi tài khoản đang đăng nhập
  // - Có hiệu lực ngay, cần xác nhận
  // ═══════════════════════════════════════════════════════════════════════════════
  const khoiDongThuHoi = () => {
    if (!kiemTraQuyenAdmin() || !nvDangChon) return;

    // TEST CASE: Không thể thu hồi chính tài khoản đang đăng nhập
    if (nvDangChon.id === maNVDangDangNhap) {
      hienThongBao('Không thể thu hồi quyền của tài khoản đang đăng nhập.', 'loi');
      ghiNhatKy('TỪ CHỐI THU HỒI', nvDangChon.id,
        'Không thể đình chỉ chính tài khoản đang hoạt động trong phiên này', 'BỊ CHẶN');
      return;
    }

    // TEST CASE: Không thể thu hồi tài khoản đã bị thu hồi trước đó
    if (nvDangChon.trangThai === 'da_thu_hoi') {
      hienThongBao('Tài khoản này đã bị thu hồi quyền trước đó.', 'loi');
      return;
    }

    setModalThuHoi(true);
  };

  const xacNhanThuHoi = () => {
    if (!nvDangChon) return;

    // Xóa tất cả quyền và chuyển trạng thái → da_thu_hoi (có hiệu lực ngay)
    setDanhSachNV(prev => prev.map(nv =>
      nv.id === nvDangChon.id
        ? {
            ...nv,
            trangThai: 'da_thu_hoi',
            quyenHan: {
              quyen_checkin:      false,
              quyen_chuyen_phong: false,
              quyen_the_tu:       false,
              quyen_buong_phong:  false,
              quyen_night_audit:  false,
              quyen_he_thong:     false,
            },
          }
        : nv
    ));

    // Cập nhật RBAC Inspector ngay lập tức để phản ánh trạng thái mới
    setQuyenLamViec({
      quyen_checkin: false, quyen_chuyen_phong: false,
      quyen_the_tu: false,  quyen_buong_phong:  false,
      quyen_night_audit: false, quyen_he_thong: false,
    });
    setDaCoBanLuu(false);

    ghiNhatKy('THU HỒI QUYỀN TRUY CẬP', nvDangChon.id,
      `Thu hồi toàn bộ quyền & đình chỉ tài khoản ${nvDangChon.hoTen} — có hiệu lực ngay`);
    hienThongBao(`Đã thu hồi quyền truy cập của ${nvDangChon.hoTen} [${nvDangChon.id}].`, 'thong_tin');
    setModalThuHoi(false);
  };

  // ─── ĐỊNH NGHĨA VAI TRÒ MỚI ──────────────────────────────────────────────────
  const xuLyDinhNghiaVaiTro = (e) => {
    e.preventDefault();
    if (!formVaiTro.tenVaiTro.trim()) { hienThongBao('Tên vai trò không được để trống.', 'loi'); return; }
    ghiNhatKy('ĐỊNH NGHĨA VAI TRÒ', `VAI_TRO #${Date.now()}`,
      `Tạo mới vai trò: "${formVaiTro.tenVaiTro}" thuộc phòng ban "${formVaiTro.phongBan}"`);
    hienThongBao(`Đã tạo vai trò "${formVaiTro.tenVaiTro}" thành công!`, 'thanh_cong');
    setModalVaiTro(false);
  };

  // ─── XÓA BỘ LỌC ─────────────────────────────────────────────────────────────
  const xoaBoDam = () => {
    setTuKhoa(''); setLocPhongBan('TAT_CA'); setLocVaiTro('TAT_CA'); setLocTrangThai('TAT_CA');
  };

  // ─── KPI TỔNG QUAN ───────────────────────────────────────────────────────────
  const soHoatDong  = danhSachNV.filter(nv => nv.trangThai === 'hoat_dong').length;
  const soThuHoi    = danhSachNV.filter(nv => nv.trangThai === 'da_thu_hoi').length;
  const soPhongBan  = new Set(danhSachNV.map(nv => nv.phongBan)).size;

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <AdminLayout>
      <div className="flex flex-col w-full">

        {/* ── Toast Thông Báo ─────────────────────────────────────────────────── */}
        {thongBao && (
          <div className={`fixed top-20 right-6 z-[200] max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl font-label-md text-label-md font-semibold transition-all duration-300 ${
            thongBao.loai === 'loi'       ? 'bg-error text-white shadow-error/30'
            : thongBao.loai === 'thong_tin' ? 'bg-surface-container-highest text-on-surface border border-outline-variant'
            : 'bg-admin-primary text-white shadow-admin-primary/30'
          }`}>
            <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
              {thongBao.loai === 'loi' ? 'error' : thongBao.loai === 'thong_tin' ? 'info' : 'check_circle'}
            </span>
            <span className="font-body-sm">{thongBao.noiDung}</span>
          </div>
        )}

        {/* ── Tiêu Đề Trang ───────────────────────────────────────────────────── */}
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-space-md mb-space-lg">
          <div>
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold flex-wrap mb-1">
              <span>PMS Quản Trị</span>
              <span className="text-outline-variant">//</span>
              <span className="text-on-surface-variant">Bảo Mật & Nhân Sự</span>
              <span className="text-outline-variant">//</span>
              <span>Quản Lý Tài Khoản & Phân Quyền RBAC</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
              Quản Lý Tài Khoản & Phân Quyền Nội Bộ
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Cấp phát, phân quyền RBAC và giám sát bảo mật cho toàn bộ nhân viên — Quản Trị Viên, Lễ Tân, Bếp, Buồng Phòng.
            </p>
          </div>

          <div className="flex flex-col items-start xl:items-end gap-space-sm">
            {/* Giả lập vai trò phiên */}
            <div className="flex items-center gap-2 px-space-sm py-space-xs bg-surface-container-low rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">manage_accounts</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">Vai trò thử nghiệm:</span>
              <select
                value={vaiTroHienTai}
                onChange={e => { setVaiTroHienTai(e.target.value); hienThongBao(`Đã chuyển sang vai trò giả lập: ${e.target.value}`, 'thong_tin'); }}
                className="bg-transparent font-label-md text-label-md text-admin-primary font-bold focus:outline-none cursor-pointer"
              >
                <option value="Quản Trị Viên">Quản Trị Viên (Admin)</option>
                <option value="Nhân Viên Lễ Tân">Nhân Viên Lễ Tân</option>
                <option value="Nhân Viên Bếp">Nhân Viên Bếp (F&B)</option>
                <option value="Nhân Viên Buồng Phòng">Nhân Viên Buồng Phòng</option>
              </select>
            </div>

            {/* Thanh công cụ nhân sự */}
            <div className="flex flex-wrap items-center gap-space-sm">
              <button
                onClick={() => {
                  if (!kiemTraQuyenAdmin()) return;
                  setFormNVMoi({ id: taoMaNV(), hoTen: '', email: '', phongBan: DANH_SACH_PHONG_BAN[0], vaiTro: '' });
                  setLoiFormNVMoi('');
                  setModalCapPhat(true);
                }}
                className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>+ Cấp Phát Nhân Viên Mới</span>
              </button>

              <button
                onClick={() => {
                  if (!kiemTraQuyenAdmin()) return;
                  setFormVaiTro({ tenVaiTro: '', phongBan: DANH_SACH_PHONG_BAN[0] });
                  setModalVaiTro(true);
                }}
                className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg border border-outline-variant hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Định Nghĩa Vai Trò</span>
              </button>

              <button
                onClick={() => {
                  if (!kiemTraQuyenAdmin()) return;
                  setModalNhatKy(true);
                }}
                className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg border border-outline-variant hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span>Nhật Ký Kiểm Toán</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Thẻ KPI Tổng Quan ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
          {[
            { nhan: 'Tổng Nhân Viên',       gia_tri: danhSachNV.length, phu: `${soHoatDong} đang hoạt động`,       bieu_tuong: 'group',          mau: 'text-admin-primary' },
            { nhan: 'Đã Thu Hồi Quyền',     gia_tri: soThuHoi,          phu: 'Tài khoản bị đình chỉ',             bieu_tuong: 'block',          mau: 'text-error'         },
            { nhan: 'Số Phòng Ban',          gia_tri: soPhongBan,        phu: 'Nhóm chức năng',                    bieu_tuong: 'domain',         mau: 'text-secondary'     },
            { nhan: 'Bảo Mật MFA',           gia_tri: '100%',            phu: 'Bắt buộc toàn hệ thống',           bieu_tuong: 'verified_user',  mau: 'text-admin-primary' },
          ].map((the, i) => (
            <div key={i} className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{the.nhan}</span>
                <span className={`material-symbols-outlined text-[20px] ${the.mau}`}>{the.bieu_tuong}</span>
              </div>
              <div className="flex items-baseline gap-space-xs">
                <span className={`font-headline-lg text-headline-lg font-bold font-mono ${the.mau}`}>{the.gia_tri}</span>
              </div>
              <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">{the.phu}</div>
            </div>
          ))}
        </div>

        {/* ── Bộ Lọc & Tìm Kiếm ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-space-sm mb-space-md">
          {/* Ô tìm kiếm */}
          <div className="flex-1 min-w-[260px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
            <input
              type="text"
              value={tuKhoa}
              onChange={e => setTuKhoa(e.target.value)}
              placeholder="Tìm theo tên, mã NV, email, phòng ban, vai trò..."
              className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary/30 transition-all"
            />
            {tuKhoa && (
              <button onClick={() => setTuKhoa('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Lọc Phòng Ban */}
          <div className="flex items-center gap-2 px-space-sm py-2 bg-surface-container-lowest border border-outline-variant rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold whitespace-nowrap">Phòng Ban:</span>
            <select value={locPhongBan} onChange={e => setLocPhongBan(e.target.value)}
              className="bg-transparent font-label-md text-label-md text-on-surface font-semibold focus:outline-none cursor-pointer">
              <option value="TAT_CA">Tất Cả</option>
              {DANH_SACH_PHONG_BAN.map(pb => <option key={pb} value={pb}>{pb}</option>)}
            </select>
          </div>

          {/* Lọc Vai Trò */}
          <div className="flex items-center gap-2 px-space-sm py-2 bg-surface-container-lowest border border-outline-variant rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold whitespace-nowrap">Vai Trò:</span>
            <select value={locVaiTro} onChange={e => setLocVaiTro(e.target.value)}
              className="bg-transparent font-label-md text-label-md text-on-surface font-semibold focus:outline-none cursor-pointer">
              <option value="TAT_CA">Tất Cả</option>
              {DANH_SACH_VAI_TRO.map(vt => <option key={vt} value={vt}>{vt}</option>)}
            </select>
          </div>

          {/* Lọc Trạng Thái */}
          <div className="flex items-center gap-2 px-space-sm py-2 bg-surface-container-lowest border border-outline-variant rounded-lg">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold whitespace-nowrap">Trạng Thái:</span>
            <select value={locTrangThai} onChange={e => setLocTrangThai(e.target.value)}
              className="bg-transparent font-label-md text-label-md text-on-surface font-semibold focus:outline-none cursor-pointer">
              <option value="TAT_CA">Tất Cả</option>
              <option value="hoat_dong">Hoạt Động</option>
              <option value="tam_dung">Tạm Dừng</option>
              <option value="da_thu_hoi">Đã Thu Hồi</option>
            </select>
          </div>
        </div>

        {/* ── Nội Dung Chính (Bảng + RBAC Inspector) ─────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">

          {/* ── Bảng Nhân Viên ─────────────────────────────────────────────── */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 overflow-hidden flex flex-col">

              {/* Header bảng */}
              <div className="px-space-lg py-space-sm border-b border-outline-variant flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px] text-admin-primary">badge</span>
                  <span className="font-title-md text-title-md text-on-surface font-semibold">Danh Sách Nhân Viên</span>
                  <span className="bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full">
                    {danhSachDaLoc.length} / {danhSachNV.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-admin-primary" />
                  </span>
                  <span className="font-label-sm text-label-sm text-admin-primary font-semibold">ĐỒNG BỘ THỜI GIAN THỰC</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto min-h-[320px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container/60 border-b border-outline-variant">
                      {['Mã NV', 'Nhân Viên', 'Phòng Ban', 'Vai Trò', 'Trạng Thái'].map(h => (
                        <th key={h} className="py-space-sm px-space-md font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {danhSachTrang.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 block mb-2">manage_search</span>
                          <p className="font-body-md text-body-md text-on-surface-variant mb-3">Không tìm thấy nhân viên phù hợp.</p>
                          <button onClick={xoaBoDam}
                            className="px-space-md py-space-xs bg-admin-primary text-white rounded-lg font-label-md text-label-md hover:brightness-110 transition-all">
                            Xóa Bộ Lọc
                          </button>
                        </td>
                      </tr>
                    ) : danhSachTrang.map((nv) => {
                      const dangChon = idDangChon === nv.id;
                      const trangThai = nhanDangTrangThai(nv.trangThai);

                      return (
                        <tr
                          key={nv.id}
                          onClick={() => setIdDangChon(nv.id)}
                          className={`cursor-pointer transition-all ${
                            dangChon ? 'bg-admin-primary/5 border-l-2 border-l-admin-primary' : 'hover:bg-surface-container/50'
                          }`}
                        >
                          {/* Mã NV */}
                          <td className="py-3 px-space-md">
                            <span className="font-label-md text-label-md text-on-surface-variant font-mono">{nv.id}</span>
                          </td>

                          {/* Họ Tên + Email */}
                          <td className="py-3 px-space-md">
                            <div className="flex items-center gap-space-sm">
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${layMauAvatar(nv.id)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                <span className="font-label-md text-label-md text-white font-bold">{nv.vienTat}</span>
                              </div>
                              <div>
                                <div className={`font-body-md text-body-md font-semibold ${dangChon ? 'text-admin-primary' : 'text-on-surface'}`}>
                                  {nv.hoTen}
                                  {nv.id === maNVDangDangNhap && (
                                    <span className="ml-1.5 text-[10px] bg-admin-primary/10 text-admin-primary px-1.5 py-0.5 rounded-full font-bold uppercase">Tôi</span>
                                  )}
                                </div>
                                <div className="font-label-sm text-label-sm text-on-surface-variant">{nv.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Phòng Ban */}
                          <td className="py-3 px-space-md">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{nv.phongBan}</span>
                          </td>

                          {/* Vai Trò */}
                          <td className="py-3 px-space-md">
                            <span className="font-label-md text-label-md text-on-surface font-semibold">{nv.vaiTro}</span>
                          </td>

                          {/* Trạng Thái */}
                          <td className="py-3 px-space-md">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${trangThai.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${trangThai.dot}`} />
                              {trangThai.nhan}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân Trang */}
              <div className="px-space-lg py-space-sm border-t border-outline-variant bg-surface-container/30 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Hiển thị {danhSachTrang.length} / {danhSachDaLoc.length} nhân viên — Trang {trangHienTai} / {tongSoTrang}
                </span>
                <div className="flex items-center gap-space-xs">
                  <button onClick={() => setTrangHienTai(p => Math.max(1, p - 1))} disabled={trangHienTai === 1}
                    className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: tongSoTrang }, (_, i) => i + 1).map(trang => (
                    <button key={trang} onClick={() => setTrangHienTai(trang)}
                      className={`w-8 h-8 rounded-lg font-label-md text-label-md font-semibold transition-all ${
                        trangHienTai === trang ? 'bg-admin-primary text-white shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}>
                      {trang}
                    </button>
                  ))}
                  <button onClick={() => setTrangHienTai(p => Math.min(tongSoTrang, p + 1))} disabled={trangHienTai === tongSoTrang}
                    className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RBAC Inspector ──────────────────────────────────────────────── */}
          <div className="xl:col-span-5 flex flex-col gap-space-md">
            {nvDangChon ? (
              <>
                {/* Thẻ Hồ Sơ Nhân Viên */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 p-space-lg">
                  <div className="flex items-start gap-space-md">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${layMauAvatar(nvDangChon.id)} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <span className="font-headline-sm text-headline-sm text-white font-bold">{nvDangChon.vienTat}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">
                            {nvDangChon.hoTen}
                            {nvDangChon.id === maNVDangDangNhap && (
                              <span className="ml-2 text-xs bg-admin-primary/10 text-admin-primary px-2 py-0.5 rounded-full font-bold uppercase">Đang Đăng Nhập</span>
                            )}
                          </h2>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{nvDangChon.email}</p>
                        </div>
                        {(() => { const ts = nhanDangTrangThai(nvDangChon.trangThai); return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold ${ts.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ts.dot}`} />{ts.nhan}
                          </span>
                        ); })()}
                      </div>
                      <div className="flex flex-wrap items-center gap-space-sm mt-space-sm">
                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">badge</span>{nvDangChon.id}
                        </span>
                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">domain</span>{nvDangChon.phongBan}
                        </span>
                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-admin-primary font-semibold">
                          <span className="material-symbols-outlined text-[14px]">work</span>{nvDangChon.vaiTro}
                        </span>
                      </div>
                      <div className="flex items-center gap-space-md mt-space-xs font-label-sm text-label-sm text-on-surface-variant/70">
                        <span>{nvDangChon.maVaiTro}</span>
                        <span>Ngày vào: {nvDangChon.ngayVaoLam}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Phân Quyền RBAC */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 p-space-lg">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-[20px] text-admin-primary">security</span>
                      <span className="font-title-md text-title-md text-on-surface font-semibold">Sơ Đồ Phân Quyền RBAC</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      {daCoBanLuu && (
                        <span className="flex items-center gap-1 text-secondary font-label-sm text-label-sm font-semibold bg-secondary/10 px-2 py-0.5 rounded-full">
                          <span className="material-symbols-outlined text-[13px]">edit</span>Chưa lưu
                        </span>
                      )}
                      <span className="bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full">
                        {soQuyenDaCap} / 6 Quyền
                      </span>
                    </div>
                  </div>

                  <div className="space-y-space-sm">
                    {CAU_HINH_QUYEN.map(quyen => {
                      const daBat = !!quyenLamViec[quyen.key];
                      return (
                        <div
                          key={quyen.key}
                          onClick={() => xuLyToggleQuyen(quyen.key, quyen.laCaoCapBac)}
                          className={`group flex items-start gap-space-md p-space-md rounded-xl border transition-all cursor-pointer select-none ${
                            quyen.laCaoCapBac
                              ? daBat
                                ? 'border-secondary/40 bg-secondary/5 hover:bg-secondary/10'
                                : 'border-dashed border-outline-variant bg-surface-container/40 hover:bg-surface-container'
                              : daBat
                                ? 'border-admin-primary/30 bg-admin-primary/5 hover:bg-admin-primary/8'
                                : 'border-outline-variant/50 bg-surface-container/30 hover:bg-surface-container'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            daBat
                              ? quyen.laCaoCapBac ? 'bg-secondary border-secondary' : 'bg-admin-primary border-admin-primary'
                              : 'bg-white border-outline-variant group-hover:border-admin-primary/50'
                          }`}>
                            {daBat && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-space-xs flex-wrap mb-0.5">
                              <span className={`material-symbols-outlined text-[16px] ${daBat ? (quyen.laCaoCapBac ? 'text-secondary' : 'text-admin-primary') : 'text-on-surface-variant'}`}>
                                {quyen.icon}
                              </span>
                              <span className={`font-label-lg text-label-lg font-semibold ${daBat ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                {quyen.tieuDe}
                              </span>
                              {quyen.laCaoCapBac && (
                                <span className="ml-auto flex items-center gap-0.5 font-label-sm text-label-sm text-secondary/70 font-semibold">
                                  <span className="material-symbols-outlined text-[13px]">lock</span>Đặc Quyền
                                </span>
                              )}
                            </div>
                            <p className={`font-body-sm text-body-sm ${quyen.laCaoCapBac && !daBat ? 'text-secondary/60 font-semibold' : 'text-on-surface-variant'}`}>
                              {quyen.moTa}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chính Sách Bảo Mật */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 p-space-lg">
                  <div className="flex items-center gap-space-sm mb-space-md">
                    <span className="material-symbols-outlined text-[20px] text-admin-primary">policy</span>
                    <span className="font-title-md text-title-md text-on-surface font-semibold">Chính Sách Bảo Mật</span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm mb-space-sm">
                    {/* Hạn Mật Khẩu */}
                    <div className="p-space-md bg-surface-container rounded-xl border border-outline-variant/50">
                      <div className="flex items-center gap-1 mb-space-xs">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">key</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">Hạn Mật Khẩu</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="15" max="365"
                          value={chinhSachLamViec.hanMatKhauNgay}
                          onChange={e => capNhatChinhSach('hanMatKhauNgay', e.target.value)}
                          className="w-14 bg-transparent font-headline-sm text-headline-sm font-bold text-on-surface border-b-2 border-admin-primary focus:outline-none"
                        />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">ngày (15–365)</span>
                      </div>
                    </div>

                    {/* Thời Gian Idle */}
                    <div className="p-space-md bg-surface-container rounded-xl border border-outline-variant/50">
                      <div className="flex items-center gap-1 mb-space-xs">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">timer</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">Tự Khóa Idle</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="1" max="120"
                          value={chinhSachLamViec.thoiGianIdlePhut}
                          onChange={e => capNhatChinhSach('thoiGianIdlePhut', e.target.value)}
                          className="w-14 bg-transparent font-headline-sm text-headline-sm font-bold text-on-surface border-b-2 border-admin-primary focus:outline-none"
                        />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">phút (1–120)</span>
                      </div>
                    </div>
                  </div>

                  {/* MFA Bắt Buộc */}
                  <div className="flex items-center justify-between p-space-md bg-admin-primary/5 border border-admin-primary/20 rounded-xl mb-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-[18px] text-admin-primary">verified_user</span>
                      <div>
                        <div className="font-label-md text-label-md text-on-surface font-semibold">Xác Thực Đa Yếu Tố (MFA)</div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant">Chính sách toàn hệ thống — không thể tắt</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => hienThongBao('MFA bắt buộc toàn hệ thống. Không thể tắt theo chính sách bảo mật PMS.', 'loi')}
                      className="flex items-center gap-1 bg-admin-primary text-white px-space-sm py-space-xs rounded-lg font-label-sm text-label-sm font-bold cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      BẮT BUỘC
                    </button>
                  </div>

                  {/* Thời Hạn Phiên Token */}
                  <div className="p-space-md bg-surface-container rounded-xl border border-outline-variant/50">
                    <div className="flex items-center justify-between mb-space-sm">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">token</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">Thời Hạn Phiên Token</span>
                      </div>
                      <span className="font-label-md text-label-md text-admin-primary font-bold">
                        {String(chinhSachLamViec.hanPhienGio).padStart(2, '0')}:00:00
                      </span>
                    </div>
                    <input
                      type="range" min="1" max="24"
                      value={chinhSachLamViec.hanPhienGio}
                      onChange={e => capNhatChinhSach('hanPhienGio', e.target.value)}
                      className="w-full accent-admin-primary cursor-pointer"
                    />
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mt-1">
                      <span>1 giờ</span><span>24 giờ</span>
                    </div>
                  </div>
                </div>

                {/* Nút Hành Động */}
                <div className="flex flex-col gap-space-sm">
                  <button
                    onClick={xuLyLuuThayDoi}
                    className={`w-full flex items-center justify-center gap-space-sm px-space-lg py-space-md font-title-md text-title-md font-bold rounded-xl transition-all shadow-sm ${
                      daCoBanLuu
                        ? 'bg-admin-primary-container text-on-admin-primary hover:brightness-105 shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-pulse-slow'
                        : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    {daCoBanLuu ? 'Lưu Thay Đổi Phân Quyền *' : 'Lưu Thay Đổi Phân Quyền'}
                  </button>

                  <div className="grid grid-cols-2 gap-space-sm">
                    <button
                      onClick={() => {
                        if (!kiemTraQuyenAdmin() || !nvDangChon) return;
                        setTenVaiTroMoi(`${nvDangChon.vaiTro} (Bản Sao)`);
                        setModalNhanBan(true);
                      }}
                      className="flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-lg text-label-lg font-semibold rounded-xl border border-outline-variant hover:bg-surface-container-high transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      Nhân Bản Vai Trò
                    </button>
                    <button
                      onClick={khoiDongThuHoi}
                      className="flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-error/5 text-error font-label-lg text-label-lg font-semibold rounded-xl border border-error/25 hover:bg-error/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                      Thu Hồi Quyền
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-16 flex flex-col items-center justify-center text-center gap-space-sm">
                <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30">manage_accounts</span>
                <p className="font-body-md text-body-md text-on-surface-variant">Chọn một nhân viên để xem và chỉnh sửa phân quyền RBAC</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          CÁC MODAL / HỘP THOẠI
      ═══════════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal 1: Cấp Phát Nhân Viên Mới ─────────────────────────────────── */}
      {modalCapPhat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-3 border border-outline-variant overflow-hidden">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[22px] text-admin-primary">person_add</span>
                <div>
                  <div className="font-title-md text-title-md text-on-surface font-semibold">Cấp Phát Tài Khoản Nhân Viên Mới</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">Mã NV và email phải là duy nhất trong hệ thống</div>
                </div>
              </div>
              <button onClick={() => setModalCapPhat(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={xuLyCapPhat} className="p-space-lg space-y-space-md">
              {loiFormNVMoi && (
                <div className="flex items-start gap-space-sm p-space-md bg-error/5 border border-error/25 rounded-xl text-error font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">error</span>
                  {loiFormNVMoi}
                </div>
              )}

              {/* Mã Nhân Viên */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Mã Nhân Viên <span className="text-error">*</span>
                </label>
                <input
                  type="text" required
                  value={formNVMoi.id}
                  onChange={e => setFormNVMoi(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                  placeholder="VD: NV-5099"
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary/30 transition-all font-mono"
                />
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Mã định danh duy nhất trên PMS — không được trùng</p>
              </div>

              {/* Họ Và Tên */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Họ Và Tên Đầy Đủ <span className="text-error">*</span>
                </label>
                <input
                  type="text" required
                  value={formNVMoi.hoTen}
                  onChange={e => setFormNVMoi(p => ({ ...p, hoTen: e.target.value }))}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary/30 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Địa Chỉ Email Nội Bộ <span className="text-error">*</span>
                </label>
                <input
                  type="email" required
                  value={formNVMoi.email}
                  onChange={e => setFormNVMoi(p => ({ ...p, email: e.target.value }))}
                  placeholder="VD: nguyen.a@grandhorizon.vn"
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary/30 transition-all"
                />
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Email không được trùng với bất kỳ nhân viên nào khác</p>
              </div>

              {/* Phòng Ban */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">Phòng Ban <span className="text-error">*</span></label>
                <select
                  value={formNVMoi.phongBan}
                  onChange={e => setFormNVMoi(p => ({ ...p, phongBan: e.target.value }))}
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-admin-primary transition-all"
                >
                  {DANH_SACH_PHONG_BAN.map(pb => <option key={pb} value={pb}>{pb}</option>)}
                </select>
              </div>

              {/* Vai Trò — BẮT BUỘC */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Vai Trò Phân Quyền <span className="text-error">*</span>
                  <span className="text-admin-primary normal-case font-normal ml-1">(bắt buộc gán ít nhất 1)</span>
                </label>
                <select
                  required
                  value={formNVMoi.vaiTro}
                  onChange={e => setFormNVMoi(p => ({ ...p, vaiTro: e.target.value }))}
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-admin-primary transition-all"
                >
                  <option value="">-- Chọn vai trò cho nhân viên --</option>
                  {DANH_SACH_VAI_TRO.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button type="button" onClick={() => setModalCapPhat(false)}
                  className="px-space-lg py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-all">
                  Hủy Bỏ
                </button>
                <button type="submit"
                  className="px-space-lg py-2.5 rounded-xl bg-admin-primary text-white font-label-lg text-label-lg font-bold hover:brightness-110 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all">
                  Cấp Phát Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Định Nghĩa Vai Trò Tùy Chỉnh ──────────────────────────── */}
      {modalVaiTro && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-3 border border-outline-variant overflow-hidden">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[22px] text-admin-primary">tune</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold">Định Nghĩa Vai Trò Tùy Chỉnh</span>
              </div>
              <button onClick={() => setModalVaiTro(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={xuLyDinhNghiaVaiTro} className="p-space-lg space-y-space-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">Tên Vai Trò Mới <span className="text-error">*</span></label>
                <input required type="text" placeholder="VD: Trưởng Ca Tối Cao Cấp"
                  value={formVaiTro.tenVaiTro}
                  onChange={e => setFormVaiTro(p => ({ ...p, tenVaiTro: e.target.value }))}
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-admin-primary transition-all"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">Phòng Ban Quản Lý</label>
                <select value={formVaiTro.phongBan} onChange={e => setFormVaiTro(p => ({ ...p, phongBan: e.target.value }))}
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-admin-primary transition-all">
                  {DANH_SACH_PHONG_BAN.map(pb => <option key={pb} value={pb}>{pb}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button type="button" onClick={() => setModalVaiTro(false)}
                  className="px-space-lg py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-all">Hủy</button>
                <button type="submit"
                  className="px-space-lg py-2.5 rounded-xl bg-admin-primary text-white font-label-lg text-label-lg font-bold hover:brightness-110 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all">Tạo Vai Trò</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Nhật Ký Kiểm Toán ──────────────────────────────────────── */}
      {modalNhatKy && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-3 border border-outline-variant overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[22px] text-admin-primary">history</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold">Nhật Ký Kiểm Toán Bảo Mật</span>
                <span className="bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full">
                  {nhatKy.length} sự kiện
                </span>
              </div>
              <button onClick={() => setModalNhatKy(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-space-lg">
              <div className="space-y-space-sm">
                {nhatKy.map(bk => (
                  <div key={bk.id} className="flex items-start gap-space-md p-space-md bg-surface-container-lowest border border-outline-variant/50 rounded-xl">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${bk.ketQua === 'THÀNH CÔNG' ? 'bg-admin-primary' : 'bg-error'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-0.5">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">{bk.hanhDong}</span>
                        <span className={`font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full ${bk.ketQua === 'THÀNH CÔNG' ? 'bg-admin-primary/10 text-admin-primary' : 'bg-error/10 text-error'}`}>
                          {bk.ketQua}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">{bk.chiTiet}</p>
                      <div className="flex items-center flex-wrap gap-space-md font-label-sm text-label-sm text-on-surface-variant">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">person</span>{bk.nguoiThucHien}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">target</span>{bk.mucTieu}</span>
                        <span className="ml-auto font-mono text-[11px]">{bk.thoiGian}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-space-lg py-space-sm border-t border-outline-variant bg-surface-container/30 flex-shrink-0 flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Ghi nhận tự động bởi Bộ Điều Phối Bảo Mật PMS v4.2</span>
              <button onClick={() => setModalNhatKy(false)}
                className="px-space-lg py-2.5 rounded-xl bg-admin-primary text-white font-label-lg text-label-lg font-bold hover:brightness-110 transition-all">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Xác Thực GM Key (Quyền Đặc Biệt) ──────────────────────── */}
      {modalXacThuc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-3 border border-outline-variant overflow-hidden">
            <div className="flex items-center gap-space-sm px-space-lg py-space-md border-b border-outline-variant bg-surface-container-lowest">
              <span className="material-symbols-outlined text-[22px] text-secondary">admin_panel_settings</span>
              <div>
                <div className="font-title-md text-title-md text-on-surface font-semibold">Xác Thực Quyền Đặc Biệt Cấp Cao</div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">Yêu cầu xác thực từ cấp quản lý cao hơn</div>
              </div>
            </div>
            <form onSubmit={xuLyXacThucGMKey} className="p-space-lg space-y-space-md">
              <div className="flex items-start gap-space-sm p-space-md bg-secondary/5 border border-secondary/25 rounded-xl">
                <span className="material-symbols-outlined text-[20px] text-secondary flex-shrink-0 mt-0.5">warning</span>
                <div className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  Quyền hạn này can thiệp vào vận hành lõi của hệ thống PMS. Bạn cần nhập <strong>Khóa Tổng Quản Lý (GM Key)</strong> hoặc mã <strong>Quản Trị Viên Hệ Thống</strong> để tiếp tục.
                  <br /><span className="text-on-surface-variant italic text-xs mt-1 block">Gợi ý thử nghiệm: GM-KEY-2026 hoặc SUPERADMIN hoặc GRANDHORIZON</span>
                </div>
              </div>

              {loiGmKey && (
                <div className="flex items-center gap-space-sm p-space-md bg-error/5 border border-error/25 rounded-xl text-error font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {loiGmKey}
                </div>
              )}

              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Khóa Phê Duyệt Tổng Quản Lý <span className="text-error">*</span>
                </label>
                <input
                  required type="password"
                  value={gmKey}
                  onChange={e => setGmKey(e.target.value)}
                  placeholder="Nhập khóa xác thực..."
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface tracking-widest focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all"
                />
              </div>

              <div className="flex justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button type="button" onClick={() => setModalXacThuc(false)}
                  className="px-space-lg py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-all">Hủy</button>
                <button type="submit"
                  className="px-space-lg py-2.5 rounded-xl bg-secondary text-white font-label-lg text-label-lg font-bold hover:brightness-110 transition-all">
                  Xác Nhận Cấp Quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 5: Xác Nhận Thu Hồi Quyền ────────────────────────────────── */}
      {modalThuHoi && nvDangChon && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-3 border border-error/30 overflow-hidden">
            <div className="flex items-center gap-space-sm px-space-lg py-space-md bg-error/5 border-b border-error/20">
              <span className="material-symbols-outlined text-[22px] text-error">warning</span>
              <div>
                <div className="font-title-md text-title-md text-error font-semibold">Cảnh Báo — Thu Hồi Quyền Truy Cập</div>
                <div className="font-label-sm text-label-sm text-error/70">Thao tác có hiệu lực ngay lập tức</div>
              </div>
            </div>
            <div className="p-space-lg space-y-space-md">
              <p className="font-body-md text-body-md text-on-surface">
                Bạn có chắc chắn muốn thu hồi toàn bộ quyền truy cập của nhân viên{' '}
                <strong>{nvDangChon.hoTen}</strong> <span className="font-mono text-on-surface-variant">({nvDangChon.id})</span>?
              </p>
              <div className="flex items-start gap-space-sm p-space-md bg-error/5 border border-error/20 rounded-xl">
                <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">info</span>
                <div className="font-body-sm text-body-sm text-error/80 space-y-1">
                  <p>Tất cả 6 quyền RBAC sẽ bị ngắt kết nối ngay lập tức.</p>
                  <p>Trạng thái tài khoản chuyển thành <strong>Đã Thu Hồi</strong>.</p>
                  <p>Phiên làm việc hiện tại sẽ bị chấm dứt.</p>
                </div>
              </div>
              <div className="flex justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button type="button" onClick={() => setModalThuHoi(false)}
                  className="px-space-lg py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-all">
                  Hủy Bỏ
                </button>
                <button type="button" onClick={xacNhanThuHoi}
                  className="px-space-lg py-2.5 rounded-xl bg-error text-white font-label-lg text-label-lg font-bold hover:bg-error/90 transition-all">
                  Xác Nhận Thu Hồi Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 6: Nhân Bản Vai Trò ────────────────────────────────────────── */}
      {modalNhanBan && nvDangChon && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-3 border border-outline-variant overflow-hidden">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[22px] text-admin-primary">content_copy</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold">Nhân Bản Hồ Sơ Vai Trò</span>
              </div>
              <button onClick={() => setModalNhanBan(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={xuLyNhanBan} className="p-space-lg space-y-space-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">Vai Trò Nguồn</label>
                <div className="px-space-md py-2.5 bg-surface-container rounded-xl border border-outline-variant font-body-md text-body-md text-on-surface-variant">
                  {nvDangChon.vaiTro} — {nvDangChon.maVaiTro}
                </div>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 uppercase font-bold">
                  Tên Vai Trò Mới (Bản Sao) <span className="text-error">*</span>
                </label>
                <input
                  required type="text"
                  value={tenVaiTroMoi}
                  onChange={e => setTenVaiTroMoi(e.target.value)}
                  className="w-full px-space-md py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-admin-primary transition-all"
                />
              </div>
              <div className="flex justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
                <button type="button" onClick={() => setModalNhanBan(false)}
                  className="px-space-lg py-2.5 rounded-xl border border-outline-variant text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-container-high transition-all">Hủy</button>
                <button type="submit"
                  className="px-space-lg py-2.5 rounded-xl bg-admin-primary text-white font-label-lg text-label-lg font-bold hover:brightness-110 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all">
                  Xác Nhận Nhân Bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default QuanLyTaiKhoan;
