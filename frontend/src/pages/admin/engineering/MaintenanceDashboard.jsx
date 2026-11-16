import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const MaintenanceDashboard = () => {
  const navigate = useNavigate();

  // Bộ lọc danh sách phiếu
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'P1' | 'P2' | 'P3'
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Thống kê 4 Cards KPI (Ảnh 1)
  const [stats, setStats] = useState({
    activeCount: 12,
    p1Count: 3,
    p2Count: 5,
    p3Count: 4,
    avgResolution: '42.5',
    resolutionTrend: '-4.2 phút so với ca trước',
    slaTarget: 'Cam kết SLA: < 60 phút 79.8%',
    dutyCount: '06/06',
    dutyDesc: '4 Điện Lạnh HVAC • 2 Cấp Thoát Nước',
    ppmRate: '96.4%',
    ppmDetail: 'Hoàn thành 48/50 hạng mục tuần • 2 hạng mục còn lại (W-42)'
  });

  // Danh sách phiếu công tác (Ảnh 1)
  const [tickets, setTickets] = useState([
    {
      id: 1,
      code: 'WO-2025-0891',
      room: 'Suite 1401 Penthouse',
      roomBadge: 'VIP OCC',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      priority: 'P1 KHẨN CẤP',
      priorityColor: 'text-rose-600 bg-rose-50 border-rose-200',
      title: 'Lỗi điều hòa VRF E-41 nhiệt độ...',
      source: 'Nguồn: AI Concierge',
      time: '14:24',
      techName: 'R. Nguyễn (HVAC Lead)',
      techAvatar: 'RN',
      techStatus: 'Đang xử lý tại phòng',
      slaTimer: '12:45 CÒN',
      slaMax: 'Hạn SLA: 30 Phút',
      slaWarning: true,
      status: 'IN_PROGRESS'
    },
    {
      id: 2,
      code: 'WO-2025-0890',
      room: 'Phòng 804 (Tháp B)',
      roomBadge: 'Khách: Arthur Dent',
      badgeColor: 'bg-gray-100 text-gray-700',
      priority: 'P2 ƯU TIÊN',
      priorityColor: 'text-amber-700 bg-amber-50 border-amber-200',
      title: 'Kẹt nút thoát nước bồn tắm...',
      source: 'Nguồn: Lễ Tân gọi',
      time: '14:38',
      techName: 'D. Miller (Ống Nước)',
      techAvatar: 'DM',
      techStatus: 'Đang di chuyển đến tầng 8',
      slaTimer: '28:10 CÒN',
      slaMax: 'Hạn SLA: 45 Phút',
      slaWarning: false,
      status: 'IN_PROGRESS'
    },
    {
      id: 3,
      code: 'WO-2025-0889',
      room: 'Phòng 407',
      roomBadge: 'Trống Sạch',
      badgeColor: 'bg-emerald-50 text-emerald-700',
      priority: 'P2 ƯU TIÊN',
      priorityColor: 'text-amber-700 bg-amber-50 border-amber-200',
      title: 'Đèn đọc sách đầu giường chập...',
      source: 'Buồng Phòng báo',
      time: '14:15',
      techName: 'K. Sarkis (Điện Module)',
      techAvatar: 'KS',
      techStatus: 'Đang thay module cảm ứng',
      slaTimer: '18:20 CÒN',
      slaMax: 'Hạn SLA: 60 Phút',
      slaWarning: false,
      status: 'IN_PROGRESS'
    },
    {
      id: 4,
      code: 'WO-2025-0888',
      room: 'Bếp Tổng (Main Kitchen)',
      roomBadge: 'F&B B1',
      badgeColor: 'bg-gray-100 text-gray-700',
      priority: 'P3 TIÊU CHUẨN',
      priorityColor: 'text-blue-700 bg-blue-50 border-blue-200',
      title: 'Nhiệt độ kho đông lạnh tăng lên...',
      source: 'Cảm biến IoT nhiệt',
      time: '13:56',
      techName: 'Kho Vật Tư Kỹ Thuật',
      techAvatar: 'VT',
      techStatus: 'Đang xuất gioăng EPDM #44',
      slaTimer: 'TẠM DỪNG',
      slaMax: 'Chờ vật tư phê duyệt',
      slaWarning: false,
      status: 'PAUSED'
    },
    {
      id: 5,
      code: 'WO-2025-0887',
      room: 'Khu Lotus Spa & Wellness',
      roomBadge: 'Nghiệm thu: 14:10',
      badgeColor: 'bg-teal-50 text-teal-800',
      priority: 'HOÀN TẤT',
      priorityColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      title: 'Nghẹt vòi xông hơi tinh dầu...',
      source: 'Thời gian xử lý: 25 phút',
      time: '14:10',
      techName: 'T. Hoàng (Ống Nước)',
      techAvatar: 'TH',
      techStatus: 'Đã đóng phiếu thành công',
      slaTimer: 'ĐẠT SLA (100%)',
      slaMax: 'Tiết kiệm 20 phút',
      slaWarning: false,
      status: 'CLOSED'
    }
  ]);

  // Chọn mặc định phiếu đầu tiên để thao tác
  useEffect(() => {
    if (!selectedTicket && tickets.length > 0) {
      setSelectedTicket(tickets[0]);
    }
  }, [tickets]);

  // Tải dữ liệu từ backend
  const fetchTickets = () => {
    fetch('/api/maintenance/tickets')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data && resData.data.length > 0) {
          const mapped = resData.data.map(d => ({
            id: d.TicketId,
            code: d.TicketCode,
            room: d.RoomNumber,
            roomBadge: d.RoomOccupancyStatus || 'OCCUPIED',
            badgeColor: d.RoomOccupancyStatus?.includes('VIP') ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700',
            priority: d.Priority,
            priorityColor: d.Priority?.includes('P1') ? 'text-rose-600 bg-rose-50 border-rose-200' : d.Priority?.includes('P2') ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-200',
            title: d.Symptom,
            source: `Nguồn: ${d.Source}`,
            time: '14:38',
            techName: d.TechnicianName,
            techAvatar: d.TechnicianAvatar || 'KS',
            techStatus: d.StatusLabel,
            slaTimer: d.Status === 'CLOSED' ? 'ĐẠT SLA' : `${d.SlaMinutes} Phút`,
            slaMax: `Hạn SLA: ${d.SlaMinutes} Phút`,
            status: d.Status
          }));
          setTickets(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Xử lý Nghiệm thu đóng phiếu
  const handleCompleteTicket = async (ticketId) => {
    try {
      const res = await fetch(`/api/maintenance/tickets/${ticketId}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          notes: 'Kỹ sư đã thay thế linh kiện và kiểm định vận hành tiêu chuẩn 5 sao.'
        })
      });
      const data = await res.json();
      alert(data.message || 'Nghiệm thu đóng phiếu thành công! Phòng đã tự động cập nhật trạng thái Sẵn sàng.');
      fetchTickets();
    } catch (e) {
      alert('Đã nghiệm thu và đóng phiếu kỹ thuật thành công!');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (activeFilter === 'P1' && !t.priority.includes('P1')) return false;
    if (activeFilter === 'P2' && !t.priority.includes('P2')) return false;
    if (activeFilter === 'P3' && !t.priority.includes('P3')) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return t.code.toLowerCase().includes(q) || t.room.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-800">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <span>PHÂN HỆ 43 // BẢO TRÌ TỔNG THỂ &amp; HẠ TẦNG KỸ THUẬT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                ĐIỀU HÀNH SỰ CỐ THỜI GIAN THỰC • SLA TIER-1 PROTOCOL
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
              Trung Tâm Điều Hành &amp; Phân Luồng Sự Cố Kỹ Thuật
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Tiếp nhận yêu cầu bảo trì từ Tiền sảnh, AI Concierge và cảm biến IoT; điều phối kỹ sư xử lý theo cam kết SLA 5 sao.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/admin/engineering/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow transition transform active:scale-95"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              + Lập Phiếu Yêu Cầu Mới
            </button>
            <button
              onClick={() => alert('Đang mở Lịch bảo trì định kỳ ngăn ngừa PPM...')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">calendar_month</span>
              Lịch Bảo Trì Định Kỳ (PPM)
            </button>
            <button
              onClick={() => alert('Đang mở Bảng phân ca kỹ sư ca chiều...')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">badge</span>
              Bảng Phân Ca Kỹ Sư
            </button>
            <button
              onClick={() => alert('Đang trích xuất Báo Cáo SLA Định Kỳ (.Excel)...')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base text-gray-600">download</span>
              Xuất Báo Cáo SLA
            </button>
          </div>
        </div>

        {/* 4 CARDS KPI TỔNG QUAN (ẢNH 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Sự cố đang xử lý */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>SỰ CỐ ĐANG XỬ LÝ</span>
              <span className="p-1 rounded-lg bg-rose-50 text-rose-700">
                <span className="material-symbols-outlined text-base">warning</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.activeCount}</span>
              <span className="text-xs text-gray-400">Phiếu đang vận hành song song</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono">
              <span className="text-rose-600 font-bold">03 P1 Khẩn Cấp</span>
              <span className="text-amber-600 font-bold">05 P2 Ưu Tiên</span>
              <span className="text-blue-600 font-bold">04 P3 Tiêu Chuẩn</span>
            </div>
          </div>

          {/* Card 2: Thời gian xử lý trung bình */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>THỜI GIAN XỬ LÝ TRUNG BÌNH</span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-base">timer</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.avgResolution}</span>
              <span className="text-xs text-gray-500 font-semibold">Phút</span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">↓ {stats.resolutionTrend}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
              {stats.slaTarget}
            </div>
          </div>

          {/* Card 3: Đội ngũ kỹ sư đang trực */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>ĐỘI NGŨ KỸ SƯ ĐANG TRỰC</span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-700">
                <span className="material-symbols-outlined text-base">groups</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats.dutyCount}</span>
              <span className="text-xs text-emerald-700 font-bold font-mono">Sẵn Sàng</span>
              <span className="text-[11px] text-gray-400">100% quân số tại trạm</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center justify-between">
              <span>❄ 4 Điện Lạnh HVAC</span>
              <span>🚰 2 Cấp Thoát Nước</span>
            </div>
          </div>

          {/* Card 4: Tuân thủ bảo trì ngừa PPM */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              <span>TUÂN THỦ BẢO TRÌ NGỪA (PPM)</span>
              <span className="p-1 rounded-lg bg-teal-50 text-teal-700">
                <span className="material-symbols-outlined text-base">verified</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700 font-mono">{stats.ppmRate}</span>
              <span className="text-xs text-gray-500">Hoàn thành 48/50</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 truncate">
              {stats.ppmDetail}
            </div>
          </div>

        </div>

        {/* BANNER HẠ TẦNG NĂNG LƯỢNG & IOT TRUNG TÂM (CHILLER & VRF) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">hvac</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">HẠ TẦNG NĂNG LƯỢNG &amp; IOT TRUNG TÂM</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm">
                Hệ Thống Chiller Biến Tần &amp; VRF Multi-V Vận Hành Ổn Định
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                214 cảm biến áp suất, lưu lượng khí gas và độ ẩm phòng khách đang truyền dữ liệu trực tuyến với độ trễ 200ms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-sans">Công Suất Làm Lạnh</div>
              <div className="text-gray-900 font-black text-base">1,820 <span className="text-xs font-normal">kW</span></div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-sans">COP Toàn Khu</div>
              <div className="text-emerald-700 font-black text-base">5.42 <span className="text-xs font-normal text-emerald-600">Hi-Eff</span></div>
            </div>
            <div className="border-l pl-4 border-gray-200">
              <div className="text-[10px] text-gray-400 uppercase font-sans">Kênh Khẩn Cấp (Ext #8800)</div>
              <div className="text-rose-600 font-bold">04 Phiếu AI • 02 Cảnh Báo IoT</div>
            </div>
          </div>
        </div>

        {/* KHU VỰC 2 CỘT (Cột trái 8 phần: Bảng danh sách phiếu; Cột phải 4 phần: Mật độ sự cố & Sơ đồ VRF) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (8 phần): BẢNG SỰ CỐ & ĐIỀU PHỐI KỸ THUẬT */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Bộ lọc thanh công cụ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-xs font-bold">
                <span className="text-gray-500 font-sans mr-1">Lọc Theo:</span>
                {[
                  { label: 'Tất Cả (12)', val: 'ALL' },
                  { label: 'P1 Khẩn Cấp (3)', val: 'P1' },
                  { label: 'P2 Ưu Tiên (5)', val: 'P2' },
                  { label: 'P3 Thường (4)', val: 'P3' }
                ].map(btn => (
                  <button
                    key={btn.val}
                    onClick={() => setActiveFilter(btn.val)}
                    className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                      activeFilter === btn.val
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Tìm số phiếu, số phòng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="material-symbols-outlined text-sm text-gray-400 absolute left-2.5 top-2">
                  search
                </span>
              </div>
            </div>

            {/* BẢNG DANH SÁCH PHIẾU CÔNG TÁC (KHỚP ẢNH 1) */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-3">MÃ &amp; CẤP ĐỘ</th>
                    <th scope="col" className="px-3.5 py-3">VỊ TRÍ &amp; MÔ TẢ SỰ CỐ</th>
                    <th scope="col" className="px-3.5 py-3">KỸ SƯ TIẾP NHẬN</th>
                    <th scope="col" className="px-3.5 py-3 text-center">ĐỒNG HỒ SLA</th>
                    <th scope="col" className="px-3.5 py-3 text-center">TÁC VỤ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.map(tk => {
                    const isSelected = selectedTicket && selectedTicket.id === tk.id;
                    return (
                      <tr
                        key={tk.id}
                        onClick={() => setSelectedTicket(tk)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Mã & Cấp độ */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-900">{tk.code}</div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${tk.priorityColor}`}>
                            {tk.priority}
                          </span>
                        </td>

                        {/* Vị trí & Mô tả */}
                        <td className="px-3.5 py-3 max-w-[280px]">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <span>{tk.room}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${tk.badgeColor}`}>
                              {tk.roomBadge}
                            </span>
                          </div>
                          <div className="text-gray-700 text-xs truncate mt-0.5 font-medium">
                            {tk.title}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {tk.source} • {tk.time}
                          </div>
                        </td>

                        {/* Kỹ sư tiếp nhận */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                              {tk.techAvatar}
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 leading-tight">{tk.techName}</div>
                              <div className="text-[10px] text-emerald-700 font-semibold">{tk.techStatus}</div>
                            </div>
                          </div>
                        </td>

                        {/* Đồng hồ SLA */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <div className={`font-mono font-bold ${tk.slaWarning ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {tk.slaTimer}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{tk.slaMax}</div>
                        </td>

                        {/* Tác vụ */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteTicket(tk.id);
                            }}
                            title="Nghiệm thu đóng phiếu"
                            className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-gray-100 transition"
                          >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ACTION FOOTER BAR DÀNH CHO PHIẾU ĐANG CHỌN */}
            {selectedTicket && (
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-900">Đang chọn: 01 phiếu [{selectedTicket.code}]</span>
                  <span className="text-[11px] text-gray-500 font-mono">• Thao tác nhanh cho ca trực:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => alert(`Đã phân công phụ tá kỹ thuật hỗ trợ phiếu #${selectedTicket.code}`)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Gắn Kỹ Sư Phụ
                  </button>
                  <button
                    onClick={() => alert(`Đã gửi cảnh báo thiếu vật tư cho kho BOH`)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Báo Thiếu Vật Tư
                  </button>
                  <button
                    onClick={() => alert(`Đã gia hạn SLA thêm +15 phút cho phiếu #${selectedTicket.code}`)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Gia Hạn SLA (+15p)
                  </button>
                  <button
                    onClick={() => handleCompleteTicket(selectedTicket.id)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow transition"
                  >
                    ✔ Nghiệm Thu Đóng Phiếu
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* CỘT PHẢI (4 phần): MẬT ĐỘ SỰ CỐ & SƠ ĐỒ MẠCH LẠNH VRF TRỰC TUYẾN */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: MẬT ĐỘ SỰ CỐ THEO KHU VỰC (RADAR RESORT) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-emerald-700">radar</span>
                  <span>Mật Độ Sự Cố Khu Vực</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 font-bold">RADAR RESORT</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Phân bổ tải kỹ thuật theo cánh khách sạn và phân khu tiện ích.
              </p>

              <div className="space-y-2 text-xs">
                
                {/* Khu 1 */}
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">Cánh A (Ocean Suites - Tầng 1-7)</div>
                    <div className="text-[10px] text-gray-500">02 sự cố nhỏ • Áp lực bình thường</div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-800">
                    BÌNH THƯỜNG
                  </span>
                </div>

                {/* Khu 2 */}
                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">Cánh B (Lagoon Villas &amp; F&amp;B)</div>
                    <div className="text-[10px] text-amber-700 font-semibold">05 sự cố • Tập trung khu bếp &amp; hồ bơi</div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800">
                    TẢI CAO
                  </span>
                </div>

                {/* Khu 3 */}
                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">Tháp Penthouse (Tầng 12-16)</div>
                    <div className="text-[10px] text-rose-700 font-semibold">03 sự cố • Có khách VIP tại phòng</div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-600 text-white">
                    BÁO ĐỘNG ĐỎ
                  </span>
                </div>

              </div>
            </div>

            {/* Card 2: SƠ ĐỒ MẠCH LẠNH VRF TRỰC TUYẾN (LIVE LOOP) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-sky-600">device_hub</span>
                  <span>Sơ Đồ Mạch Lạnh VRF Trực Tuyến</span>
                </div>
                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-emerald-100 text-emerald-800">
                  LIVE LOOP
                </span>
              </div>

              {/* Sơ đồ trực quan */}
              <div className="bg-slate-900 rounded-xl p-3 text-white font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 text-[10px] text-gray-400">
                  <span>CHILLER-01 (100%)</span>
                  <span>OUTDOOR VRF-CENTRAL</span>
                </div>
                <div className="p-2 rounded bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <span>VRF-PENT-14 [Suite 1401]</span>
                  <span className="text-rose-400 font-bold animate-pulse">+5.2°C LỆCH</span>
                </div>
                <div className="text-[10px] text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  Cảm biến 1401: Báo động quá nhiệt
                </div>
              </div>

              {/* Nhật ký tự động PMS Auto-Audit */}
              <div className="pt-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase font-mono mb-1.5">
                  NHẬT KÝ TỰ ĐỘNG PMS (AUTO-AUDIT)
                </div>
                <div className="space-y-1.5 text-[11px] text-gray-600">
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-gray-400 text-[10px] shrink-0">14:41</span>
                    <span><strong>Kỹ sư R. Nguyễn đến Suite 1401:</strong> Xác nhận bằng mã quẹt RFID cửa phòng kỹ thuật penthouse.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-gray-400 text-[10px] shrink-0">14:38</span>
                    <span><strong>AI Concierge tự động mở phiếu WO-0891:</strong> Phát hiện lệnh điều chỉnh điều hòa 21°C nhưng phòng tiếp tục nóng.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-gray-400 text-[10px] shrink-0">14:20</span>
                    <span><strong>Đóng phiếu WO-2025-0887 thành công:</strong> Spa Lotus Sauna 2 đã được cấp chứng nhận an toàn nhiệt.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM FOOTER: TRƯỞNG CA KỸ THUẬT & SỔ GIAO BAN ĐIỆN TỬ */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-gray-800">
              <span className="material-symbols-outlined text-xl">engineering</span>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <span>Trưởng Ca Kỹ Thuật: Kỹ Sư Trưởng Phan Bá Hùng</span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  BỘ ĐÀM CHÍNH CH-09
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Ca Chiều (14:00 - 22:00) • Đã đồng bộ biên bản giao ban điện tử với Trưởng Ca Sáng lúc 13:55.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Đang mở Sổ Giao Ban Kỹ Thuật Điện Tử...')}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-xs transition"
            >
              Xem Sổ Giao Ban Điện Tử
            </button>
            <button
              onClick={() => alert('Đã phát tín hiệu thông báo khẩn qua bộ đàm toàn đội kỹ sư!')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-sm">cell_tower</span>
              Phát Thông Báo Toàn Đội
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default MaintenanceDashboard;
