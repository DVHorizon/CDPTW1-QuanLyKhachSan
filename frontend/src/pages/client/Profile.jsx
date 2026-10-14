import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { updateCurrentUser } from '../../api/authApi'; 

const Profile = () => {
  const { user, token, updateUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    nationality: 'Việt Nam (VN)',
    identityCard: '',
    phoneNumber: '',
    email: '',
    address: ''
  });

  const [preferences, setPreferences] = useState({
    pillowType: 'Gối Lông Vũ Tự Nhiên',
    roomRequests: ['Tầng cao tĩnh lặng', 'Phòng tuyệt đối không hút thuốc', 'View biển trực diện (Front Ocean)'],
    dietary: ['Không dị ứng hải sản (Ăn được tôm hùm, hào)', 'Ưa chuộng nước ép trái cây tươi không đường']
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Đã lưu hồ sơ thành công!');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Initialize form if user exists
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || 'MALE',
        identityCard: user.idNumber || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        fullName: formData.fullName,
        phone: formData.phoneNumber,
        idNumber: formData.identityCard,
        idType: 'CCCD',
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender
      };

      const result = await updateCurrentUser(token, payload);
      if (result.success) {
        // Cập nhật state user trên toàn app
        updateUser({
          ...user,
          fullName: payload.fullName,
          phone: payload.phone,
          idNumber: payload.idNumber,
          idType: payload.idType,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender
        });
        
        setToastMessage('Đã lưu hồ sơ thành công!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      } else {
        setToastMessage(result.message || 'Có lỗi xảy ra');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
    } catch (error) {
      console.error(error);
      setToastMessage('Lỗi hệ thống khi lưu hồ sơ');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col w-full">
        <div className="w-full px-margin py-space-xl max-w-[1440px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Cổng Khách Hàng Danh Dự</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Hồ Sơ Đặc Quyền</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Hồ Sơ & Đặc Quyền Nghỉ Dưỡng</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Tùy biến hành trình, lưu trữ đặc quyền thượng lưu và cá nhân hóa trải nghiệm tại Grand Horizon.</p>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-xl">
              <span className="material-symbols-outlined text-secondary text-[20px]">verified_user</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Tình Trạng Tài Khoản</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">Đã xác minh sinh trắc học 100%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* Sidebar */}
            <aside className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Profile Card */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none"></div>
                <div className="relative mb-space-md group">
                  <div className="w-28 h-28 rounded-full overflow-hidden shadow-md ring-4 ring-secondary/20 bg-surface-container flex items-center justify-center">
                     <span className="material-symbols-outlined text-[48px] text-on-surface-variant">person</span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md hover:bg-secondary-container hover:text-on-secondary-container transition-transform active:scale-95" title="Thay đổi ảnh đại diện" type="button">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </button>
                </div>
                <h2 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-xs">{formData.fullName || 'Khách hàng'}</h2>
                <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase mb-space-sm">Mã hội viên: <strong className="text-on-surface">GH-889921</strong></span>
                <div className="inline-flex items-center gap-space-xs px-space-md py-1 bg-secondary-container/40 rounded-full mb-space-md">
                  <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">Hạng Vàng (Gold Elite)</span>
                </div>
                <div className="w-full grid grid-cols-2 gap-space-xs bg-surface-container-low rounded-lg p-space-sm text-left">
                  <div className="flex flex-col p-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">Tham gia từ</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">12/2021</span>
                  </div>
                  <div className="flex flex-col p-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">Đêm nghỉ</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">28 Đêm 5★</span>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex flex-col gap-1">
                <a className="flex items-center justify-between px-space-md py-space-sm rounded-lg bg-secondary text-on-secondary shadow-sm transition-all" href="#">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    <span className="font-label-lg text-label-lg font-semibold">Thông Tin Cá Nhân</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </a>
                <a className="flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all" href="#">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px] text-secondary">loyalty</span>
                    <span className="font-label-lg text-label-lg">Hạng & Điểm Thưởng</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </a>
                <a className="flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all" href="#">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px] text-secondary">history_edu</span>
                    <span className="font-label-lg text-label-lg">Lịch Sử Đặt Phòng</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </a>
                <a className="flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all" href="#">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px] text-secondary">room_service</span>
                    <span className="font-label-lg text-label-lg">Sở Thích Lưu Trú</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </a>
                <a className="flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all" href="#">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px] text-secondary">lock</span>
                    <span className="font-label-lg text-label-lg">Cài Đặt Bảo Mật & Mật Khẩu</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </a>
              </nav>

              {/* Butler Call to Action */}
              <div className="bg-primary-container text-on-primary rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
                <div className="flex items-center gap-space-xs text-secondary-fixed">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Trợ Lý Riêng (Butler 24/7)</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-primary-container">Ông/Bà có kế hoạch ghé Cam Ranh hay Phú Quốc trong kỳ nghỉ tới? Liên hệ ngay Quản gia Trưởng.</p>
                <button className="w-full py-space-xs px-space-sm bg-secondary text-on-secondary rounded-lg font-label-md text-label-md hover:bg-secondary-container hover:text-on-secondary-container transition-all text-center" type="button">Kết nối Butler Qua Zalo/Call</button>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* VIP Card */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">Đặc quyền Thượng lưu</span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Thẻ Hội Viên VIP & Quà Tặng Độc Quyền</h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline">Gia hạn ngày: 31/12/2025</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-stretch">
                  <div className="md:col-span-7 bg-gradient-to-br from-primary-container via-inverse-surface to-primary-container text-on-primary rounded-xl p-space-lg shadow-md flex flex-col justify-between relative overflow-hidden min-h-[190px]">
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-fixed/15 blur-xl pointer-events-none"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-secondary-fixed text-[22px]">spa</span>
                        <span className="font-headline-sm text-headline-sm tracking-tight text-white">Grand Horizon</span>
                      </div>
                      <div className="flex items-center gap-space-xs px-2 py-0.5 bg-secondary-container/20 rounded text-secondary-fixed font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">stars</span>
                        GOLD ELITE
                      </div>
                    </div>
                    <div className="flex flex-col my-space-xs">
                      <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider">Điểm Tích Lũy Hiện Tại</span>
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-display-sm text-display-sm font-semibold text-secondary-fixed">12.450</span>
                        <span className="font-label-lg text-label-lg text-on-primary">Điểm Horizon</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between pt-space-xs">
                      <span className="font-label-sm text-label-sm text-white/80 tracking-widest font-mono">GH • 8899 • 2199 • 002</span>
                      <span className="font-label-sm text-label-sm text-secondary-fixed font-semibold uppercase">{formData.fullName || 'VIP GUEST'}</span>
                    </div>
                  </div>
                  <div className="md:col-span-5 flex flex-col gap-space-sm justify-between">
                    <div className="p-space-sm bg-surface-container-low rounded-xl flex items-start gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-secondary-container/50 text-secondary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">spa</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">Voucher Spa 500.000đ</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Áp dụng cho liệu trình Shiseido Care tại Lotus Spa.</p>
                        <span className="font-label-sm text-label-sm text-secondary mt-1 font-semibold">Còn hiệu lực 45 ngày</span>
                      </div>
                    </div>
                    <div className="p-space-sm bg-surface-container-low rounded-xl flex items-start gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">schedule</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">Miễn Phí Trả Phòng Muộn 14:00</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Đặc quyền không phụ thu cho mọi kỳ lưu trú tại resort.</p>
                        <span className="font-label-sm text-label-sm text-on-tertiary-container mt-1 font-semibold">Tự động kích hoạt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Edit Profile */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Chỉnh Sửa Thông Tin Cá Nhân</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Dữ liệu này được sử dụng để làm thủ tục nhận phòng nhanh (Fast Check-in) tại sảnh.</p>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-tertiary-container bg-tertiary-fixed/30 px-space-sm py-1 rounded-full font-semibold">Mã hóa 256-Bit</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Họ và Tên</label>
                    <div className="relative">
                      <input 
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary" 
                        type="text" 
                      />
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px]">badge</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Ngày Sinh</label>
                    <div className="relative">
                      <input 
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary" 
                        type="date" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Giới Tính</label>
                    <div className="grid grid-cols-3 gap-space-xs h-11">
                      {['MALE', 'FEMALE', 'OTHER'].map(g => (
                        <label key={g} className={`flex items-center justify-center gap-space-xs rounded-lg font-label-md text-label-md cursor-pointer transition-colors ${formData.gender === g ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                          <input 
                            name="gender" 
                            type="radio" 
                            className="hidden" 
                            value={g}
                            checked={formData.gender === g}
                            onChange={handleChange}
                          />
                          <span>{g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Quốc Tịch</label>
                    <div className="relative">
                      <select 
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        <option>Việt Nam (VN)</option>
                        <option>Singapore (SG)</option>
                        <option>Nhật Bản (JP)</option>
                        <option>Hàn Quốc (KR)</option>
                        <option>Hoa Kỳ (US)</option>
                      </select>
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-on-surface">Số CCCD / Hộ Chiếu</label>
                      {formData.identityCard && (
                        <span className="font-label-sm text-label-sm text-on-tertiary-container flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Đã xác thực
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        name="identityCard"
                        value={formData.identityCard}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary" 
                        type="text" 
                      />
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px]">fingerprint</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Số Điện Thoại</label>
                    <div className="relative">
                      <input 
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary" 
                        type="tel" 
                      />
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px]">phone</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Địa Chỉ Email</label>
                    <div className="relative">
                      <input 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary opacity-70" 
                        type="email" 
                        disabled
                      />
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px]">mail</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Địa Chỉ Thường Trú</label>
                    <div className="relative">
                      <input 
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary" 
                        type="text" 
                      />
                      <span className="material-symbols-outlined text-outline absolute right-3 top-3 text-[18px]">home_pin</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Preferences */}
              <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[22px]">hotel_class</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Tùy Chọn Sở Thích Nghỉ Dưỡng (5★ Concierge Profile)</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Hệ thống tự động chuẩn bị phòng nghỉ theo đúng tiêu chuẩn cá nhân trước giờ quý khách đến.</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[18px]">bed</span>
                      Loại Gối Nghỉ Dưỡng Ưa Thích
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                      {[
                        { name: 'Gối Lông Vũ Tự Nhiên', desc: 'Mềm mại, thoáng mát chuẩn khách sạn cao cấp.' },
                        { name: 'Gối Cao Su Công Thái Học', desc: 'Nâng đỡ đốt sống cổ, giảm đau mỏi khi ngủ.' },
                        { name: 'Gối Kiều Mạch Thảo Dược', desc: 'Hương thơm thư giãn, ngủ sâu thanh tịnh.' }
                      ].map(pillow => (
                        <label key={pillow.name} className={`p-space-md rounded-xl flex flex-col gap-space-xs cursor-pointer transition-all ${preferences.pillowType === pillow.name ? 'bg-secondary-container/30 text-on-surface-container' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-label-md text-label-md font-semibold ${preferences.pillowType === pillow.name ? 'text-secondary' : ''}`}>{pillow.name}</span>
                            <span className={`material-symbols-outlined text-[18px] ${preferences.pillowType === pillow.name ? 'text-secondary' : 'text-outline'}`}>
                              {preferences.pillowType === pillow.name ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{pillow.desc}</span>
                          <input 
                            type="radio" 
                            name="pillowType" 
                            className="hidden" 
                            value={pillow.name}
                            checked={preferences.pillowType === pillow.name}
                            onChange={(e) => setPreferences(prev => ({ ...prev, pillowType: e.target.value }))}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-xs pt-space-xs">
                    <label className="font-label-md text-label-md text-on-surface flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[18px]">apartment</span>
                      Yêu Cầu Đặc Biệt Về Vị Trí Phòng
                    </label>
                    <div className="flex flex-wrap gap-space-xs">
                      {[
                        'Tầng cao tĩnh lặng', 'Phòng tuyệt đối không hút thuốc', 'View biển trực diện (Front Ocean)', 
                        'Gần thang máy', 'Giường phụ cho trẻ em'
                      ].map(req => {
                        const isSelected = preferences.roomRequests.includes(req);
                        return (
                          <button 
                            key={req}
                            type="button"
                            onClick={() => {
                              setPreferences(prev => ({
                                ...prev,
                                roomRequests: isSelected 
                                  ? prev.roomRequests.filter(r => r !== req)
                                  : [...prev.roomRequests, req]
                              }))
                            }}
                            className={`px-space-md py-space-xs rounded-full font-label-md text-label-md flex items-center gap-1 transition-colors ${isSelected ? 'bg-secondary text-on-secondary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{isSelected ? 'done' : 'add'}</span>
                            {req}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-xs pt-space-xs">
                    <label className="font-label-md text-label-md text-on-surface flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[18px]">restaurant</span>
                      Chế Độ Ăn Uống & Khẩu Vị Ẩm Thực
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                      {[
                        { icon: 'set_meal', text: 'Không dị ứng hải sản (Ăn được tôm hùm, hào)' },
                        { icon: 'local_cafe', text: 'Ưa chuộng nước ép trái cây tươi không đường' }
                      ].map(diet => {
                        const isSelected = preferences.dietary.includes(diet.text);
                        return (
                          <div 
                            key={diet.text}
                            onClick={() => {
                              setPreferences(prev => ({
                                ...prev,
                                dietary: isSelected
                                  ? prev.dietary.filter(d => d !== diet.text)
                                  : [...prev.dietary, diet.text]
                              }))
                            }}
                            className="p-space-sm bg-surface-container-low rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors"
                          >
                            <div className="flex items-center gap-space-sm">
                              <span className="material-symbols-outlined text-secondary text-[20px]">{diet.icon}</span>
                              <span className="font-body-md text-body-md text-on-surface">{diet.text}</span>
                            </div>
                            <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-secondary' : 'text-outline'}`}>
                              {isSelected ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-space-md pt-space-xs pb-space-lg">
                <button className="w-full sm:w-auto px-space-xl py-space-sm rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-lg text-label-lg transition-colors text-center" type="button">
                  Hủy Bỏ
                </button>
                <button onClick={handleSave} className="w-full sm:w-auto px-space-xl py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-lg text-label-lg shadow-md transition-all flex items-center justify-center gap-space-xs" type="button">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <div className={`fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-space-lg py-space-sm rounded-xl shadow-xl flex items-center gap-space-sm transform transition-all duration-300 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
          <span className="material-symbols-outlined text-tertiary-fixed text-[22px]">
            {toastMessage.includes('thành công') ? 'check_circle' : 'error'}
          </span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-white font-semibold">{toastMessage}</span>
            <span className="font-body-sm text-body-sm text-white/80">
              {toastMessage.includes('thành công') 
                ? 'Tùy chọn nghỉ dưỡng của quý khách đã được đồng bộ.' 
                : 'Vui lòng kiểm tra lại thông tin và thử lại.'}
            </span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
