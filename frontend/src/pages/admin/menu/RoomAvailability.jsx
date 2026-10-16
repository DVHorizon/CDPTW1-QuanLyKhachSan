import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

/* RoomAvailability.jsx — MỘT giao diện duy nhất: Front Desk Operations Center
   (sơ đồ phòng + tình trạng thời gian thực). Không cần backend vẫn chạy nhờ dữ liệu mẫu. */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); };
const today = iso(new Date());
const d10 = (v) => {
    if (!v) return '';
    const str = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) return iso(dt);
    return str.slice(0, 10);
};
const vd = (s) => {
    if (!s) return '—';
    const str = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const parts = str.slice(0, 10).split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        return `${d}/${m}/${y}`;
    }
    return str;
};
const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap');
.fd{--bg:#eef3f6;--ink:#14232e;--mut:#7a8893;--line:#dbe3e9;--g:#0b6b52;--gs:#e0f2ea;--b:#1d6fb8;--bs:#e4eefa;--a:#9a5b0f;--as:#f7ecd9;--s:#4a9ad8;--ss:#e6f2fb;--r:#c0392b;--rs:#fdeaea;--x:#6b7a86;--xs:#e8ecef;
font:500 13px Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);min-height:100vh}
.fd *{box-sizing:border-box}.fd .m{font-family:'JetBrains Mono',monospace}
.fd button,.fd input,.fd select{font:inherit;color:inherit}.fd button{cursor:pointer}
.fd :focus-visible{outline:3px solid #7db7ea;outline-offset:2px}
.fd .bar{height:4px;background:var(--line);border-radius:4px;overflow:hidden}.fd .bar i{display:block;height:100%;background:var(--c,#e8a33d)}
.fd .main{padding:12px 16px 24px;display:grid;gap:14px;min-width:0;align-content:start}
.fd .top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.fd .pill{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:flex;gap:8px;align-items:center;font-weight:600}
.fd .pill select{border:0;background:none;font-weight:600}.fd .grow{flex:1}
.fd .ib{width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:#fff;position:relative}
.fd .ib em{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--r)}
.fd .user{text-align:right;font-weight:700;line-height:1.3}.fd .user small{display:block;color:var(--g);font:600 10px 'JetBrains Mono'}
.fd .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(20,35,46,.06)}
.fd .live{display:inline-block;font:700 10px 'JetBrains Mono';background:var(--gs);color:var(--g);padding:3px 8px;border-radius:5px;letter-spacing:.04em}
.fd .live.off{background:var(--rs);color:var(--r)}
.fd h1{font-size:19px;margin:8px 0 4px;font-weight:800;text-transform:uppercase;letter-spacing:.01em}
.fd .sub{color:var(--mut);font-size:12px}.fd .head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.fd .hb{display:flex;gap:8px}.fd .hb button{background:var(--bg);border:0;border-radius:10px;padding:8px 14px;font-weight:600;font-size:11.5px}
.fd .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.fd .st{background:#fff;border-radius:14px;padding:14px;display:grid;gap:8px;box-shadow:0 2px 10px rgba(20,35,46,.05);border:2px solid transparent;text-align:left}
.fd .st.on{border-color:var(--c)}.fd .st span{font:700 10.5px 'JetBrains Mono';color:var(--c);text-transform:uppercase}
.fd .st div{display:flex;justify-content:space-between;align-items:baseline}.fd .st b{font:700 32px 'JetBrains Mono'}.fd .st small{font:700 11px 'JetBrains Mono';color:var(--c)}
.fd .st .bar i{background:var(--c);width:var(--w)}
.fd .tabs{display:inline-flex;gap:4px;background:var(--bg);padding:4px;border-radius:10px}.fd .tabs button{border:0;background:none;padding:7px 12px;border-radius:8px;font-weight:600}.fd .tabs button.on{background:#fff;color:var(--g)}
.fd .filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
.fd .chip{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 12px;font-weight:600}.fd .chip.on{background:var(--g);border-color:var(--g);color:#fff}
.fd .search{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:#fff}.fd .search input{border:0;outline:0;flex:1;background:none}
.fd .body{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}
.fd .wing{background:var(--bg);border-radius:16px;padding:14px;margin-bottom:14px}
.fd .wing h2{font-size:15px;margin:0 0 2px;font-weight:700}.fd .wing .m{font-size:10px;color:var(--mut);text-transform:uppercase}
.fd .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:12px}
.fd .rc{background:#fff;border-radius:12px;border:2px solid transparent;border-top:4px solid var(--c);padding:12px;display:grid;gap:7px;text-align:left;box-shadow:0 2px 8px rgba(20,35,46,.06)}
.fd .rc.sel{border-color:var(--b);border-top-color:var(--b)}
.fd .rc header{display:flex;gap:8px;align-items:center}.fd .rc header b{font:700 21px 'JetBrains Mono'}
.fd .tag{font:700 9.5px 'JetBrains Mono';background:var(--soft);color:var(--c);padding:3px 7px;border-radius:5px;text-transform:uppercase}
.fd .gname{font-weight:700;font-size:15px;display:flex;justify-content:space-between;gap:6px}.fd .meta{font-size:11.5px;color:var(--mut);display:flex;justify-content:space-between;gap:6px}
.fd .note{background:var(--bg);border-radius:8px;padding:7px 9px;font-size:11px;font-weight:600}
.fd .s-occupied{--c:var(--b);--soft:var(--bs)}.fd .s-dueIn{--c:var(--a);--soft:var(--as)}.fd .s-dueOut{--c:var(--s);--soft:var(--ss)}
.fd .s-vacant{--c:var(--g);--soft:var(--gs)}.fd .s-dirty{--c:var(--r);--soft:var(--rs)}.fd .s-ooo{--c:var(--x);--soft:var(--xs)}
.fd .rc.s-ooo{opacity:.85}.fd .rc.s-dirty .note{background:var(--rs);color:var(--r)}
.fd .dp{position:sticky;top:12px;display:grid;gap:12px}.fd .dp h3{margin:0;font:700 20px 'JetBrains Mono'}
.fd .hero{border-radius:12px;height:120px;background:linear-gradient(150deg,#1d5f7a,#d9b27a);color:#fff;padding:10px;display:flex;flex-direction:column;justify-content:flex-end;font-size:11px}
.fd .who{font:700 26px 'Playfair Display',serif;margin:2px 0}.fd .kv{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fd .kv div{border:1px solid var(--line);border-radius:10px;padding:9px;display:grid;gap:3px}.fd .kv small{font:600 10px 'JetBrains Mono';color:var(--mut);text-transform:uppercase}.fd .kv b{font:700 13px 'JetBrains Mono'}
.fd .acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fd .acts button{border:0;background:var(--bg);border-radius:10px;padding:11px 8px;font-weight:700;font-size:12px}
.fd .acts button.pri{background:var(--g);color:#fff}.fd .acts button:disabled{opacity:.45;cursor:not-allowed}
.fd .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 18px;border-radius:10px;font-weight:600;z-index:50}
.fd .warn{background:var(--as);color:var(--a);padding:9px 14px;border-radius:10px;font-weight:600}
@media(max-width:1200px){.fd .stats{grid-template-columns:repeat(3,1fr)}.fd .body{grid-template-columns:1fr}.fd .dp{position:static}}
`;

const ST = {
    occupied: ['OCCUPIED', 'ĐANG CÓ KHÁCH'], dueIn: ['ARRIVAL TODAY', 'KHÁCH SẮP ĐẾN'], dueOut: ['DEPARTURE TODAY', 'KHÁCH SẮP ĐI'],
    vacant: ['READY', 'TRỐNG & SẠCH SẼ'], dirty: ['HK DIRTY', 'BẨN CHỜ DỌN'], ooo: ['BẢO TRÌ OOO', 'KHÓA BẢO TRÌ (OOO)'],
};
const STATS = [['occupied', 'dueOut'], ['dueIn'], ['dueOut'], ['vacant'], ['dirty'], ['ooo']];
const STAT_KEYS = ['occupied', 'dueIn', 'dueOut', 'vacant', 'dirty', 'ooo'];

// ---------- Dữ liệu mẫu ----------
const NAMES = ['Nguyễn Văn An', 'Jonathan Sterling', 'Trần Hoàng Nam', 'Đặng Thùy Dung', 'Lê Quốc Huy', 'Phạm Mai Anh', 'Võ Minh Tuấn', 'Hoàng Gia Bảo'];
const TYPES = ['Oceanfront Royal Villa', 'Peninsula Garden Suite', 'Deluxe King Ocean', 'Family Pool Villa'];
function buildMock() {
    const rooms = [], bookings = [];
    [1, 2, 3].forEach((f) => {
        for (let i = 1; i <= 8; i++) {
            const id = f * 100 + i, s = (f * 7 + i * 5) % 10;
            const status = i === 7 && f === 2 ? 'ooo' : (i + f) % 7 === 2 ? 'dirty' : 'available';
            rooms.push({ id, roomNumber: `V-${id}`, floor: f, wing: i <= 4 ? 'A' : 'B', status, typeName: TYPES[(i + f) % 4] });
            if (status !== 'available') continue;
            const b = { id: `m${id}`, roomId: id, guestName: NAMES[(i + f) % NAMES.length], confirmationNo: String(88000 + id), balance: ((i * 37) % 5) * 6200000, keys: 2 };
            if (s < 4) bookings.push({ ...b, checkIn: addDays(today, -2), checkOut: addDays(today, 2 + (i % 3)), status: 'checked_in' });
            else if (s === 4) bookings.push({ ...b, checkIn: addDays(today, -3), checkOut: today, status: 'checked_in' });
            else if (s === 5) bookings.push({ ...b, checkIn: today, checkOut: addDays(today, 2), status: 'confirmed', keys: 0, balance: 0 });
        }
    });
    return { rooms, bookings };
}
const MOCK = buildMock();
const overlaps = (b, r) => d10(b.checkIn) < r.checkOut && (d10(b.checkOut) > r.checkIn || (b.status === 'checked_in' && d10(b.checkOut) === today && r.checkIn === today));
const mockFor = (r) => MOCK.rooms.map((x) => ({ ...x, booking: MOCK.bookings.find((b) => b.roomId === x.id && overlaps(b, r)) || null }));
function derive(room) {
    const b = room.booking;
    if (room.status === 'ooo') return 'ooo';
    if (b) {
        if (b.status === 'checked_in' && d10(b.checkOut) === today) return 'dueOut';
        if (b.status !== 'checked_in' && d10(b.checkIn) === today) return 'dueIn';
        return 'occupied';
    }
    return room.status === 'dirty' ? 'dirty' : 'vacant';
}
const nightsOf = (b) => Math.max(1, Math.round((new Date(d10(b.checkOut)) - new Date(d10(b.checkIn))) / 864e5));

export default function RoomAvailability() {
    const [checkIn, setCheckIn] = useState(today);
    const [checkOut, setCheckOut] = useState(addDays(today, 1));
    const range = useMemo(() => ({ checkIn, checkOut }), [checkIn, checkOut]);
    const [raw, setRaw] = useState([]);
    const [ovr, setOvr] = useState({});
    const [isMock, setIsMock] = useState(false);
    const [live, setLive] = useState(true);
    const [filter, setFilter] = useState(null);
    const [q, setQ] = useState('');
    const [selId, setSelId] = useState(null);
    const [notice, setNotice] = useState('');
    const [clock, setClock] = useState(new Date());
    const [cd, setCd] = useState(30);

    const load = useCallback(async () => {
        if (!range.checkIn || !range.checkOut) {
            setNotice('Ngày nhận phòng và ngày trả phòng không được để trống.');
            return;
        }
        if (range.checkOut <= range.checkIn) {
            setNotice('Ngày trả phòng phải sau ngày nhận phòng.');
            return;
        }
        try {
            const res = await fetch(`${API}/api/admin/room-availability?${new URLSearchParams(range)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
            });
            const json = await res.json();
            if (!res.ok || !json.rooms?.length) throw new Error(json.message || 'empty');
            setRaw(json.rooms); setIsMock(false); setOvr({});
        } catch (err) {
            console.warn('Fallback to mock rooms:', err.message);
            setRaw(mockFor(range)); setIsMock(true);
        }
        setCd(30);
    }, [range]);
    const loadRef = useRef(load);
    useEffect(() => { loadRef.current = load; }, [load]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const t = setInterval(() => { setClock(new Date()); setCd((c) => { if (c <= 1) { loadRef.current(); return 30; } return c - 1; }); }, 1000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        const s = io(API, { transports: ['websocket', 'polling'], reconnection: true, timeout: 4000 });
        let t;
        s.on('connect', () => setLive(true)); s.on('disconnect', () => setLive(false)); s.on('connect_error', () => setLive(false));
        s.on('availability:changed', () => { clearTimeout(t); t = setTimeout(() => loadRef.current(), 300); });
        return () => { clearTimeout(t); s.disconnect(); };
    }, []);
    useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(t); }, [notice]);

    const rooms = useMemo(() => raw.map((r) => {
        const o = ovr[r.id];
        const x = o ? { ...r, status: o.status ?? r.status, booking: o.booking === undefined ? r.booking : o.booking } : r;
        return { ...x, state: derive(x) };
    }), [raw, ovr]);

    const total = rooms.length || 1;
    const count = (keys) => rooms.filter((r) => keys.includes(r.state)).length;
    const shown = useMemo(() => {
        const kw = q.trim().toLowerCase();
        return rooms.filter((r) => (!filter || STATS[filter].includes(r.state)) &&
            (!kw || `${r.roomNumber} ${r.booking?.guestName || ''} ${r.booking?.confirmationNo || ''}`.toLowerCase().includes(kw)));
    }, [rooms, filter, q]);
    const wings = useMemo(() => {
        const m = {};
        shown.forEach((r) => { const k = `${r.floor}${r.wing}`; (m[k] = m[k] || []).push(r); });
        return Object.entries(m);
    }, [shown]);
    const sel = rooms.find((r) => r.id === selId) || rooms.find((r) => r.booking) || rooms[0];

    const act = async (kind) => {
        if (!sel) return;
        const n = sel.roomNumber, b = sel.booking;

        // Bắt lỗi các trường hợp trước khi gọi API
        if (kind === 'clean' && sel.state !== 'dirty') {
            return setNotice(`Phòng ${n} không ở trạng thái bẩn chờ dọn.`);
        }
        if (kind === 'key' && !b) {
            return setNotice(`Phòng ${n} chưa có khách để tạo thẻ E-Key.`);
        }
        if (kind === 'out' && !b) {
            return setNotice(`Phòng ${n} chưa có khách để làm thủ tục trả phòng.`);
        }
        if (kind === 'ooo' && b) {
            return setNotice(`Phòng ${n} đang có khách lưu trú, không thể khóa bảo trì.`);
        }
        if (kind === 'detail') {
            return setNotice(b ? `Mã xác nhận #${b.confirmationNo} · Khách: ${b.guestName} · ${vd(b.checkIn)} → ${vd(b.checkOut)}` : `Phòng ${n} đang trống sẵn sàng đón khách.`);
        }

        try {
            const actionMap = { clean: 'clean', key: 'key', out: 'checkout', ooo: 'ooo', available: 'available' };
            const res = await fetch(`${API}/api/admin/room-availability/${sel.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({ action: actionMap[kind] || kind })
            });
            const data = await res.json();
            if (!res.ok) {
                return setNotice(data.message || 'Thao tác không thành công.');
            }
            setNotice(data.message || 'Thao tác thành công!');
            load(); // Cập nhật đồng bộ dữ liệu thật từ database MySQL
        } catch (err) {
            setNotice('Lỗi kết nối máy chủ backend: ' + err.message);
        }
    };

    const b = sel?.booking;
    return (
        <AdminLayout>
            <div className="fd">
                <style>{CSS}</style>

                <div className="main">
                    {isMock && <div className="warn">Đang hiển thị DỮ LIỆU MẪU vì API chưa kết nối được. Khi backend có dữ liệu, trang tự chuyển sang dữ liệu thật từ CSDL MySQL.</div>}

                    <section className="card head">
                        <div>
                            <span className={`live ${live || isMock ? '' : 'off'}`}>● {live ? 'DIRECT LIVE FEED (MYSQL)' : (isMock ? 'DỮ LIỆU MẪU' : 'MẤT KẾT NỐI')}</span>
                            <h1>Front Desk Operations Center • Sơ đồ phòng và tình trạng thời gian thực</h1>
                            <div className="sub">Đồng bộ trực tiếp MySQL • Làm mới tự động mỗi 30s • <span className="m">Tổng số: {rooms.length} phòng vận hành</span></div>
                        </div>
                        <div className="hb" style={{ alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                                Nhận:
                                <input type="date" value={checkIn} onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) { setNotice('Ngày nhận phòng không được để trống.'); return; }
                                    if (val >= checkOut) { setNotice('Ngày nhận phòng phải trước ngày trả phòng.'); return; }
                                    setCheckIn(val);
                                }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                                Trả:
                                <input type="date" value={checkOut} onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) { setNotice('Ngày trả phòng không được để trống.'); return; }
                                    if (val <= checkIn) { setNotice('Ngày trả phòng phải sau ngày nhận phòng.'); return; }
                                    setCheckOut(val);
                                }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }} />
                            </label>
                            <button onClick={load}>⟳ Làm Mới</button>
                            <button disabled>⏱ {cd}s</button>
                        </div>
                    </section>

                    <div className="stats">
                        {STATS.map((keys, i) => {
                            const k = STAT_KEYS[i], n = count(keys);
                            return (
                                <button key={k} className={`st s-${k} ${filter === i ? 'on' : ''}`} onClick={() => setFilter(filter === i ? null : i)}>
                                    <span>{ST[k][1]}</span>
                                    <div><b>{n}</b><small>{Math.round((n / total) * 100)}%</small></div>
                                    <div className="bar" style={{ '--w': `${(n / total) * 100}%` }}><i /></div>
                                </button>
                            );
                        })}
                    </div>

                    <section className="card">
                        <div className="tabs"><button className="on">▦ Lưới Thẻ Phòng (Grid Rack)</button><button onClick={() => setNotice('Chế độ này chưa có trong bản demo.')}>Dòng Thời Gian (Gantt)</button><button onClick={() => setNotice('Chế độ này chưa có trong bản demo.')}>Bản Đồ Phân Khu</button></div>
                        <div className="filters"><span className="m sub">LỌC NHANH:</span>
                            <button className={`chip ${filter === null ? 'on' : ''}`} onClick={() => setFilter(null)}>Tất Cả ({rooms.length})</button>
                            {STAT_KEYS.map((k, i) => <button key={k} className={`chip ${filter === i ? 'on' : ''}`} onClick={() => setFilter(filter === i ? null : i)}>{ST[k][1].replace(/ \(OOO\)/, '')} ({count(STATS[i])})</button>)}
                        </div>
                        <label className="search">🔍<input placeholder="Tìm số phòng, tên khách, mã folio..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm phòng" /></label>
                    </section>

                    <div className="body">
                        <div>
                            {wings.length === 0 && <div className="card">Không có phòng phù hợp bộ lọc.</div>}
                            {wings.map(([k, list], i) => (
                                <section className="wing" key={k}>
                                    <h2>Dãy {i + 1}: {list[0].typeName}</h2>
                                    <div className="m">DÃY {k} • {list.filter((r) => r.state !== 'ooo').length} / {list.length} phòng hoạt động</div>
                                    <div className="grid">{list.map((r) => {
                                        const bk = r.booking;
                                        return (
                                            <button key={r.id} className={`rc s-${r.state} ${sel?.id === r.id ? 'sel' : ''}`} onClick={() => setSelId(r.id)}>
                                                <header><b>{r.roomNumber}</b><span className="tag">{ST[r.state][0]}</span></header>
                                                {bk ? (<>
                                                    <div className="gname">{bk.guestName}</div>
                                                    <div className="meta"><span>{r.state === 'dueIn' ? `Đến: ${vd(bk.checkIn)}` : `Trả: ${vd(bk.checkOut)}`}</span><span className="m">Folio: {vnd(bk.balance)}</span></div>
                                                    <div className="note">🔑 {bk.keys || 0} thẻ từ • CONF #{bk.confirmationNo}</div>
                                                </>) : (<>
                                                    <div className="gname">{r.state === 'ooo' ? 'Khóa kỹ thuật' : r.state === 'dirty' ? 'Chờ làm vệ sinh' : 'Sẵn sàng đón khách'}</div>
                                                    <div className="meta"><span>{r.typeName}</span></div>
                                                    <div className="note">{r.state === 'ooo' ? '🔧 Đang bảo trì' : r.state === 'dirty' ? '🧹 Cần dọn phòng' : '✓ Đã kiểm định, sạch sẽ'}</div>
                                                </>)}
                                            </button>
                                        );
                                    })}</div>
                                </section>
                            ))}
                        </div>

                        {sel && (
                            <section className="card dp" aria-label="Chi tiết phòng">
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><h3>{sel.roomNumber}</h3><span className={`tag s-${sel.state}`}>{ST[sel.state][0]}</span></div>
                                <div className="sub">Hạng: {sel.typeName}</div>
                                <div className="hero"><b>{b ? 'QUẢN GIA PHỤ TRÁCH' : 'PHÒNG KHÔNG CÓ KHÁCH'}</b>{b ? `RFID Key • ${b.keys || 0} thẻ đang kích hoạt` : ST[sel.state][1]}</div>
                                {b && (<>
                                    <div><small className="m sub">CHỦ THẺ LƯU TRÚ</small><div className="who">{b.guestName}</div>
                                        <div className="sub">{nightsOf(b)} đêm • Mã #{b.confirmationNo}</div></div>
                                    <div className="kv">
                                        <div><small>Lịch trình lưu trú</small><b>{vd(b.checkIn)} → {vd(b.checkOut)}</b></div>
                                        <div><small>Chi tiêu folio</small><b>{vnd(b.balance)}</b></div>
                                    </div>
                                </>)}
                                <div className="kv">
                                    <div><small>Nhiệt độ</small><b>22.5°C</b></div>
                                    <div><small>E-Key RFID</small><b>{b ? `${b.keys || 0} thẻ` : '—'}</b></div>
                                </div>
                                <div className="acts">
                                    <button onClick={() => act('detail')}>Chi Tiết Đặt Phòng</button>
                                    <button onClick={() => act('clean')} disabled={sel.state !== 'dirty'}>Lệnh Dọn Buồng</button>
                                    <button onClick={() => act('key')} disabled={!b}>Tạo Thẻ E-Key</button>
                                    <button className="pri" onClick={() => act('out')} disabled={!b}>Thanh Toán &amp; Trả Phòng</button>
                                    {sel.state === 'ooo' ? (
                                        <button onClick={() => act('available')} style={{ gridColumn: 'span 2', background: 'var(--g)', color: '#fff' }}>
                                            ✓ Mở Khóa Kỹ Thuật (Sẵn Sàng Đón Khách)
                                        </button>
                                    ) : !b ? (
                                        <button onClick={() => act('ooo')} style={{ gridColumn: 'span 2', background: 'var(--xs)', color: 'var(--x)' }}>
                                            🔧 Khóa Kỹ Thuật Bảo Trì (OOO)
                                        </button>
                                    ) : null}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
                {notice && <div className="toast" role="status">{notice}</div>}
            </div>
        </AdminLayout>
    );
}
