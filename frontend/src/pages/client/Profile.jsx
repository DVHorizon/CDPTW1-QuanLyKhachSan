import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { updateCurrentUser, changePasswordApi } from '../../api/authApi';

const FULLNAME_REGEX = /^[\p{L}]+(?:\s[\p{L}]+)*$/u;
const VN_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;
const ID_CARD_REGEX = /^(?:\d{9}|\d{12}|[A-Za-z]\d{7,8})$/;

const Profile = () => {
  const { user, token, updateUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState('profile');
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

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const [preferences, setPreferences] = useState({
    pillowType: 'Gối Lông Vũ Tự Nhiên',
    roomRequests: ['Tầng cao tĩnh lặng', 'Phòng tuyệt đối không hút thuốc', 'View biển trực diện (Front Ocean)'],
    dietary: ['Không dị ứng hải sản (Ăn được tôm hùm, hào)', 'Ưa chuộng nước ép trái cây tươi không đường']
  });

  const [showToast, setShowToast] = useState(false);
  const [toastIsSuccess, setToastIsSuccess] = useState(true);
  const [toastMessage, setToastMessage] = useState('Đã lưu hồ sơ thành công!');

  const triggerToast = (msg, ok = true) => {
    setToastMessage(msg);
    setToastIsSuccess(ok);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3800);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const syncFormFromUser = (u) => {
    if (!u) return;
    setFormData((prev) => ({
      ...prev,
      fullName: u.fullName || '',
      email: u.email || '',
      phoneNumber: u.phoneNumber || u.phone || '',
      dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '',
      gender: u.gender || 'MALE',
      identityCard: u.identityCard || u.idNumber || '',
      address: u.address || ''
    }));
  };

  // Initialize form if user exists
  useEffect(() => {
    syncFormFromUser(user);
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
      const cleanName = (formData.fullName || '').trim();
      if (!cleanName) {
        triggerToast('Họ và tên không được để trống', false);
        return;
      }
      if (cleanName.length < 2 || cleanName.length > 100 || !FULLNAME_REGEX.test(cleanName)) {
        triggerToast('Họ và tên chỉ được chứa chữ cái và khoảng trắng đơn', false);
        return;
      }

      const cleanPhone = (formData.phoneNumber || '').trim();
      if (cleanPhone && !VN_PHONE_REGEX.test(cleanPhone)) {
        triggerToast('Số điện thoại không hợp lệ (yêu cầu 10 chữ số)', false);
        return;
      }

      const cleanId = (formData.identityCard || '').trim();
      if (cleanId && !ID_CARD_REGEX.test(cleanId)) {
        triggerToast('Số CCCD (9 hoặc 12 số) hoặc Hộ chiếu (1 chữ cái + 7-8 số) không đúng định dạng', false);
        return;
      }

      if (formData.dateOfBirth) {
        const dobDate = new Date(`${formData.dateOfBirth}T00:00:00Z`);
        const today = new Date();
        let age = today.getUTCFullYear() - dobDate.getUTCFullYear();
        const mDiff = today.getUTCMonth() - dobDate.getUTCMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getUTCDate() < dobDate.getUTCDate())) {
          age -= 1;
        }
        if (Number.isNaN(dobDate.getTime()) || dobDate > today || age < 18) {
          triggerToast('Khách hàng phải từ đủ 18 tuổi trở lên', false);
          return;
        }
      }

      const cleanAddress = (formData.address || '').trim();
      if (cleanAddress.length > 255) {
        triggerToast('Địa chỉ liên hệ tối đa 255 ký tự', false);
        return;
      }

      const payload = {
        fullName: cleanName,
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        identityCard: cleanId,
        idNumber: cleanId,
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender || 'MALE',
        address: cleanAddress
      };

      const result = await updateCurrentUser(token, payload);
      if (result.success) {
        updateUser(result.user || {
          ...user,
          fullName: payload.fullName,
          phone: payload.phone,
          phoneNumber: payload.phone,
          idNumber: payload.idNumber,
          identityCard: payload.identityCard,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          address: payload.address
        });
        triggerToast('Đã lưu hồ sơ thành công!', true);
      } else {
        triggerToast(result.message || 'Có lỗi xảy ra', false);
      }
    } catch (error) {
      console.error(error);
      triggerToast('Lỗi hệ thống khi lưu hồ sơ', false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword) {
      triggerToast('Vui lòng nhập mật khẩu hiện tại', false);
      return;
    }
    if (
      !newPassword ||
      newPassword.length < 8 ||
      newPassword.length > 32 ||
      /\s/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(newPassword)
    ) {
      triggerToast('Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt', false);
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('Mật khẩu xác nhận không khớp', false);
      return;
    }

    try {
      setIsChangingPwd(true);
      const res = await changePasswordApi(token, passwordForm);
      if (res.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        triggerToast('Đổi mật khẩu thành công!', true);
      } else {
        triggerToast(res.message || 'Không thể đổi mật khẩu', false);
      }
    } catch (err) {
      triggerToast('Lỗi hệ thống: ' + err.message, false);
    } finally {
      setIsChangingPwd(false);
    }
  };

  const scrollToSection = (navId, elementId) => {
    setActiveNav(navId);
    const el = document.getElementById(elementId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase mb-space-sm">Mã hội viên: <strong className="text-on-surface">GH-{String(user?.userId || 889921).padStart(6, '0')}</strong></span>
                <div className="inline-flex items-center gap-space-xs px-space-md py-1 bg-secondary-container/40 rounded-full mb-space-md">
                  <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">{user?.tierName ? `Hạng ${user.tierName}` : 'Hội viên Horizon Elite'}</span>
                </div>
                <div className="w-full grid grid-cols-2 gap-space-xs bg-surface-container-low rounded-lg p-space-sm text-left">
                  <div className="flex flex-col p-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">Tham gia từ</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {user?.createdAt ? `${String(new Date(user.createdAt).getMonth() + 1).padStart(2, '0')}/${new Date(user.createdAt).getFullYear()}` : '10/2026'}
                    </span>
                  </div>
                  <div className="flex flex-col p-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">Ưu đãi hạng</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {user?.discountRate ? `Giảm ${user.discountRate}%` : 'Tích điểm 1.5x'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => scrollToSection('profile', 'section-profile')}
                  className={`w-full text-left flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                    activeNav === 'profile' ? 'bg-secondary text-on-secondary shadow-sm font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="font-label-lg text-label-lg">Thông Tin Cá Nhân</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('loyalty', 'section-loyalty')}
                  className={`w-full text-left flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                    activeNav === 'loyalty' ? 'bg-secondary text-on-secondary shadow-sm font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">loyalty</span>
                    <span className="font-label-lg text-label-lg">Hạng & Điểm Thưởng</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-bookings')}
                  className="w-full text-left flex items-center justify-between px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px] text-secondary">history_edu</span>
                    <span className="font-label-lg text-label-lg">Lịch Sử Đặt Phòng</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('preferences', 'section-preferences')}
                  className={`w-full text-left flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                    activeNav === 'preferences' ? 'bg-secondary text-on-secondary shadow-sm font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">room_service</span>
                    <span className="font-label-lg text-label-lg">Sở Thích Lưu Trú</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('security', 'section-security')}
                  className={`w-full text-left flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                    activeNav === 'security' ? 'bg-secondary text-on-secondary shadow-sm font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    <span className="font-label-lg text-label-lg">Cài Đặt Bảo Mật & Mật Khẩu</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
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
              <section id="section-loyalty" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div>
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest font-semibold">Đặc quyền Thượng lưu</span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Thẻ Hội Viên VIP & Quà Tặng Độc Quyền</h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline">Hạng hiện tại: {user?.tierName || 'Standard'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-stretch">
                  <div className="md:col-span-7 bg-gradient-to-br from-primary-container via-inverse-surface to-primary-container text-on-primary rounded-xl p-space-lg shadow-md flex flex-col justify-between relative overflow-hidden min-h-[190px]">
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-fixed/15 blur-xl pointer-events-none"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-secondary-fixed text-[22px]">spa</span>
                        <span className="font-headline-sm text-headline-sm tracking-tight text-white">Grand Horizon</span>
                      </div>
                      <div className="flex items-center gap-space-xs px-2 py-0.5 bg-secondary-container/20 rounded text-secondary-fixed font-label-sm text-label-sm font-semibold uppercase">
                        <span className="material-symbols-outlined text-[14px]">stars</span>
                        {user?.tierName || 'ELITE'}
                      </div>
                    </div>
                    <div className="flex flex-col my-space-xs">
                      <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider">Đặc Quyền Hạng Hội Viên</span>
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-display-sm text-display-sm font-semibold text-secondary-fixed">
                          {user?.discountRate ? `-${user.discountRate}%` : '1.5x'}
                        </span>
                        <span className="font-label-lg text-label-lg text-on-primary">
                          {user?.discountRate ? 'Ưu đãi giá phòng' : 'Điểm Horizon'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between pt-space-xs">
                      <span className="font-label-sm text-label-sm text-white/80 tracking-widest font-mono">
                        GH • 8899 • {String(user?.userId || 1).padStart(4, '0')}
                      </span>
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
              <section id="section-profile" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
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
              <section id="section-preferences" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
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

              {/* Security & Password Section */}
              <section id="section-security" className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Bảo Mật & Đổi Mật Khẩu</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Mật khẩu mới từ 8–32 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-space-md items-end">
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder="VD: Horizon@2026"
                      className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPwd}
                      className="px-space-lg py-space-xs rounded-lg bg-primary-container text-white font-label-md text-label-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isChangingPwd ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-space-md pt-space-xs pb-space-lg">
                <button
                  onClick={() => {
                    syncFormFromUser(user);
                    triggerToast('Đã khôi phục lại dữ liệu ban đầu', true);
                  }}
                  className="w-full sm:w-auto px-space-xl py-space-sm rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-lg text-label-lg transition-colors text-center cursor-pointer"
                  type="button"
                >
                  Hủy Bỏ
                </button>
                <button onClick={handleSave} className="w-full sm:w-auto px-space-xl py-space-sm rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-lg text-label-lg shadow-md transition-all flex items-center justify-center gap-space-xs cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <div className={`fixed bottom-6 right-6 z-50 px-space-lg py-space-sm rounded-xl shadow-xl flex items-center gap-space-sm transform transition-all duration-300 ${toastIsSuccess ? 'bg-primary text-on-primary' : 'bg-rose-700 text-white'} ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
          <span className="material-symbols-outlined text-[22px] text-white">
            {toastIsSuccess ? 'check_circle' : 'error'}
          </span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-white font-semibold">{toastMessage}</span>
            <span className="font-body-sm text-body-sm text-white/80">
              {toastIsSuccess
                ? 'Thông tin hồ sơ của quý khách đã được đồng bộ.'
                : 'Vui lòng kiểm tra lại thông tin và thử lại.'}
            </span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
