import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CustomInput } from '../../components/common/CustomInput';

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

  // Custom validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, val, currentPassword = password) => {
    let error = '';
    const value = (val || '').trim();

    if (field === 'fullName') {
      if (!value) {
        error = 'Vui lòng nhập họ và tên';
      } else if (value.length < 2) {
        error = 'Họ và tên tối thiểu 2 ký tự';
      }
    } else if (field === 'email') {
      if (!value) {
        error = 'Vui lòng nhập địa chỉ email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Địa chỉ email không đúng định dạng';
      }
    } else if (field === 'phone') {
      if (!value) {
        error = 'Vui lòng nhập số điện thoại';
      } else if (!/^[0-9+\s\-]{9,15}$/.test(value)) {
        error = 'Số điện thoại không hợp lệ (9 - 15 số)';
      }
    } else if (field === 'password') {
      if (!val) {
        error = 'Vui lòng nhập mật khẩu';
      } else if (val.length < 6) {
        error = 'Mật khẩu phải chứa ít nhất 6 ký tự';
      }
    } else if (field === 'confirmPassword') {
      if (!val) {
        error = 'Vui lòng xác nhận lại mật khẩu';
      } else if (val !== currentPassword) {
        error = 'Mật khẩu xác nhận không khớp';
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

    const fullNameErr = validateField('fullName', fullName);
    const emailErr = validateField('email', email);
    const phoneErr = validateField('phone', phone);
    const passwordErr = validateField('password', password);
    const confirmPasswordErr = validateField('confirmPassword', confirmPassword, password);

    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    const newErrors = {
      fullName: fullNameErr,
      email: emailErr,
      phone: phoneErr,
      password: passwordErr,
      confirmPassword: confirmPasswordErr,
    };
    setErrors(newErrors);

    if (fullNameErr || emailErr || phoneErr || passwordErr || confirmPasswordErr) {
      showToast('Vui lòng hoàn thiện đúng các trường thông tin!', 'warning');
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

      showToast('Đăng ký tài khoản thành công! Chào mừng quý khách.', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Đăng ký thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="luxury-split-page">
      {/* Side A (Visual Side - 50%) */}
      <div
        className="luxury-visual-pane"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=85')`,
        }}
      >
        <div className="luxury-visual-overlay" />

        <div className="luxury-visual-content">
          <div className="luxury-visual-footer">
            <div className="luxury-tagline-badge">
              <span>✦</span> ĐẶC QUYỀN HỘI VIÊN AURORA CLUB
            </div>
            <h1 className="luxury-visual-tagline">
              Khởi Đầu Hành Trình Nghỉ Dưỡng Hoàn Hảo
            </h1>
            <p className="luxury-visual-desc">
              Trở thành hội viên Grand Aurora ngay hôm nay để mở khóa những trải nghiệm xa hoa, ưu đãi đặt phòng trực tiếp cùng các dịch vụ chăm sóc cá nhân hóa chuẩn 5 sao.
            </p>
            <div className="luxury-feature-pills">
              <div className="luxury-feature-item">
                Giảm 10% Đơn Đặt Phòng Đầu Tiên
              </div>
              <div className="luxury-feature-item">
                Tích Luỹ Điểm Thưởng Aurora
              </div>
              <div className="luxury-feature-item">
                Ưu Tiên Nhận/Trả Phòng Linh Hoạt
              </div>
              <div className="luxury-feature-item">
                Đồ Uống Chào Mừng Thượng Hạng
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
            <h2>Đăng ký Tài khoản</h2>
            <p>Tạo tài khoản hội viên để đặt phòng và quản lý kỳ nghỉ dễ dàng</p>
          </div>

          <form onSubmit={handleSubmit} className="luxury-auth-form" noValidate>
            <CustomInput
              id="fullName"
              name="fullName"
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={fullName}
              required
              error={touched.fullName ? errors.fullName : ''}
              onChange={(e) => handleChange('fullName', e.target.value, setFullName)}
              onBlur={(e) => handleBlur('fullName', e.target.value)}
            />

            <CustomInput
              id="email"
              name="email"
              type="email"
              label="Địa chỉ Email"
              placeholder="name@example.com"
              value={email}
              required
              error={touched.email ? errors.email : ''}
              onChange={(e) => handleChange('email', e.target.value, setEmail)}
              onBlur={(e) => handleBlur('email', e.target.value)}
            />

            <CustomInput
              id="phone"
              name="phone"
              type="tel"
              label="Số điện thoại"
              placeholder="0901234567"
              value={phone}
              required
              error={touched.phone ? errors.phone : ''}
              onChange={(e) => handleChange('phone', e.target.value, setPhone)}
              onBlur={(e) => handleBlur('phone', e.target.value)}
            />

            <CustomInput
              id="password"
              name="password"
              type="password"
              label="Mật khẩu (Tối thiểu 6 ký tự)"
              placeholder="••••••••"
              value={password}
              required
              error={touched.password ? errors.password : ''}
              onChange={(e) => handleChange('password', e.target.value, setPassword)}
              onBlur={(e) => handleBlur('password', e.target.value)}
            />

            <CustomInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Xác nhận lại mật khẩu"
              placeholder="••••••••"
              value={confirmPassword}
              required
              error={touched.confirmPassword ? errors.confirmPassword : ''}
              onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
              onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
            />

            <button type="submit" className="btn-auth-gold" disabled={loading}>
              {loading ? 'Đang khởi tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>

          <div className="luxury-auth-switcher">
            <span>Đã có tài khoản?</span>
            <Link to="/login">Đăng nhập tại đây</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
