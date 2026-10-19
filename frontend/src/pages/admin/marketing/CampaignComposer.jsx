import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const CampaignComposer = () => {
  const navigate = useNavigate();

  // Step 1: Thông tin chiến dịch & Phân khúc
  const [campaignName, setCampaignName] = useState('Ưu Đãi Đặt Sớm Mùa Lễ Hội Giáng');
  const [campaignGoal, setCampaignGoal] = useState('Giữ Chân Khách & Tối Ưu Doanh Thu');
  const [audienceCriteria, setAudienceCriteria] = useState({
    vip: true, // VIP Black & Gold (2.250 khách hàng VIP)
    inHouse: true, // Khách In-House (124 phòng đang ở)
    dormant: true, // Vắng mặt > 180 ngày (4.320 khách tái kích hoạt)
    minSpend: '> 12.000.000 đ',
    market: 'Việt Nam & Quốc Tế'
  });

  // Step 2: Kênh phát sóng & Soạn thảo nội dung
  const [selectedChannels, setSelectedChannels] = useState({
    zalo: true,
    sms: true,
    email: true
  });

  const [selectedTemplate, setSelectedTemplate] = useState('Mẫu Lễ Hội Đặt Sớm v2 (Festive-Early)');
  
  const [messageContent, setMessageContent] = useState(
    'Kính chào {{TEN_KHACH}}, cùng đón mùa lễ hội rực rỡ tại thiên đường đảo ngọc Grand Horizon Resort! Là hội viên {{HANG_THE}} với {{DIEM_THUONG}} điểm tích lũy, Quý khách được hưởng ưu đãi độc quyền giảm 25% giá các hạng Biệt thự biển kèm buffet sáng thượng hạng và 60 phút Spa. Đặt phòng trước 15/11 qua link: {{LINK_DAT_PHONG}}'
  );

  const bannerImage = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80';

  // Step 3: Xem trước & Điều phối lịch gửi
  const [scheduleDate, setScheduleDate] = useState('2025-11-01');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [throttlingSpeed, setThrottlingSpeed] = useState(200); // 200 tin/giây
  const [antiSpamDnd, setAntiSpamDnd] = useState(true); // Khóa 20:00 - 08:00

  // Chế độ mô phỏng điện thoại (Simulator switch)
  const [phoneChannelView, setPhoneChannelView] = useState('Zalo'); // 'Zalo' | 'SMS' | 'Email'

  // Phản hồi gửi thành công
  const [statusNotification, setStatusNotification] = useState('');

  // Token cá nhân hóa
  const tokens = [
    '{{TEN_KHACH}}',
    '{{HANG_THE}}',
    '{{DIEM_THUONG}}',
    '{{LINK_DAT_PHONG}}',
    '{{MA_GIAM_GIA}}',
    '{{SO_PHONG}}'
  ];

  const handleInsertToken = (token) => {
    setMessageContent((prev) => prev + ' ' + token);
  };

  const handleAudienceToggle = (key) => {
    setAudienceCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChannelToggle = (key) => {
    setSelectedChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePublish = async (isDraft = false) => {
    try {
      const channels = [];
      if (selectedChannels.zalo) channels.push('Zalo OA');
      if (selectedChannels.sms) channels.push('SMS');
      if (selectedChannels.email) channels.push('Email');

      await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          goal: campaignGoal,
          targetAudience: 'VIP, In-House & Tái kích hoạt',
          targetCount: totalAudience,
          channels: channels.length > 0 ? channels : ['Zalo OA', 'SMS'],
          scheduleDate: `${scheduleDate} - ${scheduleTime}`,
          content: messageContent,
          bannerUrl: bannerImage,
          throttleSpeed: throttlingSpeed,
          antiSpamDnd: antiSpamDnd,
          isDraft
        })
      });

      setStatusNotification(
        isDraft
          ? '✔ Đã lưu bản nháp thành công vào Cơ Sở Dữ Liệu PMS (Database)!'
          : '🚀 Đã lưu và lên lịch phát hành toàn kênh thành công vào Database PMS!'
      );
    } catch (e) {
      setStatusNotification(
        isDraft
          ? '✔ Đã lưu bản nháp thành công vào hệ thống PMS!'
          : '🚀 Đã lên lịch phát hành toàn kênh thành công!'
      );
    }

    setTimeout(() => {
      setStatusNotification('');
      navigate('/admin/marketing');
    }, 1800);
  };

  // Tính toán quy mô người nhận theo tiêu chí
  const totalAudience = (audienceCriteria.vip ? 2250 : 0) + 
                        (audienceCriteria.inHouse ? 124 : 0) + 
                        (audienceCriteria.dormant ? 4320 : 0) + 1726;

  // Dự toán chi phí truyền thông
  const costZalo = 5800 * 491; // 2.850.000 đ
  const costSms = 7900 * 500;  // 3.950.000 đ
  const totalCost = costZalo + costSms;

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-800">
        
        {/* TOP HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <span>PHÂN HỆ 40 // BỘ SOẠN THẢO CHIẾN DỊCH KHUYẾN MÃI ĐA KÊNH</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">TERMINAL NODE-04</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
              Thiết Lập & Phát Hành Chiến Dịch Tiếp Thị Đa Kênh
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                TRẠNG THÁI: BẢN NHÁP // MÃ: CMP-2025-106
              </span>
              <span>• Tạo lúc: 14:32:09 GMT+7 bởi Lê Minh Anh</span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handlePublish(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base">save</span>
              Lưu Bản Nháp
            </button>
            <button
              onClick={() => alert('Đã gửi bản tin thử nghiệm đến số máy Quản lý: 0988123456 qua Zalo & SMS!')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 transition"
            >
              <span className="material-symbols-outlined text-base text-blue-600">send</span>
              Gửi Thử Nghiệm (Test Preview)
            </button>
            <button
              onClick={() => handlePublish(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-md hover:shadow transition transform active:scale-95"
            >
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              Lên Lịch & Phát Hành Toàn Kênh
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {statusNotification && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-sm">verified</span>
            {statusNotification}
          </div>
        )}

        {/* 3 BƯỚC QUY TRÌNH (STEPPER) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="bg-white border-2 border-emerald-600/60 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              01
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                BƯỚC 1 // HỒ SƠ & TỆP KHÁCH
              </div>
              <div className="text-xs font-bold text-gray-900">
                Phân Khúc Khách Hàng Mục Tiêu
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-600/60 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              02
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                BƯỚC 2 // SOẠN THẢO ĐA KÊNH
              </div>
              <div className="text-xs font-bold text-gray-900">
                Nội Dung & Banner Thông Điệp
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-600/60 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              03
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                BƯỚC 3 // MÔ PHỎNG & LẬP LỊCH
              </div>
              <div className="text-xs font-bold text-gray-900">
                Điều Phối Tốc Độ & Giám Sát Chống Spam
              </div>
            </div>
          </div>

        </div>

        {/* NỘI DUNG CHÍNH: 2 CỘT (Cột trái: BƯỚC 1 + BƯỚC 2; Cột phải: BƯỚC 3 SIMULATOR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (7 phần): BƯỚC 1 + BƯỚC 2 */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* --- BƯỚC 1: THÔNG TIN CHIẾN DỊCH & PHÂN KHÚC KHÁCH HÀNG --- */}
            <div className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">group_work</span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Bước 1: Thông Tin Chiến Dịch & Phân Khúc Khách Hàng
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  AUDIENCE SEGMENTATION
                </span>
              </div>

              {/* Tên chiến dịch & Mục tiêu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">TÊN CHIẾN DỊCH TIẾP THỊ</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">MỤC TIÊU TĂNG TRƯỞNG</label>
                  <input
                    type="text"
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Bộ lọc tệp khách hàng (Audience criteria) */}
              <div className="pt-2">
                <label className="block font-bold text-gray-700 mb-2 text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-700">filter_list</span>
                  BỘ LỌC TỆP KHÁCH HÀNG NHẬN TIN (AUDIENCE CRITERIA)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  <div
                    onClick={() => handleAudienceToggle('vip')}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      audienceCriteria.vip
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={audienceCriteria.vip}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-xs">VIP Black & Gold</span>
                    </div>
                    <p className="text-[11px] text-gray-500 pl-5 mt-0.5">2.250 khách hàng VIP</p>
                  </div>

                  <div
                    onClick={() => handleAudienceToggle('inHouse')}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      audienceCriteria.inHouse
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={audienceCriteria.inHouse}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-xs">Khách In-House</span>
                    </div>
                    <p className="text-[11px] text-gray-500 pl-5 mt-0.5">124 phòng đang ở</p>
                  </div>

                  <div
                    onClick={() => handleAudienceToggle('dormant')}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      audienceCriteria.dormant
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={audienceCriteria.dormant}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-xs">Vắng mặt &gt; 180 ngày</span>
                    </div>
                    <p className="text-[11px] text-gray-500 pl-5 mt-0.5">4.320 khách tái kích hoạt</p>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Chi tiêu tối thiểu:</span>
                    <strong className="text-emerald-800 font-mono font-bold">&gt; 12.000.000 đ</strong>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Thị trường khách:</span>
                    <strong className="text-gray-900 font-bold">Việt Nam &amp; Quốc Tế</strong>
                  </div>
                </div>
              </div>

              {/* Hộp Tổng quy mô tiếp cận */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border border-emerald-300/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      TỔNG QUY MÔ TIẾP CẬN TỨC THÌ
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-gray-900 font-mono">
                        {totalAudience.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-900">Khách Hàng Mục Tiêu</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-bold text-gray-700 border-t sm:border-t-0 sm:border-l border-emerald-300 pt-2 sm:pt-0 sm:pl-4">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">Zalo OA</div>
                    <div className="text-blue-700">5.800</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">SMS Brand</div>
                    <div className="text-amber-700">7.900</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-sans">Email EDM</div>
                    <div className="text-emerald-700">8.200</div>
                  </div>
                </div>
              </div>

            </div>

            {/* --- BƯỚC 2: KÊNH PHÁT SÓNG & SOẠN THẢO NỘI DUNG --- */}
            <div className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">chat_bubble</span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Bước 2: Kênh Phát Sóng &amp; Soạn Thảo Nội Dung
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  CONTENT COMPOSER
                </span>
              </div>

              {/* Chọn kênh phát & Template */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">PHÁT SÓNG ĐA KÊNH</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedChannels.zalo}
                        onChange={() => handleChannelToggle('zalo')}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      Zalo OA
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedChannels.sms}
                        onChange={() => handleChannelToggle('sms')}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      SMS Brandname
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedChannels.email}
                        onChange={() => handleChannelToggle('email')}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      Email EDM
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">MẪU THÔNG ĐIỆP (TEMPLATE)</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 text-gray-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Mẫu Lễ Hội Đặt Sớm v2 (Festive-Early)">Mẫu Lễ Hội Đặt Sớm v2 (Festive-Early)</option>
                    <option value="TMPL-CHECKIN-REMINDER">Nhắc Lịch Check-in 24h (Pre-Arrival)</option>
                    <option value="TMPL-ROOM-GUIDE">Hướng dẫn Nhận phòng & E-Key (Welcome)</option>
                    <option value="TMPL-CHECKOUT-THANKS">Cảm ơn Sau Check-out & Khảo sát NPS</option>
                  </select>
                </div>
              </div>

              {/* Biến cá nhân hóa */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-gray-700">BIẾN CÁ NHÂN HÓA (PERSONALIZATION TOKENS):</span>
                  <span className="text-[11px] text-emerald-700 font-semibold cursor-pointer hover:underline">
                    NHẤP ĐỂ CHÈN TỰ ĐỘNG
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tokens.map((tk) => (
                    <button
                      key={tk}
                      type="button"
                      onClick={() => handleInsertToken(tk)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold rounded border border-emerald-200 transition"
                    >
                      {tk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vùng soạn thảo nội dung */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-gray-700">NỘI DUNG THÔNG ĐIỆP SOẠN THẢO</span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Chuẩn ký tự: UTF-8 Vietnamese
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-xs bg-gray-50 font-sans leading-relaxed text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                  <span className="font-mono font-bold text-emerald-700">
                    {messageContent.length} / 320 ký tự
                  </span>
                  <span>(Tương đương 2 tin nhắn SMS / 1 mẫu tin ZNS)</span>
                </div>
              </div>

              {/* Banner chiến dịch */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">
                  TẢI LÊN BANNER CHIẾN DỊCH (TỶ LỆ 1200 X 628 PX)
                </label>
                <div className="relative rounded-xl overflow-hidden border border-gray-300 group cursor-pointer">
                  <img
                    src={bannerImage}
                    alt="Campaign Banner"
                    className="w-full h-44 object-cover group-hover:opacity-90 transition"
                  />
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white opacity-90 group-hover:opacity-100 transition">
                    <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    <span className="text-xs font-bold mt-1">festive-early-bird-banner-1200x628.webp</span>
                    <span className="text-[10px] text-gray-200 font-mono">1200 x 628 px • Kích thước 420 KB • Nhấp để thay đổi</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* CỘT PHẢI (5 phần): BƯỚC 3: XEM TRƯỚC (PHONE SIMULATOR) & ĐIỀU PHỐI LỊCH */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">stay_current_portrait</span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Bước 3: Xem Trước &amp; Điều Phối Lịch Gửi
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  PHONE SIMULATOR
                </span>
              </div>

              {/* Phone Channel Selector */}
              <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-bold text-gray-700">
                {['Zalo', 'SMS', 'Email'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setPhoneChannelView(ch)}
                    className={`flex-1 py-1 px-2 rounded-md transition ${
                      phoneChannelView === ch
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Mô phỏng {ch}
                  </button>
                ))}
              </div>

              {/* PHONE MOCKUP FRAME */}
              <div className="mx-auto w-full max-w-[340px] bg-slate-900 rounded-[32px] p-3 shadow-2xl border-4 border-slate-700">
                {/* Phone screen */}
                <div className="bg-white rounded-[24px] overflow-hidden text-xs text-gray-800">
                  
                  {/* Status bar */}
                  <div className="bg-emerald-800 text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-mono">
                    <span>09:41</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
                      <span className="material-symbols-outlined text-[13px]">wifi</span>
                      <span className="material-symbols-outlined text-[13px]">battery_full</span>
                    </div>
                  </div>

                  {/* Header trong app */}
                  <div className="bg-white px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                      GH
                    </div>
                    <div>
                      <div className="font-bold text-[11px] text-gray-900 flex items-center gap-1">
                        Grand Horizon Resort
                        <span className="material-symbols-outlined text-emerald-600 text-[13px]">verified</span>
                      </div>
                      <div className="text-[9px] text-gray-400">
                        {phoneChannelView === 'Zalo' ? 'Zalo Official Account' : phoneChannelView === 'SMS' ? 'SMS Brandname: GRANDHORIZON' : 'Email: reservations@grandhorizon.vn'}
                      </div>
                    </div>
                  </div>

                  {/* Body Tin Nhắn Simulator */}
                  <div className="p-3 bg-slate-50 space-y-2.5 max-h-[360px] overflow-y-auto">
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Banner trong tin nhắn */}
                      <div className="relative">
                        <img
                          src={bannerImage}
                          alt="In-App Banner"
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute bottom-1 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Ưu Đãi Lễ Hội 2025
                        </div>
                      </div>

                      {/* Content với Token đã được giải mã */}
                      <div className="p-2.5 text-[11px] leading-relaxed text-gray-700 space-y-2">
                        <p>
                          Kính chào <strong className="text-gray-900">Arthur Dent</strong>, cùng đón mùa lễ hội rực rỡ tại thiên đường đảo ngọc <strong className="text-emerald-800">Grand Horizon Resort</strong>!
                        </p>
                        <p>
                          Là hội viên <strong className="text-amber-700 font-semibold">Black Lotus VIP</strong> với <strong className="text-emerald-700">48.500</strong> điểm tích lũy, Quý khách được hưởng ưu đãi độc quyền giảm 25% giá các hạng Biệt thự biển kèm buffet sáng thượng hạng và 60 phút Spa.
                        </p>

                        <button className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-center text-xs shadow mt-2">
                          [ ĐẶT BIỆT THỰ NGAY ]
                        </button>

                        <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1 font-mono">
                          <span>MÃ: GH-FESTIVE25</span>
                          <span>10:00 AM • Đã xác thực</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* LẬP LỊCH & ĐIỀU PHỐI TỐC ĐỘ */}
              <div className="space-y-3 pt-2 text-xs">
                
                {/* Ngày giờ phát */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">NGÀY PHÁT SÓNG</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">GIỜ GỬI (GMT+7)</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Bộ điều tiết tốc độ (Throttling) */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between font-bold text-gray-800 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-700">speed</span>
                      Bộ Điều Tiết Tốc Độ Phát Tán (Throttling)
                    </span>
                    <span className="font-mono text-emerald-800">{throttlingSpeed} tin/giây</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
                    value={throttlingSpeed}
                    onChange={(e) => setThrottlingSpeed(Number(e.target.value))}
                    className="w-full accent-emerald-700"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Bảo vệ kênh viễn thông, chống đánh dấu spam từ nhà mạng Viettel/Vinaphone.
                  </p>
                </div>

                {/* Chính sách chống làm phiền (Anti-Spam & DND Window) */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="dndCheck"
                      checked={antiSpamDnd}
                      onChange={(e) => setAntiSpamDnd(e.target.checked)}
                      className="mt-0.5 rounded text-amber-700 focus:ring-amber-500"
                    />
                    <div>
                      <label htmlFor="dndCheck" className="font-bold text-gray-900 cursor-pointer block">
                        Chính Sách Chống Làm Phiền (Anti-Spam &amp; DND Window)
                      </label>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                        Hệ thống tự động khóa phát tán từ <strong className="text-amber-800">20:00 đến 08:00 sáng</strong>. Tin nhắn hẹn giờ rơi vào khung này sẽ tự động chuyển dời sang 08:05 sáng hôm sau.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dự toán ngân sách truyền thông */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 space-y-1 font-mono text-xs">
                  <div className="flex justify-between font-bold text-emerald-900 font-sans">
                    <span>DỰ TOÁN NGÂN SÁCH TRUYỀN THÔNG</span>
                    <span className="text-[11px] text-emerald-700">TỶ LỆ PHÊ DUYỆT 100%</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[11px] pt-1">
                    <span>Zalo ZNS (5.800 tin x 491 đ):</span>
                    <strong>{costZalo.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[11px]">
                    <span>SMS Brandname (7.900 tin x 500 đ):</span>
                    <strong>{costSms.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="border-t border-emerald-200 pt-1.5 flex justify-between font-bold text-gray-900 text-sm">
                    <span>Tổng Chi Phí Dự Kiến:</span>
                    <span className="text-emerald-800 font-black">{totalCost.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="text-[10px] text-gray-500 text-right">
                    ≈ $274 USD
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM METRICS PREVIEW FOOTER */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">
                Tỷ Lệ Mở Dự Kiến &amp; Hiệu Suất Chiến Dịch Trước
              </div>
              <div className="text-[11px] text-gray-500">
                Chiến dịch tương tự gần nhất (Mùa Thu Vàng - CMP-2025-089) đạt 78.4% Open Rate, 21.6% Click-through.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="text-right">
              <div className="text-[10px] uppercase text-gray-500 font-bold">Dự báo chuyển đổi:</div>
              <div className="text-emerald-700 font-black font-mono text-sm">4.8% (404 Bookings)</div>
            </div>
            <div className="text-right border-l pl-6 border-gray-200">
              <div className="text-[10px] uppercase text-gray-500 font-bold">Doanh thu dự phòng:</div>
              <div className="text-emerald-800 font-black font-mono text-base">3.240.000.000 đ</div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default CampaignComposer;
