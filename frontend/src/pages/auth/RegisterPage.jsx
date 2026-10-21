import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      showToast('Vui lòng điền đầy đủ các trường bắt buộc!', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu phải chứa ít nhất 6 ký tự!', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Xác nhận mật khẩu không khớp!', 'warning');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      showToast('Đăng ký tài khoản thành công!', 'success');
      navigate('/rooms');
    } catch (err) {
      showToast(err.message || 'Đăng ký thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">✨</span>
          <h2>Đăng ký Tài khoản</h2>
          <p>Tạo tài khoản khách hàng để đặt phòng và quản lý kỳ nghỉ dễ dàng</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Họ và tên *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu (Tối thiểu 6 ký tự) *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label>Xác nhận lại mật khẩu *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="auth-footer-links">
          <span>Đã có tài khoản?</span>
          <Link to="/login">Đăng nhập tại đây</Link>
        </div>
      </div>
    </div>
  );
}
