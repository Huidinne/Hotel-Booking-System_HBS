import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import { userService } from '../../services/userService';
import { UserRoleBadge, UserStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { CustomInput } from '../../components/common/CustomInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 10;

const ROLE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'ROLE_RECEPTIONIST', label: 'Lễ tân (Receptionist)' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên (Admin)' },
  { value: 'ROLE_CUSTOMER', label: 'Khách hàng (Customer)' },
];

const ASSIGNABLE_ROLES = [
  { value: 'ROLE_RECEPTIONIST', label: 'Lễ tân (ROLE_RECEPTIONIST)' },
  { value: 'ROLE_ADMIN', label: 'Quản trị viên (ROLE_ADMIN)' },
  { value: 'ROLE_CUSTOMER', label: 'Khách hàng (ROLE_CUSTOMER)' },
];

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function AdminUsersPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    adminCount: 0,
    receptionistCount: 0,
    customerCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Pagination (1-based UI, 0-based API)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Create / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ROLE_RECEPTIONIST');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal state
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetTouched, setResetTouched] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Lock / Unlock ConfirmDialog state
  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pageData, statsData] = await Promise.all([
        userService.getUsers({
          keyword: debouncedSearch,
          role: roleFilter,
          isActive: statusFilter,
          page: currentPage - 1,
          size: ITEMS_PER_PAGE,
        }),
        userService.getStats(),
      ]);

      setUsers(pageData?.content || []);
      setTotalPages(Math.max(1, pageData?.totalPages || 1));
      setTotalElements(pageData?.totalElements || 0);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, currentPage, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // --- Validation helpers ---
  const validateField = (field, value, isEditMode = Boolean(editingUser)) => {
    const val = (value ?? '').toString().trim();
    switch (field) {
      case 'fullName':
        if (!val) return 'Họ và tên không được để trống';
        if (val.length > 100) return 'Họ và tên tối đa 100 ký tự';
        return '';
      case 'email':
        if (isEditMode) return '';
        if (!val) return 'Email không được để trống';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Email không đúng định dạng';
        return '';
      case 'phone':
        if (!val) return 'Số điện thoại không được để trống';
        if (!/^[0-9+\-\s]{8,20}$/.test(val)) return 'Số điện thoại không hợp lệ (8-20 ký tự)';
        return '';
      case 'password':
        if (isEditMode) return '';
        if (!value) return 'Mật khẩu khởi tạo không được để trống';
        if (value.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
        return '';
      case 'role':
        if (!val) return 'Vui lòng chọn vai trò';
        return '';
      default:
        return '';
    }
  };

  const handleFormFieldChange = (field, value, setter) => {
    setter(value);
    if (formTouched[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleFormFieldBlur = (field, value) => {
    setFormTouched((prev) => ({ ...prev, [field]: true }));
    setFormErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  // --- Create / Edit Handlers ---
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('ROLE_RECEPTIONIST');
    setPassword('');
    setFormErrors({});
    setFormTouched({});
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setRole(user.role || 'ROLE_CUSTOMER');
    setPassword('');
    setFormErrors({});
    setFormTouched({});
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingUser);
    const nextErrors = {
      fullName: validateField('fullName', fullName, isEdit),
      email: validateField('email', email, isEdit),
      phone: validateField('phone', phone, isEdit),
      role: validateField('role', role, isEdit),
      password: validateField('password', password, isEdit),
    };
    setFormTouched({ fullName: true, email: true, phone: true, role: true, password: true });
    setFormErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await userService.updateUser(editingUser.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          role,
        });
        showToast(`Đã cập nhật tài khoản "${fullName.trim()}" thành công!`, 'success');
      } else {
        await userService.createUser({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          role,
        });
        showToast(`Đã cấp tài khoản mới cho "${fullName.trim()}" thành công!`, 'success');
      }
      setIsFormModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Thao tác lưu tài khoản thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Lock / Unlock Handlers ---
  const handleOpenStatusConfirm = (user) => {
    const isSelf = currentUser?.email && user.email?.toLowerCase() === currentUser.email.toLowerCase();
    if (isSelf) {
      showToast('Không thể tự khóa tài khoản Quản trị đang đăng nhập!', 'warning');
      return;
    }
    setStatusTargetUser(user);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetUser) return;
    const nextActive = !statusTargetUser.isActive;
    setStatusLoading(true);
    try {
      await userService.updateUserStatus(statusTargetUser.id, nextActive);
      showToast(
        nextActive
          ? `Đã mở khóa tài khoản "${statusTargetUser.fullName}" thành công!`
          : `Đã khóa tài khoản "${statusTargetUser.fullName}" thành công!`,
        'success'
      );
      setStatusTargetUser(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Cập nhật trạng thái tài khoản thất bại', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // --- Reset Password Handlers ---
  const handleOpenResetPassword = (user) => {
    setResetTargetUser(user);
    setNewPassword('');
    setResetError('');
    setResetTouched(false);
  };

  const handleSubmitResetPassword = async (e) => {
    e.preventDefault();
    setResetTouched(true);
    if (!newPassword) {
      setResetError('Mật khẩu mới không được để trống');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    setResetError('');
    setResetting(true);
    try {
      await userService.resetPassword(resetTargetUser.id, newPassword);
      showToast(`Đã đặt lại mật khẩu cho "${resetTargetUser.fullName}" thành công!`, 'success');
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message || 'Đặt lại mật khẩu thất bại', 'error');
    } finally {
      setResetting(false);
    }
  };

  const hasActiveFilter = Boolean(searchTerm.trim() || roleFilter !== 'ALL' || statusFilter !== 'ALL');

  return (
    <div className="admin-crud-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1>Quản Lý Tài Khoản & Phân Quyền (Users)</h1>
          <p>
            Cấp tài khoản mới cho nhân viên Lễ tân, quản lý thông tin khách hàng, khóa/mở khóa và đặt lại mật khẩu
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenCreateModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <UserPlus size={16} /> Cấp Tài Khoản Lễ Tân
        </button>
      </div>

      {/* KPI Summary Cards (sử dụng class .kpi-cards-grid / .kpi-card có sẵn của Dashboard) */}
      <div className="kpi-cards-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Tổng tài khoản</span>
            <span className="kpi-icon"><Users size={18} color="#475569" /></span>
          </div>
          <div className="kpi-value">{stats.totalUsers}</div>
          <div className="kpi-hint">Gồm {stats.adminCount} Admin & {stats.customerCount} Khách hàng</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Nhân viên Lễ tân</span>
            <span className="kpi-icon"><ShieldCheck size={18} color="#9E7D3B" /></span>
          </div>
          <div className="kpi-value">{stats.receptionistCount}</div>
          <div className="kpi-hint">Tài khoản vận hành quầy lễ tân</div>
        </div>

        <div className="kpi-card highlight-card">
          <div className="kpi-header">
            <span className="kpi-title">Đang hoạt động</span>
            <span className="kpi-icon"><UserCheck size={18} color="#15803D" /></span>
          </div>
          <div className="kpi-value">{stats.activeUsers}</div>
          <div className="kpi-hint">Được phép đăng nhập hệ thống</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Đã bị khóa</span>
            <span className="kpi-icon"><UserX size={18} color="#881337" /></span>
          </div>
          <div className="kpi-value">{stats.lockedUsers}</div>
          <div className="kpi-hint">Tài khoản ngừng hoạt động / thu hồi quyền</div>
        </div>
      </div>

      {/* Thanh Công Cụ Bộ Lọc & Tìm Kiếm */}
      <div className="table-filter-toolbar">
        <form
          className="search-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
          />
          <button type="submit" className="btn-search-icon">
            Tìm kiếm
          </button>
        </form>

        <div className="dropdown-filter-group">
          <label>Vai trò:</label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="dropdown-filter-group">
          <label>Trạng thái:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>

        <button type="button" className="btn-reset-filter" onClick={handleResetFilters}>
          ↺ Đặt lại bộ lọc
        </button>
      </div>

      {/* Danh sách Tài khoản */}
      {loading ? (
        <LoadingSpinner message="Đang tải danh sách tài khoản..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="Không tìm thấy tài khoản phù hợp"
          description={
            hasActiveFilter
              ? 'Không có tài khoản nào khớp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'
              : 'Chưa có tài khoản nào trong hệ thống. Nhấn "Cấp Tài Khoản Lễ Tân" để bắt đầu.'
          }
          actionText={hasActiveFilter ? 'Đặt lại bộ lọc' : 'Cấp tài khoản mới'}
          onAction={hasActiveFilter ? handleResetFilters : handleOpenCreateModal}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th style={{ minWidth: '230px' }}>Người dùng & Email</th>
                <th style={{ width: '145px' }}>Số điện thoại</th>
                <th style={{ width: '145px' }}>Vai trò</th>
                <th style={{ width: '155px' }}>Trạng thái</th>
                <th style={{ width: '155px' }}>Ngày tạo</th>
                <th style={{ textAlign: 'right', minWidth: '210px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf =
                  currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <tr key={u.id}>
                    <td className="code-cell" data-label="ID">
                      <strong>#{u.id}</strong>
                    </td>

                    <td data-label="Người dùng & Email">
                      <div style={{ fontWeight: 700, color: '#0F1E36', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span>{u.fullName}</span>
                        {isSelf && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#92400E',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '9999px',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            Bạn
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Mail size={13} /> {u.email}
                      </div>
                    </td>

                    <td data-label="Số điện thoại">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#334155', fontSize: '0.88rem' }}>
                        <Phone size={13} color="#94A3B8" /> {u.phone}
                      </span>
                    </td>

                    <td data-label="Vai trò">
                      <UserRoleBadge role={u.role} />
                    </td>

                    <td data-label="Trạng thái">
                      <UserStatusBadge isActive={u.isActive} />
                    </td>

                    <td data-label="Ngày tạo">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#64748B' }}>
                        <Clock size={13} /> {formatDate(u.createdAt)}
                      </span>
                    </td>

                    <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => handleOpenEditModal(u)}
                          title="Chỉnh sửa thông tin & vai trò"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => handleOpenResetPassword(u)}
                          title="Đặt lại mật khẩu mới cho tài khoản này"
                        >
                          Đặt mật khẩu
                        </button>

                        {isSelf ? (
                          <span className="non-cancellable-note">Đang đăng nhập</span>
                        ) : u.isActive ? (
                          <button
                            type="button"
                            className="btn-action-outline-danger"
                            onClick={() => handleOpenStatusConfirm(u)}
                            title="Khóa tài khoản này"
                          >
                            Khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-success"
                            onClick={() => handleOpenStatusConfirm(u)}
                            title="Mở khóa tài khoản này"
                          >
                            ✓ Mở khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Phân Trang (sử dụng class .table-pagination-container có sẵn) */}
          <div className="table-pagination-container">
            <div className="pagination-info">
              Hiển thị{' '}
              <strong>
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalElements)}
              </strong>{' '}
              trên tổng số <strong>{totalElements}</strong> tài khoản
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Tiếp →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Cấp Tài Khoản Mới / Chỉnh Sửa Tài Khoản (dùng Modal + CustomInput có sẵn) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        title={
          editingUser
            ? `Chỉnh Sửa Tài Khoản: ${editingUser.fullName}`
            : 'Cấp Tài Khoản Nhân Viên / Lễ Tân Mới'
        }
        maxWidth="520px"
      >
        <form onSubmit={handleSubmitForm} className="crud-form" noValidate>
          <CustomInput
            id="userFullName"
            name="fullName"
            label="Họ và tên"
            placeholder="VD: Nguyễn Thị Lễ Tân Ca Sáng"
            value={fullName}
            required
            error={formTouched.fullName ? formErrors.fullName : ''}
            onChange={(e) => handleFormFieldChange('fullName', e.target.value, setFullName)}
            onBlur={(e) => handleFormFieldBlur('fullName', e.target.value)}
          />

          <CustomInput
            id="userEmail"
            name="email"
            type="email"
            label="Email đăng nhập"
            placeholder="VD: letan.casang@grandaurora.com"
            value={email}
            required
            disabled={Boolean(editingUser)}
            error={formTouched.email ? formErrors.email : ''}
            onChange={(e) => handleFormFieldChange('email', e.target.value, setEmail)}
            onBlur={(e) => handleFormFieldBlur('email', e.target.value)}
          />

          <CustomInput
            id="userPhone"
            name="phone"
            label="Số điện thoại"
            placeholder="VD: 0912345678"
            value={phone}
            required
            error={formTouched.phone ? formErrors.phone : ''}
            onChange={(e) => handleFormFieldChange('phone', e.target.value, setPhone)}
            onBlur={(e) => handleFormFieldBlur('phone', e.target.value)}
          />

          <CustomInput
            as="select"
            id="userRole"
            name="role"
            label="Vai trò phân quyền (Role)"
            value={role}
            required
            error={formTouched.role ? formErrors.role : ''}
            onChange={(e) => handleFormFieldChange('role', e.target.value, setRole)}
            onBlur={(e) => handleFormFieldBlur('role', e.target.value)}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </CustomInput>

          {!editingUser && (
            <CustomInput
              id="userPassword"
              name="password"
              type="password"
              label="Mật khẩu khởi tạo (Tối thiểu 6 ký tự)"
              placeholder="VD: LeTan@2026"
              value={password}
              required
              autoComplete="new-password"
              error={formTouched.password ? formErrors.password : ''}
              onChange={(e) => handleFormFieldChange('password', e.target.value, setPassword)}
              onBlur={(e) => handleFormFieldBlur('password', e.target.value)}
            />
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? editingUser
                  ? 'Đang lưu...'
                  : 'Đang cấp tài khoản...'
                : editingUser
                ? 'Lưu thay đổi'
                : 'Cấp tài khoản'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Đặt Lại Mật Khẩu (dùng Modal + CustomInput có sẵn) */}
      <Modal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => !resetting && setResetTargetUser(null)}
        title={`Đặt Lại Mật Khẩu: ${resetTargetUser?.fullName || ''}`}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmitResetPassword} className="crud-form" noValidate>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#475569' }}>
            Cấp mật khẩu mới cho tài khoản <strong>{resetTargetUser?.email}</strong>. Mật khẩu cũ sẽ ngay lập tức không còn hiệu lực.
          </p>

          <CustomInput
            id="resetNewPassword"
            name="newPassword"
            type="password"
            label="Mật khẩu mới (Tối thiểu 6 ký tự)"
            placeholder="Nhập mật khẩu mới..."
            value={newPassword}
            required
            autoComplete="new-password"
            error={resetTouched ? resetError : ''}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (resetTouched) {
                setResetError(
                  !e.target.value
                    ? 'Mật khẩu mới không được để trống'
                    : e.target.value.length < 6
                    ? 'Mật khẩu mới tối thiểu 6 ký tự'
                    : ''
                );
              }
            }}
            onBlur={() => {
              setResetTouched(true);
              setResetError(
                !newPassword
                  ? 'Mật khẩu mới không được để trống'
                  : newPassword.length < 6
                  ? 'Mật khẩu mới tối thiểu 6 ký tự'
                  : ''
              );
            }}
          />

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setResetTargetUser(null)}
              disabled={resetting}
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={resetting}>
              {resetting ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog Khóa / Mở khóa Tài khoản (dùng ConfirmDialog có sẵn) */}
      <ConfirmDialog
        isOpen={Boolean(statusTargetUser)}
        title={
          statusTargetUser?.isActive
            ? 'Xác nhận khóa tài khoản'
            : 'Xác nhận mở khóa tài khoản'
        }
        message={
          statusTargetUser?.isActive
            ? `Bạn có chắc chắn muốn khóa tài khoản "${statusTargetUser?.fullName}" (${statusTargetUser?.email})? Người dùng sẽ lập tức bị vô hiệu hóa phiên đăng nhập và không thể truy cập hệ thống.`
            : `Bạn có chắc chắn muốn kích hoạt lại tài khoản "${statusTargetUser?.fullName}" (${statusTargetUser?.email}) để tiếp tục sử dụng hệ thống?`
        }
        confirmText={statusTargetUser?.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        cancelText="Hủy bỏ"
        variant={statusTargetUser?.isActive ? 'danger' : 'primary'}
        loading={statusLoading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusTargetUser(null)}
      />
    </div>
  );
}

export default AdminUsersPage;
