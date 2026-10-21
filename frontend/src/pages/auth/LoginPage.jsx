import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { mockAuthService } from '../../services/mockAuthService';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    const remembered = mockAuthService.getRememberedIdentifier();
    if (remembered) {
      setEmailOrUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password.trim()) {
      showToast('Vui lòng nhập Email hoặc Tên đăng nhập và Mật khẩu!', 'warning');
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
      showToast(err.message || 'Đăng nhập thất bại', 'error');
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
      const res = await mockAuthService.forgotPassword(forgotEmail.trim());
      showToast(res.message, 'success');
      setIsForgotPasswordOpen(false);
    } catch (err) {
      showToast(err.message || 'Lỗi gửi yêu cầu', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmailOrUsername(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">🏨</span>
          <h2>Đăng nhập Hệ thống</h2>
          <p>Truy cập tài khoản khách hàng hoặc phân hệ quản trị vận hành</p>
        </div>

        {/* Demo Fast Login Pills for convenient testing */}
        <div className="demo-accounts-box">
          <div className="demo-box-title">Đăng nhập nhanh (Tài khoản thử nghiệm):</div>
          <div className="demo-pills-row">
            <button
              type="button"
              className="demo-pill customer"
              onClick={() => handleQuickDemo('customer@gmail.com')}
            >
              👤 Khách hàng
            </button>
            <button
              type="button"
              className="demo-pill receptionist"
              onClick={() => handleQuickDemo('receptionist@hotel.com')}
            >
              🛎️ Lễ tân
            </button>
            <button
              type="button"
              className="demo-pill admin"
              onClick={() => handleQuickDemo('admin@hotel.com')}
            >
              👑 Quản trị viên
            </button>
          </div>
          <div className="demo-pass-hint">Mật khẩu mặc định: <code>Password@123</code></div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Field: Email or Username */}
          <div className="form-group">
            <label>Email hoặc Tên đăng nhập *</label>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="name@example.com hoặc customer"
              required
            />
          </div>

          {/* Field: Password */}
          <div className="form-group">
            <label>Mật khẩu *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

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
