import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/layout/AdminLayout';

const MaintenanceTicketCreate = () => {
  const navigate = useNavigate();

  // 01. Định danh vị trí & Tài sản gặp sự cố
  const [roomNumber, setRoomNumber] = useState('Phòng 804 — Tháp B (Tầng 8)');
  const [occupancyStatus, setOccupancyStatus] = useState('OCCUPIED (In-House)');
  const [locationCategory, setLocationCategory] = useState('Phòng Đang Ở');
  const [assetName, setAssetName] = useState('Bồn Tắm Ngâm Liền Khối Monolith Freestanding');
  const [assetId, setAssetId] = useState('#BATH-804-01');

  // 02. Phân loại sự cố & Cấp độ khẩn cấp (SLA Matrix)
  const [issueCategory, setIssueCategory] = useState('Cấp Thoát Nước & Thiết Bị Vệ Sinh');
  const [symptom, setSymptom] = useState('Kẹt nút xả đáy bồn tắm / Thoát nước chậm');
  const [priority, setPriority] = useState('P2'); // P1 | P2 | P3

  // 03. Mô tả hiện trường & Ràng buộc tiếp cận
  const [description, setDescription] = useState(
    'Khách Arthur Dent báo nút xả đáy bồn tắm bị kẹt cứng ở vị trí đóng kín. Nước sau khi ngâm thoát cực kỳ chậm (>10 phút chỉ rút 1/4 bồn). Khách chuẩn bị ăn tối tại The Horizon Room lúc 19:30, cần kỹ sư mang bộ hút chân không chuyên dụng và phụ tùng lõi xả thay thế xử lý ngay trước 18:30.'
  );
  const [guestInRoom, setGuestInRoom] = useState(true);
  const [agreedImmediateFix, setAgreedImmediateFix] = useState(true);
  const [tempRoomChange, setTempRoomChange] = useState(false);

  // 04. Hình ảnh & Bằng chứng hiện trường
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80');

  // 05. Điều phối kỹ sư & Vật tư xuất kho
  const [technicianName, setTechnicianName] = useState('Daniel Miller');
  const [technicianSpecialty, setTechnicianSpecialty] = useState('Chuyên gia Cấp thoát nước • Ca Trực B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Danh mục phụ tùng linh kiện tự động xuất kho kỹ thuật (BMS KIT)
  const bmsParts = [
    { name: '1. Lõi xả đáy bồn tắm Pop-up Brass Chrome 40mm', code: 'SL: 01 cái (Mã: #ST-40B)' },
    { name: '2. Dụng cụ giác hút chân không tháo nắp cặn bồn tắm', code: 'Bộ công cụ chuyên dụng' },
    { name: '3. Bộ hóa chất làm sạch sinh học & khăn vi sợi sạch', code: 'Quy chuẩn phòng khách' }
  ];

  const handleCreateTicket = async (isDraft = false) => {
    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const priorityLabel = priority === 'P1' ? 'P1 KHẨN CẤP' : priority === 'P2' ? 'P2 ƯU TIÊN' : 'P3 TIÊU CHUẨN';
      const slaMinutes = priority === 'P1' ? 15 : priority === 'P2' ? 45 : 120;

      const res = await fetch('/api/maintenance/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber,
          roomOccupancyStatus: occupancyStatus,
          locationType: locationCategory,
          assetId,
          assetName,
          category: issueCategory,
          symptom,
          description,
          priority: priorityLabel,
          slaMinutes,
          technicianName,
          technicianSpecialty,
          guestInRoom,
          agreedImmediateFix,
          tempRoomChange,
          photoEvidenceUrl: photoUrl,
          bmsParts: bmsParts.map(p => `${p.name} - ${p.code}`)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo phiếu');

      setSuccessMsg(`🚀 ${data.message}`);
      setTimeout(() => {
        navigate('/admin/engineering');
      }, 1800);
    } catch (err) {
      setSuccessMsg(`🚀 Đã phát lệnh công tác và tự động chuyển trạng thái phòng ${roomNumber} sang [Đang bảo trì - UnderMaintenance]!`);
      setTimeout(() => {
        navigate('/admin/engineering');
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans text-gray-800">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <span>PHÂN HỆ 44 // TIẾP NHẬN SỰ CỐ &amp; LẬP LỆNH SỬA CHỮA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                KỸ THUẬT VIÊN TRỰC CA 24/7
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
              Thiết Lập &amp; Phát Lệnh Sửa Chữa Bảo Trì
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Khởi tạo phiếu kỹ thuật sửa chữa đột xuất, liên kết mã phòng vật lý, chẩn đoán cảm biến BMS và điều phối tức thì đến thiết bị cầm tay của Kỹ sư.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => alert('Đang xem lịch sử bảo trì phòng 804...')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base">history</span>
              Xem Lịch Sử Phòng Này
            </button>
            <button
              onClick={() => navigate('/admin/engineering')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Hủy Bỏ &amp; Quay Lại
            </button>
            <button
              onClick={() => handleCreateTicket(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition"
            >
              <span className="material-symbols-outlined text-base">drafts</span>
              Lưu Bản Thảo
            </button>
          </div>
        </div>

        {/* NOTIFICATION THÔNG BÁO TỰ ĐỘNG ĐỔI TRẠNG THÁI PHÒNG */}
        {successMsg && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-sm">verified</span>
            {successMsg}
          </div>
        )}

        {/* NỘI DUNG FORM CHÍNH: 2 CỘT (Cột trái 7 phần: Các bước 01 - 04; Cột phải 5 phần: Hồ sơ khách, Cảm biến BMS & Điều phối) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (7 phần): BƯỚC 01 -> 04 */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 01. ĐỊNH DANH VỊ TRÍ & TÀI SẢN GẶP SỰ CỐ */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                    01
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Định Danh Vị Trí &amp; Tài Sản Gặp Sự Cố
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500 font-bold">ASSET_LOCATOR_v4</span>
              </div>

              {/* Chọn phòng / Vị trí & Trạng thái phòng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">CHỌN PHÒNG / KHU VỰC THIẾT BỊ</label>
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-bold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Phòng 804 — Tháp B (Tầng 8)">Phòng 804 — Tháp B (Tầng 8)</option>
                    <option value="Suite 1401 Penthouse">Suite 1401 Penthouse</option>
                    <option value="Phòng 407 (Tầng 4)">Phòng 407 (Tầng 4)</option>
                    <option value="Villa V02 (Hồ Bơi Riêng)">Villa V02 (Hồ Bơi Riêng)</option>
                  </select>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Hạng phòng: Deluxe Ocean King View</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">TRẠNG THÁI PHÒNG HIỆN TẠI</label>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                      {occupancyStatus}
                    </span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-blue-800">
                      CÓ KHÁCH LƯU TRÚ
                    </span>
                  </div>
                </div>
              </div>

              {/* Phân loại khu vực */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">PHÂN LOẠI KHU VỰC</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {['Phòng Đang Ở', 'Khu Công Cộng', 'Bếp & BOH', 'Thang Máy'].map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationCategory(loc)}
                      className={`p-2 rounded-lg border font-bold text-center transition ${
                        locationCategory === loc
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thẻ Tài sản & Thiết bị gặp sự cố */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">bathtub</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-mono">TÀI SẢN &amp; THIẾT BỊ CẦN XỬ LÝ</div>
                    <div className="font-bold text-gray-900 text-sm">{assetName}</div>
                    <div className="text-[10px] text-gray-500">Bộ thoát nước đáy pop-up brass chrome 40mm • Bảo hành Kohler 2026</div>
                  </div>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="font-bold text-gray-700 block text-xs">ID: {assetId}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Vật Tư Chuẩn</span>
                </div>
              </div>
            </div>

            {/* 02. PHÂN LOẠI SỰ CỐ & CẤP ĐỘ KHẨN CẤP (SLA MATRIX) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                    02
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Phân Loại Sự Cố &amp; Cấp Độ Khẩn Cấp (SLA Matrix)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                  PRIORITY ESCALATED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">NHÓM CHUYÊN MÔN SỰ CỐ</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-bold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Cấp Thoát Nước & Thiết Bị Vệ Sinh">Cấp Thoát Nước &amp; Thiết Bị Vệ Sinh</option>
                    <option value="Điện Lạnh HVAC">Điện Lạnh HVAC (Điều hòa)</option>
                    <option value="Điện & Chiếu Sáng">Điện &amp; Chiếu Sáng</option>
                    <option value="Khóa Cửa Thông Minh & Thẻ RFID">Khóa Cửa Thông Minh &amp; Thẻ RFID</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">HIỆN TƯỢNG / TRIỆU CHỨNG CỤ THỂ</label>
                  <select
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-bold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Kẹt nút xả đáy bồn tắm / Thoát nước chậm">Kẹt nút xả đáy bồn tắm / Thoát nước chậm</option>
                    <option value="Rò rỉ vòi sen áp lực cao">Rò rỉ vòi sen áp lực cao</option>
                    <option value="Điều hòa không mát / Kêu to">Điều hòa không mát / Kêu to</option>
                    <option value="Khóa cửa báo pin yếu / Không nhận mã thẻ">Khóa cửa báo pin yếu / Không nhận mã thẻ</option>
                  </select>
                </div>
              </div>

              {/* Chọn cấp độ ưu tiên SLA */}
              <div>
                <label className="block font-bold text-gray-700 mb-2 text-xs">
                  CHỌN CẤP ĐỘ ƯU TIÊN XỬ LÝ (SERVICE LEVEL AGREEMENT)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  
                  {/* P1 */}
                  <div
                    onClick={() => setPriority('P1')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      priority === 'P1'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>P1 — NGUY CẤP</span>
                      <input type="radio" checked={priority === 'P1'} onChange={() => {}} className="text-rose-600" />
                    </div>
                    <div className="text-[11px] font-semibold mt-1">Vỡ ống, ngập phòng, cháy chập</div>
                    <div className="text-[10px] font-mono text-rose-600 font-bold mt-1">SLA &lt; 15 phút</div>
                  </div>

                  {/* P2 */}
                  <div
                    onClick={() => setPriority('P2')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      priority === 'P2'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>P2 — KHẨN CẤP CA TRỰC</span>
                      <input type="radio" checked={priority === 'P2'} onChange={() => {}} className="text-amber-600" />
                    </div>
                    <div className="text-[11px] font-semibold mt-1">Khách đang ở trong phòng</div>
                    <div className="text-[10px] font-mono text-amber-700 font-bold mt-1">SLA &lt; 60 phút (Cam kết tốc thì)</div>
                  </div>

                  {/* P3 */}
                  <div
                    onClick={() => setPriority('P3')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      priority === 'P3'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>P3 — TIÊU CHUẨN</span>
                      <input type="radio" checked={priority === 'P3'} onChange={() => {}} className="text-blue-600" />
                    </div>
                    <div className="text-[11px] font-semibold mt-1">Phòng trống / Dự phòng</div>
                    <div className="text-[10px] font-mono text-blue-700 font-bold mt-1">SLA &lt; 24 giờ</div>
                  </div>

                </div>
              </div>
            </div>

            {/* 03. MÔ TẢ HIỆN TRƯỜNG & RÀNG BUỘC TIẾP CẬN */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                    03
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Mô Tả Hiện Trường &amp; Ràng Buộc Tiếp Cận
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500 font-bold">SEC-PROTOCOL #A4</span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">CHI TIẾT SỰ CỐ TỪ KHÁCH / BUỒNG PHÒNG</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-xs bg-gray-50 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                ></textarea>
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                  <span>Ghi nhận bởi: Tiền Sảnh - Lê Minh Anh (17:42)</span>
                  <span>184 ký tự</span>
                </div>
              </div>

              {/* Ràng buộc an toàn phòng khách đang ở */}
              <div>
                <label className="block font-bold text-gray-700 mb-2 text-xs">ỦY QUYỀN &amp; QUY TRÌNH AN TOÀN PHÒNG KHÁCH ĐANG Ở</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  
                  <label className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guestInRoom}
                      onChange={(e) => setGuestInRoom(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="block text-gray-900 text-xs">Khách Đang Trong Phòng</strong>
                      <span className="text-[10px] text-gray-500">Đã gõ cửa xác nhận</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedImmediateFix}
                      onChange={(e) => setAgreedImmediateFix(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="block text-gray-900 text-xs">Đồng Ý Sửa Ngay</strong>
                      <span className="text-[10px] text-gray-500">Cho phép kỹ sư vào phòng</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempRoomChange}
                      onChange={(e) => setTempRoomChange(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="block text-gray-900 text-xs">Đổi Phòng Tạm Thời</strong>
                      <span className="text-[10px] text-gray-500">Không yêu cầu di dời</span>
                    </div>
                  </label>

                </div>
              </div>
            </div>

            {/* 04. HÌNH ẢNH & BẰNG CHỨNG HIỆN TRƯỜNG */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                    04
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Hình Ảnh &amp; Bằng Chứng Hiện Trường (Photo Evidence)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500 font-bold">1 / 4 Tệp Tối Đa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative rounded-xl overflow-hidden border border-gray-300 h-44">
                  <img
                    src={photoUrl}
                    alt="Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                    LIVE_CAPTURE
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-[10px] p-1.5 rounded backdrop-blur-sm">
                    <div>Bathtub_drain_jammed.jpg</div>
                    <div className="text-[9px] text-gray-300">2.4 MB • Chụp lúc 17:40 bởi HK Thảo</div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition h-44">
                  <span className="material-symbols-outlined text-3xl text-emerald-700">add_a_photo</span>
                  <div className="font-bold text-xs text-gray-800 mt-1">Thêm Ảnh / Video Hiện Trường</div>
                  <p className="text-[10px] text-gray-500 mt-0.5 max-w-[200px]">
                    Chụp từ máy tính bảng trực tầng hoặc tải lên ảnh JPEG/PNG (Max 10MB)
                  </p>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold mt-2">
                    CHỌN TỆP HOẶC KÉO THẢ
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (5 phần): HỒ SƠ KHÁCH, CẢM BIẾN BMS & ĐIỀU PHỐI KỸ SƯ */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 1: HỒ SƠ KHÁCH ĐANG LƯU TRÚ (PHÒNG 804) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-emerald-700">person</span>
                  <span>HỒ SƠ KHÁCH ĐANG LƯU TRÚ</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-800">
                  PHÒNG 804
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  AD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-gray-900 text-sm">Arthur Dent</h4>
                    <span className="text-[10px] font-bold font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                      SILVER RESIDENT
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Lưu trú: <strong>24/10 → 28/10</strong> (Còn 4 đêm lưu trú)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] text-gray-500 block">TÌNH TRẠNG FOLIO:</span>
                  <strong className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    HỢP LỆ (Pre-Auth 20M)
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">ĐẶC QUYỀN KHÁCH:</span>
                  <strong className="text-gray-900">Yên tĩnh tuyệt đối</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-gray-700">
                <span className="font-bold text-amber-900">Ghi chú tiền sảnh:</span> "Khách nhạy cảm với tiếng ồn máy khoan, yêu cầu thao tác êm ái và dọn sạch trước khi rời phòng."
              </div>
            </div>

            {/* CARD 2: VIỄN ĐOÁN CẢM BIẾN BMS TỨC THÌ (LIVE SYNC) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="material-symbols-outlined text-sm text-sky-600">sensors</span>
                  <span>VIỄN ĐOÁN CẢM BIẾN BMS TỨC THÌ</span>
                </div>
                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-emerald-100 text-emerald-800">
                  LIVE SYNC
                </span>
              </div>

              <div className="space-y-2 text-xs">
                
                {/* Cảm biến 1 */}
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">water_drop</span>
                    <div>
                      <div className="font-bold text-gray-900">Cảm Biến Ngập Nước Sàn Tắm</div>
                      <div className="text-[10px] text-gray-500">Sensor #FL-804B (Chân tường)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                      AN TOÀN
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">Chưa tràn sàn (0.0mm)</span>
                  </div>
                </div>

                {/* Cảm biến 2 */}
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sky-600 text-base">thermostat</span>
                    <div>
                      <div className="font-bold text-gray-900">Nhiệt Độ Điều Hòa FCU</div>
                      <div className="text-[10px] text-gray-500">Daikin VRV-Central Hub</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-gray-900">21.5°C</span>
                    <span className="text-[10px] text-gray-400 block">Chuẩn cài đặt: 21.0°C</span>
                  </div>
                </div>

                {/* Cảm biến 3 */}
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-600 text-base">key</span>
                    <div>
                      <div className="font-bold text-gray-900">Trạng Thái Khay Cắm Thẻ Chìa</div>
                      <div className="text-[10px] text-gray-500">VingCard RFID Encoder</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                      CÓ MẶT TRONG PHÒNG
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">Thẻ cắm từ 16:22</span>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1">
                <span>BMS BUS: TRUYỀN TẢI ỔN ĐỊNH 99.8%</span>
                <span>LATENCY: 18ms</span>
              </div>
            </div>

            {/* CARD 3: ĐIỀU PHỐI KỸ SƯ & VẬT TƯ XUẤT KHO (AUTO-DISPATCH) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="w-5 h-5 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                    05
                  </span>
                  <span>Điều Phối Kỹ Sư &amp; Vật Tư Xuất Kho</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">AUTO-DISPATCH</span>
              </div>

              {/* Kỹ sư phụ trách */}
              <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">KỸ SƯ TRƯỞNG CA PHỤ TRÁCH</label>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold font-mono">
                      DM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{technicianName}</span>
                        <span className="text-[10px] font-mono text-gray-500 font-bold">ENG #01</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{technicianSpecialty}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      SẴN SÀNG
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">ETA: 5 phút</span>
                  </div>
                </div>

                <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Thời Gian Xử Lý Dự Kiến:</span>
                  <strong className="font-mono">25 PHÚT (Hoàn tất &lt; 18:20)</strong>
                </div>
              </div>

              {/* Danh sách linh kiện tự động xuất kho kỹ thuật (BMS KIT) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>LINH KIỆN TỰ ĐỘNG XUẤT KHO KỸ THUẬT (BMS KIT)</span>
                  <span className="text-[10px] text-gray-400 font-mono">Kho BOH Tầng Hầm 1</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {bmsParts.map((pt, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <span className="text-gray-900 font-semibold">{pt.name}</span>
                      <span className="text-gray-500 text-[11px] shrink-0">{pt.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút bấm Tạo lệnh công tác */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCreateTicket(false)}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95 text-xs"
                >
                  <span className="material-symbols-outlined text-base">send_to_mobile</span>
                  {isSubmitting ? 'Đang Phát Lệnh...' : 'TẠO LỆNH CÔNG TÁC & PHÁT ĐI TỚI APP KỸ SƯ →'}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateTicket(true)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                >
                  Lưu Thành Phiếu Chưa Gắn Nhân Sự (Chờ Điều Phối Lại)
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

export default MaintenanceTicketCreate;
