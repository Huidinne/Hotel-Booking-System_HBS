import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, ShieldCheck, Edit3, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { CustomInput } from '../../components/common/CustomInput';
import { Modal } from '../../components/common/Modal';

export function ProfilePage() {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(currentUser);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchLatest = async () => {
      setLoadingProfile(true);
      try {
        const latest = await authService.getProfile();
        if (mounted && latest) {
          setProfile(latest);
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };
    fetchLatest();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
    }
  }, [currentUser]);

  const openEditModal = () => {
    const active = profile || currentUser || {};
    setFullName(active.fullName || '');
    setPhone(active.phone || '');
    setErrors({});
    setTouched({});
    setIsEditOpen(true);
  };

  const validateField = (field, value) => {
    const v = (value || '').trim();
    if (field === 'fullName') {
      if (!v) return 'Vui lòng nhập họ và tên';
      if (v.length < 2) return 'Họ và tên tối thiểu 2 ký tự';
    }
    if (field === 'phone') {
      if (!v) return 'Vui lòng nhập số điện thoại';
      if (!/^[0-9+\s-]{9,15}$/.test(v)) return 'Số điện thoại không đúng định dạng (9 - 15 số)';
    }
    return '';
  };

  const handleBlur = (field, val) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleChange = (field, val, setter) => {
    setter(val);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const nameErr = validateField('fullName', fullName);
    const phoneErr = validateField('phone', phone);

    setTouched({ fullName: true, phone: true });
    setErrors({ fullName: nameErr, phone: phoneErr });

    if (nameErr || phoneErr) {
      showToast('Vui lòng kiểm tra lại thông tin hợp lệ trước khi lưu!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setProfile(updated);
      setIsEditOpen(false);
      showToast('Cập nhật thông tin cá nhân thành công', 'success');
    } catch (err) {
      showToast(err?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const user = profile || currentUser;
  if (!user) return null;

  const getRoleLabel = (role) => {
    const r = String(role || '').toUpperCase();
    if (r === 'ROLE_ADMIN' || r === 'ADMIN') return 'Quản trị viên';
    if (r === 'ROLE_RECEPTIONIST' || r === 'RECEPTIONIST') return 'Lễ tân';
    return 'Khách hàng';
  };

  return (
    <div style={{ minHeight: '75vh', padding: '2.5rem 1.25rem', background: '#F8FAFC' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              padding: '2rem',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C5A880 0%, #A68454 100%)',
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                }}
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {user.fullName}
                </h1>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #C5A880 0%, #B48E58 100%)',
                color: '#0F172A',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              <Edit3 size={16} />
              <span>Chỉnh sửa thông tin</span>
            </button>
          </div>

          {/* Profile Info Body */}
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                Thông tin tài khoản cá nhân
              </h2>
              {loadingProfile && (
                <span style={{ fontSize: '0.82rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Loader2 size={14} className="spin" /> Đang đồng bộ...
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748B', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <User size={14} /> <span>Họ và tên</span>
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>{user.fullName || '—'}</div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748B', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <Mail size={14} /> <span>Email</span>
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>{user.email || '—'}</div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748B', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <Phone size={14} /> <span>Số điện thoại</span>
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>{user.phone || 'Chưa cập nhật'}</div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748B', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={14} /> <span>Vai trò & Trạng thái</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{getRoleLabel(user.role)}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: user.isActive !== false ? '#DCFCE7' : '#FEE2E2',
                      color: user.isActive !== false ? '#166534' : '#991B1B',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {user.isActive !== false ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => !submitting && setIsEditOpen(false)}
        title="Chỉnh sửa thông tin cá nhân"
        maxWidth="480px"
      >
        <form onSubmit={handleSave} noValidate>
          <CustomInput
            id="profile-fullname"
            name="fullName"
            label="Họ và tên"
            placeholder="Nhập họ và tên của bạn"
            value={fullName}
            required
            error={touched.fullName ? errors.fullName : ''}
            onChange={(e) => handleChange('fullName', e.target.value, setFullName)}
            onBlur={(e) => handleBlur('fullName', e.target.value)}
          />

          <CustomInput
            id="profile-phone"
            name="phone"
            type="tel"
            label="Số điện thoại"
            placeholder="Ví dụ: 0901234567"
            value={phone}
            required
            error={touched.phone ? errors.phone : ''}
            onChange={(e) => handleChange('phone', e.target.value, setPhone)}
            onBlur={(e) => handleBlur('phone', e.target.value)}
          />

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Email (Không thể thay đổi)
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
                color: '#64748B',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={() => setIsEditOpen(false)}
              style={{ width: 'auto', padding: '0.65rem 1.25rem', marginTop: 0 }}
            >
              <X size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Hủy
            </button>
            <button
              type="submit"
              className="btn-auth-gold"
              disabled={submitting}
              style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
            >
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default ProfilePage;
