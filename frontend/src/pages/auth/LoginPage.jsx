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
        navigate('/my-bookings');
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
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🏨</span>
          <h2>Đăng nhập Hệ thống</h2>
          <p>Truy cập tài khoản khách hàng hoặc phân hệ quản trị vận hành</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Field: Email or Username */}
          <CustomInput
            id="emailOrUsername"
            name="emailOrUsername"
            label="Email hoặc Tên đăng nhập"
            placeholder="name@example.com hoặc customer"
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
          <div className="auth-remember-row">
            <label className="checkbox-remember-label">
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
          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer-links">
          <span>Chưa có tài khoản?</span>
          <Link to="/register">Đăng ký tài khoản mới</Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="modal-backdrop" onClick={() => setIsForgotPasswordOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Khôi phục mật khẩu</h3>
              <button className="modal-close-btn" onClick={() => setIsForgotPasswordOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.5' }}>
                Vui lòng nhập địa chỉ email đã đăng ký. Hệ thống (mô phỏng) sẽ hướng dẫn bạn thiết lập lại mật khẩu truy cập.
              </p>
              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="form-group">
                  <label>Địa chỉ Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    disabled={resettingPassword}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={resettingPassword}
                  >
                    {resettingPassword ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
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
