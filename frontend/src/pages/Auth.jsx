import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


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
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Đăng ký
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [enrollClub, setEnrollClub] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Form states - Khôi phục mật khẩu
  const [recoveryEmail, setRecoveryEmail] = useState('');

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

  // Đổi tab
  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Xử lý Đăng Nhập
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim()) {
      setErrorMessage('Vui lòng nhập Email, Tên đăng nhập hoặc Số điện thoại.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await login(loginIdentifier.trim(), loginPassword);
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
        setErrorMessage(res.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.');
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

    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên đầy đủ.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Quý khách vui lòng đồng ý với Điều khoản dịch vụ & Chính sách quyền riêng tư.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        enrollClub
      });

      if (res.success) {
        setSuccessMessage('Chúc mừng quý khách đã gia nhập Grand Horizon Elite! Đang kích hoạt...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setErrorMessage(res.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra lỗi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Khôi Phục Mật Khẩu
  const handleRecoverySubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!recoveryEmail.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Số điện thoại để khôi phục.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Yêu cầu đã được tiếp nhận! Mã OTP khôi phục mật khẩu đã được gửi đến địa chỉ của quý khách.');
    }, 700);
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
        
        {/* Top Branding & Status Bar */}
        <div className="px-6 pt-6 pb-4 border-b border-[#e5eeff] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#fedeb2]/40 flex items-center justify-center text-[#725b38] border border-[#e0c298]/50 shadow-xs">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                hotel_class
              </span>
            </div>
            <div>
              <span className="font-['Playfair_Display',Georgia,serif] text-lg font-bold text-[#0b1c30] tracking-wide block leading-tight">
                Grand Horizon
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button back to Home */}
            <Link
              to="/"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#45464d] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors"
              title="Đóng / Về trang chủ"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </Link>
          </div>
        </div>

        {/* Modal Inner Body */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          
          {/* Header & Switch Tabs */}
          <div className="mb-6">
            <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-[28px] font-bold text-[#0b1c30] mb-1.5">
              {activeTab === 'login' && 'Đăng Nhập'}
              {activeTab === 'register' && 'Đăng Ký Hội Viên'}
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
                <span className="font-bold text-[#725b38]">Tài khoản thử nghiệm:</span> <code>guest_9@hoteldomain.vn</code> // Mật khẩu: <code>123456</code>
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
                    placeholder="Tối thiểu 6 ký tự kèm số"
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
                    setRegPassword('123456');
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
          {/* RECOVERY FORM SECTION (Quên mật khẩu)                         */}
          {/* ============================================================== */}
          {activeTab === 'recovery' && (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#e5eeff] border border-[#cbdbf5] text-xs text-[#203044] leading-relaxed">
                <div className="flex items-center gap-1.5 text-[#725b38] font-bold text-sm mb-1">
                  <span className="material-symbols-outlined text-lg">lock_reset</span>
                  <span>Khôi Phục Quyền Truy Cập</span>
                </div>
                Vui lòng nhập Email hoặc Số điện thoại của tài khoản. Hệ thống bảo mật sẽ gửi liên kết và mã PIN khôi phục mật khẩu trực tiếp đến thông tin của quý khách.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-2">
                  Email hoặc Số điện thoại đã đăng ký
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#45464d] material-symbols-outlined text-xl pointer-events-none">
                    mail
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="name@email.com hoặc 0912..."
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
                    <span>Đang gửi mã PIN...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi Liên Kết Khôi Phục</span>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </>
                )}
              </button>

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
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
