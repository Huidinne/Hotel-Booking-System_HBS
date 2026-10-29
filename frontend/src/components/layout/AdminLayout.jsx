import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  CreditCard,
  Layers,
  DoorClosed,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

export function AdminLayout() {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    apiClient.checkHealth()
      .then((status) => setBackendStatus(status))
      .catch(() => setBackendStatus({ online: false }));
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Compute breadcrumb title
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('/admin/dashboard')) return 'Tổng quan báo cáo & KPI';
    if (path.includes('/receptionist/bookings')) return 'Vận hành đơn & Lưu trú';
    if (path.includes('/receptionist/rooms')) return 'Sơ đồ buồng phòng & Dọn dẹp';
    if (path.includes('/receptionist/refunds')) return 'Đối soát & Hoàn tiền cọc';
    if (path.includes('/receptionist/timeline')) return 'Room Timeline · PMS Calendar';
    if (path.includes('/admin/room-types')) return 'Quản lý danh mục loại phòng';
    if (path.includes('/admin/rooms')) return 'Quản lý phòng vật lý';
    return 'Cổng quản trị khách sạn';
  };

  const navGroups = [
    {
      title: 'TỔNG QUAN',
      items: [
        {
          label: 'Dashboard Thống Kê',
          path: '/admin/dashboard',
          icon: <LayoutDashboard size={19} />,
          adminOnly: true,
        },
      ],
    },
    {
      title: 'QUẢN LÝ VẬN HÀNH',
      items: [
        {
          label: 'Vận hành Đơn (Bookings)',
          path: '/receptionist/bookings',
          icon: <CalendarCheck size={19} />,
        },
        {
          label: 'Sơ đồ Buồng phòng',
          path: '/receptionist/rooms',
          icon: <BedDouble size={19} />,
        },
        {
          label: 'Duyệt Hoàn cọc (Refund)',
          path: '/receptionist/refunds',
          icon: <CreditCard size={19} />,
        },
        {
          label: 'Room Timeline (PMS)',
          path: '/receptionist/timeline',
          icon: <LayoutGrid size={19} />,
        },
      ],
    },
    {
      title: 'QUẢN LÝ DANH MỤC',
      items: [
        {
          label: 'QL Loại phòng',
          path: '/admin/room-types',
          icon: <Layers size={19} />,
          adminOnly: true,
        },
        {
          label: 'QL Phòng vật lý',
          path: '/admin/rooms',
          icon: <DoorClosed size={19} />,
          adminOnly: true,
        },
      ],
    },
  ];

  const handleRefreshData = () => {
    window.location.reload();
  };

  return (
    <div className={`admin-portal-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header / Brand */}
        <div className="sidebar-brand-header">
          <Link to="/" className="sidebar-brand-link">
            <div className="sidebar-crest">
              <span className="crest-icon">⚜️</span>
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-title">Grand Aurora</span>
                <span className="brand-subtitle">HOTEL MANAGEMENT</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="sidebar-collapse-btn hidden-mobile"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button
            type="button"
            className="sidebar-close-mobile visible-mobile"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Back to Client Site link */}
        <div className="sidebar-client-link-wrap">
          <Link to="/" className="sidebar-client-link" title="Quay về Website Đặt phòng">
            <ArrowLeft size={16} />
            {!sidebarCollapsed && <span>Website Khách Hàng</span>}
          </Link>
        </div>

        {/* Navigation Categories */}
        <nav className="sidebar-nav">
          {navGroups.map((group, gIdx) => {
            // Filter admin only items if user is not admin
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="nav-group-section">
                {!sidebarCollapsed && (
                  <div className="nav-group-heading">{group.title}</div>
                )}
                <ul className="nav-group-list">
                  {visibleItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={idx} className="nav-item">
                        <Link
                          to={item.path}
                          className={`nav-link ${isActive ? 'active' : ''}`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          {!sidebarCollapsed && (
                            <span className="nav-label">{item.label}</span>
                          )}
                          {isActive && !sidebarCollapsed && (
                            <span className="nav-active-pill" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* System Section */}
          <div className="nav-group-section">
            {!sidebarCollapsed && <div className="nav-group-heading">HỆ THỐNG</div>}
            <ul className="nav-group-list">
              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link system-config-btn"
                  onClick={() => setShowConfigModal(true)}
                  title={sidebarCollapsed ? 'Cấu hình & Nhật ký' : undefined}
                >
                  <span className="nav-icon"><Settings size={19} /></span>
                  {!sidebarCollapsed && <span className="nav-label">Cấu hình & Nhật ký</span>}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Profile Card at Sidebar Footer */}
        <div className="sidebar-footer-profile">
          <div className="profile-pill-card">
            <div className="profile-avatar">
              {currentUser?.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="profile-details">
                <div className="profile-name">{currentUser?.fullName || 'Nhân viên'}</div>
                <div className="profile-role">
                  {isAdmin ? 'Quản trị viên (Admin)' : 'Lễ tân (Receptionist)'}
                </div>
              </div>
            )}
            <button
              type="button"
              className="btn-sidebar-logout"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Đăng xuất khỏi phiên làm việc"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="admin-main-area">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-menu-toggle visible-mobile"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="topbar-breadcrumbs">
              <span className="crumb-root">Grand Aurora</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Backend status indicator */}
            {backendStatus !== null && (
              <div
                className={`topbar-status-badge ${backendStatus.online ? 'live' : 'offline'}`}
                title={backendStatus.online ? 'Kết nối trực tiếp Spring Boot 3 (Port 8080)' : 'Chưa kết nối Backend (Port 8080)'}
              >
                <span className="status-dot" />
                <span>{backendStatus.online ? 'Live Backend (8080)' : 'Chưa kết nối Backend'}</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              className="btn-topbar-action"
              onClick={handleRefreshData}
              title="Tải lại số liệu mới nhất"
            >
              <RefreshCw size={15} />
              <span className="hidden-mobile">Làm mới số liệu</span>
            </button>

            {/* Role switch indicator */}
            <div className="topbar-user-badge">
              <ShieldCheck size={16} className="text-gold" />
              <span className="role-text">{currentUser?.fullName || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>

      {/* System Config & Log Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content modal-saas-clean" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={20} className="text-gold" />
                <h3 style={{ margin: 0, color: '#0F1E36', fontWeight: 700 }}>Cấu hình & Nhật ký Hệ thống</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.6 }}>
              <div style={{ marginBottom: '1rem', padding: '0.9rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#0F1E36', marginBottom: '0.3rem' }}>
                  Thông tin Kiến trúc & Máy chủ
                </div>
                <div>• Kiến trúc: Modular Monolith (Spring Boot 3 + ReactJS / Vite)</div>
                <div>• Cổng Backend API: <code>http://localhost:8080/api/v1</code></div>
                <div>• Trạng thái kết nối: <strong style={{ color: backendStatus?.online ? '#6B5120' : '#881337' }}>{backendStatus?.online ? 'Hoạt động bình thường (Live API)' : 'Chưa kết nối Backend (Port 8080)'}</strong></div>
              </div>

              <div style={{ marginBottom: '1rem', padding: '0.9rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#0F1E36', marginBottom: '0.3rem' }}>
                  Tham số Nghiệp vụ Cốt lõi
                </div>
                <div>• Đặt cọc chuẩn: 50% tổng giá trị kỳ lưu trú</div>
                <div>• Thời hạn giữ chỗ VNPay: 15 phút (Pessimistic Lock)</div>
                <div>• Mốc tính phạt hủy cọc: 14:00 ngày nhận phòng (SRS §2.6)</div>
                <div>• Bảo mật thông tin: Mã hóa che STK ngân hàng theo chuẩn NFR-06</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowConfigModal(false)}
                  style={{ padding: '0.5rem 1.4rem', fontSize: '0.9rem', borderRadius: '9999px' }}
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
