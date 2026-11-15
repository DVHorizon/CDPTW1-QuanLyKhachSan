import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordApi, resetPasswordApi } from '../api/authApi';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
const VN_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;
const FULLNAME_REGEX = /^[\p{L}]+(?:\s[\p{L}]+)*$/u;
const isStrongPassword = (pwd) =>
  typeof pwd === 'string' &&
  pwd.length >= 8 &&
  pwd.length <= 32 &&
  !/\s/.test(pwd) &&
  /[A-Z]/.test(pwd) &&
  /[a-z]/.test(pwd) &&
  /\d/.test(pwd) &&
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(pwd);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, user } = useAuth();

  // Kiểm tra query parameter ?mode=...
  const queryParams = new URLSearchParams(location.search);
  const initialMode = (() => {
    const mode = queryParams.get('mode');
    if (mode === 'register') return 'register';
    if (mode === 'recovery' || mode === 'forgot') return 'recovery';
    return 'login';
  })();

  // activeTab: 'login' | 'register' | 'recovery'
  const [activeTab, setActiveTab] = useState(initialMode);

  // Form states - Đăng nhập
  const [selectedRole, setSelectedRole] = useState('Guest');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Đăng ký
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [enrollClub, setEnrollClub] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Form states - Khôi phục mật khẩu (2 bước OTP 6 số)
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState('request'); // 'request' | 'reset'
  const [otpCode, setOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [demoOtpHint, setDemoOtpHint] = useState('');

  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Nếu đã đăng nhập thành công, tự động chuyển hướng theo vai trò Database hoặc redirect query param
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = queryParams.get('redirect');
      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      const internalRoles = [1, 2, 3, 4];
      const isInternal = internalRoles.includes(user.roleId) || ['Admin', 'Receptionist', 'Kitchen', 'Housekeeping'].includes(user.roleName);
      if (isInternal) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate, location.search]);

  // Countdown OTP 5 phút
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Đổi tab
  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
    if (tab === 'recovery') {
      setRecoveryStep('request');
    }
  };

  // Xử lý Đăng Nhập
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim()) {
      setErrorMessage('Email không được để trống');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Mật khẩu không được để trống');
      return;
    }

    try {
      setIsLoading(true);
      const res = await login(loginIdentifier.trim(), loginPassword, selectedRole);
      if (res.success) {
        setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          const internalRoles = [1, 2, 3, 4];
          const isInternal = internalRoles.includes(res.user?.roleId) || ['Admin', 'Receptionist', 'Kitchen', 'Housekeeping'].includes(res.user?.roleName);
          if (isInternal) {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 700);
      } else {
        setErrorMessage(res.message || 'Email hoặc mật khẩu không chính xác');
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra lỗi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đăng Ký
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage('Họ và tên không được để trống');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 100 || !FULLNAME_REGEX.test(cleanName)) {
      setErrorMessage('Họ và tên chỉ được chứa chữ cái và khoảng trắng đơn');
      return;
    }

    const cleanEmail = regEmail.trim();
    if (!cleanEmail) {
      setErrorMessage('Email không được để trống');
      return;
    }
    if (cleanEmail.length > 255 || !EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('Email không đúng định dạng');
      return;
    }

    const cleanPhone = regPhone.trim();
    if (!cleanPhone) {
      setErrorMessage('Số điện thoại không được để trống');
      return;
    }
    if (!VN_PHONE_REGEX.test(cleanPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ (yêu cầu 10 chữ số)');
      return;
    }

    if (!isStrongPassword(regPassword)) {
      setErrorMessage('Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!acceptTerms) {
      setErrorMessage('Quý khách vui lòng đồng ý với Điều khoản dịch vụ & Chính sách quyền riêng tư.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await register({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        enrollClub
      });

      if (res.success) {
        setSuccessMessage('Đăng ký tài khoản thành công! Đang kích hoạt phiên đăng nhập...');
        setTimeout(() => {
          navigate('/');
        }, 800);
      } else {
        setErrorMessage(res.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra lỗi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 1 Quên mật khẩu: Gửi OTP 6 số
  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = recoveryEmail.trim();
    if (!cleanEmail) {
      setErrorMessage('Email không được để trống');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('Email không đúng định dạng');
      return;
    }

    try {
      setIsLoading(true);
      const res = await forgotPasswordApi(cleanEmail);
      if (res.success) {
        setRecoveryStep('reset');
        setOtpCountdown(res.expiresInSeconds || 300);
        setDemoOtpHint(res.demoOtp || '');
        setSuccessMessage(res.detail || 'Mã xác thực OTP 6 chữ số đã được gửi tới email của quý khách.');
      } else {
        setErrorMessage(res.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email.');
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2 Quên mật khẩu: Xác thực OTP và đặt lại mật khẩu mới
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage('Mã OTP không chính xác hoặc đã hết hạn');
      return;
    }
    if (!isStrongPassword(resetNewPassword)) {
      setErrorMessage('Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setIsLoading(true);
      const res = await resetPasswordApi({
        email: recoveryEmail.trim(),
        otpCode: otpCode.trim(),
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword
      });
      if (res.success) {
        setSuccessMessage(res.detail || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
        setOtpCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setDemoOtpHint('');
        setTimeout(() => {
          setLoginIdentifier(recoveryEmail.trim());
          setLoginPassword('');
          setActiveTab('login');
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Mã OTP không chính xác hoặc đã hết hạn');
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-['Plus_Jakarta_Sans',sans-serif] antialiased min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Background Soft Atmospheric Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#fedeb2]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] bg-[#d3e4fe]/40 rounded-full blur-[140px]" />
      </div>

      {/* SINGLE CENTERED LUXURY MODAL CARD */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_20px_50px_rgba(11,28,48,0.12)] border border-[#d3e4fe]/80 overflow-hidden relative z-10 animate-fade-in transition-all">
        
        {/* Top Branding Bar with Absolute Close Button */}
        <div className="relative px-6 pt-7 pb-3 flex flex-col items-center justify-center text-center">
          {/* Close Button back to Home */}
          <Link
            to="/"
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#45464d] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors"
            title="Đóng / Về trang chủ"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </Link>

          {/* Grand Horizon centered, large & colorful */}
          <div className="flex flex-col items-center justify-center pt-2">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl sm:text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#725b38] via-[#a38048] to-[#584323] drop-shadow-xs">
              Grand Horizon
            </h1>
          </div>
        </div>

        {/* Modal Inner Body */}
        <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
          
          {/* Header & Switch Tabs */}
          <div className="mb-6 text-center">
            <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-[28px] font-bold text-[#0b1c30] mb-3 text-center">
              {activeTab === 'login' && 'Đăng Nhập'}
              {activeTab === 'register' && 'Đăng Ký Tài Khoản'}
              {activeTab === 'recovery' && 'Khôi Phục Mật Khẩu'}
            </h2>

            {/* Toggle Pill Control (Login & Register) */}
            {activeTab !== 'recovery' && (
              <div className="mt-5 p-1 bg-[#e5eeff] rounded-xl grid grid-cols-2 text-center">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-[#0b1c30] shadow-sm font-bold'
                      : 'text-[#45464d] hover:text-[#0b1c30]'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-[#0b1c30] shadow-sm font-bold'
                      : 'text-[#45464d] hover:text-[#0b1c30]'
                  }`}
                >
                  Tạo Tài Khoản Mới
                </button>
              </div>
            )}
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-base text-red-600 shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-base text-emerald-600 shrink-0">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* LOGIN FORM SECTION                                             */}
          {/* ============================================================== */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Chọn vai trò đăng nhập */}
              <div className="p-3 bg-[#e5eeff]/70 border border-[#cbdbf5] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#725b38]">badge</span>
                    <span>Bạn đăng nhập với tư cách:</span>
                  </span>
                  <span className="text-[10px] text-[#725b38] font-semibold bg-[#fedeb2]/40 px-2 py-0.5 rounded-full border border-[#b9a277]/30">
                    Phân quyền hệ thống
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Guest', label: 'Khách hàng', icon: 'person', sample: 'guest@hoteldomain.vn' },
                    { id: 'Admin', label: 'Quản trị viên', icon: 'shield_person', sample: 'admin@hoteldomain.vn' },
                    { id: 'Receptionist', label: 'Lễ tân', icon: 'desk', sample: 'receptionist@hoteldomain.vn' },
                    { id: 'Kitchen', label: 'Bếp / F&B', icon: 'restaurant', sample: 'kitchen@hoteldomain.vn' },
                    { id: 'Housekeeping', label: 'Buồng phòng', icon: 'cleaning_services', sample: 'housekeeping@hoteldomain.vn' }
                  ].map((role) => {
                    const isChecked = selectedRole === role.id;
                    return (
                      <label
                        key={role.id}
                        onClick={() => {
                          setSelectedRole(role.id);
                          setLoginIdentifier(role.sample);
                          setLoginPassword('123456');
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-[#725b38] text-white border-[#725b38] shadow-xs'
                            : 'bg-white text-[#203044] border-[#d3e4fe] hover:border-[#b9a277] hover:bg-[#fbf8f2]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="loginRole"
                          value={role.id}
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-[#fedeb2] cursor-pointer"
                        />
                        <span className={`material-symbols-outlined text-[15px] ${isChecked ? 'text-[#fedeb2]' : 'text-[#725b38]'}`}>
                          {role.icon}
                        </span>
                        <span className="truncate">{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-2">
                  Email, Tên đăng nhập hoặc Số điện thoại
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    account_circle
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="admin, receptionist hoặc email / số điện thoại"
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#0b1c30]">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => switchTab('recovery')}
                    className="text-xs text-[#725b38] hover:underline font-semibold cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    key
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-12 pr-12 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    aria-label="Hiện hoặc ẩn mật khẩu"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 text-[#45464d] hover:text-[#0b1c30] focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showLoginPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#725b38] focus:ring-0 accent-[#725b38] cursor-pointer"
                  />
                  <span className="ml-2.5 text-xs text-[#0b1c30] font-medium">
                    Ghi nhớ đăng nhập trên thiết bị này
                  </span>
                </label>
              </div>
              {/* Quick Demo Credentials Pill */}
              <div className="p-2.5 rounded-xl bg-[#e5eeff]/70 border border-[#cbdbf5] text-[11.5px] text-[#203044]">
                <span className="font-bold text-[#725b38]">Tài khoản thử nghiệm:</span> <code>hoangnam.417@gmail.com</code> // Mật khẩu: <code>123456</code>
              </div>
              {/* Primary CTA Button (Gold Accent) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#725b38] text-white text-sm font-bold shadow-md hover:bg-[#584323] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Nhập Ngay</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* REGISTER FORM SECTION                                          */}
          {/* ============================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Họ và tên đầy đủ
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    badge
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="w-full h-11 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Email</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      disabled={isLoading}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full h-11 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Số điện thoại</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                      call
                    </span>
                    <input
                      type="tel"
                      disabled={isLoading}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full h-11 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Tạo mật khẩu</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="8–32 ký tự: chữ hoa, thường, số & ký tự đặc biệt"
                    className="w-full h-11 pl-12 pr-12 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    aria-label="Hiện hoặc ẩn mật khẩu"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-4 text-[#45464d] hover:text-[#0b1c30] focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showRegPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Xác nhận mật khẩu</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    verified_user
                  </span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu giống 100%"
                    className="w-full h-11 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Loyalty Enrollment Opt-in */}
              <div className="p-3.5 rounded-xl bg-[#e5eeff] border border-[#cbdbf5] flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="enroll-club"
                  checked={enrollClub}
                  onChange={(e) => setEnrollClub(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#725b38] focus:ring-0 accent-[#725b38] cursor-pointer"
                />
                <label htmlFor="enroll-club" className="text-xs text-[#0b1c30] cursor-pointer">
                  <strong className="text-sm font-semibold text-[#725b38] block mb-0.5">
                    Tham gia Horizon Elite Club
                  </strong>
                  Nhận ngay 1.000 điểm thưởng chào mừng và quyền lợi bảo lưu trạng thái thành viên hạng Vàng.
                </label>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="accept-terms"
                  required
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#725b38] focus:ring-0 accent-[#725b38] cursor-pointer"
                />
                <label htmlFor="accept-terms" className="text-xs text-[#45464d] select-none">
                  Tôi đồng ý với{' '}
                  <a className="text-[#725b38] font-semibold hover:underline" href="#terms" onClick={(e) => e.preventDefault()}>
                    Điều khoản dịch vụ
                  </a>{' '}
                  và{' '}
                  <a className="text-[#725b38] font-semibold hover:underline" href="#privacy" onClick={(e) => e.preventDefault()}>
                    Chính sách quyền riêng tư
                  </a>{' '}
                  của Grand Horizon Resort.
                </label>
              </div>

              {/* Quick Auto Fill Button for Testing */}
              <div className="flex items-center justify-between text-xs text-[#725b38] pt-1">
                <span className="text-[#45464d]">Thử nghiệm nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    const rand = Math.floor(100 + Math.random() * 900);
                    setFullName('Nguyễn Hoàng Nam');
                    setRegEmail(`hoangnam.${rand}@gmail.com`);
                    setRegPhone(`0905${rand}888`);
                    setRegPassword('Horizon@2026');
                    setRegConfirmPassword('Horizon@2026');
                    setAcceptTerms(true);
                  }}
                  className="font-bold underline hover:text-[#584323] cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">magic_button</span>
                  <span>Tự động điền mẫu</span>
                </button>
              </div>

              {/* Register CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#725b38] text-white text-sm font-bold shadow-md hover:bg-[#584323] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Ký Tài Khoản</span>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* RECOVERY FORM SECTION (Quên mật khẩu - OTP 6 số)               */}
          {/* ============================================================== */}
          {activeTab === 'recovery' && (
            <div className="space-y-4">
              {recoveryStep === 'request' ? (
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#e5eeff] border border-[#cbdbf5] text-xs text-[#203044] leading-relaxed">
                    <div className="flex items-center gap-1.5 text-[#725b38] font-bold text-sm mb-1">
                      <span className="material-symbols-outlined text-lg">lock_reset</span>
                      <span>Khôi Phục Quyền Truy Cập</span>
                    </div>
                    Nhập Email tài khoản đã đăng ký. Hệ thống sẽ gửi mã xác thực OTP gồm 6 chữ số có hiệu lực trong vòng 5 phút.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b1c30] mb-2">
                      Email nhận OTP đã đăng ký
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                        mail
                      </span>
                      <input
                        type="email"
                        required
                        disabled={isLoading}
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="name@email.com"
                        className="w-full h-12 pl-12 pr-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm placeholder-[#76777d] focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-[#725b38] text-white text-sm font-bold shadow-md hover:bg-[#584323] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        <span>Đang gửi mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi Mã Xác Thực OTP</span>
                        <span className="material-symbols-outlined text-lg">send</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#e5eeff] border border-[#cbdbf5] text-xs text-[#203044] leading-relaxed">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#725b38] flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">mark_email_read</span>
                        Nhập mã OTP 6 số
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-[#cbdbf5] font-mono font-bold text-[11px] text-[#0b1c30]">
                        {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <p>
                      Mã OTP đã gửi đến <strong>{recoveryEmail}</strong>.
                    </p>
                    {demoOtpHint && (
                      <p className="mt-1.5 text-[11px] font-semibold text-[#725b38]">
                        Mã OTP thử nghiệm: <code className="px-1.5 py-0.5 bg-white rounded border border-[#b9a277]">{demoOtpHint}</code>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Mã xác thực OTP (6 chữ số)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      disabled={isLoading}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full h-11 px-4 text-center tracking-[0.4em] font-mono font-bold bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-base focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Mật khẩu mới</label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="8–32 ký tự: chữ hoa, thường, số & ký tự đặc biệt"
                      className="w-full h-11 px-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full h-11 px-4 bg-white border border-[#d3e4fe] rounded-xl text-[#0b1c30] text-sm focus:outline-none focus:border-[#725b38] focus:ring-2 focus:ring-[#725b38]/30"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep('request');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[#725b38] hover:underline font-semibold cursor-pointer"
                    >
                      Đổi email khác / Gửi lại OTP
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-[#725b38] text-white text-sm font-bold shadow-md hover:bg-[#584323] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <span>Xác Nhận Đặt Lại Mật Khẩu</span>
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs text-[#725b38] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Quay lại Đăng Nhập</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
