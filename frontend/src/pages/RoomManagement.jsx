import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';

// ─── Hằng số & dữ liệu mẫu ──────────────────────────────────────────────────
const STORAGE_KEY = 'qlks_rooms';
const LOG_KEY = 'qlks_room_logs';
const PAGE_SIZE = 5;
const API_PHONG = 'http://localhost:5000/api/phong';

// Gọi API; trả về null nếu không kết nối được máy chủ
const callApi = async (method, path = '', body) => {
    try {
        const res = await fetch(`${API_PHONG}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok && data.success !== false, status: res.status, data };
    } catch (_) {
        return null;
    }
};

// Dòng MySQL  <->  đối tượng phòng trên giao diện (Đồng bộ CSDL MySQL trực tiếp, không qua localStorage)
const toUI = (r) => ({
    id: r.id,
    number: r.so_phong,
    floor: r.tang,
    wing: r.khu,
    typeCode: r.ma_loai,
    keyId: r.ma_khoa,
    connecting: r.phong_lien_thong || '',
    note: r.ghi_chu || '',
    hk: r.buong_phong,
    occ: r.luu_tru,
    updated_at: r.updated_at || null,
    is_deleted: r.is_deleted || 0,
});
const toAPI = (r) => ({
    so_phong: r.number,
    tang: r.floor,
    khu: r.wing,
    ma_loai: r.typeCode,
    ma_khoa: r.keyId,
    phong_lien_thong: r.connecting,
    ghi_chu: r.note,
    buong_phong: r.hk,
    luu_tru: r.occ,
    prev_updated_at: r.updated_at || undefined,
});

const WINGS = ['A', 'B', 'C'];
const FLOORS = Array.from({ length: 12 }, (_, i) => i + 1);

// Loại phòng: lấy từ trang Loại Phòng nếu có, không thì dùng mặc định
const DEFAULT_TYPES = [
    { code: 'STD-DBL', name: 'Tiêu Chuẩn 2 Giường Đôi' },
    { code: 'DLX-OCN', name: 'Deluxe King Hướng Biển' },
    { code: 'EXC-PAN', name: 'Executive Góc Hai Mặt Thoáng' },
    { code: 'PNT-VIL', name: 'Penthouse Sky Villa' },
    { code: 'ACC-KNG', name: 'Suite Hỗ Trợ ADA' },
];

const loadRoomTypes = () => {
    try {
        const saved = JSON.parse(localStorage.getItem('qlks_room_types') || '[]');
        if (Array.isArray(saved) && saved.length > 0) {
            return saved.map((r) => ({ code: r.code, name: r.name }));
        }
    } catch (_) { }
    return DEFAULT_TYPES;
};

// Trạng thái buồng phòng (hk) và lưu trú (occ)
// Nhóm hiển thị: ooo > inhouse > dirty > clean (mỗi phòng thuộc đúng 1 nhóm)
const getGroup = (r) => {
    if (r.hk === 'ooo') return 'ooo';
    if (r.occ === 'inhouse') return 'inhouse';
    if (r.hk === 'dirty') return 'dirty';
    return 'clean';
};

const GROUP_META = {
    clean: { label: 'Sạch - Trống', cls: 'bg-admin-primary/10 text-admin-primary' },
    inhouse: { label: 'Có khách', cls: 'bg-secondary/15 text-secondary' },
    dirty: { label: 'Bẩn / Chờ dọn', cls: 'bg-tertiary-fixed-dim/40 text-on-surface' },
    ooo: { label: 'Ngừng sử dụng', cls: 'bg-error/10 text-error' },
};

const wingOfFloor = (f) => (f <= 4 ? 'A' : f <= 8 ? 'B' : 'C');

const buildSampleRooms = () => {
    const types = DEFAULT_TYPES.map((t) => t.code);
    const rooms = [];
    let id = 1;
    FLOORS.forEach((floor) => {
        for (let n = 1; n <= 12; n++) {
            const number = `${floor}${String(n).padStart(2, '0')}`;
            const typeCode = floor >= 11 ? types[n % 2 === 0 ? 3 : 2] : floor === 1 && n <= 2 ? types[4] : types[n % 3];
            const roll = (floor * 7 + n * 3) % 10;
            let hk = 'clean';
            let occ = 'vacant';
            if (roll <= 5) occ = 'inhouse';
            else if (roll === 6 || roll === 7) hk = 'dirty';
            else if (roll === 9 && n % 4 === 0) hk = 'ooo';
            rooms.push({
                id: id++,
                number,
                floor,
                wing: wingOfFloor(floor),
                typeCode,
                keyId: `RFID-${floor}${String(n).padStart(2, '0')}`,
                connecting: '',
                note: '',
                hk,
                occ,
            });
        }
    });
    return rooms;
};

const EMPTY_FORM = {
    number: '', floor: 1, wing: 'A', typeCode: '', keyId: '', connecting: '', note: '',
    hk: 'clean', occ: 'vacant',
};

// ─── Component chính ────────────────────────────────────────────────────────
const RoomManagement = () => {
    const [roomTypes, setRoomTypes] = useState(loadRoomTypes);

    const [rooms, setRooms] = useState([]);
    const [logs, setLogs] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
            if (Array.isArray(saved)) return saved;
        } catch (_) { }
        return [];
    });

    // Quản lý Thùng Rác (Soft Delete: IsDeleted = 1 / true)
    const [trashModalOpen, setTrashModalOpen] = useState(false);
    const [trashRooms, setTrashRooms] = useState([]);
    const [trashLoading, setTrashLoading] = useState(false);

    const [filters, setFilters] = useState({ wing: 'all', floor: 'all', type: 'all', status: 'all' });
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [selected, setSelected] = useState([]);
    const [collapsed, setCollapsed] = useState({});
    const [pages, setPages] = useState({});
    const [batchTarget, setBatchTarget] = useState('clean');
    const [toast, setToast] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [backendConnected, setBackendConnected] = useState(false);

    const [modal, setModal] = useState(null); // null | { mode: 'new' | 'edit', id? }
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [formErrors, setFormErrors] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [syncErrorModal, setSyncErrorModal] = useState(null);

    useEffect(() => {
        try { localStorage.setItem(LOG_KEY, JSON.stringify(logs)); } catch (_) { }
    }, [logs]);

    // Tải danh sách phòng trong Thùng Rác (IsDeleted = true)
    const fetchTrashRooms = async () => {
        setTrashLoading(true);
        try {
            const res = await callApi('GET', '/thung-rac');
            if (res && res.ok && Array.isArray(res.data.data)) {
                setTrashRooms(res.data.data.map(toUI));
            } else {
                setTrashRooms([]);
            }
        } catch (_) {
            setTrashRooms([]);
        } finally {
            setTrashLoading(false);
        }
    };

    const openTrashModal = () => {
        setTrashModalOpen(true);
        fetchTrashRooms();
    };

    const handleRestoreRoom = async (roomId, roomNumber) => {
        const res = await callApi('PATCH', `/${roomId}/khoi-phuc`);
        if (!res) return lostConnection();
        if (!res.ok) {
            showToast(res.data?.message || 'Không thể khôi phục phòng', 'error');
            return;
        }
        showToast(`Đã khôi phục thành công phòng ${roomNumber} (IsDeleted: 1 -> 0)!`, 'success');
        addLog(`Khôi phục phòng ${roomNumber} từ thùng rác`);
        setTrashRooms((prev) => prev.filter((r) => r.id !== roomId));
        reloadDataFromBackend();
    };

    // Tải danh sách loại phòng thật từ MySQL Database
    const fetchRoomTypes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/loai-phong');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    const mapped = data.data.map((r) => ({
                        code: r.ma_loai || `RT-${r.id}`,
                        name: r.ten_loai || r.name || `Loại phòng #${r.id}`,
                    }));
                    setRoomTypes(mapped);
                    try { localStorage.setItem('qlks_room_types', JSON.stringify(mapped)); } catch (_) { }
                }
            }
        } catch (_) { }
    };

    // Tải danh sách phòng từ MySQL khi mở trang
    const reloadDataFromBackend = async () => {
        const r = await callApi('GET');
        if (r && r.ok && Array.isArray(r.data.data)) {
            setRooms(r.data.data.map(toUI));
            setBackendConnected(true);
        }
        await fetchRoomTypes();
    };

    useEffect(() => {
        reloadDataFromBackend();
    }, []);

    // Làm mới nhãn thời gian của nhật ký mỗi 30 giây
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const lostConnection = () => {
        setBackendConnected(false);
        showToast('Mất kết nối máy chủ. Đã chuyển sang chế độ cục bộ, hãy thử lại.', 'error');
    };
    const mergeRooms = (list) => {
        const map = new Map(list.map((r) => [r.id, toUI(r)]));
        setRooms((p) => p.map((x) => map.get(x.id) || x));
    };

    const addLog = (text) =>
        setLogs((p) => [{ id: Date.now() + Math.random(), text, at: Date.now() }, ...p].slice(0, 30));

    const typeName = (code) => {
        if (!code) return '---';
        const found = roomTypes.find((t) => t.code === code || t.code?.toUpperCase() === code?.toUpperCase());
        if (found) return found.name;
        const match = String(code).match(/^RT-(\d+)$/i);
        if (match) {
            const byId = roomTypes.find((t) => t.code === `RT-${match[1]}` || String(t.code) === match[1]);
            if (byId) return byId.name;
        }
        return code;
    };

    // ─── Thống kê (tổng các nhóm = tổng tồn kho) ──────────────────────────────
    const stats = useMemo(() => {
        const s = { clean: 0, inhouse: 0, dirty: 0, ooo: 0 };
        rooms.forEach((r) => { s[getGroup(r)]++; });
        return s;
    }, [rooms]);
    const total = rooms.length;
    const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

    // ─── Lọc (AND) ────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rooms.filter((r) => {
            if (filters.wing !== 'all' && r.wing !== filters.wing) return false;
            if (filters.floor !== 'all' && r.floor !== Number(filters.floor)) return false;
            if (filters.type !== 'all' && r.typeCode !== filters.type) return false;
            if (filters.status !== 'all' && getGroup(r) !== filters.status) return false;
            if (q && !r.number.toLowerCase().includes(q) && !r.keyId.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rooms, filters, search]);

    const byFloor = useMemo(() => {
        const map = {};
        filtered.forEach((r) => { (map[r.floor] = map[r.floor] || []).push(r); });
        Object.values(map).forEach((list) => list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
        return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]));
    }, [filtered]);

    const setFilter = (k, v) => {
        setFilters((p) => ({ ...p, [k]: v }));
        setPages({});
    };

    // ─── Chọn phòng ───────────────────────────────────────────────────────────
    const toggleSelect = (id) =>
        setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const toggleFloorSelect = (list) => {
        const ids = list.map((r) => r.id);
        const all = ids.every((id) => selected.includes(id));
        setSelected((p) => (all ? p.filter((id) => !ids.includes(id)) : Array.from(new Set([...p, ...ids]))));
    };

    // ─── Quy tắc chuyển trạng thái ────────────────────────────────────────────
    // Trả về phòng mới, hoặc null nếu thao tác không hợp lệ
    const applyAction = (r, action) => {
        switch (action) {
            case 'clean':
                if (r.hk === 'dirty') return { ...r, hk: 'clean' };
                return null;
            case 'dirty':
                if (r.hk === 'clean') return { ...r, hk: 'dirty' };
                return null;
            case 'checkin':
                if (r.hk === 'clean' && r.occ === 'vacant') return { ...r, occ: 'inhouse' };
                return null;
            case 'checkout':
                if (r.occ === 'inhouse' && r.hk !== 'ooo') return { ...r, occ: 'vacant', hk: 'dirty' };
                return null;
            case 'ooo':
                if (r.hk !== 'ooo' && r.occ === 'vacant') return { ...r, hk: 'ooo' };
                return null;
            case 'restore':
                if (r.hk === 'ooo') return { ...r, hk: 'dirty' };
                return null;
            default:
                return null;
        }
    };

    const ACTION_LABEL = {
        clean: 'Đã dọn xong',
        dirty: 'Đánh dấu bẩn',
        checkin: 'Nhận khách',
        checkout: 'Trả phòng',
        ooo: 'Ngừng sử dụng',
        restore: 'Đưa vào hoạt động',
    };

    const actionsFor = (r) => {
        const g = getGroup(r);
        if (g === 'ooo') return ['restore'];
        if (g === 'inhouse') return ['checkout'];
        if (g === 'dirty') return ['clean', 'ooo'];
        return ['checkin', 'dirty', 'ooo'];
    };

    const runRowAction = async (room, action) => {
        if (backendConnected) {
            const r = await callApi('PATCH', `/${room.id}/thao-tac`, { 
                action, 
                prev_updated_at: room.updated_at 
            });
            if (!r) return lostConnection();
            if (r.status === 409 || r.data?.isConflict) {
                setSyncErrorModal({
                    title: 'XUNG ĐỘT DỮ LIỆU (OPTIMISTIC LOCKING)!',
                    message: r.data?.message || `Phòng ${room.number} đã bị người khác thay đổi trạng thái trong lúc bạn thao tác! Hệ thống đã kích hoạt khóa lạc quan (Optimistic Locking) để đảm bảo toàn vẹn dữ liệu.`,
                    actionText: 'Tải Lại Dữ Liệu Mới Nhất',
                    onAction: () => {
                        setSyncErrorModal(null);
                        reloadDataFromBackend();
                    },
                });
                return;
            }
            if (r.status === 404 || r.data?.isRecordDeleted) {
                setSyncErrorModal({
                    title: 'CẢNH BÁO: PHÒNG ĐÃ BỊ XÓA KHỎI CƠ SỞ DỮ LIỆU!',
                    message: `Phòng ${room.number} (ID #${room.id}) đã bị người khác hoặc tiến trình khác xóa khỏi cơ sở dữ liệu! Không thể cập nhật trạng thái.`,
                    actionText: 'Tải Lại Danh Sách',
                    onAction: () => {
                        setSyncErrorModal(null);
                        reloadDataFromBackend();
                    },
                });
                setRooms((p) => p.filter((x) => x.id !== room.id));
                return;
            }
            if (!r.ok) {
                showToast(r.data.message || 'Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
                return;
            }
            mergeRooms([r.data.data]);
            addLog(`Phòng ${room.number}: ${ACTION_LABEL[action]}`);
            showToast(`Phòng ${room.number}: ${ACTION_LABEL[action]} - Đã đồng bộ CSDL!`, 'success');
            await reloadDataFromBackend();
            return;
        }
        const next = applyAction(room, action);
        if (!next) {
            showToast('Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
            return;
        }
        setRooms((p) => p.map((r) => (r.id === room.id ? next : r)));
        addLog(`Phòng ${room.number}: ${ACTION_LABEL[action]}`);
        showToast(`Phòng ${room.number}: ${ACTION_LABEL[action]}.`);
    };

    // ─── Thao tác hàng loạt ───────────────────────────────────────────────────
    const BATCH_OPTIONS = [
        { v: 'clean', l: 'Đánh dấu đã dọn xong' },
        { v: 'dirty', l: 'Đánh dấu bẩn' },
        { v: 'ooo', l: 'Chuyển ngừng sử dụng' },
        { v: 'restore', l: 'Đưa vào hoạt động' },
    ];

    const runBatch = async (action) => {
        if (selected.length === 0) {
            showToast('Chưa chọn phòng nào để áp dụng.', 'error');
            return;
        }
        if (backendConnected) {
            const r = await callApi('POST', '/hang-loat', { ids: selected, action });
            if (!r) return lostConnection();
            if (!r.ok) {
                showToast(r.data.message || 'Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
                return;
            }
            const { updated, ok, skipped } = r.data.data;
            mergeRooms(updated);
            addLog(`Hàng loạt "${ACTION_LABEL[action]}": ${ok} phòng`);
            showToast(`Đã áp dụng cho ${ok} phòng${skipped ? `, bỏ qua ${skipped} phòng không hợp lệ` : ''} - Đã đồng bộ CSDL!`, 'success');
            setSelected([]);
            await reloadDataFromBackend();
            return;
        }
        let ok = 0;
        let skipped = 0;
        const updated = rooms.map((r) => {
            if (!selected.includes(r.id)) return r;
            const next = applyAction(r, action);
            if (next) { ok++; return next; }
            skipped++;
            return r;
        });
        if (ok === 0) {
            showToast('Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
            return;
        }
        setRooms(updated);
        addLog(`Hàng loạt "${ACTION_LABEL[action]}": ${ok} phòng`);
        showToast(`Đã áp dụng cho ${ok} phòng${skipped ? `, bỏ qua ${skipped} phòng không hợp lệ` : ''}.`);
        setSelected([]);
    };

    // Khóa cả tầng: các tầng có phòng đang được chọn
    const floorBulkLock = async () => {
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất một phòng.', 'error');
            return;
        }
        if (backendConnected) {
            const r = await callApi('POST', '/khoa-tang', { ids: selected });
            if (!r) return lostConnection();
            if (!r.ok) {
                showToast(r.data.message || 'Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
                return;
            }
            const { updated, ok, skipped, floors } = r.data.data;
            mergeRooms(updated);
            addLog(`Khóa tầng ${floors.join(', ')}: ${ok} phòng`);
            showToast(`Đã khóa tầng ${floors.join(', ')}: ${ok} phòng${skipped ? `, ${skipped} phòng đang có khách được giữ nguyên` : ''} - Đã đồng bộ CSDL!`, 'success');
            setSelected([]);
            await reloadDataFromBackend();
            return;
        }
        const floors = new Set(rooms.filter((r) => selected.includes(r.id)).map((r) => r.floor));
        let ok = 0;
        let skipped = 0;
        const updated = rooms.map((r) => {
            if (!floors.has(r.floor)) return r;
            const next = applyAction(r, 'ooo');
            if (next) { ok++; return next; }
            if (r.hk !== 'ooo') skipped++;
            return r;
        });
        if (ok === 0) {
            showToast('Thao tác không hợp lệ với trạng thái hiện tại.', 'error');
            return;
        }
        setRooms(updated);
        addLog(`Khóa tầng ${Array.from(floors).join(', ')}: ${ok} phòng`);
        showToast(`Đã khóa tầng ${Array.from(floors).join(', ')}: ${ok} phòng${skipped ? `, ${skipped} phòng đang có khách được giữ nguyên` : ''}.`);
        setSelected([]);
    };

    const bulkStatusUpdate = () => {
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất một phòng.', 'error');
            return;
        }
        runBatch(batchTarget);
    };

    // ─── Form thêm / sửa ──────────────────────────────────────────────────────
    const openNew = () => {
        setForm({ ...EMPTY_FORM, typeCode: roomTypes[0]?.code || '' });
        setFormErrors({});
        setModal({ mode: 'new' });
    };
    const openEdit = (r) => {
        setForm({ ...r });
        setFormErrors({});
        setModal({ mode: 'edit', id: r.id });
    };
    const setF = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (formErrors[k]) setFormErrors((p) => { const c = { ...p }; delete c[k]; return c; });
    };

    const validate = () => {
        const e = {};
        const number = form.number.trim();
        const keyId = form.keyId.trim();
        if (!number) e.number = 'Vui lòng nhập số phòng (ví dụ: 101)';
        else if (!/^[A-Za-z0-9._\-\/]{1,20}$/.test(number)) e.number = 'Số phòng chỉ gồm chữ cái, chữ số, gạch ngang (-), gạch dưới (_), chấm (.), gạch chéo (/)';
        else if (rooms.some((r) => r.number.toLowerCase() === number.toLowerCase() && r.id !== modal?.id))
            e.number = `Số phòng "${number}" đã tồn tại`;
        if (!form.typeCode) e.typeCode = 'Vui lòng chọn loại phòng';
        if (!keyId) e.keyId = 'Vui lòng nhập mã đầu đọc khóa';
        else if (rooms.some((r) => r.keyId.toLowerCase() === keyId.toLowerCase() && r.id !== modal?.id))
            e.keyId = `Mã đầu đọc khóa "${keyId}" đã được dùng cho phòng khác`;
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            showToast('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường báo lỗi.', 'error');
            return;
        }
        const payload = {
            ...form,
            number: form.number.trim(),
            keyId: form.keyId.trim(),
            floor: Number(form.floor),
            connecting: form.connecting.trim(),
            note: form.note.trim(),
        };

        const isNew = modal?.mode === 'new';
        const body = toAPI(payload);

        // Luôn luôn gọi API Backend để lưu vào cơ sở dữ liệu MySQL
        const r = isNew
            ? await callApi('POST', '', body)
            : await callApi('PUT', `/${modal?.id}`, body);

        if (r && r.ok) {
            const saved = toUI(r.data.data);
            setRooms((p) => (isNew ? [...p, saved] : p.map((x) => (x.id === saved.id ? saved : x))));
            addLog(isNew ? `Thêm mới phòng ${saved.number} (tầng ${saved.floor})` : `Cập nhật phòng ${saved.number}`);
            showToast(
                isNew
                    ? `Đã thêm mới phòng ${saved.number} thành công và đồng bộ dữ liệu vào CSDL!`
                    : `Đã cập nhật thông tin phòng ${saved.number} thành công và đồng bộ CSDL!`,
                'success'
            );
            setModal(null);
            setBackendConnected(true);
            // Đồng bộ lại toàn bộ danh sách phòng và số liệu thống kê từ MySQL
            await reloadDataFromBackend();
            return;
        }

        // Phát hiện xung đột dữ liệu Optimistic Locking (Phòng đã bị sửa bởi người khác)
        if (r && (r.status === 409 || r.data?.isConflict)) {
            setSyncErrorModal({
                title: 'CẢNH BÁO: XUNG ĐỘT DỮ LIỆU (OPTIMISTIC LOCKING)!',
                message: r.data?.message || `Trong lúc bạn đang chỉnh sửa, phòng [${form.number}] đã được cập nhật bởi một người dùng hoặc tiến trình khác! Hệ thống đã kích hoạt khóa lạc quan (Optimistic Locking) để tránh ghi đè mất mát dữ liệu.`,
                actionText: 'Tải Lại Dữ Liệu Mới Nhất',
                onAction: () => {
                    setSyncErrorModal(null);
                    reloadDataFromBackend();
                },
            });
            setModal(null);
            return;
        }

        // Phát hiện phòng đã bị xóa trong CSDL bởi người khác
        if (r && (r.status === 404 || r.data?.isRecordDeleted)) {
            setSyncErrorModal({
                title: 'CẢNH BÁO: DỮ LIỆU ĐÃ BỊ XÓA KHỎI DATABASE!',
                message: `Trong lúc bạn đang thao tác chỉnh sửa, phòng [${form.number}] (ID #${modal?.id}) đã bị người khác xóa khỏi cơ sở dữ liệu! Thao tác lưu không thể thực hiện.`,
                actionText: 'Tải Lại Dữ Liệu & Danh Sách',
                onAction: () => {
                    setSyncErrorModal(null);
                    reloadDataFromBackend();
                },
            });
            setRooms((p) => p.filter((x) => x.id !== modal?.id));
            setModal(null);
            return;
        }

        // Báo lỗi chi tiết từ backend nếu có
        if (r && !r.ok) {
            showToast(r.data?.message || 'Không thể lưu phòng vào CSDL!', 'error');
            return;
        }

        // Trường hợp mất kết nối backend hoàn toàn (mạng rớt)
        lostConnection();
        if (isNew) {
            setRooms((p) => [...p, { ...payload, id: Date.now() }]);
            addLog(`Thêm phòng ${payload.number} (cục bộ)`);
            showToast(`Đã lưu tạm phòng ${payload.number} ở chế độ cục bộ (chưa kết nối được CSDL).`, 'error');
        } else {
            setRooms((p) => p.map((r) => (r.id === modal?.id ? { ...payload, id: modal?.id } : r)));
            addLog(`Cập nhật phòng ${payload.number} (cục bộ)`);
            showToast(`Đã cập nhật tạm phòng ${payload.number} ở chế độ cục bộ.`, 'error');
        }
        setModal(null);
    };

    const confirmDelete = async () => {
        const r = deleteTarget;
        if (!r) return;
        if (r.occ === 'inhouse') {
            showToast('Không thể xóa phòng đang có khách lưu trú!', 'error');
            setDeleteTarget(null);
            return;
        }

        const res = await callApi('DELETE', `/${r.id}`);

        if (res && res.ok) {
            setRooms((p) => p.filter((x) => x.id !== r.id));
            setSelected((p) => p.filter((id) => id !== r.id));
            addLog(`Xóa phòng ${r.number}`);
            showToast(`Đã xóa phòng ${r.number} thành công và đồng bộ dữ liệu khỏi CSDL!`, 'success');
            setDeleteTarget(null);
            setBackendConnected(true);
            await reloadDataFromBackend();
            return;
        }

        // Phát hiện phòng đã bị xóa trước đó bởi người khác
        if (res && (res.status === 404 || res.data?.isRecordDeleted)) {
            setSyncErrorModal({
                title: 'CẢNH BÁO: PHÒNG ĐÃ BỊ XÓA TRƯỚC ĐÓ!',
                message: `Phòng "${r.number}" (ID #${r.id}) đã bị xóa khỏi cơ sở dữ liệu bởi quản trị viên hoặc tiến trình khác! Vui lòng tải lại danh sách.`,
                actionText: 'Tải Lại Danh Sách',
                onAction: () => {
                    setSyncErrorModal(null);
                    reloadDataFromBackend();
                },
            });
            setRooms((p) => p.filter((x) => x.id !== r.id));
            setSelected((p) => p.filter((id) => id !== r.id));
            setDeleteTarget(null);
            return;
        }

        if (res && !res.ok) {
            showToast(res.data?.message || 'Không thể xóa phòng khỏi CSDL!', 'error');
            setDeleteTarget(null);
            return;
        }

        // Mất kết nối backend
        lostConnection();
        setRooms((p) => p.filter((x) => x.id !== r.id));
        setSelected((p) => p.filter((id) => id !== r.id));
        addLog(`Xóa phòng ${r.number} (cục bộ)`);
        showToast(`Đã xóa phòng ${r.number} ở chế độ cục bộ.`, 'error');
        setDeleteTarget(null);
    };

    const timeAgo = (t) => {
        const s = Math.max(0, Math.floor((now - t) / 1000));
        if (s < 60) return 'vừa xong';
        if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
        if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
        return `${Math.floor(s / 86400)} ngày trước`;
    };

    const statCards = [
        { key: 'total', label: 'Tổng tồn kho', value: total, unit: 'phòng', pctText: '100%', bar: 'bg-on-surface' },
        { key: 'clean', label: 'Sạch - Trống', value: stats.clean, pctText: `${pct(stats.clean)}%`, bar: 'bg-admin-primary' },
        { key: 'inhouse', label: 'Có khách', value: stats.inhouse, pctText: `${pct(stats.inhouse)}%`, bar: 'bg-secondary' },
        { key: 'dirty', label: 'Bẩn / Chờ dọn', value: stats.dirty, pctText: `${pct(stats.dirty)}%`, bar: 'bg-tertiary-fixed-dim' },
        { key: 'ooo', label: 'Ngừng sử dụng', value: stats.ooo, pctText: `${pct(stats.ooo)}%`, bar: 'bg-error' },
    ];

    const selectCls =
        'bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-admin-primary';

    return (
        <AdminLayout>
            <div className="flex flex-col w-full pb-24">
                {/* Toast */}
                {toast && (
                    <div
                        className={`fixed top-20 right-6 z-[9999] max-w-md flex items-start gap-3 px-5 py-4 rounded-xl shadow-2xl font-label-md text-label-md font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                            toast.type === 'error'
                                ? 'bg-error text-white shadow-error/30'
                                : 'bg-emerald-600 text-white shadow-emerald-900/30'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[24px] flex-shrink-0 mt-0.5">
                            {toast.type === 'error' ? 'error' : 'check_circle'}
                        </span>
                        <div className="flex flex-col">
                            <span className="font-bold text-xs uppercase tracking-wider opacity-90">
                                {toast.type === 'error' ? 'Thông Báo Lỗi' : 'Hệ Thống Đã Đồng Bộ CSDL'}
                            </span>
                            <span className="text-body-sm leading-snug mt-0.5">{toast.msg}</span>
                        </div>
                    </div>
                )}

                {/* Tiêu đề + thanh công cụ */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-admin-primary font-bold flex-wrap">
                            <span>PMS Quản Trị</span>
                            <span className="text-outline-variant">//</span>
                            <span className="text-on-surface-variant">Lễ Tân &amp; Phòng</span>
                            <span className="text-outline-variant">//</span>
                            <span>Kho Phòng Vật Lý</span>
                            <span className="text-outline-variant">//</span>
                            <span className="inline-flex items-center gap-1.5 text-admin-primary bg-admin-primary/10 px-space-xs py-0.5 rounded-full">
                                <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-admin-primary animate-pulse' : 'bg-secondary'}`} />
                                {backendConnected ? 'CSDL Trực Tiếp (MySQL)' : 'Chế Độ Cục Bộ'}
                            </span>
                        </div>
                        <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-1">
                            Quản Lý Danh Sách Phòng
                        </h1>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Thêm, sửa, xóa từng số phòng, nhóm theo tầng, theo dõi trạng thái buồng phòng và thao tác hàng loạt.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-space-xs">
                        <button
                            id="btn-add-room"
                            type="button"
                            onClick={openNew}
                            className="flex items-center gap-space-xs px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 shadow-sm transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            <span>Thêm Phòng Vật Lý</span>
                        </button>
                        <button
                            type="button"
                            onClick={bulkStatusUpdate}
                            className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">checklist</span>
                            <span>Cập Nhật Trạng Thái Hàng Loạt</span>
                        </button>
                        <button
                            type="button"
                            onClick={floorBulkLock}
                            className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container rounded-lg text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            <span>Khóa Cả Tầng</span>
                        </button>
                        <button
                            id="btn-trash-bin"
                            type="button"
                            onClick={openTrashModal}
                            className="flex items-center gap-space-xs px-space-md py-space-sm bg-tertiary-container/30 text-on-surface rounded-lg font-label-md text-label-md font-semibold hover:bg-tertiary-container/50 transition-colors shadow-sm border border-tertiary/20 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px] text-tertiary">delete_sweep</span>
                            <span>Thùng Rác (Xóa Logic)</span>
                        </button>
                    </div>
                </div>

                {/* Thẻ tổng quan */}
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-space-md mb-space-lg">
                    {statCards.map((c) => (
                        <div key={c.key} className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-xs">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                                {c.label}
                            </span>
                            <div className="flex items-baseline justify-between">
                                <span className="font-headline-lg text-headline-lg font-bold text-on-surface font-mono">{c.value}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                                    {c.unit ? `${c.unit} • ` : ''}{c.pctText}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                                <div className={`h-full ${c.bar}`} style={{ width: c.key === 'total' ? '100%' : `${pct(c.value)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bộ lọc */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col md:flex-row md:flex-wrap md:items-end gap-space-sm mb-space-lg">
                    <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Khu (Wing)</span>
                        <select className={selectCls} value={filters.wing} onChange={(e) => setFilter('wing', e.target.value)}>
                            <option value="all">Tất cả khu</option>
                            {WINGS.map((w) => <option key={w} value={w}>Khu {w}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Tầng</span>
                        <select className={selectCls} value={filters.floor} onChange={(e) => setFilter('floor', e.target.value)}>
                            <option value="all">Tất cả tầng</option>
                            {FLOORS.map((f) => <option key={f} value={f}>Tầng {f}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Loại phòng</span>
                        <select className={selectCls} value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
                            <option value="all">Tất cả loại</option>
                            {roomTypes.map((t) => <option key={t.code} value={t.code}>{t.code}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Trạng thái</span>
                        <select className={selectCls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                            <option value="all">Tất cả trạng thái</option>
                            {Object.entries(GROUP_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                        </select>
                    </label>

                    <div className="relative flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined absolute left-3 top-2 text-[20px] text-on-surface-variant">search</span>
                        <input
                            className="w-full bg-surface pl-10 pr-3 py-1.5 rounded-lg border border-outline-variant text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-admin-primary"
                            placeholder="Tìm số phòng hoặc mã khóa..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPages({}); }}
                        />
                    </div>

                    <div className="inline-flex p-1 bg-surface rounded-lg gap-1 border border-outline-variant">
                        {[['list', 'view_list'], ['grid', 'grid_view']].map(([v, icon]) => (
                            <button
                                key={v}
                                type="button"
                                title={v === 'list' ? 'Dạng danh sách' : 'Dạng lưới'}
                                onClick={() => setViewMode(v)}
                                className={`p-1 rounded ${viewMode === v ? 'bg-admin-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Khối theo tầng */}
                <div className="flex flex-col gap-space-lg">
                    {byFloor.length === 0 && (
                        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm text-center text-on-surface-variant font-body-sm">
                            Không tìm thấy phòng phù hợp với bộ lọc.
                        </div>
                    )}

                    {byFloor.map(([floor, list]) => {
                        const floorAll = rooms.filter((r) => r.floor === Number(floor));
                        const fs = { clean: 0, inhouse: 0, dirty: 0, ooo: 0 };
                        floorAll.forEach((r) => { fs[getGroup(r)]++; });
                        const isCollapsed = collapsed[floor];
                        const page = Math.min(pages[floor] || 1, Math.max(1, Math.ceil(list.length / PAGE_SIZE)));
                        const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
                        const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                        const allSelected = list.every((r) => selected.includes(r.id));

                        return (
                            <section key={floor} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                                <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-md border-b border-surface-container-high">
                                    <div className="flex items-center gap-space-sm">
                                        <span className="w-9 h-9 rounded-lg bg-on-surface text-surface flex items-center justify-center font-mono font-bold">
                                            {String(floor).padStart(2, '0')}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-body-md text-body-md font-bold text-on-surface">
                                                Tầng {floor} - Khu {wingOfFloor(Number(floor))} • {floorAll.length} phòng
                                            </span>
                                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                                                {fs.inhouse} có khách • {fs.clean} sạch trống • {fs.dirty} bẩn • {fs.ooo} ngừng sử dụng
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCollapsed((p) => ({ ...p, [floor]: !p[floor] }))}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg border border-outline-variant text-label-md font-label-md font-semibold text-on-surface hover:bg-surface-container"
                                    >
                                        <span>{isCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
                                        <span className="material-symbols-outlined text-[18px]">{isCollapsed ? 'expand_more' : 'expand_less'}</span>
                                    </button>
                                </div>

                                {!isCollapsed && viewMode === 'list' && (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[900px] text-left">
                                                <thead>
                                                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                                                        <th className="py-2.5 px-3 w-10">
                                                            <input
                                                                type="checkbox"
                                                                className="accent-admin-primary"
                                                                checked={allSelected}
                                                                onChange={() => toggleFloorSelect(list)}
                                                                title="Chọn tất cả phòng của tầng"
                                                            />
                                                        </th>
                                                        <th className="py-2.5 px-3">Số phòng</th>
                                                        <th className="py-2.5 px-3">Khu</th>
                                                        <th className="py-2.5 px-3">Loại phòng</th>
                                                        <th className="py-2.5 px-3">Mã đầu đọc khóa</th>
                                                        <th className="py-2.5 px-3">Liên thông</th>
                                                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                                                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-body-sm font-body-sm divide-y divide-surface-container-high/60">
                                                    {pageRows.map((r) => {
                                                        const g = getGroup(r);
                                                        return (
                                                            <tr key={r.id} className={selected.includes(r.id) ? 'bg-admin-primary/5' : 'hover:bg-surface-container-high/40'}>
                                                                <td className="py-2.5 px-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="accent-admin-primary"
                                                                        checked={selected.includes(r.id)}
                                                                        onChange={() => toggleSelect(r.id)}
                                                                    />
                                                                </td>
                                                                <td className="py-2.5 px-3 font-mono font-bold text-body-md text-on-surface">{r.number}</td>
                                                                <td className="py-2.5 px-3 font-mono">{r.wing}</td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-on-surface">{typeName(r.typeCode)}</span>
                                                                        <span className="font-mono text-label-sm text-on-surface-variant">{r.typeCode}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-3 font-mono text-on-surface-variant">{r.keyId}</td>
                                                                <td className="py-2.5 px-3 font-mono text-on-surface-variant">{r.connecting || '---'}</td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap ${GROUP_META[g].cls}`}>
                                                                        {GROUP_META[g].label}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3">
                                                                    <div className="flex items-center justify-end gap-1 flex-wrap">
                                                                        {actionsFor(r).map((a) => (
                                                                            <button
                                                                                key={a}
                                                                                type="button"
                                                                                onClick={() => runRowAction(r, a)}
                                                                                className="px-2 py-1 rounded-lg border border-outline-variant text-label-sm font-label-sm font-bold text-on-surface hover:bg-surface-container whitespace-nowrap"
                                                                            >
                                                                                {ACTION_LABEL[a]}
                                                                            </button>
                                                                        ))}
                                                                        <button
                                                                            type="button"
                                                                            title="Sửa phòng"
                                                                            onClick={() => openEdit(r)}
                                                                            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            title="Xóa phòng"
                                                                            onClick={() => setDeleteTarget(r)}
                                                                            className="p-1 rounded-lg text-error hover:bg-error/10"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex items-center justify-between p-space-sm font-label-sm text-label-sm text-on-surface-variant border-t border-surface-container-high">
                                            <span>Hiển thị {pageRows.length} / {list.length} phòng của tầng {floor}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={page <= 1}
                                                    onClick={() => setPages((p) => ({ ...p, [floor]: page - 1 }))}
                                                    className="px-2 py-0.5 rounded border border-outline-variant disabled:opacity-40"
                                                >
                                                    Trước
                                                </button>
                                                <span className="font-mono px-2">{page} / {totalPages}</span>
                                                <button
                                                    type="button"
                                                    disabled={page >= totalPages}
                                                    onClick={() => setPages((p) => ({ ...p, [floor]: page + 1 }))}
                                                    className="px-2 py-0.5 rounded border border-outline-variant disabled:opacity-40"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {!isCollapsed && viewMode === 'grid' && (
                                    <div className="p-space-md grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-space-sm">
                                        {list.map((r) => {
                                            const g = getGroup(r);
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => toggleSelect(r.id)}
                                                    onDoubleClick={() => openEdit(r)}
                                                    title={`${typeName(r.typeCode)} • ${GROUP_META[g].label} (bấm đúp để sửa)`}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${selected.includes(r.id) ? 'border-admin-primary ring-1 ring-admin-primary' : 'border-outline-variant'
                                                        } ${GROUP_META[g].cls}`}
                                                >
                                                    <span className="font-mono font-bold text-body-md">{r.number}</span>
                                                    <span className="text-[10px] font-bold leading-tight">{GROUP_META[g].label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {/* Nhật ký thao tác */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm mt-space-lg">
                    <div className="flex items-center justify-between mb-space-xs">
                        <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant tracking-wider">
                            Nhật ký thao tác gần đây
                        </span>
                        {logs.length > 0 && (
                            <button type="button" onClick={() => setLogs([])} className="text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface">
                                Xóa nhật ký
                            </button>
                        )}
                    </div>
                    {logs.length === 0 ? (
                        <p className="text-body-sm text-on-surface-variant">Chưa có thao tác nào. Đổi trạng thái hoặc thêm phòng để thấy nhật ký ở đây.</p>
                    ) : (
                        <ul className="flex flex-col divide-y divide-surface-container-high/60 max-h-48 overflow-y-auto">
                            {logs.slice(0, 10).map((l) => (
                                <li key={l.id} className="flex items-center justify-between py-1.5 text-body-sm">
                                    <span className="text-on-surface">{l.text}</span>
                                    <span className="font-mono text-label-sm text-on-surface-variant">{timeAgo(l.at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Thanh thao tác hàng loạt (cố định phía dưới) */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-surface-container-lowest border-t border-outline-variant shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
                <div className="max-w-screen-2xl mx-auto px-6 py-3 flex flex-wrap items-center gap-space-sm">
                    <span className={`font-label-md text-label-md font-bold px-3 py-1.5 rounded-lg ${selected.length > 0 ? 'bg-on-surface text-surface' : 'bg-surface-container text-on-surface-variant'}`}>
                        Đã chọn: {selected.length} phòng
                    </span>
                    <select
                        className={selectCls}
                        value={batchTarget}
                        disabled={selected.length === 0}
                        onChange={(e) => setBatchTarget(e.target.value)}
                    >
                        {BATCH_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    <button
                        type="button"
                        disabled={selected.length === 0}
                        onClick={() => runBatch(batchTarget)}
                        className="px-4 py-1.5 rounded-lg bg-admin-primary text-white font-label-md text-label-md font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Áp dụng
                    </button>
                    <button
                        type="button"
                        disabled={selected.length === 0}
                        onClick={() => setSelected([])}
                        className="px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Bỏ chọn
                    </button>
                    {selected.length === 0 && (
                        <span className="text-label-sm text-on-surface-variant">Tick ô vuông ở đầu dòng để chọn phòng.</span>
                    )}
                </div>
            </div>

            {/* Hộp thoại thêm / sửa */}
            {modal && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(null)}>
                    <div
                        className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl p-space-lg flex flex-col gap-space-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                                {modal.mode === 'new' ? 'Thêm phòng vật lý' : `Sửa phòng ${form.number}`}
                            </h2>
                            <button type="button" onClick={() => setModal(null)} className="p-1 text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-space-sm">
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Số phòng *</label>
                                <input
                                    id="form-room-number"
                                    className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm focus:outline-none focus:ring-1 ${formErrors.number ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-admin-primary'}`}
                                    placeholder="VD: 101"
                                    maxLength={20}
                                    value={form.number}
                                    onChange={(e) => setF('number', e.target.value)}
                                />
                                {formErrors.number && <span className="text-error text-body-xs font-semibold mt-1 block">{formErrors.number}</span>}
                            </div>
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Tầng</label>
                                <select className={`w-full ${selectCls}`} value={form.floor} onChange={(e) => setF('floor', Number(e.target.value))}>
                                    {FLOORS.map((f) => <option key={f} value={f}>Tầng {f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Khu (Wing)</label>
                                <select className={`w-full ${selectCls}`} value={form.wing} onChange={(e) => setF('wing', e.target.value)}>
                                    {WINGS.map((w) => <option key={w} value={w}>Khu {w}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Loại phòng *</label>
                                <select
                                    id="form-room-type"
                                    className={`w-full ${selectCls} ${formErrors.typeCode ? 'border-error' : ''}`}
                                    value={form.typeCode}
                                    onChange={(e) => setF('typeCode', e.target.value)}
                                >
                                    <option value="">-- Chọn loại phòng --</option>
                                    {roomTypes.map((t) => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                                </select>
                                {formErrors.typeCode && <span className="text-error text-body-xs font-semibold mt-1 block">{formErrors.typeCode}</span>}
                            </div>
                            <div className="col-span-2">
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Mã đầu đọc khóa (RFID) *</label>
                                <input
                                    id="form-room-key"
                                    className={`w-full bg-surface border rounded-lg px-3 py-1.5 font-mono text-body-sm focus:outline-none focus:ring-1 ${formErrors.keyId ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-admin-primary'}`}
                                    placeholder="VD: RFID-101"
                                    value={form.keyId}
                                    onChange={(e) => setF('keyId', e.target.value)}
                                />
                                {formErrors.keyId && <span className="text-error text-body-xs font-semibold mt-1 block">{formErrors.keyId}</span>}
                            </div>
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Phòng liên thông</label>
                                <input
                                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-1.5 font-mono text-body-sm focus:outline-none focus:ring-1 focus:ring-admin-primary"
                                    placeholder="VD: 102"
                                    value={form.connecting}
                                    onChange={(e) => setF('connecting', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Trạng thái buồng phòng</label>
                                <select className={`w-full ${selectCls}`} value={form.hk} onChange={(e) => setF('hk', e.target.value)}>
                                    <option value="clean">Sạch</option>
                                    <option value="dirty">Bẩn</option>
                                    <option value="ooo">Ngừng sử dụng</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="font-label-sm text-label-sm font-bold text-on-surface-variant block mb-1">Ghi chú</label>
                                <textarea
                                    rows={2}
                                    maxLength={500}
                                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-admin-primary resize-none"
                                    placeholder="VD: Đang sửa điều hòa, view hơi khuất..."
                                    value={form.note}
                                    onChange={(e) => setF('note', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-space-xs pt-space-sm border-t border-surface-container-high">
                            <button
                                id="btn-save-room"
                                type="button"
                                onClick={handleSave}
                                className="flex-1 px-space-md py-space-sm bg-admin-primary-container text-on-admin-primary font-label-md text-label-md font-bold rounded-lg hover:brightness-105 cursor-pointer"
                            >
                                {modal.mode === 'new' ? 'Thêm phòng' : 'Lưu thay đổi'}
                            </button>
                            <button
                                id="btn-cancel-room"
                                type="button"
                                onClick={() => setModal(null)}
                                className="px-space-md py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high cursor-pointer"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hộp thoại xác nhận xóa */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div
                        className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-space-lg flex flex-col gap-space-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Xóa phòng {deleteTarget.number}?</h2>
                        <p className="text-body-sm text-on-surface-variant">
                            Phòng {deleteTarget.number} (tầng {deleteTarget.floor}, {deleteTarget.typeCode}) sẽ bị xóa khỏi danh sách. Không thể hoàn tác.
                        </p>
                        <div className="flex gap-space-xs">
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="flex-1 py-space-sm bg-error text-white font-label-md text-label-md font-bold rounded-lg hover:brightness-110"
                            >
                                Xóa phòng
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-space-sm bg-surface-container text-on-surface font-label-md text-label-md font-semibold rounded-lg hover:bg-surface-container-high"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚨 MODAL CẢNH BÁO: DỮ LIỆU ĐÃ BỊ XÓA KHỎI CƠ SỞ DỮ LIỆU */}
            {syncErrorModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
                    <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-2 border-error">
                        {/* Header cảnh báo đỏ */}
                        <div className="bg-error px-6 py-4 flex items-center gap-3 text-white">
                            <span className="material-symbols-outlined text-[28px] animate-pulse">
                                warning
                            </span>
                            <div className="flex flex-col">
                                <h3 className="font-title-lg text-title-lg font-bold leading-tight">
                                    {syncErrorModal.title}
                                </h3>
                                <span className="text-[12px] opacity-90 font-mono">PHÁT HIỆN THAY ĐỔI CSDL TRỰC TIẾP</span>
                            </div>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-body-md text-on-surface leading-relaxed">
                                {syncErrorModal.message}
                            </p>

                            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50 text-[13px] text-on-surface-variant flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">
                                    info
                                </span>
                                <span>
                                    Để đảm bảo tính nhất quán dữ liệu của khách sạn, hệ thống đã tạm dừng thao tác này. Vui lòng bấm nút bên dưới để tải lại dữ liệu mới nhất.
                                </span>
                            </div>

                            {/* Các nút hành động */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSyncErrorModal(null)}
                                    className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                                >
                                    Bỏ Qua
                                </button>
                                <button
                                    type="button"
                                    onClick={syncErrorModal.onAction}
                                    className="px-5 py-2.5 rounded-xl bg-error hover:bg-error/90 text-white font-label-md text-label-md font-bold shadow-lg shadow-error/30 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px] animate-spin">
                                        refresh
                                    </span>
                                    <span>{syncErrorModal.actionText}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🗑️ MODAL THÙNG RÁC: QUẢN LÝ CÁC PHÒNG ĐÃ XÓA LOGIC (SOFT DELETE) */}
            {trashModalOpen && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-surface-container-lowest w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex flex-col max-h-[85vh]">
                        {/* Header modal */}
                        <div className="bg-surface-container px-6 py-4 flex items-center justify-between border-b border-outline-variant">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[26px] text-tertiary">
                                    delete_sweep
                                </span>
                                <div>
                                    <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                                        Thùng Rác Phòng Vật Lý (Soft Delete)
                                    </h3>
                                    <p className="text-body-sm text-on-surface-variant">
                                        Cơ chế xóa logic (IsDeleted: 0 → 1). Dữ liệu được bảo toàn trong MySQL và có thể khôi phục bất cứ lúc nào.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTrashModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Danh sách phòng trong thùng rác */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {trashLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[32px] animate-spin text-admin-primary">
                                        progress_activity
                                    </span>
                                    <span>Đang truy vấn cơ sở dữ liệu MySQL...</span>
                                </div>
                            ) : trashRooms.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center">
                                    <span className="material-symbols-outlined text-[48px] text-outline-variant">
                                        auto_delete
                                    </span>
                                    <p className="font-title-md text-title-md font-semibold text-on-surface">
                                        Thùng rác trống
                                    </p>
                                    <p className="text-body-sm max-w-md">
                                        Hiện không có phòng nào bị xóa logic (IsDeleted = 1) trong cơ sở dữ liệu. Mọi phòng đang hoạt động bình thường.
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-body-sm">
                                        <thead className="bg-surface-container font-label-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
                                            <tr>
                                                <th className="py-3 px-4">Số Phòng</th>
                                                <th className="py-3 px-4">Tầng / Khu</th>
                                                <th className="py-3 px-4">Loại Phòng</th>
                                                <th className="py-3 px-4">Trạng Thái DB</th>
                                                <th className="py-3 px-4 text-right">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/60 font-body-sm">
                                            {trashRooms.map((r) => (
                                                <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                                                    <td className="py-3 px-4 font-mono font-bold text-on-surface">
                                                        {r.number}
                                                    </td>
                                                    <td className="py-3 px-4 text-on-surface-variant">
                                                        Tầng {r.floor} • Khu {r.wing}
                                                    </td>
                                                    <td className="py-3 px-4 text-on-surface-variant">
                                                        {typeName(r.typeCode)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-error/10 text-error">
                                                            IsDeleted: 1 (True)
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestoreRoom(r.id, r.number)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-primary/10 hover:bg-admin-primary/20 text-admin-primary font-label-sm text-label-sm font-bold transition-all cursor-pointer shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                restore_from_trash
                                                            </span>
                                                            <span>Khôi Phục (0)</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer modal */}
                        <div className="bg-surface-container px-6 py-3 flex items-center justify-between border-t border-outline-variant">
                            <span className="text-body-sm text-on-surface-variant">
                                Tổng cộng: <strong className="text-on-surface">{trashRooms.length}</strong> phòng trong thùng rác
                            </span>
                            <button
                                type="button"
                                onClick={() => setTrashModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default RoomManagement;
