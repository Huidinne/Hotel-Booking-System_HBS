import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CustomInput } from '../../components/common/CustomInput';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

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

      if (res.user.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard');
      } else if (res.user.role === 'ROLE_RECEPTIONIST') {
        navigate('/receptionist/bookings');
      } else {
        navigate('/');
      }
    } catch (err) {
      showToast(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Vui lòng nhập địa chỉ email!', 'warning');
      return;
    }

    setResettingPassword(true);
    try {
      showToast(`Đã ghi nhận yêu cầu khôi phục mật khẩu cho email ${forgotEmail.trim()}. Vui lòng liên hệ ban quản trị hệ thống.`, 'info');
      setIsForgotPasswordOpen(false);
    } catch (err) {
      showToast(err.message || 'Lỗi gửi yêu cầu', 'error');
    } finally {
      setResettingPassword(false);
    }
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
                onClick={() => {
                  setForgotEmail(emailOrUsername);
                  setIsForgotPasswordOpen(true);
                }}
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

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="modal-backdrop" onClick={() => setIsForgotPasswordOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '440px', borderTop: '4px solid #C5A880' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontFamily: "var(--font-serif, 'Playfair Display')", color: '#0F172A' }}>Khôi phục mật khẩu</h3>
              <button className="modal-close-btn" onClick={() => setIsForgotPasswordOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.2rem', lineHeight: '1.5' }}>
                Vui lòng nhập địa chỉ email đã đăng ký tài khoản tại Grand Aurora. Hệ thống sẽ hỗ trợ bạn thiết lập lại mật khẩu truy cập.
              </p>
              <form onSubmit={handleForgotPasswordSubmit} noValidate>
                <CustomInput
                  id="forgotEmail"
                  name="forgotEmail"
                  type="email"
                  label="Địa chỉ Email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  required
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    disabled={resettingPassword}
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '8px' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-auth-gold"
                    disabled={resettingPassword}
                    style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
                  >
                    {resettingPassword ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
