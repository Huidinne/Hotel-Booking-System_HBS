import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CustomInput } from '../../components/common/CustomInput';
import { authService } from '../../services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const shownAuthMessageRef = useRef(false);
  const fromLocation = location.state?.from;
  const redirectTarget = fromLocation
    ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}`
    : null;
  const { login, currentUser } = useAuth();
  const { showToast } = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Forgot password modal multi-step states (OTP Flow)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (location.state?.authMessage && !shownAuthMessageRef.current) {
      shownAuthMessageRef.current = true;
      showToast(location.state.authMessage, 'warning');
    }
  }, [location.state, showToast]);

  useEffect(() => {
    if (currentUser) {
      const role = (currentUser.role || '').toUpperCase();
      if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
        navigate(redirectTarget && redirectTarget.startsWith('/admin') ? redirectTarget : '/admin/dashboard', { replace: true });
      } else if (role === 'ROLE_RECEPTIONIST' || role === 'RECEPTIONIST') {
        navigate(redirectTarget && redirectTarget.startsWith('/receptionist') ? redirectTarget : '/receptionist/timeline', { replace: true });
      } else if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      }
    }
  }, [currentUser, navigate, redirectTarget]);

  useEffect(() => {
    const remembered = localStorage.getItem('hbs_remember_me');
    if (remembered) {
      setEmailOrUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const validateField = (field, val) => {
    let error = '';
    const value = (val || '').trim();
    if (field === 'emailOrUsername') {
      if (!value) {
        error = 'Vui lòng nhập Email hoặc Tên đăng nhập';
      }
    } else if (field === 'password') {
      if (!val) {
        error = 'Vui lòng nhập mật khẩu';
      }
    }
    return error;
  };

  const handleBlur = (field, val) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, val, setter) => {
    setter(val);
    if (touched[field]) {
      const errorMsg = validateField(field, val);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailErr = validateField('emailOrUsername', emailOrUsername);
    const passErr = validateField('password', password);

    setTouched({
      emailOrUsername: true,
      password: true,
    });

    const newErrors = {
      emailOrUsername: emailErr,
      password: passErr,
    };
    setErrors(newErrors);

    if (emailErr || passErr) {
      showToast('Vui lòng điền đầy đủ thông tin đăng nhập!', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        emailOrUsername: emailOrUsername.trim(),
        email: emailOrUsername.trim(),
        password,
        rememberMe,
      });

      showToast(`Đăng nhập thành công! Chào mừng ${res.user.fullName}`, 'success');

      const role = (res.user?.role || '').toUpperCase();
      if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
        navigate(redirectTarget && redirectTarget.startsWith('/admin') ? redirectTarget : '/admin/dashboard', { replace: true });
      } else if (role === 'ROLE_RECEPTIONIST' || role === 'RECEPTIONIST') {
        navigate(redirectTarget && redirectTarget.startsWith('/receptionist') ? redirectTarget : '/receptionist/timeline', { replace: true });
      } else {
        navigate(redirectTarget || '/', { replace: true });
      }
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotPassword = () => {
    const defaultEmail = emailOrUsername.includes('@') ? emailOrUsername.trim() : '';
    setForgotEmail(defaultEmail);
    setForgotStep(1);
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError('');
    setIsForgotPasswordOpen(true);
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const emailTrimmed = (forgotEmail || '').trim();
    if (!emailTrimmed) {
      setForgotError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setForgotError('Địa chỉ email không đúng định dạng');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await authService.requestPasswordResetOtp(emailTrimmed);
      setResendCooldown(res?.cooldownSeconds || 60);
      setForgotStep(2);
      showToast('Mã OTP xác thực gồm 6 chữ số đã được gửi tới email của bạn.', 'info');
    } catch (err) {
      setForgotError(err.message || 'Lỗi gửi yêu cầu xác thực OTP');
      showToast(err.message || 'Lỗi gửi mã OTP', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpTrimmed = (otpCode || '').trim();
    if (!otpTrimmed) {
      setForgotError('Vui lòng nhập mã OTP');
      return;
    }
    if (!/^\d{6}$/.test(otpTrimmed)) {
      setForgotError('Mã OTP phải gồm đúng 6 chữ số');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await authService.verifyPasswordResetOtp(forgotEmail, otpTrimmed);
      setResetToken(res.resetToken);
      setForgotStep(3);
      showToast('Xác thực mã OTP thành công! Vui lòng tạo mật khẩu mới.', 'success');
    } catch (err) {
      setForgotError(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      showToast(err.message || 'Xác thực mã OTP thất bại', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword) {
      setForgotError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      await authService.resetPasswordWithToken({
        email: forgotEmail,
        resetToken,
        newPassword,
      });
      showToast('Mật khẩu đã được đặt lại thành công! Quý khách vui lòng đăng nhập.', 'success');
      setEmailOrUsername(forgotEmail);
      setPassword('');
      setIsForgotPasswordOpen(false);
    } catch (err) {
      setForgotError(err.message || 'Đặt lại mật khẩu thất bại');
      showToast(err.message || 'Đặt lại mật khẩu thất bại', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: '#94a3b8', width: '0%' };
    if (pass.length < 6) return { label: 'Tối thiểu 6 ký tự', color: '#ef4444', width: '25%' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { label: 'Yếu', color: '#f59e0b', width: '45%' };
    if (score <= 2) return { label: 'Trung bình', color: '#3b82f6', width: '75%' };
    return { label: 'Mạnh', color: '#10b981', width: '100%' };
  };

  return (
    <div className="luxury-split-page">
      {/* Side A (Visual Side - 50%) */}
      <div
        className="luxury-visual-pane"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=85')`,
        }}
      >
        <div className="luxury-visual-overlay" />
        
        <div className="luxury-visual-content">
          <div className="luxury-visual-footer">
            <div className="luxury-tagline-badge">
              <span>✦</span> KHÔNG GIAN NGHỈ DƯỠNG HOÀNG GIA
            </div>
            <h1 className="luxury-visual-tagline">
              Trải Nghiệm Kỳ Nghỉ Đẳng Cấp Thượng Lưu
            </h1>
            <p className="luxury-visual-desc">
              Chào mừng bạn đến với thiên đường lưu trú 5 sao quốc tế — nơi hội tụ kiến trúc tân cổ điển xa hoa, lòng hiếu khách chuẩn mực và tầm nhìn panorama tuyệt mỹ.
            </p>
            <div className="luxury-feature-pills">
              <div className="luxury-feature-item">
                Tiêu chuẩn 5 Sao Quốc tế
              </div>
              <div className="luxury-feature-item">
                 Dịch vụ Quản gia 24/7
              </div>
              <div className="luxury-feature-item">
                Ẩm thực Michelin 3 Sao
              </div>
              <div className="luxury-feature-item">
                Cam kết giữ chỗ tức thì
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side B (Form Side - 50%) */}
      <div className="luxury-form-pane">
        <div className="luxury-auth-card">
          <div className="luxury-auth-header">
            <div className="luxury-auth-crest-mini">
              <span>⚜️</span>
            </div>
            <h2>Đăng nhập</h2>
            <p>Chào mừng bạn trở lại với Grand Aurora Luxury Hotel & Suites</p>
          </div>

          <form onSubmit={handleSubmit} className="luxury-auth-form" noValidate>
            {/* Field: Email or Username */}
            <CustomInput
              id="emailOrUsername"
              name="emailOrUsername"
              label="Email hoặc Tên đăng nhập"
              placeholder="Ví dụ: customer@gmail.com hoặc customer"
              value={emailOrUsername}
              required
              error={touched.emailOrUsername ? errors.emailOrUsername : ''}
              onChange={(e) => handleChange('emailOrUsername', e.target.value, setEmailOrUsername)}
              onBlur={(e) => handleBlur('emailOrUsername', e.target.value)}
            />

            {/* Field: Password */}
            <CustomInput
              id="password"
              name="password"
              type="password"
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              required
              error={touched.password ? errors.password : ''}
              onChange={(e) => handleChange('password', e.target.value, setPassword)}
              onBlur={(e) => handleBlur('password', e.target.value)}
            />

            {/* Field: Remember me & Forgot password link */}
            <div className="luxury-remember-row">
              <label className="luxury-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <button
                type="button"
                className="btn-forgot-password-link"
                onClick={handleOpenForgotPassword}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Button: Login */}
            <button type="submit" className="btn-auth-gold" disabled={loading}>
              {loading ? 'Đang xác thực bảo mật...' : 'Đăng nhập ngay'}
            </button>
          </form>

          {/* Form Switcher */}
          <div className="luxury-auth-switcher">
            <span>Chưa có tài khoản?</span>
            <Link to="/register">Đăng ký ngay</Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (Wizard 3 bước với OTP) */}
      {isForgotPasswordOpen && (
        <div className="modal-backdrop" onClick={() => !forgotLoading && setIsForgotPasswordOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '480px', borderTop: '4px solid #C5A880' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ color: '#0F172A', fontWeight: 700, margin: 0, fontSize: '1.25rem' }}>Khôi phục mật khẩu</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    backgroundColor: forgotStep === 1 ? '#0F172A' : '#E2E8F0',
                    color: forgotStep === 1 ? '#C5A880' : '#64748B'
                  }}>
                    1. Email
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>➔</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    backgroundColor: forgotStep === 2 ? '#0F172A' : '#E2E8F0',
                    color: forgotStep === 2 ? '#C5A880' : '#64748B'
                  }}>
                    2. Mã OTP
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>➔</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    backgroundColor: forgotStep === 3 ? '#0F172A' : '#E2E8F0',
                    color: forgotStep === 3 ? '#C5A880' : '#64748B'
                  }}>
                    3. Mật khẩu mới
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" disabled={forgotLoading} onClick={() => setIsForgotPasswordOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: '1rem' }}>
              {/* Lỗi chung trong Modal */}
              {forgotError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.86rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>⚠️</span>
                  <span>{forgotError}</span>
                </div>
              )}

              {/* BƯỚC 1: NHẬP EMAIL */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestOtp} noValidate>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                    Vui lòng nhập địa chỉ email đã đăng ký tại Grand Aurora. Hệ thống sẽ gửi mã xác minh 6 chữ số (OTP) tới hộp thư của bạn.
                  </p>
                  <CustomInput
                    id="forgotEmail"
                    name="forgotEmail"
                    type="email"
                    label="Địa chỉ Email"
                    placeholder="name@example.com"
                    value={forgotEmail}
                    required
                    disabled={forgotLoading}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                  />
                  <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      disabled={forgotLoading}
                      style={{ padding: '0.65rem 1.25rem', borderRadius: '8px' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-auth-gold"
                      disabled={forgotLoading}
                      style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
                    >
                      {forgotLoading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
                    </button>
                  </div>
                </form>
              )}

              {/* BƯỚC 2: NHẬP MÃ OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} noValidate>
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    color: '#334155',
                    marginBottom: '1.2rem',
                    lineHeight: '1.5'
                  }}>
                    Mã xác thực OTP gồm 6 chữ số đã được gửi tới <strong>{forgotEmail}</strong>. Mã có hiệu lực trong vòng <strong>5 phút</strong>.
                  </div>

                  <CustomInput
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    label="Mã xác thực OTP (6 chữ số)"
                    placeholder="Ví dụ: 582914"
                    value={otpCode}
                    required
                    disabled={forgotLoading}
                    maxLength={6}
                    autoComplete="one-time-code"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (forgotError) setForgotError('');
                    }}
                  />

                  {/* Resend Cooldown Countdown */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748B' }}>Chưa nhận được mã?</span>
                    {resendCooldown > 0 ? (
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>
                        Gửi lại mã sau ({resendCooldown}s)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={forgotLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#C5A880',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Gửi lại mã ngay
                      </button>
                    )}
                  </div>

                  <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError('');
                      }}
                      disabled={forgotLoading}
                      style={{ padding: '0.65rem 1.25rem', borderRadius: '8px' }}
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="btn-auth-gold"
                      disabled={forgotLoading || otpCode.length < 6}
                      style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
                    >
                      {forgotLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* BƯỚC 3: ĐẶT MẬT KHẨU MỚI */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} noValidate>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                    Xác minh danh tính thành công. Quý khách vui lòng thiết lập mật khẩu mới (tối thiểu 6 ký tự).
                  </p>

                  <CustomInput
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    label="Mật khẩu mới"
                    placeholder="••••••••"
                    value={newPassword}
                    required
                    disabled={forgotLoading}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                  />

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div style={{ marginTop: '-0.3rem', marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: '#64748b' }}>Độ mạnh mật khẩu:</span>
                        <span style={{ fontWeight: 700, color: getPasswordStrength(newPassword).color }}>
                          {getPasswordStrength(newPassword).label}
                        </span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: getPasswordStrength(newPassword).width,
                          backgroundColor: getPasswordStrength(newPassword).color,
                          transition: 'width 0.3s ease, background-color 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  <CustomInput
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    label="Xác nhận mật khẩu mới"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    required
                    disabled={forgotLoading}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                  />

                  <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsForgotPasswordOpen(false)}
                      disabled={forgotLoading}
                      style={{ padding: '0.65rem 1.25rem', borderRadius: '8px' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-auth-gold"
                      disabled={forgotLoading || !newPassword || !confirmNewPassword}
                      style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
                    >
                      {forgotLoading ? 'Đang lưu...' : 'Đổi mật khẩu & Hoàn tất'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
