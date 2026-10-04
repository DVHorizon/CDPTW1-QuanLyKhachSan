import React, { useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';

// ─── Static Data ─────────────────────────────────────────────────────────────
const AMENITY_OPTIONS = [
  { id: 'wifi', icon: 'wifi', label: 'Wi-Fi Tốc Độ Cao' },
  { id: 'balcony', icon: 'deck', label: 'Ban Công View Biển' },
  { id: 'bathtub', icon: 'bathtub', label: 'Bồn Tắm Soaking' },
  { id: 'minibar', icon: 'local_bar', label: 'Mini-Bar Cao Cấp' },
  { id: 'nespresso', icon: 'coffee', label: 'Máy Nespresso' },
  { id: 'ada', icon: 'accessible', label: 'ADA Roll-In Shower' },
  { id: 'pool', icon: 'pool', label: 'Hồ Bơi Riêng' },
  { id: 'butler', icon: 'room_service', label: 'Butler 24/7' },
  { id: 'jacuzzi', icon: 'spa', label: 'Jacuzzi / Bồn Spa' },
  { id: 'kitchen', icon: 'kitchen', label: 'Bếp Mini / Kitchenette' },
  { id: 'safe', icon: 'lock', label: 'Két Sắt Điện Tử' },
  { id: 'tv', icon: 'tv', label: 'Smart TV 4K 65"' },
  { id: 'ac', icon: 'ac_unit', label: 'Điều Hoà Trung Tâm' },
  { id: 'workspace', icon: 'desk', label: 'Khu Vực Làm Việc' },
];

const BEDDING_OPTIONS = [
  '1 King Bed', '1 Queen Bed', '2 Double Beds', '2 Twin Beds',
  '1 King Bed + Sofa Bed', '2 King Beds', 'Custom / Linh Hoạt',
];

const VIEW_OPTIONS = [
  'Ocean View', 'Garden View', 'City View', 'Pool View',
  'Mountain View', 'Dual Aspect', 'Private Deck',
];

const INITIAL_ROOM_TYPES = [
  {
    id: 1, code: 'STD-DBL', name: 'Standard Double City View',
    subtitle: 'Floors 2–5 // North Facing', status: 'active', floors: '2–5',
    maxAdults: 2, maxChildren: 1, area: 32, bedding: '2 Double Beds', view: 'City View',
    keys: 40, baseRate: 130, amenities: ['wifi', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    turnover: 30, yieldMultiplier: 1.0,
    description: 'Phòng tiêu chuẩn thoáng mát, nhìn ra khu đô thị năng động.',
  },
  {
    id: 2, code: 'DLX-OCN', name: 'Deluxe Ocean View King Suite',
    subtitle: 'Active Selection // Balcony Inc.', status: 'active', floors: '6–9',
    maxAdults: 2, maxChildren: 1, area: 48, bedding: '1 King Bed', view: 'Ocean View',
    keys: 48, baseRate: 180, amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
    turnover: 35, yieldMultiplier: 1.15,
    description: 'Suite cao cấp với ban công riêng và tầm nhìn biển panorama 180 độ.',
  },
  {
    id: 3, code: 'EXC-PAN', name: 'Executive Corner Panoramic Suite',
    subtitle: 'Floors 6–8 // Dual Aspect', status: 'active', floors: '6–8',
    maxAdults: 2, maxChildren: 2, area: 58, bedding: '1 King Bed + Sofa Bed', view: 'Dual Aspect',
    keys: 24, baseRate: 260, amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'jacuzzi', 'workspace', 'ac', 'safe', 'tv'],
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
    turnover: 40, yieldMultiplier: 1.2,
    description: 'Suite goc nha voi hai mat nhin, phu hop khach doanh nhan.',
  },
  {
    id: 4, code: 'PNT-VIL', name: 'Penthouse Horizon Sky Villa',
    subtitle: 'Rooftop Level // Private Deck', status: 'active', floors: 'Rooftop',
    maxAdults: 4, maxChildren: 2, area: 110, bedding: '2 King Beds', view: 'Ocean View',
    keys: 8, baseRate: 580, amenities: ['wifi', 'balcony', 'bathtub', 'minibar', 'nespresso', 'pool', 'butler', 'jacuzzi', 'kitchen', 'ac', 'safe', 'tv', 'workspace'],
    image: 'https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=600&q=80',
    turnover: 60, yieldMultiplier: 1.3,
    description: 'Biet thu tren khong sang trong nhat toa nha, ho boi rieng va butler 24/7.',
  },
  {
    id: 5, code: 'ACC-KNG', name: 'Accessible Ground Floor Suite',
    subtitle: 'Level 1 // ADA Roll-In Shower', status: 'active', floors: '1',
    maxAdults: 2, maxChildren: 0, area: 42, bedding: '1 King Bed', view: 'Garden View',
    keys: 24, baseRate: 150, amenities: ['wifi', 'ada', 'ac', 'safe', 'tv', 'workspace'],
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    turnover: 30, yieldMultiplier: 1.0,
    description: 'Phong tiep can dac biet tuan chuan ADA, loi di rong va phong tam roll-in.',
  },
];

const EMPTY_FORM = {
  code: '', name: '', subtitle: '', status: 'active', floors: '',
  maxAdults: 2, maxChildren: 1, area: '', bedding: '1 King Bed', view: 'Ocean View',
  keys: '', baseRate: '', amenities: [], image: '',
  turnover: 30, yieldMultiplier: 1.0, description: '',
};

const fmtUSD = (n) => `$${Number(n).toFixed(2)}`;
const DIST_COLORS = ['bg-admin-primary', 'bg-secondary', 'bg-tertiary-fixed-dim', 'bg-secondary-fixed-dim', 'bg-on-surface-variant'];

// =============================================================================
const RoomTypeManagement = () => {
  const [roomTypes, setRoomTypes] = useState(INITIAL_ROOM_TYPES);
  const [selectedId, setSelectedId] = useState(2);
  const [form, setForm] = useState({ ...INITIAL_ROOM_TYPES[1] });
  const [isNew, setIsNew] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [imgUrl, setImgUrl] = useState(INITIAL_ROOM_TYPES[1].image);

  const totalKeys = roomTypes.reduce((s, r) => s + Number(r.keys || 0), 0);
  const activeCount = roomTypes.filter((r) => r.status === 'active').length;
  const avgRate = roomTypes.length
    ? roomTypes.reduce((s, r) => s + Number(r.baseRate || 0), 0) / roomTypes.length
    : 0;

  const filtered = roomTypes.filter((r) => {
    const mt = !filterText
      || r.name.toLowerCase().includes(filterText.toLowerCase())
      || r.code.toLowerCase().includes(filterText.toLowerCase());
    const ms = filterStatus === 'all' || r.status === filterStatus;
    return mt && ms;
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const selectRow = (rt) => {
    setSelectedId(rt.id);
    setForm({ ...rt });
    setImgUrl(rt.image || '');
    setIsNew(false);
    setShowConfirm(false);
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm({ ...EMPTY_FORM });
    setImgUrl('');
    setIsNew(true);
    setShowConfirm(false);
  };

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const toggleAmenity = (id) =>
    setForm((p) => ({
      ...p,
      amenities: p.amenities.includes(id)
        ? p.amenities.filter((a) => a !== id)
        : [...p.amenities, id],
    }));

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Vui long nhap Ma Loai Phong va Ten Loai Phong.', 'error');
      return;
    }
    const data = { ...form, image: imgUrl };
    if (isNew) {
      const nid = Date.now();
      setRoomTypes((p) => [...p, { ...data, id: nid }]);
      setSelectedId(nid);
      setIsNew(false);
      showToast('Da tao loai phong "' + form.name + '" thanh cong.');
    } else {
      setRoomTypes((p) => p.map((r) => r.id === selectedId ? { ...data, id: selectedId } : r));
      showToast('Da cap nhat loai phong "' + form.name + '".');
    }
  };

  const handleReset = () => {
    if (isNew) {
      setForm({ ...EMPTY_FORM });
      setImgUrl('');
    } else {
      const orig = roomTypes.find((r) => r.id === selectedId);
      if (orig) { setForm({ ...orig }); setImgUrl(orig.image || ''); }
    }
    showToast('Da khoi phuc du lieu goc.', 'info');
  };

  const handleToggleStatus = () => {
    if (!selectedId) return;
    const ns = form.status === 'active' ? 'inactive' : 'active';
    setRoomTypes((p) => p.map((r) => r.id === selectedId ? { ...r, status: ns } : r));
    setForm((p) => ({ ...p, status: ns }));
    showToast('Da thay doi trang thai loai phong.');
    setShowConfirm(false);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-20 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl font-label-md text-label-md font-semibold ${toast.type === 'error' ? 'bg-error-container text-on-error-container'
              : toast.type === 'info' ? 'bg-surface-container text-on-surface'
                : 'bg-admin-primary text-white'}`}>
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold flex-wrap">
              <span>PMS</span>
              <span className="text-outline-variant">//</span>
              <span className="text-on-surface-variant">Cau Hinh Tai San</span>
              <span className="text-outline-variant">//</span>
              <span>Loai Phong &amp; Danh Muc</span>
              <span className="text-outline-variant">//</span>
              <span className="inline-flex items-center gap-1 text-admin-primary bg-admin-primary/10 px-space-xs py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-admin-primary animate-pulse" />
                He Thong Truc Tiep v4.2
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-0.5">
              Danh Muc &amp; Thong So Loai Phong
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Quan ly toan dien hinh anh, tien ich, suc chua va bieu gia chuan cho tung hang phong cua resort.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs">
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              type="button">
              <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
              <span>Xuat CSV/Spec</span>
            </button>
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              type="button">
              <span className="material-symbols-outlined text-[18px] text-secondary">upload</span>
              <span>Nhap Thong So</span>
            </button>
            <button
              onClick={handleNew}
              className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
              type="button">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Tao Loai Phong Moi</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Tong Danh Muc</span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">category</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">{String(roomTypes.length).padStart(2, '0')}</span>
              <span className="font-label-sm text-label-sm text-admin-primary font-semibold">Hang Phong</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Dang Hoat Dong: <strong className="text-admin-primary font-mono">ACTIVE ({roomTypes.length > 0 ? Math.round((activeCount / roomTypes.length) * 100) : 0}%)</strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Tong Phong Ton Kho</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">bedroom_parent</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">{totalKeys}</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">Chia Khoa</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Da Giao: <strong className="text-on-surface font-mono">KEYS ASSIGNED</strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Gia Niem Yet TB</span>
              <span className="material-symbols-outlined text-[20px] text-admin-primary">attach_money</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-admin-primary font-mono">{fmtUSD(avgRate)}</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              / Dem <strong className="text-on-surface font-mono">Chua Thue</strong>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Gioi Han Overbooking</span>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">warning</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">05%</span>
            </div>
            <div className="pt-space-xs mt-space-xs text-on-surface-variant font-label-sm text-label-sm">
              Toi Da: <strong className="text-on-surface font-mono">MAX 7 KEYS</strong>
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">

          {/* LEFT: Categories Table */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-md">

              {/* Filter bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm">
                <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1">
                  {[['all', 'Tat Ca'], ['active', 'Hoat Dong'], ['inactive', 'Tam Dung']].map(([v, l]) => (
                    <button key={v} onClick={() => setFilterStatus(v)}
                      className={`px-space-sm py-1 rounded text-label-md font-label-md whitespace-nowrap transition-colors ${filterStatus === v ? 'bg-surface-container-lowest shadow-sm text-admin-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'
                        }`} type="button">{l}</button>
                  ))}
                </div>
                <div className="relative min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-on-surface-variant">search</span>
                  <input
                    className="w-full bg-surface pl-8 pr-4 py-1.5 rounded-lg text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    placeholder="Tim ma phong, ten hang phong..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">Bang Danh Muc</span>
                <span className="bg-surface-container px-2 py-0.5 rounded font-mono text-[10px] text-on-surface-variant">N={filtered.length} LOADED</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">MA / TEN HANG PHONG</th>
                      <th className="py-2.5 px-3 text-center">SUC CHUA</th>
                      <th className="py-2.5 px-3 text-center">GIUONG</th>
                      <th className="py-2.5 px-3 text-center">DTICH</th>
                      <th className="py-2.5 px-3 text-center">SO P.</th>
                      <th className="py-2.5 px-3 text-right">GIA/DEM</th>
                      <th className="py-2.5 px-3 text-center rounded-r-lg">TRANG THAI</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm font-body-sm divide-y divide-surface-container-high/60">
                    {filtered.map((rt) => (
                      <tr
                        key={rt.id}
                        onClick={() => selectRow(rt)}
                        className={`hover:bg-surface-container-high/50 transition-colors cursor-pointer group ${rt.id === selectedId ? 'bg-surface-container-high/40' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-8 rounded flex-shrink-0 ${rt.id === selectedId ? 'bg-admin-primary' : 'bg-transparent'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className={`font-body-md text-body-md font-bold truncate transition-colors ${rt.id === selectedId ? 'text-admin-primary' : 'text-on-surface group-hover:text-admin-primary'}`}>
                                {rt.name}
                              </span>
                              <span className="font-mono text-label-sm text-on-surface-variant truncate">{rt.code} &bull; {rt.subtitle}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-semibold text-on-surface text-label-sm">{rt.maxAdults}A/{rt.maxChildren}C</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-on-surface-variant text-[11px] leading-tight">{rt.bedding}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-semibold text-on-surface">{rt.area}M2</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-on-surface">{rt.keys}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">{fmtUSD(rt.baseRate)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold uppercase ${rt.status === 'active' ? 'bg-admin-primary/10 text-admin-primary' : 'bg-on-surface-variant/10 text-on-surface-variant'
                            }`}>
                            {rt.status === 'active' ? 'AC' : 'IN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-on-surface-variant font-body-sm">
                          Khong tim thay loai phong nao phu hop.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span>Hien thi {filtered.length} / {roomTypes.length} loai phong da dang ky</span>
                <span className="font-mono text-on-surface">PHAN TRANG VO HIEU [CHE DO DON]</span>
              </div>
            </div>

            {/* Capacity Distribution Bar */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-space-sm">
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">Phan Bo Suc Chua Theo Danh Muc</span>
                <span className="font-mono text-label-sm text-on-surface">TONG: {totalKeys} PHONG</span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-7 mb-space-sm gap-0.5">
                {roomTypes.map((rt, i) => (
                  <div
                    key={rt.id}
                    className={`${DIST_COLORS[i % DIST_COLORS.length]} flex items-center justify-center transition-all cursor-pointer hover:brightness-110`}
                    style={{ width: totalKeys > 0 ? `${(rt.keys / totalKeys) * 100}%` : '20%' }}
                    title={`${rt.code}: ${rt.keys} phong`}
                    onClick={() => selectRow(rt)}>
                    {totalKeys > 0 && (rt.keys / totalKeys) > 0.08 && (
                      <span className="font-mono text-[10px] text-white font-bold truncate px-1">
                        {rt.code} ({rt.keys})
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-space-sm">
                {roomTypes.map((rt, i) => (
                  <div key={rt.id} className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                    <div className={`w-2.5 h-2.5 rounded-sm ${DIST_COLORS[i % DIST_COLORS.length]}`} />
                    <span className="font-mono">{rt.code}</span>
                    <span className="text-[10px]">({totalKeys > 0 ? Math.round((rt.keys / totalKeys) * 100) : 0}%)</span>
                    {rt.id === selectedId && <span className="text-admin-primary font-bold">[DANG CHON]</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Specification Form */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">

              {/* Form header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm font-mono text-admin-primary font-bold uppercase tracking-wider truncate">
                    {isNew ? 'TAO LOAI PHONG MOI' : `MA MUC TIEU: ${form.code || '---'} // CAT_ID: ${selectedId ?? '---'}`}
                  </span>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">
                    {isNew ? 'Phieu Tao Moi' : 'Phieu Thong So Hang Phong'}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-admin-primary/10 text-admin-primary font-label-sm text-label-sm font-bold whitespace-nowrap flex-shrink-0">
                  {isNew ? 'CHE DO: TAO MOI' : 'CHE DO: SUA'}
                </span>
              </div>

              {/* Room Image */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">Anh Dai Dien Hang Phong</span>
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-surface-container mb-2 group">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={form.name || 'Room'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant gap-2">
                      <span className="material-symbols-outlined text-[48px]">image</span>
                      <span className="font-label-sm text-label-sm">Nhap URL anh ben duoi</span>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  placeholder="https://... (URL anh hang phong)"
                  value={imgUrl}
                  onChange={(e) => { setImgUrl(e.target.value); setField('image', e.target.value); }}
                />
              </div>

              {/* Category Code + Status */}
              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Ma Loai Phong *</label>
                  <input
                    type="text"
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary uppercase"
                    placeholder="VD: DLX-OCN"
                    value={form.code}
                    maxLength={10}
                    onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Trang Thai</label>
                  <select
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}>
                    <option value="active">ACTIVE // Hoat Dong</option>
                    <option value="inactive">INACTIVE // Tam Dung</option>
                  </select>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Ten Hien Thi Hang Phong *</label>
                <input
                  type="text"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary"
                  placeholder="VD: Deluxe Ocean View King Suite"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-1">Mo Ta (Le Tan &amp; Hoa Don)</label>
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary resize-none"
                  placeholder="Mo ta ngan gon ve hang phong..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>

              {/* Dimensions & Capacity */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">Dien Tich &amp; Suc Chua</span>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Dien Tich (M2)</label>
                    <input type="number" min={10} max={999}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.area} onChange={(e) => setField('area', e.target.value)} />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Gia Chuan ($/Dem)</label>
                    <input type="number" min={0}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.baseRate} onChange={(e) => setField('baseRate', e.target.value)} />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Toi Da Nguoi Lon</label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.maxAdults} onChange={(e) => setField('maxAdults', Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} ADULTS</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Toi Da Tre Em</label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.maxChildren} onChange={(e) => setField('maxChildren', Number(e.target.value))}>
                      {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n === 0 ? 'Khong Co' : `${n} CHILD${n > 1 ? 'REN' : ''}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Loai Giuong</label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.bedding} onChange={(e) => setField('bedding', e.target.value)}>
                      {BEDDING_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">So Phong Ton Kho</label>
                    <input type="number" min={0}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.keys} onChange={(e) => setField('keys', e.target.value)} />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Tang / Vi Tri</label>
                    <input type="text"
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      placeholder="VD: 6-9, Rooftop"
                      value={form.floors} onChange={(e) => setField('floors', e.target.value)} />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Huong View</label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.view} onChange={(e) => setField('view', e.target.value)}>
                      {VIEW_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Yield */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider block mb-space-xs">Cai Dat Gia &amp; Doanh Thu</span>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Thoi Gian Don Phong (Phut)</label>
                    <input type="number" min={15} max={180}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.turnover} onChange={(e) => setField('turnover', e.target.value)} />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      He So Gia Cuoi Tuan
                      <span className="font-mono text-admin-primary ml-1">
                        {form.yieldMultiplier >= 1 ? `+${Math.round((form.yieldMultiplier - 1) * 100)}%` : ''}
                      </span>
                    </label>
                    <select className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary"
                      value={form.yieldMultiplier} onChange={(e) => setField('yieldMultiplier', Number(e.target.value))}>
                      <option value={1.0}>1.00x Tieu Chuan</option>
                      <option value={1.1}>1.10x Weekend (+10%)</option>
                      <option value={1.15}>1.15x Weekend (+15%)</option>
                      <option value={1.2}>1.20x Weekend (+20%)</option>
                      <option value={1.25}>1.25x Weekend (+25%)</option>
                      <option value={1.3}>1.30x Weekend (+30%)</option>
                      <option value={1.5}>1.50x Peak Season (+50%)</option>
                    </select>
                  </div>
                </div>
                {form.baseRate && (
                  <div className="mt-space-xs bg-admin-primary/5 border border-admin-primary/20 rounded-lg p-space-sm flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Gia Cuoi Tuan (Preview):</span>
                    <span className="font-mono font-bold text-admin-primary text-body-md">
                      {fmtUSD((Number(form.baseRate) * Number(form.yieldMultiplier)).toFixed(2))} / dem
                    </span>
                  </div>
                )}
              </div>

              {/* Amenities */}
              <div>
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">Goi Tien Ich Tieu Chuan</span>
                  <span className="font-mono text-label-sm text-admin-primary font-bold">{form.amenities.length}/{AMENITY_OPTIONS.length} Da Chon</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {AMENITY_OPTIONS.map((a) => {
                    const checked = form.amenities.includes(a.id);
                    return (
                      <label key={a.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${checked ? 'bg-admin-primary/10 border-admin-primary/30' : 'bg-surface-container hover:bg-surface-container-high border-transparent'
                          }`}>
                        <input type="checkbox" className="accent-admin-primary w-3.5 h-3.5 rounded flex-shrink-0"
                          checked={checked} onChange={() => toggleAmenity(a.id)} />
                        <span className={`material-symbols-outlined text-[14px] flex-shrink-0 ${checked ? 'text-admin-primary' : 'text-on-surface-variant'}`}>{a.icon}</span>
                        <span className={`font-body-sm text-body-sm leading-tight ${checked ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>{a.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch gap-space-xs pt-space-md border-t border-surface-container-high">
                <button onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-sm transition-all"
                  type="button">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{isNew ? 'Tao Danh Muc' : 'Luu Danh Muc'}</span>
                </button>
                <button onClick={handleReset}
                  className="flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
                  type="button">
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  <span>Dat Lai</span>
                </button>
              </div>

              {/* Deactivate / Reactivate */}
              {!isNew && selectedId && (
                <div className="border-t border-surface-container-high pt-space-sm">
                  {!showConfirm ? (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="w-full text-center font-label-sm text-label-sm font-bold text-error hover:text-on-error hover:bg-error-container transition-colors py-1.5 rounded-lg"
                      type="button">
                      [{form.status === 'active' ? 'DEACTIVATE CATEGORY ARCHIVE' : 'REACTIVATE CATEGORY'}]
                    </button>
                  ) : (
                    <div className="bg-error-container rounded-lg p-space-sm flex flex-col gap-space-xs">
                      <span className="font-label-sm text-label-sm font-bold text-on-error-container">
                        Xac nhan {form.status === 'active' ? 'tam dung' : 'kich hoat lai'} hang phong "{form.name}"?
                      </span>
                      <div className="flex gap-space-xs">
                        <button onClick={handleToggleStatus}
                          className="flex-1 py-1.5 bg-error text-white font-label-sm text-label-sm font-bold rounded-lg hover:brightness-110 transition"
                          type="button">Xac Nhan</button>
                        <button onClick={() => setShowConfirm(false)}
                          className="flex-1 py-1.5 bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold rounded-lg hover:bg-surface-container-high transition"
                          type="button">Hủy </button>
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
